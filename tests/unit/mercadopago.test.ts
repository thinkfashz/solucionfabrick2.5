import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  probeMercadoPago,
  getMercadoPagoPublicKey,
  getMercadoPagoAccessToken,
  detectMpMode,
  getMpTokenPrefix,
  fetchMercadoPagoAccount,
} from '@/lib/mercadopago';

const ENV_KEYS = [
  'MERCADO_PAGO_ACCESS_TOKEN',
  'MP_ACCESS_TOKEN',
  'MERCADOPAGO_ACCESS_TOKEN',
  'NEXT_PUBLIC_MP_PUBLIC_KEY',
  'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY',
  'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY',
  'MP_PUBLIC_KEY',
  'MERCADO_PAGO_PUBLIC_KEY',
  'MERCADOPAGO_PUBLIC_KEY',
];

const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.restoreAllMocks();
});

describe('getMercadoPagoPublicKey', () => {
  it('reads NEXT_PUBLIC_MP_PUBLIC_KEY first', () => {
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY = 'pub_a';
    process.env.MP_PUBLIC_KEY = 'pub_b';
    expect(getMercadoPagoPublicKey()).toBe('pub_a');
  });

  it('falls back through aliases', () => {
    process.env.MERCADOPAGO_PUBLIC_KEY = 'pub_z';
    expect(getMercadoPagoPublicKey()).toBe('pub_z');
  });

  it('returns empty string when nothing is set', () => {
    expect(getMercadoPagoPublicKey()).toBe('');
  });
});

describe('getMercadoPagoAccessToken', () => {
  it('prefers MERCADO_PAGO_ACCESS_TOKEN', () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'tok_a';
    process.env.MP_ACCESS_TOKEN = 'tok_b';
    expect(getMercadoPagoAccessToken()).toBe('tok_a');
  });
  it('returns empty string when nothing is set', () => {
    expect(getMercadoPagoAccessToken()).toBe('');
  });
});

describe('probeMercadoPago', () => {
  it('reports "unconfigured" when no env vars are set', async () => {
    const result = await probeMercadoPago({ fetchImpl: vi.fn() as unknown as typeof fetch });
    expect(result.status).toBe('unconfigured');
    expect(result.reachable).toBe(false);
    expect(result.hasAccessToken).toBe(false);
    expect(result.publicKey).toBe('');
  });

  it('reports "unconfigured" when only the public key is set', async () => {
    process.env.NEXT_PUBLIC_MP_PUBLIC_KEY = 'pub_test';
    const result = await probeMercadoPago({ fetchImpl: vi.fn() as unknown as typeof fetch });
    expect(result.status).toBe('unconfigured');
    expect(result.publicKey).toBe('pub_test');
    expect(result.hasAccessToken).toBe(false);
  });

  it('reports "ok" with latency when MP responds 200', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'tok_test';
    process.env.MP_PUBLIC_KEY = 'pub_test';
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('ok');
    expect(result.reachable).toBe(true);
    expect(result.publicKey).toBe('pub_test');
    expect(result.hasAccessToken).toBe(true);
    expect(result.latencyMs).not.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const calledUrl = fetchImpl.mock.calls[0][0] as string;
    expect(calledUrl).toContain('api.mercadopago.com');
  });

  it('reports "invalid_token" when MP returns 401', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'bad_token';
    process.env.MP_PUBLIC_KEY = 'pub_test';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('invalid_token');
    expect(result.reachable).toBe(true);
  });

  it('reports "invalid_token" when MP returns 403', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'bad_token';
    process.env.MP_PUBLIC_KEY = 'pub_test';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 403 }));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('invalid_token');
  });

  it('reports "unreachable" on network error', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'tok_test';
    process.env.MP_PUBLIC_KEY = 'pub_test';
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('unreachable');
    expect(result.reachable).toBe(false);
  });

  it('reports "unreachable" on non-2xx non-auth response', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'tok_test';
    process.env.MP_PUBLIC_KEY = 'pub_test';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('unreachable');
    expect(result.message).toContain('500');
  });

  it('aborts when the request exceeds the timeout', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'tok_test';
    process.env.MP_PUBLIC_KEY = 'pub_test';
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });
    const result = await probeMercadoPago({
      fetchImpl: fetchImpl as unknown as typeof fetch,
      timeoutMs: 100,
    });
    expect(result.status).toBe('unreachable');
    expect(result.message).toMatch(/no respondió/i);
  });

  it('never echoes the access token in the result', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'super-secret-token';
    process.env.MP_PUBLIC_KEY = 'pub_test';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(JSON.stringify(result)).not.toContain('super-secret-token');
  });
});

