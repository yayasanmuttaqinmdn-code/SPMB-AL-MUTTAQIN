import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCloudShareUrl,
  buildRegistrationStatusSummary,
  classifyAlumniOrigin,
  classifyPengajianRegion,
  columnIndexToLetter,
  computeAdminAnalytics,
  computeSelectionStats,
  computeStatsFromUnitCounts,
  computeUnitStats,
  countConfiguredUnitTargets,
  createEmptyRegistrationInput,
  DEFAULT_FORM_CONFIG,
  findOwnRegistration,
  findRegistrationsByName,
  FOUNDATION_LOGO_PATH,
  generateRegistrationNumber,
  getUnitLogoPath,
  isValidAppsScriptExecUrl,
  mergeRegistrationLists,
  normalizeFormSchemaConfig,
  normalizeRegistrationInput,
  normalizeSheetsConfig,
  parseCloudShareParams,
  parsePulledSpreadsheetData,
  registrationToSheetRow,
  resolveUnitWebhookDispatch,
  sanitizePublicSheetsConfig,
  searchRegistrationsForStatus,
  SHEET_END_COLUMN,
  SHEET_HEADERS,
  sheetRowToRegistration,
  UNIT_LOGO_PATHS,
  validateRegistrationInput,
} from './spmbLogic';
import type { RegistrationRecord, UnitFormConfig } from '../types/spmb';

const SAMPLE_PHOTO_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

function makeRecord(overrides: Partial<RegistrationRecord> = {}): RegistrationRecord {
  const base = normalizeRegistrationInput({
    unit: 'RA_TK',
    namaLengkap: 'Adam Insan Atama',
    namaPanggilan: 'Adam',
    agama: 'ISLAM',
    tempatLahir: 'Wonogiri',
    tanggalLahir: '2021-03-17',
    jenisKelamin: 'Laki-laki',
    nisn: '1234567890',
    nik: '3312211703140002',
    noKk: '3577031301200007',
    anakKe: '2',
    jumlahSaudara: '3',
    asalSekolah: 'RA Muttaqin',
    jenisPrestasi: '-',
    golDarah: 'Tidak Tahu',
    tinggiBadan: '110',
    beratBadan: '20',
    alergi: '-',
    alamatJalan: 'Jl. Serayu Barat No. 9',
    alamatRt: '048',
    alamatRw: '015',
    alamatDesa: 'Taman',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    namaAyah: 'Winarto',
    tempatLahirAyah: 'Sukoharjo',
    tanggalLahirAyah: '1979-11-07',
    nikAyah: '3312210111790001',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Wiraswasta',
    pendidikanAyah: 'SMP sederajat',
    penghasilanAyah: 'Rp.1.000.000 - Rp.2.000.000',
    noHpAyah: '081234567890',
    emailAyah: 'winarto@example.com',
    namaIbu: 'Halimatun',
    tempatLahirIbu: 'Wonogiri',
    tanggalLahirIbu: '1986-03-05',
    nikIbu: '3312216503860001',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Mengurus Rumah Tangga',
    pendidikanIbu: 'SMP sederajat',
    penghasilanIbu: 'Rp. 500.000 - Rp.1.000.000',
    noHpIbu: '081234567803',
    emailIbu: 'halimatun@example.com',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'TAMAN',
    pengajianKelompok: '-',
    jalurPendaftaran: 'Reguler',
    pasFotoDataUrl: SAMPLE_PHOTO_DATA_URL,
    unitData: {
      kelompokUsia: 'Kelompok A (4-5 Tahun)',
      programPaud: 'Reguler Pagi (07.30 - 11.00)',
    },
  });

  return {
    ...base,
    id: 'rec-1',
    noPendaftaran: 'SPMB-2026-TK-0001',
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
    nilaiSeleksi: '',
    catatanSeleksi: '',
    createdAt: '2026-11-14T06:00:00.000Z',
    updatedAt: '2026-11-14T06:00:00.000Z',
    syncState: 'synced',
    ...overrides,
  };
}

test('generateRegistrationNumber increments sequence per unit cleanly', () => {
  const existing = [
    makeRecord({ unit: 'RA_TK', noPendaftaran: 'SPMB-2026-TK-0001' }),
    makeRecord({ unit: 'RA_TK', noPendaftaran: 'SPMB-2026-TK-0004' }),
    makeRecord({ unit: 'SMP', noPendaftaran: 'SPMB-2026-SMP-0002' }),
  ];

  assert.equal(generateRegistrationNumber('RA_TK', existing, 2026), 'SPMB-2026-TK-0005');
  assert.equal(generateRegistrationNumber('SDIT', existing, 2026), 'SPMB-2026-SDIT-0001');
  assert.equal(generateRegistrationNumber('SMP', existing, 2026), 'SPMB-2026-SMP-0003');
  assert.equal(generateRegistrationNumber('SMA', existing, 2026), 'SPMB-2026-SMA-0001');
});

