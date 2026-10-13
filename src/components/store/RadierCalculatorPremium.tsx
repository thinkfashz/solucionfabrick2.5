'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import {
  calculateRadier,
  RADIER_SHAPES,
  type RadierShape,
} from '@/lib/radierCalculator';

const RadierCinematicViewer = dynamic(() => import('@/components/store/RadierCinematicViewer'), {
  ssr: false,
  loading: () => <div className="grid h-[390px] place-items-center rounded-[1.55rem] border border-white/10 bg-[#05090c] text-[10px] font-black uppercase tracking-[.16em] text-white/38 sm:h-[500px]">Iniciando visor 4D…</div>,
});

type LayerId = 'concrete' | 'mesh' | 'barrier' | 'gravel' | 'base' | 'soil';

const LAYERS: Array<{ id: LayerId; name: string }> = [
  { id: 'concrete', name: 'Hormigón' },
  { id: 'mesh', name: 'Malla' },
  { id: 'barrier', name: 'Barrera' },
  { id: 'gravel', name: 'Gravilla' },
  { id: 'base', name: 'Base' },
  { id: 'soil', name: 'Suelo' },
];

function Stepper({ label, value, unit, step = 1, min = 0.1, onChange }: { label: string; value: number; unit?: string; step?: number; min?: number; onChange: (value: number) => void }) {
  const update = (next: number) => onChange(Math.max(min, Number(next.toFixed(2))));
  return (
    <label className="block rounded-[1.1rem] border border-white/10 bg-[#071017]/80 p-3 transition focus-within:border-[#F6C64A]/45">
      <span className="block text-[9px] font-black uppercase tracking-[.13em] text-white/54">{label}{unit ? ` (${unit})` : ''}</span>
      <span className="mt-2 flex items-center gap-2 rounded-xl border border-white/[.07] bg-black/20 p-1.5">
        <input aria-label={label} type="number" min={min} step={step} value={value} onChange={(event) => update(Number(event.target.value) || min)} className="min-w-0 flex-1 bg-transparent px-2 text-xl font-black text-white outline-none" />
        <button aria-label={`Disminuir ${label}`} type="button" onClick={() => update(value - step)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/70 transition hover:border-[#F6C64A]/40 hover:text-[#F6C64A]"><Minus className="h-4 w-4" /></button>
        <button aria-label={`Aumentar ${label}`} type="button" onClick={() => update(value + step)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/70 transition hover:border-[#F6C64A]/40 hover:text-[#F6C64A]"><Plus className="h-4 w-4" /></button>
      </span>
    </label>
  );
}

/**
 * Visor 4D del radier con medidas esenciales. Es solo el visor: la hoja de
 * presupuesto, la guía por etapas y los precios viven en los bloques nuevos
 * de la página para no duplicar contenido. Lee las medidas iniciales de la
 * URL para partir sincronizado con la hoja.
 */
export default function RadierCalculatorPremium() {
  const router = useRouter();
  const nav = (href: string) => navigateWithTransition(href, router);
  const params = useSearchParams();
  const initial = (key: string, fallback: number) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const [length, setLength] = useState(() => initial('largo', 6));
  const [width, setWidth] = useState(() => initial('ancho', 4));
  const [thickness, setThickness] = useState(() => initial('espesor', 10));
  const [baseDepth, setBaseDepth] = useState(() => initial('base', 10));
  const [gravelDepth, setGravelDepth] = useState(() => initial('gravilla', 5));
  const [shape, setShape] = useState<RadierShape>(() => {
    const value = params.get('forma') as RadierShape | null;
    return ['rectangular', 'l', 'u', 't', 'h', 'i'].includes(value || '') ? (value as RadierShape) : 'rectangular';
  });
  const [activeLayer, setActiveLayer] = useState<LayerId>('concrete');

  const result = useMemo(() => calculateRadier({ length, width, thickness, baseDepth, gravelDepth, shape }), [baseDepth, gravelDepth, length, shape, thickness, width]);

  return (
    <div className="text-white">
      <main className="overflow-hidden pb-2">
        <section aria-labelledby="visor-title" className="mx-auto max-w-[1320px] px-3 pt-1 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Visor 4D · arrastra para girar</p>
              <h2 id="visor-title" className="mt-1 text-xl font-black tracking-[-.03em] sm:text-2xl">Tu radier en 3D, con tus medidas.</h2>
            </div>
            <p className="text-[11px] tabular-nums text-white/45" aria-live="polite">{length} × {width} m · {result.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m²</p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Stepper label="Largo" value={length} unit="m" step={.5} onChange={setLength} />
            <Stepper label="Ancho" value={width} unit="m" step={.5} onChange={setWidth} />
            <Stepper label="Espesor" value={thickness} unit="cm" step={1} onChange={setThickness} />
            <Stepper label="Base compactada" value={baseDepth} unit="cm" step={1} onChange={setBaseDepth} />
            <Stepper label="Gravilla" value={gravelDepth} unit="cm" step={1} onChange={setGravelDepth} />
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {RADIER_SHAPES.map((item) => <button key={item.id} type="button" onClick={() => setShape(item.id)} aria-pressed={shape === item.id} className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-[10px] font-black transition ${shape === item.id ? 'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/10 bg-white/[.025] text-white/45 hover:border-white/20'}`}>{item.label}</button>)}
          </div>

          <div className="mt-3">
            <RadierCinematicViewer
              length={length}
              width={width}
              thickness={thickness}
              baseDepth={baseDepth}
              gravelDepth={gravelDepth}
              shape={shape}
              activeLayer={activeLayer}
              stakes={result.stakes43cm}
            />
          </div>

          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Capa destacada en el visor">
            {LAYERS.map((item) => (
              <button key={item.id} type="button" onClick={() => setActiveLayer(item.id)} aria-pressed={activeLayer === item.id} className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-black transition ${activeLayer === item.id ? 'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white/75'}`}>
                {item.name}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => nav('/tienda')} className="mt-3 inline-flex min-h-10 items-center gap-2 text-[11px] font-black text-white/50 transition hover:text-[#F6C64A]">← Volver</button>
        </section>
      </main>
    </div>
  );
}
