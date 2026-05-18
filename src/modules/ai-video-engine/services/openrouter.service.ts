import 'server-only';

import type { VideoEngineInput } from '../types/video-engine.types';
import { buildVideoPrompt } from '../prompts/build-video-prompt';
import { safeParseVideoPlan } from '../utils/validate-video-json';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export async function generateVideoPlanWithOpenRouter(input: VideoEngineInput) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

  if (!apiKey) {
    return safeParseVideoPlan('{}');
  }

  const messages: OpenRouterMessage[] = [
    {
      role: 'system',
      content:
        'Eres un generador de planes audiovisuales. Responde siempre con JSON valido sin markdown.',
    },
    {
      role: 'user',
      content: buildVideoPrompt(input),
    },
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://solucionesfabrick.cl',
      'X-Title': 'Soluciones Fabrick AI Video Engine',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter error ${response.status}: ${detail.slice(0, 240)}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content || '{}';

  return safeParseVideoPlan(content);
}
