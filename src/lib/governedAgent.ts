import 'server-only';

import * as cheerio from 'cheerio';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { buildFabrickDailyBrief } from '@/lib/fabrickDailyBrief';
import { resolveTenantProviderConfig } from '@/lib/tenantAiConfig';
import type { AiProvider } from '@/lib/resolveAiConfig';
import { getMcpAccessStatus, requireMcpScope, type McpAccess } from '@/lib/mcp/access';
import { mcpCatalogAudit, mcpCreateProduct, mcpGetProduct, mcpMoveInventory, mcpSearchProducts, mcpUpdateProduct } from '@/lib/mcp/catalog';
import { mcpSearchMarket } from '@/lib/mcp/market';
import { auditMcpAction, claimMcpRateLimit, consumeMcpApproval, policyRequiresApproval, requestMcpApproval } from '@/lib/mcp/governance';
import {
  appendAgentMessage,
  createAgentConversation,
  getAgentConversation,
  recallAgentMemory,
  saveAgentMemory,
  updateAgentConversationEngine,
  type AgentMessage,
  type AgentMemory,
} from '@/lib/agentMemory';

export type GovernedAgentTrace = {
  at: string;
  type: 'model' | 'tool_call' | 'tool_result' | 'approval' | 'memory' | 'error';
  name?: string;
  detail: string;
};

export type GovernedAgentResult = {
  ok: boolean;
  conversationId: string;
  provider: AiProvider;
  model: string;
  response: string;
  trace: GovernedAgentTrace[];
  toolCalls: number;
  approvals: Array<{ id: string; tool: string; status: string; expiresAt?: string | null }>;
  memoriesUsed: number;
};

type ToolCall = { id: string; name: string; arguments: Record<string, unknown> };
type OpenAiToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
type OpenAiMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: OpenAiToolCall[]; tool_call_id?: string };

type AgentContext = {
  tenantId: string;
  conversationId: string;
  access: McpAccess;
  allowWrites: boolean;
  origin: string;
  provider: AiProvider;
  model: string;
  trace: GovernedAgentTrace[];
  approvals: GovernedAgentResult['approvals'];
};

const OPENAI_COMPAT_BASES: Partial<Record<AiProvider, string>> = {
  ollama: 'https://ollama.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  grok: 'https://api.x.ai/v1',
  groq: 'https://api.groq.com/openai/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
};

export const GOVERNED_AGENT_PROVIDERS: Array<{ id: AiProvider; label: string; agentTools: boolean }> = [
  { id: 'ollama', label: 'Ollama', agentTools: true },
  { id: 'gemini', label: 'Gemini', agentTools: true },
  { id: 'grok', label: 'Grok / xAI', agentTools: true },
  { id: 'openrouter', label: 'OpenRouter', agentTools: true },
  { id: 'anthropic', label: 'Claude / Anthropic', agentTools: true },
  { id: 'openai', label: 'OpenAI', agentTools: true },
  { id: 'groq', label: 'Groq', agentTools: true },
  { id: 'custom', label: 'OpenAI-compatible / bridge', agentTools: true },
];

