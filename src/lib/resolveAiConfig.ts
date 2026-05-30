/**
 * Shared AI config resolver — reads provider credentials via resolveIntegrationCredentials
 * which correctly handles encryption, env vars, and InsForge SDK queries.
 * Single source of truth used by: agente, scrapegraph, ai-developer, ads/coach, video-engine.
 */
import 'server-only';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';

function insforgeKey(): string {
  return (
    process.env.INSFORGE_API_KEY ||
    process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ||
    'ik_7e23032539c2dc64d5d27ca29d07b928'
  );
}

async function rawsqlAi(query: string): Promise<{ data?: { rows?: Record<string, unknown>[] } } | null> {
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
    return res.json() as Promise<{ data?: { rows?: Record<string, unknown>[] } }>;
  } catch {
    return null;
  }
}

export type AiProvider = 'anthropic' | 'groq' | 'openrouter' | 'openai' | 'gemini' | 'grok';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  modelo: string;
  siteUrl?: string;
  appName?: string;
}

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash-exp',
  grok: 'grok-2-1212',
};

async function getProviderCreds(provider: string): Promise<Record<string, string>> {
  const resolved = await resolveIntegrationCredentials(provider, ['api_key'], true);
  return resolved.values;
}

/**
 * Resolves AI config from DB (configuracion_ia → integrations table).
 * Priority:
 * 1. Provider set in configuracion_ia.proveedor_ia  (explicit user preference)
 * 2. First available provider found in integrations  (auto-detect, ordered by quality)
 * 3. ANTHROPIC_API_KEY env var                       (legacy fallback)
 */
export async function resolveAiConfig(): Promise<AiConfig | null> {
  try {
    const configData = await rawsqlAi(
      `SELECT anthropic_api_key, modelo_ia, proveedor_ia FROM configuracion_ia WHERE id = 'singleton' LIMIT 1;`,
    );
    type ConfigRow = { anthropic_api_key?: string; modelo_ia?: string; proveedor_ia?: string };
    const row = (configData as { data?: { rows?: ConfigRow[] } } | null)?.data?.rows?.[0];
    const preferredProvider = (row?.proveedor_ia ?? '') as AiProvider | '';
    const prefModelo = row?.modelo_ia ?? '';

    // 1. Try preferred provider
    if (preferredProvider) {
      const creds = await getProviderCreds(preferredProvider);
      const key = creds.api_key?.trim() ?? '';
      if (key) {
        return {
          provider: preferredProvider,
          apiKey: key,
          modelo: prefModelo || creds.modelo || DEFAULT_MODELS[preferredProvider] || '',
          siteUrl: creds.site_url,
          appName: creds.app_name,
        };
      }
    }

    // 2. Auto-detect: try providers in order
    const autoOrder: AiProvider[] = ['anthropic', 'openrouter', 'groq', 'openai', 'gemini', 'grok'];
    for (const p of autoOrder) {
      const creds = await getProviderCreds(p);
      const key = creds.api_key?.trim() ?? '';
      if (key) {
        return {
          provider: p,
          apiKey: key,
          modelo: prefModelo || creds.modelo || DEFAULT_MODELS[p],
          siteUrl: creds.site_url,
          appName: creds.app_name,
        };
      }
    }

    // 3. Legacy: key stored directly in configuracion_ia
    if (row?.anthropic_api_key) {
      return { provider: 'anthropic', apiKey: row.anthropic_api_key, modelo: prefModelo || DEFAULT_MODELS.anthropic };
    }
  } catch {
    /* fall through to env fallback */
  }

  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return { provider: 'anthropic', apiKey: envKey, modelo: DEFAULT_MODELS.anthropic };
  return null;
}

export async function resolveSerperKey(): Promise<string | undefined> {
  try {
    const creds = await getProviderCreds('serper');
    return creds.api_key?.trim() || process.env.SERPER_API_KEY;
  } catch {
    return process.env.SERPER_API_KEY;
  }
}

/**
 * Resolves AI config for a specific provider + model combo.
 * Returns null if provider is not configured.
 */
export async function resolveProviderConfig(provider: AiProvider, modelo: string): Promise<AiConfig | null> {
  try {
    const creds = await getProviderCreds(provider);
    const key = creds.api_key?.trim() ?? '';
    if (!key) return null;
    return {
      provider,
      apiKey: key,
      modelo: modelo || creds.modelo || DEFAULT_MODELS[provider] || '',
      siteUrl: creds.site_url,
      appName: creds.app_name,
    };
  } catch {
    return null;
  }
}
