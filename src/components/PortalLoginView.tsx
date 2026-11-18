import React, { useState } from 'react';
import { ArrowRight, BookOpen, FileSearch } from 'lucide-react';
import type { DashboardStats, UnitId } from '../types/spmb.ts';
import {
  ACADEMIC_YEAR,
  FOUNDATION_LOGO_PATH,
  getUnitLogoPath,
  INSTITUTION_LOCATION,
  INSTITUTION_NAME,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from '../utils/spmbLogic.ts';

interface PortalLoginViewProps {
  stats: DashboardStats;
  onEnterUnitForm: (unit: UnitId) => void;
  onOpenDashboard: () => void;
  onOpenLookup: () => void;
}

export const PortalLoginView: React.FC<PortalLoginViewProps> = ({
  stats,
  onEnterUnitForm,
  onOpenDashboard,
  onOpenLookup,
}) => {
  const [heroImgError, setHeroImgError] = useState(false);
  const [crestImgError, setCrestImgError] = useState(false);

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
                  alt="Lambang Yayasan Pondok Pesantren Muttaqin"
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
                <p>
                  {INSTITUTION_LOCATION} · Tahun Ajaran {ACADEMIC_YEAR}
                </p>
              </div>
            </div>

            <h1 className="font-display text-xl sm:text-3xl font-bold text-[#111815] leading-tight">
              Sistem Penerimaan Murid Baru (SPMB)
            </h1>

            <p className="text-sm text-[#4E5651] leading-relaxed max-w-xl">
              Klik salah satu jenjang pendidikan tujuan (<strong>RA / TK</strong>,{' '}
              <strong>SDIT</strong>, <strong>SMP</strong>, atau <strong>SMA</strong>) di bawah ini
              untuk langsung masuk ke formulir pendaftaran dan mengunduh bukti PDF resmi.
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
              <span>Dashboard Pendaftar ({stats.totalCount})</span>
            </button>
            <button
              type="button"
              onClick={onOpenLookup}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#14532D] bg-white border border-[#D4D9D4] hover:border-[#14532D] rounded-lg transition-colors whitespace-nowrap"
            >
              <FileSearch className="w-4 h-4" />
              <span>Cek Status Pendaftaran</span>
            </button>
          </div>
        </div>

        <div className="order-first lg:order-last lg:col-span-5 relative h-44 sm:h-56 lg:h-auto lg:min-h-[220px] bg-[#E7EAE7]">
          {!heroImgError ? (
            <img
              src="/src/assets/images/hero_pesantren_campus_1794667124955.jpg"
              alt="Kampus Yayasan Pondok Pesantren Muttaqin Josenan Madiun"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <BookOpen className="w-8 h-8 text-[#14532D] mb-2" />
              <p className="font-display text-base font-semibold text-[#111815]">
                {INSTITUTION_NAME}
              </p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 via-black/35 to-transparent text-white">
            <p className="text-xs font-medium text-white/90">
              Total Pendaftar Sementara: <strong className="font-mono">{stats.totalCount}</strong>{' '}
              dari {stats.totalQuota} kuota
            </p>
          </div>
        </div>
      </section>

      {/* Direct Unit Selection Cards (Clicking directly opens unit registration form) */}
      <section id="pilih-lembaga" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-[#111815]">
            Pilih Lembaga Pendaftaran
          </h2>
          <span className="text-xs text-[#4E5651]">
            Klik kartu lembaga untuk langsung mengisi formulir pendaftaran
          </span>
        </div>

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
                  <p className="text-xs text-[#4E5651] leading-relaxed">{cfg.tagline}</p>
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
