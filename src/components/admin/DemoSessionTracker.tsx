'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const row = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`));
  return row ? decodeURIComponent(row.split('=').slice(1).join('=')) : null;
}

function getSessionId(): string {
  const cookieSid = getCookie('sf_demo_sid');
  if (cookieSid) return cookieSid;
  try {
    let sid = sessionStorage.getItem('_sf_demo_sid');
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem('_sf_demo_sid', sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
}

function postEvent(payload: Record<string, unknown>, keepalive = false) {
  const body = JSON.stringify(payload);
  try {
    if (keepalive && navigator.sendBeacon) {
      navigator.sendBeacon('/api/admin/demo/events', new Blob([body], { type: 'application/json' }));
      return;
    }
  } catch {}

  fetch('/api/admin/demo/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive,
  }).catch(() => {});
}

export default function DemoSessionTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string>('');
  const eventIdRef = useRef<string | null>(null);
  const enterMsRef = useRef<number>(0);
  const sentLeaveRef = useRef(false);

  useEffect(() => {
    if (!sessionIdRef.current) sessionIdRef.current = getSessionId();
  }, []);

  useEffect(() => {
    const sessionId = sessionIdRef.current || getSessionId();
    if (!pathname || !sessionId) return;

    eventIdRef.current = null;
    sentLeaveRef.current = false;
    enterMsRef.current = Date.now();

    fetch('/api/admin/demo/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enter', page: pathname, session_id: sessionId }),
      keepalive: true,
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { id?: string } | null) => { eventIdRef.current = data?.id ?? null; })
      .catch(() => {});

    const leave = () => {
      if (sentLeaveRef.current) return;
      sentLeaveRef.current = true;
      const eventId = eventIdRef.current;
      if (!eventId) return;
      const duration_ms = Math.max(0, Date.now() - enterMsRef.current);
      postEvent({ action: 'leave', event_id: eventId, duration_ms, session_id: sessionId }, true);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') leave();
    };

    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', leave);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      leave();
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  return null;
}
