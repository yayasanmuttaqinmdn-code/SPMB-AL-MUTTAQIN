import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { RegistrationRecord, UnitFormConfig } from '../types/spmb.ts';
import {
  ACADEMIC_YEAR,
  composeAddress,
  DEFAULT_FORM_CONFIG,
  getUnitDisplayPairs,
  getUnitLogoPath,
  INSTITUTION_LOCATION,
  INSTITUTION_NAME,
  normalizeRegistrationRecord,
  UNIT_CONFIGS,
} from './spmbLogic.ts';

async function loadImageAsJpegDataUrl(src: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = window.setTimeout(() => resolve(null), 3000);
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const size = 240;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        const scale = Math.min((size - 8) / img.naturalWidth, (size - 8) / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function formatDateId(isoOrDate: string): string {
  if (!isoOrDate) return '-';
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return isoOrDate;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateLong(isoOrDate: string): string {
  if (!isoOrDate) return '-';
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return isoOrDate;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export async function generateQrDataUrl(record: RegistrationRecord): Promise<string> {
  const payload = JSON.stringify({
    no: record.noPendaftaran,
    lembaga: UNIT_CONFIGS[record.unit].shortName,
    nama: record.namaLengkap,
    nik: record.nik,
  });

  return QRCode.toDataURL(payload, {
    width: 180,
    margin: 1,
    color: {
      dark: '#14532D',
      light: '#FFFFFF',
    },
  });
}

export async function downloadRegistrationPdf(
  rawRecord: RegistrationRecord,
  unitFormConfig?: UnitFormConfig
): Promise<void> {
  const record = normalizeRegistrationRecord(rawRecord);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const unitCfg = UNIT_CONFIGS[record.unit];
  const activeFormCfg = unitFormConfig || DEFAULT_FORM_CONFIG[record.unit];
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const unitLogoDataUrl = await loadImageAsJpegDataUrl(getUnitLogoPath(record.unit));

  // Kop Surat Header
  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, pageWidth, 6, 'F');

  let headerTextX = marginX;
  if (unitLogoDataUrl) {
    try {
      doc.addImage(unitLogoDataUrl, 'JPEG', marginX, 9.5, 19, 19);
      headerTextX = marginX + 22;
    } catch {
      headerTextX = marginX;
    }
  }

  doc.setTextColor(20, 83, 45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text(INSTITUTION_NAME.toUpperCase(), headerTextX, 15);

  doc.setFontSize(9.5);
  doc.setTextColor(146, 108, 21);
  doc.text(`PANITIA SPMB — ${unitCfg.fullName.toUpperCase()}`, headerTextX, 20.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(87, 91, 86);
  doc.text(`${INSTITUTION_LOCATION} · Tahun Ajaran ${ACADEMIC_YEAR}`, headerTextX, 25);

  // Optional 3x4 Pas Foto next to QR Code
  if (record.pasFotoDataUrl) {
    try {
      const photoX = pageWidth - marginX - 38;
      doc.setDrawColor(212, 217, 212);
      doc.setLineWidth(0.3);
      doc.addImage(record.pasFotoDataUrl, 'JPEG', photoX, 9, 15, 20);
      doc.rect(photoX, 9, 15, 20);
    } catch {
      // Ignore malformed image fallback gracefully
    }
  }

  // QR Code at top-right
  try {
    const qrUrl = await generateQrDataUrl(record);
    doc.addImage(qrUrl, 'PNG', pageWidth - marginX - 20, 9, 20, 20);
  } catch {
    doc.setDrawColor(20, 83, 45);
    doc.rect(pageWidth - marginX - 20, 9, 20, 20);
  }

  doc.setDrawColor(20, 83, 45);
  doc.setLineWidth(0.5);
  doc.line(marginX, 31, pageWidth - marginX, 31);

  // Meta Box
  doc.setFillColor(246, 247, 246);
  doc.setDrawColor(214, 218, 214);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, 34, contentWidth, 14, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(87, 91, 86);
  doc.text('Nomor Pendaftaran', marginX + 3, 39);
  doc.text('Lembaga Tujuan', marginX + 68, 39);
  doc.text('Tanggal Daftar', marginX + 125, 39);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 83, 45);
  doc.text(record.noPendaftaran, marginX + 3, 44.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 26, 24);
  doc.text(unitCfg.shortName, marginX + 68, 44.5);
  doc.text(formatDateLong(record.createdAt), marginX + 125, 44.5);

  let y = 52;

  const ensureSpace = (needed: number) => {
    if (y + needed > 282) {
      doc.addPage();
      y = 14;
    }
  };

  const drawGreenBanner = (title: string) => {
    ensureSpace(12);
    doc.setFillColor(20, 83, 45);
    doc.rect(marginX, y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, y + 4.2, { align: 'center' });
    y += 9;
  };

  const drawSingleRow = (label: string, value: string, startX = marginX, labelWidth = 48, maxWidth = contentWidth) => {
    ensureSpace(6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(65, 70, 67);
    doc.text(label, startX + 1, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 24, 21);
    const wrapped = doc.splitTextToSize(`: ${value || '-'}`, maxWidth - labelWidth - 2);
    doc.text(wrapped, startX + labelWidth, y);
    y += Math.max(4.4, wrapped.length * 3.8 + 0.8);
  };

  const drawTwoColumnRows = (
    leftTitle: string | null,
    rightTitle: string | null,
    leftRows: Array<[string, string]>,
    rightRows: Array<[string, string]>
  ) => {
    const colWidth = (contentWidth - 6) / 2;
    const leftX = marginX;
    const rightX = marginX + colWidth + 6;
    const labelW = 36;

    if (leftTitle || rightTitle) {
      ensureSpace(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(20, 83, 45);
      if (leftTitle) doc.text(leftTitle, leftX + colWidth / 2, y, { align: 'center' });
      if (rightTitle) doc.text(rightTitle, rightX + colWidth / 2, y, { align: 'center' });
      y += 5;
    }

    const maxLen = Math.max(leftRows.length, rightRows.length);
    for (let i = 0; i < maxLen; i += 1) {
      const l = leftRows[i];
      const r = rightRows[i];
      ensureSpace(6);
      let rowHeight = 4.4;

      if (l) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(65, 70, 67);
        doc.text(l[0], leftX + 1, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 24, 21);
        const wrappedL = doc.splitTextToSize(`: ${l[1] || '-'}`, colWidth - labelW - 1);
        doc.text(wrappedL, leftX + labelW, y);
        rowHeight = Math.max(rowHeight, wrappedL.length * 3.7 + 0.8);
      }

      if (r) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(65, 70, 67);
        doc.text(r[0], rightX + 1, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 24, 21);
        const wrappedR = doc.splitTextToSize(`: ${r[1] || '-'}`, colWidth - labelW - 1);
        doc.text(wrappedR, rightX + labelW, y);
        rowHeight = Math.max(rowHeight, wrappedR.length * 3.7 + 0.8);
      }

      y += rowHeight;
    }
    y += 2;
  };

  // SECTION 1: INFO PENDAFTARAN SISWA
  drawGreenBanner('INFO PENDAFTARAN SISWA');
  drawSingleRow('Nama Lengkap', record.namaLengkap);
  drawSingleRow('Nama Panggilan', record.namaPanggilan || '-');
  drawSingleRow('Agama', record.agama || 'ISLAM');
  drawSingleRow(
    'Tempat Tanggal Lahir',
    `${record.tempatLahir || '-'}, ${formatDateId(record.tanggalLahir)}`
  );
  drawSingleRow('Jenis Kelamin', record.jenisKelamin);
  drawSingleRow('NISN', record.nisn || '-');
  drawSingleRow('NIK', record.nik);
  drawSingleRow('No KK', record.noKk || '-');
  drawSingleRow('Anak Ke', record.anakKe);
  drawSingleRow('Jumlah Saudara Kandung', record.jumlahSaudara || '-');
  y += 2;

  drawTwoColumnRows(
    'Riwayat Siswa',
    'Alamat Lengkap',
    [
      ['Asal Sekolah', record.asalSekolah || '-'],
      ['Prestasi Diraih', record.jenisPrestasi || '-'],
      ['Gol Darah', record.golDarah || 'Tidak Tahu'],
      ['Tinggi Badan', record.tinggiBadan ? `${record.tinggiBadan} cm` : '-'],
      ['Berat Badan', record.beratBadan ? `${record.beratBadan} kg` : '-'],
      ['Alergi', record.alergi || '-'],
    ],
    [
      ['Jalan', record.alamatJalan || record.alamatLengkap || '-'],
      ['Rt', record.alamatRt || '-'],
      ['Rw', record.alamatRw || '-'],
      ['Desa/Kelurahan', record.alamatDesa || '-'],
      ['Kecamatan', record.alamatKecamatan || '-'],
      ['Kota/Kabupaten', record.alamatKota || '-'],
      ['Provinsi', record.alamatProvinsi || '-'],
    ]
  );

  // SECTION 2: INFO ORANG TUA / WALI
  drawGreenBanner('INFO ORANG TUA / WALI');
  drawTwoColumnRows(
    null,
    null,
    [
      ['Nama Ayah / Wali', record.namaAyah || '-'],
      [
        'Tempat Tgl Lahir',
        `${record.tempatLahirAyah || '-'}${record.tanggalLahirAyah ? `, ${formatDateId(record.tanggalLahirAyah)}` : ''}`,
      ],
      ['NIK Ayah', record.nikAyah || '-'],
      ['Status', record.statusAyah],
      ['Pekerjaan Ayah', record.pekerjaanAyah || '-'],
      ['Pendidikan Terakhir', record.pendidikanAyah || '-'],
      ['Penghasilan Ayah', record.penghasilanAyah || '-'],
      ['No. Hp', record.noHpAyah || record.noWhatsapp || '-'],
      ['Alamat Email', record.emailAyah || '-'],
    ],
    [
      ['Nama Ibu / Wali', record.namaIbu || '-'],
      [
        'Tempat Tgl Lahir',
        `${record.tempatLahirIbu || '-'}${record.tanggalLahirIbu ? `, ${formatDateId(record.tanggalLahirIbu)}` : ''}`,
      ],
      ['NIK Ibu', record.nikIbu || '-'],
      ['Status', record.statusIbu],
      ['Pekerjaan Ibu', record.pekerjaanIbu || '-'],
      ['Pendidikan Terakhir', record.pendidikanIbu || '-'],
      ['Penghasilan Ibu', record.penghasilanIbu || '-'],
      ['No. Hp', record.noHpIbu || '-'],
      ['Alamat Email', record.emailIbu || '-'],
    ]
  );

  ensureSpace(34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text('Alamat Lengkap Orang Tua / Wali', pageWidth / 2, y, { align: 'center' });
  y += 5;

  const ortuSummary = composeAddress({
    jalan: record.alamatOrtuJalan,
    rt: record.alamatOrtuRt,
    rw: record.alamatOrtuRw,
    desa: record.alamatOrtuDesa,
    kecamatan: record.alamatOrtuKecamatan,
    kota: record.alamatOrtuKota,
    provinsi: record.alamatOrtuProvinsi,
  });

  drawSingleRow('Jalan', record.alamatOrtuJalan || ortuSummary || '-');
  drawSingleRow('Rt / Rw', `${record.alamatOrtuRt || '-'} / ${record.alamatOrtuRw || '-'}`);
  drawSingleRow('Desa/Kelurahan', record.alamatOrtuDesa || '-');
  drawSingleRow('Kecamatan', record.alamatOrtuKecamatan || '-');
  drawSingleRow('Kota/Kabupaten', record.alamatOrtuKota || '-');
  drawSingleRow('Provinsi', record.alamatOrtuProvinsi || '-');
  y += 2;

  // SECTION 3: INFO PENGAJIAN
  drawGreenBanner('INFO PENGAJIAN');
  drawSingleRow('Daerah', record.pengajianDaerah || '-');
  drawSingleRow('Desa', record.pengajianDesa || '-');
  drawSingleRow('Kelompok', record.pengajianKelompok || '-');
  y += 2;

  // SECTION 4: DATA KHUSUS LEMBAGA (if configured by Admin)
  const unitPairs = getUnitDisplayPairs(record.unit, record.unitData, activeFormCfg);
  if (unitPairs.length > 0) {
    drawGreenBanner(`KEPERLUAN DATA KHUSUS (${unitCfg.shortName.toUpperCase()})`);
    for (const pair of unitPairs) {
      drawSingleRow(pair.label, pair.value);
    }
    y += 2;
  }

  // STATUS SELEKSI PANITIA
  drawGreenBanner('STATUS VERIFIKASI & SELEKSI PANITIA');
  drawSingleRow('Status Berkas', record.statusVerifikasi);
  drawSingleRow('Keputusan Seleksi', record.statusSeleksi || 'Belum Diseleksi');
  if (record.nilaiSeleksi) {
    drawSingleRow('Nilai / Hasil Tes', record.nilaiSeleksi);
  }
  if (record.catatanSeleksi) {
    drawSingleRow('Catatan Panitia', record.catatanSeleksi);
  }
  y += 2;

  // Berkas & Tanda Tangan
  ensureSpace(46);
  doc.setDrawColor(214, 218, 214);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(24, 26, 24);
  doc.text('KELENGKAPAN BERKAS DAFTAR ULANG:', marginX, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(65, 68, 64);
  const docsList =
    activeFormCfg.requiredDocs.length > 0 ? activeFormCfg.requiredDocs : unitCfg.requiredDocs;
  for (const item of docsList) {
    ensureSpace(5);
    doc.text(`[  ] ${item}`, marginX + 2, y);
    y += 4.2;
  }

  ensureSpace(28);
  const sigY = y + 6;
  doc.setFontSize(8);
  doc.setTextColor(24, 26, 24);
  doc.text('Orang Tua / Wali Calon Murid,', marginX + 8, sigY);
  doc.text(`Madiun, ${formatDateLong(new Date().toISOString())}`, pageWidth - marginX - 58, sigY - 4);
  doc.text('Panitia SPMB PP Muttaqin,', pageWidth - marginX - 58, sigY);

  doc.line(marginX + 8, sigY + 15, marginX + 60, sigY + 15);
  doc.line(pageWidth - marginX - 58, sigY + 15, pageWidth - marginX - 6, sigY + 15);

  doc.setFont('helvetica', 'bold');
  doc.text(record.namaAyah || record.namaIbu, marginX + 8, sigY + 19.5);
  doc.text('Sekretariat SPMB Muttaqin', pageWidth - marginX - 58, sigY + 19.5);

  const safeName = record.namaLengkap
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`Bukti-Pendaftaran-${record.noPendaftaran}-${safeName || 'santri'}.pdf`);
}
