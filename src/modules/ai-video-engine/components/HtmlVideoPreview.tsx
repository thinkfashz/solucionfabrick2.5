'use client';

import { motion } from 'framer-motion';
import type { GeneratedVideoPlan, VideoFormat, VideoScene } from '../types/video-engine.types';

function sceneGradient(style: string) {
  if (style.includes('blueprint')) return 'from-sky-950 via-zinc-950 to-black';
  if (style.includes('metal')) return 'from-zinc-800 via-zinc-950 to-black';
  if (style.includes('premium')) return 'from-yellow-950 via-zinc-950 to-black';
  if (style.includes('concrete')) return 'from-stone-800 via-zinc-950 to-black';
  return 'from-zinc-950 via-black to-zinc-900';
}

const ASPECT: Record<VideoFormat, string> = {
  '9:16': 'aspect-[9/16] max-w-[220px]',
  '1:1': 'aspect-square max-w-[320px]',
  '16:9': 'aspect-[16/9] max-w-[480px]',
};

function SceneCard({ scene }: { scene: VideoScene }) {
  return (
    <div className={`relative w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${sceneGradient(scene.background_style)} shadow-[0_24px_60px_rgba(0,0,0,0.7)]`}>
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(250,204,21,0.18),transparent_50%)]" />

      {/* Topbar */}
      <div className="absolute inset-x-5 top-4 flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-yellow-300/70">Fabrick Studio</span>
        <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] font-semibold tabular-nums text-zinc-400 backdrop-blur">
          {scene.start}s–{scene.end}s
        </span>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5">
        <motion.div
          key={scene.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          <div className="h-[3px] w-12 rounded-full bg-yellow-400" />
          <h3 className="text-2xl font-black leading-[1.0] tracking-[-0.04em] text-white drop-shadow-lg sm:text-3xl">
            {scene.screen_text}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-300/80">{scene.voiceover}</p>
          <div className="mt-1 rounded-xl border border-white/8 bg-black/30 p-2.5 text-[10px] leading-relaxed text-zinc-500 backdrop-blur">
            {scene.visual_prompt}
          </div>
        </motion.div>
      </div>

      {/* Bottom scene indicator */}
      <div className="absolute bottom-3 right-5 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-black text-black shadow-lg">
        {scene.id}
      </div>
    </div>
  );
}

export function HtmlVideoPreview({
  plan,
  activeSceneIndex,
  format = '9:16',
}: {
  plan: GeneratedVideoPlan;
  activeSceneIndex: number;
  format?: VideoFormat;
}) {
  const scene = plan.scenes[activeSceneIndex] ?? plan.scenes[0];
  if (!scene) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {plan.title && (
        <div className="w-full">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">Preview</p>
          <p className="mt-0.5 truncate text-[13px] font-bold text-zinc-300">{plan.title}</p>
        </div>
      )}
      <div id="fabrick-video-preview-capture" className={`w-full ${ASPECT[format]}`}>
        <SceneCard scene={scene} />
      </div>
    </div>
  );
}
