import { NextResponse } from 'next/server';

import { generateVideoPlanWithOpenRouter } from '@/modules/ai-video-engine/services/openrouter.service';
import { saveVideoPlanRun } from '@/modules/ai-video-engine/services/video-storage.service';
import type { VideoEngineInput } from '@/modules/ai-video-engine/types/video-engine.types';

function isValidInput(value: unknown): value is VideoEngineInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<VideoEngineInput>;
  return typeof input.topic === 'string' && input.topic.trim().length >= 3;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isValidInput(body)) {
      return NextResponse.json(
        { error: 'El tema del video es obligatorio.' },
        { status: 400 },
      );
    }

    const { plan, usage } = await generateVideoPlanWithOpenRouter(body);
    const runId = await saveVideoPlanRun(body, plan);

    return NextResponse.json({ plan, runId, usage });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo generar el video.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
