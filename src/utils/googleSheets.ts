import type {
  FormSchemaConfig,
  RegistrationRecord,
  UnitId,
  UnitSheetsTarget,
} from '../types/spmb.ts';
import {
  ACADEMIC_YEAR,
  computeUnitStats,
  DEFAULT_FORM_CONFIG,
  INSTITUTION_NAME,
  registrationToSheetRow,
  SHEET_END_COLUMN,
  SHEET_HEADERS,
  sheetRowToRegistration,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from './spmbLogic.ts';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SUMMARY_TAB = 'Ringkasan_Dashboard';
const UNIT_SUMMARY_TAB = 'Ringkasan_Lembaga';

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  if (urlMatch) {
    return urlMatch[1];
  }
  return trimmed;
}

export class SheetsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SheetsAuthError';
  }
}

function formatSheetsApiError(status: number, rawMessage?: string): string {
  const msg = rawMessage || '';
  if (status === 401 || msg.toLowerCase().includes('invalid authentication credentials')) {
    return 'Sesi akses Google Sheets telah kedaluwarsa. Silakan klik "Sign in with Google" kembali.';
  }
  if (
    status === 403 &&
    (msg.includes('has not been used in project') || msg.includes('is disabled'))
  ) {
    return 'Google Sheets API belum aktif pada proyek Google Cloud aplikasi ini. Anda dapat mengaktifkan Google Sheets API di Google Cloud Console atau langsung menggunakan Cara 2 (Webhook Apps Script 24/7) yang aktif tanpa perlu konfigurasi Cloud Console.';
  }
  if (status === 403 && msg.toLowerCase().includes('insufficient')) {
    return 'Izin Google Sheets belum dicentang saat login. Silakan Putuskan Sesi Google, lalu login ulang dan centang izin akses Google Sheets.';
  }
  if (status === 403) {
    return 'Akun Google ini tidak memiliki akses Edit ke file Spreadsheet tersebut. Pastikan Anda login dengan akun pemilik Spreadsheet atau diberi akses Editor.';
  }
  if (status === 404) {
    return 'File Google Spreadsheet tidak ditemukan. Periksa kembali URL atau ID Spreadsheet yang ditempel.';
  }
  return (
    msg ||
    `Permintaan Google Sheets gagal (HTTP ${status}). Pastikan akses spreadsheet diizinkan.`
  );
}

async function sheetsFetch<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const rawMsg = errBody?.error?.message as string | undefined;
    const readable = formatSheetsApiError(res.status, rawMsg);
    if (res.status === 401) {
      throw new SheetsAuthError(readable);
    }
    throw new Error(readable);
  }

  return (await res.json()) as T;
}

interface SpreadsheetMetadata {
  spreadsheetId: string;
  spreadsheetUrl: string;
  properties: { title: string };
  sheets: Array<{ properties: { sheetId: number; title: string } }>;
}

export async function inspectSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  return sheetsFetch<SpreadsheetMetadata>(
    `${SHEETS_API_BASE}/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title)`,
    accessToken
  );
}

function buildSummaryRows(
  records: RegistrationRecord[],
  syncTimeIso: string,
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): string[][] {
  const stats = computeUnitStats(records, formConfig);
  const formattedTime = new Date(syncTimeIso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return [
    ['DASHBOARD SPMB REAL-TIME', INSTITUTION_NAME, `Tahun Ajaran ${ACADEMIC_YEAR}`],
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
      'Seluruh Lembaga Yayasan PP Muttaqin',
      String(stats.totalCount),
      String(stats.totalQuota),
      String(Math.max(0, stats.totalQuota - stats.totalCount)),
      String(UNIT_ORDER.reduce((acc, u) => acc + stats.byUnit[u].mukimCount, 0)),
    ],
  ];
}

export async function createSpmbSpreadsheet(
  accessToken: string,
  initialRecords: RegistrationRecord[],
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): Promise<{ spreadsheetId: string; spreadsheetTitle: string; spreadsheetUrl: string }> {
  const title = `Database SPMB ${INSTITUTION_NAME} ${ACADEMIC_YEAR}`;

  const created = await sheetsFetch<SpreadsheetMetadata>(SHEETS_API_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title, locale: 'id_ID' },
      sheets: [
        { properties: { title: SUMMARY_TAB, gridProperties: { frozenRowCount: 4 } } },
        ...UNIT_ORDER.map((unit) => ({
          properties: {
            title: UNIT_CONFIGS[unit].sheetTabName,
            gridProperties: { frozenRowCount: 1 },
          },
        })),
      ],
    }),
  });

  await writeFullStateToSpreadsheet(accessToken, created.spreadsheetId, initialRecords, formConfig);

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetTitle: created.properties.title,
    spreadsheetUrl: created.spreadsheetUrl,
  };
}

