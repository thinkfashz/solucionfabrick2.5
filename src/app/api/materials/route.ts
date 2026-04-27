import { NextResponse } from 'next/server';
import { getActiveMaterials } from '@/lib/budget';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/materials — public catalog feed for the Cotizador.
 * Returns only `active=true` rows; never throws (degrades to []).
 */
export async function GET() {
  try {
    const materials = await getActiveMaterials();
    return NextResponse.json(
      { materials },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json(
      { error: message, code: 'MATERIALS_LIST_FAILED', materials: [] },
      { status: 500 },
    );
  }
}
