import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { improveHtmlSection } from '@/modules/prospecting-engine/services/section-improvement.server';
import type { SectionImproveRequest } from '@/modules/prospecting-engine/types/section.types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  if (session.rol === 'viewer') return NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 });

  const body = await request.json().catch(() => null) as SectionImproveRequest | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });

  try {
    const result = await improveHtmlSection(body);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'No se pudo mejorar la sección con IA.' }, { status: 400 });
  }
}
