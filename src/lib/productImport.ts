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
  /**
   * Full list of image URLs scraped from the source. The cover
   * (`imageUrl`) is always equal to `images[0]` when available, so
   * existing callers that only read `imageUrl` keep working. The admin
   * preview UI uses the rest to let the user pick a different cover or
   * copy individual links to use elsewhere on the site.
   */
  images: string[];
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

/**
 * Realistic desktop-Chrome User-Agent. Mercado Libre's WAF (and most
 * other Chilean retailers' Cloudflare/Akamai front-ends) silently
 * return HTTP 403 to anything that looks like a bot, so a bare
 * `FabrickProductImporter/1.0` UA gets blocked before our admin ever
 * sees the redirect chain. We pose as a current Chrome on Windows —
 * the most common UA in the wild and the safest default for HTML
 * scraping fallbacks.
 *
 * Keep this string in sync with a recent stable Chrome version every
 * few months. If ML's WAF starts to fingerprint TLS/HTTP2 instead of
 * the UA, we'll need to introduce a real headless browser; until then
 * a browser-shaped header set is enough to clear the 403.
 */
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Browser-shaped header set used for every outbound HTML request.
 * `Sec-Fetch-*` / `sec-ch-ua-*` are the headers a real Chrome sends on
 * a top-level navigation; sending them avoids the WAF heuristic that
 * flags fetch-without-fetch-metadata as automation.
 */
