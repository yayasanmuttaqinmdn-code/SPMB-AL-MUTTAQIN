import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACADEMIC_YEAR,
  buildCloudShareUrl,
  buildRegistrationStatusSummary,
  classifyAlumniOrigin,
  classifyPengajianRegion,
  columnIndexToLetter,
  computeAdminAnalytics,
  computePerUnitRecaps,
  computeSelectionStats,
  computeStatsFromUnitCounts,
  computeUnitStats,
  countConfiguredUnitTargets,
  createEmptyRegistrationInput,
  createPrimarySheetsConfig,
  DEFAULT_FORM_CONFIG,
  FEE_CATEGORY_ORDER,
  FEE_SCHEDULES,
  computeFeeTotals,
  findOwnRegistration,
  findRegistrationsByName,
  formatRupiah,
  FOUNDATION_LOGO_PATH,
  generateRegistrationNumber,
  getDefaultRequiredFields,
  getFeeItemsForGender,
  getNextSlideIndex,
  getUnitLogoPath,
  INSTITUTION_NAME,
  OFFICIAL_FEE_PDF_PATH,
  isGenderSplitQuotaUnit,
  isStandardFieldRequired,
  isValidAppsScriptExecUrl,
  isValidProfilePhotoUrl,
  MAX_PROFILE_PHOTO_SLIDES,
  mergeRegistrationLists,
  normalizeFormSchemaConfig,
  normalizeProfileGalleryConfig,
  normalizeRegistrationInput,
  normalizeSheetsConfig,
  parseCloudShareParams,
  parsePulledSpreadsheetData,
  PRIMARY_SPREADSHEET_CONFIG,
  registrationToSheetRow,
  reorderProfileSlides,
  resolveUnitQuotaTargets,
  resolveUnitRequiredFields,
  resolveUnitWebhookDispatch,
  sanitizePublicSheetsConfig,
  searchRegistrationsForStatus,
  SHEET_END_COLUMN,
  SHEET_HEADERS,
  sheetRowToRegistration,
  STANDARD_FORM_FIELD_GROUPS,
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
  assert.equal(generateRegistrationNumber('SMA', []), 'SPMB-2027-SMA-0001');
  assert.equal(INSTITUTION_NAME, 'YAYASAN PONDOK PESANTREN MUTTAQIN JOSENAN MADIUN');
  assert.equal(ACADEMIC_YEAR, '2027/2028');
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

test('PRIMARY_SPREADSHEET_CONFIG binds SPMB 2027 spreadsheet and Apps Script endpoint globally', () => {
  const cfg = createPrimarySheetsConfig();
  assert.equal(cfg.syncMode, 'unified');
  assert.equal(cfg.spreadsheetId, '1Vk2NjqvmphkZhV5gahpkTWVaYdLaJ1CneyyNBZvs724');
  assert.equal(cfg.spreadsheetTitle, 'SPMB 2027');
  assert.equal(isValidAppsScriptExecUrl(cfg.appsScriptUrl), true);
  assert.equal(cfg.appsScriptUrl, PRIMARY_SPREADSHEET_CONFIG.appsScriptUrl);
});

