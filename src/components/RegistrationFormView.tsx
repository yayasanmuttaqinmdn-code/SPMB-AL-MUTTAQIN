import React, { useEffect, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Copy, FileText, Trash2, Upload } from 'lucide-react';
import type {
  FormSchemaConfig,
  Gender,
  JalurPendaftaran,
  ParentLifeStatus,
  RegistrationInput,
  RegistrationRecord,
  UnitId,
  ValidationErrors,
} from '../types/spmb.ts';
import {
  AGAMA_OPTIONS,
  composeAddress,
  createEmptyRegistrationInput,
  getUnitLogoPath,
  GOL_DARAH_OPTIONS,
  normalizeRegistrationInput,
  PENDIDIKAN_OPTIONS,
  PENGHASILAN_OPTIONS,
  UNIT_CONFIGS,
  validateRegistrationInput,
} from '../utils/spmbLogic.ts';
import { processPasFoto3x4File } from '../utils/photoUtils.ts';

interface RegistrationFormViewProps {
  unit: UnitId;
  formConfig: FormSchemaConfig;
  editingRecord: RegistrationRecord | null;
  parentSession?: { namaWali: string; noWhatsapp: string } | null;
  isSubmitting: boolean;
  onBackToLogin: () => void;
  onSubmitNew: (input: RegistrationInput) => Promise<void>;
  onRequestUpdate: (recordId: string, input: RegistrationInput) => void;
}

