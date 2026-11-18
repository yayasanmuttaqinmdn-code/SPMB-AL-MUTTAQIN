import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit3,
  FileCheck2,
  PlusCircle,
  Users,
} from 'lucide-react';
import type { FormSchemaConfig, RegistrationRecord } from '../types/spmb.ts';
import {
  ACADEMIC_YEAR,
  getUnitDisplayPairs,
  getUnitLogoPath,
  INSTITUTION_LOCATION,
  INSTITUTION_NAME,
  normalizeRegistrationRecord,
  UNIT_CONFIGS,
} from '../utils/spmbLogic.ts';
import { downloadRegistrationPdf, generateQrDataUrl } from '../utils/pdfGenerator.ts';

interface ReceiptPreviewViewProps {
  record: RegistrationRecord;
  formConfig: FormSchemaConfig;
  isAdmin: boolean;
  onEdit?: (record: RegistrationRecord) => void;
  onRegisterAnother: () => void;
  onOpenDashboard: () => void;
  onBackToLogin: () => void;
}

const Row: React.FC<{ label: string; value?: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="grid grid-cols-12 gap-1.5 sm:gap-2 text-xs sm:text-sm py-0.5">
    <dt className="col-span-5 text-[#4E5651] break-words">{label}</dt>
    <dd
      className={`col-span-7 text-[#111815] font-medium min-w-0 break-words ${
        mono ? 'font-mono tabular-nums' : ''
      }`}
    >
      : {value?.trim() || '-'}
    </dd>
  </div>
);

