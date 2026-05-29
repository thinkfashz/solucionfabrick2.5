export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

function sql(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function rawsql(query: string): Promise<{ data?: { rows?: Record<string, unknown>[] } } | null> {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    return res.json() as Promise<{ data?: { rows?: Record<string, unknown>[] } }>;
  } catch {
    return null;
  }
}

async function ensureTable(): Promise<void> {
  await rawsql(`
    CREATE TABLE IF NOT EXISTS correos_recibidos (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      resend_id TEXT,
      de TEXT NOT NULL,
      para TEXT,
      asunto TEXT,
      cuerpo_texto TEXT,
      cuerpo_html TEXT,
      leido BOOLEAN DEFAULT FALSE,
      respondido BOOLEAN DEFAULT FALSE,
      respuesta_resend_id TEXT,
      fecha_recibido TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v);
}

function toBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 't';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  await ensureTable();

  const { searchParams } = new URL(request.url);
  const soloNoLeidos = searchParams.get('noLeidos') === '1';

  const where = soloNoLeidos ? 'WHERE leido = FALSE' : '';

  const data = await rawsql(`
    SELECT
      id, resend_id, de, para, asunto,
      cuerpo_texto, cuerpo_html,
      leido, respondido, respuesta_resend_id,
      fecha_recibido
    FROM correos_recibidos
    ${where}
    ORDER BY fecha_recibido DESC
    LIMIT 100;
  `);

  const countData = await rawsql(`SELECT COUNT(*) AS cnt FROM correos_recibidos WHERE leido = FALSE;`);
  const unread = Number((countData?.data?.rows ?? [])[0]?.cnt ?? 0);

  const emails = (data?.data?.rows ?? []).map((r) => ({
    id: toStr(r.id),
    resend_id: r.resend_id ? toStr(r.resend_id) : null,
    de: toStr(r.de),
    para: toStr(r.para),
    asunto: toStr(r.asunto),
    cuerpo_texto: toStr(r.cuerpo_texto),
    cuerpo_html: toStr(r.cuerpo_html),
    leido: toBool(r.leido),
    respondido: toBool(r.respondido),
    fecha_recibido: toStr(r.fecha_recibido),
  }));

  return NextResponse.json({ ok: true, emails, unread });
}

// PATCH — mark as read or replied
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;

  let id = '';
  let action: 'leido' | 'respondido' = 'leido';
  let resendId: string | null = null;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.id === 'string') id = body.id;
    if (body.action === 'respondido') action = 'respondido';
    if (typeof body.resend_id === 'string') resendId = body.resend_id;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (!id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });

  await ensureTable();

  if (action === 'respondido') {
    await rawsql(`
      UPDATE correos_recibidos
      SET leido = TRUE, respondido = TRUE, respuesta_resend_id = ${sql(resendId)}
      WHERE id = ${sql(id)};
    `);
  } else {
    await rawsql(`UPDATE correos_recibidos SET leido = TRUE WHERE id = ${sql(id)};`);
  }

  return NextResponse.json({ ok: true });
}
