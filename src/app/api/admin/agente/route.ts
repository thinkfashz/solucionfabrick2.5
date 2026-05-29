export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90; // Vercel Pro / containers

import { NextRequest } from 'next/server';
import { executeTool, ensureAgentTables } from '@/lib/agent-executor';
import { BrowserSession } from '@/lib/agent-browser';

/* ─── InsForge DB helper ─────────────────────────────────────────────── */
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return (
    process.env.INSFORGE_API_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'ik_7e23032539c2dc64d5d27ca29d07b928'
  );
}

async function rawsql(query: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `${INSFORGE_URL.replace(/\/+$/, '')}/api/database/advance/rawsql/unrestricted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': insforgeKey() },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(8_000),
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<Record<string, unknown>>;
  } catch {
    return null;
  }
}

/* ─── Resolve AI config (Anthropic, Groq, or OpenRouter) from DB ────── */
type Provider = 'anthropic' | 'groq' | 'openrouter';

interface AiConfig { provider: Provider; apiKey: string; modelo: string; siteUrl?: string; appName?: string }

type CredRow = { credentials?: Record<string, string> };
type ConfigRow = { anthropic_api_key?: string; modelo_ia?: string; proveedor_ia?: string };

function credRows(d: unknown) {
  return (d as { data?: { rows?: CredRow[] } } | null)?.data?.rows ?? [];
}

async function resolveAiConfig(): Promise<AiConfig | null> {
  try {
    const configData = await rawsql(
      `SELECT anthropic_api_key, modelo_ia, proveedor_ia FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;`
    );
    const row = (configData as { data?: { rows?: ConfigRow[] } } | null)?.data?.rows?.[0];
    const proveedor = (row?.proveedor_ia ?? 'anthropic') as Provider;
    const prefModelo = row?.modelo_ia ?? '';

    if (proveedor === 'openrouter') {
      const d = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'openrouter' LIMIT 1;`);
      const r = credRows(d)[0];
      const k = r?.credentials?.api_key?.trim() ?? '';
      if (k) return { provider: 'openrouter', apiKey: k, modelo: prefModelo || 'meta-llama/llama-3.3-70b-instruct:free', siteUrl: r?.credentials?.site_url, appName: r?.credentials?.app_name };
    }

    if (proveedor === 'groq') {
      const d = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'groq' LIMIT 1;`);
      const r = credRows(d)[0];
      const k = r?.credentials?.api_key?.trim() ?? '';
      if (k) return { provider: 'groq', apiKey: k, modelo: prefModelo || r?.credentials?.modelo || 'llama-3.3-70b-versatile' };
    }

    // Try anthropic from integrations
    const anthData = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'anthropic' LIMIT 1;`);
    const anthRow = credRows(anthData)[0];
    const anthKey = anthRow?.credentials?.api_key?.trim() ?? '';
    if (anthKey) return { provider: 'anthropic', apiKey: anthKey, modelo: prefModelo || anthRow?.credentials?.modelo || 'claude-haiku-4-5-20251001' };

    // Fallback: try openrouter even if not primary (user has it configured)
    const orData = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'openrouter' LIMIT 1;`);
    const orRow = credRows(orData)[0];
    const orKey = orRow?.credentials?.api_key?.trim() ?? '';
    if (orKey) return { provider: 'openrouter', apiKey: orKey, modelo: prefModelo || 'meta-llama/llama-3.3-70b-instruct:free', siteUrl: orRow?.credentials?.site_url, appName: orRow?.credentials?.app_name };

    // Legacy: key stored directly in configuracion_ia
    if (row?.anthropic_api_key) return { provider: 'anthropic', apiKey: row.anthropic_api_key, modelo: prefModelo || 'claude-haiku-4-5-20251001' };
  } catch { /* fall through */ }

  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return { provider: 'anthropic', apiKey: envKey, modelo: 'claude-haiku-4-5-20251001' };
  return null;
}

async function resolveSerperKey(): Promise<string | undefined> {
  try {
    const d = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'serper' LIMIT 1;`);
    const r = (d as { data?: { rows?: Array<{ credentials?: Record<string, string> }> } } | null)?.data?.rows?.[0];
    return r?.credentials?.api_key?.trim() || process.env.SERPER_API_KEY;
  } catch {
    return process.env.SERPER_API_KEY;
  }
}

