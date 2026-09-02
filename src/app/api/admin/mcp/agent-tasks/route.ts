import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import {
  createHarnessAgentTask,
  deleteHarnessAgentTask,
  getHarnessAgentTask,
  listHarnessAgentTasks,
  recordHarnessAgentTaskRun,
  updateHarnessAgentTask,
} from '@/lib/mcp/agentTasks';
import { runHarnessAgentTask } from '@/lib/mcp/agentTaskRunner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  try {
    const tasks = await listHarnessAgentTasks(auth.ctx.tenantId);
    return NextResponse.json({ tasks }, { headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar las tareas.' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400, headers: NO_STORE });
  }

  const action = String(body.action || 'create');
  try {
    if (action === 'create') {
      const task = await createHarnessAgentTask(auth.ctx.tenantId, body);
      return NextResponse.json({ ok: true, task }, { headers: NO_STORE });
    }
    if (action === 'update') {
      const task = await updateHarnessAgentTask(auth.ctx.tenantId, String(body.taskId || ''), body);
      return NextResponse.json({ ok: true, task }, { headers: NO_STORE });
    }
    if (action === 'delete') {
      await deleteHarnessAgentTask(auth.ctx.tenantId, String(body.taskId || ''));
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }
    if (action === 'run') {
      const task = await getHarnessAgentTask(auth.ctx.tenantId, String(body.taskId || ''));
      if (!task) return NextResponse.json({ error: 'Tarea no encontrada.' }, { status: 404, headers: NO_STORE });
      try {
        const result = await runHarnessAgentTask(task, { allowCommit: body.allowCommit === true });
        await recordHarnessAgentTaskRun(task, {
          status: 'ok',
          result: {
            content: result.content.slice(0, 8000),
            toolTrace: result.toolTrace.slice(0, 30),
            steps: result.steps,
            usage: result.usage,
            stoppedByLimit: result.stoppedByLimit,
          },
        });
        return NextResponse.json({ ok: true, result }, { headers: NO_STORE });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo ejecutar la tarea.';
        await recordHarnessAgentTaskRun(task, { status: 'error', result: { error: message } }).catch(() => undefined);
        throw error;
      }
    }
    return NextResponse.json({ error: 'Acción no permitida.' }, { status: 400, headers: NO_STORE });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar la tarea.' }, { status: 500, headers: NO_STORE });
  }
}
