import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Wallet,
} from 'lucide-react';
import type { DashboardStats, ProfileGalleryConfig, UnitId } from '../types/spmb.ts';
import {
  ACADEMIC_YEAR,
  DEFAULT_PROFILE_GALLERY_CONFIG,
  FOUNDATION_LOGO_PATH,
  getNextSlideIndex,
  getUnitLogoPath,
  INSTITUTION_NAME,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from '../utils/spmbLogic.ts';

const PORTAL_HERO_IMAGE_PATH =
  '/assets/aistudio/WhatsApp_Image_2026-11-22_at_09.42.55_195213e6.jpeg';

interface PortalLoginViewProps {
  stats: DashboardStats;
  profileGallery?: ProfileGalleryConfig;
  onEnterUnitForm: (unit: UnitId) => void;
  onOpenDashboard: () => void;
  onOpenLookup: () => void;
  onOpenFees?: () => void;
}

export const PortalLoginView: React.FC<PortalLoginViewProps> = ({
  stats,
  profileGallery = DEFAULT_PROFILE_GALLERY_CONFIG,
  onEnterUnitForm,
  onOpenDashboard,
  onOpenLookup,
  onOpenFees,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [crestImgError, setCrestImgError] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [brokenSlideIds, setBrokenSlideIds] = useState<Record<string, boolean>>({});

  const validSlides = (profileGallery.slides || []).filter((s) => !brokenSlideIds[s.id]);
  const hasMultipleSlides = validSlides.length >= 2;
  const safeSlideIdx =
    validSlides.length > 0 ? Math.min(activeSlideIdx, validSlides.length - 1) : 0;
  const activeSlide = validSlides[safeSlideIdx] || null;

  useEffect(() => {
    setActiveSlideIdx(0);
  }, [profileGallery.slides.length]);

  useEffect(() => {
    if (!hasMultipleSlides || !profileGallery.autoPlay || isCarouselPaused) return;
    const intervalMs = Math.max(2, profileGallery.intervalSeconds || 4) * 1000;
    const timer = window.setInterval(() => {
      setActiveSlideIdx((curr) => getNextSlideIndex(curr, validSlides.length, 1));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [
    hasMultipleSlides,
    profileGallery.autoPlay,
    profileGallery.intervalSeconds,
    isCarouselPaused,
    validSlides.length,
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Compact Institutional Header Banner */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 p-5 sm:p-8 flex flex-col justify-between gap-5 sm:gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3.5">
              {!crestImgError ? (
                <img
                  src={FOUNDATION_LOGO_PATH}
                  alt={`Lambang ${INSTITUTION_NAME}`}
                  onError={() => setCrestImgError(true)}
                  className="w-12 h-12 rounded-xl object-contain bg-white p-0.5 border border-[#E2E5E2] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#14532D]/10 flex items-center justify-center text-[#14532D] shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
              )}
              <div className="text-xs text-[#4E5651]">
                <p className="font-semibold text-[#14532D]">{INSTITUTION_NAME}</p>
                <p>Tahun Pelajaran {ACADEMIC_YEAR}</p>
              </div>
            </div>

            <h1 className="font-display text-xl sm:text-3xl font-bold text-[#111815] leading-tight">
              Sistem Penerimaan Murid Baru (SPMB)
            </h1>

            <p className="text-sm text-[#4E5651] leading-relaxed max-w-xl">
              Pendaftaran peserta didik baru RA / TK, SDIT, SMP, dan SMA.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-3 border-t border-[#EFF1EF]">
            <a
              href="#pilih-lembaga"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Pilih Lembaga</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Dashboard ({stats.totalCount})</span>
            </button>
            <button
              type="button"
              onClick={onOpenLookup}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#14532D] bg-white border border-[#D4D9D4] hover:border-[#14532D] rounded-lg transition-colors whitespace-nowrap"
            >
              <FileSearch className="w-4 h-4" />
              <span>Cek Status</span>
            </button>
            {onOpenFees && (
              <button
                type="button"
                onClick={onOpenFees}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#926C15] bg-white border border-[#D4D9D4] hover:border-[#926C15] rounded-lg transition-colors whitespace-nowrap"
              >
                <Wallet className="w-4 h-4" />
                <span>Informasi Biaya</span>
              </button>
            )}
          </div>
        </div>

        <div
          className="order-first lg:order-last lg:col-span-5 relative h-52 sm:h-64 lg:h-auto lg:min-h-[240px] bg-[#E7EAE7] overflow-hidden group"
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          onFocus={() => setIsCarouselPaused(true)}
          onBlur={() => setIsCarouselPaused(false)}
          aria-roledescription={hasMultipleSlides ? 'carousel' : undefined}
          aria-label={`Galeri profil ${INSTITUTION_NAME}`}
        >
          {validSlides.length > 0 ? (
            validSlides.map((slide, idx) => {
              const isActive = idx === safeSlideIdx;
              return (
                <img
                  key={slide.id}
                  src={slide.imageUrl}
                  alt={slide.caption || `Foto profil ${INSTITUTION_NAME} ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setBrokenSlideIds((prev) => ({
                      ...prev,
                      [slide.id]: true,
                    }))
                  }
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${
                    isActive
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-105 pointer-events-none'
                  }`}
                />
              );
            })
          ) : !heroImgError ? (
            <img
              src={PORTAL_HERO_IMAGE_PATH}
              alt={`Kampus ${INSTITUTION_NAME}`}
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <BookOpen className="w-8 h-8 text-[#14532D] mb-2" />
              <p className="font-display text-base font-semibold text-[#111815]">
                {INSTITUTION_NAME}
              </p>
            </div>
          )}

          {hasMultipleSlides && (
            <>
              <button
                type="button"
                aria-label="Foto profil sebelumnya"
                onClick={() =>
                  setActiveSlideIdx((curr) => getNextSlideIndex(curr, validSlides.length, -1))
                }
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-opacity sm:opacity-80 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Foto profil berikutnya"
                onClick={() =>
                  setActiveSlideIdx((curr) => getNextSlideIndex(curr, validSlides.length, 1))
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 hover:bg-black/70 text-white flex items-center justify-center transition-opacity sm:opacity-80 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white flex items-end justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              {activeSlide?.unitLabel && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#FDE68A]">
                  {activeSlide.unitLabel}
                </p>
              )}
              {activeSlide?.caption && (
                <p className="text-xs font-semibold text-white line-clamp-1">
                  {activeSlide.caption}
                </p>
              )}
              <p className="text-xs font-medium text-white/90">
                Total Pendaftar: <strong className="font-mono">{stats.totalCount}</strong> /{' '}
                {stats.totalQuota} kuota
              </p>
            </div>

            {hasMultipleSlides && (
              <div
                role="tablist"
                aria-label="Pilih slide foto profil"
                className="flex items-center gap-1.5 shrink-0 pb-0.5"
              >
                {validSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === safeSlideIdx}
                    aria-label={`Tampilkan foto profil ke-${idx + 1}`}
                    onClick={() => setActiveSlideIdx(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === safeSlideIdx
                        ? 'w-5 bg-white'
                        : 'w-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Direct Unit Selection Cards (Clicking directly opens unit registration form) */}
      <section id="pilih-lembaga" className="space-y-4">
        <h2 className="font-display text-lg font-bold text-[#111815]">
          Pilih Lembaga Pendaftaran
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {UNIT_ORDER.map((unit) => {
            const cfg = UNIT_CONFIGS[unit];
            const st = stats.byUnit[unit];

            return (
              <button
                key={unit}
                type="button"
                onClick={() => onEnterUnitForm(unit)}
                className="group text-left p-4 sm:p-5 rounded-xl border border-[#E2E5E2] bg-white hover:border-[#14532D] hover:ring-1 hover:ring-[#14532D] transition-all flex flex-col justify-between gap-3 sm:gap-4 focus-visible:outline-2 focus-visible:outline-[#14532D]"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-[#4E5651]">
                    <div className="flex items-center gap-2">
                      <img
                        src={getUnitLogoPath(unit)}
                        alt={`Logo ${cfg.shortName}`}
                        className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 border border-[#E2E5E2] shrink-0"
                      />
                      <span>{cfg.ageRange}</span>
                    </div>
                    <span className="font-mono font-semibold text-[#14532D] tabular-nums">
                      {st.count} / {st.quota}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#111815] group-hover:text-[#14532D] transition-colors">
                    {cfg.fullName}
                  </h3>

                  {st.quotaPutra !== undefined && st.quotaPutri !== undefined && (
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono tabular-nums text-[#4E5651]">
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#F6F7F6] border border-[#E2E5E2] flex items-center justify-between gap-1 whitespace-nowrap">
                        <span>Putra</span>
                        <strong className="text-[#111815]">
                          {st.maleCount !== undefined
                            ? `${st.maleCount}/${st.quotaPutra}`
                            : `-/${st.quotaPutra}`}
                        </strong>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg bg-[#F6F7F6] border border-[#E2E5E2] flex items-center justify-between gap-1 whitespace-nowrap">
                        <span>Putri</span>
                        <strong className="text-[#111815]">
                          {st.femaleCount !== undefined
                            ? `${st.femaleCount}/${st.quotaPutri}`
                            : `-/${st.quotaPutri}`}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#EFF1EF] flex items-center justify-between text-xs font-semibold text-[#14532D]">
                  <span>Daftar {cfg.shortName}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
