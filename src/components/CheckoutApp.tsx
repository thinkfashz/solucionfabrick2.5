'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, Copy, CreditCard, Loader2, Lock, Mail, MapPin, Navigation, PackageCheck, Phone, ShieldCheck, User } from 'lucide-react';
import { CART_SESSION_KEY } from '@/context/CartContext';
import { calculateCheckoutSummary } from '@/lib/checkout';

interface StoredCartItem {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    category_id?: string;
    discount_percentage?: number;
  };
  quantity: number;
}

interface OrderResponse {
  data?: {
    id: string;
    estado: string;
    deliveryEstimate?: string;
    trackingUrl?: string;
    resumen: { subtotal: number; iva: number; despacho: number; total: number; moneda: 'CLP' };
    paymentMethod?: string;
  };
  payment?: { checkoutUrl?: string | null; preferenceId?: string | null; method?: string } | null;
  notification?: { ok?: boolean; deferred?: boolean; reason?: string };
  error?: string;
  warning?: string | null;
}

type MpStatus = {
  status: 'ok' | 'unconfigured' | 'unreachable' | 'invalid_token';
  reachable: boolean;
  latencyMs: number | null;
  mode: 'production' | 'sandbox' | 'unknown';
  message: string;
};

const BANK_INFO = {
  bank: process.env.NEXT_PUBLIC_BANK_NAME ?? 'Banco de Chile',
  holder: process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER ?? 'Soluciones Fabrick SpA',
  rut: process.env.NEXT_PUBLIC_BANK_ACCOUNT_RUT ?? '77.890.123-4',
  type: process.env.NEXT_PUBLIC_BANK_ACCOUNT_TYPE ?? 'Cuenta Corriente',
  number: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? '0123456789',
  email: process.env.NEXT_PUBLIC_BANK_ACCOUNT_EMAIL ?? 'pagos@solucionesfabrick.cl',
};

const REGIONS = [
  ['VII', 'Maule / Linares / Talca'],
  ['RM', 'Región Metropolitana'],
  ['V', 'Valparaíso'],
  ['VI', 'O’Higgins'],
  ['VIII', 'Biobío'],
  ['XVI', 'Ñuble'],
  ['IX', 'Araucanía'],
  ['X', 'Los Lagos'],
  ['XI', 'Aysén'],
  ['XII', 'Magallanes'],
  ['I', 'Tarapacá'],
  ['II', 'Antofagasta'],
  ['XV', 'Arica y Parinacota'],
];

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.round(value || 0));
}

