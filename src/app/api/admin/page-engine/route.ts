import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';

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

function plainObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
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

function makeToken() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6); }
function cleanTitle(value: unknown) { return String(value || '').trim().slice(0, 140); }
function cleanStatus(value: unknown) { const status = String(value || 'publicado').trim().toLowerCase(); return ['borrador', 'publicado', 'archivado'].includes(status) ? status : 'publicado'; }
function cleanHtml(value: unknown, allowExactHtml = false) {
  let html = String(value || '').trim();
  if (allowExactHtml) return html;
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '');
  html = html.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '');
  html = html.replace(/<embed\b[^>]*>/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html;
}
function validateProjectJson(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'project_json debe ser un objeto.' };
  const project = plainObject(value);
  const blocks = Array.isArray(project.blocks) ? project.blocks : Array.isArray(project.sections) ? project.sections : [];
  const modules = Array.isArray(project.modules) ? project.modules : [];
  const htmlCode = String(project.htmlCode || project.rawHtml || '').trim();
  const mode = String(project.mode || '').toLowerCase();
  if (!blocks.length && !modules.length && !(mode === 'html' && htmlCode.length > 20)) return { ok: false, error: 'El JSON debe incluir modules, blocks, sections o htmlCode en modo html.' };
  return { ok: true, error: '' };
}
async function requireAdmin(request: NextRequest) { const cookie = request.cookies.get(ADMIN_COOKIE_NAME); if (!cookie?.value) return null; return decodeSession(cookie.value); }

function buildPublicUrl(token: string, request: NextRequest) {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return `${explicit.replace(/\/+$/, '')}/w/${token}`;
  return `${request.nextUrl.origin}/w/${token}`;
}

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'Error desconocido');
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' · ') || 'Error de base de datos';
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar page_engine_documents', detail: ensure.data }, { status: 502 });
  const { data, error } = await insforgeAdmin.database
    .from('page_engine_documents')
    .select('token, title, status, expires_at, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: serializeDbError(error), detail: error }, { status: 502 });
  return NextResponse.json({ ok: true, connected: true, table: 'page_engine_documents', documents: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { token?: string; title?: string; html?: string; project_json?: unknown; status?: string; expires_in_hours?: number } | null;
  const project = plainObject(body?.project_json);
  const allowExactHtml = String(project.mode || '').toLowerCase() === 'html' && project.allowUnsafeHtml === true;
  const title = cleanTitle(body?.title);
  const html = cleanHtml(body?.html, allowExactHtml);
  if (!title || title.length < 3) return NextResponse.json({ error: 'El título es obligatorio y debe tener al menos 3 caracteres.' }, { status: 400 });
  if (!html || html.length < 40) return NextResponse.json({ error: 'El HTML está vacío, es demasiado corto o fue limpiado por seguridad.' }, { status: 400 });
  const jsonValidation = validateProjectJson(body?.project_json);
  if (!jsonValidation.ok) return NextResponse.json({ error: jsonValidation.error }, { status: 400 });
  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar page_engine_documents', detail: ensure.data }, { status: 502 });

  const neverExpire = project.neverExpire === true || project.expires === false;
  const hours = Math.max(1, Math.min(24 * 365, Number(body?.expires_in_hours || project.expires_in_hours || 720)));
  const expiresAt = neverExpire ? null : new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const status = cleanStatus(body?.status);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const docToken = body?.token && /^[a-zA-Z0-9_-]{8,80}$/.test(body.token) ? body.token : makeToken();
    const row = { token: docToken, title, status, html, project_json: body?.project_json ?? {}, expires_at: expiresAt, updated_at: new Date().toISOString() };
    const { data, error } = await insforgeAdmin.database
      .from('page_engine_documents')
      .insert([row])
      .select('token, title, status, expires_at, created_at, updated_at')
      .single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505' && !body?.token) continue;
      return NextResponse.json({ error: `No se pudo guardar la página: ${serializeDbError(error)}`, detail: error }, { status: 502 });
    }
    if (!data?.token) return NextResponse.json({ error: 'La base de datos no devolvió el token guardado.' }, { status: 502 });
    return NextResponse.json({ ok: true, connected: true, table: 'page_engine_documents', saved: data, token: docToken, expires_at: expiresAt, never_expire: neverExpire, public_url: buildPublicUrl(docToken, request) });
  }
  return NextResponse.json({ error: 'No se pudo generar un token único. Intenta nuevamente.' }, { status: 500 });
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(token)) return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar page_engine_documents', detail: ensure.data }, { status: 502 });
  const { error } = await insforgeAdmin.database.from('page_engine_documents').delete().eq('token', token);
  if (error) return NextResponse.json({ error: `No se pudo eliminar la página: ${serializeDbError(error)}`, detail: error }, { status: 502 });
  return NextResponse.json({ ok: true, deleted: token });
}
