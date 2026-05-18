'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Link as LinkIcon, Sparkles, Zap } from 'lucide-react';
import type { VideoEngineInput } from '../types/video-engine.types';
import { FREE_MODELS, PAID_MODELS } from '../data/models';

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white outline-none transition focus:border-yellow-400/40 focus:bg-white/[0.07] placeholder:text-zinc-700';

const labelCls = 'block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </div>
  );
}

export function VideoPromptForm({
  input,
  setInput,
  onGenerate,
  isGenerating,
}: {
  input: VideoEngineInput;
  setInput: Dispatch<SetStateAction<VideoEngineInput>>;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const isPaid = input.allowPaid ?? false;
  const modelOptions = isPaid ? PAID_MODELS : FREE_MODELS;

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">Brief creativo</p>
        <p className="mt-0.5 text-[13px] font-bold text-zinc-300">Configura tu video</p>
      </div>

      {/* ── Model tier toggle ── */}
      <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
        <p className={labelCls}>Tipo de IA</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInput((p) => ({ ...p, allowPaid: false, preferredModel: 'auto' }))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition-all ${
              !isPaid
                ? 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border border-white/10 text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Zap className="h-3 w-3" />
            Gratis
          </button>
          <button
            type="button"
            onClick={() => setInput((p) => ({ ...p, allowPaid: true, preferredModel: PAID_MODELS[0].id }))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold transition-all ${
              isPaid
                ? 'border border-yellow-400/40 bg-yellow-400/10 text-yellow-300'
                : 'border border-white/10 text-zinc-600 hover:text-zinc-400'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            De pago
          </button>
        </div>

        {/* Model selector */}
        <Field label="Modelo">
          <select
            className={inputCls}
            value={input.preferredModel ?? 'auto'}
            onChange={(e) => setInput((p) => ({ ...p, preferredModel: e.target.value }))}
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.provider}
                {!m.free && m.promptCostPer1K > 0
                  ? ` · $${m.promptCostPer1K}/1K`
                  : ''}
              </option>
            ))}
          </select>
        </Field>

        {/* Model note */}
        {(() => {
          const selected = modelOptions.find(
            (m) => m.id === (input.preferredModel ?? 'auto'),
          );
          return selected?.note ? (
            <p className="text-[10px] leading-relaxed text-zinc-700">{selected.note}</p>
          ) : null;
        })()}
      </div>

      {/* ── URL de referencia ── */}
      <Field label="URL de la página (opcional)">
        <div className="relative">
          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            type="url"
            className={`${inputCls} pl-8`}
            placeholder="https://solucionesfabrick.com/servicios/…"
            value={input.pageUrl ?? ''}
            onChange={(e) => setInput((p) => ({ ...p, pageUrl: e.target.value }))}
          />
        </div>
      </Field>

      {/* ── Tema ── */}
      <Field label="Tema del video">
        <textarea
          className={inputCls}
          rows={3}
          placeholder="Describe el contenido principal del video…"
          value={input.topic}
          onChange={(e) => setInput((p) => ({ ...p, topic: e.target.value }))}
        />
      </Field>

      {/* ── Tipo + Formato ── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <select className={inputCls} value={input.kind} onChange={(e) => setInput((p) => ({ ...p, kind: e.target.value as VideoEngineInput['kind'] }))}>
            <option value="promotional">Promocional</option>
            <option value="educational">Educativo</option>
            <option value="before_after">Antes/después</option>
            <option value="testimonial">Testimonio</option>
            <option value="offer">Oferta</option>
            <option value="institutional">Institucional</option>
          </select>
        </Field>
        <Field label="Formato">
          <select className={inputCls} value={input.format} onChange={(e) => setInput((p) => ({ ...p, format: e.target.value as VideoEngineInput['format'] }))}>
            <option value="9:16">9:16 · Reels</option>
            <option value="1:1">1:1 · Cuadrado</option>
            <option value="16:9">16:9 · Panorámico</option>
          </select>
        </Field>
      </div>

      {/* ── Duración + Estilo ── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duración">
          <select className={inputCls} value={input.duration} onChange={(e) => setInput((p) => ({ ...p, duration: Number(e.target.value) as VideoEngineInput['duration'] }))}>
            <option value={15}>15 seg</option>
            <option value={30}>30 seg</option>
            <option value={45}>45 seg</option>
            <option value={60}>60 seg</option>
          </select>
        </Field>
        <Field label="Estilo visual">
          <select className={inputCls} value={input.visualStyle} onChange={(e) => setInput((p) => ({ ...p, visualStyle: e.target.value as VideoEngineInput['visualStyle'] }))}>
            <option value="dark_editorial">Editorial oscuro</option>
            <option value="premium">Premium</option>
            <option value="technical">Técnico</option>
            <option value="realistic">Realista</option>
            <option value="minimal">Minimalista</option>
            <option value="cinematic">Cinemático</option>
          </select>
        </Field>
      </div>

      {/* ── Público ── */}
      <Field label="Público objetivo">
        <input type="text" className={inputCls} placeholder="Dueños de casa, empresas constructoras…" value={input.audience} onChange={(e) => setInput((p) => ({ ...p, audience: e.target.value }))} />
      </Field>

      {/* ── CTA ── */}
      <Field label="Llamado a la acción">
        <input type="text" className={inputCls} placeholder="Cotiza con Soluciones Fabrick" value={input.cta} onChange={(e) => setInput((p) => ({ ...p, cta: e.target.value }))} />
      </Field>

      {/* ── Generate ── */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3 text-[12px] font-black uppercase tracking-[0.16em] text-black shadow-lg transition hover:bg-yellow-300 disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            Generando…
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Generar con IA
          </>
        )}
      </button>
    </div>
  );
}
