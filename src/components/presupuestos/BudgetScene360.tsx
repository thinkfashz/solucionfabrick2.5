'use client';

import { useMemo, useState } from 'react';
import ThreeAirRoomViewer from '@/components/presupuestos/ThreeAirRoomViewer';
import ThreeRadierViewer from '@/components/presupuestos/ThreeRadierViewer';

type SceneKind = 'radier' | 'aire' | 'default';

type BudgetScene360Props = {
  kind?: SceneKind;
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>;
  compact?: boolean;
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function readNumber(data: Record<string, unknown> | undefined, key: string, fallback = 0) {
  const value = data?.[key];
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(data: Record<string, unknown> | undefined, key: string, fallback = '') {
  const value = data?.[key];
  return typeof value === 'string' ? value : fallback;
}

function ClientConsumptionCalculator({ data }: { data?: Record<string, unknown> }) {
  const [potenciaW, setPotenciaW] = useState(() => readNumber(data, 'potenciaW', readNumber(data, 'watts', 1580)));
  const [horasDia, setHorasDia] = useState(() => readNumber(data, 'horasDia', 6));
  const [diasMes, setDiasMes] = useState(() => readNumber(data, 'diasMes', 30));
  const [tarifaKwh, setTarifaKwh] = useState(() => readNumber(data, 'tarifaKwh', 210));
  const [modo, setModo] = useState<'normal' | 'inverter'>('inverter');

  const calc = useMemo(() => {
    const baseKwh = Math.max(0, potenciaW) / 1000 * Math.max(0, horasDia) * Math.max(0, diasMes);
    const factor = modo === 'inverter' ? 0.72 : 1;
    const kwh = baseKwh * factor;
    const costo = kwh * Math.max(0, tarifaKwh);
    const ahorro = baseKwh ? Math.round((1 - kwh / baseKwh) * 100) : 0;
    return { baseKwh, kwh, costo, ahorro };
  }, [diasMes, horasDia, modo, potenciaW, tarifaKwh]);

  return <section className="rounded-[2rem] border border-cyan-300/15 bg-black/65 p-4 text-white shadow-2xl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">Calculadora consumo kWh</p><h3 className="mt-1 text-2xl font-black">Calcula tu consumo mensual</h3><p className="mt-1 text-sm text-zinc-400">El cliente puede cambiar horas de uso, días y tarifa desde el link público.</p></div>
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-right"><p className="text-xs text-zinc-400">Estimado mensual</p><b className="block text-2xl text-cyan-200">{money.format(calc.costo)}</b></div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-4">
      <NumberField label="Potencia W" value={potenciaW} onChange={setPotenciaW} />
      <NumberField label="Horas/día" value={horasDia} onChange={setHorasDia} />
      <NumberField label="Días/mes" value={diasMes} onChange={setDiasMes} />
      <NumberField label="Tarifa kWh" value={tarifaKwh} onChange={setTarifaKwh} />
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr_1fr_1fr]">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[.045] p-2"><button type="button" onClick={() => setModo('normal')} className={`rounded-xl px-3 py-2 text-xs font-black ${modo === 'normal' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>Normal</button><button type="button" onClick={() => setModo('inverter')} className={`rounded-xl px-3 py-2 text-xs font-black ${modo === 'inverter' ? 'bg-cyan-300 text-black' : 'bg-white/10 text-white'}`}>Inverter</button></div>
      <MiniStat label="Consumo" value={`${num.format(calc.kwh)} kWh/mes`} />
      <MiniStat label="Ahorro estimado" value={`${calc.ahorro}%`} />
      <MiniStat label="BTU equipo" value={`${whole.format(readNumber(data, 'seleccionado', 12000))} BTU`} />
    </div>
  </section>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}<input type="number" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value) || 0)} className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/70"/></label>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p><b className="mt-1 block text-lg text-white">{value}</b></div>;
}

export default function BudgetScene360({ kind = 'default', title, data, compact = false }: BudgetScene360Props) {
  if (kind === 'radier') {
    return <ThreeRadierViewer
      title={title || 'Radier 3D interactivo'}
      compact={compact}
      shape={readString(data, 'shape', readString(data, 'forma', 'rect'))}
      largo={readNumber(data, 'largo', 6)}
      ancho={readNumber(data, 'ancho', 4)}
      brazoX={readNumber(data, 'brazoX', 3)}
      brazoY={readNumber(data, 'brazoY', 2)}
      vanoW={readNumber(data, 'vanoW', 2)}
      vanoD={readNumber(data, 'vanoD', 2)}
      almaW={readNumber(data, 'almaW', 1.4)}
      almaD={readNumber(data, 'almaD', 2.2)}
      espesor={readNumber(data, 'espesor', readNumber(data, 'espesorCm', 10))}
      base={readNumber(data, 'base', readNumber(data, 'estabilizadoCm', 10))}
      gravillaBase={readNumber(data, 'gravillaBase', readNumber(data, 'gravillaCm', 5))}
      area={readNumber(data, 'area', 24)}
      hormigon={readNumber(data, 'hormigon', 2.4)}
      sacos={readNumber(data, 'sacos', 17)}
    />;
  }

  if (kind === 'aire') {
    return <div className="grid gap-4">
      <ThreeAirRoomViewer
        title={title || 'Habitación 360 + aire acondicionado'}
        compact={compact}
        area={readNumber(data, 'area', 14.7)}
        btu={readNumber(data, 'btu', 12895)}
        seleccionado={readNumber(data, 'seleccionado', 13000)}
        largo={readNumber(data, 'largo', 4.2)}
        ancho={readNumber(data, 'ancho', 3.5)}
        alto={readNumber(data, 'alto', 2.5)}
      />
      <ClientConsumptionCalculator data={data} />
    </div>;
  }

  return <section className="overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#050505] p-6 text-white shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Visor 3D</p><h2 className="mt-2 text-3xl font-black">{title || 'Escena técnica'}</h2><p className="mt-2 text-sm text-zinc-400">Selecciona un motor para cargar una escena interactiva.</p></section>;
}
