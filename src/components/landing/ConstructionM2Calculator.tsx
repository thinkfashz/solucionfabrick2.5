'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Info,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  Ruler,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  BUDGET_SERVICES,
  SERVICE_CATEGORIES,
  calculateServiceMeasurement,
  type BudgetService,
  type MeasurementValues,
  type ServiceCategory,
} from '@/components/presupuesto/serviceCatalog';

const SERVICES = BUDGET_SERVICES;
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const money = (value: number) => CLP.format(Math.round(value || 0));
const number = (value: number) => NUMBER.format(value || 0);

const CATEGORY_ORDER: ServiceCategory[] = [...SERVICE_CATEGORIES];
const CATEGORY_ICON: Record<ServiceCategory, string> = {
  'Obra base': '#F5871F',
  'Construcción': '#FFB000',
  'Instalaciones': '#AFC8D0',
  'Terminaciones': '#C29A78',
  'Climatización': '#B8C8D0',
  'Exterior': '#9DA487',
  'Carpintería': '#A98263',
};

interface FieldConfig { key: keyof MeasurementValues; label: string; hint: string; max: number; step: number; }
const FIELD_SETS: Record<string, Array<FieldConfig>> = {
  floor: [
    { key: 'length', label: 'Largo', hint: 'metros lineales', max: 30, step: 0.1 },
    { key: 'width', label: 'Ancho', hint: 'metros lineales', max: 20, step: 0.1 },
  ],
  wall: [
    { key: 'length', label: 'Largo del muro', hint: 'metros lineales', max: 30, step: 0.1 },
    { key: 'height', label: 'Alto del muro', hint: 'metros de altura', max: 6, step: 0.1 },
  ],
  'room-walls': [
    { key: 'length', label: 'Largo del recinto', hint: 'metros lineales', max: 30, step: 0.1 },
    { key: 'width', label: 'Ancho del recinto', hint: 'metros lineales', max: 20, step: 0.1 },
    { key: 'height', label: 'Alto de los muros', hint: 'metros de altura', max: 6, step: 0.1 },
  ],
  slab: [
    { key: 'length', label: 'Largo', hint: 'metros lineales', max: 30, step: 0.1 },
    { key: 'width', label: 'Ancho', hint: 'metros lineales', max: 20, step: 0.1 },
    { key: 'height', label: 'Espesor', hint: 'metros (0.10 = 10 cm)', max: 0.3, step: 0.01 },
  ],
  volume: [
    { key: 'length', label: 'Largo', hint: 'metros lineales', max: 30, step: 0.1 },
    { key: 'width', label: 'Ancho', hint: 'metros lineales', max: 10, step: 0.1 },
    { key: 'height', label: 'Profundidad', hint: 'metros de profundidad', max: 3, step: 0.05 },
  ],
  linear: [
    { key: 'length', label: 'Longitud total', hint: 'metros lineales', max: 200, step: 1 },
  ],
};

