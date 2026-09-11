'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { Activity, AlertTriangle, ChevronDown, Grid3X3, HardHat, Info, Layers3, Ruler, ShieldCheck } from 'lucide-react';
import { calculateMetalcon, STRUCTURE_PRESETS, type MetalconInput, type StructurePreset } from '@/lib/metalconCalculator';
import { MetalconCinematicViewer } from './MetalconCinematicViewer';
import { StoreBottomNav, StorefrontHeader } from './StorefrontChrome';

const CINTAC_MANUAL = 'https://www.cintac.cl/wp-content/uploads/2020/09/Manual-de-Disen%CC%83o-Metalcon-2020.pdf';
const INITIAL: MetalconInput = {
  widthM: 6,
  heightM: 2.4,
  spacingCm: 40,
  osbWidthCm: 122,
  preset: 'house1',
  cDepthMm: 90,
  thicknessMm: .85,
  door: { enabled: true, xM: 1, widthM: .9, heightM: 2, sillM: 0 },
  window: { enabled: true, xM: 3.7, widthM: 1.2, heightM: 1.2, sillM: .9 },
};

const fmt = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

function Field({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="text-[8px] font-black uppercase tracking-[.08em] text-white/42">{label}<input type="number" value={value} min={min} max={max} step={step} onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value) || min)))} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm font-black normal-case text-white outline-none focus:border-[#F6C64A]/50"/></label>;
}

function Metric({ icon, value, label, accent = false }: { icon: ReactNode; value: string | number; label: string; accent?: boolean }) {
  return <div className={`rounded-xl border p-3 ${accent ? 'border-[#F6C64A]/30 bg-[#F6C64A]/[.065]' : 'border-white/[.08] bg-[#091117]'}`}><span className={accent ? 'text-[#F6C64A]' : 'text-[#57D4FF]'}>{icon}</span><b className="mt-2 block text-base font-black">{value}</b><small className="text-[8px] uppercase tracking-[.1em] text-white/35">{label}</small></div>;
}

function LivePanel({ input, studs }: { input: MetalconInput; studs: number }) {
  const openingStyle = (opening: MetalconInput['door']) => ({
    left: `${Math.max(0, Math.min(100, (opening.xM / input.widthM) * 100))}%`,
    width: `${Math.max(3, Math.min(100, (opening.widthM / input.widthM) * 100))}%`,
    height: `${Math.max(4, Math.min(100, (opening.heightM / input.heightM) * 100))}%`,
    bottom: `${Math.max(0, Math.min(90, (opening.sillM / input.heightM) * 100))}%`,
  });
  const lineCount = Math.min(36, Math.max(2, studs));
  return <div className="relative h-[280px] overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,#111A20,#05090C)] sm:h-[370px]">
    <div className="absolute inset-x-[5%] bottom-[9%] top-[8%] border-y-[7px] border-[#9aa8af] bg-white/[.015]">
      {Array.from({ length: lineCount }).map((_, index) => <span key={index} className="absolute bottom-0 top-0 w-[5px] -translate-x-1/2 bg-[#b4c0c6] shadow-[0_0_0_1px_rgba(0,0,0,.25)]" style={{ left: `${lineCount === 1 ? 0 : (index / (lineCount - 1)) * 100}%` }}/>) }
      {input.door.enabled ? <div className="absolute z-10 border-[5px] border-[#F6C64A] bg-[#06090c]" style={openingStyle(input.door)}><span className="absolute inset-x-0 top-1 text-center text-[8px] font-black text-[#F6C64A]">PUERTA</span></div> : null}
      {input.window.enabled ? <div className="absolute z-10 border-[5px] border-[#57D4FF] bg-[#07141a]" style={openingStyle(input.window)}><span className="absolute inset-x-0 top-1 text-center text-[8px] font-black text-[#57D4FF]">VENTANA</span></div> : null}
    </div>
    <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-[9px] font-black text-white/70">Panel editable · {fmt.format(input.widthM)} × {fmt.format(input.heightM)} m</div>
    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[8px] font-black uppercase tracking-[.1em] text-white/35"><span>0 m</span><span>Montantes @ {input.spacingCm} cm</span><span>{fmt.format(input.widthM)} m</span></div>
  </div>;
}

