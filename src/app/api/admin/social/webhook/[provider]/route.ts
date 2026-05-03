import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getAdminInsforge } from '@/lib/adminApi';
import {
  parseMetaMessages,
  verifyMetaHandshake,
  verifyMetaSignature,
  type NormalisedSocialMessage,
} from '@/lib/socialWebhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_PROVIDERS = new Set(['instagram', 'facebook', 'tiktok']);

/**
 * Public webhook receiver for Social Inbox.
 *
 *   GET /api/admin/social/webhook/[provider]
 *     - Meta verification handshake (responds with hub.challenge).
 *
 *   POST /api/admin/social/webhook/[provider]
 *     - Verifies HMAC signature against the raw body using
 *       META_APP_SECRET (or TIKTOK_APP_SECRET — TODO when activated).
 *     - Parses incoming DMs / comments and inserts them into
 *       `social_messages` idempotently. The unique index on
 *       (provider, external_id) makes duplicate webhook deliveries safe.
 *
 * NOTE: this endpoint is intentionally unauthenticated. The signature
 * verification is the gate — never bypass it for "easier testing"; a
 * leaked URL would let anyone push messages into the inbox.
 */

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Provider no soportado.' }, { status: 404 });
  }

  // Meta handshake (FB & IG share the same protocol).
  if (provider === 'instagram' || provider === 'facebook') {
    const challenge = verifyMetaHandshake(new URL(request.url).searchParams);
    if (challenge === null) {
      return NextResponse.json({ error: 'verify_token inválido.' }, { status: 403 });
    }
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // TikTok: no GET handshake by default — return 200 so the platform
  // can probe reachability.
  return new NextResponse('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params;
  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Provider no soportado.' }, { status: 404 });
  }

  // We must read the raw body BEFORE parsing so HMAC verification matches
  // the bytes Meta signed. JSON.parse re-serialises with whitespace changes.
  const rawBody = await request.text();

  if (provider === 'instagram' || provider === 'facebook') {
    const sigOk = verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'));
    if (!sigOk) {
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
    }
  } else if (provider === 'tiktok') {
    // TikTok's webhook signature scheme is documented per-product; until
    // a specific product is activated we require an explicit shared
    // secret in the `x-tiktok-token` header to avoid unauth ingestion.
    const expected = process.env.TIKTOK_WEBHOOK_VERIFY_TOKEN;
    const got = request.headers.get('x-tiktok-token');
    if (!expected || got !== expected) {
      return NextResponse.json({ error: 'verify_token inválido.' }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  let messages: NormalisedSocialMessage[] = [];
  if (provider === 'instagram' || provider === 'facebook') {
    messages = parseMetaMessages(payload, provider);
  } else if (provider === 'tiktok') {
    // TikTok payloads vary — store raw envelope so we can iterate later.
    const envelope = payload as { event?: string; client_key?: string; data?: unknown };
    if (envelope?.data) {
      const externalId = `tiktok_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      messages = [
        {
          provider: 'tiktok',
          external_id: externalId,
          thread_id: null,
          sender: null,
          sender_name: null,
          text: typeof envelope.event === 'string' ? envelope.event : null,
          attachments: envelope.data,
          received_at: new Date().toISOString(),
        },
      ];
    }
  }

  if (messages.length === 0) {
    // Acknowledge so Meta doesn't retry — many event types (delivery,
    // read, reaction) deliver here too and are not "messages".
    return NextResponse.json({ ok: true, persisted: 0 });
  }

  let persisted = 0;
  try {
    const client = getAdminInsforge();
    // Insert one-by-one to tolerate the unique-index conflict on each
    // duplicate independently (the SDK's batch insert aborts the whole
    // batch on the first conflict).
    for (const msg of messages) {
      try {
        const { error } = await client.database.from('social_messages').insert([msg]);
        if (!error) persisted += 1;
      } catch {
        /* duplicate or table missing — skip */
      }
    }
  } catch {
    /* DB unavailable; we still ACK so Meta stops retrying */
  }

  return NextResponse.json({ ok: true, persisted });
}
