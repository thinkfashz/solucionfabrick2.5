'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calculator,
  Check,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  ImageIcon,
  Info,
  Layers3,
  Ruler,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { AppNavbar } from '@/components/landing/AppNavbar';
import {
  BUDGET_SERVICES,
  SERVICE_CATEGORIES,
  getServicePriceRange,
  type BudgetService,
  type MeasurementKind,
  type ServiceCategory,
} from '@/components/presupuesto/serviceCatalog';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const money = (value: number) => CLP.format(Math.round(value || 0));

type GuideCategory = ServiceCategory | 'Todas';
type Photo = { id: string; src: string; alt: string; photographer?: string; url?: string; source?: string };

const CATEGORY_COPY: Record<ServiceCategory, { title: string; text: string }> = {
  'Obra base': { title: 'La base del proyecto', text: 'Partidas que preparan, nivelan y sostienen lo que viene después.' },
  Construcción: { title: 'Estructura y envolvente', text: 'Soluciones para levantar, ampliar, cubrir y cerrar nuevos espacios.' },
  Instalaciones: { title: 'Redes que hacen funcionar el espacio', text: 'Agua, electricidad y soluciones sanitarias organizadas según el alcance real.' },
  Terminaciones: { title: 'La capa que define el resultado', text: 'Revestimientos, superficies y remates que completan la experiencia del espacio.' },
  Climatización: { title: 'Confort térmico', text: 'Selección e instalación de equipos según recinto, capacidad y condiciones de montaje.' },
  Exterior: { title: 'Uso y protección exterior', text: 'Terrazas, cierres y soluciones para ordenar y aprovechar mejor el entorno.' },
  Carpintería: { title: 'Medida, función y detalle', text: 'Elementos de madera y mobiliario ajustados al espacio y al uso cotidiano.' },
};

const MEASUREMENT_COPY: Record<MeasurementKind, string> = {
  floor: 'Se toma la superficie de planta: largo × ancho.',
  wall: 'Se calcula la superficie efectiva del muro: largo × alto.',
  'room-walls': 'Se considera el perímetro del recinto por su altura.',
  slab: 'Se calcula la superficie y se ajusta según el espesor del radier.',
  volume: 'Se calcula volumen: largo × ancho × profundidad o altura.',
  linear: 'Se mide el recorrido total en metros lineales.',
  count: 'Se cobra por cantidad de puntos o unidades ejecutadas.',
};

function rangeText(service: BudgetService, mode: 'labor' | 'complete') {
  const range = getServicePriceRange(service, mode);
  return `${money(range.min)} – ${money(range.max)} / ${service.unit}`;
}

function unitName(service: BudgetService) {
  if (service.unit === 'm²') return 'metro cuadrado';
  if (service.unit === 'm³') return 'metro cúbico';
  if (service.unit === 'ml') return 'metro lineal';
  if (service.unit === 'punto') return 'punto';
  return 'unidad';
}

