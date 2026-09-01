import 'server-only';

import {
  constants,
  createHash,
  createPublicKey,
  verify as verifySignature,
  type JsonWebKey,
} from 'node:crypto';
import { getMcpOAuthRuntimeConfig } from '@/lib/mcp/oauth';
import { discoverOAuthServerMetadata } from '@/lib/mcp/oauthDiscovery';
import { normalizePublicOAuthUrl, safeOAuthFetchJson } from '@/lib/mcp/oauthNetwork';

export type VerifiedMcpOAuthToken = {
  issuer: string;
  subject: string;
  clientId: string;
  scopes: Set<string>;
  expiresAt: number;
  tokenFingerprint: string;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type JwtClaims = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  scope?: string;
  scp?: string | string[];
  client_id?: string;
  azp?: string;
  [key: string]: unknown;
};

type JwkSet = { keys?: Array<Record<string, unknown>> };
type CachedDiscovery = { issuer: string; jwksUri: string; expiresAt: number };
type CachedJwks = { jwksUri: string; keys: Array<Record<string, unknown>>; expiresAt: number };

let discoveryCache: CachedDiscovery | null = null;
let jwksCache: CachedJwks | null = null;

function decodeJson<T>(part: string): T | null {
  try {
    if (!part || part.length > 32_000) return null;
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

async function discoverJwksUri(issuer: string) {
  const now = Date.now();
  if (discoveryCache?.issuer === issuer && discoveryCache.expiresAt > now) return discoveryCache.jwksUri;
  const discovery = await discoverOAuthServerMetadata(issuer);
  const jwksUri = normalizePublicOAuthUrl(discovery.metadata.jwks_uri);
  if (!jwksUri) return '';
  discoveryCache = { issuer, jwksUri, expiresAt: now + 5 * 60_000 };
  return jwksUri;
}

async function getJwks(jwksUri: string, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && jwksCache?.jwksUri === jwksUri && jwksCache.expiresAt > now) return jwksCache.keys;
  const result = await safeOAuthFetchJson(jwksUri);
  const data = result.data as JwkSet;
  const keys = Array.isArray(data.keys) ? data.keys.slice(0, 100) : [];
  if (!keys.length) throw new Error('JWKS vacío.');
  jwksCache = { jwksUri: result.url, keys, expiresAt: now + 5 * 60_000 };
  return keys;
}

function selectJwk(keys: Array<Record<string, unknown>>, header: JwtHeader) {
  const eligible = keys.filter((key) => {
    if (String(key.use ?? 'sig') !== 'sig') return false;
    if (Array.isArray(key.key_ops) && !(key.key_ops as unknown[]).map(String).includes('verify')) return false;
    if (key.alg && String(key.alg) !== header.alg) return false;
    if (header.kid && String(key.kid ?? '') !== header.kid) return false;
    return true;
  });
  if (header.kid) return eligible[0] ?? null;
  return eligible.length === 1 ? eligible[0] : null;
}

function hashForAlg(alg: string) {
  if (alg.endsWith('256')) return 'sha256';
  if (alg.endsWith('384')) return 'sha384';
  if (alg.endsWith('512')) return 'sha512';
  return null;
}

function verifyJwtSignature(alg: string, jwk: Record<string, unknown>, signingInput: Buffer, signature: Buffer) {
  const key = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
  if (alg === 'EdDSA') return verifySignature(null, signingInput, key, signature);
  const digest = hashForAlg(alg);
  if (!digest) return false;
  if (alg.startsWith('PS')) {
    return verifySignature(digest, signingInput, {
      key,
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
    }, signature);
  }
  if (alg.startsWith('ES')) {
    return verifySignature(digest, signingInput, { key, dsaEncoding: 'ieee-p1363' }, signature);
  }
  return verifySignature(digest, signingInput, key, signature);
}

function parseScopes(claims: JwtClaims) {
  const values: string[] = [];
  if (typeof claims.scope === 'string') values.push(...claims.scope.split(/\s+/));
  if (typeof claims.scp === 'string') values.push(...claims.scp.split(/[\s,]+/));
  if (Array.isArray(claims.scp)) values.push(...claims.scp.map(String));
  return new Set(values.map((scope) => scope.trim()).filter(Boolean));
}

function audienceMatches(aud: JwtClaims['aud'], expected: string) {
  if (typeof aud === 'string') return aud === expected;
  return Array.isArray(aud) && aud.includes(expected);
}

function claimsAreValid(claims: JwtClaims, issuer: string, audience: string, skewSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  if (normalizePublicOAuthUrl(claims.iss) !== issuer) return false;
  if (!String(claims.sub ?? '').trim()) return false;
  if (!audienceMatches(claims.aud, audience)) return false;
  if (!Number.isFinite(claims.exp) || Number(claims.exp) <= now - skewSeconds) return false;
  if (Number.isFinite(claims.nbf) && Number(claims.nbf) > now + skewSeconds) return false;
  if (Number.isFinite(claims.iat) && Number(claims.iat) > now + skewSeconds) return false;
  return true;
}

export function hashMcpOAuthSubject(issuer: string, subject: string) {
  return createHash('sha256').update(`${issuer}\u0000${subject}`, 'utf8').digest('hex');
}

export function mcpOAuthSubjectHint(subject: string) {
  const clean = subject.trim();
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

export async function verifyMcpOAuthBearerToken(token: string): Promise<VerifiedMcpOAuthToken | null> {
  const config = getMcpOAuthRuntimeConfig();
  if (!config || token.length < 20 || token.length > 32_000) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const header = decodeJson<JwtHeader>(encodedHeader);
  const claims = decodeJson<JwtClaims>(encodedClaims);
  if (!header || !claims || !header.alg || header.alg === 'none') return null;
  if (!config.allowedAlgs.includes(header.alg)) return null;
  if (!claimsAreValid(claims, config.issuer, config.audience, config.clockSkewSeconds)) return null;

  try {
    const jwksUri = config.jwksUri || await discoverJwksUri(config.issuer);
    if (!jwksUri) return null;
    let keys = await getJwks(jwksUri);
    let jwk = selectJwk(keys, header);
    if (!jwk && header.kid) {
      keys = await getJwks(jwksUri, true);
      jwk = selectJwk(keys, header);
    }
    if (!jwk) return null;

    const signingInput = Buffer.from(`${encodedHeader}.${encodedClaims}`, 'ascii');
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (!verifyJwtSignature(header.alg, jwk, signingInput, signature)) return null;

    const subject = String(claims.sub).trim();
    const clientId = String(claims.client_id ?? claims.azp ?? '').trim().slice(0, 240);
    return {
      issuer: config.issuer,
      subject,
      clientId,
      scopes: parseScopes(claims),
      expiresAt: Number(claims.exp),
      tokenFingerprint: createHash('sha256').update(token, 'utf8').digest('hex').slice(0, 16),
    };
  } catch {
    return null;
  }
}
