'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Building2, Calculator, CheckCircle2, Hammer, Home, Ruler, TentTree } from 'lucide-react';

type OptionId = 'kit-basico' | 'kit-intermedio' | 'llave-mano';
type HouseLevelId = 'funcional' | 'terminaciones';
type ProjectTypeId = 'kit' | 'cabana' | 'ampliacion' | 'vivienda';

type CostPart = { label: string; pct?: number; amount?: number };

type CalculatorOption = {
  id: OptionId;
  label: string;
  headline: string;
  pricePerM2: number;
  minM2: number;
  maxM2: number;
  includes: string[];
  notIncluded: string[];
  fixedInstall?: number;
  note?: string;
  installNote?: string;
  parts: CostPart[];
};

type HouseLevel = {
  id: HouseLevelId;
  label: string;
  headline: string;
  pricePerM2: number;
  includes: string[];
  notIncluded: string[];
  parts: CostPart[];
};

const BASIC_INSTALL_FROM = 850000;
const PROJECT_TYPES = [
  { id: 'kit' as const, label: 'Kit para armar', short: 'Estructura para avanzar por etapas', icon: Hammer },
  { id: 'cabana' as const, label: 'Cabaña', short: 'Desde 15 m² para parcela o descanso', icon: TentTree },
  { id: 'ampliacion' as const, label: 'Ampliación', short: 'Más espacio conectado a tu vivienda', icon: Building2 },
  { id: 'vivienda' as const, label: 'Casa', short: 'Vivienda nueva, funcional o terminada', icon: Home },
] as const;

const OPTIONS: CalculatorOption[] = [
  {
    id: 'kit-basico',
    label: 'Kit básico',
    headline: '$220.000/m² + instalación desde $850.000',
    pricePerM2: 220000,
    minM2: 12,
    maxM2: 120,
    fixedInstall: BASIC_INSTALL_FROM,
    note: 'Ideal si buscas partir con la estructura principal y completar terminaciones por etapas.',
    installNote: 'Instalación base desde $850.000. Se confirma según ubicación, acceso y tamaño.',
    includes: ['Paneles interiores/exteriores forrados por una cara', 'Cerchas y costaneras', 'Zinc 0.35 mm', 'Estructura principal del kit'],
    notIncluded: ['Forro interior completo', 'Puntos eléctricos y puntos de agua', 'Puertas, ventanas, cerámica, gas, sanitarios, fosa y empalme'],
    parts: [
      { label: 'Kit y paneles', pct: 0.64 },
      { label: 'Cerchas, costaneras y zinc', pct: 0.18 },
      { label: 'Instalación base desde', amount: BASIC_INSTALL_FROM },
      { label: 'Traslado y ajustes', pct: 0.08 },
    ],
  },
  {
    id: 'kit-intermedio',
    label: 'Kit intermedio',
    headline: '$300.000/m² con instalación y puntos básicos',
    pricePerM2: 300000,
    minM2: 12,
    maxM2: 140,
    note: 'Pensado para avanzar más rápido: estructura, instalación, forro interior y puntos básicos.',
    includes: ['Todo lo del kit básico', 'Instalación del kit', 'Forro interior', 'Puntos eléctricos básicos', 'Puntos de agua PPR'],
    notIncluded: ['Cerámica, ventanas y puertas finales', 'Conexión de gas, sanitarios completos, fosa séptica y empalme eléctrico'],
    parts: [
      { label: 'Kit base y estructura', pct: 0.42 },
      { label: 'Instalación y montaje', pct: 0.24 },
      { label: 'Forro interior', pct: 0.18 },
      { label: 'Electricidad y agua PPR', pct: 0.16 },
    ],
  },
  {
    id: 'llave-mano',
    label: 'Llave en mano',
    headline: 'Funcional o con terminaciones',
    pricePerM2: 540000,
    minM2: 30,
    maxM2: 250,
    note: 'Para quien quiere una casa más completa y necesita comparar niveles de terminación.',
    includes: [],
    notIncluded: [],
    parts: [],
  },
];

