'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Facebook, Instagram, PackageCheck, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Truck, Wrench } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts } from '@/hooks/useCatalogProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useTheme } from '@/context/ThemeContext';
import { useCartContext } from '@/context/CartContext';
import UiverseProductCard from '@/components/store/UiverseProductCard';
import UiverseSearchModal from '@/components/UiverseSearchModal';
import { StoreFabrickLogo, StoreFloatingAgent, StorefrontHeader } from '@/components/store/StorefrontChrome';

type Product = {
  id: string;
  name: string;
  price: number;
  category?: string;
  category_id?: string;
  tagline?: string;
  description?: string;
  features?: string[];
  dimensions?: string;
  delivery?: string;
  delivery_days?: string;
  img?: string;
  image_url?: string;
  discountPercentage?: number;
  discount_percentage?: number;
  rating?: number;
  stock?: number | string;
};

const FALLBACK_PRODUCTS = FALLBACK_CATALOG_PRODUCTS as Product[];
const HERO_IMAGE = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1600&auto=format&fit=crop';

function getCategory(product: Product) {
  return product.category || product.category_id || 'Producto';
}

function getImage(product: Product) {
  return product.img || product.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop';
}

function getDiscount(product: Product) {
  return product.discountPercentage ?? product.discount_percentage ?? 0;
}

function getFinalPrice(product: Product) {
  const pct = getDiscount(product);
  return pct > 0 ? Math.round(product.price * (1 - pct / 100)) : product.price;
}

function getStockNumber(product: Product) {
  if (typeof product.stock === 'number') return product.stock;
  const match = String(product.stock || '').match(/[0-9]+/);
  return match ? Number(match[0]) : null;
}

function getStockBadge(product: Product) {
  const stock = getStockNumber(product);
  if (stock === null) return 'Stock por confirmar';
  if (stock <= 0) return 'Sin stock';
  if (stock <= 3) return `Crítico · ${stock}`;
  if (stock <= 10) return `Bajo · ${stock}`;
  return `Disponible · ${stock}`;
}

function getDelivery(product: Product) {
  return product.delivery || product.delivery_days || 'Entrega coordinada';
}

function asCartProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: getImage(product),
    category_id: getCategory(product),
    discount_percentage: getDiscount(product),
    stock: typeof product.stock === 'number' ? product.stock : undefined,
    description: product.description,
    tagline: product.tagline,
  };
}