test('SMP and SMA split registration quotas into Putra and Putri while RA/TK and SDIT remain unified', () => {
  assert.equal(isGenderSplitQuotaUnit('RA_TK'), false);
  assert.equal(isGenderSplitQuotaUnit('SDIT'), false);
  assert.equal(isGenderSplitQuotaUnit('SMP'), true);
  assert.equal(isGenderSplitQuotaUnit('SMA'), true);

  // Default form config
  assert.equal(DEFAULT_FORM_CONFIG.RA_TK.quotaPutra, undefined);
  assert.equal(DEFAULT_FORM_CONFIG.SDIT.quotaPutri, undefined);
  assert.equal(DEFAULT_FORM_CONFIG.SMP.quota, 120);
  assert.equal(DEFAULT_FORM_CONFIG.SMP.quotaPutra, 60);
  assert.equal(DEFAULT_FORM_CONFIG.SMP.quotaPutri, 60);
  assert.equal(DEFAULT_FORM_CONFIG.SMA.quota, 120);
  assert.equal(DEFAULT_FORM_CONFIG.SMA.quotaPutra, 60);
  assert.equal(DEFAULT_FORM_CONFIG.SMA.quotaPutri, 60);

  // Normalization keeps quota === quotaPutra + quotaPutri for SMP/SMA, and strips them from RA/TK & SDIT
  const normalized = normalizeFormSchemaConfig({
    RA_TK: { ...DEFAULT_FORM_CONFIG.RA_TK, quota: 50, quotaPutra: 25, quotaPutri: 25 },
    SMP: { ...DEFAULT_FORM_CONFIG.SMP, quota: 999, quotaPutra: 45, quotaPutri: 75 },
    SMA: { ...DEFAULT_FORM_CONFIG.SMA, quotaPutra: 0, quotaPutri: 80 },
  });
  assert.equal(normalized.RA_TK.quota, 50);
  assert.equal(normalized.RA_TK.quotaPutra, undefined);
  assert.equal(normalized.RA_TK.quotaPutri, undefined);
  assert.equal(normalized.SMP.quota, 120);
  assert.equal(normalized.SMP.quotaPutra, 45);
  assert.equal(normalized.SMP.quotaPutri, 75);
  assert.equal(normalized.SMA.quota, 80);
  assert.equal(normalized.SMA.quotaPutra, 0);
  assert.equal(normalized.SMA.quotaPutri, 80);

  // Legacy numeric-only quota for SMP/SMA splits gracefully
  assert.deepEqual(resolveUnitQuotaTargets('SMP', { unit: 'SMP', quota: 101, instructions: '', requiredDocs: [], fields: [] }), {
    quota: 101,
    quotaPutra: 51,
    quotaPutri: 50,
  });

  // computeUnitStats tracks maleCount, femaleCount, remainingPutra, remainingPutri
  const stats = computeUnitStats(
    [
      makeRecord({ id: 'smp-pa-1', unit: 'SMP', jenisKelamin: 'Laki-laki' }),
      makeRecord({ id: 'smp-pa-2', unit: 'SMP', jenisKelamin: 'Laki-laki' }),
      makeRecord({ id: 'smp-pi-1', unit: 'SMP', jenisKelamin: 'Perempuan' }),
      makeRecord({ id: 'sma-pi-1', unit: 'SMA', jenisKelamin: 'Perempuan' }),
    ],
    normalized
  );

  assert.equal(stats.byUnit.SMP.maleCount, 2);
  assert.equal(stats.byUnit.SMP.femaleCount, 1);
  assert.equal(stats.byUnit.SMP.quotaPutra, 45);
  assert.equal(stats.byUnit.SMP.quotaPutri, 75);
  assert.equal(stats.byUnit.SMP.remainingPutra, 43);
  assert.equal(stats.byUnit.SMP.remainingPutri, 74);

  assert.equal(stats.byUnit.SMA.maleCount, 0);
  assert.equal(stats.byUnit.SMA.femaleCount, 1);
  assert.equal(stats.byUnit.SMA.remainingPutra, 0);
  assert.equal(stats.byUnit.SMA.remainingPutri, 79);

  // computeStatsFromUnitCounts handles explicit gender counts and backward-compatible missing counts
  const publicStats = computeStatsFromUnitCounts(
    {
      SMP: { count: 3, mukimCount: 2, syncedCount: 3, maleCount: 2, femaleCount: 1 },
      SMA: { count: 2, mukimCount: 2, syncedCount: 2 }, // older Apps Script without maleCount/femaleCount
      RA_TK: { count: 0, mukimCount: 0, syncedCount: 0 },
    },
    normalized
  );
  assert.equal(publicStats.byUnit.SMP.maleCount, 2);
  assert.equal(publicStats.byUnit.SMP.femaleCount, 1);
  assert.equal(publicStats.byUnit.SMP.remainingPutra, 43);
  assert.equal(publicStats.byUnit.SMP.remainingPutri, 74);

  assert.equal(publicStats.byUnit.SMA.maleCount, undefined);
  assert.equal(publicStats.byUnit.SMA.femaleCount, undefined);
  assert.equal(publicStats.byUnit.SMA.quotaPutra, 0);
  assert.equal(publicStats.byUnit.SMA.quotaPutri, 80);

  assert.equal(publicStats.byUnit.RA_TK.quotaPutra, undefined);
});

