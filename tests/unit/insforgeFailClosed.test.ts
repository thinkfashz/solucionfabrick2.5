import { afterEach, describe, expect, it, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalKey = process.env.INSFORGE_API_KEY;

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalKey === undefined) delete process.env.INSFORGE_API_KEY;
  else process.env.INSFORGE_API_KEY = originalKey;
});

describe('InsForge admin fail-closed', () => {
  it('rechaza la inicialización administrativa en producción sin INSFORGE_API_KEY', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INSFORGE_API_KEY', '');
    const { getInsforgeAdminKey } = await import('@/lib/insforge');
    expect(() => getInsforgeAdminKey()).toThrow('INSFORGE_API_KEY_REQUIRED');
  });

  it('usa la service key cuando está configurada', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('INSFORGE_API_KEY', 'service-test-key');
    const { getInsforgeAdminKey } = await import('@/lib/insforge');
    expect(getInsforgeAdminKey()).toBe('service-test-key');
  });
});
