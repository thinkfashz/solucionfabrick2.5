export const ANALYTICS_CONSENT_STORAGE_KEY = 'fabrick_cookie_consent_v1';
export const ANALYTICS_CONSENT_EVENT = 'fabrick:analytics-consent';

export type AnalyticsConsentValue = 'accepted' | 'rejected';

export interface AnalyticsConsentRecord {
  value: AnalyticsConsentValue;
  at?: string;
}

export function parseAnalyticsConsent(raw: string | null | undefined): AnalyticsConsentRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AnalyticsConsentRecord>;
    if (parsed.value !== 'accepted' && parsed.value !== 'rejected') return null;
    return { value: parsed.value, at: typeof parsed.at === 'string' ? parsed.at : undefined };
  } catch {
    return null;
  }
}

export function readAnalyticsConsent(): AnalyticsConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseAnalyticsConsent(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return readAnalyticsConsent()?.value === 'accepted';
}
