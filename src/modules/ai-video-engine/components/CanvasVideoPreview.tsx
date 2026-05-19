'use client';

import { useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GeneratedVideoPlan, VideoFormat } from '../types/video-engine.types';
import { renderSceneFrame } from '../production/scene-renderer';

const PREVIEW_DIMS: Record<VideoFormat, { w: number; h: number }> = {
  '9:16': { w: 270, h: 480 },
  '1:1':  { w: 360, h: 360 },
  '16:9': { w: 480, h: 270 },
};

const ASPECT_CLASS: Record<VideoFormat, string> = {
  '9:16': 'aspect-[9/16] max-w-[220px]',
  '1:1':  'aspect-square max-w-[320px]',
  '16:9': 'aspect-[16/9] max-w-[480px]',
};

export function CanvasVideoPreview({
  plan,
  activeSceneIndex,
  format = '9:16',
  isPlaying = false,
  onTogglePlay,
}: {
  plan: GeneratedVideoPlan;
  activeSceneIndex: number;
  format?: VideoFormat;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Stores loaded images; null = loading/failed (don't retry)
  const imgCache = useRef<Map<string, HTMLImageElement | null>>(new Map());
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const scene = plan.scenes[activeSceneIndex] ?? plan.scenes[0];
  const { w, h } = PREVIEW_DIMS[format] ?? PREVIEW_DIMS['9:16'];

  // Pre-load background images for current and adjacent scenes
  useEffect(() => {
    const urls = plan.scenes
      .slice(Math.max(0, activeSceneIndex - 1), activeSceneIndex + 3)
      .map((s) => s.imageUrl)
      .filter((u): u is string => !!u);

    for (const url of urls) {
      if (imgCache.current.has(url)) continue;
      imgCache.current.set(url, null); // mark as loading
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imgCache.current.set(url, img);
        // Redraw static frame when image arrives and we're not playing
        if (!isPlayingRef.current && scene?.imageUrl === url) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) renderSceneFrame(ctx, w, h, scene, 0, img);
        }
      };
      img.src = url;
    }
  }, [plan, activeSceneIndex, scene, w, h]);

  // Animate frames via rAF when playing, or render single static frame when paused
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getBg = () =>
      scene.imageUrl ? (imgCache.current.get(scene.imageUrl) ?? null) : null;

    if (!isPlaying) {
      renderSceneFrame(ctx, w, h, scene, 0, getBg());
      return;
    }

    let raf: number;
    let startTime: number | null = null;
    const durationMs = Math.max(500, (scene.end - scene.start) * 1000);

    function tick(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min(1, (timestamp - startTime) / durationMs);
      renderSceneFrame(ctx!, w, h, scene!, progress, getBg());
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scene, isPlaying, w, h]);

  if (!scene) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {plan.title && (
        <div className="flex w-full items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">Preview</p>
            <p className="mt-0.5 truncate text-[13px] font-bold text-zinc-300">{plan.title}</p>
          </div>
          {onTogglePlay && plan.scenes.length > 1 && (
            <button
              type="button"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pausar' : 'Reproducir todas las escenas'}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                isPlaying
                  ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20'
                  : 'border-white/10 bg-white/[0.04] text-zinc-400 hover:border-yellow-400/30 hover:text-yellow-300'
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}

      {/* Canvas — same rendering pipeline as WebM export, id used by Cloudinary capture */}
      <div id="fabrick-video-preview-capture" className={`w-full ${ASPECT_CLASS[format]}`}>
        <canvas
          ref={canvasRef}
          width={w}
          height={h}
          className="h-full w-full rounded-[1.75rem] border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
        />
      </div>

      {isPlaying && (
        <div className="flex w-full items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              key={`pb-${activeSceneIndex}`}
              className="h-full rounded-full bg-yellow-400"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: scene.end - scene.start, ease: 'linear' }}
            />
          </div>
          <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
            {activeSceneIndex + 1} / {plan.scenes.length}
          </span>
        </div>
      )}
    </div>
  );
}
