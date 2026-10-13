'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Lock, Pause, Play } from 'lucide-react';
import { RADIER_LAB_STAGES, radierStageStats } from '@/components/store/radierLabStages';
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

const AUTOPLAY_MS = 6000;

/**
 * Guía como presentación cinematográfica: imagen grande, detalles por etapa,
 * avance automático, teclado y filmstrip. Las etapas 4+ se muestran bloqueadas
 * hasta desbloquear con la puerta.
 */
export default function RadierGuide({ result, locked }: { result: RadierQuote; locked: boolean }) {
  const stages = RADIER_LAB_STAGES;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    setIndex(((next % stages.length) + stages.length) % stages.length);
  }, [stages.length]);

  useEffect(() => {
    if (!playing) {
      if (timer.current) window.clearInterval(timer.current);
      return;
    }
    timer.current = window.setInterval(() => {
      setIndex((current) => (current + 1) % stages.length);
    }, AUTOPLAY_MS);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [playing, stages.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') go(index + 1);
      if (event.key === 'ArrowLeft') go(index - 1);
      if (event.key === ' ') { event.preventDefault(); setPlaying((v) => !v); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, go]);

  const stage = stages[index];
  const isLocked = locked && index >= 3;
  const stats = radierStageStats({ result, stage, baseDepth: result.baseDepth, gravelDepth: result.gravelDepth, thickness: result.thickness });
  const image = STAGE_IMAGES[stage.layer];
  const steps = STAGE_STEPS[stage.layer] || [];

  return (
    <section id="guia-fabricacion" aria-labelledby="guia-title" className="scroll-mt-24 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0A0F13]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[.02] px-5 py-3.5 sm:px-6">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Guía de fabricación · presentación</p>
          <h2 id="guia-title" className="mt-1 text-lg font-black tracking-[-.03em] sm:text-xl">Cómo se hace, capa por capa.</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-[11px] font-black tabular-nums text-white/40">{String(index + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}</span>
          <button type="button" onClick={() => go(index - 1)} aria-label="Etapa anterior" className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/30 hover:text-white">
            <ChevronLeft size={16} aria-hidden />
          </button>
          <button type="button" onClick={() => setPlaying((v) => !v)} aria-label={playing ? 'Pausar presentación' : 'Reproducir presentación'} aria-pressed={playing} className="grid h-10 w-10 place-items-center rounded-full bg-[#F6C64A] text-black transition hover:bg-white">
            {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden className="ml-0.5" />}
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Etapa siguiente" className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-white/70 transition hover:border-white/30 hover:text-white">
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative aspect-[16/9] bg-[#05090c]">
        {isLocked ? (
          <div className="absolute inset-0 grid place-items-center bg-white/[.02] p-6 text-center">
            <div>
              <Lock size={22} aria-hidden className="mx-auto text-[#F6C64A]" />
              <p className="mt-2 text-sm font-black">Etapa {String(index + 1).padStart(2, '0')} bloqueada</p>
              <p className="mx-auto mt-1 max-w-xs text-[11px] leading-5 text-white/50">Las primeras 3 etapas son abiertas. Desbloquea la guía completa con tus datos.</p>
              <a href="#guia-completa" className="mt-3 inline-flex min-h-10 items-center rounded-full bg-[#F6C64A] px-5 text-[11px] font-black text-black">Desbloquear guía</a>
            </div>
          </div>
        ) : (
          <Image key={stage.layer} src={image.src} alt={image.alt} fill sizes="(max-width: 767px) 100vw, 880px" className="object-cover" unoptimized />
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-white/10">
          <div className="h-full bg-[#F6C64A] transition-[width] duration-300" style={{ width: `${((index + 1) / stages.length) * 100}%` }} />
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {!isLocked ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <h3 className="text-base font-black tracking-[-.02em]">{stage.name}</h3>
              <p className="text-[11px] font-black tabular-nums text-[#F6C64A]">{stats.quantity}</p>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-white/55">{stage.description}</p>
            <ol className="mt-2.5 space-y-1">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-[11px] leading-5 text-white/55">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[8px] font-black text-[#F6C64A]">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="text-xs leading-5 text-white/45">{stage.description}</p>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-4 py-3 [scrollbar-width:none]" role="tablist" aria-label="Etapas">
        {stages.map((s, i) => {
          const lockedStage = locked && i >= 3;
          return (
            <button
              key={s.layer}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ir a etapa ${i + 1}: ${s.name}${lockedStage ? ' (bloqueada)' : ''}`}
              onClick={() => { setPlaying(false); go(i); }}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px] font-black transition ${i === index ? 'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/10 text-white/45 hover:border-white/25'}`}
            >
              {lockedStage ? <Lock size={11} aria-hidden /> : null}
              {String(i + 1).padStart(2, '0')}
            </button>
          );
        })}
      </div>
    </section>
  );
}
