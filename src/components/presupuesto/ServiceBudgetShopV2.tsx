'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
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
  Send,
  ShoppingBag,
  Sparkles,
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
  if (service.unit === 'ml') return 'Metros lineales totales';
  return 'Cantidad total';
}
function directHint(service: BudgetService) {
  if (service.unit === 'm²') return 'Si ya conoces los m², ingrésalos directamente.';
  if (service.unit === 'm³') return 'Si ya conoces el volumen, ingrésalo directamente.';
  if (service.unit === 'ml') return 'Si ya mediste el recorrido, ingresa los metros lineales.';
  return 'Ingresa la cantidad de puntos o unidades.';
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
    <div className="bg-[#F6F2EB] text-[#0B0C0E]">
      <style>{`@media print{body *{visibility:hidden!important}.sf-budget-receipt,.sf-budget-receipt *{visibility:visible!important}.sf-budget-receipt{position:absolute!important;inset:0 auto auto 0!important;width:100%!important;max-width:none!important;box-shadow:none!important}.sf-budget-no-print{display:none!important}}`}</style>

      <section className="relative isolate overflow-hidden bg-[#0B0C0E] px-4 pb-16 pt-24 text-[#F7F4EE] sm:px-6 lg:px-8 lg:pb-20 lg:pt-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(242,140,40,.18),transparent_28rem),radial-gradient(circle_at_88%_72%,rgba(197,150,76,.09),transparent_24rem)]" />
        <div className="relative mx-auto max-w-[1320px]">
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F5A13D]">Panel de presupuesto Fabrick</p>
          <div className="mt-4 grid gap-9 lg:grid-cols-[1fr_.72fr] lg:items-end">
            <div>
              <h1 className="max-w-[12ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl lg:text-7xl">Elige, calcula y arma un presupuesto que se entienda.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/52 sm:text-base">Cada servicio usa la unidad que realmente corresponde: m², m³, metros lineales, puntos o unidades. Puedes calcular desde tus medidas o ingresar directamente el total que ya conoces.</p>
            </div>
            <div className="rounded-[1.6rem] border border-white/[.08] bg-white/[.035] p-5 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5A13D]">Proyecto actual · {reference}</p>
              <p className="mt-3 text-3xl font-black tracking-[-.04em]">{items.length ? rangeText(totals.low, totals.high) : 'Aún sin partidas'}</p>
              <p className="mt-2 text-xs leading-5 text-white/38">{serviceItems.length} servicios · {productItems.length} productos seleccionados · valores referenciales con IVA contenido.</p>
            </div>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-[1.4rem] border border-white/[.08] bg-white/[.08] sm:grid-cols-3">
            <FlowStep icon={ClipboardList} number="01" title="Elige la partida" text="Busca el servicio por área y revisa cómo se cobra." />
            <FlowStep icon={Calculator} number="02" title="Ingresa medidas" text="Calcula dimensiones o escribe directamente el total." />
            <FlowStep icon={ReceiptText} number="03" title="Confirma tu boleta" text="Agrega productos, completa tus datos y recibe una copia." />
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
          <header className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#B96A16]">Catálogo de servicios</p><h2 className="mt-3 max-w-[12ch] text-4xl font-black leading-[.96] tracking-[-.05em] sm:text-5xl">¿Qué quieres calcular?</h2></div>
            <p className="max-w-2xl text-sm leading-7 text-[#655D55]">Cada tarjeta muestra la unidad de cobro y separa <b className="text-[#211E1A]">solo ejecución</b> de <b className="text-[#211E1A]">trabajo vendido</b>, para que no compares conceptos distintos.</p>
          </header>

          <div className="mt-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => chooseCategory('Todas')} className={`shrink-0 rounded-full px-4 py-2.5 text-[10px] font-black ${category === 'Todas' ? 'bg-[#0B0C0E] text-[#F5A13D]' : 'border border-black/[.08] bg-white text-[#665D54]'}`}>Todas <span className="opacity-45">{BUDGET_SERVICES.length}</span></button>
            {SERVICE_CATEGORIES.map((item) => <button key={item} type="button" onClick={() => chooseCategory(item)} className={`shrink-0 rounded-full px-4 py-2.5 text-[10px] font-black ${category === item ? 'bg-[#0B0C0E] text-[#F5A13D]' : 'border border-black/[.08] bg-white text-[#665D54]'}`}>{item} <span className="opacity-45">{categoryCounts[item]}</span></button>)}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleServices.map((item) => {
              const ItemIcon = item.icon;
              const active = item.id === service.id;
              const inBudget = serviceItems.some((line) => metaString(line, 'serviceId') === item.id);
              return (
                <button key={item.id} type="button" onClick={() => chooseService(item)} className={`group min-h-[210px] rounded-[1.55rem] border p-5 text-left transition duration-200 ${active ? 'border-[#0B0C0E] bg-[#0B0C0E] text-white shadow-[0_18px_45px_rgba(0,0,0,.12)]' : 'border-black/[.055] bg-white hover:-translate-y-0.5 hover:border-[#F28C28]/25'}`}>
                  <div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 place-items-center rounded-xl ${active ? 'bg-[#F5A13D] text-black' : 'bg-[#F3EEE7] text-[#B96A16]'}`}><ItemIcon className="h-5 w-5" /></span><span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.11em] opacity-45">{inBudget ? <Check className="h-3 w-3 text-emerald-500" /> : null}/{item.unit}</span></div>
                  <p className={`mt-4 text-[8px] font-black uppercase tracking-[.13em] ${active ? 'text-[#F5A13D]' : 'text-[#A6651D]'}`}>{item.category}</p>
                  <h3 className="mt-1.5 text-base font-black tracking-[-.025em]">{item.short}</h3>
                  <p className={`mt-2 line-clamp-2 text-[11px] leading-5 ${active ? 'text-white/45' : 'text-black/45'}`}>{item.description}</p>
                  <div className={`mt-4 border-t pt-3 text-[9px] leading-5 ${active ? 'border-white/10' : 'border-black/[.06]'}`}><b>{money(item.laborMin)}–{money(item.laborMax)}</b> mano de obra<br/><span className={active ? 'text-[#F5C17A]' : 'text-[#8C591C]'}><b>{money(item.marketMin)}–{money(item.marketMax)}</b> trabajo vendido</span></div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section ref={calculatorRef} className="scroll-mt-24 bg-[#ECE5DC] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,.68fr)] lg:items-start">
            <div className="rounded-[2rem] border border-black/[.055] bg-white p-5 shadow-[0_24px_70px_rgba(58,42,25,.07)] sm:p-7 lg:p-9">
              <div className="flex items-start gap-4 border-b border-black/[.07] pb-6"><span className="grid h-13 w-13 shrink-0 place-items-center rounded-[1rem] bg-[#0B0C0E] text-[#F5A13D]"><Icon className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96A16]">{service.category} · se cobra por {service.unit}</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">{service.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#655D55]">{service.description}</p></div></div>

              <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_.9fr]">
                <div>
                  {supportsDirect ? <div className="mb-5 grid grid-cols-2 gap-2 rounded-[1.25rem] bg-[#F3EEE7] p-2"><ModeButton active={entryMode === 'dimensions'} icon={Ruler} label="Calcular por medidas" onClick={() => setEntryMode('dimensions')} /><ModeButton active={entryMode === 'direct'} icon={CircleDollarSign} label={`Ingresar ${service.unit} total`} onClick={() => setEntryMode('direct')} /></div> : null}

                  {service.measurement === 'count' ? (
                    <NumberField label={directLabel(service)} hint={directHint(service)} value={values.quantity} step={1} onChange={(value) => updateValue('quantity', value)} />
                  ) : entryMode === 'direct' && supportsDirect ? (
                    <div className="rounded-[1.35rem] border border-[#F28C28]/20 bg-[#FFF8EC] p-5"><NumberField label={directLabel(service)} hint={directHint(service)} value={directQuantity} step={service.unit === 'm³' ? 0.1 : 0.5} onChange={setDirectQuantity} suffix={service.unit} />{service.measurement === 'slab' ? <div className="mt-4"><NumberField label="Espesor del radier" hint="Se usa para ajustar el rango aunque ingreses los m² directamente." value={values.height} step={0.01} onChange={(value) => updateValue('height', value)} suffix="m" /></div> : null}</div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <NumberField key={field.key} label={field.label} hint={field.hint} value={values[field.key]} step={field.step} onChange={(value) => updateValue(field.key, value)} />)}</div>
                  )}

                  <div className="mt-5 rounded-[1.35rem] bg-[#F6F2EC] p-5"><p className="text-[9px] font-black uppercase tracking-[.13em] text-[#A6651D]">Cómo se calculó</p><p className="mt-2 text-sm font-black">{measurement.formula}</p><p className="mt-1 text-xs leading-5 text-[#6B625A]">{measurement.detail}</p>{measurement.secondary ? <p className="mt-1 text-[10px] text-[#8C6B42]">{measurement.secondary}</p> : null}</div>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.14em] text-black/42">Modalidad de referencia</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-[1.3rem] bg-[#F0EBE4] p-2"><PriceModeButton active={priceMode === 'labor'} title="Mano de obra" text="Solo ejecución" onClick={() => setPriceMode('labor')} /><PriceModeButton active={priceMode === 'complete'} title="Trabajo vendido" text="Ejecución + base" onClick={() => setPriceMode('complete')} /></div>
                  <p className="mt-3 flex gap-2 text-[10px] leading-5 text-black/45"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D8791E]" />{priceModeDescription(priceMode)}</p>
                  <div className="mt-5 grid gap-2"><RangeCard label="Mano de obra" low={laborLow} high={laborHigh} active={priceMode === 'labor'} /><RangeCard label="Trabajo vendido" low={completeLow} high={completeHigh} active={priceMode === 'complete'} /></div>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 border-t border-black/[.07] pt-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.13em] text-black/38">Seleccionado</p><p className="mt-1 text-2xl font-black tracking-[-.04em]">{rangeText(selectedLow, selectedHigh)}</p></div><button type="button" disabled={measurement.quantity <= 0} onClick={addCurrentService} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0B0C0E] px-6 text-xs font-black text-[#F5A13D] disabled:opacity-30">{addedId === service.id ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{addedId === service.id ? 'Actualizado en presupuesto' : 'Agregar al presupuesto'}</button></div>
            </div>

            <aside className="rounded-[1.8rem] bg-[#0B0C0E] p-5 text-white lg:sticky lg:top-24 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-[#F5A13D]">Resumen en curso</p>
              <p className="mt-2 text-3xl font-black tracking-[-.045em]">{items.length ? rangeText(totals.low, totals.high) : money(0)}</p>
              <p className="mt-2 text-[10px] leading-5 text-white/38">{serviceItems.length} servicios · {productItems.length} productos. La diferencia entre modalidades queda visible en la boleta final.</p>
              <div className="mt-5 divide-y divide-white/[.08] border-y border-white/[.08]">{serviceItems.slice(-4).map((item) => { const range = lineRange(item); return <div key={item.id} className="py-3"><div className="flex justify-between gap-3"><span className="text-xs font-bold">{item.title}</span><span className="text-[10px] text-[#F5C17A]">{rangeText(range.low, range.high)}</span></div><p className="mt-1 text-[9px] text-white/32">{number(item.quantity)} {item.unit} · {lineMode(item) === 'labor' ? 'mano de obra' : 'trabajo vendido'}</p></div>; })}</div>
              <button type="button" onClick={() => { trackBudget('budget_receipt_viewed', { total_low: totals.low, total_high: totals.high }); receiptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F5A13D] px-5 text-xs font-black text-black">Ver boleta completa <ChevronRight className="h-4 w-4" /></button>
            </aside>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
          <header className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#B96A16]">Productos e insumos</p><h2 className="mt-3 max-w-[12ch] text-4xl font-black leading-[.96] tracking-[-.05em] sm:text-5xl">Completa el proyecto sin mezclar conceptos.</h2></div><div><p className="max-w-2xl text-sm leading-7 text-[#655D55]">Los productos se agregan como líneas independientes. Así la boleta distingue claramente el costo del servicio de los materiales o equipos seleccionados.</p><label className="mt-4 flex max-w-md items-center gap-2 rounded-full border border-black/[.08] bg-white px-4 py-3"><Search className="h-4 w-4 text-[#B96A16]"/><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar producto o categoría" className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label></div></header>

          <div className="-mx-4 mt-8 grid auto-cols-[minmax(250px,78vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
            {visibleProducts.map((product) => {
              const price = finalProductPrice(product);
              const current = productItems.find((item) => metaString(item, 'productId') === product.id);
              return <article key={product.id} className="overflow-hidden rounded-[1.5rem] border border-black/[.055] bg-white p-2.5"><div className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem] bg-[#F3EEE7]">{product.img ? <img src={product.img} alt={displayProductName(product.name)} loading="lazy" decoding="async" className="h-full w-full object-contain p-4"/> : <div className="grid h-full place-items-center"><Package className="h-8 w-8 text-black/20"/></div>}<span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.09em] text-[#82531D] backdrop-blur">{product.category}</span></div><div className="px-1 pb-1 pt-4"><h3 className="line-clamp-2 min-h-10 text-sm font-black leading-5">{displayProductName(product.name)}</h3><p className="mt-2 line-clamp-1 text-[10px] text-black/38">{product.tagline}</p><div className="mt-4 flex items-end justify-between gap-3 border-t border-black/[.06] pt-3"><div><b className="text-lg tracking-[-.03em]">{money(price)}</b><span className="block text-[8px] font-black uppercase tracking-[.09em] text-emerald-700">IVA incluido</span></div><button type="button" disabled={product.stock === 0} onClick={() => addProduct(product)} className="grid h-10 w-10 place-items-center rounded-full bg-[#0B0C0E] text-[#F5A13D] disabled:opacity-25" aria-label={`Agregar ${displayProductName(product.name)}`}>{current ? <span className="text-[10px] font-black">{number(current.quantity)}</span> : <Plus className="h-4 w-4"/>}</button></div></div></article>;
            })}
          </div>
        </div>
      </section>

      <section ref={receiptRef} className="scroll-mt-24 bg-[#171719] px-4 py-14 text-[#F7F4EE] sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1320px]">
          <header className="grid gap-6 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F5A13D]">Boleta referencial</p><h2 className="mt-3 max-w-[12ch] text-4xl font-black leading-[.96] tracking-[-.05em] sm:text-5xl">Tu proyecto, separado partida por partida.</h2></div><p className="max-w-2xl text-sm leading-7 text-white/45">No es un documento tributario ni una cotización final. Es una referencia comercial para entender servicios, productos, modalidad de cobro y diferencia de valores antes de confirmar una visita.</p></header>

          <div className="mt-9 grid gap-5 xl:grid-cols-[1.12fr_.88fr] xl:items-start">
            <article className="sf-budget-receipt overflow-hidden rounded-[1.8rem] bg-[#F9F6F0] text-[#0B0C0E] shadow-[0_24px_65px_rgba(0,0,0,.22)]">
              <div className="flex items-start justify-between gap-4 bg-[#0B0C0E] p-5 text-white sm:p-7"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5A13D]">Soluciones Fabrick · presupuesto referencial</p><h3 className="mt-2 text-2xl font-black">Resumen del proyecto</h3><p className="mt-2 text-[9px] text-white/35">Referencia {reference}</p></div><span className="grid h-11 w-11 place-items-center rounded-full bg-[#F5A13D] text-black"><ReceiptText className="h-4 w-4" /></span></div>

              <div className="p-5 sm:p-7">
                <ReceiptSection title="Servicios" icon={Calculator} empty="Aún no agregas servicios.">
                  {serviceItems.map((item) => {
                    const range = lineRange(item); const alt = alternateRange(item); const mode = lineMode(item);
                    return <div key={item.id} className="border-b border-black/[.07] py-4 last:border-0"><div className="flex items-start justify-between gap-4"><div><span className={`inline-flex rounded-full px-2 py-1 text-[8px] font-black uppercase ${mode === 'labor' ? 'bg-black/[.06] text-black/55' : 'bg-[#F2DFBB] text-[#805112]'}`}>{mode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'}</span><h4 className="mt-2 text-sm font-black">{item.title}</h4><p className="mt-1 text-[10px] text-black/42">{number(item.quantity)} {item.unit} · {metaString(item, 'formula')}</p></div><button type="button" onClick={() => removeItem(item.id)} className="sf-budget-no-print text-red-700" aria-label={`Quitar ${item.title}`}><Trash2 className="h-4 w-4"/></button></div><div className="mt-3 flex items-end justify-between gap-4"><div><b className="text-base">{rangeText(range.low, range.high)}</b><p className="mt-1 text-[9px] text-black/38">Alternativa {alt.mode === 'labor' ? 'mano de obra' : 'trabajo vendido'}: {rangeText(alt.low, alt.high)}</p></div><button type="button" onClick={() => editItem(item)} className="sf-budget-no-print text-[9px] font-black uppercase text-[#A6651D]">Editar</button></div></div>;
                  })}
                </ReceiptSection>

                <ReceiptSection title="Productos / insumos" icon={Package} empty="No agregaste productos al presupuesto.">
                  {productItems.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-black/[.07] py-4 last:border-0">{item.image ? <img src={item.image} alt="" className="h-12 w-12 rounded-xl bg-[#F1ECE5] object-contain p-1.5"/> : <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#F1ECE5]"><Package className="h-4 w-4"/></span>}<div className="min-w-0 flex-1"><h4 className="truncate text-xs font-black">{item.title}</h4><p className="mt-1 text-[9px] text-black/38">{money(item.refPrice || 0)} c/u</p><div className="sf-budget-no-print mt-2 inline-flex items-center gap-3 rounded-full border border-black/10 px-2 py-1"><button type="button" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}><Minus className="h-3 w-3"/></button><b className="text-[10px]">{number(item.quantity)}</b><button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3"/></button></div></div><div className="text-right"><b className="text-sm">{money((item.refPrice || 0) * item.quantity)}</b><button type="button" onClick={() => removeItem(item.id)} className="sf-budget-no-print mt-2 ml-auto block text-red-700"><Trash2 className="h-3.5 w-3.5"/></button></div></div>)}
                </ReceiptSection>

                {!items.length ? <div className="py-8 text-center"><ShoppingBag className="mx-auto h-8 w-8 text-black/18"/><p className="mt-3 font-black">Tu presupuesto está vacío.</p><p className="mt-1 text-xs text-black/40">Agrega una partida o producto para generar la referencia.</p></div> : null}

                <div className="mt-5 border-t border-black/10 pt-5"><ReceiptRow label="Servicios" value={rangeText(serviceTotals.low, serviceTotals.high)} muted /><ReceiptRow label="Productos" value={money(productTotal)} muted /><ReceiptRow label="Neto contenido" value={rangeText(taxLow.net, taxHigh.net)} muted /><ReceiptRow label="IVA 19% contenido" value={rangeText(taxLow.iva, taxHigh.iva)} muted /><ReceiptRow label="Total referencial" value={rangeText(totals.low, totals.high)} strong /><p className="mt-3 text-[9px] leading-4 text-black/38">Los productos tienen precio publicado. Los servicios conservan un rango porque el valor final depende de terreno, acceso, estado actual, terminaciones y alcance confirmado.</p></div>
                <div className="sf-budget-no-print mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={!items.length} onClick={() => window.print()} className="min-h-11 rounded-full border border-black/12 text-[10px] font-black disabled:opacity-30">Guardar PDF</button><button type="button" disabled={!items.length} onClick={() => { clear(); setSubmission(null); }} className="min-h-11 rounded-full border border-black/12 text-[10px] font-black text-red-700 disabled:opacity-30">Vaciar</button></div>
              </div>
            </article>

            <section ref={formRef} className="scroll-mt-24 rounded-[1.8rem] border border-white/[.08] bg-white/[.035] p-5 sm:p-7 xl:sticky xl:top-24">
              <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F5A13D]">Confirmar presupuesto</p>
              <h3 className="mt-2 text-2xl font-black tracking-[-.035em]">Recibe una copia y conversemos sobre el proyecto.</h3>
              <p className="mt-3 text-xs leading-6 text-white/42">Completa tus datos una sola vez. Al confirmar registramos la solicitud, enviamos la copia del presupuesto a tu correo y avisamos al equipo Fabrick.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2"><FormField icon={UserRound} label="Nombre completo *"><input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre y apellido" className="sf-input"/></FormField><FormField icon={Mail} label="Correo *"><input type="email" value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="tu@email.cl" className="sf-input"/></FormField><FormField icon={Phone} label="Teléfono"><input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="+56 9 ..." className="sf-input"/></FormField><FormField icon={MapPin} label="Comuna / ciudad"><input value={customer.place} onChange={(event) => setCustomer((current) => ({ ...current, place: event.target.value }))} placeholder="Ej. Linares" className="sf-input"/></FormField></div>
              <label className="mt-4 grid gap-2"><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.11em] text-white/42"><FileText className="h-3.5 w-3.5 text-[#F5A13D]"/>Detalles del proyecto</span><textarea value={customer.note} onChange={(event) => setCustomer((current) => ({ ...current, note: event.target.value }))} rows={4} placeholder="Estado actual, fecha ideal, dudas, referencias…" className="resize-none rounded-[1.1rem] border border-white/[.09] bg-black/25 px-4 py-3 text-xs leading-6 text-white outline-none placeholder:text-white/22 focus:border-[#F5A13D]/40"/></label>

              <style>{`.sf-input{width:100%;border-radius:.9rem;border:1px solid rgba(255,255,255,.09);background:rgba(0,0,0,.25);padding:.75rem .9rem;font-size:.75rem;color:white;outline:none}.sf-input::placeholder{color:rgba(255,255,255,.22)}.sf-input:focus{border-color:rgba(245,161,61,.4)}`}</style>

              {submitError ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[.08] px-4 py-3 text-xs leading-5 text-red-200">{submitError}</div> : null}
              {submission ? <div className="mt-4 rounded-[1.15rem] border border-emerald-300/20 bg-emerald-300/[.07] p-4"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-300 text-black"><Check className="h-4 w-4"/></span><div><b className="text-sm">Presupuesto registrado</b><p className="mt-1 text-[10px] leading-5 text-white/46">Folio {submission.quoteId.slice(0, 8).toUpperCase()}. {submission.customerNotified ? 'La copia fue enviada al correo indicado.' : 'La solicitud quedó guardada y el equipo podrá revisarla.'}</p></div></div></div> : null}

              <div className="mt-5 grid gap-2"><button type="button" disabled={!items.length || Boolean(sending)} onClick={() => void submitBudget('email')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F5A13D] px-5 text-xs font-black text-black disabled:opacity-30"><Mail className="h-4 w-4"/>{sending === 'email' ? 'Enviando…' : 'Confirmar y recibir por correo'}</button><button type="button" disabled={!items.length || Boolean(sending)} onClick={() => void submitBudget('whatsapp')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/[.12] bg-white/[.035] px-5 text-xs font-black text-white disabled:opacity-30"><MessageCircle className="h-4 w-4 text-[#F5A13D]"/>{sending === 'whatsapp' ? 'Registrando…' : 'Confirmar y continuar por WhatsApp'}</button></div>
              <p className="mt-4 flex gap-2 text-[9px] leading-5 text-white/28"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F5A13D]"/>El presupuesto es referencial. El valor final se confirma después de revisar alcance, condiciones del lugar y especificaciones del trabajo.</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function FlowStep({ icon: Icon, number: step, title, text }: { icon: typeof ClipboardList; number: string; title: string; text: string }) {
  return <div className="bg-[#111214] p-5 sm:p-6"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5A13D]/12 text-[#F5A13D]"><Icon className="h-4 w-4"/></span><span className="text-[9px] font-black text-white/20">{step}</span></div><b className="mt-4 block text-sm">{title}</b><p className="mt-2 text-[10px] leading-5 text-white/38">{text}</p></div>;
}
function ModeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Ruler; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-11 items-center justify-center gap-2 rounded-[.9rem] px-3 text-[10px] font-black transition ${active ? 'bg-[#0B0C0E] text-[#F5A13D]' : 'text-[#6B625A]'}`}><Icon className="h-3.5 w-3.5"/>{label}</button>;
}
function PriceModeButton({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-[1rem] px-3 py-3 text-left transition ${active ? 'bg-white shadow-sm ring-1 ring-black/[.04]' : 'text-black/48'}`}><b className="block text-[10px]">{title}</b><span className="mt-1 block text-[8px] opacity-55">{text}</span></button>;
}
function RangeCard({ label, low, high, active }: { label: string; low: number; high: number; active: boolean }) {
  return <div className={`rounded-[1.15rem] border p-4 ${active ? 'border-[#F28C28]/25 bg-[#FFF8EE]' : 'border-black/[.055] bg-[#F7F3EE]'}`}><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[.1em] text-black/42">{label}</span>{active ? <Check className="h-3.5 w-3.5 text-[#B96A16]"/> : null}</div><b className="mt-2 block text-lg tracking-[-.03em]">{rangeText(low, high)}</b></div>;
}
function NumberField({ label, hint, value, step, suffix, onChange }: { label: string; hint: string; value: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="grid gap-2"><span className="text-[9px] font-black uppercase tracking-[.1em] text-black/48">{label}</span><div className="flex items-center rounded-[1rem] border border-black/[.08] bg-white px-3"><input type="number" min="0" step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-h-12 min-w-0 flex-1 bg-transparent text-base font-black outline-none"/>{suffix ? <span className="text-[10px] font-black text-black/35">{suffix}</span> : null}</div><span className="text-[9px] leading-4 text-black/35">{hint}</span></label>;
}
function ReceiptSection({ title, icon: Icon, empty, children }: { title: string; icon: typeof Package; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <section className="border-b border-black/[.08] py-5 first:pt-0"><div className="mb-3 flex items-center gap-2"><Icon className="h-4 w-4 text-[#B96A16]"/><h3 className="text-[9px] font-black uppercase tracking-[.14em] text-black/45">{title}</h3></div>{hasChildren ? children : <p className="text-xs text-black/35">{empty}</p>}</section>;
}
function ReceiptRow({ label, value, muted = false, strong = false }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return <div className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? 'mt-2 border-t border-black/10 pt-4' : ''}`}><span className={`${strong ? 'text-sm font-black' : 'text-[10px]'} ${muted ? 'text-black/40' : ''}`}>{label}</span><span className={`${strong ? 'text-2xl font-black tracking-[-.04em]' : 'text-xs font-bold'} text-right`}>{value}</span></div>;
}
function FormField({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.11em] text-white/42"><Icon className="h-3.5 w-3.5 text-[#F5A13D]"/>{label}</span>{children}</label>;
}
