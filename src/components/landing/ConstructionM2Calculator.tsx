'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, Building2, Calculator, CheckCircle2, Hammer, Home, Info, Layers3, Ruler, TentTree } from 'lucide-react';

type TierId = 'esencial' | 'estandar' | 'premium';
type ProjectTypeId = 'kit' | 'cabana' | 'ampliacion' | 'vivienda';

type Tier = {
  id: TierId;
  label: string;
  eyebrow: string;
  minPrice: number;
  maxPrice: number;
  referencePrice: number;
  summary: string;
  materials: string;
  includes: string[];
  notIncluded: string[];
  parts: Array<{ label: string; pct: number }>;
};

const PROJECT_TYPES = [
  { id: 'kit' as const, label: 'Kit prefabricado', short: 'Estructura para montar y terminar por etapas', icon: Hammer, min: 12, max: 140 },
  { id: 'cabana' as const, label: 'Cabaña', short: 'Solución compacta desde 15 m²', icon: TentTree, min: 15, max: 80 },
  { id: 'ampliacion' as const, label: 'Ampliación', short: 'Nuevos ambientes conectados a tu casa', icon: Building2, min: 12, max: 100 },
  { id: 'vivienda' as const, label: 'Vivienda', short: 'Base modular para una casa familiar', icon: Home, min: 30, max: 250 },
] as const;

