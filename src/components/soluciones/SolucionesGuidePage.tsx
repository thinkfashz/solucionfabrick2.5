'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AirVent,
  ArrowRight,
  Blocks,
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Hammer,
  HousePlug,
  Info,
  Layers3,
  PaintRoller,
  PanelsTopLeft,
  Ruler,
  Search,
  ShieldCheck,
  Sparkles,
  Trees,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import {
  BUDGET_SERVICES,
  SERVICE_CATEGORIES,
  type BudgetService,
  type ServiceCategory,
} from '@/components/presupuesto/serviceCatalog';

type Visual = {
  src: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  source: 'pexels' | 'fallback';
};

type GuideConfig = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  summary: string;
  purpose: string;
  review: string[];
  process: string[];
};

const GUIDES: Record<ServiceCategory, GuideConfig> = {
  'Obra base': {
    icon: Layers3,
    eyebrow: 'Terreno · hormigón · soportes',
    title: 'La base define cómo empieza todo lo demás.',
    summary: 'Antes de levantar muros o terminar superficies, conviene ordenar niveles, apoyos, espesores y condiciones reales del terreno.',
    purpose: 'Fundaciones, radieres y albañilería trabajan sobre dimensiones y condiciones que deben entenderse antes de estimar materiales, tiempos y mano de obra.',
    review: ['Niveles y desniveles', 'Acceso y retiro de material', 'Espesores y superficies', 'Condición del soporte existente'],
    process: ['Medir y reconocer el área', 'Definir la partida correcta', 'Calcular volumen o superficie', 'Confirmar alcance en terreno'],
  },
  Construcción: {
    icon: Building2,
    eyebrow: 'Estructura · ampliación · cubierta',
    title: 'Construir por capas hace más clara cada decisión.',
    summary: 'Estructura, envolvente, techumbre e instalaciones deben coordinarse para evitar rehacer etapas o mezclar alcances.',
    purpose: 'Agrupamos soluciones de Metalcon, ampliaciones, kits y vivienda terminada para visualizar qué parte del proyecto estás evaluando y qué viene después.',
    review: ['Medidas de planta y altura', 'Sistema estructural', 'Encuentro con lo existente', 'Nivel de terminación esperado'],
    process: ['Definir superficie', 'Elegir sistema y alcance', 'Coordinar estructura y envolvente', 'Presupuestar por etapa o solución'],
  },
  Instalaciones: {
    icon: HousePlug,
    eyebrow: 'Agua · electricidad · saneamiento',
    title: 'Las instalaciones funcionan mejor cuando el recorrido se piensa antes de cerrar.',
    summary: 'Puntos, tuberías, artefactos y equipos necesitan recorridos claros, compatibilidad y una secuencia coordinada con muros y terminaciones.',
    purpose: 'La guía ayuda a distinguir cuándo conviene calcular por punto, metro lineal o unidad y qué información es necesaria antes de abrir o cerrar superficies.',
    review: ['Puntos existentes y nuevos', 'Recorridos y distancias', 'Estado de las redes', 'Equipos o artefactos a conectar'],
    process: ['Ubicar puntos y equipos', 'Trazar recorridos', 'Definir cantidad o longitud', 'Probar antes de cerrar'],
  },
  Terminaciones: {
    icon: PaintRoller,
    eyebrow: 'Pisos · pintura · revestimientos',
    title: 'La terminación se nota cuando la base está bien resuelta.',
    summary: 'El resultado final depende tanto del material elegido como de la preparación de la superficie, sus encuentros y su compatibilidad.',
    purpose: 'Revestimientos, pintura, pisos y remates se entienden mejor separando superficie real, preparación necesaria y nivel de terminación esperado.',
    review: ['Planeidad y humedad', 'Estado de la base', 'Encuentros y remates', 'Formato del material elegido'],
    process: ['Revisar soporte', 'Medir superficie útil', 'Definir material y patrón', 'Ejecutar y rematar'],
  },
  Climatización: {
    icon: AirVent,
    eyebrow: 'Equipos · capacidad · ubicación',
    title: 'Climatizar no es solo escoger un equipo: también es ubicarlo bien.',
    summary: 'Capacidad, recorrido, drenaje, alimentación eléctrica y ubicación de unidades cambian el resultado de una instalación.',
    purpose: 'La guía organiza los datos básicos para elegir una referencia de equipo y separar correctamente suministro, instalación y trabajos complementarios.',
    review: ['Superficie y volumen', 'Orientación y exposición solar', 'Ubicación interior/exterior', 'Alimentación y drenaje'],
    process: ['Medir el recinto', 'Estimar capacidad', 'Definir ubicación', 'Confirmar instalación'],
  },
  Exterior: {
    icon: Trees,
    eyebrow: 'Cierres · terrazas · protección',
    title: 'El exterior debe responder al uso, al terreno y a la exposición.',
    summary: 'Cierres, terrazas y soluciones exteriores cambian según longitud, nivelación, apoyos y materialidad elegida.',
    purpose: 'Medimos recorridos y superficies para diferenciar estructura, terminación y elementos que requieren anclajes o preparación adicional.',
    review: ['Longitud o superficie', 'Pendiente y nivel del terreno', 'Apoyos y fijaciones', 'Exposición a lluvia y sol'],
    process: ['Trazar el área', 'Definir apoyos', 'Elegir materialidad', 'Medir y presupuestar'],
  },
  Carpintería: {
    icon: PanelsTopLeft,
    eyebrow: 'Madera · mobiliario · ajustes',
    title: 'La carpintería comienza con medidas reales, no con una medida aproximada.',
    summary: 'Puertas, muebles, repisas y elementos a medida necesitan considerar tolerancias, herrajes, uso y condiciones del lugar.',
    purpose: 'La guía permite entender qué se mide por unidad, qué depende de fabricación especial y qué información reduce errores antes de producir.',
    review: ['Huecos y medidas finales', 'Material y espesor', 'Herrajes y apertura', 'Uso y carga esperada'],
    process: ['Medir en terreno', 'Definir material', 'Resolver herrajes y encuentros', 'Fabricar, instalar y ajustar'],
  },
};

