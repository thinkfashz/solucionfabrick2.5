export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveProviderConfig } from '@/lib/resolveAiConfig';
import type { AiProvider } from '@/lib/resolveAiConfig';

/* ─── Types ─────────────────────────────────────────────────────────────── */

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

/* ─── SSE helpers ────────────────────────────────────────────────────────── */

const encoder = new TextEncoder();

function sendEvent(controller: ReadableStreamDefaultController, data: SseEvent): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

/* ─── Error classification ───────────────────────────────────────────────── */

function classifyError(status?: number, msg?: string): { errorType: string; message: string } {
  const m = (msg ?? '').toLowerCase();
  if (status === 401 || m.includes('invalid api key') || m.includes('unauthorized')) {
    return { errorType: 'auth', message: 'Clave API inválida' };
  }
  if (status === 402 || m.includes('insufficient credits') || m.includes('billing') || m.includes('quota')) {
    return { errorType: 'credits', message: 'Sin créditos / saldo insuficiente' };
  }
  if (status === 429 || m.includes('rate limit') || m.includes('too many requests')) {
    return { errorType: 'ratelimit', message: 'Límite de solicitudes alcanzado' };
  }
  if (status === 404 || m.includes('model not found') || m.includes('does not exist') || m.includes('no such model')) {
    return { errorType: 'not_found', message: 'Modelo no disponible' };
  }
  if (status === 529 || m.includes('overloaded')) {
    return { errorType: 'overloaded', message: 'Sobrecargado' };
  }
  if (status !== undefined && status >= 500) {
    return { errorType: 'server', message: 'Error del servidor' };
  }
  if (m.includes('timeout') || m.includes('aborted')) {
    return { errorType: 'timeout', message: 'Tiempo de espera agotado' };
  }
  return { errorType: 'other', message: msg ?? 'Error desconocido' };
}

/* ─── Content helpers ────────────────────────────────────────────────────── */

function hasImages(messages: ChatMessage[]): boolean {
  return messages.some((m) => {
    if (typeof m.content === 'string') return false;
    return m.content.some((p) => p.type === 'image_url');
  });
}

function extractBase64(dataUrl: string): { mimeType: string; data: string } {
  // data:image/png;base64,xxxx
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { mimeType: 'image/jpeg', data: dataUrl };
  return { mimeType: match[1], data: match[2] };
}

/* ─── Provider streaming functions ──────────────────────────────────────── */

const OPENAI_COMPAT_BASE: Partial<Record<AiProvider, string>> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  openai: 'https://api.openai.com/v1',
  grok: 'https://api.x.ai/v1',
};

async function streamOpenAICompat(
  controller: ReadableStreamDefaultController,
  provider: AiProvider,
  apiKey: string,
  modelo: string,
  messages: ChatMessage[],
  siteUrl?: string,
  appName?: string,
): Promise<void> {
  const baseUrl = OPENAI_COMPAT_BASE[provider]!;

  // Groq does not support vision
  if (provider === 'groq' && hasImages(messages)) {
    sendEvent(controller, {
      type: 'error',
      message: 'Groq no soporta imágenes. Usa un modelo con visión (OpenAI, OpenRouter, Anthropic, Gemini).',
      errorType: 'not_found',
    });
    sendEvent(controller, { type: 'done' });
    return;
  }

  // Build messages for API (OpenAI format already matches our ContentPart format)
  const apiMessages = messages.map((m) => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    // Pass ContentPart[] as-is for OpenAI-compat providers
    return { role: m.role, content: m.content };
  });

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (provider === 'openrouter') {
    if (siteUrl) headers['HTTP-Referer'] = siteUrl;
    if (appName) headers['X-Title'] = appName;
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: modelo, stream: true, max_tokens: 2048, messages: apiMessages }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const { errorType, message } = classifyError(res.status, errText);
    sendEvent(controller, { type: 'error', message, errorType });
    sendEvent(controller, { type: 'done' });
    return;
  }

  if (!res.body) {
    sendEvent(controller, { type: 'error', message: 'Sin cuerpo de respuesta', errorType: 'server' });
    sendEvent(controller, { type: 'done' });
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') {
        if (inputTokens > 0 || outputTokens > 0) {
          sendEvent(controller, {
            type: 'usage',
            tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
          });
        }
        sendEvent(controller, { type: 'done' });
        return;
      }
      try {
        interface OAIChunk {
          choices?: { delta?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        }
        const chunk = JSON.parse(payload) as OAIChunk;
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) sendEvent(controller, { type: 'chunk', text });
        // Some providers include usage in final chunk
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens ?? 0;
          outputTokens = chunk.usage.completion_tokens ?? 0;
        }
      } catch { /* ignore parse errors */ }
    }
  }

  sendEvent(controller, { type: 'done' });
}

