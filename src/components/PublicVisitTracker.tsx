'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const EXCLUDED_PREFIXES = ['/admin', '/api', '/auth', '/checkout'];
const VISITOR_KEY = 'fabrick_visitor_id';

function visitorId() {
  try {
    const current = window.localStorage.getItem(VISITOR_KEY);
    if (current) return current;
    const next = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return `session-${Date.now()}`;
  }
}

function referrerHost() {
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return null;
  }
}

export default function PublicVisitTracker() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    const sessionKey = `fabrick_view:${pathname}`;
    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, '1');
    } catch {}

    const body = JSON.stringify({
      event: 'page_view',
      user_id: visitorId(),
      platform: 'web',
      meta: { path: pathname, referrer: referrerHost() },
    });

    void fetch('/api/pwa/track', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
