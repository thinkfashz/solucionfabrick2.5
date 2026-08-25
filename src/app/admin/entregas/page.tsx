'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCw, Truck } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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
  updated_at?: string;
}

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pendiente: '#F5871F',
  en_camino: '#8b5cf6',
  entregado: '#22c55e',
  fallido: '#ef4444',
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pendiente: 'Pendiente',
  en_camino: 'En camino',
  entregado: 'Entregado',
  fallido: 'Fallido',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS) as DeliveryStatus[];
const POLL_INTERVAL_MS = 30_000;
const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white disabled:opacity-45';
const inputClass = 'min-h-10 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[#171612] outline-none focus:border-[#c77a00]/45 focus:ring-2 focus:ring-[#ffb000]/10 disabled:opacity-40';

function shortId(id: string) {
  return id.slice(-8).toUpperCase();
}

export default function EntregasPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DeliveryStatus | 'todos'>('todos');
  const [saving, setSaving] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, { responsible: string; estimatedDate: string }>>({});
  const [message, setMessage] = useState('');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const fetchDeliveries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/admin/deliveries', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudieron cargar las entregas.');
      if (!mountedRef.current) return;
      setDeliveries(Array.isArray(json.deliveries) ? json.deliveries : []);
      setLastSync(new Date());
      if (!silent) setMessage('');
    } catch (error) {
      if (mountedRef.current && !silent) setMessage(error instanceof Error ? error.message : 'No se pudieron cargar las entregas.');
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchDeliveries();
    const timer = window.setInterval(() => { void fetchDeliveries(true); }, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [fetchDeliveries]);

  const getEdit = (id: string, delivery: Delivery) =>
    editState[id] ?? {
      responsible: delivery.responsible ?? '',
      estimatedDate: delivery.estimated_date ? delivery.estimated_date.slice(0, 10) : '',
    };

  const setEdit = (id: string, delivery: Delivery, field: 'responsible' | 'estimatedDate', value: string) => {
    setEditState((current) => ({
      ...current,
      [id]: { ...getEdit(id, delivery), [field]: value },
    }));
  };

  async function patchDelivery(delivery: Delivery, patch: Record<string, unknown>) {
    setSaving(delivery.id);
    setMessage('');
    try {
      const response = await fetch('/api/admin/deliveries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: delivery.id, ...patch }),
      });
      const json = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(json.error || 'No se pudo actualizar la entrega.');
      const updated = json.delivery as Delivery | undefined;
      if (updated) setDeliveries((current) => current.map((item) => item.id === delivery.id ? { ...item, ...updated } : item));
      else await fetchDeliveries(true);
      if (json.warning) setMessage(json.warning);
      else setMessage('Entrega actualizada correctamente.');
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar la entrega.');
      return false;
    } finally {
      setSaving(null);
    }
  }

  async function handleSave(delivery: Delivery) {
    const edit = getEdit(delivery.id, delivery);
    const ok = await patchDelivery(delivery, {
      responsible: edit.responsible.trim() || null,
      estimated_date: edit.estimatedDate || null,
    });
    if (ok) setEditState((current) => {
      const next = { ...current };
      delete next[delivery.id];
      return next;
    });
  }

  async function handleMarkDelivered(delivery: Delivery) {
    await patchDelivery(delivery, { status: 'entregado' });
  }

  const filtered = useMemo(() => filter === 'todos' ? deliveries : deliveries.filter((delivery) => delivery.status === filter), [deliveries, filter]);
  const pending = useMemo(() => deliveries.filter((delivery) => delivery.status === 'pendiente').length, [deliveries]);
  const onRoute = useMemo(() => deliveries.filter((delivery) => delivery.status === 'en_camino').length, [deliveries]);
  const delivered = useMemo(() => deliveries.filter((delivery) => delivery.status === 'entregado').length, [deliveries]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Pedidos · Logística"
        title="Gestión de entregas"
        description="Seguimiento operativo tenant-aware. La pantalla ya no lee ni escribe la base directamente desde el navegador."
        icon={Truck}
        actions={<><Link href="/admin/pedidos" className={actionClass}>Pedidos</Link><button type="button" onClick={() => void fetchDeliveries()} disabled={loading} className={actionClass}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button></>}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="Pendientes" value={pending} icon={Truck} hint="Preparación / despacho" />
        <AdminStat label="En camino" value={onRoute} icon={Truck} accent="cyan" hint="Despachos activos" />
        <AdminStat label="Entregadas" value={delivered} icon={CheckCircle2} accent="emerald" hint={`${deliveries.length} en total`} />
      </section>

      <div className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white/60 px-4 py-3 text-xs text-[#716b60] sm:flex-row sm:items-center sm:justify-between">
        <span>Actualización automática cada 30 s mediante API segura.</span>
        <span>{lastSync ? `Última sincronización ${lastSync.toLocaleTimeString('es-CL')}` : 'Sincronizando…'}</span>
      </div>

      {message ? <div className="rounded-xl border border-black/8 bg-white/70 px-4 py-3 text-sm text-[#5f594f]">{message}</div> : null}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('todos')} className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${filter === 'todos' ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white/60 text-[#716b60]'}`}>Todas ({deliveries.length})</button>
        {ALL_STATUSES.map((status) => {
          const count = deliveries.filter((delivery) => delivery.status === status).length;
          return <button key={status} onClick={() => setFilter(status)} className="rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-widest" style={filter === status ? { background: STATUS_COLORS[status], color: '#fff', borderColor: STATUS_COLORS[status] } : { color: STATUS_COLORS[status], borderColor: `${STATUS_COLORS[status]}45`, background: '#ffffff99' }}>{STATUS_LABELS[status]} ({count})</button>;
        })}
      </div>

      <AdminCard className="p-0 sm:p-0">
        {loading ? (
          <div className="px-5 py-20 text-center text-sm text-[#817a6f]">Cargando entregas…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-20 text-center text-sm text-[#817a6f]">No hay entregas para este filtro.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead><tr className="border-b border-black/8 bg-black/[.025]">{['Pedido', 'Cliente', 'Dirección', 'Fecha est.', 'Responsable', 'Estado', 'Acciones'].map((heading) => <th key={heading} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[.12em] text-[#817a6f]">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-black/6">
                {filtered.map((delivery) => {
                  const edit = getEdit(delivery.id, delivery);
                  const isSaving = saving === delivery.id;
                  const isDelivered = delivery.status === 'entregado';
                  return (
                    <tr key={delivery.id} className="bg-white/35 hover:bg-white/70">
                      <td className="px-4 py-4"><Link href={`/admin/pedidos/${delivery.order_id}`} className="font-mono text-xs font-black text-[#9b6a12] hover:underline">{shortId(delivery.order_id)}</Link></td>
                      <td className="px-4 py-4 font-bold text-[#171612]">{delivery.customer_name || '—'}</td>
                      <td className="max-w-[240px] px-4 py-4"><span className="block truncate text-xs text-[#716b60]" title={delivery.address}>{delivery.address || '—'}</span></td>
                      <td className="px-4 py-4"><input type="date" value={edit.estimatedDate} onChange={(event) => setEdit(delivery.id, delivery, 'estimatedDate', event.target.value)} disabled={isDelivered || isSaving} className={inputClass} /></td>
                      <td className="px-4 py-4"><input value={edit.responsible} onChange={(event) => setEdit(delivery.id, delivery, 'responsible', event.target.value)} disabled={isDelivered || isSaving} placeholder="Responsable" className={`${inputClass} w-40`} /></td>
                      <td className="px-4 py-4"><span className="inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white" style={{ background: STATUS_COLORS[delivery.status] }}>{STATUS_LABELS[delivery.status]}</span></td>
                      <td className="px-4 py-4"><div className="flex gap-2"><button type="button" onClick={() => void handleSave(delivery)} disabled={isDelivered || isSaving} className={actionClass}>{isSaving ? 'Guardando…' : 'Guardar'}</button>{!isDelivered ? <button type="button" onClick={() => void handleMarkDelivered(delivery)} disabled={isSaving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3.5 text-xs font-black text-white disabled:opacity-45"><CheckCircle2 className="h-4 w-4" /> Entregado</button> : null}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </AdminPage>
  );
}
