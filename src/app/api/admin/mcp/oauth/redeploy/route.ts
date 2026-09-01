import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getVercelCredentials } from '@/lib/vercelClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Target = 'preview' | 'production';
type DeploymentInfo = {
  id?: string;
  name?: string;
  url?: string;
  readyState?: string;
  status?: string;
  target?: string | null;
  createdAt?: number;
  meta?: Record<string, unknown>;
};

class RedeployError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function targetFrom(value: unknown): Target {
  return value === 'production' ? 'production' : 'preview';
}

function runtimeContext() {
  const vercelEnv = String(process.env.VERCEL_ENV ?? '').trim().toLowerCase();
  const branch = String(process.env.VERCEL_GIT_COMMIT_REF ?? '').trim();
  const deploymentId = String(process.env.VERCEL_DEPLOYMENT_ID ?? '').trim();
  return {
    vercelEnv: vercelEnv || 'unknown',
    branch,
    deploymentId,
    canPreview: vercelEnv === 'preview' && Boolean(branch) && /^dpl_[A-Za-z0-9]+$/.test(deploymentId),
    canProduction: vercelEnv === 'production' && (branch === '' || branch === 'main') && /^dpl_[A-Za-z0-9]+$/.test(deploymentId),
  };
}

function confirmationFor(target: Target) {
  return target === 'production' ? 'REDESPLEGAR OAUTH PRODUCCION' : 'REDESPLEGAR OAUTH PREVIEW';
}

function assertTargetAllowed(target: Target, context: ReturnType<typeof runtimeContext>) {
  if (target === 'preview' && !context.canPreview) {
    throw new RedeployError(409, 'El redeploy Preview solo puede iniciarse desde un deployment Preview con rama y deployment ID identificables.');
  }
  if (target === 'production' && !context.canProduction) {
    throw new RedeployError(409, 'El redeploy de producción solo puede iniciarse desde el runtime productivo de main.');
  }
}

async function vercelApi<T>(input: {
  token: string;
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
    throw new RedeployError(502, error instanceof Error ? error.message : 'No se pudo contactar Vercel.');
  }

  const text = (await response.text()).slice(0, 512_000);
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const message = data && typeof data === 'object'
      ? String(((data as Record<string, unknown>).error as Record<string, unknown> | undefined)?.message ?? (data as Record<string, unknown>).message ?? '').trim()
      : '';
    throw new RedeployError(response.status, message || `Vercel respondió HTTP ${response.status}.`);
  }
  return data as T;
}

async function getDeployment(creds: { apiToken: string; teamId?: string }, id: string) {
  return vercelApi<DeploymentInfo>({
    token: creds.apiToken,
    teamId: creds.teamId,
    path: `/v13/deployments/${encodeURIComponent(id)}`,
  });
}

function verifySource(source: DeploymentInfo, target: Target, context: ReturnType<typeof runtimeContext>) {
  const sourceBranch = String(source.meta?.githubCommitRef ?? '').trim();
  const sourceSha = String(source.meta?.githubCommitSha ?? '').trim();
  const currentSha = String(process.env.VERCEL_GIT_COMMIT_SHA ?? '').trim();

  if (target === 'preview') {
    if (!sourceBranch || sourceBranch !== context.branch) {
      throw new RedeployError(409, 'El deployment de origen no pertenece a la rama Preview actual.');
    }
  } else if (sourceBranch && sourceBranch !== 'main') {
    throw new RedeployError(409, 'El deployment productivo de origen no pertenece a main.');
  }

  if (currentSha && sourceSha && currentSha !== sourceSha) {
    throw new RedeployError(409, 'El deployment de origen no coincide con el SHA que está ejecutando este panel.');
  }

  return { sourceBranch, sourceSha };
}

