'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const EXCLUDED_PREFIXES = ['/admin', '/api', '/auth', '/checkout'];
const VISITOR_KEY = 'fabrick_visitor_id';
const SESSION_KEY = 'fabrick_session_id';

function stableId(key: string, prefix: string) {
  try {
    const current = window.localStorage.getItem(key);
    if (current) return current;
    const next = globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, next);
    return next;
  } catch {
    return `${prefix}-${Date.now()}`;
  }
}

function sessionId() {
  try {
    const current = window.sessionStorage.getItem(SESSION_KEY);
    if (current) return current;
    const next = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return `session-${Date.now()}`;
  }
}

function referrerInfo() {
  if (!document.referrer) return { referrer: null, referrerUrl: null };
  try {
    const url = new URL(document.referrer);
    return { referrer: url.hostname, referrerUrl: url.href.slice(0, 500) };
  } catch {
    return { referrer: null, referrerUrl: null };
  }
}

function deviceType() {
  const width = window.innerWidth;
  const ua = navigator.userAgent;
  if (/bot|crawler|spider|crawling/i.test(ua)) return 'bot';
  if (/tablet|ipad/i.test(ua) || (width >= 768 && width < 1100)) return 'tablet';
  if (/mobi|android|iphone/i.test(ua) || width < 768) return 'mobile';
  return 'desktop';
}

function browserName() {
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Otro';
}

export default function PublicVisitTracker() {
  const pathname = usePathname() || '/';

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;
    const startedAt = Date.now();
    const visitor = stableId(VISITOR_KEY, 'visitor');
    const session = sessionId();
    const searchParams = new URLSearchParams(window.location.search);
    const query = searchParams.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    const referrer = referrerInfo();
    const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].map((key) => [key, searchParams.get(key) || null]));

    const pageViewBody = JSON.stringify({
      event: 'page_view',
      user_id: visitor,
      platform: 'web',
      meta: {
        path: pathname,
        full_path: fullPath,
        session_id: session,
        title: document.title.slice(0, 180),
        referrer: referrer.referrer,
        referrer_url: referrer.referrerUrl,
        browser: browserName(),
        device: deviceType(),
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...utm,
      },
    });

    void fetch('/api/pwa/track', { method: 'POST', body: pageViewBody, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);

    let sent = false;
    const sendDuration = () => {
      if (sent) return;
      sent = true;
      const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const payload = JSON.stringify({ event: 'session_end', user_id: visitor, platform: 'web', meta: { path: pathname, session_id: session, duration_seconds: durationSeconds } });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/pwa/track', new Blob([payload], { type: 'application/json' }));
      else void fetch('/api/pwa/track', { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
    };

    window.addEventListener('pagehide', sendDuration, { once: true });
    return () => {
      window.removeEventListener('pagehide', sendDuration);
      sendDuration();
    };
  }, [pathname]);

  return null;
}
