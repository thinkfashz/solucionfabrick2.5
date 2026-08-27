'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, MessageCircle, ReceiptText, Ruler, ShoppingBag } from 'lucide-react';
import { useQuoteCart, type QuoteItem } from '@/context/QuoteCartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  BUDGET_SERVICES,
  SERVICE_CATEGORIES,
  calculateServiceMeasurement,
  getBudgetService,
  getServicePriceRange,
  priceModeDescription,
  resolveServiceId,
  type BudgetService,
  type MeasurementValues,
  type PriceMode,
  type ServiceCategory,
} from './serviceCatalog';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const money = (value: number) => CLP.format(Math.round(value || 0));
const number = (value: number) => NUMBER.format(value || 0);
const DEFAULT_SERVICE = BUDGET_SERVICES[0];

interface ServiceBudgetShopV2Props { initialServiceId?: string }
function metaNumber(item: QuoteItem, key: string) { const value = item.meta?.[key]; return typeof value === 'number' && Number.isFinite(value) ? value : 0; }
function metaString(item: QuoteItem, key: string) { const value = item.meta?.[key]; return typeof value === 'string' ? value : ''; }
function lineService(item: QuoteItem) { return getBudgetService(metaString(item, 'serviceId') || resolveServiceId(item.title)); }
function lineMode(item: QuoteItem): PriceMode { return metaString(item, 'priceMode') === 'labor' ? 'labor' : 'complete'; }
function lineRange(item: QuoteItem) {
  const service = lineService(item);
  const range = getServicePriceRange(service, lineMode(item));
  const factor = metaNumber(item, 'priceFactor') || 1;
  return { low: item.quantity * range.min * factor, high: item.quantity * range.max * factor };
}
function alternateRange(item: QuoteItem) {
  const service = lineService(item);
  const mode: PriceMode = lineMode(item) === 'labor' ? 'complete' : 'labor';
  const range = getServicePriceRange(service, mode);
  const factor = metaNumber(item, 'priceFactor') || 1;
  return { mode, low: item.quantity * range.min * factor, high: item.quantity * range.max * factor };
}
function taxBreakdown(total: number) { const net = Math.round((total || 0) / 1.19); return { net, iva: Math.max(0, Math.round((total || 0) - net)) }; }
function rangeText(low: number, high: number) { return low === high ? money(low) : `${money(low)} – ${money(high)}`; }

