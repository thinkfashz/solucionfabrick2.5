import { NextResponse, type NextRequest } from 'next/server';
import { requireTenantAdmin } from '@/lib/tenantAdmin';
import { createAgentTask, listAgentTasks, runAgentTask, updateAgentTask } from '@/lib/agentTasks';
import type { AiProvider } from '@/lib/resolveAiConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

export async function GET(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;
  try {
    const tasks = await listAgentTasks(auth.ctx.tenantId);
    return NextResponse.json({ ok: true, tasks }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron cargar las tareas.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireTenantAdmin(request, { resource: 'integrations', action: 'update' });
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }
  const action = String(body.action || 'create');
  try {
    if (action === 'create') {
      const task = await createAgentTask({
        tenantId: auth.ctx.tenantId,
        keyId: String(body.keyId || ''),
        label: String(body.label || ''),
        prompt: String(body.prompt || ''),
        provider: String(body.provider || 'ollama') as AiProvider,
        model: String(body.model || ''),
        scheduleKind: String(body.scheduleKind || 'manual') as 'manual' | 'daily' | 'weekly',
        weekday: body.weekday === undefined || body.weekday === null ? null : Number(body.weekday),
        allowWrites: body.allowWrites === true,
        memoryEnabled: body.memoryEnabled !== false,
        createdBy: auth.ctx.session.email || null,
      });
      return NextResponse.json({ ok: true, task });
    }
    if (action === 'update') {
      const taskId = String(body.taskId || '');
      if (!taskId) return NextResponse.json({ error: 'taskId requerido.' }, { status: 400 });
      const task = await updateAgentTask(auth.ctx.tenantId, taskId, {
        enabled: body.enabled === undefined ? undefined : body.enabled === true,
        allowWrites: body.allowWrites === undefined ? undefined : body.allowWrites === true,
        memoryEnabled: body.memoryEnabled === undefined ? undefined : body.memoryEnabled === true,
        scheduleKind: body.scheduleKind ? String(body.scheduleKind) as 'manual' | 'daily' | 'weekly' : undefined,
        weekday: body.weekday === undefined ? undefined : body.weekday === null ? null : Number(body.weekday),
        label: body.label === undefined ? undefined : String(body.label),
        prompt: body.prompt === undefined ? undefined : String(body.prompt),
        provider: body.provider === undefined ? undefined : String(body.provider) as AiProvider,
        model: body.model === undefined ? undefined : String(body.model),
        keyId: body.keyId === undefined ? undefined : String(body.keyId),
      });
      return NextResponse.json({ ok: true, task });
    }
    if (action === 'run') {
      const taskId = String(body.taskId || '');
      const tasks = await listAgentTasks(auth.ctx.tenantId);
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return NextResponse.json({ error: 'Tarea no encontrada.' }, { status: 404 });
      const result = await runAgentTask(task, request.nextUrl.origin);
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ error: 'Acción no soportada.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo completar la acción.' }, { status: 500 });
  }
}
