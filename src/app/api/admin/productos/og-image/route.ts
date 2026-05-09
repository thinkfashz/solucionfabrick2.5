import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/productos/og-image?url=...
 *
 * Lightweight og:image extractor. Used by the SimilarProducts grid to
 * lazily backfill thumbnails for results that the search providers
 * returned without one (typical of DuckDuckGo HTML results).
 *
 * Strategy:
 *   1. Try a direct fetch with browser headers (cheap, ~200 ms when it works).
 *   2. On 4xx/5xx, fall back to r.jina.ai reader (slower, but bypasses
 *      Cloudflare/Akamai bot challenges). Auth via JINA_API_KEY when set.
 *
 * Always returns 200 with `{ ok: true, image: string | null }` so the
 * caller can render a favicon fallback when nothing is found.
 */

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
};

function extractOgImage(html: string, base: URL): string | null {
  const re = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const r of re) {
    const m = html.match(r);
    if (m?.[1]) {
      try { return new URL(m[1], base).toString(); } catch { /* skip */ }
    }
  }
  return null;
}

async function tryDirect(url: URL, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      headers: { ...BROWSER_HEADERS, Referer: `${url.protocol}//${url.host}/` },
      cache: 'no-store',
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 500_000);
    return extractOgImage(html, new URL(res.url));
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function tryJina(url: URL, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      Accept: 'text/html,*/*;q=0.8',
      'X-Return-Format': 'html',
    };
    const key = process.env.JINA_API_KEY?.trim();
    if (key) headers.Authorization = `Bearer ${key}`;
    const res = await fetch(`https://r.jina.ai/${url.toString()}`, {
      headers,
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 500_000);
    return extractOgImage(html, url);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return adminUnauthorized();

  const raw = (new URL(request.url).searchParams.get('url') ?? '').trim();
  if (!raw) return NextResponse.json({ ok: true, image: null });

  let url: URL;
  try { url = new URL(raw); } catch { return NextResponse.json({ ok: true, image: null }); }
  if (!/^https?:$/.test(url.protocol)) return NextResponse.json({ ok: true, image: null });

  const direct = await tryDirect(url, 4_000);
  if (direct) return NextResponse.json({ ok: true, image: direct });

  const viaProxy = await tryJina(url, 8_000);
  return NextResponse.json({ ok: true, image: viaProxy });
}
