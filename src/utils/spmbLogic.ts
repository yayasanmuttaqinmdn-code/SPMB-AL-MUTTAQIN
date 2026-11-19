import type {
  DashboardStats,
  FeeCategoryId,
  FeeLineItem,
  FeeScheduleGroup,
  FormSchemaConfig,
  RegistrationInput,
  RegistrationRecord,
  SelectionStatus,
  SheetsPublicConfig,
  SheetsSyncMode,
  StandardFieldRequiredMap,
  StandardFormFieldKey,
  UnitConfig,
  UnitFormConfig,
  UnitId,
  UnitSheetsTarget,
  UnitSpecificData,
  UnitStat,
  ValidationErrors,
} from '../types/spmb.ts';

export const ACADEMIC_YEAR = '2027/2028';

export const INSTITUTION_NAME = 'YAYASAN PONDOK PESANTREN MUTTAQIN JOSENAN MADIUN';
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

export function isGenderSplitQuotaUnit(unit: UnitId): boolean {
  return unit === 'SMP' || unit === 'SMA';
}

export function resolveUnitQuotaTargets(
  unit: UnitId,
  unitConfig?: Partial<UnitFormConfig> | null
): { quota: number; quotaPutra?: number; quotaPutri?: number } {
  const cfg = UNIT_CONFIGS[unit];
  if (isGenderSplitQuotaUnit(unit)) {
    const rawPutra = unitConfig?.quotaPutra;
    const rawPutri = unitConfig?.quotaPutri;
    const hasPutra = typeof rawPutra === 'number' && Number.isFinite(rawPutra) && rawPutra >= 0;
    const hasPutri = typeof rawPutri === 'number' && Number.isFinite(rawPutri) && rawPutri >= 0;

    let quotaPutra: number;
    let quotaPutri: number;

    if (hasPutra && hasPutri && rawPutra + rawPutri > 0) {
      quotaPutra = Math.floor(rawPutra);
      quotaPutri = Math.floor(rawPutri);
    } else if (hasPutra && !hasPutri) {
      quotaPutra = Math.floor(rawPutra);
      quotaPutri = Math.max(0, cfg.quotaPutri ?? Math.floor(cfg.quota / 2));
      if (quotaPutra + quotaPutri <= 0) {
        quotaPutri = 1;
      }
    } else if (!hasPutra && hasPutri) {
      quotaPutri = Math.floor(rawPutri);
      quotaPutra = Math.max(0, cfg.quotaPutra ?? Math.ceil(cfg.quota / 2));
      if (quotaPutra + quotaPutri <= 0) {
        quotaPutra = 1;
      }
    } else if (
      typeof unitConfig?.quota === 'number' &&
      Number.isFinite(unitConfig.quota) &&
      unitConfig.quota > 0
    ) {
      const total = Math.floor(unitConfig.quota);
      quotaPutra = Math.ceil(total / 2);
      quotaPutri = Math.floor(total / 2);
    } else {
      quotaPutra = cfg.quotaPutra ?? Math.ceil(cfg.quota / 2);
      quotaPutri = cfg.quotaPutri ?? Math.floor(cfg.quota / 2);
    }

    return {
      quota: quotaPutra + quotaPutri,
      quotaPutra,
      quotaPutri,
    };
  }

  const singleQuota =
    typeof unitConfig?.quota === 'number' && Number.isFinite(unitConfig.quota) && unitConfig.quota > 0
      ? Math.floor(unitConfig.quota)
      : cfg.quota;
  return { quota: singleQuota };
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
    quotaPutra: 60,
    quotaPutri: 60,
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
    quotaPutra: 60,
    quotaPutri: 60,
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

export interface StandardFormFieldMeta {
  key: StandardFormFieldKey;
  label: string;
  hint?: string;
  lockedRequired?: boolean;
}

export interface StandardFormFieldGroup {
  id: string;
  title: string;
  fields: StandardFormFieldMeta[];
}

export const LOCKED_STANDARD_FIELDS: ReadonlySet<StandardFormFieldKey> = new Set([
  'namaLengkap',
  'jenisKelamin',
]);

export const STANDARD_FORM_FIELD_GROUPS: StandardFormFieldGroup[] = [
  {
    id: 'student_identity',
    title: '01A. Identitas & Pas Foto Siswa',
    fields: [
      { key: 'pasFotoDataUrl', label: 'Pas Foto Calon Murid (3×4)' },
      {
        key: 'namaLengkap',
        label: 'Nama Lengkap Siswa',
        hint: 'Wajib utama untuk identitas & cetak bukti PDF',
        lockedRequired: true,
      },
      { key: 'namaPanggilan', label: 'Nama Panggilan' },
      { key: 'agama', label: 'Agama' },
      { key: 'tempatLahir', label: 'Tempat Lahir Siswa' },
      { key: 'tanggalLahir', label: 'Tanggal Lahir Siswa' },
      {
        key: 'jenisKelamin',
        label: 'Jenis Kelamin',
        hint: 'Wajib utama untuk kuota Putra / Putri',
        lockedRequired: true,
      },
      { key: 'nisn', label: 'NISN (10 Digit)', hint: '10 digit angka jika diisi' },
      { key: 'nik', label: 'NIK Siswa (16 Digit)', hint: '16 digit angka jika diisi' },
      { key: 'noKk', label: 'No. Kartu Keluarga (16 Digit)', hint: '16 digit angka jika diisi' },
      { key: 'anakKe', label: 'Anak Ke-' },
      { key: 'jumlahSaudara', label: 'Jumlah Saudara Kandung' },
      { key: 'jalurPendaftaran', label: 'Jalur Pendaftaran' },
    ],
  },
  {
    id: 'student_history',
    title: '01B. Riwayat & Kesehatan Siswa',
    fields: [
      { key: 'asalSekolah', label: 'Asal Sekolah (TK/RA/SD/SMP)' },
      { key: 'jenisPrestasi', label: 'Jenis Prestasi Yang Pernah Diraih' },
      { key: 'golDarah', label: 'Golongan Darah' },
      { key: 'tinggiBadan', label: 'Tinggi Badan (cm)' },
      { key: 'beratBadan', label: 'Berat Badan (kg)' },
      { key: 'alergi', label: 'Riwayat Alergi' },
    ],
  },
  {
    id: 'student_address',
    title: '01C. Alamat Lengkap Siswa',
    fields: [
      { key: 'alamatJalan', label: 'Jalan / Dusun / Perumahan' },
      { key: 'alamatRt', label: 'RT Siswa' },
      { key: 'alamatRw', label: 'RW Siswa' },
      { key: 'alamatDesa', label: 'Desa / Kelurahan Siswa' },
      { key: 'alamatKecamatan', label: 'Kecamatan Siswa' },
      { key: 'alamatKota', label: 'Kota / Kabupaten Siswa' },
      { key: 'alamatProvinsi', label: 'Provinsi Siswa' },
    ],
  },
  {
    id: 'father_info',
    title: '02A. Data Ayah / Wali',
    fields: [
      { key: 'namaAyah', label: 'Nama Ayah / Wali' },
      { key: 'tempatLahirAyah', label: 'Tempat Lahir Ayah' },
      { key: 'tanggalLahirAyah', label: 'Tanggal Lahir Ayah' },
      { key: 'nikAyah', label: 'NIK Ayah (16 Digit)', hint: '16 digit angka jika diisi' },
      { key: 'statusAyah', label: 'Status Hidup Ayah' },
      { key: 'pekerjaanAyah', label: 'Pekerjaan Ayah' },
      { key: 'pendidikanAyah', label: 'Pendidikan Terakhir Ayah' },
      { key: 'penghasilanAyah', label: 'Penghasilan Ayah' },
      { key: 'noHpAyah', label: 'No. HP / WhatsApp Ayah' },
      { key: 'emailAyah', label: 'Alamat Email Ayah' },
    ],
  },
  {
    id: 'mother_info',
    title: '02B. Data Ibu / Wali',
    fields: [
      { key: 'namaIbu', label: 'Nama Ibu / Wali' },
      { key: 'tempatLahirIbu', label: 'Tempat Lahir Ibu' },
      { key: 'tanggalLahirIbu', label: 'Tanggal Lahir Ibu' },
      { key: 'nikIbu', label: 'NIK Ibu (16 Digit)', hint: '16 digit angka jika diisi' },
      { key: 'statusIbu', label: 'Status Hidup Ibu' },
      { key: 'pekerjaanIbu', label: 'Pekerjaan Ibu' },
      { key: 'pendidikanIbu', label: 'Pendidikan Terakhir Ibu' },
      { key: 'penghasilanIbu', label: 'Penghasilan Ibu' },
      { key: 'noHpIbu', label: 'No. HP / WhatsApp Ibu' },
      { key: 'emailIbu', label: 'Alamat Email Ibu' },
    ],
  },
  {
    id: 'parent_address',
    title: '02C. Alamat Orang Tua / Wali',
    fields: [
      { key: 'alamatOrtuJalan', label: 'Jalan Alamat Orang Tua' },
      { key: 'alamatOrtuRt', label: 'RT Orang Tua' },
      { key: 'alamatOrtuRw', label: 'RW Orang Tua' },
      { key: 'alamatOrtuDesa', label: 'Desa / Kelurahan Orang Tua' },
      { key: 'alamatOrtuKecamatan', label: 'Kecamatan Orang Tua' },
      { key: 'alamatOrtuKota', label: 'Kota / Kabupaten Orang Tua' },
      { key: 'alamatOrtuProvinsi', label: 'Provinsi Orang Tua' },
    ],
  },
  {
    id: 'pengajian_info',
    title: '03. Info Pengajian',
    fields: [
      { key: 'pengajianDaerah', label: 'Daerah Pengajian' },
      { key: 'pengajianDesa', label: 'Desa Pengajian' },
      { key: 'pengajianKelompok', label: 'Kelompok Pengajian' },
    ],
  },
];

export function getDefaultRequiredFields(unit: UnitId): StandardFieldRequiredMap {
  const map = {} as StandardFieldRequiredMap;
  for (const group of STANDARD_FORM_FIELD_GROUPS) {
    for (const field of group.fields) {
      map[field.key] = field.key === 'nisn' ? unit !== 'RA_TK' : true;
    }
  }
  return map;
}

export function resolveUnitRequiredFields(
  unit: UnitId,
  unitConfig?: Partial<UnitFormConfig> | null
): StandardFieldRequiredMap {
  const defaults = getDefaultRequiredFields(unit);
  const incoming = unitConfig?.requiredFields;
  if (!incoming || typeof incoming !== 'object') {
    return defaults;
  }
  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as StandardFormFieldKey[]) {
    if (LOCKED_STANDARD_FIELDS.has(key)) {
      merged[key] = true;
    } else if (typeof incoming[key] === 'boolean') {
      merged[key] = incoming[key] as boolean;
    }
  }
  return merged;
}

