import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  FormSchemaConfig,
  ProfileGalleryConfig,
  RegistrationInput,
  RegistrationRecord,
  SheetsPublicConfig,
  SheetsSyncMode,
  UnitId,
  UnitSheetsTarget,
} from './src/types/spmb.ts';
import {
  ACADEMIC_YEAR,
  computeUnitStats,
  createPrimarySheetsConfig,
  DEFAULT_FORM_CONFIG,
  DEFAULT_PROFILE_GALLERY_CONFIG,
  extractSpreadsheetIdShared,
  findRegistrationsByName,
  generateRegistrationNumber,
  INSTITUTION_NAME,
  mergeRegistrationLists,
  normalizeFormSchemaConfig,
  normalizeProfileGalleryConfig,
  normalizeRegistrationInput,
  normalizeRegistrationRecord,
  normalizeSheetsConfig,
  parsePulledSpreadsheetData,
  PRIMARY_SPREADSHEET_CONFIG,
  registrationToSheetRow,
  resolveUnitWebhookDispatch,
  sanitizePublicSheetsConfig,
  searchRegistrationsForStatus,
  SHEET_HEADERS,
  sheetRowToRegistration,
  UNIT_CONFIGS,
  UNIT_ORDER,
  validateRegistrationInput,
} from './src/utils/spmbLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'spmb-db.json');

interface DatabaseState {
  registrations: RegistrationRecord[];
  sheetsConfig: SheetsPublicConfig;
  formConfig: FormSchemaConfig;
  profileGallery: ProfileGalleryConfig;
}

const DEFAULT_STATE: DatabaseState = {
  registrations: [],
  sheetsConfig: createPrimarySheetsConfig(),
  formConfig: structuredClone(DEFAULT_FORM_CONFIG),
  profileGallery: structuredClone(DEFAULT_PROFILE_GALLERY_CONFIG),
};

function applyEnvFallbackToSheetsConfig(cfg: SheetsPublicConfig): SheetsPublicConfig {
  const envUrl = (
    process.env.APPS_SCRIPT_URL ||
    process.env.VITE_APPS_SCRIPT_URL ||
    PRIMARY_SPREADSHEET_CONFIG.appsScriptUrl
  ).trim();
  const envSheetId =
    extractSpreadsheetIdServer(
      process.env.SPREADSHEET_ID || process.env.VITE_SPREADSHEET_ID || ''
    ) || PRIMARY_SPREADSHEET_CONFIG.spreadsheetId;

  const effectiveSheetId = cfg.spreadsheetId || envSheetId;
  return normalizeSheetsConfig({
    ...cfg,
    appsScriptUrl: cfg.appsScriptUrl || envUrl,
    spreadsheetId: effectiveSheetId,
    spreadsheetTitle:
      cfg.spreadsheetTitle ||
      (effectiveSheetId === PRIMARY_SPREADSHEET_CONFIG.spreadsheetId
        ? PRIMARY_SPREADSHEET_CONFIG.spreadsheetTitle
        : ''),
    spreadsheetUrl:
      cfg.spreadsheetUrl ||
      (effectiveSheetId === PRIMARY_SPREADSHEET_CONFIG.spreadsheetId
        ? PRIMARY_SPREADSHEET_CONFIG.spreadsheetUrl
        : ''),
  });
}

function readDb(): DatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = structuredClone(DEFAULT_STATE);
    initial.sheetsConfig = applyEnvFallbackToSheetsConfig(initial.sheetsConfig);
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      registrations: Array.isArray(parsed.registrations)
        ? parsed.registrations.map((r) => normalizeRegistrationRecord(r))
        : [],
      sheetsConfig: applyEnvFallbackToSheetsConfig(normalizeSheetsConfig(parsed.sheetsConfig)),
      formConfig: parsed.formConfig
        ? normalizeFormSchemaConfig(parsed.formConfig)
        : structuredClone(DEFAULT_FORM_CONFIG),
      profileGallery: parsed.profileGallery
        ? normalizeProfileGalleryConfig(parsed.profileGallery)
        : structuredClone(DEFAULT_PROFILE_GALLERY_CONFIG),
    };
  } catch {
    const fallback = structuredClone(DEFAULT_STATE);
    fallback.sheetsConfig = applyEnvFallbackToSheetsConfig(fallback.sheetsConfig);
    return fallback;
  }
}

