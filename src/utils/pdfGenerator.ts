import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { RegistrationRecord, UnitFormConfig } from '../types/spmb.ts';
import {
  ACADEMIC_YEAR,
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
  if (!isoOrDate) return '';
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

function formatBirthPlaceDate(place?: string, dateStr?: string): string {
  const cleanPlace = (place || '').trim();
  const cleanDate = dateStr ? formatDateId(dateStr) : '';
  if (cleanPlace && cleanDate) return `${cleanPlace}, ${cleanDate}`;
  return cleanPlace || cleanDate || '-';
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

type PdfRow = [label: string, value: string];

export interface BuildRegistrationPdfOptions {
  unitLogoDataUrl?: string | null;
  printedAtIso?: string;
}

export async function buildRegistrationPdfDocument(
  rawRecord: RegistrationRecord,
  unitFormConfig?: UnitFormConfig,
  options?: BuildRegistrationPdfOptions
): Promise<jsPDF> {
  const record = normalizeRegistrationRecord(rawRecord);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const unitCfg = UNIT_CONFIGS[record.unit];
  const activeFormCfg = unitFormConfig || DEFAULT_FORM_CONFIG[record.unit];

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm
  const bottomLimit = pageHeight - 14; // reserve footer space

  const unitLogoDataUrl =
    options && 'unitLogoDataUrl' in options
      ? options.unitLogoDataUrl
      : await loadImageAsJpegDataUrl(getUnitLogoPath(record.unit));

  // Top Green & Gold Accent Bar
  doc.setFillColor(20, 83, 45);
  doc.rect(0, 0, pageWidth, 4, 'F');
  doc.setFillColor(146, 108, 21);
  doc.rect(0, 4, pageWidth, 0.7, 'F');

  // Kop Surat: Left Logo, Center/Left Text, Optional Pas Foto 3x4 on Right (NO Barcode / QR)
  const logoSize = 16;
  let headerTextX = marginX;
  if (unitLogoDataUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 226, 220);
      doc.setLineWidth(0.25);
      doc.roundedRect(marginX, 6.8, logoSize, logoSize, 1.5, 1.5, 'FD');
      doc.addImage(unitLogoDataUrl, 'JPEG', marginX + 0.7, 7.5, logoSize - 1.4, logoSize - 1.4);
      headerTextX = marginX + logoSize + 3.2;
    } catch {
      headerTextX = marginX;
    }
  }

  let hasPhoto = false;
  const photoW = 14.4;
  const photoH = 19.2;
  const photoX = pageWidth - marginX - photoW;
  const photoY = 6.2;
  if (record.pasFotoDataUrl) {
    try {
      doc.setDrawColor(195, 202, 195);
      doc.setLineWidth(0.35);
      doc.addImage(record.pasFotoDataUrl, 'JPEG', photoX, photoY, photoW, photoH);
      doc.rect(photoX, photoY, photoW, photoH);
      hasPhoto = true;
    } catch {
      hasPhoto = false;
    }
  }

  const headerTextMaxW = (hasPhoto ? photoX - 4 : pageWidth - marginX) - headerTextX;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(20, 83, 45);
  const instLines = doc.splitTextToSize(INSTITUTION_NAME.toUpperCase(), headerTextMaxW);
  doc.text(instLines, headerTextX, 11.2);

  const subY = 11.2 + (instLines.length - 1) * 4.0 + 4.3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);
  doc.setTextColor(146, 108, 21);
  const subLines = doc.splitTextToSize(
    `PANITIA SPMB — ${unitCfg.fullName.toUpperCase()}`,
    headerTextMaxW
  );
  doc.text(subLines, headerTextX, subY);

  const locY = subY + (subLines.length - 1) * 3.6 + 3.9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(78, 86, 81);
  doc.text(`${INSTITUTION_LOCATION} · Tahun Pelajaran ${ACADEMIC_YEAR}`, headerTextX, locY);

  // Double Kop-Surat Divider Line
  const dividerY = Math.max(hasPhoto ? 26.8 : 25.0, locY + 2.8);
  doc.setDrawColor(20, 83, 45);
  doc.setLineWidth(0.6);
  doc.line(marginX, dividerY, pageWidth - marginX, dividerY);
  doc.setDrawColor(220, 226, 220);
  doc.setLineWidth(0.2);
  doc.line(marginX, dividerY + 0.9, pageWidth - marginX, dividerY + 0.9);

  // Document Title
  let y = dividerY + 4.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.8);
  doc.setTextColor(17, 24, 21);
  doc.text('BUKTI PENDAFTARAN PESERTA DIDIK BARU', pageWidth / 2, y, { align: 'center' });
  y += 2.4;

  // 4-Column Registration Summary Strip
  const metaH = 11;
  doc.setFillColor(247, 249, 247);
  doc.setDrawColor(220, 226, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentWidth, metaH, 1.4, 1.4, 'FD');

  const regNumberText = (record.noPendaftaran || '').trim() || '-';

  const metaCols = [
    { label: 'Nomor Pendaftaran', value: regNumberText, width: 52, mono: true, accent: true },
    { label: 'Lembaga Tujuan', value: unitCfg.shortName, width: 38, mono: false, accent: false },
    {
      label: 'Jalur Pendaftaran',
      value: record.jalurPendaftaran || 'Reguler',
      width: 48,
      mono: false,
      accent: false,
    },
    {
      label: 'Tanggal Daftar',
      value: formatDateLong(record.createdAt),
      width: 48,
      mono: false,
      accent: false,
    },
  ];

  let metaX = marginX;
  metaCols.forEach((col, idx) => {
    if (idx > 0) {
      doc.setDrawColor(226, 230, 226);
      doc.setLineWidth(0.2);
      doc.line(metaX, y + 1.8, metaX, y + metaH - 1.8);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(78, 86, 81);
    doc.text(col.label, metaX + 3, y + 3.9);

    doc.setFont(col.mono ? 'courier' : 'helvetica', 'bold');
    doc.setFontSize(col.mono ? 8.6 : 8);
    if (col.accent) {
      doc.setTextColor(20, 83, 45);
    } else {
      doc.setTextColor(17, 24, 21);
    }
    const textLines = doc.splitTextToSize(col.value || '-', col.width - 6);
    doc.text(textLines[0] || '-', metaX + 3, y + 8.3);

    metaX += col.width;
  });

  y += metaH + 2.6;

  const pageBottomLimit = pageHeight - 11.5;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageBottomLimit) {
      doc.addPage();
      doc.setFillColor(20, 83, 45);
      doc.rect(0, 0, pageWidth, 2.5, 'F');
      y = 9;
    }
  };

  const drawSectionBar = (title: string, estimatedFollowHeight = 14) => {
    ensureSpace(5.9 + estimatedFollowHeight);
    doc.setFillColor(20, 83, 45);
    doc.roundedRect(marginX, y, contentWidth, 5.0, 0.9, 0.9, 'F');
    doc.setFillColor(146, 108, 21);
    doc.rect(marginX, y, 2, 5.0, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(255, 255, 255);
    doc.text(title, marginX + 4.2, y + 3.5);
    y += 5.8;
  };

  const measureRowsBlockHeight = (rows: PdfRow[], colW: number, labelW: number): number => {
    const valW = Math.max(20, colW - labelW - 4.5);
    let totalH = 0;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    for (const [, rawVal] of rows) {
      const lines = doc.splitTextToSize(rawVal || '-', valW);
      totalH += Math.max(3.7, lines.length * 3.0 + 0.7);
    }
    return totalH;
  };

  const drawKeyValueListInColumn = (
    rows: PdfRow[],
    startX: number,
    startY: number,
    colW: number,
    labelW: number
  ): number => {
    const labelX = startX + 2.5;
    const colonX = startX + labelW;
    const valX = colonX + 2;
    const valW = Math.max(20, colW - labelW - 4.5);
    let curY = startY;

    rows.forEach(([label, rawVal], idx) => {
      const valText = rawVal?.trim() ? rawVal.trim() : '-';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      const valLines = doc.splitTextToSize(valText, valW);
      const rowH = Math.max(3.7, valLines.length * 3.0 + 0.7);

      if (idx > 0) {
        doc.setDrawColor(238, 241, 238);
        doc.setLineWidth(0.15);
        doc.line(startX + 2, curY - 2.4, startX + colW - 2, curY - 2.4);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.0);
      doc.setTextColor(78, 86, 81);
      doc.text(label, labelX, curY);
      doc.text(':', colonX, curY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(17, 24, 21);
      doc.text(valLines, valX, curY);

      curY += rowH;
    });

    return curY;
  };

  const drawTwoColumnCard = (opts: {
    leftTitle?: string;
    rightTitle?: string;
    leftRows: PdfRow[];
    rightRows: PdfRow[];
    labelW?: number;
    sectionTitleBefore?: string;
  }) => {
    const gap = 3;
    const colW = (contentWidth - gap) / 2;
    const labelW = opts.labelW ?? 28;
    const hasTitles = Boolean(opts.leftTitle || opts.rightTitle);
    const titleBandH = hasTitles ? 4.8 : 0;

    const leftH = measureRowsBlockHeight(opts.leftRows, colW, labelW);
    const rightH = measureRowsBlockHeight(opts.rightRows, colW, labelW);
    const cardH = titleBandH + Math.max(leftH, rightH) + 2.4;

    if (opts.sectionTitleBefore) {
      drawSectionBar(opts.sectionTitleBefore, cardH);
    } else {
      ensureSpace(cardH);
    }

    const leftX = marginX;
    const rightX = marginX + colW + gap;
    const cardY = y;

    // Draw Left & Right Card Frames
    for (const [colX, titleText, rows] of [
      [leftX, opts.leftTitle, opts.leftRows],
      [rightX, opts.rightTitle, opts.rightRows],
    ] as Array<[number, string | undefined, PdfRow[]]>) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(220, 226, 220);
      doc.setLineWidth(0.25);
      doc.roundedRect(colX, cardY, colW, cardH, 1.2, 1.2, 'FD');

      if (hasTitles && titleText) {
        doc.setFillColor(244, 247, 244);
        doc.rect(colX + 0.15, cardY + 0.15, colW - 0.3, titleBandH - 0.2, 'F');
        doc.setDrawColor(220, 226, 220);
        doc.setLineWidth(0.2);
        doc.line(colX, cardY + titleBandH, colX + colW, cardY + titleBandH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(20, 83, 45);
        doc.text(titleText, colX + 2.5, cardY + 3.4);
      }

      drawKeyValueListInColumn(rows, colX, cardY + titleBandH + 3.5, colW, labelW);
    }

    y = cardY + cardH + 1.8;
  };

  const drawStripCard = (
    items: Array<{ label: string; value: string }>,
    sectionTitleBefore?: string
  ) => {
    const colW = contentWidth / items.length;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    let maxLines = 1;
    for (const item of items) {
      const lines = doc.splitTextToSize(item.value || '-', colW - 6);
      maxLines = Math.max(maxLines, lines.length);
    }
    const cardH = 6.2 + maxLines * 3.1;

    if (sectionTitleBefore) {
      drawSectionBar(sectionTitleBefore, cardH);
    } else {
      ensureSpace(cardH);
    }

    const cardY = y;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 226, 220);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, cardY, contentWidth, cardH, 1.2, 1.2, 'FD');

    items.forEach((item, idx) => {
      const cx = marginX + idx * colW;
      if (idx > 0) {
        doc.setDrawColor(232, 236, 232);
        doc.setLineWidth(0.2);
        doc.line(cx, cardY + 1.5, cx, cardY + cardH - 1.5);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(78, 86, 81);
      doc.text(item.label, cx + 3, cardY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(17, 24, 21);
      const valLines = doc.splitTextToSize(item.value?.trim() || '-', colW - 6);
      doc.text(valLines, cx + 3, cardY + 7.4);
    });

    y = cardY + cardH + 1.8;
  };

  // =========================================================================
  // 01. INFO PENDAFTARAN SISWA
  // =========================================================================
  drawTwoColumnCard({
    sectionTitleBefore: '01. INFO PENDAFTARAN SISWA',
    labelW: 29,
    leftRows: [
      ['Nama Lengkap', record.namaLengkap],
      ['Nama Panggilan', record.namaPanggilan || '-'],
      ['Tempat, Tgl Lahir', formatBirthPlaceDate(record.tempatLahir, record.tanggalLahir)],
      ['Jenis Kelamin', record.jenisKelamin],
      ['Agama', record.agama || '-'],
    ],
    rightRows: [
      ['NISN', record.nisn || '-'],
      ['NIK Siswa', record.nik || '-'],
      ['No. KK', record.noKk || '-'],
      ['Anak Ke-', record.anakKe || '-'],
      ['Jml Saudara', record.jumlahSaudara || '-'],
    ],
  });

  const fisikValue =
    record.tinggiBadan || record.beratBadan
      ? `${record.tinggiBadan || '-'} cm / ${record.beratBadan || '-'} kg`
      : '-';

  drawTwoColumnCard({
    leftTitle: 'Riwayat & Kesehatan Siswa',
    rightTitle: 'Alamat Lengkap Siswa',
    labelW: 27,
    leftRows: [
      ['Asal Sekolah', record.asalSekolah || '-'],
      ['Prestasi Diraih', record.jenisPrestasi || '-'],
      ['Golongan Darah', record.golDarah || '-'],
      ['Tinggi / Berat', fisikValue],
      ['Alergi', record.alergi || '-'],
    ],
    rightRows: [
      ['Jalan / Dusun', record.alamatJalan || record.alamatLengkap || '-'],
      ['RT / RW', `${record.alamatRt || '-'} / ${record.alamatRw || '-'}`],
      ['Desa / Kel.', record.alamatDesa || '-'],
      ['Kecamatan', record.alamatKecamatan || '-'],
      ['Kota / Kab.', record.alamatKota || '-'],
      ['Provinsi', record.alamatProvinsi || '-'],
    ],
  });

  // =========================================================================
  // 02. INFO ORANG TUA / WALI
  // =========================================================================
  drawTwoColumnCard({
    sectionTitleBefore: '02. INFO ORANG TUA / WALI',
    leftTitle: 'Data Ayah / Wali',
    rightTitle: 'Data Ibu / Wali',
    labelW: 26,
    leftRows: [
      ['Nama Ayah', record.namaAyah || '-'],
      ['Tempat, Tgl Lahir', formatBirthPlaceDate(record.tempatLahirAyah, record.tanggalLahirAyah)],
      ['NIK Ayah', record.nikAyah || '-'],
      ['Status', record.statusAyah || '-'],
      ['Pekerjaan', record.pekerjaanAyah || '-'],
      ['Pendidikan', record.pendidikanAyah || '-'],
      ['Penghasilan', record.penghasilanAyah || '-'],
      ['No. HP / WA', record.noHpAyah || record.noWhatsapp || '-'],
      ['Email', record.emailAyah || '-'],
    ],
    rightRows: [
      ['Nama Ibu', record.namaIbu || '-'],
      ['Tempat, Tgl Lahir', formatBirthPlaceDate(record.tempatLahirIbu, record.tanggalLahirIbu)],
      ['NIK Ibu', record.nikIbu || '-'],
      ['Status', record.statusIbu || '-'],
      ['Pekerjaan', record.pekerjaanIbu || '-'],
      ['Pendidikan', record.pendidikanIbu || '-'],
      ['Penghasilan', record.penghasilanIbu || '-'],
      ['No. HP / WA', record.noHpIbu || '-'],
      ['Email', record.emailIbu || '-'],
    ],
  });

  drawTwoColumnCard({
    leftTitle: 'Alamat Orang Tua / Wali (Bagian 1)',
    rightTitle: 'Alamat Orang Tua / Wali (Bagian 2)',
    labelW: 27,
    leftRows: [
      ['Jalan / Dusun', record.alamatOrtuJalan || '-'],
      ['RT / RW', `${record.alamatOrtuRt || '-'} / ${record.alamatOrtuRw || '-'}`],
      ['Desa / Kel.', record.alamatOrtuDesa || '-'],
    ],
    rightRows: [
      ['Kecamatan', record.alamatOrtuKecamatan || '-'],
      ['Kota / Kab.', record.alamatOrtuKota || '-'],
      ['Provinsi', record.alamatOrtuProvinsi || '-'],
    ],
  });

  // =========================================================================
  // 03. INFO PENGAJIAN
  // =========================================================================
  drawStripCard(
    [
      { label: 'Daerah Pengajian', value: record.pengajianDaerah || '-' },
      { label: 'Desa Pengajian', value: record.pengajianDesa || '-' },
      { label: 'Kelompok Pengajian', value: record.pengajianKelompok || '-' },
    ],
    '03. INFO PENGAJIAN'
  );

  // =========================================================================
  // 04. KEPERLUAN DATA KHUSUS JENJANG (Jika ada)
  // =========================================================================
  const unitPairs = getUnitDisplayPairs(record.unit, record.unitData, activeFormCfg);
  if (unitPairs.length > 0) {
    const leftPairs: PdfRow[] = [];
    const rightPairs: PdfRow[] = [];
    unitPairs.forEach((p, idx) => {
      if (idx % 2 === 0) leftPairs.push([p.label, p.value]);
      else rightPairs.push([p.label, p.value]);
    });
    drawTwoColumnCard({
      sectionTitleBefore: `04. KEPERLUAN DATA KHUSUS (${unitCfg.shortName.toUpperCase()})`,
      labelW: 32,
      leftRows: leftPairs,
      rightRows: rightPairs,
    });
  }

  // =========================================================================
  // 05. STATUS VERIFIKASI & SELEKSI PANITIA
  // =========================================================================
  const statusLeftRows: PdfRow[] = [['Status Berkas', record.statusVerifikasi]];
  const statusRightRows: PdfRow[] = [
    ['Keputusan Seleksi', record.statusSeleksi || 'Belum Diseleksi'],
  ];
  if (record.nilaiSeleksi) {
    statusLeftRows.push(['Nilai / Hasil Tes', record.nilaiSeleksi]);
  }
  if (record.catatanSeleksi) {
    statusRightRows.push(['Catatan Panitia', record.catatanSeleksi]);
  }
  drawTwoColumnCard({
    sectionTitleBefore: 'STATUS VERIFIKASI & SELEKSI PANITIA',
    labelW: 29,
    leftRows: statusLeftRows,
    rightRows: statusRightRows,
  });

  // =========================================================================
  // KELENGKAPAN BERKAS & TANDA TANGAN
  // =========================================================================
  const docsList =
    activeFormCfg.requiredDocs.length > 0 ? activeFormCfg.requiredDocs : unitCfg.requiredDocs;
  const docTextIndent = 3.8;
  const docColW = (contentWidth - 10) / 2;
  const docRowCount = Math.ceil(docsList.length / 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  const docPairRows: Array<{ left: string[]; right: string[] }> = [];
  let docsBodyH = 0;
  for (let i = 0; i < docRowCount; i += 1) {
    const leftItem = docsList[i * 2] || '';
    const rightItem = docsList[i * 2 + 1] || '';
    const leftLines = leftItem ? doc.splitTextToSize(leftItem, docColW - docTextIndent) : [];
    const rightLines = rightItem ? doc.splitTextToSize(rightItem, docColW - docTextIndent) : [];
    const rowLines = Math.max(1, leftLines.length, rightLines.length);
    docsBodyH += rowLines * 3.1 + 0.7;
    docPairRows.push({ left: leftLines, right: rightLines });
  }

  const docsCardH = 6.6 + docsBodyH + 1.5;
  const sigBlockH = 21;
  ensureSpace(docsCardH + sigBlockH + 2.5);

  const docsCardY = y;
  doc.setFillColor(247, 249, 247);
  doc.setDrawColor(220, 226, 220);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, docsCardY, contentWidth, docsCardH, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(20, 83, 45);
  doc.text(`KELENGKAPAN BERKAS DAFTAR ULANG (${unitCfg.shortName})`, marginX + 3, docsCardY + 4.0);

  let docY = docsCardY + 7.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  for (const row of docPairRows) {
    if (row.left.length > 0) {
      doc.setDrawColor(110, 120, 114);
      doc.setLineWidth(0.28);
      doc.roundedRect(marginX + 3, docY - 2.15, 2.3, 2.3, 0.35, 0.35, 'D');
      doc.setTextColor(55, 62, 57);
      doc.text(row.left, marginX + 3 + docTextIndent, docY);
    }
    if (row.right.length > 0) {
      const rightStartX = marginX + 6 + docColW;
      doc.setDrawColor(110, 120, 114);
      doc.setLineWidth(0.28);
      doc.roundedRect(rightStartX, docY - 2.15, 2.3, 2.3, 0.35, 0.35, 'D');
      doc.setTextColor(55, 62, 57);
      doc.text(row.right, rightStartX + docTextIndent, docY);
    }
    const rowLines = Math.max(1, row.left.length, row.right.length);
    docY += rowLines * 3.1 + 0.7;
  }

  y = docsCardY + docsCardH + 2.8;

  // Two-column Signature Area
  const printedDate = formatDateLong(options?.printedAtIso || new Date().toISOString());
  const sigLeftCenter = marginX + 38;
  const sigRightCenter = pageWidth - marginX - 38;
  const lineHalf = 28;
  const signerParentName = record.namaAyah || record.namaIbu || 'Orang Tua / Wali';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(24, 26, 24);
  doc.text('Mengetahui,', sigLeftCenter, y, { align: 'center' });
  doc.text(`Madiun, ${printedDate}`, sigRightCenter, y, { align: 'center' });

  doc.text('Orang Tua / Wali Calon Murid,', sigLeftCenter, y + 3.4, { align: 'center' });
  doc.text('Panitia SPMB,', sigRightCenter, y + 3.4, { align: 'center' });

  doc.setDrawColor(130, 138, 132);
  doc.setLineWidth(0.25);
  doc.line(sigLeftCenter - lineHalf, y + 14.5, sigLeftCenter + lineHalf, y + 14.5);
  doc.line(sigRightCenter - lineHalf, y + 14.5, sigRightCenter + lineHalf, y + 14.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(17, 24, 21);
  const parentNameLines = doc.splitTextToSize(signerParentName, lineHalf * 2 + 8);
  doc.text(parentNameLines[0] || 'Orang Tua / Wali', sigLeftCenter, y + 18.2, { align: 'center' });
  doc.setFontSize(6.4);
  const committeeSignLines = doc.splitTextToSize(INSTITUTION_NAME, lineHalf * 2 + 16);
  doc.text(committeeSignLines, sigRightCenter, y + 17.8, { align: 'center' });

  // Running Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(220, 226, 220);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 10.5, pageWidth - marginX, pageHeight - 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(100, 108, 103);
    doc.text(
      `Dokumen Resmi SPMB ${INSTITUTION_NAME} · No. Pendaftaran: ${regNumberText}`,
      marginX,
      pageHeight - 6.8
    );
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, pageHeight - 6.8, {
      align: 'right',
    });
  }

  return doc;
}

export async function downloadRegistrationPdf(
  rawRecord: RegistrationRecord,
  unitFormConfig?: UnitFormConfig
): Promise<void> {
  const record = normalizeRegistrationRecord(rawRecord);
  const doc = await buildRegistrationPdfDocument(record, unitFormConfig);
  const safeRegNo = (record.noPendaftaran || 'dokumen')
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  const safeName = record.namaLengkap
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  doc.save(`Bukti-Pendaftaran-${safeRegNo || 'dokumen'}-${safeName || 'santri'}.pdf`);
}
