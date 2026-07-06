'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCLP, normalizeOrderRecord, ORDER_STATUS_LABELS, orderStatusColor, orderStatusLabel, type OrderStatus } from '@/lib/commerce';
import { ArrowLeft, CheckCircle, Clock, Home, Package, Send, Truck, XCircle } from 'lucide-react';

type Order = ReturnType<typeof normalizeOrderRecord>;
type Shipment = { tracking_number?: string | null; carrier?: string | null; status?: string | null; destination?: string | null; events?: Array<{ label?: string; description?: string }> };

const statuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
const carriers = ['Chilexpress', 'Starken', 'Correos de Chile', 'Blue Express', 'DHL', 'Retiro en tienda'];
const icons: Record<OrderStatus, React.ReactNode> = {
  pendiente: <Clock className="h-4 w-4" />,
  confirmado: <CheckCircle className="h-4 w-4" />,
  en_preparacion: <Package className="h-4 w-4" />,
  enviado: <Truck className="h-4 w-4" />,
  entregado: <CheckCircle className="h-4 w-4" />,
  cancelado: <XCircle className="h-4 w-4" />,
};

function clean(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export default function PedidoDetallePage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pendiente');
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState('Chilexpress');
  const [shippingFee, setShippingFee] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    if (!orderId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Pedido no encontrado');
      const o = normalizeOrderRecord(json.order || {});
      const s = (json.shipment || null) as Shipment | null;
      setOrder(o);
      setShipment(s);
      setStatus(o.status);
      setTracking(clean(s?.tracking_number, clean((json.order || {}).tracking_number)));
      setCarrier(clean(s?.carrier, clean((json.order || {}).carrier, 'Chilexpress')));
      setShippingFee(Number((json.order || {}).shipping_fee || 0));
    } catch (err) {
      setOrder(null);
      setError(err instanceof Error ? err.message : 'No se pudo cargar el pedido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orderId]);

  async function save() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, tracking_number: tracking, carrier, shipping_fee: shippingFee, notes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo actualizar');
      setMessage(`Actualizado. Seguimiento: ${json.trackingNumber || tracking || 'pendiente'}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-black text-zinc-500">Cargando pedido...</main>;

  if (!order) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-center text-zinc-400">
        <div className="space-y-4">
          <p>{error || 'Pedido no encontrado.'}</p>
          <p className="text-xs text-zinc-600">ID: {orderId}</p>
          <button onClick={load} className="rounded-xl border border-yellow-400/30 px-4 py-2 text-sm text-yellow-300">Reintentar</button>
          <Link href="/admin/pedidos" className="block text-sm text-yellow-400 underline">Volver a pedidos</Link>
        </div>
      </main>
    );
  }

  const steps: OrderStatus[] = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado'];
  const index = Math.max(0, steps.indexOf(order.status));
  const progress = order.status === 'cancelado' ? 8 : Math.min(100, Math.max(8, (index / (steps.length - 1)) * 100));

  return (
    <main className="min-h-screen bg-black pb-20 text-white">
      <header className="flex items-center gap-3 border-b border-white/10 bg-zinc-950 px-4 py-4">
        <Link href="/admin/pedidos" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="font-bold">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
          <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString('es-CL')}</p>
        </div>
        <span className="ml-auto rounded-full px-3 py-1 text-xs font-bold" style={{ background: `${orderStatusColor(order.status)}22`, color: orderStatusColor(order.status) }}>{orderStatusLabel(order.status)}</span>
      </header>

      <section className="mx-auto max-w-4xl space-y-4 p-4">
        <div className="rounded-[28px] border border-yellow-300/20 bg-zinc-950 p-5 shadow-2xl shadow-black">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300/80">Ruta de envío</p>
              <h2 className="mt-1 text-xl font-black">Estado logístico</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
              <p className="text-[9px] uppercase tracking-widest text-zinc-500">Transportista</p>
              <p className="text-xs font-bold">{carrier}</p>
            </div>
          </div>

          <div className="relative h-44 overflow-hidden rounded-3xl border border-white/10 bg-black">
            <div className="absolute left-0 right-0 top-[90px] h-16 -skew-y-2 bg-zinc-800" />
            <div className="absolute left-0 right-0 top-[117px] h-1 -skew-y-2 bg-yellow-300" />
            <div className="absolute left-5 top-9 text-zinc-300"><Package className="h-8 w-8" /><p className="mt-1 text-[10px] font-bold">Bodega</p></div>
            <div className="absolute right-5 top-9 text-yellow-200"><Home className="h-8 w-8" /><p className="mt-1 text-[10px] font-bold">Cliente</p></div>
            <div className="absolute top-[95px] -translate-x-1/2 transition-all duration-700" style={{ left: `${progress}%` }}>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black shadow-[0_0_28px_rgba(250,204,21,0.45)]"><Truck className="h-6 w-6" /></div>
            </div>
            <div className="absolute inset-x-5 bottom-4 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-300" style={{ width: `${progress}%` }} /></div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">Seguimiento</p><p className="mt-2 break-all font-mono text-sm">{tracking || 'Pendiente'}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-[10px] uppercase tracking-widest text-zinc-500">Destino</p><p className="mt-2 text-sm">{shipment?.destination || order.shipping_address || 'Pendiente'}</p></div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">Cliente</h2>
            <p className="text-sm"><b>Nombre:</b> {order.customer_name || '—'}</p>
            <p className="text-sm"><b>Email:</b> {order.customer_email || '—'}</p>
            <p className="text-sm"><b>Teléfono:</b> {order.customer_phone || '—'}</p>
            <p className="text-sm"><b>Dirección:</b> {order.shipping_address || '—'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">Productos</h2>
            {order.items.map((item, i) => <div key={i} className="mb-2 flex justify-between rounded-xl bg-black/30 p-3 text-sm"><span>{item.name} x {item.quantity}</span><span>{formatCLP(item.subtotal)}</span></div>)}
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-bold"><span>Total</span><span className="text-yellow-300">{formatCLP(order.total)}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Actualizar estado</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{statuses.map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${status === s ? 'border-yellow-300 bg-yellow-300/10 text-yellow-300' : 'border-white/10 text-zinc-400'}`}>{icons[s]}<span className="ml-1">{ORDER_STATUS_LABELS[s]}</span></button>)}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm">{carriers.map((c) => <option key={c}>{c}</option>)}</select>
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="N° seguimiento" className="rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm" />
          </div>
          <input type="number" value={shippingFee} onChange={(e) => setShippingFee(Number(e.target.value))} placeholder="Costo envío" className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota interna" className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2 text-sm" />
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
          {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}
          <button onClick={save} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-300 py-3 text-sm font-bold text-black disabled:opacity-50"><Send className="h-4 w-4" />{saving ? 'Guardando...' : 'Actualizar pedido'}</button>
        </div>
      </section>
    </main>
  );
}
