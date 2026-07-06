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
  CheckCircle, Clock, XCircle, Send, ExternalLink, ShoppingCart, Copy, MapPin, Home, Navigation,
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

interface ItemSourceInfo {
  sourceUrl: string | null;
  source: string | null;
}

const SHIPPING_STEPS: Array<{ status: OrderStatus; label: string; detail: string }> = [
  { status: 'pendiente', label: 'Pedido recibido', detail: 'Solicitud registrada en el sistema' },
  { status: 'confirmado', label: 'Pago confirmado', detail: 'Orden lista para preparación' },
  { status: 'en_preparacion', label: 'Preparando', detail: 'Producto y datos de despacho en revisión' },
  { status: 'enviado', label: 'En camino', detail: 'Pedido viajando hacia el cliente' },
  { status: 'entregado', label: 'Entregado', detail: 'Cliente recibió su compra' },
];

function ShippingRoad({ order, tracking, carrier }: { order: Order; tracking: string; carrier: string }) {
  const currentIdx = Math.max(0, SHIPPING_STEPS.findIndex((s) => s.status === order.status));
  const progress = order.status === 'cancelado' ? 8 : Math.min(100, Math.max(8, (currentIdx / (SHIPPING_STEPS.length - 1)) * 100));
  const isMoving = order.status === 'enviado' || order.status === 'en_preparacion';
  const isDelivered = order.status === 'entregado';
  const isCancelled = order.status === 'cancelado';

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-yellow-300/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black p-5 shadow-2xl shadow-black/40">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.18),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-10 h-36 w-36 rounded-full bg-yellow-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300/80">Ruta de envío</p>
            <h2 className="mt-1 text-xl font-black text-white">Estado logístico del pedido</h2>
            <p className="mt-1 text-xs text-zinc-400">
              {isCancelled ? 'Este pedido fue cancelado.' : isDelivered ? 'El pedido llegó a destino.' : 'Seguimiento visual del avance hasta la entrega.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-right">
            <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-500">Transportista</p>
            <p className="text-xs font-bold text-white">{carrier || 'Por definir'}</p>
          </div>
        </div>

        <div className="relative h-44 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/45">
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-500/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-950/50 to-transparent" />

          <div className="absolute left-0 right-0 top-[88px] h-16 -skew-y-2 bg-zinc-800 shadow-inner" />
          <div className="absolute left-0 right-0 top-[116px] h-1 -skew-y-2 overflow-hidden bg-yellow-300/80">
            <div className="h-full w-[200%] bg-[repeating-linear-gradient(90deg,transparent_0_24px,rgba(0,0,0,0.4)_24px_36px)] [animation:road-lines_1.2s_linear_infinite]" />
          </div>
          <div className="absolute left-0 right-0 top-[130px] h-10 -skew-y-2 bg-zinc-950/70" />

          <div className="absolute left-5 top-9 flex flex-col items-center gap-1 text-zinc-300">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/10"><Package className="h-5 w-5" /></span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Bodega</span>
          </div>
          <div className="absolute right-5 top-7 flex flex-col items-center gap-1 text-yellow-200">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-yellow-300/30 bg-yellow-300/10"><Home className="h-5 w-5" /></span>
            <span className="max-w-[88px] text-center text-[10px] font-bold uppercase tracking-widest">Cliente</span>
          </div>

          <div className="absolute top-[95px] z-20 -translate-x-1/2 transition-all duration-700" style={{ left: `${progress}%` }}>
            <div className={`${isMoving ? 'animate-bounce' : ''} relative grid h-12 w-12 place-items-center rounded-2xl border border-yellow-300/45 bg-yellow-300 text-black shadow-[0_0_28px_rgba(250,204,21,0.45)]`}>
              {isCancelled ? <XCircle className="h-6 w-6" /> : isDelivered ? <CheckCircle className="h-6 w-6" /> : <Truck className="h-6 w-6" />}
              <span className="absolute -bottom-1 left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-black/35 blur-sm" />
            </div>
          </div>

          <div className="absolute inset-x-5 bottom-4 z-10 h-2 rounded-full bg-white/10">
            <div className={`h-full rounded-full ${isCancelled ? 'bg-red-400' : 'bg-gradient-to-r from-yellow-500 to-emerald-400'} transition-all duration-700`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-5">
          {SHIPPING_STEPS.map((step, index) => {
            const done = !isCancelled && index <= currentIdx;
            const active = !isCancelled && index === currentIdx;
            return (
              <div key={step.status} className={`rounded-2xl border p-3 ${active ? 'border-yellow-300/55 bg-yellow-300/10' : done ? 'border-emerald-400/25 bg-emerald-400/8' : 'border-white/10 bg-white/[0.035]'}`}>
                <div className={`mb-2 grid h-8 w-8 place-items-center rounded-xl ${done ? 'bg-yellow-300 text-black' : 'bg-white/10 text-zinc-500'}`}>
                  {STATUS_ICONS[step.status]}
                </div>
                <p className="text-[11px] font-black text-white">{step.label}</p>
                <p className="mt-1 text-[10px] leading-snug text-zinc-500">{step.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"><Navigation className="h-3.5 w-3.5" /> Seguimiento</p>
            <p className="mt-2 font-mono text-sm text-white">{tracking || 'Pendiente de asignar'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"><MapPin className="h-3.5 w-3.5" /> Destino</p>
            <p className="mt-2 line-clamp-2 text-sm text-white">{order.shipping_address || order.region || 'Dirección pendiente'}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes road-lines {
          from { transform: translateX(0); }
          to { transform: translateX(-72px); }
        }
      `}</style>
    </div>
  );
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
  const [itemSources, setItemSources] = useState<Record<string, ItemSourceInfo>>({});
  const [copyState, setCopyState]     = useState<'idle' | 'copied' | 'error'>('idle');

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

      const productIds = Array.from(
        new Set(
          o.items
            .map((it) => it.productId)
            .filter((id): id is string => typeof id === 'string' && id !== '' && id !== 'sin-id'),
        ),
      );
      if (productIds.length > 0) {
        try {
          const { data: prods, error: prodsErr } = await insforge.database
            .from('products')
            .select('id, source, source_url')
            .in('id', productIds);
          if (!prodsErr && Array.isArray(prods)) {
            const map: Record<string, ItemSourceInfo> = {};
            for (const row of prods as Array<{ id?: string; source?: string | null; source_url?: string | null }>) {
              if (row.id) {
                map[row.id] = {
                  sourceUrl: row.source_url ?? null,
                  source: row.source ?? null,
                };
              }
            }
            setItemSources(map);
          }
        } catch { /* ignore */ }
      }
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const buildShippingClipboard = useCallback((o: Order): string => {
    const lines = [
      o.customer_name || '',
      o.shipping_address || '',
      o.region ? `Región: ${o.region}` : '',
      o.customer_phone ? `Tel: ${o.customer_phone}` : '',
      o.customer_email ? `Email: ${o.customer_email}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  }, []);

  const handleProcure = useCallback(async (sourceUrl: string) => {
    if (!order) return;
    setCopyState('idle');
    const text = buildShippingClipboard(order);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopyState('copied');
      }
    } catch {
      setCopyState('error');
    }
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => setCopyState('idle'), 4000);
  }, [order, buildShippingClipboard]);

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

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">
        <ShippingRoad order={order} tracking={tracking} carrier={carrier} />

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

        <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Cliente</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-zinc-500">Nombre</span>
              <span className="text-white">{order.customer_name || '—'}</span>
              <span className="text-zinc-500">Email</span>
              <span className="text-white break-all">{order.customer_email || '—'}</span>
              <span className="text-zinc-500">Teléfono</span>
              <span className="text-white">{order.customer_phone || '—'}</span>
              <span className="text-zinc-500">Región</span>
              <span className="text-white">{order.region || '—'}</span>
              <span className="text-zinc-500">Dirección</span>
              <span className="text-white text-xs">{order.shipping_address || '—'}</span>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Productos</h2>
              {copyState === 'copied' && (
                <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5" />
                  Dirección del cliente copiada al portapapeles. Pégala en el checkout del proveedor.
                </div>
              )}
              {copyState === 'error' && (
                <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  No se pudo copiar al portapapeles automáticamente. Copia la dirección manualmente desde la sección Cliente.
                </div>
              )}
              <div className="space-y-3">
                {order.items.map((item, i: number) => {
                  const src = itemSources[item.productId];
                  const sourceUrl = src?.sourceUrl ?? null;
                  return (
                    <div key={i} className="space-y-1.5 rounded-xl border border-white/5 bg-black/20 p-3">
                      <div className="flex items-center justify-between text-sm gap-3">
                        <span className="text-zinc-300">{item.name || 'Producto'} × {item.quantity ?? 1}</span>
                        <span className="text-white font-medium">{formatCLP(item.subtotal ?? Number(item.unitPrice ?? 0) * Number(item.quantity ?? 1))}</span>
                      </div>
                      {sourceUrl && (
                        <button
                          type="button"
                          onClick={() => handleProcure(sourceUrl)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-200 hover:bg-yellow-500/20 transition-colors"
                          title={`Abrir ${sourceUrl} y copiar la dirección del cliente al portapapeles`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Comprar y enviar al cliente
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-[#facc15]">{formatCLP(order.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actualizar estado</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

          {(newStatus === 'enviado' || newStatus === 'entregado') && (
            <div className="space-y-3 border-t border-white/5 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Costo de envío (CLP)</label>
            <input
              type="number"
              value={shippingFee}
              onChange={(e) => setShippingFee(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#facc15]/50"
            />
          </div>

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