const TOOLS = [
  { type: 'function', function: { name: 'products_search', description: 'Busca productos del tenant por nombre, SKU, EAN o código.', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' }, activeOnly: { type: 'boolean' }, stock: { type: 'string', enum: ['any', 'low', 'out'] } } } } },
  { type: 'function', function: { name: 'product_get', description: 'Obtiene la ficha completa de un producto.', parameters: { type: 'object', properties: { id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, code: { type: 'string' } } } } },
  { type: 'function', function: { name: 'catalog_supervise', description: 'Audita catálogo, fichas incompletas, inactividad y stock.', parameters: { type: 'object', properties: { limit: { type: 'number' }, lowStockThreshold: { type: 'number' } } } } },
  { type: 'function', function: { name: 'market_search', description: 'Busca referentes actuales en Mercado Libre Chile.', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'analytics_summary', description: 'Analiza visitas, conversión, pedidos, ingresos, stock, margen y catálogo.', parameters: { type: 'object', properties: { days: { type: 'number', minimum: 1, maximum: 30 } } } } },
  { type: 'function', function: { name: 'traffic_report', description: 'Obtiene páginas más vistas, fuentes, dispositivos y sesiones.', parameters: { type: 'object', properties: { days: { type: 'number', minimum: 1, maximum: 90 } } } } },
  { type: 'function', function: { name: 'site_audit', description: 'Audita una ruta pública del sitio propio para SEO, estructura, CTA e imágenes.', parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } } },
  { type: 'function', function: { name: 'memory_search', description: 'Busca memoria persistente del tenant y de esta conversación.', parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'memory_remember', description: 'Guarda una decisión, preferencia, hecho, instrucción o hallazgo útil. Nunca guardes contraseñas, tokens ni claves API.', parameters: { type: 'object', properties: { kind: { type: 'string', enum: ['fact','preference','decision','instruction','project','finding','summary'] }, key: { type: 'string' }, content: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, importance: { type: 'number', minimum: 1, maximum: 5 }, scope: { type: 'string', enum: ['tenant','conversation'] } }, required: ['content'] } } },
  { type: 'function', function: { name: 'product_create', description: 'Prepara o crea un producto. commit=false primero. Publicar puede requerir aprobación.', parameters: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, tagline: { type: 'string' }, price: { type: 'number' }, image_url: { type: 'string' }, category_id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, activo: { type: 'boolean' }, featured: { type: 'boolean' }, supplier_price: { type: 'number' }, specifications: { type: 'object' }, commit: { type: 'boolean' }, approvalId: { type: 'string' } }, required: ['name'] } } },
  { type: 'function', function: { name: 'product_update', description: 'Prepara o aplica cambios a un producto. commit=false primero.', parameters: { type: 'object', properties: { productId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, tagline: { type: 'string' }, price: { type: 'number' }, image_url: { type: 'string' }, category_id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, activo: { type: 'boolean' }, featured: { type: 'boolean' }, supplier_price: { type: 'number' }, specifications: { type: 'object' }, commit: { type: 'boolean' }, approvalId: { type: 'string' } }, required: ['productId'] } } },
  { type: 'function', function: { name: 'inventory_move', description: 'Prepara o aplica un movimiento de Inventario V2. El commit puede requerir aprobación.', parameters: { type: 'object', properties: { productId: { type: 'string' }, type: { type: 'string', enum: ['in','out','adjustment','return'] }, quantity: { type: 'number' }, referenceId: { type: 'string' }, note: { type: 'string' }, commit: { type: 'boolean' }, approvalId: { type: 'string' } }, required: ['productId','type','quantity'] } } },
] as const;

function now() { return new Date().toISOString(); }
function json(value: unknown) { return JSON.stringify(value, null, 2); }
function errMessage(error: unknown) { return error instanceof Error ? error.message : String(error ?? 'Error desconocido'); }
function pushTrace(ctx: AgentContext, type: GovernedAgentTrace['type'], detail: string, name?: string) { ctx.trace.push({ at: now(), type, name, detail: detail.slice(0, 1600) }); }

function looksSensitive(value: string) {
  return /(password|contraseñ|api[_ -]?key|secret|token|bearer\s+[a-z0-9._-]{12,}|sk-[a-z0-9_-]{10,}|sfmcp_[a-f0-9]{8,})/i.test(value);
}

async function resolveAccess(tenantId: string, keyId: string, provider: AiProvider): Promise<McpAccess> {
  const status = await getMcpAccessStatus(tenantId);
  const connection = status.connections.find((item) => item.keyId === keyId);
  if (!connection) throw new Error('AI_AGENT_MCP_CONNECTION_NOT_FOUND');
  return { tenantId, keyId: connection.keyId, tokenPrefix: connection.tokenPrefix, scopes: new Set(connection.scopes), label: `${connection.label} · ${provider}` };
}

async function governed<T>(ctx: AgentContext, toolName: string, phase: 'read' | 'preview' | 'commit', payload: unknown, operation: () => Promise<T>, write = false) {
  try {
    await claimMcpRateLimit(ctx.access, 'request');
    if (write) await claimMcpRateLimit(ctx.access, 'write');
    const result = await operation();
    await auditMcpAction({ access: ctx.access, toolName, phase, outcome: 'ok', payload, result });
    return result;
  } catch (error) {
    await auditMcpAction({ access: ctx.access, toolName, phase, outcome: errMessage(error).startsWith('MCP_') ? 'denied' : 'error', payload, result: { error: errMessage(error) } });
    throw error;
  }
}