export function isStandardFieldRequired(
  unit: UnitId,
  fieldKey: StandardFormFieldKey,
  unitConfig?: Partial<UnitFormConfig> | null
): boolean {
  if (LOCKED_STANDARD_FIELDS.has(fieldKey)) return true;
  const incoming = unitConfig?.requiredFields;
  if (incoming && typeof incoming[fieldKey] === 'boolean') {
    return incoming[fieldKey] as boolean;
  }
  return fieldKey === 'nisn' ? unit !== 'RA_TK' : true;
}

export const DEFAULT_FORM_CONFIG: FormSchemaConfig = {
  RA_TK: {
    unit: 'RA_TK',
    quota: 60,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.RA_TK.requiredDocs],
    fields: [],
    requiredFields: getDefaultRequiredFields('RA_TK'),
  },
  SDIT: {
    unit: 'SDIT',
    quota: 90,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.SDIT.requiredDocs],
    fields: [],
    requiredFields: getDefaultRequiredFields('SDIT'),
  },
  SMP: {
    unit: 'SMP',
    quota: 120,
    quotaPutra: 60,
    quotaPutri: 60,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.SMP.requiredDocs],
    fields: [],
    requiredFields: getDefaultRequiredFields('SMP'),
  },
  SMA: {
    unit: 'SMA',
    quota: 120,
    quotaPutra: 60,
    quotaPutri: 60,
    instructions: 'Lengkapi formulir pendaftaran siswa, data orang tua/wali, serta info pengajian dengan benar.',
    requiredDocs: [...UNIT_CONFIGS.SMA.requiredDocs],
    fields: [],
    requiredFields: getDefaultRequiredFields('SMA'),
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
    agama: (raw.agama ?? 'ISLAM').trim(),
    tempatLahir: (raw.tempatLahir || '').trim(),
    tanggalLahir: (raw.tanggalLahir || '').trim(),
    jenisKelamin: raw.jenisKelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    nisn: (raw.nisn || raw.unitData?.nisn || '').trim(),
    nik: (raw.nik || '').trim(),
    noKk: (raw.noKk || '').trim(),
    anakKe: (raw.anakKe ?? '1').trim(),
    jumlahSaudara: (raw.jumlahSaudara ?? '1').trim(),
    pasFotoDataUrl: isValidImageDataUrl(raw.pasFotoDataUrl) ? raw.pasFotoDataUrl!.trim() : '',

    asalSekolah: (
      raw.asalSekolah ??
      raw.unitData?.asalTkRa ??
      raw.unitData?.asalSdMi ??
      raw.unitData?.asalSmpMts ??
      ''
    ).trim(),
    jenisPrestasi: (raw.jenisPrestasi ?? raw.unitData?.prestasiAkademik ?? '').trim(),
    golDarah: (raw.golDarah ?? 'Tidak Tahu').trim(),
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
    pendidikanAyah: (raw.pendidikanAyah ?? 'SMA / SMK sederajat').trim(),
    penghasilanAyah: (raw.penghasilanAyah ?? 'Rp.1.000.000 - Rp.2.000.000').trim(),
    noHpAyah,
    emailAyah: (raw.emailAyah || '').trim(),

    namaIbu: (raw.namaIbu || '').trim(),
    tempatLahirIbu: (raw.tempatLahirIbu || '').trim(),
    tanggalLahirIbu: (raw.tanggalLahirIbu || '').trim(),
    nikIbu: (raw.nikIbu || '').trim(),
    statusIbu: raw.statusIbu === 'Sudah Meninggal' ? 'Sudah Meninggal' : 'Masih Hidup',
    pekerjaanIbu: (raw.pekerjaanIbu || '').trim(),
    pendidikanIbu: (raw.pendidikanIbu ?? 'SMA / SMK sederajat').trim(),
    penghasilanIbu: (raw.penghasilanIbu ?? 'Tidak Berpenghasilan').trim(),
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
  year = 2027
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
    const resolvedQuota = resolveUnitQuotaTargets(unit, formConfig[unit]);
    const quota = resolvedQuota.quota;
    const unitRecords = records.filter((r) => r.unit === unit);
    const count = unitRecords.length;
    const syncedCount = unitRecords.filter((r) => r.syncState === 'synced').length;
    const mukimCount = unitRecords.filter(
      (r) => r.unitData?.statusAsrama === 'Santri Mukim (Asrama Pondok)'
    ).length;
    const maleCount = unitRecords.filter((r) => r.jenisKelamin === 'Laki-laki').length;
    const femaleCount = unitRecords.filter((r) => r.jenisKelamin === 'Perempuan').length;

    byUnit[unit] = {
      unit,
      shortName: cfg.shortName,
      fullName: cfg.fullName,
      count,
      quota,
      remaining: Math.max(0, quota - count),
      mukimCount,
      syncedCount,
      maleCount,
      femaleCount,
      ...(resolvedQuota.quotaPutra !== undefined && resolvedQuota.quotaPutri !== undefined
        ? {
            quotaPutra: resolvedQuota.quotaPutra,
            quotaPutri: resolvedQuota.quotaPutri,
            remainingPutra: Math.max(0, resolvedQuota.quotaPutra - maleCount),
            remainingPutri: Math.max(0, resolvedQuota.quotaPutri - femaleCount),
          }
        : {}),
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
  const activeConfig = unitConfig || DEFAULT_FORM_CONFIG[input.unit];
  const req = (key: StandardFormFieldKey) =>
    isStandardFieldRequired(input.unit, key, activeConfig);
  const requirePhoto = (options?.requirePhoto ?? true) && req('pasFotoDataUrl');

  if (!input.namaLengkap.trim() || input.namaLengkap.trim().length < 2) {
    errors.namaLengkap = 'Nama lengkap calon murid wajib diisi minimal 2 huruf.';
  }

  if (req('namaPanggilan') && !input.namaPanggilan.trim()) {
    errors.namaPanggilan = 'Nama panggilan wajib diisi.';
  }

  if (req('agama') && !input.agama.trim()) {
    errors.agama = 'Agama wajib dipilih.';
  }

  if (req('tempatLahir') && !input.tempatLahir.trim()) {
    errors.tempatLahir = 'Tempat lahir wajib diisi.';
  }

  if (req('tanggalLahir') && !input.tanggalLahir.trim()) {
    errors.tanggalLahir = 'Tanggal lahir wajib diisi.';
  }

  if (!input.jenisKelamin.trim()) {
    errors.jenisKelamin = 'Jenis kelamin wajib dipilih.';
  }

  const cleanNisn = input.nisn.replace(/\s+/g, '');
  if (req('nisn')) {
    if (!/^\d{10}$/.test(cleanNisn)) {
      errors.nisn = 'NISN wajib diisi tepat 10 digit angka.';
    }
  } else if (cleanNisn && !/^\d{10}$/.test(cleanNisn)) {
    errors.nisn = 'NISN harus terdiri dari 10 digit angka.';
  }

  const cleanNik = input.nik.replace(/\s+/g, '');
  if (req('nik')) {
    if (!/^\d{16}$/.test(cleanNik)) {
      errors.nik = 'NIK wajib diisi tepat 16 digit angka.';
    }
  } else if (cleanNik && !/^\d{16}$/.test(cleanNik)) {
    errors.nik = 'NIK harus terdiri dari 16 digit angka.';
  }

  const cleanKk = input.noKk.replace(/\s+/g, '');
  if (req('noKk')) {
    if (!/^\d{16}$/.test(cleanKk)) {
      errors.noKk = 'No. KK wajib diisi tepat 16 digit angka.';
    }
  } else if (cleanKk && !/^\d{16}$/.test(cleanKk)) {
    errors.noKk = 'No. KK harus terdiri dari 16 digit angka.';
  }

  const cleanAnakKe = input.anakKe.trim();
  if (req('anakKe')) {
    if (!cleanAnakKe || Number.isNaN(Number(cleanAnakKe)) || Number(cleanAnakKe) < 1) {
      errors.anakKe = 'Anak ke- wajib diisi angka minimal 1.';
    }
  } else if (cleanAnakKe && (Number.isNaN(Number(cleanAnakKe)) || Number(cleanAnakKe) < 1)) {
    errors.anakKe = 'Anak ke- harus berupa angka minimal 1.';
  }

  const cleanSaudara = input.jumlahSaudara.trim();
  if (req('jumlahSaudara')) {
    if (!cleanSaudara || Number.isNaN(Number(cleanSaudara)) || Number(cleanSaudara) < 0) {
      errors.jumlahSaudara = 'Jumlah saudara kandung wajib diisi angka.';
    }
  } else if (cleanSaudara && (Number.isNaN(Number(cleanSaudara)) || Number(cleanSaudara) < 0)) {
    errors.jumlahSaudara = 'Jumlah saudara kandung harus berupa angka.';
  }

  if (req('jalurPendaftaran') && !input.jalurPendaftaran.trim()) {
    errors.jalurPendaftaran = 'Jalur pendaftaran wajib dipilih.';
  }

  if (requirePhoto && !isValidImageDataUrl(input.pasFotoDataUrl)) {
    errors.pasFotoDataUrl = 'Pas foto 3x4 calon murid wajib diunggah (format JPG, PNG, atau WebP).';
  }

  // Riwayat Siswa
  if (req('asalSekolah') && !input.asalSekolah.trim()) {
    errors.asalSekolah = 'Asal sekolah wajib diisi (tulis "-" jika belum sekolah).';
  }

  if (req('jenisPrestasi') && !input.jenisPrestasi.trim()) {
    errors.jenisPrestasi = 'Jenis prestasi wajib diisi (tulis "-" jika belum ada).';
  }

  if (req('golDarah') && !input.golDarah.trim()) {
    errors.golDarah = 'Golongan darah wajib dipilih.';
  }

  const cleanTinggi = input.tinggiBadan.trim();
  if (req('tinggiBadan')) {
    if (!cleanTinggi || Number.isNaN(Number(cleanTinggi)) || Number(cleanTinggi) <= 0) {
      errors.tinggiBadan = 'Tinggi badan (cm) wajib diisi angka.';
    }
  } else if (cleanTinggi && (Number.isNaN(Number(cleanTinggi)) || Number(cleanTinggi) <= 0)) {
    errors.tinggiBadan = 'Tinggi badan (cm) harus berupa angka positif.';
  }

  const cleanBerat = input.beratBadan.trim();
  if (req('beratBadan')) {
    if (!cleanBerat || Number.isNaN(Number(cleanBerat)) || Number(cleanBerat) <= 0) {
      errors.beratBadan = 'Berat badan (kg) wajib diisi angka.';
    }
  } else if (cleanBerat && (Number.isNaN(Number(cleanBerat)) || Number(cleanBerat) <= 0)) {
    errors.beratBadan = 'Berat badan (kg) harus berupa angka positif.';
  }

  if (req('alergi') && !input.alergi.trim()) {
    errors.alergi = 'Alergi wajib diisi (tulis "-" jika tidak ada).';
  }

  // Alamat Lengkap Siswa
  if (req('alamatJalan') && !input.alamatJalan.trim()) {
    errors.alamatJalan = 'Jalan / dusun / perumahan wajib diisi.';
  }

  if (req('alamatRt') && !input.alamatRt.trim()) {
    errors.alamatRt = 'RT siswa wajib diisi.';
  }

  if (req('alamatRw') && !input.alamatRw.trim()) {
    errors.alamatRw = 'RW siswa wajib diisi.';
  }

  if (req('alamatDesa') && !input.alamatDesa.trim()) {
    errors.alamatDesa = 'Desa/Kelurahan wajib diisi.';
  }

  if (req('alamatKecamatan') && !input.alamatKecamatan.trim()) {
    errors.alamatKecamatan = 'Kecamatan wajib diisi.';
  }

  if (req('alamatKota') && !input.alamatKota.trim()) {
    errors.alamatKota = 'Kota/Kabupaten wajib diisi.';
  }

  if (req('alamatProvinsi') && !input.alamatProvinsi.trim()) {
    errors.alamatProvinsi = 'Provinsi wajib diisi.';
  }

  // Data Ayah / Wali
  if (req('namaAyah') && !input.namaAyah.trim()) {
    errors.namaAyah = 'Nama Ayah / Wali wajib diisi.';
  }

  if (req('tempatLahirAyah') && !input.tempatLahirAyah.trim()) {
    errors.tempatLahirAyah = 'Tempat lahir ayah wajib diisi.';
  }

  if (req('tanggalLahirAyah') && !input.tanggalLahirAyah.trim()) {
    errors.tanggalLahirAyah = 'Tanggal lahir ayah wajib diisi.';
  }

  const cleanNikAyah = input.nikAyah.replace(/\s+/g, '');
  if (req('nikAyah')) {
    if (!/^\d{16}$/.test(cleanNikAyah)) {
      errors.nikAyah = 'NIK Ayah wajib diisi tepat 16 digit angka.';
    }
  } else if (cleanNikAyah && !/^\d{16}$/.test(cleanNikAyah)) {
    errors.nikAyah = 'NIK Ayah harus terdiri dari 16 digit angka.';
  }

  if (req('statusAyah') && !input.statusAyah.trim()) {
    errors.statusAyah = 'Status ayah wajib dipilih.';
  }

  if (req('pekerjaanAyah') && !input.pekerjaanAyah.trim()) {
    errors.pekerjaanAyah = 'Pekerjaan ayah wajib diisi.';
  }

  if (req('pendidikanAyah') && !input.pendidikanAyah.trim()) {
    errors.pendidikanAyah = 'Pendidikan terakhir ayah wajib dipilih.';
  }

  if (req('penghasilanAyah') && !input.penghasilanAyah.trim()) {
    errors.penghasilanAyah = 'Penghasilan ayah wajib dipilih.';
  }

  const cleanHpAyah = normalizeWhatsapp(input.noHpAyah);
  if (req('noHpAyah')) {
    if (!/^(\+?62|0)8\d{7,12}$/.test(cleanHpAyah)) {
      errors.noHpAyah = 'No. HP / WhatsApp ayah wajib diisi dengan nomor aktif yang valid.';
    }
  } else if (cleanHpAyah && !/^(\+?62|0)8\d{7,12}$/.test(cleanHpAyah)) {
    errors.noHpAyah = 'Format No. HP / WhatsApp ayah tidak valid.';
  }

  const cleanEmailAyah = input.emailAyah.trim();
  if (req('emailAyah')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmailAyah)) {
      errors.emailAyah = 'Alamat email ayah wajib diisi dengan format yang valid.';
    }
  } else if (cleanEmailAyah && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmailAyah)) {
    errors.emailAyah = 'Format alamat email ayah tidak valid.';
  }

  // Data Ibu / Wali
  if (req('namaIbu') && !input.namaIbu.trim()) {
    errors.namaIbu = 'Nama Ibu / Wali wajib diisi.';
  }

  if (req('tempatLahirIbu') && !input.tempatLahirIbu.trim()) {
    errors.tempatLahirIbu = 'Tempat lahir ibu wajib diisi.';
  }

  if (req('tanggalLahirIbu') && !input.tanggalLahirIbu.trim()) {
    errors.tanggalLahirIbu = 'Tanggal lahir ibu wajib diisi.';
  }

  const cleanNikIbu = input.nikIbu.replace(/\s+/g, '');
  if (req('nikIbu')) {
    if (!/^\d{16}$/.test(cleanNikIbu)) {
      errors.nikIbu = 'NIK Ibu wajib diisi tepat 16 digit angka.';
    }
  } else if (cleanNikIbu && !/^\d{16}$/.test(cleanNikIbu)) {
    errors.nikIbu = 'NIK Ibu harus terdiri dari 16 digit angka.';
  }

  if (req('statusIbu') && !input.statusIbu.trim()) {
    errors.statusIbu = 'Status ibu wajib dipilih.';
  }

  if (req('pekerjaanIbu') && !input.pekerjaanIbu.trim()) {
    errors.pekerjaanIbu = 'Pekerjaan ibu wajib diisi.';
  }

  if (req('pendidikanIbu') && !input.pendidikanIbu.trim()) {
    errors.pendidikanIbu = 'Pendidikan terakhir ibu wajib dipilih.';
  }

  if (req('penghasilanIbu') && !input.penghasilanIbu.trim()) {
    errors.penghasilanIbu = 'Penghasilan ibu wajib dipilih.';
  }

  const cleanHpIbu = normalizeWhatsapp(input.noHpIbu);
  if (req('noHpIbu')) {
    if (!/^(\+?62|0)8\d{7,12}$/.test(cleanHpIbu)) {
      errors.noHpIbu = 'No. HP ibu wajib diisi dengan nomor aktif yang valid.';
    }
  } else if (cleanHpIbu && !/^(\+?62|0)8\d{7,12}$/.test(cleanHpIbu)) {
    errors.noHpIbu = 'Format No. HP ibu tidak valid.';
  }

  const cleanEmailIbu = input.emailIbu.trim();
  if (req('emailIbu')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmailIbu)) {
      errors.emailIbu = 'Alamat email ibu wajib diisi dengan format yang valid.';
    }
  } else if (cleanEmailIbu && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmailIbu)) {
    errors.emailIbu = 'Format alamat email ibu tidak valid.';
  }

  // Alamat Lengkap Orang Tua / Wali
  if (req('alamatOrtuJalan') && !input.alamatOrtuJalan.trim()) {
    errors.alamatOrtuJalan = 'Jalan alamat orang tua/wali wajib diisi.';
  }

  if (req('alamatOrtuRt') && !input.alamatOrtuRt.trim()) {
    errors.alamatOrtuRt = 'RT alamat orang tua/wali wajib diisi.';
  }

  if (req('alamatOrtuRw') && !input.alamatOrtuRw.trim()) {
    errors.alamatOrtuRw = 'RW alamat orang tua/wali wajib diisi.';
  }

  if (req('alamatOrtuDesa') && !input.alamatOrtuDesa.trim()) {
    errors.alamatOrtuDesa = 'Desa/Kelurahan alamat orang tua/wali wajib diisi.';
  }

  if (req('alamatOrtuKecamatan') && !input.alamatOrtuKecamatan.trim()) {
    errors.alamatOrtuKecamatan = 'Kecamatan alamat orang tua/wali wajib diisi.';
  }

  if (req('alamatOrtuKota') && !input.alamatOrtuKota.trim()) {
    errors.alamatOrtuKota = 'Kota/Kabupaten alamat orang tua/wali wajib diisi.';
  }

  if (req('alamatOrtuProvinsi') && !input.alamatOrtuProvinsi.trim()) {
    errors.alamatOrtuProvinsi = 'Provinsi alamat orang tua/wali wajib diisi.';
  }

  // Info Pengajian
  if (req('pengajianDaerah') && !input.pengajianDaerah.trim()) {
    errors.pengajianDaerah = 'Daerah pengajian wajib diisi.';
  }

  if (req('pengajianDesa') && !input.pengajianDesa.trim()) {
    errors.pengajianDesa = 'Desa pengajian wajib diisi.';
  }

  if (req('pengajianKelompok') && !input.pengajianKelompok.trim()) {
    errors.pengajianKelompok = 'Kelompok pengajian wajib diisi (tulis "-" jika belum ada).';
  }

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

