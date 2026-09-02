import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getMcpAccessStatus } from '@/lib/mcp/access';
import { getMcpOAuthRuntimeConfig } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function publicEndpoint(request: NextRequest) {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  return `${configured || new URL(request.url).origin}/api/mcp`;
}

export async function POST(request: NextRequest) {
  const admin = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!admin.ok) return admin.response;

  let keyId = '';
  try {
    const body = await request.json() as { keyId?: unknown };
    keyId = typeof body.keyId === 'string' ? body.keyId.trim().toLowerCase() : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }

  const status = await getMcpAccessStatus(admin.ctx.tenantId);
  const connection = keyId
    ? status.connections.find((item) => item.keyId === keyId)
    : status.connections[0];

  if (!connection) {
    return NextResponse.json({
      ok: false,
      error: 'No encontramos una credencial MCP activa para probar.',
      checks: [
        { id: 'endpoint', label: 'Endpoint MCP', ok: true },
        { id: 'credential', label: 'Credencial activa', ok: false },
      ],
    }, { status: 404 });
  }

  const hasRead = connection.scopes.includes('products:read');
  const hasWrite = connection.scopes.some((scope) => ['products:write', 'products:publish', 'inventory:write'].includes(scope));
  const oauthReady = Boolean(getMcpOAuthRuntimeConfig());

  return NextResponse.json({
    ok: hasRead,
    endpoint: publicEndpoint(request),
    connection: {
      label: connection.label,
      keyId: connection.keyId,
      tokenPrefix: connection.tokenPrefix,
      scopes: connection.scopes,
    },
    oauthReady,
    checks: [
      { id: 'endpoint', label: 'Endpoint MCP disponible', ok: true, detail: publicEndpoint(request) },
      { id: 'credential', label: 'Credencial activa', ok: true, detail: connection.tokenPrefix },
      { id: 'tenant', label: 'Aislamiento de empresa', ok: true, detail: 'La credencial está registrada dentro de este tenant.' },
      { id: 'read', label: 'Lectura de catálogo', ok: hasRead, detail: hasRead ? 'products:read habilitado.' : 'Falta products:read.' },
      { id: 'writes', label: 'Escrituras controladas', ok: true, detail: hasWrite ? 'Permisos de escritura detectados; siguen sujetos a gobernanza y aprobaciones.' : 'Solo lectura: recomendado para la primera conexión.' },
    ],
  });
}
