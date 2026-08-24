'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ExternalLink, Search, ShoppingBag, Users, WalletCards, X } from 'lucide-react';
import { formatCLP, normalizeOrderRecord, orderStatusColor, orderStatusLabel } from '@/lib/commerce';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

function formatDate(iso: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-CL');
}

type Order = ReturnType<typeof normalizeOrderRecord>;
type Client = {
  email: string;
  name: string;
  phone: string | null;
  totalOrders: number;
  registeredAt: string;
  orders: Order[];
};

function StatusBadge({ status }: { status: string }) {
  return <span className="inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ borderColor: `${orderStatusColor(status)}33`, background: `${orderStatusColor(status)}14`, color: orderStatusColor(status) }}>{orderStatusLabel(status)}</span>;
}

function OrderHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const total = client.orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-black/10 bg-[#fffdf9] p-5 shadow-[0_30px_100px_rgba(38,30,20,.22)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/10 pb-4">
          <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b6a12]">Historial real</p><h2 className="mt-1 truncate text-2xl font-black tracking-[-.04em] text-[#171612]">{client.name || 'Cliente sin nombre'}</h2><p className="mt-1 text-sm text-[#716b60]">{client.email || 'sin email'}</p>{client.phone ? <p className="mt-0.5 text-xs text-[#8f887c]">{client.phone}</p> : null}</div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-black/10 bg-white text-[#716b60]" aria-label="Cerrar historial"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="border-t border-black/10 py-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Pedidos</p><p className="mt-1 text-2xl font-black text-[#171612]">{client.totalOrders}</p></div>
          <div className="border-t border-black/10 py-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Total gastado</p><p className="mt-1 text-2xl font-black text-[#9b6a12]">{formatCLP(total)}</p></div>
        </div>

        {client.orders.length === 0 ? <p className="py-8 text-center text-sm text-[#817a6f]">Sin pedidos registrados.</p> : <div className="space-y-3">{client.orders.map((order) => <div key={order.id} className="rounded-xl border border-black/8 bg-white/65 p-4"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs text-[#817a6f]">{order.id}</span><StatusBadge status={order.status} /></div><div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm text-[#716b60]">{formatDate(order.created_at)}</span><span className="text-sm font-black text-[#9b6a12]">{formatCLP(order.total)}</span></div>{Array.isArray(order.items) && order.items.length > 0 ? <ul className="mt-3 space-y-1">{order.items.map((item, index) => <li key={index} className="text-xs text-[#817a6f]">{item.quantity}× {item.name} — {formatCLP(item.subtotal)}</li>)}</ul> : null}</div>)}</div>}
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/orders?limit=200', { cache: 'no-store' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`);
      const orders: Order[] = (Array.isArray(json.orders) ? json.orders : []).map((order: Record<string, unknown>) => normalizeOrderRecord(order));
      const map = new Map<string, Client>();
      for (const order of orders) {
        const key = order.customer_email?.toLowerCase() || `sin-email-${order.customer_phone || order.customer_name || order.id}`;
        if (!map.has(key)) map.set(key, { email: order.customer_email, name: order.customer_name, phone: order.customer_phone, totalOrders: 0, registeredAt: order.created_at, orders: [] });
        const client = map.get(key)!;
        client.totalOrders += 1;
        client.orders.push(order);
        if (new Date(order.created_at) < new Date(client.registeredAt)) client.registeredAt = order.created_at;
      }
      setClients(Array.from(map.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes.');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter((client) => client.name?.toLowerCase().includes(needle) || client.email?.toLowerCase().includes(needle) || client.phone?.toLowerCase().includes(needle));
  }, [clients, search]);

  const metrics = useMemo(() => {
    const totalOrders = clients.reduce((sum, client) => sum + client.totalOrders, 0);
    const revenue = clients.reduce((sum, client) => sum + client.orders.reduce((inner, order) => inner + (order.total ?? 0), 0), 0);
    const best = clients.reduce<Client | null>((winner, client) => {
      if (!winner) return client;
      const a = client.orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
      const b = winner.orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
      return a > b ? client : winner;
    }, null);
    return { totalOrders, revenue, bestName: best?.name || '—', avg: clients.length ? Math.round(revenue / clients.length) : 0 };
  }, [clients]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Ventas · Clientes"
        title="Clientes"
        description="Clientes agrupados desde pedidos reales mediante la API administrativa. La vista ya no consulta la base de datos directamente desde el navegador."
        icon={Users}
        actions={<div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9488]" /><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, email o teléfono…" className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 pl-10 pr-9 text-sm font-semibold text-[#171612] outline-none placeholder:text-[#aaa294] focus:border-[#c77a00]/45" />{search ? <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9388]" aria-label="Limpiar búsqueda"><X className="h-4 w-4" /></button> : null}</div>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Clientes" value={loading ? '…' : clients.length} icon={Users} hint="Agrupados por contacto" />
        <AdminStat label="Pedidos" value={loading ? '…' : metrics.totalOrders} icon={ShoppingBag} accent="cyan" hint="Últimos 200 pedidos" />
        <AdminStat label="Ingresos" value={loading ? '…' : formatCLP(metrics.revenue)} icon={WalletCards} accent="emerald" hint={`Promedio ${formatCLP(metrics.avg)}`} />
        <AdminStat label="Mayor cliente" value={loading ? '…' : metrics.bestName} icon={CalendarDays} accent="yellow" hint="Por total gastado" />
      </section>

      {error ? <div className="rounded-xl border border-rose-600/15 bg-rose-500/8 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

      <AdminCard className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b border-black/8 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Base de clientes</p><p className="mt-1 text-xs text-[#817a6f]">{filtered.length} visibles de {clients.length}</p></div></div>
        {loading ? <div className="flex min-h-64 items-center justify-center text-sm text-[#817a6f]">Cargando clientes…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px]"><thead><tr className="border-b border-black/8 bg-black/[.025]">{['Cliente', 'Email', 'Teléfono', 'Pedidos', 'Registro', 'Acción'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-[.15em] text-[#817a6f]">{heading}</th>)}</tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-sm text-[#817a6f]">{search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay clientes registrados.'}</td></tr> : filtered.map((client) => <tr key={`${client.email}-${client.phone}-${client.name}`} onClick={() => setSelectedClient(client)} className="cursor-pointer border-b border-black/6 transition hover:bg-black/[.02]"><td className="px-5 py-4"><div className="font-black text-[#171612]">{client.name || '—'}</div><div className="mt-1 text-xs text-[#9a9388]">{client.orders.length ? formatCLP(client.orders.reduce((sum, order) => sum + (order.total ?? 0), 0)) : 'Sin compras'}</div></td><td className="px-5 py-4 text-sm text-[#716b60]">{client.email || '—'}</td><td className="px-5 py-4 text-sm text-[#716b60]">{client.phone || '—'}</td><td className="px-5 py-4"><span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#ffb000]/10 px-2 py-1 text-xs font-black text-[#8e5c00]">{client.totalOrders}</span></td><td className="px-5 py-4 text-sm text-[#716b60]">{formatDate(client.registeredAt)}</td><td className="px-5 py-4"><button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white/65 px-3 py-2 text-xs font-black text-[#716b60] hover:bg-white" onClick={(event) => { event.stopPropagation(); setSelectedClient(client); }}><ExternalLink className="h-3.5 w-3.5" /> Historial</button></td></tr>)}</tbody></table></div>}
      </AdminCard>

      {selectedClient ? <OrderHistoryModal client={selectedClient} onClose={() => setSelectedClient(null)} /> : null}
    </AdminPage>
  );
}
