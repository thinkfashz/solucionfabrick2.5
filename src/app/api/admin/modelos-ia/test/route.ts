export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveProviderConfig } from '@/lib/resolveAiConfig';
import type { AiConfig, AiProvider } from '@/lib/resolveAiConfig';

export type ErrorType =
  | 'auth'
  | 'credits'
  | 'ratelimit'
  | 'not_found'
  | 'overloaded'
  | 'server'
  | 'timeout'
  | 'no_key'
  | 'other';

interface TestResult {
  ok: boolean;
  latency_ms?: number;
  response?: string;
  error?: string;
  errorType?: ErrorType;
}

const TEST_PROMPT = 'Responde únicamente con la palabra: FUNCIONA';

const OPENAI_COMPAT_URLS: Partial<Record<AiProvider, string>> = {
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  grok: 'https://api.x.ai/v1/chat/completions',
};

function classifyError(err: unknown, status?: number): { errorType: ErrorType; error: string } {
  if (err instanceof Error && err.name === 'AbortError') {
    return { errorType: 'timeout', error: 'Tiempo de espera agotado' };
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (status === 401 || msg.includes('invalid api key') || msg.includes('unauthorized')) {
    return { errorType: 'auth', error: 'Clave API inválida' };
  }
  if (status === 402 || msg.includes('insufficient credits') || msg.includes('billing') || msg.includes('quota')) {
    return { errorType: 'credits', error: 'Sin créditos / saldo insuficiente' };
  }
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    return { errorType: 'ratelimit', error: 'Límite de solicitudes alcanzado' };
  }
  if (status === 404 || msg.includes('model not found') || msg.includes('does not exist') || msg.includes('no such model')) {
    return { errorType: 'not_found', error: 'Modelo no disponible' };
  }
  if (status === 529 || msg.includes('overloaded')) {
    return { errorType: 'overloaded', error: 'Sobrecargado' };
  }
  if (status !== undefined && status >= 500) {
    return { errorType: 'server', error: 'Error del servidor' };
  }
  if (msg.includes('timeout') || msg.includes('aborted')) {
    return { errorType: 'timeout', error: 'Tiempo de espera agotado' };
  }
  return { errorType: 'other', error: err instanceof Error ? err.message : String(err) };
}

async function callProviderTest(config: AiConfig): Promise<string> {
  const openaiUrl = OPENAI_COMPAT_URLS[config.provider];

  if (openaiUrl) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (config.provider === 'openrouter') {
      if (config.siteUrl) headers['HTTP-Referer'] = config.siteUrl;
      if (config.appName) headers['X-Title'] = config.appName;
    }
    const res = await fetch(openaiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.modelo,
        max_tokens: 10,
        messages: [{ role: 'user', content: TEST_PROMPT }],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const { errorType, error } = classifyError(new Error(errText), res.status);
      throw Object.assign(new Error(error), { errorType });
    }
    interface OAIResponse { choices?: { message?: { content?: string } }[] }
    const data = (await res.json()) as OAIResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  if (config.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo}:generateContent?key=${config.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: TEST_PROMPT }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const { errorType, error } = classifyError(new Error(errText), res.status);
      throw Object.assign(new Error(error), { errorType });
    }
    interface GeminiResponse { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const data = (await res.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }

  // Anthropic
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.modelo,
      max_tokens: 10,
      messages: [{ role: 'user', content: TEST_PROMPT }],
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    const { errorType, error } = classifyError(new Error(errText), res.status);
    throw Object.assign(new Error(error), { errorType });
  }
  interface AnthropicResponse { content?: { text?: string }[] }
  const data = (await res.json()) as AnthropicResponse;
  return data.content?.[0]?.text?.trim() ?? '';
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'test' });
  if (!auth.ok) return auth.response;

  let provider = '';
  let modelo = '';

  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.provider === 'string') provider = body.provider;
    if (typeof body.modelo === 'string') modelo = body.modelo;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  if (!provider || !modelo) {
    return NextResponse.json({ ok: false, error: 'provider y modelo son requeridos' }, { status: 400 });
  }

  const config = await resolveProviderConfig(provider as AiProvider, modelo);
  if (!config) {
    const result: TestResult = { ok: false, error: 'Sin clave API configurada', errorType: 'no_key' };
    return NextResponse.json(result);
  }

  const start = Date.now();
  try {
    const response = await callProviderTest(config);
    const latency_ms = Date.now() - start;
    const result: TestResult = { ok: true, latency_ms, response };
    return NextResponse.json(result);
  } catch (err) {
    const latency_ms = Date.now() - start;
    const typedErr = err as Error & { errorType?: ErrorType };
    const errorType: ErrorType = typedErr.errorType ?? classifyError(err).errorType;
    const error = typedErr.message || classifyError(err).error;
    const result: TestResult = { ok: false, latency_ms, error, errorType };
    return NextResponse.json(result);
  }
}
