'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Box,
  Calculator,
  Check,
  ChevronRight,
  Grid3X3,
  Headphones,
  Home,
  Layers3,
  Minus,
  PackageCheck,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { navigateWithTransition } from '@/lib/routeTransition';
import {
  calculateRadier,
  RADIER_SHAPES,
  type RadierPlanId,
  type RadierShape,
} from '@/lib/radierCalculator';

const RadierCinematicViewer = dynamic(() => import('@/components/store/RadierCinematicViewer'), {
  ssr: false,
  loading: () => <div className="grid h-[390px] place-items-center rounded-[1.55rem] border border-white/10 bg-[#05090c] text-[10px] font-black uppercase tracking-[.16em] text-white/38 sm:h-[500px]">Iniciando visor 4D…</div>,
});

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const ASSETS = {
  concrete: `${CLOUD}/c_limit,w_220/f_auto/q_auto/v1788934479/hormigon-radier.png`,
  mesh: `${CLOUD}/c_limit,w_220/f_auto/q_auto/v1788934498/malla-acma.png`,
  barrier: `${CLOUD}/c_limit,w_220/f_auto/q_auto/v1788934517/barrera-humedad.png`,
  gravel: `${CLOUD}/c_limit,w_220/f_auto/q_auto/v1788934539/gravilla.png`,
  base: `${CLOUD}/c_limit,w_220/f_auto/q_auto/v1788934560/base-compactada.png`,
  soil: `${CLOUD}/c_limit,w_220/f_auto/q_auto/v1788934579/suelo-natural.png`,
  formwork: `${CLOUD}/c_limit,w_220/f_auto/q_auto/v1788934828/moldaje-madera.png`,
};

type LayerId = 'concrete' | 'mesh' | 'barrier' | 'gravel' | 'base' | 'soil';

const LAYERS: Array<{ id: LayerId; name: string; short: string; asset: string; detail: string }> = [
  { id: 'concrete', name: 'Hormigón radier', short: 'Losa de hormigón', asset: ASSETS.concrete, detail: 'Forma la superficie resistente y distribuye las cargas sobre la base preparada.' },
  { id: 'mesh', name: 'Malla ACMA', short: 'Refuerzo', asset: ASSETS.mesh, detail: 'Ayuda a controlar fisuración y entrega refuerzo dentro de la losa según la solución definida.' },
  { id: 'barrier', name: 'Barrera de humedad', short: 'Membrana', asset: ASSETS.barrier, detail: 'Separa la losa de la humedad proveniente desde las capas inferiores.' },
  { id: 'gravel', name: 'Gravilla', short: 'Drenaje y nivelación', asset: ASSETS.gravel, detail: 'Aporta drenaje, regularidad y una transición estable entre la losa y la base.' },
  { id: 'base', name: 'Base compactada', short: 'Soporte firme', asset: ASSETS.base, detail: 'Entrega soporte uniforme. Su compactación es clave para reducir asentamientos y desniveles.' },
  { id: 'soil', name: 'Suelo natural', short: 'Terreno existente', asset: ASSETS.soil, detail: 'Es el terreno de apoyo. Su condición debe revisarse en obra antes de cerrar una cotización.' },
];

