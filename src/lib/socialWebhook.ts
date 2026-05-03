import 'server-only';
import crypto from 'node:crypto';

/**
 * Helpers for the Social Inbox webhook receivers.
 *
 * Meta (Facebook/Instagram) signs webhook payloads with HMAC-SHA256
 * over the raw request body using the **App Secret** as the key. The
 * resulting digest is sent in `x-hub-signature-256: sha256=<hex>`. The
 * receiver MUST verify this against the raw bytes — any JSON
 * re-serialisation will produce a different digest and reject valid
 * payloads. The two helpers below encapsulate that contract.
 *
 * TikTok uses a similar scheme but with the header `tiktok-signature`
 * and a different key strategy depending on the API version. We expose
 * a generic constant-time comparator so callers can reuse the logic.
 */

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Verifies an `x-hub-signature-256` header against the raw body.
 * Returns false when the secret is not configured (so webhooks are
 * rejected by default in prod) or when the digest doesn't match.
 */
export function verifyMetaSignature(rawBody: string, headerValue: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;
  if (!headerValue || !headerValue.startsWith('sha256=')) return false;
  const provided = headerValue.slice('sha256='.length).trim();
  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  return timingSafeEqualHex(provided, expected);
}

/**
 * Performs Meta's GET verification handshake. Returns the challenge
 * string when valid, or null when the verify token is wrong/missing.
 */
export function verifyMetaHandshake(searchParams: URLSearchParams): string | null {
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (mode !== 'subscribe' || !expected) return null;
  if (token !== expected) return null;
  return challenge ?? '';
}

/* -------------------------- Payload normalisation ------------------------- */

export interface NormalisedSocialMessage {
  provider: 'instagram' | 'facebook' | 'tiktok' | 'whatsapp';
  external_id: string;
  thread_id: string | null;
  sender: string | null;
  sender_name: string | null;
  text: string | null;
  attachments: unknown;
  received_at: string;
}

/**
 * Best-effort parser for Meta's Messenger/IG webhook payload. The
 * shape is documented at https://developers.facebook.com/docs/messenger-platform/reference/webhook-events/messages
 * and shares the same `entry[].messaging[]` envelope between FB & IG.
 *
 * We deliberately accept partial payloads — Meta also sends `read`,
 * `delivery`, `reaction` events on the same channel; for those we
 * return an empty array.
 */
export function parseMetaMessages(
  payload: unknown,
  provider: 'instagram' | 'facebook',
): NormalisedSocialMessage[] {
  if (!payload || typeof payload !== 'object') return [];
  const out: NormalisedSocialMessage[] = [];
  const obj = payload as { entry?: unknown };
  const entries = Array.isArray(obj.entry) ? obj.entry : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const msgEnvs = (entry as { messaging?: unknown }).messaging;
    if (!Array.isArray(msgEnvs)) continue;
    for (const env of msgEnvs) {
      if (!env || typeof env !== 'object') continue;
      const e = env as {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: {
          mid?: string;
          text?: string;
          attachments?: unknown;
          is_echo?: boolean;
        };
      };
      // Skip echoes (our own outgoing messages reflected back to us).
      if (!e.message || e.message.is_echo) continue;
      const externalId = e.message.mid;
      const senderId = e.sender?.id;
      if (!externalId || !senderId) continue;
      out.push({
        provider,
        external_id: externalId,
        thread_id: senderId,
        sender: senderId,
        sender_name: null,
        text: typeof e.message.text === 'string' ? e.message.text : null,
        attachments: e.message.attachments ?? null,
        received_at: e.timestamp
          ? new Date(e.timestamp).toISOString()
          : new Date().toISOString(),
      });
    }
  }
  return out;
}
