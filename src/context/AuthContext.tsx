'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

interface AuthCtxValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  refresh: async () => {},
});

function extractUser(raw: Record<string, unknown>): AuthUser {
  const meta = (raw.user_metadata ?? raw.raw_user_meta_data ?? {}) as Record<string, unknown>;
  const name =
    (meta.name as string | undefined) ||
    (meta.full_name as string | undefined) ||
    (meta.display_name as string | undefined) ||
    undefined;
  return {
    id: (raw.id as string) || '',
    email: (raw.email as string | undefined) || undefined,
    name,
  };
}

/**
 * Typed interface for the extended InsForge auth object.
 * InsForge SDK is a custom BaaS whose TypeScript types don't expose
 * getUser / getSession / onAuthStateChange / signOut – but the runtime
 * object may include them (Supabase-compatible surface). We call each
 * method only after verifying it exists at runtime.
 */
interface InsforgeAuthExtended {
  getUser?: () => Promise<{ data?: { user?: Record<string, unknown> }; error?: unknown }>;
  getSession?: () => Promise<{ data?: { session?: { user?: Record<string, unknown> } }; error?: unknown }>;
  onAuthStateChange?: (
    cb: (event: string, session: Record<string, unknown> | null) => void
  ) => { data?: { subscription?: { unsubscribe: () => void } } };
  signOut?: () => Promise<unknown>;
}

function getExtendedAuth(): InsforgeAuthExtended {
  return insforge.auth as InsforgeAuthExtended;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const auth = getExtendedAuth();
      if (typeof auth.getUser === 'function') {
        const { data, error } = await auth.getUser();
        if (!error && data?.user) {
          setUser(extractUser(data.user));
          return;
        }
      }
      if (typeof auth.getSession === 'function') {
        const { data, error } = await auth.getSession();
        if (!error && data?.session?.user) {
          setUser(extractUser(data.session.user));
          return;
        }
      }
      setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();

    // Subscribe to auth state changes if available
    try {
      const auth = getExtendedAuth();
      if (typeof auth.onAuthStateChange === 'function') {
        const { data } = auth.onAuthStateChange(
          (_event: string, session: Record<string, unknown> | null) => {
            if (session?.user) {
              setUser(extractUser(session.user as Record<string, unknown>));
            } else {
              setUser(null);
            }
            setLoading(false);
          }
        );
        const subscription = data?.subscription;
        return () => {
          if (typeof subscription?.unsubscribe === 'function') {
            subscription.unsubscribe();
          }
        };
      }
    } catch {
      // onAuthStateChange not available in this InsForge version
    }

    return undefined;
  }, [loadUser]);

  const signOut = useCallback(async () => {
    try {
      const auth = getExtendedAuth();
      if (typeof auth.signOut === 'function') {
        await auth.signOut();
      }
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, signOut, refresh: loadUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
