'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Facebook, Instagram, Menu, Moon, PackageCheck, Search, ShieldCheck, ShoppingBag, Sun, Truck, User, X } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts } from '@/hooks/useCatalogProducts';
import { tenantInitials, useTenantBranding, type TenantBranding } from '@/hooks/useTenantBranding';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/initials';
import { useTheme } from '@/context/ThemeContext';
import { useCartContext } from '@/context/CartContext';
import UiverseProductCard from '@/components/store/UiverseProductCard';
import UiverseSearchModal from '@/components/UiverseSearchModal';

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

function StoreFabrickLogo({ tone = 'dark', branding }: { tone?: 'light' | 'dark'; branding: TenantBranding }) {
  const brandName = branding.name || 'Soluciones Fabrick';
  const textColor = tone === 'dark' ? 'text-white' : 'text-neutral-950';
  return <div className="flex items-center gap-3">
    <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-yellow-300 text-sm font-black text-black shadow-[0_8px_30px_rgba(250,204,21,.18)]">
      {branding.logoUrl ? <img src={branding.logoUrl} alt={brandName} className="h-full w-full object-cover" /> : 'F'}
    </div>
    <span className={`max-w-[190px] truncate text-xs font-black uppercase tracking-[.16em] ${textColor}`}>{brandName}</span>
  </div>;
}

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
  return <button onClick={onClick} className="group flex gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-yellow-300/30 hover:bg-yellow-300/[0.07]">
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

