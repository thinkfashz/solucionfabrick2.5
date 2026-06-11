import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

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

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value ?? {}))}::jsonb`;
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

async function ensureTable() {
  return runRawSql(`
CREATE TABLE IF NOT EXISTS page_engine_documents (
  token TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'borrador',
  html TEXT NOT NULL,
  project_json JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_engine_documents_updated_at ON page_engine_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_engine_documents_status ON page_engine_documents(status);
`);
}

function makeToken() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
}

async function requireAdmin(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return null;
  return decodeSession(cookie.value);
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar page_engine_documents', detail: ensure.data }, { status: 502 });

  const result = await runRawSql(`
SELECT token, title, status, expires_at, created_at, updated_at
FROM page_engine_documents
ORDER BY updated_at DESC
LIMIT 100;
`);
  if (!result.ok) return NextResponse.json({ error: 'No se pudieron leer páginas', detail: result.data }, { status: 502 });
  return NextResponse.json({ ok: true, documents: rows(result) });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null) as { token?: string; title?: string; html?: string; project_json?: unknown; status?: string; expires_in_hours?: number } | null;
  if (!body?.html || !body?.title) return NextResponse.json({ error: 'title y html son obligatorios.' }, { status: 400 });

  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar page_engine_documents', detail: ensure.data }, { status: 502 });

  const docToken = body.token && /^[a-zA-Z0-9_-]{8,80}$/.test(body.token) ? body.token : makeToken();
  const hours = Math.max(1, Number(body.expires_in_hours || 168));
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const status = body.status || 'publicado';

  const result = await runRawSql(`
INSERT INTO page_engine_documents (token, title, status, html, project_json, expires_at, updated_at)
VALUES (${sqlText(docToken)}, ${sqlText(body.title)}, ${sqlText(status)}, ${sqlText(body.html)}, ${sqlJson(body.project_json)}, ${sqlText(expiresAt)}, NOW())
ON CONFLICT (token) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  html = EXCLUDED.html,
  project_json = EXCLUDED.project_json,
  expires_at = EXCLUDED.expires_at,
  updated_at = NOW();
`);

  if (!result.ok) return NextResponse.json({ error: 'No se pudo guardar la página', detail: result.data }, { status: 502 });

  return NextResponse.json({ ok: true, token: docToken, expires_at: expiresAt, public_url: `${request.nextUrl.origin}/w/${docToken}` });
}
