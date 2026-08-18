'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgePercent, Check, RefreshCw, Search, ShoppingCart, Star } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useCartContext } from '@/context/CartContext';
import UiverseSearchModal from '@/components/UiverseSearchModal';
import { StoreBottomNav, StoreFabrickLogo, StorefrontHeader } from '@/components/store/StorefrontChrome';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

type StoreProduct = CatalogProduct;

function getImage(product: StoreProduct) {
  return product.img || product.image_url || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200&auto=format&fit=crop';
}
function getCategory(product: StoreProduct) {
  return product.category_name || product.category || product.category_id || 'Producto';
}
function getDiscount(product: StoreProduct) {
  return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0));
}
function finalPrice(product: StoreProduct) {
  return Math.round(Number(product.price || 0) * (1 - getDiscount(product) / 100));
}
function placement(product: StoreProduct) {
  return product.placement || (product.featured ? 'featured' : 'catalog');
}
function placementOrder(product: StoreProduct) {
  return Number.isFinite(Number(product.placementOrder)) ? Number(product.placementOrder) : 999;
}
function stock(product: StoreProduct) {
  return Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
}
function asCartProduct(product: StoreProduct) {
  return { id: product.id, name: product.name, price: product.price, image_url: getImage(product), category_id: getCategory(product), discount_percentage: getDiscount(product), stock: product.stock, description: product.description, tagline: product.tagline };
}

export default function TiendaClientV2() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { products: liveProducts, loading, fetchComplete, source, error, reload } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [addedId, setAddedId] = useState<string | null>(null);

  const products = useMemo<StoreProduct[]>(() => liveProducts.length ? liveProducts : FALLBACK_CATALOG_PRODUCTS, [liveProducts]);
  const ordered = useMemo(() => [...products].sort((a, b) => placementOrder(a) - placementOrder(b)), [products]);
  const featured = ordered.filter((product) => placement(product) === 'featured').slice(0, 4);
  const bestSellers = ordered.filter((product) => placement(product) === 'best_seller').slice(0, 4);
  const promotions = ordered.filter((product) => placement(product) === 'promotion' || getDiscount(product) > 0).slice(0, 6);
  const hero = featured[0] || bestSellers[0] || ordered[0];
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(getCategory))).filter(Boolean).slice(0, 10)], [products]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ordered.filter((product) => {
      const haystack = `${product.name} ${product.description || ''} ${product.tagline || ''} ${getCategory(product)}`.toLowerCase();
      return (category === 'Todos' || getCategory(product) === category) && (!normalized || haystack.includes(normalized));
    });
  }, [category, ordered, query]);

  function openProduct(product: StoreProduct) {
    navigateWithTransition(`/tienda/${product.id}`, router);
  }
  function addProduct(event: MouseEvent, product: StoreProduct) {
    event.stopPropagation();
    if ((stock(product) ?? 1) <= 0) return;
    addToCart(asCartProduct(product) as Parameters<typeof addToCart>[0]);
    setAddedId(product.id);
    window.setTimeout(() => setAddedId((current) => current === product.id ? null : current), 1400);
  }

  return (
    <div className="min-h-screen bg-[#FFF9EE] text-[#08090A]">
      <StorefrontHeader onSearch={() => setSearchOpen(true)} />

      {fetchComplete && source === 'fallback' ? <div className="mx-auto mt-3 flex max-w-7xl items-center justify-between gap-3 rounded-2xl bg-[#F2DFBB] px-4 py-3 text-xs"><span>{error || 'Mostramos un catálogo de respaldo.'}</span><button onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-full bg-[#08090A] px-4 py-2 font-black text-white"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Reintentar</button></div> : null}

      <main className="mx-auto max-w-7xl px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8">
        {hero ? <section className="grid overflow-hidden rounded-[2rem] bg-[#08090A] text-[#FFF9EE] shadow-[0_26px_80px_rgba(23,24,32,.18)] lg:grid-cols-[.85fr_1.15fr]">
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#FFB000]">Tienda Soluciones Fabrick</p>
            <h1 className="mt-4 max-w-[10ch] text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-6xl">Productos claros para mejorar tu espacio.</h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/60">Destacados, promociones y catálogo completo sin repetir bloques innecesarios.</p>
            <div className="mt-6 flex flex-wrap gap-3"><button onClick={() => setSearchOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F5871F] px-5 text-sm font-black text-[#08090A]"><Search className="h-4 w-4" /> Buscar</button><a href="#catalogo" className="inline-flex min-h-11 items-center rounded-full bg-white/8 px-5 text-sm font-black">Ver catálogo</a></div>
          </div>
          <button type="button" onClick={() => openProduct(hero)} className="relative min-h-[340px] overflow-hidden text-left lg:min-h-[460px]">
            <img src={getImage(hero)} alt={hero.name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08090A]/90 via-transparent to-transparent" />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-[#FFF9EE]/95 p-5 text-[#08090A] backdrop-blur"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#F5871F]">Producto destacado</p><h2 className="mt-2 text-2xl font-black">{hero.name}</h2><div className="mt-3 flex items-center justify-between"><b className="text-xl">{CLP.format(finalPrice(hero))}</b><ArrowRight className="h-5 w-5" /></div></div>
          </button>
        </section> : null}

        {bestSellers.length ? <ProductSection title="Más vendidos" description="Los productos que decidiste priorizar en el administrador." products={bestSellers} addedId={addedId} onOpen={openProduct} onAdd={addProduct} /> : null}
        {featured.length ? <ProductSection title="Destacados" description="Una selección breve para orientar la compra." products={featured} addedId={addedId} onOpen={openProduct} onAdd={addProduct} /> : null}
        {promotions.length ? <ProductSection title="Promociones" description="Descuentos visibles con precio normal y precio final." products={promotions} addedId={addedId} onOpen={openProduct} onAdd={addProduct} /> : null}

        <section id="catalogo" className="scroll-mt-24 pt-14">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F5871F]">Catálogo completo</p><h2 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Todo en una sola cuadrícula.</h2></div><p className="max-w-xl text-sm leading-7 text-[#BFB8AC]">Busca y filtra sin recorrer banners adicionales.</p></div>
          <div className="sticky top-[68px] z-20 mt-6 rounded-[1.4rem] bg-[#FFF9EE]/95 p-3 shadow-[0_12px_35px_rgba(23,24,32,.08)] backdrop-blur-xl">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3"><Search className="h-4 w-4 text-[#F5871F]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black ${category === item ? 'bg-[#08090A] text-white' : 'bg-white text-[#BFB8AC]'}`}>{item}</button>)}</div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((product) => <ProductCard key={product.id} product={product} added={addedId === product.id} onOpen={() => openProduct(product)} onAdd={(event) => addProduct(event, product)} />)}</div>
        </section>
      </main>

      <footer className="bg-[#08090A] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-8 text-[#FFF9EE] md:px-8 md:py-8"><div className="mx-auto max-w-7xl"><StoreFabrickLogo tone="dark" branding={branding} compact /><p className="mt-3 text-sm text-white/50">Productos útiles, precios claros y compra acompañada.</p></div></footer>
      <StoreBottomNav />
      <UiverseSearchModal open={searchOpen} value={query} onChange={setQuery} onClose={() => setSearchOpen(false)} onFilterClick={() => setSearchOpen(false)} resultCount={query.trim() ? filtered.length : undefined} />
    </div>
  );
}

function ProductSection({ title, description, products, addedId, onOpen, onAdd }: { title: string; description: string; products: StoreProduct[]; addedId: string | null; onOpen: (product: StoreProduct) => void; onAdd: (event: MouseEvent, product: StoreProduct) => void }) {
  return <section className="pt-12"><div className="mb-5"><h2 className="text-3xl font-black tracking-[-.04em]">{title}</h2><p className="mt-2 text-sm text-[#BFB8AC]">{description}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} added={addedId === product.id} onOpen={() => onOpen(product)} onAdd={(event) => onAdd(event, product)} />)}</div></section>;
}

