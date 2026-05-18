export type VideoFormat = '9:16' | '1:1' | '16:9';
export type VideoDuration = 15 | 30 | 45 | 60;
export type VideoKind = 'promotional' | 'educational' | 'before_after' | 'testimonial' | 'offer' | 'institutional';
export type VisualStyle = 'premium' | 'technical' | 'realistic' | 'minimal' | 'cinematic' | 'dark_editorial';

export interface VideoEngineInput {
  topic: string;
  pageUrl?: string;
  kind: VideoKind;
  format: VideoFormat;
  duration: VideoDuration;
  audience: string;
  visualStyle: VisualStyle;
  cta: string;
  /** Use paid models (allowPaid: true) or free-only */
  allowPaid?: boolean;
  /** Specific model ID to prefer, or 'auto' */
  preferredModel?: string;
}

export interface VideoTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
  latencyMs: number;
  isFree: boolean;
  duration: number;
}

export interface VideoScene {
  id: number;
  start: number;
  end: number;
  visual_prompt: string;
  screen_text: string;
  voiceover: string;
  transition: string;
  background_style: string;
}

export interface GeneratedVideoPlan {
  title: string;
  description: string;
  duration: VideoDuration;
  format: VideoFormat;
  voiceover: string;
  scenes: VideoScene[];
  cta: string;
  hashtags: string[];
}

export interface CloudinarySceneUploadInput {
  videoTitle: string;
  sceneId: number;
  dataUrl: string;
}

export interface CloudinarySceneUploadResult {
  url: string;
  publicId?: string;
}
