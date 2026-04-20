'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';

type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente:      '#f59e0b',
  confirmado:     '#3b82f6',
  en_preparacion: '#f97316',
  enviado:        '#8b5cf6',
  entregado:      '#22c55e',
  cancelado:      '#ef4444',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente:      'Pendiente',
  confirmado:     'Confirmado',
  en_preparacion: 'En preparación',
  enviado:        'Enviado',
  entregado:      'Entregado',
  cancelado:      'Cancelado',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

const POLL_INTERVAL_MS = 30_000;

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

export default function PedidosPage() {
  const [orders, setOrders]         = useState<Order[]>([]);
  const [loading, setLoading]       = useState(true);
  const [connected, setConnected]   = useState(false);
  const [filter, setFilter]         = useState<OrderStatus | 'todos'>('todos');
  const isMounted                   = useRef(true);
  const pollTimer                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await insforge.database
      .from('orders')
      .select('id, customer_name, customer_email, total, currency, status, created_at')
      .order('created_at', { ascending: false });

    if (!error && data && isMounted.current) {
      setOrders(data as Order[]);
    }
    if (isMounted.current) setLoading(false);
  }, []);

  const applyPatch = useCallback((payload: Partial<Order> & { operation?: string }) => {
    if (!payload.id || !isMounted.current) return;
    setOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === payload.id);
      if (idx === -1) return [payload as Order, ...prev];
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...payload };
      return updated;
    });
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchOrders();

    let cleanup = false;
    let realtimeOk = false;

    (async () => {
      try {
        await insforge.realtime.connect();
        if (cleanup) return;

        const { ok } = await insforge.realtime.subscribe('orders');
        if (!ok || cleanup) {
          realtimeOk = false;
        } else {
          realtimeOk = true;
          if (isMounted.current) setConnected(true);

          insforge.realtime.on('INSERT_order', (p: Partial<Order> & { operation?: string }) => {
            if (isMounted.current) applyPatch({ ...p, operation: 'INSERT' });
          });
          insforge.realtime.on('UPDATE_order', (p: Partial<Order> & { operation?: string }) => {
            if (isMounted.current) applyPatch({ ...p, operation: 'UPDATE' });
          });
          insforge.realtime.on('connect', () => { if (isMounted.current) setConnected(true); });
          insforge.realtime.on('disconnect', () => { if (isMounted.current) setConnected(false); });
        }
      } catch {
        realtimeOk = false;
      }

      // Fallback polling cuando realtime no está disponible
      if (!realtimeOk && !cleanup && isMounted.current) {
        const poll = () => {
          if (!isMounted.current) return;
          fetchOrders();
          pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
        };
        pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    })();

    return () => {
      cleanup = true;
      isMounted.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      try {
        insforge.realtime.unsubscribe('orders');
        insforge.realtime.disconnect();
      } catch { /* ignorar */ }
    };
  }, [fetchOrders, applyPatch]);

  const filtered = filter === 'todos' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-6 md:px-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Admin</p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight md:text-3xl">Gestión de Pedidos</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: connected ? '#22c55e22' : '#f59e0b22', color: connected ? '#22c55e' : '#f59e0b' }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: connected ? '#22c55e' : '#f59e0b' }} />
              {connected ? 'Realtime' : 'Polling'}
            </span>
            <button
              onClick={fetchOrders}
              className="rounded-full border border-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-yellow-400/50 hover:text-yellow-400"
            >
              Actualizar
            </button>
            <Link
              href="/admin/entregas"
              className="rounded-full bg-yellow-400 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-white"
            >
              Entregas
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 md:px-12">
        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('todos')}
            className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
              filter === 'todos'
                ? 'bg-yellow-400 text-black'
                : 'border border-white/10 text-zinc-400 hover:border-yellow-400/40 hover:text-yellow-400'
            }`}
          >
            Todos ({orders.length})
          </button>
          {ALL_STATUSES.map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition ${
                  filter === s ? 'text-black' : 'border border-white/10 text-zinc-400 hover:text-white'
                }`}
                style={filter === s ? { background: STATUS_COLORS[s] } : { borderColor: `${STATUS_COLORS[s]}33` }}
              >
                {STATUS_LABELS[s]} ({count})
              </button>
            );
          })}
        </div>

        {/* Tabla */}
        <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Cargando pedidos…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">
              No hay pedidos{filter !== 'todos' ? ` con estado "${STATUS_LABELS[filter as OrderStatus]}"` : ''}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">ID</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fecha</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total CLP</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => (
                    <tr
                      key={order.id}
                      className={`border-b border-white/5 transition hover:bg-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                    >
                      <td className="px-6 py-4 font-mono text-xs text-zinc-400">{shortId(order.id)}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{order.customer_name}</div>
                        <div className="text-xs text-zinc-500">{order.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(order.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-white">
                        {formatCLP(order.total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                          style={{
                            background: `${STATUS_COLORS[order.status] ?? '#6b7280'}22`,
                            color: STATUS_COLORS[order.status] ?? '#6b7280',
                          }}
                        >
                          {STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="rounded-full border border-yellow-400/30 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-yellow-400 transition hover:bg-yellow-400/10"
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-600">
          {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} mostrado{filtered.length !== 1 ? 's' : ''}
          {!connected && ' · Actualización automática cada 30 s'}
        </p>
      </div>
    </div>
  );
}