test('computeUnitStats aggregates counts, dynamic quotas, and mukim totals accurately', () => {
  const customConfig = structuredClone(DEFAULT_FORM_CONFIG);
  customConfig.RA_TK.quota = 45;

  const records = [
    makeRecord({ id: '1', unit: 'RA_TK', syncState: 'synced' }),
    makeRecord({ id: '2', unit: 'SDIT', syncState: 'pending' }),
    makeRecord({
      id: '3',
      unit: 'SMP',
      syncState: 'synced',
      unitData: { statusAsrama: 'Santri Mukim (Asrama Pondok)' },
    }),
    makeRecord({
      id: '4',
      unit: 'SMA',
      syncState: 'synced',
      unitData: { statusAsrama: 'Non-Mukim (Pulang Pergi)' },
    }),
  ];

  const stats = computeUnitStats(records, customConfig);
  assert.equal(stats.totalCount, 4);
  assert.equal(stats.totalSynced, 3);
  assert.equal(stats.totalPending, 1);
  assert.equal(stats.byUnit.RA_TK.quota, 45);
  assert.equal(stats.byUnit.RA_TK.remaining, 44);
  assert.equal(stats.byUnit.SMP.mukimCount, 1);
  assert.equal(stats.byUnit.SMA.mukimCount, 0);
});

test('validateRegistrationInput requires all fields except NISN for RA/TK and enforces admin fields', () => {
  const customTkConfig: UnitFormConfig = {
    ...DEFAULT_FORM_CONFIG.RA_TK,
    fields: [
      ...DEFAULT_FORM_CONFIG.RA_TK.fields,
      {
        id: 'ukuranSeragam',
        label: 'Ukuran Seragam Olahraga',
        type: 'select',
        required: true,
        options: ['S', 'M', 'L'],
      },
      {
        id: 'catatanKhusus',
        label: 'Catatan Tambahan',
        type: 'text',
        required: true,
        placeholder: 'Wajib diisi',
      },
    ],
  };

  const tkInput = createEmptyRegistrationInput('RA_TK', customTkConfig);
  tkInput.namaLengkap = 'Muhammad Yusuf';
  tkInput.namaPanggilan = 'Yusuf';
  tkInput.nik = '3577012345670009';
  tkInput.noKk = '3577012345670001';
  tkInput.tempatLahir = 'Madiun';
  tkInput.tanggalLahir = '2021-01-10';
  tkInput.anakKe = '2';
  tkInput.jumlahSaudara = '2';
  tkInput.asalSekolah = '-';
  tkInput.jenisPrestasi = '-';
  tkInput.tinggiBadan = '106';
  tkInput.beratBadan = '18';
  tkInput.alergi = '-';
  tkInput.alamatJalan = 'Jl. Masjid Muttaqin No. 5';
  tkInput.alamatRt = '001';
  tkInput.alamatRw = '002';
  tkInput.alamatDesa = 'Josenan';
  tkInput.alamatKecamatan = 'Taman';
  tkInput.alamatKota = 'Kota Madiun';
  tkInput.alamatProvinsi = 'Jawa Timur';
  tkInput.namaAyah = 'Hendra Wijaya';
  tkInput.tempatLahirAyah = 'Madiun';
  tkInput.tanggalLahirAyah = '1988-02-10';
  tkInput.nikAyah = '3577011002880001';
  tkInput.pekerjaanAyah = 'Wiraswasta';
  tkInput.noHpAyah = '085612345678';
  tkInput.emailAyah = 'hendra@example.com';
  tkInput.namaIbu = 'Nurul Hidayah';
  tkInput.tempatLahirIbu = 'Magetan';
  tkInput.tanggalLahirIbu = '1990-05-12';
  tkInput.nikIbu = '3577015205900001';
  tkInput.pekerjaanIbu = 'Mengurus Rumah Tangga';
  tkInput.noHpIbu = '085612345679';
  tkInput.emailIbu = 'nurul@example.com';
  tkInput.alamatOrtuJalan = 'Jl. Masjid Muttaqin No. 5';
  tkInput.alamatOrtuRt = '001';
  tkInput.alamatOrtuRw = '002';
  tkInput.alamatOrtuDesa = 'Josenan';
  tkInput.alamatOrtuKecamatan = 'Taman';
  tkInput.alamatOrtuKota = 'Kota Madiun';
  tkInput.alamatOrtuProvinsi = 'Jawa Timur';
  tkInput.pengajianDaerah = 'KOTA MADIUN';
  tkInput.pengajianDesa = 'JOSENAN';
  tkInput.pengajianKelompok = 'Muttaqin';
  tkInput.noWhatsapp = '085612345678';
  tkInput.pasFotoDataUrl = SAMPLE_PHOTO_DATA_URL;

  const missingCustom = validateRegistrationInput(tkInput, customTkConfig);
  assert.ok(missingCustom['unitData.catatanKhusus']);
  assert.equal(missingCustom.nisn, undefined);

  tkInput.unitData.catatanKhusus = 'Siap masuk pagi';
  assert.deepEqual(validateRegistrationInput(tkInput, customTkConfig), {});

  // Photo 3x4 must be required for new applicants when requirePhoto is true (default)
  const noPhotoErrs = validateRegistrationInput(
    { ...tkInput, pasFotoDataUrl: '' },
    customTkConfig
  );
  assert.ok(noPhotoErrs.pasFotoDataUrl);
  assert.deepEqual(
    validateRegistrationInput({ ...tkInput, pasFotoDataUrl: '' }, customTkConfig, {
      requirePhoto: false,
    }),
    {}
  );

  // Non-RA/TK units (SDIT, SMP, SMA) must require NISN (10 digits)
  const sditInput = { ...tkInput, unit: 'SDIT' as const, unitData: {} };
  const sditErrors = validateRegistrationInput(sditInput, DEFAULT_FORM_CONFIG.SDIT);
  assert.ok(sditErrors.nisn);

  sditInput.nisn = '0123456789';
  assert.deepEqual(validateRegistrationInput(sditInput, DEFAULT_FORM_CONFIG.SDIT), {});

  // Missing required fields such as emailIbu, tinggiBadan, pengajianKelompok must fail
  const incomplete = { ...sditInput, emailIbu: '', tinggiBadan: '', pengajianKelompok: '' };
  const incompleteErrs = validateRegistrationInput(incomplete, DEFAULT_FORM_CONFIG.SDIT);
  assert.ok(incompleteErrs.emailIbu);
  assert.ok(incompleteErrs.tinggiBadan);
  assert.ok(incompleteErrs.pengajianKelompok);
});

