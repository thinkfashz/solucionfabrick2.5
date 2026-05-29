export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90; // Vercel Pro / containers

import { NextRequest } from 'next/server';
import type { BrowseResult, SearchResult } from '@/lib/playwright-agent';

/* ─── InsForge DB helper ─────────────────────────────────────────────── */
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey() {
  return (
    process.env.INSFORGE_API_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'ik_7e23032539c2dc64d5d27ca29d07b928'
  );
}

async function rawsql(query: string) {
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
    return res.json();
  } catch {
    return null;
  }
}

/* ─── Resolve AI config (Anthropic or Groq) from DB ─────────────────── */
type Provider = 'anthropic' | 'groq';

interface AiConfig { provider: Provider; apiKey: string; modelo: string }

async function resolveAiConfig(): Promise<AiConfig | null> {
  try {
    const configData = await rawsql(
      `SELECT anthropic_api_key, modelo_ia, proveedor_ia FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;`
    );
    const row = configData?.data?.rows?.[0] as { anthropic_api_key?: string; modelo_ia?: string; proveedor_ia?: string } | undefined;
    const proveedor = (row?.proveedor_ia as Provider | undefined) ?? 'anthropic';

    if (proveedor === 'groq') {
      const d = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'groq' LIMIT 1;`);
      const r = d?.data?.rows?.[0] as { credentials?: Record<string, string> } | undefined;
      const k = r?.credentials?.api_key?.trim() ?? '';
      if (k) return { provider: 'groq', apiKey: k, modelo: r?.credentials?.modelo ?? 'llama-3.3-70b-versatile' };
    }

    const anthData = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'anthropic' LIMIT 1;`);
    const anthRow = anthData?.data?.rows?.[0] as { credentials?: Record<string, string> } | undefined;
    const anthKey = anthRow?.credentials?.api_key?.trim() ?? '';
    if (anthKey) return { provider: 'anthropic', apiKey: anthKey, modelo: anthRow?.credentials?.modelo ?? row?.modelo_ia ?? 'claude-haiku-4-5-20251001' };

    if (row?.anthropic_api_key) return { provider: 'anthropic', apiKey: row.anthropic_api_key, modelo: row.modelo_ia ?? 'claude-haiku-4-5-20251001' };
  } catch { /* fall through */ }

  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return { provider: 'anthropic', apiKey: envKey, modelo: 'claude-haiku-4-5-20251001' };
  return null;
}