describe('detectMpMode', () => {
  it('returns "production" for APP_USR- tokens', () => {
    expect(detectMpMode('APP_USR-1234-abcd')).toBe('production');
  });
  it('returns "sandbox" for TEST- tokens', () => {
    expect(detectMpMode('TEST-1234-abcd')).toBe('sandbox');
  });
  it('returns "unknown" for empty input', () => {
    expect(detectMpMode('')).toBe('unknown');
    expect(detectMpMode('   ')).toBe('unknown');
  });
  it('returns "unknown" for unrecognised prefixes', () => {
    expect(detectMpMode('PROD_999')).toBe('unknown');
    expect(detectMpMode('app_usr-1234')).toBe('unknown'); // case-sensitive
  });
});

describe('getMpTokenPrefix', () => {
  it('extracts the alphanumeric prefix before the first dash', () => {
    expect(getMpTokenPrefix('APP_USR-1234-abcd')).toBe('APP_USR');
    expect(getMpTokenPrefix('TEST-1234-abcd')).toBe('TEST');
  });
  it('returns empty string for empty input', () => {
    expect(getMpTokenPrefix('')).toBe('');
  });
  it('returns the first 8 chars when no dash is present', () => {
    expect(getMpTokenPrefix('NODASHTOKEN')).toBe('NODASHTO');
  });
});

describe('probeMercadoPago — mode and tokenPrefix', () => {
  it('reports mode=production for APP_USR- tokens', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-prod-token';
    process.env.MP_PUBLIC_KEY = 'APP_USR-pub';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('ok');
    expect(result.mode).toBe('production');
    expect(result.tokenPrefix).toBe('APP_USR');
  });

  it('reports mode=sandbox for TEST- tokens', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-sandbox-token';
    process.env.MP_PUBLIC_KEY = 'TEST-pub';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('ok');
    expect(result.mode).toBe('sandbox');
    expect(result.tokenPrefix).toBe('TEST');
    expect(result.message).toMatch(/demo/i);
  });

  it('returns mode=unknown when nothing is configured', async () => {
    const result = await probeMercadoPago();
    expect(result.status).toBe('unconfigured');
    expect(result.mode).toBe('unknown');
    expect(result.tokenPrefix).toBe('');
  });

  it('still includes mode/tokenPrefix on invalid_token responses', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-bad';
    process.env.MP_PUBLIC_KEY = 'pk';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('forbidden', { status: 401 }));
    const result = await probeMercadoPago({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result.status).toBe('invalid_token');
    expect(result.mode).toBe('sandbox');
    expect(result.tokenPrefix).toBe('TEST');
  });
});

describe('fetchMercadoPagoAccount', () => {
  it('returns null when no access token is provided', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchMercadoPagoAccount('', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('parses the merchant identity from /users/me', async () => {
    const body = JSON.stringify({
      id: 12345,
      email: 'merchant@example.com',
      nickname: 'TESTUSER123',
      site_id: 'MLC',
      tags: ['test_user', 'normal'],
    });
    const fetchImpl = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));
    // Use a fresh, unique token to bypass the in-memory 60s cache.
    const token = `TEST-account-${Math.random().toString(36).slice(2)}`;
    const result = await fetchMercadoPagoAccount(token, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({
      id: 12345,
      email: 'merchant@example.com',
      nickname: 'TESTUSER123',
      siteId: 'MLC',
      isTestUser: true,
    });
  });

  it('returns null when /users/me responds with non-2xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403 }));
    const token = `TEST-403-${Math.random().toString(36).slice(2)}`;
    const result = await fetchMercadoPagoAccount(token, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBeNull();
  });
});
