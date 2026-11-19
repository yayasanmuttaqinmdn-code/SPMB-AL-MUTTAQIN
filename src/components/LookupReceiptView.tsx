import React, { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileCheck2,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import type { FormSchemaConfig, RegistrationRecord } from '../types/spmb.ts';
import {
  buildRegistrationStatusSummary,
  getUnitLogoPath,
  type RegistrationStatusStep,
  type RegistrationStatusSummary,
  UNIT_CONFIGS,
} from '../utils/spmbLogic.ts';
import { downloadRegistrationPdf } from '../utils/pdfGenerator.ts';

interface LookupReceiptViewProps {
  formConfig: FormSchemaConfig;
  onPreviewRecord: (record: RegistrationRecord) => void;
  onLookup?: (queryOrName: string) => Promise<RegistrationRecord[]>;
}

const TONE_CLASSES: Record<
  RegistrationStatusSummary['tone'],
  { container: string; badge: string; title: string }
> = {
  emerald: {
    container: 'bg-[#14532D]/10 border-[#14532D]/30',
    badge: 'bg-[#14532D] text-white',
    title: 'text-[#14532D]',
  },
  amber: {
    container: 'bg-amber-50 border-amber-200',
    badge: 'bg-[#926C15] text-white',
    title: 'text-[#926C15]',
  },
  rose: {
    container: 'bg-red-50 border-red-200',
    badge: 'bg-red-700 text-white',
    title: 'text-red-800',
  },
  blue: {
    container: 'bg-sky-50 border-sky-200',
    badge: 'bg-sky-700 text-white',
    title: 'text-sky-900',
  },
  neutral: {
    container: 'bg-[#F6F7F6] border-[#D4D9D4]',
    badge: 'bg-[#4E5651] text-white',
    title: 'text-[#111815]',
  },
};

function renderStepIcon(state: RegistrationStatusStep['state']) {
  if (state === 'done') {
    return <CheckCircle2 className="w-4 h-4 text-[#14532D] shrink-0" />;
  }
  if (state === 'rejected') {
    return <XCircle className="w-4 h-4 text-red-700 shrink-0" />;
  }
  if (state === 'current') {
    return <Clock className="w-4 h-4 text-[#926C15] shrink-0" />;
  }
  return <ClipboardCheck className="w-4 h-4 text-[#8C948E] shrink-0" />;
}

export const LookupReceiptView: React.FC<LookupReceiptViewProps> = ({
  formConfig,
  onPreviewRecord,
  onLookup,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [foundRecords, setFoundRecords] = useState<RegistrationRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [refreshedNotice, setRefreshedNotice] = useState('');

  const runSearch = async (rawQuery: string, isRefresh = false) => {
    setErrorMsg('');
    setRefreshedNotice('');
    if (!isRefresh) {
      setFoundRecords([]);
    }

    const cleanQuery = rawQuery.trim().replace(/\s+/g, ' ');
    if (cleanQuery.length < 3) {
      setErrorMsg(
        'Masukkan minimal 3 karakter (Nama Anak, No. Pendaftaran, atau NIK).'
      );
      return;
    }

    setIsSearching(true);
    try {
      let list: RegistrationRecord[] = [];
      if (onLookup) {
        list = await onLookup(cleanQuery);
      } else {
        const res = await fetch('/api/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: cleanQuery,
            namaLengkap: cleanQuery,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Data pendaftar tidak ditemukan.');
          setFoundRecords([]);
          return;
        }
        list = Array.isArray(data.records)
          ? data.records
          : data.record
            ? [data.record]
            : [];
      }

      setLastSearchedQuery(cleanQuery);
      if (list.length === 0) {
        setFoundRecords([]);
        setErrorMsg(
          'Data pendaftar tidak ditemukan. Periksa kembali Nama Anak, No. Pendaftaran, atau NIK.'
        );
        return;
      }

      setFoundRecords(list);
      if (isRefresh) {
        setRefreshedNotice(
          `Status diperbarui (${new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })} WIB).`
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : 'Terjadi kendala koneksi saat memeriksa status pendaftaran.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(searchQuery, false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-[#E2E5E2] rounded-2xl p-5 sm:p-8 space-y-5">
        <div className="space-y-1">
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111815]">
            Cek Status Pendaftaran
          </h1>
          <p className="text-sm text-[#4E5651]">
            Pantau verifikasi, hasil seleksi, dan unduh bukti PDF.
          </p>
        </div>

        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label
              htmlFor="cek-status-input"
              className="block text-xs font-semibold text-[#111815] mb-1.5"
            >
              Nama Anak / No. Pendaftaran / NIK
            </label>
            <input
              id="cek-status-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: Adam Insan Atama atau SPMB-2027-TK-0001"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
            />
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5"
            >
              {errorMsg}
            </p>
          )}

          {refreshedNotice && (
            <p
              role="status"
              className="text-xs text-[#14532D] bg-[#14532D]/10 border border-[#14532D]/25 rounded-lg px-3.5 py-2.5 font-medium"
            >
              {refreshedNotice}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg transition-colors disabled:opacity-60"
            >
              <Search className="w-4 h-4" />
              <span>{isSearching ? 'Memeriksa...' : 'Cek Status'}</span>
            </button>

            {foundRecords.length > 0 && lastSearchedQuery && (
              <button
                type="button"
                disabled={isSearching}
                onClick={() => void runSearch(lastSearchedQuery, true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#14532D] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                <span>Perbarui</span>
              </button>
            )}
          </div>
        </form>

        {foundRecords.length > 0 && (
          <div className="space-y-5 pt-2">
            {foundRecords.map((record) => {
              const unitCfg = UNIT_CONFIGS[record.unit];
              const unitFormCfg = formConfig[record.unit];
              const summary = buildRegistrationStatusSummary(record);
              const toneStyle = TONE_CLASSES[summary.tone];
              const docsList =
                unitFormCfg.requiredDocs.length > 0
                  ? unitFormCfg.requiredDocs
                  : unitCfg.requiredDocs;
              const registeredAtText = new Date(record.createdAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <article
                  key={record.id}
                  className="rounded-2xl border border-[#D4D9D4] bg-white overflow-hidden"
                >
                  {/* Candidate Header */}
                  <div className="p-4 sm:p-5 bg-[#F9FAF9] border-b border-[#E2E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <img
                        src={getUnitLogoPath(record.unit)}
                        alt={`Logo ${unitCfg.shortName}`}
                        className="w-11 h-11 rounded-lg object-contain bg-white p-0.5 border border-[#D4D9D4] shrink-0"
                      />
                      {record.pasFotoDataUrl && (
                        <img
                          src={record.pasFotoDataUrl}
                          alt={`Foto ${record.namaLengkap}`}
                          className="w-12 aspect-[3/4] rounded-md object-cover border border-[#D4D9D4] bg-white shrink-0"
                        />
                      )}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#4E5651]">
                          <span className="font-mono font-semibold text-[#14532D] tabular-nums">
                            {record.noPendaftaran}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#111815]">{unitCfg.shortName}</span>
                          <span aria-hidden="true">·</span>
                          <span>Jalur {record.jalurPendaftaran || 'Reguler'}</span>
                        </div>
                        <h2 className="font-display text-lg font-bold text-[#111815] break-words">
                          {record.namaLengkap}
                        </h2>
                        <p className="text-xs text-[#4E5651] break-words">
                          Wali: {record.namaAyah || record.namaIbu || '-'} · Terdaftar{' '}
                          {registeredAtText}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold ${toneStyle.badge}`}
                      >
                        {summary.badgeLabel}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 space-y-5">
                    {/* Prominent Current Status Callout */}
                    <div className={`p-4 rounded-xl border ${toneStyle.container} space-y-1.5`}>
                      <p className={`font-display text-sm sm:text-base font-bold ${toneStyle.title}`}>
                        {summary.headline}
                      </p>
                      <p className="text-xs sm:text-sm text-[#353D38] leading-relaxed">
                        {summary.guidance}
                      </p>
                    </div>

                    {/* 3-Step Status Progress Tracker */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#111815] uppercase tracking-wide">
                        Tahapan Pendaftaran &amp; Seleksi
                      </p>
                      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {summary.steps.map((step, index) => (
                          <li
                            key={step.key}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              step.state === 'done'
                                ? 'bg-[#14532D]/5 border-[#14532D]/25'
                                : step.state === 'rejected'
                                  ? 'bg-red-50 border-red-200'
                                  : step.state === 'current'
                                    ? 'bg-amber-50/70 border-amber-200'
                                    : 'bg-[#F9FAF9] border-[#E2E5E2]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {renderStepIcon(step.state)}
                              <span className="font-semibold text-[#111815]">
                                {index + 1}. {step.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#4E5651] leading-relaxed pl-6">
                              {step.subtitle}
                            </p>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Selection Score & Committee Notes if present */}
                    {(record.nilaiSeleksi || record.catatanSeleksi || record.diseleksiAt) && (
                      <div className="p-3.5 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-[#111815]">
                          <FileCheck2 className="w-3.5 h-3.5 text-[#14532D]" />
                          <span>Keterangan Panitia Seleksi</span>
                        </div>
                        {record.nilaiSeleksi && (
                          <p className="text-[#353D38]">
                            <strong>Nilai / Hasil Tes:</strong> {record.nilaiSeleksi}
                          </p>
                        )}
                        {record.catatanSeleksi && (
                          <p className="text-[#353D38]">
                            <strong>Catatan Panitia:</strong> {record.catatanSeleksi}
                          </p>
                        )}
                        {record.diseleksiAt && (
                          <p className="text-[11px] text-[#4E5651]">
                            Diperbarui:{' '}
                            {new Date(record.diseleksiAt).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Required Documents Checklist */}
                    <div className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-1.5">
                      <p className="text-xs font-semibold text-[#111815]">
                        Berkas Persyaratan ({unitCfg.shortName})
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[#4E5651]">
                        {docsList.map((doc) => (
                          <li key={doc}>· {doc}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 sm:flex sm:justify-end items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onPreviewRecord(record)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-semibold text-[#111815] bg-white border border-[#D4D9D4] hover:bg-[#F2F4F2] rounded-lg whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Bukti Lengkap</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadRegistrationPdf(record, unitFormCfg)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg whitespace-nowrap"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh PDF</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
