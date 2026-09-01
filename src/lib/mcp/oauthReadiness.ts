import 'server-only';

import { discoverOAuthServerMetadata } from '@/lib/mcp/oauthDiscovery';
import { assertPublicOAuthUrl, normalizePublicOAuthUrl, safeOAuthFetchJson } from '@/lib/mcp/oauthNetwork';

export type McpOAuthReadinessCheck = {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
};

function strings(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function check(
  list: McpOAuthReadinessCheck[],
  id: string,
  label: string,
  status: McpOAuthReadinessCheck['status'],
  message: string,
) {
  list.push({ id, label, status, message });
}

async function validateEndpoint(
  list: McpOAuthReadinessCheck[],
  id: string,
  label: string,
  value: unknown,
  required = true,
) {
  const normalized = normalizePublicOAuthUrl(value);
  if (!normalized) {
    check(list, id, label, required ? 'fail' : 'warn', required ? 'Endpoint ausente o no público.' : 'No anunciado por el issuer.');
    return '';
  }
  try {
    await assertPublicOAuthUrl(normalized);
    check(list, id, label, 'pass', normalized);
    return normalized;
  } catch (error) {
    check(list, id, label, required ? 'fail' : 'warn', error instanceof Error ? error.message : 'Endpoint no permitido.');
    return '';
  }
}

export async function inspectMcpOAuthIssuer(input: { issuer: unknown; explicitJwksUri?: unknown }) {
  const checks: McpOAuthReadinessCheck[] = [];
  const issuer = normalizePublicOAuthUrl(input.issuer);
  if (!issuer) {
    check(checks, 'issuer', 'Issuer HTTPS público', 'fail', 'Ingresa un issuer HTTPS público y sin credenciales embebidas.');
    return {
      ok: false,
      chatgptCoreReady: false,
      persistentSessionReady: false,
      issuer: '',
      metadataUrl: '',
      registrationMode: 'unknown' as const,
      score: 0,
      checks,
      endpoints: {},
    };
  }

  check(checks, 'issuer', 'Issuer HTTPS público', 'pass', issuer);

  let discovery: Awaited<ReturnType<typeof discoverOAuthServerMetadata>>;
  try {
    discovery = await discoverOAuthServerMetadata(issuer);
    check(checks, 'discovery', 'Discovery RFC 8414 / OIDC', 'pass', discovery.sourceUrl);
  } catch (error) {
    check(checks, 'discovery', 'Discovery RFC 8414 / OIDC', 'fail', error instanceof Error ? error.message : 'Discovery falló.');
    return {
      ok: false,
      chatgptCoreReady: false,
      persistentSessionReady: false,
      issuer,
      metadataUrl: '',
      registrationMode: 'unknown' as const,
      score: 10,
      checks,
      endpoints: {},
    };
  }

  const metadata = discovery.metadata;
  const authorizationEndpoint = await validateEndpoint(checks, 'authorization_endpoint', 'Authorization endpoint', metadata.authorization_endpoint);
  const tokenEndpoint = await validateEndpoint(checks, 'token_endpoint', 'Token endpoint', metadata.token_endpoint);

  const responseTypes = strings(metadata.response_types_supported);
  const grantTypes = strings(metadata.grant_types_supported);
  const authorizationCode = responseTypes.includes('code') || grantTypes.includes('authorization_code');
  check(
    checks,
    'authorization_code',
    'Authorization Code',
    authorizationCode ? 'pass' : 'fail',
    authorizationCode ? 'El issuer anuncia flujo authorization_code/code.' : 'No se detectó soporte para Authorization Code.',
  );

  const pkceMethods = strings(metadata.code_challenge_methods_supported);
  const pkceS256 = pkceMethods.includes('S256');
  check(
    checks,
    'pkce',
    'PKCE S256',
    pkceS256 ? 'pass' : 'fail',
    pkceS256 ? 'S256 anunciado.' : 'El issuer no anuncia code_challenge_methods_supported con S256.',
  );

  const scopes = strings(metadata.scopes_supported);
  const offlineAccess = scopes.includes('offline_access');
  check(
    checks,
    'offline_access',
    'offline_access / refresh persistente',
    offlineAccess ? 'pass' : 'warn',
    offlineAccess ? 'offline_access está anunciado.' : 'No se anuncia offline_access; ChatGPT podría requerir reautorización al expirar el token.',
  );

  const refreshGrant = grantTypes.includes('refresh_token');
  if (grantTypes.length === 0) {
    check(checks, 'refresh_token', 'Refresh token grant', 'warn', 'grant_types_supported no está anunciado; confirma que el issuer emite refresh tokens.');
  } else {
    check(
      checks,
      'refresh_token',
      'Refresh token grant',
      refreshGrant ? 'pass' : 'warn',
      refreshGrant ? 'refresh_token anunciado.' : 'refresh_token no aparece en grant_types_supported.',
    );
  }

  const cimd = metadata.client_id_metadata_document_supported === true;
  const registrationEndpoint = await validateEndpoint(checks, 'registration_endpoint', 'Dynamic Client Registration (legacy fallback)', metadata.registration_endpoint, false);
  const registrationMode = cimd ? 'cimd' as const : registrationEndpoint ? 'dcr' as const : 'preregister' as const;
  check(
    checks,
    'client_registration',
    'Registro de cliente MCP',
    cimd ? 'pass' : registrationEndpoint ? 'warn' : 'warn',
    cimd
      ? 'Client ID Metadata Documents (CIMD) soportado: opción moderna preferida por MCP 2026.'
      : registrationEndpoint
        ? 'DCR disponible como compatibilidad. MCP 2026 lo depreca frente a CIMD.'
        : 'Sin CIMD/DCR anunciado: el cliente debe pre-registrarse manualmente en el Authorization Server.',
  );

  const authMethods = strings(metadata.token_endpoint_auth_methods_supported);
  if (authMethods.length === 0) {
    check(checks, 'public_client', 'Cliente público / token endpoint', 'warn', 'token_endpoint_auth_methods_supported no está anunciado.');
  } else {
    check(
      checks,
      'public_client',
      'Cliente público / token endpoint',
      authMethods.includes('none') ? 'pass' : 'warn',
      authMethods.includes('none') ? 'El token endpoint admite clientes públicos.' : `Métodos anunciados: ${authMethods.join(', ')}. Puede requerir cliente pre-registrado/confidencial.`,
    );
  }

  const responseIssuer = metadata.authorization_response_iss_parameter_supported === true;
  check(
    checks,
    'response_iss',
    'Authorization response issuer',
    responseIssuer ? 'pass' : 'warn',
    responseIssuer ? 'El issuer anuncia el parámetro iss de respuesta.' : 'No se anuncia authorization_response_iss_parameter_supported; recomendable para el endurecimiento MCP actual.',
  );

  const explicitJwks = normalizePublicOAuthUrl(input.explicitJwksUri);
  const jwksUri = explicitJwks || normalizePublicOAuthUrl(metadata.jwks_uri);
  let jwksKeyCount = 0;
  if (!jwksUri) {
    check(checks, 'jwks', 'JWKS para access tokens JWT', 'fail', 'No existe jwks_uri público y Fabrick no acepta tokens opacos.');
  } else {
    try {
      const result = await safeOAuthFetchJson(jwksUri);
      const keys = Array.isArray(result.data.keys) ? result.data.keys : [];
      jwksKeyCount = keys.length;
      check(
        checks,
        'jwks',
        'JWKS para access tokens JWT',
        keys.length > 0 ? 'pass' : 'fail',
        keys.length > 0 ? `${keys.length} clave(s) pública(s) disponible(s).` : 'JWKS accesible pero vacío.',
      );
    } catch (error) {
      check(checks, 'jwks', 'JWKS para access tokens JWT', 'fail', error instanceof Error ? error.message : 'No se pudo leer JWKS.');
    }
  }

  const failCount = checks.filter((item) => item.status === 'fail').length;
  const passCount = checks.filter((item) => item.status === 'pass').length;
  const warnCount = checks.filter((item) => item.status === 'warn').length;
  const score = Math.max(0, Math.min(100, Math.round(((passCount + warnCount * 0.35) / Math.max(1, checks.length)) * 100)));
  const chatgptCoreReady = failCount === 0 && Boolean(authorizationEndpoint && tokenEndpoint && authorizationCode && pkceS256 && jwksKeyCount);
  const persistentSessionReady = chatgptCoreReady && offlineAccess && (grantTypes.length === 0 || refreshGrant);

  return {
    ok: chatgptCoreReady,
    chatgptCoreReady,
    persistentSessionReady,
    issuer,
    metadataUrl: discovery.sourceUrl,
    registrationMode,
    score,
    checks,
    endpoints: {
      authorizationEndpoint,
      tokenEndpoint,
      jwksUri,
      registrationEndpoint,
    },
    capabilities: {
      cimd,
      dcr: Boolean(registrationEndpoint),
      authorizationCode,
      pkceS256,
      offlineAccess,
      refreshGrant: grantTypes.length === 0 ? null : refreshGrant,
      responseIssuer,
      jwksKeyCount,
    },
  };
}
