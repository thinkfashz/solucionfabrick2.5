import 'server-only';
import crypto from 'node:crypto';

/**
 * Meta (Facebook / Instagram / WhatsApp Business / Ads) OAuth helpers.
 *
 * Meta's flow does NOT use PKCE (the platform supports `code_challenge`
 * only as an opt-in, and not for all permission sets), so we secure the
 * round-trip with an HMAC-signed `state` parameter instead — same shape
 * as `mlOAuth.signState`.
 *
 * Round-trip:
 *   1. /dialog/oauth → user consents on facebook.com
 *   2. Meta redirects to our callback with `code` + `state`
 *   3. GET /oauth/access_token (short-lived ~1h user token)
 *   4. GET /oauth/access_token?grant_type=fb_exchange_token  → 60d long-lived
 *   5. GET /me/accounts → list Pages + IG Business accounts (page tokens
 *      do NOT expire when derived from a long-lived user token)
 *   6. GET /debug_token to read `data.expires_at` (UNIX seconds)
 *
 * Refresh is NOT supported by Meta. To stay logged in past 60 days, call
 * `exchangeForLongLivedToken` again with the current long-lived token —
 * Meta returns a fresh 60-day token if the existing one is still valid.
 */

export const META_API_VERSION = 'v21.0';
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
export const META_DIALOG_BASE = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;

/**
 * Default scopes the integration requests. Some require Meta App Review:
 *   pages_show_list, pages_read_engagement, pages_manage_posts,
 *   instagram_basic, instagram_content_publish, ads_management, ads_read,
 *   whatsapp_business_messaging, whatsapp_business_management,
 *   business_management.
 *
 * The callback persists `granted_scopes` from /debug_token and exposes
 * the missing ones as `pending_review` so the merchant sees clearly which
 * features will work today and which need App Review.
 */
export const META_DEFAULT_SCOPES: readonly string[] = [
	'pages_show_list',
	'pages_read_engagement',
	'pages_manage_posts',
	'instagram_basic',
	'instagram_content_publish',
	'ads_management',
	'ads_read',
	'whatsapp_business_messaging',
	'whatsapp_business_management',
	'business_management',
];

export function getMetaAppId(): string | null {
	const v = process.env.META_APP_ID?.trim();
	return v && v.length > 0 ? v : null;
}

export function getMetaAppSecret(): string | null {
	const v = process.env.META_APP_SECRET?.trim();
	return v && v.length > 0 ? v : null;
}

// ---------------------------------------------------------------------------
// state helpers (mirror mlOAuth + googleOAuth)
// ---------------------------------------------------------------------------

export function signState(secret: string): string {
	const nonce = crypto.randomBytes(16).toString('hex');
	const sig = crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
	return `${nonce}.${sig}`;
}

