'use client';

import type { GeneratedVideoPlan } from '../types/video-engine.types';

export function SceneTimeline({
  plan,
  activeSceneIndex,
  setActiveSceneIndex,
}: {
  plan: GeneratedVideoPlan;
  activeSceneIndex: number;
  setActiveSceneIndex: (index: number) => void;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Timeline</p>
      <div className="grid gap-2">
        {plan.scenes.map((scene, index) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => setActiveSceneIndex(index)}
            className={`rounded-2xl border p-3 text-left transition ${
              activeSceneIndex === index
                ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-100'
                : 'border-white/10 bg-black/20 text-zinc-300 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.18em]">Escena {scene.id}</span>
              <span className="text-[11px] text-zinc-400">{scene.start}s-{scene.end}s</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-white">{scene.screen_text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
