'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Calculator,
  Check,
  ClipboardList,
  Compass,
  RefreshCw,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useCartContext } from '@/context/CartContext';
import { navigateWithTransition } from '@/lib/routeTransition';
import { HOME_PREMIUM_VISUALS } from '@/lib/homePremiumVisuals';
import { StoreBottomNav, StoreFabrickLogo, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { toCartProduct } from '@/components/store/featuredProducts';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
type Product = CatalogProduct;
const PRODUCT_FALLBACK = HOME_PREMIUM_VISUALS.living;

function imageOf(product: Product) { return product.img || product.image_url || PRODUCT_FALLBACK; }
function categoryOf(product: Product) { return product.category_name || product.category || product.category_id || 'Producto'; }
function discountOf(product: Product) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function priceOf(product: Product) { return Math.round(Number(product.price || 0) * (1 - discountOf(product) / 100)); }
function stockOf(product: Product) { return Number.isFinite(Number(product.stock)) ? Number(product.stock) : null; }
function asCart(product: Product) { return toCartProduct(product); }

const STORE_VISUALS = [
  { src: HOME_PREMIUM_VISUALS.kitchen, label: 'Cocina', text: 'Equipamiento y terminaciones para espacios de uso diario.' },
  { src: HOME_PREMIUM_VISUALS.bathroom, label: 'Baño', text: 'Soluciones para renovar con materialidad y función.' },
  { src: HOME_PREMIUM_VISUALS.terrace, label: 'Exterior', text: 'Productos para completar terrazas y espacios exteriores.' },
];

export default function TiendaClientV2() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { addToCart, openCart } = useCartContext();
  const { products: live, loading, fetchComplete, source, error, reload } = useCatalogProducts();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [added, setAdded] = useState<string | null>(null);

  const products = useMemo(() => live.length ? live : FALLBACK_CATALOG_PRODUCTS, [live]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(categoryOf))).filter(Boolean).slice(0, 12)], [products]);
  const promos = useMemo(() => products.filter((product) => discountOf(product) > 0).sort((a, b) => discountOf(b) - discountOf(a)), [products]);
  const maxDiscount = Math.round(Math.max(0, ...promos.map(discountOf)));
  const featured = useMemo(() => [...products].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))).slice(0, 4), [products]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatch = category === 'Todos' || categoryOf(product) === category;
      const searchable = `${product.name} ${product.description || ''} ${product.tagline || ''} ${categoryOf(product)}`.toLowerCase();
      return categoryMatch && (!q || searchable.includes(q));
    });
  }, [products, category, query]);

  const nav = (href: string) => navigateWithTransition(href, router);
  const open = (product: Product) => nav(`/tienda/${product.id}`);

  function add(event: MouseEvent, product: Product) {
    event.stopPropagation();
    if ((stockOf(product) ?? 1) <= 0) return;
    addToCart(asCart(product));
    const id = String(product.id);
    setAdded(id);
    window.setTimeout(() => setAdded((current) => current === id ? null : current), 1200);
  }

  return (
    <div className="min-h-screen bg-[#F6F1E8] text-[#111214]">
      <style>{`
        .sf-store-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;column-gap:.8rem;row-gap:2.15rem;width:100%}
        .sf-store-grid>*{min-width:0;max-width:none!important}
        @media(min-width:640px){.sf-store-grid{column-gap:1.25rem;row-gap:2.6rem}}
        @media(min-width:900px){.sf-store-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
        @media(min-width:1280px){.sf-store-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}
      `}</style>

      <StorefrontHeader onSearch={() => document.getElementById('catalog-search')?.focus()} />

      {fetchComplete && source === 'fallback' ? (
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3 border-b border-[#D77A2D]/25 bg-[#EADAC6] px-4 py-3 text-xs sm:px-6 lg:px-8">
          <span>{error || 'Catálogo temporal cargado.'}</span>
          <button onClick={() => void reload()} className="inline-flex items-center gap-2 font-black text-black"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reintentar</button>
        </div>
      ) : null}

      <main className="pb-32 md:pb-16">
        <section className="bg-[#0E0E10] px-4 pb-9 pt-6 text-[#F6F1E8] sm:px-6 sm:pb-12 sm:pt-9 lg:px-8">
          <div className="mx-auto grid max-w-[1380px] gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-stretch">
            <div className="flex min-h-[430px] flex-col justify-between rounded-[2rem] border border-white/[.08] bg-[#151517] p-6 sm:min-h-[520px] sm:p-9 lg:min-h-[610px] lg:p-11">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-[.2em] text-[#D77A2D]">Tienda Soluciones Fabrick</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-[9px] font-black uppercase tracking-[.16em] text-white/35">IVA incluido</span>
                </div>
                <h1 className="mt-6 max-w-[10ch] text-[clamp(3rem,7vw,6.2rem)] font-black leading-[.9] tracking-[-.068em]">Compra para el proyecto, no para llenar un carrito.</h1>
                <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 sm:text-base sm:leading-8">Productos ordenados por uso, con herramientas para calcular antes de comprar y un flujo más corto para pasar de la idea a la ejecución.</p>
              </div>

              <div>
                <div className="flex flex-wrap gap-2.5">
                  <a href="#catalogo" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#D77A2D] px-6 text-xs font-black text-[#111214] transition hover:brightness-110 sm:text-sm">Ver catálogo <ArrowRight className="h-4 w-4" /></a>
                  <button onClick={openCart} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/14 px-6 text-xs font-black text-white transition hover:bg-white/[.06] sm:text-sm"><ShoppingBag className="h-4 w-4" /> Carrito</button>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
                  <StoreStat value={String(products.length)} label="Productos" />
                  <StoreStat value={String(categories.length - 1)} label="Categorías" />
                  <StoreStat value={maxDiscount > 0 ? `${maxDiscount}%` : 'CLP'} label={maxDiscount > 0 ? 'Mayor descuento' : 'Precio claro'} />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/[.08] bg-[#171719]">
              <div className="relative min-h-[360px] overflow-hidden sm:min-h-[470px] lg:min-h-[500px]">
                <img src={HOME_PREMIUM_VISUALS.living} alt="Interior contemporáneo equipado por Soluciones Fabrick" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="grid gap-4 border-t border-white/[.08] p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-7">
                <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#E6B56F]">Selección para espacios reales</p><p className="mt-2 max-w-xl text-sm leading-6 text-white/55">Primero define la necesidad; después compara el producto y la instalación que realmente corresponden.</p></div>
                <button onClick={() => nav('/presupuesto')} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 px-5 text-xs font-black text-white transition hover:bg-white/[.06]">Cotizar proyecto</button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/[.07] bg-[#EEE7DD] px-4 py-7 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1380px]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9A5B22]">Antes de comprar</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Calcula lo que tu proyecto necesita.</h2></div><p className="max-w-md text-xs leading-5 text-black/46">Accesos directos a las herramientas que antes estaban escondidas en el footer.</p></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ToolCard icon={<Calculator className="h-5 w-5" />} eyebrow="Climatización" title="Calculadora BTU" text="Mide el espacio, compara 9K–24K BTU y revisa consumo." onClick={() => nav('/herramientas/aire-acondicionado')} />
              <ToolCard icon={<Ruler className="h-5 w-5" />} eyebrow="Obra base" title="Calculadora Radier" text="Superficie, espesor, forma, hormigón y solución." onClick={() => nav('/herramientas/radier')} />
              <ToolCard icon={<ClipboardList className="h-5 w-5" />} eyebrow="Proyecto" title="Armar presupuesto" text="Agrupa partidas y prepara una referencia completa." onClick={() => nav('/presupuesto')} />
              <ToolCard icon={<Compass className="h-5 w-5" />} eyebrow="Ideas" title="Ver inspiraciones" text="Revisa referencias visuales antes de definir materiales." onClick={() => nav('/proyectos')} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-4 pt-10 sm:px-6 sm:pt-12 lg:px-8">
          <div className="grid gap-3 md:grid-cols-3">
            {STORE_VISUALS.map((item) => (
              <a key={item.label} href="#catalogo" className="group overflow-hidden rounded-[1.55rem] border border-black/[.07] bg-white shadow-[0_12px_36px_rgba(35,24,14,.045)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#151518]"><img src={item.src} alt={`${item.label} · Soluciones Fabrick`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" /></div>
                <div className="p-5"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#9A5B22]">{item.label}</p><p className="mt-2 max-w-sm text-sm font-bold leading-6 text-black/65">{item.text}</p><span className="mt-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.12em] text-black/40 transition group-hover:text-[#9A5B22]">Ver productos <ArrowRight className="h-3.5 w-3.5" /></span></div>
              </a>
            ))}
          </div>

          <div className="mt-10 grid gap-6 border-y border-black/10 py-7 md:grid-cols-3 md:gap-8">
            <StoreFact icon={<ShieldCheck className="h-5 w-5" />} title="Pago protegido" text="Compra dentro del flujo seguro de la tienda." />
            <StoreFact icon={<Truck className="h-5 w-5" />} title="Despacho transparente" text="El costo se informa antes de completar la compra." />
            <StoreFact icon={<Sparkles className="h-5 w-5" />} title="Precio publicado" text="IVA incluido, sin volver a sumarlo en checkout." />
          </div>

          {featured.length ? (
            <section className="pt-14 sm:pt-16">
              <div className="flex flex-col gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Selección Fabrick" title="Una selección breve para empezar." /><p className="max-w-md text-xs leading-6 text-black/42 sm:text-sm">Cuatro productos destacados para no competir con el catálogo completo.</p></div>
              <div className="sf-store-grid mt-7">{featured.map((product) => <ProductTile key={product.id} product={product} added={added === String(product.id)} onOpen={() => open(product)} onAdd={(event) => add(event, product)} />)}</div>
            </section>
          ) : null}

          {promos.length ? (
            <section className="pt-16">
              <div className="flex items-end justify-between gap-5 border-b border-black/10 pb-5"><SectionHeading eyebrow="Oportunidades" title="Descuentos activos." compact /><span className="hidden text-xs text-black/35 sm:block">El descuento ya está aplicado al valor mostrado.</span></div>
              <div className="sf-store-grid mt-7">{promos.slice(0, 4).map((product) => <ProductTile key={product.id} product={product} added={added === String(product.id)} onOpen={() => open(product)} onAdd={(event) => add(event, product)} />)}</div>
            </section>
          ) : null}

          <section id="catalogo" className="scroll-mt-24 pt-18 sm:pt-20">
            <div className="grid gap-5 border-b border-black/10 pb-6 lg:grid-cols-[1fr_auto] lg:items-end"><SectionHeading eyebrow="Catálogo" title="Busca por producto, categoría o uso." /><p className="max-w-md text-sm leading-6 text-black/42">Dos tarjetas por fila en móvil; tres o cuatro en pantallas mayores. Imagen, nombre, precio y stock tienen prioridad.</p></div>

            <div className="sticky top-[68px] z-30 -mx-4 mt-5 border-y border-black/[.08] bg-[#F6F1E8]/96 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <label className="flex min-h-12 items-center gap-3 border-b border-black/15"><Search className="h-4 w-4 text-[#9A5B22]" /><input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, categoría o uso…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-black/28" /><span className="text-[10px] font-black text-black/35">{filtered.length}</span></label>
              <div className="mt-2 flex gap-5 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 border-b-2 py-2 text-[9px] font-black uppercase tracking-[.12em] transition ${category === item ? 'border-[#9A5B22] text-black' : 'border-transparent text-black/38 hover:text-black/65'}`}>{item}</button>)}</div>
            </div>

            {filtered.length ? <div className="sf-store-grid mt-7">{filtered.map((product) => <ProductTile key={product.id} product={product} added={added === String(product.id)} onOpen={() => open(product)} onAdd={(event) => add(event, product)} />)}</div> : <div className="py-24 text-center"><Search className="mx-auto h-8 w-8 text-black/15" /><h3 className="mt-4 text-2xl font-black">No encontramos coincidencias.</h3><button onClick={() => { setQuery(''); setCategory('Todos'); }} className="mt-4 text-xs font-black text-[#9A5B22]">Limpiar búsqueda</button></div>}
          </section>
        </section>
      </main>

      <footer className="bg-[#0E0E10] px-5 pb-32 pt-10 text-white md:pb-10"><div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-4 md:flex-row md:items-center"><StoreFabrickLogo tone="dark" branding={branding} compact /><p className="max-w-md text-sm leading-6 text-white/35">Productos, calculadoras, precio final y compra dentro del mismo ecosistema Soluciones Fabrick.</p></div></footer>
      <StoreBottomNav />
    </div>
  );
}

function StoreStat({ value, label }: { value: string; label: string }) {
  return <div><p className="text-xl font-black tracking-[-.04em] sm:text-2xl">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.1em] text-white/35 sm:text-[9px]">{label}</p></div>;
}

function ToolCard({ icon, eyebrow, title, text, onClick }: { icon: ReactNode; eyebrow: string; title: string; text: string; onClick: () => void }) {
  return <button onClick={onClick} className="group flex min-h-[150px] flex-col rounded-[1.35rem] border border-black/[.07] bg-[#F8F3EB] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_16px_40px_rgba(44,31,18,.07)]"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#111214] text-[#E6B56F]">{icon}</span><p className="mt-4 text-[8px] font-black uppercase tracking-[.15em] text-[#9A5B22]">{eyebrow}</p><h3 className="mt-1 text-base font-black tracking-[-.025em]">{title}</h3><p className="mt-2 text-[11px] leading-5 text-black/45">{text}</p><span className="mt-auto pt-4 text-[9px] font-black uppercase tracking-[.1em] text-black/35 transition group-hover:text-[#9A5B22]">Abrir →</span></button>;
}

function ProductTile({ product, added, onOpen, onAdd }: { product: Product; added: boolean; onOpen: () => void; onAdd: (event: MouseEvent) => void }) {
  const discount = discountOf(product);
  const stock = stockOf(product);
  const price = priceOf(product);
  const originalPrice = Math.round(Number(product.price || 0));
  return (
    <article className="group min-w-0">
      <button onClick={onOpen} className="relative block aspect-[4/3] w-full overflow-hidden rounded-[1.15rem] border border-black/[.055] bg-white text-left sm:rounded-[1.35rem]"><img src={imageOf(product)} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.025] sm:p-5" />{discount > 0 ? <span className="absolute left-2.5 top-2.5 rounded-full bg-[#111214] px-2.5 py-1 text-[8px] font-black text-white sm:left-3 sm:top-3 sm:text-[9px]">-{Math.round(discount)}%</span> : null}{stock === 0 ? <span className="absolute inset-x-0 bottom-0 bg-black/78 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[.14em] text-white">Sin stock</span> : null}</button>
      <div className="pt-3 sm:pt-4"><p className="truncate text-[8px] font-black uppercase tracking-[.12em] text-[#9A5B22] sm:text-[9px]">{categoryOf(product)}</p><button onClick={onOpen} className="sf-product-title mt-1.5 line-clamp-2 min-h-[2.45rem] w-full text-left text-sm font-black leading-[1.15] tracking-[-.025em] sm:min-h-[2.8rem] sm:text-base">{product.name}</button><div className="mt-2.5 flex items-end justify-between gap-2"><div className="min-w-0"><p className="sf-product-price text-base font-black tracking-[-.035em] sm:text-lg">{CLP.format(price)}</p>{discount > 0 && originalPrice > price ? <p className="mt-0.5 text-[9px] text-black/32 line-through sm:text-[10px]">{CLP.format(originalPrice)}</p> : <p className="mt-0.5 text-[9px] text-black/30 sm:text-[10px]">IVA incluido</p>}</div><button onClick={(event) => onAdd(event)} disabled={stock === 0} aria-label={`Agregar ${product.name} al carrito`} className={`sf-product-cart flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition sm:h-11 sm:w-11 ${stock === 0 ? 'cursor-not-allowed bg-black/[.05] text-black/20' : added ? 'bg-[#D77A2D] text-black' : 'bg-[#111214] text-white hover:bg-[#9A5B22]'}`}>{added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}</button></div></div>
    </article>
  );
}

function StoreFact({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="grid grid-cols-[auto_1fr] gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-[#9A5B22]">{icon}</span><div><p className="text-sm font-black tracking-[-.02em]">{title}</p><p className="mt-1 text-xs leading-5 text-black/42">{text}</p></div></div>;
}

function SectionHeading({ eyebrow, title, compact = false }: { eyebrow: string; title: string; compact?: boolean }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9A5B22]">{eyebrow}</p><h2 className={`mt-2 max-w-[15ch] font-black leading-[.98] tracking-[-.05em] ${compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'}`}>{title}</h2></div>;
}