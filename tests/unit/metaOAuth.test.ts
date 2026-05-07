import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	META_API_VERSION,
	META_DEFAULT_SCOPES,
	META_DIALOG_BASE,
	META_GRAPH_BASE,
	appSecretProof,
	buildAuthorizeUrl,
	computeMissingScopes,
	debugToken,
	exchangeCodeForToken,
	exchangeForLongLivedToken,
	getMetaAppId,
	getMetaAppSecret,
	listAccounts,
	signState,
	verifyState,
} from '@/lib/metaOAuth';

describe('metaOAuth', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.META_APP_ID;
		delete process.env.META_APP_SECRET;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it('exposes the v21.0 API endpoints', () => {
		expect(META_API_VERSION).toBe('v21.0');
		expect(META_GRAPH_BASE).toBe('https://graph.facebook.com/v21.0');
		expect(META_DIALOG_BASE).toBe('https://www.facebook.com/v21.0/dialog/oauth');
	});

	describe('app credentials helpers', () => {
		it('returns null when env is unset', () => {
			expect(getMetaAppId()).toBeNull();
			expect(getMetaAppSecret()).toBeNull();
		});

		it('returns trimmed values when present', () => {
			process.env.META_APP_ID = '  1234567890  ';
			process.env.META_APP_SECRET = '  shh  ';
			expect(getMetaAppId()).toBe('1234567890');
			expect(getMetaAppSecret()).toBe('shh');
		});
	});

	describe('signState / verifyState', () => {
		it('round-trips a valid state', () => {
			const state = signState('s3cret');
			expect(verifyState('s3cret', state)).toBe(true);
		});

		it('rejects forged state', () => {
			expect(verifyState('s3cret', 'aaaa.bbbb')).toBe(false);
			expect(verifyState('s3cret', null)).toBe(false);
		});
	});

	describe('buildAuthorizeUrl', () => {
		it('builds /dialog/oauth with comma-separated scopes', () => {
			const url = buildAuthorizeUrl({
				clientId: 'cid',
				redirectUri: 'https://shop.example/cb',
				state: 'st',
			});
			const u = new URL(url);
			expect(u.origin + u.pathname).toBe(META_DIALOG_BASE);
			expect(u.searchParams.get('client_id')).toBe('cid');
			expect(u.searchParams.get('redirect_uri')).toBe('https://shop.example/cb');
			expect(u.searchParams.get('state')).toBe('st');
			expect(u.searchParams.get('response_type')).toBe('code');
			// Meta uses comma-separated scopes (not space)
			expect(u.searchParams.get('scope')).toBe(META_DEFAULT_SCOPES.join(','));
		});

		it('honors auth_type when provided', () => {
			const url = buildAuthorizeUrl({
				clientId: 'cid',
				redirectUri: 'https://x',
				state: 's',
				authType: 'rerequest',
			});
			expect(new URL(url).searchParams.get('auth_type')).toBe('rerequest');
		});
	});

	describe('exchangeCodeForToken', () => {
		it('GETs /oauth/access_token with the right query params', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({ access_token: 'EAAG_short', token_type: 'bearer', expires_in: 5183999 }),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			const result = await exchangeCodeForToken({
				code: 'AUTH',
				redirectUri: 'https://shop.example/cb',
				clientId: 'cid',
				clientSecret: 'csecret',
			});
			expect(result.access_token).toBe('EAAG_short');
			const calledUrl = new URL(String(fetchSpy.mock.calls[0][0]));
			expect(calledUrl.origin + calledUrl.pathname).toBe(`${META_GRAPH_BASE}/oauth/access_token`);
			expect(calledUrl.searchParams.get('code')).toBe('AUTH');
			expect(calledUrl.searchParams.get('client_id')).toBe('cid');
			expect(calledUrl.searchParams.get('client_secret')).toBe('csecret');
			expect(calledUrl.searchParams.get('redirect_uri')).toBe('https://shop.example/cb');
		});

		it('throws with the Meta error.message on failure', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({ error: { message: 'Invalid verification code format.', code: 100 } }),
					{ status: 400, headers: { 'content-type': 'application/json' } },
				),
			);
			await expect(
				exchangeCodeForToken({ code: 'bad', redirectUri: 'https://x', clientId: 'c', clientSecret: 's' }),
			).rejects.toThrow(/Invalid verification code/);
		});
	});

	describe('exchangeForLongLivedToken', () => {
		it('uses grant_type=fb_exchange_token and returns the long-lived token', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({ access_token: 'EAAG_long', token_type: 'bearer', expires_in: 5183999 }),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			const r = await exchangeForLongLivedToken({
				shortLivedToken: 'EAAG_short',
				clientId: 'cid',
				clientSecret: 'csecret',
			});
			expect(r.access_token).toBe('EAAG_long');
			expect(r.expires_in).toBe(5183999);
			const url = new URL(String(fetchSpy.mock.calls[0][0]));
			expect(url.searchParams.get('grant_type')).toBe('fb_exchange_token');
			expect(url.searchParams.get('fb_exchange_token')).toBe('EAAG_short');
		});
	});

	describe('debugToken', () => {
		it('parses data.expires_at and data.scopes', async () => {
			const expiresAt = Math.floor(Date.now() / 1000) + 60 * 24 * 3600;
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						data: {
							app_id: 'appid',
							type: 'USER',
							is_valid: true,
							expires_at: expiresAt,
							scopes: ['pages_show_list', 'ads_read'],
						},
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			const data = await debugToken({ inputToken: 'tok', appAccessToken: 'appid|secret' });
			expect(data.expires_at).toBe(expiresAt);
			expect(data.scopes).toEqual(['pages_show_list', 'ads_read']);
			expect(data.is_valid).toBe(true);
		});

		it('throws on Meta error', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({ error: { message: 'Invalid OAuth access token.' } }), {
					status: 400,
					headers: { 'content-type': 'application/json' },
				}),
			);
			await expect(
				debugToken({ inputToken: 'bad', appAccessToken: 'appid|secret' }),
			).rejects.toThrow(/Invalid OAuth/);
		});
	});

	describe('listAccounts', () => {
		it('returns the data array of pages with IG accounts', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						data: [
							{
								id: '111',
								name: 'My Page',
								access_token: 'page-tok',
								category: 'Retail',
								instagram_business_account: { id: 'ig-222' },
							},
						],
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			const pages = await listAccounts({ accessToken: 'tok' });
			expect(pages).toHaveLength(1);
			expect(pages[0].id).toBe('111');
			expect(pages[0].instagram_business_account?.id).toBe('ig-222');
		});
	});

	describe('appSecretProof', () => {
		it('returns the HMAC-SHA256 hex digest of the access token', () => {
			expect(appSecretProof('tok', 'sec')).toMatch(/^[a-f0-9]{64}$/);
			// Determinism
			expect(appSecretProof('tok', 'sec')).toBe(appSecretProof('tok', 'sec'));
		});
	});

	describe('computeMissingScopes', () => {
		it('returns scopes requested but not granted', () => {
			expect(
				computeMissingScopes(
					['pages_show_list', 'instagram_content_publish', 'ads_read'],
					['pages_show_list', 'ads_read'],
				),
			).toEqual(['instagram_content_publish']);
		});

		it('returns empty when all scopes are granted', () => {
			expect(computeMissingScopes(['a', 'b'], ['a', 'b', 'c'])).toEqual([]);
		});
	});
});