const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  'Obra base': Blocks,
  Construcción: Building2,
  Instalaciones: Wrench,
  Terminaciones: Sparkles,
  Climatización: AirVent,
  Exterior: Trees,
  Carpintería: Hammer,
};

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
}

function unitCopy(service: BudgetService) {
  if (service.unit === 'm²') return 'Se mide por superficie';
  if (service.unit === 'm³') return 'Se mide por volumen';
  if (service.unit === 'ml') return 'Se mide por recorrido lineal';
  if (service.unit === 'punto') return 'Se mide por punto';
  return 'Se mide por unidad';
}

function trackSolution(event: string, meta: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  void fetch('/api/pwa/track', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, platform: 'web', meta: { ...meta, path: '/soluciones' } }),
  }).catch(() => undefined);
}

export default function SolucionesGuidePage() {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('Construcción');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [visuals, setVisuals] = useState<Partial<Record<ServiceCategory, Visual>>>({});

  const servicesByCategory = useMemo(() => {
    return SERVICE_CATEGORIES.reduce<Record<ServiceCategory, BudgetService[]>>((result, category) => {
      result[category] = BUDGET_SERVICES.filter((service) => service.category === category);
      return result;
    }, {} as Record<ServiceCategory, BudgetService[]>);
  }, []);

  const activeServices = servicesByCategory[activeCategory];
  const selected = activeServices.find((service) => service.id === selectedId) || activeServices[0];
  const guide = GUIDES[activeCategory];
  const GuideIcon = guide.icon;

  const filteredServices = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return activeServices;
    return activeServices.filter((service) => `${service.title} ${service.short} ${service.description}`.toLowerCase().includes(term));
  }, [activeServices, query]);

  useEffect(() => {
    if (selectedId && activeServices.some((service) => service.id === selectedId)) return;
    setSelectedId(activeServices[0]?.id || '');
  }, [activeCategory, activeServices, selectedId]);

  useEffect(() => {
    if (visuals[activeCategory]) return;
    const controller = new AbortController();
    void fetch(`/api/solution-visuals?key=${encodeURIComponent(activeCategory)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { visual?: Visual } | null) => {
        if (!data?.visual) return;
        setVisuals((current) => ({ ...current, [activeCategory]: data.visual }));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [activeCategory, visuals]);

  function chooseCategory(category: ServiceCategory) {
    setActiveCategory(category);
    setSelectedId(servicesByCategory[category][0]?.id || '');
    setQuery('');
    trackSolution('solution_category_selected', { category });
  }

  function chooseService(service: BudgetService) {
    setSelectedId(service.id);
    trackSolution('solution_service_selected', {
      service_id: service.id,
      service_title: service.title,
      category: service.category,
      unit: service.unit,
    });
  }

  const visual = visuals[activeCategory];

  return (
    <div className="bg-[#F4F1EB] text-[#171715]">
      <section className="relative overflow-hidden bg-[#10110F] px-4 pb-12 pt-28 text-[#F7F4EE] sm:px-6 lg:px-8 lg:pb-16 lg:pt-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(199,132,64,.14),transparent_27rem),linear-gradient(180deg,rgba(255,255,255,.015),transparent_36%)]" />
        <div className="relative mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[10px] font-semibold text-white/58">
              <Compass className="h-3.5 w-3.5 text-[#D79550]" /> Guía de soluciones
            </div>
            <h1 className="mt-5 max-w-[12ch] font-[Sora] text-[clamp(2.7rem,7vw,5.8rem)] font-semibold leading-[.94] tracking-[-.065em]">
              Entiende el trabajo antes de cotizarlo.
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/54 sm:text-base">
              Explora cada área como una mini guía: qué resuelve, qué se revisa, cómo se mide y qué servicio puedes llevar directamente a la calculadora.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/presupuesto" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#D79550] px-5 text-xs font-semibold text-[#16120D] transition hover:bg-[#E9B06F]">
                Ir al presupuesto <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/servicios" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 px-5 text-xs font-semibold text-white/76 transition hover:border-white/25 hover:text-white">
                Ver catálogo técnico
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] border border-white/[.08] bg-white/[.08] sm:grid-cols-4 lg:grid-cols-2">
            <HeroStat icon={Ruler} label="Medición" value="m² · m³ · ml" />
            <HeroStat icon={ShieldCheck} label="Alcance" value="Antes de ejecutar" />
            <HeroStat icon={Hammer} label="Servicios" value={`${BUDGET_SERVICES.length} referencias`} />
            <HeroStat icon={CheckCircle2} label="Siguiente paso" value="Calcular y cotizar" />
          </div>
        </div>
      </section>

      <section className="border-b border-black/[.06] bg-[#F8F6F2] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1320px] gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SERVICE_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            const active = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => chooseCategory(category)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[11px] font-semibold transition ${active ? 'bg-[#171715] text-[#F1B36F]' : 'border border-black/[.07] bg-white text-black/48 hover:text-black/72'}`}
              >
                <Icon className="h-3.5 w-3.5" /> {category}
                <span className="text-[9px] opacity-45">{servicesByCategory[category].length}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-18">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#9A683B]">{guide.eyebrow}</p>
              <h2 className="mt-3 max-w-[14ch] font-[Sora] text-3xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-5xl">{guide.title}</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#6E675F]">{guide.summary}</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(300px,.7fr)_minmax(0,1.3fr)] lg:items-start">
            <aside className="rounded-[1.6rem] border border-black/[.06] bg-[#FBFAF7] p-4 sm:p-5 lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-black/36">Selecciona un servicio</p>
                  <p className="mt-1 text-sm font-semibold">{activeCategory}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEE9E0] text-[#8D5E33]"><GuideIcon className="h-4 w-4" /></span>
              </div>

              <label className="mt-4 flex items-center gap-2 rounded-xl border border-black/[.07] bg-white px-3.5 py-3">
                <Search className="h-4 w-4 text-black/30" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-black/28" placeholder="Buscar dentro del área" />
              </label>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {filteredServices.map((service) => {
                  const Icon = service.icon;
                  const active = selected?.id === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => chooseService(service)}
                      className={`group rounded-[1.15rem] border p-3.5 text-left transition ${active ? 'border-[#D79550]/35 bg-[#1B1B18] text-white' : 'border-black/[.055] bg-white hover:border-black/15'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-[#D79550] text-[#16120D]' : 'bg-[#F1EDE6] text-[#795331]'}`}><Icon className="h-4 w-4" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-xs font-semibold leading-5">{service.short}</h3>
                            <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${active ? 'bg-white/8 text-white/48' : 'bg-[#F2EEE8] text-black/38'}`}>{service.unit}</span>
                          </div>
                          <p className={`mt-1.5 line-clamp-2 text-[10px] leading-4 ${active ? 'text-white/42' : 'text-black/42'}`}>{service.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="overflow-hidden rounded-[1.8rem] border border-black/[.06] bg-[#FCFBF8] shadow-[0_22px_65px_rgba(47,38,28,.07)]">
              <div className="relative aspect-[16/9] min-h-[250px] overflow-hidden bg-[#24241F] sm:min-h-[360px]">
                {visual ? (
                  <img src={visual.src} alt={visual.alt} className="h-full w-full object-cover" loading="eager" decoding="async" />
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-[linear-gradient(120deg,#22231f,#37342e,#22231f)]" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.08)_42%,rgba(0,0,0,.76))]" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 lg:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/55">
                    <span>{selected?.category}</span><span className="h-1 w-1 rounded-full bg-[#D79550]" /><span>{unitCopy(selected)}</span>
                  </div>
                  <h3 className="mt-2 max-w-3xl font-[Sora] text-2xl font-semibold tracking-[-.035em] sm:text-4xl">{selected?.title}</h3>
                  <p className="mt-3 max-w-2xl text-xs leading-6 text-white/65 sm:text-sm">{selected?.description}</p>
                </div>
              </div>

              {visual ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[.06] px-5 py-3 text-[9px] text-black/36 sm:px-7">
                  <span>Imagen de referencia visual</span>
                  <span>
                    Foto de <a className="underline underline-offset-2 hover:text-black/60" href={visual.photographerUrl} target="_blank" rel="noreferrer">{visual.photographer}</a> en <a className="underline underline-offset-2 hover:text-black/60" href={visual.photoUrl} target="_blank" rel="noreferrer">Pexels</a>
                  </span>
                </div>
              ) : null}

              <div className="grid gap-px bg-black/[.055] md:grid-cols-3">
                <InfoCell label="Cómo se mide" value={unitCopy(selected)} detail={`Unidad de referencia: ${selected.unit}`} icon={Ruler} />
                <InfoCell label="Mano de obra" value={`${money(selected.laborMin)}–${money(selected.laborMax)}`} detail={`Referencia por ${selected.unit}`} icon={Hammer} />
                <InfoCell label="Trabajo vendido" value={`${money(selected.marketMin)}–${money(selected.marketMax)}`} detail={`Referencia por ${selected.unit}`} icon={ShieldCheck} />
              </div>

              <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-2 lg:p-9">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#9A683B]">Qué resuelve esta área</p>
                  <p className="mt-3 text-sm leading-7 text-[#605A53]">{guide.purpose}</p>

                  <div className="mt-7">
                    <p className="text-xs font-semibold">Antes de ejecutar revisamos</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {guide.review.map((item) => <GuideCheck key={item}>{item}</GuideCheck>)}
                    </div>
                  </div>

                  <div className="mt-7 rounded-[1.25rem] bg-[#F1EDE6] p-4.5">
                    <div className="flex gap-3">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#9A683B]" />
                      <div>
                        <p className="text-xs font-semibold">Qué suele incluir esta partida</p>
                        <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-black/48">
                          {selected.includes.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}
                        </ul>
                        <p className="mt-3 text-[10px] leading-5 text-black/38">{selected.disclaimer}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#9A683B]">Cómo se desarrolla</p>
                  <div className="mt-4 grid gap-2.5">
                    {guide.process.map((step, index) => (
                      <div key={step} className="flex items-center gap-4 rounded-[1.15rem] border border-black/[.055] bg-white p-4">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#191917] text-[10px] font-semibold text-[#E9B06F]">0{index + 1}</span>
                        <span className="text-xs font-semibold text-black/72">{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[1.35rem] bg-[#191917] p-5 text-white sm:p-6">
                    <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#DCA05E]">Siguiente paso</p>
                    <h4 className="mt-2 font-[Sora] text-xl font-semibold tracking-[-.03em]">Lleva este servicio a la calculadora.</h4>
                    <p className="mt-2 text-[11px] leading-5 text-white/44">El presupuesto conserva la unidad de medición y te permite comparar solo ejecución con trabajo vendido.</p>
                    <Link
                      href={`/presupuesto?servicio=${encodeURIComponent(selected.id)}`}
                      onClick={() => trackSolution('solution_budget_clicked', { service_id: selected.id, category: selected.category })}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#D79550] px-5 text-xs font-semibold text-[#17120D] transition hover:bg-[#E7AD6B]"
                    >
                      Calcular {selected.short} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#EAE5DD] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#93643B]">Mapa de soluciones</p>
              <h2 className="mt-3 font-[Sora] text-3xl font-semibold tracking-[-.045em] sm:text-4xl">No necesitas saber el nombre técnico para empezar.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#69625A]">Elige el área que más se parece a tu necesidad. Desde ahí puedes revisar la mini guía, seleccionar una partida concreta y enviarla a la calculadora.</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SERVICE_CATEGORIES.map((category) => {
              const config = GUIDES[category];
              const Icon = CATEGORY_ICONS[category];
              return (
                <button key={category} type="button" onClick={() => { chooseCategory(category); window.scrollTo({ top: 620, behavior: 'smooth' }); }} className="group rounded-[1.4rem] border border-black/[.055] bg-[#F8F6F2] p-5 text-left transition hover:-translate-y-0.5 hover:border-black/12">
                  <div className="flex items-start justify-between gap-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E8E1D7] text-[#815833]"><Icon className="h-4 w-4" /></span><span className="text-[9px] text-black/28">{servicesByCategory[category].length} servicios</span></div>
                  <h3 className="mt-5 text-sm font-semibold">{category}</h3>
                  <p className="mt-2 line-clamp-3 text-[11px] leading-5 text-black/42">{config.summary}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#8E5F35]">Abrir guía <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" /></span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#11110F] px-4 py-14 text-white sm:px-6 lg:px-8 lg:py-18">
        <div className="mx-auto flex max-w-[1100px] flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#D99A57]">De la idea al cálculo</p>
            <h2 className="mt-3 max-w-[14ch] font-[Sora] text-3xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-5xl">Cuando ya entiendes el trabajo, cotizarlo es mucho más simple.</h2>
          </div>
          <Link href="/presupuesto" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#D79550] px-6 text-xs font-semibold text-[#17120D]">Armar presupuesto <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-[#151613] p-4 sm:p-5">
      <Icon className="h-4 w-4 text-[#D79550]" />
      <p className="mt-4 text-[9px] font-semibold uppercase tracking-[.14em] text-white/30">{label}</p>
      <p className="mt-1 text-xs font-semibold text-white/78">{value}</p>
    </div>
  );
}

function InfoCell({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return (
    <div className="bg-[#F8F6F2] p-5 sm:p-6">
      <div className="flex items-center gap-2 text-[#8D5D32]"><Icon className="h-4 w-4" /><span className="text-[9px] font-semibold uppercase tracking-[.13em]">{label}</span></div>
      <p className="mt-3 text-sm font-semibold tracking-[-.015em]">{value}</p>
      <p className="mt-1 text-[10px] text-black/34">{detail}</p>
    </div>
  );
}

function GuideCheck({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-xl border border-black/[.055] bg-white px-3.5 py-3 text-[11px] font-medium text-black/62"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#E7DDCF] text-[#8B5B31]"><Check className="h-3 w-3" /></span>{children}</div>;
}
