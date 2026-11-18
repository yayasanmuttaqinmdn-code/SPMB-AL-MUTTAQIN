import type {
  DashboardStats,
  FormSchemaConfig,
  RegistrationInput,
  RegistrationRecord,
  SelectionStatus,
  SheetsPublicConfig,
  SheetsSyncMode,
  UnitConfig,
  UnitFormConfig,
  UnitId,
  UnitSheetsTarget,
  UnitSpecificData,
  UnitStat,
  ValidationErrors,
} from '../types/spmb.ts';

export const ACADEMIC_YEAR = '2026/2027';

export const INSTITUTION_NAME = 'Yayasan Pondok Pesantren Muttaqin';
export const INSTITUTION_LOCATION = 'Josenan, Kec. Taman, Kota Madiun, Jawa Timur';

export const UNIT_ORDER: UnitId[] = ['RA_TK', 'SDIT', 'SMP', 'SMA'];

export const AGAMA_OPTIONS = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'];
export const GOL_DARAH_OPTIONS = ['Tidak Tahu', 'A', 'B', 'AB', 'O'];
export const PENDIDIKAN_OPTIONS = [
  'Tidak Sekolah',
  'SD sederajat',
  'SMP sederajat',
  'SMA / SMK sederajat',
  'D1 / D2 / D3',
  'S1 / D4',
  'S2 / S3',
];
export const PENGHASILAN_OPTIONS = [
  'Tidak Berpenghasilan',
  '< Rp. 500.000',
  'Rp. 500.000 - Rp.1.000.000',
  'Rp.1.000.000 - Rp.2.000.000',
  'Rp.2.000.000 - Rp.5.000.000',
  '> Rp.5.000.000',
];

export const SELECTION_STATUS_OPTIONS: SelectionStatus[] = [
  'Belum Diseleksi',
  'Dalam Proses Seleksi',
  'Lulus Seleksi',
  'Cadangan',
  'Tidak Lulus',
];

export function normalizeSelectionStatus(raw?: string): SelectionStatus {
  if (raw && SELECTION_STATUS_OPTIONS.includes(raw as SelectionStatus)) {
    return raw as SelectionStatus;
  }
  return 'Belum Diseleksi';
}

export function isValidImageDataUrl(value?: string): boolean {
  if (!value) return false;
  return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value.trim());
}

export const UNIT_CONFIGS: Record<UnitId, UnitConfig> = {
  RA_TK: {
    id: 'RA_TK',
    shortName: 'RA / TK',
    fullName: 'RA / TK Muttaqin Josenan',
    sheetTabName: 'RA_TK',
    codePrefix: 'TK',
    ageRange: 'Usia 4 - 6 Tahun',
    quota: 60,
    tagline: 'Pendidikan anak usia dini berbasis akhlakul karimah dan pembiasaan ibadah harian.',
    requiredDocs: [
      'Fotokopi Akta Kelahiran (2 lembar)',
      'Fotokopi Kartu Keluarga (2 lembar)',
      'Fotokopi KTP Ayah & Ibu',
      'Pas foto berwarna 3x4 (3 lembar)',
      'Kartu Imunisasi / KIA (jika ada)',
    ],
  },
  SDIT: {
    id: 'SDIT',
    shortName: 'SDIT',
    fullName: 'SDIT Muttaqin Josenan',
    sheetTabName: 'SDIT',
    codePrefix: 'SDIT',
    ageRange: 'Usia 6 - 12 Tahun',
    quota: 90,
    tagline: 'Sekolah Dasar Islam Terpadu memadukan kurikulum nasional, tahfidz Juz 30, dan karakter santri.',
    requiredDocs: [
      'Fotokopi Akta Kelahiran (2 lembar)',
      'Fotokopi Kartu Keluarga (2 lembar)',
      'Fotokopi Ijazah / Surat Keterangan TK/RA',
      'Pas foto berwarna 3x4 (4 lembar)',
    ],
  },
  SMP: {
    id: 'SMP',
    shortName: 'SMP',
    fullName: 'SMP Muttaqin Josenan',
    sheetTabName: 'SMP',
    codePrefix: 'SMP',
    ageRange: 'Lulusan SD / MI',
    quota: 120,
    tagline: 'Sekolah Menengah Pertama berbasis pesantren dengan pilihan santri mukim asrama dan non-mukim.',
    requiredDocs: [
      'Fotokopi Akta Kelahiran & Kartu Keluarga (2 lembar)',
      'Fotokopi Rapor SD/MI Kelas 5 & 6',
      'Print-out NISN aktif',
      'Surat Keterangan Sehat & Pas foto 3x4 (4 lembar)',
    ],
  },
  SMA: {
    id: 'SMA',
    shortName: 'SMA',
    fullName: 'SMA Muttaqin Josenan',
    sheetTabName: 'SMA',
    codePrefix: 'SMA',
    ageRange: 'Lulusan SMP / MTs',
    quota: 120,
    tagline: 'Sekolah Menengah Atas unggulan pesantren untuk persiapan studi lanjut, sains, dan tahfidz Al-Quran.',
    requiredDocs: [
      'Fotokopi Akta Kelahiran & Kartu Keluarga (2 lembar)',
      'Fotokopi Rapor SMP/MTs Semester 1 - 5',
      'Print-out NISN aktif & Ijazah/SKL',
      'Sertifikat prestasi/tahfidz (bagi jalur prestasi/tahfidz)',
      'Pas foto berwarna 3x4 (4 lembar)',
    ],
  },
};

export const FOUNDATION_LOGO_PATH = '/assets/aistudio/LOGO_YAYASAN_MUTTAQIN_NEW_9100fc21.png';

export const UNIT_LOGO_PATHS: Record<UnitId, string> = {
  RA_TK: '/assets/aistudio/RA_0becac60.jpg',
  SDIT: '/assets/aistudio/logo_SDIT_ca3a8f36.jpg',
  SMP: '/assets/aistudio/LOGO_SMP_AL_MUTTAQIN_Baru_f14d5e7f.png',
  SMA: '/assets/aistudio/LOGO_SMA_AL_MUTTAQIN_58041682.jpg',
};

export function getUnitLogoPath(unit: UnitId): string {
  return UNIT_LOGO_PATHS[unit] || FOUNDATION_LOGO_PATH;
}

export const DEFAULT_FORM_CONFIG: FormSchemaConfig = {
  RA_TK: {
    unit: 'RA_TK',
    quota: 60,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.RA_TK.requiredDocs],
    fields: [],
  },
  SDIT: {
    unit: 'SDIT',
    quota: 90,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.SDIT.requiredDocs],
    fields: [],
  },
  SMP: {
    unit: 'SMP',
    quota: 120,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.SMP.requiredDocs],
    fields: [],
  },
  SMA: {
    unit: 'SMA',
    quota: 120,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.SMA.requiredDocs],
    fields: [],
  },
};

export const SHEET_HEADERS = [
  'ID Sistem',
  'No. Pendaftaran',
  'Lembaga',
  'Tanggal Daftar',
  'Nama Lengkap',
  'Nama Panggilan',
  'Agama',
  'Tempat Lahir',
  'Tanggal Lahir',
  'Jenis Kelamin',
  'NISN',
  'NIK',
  'No KK',
  'Anak Ke',
  'Jumlah Saudara',
  'Asal Sekolah',
  'Prestasi',
  'Gol Darah',
  'Tinggi (cm)',
  'Berat (kg)',
  'Alergi',
  'Alamat Siswa',
  'Nama Ayah',
  'No HP Ayah',
  'Nama Ibu',
  'No HP Ibu',
  'Info Pengajian (Daerah / Desa / Kelompok)',
  'Status Verifikasi',
  'Rincian Khusus Lembaga',
  'Data JSON Lengkap',
  'Terakhir Diubah',
  'Status Seleksi',
  'Nilai Seleksi',
  'Catatan Seleksi',
];

