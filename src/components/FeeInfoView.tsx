import React, { useMemo, useState } from 'react';
import { ArrowRight, Download, Search, Wallet } from 'lucide-react';
import type { FeeCategoryId, UnitId } from '../types/spmb.ts';
import {
  FEE_ACADEMIC_YEAR,
  FEE_CATEGORY_ORDER,
  FEE_SCHEDULES,
  formatRupiah,
  FOUNDATION_LOGO_PATH,
  getUnitLogoPath,
  INSTITUTION_LOCATION,
  INSTITUTION_NAME,
  OFFICIAL_FEE_PDF_PATH,
} from '../utils/spmbLogic.ts';

interface FeeInfoViewProps {
  onRegisterForUnit: (unit: UnitId) => void;
}

type GenderColumnFilter = 'all' | 'putra' | 'putri';
type CategoryFilter = 'ALL' | FeeCategoryId;

function getCategoryLogoPath(category: FeeCategoryId): string {
  if (category === 'SMA') return getUnitLogoPath('SMA');
  if (category === 'SMP') return getUnitLogoPath('SMP');
  if (category === 'SDIT') return getUnitLogoPath('SDIT');
  if (category === 'RA' || category === 'KB') return getUnitLogoPath('RA_TK');
  return FOUNDATION_LOGO_PATH;
}

