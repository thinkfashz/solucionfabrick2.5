import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { generateLandingWithAi } from '@/modules/prospecting-engine/services/ai-generation.server';
import type { LandingGenerationRequest } from '@/modules/prospecting-engine/types/page.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null) as LandingGenerationRequest | null;
  if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });

  try {
    const result = await generateLandingWithAi(body, request);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo generar la landing con IA.' }, { status: 400 });
  }
}
