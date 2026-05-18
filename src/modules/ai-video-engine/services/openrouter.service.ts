import 'server-only';

import { chatCompletionWithFallback, RECOMMENDED_FREE_MODELS } from '@/lib/openrouter';
import type { VideoEngineInput } from '../types/video-engine.types';
import { buildVideoPrompt } from '../prompts/build-video-prompt';
import { safeParseVideoPlan } from '../utils/validate-video-json';

export async function generateVideoPlanWithOpenRouter(input: VideoEngineInput) {
  const preferredModel = process.env.OPENROUTER_MODEL || RECOMMENDED_FREE_MODELS[0];

  try {
    const result = await chatCompletionWithFallback({
      preferredModel,
      allowPaid: false,
      temperature: 0.65,
      maxTokens: 1400,
      messages: [
        {
          role: 'system',
          content: 'Eres un generador de planes audiovisuales para Soluciones Fabrick. Responde solo JSON valido.',
        },
        {
          role: 'user',
          content: buildVideoPrompt(input),
        },
      ],
    });

    return safeParseVideoPlan(result.text);
  } catch {
    return safeParseVideoPlan('{}');
  }
}
