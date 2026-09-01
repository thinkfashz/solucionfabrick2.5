import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getMcpOAuthAdminConfig, getMcpPublicBase, getMcpResourceMetadataUrl } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RESOURCE_SCOPES = ['products:read', 'products:write', 'products:publish', 'inventory:write'] as const;

function cleanCallbackUrl(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048) return '';
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.hash) return '';
    if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') return '';
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function clientType(value: unknown) {
  const clean = String(value ?? '').trim().toLowerCase();
  return clean === 'chatgpt' || clean === 'generic' || clean === 'bearer' ? clean : 'chatgpt';
}

function buildBaseKit(origin: string) {
  const base = getMcpPublicBase(origin);
  const config = getMcpOAuthAdminConfig(origin);
  const endpoint = `${base}/api/mcp`;
  const resource = config.audience || endpoint;
  return {
    product: 'Soluciones Fabrick MCP',
    endpoint,
    resource,
    protectedResourceMetadata: getMcpResourceMetadataUrl(origin),
    issuer: config.issuer,
    oauthReady: config.ready,
    resourceScopes: [...RESOURCE_SCOPES],
    recommendedInteractiveScopes: ['offline_access', ...RESOURCE_SCOPES],
    authorization: {
      flow: 'authorization_code',
      pkce: 'S256',
      refreshTokensRecommended: true,
      registrationPriority: ['pre-registered', 'cimd', 'dcr-legacy'],
      jwtAudienceRequired: resource,
    },
    bearer: {
      supported: true,
      header: 'Authorization: Bearer sfmcp_<keyId>.<secret>',
      note: 'Úsalo para clientes MCP que admitan headers y no necesiten OAuth interactivo.',
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  const origin = new URL(request.url).origin;
  return NextResponse.json({ ok: true, kit: buildBaseKit(origin) }, {
    headers: { 'cache-control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const callbackUrl = cleanCallbackUrl(body.callbackUrl);
  const selectedClient = clientType(body.clientType);
  if (!callbackUrl) {
    return NextResponse.json({ error: 'La callback debe ser una URL válida, sin fragmento y HTTPS en producción.' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const kit = buildBaseKit(origin);
  const callback = new URL(callbackUrl);
  const looksLikeCurrentChatGptCallback = callback.hostname === 'chatgpt.com' && callback.pathname.startsWith('/connector/oauth/');
  const warnings: string[] = [];

  if (selectedClient === 'chatgpt' && !looksLikeCurrentChatGptCallback) {
    warnings.push('La URL no coincide con el patrón actual de callback de ChatGPT. Usa exactamente la callback que ChatGPT muestre durante el setup; el patrón puede cambiar y Fabrick no debe inventarla.');
  }
  if (!kit.issuer) warnings.push('OAuth todavía no tiene MCP_OAUTH_ISSUER configurado en Fabrick.');

  const preRegistrationExample = {
    client_name: selectedClient === 'chatgpt' ? 'ChatGPT → Soluciones Fabrick MCP' : 'Cliente MCP → Soluciones Fabrick',
    redirect_uris: [callbackUrl],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  };

  const connectionProfile = {
    client: selectedClient,
    mcp_endpoint: kit.endpoint,
    resource: kit.resource,
    protected_resource_metadata: kit.protectedResourceMetadata,
    authorization_server_issuer: kit.issuer || '<CONFIGURAR_ISSUER>',
    redirect_uri: callbackUrl,
    authorization_code: true,
    pkce: 'S256',
    requested_scopes: kit.recommendedInteractiveScopes,
    access_token_requirements: {
      format: 'JWT',
      audience: kit.resource,
      required_identity_claims: ['sub', 'client_id o azp'],
      scope_claim: 'scope o scp',
    },
  };

  return NextResponse.json({
    ok: true,
    kit,
    callback: {
      url: callbackUrl,
      exactMatchRequired: true,
      looksLikeCurrentChatGptCallback,
    },
    warnings,
    preRegistrationExample,
    connectionProfile,
    steps: [
      'Crea o selecciona el cliente OAuth en tu Authorization Server.',
      'Registra esta callback exactamente, sin cambiar dominio, path ni slash final.',
      `Configura el recurso/audience como ${kit.resource}.`,
      'Activa Authorization Code + PKCE S256.',
      'Habilita refresh tokens/offline_access para conexiones persistentes cuando el proveedor lo permita.',
      'Configura issuer/audience en Fabrick y ejecuta Diagnóstico OAuth.',
      'Autoriza el cliente, inspecciona el access token y vincula su sub + client_id/azp a una credencial MCP desde OAuth 2.1.',
      'Prueba /api/mcp y confirma auditoría, cuotas y gobernanza.',
    ],
  }, { headers: { 'cache-control': 'no-store' } });
}
