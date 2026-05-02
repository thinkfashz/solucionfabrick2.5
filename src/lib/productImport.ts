import 'server-only';
import * as cheerio from 'cheerio';
import { extractMlcId } from './productImportShared';

export { extractMlcId };

/**
 * Server-side product-import helpers.
 *
 * The admin "Importar producto" flow accepts any product URL: short
 * Mercado Libre affiliate links (`https://meli.la/…`), full ML article
 * URLs, or arbitrary third-party stores (Falabella, Ripley, AliExpress,
 * Amazon, branded sites, …). This module resolves redirects, extracts
 * the canonical product id when possible, and returns a uniform
 * `ImportedProduct` shape that the admin UI can render and the
 * `INSERT INTO products` flow can persist verbatim.
 *
 * Why server-side: the browser cannot read the final URL after a
 * cross-origin redirect (CORS hides `Response.url`), and most stores
 * block CORS for `text/html` requests entirely. Resolving everything in
 * a Node route handler bypasses both limitations and keeps the user
 * agent under our control.
 */

const ML_SHORT_HOSTS = new Set([
  'meli.la',
  'www.meli.la',
  'mercadolibre.com',
  'www.mercadolibre.com',
  'mercadolibre.cl',
  'www.mercadolibre.cl',
  'articulo.mercadolibre.cl',
  'articulo.mercadolibre.com.ar',
  'articulo.mercadolibre.com.mx',
  'articulo.mercadolibre.com.co',
  'articulo.mercadolibre.com.pe',
  'articulo.mercadolibre.com.uy',
  'articulo.mercadolibre.com.ve',
  'click1.mercadolibre.com',
]);

export interface ImportedProduct {
  /** Where this product came from. */
  source: 'mercadolibre' | 'generic';
  /** External id when applicable (e.g. "MLC123456789"). */
  sourceId: string | null;
  /** Canonical, public, redirect-resolved URL — the one the admin should
   *  visit to "Comprar y enviar al cliente". */
  sourceUrl: string;
  title: string;
  description: string | null;
  /** Numeric price in `currency`. May be 0 if the page didn't expose a price. */
  price: number;
  currency: string;
  imageUrl: string | null;
  /** Optional extra detail surfaced by the UI preview. */
  available: boolean | null;
  stock: number | null;
}

/**
 * Normalises a URL string. Throws TypeError on malformed input so the
 * caller can return a 400. Forces an `http(s):` protocol — we never
 * want to fetch `file:` / `javascript:` / `data:` URLs from arbitrary
 * admin input.
 */
export function normalizeProductUrl(raw: string): URL {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) throw new TypeError('La URL está vacía.');
  // If the input carries an explicit scheme, only allow http/https.
  // Otherwise (bare hostname / path), assume https.
  const schemeMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      throw new TypeError(`Protocolo no soportado: ${scheme}:`);
    }
  }
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError(`Protocolo no soportado: ${url.protocol}`);
  }
  return url;
}

/**
 * Returns true when `hostname` resolves to a loopback / link-local /
 * RFC-1918 / unique-local address — i.e. somewhere inside our own
 * infrastructure that an admin URL has no business reaching.
 *
 * Used as an SSRF guard before issuing any outbound fetch on behalf of
 * an admin: stops `http://169.254.169.254/` (cloud IMDS),
 * `http://127.0.0.1:port/`, and any private IPv4/IPv6 range from being
 * dereferenced server-side.
 *
 * This is a defence-in-depth check against literal IPs and obvious
 * names; it does not perform DNS resolution, so a hostname that
 * deliberately resolves to a private address ("DNS rebinding") is not
 * caught here. That's a known limitation — the upstream firewall must
 * also block egress to RFC-1918 ranges.
 */

// IPv4 private / loopback / link-local / unspecified ranges. Hoisted to
// module scope so the patterns are compiled once.
const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^127\./,                       // loopback
  /^169\.254\./,                  // link-local (incl. cloud IMDS)
  /^10\./,                        // RFC-1918
  /^172\.(1[6-9]|2\d|3[01])\./,   // RFC-1918
  /^192\.168\./,                  // RFC-1918
  /^0\./,                         // 0.0.0.0/8
];

const PRIVATE_IPV6_PATTERNS: RegExp[] = [
  /^::1$/,                        // IPv6 loopback
  /^::$/,                         // IPv6 unspecified
  /^fc[0-9a-f]{2}:/i,             // IPv6 unique-local fc00::/7
  /^fd[0-9a-f]{2}:/i,             // IPv6 unique-local fd00::/8
  /^fe80:/i,                      // IPv6 link-local
];

