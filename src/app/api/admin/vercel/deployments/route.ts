import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { getVercelCredentials, vercelFetch } from '@/lib/vercelClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/vercel/deployments?limit=20
 *
 * Returns the most recent deployments for the configured Vercel project, so
 * the Root operator can pick which one to inspect on /admin/vercel-logs.
 *
 * Auth: Root/superadmin only. Credentials never leave the server.
 */

interface RawDeployment {
  uid?: string;
  url?: string;
  name?: string;
  state?: string;
  readyState?: string;
  target?: string | null;
  created?: number;
  createdAt?: number;
  meta?: Record<string, string>;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'admin', action: 'manage' });
  if (!auth.ok) return auth.response;

  const creds = await getVercelCredentials();
  if (!creds.apiToken || !creds.projectId) {
    return NextResponse.json(
      {
        error:
          'Vercel no configurado. Guarda `api_token` y `project_id` en /admin/configuracion (proveedor Vercel).',
        code: 'VERCEL_NOT_CONFIGURED',
        hint:
          'Crea un Personal Access Token en vercel.com → Account Settings → Tokens (scope mínimo: el equipo/proyecto a inspeccionar).',
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '20', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

  const result = await vercelFetch<{ deployments?: RawDeployment[] }>(
    '/v6/deployments',
    {
      token: creds.apiToken,
      teamId: creds.teamId,
      query: { projectId: creds.projectId, limit },
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { ...result.error, error: result.error.message },
      { status: result.error.statusCode ?? 502 },
    );
  }

  const deployments = (result.data.deployments ?? []).map((d) => ({
    id: d.uid ?? '',
    url: d.url ? `https://${d.url}` : undefined,
    name: d.name,
    state: d.readyState ?? d.state ?? 'UNKNOWN',
    target: d.target ?? null,
    createdAt: d.createdAt ?? d.created ?? 0,
    branch: d.meta?.githubCommitRef,
    commit: d.meta?.githubCommitSha?.slice(0, 7),
    commitMessage: d.meta?.githubCommitMessage,
  }));

  return NextResponse.json({
    ok: true,
    projectId: creds.projectId,
    teamId: creds.teamId ?? null,
    sources: creds.sources,
    deployments,
  });
}
