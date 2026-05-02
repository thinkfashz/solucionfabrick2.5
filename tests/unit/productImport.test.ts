import { describe, expect, it } from 'vitest';
import {
  BROWSER_FETCH_HEADERS,
  extractMlcId,
  findMlcInChain,
  isMercadoLibreUrl,
  isPrivateHost,
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

describe('productImport.isPrivateHost (SSRF guard)', () => {
  it.each([
    'localhost',
    'foo.localhost',
    '127.0.0.1',
    '127.0.0.53',
    '169.254.169.254', // AWS / GCP IMDS
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '0.0.0.0',
    '::1',
    'fc00::1',
    'fd12:3456:789a::1',
    'fe80::1',
    // IPv4-in-IPv6 forms — Node fetch resolves these to the embedded
    // IPv4, so the textual SSRF check must normalise them.
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    '::ffff:10.0.0.1',
    '::ffff:192.168.1.1',
    '[::ffff:169.254.169.254]', // bracketed (URL.hostname form)
    '::FFFF:169.254.169.254',   // case-insensitive
    '::ffff:0:127.0.0.1',       // alternate ::ffff:0:V4 spelling
    '::127.0.0.1',              // IPv4-compatible (deprecated)
    '64:ff9b::169.254.169.254', // RFC 6052 well-known prefix
    '::ffff:a9fe:a9fe',         // hex form of 169.254.169.254
    '::ffff:7f00:0001',         // hex form of 127.0.0.1
    '::ffff:0:a9fe:a9fe',       // alternate `::ffff:0:V4` hex spelling
  ])('flags %s as private', (host) => {
    expect(isPrivateHost(host)).toBe(true);
  });

  it.each([
    '::ffff:999.999.999.999',   // malformed dotted-quad — must not crash and must not be private
    '::ffff:8.8.8.8.8',         // too many octets
  ])('does not flag malformed IPv4-in-IPv6 %s as private', (host) => {
    expect(isPrivateHost(host)).toBe(false);
  });

  it.each([
    'meli.la',
    'www.mercadolibre.cl',
    'www.falabella.com',
    'graph.facebook.com',
    '8.8.8.8',
    '172.15.0.1', // just outside RFC-1918
    '172.32.0.1', // just outside RFC-1918
    '169.255.0.1', // just outside link-local
    '2001:db8::1', // documentation prefix, not private
    '::ffff:8.8.8.8', // IPv4-mapped public address must NOT be flagged
    '::ffff:0808:0808', // hex form of 8.8.8.8
  ])('does not flag %s as private', (host) => {
    expect(isPrivateHost(host)).toBe(false);
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

  it('parses US-formatted prices ("$1,234.56" — comma thousands, dot decimal)', () => {
    const html = `
      <html><head>
        <title>X</title>
        <meta itemprop="price" content="$1,234.56">
        <meta itemprop="priceCurrency" content="USD">
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://store.test/p'));
    expect(out.price).toBeCloseTo(1234.56);
    expect(out.currency).toBe('USD');
  });

  it('parses EU-formatted prices ("1.234,56 €" — dot thousands, comma decimal)', () => {
    const html = `
      <html><head>
        <title>X</title>
        <meta itemprop="price" content="1.234,56 €">
        <meta itemprop="priceCurrency" content="EUR">
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://store.test/p'));
    expect(out.price).toBeCloseTo(1234.56);
    expect(out.currency).toBe('EUR');
  });

  it('parses US decimal-only prices ("$49.99" — dot is decimal, not thousands)', () => {
    const html = `
      <html><head>
        <title>X</title>
        <meta itemprop="price" content="$49.99">
        <meta itemprop="priceCurrency" content="USD">
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://store.test/p'));
    expect(out.price).toBeCloseTo(49.99);
  });

  it('parses EU decimal-only prices ("49,99 €" — comma is decimal, not thousands)', () => {
    const html = `
      <html><head>
        <title>X</title>
        <meta itemprop="price" content="49,99 €">
        <meta itemprop="priceCurrency" content="EUR">
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://store.test/p'));
    expect(out.price).toBeCloseTo(49.99);
  });

  it('resolves relative og:image against the final URL', () => {
    const html = `<html><head><meta property="og:image" content="/static/img.jpg"></head></html>`;
    const out = parseGenericProductHtml(html, new URL('https://www.shop.cl/p/123'));
    expect(out.imageUrl).toBe('https://www.shop.cl/static/img.jpg');
    expect(out.images).toEqual(['https://www.shop.cl/static/img.jpg']);
  });

  it('collects every og:image / twitter:image / og:image:secure_url tag into images[]', () => {
    const html = `
      <html><head>
        <meta property="og:image" content="https://cdn.test/a.jpg">
        <meta property="og:image" content="https://cdn.test/b.jpg">
        <meta property="og:image:secure_url" content="https://cdn.test/c.jpg">
        <meta name="twitter:image" content="https://cdn.test/a.jpg">
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://www.shop.cl/p/1'));
    // De-duplicates and preserves document order.
    expect(out.images).toEqual([
      'https://cdn.test/a.jpg',
      'https://cdn.test/b.jpg',
      'https://cdn.test/c.jpg',
    ]);
    // imageUrl is the cover (first entry) so single-image consumers keep working.
    expect(out.imageUrl).toBe(out.images[0]);
  });

  it('extracts the JSON-LD Product.image gallery (string, array, ImageObject)', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "image": [
            "https://cdn.test/p1.jpg",
            { "@type": "ImageObject", "url": "https://cdn.test/p2.jpg" }
          ],
          "offers": { "@type": "Offer", "price": "9990", "priceCurrency": "CLP" }
        }
        </script>
      </head></html>
    `;
    const out = parseGenericProductHtml(html, new URL('https://www.shop.cl/p/2'));
    expect(out.images).toEqual(['https://cdn.test/p1.jpg', 'https://cdn.test/p2.jpg']);
    expect(out.imageUrl).toBe('https://cdn.test/p1.jpg');
    expect(out.price).toBe(9990);
  });

  it('returns 0 price when no price markup is present', () => {
    const html = `<html><head><title>Solo título</title></head></html>`;
    const out = parseGenericProductHtml(html, new URL('https://www.test.cl/x'));
    expect(out.price).toBe(0);
    expect(out.currency).toBe('CLP'); // default
    expect(out.images).toEqual([]);
  });
});

describe('productImport.BROWSER_FETCH_HEADERS', () => {
  it('uses a realistic desktop-Chrome User-Agent (not a bot identifier)', () => {
    const ua = BROWSER_FETCH_HEADERS['User-Agent'];
    expect(ua).toMatch(/^Mozilla\/5\.0/);
    expect(ua).toMatch(/Chrome\/\d+/);
    expect(ua).toMatch(/Safari\/\d+/);
    // No "bot"-shaped identifiers — those are exactly what ML's WAF
    // blocks with HTTP 403.
    expect(ua).not.toMatch(/bot|crawler|spider|FabrickProductImporter/i);
  });

  it('sends Accept and Accept-Language headers a browser would send', () => {
    expect(BROWSER_FETCH_HEADERS.Accept).toMatch(/text\/html/);
    expect(BROWSER_FETCH_HEADERS['Accept-Language']).toMatch(/es/);
  });

  it('includes Sec-Fetch-* fetch-metadata headers (WAF bot heuristic)', () => {
    expect(BROWSER_FETCH_HEADERS['Sec-Fetch-Mode']).toBe('navigate');
    expect(BROWSER_FETCH_HEADERS['Sec-Fetch-Dest']).toBe('document');
    expect(BROWSER_FETCH_HEADERS['Upgrade-Insecure-Requests']).toBe('1');
  });
});

describe('productImport.findMlcInChain', () => {
  it('returns the MLC id from the first hop that exposes one', () => {
    const chain = [
      new URL('https://meli.la/29kck3o'),
      new URL('https://click1.mercadolibre.com/sec/abc123'),
      new URL('https://articulo.mercadolibre.cl/MLC-1234567890-zapatilla-deportiva-_JM'),
    ];
    expect(findMlcInChain(chain)).toBe('MLC1234567890');
  });

  it('finds an MLC id encoded in a query parameter', () => {
    const chain = [
      new URL('https://meli.la/29kck3o'),
      new URL('https://www.mercadolibre.cl/sec?item=MLC9876543210&utm=foo'),
    ];
    expect(findMlcInChain(chain)).toBe('MLC9876543210');
  });

  it('returns null when no hop contains an MLC id', () => {
    const chain = [
      new URL('https://meli.la/29kck3o'),
      new URL('https://www.mercadolibre.cl/categorias'),
    ];
    expect(findMlcInChain(chain)).toBeNull();
  });

  it('returns null for an empty chain', () => {
    expect(findMlcInChain([])).toBeNull();
  });
});
