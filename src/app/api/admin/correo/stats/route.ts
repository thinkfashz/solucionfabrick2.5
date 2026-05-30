export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getResendCredentials } from '@/lib/resendCredentials';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return process.env.INSFORGE_API_KEY || process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
}

async function rawsql(query: string): Promise<{ data?: { rows?: Record<string, unknown>[] } } | null> {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    return res.json() as Promise<{ data?: { rows?: Record<string, unknown>[] } }>;
  } catch {
    return null;
  }
}

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v);
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  // Ensure tipo column exists for manual emails
  await rawsql(`ALTER TABLE presupuesto_correos ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'presupuesto';`);

  const [countsData, recentData, credsResult] = await Promise.all([
    rawsql(`SELECT estado, COUNT(*) AS cnt FROM presupuesto_correos GROUP BY estado;`),
    rawsql(`
      SELECT
        id,
        resend_id,
        CASE WHEN presupuesto_id = 'manual' THEN NULL ELSE presupuesto_id END AS presupuesto_id,
        email_destinatario AS destinatario,
        asunto,
        estado,
        tipo,
        created_at AS enviado_at
      FROM presupuesto_correos
      ORDER BY created_at DESC NULLS LAST
      LIMIT 100;
    `),
    getResendCredentials(),
  ]);

  const totals = { enviado: 0, entregado: 0, abierto: 0, rebotado: 0, spam: 0 };
  for (const row of countsData?.data?.rows ?? []) {
    const estado = toStr(row.estado);
    const cnt = toNum(row.cnt);
    if (estado in totals) totals[estado as keyof typeof totals] = cnt;
  }

  const recent = (recentData?.data?.rows ?? []).map((r) => ({
    id: toStr(r.id),
    resend_id: r.resend_id != null ? toStr(r.resend_id) : null,
    presupuesto_id: r.presupuesto_id != null ? toStr(r.presupuesto_id) : null,
    destinatario: toStr(r.destinatario),
    asunto: toStr(r.asunto),
    estado: toStr(r.estado),
    tipo: toStr(r.tipo) || 'presupuesto',
    enviado_at: toStr(r.enviado_at),
  }));

  const key_configured = credsResult.ready;

  const totalSent = totals.enviado + totals.entregado + totals.abierto + totals.rebotado + totals.spam;
  const deliveryRate = pct(totals.entregado + totals.abierto, totalSent);
  const openRate = pct(totals.abierto, totals.entregado + totals.abierto);
  const bounceRate = pct(totals.rebotado, totalSent);

  return NextResponse.json({ ok: true, totals, recent, deliveryRate, openRate, bounceRate, key_configured, from_address: credsResult.from ?? null });
}
