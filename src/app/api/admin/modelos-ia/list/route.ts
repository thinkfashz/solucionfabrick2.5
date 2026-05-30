export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { resolveProviderConfig } from '@/lib/resolveAiConfig';
import type { AiProvider } from '@/lib/resolveAiConfig';

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
};

const ANTHROPIC_MODELS: ModelEntry[] = [
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', free: false },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', free: false },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', free: false },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', free: false },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', free: false },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', free: false },
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

async function fetchOpenRouter(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = (await res.json()) as { data?: OpenRouterModel[] };
  const all = data.data ?? [];
  const textModels = all.filter((m) => {
    const modality = m.architecture?.modality;
    if (!modality) return true;
    return modality.includes('text');
  });
  const mapped: ModelEntry[] = textModels.map((m) => {
    const isFree = m.id.endsWith(':free') || m.pricing?.prompt === '0';
    return {
      id: m.id,
      name: m.name ?? m.id,
      free: isFree,
      contextLength: m.context_length,
      description: m.description,
    };
  });
  // Sort: free first
  return mapped.sort((a, b) => (a.free === b.free ? 0 : a.free ? -1 : 1));
}

async function fetchGroq(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = (await res.json()) as { data?: OpenAIModel[] };
  const all = data.data ?? [];
  return all
    .filter((m) => m.active !== false)
    .map((m) => ({ id: m.id, name: m.id, free: true }));
}

async function fetchOpenAI(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { data?: OpenAIModel[] };
  const all = data.data ?? [];
  const chatModels = all.filter((m) =>
    /gpt-4|gpt-3\.5|o1|o3|chatgpt/.test(m.id),
  );
  return chatModels.map((m) => ({ id: m.id, name: m.id, free: false }));
}

async function fetchGemini(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { signal: AbortSignal.timeout(10_000), cache: 'no-store' },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as { models?: GeminiModel[] };
  const all = data.models ?? [];
  return all
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => {
      const id = m.name.includes('/') ? m.name.split('/').pop()! : m.name;
      return {
        id,
        name: m.displayName ?? id,
        free: id.includes('flash'),
        description: m.description,
      };
    });
}

async function fetchGrok(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch('https://api.x.ai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Grok ${res.status}`);
  const data = (await res.json()) as { data?: OpenAIModel[] };
  const all = data.data ?? [];
  return all.map((m) => ({ id: m.id, name: m.id, free: false }));
}

async function fetchProvider(provider: AiProvider): Promise<ProviderResult> {
  const label = PROVIDER_LABELS[provider];
  const config = await resolveProviderConfig(provider, '');

  if (!config) {
    return { id: provider, label, configured: false, models: [] };
  }

  try {
    let models: ModelEntry[] = [];

    switch (provider) {
      case 'openrouter':
        models = await fetchOpenRouter(config.apiKey);
        break;
      case 'groq':
        models = await fetchGroq(config.apiKey);
        break;
      case 'openai':
        models = await fetchOpenAI(config.apiKey);
        break;
      case 'anthropic':
        models = ANTHROPIC_MODELS;
        break;
      case 'gemini':
        models = await fetchGemini(config.apiKey);
        break;
      case 'grok':
        models = await fetchGrok(config.apiKey);
        break;
    }

    return { id: provider, label, configured: true, models };
  } catch (err) {
    return {
      id: provider,
      label,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
      models: [],
    };
  }
}

const ALL_PROVIDERS: AiProvider[] = ['openrouter', 'groq', 'anthropic', 'openai', 'gemini', 'grok'];

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
