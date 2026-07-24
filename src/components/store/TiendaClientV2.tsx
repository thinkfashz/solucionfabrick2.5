'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  Calculator,
  Check,
  Facebook,
  Hammer,
  Instagram,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Star,
  Truck,
  Wrench,
} from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts } from '@/hooks/useCatalogProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useCartContext } from '@/context/CartContext';
import UiverseSearchModal from '@/components/UiverseSearchModal';
import { StoreBottomNav, StoreFabrickLogo, StorefrontHeader } from '@/components/store/StorefrontChrome';

const INK = '#171820';
const PEARL = '#F8F0E9';
const OAK = '#B6906C';
const OAK_LIGHT = '#CCB196';
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export type StoreProduct = {
  id: string;
  name: string;
  price: number;
  category?: string;
  category_id?: string;
  category_name?: string;
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
  featured?: boolean;
};

const FALLBACK_PRODUCTS = FALLBACK_CATALOG_PRODUCTS as StoreProduct[];

function getCategory(product: StoreProduct) {
  return product.category_name || product.category || product.category_id || 'Producto';
}
function getImage(product: StoreProduct) {
  return product.img || product.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop';
}
function getDiscount(product: StoreProduct) {
  return Math.max(0, product.discountPercentage ?? product.discount_percentage ?? 0);
}
function finalPrice(product: StoreProduct) {
  return Math.round(product.price * (1 - getDiscount(product) / 100));
}
function getStockNumber(product: StoreProduct) {
  if (typeof product.stock === 'number') return product.stock;
  const match = String(product.stock || '').match(/[0-9]+/);
  return match ? Number(match[0]) : null;
}
function stockText(product: StoreProduct) {
  const stock = getStockNumber(product);
  if (stock === null) return 'Disponibilidad por confirmar';
  if (stock <= 0) return 'Agotado';
  if (stock <= 4) return `Últimas ${stock} unidades`;
  return `${stock} disponibles`;
}
function getDelivery(product: StoreProduct) {
  return product.delivery || product.delivery_days || 'Entrega coordinada';
}
function displayName(value: string) {
  return value.replace(/\s*\|\s*(Sodimac|Falabella|Mercado Libre|Chile).*$/i, '').replace(/\s+/g, ' ').trim();
}
function asCartProduct(product: StoreProduct) {
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
function productScore(product: StoreProduct) {
  return (product.featured ? 100 : 0) + Math.min(product.rating || 0, 5) * 7 + getDiscount(product) * 0.7 + Math.min(getStockNumber(product) || 0, 20) * 0.25;
}

export default function TiendaClientV2() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { products: catalogProducts, connected, fetchComplete, loading, source, error: catalogError, reload } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const brandName = branding.name || 'Soluciones Fabrick';
  const supportLink = branding.whatsappUrl || '/contacto';

  const products = useMemo<StoreProduct[]>(() => catalogProducts.length ? catalogProducts as StoreProduct[] : FALLBACK_PRODUCTS, [catalogProducts]);
  const ranked = useMemo(() => [...products].sort((a, b) => productScore(b) - productScore(a)), [products]);
  const bestSellers = ranked.slice(0, 4);
  const dealProducts = useMemo(() => products.filter((product) => getDiscount(product) > 0).sort((a, b) => getDiscount(b) - getDiscount(a)).slice(0, 8), [products]);
  const heroProduct = bestSellers[0] || products[0];
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(getCategory))).filter(Boolean).slice(0, 10)], [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const category = getCategory(product);
      const stock = getStockNumber(product);
      const content = `${product.name} ${category} ${product.tagline || ''} ${product.description || ''}`.toLowerCase();
      if (activeCategory !== 'Todos' && category !== activeCategory) return false;
      if (onlyDeals && getDiscount(product) <= 0) return false;
      if (onlyInStock && stock !== null && stock <= 0) return false;
      return !q || content.includes(q);
    });
  }, [activeCategory, onlyDeals, onlyInStock, products, searchQuery]);

  function selectProduct(product: StoreProduct) {
    navigateWithTransition(`/tienda/${product.id}`, router);
  }
  function addProduct(event: MouseEvent, product: StoreProduct) {
    event.stopPropagation();
    if ((getStockNumber(product) ?? 1) <= 0) return;
    addToCart(asCartProduct(product) as Parameters<typeof addToCart>[0]);
    setAddedId(product.id);
    window.setTimeout(() => setAddedId((current) => current === product.id ? null : current), 1800);
  }
  function goSupport() {
    if (supportLink.startsWith('http')) window.open(supportLink, '_blank', 'noopener,noreferrer');
    else router.push(supportLink);
  }
  function clearFilters() {
    setSearchQuery('');
    setActiveCategory('Todos');
    setOnlyDeals(false);
    setOnlyInStock(false);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8F0E9] text-[#171820]">
      <StorefrontHeader onSearch={() => setSearchOpen(true)} />

      {fetchComplete && source === 'fallback' ? (
        <section role="status" className="mx-auto mt-3 flex max-w-[1280px] flex-col gap-3 rounded-[1.25rem] bg-[#EADBCB] px-4 py-3 text-sm text-[#5E5148] sm:flex-row sm:items-center sm:justify-between md:mx-8">
          <p className="leading-6"><b className="font-black text-[#171820]">Catálogo protegido.</b> {catalogError || 'Mostramos productos de respaldo mientras reconectamos el catálogo.'}</p>
          <button onClick={() => void reload()} disabled={loading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#171820] px-4 py-2 text-xs font-black text-[#F8F0E9] disabled:opacity-55"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reintentar</button>
        </section>
      ) : null}

      <header className="mx-auto max-w-[1320px] px-4 pb-8 pt-4 md:px-8 md:pb-12">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#171820] text-[#F8F0E9] shadow-[0_32px_90px_rgba(23,24,32,.22)] md:min-h-[560px] md:rounded-[2.8rem]">
          <div className="grid min-h-[520px] lg:grid-cols-[.92fr_1.08fr]">
            <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-9 lg:px-12">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/7 px-3 py-2 text-[10px] font-black uppercase tracking-[.22em] text-[#E5CFBA]"><BadgeCheck className="h-3.5 w-3.5" /> Tienda curada para mejorar tu hogar</span>
              <h1 className="mt-6 max-w-[11ch] text-[clamp(44px,8vw,84px)] font-black leading-[.9] tracking-[-.075em]">Compra con criterio, no por impulso.</h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[#D8CCC3] sm:text-base">Productos organizados por utilidad, precio, disponibilidad e instalación. Encuentra lo que necesitas y entiende cómo encaja dentro de tu proyecto.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => setSearchOpen(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#B6906C] px-6 text-sm font-black text-[#171820] transition hover:bg-[#F8F0E9]"><Search className="h-4 w-4" /> Buscar producto</button>
                <a href="#catalogo-completo" className="inline-flex min-h-12 items-center rounded-full bg-white/7 px-6 text-sm font-black text-[#F8F0E9] transition hover:bg-white/12">Ver catálogo completo</a>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/9 pt-5 text-center sm:max-w-lg">
                <HeroMetric value={`${products.length}+`} label="productos" />
                <HeroMetric value={`${dealProducts.length}`} label="con descuento" />
                <HeroMetric value="1 flujo" label="compra + instalación" />
              </div>
            </div>

            {heroProduct ? (
              <button type="button" onClick={() => selectProduct(heroProduct)} className="group relative min-h-[420px] overflow-hidden text-left lg:min-h-full" aria-label={`Ver ${displayName(heroProduct.name)}`}>
                <img src={getImage(heroProduct)} alt={displayName(heroProduct.name)} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(23,24,32,.05),rgba(23,24,32,.26)_42%,rgba(23,24,32,.94))]" />
                <div className="absolute inset-x-5 bottom-5 rounded-[1.7rem] bg-[#F8F0E9]/94 p-5 text-[#171820] shadow-2xl backdrop-blur-xl sm:inset-x-8 sm:bottom-8 sm:p-6">
                  <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#171820] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-[#E5CFBA]">Selección destacada</span>{getDiscount(heroProduct) > 0 ? <span className="rounded-full bg-[#B6906C] px-3 py-1.5 text-[9px] font-black text-[#171820]">-{getDiscount(heroProduct)}%</span> : null}</div>
                  <p className="mt-4 text-[9px] font-black uppercase tracking-[.2em] text-[#895E3D]">{getCategory(heroProduct)}</p>
                  <h2 className="mt-2 line-clamp-2 text-2xl font-black leading-[1.02] tracking-[-.04em] sm:text-3xl">{displayName(heroProduct.name)}</h2>
                  <div className="mt-4 flex items-end justify-between gap-4"><div><strong className="text-2xl font-black">{CLP.format(finalPrice(heroProduct))}</strong>{getDiscount(heroProduct) > 0 ? <span className="ml-2 text-xs text-[#8A7B70] line-through">{CLP.format(heroProduct.price)}</span> : null}</div><ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></div>
                </div>
              </button>
            ) : null}
          </div>
        </section>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-20">
        <section className="grid gap-3 rounded-[1.8rem] bg-white p-4 shadow-[0_18px_60px_rgba(23,24,32,.08)] sm:grid-cols-3 sm:p-5">
          <TrustPoint icon={ShieldCheck} title="Compra con respaldo" text="Orden, pago y seguimiento en un solo flujo." />
          <TrustPoint icon={Truck} title="Entrega coordinada" text="Cobertura y plazo visibles antes de confirmar." />
          <TrustPoint icon={Wrench} title="Instalación opcional" text="Conecta el producto con el servicio correcto." />
        </section>

        <StoreSection eyebrow="Selección Fabrick" title="Los más elegidos para resolver mejoras reales" description="Una selección breve, ordenada por relevancia, disponibilidad, descuento y valoración.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {bestSellers.map((product, index) => <ProductCard key={product.id} product={product} rank={index + 1} added={addedId === product.id} onSelect={() => selectProduct(product)} onAdd={(event) => addProduct(event, product)} />)}
          </div>
        </StoreSection>

        {dealProducts.length > 0 ? (
          <StoreSection eyebrow="Descuentos vigentes" title="Oportunidades claras, sin esconder el precio anterior" description="Compara el precio normal, el valor rebajado y la disponibilidad antes de comprar.">
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dealProducts.map((product) => <DealCard key={product.id} product={product} onSelect={() => selectProduct(product)} onAdd={(event) => addProduct(event, product)} />)}
            </div>
          </StoreSection>
        ) : null}

        <section className="mt-14 overflow-hidden rounded-[2.2rem] bg-[#E6D4C3] p-5 sm:p-7 lg:grid lg:grid-cols-[.74fr_1.26fr] lg:gap-8 lg:p-9">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#895E3D]">Compra la medida correcta</p>
            <h2 className="mt-3 text-3xl font-black leading-[.96] tracking-[-.05em] sm:text-5xl">Calcula antes de elegir equipo o material.</h2>
            <p className="mt-4 text-sm leading-7 text-[#685D55]">Usa las herramientas técnicas para evitar comprar capacidad insuficiente, material de más o una solución que no corresponde al espacio.</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-0">
            <CalculatorCard href="/herramientas/aire-acondicionado" icon={Snowflake} eyebrow="Climatización" title="Calculadora de aire" text="BTU, volumen del recinto y consumo estimado." />
            <CalculatorCard href="/herramientas/radier" icon={Hammer} eyebrow="Construcción" title="Calculadora de radier" text="Superficie, espesor, volumen y materiales." dark />
          </div>
        </section>

        <section id="catalogo-completo" className="scroll-mt-24 pt-16">
          <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
            <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#895E3D]">Catálogo completo</p><h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl">Todo el catálogo, finalmente ordenado.</h2></div>
            <p className="max-w-2xl text-sm leading-7 text-[#685D55]">Busca por necesidad, filtra por categoría, revisa descuentos o muestra únicamente productos con stock listo.</p>
          </div>

          <div className="sticky top-[68px] z-30 -mx-4 mt-7 border-y border-[#171820]/8 bg-[#F8F0E9]/92 px-4 py-3 backdrop-blur-2xl md:mx-0 md:rounded-[1.6rem] md:border">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#895E3D]" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar aire, lámpara, grifería, piso, seguridad…" className="h-14 w-full rounded-2xl bg-white pl-12 pr-4 text-sm font-semibold text-[#171820] outline-none ring-1 ring-[#171820]/8 transition placeholder:text-[#9B8E84] focus:ring-2 focus:ring-[#B6906C]/55" />
            </label>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => <FilterChip key={category} active={activeCategory === category} onClick={() => setActiveCategory(category)}>{category}</FilterChip>)}
              <FilterChip active={onlyDeals} onClick={() => setOnlyDeals((value) => !value)}>Con descuento</FilterChip>
              <FilterChip active={onlyInStock} onClick={() => setOnlyInStock((value) => !value)}>Stock listo</FilterChip>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4"><p className="text-sm font-bold text-[#685D55]">{filteredProducts.length} productos encontrados</p>{searchQuery || activeCategory !== 'Todos' || onlyDeals || onlyInStock ? <button onClick={clearFilters} className="text-xs font-black text-[#895E3D]">Limpiar filtros</button> : null}</div>

          {filteredProducts.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => <ProductCard key={product.id} product={product} added={addedId === product.id} onSelect={() => selectProduct(product)} onAdd={(event) => addProduct(event, product)} compact />)}
            </div>
          ) : (
            <div className="mt-6 rounded-[2rem] bg-white p-10 text-center shadow-[0_18px_60px_rgba(23,24,32,.07)]"><h3 className="text-2xl font-black">No encontramos productos con esos filtros.</h3><p className="mt-2 text-sm text-[#756B63]">Prueba otra categoría o limpia la búsqueda.</p><button onClick={clearFilters} className="mt-5 rounded-full bg-[#171820] px-6 py-3 text-sm font-black text-[#F8F0E9]">Ver todo el catálogo</button></div>
          )}
        </section>

        <section className="mt-16 rounded-[2.3rem] bg-[#171820] p-6 text-[#F8F0E9] sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#CCB196]">Compra asistida</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-4xl">¿El producto necesita instalación o una visita técnica?</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[#CFC3BA]">Nuestro equipo puede revisar compatibilidad, medidas, montaje y alcance antes de que confirmes la compra.</p></div>
          <button onClick={goSupport} className="mt-6 inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-[#B6906C] px-6 text-sm font-black text-[#171820] transition hover:bg-[#F8F0E9] lg:mt-0">Hablar con un asesor <ArrowRight className="h-4 w-4" /></button>
        </section>
      </main>

      <footer className="bg-[#171820] px-4 pb-[calc(7.8rem+env(safe-area-inset-bottom))] pt-9 text-[#F8F0E9] md:px-8 md:py-9">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div><StoreFabrickLogo tone="dark" branding={branding} compact /><p className="mt-3 max-w-md text-sm leading-6 text-[#CFC3BA]">Productos útiles, compra clara e instalación coordinada cuando la necesitas.</p><p className="mt-3 text-[10px] uppercase tracking-[.14em] text-[#81776F]">© {new Date().getFullYear()} {brandName} · Compra con criterio.</p></div>
          <div className="flex flex-wrap gap-2"><button className="rounded-full bg-white/7 p-3 text-[#F8F0E9]/70 hover:text-[#CCB196]" aria-label="Facebook"><Facebook size={18} /></button><button className="rounded-full bg-white/7 p-3 text-[#F8F0E9]/70 hover:text-[#CCB196]" aria-label="Instagram"><Instagram size={18} /></button><button onClick={goSupport} className="rounded-full bg-[#B6906C] px-5 py-3 text-sm font-black text-[#171820] transition hover:bg-[#F8F0E9]">Hablar con un asesor</button></div>
        </div>
      </footer>

      <StoreBottomNav />
      <UiverseSearchModal open={searchOpen} value={searchQuery} onChange={setSearchQuery} onClose={() => setSearchOpen(false)} onFilterClick={() => setSearchOpen(false)} resultCount={searchQuery.trim() ? filteredProducts.length : undefined} />
      <div className="hidden text-xs opacity-0">{connected ? 'online' : 'offline'} {fetchComplete ? 'ready' : 'loading'}</div>
    </div>
  );
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return <div><strong className="block text-lg font-black text-[#E5CFBA]">{value}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.13em] text-white/40">{label}</span></div>;
}

