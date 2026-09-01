import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { getMcpPublicBase } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FABRICK_SCOPES = [
  { value: 'products:read', description: 'Buscar, leer y supervisar catálogo.' },
  { value: 'products:write', description: 'Crear y editar borradores de productos.' },
  { value: 'products:publish', description: 'Publicar o despublicar productos.' },
  { value: 'inventory:write', description: 'Mover stock de inventario.' },
] as const;

const REQUIRED_MANAGEMENT_SCOPES = [
  'read:tenant_settings',
  'update:tenant_settings',
  'read:resource_servers',
  'create:resource_servers',
  'update:resource_servers',
] as const;

type Auth0Json = Record<string, unknown>;

class Auth0ManagementError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function tenantDomain(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 512) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return '';
    if (url.pathname !== '/' && url.pathname !== '') return '';
    const hostname = url.hostname.toLowerCase();
    if (!hostname.endsWith('.auth0.com') || hostname === 'auth0.com') return '';
    return hostname;
  } catch {
    return '';
  }
}

function managementToken(value: unknown) {
  const token = String(value ?? '').trim();
  if (token.length < 20 || token.length > 32_000 || /\s/.test(token)) return '';
  return token;
}

function safeMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  for (const key of ['message', 'error_description', 'error']) {
    const value = String(record[key] ?? '').trim();
    if (value) return value.slice(0, 600);
  }
  return fallback;
}

async function auth0Request(
  domain: string,
  token: string,
  path: string,
  init: { method?: 'GET' | 'POST' | 'PATCH'; body?: Auth0Json } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const method = init.method ?? 'GET';
    const response = await fetch(`https://${domain}/api/v2${path}`, {
      method,
      redirect: 'error',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(method !== 'GET' ? { 'x-correlation-id': `fabrick-mcp-${randomUUID()}`.slice(0, 64) } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const text = (await response.text()).slice(0, 256_000);
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!response.ok) {
      throw new Auth0ManagementError(
        response.status,
        safeMessage(data, `Auth0 Management API respondió HTTP ${response.status}.`),
      );
    }
    return data;
  } catch (error) {
    if (error instanceof Auth0ManagementError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Auth0ManagementError(504, 'Auth0 Management API excedió el tiempo de espera.');
    }
    throw new Auth0ManagementError(502, error instanceof Error ? error.message : 'No se pudo contactar Auth0.');
  } finally {
    clearTimeout(timer);
  }
}

function resourceArray(data: unknown) {
  if (Array.isArray(data)) return data as Auth0Json[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.resource_servers)) return record.resource_servers as Auth0Json[];
    if (Array.isArray(record.items)) return record.items as Auth0Json[];
  }
  return [] as Auth0Json[];
}

function normalizedScopes(value: unknown) {
  if (!Array.isArray(value)) return [] as Array<{ value: string; description: string }>;
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const scope = String(record.value ?? '').trim();
      if (!scope) return null;
      return { value: scope, description: String(record.description ?? '').trim() };
    })
    .filter((item): item is { value: string; description: string } => Boolean(item));
}

function mergedScopes(existing: Array<{ value: string; description: string }>) {
  const merged = new Map(existing.map((scope) => [scope.value, scope]));
  for (const scope of FABRICK_SCOPES) merged.set(scope.value, { ...scope });
  return [...merged.values()];
}