export function SolucionesGuidePage() {
  const [category, setCategory] = useState<GuideCategory>('Todas');
  const [selectedId, setSelectedId] = useState(BUDGET_SERVICES[0]?.id || 'albanileria');
  const [query, setQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoLoading, setPhotoLoading] = useState(true);

  const selected = BUDGET_SERVICES.find((item) => item.id === selectedId) || BUDGET_SERVICES[0];
  const categoryInfo = CATEGORY_COPY[selected.category];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return BUDGET_SERVICES.filter((item) => {
      const inCategory = category === 'Todas' || item.category === category;
      const inSearch = !normalized || `${item.title} ${item.short} ${item.description} ${item.category}`.toLowerCase().includes(normalized);
      return inCategory && inSearch;
    });
  }, [category, query]);

  useEffect(() => {
    if (filtered.some((item) => item.id === selectedId)) return;
    if (filtered[0]) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    setPhotoLoading(true);
    void fetch(`/api/service-visuals?service=${encodeURIComponent(selected.id)}&category=${encodeURIComponent(selected.category)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { photos?: Photo[] }) => setPhotos(Array.isArray(data.photos) ? data.photos.slice(0, 3) : []))
      .catch(() => setPhotos([]))
      .finally(() => setPhotoLoading(false));
    return () => controller.abort();
  }, [selected.category, selected.id]);

  function selectCategory(next: GuideCategory) {
    setCategory(next);
    const first = next === 'Todas' ? BUDGET_SERVICES[0] : BUDGET_SERVICES.find((item) => item.category === next);
    if (first) setSelectedId(first.id);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F4F1EB] text-[#111214]">
      <AppNavbar />

      <section className="relative isolate overflow-hidden bg-[#0D0F10] px-4 pb-14 pt-24 text-[#F8F5EF] sm:px-6 sm:pb-18 lg:px-8 lg:pb-20 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(205,139,65,.14),transparent_30rem),radial-gradient(circle_at_88%_80%,rgba(255,255,255,.05),transparent_28rem)]" />
        <div className="relative mx-auto max-w-[1320px]">
          <div className="grid gap-9 lg:grid-cols-[1.1fr_.7fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#D79A50]">Guía de soluciones</p>
              <h1 className="mt-4 max-w-[12ch] font-[Sora] text-[clamp(2.5rem,7vw,5.7rem)] font-semibold leading-[.94] tracking-[-.055em]">
                Entiende el trabajo antes de presupuestarlo.
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
                Una guía visual para conocer qué resuelve cada partida, cómo se mide, qué suele incluir y qué factores conviene revisar antes de avanzar.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#guia" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#D99545] px-6 text-xs font-bold text-[#111214] transition hover:bg-[#E7AB61]">
                  Explorar soluciones <ArrowRight className="h-4 w-4" />
                </a>
                <Link href="/presupuesto" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 px-6 text-xs font-bold text-white/78 transition hover:border-white/25 hover:bg-white/[.04]">
                  Abrir calculadora <Calculator className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[1.4rem] border border-white/[.08] bg-white/[.08]">
              <HeroMetric value={String(BUDGET_SERVICES.length)} label="soluciones" />
              <HeroMetric value="5" label="formas de cobro" />
              <HeroMetric value={String(SERVICE_CATEGORIES.length)} label="áreas de trabajo" />
            </div>
          </div>
        </div>
      </section>

      <section id="guia" className="scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-18">
        <div className="mx-auto max-w-[1320px]">
          <header className="grid gap-5 border-b border-black/[.07] pb-7 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#A86722]">Panel de información</p>
              <h2 className="mt-3 max-w-[13ch] font-[Sora] text-3xl font-semibold leading-[1.02] tracking-[-.04em] sm:text-4xl lg:text-5xl">Selecciona un trabajo y revisa su lógica.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-[#66615A]">No necesitas conocer todos los términos técnicos. Elige el área que se parece a tu proyecto y revisa una referencia clara antes de abrir la calculadora.</p>
          </header>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CategoryChip active={category === 'Todas'} label="Todas" count={BUDGET_SERVICES.length} onClick={() => selectCategory('Todas')} />
            {SERVICE_CATEGORIES.map((item) => (
              <CategoryChip key={item} active={category === item} label={item} count={BUDGET_SERVICES.filter((service) => service.category === item).length} onClick={() => selectCategory(item)} />
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)] xl:items-start">
            <aside className="xl:sticky xl:top-24">
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-black/[.07] bg-white px-4 shadow-[0_10px_30px_rgba(30,24,17,.035)]">
                <Search className="h-4 w-4 text-[#A86722]" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar albañilería, radier…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-black/30" />
              </label>

              <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 xl:grid xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1">
                {filtered.map((item) => (
                  <ServiceSelector key={item.id} service={item} active={item.id === selected.id} onClick={() => setSelectedId(item.id)} />
                ))}
                {!filtered.length ? <div className="min-w-[260px] rounded-2xl border border-dashed border-black/10 bg-white/60 p-5 text-sm text-black/45">No encontré una solución con ese nombre.</div> : null}
              </div>
            </aside>

            <article className="overflow-hidden rounded-[1.9rem] border border-black/[.06] bg-[#FCFAF6] shadow-[0_24px_70px_rgba(40,31,22,.07)]">
              <ServiceVisual photos={photos} loading={photoLoading} title={selected.title} category={selected.category} />

              <div className="p-5 sm:p-7 lg:p-9">
                <div className="flex flex-col gap-5 border-b border-black/[.07] pb-7 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#A86722]">
                      <span>{selected.category}</span><span className="h-1 w-1 rounded-full bg-current opacity-40" /><span>Se referencia por {unitName(selected)}</span>
                    </div>
                    <h2 className="mt-3 font-[Sora] text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{selected.title}</h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-[#625E58]">{selected.description}</p>
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#17191A] px-4 py-2.5 text-xs font-semibold text-[#E7AB61]"><Ruler className="h-4 w-4" /> {selected.unit}</span>
                </div>

                <div className="grid gap-px overflow-hidden rounded-[1.45rem] border border-black/[.06] bg-black/[.06] md:grid-cols-2 xl:grid-cols-4 mt-7">
                  <GuideCell icon={Sparkles} title="Qué resuelve" text={categoryInfo.text} />
                  <GuideCell icon={Ruler} title="Cómo se mide" text={MEASUREMENT_COPY[selected.measurement]} />
                  <GuideCell icon={Layers3} title="Qué suele incluir" text={selected.includes[0] || 'La partida definida y sus remates básicos.'} />
                  <GuideCell icon={Info} title="Qué revisar" text={selected.disclaimer} />
                </div>

                <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_.9fr]">
                  <section>
                    <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#A86722]">Alcance habitual</p>
                    <h3 className="mt-2 font-[Sora] text-2xl font-semibold tracking-[-.035em]">Lo que normalmente forma parte de esta solución.</h3>
                    <div className="mt-5 grid gap-3">
                      {selected.includes.map((item) => (
                        <div key={item} className="flex gap-3 rounded-2xl border border-black/[.055] bg-white px-4 py-3.5">
                          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#EEE5D8] text-[#9B621F]"><Check className="h-3.5 w-3.5" /></span>
                          <p className="text-sm leading-6 text-[#514D47]">{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[1.55rem] bg-[#151718] p-5 text-white sm:p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#D99545]">Referencia de cobro</p>
                    <h3 className="mt-2 font-[Sora] text-2xl font-semibold tracking-[-.035em]">Dos maneras de entender el valor.</h3>
                    <p className="mt-3 text-xs leading-6 text-white/44">Estos rangos orientan; el valor final depende del alcance confirmado y de las condiciones reales del lugar.</p>
                    <div className="mt-5 grid gap-2">
                      <PriceBand label="Solo ejecución" detail="Mano de obra" value={rangeText(selected, 'labor')} />
                      <PriceBand label="Trabajo vendido" detail="Ejecución + insumos base definidos" value={rangeText(selected, 'complete')} accent />
                    </div>
                    <div className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.035] p-4">
                      <div className="flex gap-3"><Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[#D99545]" /><p className="text-[11px] leading-6 text-white/48">{selected.disclaimer}</p></div>
                    </div>
                  </section>
                </div>

                <div className="mt-8 border-t border-black/[.07] pt-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#A86722]">Ruta recomendada</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <GuideStep number="01" title="Identifica" text="Define qué parte del espacio quieres intervenir." />
                    <GuideStep number="02" title="Mide" text={MEASUREMENT_COPY[selected.measurement]} />
                    <GuideStep number="03" title="Compara" text="Revisa ejecución frente a trabajo vendido." />
                    <GuideStep number="04" title="Confirma" text="Envía la referencia para revisar alcance y visita." />
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 rounded-[1.55rem] bg-[#EEE8DF] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#8E591D]">Siguiente paso</p>
                    <p className="mt-2 max-w-xl font-[Sora] text-xl font-semibold tracking-[-.03em]">Usa esta misma partida en la calculadora sin volver a buscarla.</p>
                  </div>
                  <Link href={`/presupuesto?servicio=${encodeURIComponent(selected.id)}`} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#151718] px-6 text-xs font-bold text-[#E8AA61] transition hover:bg-black">
                    Calcular {selected.short.toLowerCase()} <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return <div className="bg-[#141617] px-3 py-5 text-center sm:px-5"><b className="block font-[Sora] text-2xl font-semibold text-[#E3A257] sm:text-3xl">{value}</b><span className="mt-1 block text-[9px] leading-4 text-white/38">{label}</span></div>;
}

function CategoryChip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-semibold transition ${active ? 'border-[#151718] bg-[#151718] text-[#E6A65C]' : 'border-black/[.07] bg-white/70 text-[#69635C] hover:border-black/15'}`}>{label} <span className="ml-1 opacity-45">{count}</span></button>;
}

function ServiceSelector({ service, active, onClick }: { service: BudgetService; active: boolean; onClick: () => void }) {
  const Icon = service.icon;
  return (
    <button type="button" onClick={onClick} className={`group min-w-[245px] rounded-2xl border p-3.5 text-left transition xl:min-w-0 ${active ? 'border-[#17191A] bg-[#17191A] text-white' : 'border-black/[.055] bg-white/75 text-[#252321] hover:bg-white'}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-[#D99545] text-[#151718]' : 'bg-[#EEE8DF] text-[#9A621F]'}`}><Icon className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1"><p className={`text-[9px] font-semibold uppercase tracking-[.1em] ${active ? 'text-[#DFA75F]' : 'text-black/35'}`}>{service.category} · {service.unit}</p><h3 className="mt-1 truncate text-sm font-semibold">{service.short}</h3></div>
        <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-[#DFA75F]' : 'text-black/20 group-hover:text-black/45'}`} />
      </div>
    </button>
  );
}

function ServiceVisual({ photos, loading, title, category }: { photos: Photo[]; loading: boolean; title: string; category: string }) {
  const primary = photos[0];
  return (
    <div className="relative grid min-h-[300px] overflow-hidden bg-[#D9D4CC] sm:min-h-[390px] lg:grid-cols-[1.55fr_.65fr]">
      <div className="relative min-h-[300px] sm:min-h-[390px]">
        {primary ? <img src={primary.src} alt={primary.alt || title} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 grid place-items-center bg-[#DCD7CF]"><ImageIcon className="h-9 w-9 text-black/20" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
          <div><span className="rounded-full bg-black/55 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-white/80 backdrop-blur">{category}</span>{primary?.photographer ? <p className="mt-3 text-[9px] text-white/50">Referencia visual · foto {primary.photographer}</p> : <p className="mt-3 text-[9px] text-white/45">Referencia visual del tipo de trabajo</p>}</div>
          {loading ? <span className="rounded-full bg-black/45 px-3 py-1.5 text-[9px] text-white/55">Actualizando imágenes…</span> : null}
        </div>
      </div>
      <div className="hidden gap-px bg-black/[.08] lg:grid lg:grid-rows-2">
        {[photos[1], photos[2]].map((photo, index) => <div key={photo?.id || index} className="relative overflow-hidden bg-[#D7D2CB]">{photo ? <img src={photo.src} alt={photo.alt || title} className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-[1.025]" /> : null}</div>)}
      </div>
    </div>
  );
}

function GuideCell({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="bg-white p-4 sm:p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F0E9DF] text-[#95601F]"><Icon className="h-4 w-4" /></span><p className="mt-4 text-[9px] font-semibold uppercase tracking-[.12em] text-black/38">{title}</p><p className="mt-2 text-xs leading-6 text-[#5E5953]">{text}</p></div>;
}

function PriceBand({ label, detail, value, accent = false }: { label: string; detail: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? 'border-[#D99545]/30 bg-[#D99545]/10' : 'border-white/[.08] bg-white/[.035]'}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-[10px] font-semibold ${accent ? 'text-[#E4AA64]' : 'text-white/65'}`}>{label}</p><p className="mt-1 text-[9px] text-white/30">{detail}</p></div><ClipboardCheck className={`h-4 w-4 ${accent ? 'text-[#D99545]' : 'text-white/25'}`} /></div><b className="mt-3 block text-base font-semibold tracking-[-.02em] text-white">{value}</b></div>;
}

function GuideStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-2xl border border-black/[.055] bg-white/70 p-4"><span className="text-[9px] font-semibold tracking-[.12em] text-[#9C6525]">{number}</span><h4 className="mt-3 text-sm font-semibold">{title}</h4><p className="mt-2 text-[11px] leading-5 text-black/43">{text}</p></div>;
}
