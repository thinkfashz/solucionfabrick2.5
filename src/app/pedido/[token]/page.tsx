'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, Copy, Home, MapPin, PackageCheck, ShieldCheck, Truck, XCircle } from 'lucide-react';
import CustomerAccountInvite from '@/components/store/CustomerAccountInvite';

type TrackingItem = {
  nombre?: string;
  name?: string;
  productoId?: string;
  productId?: string;
  id?: string;
  cantidad?: number;
  quantity?: number;
  precioUnitario?: number;
  unitPrice?: number;
};

type OrderStatusResponse = {
  id: string;
  dispatchCode?: string;
  status: string;
  publicStatus: string;
  closed: boolean;
  createdAt: string;
  updatedAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  region?: string;
  shippingAddress?: string | null;
  trackingNumber?: string;
  carrier?: string;
  shippingNote?: string;
  items?: TrackingItem[];
  summary?: { subtotal?: number; iva?: number; despacho?: number; total?: number; moneda?: 'CLP' };
  deliveryEstimate?: string;
  message?: string;
  error?: string;
};

function clp(value?: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function dateCl(value?: string) {
  if (!value) return '-';
  try { return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return value; }
}

function itemName(item: TrackingItem) {
  return item.nombre || item.name || item.productoId || item.productId || item.id || 'Producto';
}

function itemId(item: TrackingItem) {
  return item.productoId || item.productId || item.id || '';
}

function itemQty(item: TrackingItem) {
  return Number(item.cantidad ?? item.quantity ?? 1) || 1;
}

function itemPrice(item: TrackingItem) {
  return Number(item.precioUnitario ?? item.unitPrice ?? 0) || 0;
}

function stepState(status: string, index: number) {
  const s = String(status || '').toLowerCase();
  const confirmed = ['pagada', 'confirmado', 'confirmada'].includes(s);
  const prep = confirmed || ['en_preparacion', 'preparacion', 'preparación', 'preparando'].includes(s);
  const route = prep || ['enviado', 'despachada', 'en_ruta', 'envio', 'envío'].includes(s);
  const delivered = ['entregado', 'entregada', 'delivered', 'entrega_confirmada'].includes(s);
  const failed = ['fallida', 'cancelado', 'cancelada', 'rechazada'].includes(s);
  if (failed) return index === 0 ? 'failed' : 'locked';
  if (index === 0 && (confirmed || prep || route || delivered)) return 'done';
  if (index === 1 && prep) return s === 'en_preparacion' || s.includes('prepar') ? 'active' : 'done';
  if (index === 2 && ['enviado', 'despachada', 'en_ruta', 'envio', 'envío'].includes(s)) return 'active';
  if (index === 2 && delivered) return 'done';
  if (index === 3 && delivered) return 'done';
  if (index === 0) return 'active';
  return 'locked';
}

function paymentIdFromSearch(params: URLSearchParams) {
  return params.get('payment_id') || params.get('collection_id') || params.get('id') || '';
}

function looksLikePaidReturn(params: URLSearchParams) {
  const status = `${params.get('payment_status') || ''} ${params.get('status') || ''} ${params.get('collection_status') || ''}`.toLowerCase();
  return status.includes('success') || status.includes('approved');
}

export default function OrderTrackingPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const token = params?.token || '';
  const [data, setData] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingPayment, setSyncingPayment] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const verifiedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const paymentId = paymentIdFromSearch(searchParams);
    const shouldVerify = Boolean(paymentId && looksLikePaidReturn(searchParams) && !verifiedRef.current);

    async function confirmPaymentReturn() {
      if (!shouldVerify) return;
      verifiedRef.current = true;
      setSyncingPayment(true);
      setSyncMessage('Sincronizando pago aprobado con Mercado Pago…');
      const res = await fetch('/api/orders/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, payment_id: paymentId }),
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo sincronizar el pago.');
      setSyncMessage(json.dispatchCode ? `Pago confirmado. Código de despacho: ${json.dispatchCode}` : 'Pago confirmado y pedido actualizado.');
    }

    async function load() {
      setLoading(true);
      try {
        await confirmPaymentReturn().catch((error) => {
          if (alive) setSyncMessage(error instanceof Error ? error.message : 'No se pudo sincronizar el pago.');
        });
        const res = await fetch(`/api/orders/status?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const json = await res.json() as OrderStatusResponse;
        if (alive) setData(json);
      } catch {
        if (alive) setData({ id: '', status: 'error', publicStatus: 'No disponible', closed: false, createdAt: '', error: 'No se pudo cargar el pedido.' });
      } finally {
        if (alive) {
          setLoading(false);
          setSyncingPayment(false);
        }
      }
    }
    void load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [token, searchParams]);

  const steps = useMemo(() => [
    { label: 'Pago', icon: ShieldCheck },
    { label: 'Preparación', icon: PackageCheck },
    { label: 'En camino', icon: Truck },
    { label: 'Entregado', icon: Home },
  ], []);

  async function copyCode() {
    if (!data?.dispatchCode) return;
    try {
      await navigator.clipboard.writeText(data.dispatchCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050403] px-4 py-6 text-white">
      <style>{`@keyframes pulseTrack{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.18);opacity:1}}.track-pulse{animation:pulseTrack 1.7s ease-in-out infinite}@keyframes truckDrive{0%{transform:translateX(-30%)}45%{transform:translateX(55%)}100%{transform:translateX(145%)}}.truck-drive{animation:truckDrive 5.2s ease-in-out infinite}@keyframes roadMove{from{background-position-x:0}to{background-position-x:120px}}.road-move{animation:roadMove 1.2s linear infinite}`}</style>
      <section className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.20),transparent_22rem),linear-gradient(145deg,#0b0a08,#050403)] p-5 shadow-[0_40px_120px_rgba(0,0,0,.7)] md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Soluciones Fabrick · seguimiento</p>
            <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.06em] md:text-7xl">Estado de tu pedido</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">Verifica compra, código de despacho, preparación, ruta y entrega en tiempo real.</p>
          </div>
        </div>

        {(syncingPayment || syncMessage) && (
          <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm ${syncMessage.toLowerCase().includes('no se pudo') ? 'border-red-400/25 bg-red-500/10 text-red-100' : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'}`}>
            {syncingPayment ? <Clock className="mr-2 inline h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 inline h-4 w-4" />}{syncMessage || 'Sincronizando pago…'}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-white/60"><Clock className="mx-auto mb-3 h-8 w-8 animate-spin text-yellow-300" />Cargando estado…</div>
        ) : data?.error ? (
          <div className="mt-5 rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center text-red-100"><XCircle className="mx-auto mb-3 h-8 w-8" />{data.error}</div>
        ) : data && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Orden</p>
                  <h2 className="mt-2 text-2xl font-black md:text-4xl">{data.id}</h2>
                  <p className="mt-2 text-white/50">Registrado: {dateCl(data.createdAt)}</p>
                </div>
                <span className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${data.closed ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-yellow-300/30 bg-yellow-300/10 text-yellow-200'}`}>{data.publicStatus}</span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button type="button" onClick={copyCode} className="rounded-[1.4rem] border border-yellow-300/25 bg-yellow-300/10 p-4 text-left sm:col-span-2">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300"><Copy className="h-3.5 w-3.5" />Código de despacho</p>
                  <b className="mt-2 block text-3xl tracking-[0.08em] text-yellow-300">{data.dispatchCode || 'Pendiente'}</b>
                  <span className="mt-1 block text-xs text-yellow-50/55">{copied ? 'Código copiado' : 'Toca para copiar y usarlo en verificación.'}</span>
                </button>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/35">Actualizado</p>
                  <b className="mt-2 block text-sm text-white/70">{dateCl(data.updatedAt || data.createdAt)}</b>
                </div>
              </div>

              <CityTruckAnimation status={data.publicStatus} />

              <div className="mt-8 grid gap-4 sm:grid-cols-4">
                {steps.map((step, i) => {
                  const state = stepState(data.status, i);
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className={`rounded-[1.4rem] border p-4 ${state === 'done' ? 'border-emerald-300/25 bg-emerald-300/10' : state === 'active' ? 'border-yellow-300/35 bg-yellow-300/10' : state === 'failed' ? 'border-red-400/35 bg-red-500/10' : 'border-white/10 bg-white/[0.035]'}`}>
                      <div className={`grid h-11 w-11 place-items-center rounded-2xl ${state === 'done' ? 'bg-emerald-400 text-black' : state === 'active' ? 'track-pulse bg-yellow-300 text-black' : state === 'failed' ? 'bg-red-500 text-white' : 'bg-white/8 text-zinc-500'}`}>
                        {state === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <b className="mt-3 block text-sm">{step.label}</b>
                      <p className="mt-1 text-xs text-white/42">{state === 'done' ? 'Completado' : state === 'active' ? 'Activo ahora' : state === 'failed' ? 'No aprobado' : 'Pendiente'}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm leading-7 text-yellow-50/80">{data.message || 'Seguimiento activo.'}</div>
              {(data.carrier || data.trackingNumber || data.shippingNote) && (
                <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-white/60">
                  <Truck className="mr-2 inline h-4 w-4 text-yellow-300" />
                  {data.carrier ? <span>Transportista: <b className="text-white">{data.carrier}</b>. </span> : null}
                  {data.trackingNumber ? <span>N° seguimiento: <b className="text-white">{data.trackingNumber}</b>. </span> : null}
                  {data.shippingNote ? <span>Nota: {data.shippingNote}</span> : null}
                </div>
              )}
              <CustomerAccountInvite token={token} order={data} />
            </section>

            <aside className="rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resumen</p>
              <h3 className="mt-2 text-2xl font-black">Compra</h3>
              <div className="mt-5 space-y-3">
                {(data.items || []).map((item, idx) => {
                  const id = itemId(item);
                  const qty = itemQty(item);
                  return <div key={`${id || itemName(item)}-${idx}`} className="border-b border-white/10 pb-3 text-sm">
                    <div className="flex gap-3">
                      <span className="flex-1 text-white/65">{qty} × {itemName(item)}</span>
                      <b>{clp(itemPrice(item) * qty)}</b>
                    </div>
                    {id && id !== 'sin-id' && id !== 'mp-recovery' ? <Link href={`/producto/${id}`} className="mt-2 inline-flex rounded-full border border-yellow-300/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">Ver producto en detalle</Link> : null}
                  </div>;
                })}
              </div>
              <div className="mt-5 space-y-2 text-sm">
                <Row label="Subtotal" value={clp(data.summary?.subtotal)} />
                <Row label="IVA referencial" value={clp(data.summary?.iva)} />
                <Row label="Despacho" value={clp(data.summary?.despacho)} />
                <Row label="Total" value={clp(data.summary?.total)} strong />
              </div>
              <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4 text-xs leading-6 text-white/48">
                <MapPin className="mr-2 inline h-4 w-4 text-yellow-300" />Entrega estimada: <b className="text-white">{data.deliveryEstimate}</b>{data.shippingAddress ? <><br />Dirección: {data.shippingAddress}</> : null}
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

function CityTruckAnimation({ status }: { status: string }) {
  return <div className="relative mt-7 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[linear-gradient(180deg,rgba(250,204,21,.10),rgba(255,255,255,.025))] p-4">
    <div className="relative h-36 overflow-hidden rounded-[1.3rem] bg-[linear-gradient(180deg,#12100b,#050505)]">
      <div className="absolute bottom-14 left-5 h-16 w-10 rounded-t-xl bg-yellow-300/10" />
      <div className="absolute bottom-14 left-20 h-24 w-14 rounded-t-xl bg-white/8" />
      <div className="absolute bottom-14 left-40 h-20 w-12 rounded-t-xl bg-yellow-300/10" />
      <div className="absolute bottom-14 right-12 h-28 w-16 rounded-t-xl bg-white/8" />
      <div className="road-move absolute bottom-8 h-8 w-full bg-[repeating-linear-gradient(90deg,rgba(250,204,21,.55)_0_18px,transparent_18px_42px)] opacity-80" />
      <div className="absolute bottom-0 h-10 w-full bg-black/60" />
      <div className="truck-drive absolute bottom-8 left-0 text-5xl drop-shadow-[0_12px_28px_rgba(250,204,21,.45)]">🚚</div>
    </div>
    <p className="mt-3 text-xs leading-6 text-white/50"><Truck className="mr-2 inline h-4 w-4 text-yellow-300" />Estado actual: <b className="text-white">{status}</b>. Tu pedido avanza por etapas: pago, preparación, ruta y entrega.</p>
  </div>;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? 'text-xl font-black text-white' : 'text-white/62'}`}><span>{label}</span><span>{value}</span></div>;
}
