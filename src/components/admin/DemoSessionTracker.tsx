'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Silently tracks page visits for demo (viewer) sessions.
 * Sends enter/leave events to /api/admin/demo/events.
 * Only rendered when role === 'viewer' — invisible to the visitor.
 */
export default function DemoSessionTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    if (sessionIdRef.current) return;
    try {
      let sid = sessionStorage.getItem('_dsid');
      if (!sid) {
        sid = crypto.randomUUID();
        sessionStorage.setItem('_dsid', sid);
      }
      sessionIdRef.current = sid;
    } catch {
      sessionIdRef.current = crypto.randomUUID();
    }
  }, []);

  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !pathname) return;

    const enterMs = Date.now();
    let eid: string | null = null;

    fetch('/api/admin/demo/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enter', page: pathname, session_id: sessionId }),
    })
      .then((r) => r.json())
      .then((d: { id?: string }) => { eid = d.id ?? null; })
      .catch(() => {});

    return () => {
      const duration_ms = Date.now() - enterMs;
      if (!eid) return;

      const body = JSON.stringify({
        action: 'leave',
        event_id: eid,
        duration_ms,
        session_id: sessionId,
      });

      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/admin/demo/events',
            new Blob([body], { type: 'application/json' }),
          );
        } else {
          fetch('/api/admin/demo/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch { /* silently ignore */ }
    };
  }, [pathname]);

  return null;
}
