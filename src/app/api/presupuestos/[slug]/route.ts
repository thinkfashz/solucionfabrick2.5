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

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slug) return NextResponse.json({ error: 'Falta slug.' }, { status: 400 });

  try {
    const client = getPublicInsforge();

    // 1. Try the legacy simple presupuestos table first
    const { data, error } = await client.database
      .from('presupuestos')
      .select('*')
      .eq('slug', slug)
      .limit(1);

    const row = !error && (Array.isArray(data) ? data[0] : data);
    if (row) return NextResponse.json({ presupuesto: normalizeBudget(row as Partial<PresupuestoPro>) });

    // 2. Fall back to presupuesto_registros (where the admin builder saves full data)
    const { data: regData } = await client.database
      .from('presupuesto_registros')
      .select('presupuesto_json')
      .eq('slug', slug)
      .order('generated_at', { ascending: false })
      .limit(1);

    const regRow = Array.isArray(regData) ? regData[0] : regData;
    if (regRow?.presupuesto_json) {
      return NextResponse.json({ presupuesto: normalizeBudget(regRow.presupuesto_json as Partial<PresupuestoPro>) });
    }

    return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'No se pudo leer el presupuesto.' }, { status: 500 });
  }
}
