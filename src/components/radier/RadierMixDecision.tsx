'use client';

import { useState } from 'react';
import { Package, Truck } from 'lucide-react';
import type { RadierQuote } from './useRadierQuote';

const NUM = (value: number, digits = 2) => value.toLocaleString('es-CL', { maximumFractionDigits: digits });

type MixChoice = 'bags' | 'truck';

/**
 * Sacos o camión: recomendación según el volumen. Los umbrales son criterio
 * práctico, no norma: bajo 3 m³ el premezclado no se justifica (los despachos
 * parten desde ese volumen) y sobre 7 m³ un camión hace el trabajo de cientos
 * de sacos. El usuario siempre puede ver ambas opciones.
 */
function recommendation(volumeM3: number): { choice: MixChoice; reason: string } {
  if (volumeM3 < 1.5) return { choice: 'bags', reason: 'Volumen pequeño: se mezcla en obra sin pagar un camión a medias.' };
  if (volumeM3 < 3) return { choice: 'bags', reason: 'Bajo el mínimo habitual de despacho premezclado (3 m³): conviene mezclar en obra.' };
  if (volumeM3 <= 7) return { choice: 'truck', reason: 'Un solo camión lo cubre. En sacos ya son muchas tandas y horas.' };
  return { choice: 'truck', reason: 'Varios camiones. Hacerlo en sacos tomaría días de mezclado.' };
}

/** Tipo de hormigón premezclado según el grado. Guía publicada por Polpaico. */
function truckGradeLabel(gradeId: string) {
  if (gradeId === 'g30') return 'G30';
  if (gradeId === 'g25') return 'G25';
  if (gradeId === 'g15') return 'G15';
  if (gradeId === 'g10') return 'G10';
  return 'G20';
}

/** Guía para elegir entre sacos de 25 kg y camión mixer, según el cimiento a fabricar. */
export default function RadierMixDecision({ result }: { result: RadierQuote }) {
  const rec = recommendation(result.concrete);
  const [choice, setChoice] = useState<MixChoice>(rec.choice);
  const truckGrade = truckGradeLabel(result.grade.id);

  const sandPerBagKg = result.cementBags25 > 0 ? (result.sand * 1500) / result.cementBags25 : 0;
  const gravelPerBagKg = result.cementBags25 > 0 ? (result.mixGravel * 1500) / result.cementBags25 : 0;

  return (
    <section aria-labelledby="mezcla-title" className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0A0F13]">
      <div className="border-b border-white/10 bg-white/[.02] px-5 py-4 sm:px-6">
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Sacos o camión</p>
        <h2 id="mezcla-title" className="mt-1.5 text-xl font-black tracking-[-.03em] sm:text-2xl">Cómo llevar el hormigón a tu radier.</h2>
        <p className="mt-1.5 max-w-xl text-xs leading-5 text-white/50">
          Para tus {NUM(result.concrete)} m³ recomendamos <b className="text-white/85">{choice === 'bags' ? 'sacos de 25 kg' : 'camión mixer'}</b>: {rec.reason}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/[.07]">
        {([
          { id: 'bags', label: 'Sacos 25 kg', Icon: Package },
          { id: 'truck', label: 'Camión mixer', Icon: Truck },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setChoice(id)}
            aria-pressed={choice === id}
            className={`flex items-center justify-center gap-2 bg-[#0A0F13] px-4 py-3.5 text-xs font-black transition ${choice === id ? 'text-[#F6C64A]' : 'text-white/45 hover:text-white/75'}`}
          >
            <Icon size={15} aria-hidden />
            {label}
            {rec.choice === id ? <span className="rounded-full bg-[#F6C64A] px-2 py-0.5 text-[9px] font-black text-black">Recomendado</span> : null}
          </button>
        ))}
      </div>

      <div className="px-5 py-5 sm:px-6">
        {choice === 'bags' ? (
          <div>
            <div className="grid grid-cols-3 gap-px border-y border-white/[.07] bg-transparent py-3">
              {[
                ['Sacos 25 kg', `${result.cementBags25}`],
                ['Tandas betonera', `${result.mixerBatches}`],
                ['Horas de mezclado', `~${result.manualMixHours} h`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[8px] font-black uppercase tracking-[.12em] text-white/35">{label}</p>
                  <p className="mt-0.5 text-lg font-black tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-white/50">
              Por cada saco, aparta aprox. <b className="text-white/80">{NUM(sandPerBagKg, 0)} kg de arena</b> y <b className="text-white/80">{NUM(gravelPerBagKg, 0)} kg de gravilla</b>. El agua sigue la ficha del saco y la consistencia que pide tu maestro.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-px border-y border-white/[.07] bg-transparent py-3">
              {[
                ['Volumen total', `${NUM(result.concrete)} m³`],
                ['Camiones 7 m³', `${result.mixerTrucks}`],
                ['Viajes aprox.', `${result.mixerTrucks}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[8px] font-black uppercase tracking-[.12em] text-white/35">{label}</p>
                  <p className="mt-0.5 text-lg font-black tabular-nums text-white">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-5 text-white/50">
              Pide hormigón <b className="text-[#F6C64A]">{truckGrade} premezclado</b> ({result.grade.use.toLowerCase()}). El premezclado se coordina con anticipación y suele partir desde 3 m³ por despacho. Ten el moldaje listo, el acceso despejado y cuadrilla para recibir.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