/* ─── Tool definitions ───────────────────────────────────────────────── */
const TOOLS_ANTHROPIC = [
  {
    name: 'buscar_web',
    description: 'Busca información en la web en tiempo real usando Google. Úsalo cuando necesites precios, noticias, empresas, productos o cualquier dato actual.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Término de búsqueda en español o inglés, específico y descriptivo' },
        pais: { type: 'string', description: 'Código de país para resultados locales (ej: cl, ar, mx). Default: cl', enum: ['cl', 'ar', 'mx', 'co', 'pe', 'es', 'us'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'navegar_url',
    description: 'Abre una URL con el navegador y extrae su contenido completo. Úsalo para leer páginas de competidores, proveedores, catálogos de precios, sitios de noticias, etc.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL completa incluyendo https://' },
      },
      required: ['url'],
    },
  },
  {
    name: 'capturar_pantalla',
    description: 'Toma una captura de pantalla visual de una URL. Útil para ver el diseño de un sitio, catálogos visuales o verificar un resultado antes de extraer datos.',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL completa a capturar' },
      },
      required: ['url'],
    },
  },
  {
    name: 'consultar_bd',
    description: 'Ejecuta una consulta SELECT en la base de datos InsForge. Solo permite SELECT. Útil para listar presupuestos, clientes, productos, configuraciones.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Consulta SQL SELECT completa. Solo se permiten SELECT.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'modificar_bd',
    description: 'Ejecuta INSERT, UPDATE o DELETE en tablas permitidas: catalogo_productos, agente_memoria, presupuesto_registros.',
    input_schema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'Sentencia SQL INSERT/UPDATE/DELETE.' },
        tabla: { type: 'string', description: 'Nombre de la tabla a modificar.', enum: ['catalogo_productos', 'agente_memoria', 'presupuesto_registros'] },
      },
      required: ['sql', 'tabla'],
    },
  },
  {
    name: 'crear_producto',
    description: 'Crea un nuevo producto en el catálogo de Soluciones Fabrick con nombre, descripción, categoría, precio base y unidad.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', description: 'Nombre del producto o servicio' },
        descripcion: { type: 'string', description: 'Descripción detallada del producto' },
        categoria: { type: 'string', description: 'Categoría (ej: Muebles, Pisos, Instalaciones, Cocinas)' },
        precio_base: { type: 'number', description: 'Precio base en CLP' },
        unidad: { type: 'string', description: 'Unidad de medida (ej: m², unidad, ml, hr)' },
        materiales: { type: 'string', description: 'Materiales principales utilizados' },
        tiempo_instalacion: { type: 'string', description: 'Tiempo estimado de instalación (ej: 2-3 días)' },
      },
      required: ['nombre'],
    },
  },
  {
    name: 'listar_productos',
    description: 'Lista los productos del catálogo. Puede filtrar por categoría o estado activo.',
    input_schema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', description: 'Filtrar por categoría (opcional)' },
        activo: { type: 'string', description: 'Filtrar por estado: "true" o "false" (opcional)' },
      },
    },
  },
  {
    name: 'guardar_hallazgo',
    description: 'Guarda un hallazgo, precio, dato de mercado o sugerencia en la memoria persistente del agente.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', description: 'Tipo de entrada', enum: ['hallazgo', 'sugerencia', 'precio', 'dato_mercado'] },
        titulo: { type: 'string', description: 'Título breve del hallazgo' },
        contenido: { type: 'string', description: 'Contenido detallado del hallazgo' },
        fuente: { type: 'string', description: 'URL o fuente del dato (opcional)' },
      },
      required: ['tipo', 'titulo', 'contenido'],
    },
  },
  {
    name: 'leer_memoria',
    description: 'Lee hallazgos y datos guardados en la memoria del agente.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', description: 'Filtrar por tipo (opcional): hallazgo, sugerencia, precio, dato_mercado' },
        limite: { type: 'string', description: 'Número máximo de entradas a retornar (default: 20, max: 50)' },
      },
    },
  },
  {
    name: 'enviar_whatsapp',
    description: 'Envía un mensaje de WhatsApp a un número telefónico usando la integración WhatsApp Business configurada.',
    input_schema: {
      type: 'object',
      properties: {
        telefono: { type: 'string', description: 'Número de teléfono en formato internacional (ej: 56912345678)' },
        mensaje: { type: 'string', description: 'Texto del mensaje a enviar' },
      },
      required: ['telefono', 'mensaje'],
    },
  },
  {
    name: 'enviar_email',
    description: 'Envía un email transaccional usando Resend. Requiere la integración Resend configurada.',
    input_schema: {
      type: 'object',
      properties: {
        para: { type: 'string', description: 'Email del destinatario' },
        asunto: { type: 'string', description: 'Asunto del email' },
        cuerpo_html: { type: 'string', description: 'Contenido HTML del email' },
      },
      required: ['para', 'asunto', 'cuerpo_html'],
    },
  },
  {
    name: 'buscar_ml',
    description: 'Busca productos en MercadoLibre Chile (MLC). API pública, no requiere autenticación. Retorna títulos, precios y links.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Término de búsqueda en MercadoLibre' },
        limite: { type: 'string', description: 'Número de resultados (default: 6, max: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'probar_integracion',
    description: 'Prueba una integración configurada para verificar que está funcionando correctamente.',
    input_schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Nombre del proveedor a probar (ej: whatsapp, resend, mercadolibre, mercadopago, stripe, serper)' },
      },
      required: ['provider'],
    },
  },
  {
    name: 'hacer_clic',
    description: 'Hace clic en un elemento de la página actual del navegador. Usa texto visible del botón/enlace o un selector CSS.',
    input_schema: {
      type: 'object',
      properties: {
        objetivo: { type: 'string', description: 'Texto visible del elemento a clicar (ej: "Agregar al carro") o selector CSS (ej: "#btn-submit")' },
      },
      required: ['objetivo'],
    },
  },
  {
    name: 'escribir_en',
    description: 'Escribe texto en un campo de la página actual del navegador (input, textarea, buscador).',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Selector CSS del campo (ej: input[name="q"], #search-box, textarea)' },
        texto: { type: 'string', description: 'Texto a escribir en el campo' },
      },
      required: ['selector', 'texto'],
    },
  },
  {
    name: 'presionar_tecla',
    description: 'Presiona una tecla del teclado en la página actual (Enter, Tab, Escape, ArrowDown, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        tecla: { type: 'string', description: 'Nombre de la tecla a presionar (ej: Enter, Tab, Escape, ArrowDown, ArrowUp, Space)' },
      },
      required: ['tecla'],
    },
  },
  {
    name: 'desplazar_pagina',
    description: 'Desplaza la página actual del navegador hacia arriba o abajo.',
    input_schema: {
      type: 'object',
      properties: {
        direccion: { type: 'string', description: 'Dirección del desplazamiento', enum: ['arriba', 'abajo'] },
        pixeles: { type: 'number', description: 'Cantidad de píxeles a desplazar (default: 600)' },
      },
      required: ['direccion'],
    },
  },
  {
    name: 'leer_pagina_actual',
    description: 'Lee el contenido de texto de la página actual en el navegador sin re-navegar. Útil para leer contenido cargado dinámicamente.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
] as const;