export const BROWSER_FETCH_HEADERS: Record<string, string> = {
  'User-Agent': DEFAULT_USER_AGENT,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not.A/Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

/**
 * Header set for the public Mercado Libre JSON API. The API is
 * permissive but still rejects empty UAs. Use the same realistic UA
 * we send on HTML requests.
 *
 * Mercado Libre has been progressively tightening the public
 * `/items/{id}` endpoint: requests from datacentre IPs (Vercel, AWS,
 * etc.) frequently get HTTP 403 unless the call carries a valid OAuth
 * token. We therefore:
 *
 *   1. Always send browser-shaped UA + `Referer: mercadolibre.cl`,
 *      which is enough for many regions.
 *   2. If `MERCADOLIBRE_ACCESS_TOKEN` is set in the environment, attach
 *      it as `Authorization: Bearer …`. The token can be a short-lived
 *      app token from https://developers.mercadolibre.com/.
 *   3. Fall back to the `/items?ids=…` multiget endpoint, which is
 *      consistently looser than the per-id endpoint.
 *   4. Last resort: scrape the public article HTML.
 */
function buildMlApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
    'User-Agent': DEFAULT_USER_AGENT,
    Referer: 'https://www.mercadolibre.cl/',
    Origin: 'https://www.mercadolibre.cl',
  };
  const token = process.env.MERCADOLIBRE_ACCESS_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const ML_API_HEADERS: Record<string, string> = buildMlApiHeaders();

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
  // Many CDNs (Cloudflare, Akamai) flag fetch-without-Referer as bot
  // traffic. We send a Referer that matches the target origin so the
  // request looks like a same-site navigation.
  const headers: Record<string, string> = {
    ...BROWSER_FETCH_HEADERS,
    Referer: `${url.protocol}//${url.host}/`,
    'Sec-Fetch-Site': 'same-origin',
  };
  try {
    const res = await fetch(url.toString(), {
      redirect: 'follow',
      headers,
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
 * Mobile-Chrome User-Agent + headers, used as a second-attempt
 * fingerprint when the desktop UA gets blocked. Many WAFs are tuned
 * primarily against desktop scrapers, so a mobile shape often slips
 * through where the desktop one fails.
 */
const MOBILE_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not.A/Brand";v="99"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
};

/**
 * Last-ditch fetch via the public r.jina.ai reader proxy, which
 * renders the page in a real headless browser and returns the
 * post-JS HTML. Bypasses most Cloudflare/Akamai bot challenges that
 * blocked the direct fetch. Free tier: ~20 RPM without API key
 * (https://jina.ai/reader).
 */
async function fetchViaReaderProxy(
  url: URL,
  timeoutMs = 15_000,
): Promise<{ finalUrl: URL; html: string }> {
  const t = withTimeout(timeoutMs);
  try {
    const target = `https://r.jina.ai/${url.toString()}`;
    const res = await fetch(target, {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,*/*;q=0.8',
        'X-Return-Format': 'html',
        'User-Agent': DEFAULT_USER_AGENT,
      },
      cache: 'no-store',
      signal: t.signal,
    });
    if (!res.ok) {
      throw new Error(`Reader proxy respondió HTTP ${res.status}.`);
    }
    const html = (await res.text()).slice(0, 1_000_000);
    return { finalUrl: url, html };
  } finally {
    t.cancel();
  }
}

/**
 * Tries the regular browser-shape fetch first; if the upstream blocks
 * us (403/401/429/503/451), retries once with a mobile UA, and finally
 * falls back to the headless-browser reader proxy. Throws the *first*
 * error if every strategy fails so the caller can surface a useful
 * message.
 */
async function fetchResolvedWithFallback(
  url: URL,
): Promise<{ finalUrl: URL; html: string; via: 'direct' | 'mobile' | 'proxy' }> {
  let firstError: unknown;
  // 1) Desktop browser-shape fetch.
  try {
    const r = await fetchResolved(url);
    return { ...r, via: 'direct' };
  } catch (err) {
    firstError = err;
    if (err instanceof TypeError) throw err; // SSRF: do not retry.
  }

  const message = firstError instanceof Error ? firstError.message : '';
  const isBlocked = /HTTP\s+(403|401|429|503|451)/i.test(message);
  if (!isBlocked) throw firstError;

  // 2) Mobile UA fingerprint, in case the WAF only blocks desktop UAs.
  try {
    const t = withTimeout(10_000);
    try {
      const res = await fetch(url.toString(), {
        redirect: 'follow',
        headers: {
          ...MOBILE_FETCH_HEADERS,
          Referer: 'https://www.google.com/',
        },
        cache: 'no-store',
        signal: t.signal,
      });
      if (res.ok) {
        const finalUrl = new URL(res.url);
        if (isPrivateHost(finalUrl.hostname)) {
          throw new TypeError(`Host no permitido tras redirección: ${finalUrl.hostname}.`);
        }
        const html = (await res.text()).slice(0, 1_000_000);
        return { finalUrl, html, via: 'mobile' };
      }
    } finally {
      t.cancel();
    }
  } catch {
    // fall through to proxy
  }

  // 3) Reader proxy (real headless browser).
  try {
    const r = await fetchViaReaderProxy(url);
    return { ...r, via: 'proxy' };
  } catch {
    throw firstError;
  }
}

/**
 * Walks an HTTP redirect chain manually, returning every URL visited
 * along the way (including the original input and the final
 * destination). Unlike `fetchResolved`, this never reads a response
 * body — it stops as soon as a non-redirect status is reached, so it
 * can recover the canonical article URL of a Mercado Libre short link
 * even when the article itself is behind a 403 WAF wall.
 *
 * Each hop is SSRF-checked, so a public-looking short link cannot be
 * used to pivot to an internal address mid-redirect.
 */
async function resolveRedirectChain(
  url: URL,
  { maxHops = 8, timeoutMs = 8_000 }: { maxHops?: number; timeoutMs?: number } = {},
): Promise<{ chain: URL[]; finalUrl: URL; status: number }> {
  if (isPrivateHost(url.hostname)) {
    throw new TypeError(`Host no permitido: ${url.hostname}.`);
  }
  const chain: URL[] = [url];
  let current = url;
  let status = 0;
  for (let i = 0; i < maxHops; i++) {
    const t = withTimeout(timeoutMs);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: BROWSER_FETCH_HEADERS,
        cache: 'no-store',
        signal: t.signal,
      });
    } finally {
      t.cancel();
    }
    status = res.status;
    // 3xx responses carry the next hop in the Location header. Anything
    // else (200, 403, 404, …) means the chain has settled.
    if (status >= 300 && status < 400) {
      const loc = res.headers.get('location');
      if (!loc) break;
      const next = new URL(loc, current);
      if (next.protocol !== 'http:' && next.protocol !== 'https:') {
        throw new TypeError(`Protocolo no soportado en redirección: ${next.protocol}`);
      }
      if (isPrivateHost(next.hostname)) {
        throw new TypeError(`Host no permitido tras redirección: ${next.hostname}.`);
      }
      chain.push(next);
      current = next;
      continue;
    }
    break;
  }
  return { chain, finalUrl: current, status };
}

/**
 * Looks for an MLC item id anywhere in a redirect chain (path or
 * query-string of any hop). Used to recover the canonical id from a
 * `meli.la/...` short link without ever fetching the (WAF-protected)
 * article HTML.
 */
export function findMlcInChain(chain: URL[]): string | null {
  for (const u of chain) {
    const id = extractMlcId(u.pathname) ?? extractMlcId(u.search);
    if (id) return id;
  }
  return null;
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
 * Tries to fetch a Mercado Libre item, transparently falling back from
 * the per-id endpoint (`/items/{id}`) to the multiget endpoint
 * (`/items?ids=…`) when the first one returns 401/403/429. Mercado
 * Libre's WAF has been rejecting unauthenticated per-id requests from
 * datacentre IPs since late 2024 — the multiget endpoint is on a
 * looser allow-list and consistently works as a fallback.
 *
 * Throws with a humane Spanish message if both attempts fail.
 */
async function fetchMlItemRaw(itemId: string): Promise<MLApiItem> {
  // 1) Per-id endpoint — fastest, most complete payload.
  {
    const t = withTimeout(8_000);
    let res: Response;
    try {
      res = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`, {
        headers: ML_API_HEADERS,
        cache: 'no-store',
        signal: t.signal,
      });
    } finally {
      t.cancel();
    }
    if (res.ok) {
      return (await res.json()) as MLApiItem;
    }

    // Only 401/403/429 are worth retrying via multiget. Any other
    // status (404, 5xx) means the item really isn't reachable.
    if (![401, 403, 429].includes(res.status)) {
      const detail = await readShortBody(res);
      throw new Error(
        `Mercado Libre respondió HTTP ${res.status} para el ID ${itemId}. ` +
          (res.status === 404
            ? 'La publicación no existe o fue eliminada.'
            : `Verifica que la publicación exista y sea pública.${detail ? ` (${detail})` : ''}`),
      );
    }
  }

  // 2) Multiget fallback. Returns `[{ code, body }]` instead of the
  //    raw item, but the body shape matches `MLApiItem`.
  {
    const t = withTimeout(8_000);
    let res: Response;
    try {
      res = await fetch(
        `https://api.mercadolibre.com/items?ids=${encodeURIComponent(itemId)}`,
        { headers: ML_API_HEADERS, cache: 'no-store', signal: t.signal },
      );
    } finally {
      t.cancel();
    }
    if (res.ok) {
      const arr = (await res.json()) as Array<{ code?: number; body?: MLApiItem }>;
      const entry = Array.isArray(arr) ? arr[0] : null;
      if (entry?.code === 200 && entry.body && typeof entry.body === 'object') {
        return entry.body;
      }
      // Multiget returned an envelope but the inner code is the real error.
      const innerCode = entry?.code ?? 'desconocido';
      throw new Error(
        `Mercado Libre respondió HTTP ${innerCode} para el ID ${itemId}. ` +
          'Verifica que la publicación exista y sea pública.',
      );
    }

    const detail = await readShortBody(res);
    const hasToken = !!process.env.MERCADOLIBRE_ACCESS_TOKEN?.trim();
    throw new Error(
      `Mercado Libre respondió HTTP ${res.status} para el ID ${itemId}. ` +
        (hasToken
          ? 'El token configurado en MERCADOLIBRE_ACCESS_TOKEN puede haber expirado.'
          : 'La API pública está bloqueando este servidor. Configura MERCADOLIBRE_ACCESS_TOKEN ' +
            'con un token de https://developers.mercadolibre.com/ para autenticar las peticiones.') +
        (detail ? ` (${detail})` : ''),
    );
  }
}

/** Reads up to 200 chars of an error response so we can surface a clue. */
async function readShortBody(res: Response): Promise<string> {
  try {
    const txt = await res.text();
    return txt.replace(/\s+/g, ' ').trim().slice(0, 200);
  } catch {
    return '';
  }
}

/**
 * Calls the public Mercado Libre API for a given MLC item id and maps
 * the response into our common `ImportedProduct` shape.
 */
async function fetchMercadoLibreItem(itemId: string): Promise<ImportedProduct> {
  let item: MLApiItem;
  try {
    item = await fetchMlItemRaw(itemId);
  } catch (primaryErr) {
    // Last-resort fallback: when Mercado Libre blocks JSON API access
    // from this server/IP, try to scrape the public article page.
    // This keeps admin imports usable even without an OAuth token.
    try {
      const fallbackUrl = new URL(`https://articulo.mercadolibre.cl/${encodeURIComponent(itemId)}`);
      const { finalUrl, html } = await fetchResolved(fallbackUrl);
      const generic = parseGenericProductHtml(html, finalUrl);
      return {
        ...generic,
        source: 'mercadolibre',
        sourceId: itemId,
        sourceUrl: generic.sourceUrl || fallbackUrl.toString(),
        // Keep the canonical currency for ML Chile unless the page
        // explicitly surfaced another one.
        currency: (generic.currency || 'CLP').toUpperCase(),
      };
    } catch {
      throw primaryErr;
    }
  }

  // Best-effort fetch of the long-form description. Failures here are
  // non-fatal — we still return the basic product info.
  let description: string | null = null;
  try {
    const t2 = withTimeout(5_000);
    try {
      const dRes = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}/description`, {
        headers: ML_API_HEADERS,
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

  const pictures = Array.isArray(item.pictures) ? item.pictures : [];
  const images: string[] = [];
  for (const pic of pictures) {
    const u = pic?.secure_url || pic?.url;
    if (typeof u === 'string' && u.trim() && !images.includes(u)) {
      images.push(u);
    }
  }
  if (images.length === 0 && typeof item.thumbnail === 'string' && item.thumbnail.trim()) {
    images.push(item.thumbnail);
  }
  const cover = images[0] ?? null;

  return {
    source: 'mercadolibre',
    sourceId: item.id ?? itemId,
    sourceUrl: item.permalink ?? `https://articulo.mercadolibre.cl/${itemId}`,
    title: item.title ?? itemId,
    description,
    price: typeof item.price === 'number' ? item.price : 0,
    currency: item.currency_id || 'CLP',
    imageUrl: cover,
    images,
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

  // Microdata helper: reads `content` attribute first, falls back to text.
  // Used for elements with `itemprop="price|priceCurrency|availability|name"`
  // that are common on stores without Open Graph (Shopify legacy themes,
  // small WooCommerce shops, custom carts, etc.).
  const itemprop = (name: string): string | null => {
    const el = $(`[itemprop="${name}"]`).first();
    if (!el.length) return null;
    const c = el.attr('content');
    if (c && c.trim()) return c.trim();
    const t = el.text().trim();
    return t || null;
  };

  const title =
    meta('meta[property="og:title"]') ||
    meta('meta[name="twitter:title"]') ||
    itemprop('name') ||
    $('h1').first().text().trim() ||
    $('title').first().text().trim() ||
    finalUrl.hostname;

  const description =
    meta('meta[property="og:description"]') ||
    meta('meta[name="twitter:description"]') ||
    meta('meta[name="description"]') ||
    null;

  // Collect every plausible image URL: og:image (and its variants),
  // twitter:image, and JSON-LD Product.image (string | array |
  // ImageObject). The first entry becomes the cover; the rest are
  // surfaced by the admin preview so the user can pick or copy them.
  const images: string[] = [];
  const pushImage = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    let abs = trimmed;
    try { abs = new URL(trimmed, finalUrl).toString(); } catch { /* keep raw */ }
    if (!images.includes(abs)) images.push(abs);
  };

  $('meta[property="og:image:secure_url"], meta[property="og:image"], meta[property="og:image:url"], meta[name="twitter:image"], meta[name="twitter:image:src"]').each((_, el) => {
    pushImage($(el).attr('content'));
  });

  let imageUrl =
    meta('meta[property="og:image:secure_url"]') ||
    meta('meta[property="og:image"]') ||
    meta('meta[name="twitter:image"]') ||
    null;
  if (imageUrl) {
    try { imageUrl = new URL(imageUrl, finalUrl).toString(); } catch { /* keep raw */ }
  }

  // Open Graph product price (Facebook spec) + microdata fallback.
  let priceStr =
    meta('meta[property="product:price:amount"]') ||
    meta('meta[property="og:price:amount"]') ||
    meta('meta[itemprop="price"]') ||
    itemprop('price') ||
    null;
  let currency =
    meta('meta[property="product:price:currency"]') ||
    meta('meta[property="og:price:currency"]') ||
    meta('meta[itemprop="priceCurrency"]') ||
    itemprop('priceCurrency') ||
    null;
  let availability: string | null =
    meta('meta[property="product:availability"]') ||
    meta('meta[property="og:availability"]') ||
    itemprop('availability') ||
    null;

  // JSON-LD `Product` / `Offer` is the most reliable source when present.
  // We always walk JSON-LD (even when og price tags are present) so we
  // can collect Product.image entries that the OG metadata may miss.
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
      // Product.image: string | string[] | ImageObject | ImageObject[]
      const img = obj.image;
      const imgList = Array.isArray(img) ? img : [img];
      for (const entry of imgList) {
        if (typeof entry === 'string') {
          pushImage(entry);
        } else if (entry && typeof entry === 'object') {
          const e = entry as Record<string, unknown>;
          if (typeof e.url === 'string') pushImage(e.url);
          else if (typeof e.contentUrl === 'string') pushImage(e.contentUrl);
        }
      }
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

  // Last-resort price: scan the rendered text of the page for the first
  // monetary expression (e.g. "$49.990", "CLP 49.990", "$49.99 USD",
  // "USD 1,299.00"). Only used when no structured price was found.
  if (!priceStr) {
    const bodyText = $('body').text();
    const moneyRe = /(?:CLP|USD|EUR|ARS|PEN|MXN|BRL|COP|\$)\s*([\d.,]+)|([\d.,]+)\s*(?:CLP|USD|EUR|ARS|PEN|MXN|BRL|COP)/i;
    const m = bodyText.match(moneyRe);
    if (m) {
      priceStr = m[1] ?? m[2] ?? null;
      if (!currency) {
        const cm = m[0].match(/CLP|USD|EUR|ARS|PEN|MXN|BRL|COP/i);
        if (cm) currency = cm[0].toUpperCase();
      }
    }
  }

  // Last-resort cover image: largest <img> by declared width when no
  // og:image / JSON-LD image was found.
  if (images.length === 0) {
    let bestSrc: string | null = null;
    let bestSize = 0;
    $('img').each((_, el) => {
      const $el = $(el);
      const src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-lazy-src');
      if (!src) return;
      const w = Number.parseInt($el.attr('width') ?? '0', 10) || 0;
      const h = Number.parseInt($el.attr('height') ?? '0', 10) || 0;
      const size = (w || 200) * (h || 200);
      if (size > bestSize && !/sprite|logo|icon|avatar/i.test(src)) {
        bestSize = size;
        bestSrc = src;
      }
    });
    if (bestSrc) pushImage(bestSrc);
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
    // Keep `imageUrl` aligned with the first entry of `images` so callers
    // that consume one or the other agree on the cover.
    imageUrl: images[0] ?? imageUrl ?? null,
    images,
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

  // Mercado Libre path: walk the redirect chain manually so we can
  // pull the MLC id straight from any hop's Location header. This
  // avoids ever loading the article HTML (which ML's WAF blocks with
  // HTTP 403 from datacentre IPs like Vercel's), and keeps the public
  // `api.mercadolibre.com/items/{MLC}` endpoint as the source of
  // truth whenever an id can be derived.
  if (isMercadoLibreUrl(url)) {
    try {
      const { chain, finalUrl } = await resolveRedirectChain(url);
      const mlc = findMlcInChain(chain);
      if (mlc) {
        return fetchMercadoLibreItem(mlc);
      }
      // No id in the chain (e.g. the short link landed on a category
      // listing). Fall back to scraping the resolved page.
      try {
        const { html } = await fetchResolved(finalUrl);
        const fromHtml = extractMlcId(html);
        if (fromHtml) return fetchMercadoLibreItem(fromHtml);
        return parseGenericProductHtml(html, finalUrl);
      } catch {
        // HTML fetch was blocked (403/etc). Surface a clearer error.
        throw new Error(
          'Mercado Libre bloqueó la lectura del HTML y no se pudo extraer el ID del producto (MLC...). Pega la URL larga del artículo.',
        );
      }
    } catch (err) {
      // If the manual redirect walk itself failed (DNS, timeout, SSRF
      // guard, etc.), bubble up.
      if (err instanceof TypeError) throw err;
      throw err instanceof Error ? err : new Error('No se pudo resolver el enlace de Mercado Libre.');
    }
  }

  // Non-ML stores: resolve redirects (with body) and run the OG /
  // JSON-LD scraper. If the upstream store blocks our request (very
  // common with Cloudflare/Akamai-fronted retailers from datacentre
  // IPs), retry with a mobile UA and finally via the r.jina.ai reader
  // proxy (real headless browser). Only after every strategy fails do
  // we surface the manual-fill stub.
  try {
    const { finalUrl, html } = await fetchResolvedWithFallback(url);
    // The redirect may end up on Mercado Libre even if the input host
    // wasn't one we recognised (e.g. an affiliate tracker on a third-
    // party domain). Re-check after redirection.
    if (isMercadoLibreUrl(finalUrl)) {
      const mlc =
        extractMlcId(finalUrl.pathname) ??
        extractMlcId(finalUrl.search) ??
        extractMlcId(html);
      if (mlc) {
        return fetchMercadoLibreItem(mlc);
      }
    }
    return parseGenericProductHtml(html, finalUrl);
  } catch (err) {
    // SSRF/timeout/DNS errors must still bubble up.
    if (err instanceof TypeError) throw err;
    const message = err instanceof Error ? err.message : '';
    const isBlocked = /HTTP\s+(403|401|429|503|451)/i.test(message);
    if (!isBlocked) throw err;
    // Manual-fill stub: empty preview keyed off the URL host. The
    // admin completes title/price/image and persists.
    return {
      source: 'generic',
      sourceId: null,
      sourceUrl: url.toString(),
      title: url.hostname.replace(/^www\./, ''),
      description: `La tienda bloqueó la lectura automática (${message.trim() || 'acceso restringido'}). Completa los datos manualmente.`,
      price: 0,
      currency: 'CLP',
      imageUrl: null,
      images: [],
      available: null,
      stock: null,
    };
  }
}
