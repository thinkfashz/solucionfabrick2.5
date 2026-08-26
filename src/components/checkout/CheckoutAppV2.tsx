'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ChevronRight, CreditCard, Loader2, LockKeyhole, PackageCheck, RefreshCw, ShieldCheck, ShoppingBag, Truck, XCircle } from 'lucide-react';
import { CART_SESSION_KEY } from '@/context/CartContext';
import { calculateCheckoutSummary } from '@/lib/checkout';
import { useTenantBranding } from '@/hooks/useTenantBranding';

type Item = { product: { id: string; name: string; price: number; image_url?: string; discount_percentage?: number; shipping_mode?: string | null; shipping_fee?: number | null }; quantity: number };
type PayState = 'idle' | 'creating' | 'pending' | 'approved' | 'failed' | 'abandoned';
type StatusPayload = { state: 'approved' | 'failed' | 'refunded' | 'abandoned' | 'pending'; status: string; paymentStatus: string; total: number; iva: number; despacho: number; updatedAt?: string; };
const PENDING_KEY = 'sf-pending-payment-order';
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function getImage(item: Item) { return item.product.image_url || '/images/landing/fabrick-home-showcase.webp'; }
function discounted(item: Item) { return Math.round(item.product.price * (1 - Number(item.product.discount_percentage || 0) / 100)); }