export interface UnitAdminRecap {
  unit: UnitId;
  shortName: string;
  fullName: string;
  totalCount: number;
  quota: number;
  remaining: number;
  quotaPutra?: number;
  quotaPutri?: number;
  remainingPutra?: number;
  remainingPutri?: number;
  maleCount: number;
  femaleCount: number;
  malePct: number;
  femalePct: number;
  verifiedCount: number;
  unverifiedCount: number;
  selectionStats: SelectionStatsSummary;
  pengajian: {
    kotaMadiun: number;
    kabMadiun: number;
    madiunCombined: number;
    luarMadiun: number;
  };
  alumni: {
    totalAlumni: number;
    nonAlumni: number;
  };
}

export function computePerUnitRecaps(
  records: RegistrationRecord[],
  formConfig: FormSchemaConfig = DEFAULT_FORM_CONFIG
): Record<UnitId, UnitAdminRecap> {
  const result = {} as Record<UnitId, UnitAdminRecap>;

  for (const unit of UNIT_ORDER) {
    const cfg = UNIT_CONFIGS[unit];
    const resolvedQuota = resolveUnitQuotaTargets(unit, formConfig[unit]);
    const unitRecords = records.filter((r) => r.unit === unit);
    const unitAnalytics = computeAdminAnalytics(unitRecords);
    const selectionStats = computeSelectionStats(unitRecords);
    const maleCount = unitAnalytics.totalMale;
    const femaleCount = unitAnalytics.totalFemale;
    const totalCount = unitRecords.length;
    const verifiedCount = unitRecords.filter(
      (r) => r.statusVerifikasi === 'Terverifikasi Panitia'
    ).length;

    result[unit] = {
      unit,
      shortName: cfg.shortName,
      fullName: cfg.fullName,
      totalCount,
      quota: resolvedQuota.quota,
      remaining: Math.max(0, resolvedQuota.quota - totalCount),
      ...(resolvedQuota.quotaPutra !== undefined && resolvedQuota.quotaPutri !== undefined
        ? {
            quotaPutra: resolvedQuota.quotaPutra,
            quotaPutri: resolvedQuota.quotaPutri,
            remainingPutra: Math.max(0, resolvedQuota.quotaPutra - maleCount),
            remainingPutri: Math.max(0, resolvedQuota.quotaPutri - femaleCount),
          }
        : {}),
      maleCount,
      femaleCount,
      malePct: totalCount > 0 ? Math.round((maleCount / totalCount) * 100) : 0,
      femalePct: totalCount > 0 ? Math.round((femaleCount / totalCount) * 100) : 0,
      verifiedCount,
      unverifiedCount: Math.max(0, totalCount - verifiedCount),
      selectionStats,
      pengajian: {
        kotaMadiun: unitAnalytics.pengajianSummary.kotaMadiun,
        kabMadiun: unitAnalytics.pengajianSummary.kabMadiun,
        madiunCombined: unitAnalytics.pengajianSummary.madiunCombined,
        luarMadiun: unitAnalytics.pengajianSummary.luarMadiun,
      },
      alumni: {
        totalAlumni: unitAnalytics.alumniSummary.totalAlumni,
        nonAlumni: unitAnalytics.alumniSummary.nonAlumni,
      },
    };
  }

  return result;
}