async function trafficReport(tenantId: string, daysRaw: unknown) {
  const days = Math.min(90, Math.max(1, Math.trunc(Number(daysRaw || 30))));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await insforgeAdmin.database.from('pwa_events').select('event,user_id,meta,created_at').gte('created_at', since).order('created_at', { ascending: false }).limit(12000);
  if (error) throw new Error(error.message);
  const rows = ((data || []) as Array<{ event?: string; user_id?: string | null; meta?: Record<string, unknown> | null; created_at?: string }>).filter((row) => {
    const eventTenant = String(row.meta?.tenantId || row.meta?.tenant_id || '');
    return eventTenant ? eventTenant === tenantId : tenantId === DEFAULT_TENANT_ID;
  });
  const views = rows.filter((row) => row.event === 'page_view');
  const sessions = new Set(views.map((row) => String(row.meta?.session_id || '')).filter(Boolean));
  const visitors = new Set(views.map((row) => row.user_id).filter(Boolean));
  const countBy = (fn: (row: (typeof views)[number]) => string) => Object.entries(views.reduce<Record<string, number>>((acc, row) => { const key = fn(row) || 'Desconocido'; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, value]) => ({ name, value }));
  return { days, pageViews: views.length, visitors: visitors.size, sessions: sessions.size, pages: countBy((row) => String(row.meta?.full_path || row.meta?.path || '/')), sources: countBy((row) => String(row.meta?.utm_source || row.meta?.referrer || 'Directo')), devices: countBy((row) => String(row.meta?.device || 'Desconocido')), recent: views.slice(0, 30).map((row) => ({ at: row.created_at, page: row.meta?.full_path || row.meta?.path || '/', source: row.meta?.utm_source || row.meta?.referrer || 'Directo', device: row.meta?.device || 'Desconocido' })) };
}

