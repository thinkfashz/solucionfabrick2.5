/**
 * Unit tests for src/lib/rateLimit.ts
 *
 * Uses vi.mock to stub out InsForge so tests run without a real database.
 * The in-memory cache is reset between tests via module re-import.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Stub InsForge before importing the module under test ────────────────────
vi.mock('@/lib/insforge', () => ({
  insforge: {
    database: {
      from: () => ({
        select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
        upsert: () => Promise.resolve({ error: null }),
      }),
    },
  },
}));

vi.mock('server-only', () => ({}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(ip = '1.2.3.4'): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'x-real-ip': ip },
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getIp', () => {
  it('prefers x-real-ip', async () => {
    const { getIp } = await import('@/lib/rateLimit');
    const req = new Request('http://localhost/', { headers: { 'x-real-ip': '5.6.7.8' } });
    expect(getIp(req)).toBe('5.6.7.8');
  });

  it('falls back to last entry in x-forwarded-for', async () => {
    const { getIp } = await import('@/lib/rateLimit');
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '10.0.0.1, 172.16.0.1, 203.0.113.5' },
    });
    expect(getIp(req)).toBe('203.0.113.5');
  });

  it('returns "unknown" when no header present', async () => {
    const { getIp } = await import('@/lib/rateLimit');
    const req = new Request('http://localhost/');
    expect(getIp(req)).toBe('unknown');
  });
});

describe('rateLimitResponse', () => {
  it('returns 429 with Retry-After header', async () => {
    const { rateLimitResponse } = await import('@/lib/rateLimit');
    const res = rateLimitResponse(42);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('uses 60s minimum when retryAfterSecs is 0', async () => {
    const { rateLimitResponse } = await import('@/lib/rateLimit');
    const res = rateLimitResponse(0);
    expect(res.headers.get('Retry-After')).toBe('60');
  });
});

describe('checkRateLimit (in-memory path)', () => {
  beforeEach(async () => {
    // Clear module registry so the in-memory Map starts fresh each test.
    vi.resetModules();
    // Re-apply mocks after reset.
    vi.mock('@/lib/insforge', () => ({
      insforge: {
        database: {
          from: () => ({
            select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
            upsert: () => Promise.resolve({ error: null }),
          }),
        },
      },
    }));
    vi.mock('server-only', () => ({}));
  });

  it('allows the first request', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const result = await checkRateLimit(makeRequest(), { prefix: 't', limit: 3, windowMs: 60_000 });
    expect(result.ok).toBe(true);
  });

  it('allows up to the limit', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const cfg = { prefix: 'u', limit: 3, windowMs: 60_000 };
    const req = makeRequest('9.9.9.9');
    await checkRateLimit(req, cfg);
    await checkRateLimit(req, cfg);
    const third = await checkRateLimit(req, cfg);
    expect(third.ok).toBe(true);
  });

  it('blocks after the limit is reached', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const cfg = { prefix: 'v', limit: 2, windowMs: 60_000 };
    const req = makeRequest('8.8.8.8');
    await checkRateLimit(req, cfg);
    await checkRateLimit(req, cfg);
    const blocked = await checkRateLimit(req, cfg);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSecs).toBeGreaterThan(0);
  });

  it('different IPs get independent counters', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const cfg = { prefix: 'w', limit: 1, windowMs: 60_000 };
    await checkRateLimit(makeRequest('1.1.1.1'), cfg);
    const blocked = await checkRateLimit(makeRequest('1.1.1.1'), cfg);
    const allowed = await checkRateLimit(makeRequest('2.2.2.2'), cfg);
    expect(blocked.ok).toBe(false);
    expect(allowed.ok).toBe(true);
  });

  it('different prefixes get independent counters', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const ip = '3.3.3.3';
    await checkRateLimit(makeRequest(ip), { prefix: 'p1', limit: 1, windowMs: 60_000 });
    const blockedP1 = await checkRateLimit(makeRequest(ip), { prefix: 'p1', limit: 1, windowMs: 60_000 });
    const allowedP2 = await checkRateLimit(makeRequest(ip), { prefix: 'p2', limit: 1, windowMs: 60_000 });
    expect(blockedP1.ok).toBe(false);
    expect(allowedP2.ok).toBe(true);
  });
});

describe('RATE_LIMITS presets', () => {
  it('exports all required presets with valid shapes', async () => {
    const { RATE_LIMITS } = await import('@/lib/rateLimit');
    const keys = ['leads', 'checkout', 'cotizaciones', 'quotes', 'comments', 'coupons', 'pushSubscribe', 'pwRecover'] as const;
    for (const k of keys) {
      const cfg = RATE_LIMITS[k];
      expect(cfg.prefix).toBeTruthy();
      expect(cfg.limit).toBeGreaterThan(0);
      expect(cfg.windowMs).toBeGreaterThan(0);
    }
  });
});
