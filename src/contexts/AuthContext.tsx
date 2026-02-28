import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

const BACKEND_URL = import.meta.env.VITE_SUPABASE_URL;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

const isNetworkAuthError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('timeout') ||
      name.includes('abort') ||
      name.includes('network')
    );
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    return Number((error as { status?: number }).status) === 0;
  }

  return false;
};

const clearLocalAuthSession = (reason: string) => {
  const clearAuthKeysFromStorage = (storage: Storage) => {
    const authKeyRegex = /^sb-[a-z0-9]{20}-auth-token(?:-code-verifier)?$/i;

    Object.keys(storage).forEach((key) => {
      if (authKeyRegex.test(key) || key === 'supabase.auth.token') {
        storage.removeItem(key);
      }
    });
  };

  try {
    clearAuthKeysFromStorage(localStorage);
    clearAuthKeysFromStorage(sessionStorage);
    console.warn('[Auth] Cleared local auth session', { reason });
  } catch (storageError) {
    console.error('[Auth] Failed to clear local session storage', storageError);
  }
};

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Backend connection timeout'));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!BACKEND_URL || !PUBLISHABLE_KEY) {
      console.error('[Auth] Backend client misconfigured', {
        hasBackendUrl: Boolean(BACKEND_URL),
        hasPublishableKey: Boolean(PUBLISHABLE_KEY),
      });
      setSession(null);
      setLoading(false);
      return;
    }

    console.info('[Auth] Backend auth bootstrap', {
      backendUrl: BACKEND_URL,
      projectId: PROJECT_ID,
    });

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.info('[Auth] onAuthStateChange', {
        event,
        hasSession: Boolean(session),
      });

      if (event === 'TOKEN_REFRESHED' && !session) {
        clearLocalAuthSession('token refresh returned empty session');
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setLoading(false);
    });

    // Then check for existing session
    withTimeout(supabase.auth.getSession(), 10000)
      .then(({ data: { session }, error }) => {
        if (!mounted) return;

        if (error) {
          console.error('[Auth] getSession failed', {
            backendUrl: BACKEND_URL,
            message: error.message,
          });

          if (isNetworkAuthError(error)) {
            clearLocalAuthSession('network error during getSession');
          }

          setSession(null);
        } else {
          setSession(session);
        }

        setLoading(false);
      })
      .catch(async (error) => {
        if (!mounted) return;

        console.error('[Auth] session bootstrap failed', {
          backendUrl: BACKEND_URL,
          message: error instanceof Error ? error.message : String(error),
        });

        clearLocalAuthSession('session bootstrap timeout/failure');
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('[Auth] Remote sign out failed, applying local sign out fallback', error);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } finally {
      clearLocalAuthSession('manual sign out');
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

