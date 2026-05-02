import { describe, expect, it } from 'vitest';
import {
  extractMlcId,
  isMercadoLibreUrl,
  normalizeProductUrl,
  parseGenericProductHtml,
} from '@/lib/productImport';

describe('productImport.extractMlcId', () => {
  it.each([
    ['https://articulo.mercadolibre.cl/MLC-123456789-foo', 'MLC123456789'],
    ['https://articulo.mercadolibre.cl/MLC123456789-bar', 'MLC123456789'],
    ['MLC 987654321', 'MLC987654321'],
    ['something MLC-123456 something', 'MLC123456'],
  ])('extracts %s → %s', (input, expected) => {
    expect(extractMlcId(input)).toBe(expected);
  });

  it('returns null for non-ML strings', () => {
    expect(extractMlcId('https://www.falabella.com/p/123456')).toBeNull();
    expect(extractMlcId(null)).toBeNull();
    expect(extractMlcId(undefined)).toBeNull();
    expect(extractMlcId('')).toBeNull();
  });
});

describe('productImport.normalizeProductUrl', () => {
  it('accepts a fully-qualified https URL', () => {
    const u = normalizeProductUrl('https://meli.la/abc');
    expect(u.protocol).toBe('https:');
    expect(u.hostname).toBe('meli.la');
  });

  it('prepends https:// when scheme is missing', () => {
    expect(normalizeProductUrl('meli.la/abc').toString()).toBe('https://meli.la/abc');
  });

  it('throws on empty input', () => {
    expect(() => normalizeProductUrl('')).toThrow(TypeError);
    expect(() => normalizeProductUrl('   ')).toThrow(TypeError);
  });

  it('rejects non-http(s) schemes', () => {
    expect(() => normalizeProductUrl('javascript:alert(1)')).toThrow();
    expect(() => normalizeProductUrl('file:///etc/passwd')).toThrow();
  });
});

describe('productImport.isMercadoLibreUrl', () => {
  it('recognises canonical ML hosts', () => {
    expect(isMercadoLibreUrl(new URL('https://meli.la/2pWqo'))).toBe(true);
    expect(isMercadoLibreUrl(new URL('https://articulo.mercadolibre.cl/MLC-1-foo'))).toBe(true);
    expect(isMercadoLibreUrl(new URL('https://www.mercadolibre.com.ar/foo'))).toBe(true);
    expect(isMercadoLibreUrl(new URL('https://click1.mercadolibre.com/foo'))).toBe(true);
  });

  it('rejects non-ML hosts', () => {
    expect(isMercadoLibreUrl(new URL('https://www.falabella.com/p/123'))).toBe(false);
    expect(isMercadoLibreUrl(new URL('https://www.amazon.com/dp/X'))).toBe(false);
  });
});

describe('productImport.parseGenericProductHtml — Open Graph', () => {
  it('extracts title, image, description, price and currency from og: meta tags', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Bota de seguridad XYZ">
        <meta property="og:description" content="Punta de acero, suela antideslizante.">
        <meta property="og:image:secure_url" content="https://cdn.example.com/img.jpg">
        <meta property="product:price:amount" content="49990">
        <meta property="product:price:currency" content="CLP">
        <title>Bota de seguridad XYZ — Tienda</title>
      </head><body></body></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://www.example.cl/p/123'));
    expect(out.source).toBe('generic');
    expect(out.title).toBe('Bota de seguridad XYZ');
    expect(out.description).toBe('Punta de acero, suela antideslizante.');
    expect(out.imageUrl).toBe('https://cdn.example.com/img.jpg');
    expect(out.price).toBe(49990);
    expect(out.currency).toBe('CLP');
    expect(out.sourceUrl).toBe('https://www.example.cl/p/123');
  });

  it('falls back to <title> when og:title is missing', () => {
    const html = `<html><head><title>Producto Genérico</title></head></html>`;
    const out = parseGenericProductHtml(html, new URL('https://store.test/p'));
    expect(out.title).toBe('Producto Genérico');
  });

  it('parses JSON-LD Product/Offer when og price tags are missing', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Taladro 18V">
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Taladro 18V",
          "offers": {
            "@type": "Offer",
            "price": "129990",
            "priceCurrency": "CLP",
            "availability": "https://schema.org/InStock"
          }
        }
        </script>
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://www.test.cl/p/1'));
    expect(out.price).toBe(129990);
    expect(out.currency).toBe('CLP');
    expect(out.available).toBe(true);
  });

  it('handles JSON-LD nested in @graph', () => {
    const html = `
      <html><head><title>X</title>
        <script type="application/ld+json">
        {"@graph": [
          {"@type": "WebPage"},
          {"@type": "Product", "offers": {"price": 19.99, "priceCurrency": "USD"}}
        ]}
        </script>
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://store.test/p'));
    expect(out.price).toBeCloseTo(19.99);
    expect(out.currency).toBe('USD');
  });

  it('cleans up CLP-formatted prices like "$49.990"', () => {
    const html = `
      <html><head>
        <title>X</title>
        <meta itemprop="price" content="$49.990">
        <meta itemprop="priceCurrency" content="CLP">
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://store.test/p'));
    expect(out.price).toBe(49990);
  });

  it('resolves relative og:image against the final URL', () => {
    const html = `<html><head><meta property="og:image" content="/static/img.jpg"></head></html>`;
    const out = parseGenericProductHtml(html, new URL('https://www.shop.cl/p/123'));
    expect(out.imageUrl).toBe('https://www.shop.cl/static/img.jpg');
  });

  it('returns 0 price when no price markup is present', () => {
    const html = `<html><head><title>Solo título</title></head></html>`;
    const out = parseGenericProductHtml(html, new URL('https://www.test.cl/x'));
    expect(out.price).toBe(0);
    expect(out.currency).toBe('CLP'); // default
  });
});