function cleanPrice(value: string | null, fallback = 0) {
  const number = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function copyToClipboard(value: string) {
  return navigator.clipboard.writeText(value).catch(() => undefined);
}

function maskCard(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  const padded = digits.padEnd(16, '•');
  return padded.replace(/(.{4})/g, '$1 ').trim();
}

function guessRegionFromCoords(latitude: number, longitude: number) {
  if (latitude < -32.5 && latitude > -34.4 && longitude < -70 && longitude > -72.6) return 'RM';
  if (latitude < -34.4 && latitude > -36.7 && longitude < -70 && longitude > -73.5) return 'VII';
  if (latitude < -36.2 && latitude > -38.8 && longitude < -71 && longitude > -74) return 'VIII';
  if (latitude < -35.8 && latitude > -37.4 && longitude < -70 && longitude > -73.2) return 'XVI';
  return '';
}

export default function CheckoutApp() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('VII');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<'mercadopago' | 'transfer'>('mercadopago');
  const [cardName, setCardName] = useState('SOLUCIONES FABRICK');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [mpStatus, setMpStatus] = useState<MpStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState('');
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderResponse['data'] | null>(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) as StoredCartItem[] : [];
      if (Array.isArray(parsed) && parsed.length) {
        setItems(parsed);
        return;
      }
    } catch {}

    setItems([
      {
        product: {
          id: searchParams.get('productId') || 'producto-directo',
          name: searchParams.get('name') || 'Producto Soluciones Fabrick',
          price: cleanPrice(searchParams.get('price'), 0),
          image_url: searchParams.get('img') || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
          category_id: searchParams.get('category') || 'Producto',
        },
        quantity: 1,
      },
    ]);
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function loadMpStatus() {
      try {
        const res = await fetch('/api/payments/mp-status', { cache: 'no-store' });
        const json = await res.json() as MpStatus;
        if (active) setMpStatus(json);
      } catch {
        if (active) setMpStatus({ status: 'unreachable', reachable: false, latencyMs: null, mode: 'unknown', message: 'No se pudo leer la configuración de Mercado Pago.' });
      }
    }
    void loadMpStatus();
    const id = setInterval(loadMpStatus, 20000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const lineItems = useMemo(() => items.map((item) => ({
    productoId: item.product.id,
    cantidad: item.quantity,
    precioUnitario: item.product.price * (1 - (item.product.discount_percentage || 0) / 100),
    nombre: item.product.name,
  })), [items]);

  const summary = useMemo(() => calculateCheckoutSummary(lineItems, region), [lineItems, region]);
  const product = items[0]?.product;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const formValid = name.trim().length > 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.replace(/\D/g, '').length >= 8 && address.trim().length > 5;
  const canSubmit = formValid && items.length > 0;

  function ensureOrderKey() {
    const base = `${items.map((item) => item.product.id).join('-')}-${email}-${summary.total}`.replace(/[^a-zA-Z0-9@.-]/g, '').slice(0, 70);
    const storageKey = `sf-checkout-order-key-${base}`;
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const next = `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    sessionStorage.setItem(storageKey, next);
    return next;
  }

  function useGpsLocation() {
    setGpsMessage('');
    if (!('geolocation' in navigator)) {
      setGpsMessage('Tu navegador no soporta GPS. Escribe la dirección manualmente.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const lat = latitude.toFixed(6);
        const lng = longitude.toFixed(6);
        const guessedRegion = guessRegionFromCoords(latitude, longitude);
        if (guessedRegion) setRegion(guessedRegion);
        setAddress(`Ubicación GPS: ${lat}, ${lng} · precisión aprox. ${Math.round(accuracy)} m. Completa calle, número, depto/comuna.`);
        setGpsMessage('Ubicación GPS agregada. Completa calle/número para evitar errores de despacho.');
        setGpsLoading(false);
      },
      (geoError) => {
        const msg = geoError.code === geoError.PERMISSION_DENIED
          ? 'Permiso de ubicación rechazado. Actívalo en el navegador o escribe la dirección manualmente.'
          : 'No se pudo obtener la ubicación. Revisa GPS/señal e inténtalo nuevamente.';
        setGpsMessage(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function submitOrder() {
    if (order) return;
    if (!canSubmit) {
      setError('Completa nombre, email, teléfono y dirección antes de continuar.');
      setStep(2);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const clientOrderKey = ensureOrderKey();
      const response = await fetch(method === 'transfer' ? '/api/checkout/transfer' : '/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lineItems,
          region,
          shippingAddress: address,
          cliente: { nombre: name, email, telefono: phone },
          paymentMethod: method,
          clientOrderKey,
        }),
      });
      const payload = await response.json() as OrderResponse;
      if (!response.ok || !payload.data) throw new Error(payload.error || 'No se pudo crear la orden.');
      setOrder(payload.data);
      setPaymentUrl(payload.payment?.checkoutUrl || '');
      setNotificationMessage(payload.notification?.reason || 'La confirmación por correo queda pendiente hasta validar el pago.');
      if (method === 'mercadopago' && payload.payment?.checkoutUrl) window.location.href = payload.payment.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la compra.');
    } finally {
      setLoading(false);
    }
  }

  if (order) {
    return <main className="tenant-checkout-shell min-h-screen bg-[#050403] px-4 py-6 text-white">
      <section className="tenant-checkout-card mx-auto max-w-5xl rounded-[2rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_top,rgba(250,204,21,.18),transparent_38%),#090806] p-5 shadow-[0_35px_120px_rgba(0,0,0,.55)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <span className="inline-flex items-center rounded-full border border-yellow-300/25 bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-100"><CheckCircle2 className="mr-2 h-4 w-4" />Orden registrada</span>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] sm:text-6xl">Pago pendiente de validación.</h1>
            <p className="mt-4 max-w-2xl text-white/60">No se envió correo de compra confirmada todavía. La boleta y el correo final salen cuando el pago quede validado.</p>
            <div className="mt-4 rounded-[1.4rem] border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm text-yellow-50"><BadgeCheck className="mr-2 inline h-4 w-4" />{notificationMessage}</div>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/35 p-4"><p className="text-xs uppercase tracking-[0.25em] text-yellow-300">Código de orden</p><div className="mt-2 flex flex-wrap items-center gap-3"><b className="text-2xl">{order.id}</b><button onClick={() => void copyToClipboard(order.id)} className="rounded-xl border border-white/10 px-3 py-2 text-sm"><Copy className="mr-2 inline h-4 w-4" />Copiar</button></div></div>
            {order.trackingUrl && <a href={order.trackingUrl} className="mt-5 inline-flex rounded-2xl bg-yellow-300 px-5 py-3 font-black text-black">Ver estado del pedido</a>}
            {method === 'transfer' && <BankDetails />}
            {paymentUrl && <a href={paymentUrl} className="mt-5 ml-3 inline-flex rounded-2xl border border-white/10 px-5 py-3 font-black text-white">Ir a Mercado Pago</a>}
          </div>
          <OrderSummary items={items} summary={summary} />
        </div>
      </section>
    </main>;
  }

  return <main className="tenant-checkout-shell min-h-screen bg-[#050403] px-3 py-4 text-white sm:px-5 lg:px-8">
    <section className="mx-auto max-w-7xl space-y-4">
      <button onClick={() => window.history.back()} className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70"><ArrowLeft className="mr-2 h-4 w-4" />Volver</button>
      <section className="tenant-checkout-card overflow-hidden rounded-[2rem] border border-white/10 bg-[#090806] shadow-[0_35px_120px_rgba(0,0,0,.55)]">
        <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
          <div className="p-5 sm:p-8">
            <span className="inline-flex items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-100"><ShieldCheck className="mr-2 h-4 w-4" />Checkout guiado y seguro</span>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.07em] sm:text-6xl">Finaliza en 3 pasos.</h1>
            <p className="mt-4 max-w-2xl text-white/58">Revisa producto, completa datos con GPS opcional y elige Mercado Pago o transferencia.</p>
            <Stepper step={step} />
            {step === 1 && <ProductStep product={product} itemCount={itemCount} items={items} summary={summary} onNext={() => setStep(2)} />}
            {step === 2 && <FormStep name={name} setName={setName} email={email} setEmail={setEmail} phone={phone} setPhone={setPhone} region={region} setRegion={setRegion} address={address} setAddress={setAddress} formValid={formValid} onBack={() => setStep(1)} onNext={() => setStep(3)} onUseGps={useGpsLocation} gpsLoading={gpsLoading} gpsMessage={gpsMessage} />}
            {step === 3 && <PaymentStep method={method} setMethod={setMethod} mpStatus={mpStatus} cardName={cardName} setCardName={setCardName} cardNumber={cardNumber} setCardNumber={setCardNumber} cardExpiry={cardExpiry} setCardExpiry={setCardExpiry} cardCvv={cardCvv} setCardCvv={setCardCvv} loading={loading} canSubmit={canSubmit} error={error} onBack={() => setStep(2)} onSubmit={() => void submitOrder()} />}
          </div>
          <div className="border-t border-white/10 bg-black/30 p-5 lg:border-l lg:border-t-0 sm:p-8">
            <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#070707]">
              {product?.image_url && <img src={product.image_url} alt={product.name} className="h-60 w-full object-cover" loading="eager" />}
              <div className="p-5"><p className="text-xs uppercase tracking-[0.25em] text-yellow-300">Producto seleccionado</p><h2 className="mt-2 text-2xl font-black">{product?.name || 'Producto'}</h2><p className="mt-2 text-white/45">{itemCount} unidad(es) · despacho coordinado por Soluciones Fabrick.</p></div>
            </div>
            <OrderSummary items={items} summary={summary} />
          </div>
        </div>
      </section>
    </section>
  </main>;
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ['Producto', 'Datos', 'Pago'];
  return <div className="mt-7 grid grid-cols-3 gap-2">{steps.map((label, index) => {
    const active = step === index + 1;
    const done = step > index + 1;
    return <div key={label} className={`rounded-2xl border p-3 ${active ? 'border-yellow-300 bg-yellow-300 text-black' : done ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-white/[0.04] text-white/40'}`}><span className="text-[10px] font-black uppercase tracking-[0.18em]">Paso {index + 1}</span><b className="mt-1 block text-sm">{label}</b></div>;
  })}</div>;
}

