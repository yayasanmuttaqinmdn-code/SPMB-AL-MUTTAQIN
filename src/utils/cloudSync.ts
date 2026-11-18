import type {
  DashboardStats,
  FormSchemaConfig,
  RegistrationInput,
  RegistrationRecord,
  SheetsPublicConfig,
  UnitId,
} from '../types/spmb.ts';
import {
  computeStatsFromUnitCounts,
  createEmptySheetsConfig,
  createPrimarySheetsConfig,
  DEFAULT_FORM_CONFIG,
  extractSpreadsheetIdShared,
  findRegistrationsByName,
  generateRegistrationNumber,
  mergeRegistrationLists,
  normalizeFormSchemaConfig,
  normalizeRegistrationInput,
  normalizeRegistrationRecord,
  normalizeSheetsConfig,
  parseCloudShareParams,
  parsePulledSpreadsheetData,
  PRIMARY_SPREADSHEET_CONFIG,
  registrationToSheetRow,
  searchRegistrationsForStatus,
  SHEET_HEADERS,
  sheetRowToRegistration,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from './spmbLogic.ts';

const LOCAL_SHEETS_CONFIG_KEY = 'spmb_muttaqin_cloud_sheets_config_v1';
const LOCAL_ADMIN_TOKEN_KEY = 'spmb_muttaqin_cloud_admin_token_v1';

export const APPS_SCRIPT_SNIPPET = `var UNIT_DEFS = [
  { id: 'RA_TK', tab: 'RA_TK', shortName: 'RA / TK', fullName: 'RA / TK Muttaqin Josenan', prefix: 'TK', defaultQuota: 60 },
  { id: 'SDIT', tab: 'SDIT', shortName: 'SDIT', fullName: 'SDIT Muttaqin Josenan', prefix: 'SDIT', defaultQuota: 90 },
  { id: 'SMP', tab: 'SMP', shortName: 'SMP', fullName: 'SMP Muttaqin Josenan', prefix: 'SMP', defaultQuota: 120 },
  { id: 'SMA', tab: 'SMA', shortName: 'SMA', fullName: 'SMA Muttaqin Josenan', prefix: 'SMA', defaultQuota: 120 }
];
var DEFAULT_HEADERS = [
  'ID Sistem', 'No. Pendaftaran', 'Lembaga', 'Tanggal Daftar', 'Nama Lengkap',
  'Nama Panggilan', 'Agama', 'Tempat Lahir', 'Tanggal Lahir', 'Jenis Kelamin',
  'NISN', 'NIK', 'No KK', 'Anak Ke', 'Jumlah Saudara', 'Asal Sekolah', 'Prestasi',
  'Gol Darah', 'Tinggi (cm)', 'Berat (kg)', 'Alergi', 'Alamat Siswa',
  'Nama Ayah', 'No HP Ayah', 'Nama Ibu', 'No HP Ibu',
  'Info Pengajian (Daerah / Desa / Kelompok)', 'Status Verifikasi',
  'Rincian Khusus Lembaga', 'Data JSON Lengkap', 'Terakhir Diubah',
  'Status Seleksi', 'Nilai Seleksi', 'Catatan Seleksi'
];

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getTargetSpreadsheet(payload) {
  if (payload && payload.spreadsheetId) {
    return SpreadsheetApp.openById(payload.spreadsheetId);
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Skrip tidak terhubung ke Spreadsheet. Buat lewat Ekstensi > Apps Script atau isi Link Spreadsheet.');
}

function ensureSheetAndHeaders(ss, tabName, headers, insertFirst) {
  var sheet = ss.getSheetByName(tabName) || (insertFirst ? ss.insertSheet(tabName, 0) : ss.insertSheet(tabName));
  var hdrs = (headers && headers.length > 0) ? headers : DEFAULT_HEADERS;
  if (sheet.getLastRow() === 0) {
    var headerRange = sheet.getRange(1, 1, 1, hdrs.length);
    headerRange.setValues([hdrs]);
    sheet.setFrozenRows(1);
    headerRange.setFontWeight('bold');
  }
  return sheet;
}

function readFormConfigObj(ss) {
  var cfgSheet = ss.getSheetByName('Konfigurasi_Form');
  if (!cfgSheet || cfgSheet.getLastRow() < 1) return null;
  var raw = String(cfgSheet.getRange(1, 2).getValue() || '').trim();
  if (!raw || raw.charAt(0) !== '{') return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function saveFormConfigObj(ss, formConfig) {
  if (!formConfig) return;
  var cfgSheet = ss.getSheetByName('Konfigurasi_Form') || ss.insertSheet('Konfigurasi_Form');
  cfgSheet.getRange(1, 1, 1, 3).setValues([['FORM_CONFIG_JSON', JSON.stringify(formConfig), new Date().toISOString()]]);
}

function readUnitRows(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var lastCol = Math.max(sheet.getLastColumn(), DEFAULT_HEADERS.length);
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i];
    if (String(row[0] || '').trim() && String(row[4] || '').trim()) {
      out.push(row.map(function(v) { return v == null ? '' : String(v); }));
    }
  }
  return out;
}

function countTabStats(ss, tabName) {
  var rows = readUnitRows(ss, tabName);
  var mukimCount = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var unitInfo = String(r[28] || '') + ' ' + String(r[29] || '');
    if (unitInfo.indexOf('Santri Mukim (Asrama Pondok)') !== -1) {
      mukimCount++;
    }
  }
  return { count: rows.length, mukimCount: mukimCount, syncedCount: rows.length };
}

function updateSummaryTab(ss, summaryRows, summaryTabName, onlyUnitTab) {
  var name = summaryTabName || 'Ringkasan_Dashboard';
  var tab = ss.getSheetByName(name) || ss.insertSheet(name);
  var rowsToWrite = summaryRows;
  if (!Array.isArray(rowsToWrite) || rowsToWrite.length === 0) {
    var cfg = readFormConfigObj(ss) || {};
    var nowLabel = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'dd MMM yyyy HH:mm:ss');
    var totalCount = 0;
    var totalQuota = 0;
    var totalMukim = 0;
    var unitLines = [];
    for (var i = 0; i < UNIT_DEFS.length; i++) {
      var u = UNIT_DEFS[i];
      if (onlyUnitTab && u.tab !== onlyUnitTab) continue;
      var st = countTabStats(ss, u.tab);
      var quota = (cfg[u.id] && Number(cfg[u.id].quota) > 0) ? Number(cfg[u.id].quota) : u.defaultQuota;
      totalCount += st.count;
      totalQuota += quota;
      totalMukim += st.mukimCount;
      unitLines.push([u.shortName, u.fullName, String(st.count), String(quota), String(Math.max(0, quota - st.count)), String(st.mukimCount)]);
    }
    rowsToWrite = [
      [onlyUnitTab ? ('REKAP SPMB ' + onlyUnitTab) : 'DASHBOARD SPMB REAL-TIME', 'Yayasan Pondok Pesantren Muttaqin', 'Tahun Ajaran 2026/2027'],
      ['Terakhir Disinkronkan', nowLabel, 'Total Pendaftar: ' + totalCount],
      [],
      ['Kode Lembaga', 'Nama Lembaga', 'Pendaftar Sementara', 'Kuota', 'Sisa Kuota', 'Santri Mukim']
    ].concat(unitLines);
    if (!onlyUnitTab) {
      rowsToWrite.push(['TOTAL', 'Seluruh Lembaga Yayasan PP Muttaqin', String(totalCount), String(totalQuota), String(Math.max(0, totalQuota - totalCount)), String(totalMukim)]);
    }
  }
  tab.clearContents();
  var maxCols = 6;
  var padded = rowsToWrite.map(function(r) {
    var copy = r.slice();
    while (copy.length < maxCols) copy.push('');
    return copy;
  });
  tab.getRange(1, 1, padded.length, maxCols).setValues(padded);
  tab.setFrozenRows(4);
}

function upsertRowToSheet(ss, tabName, headers, rowData, recordId, insertFirst) {
  var sheet = ensureSheetAndHeaders(ss, tabName, headers, insertFirst);
  var lastRow = sheet.getLastRow();
  var rowIndex = -1;
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(recordId)) {
        rowIndex = i + 2;
        break;
      }
    }
  }
  var targetRow = rowIndex > 0 ? rowIndex : lastRow + 1;
  var range = sheet.getRange(targetRow, 1, 1, rowData.length);
  range.setNumberFormat('@');
  range.setValues([rowData.map(function(v) { return v == null ? '' : String(v); })]);
}

function generateNextRegNumber(ss, tabName, prefix) {
  var sheet = ensureSheetAndHeaders(ss, tabName, DEFAULT_HEADERS, false);
  var lastRow = sheet.getLastRow();
  var maxSeq = 0;
  var regex = new RegExp('^SPMB-2026-' + prefix + '-(\\\\d+)$');
  if (lastRow > 1) {
    var codes = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (var i = 0; i < codes.length; i++) {
      var m = regex.exec(String(codes[i][0] || '').trim());
      if (m) {
        var seq = parseInt(m[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }
  var nextStr = String(maxSeq + 1);
  while (nextStr.length < 4) nextStr = '0' + nextStr;
  return 'SPMB-2026-' + prefix + '-' + nextStr;
}

function handleReadAction(action, params) {
  if (!action || action === 'ping') {
    return { ok: true, message: 'SPMB PP Muttaqin Cloud Sync Aktif', timestamp: new Date().toISOString() };
  }
  var ss = getTargetSpreadsheet(params);
  var cfg = readFormConfigObj(ss);
  if (action === 'public_state') {
    var countsByUnit = {};
    for (var i = 0; i < UNIT_DEFS.length; i++) {
      var u = UNIT_DEFS[i];
      countsByUnit[u.id] = countTabStats(ss, u.tab);
    }
    return {
      ok: true,
      countsByUnit: countsByUnit,
      formConfig: cfg,
      spreadsheetId: ss.getId(),
      spreadsheetTitle: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      syncedAt: new Date().toISOString()
    };
  }
  if (action === 'lookup') {
    var rawQ = String(params.query || params.namaLengkap || '').trim().replace(/\\s+/g, ' ');
    var q = rawQ.toLowerCase();
    var qDigits = rawQ.replace(/\\D+/g, '');
    if (q.length < 3) return { ok: false, error: 'Masukkan minimal 3 huruf Nama Lengkap, Nomor Pendaftaran, atau NIK.' };
    var exact = [];
    var partial = [];
    for (var i = 0; i < UNIT_DEFS.length; i++) {
      var u = UNIT_DEFS[i];
      var rows = readUnitRows(ss, u.tab);
      for (var j = 0; j < rows.length; j++) {
        var regNoNorm = String(rows[j][1] || '').trim().toLowerCase();
        var nameNorm = String(rows[j][4] || '').trim().replace(/\\s+/g, ' ').toLowerCase();
        var nikDigits = String(rows[j][11] || '').replace(/\\D+/g, '');
        if (regNoNorm === q || (qDigits.length >= 8 && nikDigits === qDigits) || nameNorm === q) {
          exact.push({ unit: u.id, row: rows[j] });
        } else if (
          (q.indexOf('spmb') === 0 && regNoNorm.indexOf(q) !== -1) ||
          nameNorm.indexOf(q) !== -1
        ) {
          partial.push({ unit: u.id, row: rows[j] });
        }
      }
    }
    return { ok: true, matches: exact.length > 0 ? exact : partial };
  }
  if (action === 'pull') {
    var rowsByTab = {};
    for (var i = 0; i < UNIT_DEFS.length; i++) {
      var u = UNIT_DEFS[i];
      if (params.unitTab && params.unitTab !== u.tab) continue;
      rowsByTab[u.tab] = readUnitRows(ss, u.tab);
    }
    return {
      ok: true,
      rowsByTab: rowsByTab,
      formConfig: cfg,
      spreadsheetId: ss.getId(),
      spreadsheetTitle: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      syncedAt: new Date().toISOString()
    };
  }
  return { ok: false, error: 'Aksi tidak dikenali: ' + action };
}

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    return jsonOut(handleReadAction(params.action || 'ping', params));
  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || 'ping';
    if (action === 'ping' || action === 'public_state' || action === 'lookup' || action === 'pull') {
      return jsonOut(handleReadAction(action, payload));
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(12000);
    try {
      var ss = getTargetSpreadsheet(payload);
      if (action === 'save_form_config') {
        saveFormConfigObj(ss, payload.formConfig);
        updateSummaryTab(ss, null, payload.summaryTabName || 'Ringkasan_Dashboard', null);
        return jsonOut({ ok: true, syncedAt: new Date().toISOString() });
      }
      if (action === 'bulk_upsert') {
        if (payload.formConfig) saveFormConfigObj(ss, payload.formConfig);
        if (Array.isArray(payload.requiredTabs)) {
          for (var t = 0; t < payload.requiredTabs.length; t++) {
            ensureSheetAndHeaders(ss, payload.requiredTabs[t], payload.headers, false);
          }
        } else if (payload.unitTab) {
          ensureSheetAndHeaders(ss, payload.unitTab, payload.headers, true);
        }
        var insertAtFront = !Array.isArray(payload.requiredTabs);
        if (Array.isArray(payload.items)) {
          for (var k = 0; k < payload.items.length; k++) {
            var item = payload.items[k];
            upsertRowToSheet(ss, item.unitTab, payload.headers, item.row, item.id, insertAtFront);
          }
        }
        updateSummaryTab(ss, payload.summaryRows, payload.summaryTabName, Array.isArray(payload.requiredTabs) ? null : payload.unitTab);
        return jsonOut({
          ok: true,
          pushedCount: Array.isArray(payload.items) ? payload.items.length : 0,
          spreadsheetId: ss.getId(),
          spreadsheetTitle: ss.getName(),
          spreadsheetUrl: ss.getUrl(),
          syncedAt: new Date().toISOString()
        });
      }
      var rec = payload.record || {};
      var tabName = payload.unitTab || rec.unit;
      if (!tabName) return jsonOut({ ok: false, error: 'unitTab missing' });
      var onlyUnitTab = payload.summaryTabName === 'Ringkasan_Lembaga' ? tabName : null;
      if (action === 'create_registration') {
        var unitDef = UNIT_DEFS[0];
        for (var d = 0; d < UNIT_DEFS.length; d++) {
          if (UNIT_DEFS[d].tab === tabName || UNIT_DEFS[d].id === rec.unit) { unitDef = UNIT_DEFS[d]; break; }
        }
        var assignedNo = generateNextRegNumber(ss, tabName, unitDef.prefix);
        var rowCopy = (payload.row || []).slice();
        if (rowCopy.length > 1) rowCopy[1] = assignedNo;
        upsertRowToSheet(ss, tabName, payload.headers, rowCopy, rec.id, Boolean(onlyUnitTab));
        updateSummaryTab(ss, null, payload.summaryTabName, onlyUnitTab);
        return jsonOut({ ok: true, id: rec.id, noPendaftaran: assignedNo, row: rowCopy, syncedAt: new Date().toISOString() });
      }
      if (action === 'delete') {
        var delSheet = ss.getSheetByName(tabName);
        if (delSheet && delSheet.getLastRow() > 1) {
          var ids = delSheet.getRange(2, 1, delSheet.getLastRow() - 1, 1).getValues();
          for (var x = 0; x < ids.length; x++) {
            if (String(ids[x][0]) === String(rec.id)) {
              delSheet.deleteRow(x + 2);
              break;
            }
          }
        }
        updateSummaryTab(ss, payload.summaryRows, payload.summaryTabName, onlyUnitTab);
        return jsonOut({ ok: true, deleted: true, syncedAt: new Date().toISOString() });
      }
      if (Array.isArray(payload.row) && payload.row.length > 0) {
        upsertRowToSheet(ss, tabName, payload.headers, payload.row, rec.id, Boolean(onlyUnitTab));
        updateSummaryTab(ss, payload.summaryRows, payload.summaryTabName, onlyUnitTab);
      }
      return jsonOut({ ok: true, syncedAt: new Date().toISOString() });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  }
}`;

export function getEnvAppsScriptUrl(): string {
  return (import.meta.env.VITE_APPS_SCRIPT_URL || PRIMARY_SPREADSHEET_CONFIG.appsScriptUrl).trim();
}

export function getEnvSpreadsheetId(): string {
  return (
    extractSpreadsheetIdShared(import.meta.env.VITE_SPREADSHEET_ID || '') ||
    PRIMARY_SPREADSHEET_CONFIG.spreadsheetId
  );
}

export function getEnvAdminPassword(): string {
  return (import.meta.env.VITE_ADMIN_PASSWORD || 'muttaqin2026').trim() || 'muttaqin2026';
}

export function loadLocalCloudSheetsConfig(): SheetsPublicConfig {
  const envUrl = getEnvAppsScriptUrl();
  const envSheetId = getEnvSpreadsheetId();
  const primaryDefaults = createPrimarySheetsConfig();
  try {
    const raw = localStorage.getItem(LOCAL_SHEETS_CONFIG_KEY);
    if (raw) {
      const parsed = normalizeSheetsConfig(JSON.parse(raw) as Partial<SheetsPublicConfig>);
      const effectiveSheetId = parsed.spreadsheetId || envSheetId;
      return normalizeSheetsConfig({
        ...parsed,
        appsScriptUrl: parsed.appsScriptUrl || envUrl,
        spreadsheetId: effectiveSheetId,
        spreadsheetTitle:
          parsed.spreadsheetTitle ||
          (effectiveSheetId === PRIMARY_SPREADSHEET_CONFIG.spreadsheetId
            ? PRIMARY_SPREADSHEET_CONFIG.spreadsheetTitle
            : ''),
        spreadsheetUrl:
          parsed.spreadsheetUrl ||
          (effectiveSheetId === PRIMARY_SPREADSHEET_CONFIG.spreadsheetId
            ? PRIMARY_SPREADSHEET_CONFIG.spreadsheetUrl
            : ''),
      });
    }
  } catch {
    // Ignore storage errors
  }
  return normalizeSheetsConfig({
    ...primaryDefaults,
    appsScriptUrl: envUrl,
    spreadsheetId: envSheetId,
    spreadsheetTitle:
      envSheetId === PRIMARY_SPREADSHEET_CONFIG.spreadsheetId
        ? PRIMARY_SPREADSHEET_CONFIG.spreadsheetTitle
        : '',
  });
}

export function saveLocalCloudSheetsConfig(cfg: SheetsPublicConfig): SheetsPublicConfig {
  const normalized = normalizeSheetsConfig(cfg);
  try {
    localStorage.setItem(LOCAL_SHEETS_CONFIG_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage errors
  }
  return normalized;
}

export function getStoredCloudAdminToken(): string | null {
  try {
    return sessionStorage.getItem(LOCAL_ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredCloudAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(LOCAL_ADMIN_TOKEN_KEY, token);
    else sessionStorage.removeItem(LOCAL_ADMIN_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function bootstrapCloudConfigFromUrl(): SheetsPublicConfig | null {
  if (typeof window === 'undefined') return null;
  const parsed = parseCloudShareParams(window.location.search);
  if (!parsed) return null;

  const existing = loadLocalCloudSheetsConfig();
  const saved = saveLocalCloudSheetsConfig({
    ...existing,
    syncMode: 'unified',
    appsScriptUrl: parsed.appsScriptUrl,
    spreadsheetId: parsed.spreadsheetId || existing.spreadsheetId,
  });

  try {
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('cloud');
    cleanUrl.searchParams.delete('sheet');
    const cleanSearch = cleanUrl.searchParams.toString();
    const nextHref = `${cleanUrl.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${cleanUrl.hash}`;
    window.history.replaceState({}, document.title, nextHref);
  } catch {
    // Ignore history API restrictions
  }
  return saved;
}

let cachedRuntimeCloudConfigPromise: Promise<{
  appsScriptUrl: string;
  spreadsheetId: string;
} | null> | null = null;

export function fetchRuntimeCloudConfig(): Promise<{
  appsScriptUrl: string;
  spreadsheetId: string;
} | null> {
  if (!cachedRuntimeCloudConfigPromise) {
    cachedRuntimeCloudConfigPromise = (async () => {
      try {
        const res = await fetch('/api/cloud-config', { cache: 'no-store' });
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!res.ok || !ct.includes('application/json')) return null;
        const data = (await res.json()) as {
          configured?: boolean;
          appsScriptUrl?: string;
          spreadsheetId?: string;
        };
        const url = (data.appsScriptUrl || '').trim();
        if (!url) return null;
        return {
          appsScriptUrl: url,
          spreadsheetId: extractSpreadsheetIdShared(data.spreadsheetId || ''),
        };
      } catch {
        return null;
      }
    })();
  }
  return cachedRuntimeCloudConfigPromise;
}

export function resolveEffectiveAppsScriptTarget(
  cfg: SheetsPublicConfig,
  unit?: UnitId
): { webhookUrl: string; spreadsheetId: string } | null {
  const normalized = normalizeSheetsConfig(cfg);
  const fallbackUrl = normalized.appsScriptUrl || getEnvAppsScriptUrl();
  const fallbackSheetId = normalized.spreadsheetId || getEnvSpreadsheetId();

  if (normalized.syncMode === 'per_unit' && unit) {
    const target = normalized.unitTargets[unit];
    const unitUrl = (target.appsScriptUrl || '').trim();
    const unitSheetId = (target.spreadsheetId || '').trim();
    if (unitUrl) return { webhookUrl: unitUrl, spreadsheetId: unitSheetId };
    if (fallbackUrl && unitSheetId) return { webhookUrl: fallbackUrl, spreadsheetId: unitSheetId };
    return null;
  }

  if (!fallbackUrl) return null;
  return { webhookUrl: fallbackUrl, spreadsheetId: fallbackSheetId };
}

export interface AppsScriptResponse {
  ok?: boolean;
  error?: string;
  message?: string;
  countsByUnit?: Partial<
    Record<UnitId, { count?: number; mukimCount?: number; syncedCount?: number }>
  >;
  matches?: Array<{ unit?: UnitId; row?: string[] }>;
  rowsByTab?: Partial<Record<UnitId, string[][]>>;
  formConfig?: Partial<FormSchemaConfig> | string | null;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  syncedAt?: string;
  pushedCount?: number;
  id?: string;
  noPendaftaran?: string;
  row?: string[];
  deleted?: boolean;
}

export async function callAppsScriptPost(
  appsScriptUrl: string,
  payload: Record<string, unknown>
): Promise<AppsScriptResponse> {
  const cleanUrl = appsScriptUrl.trim();
  if (!cleanUrl) {
    throw new Error('URL Google Apps Script (/exec) belum dikonfigurasi.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    // Use text/plain to avoid CORS preflight (OPTIONS) against Google Apps Script Web Apps
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = (await res.text()).trim();
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html') || text.startsWith('<')) {
      throw new Error(
        'Web App Apps Script mengembalikan halaman HTML/login. Pastikan akses deployment diset ke "Siapa saja (Anyone)".'
      );
    }
    if (text.toLowerCase().startsWith('error:')) {
      throw new Error(text);
    }
    if (text.startsWith('{')) {
      const parsed = JSON.parse(text) as AppsScriptResponse;
      if (parsed.ok === false) {
        throw new Error(parsed.error || 'Permintaan Apps Script gagal.');
      }
      return parsed;
    }
    if (
      text === 'ok' ||
      text === 'deleted' ||
      text.includes('Webhook Aktif')
    ) {
      if (
        payload.action === 'pull' ||
        payload.action === 'public_state' ||
        payload.action === 'lookup' ||
        payload.action === 'create_registration'
      ) {
        throw new Error(
          'Skrip Google Apps Script Anda masih versi lama (1-arah). Silakan salin kode terbaru di halaman Google Sheets lalu perbarui Deployment (Kelola Deployment → Edit → Versi baru) agar sinkronisasi 2 arah lintas perangkat aktif.'
        );
      }
      return { ok: true, message: text };
    }
    throw new Error(text || `Respons Apps Script tidak valid (HTTP ${res.status}).`);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Waktu koneksi ke Google Apps Script habis (timeout).');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDirectPublicState(
  cfg: SheetsPublicConfig
): Promise<{
  stats: DashboardStats;
  formConfig: FormSchemaConfig;
  lastSyncedAt: string | null;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
}> {
  const target = resolveEffectiveAppsScriptTarget(cfg);
  if (!target) {
    return {
      stats: computeStatsFromUnitCounts({}, DEFAULT_FORM_CONFIG),
      formConfig: structuredClone(DEFAULT_FORM_CONFIG),
      lastSyncedAt: cfg.lastSyncedAt,
    };
  }

  if (cfg.syncMode === 'per_unit') {
    let combinedFormConfig = structuredClone(DEFAULT_FORM_CONFIG);
    const countsByUnit: Partial<
      Record<UnitId, { count?: number; mukimCount?: number; syncedCount?: number }>
    > = {};
    let latestSync = cfg.lastSyncedAt;

    for (const unit of UNIT_ORDER) {
      const unitTarget = resolveEffectiveAppsScriptTarget(cfg, unit);
      if (!unitTarget) continue;
      const resp = await callAppsScriptPost(unitTarget.webhookUrl, {
        action: 'public_state',
        spreadsheetId: unitTarget.spreadsheetId || undefined,
      });
      if (resp.countsByUnit?.[unit]) {
        countsByUnit[unit] = resp.countsByUnit[unit];
      }
      if (resp.formConfig && typeof resp.formConfig === 'object') {
        const parsedCfg = normalizeFormSchemaConfig(resp.formConfig);
        combinedFormConfig[unit] = parsedCfg[unit];
      }
      if (resp.syncedAt) latestSync = resp.syncedAt;
    }

    return {
      stats: computeStatsFromUnitCounts(countsByUnit, combinedFormConfig, latestSync || undefined),
      formConfig: combinedFormConfig,
      lastSyncedAt: latestSync,
    };
  }

  const resp = await callAppsScriptPost(target.webhookUrl, {
    action: 'public_state',
    spreadsheetId: target.spreadsheetId || undefined,
  });
  const formConfig =
    resp.formConfig && typeof resp.formConfig === 'object'
      ? normalizeFormSchemaConfig(resp.formConfig)
      : typeof resp.formConfig === 'string' && resp.formConfig.trim().startsWith('{')
        ? normalizeFormSchemaConfig(JSON.parse(resp.formConfig) as Partial<FormSchemaConfig>)
        : structuredClone(DEFAULT_FORM_CONFIG);
  const stats = computeStatsFromUnitCounts(resp.countsByUnit || {}, formConfig, resp.syncedAt);
  return {
    stats,
    formConfig,
    lastSyncedAt: resp.syncedAt || cfg.lastSyncedAt,
    spreadsheetId: resp.spreadsheetId,
    spreadsheetTitle: resp.spreadsheetTitle,
    spreadsheetUrl: resp.spreadsheetUrl,
  };
}

export async function lookupDirectInAppsScript(
  cfg: SheetsPublicConfig,
  queryOrName: string
): Promise<RegistrationRecord[]> {
  const cleanQuery = queryOrName.trim().replace(/\s+/g, ' ');
  if (cleanQuery.length < 3) return [];

  if (cfg.syncMode === 'per_unit') {
    const allFound: RegistrationRecord[] = [];
    for (const unit of UNIT_ORDER) {
      const unitTarget = resolveEffectiveAppsScriptTarget(cfg, unit);
      if (!unitTarget) continue;
      const resp = await callAppsScriptPost(unitTarget.webhookUrl, {
        action: 'lookup',
        spreadsheetId: unitTarget.spreadsheetId || undefined,
        query: cleanQuery,
        namaLengkap: cleanQuery,
      });
      for (const m of resp.matches || []) {
        if (m.row && m.unit) {
          const parsed = sheetRowToRegistration(m.row, m.unit);
          if (parsed) allFound.push(parsed);
        }
      }
    }
    return searchRegistrationsForStatus(allFound, cleanQuery);
  }

  const target = resolveEffectiveAppsScriptTarget(cfg);
  if (!target) return [];
  const resp = await callAppsScriptPost(target.webhookUrl, {
    action: 'lookup',
    spreadsheetId: target.spreadsheetId || undefined,
    query: cleanQuery,
    namaLengkap: cleanQuery,
  });

  const parsedList: RegistrationRecord[] = [];
  for (const m of resp.matches || []) {
    if (m.row && m.unit) {
      const parsed = sheetRowToRegistration(m.row, m.unit);
      if (parsed) parsedList.push(parsed);
    }
  }
  return searchRegistrationsForStatus(parsedList, cleanQuery);
}

export async function pullDirectFromAppsScript(
  cfg: SheetsPublicConfig,
  localRecords: RegistrationRecord[] = []
): Promise<{
  registrations: RegistrationRecord[];
  formConfig: FormSchemaConfig | null;
  sheetsConfig: SheetsPublicConfig;
  pulledCount: number;
  pushedCount: number;
}> {
  const nextConfig = normalizeSheetsConfig(cfg);

  if (nextConfig.syncMode === 'per_unit') {
    const allRemote: RegistrationRecord[] = [];
    let mergedFormConfig: FormSchemaConfig | null = null;

    for (const unit of UNIT_ORDER) {
      const unitTarget = resolveEffectiveAppsScriptTarget(nextConfig, unit);
      if (!unitTarget) continue;
      const resp = await callAppsScriptPost(unitTarget.webhookUrl, {
        action: 'pull',
        spreadsheetId: unitTarget.spreadsheetId || undefined,
        unitTab: UNIT_CONFIGS[unit].sheetTabName,
      });
      const parsed = parsePulledSpreadsheetData(resp.rowsByTab, resp.formConfig);
      allRemote.push(...parsed.registrations.filter((r) => r.unit === unit));
      if (parsed.formConfig) {
        if (!mergedFormConfig) mergedFormConfig = structuredClone(DEFAULT_FORM_CONFIG);
        mergedFormConfig[unit] = parsed.formConfig[unit];
      }
      if (resp.spreadsheetId) {
        nextConfig.unitTargets[unit] = {
          ...nextConfig.unitTargets[unit],
          spreadsheetId: resp.spreadsheetId,
          spreadsheetTitle:
            resp.spreadsheetTitle || nextConfig.unitTargets[unit].spreadsheetTitle,
          spreadsheetUrl:
            resp.spreadsheetUrl ||
            `https://docs.google.com/spreadsheets/d/${resp.spreadsheetId}`,
        };
      }
    }

    const { mergedRecords, pulledFromRemote, pushedToRemote } = mergeRegistrationLists(
      localRecords,
      allRemote,
      { dropMissingSynced: true }
    );
    nextConfig.lastSyncedAt = new Date().toISOString();
    return {
      registrations: mergedRecords,
      formConfig: mergedFormConfig,
      sheetsConfig: nextConfig,
      pulledCount: pulledFromRemote,
      pushedCount: pushedToRemote,
    };
  }

  const target = resolveEffectiveAppsScriptTarget(nextConfig);
  if (!target) {
    throw new Error('URL Apps Script Webhook belum diatur.');
  }

  const resp = await callAppsScriptPost(target.webhookUrl, {
    action: 'pull',
    spreadsheetId: target.spreadsheetId || undefined,
  });
  const parsed = parsePulledSpreadsheetData(resp.rowsByTab, resp.formConfig);
  const { mergedRecords, pulledFromRemote, pushedToRemote } = mergeRegistrationLists(
    localRecords,
    parsed.registrations,
    { dropMissingSynced: true }
  );

  if (resp.spreadsheetId) {
    nextConfig.spreadsheetId = resp.spreadsheetId;
    nextConfig.spreadsheetTitle =
      resp.spreadsheetTitle || nextConfig.spreadsheetTitle || 'Spreadsheet SPMB Terhubung';
    nextConfig.spreadsheetUrl =
      resp.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resp.spreadsheetId}`;
  }
  nextConfig.lastSyncedAt = resp.syncedAt || new Date().toISOString();

  return {
    registrations: mergedRecords,
    formConfig: parsed.formConfig,
    sheetsConfig: nextConfig,
    pulledCount: pulledFromRemote,
    pushedCount: pushedToRemote,
  };
}

export async function createRegistrationDirectInAppsScript(
  cfg: SheetsPublicConfig,
  rawInput: RegistrationInput,
  formConfig: FormSchemaConfig
): Promise<RegistrationRecord> {
  const input = normalizeRegistrationInput(rawInput);
  const target = resolveEffectiveAppsScriptTarget(cfg, input.unit);
  if (!target) {
    throw new Error(
      'Database Spreadsheet belum dihubungkan. Set VITE_APPS_SCRIPT_URL di Vercel atau simpan URL Webhook di Menu Admin.'
    );
  }

  const now = new Date().toISOString();
  const draftRecord: RegistrationRecord = normalizeRegistrationRecord({
    ...input,
    id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    noPendaftaran: generateRegistrationNumber(input.unit, [], 2026),
    createdAt: now,
    updatedAt: now,
    syncState: 'synced',
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
    nilaiSeleksi: '',
    catatanSeleksi: '',
  });

  const isPerUnit = cfg.syncMode === 'per_unit';
  const row = registrationToSheetRow(draftRecord, formConfig[input.unit]);
  const resp = await callAppsScriptPost(target.webhookUrl, {
    action: 'create_registration',
    spreadsheetId: target.spreadsheetId || undefined,
    unitTab: UNIT_CONFIGS[input.unit].sheetTabName,
    summaryTabName: isPerUnit ? 'Ringkasan_Lembaga' : 'Ringkasan_Dashboard',
    headers: SHEET_HEADERS,
    row,
    record: {
      ...draftRecord,
      pasFotoDataUrl:
        draftRecord.pasFotoDataUrl && draftRecord.pasFotoDataUrl.length <= 42000
          ? draftRecord.pasFotoDataUrl
          : '',
    },
  });

  return {
    ...draftRecord,
    noPendaftaran: resp.noPendaftaran || draftRecord.noPendaftaran,
    syncState: 'synced',
  };
}
