import { NextResponse } from 'next/server';

import { uploadSceneToCloudinary } from '@/modules/ai-video-engine/services/cloudinary.service';
import type { CloudinarySceneUploadInput } from '@/modules/ai-video-engine/types/video-engine.types';

function isValidUploadInput(value: unknown): value is CloudinarySceneUploadInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<CloudinarySceneUploadInput>;
  return (
    typeof input.videoTitle === 'string' &&
    typeof input.sceneId === 'number' &&
    typeof input.dataUrl === 'string' &&
    input.dataUrl.startsWith('data:image/')
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isValidUploadInput(body)) {
      return NextResponse.json(
        { error: 'Imagen, titulo y escena son obligatorios.' },
        { status: 400 },
      );
    }

    const result = await uploadSceneToCloudinary(body);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo subir la escena.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
