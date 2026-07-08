'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Droplets, Hammer, Home, Info, PlugZap, Ruler, ShieldCheck, Sparkles, TreePine } from 'lucide-react';

const PRICE_MIN = 540000;
const PRICE_MID = 650000;
const PRICE_MAX = 780000;

const FINISH_LEVELS = [
  {
    id: 'base',
    label: 'Base funcional',
    price: PRICE_MIN,
    short: 'Económica',
    text: 'Para una vivienda funcional con terminaciones simples y materiales controlados.',
  },
  {
    id: 'media',
    label: 'Intermedia equilibrada',
    price: PRICE_MID,
    short: 'Equilibrada',
    text: 'Buen balance entre estructura, instalaciones, revestimientos y terminaciones visibles.',
  },
  {
    id: 'alta',
    label: 'Terminación superior',
    price: PRICE_MAX,
    short: 'Superior',
    text: 'Mayor inversión en revestimientos, detalles, materialidad y terminaciones finales.',
  },
] as const;

const COST_BALANCE = [
  { key: 'estructura', label: 'Estructura, fundaciones, mano de obra y montaje', pct: 0.42, Icon: Home },
  { key: 'terminaciones', label: 'Terminaciones y material de revestimiento', pct: 0.24, Icon: Sparkles },
  { key: 'instalaciones', label: 'Instalación eléctrica, sanitaria y red interior de agua', pct: 0.14, Icon: PlugZap },
  { key: 'exteriores', label: 'Fosa, empalme eléctrico y conexión a red de agua', pct: 0.12, Icon: Droplets },
  { key: 'gestion', label: 'Traslados, gestión, ajustes e imprevistos', pct: 0.08, Icon: ShieldCheck },
] as const;

const INCLUDED_NOTES = [
  { Icon: Hammer, title: 'Obra base', text: 'Estructura, montaje, partidas principales y mano de obra según alcance.' },
  { Icon: TreePine, title: 'Revestimientos', text: 'El valor cambia por siding, fibrocemento, madera, OSB, volcanita, cerámica u otros.' },
  { Icon: Droplets, title: 'Servicios del terreno', text: 'Fosa, empalme eléctrico y conexión de red de agua se revisan según ubicación y distancia.' },
];

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
}

function normalizeM2(value: string) {
  const cleaned = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const normalized = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  const parsed = Number(normalized);
  return {
    display: normalized,
    value: Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 500) : 0,
  };
}

