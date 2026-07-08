'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Calculator, Droplets, Gauge, Home, Info, PlugZap, Ruler, ShieldCheck, Sparkles, TreePine } from 'lucide-react';

const PRICE_MIN = 540000;
const PRICE_MID = 650000;
const PRICE_MAX = 780000;

const FINISH_LEVELS = [
  {
    id: 'esencial',
    label: 'Base funcional',
    price: PRICE_MIN,
    text: 'Terminaciones simples, revestimientos económicos y enfoque en una vivienda funcional.',
  },
  {
    id: 'intermedia',
    label: 'Intermedia equilibrada',
    price: PRICE_MID,
    text: 'Mejor balance entre estructura, revestimiento, instalaciones y terminaciones visibles.',
  },
  {
    id: 'premium',
    label: 'Terminación superior',
    price: PRICE_MAX,
    text: 'Mejores materiales, revestimientos de mayor presencia y más detalle en terminaciones.',
  },
] as const;

const COST_BALANCE = [
  { key: 'obra', label: 'Estructura, mano de obra y montaje', pct: 0.42, icon: Home },
  { key: 'terminaciones', label: 'Terminaciones y revestimientos', pct: 0.24, icon: Sparkles },
  { key: 'instalaciones', label: 'Electricidad, agua y sanitarios interiores', pct: 0.14, icon: PlugZap },
  { key: 'fosa', label: 'Fosa, empalme eléctrico y conexión de red de agua', pct: 0.12, icon: Droplets },
  { key: 'gestion', label: 'Gestión, traslado, imprevistos y ajustes', pct: 0.08, icon: ShieldCheck },
];

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function clampM2(value: string) {
  const clean = value.replace(/[^0-9.]/g, '');
  const parsed = Number(clean);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 500);
}

