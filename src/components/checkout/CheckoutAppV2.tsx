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
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { CART_SESSION_KEY } from '@/context/CartContext';
import { calculateCheckoutSummary, type LineItem } from '@/lib/checkout';
import { DEFAULT_SHIPPING_CONFIG, getRegionRate } from '@/lib/shipping';
import type { Product } from '@/hooks/useRealtimeProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';

type Item = { product: Product; quantity: number };
type PayState = 'idle' | 'creating' | 'pending' | 'approved' | 'failed' | 'abandoned';
type DocumentType = 'boleta' | 'factura';
type StatusPayload = { state: 'approved' | 'failed' | 'refunded' | 'abandoned' | 'pending'; status: string; paymentStatus: string; total: number; iva: number; despacho: number };
type CheckoutResponse = { data?: { id?: string }; payment?: { checkoutUrl?: string | null }; error?: string; validationErrors?: Array<{ message?: string }> };

const PENDING_KEY = 'sf-pending-payment-order';
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const discounted = (item: Item) => Math.round(item.product.price * (1 - Number(item.product.discount_percentage || 0) / 100));
const REGION_OPTIONS = DEFAULT_SHIPPING_CONFIG.rates.map((rate) => ({ value: rate.region, label: rate.label }));

export default function CheckoutAppV2() {
  const search = useSearchParams();
  const { branding } = useTenantBranding();
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
        }, quantity: Math.max(1, Number(search.get('quantity') || 1)) }]);
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

  if (!hydrated) return <CheckoutShell><div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center"><div><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#F5871F]"/><p className="mt-3 text-sm font-bold text-black/45">Preparando tu compra…</p></div></div></CheckoutShell>;

  if (['pending', 'abandoned', 'approved', 'failed'].includes(state)) {
    const ok = state === 'approved';
    const fail = state === 'failed';
    const abandoned = state === 'abandoned';
    return <CheckoutShell>
      <section className="mx-auto mt-8 max-w-xl overflow-hidden bg-white shadow-[0_24px_80px_rgba(36,24,14,.1)]">
        <div className="p-7 text-center sm:p-9">
          <Brand branding={branding} />
          {ok ? <CheckCircle2 className="mx-auto mt-9 h-16 w-16 text-emerald-600"/> : fail ? <XCircle className="mx-auto mt-9 h-16 w-16 text-red-600"/> : <Loader2 className="mx-auto mt-9 h-16 w-16 animate-spin text-[#F5871F]"/>}
          <p className="mt-5 text-[9px] font-black uppercase tracking-[.16em] text-[#B96F00]">Orden {orderId || 'en proceso'}</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.045em]">{ok ? 'Compra confirmada' : fail ? 'Pago no aprobado' : abandoned ? 'Pago sin finalizar' : 'Confirmando tu pago'}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/50">{ok ? 'El pago fue confirmado. El pedido pasó a preparación y recibirás el comprobante o documento tributario correspondiente por correo.' : fail ? 'Puedes volver a intentar el pago sin duplicar la compra.' : abandoned ? 'La orden sigue identificada y puedes retomar el pago cuando quieras.' : 'Estamos verificando automáticamente la confirmación de Mercado Pago.'}</p>
          {!ok && !fail ? <span className="mt-5 inline-flex items-center gap-2 text-xs text-black/40"><RefreshCw size={14}/> Actualización automática</span> : null}
        </div>
        <div className="grid grid-cols-3 border-y border-black/10"><Metric label="Total" value={CLP.format(status?.total || summary.total)}/><Metric label="IVA incluido" value={CLP.format(status?.iva || summary.iva)}/><Metric label="Despacho" value={CLP.format(status?.despacho || summary.despacho)}/></div>
        <div className="flex gap-2 p-5">{ok ? <a href="/mi-cuenta" className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#F5871F] font-black">Ver mi pedido</a> : <>{paymentUrl ? <a href={paymentUrl} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#F5871F] font-black">Retomar pago</a> : null}<a href="/tienda" className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-black/5 font-black">Volver a tienda</a></>}</div>
      </section>
    </CheckoutShell>;
  }

  if (!items.length) return <CheckoutShell>
    <section className="mx-auto mt-10 max-w-xl bg-white p-7 text-center shadow-[0_24px_80px_rgba(36,24,14,.08)] sm:p-9">
      <ShoppingBag className="mx-auto h-10 w-10 text-[#B96F00]" />
      <h1 className="mt-4 text-3xl font-black tracking-[-.045em]">Tu carrito está vacío</h1>
      <p className="mt-3 text-sm leading-6 text-black/48">Agrega productos desde la tienda antes de iniciar el pago.</p>
      <a href="/tienda" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#F5871F] px-6 text-sm font-black">Ir a la tienda</a>
    </section>
  </CheckoutShell>;

  return <CheckoutShell>
    <header className="border-b border-white/8 bg-[#111214] px-4 py-4 text-white">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4"><Brand branding={branding} dark/><span className="flex items-center gap-1.5 text-[10px] font-bold text-white/55"><LockKeyhole size={14} className="text-emerald-400"/> Compra segura</span></div>
    </header>

    <div className="mx-auto max-w-[1120px] px-4 pb-12 sm:px-6">
      <div className="py-7 sm:py-9">
        <a href="/tienda" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-black/42"><ArrowLeft size={14}/> Volver a la tienda</a>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[.18em] text-[#A86700]">Finalizar compra</p>
        <h1 className="mt-2 max-w-[15ch] text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-5xl">Confirma entrega y luego paga.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-black/48">Revisa tus productos, selecciona boleta o factura y completa el despacho. Te llevaremos a Mercado Pago con el total final; el IVA ya está incluido.</p>

        <div className="mt-7 grid grid-cols-3 gap-px bg-black/10">
          {['Contacto', 'Entrega', 'Pago'].map((label, index) => {
            const done = index < activeStep;
            const active = index === activeStep;
            return <div key={label} className={`flex min-h-14 items-center gap-2 px-3 ${active ? 'bg-[#F5871F]' : 'bg-white'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-[#111214] text-white' : 'bg-black/5 text-black/30'}`}>{done ? <Check size={14}/> : index + 1}</span><span className={`text-[10px] font-black sm:text-xs ${active ? 'text-[#111214]' : done ? 'text-black/60' : 'text-black/32'}`}>{label}</span></div>;
          })}
        </div>
      </div>

      <div className="mb-4 flex items-end justify-between bg-[#111214] p-4 text-white lg:hidden">
        <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#FFB000]">Resumen · {unitCount} {unitCount === 1 ? 'unidad' : 'unidades'}</p><b className="mt-1 block text-2xl tracking-[-.04em]">{CLP.format(summary.total)}</b></div>
        <div className="text-right"><span className="text-[9px] text-white/35">Documento</span><b className="mt-1 block text-xs">{documentType === 'factura' ? 'Factura' : 'Boleta'}</b></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_390px] lg:items-start">
        <section className="space-y-4">
          <CheckoutCard number="01" title="Datos de contacto" icon={<User />} complete={contactReady}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={<User/>} label="Nombre y apellido" value={name} set={setName} placeholder="Nombre completo" ok={contactChecks[0]} autoComplete="name"/>
              <Field icon={<Mail/>} label="Correo" value={email} set={setEmail} placeholder="correo@ejemplo.cl" ok={contactChecks[1]} type="email" autoComplete="email"/>
              <Field icon={<Phone/>} label="Teléfono" value={phone} set={setPhone} placeholder="+56 9 1234 5678" ok={contactChecks[2]} type="tel" autoComplete="tel"/>
            </div>
          </CheckoutCard>

          <CheckoutCard number="02" title="Entrega" icon={<Truck />} complete={deliveryReady}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold"><span>Región</span><select value={region} onChange={(event) => setRegion(event.target.value)} className="min-h-13 border border-black/10 bg-[#FAF8F3] px-3 outline-none focus:border-[#F5871F]">{REGION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <Field icon={<MapPin/>} label="Comuna / ciudad" value={commune} set={setCommune} placeholder="Ej. Linares" ok={deliveryChecks[0]} autoComplete="address-level2"/>
            </div>
            <label className="mt-4 grid gap-2 text-xs font-bold"><span className="flex items-center">Dirección completa{deliveryChecks[1] ? <Check size={15} className="ml-auto text-emerald-700"/> : null}</span><textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={3} autoComplete="street-address" placeholder="Calle, número, departamento/casa y referencia" className="resize-none border border-black/10 bg-[#FAF8F3] p-3 text-sm outline-none focus:border-[#F5871F]"/></label>
            <div className="mt-4 flex items-start gap-3 border-t border-black/8 pt-4"><Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#B96F00]"/><div><b className="block text-xs">Entrega referencial: {regionRate.eta}</b><p className="mt-1 text-[10px] leading-4 text-black/42">El servidor vuelve a validar tarifa, stock y reglas de despacho antes de crear la orden.</p></div></div>
          </CheckoutCard>

          <CheckoutCard number="03" title="Documento y pago" icon={<CreditCard />} complete={billingReady}>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setDocumentType('boleta'); setError(''); }} className={`min-h-20 border p-3 text-left transition ${documentType === 'boleta' ? 'border-[#F5871F] bg-[#FFF5E5]' : 'border-black/10 bg-white'}`}><ReceiptText className="h-5 w-5 text-[#B96F00]"/><b className="mt-2 block text-sm">Boleta</b><span className="mt-1 block text-[10px] text-black/45">Compra personal / consumidor final</span></button>
              <button type="button" onClick={() => { setDocumentType('factura'); setError(''); }} className={`min-h-20 border p-3 text-left transition ${documentType === 'factura' ? 'border-[#F5871F] bg-[#FFF5E5]' : 'border-black/10 bg-white'}`}><Building2 className="h-5 w-5 text-[#B96F00]"/><b className="mt-2 block text-sm">Factura</b><span className="mt-1 block text-[10px] text-black/45">Empresa / actividad comercial</span></button>
            </div>

            {documentType === 'factura' ? <div className="mt-4 border border-black/10 bg-[#FAF8F3] p-4">
              <div className="mb-4 flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 text-[#B96F00]"/><div><b className="block text-sm">Datos tributarios</b><p className="mt-1 text-[10px] leading-4 text-black/45">Se guardan con esta orden y se usan para emitir el DTE cuando el pago sea aprobado.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field icon={<FileText/>} label="RUT empresa" value={taxRut} set={setTaxRut} placeholder="12345678-9" ok={invoiceChecks[0]} autoComplete="off"/>
                <Field icon={<Building2/>} label="Razón social" value={taxBusinessName} set={setTaxBusinessName} placeholder="Empresa SpA" ok={invoiceChecks[1]} autoComplete="organization"/>
                <Field icon={<FileText/>} label="Giro" value={taxGiro} set={setTaxGiro} placeholder="Construcción / comercio" ok={invoiceChecks[2]} autoComplete="off"/>
                <Field icon={<MapPin/>} label="Comuna tributaria" value={taxCommune} set={setTaxCommune} placeholder="Comuna" ok={invoiceChecks[4]} autoComplete="address-level2"/>
              </div>
              <label className="mt-4 grid gap-2 text-xs font-bold"><span className="flex items-center">Dirección tributaria{invoiceChecks[3] ? <Check size={15} className="ml-auto text-emerald-700"/> : null}</span><input value={taxAddress} onChange={(event) => setTaxAddress(event.target.value)} placeholder="Calle y número" className="min-h-13 border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#F5871F]"/></label>
            </div> : null}

            <div className="mt-4 flex items-start gap-4 border border-[#F5871F]/35 bg-[#FFF5E5] p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F5871F]"><CreditCard size={18}/></span><div><b className="block text-sm">Mercado Pago</b><p className="mt-1 text-xs leading-5 text-black/48">La orden se registra primero y después pasas al checkout seguro de Mercado Pago. Fabrick nunca almacena los datos de tu tarjeta.</p></div></div>
            <div className="mt-4 grid grid-cols-3 gap-px bg-black/8"><Trust icon={<ShieldCheck/>} title="Pago seguro"/><Trust icon={<PackageCheck/>} title="Pedido trazable"/><Trust icon={<Truck/>} title="Despacho validado"/></div>
          </CheckoutCard>

          {error ? <p className="border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">{error}</p> : null}
        </section>

        <aside className="h-fit bg-white p-5 shadow-[0_20px_60px_rgba(36,24,14,.09)] lg:sticky lg:top-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-black"><ShoppingBag size={18} className="text-[#B96F00]"/> Resumen</h2><span className="text-xs text-black/40">{unitCount} {unitCount === 1 ? 'unidad' : 'unidades'}</span></div>
          <div className="mt-4 divide-y divide-black/10">{items.map((item) => <div key={item.product.id} className="flex gap-3 py-4"><img src={item.product.image_url || '/images/landing/fabrick-home-showcase.webp'} alt="" loading="lazy" decoding="async" className="h-20 w-20 bg-[#F5F5F5] object-contain p-1"/><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold leading-5">{item.product.name}</p><p className="mt-1 text-xs text-black/40">Cantidad: {item.quantity}</p><b className="mt-2 block">{CLP.format(discounted(item) * item.quantity)}</b></div></div>)}</div>
          <div className="space-y-2 border-t border-black/10 pt-4 text-sm"><Row label="Productos" value={CLP.format(summary.subtotal)}/><Row label="Despacho" value={summary.despacho ? CLP.format(summary.despacho) : 'Gratis'}/><Row label="IVA incluido (19%)" value={CLP.format(summary.iva)} muted/><Row label="Documento" value={documentType === 'factura' ? 'Factura' : 'Boleta'}/><div className="flex items-end justify-between border-t border-black/10 pt-4"><span className="font-bold">Total final</span><b className="text-2xl tracking-[-.04em]">{CLP.format(summary.total)}</b></div></div>
          <button disabled={!valid || state === 'creating'} onClick={() => void pay()} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F5871F] px-4 font-black transition hover:bg-[#111214] hover:text-white disabled:cursor-not-allowed disabled:opacity-35">{state === 'creating' ? <Loader2 className="animate-spin" size={19}/> : <CreditCard size={19}/>} {state === 'creating' ? 'Preparando pago…' : 'Continuar a Mercado Pago'}<ChevronRight size={17}/></button>
          {!valid ? <p className="mt-3 text-center text-[10px] leading-4 text-black/40">Completa los datos marcados antes de continuar.</p> : <p className="mt-3 text-center text-[10px] leading-4 text-black/40">Productos y despacho forman el total final. El IVA está incluido y nunca se suma dos veces.</p>}
          <a href="/tienda" className="mt-4 flex min-h-10 items-center justify-center border-t border-black/8 pt-4 text-[10px] font-black text-[#B96F00]">Modificar carrito</a>
        </aside>
      </div>
    </div>
  </CheckoutShell>;
}

function CheckoutShell({ children }: { children: React.ReactNode }) { return <main className="min-h-screen bg-[#F4EFE6] text-[#111214]">{children}</main>; }

function Brand({ branding, dark = false }: { branding: ReturnType<typeof useTenantBranding>['branding']; dark?: boolean }) {
  return <div className="flex items-center gap-2">{branding.logoUrl ? <span className={`grid h-11 w-24 place-items-center ${dark ? 'bg-white/[.96] px-2' : ''}`}><img src={branding.logoUrl} alt={branding.name} className="max-h-9 w-full object-contain"/></span> : <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F5871F] font-black">SF</span>}<div className="hidden sm:block"><b className={`block text-xs ${dark ? 'text-white' : ''}`}>{branding.name}</b><span className={`text-[8px] uppercase tracking-[.12em] ${dark ? 'text-white/35' : 'text-black/35'}`}>Checkout oficial</span></div></div>;
}

function CheckoutCard({ number, title, icon, complete, children }: { number: string; title: string; icon: React.ReactNode; complete: boolean; children: React.ReactNode }) {
  return <div className="bg-white p-5 shadow-[0_12px_36px_rgba(36,24,14,.055)] sm:p-6"><div className="flex items-center gap-3 border-b border-black/8 pb-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#F4EFE6] text-[10px] font-black text-[#B96F00]">{number}</span><span className="text-[#B96F00] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><h2 className="text-lg font-black">{title}</h2>{complete ? <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600"/> : null}</div><div className="mt-5">{children}</div></div>;
}

function Field({ icon, label, value, set, placeholder, ok, type = 'text', autoComplete }: { icon: React.ReactNode; label: string; value: string; set: (value: string) => void; placeholder: string; ok: boolean; type?: string; autoComplete?: string }) {
  return <label className="grid gap-2 text-xs font-bold"><span className="flex items-center gap-2 text-black/65"><span className="text-[#B96F00] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}{ok ? <Check size={15} className="ml-auto text-emerald-700"/> : null}</span><input type={type} value={value} onChange={(event) => set(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="min-h-13 border border-black/10 bg-[#FAF8F3] px-3 text-sm outline-none focus:border-[#F5871F]"/></label>;
}

function Trust({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className="bg-white p-3 text-center text-[#B96F00] [&>svg]:mx-auto [&>svg]:h-5 [&>svg]:w-5">{icon}<b className="mt-2 block text-[9px] leading-4 text-black/55 sm:text-[10px]">{title}</b></div>; }
function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) { return <div className={`flex justify-between gap-3 ${muted ? 'text-black/40' : 'text-black/65'}`}><span>{label}</span><span>{value}</span></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="p-4 text-center"><p className="text-[9px] uppercase text-black/35">{label}</p><b className="mt-1 block text-sm">{value}</b></div>; }
