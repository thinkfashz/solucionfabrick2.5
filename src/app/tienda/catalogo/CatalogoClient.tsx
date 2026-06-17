'use client';

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUpDown, Package, Search, ShoppingBag, Tag, X } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import UiverseProductCard from '@/components/store/UiverseProductCard';

type PriceFilter = 'all' | 'low' | 'mid' | 'high';
type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';

function getFinalPrice(product: CatalogProduct) {
  const pct = product.discountPercentage ?? 0;
  return pct > 0 ? Math.round(product.price * (1 - pct / 100)) : product.price;
}

function getStockBadge(product: CatalogProduct) {
  const stock = Number((product as { stock?: number | string }).stock ?? NaN);
  if (!Number.isFinite(stock)) return 'Stock por confirmar';
  if (stock <= 3) return `Stock crítico: ${stock}`;
  if (stock <= 10) return `Stock bajo: ${stock}`;
  return `Stock: ${stock}`;
}

function getDeliveryBadge(product: CatalogProduct) {
  const raw = (product.delivery || '').toLowerCase();
  const days = Number(raw.replace(/\D/g, ''));
  if (raw.includes('inmediata') || raw.includes('24h')) return 'Envío express';
  if (Number.isFinite(days) && days > 0) return `${days} días`;
  return 'Plazo normal';
}

const PRICE_LABELS: Record<PriceFilter, string> = {
  all: 'Todo precio',
  low: 'Hasta $80.000',
  mid: '$80.001 – $150.000',
  high: 'Sobre $150.000',
};

const SORT_LABELS: Record<SortMode, string> = {
  featured: 'Destacados',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
  'name-asc': 'Nombre: A-Z',
};

