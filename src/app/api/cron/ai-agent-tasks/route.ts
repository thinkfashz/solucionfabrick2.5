import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { runDueAgentTasks } from '@/lib/agentTasks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

async function authorized(request: NextRequest) {
  if (cronAuthorized(request)) return true;
  const session = await getAdminSession(request);
  return Boolean(session && ['admin', 'superadmin'].includes(session.rol || 'viewer'));
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  try {
    const result = await runDueAgentTasks(request.nextUrl.origin);
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron ejecutar las tareas del agente.' }, { status: 500 });
  }
}