export function extractSpreadsheetIdShared(input: string): string {
  const trimmed = (input || '').trim();
  const urlMatch = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(trimmed);
  if (urlMatch) {
    return urlMatch[1];
  }
  return trimmed;
}

export const PRIMARY_SPREADSHEET_CONFIG = {
  spreadsheetId: '1Vk2NjqvmphkZhV5gahpkTWVaYdLaJ1CneyyNBZvs724',
  spreadsheetTitle: 'SPMB 2027',
  spreadsheetUrl:
    'https://docs.google.com/spreadsheets/d/1Vk2NjqvmphkZhV5gahpkTWVaYdLaJ1CneyyNBZvs724',
  appsScriptUrl:
    'https://script.google.com/macros/s/AKfycbxSscKOBNKh5TTdBUxSY7ohujK8wP5h3GT4UfzGC3sBAGyyLxqvYIeFQ2GZcwNngdoI/exec',
} as const;

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

export function createPrimarySheetsConfig(): SheetsPublicConfig {
  return {
    syncMode: 'unified',
    spreadsheetId: PRIMARY_SPREADSHEET_CONFIG.spreadsheetId,
    spreadsheetTitle: PRIMARY_SPREADSHEET_CONFIG.spreadsheetTitle,
    spreadsheetUrl: PRIMARY_SPREADSHEET_CONFIG.spreadsheetUrl,
    autoSyncEnabled: true,
    appsScriptUrl: PRIMARY_SPREADSHEET_CONFIG.appsScriptUrl,
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
      const resolvedQuota = resolveUnitQuotaTargets(unit, incoming);
      base[unit] = {
        ...base[unit],
        ...incoming,
        unit,
        quota: resolvedQuota.quota,
        ...(isGenderSplitQuotaUnit(unit)
          ? {
              quotaPutra: resolvedQuota.quotaPutra,
              quotaPutri: resolvedQuota.quotaPutri,
            }
          : {
              quotaPutra: undefined,
              quotaPutri: undefined,
            }),
        requiredDocs: Array.isArray(incoming.requiredDocs)
          ? incoming.requiredDocs
          : base[unit].requiredDocs,
        fields: Array.isArray(incoming.fields) ? incoming.fields : base[unit].fields,
        requiredFields: resolveUnitRequiredFields(unit, incoming),
      };
      if (!isGenderSplitQuotaUnit(unit)) {
        delete base[unit].quotaPutra;
        delete base[unit].quotaPutri;
      }
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
    Record<
      UnitId,
      {
        count?: number;
        mukimCount?: number;
        syncedCount?: number;
        maleCount?: number;
        femaleCount?: number;
      }
    >
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
    const resolvedQuota = resolveUnitQuotaTargets(unit, formConfig[unit]);
    const quota = resolvedQuota.quota;
    const raw = countsByUnit[unit] || {};
    const count = Math.max(0, Number(raw.count || 0));
    const mukimCount = Math.max(0, Number(raw.mukimCount || 0));
    const syncedCount = Math.min(count, Math.max(0, Number(raw.syncedCount ?? count)));

    const hasExplicitGenderCounts =
      typeof raw.maleCount === 'number' || typeof raw.femaleCount === 'number';
    const maleCount = hasExplicitGenderCounts
      ? Math.max(0, Number(raw.maleCount || 0))
      : count === 0
        ? 0
        : undefined;
    const femaleCount = hasExplicitGenderCounts
      ? Math.max(0, Number(raw.femaleCount || 0))
      : count === 0
        ? 0
        : undefined;

    byUnit[unit] = {
      unit,
      shortName: cfg.shortName,
      fullName: cfg.fullName,
      count,
      quota,
      remaining: Math.max(0, quota - count),
      mukimCount,
      syncedCount,
      ...(maleCount !== undefined ? { maleCount } : {}),
      ...(femaleCount !== undefined ? { femaleCount } : {}),
      ...(resolvedQuota.quotaPutra !== undefined && resolvedQuota.quotaPutri !== undefined
        ? {
            quotaPutra: resolvedQuota.quotaPutra,
            quotaPutri: resolvedQuota.quotaPutri,
            ...(maleCount !== undefined
              ? { remainingPutra: Math.max(0, resolvedQuota.quotaPutra - maleCount) }
              : {}),
            ...(femaleCount !== undefined
              ? { remainingPutri: Math.max(0, resolvedQuota.quotaPutri - femaleCount) }
              : {}),
          }
        : {}),
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

export const OFFICIAL_FEE_PDF_PATH = '/assets/aistudio/BIAYA_PPDB_2027_4d726d4e.pdf';
export const FEE_ACADEMIC_YEAR = '2027/2028';

export const FEE_CATEGORY_ORDER: FeeCategoryId[] = ['PP', 'SMA', 'SMP', 'SDIT', 'RA', 'KB'];

export const FEE_SCHEDULES: Record<FeeCategoryId, FeeScheduleGroup> = {
  PP: {
    id: 'PP',
    shortName: 'PP',
    title: 'Pondok Pesantren (PP)',
    subtitle: 'Rincian biaya santri Pondok Pesantren Muttaqin Josenan Madiun',
    totalLabel: 'TOTAL BIAYA',
    totalPutra: 485000,
    totalPutri: 485000,
    items: [
      { no: 1, label: 'Seragam Almamater', putra: 100000, putri: 100000 },
      { no: 2, label: 'Kartu santri', putra: 30000, putri: 30000 },
      { no: 3, label: 'Biaya Pondok', putra: 300000, putri: 300000 },
      { no: 4, label: 'Shodaqoh Kesehatan', putra: 30000, putri: 30000 },
      { no: 5, label: 'Shodaqoh Perawatan Sarpras', putra: 25000, putri: 25000 },
    ],
  },
  SMA: {
    id: 'SMA',
    shortName: 'SMA',
    title: 'SMA Al Muttaqin',
    subtitle: 'Biaya Pendidikan Peserta Didik Baru SMA Muttaqin Josenan',
    registerUnit: 'SMA',
    totalLabel: 'TOTAL BIAYA PENDIDIKAN',
    totalPutra: 3695000,
    totalPutri: 3725000,
    items: [
      { no: 1, label: 'Seragam Almamater', putra: 180000, putri: 180000 },
      { no: 2, label: 'Seragam Batik', putra: 210000, putri: 215000 },
      { no: 3, label: 'Seragam Osis', putra: 170000, putri: 170000 },
      { no: 4, label: 'Seragam Pramuka', putra: 170000, putri: 170000 },
      { no: 5, label: 'Seragam Olahraga', putra: 200000, putri: 200000 },
      { no: 6, label: 'Seragam Double Track', putra: 110000, putri: 110000 },
      { no: 7, label: 'Atribut Sekolah (Topi, dasi, badge, lokasi)', putra: 135000, putri: 120000 },
      { no: 8, label: 'Jilbab', putra: null, putri: 160000 },
      { no: 9, label: 'Kartu pelajar', putra: 30000, putri: 30000 },
      { no: 10, label: 'LKS 1 Tahun', putra: 300000, putri: 300000 },
      { no: 11, label: 'Foto Raport', putra: 15000, putri: 15000 },
      { no: 12, label: 'Pengembangan Potensi Siswa', putra: 200000, putri: 200000 },
      { no: 13, label: 'Loker', putra: 305000, putri: 305000 },
      { no: 14, label: 'Cukur', putra: 120000, putri: null },
      { no: 15, label: 'Biaya Pondok & SPP Bulan Juli', putra: 600000, putri: 600000 },
      { no: 16, label: 'Persinas', putra: 100000, putri: 100000 },
      { no: 17, label: 'English Camp', putra: 500000, putri: 500000 },
      { no: 18, label: 'Perpustakaan & Media Pembelajaran', putra: 75000, putri: 75000 },
      { no: 19, label: 'Perawatan Peralatan DT', putra: 50000, putri: 50000 },
      { no: 20, label: 'Shodaqoh kesehatan', putra: 100000, putri: 100000 },
      { no: 21, label: 'Shodaqoh Perawatan Sarpras', putra: 125000, putri: 125000 },
    ],
  },
  SMP: {
    id: 'SMP',
    shortName: 'SMP',
    title: 'SMP Al Muttaqin',
    subtitle: 'Biaya Pendidikan Peserta Didik Baru SMP Muttaqin Josenan',
    registerUnit: 'SMP',
    totalLabel: 'TOTAL BIAYA PENDIDIKAN',
    totalPutra: 2670000,
    totalPutri: 2695000,
    items: [
      { no: 1, label: 'Seragam Batik', putra: 170000, putri: 170000 },
      { no: 2, label: 'Seragam Osis', putra: 170000, putri: 170000 },
      { no: 3, label: 'Seragam Pramuka', putra: 170000, putri: 170000 },
      { no: 4, label: 'Seragam Olahraga', putra: 170000, putri: 170000 },
      { no: 5, label: 'Atribut Sekolah (Topi, dasi, badge, lokasi)', putra: 135000, putri: 120000 },
      { no: 6, label: 'Jilbab', putra: null, putri: 160000 },
      { no: 7, label: 'Kartu pelajar', putra: 30000, putri: 30000 },
      { no: 8, label: 'LKS', putra: 180000, putri: 180000 },
      { no: 9, label: 'Foto & Sampul Raport', putra: 50000, putri: 50000 },
      { no: 10, label: 'Pengembangan Potensi Siswa', putra: 200000, putri: 200000 },
      { no: 11, label: 'Loker', putra: 325000, putri: 325000 },
      { no: 12, label: 'Cukur', putra: 120000, putri: null },
      { no: 13, label: 'Biaya Pondok & SPP Bulan Juli', putra: 550000, putri: 550000 },
      { no: 14, label: 'Persinas', putra: 100000, putri: 100000 },
      { no: 15, label: 'Perpustakaan & Media Pembelajaran', putra: 75000, putri: 75000 },
      { no: 16, label: 'Shodaqoh kesehatan', putra: 100000, putri: 100000 },
      { no: 17, label: 'Shodaqoh Perawatan Sarpras', putra: 125000, putri: 125000 },
    ],
  },
  SDIT: {
    id: 'SDIT',
    shortName: 'SDIT',
    title: 'SDIT Al Muttaqin',
    subtitle: 'Biaya Pendidikan Peserta Didik Baru SDIT Muttaqin Josenan',
    registerUnit: 'SDIT',
    totalLabel: 'TOTAL BIAYA PENDIDIKAN',
    totalPutra: 1055000,
    totalPutri: 1175000,
    items: [
      { no: 1, label: 'Seragam Batik', putra: 150000, putri: 150000 },
      { no: 2, label: 'Seragam Merah', putra: 150000, putri: 150000 },
      { no: 3, label: 'Seragam Pramuka', putra: 150000, putri: 150000 },
      { no: 4, label: 'Seragam Olahraga', putra: 100000, putri: 100000 },
      { no: 5, label: 'Atribut Sekolah (Topi, dasi, badge, lokasi, dll)', putra: 120000, putri: 120000 },
      { no: 6, label: 'Jilbab', putra: null, putri: 120000 },
      { no: 7, label: 'Kartu pelajar', putra: 30000, putri: 30000 },
      { no: 8, label: 'LKS 1 Semester', putra: 40000, putri: 40000 },
      { no: 9, label: 'Perpustakaan & Media Pembelajaran', putra: 50000, putri: 50000 },
      { no: 10, label: 'Kegiatan MPLS', putra: 50000, putri: 50000 },
      { no: 11, label: 'Foto Raport', putra: 15000, putri: 15000 },
      { no: 12, label: 'SPP Bulan Juli', putra: 100000, putri: 100000 },
      { no: 13, label: 'Pengembangan Potensi Siswa', putra: 100000, putri: 100000 },
    ],
  },
  RA: {
    id: 'RA',
    shortName: 'RA',
    title: 'RA (Raudhatul Athfal)',
    subtitle: 'Biaya Pendidikan Peserta Didik Baru RA Al Muttaqin Josenan',
    registerUnit: 'RA_TK',
    totalLabel: 'TOTAL BIAYA PENDIDIKAN',
    totalPutra: 820000,
    totalPutri: 880000,
    items: [
      { no: 1, label: 'Biaya Pendaftaran', putra: 25000, putri: 25000 },
      { no: 2, label: 'Seragam 3 stel', putra: 400000, putri: 400000 },
      { no: 3, label: 'Jilbab', putra: null, putri: 60000 },
      { no: 4, label: 'Majalah 1 Tahun', putra: 100000, putri: 100000 },
      { no: 5, label: 'Sampul Raport', putra: 35000, putri: 35000 },
      { no: 6, label: 'SPP Bulan Juli', putra: 60000, putri: 60000 },
      { no: 7, label: 'Pengembangan Potensi Siswa', putra: 200000, putri: 200000 },
    ],
  },
  KB: {
    id: 'KB',
    shortName: 'KB',
    title: 'KB (Kelompok Bermain)',
    subtitle: 'Biaya Pendidikan Peserta Didik Baru Kelompok Bermain Al Muttaqin',
    registerUnit: 'RA_TK',
    totalLabel: 'TOTAL BIAYA PENDIDIKAN',
    totalPutra: 670000,
    totalPutri: 670000,
    items: [
      { no: 1, label: 'Biaya Pendaftaran', putra: 25000, putri: 25000 },
      { no: 2, label: 'Seragam 3 stel', putra: null, putri: null },
      { no: 3, label: 'Jilbab', putra: null, putri: null },
      { no: 4, label: 'Media', putra: 100000, putri: 100000 },
      { no: 5, label: 'Sampul Raport', putra: 35000, putri: 35000 },
      { no: 6, label: 'SPP Bulan Juli', putra: 60000, putri: 60000 },
      { no: 7, label: 'Pengembangan Potensi Siswa', putra: 450000, putri: 450000 },
    ],
  },
};

export function computeFeeTotals(items: FeeLineItem[]): { putra: number; putri: number } {
  return items.reduce(
    (acc, item) => ({
      putra: acc.putra + (item.putra ?? 0),
      putri: acc.putri + (item.putri ?? 0),
    }),
    { putra: 0, putri: 0 }
  );
}

export type FeeGenderTab = 'putra' | 'putri';

export interface GenderFeeLineItem {
  no: number;
  label: string;
  amount: number;
}

export function getFeeItemsForGender(
  items: FeeLineItem[],
  gender: FeeGenderTab
): GenderFeeLineItem[] {
  return items
    .map((item) => ({
      label: item.label,
      amount: gender === 'putra' ? item.putra : item.putri,
    }))
    .filter((entry): entry is { label: string; amount: number } => entry.amount !== null)
    .map((entry, idx) => ({
      no: idx + 1,
      label: entry.label,
      amount: entry.amount,
    }));
}

export function formatRupiah(amount: number | null | undefined, withPrefix = true): string {
  if (amount === null || amount === undefined) return '-';
  const formatted = new Intl.NumberFormat('id-ID').format(amount);
  return withPrefix ? `Rp ${formatted}` : formatted;
}


