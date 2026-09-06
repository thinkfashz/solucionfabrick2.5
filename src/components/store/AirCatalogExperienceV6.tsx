'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Calculator, Check, Home, Info, Leaf, Minus, Plus, RotateCcw, Snowflake, Thermometer, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { CAPS, buildAirOptions, clamp, type Capacity, type Mode } from './airGameV5/model';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG_MOBILE = `${CLOUD}/c_fill,g_auto,w_1080,h_1920/e_blur:9/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const BG_DESKTOP = `${CLOUD}/c_fill,g_auto,w_1920,h_1080/e_blur:8/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const AIR_VISUALS: Record<Capacity, string> = {
  9000: `${CLOUD}/q_auto:best,f_auto/v1788674134/air-9k-v7.png`,
  12000: `${CLOUD}/q_auto:best,f_auto/v1788674142/air-12k-v7.png`,
  18000: `${CLOUD}/q_auto:best,f_auto/v1788674152/air-18k-v7.png`,
  24000: `${CLOUD}/q_auto:best,f_auto/v1788674161/air-24k-v7.png`,
};
const AIR_SCALE: Record<Capacity, number> = { 9000: .72, 12000: .8, 18000: .91, 24000: 1 };
const DB_REFERENCE: Record<Capacity, number> = { 9000: 19, 12000: 21, 18000: 24, 24000: 27 };
const TARIFF_CLP_KWH = 263;

type ClimateMode = Mode | 'calor';
type RoomType = 'dormitorio' | 'living' | 'oficina' | 'cocina';

const CLIMATE_MODES: Record<ClimateMode, { label: string; color: string; factor: number }> = {
  frio: { label: 'Frío', color: '#65D7FF', factor: 1 },
  calor: { label: 'Calor', color: '#FFD166', factor: 1.06 },
  ventilacion: { label: 'Vent.', color: '#DDF6FF', factor: .30 },
  seco: { label: 'Deshum.', color: '#70E6C7', factor: .66 },
  auto: { label: 'Auto', color: '#C8B4FF', factor: .82 },
};

const ROOM_FACTORS: Record<RoomType, { label: string; factor: number }> = {
  dormitorio: { label: 'Dormitorio', factor: 1 },
  living: { label: 'Living', factor: 1.08 },
  oficina: { label: 'Oficina', factor: 1.12 },
  cocina: { label: 'Cocina', factor: 1.18 },
};

const ROOM_PRESETS: Array<{ label: string; type: RoomType; length: number; width: number; height: number; people: number }> = [
  { label: 'Dorm. S', type: 'dormitorio', length: 3.2, width: 2.8, height: 2.4, people: 1 },
  { label: 'Dorm. M', type: 'dormitorio', length: 4.2, width: 3.2, height: 2.5, people: 2 },
  { label: 'Living', type: 'living', length: 5.5, width: 4.2, height: 2.6, people: 4 },
  { label: 'Oficina', type: 'oficina', length: 6, width: 4.5, height: 2.6, people: 5 },
];

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));
}

function useAirSound(enabled: boolean, speed: number, mode: ClimateMode) {
  useEffect(() => {
    if (!enabled) return;
    const AC = window.AudioContext || ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    const low = ctx.createBiquadFilter();
    const hum = ctx.createOscillator();
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    master.gain.value = 0.009 + speed * 0.0019;
    low.type = 'lowpass';
    low.frequency.value = 560 + speed * 130;
    hum.type = 'sine';
    hum.frequency.value = 47 + speed * 4 + (mode === 'calor' ? -2 : mode === 'frio' ? 3 : 0);
    hum.detune.value = -4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.14;
    noise.buffer = buffer;
    noise.loop = true;
    noiseGain.gain.value = 0.014 + speed * 0.0032;
    hum.connect(master);
    noise.connect(low).connect(noiseGain).connect(master);
    master.connect(ctx.destination);
    hum.start();
    noise.start();
    void ctx.resume();
    return () => {
      try { hum.stop(); noise.stop(); void ctx.close(); } catch { /* noop */ }
    };
  }, [enabled, speed, mode]);
}