export default function ConstructionM2Calculator() {
  const [m2Input, setM2Input] = useState('72');
  const [level, setLevel] = useState<(typeof FINISH_LEVELS)[number]['id']>('intermedia');
  const m2 = clampM2(m2Input);
  const selected = FINISH_LEVELS.find((item) => item.id === level) || FINISH_LEVELS[1];

  const estimate = useMemo(() => {
    const min = m2 * PRICE_MIN;
    const mid = m2 * selected.price;
    const max = m2 * PRICE_MAX;
    return { min, mid, max };
  }, [m2, selected.price]);

  const balance = useMemo(() => COST_BALANCE.map((item) => ({
    ...item,
    amount: estimate.mid * item.pct,
  })), [estimate.mid]);

  const whatsappMessage = encodeURIComponent(`Hola, quiero evaluar una construcción de casa de ${m2 || 0} m². La calculadora me dio un rango aproximado entre ${formatCLP(estimate.min)} y ${formatCLP(estimate.max)}, con referencia ${selected.label} en ${formatCLP(estimate.mid)}. Quiero revisar terminaciones, revestimiento, fosa, empalme eléctrico y conexión de agua.`);

  return (
    <section id="calculadora-m2" className="relative overflow-hidden bg-[#070604] px-3 pb-10 pt-24 text-white sm:px-6 lg:px-8 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(250,204,21,.24),transparent_26rem),radial-gradient(circle_at_86%_22%,rgba(20,184,166,.15),transparent_30rem),linear-gradient(180deg,#070604,#0d0b07_50%,#050505)]" />
      <div className="relative mx-auto grid w-full max-w-[1500px] gap-5 lg:grid-cols-[minmax(0,1fr)_520px]">
        <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/18 bg-[linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025))] p-5 shadow-[0_35px_120px_rgba(0,0,0,.55)] backdrop-blur-xl sm:rounded-[2.6rem] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200">
              <Calculator className="h-4 w-4" /> Calculadora inicial m²
            </div>
            <h1 className="mt-7 max-w-5xl text-4xl font-black leading-[.92] tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
              Calcula una casa por metro cuadrado antes de cotizar.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-200 sm:text-lg">
              Referencia inicial para construcción de casa desde <b className="text-yellow-300">{formatCLP(PRICE_MIN)}/m²</b> hasta <b className="text-yellow-300">{formatCLP(PRICE_MAX)}/m²</b>. El valor final depende de terminaciones, material de revestimiento, complejidad del terreno, fosa, empalme eléctrico y conexión de red de agua.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <ScopeCard icon={<Sparkles className="h-5 w-5" />} title="Terminaciones" text="Piso, cielos, pintura, puertas, ventanas, cocina, baño y nivel de detalle visual." />
              <ScopeCard icon={<TreePine className="h-5 w-5" />} title="Revestimiento" text="El precio cambia si usas siding, fibrocemento, madera, OSB, volcanita, cerámica u otros acabados." />
              <ScopeCard icon={<PlugZap className="h-5 w-5" />} title="Conexiones" text="Fosa, empalme eléctrico y conexión de agua se revisan según terreno y distancia a redes." />
            </div>

            <div className="mt-8 rounded-[1.6rem] border border-teal-300/20 bg-teal-300/10 p-5">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-teal-200"><Info className="h-4 w-4" /> Importante</p>
              <p className="mt-3 text-sm leading-7 text-teal-50/78">
                Este cálculo es una guía rápida, no una cotización cerrada. Para precio final se revisan planos, ubicación, accesos, fundaciones, tipo de estructura, revestimientos, instalaciones, permisos y alcance exacto de obra.
              </p>
            </div>
          </div>
        </div>

        <aside className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-black/55 p-5 shadow-[0_35px_120px_rgba(0,0,0,.48)] backdrop-blur-2xl sm:rounded-[2.6rem] sm:p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-amber-500 to-teal-300" />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Simulador de inversión</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Balance de gasto</h2>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black"><Gauge className="h-5 w-5" /></span>
          </div>

          <label className="mt-6 block rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-4">
            <span className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400"><Ruler className="h-4 w-4 text-yellow-300" /> Metros cuadrados de la casa</span>
            <div className="flex items-end gap-3">
              <input value={m2Input} onChange={(event) => setM2Input(event.target.value)} inputMode="decimal" className="w-full bg-transparent text-5xl font-black tracking-[-0.07em] text-white outline-none placeholder:text-white/20" placeholder="72" />
              <span className="pb-2 text-xl font-black text-yellow-300">m²</span>
            </div>
          </label>

          <div className="mt-4 grid gap-2">
            {FINISH_LEVELS.map((item) => (
              <button key={item.id} type="button" onClick={() => setLevel(item.id)} className={`rounded-[1.25rem] border p-4 text-left transition ${level === item.id ? 'border-yellow-300/55 bg-yellow-300 text-black shadow-[0_18px_40px_rgba(250,204,21,.18)]' : 'border-white/10 bg-white/[0.04] text-white hover:border-yellow-300/35'}`}>
                <span className="flex items-start justify-between gap-3">
                  <span><b className="block text-sm font-black uppercase tracking-[0.12em]">{item.label}</b><span className={`mt-1 block text-xs leading-5 ${level === item.id ? 'text-black/70' : 'text-zinc-400'}`}>{item.text}</span></span>
                  <b className="shrink-0 text-sm">{formatCLP(item.price)}/m²</b>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.18),transparent_14rem),rgba(250,204,21,.08)] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-200">Rango estimado</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <TotalBox label="Desde" value={estimate.min} />
              <TotalBox label="Referencia" value={estimate.mid} active />
              <TotalBox label="Hasta" value={estimate.max} />
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/40">
              <div key={`${m2}-${level}`} className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-teal-300 transition-all duration-700" style={{ width: `${m2 ? Math.min(100, Math.max(12, (selected.price / PRICE_MAX) * 100)) : 8}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-yellow-50/62">Animación referencial según nivel seleccionado y cantidad de m².</p>
          </div>

          <div className="mt-5 space-y-3">
            {balance.map(({ key, label, amount, pct, icon: Icon }) => (
              <div key={key} className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-zinc-300"><Icon className="h-4 w-4 text-yellow-300" />{label}</span>
                  <b className="text-white">{formatCLP(amount)}</b>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-teal-300" style={{ width: `${pct * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <a href={`https://wa.me/56930121625?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1.3rem] bg-yellow-300 px-5 py-4 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
            Enviar cálculo por WhatsApp <ArrowRight className="h-4 w-4" />
          </a>
        </aside>
      </div>
    </section>
  );
}

function ScopeCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300/12 text-yellow-300">{icon}</span>
      <b className="mt-4 block text-sm font-black uppercase tracking-[0.12em] text-white">{title}</b>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}

function TotalBox({ label, value, active }: { label: string; value: number; active?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${active ? 'border-yellow-300/40 bg-yellow-300 text-black' : 'border-white/10 bg-black/30 text-white'}`}>
      <span className={`block text-[9px] font-black uppercase tracking-[0.18em] ${active ? 'text-black/60' : 'text-white/45'}`}>{label}</span>
      <b className="mt-1 block text-sm font-black sm:text-base">{formatCLP(value)}</b>
    </div>
  );
}