test('Admin can toggle standard registration fields between required and optional per unit while protecting locked identifiers', () => {
  // Default maps
  const raDefaults = getDefaultRequiredFields('RA_TK');
  const sditDefaults = getDefaultRequiredFields('SDIT');
  assert.equal(raDefaults.nisn, false);
  assert.equal(sditDefaults.nisn, true);
  assert.equal(raDefaults.namaLengkap, true);
  assert.equal(raDefaults.pasFotoDataUrl, true);
  assert.equal(STANDARD_FORM_FIELD_GROUPS.length, 7);

  // Locked fields (namaLengkap & jenisKelamin) cannot be made optional
  const resolvedSdit = resolveUnitRequiredFields('SDIT', {
    requiredFields: {
      namaLengkap: false,
      jenisKelamin: false,
      nik: false,
      emailAyah: false,
      pasFotoDataUrl: false,
    },
  });
  assert.equal(resolvedSdit.namaLengkap, true);
  assert.equal(resolvedSdit.jenisKelamin, true);
  assert.equal(resolvedSdit.nik, false);
  assert.equal(resolvedSdit.emailAyah, false);
  assert.equal(resolvedSdit.pasFotoDataUrl, false);
  assert.equal(
    isStandardFieldRequired('SDIT', 'namaLengkap', {
      unit: 'SDIT',
      quota: 90,
      instructions: '',
      requiredDocs: [],
      fields: [],
      requiredFields: { namaLengkap: false },
    }),
    true
  );

  // normalizeFormSchemaConfig preserves custom requiredFields and backfills missing legacy units
  const normalizedCfg = normalizeFormSchemaConfig({
    SMP: {
      ...DEFAULT_FORM_CONFIG.SMP,
      requiredFields: {
        pasFotoDataUrl: false,
        nik: false,
        noKk: false,
        nikAyah: false,
        emailAyah: false,
        noHpAyah: false,
        nikIbu: false,
        emailIbu: false,
        noHpIbu: false,
        tinggiBadan: false,
        beratBadan: false,
        pengajianKelompok: false,
        agama: false,
        golDarah: false,
      },
    },
  });

  assert.equal(normalizedCfg.SMP.requiredFields?.nik, false);
  assert.equal(normalizedCfg.SMP.requiredFields?.pasFotoDataUrl, false);
  assert.equal(normalizedCfg.RA_TK.requiredFields?.nisn, false);
  assert.equal(normalizedCfg.SDIT.requiredFields?.nisn, true);

  // Validation skips empty checks for optional fields while keeping format checks when filled
  const smpInput = normalizeRegistrationInput({
    unit: 'SMP',
    namaLengkap: 'Fatimah Az-Zahra',
    namaPanggilan: 'Fatimah',
    agama: '',
    tempatLahir: 'Madiun',
    tanggalLahir: '2014-05-12',
    jenisKelamin: 'Perempuan',
    nisn: '0123456789',
    nik: '',
    noKk: '',
    anakKe: '1',
    jumlahSaudara: '2',
    pasFotoDataUrl: '',
    asalSekolah: 'SDIT Muttaqin',
    jenisPrestasi: '-',
    golDarah: '',
    tinggiBadan: '',
    beratBadan: '',
    alergi: '-',
    alamatJalan: 'Jl. Serayu No. 1',
    alamatRt: '01',
    alamatRw: '02',
    alamatDesa: 'Josenan',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    namaAyah: 'Ahmad',
    tempatLahirAyah: 'Madiun',
    tanggalLahirAyah: '1980-01-01',
    nikAyah: '',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Guru',
    noHpAyah: '',
    emailAyah: '',
    namaIbu: 'Aisyah',
    tempatLahirIbu: 'Madiun',
    tanggalLahirIbu: '1983-02-02',
    nikIbu: '',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Ibu Rumah Tangga',
    noHpIbu: '',
    emailIbu: '',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'JOSENAN',
    pengajianKelompok: '',
    jalurPendaftaran: 'Reguler',
  });

  assert.deepEqual(validateRegistrationInput(smpInput, normalizedCfg.SMP), {});

  // Providing invalid format on an optional field must still return a format error
  const invalidOptionalFormat = {
    ...smpInput,
    nik: '123',
    emailAyah: 'bukan-email',
    noHpAyah: '081',
  };
  const formatErrs = validateRegistrationInput(invalidOptionalFormat, normalizedCfg.SMP);
  assert.ok(formatErrs.nik);
  assert.ok(formatErrs.emailAyah);
  assert.ok(formatErrs.noHpAyah);
});