async function inspect(domain: string, token: string, audience: string) {
  const [tenantRaw, resourcesRaw] = await Promise.all([
    auth0Request(domain, token, '/tenants/settings?fields=resource_parameter_profile&include_fields=true'),
    auth0Request(
      domain,
      token,
      `/resource-servers?identifiers=${encodeURIComponent(audience)}&page=0&per_page=10`,
    ),
  ]);

  const tenant = (tenantRaw && typeof tenantRaw === 'object' ? tenantRaw : {}) as Auth0Json;
  const resource = resourceArray(resourcesRaw).find((item) => String(item.identifier ?? '') === audience) ?? null;
  const scopes = normalizedScopes(resource?.scopes);
  const present = new Set(scopes.map((scope) => scope.value));
  const missingScopes = FABRICK_SCOPES.map((scope) => scope.value).filter((scope) => !present.has(scope));
  const unexpectedScopes = scopes.map((scope) => scope.value).filter(
    (scope) => !FABRICK_SCOPES.some((required) => required.value === scope),
  );

  const tenantCompatible = tenant.resource_parameter_profile === 'compatibility';
  const resourceReady = Boolean(
    resource
      && resource.signing_alg === 'RS256'
      && resource.allow_offline_access === true
      && resource.enforce_policies === true
      && missingScopes.length === 0,
  );

  return {
    ready: tenantCompatible && resourceReady,
    tenant: {
      resourceParameterProfile: String(tenant.resource_parameter_profile ?? 'audience'),
      compatible: tenantCompatible,
    },
    resourceServer: {
      exists: Boolean(resource),
      id: String(resource?.id ?? ''),
      identifier: String(resource?.identifier ?? audience),
      name: String(resource?.name ?? ''),
      signingAlg: String(resource?.signing_alg ?? ''),
      allowOfflineAccess: resource?.allow_offline_access === true,
      rbac: resource?.enforce_policies === true,
      tokenDialect: String(resource?.token_dialect ?? ''),
      scopes,
      missingScopes,
      unexpectedScopes,
      ready: resourceReady,
    },
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const domain = tenantDomain(body.domain);
  const token = managementToken(body.managementToken);
  const commit = body.commit === true;
  if (!domain) {
    return NextResponse.json(
      { error: 'Usa el dominio estándar del tenant Auth0, por ejemplo tu-tenant.us.auth0.com.' },
      { status: 400 },
    );
  }
  if (!token) {
    return NextResponse.json({ error: 'Management API token inválido o ausente.' }, { status: 400 });
  }

  const base = getMcpPublicBase(new URL(request.url).origin);
  const audience = `${base}/api/mcp`;

  try {
    const before = await inspect(domain, token, audience);
    const plannedChanges: string[] = [];
    if (!before.tenant.compatible) plannedChanges.push('Activar Resource Parameter Compatibility Profile (resource_parameter_profile=compatibility).');
    if (!before.resourceServer.exists) plannedChanges.push('Crear la Custom API Soluciones Fabrick MCP.');
    if (before.resourceServer.exists && !before.resourceServer.ready) plannedChanges.push('Alinear RS256, RBAC, offline access y scopes de la Custom API.');
    if (before.resourceServer.unexpectedScopes.length) {
      plannedChanges.push(`Conservar scopes adicionales existentes: ${before.resourceServer.unexpectedScopes.join(', ')}.`);
    }

    if (!commit) {
      return NextResponse.json({
        ok: true,
        commit: false,
        domain,
        audience,
        requiredManagementScopes: REQUIRED_MANAGEMENT_SCOPES,
        before,
        plannedChanges,
        tokenStored: false,
      }, { headers: { 'cache-control': 'no-store' } });
    }

    const applied: string[] = [];
    if (!before.tenant.compatible) {
      await auth0Request(domain, token, '/tenants/settings', {
        method: 'PATCH',
        body: { resource_parameter_profile: 'compatibility' },
      });
      applied.push('Resource Parameter Compatibility Profile activado.');
    }

    const resourcePayload = {
      name: 'Soluciones Fabrick MCP',
      scopes: mergedScopes(before.resourceServer.scopes),
      signing_alg: 'RS256',
      allow_offline_access: true,
      enforce_policies: true,
    };

    if (!before.resourceServer.exists) {
      await auth0Request(domain, token, '/resource-servers', {
        method: 'POST',
        body: {
          identifier: audience,
          ...resourcePayload,
          token_dialect: 'access_token',
        },
      });
      applied.push('Custom API Fabrick creada.');
    } else if (!before.resourceServer.ready) {
      await auth0Request(domain, token, `/resource-servers/${encodeURIComponent(before.resourceServer.id)}`, {
        method: 'PATCH',
        body: resourcePayload,
      });
      applied.push('Custom API Fabrick actualizada.');
    }

    const after = await inspect(domain, token, audience);
    return NextResponse.json({
      ok: after.ready,
      commit: true,
      domain,
      audience,
      requiredManagementScopes: REQUIRED_MANAGEMENT_SCOPES,
      before,
      after,
      plannedChanges,
      applied,
      tokenStored: false,
      next: after.ready
        ? 'El tenant y la Custom API están listos. Vuelve al preset Auth0 para validar discovery/JWKS y después configura la Application de ChatGPT con su callback exacta.'
        : 'Auth0 respondió, pero la configuración todavía no quedó completamente alineada. Revisa el diagnóstico devuelto.',
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const status = error instanceof Auth0ManagementError ? error.status : 502;
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo provisionar Auth0.',
      requiredManagementScopes: REQUIRED_MANAGEMENT_SCOPES,
      tokenStored: false,
    }, { status: status >= 400 && status < 600 ? status : 502, headers: { 'cache-control': 'no-store' } });
  }
}