function SmallProduct({ product, onOpen }: { product: Product; onOpen: () => void }) {
  return <button onClick={onOpen} className="group min-w-[220px] rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-2 text-left transition hover:-translate-y-0.5">
    <div className="relative overflow-hidden rounded-[1.15rem] bg-[#f3efe6]">
      <img src={getImage(product)} alt={product.name} className="h-28 w-full object-cover transition duration-500 group-hover:scale-[1.04]" loading="lazy" />
      {getDiscount(product) > 0 && <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">-{getDiscount(product)}%</span>}
    </div>
    <div className="px-2 pb-2 pt-3">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300/80">{getCategory(product)}</p>
      <h3 className="mt-1 line-clamp-2 text-sm font-black text-white">{product.name}</h3>
      <div className="mt-2 flex items-center justify-between gap-2"><span className="font-black text-yellow-300">${getFinalPrice(product).toLocaleString('es-CL')}</span><span className="rounded-full bg-yellow-300 px-2.5 py-1 text-[10px] font-black text-black">Ficha</span></div>
    </div>
  </button>;
}

export default function TiendaClientV2() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'gold';
  const { products: catalogProducts, connected, fetchComplete } = useCatalogProducts();
  const { addToCart, openCart, totalItems } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);

  const brandName = branding.name || 'Soluciones Fabrick';
  const supportLink = branding.whatsappUrl || '/contacto';
  const liveProducts = useMemo<Product[]>(() => (catalogProducts.length ? catalogProducts as Product[] : FALLBACK_PRODUCTS), [catalogProducts]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(liveProducts.map(getCategory))).filter(Boolean).slice(0, 8)], [liveProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return liveProducts.filter((product) => {
      const category = getCategory(product);
      const stock = getStockNumber(product);
      const haystack = `${product.name} ${category} ${product.tagline || ''} ${product.description || ''}`.toLowerCase();
      if (activeCategory !== 'Todos' && category !== activeCategory) return false;
      if (onlyDeals && getDiscount(product) <= 0) return false;
      if (onlyInStock && stock !== null && stock <= 0) return false;
      return !q || haystack.includes(q);
    });
  }, [activeCategory, liveProducts, onlyDeals, onlyInStock, searchQuery]);

  const heroProduct = filteredProducts[0] || liveProducts[0];
  const featured = filteredProducts.slice(0, 12);
  const quickProducts = (liveProducts.filter((product) => getDiscount(product) > 0).length ? liveProducts.filter((product) => getDiscount(product) > 0) : liveProducts).slice(0, 6);
  const stats = useMemo(() => ({
    total: liveProducts.length,
    deals: liveProducts.filter((product) => getDiscount(product) > 0).length,
    available: liveProducts.filter((product) => {
      const stock = getStockNumber(product);
      return stock === null || stock > 0;
    }).length,
  }), [liveProducts]);

  function selectProduct(product: Product) { navigateWithTransition(`/tienda/${product.id}`, router); }
  function addProduct(e: MouseEvent, product: Product) { e.stopPropagation(); addToCart(asCartProduct(product) as Parameters<typeof addToCart>[0]); }
  function buyNow(e: MouseEvent, product: Product) {
    e.stopPropagation();
    navigateWithTransition(`/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${getFinalPrice(product)}&img=${encodeURIComponent(getImage(product))}&category=${encodeURIComponent(getCategory(product))}`, router);
  }
  function goSupport() { if (supportLink.startsWith('http')) window.open(supportLink, '_blank', 'noopener,noreferrer'); else router.push(supportLink); }
  function clearFilters() { setSearchQuery(''); setActiveCategory('Todos'); setOnlyDeals(false); setOnlyInStock(false); }
  function scrollToFilters() { document.getElementById('storeFilters')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  return <div className={`min-h-screen overflow-x-hidden ${isDark ? 'bg-[#070706] text-white' : 'bg-[#f5f2ea] text-neutral-950'}`}>
    <style>{`.store-scroll::-webkit-scrollbar{display:none}.store-scroll{scrollbar-width:none}@media(max-width:767px){.sf-store-footer{padding-bottom:calc(8rem + env(safe-area-inset-bottom))!important}}`}</style>
    <StorefrontHeader onSearch={() => setSearchOpen(true)} />

    <header className="mx-auto max-w-[1320px] px-4 pb-6 pt-4 md:px-8 md:pb-10">
      <section className="relative overflow-hidden rounded-[2.1rem] border border-yellow-300/10 bg-[#0a0a08] p-5 text-white shadow-[0_26px_90px_rgba(0,0,0,.28)] md:rounded-[3rem] md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,.16),transparent_24rem)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_.9fr] lg:items-stretch">
          <div className="flex min-h-[470px] flex-col justify-between rounded-[1.6rem] bg-black/35 p-5 md:min-h-[560px] md:rounded-[2.2rem] md:p-8">
            <div>
              <StoreFabrickLogo tone="dark" branding={branding} />
              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-yellow-100"><BadgeCheck className="h-3.5 w-3.5" /> Tienda rápida verificada</div>
              <h1 className="mt-5 max-w-3xl text-[clamp(40px,11vw,86px)] font-black leading-[.9] tracking-[-.08em]">Compra materiales y servicios sin perder tiempo.</h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 md:text-base">Catálogo claro, filtros reales, bolso persistente y checkout directo para comprar, cotizar instalación o coordinar despacho.</p>
            </div>
            <div className="mt-7 grid gap-3">
              <label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar aire, muebles, materiales..." className="h-14 w-full rounded-2xl border border-white/10 bg-white px-12 text-sm font-bold text-black outline-none placeholder:text-neutral-400 focus:border-yellow-300 md:h-16" /></label>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black uppercase tracking-[.12em] text-white/70"><span className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3"><b className="block text-lg text-yellow-300">{stats.total}</b> productos</span><span className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3"><b className="block text-lg text-yellow-300">{stats.available}</b> stock</span><span className="rounded-2xl border border-white/10 bg-white/[0.06] px-2 py-3"><b className="block text-lg text-yellow-300">{stats.deals}</b> ofertas</span></div>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="relative min-h-[340px] overflow-hidden rounded-[1.6rem] bg-[#ece7dc] text-neutral-950 md:min-h-[430px] md:rounded-[2.2rem]">
              <img src={heroProduct ? getImage(heroProduct) : HERO_IMAGE} alt={heroProduct?.name || brandName} className="absolute inset-0 h-full w-full object-cover" loading="eager" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.88)_66%,rgba(255,255,255,.96))]" />
              <div className="relative z-10 flex min-h-[340px] flex-col justify-end p-5 md:min-h-[430px] md:p-7">
                <span className="w-fit rounded-full bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-white">Recomendado</span>
                <h2 className="mt-4 max-w-md text-4xl font-black leading-[.95] tracking-[-.07em] md:text-5xl">{heroProduct?.name || 'Soluciones Fabrick'}</h2>
                <p className="mt-3 line-clamp-2 max-w-md text-sm leading-6 text-neutral-600">{heroProduct?.description || heroProduct?.tagline || 'Producto listo para revisar, agregar al bolso y finalizar compra con soporte humano.'}</p>
                {heroProduct && <div className="mt-5 flex flex-wrap items-center gap-3"><strong className="text-3xl font-black tracking-[-.04em]">${getFinalPrice(heroProduct).toLocaleString('es-CL')}</strong><button onClick={(e) => buyNow(e, heroProduct)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-black px-5 text-sm font-black text-white"><ShoppingBag className="h-4 w-4" />Comprar rápido</button><button onClick={() => selectProduct(heroProduct)} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-black/10 bg-white/75 px-5 text-sm font-black text-black backdrop-blur-md">Ver ficha</button></div>}
              </div>
            </article>
            <div className="store-scroll flex gap-3 overflow-x-auto pb-1">{quickProducts.map((product) => <SmallProduct key={product.id} product={product} onOpen={() => selectProduct(product)} />)}</div>
          </div>
        </div>
      </section>
    </header>

    <main className="mx-auto max-w-[1320px] px-4 pb-32 md:px-8 md:pb-16">
      <section id="storeFilters" className={`sticky top-0 z-30 -mx-4 border-y px-4 py-3 backdrop-blur-2xl md:top-[68px] md:mx-0 md:rounded-[1.5rem] md:border ${isDark ? 'border-white/10 bg-[#070706]/88' : 'border-black/5 bg-[#f5f2ea]/88'}`}>
        <div className="store-scroll flex gap-2 overflow-x-auto pb-1">{categories.map((cat) => <button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${activeCategory === cat ? 'bg-yellow-300 text-black' : isDark ? 'border border-white/10 bg-white/[0.055] text-white/70' : 'border border-black/5 bg-white text-neutral-600'}`}>{cat}</button>)}<button onClick={() => setOnlyDeals((value) => !value)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${onlyDeals ? 'bg-red-500 text-white' : isDark ? 'border border-white/10 bg-white/[0.055] text-white/70' : 'border border-black/5 bg-white text-neutral-600'}`}>Ofertas</button><button onClick={() => setOnlyInStock((value) => !value)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${onlyInStock ? 'bg-emerald-300 text-black' : isDark ? 'border border-white/10 bg-white/[0.055] text-white/70' : 'border border-black/5 bg-white text-neutral-600'}`}>Stock listo</button></div>
      </section>

      <div className="mb-6 mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-700 dark:text-yellow-300">Catálogo usable</p><h2 className="mt-2 text-3xl font-black tracking-[-.055em] md:text-5xl">Productos claros, compra rápida.</h2><p className={`mt-2 max-w-2xl text-sm leading-6 ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{filteredProducts.length} resultado(s). Busca, filtra, agrega al bolso y finaliza sin pantallas innecesarias.</p></div><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className={`w-fit rounded-full px-5 py-3 text-sm font-black ${isDark ? 'border border-white/10 bg-white/[0.055] text-white' : 'border border-black/5 bg-white text-black'}`}>Ver catálogo completo <ArrowRight className="ml-1 inline h-4 w-4" /></button></div>
      {featured.length > 0 ? <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{featured.map((product) => <UiverseProductCard key={product.id} name={product.name} price={product.price} category={getCategory(product)} img={getImage(product)} description={product.description || product.tagline} features={product.features || [product.dimensions || '', getDelivery(product)].filter(Boolean)} discountPct={getDiscount(product)} rating={product.rating} stock={product.stock} stockLabel={getStockBadge(product)} deliveryLabel={getDelivery(product)} isDark={isDark} onSelect={() => selectProduct(product)} onAddToCart={(e) => addProduct(e, product)} />)}</div> : <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center"><p className="text-xl font-black">No encontré productos con esos filtros.</p><button onClick={clearFilters} className="mt-5 rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black">Limpiar filtros</button></div>}
    </main>

    <section className="mx-auto grid max-w-[1320px] gap-4 px-4 pb-24 md:grid-cols-3 md:px-8">{[[ShieldCheck, 'Compra protegida', 'Checkout con orden registrada, pago validado y seguimiento.'], [Truck, 'Despacho claro', 'GPS opcional y dirección editable para coordinar entrega.'], [Wrench, 'Instalación opcional', 'Soporte humano si el producto requiere visita o montaje.']].map(([Icon, title, text]) => { const IconComponent = Icon as typeof ShieldCheck; return <article key={String(title)} className={`rounded-[1.8rem] border p-6 ${isDark ? 'border-white/10 bg-white/[0.035]' : 'border-black/5 bg-white shadow-[0_18px_44px_rgba(20,20,20,.06)]'}`}><IconComponent className="mb-4 h-7 w-7 text-yellow-500" /><h3 className="text-xl font-black">{String(title)}</h3><p className={`mt-2 text-sm leading-6 ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{String(text)}</p></article>; })}</section>

    <footer className="sf-store-footer border-t border-black/5 bg-black px-4 py-10 text-white md:px-8"><div className="mx-auto flex max-w-[1320px] flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><StoreFabrickLogo tone="dark" branding={branding} /><p className="mt-3 max-w-md text-sm text-zinc-500">Tienda operada por {brandName}. Compra, cotiza y coordina instalación con respaldo comercial.</p></div><div className="flex flex-wrap gap-2"><button className="rounded-full border border-white/10 p-3 text-white/70 hover:text-white" aria-label="Facebook"><Facebook size={18} /></button><button className="rounded-full border border-white/10 p-3 text-white/70 hover:text-white" aria-label="Instagram"><Instagram size={18} /></button><button onClick={goSupport} className="rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black">Contactar</button></div></div></footer>

    <div className="fixed inset-x-3 bottom-3 z-[185] rounded-[1.4rem] border border-black/10 bg-white/92 p-2 shadow-[0_20px_70px_rgba(0,0,0,.22)] backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-black/88"><div className="grid grid-cols-3 gap-1 text-[10px] font-black"><button onClick={() => setSearchOpen(true)} className="grid min-h-12 place-items-center rounded-2xl text-neutral-700 dark:text-white/75"><Search className="h-5 w-5" />Buscar</button><button onClick={scrollToFilters} className="grid min-h-12 place-items-center rounded-2xl text-neutral-700 dark:text-white/75"><SlidersHorizontal className="h-5 w-5" />Filtros</button><button onClick={openCart} className="relative grid min-h-12 place-items-center rounded-2xl bg-yellow-300 text-black"><ShoppingBag className="h-5 w-5" />Bolso{totalItems > 0 && <span className="absolute right-2 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-300 px-1 text-[10px] text-black">{totalItems}</span>}</button></div></div>

    <StoreFloatingAgent />
    <UiverseSearchModal open={searchOpen} value={searchQuery} onChange={setSearchQuery} onClose={() => setSearchOpen(false)} onFilterClick={() => { setSearchOpen(false); scrollToFilters(); }} resultCount={searchQuery.trim() ? filteredProducts.length : undefined} />
    <div className="hidden text-xs opacity-0">{connected ? 'online' : 'offline'} {fetchComplete ? 'ready' : 'loading'}</div>
  </div>;
}