function ProductStep({ product, itemCount, items, summary, onNext }: { product?: StoredCartItem['product']; itemCount: number; items: StoredCartItem[]; summary: ReturnType<typeof calculateCheckoutSummary>; onNext: () => void }) {
  return <div className="mt-7 space-y-4"><div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5"><PackageCheck className="mb-3 h-7 w-7 text-yellow-300" /><h2 className="text-2xl font-black">Revisa tu producto</h2><p className="mt-2 text-white/50">Confirma nombre, cantidad y total antes de ingresar tus datos.</p><div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4"><b>{product?.name || 'Producto'}</b><p className="mt-1 text-sm text-white/45">{itemCount} unidad(es)</p></div></div><OrderSummary items={items} summary={summary} compact /><button onClick={onNext} className="inline-flex w-full items-center justify-center rounded-[1.4rem] bg-yellow-300 px-5 py-4 text-lg font-black text-black">Continuar a datos <ArrowRight className="ml-2 h-5 w-5" /></button></div>;
}

function FormStep(props: { name: string; setName: (v: string) => void; email: string; setEmail: (v: string) => void; phone: string; setPhone: (v: string) => void; region: string; setRegion: (v: string) => void; address: string; setAddress: (v: string) => void; formValid: boolean; onBack: () => void; onNext: () => void; onUseGps: () => void; gpsLoading: boolean; gpsMessage: string }) {
  return <div className="mt-7 space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Nombre completo" value={props.name} onChange={props.setName} placeholder="Ej: Eduardo Micolta" icon={<User className="h-4 w-4" />} />
      <Input label="Correo" value={props.email} onChange={props.setEmail} placeholder="cliente@email.com" icon={<Mail className="h-4 w-4" />} />
      <Input label="Teléfono" value={props.phone} onChange={props.setPhone} placeholder="+56 9..." icon={<Phone className="h-4 w-4" />} />
      <label className="block rounded-2xl border border-white/10 bg-black/35 p-3"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Región</span><select value={props.region} onChange={(e) => props.setRegion(e.target.value)} className="mt-2 w-full bg-transparent text-lg font-bold outline-none">{REGIONS.map(([id, label]) => <option key={id} value={id} className="bg-black">{label}</option>)}</select></label>
      <div className="sm:col-span-2"><Input label="Dirección de envío" value={props.address} onChange={props.setAddress} placeholder="Calle, número, comuna, referencia" icon={<MapPin className="h-4 w-4" />} /></div>
    </div>
    <div className="rounded-[1.5rem] border border-yellow-300/20 bg-yellow-300/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-yellow-100">Usar GPS para mi ubicación</p><p className="mt-1 text-xs leading-5 text-yellow-50/65">Pedirá permiso del navegador y rellenará coordenadas GPS en la dirección. Luego completa calle/número.</p></div><button type="button" onClick={props.onUseGps} disabled={props.gpsLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 text-sm font-black text-black disabled:opacity-60">{props.gpsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />} {props.gpsLoading ? 'Ubicando...' : 'Usar GPS'}</button></div>
      {props.gpsMessage && <p className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-yellow-50/75">{props.gpsMessage}</p>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><button onClick={props.onBack} className="rounded-[1.4rem] border border-white/10 px-5 py-4 font-black text-white/70">Volver</button><button onClick={props.onNext} disabled={!props.formValid} className="rounded-[1.4rem] bg-yellow-300 px-5 py-4 font-black text-black disabled:opacity-40">Continuar a pago</button></div>
  </div>;
}

function PaymentStep(props: { method: 'mercadopago' | 'transfer'; setMethod: (v: 'mercadopago' | 'transfer') => void; mpStatus: MpStatus | null; cardName: string; setCardName: (v: string) => void; cardNumber: string; setCardNumber: (v: string) => void; cardExpiry: string; setCardExpiry: (v: string) => void; cardCvv: string; setCardCvv: (v: string) => void; loading: boolean; canSubmit: boolean; error: string; onBack: () => void; onSubmit: () => void }) {
  const mpReady = props.mpStatus?.status === 'ok';
  return <div className="mt-7 space-y-5"><div className="grid gap-3 sm:grid-cols-2"><button onClick={() => props.setMethod('mercadopago')} className={`rounded-[1.4rem] border p-4 text-left ${props.method === 'mercadopago' ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.04]'}`}><ShieldCheck className="mb-3 h-5 w-5" /><b>Mercado Pago</b><p className={`mt-1 text-sm ${props.method === 'mercadopago' ? 'text-black/70' : 'text-white/50'}`}>Conexión oficial y validación automática.</p></button><button onClick={() => props.setMethod('transfer')} className={`rounded-[1.4rem] border p-4 text-left ${props.method === 'transfer' ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.04]'}`}><Building2 className="mb-3 h-5 w-5" /><b>Transferencia</b><p className={`mt-1 text-sm ${props.method === 'transfer' ? 'text-black/70' : 'text-white/50'}`}>Orden pendiente hasta validar comprobante.</p></button></div>{props.method === 'mercadopago' ? <div className="grid gap-4 lg:grid-cols-[1fr_1fr]"><CardPreview name={props.cardName} number={props.cardNumber} expiry={props.cardExpiry} /><div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Estado Mercado Pago</p><div className={`mt-3 rounded-2xl border p-3 text-sm ${mpReady ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-50' : 'border-yellow-300/20 bg-yellow-300/10 text-yellow-50'}`}>{props.mpStatus?.message || 'Verificando configuración...'}</div><div className="mt-4 grid gap-3"><Input label="Nombre en tarjeta" value={props.cardName} onChange={props.setCardName} placeholder="Nombre" /><Input label="Número visual" value={props.cardNumber} onChange={props.setCardNumber} placeholder="0000 0000 0000 0000" icon={<CreditCard className="h-4 w-4" />} /><div className="grid grid-cols-2 gap-3"><Input label="Vence" value={props.cardExpiry} onChange={props.setCardExpiry} placeholder="MM/AA" /><Input label="CVV" value={props.cardCvv} onChange={props.setCardCvv} placeholder="***" /></div></div><p className="mt-3 text-xs leading-5 text-white/42">Estos campos son una vista previa visual. El cobro real se completa en el formulario seguro de Mercado Pago.</p></div></div> : <BankDetails />}{props.error && <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">{props.error}</div>}<div className="grid gap-3 sm:grid-cols-2"><button onClick={props.onBack} className="rounded-[1.4rem] border border-white/10 px-5 py-4 font-black text-white/70">Volver</button><button onClick={props.onSubmit} disabled={props.loading || !props.canSubmit} className="inline-flex items-center justify-center rounded-[1.4rem] bg-yellow-300 px-5 py-4 text-lg font-black text-black disabled:opacity-50">{props.loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}{props.loading ? 'Procesando...' : props.method === 'transfer' ? 'Crear orden pendiente' : 'Pagar con Mercado Pago'}</button></div></div>;
}

function CardPreview({ name, number, expiry }: { name: string; number: string; expiry: string }) {
  return <div className="relative min-h-[230px] overflow-hidden rounded-[1.7rem] border border-yellow-300/25 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.28),transparent_18rem),linear-gradient(135deg,#15120a,#050505)] p-6 shadow-[0_24px_80px_rgba(0,0,0,.5)]"><div className="absolute right-6 top-6 rounded-full border border-yellow-300/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">Fabrick Card</div><CreditCard className="mt-10 h-8 w-8 text-yellow-300" /><p className="mt-8 font-mono text-2xl tracking-[0.12em] text-white">{maskCard(number)}</p><div className="mt-6 flex justify-between text-xs uppercase tracking-[0.18em] text-white/50"><span>{name || 'Nombre'}</span><span>{expiry || 'MM/AA'}</span></div></div>;
}

function BankDetails() {
  return <div className="mt-5 rounded-[1.5rem] border border-yellow-300/25 bg-yellow-300/10 p-4"><p className="text-sm font-black text-yellow-100">Datos para transferencia</p><p className="mt-1 text-sm text-yellow-50/70">La orden queda pendiente hasta validar el comprobante.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><CopyBox label="Banco" value={BANK_INFO.bank} /><CopyBox label="Titular" value={BANK_INFO.holder} /><CopyBox label="RUT" value={BANK_INFO.rut} /><CopyBox label="Tipo" value={BANK_INFO.type} /><CopyBox label="Cuenta" value={BANK_INFO.number} /><CopyBox label="Email" value={BANK_INFO.email} /></div></div>;
}

function Input({ label, value, onChange, placeholder, icon }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; icon?: React.ReactNode }) {
  return <label className="block rounded-2xl border border-white/10 bg-black/35 p-3"><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{icon}{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-lg font-bold outline-none placeholder:text-white/20" /></label>;
}

function CopyBox({ label, value }: { label: string; value: string }) {
  return <button onClick={() => void copyToClipboard(value)} className="rounded-2xl border border-white/10 bg-black/35 p-3 text-left"><span className="text-[10px] uppercase tracking-[0.22em] text-yellow-300">{label}</span><b className="mt-1 block truncate">{value}</b></button>;
}

function OrderSummary({ items, summary, compact }: { items: StoredCartItem[]; summary: ReturnType<typeof calculateCheckoutSummary>; compact?: boolean }) {
  return <div className={`${compact ? '' : 'mt-5'} rounded-[1.6rem] border border-white/10 bg-black/35 p-5`}><h3 className="text-xl font-black">Resumen</h3><div className="mt-4 space-y-3">{items.map((item) => <div key={item.product.id} className="flex gap-3 text-sm"><span className="flex-1 text-white/65">{item.quantity} × {item.product.name}</span><b>{formatCLP(item.product.price * item.quantity)}</b></div>)}</div><div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm"><Row label="Subtotal" value={formatCLP(summary.subtotal)} /><Row label="IVA referencial" value={formatCLP(summary.iva)} /><Row label="Despacho" value={formatCLP(summary.despacho)} /><Row label="Total compra" value={formatCLP(summary.total)} strong /></div></div>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'text-lg font-black text-white' : 'text-white/70'}`}><span>{label}</span><span>{value}</span></div>;
}
