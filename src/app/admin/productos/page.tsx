'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { buildProductTagline, resolveCategoryName } from '@/lib/commerce';
import { useCategories } from '@/hooks/useCategories';
import { Pencil, Trash2, Plus, Search, Wifi, WifiOff } from 'lucide-react';

/* ── Types ── */
interface AdminProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  image_url?: string;
  featured?: boolean;
  activo?: boolean;
  tagline?: string;
  category_id?: string;
  created_at?: string;
}

/* ── Helpers ── */
function formatCLP(n: number) {
  return '$' + n.toLocaleString('es-CL') + ' CLP';
}

/* ── Toggle switch ── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#facc15]/50 focus:ring-offset-2 focus:ring-offset-black ${
        checked ? 'bg-[#facc15]' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* ── Delete confirm modal ── */
function DeleteModal({ product, onConfirm, onCancel }: { product: AdminProduct; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <h3 className="text-white font-bold text-lg mb-2">Eliminar producto</h3>
        <p className="text-zinc-400 text-sm mb-6">
          ¿Seguro que deseas eliminar <span className="text-white font-semibold">{product.name}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-300 text-sm hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Toast ── */
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border ${
        type === 'success'
          ? 'bg-zinc-900 border-[#facc15]/40 text-[#facc15]'
          : 'bg-zinc-900 border-red-500/40 text-red-400'
      }`}
    >
      {message}
    </div>
  );
}

/* ════════════════════════════════════════════════
   PÁGINA PRINCIPAL
════════════════════════════════════════════════ */
export default function AdminProductosPage() {
  const router = useRouter();
  const { categories, categoryMap } = useCategories();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const isMounted = useRef(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => { if (isMounted.current) setToast(null); }, 3000);
  };

  /* ── Load products ── */
  const loadProducts = useCallback(async () => {
    const { data, error } = await insforge.database
      .from('products')
      .select('id, name, description, price, stock, image_url, featured, activo, tagline, category_id, created_at')
      .order('created_at', { ascending: false });

    if (!error && data && isMounted.current) {
      setProducts(data as AdminProduct[]);
    }
    if (isMounted.current) setLoading(false);
  }, []);

  /* ── Realtime subscription ── */
  useEffect(() => {
    isMounted.current = true;
    loadProducts();

    let cleanup = false;
    (async () => {
      try {
        await insforge.realtime.connect();
        if (cleanup) return;
        const { ok } = await insforge.realtime.subscribe('products');
        if (!ok || cleanup) return;
        if (isMounted.current) setConnected(true);

        insforge.realtime.on('INSERT_product', () => { if (isMounted.current) loadProducts(); });
        insforge.realtime.on('UPDATE_product', () => { if (isMounted.current) loadProducts(); });
        insforge.realtime.on('DELETE_product', () => { if (isMounted.current) loadProducts(); });
        insforge.realtime.on('connect', () => { if (isMounted.current) setConnected(true); });
        insforge.realtime.on('disconnect', () => { if (isMounted.current) setConnected(false); });
      } catch { /* silenciar */ }
    })();

    return () => {
      cleanup = true;
      isMounted.current = false;
      try { insforge.realtime.unsubscribe('products'); insforge.realtime.disconnect(); } catch { /* ignorar */ }
    };
  }, [loadProducts]);

  /* ── Toggle activo/featured ── */
  async function handleToggle(product: AdminProduct, field: 'activo' | 'featured', value: boolean) {
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, [field]: value } : p));
    const { error } = await insforge.database
      .from('products')
      .update({ [field]: value })
      .eq('id', product.id);
    if (error) {
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, [field]: !value } : p));
      showToast('Error al actualizar el producto', 'error');
    } else {
      showToast(field === 'activo' ? (value ? 'Producto activado' : 'Producto desactivado') : (value ? 'Marcado como destacado' : 'Quitado de destacados'));
    }
  }

  /* ── Delete ── */
  async function handleDelete(product: AdminProduct) {
    const { error } = await insforge.database.from('products').delete().eq('id', product.id);
    setDeleteTarget(null);
    if (error) {
      showToast('Error al eliminar el producto', 'error');
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      showToast('Producto eliminado correctamente');
    }
  }

  const filterOptions = useMemo(() => {
    return ['Todos', 'Destacados', 'Activos', 'Bajo stock', ...categories.map((category) => category.name)];
  }, [categories]);

  const productMetrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((product) => product.activo !== false).length;
    const featured = products.filter((product) => product.featured).length;
    const lowStock = products.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5).length;

    return { total, active, featured, lowStock };
  }, [products]);

  /* ── Filter ── */
  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (activeCategory === 'Todos') return true;
    if (activeCategory === 'Destacados') return !!p.featured;
    if (activeCategory === 'Activos') return p.activo !== false;
    if (activeCategory === 'Bajo stock') return (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5;
    return resolveCategoryName(p.category_id, categoryMap).toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Header ── */}
      <div className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-xl tracking-tight">Gestión de Productos</h1>
          <p className="text-zinc-500 text-xs mt-0.5">Administra el catálogo de la tienda</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {connected ? 'En vivo' : 'Sin conexión'}
          </span>
          <button
            onClick={() => router.push('/admin/productos/nuevo')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ background: '#facc15', color: '#000' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Catálogo total', value: productMetrics.total, tone: 'text-white' },
            { label: 'Productos activos', value: productMetrics.active, tone: 'text-emerald-400' },
            { label: 'Destacados', value: productMetrics.featured, tone: 'text-[#facc15]' },
            { label: 'Stock crítico', value: productMetrics.lowStock, tone: 'text-amber-400' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-white/8 bg-zinc-950/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{metric.label}</p>
              <p className={`mt-3 text-3xl font-black ${metric.tone}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nombre…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#facc15]/50 transition-colors"
            />
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'text-black'
                    : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                }`}
                style={activeCategory === cat ? { background: '#facc15' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-600 text-sm">Cargando productos…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-600 text-sm gap-2">
            <span className="text-2xl">📦</span>
            <span>No hay productos{search ? ` que coincidan con "${search}"` : ''}</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-950">
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Imagen</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Nombre</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Categoría</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Precio</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Stock</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Activo</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Destacado</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium text-xs tracking-wider uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-zinc-900/40">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Imagen */}
                    <td className="px-4 py-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-600 text-xs">
                          Sin img
                        </div>
                      )}
                    </td>
                    {/* Nombre */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{product.name}</div>
                      <div className="text-zinc-500 text-xs mt-0.5">{buildProductTagline(product.tagline, undefined)}</div>
                    </td>
                    {/* Categoría */}
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 border border-white/10 text-xs text-zinc-300">
                        {resolveCategoryName(product.category_id, categoryMap)}
                      </span>
                    </td>
                    {/* Precio */}
                    <td className="px-4 py-3 text-[#facc15] font-semibold">
                      {formatCLP(product.price)}
                    </td>
                    {/* Stock */}
                    <td className="px-4 py-3 text-zinc-300">
                      {product.stock ?? '—'}
                    </td>
                    {/* Activo toggle */}
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={product.activo !== false}
                        onChange={(v) => handleToggle(product, 'activo', v)}
                        label={`Activo: ${product.name}`}
                      />
                    </td>
                    {/* Destacado toggle */}
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        checked={!!product.featured}
                        onChange={(v) => handleToggle(product, 'featured', v)}
                        label={`Destacado: ${product.name}`}
                      />
                    </td>
                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => router.push(`/admin/productos/${product.id}/editar`)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-red-900/50 text-zinc-300 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Count */}
        {!loading && (
          <p className="text-zinc-600 text-xs">
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''} · {products.length} total
          </p>
        )}
      </div>

      {/* ── Delete modal ── */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}