export const FeeInfoView: React.FC<FeeInfoViewProps> = ({ onRegisterForUnit }) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [genderFilter, setGenderFilter] = useState<GenderColumnFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const visibleSchedules = useMemo(() => {
    const baseList =
      selectedCategory === 'ALL'
        ? FEE_CATEGORY_ORDER.map((id) => FEE_SCHEDULES[id])
        : [FEE_SCHEDULES[selectedCategory]];

    const cleanSearch = searchTerm.trim().toLowerCase();
    if (!cleanSearch) return baseList;

    return baseList
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(cleanSearch) ||
            group.title.toLowerCase().includes(cleanSearch) ||
            group.shortName.toLowerCase().includes(cleanSearch)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [selectedCategory, searchTerm]);

  const showPutra = genderFilter === 'all' || genderFilter === 'putra';
  const showPutri = genderFilter === 'all' || genderFilter === 'putri';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <img
            src={FOUNDATION_LOGO_PATH}
            alt="Logo Yayasan Pondok Pesantren Muttaqin"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain bg-white border border-[#E2E5E2] p-0.5 shrink-0"
          />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#926C15]">
              {INSTITUTION_NAME} · Tahun Ajaran {FEE_ACADEMIC_YEAR}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111815]">
              Informasi Biaya Pendaftaran &amp; Pendidikan
            </h1>
            <p className="text-xs sm:text-sm text-[#4E5651] leading-relaxed max-w-2xl">
              Rincian resmi biaya masuk peserta didik baru {INSTITUTION_LOCATION} untuk jenjang{' '}
              <strong>PP</strong>, <strong>SMA</strong>, <strong>SMP</strong>,{' '}
              <strong>SDIT</strong>, <strong>RA</strong>, dan <strong>KB</strong> (Putra &amp; Putri).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href={OFFICIAL_FEE_PDF_PATH}
            download="Biaya-PPDB-2027-2028-PP-Muttaqin.pdf"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Dokumen Biaya (PDF)</span>
          </a>
        </div>
      </section>

      {/* 6-Card Summary Ringkasan Total per Jenjang */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#111815]">
            Ringkasan Total Biaya per Jenjang
          </h2>
          <span className="text-xs text-[#4E5651]">
            Klik kartu jenjang untuk menyaring rincian tabel di bawah
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FEE_CATEGORY_ORDER.map((id) => {
            const grp = FEE_SCHEDULES[id];
            const isSelected = selectedCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedCategory((prev) => (prev === id ? 'ALL' : id))}
                className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[#14532D] ${
                  isSelected
                    ? 'bg-[#F4F8F5] border-[#14532D] ring-1 ring-[#14532D]'
                    : 'bg-white border-[#E2E5E2] hover:border-[#14532D]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={getCategoryLogoPath(id)}
                      alt={`Logo ${grp.shortName}`}
                      className="w-9 h-9 rounded-lg object-contain bg-white border border-[#E2E5E2] p-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-sm sm:text-base font-bold text-[#111815] truncate">
                        {grp.title}
                      </h3>
                      <p className="text-xs text-[#4E5651]">{grp.items.length} komponen biaya</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#14532D] whitespace-nowrap shrink-0">
                    {isSelected ? 'Terpilih' : 'Detail'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-[#EFF1EF] text-xs">
                  <div>
                    <p className="text-[#4E5651]">Total Putra</p>
                    <p className="font-mono font-bold text-[#111815] tabular-nums mt-0.5">
                      {formatRupiah(grp.totalPutra)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#4E5651]">Total Putri</p>
                    <p className="font-mono font-bold text-[#14532D] tabular-nums mt-0.5">
                      {formatRupiah(grp.totalPutri)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter Bar & Search */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Pilih jenjang biaya">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-[#14532D] text-white border-[#14532D]'
                  : 'bg-white text-[#4E5651] border-[#D4D9D4] hover:border-[#14532D] hover:text-[#111815]'
              }`}
            >
              Semua Jenjang
            </button>
            {FEE_CATEGORY_ORDER.map((id) => {
              const active = selectedCategory === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedCategory(id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#14532D] text-white border-[#14532D]'
                      : 'bg-white text-[#4E5651] border-[#D4D9D4] hover:border-[#14532D] hover:text-[#111815]'
                  }`}
                >
                  {FEE_SCHEDULES[id].shortName}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="inline-flex items-center p-1 bg-[#F2F4F2] rounded-lg shrink-0">
              {(
                [
                  { id: 'all', label: 'Putra & Putri' },
                  { id: 'putra', label: 'Putra' },
                  { id: 'putri', label: 'Putri' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGenderFilter(opt.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    genderFilter === opt.id
                      ? 'bg-white text-[#14532D] font-semibold shadow-sm'
                      : 'text-[#4E5651] hover:text-[#111815]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[230px] lg:w-64">
              <Search className="w-4 h-4 text-[#8C948E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari item biaya (mis. Seragam)..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg text-[#111815] placeholder:text-[#8C948E] focus:outline-none focus:border-[#14532D] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Informative note */}
        <div className="pt-3 border-t border-[#EFF1EF] flex items-start gap-2.5 text-xs text-[#4E5651]">
          <Wallet className="w-4 h-4 text-[#926C15] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Nominal berikut mengacu pada edaran resmi{' '}
            <strong>Biaya Pendaftaran Peserta Didik Baru {FEE_ACADEMIC_YEAR}</strong> Yayasan Pondok
            Pesantren Muttaqin Josenan Madiun. Bagian bertanda <strong>-</strong> menandakan tidak
            dikenakan komponen tersebut.
          </p>
        </div>
      </section>

      {/* Detailed Fee Breakdown Tables */}
      {visibleSchedules.length === 0 ? (
        <div className="bg-white border border-[#E2E5E2] rounded-2xl p-8 text-center space-y-2">
          <p className="font-display text-base font-bold text-[#111815]">
            Komponen biaya tidak ditemukan
          </p>
          <p className="text-xs sm:text-sm text-[#4E5651]">
            Tidak ada rincian biaya yang cocok dengan kata kunci &ldquo;{searchTerm}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
            }}
            className="mt-2 inline-flex items-center px-3.5 py-2 text-xs font-semibold text-[#14532D] bg-[#F4F8F5] hover:bg-[#E7F0EA] rounded-lg transition-colors"
          >
            Tampilkan Semua Rincian
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {visibleSchedules.map((group) => (
            <section
              key={group.id}
              className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[#E2E5E2] bg-[#F7F9F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={getCategoryLogoPath(group.id)}
                    alt={`Logo ${group.shortName}`}
                    className="w-10 h-10 rounded-lg object-contain bg-white border border-[#E2E5E2] p-0.5 shrink-0"
                  />
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-[#111815]">
                      {group.title}
                    </h2>
                    <p className="text-xs text-[#4E5651]">{group.subtitle}</p>
                  </div>
                </div>

                {group.registerUnit && (
                  <button
                    type="button"
                    onClick={() => onRegisterForUnit(group.registerUnit!)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#14532D] bg-white border border-[#14532D]/40 hover:bg-[#14532D] hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Daftar {group.shortName}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E5E2] bg-white text-xs font-semibold text-[#4E5651]">
                      <th scope="col" className="py-3 pl-5 pr-3 w-12">
                        No.
                      </th>
                      <th scope="col" className="py-3 px-3">
                        Keterangan
                      </th>
                      {showPutra && (
                        <th scope="col" className="py-3 px-4 text-right whitespace-nowrap w-36 sm:w-44">
                          Putra
                        </th>
                      )}
                      {showPutri && (
                        <th scope="col" className="py-3 pl-4 pr-5 text-right whitespace-nowrap w-36 sm:w-44">
                          Putri
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFF1EF] text-xs sm:text-sm">
                    {group.items.map((item) => (
                      <tr key={item.no} className="odd:bg-white even:bg-[#FAFBF9] hover:bg-[#F4F8F5]/60">
                        <td className="py-2.5 pl-5 pr-3 font-mono text-xs text-[#4E5651] tabular-nums">
                          {item.no}
                        </td>
                        <td className="py-2.5 px-3 text-[#111815] font-medium">{item.label}</td>
                        {showPutra && (
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#111815]">
                            {item.putra !== null ? formatRupiah(item.putra) : '-'}
                          </td>
                        )}
                        {showPutri && (
                          <td className="py-2.5 pl-4 pr-5 text-right font-mono tabular-nums text-[#111815]">
                            {item.putri !== null ? formatRupiah(item.putri) : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {!searchTerm.trim() && (
                    <tfoot>
                      <tr className="border-t-2 border-[#14532D]/25 bg-[#F2F6F3] text-xs sm:text-sm font-bold text-[#14532D]">
                        <td colSpan={2} className="py-3 pl-5 pr-3">
                          {group.totalLabel}
                        </td>
                        {showPutra && (
                          <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            {formatRupiah(group.totalPutra)}
                          </td>
                        )}
                        {showPutri && (
                          <td className="py-3 pl-4 pr-5 text-right font-mono tabular-nums whitespace-nowrap">
                            {formatRupiah(group.totalPutri)}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