export function columnIndexToLetter(colCount: number): string {
  let n = Math.max(1, Math.floor(colCount));
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export const SHEET_END_COLUMN = columnIndexToLetter(SHEET_HEADERS.length);

export function composeAddress(parts: {
  jalan?: string;
  rt?: string;
  rw?: string;
  desa?: string;
  kecamatan?: string;
  kota?: string;
  provinsi?: string;
}): string {
  const segs: string[] = [];
  if (parts.jalan?.trim()) segs.push(parts.jalan.trim());
  if (parts.rt?.trim() || parts.rw?.trim()) {
    segs.push(`RT ${parts.rt?.trim() || '-'} / RW ${parts.rw?.trim() || '-'}`);
  }
  if (parts.desa?.trim()) segs.push(`Desa/Kel. ${parts.desa.trim()}`);
  if (parts.kecamatan?.trim()) segs.push(`Kec. ${parts.kecamatan.trim()}`);
  if (parts.kota?.trim()) segs.push(parts.kota.trim());
  if (parts.provinsi?.trim()) segs.push(parts.provinsi.trim());
  return segs.join(', ');
}

export function normalizeRegistrationInput(raw: Partial<RegistrationInput> & { unit: UnitId }): RegistrationInput {
  const alamatJalan = (raw.alamatJalan || raw.alamatLengkap || '').trim();
  const alamatRt = (raw.alamatRt || '').trim();
  const alamatRw = (raw.alamatRw || '').trim();
  const alamatDesa = (raw.alamatDesa || '').trim();
  const alamatKecamatan = (raw.alamatKecamatan || '').trim();
  const alamatKota = (raw.alamatKota || '').trim();
  const alamatProvinsi = (raw.alamatProvinsi || '').trim();

  const composedStudentAddr =
    composeAddress({
      jalan: alamatJalan,
      rt: alamatRt,
      rw: alamatRw,
      desa: alamatDesa,
      kecamatan: alamatKecamatan,
      kota: alamatKota,
      provinsi: alamatProvinsi,
    }) || (raw.alamatLengkap || '').trim();

  const noHpAyah = (raw.noHpAyah || raw.noWhatsapp || '').trim();
  const noHpIbu = (raw.noHpIbu || '').trim();
  const primaryWa = (raw.noWhatsapp || noHpAyah || noHpIbu || '').trim();

  return {
    unit: raw.unit,
    namaLengkap: (raw.namaLengkap || '').trim(),
    namaPanggilan: (raw.namaPanggilan || '').trim(),
    agama: (raw.agama || 'ISLAM').trim(),
    tempatLahir: (raw.tempatLahir || '').trim(),
    tanggalLahir: (raw.tanggalLahir || '').trim(),
    jenisKelamin: raw.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    nisn: (raw.nisn || raw.unitData?.nisn || '').trim(),
    nik: (raw.nik || '').trim(),
    noKk: (raw.noKk || '').trim(),
    anakKe: (raw.anakKe || '1').trim(),
    jumlahSaudara: (raw.jumlahSaudara || '1').trim(),
    pasFotoDataUrl: isValidImageDataUrl(raw.pasFotoDataUrl) ? raw.pasFotoDataUrl!.trim() : '',

    asalSekolah: (
      raw.asalSekolah ??
      raw.unitData?.asalTkRa ??
      raw.unitData?.asalSdMi ??
      raw.unitData?.asalSmpMts ??
      ''
    ).trim(),
    jenisPrestasi: (raw.jenisPrestasi ?? raw.unitData?.prestasiAkademik ?? '').trim(),
    golDarah: (raw.golDarah || 'Tidak Tahu').trim(),
    tinggiBadan: (raw.tinggiBadan || '').trim(),
    beratBadan: (raw.beratBadan || '').trim(),
    alergi: (raw.alergi ?? raw.unitData?.alergiMakanan ?? '').trim(),

    alamatJalan,
    alamatRt,
    alamatRw,
    alamatDesa,
    alamatKecamatan,
    alamatKota,
    alamatProvinsi,
    alamatLengkap: composedStudentAddr,

    namaAyah: (raw.namaAyah || '').trim(),
    tempatLahirAyah: (raw.tempatLahirAyah || '').trim(),
    tanggalLahirAyah: (raw.tanggalLahirAyah || '').trim(),
    nikAyah: (raw.nikAyah || '').trim(),
    statusAyah: raw.statusAyah === 'Sudah Meninggal' ? 'Sudah Meninggal' : 'Masih Hidup',
    pekerjaanAyah: (raw.pekerjaanAyah || '').trim(),
    pendidikanAyah: (raw.pendidikanAyah || 'SMA / SMK sederajat').trim(),
    penghasilanAyah: (raw.penghasilanAyah || 'Rp.1.000.000 - Rp.2.000.000').trim(),
    noHpAyah,
    emailAyah: (raw.emailAyah || '').trim(),

    namaIbu: (raw.namaIbu || '').trim(),
    tempatLahirIbu: (raw.tempatLahirIbu || '').trim(),
    tanggalLahirIbu: (raw.tanggalLahirIbu || '').trim(),
    nikIbu: (raw.nikIbu || '').trim(),
    statusIbu: raw.statusIbu === 'Sudah Meninggal' ? 'Sudah Meninggal' : 'Masih Hidup',
    pekerjaanIbu: (raw.pekerjaanIbu || '').trim(),
    pendidikanIbu: (raw.pendidikanIbu || 'SMA / SMK sederajat').trim(),
    penghasilanIbu: (raw.penghasilanIbu || 'Tidak Berpenghasilan').trim(),
    noHpIbu,
    emailIbu: (raw.emailIbu || '').trim(),

    alamatOrtuJalan: (raw.alamatOrtuJalan ?? alamatJalan).trim(),
    alamatOrtuRt: (raw.alamatOrtuRt ?? alamatRt).trim(),
    alamatOrtuRw: (raw.alamatOrtuRw ?? alamatRw).trim(),
    alamatOrtuDesa: (raw.alamatOrtuDesa ?? alamatDesa).trim(),
    alamatOrtuKecamatan: (raw.alamatOrtuKecamatan ?? alamatKecamatan).trim(),
    alamatOrtuKota: (raw.alamatOrtuKota ?? alamatKota).trim(),
    alamatOrtuProvinsi: (raw.alamatOrtuProvinsi ?? alamatProvinsi).trim(),

    pengajianDaerah: (raw.pengajianDaerah ?? 'KOTA MADIUN').trim(),
    pengajianDesa: (raw.pengajianDesa || '').trim(),
    pengajianKelompok: (raw.pengajianKelompok ?? '').trim(),

    noWhatsapp: primaryWa,
    jalurPendaftaran: raw.jalurPendaftaran || 'Reguler',
    unitData: raw.unitData ? { ...raw.unitData } : {},
  };
}

export function normalizeRegistrationRecord(record: RegistrationRecord): RegistrationRecord {
  const norm = normalizeRegistrationInput(record);
  return {
    ...record,
    ...norm,
    statusVerifikasi:
      record.statusVerifikasi === 'Terverifikasi Panitia'
        ? 'Terverifikasi Panitia'
        : 'Menunggu Verifikasi Berkas',
    statusSeleksi: normalizeSelectionStatus(record.statusSeleksi),
    nilaiSeleksi: (record.nilaiSeleksi || '').trim(),
    catatanSeleksi: (record.catatanSeleksi || '').trim(),
    diseleksiAt: record.diseleksiAt || undefined,
  };
}

export function generateRegistrationNumber(
  unit: UnitId,
  existingRecords: Pick<RegistrationRecord, 'unit' | 'noPendaftaran'>[],
  year = 2026
): string {
  const prefix = UNIT_CONFIGS[unit].codePrefix;
  const pattern = new RegExp(`^SPMB-${year}-${prefix}-(\\d+)$`);
  let maxSeq = 0;

  for (const record of existingRecords) {
    if (record.unit !== unit) continue;
    const match = pattern.exec(record.noPendaftaran);
    if (match) {
      const seq = Number.parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `SPMB-${year}-${prefix}-${nextSeq}`;
}

export function computeUnitStats(
  records: RegistrationRecord[],
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): DashboardStats {
  const byUnit = {} as Record<UnitId, UnitStat>;
  let totalCount = 0;
  let totalQuota = 0;
  let totalSynced = 0;
  let totalPending = 0;

  for (const unit of UNIT_ORDER) {
    const cfg = UNIT_CONFIGS[unit];
    const quota = formConfig[unit]?.quota || cfg.quota;
    const unitRecords = records.filter((r) => r.unit === unit);
    const count = unitRecords.length;
    const syncedCount = unitRecords.filter((r) => r.syncState === 'synced').length;
    const mukimCount = unitRecords.filter(
      (r) => r.unitData?.statusAsrama === 'Santri Mukim (Asrama Pondok)'
    ).length;

    byUnit[unit] = {
      unit,
      shortName: cfg.shortName,
      fullName: cfg.fullName,
      count,
      quota,
      remaining: Math.max(0, quota - count),
      mukimCount,
      syncedCount,
    };

    totalCount += count;
    totalQuota += quota;
    totalSynced += syncedCount;
    totalPending += count - syncedCount;
  }

  return {
    totalCount,
    totalQuota,
    totalSynced,
    totalPending,
    byUnit,
    updatedAt: new Date().toISOString(),
  };
}

export interface SelectionStatsSummary {
  total: number;
  belum: number;
  proses: number;
  lulus: number;
  cadangan: number;
  tidakLulus: number;
}

export function computeSelectionStats(records: RegistrationRecord[]): SelectionStatsSummary {
  let belum = 0;
  let proses = 0;
  let lulus = 0;
  let cadangan = 0;
  let tidakLulus = 0;

  for (const r of records) {
    const status = normalizeSelectionStatus(r.statusSeleksi);
    if (status === 'Lulus Seleksi') lulus += 1;
    else if (status === 'Dalam Proses Seleksi') proses += 1;
    else if (status === 'Cadangan') cadangan += 1;
    else if (status === 'Tidak Lulus') tidakLulus += 1;
    else belum += 1;
  }

  return {
    total: records.length,
    belum,
    proses,
    lulus,
    cadangan,
    tidakLulus,
  };
}

export function normalizeWhatsapp(phone: string): string {
  return phone.replace(/[^\d+]/g, '').trim();
}

export function validateRegistrationInput(
  input: RegistrationInput,
  unitConfig?: UnitFormConfig,
  options?: { requirePhoto?: boolean }
): ValidationErrors {
  const errors: ValidationErrors = {};
  const requirePhoto = options?.requirePhoto ?? true;

  if (!input.namaLengkap.trim() || input.namaLengkap.trim().length < 2) {
    errors.namaLengkap = 'Nama lengkap calon murid wajib diisi minimal 2 huruf.';
  }

  if (!input.namaPanggilan.trim()) {
    errors.namaPanggilan = 'Nama panggilan wajib diisi.';
  }

  if (!input.agama.trim()) {
    errors.agama = 'Agama wajib dipilih.';
  }

  if (!input.tempatLahir.trim()) {
    errors.tempatLahir = 'Tempat lahir wajib diisi.';
  }

  if (!input.tanggalLahir.trim()) {
    errors.tanggalLahir = 'Tanggal lahir wajib diisi.';
  }

  if (!input.jenisKelamin.trim()) {
    errors.jenisKelamin = 'Jenis kelamin wajib dipilih.';
  }

  const cleanNisn = input.nisn.replace(/\s+/g, '');
  if (input.unit === 'RA_TK') {
    if (cleanNisn && !/^\d{10}$/.test(cleanNisn)) {
      errors.nisn = 'NISN harus terdiri dari 10 digit angka.';
    }
  } else if (!/^\d{10}$/.test(cleanNisn)) {
    errors.nisn = 'NISN wajib diisi tepat 10 digit angka.';
  }

  const cleanNik = input.nik.replace(/\s+/g, '');
  if (!/^\d{16}$/.test(cleanNik)) {
    errors.nik = 'NIK wajib diisi tepat 16 digit angka.';
  }

  const cleanKk = input.noKk.replace(/\s+/g, '');
  if (!/^\d{16}$/.test(cleanKk)) {
    errors.noKk = 'No. KK wajib diisi tepat 16 digit angka.';
  }

  if (!input.anakKe.trim() || Number.isNaN(Number(input.anakKe)) || Number(input.anakKe) < 1) {
    errors.anakKe = 'Anak ke- wajib diisi angka minimal 1.';
  }

  if (
    !input.jumlahSaudara.trim() ||
    Number.isNaN(Number(input.jumlahSaudara)) ||
    Number(input.jumlahSaudara) < 0
  ) {
    errors.jumlahSaudara = 'Jumlah saudara kandung wajib diisi angka.';
  }

  if (!input.jalurPendaftaran.trim()) {
    errors.jalurPendaftaran = 'Jalur pendaftaran wajib dipilih.';
  }

  if (requirePhoto && !isValidImageDataUrl(input.pasFotoDataUrl)) {
    errors.pasFotoDataUrl = 'Pas foto 3x4 calon murid wajib diunggah (format JPG, PNG, atau WebP).';
  }

  // Riwayat Siswa
  if (!input.asalSekolah.trim()) {
    errors.asalSekolah = 'Asal sekolah wajib diisi (tulis "-" jika belum sekolah).';
  }

  if (!input.jenisPrestasi.trim()) {
    errors.jenisPrestasi = 'Jenis prestasi wajib diisi (tulis "-" jika belum ada).';
  }

  if (!input.golDarah.trim()) {
    errors.golDarah = 'Golongan darah wajib dipilih.';
  }

  if (
    !input.tinggiBadan.trim() ||
    Number.isNaN(Number(input.tinggiBadan)) ||
    Number(input.tinggiBadan) <= 0
  ) {
    errors.tinggiBadan = 'Tinggi badan (cm) wajib diisi angka.';
  }

  if (
    !input.beratBadan.trim() ||
    Number.isNaN(Number(input.beratBadan)) ||
    Number(input.beratBadan) <= 0
  ) {
    errors.beratBadan = 'Berat badan (kg) wajib diisi angka.';
  }

  if (!input.alergi.trim()) {
    errors.alergi = 'Alergi wajib diisi (tulis "-" jika tidak ada).';
  }

  // Alamat Lengkap Siswa
  if (!input.alamatJalan.trim()) {
    errors.alamatJalan = 'Jalan / dusun / perumahan wajib diisi.';
  }

  if (!input.alamatRt.trim()) {
    errors.alamatRt = 'RT siswa wajib diisi.';
  }

  if (!input.alamatRw.trim()) {
    errors.alamatRw = 'RW siswa wajib diisi.';
  }

  if (!input.alamatDesa.trim()) {
    errors.alamatDesa = 'Desa/Kelurahan wajib diisi.';
  }

  if (!input.alamatKecamatan.trim()) {
    errors.alamatKecamatan = 'Kecamatan wajib diisi.';
  }

  if (!input.alamatKota.trim()) {
    errors.alamatKota = 'Kota/Kabupaten wajib diisi.';
  }

  if (!input.alamatProvinsi.trim()) {
    errors.alamatProvinsi = 'Provinsi wajib diisi.';
  }

  // Data Ayah / Wali
  if (!input.namaAyah.trim()) {
    errors.namaAyah = 'Nama Ayah / Wali wajib diisi.';
  }

  if (!input.tempatLahirAyah.trim()) {
    errors.tempatLahirAyah = 'Tempat lahir ayah wajib diisi.';
  }

  if (!input.tanggalLahirAyah.trim()) {
    errors.tanggalLahirAyah = 'Tanggal lahir ayah wajib diisi.';
  }

  if (!/^\d{16}$/.test(input.nikAyah.replace(/\s+/g, ''))) {
    errors.nikAyah = 'NIK Ayah wajib diisi tepat 16 digit angka.';
  }

  if (!input.statusAyah.trim()) {
    errors.statusAyah = 'Status ayah wajib dipilih.';
  }

  if (!input.pekerjaanAyah.trim()) {
    errors.pekerjaanAyah = 'Pekerjaan ayah wajib diisi.';
  }

  if (!input.pendidikanAyah.trim()) {
    errors.pendidikanAyah = 'Pendidikan terakhir ayah wajib dipilih.';
  }

  if (!input.penghasilanAyah.trim()) {
    errors.penghasilanAyah = 'Penghasilan ayah wajib dipilih.';
  }

  const cleanHpAyah = normalizeWhatsapp(input.noHpAyah);
  if (!/^(\+?62|0)8\d{7,12}$/.test(cleanHpAyah)) {
    errors.noHpAyah = 'No. HP / WhatsApp ayah wajib diisi dengan nomor aktif yang valid.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailAyah.trim())) {
    errors.emailAyah = 'Alamat email ayah wajib diisi dengan format yang valid.';
  }

  // Data Ibu / Wali
  if (!input.namaIbu.trim()) {
    errors.namaIbu = 'Nama Ibu / Wali wajib diisi.';
  }

  if (!input.tempatLahirIbu.trim()) {
    errors.tempatLahirIbu = 'Tempat lahir ibu wajib diisi.';
  }

  if (!input.tanggalLahirIbu.trim()) {
    errors.tanggalLahirIbu = 'Tanggal lahir ibu wajib diisi.';
  }

  if (!/^\d{16}$/.test(input.nikIbu.replace(/\s+/g, ''))) {
    errors.nikIbu = 'NIK Ibu wajib diisi tepat 16 digit angka.';
  }

  if (!input.statusIbu.trim()) {
    errors.statusIbu = 'Status ibu wajib dipilih.';
  }

  if (!input.pekerjaanIbu.trim()) {
    errors.pekerjaanIbu = 'Pekerjaan ibu wajib diisi.';
  }

  if (!input.pendidikanIbu.trim()) {
    errors.pendidikanIbu = 'Pendidikan terakhir ibu wajib dipilih.';
  }

  if (!input.penghasilanIbu.trim()) {
    errors.penghasilanIbu = 'Penghasilan ibu wajib dipilih.';
  }

  const cleanHpIbu = normalizeWhatsapp(input.noHpIbu);
  if (!/^(\+?62|0)8\d{7,12}$/.test(cleanHpIbu)) {
    errors.noHpIbu = 'No. HP ibu wajib diisi dengan nomor aktif yang valid.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailIbu.trim())) {
    errors.emailIbu = 'Alamat email ibu wajib diisi dengan format yang valid.';
  }

  // Alamat Lengkap Orang Tua / Wali
  if (!input.alamatOrtuJalan.trim()) {
    errors.alamatOrtuJalan = 'Jalan alamat orang tua/wali wajib diisi.';
  }

  if (!input.alamatOrtuRt.trim()) {
    errors.alamatOrtuRt = 'RT alamat orang tua/wali wajib diisi.';
  }

  if (!input.alamatOrtuRw.trim()) {
    errors.alamatOrtuRw = 'RW alamat orang tua/wali wajib diisi.';
  }

  if (!input.alamatOrtuDesa.trim()) {
    errors.alamatOrtuDesa = 'Desa/Kelurahan alamat orang tua/wali wajib diisi.';
  }

  if (!input.alamatOrtuKecamatan.trim()) {
    errors.alamatOrtuKecamatan = 'Kecamatan alamat orang tua/wali wajib diisi.';
  }

  if (!input.alamatOrtuKota.trim()) {
    errors.alamatOrtuKota = 'Kota/Kabupaten alamat orang tua/wali wajib diisi.';
  }

  if (!input.alamatOrtuProvinsi.trim()) {
    errors.alamatOrtuProvinsi = 'Provinsi alamat orang tua/wali wajib diisi.';
  }

  // Info Pengajian
  if (!input.pengajianDaerah.trim()) {
    errors.pengajianDaerah = 'Daerah pengajian wajib diisi.';
  }

  if (!input.pengajianDesa.trim()) {
    errors.pengajianDesa = 'Desa pengajian wajib diisi.';
  }

  if (!input.pengajianKelompok.trim()) {
    errors.pengajianKelompok = 'Kelompok pengajian wajib diisi (tulis "-" jika belum ada).';
  }

  const activeConfig = unitConfig || DEFAULT_FORM_CONFIG[input.unit];
  const ud = input.unitData || {};

  for (const field of activeConfig.fields) {
    const rawVal = (ud[field.id] || '').trim();
    if (field.required && !rawVal) {
      errors[`unitData.${field.id}`] = `${field.label} wajib diisi.`;
      continue;
    }
    if (rawVal && field.exactDigits) {
      const digits = rawVal.replace(/\D/g, '');
      if (digits.length !== field.exactDigits) {
        errors[`unitData.${field.id}`] = `${field.label} harus terdiri dari ${field.exactDigits} digit angka.`;
      }
    }
  }

  return errors;
}

export function getUnitDisplayPairs(
  unit: UnitId,
  unitData: UnitSpecificData,
  unitConfig?: UnitFormConfig
): Array<{ label: string; value: string }> {
  const activeConfig = unitConfig || DEFAULT_FORM_CONFIG[unit];
  const pairs: Array<{ label: string; value: string }> = [];
  const seenIds = new Set<string>();

  for (const field of activeConfig.fields) {
    seenIds.add(field.id);
    pairs.push({
      label: field.label,
      value: (unitData?.[field.id] || '').trim() || '-',
    });
  }

  for (const [key, val] of Object.entries(unitData || {})) {
    if (!seenIds.has(key) && val && val.trim()) {
      pairs.push({
        label: key,
        value: val.trim(),
      });
    }
  }

  return pairs;
}

export function formatUnitSpecificSummary(
  unit: UnitId,
  unitData: UnitSpecificData,
  unitConfig?: UnitFormConfig
): string {
  return getUnitDisplayPairs(unit, unitData, unitConfig)
    .filter((p) => p.value !== '-')
    .map((p) => `${p.label}: ${p.value}`)
    .join(' | ');
}

export function registrationToSheetRow(
  record: RegistrationRecord,
  unitConfig?: UnitFormConfig
): string[] {
  const r = normalizeRegistrationRecord(record);
  const rawPhoto =
    r.pasFotoDataUrl && r.pasFotoDataUrl.length <= 42000 ? r.pasFotoDataUrl : '';
  const fullPayload = {
    ...r,
    id: undefined,
    noPendaftaran: undefined,
    pasFotoDataUrl: rawPhoto,
  };
  let serializedPayload = JSON.stringify(fullPayload);
  if (serializedPayload.length > 48000) {
    serializedPayload = JSON.stringify({ ...fullPayload, pasFotoDataUrl: '' });
  }

  return [
    r.id,
    r.noPendaftaran,
    UNIT_CONFIGS[r.unit].shortName,
    r.createdAt,
    r.namaLengkap,
    r.namaPanggilan || '-',
    r.agama || 'ISLAM',
    r.tempatLahir,
    r.tanggalLahir,
    r.jenisKelamin,
    r.nisn || '-',
    r.nik,
    r.noKk || '-',
    r.anakKe,
    r.jumlahSaudara || '-',
    r.asalSekolah || '-',
    r.jenisPrestasi || '-',
    r.golDarah || 'Tidak Tahu',
    r.tinggiBadan || '-',
    r.beratBadan || '-',
    r.alergi || '-',
    r.alamatLengkap,
    r.namaAyah,
    r.noHpAyah || r.noWhatsapp,
    r.namaIbu,
    r.noHpIbu || '-',
    `${r.pengajianDaerah || '-'} / ${r.pengajianDesa || '-'} / ${r.pengajianKelompok || '-'}`,
    r.statusVerifikasi,
    formatUnitSpecificSummary(r.unit, r.unitData, unitConfig),
    serializedPayload,
    r.updatedAt,
    r.statusSeleksi,
    r.nilaiSeleksi || '',
    r.catatanSeleksi || '',
  ];
}

export function sheetRowToRegistration(row: string[], fallbackUnit: UnitId): RegistrationRecord | null {
  if (!row || row.length < 5) return null;
  const id = (row[0] || '').trim();
  const noPendaftaran = (row[1] || '').trim();
  const namaLengkap = (row[4] || '').trim();

  if (!id || !noPendaftaran || !namaLengkap) {
    return null;
  }

  let parsedPayload: Partial<RegistrationRecord> = {};
  const rawJson = row[29] || row[19];
  if (rawJson && rawJson.trim().startsWith('{')) {
    try {
      parsedPayload = JSON.parse(rawJson) as Partial<RegistrationRecord>;
    } catch {
      parsedPayload = {};
    }
  }

  const pengajianCellParts = (row[26] || '')
    .split('/')
    .map((s) => s.trim())
    .map((s) => (s === '-' ? '' : s));

  const base = normalizeRegistrationInput({
    unit: fallbackUnit,
    ...parsedPayload,
    namaLengkap,
    namaPanggilan: parsedPayload.namaPanggilan || (row[5] === '-' ? '' : row[5]) || '',
    agama: parsedPayload.agama || row[6] || 'ISLAM',
    tempatLahir: parsedPayload.tempatLahir || row[7] || '',
    tanggalLahir: parsedPayload.tanggalLahir || row[8] || '',
    jenisKelamin: (parsedPayload.jenisKelamin || row[9]) === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    nisn: parsedPayload.nisn || (row[10] === '-' ? '' : row[10]) || '',
    nik: parsedPayload.nik || row[11] || '',
    noKk: parsedPayload.noKk || (row[12] === '-' ? '' : row[12]) || '',
    anakKe: parsedPayload.anakKe || row[13] || '1',
    jumlahSaudara: parsedPayload.jumlahSaudara || (row[14] === '-' ? '' : row[14]) || '1',
    asalSekolah: parsedPayload.asalSekolah || row[15] || '-',
    jenisPrestasi: parsedPayload.jenisPrestasi || row[16] || '-',
    golDarah: parsedPayload.golDarah || row[17] || 'Tidak Tahu',
    tinggiBadan: parsedPayload.tinggiBadan || (row[18] === '-' ? '' : row[18]) || '',
    beratBadan: parsedPayload.beratBadan || (row[19] === '-' ? '' : row[19]) || '',
    alergi: parsedPayload.alergi || row[20] || '-',
    alamatLengkap: parsedPayload.alamatLengkap || row[21] || '',
    namaAyah: parsedPayload.namaAyah || row[22] || '',
    noHpAyah: parsedPayload.noHpAyah || row[23] || '',
    namaIbu: parsedPayload.namaIbu || row[24] || '',
    noHpIbu: parsedPayload.noHpIbu || (row[25] === '-' ? '' : row[25]) || '',
    pengajianDaerah: parsedPayload.pengajianDaerah || pengajianCellParts[0] || 'KOTA MADIUN',
    pengajianDesa: parsedPayload.pengajianDesa || pengajianCellParts[1] || '',
    pengajianKelompok: parsedPayload.pengajianKelompok || pengajianCellParts[2] || '',
  });

  const rawVerif = (row[27] || '').trim();
  const statusVerifikasi =
    rawVerif === 'Terverifikasi Panitia' ? 'Terverifikasi Panitia' : 'Menunggu Verifikasi Berkas';

  const statusSeleksi = normalizeSelectionStatus((row[31] || parsedPayload.statusSeleksi || '').trim());

  return {
    ...base,
    id,
    noPendaftaran,
    createdAt: row[3] || parsedPayload.createdAt || new Date().toISOString(),
    updatedAt: row[30] || parsedPayload.updatedAt || row[3] || new Date().toISOString(),
    statusVerifikasi,
    statusSeleksi,
    nilaiSeleksi: (row[32] ?? parsedPayload.nilaiSeleksi ?? '').trim(),
    catatanSeleksi: (row[33] ?? parsedPayload.catatanSeleksi ?? '').trim(),
    diseleksiAt: parsedPayload.diseleksiAt,
    syncState: 'synced',
  };
}

export function createEmptyRegistrationInput(
  unit: UnitId,
  unitConfig?: UnitFormConfig
): RegistrationInput {
  const activeConfig = unitConfig || DEFAULT_FORM_CONFIG[unit];
  const defaultUnitData: UnitSpecificData = {};

  for (const field of activeConfig.fields) {
    if (field.type === 'select' && field.options && field.options.length > 0) {
      defaultUnitData[field.id] = field.options[0];
    } else {
      defaultUnitData[field.id] = '';
    }
  }

  return {
    unit,
    namaLengkap: '',
    namaPanggilan: '',
    agama: 'ISLAM',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-laki',
    nisn: '',
    nik: '',
    noKk: '',
    anakKe: '1',
    jumlahSaudara: '1',
    pasFotoDataUrl: '',

    asalSekolah: '',
    jenisPrestasi: '',
    golDarah: 'Tidak Tahu',
    tinggiBadan: '',
    beratBadan: '',
    alergi: '',

    alamatJalan: '',
    alamatRt: '',
    alamatRw: '',
    alamatDesa: '',
    alamatKecamatan: '',
    alamatKota: 'KOTA MADIUN',
    alamatProvinsi: 'JAWA TIMUR',
    alamatLengkap: '',

    namaAyah: '',
    tempatLahirAyah: '',
    tanggalLahirAyah: '',
    nikAyah: '',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: '',
    pendidikanAyah: 'SMA / SMK sederajat',
    penghasilanAyah: 'Rp.1.000.000 - Rp.2.000.000',
    noHpAyah: '',
    emailAyah: '',

    namaIbu: '',
    tempatLahirIbu: '',
    tanggalLahirIbu: '',
    nikIbu: '',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: '',
    pendidikanIbu: 'SMA / SMK sederajat',
    penghasilanIbu: 'Tidak Berpenghasilan',
    noHpIbu: '',
    emailIbu: '',

    alamatOrtuJalan: '',
    alamatOrtuRt: '',
    alamatOrtuRw: '',
    alamatOrtuDesa: '',
    alamatOrtuKecamatan: '',
    alamatOrtuKota: 'KOTA MADIUN',
    alamatOrtuProvinsi: 'JAWA TIMUR',

    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: '',
    pengajianKelompok: '',

    noWhatsapp: '',
    jalurPendaftaran: 'Reguler',
    unitData: defaultUnitData,
  };
}

function normalizeStudentNameQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function findRegistrationsByName(
  registrations: RegistrationRecord[],
  namaLengkap: string
): RegistrationRecord[] {
  const cleanQuery = normalizeStudentNameQuery(namaLengkap);
  if (cleanQuery.length < 3) return [];

  const sorted = [...registrations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const exactMatches = sorted.filter(
    (r) => normalizeStudentNameQuery(r.namaLengkap || '') === cleanQuery
  );
  if (exactMatches.length > 0) return exactMatches;

  return sorted.filter((r) =>
    normalizeStudentNameQuery(r.namaLengkap || '').includes(cleanQuery)
  );
}

export function findOwnRegistration(
  registrations: RegistrationRecord[],
  namaLengkap: string
): RegistrationRecord | null {
  return findRegistrationsByName(registrations, namaLengkap)[0] || null;
}

export function searchRegistrationsForStatus(
  registrations: RegistrationRecord[],
  rawQuery: string
): RegistrationRecord[] {
  const cleanQuery = normalizeStudentNameQuery(rawQuery || '');
  if (cleanQuery.length < 3) return [];

  const sorted = [...registrations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  // 1. Exact Registration Number match (e.g. SPMB-2026-TK-0001)
  const exactRegMatches = sorted.filter(
    (r) => (r.noPendaftaran || '').trim().toLowerCase() === cleanQuery
  );
  if (exactRegMatches.length > 0) return exactRegMatches;

  // 2. Exact NIK match (digits only, minimum 8 digits to avoid short numeric false positives)
  const digitsOnly = cleanQuery.replace(/\D+/g, '');
  if (digitsOnly.length >= 8 && digitsOnly === cleanQuery.replace(/[\s-]+/g, '')) {
    const nikMatches = sorted.filter(
      (r) => (r.nik || '').replace(/\D+/g, '') === digitsOnly
    );
    if (nikMatches.length > 0) return nikMatches;
  }

  // 3. Partial Registration Number match when prefix looks like a registration number
  if (cleanQuery.startsWith('spmb')) {
    const partialRegMatches = sorted.filter((r) =>
      (r.noPendaftaran || '').trim().toLowerCase().includes(cleanQuery)
    );
    if (partialRegMatches.length > 0) return partialRegMatches;
  }

  // 4. Child Full Name match (exact then partial)
  return findRegistrationsByName(sorted, cleanQuery);
}

export interface RegistrationStatusStep {
  key: 'registered' | 'verification' | 'selection';
  title: string;
  subtitle: string;
  state: 'done' | 'current' | 'rejected' | 'waiting';
}

export interface RegistrationStatusSummary {
  tone: 'emerald' | 'amber' | 'rose' | 'blue' | 'neutral';
  badgeLabel: string;
  headline: string;
  guidance: string;
  isVerified: boolean;
  steps: RegistrationStatusStep[];
}

export function buildRegistrationStatusSummary(
  record: RegistrationRecord
): RegistrationStatusSummary {
  const normalized = normalizeRegistrationRecord(record);
  const unitCfg = UNIT_CONFIGS[normalized.unit];
  const isVerified = normalized.statusVerifikasi === 'Terverifikasi Panitia';
  const selectionStatus = normalized.statusSeleksi || 'Belum Diseleksi';

  const stepRegistered: RegistrationStatusStep = {
    key: 'registered',
    title: 'Pendaftaran Tercatat',
    subtitle: `${normalized.noPendaftaran} · ${unitCfg.shortName}`,
    state: 'done',
  };

  const stepVerification: RegistrationStatusStep = {
    key: 'verification',
    title: 'Verifikasi Berkas Panitia',
    subtitle: isVerified
      ? 'Berkas pendaftar telah diverifikasi panitia'
      : 'Panitia sedang memeriksa kelengkapan berkas pendaftaran',
    state: isVerified ? 'done' : 'current',
  };

  let stepSelectionState: RegistrationStatusStep['state'] = isVerified ? 'current' : 'waiting';
  let tone: RegistrationStatusSummary['tone'] = isVerified ? 'blue' : 'neutral';
  let badgeLabel: string = selectionStatus;
  let headline = isVerified
    ? 'Berkas Terverifikasi · Menunggu Proses Seleksi'
    : 'Pendaftaran Terdaftar · Menunggu Verifikasi Berkas';
  let guidance = isVerified
    ? `Berkas atas nama ${normalized.namaLengkap} sudah terverifikasi panitia. Pantau halaman ini secara berkala untuk melihat jadwal/hasil seleksi.`
    : `Data pendaftaran ${normalized.namaLengkap} telah tersimpan di sistem ${unitCfg.fullName}. Panitia akan memverifikasi berkas pendaftaran Anda.`;

  if (selectionStatus === 'Lulus Seleksi') {
    stepSelectionState = 'done';
    tone = 'emerald';
    badgeLabel = 'Lulus Seleksi';
    headline = `Selamat! Ananda ${normalized.namaLengkap} Dinyatakan Lulus Seleksi`;
    guidance = `Silakan unduh Bukti Pendaftaran PDF dan lanjutkan proses daftar ulang ke sekretariat ${unitCfg.fullName} dengan membawa berkas persyaratan asli/fotokopi.`;
  } else if (selectionStatus === 'Cadangan') {
    stepSelectionState = 'current';
    tone = 'amber';
    badgeLabel = 'Cadangan';
    headline = `Ananda ${normalized.namaLengkap} Masuk Daftar Cadangan`;
    guidance = `Panitia akan menghubungi nomor WhatsApp wali (${normalized.noWhatsapp || normalized.noHpAyah || normalized.noHpIbu || '-'}) apabila terdapat kuota daftar ulang yang tersedia.`;
  } else if (selectionStatus === 'Tidak Lulus') {
    stepSelectionState = 'rejected';
    tone = 'rose';
    badgeLabel = 'Tidak Lulus';
    headline = `Hasil Seleksi: Belum Lolos pada Gelombang Ini`;
    guidance = `Terima kasih telah mendaftar di ${unitCfg.fullName}. Silakan hubungi panitia SPMB untuk informasi jalur atau gelombang pendaftaran berikutnya.`;
  } else if (selectionStatus === 'Dalam Proses Seleksi') {
    stepSelectionState = 'current';
    tone = 'blue';
    badgeLabel = 'Dalam Proses Seleksi';
    headline = 'Sedang Dalam Tahap Penilaian / Wawancara Panitia';
    guidance = `Panitia seleksi ${unitCfg.shortName} sedang memproses penilaian calon murid baru. Hasil kelulusan akan langsung diperbarui di halaman ini.`;
  }

  const stepSelection: RegistrationStatusStep = {
    key: 'selection',
    title: 'Hasil Seleksi Panitia',
    subtitle:
      selectionStatus === 'Belum Diseleksi'
        ? 'Menunggu keputusan panitia seleksi'
        : selectionStatus,
    state: stepSelectionState,
  };

  return {
    tone,
    badgeLabel,
    headline,
    guidance,
    isVerified,
    steps: [stepRegistered, stepVerification, stepSelection],
  };
}

export type MadiunPengajianRegion = 'KOTA_MADIUN' | 'KAB_MADIUN' | 'LUAR_MADIUN';

export type AlumniCategory =
  | 'RA_AL_MUTTAQIN'
  | 'SDIT_AL_MUTTAQIN'
  | 'SMP_WUSTHA_AL_MUTTAQIN'
  | 'NON_ALUMNI';

export function classifyPengajianRegion(daerah?: string): MadiunPengajianRegion {
  const normalized = (daerah || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return 'LUAR_MADIUN';
  if (normalized.includes('kota madiun') || normalized === 'madiun kota') {
    return 'KOTA_MADIUN';
  }
  if (normalized.includes('madiun')) {
    return 'KAB_MADIUN';
  }
  return 'LUAR_MADIUN';
}

export function classifyAlumniOrigin(asalSekolah?: string): AlumniCategory {
  const normalized = (asalSekolah || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!normalized) return 'NON_ALUMNI';

  const isMuttaqin =
    /\bmuttaqin\b/.test(normalized) ||
    normalized.includes('al muttaqin') ||
    normalized.includes('almuttaqin');
  if (!isMuttaqin) return 'NON_ALUMNI';

  if (/\b(smp|smpit|wustha|wustho|wusto|mts|tsanawiyah)\b/.test(normalized)) {
    return 'SMP_WUSTHA_AL_MUTTAQIN';
  }
  if (/\b(sdit|sd|mi|ibtidaiyah)\b/.test(normalized)) {
    return 'SDIT_AL_MUTTAQIN';
  }
  if (/\b(ra|tk|paud|kb|ba|bustanul|raudhatul)\b/.test(normalized)) {
    return 'RA_AL_MUTTAQIN';
  }
  return 'NON_ALUMNI';
}

export interface UnitGenderStat {
  unit: UnitId;
  shortName: string;
  fullName: string;
  maleCount: number;
  femaleCount: number;
  totalCount: number;
  malePct: number;
  femalePct: number;
}

export interface PengajianGroupStat {
  key: string;
  region: MadiunPengajianRegion;
  daerah: string;
  desa: string;
  kelompok: string;
  totalCount: number;
  byUnit: Record<UnitId, number>;
}

export interface PengajianDesaStat {
  key: string;
  region: MadiunPengajianRegion;
  daerah: string;
  desa: string;
  kelompokCount: number;
  totalCount: number;
  byUnit: Record<UnitId, number>;
}

export interface AlumniRecordItem {
  record: RegistrationRecord;
  category: Exclude<AlumniCategory, 'NON_ALUMNI'>;
}

export interface AdminAnalyticsSummary {
  totalCount: number;
  totalMale: number;
  totalFemale: number;
  genderByUnit: UnitGenderStat[];
  pengajianSummary: {
    kotaMadiun: number;
    kabMadiun: number;
    madiunCombined: number;
    luarMadiun: number;
    kotaMadiunByUnit: Record<UnitId, number>;
    kabMadiunByUnit: Record<UnitId, number>;
    madiunByUnit: Record<UnitId, number>;
  };
  pengajianGroups: PengajianGroupStat[];
  madiunDesaSummary: PengajianDesaStat[];
  alumniSummary: {
    raAlMuttaqin: number;
    sditAlMuttaqin: number;
    smpWusthaAlMuttaqin: number;
    totalAlumni: number;
    nonAlumni: number;
    byCategoryAndTargetUnit: Record<
      Exclude<AlumniCategory, 'NON_ALUMNI'>,
      Record<UnitId, number>
    >;
    alumniRecords: AlumniRecordItem[];
  };
}

function createEmptyUnitCountMap(): Record<UnitId, number> {
  return { RA_TK: 0, SDIT: 0, SMP: 0, SMA: 0 };
}

export function computeAdminAnalytics(
  records: RegistrationRecord[]
): AdminAnalyticsSummary {
  let totalMale = 0;
  let totalFemale = 0;

  const genderByUnit: UnitGenderStat[] = UNIT_ORDER.map((unit) => {
    const cfg = UNIT_CONFIGS[unit];
    const unitRecords = records.filter((r) => r.unit === unit);
    const maleCount = unitRecords.filter((r) => r.jenisKelamin !== 'Perempuan').length;
    const femaleCount = unitRecords.filter((r) => r.jenisKelamin === 'Perempuan').length;
    const totalCount = unitRecords.length;
    totalMale += maleCount;
    totalFemale += femaleCount;

    return {
      unit,
      shortName: cfg.shortName,
      fullName: cfg.fullName,
      maleCount,
      femaleCount,
      totalCount,
      malePct: totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0,
      femalePct: totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0,
    };
  });

  let kotaMadiun = 0;
  let kabMadiun = 0;
  let luarMadiun = 0;
  const kotaMadiunByUnit = createEmptyUnitCountMap();
  const kabMadiunByUnit = createEmptyUnitCountMap();
  const madiunByUnit = createEmptyUnitCountMap();

  const groupMap = new Map<string, PengajianGroupStat>();
  const desaMap = new Map<
    string,
    {
      region: MadiunPengajianRegion;
      daerah: string;
      desa: string;
      kelompokSet: Set<string>;
      totalCount: number;
      byUnit: Record<UnitId, number>;
    }
  >();

  let raAlMuttaqin = 0;
  let sditAlMuttaqin = 0;
  let smpWusthaAlMuttaqin = 0;
  let nonAlumni = 0;

  const byCategoryAndTargetUnit: Record<
    Exclude<AlumniCategory, 'NON_ALUMNI'>,
    Record<UnitId, number>
  > = {
    RA_AL_MUTTAQIN: createEmptyUnitCountMap(),
    SDIT_AL_MUTTAQIN: createEmptyUnitCountMap(),
    SMP_WUSTHA_AL_MUTTAQIN: createEmptyUnitCountMap(),
  };

  const alumniRecords: AlumniRecordItem[] = [];

  for (const record of records) {
    const daerahDisplay = (record.pengajianDaerah || '').trim().toUpperCase() || '-';
    const desaDisplay = (record.pengajianDesa || '').trim().toUpperCase() || '-';
    const kelompokDisplay = (record.pengajianKelompok || '').trim() || '-';
    const region = classifyPengajianRegion(daerahDisplay);

    if (region === 'KOTA_MADIUN') {
      kotaMadiun += 1;
      kotaMadiunByUnit[record.unit] += 1;
      madiunByUnit[record.unit] += 1;
    } else if (region === 'KAB_MADIUN') {
      kabMadiun += 1;
      kabMadiunByUnit[record.unit] += 1;
      madiunByUnit[record.unit] += 1;
    } else {
      luarMadiun += 1;
    }

    const groupKey = `${region}__${daerahDisplay}__${desaDisplay}__${kelompokDisplay.toLowerCase()}`;
    const existingGroup = groupMap.get(groupKey);
    if (existingGroup) {
      existingGroup.totalCount += 1;
      existingGroup.byUnit[record.unit] += 1;
    } else {
      const byUnit = createEmptyUnitCountMap();
      byUnit[record.unit] = 1;
      groupMap.set(groupKey, {
        key: groupKey,
        region,
        daerah: daerahDisplay,
        desa: desaDisplay,
        kelompok: kelompokDisplay,
        totalCount: 1,
        byUnit,
      });
    }

    if (region === 'KOTA_MADIUN' || region === 'KAB_MADIUN') {
      const desaKey = `${region}__${daerahDisplay}__${desaDisplay}`;
      const existingDesa = desaMap.get(desaKey);
      if (existingDesa) {
        existingDesa.totalCount += 1;
        existingDesa.byUnit[record.unit] += 1;
        if (kelompokDisplay !== '-') {
          existingDesa.kelompokSet.add(kelompokDisplay.toLowerCase());
        }
      } else {
        const byUnit = createEmptyUnitCountMap();
        byUnit[record.unit] = 1;
        const kelompokSet = new Set<string>();
        if (kelompokDisplay !== '-') {
          kelompokSet.add(kelompokDisplay.toLowerCase());
        }
        desaMap.set(desaKey, {
          region,
          daerah: daerahDisplay,
          desa: desaDisplay,
          kelompokSet,
          totalCount: 1,
          byUnit,
        });
      }
    }

    const alumniCat = classifyAlumniOrigin(record.asalSekolah);
    if (alumniCat === 'RA_AL_MUTTAQIN') {
      raAlMuttaqin += 1;
      byCategoryAndTargetUnit.RA_AL_MUTTAQIN[record.unit] += 1;
      alumniRecords.push({ record, category: alumniCat });
    } else if (alumniCat === 'SDIT_AL_MUTTAQIN') {
      sditAlMuttaqin += 1;
      byCategoryAndTargetUnit.SDIT_AL_MUTTAQIN[record.unit] += 1;
      alumniRecords.push({ record, category: alumniCat });
    } else if (alumniCat === 'SMP_WUSTHA_AL_MUTTAQIN') {
      smpWusthaAlMuttaqin += 1;
      byCategoryAndTargetUnit.SMP_WUSTHA_AL_MUTTAQIN[record.unit] += 1;
      alumniRecords.push({ record, category: alumniCat });
    } else {
      nonAlumni += 1;
    }
  }

  const pengajianGroups = Array.from(groupMap.values()).sort((a, b) => {
    if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
    return `${a.daerah} ${a.desa} ${a.kelompok}`.localeCompare(
      `${b.daerah} ${b.desa} ${b.kelompok}`,
      'id'
    );
  });

  const madiunDesaSummary: PengajianDesaStat[] = Array.from(desaMap.entries())
    .map(([key, item]) => ({
      key,
      region: item.region,
      daerah: item.daerah,
      desa: item.desa,
      kelompokCount: item.kelompokSet.size,
      totalCount: item.totalCount,
      byUnit: item.byUnit,
    }))
    .sort((a, b) => {
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return `${a.daerah} ${a.desa}`.localeCompare(`${b.daerah} ${b.desa}`, 'id');
    });

  return {
    totalCount: records.length,
    totalMale,
    totalFemale,
    genderByUnit,
    pengajianSummary: {
      kotaMadiun,
      kabMadiun,
      madiunCombined: kotaMadiun + kabMadiun,
      luarMadiun,
      kotaMadiunByUnit,
      kabMadiunByUnit,
      madiunByUnit,
    },
    pengajianGroups,
    madiunDesaSummary,
    alumniSummary: {
      raAlMuttaqin,
      sditAlMuttaqin,
      smpWusthaAlMuttaqin,
      totalAlumni: raAlMuttaqin + sditAlMuttaqin + smpWusthaAlMuttaqin,
      nonAlumni,
      byCategoryAndTargetUnit,
      alumniRecords,
    },
  };
}

export function extractSpreadsheetIdShared(input: string): string {
  const trimmed = (input || '').trim();
  const urlMatch = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  if (urlMatch) {
    return urlMatch[1];
  }
  return trimmed;
}

export function createEmptyUnitTarget(): UnitSheetsTarget {
  return {
    spreadsheetId: '',
    spreadsheetTitle: '',
    spreadsheetUrl: '',
    appsScriptUrl: '',
  };
}

export function createEmptySheetsConfig(defaultMode: SheetsSyncMode = 'unified'): SheetsPublicConfig {
  return {
    syncMode: defaultMode,
    spreadsheetId: '',
    spreadsheetTitle: '',
    spreadsheetUrl: '',
    autoSyncEnabled: true,
    appsScriptUrl: '',
    lastSyncedAt: null,
    unitTargets: {
      RA_TK: createEmptyUnitTarget(),
      SDIT: createEmptyUnitTarget(),
      SMP: createEmptyUnitTarget(),
      SMA: createEmptyUnitTarget(),
    },
  };
}

export function normalizeSheetsConfig(raw?: Partial<SheetsPublicConfig> | null): SheetsPublicConfig {
  const base = createEmptySheetsConfig('unified');
  if (!raw) return base;

  const rawTargets = (raw.unitTargets || {}) as Partial<Record<UnitId, Partial<UnitSheetsTarget>>>;
  const unitTargets: Record<UnitId, UnitSheetsTarget> = {
    RA_TK: { ...createEmptyUnitTarget(), ...(rawTargets.RA_TK || {}) },
    SDIT: { ...createEmptyUnitTarget(), ...(rawTargets.SDIT || {}) },
    SMP: { ...createEmptyUnitTarget(), ...(rawTargets.SMP || {}) },
    SMA: { ...createEmptyUnitTarget(), ...(rawTargets.SMA || {}) },
  };

  for (const unit of UNIT_ORDER) {
    const t = unitTargets[unit];
    if (t.spreadsheetId) {
      t.spreadsheetId = extractSpreadsheetIdShared(t.spreadsheetId);
      if (t.spreadsheetId) {
        t.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${t.spreadsheetId}`;
      }
    } else {
      t.spreadsheetTitle = '';
      t.spreadsheetUrl = '';
    }
    t.appsScriptUrl = (t.appsScriptUrl || '').trim();
  }

  const hasPerUnitConfigured = UNIT_ORDER.some(
    (u) => Boolean(unitTargets[u].spreadsheetId || unitTargets[u].appsScriptUrl)
  );
  const hasUnifiedConfigured = Boolean(raw.spreadsheetId || raw.appsScriptUrl);
  const inferredMode: SheetsSyncMode =
    raw.syncMode === 'unified' || raw.syncMode === 'per_unit'
      ? raw.syncMode
      : hasPerUnitConfigured && !hasUnifiedConfigured
        ? 'per_unit'
        : 'unified';

  const cleanGlobalId = raw.spreadsheetId ? extractSpreadsheetIdShared(raw.spreadsheetId) : '';
  const cleanGlobalUrl = cleanGlobalId
    ? raw.spreadsheetUrl && raw.spreadsheetUrl.includes(cleanGlobalId)
      ? raw.spreadsheetUrl
      : `https://docs.google.com/spreadsheets/d/${cleanGlobalId}`
    : '';

  return {
    syncMode: inferredMode,
    spreadsheetId: cleanGlobalId,
    spreadsheetTitle: cleanGlobalId ? raw.spreadsheetTitle || '' : '',
    spreadsheetUrl: cleanGlobalUrl,
    autoSyncEnabled: raw.autoSyncEnabled !== undefined ? Boolean(raw.autoSyncEnabled) : true,
    appsScriptUrl: (raw.appsScriptUrl || '').trim(),
    lastSyncedAt: raw.lastSyncedAt || null,
    unitTargets,
  };
}

export function sanitizePublicSheetsConfig(raw: SheetsPublicConfig): SheetsPublicConfig {
  const cfg = normalizeSheetsConfig(raw);
  return {
    ...cfg,
    appsScriptUrl: '',
    unitTargets: {
      RA_TK: { ...cfg.unitTargets.RA_TK, appsScriptUrl: '' },
      SDIT: { ...cfg.unitTargets.SDIT, appsScriptUrl: '' },
      SMP: { ...cfg.unitTargets.SMP, appsScriptUrl: '' },
      SMA: { ...cfg.unitTargets.SMA, appsScriptUrl: '' },
    },
  };
}

export function countConfiguredUnitTargets(raw: SheetsPublicConfig): number {
  const cfg = normalizeSheetsConfig(raw);
  return UNIT_ORDER.filter(
    (u) => Boolean(cfg.unitTargets[u].spreadsheetId || cfg.unitTargets[u].appsScriptUrl)
  ).length;
}

export function resolveUnitWebhookDispatch(
  raw: SheetsPublicConfig,
  unit: UnitId
): { webhookUrl: string; spreadsheetId: string } | null {
  const cfg = normalizeSheetsConfig(raw);
  if (cfg.syncMode === 'unified') {
    const webhookUrl = cfg.appsScriptUrl.trim();
    if (!webhookUrl) return null;
    return {
      webhookUrl,
      spreadsheetId: cfg.spreadsheetId.trim(),
    };
  }

  const unitTarget = cfg.unitTargets[unit];
  const unitWebhook = unitTarget.appsScriptUrl.trim();
  const unitSheetId = unitTarget.spreadsheetId.trim();
  const sharedWebhook = cfg.appsScriptUrl.trim();

  if (unitWebhook) {
    return {
      webhookUrl: unitWebhook,
      spreadsheetId: unitSheetId,
    };
  }
  if (sharedWebhook && unitSheetId) {
    return {
      webhookUrl: sharedWebhook,
      spreadsheetId: unitSheetId,
    };
  }
  return null;
}

export function normalizeFormSchemaConfig(
  raw?: Partial<FormSchemaConfig> | null
): FormSchemaConfig {
  const base = structuredClone(DEFAULT_FORM_CONFIG);
  if (!raw || typeof raw !== 'object') return base;
  for (const unit of UNIT_ORDER) {
    const incoming = raw[unit];
    if (incoming && typeof incoming === 'object') {
      base[unit] = {
        ...base[unit],
        ...incoming,
        unit,
        quota:
          typeof incoming.quota === 'number' && incoming.quota > 0
            ? incoming.quota
            : base[unit].quota,
        requiredDocs: Array.isArray(incoming.requiredDocs)
          ? incoming.requiredDocs
          : base[unit].requiredDocs,
        fields: Array.isArray(incoming.fields) ? incoming.fields : base[unit].fields,
      };
    }
  }
  return base;
}

export function mergeRegistrationLists(
  localRecords: RegistrationRecord[],
  remoteRecords: RegistrationRecord[],
  options: { pushAllLocal?: boolean; dropMissingSynced?: boolean } = {}
): {
  mergedRecords: RegistrationRecord[];
  pulledFromRemote: number;
  pushedToRemote: number;
} {
  const localMap = new Map<string, RegistrationRecord>();
  for (const rec of localRecords) {
    localMap.set(rec.id, normalizeRegistrationRecord(rec));
  }

  const remoteMap = new Map<string, RegistrationRecord>();
  for (const rec of remoteRecords) {
    remoteMap.set(rec.id, normalizeRegistrationRecord(rec));
  }

  const mergedMap = new Map<string, RegistrationRecord>();
  let pulledFromRemote = 0;
  let pushedToRemote = 0;

  for (const local of localMap.values()) {
    const remote = remoteMap.get(local.id);
    if (!remote) {
      if (options.dropMissingSynced && local.syncState === 'synced') {
        continue;
      }
      mergedMap.set(local.id, { ...local, syncState: 'synced' });
      pushedToRemote += 1;
    } else {
      const localTime = Date.parse(local.updatedAt || local.createdAt || '0');
      const remoteTime = Date.parse(remote.updatedAt || remote.createdAt || '0');
      if (!options.pushAllLocal && remoteTime > localTime) {
        mergedMap.set(local.id, {
          ...remote,
          pasFotoDataUrl: remote.pasFotoDataUrl || local.pasFotoDataUrl || '',
          syncState: 'synced',
        });
        pulledFromRemote += 1;
      } else {
        mergedMap.set(local.id, {
          ...local,
          pasFotoDataUrl: local.pasFotoDataUrl || remote.pasFotoDataUrl || '',
          syncState: 'synced',
        });
        if (localTime > remoteTime || local.syncState !== 'synced') {
          pushedToRemote += 1;
        }
      }
    }
  }

  for (const [id, remote] of remoteMap.entries()) {
    if (!localMap.has(id)) {
      mergedMap.set(id, { ...remote, syncState: 'synced' });
      pulledFromRemote += 1;
    }
  }

  const mergedRecords = Array.from(mergedMap.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  return {
    mergedRecords,
    pulledFromRemote,
    pushedToRemote,
  };
}

export function parsePulledSpreadsheetData(
  rowsByTab: Partial<Record<UnitId, string[][]>> | undefined,
  formConfigJson?: string | Partial<FormSchemaConfig> | null
): {
  registrations: RegistrationRecord[];
  formConfig: FormSchemaConfig | null;
} {
  const registrations: RegistrationRecord[] = [];
  if (rowsByTab && typeof rowsByTab === 'object') {
    for (const unit of UNIT_ORDER) {
      const tabName = UNIT_CONFIGS[unit].sheetTabName as UnitId;
      const rows =
        (rowsByTab as Record<string, string[][] | undefined>)[tabName] ||
        rowsByTab[unit] ||
        [];
      for (const row of rows) {
        const parsed = sheetRowToRegistration(row, unit);
        if (parsed) {
          registrations.push({ ...parsed, unit });
        }
      }
    }
  }

  registrations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let parsedFormConfig: FormSchemaConfig | null = null;
  if (typeof formConfigJson === 'string' && formConfigJson.trim().startsWith('{')) {
    try {
      parsedFormConfig = normalizeFormSchemaConfig(
        JSON.parse(formConfigJson) as Partial<FormSchemaConfig>
      );
    } catch {
      parsedFormConfig = null;
    }
  } else if (formConfigJson && typeof formConfigJson === 'object') {
    parsedFormConfig = normalizeFormSchemaConfig(formConfigJson);
  }

  return {
    registrations,
    formConfig: parsedFormConfig,
  };
}

export function computeStatsFromUnitCounts(
  countsByUnit: Partial<
    Record<UnitId, { count?: number; mukimCount?: number; syncedCount?: number }>
  >,
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG,
  updatedAt?: string
): DashboardStats {
  const byUnit = {} as Record<UnitId, UnitStat>;
  let totalCount = 0;
  let totalQuota = 0;
  let totalSynced = 0;
  let totalPending = 0;

  for (const unit of UNIT_ORDER) {
    const cfg = UNIT_CONFIGS[unit];
    const quota = formConfig[unit]?.quota || cfg.quota;
    const raw = countsByUnit[unit] || {};
    const count = Math.max(0, Number(raw.count || 0));
    const mukimCount = Math.max(0, Number(raw.mukimCount || 0));
    const syncedCount = Math.min(count, Math.max(0, Number(raw.syncedCount ?? count)));

    byUnit[unit] = {
      unit,
      shortName: cfg.shortName,
      fullName: cfg.fullName,
      count,
      quota,
      remaining: Math.max(0, quota - count),
      mukimCount,
      syncedCount,
    };

    totalCount += count;
    totalQuota += quota;
    totalSynced += syncedCount;
    totalPending += Math.max(0, count - syncedCount);
  }

  return {
    totalCount,
    totalQuota,
    totalSynced,
    totalPending,
    byUnit,
    updatedAt: updatedAt || new Date().toISOString(),
  };
}

export function isValidAppsScriptExecUrl(rawUrl: string): boolean {
  const trimmed = (rawUrl || '').trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec(?:\?.*)?$/i.test(trimmed);
}

export function parseCloudShareParams(search: string): {
  appsScriptUrl: string;
  spreadsheetId: string;
} | null {
  try {
    const params = new URLSearchParams(search || '');
    const rawCloud = (params.get('cloud') || '').trim();
    if (!rawCloud || !isValidAppsScriptExecUrl(rawCloud)) {
      return null;
    }
    const rawSheet = (params.get('sheet') || '').trim();
    return {
      appsScriptUrl: rawCloud,
      spreadsheetId: extractSpreadsheetIdShared(rawSheet),
    };
  } catch {
    return null;
  }
}

export function buildCloudShareUrl(
  origin: string,
  appsScriptUrl: string,
  spreadsheetId?: string
): string {
  const cleanOrigin = (origin || '').replace(/\/+$/, '');
  const cleanUrl = (appsScriptUrl || '').trim();
  if (!cleanOrigin || !isValidAppsScriptExecUrl(cleanUrl)) {
    return cleanOrigin;
  }
  const params = new URLSearchParams();
  params.set('cloud', cleanUrl);
  const cleanSheet = extractSpreadsheetIdShared(spreadsheetId || '');
  if (cleanSheet) {
    params.set('sheet', cleanSheet);
  }
  return `${cleanOrigin}/?${params.toString()}`;
}

