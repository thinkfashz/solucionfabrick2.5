'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Facebook, Instagram, Menu, Moon, Search, ShoppingBag, Sparkles, Sun, User, X, Zap } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, FALLBACK_CATALOG_PRODUCTS } from '@/hooks/useCatalogProducts';
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
  category: string;
  tagline: string;
  description: string;
  features: string[];
  dimensions: string;
  delivery: string;
  img: string;
  discountPercentage?: number;
  rating?: number;
  stock?: number | string;
};

const PRODUCTS = FALLBACK_CATALOG_PRODUCTS as Product[];

function StoreFabrickLogo({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  return <div className="flex items-center gap-2"><div className="relative h-9 w-[46px]"><FabrickLogo3DLazy height="100%" interactive={false} showHint={false} showText={false} cameraZ={14} /></div><span className={`font-black uppercase leading-none tracking-[0.12em] ${tone === 'dark' ? 'text-white' : 'text-neutral-900'} text-[10px]`}>Soluciones <span className="tenant-gradient-text">Fabrick</span></span></div>;
}

function getFinalPrice(product: Product) {
  const pct = product.discountPercentage ?? 0;
  return pct > 0 ? Math.round(product.price * (1 - pct / 100)) : product.price;
}

function getStockBadge(product: Product) {
  const stock = Number(product.stock ?? NaN);
  if (!Number.isFinite(stock)) return 'Stock por confirmar';
  if (stock <= 3) return `Stock crítico: ${stock}`;
  if (stock <= 10) return `Stock bajo: ${stock}`;
  return `Stock: ${stock}`;
}

export default function TiendaClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark' || theme === 'gold';
  const { products: catalogProducts, connected, fetchComplete } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const liveProducts = useMemo<Product[]>(() => {
    if (fetchComplete) return catalogProducts as Product[];
    return catalogProducts.length ? catalogProducts as Product[] : PRODUCTS;
  }, [catalogProducts, fetchComplete]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return liveProducts;
    return liveProducts.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q));
  }, [liveProducts, searchQuery]);

  function selectProduct(product: Product) {
    navigateWithTransition(`/tienda/${product.id}`, router);
  }

  function addProduct(e: MouseEvent, product: Product) {
    e.stopPropagation();
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.img } as Parameters<typeof addToCart>[0]);
  }

  function buyNow(e: MouseEvent, product: Product) {
    e.stopPropagation();
    addProduct(e, product);
    navigateWithTransition(`/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${getFinalPrice(product)}`, router);
  }

  const featured = filteredProducts.slice(0, 8);
  const heroProduct = liveProducts[0];

  return (
    <div className={`tenant-surface min-h-screen overflow-x-hidden ${isDark ? 'text-white' : 'text-black'}`}>
      <style>{` .store-scroll::-webkit-scrollbar{display:none}.store-scroll{scrollbar-width:none}.hero-noise{background-image:radial-gradient(circle at 20% 0%,color-mix(in srgb,var(--tenant-primary) 28%,transparent),transparent 24rem),radial-gradient(circle at 100% 40%,rgba(255,255,255,.1),transparent 24rem)} `}</style>
      <nav className={`fixed left-0 top-0 z-[100] w-full border-b backdrop-blur-xl ${isDark ? 'tenant-border bg-black/80' : 'border-neutral-200 bg-white/92'}`}>
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
          <button onClick={() => router.push('/')} className={`rounded-full border px-3 py-2 ${isDark ? 'tenant-border bg-white/[0.04]' : 'border-neutral-200 bg-white shadow-sm'}`}><StoreFabrickLogo tone={isDark ? 'dark' : 'light'} /></button>
          <div className="hidden items-center gap-7 md:flex"><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="text-sm font-bold opacity-70 hover:opacity-100">Catálogo</button><button onClick={() => router.push('/contacto')} className="text-sm font-bold opacity-70 hover:opacity-100">Instalación</button><button onClick={() => router.push('/garantias')} className="text-sm font-bold opacity-70 hover:opacity-100">Garantías</button></div>
          <div className="flex items-center gap-1"><span className={`mr-2 hidden h-1.5 w-1.5 rounded-full sm:block ${connected ? 'bg-emerald-500' : 'bg-zinc-500'}`} /><button onClick={() => setSearchOpen(true)} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Buscar"><Search size={20}/></button><button onClick={toggleTheme} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Tema">{isDark ? <Sun size={18}/> : <Moon size={18}/>}</button>{user ? <button onClick={() => router.push('/mi-cuenta')} className="tenant-primary-bg grid h-9 w-9 place-items-center rounded-full text-xs font-black text-black">{getInitials(user.name || user.email)}</button> : <button onClick={() => router.push('/auth')} className="hidden rounded-full p-2 opacity-70 hover:bg-white/10 sm:block"><User size={20}/></button>}<button onClick={() => navigateWithTransition('/checkout', router)} className="rounded-full p-2 opacity-80 hover:bg-white/10"><ShoppingBag size={20}/></button><button onClick={() => setMenuOpen(true)} className="rounded-full p-2 md:hidden"><Menu size={20}/></button></div>
        </div>
      </nav>
      <div className="h-[64px]" />

      <header className="relative overflow-hidden">
        <div className="hero-noise absolute inset-0" />
        <section className="mx-auto grid max-w-[1440px] gap-5 px-4 py-8 md:px-8 lg:grid-cols-[1.08fr_.92fr] lg:py-12">
          <article className="tenant-card relative min-h-[620px] overflow-hidden rounded-[2.6rem] border shadow-[0_35px_100px_rgba(0,0,0,.55)]">
            <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80" alt="Tienda Fabrick" className="absolute inset-0 h-full w-full object-cover opacity-55" />
            <div className="absolute inset-0 bg-gradient-to-br from-black via-black/70 to-black/20" />
            <div className="relative z-10 flex h-full min-h-[620px] flex-col justify-between p-7 md:p-11">
              <div><span className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] tenant-border" style={{ background: 'color-mix(in srgb, var(--tenant-primary) 14%, transparent)', color: 'var(--tenant-accent)' }}><Sparkles size={14}/> Tienda + instalación</span><h1 className="mt-6 max-w-4xl text-[clamp(46px,8vw,104px)] font-black leading-[0.88] tracking-[-0.06em] text-white">Compra mejor. Instala más rápido. Vende con confianza.</h1><p className="mt-6 max-w-2xl text-base leading-8 text-zinc-200 md:text-lg">Productos curados para obra, hogar y negocio. Compra directo, pide asesoría o agenda instalación con Soluciones Fabrick.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="tenant-primary-bg inline-flex min-h-[54px] items-center gap-2 rounded-full px-7 text-sm font-black text-black shadow-lg transition hover:-translate-y-0.5">Explorar catálogo <ArrowRight size={16}/></button><button onClick={() => setSearchOpen(true)} className="inline-flex min-h-[54px] items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-black"><Search size={16}/> Buscar producto</button></div></div>
              <div className="grid max-w-2xl grid-cols-3 gap-3">{[['4.9★','Calificación'],['24–48h','Despacho stock'],['100%','Asesoría previa']].map(([n,l])=><div key={l} className="rounded-[1.3rem] border border-white/10 bg-black/45 p-4 backdrop-blur-xl"><b className="block text-2xl font-black text-white">{n}</b><span className="text-xs text-zinc-400">{l}</span></div>)}</div>
            </div>
          </article>
          <aside className="grid gap-5">
            <article className={`tenant-card rounded-[2.2rem] border p-6 ${!isDark ? 'bg-neutral-50 text-black' : ''}`}><p className="tenant-text text-[10px] font-black uppercase tracking-[0.3em]">Producto destacado</p>{heroProduct && <button onClick={() => selectProduct(heroProduct)} className="mt-4 grid w-full gap-4 text-left sm:grid-cols-[160px_1fr] lg:grid-cols-1"><div className="aspect-square overflow-hidden rounded-[1.5rem] bg-zinc-900"><img src={heroProduct.img} alt={heroProduct.name} className="h-full w-full object-cover transition duration-700 hover:scale-105"/></div><div><h2 className="text-3xl font-black tracking-tight">{heroProduct.name}</h2><p className="mt-2 text-sm leading-6 opacity-65">{heroProduct.description}</p><b className="tenant-text mt-4 block text-2xl">${getFinalPrice(heroProduct).toLocaleString('es-CL')}</b></div></button>}</article>
            <article className="tenant-card rounded-[2.2rem] border p-6"><Zap className="tenant-icon mb-4 h-8 w-8"/><h3 className="text-3xl font-black tracking-tight text-white">Del producto a la obra terminada.</h3><p className="mt-3 text-sm leading-7 text-zinc-300">Cada producto puede conectar con compra, cotización o agenda de instalación.</p><button onClick={() => router.push('/contacto')} className="tenant-primary-bg mt-6 rounded-full px-5 py-3 text-sm font-black text-black">Agendar evaluación</button></article>
          </aside>
        </section>
      </header>

      <section className={`overflow-hidden border-y ${isDark ? 'tenant-border bg-black/35' : 'border-neutral-200 bg-neutral-50'}`}><div className="store-scroll flex gap-10 overflow-x-auto px-4 py-4 text-xs font-black uppercase tracking-[0.26em] opacity-70">{['Instalación certificada','Garantía extendida','Pago en cuotas','Asesoría gratuita','Catálogo en tiempo real','Despacho a todo Chile'].map((t)=><span key={t} className="shrink-0">★ {t}</span>)}</div></section>

      <main className="mx-auto max-w-[1440px] px-4 py-12 md:px-8">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="tenant-text text-[10px] font-black uppercase tracking-[0.3em]">Productos destacados</p><h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Cartas claras, rápidas y vendibles.</h2><p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">Ahora cada carta tiene acciones visibles: carrito, comprar y ver ficha. Sin esconder botones importantes.</p></div><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="tenant-border tenant-text w-fit rounded-full border px-5 py-3 text-sm font-black">Ver todos <ArrowRight className="ml-1 inline h-4 w-4"/></button></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">{featured.map((p)=><UiverseProductCard key={p.id} name={p.name} price={p.price} category={p.category} img={p.img} discountPct={p.discountPercentage ?? 0} rating={p.rating} stockLabel={getStockBadge(p)} deliveryLabel={p.delivery || 'Entrega coordinada'} isDark={isDark} onSelect={() => selectProduct(p)} onAddToCart={(e) => addProduct(e, p)} onBuyNow={(e) => buyNow(e, p)} />)}</div>
      </main>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 pb-16 md:grid-cols-3 md:px-8">{[['Compra segura','Respaldo, garantía y acompañamiento.'],['Asesoría real','No compras a ciegas: te orientamos.'],['Instalación opcional','Agenda montaje y puesta en marcha.']].map(([t,d])=><article key={t} className={`tenant-card rounded-[1.8rem] border p-6 ${!isDark ? 'bg-neutral-50 text-black' : ''}`}><CheckCircle2 className="tenant-icon mb-4 h-7 w-7"/><h3 className="text-xl font-black">{t}</h3><p className="mt-2 text-sm leading-6 opacity-65">{d}</p></article>)}</section>

      <footer className="bg-black px-4 py-10 text-white md:px-8"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><StoreFabrickLogo tone="dark"/><p className="mt-3 max-w-md text-sm text-zinc-500">Materiales premium instalados por expertos en tu obra.</p></div><div className="flex gap-4 text-zinc-500"><Instagram/><Facebook/></div></div></footer>

      {menuOpen && <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-md md:hidden"><div className="ml-auto flex h-full w-[86vw] max-w-sm flex-col rounded-l-[2rem] border-l border-white/10 bg-zinc-950 p-5 text-white"><div className="flex items-center justify-between"><StoreFabrickLogo tone="dark"/><button onClick={() => setMenuOpen(false)}><X/></button></div><div className="mt-8 grid gap-2"><button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="rounded-2xl bg-white/10 p-4 text-left font-black">Catálogo</button><button onClick={() => router.push('/contacto')} className="rounded-2xl bg-white/10 p-4 text-left font-black">Instalación</button><button onClick={() => router.push('/garantias')} className="rounded-2xl bg-white/10 p-4 text-left font-black">Garantías</button></div></div></div>}
      <UiverseSearchModal open={searchOpen} value={searchQuery} onChange={setSearchQuery} onClose={() => setSearchOpen(false)} onFilterClick={() => { setSearchOpen(false); navigateWithTransition('/tienda/catalogo', router); }} resultCount={searchQuery.trim() ? filteredProducts.length : undefined} />
    </div>
  );
}
