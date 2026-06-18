'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildProductTagline, resolveCategoryName } from '@/lib/commerce';
import { useCategories } from '@/hooks/useCategories';
import { AlertTriangle, CheckCircle2, Database, Eye, Layers3, Package, Pencil, Plus, RefreshCw, Search, Star, Trash2, Upload } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';
import ProductImportModal from './ProductImportModal';

interface AdminProduct {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  stock?: number;
  image_url?: string;
  featured?: boolean;
  activo?: boolean;
  tagline?: string;
  category_id?: string;
  created_at?: string;
}

type SetupResult = { ok?: boolean; error?: string; summary?: { total: number; ok: number; failed: number }; results?: Record<string, { ok: boolean; error?: string }> };

function toNumber(value: number | string | undefined | null) { const n = typeof value === 'number' ? value : Number(value ?? 0); return Number.isFinite(n) ? n : 0; }
function formatCLP(value: number | string) { return '$' + toNumber(value).toLocaleString('es-CL') + ' CLP'; }

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border border-white/10 transition ${checked ? 'bg-yellow-300' : 'bg-zinc-800'}`}><span className={`pointer-events-none mt-0.5 inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>;
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return <div className={`fixed bottom-24 right-4 z-50 max-w-sm rounded-2xl border px-5 py-3 text-sm shadow-2xl backdrop-blur-xl md:bottom-6 ${type === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-red-400/30 bg-red-400/10 text-red-200'}`}>{message}</div>;
}

function DeleteModal({ product, onConfirm, onCancel }: { product: AdminProduct; onConfirm: () => void; onCancel: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl border border-red-400/25 bg-zinc-950 p-6 shadow-2xl"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-red-300"><Trash2 className="h-5 w-5" /></div><h3 className="text-xl font-black text-white">Eliminar producto</h3><p className="mt-2 text-sm leading-6 text-zinc-400">¿Seguro que deseas eliminar <span className="font-bold text-white">{product.name}</span>? Esta acción no se puede deshacer.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onCancel} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5">Cancelar</button><button onClick={onConfirm} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-400">Eliminar</button></div></div></div>;
}

function ProductCard({ product, categoryName, onEdit, onDelete, onToggle }: { product: AdminProduct; categoryName: string; onEdit: () => void; onDelete: () => void; onToggle: (field: 'activo' | 'featured', value: boolean) => void }) {
  const active = product.activo !== false;
  const stock = product.stock ?? 0;
  const critical = stock > 0 && stock <= 5;
  return <article className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 shadow-[0_18px_60px_rgba(0,0,0,0.25)] transition hover:border-yellow-300/25"><div className="relative h-44 bg-zinc-900">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-zinc-700"><Package className="h-10 w-10" /></div>}<div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" /><div className="absolute left-3 top-3 flex flex-wrap gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${active ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400'}`}>{active ? 'Activo' : 'Oculto'}</span>{product.featured && <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-yellow-200">Destacado</span>}</div></div><div className="p-4"><div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-2 text-base font-black text-white">{product.name}</h3><p className="mt-1 text-xs text-zinc-500">{buildProductTagline(product.tagline, undefined)}</p></div><span className="rounded-2xl bg-yellow-300 px-3 py-1.5 text-xs font-black text-black">{formatCLP(product.price)}</span></div><p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-zinc-500">{product.description || 'Sin descripción.'}</p><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-zinc-600">Categoría</p><p className="mt-1 truncate font-bold text-zinc-200">{categoryName}</p></div><div className={`rounded-2xl border p-3 ${critical ? 'border-red-400/25 bg-red-400/10' : 'border-white/10 bg-white/[0.03]'}`}><p className="text-zinc-600">Stock</p><p className={`mt-1 font-bold ${critical ? 'text-red-200' : 'text-zinc-200'}`}>{stock}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/25 p-3"><label className="flex items-center justify-between gap-2 text-xs text-zinc-400">Activo<Toggle checked={active} label={`Activo: ${product.name}`} onChange={(value) => onToggle('activo', value)} /></label><label className="flex items-center justify-between gap-2 text-xs text-zinc-400">Destacado<Toggle checked={!!product.featured} label={`Destacado: ${product.name}`} onChange={(value) => onToggle('featured', value)} /></label></div><div className="mt-4 grid grid-cols-2 gap-3"><button onClick={onEdit} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-200 hover:border-yellow-300/40 hover:text-yellow-200"><Pencil className="mr-1 inline h-4 w-4" />Editar</button><button onClick={onDelete} className="rounded-2xl border border-red-400/25 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-red-300 hover:bg-red-400/10"><Trash2 className="mr-1 inline h-4 w-4" />Eliminar</button></div></div></article>;
}