// OpenAI-compatible tool format for Groq
const TOOLS_GROQ = TOOLS_ANTHROPIC.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema,
  },
}));

/* ─── SSE helpers ────────────────────────────────────────────────────── */
function sseEvent(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/* ─── Type helpers ───────────────────────────────────────────────────── */
type AnthropicMsg = { role: string; content: unknown };
type AnthropicToolResult = { type: 'tool_result'; tool_use_id: string; content: string };
type GroqMsg = { role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string };

const SYSTEM_PROMPT = `Eres un agente inteligente de Soluciones Fabrick con acceso completo a:
1. Navegador web en tiempo real (buscar_web, navegar_url, capturar_pantalla)
2. Interacción con el navegador (hacer_clic, escribir_en, presionar_tecla, desplazar_pagina, leer_pagina_actual) — úsalos para navegar, llenar formularios, hacer búsquedas interactivas
3. Base de datos InsForge (consultar_bd, modificar_bd)
4. Catálogo de productos (crear_producto, listar_productos)
5. Memoria persistente (guardar_hallazgo, leer_memoria)
6. Plataformas conectadas: WhatsApp (enviar_whatsapp), Email Resend (enviar_email), MercadoLibre (buscar_ml), test de integraciones (probar_integracion)

Usa estas herramientas de forma proactiva. Cuando encuentres precios o datos útiles, guárdalos en memoria. Cuando el usuario pida crear un producto, créalo directamente en la BD. Cuando el usuario pida enviar un mensaje o email, hazlo de inmediato.

Áreas de especialización:
- Precios de materiales de construcción en Chile (MDF, madera, fierro, pintura, etc.)
- Análisis de competencia y benchmark de precios
- Búsqueda de proveedores y cotizaciones de materiales
- Tendencias del sector construcción/mobiliario en Chile
- Inteligencia de mercado para presupuestos competitivos
- Gestión del catálogo de productos y servicios
- Comunicaciones con clientes vía WhatsApp y email

Responde siempre en español chileno. Sé conciso y accionable. Incluye precios en CLP cuando los encuentres.`;

/* ─── Anthropic agent loop ───────────────────────────────────────────── */
async function runAnthropicLoop(
  messages: AnthropicMsg[],
  config: AiConfig,
  serperKey: string | undefined,
  emit: (data: Record<string, unknown>) => void,
  browser: BrowserSession,
): Promise<void> {
  const MAX_TURNS = 10;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.modelo,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS_ANTHROPIC,
        messages,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      emit({ type: 'error', content: `Error API Anthropic: ${await res.text()}` });
      return;
    }

    const data = await res.json() as {
      stop_reason: string;
      content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;
    };

    // Emit text blocks
    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        emit({ type: 'text', content: block.text });
      }
    }

    if (data.stop_reason !== 'tool_use') break;

    // Execute tools
    const toolUses = data.content.filter((b) => b.type === 'tool_use');
    const toolResults: AnthropicToolResult[] = [];

    for (const tool of toolUses) {
      emit({ type: 'tool_call', name: tool.name, input: tool.input });

      const result = await executeTool(tool.name!, tool.input ?? {}, serperKey, browser, emit);

      emit({ type: 'tool_result', name: tool.name, content: result.content.slice(0, 800) });
      if (result.screenshot) {
        emit({ type: 'screenshot', url: String((tool.input ?? {}).url ?? ''), data: result.screenshot });
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: tool.id!,
        content: result.content,
      });
    }

    // Add to conversation
    messages.push({ role: 'assistant', content: data.content });
    messages.push({ role: 'user', content: toolResults });
  }
}

