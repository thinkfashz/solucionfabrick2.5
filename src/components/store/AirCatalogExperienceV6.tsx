'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Calculator, Check, Home, Info, Leaf, Minus, Plus, RotateCcw, Snowflake, Thermometer, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { CAPS, MODES, buildAirOptions, clamp, type Capacity, type Mode } from './airGameV5/model';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG_MOBILE = `${CLOUD}/c_fill,g_auto,w_1080,h_1920/e_blur:7/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const BG_DESKTOP = `${CLOUD}/c_fill,g_auto,w_1920,h_1080/e_blur:6/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const AIR_VISUALS: Record<Capacity, string> = {
  9000: `${CLOUD}/q_auto:best,f_auto/v1788671609/air-12k-transparent.png`,
  12000: `${CLOUD}/q_auto:best,f_auto/v1788671609/air-12k-transparent.png`,
  18000: `${CLOUD}/q_auto:best,f_auto/v1788672129/air-18k-transparent.png`,
  24000: `${CLOUD}/q_auto:best,f_auto/v1788671804/air-24k-transparent.png`,
};
const DB_REFERENCE: Record<Capacity, number> = { 9000: 19, 12000: 21, 18000: 24, 24000: 27 };
const TARIFF_CLP_KWH = 263;

function currency(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));
}

