import React, { useMemo, useState } from 'react';
import {
  Award,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Save,
  Search,
  UserCheck,
} from 'lucide-react';
import type {
  FormSchemaConfig,
  RegistrationRecord,
  SelectionStatus,
  UnitId,
} from '../types/spmb.ts';
import {
  computeSelectionStats,
  SELECTION_STATUS_OPTIONS,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from '../utils/spmbLogic.ts';

interface CommitteeSelectionViewProps {
  registrations: RegistrationRecord[];
  formConfig: FormSchemaConfig;
  onSaveSelection: (
    recordId: string,
    payload: {
      statusSeleksi: SelectionStatus;
      nilaiSeleksi: string;
      catatanSeleksi: string;
      statusVerifikasi: 'Menunggu Verifikasi Berkas' | 'Terverifikasi Panitia';
    }
  ) => Promise<void>;
  onPreviewRecord: (record: RegistrationRecord) => void;
}

function selectionBadgeClass(status: SelectionStatus): string {
  switch (status) {
    case 'Lulus Seleksi':
      return 'bg-[#14532D]/10 text-[#14532D] border-[#14532D]/25';
    case 'Dalam Proses Seleksi':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'Cadangan':
      return 'bg-amber-50 text-[#926C15] border-amber-200';
    case 'Tidak Lulus':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-[#F2F4F2] text-[#4E5651] border-[#D4D9D4]';
  }
}

export const CommitteeSelectionView: React.FC<CommitteeSelectionViewProps> = ({
  registrations,
  formConfig,
  onSaveSelection,
  onPreviewRecord,
}) => {
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitId>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SelectionStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [draftStatus, setDraftStatus] = useState<SelectionStatus>('Belum Diseleksi');
  const [draftVerif, setDraftVerif] = useState<
    'Menunggu Verifikasi Berkas' | 'Terverifikasi Panitia'
  >('Menunggu Verifikasi Berkas');
  const [draftNilai, setDraftNilai] = useState('');
  const [draftCatatan, setDraftCatatan] = useState('');
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const unitScopedRecords = useMemo(() => {
    if (unitFilter === 'ALL') return registrations;
    return registrations.filter((r) => r.unit === unitFilter);
  }, [registrations, unitFilter]);

  const summary = useMemo(() => computeSelectionStats(unitScopedRecords), [unitScopedRecords]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return unitScopedRecords.filter((r) => {
      if (statusFilter !== 'ALL' && r.statusSeleksi !== statusFilter) return false;
      if (!q) return true;
      return (
        r.namaLengkap.toLowerCase().includes(q) ||
        r.noPendaftaran.toLowerCase().includes(q) ||
        r.asalSekolah.toLowerCase().includes(q) ||
        r.jenisPrestasi.toLowerCase().includes(q) ||
        r.jalurPendaftaran.toLowerCase().includes(q)
      );
    });
  }, [unitScopedRecords, statusFilter, searchQuery]);

  const openEditor = (record: RegistrationRecord) => {
    setFeedbackMsg('');
    setErrorMsg('');
    if (editingId === record.id) {
      setEditingId(null);
      return;
    }
    setEditingId(record.id);
    setDraftStatus(record.statusSeleksi || 'Belum Diseleksi');
    setDraftVerif(record.statusVerifikasi);
    setDraftNilai(record.nilaiSeleksi || '');
    setDraftCatatan(record.catatanSeleksi || '');
  };

  const handleSave = async (record: RegistrationRecord) => {
    setIsSavingId(record.id);
    setFeedbackMsg('');
    setErrorMsg('');
    try {
      await onSaveSelection(record.id, {
        statusSeleksi: draftStatus,
        nilaiSeleksi: draftNilai.trim(),
        catatanSeleksi: draftCatatan.trim(),
        statusVerifikasi: draftVerif,
      });
      setFeedbackMsg(
        `Keputusan seleksi untuk ${record.namaLengkap} (${draftStatus}) berhasil disimpan.`
      );
      setEditingId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan keputusan seleksi.');
    } finally {
      setIsSavingId(null);
    }
  };

  const activeQuota =
    unitFilter === 'ALL'
      ? UNIT_ORDER.reduce((sum, u) => sum + (formConfig[u]?.quota || UNIT_CONFIGS[u].quota), 0)
      : formConfig[unitFilter]?.quota || UNIT_CONFIGS[unitFilter].quota;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Intro Banner */}
      <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E5E2]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14532D]/10 text-[#14532D] flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#111815]">
                Menu Panitia Seleksi Calon Siswa/i
              </h2>
              <p className="text-xs text-[#4E5651] mt-0.5">
                Periksa kelengkapan berkas, pas foto 3×4, prestasi, dan tetapkan hasil seleksi
                (Lulus, Cadangan, atau Tidak Lulus) per calon murid.
              </p>
            </div>
          </div>

          <div className="text-xs text-[#4E5651] bg-[#F6F7F6] border border-[#E2E5E2] rounded-lg px-3 py-2 shrink-0 tabular-nums">
            Daya Tampung {unitFilter === 'ALL' ? 'Semua Lembaga' : UNIT_CONFIGS[unitFilter].shortName}:{' '}
            <strong className="font-mono text-[#14532D]">{activeQuota} kursi</strong>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="p-3 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2]">
            <p className="text-[11px] text-[#4E5651]">Total Calon</p>
            <p className="mt-1 font-mono text-xl font-bold text-[#111815] tabular-nums">
              {summary.total}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2]">
            <p className="text-[11px] text-[#4E5651]">Belum Diseleksi</p>
            <p className="mt-1 font-mono text-xl font-bold text-[#4E5651] tabular-nums">
              {summary.belum}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200">
            <p className="text-[11px] text-sky-800">Proses Seleksi</p>
            <p className="mt-1 font-mono text-xl font-bold text-sky-900 tabular-nums">
              {summary.proses}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#14532D] text-white">
            <p className="text-[11px] text-white/80">Lulus Seleksi</p>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums">{summary.lulus}</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <p className="text-[11px] text-[#926C15]">Cadangan</p>
            <p className="mt-1 font-mono text-xl font-bold text-[#926C15] tabular-nums">
              {summary.cadangan}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
            <p className="text-[11px] text-red-700">Tidak Lulus</p>
            <p className="mt-1 font-mono text-xl font-bold text-red-800 tabular-nums">
              {summary.tidakLulus}
            </p>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          className="flex items-center gap-2 p-4 rounded-xl bg-[#14532D]/10 border border-[#14532D]/25 text-sm text-[#14532D] font-medium"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {/* Filter & Candidate List */}
      <section className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E5E2] space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F2F4F2] rounded-lg overflow-x-auto">
              <button
                type="button"
                onClick={() => setUnitFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                  unitFilter === 'ALL'
                    ? 'bg-white text-[#14532D] shadow-xs'
                    : 'text-[#4E5651] hover:text-[#111815]'
                }`}
              >
                Semua Lembaga
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 lg:w-[440px]">
              <div>
                <label htmlFor="seleksi-status-filter" className="sr-only">
                  Filter status seleksi
                </label>
                <select
                  id="seleksi-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | SelectionStatus)}
                  className="w-full px-3 py-2 text-xs font-medium bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                >
                  <option value="ALL">Semua Status Seleksi</option>
                  {SELECTION_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-[#4E5651] absolute left-3 top-1/2 -translate-y-1/2" />
                <label htmlFor="seleksi-search" className="sr-only">
                  Cari calon siswa seleksi
                </label>
                <input
                  id="seleksi-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / no. daftar..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-[#E2E5E2]">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#4E5651]">
              Tidak ada calon siswa yang sesuai dengan filter seleksi saat ini.
            </div>
          ) : (
            filteredRecords.map((record) => {
              const isEditing = editingId === record.id;

              return (
                <div key={record.id} className="p-4 sm:p-5 space-y-4 hover:bg-[#FBFDFB]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: 3x4 Photo + Identity */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-14 aspect-[3/4] rounded-lg border border-[#D4D9D4] bg-[#F6F7F6] overflow-hidden flex items-center justify-center shrink-0">
                        {record.pasFotoDataUrl ? (
                          <img
                            src={record.pasFotoDataUrl}
                            alt={`Foto 3x4 ${record.namaLengkap}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-[#4E5651] px-1">
                            <Camera className="w-4 h-4 mx-auto opacity-60" />
                            <span className="text-[10px] block mt-0.5">3×4</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="font-mono font-semibold text-[#14532D] tabular-nums">
                            {record.noPendaftaran}
                          </span>
                          <span aria-hidden="true" className="text-[#4E5651]">
                            ·
                          </span>
                          <span className="font-semibold text-[#111815]">
                            {UNIT_CONFIGS[record.unit].shortName}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${selectionBadgeClass(
                              record.statusSeleksi
                            )}`}
                          >
                            {record.statusSeleksi}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#F6F7F6] border border-[#E2E5E2] text-[11px] text-[#4E5651]">
                            {record.statusVerifikasi}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-bold text-[#111815] break-words">
                          {record.namaLengkap}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#4E5651]">
                          <span>
                            Jalur: <strong className="text-[#111815]">{record.jalurPendaftaran}</strong>
                          </span>
                          <span>Asal: {record.asalSekolah || '-'}</span>
                          {record.jenisPrestasi && record.jenisPrestasi !== '-' && (
                            <span className="inline-flex items-center gap-1 text-[#14532D] font-medium">
                              <Award className="w-3.5 h-3.5 shrink-0" />
                              <span>{record.jenisPrestasi}</span>
                            </span>
                          )}
                        </div>

                        {(record.nilaiSeleksi || record.catatanSeleksi) && (
                          <p className="text-xs text-[#111815] bg-[#F6F7F6] border border-[#E2E5E2] rounded-md px-2.5 py-1.5 mt-1">
                            {record.nilaiSeleksi && (
                              <span>
                                <strong>Nilai:</strong> {record.nilaiSeleksi}
                                {record.catatanSeleksi ? ' · ' : ''}
                              </span>
                            )}
                            {record.catatanSeleksi && (
                              <span>
                                <strong>Catatan:</strong> {record.catatanSeleksi}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => onPreviewRecord(record)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#111815] bg-white border border-[#D4D9D4] hover:bg-[#F2F4F2] rounded-lg whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Berkas</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditor(record)}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                          isEditing
                            ? 'bg-[#E7EAE7] text-[#111815]'
                            : 'bg-[#14532D] text-white hover:bg-[#114626]'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isEditing ? 'Tutup Panel' : 'Seleksi Calon'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Selection Evaluation Panel */}
                  {isEditing && (
                    <div className="p-4 rounded-xl bg-[#F6F7F6] border border-[#D4D9D4] space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label
                            htmlFor={`seleksi-keputusan-${record.id}`}
                            className="block text-xs font-semibold text-[#111815] mb-1"
                          >
                            Keputusan Seleksi
                          </label>
                          <select
                            id={`seleksi-keputusan-${record.id}`}
                            value={draftStatus}
                            onChange={(e) => setDraftStatus(e.target.value as SelectionStatus)}
                            className="w-full px-3 py-2 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                          >
                            {SELECTION_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`seleksi-verif-${record.id}`}
                            className="block text-xs font-semibold text-[#111815] mb-1"
                          >
                            Verifikasi Berkas
                          </label>
                          <select
                            id={`seleksi-verif-${record.id}`}
                            value={draftVerif}
                            onChange={(e) =>
                              setDraftVerif(
                                e.target.value as
                                  | 'Menunggu Verifikasi Berkas'
                                  | 'Terverifikasi Panitia'
                              )
                            }
                            className="w-full px-3 py-2 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                          >
                            <option value="Menunggu Verifikasi Berkas">
                              Menunggu Verifikasi Berkas
                            </option>
                            <option value="Terverifikasi Panitia">Terverifikasi Panitia</option>
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor={`seleksi-nilai-${record.id}`}
                            className="block text-xs font-semibold text-[#111815] mb-1"
                          >
                            Nilai / Hasil Tes
                          </label>
                          <input
                            id={`seleksi-nilai-${record.id}`}
                            type="text"
                            value={draftNilai}
                            onChange={(e) => setDraftNilai(e.target.value)}
                            placeholder="Contoh: 88 / Lancar BTQ"
                            className="w-full px-3 py-2 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`seleksi-catatan-${record.id}`}
                          className="block text-xs font-semibold text-[#111815] mb-1"
                        >
                          Catatan Panitia Seleksi
                        </label>
                        <input
                          id={`seleksi-catatan-${record.id}`}
                          type="text"
                          value={draftCatatan}
                          onChange={(e) => setDraftCatatan(e.target.value)}
                          placeholder="Contoh: Lulus tes baca Al-Quran & wawancara orang tua."
                          className="w-full px-3 py-2 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 text-xs font-semibold text-[#111815] bg-white border border-[#D4D9D4] hover:bg-[#F2F4F2] rounded-lg"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={isSavingId === record.id}
                          onClick={() => void handleSave(record)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>
                            {isSavingId === record.id
                              ? 'Menyimpan...'
                              : 'Simpan Keputusan Seleksi'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