/* ─── OpenRouter agent loop (OpenAI-compatible) ──────────────────────── */
async function runOpenRouterLoop(
  messages: GroqMsg[],
  config: AiConfig,
  serperKey: string | undefined,
  emit: (data: Record<string, unknown>) => void,
  browser: BrowserSession,
): Promise<void> {
  const MAX_TURNS = 10;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (config.siteUrl) headers['HTTP-Referer'] = config.siteUrl;
    if (config.appName) headers['X-Title'] = config.appName;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.modelo,
        max_tokens: 4096,
        messages,
        tools: TOOLS_GROQ,
        tool_choice: 'auto',
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      emit({ type: 'error', content: `Error API OpenRouter: ${await res.text()}` });
      return;
    }

    const data = await res.json() as {
      choices: Array<{
        finish_reason: string;
        message: {
          role: string;
          content: string | null;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
    };

    const choice = data.choices[0];
    if (!choice) break;

    if (choice.message.content) {
      emit({ type: 'text', content: choice.message.content });
    }

    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) break;

    messages.push({ role: 'assistant', content: choice.message.content, tool_calls: choice.message.tool_calls });

    for (const tc of choice.message.tool_calls) {
      let input: Record<string, unknown> = {};
      try { input = JSON.parse(tc.function.arguments) as Record<string, unknown>; } catch { /* noop */ }

      emit({ type: 'tool_call', name: tc.function.name, input });

      const result = await executeTool(tc.function.name, input, serperKey, browser, emit);

      emit({ type: 'tool_result', name: tc.function.name, content: result.content.slice(0, 800) });
      if (result.screenshot) {
        emit({ type: 'screenshot', url: String(input.url ?? ''), data: result.screenshot });
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result.content,
      });
    }
  }
}

