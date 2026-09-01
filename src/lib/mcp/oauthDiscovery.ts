import 'server-only';

import { normalizePublicOAuthUrl, safeOAuthFetchJson } from '@/lib/mcp/oauthNetwork';

export function oauthMetadataCandidates(rawIssuer: unknown) {
  const issuer = normalizePublicOAuthUrl(rawIssuer);
  if (!issuer) return [] as string[];
  const url = new URL(issuer);
  const issuerPath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return [...new Set([
    `${url.origin}/.well-known/oauth-authorization-server${issuerPath}`,
    `${issuer}/.well-known/openid-configuration`,
  ])];
}

export async function discoverOAuthServerMetadata(rawIssuer: unknown) {
  const issuer = normalizePublicOAuthUrl(rawIssuer);
  if (!issuer) throw new Error('Issuer OAuth inválido.');
  const failures: string[] = [];

  for (const candidate of oauthMetadataCandidates(issuer)) {
    try {
      const result = await safeOAuthFetchJson(candidate);
      const advertisedIssuer = normalizePublicOAuthUrl(result.data.issuer);
      if (!advertisedIssuer || advertisedIssuer !== issuer) {
        failures.push(`${candidate}: issuer no coincide`);
        continue;
      }
      return { issuer, metadata: result.data, sourceUrl: result.url };
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : 'falló'}`);
    }
  }

  throw new Error(`No se pudo descubrir metadata OAuth/OIDC. ${failures.slice(-2).join(' · ')}`);
}

export async function resolveOAuthJwksUri(rawIssuer: unknown, explicitJwks?: unknown) {
  const explicit = normalizePublicOAuthUrl(explicitJwks);
  if (explicit) return explicit;
  const discovery = await discoverOAuthServerMetadata(rawIssuer);
  const jwksUri = normalizePublicOAuthUrl(discovery.metadata.jwks_uri);
  if (!jwksUri) throw new Error('La metadata OAuth no publica jwks_uri público.');
  return jwksUri;
}