const TIERS: Tier[] = [
  {
    id: 'esencial', label: 'Esencial', eyebrow: 'Estructura para avanzar', minPrice: 100000, maxPrice: 160000, referencePrice: 130000,
    summary: 'Una base de entrada para quien realizará parte del montaje o las terminaciones por separado.',
    materials: 'Estructura galvanizada, panelería base y cubierta económica según disponibilidad.',
    includes: ['Estructura principal dimensionada', 'Panelería base del kit', 'Cerchas, costaneras y cubierta económica', 'Listado inicial de componentes'],
    notIncluded: ['Montaje, fundaciones y traslado', 'Puertas, ventanas y terminaciones', 'Instalaciones eléctricas, sanitarias y gas', 'Permisos, empalmes y obras de terreno'],
    parts: [{ label: 'Estructura principal', pct: .46 }, { label: 'Panelería base', pct: .28 }, { label: 'Cubierta y perfilería', pct: .18 }, { label: 'Fijaciones y reserva', pct: .08 }],
  },
  {
    id: 'estandar', label: 'Estándar', eyebrow: 'Equilibrio recomendado', minPrice: 180000, maxPrice: 260000, referencePrice: 220000,
    summary: 'Mejor equilibrio entre estructura, aislación y revestimientos para continuar el proyecto con menos partidas pendientes.',
    materials: 'Estructura galvanizada, aislación estándar, revestimientos base y cubierta de mejor desempeño.',
    includes: ['Todo lo considerado en el nivel esencial', 'Aislación térmica estándar', 'Revestimiento interior y exterior base', 'Asistencia para ordenar el montaje'],
    notIncluded: ['Fundaciones y movimiento de tierra', 'Terminaciones decorativas y mobiliario', 'Empalmes y conexiones exteriores', 'Permisos y especialidades no detalladas'],
    parts: [{ label: 'Estructura reforzada', pct: .38 }, { label: 'Paneles y revestimientos', pct: .30 }, { label: 'Aislación y cubierta', pct: .22 }, { label: 'Fijaciones y reserva', pct: .10 }],
  },
  {
    id: 'premium', label: 'Premium', eyebrow: 'Mayor desempeño', minPrice: 280000, maxPrice: 360000, referencePrice: 320000,
    summary: 'Kit con una selección superior de envolvente, aislación y detalles para reducir trabajos posteriores.',
    materials: 'Aislación de mayor desempeño, revestimientos superiores, mejor cubierta y detalles reforzados.',
    includes: ['Todo lo considerado en el nivel estándar', 'Aislación térmica superior', 'Revestimientos de mayor desempeño', 'Mejoras en cubierta, sellos y remates'],
    notIncluded: ['Fundaciones y obras exteriores', 'Instalaciones y artefactos no especificados', 'Mobiliario, permisos y empalmes', 'Condiciones especiales de acceso o traslado'],
    parts: [{ label: 'Estructura y refuerzos', pct: .34 }, { label: 'Envolvente y revestimientos', pct: .32 }, { label: 'Aislación y cubierta superior', pct: .24 }, { label: 'Sellos, remates y reserva', pct: .10 }],
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
  const [tierId, setTierId] = useState<TierId>('estandar');
  const project = PROJECT_TYPES.find((item) => item.id === projectTypeId) || PROJECT_TYPES[3];
  const tier = TIERS.find((item) => item.id === tierId) || TIERS[1];
  const parsed = normalizeM2(m2Input);
  const m2 = parsed.value;
  const rangeMin = m2 * tier.minPrice;
  const rangeMax = m2 * tier.maxPrice;
  const referenceTotal = m2 * tier.referencePrice;
  const breakdown = useMemo(() => tier.parts.map((part) => ({ ...part, amount: referenceTotal * part.pct })), [referenceTotal, tier.parts]);
  const whatsappMessage = encodeURIComponent(`Hola, quiero revisar una ${project.label.toLowerCase()} de ${m2 || 0} m², nivel ${tier.label}. La calculadora indica un rango referencial de ${formatCLP(rangeMin)} a ${formatCLP(rangeMax)}, no un precio final. Quiero confirmar materiales, ubicación, montaje y partidas adicionales.`);

  function setProject(id: ProjectTypeId) {
    const next = PROJECT_TYPES.find((item) => item.id === id) || PROJECT_TYPES[0];
    setProjectTypeId(id);
    if (m2 < next.min || m2 > next.max) setM2Input(String(id === 'cabana' ? 24 : next.min));
  }

  return (
    <section id="calculadora-m2" data-scroll-section className="relative overflow-hidden bg-[#060504] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(250,204,21,.16),transparent_25rem),radial-gradient(circle_at_90%_8%,rgba(20,184,166,.10),transparent_28rem),linear-gradient(180deg,#070604,#0a0805_55%,#050505)]" />
      <div className="relative mx-auto max-w-[1450px]">
        <div className="mb-10 flex flex-col gap-5 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.32em] text-yellow-300"><Calculator className="h-4 w-4" /> Calculadora de proyecto</p><h2 className="mt-5 max-w-4xl text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">Un rango claro antes de cotizar.</h2></div>
          <p className="max-w-xl text-sm leading-7 text-zinc-400">Compara materialidades y ordena tu presupuesto. Los valores son aproximados para kits prefabricados y cambian según diseño, stock, ubicación, acceso y condiciones del terreno.</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-start">
          <div className="space-y-9">
            <div><StepTitle number="01" title="Elige tu tipo de proyecto" /><div className="mt-4 grid gap-3 sm:grid-cols-2">{PROJECT_TYPES.map(({ id, label, short, icon: Icon }) => { const active = projectTypeId === id; return <button key={id} type="button" onClick={() => setProject(id)} className={`flex items-center gap-4 rounded-[1.35rem] border p-4 text-left transition ${active ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/12 bg-white/[.025] hover:border-yellow-300/45'}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? 'bg-black text-yellow-300' : 'bg-white/[.06] text-yellow-300'}`}><Icon className="h-5 w-5" /></span><span><b className="block text-sm font-black">{label}</b><span className={`mt-1 block text-xs leading-5 ${active ? 'text-black/65' : 'text-zinc-500'}`}>{short}</span></span></button>; })}</div></div>

            <div><StepTitle number="02" title="Selecciona la materialidad" /><div className="mt-4 grid gap-3 md:grid-cols-3">{TIERS.map((item) => { const active = item.id === tierId; return <button key={item.id} type="button" onClick={() => setTierId(item.id)} className={`rounded-[1.35rem] border p-5 text-left transition ${active ? 'border-yellow-300 bg-yellow-300 text-black shadow-[0_16px_40px_rgba(250,204,21,.14)]' : 'border-white/12 bg-white/[.025] hover:border-yellow-300/45'}`}><span className={`text-[9px] font-black uppercase tracking-[.22em] ${active ? 'text-black/55' : 'text-yellow-300'}`}>{item.eyebrow}</span><b className="mt-3 block text-xl font-black">{item.label}</b><span className={`mt-2 block text-sm font-black ${active ? 'text-black' : 'text-white'}`}>{formatCLP(item.minPrice)}–{formatCLP(item.maxPrice)}<small className="font-bold"> /m²</small></span></button>; })}</div><p className="mt-4 text-sm leading-7 text-zinc-400">{tier.summary}</p></div>

            <div><StepTitle number="03" title="Ajusta los metros cuadrados" /><div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[.025] p-5 sm:p-7"><div className="flex items-end gap-3 border-b border-white/15 pb-3"><Ruler className="mb-2 h-5 w-5 text-yellow-300" /><input aria-label="Metros cuadrados" value={m2Input} onChange={(event) => setM2Input(normalizeM2(event.target.value).display)} onBlur={() => { if (!m2Input.trim() || m2 < project.min) setM2Input(String(project.min)); }} inputMode="decimal" className="w-full bg-transparent text-5xl font-black tracking-[-.07em] outline-none sm:text-6xl" /><span className="pb-2 text-xl font-black text-yellow-300">m²</span></div><input aria-label="Ajustar metros cuadrados" type="range" min={project.min} max={project.max} value={Math.min(project.max, Math.max(project.min, Math.round(m2 || project.min)))} onChange={(event) => setM2Input(event.target.value)} className="mt-6 w-full accent-yellow-300" /><div className="mt-2 flex justify-between text-xs font-bold text-zinc-500"><span>{project.min} m²</span><span>{project.max} m²</span></div></div></div>

            <div className="grid gap-6 md:grid-cols-2"><InfoList icon="check" title="Qué considera esta referencia" items={tier.includes} /><InfoList icon="alert" title="Qué se cotiza aparte" items={tier.notIncluded} /></div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-[1.8rem] border border-white/12 bg-[#0d0b08] shadow-2xl">
              <div className="bg-yellow-300 p-6 text-black"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.28em]">Resultado orientativo</p><h3 className="mt-2 text-2xl font-black tracking-[-.04em]">{project.label} · {tier.label}</h3></div><BarChart3 className="h-7 w-7" /></div></div>
              <div className="p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-[.24em] text-zinc-500">Rango total aproximado</p><p className="mt-3 text-3xl font-black leading-tight tracking-[-.055em] text-yellow-300 sm:text-4xl">{formatCLP(rangeMin)}<span className="block text-xl text-white/35 sm:text-2xl">a {formatCLP(rangeMax)}</span></p>
                <div className="mt-6 grid grid-cols-2 gap-3"><Metric label="Referencia central" value={formatCLP(referenceTotal)} /><Metric label="Superficie" value={`${m2 || 0} m²`} /><Metric label="Rango por m²" value={`${formatCLP(tier.minPrice)}–${formatCLP(tier.maxPrice)}`} /><Metric label="Materialidad" value={tier.label} /></div>
                <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/[.06] p-4"><p className="flex gap-3 text-xs leading-6 text-yellow-50/80"><Info className="mt-1 h-4 w-4 shrink-0 text-yellow-300" /><span><b className="text-yellow-300">No es un precio final.</b> Es una guía inicial sin visita técnica. Montaje, traslado, fundaciones, instalaciones, permisos y conexiones se confirman aparte.</span></p></div>

                <div className="mt-7"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.24em] text-yellow-300"><Layers3 className="h-4 w-4" /> Composición de referencia</p><p className="mt-3 text-sm leading-6 text-zinc-400">{tier.materials}</p><div className="mt-4 divide-y divide-white/10 border-y border-white/10">{breakdown.map((part) => <div key={part.label} className="py-4"><div className="flex justify-between gap-4 text-sm"><span className="text-zinc-300">{part.label}</span><b>{formatCLP(part.amount)}</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-teal-300" style={{ width: `${part.pct * 100}%` }} /></div></div>)}</div></div>
                <a href={`https://wa.me/56930121625?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 py-4 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-yellow-200">Validar este cálculo <ArrowRight className="h-4 w-4" /></a><p className="mt-3 text-center text-[10px] leading-5 text-zinc-600">Referencia comercial actualizada en julio de 2026. Sujeta a evaluación y disponibilidad.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function StepTitle({ number, title }: { number: string; title: string }) { return <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.26em] text-yellow-300"><span className="grid h-7 w-7 place-items-center rounded-full border border-yellow-300/35">{number}</span>{title}</p>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><span className="block text-[9px] font-black uppercase tracking-[.18em] text-zinc-500">{label}</span><b className="mt-2 block text-sm leading-5 text-white">{value}</b></div>; }
function InfoList({ icon, title, items }: { icon: 'check' | 'alert'; title: string; items: string[] }) { const Icon = icon === 'check' ? CheckCircle2 : AlertTriangle; return <div><p className={`mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] ${icon === 'check' ? 'text-yellow-300' : 'text-red-200'}`}><Icon className="h-4 w-4" />{title}</p><div className="divide-y divide-white/10 border-y border-white/10">{items.map((item) => <p key={item} className="py-3 text-sm leading-6 text-zinc-400">{item}</p>)}</div></div>; }
