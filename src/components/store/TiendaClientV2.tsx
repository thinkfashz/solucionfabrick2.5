'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgePercent, Check, RefreshCw, Search, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Truck } from 'lucide-react';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useCartContext } from '@/context/CartContext';
import { navigateWithTransition } from '@/lib/routeTransition';
import { StoreBottomNav, StoreFabrickLogo, StorefrontHeader } from '@/components/store/StorefrontChrome';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
type Product = CatalogProduct;
const FALLBACK = '/images/landing/fabrick-home-showcase.webp';

function imageOf(product: Product) { return product.img || product.image_url || FALLBACK; }
function categoryOf(product: Product) { return product.category_name || product.category || product.category_id || 'Producto'; }
function discountOf(product: Product) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function priceOf(product: Product) { return Math.round(Number(product.price || 0) * (1 - discountOf(product) / 100)); }
function stockOf(product: Product) { return Number.isFinite(Number(product.stock)) ? Number(product.stock) : null; }
function asCart(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: imageOf(product),
    category_id: categoryOf(product),
    discount_percentage: discountOf(product),
    stock: product.stock,
    description: product.description,
    tagline: product.tagline,
  };
}

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

  function open(product: Product) {
    navigateWithTransition(`/tienda/${product.id}`, router);
  }

  function add(event: MouseEvent, product: Product) {
    event.stopPropagation();
    if ((stockOf(product) ?? 1) <= 0) return;
    addToCart(asCart(product) as Parameters<typeof addToCart>[0]);
    setAdded(product.id);
    window.setTimeout(() => setAdded((current) => current === product.id ? null : current), 1200);
  }

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-[#111214]">
      <style>{`
        .sf-store-grid {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          column-gap: .75rem;
          row-gap: 2rem;
          width: 100%;
        }
        .sf-store-grid > * { min-width: 0; max-width: none !important; }
        @media (min-width: 640px) {
          .sf-store-grid { column-gap: 1.25rem; row-gap: 2.4rem; }
        }
        @media (min-width: 900px) {
          .sf-store-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 1280px) {
          .sf-store-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 639px) {
          .sf-store-grid .sf-product-title { font-size: .82rem; line-height: 1.08; min-height: 2.65rem; }
          .sf-store-grid .sf-product-price { font-size: 1rem; }
          .sf-store-grid .sf-product-cart { width: 2.35rem; height: 2.35rem; }
        }
      `}</style>

      <StorefrontHeader onSearch={() => document.getElementById('catalog-search')?.focus()} />

      {fetchComplete && source === 'fallback' ? (
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-3 border-b border-amber-300/50 bg-amber-100/70 px-4 py-3 text-xs sm:px-6 lg:px-8">
          <span>{error || 'Catálogo temporal cargado.'}</span>
          <button onClick={() => void reload()} className="inline-flex items-center gap-2 font-black text-black">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reintentar
          </button>
        </div>
      ) : null}

      <main className="pb-32 md:pb-16">
        <section className="relative overflow-hidden bg-[#101112] text-white">
          <img src={FALLBACK} alt="Hogar moderno equipado" className="absolute inset-0 h-full w-full object-cover object-center opacity-78" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,17,18,.98)_0%,rgba(16,17,18,.86)_42%,rgba(16,17,18,.25)_72%,rgba(16,17,18,.1)_100%)]" />
          <div className="relative mx-auto grid min-h-[520px] max-w-[1380px] items-end gap-8 px-4 py-12 sm:px-6 md:min-h-[600px] md:items-center lg:grid-cols-[1fr_.7fr] lg:px-8">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-3 text-[9px] font-black uppercase tracking-[.16em]">
                <span className="bg-[#FFB000] px-3 py-1.5 text-black">Compra inteligente</span>
                <span className="border border-white/18 px-3 py-1.5 text-white/68">IVA incluido</span>
              </div>
              <h1 className="mt-5 max-w-[10ch] text-[clamp(3.2rem,8vw,7rem)] font-black leading-[.84] tracking-[-.075em]">Compra mejor para tu hogar.</h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/56 sm:text-base sm:leading-8">Catálogo claro, precios finales sin IVA duplicado, despacho visible y pago protegido.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#catalogo" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#FFB000] px-5 text-xs font-black text-black">Ver catálogo <ArrowRight className="h-4 w-4" /></a>
                <button onClick={openCart} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-xs font-black text-white"><ShoppingBag className="h-4 w-4" /> Carrito</button>
              </div>
            </div>

            <div className="justify-self-start border-l border-[#FFB000]/45 pl-5 lg:justify-self-end lg:pl-7">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Promoción hogar</p>
              <p className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-5xl">{maxDiscount > 0 ? `Hasta ${maxDiscount}% OFF` : 'Selección especial'}</p>
              <p className="mt-2 max-w-sm text-xs leading-6 text-white/48">Descuentos reales aplicados sobre productos del catálogo antes de pagar.</p>
              <div className="mt-5 flex gap-5 text-[10px] font-black uppercase tracking-[.12em] text-white/50">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#FFB000]" /> Pago protegido</span>
                <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-[#FFB000]" /> Despacho claro</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1380px] px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 border-b border-black/10 pb-9 md:grid-cols-3">
            <StoreFact icon={<BadgePercent className="h-5 w-5" />} title="Promociones activas" text={`${promos.length} productos con descuento`} />
            <StoreFact icon={<Truck className="h-5 w-5" />} title="Despacho transparente" text="Costo informado antes de pagar" />
            <StoreFact icon={<Sparkles className="h-5 w-5" />} title="Precio final" text="IVA incluido en el valor publicado" />
          </div>

          {featured.length ? (
            <section className="pt-12">
              <SectionHeading eyebrow="Selección Fabrick" title="Empieza por aquí." />
              <div className="sf-store-grid mt-6">
                {featured.map((product) => (
                  <ProductTile key={product.id} product={product} added={added === product.id} onOpen={() => open(product)} onAdd={(event) => add(event, product)} />
                ))}
              </div>
            </section>
          ) : null}

          {promos.length ? (
            <section className="pt-14">
              <div className="flex items-end justify-between gap-5 border-b border-black/10 pb-4">
                <SectionHeading eyebrow="Promociones" title="Ofertas sin letra pequeña." compact />
                <span className="hidden text-xs text-black/35 sm:block">Compara productos lado a lado</span>
              </div>
              <div className="sf-store-grid mt-5">
                {promos.slice(0, 8).map((product) => (
                  <ProductTile key={product.id} product={product} added={added === product.id} onOpen={() => open(product)} onAdd={(event) => add(event, product)} />
                ))}
              </div>
            </section>
          ) : null}

          <section id="catalogo" className="scroll-mt-24 pt-16">
            <div className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading eyebrow="Catálogo completo" title="Encuentra lo que necesitas." />
              <p className="max-w-md text-sm leading-6 text-black/42">Dos productos por fila en móvil para comparar imagen, nombre y precio mientras bajas por el catálogo.</p>
            </div>

            <div className="sticky top-[68px] z-30 -mx-4 mt-5 border-y border-black/8 bg-[#F4EFE6]/96 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <label className="flex min-h-12 items-center gap-3 border-b border-black/15">
                <Search className="h-4 w-4 text-[#F5871F]" />
                <input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, categoría o uso…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-black/28" />
                <span className="text-[10px] font-black text-black/35">{filtered.length}</span>
              </label>
              <div className="mt-2 flex gap-4 overflow-x-auto pb-1">
                {categories.map((item) => (
                  <button key={item} onClick={() => setCategory(item)} className={`shrink-0 border-b-2 py-2 text-[10px] font-black uppercase tracking-[.12em] transition ${category === item ? 'border-black text-black' : 'border-transparent text-black/38'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length ? (
              <div className="sf-store-grid mt-6">
                {filtered.map((product) => (
                  <ProductTile key={product.id} product={product} added={added === product.id} onOpen={() => open(product)} onAdd={(event) => add(event, product)} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center">
                <Search className="mx-auto h-8 w-8 text-black/15" />
                <h3 className="mt-4 text-2xl font-black">No encontramos coincidencias.</h3>
                <button onClick={() => { setQuery(''); setCategory('Todos'); }} className="mt-4 text-xs font-black text-[#B96F00]">Limpiar búsqueda</button>
              </div>
            )}
          </section>
        </section>
      </main>

      <footer className="bg-[#111214] px-5 pb-32 pt-9 text-white md:pb-9">
        <div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-4 md:flex-row md:items-center">
          <StoreFabrickLogo tone="dark" branding={branding} compact />
          <p className="max-w-md text-sm text-white/35">Compra con precio claro, IVA incluido y seguimiento de pago.</p>
        </div>
      </footer>
      <StoreBottomNav />
    </div>
  );
}

function ProductTile({ product, added, onOpen, onAdd }: { product: Product; added: boolean; onOpen: () => void; onAdd: (event: MouseEvent) => void }) {
  const discount = discountOf(product);
  const stock = stockOf(product);
  const price = priceOf(product);

  return (
    <article className="group min-w-0 overflow-hidden">
      <button onClick={onOpen} className="relative block aspect-square w-full overflow-hidden rounded-[1rem] bg-white text-left sm:rounded-[1.15rem]">
        <img src={imageOf(product)} alt={product.name} className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.025]" />
        {discount > 0 ? <span className="absolute left-2 top-2 rounded-md bg-[#F5871F] px-2 py-1 text-[8px] font-black text-black sm:left-3 sm:top-3 sm:px-3 sm:text-[9px]">-{discount}%</span> : null}
        {stock === 0 ? <span className="absolute inset-x-0 bottom-0 bg-black/75 px-3 py-2 text-center text-[9px] font-black uppercase tracking-[.16em] text-white">Sin stock</span> : null}
      </button>

      <div className="pt-3 sm:pt-4">
        <p className="truncate text-[8px] font-black uppercase tracking-[.12em] text-[#B96F00] sm:text-[9px]">{categoryOf(product)}</p>
        <button onClick={onOpen} className="sf-product-title mt-1 line-clamp-2 min-h-[2.5rem] w-full text-left text-sm font-black leading-[1.05] sm:min-h-[3rem] sm:text-lg">{product.name}</button>
        <p className="mt-2 line-clamp-2 hidden text-xs leading-5 text-black/40 sm:block">{product.tagline || product.description || 'Producto seleccionado para tu proyecto.'}</p>

        <div className="mt-3 flex items-end justify-between gap-2 border-t border-black/8 pt-3">
          <div className="min-w-0">
            <b className="sf-product-price block truncate text-base tracking-[-.04em] sm:text-2xl">{CLP.format(price)}</b>
            {discount > 0 ? <span className="block text-[9px] text-black/28 line-through sm:text-[10px]">{CLP.format(product.price)}</span> : <span className="block text-[8px] font-black uppercase tracking-[.08em] text-emerald-700 sm:text-[9px]">IVA incluido</span>}
          </div>
          <button disabled={stock === 0} onClick={onAdd} aria-label={`Añadir ${product.name} al carrito`} className={`sf-product-cart grid h-10 w-10 shrink-0 place-items-center rounded-full transition sm:h-11 sm:w-11 ${added ? 'bg-emerald-300 text-black' : 'bg-black text-white'} disabled:opacity-25`}>
            {added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </article>
  );
}

function StoreFact({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-[#B96F00]">{icon}</span>
      <div><p className="text-xs font-black">{title}</p><p className="mt-1 text-xs leading-5 text-black/42">{text}</p></div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, compact = false }: { eyebrow: string; title: string; compact?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#B96F00]">{eyebrow}</p>
      <h2 className={`mt-2 max-w-[15ch] font-black leading-[.92] tracking-[-.055em] ${compact ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'}`}>{title}</h2>
    </div>
  );
}