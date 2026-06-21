'use client';

import ThreeRadierViewer from '@/components/presupuestos/ThreeRadierViewer';

type SceneKind = 'radier' | 'aire' | 'default';

type BudgetScene360Props = {
  kind?: SceneKind;
  title?: string;
  subtitle?: string;
  data?: Record<string, unknown>;
  compact?: boolean;
};

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

export default function BudgetScene360({ kind = 'default', title, subtitle, data, compact = false }: BudgetScene360Props) {
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

  const isAir = kind === 'aire';
  const area = readNumber(data, 'area', 16);
  const btu = readNumber(data, 'btu', 12000);
  const equipo = readNumber(data, 'seleccionado', 12000);

  return <section className={`overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#050505] text-white shadow-2xl ${compact ? 'min-h-[340px]' : 'min-h-[460px]'}`}>
    <div className="border-b border-white/10 p-4 sm:p-5">
      <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Visor 360 interactivo</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{title || (isAir ? 'Cuarto + condensador 360' : 'Escena técnica 360')}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">{subtitle || 'Vista técnica liviana para revisar la propuesta.'}</p>
    </div>
    <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px]">
      <div className="relative grid min-h-[280px] place-items-center overflow-hidden rounded-[1.65rem] border border-white/10 bg-[radial-gradient(circle_at_50%_45%,rgba(250,204,21,.14),transparent_20rem),rgba(0,0,0,.42)]">
        <div className="absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
        {isAir ? <div className="relative h-52 w-80 rotate-[-6deg] rounded-3xl border border-cyan-200/25 bg-slate-950 shadow-2xl shadow-cyan-500/10"><div className="absolute left-8 top-8 h-20 w-44 rounded-2xl bg-cyan-50 shadow-xl"><div className="absolute bottom-3 left-6 right-6 h-1 rounded-full bg-cyan-400" /></div><div className="absolute bottom-8 right-7 h-24 w-24 rounded-3xl border border-white/20 bg-slate-800"><div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-[7px] border-cyan-200/70" /></div><div className="absolute left-48 top-16 h-2 w-28 rounded-full bg-gradient-to-r from-cyan-300 via-white to-orange-300 shadow-lg shadow-cyan-400/20" /></div> : <div className="h-36 w-80 rotate-[-8deg] rounded-3xl border border-amber-300/35 bg-gradient-to-br from-amber-200 via-orange-700 to-stone-900 shadow-2xl" />}
      </div>
      <div className="grid content-start gap-2">
        <Metric label="Área" value={`${num.format(area)} m²`} />
        {isAir ? <><Metric label="BTU requerido" value={whole.format(btu)} /><Metric label="Equipo" value={`${whole.format(equipo)} BTU`} accent /></> : <><Metric label="Estado" value="Activo" /><Metric label="Modo" value="Interactivo" accent /></>}
      </div>
    </div>
  </section>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</p><p className={`mt-1 truncate text-xl font-black tracking-tight ${accent ? 'text-amber-300' : 'text-white'}`}>{value}</p></div>;
}
