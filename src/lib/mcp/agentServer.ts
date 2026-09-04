import 'server-only';

import * as cheerio from 'cheerio';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { authenticateMcpRequest, requireMcpScope, type McpAccess } from '@/lib/mcp/access';
import { auditMcpAction, claimMcpRateLimit } from '@/lib/mcp/governance';
import { buildFabrickDailyBrief } from '@/lib/fabrickDailyBrief';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { insforgeAdmin } from '@/lib/insforge';
import { getAgentConversation, listAgentConversations, recallAgentMemory, saveAgentMemory } from '@/lib/agentMemory';

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}
function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error ?? 'Error desconocido'); }
function errorResult(error: unknown) { return { isError: true, content: [{ type: 'text' as const, text: errorMessage(error) }] }; }
function looksSensitive(value: string) { return /(password|contraseñ|api[_ -]?key|secret|token|bearer\s+[a-z0-9._-]{12,}|sk-[a-z0-9_-]{10,}|sfmcp_[a-f0-9]{8,})/i.test(value); }

async function runTool(access: McpAccess, toolName: string, phase: 'read' | 'preview' | 'commit', payload: unknown, operation: () => Promise<unknown>, write = false) {
  try {
    if (write) await claimMcpRateLimit(access, 'write');
    const result = await operation();
    await auditMcpAction({ access, toolName, phase, outcome: 'ok', payload, result });
    return textResult(result);
  } catch (error) {
    await auditMcpAction({ access, toolName, phase, outcome: errorMessage(error).startsWith('MCP_') ? 'denied' : 'error', payload, result: { error: errorMessage(error) } });
    return errorResult(error);
  }
}

async function trafficReport(tenantId: string, daysRaw: number) {
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
  return { days, pageViews: views.length, visitors: visitors.size, sessions: sessions.size, pages: countBy((row) => String(row.meta?.full_path || row.meta?.path || '/')), sources: countBy((row) => String(row.meta?.utm_source || row.meta?.referrer || 'Directo')), devices: countBy((row) => String(row.meta?.device || 'Desconocido')) };
}

