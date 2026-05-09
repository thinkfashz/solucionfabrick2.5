import { NextRequest, NextResponse } from 'next/server';

interface TrendItem {
  title: string;
  url: string;
  domain: string;
}

function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'sitio-externo';
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function parseDuckHtml(html: string): TrendItem[] {
  const items: TrendItem[] = [];
  const regex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const href = decodeHtml(match[1] ?? '');
    const text = decodeHtml((match[2] ?? '').replace(/<[^>]+>/g, ''));
    if (!href || !text) continue;
    items.push({
      title: text,
      url: href,
      domain: extractDomain(href),
    });
    if (items.length >= 8) break;
  }

  return items;
}

export async function POST(request: NextRequest) {
  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const query = String(body.query ?? '').trim();
  if (!query) {
    return NextResponse.json({ error: 'Debes ingresar un término de búsqueda.' }, { status: 400 });
  }

  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: `No se pudo consultar tendencias (${res.status}).` }, { status: 502 });
    }

    const html = await res.text();
    const items = parseDuckHtml(html);

    return NextResponse.json({
      ok: true,
      query,
      items,
      count: items.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error scrapeando tendencias.' },
      { status: 500 },
    );
  }
}
