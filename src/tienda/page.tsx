'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Facebook,
  Filter,
  Hammer,
  Instagram,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Truck,
  User,
  X,
  Zap,
} from 'lucide-react';
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
const CATEGORY_ALL = 'Todos';
const CONSTRUCTION_HERO_IMAGE =
  'https://res.cloudinary.com/disghf6xc/image/upload/f_auto,q_auto,c_fill,g_auto,w_1400,h_1200/v1781844764/Contemporary_design_advertisement._A_close-up_202606030147_oeelof.jpg';

function StoreFabrickLogo({ tone = 'dark' }: { tone?: 'light' | 'dark' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-9 w-[46px]">
        <FabrickLogo3DLazy height="100%" interactive={false} showHint={false} showText={false} cameraZ={14} />
      </div>
      <span className={`text-[10px] font-black uppercase leading-none tracking-[0.12em] ${tone === 'dark' ? 'text-white' : 'text-neutral-900'}`}>
        Soluciones <span className="text-yellow-400">Fabrick</span>
      </span>
    </div>
  );
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

function getCategory(product: Product) {
  return product.category || 'Productos';
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
  const [selectedCategory, setSelectedCategory] = useState(CATEGORY_ALL);

  const liveProducts = useMemo<Product[]>((() => {
    if (fetchComplete) return catalogProducts as Product[];
    return catalogProducts.length ? (catalogProducts as Product[]) : PRODUCTS;
  }) as () => Product[], [catalogProducts, fetchComplete]);

  const categories = useMemo(() => {
    const found = Array.from(new Set(liveProducts.map((product) => getCategory(product)).filter(Boolean)));
    return [CATEGORY_ALL, ...found.slice(0, 8)];
  }, [liveProducts]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return liveProducts.filter((product) => {
      const matchesCategory = selectedCategory === CATEGORY_ALL || getCategory(product) === selectedCategory;
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        getCategory(product).toLowerCase().includes(q) ||
        product.tagline.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [liveProducts, searchQuery, selectedCategory]);

  function selectProduct(product: Product) {
    navigateWithTransition(`/tienda/${product.id}`, router);
  }

  function addProduct(e: MouseEvent, product: Product) {
    e.stopPropagation();
    addToCart({ id: product.id, name: product.name, price: getFinalPrice(product), image_url: product.img } as Parameters<typeof addToCart>[0]);
  }

  function buyNow(e: MouseEvent, product: Product) {
    e.stopPropagation();
    addProduct(e, product);
    navigateWithTransition(
      `/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${getFinalPrice(product)}${product.img ? `&img=${encodeURIComponent(product.img)}` : ''}`,
      router,
    );
  }

  const featured = filteredProducts.slice(0, 12);
  const heroProduct = liveProducts[0];
  const heroStats = [
    { value: '24–48h', label: 'Despacho stock' },
    { value: '+Montaje', label: 'Servicio opcional' },
    { value: `${liveProducts.length}+`, label: 'Productos activos' },
  ];
  const pageBg = isDark
    ? 'bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,.12),transparent_28rem),linear-gradient(180deg,#060606_0%,#11110d_45%,#050505_100%)] text-white'
    : 'bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,.18),transparent_25rem),linear-gradient(180deg,#f7f7f4_0%,#fff_48%,#f4f4f1_100%)] text-neutral-950';

  return (
    <div className={`min-h-screen overflow-x-hidden ${pageBg}`}>
      <style>{`
        .store-scroll::-webkit-scrollbar{display:none}
        .store-scroll{scrollbar-width:none}
      `}</style>

      <nav className={`fixed left-0 top-0 z-[100] w-full border-b backdrop-blur-xl ${isDark ? 'border-white/10 bg-zinc-950/88' : 'border-neutral-200 bg-white/90'}`}>
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between gap-2 px-3 md:gap-4 md:px-8">
          <button onClick={() => router.push('/')} className={`rounded-full border px-3 py-2 ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-neutral-200 bg-white shadow-sm'}`}>
            <StoreFabrickLogo tone={isDark ? 'dark' : 'light'} />
          </button>
          <div className="hidden items-center gap-7 md:flex">
            <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="text-sm font-bold opacity-70 hover:opacity-100">Catálogo</button>
            <button onClick={() => router.push('/contacto')} className="text-sm font-bold opacity-70 hover:opacity-100">Instalación</button>
            <button onClick={() => router.push('/garantias')} className="text-sm font-bold opacity-70 hover:opacity-100">Garantías</button>
          </div>
          <div className="flex items-center gap-1">
            <span className={`mr-2 hidden h-1.5 w-1.5 rounded-full sm:block ${connected ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
            <button onClick={() => setSearchOpen(true)} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Buscar"><Search size={20} /></button>
            <button onClick={toggleTheme} className="rounded-full p-2 opacity-70 hover:bg-white/10 hover:opacity-100" aria-label="Tema">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
            {user ? (
              <button onClick={() => router.push('/mi-cuenta')} className="grid h-9 w-9 place-items-center rounded-full bg-yellow-400 text-xs font-black text-black">{getInitials(user.name || user.email)}</button>
            ) : (
              <button onClick={() => router.push('/auth')} className="hidden rounded-full p-2 opacity-70 hover:bg-white/10 sm:block"><User size={20} /></button>
            )}
            <button onClick={() => navigateWithTransition('/checkout', router)} className="rounded-full p-2 opacity-80 hover:bg-white/10"><ShoppingBag size={20} /></button>
            <button onClick={() => setMenuOpen(true)} className="rounded-full p-2 md:hidden"><Menu size={20} /></button>
          </div>
        </div>
      </nav>
      <div className="h-[64px]" />

      <header className="mx-auto grid max-w-[1440px] gap-5 px-3 py-4 md:px-8 md:py-6 lg:grid-cols-[1fr_.7fr] lg:py-10">
        <section className={`relative overflow-hidden rounded-[1.75rem] border p-4 shadow-[0_30px_100px_rgba(0,0,0,.26)] sm:rounded-[2.2rem] sm:p-5 md:rounded-[2.8rem] md:p-8 ${isDark ? 'border-white/10 bg-black/45' : 'border-neutral-200 bg-white'}`}>
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <img src={CONSTRUCTION_HERO_IMAGE} alt="" className="h-full w-full object-cover object-center opacity-18 blur-[1px]" loading="eager" />
            <div className={`absolute inset-0 ${isDark ? 'bg-[linear-gradient(180deg,rgba(0,0,0,.80),rgba(0,0,0,.58)_45%,rgba(0,0,0,.88))]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,.78),rgba(255,255,255,.58)_45%,rgba(255,255,255,.90))]'}`} />
          </div>

          <div className="relative z-10 grid gap-5 lg:min-h-[650px] lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
            <div className="flex min-w-0 flex-col justify-center gap-5 md:gap-7">
              <div>
                <span className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] sm:px-4 sm:text-[10px] sm:tracking-[0.28em] ${isDark ? 'border-yellow-300/25 bg-yellow-400/10 text-yellow-300' : 'border-yellow-500/20 bg-yellow-50 text-yellow-700'}`}>
                  <Sparkles size={14} /> Tienda + servicios + instalación
                </span>
                <h1 className="mt-5 max-w-4xl text-[clamp(38px,12vw,106px)] font-black leading-[0.92] tracking-[-0.07em] md:mt-7 md:leading-[0.88]">
                  Compra simple. Ficha clara. Instalación lista.
                </h1>
                <p className={`mt-5 max-w-2xl text-[15px] leading-7 sm:text-base md:mt-6 md:text-lg md:leading-8 ${isDark ? 'text-zinc-300' : 'text-neutral-600'}`}>
                  Catálogo visual con productos, servicios, precio, stock y compra directa. Ideal para vender rápido, compartir por WhatsApp y cerrar con instalación.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button
                  onClick={() => setSearchOpen(true)}
                  className={`flex min-h-[54px] items-center gap-3 rounded-full border px-4 text-left sm:min-h-[58px] sm:px-5 ${isDark ? 'border-white/10 bg-white/[0.06] text-zinc-400' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}
                >
                  <Search className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm">Buscar producto, servicio o material...</span>
                  <Filter className="h-4 w-4 shrink-0 opacity-60" />
                </button>
                <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-yellow-400 px-7 text-sm font-black text-black shadow-[0_20px_60px_rgba(250,204,21,.22)] transition hover:-translate-y-0.5 hover:bg-yellow-300 sm:min-h-[58px]">
                  Ver catálogo <ArrowRight size={16} />
                </button>
              </div>

              <div className="store-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {categories.map((category) => {
                  const active = category === selectedCategory;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                        active
                          ? 'border-yellow-400 bg-yellow-400 text-black'
                          : isDark
                            ? 'border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white'
                            : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-950'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 min-[520px]:grid-cols-3">
                {heroStats.map((stat, index) => (
                  <div key={stat.label} className={`min-w-0 rounded-[1.25rem] border p-3 sm:rounded-[1.4rem] sm:p-4 ${index === 2 ? 'col-span-2 min-[520px]:col-span-1' : ''} ${isDark ? 'border-white/10 bg-black/35' : 'border-neutral-200 bg-white/70'}`}>
                    <b className="block truncate text-[clamp(22px,6.5vw,34px)] font-black leading-none tracking-[-0.06em]">{stat.value}</b>
                    <span className={`mt-2 block text-[11px] leading-4 sm:text-xs ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => router.push('/contacto')} className={`relative min-h-[360px] overflow-hidden rounded-[1.8rem] border p-5 text-left sm:min-h-[430px] lg:min-h-full ${isDark ? 'border-white/10 bg-zinc-950' : 'border-neutral-200 bg-[#f3f4f1]'}`}>
              <img src={CONSTRUCTION_HERO_IMAGE} alt="Construcción, diseño e instalación Soluciones Fabrick" className="absolute inset-0 h-full w-full object-cover object-center transition duration-700 hover:scale-105" loading="eager" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
              <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-between sm:min-h-[390px] lg:min-h-full">
                <span className="w-fit rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-black">Portada construcción</span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Producto + servicio + montaje</p>
                  <h2 className="mt-2 max-w-sm text-4xl font-black leading-none tracking-[-0.06em] text-white md:text-5xl">Solución llave en mano</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-300">Te ayudamos a comprar, coordinar e instalar sin perder tiempo comparando proveedores.</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {heroProduct && <b className="rounded-full bg-black/55 px-4 py-2 text-sm font-black text-yellow-300">Desde ${getFinalPrice(heroProduct).toLocaleString('es-CL')}</b>}
                    <span className="rounded-full bg-yellow-400 px-4 py-2 text-xs font-black text-black">Cotizar montaje</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        <aside className="grid gap-4">
          {[
            { icon: <ShieldCheck className="h-6 w-6 text-yellow-400" />, title: 'Compra protegida', text: 'Ficha clara, precio visible y respaldo directo.' },
            { icon: <Hammer className="h-6 w-6 text-yellow-400" />, title: 'Instalación opcional', text: 'Convierte el producto en solución completa.' },
            { icon: <Truck className="h-6 w-6 text-yellow-400" />, title: 'Despacho coordinado', text: 'Compra y agenda entrega según disponibilidad.' },
          ].map((item) => (
            <article key={item.title} className={`rounded-[2rem] border p-6 ${isDark ? 'border-white/10 bg-white/[0.045]' : 'border-neutral-200 bg-white'}`}>
              {item.icon}
              <h3 className="mt-4 text-2xl font-black tracking-tight">{item.title}</h3>
              <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-zinc-400' : 'text-neutral-500'}`}>{item.text}</p>
            </article>
          ))}
          <article className="rounded-[2rem] border border-yellow-300/20 bg-gradient-to-br from-yellow-400/20 to-black p-6 text-white">
            <Zap className="mb-4 h-8 w-8 text-yellow-300" />
            <h3 className="text-3xl font-black tracking-tight">Cotiza producto + montaje.</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-300">No vendas solo el producto: vende la solución completa.</p>
            <button onClick={() => router.push('/contacto')} className="mt-6 rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black">Agendar evaluación</button>
          </article>
        </aside>
      </header>

      <section className={`overflow-hidden border-y ${isDark ? 'border-white/10 bg-black/35' : 'border-neutral-200 bg-white/70'}`}>
        <div className="store-scroll flex gap-10 overflow-x-auto px-4 py-4 text-xs font-black uppercase tracking-[0.26em] opacity-70 md:px-8">
          {['Instalación certificada', 'Garantía extendida', 'Pago en cuotas', 'Asesoría gratuita', 'Catálogo en tiempo real', 'Despacho a todo Chile'].map((text) => <span key={text} className="shrink-0">★ {text}</span>)}
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 py-12 md:px-8">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">Productos destacados</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Fichas rápidas, claras y compartibles.</h2>
            <p className={`mt-2 max-w-2xl text-sm leading-6 ${isDark ? 'text-zinc-400' : 'text-neutral-500'}`}>Diseño más limpio tipo app: imagen fuerte, precio visible, stock, compra rápida y ficha para compartir.</p>
          </div>
          <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="w-fit rounded-full border border-yellow-400/30 px-5 py-3 text-sm font-black text-yellow-500">Ver todos <ArrowRight className="ml-1 inline h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <UiverseProductCard
              key={product.id}
              name={product.name}
              price={product.price}
              category={getCategory(product)}
              img={product.img}
              discountPct={product.discountPercentage ?? 0}
              rating={product.rating}
              stockLabel={getStockBadge(product)}
              deliveryLabel={product.delivery || 'Entrega coordinada'}
              isDark={isDark}
              onSelect={() => selectProduct(product)}
              onAddToCart={(event) => addProduct(event, product)}
              onBuyNow={(event) => buyNow(event, product)}
            />
          ))}
        </div>

        {featured.length === 0 && (
          <div className={`rounded-[2rem] border p-10 text-center ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-neutral-200 bg-white'}`}>
            <p className="text-lg font-black">No hay productos con ese filtro.</p>
            <button onClick={() => { setSelectedCategory(CATEGORY_ALL); setSearchQuery(''); }} className="mt-4 rounded-full bg-yellow-400 px-5 py-3 text-sm font-black text-black">Limpiar búsqueda</button>
          </div>
        )}
      </main>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 pb-16 md:grid-cols-3 md:px-8">
        {[
          ['Compra segura', 'Respaldo, garantía y acompañamiento.'],
          ['Asesoría real', 'No compras a ciegas: te orientamos.'],
          ['Instalación opcional', 'Agenda montaje y puesta en marcha.'],
        ].map(([title, description]) => (
          <article key={title} className={`rounded-[1.8rem] border p-6 ${isDark ? 'border-white/10 bg-white/[0.045]' : 'border-neutral-200 bg-white'}`}>
            <CheckCircle2 className="mb-4 h-7 w-7 text-yellow-400" />
            <h3 className="text-xl font-black">{title}</h3>
            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-zinc-400' : 'text-neutral-500'}`}>{description}</p>
          </article>
        ))}
      </section>

      <footer className="bg-black px-4 py-10 text-white md:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <StoreFabrickLogo tone="dark" />
            <p className="mt-3 max-w-md text-sm text-zinc-500">Productos, servicios e instalación con respaldo Fabrick.</p>
          </div>
          <div className="flex gap-4 text-zinc-500"><Instagram /><Facebook /></div>
        </div>
      </footer>

      {menuOpen && (
        <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-md md:hidden">
          <div className="ml-auto flex h-full w-[86vw] max-w-sm flex-col rounded-l-[2rem] border-l border-white/10 bg-zinc-950 p-5 text-white">
            <div className="flex items-center justify-between"><StoreFabrickLogo tone="dark" /><button onClick={() => setMenuOpen(false)}><X /></button></div>
            <div className="mt-8 grid gap-2">
              <button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className="rounded-2xl bg-white/10 p-4 text-left font-black">Catálogo</button>
              <button onClick={() => router.push('/contacto')} className="rounded-2xl bg-white/10 p-4 text-left font-black">Instalación</button>
              <button onClick={() => router.push('/garantias')} className="rounded-2xl bg-white/10 p-4 text-left font-black">Garantías</button>
            </div>
          </div>
        </div>
      )}
      <UiverseSearchModal
        open={searchOpen}
        value={searchQuery}
        onChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onFilterClick={() => {
          setSearchOpen(false);
          navigateWithTransition('/tienda/catalogo', router);
        }}
        resultCount={searchQuery.trim() ? filteredProducts.length : undefined}
      />
    </div>
  );
}
