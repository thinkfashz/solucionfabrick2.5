import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
const vercel = JSON.parse(read('vercel.json')) as { buildCommand?: string };

describe('deployment/database boundary', () => {
  it('keeps pnpm build free of DDL while deployment applies one controlled migration', () => {
    const build = pkg.scripts?.build || '';
    const vercelBuild = vercel.buildCommand || '';
    expect(build).toContain('next build');
    expect(build).not.toMatch(/ensure-[a-z0-9-]+schema/i);
    expect(build).not.toContain('ensure-store-seed-columns');
    expect(build).not.toContain('ensure-store-seed-products');
    expect(vercelBuild).toBe('node scripts/apply-customer-data-migration.mjs && pnpm build');
    const runner = read('scripts/apply-customer-data-migration.mjs');
    expect(runner).toContain('/api/database/advance/rawsql');
    expect(runner).not.toContain('/unrestricted');
  });

  it('keeps private customer schema versioned, additive and protected by RLS', () => {
    const migration = read('migrations/20260910_customer_data_crm.sql');
    for (const table of ['customer_profiles', 'customer_addresses', 'user_consents', 'crm_customers']) expect(migration).toContain(table);
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('fabrick_schema_migrations');
    expect(migration).not.toMatch(/DROP TABLE|TRUNCATE/i);
  });

  it('requires explicit terms consent and keeps marketing optional', () => {
    const auth = read('src/app/auth/page.tsx');
    const profileApi = read('src/app/api/account/profile/route.ts');
    const crm = read('src/app/api/admin/crm/route.ts');
    expect(auth).toContain('acceptTerms');
    expect(auth).toContain('marketingOptIn');
    expect(auth).toContain('/legal/terminos-y-condiciones');
    expect(auth).toContain('/legal/privacidad');
    expect(profileApi).toContain('CONSENT_REQUIRED');
    expect(crm).toContain('isAdminSession');
    expect(crm).not.toContain('rawsql/unrestricted');
  });

  it('keeps financial regression gates in the build', () => {
    const build = pkg.scripts?.build || '';
    expect(build).toContain('test:commerce-p0');
    expect(build).toContain('test:funnel-btu');
    expect(build).toContain('test:radier');
    expect(build).toContain('test:storefront');
    expect(build).toContain('test:seo-authority');
  });
});
