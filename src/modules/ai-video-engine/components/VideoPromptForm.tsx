'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { VideoEngineInput } from '../types/video-engine.types';

const field = 'w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-yellow-400/50';
const label = 'space-y-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400';

export function VideoPromptForm({ input, setInput, onGenerate, isGenerating }: {
  input: VideoEngineInput;
  setInput: Dispatch<SetStateAction<VideoEngineInput>>;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/40">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-yellow-400">Fabrick Studio IA</p>
      <h2 className="mb-5 text-2xl font-black tracking-[-0.05em] text-white">Brief creativo</h2>
      <div className="grid gap-4">
        <label className={label}>Tema
          <textarea className={field} rows={4} value={input.topic} onChange={(e) => setInput((p) => ({ ...p, topic: e.target.value }))} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Tipo
            <select className={field} value={input.kind} onChange={(e) => setInput((p) => ({ ...p, kind: e.target.value as VideoEngineInput['kind'] }))}>
              <option value="promotional">Promocional</option><option value="educational">Educativo</option><option value="before_after">Antes/despues</option><option value="testimonial">Testimonio</option><option value="offer">Oferta</option><option value="institutional">Institucional</option>
            </select>
          </label>
          <label className={label}>Formato
            <select className={field} value={input.format} onChange={(e) => setInput((p) => ({ ...p, format: e.target.value as VideoEngineInput['format'] }))}>
              <option value="9:16">9:16</option><option value="1:1">1:1</option><option value="16:9">16:9</option>
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Duracion
            <select className={field} value={input.duration} onChange={(e) => setInput((p) => ({ ...p, duration: Number(e.target.value) as VideoEngineInput['duration'] }))}>
              <option value={15}>15s</option><option value={30}>30s</option><option value={45}>45s</option><option value={60}>60s</option>
            </select>
          </label>
          <label className={label}>Estilo
            <select className={field} value={input.visualStyle} onChange={(e) => setInput((p) => ({ ...p, visualStyle: e.target.value as VideoEngineInput['visualStyle'] }))}>
              <option value="dark_editorial">Oscuro editorial</option><option value="premium">Premium</option><option value="technical">Tecnico</option><option value="realistic">Realista</option><option value="minimal">Minimalista</option><option value="cinematic">Cinematico</option>
            </select>
          </label>
        </div>
        <label className={label}>Publico
          <input className={field} value={input.audience} onChange={(e) => setInput((p) => ({ ...p, audience: e.target.value }))} />
        </label>
        <label className={label}>CTA
          <input className={field} value={input.cta} onChange={(e) => setInput((p) => ({ ...p, cta: e.target.value }))} />
        </label>
        <button type="button" onClick={onGenerate} disabled={isGenerating} className="rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black hover:bg-yellow-300 disabled:opacity-60">
          {isGenerating ? 'Generando...' : 'Generar con IA'}
        </button>
      </div>
    </section>
  );
}
