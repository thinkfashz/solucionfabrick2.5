'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuoteCart, type QuoteItem } from '@/context/QuoteCartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  BUDGET_SERVICES,
  SERVICE_CATEGORIES,
  calculateServiceMeasurement,
  getBudgetService,
  resolveServiceId,
  type BudgetService,
  type MeasurementValues,
  type ServiceCategory,
} from './serviceCatalog';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const money = (value: number) => CLP.format(Math.round(value || 0));
const number = (value: number) => NUMBER.format(value || 0);
const average = (service: BudgetService) => Math.round((service.marketMin + service.marketMax) / 2);
const DEFAULT_SERVICE = BUDGET_SERVICES[0];

interface ServiceBudgetShopV2Props {
  initialServiceId?: string;
}

function metaNumber(item: QuoteItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
function metaString(item: QuoteItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === 'string' ? value : '';
}
function lineRange(item: QuoteItem) {
  const savedLow = metaNumber(item, 'marketLow');
  const savedHigh = metaNumber(item, 'marketHigh');
  const unitLow = metaNumber(item, 'marketMinUnit');
  const unitHigh = metaNumber(item, 'marketMaxUnit');
  const fallback = typeof item.refPrice === 'number' ? item.refPrice * item.quantity : 0;
  return {
    low: savedLow || (unitLow ? unitLow * item.quantity : fallback),
    high: savedHigh || (unitHigh ? unitHigh * item.quantity : fallback),
  };
}
function taxBreakdown(total: number) {
  const net = Math.round((total || 0) / 1.19);
  return { net, iva: Math.max(0, Math.round((total || 0) - net)) };
}
function rangeText(low: number, high: number) { return low === high ? money(low) : `${money(low)} – ${money(high)}`; }

export default function ServiceBudgetShopV2({ initialServiceId }: ServiceBudgetShopV2Props) {
  const initialService = getBudgetService(initialServiceId);
  const calculatorRef = useRef<HTMLElement>(null);
  const receiptRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState(initialService.id);
  const [category, setCategory] = useState<ServiceCategory | 'Todas'>(initialService.category);
  const [values, setValues] = useState<MeasurementValues>(initialService.defaultValues);
  const [customer, setCustomer] = useState({ name: '', place: '', note: '' });
  const [addedId, setAddedId] = useState('');
  const [reference] = useState(() => `FBK-${Date.now().toString(36).slice(-6).toUpperCase()}`);
  const { items, addItem, removeItem, updateQuantity, clear } = useQuoteCart();

  const service = getBudgetService(selectedId);
  const serviceItems = items.filter((item) => item.kind === 'service');
  const visibleServices = category === 'Todas' ? BUDGET_SERVICES : BUDGET_SERVICES.filter((item) => item.category === category);
  const categoryCounts = useMemo(() => SERVICE_CATEGORIES.reduce<Record<ServiceCategory, number>>((result, item) => {
    result[item] = BUDGET_SERVICES.filter((serviceItem) => serviceItem.category === item).length;
    return result;
  }, {} as Record<ServiceCategory, number>), []);
  const measurement = useMemo(() => calculateServiceMeasurement(service, values), [service, values]);
  const selectedLow = measurement.quantity * service.marketMin * measurement.priceFactor;
  const selectedHigh = measurement.quantity * service.marketMax * measurement.priceFactor;
  const selectedAverage = Math.round((selectedLow + selectedHigh) / 2);

  const totals = useMemo(() => serviceItems.reduce((result, item) => {
    const range = lineRange(item);
    return { low: result.low + range.low, high: result.high + range.high };
  }, { low: 0, high: 0 }), [serviceItems]);
  const taxLow = useMemo(() => taxBreakdown(totals.low), [totals.low]);
  const taxHigh = useMemo(() => taxBreakdown(totals.high), [totals.high]);

  useEffect(() => {
    if (!initialServiceId) return;
    const next = getBudgetService(initialServiceId);
    setSelectedId(next.id);
    setCategory(next.category);
    setValues(next.defaultValues);
    setAddedId('');
    const timer = window.setTimeout(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => window.clearTimeout(timer);
  }, [initialServiceId]);

  const whatsappMessage = useMemo(() => {
    const detail = serviceItems.map((item, index) => {
      const range = lineRange(item);
      const formula = metaString(item, 'formula');
      return `${index + 1}. ${item.title}\n   ${number(item.quantity)} ${item.unit || 'unidad'} · ${rangeText(range.low, range.high)}${formula ? `\n   ${formula}` : ''}`;
    });
    return [
      'Hola Soluciones Fabrick, quiero revisar este presupuesto preliminar.',
      `Referencia: ${reference}`,
      '',
      'PARTIDAS',
      ...(detail.length ? detail : ['Sin servicios añadidos.']),
      '',
      `RANGO TOTAL (IVA INCLUIDO): ${rangeText(totals.low, totals.high)}`,
      `NETO CONTENIDO: ${rangeText(taxLow.net, taxHigh.net)}`,
      `IVA 19% CONTENIDO: ${rangeText(taxLow.iva, taxHigh.iva)}`,
      customer.name ? `Nombre: ${customer.name}` : '',
      customer.place ? `Comuna / ubicación: ${customer.place}` : '',
      customer.note ? `Detalle: ${customer.note}` : '',
      '',
      'Entiendo que este documento es referencial y que el precio final se confirma después de revisar alcance, medidas, acceso, materiales y condiciones reales.',
    ].filter(Boolean).join('\n');
  }, [customer, reference, serviceItems, taxHigh, taxLow, totals]);

  function chooseCategory(nextCategory: ServiceCategory | 'Todas') {
    setCategory(nextCategory);
    if (nextCategory === 'Todas' || service.category === nextCategory) return;
    const first = BUDGET_SERVICES.find((item) => item.category === nextCategory);
    if (!first) return;
    setSelectedId(first.id);
    setValues(first.defaultValues);
    setAddedId('');
  }

  function chooseService(next: BudgetService, updateUrl = true) {
    setSelectedId(next.id);
    setCategory(next.category);
    setValues(next.defaultValues);
    setAddedId('');
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('servicio', next.id);
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      window.requestAnimationFrame(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  function updateValue(key: keyof MeasurementValues, value: number) {
    setValues((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
    setAddedId('');
  }

  function addCurrentService() {
    const adjustedMin = service.marketMin * measurement.priceFactor;
    const adjustedMax = service.marketMax * measurement.priceFactor;
    addItem({
      id: `service_${service.id}`,
      kind: 'service',
      title: service.title,
      description: service.description,
      quantity: measurement.quantity,
      unit: service.unit,
      refPrice: average(service) * measurement.priceFactor,
      notes: 'Cálculo dimensional generado en presupuesto',
      meta: {
        serviceId: service.id,
        category: service.category,
        measurement: service.measurement,
        marketMinUnit: adjustedMin,
        marketMaxUnit: adjustedMax,
        marketLow: selectedLow,
        marketHigh: selectedHigh,
        length: values.length,
        width: values.width,
        height: values.height,
        quantityInput: values.quantity,
        formula: `${measurement.formula}: ${measurement.detail}`,
        secondary: measurement.secondary || '',
        priceFactor: measurement.priceFactor,
        taxIncluded: true,
      },
    });
    setAddedId(service.id);
  }

  function viewProject() {
    window.requestAnimationFrame(() => receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function editItem(item: QuoteItem) {
    const next = getBudgetService(metaString(item, 'serviceId') || resolveServiceId(item.title));
    chooseService(next);
    setValues({
      length: metaNumber(item, 'length') || next.defaultValues.length,
      width: metaNumber(item, 'width') || next.defaultValues.width,
      height: metaNumber(item, 'height') || next.defaultValues.height,
      quantity: metaNumber(item, 'quantityInput') || (next.measurement === 'count' ? item.quantity : next.defaultValues.quantity),
    });
  }

  const activeStep = serviceItems.length ? 2 : 1;

  return (
    <div className="bg-[#FFF9EE] text-[#08090A]">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .sf-budget-receipt, .sf-budget-receipt * { visibility: visible !important; }
          .sf-budget-receipt { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; box-shadow: none !important; border: 0 !important; }
          .sf-budget-no-print { display: none !important; }
        }
      `}</style>

      <section className="bg-[#08090A] px-4 pb-12 pt-24 text-[#FFF9EE] sm:px-6 lg:px-8 lg:pb-16 lg:pt-28">
        <div className="mx-auto max-w-[1260px]">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#FFB000]">Presupuesto por especialidad</p>
          <div className="mt-4 grid gap-7 lg:grid-cols-[1fr_.72fr] lg:items-end">
            <div>
              <h1 className="max-w-[11ch] text-4xl font-black leading-[.92] tracking-[-.065em] sm:text-6xl lg:text-7xl">Arma el proyecto partida por partida.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">Elige un trabajo, ingresa medidas reales y añade cada cálculo a un solo presupuesto. El rango sirve para ordenar la decisión antes de confirmar el alcance final.</p>
            </div>
            <div className="border-t border-[#FFB000]/30 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Rango actual</p>
              <p className="mt-2 text-3xl font-black tracking-[-.045em]">{serviceItems.length ? rangeText(totals.low, totals.high) : 'Sin partidas todavía'}</p>
              <p className="mt-2 text-xs leading-5 text-white/38">El rango mostrado al cliente incluye IVA como referencia. No se suma un segundo IVA al final.</p>
            </div>
          </div>
          <div className="mt-9 grid grid-cols-4 gap-px bg-white/10 text-[9px] font-black uppercase tracking-[.1em] text-white/45">
            {['1 · Trabajo', '2 · Medidas', '3 · Proyecto', '4 · Confirmar'].map((step, index) => <div key={step} className={`px-2 py-3 text-center transition ${index === activeStep ? 'bg-[#F5871F] text-[#08090A]' : index < activeStep ? 'bg-[#17191A] text-[#FFB000]' : 'bg-[#0E0F10]'}`}>{step}</div>)}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-[1260px]">
          <div className="grid gap-5 border-b border-black/10 pb-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Paso 1</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">¿Qué trabajo quieres calcular?</h2></div>
            <p className="max-w-2xl text-sm leading-6 text-black/45">Primero elige una familia de trabajos. Verás solo las especialidades relacionadas y podrás llegar a las medidas mucho más rápido.</p>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Categorías de trabajos">
            {SERVICE_CATEGORIES.map((item) => <button key={item} type="button" onClick={() => chooseCategory(item)} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${category === item ? 'bg-[#08090A] text-[#FFF9EE]' : 'border border-black/12 bg-white hover:border-[#F5871F]/45'}`}>{item} <span className={category === item ? 'text-white/45' : 'text-black/30'}>{categoryCounts[item]}</span></button>)}
            <button type="button" onClick={() => chooseCategory('Todas')} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${category === 'Todas' ? 'bg-[#08090A] text-[#FFF9EE]' : 'border border-black/12 bg-white hover:border-[#F5871F]/45'}`}>Todas <span className={category === 'Todas' ? 'text-white/45' : 'text-black/30'}>{BUDGET_SERVICES.length}</span></button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4 text-[10px] text-black/38">
            <span>{category === 'Todas' ? 'Todas las especialidades' : category}</span>
            <span>{visibleServices.length} {visibleServices.length === 1 ? 'opción' : 'opciones'}</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden bg-black/10 sm:grid-cols-3 lg:grid-cols-4">
            {visibleServices.map((item) => {
              const active = item.id === selectedId;
              const inCart = serviceItems.some((line) => metaString(line, 'serviceId') === item.id || line.id === `service_${item.id}`);
              return <button key={item.id} type="button" onClick={() => chooseService(item)} className={`min-h-[126px] p-4 text-left transition sm:min-h-[145px] ${active ? 'bg-[#08090A] text-[#FFF9EE]' : 'bg-white hover:bg-[#F2DFBB]/45'}`}>
                <div className="flex items-start justify-between gap-2"><span className={`text-[8px] font-black uppercase tracking-[.1em] sm:text-[9px] sm:tracking-[.12em] ${active ? 'text-[#FFB000]' : 'text-[#B96F00]'}`}>{item.category}</span>{inCart ? <span className="text-[8px] font-black text-emerald-600 sm:text-[9px]">Añadido</span> : null}</div>
                <h3 className="mt-3 text-sm font-black leading-[1.15] sm:text-base">{item.short}</h3>
                <p className={`mt-3 text-[9px] leading-4 sm:text-[10px] ${active ? 'text-white/45' : 'text-black/40'}`}>{money(item.marketMin)}–{money(item.marketMax)} / {item.unit}</p>
              </button>;
            })}
          </div>
        </div>
      </section>

      <section ref={calculatorRef} className="scroll-mt-24 bg-[#F2DFBB]/45 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-[1260px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start">
            <div>
              <div className="border-b border-black/10 pb-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Paso 2 · Medidas</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">{service.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-black/46">{service.description}</p></div>
              <MeasurementFields service={service} values={values} onChange={updateValue} />

              <div className="mt-7 grid gap-6 border-t border-black/10 pt-6 xl:grid-cols-[1fr_.85fr]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Resultado dimensional</p>
                  <p className="mt-2 text-lg font-black">{measurement.formula}</p>
                  <p className="mt-1 text-sm leading-6 text-black/45">{measurement.detail}</p>
                  {measurement.secondary ? <p className="mt-2 text-xs leading-5 text-black/40">{measurement.secondary}</p> : null}
                  <div className="mt-5 grid grid-cols-3 gap-px bg-black/10">
                    <Metric label="Cantidad" value={`${number(measurement.quantity)} ${service.unit}`} />
                    <Metric label="Desde" value={money(selectedLow)} />
                    <Metric label="Hasta" value={money(selectedHigh)} />
                  </div>
                  <p className="mt-3 text-[10px] leading-5 text-black/38">Promedio orientativo: {money(selectedAverage)} · IVA incluido dentro del rango referencial.</p>
                </div>
                <div className="border-t border-black/10 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Qué considera</p>
                  <ul className="mt-3 grid gap-2">{service.includes.map((item) => <li key={item} className="text-xs leading-5 text-black/52">— {item}</li>)}</ul>
                  <p className="mt-5 border-t border-black/10 pt-4 text-xs leading-5 text-black/45"><b className="text-black/70">Antes de confirmar:</b> {service.disclaimer}</p>
                </div>
              </div>

              <button type="button" onClick={addCurrentService} className="mt-7 min-h-13 w-full rounded-full bg-[#F5871F] px-6 text-sm font-black text-[#08090A] transition hover:bg-[#08090A] hover:text-[#FFF9EE]">{addedId === service.id ? 'Cálculo actualizado en el proyecto' : 'Añadir esta partida al proyecto'}</button>

              {serviceItems.length ? <div className="sf-budget-no-print mt-3 border border-black/10 bg-white p-4 shadow-[0_10px_32px_rgba(55,37,18,.08)] lg:hidden">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96F00]">Proyecto en curso</p>
                    <p className="mt-1 text-sm font-black">{serviceItems.length} {serviceItems.length === 1 ? 'partida añadida' : 'partidas añadidas'}</p>
                  </div>
                  <span className="rounded-full bg-[#F2DFBB]/70 px-2.5 py-1 text-[9px] font-black text-black/55">{reference}</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-4 border-t border-black/10 pt-4">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-[.12em] text-black/38">Rango total</span>
                    <b className="mt-1 block text-lg tracking-[-.035em]">{rangeText(totals.low, totals.high)}</b>
                  </div>
                  <button type="button" onClick={viewProject} className="shrink-0 rounded-full bg-[#08090A] px-4 py-2.5 text-[10px] font-black text-[#FFF9EE]">Ver proyecto →</button>
                </div>
              </div> : null}
            </div>

            <aside ref={receiptRef} className="sf-budget-receipt scroll-mt-24 bg-white p-5 shadow-[0_18px_55px_rgba(55,37,18,.12)] lg:sticky lg:top-24 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#B96F00]">Presupuesto preliminar</p><h2 className="mt-1 text-2xl font-black">Resumen del proyecto</h2></div><span className="text-[9px] font-black text-black/35">{reference}</span></div>

              {serviceItems.length ? <div className="divide-y divide-black/10">{serviceItems.map((item) => {
                const range = lineRange(item);
                return <article key={item.id} className="py-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black leading-5">{item.title}</h3><p className="mt-1 text-[10px] text-black/40">{number(item.quantity)} {item.unit}</p></div><button type="button" onClick={() => removeItem(item.id)} className="sf-budget-no-print text-[10px] font-black text-red-700">Quitar</button></div><div className="mt-3 flex items-end justify-between gap-3"><b className="text-sm">{rangeText(range.low, range.high)}</b><button type="button" onClick={() => editItem(item)} className="sf-budget-no-print text-[10px] font-black text-[#B96F00]">Editar</button></div>{(item.unit === 'unidad' || item.unit === 'punto') ? <div className="sf-budget-no-print mt-3 flex w-fit items-center gap-3 rounded-full border border-black/10 px-2 py-1"><button type="button" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="h-7 w-7">−</button><b className="text-xs">{number(item.quantity)}</b><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-7 w-7">+</button></div> : null}</article>;
              })}</div> : <div className="py-8 text-center"><p className="font-black">Aún no agregas partidas.</p><p className="mt-2 text-xs leading-5 text-black/40">Selecciona un trabajo, ingresa medidas y añádelo al proyecto.</p></div>}

              <div className="border-t border-black/10 pt-4">
                <ReceiptRow label="Neto contenido" value={serviceItems.length ? rangeText(taxLow.net, taxHigh.net) : money(0)} muted />
                <ReceiptRow label="IVA 19% contenido" value={serviceItems.length ? rangeText(taxLow.iva, taxHigh.iva) : money(0)} muted />
                <ReceiptRow label="Total referencial" value={serviceItems.length ? rangeText(totals.low, totals.high) : money(0)} strong />
                <p className="mt-3 text-[9px] leading-4 text-black/38">El total mostrado ya considera IVA como referencia. Este resumen no es una boleta tributaria ni reemplaza la cotización final.</p>
              </div>

              <div className="sf-budget-no-print mt-5 border-t border-black/10 pt-5">
                <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96F00]">Datos para revisar</p>
                <div className="mt-3 grid gap-3"><SimpleField label="Nombre" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} placeholder="Nombre y apellido"/><SimpleField label="Comuna / ciudad" value={customer.place} onChange={(value) => setCustomer((current) => ({ ...current, place: value }))} placeholder="Ej. Linares"/><label className="grid gap-1.5"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/45">Detalle</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} rows={3} placeholder="Estado actual, acceso, fecha ideal, materiales…" className="resize-none border-b border-black/15 bg-transparent py-2 text-xs outline-none"/></label></div>
                <a href={serviceItems.length ? buildWhatsAppLink(whatsappMessage) : undefined} target={serviceItems.length ? '_blank' : undefined} rel={serviceItems.length ? 'noopener noreferrer' : undefined} aria-disabled={!serviceItems.length} className={`mt-4 flex min-h-12 items-center justify-center rounded-full text-xs font-black ${serviceItems.length ? 'bg-[#08090A] text-[#FFF9EE]' : 'cursor-not-allowed bg-black/5 text-black/25'}`}>Enviar resumen al equipo</a>
                <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={!serviceItems.length} onClick={() => window.print()} className="min-h-11 rounded-full border border-black/12 text-[10px] font-black disabled:opacity-30">Imprimir / guardar PDF</button><button type="button" disabled={!serviceItems.length} onClick={clear} className="min-h-11 rounded-full border border-black/12 text-[10px] font-black text-red-700 disabled:opacity-30">Vaciar proyecto</button></div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-[#08090A] px-4 py-12 text-[#FFF9EE] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1260px] gap-6 lg:grid-cols-[.75fr_1.25fr] lg:items-start"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#FFB000]">Qué pasa después</p><h2 className="mt-2 max-w-[11ch] text-3xl font-black tracking-[-.05em] sm:text-4xl">El presupuesto ordena la conversación; no reemplaza la revisión.</h2></div><div className="grid gap-px bg-white/10 sm:grid-cols-3">{[['01','Revisamos medidas'],['02','Confirmamos alcance'],['03','Emitimos propuesta final']].map(([n,t])=><div key={n} className="bg-[#08090A] p-5"><span className="text-xs font-black text-white/20">{n}</span><p className="mt-2 text-sm font-black">{t}</p></div>)}</div></div>
      </section>
    </div>
  );
}

function MeasurementFields({ service, values, onChange }: { service: BudgetService; values: MeasurementValues; onChange: (key: keyof MeasurementValues, value: number) => void }) {
  if (service.measurement === 'count') return <div className="mt-6 max-w-md"><QuantityField value={values.quantity} onChange={(value) => onChange('quantity', value)} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} /></div>;
  if (service.measurement === 'linear') return <div className="mt-6 grid gap-4 sm:grid-cols-2"><NumberField label="Largo total" value={values.length} onChange={(value) => onChange('length', value)} suffix="m" />{(service.id === 'cierre' || service.id === 'carpinteria') ? <NumberField label={service.id === 'cierre' ? 'Altura del cierre' : 'Altura referencial'} value={values.height} onChange={(value) => onChange('height', value)} suffix="m" /> : null}</div>;
  const fields: Array<{ key: keyof MeasurementValues; label: string; suffix: string }> = [];
  if (service.measurement === 'wall') fields.push({ key: 'length', label: 'Largo del muro', suffix: 'm' }, { key: 'height', label: 'Alto del muro', suffix: 'm' });
  if (service.measurement === 'room-walls') fields.push({ key: 'length', label: 'Largo del recinto', suffix: 'm' }, { key: 'width', label: 'Ancho del recinto', suffix: 'm' }, { key: 'height', label: 'Alto de los muros', suffix: 'm' });
  if (service.measurement === 'floor') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' });
  if (service.measurement === 'slab') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' }, { key: 'height', label: 'Espesor', suffix: 'm' });
  if (service.measurement === 'volume') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' }, { key: 'height', label: 'Profundidad / alto', suffix: 'm' });
  return <div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map((field) => <NumberField key={field.key} label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} suffix={field.suffix} />)}</div>;
}
function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.12em] text-black/45">{label}</span><div className="flex items-end gap-3 border-b border-black/18 py-2 focus-within:border-[#F5871F]"><input type="number" min="0" step="0.01" inputMode="decimal" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-.05em] outline-none"/><b className="mb-1 text-xs text-[#B96F00]">{suffix}</b></div></label>;
}
function QuantityField({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix: string }) {
  return <div><span className="text-[10px] font-black uppercase tracking-[.12em] text-black/45">Cantidad</span><div className="mt-2 grid grid-cols-[48px_1fr_48px] items-center border border-black/12 bg-white p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="h-11 text-xl">−</button><div className="text-center"><input type="number" min="1" inputMode="numeric" value={value || ''} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} className="w-full bg-transparent text-center text-3xl font-black outline-none"/><span className="text-[9px] font-black uppercase tracking-[.1em] text-[#B96F00]">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} className="h-11 text-xl">+</button></div></div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-white p-3"><span className="text-[8px] font-black uppercase tracking-[.1em] text-black/38">{label}</span><b className="mt-1 block text-sm">{value}</b></div>; }
function ReceiptRow({ label, value, muted = false, strong = false }: { label: string; value: string; muted?: boolean; strong?: boolean }) { return <div className={`flex items-center justify-between gap-4 py-2 ${strong ? 'mt-2 border-t border-black/10 pt-4 text-lg' : 'text-xs'} ${muted ? 'text-black/42' : ''}`}><span>{label}</span><b>{value}</b></div>; }
function SimpleField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="grid gap-1.5"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/45">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="border-b border-black/15 bg-transparent py-2 text-xs outline-none"/></label>; }