import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import type { AiProvider } from '@/lib/resolveAiConfig';

export type AgentConversation = {
  id: string;
  tenant_id: string;
  key_id: string;
  title: string;
  provider: string;
  model: string;
  status: 'active' | 'archived';
  summary: string | null;
  markdown_snapshot: string;
  created_by: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentMessage = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  provider: string | null;
  model: string | null;
  content: string;
  tool_name: string | null;
  tool_call_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentMemory = {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  scope: 'tenant' | 'conversation' | 'task';
  kind: 'fact' | 'preference' | 'decision' | 'instruction' | 'project' | 'finding' | 'summary';
  memory_key: string | null;
  content: string;
  tags: string[];
  importance: number;
  pinned: boolean;
  source_message_id: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

function cleanText(value: unknown, max = 12000) {
  return String(value ?? '').trim().slice(0, max);
}

function safeTitle(value: unknown) {
  const title = cleanText(value, 120).replace(/\s+/g, ' ');
  return title || 'Nueva conversación';
}

function safeTags(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.map((tag) => cleanText(tag, 40).toLowerCase()).filter(Boolean))].slice(0, 20);
}

function tokenize(value: string) {
  return [...new Set(value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9áéíóúñ]+/i).map((part) => part.trim()).filter((part) => part.length >= 3))].slice(0, 40);
}

export function renderConversationMarkdown(conversation: Pick<AgentConversation, 'id' | 'title' | 'provider' | 'model' | 'created_at'>, messages: AgentMessage[]) {
  const lines = [
    `# ${conversation.title}`,
    '',
    `- Conversación: \`${conversation.id}\``,
    `- Proveedor actual: **${conversation.provider || 'sin definir'}**`,
    `- Modelo actual: **${conversation.model || 'sin definir'}**`,
    `- Creada: ${conversation.created_at}`,
    '',
  ];

  for (const message of messages) {
    const label = message.role === 'user' ? 'Usuario' : message.role === 'assistant' ? 'Agente' : message.role === 'tool' ? `Herramienta${message.tool_name ? ` · ${message.tool_name}` : ''}` : 'Sistema';
    lines.push(`## ${label}`);
    lines.push('');
    if (message.provider || message.model) lines.push(`> ${[message.provider, message.model].filter(Boolean).join(' · ')} · ${message.created_at}`);
    else lines.push(`> ${message.created_at}`);
    lines.push('');
    lines.push(message.content || '_Sin contenido_');
    lines.push('');
  }
  return lines.join('\n').slice(0, 2_000_000);
}

async function refreshMarkdown(tenantId: string, conversationId: string) {
  const [{ data: conversations }, { data: messages }] = await Promise.all([
    insforgeAdmin.database.from('ai_agent_conversations').select('*').eq('tenant_id', tenantId).eq('id', conversationId).limit(1),
    insforgeAdmin.database.from('ai_agent_messages').select('*').eq('tenant_id', tenantId).eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(1500),
  ]);
  const conversation = Array.isArray(conversations) ? conversations[0] as AgentConversation | undefined : undefined;
  if (!conversation) return '';
  const markdown = renderConversationMarkdown(conversation, (messages || []) as AgentMessage[]);
  await insforgeAdmin.database.from('ai_agent_conversations').update({ markdown_snapshot: markdown, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('id', conversationId);
  return markdown;
}

export async function createAgentConversation(input: {
  tenantId: string;
  keyId: string;
  provider: AiProvider;
  model: string;
  title?: string;
  createdBy?: string | null;
}) {
  const now = new Date().toISOString();
  const { data, error } = await insforgeAdmin.database.from('ai_agent_conversations').insert([{
    tenant_id: input.tenantId,
    key_id: cleanText(input.keyId, 32).toLowerCase(),
    title: safeTitle(input.title),
    provider: input.provider,
    model: cleanText(input.model, 180),
    status: 'active',
    summary: null,
    markdown_snapshot: '',
    created_by: cleanText(input.createdBy, 180) || null,
    created_at: now,
    updated_at: now,
  }]).select('*').single();
  if (error) throw new Error(error.message);
  const conversation = data as AgentConversation;
  await refreshMarkdown(input.tenantId, conversation.id);
  return conversation;
}

export async function listAgentConversations(tenantId: string, limit = 50) {
  const { data, error } = await insforgeAdmin.database.from('ai_agent_conversations')
    .select('id,tenant_id,key_id,title,provider,model,status,summary,created_by,last_message_at,created_at,updated_at')
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false })
    .limit(Math.max(1, Math.min(100, Math.trunc(limit))));
  if (error) throw new Error(error.message);
  return (data || []) as Omit<AgentConversation, 'markdown_snapshot'>[];
}

