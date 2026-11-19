import React, { useMemo, useState } from 'react';
import { ArrowRight, GraduationCap, MapPin, Search, Users } from 'lucide-react';
import type { FormSchemaConfig, RegistrationRecord, UnitId } from '../types/spmb.ts';
import {
  ACADEMIC_YEAR,
  classifyAlumniOrigin,
  computeAdminAnalytics,
  computePerUnitRecaps,
  DEFAULT_FORM_CONFIG,
  FOUNDATION_LOGO_PATH,
  getUnitLogoPath,
  INSTITUTION_NAME,
  isGenderSplitQuotaUnit,
  UNIT_CONFIGS,
  UNIT_ORDER,
  type AlumniCategory,
} from '../utils/spmbLogic.ts';

interface AdminAnalyticsViewProps {
  registrations: RegistrationRecord[];
  formConfig?: FormSchemaConfig;
}

type RegionFilter = 'MADIUN_ALL' | 'KOTA_MADIUN' | 'KAB_MADIUN' | 'ALL';
type AlumniFilter = 'ALL_ALUMNI' | Exclude<AlumniCategory, 'NON_ALUMNI'>;

function formatAlumniCategoryLabel(cat: Exclude<AlumniCategory, 'NON_ALUMNI'>): string {
  switch (cat) {
    case 'RA_AL_MUTTAQIN':
      return 'RA / TK Al Muttaqin';
    case 'SDIT_AL_MUTTAQIN':
      return 'SDIT Al Muttaqin';
    case 'SMP_WUSTHA_AL_MUTTAQIN':
      return 'SMP / Wustha Al Muttaqin';
  }
}

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  registrations,
  formConfig = DEFAULT_FORM_CONFIG,
}) => {
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitId>('ALL');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('MADIUN_ALL');
  const [alumniFilter, setAlumniFilter] = useState<AlumniFilter>('ALL_ALUMNI');
  const [alumniSearch, setAlumniSearch] = useState('');

  // Full dataset analytics (for comparison table across all 4 jenjang)
  const fullAnalytics = useMemo(
    () => computeAdminAnalytics(registrations),
    [registrations]
  );

  // Separated recap per unit (TK, SD, SMP, SMA)
  const perUnitRecaps = useMemo(
    () => computePerUnitRecaps(registrations, formConfig),
    [registrations, formConfig]
  );

  // Unit-scoped dataset for drill-down view
  const scopedRecords = useMemo(() => {
    if (unitFilter === 'ALL') return registrations;
    return registrations.filter((r) => r.unit === unitFilter);
  }, [registrations, unitFilter]);

  const scopedAnalytics = useMemo(
    () => computeAdminAnalytics(scopedRecords),
    [scopedRecords]
  );

  const activeUnitRecap = unitFilter !== 'ALL' ? perUnitRecaps[unitFilter] : null;

  const visiblePengajianGroups = useMemo(() => {
    return scopedAnalytics.pengajianGroups.filter((group) => {
      if (regionFilter === 'MADIUN_ALL') {
        return group.region === 'KOTA_MADIUN' || group.region === 'KAB_MADIUN';
      }
      if (regionFilter === 'KOTA_MADIUN') return group.region === 'KOTA_MADIUN';
      if (regionFilter === 'KAB_MADIUN') return group.region === 'KAB_MADIUN';
      return true;
    });
  }, [scopedAnalytics.pengajianGroups, regionFilter]);

  const visibleDesaSummary = useMemo(() => {
    return scopedAnalytics.madiunDesaSummary.filter((item) => {
      if (regionFilter === 'KOTA_MADIUN') return item.region === 'KOTA_MADIUN';
      if (regionFilter === 'KAB_MADIUN') return item.region === 'KAB_MADIUN';
      return true;
    });
  }, [scopedAnalytics.madiunDesaSummary, regionFilter]);

  const visibleAlumniRecords = useMemo(() => {
    const q = alumniSearch.trim().toLowerCase();
    return scopedAnalytics.alumniSummary.alumniRecords.filter(({ record, category }) => {
      if (alumniFilter !== 'ALL_ALUMNI' && category !== alumniFilter) return false;
      if (!q) return true;
      return (
        record.namaLengkap.toLowerCase().includes(q) ||
        record.noPendaftaran.toLowerCase().includes(q) ||
        record.asalSekolah.toLowerCase().includes(q) ||
        record.pengajianDaerah.toLowerCase().includes(q) ||
        record.pengajianDesa.toLowerCase().includes(q)
      );
    });
  }, [scopedAnalytics.alumniSummary.alumniRecords, alumniFilter, alumniSearch]);

  const madiunTotalForCurrentFilter =
    regionFilter === 'KOTA_MADIUN'
      ? scopedAnalytics.pengajianSummary.kotaMadiun
      : regionFilter === 'KAB_MADIUN'
        ? scopedAnalytics.pengajianSummary.kabMadiun
        : regionFilter === 'MADIUN_ALL'
          ? scopedAnalytics.pengajianSummary.madiunCombined
          : scopedAnalytics.totalCount;

  const maxDesaCount = useMemo(
    () => Math.max(1, ...visibleDesaSummary.map((d) => d.totalCount)),
    [visibleDesaSummary]
  );

  const scopedAlumniPct =
    scopedAnalytics.totalCount > 0
      ? Math.round((scopedAnalytics.alumniSummary.totalAlumni / scopedAnalytics.totalCount) * 100)
      : 0;

  const scopedMadiunPct =
    scopedAnalytics.totalCount > 0
      ? Math.round(
          (scopedAnalytics.pengajianSummary.madiunCombined / scopedAnalytics.totalCount) * 100
        )
      : 0;

  const fullMalePct =
    fullAnalytics.totalCount > 0
      ? Math.round((fullAnalytics.totalMale / fullAnalytics.totalCount) * 100)
      : 0;
  const fullFemalePct = fullAnalytics.totalCount > 0 ? 100 - fullMalePct : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header + Separated Unit Switcher (TK, SD, SMP, SMA) */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E5E2]">
          <div className="flex items-center gap-3">
            <img
              src={unitFilter === 'ALL' ? FOUNDATION_LOGO_PATH : getUnitLogoPath(unitFilter)}
              alt={
                unitFilter === 'ALL'
                  ? `Logo ${INSTITUTION_NAME}`
                  : `Logo ${UNIT_CONFIGS[unitFilter].shortName}`
              }
              className="w-11 h-11 rounded-xl object-contain bg-white p-0.5 border border-[#E2E5E2] shrink-0"
            />
            <div>
              <p className="text-[11px] font-semibold text-[#926C15]">
                {INSTITUTION_NAME} · Tahun Pelajaran {ACADEMIC_YEAR}
              </p>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#111815]">
                {unitFilter === 'ALL'
                  ? 'Rekap Dashboard Admin'
                  : `Rekap ${UNIT_CONFIGS[unitFilter].fullName}`}
              </h2>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Pilih rekap jenjang dashboard admin"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-[#F2F4F2] rounded-lg shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={unitFilter === 'ALL'}
              onClick={() => setUnitFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                unitFilter === 'ALL'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Semua ({registrations.length})
            </button>
            {UNIT_ORDER.map((u) => (
              <button
                key={u}
                type="button"
                role="tab"
                aria-selected={unitFilter === u}
                onClick={() => setUnitFilter(u)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors tabular-nums ${
                  unitFilter === u
                    ? 'bg-white text-[#14532D] shadow-xs'
                    : 'text-[#4E5651] hover:text-[#111815]'
                }`}
              >
                {UNIT_CONFIGS[u].shortName} ({perUnitRecaps[u].totalCount})
              </button>
            ))}
          </div>
        </div>

        {/* OVERVIEW MODE: 4 Separate Recap Panels for RA / TK, SDIT, SMP, SMA */}
        {unitFilter === 'ALL' ? (
          <div
            aria-label="Rekap terpisah per jenjang"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {UNIT_ORDER.map((unit) => {
              const recap = perUnitRecaps[unit];
              const isGenderSplit = isGenderSplitQuotaUnit(unit);
              const pct =
                recap.quota > 0
                  ? Math.min(100, Math.round((recap.totalCount / recap.quota) * 100))
                  : 0;

              return (
                <article
                  key={unit}
                  aria-label={`Rekap ${recap.shortName}`}
                  className="p-4 sm:p-5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={getUnitLogoPath(unit)}
                        alt={`Logo ${recap.shortName}`}
                        className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border border-[#E2E5E2] shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-bold text-[#111815] truncate">
                          {recap.fullName}
                        </h3>
                        <p className="text-xs text-[#4E5651] tabular-nums">
                          Kuota: {recap.quota} · Sisa: {recap.remaining}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setUnitFilter(unit)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#14532D] bg-white border border-[#D4D9D4] hover:border-[#14532D] rounded-lg whitespace-nowrap shrink-0 transition-colors"
                    >
                      <span>Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Count + Progress + Split Putra/Putri if SMP/SMA */}
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-2xl sm:text-3xl font-bold text-[#14532D] tabular-nums">
                          {recap.totalCount}
                        </span>
                        <span className="text-xs font-mono text-[#4E5651] tabular-nums">
                          / {recap.quota} ({pct}%)
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#111815] tabular-nums">
                        {recap.maleCount} L · {recap.femaleCount} P
                      </span>
                    </div>

                    <div className="h-2 w-full bg-[#E7EAE7] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14532D] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {isGenderSplit &&
                      recap.quotaPutra !== undefined &&
                      recap.quotaPutri !== undefined && (
                        <div className="grid grid-cols-2 gap-2 pt-1 text-xs tabular-nums">
                          <div className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E5E2] flex items-center justify-between">
                            <span className="text-[#4E5651]">Putra</span>
                            <strong className="font-mono text-[#111815]">
                              {recap.maleCount}/{recap.quotaPutra}
                            </strong>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E5E2] flex items-center justify-between">
                            <span className="text-[#4E5651]">Putri</span>
                            <strong className="font-mono text-[#111815]">
                              {recap.femaleCount}/{recap.quotaPutri}
                            </strong>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Per-Unit Metrics Breakdown */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E2E5E2] text-xs">
                    <div>
                      <p className="text-[11px] text-[#4E5651]">Pengajian</p>
                      <p className="font-mono font-semibold text-[#111815] tabular-nums mt-0.5">
                        Kota {recap.pengajian.kotaMadiun} · Kab {recap.pengajian.kabMadiun}
                      </p>
                      <p className="font-mono text-[11px] text-[#4E5651] tabular-nums">
                        Luar: {recap.pengajian.luarMadiun}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-[#4E5651]">Alumni</p>
                      <p className="font-mono font-semibold text-[#14532D] tabular-nums mt-0.5">
                        {recap.alumni.totalAlumni} Alumni
                      </p>
                      <p className="font-mono text-[11px] text-[#4E5651] tabular-nums">
                        Umum: {recap.alumni.nonAlumni}
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] text-[#4E5651]">Verif &amp; Lulus</p>
                      <p className="font-mono font-semibold text-[#111815] tabular-nums mt-0.5">
                        Verif: {recap.verifiedCount}
                      </p>
                      <p className="font-mono text-[11px] text-[#4E5651] tabular-nums">
                        Lulus: {recap.selectionStats.lulus}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* SINGLE-UNIT MODE: Strictly scoped 4 KPI cards for TK, SD, SMP, or SMA */
          activeUnitRecap && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-[#14532D] text-white flex flex-col justify-between">
                <p className="text-xs text-white/80">
                  Pendaftar {activeUnitRecap.shortName}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">
                    {activeUnitRecap.totalCount}
                  </span>
                  <span className="text-xs font-mono text-white/80 tabular-nums">
                    / {activeUnitRecap.quota} kuota (Sisa {activeUnitRecap.remaining})
                  </span>
                </div>
                {isGenderSplitQuotaUnit(activeUnitRecap.unit) &&
                activeUnitRecap.quotaPutra !== undefined &&
                activeUnitRecap.quotaPutri !== undefined ? (
                  <p className="mt-2 pt-2 border-t border-white/15 text-xs text-white/90 tabular-nums">
                    Putra: {activeUnitRecap.maleCount}/{activeUnitRecap.quotaPutra} · Putri:{' '}
                    {activeUnitRecap.femaleCount}/{activeUnitRecap.quotaPutri}
                  </p>
                ) : (
                  <p className="mt-2 pt-2 border-t border-white/15 text-xs text-white/85 tabular-nums">
                    Laki-laki: {activeUnitRecap.maleCount} · Perempuan:{' '}
                    {activeUnitRecap.femaleCount}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] flex flex-col justify-between">
                <p className="text-xs text-[#4E5651]">
                  Pengajian Madiun ({activeUnitRecap.shortName})
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-[#14532D] tabular-nums">
                    {activeUnitRecap.pengajian.madiunCombined}
                  </span>
                  <span className="text-xs font-mono text-[#4E5651] tabular-nums">
                    ({scopedMadiunPct}%)
                  </span>
                </div>
                <p className="mt-2 pt-2 border-t border-[#E2E5E2] text-xs text-[#4E5651] tabular-nums">
                  Kota: {activeUnitRecap.pengajian.kotaMadiun} · Kab:{' '}
                  {activeUnitRecap.pengajian.kabMadiun} · Luar:{' '}
                  {activeUnitRecap.pengajian.luarMadiun}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] flex flex-col justify-between">
                <p className="text-xs text-[#4E5651]">
                  Alumni Muttaqin ({activeUnitRecap.shortName})
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-[#14532D] tabular-nums">
                    {activeUnitRecap.alumni.totalAlumni}
                  </span>
                  <span className="text-xs font-mono text-[#4E5651] tabular-nums">
                    ({scopedAlumniPct}%)
                  </span>
                </div>
                <p className="mt-2 pt-2 border-t border-[#E2E5E2] text-xs text-[#4E5651] tabular-nums">
                  Umum / Non-Alumni: {activeUnitRecap.alumni.nonAlumni}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] flex flex-col justify-between">
                <p className="text-xs text-[#4E5651]">
                  Verifikasi &amp; Seleksi ({activeUnitRecap.shortName})
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5 font-mono text-lg sm:text-xl font-bold text-[#111815] tabular-nums whitespace-nowrap">
                  <span className="text-[#14532D]">{activeUnitRecap.verifiedCount} Verif</span>
                  <span className="text-[#4E5651] text-sm font-normal">·</span>
                  <span className="text-[#926C15]">
                    {activeUnitRecap.selectionStats.lulus} Lulus
                  </span>
                </div>
                <p className="mt-2 pt-2 border-t border-[#E2E5E2] text-xs text-[#4E5651] tabular-nums">
                  Proses: {activeUnitRecap.selectionStats.proses} · Cadangan:{' '}
                  {activeUnitRecap.selectionStats.cadangan}
                </p>
              </div>
            </div>
          )
        )}
      </section>

      {/* ================================================================== */}
      {/* SECTION 1: PERBANDINGAN LAKI-LAKI DAN PEREMPUAN                    */}
      {/* ================================================================== */}
      <section
        aria-labelledby="heading-gender-per-unit"
        className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-[#E2E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F2F4F2] text-[#14532D] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <h3
              id="heading-gender-per-unit"
              className="font-display text-base sm:text-lg font-bold text-[#111815]"
            >
              {unitFilter === 'ALL'
                ? 'Perbandingan Laki-laki dan Perempuan Tiap Jenjang'
                : `Perbandingan Laki-laki dan Perempuan · ${UNIT_CONFIGS[unitFilter].shortName}`}
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#4E5651] shrink-0">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#14532D] inline-block" />
              <span>Laki-laki (L)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C89B3C] inline-block" />
              <span>Perempuan (P)</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F7F6] border-b border-[#E2E5E2] text-xs font-semibold text-[#4E5651]">
                <th className="py-3 px-4 sm:px-5 whitespace-nowrap">Jenjang / Lembaga</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Laki-laki</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Perempuan</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Total</th>
                <th className="py-3 px-4 sm:px-5 whitespace-nowrap min-w-[210px]">
                  Proporsi Gender (L / P)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E2] text-sm">
              {(unitFilter === 'ALL'
                ? fullAnalytics.genderByUnit
                : fullAnalytics.genderByUnit.filter((row) => row.unit === unitFilter)
              ).map((row) => {
                const unitRecap = perUnitRecaps[row.unit];
                const hasSplitQuota =
                  isGenderSplitQuotaUnit(row.unit) &&
                  unitRecap.quotaPutra !== undefined &&
                  unitRecap.quotaPutri !== undefined;

                return (
                  <tr key={row.unit} className="hover:bg-[#F9FAF9]">
                    <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                      {unitFilter === 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => setUnitFilter(row.unit)}
                          className="inline-flex items-center gap-2 font-semibold text-[#111815] hover:text-[#14532D] hover:underline"
                        >
                          <img
                            src={getUnitLogoPath(row.unit)}
                            alt=""
                            className="w-5 h-5 rounded-sm object-contain bg-white border border-[#E2E5E2]"
                          />
                          <span>{row.fullName}</span>
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2 font-semibold text-[#111815]">
                          <img
                            src={getUnitLogoPath(row.unit)}
                            alt=""
                            className="w-5 h-5 rounded-sm object-contain bg-white border border-[#E2E5E2]"
                          />
                          <span>{row.fullName}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#14532D] tabular-nums whitespace-nowrap">
                      {row.maleCount}
                      {unitFilter !== 'ALL' && hasSplitQuota && (
                        <span className="text-xs font-normal text-[#4E5651]">
                          {' '}
                          / {unitRecap.quotaPutra}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#926C15] tabular-nums whitespace-nowrap">
                      {row.femaleCount}
                      {unitFilter !== 'ALL' && hasSplitQuota && (
                        <span className="text-xs font-normal text-[#4E5651]">
                          {' '}
                          / {unitRecap.quotaPutri}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#111815] tabular-nums whitespace-nowrap">
                      {row.totalCount}
                    </td>
                    <td className="py-3 px-4 sm:px-5">
                      {row.totalCount === 0 ? (
                        <span className="text-xs text-[#4E5651]">-</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="h-2.5 w-full rounded-sm bg-[#EFF1EF] overflow-hidden flex">
                            <div
                              className="h-full bg-[#14532D]"
                              style={{ width: `${row.malePct}%` }}
                              title={`Laki-laki: ${row.maleCount} (${row.malePct}%)`}
                            />
                            <div
                              className="h-full bg-[#C89B3C]"
                              style={{ width: `${row.femalePct}%` }}
                              title={`Perempuan: ${row.femaleCount} (${row.femalePct}%)`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-[#4E5651] tabular-nums">
                            <span>{row.malePct}% L</span>
                            <span>{row.femalePct}% P</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {unitFilter === 'ALL' && (
              <tfoot>
                <tr className="bg-[#F6F7F6] border-t border-[#D4D9D4] text-sm font-bold text-[#111815]">
                  <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                    Total Keseluruhan (Semua Jenjang)
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#14532D] tabular-nums">
                    {fullAnalytics.totalMale}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[#926C15] tabular-nums">
                    {fullAnalytics.totalFemale}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {fullAnalytics.totalCount}
                  </td>
                  <td className="py-3 px-4 sm:px-5 text-xs font-mono font-medium text-[#4E5651] tabular-nums">
                    {fullMalePct}% L · {fullFemalePct}% P
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2: SEBARAN KHUSUS DAERAH PENGAJIAN MADIUN / KOTA MADIUN    */}
      {/* ================================================================== */}
      <section
        aria-labelledby="heading-pengajian-madiun"
        className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-[#E2E5E2] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F2F4F2] text-[#14532D] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <h3
                id="heading-pengajian-madiun"
                className="font-display text-base sm:text-lg font-bold text-[#111815]"
              >
                Sebaran Daerah Pengajian
                {unitFilter !== 'ALL' ? ` · ${UNIT_CONFIGS[unitFilter].shortName}` : ''}
              </h3>
            </div>

            <div
              role="group"
              aria-label="Filter wilayah daerah pengajian"
              className="flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-[#F2F4F2] rounded-lg shrink-0"
            >
              <button
                type="button"
                onClick={() => setRegionFilter('MADIUN_ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  regionFilter === 'MADIUN_ALL'
                    ? 'bg-white text-[#14532D] shadow-xs'
                    : 'text-[#4E5651] hover:text-[#111815]'
                }`}
              >
                Madiun &amp; Kota
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('KOTA_MADIUN')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  regionFilter === 'KOTA_MADIUN'
                    ? 'bg-white text-[#14532D] shadow-xs'
                    : 'text-[#4E5651] hover:text-[#111815]'
                }`}
              >
                Kota Madiun ({scopedAnalytics.pengajianSummary.kotaMadiun})
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('KAB_MADIUN')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  regionFilter === 'KAB_MADIUN'
                    ? 'bg-white text-[#14532D] shadow-xs'
                    : 'text-[#4E5651] hover:text-[#111815]'
                }`}
              >
                Kab. Madiun ({scopedAnalytics.pengajianSummary.kabMadiun})
              </button>
              <button
                type="button"
                onClick={() => setRegionFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  regionFilter === 'ALL'
                    ? 'bg-white text-[#14532D] shadow-xs'
                    : 'text-[#4E5651] hover:text-[#111815]'
                }`}
              >
                Semua ({scopedAnalytics.totalCount})
              </button>
            </div>
          </div>

          {/* Summary Strip per Wilayah */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#4E5651]">Daerah Kota Madiun</p>
                {unitFilter === 'ALL' && (
                  <p className="text-[11px] text-[#4E5651] mt-0.5 tabular-nums">
                    RA {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.RA_TK} · SDIT{' '}
                    {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.SDIT} · SMP{' '}
                    {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.SMP} · SMA{' '}
                    {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.SMA}
                  </p>
                )}
              </div>
              <span className="font-mono text-2xl font-bold text-[#14532D] tabular-nums">
                {scopedAnalytics.pengajianSummary.kotaMadiun}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#4E5651]">Daerah Kab. Madiun</p>
                {unitFilter === 'ALL' && (
                  <p className="text-[11px] text-[#4E5651] mt-0.5 tabular-nums">
                    RA {scopedAnalytics.pengajianSummary.kabMadiunByUnit.RA_TK} · SDIT{' '}
                    {scopedAnalytics.pengajianSummary.kabMadiunByUnit.SDIT} · SMP{' '}
                    {scopedAnalytics.pengajianSummary.kabMadiunByUnit.SMP} · SMA{' '}
                    {scopedAnalytics.pengajianSummary.kabMadiunByUnit.SMA}
                  </p>
                )}
              </div>
              <span className="font-mono text-2xl font-bold text-[#111815] tabular-nums">
                {scopedAnalytics.pengajianSummary.kabMadiun}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#4E5651]">Luar Wilayah Madiun</p>
              </div>
              <span className="font-mono text-2xl font-bold text-[#4E5651] tabular-nums">
                {scopedAnalytics.pengajianSummary.luarMadiun}
              </span>
            </div>
          </div>

          {/* Desa Bar Overview (when viewing Madiun regions) */}
          {regionFilter !== 'ALL' && visibleDesaSummary.length > 0 && (
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#111815]">
                  Konsentrasi per Desa Pengajian
                </span>
                <span className="text-[#4E5651] font-mono tabular-nums">
                  Total: {madiunTotalForCurrentFilter} pendaftar
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {visibleDesaSummary.map((d) => {
                  const pct = Math.round((d.totalCount / maxDesaCount) * 100);
                  return (
                    <div
                      key={d.key}
                      className="p-3 rounded-lg bg-[#F9FAF9] border border-[#E2E5E2] space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#111815] truncate">
                          {d.desa} <span className="font-normal text-[#4E5651]">· {d.daerah}</span>
                        </span>
                        <span className="font-mono font-bold text-[#14532D] shrink-0 tabular-nums">
                          {d.totalCount} santri ({d.kelompokCount} klp)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-[#E7EAE7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#14532D]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Pengajian Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F7F6] border-b border-[#E2E5E2] text-xs font-semibold text-[#4E5651]">
                <th className="py-3 px-4 sm:px-5 whitespace-nowrap">Daerah Pengajian</th>
                <th className="py-3 px-4 whitespace-nowrap">Desa Pengajian</th>
                <th className="py-3 px-4 whitespace-nowrap">Kelompok</th>
                {unitFilter === 'ALL' && (
                  <>
                    <th className="py-3 px-3 text-right whitespace-nowrap">RA / TK</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">SDIT</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">SMP</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">SMA</th>
                  </>
                )}
                <th className="py-3 px-4 sm:px-5 text-right whitespace-nowrap">
                  {unitFilter === 'ALL' ? 'Total' : `Jumlah (${UNIT_CONFIGS[unitFilter].shortName})`}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E2] text-sm">
              {visiblePengajianGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={unitFilter === 'ALL' ? 8 : 4}
                    className="py-8 px-4 text-center text-sm text-[#4E5651]"
                  >
                    Belum ada data pendaftar pada filter daerah pengajian dan jenjang ini.
                  </td>
                </tr>
              ) : (
                visiblePengajianGroups.map((group) => (
                  <tr key={group.key} className="hover:bg-[#F9FAF9]">
                    <td className="py-3 px-4 sm:px-5 font-semibold text-[#111815] whitespace-nowrap">
                      {group.daerah}
                    </td>
                    <td className="py-3 px-4 text-[#111815] whitespace-nowrap">
                      {group.desa}
                    </td>
                    <td className="py-3 px-4 text-xs text-[#4E5651] whitespace-nowrap">
                      {group.kelompok}
                    </td>
                    {unitFilter === 'ALL' && (
                      <>
                        <td className="py-3 px-3 text-right font-mono text-xs text-[#4E5651] tabular-nums">
                          {group.byUnit.RA_TK}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-[#4E5651] tabular-nums">
                          {group.byUnit.SDIT}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-[#4E5651] tabular-nums">
                          {group.byUnit.SMP}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-[#4E5651] tabular-nums">
                          {group.byUnit.SMA}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4 sm:px-5 text-right font-mono font-bold text-[#14532D] tabular-nums">
                      {group.totalCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3: PENDAFTAR ALUMNI LULUSAN LEMBAGA AL MUTTAQIN           */}
      {/* ================================================================== */}
      <section
        aria-labelledby="heading-alumni-muttaqin"
        className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-[#E2E5E2] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F2F4F2] text-[#14532D] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3
                id="heading-alumni-muttaqin"
                className="font-display text-base sm:text-lg font-bold text-[#111815]"
              >
                Alumni Lembaga Al Muttaqin
                {unitFilter !== 'ALL' ? ` · ${UNIT_CONFIGS[unitFilter].shortName}` : ''}
              </h3>
            </div>

            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-[#4E5651] absolute left-3 top-1/2 -translate-y-1/2" />
              <label htmlFor="analytics-alumni-search" className="sr-only">
                Cari alumni pendaftar
              </label>
              <input
                id="analytics-alumni-search"
                type="text"
                value={alumniSearch}
                onChange={(e) => setAlumniSearch(e.target.value)}
                placeholder="Cari nama atau asal sekolah..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
              />
            </div>
          </div>

          {/* Alumni Breakdown Interactive Filter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setAlumniFilter('ALL_ALUMNI')}
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                alumniFilter === 'ALL_ALUMNI'
                  ? 'bg-[#14532D]/5 border-[#14532D]'
                  : 'bg-[#F9FAF9] border-[#E2E5E2] hover:border-[#D4D9D4]'
              }`}
            >
              <p className="text-xs font-medium text-[#4E5651]">Total Alumni Al Muttaqin</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#14532D] tabular-nums">
                {scopedAnalytics.alumniSummary.totalAlumni}
              </p>
              <p className="mt-1 text-[11px] text-[#4E5651] tabular-nums">
                Umum: {scopedAnalytics.alumniSummary.nonAlumni} pendaftar
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setAlumniFilter(
                  alumniFilter === 'RA_AL_MUTTAQIN' ? 'ALL_ALUMNI' : 'RA_AL_MUTTAQIN'
                )
              }
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                alumniFilter === 'RA_AL_MUTTAQIN'
                  ? 'bg-[#14532D]/5 border-[#14532D]'
                  : 'bg-[#F9FAF9] border-[#E2E5E2] hover:border-[#D4D9D4]'
              }`}
            >
              <p className="text-xs font-medium text-[#4E5651]">Lulusan RA / TK Al Muttaqin</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#111815] tabular-nums">
                {scopedAnalytics.alumniSummary.raAlMuttaqin}
              </p>
              <p className="mt-1 text-[11px] text-[#4E5651] tabular-nums">
                Masuk SDIT:{' '}
                {scopedAnalytics.alumniSummary.byCategoryAndTargetUnit.RA_AL_MUTTAQIN.SDIT}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setAlumniFilter(
                  alumniFilter === 'SDIT_AL_MUTTAQIN' ? 'ALL_ALUMNI' : 'SDIT_AL_MUTTAQIN'
                )
              }
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                alumniFilter === 'SDIT_AL_MUTTAQIN'
                  ? 'bg-[#14532D]/5 border-[#14532D]'
                  : 'bg-[#F9FAF9] border-[#E2E5E2] hover:border-[#D4D9D4]'
              }`}
            >
              <p className="text-xs font-medium text-[#4E5651]">Lulusan SDIT Al Muttaqin</p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#111815] tabular-nums">
                {scopedAnalytics.alumniSummary.sditAlMuttaqin}
              </p>
              <p className="mt-1 text-[11px] text-[#4E5651] tabular-nums">
                Masuk SMP:{' '}
                {scopedAnalytics.alumniSummary.byCategoryAndTargetUnit.SDIT_AL_MUTTAQIN.SMP}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setAlumniFilter(
                  alumniFilter === 'SMP_WUSTHA_AL_MUTTAQIN'
                    ? 'ALL_ALUMNI'
                    : 'SMP_WUSTHA_AL_MUTTAQIN'
                )
              }
              className={`text-left p-3.5 rounded-xl border transition-colors ${
                alumniFilter === 'SMP_WUSTHA_AL_MUTTAQIN'
                  ? 'bg-[#14532D]/5 border-[#14532D]'
                  : 'bg-[#F9FAF9] border-[#E2E5E2] hover:border-[#D4D9D4]'
              }`}
            >
              <p className="text-xs font-medium text-[#4E5651]">
                Lulusan SMP / Wustha Al Muttaqin
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-[#111815] tabular-nums">
                {scopedAnalytics.alumniSummary.smpWusthaAlMuttaqin}
              </p>
              <p className="mt-1 text-[11px] text-[#4E5651] tabular-nums">
                Masuk SMA:{' '}
                {
                  scopedAnalytics.alumniSummary.byCategoryAndTargetUnit
                    .SMP_WUSTHA_AL_MUTTAQIN.SMA
                }
              </p>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F7F6] border-b border-[#E2E5E2] text-xs font-semibold text-[#4E5651]">
                <th className="py-3 px-4 sm:px-5 whitespace-nowrap">No. Pendaftaran</th>
                <th className="py-3 px-4 whitespace-nowrap">Nama Calon Murid</th>
                <th className="py-3 px-4 whitespace-nowrap">Asal Sekolah</th>
                <th className="py-3 px-4 whitespace-nowrap">Kategori Alumni</th>
                {unitFilter === 'ALL' && (
                  <th className="py-3 px-4 whitespace-nowrap">Mendaftar ke</th>
                )}
                <th className="py-3 px-4 sm:px-5 whitespace-nowrap">Daerah Pengajian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E2] text-sm">
              {visibleAlumniRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={unitFilter === 'ALL' ? 6 : 5}
                    className="py-8 px-4 text-center text-sm text-[#4E5651]"
                  >
                    Tidak ada pendaftar alumni Al Muttaqin pada filter ini.
                  </td>
                </tr>
              ) : (
                visibleAlumniRecords.map(({ record, category }) => (
                  <tr key={record.id} className="hover:bg-[#F9FAF9]">
                    <td className="py-3 px-4 sm:px-5 font-mono text-xs font-semibold text-[#14532D] whitespace-nowrap tabular-nums">
                      {record.noPendaftaran}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#111815]">{record.namaLengkap}</p>
                      <p className="text-xs text-[#4E5651]">
                        {record.jenisKelamin} · {record.jalurPendaftaran}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#111815] whitespace-nowrap">
                      {record.asalSekolah}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-[#14532D] whitespace-nowrap">
                      {formatAlumniCategoryLabel(
                        category ||
                          (classifyAlumniOrigin(record.asalSekolah) as Exclude<
                            AlumniCategory,
                            'NON_ALUMNI'
                          >)
                      )}
                    </td>
                    {unitFilter === 'ALL' && (
                      <td className="py-3 px-4 font-semibold text-xs text-[#111815] whitespace-nowrap">
                        {UNIT_CONFIGS[record.unit].shortName}
                      </td>
                    )}
                    <td className="py-3 px-4 sm:px-5 text-xs text-[#4E5651] whitespace-nowrap">
                      {record.pengajianDaerah || '-'} / {record.pengajianDesa || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
