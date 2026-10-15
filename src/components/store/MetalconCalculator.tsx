'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Calculator, Check, Eye, Info, Layers3, Rotate3D, ShoppingCart, Target, ZoomIn } from 'lucide-react';
import {
  calculateHousePlan,
  estimateWeightKg,
  type HousePlanInput,
  type MetalconInput,
} from '@/lib/metalconCalculator';
import { MetalconCinematicViewer } from './MetalconCinematicViewer';

const INITIAL: HousePlanInput = {
  lengthM: 8,
  depthM: 6,
  heightM: 2.5,
  spacingCm: 40,
  cDepthMm: 90,
  thicknessMm: 0.85,
  osbFormat: '244x122',
  osbThicknessMm: 12,
  interiorPartitionsM: 14,
  doors: 3,
  windows: 6,
};

const SPACING_OPTIONS = [40, 60] as const;
const DEPTH_OPTIONS = [60, 90, 100, 150] as const;
const THICKNESS_OPTIONS = [0.5, 0.85, 1, 1.6] as const;
const OSB_FORMAT_OPTIONS = ['244x120', '244x122'] as const;
const OSB_THICKNESS_OPTIONS = [9, 10, 12] as const;
const FLOOR_OPTIONS = [1, 2, 3] as const;

/**
 * Calculadora de materiales + visor 4D de la guía Metalcon.
 * El motor de cálculo vive en `@/lib/metalconCalculator` (calculateHousePlan); aquí solo se
 * presentan los resultados como lista de compra y se deriva el input del visor cinematográfico.
 */
