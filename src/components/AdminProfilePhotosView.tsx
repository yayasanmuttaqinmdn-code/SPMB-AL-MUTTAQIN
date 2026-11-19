import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Link2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ProfileGalleryConfig, ProfilePhotoSlide } from '../types/spmb.ts';
import {
  DEFAULT_PROFILE_GALLERY_CONFIG,
  getNextSlideIndex,
  INSTITUTION_NAME,
  isValidProfilePhotoUrl,
  MAX_PROFILE_PHOTO_SLIDES,
  normalizeProfileGalleryConfig,
  PROFILE_UNIT_LABELS,
  reorderProfileSlides,
} from '../utils/spmbLogic.ts';
import { processProfileBannerPhotoFile } from '../utils/photoUtils.ts';
import heroCampusImg from '../assets/images/hero_pesantren_campus_1794667124955.jpg';

interface AdminProfilePhotosViewProps {
  profileGallery: ProfileGalleryConfig;
  onSaveProfileGallery: (nextGallery: ProfileGalleryConfig) => Promise<void>;
}

const INTERVAL_OPTIONS = [
  { value: 3, label: '3 detik (Cepat)' },
  { value: 4, label: '4 detik (Standar)' },
  { value: 5, label: '5 detik (Sedang)' },
  { value: 7, label: '7 detik (Santai)' },
  { value: 10, label: '10 detik (Lambat)' },
];

