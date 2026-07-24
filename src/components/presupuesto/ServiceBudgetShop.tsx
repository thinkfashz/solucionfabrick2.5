'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Check,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  Ruler,
  ShoppingCart,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useQuoteCart, type QuoteItem } from '@/context/QuoteCartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  BUDGET_SERVICES,
  FABRICK_PALETTE,
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

export default function ServiceBudgetShop() {
  const calculatorRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(BUDGET_SERVICES[0].id);
  const [category, setCategory] = useState<ServiceCategory>(SERVICE_CATEGORIES[0]);
  const [values, setValues] = useState<MeasurementValues>(BUDGET_SERVICES[0].defaultValues);
  const [customer, setCustomer] = useState({ name: '', place: '', note: '' });
  const [addedId, setAddedId] = useState('');
  const { items, addItem, removeItem, updateQuantity, clear } = useQuoteCart();

  const service = getBudgetService(selectedId);
  const Icon = service.icon;
  const serviceItems = items.filter((item) => item.kind === 'service');
  const categoryServices = BUDGET_SERVICES.filter((item) => item.category === category);
  const measurement = useMemo(() => calculateServiceMeasurement(service, values), [service, values]);
  const selectedLow = measurement.quantity * service.marketMin * measurement.priceFactor;
  const selectedHigh = measurement.quantity * service.marketMax * measurement.priceFactor;
  const selectedAverage = Math.round((selectedLow + selectedHigh) / 2);

  const totals = useMemo(() => serviceItems.reduce((result, item) => {
    const range = lineRange(item);
    return { low: result.low + range.low, high: result.high + range.high };
  }, { low: 0, high: 0 }), [serviceItems]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = getBudgetService(params.get('servicio'));
    selectService(next, false);
    if (params.get('servicio')) {
      window.setTimeout(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const whatsappMessage = useMemo(() => {
    const details = serviceItems.map((item, index) => {
      const range = lineRange(item);
      const formula = metaString(item, 'formula');
      return `${index + 1}. ${item.title}\n   ${number(item.quantity)} ${item.unit || 'unidad'} · ${money(range.low)} a ${money(range.high)}${formula ? `\n   Cálculo: ${formula}` : ''}`;
    });
    return [
      'Hola Soluciones Fabrick, quiero revisar este carrito de servicios.',
      '',
      'SERVICIOS SELECCIONADOS',
      ...(details.length ? details : ['Sin servicios añadidos todavía.']),
      '',
      `TOTAL APROXIMADO: ${money(totals.low)} a ${money(totals.high)}`,
      `PROMEDIO ORIENTATIVO: ${money(Math.round((totals.low + totals.high) / 2))}`,
      customer.name ? `Nombre: ${customer.name}` : '',
      customer.place ? `Comuna / ubicación: ${customer.place}` : '',
      customer.note ? `Detalle: ${customer.note}` : '',
      '',
      'Entiendo que el valor final se confirma después de revisar medidas, acceso, materiales y alcance real.',
    ].filter(Boolean).join('\n');
  }, [customer, serviceItems, totals]);

  function selectService(next: BudgetService, updateUrl = true) {
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
      notes: 'Cálculo dimensional generado en la página de presupuesto',
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
      },
    });
    setAddedId(service.id);
  }

  function editCartItem(item: QuoteItem) {
    const next = getBudgetService(metaString(item, 'serviceId') || resolveServiceId(item.title));
    selectService(next);
    setValues({
      length: metaNumber(item, 'length') || next.defaultValues.length,
      width: metaNumber(item, 'width') || next.defaultValues.width,
      height: metaNumber(item, 'height') || next.defaultValues.height,
      quantity: metaNumber(item, 'quantityInput') || (next.measurement === 'count' ? item.quantity : next.defaultValues.quantity),
    });
  }

  return (
    <section className="relative isolate overflow-hidden bg-[#171820] px-4 pb-36 pt-24 text-white sm:px-6 sm:pt-28 lg:px-8 lg:pb-24">
      <div aria-hidden className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_86%_4%,rgba(204,177,150,.24),transparent_30rem),radial-gradient(circle_at_5%_70%,rgba(182,144,108,.18),transparent_34rem)]" />
      <div aria-hidden className="absolute inset-0 opacity-[.045] [background-image:linear-gradient(rgba(248,240,233,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(248,240,233,.8)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="relative mx-auto max-w-[1320px]">
        <header className="grid gap-7 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[#CCB196]/12 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#E7D4C1] ring-1 ring-[#CCB196]/22"><Sparkles className="h-3.5 w-3.5" /> Presupuesto por especialidad</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.92] tracking-[-.065em] text-[#F8F0E9] sm:text-6xl lg:text-7xl">Mide cada trabajo, conoce su rango y arma un solo proyecto.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#D2C3B5] sm:text-base">Cada servicio utiliza la fórmula que corresponde: largo por ancho, largo por alto, perímetro por altura, volumen, metros lineales o unidades. Añade los resultados y envía el conjunto por WhatsApp.</p>
          </div>
          <div className="rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-[0_24px_80px_rgba(0,0,0,.28)]">
            <div className="flex items-center justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#171820] text-[#CCB196]"><ShoppingCart className="h-5 w-5" /></span><span className="rounded-full bg-[#171820]/7 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-[#75614F]">{serviceItems.length} servicio{serviceItems.length === 1 ? '' : 's'}</span></div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-[#8D6748]">Rango actual del carrito</p>
            <p className="mt-2 text-2xl font-black tracking-[-.045em]">{serviceItems.length ? `${money(totals.low)} – ${money(totals.high)}` : 'Aún sin servicios'}</p>
            <p className="mt-2 text-xs leading-5 text-[#756B63]">El valor sigue siendo referencial hasta revisar condiciones reales y materiales.</p>
          </div>
        </header>

        <nav className="mt-10 flex gap-2 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Categorías de servicios">
          {SERVICE_CATEGORIES.map((item) => {
            const active = category === item;
            return <button key={item} type="button" onClick={() => setCategory(item)} className={active ? 'shrink-0 rounded-full bg-[#CCB196] px-5 py-3 text-xs font-black text-[#171820] shadow-[0_10px_30px_rgba(182,144,108,.22)]' : 'shrink-0 rounded-full bg-white/[.055] px-5 py-3 text-xs font-black text-[#D8CBC0] transition hover:bg-white/[.1] hover:text-white'}>{item}</button>;
          })}
        </nav>

        <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryServices.map((item) => {
            const ServiceIcon = item.icon;
            const selected = item.id === selectedId;
            const inCart = serviceItems.some((line) => metaString(line, 'serviceId') === item.id || line.id === `service_${item.id}`);
            const style = { '--service-accent': item.accent } as CSSProperties;
            return (
              <button key={item.id} type="button" onClick={() => selectService(item)} style={style} className={`group min-h-[220px] min-w-[82%] snap-center rounded-[1.75rem] p-5 text-left shadow-[0_18px_55px_rgba(0,0,0,.18)] transition duration-300 sm:min-w-[330px] lg:min-w-[300px] ${selected ? 'scale-[1.015] bg-[#F8F0E9] text-[#171820]' : 'bg-[#242630] text-white hover:-translate-y-1 hover:bg-[#2E303A]'}`}>
                <div className="flex items-start justify-between gap-3"><span className={`grid h-12 w-12 place-items-center rounded-full ${selected ? 'bg-[#171820] text-[#CCB196]' : 'bg-[var(--service-accent)] text-[#171820]'}`}><ServiceIcon className="h-5 w-5" /></span>{inCart ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-emerald-500"><Check className="h-3 w-3" /> En carrito</span> : <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] ${selected ? 'bg-[#171820]/7 text-[#66594F]' : 'bg-white/[.06] text-white/45'}`}>{item.unit}</span>}</div>
                <h2 className="mt-5 text-lg font-black tracking-[-.035em]">{item.short}</h2>
                <p className={`mt-2 line-clamp-3 text-xs leading-5 ${selected ? 'text-[#645B54]' : 'text-white/52'}`}>{item.description}</p>
                <div className={`mt-4 flex items-end justify-between gap-3 border-t pt-3 ${selected ? 'border-[#171820]/10' : 'border-white/10'}`}><span className={`text-[9px] font-black uppercase tracking-[.15em] ${selected ? 'text-[#756B63]' : 'text-white/35'}`}>Mercado por {item.unit}</span><b className={selected ? 'text-[#171820]' : 'text-[#E5CFBA]'}>{money(item.marketMin)}–{money(item.marketMax)}</b></div>
              </button>
            );
          })}
        </div>

        <div ref={calculatorRef} className="mt-8 scroll-mt-24 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
          <div className="overflow-hidden rounded-[2.2rem] bg-[#F8F0E9] text-[#171820] shadow-[0_34px_100px_rgba(0,0,0,.34)]">
            <div className="bg-[linear-gradient(135deg,#F8F0E9,#DDC7B1)] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.23em] text-[#895E3D]">Calculadora independiente</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">{service.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#685D55]">{service.description}</p></div><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#171820] text-[#CCB196]"><Icon className="h-6 w-6" /></span></div>
            </div>

            <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[1fr_.82fr]">
              <div>
                <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#CCB196]"><Ruler className="h-4 w-4" /></span><div><p className="text-sm font-black">Ingresa las medidas reales</p><p className="mt-1 text-xs text-[#7A6C61]">La fórmula cambia automáticamente para este trabajo.</p></div></div>

                <MeasurementFields service={service} values={values} onChange={updateValue} />

                <div className="mt-6 rounded-[1.5rem] bg-[#171820] p-5 text-white">
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#CCB196]">Fórmula utilizada</p>
                  <p className="mt-2 text-sm font-black text-[#F8F0E9]">{measurement.formula}</p>
                  <p className="mt-1 text-xs leading-5 text-[#BEB2A8]">{measurement.detail}</p>
                  {measurement.secondary ? <p className="mt-2 rounded-xl bg-white/[.055] px-3 py-2 text-xs text-[#E3D3C5]">{measurement.secondary}</p> : null}
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4"><span className="text-xs text-white/50">Cantidad calculada</span><b className="text-xl text-[#E5CFBA]">{number(measurement.quantity)} {service.unit}</b></div>
                  <div className="mt-4 grid grid-cols-2 gap-3"><PriceCell label="Desde" value={money(selectedLow)} /><PriceCell label="Hasta" value={money(selectedHigh)} highlighted /></div>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[.055] px-3 py-2.5 text-xs"><span className="text-white/50">Promedio orientativo</span><b>{money(selectedAverage)}</b></div>
                </div>

                <button type="button" onClick={addCurrentService} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#B6906C] px-5 text-sm font-black text-[#171820] transition hover:bg-[#171820] hover:text-[#F8F0E9]"><Plus className="h-4 w-4" /> {addedId === service.id ? 'Servicio actualizado en el carrito' : 'Añadir cálculo al carrito'}</button>
              </div>

              <aside className="rounded-[1.6rem] bg-[#EADBCB] p-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#895E3D]">Qué considera</p>
                <ul className="mt-4 grid gap-3">{service.includes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-[#574B43]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8D6748]" />{item}</li>)}</ul>
                <div className="mt-5 rounded-[1.25rem] bg-[#F8F0E9]/80 p-4"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#76543A]">Antes de confirmar</p><p className="mt-2 text-xs leading-5 text-[#68574A]">{service.disclaimer}</p></div>
              </aside>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24">
            <article className="overflow-hidden rounded-[2rem] bg-[#F8F0E9] text-[#171820] shadow-[0_30px_85px_rgba(0,0,0,.35)]">
              <div className="flex items-start justify-between gap-4 bg-[#242630] p-5 text-white"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#CCB196]">Carrito del proyecto</p><h2 className="mt-2 text-2xl font-black">Tus servicios</h2></div><span className="grid h-12 w-12 place-items-center rounded-full bg-[#CCB196] text-[#171820]"><ReceiptText className="h-5 w-5" /></span></div>
              <div className="p-5">
                {serviceItems.length ? <div className="grid gap-3">{serviceItems.map((item) => { const range = lineRange(item); return <div key={item.id} className="rounded-[1.3rem] bg-white/75 p-4 shadow-[0_8px_24px_rgba(64,42,17,.06)]"><div className="flex items-start justify-between gap-3"><div><p className="font-black leading-5">{item.title}</p><p className="mt-1 text-[11px] text-[#796B60]">{number(item.quantity)} {item.unit}</p></div><button type="button" onClick={() => removeItem(item.id)} aria-label={`Quitar ${item.title}`} className="grid h-8 w-8 place-items-center rounded-full text-[#806F62] transition hover:bg-red-100 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-end justify-between gap-3 border-t border-[#171820]/8 pt-3"><div><span className="text-[9px] font-black uppercase tracking-[.13em] text-[#927B68]">Rango</span><b className="mt-1 block text-xs">{money(range.low)}–{money(range.high)}</b></div><button type="button" onClick={() => editCartItem(item)} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.13em] text-[#895E3D]">Editar <ChevronRight className="h-3.5 w-3.5" /></button></div>{(item.unit === 'unidad' || item.unit === 'punto') && <div className="mt-3 flex items-center justify-between rounded-full bg-[#EADBCB] p-1"><button type="button" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-white"><Minus className="h-3.5 w-3.5" /></button><b className="text-xs">{number(item.quantity)}</b><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="grid h-8 w-8 place-items-center rounded-full bg-[#171820] text-[#CCB196]"><Plus className="h-3.5 w-3.5" /></button></div>}</div>; })}</div> : <div className="rounded-[1.5rem] bg-white/65 p-6 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-[#A58B76]" /><p className="mt-3 font-black">Tu carrito está vacío</p><p className="mt-2 text-xs leading-5 text-[#806F62]">Selecciona un servicio, ingresa sus medidas y añádelo aquí.</p></div>}
                <div className="my-5 border-t border-dashed border-[#171820]/18" />
                <TotalRow label="Total desde" value={money(totals.low)} /><TotalRow label="Total hasta" value={money(totals.high)} /><TotalRow label="Promedio orientativo" value={money(Math.round((totals.low + totals.high) / 2))} strong />
                {serviceItems.length > 0 && <button type="button" onClick={clear} className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#8D765F] transition hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> Vaciar carrito</button>}
              </div>
            </article>

            <div className="mt-4 rounded-[1.7rem] bg-[#242630] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#CCB196]">Datos para solicitar</p>
              <div className="mt-4 grid gap-3"><TextField label="Nombre" value={customer.name} onChange={(value) => setCustomer((current) => ({ ...current, name: value }))} placeholder="Nombre y apellido" /><TextField label="Comuna o ciudad" value={customer.place} onChange={(value) => setCustomer((current) => ({ ...current, place: value }))} placeholder="Ej. Linares" /><label><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/45">Detalle del proyecto</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} placeholder="Estado actual, fecha ideal, acceso, fotografías…" className="mt-2 min-h-20 w-full resize-none rounded-xl bg-white/[.06] px-3 py-3 text-xs text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[#CCB196]/60" /></label></div>
              <a href={serviceItems.length ? buildWhatsAppLink(whatsappMessage) : undefined} target={serviceItems.length ? '_blank' : undefined} rel={serviceItems.length ? 'noopener noreferrer' : undefined} aria-disabled={!serviceItems.length} className={`mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition ${serviceItems.length ? 'bg-[#CCB196] text-[#171820] hover:bg-[#F8F0E9]' : 'cursor-not-allowed bg-white/[.055] text-white/25'}`}><MessageCircle className="h-4 w-4" /> Enviar carrito por WhatsApp</a>
              <p className="mt-3 text-center text-[10px] leading-5 text-white/38">No se realiza un cobro automático. El equipo valida el alcance y confirma el precio final.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MeasurementFields({ service, values, onChange }: { service: BudgetService; values: MeasurementValues; onChange: (key: keyof MeasurementValues, value: number) => void }) {
  if (service.measurement === 'count') {
    return <div className="mt-6"><QuantityField value={values.quantity} onChange={(value) => onChange('quantity', value)} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} /></div>;
  }

  if (service.measurement === 'linear') {
    return <div className="mt-6 grid gap-4 sm:grid-cols-2"><NumberField label="Largo total" value={values.length} onChange={(value) => onChange('length', value)} suffix="m" />{(service.id === 'cierre' || service.id === 'carpinteria') ? <NumberField label={service.id === 'cierre' ? 'Altura del cierre' : 'Altura referencial'} value={values.height} onChange={(value) => onChange('height', value)} suffix="m" /> : null}</div>;
  }

  const fields: Array<{ key: keyof MeasurementValues; label: string; suffix: string }> = [];
  if (service.measurement === 'wall') fields.push({ key: 'length', label: 'Largo del muro', suffix: 'm' }, { key: 'height', label: 'Alto del muro', suffix: 'm' });
  if (service.measurement === 'room-walls') fields.push({ key: 'length', label: 'Largo del recinto', suffix: 'm' }, { key: 'width', label: 'Ancho del recinto', suffix: 'm' }, { key: 'height', label: 'Alto de los muros', suffix: 'm' });
  if (service.measurement === 'floor') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' });
  if (service.measurement === 'slab') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' }, { key: 'height', label: 'Espesor', suffix: 'm' });
  if (service.measurement === 'volume') fields.push({ key: 'length', label: 'Largo', suffix: 'm' }, { key: 'width', label: 'Ancho', suffix: 'm' }, { key: 'height', label: 'Profundidad / alto', suffix: 'm' });

  return <div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map((field) => <NumberField key={field.key} label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} suffix={field.suffix} />)}</div>;
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#806E61]">{label}</span><div className="mt-2 flex items-end gap-3 rounded-[1.25rem] bg-[#EADBCB] px-4 py-3 focus-within:ring-2 focus-within:ring-[#B6906C]/40"><input type="number" min="0" step="0.01" inputMode="decimal" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-.05em] outline-none" /><b className="mb-1 text-xs text-[#895E3D]">{suffix}</b></div></label>;
}

function QuantityField({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix: string }) {
  return <div><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#806E61]">Cantidad</span><div className="mt-2 grid grid-cols-[52px_1fr_52px] items-center gap-2 rounded-[1.25rem] bg-[#EADBCB] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm"><Minus className="h-4 w-4" /></button><div className="text-center"><input type="number" min="1" inputMode="numeric" value={value || ''} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} className="w-full bg-transparent text-center text-3xl font-black outline-none" /><span className="text-[10px] font-bold uppercase tracking-[.13em] text-[#895E3D]">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-full bg-[#171820] text-[#CCB196] shadow-sm"><Plus className="h-4 w-4" /></button></div></div>;
}

function PriceCell({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return <div className={`rounded-xl px-3 py-3 ${highlighted ? 'bg-[#CCB196] text-[#171820]' : 'bg-white/[.055]'}`}><span className={`text-[9px] font-black uppercase tracking-[.15em] ${highlighted ? 'text-[#171820]/55' : 'text-white/40'}`}>{label}</span><strong className="mt-1 block text-lg">{value}</strong></div>;
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`mt-3 flex items-center justify-between gap-4 ${strong ? 'rounded-xl bg-[#171820] px-3 py-3 text-[#F8F0E9]' : 'text-xs'}`}><span className={strong ? 'text-[#CCB196]' : 'text-[#796B60]'}>{label}</span><b>{value}</b></div>;
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/45">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl bg-white/[.06] px-3 py-3 text-xs text-white outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-[#CCB196]/60" /></label>;
}
