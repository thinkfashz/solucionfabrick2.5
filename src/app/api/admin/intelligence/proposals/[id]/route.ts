import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { evaluateIntelligenceAction, type AdminRole } from '@/lib/fabrickIntelligencePolicy';
import { appendAudit, getProposal, saveProposalRevision, type IntelligenceProposal } from '@/lib/fabrickIntelligenceStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

async function getSession(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decodeSession(cookie).catch(() => null);
}

function productPayload(payload: Record<string, unknown>) {
  const allowed = ['name', 'description', 'price', 'stock', 'image_url', 'specifications', 'featured', 'category_id', 'delivery_days', 'discount_percentage'];
  const out: Record<string, unknown> = {};
  for (const key of allowed) if (key in payload) out[key] = payload[key];
  if ('supplierPrice' in payload) out.supplier_price = payload.supplierPrice;
  return out;
}

async function loadProduct(tenantId: string, id: string) {
  const { data, error } = await insforgeAdmin.database
    .from('products')
    .select('id,price,supplier_price,activo')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data || [])[0] as { id: string; price?: number | string | null; supplier_price?: number | string | null; activo?: boolean | null } | undefined;
}

async function executeProposal(proposal: IntelligenceProposal, tenantId: string) {
  const action = proposal.action;
  if (action.type === 'product.create') {
    const row = { ...productPayload(action.payload), tenant_id: tenantId, activo: false };
    const { data, error } = await insforgeAdmin.database.from('products').insert([row]).select('id,name,price,stock,activo').limit(1);
    if (error) throw new Error(error.message);
    return { resource: 'product', created: true, product: data?.[0] || null };
  }

  if (!action.resourceId) throw new Error('La propuesta no tiene resourceId.');
  const product = await loadProduct(tenantId, action.resourceId);
  if (!product && ['product.update', 'product.publish', 'stock.update', 'price.propose', 'seo.update'].includes(action.type)) {
    throw new Error('Producto no encontrado dentro del tenant activo.');
  }

  if (action.type === 'product.update') {
    const changes = productPayload(action.payload);
    delete changes.stock;
    const { data, error } = await insforgeAdmin.database.from('products').update(changes).eq('tenant_id', tenantId).eq('id', action.resourceId).select('id,name,price,stock,activo').limit(1);
    if (error) throw new Error(error.message);
    return { resource: 'product', updated: true, product: data?.[0] || null };
  }
  if (action.type === 'product.publish') {
    const { data, error } = await insforgeAdmin.database.from('products').update({ activo: true }).eq('tenant_id', tenantId).eq('id', action.resourceId).select('id,name,activo').limit(1);
    if (error) throw new Error(error.message);
    return { resource: 'product', published: true, product: data?.[0] || null };
  }
  if (action.type === 'stock.update') {
    const stock = Math.max(0, Math.floor(Number(action.payload.stock) || 0));
    const { data, error } = await insforgeAdmin.database.from('products').update({ stock }).eq('tenant_id', tenantId).eq('id', action.resourceId).select('id,name,stock').limit(1);
    if (error) throw new Error(error.message);
    return { resource: 'product', stockUpdated: true, product: data?.[0] || null };
  }
  if (action.type === 'price.propose') {
    const price = Math.max(0, Math.round(Number(action.payload.price) || 0));
    const { data, error } = await insforgeAdmin.database.from('products').update({ price }).eq('tenant_id', tenantId).eq('id', action.resourceId).select('id,name,price').limit(1);
    if (error) throw new Error(error.message);
    return { resource: 'product', priceUpdated: true, product: data?.[0] || null };
  }

  throw new Error(`La ejecución de ${action.type} todavía no está habilitada. Solo puede permanecer como propuesta auditada.`);
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  const { id } = await context.params;
  try {
    const proposal = await getProposal(tenantId, id);
    if (!proposal) return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ ok: true, proposal }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo leer la propuesta.' }, { status: 503, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: NO_STORE });
  const tenantId = session.tenant_id || DEFAULT_TENANT_ID;
  const role = (session.rol || 'viewer') as AdminRole;
  if (role === 'viewer') return NextResponse.json({ error: 'El rol viewer no puede aprobar ni ejecutar propuestas.' }, { status: 403, headers: NO_STORE });

  let body: { operation?: 'approve' | 'reject' | 'execute' };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400, headers: NO_STORE }); }
  if (!body.operation) return NextResponse.json({ error: 'operation es requerida' }, { status: 400, headers: NO_STORE });

  const { id } = await context.params;
  try {
    const proposal = await getProposal(tenantId, id);
    if (!proposal) return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404, headers: NO_STORE });

    if (body.operation === 'reject') {
      if (proposal.status === 'executed') return NextResponse.json({ error: 'Una propuesta ejecutada no puede rechazarse.' }, { status: 409, headers: NO_STORE });
      const next = { ...proposal, status: 'rejected' as const, approvedBy: session.email };
      await saveProposalRevision(next);
      await appendAudit({ tenantId, actorEmail: session.email, actorRole: role, proposalId: id, action: proposal.action.type, status: 'rejected' });
      return NextResponse.json({ ok: true, proposal: next }, { headers: NO_STORE });
    }

    if (body.operation === 'approve') {
      if (proposal.status !== 'pending') return NextResponse.json({ error: `No se puede aprobar una propuesta ${proposal.status}.` }, { status: 409, headers: NO_STORE });
      const next = { ...proposal, status: 'approved' as const, approvedAt: new Date().toISOString(), approvedBy: session.email };
      await saveProposalRevision(next);
      await appendAudit({ tenantId, actorEmail: session.email, actorRole: role, proposalId: id, action: proposal.action.type, status: 'approved' });
      return NextResponse.json({ ok: true, proposal: next, nextStep: 'La propuesta ya puede ejecutarse de forma controlada.' }, { headers: NO_STORE });
    }

    if (proposal.status !== 'approved') return NextResponse.json({ error: 'La propuesta debe estar aprobada antes de ejecutarse.' }, { status: 409, headers: NO_STORE });

    let currentPrice: number | null = null;
    let supplierPrice: number | null = null;
    if (proposal.action.resourceId && ['product.update', 'product.publish', 'stock.update', 'price.propose', 'seo.update'].includes(proposal.action.type)) {
      const current = await loadProduct(tenantId, proposal.action.resourceId);
      currentPrice = current?.price == null ? null : Number(current.price);
      supplierPrice = current?.supplier_price == null ? null : Number(current.supplier_price);
    }
    const freshDecision = evaluateIntelligenceAction(role, proposal.action, { currentPrice, supplierPrice, minMarginPercent: 25, priceChangeApprovalPercent: 10 });
    if (!freshDecision.allowed) return NextResponse.json({ ok: false, error: 'La política actual bloquea la ejecución.', decision: freshDecision }, { status: 422, headers: NO_STORE });

    try {
      const result = await executeProposal(proposal, tenantId);
      const next = { ...proposal, status: 'executed' as const, executedAt: new Date().toISOString(), result };
      await saveProposalRevision(next);
      await appendAudit({ tenantId, actorEmail: session.email, actorRole: role, proposalId: id, action: proposal.action.type, status: 'executed', detail: result });
      return NextResponse.json({ ok: true, proposal: next, result }, { headers: NO_STORE });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ejecución fallida';
      const next = { ...proposal, status: 'failed' as const, result: { error: message } };
      await saveProposalRevision(next).catch(() => undefined);
      await appendAudit({ tenantId, actorEmail: session.email, actorRole: role, proposalId: id, action: proposal.action.type, status: 'failed', detail: { error: message } }).catch(() => undefined);
      return NextResponse.json({ error: message, proposal: next }, { status: 500, headers: NO_STORE });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar la propuesta.' }, { status: 503, headers: NO_STORE });
  }
}
