import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
  evaluateIntelligenceAction,
  type AdminRole,
  type IntelligenceActionRequest,
} from '@/lib/fabrickIntelligencePolicy';
import { appendAudit, listProposals, saveProposal, type IntelligenceProposal } from '@/lib/fabrickIntelligenceStore';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';

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
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  try {
    const proposals = await listProposals(tenantId, 100);
    return NextResponse.json({ ok: true, proposals }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar propuestas.' }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });

  let body: { action?: IntelligenceActionRequest; context?: { currentPrice?: number | null; supplierPrice?: number | null } };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers: NO_STORE });
  }
  if (!body.action?.type || !body.action.payload || typeof body.action.payload !== 'object') {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400, headers: NO_STORE });
  }

  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  const role = (session.rol || 'viewer') as AdminRole;
  const decision = evaluateIntelligenceAction(role, body.action, {
    currentPrice: body.context?.currentPrice ?? null,
    supplierPrice: body.context?.supplierPrice ?? null,
    minMarginPercent: 25,
    priceChangeApprovalPercent: 10,
  });
  if (!decision.allowed) {
    return NextResponse.json({ ok: false, decision }, { status: 422, headers: NO_STORE });
  }

  const proposal: IntelligenceProposal = {
    id: crypto.randomUUID(),
    tenantId,
    actorEmail: session.email,
    actorRole: role,
    status: 'pending',
    action: { ...body.action, payload: decision.normalizedPayload },
    decision,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveProposal(proposal);
    await appendAudit({ tenantId, actorEmail: session.email, actorRole: role, proposalId: proposal.id, action: proposal.action.type, status: 'proposal_created', detail: { requiresApproval: decision.requiresApproval } });
    return NextResponse.json({ ok: true, proposal, executable: false, nextStep: 'Aprueba la propuesta para habilitar ejecución controlada.' }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo guardar la propuesta.' }, { status: 503, headers: NO_STORE });
  }
}
