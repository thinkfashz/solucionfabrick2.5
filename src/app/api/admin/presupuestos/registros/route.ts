import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function resolveApiKey(): { key: string; source: 'admin' | 'anon' | 'fallback' } {
  if (process.env.INSFORGE_API_KEY) return { key: process.env.INSFORGE_API_KEY, source: 'admin' };
  if (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) return { key: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY, source: 'anon' };
  return { key: 'ik_7e23032539c2dc64d5d27ca29d07b928', source: 'fallback' };
}

function sqlText(value: unknown) { if (value === null || value === undefined || value === '') return 'NULL'; return `'${String(value).replace(/'/g, "''")}'`; }
function sqlNumber(value: unknown) { const n = Number(value); return Number.isFinite(n) ? String(n) : '0'; }
function sqlJson(value: unknown) { return `${sqlText(JSON.stringify(value ?? {}))}::jsonb`; }
function rows(result: { data: unknown }): Record<string, unknown>[] { return (result.data as { data?: { rows?: Record<string, unknown>[] } } | null)?.data?.rows ?? []; }
async function requireAdmin(request: NextRequest) { const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME); if (!sessionCookie?.value) return null; return decodeSession(sessionCookie.value); }

async function runRawSql(query: string) {
  const { key: apiKey, source } = resolveApiKey();
  const url = `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(30_000), cache: 'no-store' });
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) return { ok: false, status: res.status, data, keySource: source };
  return { ok: true, status: res.status, data, keySource: source };
}

async function ensureTable() {
  return runRawSql(`
CREATE TABLE IF NOT EXISTS presupuesto_registros (
  id TEXT PRIMARY KEY,
  presupuesto_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'presupuesto',
  proveedor TEXT,
  cliente TEXT NOT NULL,
  numero_cliente TEXT,
  empresa_cliente TEXT,
  titulo TEXT,
  fecha DATE,
  ciudad TEXT,
  estado TEXT,
  valor_neto NUMERIC DEFAULT 0,
  iva_porcentaje NUMERIC DEFAULT 0,
  total_iva NUMERIC DEFAULT 0,
  total_con_iva NUMERIC DEFAULT 0,
  public_link TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  presupuesto_json JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_presupuesto_registros_slug ON presupuesto_registros(slug);
CREATE INDEX IF NOT EXISTS idx_presupuesto_registros_cliente ON presupuesto_registros(cliente);
CREATE INDEX IF NOT EXISTS idx_presupuesto_registros_empresa ON presupuesto_registros(empresa_cliente);
CREATE INDEX IF NOT EXISTS idx_presupuesto_registros_generated_at ON presupuesto_registros(generated_at DESC);
`);
}

type BudgetPayload = Record<string, unknown> & { id?: string; slug?: string; proveedor?: string; cliente?: string; telefono_whatsapp?: string; numero_cliente?: string; empresa_cliente?: string; titulo?: string; fecha?: string; ciudad?: string; estado?: string; valor_neto?: number; iva_porcentaje?: number; total_iva?: number; total_con_iva?: number; public_link?: string; meta?: Record<string, unknown> };

export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  let presupuesto: BudgetPayload;
  try { const body = await request.json(); presupuesto = (body?.presupuesto ?? body) as BudgetPayload; } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  if (!presupuesto?.id || !presupuesto?.slug || !presupuesto?.cliente) return NextResponse.json({ error: 'Faltan campos obligatorios: id, slug y cliente.' }, { status: 400 });
  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla presupuesto_registros.', detail: ensure.data, keySource: ensure.keySource }, { status: 502 });
  const recordId = `registro_${presupuesto.id}`;
  const generatedAt = new Date().toISOString();
  const numeroCliente = presupuesto.numero_cliente || presupuesto.telefono_whatsapp || '';
  const meta = { ...(presupuesto.meta || {}), source: 'admin_presupuestos_builder', generated_by_role: session.rol, generated_by_email: session.email ?? null, generated_at: generatedAt, public_link: presupuesto.public_link ?? null, cliente: presupuesto.cliente, numero_cliente: numeroCliente, empresa_cliente: presupuesto.empresa_cliente ?? null };
  const query = `INSERT INTO presupuesto_registros (id, presupuesto_id, slug, document_type, proveedor, cliente, numero_cliente, empresa_cliente, titulo, fecha, ciudad, estado, valor_neto, iva_porcentaje, total_iva, total_con_iva, public_link, meta, presupuesto_json, generated_at, updated_at) VALUES (${sqlText(recordId)}, ${sqlText(presupuesto.id)}, ${sqlText(presupuesto.slug)}, ${sqlText('presupuesto')}, ${sqlText(presupuesto.proveedor)}, ${sqlText(presupuesto.cliente)}, ${sqlText(numeroCliente)}, ${sqlText(presupuesto.empresa_cliente)}, ${sqlText(presupuesto.titulo)}, ${sqlText(presupuesto.fecha)}, ${sqlText(presupuesto.ciudad)}, ${sqlText(presupuesto.estado)}, ${sqlNumber(presupuesto.valor_neto)}, ${sqlNumber(presupuesto.iva_porcentaje)}, ${sqlNumber(presupuesto.total_iva)}, ${sqlNumber(presupuesto.total_con_iva)}, ${sqlText(presupuesto.public_link)}, ${sqlJson(meta)}, ${sqlJson(presupuesto)}, ${sqlText(generatedAt)}, NOW()) ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, proveedor = EXCLUDED.proveedor, cliente = EXCLUDED.cliente, numero_cliente = EXCLUDED.numero_cliente, empresa_cliente = EXCLUDED.empresa_cliente, titulo = EXCLUDED.titulo, fecha = EXCLUDED.fecha, ciudad = EXCLUDED.ciudad, estado = EXCLUDED.estado, valor_neto = EXCLUDED.valor_neto, iva_porcentaje = EXCLUDED.iva_porcentaje, total_iva = EXCLUDED.total_iva, total_con_iva = EXCLUDED.total_con_iva, public_link = EXCLUDED.public_link, meta = EXCLUDED.meta, presupuesto_json = EXCLUDED.presupuesto_json, generated_at = EXCLUDED.generated_at, updated_at = NOW();`;
  const result = await runRawSql(query);
  if (!result.ok) return NextResponse.json({ error: 'No se pudo guardar el registro en base de datos.', detail: result.data, keySource: result.keySource }, { status: 502 });
  return NextResponse.json({ ok: true, id: recordId, table: 'presupuesto_registros', keySource: result.keySource });
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla presupuesto_registros.', detail: ensure.data, keySource: ensure.keySource }, { status: 502 });
  const result = await runRawSql('SELECT id, presupuesto_id, slug, cliente, numero_cliente, empresa_cliente, titulo, fecha, estado, total_con_iva, public_link, generated_at FROM presupuesto_registros ORDER BY generated_at DESC LIMIT 200;');
  if (!result.ok) return NextResponse.json({ error: 'No se pudieron leer los registros.', detail: result.data, keySource: result.keySource }, { status: 502 });
  return NextResponse.json({ ok: true, records: rows(result), data: result.data, keySource: result.keySource });
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  const id = request.nextUrl.searchParams.get('id') || '';
  if (!/^registro_[a-zA-Z0-9_-]+$/.test(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  const ensure = await ensureTable();
  if (!ensure.ok) return NextResponse.json({ error: 'No se pudo preparar la tabla presupuesto_registros.', detail: ensure.data, keySource: ensure.keySource }, { status: 502 });
  const result = await runRawSql(`DELETE FROM presupuesto_registros WHERE id = ${sqlText(id)};`);
  if (!result.ok) return NextResponse.json({ error: 'No se pudo eliminar el registro.', detail: result.data, keySource: result.keySource }, { status: 502 });
  return NextResponse.json({ ok: true, deleted: id, keySource: result.keySource });
}