export async function getAgentConversation(tenantId: string, conversationId: string) {
  const [{ data: conversationRows, error: conversationError }, { data: messageRows, error: messageError }] = await Promise.all([
    insforgeAdmin.database.from('ai_agent_conversations').select('*').eq('tenant_id', tenantId).eq('id', conversationId).limit(1),
    insforgeAdmin.database.from('ai_agent_messages').select('*').eq('tenant_id', tenantId).eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(1500),
  ]);
  if (conversationError) throw new Error(conversationError.message);
  if (messageError) throw new Error(messageError.message);
  const conversation = Array.isArray(conversationRows) ? conversationRows[0] as AgentConversation | undefined : undefined;
  if (!conversation) return null;
  return { conversation, messages: (messageRows || []) as AgentMessage[] };
}

export async function updateAgentConversationEngine(tenantId: string, conversationId: string, provider: AiProvider, model: string, keyId?: string) {
  const patch: Record<string, unknown> = { provider, model: cleanText(model, 180), updated_at: new Date().toISOString() };
  if (keyId) patch.key_id = cleanText(keyId, 32).toLowerCase();
  const { data, error } = await insforgeAdmin.database.from('ai_agent_conversations').update(patch).eq('tenant_id', tenantId).eq('id', conversationId).select('*').single();
  if (error) throw new Error(error.message);
  await refreshMarkdown(tenantId, conversationId);
  return data as AgentConversation;
}

export async function appendAgentMessage(input: {
  tenantId: string;
  conversationId: string;
  role: AgentMessage['role'];
  content: string;
  provider?: string | null;
  model?: string | null;
  toolName?: string | null;
  toolCallId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const content = cleanText(input.content, 100_000);
  const now = new Date().toISOString();
  const { data, error } = await insforgeAdmin.database.from('ai_agent_messages').insert([{
    tenant_id: input.tenantId,
    conversation_id: input.conversationId,
    role: input.role,
    provider: cleanText(input.provider, 40) || null,
    model: cleanText(input.model, 180) || null,
    content,
    tool_name: cleanText(input.toolName, 120) || null,
    tool_call_id: cleanText(input.toolCallId, 180) || null,
    metadata: input.metadata || {},
    created_at: now,
  }]).select('*').single();
  if (error) throw new Error(error.message);
  await insforgeAdmin.database.from('ai_agent_conversations').update({ last_message_at: now, updated_at: now }).eq('tenant_id', input.tenantId).eq('id', input.conversationId);
  await refreshMarkdown(input.tenantId, input.conversationId);
  return data as AgentMessage;
}

export async function getConversationMarkdown(tenantId: string, conversationId: string) {
  const { data, error } = await insforgeAdmin.database.from('ai_agent_conversations').select('markdown_snapshot').eq('tenant_id', tenantId).eq('id', conversationId).limit(1);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] as { markdown_snapshot?: string } | undefined : undefined;
  if (!row) return null;
  return String(row.markdown_snapshot || '') || refreshMarkdown(tenantId, conversationId);
}

