'use client';

import type { GeneratedVideoPlan } from '../types/video-engine.types';

export function GeneratedScriptPanel({ plan }: { plan: GeneratedVideoPlan }) {
  if (!plan.title) return null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">Guión</p>
        <p className="mt-0.5 text-[13px] font-bold text-white">{plan.title}</p>
        {plan.description && (
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{plan.description}</p>
        )}
      </div>

      {plan.voiceover && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-700">Voz en off</p>
          <p className="text-xs leading-relaxed text-zinc-400">{plan.voiceover}</p>
        </div>
      )}

      {plan.scenes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-700">{plan.scenes.length} escenas</p>
          {plan.scenes.map((scene) => (
            <div key={scene.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black text-zinc-500">#{scene.id}</span>
                <span className="text-[10px] tabular-nums text-zinc-700">{scene.start}s–{scene.end}s</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-zinc-300">{scene.screen_text}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">{scene.voiceover}</p>
            </div>
          ))}
        </div>
      )}

      {plan.cta && (
        <div className="rounded-xl border border-yellow-400/15 bg-yellow-400/5 px-3 py-2.5">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-yellow-500">CTA</p>
          <p className="mt-0.5 text-xs text-yellow-200">{plan.cta}</p>
        </div>
      )}

      {plan.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.hashtags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
