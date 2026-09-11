'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Calculator, Check, ChevronDown, Grid3X3, Home, Info, Layers3, Minus, PackageCheck, Plus, Ruler, ShieldCheck } from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { navigateWithTransition } from '@/lib/routeTransition';
import { calculateRadier, RADIER_SHAPES, type RadierPlanId, type RadierShape } from '@/lib/radierCalculator';

const RadierCinematicViewer = dynamic(() => import('@/components/store/RadierCinematicViewer'), {
  ssr: false,
  loading: () => <div className="grid h-[300px] place-items-center rounded-[1.4rem] border border-white/10 bg-[#05090c] text-[10px] font-black uppercase tracking-[.14em] text-white/38 sm:h-[430px]">Iniciando visor 4D…</div>,
});

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const MINVU_REFERENCE = 'https://www.bcn.cl/leychile/navegar?idNorma=1095820';

type Usage = 'Vivienda' | 'Terraza / patio' | 'Bodega / taller';

function Stepper({ label, value, unit, step = 1, min = .1, onChange }: { label: string; value: number; unit: string; step?: number; min?: number; onChange: (value: number) => void }) {
  const set = (next: number) => onChange(Math.max(min, Number(next.toFixed(2))));
  return <label className="rounded-xl border border-white/10 bg-white/[.025] p-3"><span className="block text-[8px] font-black uppercase tracking-[.1em] text-white/42">{label} · {unit}</span><span className="mt-2 flex items-center gap-1"><button type="button" onClick={() => set(value-step)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10"><Minus size={14}/></button><input aria-label={label} type="number" value={value} min={min} step={step} onChange={e=>set(Number(e.target.value)||min)} className="min-w-0 flex-1 bg-transparent text-center text-lg font-black outline-none"/><button type="button" onClick={() => set(value+step)} className="grid h-9 w-9 place-items-center rounded-full bg-[#F6C64A] text-black"><Plus size={14}/></button></span></label>;
}

function Metric({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-xl border p-3 ${accent ? 'border-[#F6C64A]/30 bg-[#F6C64A]/[.065]' : 'border-white/[.08] bg-[#091117]'}`}><span className={accent ? 'text-[#F6C64A]' : 'text-[#57D4FF]'}>{icon}</span><b className="mt-2 block text-sm font-black">{value}</b><small className="text-[8px] uppercase tracking-[.1em] text-white/35">{label}</small></div>;
}

export default function RadierCalculatorPremium() {
  const router = useRouter();
  const nav = (href: string) => navigateWithTransition(href, router);
  const [length, setLength] = useState(6);
  const [width, setWidth] = useState(4);
  const [thickness, setThickness] = useState(10);
  const [baseDepth, setBaseDepth] = useState(10);
  const [gravelDepth, setGravelDepth] = useState(8);
  const [shape, setShape] = useState<RadierShape>('rectangular');
  const [usage, setUsage] = useState<Usage>('Vivienda');
  const [planId, setPlanId] = useState<RadierPlanId>('estandar');

  const result = useMemo(() => calculateRadier({ length, width, thickness, baseDepth, gravelDepth, shape }), [length, width, thickness, baseDepth, gravelDepth, shape]);
  const selectedPlan = result.plans.find(plan => plan.id === planId) || result.plans[1];
  const minReference = 7;
  const thicknessState = thickness < minReference ? 'Bajo referencia MINVU' : thickness === minReference ? 'En referencia mínima' : 'Sobre referencia mínima';

  const quote = () => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem('sf-radier-quote-v1', JSON.stringify({ kind:'radier', dimensions:{length,width,thickness,baseDepth,gravelDepth,shape}, usage, planId, scope:selectedPlan.name, area:result.area, perimeter:result.perimeter, concrete:result.concrete, stakes43cm:result.stakes43cm, referenceM2:selectedPlan.referenceM2, totalReference:selectedPlan.total }));
    nav(`/presupuesto?origen=radier&plan=${planId}`);
  };

  return <div className="min-h-screen bg-[#03070A] text-white"><StorefrontHeader/><main className="pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12">
    <section className="border-b border-white/[.07] bg-[#050A0E] px-3 py-5 sm:px-6"><div className="mx-auto max-w-[1250px]"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Cubicador de radier · Chile</p><h1 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-5xl">Mide, calcula y decide.</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">Cada cambio actualiza superficie, hormigón, capas, refuerzo y referencia de costo sin obligarte a recorrer una página larga.</p></div><a href={MINVU_REFERENCE} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#F6C64A]/30 bg-[#F6C64A]/[.06] px-3 py-2 text-[9px] font-black text-[#F6C64A]"><ShieldCheck size={14}/> Referencia MINVU</a></div></div></section>

    <section className="mx-auto grid max-w-[1250px] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[1.12fr_.88fr] lg:items-start">
      <div><RadierCinematicViewer length={length} width={width} thickness={thickness} baseDepth={baseDepth} gravelDepth={gravelDepth} shape={shape} activeLayer="concrete" stakes={result.stakes43cm}/><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6"><Metric icon={<Ruler size={16}/>} label="superficie" value={`${num.format(result.area)} m²`} accent/><Metric icon={<Box size={16}/>} label="hormigón + 8%" value={`${num.format(result.concrete)} m³`}/><Metric icon={<Layers3 size={16}/>} label="base" value={`${num.format(result.stabilized)} m³`}/><Metric icon={<Layers3 size={16}/>} label="gravilla" value={`${num.format(result.gravel)} m³`}/><Metric icon={<Grid3X3 size={16}/>} label="malla aprox." value={`${integer.format(result.meshSheets)} pl.`}/><Metric icon={<Ruler size={16}/>} label="moldaje" value={`${num.format(result.formworkMeters)} m`}/></div></div>

      <div className="space-y-3">
        <details className="group rounded-[1.4rem] border border-white/10 bg-[#071017] p-4" open><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Medidas del radier</p><b className="text-sm">{num.format(length)} × {num.format(width)} m · e {num.format(thickness)} cm</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary><div className="mt-4"><div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">{RADIER_SHAPES.map(item=><button key={item.id} type="button" onClick={()=>setShape(item.id)} className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black ${shape===item.id?'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]':'border-white/10 text-white/45'}`}>{item.label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Stepper label="Largo" value={length} unit="m" step={.5} onChange={setLength}/><Stepper label="Ancho" value={width} unit="m" step={.5} onChange={setWidth}/><Stepper label="Espesor" value={thickness} unit="cm" step={1} onChange={setThickness}/><Stepper label="Base compactada" value={baseDepth} unit="cm" step={1} onChange={setBaseDepth}/><Stepper label="Gravilla" value={gravelDepth} unit="cm" step={1} onChange={setGravelDepth}/><label className="rounded-xl border border-white/10 bg-white/[.025] p-3 text-[8px] font-black uppercase tracking-[.1em] text-white/42">Uso<select value={usage} onChange={e=>setUsage(e.target.value as Usage)} className="mt-3 h-10 w-full rounded-lg bg-[#111A20] px-2 text-xs font-black normal-case text-white"><option>Vivienda</option><option>Terraza / patio</option><option>Bodega / taller</option></select></label></div></div></details>

        <div className={`rounded-[1.35rem] border p-4 ${thickness < minReference ? 'border-amber-300/30 bg-amber-300/[.06]' : 'border-[#F6C64A]/25 bg-[#F6C64A]/[.05]'}`}><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6C64A] text-black"><ShieldCheck size={20}/></span><div><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Chequeo de referencia</p><b className="mt-1 block text-sm">Espesor {num.format(thickness)} cm · {thicknessState}</b><p className="mt-1 text-[10px] leading-5 text-white/45">La referencia MINVU citada contempla radieres desde 7 cm dentro de su ámbito. El espesor definitivo depende de cargas, terreno, fundaciones y proyecto.</p></div></div></div>

        <div className="rounded-[1.35rem] border border-white/10 bg-[#071017] p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Resumen calculado</p><div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]"><span className="text-white/40">Hormigón</span><b className="text-right">{num.format(result.concrete)} m³</b><span className="text-white/40">Barrera humedad</span><b className="text-right">{num.format(result.moistureBarrierM2)} m²</b><span className="text-white/40">Malla ACMA</span><b className="text-right">{integer.format(result.meshSheets)} planchas aprox.</b><span className="text-white/40">Estacas 43 cm</span><b className="text-right">{integer.format(result.stakes43cm)} un.</b><span className="text-white/40">Perímetro/moldaje</span><b className="text-right">{num.format(result.perimeter)} m</b></div></div>
      </div>
    </section>

    <section className="mx-auto max-w-[1250px] px-3 pb-4 sm:px-6"><details className="group rounded-[1.4rem] border border-white/10 bg-[#071017] p-4"><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Materiales y criterio</p><b className="text-sm">Qué significa cada cantidad</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary><div className="mt-4 grid gap-2 sm:grid-cols-3"><InfoCard icon={<Box/>} title="Hormigón" text={`Volumen geométrico + 8% de margen operativo: ${num.format(result.concrete)} m³. Para compra final manda la especificación del hormigón y el proyecto.`}/><InfoCard icon={<Grid3X3/>} title="Malla electrosoldada" text={`${integer.format(result.meshSheets)} planchas según la cobertura usada por el calculador. Tipo y traslapos deben confirmarse por especificación.`}/><InfoCard icon={<Layers3/>} title="Base y gravilla" text={`${num.format(result.stabilized)} m³ de base + ${num.format(result.gravel)} m³ de gravilla según espesores ingresados y superficie calculada.`}/></div></details></section>

    <section className="mx-auto max-w-[1250px] px-3 pb-8 sm:px-6"><details className="group rounded-[1.4rem] border border-white/10 bg-[#071017] p-4"><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#F6C64A]">Costo referencial</p><b className="text-sm">Desde {money.format(result.plans[0].total)} · comparar alcances</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary><div className="mt-4 grid gap-2 md:grid-cols-3">{result.plans.map(plan=><button key={plan.id} type="button" onClick={()=>setPlanId(plan.id)} className={`rounded-xl border p-4 text-left ${planId===plan.id?'border-[#F6C64A] bg-[#F6C64A]/[.07]':'border-white/[.08] bg-white/[.02]'}`}><div className="flex items-center justify-between"><small className="text-[8px] font-black uppercase text-[#F6C64A]">{plan.label}</small>{planId===plan.id?<Check size={16} className="text-[#F6C64A]"/>:null}</div><b className="mt-2 block text-sm">{plan.name}</b><strong className="mt-2 block text-xl">{money.format(plan.total)}</strong><span className="text-[9px] text-white/35">≈ {money.format(plan.referenceM2)} / m² · IVA incluido</span></button>)}</div><button type="button" onClick={quote} className="mt-4 min-h-12 w-full rounded-full bg-[#F6C64A] px-5 text-xs font-black text-black">Llevar esta configuración a presupuesto</button></details></section>
  </main><StoreBottomNav/></div>;
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-[#57D4FF] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-xs">{title}</b><p className="mt-1 text-[10px] leading-5 text-white/40">{text}</p></article>;
}
