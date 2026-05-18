import type { GeneratedVideoPlan } from '../types/video-engine.types';

export function GeneratedScriptPanel({ plan }: { plan: GeneratedVideoPlan }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-yellow-400">Guion generado</p>
      <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">{plan.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{plan.description}</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-relaxed text-zinc-300">
        {plan.voiceover}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {plan.hashtags.map((tag) => (
          <span key={tag} className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-200">
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}
