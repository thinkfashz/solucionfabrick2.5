import 'server-only';
import { decryptCredentials, encryptCredentials, isEncryptionConfigured } from '@/lib/integrationsCrypto';
import { insforgeAdmin } from '@/lib/insforge';
import { AI_PROVIDERS, getAiProvider } from '../config/providers';
import type { AiIntegrationCredentials, AiIntegrationStatus, AiIntegrationTestResult, AiProviderId } from '../types/ai.types';
import { cleanCredentials, integrationStatus, mergeCredentials } from '../utils/ai-integration-utils';
import { ensureAiIntegrationsTable } from './ai-integration-table.server';

function serializeDbError(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'Error desconocido');
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  return [e.message, e.code, e.details, e.hint].filter(Boolean).join(' · ') || 'Error de base de datos';
}

export async function listAiIntegrations(): Promise<AiIntegrationStatus[]> {
  const ensure = await ensureAiIntegrationsTable();
  if (!ensure.ok) throw new Error('No se pudo preparar la tabla integrations.');

  const { data, error } = await insforgeAdmin.database.from('integrations').select('provider, credentials, updated_at');
  if (error) throw new Error(serializeDbError(error));

  const rows = new Map<string, { credentials?: Record<string, unknown>; updated_at?: string }>();
  for (const row of (data || []) as Array<{ provider?: string; credentials?: Record<string, unknown>; updated_at?: string }>) {
    if (row.provider) rows.set(row.provider, row);
  }

  return AI_PROVIDERS.map((provider) => {
    const row = rows.get(provider.id);
    const plain = decryptCredentials(row?.credentials) as AiIntegrationCredentials;
    return integrationStatus(provider, plain, row?.updated_at, isEncryptionConfigured());
  });
}

export async function getAiCredentials(providerId: AiProviderId): Promise<AiIntegrationCredentials | null> {
  const ensure = await ensureAiIntegrationsTable();
  if (!ensure.ok) throw new Error('No se pudo preparar la tabla integrations.');

  const { data, error } = await insforgeAdmin.database.from('integrations').select('credentials').eq('provider', providerId).limit(1);
  if (error) throw new Error(serializeDbError(error));
  if (!Array.isArray(data) || data.length === 0) return null;
  return decryptCredentials((data[0] as { credentials?: Record<string, unknown> }).credentials) as AiIntegrationCredentials;
}

export async function saveAiIntegration(providerId: AiProviderId, incomingRaw: unknown): Promise<AiIntegrationStatus> {
  const provider = getAiProvider(providerId);
  if (!provider) throw new Error('Proveedor IA no permitido.');
  const ensure = await ensureAiIntegrationsTable();
  if (!ensure.ok) throw new Error('No se pudo preparar la tabla integrations.');

  const incoming = cleanCredentials(incomingRaw);
  const existing = await getAiCredentials(providerId).catch(() => null);
  const next = mergeCredentials(existing || {}, incoming);
  for (const field of provider.credentialFields) {
    if (field.required && !next[field.key]) throw new Error(`Falta el campo requerido: ${field.label}.`);
  }

  const encrypted = encryptCredentials(next as Record<string, unknown>);
  const now = new Date().toISOString();

  const { data: current } = await insforgeAdmin.database.from('integrations').select('provider').eq('provider', providerId).limit(1);
  const exists = Array.isArray(current) && current.length > 0;
  const query = exists
    ? insforgeAdmin.database.from('integrations').update({ credentials: encrypted, updated_at: now }).eq('provider', providerId).select('provider, credentials, updated_at').single()
    : insforgeAdmin.database.from('integrations').insert([{ provider: providerId, credentials: encrypted, updated_at: now }]).select('provider, credentials, updated_at').single();

  const { data, error } = await query;
  if (error) throw new Error(serializeDbError(error));
  const plain = decryptCredentials((data as { credentials?: Record<string, unknown> }).credentials) as AiIntegrationCredentials;
  return integrationStatus(provider, plain, (data as { updated_at?: string }).updated_at, isEncryptionConfigured());
}

export async function deleteAiIntegration(providerId: AiProviderId): Promise<void> {
  const ensure = await ensureAiIntegrationsTable();
  if (!ensure.ok) throw new Error('No se pudo preparar la tabla integrations.');
  const { error } = await insforgeAdmin.database.from('integrations').delete().eq('provider', providerId);
  if (error) throw new Error(serializeDbError(error));
}

