import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { encryptCredentials } from '@/lib/integrationsCrypto';
import {
	META_DEFAULT_SCOPES,
	computeMissingScopes,
	debugToken,
	exchangeCodeForToken,
	exchangeForLongLivedToken,
	getMetaAppId,
	getMetaAppSecret,
	listAccounts,
	verifyState,
} from '@/lib/metaOAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATE_COOKIE = 'meta_oauth_state';

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

function clearOauthCookies(res: NextResponse): void {
	res.cookies.delete(STATE_COOKIE);
}

export async function GET(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const url = new URL(request.url);
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const oauthError = url.searchParams.get('error');
		const oauthErrorReason = url.searchParams.get('error_reason');
		const siteUrl = getSiteUrl(request);

		if (oauthError) {
			const reason = oauthErrorReason || oauthError;
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?meta_error=${encodeURIComponent(reason)}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}
		if (!code) {
			return NextResponse.json({ error: 'Falta `code` en el callback de Meta.' }, { status: 400 });
		}

		const cookieState = request.cookies.get(STATE_COOKIE)?.value ?? null;
		const secret = process.env.ADMIN_SESSION_SECRET || 'dev-only-not-secret';
		if (!state || !cookieState || cookieState !== state || !verifyState(secret, state)) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?meta_error=${encodeURIComponent('invalid_state')}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		const clientId = getMetaAppId();
		const clientSecret = getMetaAppSecret();
		if (!clientId || !clientSecret) {
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?meta_error=${encodeURIComponent('missing_credentials')}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		// 1) short-lived user token
		let shortLived;
		try {
			shortLived = await exchangeCodeForToken({
				code,
				redirectUri: getRedirectUri(request),
				clientId,
				clientSecret,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Error desconocido';
			const res = NextResponse.redirect(
				`${siteUrl}/admin/integraciones?meta_error=${encodeURIComponent(message)}`,
				{ status: 302 },
			);
			clearOauthCookies(res);
			return res;
		}

		// 2) long-lived (~60d) — best-effort; if the exchange fails we keep
		// the short-lived token rather than blocking the flow.
		let longLivedToken = shortLived.access_token;
		let longLivedExpiresIn = shortLived.expires_in;
		try {
			const longLived = await exchangeForLongLivedToken({
				shortLivedToken: shortLived.access_token,
				clientId,
				clientSecret,
			});
			longLivedToken = longLived.access_token;
			longLivedExpiresIn = longLived.expires_in;
		} catch (err) {
			console.error('[meta-oauth] long-lived exchange failed', err);
		}

		// 3) debug_token to read the real expires_at + granted scopes
		let expiresAtSeconds: number | null = null;
		let grantedScopes: string[] = [];
		try {
			const appAccessToken = `${clientId}|${clientSecret}`;
			const data = await debugToken({
				inputToken: longLivedToken,
				appAccessToken,
			});
			expiresAtSeconds =
				typeof data.expires_at === 'number' && data.expires_at > 0 ? data.expires_at : null;
			grantedScopes = Array.isArray(data.scopes) ? data.scopes : [];
		} catch (err) {
			console.error('[meta-oauth] debug_token failed', err);
		}

		const expiresAt = expiresAtSeconds
			? new Date(expiresAtSeconds * 1000).toISOString()
			: longLivedExpiresIn
				? new Date(Date.now() + longLivedExpiresIn * 1000).toISOString()
				: null;

		// 4) /me/accounts → enumerate Pages + IG accounts. The user picks
		// the active one from the UI dropdown after the redirect; we
		// persist the full list so the page can render it without a
		// follow-up API call.
		let pages: Array<{
			id: string;
			name?: string;
			access_token?: string;
			category?: string;
			instagram_business_id?: string;
		}> = [];
		try {
			const accounts = await listAccounts({ accessToken: longLivedToken });
			pages = accounts.map((p) => ({
				id: p.id,
				name: p.name,
				access_token: p.access_token,
				category: p.category,
				instagram_business_id: p.instagram_business_account?.id,
			}));
		} catch (err) {
			console.error('[meta-oauth] /me/accounts failed', err);
		}

		const missingScopes = computeMissingScopes(META_DEFAULT_SCOPES, grantedScopes);

		// 5) persist
		let persistError: string | null = null;
		try {
			const client = getAdminInsforge();
			const credentials = encryptCredentials({
				access_token: longLivedToken,
				token_type: 'bearer',
				granted_scopes: grantedScopes.join(','),
				pending_review: missingScopes.join(','),
				expires_at: expiresAt ?? '',
				connected_at: new Date().toISOString(),
				// Pages: store as JSON string so encryption helper (which
				// stringifies values) keeps a clean round-trip. We do not
				// pre-pick one here — the merchant picks from the UI
				// dropdown and a follow-up POST writes page_id +
				// page_access_token + instagram_business_id.
				pages: JSON.stringify(pages),
			});
			const { error: dbError } = await client.database
				.from('integrations')
				.upsert([{ provider: 'meta', credentials }], { onConflict: 'provider' });
			if (dbError) {
				persistError = dbError.message ?? 'Error guardando credenciales en integrations.';
				console.error('[meta-oauth] failed to persist credentials', dbError);
			}
		} catch (err) {
			persistError = err instanceof Error ? err.message : 'Error guardando credenciales.';
			console.error('[meta-oauth] failed to persist credentials', err);
		}

		const successParams = new URLSearchParams();
		if (persistError) {
			successParams.set('meta_error', persistError);
		} else {
			successParams.set('connected', 'meta');
			if (pages.length > 0 && pages[0].name) {
				successParams.set('account', pages[0].name);
			}
			if (expiresAt) successParams.set('expires_at', expiresAt);
			if (missingScopes.length > 0) {
				successParams.set('pending_review', missingScopes.join(','));
			}
		}
		const res = NextResponse.redirect(
			`${siteUrl}/admin/integraciones?${successParams.toString()}`,
			{ status: 302 },
		);
		clearOauthCookies(res);
		return res;
	} catch (err) {
		return adminError(err, 'META_OAUTH_CALLBACK_FAILED');
	}
}
