import 'server-only';

import { createHash } from 'node:crypto';
import { insforgeAdmin } from '@/lib/insforge';
import type { McpAccess } from '@/lib/mcp/access';

export type McpGovernancePolicy = {
  enabled: boolean;
  requestLimit5m: number;
  writeLimit5m: number;
  approvalPublish: boolean;
  approvalInventory: boolean;
};

export type McpRateResult = {
  allowed: boolean;
  requestCount: number;
  writeCount: number;
  requestLimit: number;
  writeLimit: number;
  windowStart: string;
  windowSeconds: number;
  retryAfterSeconds: number;
};

const DEFAULT_POLICY: McpGovernancePolicy = {
  enabled: true,
  requestLimit5m: 240,
  writeLimit5m: 40,
  approvalPublish: true,
  approvalInventory: true,
};

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

export function mcpActionHash(toolName: string, payload: unknown) {
  return createHash('sha256')
    .update(`${toolName}:${JSON.stringify(stableValue(payload))}`, 'utf8')
    .digest('hex');
}

export async function getMcpGovernancePolicy(tenantId: string, keyId: string): Promise<McpGovernancePolicy> {
  if (!keyId) return DEFAULT_POLICY;
  const { data, error } = await insforgeAdmin.database.from('mcp_governance_policies')
    .select('enabled,request_limit_5m,write_limit_5m,approval_publish,approval_inventory')
    .eq('tenant_id', tenantId)
    .eq('key_id', keyId)
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]) return DEFAULT_POLICY;
  const row = data[0] as Record<string, unknown>;
  return {
    enabled: row.enabled !== false,
    requestLimit5m: clampInt(row.request_limit_5m, DEFAULT_POLICY.requestLimit5m, 10, 10000),
    writeLimit5m: clampInt(row.write_limit_5m, DEFAULT_POLICY.writeLimit5m, 1, 5000),
    approvalPublish: row.approval_publish !== false,
    approvalInventory: row.approval_inventory !== false,
  };
}

export async function claimMcpRateLimit(access: McpAccess, mode: 'request' | 'write' = 'request'): Promise<McpRateResult> {
  const policy = await getMcpGovernancePolicy(access.tenantId, access.keyId);
  if (!policy.enabled) throw new Error('MCP_CONNECTION_DISABLED');

  const { data, error } = await insforgeAdmin.database.rpc('mcp_claim_rate_limit', {
    p_tenant_id: access.tenantId,
    p_key_id: access.keyId,
    p_count_request: mode === 'request',
    p_is_write: mode === 'write',
    p_request_limit: policy.requestLimit5m,
    p_write_limit: policy.writeLimit5m,
    p_window_seconds: 300,
  });

  if (error) throw new Error(error.message || 'MCP_RATE_LIMIT_FAILED');
  const raw = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  const result: McpRateResult = {
    allowed: raw?.allowed !== false,
    requestCount: clampInt(raw?.requestCount, 0, 0, 1000000),
    writeCount: clampInt(raw?.writeCount, 0, 0, 1000000),
    requestLimit: clampInt(raw?.requestLimit, policy.requestLimit5m, 1, 10000),
    writeLimit: clampInt(raw?.writeLimit, policy.writeLimit5m, 1, 5000),
    windowStart: String(raw?.windowStart ?? ''),
    windowSeconds: clampInt(raw?.windowSeconds, 300, 60, 3600),
    retryAfterSeconds: clampInt(raw?.retryAfterSeconds, 60, 1, 3600),
  };
  if (!result.allowed) throw new Error(`MCP_RATE_LIMITED:${result.retryAfterSeconds}`);
  return result;
}

function compactResult(value: unknown) {
  if (value === null || value === undefined) return {};
  if (typeof value !== 'object') return { value: String(value).slice(0, 500) };
  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of ['ok', 'found', 'status', 'id', 'productId', 'approvalId', 'duplicate', 'count']) {
    if (record[key] !== undefined) output[key] = record[key];
  }
  return output;
}

export async function auditMcpAction(input: {
  access: McpAccess;
  toolName: string;
  phase: 'read' | 'preview' | 'commit' | 'approval' | 'request';
  outcome: 'ok' | 'error' | 'denied' | 'pending';
  payload?: unknown;
  result?: unknown;
  requestId?: string | null;
}) {
  try {
    await insforgeAdmin.database.from('mcp_audit_logs').insert([{
      tenant_id: input.access.tenantId,
      key_id: input.access.keyId,
      client_label: input.access.label,
      tool_name: input.toolName,
      phase: input.phase,
      outcome: input.outcome,
      request_id: input.requestId || null,
      payload: stableValue(input.payload ?? {}),
      result_summary: compactResult(input.result),
      created_at: new Date().toISOString(),
    }]);
  } catch {
    // Audit is best-effort and must not make a valid business operation fail.
  }
}

