import { afterEach, describe, expect, it, vi } from 'vitest';

const keys = ['ORDER_TRACKING_SECRET', 'NEXTAUTH_SECRET', 'PAYMENTS_WEBHOOK_SECRET'] as const;
const originals = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  for (const key of keys) {
    const value = originals[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

describe('order tracking signing', () => {
  it('falla cerrado en producción cuando no existe secreto de firma', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    for (const key of keys) vi.stubEnv(key, '');
    const { createOrderTrackingToken } = await import('@/lib/orderTracking');
    expect(() => createOrderTrackingToken('FBK-1')).toThrow('ORDER_TRACKING_SECRET_REQUIRED');
  });

  it('crea y valida token cuando ORDER_TRACKING_SECRET está configurado', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ORDER_TRACKING_SECRET', 'tracking-secret-for-tests-1234567890');
    const { createOrderTrackingToken, parseOrderTrackingToken } = await import('@/lib/orderTracking');
    const token = createOrderTrackingToken('FBK-1');
    expect(parseOrderTrackingToken(token)).toEqual({ orderId: 'FBK-1' });
  });
});