async function productionSmoke() {
  const metadataUrl = 'https://www.solucionesfabrick.com/.well-known/oauth-protected-resource/api/mcp';
  const mcpUrl = 'https://www.solucionesfabrick.com/api/mcp';
  try {
    const [metadataResponse, mcpResponse] = await Promise.all([
      fetch(metadataUrl, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(12_000) }),
      fetch(mcpUrl, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(12_000) }),
    ]);
    const metadataText = (await metadataResponse.text()).slice(0, 32_000);
    let metadata: unknown = null;
    try { metadata = metadataText ? JSON.parse(metadataText) : null; } catch { metadata = null; }
    const challenge = mcpResponse.headers.get('www-authenticate') ?? '';
    return {
      checked: true,
      metadata: {
        status: metadataResponse.status,
        noStore: (metadataResponse.headers.get('cache-control') ?? '').toLowerCase().includes('no-store'),
        body: metadata && typeof metadata === 'object' ? metadata : null,
      },
      mcpChallenge: {
        status: mcpResponse.status,
        hasBearer: /^Bearer\b/i.test(challenge),
        hasResourceMetadata: /resource_metadata=/i.test(challenge),
      },
      healthy: metadataResponse.status === 200 && mcpResponse.status === 401 && /^Bearer\b/i.test(challenge) && /resource_metadata=/i.test(challenge),
    };
  } catch (error) {
    return {
      checked: true,
      healthy: false,
      error: error instanceof Error ? error.message : 'No se pudo ejecutar el smoke OAuth de producción.',
    };
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  const id = String(request.nextUrl.searchParams.get('id') ?? '').trim();
  if (!/^dpl_[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ error: 'Deployment ID inválido.' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  try {
    const credsRaw = await getVercelCredentials();
    if (!credsRaw.apiToken || !credsRaw.projectId) throw new RedeployError(503, 'Vercel no está configurado.');
    const creds = { apiToken: credsRaw.apiToken, projectId: credsRaw.projectId, teamId: credsRaw.teamId };
    const deployment = await getDeployment(creds, id);
    const target = deployment.target === 'production' ? 'production' : 'preview';
    const readyState = String(deployment.readyState ?? deployment.status ?? 'UNKNOWN').toUpperCase();
    const context = runtimeContext();

    const smoke = readyState === 'READY' && target === 'production'
      ? await productionSmoke()
      : readyState === 'READY'
        ? { checked: false, healthy: null, reason: 'El preview puede estar protegido por Vercel SSO; la verificación HTTP pública se reserva para producción.' }
        : { checked: false, healthy: null, reason: 'El deployment todavía no está READY.' };

    return NextResponse.json({
      ok: true,
      deployment: {
        id: String(deployment.id ?? id),
        url: deployment.url ? `https://${deployment.url}` : '',
        readyState,
        target,
        branch: String(deployment.meta?.githubCommitRef ?? ''),
        sha: String(deployment.meta?.githubCommitSha ?? ''),
      },
      context,
      smoke,
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const status = error instanceof RedeployError ? error.status : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo consultar el deployment.' }, {
      status: status >= 400 && status < 600 ? status : 502,
      headers: { 'cache-control': 'no-store' },
    });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const target = targetFrom(body.target);
  const context = runtimeContext();

  try {
    assertTargetAllowed(target, context);
    const expected = confirmationFor(target);
    if (String(body.confirmation ?? '').trim() !== expected) {
      throw new RedeployError(400, `Escribe exactamente: ${expected}`);
    }

    const credsRaw = await getVercelCredentials();
    if (!credsRaw.apiToken || !credsRaw.projectId) throw new RedeployError(503, 'Vercel no está configurado.');
    const creds = { apiToken: credsRaw.apiToken, projectId: credsRaw.projectId, teamId: credsRaw.teamId };
    const source = await getDeployment(creds, context.deploymentId);
    const verified = verifySource(source, target, context);
    const name = String(source.name ?? '').trim();
    if (!name) throw new RedeployError(409, 'No se pudo resolver el nombre del proyecto desde el deployment de origen.');

    const created = await vercelApi<DeploymentInfo>({
      token: creds.apiToken,
      teamId: creds.teamId,
      method: 'POST',
      path: '/v13/deployments',
      query: { forceNew: '1' },
      body: {
        name,
        project: creds.projectId,
        deploymentId: context.deploymentId,
        ...(target === 'production' ? { target: 'production' } : {}),
      },
    });

    const id = String(created.id ?? '').trim();
    if (!/^dpl_[A-Za-z0-9]+$/.test(id)) throw new RedeployError(502, 'Vercel no devolvió un deployment ID válido.');

    return NextResponse.json({
      ok: true,
      source: {
        id: context.deploymentId,
        branch: verified.sourceBranch,
        sha: verified.sourceSha,
      },
      deployment: {
        id,
        url: created.url ? `https://${created.url}` : '',
        readyState: String(created.readyState ?? created.status ?? 'QUEUED').toUpperCase(),
        target,
      },
      next: 'El nuevo deployment usa el mismo snapshot de código y volverá a cargar las variables del destino. El panel puede consultar su estado hasta READY.',
    }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const status = error instanceof RedeployError ? error.status : 502;
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo crear el redeploy OAuth.',
      context,
    }, { status: status >= 400 && status < 600 ? status : 502, headers: { 'cache-control': 'no-store' } });
  }
}