export async function saveAgentMemory(input: {
  tenantId: string;
  conversationId?: string | null;
  scope?: AgentMemory['scope'];
  kind?: AgentMemory['kind'];
  key?: string | null;
  content: string;
  tags?: string[];
  importance?: number;
  pinned?: boolean;
  sourceMessageId?: string | null;
}) {
  const content = cleanText(input.content, 8000);
  if (!content) throw new Error('AI_AGENT_MEMORY_CONTENT_REQUIRED');
  const scope = input.scope || (input.conversationId ? 'conversation' : 'tenant');
  const kind = input.kind || 'fact';
  const key = cleanText(input.key, 120) || null;
  const now = new Date().toISOString();
  const importance = Math.max(1, Math.min(5, Math.trunc(Number(input.importance || 3))));

  if (key) {
    let query = insforgeAdmin.database.from('ai_agent_memory').select('id').eq('tenant_id', input.tenantId).eq('scope', scope).eq('memory_key', key).limit(10);
    if (input.conversationId) query = query.eq('conversation_id', input.conversationId);
    const { data: existing } = await query;
    const row = Array.isArray(existing) ? existing[0] as { id?: string } | undefined : undefined;
    if (row?.id) {
      const { data, error } = await insforgeAdmin.database.from('ai_agent_memory').update({
        kind,
        content,
        tags: safeTags(input.tags),
        importance,
        pinned: input.pinned === true,
        source_message_id: input.sourceMessageId || null,
        updated_at: now,
      }).eq('tenant_id', input.tenantId).eq('id', row.id).select('*').single();
      if (error) throw new Error(error.message);
      return data as AgentMemory;
    }
  }

  const { data, error } = await insforgeAdmin.database.from('ai_agent_memory').insert([{
    tenant_id: input.tenantId,
    conversation_id: input.conversationId || null,
    scope,
    kind,
    memory_key: key,
    content,
    tags: safeTags(input.tags),
    importance,
    pinned: input.pinned === true,
    source_message_id: input.sourceMessageId || null,
    created_at: now,
    updated_at: now,
  }]).select('*').single();
  if (error) throw new Error(error.message);
  return data as AgentMemory;
}

export async function recallAgentMemory(tenantId: string, queryText: string, conversationId?: string | null, limit = 12) {
  const { data, error } = await insforgeAdmin.database.from('ai_agent_memory')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('pinned', { ascending: false })
    .order('importance', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(250);
  if (error) throw new Error(error.message);
  const tokens = tokenize(queryText);
  const rows = (data || []) as AgentMemory[];
  const scored = rows.map((memory) => {
    if (memory.scope === 'conversation' && memory.conversation_id && memory.conversation_id !== conversationId) return { memory, score: -1000 };
    const haystack = `${memory.memory_key || ''} ${memory.content} ${(memory.tags || []).join(' ')}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const lexical = tokens.reduce((score, token) => score + (haystack.includes(token) ? 3 : 0), 0);
    const score = lexical + memory.importance * 2 + (memory.pinned ? 8 : 0) + (memory.scope === 'conversation' ? 3 : 0);
    return { memory, score };
  }).filter((item) => item.score >= (tokens.length ? 2 : 0)).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(30, limit)));
  const memories = scored.map((item) => item.memory);
  const ids = memories.map((memory) => memory.id);
  if (ids.length) await insforgeAdmin.database.from('ai_agent_memory').update({ last_used_at: new Date().toISOString() }).eq('tenant_id', tenantId).in('id', ids);
  return memories;
}

export async function listAgentMemory(tenantId: string, conversationId?: string | null, limit = 100) {
  let query = insforgeAdmin.database.from('ai_agent_memory').select('*').eq('tenant_id', tenantId).order('pinned', { ascending: false }).order('importance', { ascending: false }).order('updated_at', { ascending: false }).limit(Math.max(1, Math.min(250, limit)));
  if (conversationId) query = query.eq('conversation_id', conversationId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as AgentMemory[];
}

export async function deleteAgentMemory(tenantId: string, memoryId: string) {
  const { error } = await insforgeAdmin.database.from('ai_agent_memory').delete().eq('tenant_id', tenantId).eq('id', memoryId);
  if (error) throw new Error(error.message);
}
