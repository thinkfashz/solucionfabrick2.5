'use client';

import { useState } from 'react';
import { ChevronDown, Cpu, DollarSign } from 'lucide-react';
import type { VideoTokenUsage } from '../types/video-engine.types';
import { ALL_MODELS, calcCost } from '../data/models';

function fmt(n: number): string {
  return n.toLocaleString('es-CL');
}

function fmtCost(usd: number): string {
  if (usd === 0) return 'Gratis';
  if (usd < 0.000001) return '< $0.000001';
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(4)}`;
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

const COMPARISON_IDS = [
  'auto',
  'meta-llama/llama-3.3-70b-instruct:free',
  'anthropic/claude-haiku-4-5',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-001',
  'anthropic/claude-sonnet-4-5',
  'openai/gpt-4o',
  'anthropic/claude-opus-4',
];

export function TokenUsagePanel({ usage }: { usage: VideoTokenUsage }) {
  const [open, setOpen] = useState(false);

  const tokPer10s = usage.duration > 0
    ? Math.round((usage.totalTokens / usage.duration) * 10)
    : usage.totalTokens;

  const compModels = ALL_MODELS.filter((m) => COMPARISON_IDS.includes(m.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 transition hover:bg-white/[0.03]"
      >
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-[11px] font-bold text-zinc-300">Tokens usados</span>
          <span className="rounded-full border border-purple-400/20 bg-purple-400/8 px-2 py-0.5 text-[10px] font-black tabular-nums text-purple-300">
            {fmt(usage.totalTokens)}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/8 px-3 pb-4 pt-3">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Entrada', value: fmt(usage.promptTokens), color: 'text-sky-300' },
              { label: 'Salida', value: fmt(usage.completionTokens), color: 'text-emerald-300' },
              { label: 'Total', value: fmt(usage.totalTokens), color: 'text-yellow-300' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-2 text-center">
                <p className={`text-[13px] font-black tabular-nums ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-700">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="space-y-1.5 text-[10px] text-zinc-600">
            <div className="flex items-center justify-between">
              <span>Modelo usado</span>
              <span className="truncate pl-4 text-right font-mono text-zinc-500">{usage.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Latencia</span>
              <span className="font-mono text-zinc-500">{fmtMs(usage.latencyMs)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Duración del video</span>
              <span className="font-mono text-zinc-500">{usage.duration}s</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-zinc-500">Est. por 10s de video</span>
              <span className="text-purple-300">~{fmt(tokPer10s)} tokens</span>
            </div>
          </div>

          {/* Cost comparison table */}
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <DollarSign className="h-3 w-3 text-zinc-600" />
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-zinc-700">
                Comparativa de coste
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/8">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/8 bg-white/[0.03]">
                    <th className="px-2.5 py-1.5 text-left font-bold uppercase tracking-[0.18em] text-zinc-700">Modelo</th>
                    <th className="px-2.5 py-1.5 text-right font-bold uppercase tracking-[0.18em] text-zinc-700">Este video</th>
                    <th className="px-2.5 py-1.5 text-right font-bold uppercase tracking-[0.18em] text-zinc-700">×100 videos</th>
                  </tr>
                </thead>
                <tbody>
                  {compModels.map((model, i) => {
                    const cost = model.free
                      ? 0
                      : calcCost(model, usage.promptTokens, usage.completionTokens);
                    const isActive = usage.model.includes(model.id.replace(':free', ''))
                      || (model.id === 'auto' && usage.isFree);
                    return (
                      <tr
                        key={model.id}
                        className={`border-b border-white/5 last:border-0 ${
                          isActive ? 'bg-yellow-400/5' : i % 2 === 0 ? '' : 'bg-white/[0.015]'
                        }`}
                      >
                        <td className="px-2.5 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`${model.free ? 'text-emerald-400' : 'text-zinc-300'}`}>
                              {model.label}
                            </span>
                            {isActive && (
                              <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-1 py-px text-[8px] font-black text-yellow-300">actual</span>
                            )}
                            {model.free && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-1 py-px text-[8px] font-bold text-emerald-400">gratis</span>
                            )}
                          </div>
                          <span className="text-zinc-700">{model.provider}</span>
                        </td>
                        <td className={`px-2.5 py-2 text-right tabular-nums font-bold ${model.free ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {fmtCost(cost)}
                        </td>
                        <td className={`px-2.5 py-2 text-right tabular-nums ${model.free ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {fmtCost(cost * 100)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-[9px] leading-relaxed text-zinc-700">
              Los precios son por 1K tokens (OpenRouter). Los tokens reales varían según el tema y la duración del video.
              Los modelos gratuitos tienen límites de uso diario en OpenRouter.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