export default function ConstructionM2Calculator() {
  const [category, setCategory] = useState<ServiceCategory | 'Todas'>('Todas');
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [values, setValues] = useState<MeasurementValues>(SERVICES[0].defaultValues);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [directArea, setDirectArea] = useState(0);
  const service = SERVICES.find((item) => item.id === serviceId) || SERVICES[0];
  const Icon = service.icon;
  const measurement = useMemo(() => calculateServiceMeasurement(service, values), [service, values]);
  const supportsDirect = service.unit === 'm²' && service.measurement !== 'volume';
  const quote = useMemo(() => {
    if (!areaMode) return measurement;
    const factor = service.measurement === 'slab' ? measurement.priceFactor : 1;
    return {
      quantity: directArea,
      priceFactor: factor,
      formula: service.measurement === 'slab' ? 'Superficie directa × ajuste por espesor' : 'Superficie ingresada directa',
      detail: `${number(directArea)} m² directos`,
      secondary: service.measurement === 'slab' ? `${number(directArea)} m² · ${number(directArea * Math.max(0.05, values.height))} m³ de hormigón` : undefined,
    };
  }, [areaMode, directArea, measurement, service, values.height]);
  const low = quote.quantity * service.marketMin * quote.priceFactor;
  const high = quote.quantity * service.marketMax * quote.priceFactor;
  const average = Math.round((low + high) / 2);
  const unitMin = service.marketMin * quote.priceFactor;
  const unitMax = service.marketMax * quote.priceFactor;
  const midpoint = Math.round(low + (high - low) * 0.35);

  const visibleServices = category === 'Todas' ? SERVICES : SERVICES.filter((item) => item.category === category);
  const fields = service.measurement === 'count'
    ? null
    : service.measurement === 'linear'
      ? FIELD_SETS.linear
      : FIELD_SETS[service.measurement] || FIELD_SETS.floor;

  const reference = useMemo(() => {
    const compactService = service.id.split('-').map((part) => part.slice(0, 2).toUpperCase()).join('').slice(0, 8);
    return `FBK-${compactService}-${String(Math.round(quote.quantity)).padStart(3, '0')}`;
  }, [quote.quantity, service.id]);

  const whatsappMessage = useMemo(() => [
    'Hola Soluciones Fabrick, quiero revisar esta estimación referencial.',
    '',
    `Referencia: ${reference}`,
    `Servicio: ${service.title}`,
    `Fórmula: ${quote.formula}`,
    `Medidas: ${quote.detail}`,
    quote.secondary ? `Resultado dimensional: ${quote.secondary}` : '',
    `Cantidad calculada: ${number(quote.quantity)} ${service.unit}`,
    `Rango referencial mostrado: ${money(low)} a ${money(high)}`,
    '',
    'Quiero confirmar alcance, ubicación y precio final.',
  ].filter(Boolean).join('\n'), [high, low, quote, reference, service]);

  function chooseService(nextId: string) {
    const next = SERVICES.find((item) => item.id === nextId) || SERVICES[0];
    setServiceId(next.id);
    setValues(next.defaultValues);
    setMobileListOpen(false);
    setAreaMode(false);
    setDirectArea(0);
  }

  function updateValue(key: keyof MeasurementValues, value: number) {
    setValues((current) => {
      const field = fields?.find((item) => item.key === key);
      return { ...current, [key]: Math.max(0, Math.min(field?.max ?? 999, Number(value) || 0)) };
    });
  }

  function analyzeWithFabrick() {
    const prompt = [
      'Analiza esta estimación referencial como orientador comercial y técnico de construcción en Chile.',
      `Referencia: ${reference}`,
      `Servicio: ${service.title}`,
      `Categoría: ${service.category}`,
      `Fórmula utilizada: ${quote.formula}`,
      `Medidas ingresadas: ${quote.detail}`,
      quote.secondary ? `Resultado dimensional adicional: ${quote.secondary}` : '',
      `Cantidad calculada: ${number(quote.quantity)} ${service.unit}`,
      `Rango referencial 2026 actual: ${money(low)} a ${money(high)}. Promedio: ${money(average)}.`,
      `Incluye como referencia: ${service.includes.join('; ')}.`,
      `Advertencia del estimador: ${service.disclaimer}`,
      '',
      'Entrégame un análisis más sofisticado y breve con: alcance probable, partidas que debería separar, exclusiones o riesgos, preguntas que faltan responder, etapas recomendadas y próximo paso. No conviertas este rango en precio final ni inventes medidas, permisos o materiales no informados.',
    ].filter(Boolean).join('\n');

    window.dispatchEvent(new CustomEvent('fabrick:agent-open', {
      detail: { prompt, autoSend: true },
    }));
  }

  return (
    <section id="cotizador" className="relative scroll-mt-20 overflow-hidden bg-[#FFF9EE] px-4 py-16 text-[#08090A] sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(204,177,150,.34),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(182,144,108,.18),transparent_30%)]" />
      <div className="relative mx-auto max-w-[1260px]">
        <header className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div>
            <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-[#F5871F]/20 bg-white/70 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-[#F5871F]">
              <TrendingUp className="h-3.5 w-3.5" /> Precios referenciales · actualizados 2026
            </p>
            <h2 data-split className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Mide el trabajo antes de comprometer tu inversión.</h2>
          </div>
          <div>
            <p data-reveal data-reveal-delay="0.1" className="max-w-2xl text-sm leading-7 text-[#BFB8AC] sm:text-base">Estima en menos de un minuto: elige la especialidad, anota tus medidas y obtén un <b className="font-black">rango referencial 2026</b> basado en tarifas del mercado chileno (Maule y Santiago). El valor final se confirma con el equipo después de revisar alcance y condiciones.</p>
            <p data-reveal data-reveal-delay="0.18" className="mt-3 flex max-w-2xl items-start gap-2 text-[10px] leading-5 text-[#BFB8AC]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F5871F]" /> Estos precios son referenciales y pueden variar según materiales, terreno, acceso y nivel de terminación elegido.</p>
          </div>
        </header>

        <div data-reveal data-reveal-dir="zoom" className="mt-8 grid overflow-hidden rounded-[2.25rem] bg-white shadow-[0_32px_100px_rgba(70,48,22,.16)] lg:grid-cols-[minmax(0,1.08fr)_minmax(370px,.72fr)]">
          <div className="p-5 sm:p-7 lg:p-8">
            <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-black uppercase tracking-[.14em]">
              {['Elige la especialidad', 'Ingresa las medidas', 'Revisa el rango'].map((step, index) => (
                <li key={step} className="flex items-center gap-2 text-[#7A6C61]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#08090A] text-[#FFB000]">{index + 1}</span>{step}{index < 2 ? <ChevronRight className="ml-3 h-3 w-3 text-[#F5871F]/60" aria-hidden /> : null}</li>
              ))}
            </ol>

            <div className="mt-6 flex snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setCategory('Todas')} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] transition ${category === 'Todas' ? 'bg-[#08090A] text-[#FFB000]' : 'bg-[#F4E9DE] text-[#6B5A4C] hover:bg-[#F2DFBB]'}`}>Todas</button>
              {CATEGORY_ORDER.map((item) => (
                <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] transition ${category === item ? 'bg-[#08090A] text-[#FFB000]' : 'bg-[#F4E9DE] text-[#6B5A4C] hover:bg-[#F2DFBB]'}`}>{item}</button>
              ))}
            </div>

            <div className="relative mt-4 sm:hidden">
              <button type="button" onClick={() => setMobileListOpen((open) => !open)} aria-expanded={mobileListOpen} className="flex w-full items-center gap-3 rounded-[1.4rem] bg-[#F4E9DE] p-4 text-left transition hover:bg-[#F2DFBB]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#08090A] text-[#FFB000]"><Icon className="h-4.5 w-4.5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">Cambiar especialidad</span>
                  <span className="mt-0.5 block truncate text-sm font-black">{service.short}</span>
                  <span className="mt-0.5 block text-[9px] text-[#BFB8AC]">{money(service.marketMin)} – {money(service.marketMax)} / {service.unit}</span>
                </span>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#08090A] transition-transform ${mobileListOpen ? 'rotate-180' : ''}`}><ChevronDown className="h-4 w-4" /></span>
              </button>
              {mobileListOpen ? (
                <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-[1.4rem] bg-white p-2 shadow-[0_24px_60px_rgba(70,48,22,.22)] ring-1 ring-[#08090A]/8">
                  {visibleServices.map((item) => {
                    const ItemIcon = item.icon;
                    const active = item.id === serviceId;
                    return (
                      <button key={item.id} type="button" onClick={() => chooseService(item.id)} className={`flex w-full items-center gap-3 rounded-[1rem] p-3 text-left transition ${active ? 'bg-[#08090A] text-[#FFF9EE]' : 'hover:bg-[#F4E9DE]'}`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-[#FFB000] text-[#08090A]' : 'bg-[#F4E9DE] text-[#F5871F]'}`}><ItemIcon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black">{item.short}</span>
                          <span className={`mt-0.5 block text-[9px] ${active ? 'text-white/55' : 'text-[#BFB8AC]'}`}>{money(item.marketMin)} – {money(item.marketMax)} / {item.unit}</span>
                        </span>
                        {active ? <Check className="h-4 w-4 shrink-0 text-[#FFB000]" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-3">
              {visibleServices.map((item) => {
                const ItemIcon = item.icon;
                const active = item.id === serviceId;
                return (
                  <button key={item.id} type="button" aria-pressed={active} onClick={() => chooseService(item.id)} className={`group relative overflow-hidden rounded-[1.4rem] p-4 text-left transition ${active ? 'bg-[#08090A] text-[#FFF9EE] shadow-[0_16px_38px_rgba(23,24,32,.2)]' : 'bg-[#F4E9DE] text-[#342C27] hover:-translate-y-0.5 hover:bg-[#F2DFBB]'}`}>
                    <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[.12em] ${active ? 'bg-white/10 text-[#F2DFBB]' : 'bg-white text-[#BFB8AC]'}`}>{item.unit}</span>
                    <span className={`grid h-11 w-11 place-items-center rounded-2xl transition ${active ? 'bg-[#FFB000] text-[#08090A]' : 'bg-white text-[#F5871F]'}`}><ItemIcon className="h-4.5 w-4.5" /></span>
                    <strong className="mt-3 block text-sm leading-5">{item.short}</strong>
                    <span className={`mt-1.5 block text-[9px] leading-4 ${active ? 'text-white/55' : 'text-[#BFB8AC]'}`}>{money(item.marketMin)} – {money(item.marketMax)} <span className="opacity-70">/ {item.unit}</span></span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-[1.6rem] bg-[linear-gradient(135deg,#FFF9EE,#E4CFBC)] p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5871F]">Especialidad seleccionada</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h3 className="text-lg font-black">{service.title}</h3><span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">{service.category}</span></div>
                  <p className="mt-2 text-xs leading-5 text-[#BFB8AC]">{service.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#F5871F]"><Ruler className="h-4 w-4" /> Medidas del trabajo</div>
              {supportsDirect ? (
                <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-[1.25rem] bg-[#F4E9DE] p-1.5">
                  <button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(false); }} className={`rounded-[.9rem] px-3 py-2.5 text-[10px] font-black uppercase tracking-[.1em] transition ${!areaMode ? 'bg-white text-[#08090A] shadow-sm' : 'text-[#BFB8AC]'}`}>Largo × ancho</button>
                  <button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(true); }} className={`rounded-[.9rem] px-3 py-2.5 text-[10px] font-black uppercase tracking-[.1em] transition ${areaMode ? 'bg-white text-[#08090A] shadow-sm' : 'text-[#BFB8AC]'}`}>Metros cuadrados</button>
                </div>
              ) : null}
              {service.measurement === 'count' ? (
                <div className="mt-3"><QuantityField value={values.quantity} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} onChange={(value) => updateValue('quantity', value)} /></div>
              ) : areaMode ? (
                <div className="mt-3 grid gap-4">
                  <AreaField value={directArea} onChange={(value) => setDirectArea(Math.max(0, Math.min(5000, Number(value) || 0)))} />
                  {service.measurement === 'slab' ? <SliderField field={{ key: 'height', label: 'Espesor', hint: 'metros (0.10 = 10 cm)', max: 0.3, step: 0.01 }} value={values.height} onChange={(value) => updateValue('height', value)} /> : null}
                </div>
              ) : (
                <div className="mt-3 grid gap-4">
                  {fields?.map((field) => <SliderField key={field.key} field={field} value={values[field.key]} onChange={(value) => updateValue(field.key, value)} />)}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-[1.35rem] bg-[#EEE1D5] px-4 py-3.5"><p className="flex gap-2 text-xs leading-5 text-[#BFB8AC]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F5871F]" />{service.disclaimer}</p></div>
          </div>

          <aside className="relative overflow-hidden bg-[linear-gradient(160deg,#1A1B1F_0%,#08090A_70%,#101117_100%)] p-5 text-white sm:p-7 lg:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#FFB000]/14 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.23em] text-[#FFB000]">Estimación referencial 2026</p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-.04em]">Recibo de estimación</h3>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#FFB000] text-[#08090A]"><ReceiptText className="h-5 w-5" /></span>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-full bg-white/[.065] px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] text-white/45"><span>Referencia</span><span className="text-[#F2DFBB]">{reference}</span></div>

              <div className="mt-5 rounded-[1.5rem] bg-white/[.055] p-4"><ReceiptRow label="Servicio" value={service.short} /><ReceiptRow label="Medidas" value={quote.detail} /><ReceiptRow label="Fórmula" value={quote.formula} />{quote.secondary ? <ReceiptRow label="Desglose" value={quote.secondary} /> : null}<ReceiptRow label="Resultado" value={`${number(quote.quantity)} ${service.unit}`} last /></div>

              <div className="mt-4 overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#FFB000,#FFF9EE)] p-5 text-[#08090A]" aria-live="polite">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.17em] text-[#08090A]/60"><Sparkles className="h-4 w-4" /> Rango referencial</div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#08090A]/55">Desde</span><strong className="mt-1 block text-2xl font-black">{money(low)}</strong></div>
                  <div><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#08090A]/55">Hasta</span><strong className="mt-1 block text-2xl font-black">{money(high)}</strong></div>
                </div>
                <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-[#08090A]/12">
                  <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#F5871F] via-[#08090A]/55 to-[#F5871F] opacity-25" />
                  <div className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[#08090A]" style={{ left: `clamp(2%, ${((midpoint - low) / Math.max(1, high - low)) * 100}%, 98%)` }} title="Punto medio orientativo" />
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px] text-[#08090A]/55"><span>Más económico</span><span>Estándar</span><span>Premium</span></div>
                <div className="mt-4 grid gap-2 border-t border-[#08090A]/12 pt-3 text-xs">
                  <div className="flex items-center justify-between"><span className="text-[#08090A]/60">Punto medio orientativo</span><b>{money(midpoint)}</b></div>
                  <div className="flex items-center justify-between"><span className="text-[#08090A]/60">Tarifa referencial × {service.unit}</span><b>{money(unitMin)} – {money(unitMax)}</b></div>
                </div>
              </div>

              <div className="mt-6"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]"><CircleDollarSign className="h-4 w-4" /> Esta referencia considera</div><ul className="mt-3 grid gap-2">{service.includes.map((item) => <li key={item} className="flex gap-2 rounded-xl bg-white/[.045] px-3 py-2.5 text-xs leading-5 text-[#D7CCC4]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB000]" />{item}</li>)}</ul></div>

              <button type="button" onClick={analyzeWithFabrick} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFF9EE] px-5 text-sm font-black text-[#08090A] transition hover:bg-[#FFB000]"><Bot className="h-4 w-4" /> Analizar esta estimación con Fabrick IA</button>
              <Link href={`/presupuesto?servicio=${service.id}`} className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB000] px-5 text-sm font-black text-[#08090A] transition hover:bg-[#FFD05A]">Añadir al presupuesto completo <ArrowRight className="h-4 w-4" /></Link>
              <a href={`https://wa.me/56930121625?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[.075] px-5 text-xs font-black text-white transition hover:bg-white/[.13]">Revisar solo esta estimación <MessageCircle className="h-4 w-4" /></a>
              <p className="mt-4 text-center text-[10px] leading-5 text-white/35">Rangos referenciales 2026 según mercado chileno; Fabrick confirma factibilidad, alcance y precio final.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function AreaField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const displayMax = Math.max(500, Math.ceil(value));
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-[.16em] text-[#BFB8AC]">Superficie total</span>
          <span className="block text-[9px] text-[#A08B7A]">si ya conoces los m² exactos del trabajo</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange(Math.max(1, value - 5))} className="grid h-10 w-10 place-items-center rounded-full bg-[#F4E9DE] text-[#F5871F] transition hover:bg-[#FFB000] hover:text-[#08090A]" aria-label="Disminuir superficie"><Minus className="h-4 w-4" /></button>
          <div className="flex items-baseline gap-1 rounded-[1rem] bg-[#F4E9DE] px-3 py-2 focus-within:ring-2 focus-within:ring-[#FFB000]/50">
            <input type="number" inputMode="decimal" min="0" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="w-20 bg-transparent text-right text-xl font-black tracking-[-.03em] outline-none" aria-label="Superficie en metros cuadrados" />
            <b className="text-[10px] font-black text-[#F5871F]">m²</b>
          </div>
          <button type="button" onClick={() => onChange(value + 5)} className="grid h-10 w-10 place-items-center rounded-full bg-[#08090A] text-[#FFB000] transition hover:bg-[#FFB000] hover:text-[#08090A]" aria-label="Aumentar superficie"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <input type="range" min="0" max={displayMax} step={1} value={Math.min(displayMax, value)} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#F2DFBB] accent-[#F5871F]" aria-label="Superficie en metros cuadrados" />
    </label>
  );
}

function SliderField({ field, value, onChange }: { field: FieldConfig; value: number; onChange: (value: number) => void }) {
  const hasDecimal = field.step < 0.1;
  const displayMax = Math.max(field.max, Math.ceil(value));
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-[.16em] text-[#BFB8AC]">{field.label}</span>
          <span className="block text-[9px] text-[#A08B7A]">{field.hint}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange(Math.max(hasDecimal ? 0.01 : 0.01, value - field.step))} className="grid h-10 w-10 place-items-center rounded-full bg-[#F4E9DE] text-[#F5871F] transition hover:bg-[#FFB000] hover:text-[#08090A]" aria-label={`Disminuir ${field.label}`}><Minus className="h-4 w-4" /></button>
          <div className="flex items-baseline gap-1 rounded-[1rem] bg-[#F4E9DE] px-3 py-2 focus-within:ring-2 focus-within:ring-[#FFB000]/50"><input type="number" inputMode="decimal" min="0" max={field.max} step={field.step} value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="w-16 bg-transparent text-right text-xl font-black tracking-[-.03em] outline-none" /><b className="text-[10px] font-black text-[#F5871F]">m</b></div>
          <button type="button" onClick={() => onChange(value + field.step)} className="grid h-10 w-10 place-items-center rounded-full bg-[#08090A] text-[#FFB000] transition hover:bg-[#FFB000] hover:text-[#08090A]" aria-label={`Aumentar ${field.label}`}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <input type="range" min="0" max={displayMax} step={field.step} value={Math.min(displayMax, value)} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#F2DFBB] accent-[#F5871F]" aria-label={`${field.label} en metros`} />
    </label>
  );
}

function QuantityField({ value, suffix, onChange }: { value: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <div>
      <span className="text-[10px] font-black uppercase tracking-[.16em] text-[#BFB8AC]">Cantidad</span>
      <div className="mt-2 grid grid-cols-[52px_1fr_52px] items-center gap-2 rounded-[1.25rem] bg-[#F4E9DE] p-2">
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm" aria-label="Reducir cantidad"><Minus className="h-4 w-4" /></button>
        <div className="text-center">
          <input type="number" min="1" inputMode="numeric" value={value || ''} onChange={(event) => onChange(Math.max(1, Math.round(Number(event.target.value) || 1)))} className="w-full bg-transparent text-center text-3xl font-black outline-none" aria-label="Cantidad" />
          <span className="text-[10px] font-bold uppercase tracking-[.13em] text-[#F5871F]">{suffix}</span>
        </div>
        <button type="button" onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-full bg-[#08090A] text-[#FFB000] shadow-sm" aria-label="Aumentar cantidad"><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={`grid gap-1 py-3 sm:grid-cols-[110px_1fr] sm:items-start ${last ? '' : 'border-b border-white/8'}`}><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/38">{label}</span><strong className="text-xs leading-5 text-[#FFF9EE] sm:text-right">{value}</strong></div>;
}