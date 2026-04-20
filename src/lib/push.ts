/**
 * Web Push server helpers.
 *
 * Feature-gated on three environment variables:
 *   - VAPID_PUBLIC_KEY
 *   - VAPID_PRIVATE_KEY
 *   - VAPID_SUBJECT    (mailto:someone@solucionesfabrick.com)
 *
 * When any of them is missing, `isPushEnabled()` returns false and the API
 * routes short-circuit with 503. This lets us ship the feature safely to prod
 * without breaking deployments that haven't configured VAPID yet.
 *
 * To generate a keypair:
 *   npx web-push generate-vapid-keys
 */

import type { PushSubscription, SendResult } from 'web-push';

export const PUBLIC_VAPID_KEY_ENV = 'NEXT_PUBLIC_VAPID_PUBLIC_KEY';

export function getPublicVapidKey(): string | null {
  // Prefer NEXT_PUBLIC_VAPID_PUBLIC_KEY (client can read it). Fall back to
  // VAPID_PUBLIC_KEY for server-only consumers.
  return (
    process.env[PUBLIC_VAPID_KEY_ENV] ||
    process.env.VAPID_PUBLIC_KEY ||
    null
  );
}

export function isPushEnabled(): boolean {
  return Boolean(
    getPublicVapidKey() &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

let configured = false;
type WebPushModule = typeof import('web-push');

async function getWebPush(): Promise<WebPushModule | null> {
  if (!isPushEnabled()) return null;
  // Dynamic import so that Edge runtime doesn't try to bundle `web-push`
  // (which relies on Node crypto).
  const webPush = await import('web-push');
  if (!configured) {
    webPush.setVapidDetails(
      process.env.VAPID_SUBJECT as string,
      getPublicVapidKey() as string,
      process.env.VAPID_PRIVATE_KEY as string,
    );
    configured = true;
  }
  return webPush;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

/**
 * Send a notification to a single subscription.
 * Returns 'ok' on success, 'gone' if the subscription is no longer valid
 * (HTTP 404/410 from the push service — caller should delete it), or 'error'.
 */
export async function sendPush(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<'ok' | 'gone' | 'error'> {
  const webPush = await getWebPush();
  if (!webPush) return 'error';
  try {
    const result: SendResult = await webPush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    if (result.statusCode >= 200 && result.statusCode < 300) return 'ok';
    if (result.statusCode === 404 || result.statusCode === 410) return 'gone';
    return 'error';
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) return 'gone';
    console.error('[push] sendNotification failed:', err);
    return 'error';
  }
}

/** Basic shape validation for an incoming PushSubscription JSON. */
export function isValidSubscription(value: unknown): value is PushSubscription {
  if (!value || typeof value !== 'object') return false;
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof sub.endpoint !== 'string' || !/^https:\/\//.test(sub.endpoint)) return false;
  if (!sub.keys || typeof sub.keys !== 'object') return false;
  if (typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return false;
  return true;
}