export const ReceiptPreviewView: React.FC<ReceiptPreviewViewProps> = ({
  record: rawRecord,
  formConfig,
  isAdmin,
  onEdit,
  onRegisterAnother,
  onOpenDashboard,
  onBackToLogin,
}) => {
  const record = normalizeRegistrationRecord(rawRecord);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState('');
  const [crestError, setCrestError] = useState(false);

  const unitCfg = UNIT_CONFIGS[record.unit];
  const unitFormCfg = formConfig[record.unit];

  useEffect(() => {
    setCrestError(false);
  }, [record.unit]);

  useEffect(() => {
    let active = true;
    generateQrDataUrl(record)
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch(() => {
        if (active) setQrUrl('');
      });
    return () => {
      active = false;
    };
  }, [record]);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setPdfFeedback('');
    try {
      await downloadRegistrationPdf(record, unitFormCfg);
      setPdfFeedback('File PDF bukti pendaftaran berhasil diunduh ke perangkat Anda.');
    } catch {
      setPdfFeedback('Gagal membuat file PDF. Silakan coba ulangi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const unitRows = getUnitDisplayPairs(record.unit, record.unitData, unitFormCfg);
  const docsList =
    unitFormCfg.requiredDocs.length > 0 ? unitFormCfg.requiredDocs : unitCfg.requiredDocs;

  const formattedDate = new Date(record.createdAt).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#4E5651] hover:text-[#111815] self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Portal Masuk</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          {isAdmin && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#111815] bg-white border border-[#D4D9D4] rounded-lg hover:bg-[#F2F4F2] whitespace-nowrap"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Data (Admin)</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Menyiapkan PDF...' : 'Unduh Bukti Pendaftaran (PDF)'}</span>
          </button>
        </div>
      </div>

      {pdfFeedback && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#14532D]/10 border border-[#14532D]/25 text-sm text-[#14532D] font-medium"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{pdfFeedback}</span>
        </div>
      )}

      {/* Official Receipt Sheet */}
      <article className="bg-white border border-[#D4D9D4] rounded-2xl overflow-hidden">
        <div className="h-2 bg-[#14532D]" />

        <div className="p-4 sm:p-9 space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-[#E2E5E2]">
            <div className="flex items-center gap-4">
              {!crestError ? (
                <img
                  src={getUnitLogoPath(record.unit)}
                  alt={`Logo ${unitCfg.fullName}`}
                  onError={() => setCrestError(true)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-contain bg-white p-1 border border-[#E2E5E2] shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#14532D]/10 flex items-center justify-center text-[#14532D] shrink-0">
                  <FileCheck2 className="w-7 h-7" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-[#926C15]">
                  {INSTITUTION_NAME} · Tahun Ajaran {ACADEMIC_YEAR}
                </p>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111815] mt-0.5">
                  Bukti Pendaftaran — {unitCfg.fullName}
                </h1>
                <p className="text-xs text-[#4E5651] mt-0.5">{INSTITUTION_LOCATION}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              {record.pasFotoDataUrl && (
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={record.pasFotoDataUrl}
                    alt={`Pas Foto 3x4 ${record.namaLengkap}`}
                    className="w-16 sm:w-20 aspect-[3/4] object-cover border border-[#D4D9D4] rounded-lg bg-[#F9FAF9]"
                  />
                  <span className="text-[10px] font-medium text-[#4E5651]">Pas Foto 3×4</span>
                </div>
              )}

              {qrUrl && (
                <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                  <img
                    src={qrUrl}
                    alt={`QR Verifikasi ${record.noPendaftaran}`}
                    className="w-20 h-20 border border-[#E2E5E2] rounded-lg p-1 bg-white"
                  />
                  <span className="text-[11px] font-mono text-[#4E5651] tabular-nums">
                    {record.noPendaftaran}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2]">
            <div>
              <p className="text-xs text-[#4E5651]">Nomor Pendaftaran</p>
              <p className="font-mono text-sm font-semibold text-[#14532D] mt-0.5 tabular-nums">
                {record.noPendaftaran}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#4E5651]">Lembaga Tujuan</p>
              <p className="text-sm font-semibold text-[#111815] mt-0.5">{unitCfg.shortName}</p>
            </div>
            <div>
              <p className="text-xs text-[#4E5651]">Waktu Pendaftaran</p>
              <p className="text-sm font-medium text-[#111815] mt-0.5">{formattedDate}</p>
            </div>
            <div>
              <p className="text-xs text-[#4E5651]">Status Verifikasi</p>
              <p className="text-sm font-medium text-[#111815] mt-0.5">
                {record.statusVerifikasi}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#4E5651]">Status Seleksi</p>
              <p
                className={`text-sm font-semibold mt-0.5 ${
                  record.statusSeleksi === 'Lulus Seleksi'
                    ? 'text-[#14532D]'
                    : record.statusSeleksi === 'Tidak Lulus'
                      ? 'text-red-700'
                      : record.statusSeleksi === 'Cadangan'
                        ? 'text-[#926C15]'
                        : 'text-[#111815]'
                }`}
              >
                {record.statusSeleksi || 'Belum Diseleksi'}
              </p>
            </div>
          </div>

          {/* SECTION 1: INFO PENDAFTARAN SISWA */}
          <section className="space-y-4">
            <div className="bg-[#14532D] text-white text-center py-1.5 rounded-md font-display text-xs font-bold tracking-wider uppercase">
              Info Pendaftaran Siswa
            </div>

            <dl className="space-y-1 max-w-2xl">
              <Row label="Nama Lengkap" value={record.namaLengkap} />
              <Row label="Nama Panggilan" value={record.namaPanggilan} />
              <Row label="Agama" value={record.agama} />
              <Row
                label="Tempat Tanggal Lahir"
                value={`${record.tempatLahir}, ${record.tanggalLahir}`}
              />
              <Row label="Jenis Kelamin" value={record.jenisKelamin} />
              <Row label="NISN" value={record.nisn} mono />
              <Row label="NIK" value={record.nik} mono />
              <Row label="No KK" value={record.noKk} mono />
              <Row label="Anak Ke" value={record.anakKe} mono />
              <Row label="Jumlah Saudara Kandung" value={record.jumlahSaudara} mono />
            </dl>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <h2 className="font-display text-sm font-bold text-[#111815] text-center border-b border-[#E2E5E2] pb-1">
                  Riwayat Siswa
                </h2>
                <dl className="space-y-1">
                  <Row label="Asal Sekolah" value={record.asalSekolah} />
                  <Row label="Prestasi Yang Pernah Di Raih" value={record.jenisPrestasi} />
                  <Row label="Gol Darah" value={record.golDarah} />
                  <Row
                    label="Tinggi Badan"
                    value={record.tinggiBadan ? `${record.tinggiBadan} cm` : '-'}
                    mono
                  />
                  <Row
                    label="Berat Badan"
                    value={record.beratBadan ? `${record.beratBadan} kg` : '-'}
                    mono
                  />
                  <Row label="Alergi" value={record.alergi} />
                </dl>
              </div>

              <div className="space-y-2">
                <h2 className="font-display text-sm font-bold text-[#111815] text-center border-b border-[#E2E5E2] pb-1">
                  Alamat Lengkap
                </h2>
                <dl className="space-y-1">
                  <Row label="Jalan" value={record.alamatJalan || record.alamatLengkap} />
                  <Row label="Rt" value={record.alamatRt} mono />
                  <Row label="Rw" value={record.alamatRw} mono />
                  <Row label="Desa/Kelurahan" value={record.alamatDesa} />
                  <Row label="Kecamatan" value={record.alamatKecamatan} />
                  <Row label="Kota/Kabupaten" value={record.alamatKota} />
                  <Row label="Provinsi" value={record.alamatProvinsi} />
                </dl>
              </div>
            </div>
          </section>

          {/* SECTION 2: INFO ORANG TUA / WALI */}
          <section className="space-y-4">
            <div className="bg-[#14532D] text-white text-center py-1.5 rounded-md font-display text-xs font-bold tracking-wider uppercase">
              Info Orang Tua / Wali
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <dl className="space-y-1">
                <Row label="Nama Ayah / Wali" value={record.namaAyah} />
                <Row
                  label="Tempat Tanggal Lahir"
                  value={
                    record.tempatLahirAyah || record.tanggalLahirAyah
                      ? `${record.tempatLahirAyah}, ${record.tanggalLahirAyah}`
                      : '-'
                  }
                />
                <Row label="NIK Ayah" value={record.nikAyah} mono />
                <Row label="Status" value={record.statusAyah} />
                <Row label="Pekerjaan Ayah" value={record.pekerjaanAyah} />
                <Row label="Pendidikan Terakhir Ayah" value={record.pendidikanAyah} />
                <Row label="Penghasilan Ayah" value={record.penghasilanAyah} />
                <Row label="No. Hp" value={record.noHpAyah || record.noWhatsapp} mono />
                <Row label="Alamat Email" value={record.emailAyah} />
              </dl>

              <dl className="space-y-1">
                <Row label="Nama Ibu / Wali" value={record.namaIbu} />
                <Row
                  label="Tempat Tanggal Lahir"
                  value={
                    record.tempatLahirIbu || record.tanggalLahirIbu
                      ? `${record.tempatLahirIbu}, ${record.tanggalLahirIbu}`
                      : '-'
                  }
                />
                <Row label="Nik Ibu" value={record.nikIbu} mono />
                <Row label="Status" value={record.statusIbu} />
                <Row label="Pekerjaan Ibu" value={record.pekerjaanIbu} />
                <Row label="Pendidikan Terakhir Ibu" value={record.pendidikanIbu} />
                <Row label="Penghasilan Ibu" value={record.penghasilanIbu} />
                <Row label="No. Hp" value={record.noHpIbu} mono />
                <Row label="Alamat Email" value={record.emailIbu} />
              </dl>
            </div>

            <div className="pt-2">
              <h2 className="font-display text-sm font-bold text-[#111815] text-center border-b border-[#E2E5E2] pb-1 mb-2">
                Alamat Lengkap Orang Tua / Wali
              </h2>
              <dl className="space-y-1 max-w-2xl">
                <Row label="Jalan" value={record.alamatOrtuJalan} />
                <Row label="Rt" value={record.alamatOrtuRt} mono />
                <Row label="Rw" value={record.alamatOrtuRw} mono />
                <Row label="Desa/Kelurahan" value={record.alamatOrtuDesa} />
                <Row label="Kecamatan" value={record.alamatOrtuKecamatan} />
                <Row label="Kota/Kabupaten" value={record.alamatOrtuKota} />
                <Row label="Provinsi" value={record.alamatOrtuProvinsi} />
              </dl>
            </div>
          </section>

          {/* SECTION 3: INFO PENGAJIAN */}
          <section className="space-y-3">
            <div className="bg-[#14532D] text-white text-center py-1.5 rounded-md font-display text-xs font-bold tracking-wider uppercase">
              Info Pengajian
            </div>

            <dl className="space-y-1 max-w-2xl">
              <Row label="Daerah" value={record.pengajianDaerah} />
              <Row label="Desa" value={record.pengajianDesa} />
              <Row label="Kelompok" value={record.pengajianKelompok} />
            </dl>
          </section>

          {/* SECTION 4: DATA KHUSUS JENJANG (Jika ada) */}
          {unitRows.length > 0 && (
            <section className="space-y-3">
              <div className="bg-[#F2F4F2] text-[#14532D] text-center py-1.5 rounded-md font-display text-xs font-bold tracking-wider uppercase border border-[#E2E5E2]">
                Data Khusus Jenjang {unitCfg.shortName}
              </div>

              <dl className="space-y-1 max-w-2xl">
                {unitRows.map((row) => (
                  <Row key={row.label} label={row.label} value={row.value} />
                ))}
              </dl>
            </section>
          )}

          {/* HASIL SELEKSI PANITIA (jika ada catatan/nilai/keputusan) */}
          {(record.statusSeleksi !== 'Belum Diseleksi' ||
            record.nilaiSeleksi ||
            record.catatanSeleksi) && (
            <section className="space-y-3">
              <div className="bg-[#F2F4F2] text-[#14532D] text-center py-1.5 rounded-md font-display text-xs font-bold tracking-wider uppercase border border-[#E2E5E2]">
                Keputusan Seleksi Panitia
              </div>
              <dl className="space-y-1 max-w-2xl">
                <Row label="Status Seleksi" value={record.statusSeleksi} />
                {record.nilaiSeleksi && <Row label="Nilai / Hasil Tes" value={record.nilaiSeleksi} />}
                {record.catatanSeleksi && <Row label="Catatan Panitia" value={record.catatanSeleksi} />}
              </dl>
            </section>
          )}

          {/* Checklist Berkas */}
          <div className="p-5 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] space-y-2">
            <h3 className="text-sm font-semibold text-[#111815]">
              Berkas yang Perlu Dibawa Saat Daftar Ulang ({unitCfg.shortName})
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#4E5651]">
              {docsList.map((doc) => (
                <li key={doc}>· {doc}</li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-[#E2E5E2] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onRegisterAnother}
              className="inline-flex items-center justify-center sm:justify-start gap-2 text-sm font-medium text-[#14532D] hover:underline py-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Daftarkan Calon Murid Lain</span>
            </button>

            <button
              type="button"
              onClick={onOpenDashboard}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-medium text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg"
            >
              <Users className="w-4 h-4 text-[#14532D]" />
              <span>Lihat Dashboard Pendaftar</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};
