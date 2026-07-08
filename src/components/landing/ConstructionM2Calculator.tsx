'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Droplets, Factory, Hammer, Home, Info, PlugZap, Ruler, ShieldCheck, Sparkles, TreePine, Warehouse } from 'lucide-react';

const PROJECT_TYPES = [
  {
    id: 'casa',
    label: 'Casa construcción completa',
    short: 'Casa',
    range: '540 a 780 mil/m²',
    minM2: 40,
    maxM2: 250,
    prices: { base: 540000, media: 650000, alta: 780000 },
    description: 'Construcción más completa, con mayor revisión de estructura, instalaciones, terminaciones, fosa, empalme y conexión de agua.',
    balance: [
      { key: 'estructura', label: 'Estructura, fundaciones, mano de obra y montaje', pct: 0.42, Icon: Home },
      { key: 'terminaciones', label: 'Terminaciones y material de revestimiento', pct: 0.24, Icon: Sparkles },
      { key: 'instalaciones', label: 'Instalación eléctrica, sanitaria y red interior de agua', pct: 0.14, Icon: PlugZap },
      { key: 'exteriores', label: 'Fosa, empalme eléctrico y conexión a red de agua', pct: 0.12, Icon: Droplets },
      { key: 'gestion', label: 'Traslados, gestión, ajustes e imprevistos', pct: 0.08, Icon: ShieldCheck },
    ],
  },
  {
    id: 'cabana',
    label: 'Cabaña habitable',
    short: 'Cabaña',
    range: '340 a 480 mil/m²',
    minM2: 18,
    maxM2: 140,
    prices: { base: 340000, media: 410000, alta: 480000 },
    description: 'Opción más liviana para cabañas, quinchos habitables o módulos con terminación controlada, según revestimiento y conexiones.',
    balance: [
      { key: 'estructura', label: 'Estructura liviana, montaje y base de obra', pct: 0.38, Icon: Warehouse },
      { key: 'revestimiento', label: 'Revestimiento exterior/interior y aislación', pct: 0.26, Icon: TreePine },
      { key: 'terminaciones', label: 'Terminaciones, puertas, ventanas y detalles visibles', pct: 0.16, Icon: Sparkles },
      { key: 'servicios', label: 'Electricidad, agua, fosa y conexión según terreno', pct: 0.12, Icon: Droplets },
      { key: 'gestion', label: 'Traslados, ajustes e imprevistos', pct: 0.08, Icon: ShieldCheck },
    ],
  },
  {
    id: 'kit',
    label: 'Kit prefabricado',
    short: 'Kit',
    range: '220 a 300 mil/m²',
    minM2: 12,
    maxM2: 120,
    prices: { base: 220000, media: 260000, alta: 300000 },
    description: 'Referencia para kit prefabricado. El costo final depende del kit, traslado, base, montaje, terminaciones y conexiones fuera del kit.',
    balance: [
      { key: 'kit', label: 'Kit prefabricado, paneles o estructura principal', pct: 0.46, Icon: Factory },
      { key: 'montaje', label: 'Montaje, fijaciones y armado en terreno', pct: 0.18, Icon: Hammer },
      { key: 'terminaciones', label: 'Terminaciones adicionales y revestimiento final', pct: 0.14, Icon: Sparkles },
      { key: 'base', label: 'Base, traslado, descarga y ajustes de terreno', pct: 0.12, Icon: Warehouse },
      { key: 'conexiones', label: 'Electricidad, agua, fosa y empalmes no incluidos', pct: 0.10, Icon: PlugZap },
    ],
  },
] as const;

const FINISH_LEVELS = [
  { id: 'base', label: 'Base', tag: 'controlado', help: 'Lo mínimo funcional para partir con un presupuesto bajo.' },
  { id: 'media', label: 'Intermedia', tag: 'balance', help: 'Mejor equilibrio entre costo, terminaciones y materialidad.' },
  { id: 'alta', label: 'Superior', tag: 'mejor acabado', help: 'Más detalle visual, mejores revestimientos y mayor presencia final.' },
] as const;