export default function AdminProductosPage() {
  const router = useRouter();
  const { categories, categoryMap } = useCategories();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [importOpen, setImportOpen] = useState(false);
  const isMounted = useRef(true);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => { if (isMounted.current) setToast(null); }, 3200); }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!isMounted.current) return;
      if (!res.ok) { setLoadError(json.error ?? `HTTP ${res.status}: No se pudieron cargar los productos.`); setProducts([]); return; }
      setProducts(Array.isArray(json.products) ? json.products : []);
      setLoadError(null);
    } catch (error) {
      if (!isMounted.current) return;
      setLoadError(error instanceof Error ? error.message : 'Error de red cargando productos.');
      setProducts([]);
    } finally { if (isMounted.current) setLoading(false); }
  }, []);

  useEffect(() => { isMounted.current = true; void loadProducts(); return () => { isMounted.current = false; }; }, [loadProducts]);

  async function handleToggle(product: AdminProduct, field: 'activo' | 'featured', value: boolean) {
    const previous = products;
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, [field]: value } : p));
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: value }) });
    if (!res.ok) { const json = await res.json().catch(() => ({})); setProducts(previous); showToast(json.error ?? 'Error al actualizar el producto.', 'error'); return; }
    showToast(field === 'activo' ? (value ? 'Producto activado.' : 'Producto ocultado.') : (value ? 'Producto destacado.' : 'Quitado de destacados.'));
  }

  async function handleDelete(product: AdminProduct) {
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    setDeleteTarget(null);
    if (!res.ok) { const json = await res.json().catch(() => ({})); showToast(json.error ?? 'Error al eliminar el producto.', 'error'); return; }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    showToast('Producto eliminado correctamente.');
  }

  async function handleSetupTables() {
    setSetupRunning(true);
    setSetupResult(null);
    try {
      const res = await fetch('/api/admin/setup-tables', { method: 'POST', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setSetupResult({ ok: false, error: json.error ?? `HTTP ${res.status}`, results: json.results, summary: json.summary }); showToast(json.error ?? 'No se pudieron crear las tablas.', 'error'); }
      else { setSetupResult(json); showToast(json.ok ? 'Tablas creadas/actualizadas correctamente.' : 'Algunas tablas fallaron.', json.ok ? 'success' : 'error'); if (json.ok) { setLoading(true); setLoadError(null); await loadProducts(); } }
    } catch (error) { const msg = error instanceof Error ? error.message : 'Error de red.'; setSetupResult({ ok: false, error: msg }); showToast(msg, 'error'); }
    finally { setSetupRunning(false); }
  }

  const filterOptions = useMemo(() => ['Todos', 'Destacados', 'Activos', 'Ocultos', 'Bajo stock', ...categories.map((category) => category.name)], [categories]);
  const metrics = useMemo(() => { const total = products.length; const active = products.filter((product) => product.activo !== false).length; const featured = products.filter((product) => product.featured).length; const lowStock = products.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5).length; const value = products.reduce((sum, product) => sum + toNumber(product.price) * (product.stock ?? 0), 0); return { total, active, featured, lowStock, value }; }, [products]);
  const filtered = useMemo(() => products.filter((product) => { const q = search.trim().toLowerCase(); const matchSearch = !q || product.name.toLowerCase().includes(q) || (product.description ?? '').toLowerCase().includes(q); if (!matchSearch) return false; if (activeCategory === 'Todos') return true; if (activeCategory === 'Destacados') return !!product.featured; if (activeCategory === 'Activos') return product.activo !== false; if (activeCategory === 'Ocultos') return product.activo === false; if (activeCategory === 'Bajo stock') return (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5; return resolveCategoryName(product.category_id, categoryMap).toLowerCase() === activeCategory.toLowerCase(); }), [products, search, activeCategory, categoryMap]);

  return <AdminPage className="px-1 md:px-2"><AdminPageHeader eyebrow="Catálogo" icon={Package} title={<>Gestión de <span className="text-yellow-300">Productos</span></>} description="Administra productos desde una API protegida: carga estable, importación masiva, edición segura y mejor experiencia móvil." meta={<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300" title="Carga por endpoint admin protegido"><CheckCircle2 className="h-3 w-3" /> API admin segura</span>} actions={<><button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-200 transition hover:bg-yellow-300 hover:text-black"><Upload className="h-3.5 w-3.5" /> Importar</button><button onClick={() => { setLoading(true); void loadProducts(); }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/10"><RefreshCw className="h-3.5 w-3.5" /> Actualizar</button><button onClick={handleSetupTables} disabled={setupRunning} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-60"><Database className="h-3.5 w-3.5" /> {setupRunning ? 'Configurando…' : 'Configurar tablas'}</button><button onClick={() => router.push('/admin/productos/nuevo')} className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-black shadow-[0_8px_24px_rgba(250,204,21,0.35)] transition hover:bg-yellow-200 active:scale-95"><Plus className="h-3.5 w-3.5" /> Nuevo Producto</button></>} />
    <div className="space-y-5">{loadError && <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" /><div><p className="font-black text-red-200">No se pudieron cargar los productos</p><p className="mt-1 break-words text-red-200/80">{loadError}</p><button onClick={() => { setLoading(true); setLoadError(null); void loadProducts(); }} className="mt-3 text-xs font-bold text-red-100 underline underline-offset-2">Reintentar</button></div></div></div>}
      {setupResult && <div className={`rounded-3xl border p-4 text-sm ${setupResult.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}`}><div className="flex items-center justify-between gap-2"><p className="font-semibold">{setupResult.ok ? '✓ Tablas creadas/actualizadas' : 'Resultado de configuración'}</p><button onClick={() => setSetupResult(null)} className="text-xs opacity-70 hover:opacity-100">✕</button></div>{setupResult.error && <p className="mt-1 text-xs opacity-90">{setupResult.error}</p>}{setupResult.summary && <p className="mt-1 text-xs opacity-80">{setupResult.summary.ok} de {setupResult.summary.total} bloques aplicados · {setupResult.summary.failed} fallos</p>}</div>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[{ label: 'Catálogo total', value: metrics.total, icon: Package, tone: 'text-white' }, { label: 'Activos', value: metrics.active, icon: CheckCircle2, tone: 'text-emerald-300' }, { label: 'Destacados', value: metrics.featured, icon: Star, tone: 'text-yellow-300' }, { label: 'Stock crítico', value: metrics.lowStock, icon: AlertTriangle, tone: 'text-red-300' }, { label: 'Valor inventario', value: formatCLP(metrics.value), icon: Layers3, tone: 'text-sky-300' }].map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-3xl border border-white/10 bg-zinc-950/70 p-4"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</p><Icon className={`h-4 w-4 ${tone}`} /></div><p className={`mt-3 text-2xl font-black ${tone}`}>{value}</p></div>)}</section>
      <section className="rounded-3xl border border-white/10 bg-zinc-950/60 p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o descripción…" className="w-full rounded-2xl border border-white/10 bg-black/35 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-yellow-300/40" /></div><div className="flex gap-2 rounded-2xl border border-white/10 bg-black/30 p-1"><button onClick={() => setView('cards')} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === 'cards' ? 'bg-yellow-300 text-black' : 'text-zinc-400'}`}><Eye className="mr-1 inline h-3.5 w-3.5" />Tarjetas</button><button onClick={() => setView('table')} className={`rounded-xl px-3 py-2 text-xs font-bold ${view === 'table' ? 'bg-yellow-300 text-black' : 'text-zinc-400'}`}><Database className="mr-1 inline h-3.5 w-3.5" />Tabla</button></div></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{filterOptions.map((cat) => <button key={cat} onClick={() => setActiveCategory(cat)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition ${activeCategory === cat ? 'bg-yellow-300 text-black' : 'border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white'}`}>{cat}</button>)}</div></section>
      {loading ? <div className="flex items-center justify-center rounded-3xl border border-white/10 bg-zinc-950/60 py-20 text-sm text-zinc-500"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Cargando productos…</div> : filtered.length === 0 ? <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-950/60 py-20 text-sm text-zinc-500"><Package className="mb-3 h-10 w-10 text-zinc-700" /><span>No hay productos{search ? ` que coincidan con “${search}”` : ''}.</span></div> : view === 'cards' ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map((product) => <ProductCard key={product.id} product={product} categoryName={resolveCategoryName(product.category_id, categoryMap)} onEdit={() => router.push(`/admin/productos/${product.id}/editar`)} onDelete={() => setDeleteTarget(product)} onToggle={(field, value) => handleToggle(product, field, value)} />)}</div> : <div className="overflow-x-auto rounded-3xl border border-white/10 bg-zinc-950/70"><table className="w-full text-sm"><thead><tr className="border-b border-white/10 bg-black/30">{['Producto', 'Categoría', 'Precio', 'Stock', 'Activo', 'Destacado', 'Acciones'].map((h) => <th key={h} className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{filtered.map((product) => <tr key={product.id} className="hover:bg-white/[0.03]"><td className="min-w-[260px] px-4 py-4"><div className="flex items-center gap-3">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-14 w-14 rounded-2xl border border-white/10 object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 text-zinc-700"><Package className="h-5 w-5" /></div>}<div className="min-w-0"><p className="truncate font-bold text-white">{product.name}</p><p className="mt-1 line-clamp-1 text-xs text-zinc-500">{product.description || buildProductTagline(product.tagline, undefined)}</p></div></div></td><td className="px-4 py-4 text-zinc-300">{resolveCategoryName(product.category_id, categoryMap)}</td><td className="px-4 py-4 font-bold text-yellow-300">{formatCLP(product.price)}</td><td className="px-4 py-4 text-zinc-300">{product.stock ?? '—'}</td><td className="px-4 py-4"><Toggle checked={product.activo !== false} onChange={(value) => handleToggle(product, 'activo', value)} /></td><td className="px-4 py-4"><Toggle checked={!!product.featured} onChange={(value) => handleToggle(product, 'featured', value)} /></td><td className="px-4 py-4"><div className="flex gap-2"><button onClick={() => router.push(`/admin/productos/${product.id}/editar`)} className="rounded-xl border border-white/10 p-2 text-zinc-300 hover:border-yellow-300/40 hover:text-yellow-200"><Pencil className="h-4 w-4" /></button><button onClick={() => setDeleteTarget(product)} className="rounded-xl border border-red-400/25 p-2 text-red-300 hover:bg-red-400/10"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
      {!loading && <p className="text-xs text-zinc-600">{filtered.length} producto{filtered.length !== 1 ? 's' : ''} mostrado{filtered.length !== 1 ? 's' : ''} · {products.length} total.</p>}
    </div>
    <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); setLoading(true); void loadProducts(); showToast('Productos importados y catálogo actualizado.'); }} />
    {deleteTarget && <DeleteModal product={deleteTarget} onConfirm={() => handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} />}{toast && <Toast message={toast.message} type={toast.type} />}
  </AdminPage>;
}