export async function requestMcpApproval(input: {
  access: McpAccess;
  toolName: string;
  payload: unknown;
  summary: string;
  ttlMinutes?: number;
}) {
  const actionHash = mcpActionHash(input.toolName, input.payload);
  const { data } = await insforgeAdmin.database.from('mcp_approvals')
    .select('id,status,expires_at,requested_at')
    .eq('tenant_id', input.access.tenantId)
    .eq('key_id', input.access.keyId)
    .eq('tool_name', input.toolName)
    .eq('action_hash', actionHash)
    .order('requested_at', { ascending: false })
    .limit(8);

  if (Array.isArray(data)) {
    const reusable = (data as Record<string, unknown>[]).find((row) => {
      const status = String(row.status ?? '');
      if (status !== 'pending' && status !== 'approved') return false;
      return new Date(String(row.expires_at ?? '')).getTime() > Date.now();
    });
    if (reusable) {
      return {
        id: String(reusable.id),
        status: String(reusable.status),
        expiresAt: String(reusable.expires_at),
        reused: true,
      };
    }
  }

  const ttlMinutes = clampInt(input.ttlMinutes, 30, 5, 240);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const { data: inserted, error } = await insforgeAdmin.database.from('mcp_approvals').insert([{
    tenant_id: input.access.tenantId,
    key_id: input.access.keyId,
    client_label: input.access.label,
    tool_name: input.toolName,
    action_hash: actionHash,
    summary: input.summary.slice(0, 800),
    payload: stableValue(input.payload),
    status: 'pending',
    requested_at: nowIso,
    expires_at: expiresAt,
  }]).select('id,status,expires_at');

  if (error || !Array.isArray(inserted) || !inserted[0]) throw new Error(error?.message || 'MCP_APPROVAL_CREATE_FAILED');
  const row = inserted[0] as Record<string, unknown>;
  await auditMcpAction({ access: input.access, toolName: input.toolName, phase: 'approval', outcome: 'pending', payload: input.payload, result: { approvalId: row.id } });
  return { id: String(row.id), status: String(row.status), expiresAt: String(row.expires_at), reused: false };
}

export async function consumeMcpApproval(input: {
  access: McpAccess;
  toolName: string;
  payload: unknown;
  approvalId?: string | null;
}) {
  const approvalId = String(input.approvalId ?? '').trim();
  if (!approvalId) throw new Error('MCP_APPROVAL_REQUIRED');
  const actionHash = mcpActionHash(input.toolName, input.payload);
  const nowIso = new Date().toISOString();

  const { data, error } = await insforgeAdmin.database.from('mcp_approvals')
    .select('id,status,action_hash,expires_at')
    .eq('id', approvalId)
    .eq('tenant_id', input.access.tenantId)
    .eq('key_id', input.access.keyId)
    .eq('tool_name', input.toolName)
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]) throw new Error('MCP_APPROVAL_NOT_FOUND');
  const row = data[0] as Record<string, unknown>;
  if (String(row.action_hash) !== actionHash) throw new Error('MCP_APPROVAL_PAYLOAD_MISMATCH');
  if (String(row.status) !== 'approved') throw new Error(`MCP_APPROVAL_${String(row.status || 'INVALID').toUpperCase()}`);
  if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
    await insforgeAdmin.database.from('mcp_approvals').update({ status: 'expired' }).eq('id', approvalId).eq('status', 'approved');
    throw new Error('MCP_APPROVAL_EXPIRED');
  }

  const { data: consumed, error: consumeError } = await insforgeAdmin.database.from('mcp_approvals')
    .update({ status: 'consumed', consumed_at: nowIso })
    .eq('id', approvalId)
    .eq('tenant_id', input.access.tenantId)
    .eq('key_id', input.access.keyId)
    .eq('status', 'approved')
    .select('id');

  if (consumeError || !Array.isArray(consumed) || !consumed[0]) throw new Error('MCP_APPROVAL_ALREADY_USED');
  await auditMcpAction({ access: input.access, toolName: input.toolName, phase: 'approval', outcome: 'ok', payload: input.payload, result: { approvalId } });
  return approvalId;
}

export async function policyRequiresApproval(access: McpAccess, kind: 'publish' | 'inventory') {
  const policy = await getMcpGovernancePolicy(access.tenantId, access.keyId);
  return kind === 'publish' ? policy.approvalPublish : policy.approvalInventory;
}
