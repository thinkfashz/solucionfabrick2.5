'use client';

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, ShoppingBag, Tag, X } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import UiverseProductCard from '@/components/store/UiverseProductCard';

function getStockBadge(product: CatalogProduct) {
  const rawStock = (product as { stock?: number | string }).stock;
  const stock = typeof rawStock === 'number' ? rawStock : Number(String(rawStock || '').replace(/[^0-9]/g, ''));
  if (!Number.isFinite(stock) || stock <= 0) return 'Stock por confirmar';
  if (stock <= 3) return `Stock crítico: ${stock}`;
  if (stock <= 10) return `Stock bajo: ${stock}`;
  return `Stock: ${stock}`;
}

function getDeliveryBadge(product: CatalogProduct) {
  const raw = (product.delivery || '').toLowerCase();
  if (raw.includes('inmediata') || raw.includes('24h')) return 'Envío express';
  return product.delivery || 'Plazo normal';
}

export default function CatalogoClient() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'gold';
  const { products, fetchComplete } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);

  const categories = useMemo(() => ['all', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))], [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query || `${product.name} ${product.category} ${product.tagline}`.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesDiscount = !onlyDiscounted || Boolean(product.discountPercentage);
      return matchesSearch && matchesCategory && matchesDiscount;
    });
  }, [onlyDiscounted, products, searchQuery, selectedCategory]);

  const clearFilters = () => {
    setSelectedCategory('all');
    setOnlyDiscounted(false);
    setSearchQuery('');
  };

  const handleSelectProduct = (product: CatalogProduct) => navigateWithTransition(`/tienda/${product.id}`, router);
  const handleAddToCart = (e: MouseEvent, product: CatalogProduct) => {
    e.stopPropagation();
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.img, category_id: product.category, discount_percentage: product.discountPercentage } as Parameters<typeof addToCart>[0]);
  };

  return (
    <div className={`min-h-screen pt-[60px] ${isDark ? 'bg-zinc-950 text-white' : 'bg-[#f5f2ea] text-black'}`}>
      <header className={`border-b ${isDark ? 'border-white/10 bg-zinc-950' : 'border-black/5 bg-white'}`}>
        <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-8 md:py-7">
          <button onClick={() => navigateWithTransition('/tienda', router)} className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold ${isDark ? 'border-white/15 text-zinc-300' : 'border-neutral-300 text-neutral-700'}`}><ArrowLeft size={13} /> Volver a la tienda</button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isDark ? 'text-yellow-400/80' : 'text-yellow-700'}`}>Catálogo completo</p>
              <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-.055em] md:text-5xl">Encuentra el producto exacto sin tapar la vista.</h1>
              <p className={`mt-3 max-w-2xl text-sm leading-6 ${isDark ? 'text-zinc-400' : 'text-neutral-600'}`}>Búsqueda, filtros y bolso con una sola acción clara por producto.</p>
            </div>
            <div className={`rounded-[1.5rem] border p-4 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-black/5 bg-neutral-50'}`}><div className="flex items-center gap-3"><ShoppingBag className={isDark ? 'text-yellow-300' : 'text-neutral-900'} /><div><b>{filteredProducts.length} productos</b><p className="text-xs text-zinc-500">{fetchComplete ? 'Catálogo listo' : 'Sincronizando...'}</p></div></div></div>
          </div>

          <div className={`mt-5 rounded-[1.7rem] border p-3 shadow-lg ${isDark ? 'border-white/10 bg-black/35 shadow-black/30' : 'border-black/5 bg-white shadow-neutral-200/70'}`}>
            <div className="relative">
              <Search size={16} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`} />
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Busca por nombre, categoría o material…" aria-label="Buscar productos" className={`w-full rounded-full border py-3 pl-11 pr-11 text-sm font-medium focus:outline-none ${isDark ? 'border-white/15 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-yellow-400' : 'border-neutral-300 bg-neutral-50 text-black placeholder:text-neutral-400 focus:border-black'}`} />
              {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 hover:text-black dark:hover:text-white"><X size={15} /></button>}
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setOnlyDiscounted((value) => !value)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold ${onlyDiscounted ? 'border-red-500 bg-red-500 text-white' : isDark ? 'border-white/15 text-zinc-300' : 'border-neutral-300 text-neutral-700'}`}><Tag size={12} /> Ofertas</button>
              {categories.map((category) => <button key={category} onClick={() => setSelectedCategory(category)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${selectedCategory === category ? 'border-yellow-400 bg-yellow-400 text-black' : isDark ? 'border-white/15 text-zinc-400' : 'border-neutral-300 text-neutral-600'}`}>{category === 'all' ? 'Todos' : category}</button>)}
              {(selectedCategory !== 'all' || onlyDiscounted || searchQuery) && <button onClick={clearFilters} className="shrink-0 rounded-full px-3.5 py-2 text-xs font-black underline underline-offset-4">Limpiar</button>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8 pb-32 md:px-8">
        {fetchComplete && filteredProducts.length === 0 ? (
          <div className="py-28 text-center"><p className="text-lg font-bold">No encontramos productos con estos filtros.</p><button onClick={clearFilters} className={`mt-4 rounded-full px-6 py-2.5 text-sm font-bold ${isDark ? 'bg-yellow-400 text-black' : 'bg-black text-white'}`}>Limpiar filtros</button></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-6">
            {filteredProducts.map((product) => <UiverseProductCard key={product.id} name={product.name} price={product.price} category={product.category} img={product.img} discountPct={product.discountPercentage ?? 0} rating={product.rating} stockLabel={getStockBadge(product)} deliveryLabel={getDeliveryBadge(product)} isDark={isDark} onSelect={() => handleSelectProduct(product)} onAddToCart={(e) => handleAddToCart(e, product)} />)}
          </div>
        )}
      </main>
    </div>
  );
}
