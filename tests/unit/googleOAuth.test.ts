import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import {
	GOOGLE_AUTH_ENDPOINT,
	GOOGLE_DEFAULT_SCOPES,
	GOOGLE_TOKEN_ENDPOINT,
	buildAuthorizeUrl,
	exchangeCodeForToken,
	generatePkcePair,
	getGoogleClientId,
	getGoogleClientSecret,
	refreshAccessToken,
	signState,
	verifyState,
} from '@/lib/googleOAuth';

describe('googleOAuth', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.GOOGLE_CLIENT_ID;
		delete process.env.GOOGLE_CLIENT_SECRET;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	describe('client credentials helpers', () => {
		it('returns null when env is unset', () => {
			expect(getGoogleClientId()).toBeNull();
			expect(getGoogleClientSecret()).toBeNull();
		});

		it('returns trimmed values when present', () => {
			process.env.GOOGLE_CLIENT_ID = '  abc.apps.googleusercontent.com  ';
			process.env.GOOGLE_CLIENT_SECRET = '  shh  ';
			expect(getGoogleClientId()).toBe('abc.apps.googleusercontent.com');
			expect(getGoogleClientSecret()).toBe('shh');
		});

		it('treats blank-only env as unset', () => {
			process.env.GOOGLE_CLIENT_ID = '   ';
			expect(getGoogleClientId()).toBeNull();
		});
	});

	describe('generatePkcePair', () => {
		it('produces a valid S256 verifier/challenge pair', () => {
			const { codeVerifier, codeChallenge } = generatePkcePair();
			expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
			expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
			const expected = crypto
				.createHash('sha256')
				.update(codeVerifier)
				.digest('base64')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=+$/, '');
			expect(codeChallenge).toBe(expected);
		});

		it('produces a different pair on each call', () => {
			const a = generatePkcePair();
			const b = generatePkcePair();
			expect(a.codeVerifier).not.toBe(b.codeVerifier);
		});
	});

	describe('signState / verifyState', () => {
		it('round-trips a valid state', () => {
			const state = signState('s3cret');
			expect(state).toMatch(/^[a-f0-9]{32}\.[a-f0-9]{32}$/);
			expect(verifyState('s3cret', state)).toBe(true);
		});

		it('rejects forged signatures', () => {
			const state = signState('s3cret');
			const [nonce] = state.split('.');
			expect(verifyState('s3cret', `${nonce}.${'0'.repeat(32)}`)).toBe(false);
		});

		it('rejects state signed with a different secret', () => {
			const state = signState('s3cret');
			expect(verifyState('other', state)).toBe(false);
		});

		it('rejects malformed state', () => {
			expect(verifyState('s3cret', null)).toBe(false);
			expect(verifyState('s3cret', '')).toBe(false);
			expect(verifyState('s3cret', 'no-dot')).toBe(false);
			expect(verifyState('s3cret', 'a.b')).toBe(false);
			expect(verifyState('s3cret', 'zz.zz')).toBe(false);
		});
	});

	describe('buildAuthorizeUrl', () => {
		it('includes all required params + S256 challenge + offline + prompt=consent by default', () => {
			const url = buildAuthorizeUrl({
				clientId: 'cid',
				redirectUri: 'https://shop.example/cb',
				state: 'st',
				codeChallenge: 'challenge',
			});
			const u = new URL(url);
			expect(u.origin + u.pathname).toBe(GOOGLE_AUTH_ENDPOINT);
			expect(u.searchParams.get('response_type')).toBe('code');
			expect(u.searchParams.get('client_id')).toBe('cid');
			expect(u.searchParams.get('redirect_uri')).toBe('https://shop.example/cb');
			expect(u.searchParams.get('state')).toBe('st');
			expect(u.searchParams.get('code_challenge')).toBe('challenge');
			expect(u.searchParams.get('code_challenge_method')).toBe('S256');
			expect(u.searchParams.get('access_type')).toBe('offline');
			expect(u.searchParams.get('prompt')).toBe('consent');
			expect(u.searchParams.get('scope')).toBe(GOOGLE_DEFAULT_SCOPES.join(' '));
		});

		it('honors custom scopes / prompt / login_hint', () => {
			const url = buildAuthorizeUrl({
				clientId: 'cid',
				redirectUri: 'https://x/y',
				state: 's',
				codeChallenge: 'c',
				scopes: ['https://www.googleapis.com/auth/userinfo.email'],
				prompt: 'select_account',
				loginHint: 'me@example.com',
				includeGrantedScopes: true,
			});
			const u = new URL(url);
			expect(u.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/userinfo.email');
			expect(u.searchParams.get('prompt')).toBe('select_account');
			expect(u.searchParams.get('login_hint')).toBe('me@example.com');
			expect(u.searchParams.get('include_granted_scopes')).toBe('true');
		});
	});

	describe('exchangeCodeForToken', () => {
		it('POSTs grant_type=authorization_code with PKCE params and returns the token', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						access_token: 'ya29.AbCd',
						token_type: 'Bearer',
						expires_in: 3599,
						refresh_token: '1//RefreshToken',
						scope: 'https://www.googleapis.com/auth/adwords',
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);

			const result = await exchangeCodeForToken({
				code: 'AUTH_CODE',
				codeVerifier: 'verifier_val',
				redirectUri: 'https://shop.example/cb',
				clientId: 'cid',
				clientSecret: 'csecret',
			});

			expect(result.access_token).toBe('ya29.AbCd');
			expect(result.refresh_token).toBe('1//RefreshToken');
			expect(result.expires_in).toBe(3599);

			expect(fetchSpy).toHaveBeenCalledTimes(1);
			const [calledUrl, init] = fetchSpy.mock.calls[0];
			expect(String(calledUrl)).toBe(GOOGLE_TOKEN_ENDPOINT);
			expect(init?.method).toBe('POST');
			const body = init?.body as URLSearchParams;
			expect(body.get('grant_type')).toBe('authorization_code');
			expect(body.get('client_id')).toBe('cid');
			expect(body.get('client_secret')).toBe('csecret');
			expect(body.get('code')).toBe('AUTH_CODE');
			expect(body.get('redirect_uri')).toBe('https://shop.example/cb');
			expect(body.get('code_verifier')).toBe('verifier_val');
		});

		it('throws with the Google error_description on failure', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						error: 'invalid_grant',
						error_description: 'Bad Request',
					}),
					{ status: 400, headers: { 'content-type': 'application/json' } },
				),
			);
			await expect(
				exchangeCodeForToken({
					code: 'expired',
					codeVerifier: 'v',
					redirectUri: 'https://x/y',
					clientId: 'c',
					clientSecret: 's',
				}),
			).rejects.toThrow(/Bad Request/);
		});
	});

	describe('refreshAccessToken', () => {
		it('POSTs grant_type=refresh_token and returns a new access_token (no rotation of refresh_token)', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						access_token: 'ya29.NEW',
						token_type: 'Bearer',
						expires_in: 3599,
						scope: 'https://www.googleapis.com/auth/adwords',
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			const result = await refreshAccessToken({
				refreshToken: 'rt',
				clientId: 'cid',
				clientSecret: 'csecret',
			});
			expect(result.access_token).toBe('ya29.NEW');
			// Google rarely rotates refresh_tokens — verify our typing accepts undefined.
			expect(result.refresh_token).toBeUndefined();
			const body = fetchSpy.mock.calls[0][1]?.body as URLSearchParams;
			expect(body.get('grant_type')).toBe('refresh_token');
			expect(body.get('refresh_token')).toBe('rt');
		});

		it('surfaces invalid_grant when the refresh token has been revoked', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ error: 'invalid_grant' }), {
					status: 400,
					headers: { 'content-type': 'application/json' },
				}),
			);
			await expect(
				refreshAccessToken({ refreshToken: 'revoked', clientId: 'c', clientSecret: 's' }),
			).rejects.toThrow(/invalid_grant/);
		});
	});
});