const HOUSE_LEVELS: HouseLevel[] = [
  {
    id: 'funcional',
    label: 'Llave en mano funcional',
    headline: '$540.000/m²',
    pricePerM2: 540000,
    includes: ['Todo lo del kit intermedio', 'Ventanas y puertas línea económica', 'Puertas de pino sólidas', 'Cerámica económica', 'Puntos eléctricos', 'Lámparas LED 18W y 24W', 'Conexión de gas interior', 'Salidas sanitarias'],
    notIncluded: ['No incluye conexión a fosa', 'No incluye fosa séptica', 'No incluye empalme eléctrico', 'No incluye permisos ni obras externas especiales'],
    parts: [
      { label: 'Estructura y kit base', pct: 0.32 },
      { label: 'Instalación y mano de obra', pct: 0.24 },
      { label: 'Terminación funcional', pct: 0.22 },
      { label: 'Electricidad, agua y gas interior', pct: 0.14 },
      { label: 'Ajustes e imprevistos', pct: 0.08 },
    ],
  },
  {
    id: 'terminaciones',
    label: 'Llave en mano con terminaciones',
    headline: '$780.000/m² según materialidad',
    pricePerM2: 780000,
    includes: ['Todo lo de llave en mano funcional', 'Terminaciones interiores superiores', 'Mejor selección de revestimientos', 'Mejor terminación de pintura, remates y detalles visibles', 'Mayor cuidado en cocina, baño y espacios interiores'],
    notIncluded: ['Fosa séptica, empalme eléctrico y conexión exterior de agua se cotizan aparte si el terreno lo requiere', 'Permisos, movimiento de tierra mayor u obras especiales se revisan aparte'],
    parts: [
      { label: 'Estructura y montaje', pct: 0.28 },
      { label: 'Instalaciones interiores', pct: 0.16 },
      { label: 'Terminaciones superiores', pct: 0.34 },
      { label: 'Puertas, ventanas y detalles', pct: 0.14 },
      { label: 'Gestión e imprevistos', pct: 0.08 },
    ],
  },
];

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
}

function normalizeM2(value: string) {
  const cleaned = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  const normalized = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  const parsed = Number(normalized);
  return { display: normalized, value: Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 500) : 0 };
}

