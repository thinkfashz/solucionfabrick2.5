import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { encryptCredentials } from '@/lib/integrationsCrypto';
import {
	exchangeCodeForToken,
	getGoogleClientId,
	getGoogleClientSecret,
	verifyState,
} from '@/lib/googleOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/google/oauth/callback
 *
 * Receives `?code=…&state=…` from Google, validates the signed state
 * against the cookies set in /start, exchanges the code for an
 * access_token + refresh_token using the stored PKCE code_verifier, and
 * persists the result encrypted into the `integrations` table
 * (provider='google').
 */

const STATE_COOKIE = 'google_oauth_state';
const VERIFIER_COOKIE = 'google_oauth_verifier';

function getSiteUrl(request: NextRequest): string {
	const fromEnv =
		process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/u, '') ||
		process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/u, '');
	if (fromEnv && /^https?:\/\//u.test(fromEnv)) return fromEnv;
	return new URL(request.url).origin;
}

function getRedirectUri(request: NextRequest): string {
	const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
	if (explicit && explicit.length > 0) return explicit;
	return `${getSiteUrl(request)}/api/admin/google/oauth/callback`;
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

		if (oauthError) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?google_error=${encodeURIComponent(oauthError)}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}
		if (!code) {
			return NextResponse.json({ error: 'Falta `code` en el callback de Google.' }, { status: 400 });
		}

		// Validate the signed state both matches the cookie AND verifies
		// against ADMIN_SESSION_SECRET.
		const cookieState = request.cookies.get(STATE_COOKIE)?.value ?? null;
		const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
		if (!state || !cookieState || cookieState !== state || !verifyState(secret, state)) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?google_error=${encodeURIComponent('invalid_state')}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		const verifierCookie = request.cookies.get(VERIFIER_COOKIE);
		if (!verifierCookie?.value) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?google_error=${encodeURIComponent('missing_code_verifier')}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		const clientId = getGoogleClientId();
		const clientSecret = getGoogleClientSecret();
		if (!clientId || !clientSecret) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?google_error=${encodeURIComponent('missing_credentials')}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
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
				`${siteUrl}/admin/integraciones?google_error=${encodeURIComponent(message)}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

		// We expect a refresh_token because /start forced prompt=consent +
		// access_type=offline. If Google omits it (rare; can happen if the
		// user already had a fresh grant outside of `prompt=consent`) we
		// still persist what we got — the operator will see an error on
		// the next refresh cycle and can re-run /start.
		let persistError: string | null = null;
		try {
			const client = getAdminInsforge();
			const credentials = encryptCredentials({
				access_token: token.access_token,
				refresh_token: token.refresh_token ?? '',
				token_type: token.token_type,
				scope: token.scope ?? '',
				expires_at: expiresAt,
				connected_at: new Date().toISOString(),
			});
			const { error: dbError } = await client.database
				.from('integrations')
				.upsert([{ provider: 'google', credentials }], { onConflict: 'provider' });
			if (dbError) {
				persistError = dbError.message ?? 'Error guardando credenciales en integrations.';
				console.error('[google-oauth] failed to persist credentials', dbError);
			}
		} catch (err) {
			persistError = err instanceof Error ? err.message : 'Error guardando credenciales.';
			console.error('[google-oauth] failed to persist credentials', err);
		}

		// Best-effort: fetch the user email so the success banner reads
		// "vinculada como nombre@dominio.com" instead of an opaque blob.
		let email: string | null = null;
		try {
			const ctrl = new AbortController();
			const timer = setTimeout(() => ctrl.abort(), 4000);
			const meRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
				headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' },
				cache: 'no-store',
				signal: ctrl.signal,
			});
			clearTimeout(timer);
			if (meRes.ok) {
				const meJson = (await meRes.json().catch(() => ({}))) as { email?: string };
				if (typeof meJson.email === 'string' && meJson.email.length > 0) {
					email = meJson.email;
				}
			}
		} catch {
			/* email is purely cosmetic */
		}

		const successParams = new URLSearchParams();
		if (persistError) {
			successParams.set('google_error', persistError);
		} else {
			successParams.set('connected', 'google');
			if (email) successParams.set('account', email);
			successParams.set('expires_at', expiresAt);
		}
		const res = NextResponse.redirect(
			`${siteUrl}/admin/integraciones?${successParams.toString()}`,
			{ status: 302 },
		);
		clearOauthCookies(res);
		return res;
	} catch (err) {
		return adminError(err, 'GOOGLE_OAUTH_CALLBACK_FAILED');
	}
}
