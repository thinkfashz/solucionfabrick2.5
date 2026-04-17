'use client';

import { useEffect, useState, useCallback } from 'react';
import { insforge } from '@/lib/insforge';
import { Search, X, ExternalLink } from 'lucide-react';

/* ── Helpers de formato ── */
function formatCLP(amount: number) {
  return '$' + Math.round(amount).toLocaleString('es-CL').replace(/,/g, '.');
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* ── Tipos ── */
interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total: number;
  status: string;
  created_at: string;
  region: string;
  items: { name: string; quantity: number; price: number }[];
}

interface Client {
  email: string;
  name: string;
  phone: string | null;
  totalOrders: number;
  registeredAt: string;
  orders: Order[];
}

/* ── Badge de estado ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendiente_pago: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20',
    pagado: 'bg-green-500/10 text-green-400 border-green-500/20',
    enviado: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    entregado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelado: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const cls = map[status] ?? 'bg-zinc-700/30 text-zinc-400 border-zinc-700';
  return (
    <span className={`inline-block border rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* ── Modal historial ── */
function OrderHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-zinc-950 p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-playfair text-2xl font-bold text-white">{client.name}</h2>
            <p className="text-zinc-400 text-sm mt-1">{client.email}</p>
            {client.phone && <p className="text-zinc-500 text-xs mt-0.5">{client.phone}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total pedidos</p>
            <p className="text-2xl font-bold text-white">{client.totalOrders}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total gastado</p>
            <p className="text-2xl font-bold text-yellow-400">
              {formatCLP(client.orders.reduce((s, o) => s + (o.total ?? 0), 0))}
            </p>
          </div>
        </div>

        {/* Orders list */}
        {client.orders.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">Sin pedidos registrados.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {client.orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-zinc-400">{order.id}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">{formatDate(order.created_at)}</span>
                  <span className="text-sm font-bold text-yellow-400">{formatCLP(order.total)}</span>
                </div>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {order.items.map((item, i) => (
                      <li key={i} className="text-xs text-zinc-500">
                        {item.quantity}× {item.name} — {formatCLP(item.price * item.quantity)}
                      </li>
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

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════ */
export default function ClientesPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  /* ── Cargar pedidos y agrupar por cliente ── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error: err } = await insforge.database
        .from('orders')
        .select('id,customer_name,customer_email,customer_phone,total,status,created_at,region,items')
        .order('created_at', { ascending: false })
        .limit(500);

      if (err) { setError(err.message); setLoading(false); return; }

      const orders: Order[] = (data ?? []) as Order[];
      setAllOrders(orders);

      // Agrupar por email
      const map = new Map<string, Client>();
      for (const o of orders) {
        const key = o.customer_email?.toLowerCase() ?? 'sin-email';
        if (!map.has(key)) {
          map.set(key, {
            email: o.customer_email,
            name: o.customer_name,
            phone: o.customer_phone,
            totalOrders: 0,
            registeredAt: o.created_at,
            orders: [],
          });
        }
        const c = map.get(key)!;
        c.totalOrders += 1;
        c.orders.push(o);
        // registeredAt = primer pedido cronológicamente
        if (new Date(o.created_at) < new Date(c.registeredAt)) {
          c.registeredAt = o.created_at;
        }
      }

      const list = Array.from(map.values());
      setClients(list);
      setFiltered(list);
      setLoading(false);
    }
    load();
  }, []);

  /* ── Filtrar ── */
  const handleSearch = useCallback(
    (q: string) => {
      setSearch(q);
      const lq = q.toLowerCase();
      setFiltered(
        clients.filter(
          (c) =>
            c.name?.toLowerCase().includes(lq) || c.email?.toLowerCase().includes(lq)
        )
      );
    },
    [clients]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-playfair text-4xl font-bold text-white">Clientes</h1>
          <p className="text-zinc-400 text-sm mt-1">{clients.length} clientes registrados</p>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-24">
          <svg className="w-8 h-8 animate-spin text-yellow-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Nombre completo', 'Email', 'Teléfono', 'Total pedidos', 'Fecha de registro', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-500"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-zinc-500 text-sm">
                      {search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay clientes registrados.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr
                      key={client.email}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedClient(client)}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white">{client.name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{client.email}</td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{client.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/10 text-yellow-400 font-bold text-xs">
                          {client.totalOrders}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{formatDate(client.registeredAt)}</td>
                      <td className="px-6 py-4">
                        <button
                          className="flex items-center gap-1.5 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Ver historial
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedClient && (
        <OrderHistoryModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}
