'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, CheckCircle2, Clock, Mail, MapPin, PackageCheck, RefreshCcw, Send, Trash2, Truck, UserRound } from 'lucide-react';
import { formatCLP, ORDER_STATUS_LABELS, orderStatusColor, type OrderStatus } from '@/lib/commerce';

type QueueItem = { productId?: string; name: string; quantity: number; unitPrice: number; subtotal: number };

type QueueOrder = {
  id: string;
  dispatch_code?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  region: string;
  shipping_address: string;
  items: QueueItem[];
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  payment_id: string;
  payment_status: string;
  tracking_number?: string;
  carrier?: string;
  shipping_notes?: string;
  status_email_sent_at?: string;
  status_email_last_status?: string;
};

type PatchResult = {
  ok?: boolean;
  error?: string;
  newStatus?: OrderStatus;
  dispatchCode?: string;
  strippedMissingColumns?: boolean;
  delivery?: { ok?: boolean; warning?: string };
  email?: { ok?: boolean; id?: string; error?: string; simulated?: boolean } | null;
};

const CARRIERS = ['Chilexpress', 'Starken', 'Correos de Chile', 'Blue Express', 'DHL', 'Retiro en tienda'];
const STATUS_FLOW: OrderStatus[] = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'];

function dateCl(value: string) {
  try { return new Date(value).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return value || '—'; }
}

function shortId(id: string) { return id.slice(-8).toUpperCase(); }
function countItems(order: QueueOrder) { return order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0); }
function validProductId(id?: string) { return Boolean(id && id !== 'sin-id' && id !== 'mp-recovery'); }

