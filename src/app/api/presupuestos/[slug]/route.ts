import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { normalizeBudget, type PresupuestoPro } from '@/lib/presupuestosBuilder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getPublicInsforge() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_API_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';
  return createClient({ baseUrl, anonKey });
}

function readExpiry(raw: Record<string, unknown>): string | null {
  const json = raw.json_presentacion as Record<string, unknown> | undefined;
  const meta = raw.meta as Record<string, unknown> | undefined;
  return String(raw.fecha_vencimiento || raw.expires_at || raw.expira_at || json?.expires_at || meta?.expires_at || '') || null;
}

function isExpired(raw: Record<string, unknown>) {
  const expiry = readExpiry(raw);
  if (!expiry) return false;
  const time = new Date(expiry).getTime();
  return Number.isFinite(time) && Date.now() > time;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug) return NextResponse.json({ error: 'Falta slug.' }, { status: 400 });

  try {
    const client = getPublicInsforge();

    const { data, error } = await client.database
      .from('presupuestos')
      .select('*')
      .eq('slug', slug)
      .limit(1);

    const row = !error && (Array.isArray(data) ? data[0] : data);
    if (row) {
      const raw = row as Record<string, unknown>;
      if (isExpired(raw)) return NextResponse.json({ error: 'Presupuesto expirado.', expired: true }, { status: 410 });
      return NextResponse.json({ presupuesto: normalizeBudget(raw as Partial<PresupuestoPro>) });
    }

    const { data: regData } = await client.database
      .from('presupuesto_registros')
      .select('presupuesto_json, meta')
      .eq('slug', slug)
      .order('generated_at', { ascending: false })
      .limit(1);

    const regRow = Array.isArray(regData) ? regData[0] : regData;
    if (regRow?.presupuesto_json) {
      const rawBudget = regRow.presupuesto_json as Record<string, unknown>;
      const merged = { ...rawBudget, meta: regRow.meta };
      if (isExpired(merged)) return NextResponse.json({ error: 'Presupuesto expirado.', expired: true }, { status: 410 });
      return NextResponse.json({ presupuesto: normalizeBudget(rawBudget as Partial<PresupuestoPro>) });
    }

    return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'No se pudo leer el presupuesto.' }, { status: 500 });
  }
}