export async function ensureRequiredTabs(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const meta = await inspectSpreadsheet(accessToken, spreadsheetId);
  const existingTitles = new Set(meta.sheets.map((s) => s.properties.title));
  const neededTitles = [SUMMARY_TAB, ...UNIT_ORDER.map((u) => UNIT_CONFIGS[u].sheetTabName)];
  const missing = neededTitles.filter((t) => !existingTitles.has(t));

  if (missing.length > 0) {
    await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: missing.map((title) => ({
          addSheet: {
            properties: {
              title,
              gridProperties: { frozenRowCount: title === SUMMARY_TAB ? 4 : 1 },
            },
          },
        })),
      }),
    });
    return inspectSpreadsheet(accessToken, spreadsheetId);
  }

  return meta;
}

async function writeFullStateToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  records: RegistrationRecord[],
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): Promise<void> {
  const nowIso = new Date().toISOString();
  const dataToUpdate: Array<{ range: string; values: string[][] }> = [
    {
      range: `${SUMMARY_TAB}!A1:F10`,
      values: buildSummaryRows(records, nowIso, formConfig),
    },
  ];

  for (const unit of UNIT_ORDER) {
    const tabName = UNIT_CONFIGS[unit].sheetTabName;
    const unitRecords = records
      .filter((r) => r.unit === unit)
      .sort((a, b) => a.noPendaftaran.localeCompare(b.noPendaftaran));
    const rows = [
      SHEET_HEADERS,
      ...unitRecords.map((r) =>
        registrationToSheetRow({ ...r, syncState: 'synced' }, formConfig[unit])
      ),
    ];
    dataToUpdate.push({
      range: `${tabName}!A1:${SHEET_END_COLUMN}${Math.max(rows.length, 1)}`,
      values: rows,
    });
  }

  await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchClear`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      ranges: [
        `${SUMMARY_TAB}!A1:F20`,
        ...UNIT_ORDER.map((u) => `${UNIT_CONFIGS[u].sheetTabName}!A1:${SHEET_END_COLUMN}2000`),
      ],
    }),
  });

  await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: dataToUpdate,
    }),
  });
}

export interface SyncResult {
  mergedRecords: RegistrationRecord[];
  pulledFromSheet: number;
  pushedToSheet: number;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  syncedAt: string;
}

export async function syncWithGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  localRecords: RegistrationRecord[],
  options: { pushAllLocal?: boolean; formConfig?: FormSchemaConfig } = {}
): Promise<SyncResult> {
  const formConfig = options.formConfig || DEFAULT_FORM_CONFIG;
  const meta = await ensureRequiredTabs(accessToken, spreadsheetId);
  const ranges = UNIT_ORDER.map(
    (u) => `${UNIT_CONFIGS[u].sheetTabName}!A2:${SHEET_END_COLUMN}2000`
  );
  const query = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');

  const batchResponse = await sheetsFetch<{
    valueRanges?: Array<{ range: string; values?: string[][] }>;
  }>(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchGet?${query}`, accessToken);

  const remoteMap = new Map<string, RegistrationRecord>();
  const valueRanges = batchResponse.valueRanges || [];

  UNIT_ORDER.forEach((unit: UnitId, idx: number) => {
    const rows = valueRanges[idx]?.values || [];
    for (const row of rows) {
      const parsed = sheetRowToRegistration(row, unit);
      if (parsed) {
        remoteMap.set(parsed.id, parsed);
      }
    }
  });

  const localMap = new Map<string, RegistrationRecord>();
  for (const rec of localRecords) {
    localMap.set(rec.id, rec);
  }

  const mergedMap = new Map<string, RegistrationRecord>();
  let pulledFromSheet = 0;
  let pushedToSheet = 0;

  for (const local of localRecords) {
    const remote = remoteMap.get(local.id);
    if (!remote) {
      mergedMap.set(local.id, { ...local, syncState: 'synced' });
      pushedToSheet += 1;
    } else {
      const localTime = Date.parse(local.updatedAt || local.createdAt || '0');
      const remoteTime = Date.parse(remote.updatedAt || remote.createdAt || '0');

      if (!options.pushAllLocal && remoteTime > localTime) {
        mergedMap.set(local.id, { ...remote, syncState: 'synced' });
        pulledFromSheet += 1;
      } else {
        mergedMap.set(local.id, { ...local, syncState: 'synced' });
        if (localTime > remoteTime || local.syncState !== 'synced') {
          pushedToSheet += 1;
        }
      }
    }
  }

  for (const [id, remote] of remoteMap.entries()) {
    if (!localMap.has(id)) {
      mergedMap.set(id, { ...remote, syncState: 'synced' });
      pulledFromSheet += 1;
    }
  }

  const mergedRecords = Array.from(mergedMap.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  await writeFullStateToSpreadsheet(accessToken, spreadsheetId, mergedRecords, formConfig);

  return {
    mergedRecords,
    pulledFromSheet,
    pushedToSheet,
    spreadsheetTitle: meta.properties.title,
    spreadsheetUrl: meta.spreadsheetUrl,
    syncedAt: new Date().toISOString(),
  };
}

