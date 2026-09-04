'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Info,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  ReceiptText,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useQuoteCart, type QuoteItem } from '@/context/QuoteCartContext';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { displayProductName, finalProductPrice } from '@/components/store/featuredProducts';
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

type EntryMode = 'dimensions' | 'direct';
type SubmitChannel = 'email' | 'whatsapp';
type FieldConfig = { key: keyof MeasurementValues; label: string; hint: string; step: number; max: number };
type Submission = { quoteId: string; customerNotified: boolean; adminNotified: boolean };

const FIELD_SETS: Record<string, FieldConfig[]> = {
  floor: [
    { key: 'length', label: 'Largo', hint: 'metros', step: 0.1, max: 100 },
    { key: 'width', label: 'Ancho', hint: 'metros', step: 0.1, max: 100 },
  ],
  wall: [
    { key: 'length', label: 'Largo del muro', hint: 'metros', step: 0.1, max: 200 },
    { key: 'height', label: 'Alto del muro', hint: 'metros', step: 0.1, max: 10 },
  ],
  'room-walls': [
    { key: 'length', label: 'Largo del recinto', hint: 'metros', step: 0.1, max: 100 },
    { key: 'width', label: 'Ancho del recinto', hint: 'metros', step: 0.1, max: 100 },
    { key: 'height', label: 'Alto de muros', hint: 'metros', step: 0.1, max: 10 },
  ],
  slab: [
    { key: 'length', label: 'Largo', hint: 'metros', step: 0.1, max: 100 },
    { key: 'width', label: 'Ancho', hint: 'metros', step: 0.1, max: 100 },
    { key: 'height', label: 'Espesor', hint: '0,10 = 10 cm', step: 0.01, max: 0.5 },
  ],
  volume: [
    { key: 'length', label: 'Largo', hint: 'metros', step: 0.1, max: 100 },
    { key: 'width', label: 'Ancho', hint: 'metros', step: 0.1, max: 20 },
    { key: 'height', label: 'Profundidad / alto', hint: 'metros', step: 0.05, max: 10 },
  ],
  linear: [{ key: 'length', label: 'Longitud', hint: 'metros lineales', step: 0.1, max: 1000 }],
};

interface ServiceBudgetShopV2Props { initialServiceId?: string }

