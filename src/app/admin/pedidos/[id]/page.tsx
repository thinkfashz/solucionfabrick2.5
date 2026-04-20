'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import {
  deliveryStatusFromOrderStatus,
  formatCLP,
  normalizeOrderRecord,
  ORDER_STATUS_LABELS,
  orderStatusColor,
  orderStatusLabel,
  type OrderStatus,
} from '@/lib/commerce';

type Order = ReturnType<typeof normalizeOrderRecord>;

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export default function PedidoDetallePage() {
  const params  = useParams();
  const router  = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder]         = useState<Order | null>(null);
  const [loading, setLoading]     = useState(true);
  const [newStatus, setNewStatus] = useState<OrderStatus>('pendiente');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [warning, setWarning]     = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const { data, error: fetchErr } = await insforge.database
      .from('orders')
      .select('*')
      .eq('id', orderId);

    if (!fetchErr && data && Array.isArray(data) && data.length > 0) {
      const o = normalizeOrderRecord(data[0] as Record<string, unknown>);
      setOrder(o);
      setNewStatus(o.status);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleUpdateStatus = async () => {
    if (!order) return;
    setSaving(true);
    setError(null);
    setWarning(null);
    setSaved(false);

    // 1. Update order status
    const { error: updateErr } = await insforge.database
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);

    if (updateErr) {
      setError(`Error al actualizar estado: ${updateErr.message}`);
      setSaving(false);
      return;
    }

    // Reflect the new status immediately in the UI
    setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);

    // 2. Upsert delivery record — only include notes/address when non-empty to avoid overwriting existing values
    const deliveryBase = {
      order_id:      order.id,
      customer_name: order.customer_name,
      status:        deliveryStatusFromOrderStatus(newStatus),
      updated_at:    new Date().toISOString(),
    };

    const deliveryPayload = {
      ...deliveryBase,
      ...(order.shipping_address ? { address: order.shipping_address } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    const { data: existingDelivery, error: deliverySelectErr } = await insforge.database
      .from('deliveries')
      .select('id')
      .eq('order_id', order.id);

    if (deliverySelectErr) {
      setWarning(`Estado actualizado, pero falló verificar entrega existente: ${deliverySelectErr.message}`);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      return;
    }

    if (existingDelivery && Array.isArray(existingDelivery) && existingDelivery.length > 0) {
      const { error: deliveryUpdateErr } = await insforge.database
        .from('deliveries')
        .update(deliveryPayload)
        .eq('order_id', order.id);
      if (deliveryUpdateErr) {
        setWarning(`Estado actualizado, pero falló sincronizar entrega: ${deliveryUpdateErr.message}`);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }
    } else {
      const { error: deliveryInsertErr } = await insforge.database
        .from('deliveries')
        .insert([{ ...deliveryPayload, address: deliveryPayload.address ?? '', created_at: new Date().toISOString() }]);
      if (deliveryInsertErr) {
        setWarning(`Estado actualizado, pero falló crear registro de entrega: ${deliveryInsertErr.message}`);
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }
    }

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Cargando pedido…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-zinc-400">
        <p>Pedido no encontrado.</p>
        <Link href="/admin/pedidos" className="text-yellow-400 underline text-sm">Volver a pedidos</Link>
      </div>
    );
  }

  const items = order.items;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-6 md:px-12">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/pedidos')}
                className="text-zinc-500 hover:text-yellow-400 transition text-sm"
              >
                ← Pedidos
              </button>
              <span className="text-zinc-700">/</span>
              <p className="font-mono text-xs text-zinc-400">{order.id.slice(-8).toUpperCase()}</p>
            </div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight">Detalle del Pedido</h1>
          </div>
          <span
            className="inline-flex items-center rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
            style={{
              background: `${orderStatusColor(order.status)}22`,
              color: orderStatusColor(order.status),
            }}
          >
            {orderStatusLabel(order.status)}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8 md:px-12 space-y-6">
        {/* Info cliente */}
        <section className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 md:p-8">
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Información del Cliente</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nombre</dt>
              <dd className="mt-1 text-sm font-semibold">{order.customer_name}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Email</dt>
              <dd className="mt-1 text-sm text-zinc-300">{order.customer_email}</dd>
            </div>
            {order.customer_phone && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Teléfono</dt>
                <dd className="mt-1 text-sm text-zinc-300">{order.customer_phone}</dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Región</dt>
              <dd className="mt-1 text-sm text-zinc-300">{order.region}</dd>
            </div>
            {order.shipping_address && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dirección de despacho</dt>
                <dd className="mt-1 text-sm text-zinc-300">{order.shipping_address}</dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fecha del pedido</dt>
              <dd className="mt-1 text-sm text-zinc-300">
                {new Date(order.created_at).toLocaleDateString('es-CL', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </dd>
            </div>
          </dl>
        </section>

        {/* Productos */}
        <section className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] overflow-hidden">
          <div className="p-6 md:p-8 pb-0">
            <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Productos del Pedido</h2>
          </div>
          {items.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-zinc-500">Sin productos registrados.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-white/5">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Producto</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cant.</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Precio Unit.</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-6 py-3 text-zinc-200">{item.name}</td>
                        <td className="px-6 py-3 text-center text-zinc-300">{item.quantity}</td>
                        <td className="px-6 py-3 text-right text-zinc-300">{formatCLP(item.unitPrice)}</td>
                        <td className="px-6 py-3 text-right font-semibold text-white">{formatCLP(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-white/5 px-6 py-5 md:px-8 space-y-2">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatCLP(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>IVA (19%)</span>
                  <span>{formatCLP(order.tax)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Despacho</span>
                  <span>{formatCLP(order.shipping_fee)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2 font-bold text-white">
                  <span>Total</span>
                  <span className="text-yellow-400">{formatCLP(order.total)}</span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Cambio de estado */}
        <section className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6 md:p-8">
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Actualizar Estado</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Nuevo estado
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-yellow-400/50"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Notas internas
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Agrega notas sobre el pedido o la entrega…"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-yellow-400/50 resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
          )}
          {warning && (
            <p className="mt-3 rounded-xl bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">{warning}</p>
          )}
          {saved && !warning && (
            <p className="mt-3 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-400">
              Estado actualizado correctamente.
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={handleUpdateStatus}
              disabled={saving || newStatus === order.status}
              className="rounded-full bg-yellow-400 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando…' : 'Actualizar Estado'}
            </button>
            <Link
              href="/admin/entregas"
              className="rounded-full border border-white/10 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-400"
            >
              Ver Entregas
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}