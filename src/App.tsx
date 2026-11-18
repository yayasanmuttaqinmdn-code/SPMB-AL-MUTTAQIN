import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { TopBar, type ActiveTab } from './components/TopBar.tsx';
import { PortalLoginView } from './components/PortalLoginView.tsx';
import { RegistrationFormView } from './components/RegistrationFormView.tsx';
import { ReceiptPreviewView } from './components/ReceiptPreviewView.tsx';
import { LookupReceiptView } from './components/LookupReceiptView.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { AdminPanelView } from './components/AdminPanelView.tsx';
import { ConfirmationModal } from './components/ConfirmationModal.tsx';
import type {
  DashboardStats,
  FormSchemaConfig,
  RegistrationInput,
  RegistrationRecord,
  SelectionStatus,
  SheetsPublicConfig,
  SheetsSyncMode,
  UnitId,
  UnitSheetsTarget,
} from './types/spmb.ts';
import {
  computeUnitStats,
  countConfiguredUnitTargets,
  createPrimarySheetsConfig,
  DEFAULT_FORM_CONFIG,
  INSTITUTION_NAME,
  normalizeFormSchemaConfig,
  normalizeRegistrationRecord,
  normalizeSheetsConfig,
  registrationToSheetRow,
  resolveUnitWebhookDispatch,
  SHEET_HEADERS,
  UNIT_CONFIGS,
  UNIT_ORDER,
} from './utils/spmbLogic.ts';
import {
  bootstrapCloudConfigFromUrl,
  callAppsScriptPost,
  createRegistrationDirectInAppsScript,
  fetchDirectPublicState,
  fetchRuntimeCloudConfig,
  getEnvAdminPassword,
  getEnvAppsScriptUrl,
  getStoredCloudAdminToken,
  loadLocalCloudSheetsConfig,
  lookupDirectInAppsScript,
  pullDirectFromAppsScript,
  resolveEffectiveAppsScriptTarget,
  saveLocalCloudSheetsConfig,
  setStoredCloudAdminToken,
} from './utils/cloudSync.ts';
import {
  clearAccessToken,
  getAccessToken,
  googleDirectTokenSignIn,
  googleSignIn,
  initAuth,
  logout,
} from './utils/firebaseAuth.ts';
import {
  createSpmbSpreadsheet,
  createUnitSpreadsheet,
  extractSpreadsheetId,
  SheetsAuthError,
  syncAllPerUnitGoogleSheets,
  syncSingleUnitWithGoogleSheet,
  syncWithGoogleSheets,
} from './utils/googleSheets.ts';

interface PendingConfirmation {
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  tone: 'primary' | 'danger';
  action: () => Promise<void>;
}

const EMPTY_CONFIG: SheetsPublicConfig = createPrimarySheetsConfig();

