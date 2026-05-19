import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  // limpiamos vars relevantes antes de cada caso
  vi.stubEnv('NODE_ENV', '');
  vi.stubEnv('ADMIN_SESSION_SECRET', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
});

describe('getMissingAdminEnvVars', () => {
  it('en development no exige ADMIN_SESSION_SECRET', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { getMissingAdminEnvVars } = await import('@/lib/insforge');
    expect(getMissingAdminEnvVars()).toEqual([]);
  });

  it('en test no exige ADMIN_SESSION_SECRET', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const { getMissingAdminEnvVars } = await import('@/lib/insforge');
    expect(getMissingAdminEnvVars()).toEqual([]);
  });

  it('en producción reporta vars ausentes', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { getMissingAdminEnvVars } = await import('@/lib/insforge');
    const missing = getMissingAdminEnvVars();
    expect(missing).toContain('ADMIN_SESSION_SECRET');
    expect(missing).toContain('INSFORGE_API_KEY');
  });

  it('en producción con la var seteada, lista vacía', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'a'.repeat(32));
    vi.stubEnv('INSFORGE_API_KEY', 'test-api-key');
    const { getMissingAdminEnvVars } = await import('@/lib/insforge');
    expect(getMissingAdminEnvVars()).toEqual([]);
  });
});

describe('INSFORGE_BASE_URL / INSFORGE_PUBLIC_ANON_KEY', () => {
  it('exporta strings no vacíos (con fallback hardcoded si las env vars faltan)', async () => {
    const mod = await import('@/lib/insforge');
    expect(typeof mod.INSFORGE_BASE_URL).toBe('string');
    expect(mod.INSFORGE_BASE_URL.length).toBeGreaterThan(0);
    expect(mod.INSFORGE_BASE_URL).toMatch(/^https?:\/\//);
    expect(typeof mod.INSFORGE_PUBLIC_ANON_KEY).toBe('string');
    expect(mod.INSFORGE_PUBLIC_ANON_KEY.length).toBeGreaterThan(0);
  });
});
