import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRegistrationPdfDocument } from './pdfGenerator.ts';
import { DEFAULT_FORM_CONFIG, normalizeRegistrationInput } from './spmbLogic.ts';
import type { RegistrationRecord } from '../types/spmb.ts';

const SAMPLE_PHOTO_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

function makeSampleRecord(overrides: Partial<RegistrationRecord> = {}): RegistrationRecord {
  const base = normalizeRegistrationInput({
    unit: 'SMP',
    namaLengkap: 'Muhammad Abdillah Muttaqin',
    namaPanggilan: 'Abdillah',
    agama: 'ISLAM',
    tempatLahir: 'Kota Madiun',
    tanggalLahir: '2014-04-12',
    jenisKelamin: 'Laki-laki',
    nisn: '0123456789',
    nik: '3577011204140001',
    noKk: '3577010101100002',
    anakKe: '1',
    jumlahSaudara: '2',
    asalSekolah: 'SDIT Muttaqin Josenan',
    jenisPrestasi: 'Juara 1 MHQ Tingkat Kota',
    golDarah: 'O',
    tinggiBadan: '152',
    beratBadan: '44',
    alergi: '-',
    alamatJalan: 'Jl. Serayu Barat No. 9',
    alamatRt: '048',
    alamatRw: '015',
    alamatDesa: 'Taman',
    alamatKecamatan: 'Taman',
    alamatKota: 'Kota Madiun',
    alamatProvinsi: 'Jawa Timur',
    namaAyah: 'Hendra Wijaya',
    tempatLahirAyah: 'Madiun',
    tanggalLahirAyah: '1982-06-15',
    nikAyah: '3577011506820001',
    statusAyah: 'Masih Hidup',
    pekerjaanAyah: 'Wiraswasta',
    pendidikanAyah: 'S1 / D4',
    penghasilanAyah: 'Rp.2.000.000 - Rp.5.000.000',
    noHpAyah: '081234567890',
    emailAyah: 'hendra@example.com',
    namaIbu: 'Siti Aminah',
    tempatLahirIbu: 'Magetan',
    tanggalLahirIbu: '1985-09-20',
    nikIbu: '3577016009850002',
    statusIbu: 'Masih Hidup',
    pekerjaanIbu: 'Mengurus Rumah Tangga',
    pendidikanIbu: 'SMA / SMK sederajat',
    penghasilanIbu: 'Tidak Berpenghasilan',
    noHpIbu: '081234567891',
    emailIbu: 'siti@example.com',
    pengajianDaerah: 'KOTA MADIUN',
    pengajianDesa: 'JOSENAN',
    pengajianKelompok: 'Muttaqin Utara',
    jalurPendaftaran: 'Tahfidz',
    pasFotoDataUrl: '',
    unitData: {},
  });

  return {
    ...base,
    id: 'rec-pdf-1',
    noPendaftaran: 'SPMB-2026-SMP-0001',
    statusVerifikasi: 'Menunggu Verifikasi Berkas',
    statusSeleksi: 'Belum Diseleksi',
    nilaiSeleksi: '',
    catatanSeleksi: '',
    createdAt: '2026-11-17T08:00:00.000Z',
    updatedAt: '2026-11-17T08:00:00.000Z',
    syncState: 'synced',
    ...overrides,
  };
}

