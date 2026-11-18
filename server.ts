import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  FormSchemaConfig,
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
  createEmptySheetsConfig,
  DEFAULT_FORM_CONFIG,
  extractSpreadsheetIdShared,
  findRegistrationsByName,
  generateRegistrationNumber,
  INSTITUTION_NAME,
  mergeRegistrationLists,
  normalizeFormSchemaConfig,
  normalizeRegistrationInput,
  normalizeRegistrationRecord,
  normalizeSheetsConfig,
  parsePulledSpreadsheetData,
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
}

const DEFAULT_SEED_RECORDS: RegistrationRecord[] = [
  normalizeRegistrationRecord({
    id: 'seed-tk-1',
    noPendaftaran: 'SPMB-2026-TK-0001',
    unit: 'RA_TK',
    namaLengkap: 'Aisyah Humaira Zahra',
    namaPanggilan: 'Aisyah',
    agama: 'ISLAM',
    tempatLahir: 'Madiun',
    tanggalLahir: '2021-05-14',
    jenisKelamin: 'Perempuan',
    nisn: '',
    nik: '3577015405210001',
    noKk: '3577010102180001',
    anakKe: '1',
    jumlahSaudara: '2',
    asalSekolah: '-',
    jenisPrestasi: '-',
    golDarah: 'O',
    tinggiBadan: '105',
    beratBadan: '17',
    alergi: 'Tidak ada',
    alamatJalan: 'Jl. Josenan Timur No. 14',
    alamatRt: '012',
    alamatRw: '004',
    alamatDesa: 'Josenan',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Jl. Josenan Timur No. 14, RT 012 / RW 004, Desa/Kel. Josenan, Kec. Taman, Kota Madiun, Jawa Timur',
    namaAyah: 'Ahmad Fauzi',
    tempatLahirAyah: 'Madiun',
    tanggalLahirAyah: '1990-02-11',
    nikAyah: '3577011102900001',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Wiraswasta',
    pendidikanAyah: 'S1 / D4',
    penghasilanAyah: 'Rp.2.000.000 - Rp.5.000.000',
    noHpAyah: '081234560001',
    emailAyah: 'ahmad.fauzi@example.com',
    namaIbu: 'Siti Aminah',
    tempatLahirIbu: 'Magetan',
    tanggalLahirIbu: '1992-07-19',
    nikIbu: '3577015907920001',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Guru PAUD',
    pendidikanIbu: 'S1 / D4',
    penghasilanIbu: 'Rp.1.000.000 - Rp.2.000.000',
    noHpIbu: '081234560011',
    emailIbu: 'siti.aminah@example.com',
    alamatOrtuJalan: 'Jl. Josenan Timur No. 14',
    alamatOrtuRt: '012',
    alamatOrtuRw: '004',
    alamatOrtuDesa: 'Josenan',
    alamatOrtuKecamatan: 'Taman',
    alamatOrtuKota: 'Kota Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'JOSENAN',
    pengajianKelompok: 'Muttaqin Utara',
    noWhatsapp: '081234560001',
    jalurPendaftaran: 'Reguler',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Terverifikasi Panitia',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-10T03:15:00.000Z',
    updatedAt: '2026-11-10T03:15:00.000Z',
    syncState: 'pending',
  }),
  normalizeRegistrationRecord({
    id: 'seed-tk-2',
    noPendaftaran: 'SPMB-2026-TK-0002',
    unit: 'RA_TK',
    namaLengkap: 'Muhammad Alif Pratama',
    namaPanggilan: 'Alif',
    agama: 'ISLAM',
    tempatLahir: 'Madiun',
    tanggalLahir: '2020-08-12',
    jenisKelamin: 'Laki-laki',
    nisn: '',
    nik: '3577011208200002',
    noKk: '3577010405190002',
    anakKe: '2',
    jumlahSaudara: '2',
    asalSekolah: '-',
    jenisPrestasi: '-',
    golDarah: 'A',
    tinggiBadan: '108',
    beratBadan: '18',
    alergi: 'Seafood ringan',
    alamatJalan: 'Perum Taman Indah Blok C-7',
    alamatRt: '008',
    alamatRw: '003',
    alamatDesa: 'Taman',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Perum Taman Indah Blok C-7, RT 008 / RW 003, Desa/Kel. Taman, Kec. Taman, Kota Madiun, Jawa Timur',
    namaAyah: 'Budi Santoso',
    tempatLahirAyah: 'Ngawi',
    tanggalLahirAyah: '1988-06-21',
    nikAyah: '3577012106880002',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Karyawan Swasta',
    pendidikanAyah: 'SMA / SMK sederajat',
    penghasilanAyah: 'Rp.2.000.000 - Rp.5.000.000',
    noHpAyah: '081234560002',
    emailAyah: 'budi.santoso@example.com',
    namaIbu: 'Rina Kusuma',
    tempatLahirIbu: 'Madiun',
    tanggalLahirIbu: '1991-09-14',
    nikIbu: '3577015409910002',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Mengurus Rumah Tangga',
    pendidikanIbu: 'SMA / SMK sederajat',
    penghasilanIbu: 'Tidak Berpenghasilan',
    noHpIbu: '081234560022',
    emailIbu: 'rina.kusuma@example.com',
    alamatOrtuJalan: 'Perum Taman Indah Blok C-7',
    alamatOrtuRt: '008',
    alamatOrtuRw: '003',
    alamatOrtuDesa: 'Taman',
    alamatOrtuKecamatan: 'Taman',
    alamatOrtuKota: 'Kota Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'TAMAN',
    pengajianKelompok: 'Taman Indah',
    noWhatsapp: '081234560002',
    jalurPendaftaran: 'Reguler',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-11T04:20:00.000Z',
    updatedAt: '2026-11-11T04:20:00.000Z',
    syncState: 'pending',
  }),
  normalizeRegistrationRecord({
    id: 'seed-sdit-1',
    noPendaftaran: 'SPMB-2026-SDIT-0001',
    unit: 'SDIT',
    namaLengkap: 'Zaidan Habibi Ramadhan',
    namaPanggilan: 'Zaidan',
    agama: 'ISLAM',
    tempatLahir: 'Madiun',
    tanggalLahir: '2019-03-09',
    jenisKelamin: 'Laki-laki',
    nisn: '0193210003',
    nik: '3577020903190003',
    noKk: '3577021002160003',
    anakKe: '1',
    jumlahSaudara: '3',
    asalSekolah: 'RA Muttaqin Josenan',
    jenisPrestasi: 'Juara 1 Lomba Adzan PAUD',
    golDarah: 'B',
    tinggiBadan: '122',
    beratBadan: '24',
    alergi: '-',
    alamatJalan: 'Jl. Setia Budi Barat No. 28',
    alamatRt: '015',
    alamatRw: '005',
    alamatDesa: 'Mojorejo',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Jl. Setia Budi Barat No. 28, RT 015 / RW 005, Desa/Kel. Mojorejo, Kec. Taman, Kota Madiun, Jawa Timur',
    namaAyah: 'Hendra Wijaya',
    tempatLahirAyah: 'Madiun',
    tanggalLahirAyah: '1986-04-17',
    nikAyah: '3577021704860003',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'ASN',
    pendidikanAyah: 'S1 / D4',
    penghasilanAyah: 'Rp.2.000.000 - Rp.5.000.000',
    noHpAyah: '085612340003',
    emailAyah: 'hendra.w@example.com',
    namaIbu: 'Nurul Hidayah',
    tempatLahirIbu: 'Ponorogo',
    tanggalLahirIbu: '1988-11-23',
    nikIbu: '3577026311880003',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Bidan',
    pendidikanIbu: 'D1 / D2 / D3',
    penghasilanIbu: 'Rp.2.000.000 - Rp.5.000.000',
    noHpIbu: '085612340033',
    emailIbu: 'nurul.h@example.com',
    alamatOrtuJalan: 'Jl. Setia Budi Barat No. 28',
    alamatOrtuRt: '015',
    alamatOrtuRw: '005',
    alamatOrtuDesa: 'Mojorejo',
    alamatOrtuKecamatan: 'Taman',
    alamatOrtuKota: 'Kota Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'MOJOREJO',
    pengajianKelompok: 'Al-Ikhlas',
    noWhatsapp: '085612340003',
    jalurPendaftaran: 'Tahfidz',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Terverifikasi Panitia',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-11T07:45:00.000Z',
    updatedAt: '2026-11-11T07:45:00.000Z',
    syncState: 'pending',
  }),
  normalizeRegistrationRecord({
    id: 'seed-sdit-2',
    noPendaftaran: 'SPMB-2026-SDIT-0002',
    unit: 'SDIT',
    namaLengkap: 'Khansa Nabila Putri',
    namaPanggilan: 'Khansa',
    agama: 'ISLAM',
    tempatLahir: 'Magetan',
    tanggalLahir: '2019-07-21',
    jenisKelamin: 'Perempuan',
    nisn: '0193210004',
    nik: '3577026107190004',
    noKk: '3577021501170004',
    anakKe: '2',
    jumlahSaudara: '2',
    asalSekolah: 'TK Al-Hidayah Madiun',
    jenisPrestasi: '-',
    golDarah: 'Tidak Tahu',
    tinggiBadan: '119',
    beratBadan: '22',
    alergi: '-',
    alamatJalan: 'Jl. Raya Banjarejo No. 18',
    alamatRt: '004',
    alamatRw: '002',
    alamatDesa: 'Banjarejo',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Jl. Raya Banjarejo No. 18, RT 004 / RW 002, Desa/Kel. Banjarejo, Kec. Taman, Kota Madiun, Jawa Timur',
    namaAyah: 'Dwi Prasetyo',
    tempatLahirAyah: 'Magetan',
    tanggalLahirAyah: '1985-08-03',
    nikAyah: '3577020308850004',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Pedagang',
    pendidikanAyah: 'SMA / SMK sederajat',
    penghasilanAyah: 'Rp.1.000.000 - Rp.2.000.000',
    noHpAyah: '085612340004',
    emailAyah: 'dwi.p@example.com',
    namaIbu: 'Lestari Wahyuni',
    tempatLahirIbu: 'Madiun',
    tanggalLahirIbu: '1989-12-01',
    nikIbu: '3577024112890004',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Penjahit',
    pendidikanIbu: 'SMP sederajat',
    penghasilanIbu: 'Rp. 500.000 - Rp.1.000.000',
    noHpIbu: '085612340044',
    emailIbu: 'lestari.w@example.com',
    alamatOrtuJalan: 'Jl. Raya Banjarejo No. 18',
    alamatOrtuRt: '004',
    alamatOrtuRw: '002',
    alamatOrtuDesa: 'Banjarejo',
    alamatOrtuKecamatan: 'Taman',
    alamatOrtuKota: 'Kota Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'BANJAREJO',
    pengajianKelompok: 'Banjarejo Selatan',
    noWhatsapp: '085612340004',
    jalurPendaftaran: 'Reguler',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-12T02:10:00.000Z',
    updatedAt: '2026-11-12T02:10:00.000Z',
    syncState: 'pending',
  }),
  normalizeRegistrationRecord({
    id: 'seed-smp-1',
    noPendaftaran: 'SPMB-2026-SMP-0001',
    unit: 'SMP',
    namaLengkap: 'Luqman Hakim Al-Faruq',
    namaPanggilan: 'Luqman',
    agama: 'ISLAM',
    tempatLahir: 'Ponorogo',
    tanggalLahir: '2014-02-15',
    jenisKelamin: 'Laki-laki',
    nisn: '0143210005',
    nik: '3577031502140005',
    noKk: '3577031108120005',
    anakKe: '1',
    jumlahSaudara: '2',
    asalSekolah: 'SDIT Muttaqin Josenan',
    jenisPrestasi: 'Tahfidz 2 Juz',
    golDarah: 'O',
    tinggiBadan: '148',
    beratBadan: '42',
    alergi: '-',
    alamatJalan: 'Jl. Soekarno-Hatta No. 88',
    alamatRt: '021',
    alamatRw: '007',
    alamatDesa: 'Demangan',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Jl. Soekarno-Hatta No. 88, RT 021 / RW 007, Desa/Kel. Demangan, Kec. Taman, Kota Madiun, Jawa Timur',
    namaAyah: 'Ustadz Ridwan Malik',
    tempatLahirAyah: 'Ponorogo',
    tanggalLahirAyah: '1982-05-10',
    nikAyah: '3577031005820005',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Pendidik',
    pendidikanAyah: 'S1 / D4',
    penghasilanAyah: 'Rp.2.000.000 - Rp.5.000.000',
    noHpAyah: '081398760005',
    emailAyah: 'ridwan.m@example.com',
    namaIbu: 'Fatimah Azzahra',
    tempatLahirIbu: 'Madiun',
    tanggalLahirIbu: '1985-01-20',
    nikIbu: '3577036001850005',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Mengurus Rumah Tangga',
    pendidikanIbu: 'SMA / SMK sederajat',
    penghasilanIbu: 'Tidak Berpenghasilan',
    noHpIbu: '081398760055',
    emailIbu: 'fatimah.a@example.com',
    alamatOrtuJalan: 'Jl. Soekarno-Hatta No. 88',
    alamatOrtuRt: '021',
    alamatOrtuRw: '007',
    alamatOrtuDesa: 'Demangan',
    alamatOrtuKecamatan: 'Taman',
    alamatOrtuKota: 'Kota Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'DEMANGAN',
    pengajianKelompok: 'Demangan Timur',
    noWhatsapp: '081398760005',
    jalurPendaftaran: 'Tahfidz',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Terverifikasi Panitia',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-12T08:00:00.000Z',
    updatedAt: '2026-11-12T08:00:00.000Z',
    syncState: 'pending',
  }),
  normalizeRegistrationRecord({
    id: 'seed-smp-2',
    noPendaftaran: 'SPMB-2026-SMP-0002',
    unit: 'SMP',
    namaLengkap: 'Salma Maulida Khoirunnisa',
    namaPanggilan: 'Salma',
    agama: 'ISLAM',
    tempatLahir: 'Ngawi',
    tanggalLahir: '2013-11-18',
    jenisKelamin: 'Perempuan',
    nisn: '0133210006',
    nik: '3577035811130006',
    noKk: '3577030904100006',
    anakKe: '3',
    jumlahSaudara: '3',
    asalSekolah: 'MIN 1 Kota Madiun',
    jenisPrestasi: 'Juara Kaligrafi Tingkat Kota',
    golDarah: 'A',
    tinggiBadan: '146',
    beratBadan: '40',
    alergi: '-',
    alamatJalan: 'Jl. Pahlawan No. 41',
    alamatRt: '005',
    alamatRw: '002',
    alamatDesa: 'Demangan',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Jl. Pahlawan No. 41, RT 005 / RW 002, Desa/Kel. Demangan, Kec. Taman, Kota Madiun, Jawa Timur',
    namaAyah: 'Slamet Riyadi',
    tempatLahirAyah: 'Ngawi',
    tanggalLahirAyah: '1979-09-12',
    nikAyah: '3577031209790006',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Pegawai BUMN',
    pendidikanAyah: 'S1 / D4',
    penghasilanAyah: '> Rp.5.000.000',
    noHpAyah: '081398760006',
    emailAyah: 'slamet.r@example.com',
    namaIbu: 'Yulianti',
    tempatLahirIbu: 'Madiun',
    tanggalLahirIbu: '1983-07-04',
    nikIbu: '3577034407830006',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Perawat',
    pendidikanIbu: 'D1 / D2 / D3',
    penghasilanIbu: 'Rp.2.000.000 - Rp.5.000.000',
    noHpIbu: '081398760066',
    emailIbu: 'yulianti@example.com',
    alamatOrtuJalan: 'Jl. Pahlawan No. 41',
    alamatOrtuRt: '005',
    alamatOrtuRw: '002',
    alamatOrtuDesa: 'Demangan',
    alamatOrtuKecamatan: 'Taman',
    alamatOrtuKota: 'Kota Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'DEMANGAN',
    pengajianKelompok: 'Pahlawan',
    noWhatsapp: '081398760006',
    jalurPendaftaran: 'Prestasi',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-13T05:30:00.000Z',
    updatedAt: '2026-11-13T05:30:00.000Z',
    syncState: 'pending',
  }),
  normalizeRegistrationRecord({
    id: 'seed-sma-1',
    noPendaftaran: 'SPMB-2026-SMA-0001',
    unit: 'SMA',
    namaLengkap: 'Fathan Syauqi Mubarak',
    namaPanggilan: 'Fathan',
    agama: 'ISLAM',
    tempatLahir: 'Madiun',
    tanggalLahir: '2011-06-04',
    jenisKelamin: 'Laki-laki',
    nisn: '0115540007',
    nik: '3577040406110007',
    noKk: '3577040702090007',
    anakKe: '1',
    jumlahSaudara: '2',
    asalSekolah: 'SMP Muttaqin Josenan',
    jenisPrestasi: 'Juara 2 OSN Matematika Kota Madiun',
    golDarah: 'AB',
    tinggiBadan: '166',
    beratBadan: '54',
    alergi: '-',
    alamatJalan: 'Jl. Raya Josenan No. 102',
    alamatRt: '010',
    alamatRw: '003',
    alamatDesa: 'Josenan',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Jl. Raya Josenan No. 102, RT 010 / RW 003, Desa/Kel. Josenan, Kec. Taman, Kota Madiun, Jawa Timur',
    namaAyah: 'Drs. Muhammad Iqbal',
    tempatLahirAyah: 'Surabaya',
    tanggalLahirAyah: '1976-03-22',
    nikAyah: '3577042203760007',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Dosen',
    pendidikanAyah: 'S2 / S3',
    penghasilanAyah: '> Rp.5.000.000',
    noHpAyah: '082144550007',
    emailAyah: 'm.iqbal@example.com',
    namaIbu: 'Dra. Aminatus Sholihah',
    tempatLahirIbu: 'Madiun',
    tanggalLahirIbu: '1978-08-19',
    nikIbu: '3577045908780007',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Guru MAN',
    pendidikanIbu: 'S1 / D4',
    penghasilanIbu: 'Rp.2.000.000 - Rp.5.000.000',
    noHpIbu: '082144550077',
    emailIbu: 'aminatus@example.com',
    alamatOrtuJalan: 'Jl. Raya Josenan No. 102',
    alamatOrtuRt: '010',
    alamatOrtuRw: '003',
    alamatOrtuDesa: 'Josenan',
    alamatOrtuKecamatan: 'Taman',
    alamatOrtuKota: 'Kota Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'JOSENAN',
    pengajianKelompok: 'Muttaqin Pusat',
    noWhatsapp: '082144550007',
    jalurPendaftaran: 'Prestasi',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Terverifikasi Panitia',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-13T09:15:00.000Z',
    updatedAt: '2026-11-13T09:15:00.000Z',
    syncState: 'pending',
  }),
  normalizeRegistrationRecord({
    id: 'seed-sma-2',
    noPendaftaran: 'SPMB-2026-SMA-0002',
    unit: 'SMA',
    namaLengkap: 'Nayla Hafizah Azzahro',
    namaPanggilan: 'Nayla',
    agama: 'ISLAM',
    tempatLahir: 'Caruban',
    tanggalLahir: '2011-09-09',
    jenisKelamin: 'Perempuan',
    nisn: '0115540008',
    nik: '3577044909110008',
    noKk: '3577041201100008',
    anakKe: '2',
    jumlahSaudara: '3',
    asalSekolah: 'MTsN 1 Madiun',
    jenisPrestasi: 'Hafalan 10 Juz Al-Quran',
    golDarah: 'B',
    tinggiBadan: '158',
    beratBadan: '48',
    alergi: '-',
    alamatJalan: 'Jl. Panglima Sudirman No. 15',
    alamatRt: '003',
    alamatRw: '001',
    alamatDesa: 'Mejayan',
    alamatKecamatan: 'Mejayan',
    alamatKota: 'Kab. Madiun',
    alamatProvinsi: 'Jawa Timur',
    alamatLengkap: 'Jl. Panglima Sudirman No. 15, RT 003 / RW 001, Desa/Kel. Mejayan, Kec. Mejayan, Kab. Madiun, Jawa Timur',
    namaAyah: 'Syamsul Ma arif',
    tempatLahirAyah: 'Madiun',
    tanggalLahirAyah: '1980-11-14',
    nikAyah: '3577041411800008',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Wiraswasta',
    pendidikanAyah: 'SMA / SMK sederajat',
    penghasilanAyah: 'Rp.2.000.000 - Rp.5.000.000',
    noHpAyah: '082144550008',
    emailAyah: 'syamsul.m@example.com',
    namaIbu: 'Endah Sulistyowati',
    tempatLahirIbu: 'Caruban',
    tanggalLahirIbu: '1984-04-28',
    nikIbu: '3577046804840008',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Mengurus Rumah Tangga',
    pendidikanIbu: 'SMA / SMK sederajat',
    penghasilanIbu: 'Tidak Berpenghasilan',
    noHpIbu: '082144550088',
    emailIbu: 'endah.s@example.com',
    alamatOrtuJalan: 'Jl. Panglima Sudirman No. 15',
    alamatOrtuRt: '003',
    alamatOrtuRw: '001',
    alamatOrtuDesa: 'Mejayan',
    alamatOrtuKecamatan: 'Mejayan',
    alamatOrtuKota: 'Kab. Madiun',
    alamatOrtuProvinsi: 'Jawa Timur',
    pengajianDaerah: 'KAB. MADIUN',
    pengajianDesa: 'MEJAYAN',
    pengajianKelompok: 'Mejayan Barat',
    noWhatsapp: '082144550008',
    jalurPendaftaran: 'Tahfidz',
    pasFotoDataUrl: '',
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
    unitData: {},
    createdAt: '2026-11-14T01:40:00.000Z',
    updatedAt: '2026-11-14T01:40:00.000Z',
    syncState: 'pending',
  }),
];

