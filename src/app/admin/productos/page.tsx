'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildProductTagline, resolveCategoryName } from '@/lib/commerce';
import { useCategories } from '@/hooks/useCategories';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  DollarSign,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Star,
  Trash2,
  Truck,
  Upload,
} from 'lucide-react';
import { AdminPage } from '@/components/admin/ui';
import ProductImportModal from './ProductImportModal';
import ProductCategoryManager from './ProductCategoryManager';

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
  source?: string | null;
  source_url?: string | null;
  supplier_price?: number | string | null;
  supplier_currency?: string | null;
  shipping_fee?: number | string | null;
  specifications?: Record<string, unknown> | null;
}

type ViewMode = 'cards' | 'table';
type SortMode = 'newest' | 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'margin_desc';
type CategoryMap = Record<string, string>;

function toNumber(value: number | string | undefined | null) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatCLP(value: number | string | undefined | null) {
  return '$' + Math.round(toNumber(value)).toLocaleString('es-CL');
}

function getSpecs(product: AdminProduct) {
  return product.specifications && typeof product.specifications === 'object' ? product.specifications : {};
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function getGalleryCount(product: AdminProduct) {
  const specs = getSpecs(product);
  const count = Math.max(
    arrayLength(specs.gallery_images),
    arrayLength(specs.gallery_assets),
    arrayLength(specs.images),
    arrayLength(specs.image_urls),
  );
  return Math.max(count, product.image_url ? 1 : 0);
}

function getTaxPct(product: AdminProduct) {
  const specs = getSpecs(product);
  return toNumber(specs.tax_percentage as string | number | undefined);
}

function getMarginPct(product: AdminProduct) {
  const price = toNumber(product.price);
  const cost = toNumber(product.supplier_price);
  if (price <= 0 || cost <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
}

function totalReference(product: AdminProduct) {
  const price = toNumber(product.price);
  const shipping = toNumber(product.shipping_fee);
  const tax = Math.round((price + shipping) * (getTaxPct(product) / 100));
  return price + shipping + tax;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border border-black/10 transition ${checked ? 'bg-yellow-400' : 'bg-black/20'}`}
    >
      <span className={`pointer-events-none mt-0.5 inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed bottom-24 right-4 z-50 max-w-sm rounded-2xl border px-5 py-3 text-sm shadow-2xl backdrop-blur-xl md:bottom-6 ${type === 'success' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : 'border-red-400/30 bg-red-400/10 text-red-200'}`}>
      {message}
    </div>
  );
}

function DeleteModal({ product, onConfirm, onCancel }: { product: AdminProduct; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-red-400/25 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-red-300">
          <Trash2 className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-black text-white">Eliminar producto</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          ¿Seguro que deseas eliminar <span className="font-bold text-white">{product.name}</span>? Esta acción no se puede deshacer.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/5">Cancelar</button>
          <button onClick={onConfirm} className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white hover:bg-red-400">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, categoryName, selected, selectionMode, onSelect, onLongPress, onEdit, onDelete, onToggle }: {
  product: AdminProduct;
  categoryName: string;
  selected: boolean;
  selectionMode: boolean;
  onSelect: () => void;
  onLongPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (field: 'activo' | 'featured', value: boolean) => void;
}) {
  const active = product.activo !== false;
  const stock = product.stock ?? 0;
  const critical = stock > 0 && stock <= 5;
  const margin = getMarginPct(product);
  const taxPct = getTaxPct(product);
  const galleryCount = getGalleryCount(product);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  return (
    <article onPointerDown={() => { pressTimer.current = setTimeout(onLongPress, 450); }} onPointerUp={clearPress} onPointerLeave={clearPress} onClick={() => { if (selectionMode) onSelect(); }} className={`group relative overflow-hidden rounded-[1.8rem] bg-[#F2DFBB] text-[#111214] shadow-[0_22px_70px_rgba(58,45,19,.11)] transition hover:-translate-y-1 ${selected ? 'ring-4 ring-yellow-400/80' : ''}`}>
      {(selectionMode || selected) && <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onSelect(); }} className={`absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-2xl shadow-lg ${selected ? 'bg-yellow-400 text-black' : 'bg-black/70 text-white'}`} aria-label={selected ? 'Quitar selección' : 'Seleccionar producto'}>{selected ? <Check className="h-4 w-4" /> : null}</button>}

      <div className="relative h-52 bg-white/55 p-3">
        {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full rounded-[1.25rem] object-contain transition duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full w-full items-center justify-center rounded-[1.25rem] bg-[#eadfc8] text-black/20"><Package className="h-10 w-10" /></div>}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2 pr-12"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${active ? 'bg-emerald-800 text-white' : 'bg-black/70 text-white'}`}>{active ? 'Activo' : 'Oculto'}</span>{product.featured ? <span className="rounded-full bg-yellow-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-black">Destacado</span> : null}</div>
      </div>

      <div className="space-y-4 p-4 pt-3">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-base font-black">{product.name}</p><p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-[#936716]">{categoryName}</p></div><span className="shrink-0 rounded-xl bg-black px-3 py-2 text-xs font-black text-yellow-300">{formatCLP(product.price)}</span></div>
        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-black/48">{product.description || buildProductTagline(product.tagline, undefined) || 'Sin descripción.'}</p>
        <div className="grid grid-cols-4 gap-1.5 text-center"><div className={`rounded-xl p-2 ${critical ? 'bg-red-600/10 text-red-900' : 'bg-black/[0.045]'}`}><b className="block text-sm">{stock}</b><span className="text-[8px] uppercase tracking-widest opacity-50">Stock</span></div><div className="rounded-xl bg-black/[0.045] p-2"><b className="block text-sm">{galleryCount}</b><span className="text-[8px] uppercase tracking-widest opacity-50">Fotos</span></div><div className="rounded-xl bg-black/[0.045] p-2"><b className="block text-sm">{taxPct || 0}%</b><span className="text-[8px] uppercase tracking-widest opacity-50">IVA</span></div><div className="rounded-xl bg-black/[0.045] p-2"><b className="block text-sm">{margin == null ? '—' : `${margin}%`}</b><span className="text-[8px] uppercase tracking-widest opacity-50">Margen</span></div></div>
        <div className="flex items-center justify-between rounded-2xl bg-[#e8dcc2] px-3 py-2 text-xs"><span className="text-black/45">Total referencial</span><b>{formatCLP(totalReference(product))}</b></div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-black/[0.045] p-3"><label className="flex items-center justify-between gap-2 text-xs text-black/55" onPointerDown={(event) => event.stopPropagation()}>Activo<Toggle checked={active} label={`Activo: ${product.name}`} onChange={(value) => onToggle('activo', value)} /></label><label className="flex items-center justify-between gap-2 text-xs text-black/55" onPointerDown={(event) => event.stopPropagation()}>Destacado<Toggle checked={!!product.featured} label={`Destacado: ${product.name}`} onChange={(value) => onToggle('featured', value)} /></label></div>
        <div className="grid grid-cols-2 gap-3"><button onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onEdit(); }} className="rounded-2xl bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-yellow-300"><Pencil className="mr-1 inline h-4 w-4" />Editar</button><button onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded-2xl bg-red-700/[0.08] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-red-800"><Trash2 className="mr-1 inline h-4 w-4" />Eliminar</button></div>
      </div>
    </article>
  );
}

