'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Home,
  Leaf,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  ThermometerSnowflake,
  Truck,
  User,
  Users,
  Volume2,
  Zap,
} from 'lucide-react';
import { CART_SESSION_KEY } from '@/context/CartContext';
import { calculateCheckoutSummary, type LineItem } from '@/lib/checkout';
import { DEFAULT_SHIPPING_CONFIG, getRegionRate } from '@/lib/shipping';
import type { Product } from '@/hooks/useRealtimeProducts';

type AirProduct = Product & {
  description?: string | null;
  category?: string | null;
  specifications?: unknown;
  energy_efficiency?: string | null;
  btu?: number | null;
};
type Item = { product: AirProduct; quantity: number };
type PayState = 'idle' | 'creating' | 'pending' | 'approved' | 'failed' | 'abandoned';
type DocumentType = 'boleta' | 'factura';
type StatusPayload = { state: 'approved' | 'failed' | 'refunded' | 'abandoned' | 'pending'; status: string; paymentStatus: string; total: number; iva: number; despacho: number };
type CheckoutResponse = { data?: { id?: string }; payment?: { checkoutUrl?: string | null }; error?: string; validationErrors?: Array<{ message?: string }> };
type Capacity = 9000 | 12000 | 18000 | 24000;

const PENDING_KEY = 'sf-pending-payment-order';
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const discounted = (item: Item) => Math.round(item.product.price * (1 - Number(item.product.discount_percentage || 0) / 100));
const REGION_OPTIONS = DEFAULT_SHIPPING_CONFIG.rates.map((rate) => ({ value: rate.region, label: rate.label }));
const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const CHECKOUT_BG = `${CLOUD}/c_fill,g_auto,w_1920,h_1200/e_blur:6/q_auto:good/f_auto/v1788671813/air-bedroom-background.jpg`;
const AIR_VISUALS: Record<Capacity, string> = {
  9000: `${CLOUD}/f_png/q_auto:best/v1788676759/air-9k-universal-v8.png`,
  12000: `${CLOUD}/f_png/q_auto:best/v1788676769/air-12k-universal-v8.png`,
  18000: `${CLOUD}/f_auto/q_auto:best/v1788674152/air-18k-v7.png`,
  24000: `${CLOUD}/f_auto/q_auto:best/v1788674161/air-24k-v7.png`,
};
const STATE_ASSETS = {
  processing: `${CLOUD}/f_auto/q_auto:good/v1788676838/payment-processing-v8.png`,
  approved: `${CLOUD}/f_auto/q_auto:good/v1788676801/payment-approved-v8.png`,
  rejected: `${CLOUD}/f_auto/q_auto:good/v1788676857/payment-rejected-v8.png`,
  abandoned: `${CLOUD}/f_auto/q_auto:good/v1788676877/payment-abandoned-v8.png`,
  secure: `${CLOUD}/f_auto/q_auto:good/v1788676897/payment-secure-v8.png`,
};

function airText(product?: AirProduct) {
  if (!product) return '';
  const specs = typeof product.specifications === 'string'
    ? product.specifications
    : product.specifications ? JSON.stringify(product.specifications) : '';
  return `${product.name || ''} ${product.description || ''} ${product.category || ''} ${specs}`;
}
function isAirProduct(product?: AirProduct) {
  return /aire\s*acond|air\s*condition|split|(?:9|12|18|24)[., ]?000\s*btu|\bbtu\b/i.test(airText(product));
}
function getCapacity(product?: AirProduct): Capacity {
  const text = airText(product);
  const explicit = Number(product?.btu || 0);
  const match = text.match(/(9000|12000|18000|24000)|(?:9|12|18|24)[., ]?000\s*btu/i);
  const raw = explicit || Number(match?.[1] || String(match?.[0] || '').replace(/\D/g, ''));
  if (raw <= 9500) return 9000;
  if (raw <= 13000) return 12000;
  if (raw <= 19000) return 18000;
  return 24000;
}
function airMeta(cap: Capacity) {
  if (cap === 9000) return { people: '1–2', coverage: '12–16 m²', width: '≈ 70 cm' };
  if (cap === 12000) return { people: '2–3', coverage: '18–24 m²', width: '≈ 82 cm' };
  if (cap === 18000) return { people: '3–4', coverage: '25–34 m²', width: '≈ 96 cm' };
  return { people: '4–6', coverage: '35–45 m²', width: '≈ 109 cm' };
}
function parseEnergy(product?: AirProduct) {
  const direct = String(product?.energy_efficiency || '').trim();
  if (direct) return direct;
  return airText(product).match(/\bA\+{0,3}\b/i)?.[0]?.toUpperCase() || '—';
}