const DEFAULT_STATE: DatabaseState = {
  registrations: DEFAULT_SEED_RECORDS,
  sheetsConfig: createEmptySheetsConfig('unified'),
  formConfig: structuredClone(DEFAULT_FORM_CONFIG),
};

function applyEnvFallbackToSheetsConfig(cfg: SheetsPublicConfig): SheetsPublicConfig {
  const envUrl = (process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || '').trim();
  const envSheetId = extractSpreadsheetIdServer(
    process.env.SPREADSHEET_ID || process.env.VITE_SPREADSHEET_ID || ''
  );
  if (!envUrl && !envSheetId) return cfg;
  return normalizeSheetsConfig({
    ...cfg,
    appsScriptUrl: cfg.appsScriptUrl || envUrl,
    spreadsheetId: cfg.spreadsheetId || envSheetId,
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
    return [
      [`REKAP SPMB ${UNIT_CONFIGS[onlyUnit].fullName.toUpperCase()}`, INSTITUTION_NAME, `Tahun Ajaran ${ACADEMIC_YEAR}`],
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
  }
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
  app.use(express.json({ limit: '5mb' }));

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

  // Public read-only state (aggregate counts + form schema)
  app.get('/api/public/state', (_req, res) => {
    const db = readDb();
    res.json({
      stats: computeUnitStats(db.registrations, db.formConfig),
      formConfig: db.formConfig,
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
    const noPendaftaran = generateRegistrationNumber(input.unit, db.registrations, 2026);

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
    });
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

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SPMB PP Muttaqin server berjalan di http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal memulai server SPMB:', err);
  process.exit(1);
});
