import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import { runGovernedAgent, type GovernedAgentResult } from '@/lib/governedAgent';
import { assertOllamaAgentProfile } from '@/lib/ollamaAgentAccess';
import type { AiProvider } from '@/lib/resolveAiConfig';

export type AgentTask = {
  id: string;
  tenant_id: string;
  key_id: string;
  label: string;
  prompt: string;
  provider: AiProvider;
  model: string;
  schedule_kind: 'manual' | 'daily' | 'weekly';
  weekday: number | null;
  allow_writes: boolean;
  memory_enabled: boolean;
  conversation_id: string | null;
  enabled: boolean;
  status: 'idle' | 'running' | 'success' | 'error' | 'paused';
  last_run_at: string | null;
  last_result: Record<string, unknown> | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

const PROVIDERS = new Set<AiProvider>(['ollama','gemini','grok','openrouter','anthropic','openai','groq','custom']);

function cleanText(value: unknown, max: number) { return String(value ?? '').trim().slice(0, max); }

export async function listAgentTasks(tenantId: string) {
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks').select('*').eq('tenant_id', tenantId).order('updated_at', { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data || []) as AgentTask[];
}

export async function createAgentTask(input: {
  tenantId: string;
  keyId: string;
  label: string;
  prompt: string;
  provider: AiProvider;
  model: string;
  scheduleKind?: 'manual' | 'daily' | 'weekly';
  weekday?: number | null;
  allowWrites?: boolean;
  memoryEnabled?: boolean;
  createdBy?: string | null;
}) {
  const label = cleanText(input.label, 120);
  const prompt = cleanText(input.prompt, 12000);
  const model = cleanText(input.model, 180);
  const keyId = cleanText(input.keyId, 32).toLowerCase();
  const provider = input.provider;
  const scheduleKind = input.scheduleKind || 'manual';
  if (!PROVIDERS.has(provider)) throw new Error('AI_AGENT_PROVIDER_UNSUPPORTED');
  if (!label || !prompt || !model || !keyId) throw new Error('label, prompt, provider, model y keyId son requeridos.');
  await assertOllamaAgentProfile(input.tenantId, keyId);
  const weekday = scheduleKind === 'weekly' ? Math.min(6, Math.max(0, Math.trunc(Number(input.weekday ?? 1)))) : null;
  const now = new Date().toISOString();
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks').insert([{
    tenant_id: input.tenantId,
    key_id: keyId,
    label,
    prompt,
    provider,
    model,
    schedule_kind: scheduleKind,
    weekday,
    allow_writes: input.allowWrites === true,
    memory_enabled: input.memoryEnabled !== false,
    conversation_id: null,
    enabled: true,
    status: 'idle',
    created_by: cleanText(input.createdBy, 180) || null,
    created_at: now,
    updated_at: now,
  }]).select('*').single();
  if (error) throw new Error(error.message);
  return data as AgentTask;
}

export async function updateAgentTask(tenantId: string, taskId: string, patch: {
  enabled?: boolean;
  allowWrites?: boolean;
  memoryEnabled?: boolean;
  scheduleKind?: 'manual' | 'daily' | 'weekly';
  weekday?: number | null;
  label?: string;
  prompt?: string;
  provider?: AiProvider;
  model?: string;
  keyId?: string;
}) {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.enabled !== undefined) { update.enabled = patch.enabled; update.status = patch.enabled ? 'idle' : 'paused'; }
  if (patch.allowWrites !== undefined) update.allow_writes = patch.allowWrites;
  if (patch.memoryEnabled !== undefined) update.memory_enabled = patch.memoryEnabled;
  if (patch.scheduleKind) update.schedule_kind = patch.scheduleKind;
  if (patch.weekday !== undefined) update.weekday = patch.weekday === null ? null : Math.min(6, Math.max(0, Math.trunc(Number(patch.weekday))));
  if (patch.label !== undefined) update.label = cleanText(patch.label, 120);
  if (patch.prompt !== undefined) update.prompt = cleanText(patch.prompt, 12000);
  if (patch.provider !== undefined) { if (!PROVIDERS.has(patch.provider)) throw new Error('AI_AGENT_PROVIDER_UNSUPPORTED'); update.provider = patch.provider; }
  if (patch.model !== undefined) update.model = cleanText(patch.model, 180);
  if (patch.keyId !== undefined) { const keyId = cleanText(patch.keyId, 32).toLowerCase(); await assertOllamaAgentProfile(tenantId, keyId); update.key_id = keyId; }
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks').update(update).eq('tenant_id', tenantId).eq('id', taskId).select('*').single();
  if (error) throw new Error(error.message);
  return data as AgentTask;
}

