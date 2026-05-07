import 'server-only';
import crypto from 'node:crypto';

/**
 * TikTok for Business OAuth helpers.
 *
 * TikTok runs two separate OAuth flows:
 *   - Login Kit on `open-api.tiktok.com` (consumer accounts)
 *   - Business / Ads on `business-api.tiktok.com` (advertisers)
 *
 * We only implement the Business flow here, since the integration's job
 * is to manage advertisers and ads — not consumer-side video auth.
 *
 * Round-trip:
 *   1. /portal/auth?app_id=…&redirect_uri=…&state=… → user approves
 *   2. TikTok redirects to our callback with `auth_code` (sometimes `code`) + `state`
 *   3. POST /open_api/v1.3/oauth2/access_token/ with {app_id, secret, auth_code}
 *   4. POST /open_api/v1.3/oauth2/advertiser/get/ to enumerate advertiser_ids
 *   5. Persist {access_token, advertiser_ids[]} encrypted; access_token does NOT expire.
 */

export const TIKTOK_BUSINESS_AUTH = 'https://business-api.tiktok.com/portal/auth';
export const TIKTOK_BUSINESS_API = 'https://business-api.tiktok.com';
export const TIKTOK_TOKEN_PATH = '/open_api/v1.3/oauth2/access_token/';
export const TIKTOK_ADVERTISERS_PATH = '/open_api/v1.3/oauth2/advertiser/get/';

export function getTikTokAppId(): string | null {
	const v = process.env.TIKTOK_APP_ID?.trim();
	return v && v.length > 0 ? v : null;
}

export function getTikTokAppSecret(): string | null {
	const v = process.env.TIKTOK_APP_SECRET?.trim();
	return v && v.length > 0 ? v : null;
}

// ---------------------------------------------------------------------------
// state helpers
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

export interface BuildTikTokAuthorizeUrlOptions {
	appId: string;
	redirectUri: string;
	state: string;
}

export function buildAuthorizeUrl(opts: BuildTikTokAuthorizeUrlOptions): string {
	const url = new URL(TIKTOK_BUSINESS_AUTH);
	url.searchParams.set('app_id', opts.appId);
	url.searchParams.set('redirect_uri', opts.redirectUri);
	url.searchParams.set('state', opts.state);
	return url.toString();
}

// ---------------------------------------------------------------------------
// token exchange / advertiser listing
// ---------------------------------------------------------------------------

/**
 * TikTok's response envelope. Successful responses carry `code === 0`;
 * error responses use a non-zero code AND a `message` string.
 */
interface TikTokEnvelope<T> {
	code?: number;
	message?: string;
	data?: T;
	request_id?: string;
}

export interface TikTokAccessTokenData {
	access_token: string;
	advertiser_ids?: string[];
	scope?: number[];
}

export async function exchangeAuthCode(args: {
	authCode: string;
	appId: string;
	appSecret: string;
	signal?: AbortSignal;
}): Promise<TikTokAccessTokenData> {
	const res = await fetch(`${TIKTOK_BUSINESS_API}${TIKTOK_TOKEN_PATH}`, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			app_id: args.appId,
			secret: args.appSecret,
			auth_code: args.authCode,
		}),
		cache: 'no-store',
		signal: args.signal,
	});
	const json = (await res.json().catch(() => ({}))) as TikTokEnvelope<TikTokAccessTokenData>;
	if (!res.ok || json.code !== 0 || !json.data?.access_token) {
		const message =
			json.message ||
			`TikTok ${TIKTOK_TOKEN_PATH} devolvió HTTP ${res.status}${json.code != null ? ` (code ${json.code})` : ''}`;
		throw new Error(message);
	}
	return json.data;
}

export interface TikTokAdvertiser {
	advertiser_id: string;
	advertiser_name?: string;
}

export async function listAdvertisers(args: {
	accessToken: string;
	appId: string;
	appSecret: string;
	signal?: AbortSignal;
}): Promise<TikTokAdvertiser[]> {
	const url = new URL(`${TIKTOK_BUSINESS_API}${TIKTOK_ADVERTISERS_PATH}`);
	url.searchParams.set('app_id', args.appId);
	url.searchParams.set('secret', args.appSecret);
	const res = await fetch(url, {
		method: 'GET',
		headers: {
			'Access-Token': args.accessToken,
			Accept: 'application/json',
		},
		cache: 'no-store',
		signal: args.signal,
	});
	const json = (await res.json().catch(() => ({}))) as TikTokEnvelope<{ list?: TikTokAdvertiser[] }>;
	if (!res.ok || json.code !== 0) {
		const message =
			json.message ||
			`TikTok ${TIKTOK_ADVERTISERS_PATH} devolvió HTTP ${res.status}${json.code != null ? ` (code ${json.code})` : ''}`;
		throw new Error(message);
	}
	return Array.isArray(json.data?.list) ? json.data!.list! : [];
}
