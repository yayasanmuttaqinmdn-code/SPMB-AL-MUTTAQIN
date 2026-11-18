import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SHEETS_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'select_account',
});

// Strict in-memory token cache (never persisted to localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string; error_description?: string }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
        };
      };
    };
  }
}

let gisLoadPromise: Promise<void> | null = null;

export function preloadGisClient(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-gis-client="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Identity Services.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gisClient = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoadPromise = null;
      reject(new Error('Gagal memuat skrip Google Sign-In dari accounts.google.com.'));
    };
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

export function formatGoogleAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  const code = (err as { code?: string } | null)?.code || '';

  if (code === 'auth/popup-blocked' || raw.includes('popup-blocked')) {
    return 'Popup login Google diblokir oleh browser atau iframe preview. Izinkan popup browser, klik "Buka di Tab Baru", atau gunakan "Login Google Langsung" / Cara 2 (Webhook Apps Script).';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Jendela login Google ditutup sebelum proses selesai. Silakan klik "Sign in with Google" lagi dan selesaikan persetujuan.';
  }
  if (code === 'auth/unauthorized-domain' || raw.includes('unauthorized-domain')) {
    return 'Domain URL ini belum diizinkan pada Firebase Auth. Gunakan tombol "Login Google Langsung (Alternatif)" atau gunakan Cara 2 (Webhook Apps Script 24/7).';
  }
  if (code === 'auth/operation-not-supported-in-this-environment') {
    return 'Browser/iframe saat ini tidak mendukung popup Firebase Auth. Klik "Buka di Tab Baru" atau gunakan Cara 2 (Webhook Apps Script 24/7).';
  }
  if (raw.includes('access_denied')) {
    return 'Akses Google Sheets tidak disetujui. Pastikan Anda mencentang izin akses Google Sheets saat login.';
  }
  return raw || 'Gagal masuk dengan akun Google. Coba kembali atau gunakan Cara 2 (Webhook Apps Script).';
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else if (!cachedAccessToken) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Sheets dari sesi masuk.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    throw new Error(formatGoogleAuthError(err));
  } finally {
    isSigningIn = false;
  }
};

export const googleDirectTokenSignIn = async (): Promise<{ accessToken: string; emailLabel: string }> => {
  const clientId = firebaseConfig.oAuthClientId;
  if (!clientId) {
    throw new Error('Client ID OAuth Google belum dikonfigurasi.');
  }

  await preloadGisClient();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error('Layanan Google Identity Services belum siap. Muat ulang halaman lalu coba lagi.');
  }

  const accessToken = await new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: SHEETS_SCOPES.join(' '),
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(formatGoogleAuthError(new Error(resp.error_description || resp.error))));
          return;
        }
        if (!resp.access_token) {
          reject(new Error('Token akses Google Sheets tidak diterima.'));
          return;
        }
        resolve(resp.access_token);
      },
      error_callback: (err) => {
        if (err.type === 'popup_closed') {
          reject(new Error('Jendela login Google ditutup sebelum selesai.'));
        } else if (err.type === 'popup_failed_to_open') {
          reject(
            new Error(
              'Popup browser diblokir. Izinkan popup untuk situs ini atau klik "Buka di Tab Baru".'
            )
          );
        } else {
          reject(new Error(err.message || 'Gagal membuka login Google OAuth.'));
        }
      },
    });
    client.requestAccessToken({ prompt: 'consent select_account' });
  });

  cachedAccessToken = accessToken;
  return { accessToken, emailLabel: 'Akun Google Panitia (Token Aktif)' };
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearAccessToken = (): void => {
  cachedAccessToken = null;
};

export const logout = async (): Promise<void> => {
  cachedAccessToken = null;
  await auth.signOut().catch(() => undefined);
};
