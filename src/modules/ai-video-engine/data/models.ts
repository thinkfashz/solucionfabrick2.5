/** Curated model list for the video engine model selector. */
export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  free: boolean;
  /** Cost per 1K prompt tokens in USD */
  promptCostPer1K: number;
  /** Cost per 1K completion tokens in USD */
  completionCostPer1K: number;
  quality: 'fast' | 'balanced' | 'best';
  note?: string;
}

export const FREE_MODELS: ModelOption[] = [
  {
    id: 'auto',
    label: 'Auto (gratis, mejor disponible)',
    provider: 'OpenRouter',
    free: true,
    promptCostPer1K: 0,
    completionCostPer1K: 0,
    quality: 'balanced',
    note: 'Elige el mejor modelo gratuito disponible con fallback',
  },
  {
    id: 'meta-llama/llama-3.1-8b-instruct:free',
    label: 'Llama 3.1 8B',
    provider: 'Meta · OpenRouter',
    free: true,
    promptCostPer1K: 0,
    completionCostPer1K: 0,
    quality: 'fast',
    note: 'Rápido y gratuito, ideal para pruebas',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    label: 'Llama 3.3 70B',
    provider: 'Meta · OpenRouter',
    free: true,
    promptCostPer1K: 0,
    completionCostPer1K: 0,
    quality: 'best',
    note: 'El mejor modelo gratuito disponible',
  },
  {
    id: 'google/gemma-3-12b-it:free',
    label: 'Gemma 3 12B',
    provider: 'Google · OpenRouter',
    free: true,
    promptCostPer1K: 0,
    completionCostPer1K: 0,
    quality: 'balanced',
  },
  {
    id: 'qwen/qwen3-8b:free',
    label: 'Qwen 3 8B',
    provider: 'Alibaba · OpenRouter',
    free: true,
    promptCostPer1K: 0,
    completionCostPer1K: 0,
    quality: 'fast',
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    label: 'Mistral 7B',
    provider: 'Mistral · OpenRouter',
    free: true,
    promptCostPer1K: 0,
    completionCostPer1K: 0,
    quality: 'fast',
  },
];

export const PAID_MODELS: ModelOption[] = [
  {
    id: 'anthropic/claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    free: false,
    promptCostPer1K: 0.00025,
    completionCostPer1K: 0.00125,
    quality: 'fast',
    note: 'El modelo de pago más económico de Anthropic',
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    label: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    free: false,
    promptCostPer1K: 0.003,
    completionCostPer1K: 0.015,
    quality: 'balanced',
    note: 'Equilibrio óptimo calidad/precio',
  },
  {
    id: 'anthropic/claude-opus-4',
    label: 'Claude Opus 4',
    provider: 'Anthropic',
    free: false,
    promptCostPer1K: 0.015,
    completionCostPer1K: 0.075,
    quality: 'best',
    note: 'Máxima calidad creativa',
  },
  {
    id: 'openai/gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'OpenAI',
    free: false,
    promptCostPer1K: 0.00015,
    completionCostPer1K: 0.0006,
    quality: 'fast',
    note: 'El modelo de pago más económico de OpenAI',
  },
  {
    id: 'openai/gpt-4o',
    label: 'GPT-4o',
    provider: 'OpenAI',
    free: false,
    promptCostPer1K: 0.0025,
    completionCostPer1K: 0.01,
    quality: 'balanced',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    label: 'Gemini 2.0 Flash',
    provider: 'Google',
    free: false,
    promptCostPer1K: 0.000075,
    completionCostPer1K: 0.0003,
    quality: 'fast',
    note: 'El modelo de Google con mejor relación costo/velocidad',
  },
  {
    id: 'google/gemini-2.5-pro-preview',
    label: 'Gemini 2.5 Pro',
    provider: 'Google',
    free: false,
    promptCostPer1K: 0.00125,
    completionCostPer1K: 0.01,
    quality: 'best',
  },
];

export const ALL_MODELS = [...FREE_MODELS, ...PAID_MODELS];

export function getModelById(id: string): ModelOption | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

export function calcCost(
  model: ModelOption,
  promptTokens: number,
  completionTokens: number,
): number {
  return (
    (promptTokens * model.promptCostPer1K +
      completionTokens * model.completionCostPer1K) /
    1000
  );
}