test('FEE_SCHEDULES match official BIAYA_PPDB_2027 PDF totals for all 6 categories (Putra & Putri)', () => {
  assert.equal(OFFICIAL_FEE_PDF_PATH, '/assets/aistudio/BIAYA_PPDB_2027_4d726d4e.pdf');
  assert.deepEqual(FEE_CATEGORY_ORDER, ['PP', 'SMA', 'SMP', 'SDIT', 'RA', 'KB']);

  const expectedTotals: Record<(typeof FEE_CATEGORY_ORDER)[number], { putra: number; putri: number }> = {
    PP: { putra: 485000, putri: 485000 },
    SMA: { putra: 3695000, putri: 3725000 },
    SMP: { putra: 2670000, putri: 2695000 },
    SDIT: { putra: 1055000, putri: 1175000 },
    RA: { putra: 820000, putri: 880000 },
    KB: { putra: 670000, putri: 670000 },
  };

  for (const id of FEE_CATEGORY_ORDER) {
    const group = FEE_SCHEDULES[id];
    const computed = computeFeeTotals(group.items);
    assert.equal(group.totalPutra, expectedTotals[id].putra, `${id} totalPutra mismatch`);
    assert.equal(group.totalPutri, expectedTotals[id].putri, `${id} totalPutri mismatch`);
    assert.equal(computed.putra, expectedTotals[id].putra, `${id} line-item Putra sum mismatch`);
    assert.equal(computed.putri, expectedTotals[id].putri, `${id} line-item Putri sum mismatch`);

    const putraItems = getFeeItemsForGender(group.items, 'putra');
    const putriItems = getFeeItemsForGender(group.items, 'putri');
    assert.equal(
      putraItems.reduce((sum, item) => sum + item.amount, 0),
      expectedTotals[id].putra,
      `${id} filtered Putra items sum mismatch`
    );
    assert.equal(
      putriItems.reduce((sum, item) => sum + item.amount, 0),
      expectedTotals[id].putri,
      `${id} filtered Putri items sum mismatch`
    );
  }

  // SMA Putra excludes Jilbab and includes Cukur; SMA Putri includes Jilbab and excludes Cukur
  const smaPutraLabels = getFeeItemsForGender(FEE_SCHEDULES.SMA.items, 'putra').map((i) => i.label);
  const smaPutriLabels = getFeeItemsForGender(FEE_SCHEDULES.SMA.items, 'putri').map((i) => i.label);
  assert.equal(smaPutraLabels.includes('Jilbab'), false);
  assert.equal(smaPutraLabels.includes('Cukur'), true);
  assert.equal(smaPutriLabels.includes('Jilbab'), true);
  assert.equal(smaPutriLabels.includes('Cukur'), false);

  assert.equal(formatRupiah(3695000), 'Rp 3.695.000');
  assert.equal(formatRupiah(null), '-');
});

