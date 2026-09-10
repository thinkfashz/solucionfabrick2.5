/**
 * Soluciones Fabrick — Cloudflare Pay Per Crawl readiness worker.
 *
 * This file is intentionally NOT wired into Vercel or production by the PR.
 * Use it only after the domain is on Cloudflare AI Crawl Control and
 * Pay Per Crawl / dynamic pricing has been enabled for the zone.
 *
 * Cloudflare sends:
 *   cf-pay-per-crawl: protocol=cloudflare, pricing=in-band
 *
 * When that mode is active, this worker adds:
 *   crawler-price: USD <price>
 *
 * Keep search-engine crawlers free/allowed in Cloudflare when indexing matters.
 */

const ALWAYS_FREE = new Set([
  '/',
  '/robots.txt',
  '/sitemap.xml',
  '/security.txt',
  '/.well-known/security.txt',
  '/crawlers.json',
  '/llms.txt',
]);

const FREE_PREFIXES = [
  '/api/',
  '/admin',
  '/auth',
  '/checkout',
  '/pedido/',
];

function normalizedPrice(value, fallback = 0.01) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0.001) return fallback;
  return Math.round(parsed * 1000) / 1000;
}

function contentPrice(pathname, env) {
  const base = normalizedPrice(env.DEFAULT_CRAWL_PRICE_USD, 0.01);
  const technical = normalizedPrice(env.TECHNICAL_CRAWL_PRICE_USD, Math.max(base, 0.02));

  if (
    pathname.startsWith('/centro-tecnico') ||
    pathname.startsWith('/herramientas/') ||
    pathname.startsWith('/blog/') ||
    pathname.startsWith('/casos/')
  ) {
    return technical;
  }

  return base;
}

export default {
  async fetch(request, env) {
    const response = await fetch(request);
    const url = new URL(request.url);
    const mode = request.headers.get('cf-pay-per-crawl') || '';

    if (!response.ok || request.method !== 'GET') return response;
    if (ALWAYS_FREE.has(url.pathname)) return response;
    if (FREE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return response;
    if (!/\bpricing=in-band\b/i.test(mode)) return response;

    const mutable = new Response(response.body, response);
    mutable.headers.set('crawler-price', `USD ${contentPrice(url.pathname, env).toFixed(3)}`);
    return mutable;
  },
};
