import 'server-only';
import crypto from 'node:crypto';

/**
 * Google OAuth 2.0 + PKCE helpers (server-only).
 *
 * Implements the standard authorization-code-with-PKCE flow documented at
 *   https://developers.google.com/identity/protocols/oauth2/web-server
 *
 * Round-trip:
 *   1. /authorize → user grants the app on accounts.google.com
 *   2. Google redirects to our callback with `code` + `state`
 *   3. POST /token (grant_type=authorization_code, code_verifier)
 *   4. Persist {access_token, refresh_token, expires_at, scope} encrypted
 *   5. When access_token expires (~1h TTL), call refreshAccessToken().
 *      The refresh_token is long-lived (until the user revokes), so unlike
 *      MercadoLibre we do NOT rotate it on every refresh — Google returns
 *      a new access_token only.
 *
 * `access_type=offline&prompt=consent` is required on the very first
 * authorization to be sure Google emits a refresh_token (subsequent calls
 * with the same `client_id`+user only return one if `prompt=consent`).
 */

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * Default OAuth scopes the integration requests. Covers Ads, Google Business
 * Profile and Analytics (read-only). Callers can override via the
 * `scopes` argument of `buildAuthorizeUrl` if they need a narrower set
 * for a particular environment.
 */
export const GOOGLE_DEFAULT_SCOPES: readonly string[] = [
	'https://www.googleapis.com/auth/adwords',
	'https://www.googleapis.com/auth/business.manage',
	'https://www.googleapis.com/auth/analytics.readonly',
];

export function getGoogleClientId(): string | null {
	const id = process.env.GOOGLE_CLIENT_ID?.trim();
	return id && id.length > 0 ? id : null;
}

export function getGoogleClientSecret(): string | null {
	const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
	return secret && secret.length > 0 ? secret : null;
}

export interface PkcePair {
	codeVerifier: string;
	codeChallenge: string;
}

/** RFC 7636 S256 PKCE pair. 43-char base64url verifier (32 random bytes). */
export function generatePkcePair(): PkcePair {
	const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
	const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());
	return { codeVerifier, codeChallenge };
}

function base64UrlEncode(buf: Buffer): string {
	return buf
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

// ---------------------------------------------------------------------------
// state helpers (HMAC-signed nonce, shared shape across providers)
// ---------------------------------------------------------------------------

/**
 * Builds an HMAC-signed CSRF state token of the form `<nonce>.<sig>` where
 * `sig` is the first 32 hex chars of HMAC-SHA256(secret, nonce). Mirrors
 * the helper used by `/api/admin/ml/oauth/start` so all OAuth providers
 * verify state identically.
 */
export function signState(secret: string): string {
	const nonce = crypto.randomBytes(16).toString('hex');
	const sig = crypto.createHmac('sha256', secret).update(nonce).digest('hex').slice(0, 32);
	return `${nonce}.${sig}`;
}

/** Returns true iff `state` is a well-formed, signature-valid token. */
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

export interface BuildGoogleAuthorizeUrlOptions {
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
	scopes?: readonly string[];
	/** Default `consent` so Google reliably issues a refresh_token. */
	prompt?: 'none' | 'consent' | 'select_account';
	/** `offline` is required to receive a refresh_token. */
	accessType?: 'offline' | 'online';
	/** Optional login hint to pre-fill the email picker. */
	loginHint?: string;
	/** When true, includes scopes already granted to the user previously. */
	includeGrantedScopes?: boolean;
}

export function buildAuthorizeUrl(opts: BuildGoogleAuthorizeUrlOptions): string {
	const url = new URL(GOOGLE_AUTH_ENDPOINT);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', opts.clientId);
	url.searchParams.set('redirect_uri', opts.redirectUri);
	url.searchParams.set('state', opts.state);
	url.searchParams.set('code_challenge', opts.codeChallenge);
	url.searchParams.set('code_challenge_method', 'S256');
	url.searchParams.set('scope', (opts.scopes ?? GOOGLE_DEFAULT_SCOPES).join(' '));
	url.searchParams.set('access_type', opts.accessType ?? 'offline');
	url.searchParams.set('prompt', opts.prompt ?? 'consent');
	if (opts.includeGrantedScopes) url.searchParams.set('include_granted_scopes', 'true');
	if (opts.loginHint) url.searchParams.set('login_hint', opts.loginHint);
	return url.toString();
}

// ---------------------------------------------------------------------------
// token exchange / refresh
// ---------------------------------------------------------------------------

export interface GoogleTokenResponse {
	access_token: string;
	expires_in: number;
	token_type: 'Bearer' | string;
	scope?: string;
	/** Only returned on the first authorization (or with prompt=consent). */
	refresh_token?: string;
	/** OpenID Connect identity token (when `openid` scope is requested). */
	id_token?: string;
}

export interface GoogleTokenError {
	error: string;
	error_description?: string;
}

export async function exchangeCodeForToken(args: {
	code: string;
	codeVerifier: string;
	redirectUri: string;
	clientId: string;
	clientSecret: string;
	signal?: AbortSignal;
}): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		client_id: args.clientId,
		client_secret: args.clientSecret,
		code: args.code,
		redirect_uri: args.redirectUri,
		code_verifier: args.codeVerifier,
	});
	return postTokenEndpoint(body, args.signal);
}

export async function refreshAccessToken(args: {
	refreshToken: string;
	clientId: string;
	clientSecret: string;
	signal?: AbortSignal;
}): Promise<GoogleTokenResponse> {
	const body = new URLSearchParams({
		grant_type: 'refresh_token',
		client_id: args.clientId,
		client_secret: args.clientSecret,
		refresh_token: args.refreshToken,
	});
	return postTokenEndpoint(body, args.signal);
}

async function postTokenEndpoint(
	body: URLSearchParams,
	signal: AbortSignal | undefined,
): Promise<GoogleTokenResponse> {
	const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
		cache: 'no-store',
		signal,
	});
	const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse | GoogleTokenError;
	if (!res.ok || !('access_token' in json)) {
		const err = json as GoogleTokenError;
		const message =
			err.error_description ||
			err.error ||
			`Google /token devolvió HTTP ${res.status}`;
		throw new Error(message);
	}
	return json;
}