// IPv6 forms that embed an IPv4 address in the low 32 bits and which
// Node's `fetch` will resolve to that underlying IPv4 — bypassing a
// naive textual SSRF check unless we explicitly normalise them.
//   - IPv4-mapped:    ::ffff:a.b.c.d        (RFC 4291 §2.5.5.2)
//   - IPv4-compat.:   ::a.b.c.d             (RFC 4291 §2.5.5.1, deprecated)
//   - SIIT / 64:ff9b: 64:ff9b::a.b.c.d      (RFC 6052)
// Capture the dotted-quad tail so we can re-check it against
// PRIVATE_IPV4_PATTERNS.
const IPV6_EMBEDDED_IPV4_PATTERN =
  /^(?:::ffff:|::ffff:0{1,4}:|64:ff9b::|::)((?:\d{1,3}\.){3}\d{1,3})$/i;

// Hex form of IPv4-mapped IPv6 (rare but valid). 32 bits encoded as two
// 16-bit groups: ::ffff:HHHH:HHHH. Capture the two hex groups.
const IPV6_MAPPED_HEX_PATTERN = /^(?:::ffff:|::ffff:0{1,4}:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i;

export function isPrivateHost(hostname: string): boolean {
  const h = (hostname ?? '').trim().toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  // Strip IPv6 brackets if present (e.g. "[::1]").
  const stripped = h.startsWith('[') && h.endsWith(']') ? h.slice(1, -1) : h;

  // IPv4-in-IPv6 normalisation: `::ffff:169.254.169.254` and friends
  // resolve to the literal IPv4 address by Node's resolver, so test the
  // embedded IPv4 against the IPv4 private-range patterns.
  const embeddedV4 = stripped.match(IPV6_EMBEDDED_IPV4_PATTERN);
  if (embeddedV4) {
    const v4 = embeddedV4[1];
    // Reject malformed dotted-quads (e.g. `999.999.999.999`) up front so
    // we don't re-test garbage against the private-range regexes.
    const octets = v4.split('.');
    const valid =
      octets.length === 4 &&
      octets.every((o) => /^\d{1,3}$/.test(o) && Number(o) <= 255);
    if (valid && PRIVATE_IPV4_PATTERNS.some((r) => r.test(v4))) return true;
  }
  const embeddedHex = stripped.match(IPV6_MAPPED_HEX_PATTERN);
  if (embeddedHex) {
    const hi = parseInt(embeddedHex[1], 16);
    const lo = parseInt(embeddedHex[2], 16);
    if (Number.isFinite(hi) && Number.isFinite(lo)) {
      const v4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
      if (PRIVATE_IPV4_PATTERNS.some((r) => r.test(v4))) return true;
    }
  }

  if (PRIVATE_IPV4_PATTERNS.some((r) => r.test(stripped))) return true;
  if (PRIVATE_IPV6_PATTERNS.some((r) => r.test(stripped))) return true;
  return false;
}

/**
 * Returns true when `url` belongs to one of the Mercado Libre hostnames
 * we know how to resolve to an MLC item id.
 */
export function isMercadoLibreUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (ML_SHORT_HOSTS.has(host)) return true;
  // Fallback: cover regional hosts we didn't explicitly enumerate.
  return /(^|\.)mercadolibre\.(com|cl|com\.ar|com\.mx|com\.co|com\.pe|com\.uy|com\.ve)$/i.test(host) ||
    host.endsWith('.meli.la');
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; FabrickProductImporter/1.0; +https://www.solucionesfabrick.com)';

const FETCH_HEADERS: Record<string, string> = {
  'User-Agent': DEFAULT_USER_AGENT,
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

/**
 * Aborts a fetch after `ms` milliseconds. Keeps the import flow snappy
 * even when the upstream store is slow.
 */
function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

/**
 * Resolves a (possibly short) URL to its final target by following
 * redirects. Returns the resolved `Response.url` and the response body
 * as text. The body is capped at 1 MB to avoid pulling huge pages into
 * memory.
 */
async function fetchResolved(url: URL, timeoutMs = 10_000): Promise<{ finalUrl: URL; html: string }> {
  // SSRF guard: refuse to fetch URLs whose hostname points at our own
  // infrastructure (loopback, link-local, RFC-1918, IPv6 ULA, …). An
  // admin (or anyone with a stolen admin session) must not be able to
  // pivot the importer into a metadata-service / internal-network probe.
  if (isPrivateHost(url.hostname)) {
    throw new TypeError(`Host no permitido: ${url.hostname}.`);
  }
  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      redirect: 'follow',
      headers: FETCH_HEADERS,
      cache: 'no-store',
      signal: t.signal,
    });
    if (!res.ok) {
      throw new Error(`La URL respondió HTTP ${res.status} ${res.statusText}.`);
    }
    // Re-check the final (post-redirect) URL: a public short link could
    // 30x to a private address. `fetch` follows up to 20 redirects, so
    // the only signal we have is `res.url` after the chain settles.
    const finalUrl = new URL(res.url);
    if (isPrivateHost(finalUrl.hostname)) {
      throw new TypeError(`Host no permitido tras redirección: ${finalUrl.hostname}.`);
    }
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return { finalUrl, html: text.slice(0, 1_000_000) };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < 1_000_000) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.length;
      }
    }
    try { await reader.cancel(); } catch { /* ignore */ }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(merged);
    return { finalUrl, html };
  } finally {
    t.cancel();
  }
}

