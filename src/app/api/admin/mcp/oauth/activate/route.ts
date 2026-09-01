import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getVercelCredentials } from '@/lib/vercelClient';
import { getMcpPublicBase } from '@/lib/mcp/oauth';
import { normalizePublicOAuthUrl } from '@/lib/mcp/oauthNetwork';
import { inspectMcpOAuthIssuer } from '@/lib/mcp/oauthReadiness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ENABLE_VALUES = {
  MCP_OAUTH_ENABLED: '1',
  MCP_OAUTH_METADATA_ENABLED: '1',
  MCP_OAUTH_ALLOWED_ALGS: 'RS256',
} as const;

const DISABLE_VALUES = {
  MCP_OAUTH_ENABLED: '0',
  MCP_OAUTH_METADATA_ENABLED: '0',
} as const;

type Target = 'preview' | 'production';
type Action = 'enable' | 'disable';
type VercelEnv = {
  id?: string;
  key?: string;
  value?: string;
  target?: string | string[];
  gitBranch?: string | null;
};

class VercelActivationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function envTarget(value: unknown): Target {
  return value === 'production' ? 'production' : 'preview';
}

function actionFrom(value: unknown): Action {
  return value === 'disable' ? 'disable' : 'enable';
}

function confirmationFor(action: Action, target: Target) {
  if (action === 'disable') return target === 'production' ? 'DESACTIVAR OAUTH PRODUCCION' : 'DESACTIVAR OAUTH PREVIEW';
  return target === 'production' ? 'ACTIVAR OAUTH PRODUCCION' : 'ACTIVAR OAUTH PREVIEW';
}

function runtimeContext() {
  const vercelEnv = String(process.env.VERCEL_ENV ?? '').trim().toLowerCase();
  const branch = String(process.env.VERCEL_GIT_COMMIT_REF ?? '').trim();
  return {
    vercelEnv: vercelEnv || 'unknown',
    branch,
    canPreview: vercelEnv === 'preview' && Boolean(branch),
    canProduction: vercelEnv === 'production' && (branch === '' || branch === 'main'),
  };
}

async function vercelApi<T>(input: {
  token: string;
  projectId: string;
  teamId?: string;
  method?: 'GET' | 'POST';
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}) {
  const url = new URL(`https://api.vercel.com${input.path}`);
  if (input.teamId) url.searchParams.set('teamId', input.teamId);
  for (const [key, value] of Object.entries(input.query ?? {})) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: input.method ?? 'GET',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
      headers: {
        authorization: `Bearer ${input.token}`,
        accept: 'application/json',
        ...(input.body ? { 'content-type': 'application/json' } : {}),
      },
      body: input.body ? JSON.stringify(input.body) : undefined,
    });
  } catch (error) {
    throw new VercelActivationError(502, error instanceof Error ? error.message : 'No se pudo contactar Vercel.');
  }

  const text = (await response.text()).slice(0, 512_000);
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? String(((data as Record<string, unknown>).error as Record<string, unknown> | undefined)?.message ?? (data as Record<string, unknown>).message ?? '').trim()
      : '';
    throw new VercelActivationError(response.status, message || `Vercel respondió HTTP ${response.status}.`);
  }
  return data as T;
}

function targets(value: VercelEnv['target']) {
  return Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
}

function matchingEnv(envs: VercelEnv[], key: string, target: Target, branch: string) {
  const candidates = envs.filter((env) => String(env.key ?? '') === key && targets(env.target).includes(target));
  if (target === 'preview') {
    return candidates.find((env) => String(env.gitBranch ?? '') === branch)
      ?? candidates.find((env) => !env.gitBranch)
      ?? null;
  }
  return candidates.find((env) => !env.gitBranch) ?? candidates[0] ?? null;
}

function summarize(envs: VercelEnv[], desired: Record<string, string>, target: Target, branch: string) {
  return Object.entries(desired).map(([key, value]) => {
    const current = matchingEnv(envs, key, target, branch);
    return {
      key,
      state: !current ? 'missing' : String(current.value ?? '') === value ? 'match' : 'different',
      hasBranchOverride: Boolean(current?.gitBranch),
    };
  });
}

async function listProjectEnvs(creds: { apiToken: string; projectId: string; teamId?: string }) {
  const result = await vercelApi<{ envs?: VercelEnv[] }>({
    token: creds.apiToken,
    projectId: creds.projectId,
    teamId: creds.teamId,
    path: `/v10/projects/${encodeURIComponent(creds.projectId)}/env`,
    query: { decrypt: 'true' },
  });
  return Array.isArray(result.envs) ? result.envs : [];
}

function desiredValues(action: Action, issuer: string, audience: string) {
  if (action === 'disable') return { ...DISABLE_VALUES };
  return {
    ...ENABLE_VALUES,
    MCP_OAUTH_ISSUER: issuer,
    MCP_OAUTH_AUDIENCE: audience,
  };
}

