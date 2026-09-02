import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import { runOllamaAgent, type OllamaAgentResult } from '@/lib/ollamaAgent';
import { assertOllamaAgentProfile } from '@/lib/ollamaAgentAccess';

export type OllamaAgentTask = {
  id: string;
  tenant_id: string;
  key_id: string;
  label: string;
  prompt: string;
  provider: string;
  model: string;
  schedule_kind: 'manual' | 'daily' | 'weekly';
  weekday: number | null;
  allow_writes: boolean;
  enabled: boolean;
  status: 'idle' | 'running' | 'success' | 'error' | 'paused';
  last_run_at: string | null;
  last_result: Record<string, unknown> | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

function cleanText(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export async function listOllamaAgentTasks(tenantId: string) {
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data || []) as OllamaAgentTask[];
}

export async function createOllamaAgentTask(input: {
  tenantId: string;
  keyId: string;
  label: string;
  prompt: string;
  model: string;
  scheduleKind?: 'manual' | 'daily' | 'weekly';
  weekday?: number | null;
  allowWrites?: boolean;
  createdBy?: string | null;
}) {
  const label = cleanText(input.label, 120);
  const prompt = cleanText(input.prompt, 12000);
  const model = cleanText(input.model, 180);
  const keyId = cleanText(input.keyId, 32).toLowerCase();
  const scheduleKind = input.scheduleKind || 'manual';
  if (!label || !prompt || !model || !keyId) throw new Error('label, prompt, model y keyId son requeridos.');
  await assertOllamaAgentProfile(input.tenantId, keyId);
  const weekday = scheduleKind === 'weekly' ? Math.min(6, Math.max(0, Math.trunc(Number(input.weekday ?? 1)))) : null;
  const now = new Date().toISOString();
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks').insert([{
    tenant_id: input.tenantId,
    key_id: keyId,
    label,
    prompt,
    provider: 'ollama',
    model,
    schedule_kind: scheduleKind,
    weekday,
    allow_writes: input.allowWrites === true,
    enabled: true,
    status: 'idle',
    created_by: cleanText(input.createdBy, 180) || null,
    created_at: now,
    updated_at: now,
  }]).select('*').single();
  if (error) throw new Error(error.message);
  return data as OllamaAgentTask;
}

export async function updateOllamaAgentTask(tenantId: string, taskId: string, patch: { enabled?: boolean; allowWrites?: boolean; scheduleKind?: 'manual' | 'daily' | 'weekly'; weekday?: number | null; label?: string; prompt?: string; model?: string }) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.enabled !== undefined) {
    update.enabled = patch.enabled;
    update.status = patch.enabled ? 'idle' : 'paused';
  }
  if (patch.allowWrites !== undefined) update.allow_writes = patch.allowWrites;
  if (patch.scheduleKind) update.schedule_kind = patch.scheduleKind;
  if (patch.weekday !== undefined) update.weekday = patch.weekday === null ? null : Math.min(6, Math.max(0, Math.trunc(Number(patch.weekday))));
  if (patch.label !== undefined) update.label = cleanText(patch.label, 120);
  if (patch.prompt !== undefined) update.prompt = cleanText(patch.prompt, 12000);
  if (patch.model !== undefined) update.model = cleanText(patch.model, 180);
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks').update(update)
    .eq('tenant_id', tenantId).eq('id', taskId).select('*').single();
  if (error) throw new Error(error.message);
  return data as OllamaAgentTask;
}

function isDue(task: OllamaAgentTask, now = new Date()) {
  if (!task.enabled || task.schedule_kind === 'manual' || task.status === 'running') return false;
  const last = task.last_run_at ? new Date(task.last_run_at) : null;
  if (task.schedule_kind === 'daily') return !last || last.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
  if (task.schedule_kind === 'weekly') {
    if (now.getUTCDay() !== Number(task.weekday ?? 1)) return false;
    return !last || now.getTime() - last.getTime() >= 6 * 86_400_000;
  }
  return false;
}

export async function runOllamaAgentTask(task: OllamaAgentTask, origin: string): Promise<OllamaAgentResult> {
  const startedAt = new Date().toISOString();
  await insforgeAdmin.database.from('ai_agent_tasks').update({ status: 'running', last_error: null, updated_at: startedAt })
    .eq('tenant_id', task.tenant_id).eq('id', task.id);
  try {
    await assertOllamaAgentProfile(task.tenant_id, task.key_id);
    const result = await runOllamaAgent({
      tenantId: task.tenant_id,
      keyId: task.key_id,
      model: task.model,
      prompt: task.prompt,
      origin,
      allowWrites: task.allow_writes,
    });
    const finishedAt = new Date().toISOString();
    await Promise.all([
      insforgeAdmin.database.from('ai_agent_tasks').update({
        status: 'success',
        last_run_at: finishedAt,
        last_result: { response: result.response, toolCalls: result.toolCalls, approvals: result.approvals },
        last_error: null,
        updated_at: finishedAt,
      }).eq('tenant_id', task.tenant_id).eq('id', task.id),
      insforgeAdmin.database.from('ai_agent_runs').insert([{
        tenant_id: task.tenant_id,
        task_id: task.id,
        key_id: task.key_id,
        provider: 'ollama',
        model: task.model,
        prompt: task.prompt,
        response: result.response,
        trace: result.trace,
        status: 'success',
        started_at: startedAt,
        finished_at: finishedAt,
      }]),
    ]);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date().toISOString();
    await Promise.all([
      insforgeAdmin.database.from('ai_agent_tasks').update({ status: 'error', last_run_at: finishedAt, last_error: message.slice(0, 2000), updated_at: finishedAt })
        .eq('tenant_id', task.tenant_id).eq('id', task.id),
      insforgeAdmin.database.from('ai_agent_runs').insert([{
        tenant_id: task.tenant_id,
        task_id: task.id,
        key_id: task.key_id,
        provider: 'ollama',
        model: task.model,
        prompt: task.prompt,
        response: null,
        trace: [],
        status: 'error',
        error: message.slice(0, 4000),
        started_at: startedAt,
        finished_at: finishedAt,
      }]),
    ]);
    throw error;
  }
}

export async function runDueOllamaAgentTasks(origin: string) {
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks')
    .select('*')
    .eq('enabled', true)
    .in('schedule_kind', ['daily', 'weekly'])
    .order('updated_at', { ascending: true })
    .limit(30);
  if (error) throw new Error(error.message);
  const due = ((data || []) as OllamaAgentTask[]).filter((task) => isDue(task)).slice(0, 5);
  const results: Array<{ id: string; ok: boolean; response?: string; error?: string }> = [];
  for (const task of due) {
    try {
      const result = await runOllamaAgentTask(task, origin);
      results.push({ id: task.id, ok: true, response: result.response.slice(0, 500) });
    } catch (error) {
      results.push({ id: task.id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { checked: Array.isArray(data) ? data.length : 0, due: due.length, results };
}
