'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calculator, Gauge, Thermometer, X, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { GameScene } from './airGameV5/scene';
import { CAPS, MODES, buildAirOptions, clamp, type Capacity, type Mode, type MoveState } from './airGameV5/model';
import { Climate, Glass, MeasurePanel, MovePad, ProductInfo, Thumb } from './airGameV5/ui';

function useFanSound(on: boolean, speed: number) {
  useEffect(() => {
    if (!on) return;
    const AudioContextCtor = window.AudioContext || ((window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 48 + speed * 4;
    gain.gain.value = 0.008 + speed * 0.002;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    void context.resume();
    return () => {
      try { oscillator.stop(); void context.close(); } catch { /* noop */ }
    };
  }, [on, speed]);
}

export default function AirGameExperienceV4() {
  const router = useRouter();
  const { products, loading } = useCatalogProducts();
  const options = useMemo(() => buildAirOptions(products), [products]);
  const [length, setLength] = useState(5.4);
  const [width, setWidth] = useState(4.4);
  const [height, setHeight] = useState(2.7);
  const [people, setPeople] = useState(2);
  const [capacity, setCapacity] = useState<Capacity>(12000);
  const [temperature, setTemperature] = useState(22);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [mode, setMode] = useState<Mode>('frio');
  const [eco, setEco] = useState(true);
  const [sound, setSound] = useState(false);
  const [panel, setPanel] = useState<'measure' | 'climate' | 'product' | null>(null);
  const [move, setMove] = useState<MoveState>({ forward: false, back: false, left: false, right: false });
  const [intro, setIntro] = useState(true);

  useFanSound(sound, fanSpeed);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const calculation = useMemo(() => {
    const area = length * width;
    const volume = area * height;
    const btu = Math.ceil(area * 600 + volume * 55 + people * 600 + 350 * 3.412);
    const recommended = (CAPS.find((candidate) => candidate >= btu) || 24000) as Capacity;
    const air = options.find((option) => option.cap === capacity) || options[1];
    const temperatureFactor = temperature <= 18 ? 0.82 : temperature <= 20 ? 0.68 : temperature <= 22 ? 0.56 : temperature <= 24 ? 0.46 : 0.38;
    const kwh = air.power * temperatureFactor * (0.88 + fanSpeed * 0.04) * MODES[mode].factor * (eco ? 0.78 : 1) * 4 * 30;
    return { area, btu, recommended, air, kwh, cost: Math.round(kwh * 263) };
  }, [length, width, height, people, options, capacity, temperature, fanSpeed, mode, eco]);

  useEffect(() => setCapacity(calculation.recommended), [calculation.recommended]);

  const roomWidth = clamp(width, 2.8, 7.5);
  const roomDepth = clamp(length, 3.2, 8.5);
  const roomHeight = clamp(height, 2.2, 3.6);

  return (
    <main className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[#12100f] text-white">
      <style>{`button[aria-label="Abrir asistente Fabrick"]{display:none!important}`}</style>

      {intro ? (
        <div className="absolute inset-0 z-[100] grid place-items-center bg-[#090A0C] px-5 text-center">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-[#EBA665]/25 bg-[#F5871F]/10"><Zap className="h-6 w-6 text-[#EBA665]" /></div>
            <small className="mt-5 block text-[9px] font-black uppercase tracking-[.2em] text-[#EBA665]">Real Room · PBR</small>
            <h1 className="mt-2 text-2xl font-black">Mide · recorre · compara</h1>
            <p className="mt-2 max-w-sm text-xs leading-6 text-white/45">La habitación se adapta a tus medidas y compara equipos del catálogo dentro del espacio.</p>
            <div className="mx-auto mt-6 h-1 w-52 overflow-hidden rounded-full bg-white/8"><div className="h-full w-full animate-pulse bg-gradient-to-r from-[#F5871F] to-[#75DE9A]" /></div>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-0"><GameScene w={roomWidth} d={roomDepth} h={roomHeight} air={calculation.air} mode={mode} speed={fanSpeed} move={move} /></div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,4,5,.22),transparent_24%,transparent_74%,rgba(4,4,5,.62))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-between p-3 sm:p-5">
        <div className="pointer-events-auto flex gap-2">
          <button type="button" onClick={() => navigateWithTransition('/tienda', router)} className="grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-black/45 backdrop-blur-xl sm:h-11 sm:w-11"><ArrowLeft className="h-4 w-4" /></button>
          <Glass className="rounded-full px-3 py-2 sm:px-3.5">
            <small className="block text-[7px] font-black uppercase tracking-[.15em] text-[#EBA665]">Calculadora 3D · PBR</small>
            <b className="text-[10px]">{calculation.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m² · {calculation.btu.toLocaleString('es-CL')} BTU</b>
          </Glass>
        </div>
        <div className="pointer-events-auto flex gap-1.5 lg:hidden">
          {([['measure', Calculator], ['climate', Thermometer], ['product', Gauge]] as const).map(([key, Icon]) => (
            <button key={key} type="button" onClick={() => setPanel(panel === key ? null : key)} className="grid h-9 w-9 place-items-center rounded-full border border-white/14 bg-black/45 backdrop-blur-xl sm:h-10 sm:w-10"><Icon className="h-4 w-4" /></button>
          ))}
        </div>
      </header>

      <aside className="pointer-events-none absolute left-5 top-[110px] z-30 hidden w-[270px] lg:block">
        <Glass className="pointer-events-auto rounded-[1.6rem] p-3.5"><MeasurePanel length={length} setLength={setLength} width={width} setWidth={setWidth} height={height} setHeight={setHeight} people={people} setPeople={setPeople} recommended={calculation.recommended} /></Glass>
      </aside>
      <aside className="pointer-events-none absolute right-5 top-[110px] z-30 hidden w-[282px] lg:block">
        <Glass className="pointer-events-auto rounded-[1.6rem] p-3.5"><Climate temp={temperature} setTemp={setTemperature} speed={fanSpeed} setSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} kwh={calculation.kwh} cost={calculation.cost} /></Glass>
      </aside>
      <aside className="pointer-events-none absolute bottom-[164px] right-5 z-30 hidden w-[320px] lg:block">
        <Glass className="pointer-events-auto rounded-[1.6rem] p-3.5"><ProductInfo a={calculation.air} /></Glass>
      </aside>

      {panel ? (
        <div className="pointer-events-auto absolute inset-x-3 top-[112px] z-50 lg:hidden">
          <Glass className="mx-auto max-w-md rounded-[1.5rem] p-3.5">
            <div className="mb-3 flex justify-between"><b className="text-xs">{panel === 'measure' ? 'Dimensiones' : panel === 'climate' ? 'Control de clima' : 'Equipo seleccionado'}</b><button type="button" onClick={() => setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7"><X className="h-3.5 w-3.5" /></button></div>
            {panel === 'measure' ? <MeasurePanel length={length} setLength={setLength} width={width} setWidth={setWidth} height={height} setHeight={setHeight} people={people} setPeople={setPeople} recommended={calculation.recommended} /> : panel === 'climate' ? <Climate temp={temperature} setTemp={setTemperature} speed={fanSpeed} setSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} kwh={calculation.kwh} cost={calculation.cost} /> : <ProductInfo a={calculation.air} />}
          </Glass>
        </div>
      ) : null}

      <MovePad set={setMove} />

      <section className="pointer-events-none absolute inset-x-0 bottom-2 z-40 flex justify-center px-2.5 sm:bottom-5 sm:px-4">
        <Glass className="pointer-events-auto w-full max-w-[920px] rounded-[1.4rem] p-1.5 sm:rounded-[1.55rem] sm:p-2">
          <div className="mb-0.5 flex items-center justify-between px-2 sm:mb-1">
            <span className="text-[7px] font-black uppercase tracking-[.12em] text-white/40 sm:text-[8px]">{loading ? 'Sincronizando catálogo…' : 'Equipos · toca para comparar'}</span>
            <span className="hidden text-[8px] text-white/25 sm:inline">PBR CC0 · rendimiento adaptativo</span>
          </div>
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-1.5 sm:gap-2">
              {options.map((air) => {
                const selected = air.cap === capacity;
                const ideal = air.cap === calculation.recommended;
                return (
                  <button type="button" key={air.id} onClick={() => setCapacity(air.cap)} className={`min-w-[112px] rounded-xl border px-2 pb-1.5 pt-1 text-left sm:min-w-[178px] sm:rounded-2xl sm:px-2.5 sm:pb-2 sm:pt-1.5 ${selected ? 'border-[#F7B260]/80 bg-[#F5871F]/18 shadow-[0_0_24px_rgba(245,135,31,.18)]' : 'border-white/8 bg-white/[.045]'}`}>
                    <Thumb a={air} />
                    <div className="flex items-end justify-between gap-1">
                      <div className="min-w-0"><b className={`block truncate text-[10px] sm:text-xs ${selected ? 'text-[#F5B76F]' : ''}`}>{air.name}</b><small className="block truncate text-[7px] text-white/45 sm:text-[8px]">{ideal ? 'Ideal para tu espacio' : `${air.people} · ${air.coverage} m²`}</small></div>
                      <span className="shrink-0 rounded-full px-1.5 py-1 text-[7px] font-black sm:text-[8px]" style={{ color: air.energyColor, background: `${air.energyColor}18` }}>{air.energy}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Glass>
      </section>
    </main>
  );
}
