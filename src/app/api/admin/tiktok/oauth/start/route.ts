import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { getAdminSecretString } from '@/lib/adminAuth';
import { buildAuthorizeUrl, getTikTokAppId, signState } from '@/lib/tiktokOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/tiktok/oauth/start
 *
 * Begins the TikTok for Business OAuth flow. Required env: TIKTOK_APP_ID,
 * TIKTOK_APP_SECRET. Optional: TIKTOK_REDIRECT_URI.
 */

const STATE_COOKIE = 'tiktok_oauth_state';
const COOKIE_MAX_AGE_SECONDS = 600;

function getSiteUrl(request: NextRequest): string {
	const fromEnv =
		process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/u, '') ||
		process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/u, '');
	if (fromEnv && /^https?:\/\//u.test(fromEnv)) return fromEnv;
	return new URL(request.url).origin;
}

function getRedirectUri(request: NextRequest): string {
	const explicit = process.env.TIKTOK_REDIRECT_URI?.trim();
	if (explicit && explicit.length > 0) return explicit;
	return `${getSiteUrl(request)}/api/admin/tiktok/oauth/callback`;
}

export async function GET(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();

	const appId = getTikTokAppId();
	if (!appId) {
		return NextResponse.json(
			{
				error:
					'Falta TIKTOK_APP_ID. Setéalo en Vercel (es el App ID de TikTok for Business → Developer center).',
			},
			{ status: 503 },
		);
	}

	const secret = getAdminSecretString();
	const state = signState(secret);
	const authorizeUrl = buildAuthorizeUrl({
		appId,
		redirectUri: getRedirectUri(request),
		state,
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
