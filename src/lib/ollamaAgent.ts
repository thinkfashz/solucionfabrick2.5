import 'server-only';

import * as cheerio from 'cheerio';
import { insforgeAdmin } from '@/lib/insforge';
import { DEFAULT_TENANT_ID } from '@/lib/tenant';
import { buildFabrickDailyBrief } from '@/lib/fabrickDailyBrief';
import { resolveTenantProviderConfig } from '@/lib/tenantAiConfig';
import { getMcpAccessStatus, requireMcpScope, type McpAccess } from '@/lib/mcp/access';
import {
  mcpCatalogAudit,
  mcpCreateProduct,
  mcpGetProduct,
  mcpMoveInventory,
  mcpSearchProducts,
  mcpUpdateProduct,
} from '@/lib/mcp/catalog';
import { mcpSearchMarket } from '@/lib/mcp/market';
import {
  auditMcpAction,
  claimMcpRateLimit,
  consumeMcpApproval,
  policyRequiresApproval,
  requestMcpApproval,
} from '@/lib/mcp/governance';

export type OllamaAgentTrace = {
  at: string;
  type: 'model' | 'tool_call' | 'tool_result' | 'approval' | 'error';
  name?: string;
  detail: string;
};

export type OllamaAgentResult = {
  ok: boolean;
  response: string;
  trace: OllamaAgentTrace[];
  toolCalls: number;
  approvals: Array<{ id: string; tool: string; status: string; expiresAt?: string | null }>;
};

type ToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type AgentMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type AgentContext = {
  tenantId: string;
  access: McpAccess;
  allowWrites: boolean;
  origin: string;
  trace: OllamaAgentTrace[];
  approvals: OllamaAgentResult['approvals'];
};

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'products_search',
      description: 'Busca productos del tenant por nombre, SKU, EAN o código y permite detectar stock bajo o agotado.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' }, activeOnly: { type: 'boolean' }, stock: { type: 'string', enum: ['any', 'low', 'out'] } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'product_get',
      description: 'Obtiene la ficha completa de un producto.',
      parameters: { type: 'object', properties: { id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, code: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'catalog_supervise',
      description: 'Audita el catálogo y detecta fichas incompletas, inactivas, sin imagen, sin SKU o con problemas de stock.',
      parameters: { type: 'object', properties: { limit: { type: 'number' }, lowStockThreshold: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'market_search',
      description: 'Busca referentes públicos actuales de Mercado Libre Chile para comparar precios y títulos.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analytics_summary',
      description: 'Analiza visitas, funnel, pedidos, ingresos, stock crítico, márgenes y fichas incompletas del tenant.',
      parameters: { type: 'object', properties: { days: { type: 'number', minimum: 1, maximum: 30 } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'traffic_report',
      description: 'Obtiene páginas más vistas, fuentes, dispositivos y sesiones recientes respetando el tenant.',
      parameters: { type: 'object', properties: { days: { type: 'number', minimum: 1, maximum: 90 } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'site_audit',
      description: 'Inspecciona una página pública de la aplicación y resume SEO, estructura, enlaces, imágenes y CTA visibles. Solo permite rutas públicas del propio sitio.',
      parameters: { type: 'object', properties: { path: { type: 'string', description: 'Ruta pública, por ejemplo /, /tienda o /servicios' } }, required: ['path'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'product_create',
      description: 'Prepara o crea un producto. commit=false es vista previa. Publicar activo requiere products:publish y puede requerir aprobación humana.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' }, description: { type: 'string' }, tagline: { type: 'string' }, price: { type: 'number' }, image_url: { type: 'string' },
          category_id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, activo: { type: 'boolean' }, featured: { type: 'boolean' },
          supplier_price: { type: 'number' }, specifications: { type: 'object' }, commit: { type: 'boolean' }, approvalId: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'product_update',
      description: 'Prepara o aplica cambios a un producto. commit=false es vista previa. Cambiar activo requiere products:publish y puede requerir aprobación humana.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, tagline: { type: 'string' }, price: { type: 'number' },
          image_url: { type: 'string' }, category_id: { type: 'string' }, sku: { type: 'string' }, ean: { type: 'string' }, activo: { type: 'boolean' },
          featured: { type: 'boolean' }, supplier_price: { type: 'number' }, specifications: { type: 'object' }, commit: { type: 'boolean' }, approvalId: { type: 'string' },
        },
        required: ['productId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inventory_move',
      description: 'Prepara o aplica una entrada, salida, devolución o ajuste de stock usando Inventario V2. Los commits requieren inventory:write y pueden requerir aprobación humana.',
      parameters: {
        type: 'object',
        properties: {
          productId: { type: 'string' }, type: { type: 'string', enum: ['in', 'out', 'adjustment', 'return'] }, quantity: { type: 'number' },
          referenceId: { type: 'string' }, note: { type: 'string' }, commit: { type: 'boolean' }, approvalId: { type: 'string' },
        },
        required: ['productId', 'type', 'quantity'],
      },
    },
  },
] as const;

function now() {
  return new Date().toISOString();
}

function pushTrace(ctx: AgentContext, type: OllamaAgentTrace['type'], detail: string, name?: string) {
  ctx.trace.push({ at: now(), type, name, detail: detail.slice(0, 1200) });
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function errMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? 'Error desconocido');
}

async function resolveAccess(tenantId: string, keyId: string): Promise<McpAccess> {
  const status = await getMcpAccessStatus(tenantId);
  const connection = status.connections.find((item) => item.keyId === keyId);
  if (!connection) throw new Error('AI_AGENT_MCP_CONNECTION_NOT_FOUND');
  return {
    tenantId,
    keyId: connection.keyId,
    tokenPrefix: connection.tokenPrefix,
    scopes: new Set(connection.scopes),
    label: `${connection.label} · Ollama Harness`,
  };
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
  const { data, error } = await insforgeAdmin.database.from('pwa_events')
    .select('event,user_id,meta,created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(12000);
  if (error) throw new Error(error.message);
  const rows = ((data || []) as Array<{ event?: string; user_id?: string | null; meta?: Record<string, unknown> | null; created_at?: string }>).filter((row) => {
    const eventTenant = String(row.meta?.tenantId || row.meta?.tenant_id || '');
    return eventTenant ? eventTenant === tenantId : tenantId === DEFAULT_TENANT_ID;
  });
  const views = rows.filter((row) => row.event === 'page_view');
  const sessions = new Set(views.map((row) => String(row.meta?.session_id || '')).filter(Boolean));
  const visitors = new Set(views.map((row) => row.user_id).filter(Boolean));
  const countBy = (fn: (row: (typeof views)[number]) => string) => Object.entries(views.reduce<Record<string, number>>((acc, row) => {
    const key = fn(row) || 'Desconocido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, value]) => ({ name, value }));
  return {
    days,
    pageViews: views.length,
    visitors: visitors.size,
    sessions: sessions.size,
    pages: countBy((row) => String(row.meta?.full_path || row.meta?.path || '/')),
    sources: countBy((row) => String(row.meta?.utm_source || row.meta?.referrer || 'Directo')),
    devices: countBy((row) => String(row.meta?.device || 'Desconocido')),
    recent: views.slice(0, 30).map((row) => ({ at: row.created_at, page: row.meta?.full_path || row.meta?.path || '/', source: row.meta?.utm_source || row.meta?.referrer || 'Directo', device: row.meta?.device || 'Desconocido' })),
  };
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
  const buttons = $('button, a[role="button"]').toArray().map((node) => $(node).text().replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 25);
  return {
    url: target.toString(),
    status: response.status,
    title: $('title').first().text().trim(),
    description: $('meta[name="description"]').attr('content') || '',
    canonical: $('link[rel="canonical"]').attr('href') || '',
    h1: $('h1').toArray().map((node) => $(node).text().replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 10),
    h2: $('h2').toArray().map((node) => $(node).text().replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20),
    links: { total: links.length, internal: links.filter((href) => href.startsWith('/') || href.startsWith(base)).length, external: links.filter((href) => /^https?:\/\//i.test(href) && !href.startsWith(base)).length },
    images: { total: images.length, missingAlt: images.filter((node) => !String($(node).attr('alt') || '').trim()).length },
    forms: $('form').length,
    buttons,
    textCharacters: $('body').text().replace(/\s+/g, ' ').trim().length,
  };
}

async function executeTool(ctx: AgentContext, name: string, input: Record<string, unknown>) {
  if (name === 'products_search') return governed(ctx, name, 'read', input, async () => {
    requireMcpScope(ctx.access, 'products:read');
    return mcpSearchProducts(ctx.tenantId, { query: String(input.query || ''), limit: Number(input.limit || 20), activeOnly: input.activeOnly === true, stock: (input.stock as 'any' | 'low' | 'out') || 'any' });
  });
  if (name === 'product_get') return governed(ctx, name, 'read', input, async () => {
    requireMcpScope(ctx.access, 'products:read');
    return mcpGetProduct(ctx.tenantId, { id: String(input.id || ''), sku: String(input.sku || ''), ean: String(input.ean || ''), code: String(input.code || '') });
  });
  if (name === 'catalog_supervise') return governed(ctx, name, 'read', input, async () => {
    requireMcpScope(ctx.access, 'products:read');
    return mcpCatalogAudit(ctx.tenantId, { limit: Number(input.limit || 80), lowStockThreshold: Number(input.lowStockThreshold || 5) });
  });
  if (name === 'market_search') return governed(ctx, name, 'read', input, async () => {
    requireMcpScope(ctx.access, 'products:read');
    return mcpSearchMarket({ query: String(input.query || ''), limit: Number(input.limit || 12) });
  });
  if (name === 'analytics_summary') return governed(ctx, name, 'read', input, async () => buildFabrickDailyBrief(ctx.tenantId, Number(input.days || 7)));
  if (name === 'traffic_report') return governed(ctx, name, 'read', input, async () => trafficReport(ctx.tenantId, input.days));
  if (name === 'site_audit') return governed(ctx, name, 'read', input, async () => siteAudit(ctx.origin, input.path));

  if (name === 'product_create') {
    const { commit: commitRaw, approvalId, ...payload } = input;
    const commit = commitRaw === true;
    return governed(ctx, name, commit ? 'commit' : 'preview', payload, async () => {
      requireMcpScope(ctx.access, 'products:write');
      if (commit && !ctx.allowWrites) throw new Error('AI_AGENT_WRITE_MODE_DISABLED');
      const publishing = payload.activo === true;
      if (publishing) requireMcpScope(ctx.access, 'products:publish');
      const needsApproval = publishing && await policyRequiresApproval(ctx.access, 'publish');
      if (!commit) {
        const approval = needsApproval ? await requestMcpApproval({ access: ctx.access, toolName: name, payload, summary: `Ollama propone publicar producto: ${String(payload.name || '')}` }) : null;
        if (approval) {
          ctx.approvals.push({ id: approval.id, tool: name, status: approval.status, expiresAt: approval.expiresAt });
          pushTrace(ctx, 'approval', `Aprobación ${approval.status}: ${approval.id}`, name);
        }
        return { preview: { ...payload, stock: 0 }, approvalRequired: needsApproval, approvalId: approval?.id || null, message: needsApproval ? 'Requiere aprobación humana en Gobernanza antes del commit.' : 'Vista previa lista. El commit solo se permite si el modo ejecución está habilitado.' };
      }
      if (needsApproval) await consumeMcpApproval({ access: ctx.access, toolName: name, payload, approvalId: String(approvalId || '') });
      return { ok: true, product: await mcpCreateProduct(ctx.tenantId, payload) };
    }, commit);
  }

  if (name === 'product_update') {
    const { productId, commit: commitRaw, approvalId, ...patch } = input;
    const id = String(productId || '');
    const commit = commitRaw === true;
    const payload = { productId: id, ...patch };
    return governed(ctx, name, commit ? 'commit' : 'preview', payload, async () => {
      requireMcpScope(ctx.access, 'products:write');
      if (commit && !ctx.allowWrites) throw new Error('AI_AGENT_WRITE_MODE_DISABLED');
      const publishChange = patch.activo !== undefined;
      if (publishChange) requireMcpScope(ctx.access, 'products:publish');
      const needsApproval = publishChange && await policyRequiresApproval(ctx.access, 'publish');
      const before = await mcpGetProduct(ctx.tenantId, { id });
      if (!before) throw new Error('Producto no encontrado.');
      if (!commit) {
        const approval = needsApproval ? await requestMcpApproval({ access: ctx.access, toolName: name, payload, summary: `Ollama propone ${patch.activo ? 'activar' : 'desactivar'}: ${String(before.name || id)}` }) : null;
        if (approval) {
          ctx.approvals.push({ id: approval.id, tool: name, status: approval.status, expiresAt: approval.expiresAt });
          pushTrace(ctx, 'approval', `Aprobación ${approval.status}: ${approval.id}`, name);
        }
        return { before, proposedChanges: patch, approvalRequired: needsApproval, approvalId: approval?.id || null };
      }
      if (needsApproval) await consumeMcpApproval({ access: ctx.access, toolName: name, payload, approvalId: String(approvalId || '') });
      return { ok: true, product: await mcpUpdateProduct(ctx.tenantId, id, patch) };
    }, commit);
  }

  if (name === 'inventory_move') {
    const { productId, type, quantity, referenceId, note, commit: commitRaw, approvalId } = input;
    const commit = commitRaw === true;
    const payload = { productId: String(productId || ''), type: String(type || ''), quantity: Math.trunc(Number(quantity || 0)), referenceId: String(referenceId || ''), note: String(note || '') };
    return governed(ctx, name, commit ? 'commit' : 'preview', payload, async () => {
      requireMcpScope(ctx.access, 'inventory:write');
      if (commit && !ctx.allowWrites) throw new Error('AI_AGENT_WRITE_MODE_DISABLED');
      const product = await mcpGetProduct(ctx.tenantId, { id: payload.productId });
      if (!product) throw new Error('Producto no encontrado.');
      const needsApproval = await policyRequiresApproval(ctx.access, 'inventory');
      if (!commit) {
        const current = Number((product as Record<string, unknown>).stock || 0);
        const next = payload.type === 'adjustment' ? payload.quantity : payload.type === 'out' ? current - payload.quantity : current + payload.quantity;
        const approval = needsApproval ? await requestMcpApproval({ access: ctx.access, toolName: name, payload, summary: `Ollama propone mover stock de ${String((product as Record<string, unknown>).name || payload.productId)}: ${current} → ${next}` }) : null;
        if (approval) {
          ctx.approvals.push({ id: approval.id, tool: name, status: approval.status, expiresAt: approval.expiresAt });
          pushTrace(ctx, 'approval', `Aprobación ${approval.status}: ${approval.id}`, name);
        }
        return { productId: payload.productId, currentStock: current, proposedStock: next, approvalRequired: needsApproval, approvalId: approval?.id || null };
      }
      if (needsApproval) await consumeMcpApproval({ access: ctx.access, toolName: name, payload, approvalId: String(approvalId || '') });
      return mcpMoveInventory(ctx.tenantId, { productId: payload.productId, type: payload.type as 'in' | 'out' | 'adjustment' | 'return', quantity: payload.quantity, referenceId: payload.referenceId || `ollama:${crypto.randomUUID()}`, note: payload.note });
    }, commit);
  }

  throw new Error(`AI_AGENT_TOOL_UNKNOWN:${name}`);
}

const SYSTEM_PROMPT = `Eres el agente operativo de Soluciones Fabrick ejecutándose dentro del AI Harness de Ollama.
Tu trabajo es analizar la tienda y ejecutar herramientas solo cuando aporten evidencia real.
Reglas:
- Usa analytics_summary y traffic_report para hablar de visitas, conversión o rendimiento; no inventes métricas.
- Usa site_audit para revisar páginas públicas antes de recomendar cambios de UX/SEO.
- Usa products_search/product_get/catalog_supervise antes de crear o editar productos.
- Para cualquier escritura, primero usa commit=false y explica el resultado. Solo usa commit=true si el modo de ejecución está habilitado y la solicitud del usuario pide ejecutar el cambio.
- Publicación/despublicación e inventario pueden requerir aprobación humana. Si recibes approvalRequired=true, detente y explica que debe aprobarse en Gobernanza; nunca inventes ni autoapruebes un approvalId.
- No tienes SQL libre, acceso a secretos, pagos, usuarios ni credenciales.
- No afirmes que cambiaste código fuente. Puedes auditar páginas y proponer mejoras; los cambios de código requieren el flujo de desarrollo separado.
- Responde en español, de forma concreta, indicando qué herramientas utilizaste y qué quedó pendiente.`;

export async function runOllamaAgent(input: {
  tenantId: string;
  keyId: string;
  model: string;
  prompt: string;
  origin: string;
  allowWrites?: boolean;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<OllamaAgentResult> {
  const access = await resolveAccess(input.tenantId, input.keyId);
  const config = await resolveTenantProviderConfig('ollama', input.model, input.tenantId);
  if (!config) throw new Error('OLLAMA_NOT_CONFIGURED');
  const baseUrl = (config.baseUrl || 'https://ollama.com/v1').replace(/\/+$/, '');
  const ctx: AgentContext = { tenantId: input.tenantId, access, allowWrites: input.allowWrites === true, origin: input.origin, trace: [], approvals: [] };
  const messages: AgentMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(input.history || []).slice(-12).map((message) => ({ role: message.role, content: message.content } as AgentMessage)),
    { role: 'user', content: input.prompt.slice(0, 12000) },
  ];
  let toolCalls = 0;
  let responseText = '';

  for (let turn = 0; turn < 8; turn += 1) {
    pushTrace(ctx, 'model', `Turno ${turn + 1}: consultando ${input.model}`);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: input.model, messages, tools: TOOLS, tool_choice: 'auto', stream: false, temperature: 0.2, max_tokens: 3000 }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`OLLAMA_HTTP_${response.status}:${(await response.text().catch(() => '')).slice(0, 500)}`);
    const body = await response.json() as { choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }> };
    const assistant = body.choices?.[0]?.message;
    if (!assistant) throw new Error('OLLAMA_EMPTY_RESPONSE');
    const calls = Array.isArray(assistant.tool_calls) ? assistant.tool_calls : [];
    messages.push({ role: 'assistant', content: assistant.content || '', tool_calls: calls.length ? calls : undefined });

    if (!calls.length) {
      responseText = String(assistant.content || '').trim();
      break;
    }

    for (const call of calls.slice(0, 6)) {
      toolCalls += 1;
      if (toolCalls > 20) throw new Error('AI_AGENT_TOOL_LIMIT_REACHED');
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>; } catch { args = {}; }
      pushTrace(ctx, 'tool_call', json(args).slice(0, 800), call.function.name);
      try {
        const result = await executeTool(ctx, call.function.name, args);
        const serialized = json(result).slice(0, 14000);
        pushTrace(ctx, 'tool_result', serialized.slice(0, 1200), call.function.name);
        messages.push({ role: 'tool', tool_call_id: call.id, content: serialized });
      } catch (error) {
        const message = errMessage(error);
        pushTrace(ctx, 'error', message, call.function.name);
        messages.push({ role: 'tool', tool_call_id: call.id, content: json({ error: message }) });
      }
    }
  }

  if (!responseText) responseText = ctx.approvals.length ? 'La operación quedó pendiente de aprobación humana en Gobernanza.' : 'El agente terminó sin una respuesta textual final.';
  return { ok: true, response: responseText, trace: ctx.trace, toolCalls, approvals: ctx.approvals };
}