export default function CheckoutAppV2() {
  const search = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('VII');
  const [documentType, setDocumentType] = useState<DocumentType>('boleta');
  const [taxRut, setTaxRut] = useState('');
  const [taxBusinessName, setTaxBusinessName] = useState('');
  const [taxGiro, setTaxGiro] = useState('');
  const [taxAddress, setTaxAddress] = useState('');
  const [taxCommune, setTaxCommune] = useState('');
  const [state, setState] = useState<PayState>('idle');
  const [orderId, setOrderId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState('');
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) as Item[] : [];
      if (parsed.length) {
        setItems(parsed);
      } else if (search.get('productId')) {
        setItems([{ product: {
          id: search.get('productId')!,
          name: search.get('name') || 'Producto',
          price: Number(search.get('price') || 0),
          image_url: search.get('img') || undefined,
        } as AirProduct, quantity: Math.max(1, Number(search.get('quantity') || 1)) }]);
      }
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending) {
        setOrderId(pending);
        setState('pending');
      }
    } catch {}
    setHydrated(true);
  }, [search]);

  const lines = useMemo<LineItem[]>(() => items.map((item) => ({
    productoId: item.product.id,
    cantidad: item.quantity,
    precioUnitario: discounted(item),
    nombre: item.product.name,
    shippingMode: item.product.shipping_mode ?? null,
    shippingFee: item.product.shipping_fee ?? null,
    shippingWeightKg: item.product.shipping_weight_kg ?? null,
    shippingDimensions: item.product.shipping_dimensions ?? null,
    shippingRegionOverrides: item.product.shipping_region_overrides ?? null,
  })), [items]);

  const summary = useMemo(() => calculateCheckoutSummary(lines, region), [lines, region]);
  const regionRate = useMemo(() => getRegionRate(region), [region]);
  const contactChecks = [name.trim().length > 2, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), phone.replace(/\D/g, '').length >= 8];
  const deliveryChecks = [commune.trim().length > 2, address.trim().length > 5];
  const invoiceChecks = documentType === 'boleta' ? [true] : [
    /^\d{7,8}-[0-9kK]$/.test(taxRut.replace(/\./g, '').trim()),
    taxBusinessName.trim().length > 1,
    taxGiro.trim().length > 1,
    taxAddress.trim().length > 4,
    taxCommune.trim().length > 1,
  ];
  const contactReady = contactChecks.every(Boolean);
  const deliveryReady = deliveryChecks.every(Boolean);
  const billingReady = invoiceChecks.every(Boolean);
  const activeStep = !contactReady ? 0 : !deliveryReady ? 1 : 2;
  const valid = items.length > 0 && contactReady && deliveryReady && billingReady;
  const shippingAddress = [address.trim(), commune.trim()].filter(Boolean).join(', ');
  const unitCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const featuredItem = useMemo(() => items.find((item) => isAirProduct(item.product)) || items[0], [items]);
  const isAir = Boolean(featuredItem && isAirProduct(featuredItem.product));
  const cap = getCapacity(featuredItem?.product);
  const meta = airMeta(cap);
  const productVisual = isAir ? AIR_VISUALS[cap] : (featuredItem?.product.image_url || '/images/landing/fabrick-home-showcase.webp');
  const energy = parseEnergy(featuredItem?.product);
  const inverter = /inverter/i.test(airText(featuredItem?.product));

  useEffect(() => {
    if (!orderId || state === 'approved' || state === 'failed') return;
    let active = true;
    async function check() {
      try {
        const response = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json() as StatusPayload;
        if (!active) return;
        setStatus(data);
        if (data.state === 'approved') {
          setState('approved');
          sessionStorage.removeItem(PENDING_KEY);
          sessionStorage.removeItem(CART_SESSION_KEY);
        } else if (data.state === 'failed' || data.state === 'refunded') {
          setState('failed');
          sessionStorage.removeItem(PENDING_KEY);
        } else if (data.state === 'abandoned') {
          setState('abandoned');
        } else {
          setState('pending');
        }
      } catch {}
    }
    void check();
    poll.current = setInterval(check, 2200);
    return () => {
      active = false;
      if (poll.current) clearInterval(poll.current);
    };
  }, [orderId, state]);

  async function pay() {
    if (!valid || state === 'creating') {
      setError(documentType === 'factura' && !billingReady ? 'Completa los datos tributarios de la factura.' : 'Completa contacto, comuna y dirección para continuar.');
      return;
    }
    setError('');
    setState('creating');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines,
          region,
          shippingAddress,
          cliente: { nombre: name, email, telefono: phone },
          billing: documentType === 'factura'
            ? { documentType, rut: taxRut, razonSocial: taxBusinessName, giro: taxGiro, direccion: taxAddress, comuna: taxCommune }
            : { documentType: 'boleta' },
          paymentMethod: 'mercadopago',
          clientOrderKey: `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        }),
      });
      const payload = await response.json() as CheckoutResponse;
      if (!response.ok || !payload?.data?.id) {
        const detail = payload.validationErrors?.map((item) => item.message).filter(Boolean).join(' ') || '';
        throw new Error([payload.error || 'No se pudo iniciar el pago.', detail].filter(Boolean).join(' '));
      }
      const id = String(payload.data.id);
      const url = String(payload.payment?.checkoutUrl || '');
      setOrderId(id);
      setPaymentUrl(url);
      sessionStorage.setItem(PENDING_KEY, id);
      setState('pending');
      if (url) window.location.assign(url);
    } catch (checkoutError) {
      setState('idle');
      setError(checkoutError instanceof Error ? checkoutError.message : 'No se pudo iniciar el pago.');
    }
  }

  if (!hydrated) {
    return <ImmersiveShell><div className="grid min-h-screen place-items-center"><img src={STATE_ASSETS.processing} alt="" className="h-40 w-40 object-contain" /></div></ImmersiveShell>;
  }

  if (['pending', 'abandoned', 'approved', 'failed'].includes(state)) {
    const ok = state === 'approved';
    const fail = state === 'failed';
    const abandoned = state === 'abandoned';
    const asset = ok ? STATE_ASSETS.approved : fail ? STATE_ASSETS.rejected : abandoned ? STATE_ASSETS.abandoned : STATE_ASSETS.processing;
    return <StatusView asset={asset} orderId={orderId} title={ok ? 'Compra confirmada' : fail ? 'Pago no aprobado' : abandoned ? 'Pago sin finalizar' : 'Confirmando tu pago'} eyebrow={ok ? 'Pago aprobado' : fail ? 'Revisa tu medio de pago' : abandoned ? 'Orden guardada' : 'Verificación segura'} description={ok ? 'El pago fue confirmado. Tu pedido continúa a preparación y coordinación de entrega.' : fail ? 'Puedes volver a intentar el pago sin duplicar la compra.' : abandoned ? 'La orden sigue identificada y puedes retomar el pago cuando quieras.' : 'Estamos consultando automáticamente la confirmación de Mercado Pago.'} total={status?.total || summary.total} iva={status?.iva || summary.iva} shipping={status?.despacho || summary.despacho} paymentUrl={paymentUrl} approved={ok} failed={fail} productVisual={productVisual} />;
  }

  if (!items.length) {
    return <ImmersiveShell><section className="mx-auto grid min-h-screen max-w-xl place-items-center px-5 text-center"><div className="rounded-[2rem] border border-white/12 bg-black/55 p-8 backdrop-blur-2xl"><ShoppingBag className="mx-auto h-10 w-10 text-[#F58B24]" /><h1 className="mt-4 text-3xl font-black">Tu carrito está vacío</h1><p className="mt-3 text-sm text-white/48">Agrega productos desde la tienda antes de iniciar el pago.</p><a href="/tienda" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#F58B24] px-6 font-black text-[#111214]">Ir a la tienda</a></div></section></ImmersiveShell>;
  }

  return <ImmersiveShell>
    {state === 'creating' ? <div className="fixed inset-0 z-[100] grid place-items-center bg-[#090909]/90 px-5 backdrop-blur-xl"><div className="text-center"><img src={STATE_ASSETS.processing} alt="" className="mx-auto h-44 w-44 object-contain" /><p className="mt-3 text-[10px] font-black uppercase tracking-[.2em] text-[#F7A347]">Creando orden segura</p><h2 className="mt-2 text-2xl font-black">Preparando Mercado Pago…</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-white/45">No cierres esta ventana. No almacenamos los datos de tu tarjeta.</p></div></div> : null}

    <header className="relative z-30 border-b border-white/10 bg-[#0c0d0f]/78 px-4 py-3 backdrop-blur-2xl"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><a href="/tienda" className="flex items-center gap-3"><img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-11 w-auto max-w-[190px] object-contain sm:max-w-[240px]" /></a><div className="hidden items-center gap-2 md:flex">{['Carrito','Datos','Pago','Confirmación'].map((label,index)=><div key={label} className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full border text-[9px] font-black ${index <= Math.min(2, activeStep + 1) ? 'border-[#F58B24] bg-[#F58B24]/14 text-[#FFC27A]' : 'border-white/15 text-white/35'}`}>{index + 1}</span><span className="text-[9px] font-bold text-white/48">{label}</span>{index < 3 ? <i className="h-px w-6 bg-white/12" /> : null}</div>)}</div><div className="flex items-center gap-2 text-[9px] font-bold text-white/50"><LockKeyhole className="h-4 w-4 text-emerald-400"/><span className="hidden sm:inline">Compra segura</span></div></div></header>

    <main className="relative z-10 mx-auto grid min-h-[calc(100svh-70px)] max-w-[1500px] gap-5 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(390px,.85fr)] lg:items-start lg:px-7 lg:py-6">
      <section className="relative min-h-[470px] overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 p-4 shadow-[0_35px_100px_rgba(0,0,0,.32)] sm:min-h-[620px] sm:p-7 lg:sticky lg:top-5 lg:min-h-[760px]"><div className="pointer-events-none absolute left-1/2 top-[31%] h-[330px] w-[80%] -translate-x-1/2 rounded-full bg-[#57C9FF]/12 blur-[100px]"/><div className="relative z-10 flex items-start justify-between gap-3"><a href="/tienda" className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/58 backdrop-blur-xl"><ArrowLeft size={14}/> Volver</a><span className="rounded-full border border-white/12 bg-black/35 px-3 py-2 text-[9px] font-black text-[#FFC27A] backdrop-blur-xl">{isAir ? `${cap.toLocaleString('es-CL')} BTU` : 'Compra Fabrick'}</span></div>
        <div className="relative z-10 mx-auto mt-8 max-w-[920px] text-center sm:mt-11"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F59A3B]">{isAir ? 'Confort todo el año' : 'Compra segura'}</p><h1 className="mx-auto mt-2 max-w-[13ch] text-3xl font-black leading-[.95] tracking-[-.05em] sm:text-5xl">{isAir ? 'Tu clima ideal, listo para llevar.' : 'Finaliza tu compra con seguridad.'}</h1><p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-white/48">{isAir ? 'Revisa capacidad, cobertura y datos reales antes de continuar al pago.' : 'Revisa los productos y completa los datos de entrega.'}</p></div>
        <div className="relative z-10 mx-auto mt-7 flex min-h-[210px] max-w-[950px] items-center justify-center sm:min-h-[310px]">{isAir ? <div className="pointer-events-none absolute bottom-[2%] left-1/2 h-[190px] w-[72%] -translate-x-1/2 overflow-hidden opacity-70">{Array.from({length:34}).map((_,i)=><i key={i} className="absolute top-0 rounded-full bg-[#69D8FF] shadow-[0_0_12px_#69D8FF]" style={{left:`${5+(i*29)%90}%`,width:2+(i%3),height:2+(i%3),animation:`checkoutParticle ${1.8+(i%6)*.16}s linear ${-(i%9)*.18}s infinite`}} />)}</div> : null}<img src={productVisual} alt={featuredItem?.product.name || 'Producto'} className={`relative z-10 max-h-[270px] w-full object-contain drop-shadow-[0_38px_48px_rgba(0,0,0,.5)] sm:max-h-[360px] ${isAir ? 'max-w-[900px]' : 'max-w-[520px]'}`} />{isAir ? <div className="absolute right-[14%] top-[30%] z-20 rounded-lg border border-[#72DBFF]/25 bg-[#07131A]/78 px-3 py-2 font-mono text-[#88E6FF] shadow-[0_0_25px_rgba(89,204,255,.18)] backdrop-blur-md"><b className="text-base">22°</b><span className="ml-2 text-[7px] tracking-[.15em]">COOL</span></div> : null}</div>
        {isAir ? <div className="relative z-20 mx-auto mt-1 grid max-w-[900px] grid-cols-3 gap-2 sm:grid-cols-6"><HeroMetric icon={<ThermometerSnowflake/>} value={`${cap/1000}K BTU`} label="capacidad"/><HeroMetric icon={<Leaf/>} value={inverter ? 'Inverter' : 'Estándar'} label="tecnología"/><HeroMetric icon={<Zap/>} value={energy} label="eficiencia"/><HeroMetric icon={<Users/>} value={meta.people} label="personas"/><HeroMetric icon={<Home/>} value={meta.coverage} label="cobertura"/><HeroMetric icon={<Volume2/>} value={meta.width} label="ancho ref."/></div> : null}
        <div className="relative z-20 mx-auto mt-5 max-w-[900px] rounded-[1.6rem] border border-white/10 bg-[#111317]/64 p-4 backdrop-blur-2xl sm:p-5"><div className="flex items-center gap-3"><img src="/brand/soluciones-fabrick-mobile.svg" alt="" className="h-10 w-auto max-w-[130px] object-contain"/><span className="h-8 w-px bg-white/12"/><p className="text-[9px] leading-4 text-white/42">Más que productos.<br/>Soluciones para tu hogar.</p></div><div className="mt-4 grid grid-cols-3 gap-px bg-white/8"><TrustDark icon={<ShieldCheck/>} title="Pago protegido"/><TrustDark icon={<PackageCheck/>} title="Orden trazable"/><TrustDark icon={<Truck/>} title="Despacho validado"/></div></div>
      </section>

      <section className="rounded-[2rem] border border-white/12 bg-[#101216]/88 p-4 shadow-[0_28px_90px_rgba(0,0,0,.38)] backdrop-blur-2xl sm:p-6 lg:sticky lg:top-5"><div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#F5A24A]">Resumen de compra</p><h2 className="mt-1 text-xl font-black">{unitCount} {unitCount===1?'producto':'productos'}</h2></div><a href="/tienda" className="text-[9px] font-black text-[#FFC27A]">Editar carrito</a></div>
        <div className="divide-y divide-white/8">{items.map((item)=>{const air=isAirProduct(item.product);const itemCap=getCapacity(item.product);const image=air?AIR_VISUALS[itemCap]:(item.product.image_url||'/images/landing/fabrick-home-showcase.webp');return <div key={item.product.id} className="flex items-center gap-3 py-4"><div className="grid h-16 w-20 shrink-0 place-items-center rounded-xl bg-white/[.94] p-1"><img src={image} alt="" className="max-h-14 w-full object-contain"/></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-black leading-4">{item.product.name}</p><p className="mt-1 text-[9px] text-white/38">Cantidad {item.quantity}{air?` · ${itemCap.toLocaleString('es-CL')} BTU`:''}</p></div><b className="text-xs">{CLP.format(discounted(item)*item.quantity)}</b></div>;})}</div>
        <div className="grid gap-3 border-t border-white/10 pt-4"><SectionTitle number="01" title="Tus datos" complete={contactReady}/><div className="grid gap-3 sm:grid-cols-2"><DarkField icon={<User/>} label="Nombre completo" value={name} set={setName} placeholder="Ej. Juan Pérez" ok={contactChecks[0]} autoComplete="name"/><DarkField icon={<Mail/>} label="Correo electrónico" value={email} set={setEmail} placeholder="tu@email.cl" ok={contactChecks[1]} type="email" autoComplete="email"/><DarkField icon={<Phone/>} label="Teléfono" value={phone} set={setPhone} placeholder="+56 9 1234 5678" ok={contactChecks[2]} type="tel" autoComplete="tel"/></div>
          <SectionTitle number="02" title="Entrega" complete={deliveryReady}/><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-[9px] font-bold text-white/52"><span>Región</span><select value={region} onChange={(event)=>setRegion(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-white/[.065] px-3 text-xs text-white outline-none focus:border-[#F58B24]">{REGION_OPTIONS.map((option)=><option className="bg-[#15171a]" key={option.value} value={option.value}>{option.label}</option>)}</select></label><DarkField icon={<MapPin/>} label="Comuna / ciudad" value={commune} set={setCommune} placeholder="Ej. Linares" ok={deliveryChecks[0]} autoComplete="address-level2"/></div><label className="grid gap-1.5 text-[9px] font-bold text-white/52"><span className="flex items-center">Dirección completa{deliveryChecks[1]?<Check className="ml-auto h-3.5 w-3.5 text-emerald-400"/>:null}</span><textarea value={address} onChange={(event)=>setAddress(event.target.value)} rows={2} autoComplete="street-address" placeholder="Calle, número, departamento/casa y referencia" className="resize-none rounded-xl border border-white/10 bg-white/[.065] p-3 text-xs text-white outline-none placeholder:text-white/22 focus:border-[#F58B24]"/></label><p className="text-[9px] text-white/34">Entrega referencial: {regionRate.eta}. La tarifa y el stock se validan nuevamente al crear la orden.</p>
          <SectionTitle number="03" title="Documento y pago" complete={billingReady}/><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>{setDocumentType('boleta');setError('')}} className={`rounded-xl border p-3 text-left ${documentType==='boleta'?'border-[#F58B24] bg-[#F58B24]/12':'border-white/10 bg-white/[.035]'}`}><ReceiptText className="h-4 w-4 text-[#F6A54E]"/><b className="mt-2 block text-xs">Boleta</b><span className="mt-1 block text-[8px] text-white/34">Consumidor final</span></button><button type="button" onClick={()=>{setDocumentType('factura');setError('')}} className={`rounded-xl border p-3 text-left ${documentType==='factura'?'border-[#F58B24] bg-[#F58B24]/12':'border-white/10 bg-white/[.035]'}`}><Building2 className="h-4 w-4 text-[#F6A54E]"/><b className="mt-2 block text-xs">Factura</b><span className="mt-1 block text-[8px] text-white/34">Empresa / actividad</span></button></div>
          {documentType==='factura'?<div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:grid-cols-2"><DarkField icon={<FileText/>} label="RUT empresa" value={taxRut} set={setTaxRut} placeholder="12345678-9" ok={invoiceChecks[0]}/><DarkField icon={<Building2/>} label="Razón social" value={taxBusinessName} set={setTaxBusinessName} placeholder="Empresa SpA" ok={invoiceChecks[1]}/><DarkField icon={<FileText/>} label="Giro" value={taxGiro} set={setTaxGiro} placeholder="Construcción / comercio" ok={invoiceChecks[2]}/><DarkField icon={<MapPin/>} label="Comuna tributaria" value={taxCommune} set={setTaxCommune} placeholder="Comuna" ok={invoiceChecks[4]}/><div className="sm:col-span-2"><DarkField icon={<MapPin/>} label="Dirección tributaria" value={taxAddress} set={setTaxAddress} placeholder="Calle y número" ok={invoiceChecks[3]}/></div></div>:null}
          <div className="flex items-center gap-3 rounded-2xl border border-[#F58B24]/30 bg-[#F58B24]/8 p-3"><img src={STATE_ASSETS.secure} alt="" className="h-11 w-11 object-contain"/><div><b className="text-xs">Mercado Pago</b><p className="mt-1 text-[9px] leading-4 text-white/38">La orden se registra antes de abrir la pasarela. Fabrick no almacena los datos de tu tarjeta.</p></div></div>
          {error?<p className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs font-bold leading-5 text-red-200">{error}</p>:null}
          <div className="space-y-2 border-t border-white/10 pt-4 text-xs"><SummaryRow label="Productos" value={CLP.format(summary.subtotal)}/><SummaryRow label="Despacho" value={summary.despacho?CLP.format(summary.despacho):'Gratis'}/><SummaryRow label="IVA incluido (19%)" value={CLP.format(summary.iva)} muted/><SummaryRow label="Documento" value={documentType==='factura'?'Factura':'Boleta'}/><div className="flex items-end justify-between border-t border-white/10 pt-3"><span className="font-bold">Total final</span><b className="text-3xl tracking-[-.05em] text-[#FF9A38]">{CLP.format(summary.total)}</b></div></div>
          <button disabled={!valid || state==='creating'} onClick={()=>void pay()} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#F58B24,#FF9F43)] px-4 font-black text-[#111214] shadow-[0_12px_40px_rgba(245,139,36,.22)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">{state==='creating'?<Loader2 className="animate-spin" size={19}/>:<CreditCard size={19}/>} {state==='creating'?'Preparando pago…':'Continuar a Mercado Pago'}<ChevronRight size={17}/></button>{!valid?<p className="text-center text-[9px] leading-4 text-white/30">Completa contacto, entrega y documento antes de continuar.</p>:<p className="text-center text-[9px] leading-4 text-white/30">El total ya incluye IVA. El servidor vuelve a verificar valores antes de crear la orden.</p>}
        </div>
      </section>
    </main>
  </ImmersiveShell>;
}

function ImmersiveShell({children}:{children:React.ReactNode}) { return <div className="relative min-h-screen overflow-x-hidden bg-[#08090a] text-white"><style>{`@keyframes checkoutParticle{0%{opacity:0;transform:translate3d(0,-10px,0) scale(.7)}18%{opacity:.9}100%{opacity:0;transform:translate3d(12px,170px,0) scale(1.25)}}@media (prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}}`}</style><div className="pointer-events-none fixed inset-0"><img src={CHECKOUT_BG} alt="" className="h-full w-full scale-[1.025] object-cover opacity-65"/><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,8,.72),rgba(8,9,10,.36)_48%,rgba(6,7,8,.78)),linear-gradient(180deg,rgba(5,6,7,.45),rgba(5,6,7,.72))]"/><div className="absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,.75)]"/></div>{children}</div>; }
function StatusView({asset,orderId,title,eyebrow,description,total,iva,shipping,paymentUrl,approved,failed,productVisual}:{asset:string;orderId:string;title:string;eyebrow:string;description:string;total:number;iva:number;shipping:number;paymentUrl:string;approved:boolean;failed:boolean;productVisual:string}) { return <ImmersiveShell><main className="relative z-10 mx-auto grid min-h-screen max-w-[1180px] place-items-center px-4 py-8"><section className="grid w-full overflow-hidden rounded-[2rem] border border-white/12 bg-[#101216]/88 shadow-[0_36px_120px_rgba(0,0,0,.48)] backdrop-blur-2xl md:grid-cols-[.9fr_1.1fr]"><div className="relative grid min-h-[330px] place-items-center overflow-hidden border-b border-white/10 p-6 md:min-h-[620px] md:border-b-0 md:border-r"><img src={productVisual} alt="" className="relative z-10 max-h-44 w-full max-w-[520px] object-contain drop-shadow-[0_30px_42px_rgba(0,0,0,.5)] md:max-h-64"/><div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F58B24]/10 blur-[90px]"/><img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="absolute left-5 top-5 h-10 w-auto max-w-[200px] object-contain"/></div><div className="p-6 text-center sm:p-9"><img src={asset} alt="" className="mx-auto h-32 w-32 object-contain sm:h-40 sm:w-40"/><p className={`mt-3 text-[9px] font-black uppercase tracking-[.2em] ${approved?'text-emerald-400':failed?'text-red-300':'text-[#FFC27A]'}`}>{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-[-.045em] sm:text-4xl">{title}</h1><p className="mx-auto mt-3 max-w-md text-xs leading-6 text-white/45">{description}</p><p className="mt-4 text-[9px] font-bold text-white/26">Orden {orderId || 'en proceso'}</p>{!approved && !failed?<span className="mt-4 inline-flex items-center gap-2 text-[9px] text-white/35"><RefreshCw className="h-3.5 w-3.5 animate-spin"/> Actualización automática</span>:null}<div className="mt-6 grid grid-cols-3 gap-2"><StateMetric label="Total" value={CLP.format(total)}/><StateMetric label="IVA incluido" value={CLP.format(iva)}/><StateMetric label="Despacho" value={CLP.format(shipping)}/></div><div className="mt-6 flex gap-2">{approved?<a href="/mi-cuenta" className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#F58B24] px-4 text-sm font-black text-[#111214]">Ver mi pedido</a>:<>{paymentUrl?<a href={paymentUrl} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#F58B24] px-4 text-sm font-black text-[#111214]">Retomar pago</a>:null}<a href="/tienda" className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/12 bg-white/[.05] px-4 text-sm font-black">Volver a tienda</a></>}</div></div></section></main></ImmersiveShell>; }
function HeroMetric({icon,value,label}:{icon:React.ReactNode;value:string;label:string}) { return <div className="rounded-[1.15rem] border border-white/10 bg-black/38 p-2.5 text-center backdrop-blur-xl"><span className="mx-auto block w-fit text-[#78DFFF] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-1.5 block truncate text-[10px] sm:text-xs">{value}</b><span className="mt-0.5 block text-[7px] text-white/28">{label}</span></div>; }
function TrustDark({icon,title}:{icon:React.ReactNode;title:string}) { return <div className="bg-black/22 p-2.5 text-center"><span className="mx-auto block w-fit text-[#F6A54E] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-1.5 block text-[8px] text-white/48">{title}</b></div>; }
function SectionTitle({number,title,complete}:{number:string;title:string;complete:boolean}) { return <div className="mt-1 flex items-center gap-2 border-t border-white/8 pt-3 first:border-0 first:pt-0"><span className="grid h-6 w-6 place-items-center rounded-full border border-[#F58B24]/45 bg-[#F58B24]/10 text-[8px] font-black text-[#FFC27A]">{complete?<Check size={12}/>:number}</span><b className="text-xs">{title}</b>{complete?<CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400"/>:null}</div>; }
function DarkField({icon,label,value,set,placeholder,ok,type='text',autoComplete}:{icon:React.ReactNode;label:string;value:string;set:(value:string)=>void;placeholder:string;ok:boolean;type?:string;autoComplete?:string}) { return <label className="grid gap-1.5 text-[9px] font-bold text-white/52"><span className="flex items-center gap-1.5"><span className="text-[#F6A54E] [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>{label}{ok?<Check className="ml-auto h-3.5 w-3.5 text-emerald-400"/>:null}</span><input type={type} value={value} onChange={(event)=>set(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="min-h-11 rounded-xl border border-white/10 bg-white/[.065] px-3 text-xs text-white outline-none placeholder:text-white/22 focus:border-[#F58B24]"/></label>; }
function SummaryRow({label,value,muted=false}:{label:string;value:string;muted?:boolean}) { return <div className={`flex justify-between gap-3 ${muted?'text-white/32':'text-white/58'}`}><span>{label}</span><span>{value}</span></div>; }
function StateMetric({label,value}:{label:string;value:string}) { return <div className="rounded-xl border border-white/8 bg-white/[.035] p-2.5 text-center"><p className="text-[7px] uppercase tracking-[.12em] text-white/28">{label}</p><b className="mt-1 block truncate text-[10px] sm:text-xs">{value}</b></div>; }
