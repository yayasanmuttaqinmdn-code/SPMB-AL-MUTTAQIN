export type UnitId = 'RA_TK' | 'SDIT' | 'SMP' | 'SMA';

export type Gender = 'Laki-laki' | 'Perempuan';

export type ParentLifeStatus = 'Masih Hidup' | 'Sudah Meninggal';

export type JalurPendaftaran = 'Reguler' | 'Tahfidz' | 'Prestasi' | 'Beasiswa Yatim/Dhuafa';

export type SyncState = 'synced' | 'pending' | 'error';

export type SelectionStatus =
  | 'Belum Diseleksi'
  | 'Dalam Proses Seleksi'
  | 'Lulus Seleksi'
  | 'Cadangan'
  | 'Tidak Lulus';

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'select' | 'date';

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
  exactDigits?: number;
}

export type StandardFormFieldKey =
  | 'pasFotoDataUrl'
  | 'namaLengkap'
  | 'namaPanggilan'
  | 'agama'
  | 'tempatLahir'
  | 'tanggalLahir'
  | 'jenisKelamin'
  | 'nisn'
  | 'nik'
  | 'noKk'
  | 'anakKe'
  | 'jumlahSaudara'
  | 'jalurPendaftaran'
  | 'asalSekolah'
  | 'jenisPrestasi'
  | 'golDarah'
  | 'tinggiBadan'
  | 'beratBadan'
  | 'alergi'
  | 'alamatJalan'
  | 'alamatRt'
  | 'alamatRw'
  | 'alamatDesa'
  | 'alamatKecamatan'
  | 'alamatKota'
  | 'alamatProvinsi'
  | 'namaAyah'
  | 'tempatLahirAyah'
  | 'tanggalLahirAyah'
  | 'nikAyah'
  | 'statusAyah'
  | 'pekerjaanAyah'
  | 'pendidikanAyah'
  | 'penghasilanAyah'
  | 'noHpAyah'
  | 'emailAyah'
  | 'namaIbu'
  | 'tempatLahirIbu'
  | 'tanggalLahirIbu'
  | 'nikIbu'
  | 'statusIbu'
  | 'pekerjaanIbu'
  | 'pendidikanIbu'
  | 'penghasilanIbu'
  | 'noHpIbu'
  | 'emailIbu'
  | 'alamatOrtuJalan'
  | 'alamatOrtuRt'
  | 'alamatOrtuRw'
  | 'alamatOrtuDesa'
  | 'alamatOrtuKecamatan'
  | 'alamatOrtuKota'
  | 'alamatOrtuProvinsi'
  | 'pengajianDaerah'
  | 'pengajianDesa'
  | 'pengajianKelompok';

export type StandardFieldRequiredMap = Record<StandardFormFieldKey, boolean>;

export interface UnitFormConfig {
  unit: UnitId;
  quota: number;
  quotaPutra?: number;
  quotaPutri?: number;
  instructions: string;
  requiredDocs: string[];
  fields: CustomFieldDefinition[];
  requiredFields?: Partial<Record<StandardFormFieldKey, boolean>>;
}

export type FormSchemaConfig = Record<UnitId, UnitFormConfig>;

export type UnitSpecificData = Record<string, string | undefined>;

export interface RegistrationInput {
  unit: UnitId;
  // INFO PENDAFTARAN SISWA
  namaLengkap: string;
  namaPanggilan: string;
  agama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: Gender;
  nisn: string;
  nik: string;
  noKk: string;
  anakKe: string;
  jumlahSaudara: string;
  pasFotoDataUrl: string;

  // Riwayat Siswa
  asalSekolah: string;
  jenisPrestasi: string;
  golDarah: string;
  tinggiBadan: string;
  beratBadan: string;
  alergi: string;

  // Alamat Lengkap Siswa
  alamatJalan: string;
  alamatRt: string;
  alamatRw: string;
  alamatDesa: string;
  alamatKecamatan: string;
  alamatKota: string;
  alamatProvinsi: string;
  alamatLengkap: string;

  // INFO ORANG TUA / WALI - Ayah
  namaAyah: string;
  tempatLahirAyah: string;
  tanggalLahirAyah: string;
  nikAyah: string;
  statusAyah: ParentLifeStatus;
  pekerjaanAyah: string;
  pendidikanAyah: string;
  penghasilanAyah: string;
  noHpAyah: string;
  emailAyah: string;

  // INFO ORANG TUA / WALI - Ibu
  namaIbu: string;
  tempatLahirIbu: string;
  tanggalLahirIbu: string;
  nikIbu: string;
  statusIbu: ParentLifeStatus;
  pekerjaanIbu: string;
  pendidikanIbu: string;
  penghasilanIbu: string;
  noHpIbu: string;
  emailIbu: string;

  // Alamat Lengkap Orang Tua / Wali
  alamatOrtuJalan: string;
  alamatOrtuRt: string;
  alamatOrtuRw: string;
  alamatOrtuDesa: string;
  alamatOrtuKecamatan: string;
  alamatOrtuKota: string;
  alamatOrtuProvinsi: string;

  // INFO PENGAJIAN
  pengajianDaerah: string;
  pengajianDesa: string;
  pengajianKelompok: string;

  // Kontak & Jalur
  noWhatsapp: string;
  jalurPendaftaran: JalurPendaftaran;
  unitData: UnitSpecificData;
}

export interface RegistrationRecord extends RegistrationInput {
  id: string;
  noPendaftaran: string;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
  statusVerifikasi: 'Menunggu Verifikasi Berkas' | 'Terverifikasi Panitia';
  statusSeleksi: SelectionStatus;
  nilaiSeleksi?: string;
  catatanSeleksi?: string;
  diseleksiAt?: string;
}

export interface UnitConfig {
  id: UnitId;
  shortName: string;
  fullName: string;
  sheetTabName: string;
  codePrefix: string;
  ageRange: string;
  quota: number;
  quotaPutra?: number;
  quotaPutri?: number;
  tagline: string;
  requiredDocs: string[];
}

export interface UnitStat {
  unit: UnitId;
  shortName: string;
  fullName: string;
  count: number;
  quota: number;
  remaining: number;
  mukimCount: number;
  syncedCount: number;
  maleCount?: number;
  femaleCount?: number;
  quotaPutra?: number;
  quotaPutri?: number;
  remainingPutra?: number;
  remainingPutri?: number;
}

export interface DashboardStats {
  totalCount: number;
  totalQuota: number;
  totalSynced: number;
  totalPending: number;
  byUnit: Record<UnitId, UnitStat>;
  updatedAt: string;
}

export type SheetsSyncMode = 'unified' | 'per_unit';

export interface UnitSheetsTarget {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  appsScriptUrl: string;
}

export interface SheetsPublicConfig {
  syncMode: SheetsSyncMode;
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  autoSyncEnabled: boolean;
  appsScriptUrl: string;
  lastSyncedAt: string | null;
  unitTargets: Record<UnitId, UnitSheetsTarget>;
}

export interface ValidationErrors {
  [field: string]: string;
}