test('computePerUnitRecaps strictly separates TK, SDIT, SMP, and SMA recap metrics and split quotas', () => {
  const customCfg = normalizeFormSchemaConfig({
    RA_TK: { ...DEFAULT_FORM_CONFIG.RA_TK, quota: 50 },
    SDIT: { ...DEFAULT_FORM_CONFIG.SDIT, quota: 80 },
    SMP: { ...DEFAULT_FORM_CONFIG.SMP, quotaPutra: 40, quotaPutri: 45 },
    SMA: { ...DEFAULT_FORM_CONFIG.SMA, quotaPutra: 35, quotaPutri: 35 },
  });

  const records = [
    makeRecord({
      id: 'tk-1',
      unit: 'RA_TK',
      jenisKelamin: 'Laki-laki',
      asalSekolah: '-',
      pengajianDaerah: 'KOTA MADIUN',
      statusVerifikasi: 'Terverifikasi Panitia',
      statusSeleksi: 'Lulus Seleksi',
    }),
    makeRecord({
      id: 'sd-1',
      unit: 'SDIT',
      jenisKelamin: 'Perempuan',
      asalSekolah: 'RA Al Muttaqin',
      pengajianDaerah: 'KAB. MADIUN',
      statusVerifikasi: 'Menunggu Verifikasi Berkas',
      statusSeleksi: 'Dalam Proses Seleksi',
    }),
    makeRecord({
      id: 'smp-1',
      unit: 'SMP',
      jenisKelamin: 'Laki-laki',
      asalSekolah: 'SDIT Al Muttaqin',
      pengajianDaerah: 'KOTA MADIUN',
      statusVerifikasi: 'Terverifikasi Panitia',
      statusSeleksi: 'Lulus Seleksi',
    }),
    makeRecord({
      id: 'smp-2',
      unit: 'SMP',
      jenisKelamin: 'Perempuan',
      asalSekolah: 'SDN 1 Taman',
      pengajianDaerah: 'PONOROGO',
      statusVerifikasi: 'Menunggu Verifikasi Berkas',
      statusSeleksi: 'Cadangan',
    }),
    makeRecord({
      id: 'sma-1',
      unit: 'SMA',
      jenisKelamin: 'Perempuan',
      asalSekolah: 'SMP Muttaqin Josenan',
      pengajianDaerah: 'KOTA MADIUN',
      statusVerifikasi: 'Terverifikasi Panitia',
      statusSeleksi: 'Lulus Seleksi',
    }),
  ];

  const recaps = computePerUnitRecaps(records, customCfg);

  // TK isolated
  assert.equal(recaps.RA_TK.totalCount, 1);
  assert.equal(recaps.RA_TK.quota, 50);
  assert.equal(recaps.RA_TK.remaining, 49);
  assert.equal(recaps.RA_TK.quotaPutra, undefined);
  assert.equal(recaps.RA_TK.pengajian.kotaMadiun, 1);
  assert.equal(recaps.RA_TK.alumni.totalAlumni, 0);
  assert.equal(recaps.RA_TK.verifiedCount, 1);
  assert.equal(recaps.RA_TK.selectionStats.lulus, 1);

  // SDIT isolated
  assert.equal(recaps.SDIT.totalCount, 1);
  assert.equal(recaps.SDIT.quota, 80);
  assert.equal(recaps.SDIT.pengajian.kabMadiun, 1);
  assert.equal(recaps.SDIT.alumni.totalAlumni, 1);
  assert.equal(recaps.SDIT.verifiedCount, 0);
  assert.equal(recaps.SDIT.selectionStats.proses, 1);

  // SMP isolated with Putra/Putri split
  assert.equal(recaps.SMP.totalCount, 2);
  assert.equal(recaps.SMP.quota, 85);
  assert.equal(recaps.SMP.quotaPutra, 40);
  assert.equal(recaps.SMP.quotaPutri, 45);
  assert.equal(recaps.SMP.maleCount, 1);
  assert.equal(recaps.SMP.femaleCount, 1);
  assert.equal(recaps.SMP.remainingPutra, 39);
  assert.equal(recaps.SMP.remainingPutri, 44);
  assert.equal(recaps.SMP.pengajian.kotaMadiun, 1);
  assert.equal(recaps.SMP.pengajian.luarMadiun, 1);
  assert.equal(recaps.SMP.alumni.totalAlumni, 1);
  assert.equal(recaps.SMP.alumni.nonAlumni, 1);
  assert.equal(recaps.SMP.selectionStats.lulus, 1);
  assert.equal(recaps.SMP.selectionStats.cadangan, 1);

  // SMA isolated with Putra/Putri split
  assert.equal(recaps.SMA.totalCount, 1);
  assert.equal(recaps.SMA.quota, 70);
  assert.equal(recaps.SMA.maleCount, 0);
  assert.equal(recaps.SMA.femaleCount, 1);
  assert.equal(recaps.SMA.remainingPutra, 35);
  assert.equal(recaps.SMA.remainingPutri, 34);
  assert.equal(recaps.SMA.alumni.totalAlumni, 1);
  assert.equal(recaps.SMA.verifiedCount, 1);
});

