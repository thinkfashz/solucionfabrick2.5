import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import {
	buildAuthorizeUrl,
	generatePkcePair,
	getGoogleClientId,
	signState,
	GOOGLE_DEFAULT_SCOPES,
} from '@/lib/googleOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/google/oauth/start
 *
 * Begins the Google OAuth 2.0 + PKCE flow. Redirects the caller to
 * accounts.google.com after stashing a signed `state` and the PKCE
 * `code_verifier` into httpOnly cookies the callback verifies and consumes.
 *
 * Required env vars:
 *   GOOGLE_CLIENT_ID            (the OAuth 2.0 Client ID)
 *   GOOGLE_CLIENT_SECRET        (used in /callback only)
 * Optional:
 *   GOOGLE_REDIRECT_URI         (default `${origin}/api/admin/google/oauth/callback`)
 *   ADMIN_SESSION_SECRET        (HMAC of the state token)
 *
 * The redirect_uri MUST match exactly what is registered in
 * "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0
 * Client ID → Authorized redirect URIs", otherwise the authorization
 * request fails with `redirect_uri_mismatch`.
 */

const STATE_COOKIE = 'google_oauth_state';
const VERIFIER_COOKIE = 'google_oauth_verifier';
const COOKIE_MAX_AGE_SECONDS = 600; // 10 minutes

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

export async function GET(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();

	const clientId = getGoogleClientId();
	if (!clientId) {
		const siteUrl = getSiteUrl(request);
		return NextResponse.redirect(
			`${siteUrl}/admin/integraciones?google_error=${encodeURIComponent('Falta GOOGLE_CLIENT_ID en variables de entorno (Vercel). Configúralo con el OAuth 2.0 Client ID de Google Cloud Console.')}`,
			{ status: 302 },
		);
	}

	const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
	const state = signState(secret);
	const { codeVerifier, codeChallenge } = generatePkcePair();

	const redirectUri = getRedirectUri(request);
	const authorizeUrl = buildAuthorizeUrl({
		clientId,
		redirectUri,
		state,
		codeChallenge,
		scopes: GOOGLE_DEFAULT_SCOPES,
		// `consent` + `offline` ensure Google issues a refresh_token even on
		// re-authorization (otherwise a returning user only gets an
		// access_token, breaking the auto-refresh contract).
		prompt: 'consent',
		accessType: 'offline',
		includeGrantedScopes: true,
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