function buildSingleUnitSummaryRows(
  unit: UnitId,
  unitRecords: RegistrationRecord[],
  syncTimeIso: string,
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): string[][] {
  const stats = computeUnitStats(unitRecords, formConfig);
  const s = stats.byUnit[unit];
  const formattedTime = new Date(syncTimeIso).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  return [
    [`REKAP SPMB ${UNIT_CONFIGS[unit].fullName.toUpperCase()}`, INSTITUTION_NAME, `Tahun Ajaran ${ACADEMIC_YEAR}`],
    ['Terakhir Disinkronkan', formattedTime, `Total Pendaftar Lembaga: ${s.count}`],
    [],
    ['Kode Lembaga', 'Nama Lembaga', 'Pendaftar Sementara', 'Kuota', 'Sisa Kuota', 'Santri Mukim'],
    [
      UNIT_CONFIGS[unit].shortName,
      s.fullName,
      String(s.count),
      String(s.quota),
      String(s.remaining),
      String(s.mukimCount),
    ],
  ];
}

async function ensureSingleUnitTabs(
  accessToken: string,
  spreadsheetId: string,
  unit: UnitId
): Promise<SpreadsheetMetadata> {
  const meta = await inspectSpreadsheet(accessToken, spreadsheetId);
  const existingTitles = new Set(meta.sheets.map((s) => s.properties.title));
  const unitTab = UNIT_CONFIGS[unit].sheetTabName;
  const needed = [unitTab, UNIT_SUMMARY_TAB].filter((t) => !existingTitles.has(t));

  if (needed.length > 0) {
    await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
        requests: needed.map((title) => ({
          addSheet: {
            properties: {
              title,
              index: title === unitTab ? 0 : undefined,
              gridProperties: { frozenRowCount: title === UNIT_SUMMARY_TAB ? 4 : 1 },
            },
          },
        })),
      }),
    });
    return inspectSpreadsheet(accessToken, spreadsheetId);
  }
  return meta;
}

