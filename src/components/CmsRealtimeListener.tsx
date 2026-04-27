'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Subscribes to `/api/cms/events` (Server-Sent Events) and triggers a soft
 * `router.refresh()` whenever an event relevant to the current page arrives.
 *
 * Mounted from the root layout so every public page gets live-updates from
 * admin saves (blog, home sections, footer copyright, social links, media).
 *
 * Behaviour notes:
 *   - Skips itself on `/admin/*` routes (admin uses its own forms + state).
 *   - Coalesces refreshes with a 400ms debounce to avoid thrashing under
 *     rapid-fire reorder/save bursts.
 *   - Auto-reconnects with exponential backoff if the EventSource drops.
 *   - Never throws; degrades silently if SSE is unavailable.
 */
export default function CmsRealtimeListener() {
  const router = useRouter();
  const pathname = usePathname();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.EventSource !== 'function') return;
    // Don't run inside /admin — admins use their own forms; refreshing while
    // they're typing would be hostile.
    if (pathname && pathname.startsWith('/admin')) return;

    let es: EventSource | null = null;
    let closed = false;
    let backoff = 1_000;
    let reconnect: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        try {
          router.refresh();
        } catch {
          /* noop */
        }
      }, 400);
    };

    const isRelevant = (topic: string): boolean => {
      // Decide based on current path so blog edits don't refresh /tienda etc.
      const p = pathname || '/';
      switch (topic) {
        case 'blog':
          return p === '/blog' || p.startsWith('/blog/');
        case 'home':
          return p === '/';
        case 'settings':
          // Footer/social/copyright appear on every public page.
          return true;
        case 'media':
          // Media changes only matter if the page actually displays the asset.
          // Cheap heuristic: refresh blog and home where covers are common.
          return p === '/' || p === '/blog' || p.startsWith('/blog/');
        case 'materials':
          // Cotizador catalog — refresh the public budget builder live.
          return p === '/presupuesto' || p.startsWith('/presupuesto/');
        default:
          return false;
      }
    };

    const connect = () => {
      try {
        es = new EventSource('/api/cms/events');
        es.addEventListener('open', () => {
          backoff = 1_000;
        });
        es.addEventListener('cms-change', (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data) as { topic?: string };
            if (data && typeof data.topic === 'string' && isRelevant(data.topic)) {
              scheduleRefresh();
            }
          } catch {
            // Ignore malformed payloads.
          }
        });
        es.addEventListener('error', () => {
          if (closed || !es) return;
          es.close();
          es = null;
          // Exponential backoff capped at 30s.
          reconnect = setTimeout(() => {
            if (!closed) connect();
          }, backoff);
          backoff = Math.min(backoff * 2, 30_000);
        });
      } catch {
        // EventSource construction failed — give up silently.
      }
    };

    connect();

    return () => {
      closed = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (reconnect) clearTimeout(reconnect);
      if (es) es.close();
    };
  }, [pathname, router]);

  return null;
}
