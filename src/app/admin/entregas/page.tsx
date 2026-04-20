'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { insforge } from '@/lib/insforge';

type DeliveryStatus = 'pendiente' | 'en_camino' | 'entregado' | 'fallido';

interface Delivery {
  id: string;
  order_id: string;
  customer_name: string;
  address: string;
  estimated_date?: string;
  responsible?: string;
  status: DeliveryStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pendiente:  '#f59e0b',
  en_camino:  '#8b5cf6',
  entregado:  '#22c55e',
  fallido:    '#ef4444',
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pendiente:  'Pendiente',
  en_camino:  'En camino',
  entregado:  'Entregado',
  fallido:    'Fallido',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS) as DeliveryStatus[];

const POLL_INTERVAL_MS = 30_000;

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

export default function EntregasPage() {
  const [deliveries, setDeliveries]   = useState<Delivery[]>([]);
  const [loading, setLoading]         = useState(true);
  const [connected, setConnected]     = useState(false);
  const [filter, setFilter]           = useState<DeliveryStatus | 'todos'>('todos');
  const [saving, setSaving]           = useState<string | null>(null);
  const [editState, setEditState]     = useState<Record<string, { responsible: string; estimatedDate: string }>>({});
  const isMounted                     = useRef(true);
  const pollTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDeliveries = useCallback(async () => {
    const { data, error } = await insforge.database
      .from('deliveries')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && isMounted.current) {
      setDeliveries(data as Delivery[]);
    }
    if (isMounted.current) setLoading(false);
  }, []);

  const applyPatch = useCallback((payload: Partial<Delivery> & { operation?: string }) => {
    if (!payload.id || !isMounted.current) return;
    setDeliveries((prev) => {
      const idx = prev.findIndex((d) => d.id === payload.id);
      if (idx === -1) return [payload as Delivery, ...prev];
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...payload };
      return updated;
    });
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchDeliveries();

    let cleanup = false;
    let realtimeOk = false;

    (async () => {
      const startPolling = () => {
        if (pollTimer.current) return; // already running
        const poll = () => {
          if (!isMounted.current) return;
          void fetchDeliveries();
          pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
        };
        pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
      };

      const stopPolling = () => {
        if (pollTimer.current) {
          clearTimeout(pollTimer.current);
          pollTimer.current = null;
        }
      };

      try {
        await insforge.realtime.connect();
        if (cleanup) return;

        const { ok } = await insforge.realtime.subscribe('deliveries');
        if (!ok || cleanup) {
          realtimeOk = false;
        } else {
          realtimeOk = true;
          if (isMounted.current) setConnected(true);

          insforge.realtime.on('INSERT_delivery', (p: Partial<Delivery> & { operation?: string }) => {
            if (isMounted.current) applyPatch({ ...p, operation: 'INSERT' });
          });
          insforge.realtime.on('UPDATE_delivery', (p: Partial<Delivery> & { operation?: string }) => {
            if (isMounted.current) applyPatch({ ...p, operation: 'UPDATE' });
          });
          insforge.realtime.on('connect', () => {
            if (isMounted.current) {
              setConnected(true);
              stopPolling();
            }
          });
          insforge.realtime.on('disconnect', () => {
            if (isMounted.current) {
              setConnected(false);
              startPolling();
            }
          });
        }
      } catch {
        realtimeOk = false;
      }

      if (!realtimeOk && !cleanup && isMounted.current) {
        startPolling();
      }
    })();

    return () => {
      cleanup = true;
      isMounted.current = false;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      try {
        insforge.realtime.unsubscribe('deliveries');
        insforge.realtime.disconnect();
      } catch { /* ignorar */ }
    };
  }, [fetchDeliveries, applyPatch]);

  const getEdit = (id: string, delivery: Delivery) =>
    editState[id] ?? {
      responsible:   delivery.responsible ?? '',
      estimatedDate: delivery.estimated_date ? delivery.estimated_date.slice(0, 10) : '',
    };

  const setEdit = (id: string, field: 'responsible' | 'estimatedDate', value: string) => {
    const delivery = deliveries.find((d) => d.id === id);
    if (!delivery) return;
    setEditState((prev) => ({
      ...prev,
      [id]: { ...getEdit(id, delivery), [field]: value },
    }));
  };

  const handleSave = async (delivery: Delivery) => {
    const edit = getEdit(delivery.id, delivery);
    setSaving(delivery.id);

    const payload: Partial<Delivery> = {
      responsible:    edit.responsible.trim() || undefined,
      estimated_date: edit.estimatedDate || undefined,
      updated_at:     new Date().toISOString(),
    };

    const { error: saveErr } = await insforge.database
      .from('deliveries')
      .update(payload)
      .eq('id', delivery.id);

    if (!saveErr) {
      setDeliveries((prev) =>
        prev.map((d) => d.id === delivery.id ? { ...d, ...payload } : d),
      );
    }
    setSaving(null);
  };

  const handleMarkDelivered = async (delivery: Delivery) => {
    setSaving(delivery.id);
    const now = new Date().toISOString();

    const { error: deliveryErr } = await insforge.database
      .from('deliveries')
      .update({ status: 'entregado', updated_at: now })
      .eq('id', delivery.id);

    if (deliveryErr) {
      setSaving(null);
      return;
    }

    // Sync order status (best-effort — delivery is already marked)
    const { error: orderSyncErr } = await insforge.database
      .from('orders')
      .update({ status: 'entregado' })
      .eq('id', delivery.order_id);

    if (orderSyncErr) {
      console.warn('Entrega marcada, pero no se pudo sincronizar el estado del pedido:', orderSyncErr);
      window.alert(
        'La entrega se marcó como entregada, pero no se pudo actualizar el estado del pedido. Verifica la sincronización en el detalle del pedido.'
      );
    }

    setDeliveries((prev) =>
      prev.map((d) => d.id === delivery.id ? { ...d, status: 'entregado', updated_at: now } : d),
    );
    setSaving(null);
  };

  const filtered = filter === 'todos' ? deliveries : deliveries.filter((d) => d.status === filter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-6 md:px-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Admin</p>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight md:text-3xl">Gestión de Entregas</h1>
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
              onClick={fetchDeliveries}
              className="rounded-full border border-white/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-yellow-400/50 hover:text-yellow-400"
            >
              Actualizar
            </button>
            <Link
              href="/admin/pedidos"
              className="rounded-full bg-yellow-400 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-white"
            >
              Pedidos
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
            Todas ({deliveries.length})
          </button>
          {ALL_STATUSES.map((s) => {
            const count = deliveries.filter((d) => d.status === s).length;
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
            <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">Cargando entregas…</div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-24 text-zinc-500 text-sm">
              No hay entregas{filter !== 'todos' ? ` con estado "${STATUS_LABELS[filter as DeliveryStatus]}"` : ''}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pedido ID</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dirección</th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fecha Est.</th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">Responsable</th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado</th>
                    <th className="px-5 py-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((delivery, i) => {
                    const edit        = getEdit(delivery.id, delivery);
                    const isSaving    = saving === delivery.id;
                    const isDelivered = delivery.status === 'entregado';

                    return (
                      <tr
                        key={delivery.id}
                        className={`border-b border-white/5 transition hover:bg-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                      >
                        {/* Pedido ID */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/pedidos/${delivery.order_id}`}
                            className="font-mono text-xs text-yellow-400 hover:underline"
                          >
                            {shortId(delivery.order_id)}
                          </Link>
                        </td>

                        {/* Cliente */}
                        <td className="px-5 py-4 font-semibold text-white whitespace-nowrap">
                          {delivery.customer_name}
                        </td>

                        {/* Dirección */}
                        <td className="px-5 py-4 max-w-[200px]">
                          <span className="block truncate text-xs text-zinc-400" title={delivery.address}>
                            {delivery.address || '—'}
                          </span>
                        </td>

                        {/* Fecha estimada */}
                        <td className="px-5 py-4 text-center">
                          <input
                            type="date"
                            value={edit.estimatedDate}
                            onChange={(e) => setEdit(delivery.id, 'estimatedDate', e.target.value)}
                            disabled={isDelivered}
                            className="rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:border-yellow-400/50 disabled:opacity-40"
                          />
                        </td>

                        {/* Responsable */}
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={edit.responsible}
                            onChange={(e) => setEdit(delivery.id, 'responsible', e.target.value)}
                            disabled={isDelivered}
                            placeholder="Asignar…"
                            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-yellow-400/50 disabled:opacity-40"
                          />
                        </td>

                        {/* Estado */}
                        <td className="px-5 py-4 text-center">
                          <span
                            className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
                            style={{
                              background: `${STATUS_COLORS[delivery.status] ?? '#6b7280'}22`,
                              color: STATUS_COLORS[delivery.status] ?? '#6b7280',
                            }}
                          >
                            {STATUS_LABELS[delivery.status] ?? delivery.status}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {!isDelivered && (
                              <>
                                <button
                                  onClick={() => handleSave(delivery)}
                                  disabled={isSaving}
                                  className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-yellow-400/40 hover:text-yellow-400 disabled:opacity-40"
                                >
                                  {isSaving ? '…' : 'Guardar'}
                                </button>
                                <button
                                  onClick={() => handleMarkDelivered(delivery)}
                                  disabled={isSaving}
                                  className="rounded-full bg-green-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 transition hover:bg-green-500/30 disabled:opacity-40"
                                >
                                  Entregado
                                </button>
                              </>
                            )}
                            {isDelivered && (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-green-400/50">
                                ✓ Completado
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-600">
          {filtered.length} entrega{filtered.length !== 1 ? 's' : ''} mostrada{filtered.length !== 1 ? 's' : ''}
          {!connected && ' · Actualización automática cada 30 s'}
        </p>
      </div>
    </div>
  );
}