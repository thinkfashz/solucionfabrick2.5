import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { encryptCredentials } from '@/lib/integrationsCrypto';
import {
	exchangeAuthCode,
	getTikTokAppId,
	getTikTokAppSecret,
	listAdvertisers,
	verifyState,
} from '@/lib/tiktokOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATE_COOKIE = 'tiktok_oauth_state';

function getSiteUrl(request: NextRequest): string {
	const fromEnv =
		process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/u, '') ||
		process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/u, '');
	if (fromEnv && /^https?:\/\//u.test(fromEnv)) return fromEnv;
	return new URL(request.url).origin;
}

function clearOauthCookies(res: NextResponse): void {
	res.cookies.delete(STATE_COOKIE);
}

export async function GET(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const url = new URL(request.url);
		// TikTok sometimes uses `auth_code`, sometimes `code`. Accept both.
		const authCode = url.searchParams.get('auth_code') ?? url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const tikErr = url.searchParams.get('error') ?? url.searchParams.get('error_description');
		const siteUrl = getSiteUrl(request);

		if (tikErr) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?tiktok_error=${encodeURIComponent(tikErr)}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}
		if (!authCode) {
			return NextResponse.json(
				{ error: 'Falta `auth_code` en el callback de TikTok.' },
				{ status: 400 },
			);
		}

		const cookieState = request.cookies.get(STATE_COOKIE)?.value ?? null;
		const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
		if (!state || !cookieState || cookieState !== state || !verifyState(secret, state)) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?tiktok_error=${encodeURIComponent('invalid_state')}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		const appId = getTikTokAppId();
		const appSecret = getTikTokAppSecret();
		if (!appId || !appSecret) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?tiktok_error=${encodeURIComponent('missing_credentials')}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		let tokenData;
		try {
			tokenData = await exchangeAuthCode({ authCode, appId, appSecret });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Error desconocido';
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?tiktok_error=${encodeURIComponent(message)}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		// /advertiser/get/ gives us human-readable names; the auth_code
		// response only ships IDs. Fall back to the IDs alone if that
		// call fails (the merchant can still pick from a list of IDs).
		let advertisers: Array<{ advertiser_id: string; advertiser_name?: string }> = [];
		try {
			advertisers = await listAdvertisers({
				accessToken: tokenData.access_token,
				appId,
				appSecret,
			});
		} catch (err) {
			console.error('[tiktok-oauth] /advertiser/get failed', err);
			if (Array.isArray(tokenData.advertiser_ids)) {
				advertisers = tokenData.advertiser_ids.map((id) => ({ advertiser_id: id }));
			}
		}

		let persistError: string | null = null;
		try {
			const client = getAdminInsforge();
			const credentials = encryptCredentials({
				access_token: tokenData.access_token,
				advertiser_ids: (tokenData.advertiser_ids ?? []).join(','),
				advertisers: JSON.stringify(advertisers),
				connected_at: new Date().toISOString(),
			});
			const { error: dbError } = await client.database
				.from('integrations')
				.upsert([{ provider: 'tiktok', credentials }], { onConflict: 'provider' });
			if (dbError) {
				persistError = dbError.message ?? 'Error guardando credenciales en integrations.';
				console.error('[tiktok-oauth] failed to persist credentials', dbError);
			}
		} catch (err) {
			persistError = err instanceof Error ? err.message : 'Error guardando credenciales.';
			console.error('[tiktok-oauth] failed to persist credentials', err);
		}

		const successParams = new URLSearchParams();
		if (persistError) {
			successParams.set('tiktok_error', persistError);
		} else {
			successParams.set('connected', 'tiktok');
			if (advertisers.length > 0) {
				const first = advertisers[0];
				successParams.set('account', first.advertiser_name ?? first.advertiser_id);
			}
		}
		const res = NextResponse.redirect(
			`${siteUrl}/admin/integraciones?${successParams.toString()}`,
			{ status: 302 },
		);
		clearOauthCookies(res);
		return res;
	} catch (err) {
		return adminError(err, 'TIKTOK_OAUTH_CALLBACK_FAILED');
	}
}
