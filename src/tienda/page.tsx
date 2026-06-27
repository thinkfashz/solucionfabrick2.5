'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, CheckCircle2, Facebook, Instagram, Menu, Moon, PackageCheck, Search, ShieldCheck, ShoppingBag, Sparkles, Sun, Truck, User, X, Zap } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, FALLBACK_CATALOG_PRODUCTS } from '@/hooks/useCatalogProducts';
import { useTenantBranding, tenantInitials, type TenantBranding } from '@/hooks/useTenantBranding';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/initials';
import { useTheme } from '@/context/ThemeContext';
import { useCartContext } from '@/context/CartContext';
import UiverseProductCard from '@/components/store/UiverseProductCard';
import UiverseSearchModal from '@/components/UiverseSearchModal';
import FabrickLogo3DLazy from '@/components/FabrickLogo3DLazy';

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

const PRODUCTS = FALLBACK_CATALOG_PRODUCTS as Product[];

function StoreFabrickLogo({ tone = 'dark', branding }: { tone?: 'light' | 'dark'; branding: TenantBranding }) {
  const textColor = tone === 'dark' ? 'text-white' : 'text-neutral-900';
  const brandName = branding.name || 'Soluciones Fabrick';
  return <div className="flex items-center gap-2">
    <div className="relative grid h-9 w-[46px] place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/25">
      {branding.logoUrl
        ? <img src={branding.logoUrl} alt={brandName} className="h-full w-full object-cover" />
        : <FabrickLogo3DLazy height="100%" interactive={false} showHint={false} showText={false} cameraZ={14} />}
    </div>
    <span className={`max-w-[170px] truncate font-black uppercase leading-none tracking-[0.12em] ${textColor} text-[10px]`}>
      {brandName.split(' ').slice(0, -1).join(' ') || brandName}{' '}
      <span className="tenant-gradient-text">{brandName.split(' ').slice(-1)[0] || 'Fabrick'}</span>
    </span>
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
  if (stock <= 3) return `Crítico: ${stock}`;
  if (stock <= 10) return `Bajo: ${stock}`;
  return `Disponible: ${stock}`;
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
    if (fetchComplete) return catalogProducts as Product[];
    return catalogProducts.length ? catalogProducts as Product[] : PRODUCTS;
  }, [catalogProducts, fetchComplete]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return liveProducts;
    return liveProducts.filter((p) => p.name.toLowerCase().includes(q) || getCategory(p).toLowerCase().includes(q) || (p.tagline || '').toLowerCase().includes(q));
  }, [liveProducts, searchQuery]);

  const categories = useMemo(() => Array.from(new Set(liveProducts.map(getCategory))).slice(0, 6), [liveProducts]);
  const featured = filteredProducts.slice(0, 8);
  const heroProduct = liveProducts[0];
  const secondProduct = liveProducts[1] || heroProduct;

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

  return <div className={`tenant-surface min-h-screen overflow-x-hidden ${isDark ? 'text-white' : 'text-black'}`}>
    <style>{` .store-scroll::-webkit-scrollbar{display:none}.store-scroll{scrollbar-width:none}.hero-noise{background-image:radial-gradient(circle at 20% 0%,color-mix(in srgb,var(--tenant-primary) 24%,transparent),transparent 28rem),radial-gradient(circle at 100% 35%,rgba(255,255,255,.1),transparent 24rem)} `}</style>

    <nav className={`fixed left-0 top-0 z-[100] w-full border-b backdrop-blur-xl ${isDark ? 'tenant-border bg-black/82' : 'border-neutral-200 bg-white/92'}`}>
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
        <button onClick={() => router.push('/')} className={`rounded-full border px-3 py-2 ${isDark ? 'tenant-border bg-white/[0.04]' : 'border-neutral-200 bg-white shadow-sm'}`}><StoreFabrickLogo tone={isDark ? 'dark' : 'light'} branding={branding} /></button>
        <div className="hidden items-center gap-7 md:flex"><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="text-sm font-bold opacity-70 hover:opacity-100">Catálogo</button><button onClick={goSupport} className="text-sm font-bold opacity-70 hover:opacity-100">Instalación</button><button onClick={() => router.push('/garantias')} className="text-sm font-bold opacity-70 hover:opacity-100">Garantías</button></div>
        <div className="flex items-center gap-1"><span className={`mr-2 hidden h-1.5 w-1.5 rounded-full sm:block ${connected ? 'bg-emerald-500' : 'bg-zinc-500'}`} /><button onClick={() => setSearchOpen(true)} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Buscar"><Search size={20}/></button><button onClick={toggleTheme} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Tema">{isDark ? <Sun size={18}/> : <Moon size={18}/>}</button>{user ? <button onClick={() => router.push('/mi-cuenta')} className="tenant-primary-bg grid h-9 w-9 place-items-center rounded-full text-xs font-black text-black">{getInitials(user.name || user.email)}</button> : <button onClick={() => router.push('/auth')} className="hidden rounded-full p-2 opacity-70 hover:bg-white/10 sm:block"><User size={20}/></button>}<button onClick={openCart} className="relative rounded-full p-2 opacity-90 hover:bg-white/10" aria-label="Abrir carrito"><ShoppingBag size={20}/>{totalItems > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-yellow-300 px-1 text-[10px] font-black text-black">{totalItems}</span>}</button><button onClick={() => setMenuOpen(true)} className="rounded-full p-2 md:hidden"><Menu size={20}/></button></div>
      </div>
    </nav>
    <div className="h-[68px]" />

    <header className="relative overflow-hidden">
      <div className="hero-noise absolute inset-0" />
      <section className="mx-auto grid max-w-[1440px] gap-5 px-4 py-7 md:px-8 lg:grid-cols-[1.14fr_.86fr] lg:py-12">
        <article className="tenant-card relative min-h-[640px] overflow-hidden rounded-[2.8rem] border shadow-[0_35px_100px_rgba(0,0,0,.55)]">
          <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1700&q=82" alt={`Tienda ${brandName}`} className="absolute inset-0 h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,.94),rgba(0,0,0,.68)_45%,rgba(0,0,0,.18))]" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />
          <div className="relative z-10 flex h-full min-h-[640px] flex-col justify-between p-6 md:p-11">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] tenant-border" style={{ background: 'color-mix(in srgb, var(--tenant-primary) 14%, transparent)', color: 'var(--tenant-accent)' }}><Sparkles size={14}/> Tienda premium + despacho + instalación</span>
              <h1 className="mt-6 max-w-4xl text-[clamp(42px,7.5vw,96px)] font-black leading-[0.88] tracking-[-0.06em] text-white">Compra productos con ficha clara, stock visible y soporte real.</h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-200 md:text-lg">Elige productos para obra, hogar o negocio. Mira stock, precio, detalles, categoría y compra directo o coordina instalación con {brandName}.</p>
              <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="tenant-primary-bg inline-flex min-h-[56px] items-center gap-2 rounded-full px-7 text-sm font-black text-black shadow-lg transition hover:-translate-y-0.5">Explorar catálogo <ArrowRight size={16}/></button><button onClick={() => setSearchOpen(true)} className="inline-flex min-h-[56px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-black"><Search size={16}/> Buscar producto</button><button onClick={openCart} className="inline-flex min-h-[56px] items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-7 text-sm font-black text-yellow-100 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-yellow-300 hover:text-black"><ShoppingBag size={16}/> Ver carrito</button></div>
            </div>
            <div className="grid max-w-3xl grid-cols-3 gap-3">{[['Stock','Barra visible'],['Compra','Checkout guiado'],['Soporte','Humano + GPS']].map(([n,l])=><div key={l} className="rounded-[1.3rem] border border-white/10 bg-black/45 p-4 backdrop-blur-xl"><b className="block text-xl font-black text-white md:text-2xl">{n}</b><span className="text-xs text-zinc-400">{l}</span></div>)}</div>
          </div>
        </article>

        <aside className="grid gap-5">
          {heroProduct && <article className={`tenant-card rounded-[2.2rem] border p-5 ${!isDark ? 'bg-neutral-50 text-black' : ''}`}>
            <div className="flex items-center justify-between"><p className="tenant-text text-[10px] font-black uppercase tracking-[0.3em]">Producto destacado</p><BadgeCheck className="h-5 w-5 tenant-icon" /></div>
            <button onClick={() => selectProduct(heroProduct)} className="mt-4 grid w-full gap-4 text-left sm:grid-cols-[150px_1fr] lg:grid-cols-1"><div className="aspect-square overflow-hidden rounded-[1.5rem] bg-zinc-900"><img src={getImage(heroProduct)} alt={heroProduct.name} className="h-full w-full object-cover transition duration-700 hover:scale-105"/></div><div><p className="text-[10px] font-black uppercase tracking-[.2em] tenant-text">{getCategory(heroProduct)}</p><h2 className="mt-2 text-3xl font-black tracking-tight">{heroProduct.name}</h2><p className="mt-2 text-sm leading-6 opacity-65 line-clamp-3">{heroProduct.description || heroProduct.tagline || 'Producto recomendado para compra rápida y asesoría técnica.'}</p><div className="mt-4 flex items-end justify-between gap-3"><b className="tenant-text block text-2xl">${getFinalPrice(heroProduct).toLocaleString('es-CL')}</b><span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black">{getStockBadge(heroProduct)}</span></div></div></button>
          </article>}
          {secondProduct && <article className="tenant-card rounded-[2.2rem] border p-5"><Zap className="tenant-icon mb-4 h-8 w-8"/><h3 className="text-3xl font-black tracking-tight text-white">Compra ahora o cotiza instalación.</h3><p className="mt-3 text-sm leading-7 text-zinc-300">Agrega productos al carrito, coordina despacho y usa GPS en checkout para acelerar la dirección.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={goSupport} className="tenant-primary-bg rounded-2xl px-4 py-3 text-sm font-black text-black">Asesoría</button><button onClick={openCart} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Carrito</button></div></article>}
        </aside>
      </section>
    </header>

    <section className={`overflow-hidden border-y ${isDark ? 'tenant-border bg-black/35' : 'border-neutral-200 bg-neutral-50'}`}><div className="store-scroll flex gap-10 overflow-x-auto px-4 py-4 text-xs font-black uppercase tracking-[0.26em] opacity-70">{['Stock en vivo','GPS en checkout','Carrito mejorado','Compra segura','Despacho coordinado','Instalación opcional'].map((t)=><span key={t} className="shrink-0">★ {t}</span>)}</div></section>

    <main className="mx-auto max-w-[1440px] px-4 py-12 md:px-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="tenant-text text-[10px] font-black uppercase tracking-[0.3em]">Productos destacados</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Cards con precio, categoría, detalles y stock.</h2><p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">Cada producto muestra información rápida para decidir sin entrar obligatoriamente a la ficha.</p></div><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="tenant-border tenant-text w-fit rounded-full border px-5 py-3 text-sm font-black">Ver todos <ArrowRight className="ml-1 inline h-4 w-4"/></button></div>

      {categories.length > 0 && <div className="store-scroll mb-8 flex gap-2 overflow-x-auto pb-1">{categories.map((cat) => <button key={cat} onClick={() => { setSearchQuery(cat); setSearchOpen(true); }} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${isDark ? 'border-white/10 bg-white/[0.05] text-white/75 hover:bg-yellow-300 hover:text-black' : 'border-neutral-200 bg-white text-neutral-700'}`}>{cat}</button>)}</div>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{featured.map((p)=><UiverseProductCard key={p.id} name={p.name} price={p.price} category={getCategory(p)} img={getImage(p)} description={p.description || p.tagline} features={p.features || [p.dimensions || '', getDelivery(p)].filter(Boolean)} discountPct={getDiscount(p)} rating={p.rating} stock={p.stock} stockLabel={getStockBadge(p)} deliveryLabel={getDelivery(p)} isDark={isDark} onSelect={() => selectProduct(p)} onAddToCart={(e) => addProduct(e, p)} onBuyNow={(e) => buyNow(e, p)} />)}</div>
    </main>

    <section className="mx-auto grid max-w-[1440px] gap-4 px-4 pb-16 md:grid-cols-3 md:px-8">{[['Compra segura','Respaldo, garantía y acompañamiento.'],['GPS en checkout','Pide permiso y ayuda a completar ubicación.'],['Instalación opcional','Agenda montaje, visita o puesta en marcha.']].map(([t,d], index)=><article key={t} className={`tenant-card rounded-[1.8rem] border p-6 ${!isDark ? 'bg-neutral-50 text-black' : ''}`}>{index === 0 ? <ShieldCheck className="tenant-icon mb-4 h-7 w-7"/> : index === 1 ? <Truck className="tenant-icon mb-4 h-7 w-7"/> : <PackageCheck className="tenant-icon mb-4 h-7 w-7"/>}<h3 className="text-xl font-black">{t}</h3><p className="mt-2 text-sm leading-6 opacity-65">{d}</p></article>)}</section>

    <footer className="bg-black px-4 py-10 text-white md:px-8"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><StoreFabrickLogo tone="dark" branding={branding}/><p className="mt-3 max-w-md text-sm text-zinc-400">Tienda operada por {brandName}. Compra, cotiza y coordina instalación con respaldo comercial.</p><p className="mt-2 text-xs text-zinc-500">{branding.billingEmail || branding.ownerEmail || 'pagos@solucionesfabrick.cl'} {branding.phone ? `· ${branding.phone}` : ''}</p></div><div className="flex gap-2"><button className="rounded-full border border-white/10 p-3 text-white/70 hover:text-white"><Facebook size={18}/></button><button className="rounded-full border border-white/10 p-3 text-white/70 hover:text-white"><Instagram size={18}/></button><button onClick={goSupport} className="tenant-primary-bg rounded-full px-5 py-3 text-sm font-black text-black">Contactar</button></div></div></footer>

    {menuOpen && <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-md md:hidden"><div className="ml-auto flex h-full w-[86vw] max-w-sm flex-col rounded-l-[2rem] border-l border-white/10 bg-zinc-950 p-5 text-white"><div className="flex items-center justify-between"><StoreFabrickLogo tone="dark" branding={branding}/><button onClick={() => setMenuOpen(false)}><X/></button></div><div className="mt-8 grid gap-2"><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="rounded-2xl bg-white/10 p-4 text-left font-black">Catálogo</button><button onClick={goSupport} className="rounded-2xl bg-white/10 p-4 text-left font-black">Instalación</button><button onClick={openCart} className="rounded-2xl bg-white/10 p-4 text-left font-black">Carrito ({totalItems})</button><button onClick={() => router.push('/garantias')} className="rounded-2xl bg-white/10 p-4 text-left font-black">Garantías</button></div><div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl tenant-primary-bg text-sm font-black text-black">{tenantInitials(brandName)}</div><p className="font-black">{brandName}</p><p className="mt-1 text-xs text-zinc-400">{branding.billingEmail || branding.ownerEmail || 'Contacto pendiente'}</p></div></div></div>}
    <UiverseSearchModal open={searchOpen} value={searchQuery} onChange={setSearchQuery} onClose={() => setSearchOpen(false)} onFilterClick={() => { setSearchOpen(false); navigateWithTransition('/tienda/catalogo', router); }} resultCount={searchQuery.trim() ? filteredProducts.length : undefined} />
  </div>;
}
