'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Auto-logout for the admin panel after `timeoutMs` of user inactivity.
 *
 * "Activity" is defined as mousemove / keydown / mousedown / touchstart / scroll
 * anywhere inside the window. When the idle timer fires, the admin cookie is
 * cleared via `/api/admin/logout` and the user is redirected to `/admin/login`.
 */
export function useAdminIdleLogout(timeoutMs = 10 * 60 * 1000) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function triggerLogout() {
      if (firedRef.current) return;
      firedRef.current = true;
      try {
        await fetch('/api/admin/logout', { method: 'POST' });
      } catch {
        // Ignore network errors — middleware will catch the expired cookie.
      }
      router.replace('/admin/login?idle=1');
    }

    function resetTimer() {
      if (firedRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void triggerLogout(), timeoutMs);
    }

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    for (const evt of events) {
      window.addEventListener(evt, resetTimer, { passive: true });
    }
    // Also reset when the tab returns to the foreground.
    document.addEventListener('visibilitychange', resetTimer);
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const evt of events) window.removeEventListener(evt, resetTimer);
      document.removeEventListener('visibilitychange', resetTimer);
    };
  }, [router, timeoutMs]);
}
