import 'server-only';

import { insforgeAdmin } from '@/lib/insforge';
import type { GeneratedVideoPlan, VideoEngineInput } from '../types/video-engine.types';

export async function saveVideoPlanRun(input: VideoEngineInput, plan: GeneratedVideoPlan) {
  try {
    const { data } = await insforgeAdmin.database.from('ai_video_engine_runs').insert([
      {
        title: plan.title,
        description: plan.description,
        input_data: input,
        generated_data: plan,
        status: 'generated',
      },
    ]).select('id').maybeSingle();

    return typeof (data as { id?: unknown } | null)?.id === 'string' ? (data as { id: string }).id : null;
  } catch {
    return null;
  }
}

export async function saveSceneAsset(runId: string | null, sceneId: number, url: string, publicId?: string) {
  if (!runId) return;
  try {
    await insforgeAdmin.database.from('ai_video_scene_assets').insert([
      {
        run_id: runId,
        scene_id: sceneId,
        asset_url: url,
        cloudinary_public_id: publicId ?? null,
        asset_type: 'image',
      },
    ]);
  } catch {
    /* optional table; ignore when not created yet */
  }
}