function OpeningEditor({ title, opening, panelWidth, panelHeight, onChange }: { title: string; opening: MetalconInput['door']; panelWidth: number; panelHeight: number; onChange: (value: MetalconInput['door']) => void }) {
  return <details className="group rounded-xl border border-white/[.08] bg-black/20 p-3"><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><button type="button" onClick={e => { e.preventDefault(); onChange({ ...opening, enabled: !opening.enabled }); }} className={`rounded-full px-3 py-1.5 text-[9px] font-black ${opening.enabled ? 'bg-[#F6C64A] text-black' : 'bg-white/[.05] text-white/35'}`}>{opening.enabled ? 'ACTIVO' : 'OCULTO'}</button><b className="text-xs">{title}</b><ChevronDown className="h-4 w-4 text-white/35 transition group-open:rotate-180"/></summary>{opening.enabled ? <div className="mt-3 grid grid-cols-2 gap-2"><Field label="Posición izquierda (m)" value={opening.xM} min={0} max={Math.max(0, panelWidth-opening.widthM)} step={.1} onChange={xM=>onChange({...opening,xM})}/><Field label="Ancho (m)" value={opening.widthM} min={.4} max={Math.min(3,panelWidth)} step={.05} onChange={widthM=>onChange({...opening,widthM})}/><Field label="Alto (m)" value={opening.heightM} min={.4} max={panelHeight} step={.05} onChange={heightM=>onChange({...opening,heightM})}/>{title==='Puerta'?<div className="rounded-xl border border-white/[.06] p-3 text-[9px] leading-4 text-white/35">La puerta parte desde piso terminado.</div>:<Field label="Antepecho (m)" value={opening.sillM} min={0} max={Math.max(0,panelHeight-opening.heightM)} step={.05} onChange={sillM=>onChange({...opening,sillM})}/>}<label className="col-span-2 text-[8px] font-black uppercase tracking-[.08em] text-white/42">Mover {title.toLowerCase()}<input type="range" min={0} max={Math.max(0,panelWidth-opening.widthM)} step={.05} value={Math.min(opening.xM, Math.max(0,panelWidth-opening.widthM))} onChange={e=>onChange({...opening,xM:Number(e.target.value)})} className="mt-2 w-full accent-[#F6C64A]"/></label></div> : null}</details>;
}

