'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Building2, CheckCircle2, Copy, Loader2, Lock, Mail, MapPin, PackageCheck, Phone, ShieldCheck, Truck } from 'lucide-react';
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
    resumen: { subtotal: number; iva: number; despacho: number; total: number; moneda: 'CLP' };
    paymentMethod?: string;
  };
  payment?: { checkoutUrl?: string | null; preferenceId?: string | null } | null;
  error?: string;
  warning?: string | null;
}

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

export default function CheckoutApp() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('VII');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<'transfer' | 'mercadopago'>('transfer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderResponse['data'] | null>(null);
  const [paymentUrl, setPaymentUrl] = useState('');

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

  const summary = useMemo(() => {
    return calculateCheckoutSummary(items.map((item) => ({
      productoId: item.product.id,
      cantidad: item.quantity,
      precioUnitario: item.product.price * (1 - (item.product.discount_percentage || 0) / 100),
      nombre: item.product.name,
    })), region);
  }, [items, region]);

  const product = items[0]?.product;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const canSubmit = name.trim().length > 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.replace(/\D/g, '').length >= 8 && address.trim().length > 5 && items.length > 0;

  function ensureOrderKey() {
    const base = `${items.map((item) => item.product.id).join('-')}-${email}-${summary.total}`.replace(/[^a-zA-Z0-9@.-]/g, '').slice(0, 70);
    const storageKey = `sf-checkout-order-key-${base}`;
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const next = `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    sessionStorage.setItem(storageKey, next);
    return next;
  }

  async function submitOrder() {
    if (order) return;
    if (!canSubmit) {
      setError('Completa nombre, email, teléfono y dirección antes de continuar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const clientOrderKey = ensureOrderKey();
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ productoId: item.product.id, cantidad: item.quantity, precioUnitario: item.product.price, nombre: item.product.name })),
          region,
          shippingAddress: address,
          cliente: { nombre: name, email, telefono: phone },
          paymentMethod: method === 'transfer' ? 'transfer' : 'mercadopago',
          clientOrderKey,
        }),
      });
      const payload = await response.json() as OrderResponse;
      if (!response.ok || !payload.data) throw new Error(payload.error || 'No se pudo crear la orden.');
      setOrder(payload.data);
      setPaymentUrl(payload.payment?.checkoutUrl || '');
      if (method === 'mercadopago' && payload.payment?.checkoutUrl) {
        window.location.href = payload.payment.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la compra.');
    } finally {
      setLoading(false);
    }
  }

  if (order) {
    return <main className="min-h-screen bg-[#050403] px-4 py-6 text-white">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-emerald-300/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,.18),transparent_38%),#090806] p-5 shadow-[0_35px_120px_rgba(0,0,0,.55)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100"><CheckCircle2 className="mr-2 h-4 w-4" />Orden creada</span>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] sm:text-6xl">Compra registrada.</h1>
            <p className="mt-4 max-w-2xl text-white/60">Te enviamos el detalle al correo con un comprobante PDF. La entrega estimada es de <b className="text-white">7 a 21 días hábiles</b> desde confirmación y coordinación.</p>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-300">Código de orden</p>
              <div className="mt-2 flex flex-wrap items-center gap-3"><b className="text-2xl">{order.id}</b><button onClick={() => void copyToClipboard(order.id)} className="rounded-xl border border-white/10 px-3 py-2 text-sm"><Copy className="mr-2 inline h-4 w-4" />Copiar</button></div>
            </div>
            {method === 'transfer' && <div className="mt-5 rounded-[1.5rem] border border-yellow-300/25 bg-yellow-300/10 p-4">
              <p className="text-sm font-black text-yellow-100">Transferencia pendiente de verificación</p>
              <p className="mt-1 text-sm text-yellow-50/70">Usa estos datos y envía el comprobante respondiendo al correo recibido.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <CopyBox label="Banco" value={BANK_INFO.bank} />
                <CopyBox label="Titular" value={BANK_INFO.holder} />
                <CopyBox label="RUT" value={BANK_INFO.rut} />
                <CopyBox label="Tipo" value={BANK_INFO.type} />
                <CopyBox label="Cuenta" value={BANK_INFO.number} />
                <CopyBox label="Email" value={BANK_INFO.email} />
              </div>
            </div>}
            {paymentUrl && <a href={paymentUrl} className="mt-5 inline-flex rounded-2xl bg-yellow-300 px-5 py-3 font-black text-black">Volver a Mercado Pago</a>}
          </div>
          <OrderSummary items={items} summary={summary} />
        </div>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-[#050403] px-3 py-4 text-white sm:px-5 lg:px-8">
    <section className="mx-auto max-w-7xl space-y-4">
      <button onClick={() => history.back()} className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70"><ArrowLeft className="mr-2 h-4 w-4" />Volver</button>
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#090806] shadow-[0_35px_120px_rgba(0,0,0,.55)]">
        <div className="grid gap-0 lg:grid-cols-[1fr_440px]">
          <div className="p-5 sm:p-8">
            <span className="inline-flex items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-100"><ShieldCheck className="mr-2 h-4 w-4" />Checkout rápido y seguro</span>
            <h1 className="mt-5 text-4xl font-black tracking-[-0.07em] sm:text-6xl">Finaliza tu compra sin vueltas.</h1>
            <p className="mt-4 max-w-2xl text-white/58">Página más liviana, sin animaciones pesadas, con transferencia directa, email automático y comprobante PDF.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Trust icon={<Lock className="h-5 w-5" />} title="Sin duplicar" text="Una orden por intento." />
              <Trust icon={<Mail className="h-5 w-5" />} title="Email inmediato" text="Cliente y admin reciben detalle." />
              <Trust icon={<Truck className="h-5 w-5" />} title="7 a 21 días" text="Entrega hábil estimada." />
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Input label="Nombre completo" value={name} onChange={setName} placeholder="Ej: Eduardo Micolta" />
              <Input label="Correo" value={email} onChange={setEmail} placeholder="cliente@email.com" icon={<Mail className="h-4 w-4" />} />
              <Input label="Teléfono" value={phone} onChange={setPhone} placeholder="+56 9..." icon={<Phone className="h-4 w-4" />} />
              <label className="block rounded-2xl border border-white/10 bg-black/35 p-3">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Región</span>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-2 w-full bg-transparent text-lg font-bold outline-none">
                  {REGIONS.map(([id, label]) => <option key={id} value={id} className="bg-black">{label}</option>)}
                </select>
              </label>
              <div className="sm:col-span-2"><Input label="Dirección de envío" value={address} onChange={setAddress} placeholder="Calle, número, comuna, referencia" icon={<MapPin className="h-4 w-4" />} /></div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setMethod('transfer')} className={`rounded-[1.4rem] border p-4 text-left ${method === 'transfer' ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.04]'}`}><Building2 className="mb-3 h-5 w-5" /><b>Transferencia bancaria</b><p className={`mt-1 text-sm ${method === 'transfer' ? 'text-black/70' : 'text-white/50'}`}>Orden inmediata y comprobante por correo.</p></button>
              <button onClick={() => setMethod('mercadopago')} className={`rounded-[1.4rem] border p-4 text-left ${method === 'mercadopago' ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.04]'}`}><ShieldCheck className="mb-3 h-5 w-5" /><b>Mercado Pago</b><p className={`mt-1 text-sm ${method === 'mercadopago' ? 'text-black/70' : 'text-white/50'}`}>Redirección oficial si prefieres tarjeta.</p></button>
            </div>

            {error && <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
            <button onClick={() => void submitOrder()} disabled={loading || !canSubmit} className="mt-6 inline-flex w-full items-center justify-center rounded-[1.4rem] bg-yellow-300 px-5 py-4 text-lg font-black text-black disabled:opacity-50">
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackageCheck className="mr-2 h-5 w-5" />}
              {loading ? 'Creando orden...' : method === 'transfer' ? 'Crear orden y datos de transferencia' : 'Ir a pago seguro'}
            </button>
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

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="text-yellow-300">{icon}</div><b className="mt-2 block">{title}</b><p className="mt-1 text-sm text-white/45">{text}</p></div>;
}

function Input({ label, value, onChange, placeholder, icon }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; icon?: React.ReactNode }) {
  return <label className="block rounded-2xl border border-white/10 bg-black/35 p-3"><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{icon}{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2 w-full bg-transparent text-lg font-bold outline-none placeholder:text-white/20" /></label>;
}

function CopyBox({ label, value }: { label: string; value: string }) {
  return <button onClick={() => void copyToClipboard(value)} className="rounded-2xl border border-white/10 bg-black/35 p-3 text-left"><span className="text-[10px] uppercase tracking-[0.22em] text-yellow-300">{label}</span><b className="mt-1 block truncate">{value}</b></button>;
}

function OrderSummary({ items, summary }: { items: StoredCartItem[]; summary: ReturnType<typeof calculateCheckoutSummary> }) {
  return <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/35 p-5">
    <h3 className="text-xl font-black">Resumen</h3>
    <div className="mt-4 space-y-3">{items.map((item) => <div key={item.product.id} className="flex gap-3 text-sm"><span className="flex-1 text-white/65">{item.quantity} × {item.product.name}</span><b>{formatCLP(item.product.price * item.quantity)}</b></div>)}</div>
    <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm"><Row label="Subtotal" value={formatCLP(summary.subtotal)} /><Row label="IVA referencial" value={formatCLP(summary.iva)} /><Row label="Despacho" value="Se coordina" muted /><Row label="Total compra" value={formatCLP(summary.total)} strong /></div>
    <p className="mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-xs leading-5 text-yellow-100/80">El costo aproximado de envío se calcula internamente y llega al admin por correo. No se cobra automáticamente hasta confirmar comuna, volumen y operador.</p>
  </div>;
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'text-lg font-black text-white' : muted ? 'text-white/45' : 'text-white/70'}`}><span>{label}</span><span>{value}</span></div>;
}
