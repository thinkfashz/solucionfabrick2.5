import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const JOBS = [
  { id: 'system-health', path: '/api/cron/system-health' },
  { id: 'integrations-health', path: '/api/cron/integrations-healthcheck' },
  { id: 'expire-trials', path: '/api/cron/expire-trials' },
  { id: 'price-watch', path: '/api/cron/intelligence-price-watch' },
  { id: 'daily-brief', path: '/api/cron/intelligence-daily-brief' },
] as const;

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

async function authorized(request: NextRequest) {
  if (cronAuthorized(request)) return true;
  const session = await getAdminSession(request);
  return Boolean(session && ['admin', 'superadmin'].includes(session.rol || 'viewer'));
}

async function runJob(origin: string, authHeader: string | null, job: (typeof JOBS)[number]) {
  const startedAt = Date.now();
  try {
    const headers: HeadersInit = { 'x-fabrick-orchestrator': 'daily-v1' };
    if (authHeader) headers.Authorization = authHeader;

    const response = await fetch(new URL(job.path, origin), {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = await response.text().catch(() => null);
    }

    return {
      id: job.id,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      payload,
    };
  } catch (error) {
    return {
      id: job.id,
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const authHeader = request.headers.get('authorization');
  const origin = request.nextUrl.origin;
  const startedAt = new Date().toISOString();

  // Run independent maintenance jobs concurrently so the orchestrator stays
  // inside Hobby function duration while each route keeps its own isolation,
  // logging and error handling.
  const results = await Promise.all(JOBS.map((job) => runJob(origin, authHeader, job)));
  const failures = results.filter((result) => !result.ok);

  return NextResponse.json({
    ok: failures.length === 0,
    startedAt,
    finishedAt: new Date().toISOString(),
    jobs: results.length,
    failures: failures.length,
    results,
  }, {
    status: failures.length === results.length ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
