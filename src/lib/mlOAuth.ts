import 'server-only';
import crypto from 'node:crypto';

/**
 * Mercado Libre OAuth 2.0 + PKCE helpers (server-only).
 *
 * Implements the seller authorization flow documented at
 *   https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion
 *
 * The full round-trip is:
 *   1. /authorization → user grants the app on auth.mercadolibre.<tld>
 *   2. ML redirects to our callback with `code` + `state`
 *   3. POST /oauth/token (grant_type=authorization_code, code_verifier)
 *   4. Persist {access_token, refresh_token, expires_at, user_id} encrypted
 *   5. When access_token expires (6h TTL), call refreshAccessToken() with the
 *      refresh_token (single-use; ML returns a new one each time).
 *
 * No new runtime dependencies — uses Node built-in `crypto` and `fetch`.
 */

export const ML_API_BASE = 'https://api.mercadolibre.com';

/** Default authorization domain. Override with ML_AUTH_DOMAIN env var. */
const DEFAULT_AUTH_DOMAIN = 'auth.mercadolibre.cl';

export function getMlAuthDomain(): string {
  const fromEnv = process.env.ML_AUTH_DOMAIN?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_AUTH_DOMAIN;
}

export function getMlClientId(): string | null {
  const id = process.env.ML_CLIENT_ID?.trim();
  return id && id.length > 0 ? id : null;
}

export function getMlClientSecret(): string | null {
  const secret = process.env.ML_CLIENT_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

export interface PkcePair {
  /** Random 32-byte URL-safe value kept server-side until callback. */
  codeVerifier: string;
  /** SHA-256(verifier) base64url-encoded — sent to /authorization. */
  codeChallenge: string;
}

/**
 * Generates a PKCE verifier/challenge pair compliant with RFC 7636 S256.
 * The verifier is 43 characters of base64url (32 random bytes), which is
 * within the [43, 128] range required by the spec.
 */
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

export interface BuildAuthorizeUrlOptions {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  authDomain?: string;
}

/**
 * Constructs the URL to redirect the seller to so they can grant the app.
 * Uses the S256 PKCE method per ML docs.
 */
export function buildAuthorizeUrl(opts: BuildAuthorizeUrlOptions): string {
  const domain = opts.authDomain ?? getMlAuthDomain();
  const url = new URL(`https://${domain}/authorization`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', opts.clientId);
  url.searchParams.set('redirect_uri', opts.redirectUri);
  url.searchParams.set('state', opts.state);
  url.searchParams.set('code_challenge', opts.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

/** Shape of a successful /oauth/token response from Mercado Libre. */
export interface MlTokenResponse {
  access_token: string;
  token_type: 'bearer' | string;
  expires_in: number;
  scope?: string;
  user_id: number;
  refresh_token: string;
}

/** Shape of an error response from /oauth/token (matches ML docs). */
export interface MlTokenError {
  error: string;
  error_description?: string;
  status?: number;
  cause?: unknown[];
}

/**
 * Exchanges an authorization `code` for an access+refresh token pair.
 * Throws an Error whose `message` is the ML error_description on failure
 * so the calling route can surface it to the operator unchanged.
 */
export async function exchangeCodeForToken(args: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  signal?: AbortSignal;
}): Promise<MlTokenResponse> {
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

/**
 * Renews an expired access_token using a single-use refresh_token.
 * The response contains a NEW refresh_token; callers MUST persist it to
 * replace the old one (the old one is invalidated server-side).
 */
export async function refreshAccessToken(args: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
  signal?: AbortSignal;
}): Promise<MlTokenResponse> {
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
): Promise<MlTokenResponse> {
  const res = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
    signal,
  });
  const json = (await res.json().catch(() => ({}))) as MlTokenResponse | MlTokenError;
  if (!res.ok || !('access_token' in json)) {
    const err = json as MlTokenError;
    const message =
      err.error_description ||
      err.error ||
      `Mercado Libre /oauth/token devolvió HTTP ${res.status}`;
    throw new Error(message);
  }
  return json;
}
