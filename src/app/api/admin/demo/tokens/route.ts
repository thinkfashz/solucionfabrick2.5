import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { runRawSql } from '@/lib/web-pages/sql';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.solucionesfabrick.com').replace(/\/$/, '');

function isMissingTable(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|relation|schema cache|could not find/i.test(message);
}

async function ensureDemoTables() {
  const result = await runRawSql(`
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS demo_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  label TEXT,
  created_by TEXT,
  expira_at TIMESTAMPTZ NOT NULL,
  accesos INTEGER DEFAULT 0,
  ultimo_acceso TIMESTAMPTZ,
  locked_ip TEXT,
  locked_at TIMESTAMPTZ,
  ultimo_ip TEXT,
  ultimo_user_agent TEXT,
  ultimo_dispositivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS accesos INTEGER DEFAULT 0;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS locked_ip TEXT;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS ultimo_ip TEXT;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS ultimo_user_agent TEXT;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS ultimo_dispositivo TEXT;
ALTER TABLE demo_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_demo_tokens_expira ON demo_tokens(expira_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_tokens_created_at ON demo_tokens(created_at DESC);

CREATE TABLE IF NOT EXISTS demo_access_audit (
  id BIGSERIAL PRIMARY KEY,
  demo_token_id UUID,
  token TEXT,
  session_id TEXT,
  ip TEXT,
  user_agent TEXT,
  device TEXT,
  outcome TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_demo_access_audit_created ON demo_access_audit(created_at DESC);
`);
  if (!result.ok) throw new Error(JSON.stringify(result.data));
}

async function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!sessionCookie?.value) return null;
  return decodeSession(sessionCookie.value);
}

export async function GET(request: NextRequest) {
  const payload = await getSession(request);
  if (!payload) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (payload.rol === 'viewer') return NextResponse.json({ tokens: [] });
  await ensureDemoTables();

  const { data, error } = await insforgeAdmin.database
    .from('demo_tokens')
    .select('id, token, label, created_by, expira_at, accesos, ultimo_acceso, locked_ip, locked_at, ultimo_ip, ultimo_user_agent, ultimo_dispositivo, created_at')
    .gt('expira_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ tokens: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tokens = (data || []).map((t: any) => ({ ...t, link: `${APP_URL}/admin/acceso-demo?token=${t.token}` }));
  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const payload = await getSession(request);
  if (!payload) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (payload.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  await ensureDemoTables();

  let label: string | undefined;
  let hours = 24;
  try {
    const body = await request.json();
    label = body.label?.trim() || undefined;
    hours = Math.max(1, Math.min(168, Number(body.hours || 24)));
  } catch {}

  const token = crypto.randomUUID();
  const expira_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  const link = `${APP_URL}/admin/acceso-demo?token=${token}`;

  const { error } = await insforgeAdmin.database.from('demo_tokens').insert([{ token, label, created_by: payload.email, expira_at, accesos: 0 }]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, link, token, expira_at });
}

export async function DELETE(request: NextRequest) {
  const payload = await getSession(request);
  if (!payload) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (payload.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });
  await ensureDemoTables();

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });
  const { error } = await insforgeAdmin.database.from('demo_tokens').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
