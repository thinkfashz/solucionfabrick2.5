'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { LayoutGrid, Table2 } from 'lucide-react';
import {
  ORDER_STATUS_LABELS,
  formatCLP,
  normalizeOrderRecord,
  orderStatusColor,
  shortRecordId,
  type OrderStatus,
} from '@/lib/commerce';
import { StepChart, StatusBadge } from '@/components/admin/ui';

type Order = ReturnType<typeof normalizeOrderRecord>;

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
const POLL_INTERVAL_MS = 30_000;

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');
  const [view, setView] = useState<'cards' | 'table'>('table');
  const isMounted = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('admin:pedidos:view');
    if (stored === 'cards' || stored === 'table') setView(stored);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('admin:pedidos:view', view);
  }, [view]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/orders?limit=200', { cache: 'no-store' });
      const json = await response.json() as { orders?: Record<string, unknown>[] };
      if (!response.ok) throw new Error('No se pudieron cargar los pedidos.');
      if (Array.isArray(json.orders) && isMounted.current) {
        setOrders(json.orders.map((order) => normalizeOrderRecord(order)));
        setConnected(true);
      }
    } catch {
      if (isMounted.current) setConnected(false);
      // El siguiente ciclo seguro vuelve a intentar y conserva la última lista válida.
    }
    if (isMounted.current) setLoading(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void fetchOrders();
    const timer = window.setInterval(() => { void fetchOrders(); }, POLL_INTERVAL_MS);
    return () => {
      isMounted.current = false;
      window.clearInterval(timer);
    };
  }, [fetchOrders]);

  const filtered = filter === 'todos' ? orders : orders.filter((o) => o.status === filter);

  const dailyOrdersSeries = useMemo(() => {
    const now = new Date();
    const buckets: { x: number; y: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const count = orders.filter((o) => {
        const t = new Date(o.created_at).getTime();
        return t >= start && t < end;
      }).length;
      buckets.push({ x: i, y: count });
    }
    return buckets;
  }, [orders]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <div className="border-b border-white/5 px-6 py-6 md:px-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Admin</p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight md:text-3xl">Gestión de Pedidos</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: connected ? '#22c55e22' : '#F5871F22', color: connected ? '#22c55e' : '#F5871F' }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: connected ? '#22c55e' : '#F5871F' }} />
              {connected ? 'API segura' : 'Reintentando'}
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
        <section className="mb-6 rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-5">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
                Pedidos por día · 14 días
              </p>
              <p className="text-sm text-zinc-300">
                {orders.length} en total · {dailyOrdersSeries[dailyOrdersSeries.length - 1]?.y ?? 0} hoy
              </p>
            </div>
            <div className="flex rounded-full border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition ${
                  view === 'table' ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Table2 className="h-3 w-3" /> Planilla
              </button>
              <button
                type="button"
                onClick={() => setView('cards')}
                aria-pressed={view === 'cards'}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition ${
                  view === 'cards' ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="h-3 w-3" /> Cards
              </button>
            </div>
          </div>
          <StepChart data={dailyOrdersSeries} color="#FFB000" height={120} livePulse />
        </section>

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
                style={
                  filter === s
                    ? { background: orderStatusColor(s) }
                    : { borderColor: `${orderStatusColor(s)}33` }
                }
              >
                {ORDER_STATUS_LABELS[s]} ({count})
              </button>
            );
          })}
        </div>

        <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.02] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Cargando pedidos…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">
              No hay pedidos{filter !== 'todos' ? ` con estado "${ORDER_STATUS_LABELS[filter as OrderStatus]}"` : ''}.
            </div>
          ) : view === 'cards' ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/pedidos/${order.id}`}
                  className="block rounded-2xl border border-white/5 bg-black/40 p-4 transition hover:border-yellow-400/40 hover:bg-white/[0.02]"
                  style={{ borderLeft: `3px solid ${orderStatusColor(order.status)}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{order.customer_name}</div>
                      <div className="text-xs text-zinc-500 truncate">{order.customer_email}</div>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-zinc-500">{shortRecordId(order.id)}</span>
                    <span className="font-semibold text-white">{formatCLP(order.total)}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-600">
                    {new Date(order.created_at).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="hidden md:table-cell px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">ID</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                    <th className="hidden md:table-cell px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fecha</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total CLP</th>
                    <th className="px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado</th>
                    <th className="hidden md:table-cell px-6 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => (
                    <tr
                      key={order.id}
                      className={`border-b border-white/5 transition hover:bg-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                    >
                      <td className="hidden md:table-cell px-6 py-4 font-mono text-xs text-zinc-400">{shortRecordId(order.id)}</td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="block hover:text-yellow-400 md:pointer-events-none"
                        >
                          <div className="font-semibold text-white">{order.customer_name}</div>
                          <div className="text-xs text-zinc-500">{order.customer_email}</div>
                        </Link>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-xs text-zinc-400">
                        {new Date(order.created_at).toLocaleDateString('es-CL', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-white">{formatCLP(order.total)}</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={order.status} /></td>
                      <td className="hidden md:table-cell px-6 py-4 text-center">
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
          {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} mostrado{filtered.length !== 1 ? 's' : ''} · Actualización automática cada 30 s
        </p>
      </div>
    </div>
  );
}