async function resolveSerperKey(): Promise<string | undefined> {
  try {
    const d = await rawsql(`SELECT credentials FROM integrations WHERE provider = 'serper' LIMIT 1;`);
    const r = d?.data?.rows?.[0] as { credentials?: Record<string, string> } | undefined;
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

/* ─── Tool execution ─────────────────────────────────────────────────── */
async function executeTool(
  name: string,
  input: Record<string, string>,
  serperKey: string | undefined,
): Promise<{ content: string; screenshot?: string }> {
  const { browsePage, searchWeb } = await import('@/lib/playwright-agent');

  if (name === 'buscar_web') {
    const result: SearchResult = await searchWeb(input.query, serperKey, input.pais ?? 'cl');
    if (!result.ok) return { content: `Error al buscar: ${result.error}` };
    let out = result.answerBox ? `📌 Respuesta directa: ${result.answerBox}\n\n` : '';
    out += result.results
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`)
      .join('\n\n');
    return { content: out || 'Sin resultados.' };
  }

  if (name === 'navegar_url' || name === 'capturar_pantalla') {
    const result: BrowseResult = await browsePage(input.url);
    if (result.error) return { content: `Error al navegar a ${input.url}: ${result.error}` };
    const content = name === 'capturar_pantalla'
      ? `Captura tomada de: ${result.title} (${result.url})`
      : `# ${result.title}\n\n${result.text}`;
    return { content, screenshot: result.screenshot || undefined };
  }

  return { content: 'Herramienta desconocida.' };
}

/* ─── Anthropic agent loop ───────────────────────────────────────────── */
async function runAnthropicLoop(
  messages: AnthropicMsg[],
  config: AiConfig,
  serperKey: string | undefined,
  emit: (data: Record<string, unknown>) => void,
): Promise<void> {
  const MAX_TURNS = 8;

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
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: TOOLS_ANTHROPIC,
        messages,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      emit({ type: 'error', content: `Error API Anthropic: ${await res.text()}` });
      return;
    }

    const data = await res.json() as {
      stop_reason: string;
      content: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, string> }>;
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

      const result = await executeTool(tool.name!, tool.input ?? {}, serperKey);

      emit({ type: 'tool_result', name: tool.name, content: result.content.slice(0, 800) });
      if (result.screenshot) {
        emit({ type: 'screenshot', url: tool.input?.url ?? '', data: result.screenshot });
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

/* ─── Groq agent loop ────────────────────────────────────────────────── */
async function runGroqLoop(
  messages: GroqMsg[],
  config: AiConfig,
  serperKey: string | undefined,
  emit: (data: Record<string, unknown>) => void,
): Promise<void> {
  const MAX_TURNS = 8;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.modelo,
        max_tokens: 2048,
        messages,
        tools: TOOLS_GROQ,
        tool_choice: 'auto',
      }),
      signal: AbortSignal.timeout(45_000),
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
      let input: Record<string, string> = {};
      try { input = JSON.parse(tc.function.arguments) as Record<string, string>; } catch { /* noop */ }

      emit({ type: 'tool_call', name: tc.function.name, input });

      const result = await executeTool(tc.function.name, input, serperKey);

      emit({ type: 'tool_result', name: tc.function.name, content: result.content.slice(0, 800) });
      if (result.screenshot) {
        emit({ type: 'screenshot', url: input.url ?? '', data: result.screenshot });
      }

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result.content,
      });
    }
  }
}

/* ─── Type helpers ───────────────────────────────────────────────────── */
type AnthropicMsg = { role: string; content: unknown };
type AnthropicToolResult = { type: 'tool_result'; tool_use_id: string; content: string };
type GroqMsg = { role: string; content: string | null; tool_calls?: unknown; tool_call_id?: string };

const SYSTEM_PROMPT = `Eres un agente de investigación inteligente para Soluciones Fabrick, empresa chilena de construcción y mobiliario.

Tienes acceso a herramientas para buscar en la web y navegar sitios en tiempo real. Úsalas proactivamente para dar respuestas basadas en datos reales y actualizados.

Áreas de especialización:
- Precios de materiales de construcción en Chile (MDF, madera, fierro, pintura, etc.)
- Análisis de competencia y benchmark de precios
- Búsqueda de proveedores y cotizaciones de materiales
- Tendencias del sector construcción/mobiliario en Chile
- Inteligencia de mercado para presupuestos competitivos
- Información de clientes/empresas (RUT, razón social, giro)

Siempre responde en español chileno. Sé conciso y accionable. Incluye precios en CLP cuando los encuentres.`;

/* ─── POST handler ───────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: { messages?: { role: string; content: string }[] };
  try { body = await req.json() as { messages?: { role: string; content: string }[] }; }
  catch { return new Response('Body inválido', { status: 400 }); }

  const userMessages = body.messages ?? [];
  if (!userMessages.length) return new Response('Sin mensajes', { status: 400 });

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

      emit({ type: 'thinking', content: `Usando ${config.provider === 'groq' ? 'Groq' : 'Anthropic'} · ${config.modelo}` });

      try {
        if (config.provider === 'groq') {
          const groqMsgs: GroqMsg[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...userMessages.map((m) => ({ role: m.role, content: m.content })),
          ];
          await runGroqLoop(groqMsgs, config, serperKey, emit);
        } else {
          const anthropicMsgs: AnthropicMsg[] = userMessages.map((m) => ({ role: m.role, content: m.content }));
          await runAnthropicLoop(anthropicMsgs, config, serperKey, emit);
        }
      } catch (err) {
        emit({ type: 'error', content: err instanceof Error ? err.message : 'Error inesperado.' });
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
