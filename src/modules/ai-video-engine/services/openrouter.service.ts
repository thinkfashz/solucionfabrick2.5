import 'server-only';

import { chatCompletionWithFallback, RECOMMENDED_FREE_MODELS } from '@/lib/openrouter';
import type { VideoEngineInput } from '../types/video-engine.types';
import { buildVideoPrompt } from '../prompts/build-video-prompt';
import { safeParseVideoPlan } from '../utils/validate-video-json';

export interface VideoGenerationUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  latencyMs: number;
  isFree: boolean;
}

export async function generateVideoPlanWithOpenRouter(input: VideoEngineInput) {
  const allowPaid = input.allowPaid ?? false;
  const preferredModel =
    input.preferredModel && input.preferredModel !== 'auto'
      ? input.preferredModel
      : process.env.OPENROUTER_MODEL || RECOMMENDED_FREE_MODELS[0];

  try {
    const result = await chatCompletionWithFallback({
      preferredModel,
      allowPaid,
      temperature: 0.65,
      maxTokens: 1400,
      messages: [
        {
          role: 'system',
          content: 'Eres un generador de planes de video para redes sociales. Devuelve SOLO JSON válido, sin markdown, sin explicaciones.',
        },
        {
          role: 'user',
          content: buildVideoPrompt(input),
        },
      ],
    });

    const usage: VideoGenerationUsage = {
      promptTokens:     result.usage?.prompt_tokens     ?? 0,
      completionTokens: result.usage?.completion_tokens ?? 0,
      totalTokens:      result.usage?.total_tokens      ?? 0,
      model:            result.model ?? preferredModel,
      latencyMs:        result.latency_ms ?? 0,
      isFree:           !allowPaid,
    };

    return { plan: safeParseVideoPlan(result.text), usage };
  } catch {
    const usage: VideoGenerationUsage = {
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      model: preferredModel, latencyMs: 0, isFree: !allowPaid,
    };
    return { plan: safeParseVideoPlan('{}'), usage };
  }
}
