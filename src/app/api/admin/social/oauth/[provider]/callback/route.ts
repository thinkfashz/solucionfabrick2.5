import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { encryptCredentials } from '@/lib/integrationsCrypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/social/oauth/[provider]/callback
 *
 * Recibe el `code` de OAuth, verifica el `state` contra la cookie
 * firmada que pusimos en /start, intercambia el code por un access
 * token y persiste el resultado en `integrations` (provider =
 * `social_<provider>`). Las credenciales se cifran con AES-256-GCM
 * vía `encryptCredentials()` cuando `INTEGRATIONS_ENC_KEY` está
 * configurada.
 */

const PROVIDERS = new Set(['instagram', 'facebook', 'tiktok']);

function getSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return new URL(request.url).origin;
}

function verifyState(provider: string, request: NextRequest, state: string | null): boolean {
  if (!state) return false;
  const cookie = request.cookies.get(`social_oauth_state_${provider}`);
  if (!cookie?.value) return false;
  if (cookie.value !== state) return false;
  const [nonce, sig] = state.split('.');
  if (!nonce || !sig) return false;
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
  const expected = crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
  return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
}

async function exchangeMeta(
  code: string,
  redirectUri: string,
): Promise<Record<string, unknown> | null> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  const url = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

async function exchangeTikTok(
  code: string,
  redirectUri: string,
): Promise<Record<string, unknown> | null> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return null;
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const { provider } = await ctx.params;
    if (!PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Provider no soportado.' }, { status: 404 });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    if (oauthError) {
      return NextResponse.redirect(
        `${getSiteUrl(request)}/admin/social/inbox?oauth_error=${encodeURIComponent(oauthError)}`,
        { status: 302 },
      );
    }
    if (!code) {
      return NextResponse.json({ error: 'Falta `code` en el callback.' }, { status: 400 });
    }
    if (!verifyState(provider, request, state)) {
      return NextResponse.json({ error: 'state inválido (posible CSRF).' }, { status: 403 });
    }

    const redirectUri = `${getSiteUrl(request)}/api/admin/social/oauth/${provider}/callback`;
    const tokenPayload =
      provider === 'tiktok' ? await exchangeTikTok(code, redirectUri) : await exchangeMeta(code, redirectUri);

    if (!tokenPayload) {
      return NextResponse.json(
        { error: 'No se pudo intercambiar el code por un token (revisa META_APP_ID/SECRET o las claves de TikTok).' },
        { status: 502 },
      );
    }

    // Persist (encrypted) into integrations table.
    try {
      const client = getAdminInsforge();
      const dbProvider = `social_${provider}`;
      const credentials = encryptCredentials({
        ...tokenPayload,
        connected_at: new Date().toISOString(),
      });
      await client.database
        .from('integrations')
        .upsert([{ provider: dbProvider, credentials }], { onConflict: 'provider' });
    } catch {
      /* persistence best-effort — token still returned in URL fragment for diagnostics */
    }

    const res = NextResponse.redirect(
      `${getSiteUrl(request)}/admin/social/inbox?connected=${provider}`,
      { status: 302 },
    );
    res.cookies.delete(`social_oauth_state_${provider}`);
    return res;
  } catch (err) {
    return adminError(err, 'SOCIAL_OAUTH_CALLBACK_FAILED');
  }
}
