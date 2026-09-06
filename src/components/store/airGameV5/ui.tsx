'use client';
/* eslint-disable @next/next/no-img-element */

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Fan, Leaf, Maximize2, Move, Thermometer, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import type { Air, Mode, MoveState } from './model';
import { MODES } from './model';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-white/12 bg-[#0B0D10]/68 shadow-[0_18px_60px_rgba(0,0,0,.38)] backdrop-blur-2xl ${className}`}>{children}</div>;
}

export function Field({ label, value, set, suffix = 'm', step = 0.1 }: { label: string; value: number; set: (n: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="flex min-h-12 items-center justify-between rounded-xl border border-white/8 bg-white/[.045] px-3 transition focus-within:border-[#F3A45D]/45 focus-within:bg-white/[.06]">
      <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/45">{label}</span>
      <span className="flex items-center gap-1">
        <input className="w-16 bg-transparent text-right text-base font-black text-white outline-none" type="number" min={step} step={step} value={value} onChange={(event) => set(Math.max(step, Number(event.target.value) || step))} />
        <small className="text-[9px] text-white/35">{suffix}</small>
      </span>
    </label>
  );
}

function Stat({ title, value, color }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[.04] p-2.5">
      <small className="block text-[7px] font-black uppercase tracking-[.12em] text-white/30">{title}</small>
      <b className="mt-1 block text-[10px]" style={{ color }}>{value}</b>
    </div>
  );
}

export function Thumb({ air, compact = false }: { air: Air; compact?: boolean }) {
  if (air.image) {
    return <img src={air.image} alt={air.name} className={`mx-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,.28)] ${compact ? 'h-11 w-[96px]' : 'h-16 w-[122px]'}`} />;
  }
  return (
    <div className={`mx-auto grid place-items-center ${compact ? 'h-11 w-[96px]' : 'h-16 w-[122px]'}`}>
      <div className="relative h-8 w-24 rounded-[10px] border border-white/45 bg-gradient-to-b from-[#F4F2ED] to-[#B9BDC2] shadow-[0_9px_20px_rgba(0,0,0,.25)]">
        <div className="absolute inset-x-3 bottom-1 h-1.5 rounded-full bg-[#25292E]" />
        <div className="absolute right-3 top-2 h-1.5 w-4 rounded bg-[#85D9EF]/50" />
      </div>
    </div>
  );
}

function EfficiencyScale({ air }: { air: Air }) {
  const levels = ['A+++', 'A++', 'A+', 'A', 'B', 'C'];
  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-[7px] font-black uppercase tracking-[.12em] text-white/30"><span>Eficiencia</span><span style={{ color: air.energyColor }}>{air.energy}</span></div>
      <div className="flex gap-1">
        {levels.map((level) => <span key={level} className={`h-1.5 flex-1 rounded-full ${level === air.energy ? 'opacity-100' : 'opacity-20'}`} style={{ background: level === air.energy ? air.energyColor : '#FFFFFF' }} />)}
      </div>
    </div>
  );
}

export function ProductInfo({ air }: { air: Air }) {
  const benefit = air.inverter ? 'Ahorro progresivo, menos variaciones de temperatura y funcionamiento más estable.' : 'Entrega potencia de climatización directa para alcanzar la temperatura objetivo con rapidez.';
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="grid h-20 w-24 shrink-0 place-items-center rounded-2xl border border-white/8 bg-white/[.045]"><Thumb air={air} compact /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <small className="text-[8px] font-black uppercase tracking-[.14em] text-[#F2AE68]">{air.source === 'catalogo' ? 'Ficha de catálogo' : 'Referencia técnica'}</small>
            <span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ color: air.energyColor, background: `${air.energyColor}18` }}>{air.energy}</span>
          </div>
          <b className="mt-1 block line-clamp-2 text-sm leading-5">{air.name}</b>
          <span className="mt-1 block text-[9px] text-white/45">{air.cap.toLocaleString('es-CL')} BTU · {air.coverage} m²</span>
        </div>
      </div>
      <p className="line-clamp-3 text-[10px] leading-5 text-white/48">{air.desc}</p>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat title="Personas" value={air.people} />
        <Stat title="Tecnología" value={air.inverter ? 'Inverter' : 'Estándar'} />
        <Stat title="Potencia" value={`${Math.round(air.power * 1000)} W`} />
      </div>
      <div className="rounded-xl border border-white/7 bg-white/[.035] p-2.5 text-[9px] leading-4 text-white/45"><Zap className="mr-1 inline h-3 w-3 text-[#F2AE68]" />{benefit}</div>
      <EfficiencyScale air={air} />
      {air.features.length ? <div className="flex flex-wrap gap-1.5">{air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.04] px-2 py-1 text-[7px] text-white/42">{feature}</span>)}</div> : null}
    </div>
  );
}