function metaNumber(item: QuoteItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
function metaString(item: QuoteItem, key: string) {
  const value = item.meta?.[key];
  return typeof value === 'string' ? value : '';
}
function lineService(item: QuoteItem) {
  return getBudgetService(metaString(item, 'serviceId') || resolveServiceId(item.title));
}
function lineMode(item: QuoteItem): PriceMode {
  return metaString(item, 'priceMode') === 'labor' ? 'labor' : 'complete';
}
function lineRange(item: QuoteItem) {
  const lowFromMeta = metaNumber(item, 'selectedLow');
  const highFromMeta = metaNumber(item, 'selectedHigh');
  if (lowFromMeta || highFromMeta) return { low: lowFromMeta, high: highFromMeta || lowFromMeta };
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
function taxBreakdown(total: number) {
  const net = Math.round((total || 0) / 1.19);
  return { net, iva: Math.max(0, Math.round((total || 0) - net)) };
}
function rangeText(low: number, high: number) {
  return Math.round(low) === Math.round(high) ? money(low) : `${money(low)} – ${money(high)}`;
}
function visitorId() {
  try {
    const current = window.localStorage.getItem('fabrick_visitor_id');
    if (current) return current;
    const next = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}`;
    window.localStorage.setItem('fabrick_visitor_id', next);
    return next;
  } catch { return `visitor-${Date.now()}`; }
}
function sessionId() {
  try {
    const current = window.sessionStorage.getItem('fabrick_session_id');
    if (current) return current;
    const next = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
    window.sessionStorage.setItem('fabrick_session_id', next);
    return next;
  } catch { return `session-${Date.now()}`; }
}
function trackBudget(event: string, meta: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const body = JSON.stringify({
    event,
    user_id: visitorId(),
    platform: 'web',
    meta: { ...meta, path: '/presupuesto', session_id: sessionId() },
  });
  void fetch('/api/pwa/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
}
function directLabel(service: BudgetService) {
  if (service.unit === 'm²') return 'Superficie total';
  if (service.unit === 'm³') return 'Volumen total';
  if (service.unit === 'ml') return 'Metros lineales';
  return 'Cantidad';
}
function directHint(service: BudgetService) {
  if (service.unit === 'm²') return 'Escribe los m² si ya tienes la superficie calculada.';
  if (service.unit === 'm³') return 'Escribe el volumen total si ya lo conoces.';
  if (service.unit === 'ml') return 'Escribe el recorrido total medido.';
  return 'Indica cuántos puntos o unidades necesitas.';
}

export default function ServiceBudgetShopV2({ initialServiceId }: ServiceBudgetShopV2Props) {
  const initialService = getBudgetService(initialServiceId);
  const calculatorRef = useRef<HTMLElement>(null);
  const receiptRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const { products } = useCatalogProducts();
  const { items, addItem, removeItem, updateQuantity, clear } = useQuoteCart();

  const [selectedId, setSelectedId] = useState(initialService.id);
  const [category, setCategory] = useState<ServiceCategory | 'Todas'>(initialService.category);
  const [values, setValues] = useState<MeasurementValues>(initialService.defaultValues);
  const [priceMode, setPriceMode] = useState<PriceMode>('labor');
  const [entryMode, setEntryMode] = useState<EntryMode>('dimensions');
  const [directQuantity, setDirectQuantity] = useState(0);
  const [productQuery, setProductQuery] = useState('');
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', place: '', note: '' });
  const [addedId, setAddedId] = useState('');
  const [sending, setSending] = useState<SubmitChannel | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [reference] = useState(() => `FBK-${Date.now().toString(36).slice(-6).toUpperCase()}`);

  const service = getBudgetService(selectedId);
  const Icon = service.icon;
  const serviceItems = items.filter((item) => item.kind === 'service');
  const productItems = items.filter((item) => item.kind === 'material');
  const visibleServices = category === 'Todas' ? BUDGET_SERVICES : BUDGET_SERVICES.filter((item) => item.category === category);
  const fields = service.measurement === 'count' ? [] : FIELD_SETS[service.measurement] || FIELD_SETS.floor;
  const supportsDirect = service.unit === 'm²' || service.unit === 'm³' || service.unit === 'ml';
  const categoryCounts = useMemo(() => SERVICE_CATEGORIES.reduce<Record<ServiceCategory, number>>((result, item) => {
    result[item] = BUDGET_SERVICES.filter((candidate) => candidate.category === item).length;
    return result;
  }, {} as Record<ServiceCategory, number>), []);

  const measured = useMemo(() => calculateServiceMeasurement(service, values), [service, values]);
  const measurement = useMemo(() => {
    if (service.measurement === 'count') return measured;
    if (entryMode !== 'direct' || !supportsDirect) return measured;
    return {
      quantity: Math.max(0, directQuantity),
      priceFactor: service.measurement === 'slab' ? measured.priceFactor : 1,
      formula: `Total ingresado en ${service.unit}`,
      detail: `${number(Math.max(0, directQuantity))} ${service.unit}`,
      secondary: service.measurement === 'slab' ? `${number(Math.max(0, directQuantity) * Math.max(0.05, values.height))} m³ de hormigón aprox.` : undefined,
    };
  }, [directQuantity, entryMode, measured, service.measurement, service.unit, supportsDirect, values.height]);

  const laborUnit = getServicePriceRange(service, 'labor');
  const completeUnit = getServicePriceRange(service, 'complete');
  const laborLow = measurement.quantity * laborUnit.min * measurement.priceFactor;
  const laborHigh = measurement.quantity * laborUnit.max * measurement.priceFactor;
  const completeLow = measurement.quantity * completeUnit.min * measurement.priceFactor;
  const completeHigh = measurement.quantity * completeUnit.max * measurement.priceFactor;
  const selectedLow = priceMode === 'labor' ? laborLow : completeLow;
  const selectedHigh = priceMode === 'labor' ? laborHigh : completeHigh;

  const serviceTotals = useMemo(() => serviceItems.reduce((result, item) => {
    const range = lineRange(item);
    return { low: result.low + range.low, high: result.high + range.high };
  }, { low: 0, high: 0 }), [serviceItems]);
  const productTotal = useMemo(() => productItems.reduce((sum, item) => sum + (item.refPrice || 0) * item.quantity, 0), [productItems]);
  const totals = useMemo(() => ({ low: serviceTotals.low + productTotal, high: serviceTotals.high + productTotal }), [productTotal, serviceTotals]);
  const taxLow = useMemo(() => taxBreakdown(totals.low), [totals.low]);
  const taxHigh = useMemo(() => taxBreakdown(totals.high), [totals.high]);

  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    return [...products]
      .filter((product) => !query || `${product.name} ${product.category} ${product.tagline}`.toLowerCase().includes(query))
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(b.stock || 0) - Number(a.stock || 0))
      .slice(0, 8);
  }, [productQuery, products]);

  useEffect(() => {
    if (!initialServiceId) return;
    const next = getBudgetService(initialServiceId);
    setSelectedId(next.id);
    setCategory(next.category);
    setValues(next.defaultValues);
    setEntryMode('dimensions');
    setDirectQuantity(0);
  }, [initialServiceId]);

  function chooseCategory(nextCategory: ServiceCategory | 'Todas') {
    setCategory(nextCategory);
    trackBudget('budget_category_selected', { category: nextCategory });
    if (nextCategory === 'Todas' || service.category === nextCategory) return;
    const first = BUDGET_SERVICES.find((item) => item.category === nextCategory);
    if (first) chooseService(first, false);
  }

  function chooseService(next: BudgetService, scroll = true) {
    setSelectedId(next.id);
    setCategory(next.category);
    setValues(next.defaultValues);
    setEntryMode('dimensions');
    setDirectQuantity(0);
    setAddedId('');
    setSubmission(null);
    trackBudget('budget_service_selected', {
      service_id: next.id,
      service_title: next.title,
      category: next.category,
      unit: next.unit,
      measurement: next.measurement,
    });
    const url = new URL(window.location.href);
    url.searchParams.set('servicio', next.id);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    if (scroll) window.requestAnimationFrame(() => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function updateValue(key: keyof MeasurementValues, value: number) {
    const field = fields.find((item) => item.key === key);
    const safe = Math.max(0, Math.min(field?.max ?? 9999, Number(value) || 0));
    setValues((current) => ({ ...current, [key]: safe }));
    setAddedId('');
  }

  function addCurrentService() {
    if (measurement.quantity <= 0) return;
    const range = getServicePriceRange(service, priceMode);
    const adjustedMin = range.min * measurement.priceFactor;
    const adjustedMax = range.max * measurement.priceFactor;
    addItem({
      id: `service_${service.id}`,
      kind: 'service',
      title: service.title,
      description: service.description,
      quantity: measurement.quantity,
      unit: service.unit,
      refPrice: Math.round((adjustedMin + adjustedMax) / 2),
      notes: priceMode === 'labor' ? 'Referencia de mano de obra' : 'Referencia de trabajo vendido',
      meta: {
        serviceId: service.id,
        category: service.category,
        measurement: service.measurement,
        priceMode,
        entryMode,
        directQuantity,
        marketMinUnit: adjustedMin,
        marketMaxUnit: adjustedMax,
        selectedLow,
        selectedHigh,
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
    setSubmission(null);
    trackBudget('budget_service_added', {
      service_id: service.id,
      service_title: service.title,
      category: service.category,
      unit: service.unit,
      measurement: service.measurement,
      entry_mode: entryMode,
      price_mode: priceMode,
      quantity: measurement.quantity,
      total_low: selectedLow,
      total_high: selectedHigh,
    });
  }

  function addProduct(product: CatalogProduct) {
    if (product.stock === 0) return;
    const existing = productItems.find((item) => metaString(item, 'productId') === product.id);
    if (existing) updateQuantity(existing.id, existing.quantity + 1);
    else addItem({
      id: `material_${product.id}`,
      kind: 'material',
      title: displayProductName(product.name),
      description: product.tagline || product.description,
      quantity: 1,
      unit: 'unidad',
      refPrice: finalProductPrice(product),
      image: product.img,
      notes: 'Producto seleccionado desde el catálogo Fabrick',
      meta: { productId: product.id, category: product.category, stock: product.stock ?? null, taxIncluded: true },
    });
    setSubmission(null);
    trackBudget('budget_product_added', {
      product_id: product.id,
      product_title: displayProductName(product.name),
      category: product.category,
      price: finalProductPrice(product),
    });
  }

  function editItem(item: QuoteItem) {
    const next = lineService(item);
    chooseService(next);
    setPriceMode(lineMode(item));
    const nextEntryMode = metaString(item, 'entryMode') === 'direct' ? 'direct' : 'dimensions';
    setEntryMode(nextEntryMode);
    setDirectQuantity(metaNumber(item, 'directQuantity'));
    setValues({
      length: metaNumber(item, 'length') || next.defaultValues.length,
      width: metaNumber(item, 'width') || next.defaultValues.width,
      height: metaNumber(item, 'height') || next.defaultValues.height,
      quantity: metaNumber(item, 'quantityInput') || next.defaultValues.quantity,
    });
  }

  function projectMessage(quoteId?: string) {
    const services = serviceItems.map((item, index) => {
      const range = lineRange(item);
      return `${index + 1}. ${item.title} · ${number(item.quantity)} ${item.unit || 'unidad'} · ${rangeText(range.low, range.high)}`;
    });
    const materials = productItems.map((item, index) => `${index + 1}. ${item.title} · ${number(item.quantity)} ${item.unit || 'unidad'} · ${money((item.refPrice || 0) * item.quantity)}`);
    return [
      'Hola Soluciones Fabrick, envié este presupuesto referencial y quiero revisarlo.',
      `Referencia: ${reference}`,
      quoteId ? `Folio: ${quoteId.slice(0, 8).toUpperCase()}` : '',
      '',
      'SERVICIOS',
      ...(services.length ? services : ['Sin servicios']),
      '',
      'PRODUCTOS / INSUMOS',
      ...(materials.length ? materials : ['Sin productos']),
      '',
      `TOTAL REFERENCIAL: ${rangeText(totals.low, totals.high)}`,
      customer.name ? `Cliente: ${customer.name}` : '',
      customer.place ? `Ubicación: ${customer.place}` : '',
      customer.note ? `Detalle: ${customer.note}` : '',
      '',
      'Quiero confirmar alcance, visita y valor final.',
    ].filter(Boolean).join('\n');
  }

  async function submitBudget(channel: SubmitChannel) {
    if (!items.length) {
      setSubmitError('Agrega al menos un servicio o producto antes de confirmar.');
      return;
    }
    if (!customer.name.trim() || !customer.email.trim()) {
      setSubmitError('Completa nombre y correo para enviarte la copia del presupuesto.');
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setSending(channel);
    setSubmitError('');
    const popup = channel === 'whatsapp' ? window.open('', '_blank') : null;
    try {
      const response = await fetch('/api/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          channel,
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim() || undefined,
            region: customer.place.trim() || undefined,
            notes: customer.note.trim() || undefined,
          },
          items,
        }),
      });
      const data = await response.json().catch(() => ({})) as {
        error?: string;
        quote?: { id?: string };
        notifications?: { customer?: boolean; admin?: boolean };
      };
      if (!response.ok || !data.quote?.id) throw new Error(data.error || 'No se pudo registrar el presupuesto.');

      const nextSubmission = {
        quoteId: data.quote.id,
        customerNotified: Boolean(data.notifications?.customer),
        adminNotified: Boolean(data.notifications?.admin),
      };
      setSubmission(nextSubmission);
      trackBudget('budget_submitted', {
        quote_id: data.quote.id,
        channel,
        service_count: serviceItems.length,
        product_count: productItems.length,
        total_low: totals.low,
        total_high: totals.high,
      });
      if (channel === 'whatsapp') {
        trackBudget('budget_whatsapp_opened', { quote_id: data.quote.id, total_low: totals.low, total_high: totals.high });
        const href = buildWhatsAppLink(projectMessage(data.quote.id));
        if (popup) popup.location.href = href;
        else window.location.href = href;
      } else if (popup) popup.close();
    } catch (error) {
      popup?.close();
      setSubmitError(error instanceof Error ? error.message : 'No se pudo enviar el presupuesto.');
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="bg-[#F7F6F2] text-[#151714]">
      <style>{`
        @media print{body *{visibility:hidden!important}.sf-budget-receipt,.sf-budget-receipt *{visibility:visible!important}.sf-budget-receipt{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;max-width:none!important;box-shadow:none!important}.sf-budget-no-print{display:none!important}}
        .sf-input{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.045);padding:.82rem .9rem;font-size:.78rem;color:white;outline:none;transition:border-color .2s ease,background .2s ease}.sf-input::placeholder{color:rgba(255,255,255,.28)}.sf-input:focus{border-color:rgba(221,164,71,.58);background:rgba(255,255,255,.065)}
      `}</style>

      <section className="relative isolate overflow-hidden bg-[#111310] px-4 pb-12 pt-24 text-[#F7F6F2] sm:px-6 lg:px-8 lg:pb-16 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_12%_0%,rgba(221,164,71,.18),transparent_30rem),linear-gradient(180deg,rgba(255,255,255,.025),transparent_44%)]" />
        <div className="relative mx-auto max-w-[1240px]">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-[10px] font-semibold text-white/58">
                <Calculator className="h-3.5 w-3.5 text-[#DDA447]" /> Cotizador de obra y servicios
              </div>
              <h1 className="mt-5 max-w-[17ch] text-[clamp(2.45rem,6vw,5.1rem)] font-semibold leading-[.98] tracking-[-.055em]">Parte por lo que necesitas. Nosotros ordenamos el cálculo.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/52 sm:text-[15px]">Selecciona una partida, mide el trabajo y compara dos formas de contratarlo. Al final tendrás una referencia clara con servicios, productos y total estimado.</p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[.04] p-5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold text-white/45">Presupuesto {reference}</span>
                <span className="h-2 w-2 rounded-full bg-[#DDA447]" />
              </div>
              <p className="mt-5 text-[12px] font-medium text-white/42">Referencia actual</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">{items.length ? rangeText(totals.low, totals.high) : 'Comienza con un servicio'}</p>
              <div className="mt-5 flex items-center gap-4 border-t border-white/8 pt-4 text-[10px] text-white/38">
                <span>{serviceItems.length} servicios</span><span>{productItems.length} productos</span><span>IVA contenido</span>
              </div>
            </div>
          </div>

          <div className="mt-9 grid gap-2 sm:grid-cols-3">
            <FlowStep icon={ClipboardList} number="01" title="Elige" text="Selecciona el trabajo que quieres cotizar." />
            <FlowStep icon={Ruler} number="02" title="Mide" text="Ingresa medidas o el total que ya calculaste." />
            <FlowStep icon={ReceiptText} number="03" title="Revisa" text="Compara, agrega productos y confirma." />
          </div>
        </div>
      </section>

      <SectorBrands />

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1240px]">
          <SectionIntro eyebrow="Servicios" title="Primero, elige el trabajo." text="Filtra por área y selecciona una partida. Cada servicio muestra cómo se mide y desde qué rango se calcula; los detalles aparecen después, en la calculadora." />

          <div className="mt-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CategoryButton active={category === 'Todas'} label="Todos" count={BUDGET_SERVICES.length} onClick={() => chooseCategory('Todas')} />
            {SERVICE_CATEGORIES.map((item) => <CategoryButton key={item} active={category === item} label={item} count={categoryCounts[item]} onClick={() => chooseCategory(item)} />)}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleServices.map((item) => {
              const ItemIcon = item.icon;
              const active = item.id === service.id;
              const inBudget = serviceItems.some((line) => metaString(line, 'serviceId') === item.id);
              return (
                <button key={item.id} type="button" onClick={() => chooseService(item)} className={`group relative flex min-h-[176px] flex-col rounded-[20px] border p-4 text-left transition sm:p-5 ${active ? 'border-[#DDA447] bg-[#FFFDF8] shadow-[0_14px_40px_rgba(61,49,28,.08)] ring-1 ring-[#DDA447]/15' : 'border-[#151714]/[.07] bg-white hover:-translate-y-0.5 hover:border-[#151714]/15'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-[12px] ${active ? 'bg-[#151714] text-[#E7B65C]' : 'bg-[#F1EFE8] text-[#555C52]'}`}><ItemIcon className="h-[18px] w-[18px]" /></span>
                    <div className="flex items-center gap-2">
                      {inBudget ? <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#E8F0E5] px-2 text-[9px] font-semibold text-[#4E6549]"><Check className="h-3 w-3"/> Añadido</span> : null}
                      <span className="rounded-full bg-[#F2F0EA] px-2 py-1 text-[9px] font-semibold text-[#686E64]">/{item.unit}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#898E84]">{item.category}</p>
                    <h3 className="mt-1 text-[15px] font-semibold tracking-[-.02em] text-[#151714]">{item.short}</h3>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#777C73]">{item.description}</p>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#151714]/[.06] pt-4">
                    <div><span className="block text-[9px] text-[#8A8F86]">Mano de obra desde</span><b className="mt-0.5 block text-sm font-semibold text-[#2B2E2A]">{money(item.laborMin)}</b></div>
                    <ChevronRight className={`h-4 w-4 ${active ? 'text-[#B77A1F]' : 'text-[#A4A89F]'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={calculatorRef} className="scroll-mt-24 border-y border-[#151714]/[.06] bg-[#EEECE6] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#8A6A36]">Calculadora</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Mide {service.short.toLowerCase()}.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#747970]">La calculadora adapta sus campos a la unidad real de esta partida. Puedes cambiar la modalidad antes de agregarla al presupuesto.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-[10px] text-[#777C73]"><span className="grid h-8 w-8 place-items-center rounded-full bg-white"><Icon className="h-4 w-4 text-[#5D645A]"/></span>{service.category} · {service.unit}</div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="overflow-hidden rounded-[24px] border border-[#151714]/[.07] bg-white">
              <div className="border-b border-[#151714]/[.07] px-5 py-5 sm:px-7">
                <p className="text-[10px] font-semibold text-[#8D9289]">Servicio seleccionado</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="text-xl font-semibold tracking-[-.03em] sm:text-2xl">{service.title}</h3><span className="rounded-full bg-[#F3F1EB] px-2.5 py-1 text-[9px] font-semibold text-[#6D7269]">Se cobra por {service.unit}</span></div>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-[#777C73]">{service.description}</p>
              </div>

              <div className="grid lg:grid-cols-[1.06fr_.94fr]">
                <div className="border-b border-[#151714]/[.07] p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-semibold text-[#666C63]">1. Medición</p><span className="text-[9px] text-[#9A9E96]">{number(measurement.quantity)} {service.unit}</span></div>
                  {supportsDirect ? <div className="mt-4 grid grid-cols-2 gap-1 rounded-[14px] bg-[#F2F0EA] p-1"><ModeButton active={entryMode === 'dimensions'} icon={Ruler} label="Por medidas" onClick={() => setEntryMode('dimensions')} /><ModeButton active={entryMode === 'direct'} icon={CircleDollarSign} label={`Total ${service.unit}`} onClick={() => setEntryMode('direct')} /></div> : null}

                  <div className="mt-5">
                    {service.measurement === 'count' ? (
                      <NumberField label={directLabel(service)} hint={directHint(service)} value={values.quantity} step={1} onChange={(value) => updateValue('quantity', value)} />
                    ) : entryMode === 'direct' && supportsDirect ? (
                      <div className="grid gap-4"><NumberField label={directLabel(service)} hint={directHint(service)} value={directQuantity} step={service.unit === 'm³' ? 0.1 : 0.5} onChange={setDirectQuantity} suffix={service.unit} />{service.measurement === 'slab' ? <NumberField label="Espesor" hint="Ajusta la referencia del radier." value={values.height} step={0.01} onChange={(value) => updateValue('height', value)} suffix="m" /> : null}</div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <NumberField key={field.key} label={field.label} hint={field.hint} value={values[field.key]} step={field.step} onChange={(value) => updateValue(field.key, value)} />)}</div>
                    )}
                  </div>

                  <div className="mt-5 rounded-[16px] bg-[#F6F4EF] p-4">
                    <div className="flex items-center gap-2 text-[9px] font-semibold text-[#7C8278]"><Calculator className="h-3.5 w-3.5"/> Resultado de la medición</div>
                    <p className="mt-2 text-sm font-semibold text-[#2B2E2A]">{measurement.formula}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#777C73]">{measurement.detail}</p>
                    {measurement.secondary ? <p className="mt-1 text-[10px] text-[#927043]">{measurement.secondary}</p> : null}
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-semibold text-[#666C63]">2. Forma de contratar</p>
                  <div className="mt-4 grid grid-cols-2 gap-2"><PriceModeButton active={priceMode === 'labor'} title="Solo ejecución" text="Mano de obra" onClick={() => setPriceMode('labor')} /><PriceModeButton active={priceMode === 'complete'} title="Trabajo vendido" text="Ejecución + base" onClick={() => setPriceMode('complete')} /></div>
                  <p className="mt-3 flex gap-2 text-[10px] leading-5 text-[#777C73]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A87B32]" />{priceModeDescription(priceMode)}</p>
                  <div className="mt-5 grid gap-2"><RangeCard label="Solo ejecución" low={laborLow} high={laborHigh} active={priceMode === 'labor'} /><RangeCard label="Trabajo vendido" low={completeLow} high={completeHigh} active={priceMode === 'complete'} /></div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-[#151714]/[.07] bg-[#FBFAF7] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div><p className="text-[10px] text-[#848980]">Referencia seleccionada</p><p className="mt-1 text-2xl font-semibold tracking-[-.04em]">{rangeText(selectedLow, selectedHigh)}</p></div>
                <button type="button" disabled={measurement.quantity <= 0} onClick={addCurrentService} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-[#171916] px-5 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-30">{addedId === service.id ? <Check className="h-4 w-4 text-[#E7B65C]" /> : <Plus className="h-4 w-4 text-[#E7B65C]" />}{addedId === service.id ? 'Partida actualizada' : 'Agregar partida'}</button>
              </div>
            </div>

            <aside className="rounded-[22px] bg-[#171916] p-5 text-white xl:sticky xl:top-24 sm:p-6">
              <div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-white/44">Resumen</p><ReceiptText className="h-4 w-4 text-[#DDA447]"/></div>
              <p className="mt-3 text-3xl font-semibold tracking-[-.045em]">{items.length ? rangeText(totals.low, totals.high) : money(0)}</p>
              <p className="mt-2 text-[10px] leading-5 text-white/40">{serviceItems.length} servicios · {productItems.length} productos</p>
              <div className="mt-5 divide-y divide-white/[.07] border-y border-white/[.07]">{serviceItems.slice(-4).map((item) => { const range = lineRange(item); return <div key={item.id} className="py-3"><div className="flex justify-between gap-3"><span className="text-[11px] font-medium text-white/76">{item.title}</span><span className="text-[10px] font-medium text-[#E5B45C]">{rangeText(range.low, range.high)}</span></div><p className="mt-1 text-[9px] text-white/30">{number(item.quantity)} {item.unit} · {lineMode(item) === 'labor' ? 'ejecución' : 'trabajo vendido'}</p></div>; })}</div>
              <button type="button" onClick={() => { trackBudget('budget_receipt_viewed', { total_low: totals.low, total_high: totals.high }); receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[#DDA447] px-5 text-xs font-semibold text-[#191A17]">Revisar presupuesto <ChevronRight className="h-4 w-4" /></button>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <SectionIntro eyebrow="Productos" title="Añade solo lo que aporta al proyecto." text="Los productos quedan separados de la mano de obra. Así puedes ver cuánto corresponde a ejecución y cuánto a materiales o equipos." />
            <label className="flex h-12 w-full items-center gap-3 rounded-[14px] border border-[#151714]/[.08] bg-white px-4 lg:ml-auto lg:max-w-md"><Search className="h-4 w-4 text-[#72776E]"/><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar producto o categoría" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#A2A69E]"/></label>
          </div>

          <div className="-mx-4 mt-7 grid auto-cols-[minmax(252px,78vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
            {visibleProducts.map((product) => {
              const price = finalProductPrice(product);
              const current = productItems.find((item) => metaString(item, 'productId') === product.id);
              const outOfStock = product.stock === 0;
              return (
                <article key={product.id} className="group overflow-hidden rounded-[20px] border border-[#151714]/[.07] bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-[#151714]/15">
                  <div className="relative aspect-[1.08/1] overflow-hidden rounded-[15px] bg-[#F1F0EB]">{product.img ? <img src={product.img} alt={displayProductName(product.name)} loading="lazy" decoding="async" className="h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.02]"/> : <div className="grid h-full place-items-center"><Package className="h-8 w-8 text-black/18"/></div>}<span className="absolute left-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-[8px] font-semibold text-[#6C7168] shadow-sm">{product.category}</span>{current ? <span className="absolute right-3 top-3 grid h-7 min-w-7 place-items-center rounded-full bg-[#171916] px-2 text-[9px] font-semibold text-white">{number(current.quantity)}</span> : null}</div>
                  <div className="px-1 pb-1 pt-4"><h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 tracking-[-.015em]">{displayProductName(product.name)}</h3><p className="mt-1 line-clamp-1 text-[10px] text-[#868B82]">{product.tagline || 'Producto disponible para complementar tu presupuesto'}</p><div className="mt-4 flex items-center justify-between gap-3 border-t border-[#151714]/[.06] pt-3"><div><b className="text-base font-semibold tracking-[-.025em]">{money(price)}</b><span className={`mt-0.5 block text-[8px] font-medium ${outOfStock ? 'text-[#A35E58]' : 'text-[#65775D]'}`}>{outOfStock ? 'Sin stock' : 'IVA incluido'}</span></div><button type="button" disabled={outOfStock} onClick={() => addProduct(product)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-[#171916] px-3 text-[10px] font-semibold text-white disabled:opacity-30">{current ? <><Plus className="h-3.5 w-3.5 text-[#E7B65C]"/> Añadir otro</> : <><Plus className="h-3.5 w-3.5 text-[#E7B65C]"/> Añadir</>}</button></div></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={receiptRef} className="scroll-mt-24 bg-[#151714] px-4 py-12 text-[#F7F6F2] sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr] lg:items-end">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#DDA447]">Resumen final</p><h2 className="mt-2 max-w-[13ch] text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Todo el proyecto, en una sola lectura.</h2></div>
            <p className="max-w-2xl text-sm leading-6 text-white/45">La referencia separa ejecución, trabajo vendido y productos. El valor definitivo se confirma después de revisar condiciones reales, alcance y terminaciones.</p>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[1.08fr_.92fr] xl:items-start">
            <article className="sf-budget-receipt overflow-hidden rounded-[22px] bg-[#FAF9F6] text-[#151714]">
              <div className="flex items-start justify-between gap-4 border-b border-[#151714]/[.07] p-5 sm:p-7"><div><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-[#8F7040]">Soluciones Fabrick · referencia {reference}</p><h3 className="mt-2 text-xl font-semibold tracking-[-.03em] sm:text-2xl">Presupuesto del proyecto</h3></div><span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#ECE8DE] text-[#6D725F]"><ReceiptText className="h-4 w-4" /></span></div>

              <div className="p-5 sm:p-7">
                <ReceiptSection title="Servicios" icon={Calculator} empty="Aún no agregas servicios.">
                  {serviceItems.map((item) => {
                    const range = lineRange(item); const alt = alternateRange(item); const mode = lineMode(item);
                    return <div key={item.id} className="border-b border-black/[.07] py-4 last:border-0"><div className="flex items-start justify-between gap-4"><div><span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-semibold ${mode === 'labor' ? 'bg-[#ECEBE6] text-[#666B63]' : 'bg-[#F0E5CF] text-[#7C5C28]'}`}>{mode === 'labor' ? 'Solo ejecución' : 'Trabajo vendido'}</span><h4 className="mt-2 text-sm font-semibold">{item.title}</h4><p className="mt-1 text-[10px] text-black/42">{number(item.quantity)} {item.unit} · {metaString(item, 'formula')}</p></div><button type="button" onClick={() => removeItem(item.id)} className="sf-budget-no-print text-[#A35E58]" aria-label={`Quitar ${item.title}`}><Trash2 className="h-4 w-4"/></button></div><div className="mt-3 flex items-end justify-between gap-4"><div><b className="text-sm font-semibold">{rangeText(range.low, range.high)}</b><p className="mt-1 text-[9px] text-black/36">Alternativa: {rangeText(alt.low, alt.high)}</p></div><button type="button" onClick={() => editItem(item)} className="sf-budget-no-print text-[9px] font-semibold text-[#8D6B36]">Editar cálculo</button></div></div>;
                  })}
                </ReceiptSection>

                <ReceiptSection title="Productos" icon={Package} empty="No agregaste productos al presupuesto.">
                  {productItems.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-black/[.07] py-4 last:border-0">{item.image ? <img src={item.image} alt="" className="h-12 w-12 rounded-[12px] bg-[#F1EFEA] object-contain p-1.5"/> : <span className="grid h-12 w-12 place-items-center rounded-[12px] bg-[#F1EFEA]"><Package className="h-4 w-4"/></span>}<div className="min-w-0 flex-1"><h4 className="truncate text-xs font-semibold">{item.title}</h4><p className="mt-1 text-[9px] text-black/38">{money(item.refPrice || 0)} c/u</p><div className="sf-budget-no-print mt-2 inline-flex items-center gap-3 rounded-full border border-black/10 px-2 py-1"><button type="button" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}><Minus className="h-3 w-3"/></button><b className="text-[10px]">{number(item.quantity)}</b><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3"/></button></div></div><div className="text-right"><b className="text-sm font-semibold">{money((item.refPrice || 0) * item.quantity)}</b><button type="button" onClick={() => removeItem(item.id)} className="sf-budget-no-print mt-2 ml-auto block text-[#A35E58]"><Trash2 className="h-3.5 w-3.5"/></button></div></div>)}
                </ReceiptSection>

                {!items.length ? <div className="py-8 text-center"><ShoppingBag className="mx-auto h-8 w-8 text-black/18"/><p className="mt-3 text-sm font-semibold">Tu presupuesto está vacío</p><p className="mt-1 text-xs text-black/40">Selecciona un servicio o agrega un producto para comenzar.</p></div> : null}

                <div className="mt-5 rounded-[16px] bg-[#F0EEE8] p-4 sm:p-5"><ReceiptRow label="Servicios" value={rangeText(serviceTotals.low, serviceTotals.high)} muted /><ReceiptRow label="Productos" value={money(productTotal)} muted /><ReceiptRow label="Neto contenido" value={rangeText(taxLow.net, taxHigh.net)} muted /><ReceiptRow label="IVA 19% contenido" value={rangeText(taxLow.iva, taxHigh.iva)} muted /><ReceiptRow label="Total referencial" value={rangeText(totals.low, totals.high)} strong /></div>
                <p className="mt-3 text-[9px] leading-4 text-black/38">Los servicios mantienen un rango porque terreno, acceso, estado actual, terminaciones y alcance pueden cambiar el valor definitivo.</p>
                <div className="sf-budget-no-print mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={!items.length} onClick={() => window.print()} className="min-h-11 rounded-[12px] border border-black/10 text-[10px] font-semibold disabled:opacity-30">Guardar PDF</button><button type="button" disabled={!items.length} onClick={() => { clear(); setSubmission(null); }} className="min-h-11 rounded-[12px] border border-black/10 text-[10px] font-semibold text-[#A35E58] disabled:opacity-30">Vaciar</button></div>
              </div>
            </article>

            <section ref={formRef} className="scroll-mt-24 rounded-[22px] border border-white/[.09] bg-white/[.035] p-5 sm:p-7 xl:sticky xl:top-24">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#DDA447] text-[#171916]"><Mail className="h-4 w-4"/></span><div><p className="text-[10px] font-semibold text-white/42">Confirmar solicitud</p><h3 className="text-xl font-semibold tracking-[-.03em]">Recibe tu copia y continúa con nosotros.</h3></div></div>
              <p className="mt-4 text-xs leading-6 text-white/42">Completa tus datos. Guardaremos la solicitud, enviaremos la referencia al correo indicado y podrás continuar por WhatsApp si lo prefieres.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2"><FormField icon={UserRound} label="Nombre completo *"><input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre y apellido" className="sf-input"/></FormField><FormField icon={Mail} label="Correo *"><input type="email" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="tu@email.cl" className="sf-input"/></FormField><FormField icon={Phone} label="Teléfono"><input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="+56 9 ..." className="sf-input"/></FormField><FormField icon={MapPin} label="Comuna / ciudad"><input value={customer.place} onChange={(event) => setCustomer((current) => ({ ...current, place: event.target.value }))} placeholder="Ej. Linares" className="sf-input"/></FormField></div>
              <label className="mt-4 grid gap-2"><span className="flex items-center gap-2 text-[9px] font-semibold text-white/44"><FileText className="h-3.5 w-3.5 text-[#DDA447]"/>Detalles del proyecto</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} rows={4} placeholder="Estado actual, fecha ideal, referencias o dudas…" className="resize-none rounded-[14px] border border-white/[.10] bg-white/[.045] px-4 py-3 text-xs leading-6 text-white outline-none placeholder:text-white/28 focus:border-[#DDA447]/55"/></label>

              {submitError ? <div className="mt-4 rounded-[12px] border border-red-400/20 bg-red-400/[.08] px-4 py-3 text-xs leading-5 text-red-200">{submitError}</div> : null}
              {submission ? <div className="mt-4 rounded-[14px] border border-emerald-300/20 bg-emerald-300/[.07] p-4"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-300 text-black"><Check className="h-4 w-4"/></span><div><b className="text-sm font-semibold">Presupuesto registrado</b><p className="mt-1 text-[10px] leading-5 text-white/46">Folio {submission.quoteId.slice(0, 8).toUpperCase()}. {submission.customerNotified ? 'La copia fue enviada al correo indicado.' : 'La solicitud quedó guardada para revisión.'}</p></div></div></div> : null}

              <div className="mt-5 grid gap-2"><button type="button" disabled={!items.length || Boolean(sending)} onClick={() => void submitBudget('email')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-[#DDA447] px-5 text-xs font-semibold text-[#171916] disabled:opacity-30"><Mail className="h-4 w-4"/>{sending === 'email' ? 'Enviando…' : 'Confirmar y recibir por correo'}</button><button type="button" disabled={!items.length || Boolean(sending)} onClick={() => void submitBudget('whatsapp')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] border border-white/[.12] bg-white/[.035] px-5 text-xs font-semibold text-white disabled:opacity-30"><MessageCircle className="h-4 w-4 text-[#DDA447]"/>{sending === 'whatsapp' ? 'Registrando…' : 'Confirmar y abrir WhatsApp'}</button></div>
              <p className="mt-4 flex gap-2 text-[9px] leading-5 text-white/28"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#DDA447]"/>La referencia no reemplaza una visita técnica ni constituye documento tributario.</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectorBrands() {
  const brands = [
    { name: 'Bosch', src: 'https://cdn.simpleicons.org/bosch/EA0016' },
    { name: 'Caterpillar', src: 'https://cdn.simpleicons.org/caterpillar/FFCD11' },
    { name: 'Bentley', src: 'https://cdn.simpleicons.org/bentley/333333' },
  ];
  return <section className="border-b border-[#151714]/[.06] bg-white px-4 py-5 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#8C9188]">Referencias del sector</p><p className="mt-1 text-[10px] text-[#9A9E96]">Herramientas, maquinaria y tecnología reconocidas en construcción.</p></div><div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{brands.map((brand) => <div key={brand.name} className="flex h-10 shrink-0 items-center gap-2 rounded-[11px] border border-[#151714]/[.07] bg-[#F8F7F3] px-3"><img src={brand.src} alt={`${brand.name} logo`} loading="lazy" className="h-4 w-4 object-contain"/><span className="text-[10px] font-semibold text-[#575C54]">{brand.name}</span></div>)}</div></div><div className="mx-auto mt-2 max-w-[1240px] text-[8px] leading-4 text-[#A1A59D]">Marcas mostradas como referencias visuales del ecosistema de construcción; no implican afiliación, representación ni disponibilidad comercial.</div></section>;
}
function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="grid gap-4 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#8A6A36]">{eyebrow}</p><h2 className="mt-2 max-w-[16ch] text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{title}</h2></div><p className="max-w-2xl text-sm leading-6 text-[#777C73]">{text}</p></div>;
}
function FlowStep({ icon: Icon, number: step, title, text }: { icon: typeof ClipboardList; number: string; title: string; text: string }) {
  return <div className="rounded-[16px] border border-white/[.08] bg-white/[.035] p-4 sm:p-5"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-white/[.06] text-[#DDA447]"><Icon className="h-4 w-4"/></span><span className="text-[9px] font-medium text-white/22">{step}</span></div><b className="mt-4 block text-sm font-semibold">{title}</b><p className="mt-1 text-[10px] leading-5 text-white/38">{text}</p></div>;
}
function CategoryButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-3.5 py-2 text-[10px] font-semibold transition ${active ? 'border-[#171916] bg-[#171916] text-white' : 'border-[#151714]/[.08] bg-white text-[#70756C] hover:border-[#151714]/15'}`}>{label}<span className={`ml-2 ${active ? 'text-[#DDA447]' : 'text-[#A1A59D]'}`}>{count}</span></button>;
}
function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Ruler; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-10 items-center justify-center gap-2 rounded-[11px] px-3 text-[10px] font-semibold transition ${active ? 'bg-white text-[#20221F] shadow-sm' : 'text-[#7A8076]'}`}><Icon className="h-3.5 w-3.5"/>{label}</button>;
}
function PriceModeButton({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-[14px] border p-3 text-left transition ${active ? 'border-[#DDA447]/45 bg-[#FFF9EE]' : 'border-[#151714]/[.07] bg-[#F7F6F2] text-[#6F756C]'}`}><div className="flex items-center justify-between gap-2"><b className="text-[10px] font-semibold">{title}</b>{active ? <BadgeCheck className="h-3.5 w-3.5 text-[#9A6B25]"/> : null}</div><span className="mt-1 block text-[9px] opacity-60">{text}</span></button>;
}
function RangeCard({ label, low, high, active }: { label: string; low: number; high: number; active: boolean }) {
  return <div className={`rounded-[14px] border p-4 ${active ? 'border-[#DDA447]/38 bg-[#FFF9EE]' : 'border-[#151714]/[.07] bg-[#F8F7F4]'}`}><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-medium text-[#777C73]">{label}</span>{active ? <Check className="h-3.5 w-3.5 text-[#9A6B25]"/> : null}</div><b className="mt-2 block text-base font-semibold tracking-[-.025em]">{rangeText(low, high)}</b></div>;
}
function NumberField({ label, hint, value, step, suffix, onChange }: { label: string; hint: string; value: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="grid gap-2"><span className="text-[10px] font-medium text-[#666C63]">{label}</span><div className="flex items-center rounded-[13px] border border-[#151714]/[.09] bg-[#FCFBF8] px-3 transition focus-within:border-[#DDA447]/60"><input type="number" min="0" step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"/>{suffix ? <span className="text-[10px] font-semibold text-[#888D84]">{suffix}</span> : null}</div><span className="text-[9px] leading-4 text-[#999D95]">{hint}</span></label>;
}
function ReceiptSection({ title, icon: Icon, empty, children }: { title: string; icon: typeof Package; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="border-b border-black/[.08] py-5 first:pt-0"><div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#EFEEE9]"><Icon className="h-3.5 w-3.5 text-[#676D63]"/></span><h3 className="text-[10px] font-semibold text-[#62675F]">{title}</h3></div>{hasChildren ? children : <p className="text-xs text-black/35">{empty}</p>}</section>;
}
function ReceiptRow({ label, value, muted = false, strong = false }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? 'mt-2 border-t border-black/10 pt-4' : ''}`}><span className={`${strong ? 'text-sm font-semibold' : 'text-[10px]'} ${muted ? 'text-black/42' : ''}`}>{label}</span><span className={`${strong ? 'text-xl font-semibold tracking-[-.035em] sm:text-2xl' : 'text-xs font-semibold'} text-right`}>{value}</span></div>;
}
function FormField({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="flex items-center gap-2 text-[9px] font-medium text-white/44"><Icon className="h-3.5 w-3.5 text-[#DDA447]"/>{label}</span>{children}</label>;
}