function ProductsTable({ products, selectedSet, categoryMap, onSelect, onEdit, onDelete, onToggle }: {
  products: AdminProduct[];
  selectedSet: Set<string>;
  categoryMap: CategoryMap;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (product: AdminProduct) => void;
  onToggle: (product: AdminProduct, field: 'activo' | 'featured', value: boolean) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[1.8rem] bg-[#F2DFBB] text-[#111214] shadow-[0_22px_70px_rgba(58,45,19,.10)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 bg-[#e8dcc2]">
            {['Sel.', 'Producto', 'Categoría', 'Precio', 'Envío', 'IVA', 'Fotos', 'Activo', 'Acciones'].map((header) => (
              <th key={header} className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-[0.18em] text-black/45">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.07]">
          {products.map((product) => {
            const selected = selectedSet.has(product.id);
            return (
              <tr key={product.id} className={selected ? 'bg-yellow-300/25' : 'hover:bg-black/[0.025]'}>
                <td className="px-4 py-4">
                  <button onClick={() => onSelect(product.id)} className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-yellow-400 text-black' : 'bg-black/[0.06] text-black/35'}`}>
                    {selected ? <Check className="h-4 w-4" /> : ''}
                  </button>
                </td>
                <td className="min-w-[260px] px-4 py-4">
                  <div className="flex items-center gap-3">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-14 w-14 rounded-2xl bg-white object-contain p-1" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.06] text-black/25"><Package className="h-5 w-5" /></div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-bold">{product.name}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-black/40">{product.source || product.description || buildProductTagline(product.tagline, undefined)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-black/55">{resolveCategoryName(product.category_id, categoryMap)}</td>
                <td className="px-4 py-4 font-black">{formatCLP(product.price)}</td>
                <td className="px-4 py-4 text-black/55">{toNumber(product.shipping_fee) > 0 ? formatCLP(product.shipping_fee) : '—'}</td>
                <td className="px-4 py-4 text-black/55">{getTaxPct(product) || 0}%</td>
                <td className="px-4 py-4 text-[#8c6111]">{getGalleryCount(product)}</td>
                <td className="px-4 py-4"><Toggle checked={product.activo !== false} onChange={(value) => onToggle(product, 'activo', value)} /></td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(product.id)} className="rounded-xl bg-black p-2 text-yellow-300"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => onDelete(product)} className="rounded-xl bg-red-700/[0.08] p-2 text-red-800"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminProductosPage() {
  const router = useRouter();
  const { categories, categoryMap, reload: reloadCategories } = useCategories();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [view, setView] = useState<ViewMode>('cards');
  const [sort, setSort] = useState<SortMode>('newest');
  const [importOpen, setImportOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isMounted = useRef(true);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectionMode = selectedIds.length > 0;

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      if (isMounted.current) setToast(null);
    }, 3200);
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store' });
      const json = await res.json().catch(() => ({} as { error?: string; products?: AdminProduct[] }));
      if (!isMounted.current) return;
      if (!res.ok) {
        setLoadError(json.error ?? `HTTP ${res.status}: No se pudieron cargar los productos.`);
        setProducts([]);
        return;
      }
      setProducts(Array.isArray(json.products) ? json.products : []);
      setLoadError(null);
    } catch (error) {
      if (!isMounted.current) return;
      setLoadError(error instanceof Error ? error.message : 'Error de red cargando productos.');
      setProducts([]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void loadProducts();
    return () => { isMounted.current = false; };
  }, [loadProducts]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function enterSelection(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev : [...prev, id]);
  }

  async function handleToggle(product: AdminProduct, field: 'activo' | 'featured', value: boolean) {
    const previous = products;
    setProducts((prev) => prev.map((item) => item.id === product.id ? { ...item, [field]: value } : item));
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({} as { error?: string }));
      setProducts(previous);
      showToast(json.error ?? 'Error al actualizar el producto.', 'error');
      return;
    }
    showToast(field === 'activo' ? (value ? 'Producto activado.' : 'Producto ocultado.') : (value ? 'Producto destacado.' : 'Quitado de destacados.'));
  }

  async function handleDelete(product: AdminProduct) {
    const res = await fetch(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    setDeleteTarget(null);
    if (!res.ok) {
      const json = await res.json().catch(() => ({} as { error?: string }));
      showToast(json.error ?? 'Error al eliminar el producto.', 'error');
      return;
    }
    setProducts((prev) => prev.filter((item) => item.id !== product.id));
    setSelectedIds((prev) => prev.filter((id) => id !== product.id));
    showToast('Producto eliminado correctamente.');
  }

  async function handleBulkPatch(field: 'activo' | 'featured', value: boolean) {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    const previous = products;
    setProducts((prev) => prev.map((product) => ids.includes(product.id) ? { ...product, [field]: value } : product));
    const results = await Promise.all(ids.map(async (id) => {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      return res.ok;
    }));
    const failed = results.filter((ok) => !ok).length;
    if (failed) {
      setProducts(previous);
      showToast(`${failed} producto(s) no se pudieron actualizar.`, 'error');
      return;
    }
    showToast(`${ids.length} producto(s) actualizados.`);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.length} producto(s) seleccionados?`)) return;
    const ids = [...selectedIds];
    const results = await Promise.all(ids.map(async (id) => ({
      id,
      ok: (await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' })).ok,
    })));
    const deleted = results.filter((item) => item.ok).map((item) => item.id);
    const failed = results.length - deleted.length;
    setProducts((prev) => prev.filter((product) => !deleted.includes(product.id)));
    setSelectedIds([]);
    showToast(failed ? `${deleted.length} eliminado(s), ${failed} fallaron.` : `${deleted.length} producto(s) eliminado(s).`, failed ? 'error' : 'success');
  }

  const filterOptions = useMemo(() => [
    'Todos',
    'Destacados',
    'Activos',
    'Ocultos',
    'Bajo stock',
    'Con envío',
    'Con impuesto',
    'Con fotos',
    ...categories.map((category) => category.name),
  ], [categories]);

  const metrics = useMemo(() => {
    const total = products.length;
    const active = products.filter((product) => product.activo !== false).length;
    const featured = products.filter((product) => product.featured).length;
    const lowStock = products.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5).length;
    const value = products.reduce((sum, product) => sum + toNumber(product.price) * (product.stock ?? 0), 0);
    const gallery = products.reduce((sum, product) => sum + getGalleryCount(product), 0);
    return { total, active, featured, lowStock, value, gallery };
  }, [products]);

  const productCounts = useMemo(() => products.reduce<Record<string, number>>((counts, product) => {
    if (product.category_id) counts[product.category_id] = (counts[product.category_id] || 0) + 1;
    return counts;
  }, {}), [products]);

  const filtered = useMemo(() => products.filter((product) => {
    const q = search.trim().toLowerCase();
    const categoryName = resolveCategoryName(product.category_id, categoryMap);
    const matchSearch = !q
      || product.name.toLowerCase().includes(q)
      || (product.description ?? '').toLowerCase().includes(q)
      || categoryName.toLowerCase().includes(q)
      || (product.source ?? '').toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (activeCategory === 'Todos') return true;
    if (activeCategory === 'Destacados') return !!product.featured;
    if (activeCategory === 'Activos') return product.activo !== false;
    if (activeCategory === 'Ocultos') return product.activo === false;
    if (activeCategory === 'Bajo stock') return (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5;
    if (activeCategory === 'Con envío') return toNumber(product.shipping_fee) > 0;
    if (activeCategory === 'Con impuesto') return getTaxPct(product) > 0;
    if (activeCategory === 'Con fotos') return getGalleryCount(product) > 0;
    return categoryName.toLowerCase() === activeCategory.toLowerCase();
  }), [products, search, activeCategory, categoryMap]);

  const sortedProducts = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'es');
      if (sort === 'price_asc') return toNumber(a.price) - toNumber(b.price);
      if (sort === 'price_desc') return toNumber(b.price) - toNumber(a.price);
      if (sort === 'stock_asc') return (a.stock ?? 0) - (b.stock ?? 0);
      if (sort === 'stock_desc') return (b.stock ?? 0) - (a.stock ?? 0);
      if (sort === 'margin_desc') return (getMarginPct(b) ?? -999) - (getMarginPct(a) ?? -999);
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });
    return list;
  }, [filtered, sort]);

  const allVisibleSelected = sortedProducts.length > 0 && sortedProducts.every((product) => selectedSet.has(product.id));

  function toggleVisibleSelection() {
    setSelectedIds((prev) => allVisibleSelected
      ? prev.filter((id) => !sortedProducts.some((product) => product.id === id))
      : Array.from(new Set([...prev, ...sortedProducts.map((product) => product.id)]))
    );
  }

  return (
    <AdminPage className="px-1 text-[#111214] md:px-2">
      <section className="relative overflow-hidden rounded-[2.2rem] bg-[radial-gradient(circle_at_90%_10%,rgba(255, 176, 0,.65),transparent_25rem),linear-gradient(135deg,#fff9ec,#e3d1ad)] p-5 shadow-[0_30px_100px_rgba(58,45,19,.15)] sm:p-8">
        <div className="grid gap-7 xl:grid-cols-[1fr_520px] xl:items-end">
          <div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-black px-3 py-2 text-[9px] font-black uppercase tracking-[.18em] text-yellow-300">Catálogo central</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white/55 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-black/55"><Cloud className="h-3 w-3" />Imágenes organizadas</span></div><h1 className="mt-6 max-w-3xl text-[clamp(42px,7vw,78px)] font-black leading-[.87] tracking-[-.075em]">Productos claros, ordenados y listos para vender.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-black/55">Crea manualmente, importa en bloque o captura desde un enlace. Las categorías organizan el catálogo y definen la carpeta de cada galería.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            <button onClick={() => router.push('/admin/productos/nuevo')} className="col-span-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-xs font-black uppercase tracking-[.15em] text-yellow-300 xl:col-span-2"><Plus className="h-4 w-4" />Crear producto</button>
            <button onClick={() => setImportOpen(true)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 text-xs font-black text-black"><Upload className="h-4 w-4" />Carga masiva</button>
            <button onClick={() => router.push('/admin/productos/importar')} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white/55 px-4 text-xs font-black text-black"><Link2 className="h-4 w-4" />Desde enlace</button>
            <button onClick={() => setCategoriesOpen(true)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#d4bc8e] px-4 text-xs font-black text-black"><FolderOpen className="h-4 w-4" />Categorías</button>
            <button onClick={() => { setLoading(true); void loadProducts(); }} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white/55 px-4 text-xs font-black text-black"><RefreshCw className="h-4 w-4" />Actualizar</button>
          </div>
        </div>
      </section>

      {loadError ? <div className="rounded-[1.5rem] bg-[#f7d1c8] p-4 text-sm text-[#7a2418]"><b className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Error cargando productos</b><p className="mt-1 opacity-75">{loadError}</p></div> : null}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {[
          { label: 'Productos', value: String(metrics.total), icon: Package, card: 'bg-[#F2DFBB]' },
          { label: 'Activos', value: String(metrics.active), icon: CheckCircle2, card: 'bg-[#d8e4cf]' },
          { label: 'Destacados', value: String(metrics.featured), icon: Star, card: 'bg-yellow-300' },
          { label: 'Stock crítico', value: String(metrics.lowStock), icon: AlertTriangle, card: 'bg-[#f4d3ca]' },
          { label: 'Imágenes', value: String(metrics.gallery), icon: ImageIcon, card: 'bg-[#ded4bf]' },
          { label: 'Valor inventario', value: formatCLP(metrics.value), icon: DollarSign, card: 'bg-[#111214] text-[#fff7e7]' },
        ].map(({ label, value, icon: Icon, card }) => <article key={label} className={`rounded-[1.55rem] p-4 shadow-[0_18px_55px_rgba(58,45,19,.09)] ${card}`}><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.17em] opacity-45">{label}</span><Icon className="h-4 w-4 opacity-55" /></div><b className="mt-4 block truncate text-2xl font-black tracking-[-.05em]">{value}</b></article>)}
      </section>

      {selectionMode ? <section className="sticky top-20 z-30 rounded-[1.6rem] bg-[#111214]/95 p-3 text-white shadow-2xl backdrop-blur-xl"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><b className="text-sm">{selectedIds.length} seleccionado{selectedIds.length === 1 ? '' : 's'}</b><p className="text-xs text-white/40">Aplicar cambios sin abrir cada ficha.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => void handleBulkPatch('activo', true)} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold">Activar</button><button onClick={() => void handleBulkPatch('activo', false)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Ocultar</button><button onClick={() => void handleBulkPatch('featured', true)} className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black">Destacar</button><button onClick={() => void handleBulkPatch('featured', false)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Quitar destacado</button><button onClick={() => void handleBulkDelete()} className="rounded-xl bg-red-700 px-3 py-2 text-xs font-black">Eliminar</button><button onClick={() => setSelectedIds([])} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold">Cancelar</button></div></div></section> : null}

      <section className="rounded-[1.8rem] bg-[#e8dcc2] p-4 shadow-[0_20px_65px_rgba(58,45,19,.10)] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_190px_auto_auto] lg:items-center"><div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, categoría o proveedor" className="w-full rounded-2xl border border-black/10 bg-white/60 py-3.5 pl-11 pr-4 text-sm font-semibold text-black outline-none placeholder:text-black/30 focus:border-[#C97700]" /></div><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3.5 text-sm font-bold text-black outline-none"><option value="newest">Más recientes</option><option value="name">Nombre A-Z</option><option value="price_asc">Precio menor</option><option value="price_desc">Precio mayor</option><option value="stock_asc">Stock menor</option><option value="stock_desc">Stock mayor</option><option value="margin_desc">Mejor margen</option></select><div className="flex rounded-2xl bg-black/[0.07] p-1"><button onClick={() => setView('cards')} className={`rounded-xl px-3 py-2.5 text-xs font-black ${view === 'cards' ? 'bg-black text-yellow-300' : 'text-black/45'}`}><Eye className="mr-1 inline h-3.5 w-3.5" />Tarjetas</button><button onClick={() => setView('table')} className={`rounded-xl px-3 py-2.5 text-xs font-black ${view === 'table' ? 'bg-black text-yellow-300' : 'text-black/45'}`}><Settings2 className="mr-1 inline h-3.5 w-3.5" />Tabla</button></div><button onClick={toggleVisibleSelection} className="rounded-2xl bg-white/55 px-4 py-3.5 text-xs font-black">{allVisibleSelected ? 'Quitar visibles' : 'Seleccionar visibles'}</button></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{filterOptions.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold ${activeCategory === category ? 'bg-yellow-400 text-black' : 'bg-white/48 text-black/48 hover:text-black'}`}>{category}</button>)}</div>
      </section>

      {loading ? <div className="flex items-center justify-center rounded-[1.8rem] bg-[#F2DFBB] py-24 text-sm text-black/45"><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Cargando catálogo…</div> : sortedProducts.length === 0 ? <div className="flex flex-col items-center justify-center rounded-[1.8rem] bg-[#F2DFBB] py-24 text-sm text-black/45"><Package className="mb-3 h-10 w-10 text-black/20" /><span>No hay productos{search ? ` que coincidan con “${search}”` : ''}.</span><button onClick={() => router.push('/admin/productos/nuevo')} className="mt-5 rounded-full bg-black px-5 py-3 text-xs font-black text-yellow-300">Crear el primero</button></div> : view === 'cards' ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{sortedProducts.map((product) => <ProductCard key={product.id} product={product} categoryName={resolveCategoryName(product.category_id, categoryMap)} selected={selectedSet.has(product.id)} selectionMode={selectionMode} onSelect={() => toggleSelected(product.id)} onLongPress={() => enterSelection(product.id)} onEdit={() => router.push(`/admin/productos/${product.id}/editar`)} onDelete={() => setDeleteTarget(product)} onToggle={(field, value) => handleToggle(product, field, value)} />)}</div> : <ProductsTable products={sortedProducts} selectedSet={selectedSet} categoryMap={categoryMap} onSelect={toggleSelected} onEdit={(id) => router.push(`/admin/productos/${id}/editar`)} onDelete={(product) => setDeleteTarget(product)} onToggle={handleToggle} />}

      {!loading ? <p className="px-2 text-xs font-semibold text-black/38">Mostrando {sortedProducts.length} de {products.length} productos · Mantén presionada una tarjeta para selección múltiple.</p> : null}

      <ProductImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); setLoading(true); void Promise.all([loadProducts(), reloadCategories()]); showToast('Productos importados y catálogo actualizado.'); }} />
      <ProductCategoryManager open={categoriesOpen} categories={categories} productCounts={productCounts} onClose={() => setCategoriesOpen(false)} onChanged={reloadCategories} />
      {deleteTarget ? <DeleteModal product={deleteTarget} onConfirm={() => handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} /> : null}
      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </AdminPage>
  );
}
