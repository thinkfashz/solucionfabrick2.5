import 'server-only';

const SCOPES = ['products:read', 'products:write', 'products:publish', 'inventory:write'] as const;
const SUPPORTED_ALGS = ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512', 'EdDSA'] as const;

function enabled(value: unknown) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function normalizeUrl(value: unknown) {
  const raw = String(value ?? '').trim().replace(/\/+$/, '');
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.username || url.password) return '';
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') return '';
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function allowedAlgorithms() {
  const configured = String(process.env.MCP_OAUTH_ALLOWED_ALGS ?? '')
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = new Set<string>(SUPPORTED_ALGS);
  const filtered = [...new Set(configured.filter((value) => allowed.has(value)))];
  return filtered.length ? filtered : ['RS256', 'PS256', 'ES256', 'EdDSA'];
}

export function getMcpPublicBase(origin?: string) {
  return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL) || normalizeUrl(origin) || 'https://www.solucionesfabrick.com';
}

export function getMcpOAuthAdminConfig(origin?: string) {
  const base = getMcpPublicBase(origin);
  const issuer = normalizeUrl(process.env.MCP_OAUTH_ISSUER);
  const audience = normalizeUrl(process.env.MCP_OAUTH_AUDIENCE) || `${base}/api/mcp`;
  const jwksUri = normalizeUrl(process.env.MCP_OAUTH_JWKS_URI);
  const verifierEnabled = enabled(process.env.MCP_OAUTH_ENABLED);
  const metadataEnabled = enabled(process.env.MCP_OAUTH_METADATA_ENABLED);
  const allowSubjectOnlyBinding = enabled(process.env.MCP_OAUTH_ALLOW_SUBJECT_ONLY_BINDING);
  const ready = verifierEnabled && metadataEnabled && Boolean(issuer && audience);
  return {
    ready,
    verifierEnabled,
    metadataEnabled,
    allowSubjectOnlyBinding,
    issuer,
    audience,
    jwksUri,
    jwksMode: jwksUri ? 'explicit' as const : 'discovery' as const,
    allowedAlgs: allowedAlgorithms(),
    clockSkewSeconds: clampInt(process.env.MCP_OAUTH_CLOCK_SKEW_SECONDS, 60, 0, 300),
  };
}

export function getMcpOAuthRuntimeConfig(origin?: string) {
  const config = getMcpOAuthAdminConfig(origin);
  return config.ready ? config : null;
}

export function isMcpOAuthMetadataEnabled() {
  return Boolean(getMcpOAuthRuntimeConfig());
}

export function getMcpOAuthIssuer() {
  return getMcpOAuthRuntimeConfig()?.issuer ?? '';
}

export function getMcpResourceMetadata(origin?: string) {
  const config = getMcpOAuthRuntimeConfig(origin);
  if (!config) return null;
  const base = getMcpPublicBase(origin);
  return {
    resource: config.audience,
    resource_name: 'Soluciones Fabrick MCP',
    authorization_servers: [config.issuer],
    scopes_supported: SCOPES,
    bearer_methods_supported: ['header'],
    resource_documentation: `${base}/admin/mcp/oauth`,
  };
}

export function getMcpResourceMetadataUrl(origin?: string) {
  const base = getMcpPublicBase(origin);
  return `${base}/.well-known/oauth-protected-resource/api/mcp`;
}

export function applyMcpOAuthChallenge(response: Response, requestUrl?: string) {
  if (response.status !== 401) return response;
  const origin = requestUrl ? new URL(requestUrl).origin : undefined;
  if (!getMcpOAuthRuntimeConfig(origin)) return response;

  const headers = new Headers(response.headers);
  headers.set(
    'www-authenticate',
    `Bearer realm="Soluciones Fabrick MCP", resource_metadata="${getMcpResourceMetadataUrl(origin)}", scope="products:read"`,
  );
  headers.set('cache-control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
