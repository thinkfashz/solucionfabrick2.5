'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';

/* ── Tipos ── */
type Tab = 'dashboard' | 'productos' | 'ordenes';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  featured: boolean;
  category_id: string | null;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
}

/* ── Helpers ── */
function formatPrice(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendiente_pago: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30',
    pagado: 'bg-green-500/15 text-green-400 border-green-500/30',
    enviado: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    entregado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cancelado: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  const cls = map[status] ?? 'bg-white/10 text-white/50 border-white/20';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

/* ── Stat card ── */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-zinc-950/80 p-6 flex flex-col gap-2">
      <p className="text-white/40 text-[10px] uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-white/30 text-xs">{sub}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════
   ADMIN PAGE
════════════════════════════════════════════════ */
export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [ordLoading, setOrdLoading] = useState(false);
  const [error, setError] = useState('');

  /* ── Auth check ── */
  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await insforge.auth.getCurrentUser();
        if (err || !data?.user) {
          router.replace('/auth');
          return;
        }
        setUserEmail(data.user.email ?? '');
      } catch {
        router.replace('/auth');
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  /* ── Load productos ── */
  const loadProducts = useCallback(async () => {
    setProdLoading(true);
    setError('');
    const { data, error: err } = await insforge.database
      .from('products')
      .select('id, name, price, stock, featured, category_id')
      .order('created_at', { ascending: false })
      .limit(50);
    setProdLoading(false);
    if (err) { setError(err.message); return; }
    setProducts((data as Product[]) ?? []);
  }, []);

  /* ── Load ordenes ── */
  const loadOrders = useCallback(async () => {
    setOrdLoading(true);
    setError('');
    const { data, error: err } = await insforge.database
      .from('orders')
      .select('id, customer_name, customer_email, total, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setOrdLoading(false);
    if (err) { setError(err.message); return; }
    setOrders((data as Order[]) ?? []);
  }, []);

  useEffect(() => {
    if (loading) return;
    loadProducts();
    loadOrders();
  }, [loading, loadProducts, loadOrders]);

  /* ── Logout ── */
  async function handleLogout() {
    await insforge.auth.signOut();
    router.push('/auth');
  }

  /* ── Update order status ── */
  async function updateOrderStatus(id: string, status: string) {
    const { error: err } = await insforge.database
      .from('orders')
      .update({ status })
      .eq('id', id);
    if (err) { setError(err.message); return; }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  /* ── Toggle featured ── */
  async function toggleFeatured(id: string, current: boolean) {
    const { error: err } = await insforge.database
      .from('products')
      .update({ featured: !current })
      .eq('id', id);
    if (err) { setError(err.message); return; }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, featured: !current } : p)));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-8 h-8 animate-spin text-yellow-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <p className="text-white/40 text-sm">Verificando acceso…</p>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const pendingOrders = orders.filter((o) => o.status === 'pendiente_pago').length;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="font-playfair text-xl font-black tracking-[0.3em] text-yellow-400">
            FABRICK
          </a>
          <span className="hidden sm:block px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-[10px] font-bold uppercase tracking-widest">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-white/40 text-xs">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full border border-white/15 text-white/50 text-xs font-medium hover:border-red-500/50 hover:text-red-400 transition-all"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-8">
          {([
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'productos', label: `Productos${products.length ? ` (${products.length})` : ''}` },
            { key: 'ordenes', label: `Órdenes${orders.length ? ` (${orders.length})` : ''}` },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                tab === key
                  ? 'bg-yellow-400 text-black'
                  : 'border border-white/10 text-white/50 hover:border-yellow-400/40 hover:text-yellow-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ════ DASHBOARD ════ */}
        {tab === 'dashboard' && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="font-playfair text-3xl font-bold text-white mb-1">Panel de Control</h1>
              <p className="text-white/40 text-sm">Resumen de la plataforma Fabrick</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Productos" value={products.length} sub="en catálogo" />
              <StatCard label="Órdenes" value={orders.length} sub="totales" />
              <StatCard label="Pendientes" value={pendingOrders} sub="por cobrar" />
              <StatCard label="Ingresos" value={formatPrice(totalRevenue)} sub="acumulados" />
            </div>

            {/* Últimas órdenes */}
            <div>
              <h2 className="text-white/60 text-xs uppercase tracking-widest mb-4">Últimas 5 órdenes</h2>
              {ordLoading ? (
                <p className="text-white/30 text-sm">Cargando…</p>
              ) : orders.length === 0 ? (
                <p className="text-white/30 text-sm">Sin órdenes aún.</p>
              ) : (
                <div className="rounded-3xl border border-white/8 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/3">
                        <th className="text-left px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium">ID</th>
                        <th className="text-left px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium hidden md:table-cell">Cliente</th>
                        <th className="text-right px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium">Total</th>
                        <th className="text-center px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                          <td className="px-5 py-4 text-yellow-400 font-mono text-xs">{o.id}</td>
                          <td className="px-5 py-4 text-white/70 hidden md:table-cell">{o.customer_name}</td>
                          <td className="px-5 py-4 text-right text-white font-medium">{formatPrice(o.total)}</td>
                          <td className="px-5 py-4 text-center"><StatusBadge status={o.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ PRODUCTOS ════ */}
        {tab === 'productos' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-playfair text-3xl font-bold text-white mb-1">Productos</h1>
                <p className="text-white/40 text-sm">{products.length} productos en catálogo</p>
              </div>
              <button
                onClick={loadProducts}
                className="px-4 py-2 rounded-full border border-white/10 text-white/50 text-xs hover:border-yellow-400/40 hover:text-yellow-400 transition-all"
              >
                Actualizar
              </button>
            </div>

            {prodLoading ? (
              <p className="text-white/30 text-sm">Cargando productos…</p>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-white/8 bg-zinc-950/80 p-12 text-center">
                <p className="text-white/30">No hay productos en la base de datos.</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/8 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      <th className="text-left px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium">Nombre</th>
                      <th className="text-right px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium hidden md:table-cell">Precio</th>
                      <th className="text-right px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium hidden sm:table-cell">Stock</th>
                      <th className="text-center px-5 py-3 text-white/30 text-[10px] uppercase tracking-widest font-medium">Destacado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                        <td className="px-5 py-4 text-white font-medium">{p.name}</td>
                        <td className="px-5 py-4 text-right text-white/70 hidden md:table-cell">{formatPrice(p.price)}</td>
                        <td className="px-5 py-4 text-right text-white/70 hidden sm:table-cell">{p.stock ?? '—'}</td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => toggleFeatured(p.id, p.featured)}
                            className={`w-8 h-8 rounded-full border transition-all text-xs font-bold ${
                              p.featured
                                ? 'bg-yellow-400 border-yellow-400 text-black'
                                : 'border-white/15 text-white/30 hover:border-yellow-400/40 hover:text-yellow-400'
                            }`}
                          >
                            ★
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ ÓRDENES ════ */}
        {tab === 'ordenes' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-playfair text-3xl font-bold text-white mb-1">Órdenes</h1>
                <p className="text-white/40 text-sm">{orders.length} órdenes registradas</p>
              </div>
              <button
                onClick={loadOrders}
                className="px-4 py-2 rounded-full border border-white/10 text-white/50 text-xs hover:border-yellow-400/40 hover:text-yellow-400 transition-all"
              >
                Actualizar
              </button>
            </div>

            {ordLoading ? (
              <p className="text-white/30 text-sm">Cargando órdenes…</p>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-white/8 bg-zinc-950/80 p-12 text-center">
                <p className="text-white/30">No hay órdenes aún.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-3xl border border-white/8 bg-zinc-950/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-yellow-400 font-mono text-xs">{o.id}</span>
                      <span className="text-white font-medium">{o.customer_name}</span>
                      <span className="text-white/40 text-xs">{o.customer_email}</span>
                      <span className="text-white/30 text-xs">
                        {new Date(o.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                    <div className="flex flex-col md:items-end gap-3">
                      <span className="text-white font-bold text-lg">{formatPrice(o.total)}</span>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={o.status} />
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white/60 text-[10px] uppercase tracking-widest focus:outline-none focus:border-yellow-400/50 cursor-pointer"
                        >
                          <option value="pendiente_pago">Pendiente pago</option>
                          <option value="pagado">Pagado</option>
                          <option value="enviado">Enviado</option>
                          <option value="entregado">Entregado</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
