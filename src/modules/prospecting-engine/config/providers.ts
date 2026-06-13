import type { AiProviderConfig, AiProviderId } from '../types/ai.types';

export const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: 'openai',
    label: 'OpenAI / ChatGPT API',
    description: 'Generación de HTML, copy comercial, análisis de prospectos y edición por sección.',
    category: 'llm',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    credentialFields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, placeholder: 'sk-...' },
      { key: 'model', label: 'Modelo por defecto', placeholder: 'gpt-4o-mini' },
      { key: 'organization_id', label: 'Organization ID', secret: true, placeholder: 'opcional' },
      { key: 'project_id', label: 'Project ID', secret: true, placeholder: 'opcional' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Generación económica y rápida de análisis, HTML y textos comerciales.',
    category: 'llm',
    defaultModel: 'gemini-1.5-flash',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    credentialFields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, placeholder: 'AIza...' },
      { key: 'model', label: 'Modelo por defecto', placeholder: 'gemini-1.5-flash' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Gateway multi-modelo para probar Claude, GPT, Gemini, Llama, Qwen y otros.',
    category: 'llm',
    defaultModel: 'openai/gpt-4o-mini',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-70b-instruct'],
    credentialFields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, placeholder: 'sk-or-...' },
      { key: 'model', label: 'Modelo por defecto', placeholder: 'openai/gpt-4o-mini' },
      { key: 'base_url', label: 'Base URL', placeholder: 'https://openrouter.ai/api/v1' },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Inferencia rápida y económica para generación de textos y borradores.',
    category: 'llm',
    defaultModel: 'llama-3.1-8b-instant',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    credentialFields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, placeholder: 'gsk_...' },
      { key: 'model', label: 'Modelo por defecto', placeholder: 'llama-3.1-8b-instant' },
    ],
  },
  {
    id: 'serpapi',
    label: 'SerpAPI',
    description: 'Búsqueda externa de prospectos en Google, maps y resultados públicos.',
    category: 'search',
    models: [],
    credentialFields: [
      { key: 'api_key', label: 'API Key', secret: true, required: true, placeholder: 'serpapi key' },
    ],
  },
  {
    id: 'apify',
    label: 'Apify',
    description: 'Automatización/scraping controlado para fuentes públicas y datasets.',
    category: 'automation',
    models: [],
    credentialFields: [
      { key: 'api_token', label: 'API Token', secret: true, required: true, placeholder: 'apify_api_...' },
    ],
  },
];

export const AI_PROVIDER_IDS = AI_PROVIDERS.map((provider) => provider.id) as AiProviderId[];

export function getAiProvider(id: string): AiProviderConfig | null {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? null;
}

export function isAiProviderId(value: string): value is AiProviderId {
  return AI_PROVIDER_IDS.includes(value as AiProviderId);
}

export function defaultModelForProvider(provider: AiProviderId): string {
  return getAiProvider(provider)?.defaultModel || '';
}