/**
 * Mercado Libre public item shape (subset we consume).
 */
interface MLApiItem {
  id?: string;
  title?: string;
  price?: number;
  currency_id?: string;
  available_quantity?: number;
  status?: string;
  permalink?: string;
  thumbnail?: string;
  pictures?: Array<{ secure_url?: string; url?: string }>;
}

interface MLApiDescription {
  plain_text?: string;
}

/**
 * Calls the public Mercado Libre API for a given MLC item id and maps
 * the response into our common `ImportedProduct` shape.
 */
async function fetchMercadoLibreItem(itemId: string): Promise<ImportedProduct> {
  const t = withTimeout(8_000);
  let item: MLApiItem;
  try {
    const res = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`, {
      headers: { Accept: 'application/json', 'User-Agent': DEFAULT_USER_AGENT },
      cache: 'no-store',
      signal: t.signal,
    });
    if (!res.ok) {
      throw new Error(`Mercado Libre respondió HTTP ${res.status}. Verifica que la publicación exista y sea pública.`);
    }
    item = (await res.json()) as MLApiItem;
  } finally {
    t.cancel();
  }

  // Best-effort fetch of the long-form description. Failures here are
  // non-fatal — we still return the basic product info.
  let description: string | null = null;
  try {
    const t2 = withTimeout(5_000);
    try {
      const dRes = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/description`, {
        headers: { Accept: 'application/json', 'User-Agent': DEFAULT_USER_AGENT },
        cache: 'no-store',
        signal: t2.signal,
      });
      if (dRes.ok) {
        const d = (await dRes.json()) as MLApiDescription;
        if (typeof d?.plain_text === 'string' && d.plain_text.trim().length > 0) {
          description = d.plain_text.trim();
        }
      }
    } finally {
      t2.cancel();
    }
  } catch { /* ignore */ }

  const cover =
    item.pictures?.[0]?.secure_url ||
    item.pictures?.[0]?.url ||
    item.thumbnail ||
    null;

  return {
    source: 'mercadolibre',
    sourceId: item.id ?? itemId,
    sourceUrl: item.permalink ?? `https://articulo.mercadolibre.cl/${itemId}`,
    title: item.title ?? itemId,
    description,
    price: typeof item.price === 'number' ? item.price : 0,
    currency: item.currency_id || 'CLP',
    imageUrl: cover,
    available: item.status === 'active',
    stock: typeof item.available_quantity === 'number' ? item.available_quantity : null,
  };
}

/**
 * Generic Open Graph + Schema.org / JSON-LD scraper. Used as fallback
 * for any non-Mercado-Libre URL. Best-effort: pages without semantic
 * markup will yield mostly-empty fields, and the admin can fill in the
 * blanks manually before saving.
 */
