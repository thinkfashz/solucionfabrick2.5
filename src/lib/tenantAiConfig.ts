import 'server-only';

import { normalizeAiBaseUrl } from '@/lib/ai/safeEndpoint';
import { resolveIntegrationCredentials } from '@/lib/integrationCredentials';
import type { AiConfig, AiProvider } from '@/lib/resolveAiConfig';

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash-exp',
  grok: 'grok-2-1212',
  ollama: 'gpt-oss:120b',
  custom: '',
};

const DEFAULT_BASE_URLS: Partial<Record<AiProvider, string>> = {
  ollama: 'https://ollama.com/v1',
};

export async function resolveTenantProviderConfig(
  provider: AiProvider,
  modelo: string,
  tenantId: string,
): Promise<AiConfig | null> {
  try {
    const resolved = await resolveIntegrationCredentials(provider, ['api_key'], true, tenantId);
    const creds = resolved.values;
    const apiKey = creds.api_key?.trim() ?? '';
    const baseUrl = normalizeAiBaseUrl(creds.base_url, DEFAULT_BASE_URLS[provider]);

    if (provider === 'custom') {
      if (!baseUrl) return null;
    } else if (!apiKey) {
      return null;
    }

    return {
      provider,
      apiKey,
      modelo: modelo || creds.modelo || DEFAULT_MODELS[provider] || '',
      siteUrl: creds.site_url,
      appName: creds.app_name,
      baseUrl,
    };
  } catch {
    return null;
  }
}
