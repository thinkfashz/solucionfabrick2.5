'use client';

import { useEffect } from 'react';

/**
 * Registers the /sw.js service worker on production-like origins.
 * No-op during Next.js dev (npm run dev) to avoid confusing HMR.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // In dev, aggressively unregister any old SW and clear its caches. This
    // avoids stale localhost deployments pinning old chunk URLs like
    // `localhost:3000/_next/static/...` after the app restarts on another port.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => undefined);
        });
      }).catch(() => undefined);

      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => undefined);
      }
      return;
    }

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn('[SW] registration failed:', err);
        });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });

    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
