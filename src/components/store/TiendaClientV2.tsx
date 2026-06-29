'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Facebook, Instagram, PackageCheck, Search, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
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

function getStockBadge(product: Product) {
  const stock = Number(product.stock ?? NaN);
  if (!Number.isFinite(stock)) return 'Stock por confirmar';
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

function MiniProduct({ product, onClick }: { product: Product; onClick: () => void }) {
  return <button onClick={onClick} className="group flex gap-3 rounded-[1.35rem] border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-yellow-300/30 hover:bg-yellow-300/[0.07]">
    <img src={getImage(product)} alt={product.name} className="h-20 w-20 shrink-0 rounded-[1rem] object-cover" loading="lazy" />
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300/80">{getCategory(product)}</p>
      <h3 className="mt-1 line-clamp-2 text-sm font-black text-white">{product.name}</h3>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-black text-yellow-200">${getFinalPrice(product).toLocaleString('es-CL')}</span>
        <span className="text-[10px] text-zinc-500">Ver</span>
      </div>
    </div>
  </button>;
}

export default function TiendaClientV2() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || theme === 'gold';
  const { products: catalogProducts, connected, fetchComplete } = useCatalogProducts();
  const { addToCart, openCart } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const brandName = branding.name || 'Soluciones Fabrick';
  const supportLink = branding.whatsappUrl || '/contacto';

  const liveProducts = useMemo<Product[]>(() => {
    if (catalogProducts.length) return catalogProducts as Product[];
    return FALLBACK_PRODUCTS;
  }, [catalogProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return liveProducts;
    return liveProducts.filter((product) => product.name.toLowerCase().includes(q) || getCategory(product).toLowerCase().includes(q) || (product.tagline || '').toLowerCase().includes(q));
  }, [liveProducts, searchQuery]);

  const categories = useMemo(() => Array.from(new Set(liveProducts.map(getCategory))).slice(0, 6), [liveProducts]);
  const featured = filteredProducts.slice(0, 8);
  const heroSecondary = liveProducts.slice(1, 4);

  function selectProduct(product: Product) {
    navigateWithTransition(`/tienda/${product.id}`, router);
  }

  function addProduct(e: MouseEvent, product: Product) {
    e.stopPropagation();
    addToCart(asCartProduct(product) as Parameters<typeof addToCart>[0]);
  }

  function buyNow(e: MouseEvent, product: Product) {
    e.stopPropagation();
    addProduct(e, product);
    navigateWithTransition(`/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${getFinalPrice(product)}&img=${encodeURIComponent(getImage(product))}&category=${encodeURIComponent(getCategory(product))}`, router);
  }

  function goSupport() {
    if (supportLink.startsWith('http')) window.open(supportLink, '_blank', 'noopener,noreferrer');
    else router.push(supportLink);
  }

  return <div className={`min-h-screen overflow-x-hidden ${isDark ? 'bg-[#060606] text-white' : 'bg-neutral-50 text-neutral-950'}`}>
    <style>{`.store-scroll::-webkit-scrollbar{display:none}.store-scroll{scrollbar-width:none}`}</style>
    <StorefrontHeader onSearch={() => setSearchOpen(true)} />

    <header className="relative mx-auto max-w-[1320px] overflow-hidden px-4 py-5 md:px-8 lg:py-8">
      <section className="relative min-h-[590px] overflow-hidden rounded-[2rem] bg-zinc-950 md:min-h-[680px] md:rounded-[3rem]">
        <img src={HERO_IMAGE} alt="Casa moderna Soluciones Fabrick" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.92),rgba(0,0,0,.62),rgba(0,0,0,.2)),linear-gradient(0deg,rgba(0,0,0,.82),transparent_55%)]" />
        <div className="relative z-10 flex min-h-[590px] flex-col justify-end p-7 md:min-h-[680px] md:p-12 lg:max-w-3xl">
          <p className="mb-5 inline-flex w-fit rounded-full bg-yellow-300 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-black">Tienda verificada Fabrick</p>
          <h1 className="max-w-4xl text-[clamp(46px,7vw,96px)] font-black leading-[.88] tracking-[-.08em] text-white">Soluciones para construir, remodelar y comprar mejor.</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-200 md:text-lg">Explora productos reales, revisa stock, agrega al bolso y coordina compra o instalación desde una tienda rápida y clara.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="inline-flex min-h-[56px] items-center gap-2 rounded-full bg-yellow-300 px-7 text-sm font-black text-black transition hover:bg-yellow-200">Explorar catálogo <ArrowRight size={16} /></button>
            <button onClick={() => setSearchOpen(true)} className="inline-flex min-h-[56px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.12] px-7 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white hover:text-black"><Search size={16} /> Buscar</button>
            <button onClick={openCart} className="inline-flex min-h-[56px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.12] px-7 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white hover:text-black"><ShoppingBag size={16} /> Bolso</button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-white/70">
            <span className="rounded-full border border-white/15 bg-black/35 px-3 py-2 backdrop-blur-xl">{fetchComplete ? 'Base sincronizada' : 'Sincronizando productos'}</span>
            <span className="rounded-full border border-white/15 bg-black/35 px-3 py-2 backdrop-blur-xl">{connected ? 'Conectado' : 'Modo respaldo'}</span>
            <span className="rounded-full border border-white/15 bg-black/35 px-3 py-2 backdrop-blur-xl">GPS en checkout</span>
          </div>
        </div>
      </section>

      {heroSecondary.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-3">{heroSecondary.map((product) => <MiniProduct key={product.id} product={product} onClick={() => selectProduct(product)} />)}</div>}
    </header>

    <main className="mx-auto max-w-[1320px] px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Productos destacados</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.05em] md:text-5xl">Compra sin fricción.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Cards con categoría, precio, barra de stock y botones directos.</p>
        </div>
        <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="w-fit rounded-full border border-white/10 bg-white/[0.045] px-5 py-3 text-sm font-black text-white">Ver todos <ArrowRight className="ml-1 inline h-4 w-4" /></button>
      </div>

      {categories.length > 0 && <div className="store-scroll mb-8 flex gap-2 overflow-x-auto pb-1">{categories.map((cat) => <button key={cat} onClick={() => { setSearchQuery(cat); setSearchOpen(true); }} className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black text-white/75 hover:bg-yellow-300 hover:text-black">{cat}</button>)}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {featured.map((product) => <UiverseProductCard key={product.id} name={product.name} price={product.price} category={getCategory(product)} img={getImage(product)} description={product.description || product.tagline} features={product.features || [product.dimensions || '', getDelivery(product)].filter(Boolean)} discountPct={getDiscount(product)} rating={product.rating} stock={product.stock} stockLabel={getStockBadge(product)} deliveryLabel={getDelivery(product)} isDark={isDark} onSelect={() => selectProduct(product)} onAddToCart={(e) => addProduct(e, product)} onBuyNow={(e) => buyNow(e, product)} />)}
      </div>
    </main>

    <section className="mx-auto grid max-w-[1320px] gap-4 px-4 pb-14 md:grid-cols-3 md:px-8">
      {[[ShieldCheck, 'Compra segura', 'Pago validado y seguimiento.'], [Truck, 'GPS en checkout', 'Ayuda a completar la ubicación.'], [PackageCheck, 'Soporte humano', 'Consulta instalación o despacho.']].map(([Icon, title, text]) => {
        const IconComponent = Icon as typeof ShieldCheck;
        return <article key={String(title)} className="rounded-[1.8rem] border border-white/10 bg-white/[0.035] p-6"><IconComponent className="mb-4 h-7 w-7 text-yellow-300" /><h3 className="text-xl font-black">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{String(text)}</p></article>;
      })}
    </section>

    <footer className="border-t border-white/10 bg-black px-4 py-10 text-white md:px-8">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div><StoreFabrickLogo tone="dark" branding={branding} /><p className="mt-3 max-w-md text-sm text-zinc-500">Tienda operada por {brandName}. Compra, cotiza y coordina instalación con respaldo comercial.</p></div>
        <div className="flex gap-2"><button className="rounded-full border border-white/10 p-3 text-white/70 hover:text-white"><Facebook size={18} /></button><button className="rounded-full border border-white/10 p-3 text-white/70 hover:text-white"><Instagram size={18} /></button><button onClick={goSupport} className="rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black">Contactar</button></div>
      </div>
    </footer>

    <StoreFloatingAgent />
    <UiverseSearchModal open={searchOpen} value={searchQuery} onChange={setSearchQuery} onClose={() => setSearchOpen(false)} onFilterClick={() => { setSearchOpen(false); navigateWithTransition('/tienda/catalogo', router); }} resultCount={searchQuery.trim() ? filteredProducts.length : undefined} />
  </div>;
}