export default function ServiceBudgetShopV2({ initialServiceId }: ServiceBudgetShopV2Props) {
  const initialService = getBudgetService(initialServiceId);
  const calculatorRef = useRef<HTMLElement>(null);
  const receiptRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState(initialService.id);
  const [category, setCategory] = useState<ServiceCategory | 'Todas'>(initialService.category);
  const [values, setValues] = useState<MeasurementValues>(initialService.defaultValues);
  const [priceMode, setPriceMode] = useState<PriceMode>('labor');
  const [customer, setCustomer] = useState({ name: '', place: '', note: '' });
  const [addedId, setAddedId] = useState('');
  const [reference] = useState(() => `FBK-${Date.now().toString(36).slice(-6).toUpperCase()}`);
  const { items, addItem, removeItem, updateQuantity, clear } = useQuoteCart();

  const service = getBudgetService(selectedId);
  const serviceItems = items.filter((item) => item.kind === 'service');
  const visibleServices = category === 'Todas' ? BUDGET_SERVICES : BUDGET_SERVICES.filter((item) => item.category === category);
  const categoryCounts = useMemo(() => SERVICE_CATEGORIES.reduce<Record<ServiceCategory, number>>((result, item) => { result[item] = BUDGET_SERVICES.filter((s) => s.category === item).length; return result; }, {} as Record<ServiceCategory, number>), []);
  const measurement = useMemo(() => calculateServiceMeasurement(service, values), [service, values]);
  const laborUnit = getServicePriceRange(service, 'labor');
  const completeUnit = getServicePriceRange(service, 'complete');
  const laborLow = measurement.quantity * laborUnit.min * measurement.priceFactor;
  const laborHigh = measurement.quantity * laborUnit.max * measurement.priceFactor;
  const completeLow = measurement.quantity * completeUnit.min * measurement.priceFactor;
  const completeHigh = measurement.quantity * completeUnit.max * measurement.priceFactor;
  const selectedLow = priceMode === 'labor' ? laborLow : completeLow;
  const selectedHigh = priceMode === 'labor' ? laborHigh : completeHigh;

  const totals = useMemo(() => serviceItems.reduce((result, item) => { const range = lineRange(item); return { low: result.low + range.low, high: result.high + range.high }; }, { low: 0, high: 0 }), [serviceItems]);
  const taxLow = useMemo(() => taxBreakdown(totals.low), [totals.low]);
  const taxHigh = useMemo(() => taxBreakdown(totals.high), [totals.high]);

  useEffect(() => {
    if (!initialServiceId) return;
    const next = getBudgetService(initialServiceId);
    setSelectedId(next.id); setCategory(next.category); setValues(next.defaultValues); setAddedId('');
    const timer = window.setTimeout(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => window.clearTimeout(timer);
  }, [initialServiceId]);

  const whatsappMessage = useMemo(() => {
    const detail = serviceItems.map((item, index) => {
      const range = lineRange(item); const mode = lineMode(item); const formula = metaString(item, 'formula');
      return `${index + 1}. ${item.title}\n   ${mode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'} · ${number(item.quantity)} ${item.unit || 'unidad'}\n   ${rangeText(range.low, range.high)}${formula ? `\n   ${formula}` : ''}`;
    });
    return ['Hola Soluciones Fabrick, quiero revisar esta boleta referencial.', `Referencia: ${reference}`, '', 'PARTIDAS', ...(detail.length ? detail : ['Sin servicios añadidos.']), '', `TOTAL REFERENCIAL: ${rangeText(totals.low, totals.high)}`, customer.name ? `Nombre: ${customer.name}` : '', customer.place ? `Comuna / ubicación: ${customer.place}` : '', customer.note ? `Detalle: ${customer.note}` : '', '', 'Sé que es una referencia y quiero confirmar el valor real del proyecto.'].filter(Boolean).join('\n');
  }, [customer, reference, serviceItems, totals]);

  function chooseCategory(nextCategory: ServiceCategory | 'Todas') {
    setCategory(nextCategory);
    if (nextCategory === 'Todas' || service.category === nextCategory) return;
    const first = BUDGET_SERVICES.find((item) => item.category === nextCategory); if (!first) return;
    setSelectedId(first.id); setValues(first.defaultValues); setAddedId('');
  }
  function chooseService(next: BudgetService, updateUrl = true) {
    setSelectedId(next.id); setCategory(next.category); setValues(next.defaultValues); setAddedId('');
    if (updateUrl) { const url = new URL(window.location.href); url.searchParams.set('servicio', next.id); window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`); window.requestAnimationFrame(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  }
  function updateValue(key: keyof MeasurementValues, value: number) { setValues((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) })); setAddedId(''); }
  function addCurrentService() {
    const range = getServicePriceRange(service, priceMode);
    const adjustedMin = range.min * measurement.priceFactor;
    const adjustedMax = range.max * measurement.priceFactor;
    addItem({
      id: `service_${service.id}`, kind: 'service', title: service.title, description: service.description, quantity: measurement.quantity, unit: service.unit,
      refPrice: Math.round((adjustedMin + adjustedMax) / 2), notes: priceMode === 'labor' ? 'Referencia de mano de obra' : 'Referencia de trabajo vendido',
      meta: { serviceId: service.id, category: service.category, measurement: service.measurement, priceMode, marketMinUnit: adjustedMin, marketMaxUnit: adjustedMax, marketLow: selectedLow, marketHigh: selectedHigh, length: values.length, width: values.width, height: values.height, quantityInput: values.quantity, formula: `${measurement.formula}: ${measurement.detail}`, secondary: measurement.secondary || '', priceFactor: measurement.priceFactor, taxIncluded: true },
    });
    setAddedId(service.id);
  }
  function viewProject() { window.requestAnimationFrame(() => receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
  function editItem(item: QuoteItem) {
    const next = lineService(item); chooseService(next); setPriceMode(lineMode(item));
    setValues({ length: metaNumber(item, 'length') || next.defaultValues.length, width: metaNumber(item, 'width') || next.defaultValues.width, height: metaNumber(item, 'height') || next.defaultValues.height, quantity: metaNumber(item, 'quantityInput') || (next.measurement === 'count' ? item.quantity : next.defaultValues.quantity) });
  }

  return (
    <div className="bg-[#FFF9EE] text-[#08090A]">
      <style>{`@media print{body *{visibility:hidden!important}.sf-budget-receipt,.sf-budget-receipt *{visibility:visible!important}.sf-budget-receipt{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;max-width:none!important;box-shadow:none!important}.sf-budget-no-print{display:none!important}}`}</style>

      <section className="bg-[#08090A] px-4 pb-12 pt-24 text-[#FFF9EE] sm:px-6 lg:px-8 lg:pb-16 lg:pt-28">
        <div className="mx-auto max-w-[1260px]">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#FFB000]">Presupuesto por partidas</p>
          <div className="mt-4 grid gap-7 lg:grid-cols-[1fr_.72fr] lg:items-end">
            <div><h1 className="max-w-[11ch] text-4xl font-black leading-[.92] tracking-[-.065em] sm:text-6xl lg:text-7xl">Arma una referencia que se entienda.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-white/50 sm:text-base">Agrega cada trabajo con sus medidas y elige si quieres ver <b className="text-white/80">solo mano de obra</b> o <b className="text-white/80">trabajo vendido</b>. La boleta mantiene esa diferencia visible.</p></div>
            <div className="border-t border-[#FFB000]/30 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Proyecto actual</p><p className="mt-2 text-3xl font-black tracking-[-.045em]">{serviceItems.length ? rangeText(totals.low, totals.high) : 'Sin partidas todavía'}</p><p className="mt-2 text-xs leading-5 text-white/38">{serviceItems.length ? `${serviceItems.length} ${serviceItems.length === 1 ? 'partida' : 'partidas'} · IVA incluido como referencia` : 'Elige un trabajo para comenzar.'}</p></div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-[1260px]">
          <div className="grid gap-5 border-b border-black/10 pb-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Elige un trabajo</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">¿Qué quieres calcular?</h2></div><p className="max-w-2xl text-sm leading-6 text-black/45">Cada tarjeta muestra dos valores por unidad para que puedas distinguir ejecución de servicio completo antes de ingresar medidas.</p></div>
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{SERVICE_CATEGORIES.map((item) => <button key={item} type="button" onClick={() => chooseCategory(item)} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black ${category === item ? 'bg-[#08090A] text-white' : 'border border-black/12 bg-white'}`}>{item} <span className="opacity-35">{categoryCounts[item]}</span></button>)}<button type="button" onClick={() => chooseCategory('Todas')} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black ${category === 'Todas' ? 'bg-[#08090A] text-white' : 'border border-black/12 bg-white'}`}>Todas <span className="opacity-35">{BUDGET_SERVICES.length}</span></button></div>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden bg-black/10 sm:grid-cols-3 lg:grid-cols-4">
            {visibleServices.map((item) => { const active = item.id === selectedId; const inCart = serviceItems.some((line) => lineService(line).id === item.id); return <button key={item.id} type="button" onClick={() => chooseService(item)} className={`min-h-[150px] p-4 text-left transition ${active ? 'bg-[#08090A] text-white' : 'bg-white hover:bg-[#F2DFBB]/45'}`}><div className="flex items-start justify-between gap-2"><span className={`text-[8px] font-black uppercase ${active ? 'text-[#FFB000]' : 'text-[#B96F00]'}`}>{item.category}</span>{inCart ? <span className="text-[8px] font-black text-emerald-600">Añadido</span> : null}</div><h3 className="mt-3 text-sm font-black leading-[1.15] sm:text-base">{item.short}</h3><div className="mt-3 space-y-1 text-[9px] leading-4"><p className={active ? 'text-white/55' : 'text-black/45'}>Mano de obra<br/><b className={active ? 'text-white/80' : 'text-black/70'}>{money(item.laborMin)}–{money(item.laborMax)} / {item.unit}</b></p><p className={active ? 'text-[#FFCC61]' : 'text-[#8D5B19]'}>Trabajo vendido<br/><b>{money(item.marketMin)}–{money(item.marketMax)} / {item.unit}</b></p></div></button>; })}
          </div>
        </div>
      </section>

      <section ref={calculatorRef} className="scroll-mt-24 bg-[#F2DFBB]/45 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-[1260px]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:items-start">
            <div>
              <div className="border-b border-black/10 pb-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Calculadora</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">{service.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-black/46">{service.description}</p></div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <ModeCard active={priceMode === 'labor'} title="Mano de obra" price={`${money(service.laborMin)} – ${money(service.laborMax)} / ${service.unit}`} text="Solo ejecución o instalación." onClick={() => setPriceMode('labor')} />
                <ModeCard active={priceMode === 'complete'} title="Trabajo vendido" price={`${money(service.marketMin)} – ${money(service.marketMax)} / ${service.unit}`} text="Ejecución + materiales/insumos base." onClick={() => setPriceMode('complete')} />
              </div>
              <p className="mt-2 text-[10px] leading-5 text-black/42">{priceModeDescription(priceMode)}</p>

              <MeasurementFields service={service} values={values} onChange={updateValue} />
              <div className="mt-7 grid gap-6 border-t border-black/10 pt-6 xl:grid-cols-[1fr_.85fr]">
                <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Resultado</p><p className="mt-2 text-lg font-black">{measurement.formula}</p><p className="mt-1 text-sm leading-6 text-black/45">{measurement.detail}</p>{measurement.secondary ? <p className="mt-2 text-xs text-black/40">{measurement.secondary}</p> : null}<div className="mt-5 grid grid-cols-3 gap-px bg-black/10"><Metric label="Cantidad" value={`${number(measurement.quantity)} ${service.unit}`} /><Metric label="Desde" value={money(selectedLow)} /><Metric label="Hasta" value={money(selectedHigh)} /></div><p className="mt-3 text-[10px] text-black/38">Modalidad: <b>{priceMode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'}</b> · IVA incluido como referencia.</p></div>
                <div className="border-t border-black/10 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Qué considera</p><ul className="mt-3 grid gap-2">{service.includes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-black/52"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#B96F00]" />{item}</li>)}</ul><p className="mt-5 border-t border-black/10 pt-4 text-xs leading-5 text-black/45">{service.disclaimer}</p></div>
              </div>
              <button type="button" onClick={addCurrentService} className="mt-7 min-h-13 w-full rounded-full bg-[#F5871F] px-6 text-sm font-black text-[#08090A] transition hover:bg-[#08090A] hover:text-white">{addedId === service.id ? 'Actualizar esta partida' : `Añadir como ${priceMode === 'labor' ? 'mano de obra' : 'trabajo vendido'}`}</button>
              {serviceItems.length ? <div className="sf-budget-no-print mt-3 border border-black/10 bg-white p-4 shadow-sm lg:hidden"><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase text-[#B96F00]">Proyecto en curso</p><p className="mt-1 text-sm font-black">{serviceItems.length} {serviceItems.length === 1 ? 'partida' : 'partidas'}</p></div><span className="text-[9px] text-black/40">{reference}</span></div><div className="mt-4 flex items-end justify-between border-t border-black/10 pt-4"><div><small className="text-black/38">Total referencial</small><b className="block text-lg">{rangeText(totals.low, totals.high)}</b></div><button type="button" onClick={viewProject} className="rounded-full bg-[#08090A] px-4 py-2.5 text-[10px] font-black text-white">Ver boleta →</button></div></div> : null}
            </div>

            <aside ref={receiptRef} className="sf-budget-receipt scroll-mt-24 overflow-hidden bg-white shadow-[0_18px_55px_rgba(55,37,18,.12)] lg:sticky lg:top-24">
              <div className="bg-[#08090A] p-5 text-white sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#FFB000]">Boleta referencial · no tributaria</p><h2 className="mt-1 text-2xl font-black">Resumen del proyecto</h2></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFB000] text-black"><ReceiptText className="h-4 w-4" /></span></div><p className="mt-3 text-[9px] text-white/35">{reference}</p></div>

              <div className="p-5 sm:p-6">
                {serviceItems.length ? <div className="divide-y divide-black/10">{serviceItems.map((item) => { const range = lineRange(item); const alt = alternateRange(item); const mode = lineMode(item); return <article key={item.id} className="py-4 first:pt-0"><div className="flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-black uppercase ${mode === 'labor' ? 'bg-black/7 text-black/55' : 'bg-[#F2DFBB] text-[#805112]'}`}>{mode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'}</span><h3 className="mt-2 text-sm font-black leading-5">{item.title}</h3><p className="mt-1 text-[10px] text-black/40">{number(item.quantity)} {item.unit}</p></div><button type="button" onClick={() => removeItem(item.id)} className="sf-budget-no-print text-[10px] font-black text-red-700">Quitar</button></div><b className="mt-3 block text-base">{rangeText(range.low, range.high)}</b><p className="mt-1 text-[9px] text-black/38">{alt.mode === 'labor' ? 'Solo mano de obra' : 'Si lo quieres como trabajo vendido'}: {rangeText(alt.low, alt.high)}</p><div className="sf-budget-no-print mt-3 flex items-center justify-between"><button type="button" onClick={() => editItem(item)} className="text-[10px] font-black text-[#B96F00]">Editar</button>{(item.unit === 'unidad' || item.unit === 'punto') ? <div className="flex items-center gap-3 rounded-full border border-black/10 px-2 py-1"><button type="button" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>−</button><b className="text-xs">{number(item.quantity)}</b><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button></div> : null}</div></article>; })}</div> : <div className="py-8 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-black/20"/><p className="mt-3 font-black">Aún no agregas partidas.</p><p className="mt-2 text-xs text-black/40">Elige un trabajo y añádelo a esta boleta.</p></div>}

                <div className="border-t border-black/10 pt-4"><ReceiptRow label="Neto contenido" value={serviceItems.length ? rangeText(taxLow.net, taxHigh.net) : money(0)} muted /><ReceiptRow label="IVA 19% contenido" value={serviceItems.length ? rangeText(taxLow.iva, taxHigh.iva) : money(0)} muted /><ReceiptRow label="Total referencial" value={serviceItems.length ? rangeText(totals.low, totals.high) : money(0)} strong /><p className="mt-3 text-[9px] leading-4 text-black/38">Cada partida indica si corresponde a mano de obra o trabajo vendido. No es boleta tributaria ni cotización final.</p></div>

                <div className="sf-budget-no-print mt-5 border-t border-black/10 pt-5"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96F00]">Enviar para cotizar</p><div className="mt-3 grid gap-3"><SimpleField label="Nombre" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} placeholder="Nombre y apellido"/><SimpleField label="Comuna / ciudad" value={customer.place} onChange={(value) => setCustomer((current) => ({ ...current, place: value }))} placeholder="Ej. Linares"/><label className="grid gap-1.5"><span className="text-[9px] font-black uppercase text-black/45">Detalle</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} rows={3} placeholder="Fotos, estado actual, fecha ideal…" className="resize-none border-b border-black/15 bg-transparent py-2 text-xs outline-none"/></label></div><a href={serviceItems.length ? buildWhatsAppLink(whatsappMessage) : undefined} target={serviceItems.length ? '_blank' : undefined} rel={serviceItems.length ? 'noopener noreferrer' : undefined} aria-disabled={!serviceItems.length} className={`mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full text-xs font-black ${serviceItems.length ? 'bg-[#08090A] text-white' : 'cursor-not-allowed bg-black/5 text-black/25'}`}><MessageCircle className="h-4 w-4"/> Enviar por WhatsApp</a><div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={!serviceItems.length} onClick={() => window.print()} className="min-h-11 rounded-full border border-black/12 text-[10px] font-black disabled:opacity-30">Guardar PDF</button><button type="button" disabled={!serviceItems.length} onClick={clear} className="min-h-11 rounded-full border border-black/12 text-[10px] font-black text-red-700 disabled:opacity-30">Vaciar</button></div></div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-[#08090A] px-4 py-12 text-white sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1260px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#FFB000]">¿Quieres un valor real para ejecutar?</p><h2 className="mt-2 max-w-[18ch] text-3xl font-black tracking-[-.05em]">Envíanos la boleta y cotizamos el alcance que elegiste.</h2></div><a href={buildWhatsAppLink('Hola Soluciones Fabrick, quiero cotizar un proyecto.')} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#F5871F] px-6 text-sm font-black text-black">Hablar con Fabrick <ChevronRight className="h-4 w-4"/></a></div></section>
    </div>
  );
}

