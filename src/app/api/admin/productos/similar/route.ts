import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/productos/similar?q=...&limit=12
 *
 * Universal "similar products" search across the web. Strategy:
 *
 *   1. If `GOOGLE_CSE_KEY` and `GOOGLE_CSE_CX` are configured, use the
 *      official Google Custom Search JSON API (most reliable, ~100
 *      queries/day free tier).
 *   2. Else, scrape Google Shopping (`tbm=shop`) which returns product
 *      tiles with image + price + merchant link. Often blocked from
 *      datacentre IPs but works locally.
 *   3. Final fallback: DuckDuckGo HTML (`html.duckduckgo.com`), which
 *      is permissive but returns plain text/link results.
 *
 * Always returns `{ ok: true, results: SimilarItem[], source, warning? }`
 * with HTTP 200 — the caller decides how to render.
 */

interface SimilarItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string | null;
  permalink: string;
  domain: string | null;
  snippet: string | null;
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Upgrade-Insecure-Requests': '1',
};

function safeDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function parsePrice(raw: string | null | undefined): { price: number; currency: string } {
  if (!raw) return { price: 0, currency: 'CLP' };
  const currencyMatch = raw.match(/CLP|USD|EUR|MXN|ARS|COP|PEN|BRL/i);
  const currency = (currencyMatch?.[0] ?? 'CLP').toUpperCase();
  let s = raw.replace(/[^\d.,-]/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot === -1 && lastComma === -1) {
    /* plain integer */
  } else if (lastDot >= 0 && lastComma === -1) {
    if (s.slice(lastDot + 1).length === 3) s = s.replace(/\./g, '');
  } else if (lastComma >= 0 && lastDot === -1) {
    if (s.slice(lastComma + 1).length === 3) s = s.replace(/,/g, '');
    else s = s.replace(/,/g, '.');
  } else if (lastDot > lastComma) {
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = Number.parseFloat(s);
  return { price: Number.isFinite(n) ? n : 0, currency };
}

// ---------------------------------------------------------------------------
// 1) Google Custom Search JSON API
// ---------------------------------------------------------------------------

async function googleCseSearch(q: string, limit: number): Promise<SimilarItem[]> {
  const key = process.env.GOOGLE_CSE_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!key || !cx) return [];
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(q)}&num=${Math.min(limit, 10)}&gl=cl&hl=es`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Google CSE HTTP ${res.status}`);
  const json = (await res.json()) as {
    items?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      pagemap?: {
        cse_image?: Array<{ src?: string }>;
        cse_thumbnail?: Array<{ src?: string }>;
        offer?: Array<{ price?: string; pricecurrency?: string }>;
        product?: Array<{ name?: string; image?: string }>;
        metatags?: Array<Record<string, string>>;
      };
    }>;
  };
  return (json.items ?? []).slice(0, limit).map((it, idx) => {
    const pm = it.pagemap ?? {};
    const meta = pm.metatags?.[0] ?? {};
    const thumb =
      pm.cse_image?.[0]?.src ||
      pm.cse_thumbnail?.[0]?.src ||
      pm.product?.[0]?.image ||
      meta['og:image'] ||
      null;
    const offer = pm.offer?.[0];
    const priceRaw =
      offer?.price ||
      meta['product:price:amount'] ||
      meta['og:price:amount'] ||
      null;
    const currency =
      offer?.pricecurrency ||
      meta['product:price:currency'] ||
      meta['og:price:currency'] ||
      'CLP';
    const parsed = priceRaw ? parsePrice(`${currency} ${priceRaw}`) : { price: 0, currency: currency.toUpperCase() };
    return {
      id: `cse-${idx}`,
      title: it.title ?? '(sin título)',
      price: parsed.price,
      currency: parsed.currency,
      thumbnail: thumb,
      permalink: it.link ?? '#',
      domain: safeDomain(it.link ?? ''),
      snippet: it.snippet ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// 2) Google Shopping HTML scrape
// ---------------------------------------------------------------------------

async function googleShoppingScrape(q: string, limit: number): Promise<SimilarItem[]> {
  const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=shop&hl=es&gl=cl`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`Google Shopping HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const out: SimilarItem[] = [];
    $('a[href^="/url?q=http"], a[href^="https://www.google.com/url?"]').each((_idx, el) => {
      if (out.length >= limit) return false;
      const href = $(el).attr('href') ?? '';
      const m = href.match(/[?&]q=([^&]+)/) || href.match(/[?&]url=([^&]+)/);
      if (!m) return undefined;
      let real = '';
      try { real = decodeURIComponent(m[1]); } catch { return undefined; }
      if (!/^https?:\/\//i.test(real)) return undefined;
      if (/google\.com|gstatic\.com|googleadservices/.test(real)) return undefined;

      const $el = $(el);
      const title = $el.find('h3,h4').first().text().trim() || $el.text().trim().slice(0, 140);
      if (!title) return undefined;

      let $ctx: cheerio.Cheerio<Element> = $el as cheerio.Cheerio<Element>;
      for (let i = 0; i < 4; i++) {
        const parent = $ctx.parent();
        if (!parent.length) break;
        $ctx = parent as cheerio.Cheerio<Element>;
      }
      const img = $ctx.find('img').first().attr('src') || $ctx.find('img').first().attr('data-src') || null;
      const priceText =
        $ctx.text().match(/(?:CLP|USD|EUR|MXN|ARS|COP|PEN|BRL|\$)\s*[\d.,]+/i)?.[0] ?? null;
      const parsed = parsePrice(priceText);
      out.push({
        id: `goog-${out.length}`,
        title: title.slice(0, 200),
        price: parsed.price,
        currency: parsed.currency,
        thumbnail: img,
        permalink: real,
        domain: safeDomain(real),
        snippet: null,
      });
      return undefined;
    });
    const seen = new Set<string>();
    return out.filter((r) => {
      const k = `${r.domain}::${r.title}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 3) DuckDuckGo HTML fallback
// ---------------------------------------------------------------------------

async function duckduckgoScrape(q: string, limit: number): Promise<SimilarItem[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=cl-es`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const out: SimilarItem[] = [];
    $('.result').each((_idx, el) => {
      if (out.length >= limit) return false;
      const $el = $(el);
      const $a = $el.find('a.result__a').first();
      const rawHref = $a.attr('href') ?? '';
      let link = rawHref;
      const m = rawHref.match(/[?&]uddg=([^&]+)/);
      if (m) {
        try { link = decodeURIComponent(m[1]); } catch { /* keep raw */ }
      }
      if (!/^https?:\/\//i.test(link)) link = `https:${link.startsWith('//') ? link : `//${link}`}`;
      const title = $a.text().trim();
      const snippet = $el.find('.result__snippet').text().trim() || null;
      if (!title) return undefined;
      out.push({
        id: `ddg-${out.length}`,
        title: title.slice(0, 200),
        price: 0,
        currency: 'CLP',
        thumbnail: null,
        permalink: link,
        domain: safeDomain(link),
        snippet,
      });
      return undefined;
    });
    return out;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const url = new URL(request.url);
  const qRaw = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get('limit') ?? '12', 10) || 12, 1),
    24,
  );

  if (!qRaw || qRaw.length < 2) {
    return NextResponse.json({ ok: true, results: [], source: 'none' });
  }

  const q = qRaw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/MLC[-_]?\d+/gi, ' ')
    .replace(/[^\p{L}\p{N}\s.,'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  const tries: Array<{ name: string; fn: () => Promise<SimilarItem[]> }> = [
    { name: 'google-cse', fn: () => googleCseSearch(q, limit) },
    { name: 'google-shopping', fn: () => googleShoppingScrape(q, limit) },
    { name: 'duckduckgo', fn: () => duckduckgoScrape(q, limit) },
  ];

  let lastError: string | null = null;
  for (const t of tries) {
    try {
      const results = await t.fn();
      if (results.length > 0) {
        return NextResponse.json({ ok: true, results, source: t.name, query: q });
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    ok: true,
    results: [],
    source: 'none',
    query: q,
    warning: lastError ?? 'No se encontraron resultados.',
  });
}
