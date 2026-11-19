import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  FolderKanban,
  Globe,
  KeyRound,
  Layers,
  Link2Off,
  LogOut,
  RefreshCw,
  Send,
  Webhook,
} from 'lucide-react';
import type {
  DashboardStats,
  SheetsPublicConfig,
  SheetsSyncMode,
  UnitId,
  UnitSheetsTarget,
} from '../types/spmb.ts';
import { APPS_SCRIPT_SNIPPET, getEnvAppsScriptUrl } from '../utils/cloudSync.ts';
import { preloadGisClient } from '../utils/firebaseAuth.ts';
import {
  buildCloudShareUrl,
  countConfiguredUnitTargets,
  isValidAppsScriptExecUrl,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from '../utils/spmbLogic.ts';

interface SheetsSyncViewProps {
  user: User | null;
  hasAccessToken: boolean;
  authModeLabel: string;
  isLoggingIn: boolean;
  isSyncing: boolean;
  isTestingWebhook: boolean;
  isPushingWebhook: boolean;
  syncMessage: string;
  syncError: string;
  sheetsConfig: SheetsPublicConfig;
  hasGlobalCloudConfig?: boolean;
  stats: DashboardStats;
  onGoogleLogin: () => void;
  onDirectGoogleTokenLogin: () => void;
  onGoogleLogout: () => void;
  onChangeSyncMode: (mode: SheetsSyncMode) => void;
  onCreateSpreadsheet: () => void;
  onCreateUnitSpreadsheet: (unit: UnitId) => void;
  onCreateAllUnitSpreadsheets: () => void;
  onConnectSpreadsheetId: (rawIdOrUrl: string) => void;
  onConnectUnitSpreadsheet: (unit: UnitId, rawIdOrUrl: string) => void;
  onDisconnectSpreadsheet: () => void;
  onDisconnectUnitSpreadsheet: (unit: UnitId) => void;
  onSyncNow: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onSaveAppsScriptUrl: (url: string, spreadsheetUrlOrId?: string) => void;
  onSavePerUnitWebhookConfig: (payload: {
    appsScriptUrl?: string;
    unitTargets: Record<UnitId, UnitSheetsTarget>;
  }) => void;
  onTestAppsScript: (url: string, spreadsheetUrlOrId?: string, unit?: UnitId) => Promise<void>;
  onPushViaAppsScript: (payload: {
    syncMode: SheetsSyncMode;
    url: string;
    spreadsheetUrlOrId?: string;
    unitTargets?: Record<UnitId, UnitSheetsTarget>;
  }) => Promise<void>;
  onPullViaAppsScript: (payload: {
    syncMode: SheetsSyncMode;
    url: string;
    spreadsheetUrlOrId?: string;
    unitTargets?: Record<UnitId, UnitSheetsTarget>;
  }) => Promise<void>;
}

export const SheetsSyncView: React.FC<SheetsSyncViewProps> = ({
  user,
  hasAccessToken,
  authModeLabel,
  isLoggingIn,
  isSyncing,
  isTestingWebhook,
  isPushingWebhook,
  syncMessage,
  syncError,
  sheetsConfig,
  hasGlobalCloudConfig = false,
  stats,
  onGoogleLogin,
  onDirectGoogleTokenLogin,
  onGoogleLogout,
  onChangeSyncMode,
  onCreateSpreadsheet,
  onCreateUnitSpreadsheet,
  onCreateAllUnitSpreadsheets,
  onConnectSpreadsheetId,
  onConnectUnitSpreadsheet,
  onDisconnectSpreadsheet,
  onDisconnectUnitSpreadsheet,
  onSyncNow,
  onToggleAutoSync,
  onSaveAppsScriptUrl,
  onSavePerUnitWebhookConfig,
  onTestAppsScript,
  onPushViaAppsScript,
  onPullViaAppsScript,
}) => {
  const [sheetInput, setSheetInput] = useState(sheetsConfig.spreadsheetId || '');
  const [appsScriptInput, setAppsScriptInput] = useState(sheetsConfig.appsScriptUrl || '');
  const [unitSheetInputs, setUnitSheetInputs] = useState<Record<UnitId, string>>({
    RA_TK: sheetsConfig.unitTargets.RA_TK.spreadsheetId || '',
    SDIT: sheetsConfig.unitTargets.SDIT.spreadsheetId || '',
    SMP: sheetsConfig.unitTargets.SMP.spreadsheetId || '',
    SMA: sheetsConfig.unitTargets.SMA.spreadsheetId || '',
  });
  const [unitWebhookInputs, setUnitWebhookInputs] = useState<Record<UnitId, string>>({
    RA_TK: sheetsConfig.unitTargets.RA_TK.appsScriptUrl || '',
    SDIT: sheetsConfig.unitTargets.SDIT.appsScriptUrl || '',
    SMP: sheetsConfig.unitTargets.SMP.appsScriptUrl || '',
    SMA: sheetsConfig.unitTargets.SMA.appsScriptUrl || '',
  });
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedVercelEnv, setCopiedVercelEnv] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  useEffect(() => {
    setSheetInput(sheetsConfig.spreadsheetId || '');
  }, [sheetsConfig.spreadsheetId]);

  useEffect(() => {
    setAppsScriptInput(sheetsConfig.appsScriptUrl || '');
  }, [sheetsConfig.appsScriptUrl]);

  useEffect(() => {
    setUnitSheetInputs({
      RA_TK: sheetsConfig.unitTargets.RA_TK.spreadsheetId || '',
      SDIT: sheetsConfig.unitTargets.SDIT.spreadsheetId || '',
      SMP: sheetsConfig.unitTargets.SMP.spreadsheetId || '',
      SMA: sheetsConfig.unitTargets.SMA.spreadsheetId || '',
    });
    setUnitWebhookInputs({
      RA_TK: sheetsConfig.unitTargets.RA_TK.appsScriptUrl || '',
      SDIT: sheetsConfig.unitTargets.SDIT.appsScriptUrl || '',
      SMP: sheetsConfig.unitTargets.SMP.appsScriptUrl || '',
      SMA: sheetsConfig.unitTargets.SMA.appsScriptUrl || '',
    });
  }, [sheetsConfig.unitTargets]);

  useEffect(() => {
    void preloadGisClient().catch(() => undefined);
  }, []);

  const isPerUnitMode = sheetsConfig.syncMode === 'per_unit';
  const publicUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const hasWebhook = Boolean((appsScriptInput || sheetsConfig.appsScriptUrl).trim());
  const isGoogleConnected = hasAccessToken;
  const googleIdentityText = user?.displayName || user?.email || authModeLabel || 'Akun Google Terhubung';
  const configuredUnitsCount = countConfiguredUnitTargets(sheetsConfig);
  const hasAnyPerUnitOAuth = UNIT_ORDER.some((u) => Boolean(sheetsConfig.unitTargets[u]?.spreadsheetId));

  const buildDraftUnitTargets = (): Record<UnitId, UnitSheetsTarget> => ({
    RA_TK: {
      ...sheetsConfig.unitTargets.RA_TK,
      spreadsheetId: unitSheetInputs.RA_TK.trim(),
      appsScriptUrl: unitWebhookInputs.RA_TK.trim(),
    },
    SDIT: {
      ...sheetsConfig.unitTargets.SDIT,
      spreadsheetId: unitSheetInputs.SDIT.trim(),
      appsScriptUrl: unitWebhookInputs.SDIT.trim(),
    },
    SMP: {
      ...sheetsConfig.unitTargets.SMP,
      spreadsheetId: unitSheetInputs.SMP.trim(),
      appsScriptUrl: unitWebhookInputs.SMP.trim(),
    },
    SMA: {
      ...sheetsConfig.unitTargets.SMA,
      spreadsheetId: unitSheetInputs.SMA.trim(),
      appsScriptUrl: unitWebhookInputs.SMA.trim(),
    },
  });

  const hasAnyPerUnitWebhookDraft =
    Boolean(appsScriptInput.trim()) ||
    UNIT_ORDER.some((u) => Boolean(unitWebhookInputs[u].trim()));

  const copyTextSafely = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleCopyScript = async () => {
    const ok = await copyTextSafely(APPS_SCRIPT_SNIPPET);
    if (ok) {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setShowScriptCode(true);
    }
  };

  const envAppsScriptUrl = getEnvAppsScriptUrl();
  const effectiveWebhookForVercel = (
    appsScriptInput ||
    sheetsConfig.appsScriptUrl ||
    envAppsScriptUrl
  ).trim();
  const isGlobalSynced = hasGlobalCloudConfig || Boolean(envAppsScriptUrl);
  const hasShareableWebhook = isValidAppsScriptExecUrl(effectiveWebhookForVercel);
  const shareableSyncUrl = hasShareableWebhook
    ? buildCloudShareUrl(
        publicUrl || 'https://portal-spmb.vercel.app',
        effectiveWebhookForVercel,
        sheetInput.trim() || sheetsConfig.spreadsheetId
      )
    : '';

  const vercelEnvSnippet = [
    `VITE_APPS_SCRIPT_URL=${effectiveWebhookForVercel || 'https://script.google.com/macros/s/ISI_URL_EXEC_ANDA/exec'}`,
    sheetInput.trim() || sheetsConfig.spreadsheetId
      ? `VITE_SPREADSHEET_ID=${sheetInput.trim() || sheetsConfig.spreadsheetId}`
      : '',
    `VITE_ADMIN_PASSWORD=muttaqin2026`,
  ]
    .filter(Boolean)
    .join('\n');

  const handleCopyVercelEnv = async () => {
    const ok = await copyTextSafely(vercelEnvSnippet);
    if (ok) {
      setCopiedVercelEnv(true);
      setTimeout(() => setCopiedVercelEnv(false), 2000);
    }
  };

  const handleCopyShareSyncLink = async () => {
    if (!shareableSyncUrl) return;
    const ok = await copyTextSafely(shareableSyncUrl);
    if (ok) {
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-[#E2E5E2]">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111815]">
          Integrasi Google Spreadsheet
        </h1>
      </div>

      {/* Mode Selector: 1 File Spreadsheet (Beda Halaman/Tab) vs 4 File Terpisah */}
      <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#4E5651]">
          Pilih Mode Struktur Google Sheet
        </p>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          role="tablist"
          aria-label="Mode Struktur Google Sheet"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isPerUnitMode}
            onClick={() => onChangeSyncMode('unified')}
            className={`text-left p-4 rounded-xl border transition-colors ${
              !isPerUnitMode
                ? 'bg-[#14532D]/5 border-[#14532D] ring-1 ring-[#14532D]'
                : 'bg-[#F9FAF9] border-[#E2E5E2] hover:bg-[#F2F4F2]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  !isPerUnitMode ? 'bg-[#14532D] text-white' : 'bg-[#E7EAE7] text-[#4E5651]'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-bold text-[#111815]">
                  1 File Spreadsheet (Tab per Lembaga)
                </p>
                <p className="text-xs text-[#4E5651]">
                  Otomatis membagi tab RA_TK, SDIT, SMP, dan SMA.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={isPerUnitMode}
            onClick={() => onChangeSyncMode('per_unit')}
            className={`text-left p-4 rounded-xl border transition-colors ${
              isPerUnitMode
                ? 'bg-[#14532D]/5 border-[#14532D] ring-1 ring-[#14532D]'
                : 'bg-[#F9FAF9] border-[#E2E5E2] hover:bg-[#F2F4F2]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isPerUnitMode ? 'bg-[#14532D] text-white' : 'bg-[#E7EAE7] text-[#4E5651]'
                }`}
              >
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-bold text-[#111815]">
                  4 File Spreadsheet Terpisah
                </p>
                <p className="text-xs text-[#4E5651]">
                  Pisahkan ke 4 file Google Drive berbeda (1 file per lembaga).
                </p>
              </div>
            </div>
          </button>
        </div>

        {!isPerUnitMode && (
          <div className="pt-2 border-t border-[#E2E5E2]/80">
            <p className="text-xs font-medium text-[#4E5651] mb-2">
              Tab dalam Spreadsheet:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {UNIT_ORDER.map((unit) => {
                const cfg = UNIT_CONFIGS[unit];
                return (
                  <div
                    key={unit}
                    className="px-3 py-2 rounded-lg bg-[#F6F7F6] border border-[#E2E5E2] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold font-mono text-[#14532D] truncate">
                        {cfg.sheetTabName}
                      </p>
                      <p className="text-[11px] text-[#4E5651] truncate">{cfg.shortName}</p>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#111815] tabular-nums">
                      {stats.byUnit[unit].count}
                    </span>
                  </div>
                );
              })}
              <div className="px-3 py-2 rounded-lg bg-[#F6F7F6] border border-[#E2E5E2] col-span-2 sm:col-span-1 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold font-mono text-[#111815] truncate">
                    Ringkasan
                  </p>
                  <p className="text-[11px] text-[#4E5651] truncate">Dashboard Rekap</p>
                </div>
                <span className="text-xs font-mono font-semibold text-[#111815] tabular-nums">
                  {stats.totalCount}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-5 space-y-1">
          <p className="text-xs font-medium text-[#4E5651]">Mode Aktif · Target Sheet</p>
          <p className="text-base font-bold text-[#111815] truncate">
            {isPerUnitMode
              ? `${configuredUnitsCount} / 4 Sheet Lembaga Terhubung`
              : sheetsConfig.spreadsheetId
                ? sheetsConfig.spreadsheetTitle || 'Spreadsheet Terhubung'
                : 'Belum Terhubung'}
          </p>
          <p className="text-xs text-[#4E5651] truncate">
            {isGoogleConnected
              ? `Login Google: ${googleIdentityText}`
              : isPerUnitMode
                ? 'Setiap jenjang menuju file Google Sheet masing-masing.'
                : 'Masuk Google atau pasang Webhook di bawah.'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-5 space-y-1">
          <p className="text-xs font-medium text-[#4E5651]">
            Mode Cloud Sync · Tanpa Firebase (Siap Vercel)
          </p>
          <p className="text-base font-bold text-[#111815]">
            {isGlobalSynced
              ? 'Aktif Global (Semua Perangkat)'
              : sheetsConfig.appsScriptUrl ||
                  UNIT_ORDER.some((u) => Boolean(sheetsConfig.unitTargets[u]?.appsScriptUrl))
                ? 'Aktif di Browser Ini Saja'
                : 'Belum Dipasang'}
          </p>
          <p className="text-xs text-[#4E5651]">
            {isGlobalSynced
              ? 'Semua HP & laptop otomatis membaca Google Spreadsheet yang sama.'
              : sheetsConfig.appsScriptUrl
                ? 'Tambahkan Env Vercel lalu Redeploy (atau bagikan Link Tersinkron di bawah) agar semua HP sama.'
                : 'Sinkron 2 arah antar perangkat langsung via Google Spreadsheet.'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-5 space-y-1 tabular-nums">
          <p className="text-xs font-medium text-[#4E5651]">Status Data &amp; Sinkronisasi</p>
          <p className="text-base font-bold text-[#111815] font-mono">
            {stats.totalSynced} / {stats.totalCount} Tersinkron
          </p>
          <p className="text-xs text-[#4E5651]">
            {stats.totalPending > 0
              ? `${stats.totalPending} data menunggu dikirim ke Spreadsheet`
              : sheetsConfig.lastSyncedAt
                ? `Terakhir sync: ${new Date(sheetsConfig.lastSyncedAt).toLocaleTimeString('id-ID')}`
                : 'Semua data lokal siap disinkronkan'}
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {syncMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 p-4 rounded-xl bg-[#14532D]/10 border border-[#14532D]/25 text-sm text-[#14532D] font-medium"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{syncMessage}</span>
        </div>
      )}

      {syncError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 space-y-1.5"
        >
          <p className="font-semibold">Koneksi Spreadsheet Memerlukan Perhatian:</p>
          <p>{syncError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cara 1 - Google Account & Two-Way Spreadsheet Sync */}
        <div className="lg:col-span-6 bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E5E2]">
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-[#111815]">
                Cara 1 · Akun Google Panitia (Sinkron 2 Arah)
              </h2>
              <p className="text-xs text-[#4E5651] mt-0.5">
                {isGoogleConnected
                  ? `Terhubung sebagai ${googleIdentityText}`
                  : isPerUnitMode
                    ? 'Masuk akun Google untuk membuat atau menghubungkan 4 file Sheet terpisah (RA/TK, SDIT, SMP, SMA).'
                    : 'Masuk akun Google untuk membuat 1 file Spreadsheet baru atau menghubungkan file yang sudah ada.'}
              </p>
            </div>

            {isGoogleConnected ? (
              <button
                type="button"
                onClick={onGoogleLogout}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg whitespace-nowrap shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putuskan Sesi Google</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button shrink-0"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            )}
          </div>

          {!isGoogleConnected && (
            <div className="p-3.5 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] space-y-2.5">
              <p className="text-xs text-[#4E5651] leading-relaxed">
                Jika tombol <strong>Sign in with Google</strong> tidak merespons di preview, klik
                opsi di bawah atau langsung gunakan <strong>Cara 2 (Webhook Apps Script)</strong> di
                sebelah kanan:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onDirectGoogleTokenLogin}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#14532D] bg-white border border-[#14532D]/30 hover:bg-[#14532D]/5 rounded-lg disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Alternatif: Login Google Token</span>
                </button>
                {isInIframe && publicUrl && (
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111815] bg-white border border-[#D4D9D4] hover:bg-[#F2F4F2] rounded-lg"
                  >
                    <span>Buka Portal di Tab Baru</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {isPerUnitMode ? (
            /* PER-UNIT MODE (4 Separate Spreadsheets) */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#111815]">
                  Sheet Khusus Tiap Lembaga (4 File)
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onCreateAllUnitSpreadsheets}
                    disabled={!isGoogleConnected || isSyncing}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Buat 4 Sheet Sekaligus</span>
                  </button>
                  {hasAnyPerUnitOAuth && (
                    <button
                      type="button"
                      onClick={onSyncNow}
                      disabled={!isGoogleConnected || isSyncing}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/15 rounded-lg disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Menyinkronkan...' : 'Sync Semua Lembaga'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {UNIT_ORDER.map((unit) => {
                  const uCfg = UNIT_CONFIGS[unit];
                  const target = sheetsConfig.unitTargets[unit];
                  const count = stats.byUnit[unit].count;

                  return (
                    <div
                      key={unit}
                      className="p-3.5 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#111815]">
                            {uCfg.fullName}{' '}
                            <span className="text-xs font-normal text-[#4E5651]">
                              ({count} pendaftar)
                            </span>
                          </p>
                          {target.spreadsheetId ? (
                            <p className="text-xs text-[#14532D] font-medium truncate">
                              Terhubung: {target.spreadsheetTitle || `Sheet ${uCfg.shortName}`}
                            </p>
                          ) : (
                            <p className="text-xs text-[#4E5651]">
                              Belum terhubung ke file Sheet {uCfg.shortName}
                            </p>
                          )}
                        </div>

                        {target.spreadsheetId ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={
                                target.spreadsheetUrl ||
                                `https://docs.google.com/spreadsheets/d/${target.spreadsheetId}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#14532D] bg-white border border-[#14532D]/30 rounded-lg hover:bg-[#14532D]/5"
                            >
                              <span>Buka Sheet</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => onDisconnectUnitSpreadsheet(unit)}
                              aria-label={`Putuskan Sheet ${uCfg.shortName}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                            >
                              <Link2Off className="w-3 h-3" />
                              <span>Putuskan</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onCreateUnitSpreadsheet(unit)}
                            disabled={!isGoogleConnected || isSyncing}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#14532D] bg-white border border-[#14532D]/30 rounded-lg hover:bg-[#14532D]/5 disabled:opacity-50 shrink-0"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Buat Sheet {uCfg.shortName}</span>
                          </button>
                        )}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          onConnectUnitSpreadsheet(unit, unitSheetInputs[unit]);
                        }}
                        className="flex flex-col sm:flex-row gap-2"
                      >
                        <label htmlFor={`oauth-unit-sheet-${unit}`} className="sr-only">
                          URL atau ID Google Sheet {uCfg.shortName}
                        </label>
                        <input
                          id={`oauth-unit-sheet-${unit}`}
                          type="text"
                          value={unitSheetInputs[unit]}
                          onChange={(e) =>
                            setUnitSheetInputs((prev) => ({ ...prev, [unit]: e.target.value }))
                          }
                          placeholder={`Tempel URL / ID Google Sheet khusus ${uCfg.shortName}...`}
                          className="min-w-0 flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                        />
                        <button
                          type="submit"
                          disabled={
                            !isGoogleConnected || !unitSheetInputs[unit].trim() || isSyncing
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-[#111815] bg-[#E7EAE7] hover:bg-[#D8DDD8] rounded-lg disabled:opacity-50 whitespace-nowrap"
                        >
                          Hubungkan {uCfg.shortName}
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* UNIFIED MODE (1 Spreadsheet, 4 Tabs) */
            <div className="space-y-4">
              <h3 className="font-display text-base font-bold text-[#111815]">
                Pilih atau Buat 1 Google Spreadsheet (4 Tab)
              </h3>

              {sheetsConfig.spreadsheetId && (
                <div className="p-4 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-medium text-[#4E5651]">File Spreadsheet Terhubung</p>
                    <p className="text-sm font-bold text-[#111815] truncate">
                      {sheetsConfig.spreadsheetTitle || 'Spreadsheet SPMB PP Muttaqin'}
                    </p>
                    <p className="text-xs font-mono text-[#4E5651] truncate">
                      ID: {sheetsConfig.spreadsheetId}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={
                        sheetsConfig.spreadsheetUrl ||
                        `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheetId}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#14532D] bg-white border border-[#14532D]/30 rounded-lg hover:bg-[#14532D]/5 whitespace-nowrap"
                    >
                      <span>Buka Spreadsheet</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={onDisconnectSpreadsheet}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                      <span>Putuskan</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onCreateSpreadsheet}
                  disabled={!isGoogleConnected || isSyncing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg disabled:opacity-50 whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Buat Spreadsheet SPMB Baru</span>
                </button>

                {sheetsConfig.spreadsheetId && (
                  <button
                    type="button"
                    onClick={onSyncNow}
                    disabled={!isGoogleConnected || isSyncing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/15 rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Dua Arah Sekarang'}</span>
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onConnectSpreadsheetId(sheetInput);
                }}
                className="pt-2 space-y-2"
              >
                <label
                  htmlFor="spreadsheet-id-input"
                  className="block text-xs font-semibold text-[#111815]"
                >
                  Tempel URL / ID Google Spreadsheet yang sudah ada:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="spreadsheet-id-input"
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="min-w-0 flex-1 px-3.5 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!isGoogleConnected || !sheetInput.trim() || isSyncing}
                    className="px-4 py-2 text-sm font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
                    Hubungkan &amp; Sync
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Auto-sync toggle */}
          <div className="pt-4 border-t border-[#E2E5E2] flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#111815]">
                Sinkronisasi Otomatis Real-Time (Setiap 15 Detik)
              </p>
              <p className="text-xs text-[#4E5651]">
                Otomatis menyinkronkan data dari Google Sheets dan pendaftar baru selama sesi Admin
                &amp; Google Panitia aktif.
              </p>
            </div>
            <input
              type="checkbox"
              aria-label="Aktifkan sinkronisasi otomatis real-time"
              checked={sheetsConfig.autoSyncEnabled}
              onChange={(e) => onToggleAutoSync(e.target.checked)}
              className="w-5 h-5 accent-[#14532D] cursor-pointer shrink-0"
            />
          </div>
        </div>

        {/* Right: Cara 2 (Cloud Sync 2-Arah Tanpa Firebase · Siap Vercel) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#14532D]">
              <Webhook className="w-5 h-5 shrink-0" />
              <h2 className="font-display text-lg font-bold text-[#111815]">
                Cara 2 · Cloud Sync 2-Arah &amp; Webhook 24/7 (Siap Vercel)
              </h2>
            </div>

            {isPerUnitMode ? (
              <p className="text-xs text-[#4E5651] leading-relaxed">
                Gunakan URL Apps Script utama + link Sheet per jenjang untuk sinkronisasi otomatis.
              </p>
            ) : (
              <p className="text-xs text-[#4E5651] leading-relaxed">
                Sinkronisasi 2 arah langsung ke Google Spreadsheet untuk seluruh perangkat.
              </p>
            )}

            <ol className="text-xs text-[#4E5651] space-y-1 list-decimal pl-4 bg-[#F6F7F6] border border-[#E2E5E2] rounded-xl p-3.5">
              <li>Buka Google Sheet → <strong>Ekstensi &gt; Apps Script</strong> → tempel kode di bawah.</li>
              <li><strong>Terapkan &gt; Aplikasi Web</strong> (Akses: <strong>Siapa saja</strong>) → salin URL <code className="font-mono">/exec</code>.</li>
              <li>Tempel URL <code className="font-mono">/exec</code> di form bawah.</li>
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/15 rounded-lg whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedScript ? 'Kode Tersalin' : 'Salin Kode Apps Script'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowScriptCode((v) => !v)}
                className="px-2 py-2 text-xs font-medium text-[#4E5651] hover:text-[#111815] underline whitespace-nowrap"
              >
                {showScriptCode ? 'Tutup Kode' : 'Lihat Kode'}
              </button>
            </div>

            {showScriptCode && (
              <pre className="p-3 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] text-[11px] font-mono text-[#111815] overflow-x-auto max-h-56 leading-relaxed">
                {APPS_SCRIPT_SNIPPET}
              </pre>
            )}

            {isPerUnitMode ? (
              /* PER-UNIT WEBHOOK FORM */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onPushViaAppsScript({
                    syncMode: 'per_unit',
                    url: appsScriptInput.trim(),
                    unitTargets: buildDraftUnitTargets(),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="apps-script-url"
                    className="block text-xs font-semibold text-[#111815] mb-1.5"
                  >
                    URL Webhook Apps Script Utama (<code className="font-mono">/exec</code>) ·{' '}
                    <span className="font-normal text-[#4E5651]">
                      Bisa dipakai bersama untuk 4 Sheet lembaga
                    </span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="apps-script-url"
                      type="text"
                      inputMode="url"
                      value={appsScriptInput}
                      onChange={(e) => setAppsScriptInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="min-w-0 flex-1 px-3 py-2 text-xs font-mono bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                    />
                    <button
                      type="button"
                      disabled={!appsScriptInput.trim() || isTestingWebhook || isPushingWebhook}
                      onClick={() => void onTestAppsScript(appsScriptInput.trim())}
                      className="px-3 py-2 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg disabled:opacity-50 whitespace-nowrap"
                    >
                      {isTestingWebhook ? 'Menguji...' : 'Tes Webhook Utama'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[#111815]">
                    Target Sheet &amp; Webhook per Lembaga:
                  </p>
                  {UNIT_ORDER.map((unit) => {
                    const uCfg = UNIT_CONFIGS[unit];
                    const effectiveTestHook =
                      unitWebhookInputs[unit].trim() || appsScriptInput.trim();
                    return (
                      <div
                        key={unit}
                        className="p-3 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#111815]">
                            {uCfg.fullName}
                          </span>
                          <span className="text-[11px] font-mono text-[#4E5651]">
                            {stats.byUnit[unit].count} pendaftar
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label
                              htmlFor={`webhook-sheet-${unit}`}
                              className="block text-[11px] font-medium text-[#4E5651] mb-1"
                            >
                              Link / ID Google Sheet {uCfg.shortName}
                            </label>
                            <input
                              id={`webhook-sheet-${unit}`}
                              type="text"
                              value={unitSheetInputs[unit]}
                              onChange={(e) =>
                                setUnitSheetInputs((prev) => ({
                                  ...prev,
                                  [unit]: e.target.value,
                                }))
                              }
                              placeholder={`https://docs.google.com/spreadsheets/d/... (Sheet ${uCfg.shortName})`}
                              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`webhook-url-${unit}`}
                              className="block text-[11px] font-medium text-[#4E5651] mb-1"
                            >
                              URL Webhook Khusus {uCfg.shortName} (opsional jika pakai Webhook Utama
                              di atas)
                            </label>
                            <div className="flex gap-2">
                              <input
                                id={`webhook-url-${unit}`}
                                type="text"
                                inputMode="url"
                                value={unitWebhookInputs[unit]}
                                onChange={(e) =>
                                  setUnitWebhookInputs((prev) => ({
                                    ...prev,
                                    [unit]: e.target.value,
                                  }))
                                }
                                placeholder="https://script.google.com/macros/s/.../exec"
                                className="min-w-0 flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                              />
                              <button
                                type="button"
                                disabled={!effectiveTestHook || isTestingWebhook || isPushingWebhook}
                                onClick={() =>
                                  void onTestAppsScript(
                                    effectiveTestHook,
                                    unitSheetInputs[unit].trim() || undefined,
                                    unit
                                  )
                                }
                                aria-label={`Tes koneksi ${uCfg.shortName}`}
                                className="px-2.5 py-1.5 text-xs font-semibold text-[#111815] bg-[#E7EAE7] hover:bg-[#D8DDD8] rounded-lg disabled:opacity-50 whitespace-nowrap"
                              >
                                Tes
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isTestingWebhook || isPushingWebhook}
                    onClick={() =>
                      onSavePerUnitWebhookConfig({
                        appsScriptUrl: appsScriptInput.trim(),
                        unitTargets: buildDraftUnitTargets(),
                      })
                    }
                    className="px-3.5 py-2 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
                    Simpan Konfigurasi
                  </button>
                  <button
                    type="button"
                    disabled={!hasAnyPerUnitWebhookDraft || isTestingWebhook || isPushingWebhook || isSyncing}
                    onClick={() =>
                      void onPullViaAppsScript({
                        syncMode: 'per_unit',
                        url: appsScriptInput.trim(),
                        unitTargets: buildDraftUnitTargets(),
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/15 rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Tarik &amp; Sinkron 2 Arah</span>
                  </button>
                  <button
                    type="submit"
                    disabled={!hasAnyPerUnitWebhookDraft || isPushingWebhook || isTestingWebhook}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isPushingWebhook
                        ? 'Mengirim Data Tiap Lembaga...'
                        : 'Simpan & Kirim Data ke Sheet Tiap Lembaga'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              /* UNIFIED WEBHOOK FORM */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void onPushViaAppsScript({
                    syncMode: 'unified',
                    url: appsScriptInput.trim(),
                    spreadsheetUrlOrId: sheetInput.trim(),
                  });
                }}
                className="space-y-3"
              >
                <div>
                  <label
                    htmlFor="apps-script-url"
                    className="block text-xs font-semibold text-[#111815] mb-1.5"
                  >
                    URL Web App Google Apps Script (<code className="font-mono">/exec</code>)
                  </label>
                  <input
                    id="apps-script-url"
                    type="text"
                    inputMode="url"
                    value={appsScriptInput}
                    onChange={(e) => setAppsScriptInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="webhook-unified-sheet-id"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Link / ID Google Spreadsheet (opsional jika skrip dibuat lewat Ekstensi &gt;
                    Apps Script)
                  </label>
                  <input
                    id="webhook-unified-sheet-id"
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={!hasWebhook || isTestingWebhook || isPushingWebhook}
                    onClick={() =>
                      void onTestAppsScript(appsScriptInput.trim(), sheetInput.trim() || undefined)
                    }
                    className="px-3 py-2 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
                    {isTestingWebhook ? 'Menguji...' : 'Tes Koneksi'}
                  </button>
                  <button
                    type="button"
                    disabled={isTestingWebhook || isPushingWebhook}
                    onClick={() =>
                      onSaveAppsScriptUrl(appsScriptInput.trim(), sheetInput.trim())
                    }
                    className="px-3 py-2 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
                    Simpan URL
                  </button>
                  <button
                    type="button"
                    disabled={!hasWebhook || isTestingWebhook || isPushingWebhook || isSyncing}
                    onClick={() =>
                      void onPullViaAppsScript({
                        syncMode: 'unified',
                        url: appsScriptInput.trim(),
                        spreadsheetUrlOrId: sheetInput.trim(),
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/15 rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Menarik...' : 'Tarik & Sinkron 2 Arah'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!hasWebhook || isPushingWebhook || isTestingWebhook}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isPushingWebhook
                      ? 'Mengirim Data ke 4 Halaman Sheet...'
                      : `Simpan & Kirim Data (${stats.totalCount}) ke 4 Halaman Sheet`}
                  </span>
                </button>
              </form>
            )}

            {/* Real-time Cloud Auto-Sync Toggle */}
            <div className="pt-3 border-t border-[#E2E5E2] flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#111815]">
                  Mode Sync Real-Time Lintas Perangkat
                </p>
                <p className="text-[11px] text-[#4E5651]">
                  Otomatis menyinkronkan pendaftar &amp; perubahan seleksi setiap 12–15 detik via
                  Spreadsheet.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Aktifkan mode sync real-time lintas perangkat"
                checked={sheetsConfig.autoSyncEnabled}
                onChange={(e) => onToggleAutoSync(e.target.checked)}
                className="w-5 h-5 accent-[#14532D] cursor-pointer shrink-0"
              />
            </div>
          </div>

          {/* Vercel Cross-Device Deployment Card */}
          <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2 text-[#14532D]">
                <Globe className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
                <h2 className="font-display text-base font-bold text-[#111815]">
                  Samakan Data di Semua Perangkat (Vercel)
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasShareableWebhook && (
                  <button
                    type="button"
                    onClick={handleCopyShareSyncLink}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg whitespace-nowrap"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedShareLink ? 'Link Tersalin' : 'Salin Link Tersinkron'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyVercelEnv}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/15 rounded-lg whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedVercelEnv ? 'Env Tersalin' : 'Salin Env Vercel'}</span>
                </button>
              </div>
            </div>

            {isGlobalSynced ? (
              <div className="p-3 rounded-xl bg-[#14532D]/5 border border-[#14532D]/20 text-xs text-[#111815] leading-relaxed">
                <strong>Spreadsheet Utama Terkunci Global ({sheetsConfig.spreadsheetTitle || 'SPMB 2027'}):</strong>{' '}
                Semua perangkat (HP, tablet, laptop) yang membuka link Vercel ini otomatis
                terhubung ke Google Spreadsheet utama yang sama dan sinkron real-time tanpa perlu
                pengaturan ulang per perangkat.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Mengapa HP/laptop lain datanya masih berbeda?</strong>{' '}
                Menyimpan URL Webhook di form atas hanya tersimpan di browser ini. Agar{' '}
                <strong>semua perangkat otomatis sama</strong> saat membuka link Vercel utama,
                masukkan variabel di bawah ke{' '}
                <strong>Vercel → Settings → Environment Variables</strong> lalu klik{' '}
                <strong>Redeploy</strong> (atau bagikan <em>Link Tersinkron</em> di atas).
              </div>
            )}

            <p className="text-xs text-[#4E5651] leading-relaxed">
              Referensi Environment Variables <strong>Vercel (Settings → Environment Variables)</strong>{' '}
              jika suatu saat panitia ingin mengganti target Spreadsheet utama tanpa mengubah kode:
            </p>
            <pre className="p-3 rounded-xl bg-[#F6F7F6] border border-[#E2E5E2] text-[11px] font-mono text-[#111815] overflow-x-auto leading-relaxed">
              {vercelEnvSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
