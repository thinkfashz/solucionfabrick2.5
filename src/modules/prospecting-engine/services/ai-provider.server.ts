import 'server-only';
import type { AiProviderId, AiIntegrationCredentials } from '../types/ai.types';

export interface AiTextGenerationParams {
  provider: AiProviderId;
  credentials: AiIntegrationCredentials;
  model?: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

function getModel(credentials: AiIntegrationCredentials, fallback?: string) {
  return typeof credentials.model === 'string' && credentials.model.trim() ? credentials.model.trim() : fallback;
}

function getErrorMessage(json: unknown, status: number) {
  const obj = json && typeof json === 'object' ? json as Record<string, unknown> : {};
  const error = obj.error && typeof obj.error === 'object' ? obj.error as Record<string, unknown> : {};
  return typeof error.message === 'string' ? error.message : `HTTP ${status}`;
}

async function callOpenAiCompatible(params: AiTextGenerationParams, baseUrl: string, extraHeaders: Record<string, string> = {}) {
  const apiKey = String(params.credentials.api_key || '').trim();
  if (!apiKey) throw new Error(`Falta API Key para ${params.provider}.`);
  const model = getModel(params.credentials, params.model) || 'gpt-4o-mini';
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.35,
      max_tokens: params.maxTokens ?? 6000,
      messages: [
        { role: 'system', content: params.system || 'Eres un asistente experto en generación de páginas HTML comerciales.' },
        { role: 'user', content: params.prompt },
      ],
    }),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getErrorMessage(json, res.status));
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('El proveedor IA no devolvió texto útil.');
  return { text, model };
}

async function callGemini(params: AiTextGenerationParams) {
  const apiKey = String(params.credentials.api_key || '').trim();
  if (!apiKey) throw new Error('Falta API Key para Gemini.');
  const model = getModel(params.credentials, params.model) || 'gemini-1.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: params.temperature ?? 0.35,
        maxOutputTokens: params.maxTokens ?? 6000,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `${params.system || ''}\n\n${params.prompt}` }],
        },
      ],
    }),
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(getErrorMessage(json, res.status));
  const text = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n');
  if (typeof text !== 'string' || !text.trim()) throw new Error('Gemini no devolvió texto útil.');
  return { text, model };
}

export async function runAiTextGeneration(params: AiTextGenerationParams) {
  if (params.provider === 'openai') {
    const headers: Record<string, string> = {};
    if (typeof params.credentials.organization_id === 'string') headers['OpenAI-Organization'] = params.credentials.organization_id;
    if (typeof params.credentials.project_id === 'string') headers['OpenAI-Project'] = params.credentials.project_id;
    return callOpenAiCompatible(params, 'https://api.openai.com/v1', headers);
  }
  if (params.provider === 'openrouter') {
    const base = typeof params.credentials.base_url === 'string' && params.credentials.base_url ? params.credentials.base_url : 'https://openrouter.ai/api/v1';
    return callOpenAiCompatible(params, base, { 'HTTP-Referer': 'https://www.solucionesfabrick.com', 'X-Title': 'Soluciones Fabrick Prospecting Engine' });
  }
  if (params.provider === 'groq') {
    return callOpenAiCompatible(params, 'https://api.groq.com/openai/v1');
  }
  if (params.provider === 'gemini') {
    return callGemini(params);
  }
  throw new Error(`El proveedor ${params.provider} no soporta generación de landing.`);
}