async function siteAudit(origin: string, pathRaw: unknown) {
  const path = String(pathRaw || '/').trim() || '/';
  if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) throw new Error('AI_AGENT_PUBLIC_PATH_REQUIRED');
  const base = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/+$/, '');
  const target = new URL(path, `${base}/`);
  const allowed = new URL(base);
  if (target.origin !== allowed.origin) throw new Error('AI_AGENT_EXTERNAL_URL_BLOCKED');
  const response = await fetch(target, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(15_000) });
  const html = await response.text();
  const $ = cheerio.load(html.slice(0, 2_000_000));
  const links = $('a[href]').toArray().map((node) => String($(node).attr('href') || '')).filter(Boolean);
  const images = $('img').toArray();
  return { url: target.toString(), status: response.status, title: $('title').first().text().trim(), description: $('meta[name="description"]').attr('content') || '', canonical: $('link[rel="canonical"]').attr('href') || '', h1: $('h1').toArray().map((node) => $(node).text().replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 10), h2: $('h2').toArray().map((node) => $(node).text().replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20), links: { total: links.length, internal: links.filter((href) => href.startsWith('/') || href.startsWith(base)).length, external: links.filter((href) => /^https?:\/\//i.test(href) && !href.startsWith(base)).length }, images: { total: images.length, missingAlt: images.filter((node) => !String($(node).attr('alt') || '').trim()).length }, forms: $('form').length, buttons: $('button, a[role="button"]').toArray().map((node) => $(node).text().replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 25) };
}

async function executeTool(ctx: AgentContext, name: string, input: Record<string, unknown>) {
  if (name === 'products_search') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'products:read'); return mcpSearchProducts(ctx.tenantId, { query: String(input.query || ''), limit: Number(input.limit || 20), activeOnly: input.activeOnly === true, stock: (input.stock as 'any'|'low'|'out') || 'any' }); });
  if (name === 'product_get') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'products:read'); return mcpGetProduct(ctx.tenantId, { id: String(input.id || ''), sku: String(input.sku || ''), ean: String(input.ean || ''), code: String(input.code || '') }); });
  if (name === 'catalog_supervise') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'products:read'); return mcpCatalogAudit(ctx.tenantId, { limit: Number(input.limit || 80), lowStockThreshold: Number(input.lowStockThreshold || 5) }); });
  if (name === 'market_search') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'products:read'); return mcpSearchMarket({ query: String(input.query || ''), limit: Number(input.limit || 12) }); });
  if (name === 'analytics_summary') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'analytics:read'); return buildFabrickDailyBrief(ctx.tenantId, Number(input.days || 7)); });
  if (name === 'traffic_report') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'analytics:read'); return trafficReport(ctx.tenantId, input.days); });
  if (name === 'site_audit') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'site:read'); return siteAudit(ctx.origin, input.path); });
  if (name === 'memory_search') return governed(ctx, name, 'read', input, async () => { requireMcpScope(ctx.access, 'automation:run'); const memories = await recallAgentMemory(ctx.tenantId, String(input.query || ''), ctx.conversationId, Number(input.limit || 12)); pushTrace(ctx, 'memory', `${memories.length} recuerdos recuperados`, name); return { count: memories.length, memories: memories.map((memory) => ({ kind: memory.kind, key: memory.memory_key, content: memory.content, tags: memory.tags, importance: memory.importance, scope: memory.scope })) }; });
  if (name === 'memory_remember') return governed(ctx, name, 'preview', input, async () => { requireMcpScope(ctx.access, 'automation:run'); const content = String(input.content || '').trim(); if (looksSensitive(`${input.key || ''} ${content}`)) throw new Error('AI_AGENT_MEMORY_SECRET_REJECTED'); const memory = await saveAgentMemory({ tenantId: ctx.tenantId, conversationId: String(input.scope || 'conversation') === 'tenant' ? null : ctx.conversationId, scope: String(input.scope || 'conversation') === 'tenant' ? 'tenant' : 'conversation', kind: (String(input.kind || 'fact') as AgentMemory['kind']), key: String(input.key || '') || null, content, tags: Array.isArray(input.tags) ? input.tags.map(String) : [], importance: Number(input.importance || 3) }); pushTrace(ctx, 'memory', `Memoria guardada: ${memory.kind}${memory.memory_key ? ` · ${memory.memory_key}` : ''}`, name); return { ok: true, id: memory.id, kind: memory.kind, key: memory.memory_key }; });

  if (name === 'product_create') {
    const { commit: commitRaw, approvalId, ...payload } = input; const commit = commitRaw === true;
    return governed(ctx, name, commit ? 'commit' : 'preview', payload, async () => {
      requireMcpScope(ctx.access, 'products:write'); if (commit && !ctx.allowWrites) throw new Error('AI_AGENT_WRITE_MODE_DISABLED');
      const publishing = payload.activo === true; if (publishing) requireMcpScope(ctx.access, 'products:publish'); const needsApproval = publishing && await policyRequiresApproval(ctx.access, 'publish');
      if (!commit) { const approval = needsApproval ? await requestMcpApproval({ access: ctx.access, toolName: name, payload, summary: `${ctx.provider} propone publicar producto: ${String(payload.name || '')}` }) : null; if (approval) { ctx.approvals.push({ id: approval.id, tool: name, status: approval.status, expiresAt: approval.expiresAt }); pushTrace(ctx, 'approval', `Aprobación ${approval.status}: ${approval.id}`, name); } return { preview: { ...payload, stock: 0 }, approvalRequired: needsApproval, approvalId: approval?.id || null }; }
      if (needsApproval) await consumeMcpApproval({ access: ctx.access, toolName: name, payload, approvalId: String(approvalId || '') }); return { ok: true, product: await mcpCreateProduct(ctx.tenantId, payload) };
    }, commit);
  }

  if (name === 'product_update') {
    const { productId, commit: commitRaw, approvalId, ...patch } = input; const id = String(productId || ''); const commit = commitRaw === true; const payload = { productId: id, ...patch };
    return governed(ctx, name, commit ? 'commit' : 'preview', payload, async () => {
      requireMcpScope(ctx.access, 'products:write'); if (commit && !ctx.allowWrites) throw new Error('AI_AGENT_WRITE_MODE_DISABLED');
      const publishChange = patch.activo !== undefined; if (publishChange) requireMcpScope(ctx.access, 'products:publish'); const needsApproval = publishChange && await policyRequiresApproval(ctx.access, 'publish'); const before = await mcpGetProduct(ctx.tenantId, { id }); if (!before) throw new Error('Producto no encontrado.');
      if (!commit) { const approval = needsApproval ? await requestMcpApproval({ access: ctx.access, toolName: name, payload, summary: `${ctx.provider} propone ${patch.activo ? 'activar' : 'desactivar'}: ${String((before as Record<string, unknown>).name || id)}` }) : null; if (approval) { ctx.approvals.push({ id: approval.id, tool: name, status: approval.status, expiresAt: approval.expiresAt }); pushTrace(ctx, 'approval', `Aprobación ${approval.status}: ${approval.id}`, name); } return { before, proposedChanges: patch, approvalRequired: needsApproval, approvalId: approval?.id || null }; }
      if (needsApproval) await consumeMcpApproval({ access: ctx.access, toolName: name, payload, approvalId: String(approvalId || '') }); return { ok: true, product: await mcpUpdateProduct(ctx.tenantId, id, patch) };
    }, commit);
  }

  if (name === 'inventory_move') {
    const { productId, type, quantity, referenceId, note, commit: commitRaw, approvalId } = input; const commit = commitRaw === true; const payload = { productId: String(productId || ''), type: String(type || ''), quantity: Math.trunc(Number(quantity || 0)), referenceId: String(referenceId || ''), note: String(note || '') };
    return governed(ctx, name, commit ? 'commit' : 'preview', payload, async () => {
      requireMcpScope(ctx.access, 'inventory:write'); if (commit && !ctx.allowWrites) throw new Error('AI_AGENT_WRITE_MODE_DISABLED'); const product = await mcpGetProduct(ctx.tenantId, { id: payload.productId }); if (!product) throw new Error('Producto no encontrado.'); const needsApproval = await policyRequiresApproval(ctx.access, 'inventory');
      if (!commit) { const current = Number((product as Record<string, unknown>).stock || 0); const next = payload.type === 'adjustment' ? payload.quantity : payload.type === 'out' ? current - payload.quantity : current + payload.quantity; const approval = needsApproval ? await requestMcpApproval({ access: ctx.access, toolName: name, payload, summary: `${ctx.provider} propone mover stock de ${String((product as Record<string, unknown>).name || payload.productId)}: ${current} → ${next}` }) : null; if (approval) { ctx.approvals.push({ id: approval.id, tool: name, status: approval.status, expiresAt: approval.expiresAt }); pushTrace(ctx, 'approval', `Aprobación ${approval.status}: ${approval.id}`, name); } return { currentStock: current, proposedStock: next, approvalRequired: needsApproval, approvalId: approval?.id || null }; }
      if (needsApproval) await consumeMcpApproval({ access: ctx.access, toolName: name, payload, approvalId: String(approvalId || '') }); return mcpMoveInventory(ctx.tenantId, { productId: payload.productId, type: payload.type as 'in'|'out'|'adjustment'|'return', quantity: payload.quantity, referenceId: payload.referenceId || `agent:${crypto.randomUUID()}`, note: payload.note });
    }, commit);
  }

  throw new Error(`AI_AGENT_TOOL_UNKNOWN:${name}`);
}