/* ─── Groq agent loop ────────────────────────────────────────────────── */
async function runGroqLoop(
  messages: GroqMsg[],
  config: AiConfig,
  serperKey: string | undefined,
  emit: (data: Record<string, unknown>) => void,
  browser: BrowserSession,
): Promise<void> {
  const MAX_TURNS = 10;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.modelo,
        max_tokens: 4096,
        messages,
        tools: TOOLS_GROQ,
        tool_choice: 'auto',
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      emit({ type: 'error', content: `Error API Groq: ${await res.text()}` });
      return;
    }

    const data = await res.json() as {
      choices: Array<{
        finish_reason: string;
        message: {
          role: string;
          content: string | null;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
      }>;
    };

    const choice = data.choices[0];
    if (!choice) break;

    if (choice.message.content) {
      emit({ type: 'text', content: choice.message.content });
    }

    if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) break;

    messages.push({ role: 'assistant', content: choice.message.content, tool_calls: choice.message.tool_calls });

    for (const tc of choice.message.tool_calls) {
      let input: Record<string, unknown> = {};
      try { input = JSON.parse(tc.function.arguments) as Record<string, unknown>; } catch { /* noop */ }

      emit({ type: 'tool_call', name: tc.function.name, input });

      const result = await executeTool(tc.function.name, input, serperKey, browser, emit);

      emit({ type: 'tool_result', name: tc.function.name, content: result.content.slice(0, 800) });
      if (result.screenshot) {
        emit({ type: 'screenshot', url: String(input.url ?? ''), data: result.screenshot });
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result.content,
      });
    }
  }
}

/* ─── POST handler ───────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: { messages?: { role: string; content: string }[] };
  try { body = await req.json() as { messages?: { role: string; content: string }[] }; }
  catch { return new Response('Body inválido', { status: 400 }); }

  const userMessages = body.messages ?? [];
  if (!userMessages.length) return new Response('Sin mensajes', { status: 400 });

  // Ensure agent tables exist (non-blocking best-effort)
  void ensureAgentTables().catch(() => null);

  const config = await resolveAiConfig();
  const serperKey = await resolveSerperKey();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: Record<string, unknown>) => {
        try { controller.enqueue(encoder.encode(sseEvent(data))); } catch { /* closed */ }
      };

      if (!config) {
        emit({ type: 'error', content: 'No hay API key configurada. Ve a Admin → Centro de Integraciones y agrega tu clave de Anthropic o Groq.' });
        emit({ type: 'done' });
        controller.close();
        return;
      }

      const providerLabel = config.provider === 'groq' ? 'Groq' : config.provider === 'openrouter' ? 'OpenRouter' : 'Anthropic';
      emit({ type: 'thinking', content: `Usando ${providerLabel} · ${config.modelo}` });

      const browser = await BrowserSession.create();
      try {
        if (config.provider === 'groq') {
          const groqMsgs: GroqMsg[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...userMessages.map((m) => ({ role: m.role, content: m.content })),
          ];
          await runGroqLoop(groqMsgs, config, serperKey, emit, browser);
        } else if (config.provider === 'openrouter') {
          const orMsgs: GroqMsg[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...userMessages.map((m) => ({ role: m.role, content: m.content })),
          ];
          await runOpenRouterLoop(orMsgs, config, serperKey, emit, browser);
        } else {
          const anthropicMsgs: AnthropicMsg[] = userMessages.map((m) => ({ role: m.role, content: m.content }));
          await runAnthropicLoop(anthropicMsgs, config, serperKey, emit, browser);
        }
      } catch (err) {
        emit({ type: 'error', content: err instanceof Error ? err.message : 'Error inesperado.' });
      } finally {
        await browser.close();
      }

      emit({ type: 'done' });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
