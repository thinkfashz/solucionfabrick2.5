export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveProviderConfig } from '@/lib/resolveAiConfig';
import type { AiProvider } from '@/lib/resolveAiConfig';

interface ImageUrlPart {
  type: 'image_url';
  image_url: { url: string };
}
interface TextPart {
  type: 'text';
  text: string;
}
type ContentPart = TextPart | ImageUrlPart;
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
}
interface ChatRequestBody {
  provider: string;
  modelo: string;
  messages: ChatMessage[];
}
type SseEvent =
  | { type: 'chunk'; text: string }
  | { type: 'usage'; tokens: { input: number; output: number; total: number } }
  | { type: 'error'; message: string; errorType: string }
  | { type: 'done' };

const encoder = new TextEncoder();

function sendEvent(controller: ReadableStreamDefaultController, data: SseEvent) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

function classifyError(status?: number, msg?: string) {
  const m = (msg ?? '').toLowerCase();
  if (status === 401 || m.includes('invalid api key') || m.includes('unauthorized')) return { errorType: 'auth', message: 'Clave API inválida' };
  if (status === 402 || m.includes('insufficient credits') || m.includes('billing') || m.includes('quota')) return { errorType: 'credits', message: 'Sin créditos / saldo insuficiente' };
  if (status === 429 || m.includes('rate limit') || m.includes('too many requests')) return { errorType: 'ratelimit', message: 'Límite de solicitudes alcanzado' };
  if (status === 404 || m.includes('model not found') || m.includes('does not exist') || m.includes('no such model')) return { errorType: 'not_found', message: 'Modelo no disponible' };
  if (status === 529 || m.includes('overloaded')) return { errorType: 'overloaded', message: 'Proveedor sobrecargado' };
  if (status !== undefined && status >= 500) return { errorType: 'server', message: 'Error del servidor del proveedor' };
  if (m.includes('timeout') || m.includes('aborted')) return { errorType: 'timeout', message: 'Tiempo de espera agotado' };
  return { errorType: 'other', message: msg || 'Error desconocido' };
}

function hasImages(messages: ChatMessage[]) {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));
}

function extractBase64(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { mimeType: 'image/jpeg', data: dataUrl };
  return { mimeType: match[1], data: match[2] };
}

const OPENAI_COMPAT_BASE: Partial<Record<AiProvider, string>> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  grok: 'https://api.x.ai/v1',
  ollama: 'https://ollama.com/v1',
};

async function streamOpenAICompat(
  controller: ReadableStreamDefaultController,
  provider: AiProvider,
  baseUrl: string,
  apiKey: string,
  modelo: string,
  messages: ChatMessage[],
  siteUrl?: string,
  appName?: string,
) {
  if (provider === 'groq' && hasImages(messages)) {
    sendEvent(controller, { type: 'error', message: 'Este proveedor/modelo no admite imágenes en este flujo.', errorType: 'not_found' });
    sendEvent(controller, { type: 'done' });
    return;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (provider === 'openrouter') {
    if (siteUrl) headers['HTTP-Referer'] = siteUrl;
    if (appName) headers['X-Title'] = appName;
  }

  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: modelo, stream: true, max_tokens: 2048, messages }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const classified = classifyError(res.status, errText);
    sendEvent(controller, { type: 'error', ...classified });
    sendEvent(controller, { type: 'done' });
    return;
  }
  if (!res.body) {
    sendEvent(controller, { type: 'error', message: 'Sin cuerpo de respuesta', errorType: 'server' });
    sendEvent(controller, { type: 'done' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') {
        if (payload === '[DONE]') {
          if (inputTokens || outputTokens) sendEvent(controller, { type: 'usage', tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens } });
          sendEvent(controller, { type: 'done' });
          return;
        }
        continue;
      }
      try {
        const chunk = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number };
        };
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) sendEvent(controller, { type: 'chunk', text });
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? chunk.usage.input_tokens ?? inputTokens;
          outputTokens = chunk.usage.completion_tokens ?? chunk.usage.output_tokens ?? outputTokens;
        }
      } catch {
        /* ignore provider keepalive/non-JSON lines */
      }
    }
  }

  if (inputTokens || outputTokens) sendEvent(controller, { type: 'usage', tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens } });
  sendEvent(controller, { type: 'done' });
}