async function writeSingleUnitStateToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  unit: UnitId,
  unitRecords: RegistrationRecord[],
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): Promise<void> {
  const nowIso = new Date().toISOString();
  const unitTab = UNIT_CONFIGS[unit].sheetTabName;
  const sorted = [...unitRecords].sort((a, b) => a.noPendaftaran.localeCompare(b.noPendaftaran));
  const rows = [
    SHEET_HEADERS,
    ...sorted.map((r) =>
      registrationToSheetRow({ ...r, syncState: 'synced' }, formConfig[unit])
    ),
  ];

  await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchClear`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      ranges: [
        `${UNIT_SUMMARY_TAB}!A1:F10`,
        `${unitTab}!A1:${SHEET_END_COLUMN}2000`,
      ],
    }),
  });

  await sheetsFetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: [
        {
          range: `${UNIT_SUMMARY_TAB}!A1:F6`,
          values: buildSingleUnitSummaryRows(unit, sorted, nowIso, formConfig),
        },
        {
          range: `${unitTab}!A1:${SHEET_END_COLUMN}${Math.max(rows.length, 1)}`,
          values: rows,
        },
      ],
    }),
  });
}

export async function createUnitSpreadsheet(
  accessToken: string,
  unit: UnitId,
  allRecords: RegistrationRecord[],
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): Promise<{
  unit: UnitId;
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
}> {
  const unitCfg = UNIT_CONFIGS[unit];
  const title = `Database SPMB ${unitCfg.fullName} ${ACADEMIC_YEAR}`;
  const unitRecords = allRecords.filter((r) => r.unit === unit);

  const created = await sheetsFetch<SpreadsheetMetadata>(SHEETS_API_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title, locale: 'id_ID' },
      sheets: [
        {
          properties: {
            title: unitCfg.sheetTabName,
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: UNIT_SUMMARY_TAB,
            gridProperties: { frozenRowCount: 4 },
          },
        },
      ],
    }),
  });

  await writeSingleUnitStateToSpreadsheet(
    accessToken,
    created.spreadsheetId,
    unit,
    unitRecords,
    formConfig
  );

  return {
    unit,
    spreadsheetId: created.spreadsheetId,
    spreadsheetTitle: created.properties.title,
    spreadsheetUrl: created.spreadsheetUrl,
  };
}

export async function syncSingleUnitWithGoogleSheet(
  accessToken: string,
  unit: UnitId,
  spreadsheetId: string,
  allLocalRecords: RegistrationRecord[],
  options: { pushAllLocal?: boolean; formConfig?: FormSchemaConfig } = {}
): Promise<{
  unit: UnitId;
  unitRecords: RegistrationRecord[];
  pulledFromSheet: number;
  pushedToSheet: number;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
}> {
  const formConfig = options.formConfig || DEFAULT_FORM_CONFIG;
  const meta = await ensureSingleUnitTabs(accessToken, spreadsheetId, unit);
  const unitTab = UNIT_CONFIGS[unit].sheetTabName;
  const range = `${unitTab}!A2:${SHEET_END_COLUMN}2000`;

  const valueResp = await sheetsFetch<{ values?: string[][] }>(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    accessToken
  );

  const remoteMap = new Map<string, RegistrationRecord>();
  for (const row of valueResp.values || []) {
    const parsed = sheetRowToRegistration(row, unit);
    if (parsed && parsed.unit === unit) {
      remoteMap.set(parsed.id, parsed);
    }
  }

  const localUnitRecords = allLocalRecords.filter((r) => r.unit === unit);
  const localMap = new Map<string, RegistrationRecord>();
  for (const rec of localUnitRecords) {
    localMap.set(rec.id, rec);
  }

  const mergedMap = new Map<string, RegistrationRecord>();
  let pulledFromSheet = 0;
  let pushedToSheet = 0;

  for (const local of localUnitRecords) {
    const remote = remoteMap.get(local.id);
    if (!remote) {
      mergedMap.set(local.id, { ...local, syncState: 'synced' });
      pushedToSheet += 1;
    } else {
      const localTime = Date.parse(local.updatedAt || local.createdAt || '0');
      const remoteTime = Date.parse(remote.updatedAt || remote.createdAt || '0');
      if (!options.pushAllLocal && remoteTime > localTime) {
        mergedMap.set(local.id, { ...remote, syncState: 'synced' });
        pulledFromSheet += 1;
      } else {
        mergedMap.set(local.id, { ...local, syncState: 'synced' });
        if (localTime > remoteTime || local.syncState !== 'synced') {
          pushedToSheet += 1;
        }
      }
    }
  }

  for (const [id, remote] of remoteMap.entries()) {
    if (!localMap.has(id)) {
      mergedMap.set(id, { ...remote, syncState: 'synced' });
      pulledFromSheet += 1;
    }
  }

  const unitRecords = Array.from(mergedMap.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  await writeSingleUnitStateToSpreadsheet(
    accessToken,
    spreadsheetId,
    unit,
    unitRecords,
    formConfig
  );

  return {
    unit,
    unitRecords,
    pulledFromSheet,
    pushedToSheet,
    spreadsheetTitle: meta.properties.title,
    spreadsheetUrl: meta.spreadsheetUrl,
  };
}

export async function syncAllPerUnitGoogleSheets(
  accessToken: string,
  unitTargets: Record<UnitId, UnitSheetsTarget>,
  allLocalRecords: RegistrationRecord[],
  options: { pushAllLocal?: boolean; formConfig?: FormSchemaConfig } = {}
): Promise<{
  mergedRecords: RegistrationRecord[];
  updatedTargets: Record<UnitId, UnitSheetsTarget>;
  pulledFromSheet: number;
  pushedToSheet: number;
  syncedUnitsCount: number;
  syncedAt: string;
}> {
  const updatedTargets: Record<UnitId, UnitSheetsTarget> = structuredClone(unitTargets);
  let totalPulled = 0;
  let totalPushed = 0;
  let syncedUnitsCount = 0;
  const mergedParts: RegistrationRecord[] = [];

  for (const unit of UNIT_ORDER) {
    const target = updatedTargets[unit];
    const unitLocal = allLocalRecords.filter((r) => r.unit === unit);
    if (!target.spreadsheetId) {
      mergedParts.push(...unitLocal);
      continue;
    }

    const res = await syncSingleUnitWithGoogleSheet(
      accessToken,
      unit,
      target.spreadsheetId,
      allLocalRecords,
      options
    );
    updatedTargets[unit] = {
      ...target,
      spreadsheetTitle: res.spreadsheetTitle,
      spreadsheetUrl: res.spreadsheetUrl,
    };
    totalPulled += res.pulledFromSheet;
    totalPushed += res.pushedToSheet;
    syncedUnitsCount += 1;
    mergedParts.push(...res.unitRecords);
  }

  const mergedRecords = mergedParts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    mergedRecords,
    updatedTargets,
    pulledFromSheet: totalPulled,
    pushedToSheet: totalPushed,
    syncedUnitsCount,
    syncedAt: new Date().toISOString(),
  };
}