function Stepper({ label, value, unit, step = 1, min = 0.1, onChange }: { label: string; value: number; unit?: string; step?: number; min?: number; onChange: (value: number) => void }) {
  const update = (next: number) => onChange(Math.max(min, Number(next.toFixed(2))));
  return (
    <label className="group block rounded-[1.05rem] border border-white/10 bg-[#071017]/80 p-3 transition focus-within:border-[#57D4FF]/45">
      <span className="mb-2 block text-[9px] font-bold uppercase tracking-[.13em] text-white/50">{label}{unit ? ` (${unit})` : ''}</span>
      <span className="flex items-center gap-2">
        <input aria-label={label} type="number" min={min} step={step} value={value} onChange={(event) => update(Number(event.target.value) || min)} className="min-w-0 flex-1 bg-transparent text-xl font-black text-white outline-none" />
        <button aria-label={`Disminuir ${label}`} type="button" onClick={() => update(value - step)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/70 transition hover:border-[#F6C64A]/40 hover:text-[#F6C64A]"><Minus className="h-4 w-4" /></button>
        <button aria-label={`Aumentar ${label}`} type="button" onClick={() => update(value + step)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.04] text-white/70 transition hover:border-[#F6C64A]/40 hover:text-[#F6C64A]"><Plus className="h-4 w-4" /></button>
      </span>
    </label>
  );
}

function Metric({ icon, label, value, yellow = false }: { icon: ReactNode; label: string; value: string; yellow?: boolean }) {
  return (
    <div className={`rounded-[1.05rem] border p-3.5 ${yellow ? 'border-[#F6C64A]/35 bg-[#F6C64A]/[.08]' : 'border-white/10 bg-white/[.025]'}`}>
      <div className={`mb-2 ${yellow ? 'text-[#F6C64A]' : 'text-[#57D4FF]'}`}>{icon}</div>
      <span className="block text-[9px] font-bold uppercase tracking-[.12em] text-white/42">{label}</span>
      <strong className="mt-1 block text-lg font-black tracking-[-.03em] text-white">{value}</strong>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-4 text-[11px] text-white/48"><span>{label}</span><b className="text-white/72">{money.format(value)}</b></div>;
}

export default function RadierCalculatorPremium() {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);
  const nav = (href: string) => navigateWithTransition(href, router);

  const [length, setLength] = useState(6);
  const [width, setWidth] = useState(4);
  const [thickness, setThickness] = useState(10);
  const [baseDepth, setBaseDepth] = useState(10);
  const [gravelDepth, setGravelDepth] = useState(5);
  const [shape, setShape] = useState<RadierShape>('rectangular');
  const [planId, setPlanId] = useState<RadierPlanId>('estandar');
  const [activeLayer, setActiveLayer] = useState<LayerId>('concrete');
  const [usage, setUsage] = useState('Vivienda');
  const [finish, setFinish] = useState('Estándar (fratasado)');

  const result = useMemo(() => calculateRadier({ length, width, thickness, baseDepth, gravelDepth, shape }), [baseDepth, gravelDepth, length, shape, thickness, width]);
  const selectedPlan = result.plans.find((plan) => plan.id === planId) || result.plans[1];
  const layer = LAYERS.find((item) => item.id === activeLayer) || LAYERS[0];

  const calculate = () => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const quote = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('sf-radier-quote-v1', JSON.stringify({
        kind: 'radier',
        dimensions: { length, width, thickness, baseDepth, gravelDepth, shape },
        usage,
        finish,
        planId,
        area: result.area,
        perimeter: result.perimeter,
        concrete: result.concrete,
        stakes43cm: result.stakes43cm,
        totalReference: selectedPlan.total,
      }));
    }
    nav(`/presupuesto?origen=radier&plan=${planId}`);
  };

  return (
    <div className="min-h-screen bg-[#03070A] text-white">
      <StorefrontHeader />
      <main className="overflow-hidden pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-16">
        <section className="relative isolate border-b border-white/[.06] bg-[#050A0E]">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_18%,rgba(246,198,74,.10),transparent_30%),radial-gradient(circle_at_20%_48%,rgba(87,212,255,.07),transparent_26%),linear-gradient(180deg,#060B0F_0%,#020507_100%)]" />
          <div className="mx-auto max-w-[1320px] px-4 pb-10 pt-7 sm:px-6 lg:px-8 lg:pb-16">
            <button type="button" onClick={() => nav('/tienda')} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[9px] font-black uppercase tracking-[.14em] text-white/62 transition hover:border-[#F6C64A]/45 hover:text-[#F6C64A]">← Volver</button>

            <div className="mt-7 grid gap-8 xl:grid-cols-[.72fr_1.28fr] xl:items-center">
              <div className="xl:py-8">
                <p className="text-[10px] font-black uppercase tracking-[.3em] text-[#F6C64A]">Bases sólidas para grandes planes</p>
                <h1 className="mt-3 max-w-[10ch] text-[clamp(3rem,8vw,6.3rem)] font-black leading-[.86] tracking-[-.07em]">Calcula tu <span className="text-[#F6C64A]">radier ideal</span></h1>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 sm:text-base">El modelo cambia en tiempo real con largo, ancho, espesor y forma. Gíralo, abre las capas y reproduce la secuencia constructiva 4D antes de cotizar.</p>
                <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                  {[['Escala dinámica', 'Medidas reales'], ['Visor 4D', 'Secuencia de capas'], ['Render PBR', 'Luz y materiales']].map(([title, text]) => <div key={title} className="rounded-xl border border-white/[.07] bg-white/[.025] px-2 py-3"><b className="block text-[10px] text-white/88">{title}</b><span className="mt-1 block text-[8px] uppercase tracking-[.1em] text-white/35">{text}</span></div>)}
                </div>
              </div>

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

            <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {LAYERS.map((item) => {
                const selected = item.id === activeLayer;
                return <button key={item.id} type="button" onClick={() => setActiveLayer(item.id)} className={`group flex min-h-[104px] items-center gap-3 rounded-[1.1rem] border p-3 text-left transition sm:block sm:text-center ${selected ? 'border-[#F6C64A] bg-[#F6C64A]/[.08] shadow-[0_0_28px_rgba(246,198,74,.12)]' : 'border-white/[.08] bg-[#081016]/80 hover:border-white/20'}`}><img src={item.asset} alt="" loading="lazy" width={82} height={82} className="h-16 w-16 shrink-0 object-contain sm:mx-auto" /><span><b className={`block text-[11px] ${selected ? 'text-[#F6C64A]' : 'text-white/82'}`}>{item.name}</b><small className="mt-1 block text-[9px] text-white/34">{item.short}</small></span></button>;
              })}
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-[1.2rem] border border-[#F6C64A]/20 bg-[#F6C64A]/[.055] p-4"><Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-[#F6C64A]" /><div><b className="text-sm">{layer.name}: cada capa cumple una función</b><p className="mt-1 text-[11px] leading-5 text-white/48">{layer.detail}</p></div></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[1.6rem] border border-white/[.08] bg-[#071017] p-4 shadow-[0_24px_80px_rgba(0,0,0,.3)] sm:p-6">
            <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6C64A] text-black"><Calculator className="h-5 w-5" /></span><div><h2 className="text-xl font-black tracking-[-.03em]">1. Ingresa las características de tu proyecto</h2><p className="mt-1 text-[11px] text-white/40">Cada cambio actualiza la geometría 3D y el cálculo de materiales en la misma fuente de datos.</p></div></div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {RADIER_SHAPES.map((item) => <button key={item.id} type="button" onClick={() => setShape(item.id)} className={`shrink-0 rounded-xl border px-4 py-3 text-[10px] font-black transition ${shape === item.id ? 'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/10 bg-white/[.025] text-white/45 hover:border-white/20'}`}>{item.label}</button>)}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <Stepper label="Largo" value={length} unit="m" step={.5} onChange={setLength} />
              <Stepper label="Ancho" value={width} unit="m" step={.5} onChange={setWidth} />
              <Stepper label="Espesor" value={thickness} unit="cm" step={1} onChange={setThickness} />
              <Stepper label="Base compactada" value={baseDepth} unit="cm" step={1} onChange={setBaseDepth} />
              <Stepper label="Gravilla" value={gravelDepth} unit="cm" step={1} onChange={setGravelDepth} />
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="rounded-[1.05rem] border border-white/10 bg-[#071017] p-3"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.13em] text-white/50">Tipo de uso</span><span className="flex items-center gap-2"><Home className="h-4 w-4 text-[#57D4FF]" /><select value={usage} onChange={(event) => setUsage(event.target.value)} className="w-full bg-transparent text-sm font-bold text-white outline-none"><option className="bg-[#071017]">Vivienda</option><option className="bg-[#071017]">Terraza / patio</option><option className="bg-[#071017]">Bodega / taller</option></select></span></label>
              <label className="rounded-[1.05rem] border border-white/10 bg-[#071017] p-3"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[.13em] text-white/50">Terminación superficial</span><span className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-[#57D4FF]" /><select value={finish} onChange={(event) => setFinish(event.target.value)} className="w-full bg-transparent text-sm font-bold text-white outline-none"><option className="bg-[#071017]">Estándar (fratasado)</option><option className="bg-[#071017]">Afinado</option><option className="bg-[#071017]">Preparado para revestir</option></select></span></label>
            </div>

            <button type="button" onClick={calculate} className="mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#F6C64A] px-6 text-sm font-black tracking-[.02em] text-[#080A0C] shadow-[0_16px_38px_rgba(246,198,74,.18)] transition hover:-translate-y-0.5 hover:bg-[#FFD95F]"><Calculator className="h-5 w-5" /> CALCULAR MATERIALES <ChevronRight className="h-5 w-5" /></button>
          </div>
        </section>

        <section ref={resultsRef} className="scroll-mt-24 mx-auto max-w-[1280px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-[1.6rem] border border-white/[.08] bg-[#061018] p-4 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Resultado del cálculo</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">2. Cantidades estimadas para tu proyecto</h2></div><span className="rounded-full border border-[#57D4FF]/25 bg-[#57D4FF]/[.06] px-3 py-2 text-[10px] font-bold text-[#57D4FF]">{num.format(result.area)} m² · {num.format(result.perimeter)} ml</span></div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Hormigón" value={`${num.format(result.concrete)} m³`} icon={<Box className="h-5 w-5" />} />
              <Metric label="Sacos cemento 25 kg" value={`${integer.format(result.cementBags25)} sacos`} icon={<PackageCheck className="h-5 w-5" />} />
              <Metric label="Gravilla" value={`${num.format(result.gravel)} m³`} icon={<Layers3 className="h-5 w-5" />} />
              <Metric label="Malla ACMA" value={`${integer.format(result.meshSheets)} plancha${result.meshSheets === 1 ? '' : 's'}`} icon={<Grid3X3 className="h-5 w-5" />} />
              <Metric label="Estacas 43 cm" value={`${integer.format(result.stakes43cm)} un.`} icon={<Ruler className="h-5 w-5" />} yellow />
              <Metric label="Moldaje" value={`${num.format(result.formworkMeters)} m`} icon={<Layers3 className="h-5 w-5" />} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3"><img src={ASSETS.barrier} alt="" width={50} height={50} className="h-12 w-12 object-contain" /><div><span className="block text-[9px] uppercase text-white/35">Barrera humedad</span><b className="text-sm">{num.format(result.moistureBarrierM2)} m² aprox.</b></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3"><img src={ASSETS.base} alt="" width={50} height={50} className="h-12 w-12 object-contain" /><div><span className="block text-[9px] uppercase text-white/35">Base compactada</span><b className="text-sm">{num.format(result.stabilized)} m³</b></div></div>
              <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-3"><img src={ASSETS.formwork} alt="" width={50} height={50} className="h-12 w-12 object-contain" /><div><span className="block text-[9px] uppercase text-white/35">Tablas + estacas</span><b className="text-sm">{num.format(result.perimeter)} m · {result.stakes43cm} estacas</b></div></div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Referencia de costo · Chile</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Tres alcances para comparar antes de cotizar</h2><p className="mt-2 max-w-2xl text-[11px] leading-5 text-white/42">Valores orientativos calculados con la referencia configurada en la herramienta. La cotización final valida terreno, comuna, despacho, disponibilidad y especificación técnica.</p></div></div>

          <div className="grid gap-3 lg:grid-cols-3">
            {result.plans.map((plan) => {
              const selected = plan.id === planId;
              return <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} className={`relative overflow-hidden rounded-[1.45rem] border p-5 text-left transition ${selected ? 'border-[#F6C64A] bg-[#F6C64A]/[.075] shadow-[0_0_36px_rgba(246,198,74,.09)]' : 'border-white/[.08] bg-[#071017] hover:border-white/20'}`}>
                <div className="flex items-start justify-between gap-3"><div><span className={`text-[9px] font-black uppercase tracking-[.18em] ${selected ? 'text-[#F6C64A]' : 'text-[#57D4FF]'}`}>{plan.label}</span><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{plan.name}</h3></div>{selected ? <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F6C64A] text-black"><Check className="h-4 w-4" /></span> : null}</div>
                <p className="mt-3 min-h-10 text-[11px] leading-5 text-white/45">{plan.description}</p>
                <div className="mt-4 border-y border-white/[.07] py-3"><span className="text-[9px] uppercase tracking-[.12em] text-white/35">Referencia total</span><strong className="mt-1 block text-3xl font-black tracking-[-.05em] text-white">{money.format(plan.total)}</strong><span className="mt-1 block text-[10px] text-[#57D4FF]">≈ {money.format(plan.referenceM2)} / m²</span></div>
                <div className="mt-4 space-y-2"><PriceLine label="Materiales" value={plan.materials} /><PriceLine label="Mano de obra" value={plan.labor} /><PriceLine label="Preparación / extras" value={plan.extras} /><PriceLine label="Transporte ref." value={plan.transport} /><PriceLine label="IVA" value={plan.tax} /></div>
                <ul className="mt-4 space-y-2">{plan.includes.slice(0, 4).map((item) => <li key={item} className="flex items-start gap-2 text-[10px] text-white/48"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F6C64A]" />{item}</li>)}</ul>
              </button>;
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[1.45rem] border border-[#F6C64A]/30 bg-[linear-gradient(90deg,rgba(246,198,74,.10),rgba(246,198,74,.025))] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><ShoppingCart className="h-7 w-7 text-[#F6C64A]" /><div><h3 className="font-black">Cotiza el alcance seleccionado</h3><p className="mt-1 text-[11px] text-white/42">{selectedPlan.name} · referencia {money.format(selectedPlan.total)}</p></div></div><button type="button" onClick={quote} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-7 text-xs font-black text-black transition hover:bg-[#FFD95F]">COTIZAR AHORA <ArrowRight className="h-4 w-4" /></button></div>
        </section>

        <section className="border-t border-white/[.06] bg-[#04080B] px-4 py-6 sm:px-6"><div className="mx-auto grid max-w-[900px] grid-cols-3 gap-3 text-center"><div><ShieldCheck className="mx-auto h-5 w-5 text-[#F6C64A]" /><b className="mt-2 block text-[10px]">Compra segura</b></div><div><Headphones className="mx-auto h-5 w-5 text-[#F6C64A]" /><b className="mt-2 block text-[10px]">Asesoría experta</b></div><div><Truck className="mx-auto h-5 w-5 text-[#F6C64A]" /><b className="mt-2 block text-[10px]">Despacho coordinado</b></div></div></section>
      </main>
      <StoreBottomNav />
    </div>
  );
}