test('findOwnRegistration and findRegistrationsByName match by full child name', () => {
  const records = [
    makeRecord({ id: 'rec-1', namaLengkap: 'Adam Insan Atama', createdAt: '2026-11-14T06:00:00.000Z' }),
    makeRecord({ id: 'rec-2', namaLengkap: 'Adam Malik', createdAt: '2026-11-14T07:00:00.000Z' }),
  ];

  assert.equal(findOwnRegistration(records, ''), null);
  assert.equal(findOwnRegistration(records, 'Ad'), null);
  assert.equal(findOwnRegistration(records, 'Budi Santoso'), null);

  const exact = findOwnRegistration(records, '  adam   insan atama  ');
  assert.ok(exact);
  assert.equal(exact.id, 'rec-1');

  const partial = findRegistrationsByName(records, 'Adam');
  assert.equal(partial.length, 2);
  assert.equal(partial[0].id, 'rec-2');
});

test('registrationToSheetRow and sheetRowToRegistration preserve all fields and selection decisions', () => {
  const original = makeRecord({
    id: 'rec-smp-99',
    unit: 'SMP',
    noPendaftaran: 'SPMB-2026-SMP-0012',
    statusSeleksi: 'Lulus Seleksi',
    nilaiSeleksi: '92 / BTQ Lancar',
    catatanSeleksi: 'Lulus wawancara wali santri',
    unitData: {
      rataRataRapor: '89.5',
      statusAsrama: 'Santri Mukim (Asrama Pondok)',
    },
  });

  const row = registrationToSheetRow(original);
  const parsed = sheetRowToRegistration(row, 'SMP');

  assert.ok(parsed);
  assert.equal(parsed.id, original.id);
  assert.equal(parsed.noPendaftaran, original.noPendaftaran);
  assert.equal(parsed.namaLengkap, original.namaLengkap);
  assert.equal(parsed.namaPanggilan, original.namaPanggilan);
  assert.equal(parsed.noKk, original.noKk);
  assert.equal(parsed.golDarah, original.golDarah);
  assert.equal(parsed.tinggiBadan, original.tinggiBadan);
  assert.equal(parsed.pengajianDaerah, original.pengajianDaerah);
  assert.equal(parsed.statusSeleksi, 'Lulus Seleksi');
  assert.equal(parsed.nilaiSeleksi, '92 / BTQ Lancar');
  assert.equal(parsed.catatanSeleksi, 'Lulus wawancara wali santri');
  assert.equal(parsed.unitData.statusAsrama, 'Santri Mukim (Asrama Pondok)');
});

