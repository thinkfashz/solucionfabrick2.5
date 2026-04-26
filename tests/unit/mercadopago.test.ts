import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { probeMercadoPago, getMercadoPagoPublicKey, getMercadoPagoAccessToken } from '@/lib/mercadopago';

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