function assertTargetAllowed(target: Target, context: ReturnType<typeof runtimeContext>) {
  if (target === 'preview' && !context.canPreview) {
    throw new VercelActivationError(409, 'La activación Preview solo puede ejecutarse desde un deployment Preview con rama identificable.');
  }
  if (target === 'production' && !context.canProduction) {
    throw new VercelActivationError(409, 'Producción solo puede activarse desde el deployment de producción cuando este código ya exista en main.');
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  const context = runtimeContext();
  const creds = await getVercelCredentials();
  const base = getMcpPublicBase(new URL(request.url).origin);
  return NextResponse.json({
    ok: true,
    context,
    vercelConfigured: Boolean(creds.apiToken && creds.projectId),
    vercelSources: creds.sources,
    audience: `${base}/api/mcp`,
    confirmation: {
      previewEnable: confirmationFor('enable', 'preview'),
      previewDisable: confirmationFor('disable', 'preview'),
      productionEnable: confirmationFor('enable', 'production'),
      productionDisable: confirmationFor('disable', 'production'),
    },
  }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const target = envTarget(body.target);
  const action = actionFrom(body.action);
  const commit = body.commit === true;
  const context = runtimeContext();

  try {
    assertTargetAllowed(target, context);
    const credsRaw = await getVercelCredentials();
    if (!credsRaw.apiToken || !credsRaw.projectId) {
      throw new VercelActivationError(503, 'Vercel no está configurado. Guarda api_token y project_id en /admin/configuracion (proveedor Vercel).');
    }
    const creds = { apiToken: credsRaw.apiToken, projectId: credsRaw.projectId, teamId: credsRaw.teamId };
    const base = getMcpPublicBase(new URL(request.url).origin);
    const audience = `${base}/api/mcp`;

    let issuer = normalizePublicOAuthUrl(body.issuer);
    let readiness: Awaited<ReturnType<typeof inspectMcpOAuthIssuer>> | null = null;
    if (action === 'enable') {
      if (!issuer) throw new VercelActivationError(400, 'Ingresa un issuer OAuth HTTPS público.');
      if (body.resourceCompatibilityConfirmed !== true) {
        throw new VercelActivationError(409, 'Confirma primero Resource Parameter Compatibility Profile en Auth0.');
      }
      readiness = await inspectMcpOAuthIssuer({ issuer });
      issuer = readiness.issuer;
      if (!readiness.chatgptCoreReady) {
        throw new VercelActivationError(409, 'El issuer todavía no pasa los checks OAuth/JWKS/PKCE requeridos.');
      }
      if (target === 'production' && !readiness.persistentSessionReady) {
        throw new VercelActivationError(409, 'Producción requiere offline_access y refresh tokens para una sesión persistente.');
      }
    }

    const desired = desiredValues(action, issuer, audience);
    const current = await listProjectEnvs(creds);
    const before = summarize(current, desired, target, context.branch);
    const expectedConfirmation = confirmationFor(action, target);

    if (!commit) {
      return NextResponse.json({
        ok: true,
        commit: false,
        action,
        target,
        audience,
        issuer: action === 'enable' ? issuer : undefined,
        context,
        readiness,
        before,
        confirmationRequired: expectedConfirmation,
        redeployRequired: true,
      }, { headers: { 'cache-control': 'no-store' } });
    }

    if (String(body.confirmation ?? '').trim() !== expectedConfirmation) {
      throw new VercelActivationError(400, `Escribe exactamente: ${expectedConfirmation}`);
    }

    const payload = Object.entries(desired).map(([key, value]) => ({
      key,
      value,
      type: 'plain',
      target: [target],
      ...(target === 'preview' ? { gitBranch: context.branch } : {}),
      comment: `Soluciones Fabrick MCP OAuth · ${action} · ${new Date().toISOString()}`,
    }));

    await vercelApi({
      token: creds.apiToken,
      projectId: creds.projectId,
      teamId: creds.teamId,
      method: 'POST',
      path: `/v10/projects/${encodeURIComponent(creds.projectId)}/env`,
      query: { upsert: 'true' },
      body: payload,
    });

    const afterRaw = await listProjectEnvs(creds);
    const after = summarize(afterRaw, desired, target, context.branch);
    const aligned = after.every((item) => item.state === 'match');

    return NextResponse.json({
      ok: aligned,
      commit: true,
      action,
      target,
      audience,
      issuer: action === 'enable' ? issuer : undefined,
      context,
      before,
      after,
      redeployRequired: true,
      next: aligned
        ? 'Variables alineadas. Crea un nuevo deployment para que el runtime cargue la configuración y vuelve a ejecutar el smoke OAuth.'
        : 'Vercel aceptó la solicitud, pero alguna variable no quedó alineada. Revisa el estado devuelto antes de desplegar.',
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const status = error instanceof VercelActivationError ? error.status : 502;
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo preparar OAuth en Vercel.',
      context,
    }, { status: status >= 400 && status < 600 ? status : 502, headers: { 'cache-control': 'no-store' } });
  }
}
