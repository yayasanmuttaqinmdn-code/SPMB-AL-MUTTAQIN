import React, { useMemo, useState } from 'react';
import { GraduationCap, MapPin, Search, Users } from 'lucide-react';
import type { RegistrationRecord, UnitId } from '../types/spmb.ts';
import {
  classifyAlumniOrigin,
  computeAdminAnalytics,
  FOUNDATION_LOGO_PATH,
  UNIT_CONFIGS,
  UNIT_ORDER,
  type AlumniCategory,
} from '../utils/spmbLogic.ts';

interface AdminAnalyticsViewProps {
  registrations: RegistrationRecord[];
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
}) => {
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitId>('ALL');
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('MADIUN_ALL');
  const [alumniFilter, setAlumniFilter] = useState<AlumniFilter>('ALL_ALUMNI');
  const [alumniSearch, setAlumniSearch] = useState('');

  // Full dataset analytics (for gender matrix across all 4 jenjang & overall KPIs)
  const fullAnalytics = useMemo(
    () => computeAdminAnalytics(registrations),
    [registrations]
  );

  // Unit-scoped dataset for Pengajian & Alumni drill-down
  const scopedRecords = useMemo(() => {
    if (unitFilter === 'ALL') return registrations;
    return registrations.filter((r) => r.unit === unitFilter);
  }, [registrations, unitFilter]);

  const scopedAnalytics = useMemo(
    () => computeAdminAnalytics(scopedRecords),
    [scopedRecords]
  );

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

  const alumniPctOfTotal =
    fullAnalytics.totalCount > 0
      ? Math.round((fullAnalytics.alumniSummary.totalAlumni / fullAnalytics.totalCount) * 100)
      : 0;

  const madiunPctOfTotal =
    fullAnalytics.totalCount > 0
      ? Math.round(
          (fullAnalytics.pengajianSummary.madiunCombined / fullAnalytics.totalCount) * 100
        )
      : 0;

  const malePctTotal =
    fullAnalytics.totalCount > 0
      ? Math.round((fullAnalytics.totalMale / fullAnalytics.totalCount) * 100)
      : 0;

  const femalePctTotal =
    fullAnalytics.totalCount > 0 ? 100 - malePctTotal : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header + Global Unit Scope Filter */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E2E5E2]">
          <div className="flex items-start gap-3">
            <img
              src={FOUNDATION_LOGO_PATH}
              alt="Logo Yayasan PP Muttaqin"
              className="w-11 h-11 rounded-xl object-contain bg-white p-0.5 border border-[#E2E5E2] shrink-0"
            />
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#111815]">
                Dashboard Khusus Admin — Sebaran Pengajian, Alumni &amp; Gender
              </h2>
              <p className="text-xs text-[#4E5651] mt-0.5">
                Rekap analitik khusus Panitia Admin untuk memantau asal daerah pengajian Madiun /
                Kota Madiun, pendaftar alumni Al Muttaqin, dan komposisi Laki-laki / Perempuan tiap
                jenjang.
              </p>
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter jenjang analitik"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-[#F2F4F2] rounded-lg shrink-0"
          >
            <button
              type="button"
              onClick={() => setUnitFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                unitFilter === 'ALL'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Semua Jenjang
            </button>
            {UNIT_ORDER.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitFilter(u)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  unitFilter === u
                    ? 'bg-white text-[#14532D] shadow-xs'
                    : 'text-[#4E5651] hover:text-[#111815]'
                }`}
              >
                {UNIT_CONFIGS[u].shortName}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-xl bg-[#14532D] text-white flex flex-col justify-between">
            <p className="text-xs text-white/80">Total Pendaftar Yayasan</p>
            <p className="mt-1.5 font-mono text-2xl sm:text-3xl font-bold tabular-nums">
              {fullAnalytics.totalCount}
            </p>
            <p className="mt-2 pt-2 border-t border-white/15 text-xs text-white/85 tabular-nums">
              Laki-laki: {fullAnalytics.totalMale} · Perempuan: {fullAnalytics.totalFemale}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] flex flex-col justify-between">
            <p className="text-xs text-[#4E5651]">Pengajian Madiun / Kota Madiun</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#14532D] tabular-nums">
                {fullAnalytics.pengajianSummary.madiunCombined}
              </span>
              <span className="text-xs font-mono text-[#4E5651] tabular-nums">
                ({madiunPctOfTotal}%)
              </span>
            </div>
            <p className="mt-2 pt-2 border-t border-[#E2E5E2] text-xs text-[#4E5651] tabular-nums">
              Kota Madiun: {fullAnalytics.pengajianSummary.kotaMadiun} · Kab. Madiun:{' '}
              {fullAnalytics.pengajianSummary.kabMadiun}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] flex flex-col justify-between">
            <p className="text-xs text-[#4E5651]">Alumni Lembaga Al Muttaqin</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#14532D] tabular-nums">
                {fullAnalytics.alumniSummary.totalAlumni}
              </span>
              <span className="text-xs font-mono text-[#4E5651] tabular-nums">
                ({alumniPctOfTotal}%)
              </span>
            </div>
            <p className="mt-2 pt-2 border-t border-[#E2E5E2] text-xs text-[#4E5651] tabular-nums">
              RA: {fullAnalytics.alumniSummary.raAlMuttaqin} · SDIT:{' '}
              {fullAnalytics.alumniSummary.sditAlMuttaqin} · SMP/Wustha:{' '}
              {fullAnalytics.alumniSummary.smpWusthaAlMuttaqin}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] flex flex-col justify-between">
            <p className="text-xs text-[#4E5651]">Komposisi Laki-laki &amp; Perempuan</p>
            <div className="mt-1.5 flex items-baseline gap-2 font-mono text-xl sm:text-2xl font-bold text-[#111815] tabular-nums">
              <span className="text-[#14532D]">{fullAnalytics.totalMale} L</span>
              <span className="text-[#4E5651] text-base font-normal">/</span>
              <span className="text-[#926C15]">{fullAnalytics.totalFemale} P</span>
            </div>
            <p className="mt-2 pt-2 border-t border-[#E2E5E2] text-xs text-[#4E5651] tabular-nums">
              Rasio: {malePctTotal}% Laki-laki · {femalePctTotal}% Perempuan
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 1: JUMLAH LAKI-LAKI DAN PEREMPUAN TIAP JENJANG             */}
      {/* ================================================================== */}
      <section
        aria-labelledby="heading-gender-per-unit"
        className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-[#E2E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#F2F4F2] text-[#14532D] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="heading-gender-per-unit"
                className="font-display text-base sm:text-lg font-bold text-[#111815]"
              >
                Jumlah Laki-laki dan Perempuan Tiap Jenjang
              </h3>
              <p className="text-xs text-[#4E5651]">
                Perbandingan calon murid putra (Laki-laki) dan putri (Perempuan) per lembaga
                pendidikan.
              </p>
            </div>
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
                <th className="py-3 px-4 text-right whitespace-nowrap">Total Pendaftar</th>
                <th className="py-3 px-4 sm:px-5 whitespace-nowrap min-w-[210px]">
                  Proporsi Gender (L / P)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E2] text-sm">
              {fullAnalytics.genderByUnit.map((row) => {
                const isSelected = unitFilter === row.unit;
                return (
                  <tr
                    key={row.unit}
                    className={
                      isSelected ? 'bg-[#14532D]/5' : 'hover:bg-[#F9FAF9]'
                    }
                  >
                    <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                      <span className="font-semibold text-[#111815]">{row.fullName}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#14532D] tabular-nums">
                      {row.maleCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#926C15] tabular-nums">
                      {row.femaleCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#111815] tabular-nums">
                      {row.totalCount}
                    </td>
                    <td className="py-3 px-4 sm:px-5">
                      {row.totalCount === 0 ? (
                        <span className="text-xs text-[#4E5651]">Belum ada pendaftar</span>
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
            <tfoot>
              <tr className="bg-[#F6F7F6] border-t border-[#D4D9D4] text-sm font-bold text-[#111815]">
                <td className="py-3 px-4 sm:px-5 whitespace-nowrap">
                  Total Keseluruhan Yayasan
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
                  {malePctTotal}% Laki-laki · {femalePctTotal}% Perempuan
                </td>
              </tr>
            </tfoot>
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
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F2F4F2] text-[#14532D] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3
                  id="heading-pengajian-madiun"
                  className="font-display text-base sm:text-lg font-bold text-[#111815]"
                >
                  Sebaran Pendaftaran Daerah Pengajian Madiun &amp; Kota Madiun
                  {unitFilter !== 'ALL' ? ` (${UNIT_CONFIGS[unitFilter].shortName})` : ''}
                </h3>
                <p className="text-xs text-[#4E5651]">
                  Pemetaan pendaftar berdasarkan isian Info Pengajian (Daerah, Desa, dan Kelompok)
                  khusus wilayah Kota Madiun &amp; Kabupaten Madiun.
                </p>
              </div>
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
                Madiun &amp; Kota Madiun
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
                Semua Daerah ({scopedAnalytics.totalCount})
              </button>
            </div>
          </div>

          {/* Summary Strip per Wilayah */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#4E5651]">Daerah Kota Madiun</p>
                <p className="text-[11px] text-[#4E5651] mt-0.5 tabular-nums">
                  RA {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.RA_TK} · SDIT{' '}
                  {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.SDIT} · SMP{' '}
                  {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.SMP} · SMA{' '}
                  {scopedAnalytics.pengajianSummary.kotaMadiunByUnit.SMA}
                </p>
              </div>
              <span className="font-mono text-2xl font-bold text-[#14532D] tabular-nums">
                {scopedAnalytics.pengajianSummary.kotaMadiun}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#4E5651]">Daerah Kab. Madiun / Madiun</p>
                <p className="text-[11px] text-[#4E5651] mt-0.5 tabular-nums">
                  RA {scopedAnalytics.pengajianSummary.kabMadiunByUnit.RA_TK} · SDIT{' '}
                  {scopedAnalytics.pengajianSummary.kabMadiunByUnit.SDIT} · SMP{' '}
                  {scopedAnalytics.pengajianSummary.kabMadiunByUnit.SMP} · SMA{' '}
                  {scopedAnalytics.pengajianSummary.kabMadiunByUnit.SMA}
                </p>
              </div>
              <span className="font-mono text-2xl font-bold text-[#111815] tabular-nums">
                {scopedAnalytics.pengajianSummary.kabMadiun}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#4E5651]">Luar Wilayah Madiun</p>
                <p className="text-[11px] text-[#4E5651] mt-0.5">
                  Pendaftar dari luar daerah pengajian Madiun
                </p>
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
                  Konsentrasi per Desa Pengajian (Wilayah Terpilih)
                </span>
                <span className="text-[#4E5651] font-mono tabular-nums">
                  Total wilayah terpilih: {madiunTotalForCurrentFilter} pendaftar
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
                <th className="py-3 px-3 text-right whitespace-nowrap">RA / TK</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">SDIT</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">SMP</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">SMA</th>
                <th className="py-3 px-4 sm:px-5 text-right whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E2] text-sm">
              {visiblePengajianGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
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
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F2F4F2] text-[#14532D] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3
                  id="heading-alumni-muttaqin"
                  className="font-display text-base sm:text-lg font-bold text-[#111815]"
                >
                  Pendaftar Alumni Lulusan Lembaga Al Muttaqin
                  {unitFilter !== 'ALL' ? ` (${UNIT_CONFIGS[unitFilter].shortName})` : ''}
                </h3>
                <p className="text-xs text-[#4E5651]">
                  Rekap calon murid baru yang berasal dari lulusan RA Al Muttaqin, SDIT Al
                  Muttaqin, serta SMP / Wustha Al Muttaqin berdasarkan data Asal Sekolah.
                </p>
              </div>
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
                Non-Alumni / Umum: {scopedAnalytics.alumniSummary.nonAlumni} pendaftar
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
                <th className="py-3 px-4 whitespace-nowrap">Mendaftar ke</th>
                <th className="py-3 px-4 sm:px-5 whitespace-nowrap">Daerah Pengajian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E2] text-sm">
              {visibleAlumniRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 px-4 text-center text-sm text-[#4E5651]"
                  >
                    Tidak ada pendaftar alumni Al Muttaqin yang sesuai dengan filter saat ini.
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
                    <td className="py-3 px-4 font-semibold text-xs text-[#111815] whitespace-nowrap">
                      {UNIT_CONFIGS[record.unit].shortName}
                    </td>
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