export default function CheckoutAppV2() {
  const search = useSearchParams();
  const { branding } = useTenantBranding();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState('VII');
  const [state, setState] = useState<PayState>('idle');
  const [orderId, setOrderId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) as Item[] : [];
      if (Array.isArray(parsed) && parsed.length) setItems(parsed);
      else if (search.get('productId')) setItems([{ product: { id: search.get('productId')!, name: search.get('name') || 'Producto', price: Number(search.get('price') || 0), image_url: search.get('img') || undefined }, quantity: Math.max(1, Number(search.get('quantity') || 1)) }]);
      const pending = sessionStorage.getItem(PENDING_KEY);
      if (pending) { setOrderId(pending); setState('pending'); }
    } catch {}
  }, [search]);

  const lineItems = useMemo(() => items.map((item) => ({ productoId: item.product.id, cantidad: item.quantity, precioUnitario: discounted(item), nombre: item.product.name, shippingMode: item.product.shipping_fee != null ? 'fixed' as const : 'free' as const, shippingFee: item.product.shipping_fee ?? null })), [items]);
  const summary = useMemo(() => calculateCheckoutSummary(lineItems, region), [lineItems, region]);
  const valid = items.length > 0 && name.trim().length > 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && phone.replace(/\D/g, '').length >= 8 && address.trim().length > 5;

  useEffect(() => {
    if (!orderId || state === 'approved' || state === 'failed') return;
    let active = true;
    async function check() {
      try {
        const res = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as StatusPayload;
        if (!active) return;
        setStatus(data);
        if (data.state === 'approved') { setState('approved'); sessionStorage.removeItem(PENDING_KEY); sessionStorage.removeItem(CART_SESSION_KEY); }
        else if (data.state === 'failed' || data.state === 'refunded') { setState('failed'); sessionStorage.removeItem(PENDING_KEY); }
        else if (data.state === 'abandoned') setState('abandoned');
        else setState('pending');
      } catch {}
    }
    void check();
    pollRef.current = setInterval(check, 2200);
    return () => { active = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId, state]);

  async function pay() {
    if (!valid || state === 'creating') { setError('Completa tus datos de contacto y despacho antes de pagar.'); return; }
    setError(''); setState('creating');
    const key = `FBK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    try {
      const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: lineItems, region, shippingAddress: address, cliente: { nombre: name, email, telefono: phone }, paymentMethod: 'mercadopago', clientOrderKey: key }) });
      const payload = await res.json();
      if (!res.ok || !payload?.data?.id) throw new Error(payload?.error || 'No se pudo iniciar el pago.');
      const id = String(payload.data.id); const url = String(payload.payment?.checkoutUrl || '');
      setOrderId(id); setPaymentUrl(url); sessionStorage.setItem(PENDING_KEY, id); setState('pending');
      if (url) window.location.assign(url);
    } catch (e) { setState('idle'); setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago.'); }
  }

  if (state === 'pending' || state === 'abandoned' || state === 'approved' || state === 'failed') {
    const approved = state === 'approved'; const failed = state === 'failed'; const abandoned = state === 'abandoned';
    return <main className="min-h-screen bg-[#070809] px-4 py-8 text-white">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#111214] shadow-[0_40px_120px_rgba(0,0,0,.55)]">
        <div className={`p-6 sm:p-10 ${approved ? 'bg-emerald-400/10' : failed ? 'bg-rose-500/10' : 'bg-amber-300/8'}`}>
          <div className="flex items-center justify-between gap-4"><Brand branding={branding} /><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">Orden {orderId}</span></div>
          <div className="mt-10 grid place-items-center text-center">
            {approved ? <CheckCircle2 className="h-16 w-16 text-emerald-300" /> : failed ? <XCircle className="h-16 w-16 text-rose-300" /> : <Loader2 className="h-16 w-16 animate-spin text-amber-300" />}
            <h1 className="mt-5 text-4xl font-black tracking-[-.055em] sm:text-6xl">{approved ? 'Pago confirmado.' : failed ? 'El pago no fue aprobado.' : abandoned ? 'Pago aún no finalizado.' : 'Estamos esperando tu pago.'}</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">{approved ? 'La compra quedó confirmada. Ya puedes continuar con el seguimiento de tu pedido.' : failed ? 'Mercado Pago informó un rechazo o cancelación. Puedes volver a intentarlo sin duplicar la orden.' : abandoned ? 'No recibimos una confirmación después de varios minutos. Puedes retomar Mercado Pago o volver a la tienda.' : 'Esta pantalla consulta el estado real de tu orden. No necesitas presionar continuar ni crear otra compra.'}</p>
            {!approved && !failed && <div className="mt-7 flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs text-white/55"><RefreshCw className="h-4 w-4" /> Actualizando automáticamente cada 2 segundos</div>}
          </div>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8"><Metric label="Total" value={CLP.format(status?.total || summary.total)} /><Metric label="IVA incluido" value={CLP.format(status?.iva || summary.iva)} /><Metric label="Despacho" value={CLP.format(status?.despacho || summary.despacho)} /></div>
        <div className="flex flex-col gap-3 border-t border-white/10 p-6 sm:flex-row sm:p-8">{approved ? <a href="/mi-cuenta" className="flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-emerald-300 font-black text-black">Ver mis pedidos</a> : <>{paymentUrl ? <a href={paymentUrl} className="flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#FFB000] font-black text-black">Retomar pago</a> : null}<a href="/tienda" className="flex min-h-12 flex-1 items-center justify-center rounded-2xl border border-white/10 font-black">Volver a la tienda</a></>}</div>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-[#F5F0E7] px-3 py-5 text-[#111214] sm:px-6 sm:py-8">
    <div className="mx-auto max-w-6xl"><header className="flex items-center justify-between gap-4 rounded-[1.6rem] bg-[#111214] px-5 py-4 text-white"><Brand branding={branding} /><span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/50"><LockKeyhole className="h-4 w-4 text-[#FFB000]" /> Pago protegido</span></header>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
        <section className="rounded-[2rem] bg-white p-5 shadow-[0_24px_70px_rgba(30,25,18,.08)] sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#C47A00]">Checkout</p><h1 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-5xl">Completa tu compra.</h1><p className="mt-3 text-sm leading-6 text-black/50">El precio publicado ya incluye IVA. Solo añadimos despacho cuando corresponde.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2"><Field label="Nombre" value={name} set={setName} placeholder="Nombre y apellido" /><Field label="Correo" value={email} set={setEmail} placeholder="correo@ejemplo.cl" /><Field label="Teléfono" value={phone} set={setPhone} placeholder="+56 9..." /><label className="grid gap-2 text-xs font-black">Región<select value={region} onChange={(e) => setRegion(e.target.value)} className="min-h-12 rounded-2xl border border-black/10 bg-[#FAF7F0] px-4 outline-none"><option value="VII">Maule</option><option value="RM">Metropolitana</option><option value="V">Valparaíso</option><option value="VI">O'Higgins</option><option value="VIII">Biobío</option><option value="XVI">Ñuble</option></select></label></div>
          <label className="mt-4 grid gap-2 text-xs font-black">Dirección de despacho<textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} placeholder="Calle, número, comuna y referencia" className="rounded-2xl border border-black/10 bg-[#FAF7F0] p-4 outline-none" /></label>
          {error ? <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-3"><Trust icon={<ShieldCheck className="h-5 w-5" />} title="Pago seguro" /><Trust icon={<PackageCheck className="h-5 w-5" />} title="Orden registrada" /><Trust icon={<Truck className="h-5 w-5" />} title="Despacho coordinado" /></div>
        </section>
        <aside className="rounded-[2rem] bg-[#111214] p-5 text-white shadow-[0_30px_90px_rgba(0,0,0,.2)] sm:p-6 lg:sticky lg:top-4 lg:self-start"><div className="flex items-center gap-2 text-xs font-black"><ShoppingBag className="h-4 w-4 text-[#FFB000]" /> Resumen de compra</div><div className="mt-5 space-y-3">{items.map((item) => <div key={item.product.id} className="flex gap-3 rounded-2xl bg-white/[.045] p-3"><img src={getImage(item)} alt="" className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-black">{item.product.name}</p><p className="mt-1 text-xs text-white/45">Cantidad {item.quantity}</p></div><b className="text-sm">{CLP.format(discounted(item) * item.quantity)}</b></div>)}</div>
          <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm"><Row label="Productos" value={CLP.format(summary.subtotal)} /><Row label="Neto referencial" value={CLP.format(summary.neto)} muted /><Row label="IVA incluido (19%)" value={CLP.format(summary.iva)} muted /><Row label="Despacho" value={summary.despacho ? CLP.format(summary.despacho) : 'Gratis'} /><div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4"><span className="text-sm text-white/55">Total a pagar</span><b className="text-3xl text-[#FFB000]">{CLP.format(summary.total)}</b></div></div>
          <button disabled={!valid || state === 'creating'} onClick={() => void pay()} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB000] px-4 font-black text-black disabled:opacity-40">{state === 'creating' ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />} {state === 'creating' ? 'Creando pago seguro…' : 'Pagar con Mercado Pago'} <ChevronRight className="h-4 w-4" /></button>
          <p className="mt-3 text-center text-[10px] leading-5 text-white/35">No sumamos IVA sobre el precio publicado. El total mostrado aquí es el que enviamos a la pasarela.</p>
        </aside>
      </div></div>
  </main>;
}

function Brand({ branding }: { branding: ReturnType<typeof useTenantBranding>['branding'] }) { return <div className="flex min-w-0 items-center gap-3">{branding.logoUrl ? <img src={branding.logoUrl} alt={branding.name} className="h-10 w-14 rounded-lg object-contain" /> : <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFB000] font-black text-black">{branding.name.slice(0,2).toUpperCase()}</span>}<div className="min-w-0"><b className="block truncate text-sm">{branding.name}</b><span className="text-[9px] uppercase tracking-[.14em] opacity-45">Checkout seguro</span></div></div>; }
function Field({ label, value, set, placeholder }: { label: string; value: string; set: (v:string)=>void; placeholder: string }) { return <label className="grid gap-2 text-xs font-black">{label}<input value={value} onChange={(e)=>set(e.target.value)} placeholder={placeholder} className="min-h-12 rounded-2xl border border-black/10 bg-[#FAF7F0] px-4 outline-none" /></label>; }
function Row({ label, value, muted }: { label:string; value:string; muted?:boolean }) { return <div className={`flex justify-between gap-4 ${muted ? 'text-white/40' : 'text-white/70'}`}><span>{label}</span><b>{value}</b></div>; }
function Metric({ label, value }: { label:string; value:string }) { return <div className="rounded-2xl bg-white/[.045] p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">{label}</p><b className="mt-2 block text-xl">{value}</b></div>; }
function Trust({ icon, title }: { icon: React.ReactNode; title:string }) { return <div className="flex items-center gap-2 rounded-2xl bg-[#FAF7F0] p-3 text-xs font-black text-black/70"><span className="text-[#C47A00]">{icon}</span>{title}</div>; }
