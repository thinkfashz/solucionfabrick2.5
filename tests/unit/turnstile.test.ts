import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstile } from '@/lib/turnstile';

describe('verifyTurnstile', () => {
  const originalSecret = process.env.TURNSTILE_SECRET_KEY;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = originalSecret;
    globalThis.fetch = originalFetch;
  });

  it('returns true when TURNSTILE_SECRET_KEY is not set (feature disabled)', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(await verifyTurnstile('any-token')).toBe(true);
    expect(await verifyTurnstile(null)).toBe(true);
    expect(await verifyTurnstile(undefined)).toBe(true);
  });

  it('returns false when secret is set but token is missing', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect(await verifyTurnstile(null)).toBe(false);
    expect(await verifyTurnstile('')).toBe(false);
  });

  it('returns true when Cloudflare confirms success', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch;
    expect(await verifyTurnstile('good-token', '1.2.3.4')).toBe(true);
  });

  it('returns false when Cloudflare rejects the token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ success: false, 'error-codes': ['invalid'] }), { status: 200 })) as typeof fetch;
    expect(await verifyTurnstile('bad-token')).toBe(false);
  });

  it('returns false when Cloudflare responds with non-2xx', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = vi.fn(async () => new Response('err', { status: 500 })) as typeof fetch;
    expect(await verifyTurnstile('x')).toBe(false);
  });

  it('returns false when network throws', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = vi.fn(async () => {
      throw new Error('ECONNRESET');
    }) as typeof fetch;
    expect(await verifyTurnstile('x')).toBe(false);
  });

  it('sends the remote IP when provided', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;
    await verifyTurnstile('tkn', '8.8.8.8');
    const call = fetchMock.mock.calls[0];
    const body = (call?.[1]?.body as URLSearchParams | undefined)?.toString() ?? '';
    expect(body).toContain('remoteip=8.8.8.8');
    expect(body).toContain('response=tkn');
  });
});
