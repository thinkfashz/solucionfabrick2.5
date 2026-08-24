import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { isAiProviderId } from '@/modules/prospecting-engine/config/providers';
import {
  deleteAiIntegration,
  listAiIntegrations,
  saveAiIntegration,
} from '@/modules/prospecting-engine/services/ai-integration.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  try {
    const integrations = await listAiIntegrations();
    return NextResponse.json({ ok: true, integrations });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudieron cargar las integraciones IA.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'manage' });
  if (!auth.ok) return auth.response;

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
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'manage' });
  if (!auth.ok) return auth.response;

  const provider = request.nextUrl.searchParams.get('provider') || '';
  if (!isAiProviderId(provider)) return NextResponse.json({ error: 'Proveedor IA no permitido.' }, { status: 400 });

  try {
    await deleteAiIntegration(provider);
    return NextResponse.json({ ok: true, deleted: provider });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'No se pudo eliminar la integración IA.' }, { status: 500 });
  }
}
