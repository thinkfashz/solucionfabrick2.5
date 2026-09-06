'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Calculator, Check, Home, Info, Leaf, Minus, Plus, RotateCcw, Thermometer, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { CAPS, buildAirOptions, clamp, type Capacity, type Mode } from './airGameV5/model';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG_MOBILE = `${CLOUD}/c_fill,g_auto,w_1080,h_1920/e_blur:9/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const BG_DESKTOP = `${CLOUD}/c_fill,g_auto,w_1920,h_1080/e_blur:8/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;

// Visuales normalizados: el catálogo aporta los datos, no la estética del render.
const AIR_VISUALS: Record<Capacity, string> = {
  9000: `${CLOUD}/f_auto,q_auto:best/v1788674134/air-9k-v7.png`,
  12000: `${CLOUD}/f_auto,q_auto:best/v1788674142/air-12k-v7.png`,
  18000: `${CLOUD}/f_auto,q_auto:best/v1788674152/air-18k-v7.png`,
  24000: `${CLOUD}/f_auto,q_auto:best/v1788674161/air-24k-v7.png`,
};
const VISUAL_WIDTH: Record<Capacity, number> = { 9000: 68, 12000: 78, 18000: 89, 24000: 100 };
const DB_REFERENCE: Record<Capacity, number> = { 9000: 19, 12000: 21, 18000: 24, 24000: 27 };
const TARIFF_CLP_KWH = 263;

type ClimateMode = Mode | 'calor';
type RoomType = 'dormitorio' | 'living' | 'oficina' | 'cocina';
type Preset = { label: string; type: RoomType; length: number; width: number; height: number; people: number };

const CLIMATE_MODES: Record<ClimateMode, { label: string; short: string; color: string; factor: number }> = {
  frio: { label: 'Frío', short: 'COOL', color: '#66D8FF', factor: 1 },
  calor: { label: 'Calor', short: 'HEAT', color: '#FFD166', factor: 1.06 },
  ventilacion: { label: 'Vent.', short: 'FAN', color: '#DDF6FF', factor: .30 },
  seco: { label: 'Deshum.', short: 'DRY', color: '#70E6C7', factor: .66 },
  auto: { label: 'Auto', short: 'AUTO', color: '#C8B4FF', factor: .82 },
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

function brandFromName(name: string) {
  const known = name.match(/\b(LG|Samsung|Midea|Carrier|Hisense|Anwo|Daikin|Gree|Bosch|Kendal|Fensa|Electrolux|TCL|Khöne|Clark)\b/i)?.[0];
  if (known) return known.toUpperCase();
  const first = name.trim().split(/\s+/)[0] || '';
  if (first.length >= 3 && !/^(split|aire|acondicionado|climatizador)$/i.test(first)) return first;
  return 'Selección Fabrick';
}

function useAirAudio(speed: number, mode: ClimateMode) {
  const [enabled, setEnabled] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const loopRef = useRef<{ hum: OscillatorNode; noise: AudioBufferSourceNode; gain: GainNode } | null>(null);

  const stopLoop = () => {
    const loop = loopRef.current;
    if (!loop) return;
    try { loop.hum.stop(); loop.noise.stop(); } catch { /* noop */ }
    try { loop.gain.disconnect(); } catch { /* noop */ }
    loopRef.current = null;
  };

  const powerChime = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(.0001, now);
    master.gain.exponentialRampToValueAtTime(.055, now + .018);
    master.gain.exponentialRampToValueAtTime(.0001, now + .42);
    master.connect(ctx.destination);
    [660, 920].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now + index * .075);
      osc.connect(master);
      osc.start(now + index * .075);
      osc.stop(now + .44);
    });
  };

  const beep = () => {
    const ctx = ctxRef.current;
    if (!ctx || !enabled) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.028, now + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .09);
    osc.type = 'sine';
    osc.frequency.value = 880;
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + .1);
  };

  const toggle = () => {
    if (enabled) {
      stopLoop();
      setEnabled(false);
      return;
    }
    const AudioContextCtor = window.AudioContext || ((window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AudioContextCtor) return;
    const ctx = ctxRef.current ?? new AudioContextCtor();
    ctxRef.current = ctx;
    void ctx.resume();
    powerChime(ctx);
    setEnabled(true);
  };

  useEffect(() => {
    stopLoop();
    const ctx = ctxRef.current;
    if (!enabled || !ctx) return;

    const master = ctx.createGain();
    const lowpass = ctx.createBiquadFilter();
    const hum = ctx.createOscillator();
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();

    master.gain.value = .022 + speed * .004;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 560 + speed * 155;
    hum.type = 'sine';
    hum.frequency.value = 46 + speed * 4 + (mode === 'calor' ? -2 : mode === 'frio' ? 3 : 0);

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * .22;
    noise.buffer = buffer;
    noise.loop = true;
    noiseGain.gain.value = .045 + speed * .012;

    hum.connect(master);
    noise.connect(lowpass).connect(noiseGain).connect(master);
    master.connect(ctx.destination);
    hum.start();
    noise.start();
    loopRef.current = { hum, noise, gain: master };

    return stopLoop;
  }, [enabled, speed, mode]);

  useEffect(() => () => {
    stopLoop();
    const ctx = ctxRef.current;
    if (ctx) void ctx.close();
  }, []);

  return { enabled, toggle, beep };
}