export function Climate({ temp, setTemp, speed, setSpeed, mode, setMode, eco, setEco, sound, setSound, kwh, cost }: { temp: number; setTemp: (n: number) => void; speed: number; setSpeed: (n: number) => void; mode: Mode; setMode: (m: Mode) => void; eco: boolean; setEco: (b: boolean) => void; sound: boolean; setSound: (b: boolean) => void; kwh: number; cost: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F5871F]/12"><Thermometer className="h-4 w-4 text-[#F2AE68]" /></span><span><b className="block text-sm">Control de clima</b><small className="text-[8px] text-white/35">Interactivo en tiempo real</small></span></span>
        <b className="text-3xl tracking-[-.06em]">{temp}°</b>
      </div>
      <input className="w-full accent-[#F5871F]" type="range" min={16} max={28} value={temp} onChange={(event) => setTemp(Number(event.target.value))} />
      <div className="grid grid-cols-4 gap-1.5">{(Object.keys(MODES) as Mode[]).map((item) => <button type="button" key={item} onClick={() => setMode(item)} className={`rounded-xl border py-2 text-[8px] font-black transition ${mode === item ? 'border-white/22 bg-white/12 text-white' : 'border-white/6 bg-white/[.025] text-white/38'}`}>{MODES[item].label}</button>)}</div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[7px] font-black uppercase tracking-[.12em] text-white/30"><span>Velocidad del ventilador</span><span>{speed}/4</span></div>
        <div className="grid grid-cols-4 gap-1.5">{[1, 2, 3, 4].map((value) => <button type="button" key={value} onClick={() => setSpeed(value)} className={`rounded-xl border py-2 text-[9px] ${speed === value ? 'border-[#72D9FF]/35 bg-[#72D9FF]/10 text-[#72D9FF]' : 'border-white/6 text-white/35'}`}><Fan className="mr-1 inline h-3 w-3" />{value}</button>)}</div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => setEco(!eco)} className={`rounded-xl border py-2.5 text-[9px] font-black ${eco ? 'border-[#75DE9A]/32 bg-[#75DE9A]/7 text-[#75DE9A]' : 'border-white/8 text-white/38'}`}><Leaf className="mr-1 inline h-3 w-3" />Ahorro</button>
        <button type="button" onClick={() => setSound(!sound)} className={`rounded-xl border py-2.5 text-[9px] font-black ${sound ? 'border-[#F2AE68]/35 bg-[#F2AE68]/7 text-[#F2AE68]' : 'border-white/8 text-white/38'}`}>{sound ? <Volume2 className="mr-1 inline h-3 w-3" /> : <VolumeX className="mr-1 inline h-3 w-3" />}Sonido</button>
      </div>
      <div className="grid grid-cols-2 gap-1.5"><Stat title="Consumo estimado" value={`${Math.round(kwh)} kWh/mes`} /><Stat title="Costo estimado" value={CLP.format(cost)} /></div>
    </div>
  );
}

export function MovePad({ set }: { set: Dispatch<SetStateAction<MoveState>> }) {
  const button = (key: keyof MoveState, label: string, className: string) => <button type="button" onPointerDown={() => set((state) => ({ ...state, [key]: true }))} onPointerUp={() => set((state) => ({ ...state, [key]: false }))} onPointerCancel={() => set((state) => ({ ...state, [key]: false }))} className={`${className} grid place-items-center rounded-full text-lg text-white/85 transition active:bg-[#F5871F] active:text-black`}>{label}</button>;
  return (
    <div className="pointer-events-auto absolute bottom-[148px] left-3 z-40 h-[110px] w-[110px] rounded-full border border-[#F5A85B]/55 bg-[#17100B]/62 p-2 shadow-[0_12px_36px_rgba(0,0,0,.36),inset_0_0_25px_rgba(245,135,31,.08)] backdrop-blur-xl md:hidden">
      <div className="relative grid h-full w-full grid-cols-3 grid-rows-3">
        {button('forward', '↑', 'col-start-2 row-start-1')}
        {button('left', '←', 'col-start-1 row-start-2')}
        <span className="col-start-2 row-start-2 grid place-items-center"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#F5A85B]/45 bg-black/25"><Move className="h-4 w-4 text-[#F5A85B]/70" /></span></span>
        {button('right', '→', 'col-start-3 row-start-2')}
        {button('back', '↓', 'col-start-2 row-start-3')}
      </div>
    </div>
  );
}

export function MeasurePanel({ length, setLength, width, setWidth, height, setHeight, people, setPeople, recommended }: { length: number; setLength: (n: number) => void; width: number; setWidth: (n: number) => void; height: number; setHeight: (n: number) => void; people: number; setPeople: (n: number) => void; recommended: number }) {
  return (
    <>
      <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F5871F]/12"><Maximize2 className="h-4 w-4 text-[#F2AE68]" /></span><div><b className="block text-xs">Dimensiones de tu habitación</b><small className="text-[8px] text-white/35">La escena cambia mientras editas</small></div></div>
      <div className="space-y-1.5"><Field label="Largo" value={length} set={setLength} /><Field label="Ancho" value={width} set={setWidth} /><Field label="Alto" value={height} set={setHeight} /><Field label="Personas" value={people} set={setPeople} suffix="" step={1} /></div>
      <div className="mt-2.5 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-[#F3A45D]/22 bg-[#F5871F]/10 px-3 py-2.5"><span><small className="block text-[7px] font-black uppercase tracking-[.13em] text-[#F2AE68]">Capacidad recomendada</small><b className="text-sm">{recommended.toLocaleString('es-CL')} BTU</b></span><Users className="h-4 w-4 text-white/30" /></div>
    </>
  );
}