export default function ConstructionM2Calculator() {
  const [m2Input, setM2Input] = useState('72');
  const [level, setLevel] = useState<(typeof FINISH_LEVELS)[number]['id']>('media');

  const m2Data = normalizeM2(m2Input);
  const m2 = m2Data.value;
  const finish = FINISH_LEVELS.find((item) => item.id === level) || FINISH_LEVELS[1];

  const summary = useMemo(() => {
    const base = m2 * PRICE_MIN;
    const selected = m2 * finish.price;
    const high = m2 * PRICE_MAX;
    const ivaReference = selected * 0.19;
    const progress = m2 > 0 ? Math.min(100, Math.max(8, ((finish.price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 70 + 20)) : 0;
    return { base, selected, high, ivaReference, progress };
  }, [m2, finish.price]);

  const balance = useMemo(() => COST_BALANCE.map((item) => ({
    ...item,
    amount: summary.selected * item.pct,
  })), [summary.selected]);

  const whatsappMessage = encodeURIComponent(
    `Hola, quiero evaluar una construcción de casa de ${m2 || 0} m². Nivel: ${finish.label}. Referencia: ${formatCLP(summary.selected)}. Rango estimado: ${formatCLP(summary.base)} a ${formatCLP(summary.high)}. Quiero revisar terminaciones, revestimiento, fosa, empalme eléctrico y conexión de agua.`,
  );

  function updateM2(value: string) {
    const next = normalizeM2(value);
    setM2Input(next.display);
  }

  return (
    <section id="calculadora-m2" className="relative overflow-hidden bg-[#060504] px-4 pb-14 pt-24 text-white sm:px-6 lg:px-8 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(250,204,21,.22),transparent_28rem),radial-gradient(circle_at_85%_10%,rgba(20,184,166,.14),transparent_30rem),linear-gradient(180deg,#070604,#0b0906_52%,#050505)]" />

      <div className="relative mx-auto max-w-[1500px]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-start">
          <div className="pt-2 lg:pt-10">
            <div className="inline-flex items-center gap-2 border-b border-yellow-300/50 pb-2 text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">
              <Calculator className="h-4 w-4" /> Calculadora m² en vivo
            </div>

            <h1 className="mt-7 max-w-5xl text-4xl font-black leading-[.92] tracking-[-0.075em] sm:text-6xl lg:text-7xl">
              Calcula el valor estimado de tu casa por metro cuadrado.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              Referencia inicial desde <b className="text-yellow-300">{formatCLP(PRICE_MIN)}/m²</b> hasta <b className="text-yellow-300">{formatCLP(PRICE_MAX)}/m²</b>. El valor cambia según terminaciones, material de revestimiento, complejidad del terreno, instalación de fosa, empalme eléctrico y conexión de red de agua.
            </p>

            <div className="mt-10 grid gap-5 border-y border-white/10 py-6 sm:grid-cols-3">
              {INCLUDED_NOTES.map(({ Icon, title, text }) => (
                <div key={title} className="flex gap-3">
                  <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow-300 text-black"><Icon className="h-4 w-4" /></span>
                  <span>
                    <b className="block text-sm font-black uppercase tracking-[0.12em] text-white">{title}</b>
                    <span className="mt-2 block text-sm leading-6 text-zinc-400">{text}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex gap-3 border-l-2 border-teal-300/70 pl-4 text-sm leading-7 text-teal-50/75">
              <Info className="mt-1 h-4 w-4 shrink-0 text-teal-300" />
              <p>Este simulador no reemplaza una cotización cerrada. Sirve para iniciar la conversación con números claros; luego se revisan planos, terreno, accesos, fundaciones, materialidad, permisos y alcance exacto.</p>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="border-t border-yellow-300/40 pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resumen en tiempo real</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{m2 || 0} m² · {finish.short}</h2>
                </div>
                <div key={`${m2}-${level}-total`} className="animate-pulse text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Referencia</p>
                  <b className="block text-3xl font-black tracking-[-0.05em] text-yellow-300">{formatCLP(summary.selected)}</b>
                </div>
              </div>

              <div className="mt-6 border-y border-white/10 py-5">
                <label className="block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Metros cuadrados</label>
                <div className="mt-3 flex items-end gap-3 border-b border-white/15 pb-3">
                  <Ruler className="mb-2 h-5 w-5 text-yellow-300" />
                  <input
                    value={m2Input}
                    onChange={(event) => updateM2(event.target.value)}
                    onBlur={() => { if (!m2Input.trim()) setM2Input('0'); }}
                    inputMode="decimal"
                    className="w-full bg-transparent text-6xl font-black tracking-[-0.08em] text-white outline-none placeholder:text-white/20"
                    placeholder="72"
                  />
                  <span className="pb-3 text-xl font-black text-yellow-300">m²</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="250"
                  step="1"
                  value={Math.min(250, Math.max(20, Math.round(m2 || 20)))}
                  onChange={(event) => setM2Input(event.target.value)}
                  className="mt-5 w-full accent-yellow-300"
                />
                <div className="mt-2 flex justify-between text-[11px] font-bold text-zinc-500"><span>20 m²</span><span>250 m²</span></div>
              </div>

              <div className="mt-5 grid gap-2">
                {FINISH_LEVELS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLevel(item.id)}
                    className={`grid grid-cols-[1fr_auto] gap-4 border-b px-0 py-4 text-left transition ${level === item.id ? 'border-yellow-300/55 text-yellow-300' : 'border-white/10 text-white hover:border-yellow-300/35'}`}
                  >
                    <span>
                      <b className="block text-sm font-black uppercase tracking-[0.12em]">{item.label}</b>
                      <span className="mt-1 block text-xs leading-5 text-zinc-400">{item.text}</span>
                    </span>
                    <b className="text-sm font-black">{formatCLP(item.price)}/m²</b>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  <span>Animación del cálculo</span>
                  <span>{Math.round(summary.progress)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div key={`${m2}-${finish.id}-bar`} className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-teal-300 transition-all duration-700" style={{ width: `${summary.progress}%` }} />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3 border-y border-white/10 py-5 text-center">
                <SummaryValue label="Desde" value={summary.base} />
                <SummaryValue label="Referencia" value={summary.selected} highlight />
                <SummaryValue label="Hasta" value={summary.high} />
              </div>

              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Balance del gasto</p>
                <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
                  {balance.map(({ key, label, amount, pct, Icon }) => (
                    <div key={key} className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex gap-3 text-sm leading-6 text-zinc-300"><Icon className="mt-1 h-4 w-4 shrink-0 text-yellow-300" />{label}</span>
                        <b className="shrink-0 text-sm text-white">{formatCLP(amount)}</b>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-teal-300" style={{ width: `${pct * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-b border-white/10 pb-5 text-sm">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Precio/m² seleccionado</span>
                  <b className="mt-1 block text-lg text-white">{formatCLP(finish.price)}</b>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">IVA referencial incluido</span>
                  <b className="mt-1 block text-lg text-white">{formatCLP(summary.ivaReference)}</b>
                </div>
              </div>

              <a href={`https://wa.me/56930121625?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 py-4 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200">
                Enviar resumen por WhatsApp <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryValue({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={highlight ? 'text-yellow-300' : 'text-white'}>
      <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <b className="mt-1 block text-sm font-black sm:text-base">{formatCLP(value)}</b>
    </div>
  );
}
