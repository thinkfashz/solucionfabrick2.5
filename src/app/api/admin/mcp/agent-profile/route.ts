import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { AGENT_ALLOWED_SCOPES, getHarnessAgentProfile, setHarnessAgentProfile } from '@/lib/mcp/agentProfile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const profile = await getHarnessAgentProfile(auth.ctx.tenantId);
  return NextResponse.json({ profile, allowedScopes: AGENT_ALLOWED_SCOPES }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400, headers: NO_STORE });
  }

  try {
    const profile = await setHarnessAgentProfile(auth.ctx.tenantId, {
      enabled: body.enabled,
      scopes: body.scopes,
      maxSteps: body.maxSteps,
      allowScheduledWrites: body.allowScheduledWrites,
    });
    return NextResponse.json({ ok: true, profile, allowedScopes: AGENT_ALLOWED_SCOPES }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo guardar el perfil del agente.',
    }, { status: 500, headers: NO_STORE });
  }
}