function Stepper({ label, value, unit, min, max, step, onChange }: {
  label: string; value: number; unit?: string; min: number; max: number; step: number; onChange: (value: number) => void;
}) {
  const change = (delta: number) => onChange(Number(clamp(value + delta, min, max).toFixed(1)));
  return (
    <div className="rounded-2xl border border-white/10 bg-black/24 p-3 backdrop-blur-xl">
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

function UniversalAirVisual({ cap, name, temperature, mode, eco, tilt, slide }: {
  cap: Capacity; name: string; temperature: number; mode: ClimateMode; eco: boolean; tilt: { x: number; y: number }; slide: number;
}) {
  const [failed, setFailed] = useState(false);
  const climate = CLIMATE_MODES[mode];
  useEffect(() => setFailed(false), [cap]);

  return (
    <div className="air-float relative z-20 mx-auto transition-all duration-300 ease-out" style={{ width: `${VISUAL_WIDTH[cap]}%`, transform: `translateX(${slide * -34}px) perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, opacity: slide ? .66 : 1 }}>
      {!failed ? (
        <img src={AIR_VISUALS[cap]} alt={`${name} ${cap.toLocaleString('es-CL')} BTU`} draggable={false} onError={() => setFailed(true)} className="block h-auto w-full select-none object-contain drop-shadow-[0_34px_34px_rgba(0,0,0,.43)]" />
      ) : (
        <div className="relative mx-auto aspect-[3.1/1] w-full overflow-hidden rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,#fff,#f4f5f6_58%,#dfe2e5)] shadow-[0_34px_55px_rgba(0,0,0,.36),inset_0_2px_3px_rgba(255,255,255,.95)]">
          <div className="absolute inset-x-[5%] top-[9%] h-[2px] rounded-full bg-white/90" />
          <div className="absolute inset-x-[6%] bottom-[10%] h-[18%] rounded-[8px] bg-[#141619] shadow-[inset_0_5px_8px_rgba(0,0,0,.72)]" />
          <div className="absolute inset-x-[11%] bottom-[13%] flex h-[10%] gap-[3%]">{Array.from({ length: 10 }).map((_, index) => <i key={index} className="h-full flex-1 skew-x-[-8deg] rounded-sm bg-[#444a50]" />)}</div>
        </div>
      )}

      <div className="pointer-events-none absolute right-[10%] top-[36%] min-w-[74px] rounded-lg border border-white/14 bg-[#071118]/78 px-2.5 py-1.5 text-right shadow-[0_0_18px_rgba(96,218,255,.18)] backdrop-blur-sm">
        <div className="font-mono text-sm font-black tracking-tight" style={{ color: climate.color, textShadow: `0 0 8px ${climate.color}88` }}>{temperature}°</div>
        <div className="mt-0.5 flex justify-end gap-1.5 font-mono text-[6px] tracking-[.15em] text-white/45"><span>{climate.short}</span>{eco ? <span className="text-[#7DE59B]">ECO</span> : null}</div>
      </div>
      <div className="pointer-events-none absolute bottom-[5%] left-1/2 h-6 w-[76%] -translate-x-1/2 rounded-full bg-black/30 blur-xl" />
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
  const [panel, setPanel] = useState<'measure' | 'climate' | 'details' | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [slide, setSlide] = useState(0);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const pointerStart = useRef<number | null>(null);
  const audio = useAirAudio(fanSpeed, mode);

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
    audio.beep();
    window.setTimeout(() => setSlide(0), 260);
  };

  const selectCapacity = (next: Capacity) => {
    if (next === capacity) return;
    setSlide(CAPS.indexOf(next) > CAPS.indexOf(capacity) ? 1 : -1);
    setCapacity(next);
    setManualSelection(true);
    audio.beep();
    window.setTimeout(() => setSlide(0), 260);
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
    setTemperature(22); setFanSpeed(2); setHoursDay(4); setMode('frio'); setEco(true);
    setManualSelection(false); setPanel(null); setTilt({ x: 0, y: 0 });
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const box = heroRef.current?.getBoundingClientRect();
    if (!box) return;
    const nx = (event.clientX - box.left) / box.width - .5;
    const ny = (event.clientY - box.top) / box.height - .5;
    setTilt({ x: clamp(-ny * 4, -2.3, 2.3), y: clamp(nx * 6, -3.3, 3.3) });
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
  const climate = CLIMATE_MODES[mode];
  const particleColor = mode === 'calor' ? '#FFD166' : mode === 'frio' ? '#66D8FF' : climate.color;
  const particleCount = mode === 'frio' || mode === 'calor' ? 20 : 9;
  const brand = brandFromName(calc.air.name);

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#100b08] text-white">
      <style>{`
        button[aria-label="Abrir asistente Fabrick"]{display:none!important}
        @keyframes airFloat{0%,100%{translate:0 0}50%{translate:0 -5px}}
        @keyframes particleFall{0%{opacity:0;transform:translate3d(0,-10px,0) scale(.55)}16%{opacity:.88}100%{opacity:0;transform:translate3d(var(--dx),170px,0) scale(1.18)}}
        @keyframes glowPulse{0%,100%{opacity:.18;transform:scale(.96)}50%{opacity:.34;transform:scale(1.04)}}
        .air-float{animation:airFloat 5.2s ease-in-out infinite}
        .air-glow{animation:glowPulse 4.8s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.air-float,.air-glow{animation:none!important}.air-particle{display:none!important}}
      `}</style>

      <picture className="pointer-events-none fixed inset-0">
        <source media="(min-width: 900px)" srcSet={BG_DESKTOP} />
        <img src={BG_MOBILE} alt="" className="h-full w-full scale-[1.04] object-cover" />
      </picture>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(13,8,5,.54),rgba(8,7,6,.16)_35%,rgba(7,6,5,.38)_73%,rgba(6,5,4,.94))]" />
      <div className="pointer-events-none fixed inset-0 shadow-[inset_0_0_190px_rgba(0,0,0,.52)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1580px] flex-col px-3 pb-4 pt-3 sm:px-5 sm:pt-5 lg:px-8 lg:pb-7">
        <header className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 gap-2">
            <button type="button" onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/14 bg-black/42 shadow-[0_12px_34px_rgba(0,0,0,.25)] backdrop-blur-xl active:scale-95 sm:h-12 sm:w-12" aria-label="Volver a tienda"><ArrowLeft className="h-5 w-5" /></button>
            <div className="min-w-0 rounded-[1.35rem] border border-white/14 bg-black/42 px-3.5 py-2.5 shadow-[0_16px_45px_rgba(0,0,0,.23)] backdrop-blur-xl sm:min-w-[320px] sm:px-4">
              <small className="block text-[8px] font-black uppercase tracking-[.2em] text-[#F6B66B]">Calculadora · catálogo de aire</small>
              <div className="mt-0.5 truncate text-sm font-black sm:text-xl">{calc.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m² · {calc.btu.toLocaleString('es-CL')} BTU</div>
              <div className="mt-0.5 hidden items-center gap-1.5 text-[9px] text-white/43 sm:flex"><Home className="h-3 w-3" />{ROOM_FACTORS[roomType].label} · {people} personas</div>
            </div>
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setPanel(panel === 'measure' ? null : 'measure')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl sm:h-12 sm:w-12 ${panel === 'measure' ? 'border-[#F7A347]/70 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/14 bg-black/42 text-white/80'}`} aria-label="Calcular espacio"><Calculator className="h-4 w-4" /></button>
            <button type="button" onClick={() => setPanel(panel === 'climate' ? null : 'climate')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl sm:h-12 sm:w-12 ${panel === 'climate' ? 'border-[#F7A347]/70 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/14 bg-black/42 text-white/80'}`} aria-label="Control de clima"><Thermometer className="h-4 w-4" /></button>
            <button type="button" onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-black/42 text-white/80 backdrop-blur-xl active:scale-95 sm:h-12 sm:w-12" aria-label="Reiniciar"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </header>

        <section className="mt-3 grid flex-1 gap-3 lg:mt-5 lg:grid-cols-[292px_minmax(0,1fr)_320px] xl:grid-cols-[310px_minmax(0,1fr)_350px]">
          <aside className="hidden content-start gap-3 lg:grid">
            <div className="rounded-[1.7rem] border border-white/12 bg-black/46 p-4 shadow-[0_24px_70px_rgba(0,0,0,.23)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-2"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Calculadora</p><h2 className="mt-1 text-xl font-black">Tu espacio</h2></div><span className="rounded-full bg-white/7 px-3 py-1 text-[9px] text-white/42">{calc.volume.toFixed(1)} m³</span></div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">{ROOM_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className={`rounded-xl border px-2 py-2 text-[8px] font-bold ${roomType === preset.type && Math.abs(length - preset.length) < .05 ? 'border-[#F59A3B]/55 bg-[#F5871F]/14 text-[#FFC27A]' : 'border-white/8 bg-white/[.035] text-white/45'}`}>{preset.label}</button>)}</div>
              <div className="mt-3 grid gap-2">
                <Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={.1} onChange={(value) => { setLength(value); setManualSelection(false); }} />
                <Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={.1} onChange={(value) => { setWidth(value); setManualSelection(false); }} />
                <div className="grid grid-cols-2 gap-2"><Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={.1} onChange={(value) => { setHeight(value); setManualSelection(false); }} /><Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(value) => { setPeople(Math.round(value)); setManualSelection(false); }} /></div>
              </div>
              <div className="mt-3 rounded-2xl border border-[#F59A3B]/22 bg-[#4A2712]/26 p-3"><div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-[.13em] text-white/38">Recomendado</span><b className="text-sm text-[#FFC27A]">{calc.recommended.toLocaleString('es-CL')} BTU</b></div><p className="mt-1 text-[9px] text-white/38">{calc.area.toFixed(1)} m² · {people} pers. · {ROOM_FACTORS[roomType].label}</p></div>
            </div>
          </aside>

          <div ref={heroRef} onPointerMove={pointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })} onPointerDown={pointerDown} onPointerUp={pointerUp} className="relative min-h-[570px] touch-pan-y overflow-hidden rounded-[2rem] border border-white/9 bg-black/[.08] sm:min-h-[650px] lg:min-h-[720px]">
            <div className="pointer-events-none absolute left-1/2 top-[36%] h-[320px] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px] air-glow" style={{ background: mode === 'calor' ? 'rgba(255,181,78,.20)' : 'rgba(79,194,255,.16)' }} />
            <div className="pointer-events-none absolute inset-x-[8%] top-[7%] h-px bg-gradient-to-r from-transparent via-[#FFC271]/38 to-transparent" />

            <div className="absolute left-3 top-3 z-30 flex gap-2 sm:left-5 sm:top-5">
              <button type="button" onClick={audio.toggle} className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-[10px] font-bold backdrop-blur-xl ${audio.enabled ? 'border-[#F6B66B]/35 bg-[#523016]/72 text-[#FFD3A0]' : 'border-white/12 bg-black/46 text-white/72'}`} aria-label="Activar sonido">
                {audio.enabled ? <Volume2 className="h-4 w-4 text-[#F7B260]" /> : <VolumeX className="h-4 w-4 text-white/55" />}<span>~{calc.db} dB</span><span className="hidden text-white/35 sm:inline">{audio.enabled ? 'sonando' : 'toca para oír'}</span>
              </button>
              <div className="hidden items-center gap-2 rounded-2xl border border-white/12 bg-black/46 px-3 py-2 text-[10px] font-bold backdrop-blur-xl sm:flex"><Leaf className="h-4 w-4 text-[#79E28D]" /><span>{Math.round(calc.monthlyKwh)} kWh/mes</span></div>
            </div>

            <button type="button" onClick={() => moveCapacity(-1)} className="absolute left-3 top-[39%] z-40 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/48 shadow-[0_14px_35px_rgba(0,0,0,.25)] backdrop-blur-xl transition active:scale-90 sm:left-5 sm:h-14 sm:w-14" aria-label="Equipo anterior"><ArrowLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => moveCapacity(1)} className="absolute right-3 top-[39%] z-40 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/48 shadow-[0_14px_35px_rgba(0,0,0,.25)] backdrop-blur-xl transition active:scale-90 sm:right-5 sm:h-14 sm:w-14" aria-label="Equipo siguiente"><ArrowLeft className="h-5 w-5 rotate-180" /></button>

            <div className="absolute inset-x-0 top-[15%] z-20 flex justify-center px-12 sm:top-[13%] sm:px-20 lg:px-14 xl:px-20">
              <div className="relative w-full max-w-[900px]">
                <div className="pointer-events-none absolute left-[16%] right-[16%] top-[62%] z-10 h-[185px] overflow-hidden">{Array.from({ length: particleCount }).map((_, index) => { const left = 4 + ((index * 37) % 92); const size = 2 + (index % 4); const duration = 1.85 + (index % 6) * .13; const delay = -((index % 9) * .19); const dx = ((index * 23) % 64) - 32; const style = { left: `${left}%`, width: size, height: size, background: particleColor, boxShadow: `0 0 ${7 + size * 2}px ${particleColor}`, animation: `particleFall ${duration}s linear ${delay}s infinite`, '--dx': `${dx}px` } as CSSProperties; return <i key={index} className="air-particle absolute top-0 rounded-full opacity-0" style={style} />; })}</div>

                <UniversalAirVisual cap={calc.air.cap} name={calc.air.name} temperature={temperature} mode={mode} eco={eco} tilt={tilt} slide={slide} />

                <div className="relative z-30 mt-4 flex items-center justify-center gap-2">{CAPS.map((cap) => <button key={cap} type="button" onClick={() => selectCapacity(cap)} className={`rounded-full border px-3 py-1.5 text-[9px] font-black transition sm:text-[10px] ${cap === capacity ? 'border-[#F59A3B]/80 bg-[#F5871F]/22 text-[#FFC27A] shadow-[0_0_20px_rgba(245,139,36,.14)]' : 'border-white/9 bg-black/28 text-white/40'}`}>{cap / 1000}K</button>)}</div>
                <p className="relative z-30 mt-2 text-center text-[8px] uppercase tracking-[.14em] text-white/30">Desliza para cambiar capacidad · el tamaño del split también cambia</p>
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-3 z-30 rounded-[1.55rem] border border-white/12 bg-black/58 p-3.5 shadow-[0_22px_70px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:inset-x-5 sm:bottom-5 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><span className="rounded-full border border-white/8 bg-white/[.04] px-2 py-1 text-[7px] font-black uppercase tracking-[.14em] text-white/50">{brand}</span><span className="text-[8px] font-black uppercase tracking-[.14em] text-[#F3A75C]">{calc.air.source === 'catalogo' ? 'Ficha sincronizada' : 'Referencia técnica'}</span></div><h1 className="mt-1.5 truncate text-base font-black sm:text-2xl">{calc.air.name}</h1><p className="mt-1 text-[9px] text-white/40">{calc.air.cap.toLocaleString('es-CL')} BTU · ~{Math.round(calc.air.width * 100)} cm · {calc.air.inverter ? 'Inverter' : 'Estándar'}</p></div>
                <div className="text-right"><span className="inline-flex rounded-xl px-3 py-2 text-sm font-black" style={{ background: `${calc.air.energyColor}22`, color: calc.air.energyColor }}>{calc.air.energy}</span><p className="mt-1 text-[8px] text-white/28">eficiencia</p></div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                <div className="rounded-xl bg-white/[.04] p-2"><Home className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">{calc.air.coverage} m²</b><span className="text-[7px] text-white/30">cobertura</span></div>
                <div className="rounded-xl bg-white/[.04] p-2"><Users className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block truncate text-[11px] sm:text-xs">{calc.air.people.replace(' personas', '')}</b><span className="text-[7px] text-white/30">personas</span></div>
                <div className="rounded-xl bg-white/[.04] p-2"><Zap className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">{currency(calc.cost)}</b><span className="text-[7px] text-white/30">mes aprox.</span></div>
                <div className="rounded-xl bg-white/[.04] p-2"><Volume2 className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-[11px] sm:text-xs">~{calc.db} dB</b><span className="text-[7px] text-white/30">ruido</span></div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3"><span className="min-w-0 text-[9px] text-white/40">{ideal ? <span className="text-[#86E99A]">Ideal para tu configuración</span> : under ? <span className="text-[#FFBE72]">Capacidad inferior a la recomendación</span> : <span className="text-white/48">Capacidad superior a la recomendada</span>}</span>{!ideal ? <button type="button" onClick={() => { setCapacity(calc.recommended); setManualSelection(false); }} className="shrink-0 rounded-full border border-[#F59A3B]/35 bg-[#F5871F]/12 px-3 py-1.5 text-[9px] font-black text-[#FFC27A]">Usar {calc.recommended / 1000}K</button> : <Check className="h-4 w-4 shrink-0 text-[#86E99A]" />}</div>
            </div>
          </div>

          <aside className="hidden content-start gap-3 lg:grid">
            <div className="rounded-[1.7rem] border border-white/12 bg-black/46 p-4 shadow-[0_24px_70px_rgba(0,0,0,.23)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Equipo seleccionado</p><h2 className="mt-1 truncate text-lg font-black">{calc.air.name}</h2><span className="mt-1 inline-block rounded-full bg-white/[.05] px-2 py-1 text-[7px] font-bold uppercase tracking-[.12em] text-white/42">{brand}</span></div><button type="button" onClick={() => setPanel(panel === 'details' ? null : 'details')} className="grid h-9 w-9 place-items-center rounded-full bg-white/7" aria-label="Ver detalles"><Info className="h-4 w-4 text-white/45" /></button></div>
              <p className="mt-3 line-clamp-4 text-[10px] leading-5 text-white/43">{calc.air.desc}</p>
              <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/[.04] p-3"><Users className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{calc.air.people}</b><span className="text-[8px] text-white/30">personas</span></div><div className="rounded-xl bg-white/[.04] p-3"><Home className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{calc.air.coverage} m²</b><span className="text-[8px] text-white/30">cobertura</span></div><div className="rounded-xl bg-white/[.04] p-3"><Leaf className="h-4 w-4 text-[#79E28D]" /><b className="mt-1 block text-sm">{Math.round(calc.monthlyKwh)} kWh</b><span className="text-[8px] text-white/30">mensual</span></div><div className="rounded-xl bg-white/[.04] p-3"><Zap className="h-4 w-4 text-[#F6B66B]" /><b className="mt-1 block text-sm">{currency(calc.cost)}</b><span className="text-[8px] text-white/30">gasto aprox.</span></div></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{calc.air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1.5 text-[8px] text-white/50">{feature}</span>)}</div>
            </div>

            <div className="rounded-[1.7rem] border border-white/12 bg-black/46 p-4 shadow-[0_24px_70px_rgba(0,0,0,.23)] backdrop-blur-2xl">
              <div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Control climático</p><h2 className="mt-1 text-lg font-black">{temperature}°C · Vent. {fanSpeed}/4</h2></div><button type="button" onClick={audio.toggle} className={`grid h-9 w-9 place-items-center rounded-full ${audio.enabled ? 'bg-[#5D3A18]/80' : 'bg-white/7'}`} aria-label="Activar sonido">{audio.enabled ? <Volume2 className="h-4 w-4 text-[#FFC27A]" /> : <VolumeX className="h-4 w-4 text-white/45" />}</button></div>
              <div className="mt-3 flex flex-wrap gap-1.5">{(Object.keys(CLIMATE_MODES) as ClimateMode[]).map((key) => <button key={key} type="button" onClick={() => { setMode(key); audio.beep(); }} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${mode === key ? 'border-white/28 bg-white/12' : 'border-white/8 bg-white/[.035] text-white/42'}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CLIMATE_MODES[key].color, boxShadow: `0 0 8px ${CLIMATE_MODES[key].color}` }} />{CLIMATE_MODES[key].label}</button>)}</div>
              <div className="mt-3 grid grid-cols-2 gap-2"><Stepper label="Temperatura" value={temperature} unit="°C" min={16} max={30} step={1} onChange={(value) => setTemperature(Math.round(value))} /><Stepper label="Horas/día" value={hoursDay} unit="h" min={1} max={12} step={1} onChange={(value) => setHoursDay(Math.round(value))} /></div>
              <div className="mt-3 flex gap-2"><button type="button" onClick={() => { setFanSpeed((value) => value >= 4 ? 1 : value + 1); audio.beep(); }} className="flex-1 rounded-xl border border-white/8 bg-white/[.04] py-2 text-[9px] font-bold">Velocidad {fanSpeed}/4</button><button type="button" onClick={() => setEco((value) => !value)} className={`flex-1 rounded-xl py-2 text-[9px] font-bold ${eco ? 'bg-[#1F6D36]/70 text-[#B8F7C5]' : 'border border-white/8 bg-white/[.04] text-white/42'}`}>Eco {eco ? 'ON' : 'OFF'}</button></div>
            </div>
          </aside>
        </section>

        <section className="mt-3 grid gap-2 lg:hidden">
          {panel === 'measure' ? <div className="rounded-[1.6rem] border border-white/12 bg-black/64 p-3.5 backdrop-blur-2xl"><div className="mb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{ROOM_PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[8px] font-bold text-white/55">{preset.label}</button>)}</div><div className="grid grid-cols-2 gap-2"><Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={.1} onChange={(value) => { setLength(value); setManualSelection(false); }} /><Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={.1} onChange={(value) => { setWidth(value); setManualSelection(false); }} /><Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={.1} onChange={(value) => { setHeight(value); setManualSelection(false); }} /><Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(value) => { setPeople(Math.round(value)); setManualSelection(false); }} /></div><div className="mt-2 rounded-xl border border-[#F59A3B]/22 bg-[#4A2712]/26 p-3 text-center"><span className="text-[8px] text-white/35">Recomendación automática</span><b className="ml-2 text-sm text-[#FFC27A]">{calc.recommended.toLocaleString('es-CL')} BTU</b></div></div> : null}
          {panel === 'climate' ? <div className="rounded-[1.6rem] border border-white/12 bg-black/64 p-3.5 backdrop-blur-2xl"><div className="flex flex-wrap gap-1.5">{(Object.keys(CLIMATE_MODES) as ClimateMode[]).map((key) => <button key={key} type="button" onClick={() => { setMode(key); audio.beep(); }} className={`rounded-full border px-3 py-2 text-[9px] font-bold ${mode === key ? 'border-white/28 bg-white/12' : 'border-white/8 bg-white/[.035] text-white/42'}`}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: CLIMATE_MODES[key].color }} />{CLIMATE_MODES[key].label}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Stepper label="Temperatura" value={temperature} unit="°C" min={16} max={30} step={1} onChange={(value) => setTemperature(Math.round(value))} /><Stepper label="Horas/día" value={hoursDay} unit="h" min={1} max={12} step={1} onChange={(value) => setHoursDay(Math.round(value))} /></div><div className="mt-2 flex gap-2"><button type="button" onClick={() => { setFanSpeed((value) => value >= 4 ? 1 : value + 1); audio.beep(); }} className="flex-1 rounded-xl border border-white/8 bg-white/[.04] py-2 text-[9px]">Vent. {fanSpeed}/4</button><button type="button" onClick={() => setEco((value) => !value)} className={`flex-1 rounded-xl py-2 text-[9px] ${eco ? 'bg-[#1F6D36]/70 text-[#B8F7C5]' : 'border border-white/8 bg-white/[.04] text-white/42'}`}>Eco {eco ? 'ON' : 'OFF'}</button><button type="button" onClick={audio.toggle} className={`grid w-11 place-items-center rounded-xl border border-white/8 ${audio.enabled ? 'bg-[#5D3A18]/80' : 'bg-white/[.04]'}`}>{audio.enabled ? <Volume2 className="h-4 w-4 text-[#FFC27A]" /> : <VolumeX className="h-4 w-4 text-white/45" />}</button></div></div> : null}
          {panel === 'details' ? <div className="rounded-[1.6rem] border border-white/12 bg-black/64 p-4 backdrop-blur-2xl"><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Ficha del equipo</p><h3 className="mt-1 text-lg font-black">{calc.air.name}</h3><p className="mt-1 text-[8px] font-bold uppercase tracking-[.12em] text-white/35">{brand} · {calc.air.cap.toLocaleString('es-CL')} BTU</p><p className="mt-2 text-[10px] leading-5 text-white/46">{calc.air.desc}</p><div className="mt-3 flex flex-wrap gap-1.5">{calc.air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.035] px-2.5 py-1.5 text-[8px] text-white/50">{feature}</span>)}</div></div> : null}
        </section>

        <section className="mt-3 rounded-[1.45rem] border border-white/10 bg-black/44 px-3 py-2.5 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.17em] text-white/43">{loading ? 'Sincronizando catálogo…' : 'Visual universal · datos reales cuando están disponibles'}</p><p className="mt-0.5 truncate text-[8px] text-white/24">Imagen limpia por capacidad · marca separada · audio desbloqueado por toque</p></div><div className="flex shrink-0 gap-1.5">{CAPS.map((cap) => <button key={cap} type="button" onClick={() => selectCapacity(cap)} className={`h-2.5 rounded-full transition-all ${cap === capacity ? 'w-7 bg-[#F58B24]' : 'w-2.5 bg-white/20'}`} aria-label={`${cap.toLocaleString('es-CL')} BTU`} />)}</div></div>
        </section>
        <p className="mt-2 px-2 text-center text-[8px] leading-4 text-white/24">El render es un modelo visual normalizado por capacidad. Los datos reales del catálogo prevalecen cuando están disponibles. BTU, consumo, costo y ruido son estimaciones de apoyo; verifica ficha técnica y certificación SEC del modelo antes de comprar.</p>
      </div>
    </main>
  );
}