function dedupeRegistrations(list: RegistrationRecord[]): RegistrationRecord[] {
  const seen = new Set<string>();
  const out: RegistrationRecord[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'dashboard';
    }
    return 'login';
  });

  const [selectedUnit, setSelectedUnit] = useState<UnitId>('RA_TK');
  const [parentSession, setParentSession] = useState<{
    namaWali: string;
    noWhatsapp: string;
  } | null>(null);

  const [publicStats, setPublicStats] = useState<DashboardStats>(() =>
    computeUnitStats([], DEFAULT_FORM_CONFIG)
  );
  const [formConfig, setFormConfig] = useState<FormSchemaConfig>(() =>
    structuredClone(DEFAULT_FORM_CONFIG)
  );
  const [sheetsConfig, setSheetsConfig] = useState<SheetsPublicConfig>(EMPTY_CONFIG);
  const [hasGlobalCloudConfig, setHasGlobalCloudConfig] = useState<boolean>(() =>
    Boolean(getEnvAppsScriptUrl())
  );

  // Admin-only full list (empty for public parents!)
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isLoggingInAdmin, setIsLoggingInAdmin] = useState(false);
  const [adminRegistrations, setAdminRegistrations] = useState<RegistrationRecord[]>([]);

  const [activeReceipt, setActiveReceipt] = useState<RegistrationRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<RegistrationRecord | null>(null);

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Google Auth & Sheets Sync state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [authModeLabel, setAuthModeLabel] = useState('');
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [isPushingWebhook, setIsPushingWebhook] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncError, setSyncError] = useState('');

  // Mandatory confirmation dialog for destructive/mutating operations
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  const isAdmin = Boolean(adminToken);

  const serverAvailableRef = useRef<boolean | null>(null);
  const adminRegistrationsRef = useRef(adminRegistrations);
  adminRegistrationsRef.current = adminRegistrations;
  const sheetsConfigRef = useRef(sheetsConfig);
  sheetsConfigRef.current = sheetsConfig;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, activeReceipt?.id]);
  const formConfigRef = useRef(formConfig);
  formConfigRef.current = formConfig;
  const adminTokenRef = useRef(adminToken);
  adminTokenRef.current = adminToken;

  const computedOrPublicStats = useMemo(() => {
    if (isAdmin && adminRegistrations.length > 0) {
      return computeUnitStats(adminRegistrations, formConfig);
    }
    return publicStats;
  }, [isAdmin, adminRegistrations, formConfig, publicStats]);

  const isJsonResponse = (res: Response): boolean => {
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    return ct.includes('application/json');
  };

  const fetchPublicState = useCallback(async () => {
    try {
      let useCloudDirect = serverAvailableRef.current === false;
      if (!useCloudDirect) {
        try {
          const res = await fetch('/api/public/state');
          if (res.ok && isJsonResponse(res)) {
            serverAvailableRef.current = true;
            const data = await res.json();
            if (data.stats) setPublicStats(data.stats);
            if (data.formConfig) setFormConfig(data.formConfig);
            if (data.sheetsConfig) {
              const incoming = data.sheetsConfig as SheetsPublicConfig;
              setSheetsConfig((prev) => ({
                ...incoming,
                appsScriptUrl: incoming.appsScriptUrl || prev.appsScriptUrl,
                unitTargets: {
                  RA_TK: {
                    ...incoming.unitTargets.RA_TK,
                    appsScriptUrl:
                      incoming.unitTargets.RA_TK.appsScriptUrl ||
                      prev.unitTargets.RA_TK.appsScriptUrl,
                  },
                  SDIT: {
                    ...incoming.unitTargets.SDIT,
                    appsScriptUrl:
                      incoming.unitTargets.SDIT.appsScriptUrl ||
                      prev.unitTargets.SDIT.appsScriptUrl,
                  },
                  SMP: {
                    ...incoming.unitTargets.SMP,
                    appsScriptUrl:
                      incoming.unitTargets.SMP.appsScriptUrl ||
                      prev.unitTargets.SMP.appsScriptUrl,
                  },
                  SMA: {
                    ...incoming.unitTargets.SMA,
                    appsScriptUrl:
                      incoming.unitTargets.SMA.appsScriptUrl ||
                      prev.unitTargets.SMA.appsScriptUrl,
                  },
                },
              }));
            }
            return;
          }
          serverAvailableRef.current = false;
          useCloudDirect = true;
        } catch {
          serverAvailableRef.current = false;
          useCloudDirect = true;
        }
      }

      if (useCloudDirect) {
        const fromShareUrl = bootstrapCloudConfigFromUrl();
        let localCfg = fromShareUrl || loadLocalCloudSheetsConfig();

        const runtimeCfg = await fetchRuntimeCloudConfig();
        if (runtimeCfg?.appsScriptUrl) {
          setHasGlobalCloudConfig(true);
          localCfg = saveLocalCloudSheetsConfig({
            ...localCfg,
            appsScriptUrl: localCfg.appsScriptUrl || runtimeCfg.appsScriptUrl,
            spreadsheetId: localCfg.spreadsheetId || runtimeCfg.spreadsheetId,
          });
        } else if (getEnvAppsScriptUrl()) {
          setHasGlobalCloudConfig(true);
        }

        setSheetsConfig(localCfg);
        const directState = await fetchDirectPublicState(localCfg).catch(() => null);
        if (directState) {
          setFormConfig(directState.formConfig);
          setPublicStats(directState.stats);
          if (
            directState.lastSyncedAt ||
            directState.spreadsheetId ||
            directState.spreadsheetTitle ||
            directState.spreadsheetUrl
          ) {
            const updatedCfg = saveLocalCloudSheetsConfig({
              ...localCfg,
              spreadsheetId: localCfg.spreadsheetId || directState.spreadsheetId || '',
              spreadsheetTitle:
                directState.spreadsheetTitle || localCfg.spreadsheetTitle || '',
              spreadsheetUrl: directState.spreadsheetUrl || localCfg.spreadsheetUrl || '',
              lastSyncedAt: directState.lastSyncedAt || localCfg.lastSyncedAt,
            });
            setSheetsConfig(updatedCfg);
          }
        }
        const storedCloudToken = getStoredCloudAdminToken();
        if (storedCloudToken && !adminTokenRef.current) {
          setAdminToken(storedCloudToken);
        }
      }
    } finally {
      setIsLoadingInitial(false);
    }
  }, []);

  const fetchAdminRegistrations = useCallback(async (tokenOverride?: string) => {
    const token = tokenOverride || adminTokenRef.current;
    if (!token) return;

    const pullCloudDirect = async () => {
      const cfg = loadLocalCloudSheetsConfig();
      setSheetsConfig(cfg);
      if (resolveEffectiveAppsScriptTarget(cfg)) {
        const pulled = await pullDirectFromAppsScript(cfg, adminRegistrationsRef.current).catch(
          () => null
        );
        if (pulled) {
          const updatedCfg = saveLocalCloudSheetsConfig(pulled.sheetsConfig);
          const nextFormCfg = pulled.formConfig || formConfigRef.current;
          setAdminRegistrations(dedupeRegistrations(pulled.registrations));
          setFormConfig(nextFormCfg);
          setPublicStats(computeUnitStats(pulled.registrations, nextFormCfg));
          setSheetsConfig(updatedCfg);
        }
      }
    };

    if (serverAvailableRef.current === false) {
      await pullCloudDirect();
      return;
    }

    const res = await fetch('/api/admin/registrations', {
      headers: { 'x-admin-token': token },
    });
    if (!isJsonResponse(res)) {
      serverAvailableRef.current = false;
      await pullCloudDirect();
      return;
    }
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.registrations)) {
        setAdminRegistrations(dedupeRegistrations(data.registrations));
      }
      if (data.stats) setPublicStats(data.stats);
      if (data.sheetsConfig) setSheetsConfig(data.sheetsConfig);
      if (data.formConfig) setFormConfig(data.formConfig);
    } else if (res.status === 401) {
      setAdminToken(null);
      setStoredCloudAdminToken(null);
      setAdminRegistrations([]);
    }
  }, []);

  // Initial load + Real-time SSE listener (Express) + Cloud Spreadsheet polling (Vercel)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let cancelled = false;

    const init = async () => {
      await fetchPublicState();
      if (cancelled) return;

      if (serverAvailableRef.current === true) {
        eventSource = new EventSource('/api/events');
        eventSource.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.stats) setPublicStats(payload.stats);
            if (payload.formConfig) setFormConfig(payload.formConfig);
            if (payload.sheetsConfig) {
              const incoming = payload.sheetsConfig as SheetsPublicConfig;
              setSheetsConfig((prev) => ({
                ...incoming,
                appsScriptUrl: incoming.appsScriptUrl || prev.appsScriptUrl,
                unitTargets: {
                  RA_TK: {
                    ...incoming.unitTargets.RA_TK,
                    appsScriptUrl:
                      incoming.unitTargets.RA_TK.appsScriptUrl ||
                      prev.unitTargets.RA_TK.appsScriptUrl,
                  },
                  SDIT: {
                    ...incoming.unitTargets.SDIT,
                    appsScriptUrl:
                      incoming.unitTargets.SDIT.appsScriptUrl ||
                      prev.unitTargets.SDIT.appsScriptUrl,
                  },
                  SMP: {
                    ...incoming.unitTargets.SMP,
                    appsScriptUrl:
                      incoming.unitTargets.SMP.appsScriptUrl ||
                      prev.unitTargets.SMP.appsScriptUrl,
                  },
                  SMA: {
                    ...incoming.unitTargets.SMA,
                    appsScriptUrl:
                      incoming.unitTargets.SMA.appsScriptUrl ||
                      prev.unitTargets.SMA.appsScriptUrl,
                  },
                },
              }));
            }
            if (adminTokenRef.current) {
              void fetchAdminRegistrations(adminTokenRef.current);
            }
            setIsLoadingInitial(false);
          } catch {
            // Ignore ping frames
          }
        };
        eventSource.onerror = () => {
          // Keep silent on transient reconnects
        };
      } else {
        const storedCloudToken = getStoredCloudAdminToken();
        if (storedCloudToken) {
          setAdminToken(storedCloudToken);
          await fetchAdminRegistrations(storedCloudToken);
        }
      }
    };

    void init();

    const cloudPollTimer = setInterval(() => {
      if (serverAvailableRef.current === false && !adminTokenRef.current) {
        void fetchPublicState();
      }
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(cloudPollTimer);
      if (eventSource) eventSource.close();
    };
  }, [fetchPublicState, fetchAdminRegistrations]);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasAccessToken(Boolean(token));
      },
      () => {
        setGoogleUser(null);
        setHasAccessToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const hasActiveOAuthTarget = useMemo(() => {
    if (sheetsConfig.syncMode === 'per_unit') {
      return UNIT_ORDER.some((u) => Boolean(sheetsConfig.unitTargets[u]?.spreadsheetId));
    }
    return Boolean(sheetsConfig.spreadsheetId);
  }, [sheetsConfig]);

  const runSheetsSync = useCallback(
    async (
      overrideSpreadsheetId?: string,
      overrideRecords?: RegistrationRecord[],
      pushAllLocal = false
    ) => {
      const token = getAccessToken();
      const admToken = adminTokenRef.current;
      const cfg = sheetsConfigRef.current;
      if (!token || !admToken) return;

      const recordsToSync = overrideRecords || adminRegistrationsRef.current;

      if (cfg.syncMode === 'per_unit' && !overrideSpreadsheetId) {
        const hasAnyUnitSheet = UNIT_ORDER.some((u) => Boolean(cfg.unitTargets[u]?.spreadsheetId));
        if (!hasAnyUnitSheet) return;

        setIsSyncing(true);
        setSyncError('');
        try {
          const result = await syncAllPerUnitGoogleSheets(token, cfg.unitTargets, recordsToSync, {
            pushAllLocal,
            formConfig: formConfigRef.current,
          });

          const mergeRes = await fetch('/api/sync/merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': admToken,
            },
            body: JSON.stringify({
              registrations: result.mergedRecords,
              syncMode: 'per_unit',
              unitTargets: result.updatedTargets,
              syncedAt: result.syncedAt,
            }),
          });

          if (mergeRes.ok) {
            const mergedData = await mergeRes.json();
            setAdminRegistrations(dedupeRegistrations(mergedData.registrations));
            setPublicStats(mergedData.stats);
            setSheetsConfig(mergedData.sheetsConfig);
          }

          setSyncMessage(
            `Sinkronisasi ${result.syncedUnitsCount} sheet lembaga selesai (${result.pushedToSheet} terkirim, ${result.pulledFromSheet} diperbarui dari Google Sheets).`
          );
        } catch (err) {
          if (err instanceof SheetsAuthError) {
            clearAccessToken();
            setHasAccessToken(false);
            setAuthModeLabel('');
          }
          setSyncError(
            err instanceof Error ? err.message : 'Gagal menyinkronkan Google Sheets per lembaga.'
          );
        } finally {
          setIsSyncing(false);
        }
        return;
      }

      const targetId = overrideSpreadsheetId || cfg.spreadsheetId;
      if (!targetId) return;

      setIsSyncing(true);
      setSyncError('');
      try {
        const result = await syncWithGoogleSheets(token, targetId, recordsToSync, {
          pushAllLocal,
          formConfig: formConfigRef.current,
        });

        const mergeRes = await fetch('/api/sync/merge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': admToken,
          },
          body: JSON.stringify({
            registrations: result.mergedRecords,
            syncMode: 'unified',
            spreadsheetId: targetId,
            spreadsheetTitle: result.spreadsheetTitle,
            spreadsheetUrl: result.spreadsheetUrl,
            syncedAt: result.syncedAt,
          }),
        });

        if (mergeRes.ok) {
          const mergedData = await mergeRes.json();
          setAdminRegistrations(dedupeRegistrations(mergedData.registrations));
          setPublicStats(mergedData.stats);
          setSheetsConfig(mergedData.sheetsConfig);
        }

        setSyncMessage(
          `Sinkronisasi selesai (${result.pushedToSheet} terkirim, ${result.pulledFromSheet} diperbarui dari Google Sheets).`
        );
      } catch (err) {
        if (err instanceof SheetsAuthError) {
          clearAccessToken();
          setHasAccessToken(false);
          setAuthModeLabel('');
        }
        setSyncError(
          err instanceof Error ? err.message : 'Gagal menyinkronkan dengan Google Sheets.'
        );
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  const hasActiveWebhookTarget = useMemo(() => {
    if (sheetsConfig.syncMode === 'per_unit') {
      return UNIT_ORDER.some((u) => Boolean(resolveEffectiveAppsScriptTarget(sheetsConfig, u)));
    }
    return Boolean(resolveEffectiveAppsScriptTarget(sheetsConfig));
  }, [sheetsConfig]);

  const runAppsScriptCloudPull = useCallback(async (silent = false) => {
    const admToken = adminTokenRef.current;
    if (!admToken) return;
    if (!silent) {
      setIsSyncing(true);
      setSyncError('');
    }
    try {
      if (serverAvailableRef.current === false) {
        const pulled = await pullDirectFromAppsScript(
          sheetsConfigRef.current,
          adminRegistrationsRef.current
        );
        const updatedCfg = saveLocalCloudSheetsConfig(pulled.sheetsConfig);
        const nextFormCfg = pulled.formConfig || formConfigRef.current;
        setAdminRegistrations(dedupeRegistrations(pulled.registrations));
        setFormConfig(nextFormCfg);
        setPublicStats(computeUnitStats(pulled.registrations, nextFormCfg));
        setSheetsConfig(updatedCfg);
        if (!silent) {
          setSyncMessage(
            `Sinkronisasi 2 arah selesai (${pulled.pushedCount} terkirim, ${pulled.pulledCount} ditarik dari Google Spreadsheet).`
          );
        }
        return;
      }

      const res = await fetch('/api/sync/apps-script-pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': admToken,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) {
          setSyncError(data.error || 'Gagal menarik sinkronisasi 2 arah dari Google Spreadsheet.');
        }
        return;
      }
      if (Array.isArray(data.registrations)) {
        setAdminRegistrations(dedupeRegistrations(data.registrations));
      }
      if (data.formConfig) setFormConfig(data.formConfig);
      if (data.stats) setPublicStats(data.stats);
      if (data.sheetsConfig) setSheetsConfig(data.sheetsConfig);
      if (!silent) {
        setSyncMessage(
          `Sinkronisasi 2 arah selesai (${data.pushedToSheet ?? 0} terkirim, ${data.pulledFromSheet ?? 0} ditarik dari Google Spreadsheet).`
        );
      }
    } catch (err) {
      if (!silent) {
        setSyncError(
          err instanceof Error
            ? err.message
            : 'Gagal menyinkronkan 2 arah dengan Google Spreadsheet.'
        );
      }
    } finally {
      if (!silent) setIsSyncing(false);
    }
  }, []);

  // Automatic Real-Time polling when Admin + Google Sheets (OAuth or Cloud Apps Script) is active
  useEffect(() => {
    if (!isAdmin || !sheetsConfig.autoSyncEnabled) {
      return;
    }
    const useOAuth = hasAccessToken && hasActiveOAuthTarget;
    const useWebhook = hasActiveWebhookTarget;
    if (!useOAuth && !useWebhook) {
      return;
    }

    const timer = setInterval(() => {
      if (useOAuth) {
        void runSheetsSync();
      } else if (useWebhook) {
        void runAppsScriptCloudPull(true);
      }
    }, 12000);

    return () => clearInterval(timer);
  }, [
    isAdmin,
    hasAccessToken,
    hasActiveOAuthTarget,
    hasActiveWebhookTarget,
    sheetsConfig.autoSyncEnabled,
    runSheetsSync,
    runAppsScriptCloudPull,
  ]);

  const handleAdminLogin = async (password: string) => {
    setIsLoggingInAdmin(true);
    setAdminLoginError('');
    try {
      if (serverAvailableRef.current === false) {
        if (password !== getEnvAdminPassword()) {
          setAdminLoginError('Kata sandi admin tidak sesuai.');
          return;
        }
        const token = `cloud-admin-${Date.now()}`;
        setStoredCloudAdminToken(token);
        setAdminToken(token);
        await fetchAdminRegistrations(token);
        return;
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!isJsonResponse(res)) {
        serverAvailableRef.current = false;
        if (password !== getEnvAdminPassword()) {
          setAdminLoginError('Kata sandi admin tidak sesuai.');
          return;
        }
        const token = `cloud-admin-${Date.now()}`;
        setStoredCloudAdminToken(token);
        setAdminToken(token);
        await fetchAdminRegistrations(token);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setAdminLoginError(data.error || 'Kata sandi admin tidak valid.');
        return;
      }
      setAdminToken(data.adminToken);
      await fetchAdminRegistrations(data.adminToken);
    } catch {
      setAdminLoginError('Gagal menghubungi server untuk masuk Admin.');
    } finally {
      setIsLoggingInAdmin(false);
    }
  };

  const handleAdminLogout = async () => {
    if (adminToken && serverAvailableRef.current !== false) {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken },
      }).catch(() => undefined);
    }
    setStoredCloudAdminToken(null);
    setAdminToken(null);
    setAdminRegistrations([]);
    setEditingRecord(null);
  };

  const handleSaveFormConfig = async (nextConfig: FormSchemaConfig) => {
    if (!adminToken) throw new Error('Sesi Admin telah berakhir.');
    const normalizedForm = normalizeFormSchemaConfig(nextConfig);

    if (serverAvailableRef.current === false) {
      const target = resolveEffectiveAppsScriptTarget(sheetsConfigRef.current);
      if (target) {
        await callAppsScriptPost(target.webhookUrl, {
          action: 'save_form_config',
          spreadsheetId: target.spreadsheetId || undefined,
          summaryTabName:
            sheetsConfigRef.current.syncMode === 'per_unit'
              ? 'Ringkasan_Lembaga'
              : 'Ringkasan_Dashboard',
          formConfig: normalizedForm,
        });
      }
      setFormConfig(normalizedForm);
      setPublicStats(computeUnitStats(adminRegistrationsRef.current, normalizedForm));
      return;
    }

    const res = await fetch('/api/admin/form-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ formConfig: normalizedForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan konfigurasi formulir.');
    }
    setFormConfig(data.formConfig);
    if (data.stats) setPublicStats(data.stats);
  };

  const handleEnterUnitForm = (unit: UnitId) => {
    setSelectedUnit(unit);
    setParentSession(null);
    setEditingRecord(null);
    setActiveTab('form');
  };

  const handleLookupRecords = async (queryOrName: string): Promise<RegistrationRecord[]> => {
    if (serverAvailableRef.current === false) {
      return lookupDirectInAppsScript(sheetsConfigRef.current, queryOrName);
    }
    const res = await fetch('/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryOrName, namaLengkap: queryOrName }),
    });
    if (!isJsonResponse(res)) {
      serverAvailableRef.current = false;
      return lookupDirectInAppsScript(loadLocalCloudSheetsConfig(), queryOrName);
    }
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(data.error || 'Data pendaftar tidak ditemukan.');
    }
    return Array.isArray(data.records)
      ? data.records
      : data.record
        ? [data.record]
        : [];
  };

  const handleSubmitNew = async (input: RegistrationInput) => {
    setIsSubmitting(true);
    try {
      let createdRecord: RegistrationRecord;
      const createViaCloudDirect = async () => {
        const rec = await createRegistrationDirectInAppsScript(
          sheetsConfigRef.current,
          input,
          formConfigRef.current
        );
        const updatedList = dedupeRegistrations([rec, ...adminRegistrationsRef.current]);
        if (isAdmin) {
          setAdminRegistrations(updatedList);
        }
        const refreshed = await fetchDirectPublicState(sheetsConfigRef.current).catch(() => null);
        if (refreshed) {
          setPublicStats(refreshed.stats);
        }
        return rec;
      };

      if (serverAvailableRef.current === false) {
        createdRecord = await createViaCloudDirect();
      } else {
        const res = await fetch('/api/registrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!isJsonResponse(res)) {
          serverAvailableRef.current = false;
          createdRecord = await createViaCloudDirect();
        } else {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Gagal menyimpan pendaftaran.');
          }

          createdRecord = data.record as RegistrationRecord;
          if (data.stats) setPublicStats(data.stats);
          if (isAdmin) {
            const updatedList = dedupeRegistrations([
              createdRecord,
              ...adminRegistrationsRef.current,
            ]);
            setAdminRegistrations(updatedList);
            if (getAccessToken()) {
              void runSheetsSync(undefined, updatedList, true);
            }
          }
        }
      }
      setActiveReceipt(createdRecord);
      setEditingRecord(null);
      setActiveTab('receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const persistCloudRecordUpdate = async (
    updated: RegistrationRecord
  ): Promise<RegistrationRecord> => {
    const target = resolveEffectiveAppsScriptTarget(sheetsConfigRef.current, updated.unit);
    if (target) {
      const isPerUnit = sheetsConfigRef.current.syncMode === 'per_unit';
      const syncedRecord: RegistrationRecord = { ...updated, syncState: 'synced' };
      await callAppsScriptPost(target.webhookUrl, {
        action: 'upsert',
        spreadsheetId: target.spreadsheetId || undefined,
        unitTab: UNIT_CONFIGS[updated.unit].sheetTabName,
        summaryTabName: isPerUnit ? 'Ringkasan_Lembaga' : 'Ringkasan_Dashboard',
        headers: SHEET_HEADERS,
        row: registrationToSheetRow(syncedRecord, formConfigRef.current[updated.unit]),
        record: {
          ...syncedRecord,
          pasFotoDataUrl:
            syncedRecord.pasFotoDataUrl && syncedRecord.pasFotoDataUrl.length <= 42000
              ? syncedRecord.pasFotoDataUrl
              : '',
        },
      });
      return syncedRecord;
    }
    return updated;
  };

  const handleRequestUpdate = (recordId: string, input: RegistrationInput) => {
    if (!adminToken) return;
    setConfirmation({
      title: 'Konfirmasi Perubahan Data Pendaftar',
      description:
        'Perubahan ini akan memperbarui data calon murid dan menyinkronkan ke Google Sheets jika terhubung.',
      details: [
        `Nama Calon Murid: ${input.namaLengkap}`,
        `Lembaga: ${UNIT_CONFIGS[input.unit].fullName}`,
        `No. WhatsApp: ${input.noWhatsapp}`,
      ],
      confirmLabel: 'Simpan Perubahan',
      tone: 'primary',
      action: async () => {
        setIsSubmitting(true);
        try {
          if (serverAvailableRef.current === false) {
            const existing = adminRegistrationsRef.current.find((r) => r.id === recordId);
            if (!existing) throw new Error('Data pendaftar tidak ditemukan.');
            const merged = normalizeRegistrationRecord({
              ...existing,
              ...input,
              id: existing.id,
              noPendaftaran: existing.noPendaftaran,
              createdAt: existing.createdAt,
              updatedAt: new Date().toISOString(),
              syncState: 'synced',
            });
            const updatedRecord = await persistCloudRecordUpdate(merged);
            const updatedList = adminRegistrationsRef.current.map((r) =>
              r.id === recordId ? updatedRecord : r
            );
            setAdminRegistrations(updatedList);
            setPublicStats(computeUnitStats(updatedList, formConfigRef.current));
            setActiveReceipt(updatedRecord);
            setEditingRecord(null);
            setActiveTab('admin');
            return;
          }

          const res = await fetch(`/api/registrations/${recordId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': adminToken,
            },
            body: JSON.stringify(input),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Gagal memperbarui data.');
          }
          const updatedRecord = data.record as RegistrationRecord;
          const updatedList = adminRegistrationsRef.current.map((r) =>
            r.id === recordId ? updatedRecord : r
          );
          setAdminRegistrations(updatedList);
          if (data.stats) setPublicStats(data.stats);
          setActiveReceipt(updatedRecord);
          setEditingRecord(null);
          setActiveTab('admin');

          if (getAccessToken()) {
            await runSheetsSync(undefined, updatedList, true);
          }
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleToggleVerifyRecord = (record: RegistrationRecord) => {
    if (!adminToken) return;
    const nextStatus =
      record.statusVerifikasi === 'Terverifikasi Panitia'
        ? 'Menunggu Verifikasi Berkas'
        : 'Terverifikasi Panitia';

    setConfirmation({
      title: 'Ubah Status Verifikasi?',
      description: `Ubah status verifikasi untuk ${record.namaLengkap} menjadi "${nextStatus}"?`,
      details: [
        `No. Pendaftaran: ${record.noPendaftaran}`,
        `Lembaga: ${UNIT_CONFIGS[record.unit].fullName}`,
      ],
      confirmLabel: 'Ubah Status',
      tone: 'primary',
      action: async () => {
        if (serverAvailableRef.current === false) {
          const updated = await persistCloudRecordUpdate({
            ...record,
            statusVerifikasi: nextStatus,
            updatedAt: new Date().toISOString(),
          });
          const updatedList = adminRegistrationsRef.current.map((r) =>
            r.id === record.id ? updated : r
          );
          setAdminRegistrations(updatedList);
          return;
        }

        const res = await fetch(`/api/registrations/${record.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({ statusVerifikasi: nextStatus }),
        });
        if (!res.ok) throw new Error('Gagal mengubah status verifikasi.');
        const data = await res.json();
        const updated = data.record as RegistrationRecord;
        const updatedList = adminRegistrationsRef.current.map((r) =>
          r.id === record.id ? updated : r
        );
        setAdminRegistrations(updatedList);
        if (getAccessToken()) {
          await runSheetsSync(undefined, updatedList, true);
        }
      },
    });
  };

  const handleSaveSelection = async (
    recordId: string,
    payload: {
      statusSeleksi: SelectionStatus;
      nilaiSeleksi: string;
      catatanSeleksi: string;
      statusVerifikasi: 'Menunggu Verifikasi Berkas' | 'Terverifikasi Panitia';
    }
  ) => {
    if (!adminToken) {
      throw new Error('Sesi Admin tidak aktif.');
    }

    if (serverAvailableRef.current === false) {
      const existing = adminRegistrationsRef.current.find((r) => r.id === recordId);
      if (!existing) throw new Error('Data pendaftar tidak ditemukan.');
      const nowIso = new Date().toISOString();
      const updated = await persistCloudRecordUpdate(
        normalizeRegistrationRecord({
          ...existing,
          ...payload,
          updatedAt: nowIso,
          diseleksiAt: nowIso,
        })
      );
      const updatedList = adminRegistrationsRef.current.map((r) =>
        r.id === recordId ? updated : r
      );
      setAdminRegistrations(updatedList);
      setPublicStats(computeUnitStats(updatedList, formConfigRef.current));
      if (activeReceipt?.id === recordId) {
        setActiveReceipt(updated);
      }
      return;
    }

    const res = await fetch(`/api/registrations/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan keputusan seleksi panitia.');
    }
    const updated = data.record as RegistrationRecord;
    const updatedList = adminRegistrationsRef.current.map((r) =>
      r.id === recordId ? updated : r
    );
    setAdminRegistrations(updatedList);
    if (data.stats) setPublicStats(data.stats);
    if (activeReceipt?.id === recordId) {
      setActiveReceipt(updated);
    }
    if (getAccessToken()) {
      await runSheetsSync(undefined, updatedList, true);
    }
  };

  const handleRequestDeleteRecord = (record: RegistrationRecord) => {
    if (!adminToken) return;
    setConfirmation({
      title: 'Hapus Data Pendaftar?',
      description:
        'Tindakan ini akan menghapus data pendaftar secara permanen dari portal dan menghapus baris terkait di Google Sheets saat tersinkron.',
      details: [
        `Nomor Pendaftaran: ${record.noPendaftaran}`,
        `Nama Calon Murid: ${record.namaLengkap}`,
        `Lembaga: ${UNIT_CONFIGS[record.unit].fullName}`,
      ],
      confirmLabel: 'Ya, Hapus Permanen',
      tone: 'danger',
      action: async () => {
        if (serverAvailableRef.current === false) {
          const target = resolveEffectiveAppsScriptTarget(sheetsConfigRef.current, record.unit);
          if (target) {
            const isPerUnit = sheetsConfigRef.current.syncMode === 'per_unit';
            await callAppsScriptPost(target.webhookUrl, {
              action: 'delete',
              spreadsheetId: target.spreadsheetId || undefined,
              unitTab: UNIT_CONFIGS[record.unit].sheetTabName,
              summaryTabName: isPerUnit ? 'Ringkasan_Lembaga' : 'Ringkasan_Dashboard',
              record: { id: record.id, unit: record.unit },
            });
          }
          const remainingList = adminRegistrationsRef.current.filter((r) => r.id !== record.id);
          setAdminRegistrations(remainingList);
          setPublicStats(computeUnitStats(remainingList, formConfigRef.current));
          if (activeReceipt?.id === record.id) {
            setActiveReceipt(null);
          }
          return;
        }

        const res = await fetch(`/api/registrations/${record.id}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': adminToken },
        });
        if (!res.ok) {
          throw new Error('Gagal menghapus data pendaftar.');
        }
        const data = await res.json();
        const remainingList = adminRegistrationsRef.current.filter((r) => r.id !== record.id);
        setAdminRegistrations(remainingList);
        if (data.stats) setPublicStats(data.stats);
        if (activeReceipt?.id === record.id) {
          setActiveReceipt(null);
        }
        if (getAccessToken()) {
          await runSheetsSync(undefined, remainingList, true);
        }
      },
    });
  };

  const handleGoogleLogin = async () => {
    setIsLoggingInGoogle(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const { user, accessToken } = await googleSignIn();
      setGoogleUser(user);
      setHasAccessToken(Boolean(accessToken));
      setAuthModeLabel(user.email || user.displayName || 'Akun Google Panitia');
      setSyncMessage(`Berhasil masuk sebagai ${user.email}. Google Sheets siap disinkronkan.`);
      void runSheetsSync();
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google. Coba kembali.'
      );
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleDirectGoogleTokenLogin = async () => {
    setIsLoggingInGoogle(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const { accessToken, emailLabel } = await googleDirectTokenSignIn();
      setHasAccessToken(Boolean(accessToken));
      setAuthModeLabel(emailLabel);
      setSyncMessage(
        sheetsConfigRef.current.syncMode === 'per_unit'
          ? 'Token akses Google Sheets aktif! Sekarang buat atau hubungkan Sheet per lembaga.'
          : 'Token akses Google Sheets aktif! Sekarang buat 1 Spreadsheet SPMB (otomatis memiliki halaman/sheet RA_TK, SDIT, SMP, SMA).'
      );
      void runSheetsSync();
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Gagal mendapatkan token akses Google Sheets.'
      );
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setHasAccessToken(false);
    setAuthModeLabel('');
    setSyncMessage('Sesi akun Google Panitia telah diputuskan.');
  };

  const handleChangeSyncMode = async (mode: SheetsSyncMode) => {
    if (!adminToken) return;
    setSyncError('');
    setSyncMessage('');
    if (serverAvailableRef.current === false) {
      const updated = saveLocalCloudSheetsConfig({
        ...sheetsConfigRef.current,
        syncMode: mode,
      });
      setSheetsConfig(updated);
      return;
    }
    const res = await fetch('/api/config/sheets', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ syncMode: mode }),
    });
    if (res.ok) {
      const data = await res.json();
      setSheetsConfig(data.sheetsConfig);
    }
  };

  const handleCreateSpreadsheet = async () => {
    const token = getAccessToken();
    if (!token || !adminToken) {
      setSyncError('Silakan masuk dengan Google dan Admin terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const created = await createSpmbSpreadsheet(
        token,
        adminRegistrationsRef.current,
        formConfigRef.current
      );
      const syncedList = adminRegistrationsRef.current.map((r) => ({
        ...r,
        syncState: 'synced' as const,
      }));
      const nowIso = new Date().toISOString();

      const mergeRes = await fetch('/api/sync/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          registrations: syncedList,
          syncMode: 'unified',
          spreadsheetId: created.spreadsheetId,
          spreadsheetTitle: created.spreadsheetTitle,
          spreadsheetUrl: created.spreadsheetUrl,
          syncedAt: nowIso,
        }),
      });
      if (mergeRes.ok) {
        const merged = await mergeRes.json();
        setAdminRegistrations(dedupeRegistrations(merged.registrations));
        setSheetsConfig(merged.sheetsConfig);
      }
      setSyncMessage(
        `Spreadsheet "${created.spreadsheetTitle}" berhasil dibuat dan seluruh ${syncedList.length} data pendaftar telah tersinkron!`
      );
    } catch (err) {
      if (err instanceof SheetsAuthError) {
        clearAccessToken();
        setHasAccessToken(false);
        setAuthModeLabel('');
      }
      setSyncError(err instanceof Error ? err.message : 'Gagal membuat Google Spreadsheet baru.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateUnitSpreadsheet = async (unit: UnitId) => {
    const token = getAccessToken();
    if (!token || !adminToken) {
      setSyncError('Silakan masuk dengan Google dan Admin terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const created = await createUnitSpreadsheet(
        token,
        unit,
        adminRegistrationsRef.current,
        formConfigRef.current
      );
      const updatedList = adminRegistrationsRef.current.map((r) =>
        r.unit === unit ? { ...r, syncState: 'synced' as const } : r
      );
      const nowIso = new Date().toISOString();

      const mergeRes = await fetch('/api/sync/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          registrations: updatedList,
          syncMode: 'per_unit',
          unitTargets: {
            [unit]: {
              ...sheetsConfigRef.current.unitTargets[unit],
              spreadsheetId: created.spreadsheetId,
              spreadsheetTitle: created.spreadsheetTitle,
              spreadsheetUrl: created.spreadsheetUrl,
            },
          },
          syncedAt: nowIso,
        }),
      });
      if (mergeRes.ok) {
        const merged = await mergeRes.json();
        setAdminRegistrations(dedupeRegistrations(merged.registrations));
        setSheetsConfig(merged.sheetsConfig);
      }
      setSyncMessage(
        `Sheet khusus ${UNIT_CONFIGS[unit].fullName} ("${created.spreadsheetTitle}") berhasil dibuat & tersinkron!`
      );
    } catch (err) {
      if (err instanceof SheetsAuthError) {
        clearAccessToken();
        setHasAccessToken(false);
        setAuthModeLabel('');
      }
      setSyncError(
        err instanceof Error
          ? err.message
          : `Gagal membuat Sheet khusus ${UNIT_CONFIGS[unit].shortName}.`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateAllUnitSpreadsheets = async () => {
    const token = getAccessToken();
    if (!token || !adminToken) {
      setSyncError('Silakan masuk dengan Google dan Admin terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      const nextTargets = structuredClone(sheetsConfigRef.current.unitTargets);
      const createdUnits: string[] = [];

      for (const unit of UNIT_ORDER) {
        if (!nextTargets[unit].spreadsheetId) {
          const created = await createUnitSpreadsheet(
            token,
            unit,
            adminRegistrationsRef.current,
            formConfigRef.current
          );
          nextTargets[unit] = {
            ...nextTargets[unit],
            spreadsheetId: created.spreadsheetId,
            spreadsheetTitle: created.spreadsheetTitle,
            spreadsheetUrl: created.spreadsheetUrl,
          };
          createdUnits.push(UNIT_CONFIGS[unit].shortName);
        }
      }

      const syncRes = await syncAllPerUnitGoogleSheets(
        token,
        nextTargets,
        adminRegistrationsRef.current,
        { pushAllLocal: false, formConfig: formConfigRef.current }
      );

      const mergeRes = await fetch('/api/sync/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          registrations: syncRes.mergedRecords,
          syncMode: 'per_unit',
          unitTargets: syncRes.updatedTargets,
          syncedAt: syncRes.syncedAt,
        }),
      });
      if (mergeRes.ok) {
        const merged = await mergeRes.json();
        setAdminRegistrations(dedupeRegistrations(merged.registrations));
        setSheetsConfig(merged.sheetsConfig);
      }

      setSyncMessage(
        createdUnits.length > 0
          ? `Berhasil membuat Sheet terpisah untuk ${createdUnits.join(', ')} dan menyinkronkan seluruh data!`
          : 'Semua 4 Sheet lembaga sudah terhubung dan berhasil disinkronkan!'
      );
    } catch (err) {
      if (err instanceof SheetsAuthError) {
        clearAccessToken();
        setHasAccessToken(false);
        setAuthModeLabel('');
      }
      setSyncError(
        err instanceof Error ? err.message : 'Gagal membuat 4 Sheet lembaga terpisah.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectUnitSpreadsheet = (unit: UnitId, rawIdOrUrl: string) => {
    const spreadsheetId = extractSpreadsheetId(rawIdOrUrl);
    if (!spreadsheetId) {
      setSyncError(`Masukkan URL atau ID Google Sheet yang valid untuk ${UNIT_CONFIGS[unit].shortName}.`);
      return;
    }

    setConfirmation({
      title: `Hubungkan Sheet ${UNIT_CONFIGS[unit].fullName}?`,
      description: `Data pendaftar khusus ${UNIT_CONFIGS[unit].fullName} akan ditulis & disinkronkan ke tab ${UNIT_CONFIGS[unit].sheetTabName} pada file Google Sheet ini.`,
      details: [`Lembaga: ${UNIT_CONFIGS[unit].fullName}`, `ID Sheet: ${spreadsheetId}`],
      confirmLabel: 'Hubungkan & Sinkronkan',
      tone: 'primary',
      action: async () => {
        const token = getAccessToken();
        if (!token || !adminToken) {
          throw new Error('Silakan login Google & Admin terlebih dahulu.');
        }
        setIsSyncing(true);
        setSyncError('');
        try {
          const res = await syncSingleUnitWithGoogleSheet(
            token,
            unit,
            spreadsheetId,
            adminRegistrationsRef.current,
            { pushAllLocal: false, formConfig: formConfigRef.current }
          );
          const mergedAll = [
            ...adminRegistrationsRef.current.filter((r) => r.unit !== unit),
            ...res.unitRecords,
          ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

          const mergeRes = await fetch('/api/sync/merge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': adminToken,
            },
            body: JSON.stringify({
              registrations: mergedAll,
              syncMode: 'per_unit',
              unitTargets: {
                [unit]: {
                  ...sheetsConfigRef.current.unitTargets[unit],
                  spreadsheetId,
                  spreadsheetTitle: res.spreadsheetTitle,
                  spreadsheetUrl: res.spreadsheetUrl,
                },
              },
              syncedAt: new Date().toISOString(),
            }),
          });
          if (mergeRes.ok) {
            const merged = await mergeRes.json();
            setAdminRegistrations(dedupeRegistrations(merged.registrations));
            setSheetsConfig(merged.sheetsConfig);
          }
          setSyncMessage(
            `Sheet ${UNIT_CONFIGS[unit].shortName} ("${res.spreadsheetTitle}") terhubung (${res.pushedToSheet} terkirim, ${res.pulledFromSheet} ditarik).`
          );
        } catch (err) {
          if (err instanceof SheetsAuthError) {
            clearAccessToken();
            setHasAccessToken(false);
            setAuthModeLabel('');
          }
          throw err;
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const handleDisconnectUnitSpreadsheet = (unit: UnitId) => {
    if (!adminToken) return;
    const target = sheetsConfig.unitTargets[unit];
    if (!target?.spreadsheetId) return;
    setConfirmation({
      title: `Putuskan Sheet ${UNIT_CONFIGS[unit].shortName}?`,
      description: `Portal akan berhenti menyinkronkan data ${UNIT_CONFIGS[unit].fullName} ke file Google Sheet ini.`,
      details: [
        `File: ${target.spreadsheetTitle || `Sheet ${UNIT_CONFIGS[unit].shortName}`}`,
        `ID: ${target.spreadsheetId}`,
      ],
      confirmLabel: 'Putuskan',
      tone: 'danger',
      action: async () => {
        if (serverAvailableRef.current === false) {
          const updated = saveLocalCloudSheetsConfig({
            ...sheetsConfigRef.current,
            unitTargets: {
              ...sheetsConfigRef.current.unitTargets,
              [unit]: {
                ...target,
                spreadsheetId: '',
                spreadsheetTitle: '',
                spreadsheetUrl: '',
              },
            },
          });
          setSheetsConfig(updated);
          setSyncMessage(`Koneksi Sheet ${UNIT_CONFIGS[unit].shortName} telah diputuskan.`);
          return;
        }
        const res = await fetch('/api/config/sheets', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({
            unitTargets: {
              [unit]: {
                ...target,
                spreadsheetId: '',
                spreadsheetTitle: '',
                spreadsheetUrl: '',
              },
            },
          }),
        });
        if (!res.ok) throw new Error('Gagal memutuskan sheet lembaga.');
        const data = await res.json();
        setSheetsConfig(data.sheetsConfig);
        setSyncMessage(`Koneksi Sheet ${UNIT_CONFIGS[unit].shortName} telah diputuskan.`);
      },
    });
  };

  const handleConnectSpreadsheetId = (rawInput: string) => {
    const spreadsheetId = extractSpreadsheetId(rawInput);
    if (!spreadsheetId) {
      setSyncError('Masukkan URL atau ID Google Spreadsheet yang valid.');
      return;
    }

    setConfirmation({
      title: 'Hubungkan & Sinkronkan ke Spreadsheet Ini?',
      description:
        'Menghubungkan spreadsheet akan membaca tab RA_TK, SDIT, SMP, SMA, serta memperbarui tab Ringkasan_Dashboard pada file spreadsheet tersebut.',
      details: [`ID Spreadsheet: ${spreadsheetId}`],
      confirmLabel: 'Hubungkan & Sinkronkan',
      tone: 'primary',
      action: async () => {
        await runSheetsSync(spreadsheetId, adminRegistrationsRef.current, false);
      },
    });
  };

  const handleDisconnectSpreadsheet = () => {
    if (!adminToken || !sheetsConfig.spreadsheetId) return;
    setConfirmation({
      title: 'Putuskan Koneksi Spreadsheet?',
      description:
        'Portal akan berhenti menyinkronkan ke file Google Spreadsheet ini. Data lokal tetap aman dan Anda dapat menghubungkan file lain kapan saja.',
      details: [
        `File: ${sheetsConfig.spreadsheetTitle || 'Spreadsheet SPMB'}`,
        `ID: ${sheetsConfig.spreadsheetId}`,
      ],
      confirmLabel: 'Ya, Putuskan Koneksi',
      tone: 'danger',
      action: async () => {
        if (serverAvailableRef.current === false) {
          const updated = saveLocalCloudSheetsConfig({
            ...sheetsConfigRef.current,
            spreadsheetId: '',
            spreadsheetTitle: '',
            spreadsheetUrl: '',
          });
          setSheetsConfig(updated);
          setSyncMessage('Koneksi ke file Google Spreadsheet telah diputuskan.');
          return;
        }
        const res = await fetch('/api/config/sheets', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({
            spreadsheetId: '',
            spreadsheetTitle: '',
            spreadsheetUrl: '',
          }),
        });
        if (!res.ok) throw new Error('Gagal memutuskan koneksi Google Spreadsheet.');
        const data = await res.json();
        setSheetsConfig(data.sheetsConfig);
        setSyncMessage('Koneksi ke file Google Spreadsheet telah diputuskan.');
      },
    });
  };

  const handleRequestSyncNow = () => {
    if (!hasAccessToken || !hasActiveOAuthTarget) return;
    const isPerUnit = sheetsConfig.syncMode === 'per_unit';
    setConfirmation({
      title: isPerUnit
        ? 'Sinkronkan Semua Sheet Lembaga Sekarang?'
        : 'Sinkronkan Dua Arah Sekarang?',
      description: isPerUnit
        ? 'Sistem akan menyinkronkan data setiap lembaga ke Google Sheet masing-masing (RA/TK, SDIT, SMP, SMA).'
        : 'Sistem akan membaca pembaruan dari tab RA_TK, SDIT, SMP, SMA pada Google Spreadsheet dan menulis ulang seluruh baris terbaru beserta Ringkasan_Dashboard.',
      details: isPerUnit
        ? [
            `Sheet terhubung: ${countConfiguredUnitTargets(sheetsConfig)} / 4 lembaga`,
            `Total data lokal: ${adminRegistrationsRef.current.length} pendaftar`,
          ]
        : [
            `Spreadsheet: ${sheetsConfig.spreadsheetTitle || sheetsConfig.spreadsheetId}`,
            `Total data lokal: ${adminRegistrationsRef.current.length} pendaftar`,
          ],
      confirmLabel: 'Sinkronkan Sekarang',
      tone: 'primary',
      action: async () => {
        await runSheetsSync();
      },
    });
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    if (!adminToken) return;
    if (serverAvailableRef.current === false) {
      const updated = saveLocalCloudSheetsConfig({
        ...sheetsConfigRef.current,
        autoSyncEnabled: enabled,
      });
      setSheetsConfig(updated);
      return;
    }
    const res = await fetch('/api/config/sheets', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({ autoSyncEnabled: enabled }),
    });
    if (res.ok) {
      const data = await res.json();
      setSheetsConfig(data.sheetsConfig);
    }
  };

  const handleSaveAppsScriptUrl = async (url: string, spreadsheetUrlOrId?: string) => {
    if (!adminToken) return;
    setSyncError('');
    setSyncMessage('');

    if (serverAvailableRef.current === false) {
      const extracted =
        spreadsheetUrlOrId !== undefined
          ? extractSpreadsheetId(spreadsheetUrlOrId)
          : sheetsConfigRef.current.spreadsheetId;
      const updated = saveLocalCloudSheetsConfig({
        ...sheetsConfigRef.current,
        syncMode: 'unified',
        appsScriptUrl: url,
        spreadsheetId: extracted,
      });
      setSheetsConfig(updated);
      setSyncMessage(
        url
          ? 'Konfigurasi Cloud Sync Apps Script berhasil disimpan di browser.'
          : 'Webhook Google Apps Script dinonaktifkan.'
      );
      return;
    }

    const bodyPayload: Record<string, unknown> = {
      syncMode: 'unified',
      appsScriptUrl: url,
    };
    if (spreadsheetUrlOrId !== undefined) {
      const extracted = extractSpreadsheetId(spreadsheetUrlOrId);
      bodyPayload.spreadsheetId = extracted;
    }
    const res = await fetch('/api/config/sheets', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify(bodyPayload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSyncError(data.error || 'Gagal menyimpan URL Webhook Google Apps Script.');
      return;
    }
    setSheetsConfig(data.sheetsConfig);
    setSyncMessage(
      url
        ? 'Konfigurasi Webhook Apps Script berhasil disimpan.'
        : 'Webhook Google Apps Script dinonaktifkan.'
    );
  };

  const handleSavePerUnitWebhookConfig = async (payload: {
    appsScriptUrl?: string;
    unitTargets: Record<UnitId, UnitSheetsTarget>;
  }) => {
    if (!adminToken) return;
    setSyncError('');
    setSyncMessage('');

    if (serverAvailableRef.current === false) {
      const updated = saveLocalCloudSheetsConfig({
        ...sheetsConfigRef.current,
        syncMode: 'per_unit',
        appsScriptUrl: payload.appsScriptUrl || '',
        unitTargets: payload.unitTargets,
      });
      setSheetsConfig(updated);
      setSyncMessage('Konfigurasi Google Sheet & Webhook per lembaga berhasil disimpan.');
      return;
    }

    const res = await fetch('/api/config/sheets', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
      },
      body: JSON.stringify({
        syncMode: 'per_unit',
        appsScriptUrl: payload.appsScriptUrl,
        unitTargets: payload.unitTargets,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSyncError(data.error || 'Gagal menyimpan konfigurasi Sheet & Webhook per lembaga.');
      return;
    }
    setSheetsConfig(data.sheetsConfig);
    setSyncMessage('Konfigurasi Google Sheet & Webhook per lembaga berhasil disimpan.');
  };

  const handleTestAppsScript = async (
    url: string,
    spreadsheetUrlOrId?: string,
    unit?: UnitId
  ) => {
    if (!adminToken) return;
    setIsTestingWebhook(true);
    setSyncError('');
    setSyncMessage('');
    try {
      if (serverAvailableRef.current === false) {
        const sid = spreadsheetUrlOrId ? extractSpreadsheetId(spreadsheetUrlOrId) : undefined;
        await callAppsScriptPost(url, { action: 'ping', spreadsheetId: sid });
        setSyncMessage(
          unit
            ? `Koneksi Cloud Sync ${UNIT_CONFIGS[unit].shortName} berhasil dan siap menerima data!`
            : 'Koneksi Cloud Sync Apps Script berhasil! Klik "Tarik & Sinkron 2 Arah" atau "Simpan & Kirim Data".'
        );
        return;
      }

      const res = await fetch('/api/sync/apps-script-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ url, spreadsheetUrlOrId, unit }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncError(data.error || 'Tes koneksi Webhook Apps Script gagal.');
        return;
      }
      setSyncMessage(
        data.message || 'Koneksi Webhook Apps Script berhasil dan siap menerima data!'
      );
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Gagal menghubungi server untuk menguji Webhook.'
      );
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handlePullViaAppsScript = async (payload: {
    syncMode: SheetsSyncMode;
    url: string;
    spreadsheetUrlOrId?: string;
    unitTargets?: Record<UnitId, UnitSheetsTarget>;
  }) => {
    if (!adminToken) return;
    setIsSyncing(true);
    setSyncError('');
    setSyncMessage('');
    try {
      if (serverAvailableRef.current === false) {
        const draftConfig = saveLocalCloudSheetsConfig({
          ...sheetsConfigRef.current,
          syncMode: payload.syncMode,
          appsScriptUrl: payload.url,
          spreadsheetId:
            payload.spreadsheetUrlOrId !== undefined
              ? extractSpreadsheetId(payload.spreadsheetUrlOrId)
              : sheetsConfigRef.current.spreadsheetId,
          unitTargets: payload.unitTargets || sheetsConfigRef.current.unitTargets,
        });
        const pulled = await pullDirectFromAppsScript(
          draftConfig,
          adminRegistrationsRef.current
        );
        const savedCfg = saveLocalCloudSheetsConfig(pulled.sheetsConfig);
        const nextFormCfg = pulled.formConfig || formConfigRef.current;
        setAdminRegistrations(dedupeRegistrations(pulled.registrations));
        setFormConfig(nextFormCfg);
        setPublicStats(computeUnitStats(pulled.registrations, nextFormCfg));
        setSheetsConfig(savedCfg);
        setSyncMessage(
          `Sinkronisasi 2 arah berhasil (${pulled.pulledCount} ditarik, total ${pulled.registrations.length} pendaftar tersimpan di Spreadsheet)!`
        );
        return;
      }

      const res = await fetch('/api/sync/apps-script-pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncError(data.error || 'Gagal menarik sinkronisasi 2 arah dari Google Spreadsheet.');
        return;
      }
      if (Array.isArray(data.registrations)) {
        setAdminRegistrations(dedupeRegistrations(data.registrations));
      }
      if (data.formConfig) setFormConfig(data.formConfig);
      if (data.stats) setPublicStats(data.stats);
      if (data.sheetsConfig) setSheetsConfig(data.sheetsConfig);
      setSyncMessage(
        `Sinkronisasi 2 arah berhasil (${data.pulledFromSheet ?? 0} ditarik dari Spreadsheet, ${data.pushedToSheet ?? 0} dikirim ke Spreadsheet)!`
      );
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Gagal menyinkronkan 2 arah dengan Google Spreadsheet.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushViaAppsScript = async (payload: {
    syncMode: SheetsSyncMode;
    url: string;
    spreadsheetUrlOrId?: string;
    unitTargets?: Record<UnitId, UnitSheetsTarget>;
  }) => {
    if (!adminToken) return;
    const isPerUnit = payload.syncMode === 'per_unit';
    setConfirmation({
      title: isPerUnit
        ? 'Simpan & Kirim Data ke Sheet Masing-Masing Lembaga?'
        : 'Simpan Webhook & Kirim Data ke 4 Halaman Sheet?',
      description: isPerUnit
        ? 'Sistem akan menyimpan konfigurasi setiap lembaga lalu mengirimkan data RA/TK hanya ke Sheet RA/TK, data SDIT hanya ke Sheet SDIT, data SMP hanya ke Sheet SMP, dan data SMA hanya ke Sheet SMA.'
        : 'Sistem akan menyimpan Webhook Apps Script lalu mengirim seluruh data ke 1 file Spreadsheet dengan halaman/tab terpisah per lembaga (RA_TK, SDIT, SMP, SMA) serta Ringkasan_Dashboard.',
      details: [
        `Mode: ${isPerUnit ? '4 File Spreadsheet Terpisah' : '1 File Spreadsheet (Beda Halaman/Tab: RA_TK, SDIT, SMP, SMA)'}`,
        `Total data lokal: ${adminRegistrationsRef.current.length} pendaftar`,
      ],
      confirmLabel: 'Simpan & Kirim Sekarang',
      tone: 'primary',
      action: async () => {
        setIsPushingWebhook(true);
        setSyncError('');
        setSyncMessage('');
        try {
          if (serverAvailableRef.current === false) {
            const draftConfig = normalizeSheetsConfig({
              ...sheetsConfigRef.current,
              syncMode: payload.syncMode,
              appsScriptUrl: payload.url,
              spreadsheetId:
                payload.spreadsheetUrlOrId !== undefined
                  ? extractSpreadsheetId(payload.spreadsheetUrlOrId)
                  : sheetsConfigRef.current.spreadsheetId,
              unitTargets: payload.unitTargets || sheetsConfigRef.current.unitTargets,
            });
            const pushedUnits: UnitId[] = [];
            let pushedCount = 0;

            if (isPerUnit) {
              for (const u of UNIT_ORDER) {
                const target = resolveEffectiveAppsScriptTarget(draftConfig, u);
                if (!target) continue;
                const unitRecords = adminRegistrationsRef.current.filter((r) => r.unit === u);
                const resp = await callAppsScriptPost(target.webhookUrl, {
                  action: 'bulk_upsert',
                  spreadsheetId: target.spreadsheetId || undefined,
                  unitTab: UNIT_CONFIGS[u].sheetTabName,
                  summaryTabName: 'Ringkasan_Lembaga',
                  headers: SHEET_HEADERS,
                  formConfig: formConfigRef.current,
                  items: unitRecords.map((rec) => ({
                    id: rec.id,
                    unitTab: UNIT_CONFIGS[u].sheetTabName,
                    row: registrationToSheetRow(
                      { ...rec, syncState: 'synced' },
                      formConfigRef.current[u]
                    ),
                  })),
                });
                if (resp.spreadsheetId) {
                  draftConfig.unitTargets[u].spreadsheetId = resp.spreadsheetId;
                  draftConfig.unitTargets[u].spreadsheetTitle =
                    resp.spreadsheetTitle || draftConfig.unitTargets[u].spreadsheetTitle;
                  draftConfig.unitTargets[u].spreadsheetUrl =
                    resp.spreadsheetUrl ||
                    `https://docs.google.com/spreadsheets/d/${resp.spreadsheetId}`;
                }
                pushedUnits.push(u);
                pushedCount += unitRecords.length;
              }
            } else {
              const target = resolveEffectiveAppsScriptTarget(draftConfig);
              if (!target) throw new Error('URL Apps Script Webhook belum valid.');
              const items = adminRegistrationsRef.current.map((rec) => ({
                id: rec.id,
                unitTab: UNIT_CONFIGS[rec.unit].sheetTabName,
                row: registrationToSheetRow(
                  { ...rec, syncState: 'synced' },
                  formConfigRef.current[rec.unit]
                ),
              }));
              const resp = await callAppsScriptPost(target.webhookUrl, {
                action: 'bulk_upsert',
                spreadsheetId: target.spreadsheetId || undefined,
                requiredTabs: UNIT_ORDER.map((u) => UNIT_CONFIGS[u].sheetTabName),
                summaryTabName: 'Ringkasan_Dashboard',
                headers: SHEET_HEADERS,
                formConfig: formConfigRef.current,
                items,
              });
              if (resp.spreadsheetId) {
                draftConfig.spreadsheetId = resp.spreadsheetId;
                draftConfig.spreadsheetTitle =
                  resp.spreadsheetTitle || draftConfig.spreadsheetTitle;
                draftConfig.spreadsheetUrl =
                  resp.spreadsheetUrl ||
                  `https://docs.google.com/spreadsheets/d/${resp.spreadsheetId}`;
              }
              pushedCount = items.length;
            }

            const syncedRecords = adminRegistrationsRef.current.map((r) => ({
              ...r,
              syncState: 'synced' as const,
            }));
            draftConfig.lastSyncedAt = new Date().toISOString();
            const savedCfg = saveLocalCloudSheetsConfig(draftConfig);
            setAdminRegistrations(syncedRecords);
            setPublicStats(computeUnitStats(syncedRecords, formConfigRef.current));
            setSheetsConfig(savedCfg);
            setSyncMessage(
              isPerUnit
                ? `Berhasil menyimpan & mengirim ${pushedCount} data ke masing-masing Sheet lembaga (${pushedUnits.map((u) => UNIT_CONFIGS[u].shortName).join(', ') || 'terhubung'})!`
                : `Cloud Sync tersimpan & berhasil mengirim ${pushedCount} data pendaftar ke Google Spreadsheet!`
            );
            return;
          }

          const res = await fetch('/api/sync/apps-script-push', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': adminToken,
            },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || 'Gagal mengirim data melalui Apps Script.');
          }
          if (Array.isArray(data.registrations)) {
            setAdminRegistrations(dedupeRegistrations(data.registrations));
          }
          if (data.stats) setPublicStats(data.stats);
          if (data.sheetsConfig) setSheetsConfig(data.sheetsConfig);
          setSyncMessage(
            isPerUnit
              ? `Berhasil menyimpan & mengirim ${data.pushedCount ?? 0} data ke masing-masing Sheet lembaga (${(data.pushedUnits as UnitId[] | undefined)?.map((u) => UNIT_CONFIGS[u].shortName).join(', ') || 'terhubung'})!`
              : `Webhook tersimpan & berhasil mengirim ${data.pushedCount ?? adminRegistrationsRef.current.length} data pendaftar ke Google Spreadsheet!`
          );
        } finally {
          setIsPushingWebhook(false);
        }
      },
    });
  };

  const executeConfirmation = async () => {
    if (!confirmation) return;
    setIsConfirmProcessing(true);
    try {
      await confirmation.action();
      setConfirmation(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Operasi gagal dijalankan.');
      setConfirmation(null);
    } finally {
      setIsConfirmProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7F6] text-[#111815]">
      <TopBar
        activeTab={activeTab}
        isAdmin={isAdmin}
        onNavigate={(tab) => {
          setEditingRecord(null);
          setActiveTab(tab);
          if (serverAvailableRef.current === false && (tab === 'dashboard' || tab === 'login')) {
            void fetchPublicState();
          }
        }}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
        {isLoadingInitial ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-52 bg-[#E7EAE7] rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="h-32 bg-[#E7EAE7] rounded-xl" />
              <div className="h-32 bg-[#E7EAE7] rounded-xl" />
              <div className="h-32 bg-[#E7EAE7] rounded-xl" />
              <div className="h-32 bg-[#E7EAE7] rounded-xl" />
            </div>
          </div>
        ) : activeTab === 'login' ? (
          <PortalLoginView
            stats={computedOrPublicStats}
            onEnterUnitForm={handleEnterUnitForm}
            onOpenDashboard={() => setActiveTab('dashboard')}
            onOpenLookup={() => setActiveTab('lookup')}
          />
        ) : activeTab === 'form' ? (
          (() => {
            const activeFormUnit = editingRecord && isAdmin ? editingRecord.unit : selectedUnit;
            return (
              <RegistrationFormView
                unit={activeFormUnit}
                formConfig={formConfig}
                unitStat={computedOrPublicStats.byUnit[activeFormUnit]}
                editingRecord={isAdmin ? editingRecord : null}
                parentSession={parentSession}
                isSubmitting={isSubmitting}
                onBackToLogin={() => {
                  setEditingRecord(null);
                  setActiveTab('login');
                }}
                onSubmitNew={handleSubmitNew}
                onRequestUpdate={handleRequestUpdate}
              />
            );
          })()
        ) : activeTab === 'receipt' && activeReceipt ? (
          <ReceiptPreviewView
            record={activeReceipt}
            formConfig={formConfig}
            isAdmin={isAdmin}
            onEdit={
              isAdmin
                ? (record) => {
                    setEditingRecord(record);
                    setSelectedUnit(record.unit);
                    setActiveTab('form');
                  }
                : undefined
            }
            onRegisterAnother={() => {
              setEditingRecord(null);
              setActiveTab('login');
            }}
            onOpenDashboard={() => setActiveTab('dashboard')}
            onBackToLogin={() => setActiveTab('login')}
          />
        ) : activeTab === 'lookup' ? (
          <LookupReceiptView
            formConfig={formConfig}
            onLookup={handleLookupRecords}
            onPreviewRecord={(record) => {
              setActiveReceipt(record);
              setActiveTab('receipt');
            }}
          />
        ) : activeTab === 'dashboard' ? (
          <DashboardView
            stats={computedOrPublicStats}
            lastSyncedAt={sheetsConfig.lastSyncedAt}
            isRefreshing={false}
            onRefreshData={() => void fetchPublicState()}
            onRegisterForUnit={(unit) => {
              setSelectedUnit(unit);
              setEditingRecord(null);
              setActiveTab('form');
            }}
          />
        ) : (
          <AdminPanelView
            isAdmin={isAdmin}
            adminLoginError={adminLoginError}
            isLoggingInAdmin={isLoggingInAdmin}
            onAdminLogin={handleAdminLogin}
            onAdminLogout={() => void handleAdminLogout()}
            formConfig={formConfig}
            onSaveFormConfig={handleSaveFormConfig}
            registrations={adminRegistrations}
            stats={computedOrPublicStats}
            onPreviewRecord={(record) => {
              setActiveReceipt(record);
              setActiveTab('receipt');
            }}
            onEditRecord={(record) => {
              setEditingRecord(record);
              setSelectedUnit(record.unit);
              setActiveTab('form');
            }}
            onToggleVerifyRecord={handleToggleVerifyRecord}
            onSaveSelection={handleSaveSelection}
            onRequestDeleteRecord={handleRequestDeleteRecord}
            googleUser={googleUser}
            hasAccessToken={hasAccessToken}
            authModeLabel={authModeLabel}
            isLoggingInGoogle={isLoggingInGoogle}
            isSyncing={isSyncing}
            isTestingWebhook={isTestingWebhook}
            isPushingWebhook={isPushingWebhook}
            syncMessage={syncMessage}
            syncError={syncError}
            sheetsConfig={sheetsConfig}
            hasGlobalCloudConfig={hasGlobalCloudConfig}
            onGoogleLogin={() => void handleGoogleLogin()}
            onDirectGoogleTokenLogin={() => void handleDirectGoogleTokenLogin()}
            onGoogleLogout={() => void handleGoogleLogout()}
            onChangeSyncMode={(mode) => void handleChangeSyncMode(mode)}
            onCreateSpreadsheet={() => void handleCreateSpreadsheet()}
            onCreateUnitSpreadsheet={(unit) => void handleCreateUnitSpreadsheet(unit)}
            onCreateAllUnitSpreadsheets={() => void handleCreateAllUnitSpreadsheets()}
            onConnectSpreadsheetId={handleConnectSpreadsheetId}
            onConnectUnitSpreadsheet={handleConnectUnitSpreadsheet}
            onDisconnectSpreadsheet={handleDisconnectSpreadsheet}
            onDisconnectUnitSpreadsheet={handleDisconnectUnitSpreadsheet}
            onSyncNow={handleRequestSyncNow}
            onToggleAutoSync={(enabled) => void handleToggleAutoSync(enabled)}
            onSaveAppsScriptUrl={(url, spreadsheetUrlOrId) =>
              void handleSaveAppsScriptUrl(url, spreadsheetUrlOrId)
            }
            onSavePerUnitWebhookConfig={(payload) => void handleSavePerUnitWebhookConfig(payload)}
            onTestAppsScript={handleTestAppsScript}
            onPushViaAppsScript={handlePushViaAppsScript}
            onPullViaAppsScript={handlePullViaAppsScript}
          />
        )}
      </main>

      <footer className="border-t border-[#E2E5E2] bg-white py-5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#4E5651] text-center sm:text-left">
          <p>© 2026 {INSTITUTION_NAME} · Josenan, Kota Madiun</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="hover:text-[#14532D]"
            >
              Portal Masuk
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-[#14532D]"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lookup')}
              className="hover:text-[#14532D]"
            >
              Cek Status Pendaftaran
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hover:text-[#14532D]"
            >
              Menu Admin
            </button>
          </div>
        </div>
      </footer>

      <ConfirmationModal
        isOpen={Boolean(confirmation)}
        title={confirmation?.title || ''}
        description={confirmation?.description || ''}
        details={confirmation?.details || []}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.tone}
        isProcessing={isConfirmProcessing}
        onConfirm={() => void executeConfirmation()}
        onCancel={() => setConfirmation(null)}
      />
    </div>
  );
}
