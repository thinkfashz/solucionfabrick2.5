'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BedDouble, Bot, Calculator, Gauge, RotateCcw, Thermometer, X, Zap } from 'lucide-react';
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
    oscillator.frequency.value = 46 + speed * 4;
    gain.gain.value = 0.006 + speed * 0.0017;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    void context.resume();
    return () => {
      try { oscillator.stop(); void context.close(); } catch { /* noop */ }
    };
  }, [on, speed]);
}

function useHideGlobalAssistant() {
  useEffect(() => {
    const selector = 'button[aria-label="Abrir asistente Fabrick"]';
    const hide = () => document.querySelectorAll<HTMLElement>(selector).forEach((element) => { element.dataset.airHidden = '1'; element.style.display = 'none'; });
    hide();
    const observer = new MutationObserver(hide);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.querySelectorAll<HTMLElement>(`${selector}[data-air-hidden="1"]`).forEach((element) => { element.style.display = ''; delete element.dataset.airHidden; });
    };
  }, []);
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
  const [resetKey, setResetKey] = useState(0);

  useFanSound(sound, fanSpeed);
  useHideGlobalAssistant();

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

  const resetView = () => {
    setMove({ forward: false, back: false, left: false, right: false });
    setPanel(null);
    setResetKey((value) => value + 1);
  };

  const openAssistant = () => {
    const prompt = `Estoy usando la Calculadora 3D de aire acondicionado. Mi habitación mide ${length} m de largo, ${width} m de ancho y ${height} m de alto, con ${people} personas. El cálculo recomienda ${calculation.recommended.toLocaleString('es-CL')} BTU y estoy mirando ${calculation.air.name}. Ayúdame a confirmar si este equipo es adecuado y qué debería revisar antes de comprarlo.`;
    window.dispatchEvent(new CustomEvent('fabrick:agent-open', { detail: { prompt, autoSend: false } }));
  };

  return (
    <main className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[#110D0B] text-white">
      {intro ? (
        <div className="absolute inset-0 z-[100] grid place-items-center overflow-hidden bg-[#090A0C] px-5 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,135,31,.14),transparent_36%)]" />
          <div className="relative">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-[#EBA665]/25 bg-[#F5871F]/10 shadow-[0_0_45px_rgba(245,135,31,.12)]"><Zap className="h-6 w-6 text-[#EBA665]" /></div>
            <small className="mt-5 block text-[9px] font-black uppercase tracking-[.2em] text-[#EBA665]">Calculadora 3D · Real Room</small>
            <h1 className="mt-2 text-2xl font-black tracking-[-.04em]">Mide · recorre · compara</h1>
            <p className="mt-2 max-w-sm text-xs leading-6 text-white/45">Introduce tu espacio, recorre la habitación y compara la capacidad, eficiencia y cobertura de cada equipo.</p>
            <div className="mx-auto mt-6 h-1 w-56 overflow-hidden rounded-full bg-white/8"><div className="h-full w-full origin-left animate-[pulse_1.1s_ease-in-out_infinite] bg-gradient-to-r from-[#F5871F] via-[#F7C27F] to-[#75DE9A]" /></div>
          </div>
        </div>
      ) : null}

      <div className="absolute inset-0">
        <GameScene width={roomWidth} depth={roomDepth} height={roomHeight} air={calculation.air} mode={mode} speed={fanSpeed} move={move} resetKey={resetKey} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,4,.28),transparent_22%,transparent_70%,rgba(7,5,4,.58))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 p-3 sm:p-5">
        <div className="pointer-events-auto flex min-w-0 items-start gap-2">
          <button type="button" onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/14 bg-[#0B0D10]/58 shadow-[0_10px_30px_rgba(0,0,0,.3)] backdrop-blur-xl" aria-label="Volver a tienda"><ArrowLeft className="h-4 w-4" /></button>
          <Glass className="min-w-0 max-w-[215px] rounded-[1.35rem] px-3.5 py-2.5 sm:max-w-none sm:rounded-full">
            <small className="block truncate text-[7px] font-black uppercase tracking-[.16em] text-[#F2AE68]">Calculadora 3D · PBR</small>
            <b className="block truncate text-[11px]">{calculation.area.toLocaleString('es-CL', { maximumFractionDigits: 1 })} m² · {calculation.btu.toLocaleString('es-CL')} BTU</b>
            <span className="mt-0.5 flex items-center gap-1 text-[8px] text-white/38"><BedDouble className="h-3 w-3" />Dormitorio principal</span>
          </Glass>
        </div>

        <div className="pointer-events-auto flex shrink-0 gap-1.5 lg:hidden">
          {[
            { key: 'measure' as const, icon: Calculator, label: 'Calcular', action: () => setPanel(panel === 'measure' ? null : 'measure') },
            { key: 'climate' as const, icon: Thermometer, label: 'Clima', action: () => setPanel(panel === 'climate' ? null : 'climate') },
            { key: 'reset' as const, icon: RotateCcw, label: 'Reiniciar', action: resetView },
          ].map(({ key, icon: Icon, label, action }) => (
            <button key={key} type="button" onClick={action} className="flex flex-col items-center gap-1 text-[7px] font-bold text-white/48">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-[#0B0D10]/58 shadow-[0_10px_25px_rgba(0,0,0,.24)] backdrop-blur-xl"><Icon className="h-4 w-4 text-white/80" /></span>
              <span className="hidden min-[390px]:block">{label}</span>
            </button>
          ))}
        </div>
      </header>

      <aside className="pointer-events-none absolute left-5 top-[116px] z-30 hidden w-[280px] lg:block"><Glass className="pointer-events-auto rounded-[1.7rem] p-4"><MeasurePanel length={length} setLength={setLength} width={width} setWidth={setWidth} height={height} setHeight={setHeight} people={people} setPeople={setPeople} recommended={calculation.recommended} /></Glass></aside>
      <aside className="pointer-events-none absolute right-5 top-[116px] z-30 hidden w-[292px] lg:block"><Glass className="pointer-events-auto rounded-[1.7rem] p-4"><Climate temp={temperature} setTemp={setTemperature} speed={fanSpeed} setSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} kwh={calculation.kwh} cost={calculation.cost} /></Glass></aside>
      <aside className="pointer-events-none absolute bottom-[205px] right-5 z-30 hidden w-[330px] lg:block"><Glass className="pointer-events-auto rounded-[1.7rem] p-4"><ProductInfo air={calculation.air} /></Glass></aside>

      {panel ? (
        <div className="pointer-events-auto absolute inset-x-3 top-[118px] z-50 lg:hidden">
          <Glass className="mx-auto max-h-[58svh] max-w-md overflow-y-auto rounded-[1.55rem] p-3.5">
            <div className="mb-3 flex items-center justify-between"><b className="text-xs">{panel === 'measure' ? 'Calcula tu habitación' : panel === 'climate' ? 'Control de clima' : 'Detalle del equipo'}</b><button type="button" onClick={() => setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7" aria-label="Cerrar panel"><X className="h-3.5 w-3.5" /></button></div>
            {panel === 'measure' ? <MeasurePanel length={length} setLength={setLength} width={width} setWidth={setWidth} height={height} setHeight={setHeight} people={people} setPeople={setPeople} recommended={calculation.recommended} /> : panel === 'climate' ? <Climate temp={temperature} setTemp={setTemperature} speed={fanSpeed} setSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} kwh={calculation.kwh} cost={calculation.cost} /> : <ProductInfo air={calculation.air} />}
          </Glass>
        </div>
      ) : null}

      <MovePad set={setMove} />

      <button type="button" onClick={openAssistant} className="pointer-events-auto absolute bottom-[154px] right-3 z-40 grid h-12 w-12 place-items-center rounded-full border border-[#F5A85B]/55 bg-[#140C07]/78 text-[#F6B36D] shadow-[0_12px_32px_rgba(0,0,0,.38),0_0_22px_rgba(245,135,31,.12)] backdrop-blur-xl md:bottom-[210px] md:right-5" aria-label="Consultar sobre este equipo"><Bot className="h-5 w-5" /></button>

      <section className="pointer-events-none absolute inset-x-0 bottom-2 z-40 flex justify-center px-2.5 sm:bottom-4 sm:px-4">
        <Glass className="pointer-events-auto w-full max-w-[940px] rounded-[1.65rem] p-2.5">
          <div className="mb-1.5 flex items-center justify-between px-1.5">
            <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.13em] text-white/42"><Gauge className="h-3 w-3 text-[#F2AE68]" />{loading ? 'Sincronizando catálogo…' : 'Equipos · toca para comparar'}</span>
            <button type="button" onClick={() => setPanel('product')} className="text-[8px] font-black uppercase tracking-[.12em] text-[#F2AE68]">Ver ficha →</button>
          </div>
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max gap-2">
              {options.map((air) => {
                const selected = air.cap === capacity;
                const ideal = air.cap === calculation.recommended;
                return (
                  <button
                    type="button"
                    key={air.id}
                    onClick={() => selected ? setPanel('product') : setCapacity(air.cap)}
                    className={`relative min-w-[148px] rounded-[1.2rem] border px-2.5 pb-2.5 pt-2 text-left transition sm:min-w-[190px] ${selected ? 'border-[#F5A85B]/80 bg-[#F5871F]/12 shadow-[0_0_30px_rgba(245,135,31,.14),inset_0 0 28px_rgba(245,135,31,.035)]' : 'border-white/8 bg-white/[.035]'}`}
                  >
                    {ideal ? <span className="absolute right-2 top-2 rounded-full border border-[#F5A85B]/35 bg-[#F5871F] px-2 py-1 text-[7px] font-black uppercase text-black">Ideal</span> : null}
                    <Thumb air={air} compact />
                    <b className={`mt-1 block max-w-[126px] truncate text-[11px] ${selected ? 'text-[#F3B06B]' : 'text-white'}`}>{air.name}</b>
                    <small className="mt-0.5 block text-[8px] text-white/40">{air.people} · {air.coverage} m²</small>
                    <div className="mt-2 flex items-center justify-between gap-2"><b className="text-[10px]">{air.cap.toLocaleString('es-CL')} BTU</b><span className="rounded-full px-2 py-1 text-[8px] font-black" style={{ color: air.energyColor, background: `${air.energyColor}1B` }}>{air.energy}</span></div>
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
