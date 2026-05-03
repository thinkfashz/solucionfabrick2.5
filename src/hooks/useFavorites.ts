'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { insforge } from '@/lib/insforge';
import { useAuth } from '@/context/AuthContext';

interface UseFavoritesReturn {
  favorites: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggle: (productId: string) => Promise<'added' | 'removed' | 'unauthenticated'>;
  loading: boolean;
  isAuthed: boolean;
}

async function getAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await insforge.auth.refreshSession();
    if (error || !data?.accessToken) return null;
    return data.accessToken;
  } catch {
    return null;
  }
}

/**
 * Client hook that manages the current user's favorites set with optimistic
 * updates. When unauthenticated, `toggle()` returns 'unauthenticated' so the
 * caller can prompt the user to sign in instead of silently failing.
 *
 * The hook fetches once when the user logs in, then mutates locally on toggle
 * and reverts on API failure.
 */
export function useFavorites(): UseFavoritesReturn {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const inFlight = useRef<Map<string, AbortController>>(new Map());

  const isAuthed = !!user?.id;

  // Initial fetch when user becomes available.
  useEffect(() => {
    if (!isAuthed) {
      setFavorites(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }
        const res = await fetch('/api/favorites', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const json = (await res.json().catch(() => null)) as
          | { productIds?: string[] }
          | null;
        if (cancelled) return;
        if (json?.productIds && Array.isArray(json.productIds)) {
          setFavorites(new Set(json.productIds));
        }
      } catch {
        // ignore — favorites are best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed, user?.id]);

  const isFavorite = useCallback(
    (productId: string) => favorites.has(productId),
    [favorites],
  );

  const toggle = useCallback(
    async (
      productId: string,
    ): Promise<'added' | 'removed' | 'unauthenticated'> => {
      if (!isAuthed) return 'unauthenticated';

      // Cancel any in-flight toggle for this product (e.g. double-click).
      const prev = inFlight.current.get(productId);
      if (prev) prev.abort();
      const ctrl = new AbortController();
      inFlight.current.set(productId, ctrl);

      // Optimistic update.
      const wasFav = favorites.has(productId);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (wasFav) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        const token = await getAccessToken();
        if (!token) {
          // Revert.
          setFavorites((prev) => {
            const next = new Set(prev);
            if (wasFav) next.add(productId);
            else next.delete(productId);
            return next;
          });
          return 'unauthenticated';
        }
        const res = await fetch('/api/favorites', {
          method: 'POST',
          signal: ctrl.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productId }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json().catch(() => null)) as
          | { state?: 'added' | 'removed' }
          | null;
        if (!json?.state) {
          throw new Error('respuesta inválida');
        }
        // Reconcile: server is authoritative.
        setFavorites((prev) => {
          const next = new Set(prev);
          if (json.state === 'added') next.add(productId);
          else next.delete(productId);
          return next;
        });
        return json.state;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // A subsequent toggle() superseded this one — its own optimistic
          // update is already applied and will reconcile with the server.
          // Re-throw so callers know the request didn't complete; the local
          // state must not be revert-mutated here (would clobber the newer
          // request's optimistic state).
          throw err;
        }
        // Revert optimistic update on real failure.
        setFavorites((prev) => {
          const next = new Set(prev);
          if (wasFav) next.add(productId);
          else next.delete(productId);
          return next;
        });
        throw err;
      } finally {
        // Only clear the in-flight slot if it still holds **our** controller.
        // A subsequent toggle for the same product replaces the entry with a
        // fresh AbortController; deleting unconditionally here would also
        // remove that newer controller, leaving a future toggle with no way
        // to abort an even later double-click.
        if (inFlight.current.get(productId) === ctrl) {
          inFlight.current.delete(productId);
        }
      }
    },
    [favorites, isAuthed],
  );

  return {
    favorites,
    isFavorite,
    toggle,
    loading: loading || authLoading,
    isAuthed,
  };
}
