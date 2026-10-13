'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Minus, Plus, Ruler } from 'lucide-react';
import { RADIER_CONCRETE_GRADES, RADIER_SHAPES } from '@/lib/radierCalculator';
import RadierCalculatorPremium from '@/components/store/RadierCalculatorPremium';
import { isRadierUnlocked, radierSummaryLine } from './useRadierQuote';
import { useRadierQuote } from './useRadierQuote';
import RadierBudgetSheet from './RadierBudgetSheet';
import RadierGuide from './RadierGuide';
import RadierGuideGate from './RadierGuideGate';
import RadierMixDecision from './RadierMixDecision';
import RadierShareActions from './RadierShareActions';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function QuickField({ label, unit, value, onChange, min = 1, step = 0.5 }: {
  label: string; unit: string; value: number; onChange: (value: number) => void; min?: number; step?: number;
}) {
  const update = (next: number) => { if (Number.isFinite(next) && next >= min) onChange(Math.round(next * 100) / 100); };
  return (
    <div className="grid gap-1.5 border-b border-white/10 pb-2.5">
      <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">{label} <span className="text-white/25">({unit})</span></span>
      <span className="flex items-center gap-1">
        <button type="button" onClick={() => update(value - step)} aria-label={`Disminuir ${label}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-[#F6C64A]/50 hover:text-[#F6C64A]">
          <Minus size={14} aria-hidden />
        </button>
        <input
          type="number" inputMode="decimal" min={min} step={step} value={value}
          onChange={(e) => update(Number(e.target.value))}
          aria-label={`${label} en ${unit}`}
          className="min-w-0 flex-1 bg-transparent text-center text-2xl font-black tabular-nums text-white outline-none"
        />
        <button type="button" onClick={() => update(value + step)} aria-label={`Aumentar ${label}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-[#F6C64A]/50 hover:text-[#F6C64A]">
          <Plus size={14} aria-hidden />
        </button>
      </span>
    </div>
  );
}

/**
 * Experiencia completa del radier: medidas rápidas, hoja de presupuesto, guía por
 * etapas y puerta a la guía completa. Las medidas viven en la URL para que el
 * presupuesto sea compartible. El calculador 4D conserva su propio estado.
 */
export default function RadierStudio() {
  const { input, result, set, grade } = useRadierQuote();
  const [unlocked, setUnlocked] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => { setUnlocked(isRadierUnlocked(result)); }, [result]);

  const plan = result.plans.find((p) => p.id === 'estandar') || result.plans[1];

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-4">
      {/* Hero compacto + medidas */}
      <section className="relative isolate overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0A0F13]">
        <img src="/flow/fabrick-radier-etapa-terminado.jpeg" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover object-[68%_center] opacity-70" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(5,8,11,.96)_0%,rgba(5,8,11,.9)_42%,rgba(5,8,11,.42)_100%)]" />
        <div className="relative p-5 sm:p-7">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Calculadora de radier · resultado inmediato</p>
          <h1 className="mt-2 max-w-[18ch] text-[clamp(1.9rem,6.5vw,2.9rem)] font-black leading-[.95] tracking-[-.045em]">Tu radier calculado en 30 segundos.</h1>
          <p className="mt-2.5 max-w-xl text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
            Pon largo, ancho y espesor. Te damos los m², el hormigón, los materiales por capa y una hoja de presupuesto con guía de fabricación.
          </p>

          <div className="mt-5" role="group" aria-label="Calculadora guiada en 3 pasos">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black tabular-nums text-white/45">Paso {step} de 3</p>
              <div className="flex gap-1.5" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`h-1.5 w-8 rounded-full transition-colors ${n <= step ? 'bg-[#F6C64A]' : 'bg-white/12'}`} />
                ))}
              </div>
            </div>

            {step === 1 ? (
              <div className="mt-3">
                <p className="text-sm font-black text-white/90">¿Qué vas a construir?</p>
                <p className="mt-1 text-[11px] leading-5 text-white/45">El uso define la dosis de cemento. Después pones las medidas.</p>
                <div className="mt-3 grid gap-2">
                  {RADIER_CONCRETE_GRADES.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => { set({ gradeId: option.id }); setStep(2); }}
                      aria-pressed={input.gradeId === option.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${input.gradeId === option.id ? 'border-[#F6C64A]/60 bg-[#F6C64A]/[.07]' : 'border-white/10 bg-white/[.02] hover:border-white/25'}`}
                    >
                      <span>
                        <b className="block text-sm font-black text-white/90">{option.label}</b>
                        <small className="mt-0.5 block text-[11px] text-white/45">{option.use}</small>
                      </span>
                      <span className="shrink-0 text-[11px] font-black tabular-nums text-[#F6C64A]">{option.cementKgPerM3} kg/m³</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-3">
                <p className="text-sm font-black text-white/90">Pon tus medidas.</p>
                <p className="mt-1 text-[11px] leading-5 text-white/45">Largo y ancho exteriores en metros, espesor de losa en centímetros.</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <QuickField label="Largo" unit="m" value={input.length} onChange={(v) => set({ length: v })} />
                  <QuickField label="Ancho" unit="m" value={input.width} onChange={(v) => set({ width: v })} />
                  <QuickField label="Espesor" unit="cm" value={input.thickness} onChange={(v) => set({ thickness: v })} min={5} step={1} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {RADIER_SHAPES.map((shape) => (
                    <button key={shape.id} type="button" onClick={() => set({ shape: shape.id })} aria-pressed={input.shape === shape.id} className={`min-h-9 rounded-full border px-3.5 text-[11px] font-black transition-colors ${input.shape === shape.id ? 'border-[#F6C64A] bg-[#F6C64A] text-black' : 'border-white/12 text-white/60 hover:border-white/30'}`}>
                      {shape.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-[11px] font-black text-white/70 transition hover:border-white/30">Atrás</button>
                  <button type="button" onClick={() => setStep(3)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-5 text-[11px] font-black text-black transition hover:bg-white">
                    Ver mi resultado <ArrowRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-3">
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/40">Tu número · {grade.id.toUpperCase()} · {grade.cementKgPerM3} kg/m³</p>
                <p className="mt-1 text-[clamp(1.9rem,7vw,2.6rem)] font-black leading-none tracking-[-.05em] text-[#F6C64A] tabular-nums" aria-live="polite">
                  {(() => { const p = result.plans.find((x) => x.id === 'estandar') || result.plans[1]; return p ? CLP.format(p.total) : '—'; })()}
                </p>
                <p className="mt-1.5 text-xs tabular-nums text-white/55">{radierSummaryLine(result)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => scrollTo('presupuesto-radier')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F6C64A] px-5 text-[11px] font-black text-black transition hover:bg-white">
                    Ver mi presupuesto <ArrowRight size={14} aria-hidden />
                  </button>
                  <button type="button" onClick={() => scrollTo('guia-completa')} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-[11px] font-black text-white/80 transition hover:border-[#F6C64A]/50 hover:text-[#F6C64A]">
                    Desbloquear guía
                  </button>
                  <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-11 items-center rounded-full px-3 text-[11px] font-black text-white/50 transition hover:text-white">Cambiar medidas</button>
                </div>
              </div>
            ) : null}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-white/35">
            <Ruler size={12} aria-hidden className="text-[#F6C64A]" />
            Referencia comercial con tus medidas. La visita a terreno confirma el proyecto final.
          </p>
        </div>
      </section>

      {/* Visor 4D: parte del mismo flujo, con las mismas medidas de la URL. */}
      <RadierCalculatorPremium />

      <div id="presupuesto-radier" className="scroll-mt-24">
        <RadierBudgetSheet result={result} unlocked={unlocked} />
      </div>

      <RadierMixDecision result={result} />

      <RadierGuide result={result} locked={!unlocked} />

      {!unlocked ? (
        <RadierGuideGate result={result} onUnlock={() => setUnlocked(true)} />
      ) : (
        <div className="rounded-[1.6rem] border border-white/10 bg-[#0A0F13] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Guía desbloqueada</p>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-white/65">
            {plan ? `Tu referencia ${plan.name.toLowerCase()} es ${CLP.format(plan.total)} con IVA. ` : ''}Descarga el PDF o lleva estos números al WhatsApp y coordinamos la visita.
          </p>
          <div className="mt-4">
            <RadierShareActions result={result} unlocked={unlocked} />
          </div>
        </div>
      )}
    </div>
  );
}