export default function TiendaClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { branding } = useTenantBranding();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark' || theme === 'gold';
  const { products: catalogProducts, connected, fetchComplete } = useCatalogProducts();
  const { addToCart, openCart, totalItems } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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
  const heroProduct = liveProducts[0] || FALLBACK_PRODUCTS[0];
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

    <nav className={`fixed left-0 top-0 z-[100] w-full border-b backdrop-blur-xl ${isDark ? 'border-white/10 bg-black/84' : 'border-neutral-200 bg-white/92'}`}>
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-4 px-4 md:px-8">
        <button onClick={() => router.push('/')} className="rounded-full"><StoreFabrickLogo tone={isDark ? 'dark' : 'light'} branding={branding} /></button>
        <div className="hidden items-center gap-7 md:flex">
          <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="text-sm font-bold opacity-70 hover:opacity-100">Catálogo</button>
          <button onClick={goSupport} className="text-sm font-bold opacity-70 hover:opacity-100">Instalación</button>
          <button onClick={() => router.push('/garantias')} className="text-sm font-bold opacity-70 hover:opacity-100">Garantías</button>
        </div>
        <div className="flex items-center gap-1">
          <span className={`mr-2 hidden h-1.5 w-1.5 rounded-full sm:block ${connected ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
          <button onClick={() => setSearchOpen(true)} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Buscar"><Search size={20} /></button>
          <button onClick={toggleTheme} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Tema">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          {user ? <button onClick={() => router.push('/mi-cuenta')} className="grid h-9 w-9 place-items-center rounded-full bg-yellow-300 text-xs font-black text-black">{getInitials(user.name || user.email)}</button> : <button onClick={() => router.push('/auth')} className="hidden rounded-full p-2 opacity-70 hover:bg-white/10 sm:block"><User size={20} /></button>}
          <button onClick={openCart} className="relative rounded-full p-2 opacity-90 hover:bg-white/10" aria-label="Abrir carrito"><ShoppingBag size={20} />{totalItems > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-yellow-300 px-1 text-[10px] font-black text-black">{totalItems}</span>}</button>
          <button onClick={() => setMenuOpen(true)} className="rounded-full p-2 md:hidden"><Menu size={20} /></button>
        </div>
      </div>
    </nav>
    <div className="h-[68px]" />

    <header className="mx-auto grid max-w-[1320px] gap-5 px-4 py-6 md:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-10">
      <section className="rounded-[2.4rem] border border-white/10 bg-white/[0.035] p-5 md:p-8">
        <p className="inline-flex rounded-full border border-yellow-300/20 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-yellow-200">Catálogo real · compra simple</p>
        <h1 className="mt-6 max-w-4xl text-[clamp(42px,7vw,88px)] font-black leading-[.88] tracking-[-.075em]">Productos claros, stock visible y checkout rápido.</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400">Una tienda más liviana: productos desde base de datos, tarjetas limpias, carrito directo y dirección con GPS opcional en checkout.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="inline-flex min-h-[54px] items-center gap-2 rounded-full bg-yellow-300 px-7 text-sm font-black text-black transition hover:bg-yellow-200">Explorar catálogo <ArrowRight size={16} /></button>
          <button onClick={() => setSearchOpen(true)} className="inline-flex min-h-[54px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-7 text-sm font-black text-white transition hover:bg-white hover:text-black"><Search size={16} /> Buscar</button>
          <button onClick={openCart} className="inline-flex min-h-[54px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-7 text-sm font-black text-white transition hover:bg-white hover:text-black"><ShoppingBag size={16} /> Carrito</button>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[[fetchComplete ? 'Sincronizado' : 'Cargando', 'Base de datos'], ['Stock', 'Visible en cards'], ['GPS', 'En checkout']].map(([title, label]) => <div key={label} className="rounded-[1.2rem] border border-white/10 bg-black/25 p-4"><b className="block text-xl font-black">{title}</b><span className="text-xs text-zinc-500">{label}</span></div>)}
        </div>
      </section>

      <section className="grid gap-4">
        {heroProduct && <button onClick={() => selectProduct(heroProduct)} className="group relative min-h-[430px] overflow-hidden rounded-[2.4rem] border border-white/10 bg-zinc-950 text-left shadow-[0_28px_90px_rgba(0,0,0,.42)]">
          <img src={getImage(heroProduct)} alt={heroProduct.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="eager" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <span className="rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-yellow-200 backdrop-blur-xl">Producto destacado</span>
            <h2 className="mt-4 line-clamp-2 text-4xl font-black leading-none tracking-[-.05em] text-white">{heroProduct.name}</h2>
            <div className="mt-4 flex items-end justify-between gap-3">
              <b className="text-3xl font-black text-yellow-300">${getFinalPrice(heroProduct).toLocaleString('es-CL')}</b>
              <span className="rounded-full bg-white/10 px-3 py-2 text-[11px] font-black text-white/80">{getStockBadge(heroProduct)}</span>
            </div>
          </div>
        </button>}
        {heroSecondary.length > 0 && <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">{heroSecondary.map((product) => <MiniProduct key={product.id} product={product} onClick={() => selectProduct(product)} />)}</div>}
      </section>
    </header>

    <main className="mx-auto max-w-[1320px] px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Productos destacados</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-.05em] md:text-5xl">Compra sin fricción.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Cards con categoría, detalle, precio, stock y carrito directo.</p>
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

    {menuOpen && <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-md md:hidden"><div className="ml-auto flex h-full w-[86vw] max-w-sm flex-col rounded-l-[2rem] border-l border-white/10 bg-zinc-950 p-5 text-white"><div className="flex items-center justify-between"><StoreFabrickLogo tone="dark" branding={branding} /><button onClick={() => setMenuOpen(false)}><X /></button></div><div className="mt-8 grid gap-2"><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="rounded-2xl bg-white/10 p-4 text-left font-black">Catálogo</button><button onClick={goSupport} className="rounded-2xl bg-white/10 p-4 text-left font-black">Instalación</button><button onClick={openCart} className="rounded-2xl bg-white/10 p-4 text-left font-black">Carrito ({totalItems})</button></div><div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-sm font-black text-black">{tenantInitials(brandName)}</div><p className="font-black">{brandName}</p></div></div></div>}
    <UiverseSearchModal open={searchOpen} value={searchQuery} onChange={setSearchQuery} onClose={() => setSearchOpen(false)} onFilterClick={() => { setSearchOpen(false); navigateWithTransition('/tienda/catalogo', router); }} resultCount={searchQuery.trim() ? filteredProducts.length : undefined} />
  </div>;
}
