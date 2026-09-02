import 'server-only';

import { getMcpAccessStatus } from '@/lib/mcp/access';

export const OLLAMA_AGENT_REQUIRED_SCOPES = ['analytics:read', 'site:read', 'automation:run'] as const;

export async function assertOllamaAgentProfile(tenantId: string, keyId: string) {
  const cleanKeyId = String(keyId || '').trim().toLowerCase();
  if (!cleanKeyId) throw new Error('AI_AGENT_MCP_CONNECTION_REQUIRED');
  const status = await getMcpAccessStatus(tenantId);
  const connection = status.connections.find((item) => item.keyId === cleanKeyId);
  if (!connection) throw new Error('AI_AGENT_MCP_CONNECTION_NOT_FOUND');
  const scopes = new Set(connection.scopes);
  const missing = OLLAMA_AGENT_REQUIRED_SCOPES.filter((scope) => !scopes.has(scope));
  if (missing.length) throw new Error(`AI_AGENT_SCOPE_REQUIRED:${missing.join(',')}`);
  return connection;
}