export default function AdminDespachosPage() {
  const [orders, setOrders] = useState<QueueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Record<string, OrderStatus>>({});
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [carrier, setCarrier] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notifyEmail, setNotifyEmail] = useState<Record<string, boolean>>({});

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/orders?scope=shipping&limit=120', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los pedidos.');
      const next = (json.orders || []) as QueueOrder[];
      setOrders(next);
      setSelectedStatus((prev) => {
        const copy = { ...prev };
        next.forEach((o) => { if (!copy[o.id]) copy[o.id] = o.status; });
        return copy;
      });
      setTracking((prev) => {
        const copy = { ...prev };
        next.forEach((o) => { if (copy[o.id] === undefined) copy[o.id] = o.tracking_number || ''; });
        return copy;
      });
      setCarrier((prev) => {
        const copy = { ...prev };
        next.forEach((o) => { if (copy[o.id] === undefined) copy[o.id] = o.carrier || 'Chilexpress'; });
        return copy;
      });
      setNotifyEmail((prev) => {
        const copy = { ...prev };
        next.forEach((o) => { if (copy[o.id] === undefined) copy[o.id] = true; });
        return copy;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const stats = useMemo(() => ({
    total: orders.length,
    pendientes: orders.filter((o) => o.status === 'pendiente' || o.status === 'confirmado').length,
    preparacion: orders.filter((o) => o.status === 'en_preparacion').length,
    enviados: orders.filter((o) => o.status === 'enviado').length,
  }), [orders]);

  async function updateOrder(order: QueueOrder) {
    setSavingId(order.id);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedStatus[order.id] || order.status,
          carrier: carrier[order.id] || order.carrier || 'Chilexpress',
          tracking_number: tracking[order.id] || '',
          notes: notes[order.id] || '',
          shipping_fee: order.shipping_fee || 0,
          notify_email: notifyEmail[order.id] ?? true,
        }),
      });
      const json = await res.json() as PatchResult;
      if (!res.ok) throw new Error(json.error || 'No se pudo actualizar el pedido.');
      const codeTxt = json.dispatchCode ? ` Código: ${json.dispatchCode}.` : '';
      const emailTxt = json.email?.ok ? ' Correo enviado al cliente.' : json.email?.simulated ? ' Correo simulado por falta de Resend.' : json.email?.error ? ` Correo no enviado: ${json.email.error}` : '';
      const warning = json.strippedMissingColumns ? ' Ejecuta Setup Tables para guardar transportista/tracking/código en base de datos.' : '';
      setMessage(`Pedido ${shortId(order.id)} actualizado.${codeTxt}${emailTxt}${warning}`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el pedido.');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteOrder(order: QueueOrder) {
    const ok = window.confirm(`¿Eliminar/cancelar el pedido ${shortId(order.id)}? Esta acción lo quitará de la cola.`);
    if (!ok) return;
    setDeletingId(order.id);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo eliminar el pedido.');
      setMessage(`Pedido ${shortId(order.id)} eliminado/cancelado.`);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el pedido.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#050403] pb-28 text-white">
      <section className="sticky top-0 z-20 border-b border-yellow-300/10 bg-black/85 px-4 py-5 backdrop-blur-xl md:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Despacho y logística</p>
              <h1 className="mt-2 text-3xl font-black leading-none tracking-[-0.06em] md:text-5xl">Pedidos por enviar</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">Controla cliente, productos, código de despacho, estado, tracking y correo por Resend.</p>
            </div>
            <button onClick={loadOrders} disabled={loading} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-yellow-300 active:scale-95 disabled:opacity-50" title="Actualizar">
              <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            <Stat label="Cola" value={stats.total} />
            <Stat label="Pend." value={stats.pendientes} />
            <Stat label="Prep." value={stats.preparacion} />
            <Stat label="En ruta" value={stats.enviados} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 md:px-8">
        {message && <div className="mb-4 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</div>}
        {error && <div className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        {loading ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center text-white/45"><Clock className="mx-auto mb-3 h-7 w-7 animate-spin text-yellow-300" />Cargando pedidos pendientes…</div>
        ) : orders.length === 0 ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center text-white/45"><PackageCheck className="mx-auto mb-3 h-8 w-8 text-yellow-300" />No hay pedidos pendientes de envío.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => {
              const status = selectedStatus[order.id] || order.status;
              const itemCount = countItems(order);
              return (
                <article key={order.id} className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.12),transparent_16rem),rgba(255,255,255,.035)] shadow-[0_24px_80px_rgba(0,0,0,.32)]">
                  <div className="border-b border-white/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-yellow-300">#{shortId(order.id)}</p>
                        <h2 className="mt-1 truncate text-xl font-black">{order.customer_name || 'Cliente sin nombre'}</h2>
                        <p className="mt-1 truncate text-xs text-white/45">{order.customer_email || 'Sin correo'} · {order.customer_phone || 'Sin teléfono'}</p>
                      </div>
                      <span className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest" style={{ background: `${orderStatusColor(order.status)}22`, color: orderStatusColor(order.status) }}>{ORDER_STATUS_LABELS[order.status]}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <Info icon={<Clock className="h-4 w-4" />} label="Cuándo pidió" value={dateCl(order.created_at)} />
                      <Info icon={<MapPin className="h-4 w-4" />} label="Dónde enviar" value={order.region || 'Sin región'} />
                      <Info icon={<UserRound className="h-4 w-4" />} label="Dirección" value={order.shipping_address || 'Sin dirección'} wide />
                      <Info icon={<PackageCheck className="h-4 w-4" />} label="Detalle" value={`${itemCount} producto${itemCount === 1 ? '' : 's'} · ${formatCLP(order.total)}`} />
                      <Info icon={<Truck className="h-4 w-4" />} label="Código despacho" value={order.dispatch_code || 'Se genera al confirmar'} wide />
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="rounded-2xl border border-white/10 bg-black/35 p-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Productos</p>
                      <div className="space-y-3">
                        {order.items.slice(0, 4).map((item, index) => (
                          <div key={`${order.id}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <span className="text-white/70">{item.quantity} × {item.name}</span>
                              <b className="text-white">{formatCLP(item.subtotal)}</b>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {validProductId(item.productId) && <Link href={`/producto/${item.productId}`} className="rounded-full border border-yellow-300/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-yellow-300">Ver producto</Link>}
                              {validProductId(item.productId) && <Link href={`/admin/productos/${item.productId}/editar`} className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/50">Editar</Link>}
                            </div>
                          </div>
                        ))}
                        {order.items.length > 4 && <p className="text-xs text-white/35">+ {order.items.length - 4} producto(s) más en detalle</p>}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Estado del envío</span><select value={status} onChange={(e) => setSelectedStatus((prev) => ({ ...prev, [order.id]: e.target.value as OrderStatus }))} className="w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm font-bold outline-none focus:border-yellow-300/60">{STATUS_FLOW.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}</select></label>
                      <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Transportista</span><select value={carrier[order.id] || order.carrier || 'Chilexpress'} onChange={(e) => setCarrier((prev) => ({ ...prev, [order.id]: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm font-bold outline-none focus:border-yellow-300/60">{CARRIERS.map((c) => <option key={c}>{c}</option>)}</select></label>
                      <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Número de seguimiento</span><input value={tracking[order.id] || ''} onChange={(e) => setTracking((prev) => ({ ...prev, [order.id]: e.target.value }))} placeholder="Ej: CH1234567890" className="w-full rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm font-bold outline-none placeholder:text-white/22 focus:border-yellow-300/60" /></label>
                      <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] font-black uppercase tracking-[0.22em] text-white/35">Nota para el correo / interna</span><textarea value={notes[order.id] || ''} onChange={(e) => setNotes((prev) => ({ ...prev, [order.id]: e.target.value }))} rows={2} placeholder="Ej: El pedido sale hoy por la tarde." className="w-full resize-none rounded-2xl border border-white/10 bg-black px-3 py-3 text-sm font-bold outline-none placeholder:text-white/22 focus:border-yellow-300/60" /></label>
                    </div>

                    <label className="flex items-center justify-between gap-3 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-sm"><span className="flex items-center gap-2"><Mail className="h-4 w-4 text-yellow-300" />Enviar correo al cliente con Resend</span><input type="checkbox" checked={notifyEmail[order.id] ?? true} onChange={(e) => setNotifyEmail((prev) => ({ ...prev, [order.id]: e.target.checked }))} className="h-5 w-5 accent-yellow-300" /></label>

                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <button onClick={() => updateOrder(order)} disabled={savingId === order.id} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-black disabled:opacity-50"><Send className="h-4 w-4" />{savingId === order.id ? 'Guardando…' : 'Guardar'}</button>
                      <Link href={`/admin/pedidos/${order.id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white/80">Detalle <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                    <button onClick={() => deleteOrder(order)} disabled={deletingId === order.id} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100 disabled:opacity-50"><Trash2 className="h-4 w-4" />{deletingId === order.id ? 'Eliminando…' : 'Eliminar / cancelar pedido'}</button>

                    {order.status_email_sent_at && <p className="text-[11px] text-emerald-200/75"><Bell className="mr-1 inline h-3.5 w-3.5" />Último correo: {dateCl(order.status_email_sent_at)}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p><b className="mt-1 block text-2xl text-yellow-300">{value}</b></div>;
}

function Info({ icon, label, value, wide }: { icon: ReactNode; label: string; value: string; wide?: boolean }) {
  return <div className={`rounded-2xl border border-white/10 bg-black/30 p-3 ${wide ? 'col-span-2' : ''}`}><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/35">{icon}{label}</p><p className="mt-1 line-clamp-2 text-xs font-bold text-white/75">{value}</p></div>;
}
