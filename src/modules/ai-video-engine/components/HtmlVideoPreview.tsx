'use client';

import { motion } from 'framer-motion';
import type { GeneratedVideoPlan, VideoScene } from '../types/video-engine.types';

function sceneGradient(style: string) {
  if (style.includes('blueprint')) return 'from-sky-950 via-zinc-950 to-black';
  if (style.includes('metal')) return 'from-zinc-800 via-zinc-950 to-black';
  if (style.includes('premium')) return 'from-yellow-950 via-zinc-950 to-black';
  if (style.includes('concrete')) return 'from-stone-800 via-zinc-950 to-black';
  return 'from-zinc-950 via-black to-zinc-900';
}

function SceneCard({ scene, active }: { scene: VideoScene; active: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: active ? 1 : 0.42, y: active ? 0 : 14, scale: active ? 1 : 0.96 }}
      transition={{ duration: 0.45 }}
      className={`relative aspect-[9/16] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${sceneGradient(scene.background_style)} shadow-2xl`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.22),transparent_34%),linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:100%_100%,34px_34px,34px_34px]" />
      <div className="absolute inset-x-6 top-6 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.26em] text-yellow-300/80">
        <span>Fabrick Studio IA</span>
        <span>{scene.start}s-{scene.end}s</span>
      </div>
      <div className="absolute inset-0 flex flex-col justify-end p-7">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <div className="h-1 w-16 rounded-full bg-yellow-400" />
          <h3 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white drop-shadow-xl">
            {scene.screen_text}
          </h3>
          <p className="max-w-[15rem] text-sm leading-relaxed text-zinc-300">{scene.voiceover}</p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-[11px] leading-relaxed text-zinc-400 backdrop-blur">
            {scene.visual_prompt}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function HtmlVideoPreview({ plan, activeSceneIndex }: { plan: GeneratedVideoPlan; activeSceneIndex: number }) {
  const scene = plan.scenes[activeSceneIndex] ?? plan.scenes[0];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-yellow-400">Preview HTML</p>
          <h2 className="text-xl font-black tracking-[-0.04em] text-white">{plan.title}</h2>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-300">
          {plan.format} · {plan.duration}s
        </span>
      </div>
      <div id="fabrick-video-preview-capture" className="mx-auto max-w-[320px]">
        <SceneCard scene={scene} active />
      </div>
    </div>
  );
}
