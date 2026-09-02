import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';

export type AgentTaskCadence = 'manual' | 'hourly' | 'daily';
export type HarnessAgentTask = {
  id: string;
  tenantId: string;
  provider: 'ollama';
  model: string;
  title: string;
  prompt: string;
  cadence: AgentTaskCadence;
  enabled: boolean;
  allowWrites: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastResult: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

type TaskRow = Record<string, unknown>;

function cleanText(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cadence(value: unknown): AgentTaskCadence {
  return value === 'hourly' || value === 'daily' ? value : 'manual';
}

function rowToTask(row: TaskRow): HarnessAgentTask {
  return {
    id: String(row.id || ''),
    tenantId: String(row.tenant_id || ''),
    provider: 'ollama',
    model: String(row.model || ''),
    title: String(row.title || ''),
    prompt: String(row.prompt || ''),
    cadence: cadence(row.cadence),
    enabled: row.enabled === true,
    allowWrites: row.allow_writes === true,
    nextRunAt: row.next_run_at ? String(row.next_run_at) : null,
    lastRunAt: row.last_run_at ? String(row.last_run_at) : null,
    lastStatus: row.last_status ? String(row.last_status) : null,
    lastResult: row.last_result && typeof row.last_result === 'object' && !Array.isArray(row.last_result) ? row.last_result as Record<string, unknown> : {},
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export function nextAgentTaskRun(taskCadence: AgentTaskCadence, from = new Date()) {
  if (taskCadence === 'manual') return null;
  const ms = taskCadence === 'hourly' ? 3_600_000 : 86_400_000;
  return new Date(from.getTime() + ms).toISOString();
}

export async function listHarnessAgentTasks(tenantId: string) {
  const { data, error } = await insforgeAdmin.database.from('mcp_agent_tasks')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message || 'No se pudieron cargar las tareas del agente.');
  return ((data || []) as TaskRow[]).map(rowToTask);
}

export async function getHarnessAgentTask(tenantId: string, taskId: string) {
  const id = cleanText(taskId, 120);
  if (!id) throw new Error('TASK_ID_REQUIRED');
  const { data, error } = await insforgeAdmin.database.from('mcp_agent_tasks')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .limit(1);
  if (error) throw new Error(error.message || 'No se pudo cargar la tarea.');
  return Array.isArray(data) && data[0] ? rowToTask(data[0] as TaskRow) : null;
}

export async function createHarnessAgentTask(tenantId: string, input: {
  title?: unknown;
  prompt?: unknown;
  model?: unknown;
  cadence?: unknown;
  enabled?: unknown;
  allowWrites?: unknown;
}) {
  const title = cleanText(input.title, 120);
  const prompt = cleanText(input.prompt, 8000);
  const model = cleanText(input.model, 180);
  const taskCadence = cadence(input.cadence);
  if (!title || !prompt || !model) throw new Error('Título, instrucción y modelo son requeridos.');
  const enabled = input.enabled === true && taskCadence !== 'manual';
  const now = new Date();
  const payload = {
    tenant_id: tenantId,
    provider: 'ollama',
    model,
    title,
    prompt,
    cadence: taskCadence,
    enabled,
    allow_writes: input.allowWrites === true,
    next_run_at: enabled ? nextAgentTaskRun(taskCadence, now) : null,
    last_result: {},
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  const { data, error } = await insforgeAdmin.database.from('mcp_agent_tasks').insert([payload]).select('*');
  if (error || !Array.isArray(data) || !data[0]) throw new Error(error?.message || 'No se pudo crear la tarea.');
  return rowToTask(data[0] as TaskRow);
}

export async function updateHarnessAgentTask(tenantId: string, taskId: string, input: {
  title?: unknown;
  prompt?: unknown;
  model?: unknown;
  cadence?: unknown;
  enabled?: unknown;
  allowWrites?: unknown;
}) {
  const current = await getHarnessAgentTask(tenantId, taskId);
  if (!current) throw new Error('Tarea no encontrada.');
  const nextCadence = input.cadence === undefined ? current.cadence : cadence(input.cadence);
  const enabled = typeof input.enabled === 'boolean' ? input.enabled && nextCadence !== 'manual' : current.enabled && nextCadence !== 'manual';
  const patch: Record<string, unknown> = {
    title: input.title === undefined ? current.title : cleanText(input.title, 120),
    prompt: input.prompt === undefined ? current.prompt : cleanText(input.prompt, 8000),
    model: input.model === undefined ? current.model : cleanText(input.model, 180),
    cadence: nextCadence,
    enabled,
    allow_writes: typeof input.allowWrites === 'boolean' ? input.allowWrites : current.allowWrites,
    updated_at: new Date().toISOString(),
  };
  if (!patch.title || !patch.prompt || !patch.model) throw new Error('Título, instrucción y modelo no pueden quedar vacíos.');
  if (nextCadence === 'manual') patch.next_run_at = null;
  else if (!enabled) patch.next_run_at = null;
  else if (!current.enabled || current.cadence !== nextCadence || !current.nextRunAt) patch.next_run_at = nextAgentTaskRun(nextCadence);

  const { data, error } = await insforgeAdmin.database.from('mcp_agent_tasks')
    .update(patch)
    .eq('tenant_id', tenantId)
    .eq('id', current.id)
    .select('*');
  if (error || !Array.isArray(data) || !data[0]) throw new Error(error?.message || 'No se pudo actualizar la tarea.');
  return rowToTask(data[0] as TaskRow);
}

export async function deleteHarnessAgentTask(tenantId: string, taskId: string) {
  const { error } = await insforgeAdmin.database.from('mcp_agent_tasks')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', cleanText(taskId, 120));
  if (error) throw new Error(error.message || 'No se pudo eliminar la tarea.');
}

export async function listDueHarnessAgentTasks(limit = 8) {
  const now = new Date().toISOString();
  const { data, error } = await insforgeAdmin.database.from('mcp_agent_tasks')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(Math.max(1, Math.min(20, limit)));
  if (error) throw new Error(error.message || 'No se pudieron cargar tareas pendientes.');
  return ((data || []) as TaskRow[]).map(rowToTask);
}

export async function recordHarnessAgentTaskRun(task: HarnessAgentTask, input: {
  status: 'ok' | 'error';
  result: Record<string, unknown>;
}) {
  const now = new Date();
  const patch = {
    last_run_at: now.toISOString(),
    last_status: input.status,
    last_result: input.result,
    next_run_at: task.enabled ? nextAgentTaskRun(task.cadence, now) : null,
    updated_at: now.toISOString(),
  };
  const { error } = await insforgeAdmin.database.from('mcp_agent_tasks')
    .update(patch)
    .eq('tenant_id', task.tenantId)
    .eq('id', task.id);
  if (error) throw new Error(error.message || 'No se pudo registrar el resultado de la tarea.');
}
