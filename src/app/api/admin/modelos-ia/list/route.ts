export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveProviderConfig } from '@/lib/resolveAiConfig';
import type { AiConfig, AiProvider } from '@/lib/resolveAiConfig';

export interface ModelEntry {
  id: string;
  name: string;
  free: boolean;
  contextLength?: number;
  description?: string;
}

export interface ProviderResult {
  id: string;
  label: string;
  configured: boolean;
  error?: string;
  models: ModelEntry[];
}

const PROVIDER_LABELS: Record<AiProvider, string> = {
  openrouter: 'OpenRouter',
  groq: 'Groq',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Gemini',
  grok: 'Grok (xAI)',
  ollama: 'Ollama Cloud',
  custom: 'OpenAI compatible',
};

const ANTHROPIC_MODELS: ModelEntry[] = [
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', free: false },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', free: false },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', free: false },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', free: false },
];

interface OpenRouterModel {
  id: string;
  name?: string;
  description?: string;
  pricing?: { prompt?: string; completion?: string };
  context_length?: number;
  architecture?: { modality?: string };
}

interface OpenAIModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  active?: boolean;
}

interface GeminiModel {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
}

interface OllamaModel {
  name?: string;
  model?: string;
  modified_at?: string;
  details?: { parameter_size?: string; family?: string };
}

function authHeaders(apiKey: string) {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

async function fetchOpenRouter(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = (await res.json()) as { data?: OpenRouterModel[] };
  return (data.data ?? [])
    .filter((m) => !m.architecture?.modality || m.architecture.modality.includes('text'))
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      free: m.id.endsWith(':free') || m.pricing?.prompt === '0',
      contextLength: m.context_length,
      description: m.description,
    }))
    .sort((a, b) => (a.free === b.free ? a.name.localeCompare(b.name) : a.free ? -1 : 1));
}

async function fetchOpenAICompatModels(baseUrl: string, apiKey: string, free: boolean): Promise<ModelEntry[]> {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
    headers: authHeaders(apiKey),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Models ${res.status}`);
  const data = (await res.json()) as { data?: OpenAIModel[] };
  return (data.data ?? [])
    .filter((m) => m.active !== false)
    .map((m) => ({ id: m.id, name: m.id, free }));
}

async function fetchGroq(apiKey: string) {
  return fetchOpenAICompatModels('https://api.groq.com/openai/v1', apiKey, true);
}

async function fetchOpenAI(apiKey: string): Promise<ModelEntry[]> {
  const all = await fetchOpenAICompatModels('https://api.openai.com/v1', apiKey, false);
  return all.filter((m) => /^(gpt-|o\d|chatgpt)/i.test(m.id));
}

async function fetchGrok(apiKey: string) {
  return fetchOpenAICompatModels('https://api.x.ai/v1', apiKey, false);
}

async function fetchGemini(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    { signal: AbortSignal.timeout(10_000), cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as { models?: GeminiModel[] };
  return (data.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => {
      const id = m.name.includes('/') ? m.name.split('/').pop()! : m.name;
      return { id, name: m.displayName ?? id, free: id.includes('flash'), description: m.description };
    });
}

async function fetchOllama(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch('https://ollama.com/api/tags', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = (await res.json()) as { models?: OllamaModel[] };
  return (data.models ?? []).map((m) => {
    const id = m.model || m.name || '';
    return {
      id,
      name: id,
      free: false,
      description: [m.details?.parameter_size, m.details?.family].filter(Boolean).join(' · ') || undefined,
    };
  }).filter((m) => Boolean(m.id));
}

async function fetchCustom(config: AiConfig): Promise<ModelEntry[]> {
  if (!config.baseUrl) return config.modelo ? [{ id: config.modelo, name: config.modelo, free: false }] : [];
  try {
    const models = await fetchOpenAICompatModels(config.baseUrl, config.apiKey, false);
    if (models.length) return models;
  } catch {
    // Some compatible gateways do not expose /models; keep configured model usable.
  }
  return config.modelo ? [{ id: config.modelo, name: config.modelo, free: false }] : [];
}

async function fetchProvider(provider: AiProvider): Promise<ProviderResult> {
  const label = PROVIDER_LABELS[provider];
  const config = await resolveProviderConfig(provider, '');
  if (!config) return { id: provider, label, configured: false, models: [] };

  try {
    let models: ModelEntry[] = [];
    switch (provider) {
      case 'openrouter': models = await fetchOpenRouter(config.apiKey); break;
      case 'groq': models = await fetchGroq(config.apiKey); break;
      case 'openai': models = await fetchOpenAI(config.apiKey); break;
      case 'anthropic': models = ANTHROPIC_MODELS; break;
      case 'gemini': models = await fetchGemini(config.apiKey); break;
      case 'grok': models = await fetchGrok(config.apiKey); break;
      case 'ollama': models = await fetchOllama(config.apiKey); break;
      case 'custom': models = await fetchCustom(config); break;
    }
    return { id: provider, label, configured: true, models };
  } catch (err) {
    return {
      id: provider,
      label,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
      models: config.modelo ? [{ id: config.modelo, name: config.modelo, free: false }] : [],
    };
  }
}

const ALL_PROVIDERS: AiProvider[] = ['openrouter', 'groq', 'anthropic', 'openai', 'gemini', 'grok', 'ollama', 'custom'];

export async function GET(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'integrations', action: 'read' });
  if (!auth.ok) return auth.response;

  const settled = await Promise.allSettled(ALL_PROVIDERS.map(fetchProvider));
  const providers: ProviderResult[] = settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      id: ALL_PROVIDERS[i],
      label: PROVIDER_LABELS[ALL_PROVIDERS[i]],
      configured: false,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      models: [],
    };
  });

  return NextResponse.json({ ok: true, providers });
}
