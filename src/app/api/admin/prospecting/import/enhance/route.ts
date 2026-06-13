import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { enhanceImportedProspectsWithAi } from '@/modules/prospecting-engine/services/hybrid-import-enhance.server';
import type { AiEnhanceImportRequest } from '@/modules/prospecting-engine/types/import.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null) as AiEnhanceImportRequest | null;
  if (!body || !Array.isArray(body.localProspects)) return NextResponse.json({ error: 'Cuerpo inválido. Falta localProspects.' }, { status: 400 });

  try {
    const result = await enhanceImportedProspectsWithAi(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo mejorar la importación con IA.' }, { status: 400 });
  }
}
