import 'server-only';

import type { McpAccess } from '@/lib/mcp/access';
import type { HarnessAgentProfile } from '@/lib/mcp/agentProfile';
import { HARNESS_AGENT_TOOLS, executeHarnessAgentTool, type HarnessToolTrace } from '@/lib/mcp/agentTools';
import { resolveTenantProviderConfig } from '@/lib/tenantAiConfig';

type InputMessage = { role: 'user' | 'assistant'; content: string };
type ToolCall = {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string | Record<string, unknown> };
};
type ProviderMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};
type ProviderResponse = {
  choices?: Array<{ message?: { role?: string; content?: string | null; tool_calls?: ToolCall[] } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

export type OllamaAgentResult = {
  content: string;
  toolTrace: HarnessToolTrace[];
  steps: number;
  usage: { input: number; output: number; total: number };
  stoppedByLimit: boolean;
};

const SYSTEM_PROMPT = `Eres el agente operativo interno de Soluciones Fabrick. Trabajas únicamente con las herramientas que entrega el servidor y con los permisos del tenant actual.
Reglas obligatorias:
1. Para catálogo, busca o lee el producto antes de crear o editar para evitar duplicados.
2. Para visitas, conversión, rendimiento y mejoras usa site_intelligence. Explica hallazgos con métricas disponibles, no inventes datos.
3. Nunca inventes stock. Consulta antes y usa inventory_move para cualquier movimiento.
4. Las escrituras son de dos fases. Primero usa commit=false para preparar una vista previa. Solo usa commit=true cuando el usuario haya pedido explícitamente ejecutar el cambio y el servidor permita commits en ese mensaje.
5. Publicar/despublicar e inventario pueden exigir aprobación humana. Si una herramienta devuelve approvalRequired=true, informa el approvalId y espera que el administrador lo apruebe. No intentes eludir la aprobación.
6. Nunca pidas, muestres ni intentes recuperar claves API, secretos, cookies, tokens o credenciales.
7. No declares que una acción se ejecutó si la herramienta solo devolvió preview, commitBlocked o error.
8. Si no tienes una herramienta para una acción, dilo y propón el siguiente paso seguro en vez de simularla.
9. Mantén aislamiento estricto del tenant actual.
10. Responde en español salvo que el usuario pida otro idioma.`;

function cleanMessages(messages: InputMessage[]) {
  return messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .slice(-20)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 20_000) })) as ProviderMessage[];
}

function parseToolArguments(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AGENT_TOOL_ARGS_INVALID');
  return parsed as Record<string, unknown>;
}

function safeToolResult(value: unknown) {
  let text = '';
  try {
    text = JSON.stringify(value);
  } catch {
    text = JSON.stringify({ error: 'Resultado no serializable.' });
  }
  const max = 36_000;
  return text.length > max ? `${text.slice(0, max)}…[resultado truncado]` : text;
}

function providerUsage(response: ProviderResponse) {
  const input = Number(response.usage?.prompt_tokens ?? response.usage?.input_tokens ?? 0) || 0;
  const output = Number(response.usage?.completion_tokens ?? response.usage?.output_tokens ?? 0) || 0;
  const total = Number(response.usage?.total_tokens ?? input + output) || input + output;
  return { input, output, total };
}

async function callOllama(input: {
  tenantId: string;
  model: string;
  messages: ProviderMessage[];
}) {
  const config = await resolveTenantProviderConfig('ollama', input.model, input.tenantId);
  if (!config?.apiKey) throw new Error('OLLAMA_NOT_CONFIGURED');
  const baseUrl = (config.baseUrl || 'https://ollama.com/v1').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      stream: false,
      temperature: 0.2,
      messages: input.messages,
      tools: HARNESS_AGENT_TOOLS,
      tool_choice: 'auto',
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const raw = await response.text();
  let body: ProviderResponse = {};
  try { body = JSON.parse(raw) as ProviderResponse; } catch { /* handled below */ }
  if (!response.ok) throw new Error(body.error?.message || raw.slice(0, 1000) || `OLLAMA_HTTP_${response.status}`);
  if (!body.choices?.[0]?.message) throw new Error('OLLAMA_AGENT_EMPTY_RESPONSE');
  return body;
}

export async function runOllamaAgent(input: {
  access: McpAccess;
  profile: HarnessAgentProfile;
  model: string;
  messages: InputMessage[];
  allowCommit: boolean;
}): Promise<OllamaAgentResult> {
  if (!input.profile.enabled) throw new Error('AGENT_DISABLED');
  const model = input.model.trim().slice(0, 180);
  if (!model) throw new Error('AGENT_MODEL_REQUIRED');

  const conversation: ProviderMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...cleanMessages(input.messages),
  ];
  const traces: HarnessToolTrace[] = [];
  let totalInput = 0;
  let totalOutput = 0;
  let steps = 0;
  let lastText = '';

  for (; steps < input.profile.maxSteps; steps += 1) {
    const response = await callOllama({ tenantId: input.access.tenantId, model, messages: conversation });
    const usage = providerUsage(response);
    totalInput += usage.input;
    totalOutput += usage.output;
    const message = response.choices?.[0]?.message;
    if (!message) throw new Error('OLLAMA_AGENT_EMPTY_RESPONSE');
    const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    const content = typeof message.content === 'string' ? message.content : '';
    lastText = content || lastText;

    conversation.push({
      role: 'assistant',
      content: content || null,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    });

    if (!toolCalls.length) {
      return {
        content: content || 'Análisis completado sin texto adicional.',
        toolTrace: traces,
        steps: steps + 1,
        usage: { input: totalInput, output: totalOutput, total: totalInput + totalOutput },
        stoppedByLimit: false,
      };
    }

    for (let index = 0; index < Math.min(toolCalls.length, 8); index += 1) {
      const call = toolCalls[index];
      const toolName = String(call.function?.name || '').trim();
      const callId = String(call.id || `call_${steps}_${index}`);
      if (!toolName) {
        conversation.push({ role: 'tool', tool_call_id: callId, content: JSON.stringify({ error: 'Nombre de herramienta ausente.' }) });
        continue;
      }

      try {
        const args = parseToolArguments(call.function?.arguments);
        const execution = await executeHarnessAgentTool({
          access: input.access,
          toolName,
          args,
          allowCommit: input.allowCommit,
        });
        traces.push(execution.trace);
        conversation.push({ role: 'tool', tool_call_id: callId, content: safeToolResult(execution.value) });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        traces.push({ tool: toolName, phase: 'read', ok: false, detail });
        conversation.push({ role: 'tool', tool_call_id: callId, content: safeToolResult({ error: detail }) });
      }
    }
  }

  return {
    content: lastText || `Detuve la ejecución al alcanzar el límite seguro de ${input.profile.maxSteps} pasos. Revisa la traza antes de continuar.`,
    toolTrace: traces,
    steps,
    usage: { input: totalInput, output: totalOutput, total: totalInput + totalOutput },
    stoppedByLimit: true,
  };
}
