export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';

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

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  return v == null ? '' : String(v);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const [seriesData, clientsData] = await Promise.all([
    rawsql(`
      SELECT
        DATE_TRUNC('day', created_at)::date AS dia,
        estado,
        COUNT(*) AS cnt
      FROM presupuesto_correos
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY dia, estado
      ORDER BY dia ASC;
    `),
    rawsql(`
      SELECT
        email_destinatario AS destinatario,
        COUNT(*) AS total,
        SUM(CASE WHEN estado IN ('entregado','abierto') THEN 1 ELSE 0 END) AS entregados,
        SUM(CASE WHEN estado = 'abierto' THEN 1 ELSE 0 END) AS abiertos,
        MAX(created_at) AS ultimo_correo
      FROM presupuesto_correos
      WHERE email_destinatario IS NOT NULL AND email_destinatario <> ''
      GROUP BY email_destinatario
      ORDER BY total DESC
      LIMIT 20;
    `),
  ]);

  type DayMap = Record<string, { enviado: number; entregado: number; abierto: number; rebotado: number }>;
  const dayMap: DayMap = {};

  for (const row of seriesData?.data?.rows ?? []) {
    const dia = toStr(row.dia).split('T')[0];
    if (!dia) continue;
    if (!dayMap[dia]) dayMap[dia] = { enviado: 0, entregado: 0, abierto: 0, rebotado: 0 };
    const cnt = toNum(row.cnt);
    const estado = toStr(row.estado);
    if (estado === 'enviado') dayMap[dia].enviado += cnt;
    else if (estado === 'entregado') dayMap[dia].entregado += cnt;
    else if (estado === 'abierto') dayMap[dia].abierto += cnt;
    else if (estado === 'rebotado') dayMap[dia].rebotado += cnt;
    else dayMap[dia].enviado += cnt;
  }

  const dailySeries = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, counts]) => ({ dia, ...counts }));

  const topClients = (clientsData?.data?.rows ?? []).map((r) => ({
    destinatario: toStr(r.destinatario),
    total: toNum(r.total),
    entregados: toNum(r.entregados),
    abiertos: toNum(r.abiertos),
    ultimo_correo: toStr(r.ultimo_correo),
  }));

  return NextResponse.json({ ok: true, dailySeries, topClients });
}