function useAirSound(enabled: boolean, speed: number, mode: Mode) {
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

    master.gain.value = 0.012 + speed * 0.0022;
    low.type = 'lowpass';
    low.frequency.value = 620 + speed * 130;
    hum.type = 'sine';
    hum.frequency.value = 48 + speed * 4 + (mode === 'frio' ? 3 : 0);
    hum.detune.value = -4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.16;
    noise.buffer = buffer;
    noise.loop = true;
    noiseGain.gain.value = 0.018 + speed * 0.004;

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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 backdrop-blur-md">
      <span className="text-[10px] font-semibold text-white/55">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <strong className="min-w-0 flex-1 text-base font-black">{String(value).replace('.', ',')}{unit ? ` ${unit}` : ''}</strong>
        <button type="button" onClick={() => set(-step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/7 active:scale-95" aria-label={`Disminuir ${label}`}><Minus className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => set(step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/12 bg-white/7 active:scale-95" aria-label={`Aumentar ${label}`}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export default function AirCatalogExperienceV6() {
  const router = useRouter();
  const { products, loading } = useCatalogProducts();
  const options = useMemo(() => buildAirOptions(products), [products]);

  const [length, setLength] = useState(4.5);
  const [width, setWidth] = useState(3.2);
  const [height, setHeight] = useState(2.5);
  const [people, setPeople] = useState(2);
  const [capacity, setCapacity] = useState<Capacity>(12000);
  const [manualSelection, setManualSelection] = useState(false);
  const [temperature, setTemperature] = useState(22);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [mode, setMode] = useState<Mode>('frio');
  const [eco, setEco] = useState(true);
  const [sound, setSound] = useState(false);
  const [panel, setPanel] = useState<'measure' | 'climate' | 'details' | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement | null>(null);

  useAirSound(sound, fanSpeed, mode);

  const calc = useMemo(() => {
    const area = length * width;
    const volume = area * height;
    const btu = Math.ceil(area * 600 + volume * 55 + people * 600 + 350 * 3.412);
    const recommended = (CAPS.find((candidate) => candidate >= btu) || 24000) as Capacity;
    const air = options.find((item) => item.cap === capacity) || options[0];
    const load = temperature <= 18 ? 0.82 : temperature <= 20 ? 0.68 : temperature <= 22 ? 0.56 : temperature <= 24 ? 0.46 : 0.38;
    const hoursDay = 4;
    const monthlyKwh = air.power * load * (0.88 + fanSpeed * 0.04) * MODES[mode].factor * (eco ? 0.78 : 1) * hoursDay * 30;
    const cost = monthlyKwh * TARIFF_CLP_KWH;
    const db = DB_REFERENCE[air.cap] + Math.max(0, fanSpeed - 1) * 2;
    return { area, volume, btu, recommended, air, monthlyKwh, cost, db, hoursDay };
  }, [length, width, height, people, options, capacity, temperature, fanSpeed, mode, eco]);

  useEffect(() => {
    if (!manualSelection) setCapacity(calc.recommended);
  }, [calc.recommended, manualSelection]);

  const reset = () => {
    setLength(4.5); setWidth(3.2); setHeight(2.5); setPeople(2);
    setTemperature(22); setFanSpeed(2); setMode('frio'); setEco(true); setSound(false);
    setManualSelection(false); setPanel(null); setTilt({ x: 0, y: 0 });
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    const box = heroRef.current?.getBoundingClientRect();
    if (!box) return;
    const nx = (event.clientX - box.left) / box.width - 0.5;
    const ny = (event.clientY - box.top) / box.height - 0.5;
    setTilt({ x: clamp(-ny * 7, -4, 4), y: clamp(nx * 10, -6, 6) });
  };

  const selectedImage = AIR_VISUALS[calc.air.cap];
  const ideal = calc.air.cap === calc.recommended;
  const under = calc.air.cap < calc.recommended;
  const modeColor = MODES[mode].color;

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[#120d09] text-white">
      <style>{`
        button[aria-label="Abrir asistente Fabrick"]{display:none!important}
        @keyframes airFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes airFlow{0%{opacity:.05;transform:translateY(-10px) scaleY(.65)}35%{opacity:.42}100%{opacity:0;transform:translateY(105px) scaleY(1.4)}}
        @keyframes haloPulse{0%,100%{opacity:.34;transform:scale(.96)}50%{opacity:.55;transform:scale(1.03)}}
        .air-hero-float{animation:airFloat 4.8s ease-in-out infinite}
        .air-halo{animation:haloPulse 4.8s ease-in-out infinite}
      `}</style>

      <picture className="pointer-events-none fixed inset-0">
        <source media="(min-width: 900px)" srcSet={BG_DESKTOP} />
        <img src={BG_MOBILE} alt="" className="h-full w-full object-cover scale-[1.03]" />
      </picture>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(18,10,6,.30),rgba(12,8,6,.05)_33%,rgba(9,7,6,.34)_72%,rgba(8,6,5,.82))]" />
      <div className="pointer-events-none fixed inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,.34)]" />

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1580px] flex-col px-3 pb-4 pt-3 sm:px-5 sm:pt-5 lg:px-8 lg:pb-7">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-2">
            <button type="button" onClick={() => navigateWithTransition('/tienda', router)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/18 bg-black/34 shadow-[0_12px_34px_rgba(0,0,0,.22)] backdrop-blur-xl active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 rounded-[1.45rem] border border-white/18 bg-black/34 px-4 py-2.5 shadow-[0_16px_45px_rgba(0,0,0,.20)] backdrop-blur-xl sm:min-w-[310px]">
              <small className="block text-[9px] font-black uppercase tracking-[.22em] text-[#F6B66B]">Catálogo 3D · Aire</small>
              <div className="mt-0.5 truncate text-base font-black sm:text-xl">{calc.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m² · {calc.btu.toLocaleString('es-CL')} BTU</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/55"><Home className="h-3 w-3" /> Dormitorio configurado</div>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { key: 'measure' as const, icon: Calculator, label: 'Calcular' },
              { key: 'climate' as const, icon: Thermometer, label: 'Clima' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} type="button" onClick={() => setPanel(panel === key ? null : key)} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl transition sm:h-12 sm:w-12 ${panel === key ? 'border-[#F7A347]/70 bg-[#F5871F]/22 text-[#FFC27A]' : 'border-white/18 bg-black/34 text-white/80'}`} aria-label={label}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <button type="button" onClick={reset} className="grid h-11 w-11 place-items-center rounded-full border border-white/18 bg-black/34 text-white/80 backdrop-blur-xl active:scale-95 sm:h-12 sm:w-12" aria-label="Reiniciar">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </header>

        <section className="mt-3 grid flex-1 gap-3 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center xl:grid-cols-[minmax(0,1fr)_390px]">
          <div ref={heroRef} onPointerMove={pointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })} className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/[.05] sm:min-h-[520px] lg:min-h-[610px]">
            <div className="pointer-events-none absolute left-1/2 top-[38%] h-[260px] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F2A25D]/13 blur-[85px] air-halo" />
            <div className="pointer-events-none absolute inset-x-[8%] top-[9%] h-px bg-gradient-to-r from-transparent via-[#FFC271]/50 to-transparent" />
            <div className="pointer-events-none absolute left-[8%] right-[8%] top-[9%] h-16 bg-gradient-to-b from-[#E69A55]/12 to-transparent blur-xl" />

            <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2 sm:left-5 sm:top-5">
              <button type="button" onClick={() => setSound((v) => !v)} className="flex items-center gap-2 rounded-2xl border border-white/12 bg-black/38 px-3 py-2 text-[10px] font-bold backdrop-blur-xl">
                {sound ? <Volume2 className="h-4 w-4 text-[#F7B260]" /> : <VolumeX className="h-4 w-4 text-white/55" />}
                <span>{calc.db} dB</span><span className="text-white/35">aprox.</span>
              </button>
              <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-black/38 px-3 py-2 text-[10px] font-bold backdrop-blur-xl">
                <Leaf className="h-4 w-4 text-[#79E28D]" />
                <span>{Math.round(calc.monthlyKwh)} kWh/mes</span>
              </div>
            </div>

            <div className="absolute inset-x-0 top-[18%] z-10 flex justify-center px-5 sm:top-[16%]">
              <div
                className="relative w-full max-w-[760px] transition-transform duration-200 ease-out air-hero-float"
                style={{ transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
              >
                <img src={selectedImage} alt={`${calc.air.name} ${calc.air.cap} BTU`} className="mx-auto block h-auto w-[92%] max-w-[720px] select-none object-contain drop-shadow-[0_28px_28px_rgba(0,0,0,.34)] sm:w-[82%]" draggable={false} />
                <div className="pointer-events-none absolute left-[18%] right-[18%] top-[76%] h-28 overflow-hidden">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <i key={i} className="absolute top-0 block h-24 w-[3px] rounded-full opacity-0 blur-[1px]" style={{ left: `${7 + i * 10.4}%`, background: `linear-gradient(180deg,${modeColor}99,${modeColor}00)`, animation: `airFlow ${1.6 + i * .07}s ease-out ${i * .11}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-3 z-20 grid gap-2 sm:inset-x-5 sm:bottom-5 sm:grid-cols-[1fr_auto]">
              <div className="rounded-[1.45rem] border border-white/14 bg-black/38 p-4 shadow-[0_20px_60px_rgba(0,0,0,.18)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F3A75C]">{calc.air.source === 'catalogo' ? 'Ficha sincronizada' : 'Referencia visual'}</p>
                    <h1 className="mt-1 truncate text-lg font-black sm:text-2xl">{calc.air.name}</h1>
                    <p className="mt-1 text-xs text-white/48">{calc.air.cap.toLocaleString('es-CL')} BTU · {calc.air.inverter ? 'Inverter' : 'Estándar'}</p>
                  </div>
                  <span className="shrink-0 rounded-xl px-3 py-2 text-sm font-black" style={{ background: `${calc.air.energyColor}24`, color: calc.air.energyColor }}>{calc.air.energy}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[.045] p-2.5"><Home className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-xs">{calc.air.coverage} m²</b><span className="text-[8px] text-white/35">cobertura</span></div>
                  <div className="rounded-xl bg-white/[.045] p-2.5"><Users className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block truncate text-xs">{calc.air.people.replace(' personas', '')}</b><span className="text-[8px] text-white/35">personas</span></div>
                  <div className="rounded-xl bg-white/[.045] p-2.5"><Zap className="h-3.5 w-3.5 text-[#F6B66B]" /><b className="mt-1 block text-xs">{currency(calc.cost)}</b><span className="text-[8px] text-white/35">mes aprox.</span></div>
                </div>
              </div>

              {!ideal ? (
                <button type="button" onClick={() => { setCapacity(calc.recommended); setManualSelection(false); }} className={`rounded-[1.35rem] border px-4 py-3 text-left backdrop-blur-xl sm:w-[175px] ${under ? 'border-[#F0A04A]/45 bg-[#6B2D12]/42' : 'border-[#77D58B]/35 bg-[#133C24]/42'}`}>
                  <span className="block text-[8px] font-black uppercase tracking-[.14em] text-white/45">{under ? 'Capacidad baja' : 'Capacidad superior'}</span>
                  <b className="mt-1 block text-xs">Usar recomendado</b>
                  <span className="mt-1 block text-[9px] text-white/42">{calc.recommended.toLocaleString('es-CL')} BTU</span>
                </button>
              ) : (
                <div className="hidden min-w-[150px] items-center justify-center rounded-[1.35rem] border border-[#72DF91]/28 bg-[#11331D]/38 px-4 py-3 text-center backdrop-blur-xl sm:flex">
                  <div><Check className="mx-auto h-4 w-4 text-[#72DF91]" /><b className="mt-1 block text-xs text-[#A6F4B8]">Ideal para tu espacio</b></div>
                </div>
              )}
            </div>
          </div>

          <aside className="grid gap-3 self-stretch">
            <div className="rounded-[1.75rem] border border-white/14 bg-black/38 p-4 shadow-[0_24px_70px_rgba(0,0,0,.20)] backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Equipo seleccionado</p><h2 className="mt-1 text-xl font-black">Rendimiento estimado</h2></div>
                <button type="button" onClick={() => setPanel(panel === 'details' ? null : 'details')} className="grid h-9 w-9 place-items-center rounded-full bg-white/7 text-white/60"><Info className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 grid gap-2">
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[.035] px-3 py-3"><span className="flex items-center gap-2 text-xs text-white/50"><Home className="h-4 w-4" /> Área recomendada</span><b className="text-sm">{calc.air.coverage} m²</b></div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[.035] px-3 py-3"><span className="flex items-center gap-2 text-xs text-white/50"><Users className="h-4 w-4" /> Personas</span><b className="text-sm">{calc.air.people}</b></div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[.035] px-3 py-3"><span className="flex items-center gap-2 text-xs text-white/50"><Zap className="h-4 w-4" /> Energía mensual</span><b className="text-sm">{Math.round(calc.monthlyKwh)} kWh</b></div>
                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[.035] px-3 py-3"><span className="flex items-center gap-2 text-xs text-white/50"><Volume2 className="h-4 w-4" /> Ruido</span><b className="text-sm">~{calc.db} dB</b></div>
              </div>
              <div className="mt-3 rounded-2xl border border-[#72DF91]/18 bg-[#0E2917]/34 p-3">
                <div className="flex items-center gap-3"><Leaf className="h-5 w-5 text-[#72DF91]" /><div><b className="text-xs">{calc.air.inverter ? 'Tecnología Inverter' : 'Funcionamiento estándar'}</b><p className="mt-0.5 text-[9px] leading-4 text-white/42">{eco ? 'Modo ahorro activo en la estimación.' : 'Modo ahorro desactivado.'}</p></div></div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/14 bg-black/38 p-4 shadow-[0_24px_70px_rgba(0,0,0,.20)] backdrop-blur-2xl">
              <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Dimensiones</p><h2 className="mt-1 text-lg font-black">Tu habitación</h2></div><span className="rounded-full bg-white/7 px-3 py-1 text-[9px] text-white/45">{people} pers.</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={0.1} onChange={setLength} />
                <Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={0.1} onChange={setWidth} />
                <Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={0.1} onChange={setHeight} />
                <Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(n) => setPeople(Math.round(n))} />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/[.045] px-3 py-2.5"><span className="text-[9px] uppercase tracking-[.12em] text-white/38">Recomendación</span><b className="text-sm text-[#FFC27A]">{calc.recommended.toLocaleString('es-CL')} BTU</b></div>
            </div>
          </aside>
        </section>

        {panel === 'climate' ? (
          <section className="mt-3 rounded-[1.75rem] border border-white/14 bg-black/48 p-4 backdrop-blur-2xl lg:mx-auto lg:w-full lg:max-w-[1040px]">
            <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-center">
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Control de clima</p><div className="mt-1 flex items-end gap-1"><b className="text-3xl">{temperature}°</b><span className="pb-1 text-xs text-white/40">C</span></div></div>
              <div className="flex flex-wrap gap-2">{(Object.keys(MODES) as Mode[]).map((key) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-full border px-3 py-2 text-[10px] font-bold ${mode === key ? 'border-white/30 bg-white/12' : 'border-white/8 bg-white/[.035] text-white/45'}`}><Snowflake className="mr-1 inline h-3 w-3" style={{ color: MODES[key].color }} />{MODES[key].label}</button>)}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setTemperature((v) => clamp(v - 1, 16, 28))} className="grid h-9 w-9 place-items-center rounded-full bg-white/7"><Minus className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setTemperature((v) => clamp(v + 1, 16, 28))} className="grid h-9 w-9 place-items-center rounded-full bg-white/7"><Plus className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setFanSpeed((v) => v >= 4 ? 1 : v + 1)} className="rounded-full bg-white/7 px-3 text-[10px]">Vent. {fanSpeed}/4</button>
                <button type="button" onClick={() => setEco((v) => !v)} className={`rounded-full px-3 text-[10px] ${eco ? 'bg-[#1F6D36]/70 text-[#B8F7C5]' : 'bg-white/7 text-white/45'}`}>Eco {eco ? 'ON' : 'OFF'}</button>
                <button type="button" onClick={() => setSound((v) => !v)} className={`rounded-full px-3 text-[10px] ${sound ? 'bg-[#5D3A18]/80 text-[#FFC27A]' : 'bg-white/7 text-white/45'}`}>Sonido {sound ? 'ON' : 'OFF'}</button>
              </div>
            </div>
          </section>
        ) : null}

        {panel === 'measure' ? (
          <section className="mt-3 rounded-[1.75rem] border border-white/14 bg-black/48 p-4 backdrop-blur-2xl lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              <Stepper label="Largo" value={length} unit="m" min={2.5} max={10} step={0.1} onChange={setLength} />
              <Stepper label="Ancho" value={width} unit="m" min={2.2} max={8} step={0.1} onChange={setWidth} />
              <Stepper label="Alto" value={height} unit="m" min={2.2} max={4} step={0.1} onChange={setHeight} />
              <Stepper label="Personas" value={people} min={1} max={10} step={1} onChange={(n) => setPeople(Math.round(n))} />
            </div>
          </section>
        ) : null}

        {panel === 'details' ? (
          <section className="mt-3 rounded-[1.75rem] border border-white/14 bg-black/48 p-4 backdrop-blur-2xl">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5AE65]">Detalle del equipo</p>
            <h3 className="mt-1 text-lg font-black">{calc.air.name}</h3>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-white/48">{calc.air.desc}</p>
            <div className="mt-3 flex flex-wrap gap-2">{calc.air.features.map((feature) => <span key={feature} className="rounded-full border border-white/8 bg-white/[.035] px-3 py-1.5 text-[9px] text-white/55">{feature}</span>)}</div>
          </section>
        ) : null}

        <section className="mt-3 rounded-[1.75rem] border border-white/14 bg-black/44 p-2.5 shadow-[0_25px_80px_rgba(0,0,0,.22)] backdrop-blur-2xl sm:p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/55">{loading ? 'Sincronizando catálogo…' : 'Aires acondicionados · Soluciones Fabrick'}</p><p className="mt-0.5 text-[8px] text-white/28">Visuales optimizados en Cloudinary · ficha técnica dinámica</p></div>
            <span className="hidden text-[9px] font-bold text-[#F6B66B] sm:block">Toca para comparar</span>
          </div>
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
              {options.map((air) => {
                const selected = air.cap === capacity;
                const recommended = air.cap === calc.recommended;
                return (
                  <button type="button" key={air.id} onClick={() => { setCapacity(air.cap); setManualSelection(true); }} className={`relative w-[178px] shrink-0 rounded-[1.25rem] border p-2.5 text-left transition active:scale-[.98] sm:w-[215px] ${selected ? 'border-[#F59A3B]/85 bg-[#F5871F]/14 shadow-[0_0_28px_rgba(245,135,31,.18)]' : 'border-white/8 bg-white/[.035]'}`}>
                    {selected ? <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#F5871F] text-black"><Check className="h-3.5 w-3.5" /></span> : null}
                    <img src={AIR_VISUALS[air.cap]} alt={air.name} className="h-20 w-full object-contain drop-shadow-[0_10px_12px_rgba(0,0,0,.24)]" loading="lazy" />
                    <div className="mt-1.5 flex items-start justify-between gap-2">
                      <div className="min-w-0"><b className="block truncate text-xs">{air.name}</b><span className="mt-0.5 block text-[9px] font-bold text-white/62">{air.cap.toLocaleString('es-CL')} BTU</span></div>
                      <span className="rounded-lg px-2 py-1 text-[9px] font-black" style={{ color: air.energyColor, background: `${air.energyColor}20` }}>{air.energy}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[8px] text-white/40"><span className="flex items-center gap-1"><Users className="h-3 w-3" />{air.people.replace(' personas', '')}</span><span className="flex items-center gap-1"><Home className="h-3 w-3" />{air.coverage} m²</span>{recommended ? <span className="ml-auto text-[#7CE594]">Ideal</span> : null}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <p className="mt-2 px-2 text-center text-[8px] leading-4 text-white/28">Consumo, costo y ruido son estimaciones orientativas cuando el catálogo no entrega un dato certificado. Confirma ficha técnica SEC/fabricante antes de comprar.</p>
      </div>
    </main>
  );
}