async function siteAudit(origin: string, pathRaw: string) {
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

function registerAgentTools(access: McpAccess, origin: string) {
  return createMcpHandler((server) => {
    server.registerTool('agent_memory_search', {
      title: 'Buscar memoria Fabrick',
      description: 'Busca hechos, decisiones, preferencias, instrucciones y hallazgos persistidos por el agente para este tenant.',
      inputSchema: z.object({ query: z.string().min(1).max(1000), conversationId: z.string().uuid().optional(), limit: z.number().int().min(1).max(30).optional().default(12) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (input) => runTool(access, 'agent_memory_search', 'read', input, async () => {
      requireMcpScope(access, 'automation:run');
      const memories = await recallAgentMemory(access.tenantId, input.query, input.conversationId || null, input.limit);
      return { count: memories.length, memories: memories.map((item) => ({ id: item.id, kind: item.kind, scope: item.scope, key: item.memory_key, content: item.content, tags: item.tags, importance: item.importance, pinned: item.pinned })) };
    }));

    server.registerTool('agent_memory_remember', {
      title: 'Guardar memoria Fabrick',
      description: 'Prepara o guarda memoria durable del tenant. No acepta secretos. Usa commit=false primero y commit=true solo después de confirmar.',
      inputSchema: z.object({ content: z.string().min(1).max(8000), kind: z.enum(['fact','preference','decision','instruction','project','finding','summary']).optional().default('fact'), key: z.string().max(120).optional(), tags: z.array(z.string().max(40)).max(20).optional(), importance: z.number().int().min(1).max(5).optional().default(3), conversationId: z.string().uuid().optional(), scope: z.enum(['tenant','conversation']).optional().default('tenant'), commit: z.boolean().optional().default(false) }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ commit, ...input }) => runTool(access, 'agent_memory_remember', commit ? 'commit' : 'preview', input, async () => {
      requireMcpScope(access, 'automation:run');
      if (looksSensitive(`${input.key || ''} ${input.content}`)) throw new Error('AI_AGENT_MEMORY_SECRET_REJECTED');
      if (!commit) return { ok: true, preview: input, message: 'Vista previa solamente. Repite exactamente con commit=true para guardar esta memoria.' };
      const memory = await saveAgentMemory({ tenantId: access.tenantId, conversationId: input.scope === 'conversation' ? input.conversationId || null : null, scope: input.scope, kind: input.kind, key: input.key || null, content: input.content, tags: input.tags || [], importance: input.importance });
      return { ok: true, memory: { id: memory.id, kind: memory.kind, scope: memory.scope, key: memory.memory_key, content: memory.content } };
    }, commit));

    server.registerTool('agent_conversations_list', {
      title: 'Listar conversaciones del agente',
      description: 'Lista hilos persistentes del tenant sin devolver secretos.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(100).optional().default(30) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (input) => runTool(access, 'agent_conversations_list', 'read', input, async () => {
      requireMcpScope(access, 'automation:run');
      return { conversations: await listAgentConversations(access.tenantId, input.limit) };
    }));

    server.registerTool('agent_conversation_get', {
      title: 'Leer conversación del agente',
      description: 'Lee el historial estructurado de una conversación Fabrick por ID.',
      inputSchema: z.object({ conversationId: z.string().uuid(), limit: z.number().int().min(1).max(200).optional().default(80) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (input) => runTool(access, 'agent_conversation_get', 'read', input, async () => {
      requireMcpScope(access, 'automation:run');
      const state = await getAgentConversation(access.tenantId, input.conversationId);
      if (!state) return { found: false };
      return { found: true, conversation: state.conversation, messages: state.messages.slice(-input.limit).map((item) => ({ role: item.role, provider: item.provider, model: item.model, content: item.content, tool: item.tool_name, createdAt: item.created_at })) };
    }));

    server.registerTool('agent_analytics_summary', {
      title: 'Analizar operación Fabrick',
      description: 'Calcula un brief de visitas, conversión, pedidos, ingresos, stock, margen y catálogo.',
      inputSchema: z.object({ days: z.number().int().min(1).max(30).optional().default(7) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (input) => runTool(access, 'agent_analytics_summary', 'read', input, async () => {
      requireMcpScope(access, 'analytics:read');
      return buildFabrickDailyBrief(access.tenantId, input.days);
    }));

    server.registerTool('agent_traffic_report', {
      title: 'Analizar visitas',
      description: 'Resume vistas, visitantes, sesiones, páginas, fuentes y dispositivos del tenant.',
      inputSchema: z.object({ days: z.number().int().min(1).max(90).optional().default(30) }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (input) => runTool(access, 'agent_traffic_report', 'read', input, async () => {
      requireMcpScope(access, 'analytics:read');
      return trafficReport(access.tenantId, input.days);
    }));

    server.registerTool('agent_site_audit', {
      title: 'Auditar página pública',
      description: 'Audita una ruta pública del propio sitio: status, title, description, headings, enlaces, imágenes y CTA.',
      inputSchema: z.object({ path: z.string().min(1).max(500).default('/') }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async (input) => runTool(access, 'agent_site_audit', 'read', input, async () => {
      requireMcpScope(access, 'site:read');
      return siteAudit(origin, input.path);
    }));
  }, {
    serverInfo: { name: 'fabrick-agent-memory', version: '1.0.0' },
    instructions: [
      'MCP complementario del Fabrick Agent para memoria, historial, analítica y auditoría del sitio.',
      'Usa la misma credencial y scopes del gateway MCP comercial.',
      'La memoria pertenece a Fabrick y puede ser reutilizada por distintos motores o clientes MCP.',
      'Nunca guardes secretos, contraseñas, tokens o claves API en memoria.',
      'agent_memory_remember usa dos fases: commit=false para preview y commit=true para persistir.',
    ].join(' '),
  });
}

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'MCP_UNAUTHORIZED', message: 'Token MCP inválido o revocado.' }), { status: 401, headers: { 'content-type': 'application/json; charset=utf-8', 'www-authenticate': 'Bearer realm="Fabrick Agent MCP"', 'cache-control': 'no-store' } });
}

export async function handleFabrickAgentMcpRequest(request: Request, pathToken?: string) {
  const access = await authenticateMcpRequest(request, pathToken);
  if (!access) return unauthorizedResponse();
  try {
    const rate = await claimMcpRateLimit(access, 'request');
    await auditMcpAction({ access, toolName: '__agent_mcp_request__', phase: 'request', outcome: 'ok', payload: { method: request.method }, result: { count: rate.requestCount }, requestId: request.headers.get('x-request-id') || request.headers.get('x-vercel-id') });
  } catch (error) {
    const message = errorMessage(error);
    if (message === 'MCP_CONNECTION_DISABLED') return new Response(JSON.stringify({ error: 'MCP_CONNECTION_DISABLED' }), { status: 403, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    if (message.startsWith('MCP_RATE_LIMITED:')) { const retryAfter = message.split(':')[1] || '60'; return new Response(JSON.stringify({ error: 'MCP_RATE_LIMITED', retryAfter: Number(retryAfter) || 60 }), { status: 429, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'retry-after': retryAfter } }); }
    return new Response(JSON.stringify({ error: 'MCP_GOVERNANCE_UNAVAILABLE' }), { status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  }
  return registerAgentTools(access, new URL(request.url).origin)(request);
}
