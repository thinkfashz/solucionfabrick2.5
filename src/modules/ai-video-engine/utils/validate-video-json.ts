import type { GeneratedVideoPlan, VideoScene } from '../types/video-engine.types';
import { fallbackVideoPlan } from '../templates/social-reel';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeScene(scene: unknown, index: number): VideoScene {
  if (!isRecord(scene)) {
    return fallbackVideoPlan.scenes[index] ?? fallbackVideoPlan.scenes[0];
  }

  return {
    id: Number(scene.id ?? index + 1),
    start: Number(scene.start ?? index * 5),
    end: Number(scene.end ?? index * 5 + 5),
    visual_prompt: String(scene.visual_prompt ?? 'Composicion visual premium de construccion moderna.'),
    screen_text: String(scene.screen_text ?? 'Soluciones Fabrick'),
    voiceover: String(scene.voiceover ?? ''),
    transition: String(scene.transition ?? 'fade-up'),
    background_style: String(scene.background_style ?? 'dark-grid'),
  };
}

export function safeParseVideoPlan(raw: string): GeneratedVideoPlan {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) return fallbackVideoPlan;

    const scenesSource = Array.isArray(parsed.scenes) ? parsed.scenes : fallbackVideoPlan.scenes;
    const scenes = scenesSource.map(normalizeScene).slice(0, 12);

    return {
      title: String(parsed.title ?? fallbackVideoPlan.title),
      description: String(parsed.description ?? fallbackVideoPlan.description),
      duration: Number(parsed.duration ?? fallbackVideoPlan.duration) as GeneratedVideoPlan['duration'],
      format: String(parsed.format ?? fallbackVideoPlan.format) as GeneratedVideoPlan['format'],
      voiceover: String(parsed.voiceover ?? fallbackVideoPlan.voiceover),
      scenes: scenes.length > 0 ? scenes : fallbackVideoPlan.scenes,
      cta: String(parsed.cta ?? fallbackVideoPlan.cta),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((tag) => String(tag)).slice(0, 12)
        : fallbackVideoPlan.hashtags,
    };
  } catch {
    return fallbackVideoPlan;
  }
}
