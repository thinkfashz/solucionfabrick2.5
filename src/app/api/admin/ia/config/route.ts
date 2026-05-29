export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return process.env.INSFORGE_API_KEY
    || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
    || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

async function rawsql(query: string) {
  const res = await fetch(
    `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    },
  );
  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, data };
}

function sql(v: unknown) {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function ensureTable() {
  await rawsql(`
    CREATE TABLE IF NOT EXISTS configuracion_ia (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      anthropic_api_key TEXT,
      modelo_ia TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
      proveedor_ia TEXT NOT NULL DEFAULT 'anthropic',
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO configuracion_ia (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;
    ALTER TABLE configuracion_ia ADD COLUMN IF NOT EXISTS proveedor_ia TEXT NOT NULL DEFAULT 'anthropic';
  `);
}

interface ConfigRow {
  modelo_ia: string;
  activo: boolean;
  key_configured: boolean;
  proveedor_ia: string;
}

interface RawResult {
  data?: { rows?: ConfigRow[] };
}

export async function GET() {
  await ensureTable();
  const result = await rawsql(
    `SELECT modelo_ia, activo, proveedor_ia,
       (anthropic_api_key IS NOT NULL AND anthropic_api_key <> '') AS key_configured
     FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;`,
  );
  const rows = (result.data as RawResult)?.data?.rows ?? [];
  const row = rows[0] ?? { modelo_ia: 'claude-haiku-4-5-20251001', activo: true, key_configured: false, proveedor_ia: 'anthropic' };
  return NextResponse.json({
    modelo_ia: row.modelo_ia || 'claude-haiku-4-5-20251001',
    activo: row.activo ?? true,
    key_configured: Boolean(row.key_configured),
    proveedor_ia: (row.proveedor_ia as string) || 'anthropic',
  });
}

export async function POST(req: NextRequest) {
  await ensureTable();
  const body = await req.json() as { anthropic_api_key?: string; modelo_ia?: string; proveedor_ia?: string };

  const sets: string[] = ['updated_at = NOW()'];
  if (typeof body.anthropic_api_key === 'string') sets.push(`anthropic_api_key = ${sql(body.anthropic_api_key)}`);
  if (typeof body.modelo_ia === 'string' && body.modelo_ia.trim()) sets.push(`modelo_ia = ${sql(body.modelo_ia)}`);
  if (typeof body.proveedor_ia === 'string' && body.proveedor_ia.trim()) sets.push(`proveedor_ia = ${sql(body.proveedor_ia)}`);

  const result = await rawsql(`UPDATE configuracion_ia SET ${sets.join(', ')} WHERE id = 'singleton';`);
  if (!result.ok) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
