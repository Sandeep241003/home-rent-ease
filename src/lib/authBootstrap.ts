const ACTIVE_BACKEND_URL = import.meta.env.VITE_SUPABASE_URL;
const ACTIVE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ACTIVE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const AUTH_KEY_REGEX = /^sb-([a-z0-9]{20})-auth-token(?:-code-verifier)?$/i;

const getAnonRefFromKey = (key: string | undefined): string | null => {
  if (!key) return null;

  try {
    const payloadPart = key.split('.')[1];
    if (!payloadPart) return null;

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded));
    return typeof payload?.ref === 'string' ? payload.ref : null;
  } catch {

    return null;
  }
};

const readStoredRefreshToken = (storage: Storage, projectId: string): string | null => {
  const serialized = storage.getItem(`sb-${projectId}-auth-token`);
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized);
    const token =
      parsed?.currentSession?.refresh_token ??
      parsed?.session?.refresh_token ??
      parsed?.refresh_token ??
      null;

    return typeof token === 'string' ? token : null;
  } catch {
    return null;
  }
};

const clearStaleAuthStorage = () => {
  const storages: Storage[] = [localStorage, sessionStorage];

  storages.forEach((storage) => {
    Object.keys(storage).forEach((key) => {
      const match = key.match(AUTH_KEY_REGEX);
      if (match && ACTIVE_PROJECT_ID && match[1] !== ACTIVE_PROJECT_ID) {
        storage.removeItem(key);
      }

      if (key === 'supabase.auth.token') {
        storage.removeItem(key);
      }
    });
  });

  if (!ACTIVE_PROJECT_ID) return;

  const localRefreshToken = readStoredRefreshToken(localStorage, ACTIVE_PROJECT_ID);
  const sessionRefreshToken = readStoredRefreshToken(sessionStorage, ACTIVE_PROJECT_ID);
  const activeRefreshToken = localRefreshToken ?? sessionRefreshToken;

  if (activeRefreshToken && activeRefreshToken.length < 24) {
    localStorage.removeItem(`sb-${ACTIVE_PROJECT_ID}-auth-token`);
    localStorage.removeItem(`sb-${ACTIVE_PROJECT_ID}-auth-token-code-verifier`);
    sessionStorage.removeItem(`sb-${ACTIVE_PROJECT_ID}-auth-token`);
    sessionStorage.removeItem(`sb-${ACTIVE_PROJECT_ID}-auth-token-code-verifier`);
    console.warn('[AuthBootstrap] Removed malformed stored refresh token');
  }
};

(() => {
  console.info('[AuthBootstrap] Backend config at startup', {
    backendUrl: ACTIVE_BACKEND_URL,
    projectId: ACTIVE_PROJECT_ID,
  });

  if (!ACTIVE_BACKEND_URL || !ACTIVE_PUBLISHABLE_KEY || !ACTIVE_PROJECT_ID) {
    console.error('[AuthBootstrap] Missing backend env configuration', {
      hasBackendUrl: Boolean(ACTIVE_BACKEND_URL),
      hasPublishableKey: Boolean(ACTIVE_PUBLISHABLE_KEY),
      hasProjectId: Boolean(ACTIVE_PROJECT_ID),
    });
    return;
  }

  const urlHasProjectId = ACTIVE_BACKEND_URL.includes(ACTIVE_PROJECT_ID);
  const keyRef = getAnonRefFromKey(ACTIVE_PUBLISHABLE_KEY);
  const keyMatchesProject = keyRef === ACTIVE_PROJECT_ID;

  if (!urlHasProjectId || !keyMatchesProject) {
    console.error('[AuthBootstrap] Backend credentials mismatch detected', {
      backendUrl: ACTIVE_BACKEND_URL,
      projectId: ACTIVE_PROJECT_ID,
      keyRef,
      urlHasProjectId,
      keyMatchesProject,
    });
  }

  clearStaleAuthStorage();
})();
