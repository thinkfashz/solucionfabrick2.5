import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('scripts/ensure-store-seed-products.mjs', 'utf8');

describe('starter storefront catalog seed', () => {
  it('defines twenty editable products across calculator-adjacent categories', () => {
    const skus = [...source.matchAll(/sku:\s*'([^']+)'/g)].map((match) => match[1]);
    expect(new Set(skus).size).toBe(20);
    for (const category of ['Cemento', 'Radier', 'Climatización', 'Herramientas', 'Electricidad', 'Iluminación']) {
      expect(source).toContain(`category: '${category}'`);
    }
  });

  it('is insert-only so later admin edits are not overwritten by builds', () => {
    expect(source).toContain('INSERT INTO public.products');
    expect(source).toContain('WHERE NOT EXISTS');
    expect(source).not.toMatch(/UPDATE\s+public\.products/i);
    expect(source).toContain("editable: true");
    expect(source).toContain("initialPriceOnly: true");
  });

  it('uses a stable tenant, SKU and source id for idempotency', () => {
    expect(source).toContain("00000000-0000-0000-0000-000000000001");
    expect(source).toContain("source_id");
    expect(source).toContain("p.source_id");
    expect(source).toContain("lower(trim(COALESCE(p.sku, ''))) = lower");
  });

  it('keeps the cement starter price at the requested rounded 10 percent reference', () => {
    expect(source).toMatch(/sku:\s*'FAB-CEM-025'[\s\S]*?price:\s*5600/);
  });
});
