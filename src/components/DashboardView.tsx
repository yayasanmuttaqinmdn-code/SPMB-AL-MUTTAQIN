import React from 'react';
import { Lock, RefreshCw } from 'lucide-react';
import type { DashboardStats, UnitId } from '../types/spmb.ts';
import {
  FOUNDATION_LOGO_PATH,
  getUnitLogoPath,
  INSTITUTION_NAME,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from '../utils/spmbLogic.ts';

interface DashboardViewProps {
  stats: DashboardStats;
  lastSyncedAt: string | null;
  isRefreshing: boolean;
  onRefreshData: () => void;
  onRegisterForUnit: (unit: UnitId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  lastSyncedAt,
  isRefreshing,
  onRefreshData,
  onRegisterForUnit,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-[#E2E5E2]">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <img
            src={FOUNDATION_LOGO_PATH}
            alt={`Logo ${INSTITUTION_NAME}`}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-contain bg-white p-1 border border-[#E2E5E2] shrink-0"
          />
          <div className="space-y-1">
            <p className="text-xs text-[#4E5651]">
              {INSTITUTION_NAME} ·{' '}
              {lastSyncedAt
                ? `Sinkron Google Sheets: ${new Date(lastSyncedAt).toLocaleTimeString('id-ID')}`
                : 'Pembaruan Real-Time'}
            </p>
            <h1 className="font-display text-xl sm:text-3xl font-bold text-[#111815]">
              Dashboard Jumlah Pendaftar Sementara
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshing}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#111815] bg-white border border-[#D4D9D4] rounded-lg hover:bg-[#F2F4F2] whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Read-Only Notice */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-[#E2E5E2] text-xs sm:text-sm text-[#4E5651]">
        <Lock className="w-4 h-4 text-[#14532D] shrink-0" />
        <span>
          Dashboard publik menampilkan jumlah pendaftar sementara tiap lembaga secara real-time.
          Data pribadi calon murid dilindungi dan hanya dapat dikelola oleh Panitia Admin.
        </span>
      </div>

      {/* Top KPI Cards */}
      <section
        aria-label="Statistik jumlah pendaftar per lembaga"
        className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"
      >
        <div className="col-span-2 lg:col-span-1 bg-[#14532D] text-white rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs text-white/80">Total Pendaftar Yayasan</p>
            <p className="mt-1.5 sm:mt-2 font-mono text-3xl font-semibold tabular-nums">
              {stats.totalCount}
            </p>
          </div>
          <div className="mt-3 sm:mt-4 pt-3 border-t border-white/15 text-xs text-white/85 flex items-center justify-between tabular-nums">
            <span>Kuota Total: {stats.totalQuota}</span>
            <span>Sisa: {Math.max(0, stats.totalQuota - stats.totalCount)}</span>
          </div>
        </div>

        {UNIT_ORDER.map((unit) => {
          const st = stats.byUnit[unit];
          const pct = Math.min(100, Math.round((st.count / Math.max(1, st.quota)) * 100));

          return (
            <div
              key={unit}
              className="bg-white border border-[#E2E5E2] rounded-xl p-4 sm:p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={getUnitLogoPath(unit)}
                      alt={`Logo ${st.shortName}`}
                      className="w-7 h-7 rounded-md object-contain bg-white p-0.5 border border-[#E2E5E2] shrink-0"
                    />
                    <h2 className="font-display text-sm font-bold text-[#111815] truncate">
                      {st.shortName}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRegisterForUnit(unit)}
                    className="text-xs font-semibold text-[#14532D] hover:underline whitespace-nowrap shrink-0"
                  >
                    Daftar
                  </button>
                </div>

                <div className="mt-2 flex items-baseline gap-1.5 sm:gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-semibold text-[#14532D] tabular-nums">
                    {st.count}
                  </span>
                  <span className="text-xs text-[#4E5651] tabular-nums">/ {st.quota} kuota</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="h-1.5 w-full bg-[#EFF1EF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#14532D] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-[#4E5651] tabular-nums">
                  <span>Sisa {st.remaining} kursi</span>
                  {(unit === 'SMP' || unit === 'SMA') && st.mukimCount > 0 && (
                    <span>Mukim: {st.mukimCount}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Read-Only Institutional Breakdown Table */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[#E2E5E2]">
          <h2 className="font-display text-base font-bold text-[#111815]">
            Ringkasan Kuota & Daya Tampung per Lembaga
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F7F6] border-b border-[#E2E5E2] text-xs font-semibold text-[#4E5651]">
                <th className="py-3 px-3.5 sm:px-5 whitespace-nowrap">Lembaga Pendidikan</th>
                <th className="py-3 px-3.5 sm:px-5 whitespace-nowrap">Jenjang Usia / Lulusan</th>
                <th className="py-3 px-3.5 sm:px-5 text-right whitespace-nowrap">Pendaftar</th>
                <th className="py-3 px-3.5 sm:px-5 text-right whitespace-nowrap">Kuota</th>
                <th className="py-3 px-3.5 sm:px-5 text-right whitespace-nowrap">Sisa Kursi</th>
                <th className="py-3 px-3.5 sm:px-5 text-right whitespace-nowrap">Keterisian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5E2] text-sm">
              {UNIT_ORDER.map((unit) => {
                const cfg = UNIT_CONFIGS[unit];
                const st = stats.byUnit[unit];
                const pct = Math.min(100, Math.round((st.count / Math.max(1, st.quota)) * 100));

                return (
                  <tr key={unit} className="hover:bg-[#F9FAF9]">
                    <td className="py-3 px-3.5 sm:px-5 font-semibold text-[#111815] whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={getUnitLogoPath(unit)}
                          alt={`Logo ${cfg.shortName}`}
                          className="w-6 h-6 rounded object-contain bg-white border border-[#E2E5E2] shrink-0"
                        />
                        <span>{cfg.fullName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 sm:px-5 text-xs text-[#4E5651] whitespace-nowrap">
                      {cfg.ageRange}
                    </td>
                    <td className="py-3 px-3.5 sm:px-5 text-right font-mono font-semibold text-[#14532D] tabular-nums">
                      {st.count}
                    </td>
                    <td className="py-3 px-3.5 sm:px-5 text-right font-mono text-[#4E5651] tabular-nums">
                      {st.quota}
                    </td>
                    <td className="py-3 px-3.5 sm:px-5 text-right font-mono text-[#111815] tabular-nums">
                      {st.remaining}
                    </td>
                    <td className="py-3 px-3.5 sm:px-5 text-right font-mono text-xs text-[#4E5651] tabular-nums">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