async function testOpenAiLike(params: { provider: AiProviderId; endpoint: string; apiKey: string; model?: string; headers?: Record<string, string> }): Promise<AiIntegrationTestResult> {
  const started = Date.now();
  const res = await fetch(params.endpoint, {
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      ...params.headers,
    },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof json?.error?.message === 'string' ? json.error.message : `HTTP ${res.status}`;
    return { ok: false, provider: params.provider, model: params.model, latency_ms: Date.now() - started, message: msg, detail: json };
  }
  return { ok: true, provider: params.provider, model: params.model, latency_ms: Date.now() - started, message: 'Credenciales válidas. Modelos disponibles.', detail: json };
}

export async function testAiIntegration(providerId: AiProviderId, overrideRaw?: unknown): Promise<AiIntegrationTestResult> {
  const provider = getAiProvider(providerId);
  if (!provider) throw new Error('Proveedor IA no permitido.');
  const saved = await getAiCredentials(providerId).catch(() => null);
  const creds = mergeCredentials(saved || {}, cleanCredentials(overrideRaw));
  const model = typeof creds.model === 'string' ? creds.model : provider.defaultModel;

  if (providerId === 'openai') {
    if (!creds.api_key) throw new Error('Falta API Key de OpenAI.');
    const headers: Record<string, string> = {};
    if (typeof creds.organization_id === 'string') headers['OpenAI-Organization'] = creds.organization_id;
    if (typeof creds.project_id === 'string') headers['OpenAI-Project'] = creds.project_id;
    return testOpenAiLike({ provider: providerId, endpoint: 'https://api.openai.com/v1/models', apiKey: String(creds.api_key), model, headers });
  }

  if (providerId === 'openrouter') {
    if (!creds.api_key) throw new Error('Falta API Key de OpenRouter.');
    const base = typeof creds.base_url === 'string' && creds.base_url ? creds.base_url.replace(/\/+$/, '') : 'https://openrouter.ai/api/v1';
    return testOpenAiLike({ provider: providerId, endpoint: `${base}/models`, apiKey: String(creds.api_key), model, headers: { 'HTTP-Referer': 'https://www.solucionesfabrick.com', 'X-Title': 'Soluciones Fabrick Prospecting Engine' } });
  }

  if (providerId === 'groq') {
    if (!creds.api_key) throw new Error('Falta API Key de Groq.');
    return testOpenAiLike({ provider: providerId, endpoint: 'https://api.groq.com/openai/v1/models', apiKey: String(creds.api_key), model });
  }

  if (providerId === 'gemini') {
    if (!creds.api_key) throw new Error('Falta API Key de Gemini.');
    const started = Date.now();
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(String(creds.api_key))}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, provider: providerId, model, latency_ms: Date.now() - started, message: json?.error?.message || `HTTP ${res.status}`, detail: json };
    return { ok: true, provider: providerId, model, latency_ms: Date.now() - started, message: 'Credenciales válidas. Gemini respondió modelos disponibles.', detail: json };
  }

  if (providerId === 'serpapi') {
    if (!creds.api_key) throw new Error('Falta API Key de SerpAPI.');
    const started = Date.now();
    const res = await fetch(`https://serpapi.com/account?api_key=${encodeURIComponent(String(creds.api_key))}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) return { ok: false, provider: providerId, latency_ms: Date.now() - started, message: json?.error || `HTTP ${res.status}`, detail: json };
    return { ok: true, provider: providerId, latency_ms: Date.now() - started, message: 'Credenciales válidas. SerpAPI respondió cuenta.', detail: json };
  }

  if (providerId === 'apify') {
    if (!creds.api_token) throw new Error('Falta API Token de Apify.');
    const started = Date.now();
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(String(creds.api_token))}`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) return { ok: false, provider: providerId, latency_ms: Date.now() - started, message: json?.error?.message || `HTTP ${res.status}`, detail: json };
    return { ok: true, provider: providerId, latency_ms: Date.now() - started, message: 'Credenciales válidas. Apify respondió usuario.', detail: json };
  }

  return { ok: false, provider: providerId, message: 'Proveedor no soportado para test.' };
}