async function streamAnthropic(
  controller: ReadableStreamDefaultController,
  apiKey: string,
  modelo: string,
  messages: ChatMessage[],
): Promise<void> {
  // Convert messages for Anthropic format
  const apiMessages = messages.map((m) => {
    if (typeof m.content === 'string') {
      return { role: m.role, content: m.content };
    }
    // Convert image_url parts to Anthropic format
    const parts = m.content.map((p) => {
      if (p.type === 'text') {
        return { type: 'text' as const, text: p.text ?? '' };
      }
      // image_url
      const url = (p as ImageUrlPart).image_url.url;
      const { mimeType, data } = extractBase64(url);
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data,
        },
      };
    });
    return { role: m.role, content: parts };
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: modelo, stream: true, max_tokens: 2048, messages: apiMessages }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const { errorType, message } = classifyError(res.status, errText);
    sendEvent(controller, { type: 'error', message, errorType });
    sendEvent(controller, { type: 'done' });
    return;
  }

  if (!res.body) {
    sendEvent(controller, { type: 'error', message: 'Sin cuerpo de respuesta', errorType: 'server' });
    sendEvent(controller, { type: 'done' });
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('event:')) continue;
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      try {
        interface AnthropicEvent {
          type: string;
          delta?: { type?: string; text?: string };
          usage?: { output_tokens?: number };
          message?: { usage?: { input_tokens?: number } };
        }
        const evt = JSON.parse(payload) as AnthropicEvent;
        if (evt.type === 'message_start' && evt.message?.usage?.input_tokens) {
          inputTokens = evt.message.usage.input_tokens;
        } else if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
          sendEvent(controller, { type: 'chunk', text: evt.delta.text });
        } else if (evt.type === 'message_delta' && evt.usage?.output_tokens) {
          outputTokens = evt.usage.output_tokens;
          sendEvent(controller, {
            type: 'usage',
            tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
          });
        } else if (evt.type === 'message_stop') {
          sendEvent(controller, { type: 'done' });
          return;
        }
      } catch { /* ignore */ }
    }
  }

  sendEvent(controller, { type: 'done' });
}

async function streamGemini(
  controller: ReadableStreamDefaultController,
  apiKey: string,
  modelo: string,
  messages: ChatMessage[],
): Promise<void> {
  // Convert messages to Gemini format
  interface GeminiPart {
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }
  interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
  }

  const contents: GeminiContent[] = messages.map((m) => {
    const geminiRole: 'user' | 'model' = m.role === 'user' ? 'user' : 'model';
    if (typeof m.content === 'string') {
      return { role: geminiRole, parts: [{ text: m.content }] };
    }
    const parts: GeminiPart[] = m.content.map((p) => {
      if (p.type === 'text') return { text: p.text ?? '' };
      const url = (p as ImageUrlPart).image_url.url;
      const { mimeType, data } = extractBase64(url);
      return { inlineData: { mimeType, data } };
    });
    return { role: geminiRole, parts };
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const { errorType, message } = classifyError(res.status, errText);
    sendEvent(controller, { type: 'error', message, errorType });
    sendEvent(controller, { type: 'done' });
    return;
  }

  if (!res.body) {
    sendEvent(controller, { type: 'error', message: 'Sin cuerpo de respuesta', errorType: 'server' });
    sendEvent(controller, { type: 'done' });
    return;
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      try {
        interface GeminiChunk {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
        }
        const chunk = JSON.parse(payload) as GeminiChunk;
        const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) sendEvent(controller, { type: 'chunk', text });
        if (chunk.usageMetadata) {
          inputTokens = chunk.usageMetadata.promptTokenCount ?? inputTokens;
          outputTokens = chunk.usageMetadata.candidatesTokenCount ?? outputTokens;
        }
      } catch { /* ignore */ }
    }
  }

  if (inputTokens > 0 || outputTokens > 0) {
    sendEvent(controller, {
      type: 'usage',
      tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
    });
  }
  sendEvent(controller, { type: 'done' });
}

/* ─── Route handler ──────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'JSON inválido', errorType: 'other' })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      },
    );
  }

  const { provider, modelo, messages } = body;

  if (!provider || !modelo || !Array.isArray(messages)) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message: 'provider, modelo y messages son requeridos', errorType: 'other' })}\n\ndata: ${JSON.stringify({ type: 'done' })}\n\n`,
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      },
    );
  }

  const config = await resolveProviderConfig(provider as AiProvider, modelo);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!config) {
          sendEvent(controller, { type: 'error', message: 'Sin clave API configurada', errorType: 'no_key' });
          sendEvent(controller, { type: 'done' });
          controller.close();
          return;
        }

        const prov = provider as AiProvider;

        if (prov === 'anthropic') {
          await streamAnthropic(controller, config.apiKey, modelo, messages);
        } else if (prov === 'gemini') {
          await streamGemini(controller, config.apiKey, modelo, messages);
        } else if (prov in OPENAI_COMPAT_BASE) {
          await streamOpenAICompat(
            controller,
            prov,
            config.apiKey,
            modelo,
            messages,
            config.siteUrl,
            config.appName,
          );
        } else {
          sendEvent(controller, { type: 'error', message: `Proveedor no soportado: ${provider}`, errorType: 'other' });
          sendEvent(controller, { type: 'done' });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const { errorType, message } = classifyError(undefined, msg);
        sendEvent(controller, { type: 'error', message, errorType });
        sendEvent(controller, { type: 'done' });
      } finally {
        controller.close();
      }
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
