import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/social/oauth/[provider]/start
 *
 * Redirige al flujo OAuth del proveedor para conectar la red en el
 * inbox social. Soporta Facebook + Instagram (Login as Facebook) y
 * TikTok Login Kit. Las credenciales se persisten luego en
 * `integrations` con provider=`social_<provider>`.
 *
 * Variables de entorno requeridas:
 *   META_APP_ID, META_APP_SECRET           (para FB e IG)
 *   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET (para TikTok)
 *   NEXT_PUBLIC_SITE_URL                   (para construir el redirect_uri)
 *
 * Si faltan, devolvemos 503 con un mensaje accionable — el operador
 * debe completarlas en Vercel antes de poder conectar.
 */

const PROVIDERS = new Set(['instagram', 'facebook', 'tiktok']);

function getSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  // Best-effort fallback: use the request's origin.
  return new URL(request.url).origin;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const { provider } = await ctx.params;
  if (!PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Provider no soportado.' }, { status: 404 });
  }

  const siteUrl = getSiteUrl(request);
  const redirectUri = `${siteUrl}/api/admin/social/oauth/${provider}/callback`;
  // CSRF token — the callback verifies this matches what we set in the
  // signed state cookie. We sign with ADMIN_SESSION_SECRET so nobody
  // can forge a state value that survives the round-trip.
  const nonce = crypto.randomBytes(16).toString('hex');
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
  const sig = crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
  const state = `${nonce}.${sig}`;

  let authorizeUrl: string | null = null;
  if (provider === 'facebook' || provider === 'instagram') {
    const appId = process.env.META_APP_ID;
    if (!appId) {
      return NextResponse.json(
        {
          error:
            'Falta META_APP_ID. Setéalo en Vercel junto con META_APP_SECRET para habilitar el OAuth.',
        },
        { status: 503 },
      );
    }
    // Scopes para leer DMs/comments según el producto.
    // Instagram requiere instagram_manage_messages + pages_show_list.
    const scopes =
      provider === 'instagram'
        ? 'instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging'
        : 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement';
    const url = new URL('https://www.facebook.com/v20.0/dialog/oauth');
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('response_type', 'code');
    authorizeUrl = url.toString();
  } else if (provider === 'tiktok') {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    if (!clientKey) {
      return NextResponse.json(
        { error: 'Falta TIKTOK_CLIENT_KEY. Setéalo en Vercel para habilitar el OAuth.' },
        { status: 503 },
      );
    }
    const url = new URL('https://www.tiktok.com/v2/auth/authorize/');
    url.searchParams.set('client_key', clientKey);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'user.info.basic,video.list');
    url.searchParams.set('response_type', 'code');
    authorizeUrl = url.toString();
  }

  if (!authorizeUrl) {
    return NextResponse.json({ error: 'Provider no soportado.' }, { status: 404 });
  }

  const res = NextResponse.redirect(authorizeUrl, { status: 302 });
  // 10-minute lifetime is enough for any real OAuth round-trip.
  res.cookies.set(`social_oauth_state_${provider}`, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
  });
  return res;
}
