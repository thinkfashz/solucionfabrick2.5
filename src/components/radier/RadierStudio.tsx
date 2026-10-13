'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Ruler } from 'lucide-react';
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
  return (
    <label className="grid gap-1 border-b border-white/10 pb-2.5">
      <span className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">{label} <span className="text-white/25">({unit})</span></span>
      <input
        type="number" inputMode="decimal" min={min} step={step} value={value}
        onChange={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v > 0) onChange(v); }}
        className="w-full bg-transparent text-2xl font-black tabular-nums text-white outline-none"
      />
    </label>
  );
}

/**
 * Experiencia completa del radier: medidas rápidas, hoja de presupuesto, guía por
 * etapas y puerta a la guía completa. Las medidas viven en la URL para que el
 * presupuesto sea compartible. El calculador 4D conserva su propio estado.
 */
export default function RadierStudio() {
  const { input, result, set, grade, bagsPerM3 } = useRadierQuote();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => { setUnlocked(isRadierUnlocked(result)); }, [result]);

  const plan = result.plans.find((p) => p.id === 'estandar') || result.plans[1];

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-4">
      {/* Hero compacto + medidas */}
      <section className="relative isolate overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0A0F13]">
        <img src="/flow/fabrick-radier-portada.jpeg" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-45" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgba(10,15,19,.97)_0%,rgba(10,15,19,.9)_45%,rgba(10,15,19,.45)_100%)]" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_80%_0%,rgba(246,198,74,.12),transparent_55%),radial-gradient(100%_80%_at_10%_100%,rgba(246,198,74,.06),transparent_50%)]" />
        <div className="relative p-5 sm:p-7">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Calculadora de radier · resultado inmediato</p>
          <h1 className="mt-2 max-w-[18ch] text-[clamp(1.9rem,6.5vw,2.9rem)] font-black leading-[.95] tracking-[-.045em]">Tu radier calculado en 30 segundos.</h1>
          <p className="mt-2.5 max-w-xl text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
            Pon largo, ancho y espesor. Te damos los m², el hormigón, los materiales por capa y una hoja de presupuesto con guía de fabricación.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
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

          <div className="mt-3">
            <p className="text-[9px] font-black uppercase tracking-[.14em] text-white/40">Qué vas a construir <span className="text-white/25">(define la dosis)</span></p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {RADIER_CONCRETE_GRADES.map((option) => (
                <button key={option.id} type="button" onClick={() => set({ gradeId: option.id })} aria-pressed={input.gradeId === option.id} title={option.use} className={`min-h-9 rounded-full border px-3.5 text-[11px] font-black transition-colors ${input.gradeId === option.id ? 'border-[#F6C64A] bg-[#F6C64A] text-black' : 'border-white/12 text-white/60 hover:border-white/30'}`}>
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] leading-4 text-white/40">
              {grade.use} · <b className="text-white/60">{grade.cementKgPerM3} kg/m³</b> ({bagsPerM3.toLocaleString('es-CL', { maximumFractionDigits: 1 })} sacos/m³). Dosis referencial de práctica en obra.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-white/40">Tu radier</p>
              <p className="mt-1 text-base font-black tabular-nums text-white sm:text-lg" aria-live="polite">{radierSummaryLine(result)}</p>
            </div>
            <button type="button" onClick={() => scrollTo('presupuesto-radier')} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F6C64A] px-5 text-[11px] font-black text-black transition hover:bg-white sm:ml-auto">
              Ver mi presupuesto <ArrowRight size={14} aria-hidden />
            </button>
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