test('computeSelectionStats counts candidate selection decisions accurately', () => {
  const records = [
    makeRecord({ id: '1', statusSeleksi: 'Belum Diseleksi' }),
    makeRecord({ id: '2', statusSeleksi: 'Dalam Proses Seleksi' }),
    makeRecord({ id: '3', statusSeleksi: 'Lulus Seleksi' }),
    makeRecord({ id: '4', statusSeleksi: 'Lulus Seleksi' }),
    makeRecord({ id: '5', statusSeleksi: 'Cadangan' }),
    makeRecord({ id: '6', statusSeleksi: 'Tidak Lulus' }),
  ];

  const summary = computeSelectionStats(records);
  assert.deepEqual(summary, {
    total: 6,
    belum: 1,
    proses: 1,
    lulus: 2,
    cadangan: 1,
    tidakLulus: 1,
  });
});

test('classifyPengajianRegion and classifyAlumniOrigin identify Madiun regions and Al Muttaqin alumni accurately', () => {
  assert.equal(classifyPengajianRegion('KOTA MADIUN'), 'KOTA_MADIUN');
  assert.equal(classifyPengajianRegion('Kota Madiun'), 'KOTA_MADIUN');
  assert.equal(classifyPengajianRegion('KAB. MADIUN'), 'KAB_MADIUN');
  assert.equal(classifyPengajianRegion('Kabupaten Madiun'), 'KAB_MADIUN');
  assert.equal(classifyPengajianRegion('MAGETAN'), 'LUAR_MADIUN');

  assert.equal(classifyAlumniOrigin('RA Muttaqin Josenan'), 'RA_AL_MUTTAQIN');
  assert.equal(classifyAlumniOrigin('TK Al-Muttaqin Madiun'), 'RA_AL_MUTTAQIN');
  assert.equal(classifyAlumniOrigin('SDIT Al Muttaqin Josenan'), 'SDIT_AL_MUTTAQIN');
  assert.equal(classifyAlumniOrigin('SD Muttaqin'), 'SDIT_AL_MUTTAQIN');
  assert.equal(classifyAlumniOrigin('SMP Muttaqin Josenan'), 'SMP_WUSTHA_AL_MUTTAQIN');
  assert.equal(classifyAlumniOrigin('Pondok Wustha Al Muttaqin'), 'SMP_WUSTHA_AL_MUTTAQIN');
  assert.equal(classifyAlumniOrigin('MTsN 1 Madiun'), 'NON_ALUMNI');
  assert.equal(classifyAlumniOrigin('-'), 'NON_ALUMNI');
});

test('computeAdminAnalytics aggregates gender per unit, Madiun pengajian distribution, and Al Muttaqin alumni', () => {
  const records = [
    makeRecord({
      id: '1',
      unit: 'RA_TK',
      jenisKelamin: 'Laki-laki',
      asalSekolah: '-',
      pengajianDaerah: 'KOTA MADIUN',
      pengajianDesa: 'JOSENAN',
      pengajianKelompok: 'Muttaqin Utara',
    }),
    makeRecord({
      id: '2',
      unit: 'SDIT',
      jenisKelamin: 'Perempuan',
      asalSekolah: 'RA Al Muttaqin Josenan',
      pengajianDaerah: 'KOTA MADIUN',
      pengajianDesa: 'JOSENAN',
      pengajianKelompok: 'Muttaqin Utara',
    }),
    makeRecord({
      id: '3',
      unit: 'SMP',
      jenisKelamin: 'Laki-laki',
      asalSekolah: 'SDIT Al-Muttaqin',
      pengajianDaerah: 'KAB. MADIUN',
      pengajianDesa: 'MEJAYAN',
      pengajianKelompok: 'Mejayan Barat',
    }),
    makeRecord({
      id: '4',
      unit: 'SMA',
      jenisKelamin: 'Perempuan',
      asalSekolah: 'Wustha Al Muttaqin',
      pengajianDaerah: 'MAGETAN',
      pengajianDesa: 'MAOSPATI',
      pengajianKelompok: 'Maospati',
    }),
  ];

  const analytics = computeAdminAnalytics(records);
  assert.equal(analytics.totalCount, 4);
  assert.equal(analytics.totalMale, 2);
  assert.equal(analytics.totalFemale, 2);

  const raGender = analytics.genderByUnit.find((g) => g.unit === 'RA_TK');
  assert.ok(raGender);
  assert.equal(raGender.maleCount, 1);
  assert.equal(raGender.femaleCount, 0);

  assert.equal(analytics.pengajianSummary.kotaMadiun, 2);
  assert.equal(analytics.pengajianSummary.kabMadiun, 1);
  assert.equal(analytics.pengajianSummary.madiunCombined, 3);
  assert.equal(analytics.pengajianSummary.luarMadiun, 1);

  assert.equal(analytics.alumniSummary.raAlMuttaqin, 1);
  assert.equal(analytics.alumniSummary.sditAlMuttaqin, 1);
  assert.equal(analytics.alumniSummary.smpWusthaAlMuttaqin, 1);
  assert.equal(analytics.alumniSummary.totalAlumni, 3);
  assert.equal(analytics.alumniSummary.nonAlumni, 1);
  assert.equal(analytics.alumniSummary.byCategoryAndTargetUnit.RA_AL_MUTTAQIN.SDIT, 1);
  assert.equal(analytics.alumniSummary.byCategoryAndTargetUnit.SDIT_AL_MUTTAQIN.SMP, 1);
  assert.equal(analytics.alumniSummary.byCategoryAndTargetUnit.SMP_WUSTHA_AL_MUTTAQIN.SMA, 1);
});