function writeDb(state: DatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

// Ephemeral in-memory admin session tokens
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'muttaqin2026';
const validAdminTokens = new Set<string>();

function isAdminAuthorized(req: express.Request): boolean {
  const token = req.header('x-admin-token') || '';
  return Boolean(token && validAdminTokens.has(token));
}

// SSE client registry for real-time public dashboard & form schema updates
const sseClients = new Set<express.Response>();

function broadcastPublicUpdate(reason: string): void {
  const db = readDb();
  const payload = JSON.stringify({
    reason,
    stats: computeUnitStats(db.registrations, db.formConfig),
    formConfig: db.formConfig,
    profileGallery: db.profileGallery,
    sheetsConfig: sanitizePublicSheetsConfig(db.sheetsConfig),
    timestamp: new Date().toISOString(),
  });

  for (const res of sseClients) {
    res.write(`data: ${payload}\n\n`);
  }
}

function isValidHttpsUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateAppsScriptWebhookUrl(raw: string): string | null {
  const cleanUrl = raw.trim();
  if (!cleanUrl) return 'Masukkan URL Web App Google Apps Script terlebih dahulu.';
  if (cleanUrl.includes('docs.google.com/spreadsheets')) {
    return 'Yang Anda tempel adalah link Google Spreadsheet, bukan URL Webhook Apps Script. Untuk Cara 2, buka Spreadsheet → Ekstensi → Apps Script → Terapkan → Aplikasi Web, lalu tempel URL yang berawalan https://script.google.com/macros/s/.../exec.';
  }
  if (!isValidHttpsUrl(cleanUrl)) {
    return 'URL Webhook harus diawali https:// (contoh: https://script.google.com/macros/s/.../exec).';
  }
  if (cleanUrl.includes('script.google.com') && cleanUrl.endsWith('/dev')) {
    return 'Anda menempelkan URL /dev (khusus mode uji editor). Gunakan URL Deployment produksi yang berakhiran /exec.';
  }
  return null;
}

function extractSpreadsheetIdServer(input: string): string {
  const trimmed = input.trim();
  const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  return match ? match[1] : trimmed;
}

function buildAppsScriptSummaryRows(db: DatabaseState, onlyUnit?: UnitId): string[][] {
  const stats = computeUnitStats(db.registrations, db.formConfig);
  const formattedTime = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  if (onlyUnit) {
    const s = stats.byUnit[onlyUnit];
    const rows: string[][] = [
      [`REKAP SPMB ${UNIT_CONFIGS[onlyUnit].fullName.toUpperCase()}`, INSTITUTION_NAME, `Tahun Pelajaran ${ACADEMIC_YEAR}`],
      ['Terakhir Disinkronkan', formattedTime, `Total Pendaftar Lembaga: ${s.count}`],
      [],
      ['Kode Lembaga', 'Nama Lembaga', 'Pendaftar Sementara', 'Kuota', 'Sisa Kuota', 'Santri Mukim'],
      [
        UNIT_CONFIGS[onlyUnit].shortName,
        s.fullName,
        String(s.count),
        String(s.quota),
        String(s.remaining),
        String(s.mukimCount),
      ],
    ];
    if (s.quotaPutra !== undefined && s.quotaPutri !== undefined) {
      const maleCount = s.maleCount ?? 0;
      const femaleCount = s.femaleCount ?? 0;
      rows.push([]);
      rows.push(['RINCIAN KUOTA PUTRA & PUTRI', UNIT_CONFIGS[onlyUnit].shortName, 'Pendaftar', 'Kuota', 'Sisa Kuota', 'Keterangan']);
      rows.push([
        `${UNIT_CONFIGS[onlyUnit].shortName} Putra`,
        `${s.fullName} (Putra)`,
        String(maleCount),
        String(s.quotaPutra),
        String(s.remainingPutra ?? Math.max(0, s.quotaPutra - maleCount)),
        'Kuota Khusus Putra',
      ]);
      rows.push([
        `${UNIT_CONFIGS[onlyUnit].shortName} Putri`,
        `${s.fullName} (Putri)`,
        String(femaleCount),
        String(s.quotaPutri),
        String(s.remainingPutri ?? Math.max(0, s.quotaPutri - femaleCount)),
        'Kuota Khusus Putri',
      ]);
    }
    return rows;
  }

  const splitRows: string[][] = [];
  for (const unit of UNIT_ORDER) {
    const s = stats.byUnit[unit];
    if (s.quotaPutra !== undefined && s.quotaPutri !== undefined) {
      const maleCount = s.maleCount ?? 0;
      const femaleCount = s.femaleCount ?? 0;
      splitRows.push([
        `${UNIT_CONFIGS[unit].shortName} Putra`,
        `${s.fullName} (Putra)`,
        String(maleCount),
        String(s.quotaPutra),
        String(s.remainingPutra ?? Math.max(0, s.quotaPutra - maleCount)),
        'Kuota Khusus Putra',
      ]);
      splitRows.push([
        `${UNIT_CONFIGS[unit].shortName} Putri`,
        `${s.fullName} (Putri)`,
        String(femaleCount),
        String(s.quotaPutri),
        String(s.remainingPutri ?? Math.max(0, s.quotaPutri - femaleCount)),
        'Kuota Khusus Putri',
      ]);
    }
  }

  const rows: string[][] = [
    ['DASHBOARD SPMB REAL-TIME', INSTITUTION_NAME, `Tahun Pelajaran ${ACADEMIC_YEAR}`],
    ['Terakhir Disinkronkan', formattedTime, `Total Pendaftar: ${stats.totalCount}`],
    [],
    ['Kode Lembaga', 'Nama Lembaga', 'Pendaftar Sementara', 'Kuota', 'Sisa Kuota', 'Santri Mukim'],
    ...UNIT_ORDER.map((unit) => {
      const s = stats.byUnit[unit];
      return [
        UNIT_CONFIGS[unit].shortName,
        s.fullName,
        String(s.count),
        String(s.quota),
        String(s.remaining),
        String(s.mukimCount),
      ];
    }),
    [
      'TOTAL',
      `Seluruh Lembaga ${INSTITUTION_NAME}`,
      String(stats.totalCount),
      String(stats.totalQuota),
      String(Math.max(0, stats.totalQuota - stats.totalCount)),
      String(UNIT_ORDER.reduce((acc, u) => acc + stats.byUnit[u].mukimCount, 0)),
    ],
  ];

  if (splitRows.length > 0) {
    rows.push([]);
    rows.push(['RINCIAN KUOTA PUTRA & PUTRI', 'Khusus SMP & SMA', 'Pendaftar', 'Kuota', 'Sisa Kuota', 'Keterangan']);
    rows.push(...splitRows);
  }

  return rows;
}

interface AppsScriptJsonPayload {
  ok?: boolean;
  error?: string;
  message?: string;
  rowsByTab?: Partial<Record<UnitId, string[][]>>;
  matches?: Array<{ unit?: UnitId; row?: string[] }>;
  formConfig?: Partial<FormSchemaConfig> | string | null;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  syncedAt?: string;
  noPendaftaran?: string;
  pushedCount?: number;
}

async function sendToAppsScript(
  appsScriptUrl: string,
  payload: unknown
): Promise<{ ok: boolean; status: number; bodyText: string; json?: AppsScriptJsonPayload }> {
  const cleanUrl = appsScriptUrl.trim();
  const validationErr = validateAppsScriptWebhookUrl(cleanUrl);
  if (validationErr) {
    return {
      ok: false,
      status: 0,
      bodyText: validationErr,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    const bodyText = await response.text().catch(() => '');
    const trimmedBody = bodyText.trim();
    const looksLikeHtmlError =
      trimmedBody.startsWith('<!DOCTYPE') ||
      trimmedBody.startsWith('<html') ||
      trimmedBody.startsWith('<') ||
      bodyText.toLowerCase().includes('servicelogin');

    let parsedJson: AppsScriptJsonPayload | undefined;
    if (!looksLikeHtmlError && trimmedBody.startsWith('{')) {
      try {
        parsedJson = JSON.parse(trimmedBody) as AppsScriptJsonPayload;
      } catch {
        parsedJson = undefined;
      }
    }

    const jsonFailed = parsedJson && parsedJson.ok === false;
    const isOk =
      response.ok &&
      !looksLikeHtmlError &&
      !trimmedBody.toLowerCase().startsWith('error:') &&
      !jsonFailed;

    let readableMessage = parsedJson?.error || parsedJson?.message || trimmedBody.slice(0, 300);
    if (!isOk && looksLikeHtmlError) {
      readableMessage =
        'URL Webhook Apps Script mengembalikan halaman HTML/login Google (bukan respons "ok"). Pastikan skrip sudah di-deploy sebagai Aplikasi Web dengan "Yang memiliki akses: Siapa saja (Anyone)".';
    }
    return {
      ok: isOk,
      status: response.status,
      bodyText: readableMessage,
      json: parsedJson,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      bodyText:
        err instanceof Error && err.name === 'AbortError'
          ? 'Waktu koneksi ke Google Apps Script habis (timeout).'
          : 'Gagal menghubungi URL Google Apps Script.',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function forwardToAppsScript(
  _legacyAppsScriptUrl: string,
  action: 'upsert' | 'delete',
  record: RegistrationRecord,
  formConfig: FormSchemaConfig
): Promise<void> {
  const currentDb = readDb();
  const target = resolveUnitWebhookDispatch(currentDb.sheetsConfig, record.unit);
  if (!target || validateAppsScriptWebhookUrl(target.webhookUrl) !== null) return;

  const isPerUnit = currentDb.sheetsConfig.syncMode === 'per_unit';
  const sanitizedRecord: RegistrationRecord = {
    ...record,
    pasFotoDataUrl:
      record.pasFotoDataUrl && record.pasFotoDataUrl.length <= 42000
        ? record.pasFotoDataUrl
        : '',
  };
  const unitTab = UNIT_CONFIGS[record.unit].sheetTabName;
  const row = registrationToSheetRow({ ...record, syncState: 'synced' }, formConfig[record.unit]);
  const res = await sendToAppsScript(target.webhookUrl, {
    action,
    spreadsheetId: target.spreadsheetId || undefined,
    unitTab,
    summaryTabName: isPerUnit ? 'Ringkasan_Lembaga' : 'Ringkasan_Dashboard',
    headers: SHEET_HEADERS,
    summaryRows: buildAppsScriptSummaryRows(currentDb, isPerUnit ? record.unit : undefined),
    row,
    record: sanitizedRecord,
  });

  if (res.ok && action === 'upsert') {
    const latestDb = readDb();
    let changed = false;
    latestDb.registrations = latestDb.registrations.map((r) => {
      if (r.id === record.id && r.updatedAt === record.updatedAt && r.syncState !== 'synced') {
        changed = true;
        return { ...r, syncState: 'synced' };
      }
      return r;
    });
    if (changed) {
      latestDb.sheetsConfig.lastSyncedAt = new Date().toISOString();
      writeDb(latestDb);
      broadcastPublicUpdate('sheets_synced');
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Public SSE stream: pushes live aggregate counts + admin form requirements (NO private records)
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.add(res);
    const db = readDb();
    res.write(
      `data: ${JSON.stringify({
        reason: 'connected',
        stats: computeUnitStats(db.registrations, db.formConfig),
        formConfig: db.formConfig,
        profileGallery: db.profileGallery,
        sheetsConfig: sanitizePublicSheetsConfig(db.sheetsConfig),
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // Public runtime cloud sync configuration (matches api/cloud-config.ts on Vercel)
  app.get('/api/cloud-config', (_req, res) => {
    const appsScriptUrl = (
      process.env.VITE_APPS_SCRIPT_URL ||
      process.env.APPS_SCRIPT_URL ||
      PRIMARY_SPREADSHEET_CONFIG.appsScriptUrl
    ).trim();
    const spreadsheetId =
      extractSpreadsheetIdServer(
        process.env.VITE_SPREADSHEET_ID || process.env.SPREADSHEET_ID || ''
      ) || PRIMARY_SPREADSHEET_CONFIG.spreadsheetId;
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.json({
      ok: true,
      configured: Boolean(appsScriptUrl),
      appsScriptUrl,
      spreadsheetId,
    });
  });

  // Public read-only state (aggregate counts + form schema + profile slideshow gallery)
  app.get('/api/public/state', (_req, res) => {
    const db = readDb();
    res.json({
      stats: computeUnitStats(db.registrations, db.formConfig),
      formConfig: db.formConfig,
      profileGallery: db.profileGallery,
      sheetsConfig: sanitizePublicSheetsConfig(db.sheetsConfig),
    });
  });

  // Public applicant status & receipt lookup by full name, registration number, or NIK
  app.post('/api/lookup', async (req, res) => {
    const { query, namaLengkap } = (req.body || {}) as {
      query?: string;
      namaLengkap?: string;
    };
    const cleanQuery = (query ?? namaLengkap ?? '').trim().replace(/\s+/g, ' ');
    if (cleanQuery.length < 3) {
      res.status(400).json({
        error: 'Harap masukkan Nama Lengkap Anak, Nomor Pendaftaran, atau NIK (minimal 3 karakter).',
      });
      return;
    }

    const db = readDb();
    let matches = searchRegistrationsForStatus(db.registrations, cleanQuery);

    if (matches.length === 0) {
      const dispatch = resolveUnitWebhookDispatch(db.sheetsConfig, 'RA_TK');
      if (dispatch && validateAppsScriptWebhookUrl(dispatch.webhookUrl) === null) {
        const remoteResp = await sendToAppsScript(dispatch.webhookUrl, {
          action: 'lookup',
          spreadsheetId: dispatch.spreadsheetId || undefined,
          query: cleanQuery,
          namaLengkap: cleanQuery,
        });
        if (remoteResp.ok && Array.isArray(remoteResp.json?.matches)) {
          const parsedRemote: RegistrationRecord[] = [];
          for (const item of remoteResp.json.matches) {
            if (item.row && item.unit) {
              const parsed = sheetRowToRegistration(item.row, item.unit);
              if (parsed) parsedRemote.push(parsed);
            }
          }
          matches = searchRegistrationsForStatus(parsedRemote, cleanQuery);
        }
      }
    }

    if (matches.length === 0) {
      res.status(404).json({
        error:
          'Data pendaftar tidak ditemukan. Periksa kembali Nama Lengkap Anak, Nomor Pendaftaran, atau NIK.',
      });
      return;
    }
    res.json({ record: matches[0], records: matches });
  });

  // Public registration submission: parents can submit their child's registration & get own record back
  app.post('/api/registrations', async (req, res) => {
    const rawInput = req.body as RegistrationInput;
    const db = readDb();
    const input = normalizeRegistrationInput(rawInput);
    const unitFormCfg = db.formConfig[input.unit];
    const errors = validateRegistrationInput(input, unitFormCfg, { requirePhoto: true });
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Data pendaftaran belum lengkap atau tidak valid.', errors });
      return;
    }

    const now = new Date().toISOString();
    const noPendaftaran = generateRegistrationNumber(input.unit, db.registrations, 2027);

    const newRecord: RegistrationRecord = {
      ...input,
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      noPendaftaran,
      createdAt: now,
      updatedAt: now,
      syncState: 'pending',
      statusVerifikasi: 'Menunggu Verifikasi Berkas',
      statusSeleksi: 'Belum Diseleksi',
      nilaiSeleksi: '',
      catatanSeleksi: '',
    };

    db.registrations = [newRecord, ...db.registrations];
    writeDb(db);
    broadcastPublicUpdate('created');

    if (resolveUnitWebhookDispatch(db.sheetsConfig, newRecord.unit)) {
      void forwardToAppsScript('', 'upsert', newRecord, db.formConfig);
    }

    res.status(201).json({
      record: newRecord,
      stats: computeUnitStats(db.registrations, db.formConfig),
    });
  });

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body as { password?: string };
    if (!password || password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: 'Kata sandi admin tidak sesuai.' });
      return;
    }
    const token = crypto.randomBytes(24).toString('hex');
    validAdminTokens.add(token);
    res.json({ adminToken: token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = req.header('x-admin-token');
    if (token) validAdminTokens.delete(token);
    res.json({ ok: true });
  });

  // Admin full registrations read
  app.get('/api/admin/registrations', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Akses ditolak. Masuk sebagai Admin terlebih dahulu.' });
      return;
    }
    const db = readDb();
    res.json({
      registrations: db.registrations,
      stats: computeUnitStats(db.registrations, db.formConfig),
      sheetsConfig: db.sheetsConfig,
      formConfig: db.formConfig,
      profileGallery: db.profileGallery,
    });
  });

  // Admin update institution profile slideshow photos
  app.put('/api/admin/profile-gallery', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Akses ditolak. Hanya Admin yang dapat mengelola foto profil.' });
      return;
    }
    const { profileGallery } = (req.body || {}) as { profileGallery?: ProfileGalleryConfig };
    const normalized = normalizeProfileGalleryConfig(profileGallery);
    const db = readDb();
    db.profileGallery = normalized;
    writeDb(db);
    broadcastPublicUpdate('profile_gallery_updated');
    res.json({ profileGallery: db.profileGallery });
  });

  // Admin update form requirements / custom fields
  app.put('/api/admin/form-config', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Akses ditolak. Hanya Admin yang dapat mengubah keperluan data.' });
      return;
    }
    const { formConfig } = req.body as { formConfig?: FormSchemaConfig };
    if (!formConfig || !formConfig.RA_TK || !formConfig.SDIT || !formConfig.SMP || !formConfig.SMA) {
      res.status(400).json({ error: 'Format konfigurasi formulir tidak valid.' });
      return;
    }

    const db = readDb();
    db.formConfig = normalizeFormSchemaConfig(formConfig);
    writeDb(db);
    broadcastPublicUpdate('form_config_updated');

    const dispatch = resolveUnitWebhookDispatch(db.sheetsConfig, 'RA_TK');
    if (dispatch && validateAppsScriptWebhookUrl(dispatch.webhookUrl) === null) {
      void sendToAppsScript(dispatch.webhookUrl, {
        action: 'save_form_config',
        spreadsheetId: dispatch.spreadsheetId || undefined,
        summaryTabName: db.sheetsConfig.syncMode === 'per_unit' ? 'Ringkasan_Lembaga' : 'Ringkasan_Dashboard',
        formConfig: db.formConfig,
      });
    }

    res.json({
      formConfig: db.formConfig,
      stats: computeUnitStats(db.registrations, db.formConfig),
    });
  });

  // Admin-only edit registration
  app.put('/api/registrations/:id', async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Hanya Admin yang dapat mengubah data pendaftar.' });
      return;
    }
    const { id } = req.params;
    const updates = req.body as Partial<RegistrationRecord>;
    const db = readDb();
    const idx = db.registrations.findIndex((r) => r.id === id);

    if (idx === -1) {
      res.status(404).json({ error: 'Data pendaftar tidak ditemukan.' });
      return;
    }

    const existing = db.registrations[idx];
    const isSelectionChange =
      updates.statusSeleksi !== undefined ||
      updates.nilaiSeleksi !== undefined ||
      updates.catatanSeleksi !== undefined;
    const merged: RegistrationRecord = normalizeRegistrationRecord({
      ...existing,
      ...updates,
      id: existing.id,
      noPendaftaran: existing.noPendaftaran,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      diseleksiAt: isSelectionChange ? new Date().toISOString() : existing.diseleksiAt,
      syncState: updates.syncState || 'pending',
    });

    const errors = validateRegistrationInput(merged, db.formConfig[merged.unit], {
      requirePhoto: Boolean(existing.pasFotoDataUrl),
    });
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Perubahan data tidak valid.', errors });
      return;
    }

    db.registrations[idx] = merged;
    writeDb(db);
    broadcastPublicUpdate('updated');

    if (resolveUnitWebhookDispatch(db.sheetsConfig, merged.unit)) {
      void forwardToAppsScript('', 'upsert', merged, db.formConfig);
    }

    res.json({
      record: merged,
      stats: computeUnitStats(db.registrations, db.formConfig),
    });
  });

  // Admin-only delete registration
  app.delete('/api/registrations/:id', async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Hanya Admin yang dapat menghapus data pendaftar.' });
      return;
    }
    const { id } = req.params;
    const db = readDb();
    const target = db.registrations.find((r) => r.id === id);
    if (!target) {
      res.status(404).json({ error: 'Data pendaftar tidak ditemukan.' });
      return;
    }

    db.registrations = db.registrations.filter((r) => r.id !== id);
    writeDb(db);
    broadcastUpdateSafe();

    function broadcastUpdateSafe() {
      broadcastPublicUpdate('deleted');
    }

    if (resolveUnitWebhookDispatch(db.sheetsConfig, target.unit)) {
      void forwardToAppsScript('', 'delete', target, db.formConfig);
    }

    res.json({
      deletedId: id,
      stats: computeUnitStats(db.registrations, db.formConfig),
    });
  });

  // Admin-only Google Sheets merge
  app.post('/api/sync/merge', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Hanya Admin yang dapat menyinkronkan Google Sheets.' });
      return;
    }
    const {
      registrations,
      syncMode,
      spreadsheetId,
      spreadsheetTitle,
      spreadsheetUrl,
      unitTargets,
      syncedAt,
    } = req.body as {
      registrations: RegistrationRecord[];
      syncMode?: SheetsSyncMode;
      spreadsheetId?: string;
      spreadsheetTitle?: string;
      spreadsheetUrl?: string;
      unitTargets?: Partial<Record<UnitId, Partial<UnitSheetsTarget>>>;
      syncedAt?: string;
    };

    if (!Array.isArray(registrations)) {
      res.status(400).json({ error: 'Format payload sinkronisasi tidak valid.' });
      return;
    }

    const db = readDb();
    const existingPhotos = new Map(
      db.registrations
        .filter((r) => Boolean(r.pasFotoDataUrl))
        .map((r) => [r.id, r.pasFotoDataUrl])
    );
    db.registrations = registrations.map((r) =>
      normalizeRegistrationRecord({
        ...r,
        pasFotoDataUrl: r.pasFotoDataUrl || existingPhotos.get(r.id) || '',
      })
    );
    if (syncMode) db.sheetsConfig.syncMode = syncMode;
    if (spreadsheetId !== undefined) db.sheetsConfig.spreadsheetId = spreadsheetId;
    if (spreadsheetTitle !== undefined) db.sheetsConfig.spreadsheetTitle = spreadsheetTitle;
    if (spreadsheetUrl !== undefined) db.sheetsConfig.spreadsheetUrl = spreadsheetUrl;
    if (unitTargets) {
      db.sheetsConfig = normalizeSheetsConfig({
        ...db.sheetsConfig,
        unitTargets: {
          ...db.sheetsConfig.unitTargets,
          ...unitTargets,
        } as Record<UnitId, UnitSheetsTarget>,
      });
    }
    db.sheetsConfig.lastSyncedAt = syncedAt || new Date().toISOString();

    writeDb(db);
    broadcastPublicUpdate('sheets_synced');

    res.json({
      registrations: db.registrations,
      stats: computeUnitStats(db.registrations, db.formConfig),
      sheetsConfig: db.sheetsConfig,
    });
  });

  // Admin-only Sheets config update
  app.put('/api/config/sheets', (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Hanya Admin yang dapat mengubah konfigurasi Google Sheets.' });
      return;
    }
    const updates = req.body as Partial<SheetsPublicConfig>;
    if (updates.appsScriptUrl !== undefined) {
      const cleanWebhook = updates.appsScriptUrl.trim();
      if (cleanWebhook) {
        const validationErr = validateAppsScriptWebhookUrl(cleanWebhook);
        if (validationErr) {
          res.status(400).json({ error: validationErr });
          return;
        }
      }
      updates.appsScriptUrl = cleanWebhook;
    }
    if (updates.unitTargets) {
      for (const unit of UNIT_ORDER) {
        const unitWebhook = updates.unitTargets[unit]?.appsScriptUrl?.trim();
        if (unitWebhook) {
          const validationErr = validateAppsScriptWebhookUrl(unitWebhook);
          if (validationErr) {
            res.status(400).json({
              error: `Webhook ${UNIT_CONFIGS[unit].shortName}: ${validationErr}`,
            });
            return;
          }
        }
      }
    }

    const db = readDb();
    db.sheetsConfig = normalizeSheetsConfig({
      ...db.sheetsConfig,
      ...updates,
      unitTargets: updates.unitTargets
        ? {
            RA_TK: { ...db.sheetsConfig.unitTargets.RA_TK, ...updates.unitTargets.RA_TK },
            SDIT: { ...db.sheetsConfig.unitTargets.SDIT, ...updates.unitTargets.SDIT },
            SMP: { ...db.sheetsConfig.unitTargets.SMP, ...updates.unitTargets.SMP },
            SMA: { ...db.sheetsConfig.unitTargets.SMA, ...updates.unitTargets.SMA },
          }
        : db.sheetsConfig.unitTargets,
    });
    writeDb(db);
    broadcastPublicUpdate('config_updated');
    res.json({ sheetsConfig: db.sheetsConfig });
  });

  // Admin-only Apps Script Webhook connection test
  app.post('/api/sync/apps-script-test', async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Hanya Admin yang dapat menguji koneksi Webhook.' });
      return;
    }
    const { url, spreadsheetUrlOrId, unit } = req.body as {
      url?: string;
      spreadsheetUrlOrId?: string;
      unit?: UnitId;
    };
    const db = readDb();
    const targetUrl = (
      url !== undefined
        ? url
        : unit
          ? db.sheetsConfig.unitTargets[unit]?.appsScriptUrl || db.sheetsConfig.appsScriptUrl
          : db.sheetsConfig.appsScriptUrl
    ).trim();

    const validationErr = validateAppsScriptWebhookUrl(targetUrl);
    if (validationErr) {
      res.status(400).json({
        error: unit ? `Webhook ${UNIT_CONFIGS[unit].shortName}: ${validationErr}` : validationErr,
      });
      return;
    }

    const fallbackSheetId = spreadsheetUrlOrId
      ? extractSpreadsheetIdServer(spreadsheetUrlOrId)
      : (unit ? db.sheetsConfig.unitTargets[unit]?.spreadsheetId : db.sheetsConfig.spreadsheetId) ||
        undefined;

    const result = await sendToAppsScript(targetUrl, {
      action: 'ping',
      spreadsheetId: fallbackSheetId,
    });
    if (!result.ok) {
      res.status(502).json({
        error:
          result.bodyText ||
          `Webhook gagal merespons (HTTP ${result.status}). Pastikan Web App Apps Script sudah di-deploy dengan akses "Siapa saja (Anyone)".`,
      });
      return;
    }

    res.json({
      ok: true,
      message: unit
        ? `Koneksi Webhook ${UNIT_CONFIGS[unit].shortName} berhasil dan siap menerima data!`
        : 'Koneksi Webhook Apps Script berhasil! Klik "Simpan & Kirim Semua Data" untuk menyinkronkan ke Spreadsheet.',
    });
  });

  // Admin-only Apps Script Webhook 1-click connect + save + bulk push all local registrations
  app.post('/api/sync/apps-script-push', async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Hanya Admin yang dapat mengirim data ke Webhook.' });
      return;
    }
    const { syncMode, url, spreadsheetUrlOrId, unitTargets } = req.body as {
      syncMode?: SheetsSyncMode;
      url?: string;
      spreadsheetUrlOrId?: string;
      unitTargets?: Partial<Record<UnitId, Partial<UnitSheetsTarget>>>;
    };

    const db = readDb();
    const effectiveConfig = normalizeSheetsConfig({
      ...db.sheetsConfig,
      syncMode: syncMode || db.sheetsConfig.syncMode,
      appsScriptUrl: url !== undefined ? url : db.sheetsConfig.appsScriptUrl,
      unitTargets: unitTargets
        ? {
            RA_TK: { ...db.sheetsConfig.unitTargets.RA_TK, ...unitTargets.RA_TK },
            SDIT: { ...db.sheetsConfig.unitTargets.SDIT, ...unitTargets.SDIT },
            SMP: { ...db.sheetsConfig.unitTargets.SMP, ...unitTargets.SMP },
            SMA: { ...db.sheetsConfig.unitTargets.SMA, ...unitTargets.SMA },
          }
        : db.sheetsConfig.unitTargets,
    });

    if (effectiveConfig.syncMode === 'per_unit') {
      // Validate any filled webhook URLs first
      if (effectiveConfig.appsScriptUrl) {
        const sharedErr = validateAppsScriptWebhookUrl(effectiveConfig.appsScriptUrl);
        if (sharedErr) {
          res.status(400).json({ error: `Webhook Utama: ${sharedErr}` });
          return;
        }
      }
      for (const u of UNIT_ORDER) {
        const uHook = effectiveConfig.unitTargets[u].appsScriptUrl;
        if (uHook) {
          const uErr = validateAppsScriptWebhookUrl(uHook);
          if (uErr) {
            res.status(400).json({ error: `Webhook ${UNIT_CONFIGS[u].shortName}: ${uErr}` });
            return;
          }
        }
      }

      const configuredUnits = UNIT_ORDER.filter((u) =>
        Boolean(resolveUnitWebhookDispatch(effectiveConfig, u))
      );
      if (configuredUnits.length === 0) {
        res.status(400).json({
          error:
            'Belum ada lembaga yang terkonfigurasi. Isi URL Webhook /exec pada tiap lembaga, ATAU isi 1 URL Webhook Utama + URL/ID Google Sheet pada masing-masing lembaga (RA/TK, SDIT, SMP, SMA).',
        });
        return;
      }

      const pushedUnits = new Set<UnitId>();
      let pushedCount = 0;

      for (const u of configuredUnits) {
        const dispatch = resolveUnitWebhookDispatch(effectiveConfig, u);
        if (!dispatch) continue;

        const unitRecords = db.registrations.filter((r) => r.unit === u);
        const items = unitRecords.map((rec) => ({
          id: rec.id,
          unitTab: UNIT_CONFIGS[u].sheetTabName,
          row: registrationToSheetRow({ ...rec, syncState: 'synced' }, db.formConfig[u]),
        }));

        const result = await sendToAppsScript(dispatch.webhookUrl, {
          action: 'bulk_upsert',
          spreadsheetId: dispatch.spreadsheetId || undefined,
          unitTab: UNIT_CONFIGS[u].sheetTabName,
          summaryTabName: 'Ringkasan_Lembaga',
          headers: SHEET_HEADERS,
          summaryRows: buildAppsScriptSummaryRows(db, u),
          formConfig: db.formConfig,
          items,
        });

        if (!result.ok) {
          res.status(502).json({
            error: `Gagal mengirim data ${UNIT_CONFIGS[u].shortName}: ${
              result.bodyText ||
              `HTTP ${result.status}. Pastikan Web App Apps Script sudah di-deploy dengan akses "Siapa saja (Anyone)".`
            }`,
          });
          return;
        }

        if (dispatch.spreadsheetId && !effectiveConfig.unitTargets[u].spreadsheetTitle) {
          effectiveConfig.unitTargets[u].spreadsheetTitle = `Sheet ${UNIT_CONFIGS[u].shortName} (Webhook)`;
          effectiveConfig.unitTargets[u].spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${extractSpreadsheetIdShared(dispatch.spreadsheetId)}`;
        }
        pushedUnits.add(u);
        pushedCount += items.length;
      }

      const nowIso = new Date().toISOString();
      db.registrations = db.registrations.map((r) =>
        pushedUnits.has(r.unit) ? { ...r, syncState: 'synced' } : r
      );
      effectiveConfig.lastSyncedAt = nowIso;
      db.sheetsConfig = effectiveConfig;
      writeDb(db);
      broadcastPublicUpdate('sheets_synced');

      res.json({
        ok: true,
        pushedCount,
        pushedUnits: Array.from(pushedUnits),
        registrations: db.registrations,
        stats: computeUnitStats(db.registrations, db.formConfig),
        sheetsConfig: db.sheetsConfig,
      });
      return;
    }

    // Unified single-spreadsheet mode
    const targetUrl = effectiveConfig.appsScriptUrl;
    const validationErr = validateAppsScriptWebhookUrl(targetUrl);
    if (validationErr) {
      res.status(400).json({ error: validationErr });
      return;
    }

    const extractedId =
      spreadsheetUrlOrId !== undefined
        ? extractSpreadsheetIdServer(spreadsheetUrlOrId)
        : effectiveConfig.spreadsheetId || '';

    const requiredTabs = UNIT_ORDER.map((u) => UNIT_CONFIGS[u].sheetTabName);
    const items = db.registrations.map((rec) => ({
      id: rec.id,
      unitTab: UNIT_CONFIGS[rec.unit].sheetTabName,
      row: registrationToSheetRow({ ...rec, syncState: 'synced' }, db.formConfig[rec.unit]),
    }));

    const result = await sendToAppsScript(targetUrl, {
      action: 'bulk_upsert',
      spreadsheetId: extractedId || undefined,
      requiredTabs,
      summaryTabName: 'Ringkasan_Dashboard',
      headers: SHEET_HEADERS,
      summaryRows: buildAppsScriptSummaryRows(db),
      formConfig: db.formConfig,
      items,
    });

    if (!result.ok) {
      res.status(502).json({
        error:
          result.bodyText ||
          `Gagal mengirim data ke Apps Script (HTTP ${result.status}). Pastikan skrip sudah disalin versi terbaru dan dideploy dengan akses "Siapa saja (Anyone)".`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    db.registrations = db.registrations.map((r) => ({ ...r, syncState: 'synced' }));
    effectiveConfig.appsScriptUrl = targetUrl;
    const resolvedSheetId = extractedId || result.json?.spreadsheetId || '';
    if (resolvedSheetId) {
      effectiveConfig.spreadsheetId = resolvedSheetId;
      effectiveConfig.spreadsheetUrl =
        result.json?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resolvedSheetId}`;
      effectiveConfig.spreadsheetTitle =
        result.json?.spreadsheetTitle ||
        effectiveConfig.spreadsheetTitle ||
        'Spreadsheet Terhubung (Webhook)';
    } else if (spreadsheetUrlOrId !== undefined) {
      effectiveConfig.spreadsheetId = '';
      effectiveConfig.spreadsheetUrl = '';
      effectiveConfig.spreadsheetTitle = '';
    }
    effectiveConfig.lastSyncedAt = nowIso;
    db.sheetsConfig = effectiveConfig;
    writeDb(db);
    broadcastPublicUpdate('sheets_synced');

    res.json({
      ok: true,
      pushedCount: items.length,
      registrations: db.registrations,
      stats: computeUnitStats(db.registrations, db.formConfig),
      sheetsConfig: db.sheetsConfig,
    });
  });

  // Admin-only 2-way Cloud Sync (Pull from Apps Script + merge + push any pending local records)
  app.post('/api/sync/apps-script-pull', async (req, res) => {
    if (!isAdminAuthorized(req)) {
      res.status(401).json({ error: 'Hanya Admin yang dapat menarik sinkronisasi Spreadsheet.' });
      return;
    }
    const { syncMode, url, spreadsheetUrlOrId, unitTargets } = (req.body || {}) as {
      syncMode?: SheetsSyncMode;
      url?: string;
      spreadsheetUrlOrId?: string;
      unitTargets?: Partial<Record<UnitId, Partial<UnitSheetsTarget>>>;
    };

    const db = readDb();
    const effectiveConfig = normalizeSheetsConfig({
      ...db.sheetsConfig,
      syncMode: syncMode || db.sheetsConfig.syncMode,
      appsScriptUrl: url !== undefined ? url : db.sheetsConfig.appsScriptUrl,
      spreadsheetId:
        spreadsheetUrlOrId !== undefined
          ? extractSpreadsheetIdServer(spreadsheetUrlOrId)
          : db.sheetsConfig.spreadsheetId,
      unitTargets: unitTargets
        ? {
            RA_TK: { ...db.sheetsConfig.unitTargets.RA_TK, ...unitTargets.RA_TK },
            SDIT: { ...db.sheetsConfig.unitTargets.SDIT, ...unitTargets.SDIT },
            SMP: { ...db.sheetsConfig.unitTargets.SMP, ...unitTargets.SMP },
            SMA: { ...db.sheetsConfig.unitTargets.SMA, ...unitTargets.SMA },
          }
        : db.sheetsConfig.unitTargets,
    });

    if (effectiveConfig.syncMode === 'per_unit') {
      const configuredUnits = UNIT_ORDER.filter((u) =>
        Boolean(resolveUnitWebhookDispatch(effectiveConfig, u))
      );
      if (configuredUnits.length === 0) {
        res.status(400).json({ error: 'Belum ada Webhook Apps Script per lembaga yang dikonfigurasi.' });
        return;
      }

      const remoteAll: RegistrationRecord[] = [];
      for (const u of configuredUnits) {
        const dispatch = resolveUnitWebhookDispatch(effectiveConfig, u);
        if (!dispatch) continue;
        const pullResp = await sendToAppsScript(dispatch.webhookUrl, {
          action: 'pull',
          spreadsheetId: dispatch.spreadsheetId || undefined,
          unitTab: UNIT_CONFIGS[u].sheetTabName,
        });
        if (!pullResp.ok || !pullResp.json) {
          res.status(502).json({
            error:
              pullResp.bodyText ||
              `Gagal menarik data ${UNIT_CONFIGS[u].shortName}. Pastikan Apps Script sudah diperbarui ke versi 2-arah terbaru.`,
          });
          return;
        }
        const parsed = parsePulledSpreadsheetData(pullResp.json.rowsByTab, pullResp.json.formConfig);
        remoteAll.push(...parsed.registrations.filter((r) => r.unit === u));
        if (parsed.formConfig) {
          db.formConfig[u] = parsed.formConfig[u];
        }
        if (pullResp.json.spreadsheetId) {
          effectiveConfig.unitTargets[u].spreadsheetId = pullResp.json.spreadsheetId;
          effectiveConfig.unitTargets[u].spreadsheetTitle =
            pullResp.json.spreadsheetTitle || effectiveConfig.unitTargets[u].spreadsheetTitle;
          effectiveConfig.unitTargets[u].spreadsheetUrl =
            pullResp.json.spreadsheetUrl ||
            `https://docs.google.com/spreadsheets/d/${pullResp.json.spreadsheetId}`;
        }
      }

      const { mergedRecords, pulledFromRemote, pushedToRemote } = mergeRegistrationLists(
        db.registrations,
        remoteAll
      );
      db.registrations = mergedRecords;
      effectiveConfig.lastSyncedAt = new Date().toISOString();
      db.sheetsConfig = effectiveConfig;
      writeDb(db);
      broadcastPublicUpdate('sheets_synced');

      res.json({
        ok: true,
        pulledFromSheet: pulledFromRemote,
        pushedToSheet: pushedToRemote,
        registrations: db.registrations,
        formConfig: db.formConfig,
        stats: computeUnitStats(db.registrations, db.formConfig),
        sheetsConfig: db.sheetsConfig,
      });
      return;
    }

    const validationErr = validateAppsScriptWebhookUrl(effectiveConfig.appsScriptUrl);
    if (validationErr) {
      res.status(400).json({ error: validationErr });
      return;
    }

    const pullResp = await sendToAppsScript(effectiveConfig.appsScriptUrl, {
      action: 'pull',
      spreadsheetId: effectiveConfig.spreadsheetId || undefined,
    });
    if (!pullResp.ok || !pullResp.json) {
      res.status(502).json({
        error:
          pullResp.bodyText ||
          'Gagal menarik data dari Apps Script. Pastikan kode Apps Script terbaru sudah disalin dan di-deploy sebagai versi baru.',
      });
      return;
    }
    if (!pullResp.json.rowsByTab) {
      res.status(400).json({
        error:
          'Skrip Google Apps Script Anda masih versi lama (1-arah). Salin kode terbaru dari "Salin Kode Apps Script", lalu Deploy → Kelola Deployment → Edit → Versi baru → Terapkan.',
      });
      return;
    }

    const parsed = parsePulledSpreadsheetData(pullResp.json.rowsByTab, pullResp.json.formConfig);
    const { mergedRecords, pulledFromRemote, pushedToRemote } = mergeRegistrationLists(
      db.registrations,
      parsed.registrations
    );
    db.registrations = mergedRecords;
    if (parsed.formConfig) {
      db.formConfig = parsed.formConfig;
    }

    if (pushedToRemote > 0) {
      const requiredTabs = UNIT_ORDER.map((u) => UNIT_CONFIGS[u].sheetTabName);
      const items = db.registrations.map((rec) => ({
        id: rec.id,
        unitTab: UNIT_CONFIGS[rec.unit].sheetTabName,
        row: registrationToSheetRow({ ...rec, syncState: 'synced' }, db.formConfig[rec.unit]),
      }));
      await sendToAppsScript(effectiveConfig.appsScriptUrl, {
        action: 'bulk_upsert',
        spreadsheetId: effectiveConfig.spreadsheetId || undefined,
        requiredTabs,
        summaryTabName: 'Ringkasan_Dashboard',
        headers: SHEET_HEADERS,
        summaryRows: buildAppsScriptSummaryRows(db),
        formConfig: db.formConfig,
        items,
      });
    }

    if (pullResp.json.spreadsheetId) {
      effectiveConfig.spreadsheetId = pullResp.json.spreadsheetId;
      effectiveConfig.spreadsheetTitle =
        pullResp.json.spreadsheetTitle || effectiveConfig.spreadsheetTitle;
      effectiveConfig.spreadsheetUrl =
        pullResp.json.spreadsheetUrl ||
        `https://docs.google.com/spreadsheets/d/${pullResp.json.spreadsheetId}`;
    }
    effectiveConfig.lastSyncedAt = new Date().toISOString();
    db.sheetsConfig = effectiveConfig;
    writeDb(db);
    broadcastPublicUpdate('sheets_synced');

    res.json({
      ok: true,
      pulledFromSheet: pulledFromRemote,
      pushedToSheet: pushedToRemote,
      registrations: db.registrations,
      formConfig: db.formConfig,
      stats: computeUnitStats(db.registrations, db.formConfig),
      sheetsConfig: db.sheetsConfig,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const hydrateDbFromPrimarySpreadsheetOnBoot = async () => {
    const db = readDb();
    const webhookUrl = db.sheetsConfig.appsScriptUrl;
    if (!webhookUrl || validateAppsScriptWebhookUrl(webhookUrl) !== null) return;
    try {
      const pullResp = await sendToAppsScript(webhookUrl, {
        action: 'pull',
        spreadsheetId: db.sheetsConfig.spreadsheetId || undefined,
      });
      if (!pullResp.ok || !pullResp.json?.rowsByTab) return;
      const parsed = parsePulledSpreadsheetData(pullResp.json.rowsByTab, pullResp.json.formConfig);
      const { mergedRecords } = mergeRegistrationLists(
        db.registrations.filter((r) => !r.id.startsWith('seed-')),
        parsed.registrations,
        { dropMissingSynced: true }
      );
      db.registrations = mergedRecords;
      if (parsed.formConfig) {
        db.formConfig = parsed.formConfig;
      }
      if (pullResp.json.spreadsheetId) {
        db.sheetsConfig.spreadsheetId = pullResp.json.spreadsheetId;
        db.sheetsConfig.spreadsheetTitle =
          pullResp.json.spreadsheetTitle || db.sheetsConfig.spreadsheetTitle;
        db.sheetsConfig.spreadsheetUrl =
          pullResp.json.spreadsheetUrl ||
          `https://docs.google.com/spreadsheets/d/${pullResp.json.spreadsheetId}`;
      }
      db.sheetsConfig.lastSyncedAt = pullResp.json.syncedAt || new Date().toISOString();
      writeDb(db);
      broadcastPublicUpdate('sheets_boot_hydrated');
    } catch {
      // Keep local cache if offline at boot
    }
  };

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPMB PP Muttaqin server berjalan di http://localhost:${PORT}`);
    void hydrateDbFromPrimarySpreadsheetOnBoot();
  });
}

startServer().catch((err) => {
  console.error('Gagal memulai server SPMB:', err);
  process.exit(1);
});
