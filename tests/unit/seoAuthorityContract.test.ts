import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('SEO + authority + AI search contract', () => {
  it('keeps a human-first technical authority hub and discovery files', () => {
    const hub = read('src/app/centro-tecnico/page.tsx');
    const llms = read('public/llms.txt');
    const sitemap = read('src/app/sitemap.ts');

    expect(hub).toContain('Calculamos antes de recomendar');
    expect(hub).toContain('Fuentes técnicas consultables');
    expect(llms).toContain('/centro-tecnico');
    expect(llms).toContain('/herramientas/metalcon/monitoreo');
    expect(sitemap).toContain('/centro-tecnico');
  });

  it('keeps methodology and source blocks on all core tools', () => {
    const air = read('src/app/herramientas/aire-acondicionado/page.tsx');
    const radier = read('src/app/herramientas/radier/page.tsx');
    const metalcon = read('src/app/herramientas/metalcon/page.tsx');
    const seismic = read('src/app/herramientas/metalcon/monitoreo/page.tsx');

    for (const content of [air, radier, metalcon, seismic]) {
      expect(content).toContain('TechnicalAuthoritySection');
      expect(content).toContain('StructuredData');
    }
  });

  it('does not present the public site as unfinished', () => {
    const loading = read('src/app/loading.tsx');
    const splash = read('src/components/SplashScreen.tsx');

    expect(loading).not.toContain('Preparando Soluciones Fabrick');
    expect(splash).not.toContain('Preparando Soluciones Fabrick');
  });

  it('keeps Pay Per Crawl isolated from the Vercel runtime', () => {
    const worker = read('infra/cloudflare/pay-per-crawl-worker.js');
    const middleware = read('src/middleware.ts');

    expect(worker).toContain('cf-pay-per-crawl');
    expect(worker).toContain('crawler-price');
    expect(middleware).not.toContain('crawler-price');
  });
});