export function parseGenericProductHtml(html: string, finalUrl: URL): ImportedProduct {
  const $ = cheerio.load(html);

  const meta = (selector: string): string | null => {
    const v = $(selector).attr('content');
    return v && v.trim() ? v.trim() : null;
  };

  const title =
    meta('meta[property="og:title"]') ||
    meta('meta[name="twitter:title"]') ||
    $('title').first().text().trim() ||
    finalUrl.hostname;

  const description =
    meta('meta[property="og:description"]') ||
    meta('meta[name="twitter:description"]') ||
    meta('meta[name="description"]') ||
    null;

  let imageUrl =
    meta('meta[property="og:image:secure_url"]') ||
    meta('meta[property="og:image"]') ||
    meta('meta[name="twitter:image"]') ||
    null;
  if (imageUrl) {
    try { imageUrl = new URL(imageUrl, finalUrl).toString(); } catch { /* keep raw */ }
  }

  // Open Graph product price (Facebook spec).
  let priceStr =
    meta('meta[property="product:price:amount"]') ||
    meta('meta[property="og:price:amount"]') ||
    meta('meta[itemprop="price"]') ||
    null;
  let currency =
    meta('meta[property="product:price:currency"]') ||
    meta('meta[property="og:price:currency"]') ||
    meta('meta[itemprop="priceCurrency"]') ||
    null;
  let availability: string | null =
    meta('meta[property="product:availability"]') ||
    meta('meta[property="og:availability"]') ||
    null;

  // JSON-LD `Product` / `Offer` is the most reliable source when present.
  if (!priceStr || !currency) {
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).contents().text();
      if (!raw) return;
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { return; }
      // JSON-LD docs can be a single object, an array, or have a @graph array.
      const candidates: unknown[] = [];
      const stack: unknown[] = [parsed];
      while (stack.length) {
        const node = stack.pop();
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node)) { stack.push(...node); continue; }
        const obj = node as Record<string, unknown>;
        candidates.push(obj);
        if (Array.isArray(obj['@graph'])) stack.push(...(obj['@graph'] as unknown[]));
      }
      for (const c of candidates) {
        const obj = c as Record<string, unknown>;
        const type = obj['@type'];
        const isProduct = type === 'Product' || (Array.isArray(type) && type.includes('Product'));
        if (!isProduct) continue;
        const offers = obj.offers;
        const offer = Array.isArray(offers) ? offers[0] : offers;
        if (offer && typeof offer === 'object') {
          const o = offer as Record<string, unknown>;
          if (!priceStr) {
            const p = o.price ?? o.lowPrice;
            if (typeof p === 'number' || typeof p === 'string') priceStr = String(p);
          }
          if (!currency && typeof o.priceCurrency === 'string') currency = o.priceCurrency;
          if (!availability && typeof o.availability === 'string') availability = o.availability;
        }
      }
    });
  }

  const price = (() => {
    if (!priceStr) return 0;
    let s = String(priceStr).replace(/[^\d.,-]/g, '');
    // Determine which separator (`,` or `.`) is the decimal point by
    // inspecting the part after the last separator: 1-2 digits → decimal,
    // exactly 3 digits → thousands.
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot === -1 && lastComma === -1) {
      // plain integer
    } else if (lastDot >= 0 && lastComma === -1) {
      // only dots — could be thousands ("49.990") or decimal ("49.99")
      const tail = s.slice(lastDot + 1);
      if (tail.length === 3) s = s.replace(/\./g, '');
    } else if (lastComma >= 0 && lastDot === -1) {
      // only commas — could be thousands or european decimal
      const tail = s.slice(lastComma + 1);
      if (tail.length === 3) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(/,/g, '.');
      }
    } else if (lastDot > lastComma) {
      // "1,234.56" — comma is thousands, dot is decimal
      s = s.replace(/,/g, '');
    } else {
      // "1.234,56" — dot is thousands, comma is decimal
      s = s.replace(/\./g, '').replace(',', '.');
    }
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  })();

  const available = availability
    ? /instock|in_stock|in stock|available/i.test(availability)
    : null;

  return {
    source: 'generic',
    sourceId: null,
    sourceUrl: finalUrl.toString(),
    title,
    description,
    price,
    currency: (currency || 'CLP').toUpperCase(),
    imageUrl,
    available,
    stock: null,
  };
}

/**
 * Top-level entry point used by `POST /api/admin/productos/import-from-url`.
 * Resolves redirects, picks a strategy (Mercado Libre API vs generic
 * OG/JSON-LD scraper), and returns a uniform product preview.
 */
export async function resolveProductFromUrl(rawUrl: string): Promise<ImportedProduct> {
  const url = normalizeProductUrl(rawUrl);

  // Fast path: the URL already contains an MLC id and looks like a ML
  // article — no need to follow the redirect chain.
  const inlineMlc = extractMlcId(url.pathname) ?? extractMlcId(url.search);
  if (inlineMlc && isMercadoLibreUrl(url)) {
    return fetchMercadoLibreItem(inlineMlc);
  }

  // Otherwise resolve redirects. `meli.la/2pWqo` and
  // `mercadolibre.com/sec/<token>` always redirect to the canonical
  // article URL, which contains the MLC id.
  const { finalUrl, html } = await fetchResolved(url);

  if (isMercadoLibreUrl(finalUrl)) {
    const mlc = extractMlcId(finalUrl.pathname) ?? extractMlcId(finalUrl.search) ?? extractMlcId(html);
    if (mlc) {
      return fetchMercadoLibreItem(mlc);
    }
    // Fallthrough to generic scraper if the redirect didn't expose an id
    // (e.g. a marketplace landing page rather than an article).
  }

  return parseGenericProductHtml(html, finalUrl);
}
