'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { insforge } from '@/lib/insforge';
import { buildProductTagline, resolveCategoryName } from '@/lib/commerce';
import { useCategories } from '@/hooks/useCategories';
import { Pencil, Trash2, Plus, Search, Wifi, WifiOff, Database, Package } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupResult, setSetupResult] = useState<{
    ok?: boolean;
    error?: string;
    summary?: { total: number; ok: number; failed: number };
    results?: Record<string, { ok: boolean; error?: string }>;
  } | null>(null);
  const isMounted = useRef(true);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => { if (isMounted.current) setToast(null); }, 3000);
  };

  /* ── Load products ── */
  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await insforge.database
        .from('products')
        .select('id, name, description, price, stock, image_url, featured, activo, tagline, category_id, created_at')
        .order('created_at', { ascending: false });

      if (!isMounted.current) return;

      if (error) {
        const errAny = error as unknown as { message?: string; code?: string; status?: number };
        const parts = [errAny.message || 'No se pudieron cargar los productos'];
        if (errAny.code) parts.push(`(código ${errAny.code})`);
        if (errAny.status) parts.push(`[HTTP ${errAny.status}]`);
        setLoadError(parts.join(' '));
      } else if (data) {
        setProducts(data as AdminProduct[]);
        setLoadError(null);
      }
    } catch (err) {
      if (!isMounted.current) return;
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message || 'Error desconocido al cargar los productos');
    } finally {
      if (isMounted.current) setLoading(false);
    }
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

  /* ── Setup / repair tables ── */
  async function handleSetupTables() {
    setSetupRunning(true);
    setSetupResult(null);
    try {
      const res = await fetch('/api/admin/setup-tables', { method: 'POST', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSetupResult({ ok: false, error: json.error ?? `HTTP ${res.status}`, results: json.results, summary: json.summary });
        showToast(json.error ?? 'No se pudieron crear las tablas.', 'error');
      } else {
        setSetupResult(json);
        showToast(json.ok ? 'Tablas creadas/actualizadas correctamente' : 'Algunas tablas fallaron — revisa el detalle', json.ok ? 'success' : 'error');
        if (json.ok) {
          setLoading(true);
          setLoadError(null);
          await loadProducts();
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de red.';
      setSetupResult({ ok: false, error: msg });
      showToast(msg, 'error');
    } finally {
      setSetupRunning(false);
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
    <AdminPage className="px-1 md:px-2">
      <AdminPageHeader
        eyebrow="Catálogo"
        icon={Package}
        title={<>Gestión de <span className="text-yellow-300">Productos</span></>}
        description="Administra el catálogo de la tienda en tiempo real con InsForge."
        meta={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${connected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/5 text-zinc-500'}`}
            title={connected ? 'Canal de tiempo real conectado' : 'Sin canal de tiempo real (los datos siguen cargándose bajo demanda)'}
          >
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? 'En vivo' : 'Sin tiempo real'}
          </span>
        }
        actions={
          <>
            <button
              onClick={handleSetupTables}
              disabled={setupRunning}
              title="Ejecuta scripts/create-tables.sql en InsForge para crear/reparar las tablas del panel"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60"
            >
              <Database className="h-3.5 w-3.5" />
              {setupRunning ? 'Configurando…' : 'Configurar tablas'}
            </button>
            <button
              onClick={() => router.push('/admin/productos/nuevo')}
              className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition hover:bg-yellow-200 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo Producto
            </button>
          </>
        }
      />

      <div className="space-y-5">
        {loadError && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <p className="font-semibold text-red-300">No se pudieron cargar los productos</p>
            <p className="mt-1 text-red-200/80 break-words">{loadError}</p>
            <p className="mt-2 text-xs text-red-200/70">
              Si es la primera vez que usas el panel, puede que la tabla <code className="px-1 rounded bg-black/30">products</code> aún no exista en InsForge. Usa el botón <strong>Configurar tablas</strong> arriba para crearla.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <button
                onClick={() => { setLoading(true); setLoadError(null); loadProducts(); }}
                className="text-xs font-semibold text-red-100 underline underline-offset-2 hover:text-white"
              >
                Reintentar
              </button>
              <button
                onClick={handleSetupTables}
                disabled={setupRunning}
                className="text-xs font-semibold text-red-100 underline underline-offset-2 hover:text-white disabled:opacity-60"
              >
                {setupRunning ? 'Configurando…' : 'Crear/Reparar tablas'}
              </button>
            </div>
          </div>
        )}
        {setupResult && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              setupResult.ok
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {setupResult.ok ? '✓ Tablas creadas/actualizadas' : 'Resultado de la configuración de tablas'}
              </p>
              <button
                onClick={() => setSetupResult(null)}
                className="text-xs opacity-70 hover:opacity-100"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            {setupResult.error && <p className="mt-1 text-xs opacity-90">{setupResult.error}</p>}
            {setupResult.summary && (
              <p className="mt-1 text-xs opacity-80">
                {setupResult.summary.ok} de {setupResult.summary.total} bloques aplicados · {setupResult.summary.failed} fallos
              </p>
            )}
            {setupResult.results && (
              <ul className="mt-2 space-y-1 text-xs">
                {Object.entries(setupResult.results).map(([name, r]) => (
                  <li key={name} className="flex gap-2">
                    <span aria-hidden>{r.ok ? '✓' : '✕'}</span>
                    <span className="font-mono">{name}</span>
                    {r.error && <span className="opacity-80">— {r.error}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
    </AdminPage>
  );
}