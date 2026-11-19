import React, { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { FeeCategoryId, UnitId } from '../types/spmb.ts';
import {
  FEE_ACADEMIC_YEAR,
  FEE_CATEGORY_ORDER,
  FEE_SCHEDULES,
  formatRupiah,
  FOUNDATION_LOGO_PATH,
  getUnitLogoPath,
  INSTITUTION_NAME,
} from '../utils/spmbLogic.ts';

interface FeeInfoViewProps {
  onRegisterForUnit: (unit: UnitId) => void;
}

type GenderColumnFilter = 'all' | 'putra' | 'putri';

function getCategoryLogoPath(category: FeeCategoryId): string {
  if (category === 'SMA') return getUnitLogoPath('SMA');
  if (category === 'SMP') return getUnitLogoPath('SMP');
  if (category === 'SDIT') return getUnitLogoPath('SDIT');
  if (category === 'RA' || category === 'KB') return getUnitLogoPath('RA_TK');
  return FOUNDATION_LOGO_PATH;
}

export const FeeInfoView: React.FC<FeeInfoViewProps> = ({ onRegisterForUnit }) => {
  const [activeModalCategory, setActiveModalCategory] = useState<FeeCategoryId | null>(null);
  const [genderFilter, setGenderFilter] = useState<GenderColumnFilter>('all');

  useEffect(() => {
    if (!activeModalCategory) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveModalCategory(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalCategory]);

  const showPutra = genderFilter === 'all' || genderFilter === 'putra';
  const showPutri = genderFilter === 'all' || genderFilter === 'putri';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <img
            src={FOUNDATION_LOGO_PATH}
            alt="Logo Yayasan Pondok Pesantren Muttaqin"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-contain bg-white border border-[#E2E5E2] p-0.5 shrink-0"
          />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-[#926C15]">
              {INSTITUTION_NAME} · Tahun Ajaran {FEE_ACADEMIC_YEAR}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111815]">
              Informasi Biaya Pendaftaran &amp; Pendidikan
            </h1>
          </div>
        </div>
      </section>

      {/* 6-Card Summary Ringkasan Total per Jenjang */}
      <section className="space-y-3">
        <h2 className="font-display text-base sm:text-lg font-bold text-[#111815]">
          Rincian Biaya per Jenjang
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FEE_CATEGORY_ORDER.map((id) => {
            const grp = FEE_SCHEDULES[id];
            const isSelected = activeModalCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveModalCategory(id)}
                className={`group text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[#14532D] ${
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
                      <h3 className="font-display text-sm sm:text-base font-bold text-[#111815] group-hover:text-[#14532D] transition-colors truncate">
                        {grp.title}
                      </h3>
                      <p className="text-xs text-[#4E5651]">{grp.items.length} item</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[#14532D] whitespace-nowrap shrink-0">
                    Lihat Rincian
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-[#EFF1EF] text-xs">
                  <div>
                    <p className="text-[#4E5651]">Putra</p>
                    <p className="font-mono font-bold text-[#111815] tabular-nums mt-0.5">
                      {formatRupiah(grp.totalPutra)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#4E5651]">Putri</p>
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

      {/* Instant Breakdown Modal when clicking any cost box */}
      {activeModalCategory && (() => {
        const modalGroup = FEE_SCHEDULES[activeModalCategory];
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-detail-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setActiveModalCategory(null)}
          >
            <div
              className="w-full max-w-3xl max-h-[90vh] bg-white border border-[#E2E5E2] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-[#E2E5E2] bg-[#F7F9F7] space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getCategoryLogoPath(modalGroup.id)}
                      alt={`Logo ${modalGroup.shortName}`}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-white border border-[#E2E5E2] p-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[#926C15]">
                        Rincian Biaya Pendaftaran {FEE_ACADEMIC_YEAR}
                      </p>
                      <h2
                        id="fee-detail-modal-title"
                        className="font-display text-base sm:text-lg font-bold text-[#111815] truncate"
                      >
                        {modalGroup.title}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Tutup rincian biaya"
                    onClick={() => setActiveModalCategory(null)}
                    className="w-9 h-9 rounded-lg border border-[#D4D9D4] bg-white text-[#4E5651] hover:text-[#111815] hover:bg-[#F2F4F2] inline-flex items-center justify-center shrink-0 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {FEE_CATEGORY_ORDER.map((catId) => (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => setActiveModalCategory(catId)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap ${
                          activeModalCategory === catId
                            ? 'bg-[#14532D] text-white border-[#14532D]'
                            : 'bg-white text-[#4E5651] border-[#D4D9D4] hover:border-[#14532D] hover:text-[#111815]'
                        }`}
                      >
                        {FEE_SCHEDULES[catId].shortName}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex items-center p-0.5 bg-[#E7EAE7] rounded-lg shrink-0">
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
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          genderFilter === opt.id
                            ? 'bg-white text-[#14532D] font-semibold shadow-sm'
                            : 'text-[#4E5651] hover:text-[#111815]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable Breakdown Table */}
              <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white border-b border-[#E2E5E2] z-10">
                    <tr className="text-xs font-semibold text-[#4E5651]">
                      <th scope="col" className="py-2.5 pl-4 sm:pl-6 pr-2 w-11">
                        No.
                      </th>
                      <th scope="col" className="py-2.5 px-2.5">
                        Keterangan
                      </th>
                      {showPutra && (
                        <th scope="col" className="py-2.5 px-3 sm:px-4 text-right whitespace-nowrap">
                          Putra
                        </th>
                      )}
                      {showPutri && (
                        <th scope="col" className="py-2.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                          Putri
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFF1EF] text-xs sm:text-sm">
                    {modalGroup.items.map((item) => (
                      <tr key={item.no} className="odd:bg-white even:bg-[#FAFBF9]">
                        <td className="py-2.5 pl-4 sm:pl-6 pr-2 font-mono text-xs text-[#4E5651] tabular-nums">
                          {item.no}
                        </td>
                        <td className="py-2.5 px-2.5 text-[#111815] font-medium">{item.label}</td>
                        {showPutra && (
                          <td className="py-2.5 px-3 sm:px-4 text-right font-mono tabular-nums text-[#111815] whitespace-nowrap">
                            {item.putra !== null ? formatRupiah(item.putra) : '-'}
                          </td>
                        )}
                        {showPutri && (
                          <td className="py-2.5 pl-3 pr-4 sm:pr-6 text-right font-mono tabular-nums text-[#111815] whitespace-nowrap">
                            {item.putri !== null ? formatRupiah(item.putri) : '-'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 z-10 bg-[#F2F6F3] shadow-[0_-2px_0_rgba(20,83,45,0.2)]">
                    <tr className="text-xs sm:text-sm font-bold text-[#14532D]">
                      <td colSpan={2} className="py-3 pl-4 sm:pl-6 pr-2">
                        {modalGroup.totalLabel}
                      </td>
                      {showPutra && (
                        <td className="py-3 px-3 sm:px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatRupiah(modalGroup.totalPutra)}
                        </td>
                      )}
                      {showPutri && (
                        <td className="py-3 pl-3 pr-4 sm:pr-6 text-right font-mono tabular-nums whitespace-nowrap">
                          {formatRupiah(modalGroup.totalPutri)}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Modal Footer Actions */}
              <div className="px-4 sm:px-6 py-3.5 border-t border-[#E2E5E2] bg-white flex flex-col sm:flex-row sm:items-center justify-end gap-2">
                {modalGroup.registerUnit && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = modalGroup.registerUnit!;
                      setActiveModalCategory(null);
                      onRegisterForUnit(target);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span>Daftar {modalGroup.shortName}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveModalCategory(null)}
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[#111815] bg-white border border-[#D4D9D4] hover:bg-[#F2F4F2] rounded-lg transition-colors whitespace-nowrap"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

