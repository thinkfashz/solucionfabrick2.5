import { describe, expect, it } from 'vitest';
import { resolveCatalogCategoryName } from '@/lib/catalogCategory';

describe('catalog category resolution', () => {
  it('preserves the persisted product category label when present', () => {
    expect(resolveCatalogCategoryName('  Radier  ', null, {})).toBe('Radier');
    expect(resolveCatalogCategoryName('Climatización', 'legacy-id', { 'legacy-id': 'Otro' })).toBe('Climatización');
  });

  it('falls back to the categories table for legacy UUID-backed products', () => {
    expect(resolveCatalogCategoryName(null, 'category-123', { 'category-123': 'Iluminación' })).toBe('Iluminación');
  });

  it('does not invent a category when neither source can resolve one', () => {
    expect(resolveCatalogCategoryName(null, null, {})).toBeUndefined();
    expect(resolveCatalogCategoryName('', 'missing', {})).toBeUndefined();
  });
});
