'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Calculator, Check, Home, Info, Leaf, Minus, Plus, RotateCcw, Thermometer, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { CAPS, buildAirOptions, clamp, type Capacity, type Mode } from './airGameV5/model';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG_MOBILE = `${CLOUD}/c_fill,g_auto,w_1080,h_1920/e_blur:8/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const BG_DESKTOP = `${CLOUD}/c_fill,g_auto,w_1920,h_1080/e_blur:7/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const AIR_VISUALS: Record<Capacity, string> = {
  9000: `${CLOUD}/q_auto:best,f_auto/v1788674158/air-9k-premium.png`,
  12000: `${CLOUD}/q_auto:best,f_auto/v1788674338/air-12k-premium.png`,
  18000: `${CLOUD}/q_auto:best,f_auto/v1788674459/air-18k-premium.png`,
  24000: `${CLOUD}/q_auto:best,f_auto/v1788674493/air-24k-premium.png`,
};
const AIRFLOW_COLD = `${CLOUD}/q_auto:eco,f_auto/v1788674591/airflow-cold-microparticles.png`;
const AIRFLOW_WARM = `${CLOUD}/q_auto:eco,f_auto/v1788674724/airflow-warm-microparticles.png`;
const DB_REFERENCE: Record<Capacity, number> = { 9000: 19, 12000: 21, 18000: 24, 24000: 27 };
const TARIFF_CLP_KWH = 263;

type ClimateMode = Mode | 'calor';
type RoomType = 'dormitorio' | 'living' | 'oficina' | 'cocina';
type Preset = { label: string; type: RoomType; length: number; width: number; height: number; people: number };

const CLIMATE_MODES: Record<ClimateMode, { label: string; color: string; factor: number }> = {
  frio: { label: 'Frío', color: '#66D8FF', factor: 1 },
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

const ROOM_PRESETS: Preset[] = [
  { label: 'Dorm. S', type: 'dormitorio', length: 3.2, width: 2.8, height: 2.4, people: 1 },
  { label: 'Dorm. M', type: 'dormitorio', length: 4.2, width: 3.2, height: 2.5, people: 2 },
  { label: 'Living', type: 'living', length: 5.5, width: 4.2, height: 2.6, people: 4 },
  { label: 'Oficina', type: 'oficina', length: 6, width: 4.5, height: 2.6, people: 5 },
  { label: 'Cocina', type: 'cocina', length: 4.5, width: 3.6, height: 2.6, people: 3 },
];

function currency(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value)));
}