function isDue(task: AgentTask, now = new Date()) {
  if (!task.enabled || task.schedule_kind === 'manual' || task.status === 'running') return false;
  const last = task.last_run_at ? new Date(task.last_run_at) : null;
  if (task.schedule_kind === 'daily') return !last || last.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
  if (task.schedule_kind === 'weekly') {
    if (now.getUTCDay() !== Number(task.weekday ?? 1)) return false;
    return !last || now.getTime() - last.getTime() >= 6 * 86_400_000;
  }
  return false;
}

export async function runAgentTask(task: AgentTask, origin: string): Promise<GovernedAgentResult> {
  const startedAt = new Date().toISOString();
  await insforgeAdmin.database.from('ai_agent_tasks').update({ status: 'running', last_error: null, updated_at: startedAt }).eq('tenant_id', task.tenant_id).eq('id', task.id);
  try {
    await assertOllamaAgentProfile(task.tenant_id, task.key_id);
    const result = await runGovernedAgent({
      tenantId: task.tenant_id,
      keyId: task.key_id,
      provider: task.provider,
      model: task.model,
      prompt: task.prompt,
      origin,
      allowWrites: task.allow_writes,
      conversationId: task.memory_enabled ? task.conversation_id : null,
      createdBy: task.created_by,
    });
    const finishedAt = new Date().toISOString();
    await Promise.all([
      insforgeAdmin.database.from('ai_agent_tasks').update({
        status: 'success',
        conversation_id: task.memory_enabled ? result.conversationId : task.conversation_id,
        last_run_at: finishedAt,
        last_result: { response: result.response, provider: result.provider, model: result.model, toolCalls: result.toolCalls, approvals: result.approvals, memoriesUsed: result.memoriesUsed, conversationId: result.conversationId },
        last_error: null,
        updated_at: finishedAt,
      }).eq('tenant_id', task.tenant_id).eq('id', task.id),
      insforgeAdmin.database.from('ai_agent_runs').insert([{
        tenant_id: task.tenant_id,
        task_id: task.id,
        conversation_id: result.conversationId,
        key_id: task.key_id,
        provider: task.provider,
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
      insforgeAdmin.database.from('ai_agent_tasks').update({ status: 'error', last_run_at: finishedAt, last_error: message.slice(0, 2000), updated_at: finishedAt }).eq('tenant_id', task.tenant_id).eq('id', task.id),
      insforgeAdmin.database.from('ai_agent_runs').insert([{
        tenant_id: task.tenant_id,
        task_id: task.id,
        conversation_id: task.conversation_id,
        key_id: task.key_id,
        provider: task.provider,
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

export async function runDueAgentTasks(origin: string) {
  const { data, error } = await insforgeAdmin.database.from('ai_agent_tasks').select('*').eq('enabled', true).in('schedule_kind', ['daily','weekly']).order('updated_at', { ascending: true }).limit(30);
  if (error) throw new Error(error.message);
  const due = ((data || []) as AgentTask[]).filter((task) => isDue(task)).slice(0, 5);
  const results: Array<{ id: string; ok: boolean; provider: string; response?: string; error?: string }> = [];
  for (const task of due) {
    try { const result = await runAgentTask(task, origin); results.push({ id: task.id, ok: true, provider: task.provider, response: result.response.slice(0, 500) }); }
    catch (error) { results.push({ id: task.id, ok: false, provider: task.provider, error: error instanceof Error ? error.message : String(error) }); }
  }
  return { checked: Array.isArray(data) ? data.length : 0, due: due.length, results };
}
