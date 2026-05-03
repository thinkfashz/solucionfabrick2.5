import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE_NAME, decodeSession } from '@/lib/adminAuth';
import {
  filterLogsByLevel,
  getVercelCredentials,
  mapVercelEvent,
  vercelFetch,
  type VercelLogEntry,
} from '@/lib/vercelClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/vercel/logs?deployment=<id>&level=error|warning|all&limit=200
 *
 * Returns a normalised list of log entries (build + runtime) for the given
 * Vercel deployment. If no `deployment` is specified, the latest READY (or
 * most recent) deployment of the configured project is auto-selected so the
 * UI can do a single-click "ver errores recientes".
 *
 * Auth: admin session cookie required. Token never leaves the server.
 */

interface RawDeployment {
  uid?: string;
  readyState?: string;
  state?: string;
  createdAt?: number;
  created?: number;
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME);
  if (!cookie?.value) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const session = await decodeSession(cookie.value);
  if (!session) return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 });

  const creds = await getVercelCredentials();
  if (!creds.apiToken || !creds.projectId) {
    return NextResponse.json(
      {
        error:
          'Vercel no configurado. Guarda `api_token` y `project_id` en /admin/configuracion (proveedor Vercel).',
        code: 'VERCEL_NOT_CONFIGURED',
        hint:
          'Crea un Personal Access Token en vercel.com → Account Settings → Tokens y vincúlalo al proyecto.',
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  let deploymentId = url.searchParams.get('deployment')?.trim() ?? '';
  const levelRaw = (url.searchParams.get('level') ?? 'error').toLowerCase();
  const level: 'all' | 'warning' | 'error' =
    levelRaw === 'all' || levelRaw === 'warning' || levelRaw === 'error' ? levelRaw : 'error';
  const limitRaw = Number.parseInt(url.searchParams.get('limit') ?? '200', 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 10), 1000) : 200;

  // Auto-pick the most recent deployment when none is specified.
  if (!deploymentId) {
    const list = await vercelFetch<{ deployments?: RawDeployment[] }>(
      '/v6/deployments',
      {
        token: creds.apiToken,
        teamId: creds.teamId,
        query: { projectId: creds.projectId, limit: 5 },
      },
    );
    if (!list.ok) {
      return NextResponse.json(
        { ...list.error, error: list.error.message },
        { status: list.error.statusCode ?? 502 },
      );
    }
    const deployments = list.data.deployments ?? [];
    const ready = deployments.find((d) => (d.readyState ?? d.state) === 'READY');
    deploymentId = (ready?.uid ?? deployments[0]?.uid ?? '').trim();
    if (!deploymentId) {
      return NextResponse.json(
        {
          error: 'No hay deployments para este proyecto en Vercel.',
          code: 'VERCEL_NO_DEPLOYMENTS',
          hint: 'Verifica que `project_id` (prj_xxx) corresponda al proyecto correcto.',
        },
        { status: 404 },
      );
    }
  }

  // Fetch build + runtime events. `builds=1` includes build-step logs, which
  // is what surfaces compile/Type errors and module-not-found failures.
  const eventsRes = await vercelFetch<unknown>(
    `/v3/deployments/${encodeURIComponent(deploymentId)}/events`,
    {
      token: creds.apiToken,
      teamId: creds.teamId,
      query: { builds: 1, direction: 'backward', limit },
    },
  );

  if (!eventsRes.ok) {
    return NextResponse.json(
      { ...eventsRes.error, error: eventsRes.error.message },
      { status: eventsRes.error.statusCode ?? 502 },
    );
  }

  // Vercel sometimes returns the events as a top-level array, sometimes as
  // `{events: [...]}` depending on the deployment age. Handle both.
  const raw = eventsRes.data;
  const eventList: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { events?: unknown }).events)
      ? ((raw as { events: unknown[] }).events)
      : [];

  const mapped: VercelLogEntry[] = [];
  for (const ev of eventList) {
    if (!ev || typeof ev !== 'object') continue;
    const entry = mapVercelEvent(ev as never, deploymentId);
    if (entry) mapped.push(entry);
  }
  // Newest first.
  mapped.sort((a, b) => b.ts - a.ts);

  const filtered = filterLogsByLevel(mapped, level);

  return NextResponse.json({
    ok: true,
    deploymentId,
    level,
    total: mapped.length,
    counts: {
      error: mapped.filter((l) => l.level === 'error').length,
      warning: mapped.filter((l) => l.level === 'warning').length,
      info: mapped.filter((l) => l.level === 'info').length,
    },
    logs: filtered,
  });
}
