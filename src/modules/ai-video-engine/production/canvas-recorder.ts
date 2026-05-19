import type { GeneratedVideoPlan, VideoFormat } from '../types/video-engine.types';
import { renderSceneFrame } from './scene-renderer';

export const FORMAT_DIMENSIONS: Record<VideoFormat, { w: number; h: number }> = {
  '9:16': { w: 540,  h: 960  },
  '1:1':  { w: 720,  h: 720  },
  '16:9': { w: 960,  h: 540  },
};

export interface RecordProgress {
  scene: number;
  totalScenes: number;
  percent: number;
  status: 'rendering' | 'encoding' | 'done';
}

function pickMime(): string {
  for (const t of [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return 'video/webm';
}

/** Waits ~1 frame at target fps without throttling to vsync */
function waitFrame(fps = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.floor(1000 / fps)));
}

/** Pre-loads background images for all scenes. Images that fail CORS or 404 are silently skipped. */
async function preloadImages(plan: GeneratedVideoPlan): Promise<Map<string, HTMLImageElement>> {
  const urls = [...new Set(plan.scenes.map((s) => s.imageUrl).filter((u): u is string => !!u))];
  const map = new Map<string, HTMLImageElement>();
  await Promise.allSettled(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => { map.set(url, img); resolve(); };
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  );
  return map;
}

/**
 * Records all scenes of a video plan as a WebM blob using the browser's
 * Canvas API + MediaRecorder. No external deps required.
 *
 * Note: Recording happens in real-time — a 30-second plan takes ~30 s.
 */
export async function recordPlanAsWebM(
  plan: GeneratedVideoPlan,
  onProgress?: (p: RecordProgress) => void,
): Promise<Blob> {
  const fmt = (plan.format ?? '9:16') as VideoFormat;
  const { w, h } = FORMAT_DIMENSIONS[fmt] ?? FORMAT_DIMENSIONS['9:16'];
  const fps = 30;

  // Pre-load all background images before recording starts
  const imageMap = await preloadImages(plan);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas.');

  const mime = pickMime();
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  recorder.start(200); // flush every 200ms

  const totalScenes = plan.scenes.length;

  // Calculate total frames across all scenes
  let totalFrames = 0;
  for (const scene of plan.scenes) {
    totalFrames += Math.ceil((scene.end - scene.start) * fps);
  }

  let framesDone = 0;

  for (let i = 0; i < plan.scenes.length; i++) {
    const scene = plan.scenes[i];
    const sceneDurationSec = scene.end - scene.start;
    const frameCount = Math.ceil(sceneDurationSec * fps);
    const bgImage = scene.imageUrl ? (imageMap.get(scene.imageUrl) ?? null) : null;

    for (let f = 0; f < frameCount; f++) {
      const progress = frameCount > 1 ? f / (frameCount - 1) : 1;
      renderSceneFrame(ctx, w, h, scene, progress, bgImage);
      framesDone++;

      onProgress?.({
        scene: i + 1,
        totalScenes,
        percent: Math.round((framesDone / totalFrames) * 100),
        status: 'rendering',
      });

      await waitFrame(fps);
    }
  }

  onProgress?.({ scene: totalScenes, totalScenes, percent: 99, status: 'encoding' });

  // Stop + wait for encoder to flush
  recorder.stop();
  await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

  onProgress?.({ scene: totalScenes, totalScenes, percent: 100, status: 'done' });

  return new Blob(chunks, { type: mime });
}

/** Downloads a Blob as a file in the browser */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke after a short delay to let the download start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