test('Google Sheets column bounds and fallback row parsing match 34-column layout (A:AH)', () => {
  assert.equal(SHEET_HEADERS.length, 34);
  assert.equal(columnIndexToLetter(1), 'A');
  assert.equal(columnIndexToLetter(26), 'Z');
  assert.equal(columnIndexToLetter(27), 'AA');
  assert.equal(columnIndexToLetter(34), 'AH');
  assert.equal(SHEET_END_COLUMN, 'AH');

  const rec = makeRecord({
    unit: 'SDIT',
    noPendaftaran: 'SPMB-2026-SDIT-0008',
    pengajianDaerah: 'KAB. MADIUN',
    pengajianDesa: 'MEJAYAN',
    pengajianKelompok: 'Mejayan Utara',
    statusSeleksi: 'Cadangan',
    nilaiSeleksi: '81',
    catatanSeleksi: 'Cadangan prioritas 1',
  });

  const row = registrationToSheetRow(rec);
  assert.equal(row.length, SHEET_HEADERS.length);
  assert.equal(row[31], 'Cadangan');
  assert.equal(row[32], '81');
  assert.equal(row[33], 'Cadangan prioritas 1');

  // Even without raw JSON cell (column AD / index 29), sheetRowToRegistration parses row cells cleanly
  const rowWithoutJson = [...row];
  rowWithoutJson[29] = '';
  const parsed = sheetRowToRegistration(rowWithoutJson, 'SDIT');
  assert.ok(parsed);
  assert.equal(parsed.pengajianDaerah, 'KAB. MADIUN');
  assert.equal(parsed.pengajianDesa, 'MEJAYAN');
  assert.equal(parsed.pengajianKelompok, 'Mejayan Utara');
  assert.equal(parsed.statusSeleksi, 'Cadangan');
  assert.equal(parsed.nilaiSeleksi, '81');
  assert.equal(parsed.catatanSeleksi, 'Cadangan prioritas 1');
});

test('per-unit Sheets configuration normalizes URLs, strips webhook secrets in public view, and routes each unit strictly to its own Sheet', () => {
  const cfg = normalizeSheetsConfig({
    syncMode: 'per_unit',
    appsScriptUrl: 'https://script.google.com/macros/s/SHARED_EXEC/exec',
    unitTargets: {
      RA_TK: {
        spreadsheetId: 'https://docs.google.com/spreadsheets/d/SHEET_RA_TK_123/edit#gid=0',
        spreadsheetTitle: 'Sheet RA/TK',
        spreadsheetUrl: '',
        appsScriptUrl: '',
      },
      SDIT: {
        spreadsheetId: 'SHEET_SDIT_456',
        spreadsheetTitle: 'Sheet SDIT',
        spreadsheetUrl: '',
        appsScriptUrl: 'https://script.google.com/macros/s/SDIT_OWN_EXEC/exec',
      },
      SMP: {
        spreadsheetId: '',
        spreadsheetTitle: '',
        spreadsheetUrl: '',
        appsScriptUrl: '',
      },
      SMA: {
        spreadsheetId: 'SHEET_SMA_789',
        spreadsheetTitle: 'Sheet SMA',
        spreadsheetUrl: '',
        appsScriptUrl: '',
      },
    },
  });

  assert.equal(cfg.unitTargets.RA_TK.spreadsheetId, 'SHEET_RA_TK_123');
  assert.equal(
    cfg.unitTargets.RA_TK.spreadsheetUrl,
    'https://docs.google.com/spreadsheets/d/SHEET_RA_TK_123'
  );
  assert.equal(countConfiguredUnitTargets(cfg), 3);

  // RA_TK uses shared webhook + its own RA_TK spreadsheetId
  assert.deepEqual(resolveUnitWebhookDispatch(cfg, 'RA_TK'), {
    webhookUrl: 'https://script.google.com/macros/s/SHARED_EXEC/exec',
    spreadsheetId: 'SHEET_RA_TK_123',
  });
  // SDIT uses its own dedicated webhook + SDIT spreadsheetId
  assert.deepEqual(resolveUnitWebhookDispatch(cfg, 'SDIT'), {
    webhookUrl: 'https://script.google.com/macros/s/SDIT_OWN_EXEC/exec',
    spreadsheetId: 'SHEET_SDIT_456',
  });
  // SMP is not configured -> returns null (never leaks into RA/TK or SDIT!)
  assert.equal(resolveUnitWebhookDispatch(cfg, 'SMP'), null);

  // Public sanitized config strips all webhook URLs
  const pub = sanitizePublicSheetsConfig(cfg);
  assert.equal(pub.appsScriptUrl, '');
  assert.equal(pub.unitTargets.SDIT.appsScriptUrl, '');
  assert.equal(pub.unitTargets.RA_TK.spreadsheetId, 'SHEET_RA_TK_123');

  // Clearing spreadsheetId also clears stale title & url
  const cleared = normalizeSheetsConfig({
    ...cfg,
    unitTargets: {
      ...cfg.unitTargets,
      RA_TK: {
        ...cfg.unitTargets.RA_TK,
        spreadsheetId: '',
      },
    },
  });
  assert.equal(cleared.unitTargets.RA_TK.spreadsheetUrl, '');
  assert.equal(cleared.unitTargets.RA_TK.spreadsheetTitle, '');
});

