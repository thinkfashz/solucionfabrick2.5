import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import type { McpAccess } from '@/lib/mcp/access';

export const OLLAMA_AGENT_KEY_ID = 'ollama-harness';
export const OLLAMA_AGENT_LABEL = 'AI Harness · Ollama';
export const AGENT_ALLOWED_SCOPES = [
  'products:read',
  'products:write',
  'products:publish',
  'inventory:write',
  'analytics:read',
] as const;

export type AgentScope = typeof AGENT_ALLOWED_SCOPES[number];

export type HarnessAgentProfile = {
  tenantId: string;
  provider: 'ollama';
  enabled: boolean;
  scopes: AgentScope[];
  maxSteps: number;
  allowScheduledWrites: boolean;
  updatedAt: string | null;
};

const DEFAULT_SCOPES: AgentScope[] = ['products:read', 'analytics:read'];

function normalizeMaxSteps(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  return Math.max(1, Math.min(12, Math.round(parsed)));
}

export function normalizeAgentScopes(value: unknown): AgentScope[] {
  const requested = Array.isArray(value) ? value.map(String) : [];
  const allowed = new Set<string>(AGENT_ALLOWED_SCOPES);
  const scopes = [...new Set(requested.map((item) => item.trim()).filter((item): item is AgentScope => allowed.has(item)))];

  if (scopes.includes('products:publish') && !scopes.includes('products:write')) scopes.push('products:write');
  return scopes.length ? scopes : [...DEFAULT_SCOPES];
}

function rowToProfile(tenantId: string, row?: Record<string, unknown> | null): HarnessAgentProfile {
  return {
    tenantId,
    provider: 'ollama',
    enabled: row?.enabled !== false,
    scopes: normalizeAgentScopes(row?.scopes ?? DEFAULT_SCOPES),
    maxSteps: normalizeMaxSteps(row?.max_steps),
    allowScheduledWrites: row?.allow_scheduled_writes === true,
    updatedAt: row?.updated_at ? String(row.updated_at) : null,
  };
}

export async function getHarnessAgentProfile(tenantId: string): Promise<HarnessAgentProfile> {
  const { data, error } = await insforgeAdmin.database.from('mcp_agent_profiles')
    .select('provider,enabled,scopes,max_steps,allow_scheduled_writes,updated_at')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]) return rowToProfile(tenantId, null);
  return rowToProfile(tenantId, data[0] as Record<string, unknown>);
}

export async function setHarnessAgentProfile(tenantId: string, input: {
  enabled?: unknown;
  scopes?: unknown;
  maxSteps?: unknown;
  allowScheduledWrites?: unknown;
}): Promise<HarnessAgentProfile> {
  const current = await getHarnessAgentProfile(tenantId);
  const next = {
    provider: 'ollama',
    enabled: typeof input.enabled === 'boolean' ? input.enabled : current.enabled,
    scopes: input.scopes === undefined ? current.scopes : normalizeAgentScopes(input.scopes),
    max_steps: input.maxSteps === undefined ? current.maxSteps : normalizeMaxSteps(input.maxSteps),
    allow_scheduled_writes: typeof input.allowScheduledWrites === 'boolean' ? input.allowScheduledWrites : current.allowScheduledWrites,
    updated_at: new Date().toISOString(),
  };

  const updated = await insforgeAdmin.database.from('mcp_agent_profiles')
    .update(next)
    .eq('tenant_id', tenantId)
    .select('provider,enabled,scopes,max_steps,allow_scheduled_writes,updated_at');

  const rows = Array.isArray(updated.data) ? updated.data : [];
  if (!updated.error && rows[0]) return rowToProfile(tenantId, rows[0] as Record<string, unknown>);
  if (updated.error) throw new Error(updated.error.message || 'No se pudo actualizar el perfil del agente.');

  const inserted = await insforgeAdmin.database.from('mcp_agent_profiles').insert([{
    tenant_id: tenantId,
    ...next,
  }]).select('provider,enabled,scopes,max_steps,allow_scheduled_writes,updated_at');

  if (inserted.error || !Array.isArray(inserted.data) || !inserted.data[0]) {
    throw new Error(inserted.error?.message || 'No se pudo crear el perfil del agente.');
  }
  return rowToProfile(tenantId, inserted.data[0] as Record<string, unknown>);
}

export function harnessAgentAccess(profile: HarnessAgentProfile): McpAccess {
  return {
    tenantId: profile.tenantId,
    keyId: OLLAMA_AGENT_KEY_ID,
    tokenPrefix: 'internal_ollama',
    scopes: new Set(profile.scopes),
    label: OLLAMA_AGENT_LABEL,
  };
}

export function requireAgentScope(access: McpAccess, scope: AgentScope) {
  if (!access.scopes.has(scope)) throw new Error(`AGENT_SCOPE_REQUIRED:${scope}`);
}