function ProductCard({ product, added, onOpen, onAdd }: { product: StoreProduct; added: boolean; onOpen: () => void; onAdd: (event: MouseEvent) => void }) {
  const discount = getDiscount(product);
  const rating = Math.max(0, Math.min(5, Number(product.rating || 0)));
  return <article className="overflow-hidden rounded-[1.6rem] bg-white shadow-[0_16px_45px_rgba(23,24,32,.08)]">
    <button onClick={onOpen} className="relative block h-56 w-full overflow-hidden bg-[#F2DFBB] text-left"><img src={getImage(product)} alt={product.name} className="h-full w-full object-cover" />{discount > 0 ? <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#F5871F] px-3 py-1.5 text-[9px] font-black"><BadgePercent className="h-3 w-3" />-{discount}%</span> : null}</button>
    <div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F5871F]">{getCategory(product)}</p><button onClick={onOpen} className="mt-2 line-clamp-2 min-h-[2.7rem] text-left text-lg font-black leading-tight">{product.name}</button><div className="mt-2 flex items-center gap-1">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < Math.round(rating) ? 'fill-[#F5871F] text-[#F5871F]' : 'text-[#08090A]/15'}`} />)}<span className="ml-1 text-[10px] text-[#BFB8AC]">{rating || '—'}</span></div><p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-[#BFB8AC]">{product.tagline || product.description}</p><div className="mt-4 flex items-end justify-between gap-3"><div><b className="block text-xl">{CLP.format(finalPrice(product))}</b>{discount > 0 ? <span className="text-[10px] text-[#9B8E84] line-through">{CLP.format(product.price)}</span> : null}</div><button onClick={onAdd} className={`grid h-11 w-11 place-items-center rounded-full ${added ? 'bg-emerald-300' : 'bg-[#08090A] text-white'}`}>{added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-4 w-4" />}</button></div></div>
  </article>;
}