export default function CatalogoClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'gold';
  const { products: catalogProducts, fetchComplete } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(catalogProducts.map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = catalogProducts.filter((product) => {
      if (q && !product.name.toLowerCase().includes(q) && !product.category.toLowerCase().includes(q) && !product.tagline.toLowerCase().includes(q)) return false;
      if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
      const finalPrice = getFinalPrice(product);
      if (priceFilter === 'low' && finalPrice > 80000) return false;
      if (priceFilter === 'mid' && (finalPrice <= 80000 || finalPrice > 150000)) return false;
      if (priceFilter === 'high' && finalPrice <= 150000) return false;
      if (onlyDiscounted && !(product.discountPercentage ?? 0)) return false;
      return true;
    });
    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sortMode === 'price-asc') return getFinalPrice(a) - getFinalPrice(b);
      if (sortMode === 'price-desc') return getFinalPrice(b) - getFinalPrice(a);
      if (sortMode === 'name-asc') return a.name.localeCompare(b.name, 'es');
      const aScore = (a.rating ?? 4.4) + ((a.discountPercentage ?? 0) / 20);
      const bScore = (b.rating ?? 4.4) + ((b.discountPercentage ?? 0) / 20);
      return bScore - aScore;
    });
    return sorted;
  }, [catalogProducts, searchQuery, selectedCategory, priceFilter, onlyDiscounted, sortMode]);

  const clearFilters = () => {
    setSelectedCategory('all');
    setPriceFilter('all');
    setOnlyDiscounted(false);
    setSearchQuery('');
  };

  const handleSelectProduct = (product: CatalogProduct) => navigateWithTransition(`/tienda/${product.id}`, router);
  const handleAddToCart = (e: MouseEvent, product: CatalogProduct) => {
    e.stopPropagation();
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.img } as Parameters<typeof addToCart>[0]);
  };
  const handleBuyNow = (e: MouseEvent, product: CatalogProduct) => {
    e.stopPropagation();
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.img } as Parameters<typeof addToCart>[0]);
    navigateWithTransition(`/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${product.price}`, router);
  };

  return (
    <div className={`min-h-screen pt-[60px] ${isDark ? 'bg-zinc-950 text-white' : 'bg-white text-black'}`}>
      <header className={`relative z-10 border-b transition-colors duration-300 ${isDark ? 'border-white/10 bg-zinc-950' : 'border-neutral-200 bg-white'}`}>
        <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-8 md:py-7">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <button onClick={() => navigateWithTransition('/tienda', router)} className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${isDark ? 'border-white/15 text-zinc-300 hover:border-white/35 hover:text-white' : 'border-neutral-300 text-neutral-700 hover:border-black hover:text-black'}`}>
                <ArrowLeft size={13} /> Volver a la tienda
              </button>
              <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDark ? 'text-yellow-400/80' : 'text-yellow-600'}`}>Catálogo completo</p>
              <h1 className={`mt-2 font-playfair text-3xl font-black leading-tight md:text-5xl ${isDark ? 'text-white' : 'text-neutral-900'}`}>Encuentra el producto exacto sin tapar la vista.</h1>
              <p className={`mt-3 max-w-2xl text-sm leading-6 ${isDark ? 'text-zinc-400' : 'text-neutral-600'}`}>La búsqueda y los filtros ahora quedan arriba como panel normal. Al bajar, los productos quedan libres y visibles.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-4 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-neutral-200 bg-neutral-50'}`}>
              <div className="flex items-center gap-3"><ShoppingBag className={isDark ? 'text-yellow-300' : 'text-neutral-900'} /><div><b>{filteredProducts.length} productos</b><p className="text-xs text-zinc-500">{fetchComplete ? 'Catálogo listo' : 'Sincronizando...'}</p></div></div>
            </div>
          </div>

          <div className={`rounded-[1.7rem] border p-3 shadow-lg ${isDark ? 'border-white/10 bg-black/35 shadow-black/30' : 'border-neutral-200 bg-white shadow-neutral-200/70'}`}>
            <div className="relative">
              <Search size={16} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`} />
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Busca por nombre, categoría o material…" aria-label="Buscar productos en el catálogo" className={`w-full rounded-full border py-3 pl-11 pr-11 text-sm font-medium transition-colors focus:outline-none ${isDark ? 'border-white/15 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-yellow-400' : 'border-neutral-300 bg-neutral-50 text-black placeholder:text-neutral-400 focus:border-black'}`} />
              {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors ${isDark ? 'text-zinc-500 hover:text-white' : 'text-neutral-400 hover:text-black'}`}><X size={15} /></button>}
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setFiltersOpen((v) => !v)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors ${filtersOpen ? 'border-yellow-400 bg-yellow-400 text-black' : isDark ? 'border-white/15 text-zinc-300 hover:border-white/35 hover:text-white' : 'border-neutral-300 text-neutral-700 hover:border-black'}`}><ArrowUpDown size={13} /> Ordenar</button>
              <button onClick={() => setOnlyDiscounted((v) => !v)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${onlyDiscounted ? 'border-red-500 bg-red-500 text-white' : isDark ? 'border-white/15 text-zinc-300 hover:border-white/35 hover:text-white' : 'border-neutral-300 text-neutral-700 hover:border-black'}`}><Tag size={12} /> Ofertas</button>
              {categories.map((category) => <button key={category} onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${selectedCategory === category ? 'border-yellow-400 bg-yellow-400 text-black' : isDark ? 'border-white/15 text-zinc-400 hover:border-white/35 hover:text-white' : 'border-neutral-300 text-neutral-600 hover:border-black'}`}>{category === 'all' ? 'Todos' : category}</button>)}
            </div>
            {filtersOpen && <div className={`mt-3 flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-zinc-900' : 'border-neutral-200 bg-neutral-50'}`}><label className="flex items-center gap-2 text-xs font-bold"><span className={isDark ? 'text-zinc-400' : 'text-neutral-600'}>Ordenar:</span><select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className={`rounded-full border px-3 py-1.5 text-xs font-medium focus:outline-none ${isDark ? 'border-white/15 bg-zinc-950 text-white' : 'border-neutral-300 bg-white text-black'}`}>{(Object.keys(SORT_LABELS) as SortMode[]).map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}</select></label><label className="flex items-center gap-2 text-xs font-bold"><span className={isDark ? 'text-zinc-400' : 'text-neutral-600'}>Precio:</span><select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as PriceFilter)} className={`rounded-full border px-3 py-1.5 text-xs font-medium focus:outline-none ${isDark ? 'border-white/15 bg-zinc-950 text-white' : 'border-neutral-300 bg-white text-black'}`}>{(Object.keys(PRICE_LABELS) as PriceFilter[]).map((key) => <option key={key} value={key}>{PRICE_LABELS[key]}</option>)}</select></label>{(selectedCategory !== 'all' || priceFilter !== 'all' || onlyDiscounted || searchQuery) && <button onClick={clearFilters} className={`text-xs font-black underline underline-offset-4 ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-700 hover:text-yellow-800'}`}>Limpiar filtros</button>}</div>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 pb-32 md:px-8">
        {fetchComplete && filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center"><Package size={48} className={isDark ? 'text-zinc-700' : 'text-neutral-300'} /><p className={`text-lg font-bold ${isDark ? 'text-zinc-300' : 'text-neutral-700'}`}>{searchQuery.trim() ? `Sin resultados para "${searchQuery}"` : 'No encontramos productos con estos filtros'}</p><button onClick={clearFilters} className={`mt-2 rounded-full px-6 py-2.5 text-sm font-bold transition-colors ${isDark ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-black text-white hover:bg-neutral-800'}`}>Limpiar filtros</button></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
            {filteredProducts.map((p) => <UiverseProductCard key={p.id} name={p.name} price={p.price} category={p.category} img={p.img} discountPct={p.discountPercentage ?? 0} rating={p.rating} stockLabel={getStockBadge(p)} deliveryLabel={getDeliveryBadge(p)} isDark={isDark} onSelect={() => handleSelectProduct(p)} onAddToCart={(e) => handleAddToCart(e, p)} onBuyNow={(e) => handleBuyNow(e, p)} />)}
          </div>
        )}
      </main>
    </div>
  );
}