test('unified Sheets mode is default (1 Spreadsheet file with separate unit tabs) and cleans stale global metadata', () => {
  const emptyCfg = normalizeSheetsConfig();
  assert.equal(emptyCfg.syncMode, 'unified');

  const unifiedCfg = normalizeSheetsConfig({
    spreadsheetId: 'https://docs.google.com/spreadsheets/d/ONE_MASTER_FILE_01/edit#gid=0',
    spreadsheetTitle: 'Database SPMB PP Muttaqin',
    appsScriptUrl: 'https://script.google.com/macros/s/MASTER_EXEC/exec',
  });
  assert.equal(unifiedCfg.syncMode, 'unified');
  assert.equal(unifiedCfg.spreadsheetId, 'ONE_MASTER_FILE_01');
  assert.equal(
    unifiedCfg.spreadsheetUrl,
    'https://docs.google.com/spreadsheets/d/ONE_MASTER_FILE_01'
  );

  // Every unit dispatches to the same 1 Spreadsheet file (routing by unitTab inside Apps Script)
  for (const u of ['RA_TK', 'SDIT', 'SMP', 'SMA'] as const) {
    assert.deepEqual(resolveUnitWebhookDispatch(unifiedCfg, u), {
      webhookUrl: 'https://script.google.com/macros/s/MASTER_EXEC/exec',
      spreadsheetId: 'ONE_MASTER_FILE_01',
    });
  }

  // Clearing global spreadsheetId clears stale spreadsheetUrl and spreadsheetTitle
  const clearedGlobal = normalizeSheetsConfig({
    ...unifiedCfg,
    spreadsheetId: '',
  });
  assert.equal(clearedGlobal.spreadsheetUrl, '');
  assert.equal(clearedGlobal.spreadsheetTitle, '');
});

test('mergeRegistrationLists resolves conflicts deterministically by updatedAt and preserves pasFotoDataUrl', () => {
  const localOnly = makeRecord({
    id: 'local-only',
    namaLengkap: 'Santri Lokal',
    createdAt: '2026-11-14T08:00:00.000Z',
    updatedAt: '2026-11-14T08:00:00.000Z',
    syncState: 'pending',
  });
  const sharedOlderLocal = makeRecord({
    id: 'shared-1',
    namaLengkap: 'Santri Bersama',
    statusSeleksi: 'Belum Diseleksi',
    pasFotoDataUrl: SAMPLE_PHOTO_DATA_URL,
    createdAt: '2026-11-14T06:00:00.000Z',
    updatedAt: '2026-11-14T06:00:00.000Z',
    syncState: 'synced',
  });
  const sharedNewerRemote = makeRecord({
    id: 'shared-1',
    namaLengkap: 'Santri Bersama',
    statusSeleksi: 'Lulus Seleksi',
    nilaiSeleksi: '95',
    pasFotoDataUrl: '', // omitted because of large payload in Sheets cell
    createdAt: '2026-11-14T06:00:00.000Z',
    updatedAt: '2026-11-14T09:30:00.000Z',
    syncState: 'synced',
  });
  const remoteOnly = makeRecord({
    id: 'remote-only',
    unit: 'SDIT',
    noPendaftaran: 'SPMB-2026-SDIT-0009',
    namaLengkap: 'Santri Remote',
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
    syncState: 'synced',
  });

  const merged = mergeRegistrationLists([localOnly, sharedOlderLocal], [sharedNewerRemote, remoteOnly]);
  assert.equal(merged.mergedRecords.length, 3);
  assert.equal(merged.pulledFromRemote, 2);
  assert.equal(merged.pushedToRemote, 1);

  const byId = new Map(merged.mergedRecords.map((r) => [r.id, r]));
  assert.equal(byId.get('shared-1')?.statusSeleksi, 'Lulus Seleksi');
  assert.equal(byId.get('shared-1')?.nilaiSeleksi, '95');
  assert.equal(byId.get('shared-1')?.pasFotoDataUrl, SAMPLE_PHOTO_DATA_URL);
  assert.equal(byId.get('local-only')?.syncState, 'synced');
  assert.equal(byId.get('remote-only')?.unit, 'SDIT');
});

