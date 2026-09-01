import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import {
  createMcpAccessToken,
  getMcpAccessStatus,
  normalizeMcpScopes,
  revokeMcpAccess,
} from '@/lib/mcp/access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function publicBase(request: NextRequest) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  return configured || new URL(request.url).origin;
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const status = await getMcpAccessStatus(auth.ctx.tenantId);
  const base = publicBase(request);
  return NextResponse.json({
    ok: true,
    ...status,
    endpoint: `${base}/api/mcp`,
    secretEndpointTemplate: `${base}/api/mcp/{TOKEN}`,
    supportedAuth: ['bearer', 'x-fabrick-mcp-key', 'secret-path'],
    availableScopes: [
      { id: 'products:read', label: 'Leer, supervisar y buscar mercado' },
      { id: 'products:write', label: 'Crear y editar borradores' },
      { id: 'products:publish', label: 'Activar o desactivar productos' },
      { id: 'inventory:write', label: 'Mover stock' },
    ],
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;

  let label = 'Principal';
  let scopes: unknown = ['products:read'];
  try {
    const body = await request.json() as { label?: string; scopes?: unknown };
    if (typeof body.label === 'string') label = body.label;
    if (body.scopes !== undefined) scopes = body.scopes;
  } catch {
    /* optional body */
  }

  try {
    const created = await createMcpAccessToken(auth.ctx.tenantId, label, normalizeMcpScopes(scopes));
    const base = publicBase(request);
    return NextResponse.json({
      ok: true,
      ...created,
      endpoint: `${base}/api/mcp`,
      secretEndpoint: `${base}/api/mcp/${created.token}`,
      warning: 'Copia el token ahora. No se vuelve a almacenar en texto plano.',
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo generar el acceso MCP.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'delete' });
  if (!auth.ok) return auth.response;
  const keyId = new URL(request.url).searchParams.get('keyId') || undefined;
  try {
    await revokeMcpAccess(auth.ctx.tenantId, keyId);
    return NextResponse.json({ ok: true, revoked: keyId || 'all' });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo revocar el acceso MCP.' }, { status: 500 });
  }
}