export function MetalconCalculator() {
  const [input, setInput] = useState(INITIAL);
  const estimate = useMemo(() => calculateMetalcon(input), [input]);
  const set = <K extends keyof MetalconInput>(key: K, value: MetalconInput[K]) => setInput(current => ({ ...current, [key]: value }));
  const setPreset = (value: StructurePreset) => {
    const profile = value === 'partition' ? { cDepthMm: 60 as const, thicknessMm: .5 as const } : value === 'house1' ? { cDepthMm: 90 as const, thicknessMm: .85 as const } : value === 'house2' ? { cDepthMm: 100 as const, thicknessMm: .85 as const } : { cDepthMm: 150 as const, thicknessMm: 1.6 as const };
    setInput(current => ({ ...current, preset: value, ...profile }));
  };

  return <div className="min-h-screen bg-[#05090C] text-white"><StorefrontHeader/><main className="pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12">
    <section className="border-b border-white/[.07] px-3 py-5 sm:px-6"><div className="mx-auto max-w-[1280px]"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Editor + cubicador Metalcon</p><h1 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-5xl">Mueve, mide y ve cuánto necesitas.</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">El panel y la cubicación cambian contigo: modulación, perfiles C/U, vanos, OSB y piezas comerciales aproximadas.</p></div><a href={CINTAC_MANUAL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#F6C64A]/30 bg-[#F6C64A]/[.06] px-3 py-2 text-[9px] font-black text-[#F6C64A]"><ShieldCheck size={14}/> Fuente Cintac</a></div></div></section>

    <section className="mx-auto grid max-w-[1280px] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[1.12fr_.88fr] lg:items-start">
      <div><LivePanel input={input} studs={estimate.baseStuds}/><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6"><Metric icon={<Grid3X3 size={16}/>} value={estimate.totalStuds} label="montantes C" accent/><Metric icon={<Ruler size={16}/>} value={`${estimate.profileMeters} m`} label="perfil C"/><Metric icon={<Layers3 size={16}/>} value={`${estimate.trackMeters} m`} label="solera U"/><Metric icon={<HardHat size={16}/>} value={estimate.cPieces6m} label="barras C de 6m*"/><Metric icon={<HardHat size={16}/>} value={estimate.uPieces6m} label="barras U de 6m*"/><Metric icon={<Layers3 size={16}/>} value={estimate.osbSheets} label="OSB aprox."/></div><p className="mt-1 px-1 text-[8px] leading-4 text-white/25">*Equivalencia lineal de compra. El despiece final debe optimizar cortes, desperdicio, largos disponibles y detalles del proyecto.</p></div>

      <div className="space-y-3"><details className="group rounded-[1.4rem] border border-white/10 bg-[#0A0F13] p-4" open><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Medidas y sistema</p><b className="text-sm">{fmt.format(input.widthM)} × {fmt.format(input.heightM)} m · @ {input.spacingCm} cm</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary><div className="mt-4 space-y-3"><label className="block text-[8px] font-black uppercase tracking-[.08em] text-white/42">Uso previsto<select value={input.preset} onChange={e=>setPreset(e.target.value as StructurePreset)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black normal-case text-white"><option value="partition">Tabique interior no portante</option><option value="house1">Vivienda · 1 piso</option><option value="house2">Vivienda · 2 pisos</option><option value="large">Estructura de mayor escala</option></select></label><div className="grid grid-cols-2 gap-2"><Field label="Largo panel (m)" value={input.widthM} min={.8} max={20} step={.1} onChange={v=>set('widthM',v)}/><Field label="Alto panel (m)" value={input.heightM} min={1.8} max={5} step={.1} onChange={v=>set('heightM',v)}/></div><div className="grid grid-cols-2 gap-2"><label className="text-[8px] font-black uppercase tracking-[.08em] text-white/42">Separación montantes<select value={input.spacingCm} onChange={e=>set('spacingCm',Number(e.target.value) as 40|60)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black normal-case text-white"><option value={40}>40 cm</option><option value={60}>60 cm</option></select></label><label className="text-[8px] font-black uppercase tracking-[.08em] text-white/42">OSB ancho<select value={input.osbWidthCm} onChange={e=>set('osbWidthCm',Number(e.target.value) as 120|122)} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black normal-case text-white"><option value={120}>120 cm</option><option value={122}>122 cm</option></select></label><label className="text-[8px] font-black uppercase tracking-[.08em] text-white/42">Alma perfil C<select value={input.cDepthMm} onChange={e=>set('cDepthMm',Number(e.target.value) as MetalconInput['cDepthMm'])} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black normal-case text-white"><option value={60}>60 mm</option><option value={90}>90 mm</option><option value={100}>100 mm</option><option value={150}>150 mm</option></select></label><label className="text-[8px] font-black uppercase tracking-[.08em] text-white/42">Espesor acero<select value={input.thicknessMm} onChange={e=>set('thicknessMm',Number(e.target.value) as MetalconInput['thicknessMm'])} className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black normal-case text-white"><option value={.5}>0,50 mm</option><option value={.85}>0,85 mm</option><option value={1}>1,00 mm</option><option value={1.6}>1,60 mm</option></select></label></div><OpeningEditor title="Puerta" opening={input.door} panelWidth={input.widthM} panelHeight={input.heightM} onChange={door=>set('door',door)}/><OpeningEditor title="Ventana" opening={input.window} panelWidth={input.widthM} panelHeight={input.heightM} onChange={window=>set('window',window)}/></div></details>

        <div className="rounded-[1.35rem] border border-[#F6C64A]/25 bg-[#F6C64A]/[.05] p-4"><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Perfil seleccionado</p><b className="mt-1 block text-base">{estimate.profileReference.label} + {estimate.trackLabel}</b><div className="mt-2 grid grid-cols-2 gap-2 text-[9px]"><span className="text-white/40">Espesor elegido</span><b className="text-right">{String(input.thicknessMm).replace('.', ',')} mm</b><span className="text-white/40">Largos de referencia</span><b className="text-right">{estimate.profileReference.commonLengthsM.join(' / ')} m</b><span className="text-white/40">Peso C de ficha</span><b className="text-right">{estimate.profileReference.kgPerM == null ? 'Ver ficha exacta' : `${estimate.profileReference.kgPerM} kg/m`}</b><span className="text-white/40">Peso C calculado</span><b className="text-right">{estimate.cWeightKg == null ? 'No disponible' : `≈ ${estimate.cWeightKg} kg`}</b></div><p className="mt-2 text-[8px] leading-4 text-white/30">{estimate.profileReference.source}. La sección definitiva depende del cálculo estructural cuando el elemento sea soportante.</p></div>

        {estimate.warnings.length ? <div className="rounded-[1.2rem] border border-amber-300/20 bg-amber-300/[.05] p-3">{estimate.warnings.map(w=><p key={w} className="flex gap-2 py-1 text-[9px] leading-4 text-amber-100/75"><AlertTriangle size={12} className="mt-0.5 shrink-0"/>{w}</p>)}</div>:null}
      </div>
    </section>

    <section className="mx-auto max-w-[1280px] px-3 pb-3 sm:px-6"><details className="group rounded-[1.4rem] border border-white/10 bg-[#0A0F13] p-4"><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Tipos de perfil y beneficio</p><b className="text-sm">C = montante · U = solera · espesores según función</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary><div className="mt-4 grid gap-2 md:grid-cols-3"><InfoCard icon={<Ruler/>} title="Perfil C · montante" text="Elemento vertical atiesado. En la referencia Cintac aparecen familias de 60, 90, 100 y 150 mm, con espesores que cambian según aplicación y cálculo."/><InfoCard icon={<Layers3/>} title="Perfil U · solera" text="Canal de base y coronación que recibe los montantes. Debe ser compatible con el alma del perfil C seleccionado."/><InfoCard icon={<HardHat/>} title="Vanos y refuerzos" text="Puertas y ventanas interrumpen la modulación; por eso el cálculo agrega jambas y metros de perfil de referencia alrededor de cada vano."/></div><a href={CINTAC_MANUAL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#F6C64A]/25 px-4 py-2 text-[9px] font-black text-[#F6C64A]"><ShieldCheck size={13}/> Abrir Manual de Diseño Metalcon · Cintac</a></details></section>

    <section className="mx-auto max-w-[1280px] px-3 pb-3 sm:px-6"><details className="group rounded-[1.4rem] border border-white/10 bg-[#0A0F13] p-4"><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Visor 3D / 4D opcional</p><b className="text-sm">Gira la estructura, revisa paneles y montaje</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary><div className="mt-4"><MetalconCinematicViewer input={input}/></div></details></section>

    <section className="mx-auto max-w-[1280px] px-3 pb-8 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-white/10 bg-[#0A0F13] p-4"><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Siguiente paso</p><p className="mt-1 text-[10px] leading-4 text-white/40">Usa la cubicación como referencia y valida perfiles, uniones, anclajes y cargas antes de construir.</p></div><div className="flex flex-wrap gap-2"><Link href="/presupuesto?servicio=metalcon" className="rounded-full bg-[#F6C64A] px-4 py-2.5 text-[10px] font-black text-black">Pedir cotización</Link><Link href="/herramientas/metalcon/monitoreo" className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 px-4 py-2.5 text-[10px] font-black text-cyan-200"><Activity size={13}/> Simulación sísmica</Link></div></div></section>
  </main><StoreBottomNav/></div>;
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <article className="rounded-xl border border-white/[.07] bg-black/20 p-3"><span className="text-[#57D4FF] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-xs">{title}</b><p className="mt-1 text-[10px] leading-5 text-white/40">{text}</p></article>;
}
