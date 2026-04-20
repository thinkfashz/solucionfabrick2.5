'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { insforge } from '@/lib/insforge';
import type { UserSchema } from '@insforge/sdk';

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

function extractUser(raw: UserSchema): AuthUser {
  return {
    id: raw.id,
    email: raw.email,
    name: raw.profile?.name ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const { data, error } = await insforge.auth.getCurrentUser();
      if (!error && data?.user) {
        setUser(extractUser(data.user));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const signOut = useCallback(async () => {
    try {
      await insforge.auth.signOut();
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