export const AdminProfilePhotosView: React.FC<AdminProfilePhotosViewProps> = ({
  profileGallery,
  onSaveProfileGallery,
}) => {
  const [draft, setDraft] = useState<ProfileGalleryConfig>(() =>
    normalizeProfileGalleryConfig(profileGallery)
  );
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Optional external URL input
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlUnitLabel, setUrlUnitLabel] = useState('Yayasan');
  const [urlCaption, setUrlCaption] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(normalizeProfileGalleryConfig(profileGallery));
  }, [profileGallery]);

  useEffect(() => {
    if (previewIndex >= draft.slides.length) {
      setPreviewIndex(0);
    }
  }, [draft.slides.length, previewIndex]);

  useEffect(() => {
    if (!draft.autoPlay || draft.slides.length < 2) return;
    const timer = window.setInterval(() => {
      setPreviewIndex((curr) => getNextSlideIndex(curr, draft.slides.length, 1));
    }, draft.intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [draft.autoPlay, draft.intervalSeconds, draft.slides.length]);

  const remainingSlots = Math.max(0, MAX_PROFILE_PHOTO_SLIDES - draft.slides.length);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    if (remainingSlots <= 0) {
      setErrorMsg(`Maksimal ${MAX_PROFILE_PHOTO_SLIDES} foto profil sudah tercapai.`);
      return;
    }

    setIsProcessingUpload(true);
    setErrorMsg('');
    setFeedback('');

    try {
      const filesToProcess = files.slice(0, remainingSlots);
      const addedSlides: ProfilePhotoSlide[] = [];
      for (let i = 0; i < filesToProcess.length; i += 1) {
        const file = filesToProcess[i];
        const dataUrl = await processProfileBannerPhotoFile(file);
        const cleanBaseName = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[_-]+/g, ' ')
          .trim()
          .slice(0, 80);
        addedSlides.push({
          id: `slide-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          imageUrl: dataUrl,
          caption: cleanBaseName,
          unitLabel: 'Yayasan',
        });
      }

      setDraft((prev) => ({
        ...prev,
        slides: [...prev.slides, ...addedSlides].slice(0, MAX_PROFILE_PHOTO_SLIDES),
      }));

      if (files.length > remainingSlots) {
        setFeedback(
          `${addedSlides.length} foto ditambahkan (batas maksimal ${MAX_PROFILE_PHOTO_SLIDES} foto). Klik "Simpan Galeri Foto" agar tampil di halaman depan.`
        );
      } else {
        setFeedback(
          `${addedSlides.length} foto berhasil dioptimalkan. Klik "Simpan Galeri Foto" agar langsung aktif di Portal Masuk.`
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal memproses foto. Pastikan format JPG/PNG/WebP.'
      );
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleAddByUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFeedback('');

    if (remainingSlots <= 0) {
      setErrorMsg(`Maksimal ${MAX_PROFILE_PHOTO_SLIDES} foto profil sudah tercapai.`);
      return;
    }

    const cleanUrl = urlInput.trim();
    if (!isValidProfilePhotoUrl(cleanUrl)) {
      setErrorMsg(
        'Masukkan link foto yang valid (diawali https:// atau path /assets/...).'
      );
      return;
    }

    const nextSlide: ProfilePhotoSlide = {
      id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      imageUrl: cleanUrl,
      caption: urlCaption.trim().slice(0, 120),
      unitLabel: urlUnitLabel.trim() || undefined,
    };

    setDraft((prev) => ({
      ...prev,
      slides: [...prev.slides, nextSlide].slice(0, MAX_PROFILE_PHOTO_SLIDES),
    }));
    setUrlInput('');
    setUrlCaption('');
    setFeedback('Foto dari URL ditambahkan ke daftar. Klik "Simpan Galeri Foto" untuk menerbitkan.');
  };

  const handleUpdateSlide = (index: number, patch: Partial<ProfilePhotoSlide>) => {
    setFeedback('');
    setDraft((prev) => {
      const nextSlides = prev.slides.slice();
      nextSlides[index] = { ...nextSlides[index], ...patch };
      return { ...prev, slides: nextSlides };
    });
  };

  const handleMoveSlide = (index: number, dir: -1 | 1) => {
    setFeedback('');
    setDraft((prev) => ({
      ...prev,
      slides: reorderProfileSlides(prev.slides, index, dir),
    }));
  };

  const handleDeleteSlide = (index: number) => {
    setFeedback('');
    setDraft((prev) => ({
      ...prev,
      slides: prev.slides.filter((_, i) => i !== index),
    }));
  };

  const handleResetDefault = () => {
    setFeedback('');
    setErrorMsg('');
    setDraft(structuredClone(DEFAULT_PROFILE_GALLERY_CONFIG));
    setPreviewIndex(0);
    setFeedback('Draf dikembalikan ke foto bawaan. Klik "Simpan Galeri Foto" untuk menerapkan.');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setFeedback('');
    try {
      const normalized = normalizeProfileGalleryConfig(draft);
      await onSaveProfileGallery(normalized);
      setDraft(normalized);
      setFeedback(
        normalized.slides.length >= 2
          ? `Galeri slideshow (${normalized.slides.length} foto) berhasil disimpan dan langsung aktif bergerak di halaman Portal Masuk.`
          : normalized.slides.length === 1
            ? '1 foto profil lembaga berhasil disimpan dan tampil di halaman Portal Masuk.'
            : 'Tampilan berhasil dikembalikan ke foto kampus bawaan.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan galeri foto profil.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const activePreviewSlide = draft.slides[previewIndex] || null;

  return (
    <div className="space-y-6">
      {/* Top Card: Live Preview & Slideshow Controls */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E5E2]">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111815]">
              Kelola Foto Profil Lembaga (Slideshow Portal Masuk)
            </h2>
            <p className="text-xs text-[#4E5651] mt-0.5">
              Unggah 2–{MAX_PROFILE_PHOTO_SLIDES} foto profil lembaga agar banner halaman depan
              bergerak otomatis menampilkan kegiatan dan fasilitas {INSTITUTION_NAME}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#4E5651] bg-white border border-[#D4D9D4] hover:bg-[#F2F4F2] rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Foto Bawaan</span>
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isProcessingUpload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] disabled:opacity-60 rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Galeri Foto'}</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div
            role="status"
            className="flex items-start gap-2 text-xs text-[#14532D] bg-[#F2F7F4] border border-[#C6DFCF] rounded-lg px-3.5 py-2.5"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{feedback}</span>
          </div>
        )}

        {errorMsg && (
          <p
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
          >
            {errorMsg}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Live Slideshow Preview */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#4E5651]">
              <span className="font-semibold text-[#111815]">Pratinjau Banner Halaman Depan</span>
              <span className="font-mono tabular-nums">
                {draft.slides.length === 0
                  ? 'Foto Bawaan'
                  : `Slide ${previewIndex + 1} / ${draft.slides.length}`}
              </span>
            </div>

            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#E7EAE7] border border-[#D4D9D4]">
              {draft.slides.length === 0 ? (
                <img
                  src={heroCampusImg}
                  alt={`Foto bawaan ${INSTITUTION_NAME}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                draft.slides.map((slide, idx) => {
                  const isActive = idx === previewIndex;
                  return (
                    <img
                      key={slide.id}
                      src={slide.imageUrl}
                      alt={slide.caption || `Foto profil lembaga ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${
                        isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                      }`}
                    />
                  );
                })
              )}

              {draft.slides.length >= 2 && (
                <>
                  <button
                    type="button"
                    aria-label="Pratinjau foto sebelumnya"
                    onClick={() =>
                      setPreviewIndex((curr) => getNextSlideIndex(curr, draft.slides.length, -1))
                    }
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Pratinjau foto berikutnya"
                    onClick={() =>
                      setPreviewIndex((curr) => getNextSlideIndex(curr, draft.slides.length, 1))
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white flex items-end justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  {activePreviewSlide?.unitLabel && (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FDE68A]">
                      {activePreviewSlide.unitLabel}
                    </p>
                  )}
                  {activePreviewSlide?.caption && (
                    <p className="text-xs font-medium text-white line-clamp-1">
                      {activePreviewSlide.caption}
                    </p>
                  )}
                  <p className="text-[11px] text-white/85">
                    {draft.slides.length === 0
                      ? 'Menampilkan foto kampus bawaan'
                      : draft.slides.length === 1
                        ? 'Tambahkan minimal 1 foto lagi agar bergerak otomatis'
                        : draft.autoPlay
                          ? `Bergerak otomatis tiap ${draft.intervalSeconds} detik`
                          : 'Mode geser manual aktif'}
                  </p>
                </div>

                {draft.slides.length >= 2 && (
                  <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                    {draft.slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={`Lihat pratinjau slide ${idx + 1}`}
                        onClick={() => setPreviewIndex(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === previewIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upload & Slideshow Settings */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[#111815]">Tambah Foto Profil</h3>
                <span className="text-[11px] font-mono text-[#4E5651] tabular-nums">
                  {draft.slides.length} / {MAX_PROFILE_PHOTO_SLIDES} foto
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => void handleFilesSelected(e)}
                className="sr-only"
                id="admin-profile-photo-upload"
              />

              <button
                type="button"
                disabled={isProcessingUpload || remainingSlots <= 0}
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] disabled:opacity-50 rounded-lg transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isProcessingUpload
                    ? 'Memproses foto...'
                    : remainingSlots <= 0
                      ? 'Batas Maksimal Foto Tercapai'
                      : 'Unggah Foto dari Perangkat'}
                </span>
              </button>

              <p className="text-[11px] text-[#4E5651] leading-relaxed">
                Bisa pilih beberapa foto sekaligus (JPG, PNG, atau WebP). Foto otomatis disesuaikan
                ke rasio lanskap 16:10 agar rapi dan ringan.
              </p>

              <div className="pt-2 border-t border-[#E2E5E2]">
                <button
                  type="button"
                  onClick={() => setShowUrlForm((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D] hover:underline"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{showUrlForm ? 'Tutup input link URL' : 'Atau tambah via Link URL Foto'}</span>
                </button>

                {showUrlForm && (
                  <form onSubmit={handleAddByUrl} className="mt-3 space-y-2.5">
                    <div>
                      <label
                        htmlFor="profile-photo-url-input"
                        className="block text-[11px] font-semibold text-[#111815] mb-1"
                      >
                        URL Gambar
                      </label>
                      <input
                        id="profile-photo-url-input"
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://... atau /assets/..."
                        className="w-full px-3 py-2 text-xs bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="profile-photo-url-unit"
                          className="block text-[11px] font-semibold text-[#111815] mb-1"
                        >
                          Label Lembaga
                        </label>
                        <select
                          id="profile-photo-url-unit"
                          value={urlUnitLabel}
                          onChange={(e) => setUrlUnitLabel(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                        >
                          <option value="">Tanpa Label</option>
                          {PROFILE_UNIT_LABELS.map((lbl) => (
                            <option key={lbl} value={lbl}>
                              {lbl}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="profile-photo-url-caption"
                          className="block text-[11px] font-semibold text-[#111815] mb-1"
                        >
                          Keterangan Singkat
                        </label>
                        <input
                          id="profile-photo-url-caption"
                          type="text"
                          value={urlCaption}
                          onChange={(e) => setUrlCaption(e.target.value)}
                          placeholder="Contoh: Gedung SMA"
                          className="w-full px-2.5 py-2 text-xs bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={remainingSlots <= 0}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#14532D] bg-white border border-[#14532D] hover:bg-[#14532D]/5 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambahkan Foto dari URL</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-3">
              <h3 className="text-xs font-bold text-[#111815]">Pengaturan Gerak Slideshow</h3>

              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs text-[#111815] font-medium">
                  Putar Otomatis (Foto Bergerak)
                </span>
                <input
                  type="checkbox"
                  checked={draft.autoPlay}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, autoPlay: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#14532D] rounded cursor-pointer"
                />
              </label>

              <div>
                <label
                  htmlFor="profile-slideshow-interval"
                  className="block text-xs font-medium text-[#4E5651] mb-1"
                >
                  Durasi per Foto
                </label>
                <select
                  id="profile-slideshow-interval"
                  value={draft.intervalSeconds}
                  disabled={!draft.autoPlay}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      intervalSeconds: Number(e.target.value) || 4,
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] disabled:opacity-50"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Slide List */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-[#111815]">
            Daftar Foto Slideshow ({draft.slides.length})
          </h3>
          {draft.slides.length > 0 && (
            <span className="text-xs text-[#4E5651]">
              Urutan dari atas ke bawah menentukan urutan tampil
            </span>
          )}
        </div>

        {draft.slides.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-[#D4D9D4] bg-[#F9FAF9] text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#14532D]/10 text-[#14532D] flex items-center justify-center mx-auto">
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-semibold text-[#111815]">
              Belum ada foto profil lembaga yang diunggah
            </p>
            <p className="text-xs text-[#4E5651] max-w-md mx-auto">
              Halaman depan saat ini menggunakan foto kampus bawaan. Klik tombol{' '}
              <strong>Unggah Foto dari Perangkat</strong> di atas untuk menambahkan beberapa foto
              lembaga.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {draft.slides.map((slide, idx) => (
              <div
                key={slide.id}
                className="p-3.5 rounded-xl border border-[#E2E5E2] bg-[#F9FAF9] flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5"
              >
                <button
                  type="button"
                  onClick={() => setPreviewIndex(idx)}
                  aria-label={`Tampilkan pratinjau slide ${idx + 1}`}
                  className={`relative w-full sm:w-36 aspect-[16/10] rounded-lg overflow-hidden bg-[#E7EAE7] border shrink-0 transition-all ${
                    previewIndex === idx
                      ? 'border-[#14532D] ring-2 ring-[#14532D]/30'
                      : 'border-[#D4D9D4] hover:border-[#14532D]'
                  }`}
                >
                  <img
                    src={slide.imageUrl}
                    alt={slide.caption || `Foto slide ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/65 text-white text-[10px] font-mono">
                    #{idx + 1}
                  </span>
                </button>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 min-w-0">
                  <div className="sm:col-span-4">
                    <label
                      htmlFor={`slide-unit-${slide.id}`}
                      className="block text-[11px] font-semibold text-[#4E5651] mb-1"
                    >
                      Label Lembaga
                    </label>
                    <select
                      id={`slide-unit-${slide.id}`}
                      value={slide.unitLabel || ''}
                      onChange={(e) =>
                        handleUpdateSlide(idx, { unitLabel: e.target.value || undefined })
                      }
                      className="w-full px-2.5 py-2 text-xs bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                    >
                      <option value="">Tanpa Label</option>
                      {PROFILE_UNIT_LABELS.map((lbl) => (
                        <option key={lbl} value={lbl}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-8">
                    <label
                      htmlFor={`slide-caption-${slide.id}`}
                      className="block text-[11px] font-semibold text-[#4E5651] mb-1"
                    >
                      Keterangan Foto (Opsional)
                    </label>
                    <input
                      id={`slide-caption-${slide.id}`}
                      type="text"
                      maxLength={120}
                      value={slide.caption}
                      onChange={(e) => handleUpdateSlide(idx, { caption: e.target.value })}
                      placeholder="Misal: Kegiatan Tahfidz & Pembelajaran Santri"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                    />
                  </div>
                </div>

                <div className="flex sm:flex-col items-center justify-end gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label={`Pindahkan foto ${idx + 1} ke atas`}
                    disabled={idx === 0}
                    onClick={() => handleMoveSlide(idx, -1)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#D4D9D4] bg-white text-[#111815] hover:bg-[#F2F4F2] disabled:opacity-40"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Pindahkan foto ${idx + 1} ke bawah`}
                    disabled={idx === draft.slides.length - 1}
                    onClick={() => handleMoveSlide(idx, 1)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-[#D4D9D4] bg-white text-[#111815] hover:bg-[#F2F4F2] disabled:opacity-40"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus foto ${idx + 1}`}
                    onClick={() => handleDeleteSlide(idx)}
                    className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
