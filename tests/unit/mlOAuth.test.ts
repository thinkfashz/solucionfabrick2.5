import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  generatePkcePair,
  getMlAuthDomain,
  getMlClientId,
  getMlClientSecret,
  refreshAccessToken,
} from '@/lib/mlOAuth';

describe('mlOAuth', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ML_AUTH_DOMAIN;
    delete process.env.ML_CLIENT_ID;
    delete process.env.ML_CLIENT_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('getMlAuthDomain', () => {
    it('defaults to auth.mercadolibre.cl', () => {
      expect(getMlAuthDomain()).toBe('auth.mercadolibre.cl');
    });

    it('honors ML_AUTH_DOMAIN override', () => {
      process.env.ML_AUTH_DOMAIN = 'auth.mercadolibre.com.ar';
      expect(getMlAuthDomain()).toBe('auth.mercadolibre.com.ar');
    });

    it('ignores blank ML_AUTH_DOMAIN', () => {
      process.env.ML_AUTH_DOMAIN = '   ';
      expect(getMlAuthDomain()).toBe('auth.mercadolibre.cl');
    });
  });

  describe('getMlClientId / getMlClientSecret', () => {
    it('returns null when env is unset', () => {
      expect(getMlClientId()).toBeNull();
      expect(getMlClientSecret()).toBeNull();
    });

    it('returns trimmed values when present', () => {
      process.env.ML_CLIENT_ID = '  12345  ';
      process.env.ML_CLIENT_SECRET = '  shh  ';
      expect(getMlClientId()).toBe('12345');
      expect(getMlClientSecret()).toBe('shh');
    });
  });

  describe('generatePkcePair', () => {
    it('produces a valid S256 verifier/challenge pair', () => {
      const { codeVerifier, codeChallenge } = generatePkcePair();
      // RFC 7636 §4.1: verifier length must be 43..128 chars, charset
      // [A-Z], [a-z], [0-9], "-", ".", "_", "~". base64url(32 bytes) = 43 chars.
      expect(codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
      // Challenge must be base64url(SHA256(verifier)).
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
      expect(a.codeChallenge).not.toBe(b.codeChallenge);
    });
  });
  describe('buildAuthorizeUrl', () => {
    it('encodes all required ML authorization params with S256 PKCE', () => {
      const url = buildAuthorizeUrl({
        clientId: '6050803232406218',
        redirectUri: 'https://shop.example/api/admin/ml/oauth/callback',
        state: 'nonce.sig',
        codeChallenge: 'challenge_value',
      });
      const parsed = new URL(url);
      expect(parsed.host).toBe('auth.mercadolibre.cl');
      expect(parsed.pathname).toBe('/authorization');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('client_id')).toBe('6050803232406218');
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://shop.example/api/admin/ml/oauth/callback',
      );
      expect(parsed.searchParams.get('state')).toBe('nonce.sig');
      expect(parsed.searchParams.get('code_challenge')).toBe('challenge_value');
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    });

    it('respects an explicit authDomain (per-country)', () => {
      const url = buildAuthorizeUrl({
        clientId: 'x',
        redirectUri: 'https://x/y',
        state: 's',
        codeChallenge: 'c',
        authDomain: 'auth.mercadolibre.com.br',
      });
      expect(new URL(url).host).toBe('auth.mercadolibre.com.br');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('POSTs grant_type=authorization_code with all PKCE params and returns the token', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'APP_USR-tok',
            token_type: 'bearer',
            expires_in: 21600,
            scope: 'offline_access read write',
            user_id: 1234567,
            refresh_token: 'TG-refresh',
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

      expect(result.access_token).toBe('APP_USR-tok');
      expect(result.refresh_token).toBe('TG-refresh');
      expect(result.expires_in).toBe(21600);
      expect(result.user_id).toBe(1234567);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchSpy.mock.calls[0];
      expect(String(calledUrl)).toBe('https://api.mercadolibre.com/oauth/token');
      expect(init?.method).toBe('POST');
      const body = init?.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('client_id')).toBe('cid');
      expect(body.get('client_secret')).toBe('csecret');
      expect(body.get('code')).toBe('AUTH_CODE');
      expect(body.get('redirect_uri')).toBe('https://shop.example/cb');
      expect(body.get('code_verifier')).toBe('verifier_val');
    });

    it('throws with the ML error_description on failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'invalid_grant',
            error_description:
              'Error validating grant. Your authorization code or refresh token may be expired or it was already used',
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
      ).rejects.toThrow(/Error validating grant/);
    });
  });

  describe('refreshAccessToken', () => {
    it('POSTs grant_type=refresh_token and returns a new pair', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'NEW_TOK',
            token_type: 'bearer',
            expires_in: 21600,
            scope: 'offline_access read write',
            user_id: 1234567,
            refresh_token: 'NEW_REFRESH',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

      const result = await refreshAccessToken({
        refreshToken: 'OLD_REFRESH',
        clientId: 'cid',
        clientSecret: 'csecret',
      });

      expect(result.access_token).toBe('NEW_TOK');
      expect(result.refresh_token).toBe('NEW_REFRESH');
      const body = fetchSpy.mock.calls[0][1]?.body as URLSearchParams;
      expect(body.get('grant_type')).toBe('refresh_token');
      expect(body.get('refresh_token')).toBe('OLD_REFRESH');
      expect(body.get('client_id')).toBe('cid');
      expect(body.get('client_secret')).toBe('csecret');
    });

    it('surfaces invalid_grant when the refresh token has been consumed', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'invalid_grant' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
      );
      await expect(
        refreshAccessToken({ refreshToken: 'used', clientId: 'c', clientSecret: 's' }),
      ).rejects.toThrow(/invalid_grant/);
    });
  });
});
