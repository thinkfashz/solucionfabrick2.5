import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
  evaluateIntelligenceAction,
  getIntelligenceRolePermissions,
  type AdminRole,
  type IntelligenceActionRequest,
} from '@/lib/fabrickIntelligencePolicy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

async function getSession(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie).catch(() => null);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  const role = (session.rol || 'viewer') as AdminRole;

  return NextResponse.json({
    ok: true,
    mode: 'proposal-first',
    role,
    tenantId: session.tenant_id || null,
    permissions: getIntelligenceRolePermissions(role),
    safeguards: {
      secretsBlocked: true,
      paymentCredentialsBlocked: true,
      tenantIsolationRequired: true,
      destructiveActionsBlocked: true,
      productPublishRequiresApproval: true,
      priceChangeThresholdPercent: 10,
      minimumMarginPercent: 25,
    },
  }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });

  let body: { action?: IntelligenceActionRequest; context?: { currentPrice?: number | null; supplierPrice?: number | null } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers: NO_STORE });
  }

  if (!body?.action?.type || !body.action.payload || typeof body.action.payload !== 'object') {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400, headers: NO_STORE });
  }

  const role = (session.rol || 'viewer') as AdminRole;
  const decision = evaluateIntelligenceAction(role, body.action, {
    currentPrice: body.context?.currentPrice ?? null,
    supplierPrice: body.context?.supplierPrice ?? null,
    minMarginPercent: 25,
    priceChangeApprovalPercent: 10,
  });

  return NextResponse.json({
    ok: decision.allowed,
    mode: 'preview',
    executable: false,
    tenantId: session.tenant_id || null,
    action: body.action.type,
    resourceId: body.action.resourceId || null,
    decision,
    nextStep: decision.allowed
      ? (decision.requiresApproval ? 'Solicitar aprobación explícita antes de ejecutar.' : 'La acción puede pasar a ejecución controlada en una fase posterior.')
      : 'Corrige los bloqueos antes de generar una propuesta.',
  }, { status: decision.allowed ? 200 : 422, headers: NO_STORE });
}