test('buildRegistrationPdfDocument omits QR/barcode images completely and fits standard record on 1 crisp A4 page', async () => {
  // With neither unit logo nor pas foto supplied, zero /Image XObjects must exist (proving QR/barcode was removed)
  const docNoImages = await buildRegistrationPdfDocument(makeSampleRecord(), DEFAULT_FORM_CONFIG.SMP, {
    unitLogoDataUrl: null,
    printedAtIso: '2026-11-17T08:00:00.000Z',
  });
  const pdfNoImages = docNoImages.output();
  const imageMatchesZero = pdfNoImages.match(/\/Subtype\s*\/Image/g) || [];
  assert.equal(imageMatchesZero.length, 0, 'PDF must not embed any QR/barcode image');
  assert.equal(docNoImages.getNumberOfPages(), 1, 'Standard complete registration should fit cleanly on 1 A4 page');
  assert.ok(pdfNoImages.includes('SPMB-2026-SMP-0001'));
  assert.ok(pdfNoImages.includes('YAYASAN PONDOK PESANTREN MUTTAQIN JOSENAN MADIUN'));
  assert.ok(pdfNoImages.includes('Tahun Pelajaran 2027/2028'));
  assert.ok(pdfNoImages.includes('BUKTI PENDAFTARAN PESERTA DIDIK BARU'));
  assert.ok(pdfNoImages.includes('Jalur Pendaftaran'));
  assert.ok(pdfNoImages.includes('Tahfidz'));
  assert.ok(pdfNoImages.includes('Halaman 1 dari 1'));

  // With pasFotoDataUrl supplied (and no unitLogoDataUrl), only 1 image (the 3x4 photo) must exist — still no QR/barcode
  const docWithPhoto = await buildRegistrationPdfDocument(
    makeSampleRecord({ pasFotoDataUrl: SAMPLE_PHOTO_DATA_URL }),
    DEFAULT_FORM_CONFIG.SMP,
    {
      unitLogoDataUrl: null,
      printedAtIso: '2026-11-17T08:00:00.000Z',
    }
  );
  const pdfWithPhoto = docWithPhoto.output();
  const imageMatchesOne = pdfWithPhoto.match(/\/Subtype\s*\/Image/g) || [];
  assert.equal(imageMatchesOne.length, 1, 'Only the Pas Foto 3x4 image should be embedded (no QR/barcode)');
});

test('buildRegistrationPdfDocument handles empty optional parent fields and wraps multi-page custom fields gracefully', async () => {
  const minimalOptional = makeSampleRecord({
    unit: 'RA_TK',
    noPendaftaran: 'SPMB-2026-TK-0012',
    namaAyah: '',
    namaIbu: '',
    nik: '',
    noKk: '',
    noHpAyah: '',
    noHpIbu: '',
    noWhatsapp: '',
    emailAyah: '',
    emailIbu: '',
    asalSekolah: '',
    tinggiBadan: '',
    beratBadan: '',
    pengajianKelompok: '',
    unitData: {
      catatanKhusus: 'Calon santri membutuhkan pengenalan lingkungan bertahap di minggu pertama.',
      riwayatTambahan: 'Anak aktif dan senang kegiatan hafalan doa harian bersama kelompok.',
    },
  });

  const customCfg = {
    ...DEFAULT_FORM_CONFIG.RA_TK,
    fields: [
      { id: 'catatanKhusus', label: 'Catatan Khusus Orang Tua', type: 'textarea' as const, required: false },
      { id: 'riwayatTambahan', label: 'Keterangan Tambahan', type: 'textarea' as const, required: false },
    ],
  };

  const doc = await buildRegistrationPdfDocument(minimalOptional, customCfg, {
    unitLogoDataUrl: null,
    printedAtIso: '2026-11-17T08:00:00.000Z',
  });
  const pdfText = doc.output();

  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(pdfText.includes('Orang Tua / Wali'));
  assert.ok(pdfText.includes('KEPERLUAN DATA KHUSUS'));
  assert.equal((pdfText.match(/\/Subtype\s*\/Image/g) || []).length, 0);

  // Missing noPendaftaran should fall back to '-' instead of rendering 'undefined'
  const noRegDoc = await buildRegistrationPdfDocument(
    makeSampleRecord({ noPendaftaran: '' }),
    DEFAULT_FORM_CONFIG.SMP,
    {
      unitLogoDataUrl: null,
      printedAtIso: '2026-11-17T08:00:00.000Z',
    }
  );
  const noRegText = noRegDoc.output();
  assert.ok(!noRegText.includes('No. Pendaftaran: undefined'));
  assert.ok(noRegText.includes('No. Pendaftaran: -'));
});