test('parsePulledSpreadsheetData parses per-unit rows and Konfigurasi_Form JSON safely', () => {
  const tkRec = makeRecord({ id: 'tk-1', unit: 'RA_TK', createdAt: '2026-11-14T06:00:00.000Z' });
  const smpRec = makeRecord({
    id: 'smp-1',
    unit: 'SMP',
    noPendaftaran: 'SPMB-2026-SMP-0003',
    createdAt: '2026-11-14T07:00:00.000Z',
  });

  const customCfg = normalizeFormSchemaConfig({
    RA_TK: {
      ...DEFAULT_FORM_CONFIG.RA_TK,
      quota: 55,
    },
  });

  const parsed = parsePulledSpreadsheetData(
    {
      RA_TK: [registrationToSheetRow(tkRec)],
      SDIT: [],
      SMP: [registrationToSheetRow(smpRec)],
      SMA: [],
    },
    JSON.stringify(customCfg)
  );

  assert.equal(parsed.registrations.length, 2);
  assert.equal(parsed.registrations[0].id, 'smp-1');
  assert.equal(parsed.registrations[1].id, 'tk-1');
  assert.equal(parsed.formConfig?.RA_TK.quota, 55);
  assert.equal(parsed.formConfig?.SDIT.quota, DEFAULT_FORM_CONFIG.SDIT.quota);
});

test('computeStatsFromUnitCounts computes DashboardStats without exposing PII', () => {
  const formCfg = normalizeFormSchemaConfig({
    SDIT: {
      ...DEFAULT_FORM_CONFIG.SDIT,
      quota: 70,
    },
  });

  const stats = computeStatsFromUnitCounts(
    {
      RA_TK: { count: 12, mukimCount: 0, syncedCount: 12 },
      SDIT: { count: 25, mukimCount: 0, syncedCount: 24 },
      SMP: { count: 18, mukimCount: 15, syncedCount: 18 },
      SMA: { count: 10, mukimCount: 9, syncedCount: 10 },
    },
    formCfg,
    '2026-11-15T01:00:00.000Z'
  );

  assert.equal(stats.totalCount, 65);
  assert.equal(stats.totalSynced, 64);
  assert.equal(stats.totalPending, 1);
  assert.equal(stats.byUnit.SDIT.quota, 70);
  assert.equal(stats.byUnit.SDIT.remaining, 45);
  assert.equal(stats.byUnit.SMP.mukimCount, 15);
  assert.equal(stats.updatedAt, '2026-11-15T01:00:00.000Z');
});

test('searchRegistrationsForStatus matches by No. Pendaftaran, NIK, and child name', () => {
  const recA = makeRecord({
    id: 'a',
    unit: 'RA_TK',
    noPendaftaran: 'SPMB-2026-TK-0001',
    namaLengkap: 'Adam Insan Atama',
    nik: '3312211703140002',
    createdAt: '2026-11-14T06:00:00.000Z',
  });
  const recB = makeRecord({
    id: 'b',
    unit: 'SDIT',
    noPendaftaran: 'SPMB-2026-SDIT-0014',
    namaLengkap: 'Zayd Al Fatih',
    nik: '3577011205190005',
    createdAt: '2026-11-14T08:00:00.000Z',
  });

  // Match by Registration Number (case-insensitive)
  const byReg = searchRegistrationsForStatus([recA, recB], 'spmb-2026-sdit-0014');
  assert.equal(byReg.length, 1);
  assert.equal(byReg[0].id, 'b');

  // Match by NIK
  const byNik = searchRegistrationsForStatus([recA, recB], '3312211703140002');
  assert.equal(byNik.length, 1);
  assert.equal(byNik[0].id, 'a');

  // Match by partial Name
  const byName = searchRegistrationsForStatus([recA, recB], 'Fatih');
  assert.equal(byName.length, 1);
  assert.equal(byName[0].id, 'b');

  // Too short returns empty
  assert.equal(searchRegistrationsForStatus([recA, recB], 'Ad').length, 0);
});