export const RegistrationFormView: React.FC<RegistrationFormViewProps> = ({
  unit,
  formConfig,
  editingRecord,
  parentSession,
  isSubmitting,
  onBackToLogin,
  onSubmitNew,
  onRequestUpdate,
}) => {
  const activeUnitFormCfg = formConfig[unit];

  const [form, setForm] = useState<RegistrationInput>(() => {
    if (editingRecord) {
      return normalizeRegistrationInput(editingRecord);
    }
    const base = createEmptyRegistrationInput(unit, activeUnitFormCfg);
    if (parentSession?.namaWali) base.namaAyah = parentSession.namaWali;
    if (parentSession?.noWhatsapp) {
      base.noHpAyah = parentSession.noWhatsapp;
      base.noWhatsapp = parentSession.noWhatsapp;
    }
    return base;
  });

  const [sameAddressAsStudent, setSameAddressAsStudent] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  useEffect(() => {
    if (!editingRecord) {
      const targetCfg = formConfig[unit];
      setForm((prev) => {
        const fresh = createEmptyRegistrationInput(unit, targetCfg);
        return {
          ...prev,
          unit,
          unitData: {
            ...fresh.unitData,
            ...Object.fromEntries(
              Object.entries(prev.unitData || {}).filter(([k]) =>
                targetCfg.fields.some((f) => f.id === k)
              )
            ),
          },
        };
      });
      setErrors({});
    }
  }, [unit, formConfig, editingRecord]);

  const unitCfg = UNIT_CONFIGS[form.unit];
  const currentUnitSchema = formConfig[form.unit];

  const updateField = <K extends keyof RegistrationInput>(
    field: K,
    value: RegistrationInput[K]
  ) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Keep composed alamatLengkap in sync
      if (
        field === 'alamatJalan' ||
        field === 'alamatRt' ||
        field === 'alamatRw' ||
        field === 'alamatDesa' ||
        field === 'alamatKecamatan' ||
        field === 'alamatKota' ||
        field === 'alamatProvinsi'
      ) {
        next.alamatLengkap = composeAddress({
          jalan: next.alamatJalan,
          rt: next.alamatRt,
          rw: next.alamatRw,
          desa: next.alamatDesa,
          kecamatan: next.alamatKecamatan,
          kota: next.alamatKota,
          provinsi: next.alamatProvinsi,
        });

        if (sameAddressAsStudent) {
          next.alamatOrtuJalan = next.alamatJalan;
          next.alamatOrtuRt = next.alamatRt;
          next.alamatOrtuRw = next.alamatRw;
          next.alamatOrtuDesa = next.alamatDesa;
          next.alamatOrtuKecamatan = next.alamatKecamatan;
          next.alamatOrtuKota = next.alamatKota;
          next.alamatOrtuProvinsi = next.alamatProvinsi;
        }
      }

      if (field === 'noHpAyah') {
        next.noWhatsapp = String(value) || next.noHpIbu;
      } else if (field === 'noHpIbu' && !next.noHpAyah) {
        next.noWhatsapp = String(value);
      }

      return next;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        if (sameAddressAsStudent) {
          if (field === 'alamatJalan') delete next.alamatOrtuJalan;
          if (field === 'alamatRt') delete next.alamatOrtuRt;
          if (field === 'alamatRw') delete next.alamatOrtuRw;
          if (field === 'alamatDesa') delete next.alamatOrtuDesa;
          if (field === 'alamatKecamatan') delete next.alamatOrtuKecamatan;
          if (field === 'alamatKota') delete next.alamatOrtuKota;
          if (field === 'alamatProvinsi') delete next.alamatOrtuProvinsi;
        }
        return next;
      });
    }
  };

  const handleCopyStudentAddress = () => {
    setForm((prev) => ({
      ...prev,
      alamatOrtuJalan: prev.alamatJalan,
      alamatOrtuRt: prev.alamatRt,
      alamatOrtuRw: prev.alamatRw,
      alamatOrtuDesa: prev.alamatDesa,
      alamatOrtuKecamatan: prev.alamatKecamatan,
      alamatOrtuKota: prev.alamatKota,
      alamatOrtuProvinsi: prev.alamatProvinsi,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.alamatOrtuJalan;
      delete next.alamatOrtuRt;
      delete next.alamatOrtuRw;
      delete next.alamatOrtuDesa;
      delete next.alamatOrtuKecamatan;
      delete next.alamatOrtuKota;
      delete next.alamatOrtuProvinsi;
      return next;
    });
  };

  const updateUnitData = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      unitData: {
        ...prev.unitData,
        [key]: value,
      },
    }));
    const errKey = `unitData.${key}`;
    if (errors[errKey]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[errKey];
        return next;
      });
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const processedUrl = await processPasFoto3x4File(file);
      updateField('pasFotoDataUrl', processedUrl);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        pasFotoDataUrl:
          err instanceof Error ? err.message : 'Gagal memproses foto 3x4. Coba gambar lain.',
      }));
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const normalized = normalizeRegistrationInput(form);
    const validation = validateRegistrationInput(normalized, currentUnitSchema, {
      requirePhoto: !editingRecord || Boolean(editingRecord.pasFotoDataUrl),
    });
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      setSubmitError('Mohon lengkapi kolom wajib bertanda merah sebelum menyimpan.');
      return;
    }

    if (editingRecord) {
      onRequestUpdate(editingRecord.id, normalized);
      return;
    }

    try {
      await onSubmitNew(normalized);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan pendaftaran.'
      );
    }
  };

  const inputClass = (fieldName: string) =>
    `w-full min-w-0 px-3.5 py-2 text-sm rounded-lg border bg-[#F9FAF9] focus:bg-white focus:outline-none transition-colors ${
      errors[fieldName]
        ? 'border-red-500 focus:border-red-600'
        : 'border-[#D4D9D4] focus:border-[#14532D]'
    }`;

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Contextual Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-[#4E5651] hover:text-[#111815]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Kembali ke Pilihan Lembaga</span>
        </button>

        <span className="text-xs font-semibold text-[#14532D]">
          Portal Pendaftaran {unitCfg.shortName}
        </span>
      </div>

      {/* Registration Form Card */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-8 space-y-6 sm:space-y-8"
      >
        <div className="pb-4 sm:pb-5 border-b border-[#E2E5E2] flex items-start gap-3.5 sm:gap-4">
          <img
            src={getUnitLogoPath(form.unit)}
            alt={`Logo ${unitCfg.fullName}`}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain bg-white p-1 border border-[#E2E5E2] shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-[#4E5651]">
              {editingRecord
                ? `Edit Data Pendaftar (Mode Admin) · ${editingRecord.noPendaftaran}`
                : `Formulir Pendaftaran Online · ${unitCfg.ageRange}`}
            </p>
            <h1 className="font-display text-xl sm:text-3xl font-bold text-[#111815]">
              Menu Pengisian Data {unitCfg.fullName}
            </h1>
            <p className="text-sm text-[#4E5651]">
              {currentUnitSchema.instructions || unitCfg.tagline}{' '}
              <span className="font-medium text-[#111815]">
                {form.unit === 'RA_TK'
                  ? 'Seluruh kolom wajib diisi, kecuali NISN (opsional khusus pendaftar RA/TK).'
                  : 'Seluruh kolom bertanda * wajib diisi lengkap.'}
              </span>
            </p>
          </div>
        </div>

        {submitError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
          >
            {submitError}
          </div>
        )}

        {/* ================================================================ */}
        {/* SECTION 1: INFO PENDAFTARAN SISWA                                */}
        {/* ================================================================ */}
        <section className="space-y-6">
          <div className="bg-[#14532D] text-white px-4 py-2 rounded-lg">
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">
              01. Info Pendaftaran Siswa
            </h2>
          </div>

          {/* Pas Foto 3x4 Upload Card */}
          <div
            className={`p-4 sm:p-5 rounded-xl border bg-[#F9FAF9] flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
              errors.pasFotoDataUrl ? 'border-red-500' : 'border-[#E2E5E2]'
            }`}
          >
            <div className="w-24 aspect-[3/4] rounded-lg border border-[#D4D9D4] bg-white overflow-hidden flex flex-col items-center justify-center shrink-0">
              {form.pasFotoDataUrl ? (
                <img
                  src={form.pasFotoDataUrl}
                  alt="Preview Pas Foto 3x4"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center px-2 text-[#4E5651] space-y-1">
                  <Camera className="w-5 h-5 mx-auto text-[#14532D]" />
                  <p className="text-[11px] font-semibold leading-tight">Foto 3×4</p>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="text-xs font-semibold text-[#111815]">
                  Upload Pas Foto Calon Murid (3×4){' '}
                  {(!editingRecord || Boolean(editingRecord.pasFotoDataUrl)) && (
                    <span className="text-red-600">*</span>
                  )}
                </p>
                <p className="text-xs text-[#4E5651] mt-0.5 leading-relaxed">
                  Gunakan foto formal berlatar polos (JPG, PNG, atau WebP). Sistem otomatis
                  menyesuaikan ukuran dan proporsi pas foto 3×4 untuk bukti pendaftaran PDF.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <label
                  htmlFor="pasFoto"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isProcessingPhoto
                      ? 'Memproses Foto...'
                      : form.pasFotoDataUrl
                        ? 'Ganti Foto 3×4'
                        : 'Pilih Foto 3×4'}
                  </span>
                </label>
                <input
                  id="pasFoto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void handlePhotoFileChange(e)}
                  className="sr-only"
                />

                {form.pasFotoDataUrl && (
                  <button
                    type="button"
                    onClick={() => updateField('pasFotoDataUrl', '')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                )}
              </div>

              {errors.pasFotoDataUrl && (
                <p className="text-xs text-red-600">{errors.pasFotoDataUrl}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="namaLengkap" className="block text-xs font-semibold text-[#111815] mb-1">
                Nama Lengkap <span className="text-red-600">*</span>
              </label>
              <input
                id="namaLengkap"
                type="text"
                value={form.namaLengkap}
                onChange={(e) => updateField('namaLengkap', e.target.value)}
                placeholder="Sesuai Akta Kelahiran / Kartu Keluarga"
                className={inputClass('namaLengkap')}
              />
              {errors.namaLengkap && (
                <p className="mt-1 text-xs text-red-600">{errors.namaLengkap}</p>
              )}
            </div>

            <div>
              <label htmlFor="namaPanggilan" className="block text-xs font-semibold text-[#111815] mb-1">
                Nama Panggilan <span className="text-red-600">*</span>
              </label>
              <input
                id="namaPanggilan"
                type="text"
                value={form.namaPanggilan}
                onChange={(e) => updateField('namaPanggilan', e.target.value)}
                placeholder="Contoh: Adam"
                className={inputClass('namaPanggilan')}
              />
              {errors.namaPanggilan && (
                <p className="mt-1 text-xs text-red-600">{errors.namaPanggilan}</p>
              )}
            </div>

            <div>
              <label htmlFor="agama" className="block text-xs font-semibold text-[#111815] mb-1">
                Agama <span className="text-red-600">*</span>
              </label>
              <select
                id="agama"
                value={form.agama}
                onChange={(e) => updateField('agama', e.target.value)}
                className={inputClass('agama')}
              >
                {AGAMA_OPTIONS.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tempatLahir" className="block text-xs font-semibold text-[#111815] mb-1">
                Tempat Lahir <span className="text-red-600">*</span>
              </label>
              <input
                id="tempatLahir"
                type="text"
                value={form.tempatLahir}
                onChange={(e) => updateField('tempatLahir', e.target.value)}
                placeholder="Kota/Kabupaten kelahiran"
                className={inputClass('tempatLahir')}
              />
              {errors.tempatLahir && (
                <p className="mt-1 text-xs text-red-600">{errors.tempatLahir}</p>
              )}
            </div>

            <div>
              <label htmlFor="tanggalLahir" className="block text-xs font-semibold text-[#111815] mb-1">
                Tanggal Lahir <span className="text-red-600">*</span>
              </label>
              <input
                id="tanggalLahir"
                type="date"
                value={form.tanggalLahir}
                onChange={(e) => updateField('tanggalLahir', e.target.value)}
                className={inputClass('tanggalLahir')}
              />
              {errors.tanggalLahir && (
                <p className="mt-1 text-xs text-red-600">{errors.tanggalLahir}</p>
              )}
            </div>

            <div>
              <label htmlFor="jenisKelamin" className="block text-xs font-semibold text-[#111815] mb-1">
                Jenis Kelamin <span className="text-red-600">*</span>
              </label>
              <select
                id="jenisKelamin"
                value={form.jenisKelamin}
                onChange={(e) => updateField('jenisKelamin', e.target.value as Gender)}
                className={inputClass('jenisKelamin')}
              >
                <option value="Laki-laki">Laki-Laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label htmlFor="nisn" className="block text-xs font-semibold text-[#111815] mb-1">
                NISN (10 Digit){' '}
                {form.unit === 'RA_TK' ? (
                  <span className="text-[#4E5651] font-normal">(Opsional khusus RA/TK)</span>
                ) : (
                  <span className="text-red-600">*</span>
                )}
              </label>
              <input
                id="nisn"
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={form.nisn}
                onChange={(e) => updateField('nisn', e.target.value.replace(/\D/g, ''))}
                placeholder={form.unit === 'RA_TK' ? 'Kosongkan jika belum ada' : '10 digit NISN'}
                className={`${inputClass('nisn')} font-mono`}
              />
              {errors.nisn && <p className="mt-1 text-xs text-red-600">{errors.nisn}</p>}
            </div>

            <div>
              <label htmlFor="nik" className="block text-xs font-semibold text-[#111815] mb-1">
                NIK (16 Digit) <span className="text-red-600">*</span>
              </label>
              <input
                id="nik"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={form.nik}
                onChange={(e) => updateField('nik', e.target.value.replace(/\D/g, ''))}
                placeholder="3577012345670001"
                className={`${inputClass('nik')} font-mono`}
              />
              {errors.nik && <p className="mt-1 text-xs text-red-600">{errors.nik}</p>}
            </div>

            <div>
              <label htmlFor="noKk" className="block text-xs font-semibold text-[#111815] mb-1">
                No. KK (16 Digit) <span className="text-red-600">*</span>
              </label>
              <input
                id="noKk"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={form.noKk}
                onChange={(e) => updateField('noKk', e.target.value.replace(/\D/g, ''))}
                placeholder="Nomor Kartu Keluarga"
                className={`${inputClass('noKk')} font-mono`}
              />
              {errors.noKk && <p className="mt-1 text-xs text-red-600">{errors.noKk}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="anakKe" className="block text-xs font-semibold text-[#111815] mb-1">
                  Anak Ke <span className="text-red-600">*</span>
                </label>
                <input
                  id="anakKe"
                  type="number"
                  min={1}
                  value={form.anakKe}
                  onChange={(e) => updateField('anakKe', e.target.value)}
                  className={`${inputClass('anakKe')} font-mono`}
                />
                {errors.anakKe && <p className="mt-1 text-xs text-red-600">{errors.anakKe}</p>}
              </div>

              <div>
                <label
                  htmlFor="jumlahSaudara"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Jml Saudara <span className="text-red-600">*</span>
                </label>
                <input
                  id="jumlahSaudara"
                  type="number"
                  min={0}
                  value={form.jumlahSaudara}
                  onChange={(e) => updateField('jumlahSaudara', e.target.value)}
                  className={`${inputClass('jumlahSaudara')} font-mono`}
                />
                {errors.jumlahSaudara && (
                  <p className="mt-1 text-xs text-red-600">{errors.jumlahSaudara}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="jalurPendaftaran"
                className="block text-xs font-semibold text-[#111815] mb-1"
              >
                Jalur Pendaftaran <span className="text-red-600">*</span>
              </label>
              <select
                id="jalurPendaftaran"
                value={form.jalurPendaftaran}
                onChange={(e) =>
                  updateField('jalurPendaftaran', e.target.value as JalurPendaftaran)
                }
                className={inputClass('jalurPendaftaran')}
              >
                <option value="Reguler">Reguler</option>
                <option value="Tahfidz">Tahfidz Al-Quran</option>
                <option value="Prestasi">Prestasi Akademik / Non-Akademik</option>
                <option value="Beasiswa Yatim/Dhuafa">Beasiswa Yatim / Dhuafa</option>
              </select>
            </div>
          </div>

          {/* Sub-grids: Riwayat Siswa (Left) & Alamat Lengkap Siswa (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 pt-2">
            {/* Riwayat Siswa */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-3.5">
              <h3 className="font-display text-sm font-bold text-[#111815] border-b border-[#E2E5E2] pb-2">
                Riwayat Siswa
              </h3>

              <div>
                <label htmlFor="asalSekolah" className="block text-xs font-semibold text-[#111815] mb-1">
                  Asal Sekolah <span className="text-red-600">*</span>
                </label>
                <input
                  id="asalSekolah"
                  type="text"
                  value={form.asalSekolah}
                  onChange={(e) => updateField('asalSekolah', e.target.value)}
                  placeholder="TK/RA/SD/SMP asal (tulis - jika belum)"
                  className={inputClass('asalSekolah')}
                />
                {errors.asalSekolah && (
                  <p className="mt-1 text-xs text-red-600">{errors.asalSekolah}</p>
                )}
              </div>

              <div>
                <label htmlFor="jenisPrestasi" className="block text-xs font-semibold text-[#111815] mb-1">
                  Jenis Prestasi Yang Pernah Di Raih <span className="text-red-600">*</span>
                </label>
                <input
                  id="jenisPrestasi"
                  type="text"
                  value={form.jenisPrestasi}
                  onChange={(e) => updateField('jenisPrestasi', e.target.value)}
                  placeholder="Juara Lomba / Hafalan (tulis - jika belum)"
                  className={inputClass('jenisPrestasi')}
                />
                {errors.jenisPrestasi && (
                  <p className="mt-1 text-xs text-red-600">{errors.jenisPrestasi}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label htmlFor="golDarah" className="block text-xs font-semibold text-[#111815] mb-1">
                    Gol Darah <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="golDarah"
                    value={form.golDarah}
                    onChange={(e) => updateField('golDarah', e.target.value)}
                    className={inputClass('golDarah')}
                  >
                    {GOL_DARAH_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tinggiBadan" className="block text-xs font-semibold text-[#111815] mb-1">
                    Tinggi (cm) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="tinggiBadan"
                    type="number"
                    min={1}
                    value={form.tinggiBadan}
                    onChange={(e) => updateField('tinggiBadan', e.target.value)}
                    placeholder="145"
                    className={`${inputClass('tinggiBadan')} font-mono`}
                  />
                  {errors.tinggiBadan && (
                    <p className="mt-1 text-xs text-red-600">{errors.tinggiBadan}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="beratBadan" className="block text-xs font-semibold text-[#111815] mb-1">
                    Berat (kg) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="beratBadan"
                    type="number"
                    min={1}
                    value={form.beratBadan}
                    onChange={(e) => updateField('beratBadan', e.target.value)}
                    placeholder="45"
                    className={`${inputClass('beratBadan')} font-mono`}
                  />
                  {errors.beratBadan && (
                    <p className="mt-1 text-xs text-red-600">{errors.beratBadan}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="alergi" className="block text-xs font-semibold text-[#111815] mb-1">
                  Alergi <span className="text-red-600">*</span>
                </label>
                <input
                  id="alergi"
                  type="text"
                  value={form.alergi}
                  onChange={(e) => updateField('alergi', e.target.value)}
                  placeholder="Tulis alergi makanan/obat atau -"
                  className={inputClass('alergi')}
                />
                {errors.alergi && <p className="mt-1 text-xs text-red-600">{errors.alergi}</p>}
              </div>
            </div>

            {/* Alamat Lengkap Siswa */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-3.5">
              <h3 className="font-display text-sm font-bold text-[#111815] border-b border-[#E2E5E2] pb-2">
                Alamat Lengkap Siswa
              </h3>

              <div>
                <label htmlFor="alamatJalan" className="block text-xs font-semibold text-[#111815] mb-1">
                  Jalan / Dusun / Perumahan <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatJalan"
                  type="text"
                  value={form.alamatJalan}
                  onChange={(e) => updateField('alamatJalan', e.target.value)}
                  placeholder="Contoh: JL. SERAYU BARAT NO.9"
                  className={inputClass('alamatJalan')}
                />
                {errors.alamatJalan && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatJalan}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="alamatRt" className="block text-xs font-semibold text-[#111815] mb-1">
                    RT <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="alamatRt"
                    type="text"
                    value={form.alamatRt}
                    onChange={(e) => updateField('alamatRt', e.target.value)}
                    placeholder="048"
                    className={`${inputClass('alamatRt')} font-mono`}
                  />
                  {errors.alamatRt && (
                    <p className="mt-1 text-xs text-red-600">{errors.alamatRt}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="alamatRw" className="block text-xs font-semibold text-[#111815] mb-1">
                    RW <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="alamatRw"
                    type="text"
                    value={form.alamatRw}
                    onChange={(e) => updateField('alamatRw', e.target.value)}
                    placeholder="015"
                    className={`${inputClass('alamatRw')} font-mono`}
                  />
                  {errors.alamatRw && (
                    <p className="mt-1 text-xs text-red-600">{errors.alamatRw}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="alamatDesa" className="block text-xs font-semibold text-[#111815] mb-1">
                    Desa / Kelurahan <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="alamatDesa"
                    type="text"
                    value={form.alamatDesa}
                    onChange={(e) => updateField('alamatDesa', e.target.value)}
                    placeholder="TAMAN"
                    className={inputClass('alamatDesa')}
                  />
                  {errors.alamatDesa && (
                    <p className="mt-1 text-xs text-red-600">{errors.alamatDesa}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="alamatKecamatan"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Kecamatan <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="alamatKecamatan"
                    type="text"
                    value={form.alamatKecamatan}
                    onChange={(e) => updateField('alamatKecamatan', e.target.value)}
                    placeholder="TAMAN"
                    className={inputClass('alamatKecamatan')}
                  />
                  {errors.alamatKecamatan && (
                    <p className="mt-1 text-xs text-red-600">{errors.alamatKecamatan}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="alamatKota" className="block text-xs font-semibold text-[#111815] mb-1">
                    Kota / Kabupaten <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="alamatKota"
                    type="text"
                    value={form.alamatKota}
                    onChange={(e) => updateField('alamatKota', e.target.value)}
                    placeholder="KOTA MADIUN"
                    className={inputClass('alamatKota')}
                  />
                  {errors.alamatKota && (
                    <p className="mt-1 text-xs text-red-600">{errors.alamatKota}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="alamatProvinsi"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Provinsi <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="alamatProvinsi"
                    type="text"
                    value={form.alamatProvinsi}
                    onChange={(e) => updateField('alamatProvinsi', e.target.value)}
                    placeholder="JAWA TIMUR"
                    className={inputClass('alamatProvinsi')}
                  />
                  {errors.alamatProvinsi && (
                    <p className="mt-1 text-xs text-red-600">{errors.alamatProvinsi}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 2: INFO ORANG TUA / WALI                                 */}
        {/* ================================================================ */}
        <section className="space-y-6">
          <div className="bg-[#14532D] text-white px-4 py-2 rounded-lg">
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">
              02. Info Orang Tua / Wali
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* Ayah / Wali */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-3.5">
              <h3 className="font-display text-sm font-bold text-[#14532D] border-b border-[#E2E5E2] pb-2">
                Data Ayah / Wali
              </h3>

              <div>
                <label htmlFor="namaAyah" className="block text-xs font-semibold text-[#111815] mb-1">
                  Nama Ayah / Wali <span className="text-red-600">*</span>
                </label>
                <input
                  id="namaAyah"
                  type="text"
                  value={form.namaAyah}
                  onChange={(e) => updateField('namaAyah', e.target.value)}
                  placeholder="Nama lengkap ayah"
                  className={inputClass('namaAyah')}
                />
                {errors.namaAyah && <p className="mt-1 text-xs text-red-600">{errors.namaAyah}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="tempatLahirAyah"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Tempat Lahir Ayah <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="tempatLahirAyah"
                    type="text"
                    value={form.tempatLahirAyah}
                    onChange={(e) => updateField('tempatLahirAyah', e.target.value)}
                    placeholder="Kota/Kabupaten"
                    className={inputClass('tempatLahirAyah')}
                  />
                  {errors.tempatLahirAyah && (
                    <p className="mt-1 text-xs text-red-600">{errors.tempatLahirAyah}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="tanggalLahirAyah"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Tanggal Lahir Ayah <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="tanggalLahirAyah"
                    type="date"
                    value={form.tanggalLahirAyah}
                    onChange={(e) => updateField('tanggalLahirAyah', e.target.value)}
                    className={inputClass('tanggalLahirAyah')}
                  />
                  {errors.tanggalLahirAyah && (
                    <p className="mt-1 text-xs text-red-600">{errors.tanggalLahirAyah}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="nikAyah" className="block text-xs font-semibold text-[#111815] mb-1">
                    NIK Ayah <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="nikAyah"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    value={form.nikAyah}
                    onChange={(e) => updateField('nikAyah', e.target.value.replace(/\D/g, ''))}
                    placeholder="16 digit NIK"
                    className={`${inputClass('nikAyah')} font-mono`}
                  />
                  {errors.nikAyah && <p className="mt-1 text-xs text-red-600">{errors.nikAyah}</p>}
                </div>

                <div>
                  <label htmlFor="statusAyah" className="block text-xs font-semibold text-[#111815] mb-1">
                    Status <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="statusAyah"
                    value={form.statusAyah}
                    onChange={(e) => updateField('statusAyah', e.target.value as ParentLifeStatus)}
                    className={inputClass('statusAyah')}
                  >
                    <option value="Masih Hidup">Masih Hidup</option>
                    <option value="Sudah Meninggal">Sudah Meninggal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="pekerjaanAyah"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Pekerjaan Ayah <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="pekerjaanAyah"
                    type="text"
                    value={form.pekerjaanAyah}
                    onChange={(e) => updateField('pekerjaanAyah', e.target.value)}
                    placeholder="WIRASWASTA / ASN / ..."
                    className={inputClass('pekerjaanAyah')}
                  />
                  {errors.pekerjaanAyah && (
                    <p className="mt-1 text-xs text-red-600">{errors.pekerjaanAyah}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="pendidikanAyah"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Pendidikan Terakhir Ayah <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="pendidikanAyah"
                    value={form.pendidikanAyah}
                    onChange={(e) => updateField('pendidikanAyah', e.target.value)}
                    className={inputClass('pendidikanAyah')}
                  >
                    {PENDIDIKAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="penghasilanAyah"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Penghasilan Ayah <span className="text-red-600">*</span>
                </label>
                <select
                  id="penghasilanAyah"
                  value={form.penghasilanAyah}
                  onChange={(e) => updateField('penghasilanAyah', e.target.value)}
                  className={inputClass('penghasilanAyah')}
                >
                  {PENGHASILAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="noHpAyah" className="block text-xs font-semibold text-[#111815] mb-1">
                    No. HP / WA Ayah <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="noHpAyah"
                    type="tel"
                    value={form.noHpAyah}
                    onChange={(e) => updateField('noHpAyah', e.target.value)}
                    placeholder="081234567890"
                    className={`${inputClass('noHpAyah')} font-mono`}
                  />
                  {errors.noHpAyah && (
                    <p className="mt-1 text-xs text-red-600">{errors.noHpAyah}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="emailAyah" className="block text-xs font-semibold text-[#111815] mb-1">
                    Alamat Email Ayah <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="emailAyah"
                    type="email"
                    value={form.emailAyah}
                    onChange={(e) => updateField('emailAyah', e.target.value)}
                    placeholder="email@contoh.com"
                    className={inputClass('emailAyah')}
                  />
                  {errors.emailAyah && (
                    <p className="mt-1 text-xs text-red-600">{errors.emailAyah}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Ibu / Wali */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-3.5">
              <h3 className="font-display text-sm font-bold text-[#14532D] border-b border-[#E2E5E2] pb-2">
                Data Ibu / Wali
              </h3>

              <div>
                <label htmlFor="namaIbu" className="block text-xs font-semibold text-[#111815] mb-1">
                  Nama Ibu / Wali <span className="text-red-600">*</span>
                </label>
                <input
                  id="namaIbu"
                  type="text"
                  value={form.namaIbu}
                  onChange={(e) => updateField('namaIbu', e.target.value)}
                  placeholder="Nama lengkap ibu"
                  className={inputClass('namaIbu')}
                />
                {errors.namaIbu && <p className="mt-1 text-xs text-red-600">{errors.namaIbu}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="tempatLahirIbu"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Tempat Lahir Ibu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="tempatLahirIbu"
                    type="text"
                    value={form.tempatLahirIbu}
                    onChange={(e) => updateField('tempatLahirIbu', e.target.value)}
                    placeholder="Kota/Kabupaten"
                    className={inputClass('tempatLahirIbu')}
                  />
                  {errors.tempatLahirIbu && (
                    <p className="mt-1 text-xs text-red-600">{errors.tempatLahirIbu}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="tanggalLahirIbu"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Tanggal Lahir Ibu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="tanggalLahirIbu"
                    type="date"
                    value={form.tanggalLahirIbu}
                    onChange={(e) => updateField('tanggalLahirIbu', e.target.value)}
                    className={inputClass('tanggalLahirIbu')}
                  />
                  {errors.tanggalLahirIbu && (
                    <p className="mt-1 text-xs text-red-600">{errors.tanggalLahirIbu}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="nikIbu" className="block text-xs font-semibold text-[#111815] mb-1">
                    NIK Ibu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="nikIbu"
                    type="text"
                    inputMode="numeric"
                    maxLength={16}
                    value={form.nikIbu}
                    onChange={(e) => updateField('nikIbu', e.target.value.replace(/\D/g, ''))}
                    placeholder="16 digit NIK"
                    className={`${inputClass('nikIbu')} font-mono`}
                  />
                  {errors.nikIbu && <p className="mt-1 text-xs text-red-600">{errors.nikIbu}</p>}
                </div>

                <div>
                  <label htmlFor="statusIbu" className="block text-xs font-semibold text-[#111815] mb-1">
                    Status <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="statusIbu"
                    value={form.statusIbu}
                    onChange={(e) => updateField('statusIbu', e.target.value as ParentLifeStatus)}
                    className={inputClass('statusIbu')}
                  >
                    <option value="Masih Hidup">Masih Hidup</option>
                    <option value="Sudah Meninggal">Sudah Meninggal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="pekerjaanIbu"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Pekerjaan Ibu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="pekerjaanIbu"
                    type="text"
                    value={form.pekerjaanIbu}
                    onChange={(e) => updateField('pekerjaanIbu', e.target.value)}
                    placeholder="MENGURUS RUMAH TANGGA / ..."
                    className={inputClass('pekerjaanIbu')}
                  />
                  {errors.pekerjaanIbu && (
                    <p className="mt-1 text-xs text-red-600">{errors.pekerjaanIbu}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="pendidikanIbu"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Pendidikan Terakhir Ibu <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="pendidikanIbu"
                    value={form.pendidikanIbu}
                    onChange={(e) => updateField('pendidikanIbu', e.target.value)}
                    className={inputClass('pendidikanIbu')}
                  >
                    {PENDIDIKAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="penghasilanIbu"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Penghasilan Ibu <span className="text-red-600">*</span>
                </label>
                <select
                  id="penghasilanIbu"
                  value={form.penghasilanIbu}
                  onChange={(e) => updateField('penghasilanIbu', e.target.value)}
                  className={inputClass('penghasilanIbu')}
                >
                  {PENGHASILAN_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="noHpIbu" className="block text-xs font-semibold text-[#111815] mb-1">
                    No. HP Ibu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="noHpIbu"
                    type="tel"
                    value={form.noHpIbu}
                    onChange={(e) => updateField('noHpIbu', e.target.value)}
                    placeholder="081234567803"
                    className={`${inputClass('noHpIbu')} font-mono`}
                  />
                  {errors.noHpIbu && (
                    <p className="mt-1 text-xs text-red-600">{errors.noHpIbu}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="emailIbu" className="block text-xs font-semibold text-[#111815] mb-1">
                    Alamat Email Ibu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="emailIbu"
                    type="email"
                    value={form.emailIbu}
                    onChange={(e) => updateField('emailIbu', e.target.value)}
                    placeholder="email@contoh.com"
                    className={inputClass('emailIbu')}
                  />
                  {errors.emailIbu && (
                    <p className="mt-1 text-xs text-red-600">{errors.emailIbu}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Alamat Lengkap Orang Tua / Wali */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#E2E5E2] pb-2.5">
              <h3 className="font-display text-sm font-bold text-[#111815]">
                Alamat Lengkap Orang Tua / Wali
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-[#4E5651] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAddressAsStudent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAddressAsStudent(checked);
                      if (checked) handleCopyStudentAddress();
                    }}
                    className="w-3.5 h-3.5 accent-[#14532D] rounded"
                  />
                  <span>Sama dengan alamat siswa</span>
                </label>

                <button
                  type="button"
                  onClick={handleCopyStudentAddress}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D] hover:underline"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Alamat Siswa</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="sm:col-span-2">
                <label
                  htmlFor="alamatOrtuJalan"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Jalan <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatOrtuJalan"
                  type="text"
                  value={form.alamatOrtuJalan}
                  onChange={(e) => {
                    setSameAddressAsStudent(false);
                    updateField('alamatOrtuJalan', e.target.value);
                  }}
                  placeholder="JL. SERAYU BARAT NO.9"
                  className={inputClass('alamatOrtuJalan')}
                />
                {errors.alamatOrtuJalan && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatOrtuJalan}</p>
                )}
              </div>

              <div>
                <label htmlFor="alamatOrtuRt" className="block text-xs font-semibold text-[#111815] mb-1">
                  RT <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatOrtuRt"
                  type="text"
                  value={form.alamatOrtuRt}
                  onChange={(e) => {
                    setSameAddressAsStudent(false);
                    updateField('alamatOrtuRt', e.target.value);
                  }}
                  placeholder="048"
                  className={`${inputClass('alamatOrtuRt')} font-mono`}
                />
                {errors.alamatOrtuRt && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatOrtuRt}</p>
                )}
              </div>

              <div>
                <label htmlFor="alamatOrtuRw" className="block text-xs font-semibold text-[#111815] mb-1">
                  RW <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatOrtuRw"
                  type="text"
                  value={form.alamatOrtuRw}
                  onChange={(e) => {
                    setSameAddressAsStudent(false);
                    updateField('alamatOrtuRw', e.target.value);
                  }}
                  placeholder="015"
                  className={`${inputClass('alamatOrtuRw')} font-mono`}
                />
                {errors.alamatOrtuRw && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatOrtuRw}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="alamatOrtuDesa"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Desa / Kelurahan <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatOrtuDesa"
                  type="text"
                  value={form.alamatOrtuDesa}
                  onChange={(e) => {
                    setSameAddressAsStudent(false);
                    updateField('alamatOrtuDesa', e.target.value);
                  }}
                  placeholder="TAMAN"
                  className={inputClass('alamatOrtuDesa')}
                />
                {errors.alamatOrtuDesa && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatOrtuDesa}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="alamatOrtuKecamatan"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Kecamatan <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatOrtuKecamatan"
                  type="text"
                  value={form.alamatOrtuKecamatan}
                  onChange={(e) => {
                    setSameAddressAsStudent(false);
                    updateField('alamatOrtuKecamatan', e.target.value);
                  }}
                  placeholder="TAMAN"
                  className={inputClass('alamatOrtuKecamatan')}
                />
                {errors.alamatOrtuKecamatan && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatOrtuKecamatan}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="alamatOrtuKota"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Kota / Kabupaten <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatOrtuKota"
                  type="text"
                  value={form.alamatOrtuKota}
                  onChange={(e) => {
                    setSameAddressAsStudent(false);
                    updateField('alamatOrtuKota', e.target.value);
                  }}
                  placeholder="KOTA MADIUN"
                  className={inputClass('alamatOrtuKota')}
                />
                {errors.alamatOrtuKota && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatOrtuKota}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="alamatOrtuProvinsi"
                  className="block text-xs font-semibold text-[#111815] mb-1"
                >
                  Provinsi <span className="text-red-600">*</span>
                </label>
                <input
                  id="alamatOrtuProvinsi"
                  type="text"
                  value={form.alamatOrtuProvinsi}
                  onChange={(e) => {
                    setSameAddressAsStudent(false);
                    updateField('alamatOrtuProvinsi', e.target.value);
                  }}
                  placeholder="JAWA TIMUR"
                  className={inputClass('alamatOrtuProvinsi')}
                />
                {errors.alamatOrtuProvinsi && (
                  <p className="mt-1 text-xs text-red-600">{errors.alamatOrtuProvinsi}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 3: INFO PENGAJIAN                                        */}
        {/* ================================================================ */}
        <section className="space-y-4">
          <div className="bg-[#14532D] text-white px-4 py-2 rounded-lg">
            <h2 className="font-display text-sm font-bold tracking-wide uppercase">
              03. Info Pengajian
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="pengajianDaerah"
                className="block text-xs font-semibold text-[#111815] mb-1"
              >
                Daerah <span className="text-red-600">*</span>
              </label>
              <input
                id="pengajianDaerah"
                type="text"
                value={form.pengajianDaerah}
                onChange={(e) => updateField('pengajianDaerah', e.target.value)}
                placeholder="Contoh: KOTA MADIUN"
                className={inputClass('pengajianDaerah')}
              />
              {errors.pengajianDaerah && (
                <p className="mt-1 text-xs text-red-600">{errors.pengajianDaerah}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="pengajianDesa"
                className="block text-xs font-semibold text-[#111815] mb-1"
              >
                Desa <span className="text-red-600">*</span>
              </label>
              <input
                id="pengajianDesa"
                type="text"
                value={form.pengajianDesa}
                onChange={(e) => updateField('pengajianDesa', e.target.value)}
                placeholder="Contoh: TAMAN"
                className={inputClass('pengajianDesa')}
              />
              {errors.pengajianDesa && (
                <p className="mt-1 text-xs text-red-600">{errors.pengajianDesa}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="pengajianKelompok"
                className="block text-xs font-semibold text-[#111815] mb-1"
              >
                Kelompok <span className="text-red-600">*</span>
              </label>
              <input
                id="pengajianKelompok"
                type="text"
                value={form.pengajianKelompok}
                onChange={(e) => updateField('pengajianKelompok', e.target.value)}
                placeholder="Isi nama kelompok atau -"
                className={inputClass('pengajianKelompok')}
              />
              {errors.pengajianKelompok && (
                <p className="mt-1 text-xs text-red-600">{errors.pengajianKelompok}</p>
              )}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* SECTION 4: KEPERLUAN DATA KHUSUS JENJANG (ADMIN CONFIGURED)      */}
        {/* ================================================================ */}
        {currentUnitSchema.fields.length > 0 && (
          <section className="space-y-4">
            <div className="bg-[#F2F4F2] border border-[#D4D9D4] px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-[#14532D] uppercase">
                04. Keperluan Data Khusus Jenjang {unitCfg.shortName}
              </h2>
              <span className="text-xs text-[#4E5651]">
                Diatur oleh Panitia {unitCfg.fullName}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentUnitSchema.fields.map((field) => {
                const errKey = `unitData.${field.id}`;
                const val = form.unitData[field.id] || '';
                const isFullWidth = field.type === 'textarea';

                return (
                  <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
                    <label
                      htmlFor={`field-${field.id}`}
                      className="block text-xs font-semibold text-[#111815] mb-1"
                    >
                      {field.label}{' '}
                      {field.required && <span className="text-red-600">*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        id={`field-${field.id}`}
                        value={val}
                        onChange={(e) => updateUnitData(field.id, e.target.value)}
                        className={inputClass(errKey)}
                      >
                        {!field.required && <option value="">-- Pilih --</option>}
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        id={`field-${field.id}`}
                        rows={2}
                        value={val}
                        onChange={(e) => updateUnitData(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className={inputClass(errKey)}
                      />
                    ) : field.type === 'date' ? (
                      <input
                        id={`field-${field.id}`}
                        type="date"
                        value={val}
                        onChange={(e) => updateUnitData(field.id, e.target.value)}
                        className={inputClass(errKey)}
                      />
                    ) : (
                      <input
                        id={`field-${field.id}`}
                        type="text"
                        inputMode={field.type === 'number' ? 'numeric' : 'text'}
                        maxLength={field.exactDigits || undefined}
                        value={val}
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateUnitData(
                            field.id,
                            field.exactDigits ? raw.replace(/\D/g, '') : raw
                          );
                        }}
                        placeholder={field.placeholder || ''}
                        className={`${inputClass(errKey)} ${
                          field.type === 'number' ? 'font-mono' : ''
                        }`}
                      />
                    )}

                    {errors[errKey] && (
                      <p className="mt-1 text-xs text-red-600">{errors[errKey]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Submit Bar */}
        <div className="pt-5 border-t border-[#E2E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[#4E5651]">
            <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />
            <span>Simpan data untuk menerbitkan bukti pendaftaran PDF anak Anda.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <FileText className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Menyimpan Data...'
                : editingRecord
                  ? 'Simpan Perubahan Data'
                  : 'Simpan & Terbitkan Bukti PDF'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
