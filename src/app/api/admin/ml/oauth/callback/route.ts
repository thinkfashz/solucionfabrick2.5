import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { encryptCredentials } from '@/lib/integrationsCrypto';
import {
  exchangeCodeForToken,
  getMlClientId,
  getMlClientSecret,
} from '@/lib/mlOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/oauth/callback
 *
 * Receives `?code=…&state=…` from Mercado Libre, validates the signed state
 * against the cookies set in /start, exchanges the code for an
 * access_token + refresh_token using the stored PKCE code_verifier, and
 * persists the result encrypted into the `integrations` table
 * (provider='mercadolibre').
 *
 * On success: redirects to /admin/integraciones?connected=mercadolibre&seller=…
 * On user-side errors (denied, invalid state): redirects to
 *   /admin/integraciones?ml_error=<reason>
 * On server-side errors: returns JSON 502/500 — these are operator-visible.
 */

const STATE_COOKIE = 'ml_oauth_state';
const VERIFIER_COOKIE = 'ml_oauth_verifier';

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

function verifyState(request: NextRequest, state: string | null): boolean {
  if (!state) return false;
  const cookie = request.cookies.get(STATE_COOKIE);
  if (!cookie?.value || cookie.value !== state) return false;
  const [nonce, sig] = state.split('.');
  if (!nonce || !sig) return false;
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
  const expected = crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
  let sigBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, 'hex');
    expectedBuf = Buffer.from(expected, 'hex');
  } catch {
    return false;
  }
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

function clearOauthCookies(res: NextResponse): void {
  res.cookies.delete(STATE_COOKIE);
  res.cookies.delete(VERIFIER_COOKIE);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const siteUrl = getSiteUrl(request);

    // The seller cancelled the grant or ML reported an error before issuing
    // a code. Surface ML's `error` verbatim in the query string so
    // /admin/integraciones can show a friendly message.
    if (oauthError) {
      const res = NextResponse.redirect(
        `${siteUrl}/admin/integraciones?ml_error=${encodeURIComponent(oauthError)}`,
        { status: 302 },
      );
      clearOauthCookies(res);
      return res;
    }
    if (!code) {
      return NextResponse.json({ error: 'Falta `code` en el callback de Mercado Libre.' }, { status: 400 });
    }
    if (!verifyState(request, state)) {
      const res = NextResponse.redirect(
        `${siteUrl}/admin/integraciones?ml_error=${encodeURIComponent('invalid_state')}`,
        { status: 302 },
      );
      clearOauthCookies(res);
      return res;
    }

    const verifierCookie = request.cookies.get(VERIFIER_COOKIE);
    if (!verifierCookie?.value) {
      const res = NextResponse.redirect(
        `${siteUrl}/admin/integraciones?ml_error=${encodeURIComponent('missing_code_verifier')}`,
        { status: 302 },
      );
      clearOauthCookies(res);
      return res;
    }

    const clientId = getMlClientId();
    const clientSecret = getMlClientSecret();
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            'Faltan ML_CLIENT_ID / ML_CLIENT_SECRET. Setéalas en Vercel para completar el intercambio del code.',
        },
        { status: 503 },
      );
    }

    let token;
    try {
      token = await exchangeCodeForToken({
        code,
        codeVerifier: verifierCookie.value,
        redirectUri: getRedirectUri(request),
        clientId,
        clientSecret,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      const res = NextResponse.redirect(
        `${siteUrl}/admin/integraciones?ml_error=${encodeURIComponent(message)}`,
        { status: 302 },
      );
      clearOauthCookies(res);
      return res;
    }

    const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    // Persist encrypted in integrations(provider='mercadolibre'). On failure
    // we surface the error verbatim in the redirect so the operator notices
    // (vs. a silent dead-end) and we also `console.error` so it lands in
    // Vercel logs / Sentry.
    let persistError: string | null = null;
    try {
      const client = getAdminInsforge();
      const credentials = encryptCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        scope: token.scope ?? '',
        user_id: String(token.user_id),
        expires_at: expiresAt,
        connected_at: new Date().toISOString(),
      });
      const { error: dbError } = await client.database
        .from('integrations')
        .upsert([{ provider: 'mercadolibre', credentials }], { onConflict: 'provider' });
      if (dbError) {
        persistError = dbError.message ?? 'Error guardando credenciales en integrations.';
        console.error('[ml-oauth] failed to persist credentials', dbError);
      }
    } catch (err) {
      persistError = err instanceof Error ? err.message : 'Error guardando credenciales.';
      console.error('[ml-oauth] failed to persist credentials', err);
    }

    // Best-effort: fetch the seller nickname so the success banner reads
    // "vinculada como FABRICK_CL" instead of just a numeric user_id. We
    // don't fail the flow if /users/me is slow or rate-limited.
    let nickname: string | null = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const meRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' },
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (meRes.ok) {
        const meJson = (await meRes.json().catch(() => ({}))) as { nickname?: string };
        if (typeof meJson.nickname === 'string' && meJson.nickname.length > 0) {
          nickname = meJson.nickname;
        }
      }
    } catch {
      /* nickname is purely cosmetic — ignore */
    }

    // Redirect to /admin/integraciones with seller info so the integration
    // card is auto-loaded with the freshly stored credentials and the
    // operator sees a green confirmation banner. If persistence failed we
    // surface that error instead so they can retry.
    const successParams = new URLSearchParams();
    if (persistError) {
      successParams.set('ml_error', persistError);
    } else {
      successParams.set('connected', 'mercadolibre');
      successParams.set('seller', nickname ?? String(token.user_id));
      successParams.set('expires_at', expiresAt);
    }
    const res = NextResponse.redirect(
      `${siteUrl}/admin/integraciones?${successParams.toString()}`,
      { status: 302 },
    );
    clearOauthCookies(res);
    return res;
  } catch (err) {
    return adminError(err, 'ML_OAUTH_CALLBACK_FAILED');
  }
}