test('normalizeProfileGalleryConfig validates URLs, clamps interval, caps slides, and supports clean reordering & wrap-around', () => {
  assert.equal(isValidProfilePhotoUrl('https://example.com/foto.jpg'), true);
  assert.equal(isValidProfilePhotoUrl('/assets/aistudio/LOGO_YAYASAN_MUTTAQIN_NEW_9100fc21.png'), true);
  assert.equal(isValidProfilePhotoUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
  assert.equal(isValidProfilePhotoUrl('javascript:alert(1)'), false);
  assert.equal(isValidProfilePhotoUrl('/assets/../secret.txt'), false);

  const normalized = normalizeProfileGalleryConfig({
    intervalSeconds: 99,
    autoPlay: false,
    slides: [
      { id: 's1', imageUrl: 'https://example.com/1.jpg', caption: '  Gedung   Utama  ', unitLabel: 'Yayasan' },
      { id: 'bad', imageUrl: 'javascript:alert(1)', caption: 'Unsafe' },
      { id: 's1', imageUrl: '/assets/aistudio/LOGO_YAYASAN_MUTTAQIN_NEW_9100fc21.png', caption: 'SMP', unitLabel: 'SMP' },
    ],
  });

  assert.equal(normalized.intervalSeconds, 15);
  assert.equal(normalized.autoPlay, false);
  assert.equal(normalized.slides.length, 2);
  assert.equal(normalized.slides[0].caption, 'Gedung Utama');
  assert.notEqual(normalized.slides[0].id, normalized.slides[1].id);

  // Enforce max slide cap
  const tooMany = normalizeProfileGalleryConfig({
    intervalSeconds: 1,
    slides: Array.from({ length: MAX_PROFILE_PHOTO_SLIDES + 4 }, (_, i) => ({
      id: `item-${i}`,
      imageUrl: `https://example.com/p-${i}.jpg`,
      caption: `Foto ${i + 1}`,
    })),
  });
  assert.equal(tooMany.intervalSeconds, 2);
  assert.equal(tooMany.slides.length, MAX_PROFILE_PHOTO_SLIDES);

  // Reordering and carousel wrap-around
  const reordered = reorderProfileSlides(normalized.slides, 0, 1);
  assert.equal(reordered[0].unitLabel, 'SMP');
  assert.equal(reordered[1].unitLabel, 'Yayasan');

  assert.equal(getNextSlideIndex(0, 3, 1), 1);
  assert.equal(getNextSlideIndex(2, 3, 1), 0);
  assert.equal(getNextSlideIndex(0, 3, -1), 2);
  assert.equal(getNextSlideIndex(0, 1, 1), 0);
});