function ModeCard({ active, title, price, text, onClick }: { active: boolean; title: string; price: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-[1.35rem] border p-4 text-left transition ${active ? 'border-[#08090A] bg-[#08090A] text-white shadow-lg' : 'border-black/10 bg-white'}`}><div className="flex items-center justify-between"><b className="text-sm">{title}</b>{active ? <span className="grid h-6 w-6 place-items-center rounded-full bg-[#FFB000] text-black"><Check className="h-3.5 w-3.5"/></span> : null}</div><b className={`mt-2 block text-base ${active ? 'text-[#FFCC61]' : 'text-[#8D5B19]'}`}>{price}</b><p className={`mt-2 text-[10px] ${active ? 'text-white/48' : 'text-black/42'}`}>{text}</p></button>;
}
function MeasurementFields({ service, values, onChange }: { service: BudgetService; values: MeasurementValues; onChange: (key: keyof MeasurementValues, value: number) => void }) {
  if (service.measurement === 'count') return <div className="mt-6 max-w-md"><QuantityField value={values.quantity} onChange={(value) => onChange('quantity', value)} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} /></div>;
  if (service.measurement === 'linear') return <div className="mt-6 grid gap-4 sm:grid-cols-2"><NumberField label="Largo total" value={values.length} onChange={(value) => onChange('length', value)} suffix="m" />{(service.id === 'cierre' || service.id === 'carpinteria') ? <NumberField label="Altura referencial" value={values.height} onChange={(value) => onChange('height', value)} suffix="m" /> : null}</div>;
  const fields: Array<{ key: keyof MeasurementValues; label: string; suffix: string }> = [];
  if (service.measurement === 'wall') fields.push({ key: 'length', label: 'Largo del muro', suffix: 'm' }, { key: 'height', label: 'Alto del muro', suffix: 'm' });
  if (service.measurement === 'room-walls') fields.push({ key: 'length', label: 'Largo del recinto', suffix: 'm' }, { key: 'width', label: 'Ancho del recinto', suffix: 'm' }, { key: 'height', label: 'Alto de muros', suffix: 'm' });
  if (service.measurement === 'floor') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' });
  if (service.measurement === 'slab') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' }, { key: 'height', label: 'Espesor', suffix: 'm' });
  if (service.measurement === 'volume') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' }, { key: 'height', label: 'Profundidad / alto', suffix: 'm' });
  return <div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map((field) => <NumberField key={field.key} label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} suffix={field.suffix} />)}</div>;
}
function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) { return <label className="grid gap-2"><span className="text-[10px] font-black uppercase text-black/45">{label}</span><div className="flex items-end gap-2 border-b border-black/15 pb-2"><input type="number" min="0" step="0.1" value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className="min-w-0 flex-1 bg-transparent text-2xl font-black outline-none"/><b className="text-xs text-[#B96F00]">{suffix}</b></div></label>; }
function QuantityField({ value, suffix, onChange }: { value: number; suffix: string; onChange: (value: number) => void }) { return <label className="grid gap-2"><span className="text-[10px] font-black uppercase text-black/45">Cantidad</span><div className="flex items-end gap-2 border-b border-black/15 pb-2"><input type="number" min="1" step="1" value={value || ''} onChange={(event) => onChange(Math.max(1, Math.round(Number(event.target.value) || 1)))} className="min-w-0 flex-1 bg-transparent text-3xl font-black outline-none"/><b className="text-xs text-[#B96F00]">{suffix}</b></div></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="bg-white p-3"><p className="text-[8px] font-black uppercase text-black/35">{label}</p><b className="mt-1 block text-xs sm:text-sm">{value}</b></div>; }
function ReceiptRow({ label, value, muted = false, strong = false }: { label: string; value: string; muted?: boolean; strong?: boolean }) { return <div className={`flex items-center justify-between gap-4 py-2 text-xs ${strong ? 'border-t border-black/10 pt-3 font-black' : ''}`}><span className={muted ? 'text-black/40' : 'text-black/60'}>{label}</span><b className={strong ? 'text-base' : ''}>{value}</b></div>; }
function SimpleField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="grid gap-1.5"><span className="text-[9px] font-black uppercase text-black/45">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="border-b border-black/15 bg-transparent py-2 text-xs outline-none"/></label>; }