function StoreSection({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="mt-16"><div className="mb-7 grid gap-4 lg:grid-cols-[.72fr_1.28fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#895E3D]">{eyebrow}</p><h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-5xl">{title}</h2></div><p className="max-w-2xl text-sm leading-7 text-[#685D55]">{description}</p></div>{children}</section>;
}

function TrustPoint({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-[1.25rem] bg-[#F8F0E9] p-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><Icon className="h-5 w-5" /></span><span><b className="block text-sm">{title}</b><span className="mt-1 block text-[11px] leading-4 text-[#756B63]">{text}</span></span></div>;
}

function ProductCard({ product, rank, added, onSelect, onAdd, compact = false }: { product: StoreProduct; rank?: number; added: boolean; onSelect: () => void; onAdd: (event: MouseEvent) => void; compact?: boolean }) {
  const discount = getDiscount(product);
  const soldOut = (getStockNumber(product) ?? 1) <= 0;
  return <article className="group overflow-hidden rounded-[1.8rem] bg-white shadow-[0_18px_60px_rgba(23,24,32,.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(23,24,32,.14)]">
    <button type="button" onClick={onSelect} className={`relative block w-full overflow-hidden bg-[#E7DDD4] text-left ${compact ? 'h-56' : 'h-64'}`}>
      <img src={getImage(product)} alt={displayName(product.name)} className="h-full w-full object-cover transition duration-600 group-hover:scale-[1.04]" />
      <span className="absolute inset-0 bg-gradient-to-t from-[#171820]/62 via-transparent to-transparent" />
      <span className="absolute left-3 top-3 flex gap-2">{rank ? <span className="rounded-full bg-[#171820] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] text-[#E5CFBA]">#{rank} elegido</span> : null}{discount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-[#B6906C] px-3 py-1.5 text-[9px] font-black text-[#171820]"><BadgePercent className="h-3 w-3" /> -{discount}%</span> : null}</span>
      <span className="absolute bottom-3 left-3 rounded-full bg-[#F8F0E9]/92 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-[#171820] backdrop-blur">{getCategory(product)}</span>
    </button>
    <div className="p-5"><button type="button" onClick={onSelect} className="line-clamp-2 min-h-[2.7rem] text-left text-lg font-black leading-[1.18] tracking-[-.025em]">{displayName(product.name)}</button><p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-[#756B63]">{product.tagline || product.description || 'Producto seleccionado para complementar mejoras, instalaciones y terminaciones.'}</p>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#171820]/8 pt-4"><div><strong className="block text-xl font-black">{CLP.format(finalPrice(product))}</strong>{discount > 0 ? <span className="text-[10px] text-[#9B8E84] line-through">{CLP.format(product.price)}</span> : <span className="text-[10px] text-[#756B63]">{stockText(product)}</span>}</div><button type="button" onClick={onAdd} disabled={soldOut} className={`grid h-11 w-11 place-items-center rounded-full transition disabled:opacity-35 ${added ? 'bg-emerald-300 text-[#171820]' : 'bg-[#171820] text-[#F8F0E9] hover:bg-[#B6906C] hover:text-[#171820]'}`} aria-label={`Añadir ${displayName(product.name)} al carrito`}>{added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-4.5 w-4.5" />}</button></div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-[#80746B]"><span className="inline-flex items-center gap-1"><PackageCheck className="h-3.5 w-3.5 text-[#895E3D]" /> {getDelivery(product)}</span><span>{stockText(product)}</span></div>
    </div>
  </article>;
}

function DealCard({ product, onSelect, onAdd }: { product: StoreProduct; onSelect: () => void; onAdd: (event: MouseEvent) => void }) {
  return <article className="grid w-[82vw] max-w-[420px] shrink-0 snap-center overflow-hidden rounded-[1.8rem] bg-[#171820] text-[#F8F0E9] shadow-[0_22px_70px_rgba(23,24,32,.2)] sm:grid-cols-[150px_1fr]">
    <button type="button" onClick={onSelect} className="relative h-52 overflow-hidden sm:h-full"><img src={getImage(product)} alt={displayName(product.name)} className="h-full w-full object-cover" /><span className="absolute inset-0 bg-gradient-to-t from-[#171820]/55 to-transparent" /><span className="absolute left-3 top-3 rounded-full bg-[#B6906C] px-3 py-1.5 text-[10px] font-black text-[#171820]">-{getDiscount(product)}%</span></button>
    <div className="flex flex-col justify-between p-5"><div><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#CCB196]">{getCategory(product)}</p><button type="button" onClick={onSelect} className="mt-2 line-clamp-3 text-left text-xl font-black leading-[1.08]">{displayName(product.name)}</button><div className="mt-4"><strong className="text-2xl font-black text-[#E5CFBA]">{CLP.format(finalPrice(product))}</strong><span className="ml-2 text-xs text-white/35 line-through">{CLP.format(product.price)}</span></div></div><button type="button" onClick={onAdd} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#B6906C] px-4 text-xs font-black text-[#171820]"><ShoppingCart className="h-4 w-4" /> Añadir al carrito</button></div>
  </article>;
}

function CalculatorCard({ href, icon: Icon, eyebrow, title, text, dark = false }: { href: string; icon: typeof Snowflake; eyebrow: string; title: string; text: string; dark?: boolean }) {
  return <a href={href} className={`group rounded-[1.6rem] p-5 transition hover:-translate-y-1 ${dark ? 'bg-[#171820] text-[#F8F0E9]' : 'bg-[#F8F0E9] text-[#171820]'}`}><span className={`grid h-12 w-12 place-items-center rounded-2xl ${dark ? 'bg-[#B6906C] text-[#171820]' : 'bg-[#171820] text-[#CCB196]'}`}><Icon className="h-5 w-5" /></span><p className={`mt-5 text-[9px] font-black uppercase tracking-[.18em] ${dark ? 'text-[#CCB196]' : 'text-[#895E3D]'}`}>{eyebrow}</p><h3 className="mt-2 text-xl font-black">{title}</h3><p className={`mt-2 text-xs leading-5 ${dark ? 'text-[#CFC3BA]' : 'text-[#685D55]'}`}>{text}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-black">Calcular ahora <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></a>;
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-black transition ${active ? 'bg-[#171820] text-[#F8F0E9] shadow-[0_8px_24px_rgba(23,24,32,.16)]' : 'bg-white text-[#685D55] ring-1 ring-[#171820]/7 hover:text-[#895E3D]'}`}>{children}</button>;
}
