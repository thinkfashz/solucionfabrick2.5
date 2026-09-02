import { NextResponse, type NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/adminApi';
import { listDueHarnessAgentTasks, recordHarnessAgentTaskRun, type HarnessAgentTask } from '@/lib/mcp/agentTasks';
import { runHarnessAgentTask } from '@/lib/mcp/agentTaskRunner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

async function authorized(request: NextRequest) {
  if (cronAuthorized(request)) return true;
  const session = await getAdminSession(request);
  return Boolean(session && ['admin', 'superadmin'].includes(session.rol || 'viewer'));
}

async function runOne(task: HarnessAgentTask) {
  const started = Date.now();
  try {
    const result = await runHarnessAgentTask(task, { allowCommit: task.allowWrites, scheduled: true });
    const compact = {
      content: result.content.slice(0, 8000),
      toolTrace: result.toolTrace.slice(0, 30),
      steps: result.steps,
      usage: result.usage,
      stoppedByLimit: result.stoppedByLimit,
    };
    await recordHarnessAgentTaskRun(task, { status: 'ok', result: compact });
    return { id: task.id, title: task.title, ok: true, durationMs: Date.now() - started, result: compact };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordHarnessAgentTaskRun(task, { status: 'error', result: { error: message } }).catch(() => undefined);
    return { id: task.id, title: task.title, ok: false, durationMs: Date.now() - started, error: message };
  }
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const tasks = await listDueHarnessAgentTasks(4);
    if (!tasks.length) {
      return NextResponse.json({ ok: true, due: 0, executed: 0, results: [] }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
    }
    const results = await Promise.all(tasks.map(runOne));
    const failures = results.filter((item) => !item.ok);
    return NextResponse.json({
      ok: failures.length === 0,
      due: tasks.length,
      executed: results.length,
      failures: failures.length,
      results,
    }, { status: failures.length === results.length ? 503 : 200, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron ejecutar las tareas.' }, { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