const SYSTEM_PROMPT = `Eres Fabrick Agent, el agente operativo persistente de Soluciones Fabrick.
Tu identidad, permisos, memoria y herramientas pertenecen a Fabrick; el proveedor de IA actual es solo el motor de razonamiento.
Reglas:
- Antes de afirmar métricas usa analytics_summary/traffic_report. Antes de recomendar cambios visuales usa site_audit.
- Antes de crear o editar productos usa products_search/product_get/catalog_supervise cuando corresponda.
- Las escrituras siempre empiezan con commit=false. Usa commit=true solo cuando el usuario haya pedido ejecutar y el modo escritura esté habilitado.
- Publicación e inventario pueden requerir aprobación humana. Si approvalRequired=true, detente y pide aprobar en Gobernanza; nunca inventes approvalId.
- Usa memory_remember únicamente para información durable útil: preferencias, decisiones, instrucciones, proyectos y hallazgos. Nunca guardes contraseñas, tokens, API keys ni secretos.
- Usa memory_search cuando una consulta dependa de algo discutido previamente.
- No tienes SQL libre, acceso a secretos, pagos o credenciales.
- Puedes cambiar de proveedor/modelo entre turnos sin perder la memoria almacenada por Fabrick.
- Responde en español, concreto y accionable.`;

function memoriesBlock(memories: AgentMemory[]) {
  if (!memories.length) return '';
  return `\n\nMEMORIA RELEVANTE DE FABRICK (puede provenir de conversaciones anteriores):\n${memories.map((memory, index) => `${index + 1}. [${memory.kind}/${memory.scope}] ${memory.memory_key ? `${memory.memory_key}: ` : ''}${memory.content}`).join('\n')}`;
}

