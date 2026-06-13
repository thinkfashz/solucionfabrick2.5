import 'server-only';
import { defaultModelForProvider } from '../config/providers';
import type { AiIntegrationCredentials, AiProviderId } from '../types/ai.types';

export interface AiTextRequest {
  provider: AiProviderId;
  credentials: AiIntegrationCredentials;
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
}

export interface AiTextResponse {
  text: string;
  model: string;
  provider: AiProviderId;
  raw?: unknown;
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

async function jsonOrText(res: Response) {
  const raw = await res.text();
  try { return JSON.parse(raw); } catch { return { raw }; }
}

async function openAiCompatible(params: AiTextRequest & { endpoint: string; extraHeaders?: Record<string, string> }): Promise<AiTextResponse> {
  const apiKey = text(params.credentials.api_key);
  if (!apiKey) throw new Error(`Falta API Key para ${params.provider}.`);
  const model = text(params.model || params.credentials.model, defaultModelForProvider(params.provider));
  const res = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...params.extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.35,
      messages: [
        { role: 'system', content: params.system || 'Responde sólo con JSON válido.' },
        { role: 'user', content: params.prompt },
      ],
    }),
    cache: 'no-store',
  });
  const json = await jsonOrText(res) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string }; raw?: string };
  if (!res.ok) throw new Error(json.error?.message || json.raw || `Error IA HTTP ${res.status}`);
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('La IA no devolvió contenido.');
  return { text: content, model, provider: params.provider, raw: json };
}

export async function generateAiText(params: AiTextRequest): Promise<AiTextResponse> {
  if (params.provider === 'openai') {
    const headers: Record<string, string> = {};
    if (typeof params.credentials.organization_id === 'string') headers['OpenAI-Organization'] = params.credentials.organization_id;
    if (typeof params.credentials.project_id === 'string') headers['OpenAI-Project'] = params.credentials.project_id;
    return openAiCompatible({ ...params, endpoint: 'https://api.openai.com/v1/chat/completions', extraHeaders: headers });
  }

  if (params.provider === 'openrouter') {
    const base = text(params.credentials.base_url, 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    return openAiCompatible({
      ...params,
      endpoint: `${base}/chat/completions`,
      extraHeaders: { 'HTTP-Referer': 'https://www.solucionesfabrick.com', 'X-Title': 'Soluciones Fabrick Prospecting Engine' },
    });
  }

  if (params.provider === 'groq') {
    return openAiCompatible({ ...params, endpoint: 'https://api.groq.com/openai/v1/chat/completions' });
  }

  if (params.provider === 'gemini') {
    const apiKey = text(params.credentials.api_key);
    if (!apiKey) throw new Error('Falta API Key de Gemini.');
    const model = text(params.model || params.credentials.model, defaultModelForProvider('gemini'));
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { temperature: params.temperature ?? 0.35 },
        contents: [
          {
            role: 'user',
            parts: [{ text: `${params.system || 'Responde sólo con JSON válido.'}\n\n${params.prompt}` }],
          },
        ],
      }),
      cache: 'no-store',
    });
    const json = await jsonOrText(res) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string }; raw?: string };
    if (!res.ok) throw new Error(json.error?.message || json.raw || `Error Gemini HTTP ${res.status}`);
    const content = json.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
    if (!content) throw new Error('Gemini no devolvió contenido.');
    return { text: content, model, provider: params.provider, raw: json };
  }

  throw new Error(`El proveedor ${params.provider} no soporta generación de texto en este módulo.`);
}
