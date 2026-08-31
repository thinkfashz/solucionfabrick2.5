import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials } from '@/lib/integrationsCrypto';

export const MCP_PROVIDER = 'mcp_gateway';
export const MCP_DEFAULT_SCOPES = ['products:read', 'products:write', 'inventory:write'] as const;

export type McpScope = typeof MCP_DEFAULT_SCOPES[number];

export type McpAccess = {
  tenantId: string;
  tokenPrefix: string;
  scopes: Set<string>;
  label: string;
};

type GatewayCredentials = {
  token_hash?: string;
  token_prefix?: string;
  scopes?: string;
  label?: string;
  created_at?: string;
};

function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function safeEqualHex(a: string, b: string) {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  const aa = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function extractToken(request: Request, pathToken?: string) {
  const fromPath = String(pathToken ?? '').trim();
  if (fromPath) return fromPath;
  const auth = request.headers.get('authorization') ?? '';
  if (/^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  return (request.headers.get('x-fabrick-mcp-key') ?? '').trim();
}

function parseScopes(value: unknown) {
  return new Set(String(value ?? '').split(/[\s,]+/).map((part) => part.trim()).filter(Boolean));
}

export async function createMcpAccessToken(tenantId: string, label = 'Principal') {
  const token = `sfmcp_${randomBytes(32).toString('base64url')}`;
  const tokenHash = hashToken(token);
  const tokenPrefix = token.slice(0, 13);
  const credentials: GatewayCredentials = {
    token_hash: tokenHash,
    token_prefix: tokenPrefix,
    scopes: MCP_DEFAULT_SCOPES.join(' '),
    label: label.trim().slice(0, 80) || 'Principal',
    created_at: new Date().toISOString(),
  };

  const { error } = await insforgeAdmin.database.from('integrations').upsert([
    {
      provider: MCP_PROVIDER,
      tenant_id: tenantId,
      credentials: encryptCredentials(credentials),
      updated_at: new Date().toISOString(),
    },
  ], { onConflict: 'provider,tenant_id' });

  if (error) throw new Error(error.message || 'No se pudo crear el acceso MCP.');
  return { token, tokenPrefix, scopes: [...MCP_DEFAULT_SCOPES], label: credentials.label };
}

export async function getMcpAccessStatus(tenantId: string) {
  const { data, error } = await insforgeAdmin.database.from('integrations')
    .select('credentials,updated_at')
    .eq('provider', MCP_PROVIDER)
    .eq('tenant_id', tenantId)
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]) {
    return { configured: false, tokenPrefix: '', scopes: [] as string[], label: '', updatedAt: null as string | null };
  }

  const row = data[0] as { credentials?: Record<string, unknown>; updated_at?: string | null };
  const plain = decryptCredentials(row.credentials ?? {}) as GatewayCredentials;
  return {
    configured: Boolean(plain.token_hash),
    tokenPrefix: String(plain.token_prefix ?? ''),
    scopes: [...parseScopes(plain.scopes)],
    label: String(plain.label ?? ''),
    updatedAt: row.updated_at ?? null,
  };
}

export async function revokeMcpAccess(tenantId: string) {
  const { error } = await insforgeAdmin.database.from('integrations')
    .delete()
    .eq('provider', MCP_PROVIDER)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message || 'No se pudo revocar el acceso MCP.');
}

export async function authenticateMcpRequest(request: Request, pathToken?: string): Promise<McpAccess | null> {
  const token = extractToken(request, pathToken);
  if (!token || !token.startsWith('sfmcp_') || token.length < 30) return null;
  const candidate = hashToken(token);

  const { data, error } = await insforgeAdmin.database.from('integrations')
    .select('tenant_id,credentials')
    .eq('provider', MCP_PROVIDER);
  if (error || !Array.isArray(data)) return null;

  for (const row of data as { tenant_id?: string | null; credentials?: Record<string, unknown> }[]) {
    if (!row.tenant_id) continue;
    const plain = decryptCredentials(row.credentials ?? {}) as GatewayCredentials;
    const stored = String(plain.token_hash ?? '');
    if (!safeEqualHex(candidate, stored)) continue;
    return {
      tenantId: row.tenant_id,
      tokenPrefix: String(plain.token_prefix ?? token.slice(0, 13)),
      scopes: parseScopes(plain.scopes),
      label: String(plain.label ?? 'MCP'),
    };
  }
  return null;
}

export function requireMcpScope(access: McpAccess, scope: McpScope) {
  if (!access.scopes.has(scope)) throw new Error(`MCP_SCOPE_REQUIRED:${scope}`);
}