export default function ConstructionM2Calculator() {
  const [m2Input, setM2Input] = useState('54');
  const [projectTypeId, setProjectTypeId] = useState<ProjectTypeId>('vivienda');
  const [optionId, setOptionId] = useState<OptionId>('kit-basico');
  const [houseLevelId, setHouseLevelId] = useState<HouseLevelId>('funcional');

  const option = OPTIONS.find((item) => item.id === optionId) || OPTIONS[0];
  const houseLevel = HOUSE_LEVELS.find((item) => item.id === houseLevelId) || HOUSE_LEVELS[0];
  const projectType = PROJECT_TYPES.find((item) => item.id === projectTypeId) || PROJECT_TYPES[3];
  const isHouse = option.id === 'llave-mano';
  const activeTitle = isHouse ? houseLevel.label : option.label;
  const activeHeadline = isHouse ? houseLevel.headline : option.headline;
  const activePrice = isHouse ? houseLevel.pricePerM2 : option.pricePerM2;
  const activeIncludes = isHouse ? houseLevel.includes : option.includes;
  const activeNotIncluded = isHouse ? houseLevel.notIncluded : option.notIncluded;
  const activeParts = isHouse ? houseLevel.parts : option.parts;

  const m2Data = normalizeM2(m2Input);
  const m2 = m2Data.value;
  const selectedMinM2 = projectTypeId === 'cabana' ? 15 : option.minM2;
  const selectedMaxM2 = projectTypeId === 'cabana' ? 60 : option.maxM2;
  const materialSubtotal = m2 * activePrice;
  const fixedInstall = isHouse ? 0 : option.fixedInstall || 0;
  const total = materialSubtotal + fixedInstall;
  const minRange = m2 * Math.min(...(isHouse ? HOUSE_LEVELS.map((level) => level.pricePerM2) : [option.pricePerM2]));
  const maxRange = isHouse ? m2 * Math.max(...HOUSE_LEVELS.map((level) => level.pricePerM2)) : total;
  const progress = Math.min(100, Math.max(8, (m2 / selectedMaxM2) * 100));

  const breakdown = useMemo(() => activeParts.map((part) => {
    const amount = part.amount ?? materialSubtotal * (part.pct || 0);
    return { ...part, amount };
  }), [activeParts, materialSubtotal]);

  const whatsappMessage = encodeURIComponent(
    `Hola, quiero calcular una ${projectType.label.toLowerCase()} de ${m2 || 0} m² con modalidad ${activeTitle}. Precio por m²: ${formatCLP(activePrice)}. Total referencial: ${formatCLP(total)}. Quiero revisar qué incluye y qué se cotiza aparte.`,
  );

  function updateM2(value: string) {
    const next = normalizeM2(value);
    setM2Input(next.display);
  }

  function selectOption(nextId: OptionId) {
    const nextOption = OPTIONS.find((item) => item.id === nextId) || OPTIONS[0];
    setOptionId(nextId);
    if (m2 < nextOption.minM2 || m2 > nextOption.maxM2) {
      setM2Input(String(Math.min(nextOption.maxM2, Math.max(nextOption.minM2, Math.round(m2 || nextOption.minM2)))));
    }
  }

  return (
    <section id="calculadora-m2" data-scroll-section className="relative overflow-hidden bg-[#060504] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(250,204,21,.16),transparent_25rem),radial-gradient(circle_at_90%_8%,rgba(20,184,166,.10),transparent_28rem),linear-gradient(180deg,#070604,#0a0805_55%,#050505)]" />

      <div className="relative mx-auto max-w-[1450px]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_520px] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 border-b border-yellow-300/50 pb-2 text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">
              <Calculator className="h-4 w-4" /> Calculadora rápida
            </div>
            <h2 className="mt-7 max-w-4xl text-4xl font-black leading-[.92] tracking-[-0.065em] sm:text-6xl lg:text-7xl">Descubre cuánto podría costar tu proyecto.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">Elige qué quieres construir, define el nivel de entrega y ajusta los metros cuadrados. Verás una referencia clara para decidir si vale la pena avanzar.</p>

            <div className="mt-9 border-y border-white/10 py-6">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300">Paso 1 · ¿Qué quieres construir?</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {PROJECT_TYPES.map(({ id, label, short, icon: Icon }) => {
                  const active = projectTypeId === id;
                  return <button key={id} type="button" onClick={() => { setProjectTypeId(id); if (id === 'cabana' && (Number(m2Input) < 15 || Number(m2Input) > 60)) setM2Input('24'); }} className={`flex items-center gap-4 rounded-[1.35rem] border p-4 text-left transition ${active ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/12 bg-white/[0.025] text-white hover:border-yellow-300/45'}`}>
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? 'bg-black text-yellow-300' : 'bg-white/[0.06] text-yellow-300'}`}><Icon className="h-5 w-5" /></span>
                    <span><b className="block text-sm font-black">{label}</b><span className={`mt-1 block text-xs leading-5 ${active ? 'text-black/65' : 'text-zinc-500'}`}>{short}</span></span>
                  </button>;
                })}
              </div>
            </div>

            <div className="border-b border-white/10 py-6">
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300">Paso 2 · ¿Hasta dónde quieres avanzar?</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPTIONS.map((item) => (
                  <button key={item.id} type="button" onClick={() => selectOption(item.id)} className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${optionId === item.id ? 'border-yellow-300 bg-yellow-300 text-black shadow-[0_16px_40px_rgba(250,204,21,.16)]' : 'border-white/15 bg-white/[0.025] text-white hover:border-yellow-300/55 hover:text-yellow-300'}`}>
                    <b className="block text-sm font-black uppercase tracking-[0.12em]">{item.label}</b>
                    <span className={`mt-2 block text-xs leading-5 ${optionId === item.id ? 'text-black/70' : 'text-zinc-400'}`}>{item.headline}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">{option.note}</p>
            </div>

            {isHouse && (
              <div className="border-b border-white/10 py-5">
                <label htmlFor="house-level" className="mb-3 block text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300">Paso 3 · Elige el nivel de terminación</label>
                <select id="house-level" value={houseLevelId} onChange={(event) => setHouseLevelId(event.target.value as HouseLevelId)} className="w-full rounded-[1.2rem] border border-teal-300/35 bg-black/60 px-4 py-4 text-base font-black text-white outline-none focus:border-yellow-300">
                  {HOUSE_LEVELS.map((level) => <option key={level.id} value={level.id}>{level.label} · {formatCLP(level.pricePerM2)}/m²</option>)}
                </select>
              </div>
            )}

            <div className="grid gap-7 border-b border-white/10 py-7 md:grid-cols-2">
              <div>
                <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300"><CheckCircle2 className="h-4 w-4" /> Incluye</p>
                <div className="divide-y divide-white/10 border-y border-white/10">{activeIncludes.map((item) => <p key={item} className="py-3 text-sm leading-6 text-zinc-300">{item}</p>)}</div>
              </div>
              <div>
                <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-red-200"><AlertTriangle className="h-4 w-4" /> No incluye</p>
                <div className="divide-y divide-red-300/15 border-y border-red-300/20">{activeNotIncluded.map((item) => <p key={item} className="py-3 text-sm leading-6 text-red-50/70">{item}</p>)}</div>
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="border-t border-yellow-300/40 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resumen en vivo</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">{projectType.label} · {activeTitle}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{activeHeadline}</p>
                </div>
                <Home className="mt-1 h-8 w-8 shrink-0 text-yellow-300" />
              </div>

              <div className="border-b border-white/10 py-5">
                <label className="block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Metros cuadrados</label>
                <div className="mt-3 flex items-end gap-3 border-b border-white/15 pb-3">
                  <Ruler className="mb-2 h-5 w-5 text-yellow-300" />
                <input value={m2Input} onChange={(event) => updateM2(event.target.value)} onBlur={() => { if (!m2Input.trim()) setM2Input(String(selectedMinM2)); }} inputMode="decimal" className="w-full bg-transparent text-6xl font-black tracking-[-0.08em] text-white outline-none placeholder:text-white/20" placeholder="54" />
                  <span className="pb-3 text-xl font-black text-yellow-300">m²</span>
                </div>
                <input type="range" min={selectedMinM2} max={selectedMaxM2} step="1" value={Math.min(selectedMaxM2, Math.max(selectedMinM2, Math.round(m2 || selectedMinM2)))} onChange={(event) => setM2Input(event.target.value)} className="mt-5 w-full accent-yellow-300" />
                <div className="mt-2 flex justify-between text-[11px] font-bold text-zinc-500"><span>{selectedMinM2} m²</span><span>{selectedMaxM2} m²</span></div>
              </div>

              <div className="border-b border-white/10 py-6">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Total referencial</p>
                <b key={`${optionId}-${houseLevelId}-${m2}-total`} className="mt-2 block animate-pulse text-5xl font-black tracking-[-0.07em] text-yellow-300 sm:text-6xl">{formatCLP(total)}</b>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{m2 || 0} m² × {formatCLP(activePrice)}/m²{fixedInstall ? ` + instalación desde ${formatCLP(fixedInstall)}` : ''}</p>
                {isHouse && <p className="mt-2 text-xs text-zinc-500">Rango llave en mano para {m2 || 0} m²: {formatCLP(minRange)} a {formatCLP(maxRange)}</p>}
                {option.installNote && <p className="mt-2 text-xs text-yellow-100/70">{option.installNote}</p>}
              </div>

              <div className="py-6">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-zinc-500"><span>Avance del cálculo</span><span>{Math.round(progress)}%</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-teal-300 transition-all duration-700" style={{ width: `${progress}%` }} /></div>
              </div>

              <div className="py-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Detalle simple del valor</p>
                <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
                  {breakdown.map((part) => {
                    const percent = total ? Math.max(4, Math.min(100, (part.amount / total) * 100)) : 0;
                    return <div key={part.label} className="py-4"><div className="flex items-start justify-between gap-4"><span className="text-sm leading-6 text-zinc-300">{part.label}</span><b className="shrink-0 text-sm text-white">{formatCLP(part.amount)}</b></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-teal-300 transition-all duration-700" style={{ width: `${percent}%` }} /></div></div>;
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-white/10 py-5 text-sm">
                <div><span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Precio por m²</span><b className="mt-1 block text-lg text-white">{formatCLP(activePrice)}</b></div>
                <div className="text-right"><span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Metros</span><b className="mt-1 block text-lg text-white">{m2 || 0} m²</b></div>
              </div>

              <a href={`https://wa.me/56930121625?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 py-4 text-sm font-black text-black shadow-[0_18px_45px_rgba(250,204,21,.22)] transition hover:-translate-y-0.5 hover:bg-yellow-200">Enviar cálculo por WhatsApp <ArrowRight className="h-4 w-4" /></a>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