function useAirSound(enabled: boolean, speed: number, mode: ClimateMode) {
  useEffect(() => {
    if (!enabled) return;
    const AudioContextCtor = window.AudioContext || ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const master = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    const hum = ctx.createOscillator();
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    master.gain.value = 0.007 + speed * 0.0015;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 520 + speed * 130;
    hum.type = 'sine';
    hum.frequency.value = 46 + speed * 4 + (mode === 'calor' ? -2 : mode === 'frio' ? 3 : 0);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * .12;
    noise.buffer = buffer;
    noise.loop = true;
    noiseGain.gain.value = .010 + speed * .0026;
    hum.connect(master);
    noise.connect(lowpass).connect(noiseGain).connect(master);
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
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const change = (delta: number) => onChange(Number(clamp(value + delta, min, max).toFixed(1)));
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-white/48">{label}</span>
        <strong className="text-sm font-black">{String(value).replace('.', ',')}{unit ? ` ${unit}` : ''}</strong>
      </div>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-1.5 w-full cursor-pointer accent-[#F58B24]" />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={() => change(-step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[.055] active:scale-95" aria-label={`Disminuir ${label}`}><Minus className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => change(step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[.055] active:scale-95" aria-label={`Aumentar ${label}`}><Plus className="h-3.5 w-3.5" /></button>
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
    const monthlyKwh = air.power * load * (.86 + fanSpeed * .04) * CLIMATE_MODES[mode].factor * (eco ? .78 : 1) * hoursDay * 30;
    const cost = monthlyKwh * TARIFF_CLP_KWH;
    const db = DB_REFERENCE[air.cap] + Math.max(0, fanSpeed - 1) * 2;
    return { area, volume, btu, recommended, air, monthlyKwh, cost, db };
  }, [length, width, height, people, roomType, options, capacity, temperature, fanSpeed, mode, eco, hoursDay]);

  useEffect(() => {
    if (!manualSelection) setCapacity(calc.recommended);
  }, [calc.recommended, manualSelection]);

  const moveCapacity = (direction: -1 | 1) => {
    const index = CAPS.indexOf(capacity);
    const next = CAPS[(index + direction + CAPS.length) % CAPS.length];
    setSlide(direction);
    setCapacity(next);
    setManualSelection(true);
    window.setTimeout(() => setSlide(0), 280);
  };

  const selectCapacity = (next: Capacity) => {
    if (next === capacity) return;
    setSlide(CAPS.indexOf(next) > CAPS.indexOf(capacity) ? 1 : -1);
    setCapacity(next);
    setManualSelection(true);
    window.setTimeout(() => setSlide(0), 280);
  };

  const applyPreset = (preset: Preset) => {
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
    setTilt({ x: clamp(-ny * 4, -2.5, 2.5), y: clamp(nx * 6, -3.5, 3.5) });
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => { pointerStart.current = event.clientX; };
  const pointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (start == null) return;
    const delta = event.clientX - start;
    if (Math.abs(delta) > 42) moveCapacity(delta < 0 ? 1 : -1);
  };

  const ideal = calc.air.cap === calc.recommended;
  const under = calc.air.cap < calc.recommended;
  const visualScale = clamp(calc.air.width / 1.08, .68, 1.02);
  const climate = CLIMATE_MODES[mode];
  const particleColor = mode === 'calor' ? '#FFD166' : mode === 'frio' ? '#66D8FF' : climate.color;
  const overlay = mode === 'frio' ? AIRFLOW_COLD : mode === 'calor' ? AIRFLOW_WARM : null;
  const particleCount = mode === 'frio' || mode === 'calor' ? 28 : 12;
  const selectedImage = AIR_VISUALS[calc.air.cap];

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#100b08] text-white">
      <style>{`
        button[aria-label="Abrir asistente Fabrick"]{display:none!important}
        @keyframes airFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes particleFall{0%{opacity:0;transform:translate3d(0,-8px,0) scale(.55)}18%{opacity:.92}100%{opacity:0;transform:translate3d(var(--dx),165px,0) scale(1.2)}}
        @keyframes airflowPulse{0%,100%{opacity:.24;transform:translateX(-50%) scale(.92)}50%{opacity:.50;transform:translateX(-50%) scale(1.04)}}
        @keyframes glowPulse{0%,100%{opacity:.20;transform:scale(.96)}50%{opacity:.38;transform:scale(1.04)}}
        .air-float{animation:airFloat 4.6s ease-in-out infinite}
        .airflow-overlay{animation:airflowPulse 3.2s ease-in-out infinite}
        .air-glow{animation:glowPulse 4.4s ease-in-out infinite}
      `}</style>

      <picture className="pointer-events-none fixed inset-0">
        <source media="(min-width: 900px)" srcSet={BG_DESKTOP} />
        <img src={BG_MOBILE} alt="" className="h-full w-full scale-[1.04] object-cover" />
      </picture>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(13,8,5,.48),rgba(8,7,6,.12)_34%,rgba(7,6,5,.32)_74%,rgba(6,5,4,.92))]" />
      <div className="pointer-events-none fixed inset-0 shadow-[inset_0_0_190px_rgba(0,0,0,.48)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1580px] flex-col px-3 pb-4 pt-3 sm:px-5 sm:pt-5 lg:px-8 lg:pb-7">
        <header className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 gap-2">
            <button type="button" onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/16 bg-black/38 shadow-[0_12px_34px_rgba(0,0,0,.24)] backdrop-blur-xl active:scale-95 sm:h-12 sm:w-12" aria-label="Volver a tienda"><ArrowLeft className="h-5 w-5" /></button>
            <div className="min-w-0 rounded-[1.35rem] border border-white/16 bg-black/38 px-3.5 py-2.5 shadow-[0_16px_45px_rgba(0,0,0,.22)] backdrop-blur-xl sm:min-w-[320px] sm:px-4">
              <small className="block text-[8px] font-black uppercase tracking-[.2em] text-[#F6B66B]">Catálogo 3D · Aire</small>
              <div className="mt-0.5 truncate text-sm font-black sm:text-xl">{calc.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m² · {calc.btu.toLocaleString('es-CL')} BTU</div>
              <div className="mt-0.5 hidden items-center gap-1.5 text-[9px] text-white/45 sm:flex"><Home className="h-3 w-3" />{ROOM_FACTORS[roomType].label} · {people} personas</div>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setPanel(panel === 'measure' ? null : 'measure')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl sm:h-12 sm:w-12 ${panel === 'measure' ? 'border-[#F7A347]/70 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/16 bg-black/38 text-white/80'}`} aria-label="Calcular espacio"><Calculator className="h-4 w-4" /></button>
            <button type="button" onClick={() => setPanel(panel === 'climate' ? null : 'climate')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl sm:h-12 sm:w-12 ${panel === 'climate' ? 'border-[#F7A347]/70 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/16 bg-black/38 text-white/80'}`} aria-label="Control de clima"><Thermometer className="h-4 w-4" /></button>
            <button type="button" onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-white/16 bg-black/38 text-white/80 backdrop-blur-xl active:scale-95 sm:h-12 sm:w-12" aria-label="Reiniciar"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </header>

        <section className="mt-3 grid flex-1 gap-3 lg:mt-5 lg:grid-cols-[300px_minmax(0,1fr)_320px] xl:grid-cols-[320px_minmax(0,1fr)_350px]">
          <aside className="hidden content-start gap-3 lg:grid">
            <div className="rounded-[1.75rem] border border-white/14 bg-black/44 p-4 shadow-[0_24px_70px_rgba(0,0,0,.22)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-2"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Calculadora</p><h2 className="mt-1 text-xl font-black">Tu espacio</h2></div><span className="rounded-full bg-white/7 px-3 py-1 text-[9px] text-white/45">{calc.volume.toFixed(1)} m³</span></div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">{ROOM_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className={`rounded-xl border px-2 py-2 text-[8px] font-bold ${roomType === preset.type && Math.abs(length - preset.length) < .05 ? 'border-[#F59A3B]/55 bg-[#F5871F]/14 text-[#FFC27A]' : 'border-white/8 bg-white/[.035] text-white/45'}`}>{preset.label}</button>)}</div>
              <div className="mt-3 grid gap-2">
                <Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={.1} onChange={(value) => { setLength(value); setManualSelection(false); }} />
                <Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={.1} onChange={(value) => { setWidth(value); setManualSelection(false); }} />
                <div className="grid grid-cols-2 gap-2"><Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={.1} onChange={(value) => { setHeight(value); setManualSelection(false); }} /><Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(value) => { setPeople(Math.round(value)); setManualSelection(false); }} /></div>
              </div>
              <div className="mt-3 rounded-2xl border border-[#F59A3B]/22 bg-[#4A2712]/26 p-3"><div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-[.13em] text-white/38">Recomendado</span><b className="text-sm text-[#FFC27A]">{calc.recommended.toLocaleString('es-CL')} BTU</b></div><p className="mt-1 text-[9px] text-white/38">{calc.area.toFixed(1)} m² · {people} pers. · {ROOM_FACTORS[roomType].label}</p></div>
            </div>
          </aside>

          <div ref={heroRef} onPointerMove={pointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })} onPointerDown={pointerDown} onPointerUp={pointerUp} className="relative min-h-[560px] touch-pan-y overflow-hidden rounded-[2rem] border border-white/10 bg-black/[.07] sm:min-h-[640px] lg:min-h-[720px]">
            <div className="pointer-events-none absolute left-1/2 top-[36%] h-[300px] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[95px] air-glow" style={{ background: mode === 'calor' ? 'rgba(255,181,78,.20)' : 'rgba(79,194,255,.16)' }} />
            <div className="pointer-events-none absolute inset-x-[7%] top-[7%] h-px bg-gradient-to-r from-transparent via-[#FFC271]/45 to-transparent" />
            <div className="absolute left-3 top-3 z-30 flex gap-2 sm:left-5 sm:top-5"><button type="button" onClick={() => setSound((value) => !value)} className="flex items-center gap-2 rounded-2xl border border-white/12 bg-black/44 px-3 py-2 text-[10px] font-bold backdrop-blur-xl">{sound ? <Volume2 className="h-4 w-4 text-[#F7B260]" /> : <VolumeX className="h-4 w-4 text-white/55" />}<span>~{calc.db} dB</span></button><div className="hidden items-center gap-2 rounded-2xl border border-white/12 bg-black/44 px-3 py-2 text-[10px] font-bold backdrop-blur-xl sm:flex"><Leaf className="h-4 w-4 text-[#79E28D]" /><span>{Math.round(calc.monthlyKwh)} kWh/mes</span></div></div>
            <button type="button" onClick={() => moveCapacity(-1)} className="absolute left-3 top-[38%] z-40 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/45 shadow-[0_14px_35px_rgba(0,0,0,.24)] backdrop-blur-xl transition active:scale-90 sm:left-5 sm:h-14 sm:w-14" aria-label="Equipo anterior"><ArrowLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => moveCapacity(1)} className="absolute right-3 top-[38%] z-40 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/45 shadow-[0_14px_35px_rgba(0,0,0,.24)] backdrop-blur-xl transition active:scale-90 sm:right-5 sm:h-14 sm:w-14" aria-label="Equipo siguiente"><ArrowLeft className="h-5 w-5 rotate-180" /></button>

            <div className="absolute inset-x-0 top-[14%] z-20 flex justify-center px-12 sm:top-[13%] sm:px-20 lg:px-14 xl:px-20">
              <div className="relative w-full max-w-[880px]">
                {overlay ? <img src={overlay} alt="" aria-hidden="true" className="airflow-overlay pointer-events-none absolute left-1/2 top-[55%] z-0 w-[72%] max-w-[580px] -translate-x-1/2 select-none object-contain mix-blend-screen blur-[.2px]" /> : null}
                <div className="pointer-events-none absolute left-[17%] right-[17%] top-[59%] z-10 h-[190px] overflow-hidden">{Array.from({ length: particleCount }).map((_, index) => { const left = 4 + ((index * 37) % 92); const size = 2 + (index % 4); const duration = 1.8 + (index % 6) * .13; const delay = -((index % 9) * .19); const dx = ((index * 23) % 64) - 32; const particleStyle = { left: `${left}%`, width: size, height: size, background: particleColor, boxShadow: `0 0 ${6 + size * 2}px ${particleColor}`, animation: `particleFall ${duration}s linear ${delay}s infinite`, '--dx': `${dx}px` } as CSSProperties; return <i key={index} className="absolute top-0 rounded-full opacity-0" style={particleStyle} />; })}</div>
                <div className="air-float relative z-20 transition-all duration-300 ease-out" style={{ transform: `translateX(${slide * -34}px) perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, opacity: slide ? .68 : 1 }}><img src={selectedImage} alt={`${calc.air.name} ${calc.air.cap} BTU`} draggable={false} className="mx-auto block h-auto max-w-[820px] select-none object-contain drop-shadow-[0_32px_34px_rgba(0,0,0,.42)] transition-[width] duration-500 ease-out" style={{ width: `${Math.round(visualScale * 100)}%` }} /></div>
                <div className="relative z-30 mt-3 flex items-center justify-center gap-2">{CAPS.map((cap) => <button key={cap} type="button" onClick={() => selectCapacity(cap)} className={`rounded-full border px-3 py-1.5 text-[9px] font-black transition sm:text-[10px] ${cap === capacity ? 'border-[#F59A3B]/80 bg-[#F5871F]/22 text-[#FFC27A] shadow-[0_0_20px_rgba(245,139,36,.14)]' : 'border-white/10 bg-black/28 text-white/42'}`}>{cap / 1000}K</button>)}</div>
                <p className="relative z-30 mt-2 text-center text-[8px] uppercase tracking-[.16em] text-white/32">Desliza izquierda / derecha para cambiar equipo</p>
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-3 z-30 rounded-[1.55rem] border border-white/14 bg-black/52 p-3.5 shadow-[0_22px_70px_rgba(0,0,0,.26)] backdrop-blur-2xl sm:inset-x-5 sm:bottom-5 sm:p-5">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F3A75C]">{calc.air.source === 'catalogo' ? 'Datos del catálogo' : 'Visual referencial'} · {calc.air.cap.toLocaleString('es-CL')} BTU</p><h1 className="mt-1 truncate text-base font-black sm:text-2xl">{calc.air.name}</h1><p className="mt-1 text-[9px] text-white/42">~{Math.round(calc.air.width * 100)} cm · {calc.air.inverter ? 'Inverter · ahorro variable' : 'Estándar'}</p></div><div className="text-right"><span className="inline-flex rounded-xl px-3 py-2 text-sm font-black" style={{ background: `${calc.air.energyColor}22`, color: calc.air.energyColor }}>{calc.air.energy}</span><p className="mt-1 text-[8px] text-white/30">eficiencia</p></div></div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2"><div className="rounded-xl bg-white/[.045] p-2"><Home className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">{calc.air.coverage} m²</b><span className="text-[7px] text-white/32">cobertura</span></div><div className="rounded-xl bg-white/[.045] p-2"><Users className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block truncate text-[11px] sm:text-xs">{calc.air.people.replace(' personas', '')}</b><span className="text-[7px] text-white/32">personas</span></div><div className="rounded-xl bg-white/[.045] p-2"><Zap className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">{currency(calc.cost)}</b><span className="text-[7px] text-white/32">mes aprox.</span></div><div className="rounded-xl bg-white/[.045] p-2"><Volume2 className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">~{calc.db} dB</b><span className="text-[7px] text-white/32">ruido</span></div></div>
              <div className="mt-3 flex items-center justify-between gap-3"><span className="min-w-0 text-[9px] text-white/42">{ideal ? <span className="text-[#86E99A]">Ideal para tu configuración</span> : under ? <span className="text-[#FFBE72]">Menor que la recomendación calculada</span> : <span className="text-white/50">Capacidad superior a la recomendada</span>}</span>{!ideal ? <button type="button" onClick={() => { setCapacity(calc.recommended); setManualSelection(false); }} className="shrink-0 rounded-full border border-[#F59A3B]/35 bg-[#F5871F]/12 px-3 py-1.5 text-[9px] font-black text-[#FFC27A]">Usar {calc.recommended / 1000}K</button> : <Check className="h-4 w-4 shrink-0 text-[#86E99A]" />}</div>
            </div>
          </div>

          <aside className="hidden content-start gap-3 lg:grid">
            <div className="rounded-[1.75rem] border border-white/14 bg-black/44 p-4 shadow-[0_24px_70px_rgba(0,0,0,.22)] backdrop-blur-2xl"><div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Equipo seleccionado</p><h2 className="mt-1 truncate text-lg font-black">{calc.air.name}</h2></div>{calc.air.image ? <img src={calc.air.image} alt="" className="h-12 w-16 rounded-xl bg-white object-contain p-1" /> : <Info className="h-4 w-4 text-white/45" />}</div><p className="mt-3 line-clamp-4 text-[10px] leading-5 text-white/44">{calc.air.desc}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/[.04] p-3"><Users className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{calc.air.people}</b><span className="text-[8px] text-white/32">diseñado / estimado</span></div><div className="rounded-xl bg-white/[.04] p-3"><Home className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{calc.air.coverage} m²</b><span className="text-[8px] text-white/32">cobertura</span></div><div className="rounded-xl bg-white/[.04] p-3"><Leaf className="h-4 w-4 text-[#79E28D]" /><b className="mt-1 block text-sm">{Math.round(calc.monthlyKwh)} kWh</b><span className="text-[8px] text-white/32">consumo mensual</span></div><div className="rounded-xl bg-white/[.04] p-3"><Zap className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{currency(calc.cost)}</b><span className="text-[8px] text-white/32">gasto estimado</span></div></div><div className="mt-3 flex flex-wrap gap-1.5">{calc.air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1.5 text-[8px] text-white/52">{feature}</span>)}</div></div>
            <div className="rounded-[1.75rem] border border-white/14 bg-black/44 p-4 shadow-[0_24px_70px_rgba(0,0,0,.22)] backdrop-blur-2xl"><div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Control climático</p><h2 className="mt-1 text-lg font-black">{temperature}°C · Vent. {fanSpeed}/4</h2></div><button type="button" onClick={() => setSound((value) => !value)} className="grid h-9 w-9 place-items-center rounded-full bg-white/7" aria-label="Activar sonido">{sound ? <Volume2 className="h-4 w-4 text-[#FFC27A]" /> : <VolumeX className="h-4 w-4 text-white/45" />}</button></div><div className="mt-3 flex flex-wrap gap-1.5">{(Object.keys(CLIMATE_MODES) as ClimateMode[]).map((key) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${mode === key ? 'border-white/28 bg-white/12' : 'border-white/8 bg-white/[.035] text-white/42'}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CLIMATE_MODES[key].color, boxShadow: `0 0 8px ${CLIMATE_MODES[key].color}` }} />{CLIMATE_MODES[key].label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Stepper label="Temperatura" value={temperature} unit="°C" min={16} max={30} step={1} onChange={(value) => setTemperature(Math.round(value))} /><Stepper label="Horas/día" value={hoursDay} unit="h" min={1} max={12} step={1} onChange={(value) => setHoursDay(Math.round(value))} /></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => setFanSpeed((value) => value >= 4 ? 1 : value + 1)} className="flex-1 rounded-xl border border-white/8 bg-white/[.04] py-2 text-[9px] font-bold">Velocidad {fanSpeed}/4</button><button type="button" onClick={() => setEco((value) => !value)} className={`flex-1 rounded-xl py-2 text-[9px] font-bold ${eco ? 'bg-[#1F6D36]/70 text-[#B8F7C5]' : 'border border-white/8 bg-white/[.04] text-white/42'}`}>Eco {eco ? 'ON' : 'OFF'}</button></div></div>
          </aside>
        </section>

        <section className="mt-3 grid gap-2 lg:hidden">
          <div className="rounded-[1.55rem] border border-white/13 bg-black/48 p-3 backdrop-blur-2xl"><div className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">{calc.air.cap.toLocaleString('es-CL')} BTU · {calc.air.energy}</p><h2 className="truncate text-sm font-black">{calc.air.name}</h2></div><button type="button" onClick={() => setPanel(panel === 'details' ? null : 'details')} className="grid h-9 w-9 place-items-center rounded-full bg-white/7" aria-label="Detalle del equipo"><Info className="h-4 w-4" /></button></div><div className="mt-2 grid grid-cols-4 gap-1.5"><div className="rounded-xl bg-white/[.04] p-2 text-center"><b className="block text-[11px]">{calc.air.coverage} m²</b><span className="text-[7px] text-white/30">espacio</span></div><div className="rounded-xl bg-white/[.04] p-2 text-center"><b className="block truncate text-[11px]">{calc.air.people.replace(' personas', '')}</b><span className="text-[7px] text-white/30">personas</span></div><div className="rounded-xl bg-white/[.04] p-2 text-center"><b className="block text-[11px]">{Math.round(calc.monthlyKwh)} kWh</b><span className="text-[7px] text-white/30">mes</span></div><div className="rounded-xl bg-white/[.04] p-2 text-center"><b className="block text-[11px]">~{calc.db} dB</b><span className="text-[7px] text-white/30">ruido</span></div></div></div>
          {panel === 'measure' ? <div className="rounded-[1.6rem] border border-white/14 bg-black/62 p-3.5 backdrop-blur-2xl"><div className="mb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{ROOM_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[8px] font-bold text-white/55">{preset.label}</button>)}</div><div className="grid grid-cols-2 gap-2"><Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={.1} onChange={(value) => { setLength(value); setManualSelection(false); }} /><Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={.1} onChange={(value) => { setWidth(value); setManualSelection(false); }} /><Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={.1} onChange={(value) => { setHeight(value); setManualSelection(false); }} /><Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(value) => { setPeople(Math.round(value)); setManualSelection(false); }} /></div><div className="mt-2 rounded-xl border border-[#F59A3B]/22 bg-[#4A2712]/26 p-3 text-center"><span className="text-[8px] text-white/35">Recomendación automática</span><b className="ml-2 text-sm text-[#FFC27A]">{calc.recommended.toLocaleString('es-CL')} BTU</b></div></div> : null}
          {panel === 'climate' ? <div className="rounded-[1.6rem] border border-white/14 bg-black/62 p-3.5 backdrop-blur-2xl"><div className="flex flex-wrap gap-1.5">{(Object.keys(CLIMATE_MODES) as ClimateMode[]).map((key) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${mode === key ? 'border-white/28 bg-white/12' : 'border-white/8 bg-white/[.035] text-white/42'}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CLIMATE_MODES[key].color }} />{CLIMATE_MODES[key].label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Stepper label="Temperatura" value={temperature} unit="°C" min={16} max={30} step={1} onChange={(value) => setTemperature(Math.round(value))} /><Stepper label="Horas/día" value={hoursDay} unit="h" min={1} max={12} step={1} onChange={(value) => setHoursDay(Math.round(value))} /></div><div className="mt-2 flex gap-2"><button type="button" onClick={() => setFanSpeed((value) => value >= 4 ? 1 : value + 1)} className="flex-1 rounded-xl border border-white/8 bg-white/[.04] py-2 text-[9px]">Vent. {fanSpeed}/4</button><button type="button" onClick={() => setEco((value) => !value)} className={`flex-1 rounded-xl py-2 text-[9px] ${eco ? 'bg-[#1F6D36]/70 text-[#B8F7C5]' : 'border border-white/8 bg-white/[.04] text-white/42'}`}>Eco {eco ? 'ON' : 'OFF'}</button><button type="button" onClick={() => setSound((value) => !value)} className="grid w-11 place-items-center rounded-xl border border-white/8 bg-white/[.04]">{sound ? <Volume2 className="h-4 w-4 text-[#FFC27A]" /> : <VolumeX className="h-4 w-4 text-white/45" />}</button></div></div> : null}
          {panel === 'details' ? <div className="rounded-[1.6rem] border border-white/14 bg-black/62 p-4 backdrop-blur-2xl"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Ficha del equipo</p><h3 className="mt-1 text-lg font-black">{calc.air.name}</h3><p className="mt-2 text-[10px] leading-5 text-white/48">{calc.air.desc}</p><div className="mt-3 flex flex-wrap gap-1.5">{calc.air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1.5 text-[8px] text-white/52">{feature}</span>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/[.04] p-3"><Leaf className="h-4 w-4 text-[#79E28D]" /><b className="mt-1 block text-sm">{Math.round(calc.monthlyKwh)} kWh/mes</b></div><div className="rounded-xl bg-white/[.04] p-3"><Zap className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{currency(calc.cost)}/mes</b></div></div></div> : null}
        </section>

        <section className="mt-3 rounded-[1.45rem] border border-white/12 bg-black/42 px-3 py-2.5 backdrop-blur-2xl"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.17em] text-white/45">{loading ? 'Sincronizando catálogo…' : 'Desliza o usa las flechas para cambiar capacidad'}</p><p className="mt-0.5 truncate text-[8px] text-white/25">Cloudinary V7 · PNG por tamaño · flujo frío/calor dedicado</p></div><div className="flex shrink-0 gap-1.5">{CAPS.map((cap) => <button key={cap} type="button" onClick={() => selectCapacity(cap)} className={`h-2.5 rounded-full transition-all ${cap === capacity ? 'w-7 bg-[#F58B24]' : 'w-2.5 bg-white/20'}`} aria-label={`${cap.toLocaleString('es-CL')} BTU`} />)}</div></div></section>
        <p className="mt-2 px-2 text-center text-[8px] leading-4 text-white/25">El render por capacidad es una referencia visual. Los datos reales del catálogo prevalecen cuando están disponibles. BTU, consumo, costo y ruido son estimaciones de apoyo; verifica ficha técnica y certificación SEC del modelo antes de comprar.</p>
      </div>
    </main>
  );
}
