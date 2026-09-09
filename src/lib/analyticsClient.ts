'use client';

export const ANALYTICS_CONSENT_STORAGE_KEY = 'fabrick_cookie_consent_v1';
export const ANALYTICS_CONSENT_EVENT = 'fabrick:cookie-consent';

export type AnalyticsConsent = 'accepted' | 'rejected' | null;
export type FunnelEventName =
  | 'view_air_calculator'
  | 'select_air_room'
  | 'air_result'
  | 'view_item'
  | 'select_item'
  | 'begin_checkout'
  | 'purchase';

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function parseAnalyticsConsent(raw: string | null | undefined): AnalyticsConsent {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { value?: unknown };
    return parsed?.value === 'accepted' ? 'accepted' : parsed?.value === 'rejected' ? 'rejected' : null;
  } catch {
    return null;
  }
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === 'undefined') return null;
  try {
    return parseAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function mapMetaEvent(name: FunnelEventName) {
  if (name === 'view_item') return 'ViewContent';
  if (name === 'select_item') return 'ViewContent';
  if (name === 'begin_checkout') return 'InitiateCheckout';
  if (name === 'purchase') return 'Purchase';
  return null;
}

export function shouldPersistFunnelEvent(name: FunnelEventName) {
  return name !== 'select_air_room' && name !== 'view_item';
}

function sanitizeParams(params: AnalyticsParams) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

function markSessionDedupe(key: string) {
  if (typeof window === 'undefined') return false;
  try {
    const storageKey = `fabrick_analytics_event:${key}`;
    if (window.sessionStorage.getItem(storageKey)) return true;
    window.sessionStorage.setItem(storageKey, new Date().toISOString());
  } catch {
    // Analytics must never block a commercial flow because storage is unavailable.
  }
  return false;
}

export function trackMarketingEvent(name: FunnelEventName, params: AnalyticsParams = {}) {
  if (typeof window === 'undefined' || getAnalyticsConsent() !== 'accepted') return;
  const clean = sanitizeParams(params);
  window.gtag?.('event', name, clean);
  const metaEvent = mapMetaEvent(name);
  if (metaEvent) window.fbq?.('track', metaEvent, clean);
  else window.fbq?.('trackCustom', name, clean);
}

export function persistFunnelEvent(name: FunnelEventName, params: AnalyticsParams = {}, dedupeKey?: string) {
  if (typeof window === 'undefined' || !shouldPersistFunnelEvent(name)) return;
  const key = dedupeKey || `${name}:${JSON.stringify(params)}`;
  if (markSessionDedupe(key)) return;
  void fetch('/api/pwa/track', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: name, platform: 'web', meta: sanitizeParams(params) }),
  }).catch(() => undefined);
}

export function trackFunnelEvent(name: FunnelEventName, params: AnalyticsParams = {}, options?: { persist?: boolean; dedupeKey?: string }) {
  trackMarketingEvent(name, params);
  if (options?.persist ?? shouldPersistFunnelEvent(name)) persistFunnelEvent(name, params, options?.dedupeKey);
}
