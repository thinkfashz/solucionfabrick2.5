import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { buildAuthorizeUrl, getMetaAppId, signState, META_DEFAULT_SCOPES } from '@/lib/metaOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/meta/oauth/start
 *
 * Begins the Meta (Facebook + Instagram + WhatsApp + Ads) OAuth flow.
 * Required env: META_APP_ID, META_APP_SECRET. Optional: META_REDIRECT_URI.
 */

const STATE_COOKIE = 'meta_oauth_state';
const COOKIE_MAX_AGE_SECONDS = 600;

function getSiteUrl(request: NextRequest): string {
	const fromEnv =
		process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/u, '') ||
		process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/u, '');
	if (fromEnv && /^https?:\/\//u.test(fromEnv)) return fromEnv;
	return new URL(request.url).origin;
}

function getRedirectUri(request: NextRequest): string {
	const explicit = process.env.META_REDIRECT_URI?.trim();
	if (explicit && explicit.length > 0) return explicit;
	return `${getSiteUrl(request)}/api/admin/meta/oauth/callback`;
}

export async function GET(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();

	const clientId = getMetaAppId();
	if (!clientId) {
		const siteUrl = getSiteUrl(request);
		return NextResponse.redirect(
			`${siteUrl}/admin/integraciones?meta_error=${encodeURIComponent('Falta META_APP_ID en variables de entorno (Vercel). Configúralo con el App ID de developers.facebook.com → My Apps → Settings.')}`,
			{ status: 302 },
		);
	}

	const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
	const state = signState(secret);
	const redirectUri = getRedirectUri(request);
	const authorizeUrl = buildAuthorizeUrl({
		clientId,
		redirectUri,
		state,
		scopes: META_DEFAULT_SCOPES,
	});

	const res = NextResponse.redirect(authorizeUrl, { status: 302 });
	res.cookies.set(STATE_COOKIE, state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: COOKIE_MAX_AGE_SECONDS,
	});
	return res;
}