export function MetalconCalculator() {
  const [plan, setPlan] = useState<HousePlanInput>(INITIAL);
  const estimate = useMemo(() => calculateHousePlan(plan), [plan]);
  const steelKg = useMemo(() => estimateWeightKg(estimate), [estimate]);

  const viewerInput = useMemo<MetalconInput>(() => {
    const widthM = Math.min(20, Math.max(1, plan.lengthM));
    const windowOffsetM = Math.min(Math.max(1.4, widthM * 0.5), Math.max(1.4, widthM - 2.6));
    return {
      widthM,
      heightM: Math.min(5, Math.max(1.8, plan.heightM)),
      spacingCm: plan.spacingCm,
      osbWidthCm: plan.osbFormat === '244x122' ? 122 : 120,
      preset: plan.thicknessMm === 0.5 ? 'partition' : plan.thicknessMm >= 1 ? 'house2' : 'house1',
      cDepthMm: plan.cDepthMm,
      thicknessMm: plan.thicknessMm,
      door: { enabled: plan.doors > 0, xM: 1, widthM: 0.9, heightM: 2, sillM: 0 },
      window: { enabled: plan.windows > 0, xM: windowOffsetM, widthM: 1.2, heightM: 1.2, sillM: 0.9 },
    };
  }, [plan]);

  const set = <K extends keyof HousePlanInput>(key: K, value: HousePlanInput[K]) => setPlan((current) => ({ ...current, [key]: value }));

  return (
    <>
      {/* ============ CALCULADORA ============ */}
      <section id="calculadora" className="relative overflow-hidden border-b border-white/8 px-3 py-14 sm:px-6 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,230,0,.07),transparent_42%)]" aria-hidden />
        <div className="relative mx-auto max-w-[1500px]">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.24em] text-[#FFE600]"><Calculator size={14} aria-hidden />Calculadora de materiales</p>
          <h2 className="mt-3 max-w-4xl text-[clamp(1.8rem,4vw,3.2rem)] font-black leading-[.98] tracking-[-.045em]">
            ¿Cuántos montantes necesita tu casa?
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
            Medidas comerciales reales, modulación de 40/60 cm y perfiles del sistema. Define tu vivienda y obtén la lista de compra: montantes, soleras, tableros OSB y tornillos.
          </p>

          <div className="mt-9 grid gap-5 xl:grid-cols-[minmax(0,.86fr)_minmax(0,1.14fr)]">
            {/* ---------- Entradas ---------- */}
            <div className="rounded-[1.6rem] border border-white/10 bg-[#0A0F13] p-4 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#57D4FF]">01 · Tu vivienda</p>
              <h3 className="mt-2 text-2xl font-black tracking-[-.04em]">Define la envolvente</h3>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <NumberField label="Largo fachada (m)" value={plan.lengthM} min={2} max={30} step={0.1} onChange={(v) => set('lengthM', v)} />
                <NumberField label="Fondo (m)" value={plan.depthM} min={2} max={20} step={0.1} onChange={(v) => set('depthM', v)} />
                <NumberField label="Altura de muro (m)" value={plan.heightM} min={2.2} max={3.5} step={0.1} onChange={(v) => set('heightM', v)} hint="Por defecto 2,50 m" />
              </div>

              <Segmented label="Modulación entre montantes" value={plan.spacingCm} options={SPACING_OPTIONS.map((v) => ({ value: v, label: `${v} cm` }))} onChange={(v) => set('spacingCm', v as HousePlanInput['spacingCm'])} hint="40 cm reparte más apoyos; 60 cm usa menos perfil." />
              <Segmented label="Perfil C · alma" value={plan.cDepthMm} options={DEPTH_OPTIONS.map((v) => ({ value: v, label: `${v} mm` }))} onChange={(v) => set('cDepthMm', v as HousePlanInput['cDepthMm'])} hint={`Solera compatible: ${estimate.trackLabel}`} />
              <Segmented label="Espesor del acero" value={plan.thicknessMm} options={THICKNESS_OPTIONS.map((v) => ({ value: v, label: `${v.toFixed(2).replace('.', ',')} mm` }))} onChange={(v) => set('thicknessMm', v as HousePlanInput['thicknessMm'])} hint="Tabiquería 0,5 mm · estructural 0,85–1,6 mm" />
              <Segmented label="Formato tablero OSB" value={plan.osbFormat} options={OSB_FORMAT_OPTIONS.map((v) => ({ value: v, label: v === '244x122' ? '244 × 122 cm' : '244 × 120 cm' }))} onChange={(v) => set('osbFormat', v as HousePlanInput['osbFormat'])} />
              <Segmented label="Espesor OSB" value={plan.osbThicknessMm} options={OSB_THICKNESS_OPTIONS.map((v) => ({ value: v, label: `${v} mm` }))} onChange={(v) => set('osbThicknessMm', v as HousePlanInput['osbThicknessMm'])} hint="9 mm hasta 2,5 m · 10 mm hasta 3 m · 12 mm sobre 3 m o dos pisos" />
              <Segmented label="Pisos" value={plan.floors ?? 1} options={FLOOR_OPTIONS.map((v) => ({ value: v, label: `${v} ${v === 1 ? 'piso' : 'pisos'}` }))} onChange={(v) => set('floors', v)} hint="El fabricante declara hasta 3 niveles; sobre 1 piso el proyecto exige memoria estructural." />

              <div className="mt-5 grid grid-cols-3 gap-3">
                <NumberField label="Tabiques interiores (m)" value={plan.interiorPartitionsM} min={0} max={80} step={0.5} onChange={(v) => set('interiorPartitionsM', v)} hint="Largo lineal de divisiones" />
                <NumberField label="Puertas" value={plan.doors} min={0} max={16} step={1} onChange={(v) => set('doors', v)} />
                <NumberField label="Ventanas" value={plan.windows} min={0} max={24} step={1} onChange={(v) => set('windows', v)} />
              </div>

              <p className="mt-5 flex gap-2 rounded-xl border border-[#57D4FF]/15 bg-[#57D4FF]/[.04] p-3 text-[11px] leading-5 text-white/50">
                <Info size={14} className="mt-0.5 shrink-0 text-[#57D4FF]" aria-hidden />
                La calculadora estima <b className="text-white/70">materiales de referencia</b> con las medidas comerciales del sistema. No dimensiona capacidad resistente: eso lo define la memoria de cálculo del proyecto.
              </p>
            </div>

            {/* ---------- Resultado ---------- */}
            <div className="rounded-[1.6rem] border border-[#FFE600]/25 bg-gradient-to-br from-[#121A21] via-[#0A0F13] to-[#06090C] p-4 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#FFE600]">02 · Lista de compra</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-.04em]">Tu casa en números</h3>
                </div>
                <span className="rounded-full border border-white/12 bg-white/[.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-white/55">
                  C {plan.cDepthMm} / {estimate.trackLabel} · cada {plan.spacingCm} cm · {plan.floors ?? 1} {plan.floors === 2 || plan.floors === 3 ? 'pisos' : 'piso'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Metric big value={String(estimate.studs)} label="montantes C" sub={`${estimate.studsBars} barras de 6 m · ${estimate.studsBarra6M} por barra · sobrante ${formatM(estimate.leftoverM)}`} />
                <Metric big value={formatM(estimate.trackM)} label="metros de solera U" sub={`${estimate.trackBars6M} barras de 6 m`} />
                <Metric big value={String(estimate.osbSheets)} label="tableros OSB" sub={`${plan.osbFormat.replace('x', ' × ')} cm · ${plan.osbThicknessMm} mm`} />
                <Metric value={String(estimate.screws)} label="tornillos autoperforantes" sub="fijación galvanizada del sistema" />
                <Metric value={steelKg == null ? '—' : `${steelKg} kg`} label="acero estimado" sub="peso publicado kg/m del perfil" />
                <Metric value={formatM(plan.interiorPartitionsM)} label="m de tabiquería interior" sub="división no estructural" />
              </div>

              {estimate.warnings.length > 0 ? (
                <ul className="mt-5 space-y-2 rounded-2xl border border-[#FFE600]/30 bg-[#FFE600]/[.06] p-4">
                  {estimate.warnings.map((warning) => (
                    <li key={warning} className="flex gap-2 text-[12px] leading-5 text-white/70"><AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#FFE600]" aria-hidden />{warning}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-black/25">
                <table className="w-full min-w-[560px] border-collapse">
                  <caption className="sr-only">Lista de materiales estimada para la vivienda</caption>
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[.12em] text-[#FFE600]">Código</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[.12em] text-[#FFE600]">Elemento</th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-[.12em] text-[#FFE600]">Cantidad</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[.12em] text-[#FFE600]">Unidad</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[.12em] text-[#FFE600]">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8">
                    {estimate.materials.map((material) => (
                      <tr key={material.sku}>
                        <td className="px-3 py-3 align-top text-[11px] font-black tabular-nums text-white/70">{material.sku}</td>
                        <td className="px-3 py-3 align-top text-[12px] leading-5 text-white/80">{material.label}</td>
                        <td className="px-3 py-3 align-top text-right text-[12px] font-black tabular-nums text-[#FFE600]">{material.qty}</td>
                        <td className="px-3 py-3 align-top text-[11px] text-white/50">{material.unit}</td>
                        <td className="px-3 py-3 align-top text-[11px] leading-5 text-white/40">{material.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <details className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4">
                <summary className="cursor-pointer list-none text-[11px] font-black uppercase tracking-[.12em] text-[#57D4FF]">¿Cómo se calculó? · criterios y supuestos</summary>
                <ul className="mt-3 space-y-2">
                  {estimate.notes.map((note) => (
                    <li key={note} className="flex gap-2 text-[11px] leading-5 text-white/50"><Check size={13} className="mt-0.5 shrink-0 text-[#57D4FF]" aria-hidden />{note}</li>
                  ))}
                </ul>
              </details>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link href="/presupuesto?servicio=metalcon" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#FFE600] px-6 text-[12px] font-black uppercase tracking-[.08em] text-black transition hover:bg-white">
                  <ShoppingCart size={15} aria-hidden />Enviar esta lista a cotización<ArrowRight size={14} aria-hidden />
                </Link>
                <Link href="/tienda/catalogo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-[12px] font-black uppercase tracking-[.08em] text-white/70 transition hover:border-white/40">
                  Ver catálogo
                </Link>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-white/40">
                Cantidad estimada con medidas comerciales del sistema (barras de 6 m, modulación 40/60 cm, OSB 244 × 120/122). Es una referencia para pedir presupuesto: el pedido final se confirma contra planos y memoria de cálculo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ VISOR 4D ============ */}
      <section id="visor" className="border-b border-white/8 px-3 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1500px]">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.24em] text-[#57D4FF]"><Eye size={14} aria-hidden />Visor 4D</p>
          <h2 className="mt-3 max-w-4xl text-[clamp(1.8rem,4vw,3.2rem)] font-black leading-[.98] tracking-[-.045em]">
            Mira cómo se arma, capa por capa.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">
            El visor usa las mismas medidas que definiste en la calculadora. Reproduce el montaje de la estructura, recorre las capas del muro y aísla cada panel para inspeccionarlo.
          </p>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111A21] via-[#0A0F13] to-[#05080B] p-2 sm:p-3">
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-2 sm:px-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#FFE600]/30 bg-[#FFE600]/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#FFE600]">
                <Layers3 size={13} aria-hidden />Visor 4D · armado por capas
              </span>
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-white/45">
                <li className="flex items-center gap-1.5"><Rotate3D size={13} className="text-[#57D4FF]" aria-hidden />Arrastrar: girar</li>
                <li className="flex items-center gap-1.5"><ZoomIn size={13} className="text-[#57D4FF]" aria-hidden />Pellizcar: zoom</li>
                <li className="flex items-center gap-1.5"><Target size={13} className="text-[#57D4FF]" aria-hidden />Tocar un muro: inspeccionar</li>
              </ul>
            </div>
            <MetalconCinematicViewer input={viewerInput} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/herramientas/metalcon/lab" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[#F6C64A]/35 px-5 text-[12px] font-black uppercase tracking-[.08em] text-[#F6C64A] transition hover:bg-[#F6C64A] hover:text-black">
              Abrir laboratorio constructivo 4D
            </Link>
            <Link href="/herramientas/metalcon/monitoreo" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-cyan-300/25 px-5 text-[12px] font-black uppercase tracking-[.08em] text-cyan-200 transition hover:bg-cyan-300 hover:text-black">
              Abrir simulador sísmico 4D
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function formatM(value: number) {
  return `${(Math.round(value * 10) / 10).toFixed(1).replace('.', ',')} m`;
}

function NumberField({ label, value, min, max, step, hint, onChange }: { label: string; value: number; min: number; max: number; step: number; hint?: string; onChange: (value: number) => void }) {
  return (
    <label className="block text-[11px] font-bold leading-4 text-white/50">
      {label}
      <input
        type="number"
        value={Number.isFinite(value) ? value : min}
        min={min}
        max={max}
        step={step}
        inputMode="decimal"
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 text-[15px] font-black text-white outline-none transition focus:border-[#FFE600]/50"
      />
      {hint ? <small className="mt-1 block text-[10px] font-normal leading-4 text-white/35">{hint}</small> : null}
    </label>
  );
}

function Segmented<T extends string | number>({ label, value, options, hint, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; hint?: string; onChange: (value: T) => void }) {
  return (
    <div className="mt-5">
      <p className="text-[11px] font-bold text-white/50">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl px-2 text-[12px] font-black transition ${value === option.value ? 'bg-[#FFE600] text-black' : 'border border-white/10 bg-white/[.03] text-white/55 hover:border-white/25'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {hint ? <p className="mt-1.5 text-[10px] leading-4 text-white/35">{hint}</p> : null}
    </div>
  );
}

function Metric({ value, label, sub, big }: { value: string | number; label: string; sub?: string; big?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[.04] p-4">
      <b className={`${big ? 'text-[clamp(1.6rem,4vw,2.4rem)]' : 'text-2xl'} block font-black leading-none tracking-[-.04em] text-[#FFE600] tabular-nums`}>{value}</b>
      <small className="mt-2 block text-[11px] font-black uppercase tracking-[.1em] text-white/60">{label}</small>
      {sub ? <small className="mt-1 block text-[11px] leading-4 text-white/38">{sub}</small> : null}
    </div>
  );
}
