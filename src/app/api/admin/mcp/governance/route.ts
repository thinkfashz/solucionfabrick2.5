import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { insforgeAdmin } from '@/lib/insforge';
import { getMcpAccessStatus } from '@/lib/mcp/access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_POLICY = {
  enabled: true,
  request_limit_5m: 240,
  write_limit_5m: 40,
  approval_publish: true,
  approval_inventory: true,
};

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function cleanKeyId(value: unknown) {
  const keyId = String(value ?? '').trim().toLowerCase();
  if (keyId === 'legacy') return keyId;
  return /^[a-f0-9]{16}$/.test(keyId) ? keyId : '';
}

function cleanUuid(value: unknown) {
  const id = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

async function expireOldApprovals(tenantId: string) {
  const now = new Date().toISOString();
  try {
    await Promise.all([
      insforgeAdmin.database.from('mcp_approvals')
        .update({ status: 'expired' })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .lt('expires_at', now),
      insforgeAdmin.database.from('mcp_approvals')
        .update({ status: 'expired' })
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .lt('expires_at', now),
    ]);
  } catch {
    // Best-effort cleanup; GET can still continue.
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const tenantId = auth.ctx.tenantId;
  await expireOldApprovals(tenantId);

  const [accessStatus, policyResult, approvalResult, auditResult, rateResult] = await Promise.all([
    getMcpAccessStatus(tenantId),
    insforgeAdmin.database.from('mcp_governance_policies')
      .select('key_id,enabled,request_limit_5m,write_limit_5m,approval_publish,approval_inventory,updated_at')
      .eq('tenant_id', tenantId),
    insforgeAdmin.database.from('mcp_approvals')
      .select('id,key_id,client_label,tool_name,summary,payload,status,requested_at,expires_at,decided_at,decided_by,decision_note,consumed_at')
      .eq('tenant_id', tenantId)
      .order('requested_at', { ascending: false })
      .limit(100),
    insforgeAdmin.database.from('mcp_audit_logs')
      .select('id,key_id,client_label,tool_name,phase,outcome,request_id,result_summary,created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200),
    insforgeAdmin.database.from('mcp_rate_windows')
      .select('key_id,window_start,request_count,write_count,updated_at')
      .eq('tenant_id', tenantId)
      .order('window_start', { ascending: false })
      .limit(100),
  ]);

  const policies = new Map<string, Record<string, unknown>>();
  if (Array.isArray(policyResult.data)) {
    for (const row of policyResult.data as Record<string, unknown>[]) policies.set(String(row.key_id), row);
  }
  const recentRates = new Map<string, Record<string, unknown>>();
  if (Array.isArray(rateResult.data)) {
    for (const row of rateResult.data as Record<string, unknown>[]) {
      const keyId = String(row.key_id);
      if (!recentRates.has(keyId)) recentRates.set(keyId, row);
    }
  }

  const connections = accessStatus.connections.map((connection) => {
    const keyId = connection.legacy ? 'legacy' : connection.keyId;
    const policy = policies.get(keyId) ?? DEFAULT_POLICY;
    const rate = recentRates.get(keyId) ?? null;
    return {
      ...connection,
      keyId,
      policy: {
        enabled: policy.enabled !== false,
        requestLimit5m: boundedInt(policy.request_limit_5m, 240, 10, 10000),
        writeLimit5m: boundedInt(policy.write_limit_5m, 40, 1, 5000),
        approvalPublish: policy.approval_publish !== false,
        approvalInventory: policy.approval_inventory !== false,
      },
      usage: rate ? {
        windowStart: String(rate.window_start ?? ''),
        requestCount: boundedInt(rate.request_count, 0, 0, 1000000),
        writeCount: boundedInt(rate.write_count, 0, 0, 1000000),
      } : null,
    };
  });

  const approvals = Array.isArray(approvalResult.data) ? approvalResult.data : [];
  const audit = Array.isArray(auditResult.data) ? auditResult.data : [];
  const pending = approvals.filter((row) => (row as Record<string, unknown>).status === 'pending').length;
  const approved = approvals.filter((row) => (row as Record<string, unknown>).status === 'approved').length;

  return NextResponse.json({
    ok: true,
    connections,
    approvals,
    audit,
    summary: {
      connections: connections.length,
      pendingApprovals: pending,
      approvedWaitingUse: approved,
      auditedEvents: audit.length,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  const tenantId = auth.ctx.tenantId;
  const actor = auth.ctx.session.email;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const action = String(body.action ?? '').trim();
  if (action === 'approve' || action === 'reject') {
    const approvalId = cleanUuid(body.approvalId);
    if (!approvalId) return NextResponse.json({ error: 'approvalId inválido.' }, { status: 400 });
    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const note = String(body.note ?? '').trim().slice(0, 500) || null;
    const { data, error } = await insforgeAdmin.database.from('mcp_approvals')
      .update({
        status: nextStatus,
        decided_at: new Date().toISOString(),
        decided_by: actor,
        decision_note: note,
      })
      .eq('tenant_id', tenantId)
      .eq('id', approvalId)
      .eq('status', 'pending')
      .select('id,status,key_id,tool_name,summary,expires_at');

    if (error) return NextResponse.json({ error: error.message || 'No se pudo decidir la aprobación.' }, { status: 500 });
    if (!Array.isArray(data) || !data[0]) {
      return NextResponse.json({ error: 'La solicitud ya fue decidida, expiró o no existe.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, approval: data[0] });
  }

  if (action === 'update_policy') {
    const keyId = cleanKeyId(body.keyId);
    if (!keyId) return NextResponse.json({ error: 'keyId inválido.' }, { status: 400 });
    const policy = {
      enabled: body.enabled !== false,
      request_limit_5m: boundedInt(body.requestLimit5m, 240, 10, 10000),
      write_limit_5m: boundedInt(body.writeLimit5m, 40, 1, 5000),
      approval_publish: body.approvalPublish !== false,
      approval_inventory: body.approvalInventory !== false,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await insforgeAdmin.database.from('mcp_governance_policies')
      .update(policy)
      .eq('tenant_id', tenantId)
      .eq('key_id', keyId)
      .select('key_id');
    if (updateError) return NextResponse.json({ error: updateError.message || 'No se pudo actualizar la política.' }, { status: 500 });

    if (!Array.isArray(updated) || !updated[0]) {
      const { error: insertError } = await insforgeAdmin.database.from('mcp_governance_policies').insert([{
        tenant_id: tenantId,
        key_id: keyId,
        ...policy,
      }]);
      if (insertError) return NextResponse.json({ error: insertError.message || 'No se pudo crear la política.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, keyId, policy });
  }

  return NextResponse.json({ error: 'Acción MCP de gobernanza no soportada.' }, { status: 400 });
}
