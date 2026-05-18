'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { insforge } from '@/lib/insforge';
import { formatCLP, normalizeOrderRecord, orderStatusColor, orderStatusLabel } from '@/lib/commerce';
import { Search, X, ExternalLink, Users, ShoppingBag, WalletCards, CalendarDays } from 'lucide-react';
import { AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

type Order = ReturnType<typeof normalizeOrderRecord>;

interface Client {
  email: string;
  name: string;
  phone: string | null;
  totalOrders: number;
  registeredAt: string;
  orders: Order[];
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ borderColor: `${orderStatusColor(status)}33`, background: `${orderStatusColor(status)}14`, color: orderStatusColor(status) }}
    >
      {orderStatusLabel(status)}
    </span>
  );
}

function OrderHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const total = client.orders.reduce((s, o) => s + (o.total ?? 0), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.6)] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300">Historial real</p>
            <h2 className="mt-1 text-2xl font-black text-white">{client.name || 'Cliente sin nombre'}</h2>
            <p className="mt-1 text-sm text-zinc-400">{client.email || 'sin email'}</p>
            {client.phone && <p className="mt-0.5 text-xs text-zinc-500">{client.phone}</p>}
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white" aria-label="Cerrar historial">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Total pedidos</p>
            <p className="text-2xl font-black text-white">{client.totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Total gastado</p>
            <p className="text-2xl font-black text-yellow-300">{formatCLP(total)}</p>
          </div>
        </div>

        {client.orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">Sin pedidos registrados.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {client.orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-mono text-zinc-400">{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-300">{formatDate(order.created_at)}</span>
                  <span className="text-sm font-black text-yellow-300">{formatCLP(order.total)}</span>
                </div>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {order.items.map((item, i) => (
                      <li key={i} className="text-xs text-zinc-500">{item.quantity}× {item.name} — {formatCLP(item.subtotal)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const { data, error: err } = await insforge.database
        .from('orders')
        .select('id,customer_name,customer_email,customer_phone,total,status,created_at,region,items')
        .order('created_at', { ascending: false })
        .limit(500);

      if (err) { setError(err.message); setLoading(false); return; }

      const orders: Order[] = ((data ?? []) as Record<string, unknown>[]).map((order) => normalizeOrderRecord(order));
      const map = new Map<string, Client>();
      for (const o of orders) {
        const key = o.customer_email?.toLowerCase() || `sin-email-${o.customer_phone || o.customer_name || o.id}`;
        if (!map.has(key)) {
          map.set(key, { email: o.customer_email, name: o.customer_name, phone: o.customer_phone, totalOrders: 0, registeredAt: o.created_at, orders: [] });
        }
        const c = map.get(key)!;
        c.totalOrders += 1;
        c.orders.push(o);
        if (new Date(o.created_at) < new Date(c.registeredAt)) c.registeredAt = o.created_at;
      }

      const list = Array.from(map.values());
      setClients(list);
      setFiltered(list);
      setLoading(false);
    }
    void load();
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    const lq = q.toLowerCase();
    setFiltered(clients.filter((c) => c.name?.toLowerCase().includes(lq) || c.email?.toLowerCase().includes(lq) || c.phone?.toLowerCase().includes(lq)));
  }, [clients]);

  const metrics = useMemo(() => {
    const totalOrders = clients.reduce((sum, client) => sum + client.totalOrders, 0);
    const revenue = clients.reduce((sum, client) => sum + client.orders.reduce((s, order) => s + (order.total ?? 0), 0), 0);
    const best = clients.reduce<Client | null>((winner, client) => {
      if (!winner) return client;
      const a = client.orders.reduce((s, order) => s + (order.total ?? 0), 0);
      const b = winner.orders.reduce((s, order) => s + (order.total ?? 0), 0);
      return a > b ? client : winner;
    }, null);
    return { totalOrders, revenue, bestName: best?.name || '—', avg: clients.length ? Math.round(revenue / clients.length) : 0 };
  }, [clients]);

  return (
    <AdminBasePage
      eyebrow="Operación"
      title="Clientes"
      description="Clientes reales agrupados desde pedidos. Sin datos demo: esta vista se construye desde la tabla orders."
      actions={
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar nombre, email o teléfono…"
            className="w-full rounded-2xl border border-white/10 bg-black/35 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-300/50"
          />
          {search && <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>}
        </div>
      }
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Clientes" value={clients.length} hint="agrupados por contacto" />
        <AdminBaseMetric label="Pedidos" value={metrics.totalOrders} hint="últimos 500 pedidos" />
        <AdminBaseMetric label="Ingresos" value={formatCLP(metrics.revenue)} hint={`promedio ${formatCLP(metrics.avg)}`} />
        <AdminBaseMetric label="Mayor cliente" value={metrics.bestName} hint="por total gastado" />
      </AdminBaseGrid>

      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="flex justify-center rounded-[2rem] border border-white/10 bg-black/30 py-24">
          <svg className="h-8 w-8 animate-spin text-yellow-300" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/80 shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3"><Users className="h-5 w-5 text-yellow-300" /><div><p className="text-sm font-black text-white">Base de clientes</p><p className="text-xs text-zinc-500">{filtered.length} visibles de {clients.length}</p></div></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead><tr className="border-b border-white/5 bg-white/[0.02]">{['Cliente', 'Email', 'Teléfono', 'Pedidos', 'Registro', 'Acción'].map((h) => <th key={h} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-zinc-500">{search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay clientes registrados.'}</td></tr>
                ) : filtered.map((client) => (
                  <tr key={`${client.email}-${client.phone}-${client.name}`} onClick={() => setSelectedClient(client)} className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]">
                    <td className="px-6 py-4"><div className="font-bold text-white">{client.name || '—'}</div><div className="mt-1 text-xs text-zinc-600">{client.orders.length ? formatCLP(client.orders.reduce((s, o) => s + (o.total ?? 0), 0)) : 'Sin compras'}</div></td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{client.email || '—'}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{client.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-zinc-300"><span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-yellow-300/10 px-2 font-black text-yellow-300">{client.totalOrders}</span></td>
                    <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(client.registeredAt)}</td>
                    <td className="px-6 py-4"><button className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300/20 px-3 py-1.5 text-xs font-bold text-yellow-200 hover:border-yellow-300/50" onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}><ExternalLink className="h-3.5 w-3.5" /> Ver historial</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedClient && <OrderHistoryModal client={selectedClient} onClose={() => setSelectedClient(null)} />}
    </AdminBasePage>
  );
}
