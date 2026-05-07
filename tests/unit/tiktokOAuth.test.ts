import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	TIKTOK_ADVERTISERS_PATH,
	TIKTOK_BUSINESS_API,
	TIKTOK_BUSINESS_AUTH,
	TIKTOK_TOKEN_PATH,
	buildAuthorizeUrl,
	exchangeAuthCode,
	getTikTokAppId,
	getTikTokAppSecret,
	listAdvertisers,
	signState,
	verifyState,
} from '@/lib/tiktokOAuth';

describe('tiktokOAuth', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		delete process.env.TIKTOK_APP_ID;
		delete process.env.TIKTOK_APP_SECRET;
	});

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it('exposes business-api endpoints', () => {
		expect(TIKTOK_BUSINESS_AUTH).toBe('https://business-api.tiktok.com/portal/auth');
		expect(TIKTOK_BUSINESS_API).toBe('https://business-api.tiktok.com');
	});

	describe('app credential helpers', () => {
		it('returns null when env is unset', () => {
			expect(getTikTokAppId()).toBeNull();
			expect(getTikTokAppSecret()).toBeNull();
		});
		it('returns trimmed values', () => {
			process.env.TIKTOK_APP_ID = '  appid  ';
			process.env.TIKTOK_APP_SECRET = '  shh  ';
			expect(getTikTokAppId()).toBe('appid');
			expect(getTikTokAppSecret()).toBe('shh');
		});
	});

	describe('signState / verifyState', () => {
		it('round-trips a valid state', () => {
			const s = signState('top');
			expect(verifyState('top', s)).toBe(true);
			expect(verifyState('other', s)).toBe(false);
		});
		it('rejects malformed state', () => {
			expect(verifyState('top', null)).toBe(false);
			expect(verifyState('top', 'aa.bb')).toBe(false);
		});
	});

	describe('buildAuthorizeUrl', () => {
		it('builds /portal/auth with app_id, redirect_uri, state', () => {
			const url = buildAuthorizeUrl({
				appId: 'app123',
				redirectUri: 'https://shop.example/cb',
				state: 'st',
			});
			const u = new URL(url);
			expect(u.origin + u.pathname).toBe(TIKTOK_BUSINESS_AUTH);
			expect(u.searchParams.get('app_id')).toBe('app123');
			expect(u.searchParams.get('redirect_uri')).toBe('https://shop.example/cb');
			expect(u.searchParams.get('state')).toBe('st');
		});
	});

	describe('exchangeAuthCode', () => {
		it('POSTs JSON to /open_api/v1.3/oauth2/access_token/ and returns access_token + advertiser_ids', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						code: 0,
						message: 'OK',
						data: { access_token: 'tt-tok', advertiser_ids: ['111', '222'] },
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			const data = await exchangeAuthCode({
				authCode: 'AUTH',
				appId: 'app123',
				appSecret: 'sec',
			});
			expect(data.access_token).toBe('tt-tok');
			expect(data.advertiser_ids).toEqual(['111', '222']);
			const [calledUrl, init] = fetchSpy.mock.calls[0];
			expect(String(calledUrl)).toBe(`${TIKTOK_BUSINESS_API}${TIKTOK_TOKEN_PATH}`);
			expect(init?.method).toBe('POST');
			const body = JSON.parse(String(init?.body));
			expect(body).toEqual({ app_id: 'app123', secret: 'sec', auth_code: 'AUTH' });
		});

		it('throws with the TikTok message on non-zero code', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({ code: 40105, message: 'Auth code is invalid', data: {} }),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			await expect(
				exchangeAuthCode({ authCode: 'bad', appId: 'a', appSecret: 's' }),
			).rejects.toThrow(/Auth code is invalid/);
		});

		it('throws on HTTP failure', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(JSON.stringify({}), { status: 500 }),
			);
			await expect(
				exchangeAuthCode({ authCode: 'x', appId: 'a', appSecret: 's' }),
			).rejects.toThrow(/HTTP 500/);
		});
	});

	describe('listAdvertisers', () => {
		it('returns the advertiser list with names', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						code: 0,
						message: 'OK',
						data: {
							list: [
								{ advertiser_id: '111', advertiser_name: 'Acme' },
								{ advertiser_id: '222', advertiser_name: 'Beta' },
							],
						},
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			const advertisers = await listAdvertisers({
				accessToken: 'tt-tok',
				appId: 'app123',
				appSecret: 'sec',
			});
			expect(advertisers).toHaveLength(2);
			expect(advertisers[0].advertiser_name).toBe('Acme');

			const init = fetchSpy.mock.calls[0][1];
			expect((init?.headers as Record<string, string>)['Access-Token']).toBe('tt-tok');
			const url = new URL(String(fetchSpy.mock.calls[0][0]));
			expect(url.pathname).toBe(TIKTOK_ADVERTISERS_PATH);
			expect(url.searchParams.get('app_id')).toBe('app123');
			expect(url.searchParams.get('secret')).toBe('sec');
		});

		it('throws on TikTok-side error', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
				new Response(
					JSON.stringify({ code: 40001, message: 'Access token invalid' }),
					{ status: 200, headers: { 'content-type': 'application/json' } },
				),
			);
			await expect(
				listAdvertisers({ accessToken: 'bad', appId: 'a', appSecret: 's' }),
			).rejects.toThrow(/Access token invalid/);
		});
	});
});
