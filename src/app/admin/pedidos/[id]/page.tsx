'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';
import {
  formatCLP,
  normalizeOrderRecord,
  ORDER_STATUS_LABELS,
  orderStatusColor,
  orderStatusLabel,
  type OrderStatus,
} from '@/lib/commerce';
import {
  ArrowLeft, MessageCircle, Truck, Package,
  CheckCircle, Clock, XCircle, Send, ExternalLink
} from 'lucide-react';

type Order = ReturnType<typeof normalizeOrderRecord>;

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  pendiente:      <Clock className="w-4 h-4" />,
  confirmado:     <CheckCircle className="w-4 h-4" />,
  en_preparacion: <Package className="w-4 h-4" />,
  enviado:        <Truck className="w-4 h-4" />,
  entregado:      <CheckCircle className="w-4 h-4" />,
  cancelado:      <XCircle className="w-4 h-4" />,
};

const CARRIERS = ['Chilexpress', 'Starken', 'Correos de Chile', 'Blue Express', 'DHL', 'Retiro en tienda'];

interface WaResult {
  link: string;
  message: string;
  phone: string;
}

export default function PedidoDetallePage() {
  const params  = useParams();
  const orderId = params?.id as string;

  const [order, setOrder]             = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);
  const [newStatus, setNewStatus]     = useState<OrderStatus>('pendiente');
  const [tracking, setTracking]       = useState('');
  const [carrier, setCarrier]         = useState('Chilexpress');
  const [shippingFee, setShippingFee] = useState(0);
  const [notes, setNotes]             = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [waResult, setWaResult]       = useState<WaResult | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const { data } = await insforge.database.from('orders').select('*').eq('id', orderId);
    if (data && Array.isArray(data) && data.length > 0) {
      const raw = data[0] as Record<string, unknown>;
      const o = normalizeOrderRecord(raw);
      setOrder(o);
      setNewStatus(o.status);
      setTracking(String(raw.tracking_number ?? ''));
      setCarrier(String(raw.carrier ?? 'Chilexpress'));
      setShippingFee(Number(raw.shipping_fee ?? 0));
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleUpdate = async () => {
    if (!order) return;
    setSaving(true);
    setError(null);
    setWaResult(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:         newStatus,
          tracking_number: tracking.trim() || undefined,
          carrier:         carrier,
          shipping_fee:    shippingFee,
          notes:           notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al actualizar');

      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
      if (json.whatsapp) setWaResult(json.whatsapp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Cargando pedido…</div>;
  }
  if (!order) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-zinc-400">
        <p>Pedido no encontrado.</p>
        <Link href="/admin/pedidos" className="text-yellow-400 underline text-sm">Volver a pedidos</Link>
      </div>
    );
  }

  const statusOrder: OrderStatus[] = ['pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado'];
  const currentIdx = statusOrder.indexOf(order.status);
  const shortId = order.id.slice(-6).toUpperCase();

  return (
    <div className="min-h-screen bg-black text-white pb-16">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-950 px-4 py-4 flex items-center gap-3">
        <Link href="/admin/pedidos" className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-bold">Pedido #{shortId}</h1>
          <p className="text-zinc-500 text-xs">{new Date(order.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="ml-auto">
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: orderStatusColor(order.status) + '22', color: orderStatusColor(order.status) }}>
            {orderStatusLabel(order.status)}
          </span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">

        {/* Timeline */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Progreso del pedido</h2>
          <div className="flex items-start gap-0">
            {statusOrder.map((s, i) => {
              const done    = i <= currentIdx;
              const current = i === currentIdx;
              return (
                <div key={s} className="flex-1 flex flex-col items-center gap-1 relative">
                  {i < statusOrder.length - 1 && (
                    <div className={`absolute top-4 left-1/2 w-full h-0.5 ${i < currentIdx ? 'bg-[#facc15]' : 'bg-zinc-700'}`} />
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    current ? 'border-[#facc15] bg-[#facc15]/20 text-[#facc15]' :
                    done    ? 'border-[#facc15] bg-[#facc15] text-black' :
                    'border-zinc-700 bg-zinc-800 text-zinc-600'
                  }`}>
                    {STATUS_ICONS[s]}
                  </div>
                  <span className={`text-center text-[10px] leading-tight mt-1 ${done ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {ORDER_STATUS_LABELS[s]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer info */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Cliente</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-zinc-500">Nombre</span>
            <span className="text-white">{order.customer_name || '—'}</span>
            <span className="text-zinc-500">Email</span>
            <span className="text-white">{order.customer_email || '—'}</span>
            <span className="text-zinc-500">Teléfono</span>
            <span className="text-white">{order.customer_phone || '—'}</span>
            <span className="text-zinc-500">Región</span>
            <span className="text-white">{order.region || '—'}</span>
            <span className="text-zinc-500">Dirección</span>
            <span className="text-white text-xs">{order.shipping_address || '—'}</span>
          </div>
        </div>

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Productos</h2>
            <div className="space-y-2">
              {order.items.map((item, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{item.name || 'Producto'} × {item.quantity ?? 1}</span>
                  <span className="text-white font-medium">{formatCLP(item.subtotal ?? Number(item.unitPrice ?? 0) * Number(item.quantity ?? 1))}</span>
                </div>
              ))}
              <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-bold">
                <span className="text-zinc-400">Total</span>
                <span className="text-[#facc15]">{formatCLP(order.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Update status */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actualizar estado</h2>

          {/* Status select */}
          <div className="grid grid-cols-3 gap-2">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setNewStatus(s)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  newStatus === s
                    ? 'border-[#facc15] text-[#facc15] bg-[#facc15]/10'
                    : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
                }`}
              >
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Tracking (show when enviado or entregado) */}
          {(newStatus === 'enviado' || newStatus === 'entregado') && (
            <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Transportista</label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
                  >
                    {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">N° de seguimiento</label>
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="Ej: CH1234567890"
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shipping fee */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Costo de envío (CLP)</label>
            <input
              type="number"
              value={shippingFee}
              onChange={(e) => setShippingFee(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nota interna (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Contactar al cliente antes de despachar"
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-[#facc15]/50"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleUpdate}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: '#facc15', color: '#000' }}
          >
            <Send className="w-4 h-4" />
            {saving ? 'Guardando…' : 'Actualizar pedido'}
          </button>
        </div>

        {/* WhatsApp notification */}
        {waResult && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Pedido actualizado · Notificar al cliente</span>
            </div>
            <p className="text-xs text-zinc-400 bg-zinc-900/50 rounded-xl p-3 font-mono whitespace-pre-wrap">
              {waResult.message}
            </p>
            <a
              href={waResult.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Enviar por WhatsApp
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