export function verifyState(secret: string, state: string | null | undefined): boolean {
	if (typeof state !== 'string' || state.length === 0) return false;
	const [nonce, sig] = state.split('.');
	if (!nonce || !sig) return false;
	const expected = crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
	let sigBuf: Buffer;
	let expectedBuf: Buffer;
	try {
		sigBuf = Buffer.from(sig, 'hex');
		expectedBuf = Buffer.from(expected, 'hex');
	} catch {
		return false;
	}
	if (sigBuf.length !== expectedBuf.length || sigBuf.length === 0) return false;
	return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

// ---------------------------------------------------------------------------
// authorize URL
// ---------------------------------------------------------------------------

export interface BuildMetaAuthorizeUrlOptions {
	clientId: string;
	redirectUri: string;
	state: string;
	scopes?: readonly string[];
	/** When true, asks Meta to re-show the consent screen. */
	authType?: 'rerequest' | 'reauthenticate' | 'reauthorize';
}

export function buildAuthorizeUrl(opts: BuildMetaAuthorizeUrlOptions): string {
	const url = new URL(META_DIALOG_BASE);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', opts.clientId);
	url.searchParams.set('redirect_uri', opts.redirectUri);
	url.searchParams.set('state', opts.state);
	url.searchParams.set('scope', (opts.scopes ?? META_DEFAULT_SCOPES).join(','));
	if (opts.authType) url.searchParams.set('auth_type', opts.authType);
	return url.toString();
}

// ---------------------------------------------------------------------------
// token exchange
// ---------------------------------------------------------------------------

export interface MetaShortLivedTokenResponse {
	access_token: string;
	token_type: 'bearer' | string;
	expires_in?: number;
}

export interface MetaTokenError {
	error: { message?: string; type?: string; code?: number; fbtrace_id?: string };
}

/** Exchanges a /dialog/oauth `code` for a short-lived user access_token (~1h). */
export async function exchangeCodeForToken(args: {
	code: string;
	redirectUri: string;
	clientId: string;
	clientSecret: string;
	signal?: AbortSignal;
}): Promise<MetaShortLivedTokenResponse> {
	const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
	url.searchParams.set('client_id', args.clientId);
	url.searchParams.set('client_secret', args.clientSecret);
	url.searchParams.set('redirect_uri', args.redirectUri);
	url.searchParams.set('code', args.code);
	const res = await fetch(url, {
		method: 'GET',
		headers: { Accept: 'application/json' },
		cache: 'no-store',
		signal: args.signal,
	});
	const json = (await res.json().catch(() => ({}))) as
		| MetaShortLivedTokenResponse
		| MetaTokenError;
	if (!res.ok || !('access_token' in json)) {
		const err = json as MetaTokenError;
		const message =
			err.error?.message || `Meta /oauth/access_token devolvió HTTP ${res.status}`;
		throw new Error(message);
	}
	return json;
}

/**
 * Exchanges a short-lived user token for a long-lived (~60d) token.
 * Meta also accepts a still-valid long-lived token here and returns a
 * fresh 60-day TTL — used to renew before expiry.
 */
export async function exchangeForLongLivedToken(args: {
	shortLivedToken: string;
	clientId: string;
	clientSecret: string;
	signal?: AbortSignal;
}): Promise<MetaShortLivedTokenResponse> {
	const url = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
	url.searchParams.set('grant_type', 'fb_exchange_token');
	url.searchParams.set('client_id', args.clientId);
	url.searchParams.set('client_secret', args.clientSecret);
	url.searchParams.set('fb_exchange_token', args.shortLivedToken);
	const res = await fetch(url, {
		method: 'GET',
		headers: { Accept: 'application/json' },
		cache: 'no-store',
		signal: args.signal,
	});
	const json = (await res.json().catch(() => ({}))) as
		| MetaShortLivedTokenResponse
		| MetaTokenError;
	if (!res.ok || !('access_token' in json)) {
		const err = json as MetaTokenError;
		const message =
			err.error?.message || `Meta long-lived exchange devolvió HTTP ${res.status}`;
		throw new Error(message);
	}
	return json;
}

// ---------------------------------------------------------------------------
// debug_token / me/accounts
// ---------------------------------------------------------------------------

export interface MetaDebugTokenData {
	app_id?: string;
	type?: string;
	is_valid?: boolean;
	user_id?: string;
	expires_at?: number;
	data_access_expires_at?: number;
	scopes?: string[];
	granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
}

export async function debugToken(args: {
	inputToken: string;
	appAccessToken: string;
	signal?: AbortSignal;
}): Promise<MetaDebugTokenData> {
	const url = new URL(`${META_GRAPH_BASE}/debug_token`);
	url.searchParams.set('input_token', args.inputToken);
	url.searchParams.set('access_token', args.appAccessToken);
	const res = await fetch(url, {
		method: 'GET',
		headers: { Accept: 'application/json' },
		cache: 'no-store',
		signal: args.signal,
	});
	const json = (await res.json().catch(() => ({}))) as
		| { data: MetaDebugTokenData }
		| MetaTokenError;
	if (!res.ok || !('data' in json)) {
		const err = json as MetaTokenError;
		throw new Error(err.error?.message || `Meta /debug_token devolvió HTTP ${res.status}`);
	}
	return json.data;
}

export interface MetaPage {
	id: string;
	name?: string;
	access_token?: string;
	category?: string;
	tasks?: string[];
	instagram_business_account?: { id: string };
}

export async function listAccounts(args: {
	accessToken: string;
	signal?: AbortSignal;
}): Promise<MetaPage[]> {
	const url = new URL(`${META_GRAPH_BASE}/me/accounts`);
	url.searchParams.set(
		'fields',
		'id,name,access_token,category,tasks,instagram_business_account{id,name,username}',
	);
	url.searchParams.set('limit', '100');
	const res = await fetch(url, {
		method: 'GET',
		headers: { Authorization: `Bearer ${args.accessToken}`, Accept: 'application/json' },
		cache: 'no-store',
		signal: args.signal,
	});
	const json = (await res.json().catch(() => ({}))) as
		| { data: MetaPage[] }
		| MetaTokenError;
	if (!res.ok || !('data' in json)) {
		const err = json as MetaTokenError;
		throw new Error(err.error?.message || `Meta /me/accounts devolvió HTTP ${res.status}`);
	}
	return json.data;
}

/**
 * Builds the appsecret_proof Meta requires when calling protected endpoints
 * with `appsecret_proof` enabled. Not used by /oauth itself, but exported
 * so consumers (Ads, Pages publish) can pass it on subsequent calls.
 */
export function appSecretProof(accessToken: string, appSecret: string): string {
	return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

/**
 * Computes the missing scopes — those requested but not granted by the user.
 * The callback persists this list as `pending_review` so the UI can flag
 * features that won't work until the user re-grants them or the App goes
 * through Meta App Review.
 */
export function computeMissingScopes(
	requested: readonly string[],
	granted: readonly string[],
): string[] {
	const set = new Set(granted);
	return requested.filter((s) => !set.has(s));
}
