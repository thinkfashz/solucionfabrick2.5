import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { isAiProviderId } from '@/modules/prospecting-engine/config/providers';
import {
  deleteAiIntegration,
  listAiIntegrations,
  saveAiIntegration,
} from '@/modules/prospecting-engine/services/ai-integration.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireWritableAdmin(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return { error: NextResponse.json({ error: 'No autenticado.' }, { status: 401 }) };
  if (session.rol === 'viewer') return { error: NextResponse.json({ error: 'Modo demo: solo lectura.' }, { status: 403 }) };
  return { session };
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  try {
    const integrations = await listAiIntegrations();
    return NextResponse.json({ ok: true, integrations });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron cargar las integraciones IA.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireWritableAdmin(request);
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => null) as { provider?: string; credentials?: unknown } | null;
  const provider = String(body?.provider || '').trim();
  if (!isAiProviderId(provider)) return NextResponse.json({ error: 'Proveedor IA no permitido.' }, { status: 400 });

  try {
    const integration = await saveAiIntegration(provider, body?.credentials || {});
    return NextResponse.json({ ok: true, integration });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo guardar la integración IA.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireWritableAdmin(request);
  if ('error' in auth) return auth.error;

  const provider = request.nextUrl.searchParams.get('provider') || '';
  if (!isAiProviderId(provider)) return NextResponse.json({ error: 'Proveedor IA no permitido.' }, { status: 400 });

  try {
    await deleteAiIntegration(provider);
    return NextResponse.json({ ok: true, deleted: provider });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo eliminar la integración IA.' }, { status: 500 });
  }
}
