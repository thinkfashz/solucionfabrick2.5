'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  ChevronDown,
  Code2,
  FileJson,
  Link as LinkIcon,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import type { GeneratedVideoPlan, VideoEngineInput } from '../types/video-engine.types';
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

const JSON_EXAMPLE = JSON.stringify(
  {
    title: 'Título del video',
    description: 'Descripción breve',
    duration: 30,
    format: '9:16',
    voiceover: 'Voz en off general',
    scenes: [
      {
        id: 1, start: 0, end: 5,
        visual_prompt: 'Descripción visual detallada para generación de imágenes',
        screen_text: 'Texto corto en pantalla',
        voiceover: 'Texto hablado de esta escena',
        transition: 'fade-up',
        background_style: 'dark-grid',
        imageUrl: 'https://... (opcional)',
      },
    ],
    cta: 'Llamado a la acción',
    hashtags: ['#ejemplo'],
  },
  null,
  2,
);

export function VideoPromptForm({
  input,
  setInput,
  onGenerate,
  isGenerating,
  onImportPlan,
}: {
  input: VideoEngineInput;
  setInput: Dispatch<SetStateAction<VideoEngineInput>>;
  onGenerate: () => void;
  isGenerating: boolean;
  onImportPlan: (plan: GeneratedVideoPlan) => void;
}) {
  const [mode, setMode] = useState<'structured' | 'free'>('structured');
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [showJsonSchema, setShowJsonSchema] = useState(false);

  const isPaid = input.allowPaid ?? false;
  const modelOptions = isPaid ? PAID_MODELS : FREE_MODELS;

  function importJson() {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonText) as GeneratedVideoPlan;
      if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
        throw new Error('El JSON debe tener un array "scenes" con al menos 1 escena.');
      }
      onImportPlan(parsed);
      setShowJson(false);
      setJsonText('');
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'JSON inválido.');
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">Brief creativo</p>
        <p className="mt-0.5 text-[13px] font-bold text-zinc-300">Configura tu video</p>
      </div>

      {/* ── Mode toggle: Asistido / Libre ── */}
      <div className="flex gap-1 rounded-xl border border-white/8 bg-black/20 p-1">
        <button
          type="button"
          onClick={() => setMode('structured')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
            mode === 'structured'
              ? 'bg-white/10 text-white shadow'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
        >
          <Sparkles className="h-3 w-3" />
          Asistido
        </button>
        <button
          type="button"
          onClick={() => setMode('free')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-all ${
            mode === 'free'
              ? 'bg-white/10 text-white shadow'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
        >
          <Wand2 className="h-3 w-3" />
          Libre
        </button>
      </div>

      {/* ── Model tier + selector ── */}
      <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.025] p-3">
        <p className={labelCls}>Modelo IA</p>
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
        <Field label="Modelo">
          <select
            className={inputCls}
            value={input.preferredModel ?? 'auto'}
            onChange={(e) => setInput((p) => ({ ...p, preferredModel: e.target.value }))}
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} · {m.provider}
                {!m.free && m.promptCostPer1K > 0 ? ` · $${m.promptCostPer1K}/1K` : ''}
              </option>
            ))}
          </select>
        </Field>
        {(() => {
          const sel = modelOptions.find((m) => m.id === (input.preferredModel ?? 'auto'));
          return sel?.note ? <p className="text-[10px] leading-relaxed text-zinc-700">{sel.note}</p> : null;
        })()}
      </div>

      {mode === 'free' ? (
        /* ── FREE MODE ── */
        <div className="space-y-2">
          <Field label="Describe tu video libremente">
            <textarea
              className={`${inputCls} resize-none`}
              rows={8}
              placeholder={`Ej: Crea un video de 30 segundos para Instagram Reels sobre una cafetería artesanal en Santiago. Estilo vintage y cálido, audiencia de 25-40 años. Escenas: café preparándose, close-up de la taza, exterior del local. CTA: Visítanos en Barrio Italia.\n\nPuedes pedir cualquier tema, industria o estilo — no hay restricciones.`}
              value={input.freePrompt ?? ''}
              onChange={(e) => setInput((p) => ({ ...p, freePrompt: e.target.value }))}
            />
          </Field>
          <p className="text-[9px] leading-relaxed text-zinc-700">
            El formato y duración de abajo siguen aplicando. El resto es 100% libre.
          </p>
        </div>
      ) : (
        /* ── STRUCTURED MODE ── */
        <div className="space-y-3">
          <Field label="URL de referencia (opcional)">
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                type="url"
                className={`${inputCls} pl-8`}
                placeholder="https://tusitio.com/pagina…"
                value={input.pageUrl ?? ''}
                onChange={(e) => setInput((p) => ({ ...p, pageUrl: e.target.value }))}
              />
            </div>
          </Field>
          <Field label="Tema del video">
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Describe el contenido principal del video…"
              value={input.topic}
              onChange={(e) => setInput((p) => ({ ...p, topic: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <select
                className={inputCls}
                value={input.kind}
                onChange={(e) => setInput((p) => ({ ...p, kind: e.target.value as VideoEngineInput['kind'] }))}
              >
                <option value="promotional">Promocional</option>
                <option value="educational">Educativo</option>
                <option value="before_after">Antes/después</option>
                <option value="testimonial">Testimonio</option>
                <option value="offer">Oferta</option>
                <option value="institutional">Institucional</option>
              </select>
            </Field>
            <Field label="Estilo visual">
              <select
                className={inputCls}
                value={input.visualStyle}
                onChange={(e) => setInput((p) => ({ ...p, visualStyle: e.target.value as VideoEngineInput['visualStyle'] }))}
              >
                <option value="dark_editorial">Editorial oscuro</option>
                <option value="premium">Premium</option>
                <option value="technical">Técnico</option>
                <option value="realistic">Realista</option>
                <option value="minimal">Minimalista</option>
                <option value="cinematic">Cinemático</option>
              </select>
            </Field>
          </div>
          <Field label="Público objetivo">
            <input
              type="text"
              className={inputCls}
              placeholder="Dueños de casa, empresas, jóvenes 18-35…"
              value={input.audience}
              onChange={(e) => setInput((p) => ({ ...p, audience: e.target.value }))}
            />
          </Field>
          <Field label="Llamado a la acción (CTA)">
            <input
              type="text"
              className={inputCls}
              placeholder="Cotiza, Visítanos, Llámanos…"
              value={input.cta}
              onChange={(e) => setInput((p) => ({ ...p, cta: e.target.value }))}
            />
          </Field>
        </div>
      )}

      {/* ── Format + Duration (always visible) ── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Formato">
          <select
            className={inputCls}
            value={input.format}
            onChange={(e) => setInput((p) => ({ ...p, format: e.target.value as VideoEngineInput['format'] }))}
          >
            <option value="9:16">9:16 · Reels / TikTok</option>
            <option value="1:1">1:1 · Cuadrado</option>
            <option value="16:9">16:9 · Panorámico</option>
          </select>
        </Field>
        <Field label="Duración">
          <select
            className={inputCls}
            value={input.duration}
            onChange={(e) => setInput((p) => ({ ...p, duration: Number(e.target.value) as VideoEngineInput['duration'] }))}
          >
            <option value={15}>15 seg</option>
            <option value={30}>30 seg</option>
            <option value={45}>45 seg</option>
            <option value={60}>60 seg</option>
          </select>
        </Field>
      </div>

      {/* ── Scene count slider ── */}
      <Field label={`Escenas: ${input.sceneCount ? `${input.sceneCount} exactas` : 'automático'}`}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={2}
            max={12}
            step={1}
            value={input.sceneCount ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              setInput((p) => ({ ...p, sceneCount: v === 0 ? undefined : v }));
            }}
            className="flex-1 accent-yellow-400"
          />
          <button
            type="button"
            onClick={() => setInput((p) => ({ ...p, sceneCount: undefined }))}
            className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-[9px] font-bold text-zinc-600 transition hover:text-zinc-300"
          >
            Auto
          </button>
        </div>
        <p className="text-[9px] text-zinc-700">
          {input.sceneCount
            ? `La IA distribuirá ${input.duration}s en exactamente ${input.sceneCount} escenas.`
            : 'La IA decide cuántas escenas usar.'}
        </p>
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

      {/* ── JSON import ── */}
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 transition hover:bg-white/[0.03]"
        >
          <div className="flex items-center gap-2">
            <FileJson className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[11px] font-bold text-zinc-400">Importar plan en JSON</span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-200 ${showJson ? 'rotate-180' : ''}`}
          />
        </button>
        {showJson && (
          <div className="space-y-3 border-t border-white/8 px-3 pb-4 pt-3">
            <p className="text-[10px] leading-relaxed text-zinc-600">
              Pega el JSON del plan de video para saltarte la IA y empezar a editar directo.
            </p>
            <button
              type="button"
              onClick={() => setShowJsonSchema((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 transition hover:text-sky-400"
            >
              <Code2 className="h-3 w-3" />
              {showJsonSchema ? 'Ocultar esquema' : 'Ver estructura esperada'}
            </button>
            {showJsonSchema && (
              <pre className="overflow-x-auto rounded-xl border border-white/8 bg-black/30 p-3 text-[9px] leading-relaxed text-zinc-500 scrollbar-hide">
                {JSON_EXAMPLE}
              </pre>
            )}
            <textarea
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] p-3 font-mono text-[11px] text-white outline-none transition focus:border-sky-400/40 placeholder:text-zinc-700"
              rows={6}
              placeholder={'{\n  "title": "...",\n  "scenes": [...]\n}'}
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonError(null); }}
            />
            {jsonError && <p className="text-[10px] text-red-400">{jsonError}</p>}
            <button
              type="button"
              onClick={importJson}
              disabled={!jsonText.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/8 py-2 text-[11px] font-bold text-sky-300 transition hover:bg-sky-400/15 disabled:opacity-40"
            >
              <FileJson className="h-3.5 w-3.5" />
              Importar plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
