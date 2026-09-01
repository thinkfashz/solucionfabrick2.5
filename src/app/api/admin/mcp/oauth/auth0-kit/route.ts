import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getMcpPublicBase, getMcpResourceMetadataUrl } from '@/lib/mcp/oauth';
import { normalizePublicOAuthUrl } from '@/lib/mcp/oauthNetwork';
import { inspectMcpOAuthIssuer } from '@/lib/mcp/oauthReadiness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCOPES = [
  { name: 'products:read', description: 'Buscar, leer y supervisar catálogo.' },
  { name: 'products:write', description: 'Crear y editar borradores de productos.' },
  { name: 'products:publish', description: 'Publicar o despublicar productos; Fabrick puede exigir aprobación.' },
  { name: 'inventory:write', description: 'Mover stock; Fabrick puede exigir aprobación.' },
] as const;

function issuerFrom(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 512) return '';
  return normalizePublicOAuthUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
}

function cleanClientId(value: unknown) {
  const raw = String(value ?? '').trim();
  return raw.length <= 256 ? raw : '';
}

function cleanCallback(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.length > 2048) return '';
  try {
    const url = new URL(raw);
    if (url.username || url.password || url.hash) return '';
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') return '';
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function baseKit(origin: string) {
  const base = getMcpPublicBase(origin);
  const audience = `${base}/api/mcp`;
  return {
    endpoint: audience,
    audience,
    protectedResourceMetadata: getMcpResourceMetadataUrl(origin),
    scopes: SCOPES,
    requestedScopes: ['openid', 'profile', 'email', 'offline_access', ...SCOPES.map((scope) => scope.name)],
    auth0Api: {
      name: 'Soluciones Fabrick MCP',
      identifier: audience,
      signingAlgorithm: 'RS256',
      allowOfflineAccess: true,
      rbac: true,
      note: 'Con RBAC, Auth0 limita el scope del access token a permisos asignados al usuario. Fabrick vuelve a intersectar esos scopes con la credencial MCP vinculada.',
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, kit: baseKit(new URL(request.url).origin) }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const issuer = issuerFrom(body.issuer ?? body.domain);
  if (!issuer) return NextResponse.json({ error: 'Ingresa un dominio/issuer HTTPS público de Auth0.' }, { status: 400 });

  const callbackRaw = String(body.callbackUrl ?? '').trim();
  const callbackUrl = cleanCallback(callbackRaw);
  if (callbackRaw && !callbackUrl) {
    return NextResponse.json({ error: 'La callback no es válida. Debe ser HTTPS en producción, sin credenciales ni fragmento.' }, { status: 400 });
  }
  const clientId = cleanClientId(body.clientId);
  const kit = baseKit(new URL(request.url).origin);
  const readiness = await inspectMcpOAuthIssuer({ issuer });
  const hostname = new URL(issuer).hostname.toLowerCase();
  const standardAuth0Domain = hostname.endsWith('.auth0.com');

  const environment = [
    'MCP_OAUTH_ENABLED=1',
    'MCP_OAUTH_METADATA_ENABLED=1',
    `MCP_OAUTH_ISSUER=${issuer}`,
    `MCP_OAUTH_AUDIENCE=${kit.audience}`,
    'MCP_OAUTH_ALLOWED_ALGS=RS256',
  ].join('\n');

  return NextResponse.json({
    ok: readiness.chatgptCoreReady,
    kit,
    issuer,
    standardAuth0Domain,
    readiness,
    auth0Application: {
      name: 'ChatGPT → Soluciones Fabrick MCP',
      clientId: clientId || '<COPIAR_CLIENT_ID_AUTH0>',
      allowedCallbackUrls: callbackUrl ? [callbackUrl] : ['<PEGAR_CALLBACK_EXACTA_DE_CHATGPT>'],
      grantTypes: ['authorization_code', 'refresh_token'],
      pkce: 'S256',
      tokenEndpointAuthentication: 'Configura el método que ChatGPT ofrezca durante el setup; no expongas client_secret dentro de Fabrick.',
    },
    environment,
    nextSteps: [
      'En Auth0 crea una Custom API con el Identifier exactamente igual al audience de Fabrick.',
      'Añade los cuatro scopes Fabrick a la API.',
      'Activa Allow Offline Access. Para control por usuario, activa RBAC y asigna solo los permisos necesarios.',
      'Crea la Application que representará a ChatGPT y habilita Authorization Code + Refresh Token.',
      'Cuando ChatGPT muestre su callback, pégala exactamente en Allowed Callback URLs de Auth0.',
      'Configura en Fabrick las variables generadas y vuelve a ejecutar Diagnóstico OAuth.',
      'Autoriza ChatGPT y vincula el sub + client_id/azp del access token a una credencial MCP de mínimo privilegio.',
    ],
  }, { headers: { 'cache-control': 'no-store' } });
}
