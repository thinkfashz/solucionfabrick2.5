import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import {
  buildAuthorizeUrl,
  generatePkcePair,
  getMlAuthDomain,
  getMlClientId,
} from '@/lib/mlOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/oauth/start
 *
 * Begins the Mercado Libre OAuth 2.0 + PKCE flow. Redirects the caller to
 *   https://auth.mercadolibre.<tld>/authorization?response_type=code&client_id=…
 * after stashing a signed `state` and the PKCE `code_verifier` into
 * httpOnly cookies that the callback verifies and consumes.
 *
 * Required env vars:
 *   ML_CLIENT_ID            (the App ID — public, safe to commit)
 *   ML_CLIENT_SECRET        (the Secret Key — used in /callback only)
 * Optional:
 *   ML_AUTH_DOMAIN          (default "auth.mercadolibre.cl"; use auth.mercadolibre.com.ar / .com.br / etc.)
 *   ML_REDIRECT_URI         (default "${NEXT_PUBLIC_APP_URL}/api/admin/ml/oauth/callback")
 *   NEXT_PUBLIC_APP_URL     (used as fallback site URL)
 *   ADMIN_SESSION_SECRET    (used to HMAC-sign the state token)
 *
 * The redirect_uri MUST match exactly what is registered in
 * "Mis Aplicaciones → tu app → Redirect URI" on Mercado Libre, otherwise
 * the authorization request fails with `invalid_grant`.
 */

const STATE_COOKIE = 'ml_oauth_state';
const VERIFIER_COOKIE = 'ml_oauth_verifier';
const COOKIE_MAX_AGE_SECONDS = 600; // 10 minutes — plenty for any real round-trip.

function getSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/u, '');
  if (fromEnv && /^https?:\/\//u.test(fromEnv)) return fromEnv;
  return new URL(request.url).origin;
}

function getRedirectUri(request: NextRequest): string {
  const explicit = process.env.ML_REDIRECT_URI?.trim();
  if (explicit && explicit.length > 0) return explicit;
  return `${getSiteUrl(request)}/api/admin/ml/oauth/callback`;
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const clientId = getMlClientId();
  if (!clientId) {
    const siteUrl = getSiteUrl(request);
    return NextResponse.redirect(
      `${siteUrl}/admin/integraciones?ml_error=${encodeURIComponent('Falta ML_CLIENT_ID en variables de entorno (Vercel). Configúralo con el App ID de tu app de Mercado Libre.')}`,
      { status: 302 },
    );
  }

  // CSRF token: the callback verifies this matches the cookie AND that the
  // HMAC signature is valid against ADMIN_SESSION_SECRET. Without the HMAC
  // step, an attacker who somehow forced a value into the cookie could
  // pass the equality check.
  const nonce = crypto.randomBytes(16).toString('hex');
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
  const sig = crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
  const state = `${nonce}.${sig}`;

  const { codeVerifier, codeChallenge } = generatePkcePair();

  const redirectUri = getRedirectUri(request);
  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
    authDomain: getMlAuthDomain(),
  });

  const res = NextResponse.redirect(authorizeUrl, { status: 302 });
  const cookieOpts = {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  };
  res.cookies.set(STATE_COOKIE, state, cookieOpts);
  res.cookies.set(VERIFIER_COOKIE, codeVerifier, cookieOpts);
  return res;
}