async function streamAnthropic(controller: ReadableStreamDefaultController, apiKey: string, modelo: string, messages: ChatMessage[]) {
  const converted = messages.map((message) => {
    if (typeof message.content === 'string') return { role: message.role, content: message.content };
    const content = message.content.map((part) => {
      if (part.type === 'text') return { type: 'text', text: part.text };
      const parsed = extractBase64(part.image_url.url);
      return { type: 'image', source: { type: 'base64', media_type: parsed.mimeType, data: parsed.data } };
    });
    return { role: message.role, content };
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, stream: true, max_tokens: 2048, messages: converted }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const classified = classifyError(res.status, await res.text().catch(() => ''));
    sendEvent(controller, { type: 'error', ...classified });
    sendEvent(controller, { type: 'done' });
    return;
  }
  if (!res.body) {
    sendEvent(controller, { type: 'error', message: 'Sin cuerpo de respuesta', errorType: 'server' });
    sendEvent(controller, { type: 'done' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      try {
        const event = JSON.parse(trimmed.slice(5).trim()) as {
          type?: string;
          delta?: { type?: string; text?: string };
          usage?: { output_tokens?: number };
          message?: { usage?: { input_tokens?: number } };
        };
        if (event.type === 'message_start') inputTokens = event.message?.usage?.input_tokens ?? inputTokens;
        if (event.type === 'content_block_delta' && event.delta?.text) sendEvent(controller, { type: 'chunk', text: event.delta.text });
        if (event.type === 'message_delta') outputTokens = event.usage?.output_tokens ?? outputTokens;
        if (event.type === 'message_stop') {
          if (inputTokens || outputTokens) sendEvent(controller, { type: 'usage', tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens } });
          sendEvent(controller, { type: 'done' });
          return;
        }
      } catch {
        /* ignore */
      }
    }
  }
  sendEvent(controller, { type: 'done' });
}

async function streamGemini(controller: ReadableStreamDefaultController, apiKey: string, modelo: string, messages: ChatMessage[]) {
  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: typeof message.content === 'string'
      ? [{ text: message.content }]
      : message.content.map((part) => part.type === 'text'
          ? { text: part.text }
          : (() => {
              const parsed = extractBase64(part.image_url.url);
              return { inlineData: { mimeType: parsed.mimeType, data: parsed.data } };
            })()),
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const classified = classifyError(res.status, await res.text().catch(() => ''));
    sendEvent(controller, { type: 'error', ...classified });
    sendEvent(controller, { type: 'done' });
    return;
  }
  if (!res.body) {
    sendEvent(controller, { type: 'error', message: 'Sin cuerpo de respuesta', errorType: 'server' });
    sendEvent(controller, { type: 'done' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let inputTokens = 0;
  let outputTokens = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      try {
        const chunk = JSON.parse(trimmed.slice(5).trim()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
        };
        const text = chunk.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
        if (text) sendEvent(controller, { type: 'chunk', text });
        inputTokens = chunk.usageMetadata?.promptTokenCount ?? inputTokens;
        outputTokens = chunk.usageMetadata?.candidatesTokenCount ?? outputTokens;
      } catch {
        /* ignore */
      }
    }
  }
  if (inputTokens || outputTokens) sendEvent(controller, { type: 'usage', tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens } });
  sendEvent(controller, { type: 'done' });
}

function sseResponse(stream: ReadableStream) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  let body: ChatRequestBody;
  try {
    body = await request.json() as ChatRequestBody;
  } catch {
    return sseResponse(new ReadableStream({ start(controller) { sendEvent(controller, { type: 'error', message: 'JSON inválido', errorType: 'other' }); sendEvent(controller, { type: 'done' }); controller.close(); } }));
  }

  const provider = String(body.provider ?? '') as AiProvider;
  const modelo = String(body.modelo ?? '').trim();
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!provider || !modelo || !messages.length) {
    return sseResponse(new ReadableStream({ start(controller) { sendEvent(controller, { type: 'error', message: 'provider, modelo y messages son requeridos', errorType: 'other' }); sendEvent(controller, { type: 'done' }); controller.close(); } }));
  }

  const config = await resolveProviderConfig(provider, modelo);
  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!config) {
          sendEvent(controller, { type: 'error', message: 'Proveedor sin credenciales/configuración.', errorType: 'no_key' });
          sendEvent(controller, { type: 'done' });
          return;
        }

        if (provider === 'anthropic') {
          await streamAnthropic(controller, config.apiKey, modelo, messages);
        } else if (provider === 'gemini') {
          await streamGemini(controller, config.apiKey, modelo, messages);
        } else {
          const baseUrl = config.baseUrl || OPENAI_COMPAT_BASE[provider];
          if (!baseUrl) {
            sendEvent(controller, { type: 'error', message: `Proveedor no soportado: ${provider}`, errorType: 'other' });
            sendEvent(controller, { type: 'done' });
            return;
          }
          await streamOpenAICompat(controller, provider, baseUrl, config.apiKey, modelo, messages, config.siteUrl, config.appName);
        }
      } catch (error) {
        const classified = classifyError(undefined, error instanceof Error ? error.message : String(error));
        sendEvent(controller, { type: 'error', ...classified });
        sendEvent(controller, { type: 'done' });
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream);
}
