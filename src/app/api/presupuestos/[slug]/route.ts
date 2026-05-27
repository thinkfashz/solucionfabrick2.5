import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@insforge/sdk';
import { normalizeBudget } from '@/lib/presupuestosBuilder';

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
    const { data, error } = await client.database
      .from('presupuestos')
      .select('*')
      .eq('slug', slug)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code || 'DB_ERROR' }, { status: 404 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return NextResponse.json({ error: 'Presupuesto no encontrado.' }, { status: 404 });

    return NextResponse.json({ presupuesto: normalizeBudget(row) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'No se pudo leer el presupuesto.' }, { status: 500 });
  }
}