test('buildRegistrationStatusSummary builds accurate timeline steps and tones across states', () => {
  const pendingRec = makeRecord({
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
  });
  const pendingSummary = buildRegistrationStatusSummary(pendingRec);
  assert.equal(pendingSummary.tone, 'neutral');
  assert.equal(pendingSummary.isVerified, false);
  assert.equal(pendingSummary.steps[1].state, 'current');
  assert.equal(pendingSummary.steps[2].state, 'waiting');

  const verifiedRec = makeRecord({
    statusVerifikasi: 'Terverifikasi Panitia',
    statusSeleksi: 'Dalam Proses Seleksi',
  });
  const verifiedSummary = buildRegistrationStatusSummary(verifiedRec);
  assert.equal(verifiedSummary.tone, 'blue');
  assert.equal(verifiedSummary.isVerified, true);
  assert.equal(verifiedSummary.steps[1].state, 'done');
  assert.equal(verifiedSummary.steps[2].state, 'current');

  const acceptedRec = makeRecord({
    statusVerifikasi: 'Terverifikasi Panitia',
    statusSeleksi: 'Lulus Seleksi',
  });
  const acceptedSummary = buildRegistrationStatusSummary(acceptedRec);
  assert.equal(acceptedSummary.tone, 'emerald');
  assert.equal(acceptedSummary.badgeLabel, 'Lulus Seleksi');
  assert.equal(acceptedSummary.steps[2].state, 'done');

  const rejectedRec = makeRecord({
    statusVerifikasi: 'Terverifikasi Panitia',
    statusSeleksi: 'Tidak Lulus',
  });
  const rejectedSummary = buildRegistrationStatusSummary(rejectedRec);
  assert.equal(rejectedSummary.tone, 'rose');
  assert.equal(rejectedSummary.steps[2].state, 'rejected');
});

test('official Foundation and per-unit logo paths map cleanly to uploaded assets', () => {
  assert.equal(FOUNDATION_LOGO_PATH, '/assets/aistudio/LOGO_YAYASAN_MUTTAQIN_NEW_9100fc21.png');
  assert.equal(getUnitLogoPath('RA_TK'), '/assets/aistudio/RA_0becac60.jpg');
  assert.equal(getUnitLogoPath('SDIT'), '/assets/aistudio/logo_SDIT_ca3a8f36.jpg');
  assert.equal(getUnitLogoPath('SMP'), '/assets/aistudio/LOGO_SMP_AL_MUTTAQIN_Baru_f14d5e7f.png');
  assert.equal(getUnitLogoPath('SMA'), '/assets/aistudio/LOGO_SMA_AL_MUTTAQIN_58041682.jpg');
  assert.equal(Object.keys(UNIT_LOGO_PATHS).length, 4);
});

test('mergeRegistrationLists removes records deleted remotely when dropMissingSynced is enabled', () => {
  const deletedRemotely = makeRecord({
    id: 'deleted-1',
    syncState: 'synced',
  });
  const pendingDraft = makeRecord({
    id: 'pending-2',
    syncState: 'pending',
  });
  const stillRemote = makeRecord({
    id: 'kept-3',
    syncState: 'synced',
  });

  const result = mergeRegistrationLists(
    [deletedRemotely, pendingDraft, stillRemote],
    [stillRemote],
    { dropMissingSynced: true }
  );

  assert.deepEqual(
    result.mergedRecords.map((r) => r.id).sort(),
    ['kept-3', 'pending-2']
  );
});

test('shareable cloud sync link validates Google Apps Script /exec URLs strictly and rejects unsafe URLs', () => {
  const validExec =
    'https://script.google.com/macros/s/AKfycbxTestScript12345/exec';
  assert.equal(isValidAppsScriptExecUrl(validExec), true);
  assert.equal(isValidAppsScriptExecUrl('https://evil.example.com/exec'), false);
  assert.equal(isValidAppsScriptExecUrl('javascript:alert(1)'), false);

  const sharedUrl = buildCloudShareUrl(
    'https://spmb-muttaqin.vercel.app',
    validExec,
    'https://docs.google.com/spreadsheets/d/SHEET_ABC_123/edit'
  );
  assert.ok(sharedUrl.startsWith('https://spmb-muttaqin.vercel.app/?'));

  const queryPart = sharedUrl.slice(sharedUrl.indexOf('?'));
  const parsed = parseCloudShareParams(queryPart);
  assert.deepEqual(parsed, {
    appsScriptUrl: validExec,
    spreadsheetId: 'SHEET_ABC_123',
  });

  assert.equal(parseCloudShareParams('?cloud=https://evil.example.com/exec'), null);
});