function Stepper({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit?: string; min: number; max: number; step: number; onChange: (n: number) => void;
}) {
  const set = (delta: number) => onChange(Number(clamp(value + delta, min, max).toFixed(1)));
  return (
    <div className="rounded-2xl border border-white/10 bg-black/24 p-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-white/48">{label}</span><strong className="text-sm font-black">{String(value).replace('.', ',')}{unit ? ` ${unit}` : ''}</strong></div>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 h-1.5 w-full cursor-pointer accent-[#F58B24]" />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={() => set(-step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[.055] active:scale-95" aria-label={`Disminuir ${label}`}><Minus className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => set(step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[.055] active:scale-95" aria-label={`Aumentar ${label}`}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export default function AirCatalogExperienceV6() {
  const router = useRouter();
  const { products, loading } = useCatalogProducts();
  const options = useMemo(() => buildAirOptions(products), [products]);

  const [length, setLength] = useState(4.2);
  const [width, setWidth] = useState(3.2);
  const [height, setHeight] = useState(2.5);
  const [people, setPeople] = useState(2);
  const [roomType, setRoomType] = useState<RoomType>('dormitorio');
  const [capacity, setCapacity] = useState<Capacity>(12000);
  const [manualSelection, setManualSelection] = useState(false);
  const [temperature, setTemperature] = useState(22);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [hoursDay, setHoursDay] = useState(4);
  const [mode, setMode] = useState<ClimateMode>('frio');
  const [eco, setEco] = useState(true);
  const [sound, setSound] = useState(false);
  const [panel, setPanel] = useState<'measure' | 'climate' | 'details' | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [slide, setSlide] = useState(0);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<number | null>(null);

  useAirSound(sound, fanSpeed, mode);

  const calc = useMemo(() => {
    const area = length * width;
    const volume = area * height;
    const heightFactor = clamp(height / 2.5, .88, 1.35);
    const peopleLoad = Math.max(0, people - 1) * 600;
    const btu = Math.ceil((area * 600 * heightFactor + peopleLoad + 900) * ROOM_FACTORS[roomType].factor);
    const recommended = (CAPS.find((candidate) => candidate >= btu) || 24000) as Capacity;
    const air = options.find((item) => item.cap === capacity) || options[0];
    const load = mode === 'calor' ? .72 : temperature <= 18 ? .82 : temperature <= 20 ? .68 : temperature <= 22 ? .56 : temperature <= 24 ? .46 : .38;
    const monthlyKwh = air.power * load * (0.86 + fanSpeed * .04) * CLIMATE_MODES[mode].factor * (eco ? .78 : 1) * hoursDay * 30;
    const cost = monthlyKwh * TARIFF_CLP_KWH;
    const db = DB_REFERENCE[air.cap] + Math.max(0, fanSpeed - 1) * 2;
    const fitRatio = clamp(air.coverage / Math.max(area, 1), .45, 2.2);
    return { area, volume, btu, recommended, air, monthlyKwh, cost, db, fitRatio };
  }, [length, width, height, people, roomType, options, capacity, temperature, fanSpeed, mode, eco, hoursDay]);

  useEffect(() => {
    if (!manualSelection) setCapacity(calc.recommended);
  }, [calc.recommended, manualSelection]);

  const moveCapacity = (direction: -1 | 1) => {
    const index = CAPS.indexOf(capacity);
    const next = CAPS[(index + direction + CAPS.length) % CAPS.length];
    setSlide(direction * 1);
    setCapacity(next);
    setManualSelection(true);
    window.setTimeout(() => setSlide(0), 280);
  };

  const applyPreset = (preset: (typeof ROOM_PRESETS)[number]) => {
    setRoomType(preset.type);
    setLength(preset.length);
    setWidth(preset.width);
    setHeight(preset.height);
    setPeople(preset.people);
    setManualSelection(false);
  };

  const reset = () => {
    setLength(4.2); setWidth(3.2); setHeight(2.5); setPeople(2); setRoomType('dormitorio');
    setTemperature(22); setFanSpeed(2); setHoursDay(4); setMode('frio'); setEco(true); setSound(false);
    setManualSelection(false); setPanel(null); setTilt({ x: 0, y: 0 });
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const box = heroRef.current?.getBoundingClientRect();
    if (!box) return;
    const nx = (event.clientX - box.left) / box.width - .5;
    const ny = (event.clientY - box.top) / box.height - .5;
    setTilt({ x: clamp(-ny * 5, -3, 3), y: clamp(nx * 7, -4, 4) });
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { pointerStart.current = event.clientX; };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start == null) return;
    const delta = event.clientX - start;
    if (Math.abs(delta) > 44) moveCapacity(delta < 0 ? 1 : -1);
  };

  const selectedImage = AIR_VISUALS[calc.air.cap];
  const ideal = calc.air.cap === calc.recommended;
  const under = calc.air.cap < calc.recommended;
  const climate = CLIMATE_MODES[mode];
  const particleColor = mode === 'calor' ? '#FFD166' : mode === 'frio' ? '#65D7FF' : climate.color;
  const particleCount = mode === 'frio' || mode === 'calor' ? 34 : 16;
  const visualScale = AIR_SCALE[calc.air.cap];

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#100b08] text-white">
      <style>{`
        button[aria-label="Abrir asistente Fabrick"]{display:none!important}
        @keyframes airFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes particleFall{0%{opacity:0;transform:translate3d(0,-10px,0) scale(.55)}15%{opacity:.9}100%{opacity:0;transform:translate3d(var(--dx),150px,0) scale(1.15)}}
        @keyframes plumePulse{0%,100%{opacity:.18;transform:scaleX(.86) scaleY(.92)}50%{opacity:.38;transform:scaleX(1.03) scaleY(1.04)}}
        @keyframes haloPulse{0%,100%{opacity:.22;transform:scale(.96)}50%{opacity:.42;transform:scale(1.03)}}
        .air-float{animation:airFloat 4.8s ease-in-out infinite}
        .air-plume{animation:plumePulse 3.4s ease-in-out infinite}
        .air-halo{animation:haloPulse 4.8s ease-in-out infinite}
      `}</style>

      <picture className="pointer-events-none fixed inset-0">
        <source media="(min-width: 900px)" srcSet={BG_DESKTOP} />
        <img src={BG_MOBILE} alt="" className="h-full w-full scale-[1.04] object-cover" />
      </picture>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(14,8,5,.40),rgba(9,7,6,.10)_38%,rgba(7,6,5,.34)_72%,rgba(7,5,4,.90))]" />
      <div className="pointer-events-none fixed inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,.42)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1580px] flex-col px-3 pb-4 pt-3 sm:px-5 sm:pt-5 lg:px-8 lg:pb-7">
        <header className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 gap-2">
            <button type="button" onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/16 bg-black/36 shadow-[0_12px_34px_rgba(0,0,0,.22)] backdrop-blur-xl active:scale-95 sm:h-12 sm:w-12"><ArrowLeft className="h-5 w-5" /></button>
            <div className="min-w-0 rounded-[1.35rem] border border-white/16 bg-black/36 px-3.5 py-2.5 shadow-[0_16px_45px_rgba(0,0,0,.20)] backdrop-blur-xl sm:min-w-[315px] sm:px-4">
              <small className="block text-[8px] font-black uppercase tracking-[.2em] text-[#F6B66B]">Catálogo 3D · Aire</small>
              <div className="mt-0.5 truncate text-sm font-black sm:text-xl">{calc.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m² · {calc.btu.toLocaleString('es-CL')} BTU</div>
              <div className="mt-0.5 hidden items-center gap-1.5 text-[9px] text-white/45 sm:flex"><Home className="h-3 w-3" /> {ROOM_FACTORS[roomType].label} · {people} personas</div>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setPanel(panel === 'measure' ? null : 'measure')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl sm:h-12 sm:w-12 ${panel === 'measure' ? 'border-[#F7A347]/70 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/16 bg-black/36 text-white/80'}`} aria-label="Calcular"><Calculator className="h-4 w-4" /></button>
            <button type="button" onClick={() => setPanel(panel === 'climate' ? null : 'climate')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl sm:h-12 sm:w-12 ${panel === 'climate' ? 'border-[#F7A347]/70 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/16 bg-black/36 text-white/80'}`} aria-label="Clima"><Thermometer className="h-4 w-4" /></button>
            <button type="button" onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-white/16 bg-black/36 text-white/80 backdrop-blur-xl active:scale-95 sm:h-12 sm:w-12" aria-label="Reiniciar"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </header>

        <section className="mt-3 grid flex-1 gap-3 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_410px]">
          <div
            ref={heroRef}
            onPointerMove={pointerMove}
            onPointerLeave={() => setTilt({ x: 0, y: 0 })}
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            className="relative min-h-[520px] touch-pan-y overflow-hidden rounded-[2rem] border border-white/10 bg-black/[.06] sm:min-h-[610px] lg:min-h-[680px]"
          >
            <div className="pointer-events-none absolute left-1/2 top-[36%] h-[280px] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F2A25D]/12 blur-[90px] air-halo" />
            <div className="pointer-events-none absolute inset-x-[8%] top-[8%] h-px bg-gradient-to-r from-transparent via-[#FFC271]/45 to-transparent" />
            <div className="pointer-events-none absolute inset-x-[12%] top-[8%] h-20 bg-gradient-to-b from-[#E69A55]/10 to-transparent blur-2xl" />

            <div className="absolute left-3 top-3 z-30 flex gap-2 sm:left-5 sm:top-5">
              <button type="button" onClick={() => setSound((v) => !v)} className="flex items-center gap-2 rounded-2xl border border-white/12 bg-black/42 px-3 py-2 text-[10px] font-bold backdrop-blur-xl">{sound ? <Volume2 className="h-4 w-4 text-[#F7B260]" /> : <VolumeX className="h-4 w-4 text-white/55" />}<span>{calc.db} dB</span></button>
              <div className="hidden items-center gap-2 rounded-2xl border border-white/12 bg-black/42 px-3 py-2 text-[10px] font-bold backdrop-blur-xl sm:flex"><Leaf className="h-4 w-4 text-[#79E28D]" /><span>{Math.round(calc.monthlyKwh)} kWh/mes</span></div>
            </div>

            <button type="button" onClick={() => moveCapacity(-1)} className="absolute left-3 top-[35%] z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/14 bg-black/38 backdrop-blur-xl transition active:scale-90 sm:left-5 sm:h-14 sm:w-14" aria-label="Equipo anterior"><ArrowLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => moveCapacity(1)} className="absolute right-3 top-[35%] z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/14 bg-black/38 backdrop-blur-xl transition active:scale-90 sm:right-5 sm:h-14 sm:w-14" aria-label="Equipo siguiente"><ArrowLeft className="h-5 w-5 rotate-180" /></button>

            <div className="absolute inset-x-0 top-[13%] z-20 flex justify-center px-14 sm:top-[12%] sm:px-20">
              <div className="relative w-full max-w-[850px]">
                <div className="pointer-events-none absolute left-1/2 top-[65%] h-[210px] w-[70%] -translate-x-1/2 rounded-[50%] blur-2xl air-plume" style={{ background: `radial-gradient(ellipse at 50% 0%, ${particleColor}50 0%, ${particleColor}20 38%, transparent 74%)` }} />
                <div className="pointer-events-none absolute left-[18%] right-[18%] top-[61%] h-[190px] overflow-hidden">
                  {Array.from({ length: particleCount }).map((_, i) => {
                    const left = 4 + ((i * 37) % 92);
                    const size = 2 + (i % 4);
                    const duration = 1.7 + (i % 6) * .13;
                    const delay = -((i % 9) * .19);
                    const dx = `${((i * 23) % 60) - 30}px`;
                    return <i key={i} className="absolute top-0 rounded-full opacity-0" style={{ left: `${left}%`, width: size, height: size, background: particleColor, boxShadow: `0 0 ${5 + size * 2}px ${particleColor}`, animation: `particleFall ${duration}s linear ${delay}s infinite`, ['--dx' as string]: dx }} />;
                  })}
                </div>
                <div className="air-float transition-all duration-300 ease-out" style={{ transform: `translateX(${slide * -26}px) perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, opacity: slide ? .72 : 1 }}>
                  <img src={selectedImage} alt={`${calc.air.name} ${calc.air.cap} BTU`} draggable={false} className="mx-auto block h-auto max-w-[780px] select-none object-contain drop-shadow-[0_30px_32px_rgba(0,0,0,.38)] transition-[width] duration-500 ease-out" style={{ width: `${Math.round(visualScale * 100)}%` }} />
                </div>
                <div className="mt-1 flex justify-center gap-2 sm:mt-3">
                  {CAPS.map((cap) => <button key={cap} type="button" onClick={() => { setCapacity(cap); setManualSelection(true); }} className={`rounded-full border px-2.5 py-1 text-[9px] font-black transition sm:px-3 sm:py-1.5 sm:text-[10px] ${cap === capacity ? 'border-[#F59A3B]/75 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/10 bg-black/24 text-white/42'}`}>{cap / 1000}K</button>)}
                </div>
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-3 z-30 rounded-[1.55rem] border border-white/14 bg-black/46 p-4 shadow-[0_22px_70px_rgba(0,0,0,.22)] backdrop-blur-2xl sm:inset-x-5 sm:bottom-5 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F3A75C]">{calc.air.source === 'catalogo' ? 'Ficha sincronizada' : 'Referencia visual'} · {calc.air.cap.toLocaleString('es-CL')} BTU</p>
                  <h1 className="mt-1 truncate text-lg font-black sm:text-2xl">{calc.air.name}</h1>
                  <p className="mt-1 text-[10px] text-white/42">~{Math.round(calc.air.width * 100)} cm de ancho · {calc.air.inverter ? 'Inverter' : 'Estándar'}</p>
                </div>
                <div className="text-right"><span className="inline-flex rounded-xl px-3 py-2 text-sm font-black" style={{ background: `${calc.air.energyColor}22`, color: calc.air.energyColor }}>{calc.air.energy}</span><p className="mt-1 text-[8px] text-white/30">eficiencia</p></div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                <div className="rounded-xl bg-white/[.045] p-2"><Home className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">{calc.air.coverage} m²</b><span className="text-[7px] text-white/32">cobertura</span></div>
                <div className="rounded-xl bg-white/[.045] p-2"><Users className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block truncate text-[11px] sm:text-xs">{calc.air.people.replace(' personas', '')}</b><span className="text-[7px] text-white/32">personas</span></div>
                <div className="rounded-xl bg-white/[.045] p-2"><Zap className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">{currency(calc.cost)}</b><span className="text-[7px] text-white/32">mes aprox.</span></div>
                <div className="rounded-xl bg-white/[.045] p-2"><Volume2 className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">~{calc.db} dB</b><span className="text-[7px] text-white/32">ruido</span></div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0 text-[9px] text-white/42">{ideal ? <span className="text-[#86E99A]">Ideal para este espacio</span> : under ? <span className="text-[#FFBE72]">Capacidad menor a la recomendada</span> : <span className="text-white/50">Capacidad superior a la recomendada</span>}</div>
                {!ideal ? <button type="button" onClick={() => { setCapacity(calc.recommended); setManualSelection(false); }} className="shrink-0 rounded-full border border-[#F59A3B]/35 bg-[#F5871F]/12 px-3 py-1.5 text-[9px] font-black text-[#FFC27A]">Usar {calc.recommended / 1000}K</button> : <Check className="h-4 w-4 shrink-0 text-[#86E99A]" />}
              </div>
            </div>
          </div>

          <aside className="grid content-start gap-3">
            <div className="rounded-[1.75rem] border border-white/14 bg-black/42 p-4 shadow-[0_24px_70px_rgba(0,0,0,.20)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Calculadora de espacio</p><h2 className="mt-1 text-xl font-black">Tu habitación</h2></div><span className="rounded-full bg-white/7 px-3 py-1 text-[9px] text-white/45">{calc.area.toFixed(1)} m²</span></div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">{ROOM_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className={`rounded-xl border px-2 py-2 text-[8px] font-bold ${roomType === preset.type && Math.abs(length - preset.length) < .05 ? 'border-[#F59A3B]/55 bg-[#F5871F]/14 text-[#FFC27A]' : 'border-white/8 bg-white/[.035] text-white/45'}`}>{preset.label}</button>)}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={.1} onChange={setLength} />
                <Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={.1} onChange={setWidth} />
                <Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={.1} onChange={setHeight} />
                <Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(n) => setPeople(Math.round(n))} />
              </div>
              <div className="mt-3 rounded-2xl border border-[#F59A3B]/20 bg-[#4A2712]/24 p-3"><div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-[.13em] text-white/38">Recomendación</span><b className="text-sm text-[#FFC27A]">{calc.recommended.toLocaleString('es-CL')} BTU</b></div><p className="mt-1 text-[9px] text-white/38">{ROOM_FACTORS[roomType].label} · {people} pers. · {calc.volume.toFixed(1)} m³</p></div>
            </div>

            <div className="rounded-[1.75rem] border border-white/14 bg-black/42 p-4 shadow-[0_24px_70px_rgba(0,0,0,.20)] backdrop-blur-2xl">
              <div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Control climático</p><h2 className="mt-1 text-lg font-black">{temperature}°C · Vent. {fanSpeed}/4</h2></div><button type="button" onClick={() => setSound((v) => !v)} className="grid h-9 w-9 place-items-center rounded-full bg-white/7">{sound ? <Volume2 className="h-4 w-4 text-[#FFC27A]" /> : <VolumeX className="h-4 w-4 text-white/45" />}</button></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{(Object.keys(CLIMATE_MODES) as ClimateMode[]).map((key) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${mode === key ? 'border-white/28 bg-white/12' : 'border-white/8 bg-white/[.035] text-white/42'}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CLIMATE_MODES[key].color, boxShadow: `0 0 8px ${CLIMATE_MODES[key].color}` }} />{CLIMATE_MODES[key].label}</button>)}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stepper label="Temperatura" value={temperature} unit="°C" min={16} max={30} step={1} onChange={(n) => setTemperature(Math.round(n))} />
                <Stepper label="Horas/día" value={hoursDay} unit="h" min={1} max={12} step={1} onChange={(n) => setHoursDay(Math.round(n))} />
              </div>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => setFanSpeed((v) => v >= 4 ? 1 : v + 1)} className="flex-1 rounded-xl border border-white/8 bg-white/[.04] py-2 text-[9px] font-bold">Velocidad {fanSpeed}/4</button><button type="button" onClick={() => setEco((v) => !v)} className={`flex-1 rounded-xl py-2 text-[9px] font-bold ${eco ? 'bg-[#1F6D36]/70 text-[#B8F7C5]' : 'border border-white/8 bg-white/[.04] text-white/42'}`}>Eco {eco ? 'ON' : 'OFF'}</button></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/[.04] p-3"><Leaf className="h-4 w-4 text-[#79E28D]" /><b className="mt-1 block text-sm">{Math.round(calc.monthlyKwh)} kWh</b><span className="text-[8px] text-white/32">consumo mensual</span></div><div className="rounded-xl bg-white/[.04] p-3"><Zap className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{currency(calc.cost)}</b><span className="text-[8px] text-white/32">costo aproximado</span></div></div>
            </div>

            <div className="rounded-[1.75rem] border border-white/14 bg-black/42 p-4 shadow-[0_24px_70px_rgba(0,0,0,.20)] backdrop-blur-2xl">
              <div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Equipo seleccionado</p><h2 className="mt-1 truncate text-lg font-black">{calc.air.name}</h2></div><button type="button" onClick={() => setPanel(panel === 'details' ? null : 'details')} className="grid h-9 w-9 place-items-center rounded-full bg-white/7 text-white/60"><Info className="h-4 w-4" /></button></div>
              <p className="mt-2 line-clamp-3 text-[10px] leading-5 text-white/42">{calc.air.desc}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{calc.air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1.5 text-[8px] text-white/52">{feature}</span>)}</div>
            </div>
          </aside>
        </section>

        {panel === 'measure' ? <section className="mt-3 rounded-[1.7rem] border border-white/14 bg-black/58 p-4 backdrop-blur-2xl lg:hidden"><div className="grid grid-cols-2 gap-2"><Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={.1} onChange={setLength} /><Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={.1} onChange={setWidth} /><Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={.1} onChange={setHeight} /><Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(n) => setPeople(Math.round(n))} /></div></section> : null}

        {panel === 'climate' ? <section className="mt-3 rounded-[1.7rem] border border-white/14 bg-black/58 p-4 backdrop-blur-2xl lg:hidden"><div className="flex flex-wrap gap-2">{(Object.keys(CLIMATE_MODES) as ClimateMode[]).map((key) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${mode === key ? 'border-white/28 bg-white/12' : 'border-white/8 bg-white/[.035] text-white/42'}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CLIMATE_MODES[key].color }} />{CLIMATE_MODES[key].label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Stepper label="Temperatura" value={temperature} unit="°C" min={16} max={30} step={1} onChange={(n) => setTemperature(Math.round(n))} /><Stepper label="Horas/día" value={hoursDay} unit="h" min={1} max={12} step={1} onChange={(n) => setHoursDay(Math.round(n))} /></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => setFanSpeed((v) => v >= 4 ? 1 : v + 1)} className="flex-1 rounded-xl border border-white/8 bg-white/[.04] py-2 text-[9px]">Vent. {fanSpeed}/4</button><button type="button" onClick={() => setEco((v) => !v)} className={`flex-1 rounded-xl py-2 text-[9px] ${eco ? 'bg-[#1F6D36]/70 text-[#B8F7C5]' : 'border border-white/8 bg-white/[.04] text-white/42'}`}>Eco {eco ? 'ON' : 'OFF'}</button></div></section> : null}

        {panel === 'details' ? <section className="mt-3 rounded-[1.7rem] border border-white/14 bg-black/58 p-4 backdrop-blur-2xl"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Detalle completo</p><h3 className="mt-1 text-lg font-black">{calc.air.name}</h3><p className="mt-2 max-w-4xl text-xs leading-6 text-white/48">{calc.air.desc}</p><div className="mt-3 flex flex-wrap gap-2">{calc.air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.035] px-3 py-1.5 text-[9px] text-white/55">{feature}</span>)}</div></section> : null}

        <section className="mt-3 rounded-[1.55rem] border border-white/12 bg-black/42 px-3 py-2.5 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.17em] text-white/45">{loading ? 'Sincronizando catálogo…' : 'Desliza o usa las flechas para cambiar equipo'}</p><p className="mt-0.5 truncate text-[8px] text-white/25">Cloudinary · 9K / 12K / 18K / 24K · visuales dedicados</p></div><div className="flex shrink-0 gap-1.5">{CAPS.map((cap) => <button key={cap} type="button" onClick={() => { setCapacity(cap); setManualSelection(true); }} className={`h-2.5 rounded-full transition-all ${cap === capacity ? 'w-7 bg-[#F58B24]' : 'w-2.5 bg-white/20'}`} aria-label={`${cap.toLocaleString('es-CL')} BTU`} />)}</div></div>
        </section>

        <p className="mt-2 px-2 text-center text-[8px] leading-4 text-white/25">BTU, consumo, costo y ruido son estimaciones de apoyo cuando la ficha del fabricante no declara esos datos. Verifica certificación SEC y ficha técnica del modelo antes de comprar.</p>
      </div>
    </main>
  );
}
