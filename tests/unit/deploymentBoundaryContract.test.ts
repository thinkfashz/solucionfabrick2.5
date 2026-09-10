import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')) as { buildCommand?: string };

describe('deployment/database boundary', () => {
  it('keeps Vercel build free of database DDL and seed side effects', () => {
    const build = pkg.scripts?.build || '';
    const vercelBuild = vercel.buildCommand || '';

    expect(vercelBuild).toBe('pnpm build');
    expect(build).toContain('next build');
    expect(build).not.toMatch(/ensure-[a-z0-9-]+schema/i);
    expect(build).not.toContain('ensure-store-seed-columns');
    expect(build).not.toContain('ensure-store-seed-products');
    expect(build).not.toContain('schema:inspirations');
    expect(vercelBuild).not.toMatch(/ensure-|schema:/i);
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
