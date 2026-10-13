'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { RADIER_LAB_STAGES, radierStageStats, type RadierStage } from '@/components/store/radierLabStages';
import type { RadierQuote } from './useRadierQuote';

/** Foto de referencia por etapa. Se generan con Google Flow y viven en /flow. */
const STAGE_IMAGES: Record<string, { src: string; alt: string }> = {
  layout: { src: '/flow/fabrick-radier-etapa-replanteo.jpeg', alt: 'Replanteo del perímetro con lienzas y estacas' },
  excavation: { src: '/flow/fabrick-radier-etapa-replanteo.jpeg', alt: 'Excavación superficial para la plataforma' },
  fill: { src: '/flow/fabrick-radier-etapa-base.jpeg', alt: 'Relleno y compactación de la plataforma' },
  base: { src: '/flow/fabrick-radier-etapa-base.jpeg', alt: 'Base estabilizada compactada con placa' },
  gravel: { src: '/flow/fabrick-radier-etapa-gravilla.jpeg', alt: 'Cama de gravilla bajo la barrera de humedad' },
  barrier: { src: '/flow/fabrick-radier-etapa-gravilla.jpeg', alt: 'Lámina de polietileno como barrera de humedad' },
  mesh: { src: '/flow/fabrick-radier-etapa-malla.jpeg', alt: 'Malla de acero sobre separadores dentro del moldaje' },
  formwork: { src: '/flow/fabrick-radier-etapa-malla.jpeg', alt: 'Moldaje de tablas con estacas de 43 cm' },
  concrete: { src: '/flow/fabrick-radier-etapa-hormigon.jpeg', alt: 'Hormigonado y nivelación con regla' },
  finish: { src: '/flow/fabrick-radier-etapa-terminado.jpeg', alt: 'Losa terminada con afinado a llana' },
};

/** Qué hacer en cada etapa. Procedimiento, no dimensionamiento: los números salen del cálculo. */
const STAGE_STEPS: Record<string, string[]> = {
  layout: ['Limpia y nivela visualmente el área de trabajo.', 'Marca el rectángulo con lienzas a escuadra y clava estacas en las esquinas.', 'Verifica diagonales iguales antes de excavar.'],
  excavation: ['Retira la capa vegetal y el material suelto hasta la cota de apoyo.', 'Deja los bordes parejos para que el moldaje asiente bien.', 'Retira el material excedente del área de trabajo.'],
  fill: ['Rellena por capas delgadas con material compactable.', 'Compacta cada capa con placa hasta que no marque la pisada.', 'Controla el nivel con lienzas en todo el paño.'],
  base: ['Extiende la base estabilizada en el espesor calculado.', 'Compacta y verifica que no queden zonas blandas.', 'La superficie debe quedar firme y pareja para recibir la gravilla.'],
  gravel: ['Reparte la gravilla en el espesor indicado y nivela.', 'Compacta levemente sin romper el grano.', 'Deja la cama lista para recibir la barrera continua.'],
  barrier: ['Desenrolla la lámina cubriendo todo el paño.', 'Traslapa las uniones al menos 10% y sube los bordes contra el moldaje.', 'Evita perforarla al caminar o apoyar la malla encima.'],
  mesh: ['Levanta la malla sobre separadores para que quede embebida, no apoyada en la barrera.', 'Traslapa las planchas y amarra los encuentros.', 'Revisa que no toque el moldaje en los bordes.'],
  formwork: ['Arma el cajón de tablas a la cota superior del radier.', 'Clava estacas de 43 cm cada 1,5 m por el exterior y apuntala.', 'Verifica nivel y escuadra antes de hormigonar.'],
  concrete: ['Vierte por paños avanzando siempre sobre hormigón fresco.', 'Vibra o chuza para sacar aire atrapado junto al moldaje y la malla.', 'Nivela con regla apoyada en los bordes del moldaje.'],
  finish: ['Deja fraguar hasta que la superficie sostenga la llana sin hundirse.', 'Afina con llana en pasadas parejas.', 'Protege del sol directo y del tránsito los primeros días.'],
};

function StageRow({ stage, index, open, onToggle, result }: {
  stage: RadierStage;
  index: number;
  open: boolean;
  onToggle: () => void;
  result: RadierQuote;
}) {
  const stats = radierStageStats({ result, stage, baseDepth: result.baseDepth, gravelDepth: result.gravelDepth, thickness: result.thickness });
  const image = STAGE_IMAGES[stage.layer];
  const steps = STAGE_STEPS[stage.layer] || [];

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0A0F13]">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-[11px] font-black tabular-nums text-black">{String(index + 1).padStart(2, '0')}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-sm font-black text-white/90">{stage.name}</b>
          <small className="block truncate text-[11px] text-[#F6C64A]">{stats.quantity}</small>
        </span>
        <ChevronDown size={16} aria-hidden className={`shrink-0 text-white/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-white/[.07] px-4 pb-5 pt-4 sm:px-5">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-white/[.07] bg-[#05090c]">
            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 100vw, 720px" className="object-cover" unoptimized />
          </div>
          <p className="mt-3 text-xs leading-5 text-white/55">{stage.description}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-white/[.07] py-2.5">
            {[['Superficie', stats.area], ['Espesor', stats.thickness], ['Cantidad', stats.quantity]].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[8px] font-black uppercase tracking-[.12em] text-white/35">{label}</dt>
                <dd className="mt-0.5 text-[11px] font-black tabular-nums text-white/85">{value}</dd>
              </div>
            ))}
          </dl>
          <ol className="mt-3 space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-5 text-white/55">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[8px] font-black text-[#F6C64A]">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/** Guía de fabricación etapa por etapa, con foto, cantidades y procedimiento. */
export default function RadierGuide({ result, locked }: { result: RadierQuote; locked: boolean }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const visible = locked ? RADIER_LAB_STAGES.slice(0, 3) : RADIER_LAB_STAGES;

  return (
    <section id="guia-fabricacion" aria-labelledby="guia-title" className="scroll-mt-24">
      <div className="mb-4">
        <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Guía de fabricación</p>
        <h2 id="guia-title" className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Cómo se hace, capa por capa.</h2>
        <p className="mt-2 max-w-xl text-xs leading-5 text-white/46 sm:text-sm sm:leading-6">
          Cada etapa trae su foto de referencia, la cantidad que sale de tus medidas y el procedimiento en orden.
          {locked ? ' Las primeras 3 etapas son abiertas; el resto se desbloquea con tus datos.' : ' Guía completa desbloqueada.'}
        </p>
      </div>
      <div className="grid gap-2.5">
        {visible.map((stage, index) => (
          <StageRow key={stage.layer} stage={stage} index={index} result={result} open={openIndex === index} onToggle={() => setOpenIndex((current) => (current === index ? null : index))} />
        ))}
      </div>
      {locked ? (
        <p className="mt-3 rounded-xl border border-[#F6C64A]/25 bg-[#F6C64A]/[.06] px-4 py-3 text-[11px] leading-5 text-white/60">
          Estás viendo 3 de {RADIER_LAB_STAGES.length} etapas. <a href="#guia-completa" className="font-black text-[#F6C64A]">Desbloquea la guía completa</a> con la hoja de presupuesto en PDF.
        </p>
      ) : null}
    </section>
  );
}
