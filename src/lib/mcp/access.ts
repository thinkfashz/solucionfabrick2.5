import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { insforgeAdmin } from '@/lib/insforge';
import { decryptCredentials, encryptCredentials } from '@/lib/integrationsCrypto';

export const MCP_PROVIDER = 'mcp_gateway';
export const MCP_DEFAULT_SCOPES = ['products:read', 'products:write', 'products:publish', 'inventory:write'] as const;
export const MCP_MAX_CONNECTIONS_PER_TENANT = 20;

export type McpScope = typeof MCP_DEFAULT_SCOPES[number];

export type McpAccess = {
  tenantId: string;
  keyId: string;
  tokenPrefix: string;
  scopes: Set<string>;
  label: string;
};

type GatewayCredentials = {
  key_id?: string;
  token_hash?: string;
  token_prefix?: string;
  scopes?: string;
  label?: string;
  created_at?: string;
};

type GatewayRow = {
  provider?: string | null;
  tenant_id?: string | null;
  credentials?: Record<string, unknown>;
  updated_at?: string | null;
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

export function normalizeMcpScopes(value: unknown): McpScope[] {
  const requested = Array.isArray(value) ? value.map(String) : String(value ?? '').split(/[\s,]+/);
  const allowed = new Set<string>(MCP_DEFAULT_SCOPES);
  const scopes = [...new Set(requested.map((item) => item.trim()).filter((item): item is McpScope => allowed.has(item)))];
  return scopes.length > 0 ? scopes : ['products:read'];
}

function providerForKey(keyId: string) {
  return `${MCP_PROVIDER}:${keyId}`;
}

function keyIdFromProvider(provider: unknown) {
  const raw = String(provider ?? '');
  const match = raw.match(/^mcp_gateway:([a-f0-9]{16})$/i);
  return match?.[1]?.toLowerCase() ?? '';
}

function tokenKeyId(token: string) {
  return token.match(/^sfmcp_([a-f0-9]{16})\.[A-Za-z0-9_-]{20,}$/i)?.[1]?.toLowerCase() ?? '';
}

function connectionFromRow(row: GatewayRow) {
  const plain = decryptCredentials(row.credentials ?? {}) as GatewayCredentials;
  const keyId = String(plain.key_id || keyIdFromProvider(row.provider));
  return {
    keyId,
    tokenPrefix: String(plain.token_prefix ?? ''),
    scopes: [...parseScopes(plain.scopes)],
    label: String(plain.label ?? 'MCP'),
    createdAt: String(plain.created_at ?? ''),
    updatedAt: row.updated_at ?? null,
    legacy: String(row.provider ?? '') === MCP_PROVIDER,
  };
}

async function connectionCount(tenantId: string) {
  const { data } = await insforgeAdmin.database.from('integrations')
    .select('provider')
    .eq('tenant_id', tenantId)
    .like('provider', `${MCP_PROVIDER}%`)
    .limit(MCP_MAX_CONNECTIONS_PER_TENANT + 1);
  return Array.isArray(data) ? data.length : 0;
}

export async function createMcpAccessToken(tenantId: string, label = 'Principal', requestedScopes: unknown = MCP_DEFAULT_SCOPES) {
  const scopes = normalizeMcpScopes(requestedScopes);
  const count = await connectionCount(tenantId);
  if (count >= MCP_MAX_CONNECTIONS_PER_TENANT) {
    throw new Error(`Límite de ${MCP_MAX_CONNECTIONS_PER_TENANT} credenciales MCP alcanzado. Revoca una conexión antes de crear otra.`);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const keyId = randomBytes(8).toString('hex');
    const token = `sfmcp_${keyId}.${randomBytes(32).toString('base64url')}`;
    const tokenHash = hashToken(token);
    const tokenPrefix = `sfmcp_${keyId.slice(0, 6)}`;
    const credentials: GatewayCredentials = {
      key_id: keyId,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      scopes: scopes.join(' '),
      label: label.trim().slice(0, 80) || 'Principal',
      created_at: new Date().toISOString(),
    };

    const { error } = await insforgeAdmin.database.from('integrations').insert([
      {
        provider: providerForKey(keyId),
        tenant_id: tenantId,
        credentials: encryptCredentials(credentials),
        updated_at: new Date().toISOString(),
      },
    ]);

    if (!error) return { token, keyId, tokenPrefix, scopes, label: credentials.label };
    if ((error as { code?: string }).code !== '23505' || attempt === 2) {
      throw new Error(error.message || 'No se pudo crear el acceso MCP.');
    }
  }

  throw new Error('No se pudo generar un identificador MCP único.');
}

export async function getMcpAccessStatus(tenantId: string) {
  const { data, error } = await insforgeAdmin.database.from('integrations')
    .select('provider,credentials,updated_at')
    .eq('tenant_id', tenantId)
    .like('provider', `${MCP_PROVIDER}%`)
    .order('updated_at', { ascending: false });

  if (error || !Array.isArray(data)) {
    return {
      configured: false,
      tokenPrefix: '',
      scopes: [] as string[],
      label: '',
      updatedAt: null as string | null,
      connections: [] as ReturnType<typeof connectionFromRow>[],
    };
  }

  const connections = (data as GatewayRow[])
    .map(connectionFromRow)
    .filter((connection) => Boolean(connection.tokenPrefix));
  const latest = connections[0];
  return {
    configured: connections.length > 0,
    tokenPrefix: latest?.tokenPrefix ?? '',
    scopes: latest?.scopes ?? [],
    label: latest?.label ?? '',
    updatedAt: latest?.updatedAt ?? null,
    connections,
  };
}

export async function revokeMcpAccess(tenantId: string, keyId?: string) {
  const cleanKeyId = String(keyId ?? '').trim().toLowerCase();
  let query = insforgeAdmin.database.from('integrations').delete().eq('tenant_id', tenantId);
  if (cleanKeyId) {
    if (!/^[a-f0-9]{16}$/.test(cleanKeyId)) throw new Error('Identificador MCP inválido.');
    query = query.eq('provider', providerForKey(cleanKeyId));
  } else {
    query = query.like('provider', `${MCP_PROVIDER}%`);
  }
  const { error } = await query;
  if (error) throw new Error(error.message || 'No se pudo revocar el acceso MCP.');
}

async function authenticateIndexedToken(token: string, keyId: string): Promise<McpAccess | null> {
  const candidate = hashToken(token);
  const { data, error } = await insforgeAdmin.database.from('integrations')
    .select('tenant_id,provider,credentials')
    .eq('provider', providerForKey(keyId))
    .limit(2);
  if (error || !Array.isArray(data)) return null;

  for (const row of data as GatewayRow[]) {
    if (!row.tenant_id) continue;
    const plain = decryptCredentials(row.credentials ?? {}) as GatewayCredentials;
    if (!safeEqualHex(candidate, String(plain.token_hash ?? ''))) continue;
    return {
      tenantId: row.tenant_id,
      keyId,
      tokenPrefix: String(plain.token_prefix ?? `sfmcp_${keyId.slice(0, 6)}`),
      scopes: parseScopes(plain.scopes),
      label: String(plain.label ?? 'MCP'),
    };
  }
  return null;
}

async function authenticateLegacyToken(token: string): Promise<McpAccess | null> {
  const candidate = hashToken(token);
  const { data, error } = await insforgeAdmin.database.from('integrations')
    .select('tenant_id,provider,credentials')
    .eq('provider', MCP_PROVIDER);
  if (error || !Array.isArray(data)) return null;

  for (const row of data as GatewayRow[]) {
    if (!row.tenant_id) continue;
    const plain = decryptCredentials(row.credentials ?? {}) as GatewayCredentials;
    if (!safeEqualHex(candidate, String(plain.token_hash ?? ''))) continue;
    return {
      tenantId: row.tenant_id,
      keyId: 'legacy',
      tokenPrefix: String(plain.token_prefix ?? token.slice(0, 13)),
      scopes: parseScopes(plain.scopes),
      label: String(plain.label ?? 'MCP legacy'),
    };
  }
  return null;
}

export async function authenticateMcpRequest(request: Request, pathToken?: string): Promise<McpAccess | null> {
  const token = extractToken(request, pathToken);
  if (!token || !token.startsWith('sfmcp_') || token.length < 30 || token.length > 180) return null;
  const keyId = tokenKeyId(token);
  if (keyId) return authenticateIndexedToken(token, keyId);
  return authenticateLegacyToken(token);
}

export function requireMcpScope(access: McpAccess, scope: McpScope) {
  if (!access.scopes.has(scope)) throw new Error(`MCP_SCOPE_REQUIRED:${scope}`);
}
