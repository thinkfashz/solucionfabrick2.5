import { describe, expect, it } from 'vitest';
import { normalizeImportUrl } from '@/lib/productImportCache';

describe('normalizeImportUrl', () => {
  it('lowercases the host and strips fragments', () => {
    expect(normalizeImportUrl('HTTPS://Articulo.MercadoLibre.cl/MLC-123#desc')).toBe(
      'https://articulo.mercadolibre.cl/MLC-123',
    );
  });

  it('removes utm_* and ref tracking params', () => {
    expect(
      normalizeImportUrl(
        'https://articulo.mercadolibre.cl/MLC-123?utm_source=instagram&ref=foo&color=red',
      ),
    ).toBe('https://articulo.mercadolibre.cl/MLC-123?color=red');
  });

  it('removes the gclid / fbclid tracking pair', () => {
    expect(
      normalizeImportUrl(
        'https://store.cl/p/abc?gclid=xxx&fbclid=yyy&size=large',
      ),
    ).toBe('https://store.cl/p/abc?size=large');
  });

  it('canonicalises query-param order', () => {
    expect(normalizeImportUrl('https://store.cl/p?b=2&a=1')).toBe(normalizeImportUrl('https://store.cl/p?a=1&b=2'));
  });

  it('drops trailing slashes on non-root paths', () => {
    expect(normalizeImportUrl('https://store.cl/p/abc/')).toBe('https://store.cl/p/abc');
  });

  it('preserves the root slash', () => {
    expect(normalizeImportUrl('https://store.cl/')).toBe('https://store.cl/');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeImportUrl('')).toBe('');
    expect(normalizeImportUrl('   ')).toBe('');
  });

  it('falls back to the trimmed input on invalid URLs', () => {
    expect(normalizeImportUrl('not-a-url')).toBe('not-a-url');
  });
});
