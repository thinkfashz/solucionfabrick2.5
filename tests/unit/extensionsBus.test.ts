import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock getAdminInsforge before importing extensionsBus so the mock
// captures the database client used by the bus.
const fromMock = vi.fn();
vi.mock('@/lib/adminApi', () => ({
  getAdminInsforge: () => ({ database: { from: fromMock } }),
}));

import { dispatchHook, registerInternalHandler } from '@/lib/extensionsBus';

function buildSelect(rows: unknown) {
  // SDK chain: from(t).select(cols).eq(c,v).eq(c,v)
  const eq2 = vi.fn().mockResolvedValue({ data: rows, error: null });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { from: vi.fn().mockReturnValue({ select }), eq2 };
}

describe('extensionsBus', () => {
  beforeEach(() => {
    fromMock.mockReset();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 0 when no hooks are registered', async () => {
    const builder = buildSelect([]);
    fromMock.mockImplementation(builder.from);
    const count = await dispatchHook('order.created', { id: 'x' });
    expect(count).toBe(0);
  });

  it('invokes an internal handler and counts success', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    registerInternalHandler('test-handler', handler);
    const builder = buildSelect([
      {
        id: '1',
        extension_id: 'ext1',
        hook: 'order.created',
        handler: 'internal:test-handler',
        enabled: true,
        priority: 50,
        config: { foo: 'bar' },
      },
    ]);
    fromMock.mockImplementation(builder.from);

    const count = await dispatchHook('order.created', { id: 'order-1' });
    expect(count).toBe(1);
    expect(handler).toHaveBeenCalledWith({ id: 'order-1' }, { foo: 'bar' });
  });

  it('isolates failing handlers — one bad hook does not abort the others', async () => {
    registerInternalHandler('ok-handler', vi.fn().mockResolvedValue(undefined));
    registerInternalHandler('bad-handler', vi.fn().mockRejectedValue(new Error('boom')));
    const builder = buildSelect([
      { id: '1', extension_id: 'ext1', hook: 'order.created', handler: 'internal:bad-handler', enabled: true, priority: 1, config: {} },
      { id: '2', extension_id: 'ext2', hook: 'order.created', handler: 'internal:ok-handler', enabled: true, priority: 2, config: {} },
    ]);
    fromMock.mockImplementation(builder.from);

    const count = await dispatchHook('order.created', {});
    expect(count).toBe(1);
  });

  it('calls outgoing webhooks with HMAC signature when config.secret is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const builder = buildSelect([
      {
        id: '1',
        extension_id: 'ext1',
        hook: 'order.paid',
        handler: 'https://hook.example.com/in',
        enabled: true,
        priority: 100,
        config: { secret: 'whsec' },
      },
    ]);
    fromMock.mockImplementation(builder.from);

    const count = await dispatchHook('order.paid', { id: 'o1' });
    expect(count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, opts] = fetchMock.mock.calls[0];
    const headers = opts.headers as Record<string, string>;
    expect(headers['x-fabrick-event']).toBe('order.paid');
    expect(headers['x-fabrick-signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});
