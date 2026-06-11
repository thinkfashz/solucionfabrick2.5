import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function apiKey() {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

function sqlText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rows(result: { data: unknown }): Record<string, unknown>[] {
  return (result.data as { data?: { rows?: Record<string, unknown>[] } } | null)?.data?.rows ?? [];
}

async function runRawSql(query: string) {
  const res = await fetch(`${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey() },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

function expiredHtml() {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link expirado</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#090806;color:#fff7e8;font-family:system-ui}.box{max-width:560px;padding:32px;border:1px solid rgba(255,190,56,.24);border-radius:32px;background:#111;box-shadow:0 24px 80px rgba(0,0,0,.45)}h1{font-size:42px;letter-spacing:-.05em}.tag{color:#fbbf24;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:.22em}</style></head><body><main class="box"><p class="tag">Soluciones Fabrick</p><h1>Este link ya expiró</h1><p>Solicita una nueva versión para ver precios y condiciones actualizadas.</p></main></body></html>`;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(token || '')) {
    return new NextResponse(expiredHtml(), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const result = await runRawSql(`
SELECT html, status, expires_at
FROM page_engine_documents
WHERE token = ${sqlText(token)}
LIMIT 1;
`);

  if (!result.ok) return NextResponse.json({ error: 'No se pudo leer la página.' }, { status: 502 });

  const row = rows(result)[0];
  if (!row || row.status !== 'publicado') {
    return new NextResponse(expiredHtml(), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  const expires = row.expires_at ? new Date(String(row.expires_at)).getTime() : Number.NaN;
  if (Number.isFinite(expires) && Date.now() > expires) {
    return new NextResponse(expiredHtml(), { status: 410, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  return new NextResponse(String(row.html || expiredHtml()), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
