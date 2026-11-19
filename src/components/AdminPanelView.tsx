import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Eye,
  Lock,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type {
  CustomFieldDefinition,
  CustomFieldType,
  DashboardStats,
  FormSchemaConfig,
  ProfileGalleryConfig,
  RegistrationRecord,
  SelectionStatus,
  SheetsPublicConfig,
  SheetsSyncMode,
  StandardFormFieldKey,
  UnitId,
  UnitSheetsTarget,
} from '../types/spmb.ts';
import {
  getDefaultRequiredFields,
  isGenderSplitQuotaUnit,
  resolveUnitQuotaTargets,
  resolveUnitRequiredFields,
  STANDARD_FORM_FIELD_GROUPS,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from '../utils/spmbLogic.ts';
import { downloadRegistrationPdf } from '../utils/pdfGenerator.ts';
import { SheetsSyncView } from './SheetsSyncView.tsx';
import { CommitteeSelectionView } from './CommitteeSelectionView.tsx';
import { AdminAnalyticsView } from './AdminAnalyticsView.tsx';
import { AdminProfilePhotosView } from './AdminProfilePhotosView.tsx';

interface AdminPanelViewProps {
  isAdmin: boolean;
  adminLoginError: string;
  isLoggingInAdmin: boolean;
  onAdminLogin: (password: string) => Promise<void>;
  onAdminLogout: () => void;
  formConfig: FormSchemaConfig;
  onSaveFormConfig: (nextConfig: FormSchemaConfig) => Promise<void>;
  profileGallery: ProfileGalleryConfig;
  onSaveProfileGallery: (nextGallery: ProfileGalleryConfig) => Promise<void>;
  registrations: RegistrationRecord[];
  stats: DashboardStats;
  onPreviewRecord: (record: RegistrationRecord) => void;
  onEditRecord: (record: RegistrationRecord) => void;
  onToggleVerifyRecord: (record: RegistrationRecord) => void;
  onSaveSelection: (
    recordId: string,
    payload: {
      statusSeleksi: SelectionStatus;
      nilaiSeleksi: string;
      catatanSeleksi: string;
      statusVerifikasi: 'Menunggu Verifikasi Berkas' | 'Terverifikasi Panitia';
    }
  ) => Promise<void>;
  onRequestDeleteRecord: (record: RegistrationRecord) => void;
  // Google Sheets props
  googleUser: User | null;
  hasAccessToken: boolean;
  authModeLabel: string;
  isLoggingInGoogle: boolean;
  isSyncing: boolean;
  isTestingWebhook: boolean;
  isPushingWebhook: boolean;
  syncMessage: string;
  syncError: string;
  sheetsConfig: SheetsPublicConfig;
  hasGlobalCloudConfig?: boolean;
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

type AdminSubTab = 'analytics' | 'fields' | 'photos' | 'applicants' | 'selection' | 'sheets';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  isAdmin,
  adminLoginError,
  isLoggingInAdmin,
  onAdminLogin,
  onAdminLogout,
  formConfig,
  onSaveFormConfig,
  profileGallery,
  onSaveProfileGallery,
  registrations,
  stats,
  onPreviewRecord,
  onEditRecord,
  onToggleVerifyRecord,
  onSaveSelection,
  onRequestDeleteRecord,
  googleUser,
  hasAccessToken,
  authModeLabel,
  isLoggingInGoogle,
  isSyncing,
  isTestingWebhook,
  isPushingWebhook,
  syncMessage,
  syncError,
  sheetsConfig,
  hasGlobalCloudConfig,
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
  const [passwordInput, setPasswordInput] = useState('');
  const [subTab, setSubTab] = useState<AdminSubTab>('analytics');

  // Form Schema Editor state
  const [editingUnit, setEditingUnit] = useState<UnitId>('RA_TK');
  const [draftConfig, setDraftConfig] = useState<FormSchemaConfig>(() =>
    structuredClone(formConfig)
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState('');
  const [configError, setConfigError] = useState('');

  // Add new custom field inputs
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<CustomFieldType>('text');
  const [newRequired, setNewRequired] = useState(true);
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [newOptionsText, setNewOptionsText] = useState('');
  const [newDocText, setNewDocText] = useState('');

  // Standard field required/optional toggle UI state
  const [reqSearchQuery, setReqSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    student_identity: true,
  });

  // Applicant table filters
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitId>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDraftConfig(structuredClone(formConfig));
  }, [formConfig]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registrations.filter((r) => {
      if (unitFilter !== 'ALL' && r.unit !== unitFilter) return false;
      if (!q) return true;
      return (
        r.namaLengkap.toLowerCase().includes(q) ||
        r.noPendaftaran.toLowerCase().includes(q) ||
        r.noWhatsapp.includes(q) ||
        r.namaAyah.toLowerCase().includes(q) ||
        r.namaIbu.toLowerCase().includes(q)
      );
    });
  }, [registrations, unitFilter, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-4 sm:py-8">
        <div className="bg-white border border-[#E2E5E2] rounded-2xl p-5 sm:p-7 space-y-5">
          <div className="space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-[#14532D]/10 text-[#14532D] flex items-center justify-center mb-2">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111815]">
              Login Admin Panitia
            </h1>
            <p className="text-sm text-[#4E5651]">
              Masuk untuk mengelola data pendaftar dan pengaturan formulir.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onAdminLogin(passwordInput);
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-xs font-semibold text-[#111815] mb-1.5"
              >
                Kata Sandi Admin
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan kata sandi panitia"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
              />
            </div>

            {adminLoginError && (
              <p
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {adminLoginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingInAdmin || !passwordInput.trim()}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoggingInAdmin ? 'Memeriksa...' : 'Masuk Menu Khusus Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activeDraft = draftConfig[editingUnit];

  const updateUnitDraft = (updater: (curr: typeof activeDraft) => typeof activeDraft) => {
    setDraftConfig((prev) => ({
      ...prev,
      [editingUnit]: updater(prev[editingUnit]),
    }));
    setConfigFeedback('');
    setConfigError('');
  };

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newLabel.trim();
    if (!cleanLabel) {
      setConfigError('Ketik nama/label keperluan data terlebih dahulu.');
      return;
    }

    const parsedOptions =
      newType === 'select'
        ? newOptionsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (newType === 'select' && (!parsedOptions || parsedOptions.length === 0)) {
      setConfigError('Untuk tipe Pilihan Dropdown, isi minimal satu opsi dipisahkan koma.');
      return;
    }

    const slug = cleanLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const fieldId = `${slug || 'kolom'}_${Date.now().toString(36)}`;

    const newField: CustomFieldDefinition = {
      id: fieldId,
      label: cleanLabel,
      type: newType,
      required: newRequired,
      placeholder: newPlaceholder.trim() || undefined,
      options: parsedOptions,
    };

    updateUnitDraft((curr) => ({
      ...curr,
      fields: [...curr.fields, newField],
    }));

    setNewLabel('');
    setNewType('text');
    setNewRequired(true);
    setNewPlaceholder('');
    setNewOptionsText('');
  };

  const handleUpdateField = (
    index: number,
    patch: Partial<CustomFieldDefinition>
  ) => {
    updateUnitDraft((curr) => {
      const nextFields = [...curr.fields];
      nextFields[index] = { ...nextFields[index], ...patch };
      return { ...curr, fields: nextFields };
    });
  };

  const handleMoveField = (index: number, dir: -1 | 1) => {
    updateUnitDraft((curr) => {
      const target = index + dir;
      if (target < 0 || target >= curr.fields.length) return curr;
      const nextFields = [...curr.fields];
      const [moved] = nextFields.splice(index, 1);
      nextFields.splice(target, 0, moved);
      return { ...curr, fields: nextFields };
    });
  };

  const handleDeleteField = (index: number) => {
    updateUnitDraft((curr) => ({
      ...curr,
      fields: curr.fields.filter((_, i) => i !== index),
    }));
  };

  const handleAddDoc = () => {
    const clean = newDocText.trim();
    if (!clean) return;
    updateUnitDraft((curr) => ({
      ...curr,
      requiredDocs: [...curr.requiredDocs, clean],
    }));
    setNewDocText('');
  };

  const handleDeleteDoc = (idx: number) => {
    updateUnitDraft((curr) => ({
      ...curr,
      requiredDocs: curr.requiredDocs.filter((_, i) => i !== idx),
    }));
  };

  const activeRequiredMap = resolveUnitRequiredFields(editingUnit, activeDraft);
  const allStandardFieldsCount = STANDARD_FORM_FIELD_GROUPS.reduce(
    (sum, group) => sum + group.fields.length,
    0
  );
  const requiredStandardFieldsCount = STANDARD_FORM_FIELD_GROUPS.reduce(
    (sum, group) =>
      sum + group.fields.filter((field) => activeRequiredMap[field.key]).length,
    0
  );
  const optionalStandardFieldsCount = allStandardFieldsCount - requiredStandardFieldsCount;

  const handleToggleStandardFieldRequired = (
    key: StandardFormFieldKey,
    nextRequired: boolean
  ) => {
    updateUnitDraft((curr) => ({
      ...curr,
      requiredFields: {
        ...resolveUnitRequiredFields(editingUnit, curr),
        [key]: nextRequired,
      },
    }));
  };

  const handleToggleGroupRequired = (groupId: string, nextRequired: boolean) => {
    const group = STANDARD_FORM_FIELD_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    updateUnitDraft((curr) => {
      const nextMap = { ...resolveUnitRequiredFields(editingUnit, curr) };
      for (const field of group.fields) {
        if (!field.lockedRequired) {
          nextMap[field.key] = nextRequired;
        }
      }
      return {
        ...curr,
        requiredFields: nextMap,
      };
    });
  };

  const handleSetAllStandardRequired = () => {
    updateUnitDraft((curr) => {
      const nextMap = { ...resolveUnitRequiredFields(editingUnit, curr) };
      for (const group of STANDARD_FORM_FIELD_GROUPS) {
        for (const field of group.fields) {
          nextMap[field.key] = true;
        }
      }
      return {
        ...curr,
        requiredFields: nextMap,
      };
    });
  };

  const handleResetDefaultRequired = () => {
    updateUnitDraft((curr) => ({
      ...curr,
      requiredFields: getDefaultRequiredFields(editingUnit),
    }));
  };

  const handleApplyRequiredToAllUnits = () => {
    const templateMap = resolveUnitRequiredFields(editingUnit, activeDraft);
    setDraftConfig((prev) => {
      const next = structuredClone(prev);
      for (const u of UNIT_ORDER) {
        next[u] = {
          ...next[u],
          requiredFields: { ...templateMap },
        };
      }
      return next;
    });
    setConfigError('');
    setConfigFeedback(
      `Pengaturan kolom wajib/opsional dari ${UNIT_CONFIGS[editingUnit].shortName} diterapkan ke draf semua jenjang. Klik "Simpan Keperluan Data" untuk mengaktifkan.`
    );
  };

  const handleSaveAllConfig = async () => {
    for (const u of UNIT_ORDER) {
      if (isGenderSplitQuotaUnit(u)) {
        const qPutra = Math.max(0, Number(draftConfig[u].quotaPutra ?? 0));
        const qPutri = Math.max(0, Number(draftConfig[u].quotaPutri ?? 0));
        if (qPutra + qPutri < 1) {
          setEditingUnit(u);
          setConfigError(
            `Total kuota Putra dan Putri untuk ${UNIT_CONFIGS[u].shortName} minimal harus 1 kursi.`
          );
          return;
        }
      }
    }

    setIsSavingConfig(true);
    setConfigFeedback('');
    setConfigError('');
    try {
      await onSaveFormConfig(draftConfig);
      setConfigFeedback(
        `Keperluan data & kuota ${UNIT_CONFIGS[editingUnit].shortName} berhasil disimpan dan langsung aktif untuk pendaftar.`
      );
    } catch (err) {
      setConfigError(
        err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi formulir.'
      );
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#14532D] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-2xl font-bold text-[#111815]">
              Menu Admin SPMB
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div
            role="tablist"
            aria-label="Menu Admin"
            className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-1 p-1 bg-[#F2F4F2] rounded-lg"
          >
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'analytics'}
              onClick={() => setSubTab('analytics')}
              className={`col-span-2 sm:col-span-1 px-3 py-1.5 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors ${
                subTab === 'analytics'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Dashboard Admin
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'fields'}
              onClick={() => setSubTab('fields')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors ${
                subTab === 'fields'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Keperluan Data Pendaftar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'photos'}
              onClick={() => setSubTab('photos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors tabular-nums ${
                subTab === 'photos'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Foto Profil{profileGallery.slides.length > 0 ? ` (${profileGallery.slides.length})` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'applicants'}
              onClick={() => setSubTab('applicants')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors tabular-nums ${
                subTab === 'applicants'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Kelola Pendaftar ({stats.totalCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'selection'}
              onClick={() => setSubTab('selection')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors ${
                subTab === 'selection'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Menu Panitia (Seleksi)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'sheets'}
              onClick={() => setSubTab('sheets')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md text-center whitespace-nowrap transition-colors ${
                subTab === 'sheets'
                  ? 'bg-white text-[#14532D] shadow-xs'
                  : 'text-[#4E5651] hover:text-[#111815]'
              }`}
            >
              Google Sheets
            </button>
          </div>

          <button
            type="button"
            onClick={onAdminLogout}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 0: Dashboard Admin (Rekap Terpisah TK, SD, SMP, SMA) */}
      {subTab === 'analytics' && (
        <AdminAnalyticsView registrations={registrations} formConfig={formConfig} />
      )}

      {/* Sub-tab: Foto Profil Lembaga (Slideshow) */}
      {subTab === 'photos' && (
        <AdminProfilePhotosView
          profileGallery={profileGallery}
          onSaveProfileGallery={onSaveProfileGallery}
        />
      )}

      {/* Sub-tab 1: Keperluan Data / Form Builder */}
      {subTab === 'fields' && (
        <div className="space-y-6">
          {/* Unit Switcher + Save */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-[#E7EAE7] rounded-lg overflow-x-auto">
              {UNIT_ORDER.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    setEditingUnit(u);
                    setConfigFeedback('');
                    setConfigError('');
                  }}
                  className={`px-4 py-2 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                    editingUnit === u
                      ? 'bg-white text-[#14532D] shadow-xs'
                      : 'text-[#4E5651] hover:text-[#111815]'
                  }`}
                >
                  {UNIT_CONFIGS[u].shortName}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleSaveAllConfig()}
              disabled={isSavingConfig}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg whitespace-nowrap disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingConfig ? 'Menyimpan...' : 'Simpan Keperluan Data'}</span>
            </button>
          </div>

          {configFeedback && (
            <div
              role="status"
              className="flex items-center gap-2 p-4 rounded-xl bg-[#14532D]/10 border border-[#14532D]/25 text-sm text-[#14532D] font-medium"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{configFeedback}</span>
            </div>
          )}

          {configError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
            >
              {configError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Active Fields List + Unit Settings */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-5">
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E2E5E2]">
                  <h2 className="font-display text-lg font-bold text-[#111815]">
                    Pengaturan Formulir — {UNIT_CONFIGS[editingUnit].fullName}
                  </h2>
                </div>

                {/* Quota & Instruction */}
                {isGenderSplitQuotaUnit(editingUnit) ? (
                  <div className="space-y-4 pb-4 border-b border-[#EFF1EF]">
                    {(() => {
                      const resolved = resolveUnitQuotaTargets(editingUnit, activeDraft);
                      const putraVal = activeDraft.quotaPutra ?? resolved.quotaPutra ?? 60;
                      const putriVal = activeDraft.quotaPutri ?? resolved.quotaPutri ?? 60;
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label
                              htmlFor="admin-quota-putra-input"
                              className="block text-xs font-semibold text-[#111815] mb-1"
                            >
                              Kuota Putra ({UNIT_CONFIGS[editingUnit].shortName})
                            </label>
                            <input
                              id="admin-quota-putra-input"
                              type="number"
                              min={0}
                              value={putraVal}
                              onChange={(e) => {
                                const parsed = Number.parseInt(e.target.value || '0', 10);
                                const nextPutra = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                updateUnitDraft((curr) => {
                                  const currPutri = curr.quotaPutri ?? putriVal;
                                  return {
                                    ...curr,
                                    quotaPutra: nextPutra,
                                    quotaPutri: currPutri,
                                    quota: Math.max(1, nextPutra + currPutri),
                                  };
                                });
                              }}
                              className="w-full px-3 py-2 text-sm font-mono bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="admin-quota-putri-input"
                              className="block text-xs font-semibold text-[#111815] mb-1"
                            >
                              Kuota Putri ({UNIT_CONFIGS[editingUnit].shortName})
                            </label>
                            <input
                              id="admin-quota-putri-input"
                              type="number"
                              min={0}
                              value={putriVal}
                              onChange={(e) => {
                                const parsed = Number.parseInt(e.target.value || '0', 10);
                                const nextPutri = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                                updateUnitDraft((curr) => {
                                  const currPutra = curr.quotaPutra ?? putraVal;
                                  return {
                                    ...curr,
                                    quotaPutra: currPutra,
                                    quotaPutri: nextPutri,
                                    quota: Math.max(1, currPutra + nextPutri),
                                  };
                                });
                              }}
                              className="w-full px-3 py-2 text-sm font-mono bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                            />
                          </div>

                          <div className="px-3.5 py-2 rounded-lg bg-[#F6F7F6] border border-[#E2E5E2] flex flex-col justify-center">
                            <span className="text-[11px] font-medium text-[#4E5651]">
                              Total Kuota {UNIT_CONFIGS[editingUnit].shortName}
                            </span>
                            <span className="text-sm font-mono font-bold text-[#14532D] tabular-nums">
                              {putraVal + putriVal} kursi
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <label
                        htmlFor="admin-instructions-input"
                        className="block text-xs font-semibold text-[#111815] mb-1"
                      >
                        Catatan / Arahan untuk Pendaftar
                      </label>
                      <input
                        id="admin-instructions-input"
                        type="text"
                        value={activeDraft.instructions}
                        onChange={(e) =>
                          updateUnitDraft((curr) => ({ ...curr, instructions: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-4 border-b border-[#EFF1EF]">
                    <div>
                      <label
                        htmlFor="admin-quota-input"
                        className="block text-xs font-semibold text-[#111815] mb-1"
                      >
                        Kuota Kursi
                      </label>
                      <input
                        id="admin-quota-input"
                        type="number"
                        min={1}
                        value={activeDraft.quota}
                        onChange={(e) =>
                          updateUnitDraft((curr) => ({
                            ...curr,
                            quota: Math.max(1, Number.parseInt(e.target.value || '1', 10)),
                          }))
                        }
                        className="w-full px-3 py-2 text-sm font-mono bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="admin-instructions-input"
                        className="block text-xs font-semibold text-[#111815] mb-1"
                      >
                        Catatan / Arahan untuk Pendaftar
                      </label>
                      <input
                        id="admin-instructions-input"
                        type="text"
                        value={activeDraft.instructions}
                        onChange={(e) =>
                          updateUnitDraft((curr) => ({ ...curr, instructions: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                      />
                    </div>
                  </div>
                )}

                {/* Editable Field Rows */}
                <div className="space-y-3">
                  {activeDraft.fields.length === 0 ? (
                    <p className="text-sm text-[#4E5651] py-6 text-center border border-dashed border-[#D4D9D4] rounded-xl">
                      Belum ada kolom khusus. Tambahkan keperluan data baru di panel sebelah kanan.
                    </p>
                  ) : (
                    activeDraft.fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className="p-4 rounded-xl bg-[#F9FAF9] border border-[#E2E5E2] space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-mono text-[#4E5651]">
                            #{idx + 1} · Tipe: {field.type}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, -1)}
                              disabled={idx === 0}
                              aria-label={`Naikkan ${field.label}`}
                              className="p-1.5 text-[#4E5651] hover:text-[#111815] disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 1)}
                              disabled={idx === activeDraft.fields.length - 1}
                              aria-label={`Turunkan ${field.label}`}
                              className="p-1.5 text-[#4E5651] hover:text-[#111815] disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteField(idx)}
                              aria-label={`Hapus kolom ${field.label}`}
                              className="p-1.5 text-[#4E5651] hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#4E5651] mb-1">
                              Nama / Label Keperluan Data
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#4E5651] mb-1">
                              Tipe Input
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                handleUpdateField(idx, {
                                  type: e.target.value as CustomFieldType,
                                  options:
                                    e.target.value === 'select'
                                      ? field.options && field.options.length > 0
                                        ? field.options
                                        : ['Pilihan 1', 'Pilihan 2']
                                      : undefined,
                                })
                              }
                              className="w-full px-3 py-1.5 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                            >
                              <option value="text">Teks Singkat</option>
                              <option value="textarea">Paragraf / Uraian</option>
                              <option value="number">Angka</option>
                              <option value="select">Pilihan Dropdown</option>
                              <option value="date">Tanggal</option>
                            </select>
                          </div>

                          {field.type === 'select' ? (
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-[#4E5651] mb-1">
                                Daftar Pilihan (pisahkan dengan koma)
                              </label>
                              <input
                                type="text"
                                value={(field.options || []).join(', ')}
                                onChange={(e) =>
                                  handleUpdateField(idx, {
                                    options: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                className="w-full px-3 py-1.5 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                              />
                            </div>
                          ) : (
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-[#4E5651] mb-1">
                                Contoh Pengisian (Placeholder)
                              </label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) =>
                                  handleUpdateField(idx, { placeholder: e.target.value })
                                }
                                className="w-full px-3 py-1.5 text-sm bg-white border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                              />
                            </div>
                          )}
                        </div>

                        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#111815] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              handleUpdateField(idx, { required: e.target.checked })
                            }
                            className="w-4 h-4 accent-[#14532D]"
                          />
                          <span>Wajib diisi oleh pendaftar</span>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Standard Fields Required / Optional Matrix */}
              <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#E2E5E2]">
                  <div className="space-y-0.5">
                    <h2 className="font-display text-lg font-bold text-[#111815]">
                      Kolom Wajib &amp; Tidak Wajib
                    </h2>
                    <p className="text-xs text-[#4E5651]">
                      Atur kolom wajib diisi untuk pendaftar {UNIT_CONFIGS[editingUnit].shortName}.
                    </p>
                  </div>

                  <div className="text-xs font-mono font-semibold text-[#14532D] bg-[#F2F4F2] border border-[#E2E5E2] rounded-lg px-3 py-1.5 whitespace-nowrap tabular-nums">
                    {requiredStandardFieldsCount} Wajib · {optionalStandardFieldsCount} Tidak Wajib
                  </div>
                </div>

                {/* Search + Bulk Actions */}
                <div className="space-y-2.5">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-[#4E5651] absolute left-3 top-1/2 -translate-y-1/2" />
                    <label htmlFor="admin-field-req-search" className="sr-only">
                      Cari kolom formulir standar
                    </label>
                    <input
                      id="admin-field-req-search"
                      type="text"
                      value={reqSearchQuery}
                      onChange={(e) => setReqSearchQuery(e.target.value)}
                      placeholder="Cari kolom formulir (contoh: NIK, Foto, Email)..."
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSetAllStandardRequired}
                      className="px-3 py-1.5 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg whitespace-nowrap"
                    >
                      Wajibkan Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDefaultRequired}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Default</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyRequiredToAllUnits}
                      className="px-3 py-1.5 text-xs font-semibold text-[#14532D] bg-[#14532D]/10 hover:bg-[#14532D]/15 rounded-lg whitespace-nowrap"
                    >
                      Terapkan ke Semua Jenjang
                    </button>
                  </div>
                </div>

                {/* Collapsible Section Groups */}
                <div className="space-y-3">
                  {(() => {
                    const q = reqSearchQuery.trim().toLowerCase();
                    const visibleGroups = STANDARD_FORM_FIELD_GROUPS.map((group) => ({
                      ...group,
                      matchingFields: q
                        ? group.fields.filter(
                            (f) =>
                              f.label.toLowerCase().includes(q) ||
                              (f.hint && f.hint.toLowerCase().includes(q)) ||
                              group.title.toLowerCase().includes(q)
                          )
                        : group.fields,
                    })).filter((g) => g.matchingFields.length > 0);

                    if (visibleGroups.length === 0) {
                      return (
                        <p className="text-xs text-[#4E5651] py-6 text-center border border-dashed border-[#D4D9D4] rounded-xl">
                          Tidak ada kolom formulir yang cocok dengan pencarian &ldquo;{reqSearchQuery}&rdquo;.
                        </p>
                      );
                    }

                    return visibleGroups.map((group) => {
                      const isExpanded = Boolean(q) || Boolean(expandedGroups[group.id]);
                      const groupReqCount = group.fields.filter(
                        (f) => activeRequiredMap[f.key]
                      ).length;

                      return (
                        <div
                          key={group.id}
                          className="rounded-xl border border-[#E2E5E2] bg-[#F9FAF9] overflow-hidden"
                        >
                          <div className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F4F6F4] border-b border-[#E2E5E2]">
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              onClick={() =>
                                setExpandedGroups((prev) => ({
                                  ...prev,
                                  [group.id]: !prev[group.id],
                                }))
                              }
                              className="flex items-center gap-2 text-left min-w-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#14532D] shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-[#4E5651] shrink-0" />
                              )}
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-xs sm:text-sm font-bold text-[#111815]">
                                  {group.title}
                                </span>
                                <span className="text-[11px] font-mono text-[#14532D] whitespace-nowrap tabular-nums">
                                  ({groupReqCount}/{group.fields.length} Wajib)
                                </span>
                              </span>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleGroupRequired(group.id, true)}
                                className="px-2 py-1 text-[11px] font-semibold text-[#14532D] bg-white border border-[#D4D9D4] hover:border-[#14532D] rounded-md whitespace-nowrap"
                              >
                                Wajibkan Bagian
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleGroupRequired(group.id, false)}
                                className="px-2 py-1 text-[11px] font-semibold text-[#4E5651] bg-white border border-[#D4D9D4] hover:text-[#111815] rounded-md whitespace-nowrap"
                              >
                                Opsionalkan Bagian
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {group.matchingFields.map((field) => {
                                const isReq = activeRequiredMap[field.key];
                                const checkboxId = `req-field-${field.key}`;
                                return (
                                  <div
                                    key={field.key}
                                    className={`p-2.5 rounded-lg border bg-white flex items-start justify-between gap-2.5 ${
                                      isReq ? 'border-[#D4D9D4]' : 'border-[#E2E5E2] bg-[#FCFDFC]'
                                    }`}
                                  >
                                    <label
                                      htmlFor={checkboxId}
                                      className={`flex items-start gap-2.5 min-w-0 flex-1 ${
                                        field.lockedRequired ? 'cursor-not-allowed' : 'cursor-pointer'
                                      }`}
                                    >
                                      <input
                                        id={checkboxId}
                                        type="checkbox"
                                        checked={isReq}
                                        disabled={Boolean(field.lockedRequired)}
                                        onChange={(e) =>
                                          handleToggleStandardFieldRequired(
                                            field.key,
                                            e.target.checked
                                          )
                                        }
                                        className="w-4 h-4 mt-0.5 accent-[#14532D] shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-xs font-semibold text-[#111815] leading-snug">
                                          {field.label}
                                        </p>
                                        {field.hint && (
                                          <p className="text-[11px] text-[#4E5651] leading-snug mt-0.5">
                                            {field.hint}
                                          </p>
                                        )}
                                      </div>
                                    </label>

                                    <span
                                      className={`text-[11px] font-semibold whitespace-nowrap shrink-0 pt-0.5 ${
                                        field.lockedRequired
                                          ? 'text-[#14532D]'
                                          : isReq
                                            ? 'text-[#14532D]'
                                            : 'text-[#6A736D]'
                                      }`}
                                    >
                                      {field.lockedRequired
                                        ? 'Wajib Utama'
                                        : isReq
                                          ? 'Wajib'
                                          : 'Tidak Wajib'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="pt-2 border-t border-[#E2E5E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-[11px] text-[#4E5651]">
                    Kolom <strong className="text-[#14532D]">Wajib Utama</strong> selalu aktif.
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSaveAllConfig()}
                    disabled={isSavingConfig}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg whitespace-nowrap disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingConfig ? 'Menyimpan...' : 'Simpan Keperluan Data'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Add New Field & Required Docs */}
            <div className="lg:col-span-5 space-y-6">
              <form
                onSubmit={handleAddField}
                className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-4"
              >
                <h3 className="font-display text-lg font-bold text-[#111815]">
                  + Tambah Kolom Baru
                </h3>

                <div>
                  <label
                    htmlFor="new-field-label"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Nama Keperluan Data <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="new-field-label"
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Contoh: Ukuran Seragam Olahraga"
                    className="w-full px-3 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-field-type"
                    className="block text-xs font-semibold text-[#111815] mb-1"
                  >
                    Jenis Kolom Isian
                  </label>
                  <select
                    id="new-field-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as CustomFieldType)}
                    className="w-full px-3 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                  >
                    <option value="text">Teks Singkat</option>
                    <option value="textarea">Paragraf / Uraian</option>
                    <option value="number">Angka</option>
                    <option value="select">Pilihan Dropdown</option>
                    <option value="date">Tanggal</option>
                  </select>
                </div>

                {newType === 'select' ? (
                  <div>
                    <label
                      htmlFor="new-field-options"
                      className="block text-xs font-semibold text-[#111815] mb-1"
                    >
                      Opsi Pilihan (pisahkan dengan koma)
                    </label>
                    <input
                      id="new-field-options"
                      type="text"
                      value={newOptionsText}
                      onChange={(e) => setNewOptionsText(e.target.value)}
                      placeholder="Contoh: S, M, L, XL"
                      className="w-full px-3 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="new-field-placeholder"
                      className="block text-xs font-semibold text-[#111815] mb-1"
                    >
                      Contoh Pengisian (opsional)
                    </label>
                    <input
                      id="new-field-placeholder"
                      type="text"
                      value={newPlaceholder}
                      onChange={(e) => setNewPlaceholder(e.target.value)}
                      placeholder="Contoh: Isi ukuran seragam"
                      className="w-full px-3 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
                    />
                  </div>
                )}

                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#111815] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRequired}
                    onChange={(e) => setNewRequired(e.target.checked)}
                    className="w-4 h-4 accent-[#14532D]"
                  />
                  <span>Wajib diisi oleh pendaftar</span>
                </label>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-[#14532D] hover:bg-[#114626] rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan ke Formulir {UNIT_CONFIGS[editingUnit].shortName}</span>
                </button>
              </form>

              {/* Required Physical Docs Editor */}
              <div className="bg-white border border-[#E2E5E2] rounded-2xl p-4 sm:p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-[#111815]">
                  Berkas Daftar Ulang
                </h3>
                <ul className="space-y-2 text-xs text-[#4E5651]">
                  {activeDraft.requiredDocs.map((docItem, idx) => (
                    <li
                      key={`${docItem}-${idx}`}
                      className="flex items-center justify-between gap-2 bg-[#F9FAF9] border border-[#E2E5E2] rounded-lg px-3 py-2"
                    >
                      <span>{docItem}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(idx)}
                        aria-label={`Hapus berkas ${docItem}`}
                        className="text-[#4E5651] hover:text-red-700 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    placeholder="Tambah syarat berkas baru..."
                    className="min-w-0 flex-1 px-3 py-2 text-xs bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D]"
                  />
                  <button
                    type="button"
                    onClick={handleAddDoc}
                    className="px-3 py-2 text-xs font-semibold text-[#111815] bg-[#F2F4F2] hover:bg-[#E7EAE7] rounded-lg whitespace-nowrap"
                  >
                    + Berkas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Admin Applicant Management */}
      {subTab === 'applicants' && (
        <section className="bg-white border border-[#E2E5E2] rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E2E5E2] flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
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
                Semua ({stats.totalCount})
              </button>
              {UNIT_ORDER.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnitFilter(u)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors tabular-nums ${
                    unitFilter === u
                      ? 'bg-white text-[#14532D] shadow-xs'
                      : 'text-[#4E5651] hover:text-[#111815]'
                  }`}
                >
                  {UNIT_CONFIGS[u].shortName} ({stats.byUnit[u].count})
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-[#4E5651] absolute left-3 top-1/2 -translate-y-1/2" />
              <label htmlFor="admin-search" className="sr-only">
                Cari pendaftar
              </label>
              <input
                id="admin-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, no. pendaftaran, atau WA..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#F9FAF9] border border-[#D4D9D4] rounded-lg focus:outline-none focus:border-[#14532D] focus:bg-white"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F6F7F6] border-b border-[#E2E5E2] text-xs font-semibold text-[#4E5651]">
                  <th className="py-3 px-4 whitespace-nowrap">No. Pendaftaran</th>
                  <th className="py-3 px-4 whitespace-nowrap">Lembaga</th>
                  <th className="py-3 px-4 whitespace-nowrap">Nama Calon Murid</th>
                  <th className="py-3 px-4 whitespace-nowrap">Orang Tua / WA</th>
                  <th className="py-3 px-4 whitespace-nowrap">Verifikasi</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E5E2] text-sm">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#F9FAF9]">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#14532D] whitespace-nowrap tabular-nums">
                      {record.noPendaftaran}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#111815] whitespace-nowrap">
                      {UNIT_CONFIGS[record.unit].shortName}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[#111815]">{record.namaLengkap}</p>
                      <p className="text-xs text-[#4E5651]">
                        {record.jenisKelamin} · {record.jalurPendaftaran}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-medium text-[#111815]">
                        {record.namaAyah || record.namaIbu || '-'}
                      </p>
                      <p className="text-xs font-mono text-[#4E5651] tabular-nums">
                        {record.noWhatsapp || record.noHpAyah || record.noHpIbu || '-'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onToggleVerifyRecord(record)}
                        className={`font-semibold hover:underline ${
                          record.statusVerifikasi === 'Terverifikasi Panitia'
                            ? 'text-[#14532D]'
                            : 'text-[#926C15]'
                        }`}
                      >
                        {record.statusVerifikasi}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onPreviewRecord(record)}
                          aria-label={`Lihat bukti ${record.namaLengkap}`}
                          className="p-1.5 text-[#4E5651] hover:text-[#14532D] hover:bg-[#F2F4F2] rounded-md"
                          title="Lihat Bukti"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void downloadRegistrationPdf(record, formConfig[record.unit])
                          }
                          aria-label={`Unduh PDF ${record.namaLengkap}`}
                          className="p-1.5 text-[#4E5651] hover:text-[#14532D] hover:bg-[#F2F4F2] rounded-md"
                          title="Unduh PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditRecord(record)}
                          aria-label={`Edit data ${record.namaLengkap}`}
                          className="p-1.5 text-[#4E5651] hover:text-[#111815] hover:bg-[#F2F4F2] rounded-md"
                          title="Edit Data"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDeleteRecord(record)}
                          aria-label={`Hapus data ${record.namaLengkap}`}
                          className="p-1.5 text-[#4E5651] hover:text-red-700 hover:bg-red-50 rounded-md"
                          title="Hapus Data"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sub-tab 3: Menu Panitia (Seleksi Calon Siswa/i) */}
      {subTab === 'selection' && (
        <CommitteeSelectionView
          registrations={registrations}
          formConfig={formConfig}
          onSaveSelection={onSaveSelection}
          onPreviewRecord={onPreviewRecord}
        />
      )}

      {/* Sub-tab 4: Google Sheets Sync */}
      {subTab === 'sheets' && (
        <SheetsSyncView
          user={googleUser}
          hasAccessToken={hasAccessToken}
          authModeLabel={authModeLabel}
          isLoggingIn={isLoggingInGoogle}
          isSyncing={isSyncing}
          isTestingWebhook={isTestingWebhook}
          isPushingWebhook={isPushingWebhook}
          syncMessage={syncMessage}
          syncError={syncError}
          sheetsConfig={sheetsConfig}
          hasGlobalCloudConfig={hasGlobalCloudConfig}
          stats={stats}
          onGoogleLogin={onGoogleLogin}
          onDirectGoogleTokenLogin={onDirectGoogleTokenLogin}
          onGoogleLogout={onGoogleLogout}
          onChangeSyncMode={onChangeSyncMode}
          onCreateSpreadsheet={onCreateSpreadsheet}
          onCreateUnitSpreadsheet={onCreateUnitSpreadsheet}
          onCreateAllUnitSpreadsheets={onCreateAllUnitSpreadsheets}
          onConnectSpreadsheetId={onConnectSpreadsheetId}
          onConnectUnitSpreadsheet={onConnectUnitSpreadsheet}
          onDisconnectSpreadsheet={onDisconnectSpreadsheet}
          onDisconnectUnitSpreadsheet={onDisconnectUnitSpreadsheet}
          onSyncNow={onSyncNow}
          onToggleAutoSync={onToggleAutoSync}
          onSaveAppsScriptUrl={onSaveAppsScriptUrl}
          onSavePerUnitWebhookConfig={onSavePerUnitWebhookConfig}
          onTestAppsScript={onTestAppsScript}
          onPushViaAppsScript={onPushViaAppsScript}
          onPullViaAppsScript={onPullViaAppsScript}
        />
      )}
    </div>
  );
};
