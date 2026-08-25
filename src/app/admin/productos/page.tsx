'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/ui';
import { resolveCategoryName } from '@/lib/commerce';
import { useCategories } from '@/hooks/useCategories';
import MercadoLibreScraper from '@/components/admin/MercadoLibreScraper';
import ProductImportModal from './ProductImportModal';
import ProductCategoryManager from './ProductCategoryManager';
import ProductStudioEditor, { type ProductStudioRecord } from './ProductStudioEditor';

type Filter = 'all' | 'active' | 'hidden' | 'featured' | 'low-stock' | 'without-image' | 'without-seo' | 'market';
type Sort = 'newest' | 'name' | 'price-desc' | 'price-asc' | 'stock-asc';

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(numberValue(value)));
}

function specs(product: ProductStudioRecord) {
  return product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
}

function marketIntel(product: ProductStudioRecord) {
  const value = specs(product).market_intel;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function marketMargin(product: ProductStudioRecord) {
  const market = marketIntel(product);
  if (!market) return null;
  const current = numberValue(market.current_estimated_net_margin_percentage);
  if (market.current_estimated_net_margin_percentage != null) return current;
  if (market.estimated_net_margin_percentage != null) return numberValue(market.estimated_net_margin_percentage);
  return null;
}

function galleryCount(product: ProductStudioRecord) {
  const data = specs(product);
  const arrays = [data.gallery_images, data.gallery_assets, data.images, data.image_urls].filter(Array.isArray) as unknown[][];
  return Math.max(product.image_url ? 1 : 0, ...arrays.map((value) => value.length), 0);
}

function hasSeo(product: ProductStudioRecord) {
  const seo = specs(product).seo;
  if (!seo || typeof seo !== 'object' || Array.isArray(seo)) return false;
  const row = seo as Record<string, unknown>;
  return Boolean(String(row.title || '').trim() && String(row.description || '').trim() && String(row.primary_keyword || '').trim());
}

function margin(product: ProductStudioRecord) {
  const price = numberValue(product.price);
  const cost = numberValue(product.supplier_price);
  return price > 0 && cost > 0 ? Math.round(((price - cost) / price) * 100) : null;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={(event) => { event.stopPropagation(); onChange(!checked); }} className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition ${checked ? 'bg-[#111214]' : 'bg-black/15'}`}><span className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></button>;
}

function Metric({ label, value, note, icon: Icon, tone = 'light' }: { label: string; value: string; note: string; icon: typeof Package; tone?: 'light' | 'dark' | 'warning' }) {
  const style = tone === 'dark' ? 'bg-[#111214] text-white' : tone === 'warning' ? 'bg-[#f7dfd6] text-[#5f281d]' : 'bg-[#fffaf0] text-[#111214]';
  return <article className={`rounded-2xl border border-black/7 p-4 shadow-sm ${style}`}><div className="flex items-center justify-between"><p className={`text-[9px] font-black uppercase tracking-[.16em] ${tone === 'dark' ? 'text-white/35' : 'text-black/35'}`}>{label}</p><Icon className={`h-4 w-4 ${tone === 'dark' ? 'text-[#f5c75d]' : 'opacity-40'}`} /></div><p className="mt-3 truncate text-2xl font-black tracking-[-.04em]">{value}</p><p className={`mt-1 text-[11px] ${tone === 'dark' ? 'text-white/40' : 'text-black/40'}`}>{note}</p></article>;
}

function DeleteModal({ product, onCancel, onConfirm, busy }: { product: ProductStudioRecord; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  return <div className="fixed inset-0 z-[150] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-[#fffaf0] p-5 shadow-2xl"><div className="grid h-11 w-11 place-items-center rounded-xl bg-red-100 text-red-700"><Trash2 className="h-5 w-5" /></div><h3 className="mt-4 text-xl font-black">Eliminar producto</h3><p className="mt-2 text-sm leading-6 text-black/48">Se eliminará <b className="text-black">{product.name}</b> del catálogo. Esta acción no se puede deshacer.</p><div className="mt-5 grid grid-cols-2 gap-2"><button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-black/10 bg-white px-4 py-3 text-xs font-black">Cancelar</button><button type="button" disabled={busy} onClick={onConfirm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Eliminar</button></div></div></div>;
}

function UrlImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/75 p-2 backdrop-blur-xl sm:p-5"><div className="mx-auto min-h-full max-w-5xl rounded-[1.8rem] bg-[#f4efe4] p-3 shadow-2xl sm:p-5"><header className="mb-4 flex items-start justify-between gap-4 rounded-2xl bg-[#111214] p-5 text-white"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#f5c75d]">Importación asistida</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Crear desde un enlace</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-white/45">Pega una URL de Mercado Libre u otra tienda. Revisa los datos antes de incorporarlos al catálogo.</p></div><button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/8"><X className="h-4 w-4" /></button></header><MercadoLibreScraper /></div></div>;
}

export default function AdminProductosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { categories, categoryMap, reload: reloadCategories } = useCategories();
  const [products, setProducts] = useState<ProductStudioRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [studio, setStudio] = useState<{ mode: 'create' | 'edit'; product?: ProductStudioRecord } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [urlImportOpen, setUrlImportOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductStudioRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const mounted = useRef(true);

  const showToast = useCallback((text: string, type: 'ok' | 'error' = 'ok') => {
    setToast({ text, type });
    window.setTimeout(() => { if (mounted.current) setToast(null); }, 3200);
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await response.json().catch(() => ({})) as { products?: ProductStudioRecord[]; error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el catálogo.');
      if (mounted.current) {
        setProducts(Array.isArray(json.products) ? json.products : []);
        setError(null);
      }
    } catch (loadError) {
      if (mounted.current) setError(loadError instanceof Error ? loadError.message : 'Error cargando productos.');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadProducts();
    return () => { mounted.current = false; };
  }, [loadProducts]);

  useEffect(() => {
    const studioParam = searchParams.get('studio');
    const importParam = searchParams.get('import');
    if (importParam === 'url') setUrlImportOpen(true);
    if (!studioParam) return;
    if (studioParam === 'new') {
      setStudio((current) => current?.mode === 'create' ? current : { mode: 'create' });
      return;
    }
    const product = products.find((item) => item.id === studioParam);
    if (product) setStudio({ mode: 'edit', product });
  }, [searchParams, products]);

  const metrics = useMemo(() => {
    const active = products.filter((product) => product.activo !== false).length;
    const lowStock = products.filter((product) => numberValue(product.stock) > 0 && numberValue(product.stock) <= 5).length;
    const ready = products.filter((product) => product.image_url && hasSeo(product) && product.description && numberValue(product.price) > 0).length;
    const market = products.filter((product) => Boolean(marketIntel(product))).length;
    const value = products.reduce((sum, product) => sum + numberValue(product.price) * Math.max(0, numberValue(product.stock)), 0);
    return { active, lowStock, ready, market, value };
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = products.filter((product) => {
      const category = resolveCategoryName(product.category_id || undefined, categoryMap);
      if (needle && ![product.name, product.description, product.sku, product.ean, product.source, category].some((value) => String(value || '').toLowerCase().includes(needle))) return false;
      if (filter === 'active') return product.activo !== false;
      if (filter === 'hidden') return product.activo === false;
      if (filter === 'featured') return Boolean(product.featured);
      if (filter === 'low-stock') return numberValue(product.stock) > 0 && numberValue(product.stock) <= 5;
      if (filter === 'without-image') return !product.image_url;
      if (filter === 'without-seo') return !hasSeo(product);
      if (filter === 'market') return Boolean(marketIntel(product));
      return true;
    });
    return result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      if (sort === 'price-desc') return numberValue(b.price) - numberValue(a.price);
      if (sort === 'price-asc') return numberValue(a.price) - numberValue(b.price);
      if (sort === 'stock-asc') return numberValue(a.stock) - numberValue(b.stock);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [products, query, filter, sort, categoryMap]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const categoryCounts = useMemo(() => products.reduce<Record<string, number>>((acc, product) => { if (product.category_id) acc[product.category_id] = (acc[product.category_id] || 0) + 1; return acc; }, {}), [products]);

  function replaceQuery(params: URLSearchParams) {
    const value = params.toString();
    router.replace(value ? `/admin/productos?${value}` : '/admin/productos', { scroll: false });
  }

  function openCreate() {
    setStudio({ mode: 'create' });
    const params = new URLSearchParams(searchParams.toString());
    params.set('studio', 'new');
    params.delete('import');
    replaceQuery(params);
  }

  function openEdit(product: ProductStudioRecord) {
    setStudio({ mode: 'edit', product });
    const params = new URLSearchParams(searchParams.toString());
    params.set('studio', product.id);
    params.delete('import');
    replaceQuery(params);
  }

  function closeStudio() {
    setStudio(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('studio');
    replaceQuery(params);
  }

  function openUrlImport() {
    setUrlImportOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('studio');
    params.set('import', 'url');
    replaceQuery(params);
  }

  function closeUrlImport() {
    setUrlImportOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('import');
    replaceQuery(params);
    setLoading(true);
    void loadProducts();
  }

  async function patchProduct(product: ProductStudioRecord, patch: Record<string, unknown>) {
    const previous = products;
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, ...patch } : item));
    const response = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!response.ok) {
      const json = await response.json().catch(() => ({})) as { error?: string };
      setProducts(previous);
      showToast(json.error || 'No se pudo actualizar el producto.', 'error');
      return false;
    }
    return true;
  }

  async function bulkPatch(patch: Record<string, unknown>) {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const results = await Promise.all(ids.map(async (id) => (await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })).ok));
    const failed = results.filter((ok) => !ok).length;
    if (failed) showToast(`${failed} producto(s) no se pudieron actualizar.`, 'error');
    else showToast(`${ids.length} producto(s) actualizados.`);
    setSelectedIds([]);
    await loadProducts();
  }

  async function deleteProduct() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/products?id=${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo eliminar.');
      setProducts((current) => current.filter((item) => item.id !== deleteTarget.id));
      setSelectedIds((current) => current.filter((id) => id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('Producto eliminado.');
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminPage className="px-1 text-[#111214] md:px-2">
      <section className="rounded-[1.8rem] border border-black/7 bg-[#fffaf0] p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#111214] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#f5c75d]">Catálogo</span><span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0bd] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-[#7e5814]"><Sparkles className="h-3 w-3" />IA integrada</span><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-emerald-800"><TrendingUp className="h-3 w-3" />Radar conectado</span></div><h1 className="mt-3 text-3xl font-black tracking-[-.055em] sm:text-4xl">Productos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">Un solo lugar para crear, editar, analizar con IA, organizar imágenes, precio, inventario y SEO. Los candidatos del radar conservan su guía de precio y margen.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end"><button type="button" onClick={openCreate} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#111214] px-4 text-xs font-black text-white sm:col-span-1"><Plus className="h-4 w-4 text-[#f5c75d]" />Nuevo producto</button><button type="button" onClick={() => router.push('/admin/inteligencia-mercado')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3.5 text-xs font-black text-white"><BarChart3 className="h-4 w-4" />Mercado</button><button type="button" onClick={() => setImportOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-[#fff0bd] px-3.5 text-xs font-black text-[#76500f]"><Upload className="h-4 w-4" />Importar</button><button type="button" onClick={openUrlImport} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-3.5 text-xs font-black text-black/60"><Link2 className="h-4 w-4" />Desde URL</button><button type="button" onClick={() => setCategoriesOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-3.5 text-xs font-black text-black/60"><FolderOpen className="h-4 w-4" />Categorías</button><button type="button" onClick={() => { setLoading(true); void loadProducts(); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/8 bg-white px-3.5 text-xs font-black text-black/60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button></div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-6"><Metric label="Productos" value={String(products.length)} note="Catálogo total" icon={Package} /><Metric label="Activos" value={String(metrics.active)} note="Visibles en tienda" icon={CheckCircle2} /><Metric label="Fichas listas" value={String(metrics.ready)} note="Contenido + imagen + SEO" icon={Sparkles} /><Metric label="Desde radar" value={String(metrics.market)} note="Con referencia de mercado" icon={TrendingUp} /><Metric label="Stock crítico" value={String(metrics.lowStock)} note="Entre 1 y 5 unidades" icon={AlertTriangle} tone={metrics.lowStock ? 'warning' : 'light'} /><Metric label="Valor inventario" value={money(metrics.value)} note="Precio × unidades" icon={Boxes} tone="dark" /></section>

      {selectedIds.length ? <section className="sticky top-20 z-30 flex flex-col gap-3 rounded-2xl bg-[#111214]/96 p-3 text-white shadow-xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black">{selectedIds.length} seleccionado{selectedIds.length === 1 ? '' : 's'}</p><p className="text-[11px] text-white/40">Acciones rápidas sin abrir cada ficha.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void bulkPatch({ activo: true })} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black">Activar</button><button type="button" onClick={() => void bulkPatch({ activo: false })} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black">Ocultar</button><button type="button" onClick={() => void bulkPatch({ featured: true })} className="rounded-lg bg-[#f5c75d] px-3 py-2 text-xs font-black text-black">Destacar</button><button type="button" onClick={() => void bulkPatch({ featured: false })} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black">Quitar destacado</button><button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-black">Cancelar</button></div></section> : null}

      <section className="rounded-2xl border border-black/7 bg-[#efe6d6] p-3 shadow-sm sm:p-4"><div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_190px]"><label className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, SKU, EAN, categoría o proveedor" className="min-h-11 w-full rounded-xl border border-black/8 bg-white pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#d18b16]" /></label><select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="min-h-11 rounded-xl border border-black/8 bg-white px-3 text-xs font-black outline-none"><option value="all">Todos</option><option value="market">Desde radar</option><option value="active">Activos</option><option value="hidden">Ocultos</option><option value="featured">Destacados</option><option value="low-stock">Stock crítico</option><option value="without-image">Sin imagen</option><option value="without-seo">SEO pendiente</option></select><select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="min-h-11 rounded-xl border border-black/8 bg-white px-3 text-xs font-black outline-none"><option value="newest">Más recientes</option><option value="name">Nombre A-Z</option><option value="price-desc">Precio mayor</option><option value="price-asc">Precio menor</option><option value="stock-asc">Stock menor</option></select></div></section>

      <section className="overflow-hidden rounded-[1.6rem] border border-black/7 bg-[#fffaf0] shadow-sm">
        <div className="hidden grid-cols-[46px_minmax(280px,1fr)_150px_120px_92px_110px_116px] items-center gap-3 border-b border-black/7 bg-[#f1e8d8] px-4 py-3 text-[9px] font-black uppercase tracking-[.14em] text-black/35 lg:grid"><span></span><span>Producto</span><span>Precio</span><span>Stock</span><span>SEO</span><span>Estado</span><span>Acciones</span></div>
        {loading ? <div className="grid min-h-64 place-items-center text-sm text-black/40"><span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Cargando catálogo…</span></div> : filtered.length === 0 ? <div className="grid min-h-64 place-items-center p-6 text-center"><div><Package className="mx-auto h-9 w-9 text-black/15" /><p className="mt-3 text-sm font-black">No hay productos para este filtro.</p><button type="button" onClick={openCreate} className="mt-4 rounded-xl bg-[#111214] px-4 py-2.5 text-xs font-black text-[#f5c75d]">Crear producto</button></div></div> : <div className="divide-y divide-black/[0.06]">{filtered.map((product) => {
          const selected = selectedSet.has(product.id);
          const category = resolveCategoryName(product.category_id || undefined, categoryMap);
          const productMargin = margin(product);
          const radarMargin = marketMargin(product);
          const fromRadar = Boolean(marketIntel(product));
          const low = numberValue(product.stock) > 0 && numberValue(product.stock) <= 5;
          return <article key={product.id} onDoubleClick={() => openEdit(product)} className={`grid gap-3 px-3 py-3 transition hover:bg-[#fff5df] sm:px-4 lg:grid-cols-[46px_minmax(280px,1fr)_150px_120px_92px_110px_116px] lg:items-center ${selected ? 'bg-[#fff0bd]/45' : ''}`}>
            <button type="button" onClick={() => setSelectedIds((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])} className={`absolute right-3 mt-1 grid h-9 w-9 place-items-center rounded-xl lg:static lg:right-auto lg:mt-0 ${selected ? 'bg-[#f5c75d] text-black' : 'bg-black/[0.05] text-black/25'}`} aria-label="Seleccionar producto">{selected ? <Check className="h-4 w-4" /> : null}</button>
            <div className="flex min-w-0 items-center gap-3 pr-12 lg:pr-0">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-14 w-14 shrink-0 rounded-xl border border-black/7 bg-white object-contain p-1" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-black/[0.04] text-black/15"><Package className="h-5 w-5" /></div>}<div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-black">{product.name}</p>{product.featured ? <Star className="h-3.5 w-3.5 shrink-0 fill-[#f5c75d] text-[#aa7416]" /> : null}{fromRadar ? <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-emerald-800">Radar</span> : null}</div><p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[.11em] text-[#986a18]">{category}</p><div className="mt-1.5 flex flex-wrap gap-2 text-[10px] text-black/35">{product.sku ? <span>SKU {product.sku}</span> : null}<span>{galleryCount(product)} foto{galleryCount(product) === 1 ? '' : 's'}</span>{radarMargin != null ? <span className={radarMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}>Margen radar {radarMargin.toFixed(1)}%</span> : productMargin != null ? <span>Margen {productMargin}%</span> : null}</div></div></div>
            <div className="flex items-center justify-between lg:block"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30 lg:hidden">Precio</span><div><p className="text-sm font-black">{money(product.price)}</p>{numberValue(product.discount_percentage) > 0 ? <p className="text-[10px] font-bold text-[#a76c0a]">-{numberValue(product.discount_percentage)}%</p> : null}</div></div>
            <div className="flex items-center justify-between lg:block"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30 lg:hidden">Stock</span><span className={`inline-flex rounded-lg px-2.5 py-1.5 text-xs font-black ${low ? 'bg-red-100 text-red-700' : 'bg-black/[0.04] text-black/55'}`}>{numberValue(product.stock)}</span></div>
            <div className="flex items-center justify-between lg:block"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30 lg:hidden">SEO</span><span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-black ${hasSeo(product) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{hasSeo(product) ? <CheckCircle2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}{hasSeo(product) ? 'Listo' : 'Pendiente'}</span></div>
            <div className="flex items-center justify-between gap-2 lg:justify-start"><span className="text-[9px] font-black uppercase tracking-[.12em] text-black/30 lg:hidden">Activo</span><Toggle checked={product.activo !== false} onChange={(value) => void patchProduct(product, { activo: value })} label={`Activo: ${product.name}`} /></div>
            <div className="flex justify-end gap-1.5"><button type="button" onClick={() => openEdit(product)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#111214] px-3 text-[10px] font-black text-white lg:flex-none"><Pencil className="h-3.5 w-3.5" />Editar</button><button type="button" onClick={() => setDeleteTarget(product)} className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-700"><Trash2 className="h-3.5 w-3.5" /></button><button type="button" onClick={() => openEdit(product)} className="hidden h-9 w-9 place-items-center rounded-lg bg-black/[0.04] text-black/40 xl:grid"><ChevronRight className="h-4 w-4" /></button></div>
          </article>;
        })}</div>}
      </section>

      {!loading ? <p className="px-2 text-[11px] font-semibold text-black/35">Mostrando {filtered.length} de {products.length} productos. Doble clic en una fila para editar.</p> : null}

      <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); setLoading(true); void Promise.all([loadProducts(), reloadCategories()]); showToast('Importación completada y catálogo actualizado.'); }} />
      <ProductCategoryManager open={categoriesOpen} categories={categories} productCounts={categoryCounts} onClose={() => setCategoriesOpen(false)} onChanged={reloadCategories} />
      <UrlImportModal open={urlImportOpen} onClose={closeUrlImport} />

      {studio ? <div className="fixed inset-0 z-[130] bg-black/55 backdrop-blur-sm"><div className="absolute inset-y-0 right-0 w-full overflow-y-auto shadow-[-30px_0_90px_rgba(0,0,0,.28)] xl:w-[min(1180px,88vw)]"><ProductStudioEditor key={`${studio.mode}-${studio.product?.id || 'new'}`} mode={studio.mode} product={studio.product} onClose={closeStudio} onSaved={(saved) => { setProducts((current) => { const exists = current.some((item) => item.id === saved.id); return exists ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]; }); showToast(studio.mode === 'create' ? 'Producto creado correctamente.' : 'Cambios guardados.'); closeStudio(); }} /></div></div> : null}
      {deleteTarget ? <DeleteModal product={deleteTarget} busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteProduct()} /> : null}
      {toast ? <div className={`fixed bottom-20 right-4 z-[170] max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl md:bottom-5 ${toast.type === 'ok' ? 'border-emerald-300 bg-emerald-50/95 text-emerald-800' : 'border-red-300 bg-red-50/95 text-red-800'}`}>{toast.text}</div> : null}
    </AdminPage>
  );
}
