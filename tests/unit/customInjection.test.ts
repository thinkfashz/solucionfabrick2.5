import { describe, expect, it, vi, beforeEach } from 'vitest';

// Stub `server-only` (already aliased in vitest.config) and the InsForge
// SDK so we don't make real network calls. The route under test only
// reaches into adminApi → InsForge when authenticated, so for the auth
// gate we don't need a real DB.
vi.mock('@insforge/sdk', () => ({
  createClient: () => ({
    database: {
      from: () => ({
        select: () => ({ eq: () => ({ limit: () => ({ data: [], error: null }) }) }),
        insert: () => ({ select: () => ({ data: [], error: null }) }),
        update: () => ({ eq: () => ({ select: () => ({ data: [], error: null }) }) }),
      }),
    },
  }),
}));

// Build a NextRequest-like object that exposes only the surface our route uses.
function makeRequest(opts: { cookie?: string; method?: string; body?: unknown }) {
  const cookies = new Map<string, { value: string }>();
  if (opts.cookie) cookies.set('admin_session', { value: opts.cookie });
  return {
    url: 'http://localhost/api/admin/site-structure/custom-injection',
    method: opts.method ?? 'POST',
    cookies: { get: (k: string) => cookies.get(k) },
    json: async () => opts.body ?? {},
    headers: new Headers(),
  } as unknown as import('next/server').NextRequest;
}

describe('Custom Injection — admin auth gate', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects POST /api/admin/site-structure/custom-injection without admin_session cookie', async () => {
    // Force `decodeSession` to return null: stub adminAuth to bypass real HMAC.
    vi.doMock('@/lib/adminAuth', () => ({
      ADMIN_COOKIE_NAME: 'admin_session',
      decodeSession: async () => null,
    }));
    const route = await import('@/app/api/admin/site-structure/[key]/route');
    const res = await route.POST(
      makeRequest({ method: 'POST', body: { content: { enabled: true } } }),
      { params: Promise.resolve({ key: 'custom-injection' }) },
    );
    expect(res.status).toBe(401);
  });

  it('rejects unknown section keys with 404', async () => {
    vi.doMock('@/lib/adminAuth', () => ({
      ADMIN_COOKIE_NAME: 'admin_session',
      decodeSession: async () => ({ email: 'a@b', exp: Date.now() + 1000, rol: 'admin' }),
    }));
    const route = await import('@/app/api/admin/site-structure/[key]/route');
    const res = await route.POST(
      makeRequest({ method: 'POST', cookie: 'fake', body: { content: {} } }),
      { params: Promise.resolve({ key: 'totally-bogus' }) },
    );
    expect(res.status).toBe(404);
  });

  it('rejects POST without `content` payload (400)', async () => {
    vi.doMock('@/lib/adminAuth', () => ({
      ADMIN_COOKIE_NAME: 'admin_session',
      decodeSession: async () => ({ email: 'a@b', exp: Date.now() + 1000, rol: 'admin' }),
    }));
    const route = await import('@/app/api/admin/site-structure/[key]/route');
    const res = await route.POST(
      makeRequest({ method: 'POST', cookie: 'fake', body: {} }),
      { params: Promise.resolve({ key: 'custom-injection' }) },
    );
    expect(res.status).toBe(400);
  });
});

describe('Custom Injection — defaults', () => {
  it('defaults to enabled=false (no markup ever emitted unless an admin opts in)', async () => {
    const mod = await import('@/lib/siteStructureTypes');
    expect(mod.DEFAULT_CUSTOM_INJECTION.enabled).toBe(false);
    expect(mod.DEFAULT_CUSTOM_INJECTION.head.html).toBe('');
    expect(mod.DEFAULT_CUSTOM_INJECTION.bodyEnd.html).toBe('');
    expect(mod.DEFAULT_CUSTOM_INJECTION.bodyEnd.js).toBe('');
    expect(mod.DEFAULT_CUSTOM_INJECTION.css).toBe('');
  });
});
