import 'server-only';

const SCOPES = ['products:read', 'products:write', 'products:publish', 'inventory:write'];

function normalizeUrl(value: unknown) {
  const raw = String(value ?? '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function isMcpOAuthMetadataEnabled() {
  return String(process.env.MCP_OAUTH_METADATA_ENABLED ?? '').trim() === '1';
}

export function getMcpOAuthIssuer() {
  if (!isMcpOAuthMetadataEnabled()) return '';
  return normalizeUrl(process.env.MCP_OAUTH_ISSUER);
}

export function getMcpPublicBase(origin?: string) {
  return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) || normalizeUrl(origin) || 'https://www.solucionesfabrick.com';
}

export function getMcpResourceMetadata(origin?: string) {
  const issuer = getMcpOAuthIssuer();
  if (!issuer) return null;
  const base = getMcpPublicBase(origin);
  return {
    resource: `${base}/api/mcp`,
    resource_name: 'Soluciones Fabrick MCP',
    authorization_servers: [issuer],
    scopes_supported: SCOPES,
    bearer_methods_supported: ['header'],
    resource_documentation: `${base}/admin/mcp`,
  };
}

export function getMcpResourceMetadataUrl(origin?: string) {
  const base = getMcpPublicBase(origin);
  return `${base}/.well-known/oauth-protected-resource/api/mcp`;
}