function historyForModel(messages: AgentMessage[]) {
  return messages.filter((message) => message.role === 'user' || message.role === 'assistant').slice(-20).map((message) => ({ role: message.role as 'user'|'assistant', content: message.content.slice(0, 30000) }));
}

async function callOpenAiCompat(input: { ctx: AgentContext; apiKey: string; baseUrl: string; history: Array<{ role: 'user'|'assistant'; content: string }>; prompt: string; system: string }) {
  const messages: OpenAiMessage[] = [{ role: 'system', content: input.system }, ...input.history, { role: 'user', content: input.prompt }];
  let toolCalls = 0; let responseText = '';
  for (let turn = 0; turn < 8; turn += 1) {
    pushTrace(input.ctx, 'model', `Turno ${turn + 1}: ${input.ctx.provider} · ${input.ctx.model}`);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (input.apiKey) headers.Authorization = `Bearer ${input.apiKey}`;
    const response = await fetch(`${input.baseUrl.replace(/\/+$/, '')}/chat/completions`, { method: 'POST', headers, body: JSON.stringify({ model: input.ctx.model, messages, tools: TOOLS, tool_choice: 'auto', stream: false, temperature: 0.2, max_tokens: 3000 }), signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error(`AI_PROVIDER_HTTP_${response.status}:${(await response.text().catch(() => '')).slice(0, 600)}`);
    const body = await response.json() as { choices?: Array<{ message?: { content?: string | null; tool_calls?: OpenAiToolCall[] } }> };
    const assistant = body.choices?.[0]?.message; if (!assistant) throw new Error('AI_PROVIDER_EMPTY_RESPONSE'); const calls = Array.isArray(assistant.tool_calls) ? assistant.tool_calls : [];
    messages.push({ role: 'assistant', content: assistant.content || '', tool_calls: calls.length ? calls : undefined });
    if (!calls.length) { responseText = String(assistant.content || '').trim(); break; }
    for (const call of calls.slice(0, 6)) {
      toolCalls += 1; if (toolCalls > 20) throw new Error('AI_AGENT_TOOL_LIMIT_REACHED'); let args: Record<string, unknown> = {}; try { args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>; } catch { args = {}; }
      pushTrace(input.ctx, 'tool_call', json(args).slice(0, 900), call.function.name);
      try { const result = await executeTool(input.ctx, call.function.name, args); const serialized = json(result).slice(0, 14000); pushTrace(input.ctx, 'tool_result', serialized.slice(0, 1400), call.function.name); messages.push({ role: 'tool', tool_call_id: call.id, content: serialized }); }
      catch (error) { const message = errMessage(error); pushTrace(input.ctx, 'error', message, call.function.name); messages.push({ role: 'tool', tool_call_id: call.id, content: json({ error: message }) }); }
    }
  }
  return { responseText, toolCalls };
}

async function callAnthropic(input: { ctx: AgentContext; apiKey: string; history: Array<{ role: 'user'|'assistant'; content: string }>; prompt: string; system: string }) {
  type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
  type Msg = { role: 'user'|'assistant'; content: string | Block[] };
  const messages: Msg[] = [...input.history.map((item) => ({ role: item.role, content: item.content })), { role: 'user', content: input.prompt }];
  const anthropicTools = TOOLS.map((tool) => ({ name: tool.function.name, description: tool.function.description, input_schema: tool.function.parameters }));
  let toolCalls = 0; let responseText = '';
  for (let turn = 0; turn < 8; turn += 1) {
    pushTrace(input.ctx, 'model', `Turno ${turn + 1}: Anthropic · ${input.ctx.model}`);
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': input.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: input.ctx.model, max_tokens: 3000, temperature: 0.2, system: input.system, tools: anthropicTools, messages }), signal: AbortSignal.timeout(90_000) });
    if (!response.ok) throw new Error(`AI_PROVIDER_HTTP_${response.status}:${(await response.text().catch(() => '')).slice(0, 600)}`);
    const body = await response.json() as { stop_reason?: string; content?: Array<{ type?: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> };
    const blocks = body.content || []; const assistantBlocks: Block[] = blocks.map((block) => block.type === 'tool_use' ? { type: 'tool_use', id: String(block.id || crypto.randomUUID()), name: String(block.name || ''), input: block.input || {} } : { type: 'text', text: String(block.text || '') });
    messages.push({ role: 'assistant', content: assistantBlocks });
    const calls = assistantBlocks.filter((block): block is Extract<Block, { type: 'tool_use' }> => block.type === 'tool_use');
    if (!calls.length) { responseText = assistantBlocks.filter((block): block is Extract<Block, { type: 'text' }> => block.type === 'text').map((block) => block.text).join('\n').trim(); break; }
    const results: Block[] = [];
    for (const call of calls.slice(0, 6)) {
      toolCalls += 1; if (toolCalls > 20) throw new Error('AI_AGENT_TOOL_LIMIT_REACHED'); pushTrace(input.ctx, 'tool_call', json(call.input).slice(0, 900), call.name);
      try { const result = await executeTool(input.ctx, call.name, call.input); const serialized = json(result).slice(0, 14000); pushTrace(input.ctx, 'tool_result', serialized.slice(0, 1400), call.name); results.push({ type: 'tool_result', tool_use_id: call.id, content: serialized }); }
      catch (error) { const message = errMessage(error); pushTrace(input.ctx, 'error', message, call.name); results.push({ type: 'tool_result', tool_use_id: call.id, content: json({ error: message }), is_error: true }); }
    }
    messages.push({ role: 'user', content: results });
  }
  return { responseText, toolCalls };
}

export async function runGovernedAgent(input: {
  tenantId: string;
  keyId: string;
  provider: AiProvider;
  model: string;
  prompt: string;
  origin: string;
  allowWrites?: boolean;
  conversationId?: string | null;
  createdBy?: string | null;
}): Promise<GovernedAgentResult> {
  const access = await resolveAccess(input.tenantId, input.keyId, input.provider);
  requireMcpScope(access, 'automation:run');
  const config = await resolveTenantProviderConfig(input.provider, input.model, input.tenantId);
  if (!config) throw new Error(`AI_PROVIDER_NOT_CONFIGURED:${input.provider}`);

  let state = input.conversationId ? await getAgentConversation(input.tenantId, input.conversationId) : null;
  let conversation = state?.conversation;
  if (!conversation) {
    conversation = await createAgentConversation({ tenantId: input.tenantId, keyId: input.keyId, provider: input.provider, model: input.model, title: input.prompt.slice(0, 80), createdBy: input.createdBy });
    state = { conversation, messages: [] };
  } else if (conversation.provider !== input.provider || conversation.model !== input.model || conversation.key_id !== input.keyId) {
    conversation = await updateAgentConversationEngine(input.tenantId, conversation.id, input.provider, input.model, input.keyId);
  }

  await appendAgentMessage({ tenantId: input.tenantId, conversationId: conversation.id, role: 'user', provider: input.provider, model: input.model, content: input.prompt });
  const memories = await recallAgentMemory(input.tenantId, input.prompt, conversation.id, 12);
  const ctx: AgentContext = { tenantId: input.tenantId, conversationId: conversation.id, access, allowWrites: input.allowWrites === true, origin: input.origin, provider: input.provider, model: input.model, trace: [], approvals: [] };
  if (memories.length) pushTrace(ctx, 'memory', `${memories.length} recuerdos cargados antes del razonamiento.`);
  const history = historyForModel(state?.messages || []);
  const system = `${SYSTEM_PROMPT}${memoriesBlock(memories)}`;

  const compatibleBase = config.baseUrl || OPENAI_COMPAT_BASES[input.provider];
  const result = input.provider === 'anthropic'
    ? await callAnthropic({ ctx, apiKey: config.apiKey, history, prompt: input.prompt.slice(0, 12000), system })
    : await callOpenAiCompat({ ctx, apiKey: config.apiKey, baseUrl: compatibleBase || '', history, prompt: input.prompt.slice(0, 12000), system });

  let responseText = result.responseText;
  if (!responseText) responseText = ctx.approvals.length ? 'La operación quedó pendiente de aprobación humana en Gobernanza.' : 'El agente terminó sin una respuesta textual final.';
  await appendAgentMessage({ tenantId: input.tenantId, conversationId: conversation.id, role: 'assistant', provider: input.provider, model: input.model, content: responseText, metadata: { toolCalls: result.toolCalls, approvals: ctx.approvals, trace: ctx.trace.slice(-30), memoriesUsed: memories.length } });

  return { ok: true, conversationId: conversation.id, provider: input.provider, model: input.model, response: responseText, trace: ctx.trace, toolCalls: result.toolCalls, approvals: ctx.approvals, memoriesUsed: memories.length };
}