type ProjectId = (typeof PROJECT_TYPES)[number]['id'];
type FinishId = (typeof FINISH_LEVELS)[number]['id'];

const INCLUDED_NOTES = [
  { Icon: Home, title: 'Casa', text: '$540.000 a $780.000/m² según terminaciones, revestimiento, fosa, empalme y red de agua.' },
  { Icon: TreePine, title: 'Cabaña', text: '$340.000 a $480.000/m² para módulos habitables más livianos y controlados.' },
  { Icon: Factory, title: 'Kit prefabricado', text: '$220.000 a $300.000/m² como referencia de kit; conexiones y base pueden ir aparte.' },
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
  const [projectId, setProjectId] = useState<ProjectId>('casa');
  const [finishId, setFinishId] = useState<FinishId>('media');

  const project = PROJECT_TYPES.find((item) => item.id === projectId) || PROJECT_TYPES[0];
  const finish = FINISH_LEVELS.find((item) => item.id === finishId) || FINISH_LEVELS[1];
  const m2Data = normalizeM2(m2Input);
  const m2 = m2Data.value;
  const selectedPrice = project.prices[finish.id];
  const priceMin = project.prices.base;
  const priceMax = project.prices.alta;

  const summary = useMemo(() => {
    const min = m2 * priceMin;
    const selected = m2 * selectedPrice;
    const max = m2 * priceMax;
    const ivaReference = selected * 0.19;
    const progress = m2 > 0 ? Math.min(100, Math.max(10, ((selectedPrice - priceMin) / Math.max(1, priceMax - priceMin)) * 72 + 18)) : 0;
    return { min, selected, max, ivaReference, progress };
  }, [m2, priceMin, priceMax, selectedPrice]);

  const balance = useMemo(() => project.balance.map((item) => ({
    ...item,
    amount: summary.selected * item.pct,
  })), [project, summary.selected]);

  const whatsappMessage = encodeURIComponent(
    `Hola, quiero evaluar ${project.label.toLowerCase()} de ${m2 || 0} m². Nivel: ${finish.label}. Referencia: ${formatCLP(summary.selected)}. Rango estimado: ${formatCLP(summary.min)} a ${formatCLP(summary.max)}. Quiero revisar alcance, revestimientos, terminaciones, fosa, empalme eléctrico y conexión de agua.`,
  );

  function updateM2(value: string) {
    const next = normalizeM2(value);
    setM2Input(next.display);
  }

  function selectProject(nextProjectId: ProjectId) {
    const nextProject = PROJECT_TYPES.find((item) => item.id === nextProjectId) || PROJECT_TYPES[0];
    setProjectId(nextProjectId);
    if (m2 < nextProject.minM2 || m2 > nextProject.maxM2) {
      setM2Input(String(Math.min(nextProject.maxM2, Math.max(nextProject.minM2, Math.round(m2 || nextProject.minM2)))));
    }
  }

  return (
    <section id="calculadora-m2" className="relative overflow-hidden bg-[#060504] px-4 pb-16 pt-24 text-white sm:px-6 lg:px-8 lg:pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(250,204,21,.20),transparent_28rem),radial-gradient(circle_at_86%_4%,rgba(20,184,166,.13),transparent_30rem),linear-gradient(180deg,#070604,#0b0906_55%,#050505)]" />

      <div className="relative mx-auto max-w-[1500px]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-start">
          <div className="pt-2 lg:pt-10">
            <div className="inline-flex items-center gap-2 border-b border-yellow-300/50 pb-2 text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">
              <Calculator className="h-4 w-4" /> Calculadora m² en vivo
            </div>

            <h1 className="mt-7 max-w-5xl text-4xl font-black leading-[.92] tracking-[-0.075em] sm:text-6xl lg:text-7xl">
              Calcula casa, cabaña o kit prefabricado por metro cuadrado.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              Escoge el tipo de proyecto, ingresa los metros cuadrados y revisa un rango estimado en tiempo real. El valor final depende de terminaciones, material de revestimiento, fosa, empalme eléctrico, conexión de red de agua, traslado, terreno y alcance real.
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
              <p>Este simulador no reemplaza una cotización cerrada. Primero entrega una referencia para conversar con números claros; luego se revisan planos, terreno, accesos, fundaciones, materialidad, permisos, conexiones y alcance exacto.</p>
            </div>
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="border-t border-yellow-300/40 pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resumen en tiempo real</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">{project.short} · {m2 || 0} m² · {finish.label}</h2>
                </div>
                <div key={`${projectId}-${m2}-${finishId}-total`} className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Referencia</p>
                  <b className="block animate-pulse text-3xl font-black tracking-[-0.05em] text-yellow-300">{formatCLP(summary.selected)}</b>
                </div>
              </div>

              <div className="mt-6 border-y border-white/10 py-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Tipo de proyecto</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PROJECT_TYPES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectProject(item.id)}
                      className={`rounded-full border px-4 py-3 text-left transition ${projectId === item.id ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/15 bg-transparent text-white hover:border-yellow-300/55 hover:text-yellow-300'}`}
                    >
                      <b className="block text-xs font-black uppercase tracking-[0.14em]">{item.short}</b>
                      <span className={`mt-1 block text-[11px] ${projectId === item.id ? 'text-black/65' : 'text-zinc-500'}`}>{item.range}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{project.description}</p>
              </div>

              <div className="border-b border-white/10 py-5">
                <label className="block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Metros cuadrados</label>
                <div className="mt-3 flex items-end gap-3 border-b border-white/15 pb-3">
                  <Ruler className="mb-2 h-5 w-5 text-yellow-300" />
                  <input
                    value={m2Input}
                    onChange={(event) => updateM2(event.target.value)}
                    onBlur={() => { if (!m2Input.trim()) setM2Input(String(project.minM2)); }}
                    inputMode="decimal"
                    className="w-full bg-transparent text-6xl font-black tracking-[-0.08em] text-white outline-none placeholder:text-white/20"
                    placeholder="72"
                  />
                  <span className="pb-3 text-xl font-black text-yellow-300">m²</span>
                </div>
                <input
                  type="range"
                  min={project.minM2}
                  max={project.maxM2}
                  step="1"
                  value={Math.min(project.maxM2, Math.max(project.minM2, Math.round(m2 || project.minM2)))}
                  onChange={(event) => setM2Input(event.target.value)}
                  className="mt-5 w-full accent-yellow-300"
                />
                <div className="mt-2 flex justify-between text-[11px] font-bold text-zinc-500"><span>{project.minM2} m²</span><span>{project.maxM2} m²</span></div>
              </div>

              <div className="border-b border-white/10 py-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Nivel / terminación</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {FINISH_LEVELS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFinishId(item.id)}
                      className={`rounded-full border px-4 py-3 text-left transition ${finishId === item.id ? 'border-teal-300 bg-teal-300 text-black' : 'border-white/15 bg-transparent text-white hover:border-teal-300/60 hover:text-teal-200'}`}
                    >
                      <b className="block text-xs font-black uppercase tracking-[0.14em]">{item.label}</b>
                      <span className={`mt-1 block text-[11px] ${finishId === item.id ? 'text-black/65' : 'text-zinc-500'}`}>{formatCLP(project.prices[item.id])}/m²</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{finish.help}</p>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
                  <span>Animación del cálculo</span>
                  <span>{Math.round(summary.progress)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div key={`${projectId}-${m2}-${finishId}-bar`} className="h-full rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 to-teal-300 transition-all duration-700" style={{ width: `${summary.progress}%` }} />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-3 gap-3 border-y border-white/10 py-5 text-center">
                <SummaryValue label="Desde" value={summary.min} />
                <SummaryValue label="Referencia" value={summary.selected} highlight />
                <SummaryValue label="Hasta" value={summary.max} />
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
                  <b className="mt-1 block text-lg text-white">{formatCLP(selectedPrice)}</b>
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
