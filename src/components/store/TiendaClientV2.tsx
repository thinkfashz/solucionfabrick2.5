'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Flame, Grid2X2, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { navigateWithTransition } from '@/lib/routeTransition';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { toCartProduct } from '@/components/store/featuredProducts';
import { STORE_VISUALS, resolveStoreProductImage, storeProductImageFallback } from '@/lib/storeProductVisuals';
import StoreCollections from '@/components/store/StoreCollections';
import { StoreToolCanvas } from '@/components/store/StoreToolCanvas';
import { StoreInspirationPreview } from '@/components/store/StoreInspirationPreview';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const AIR_VISUAL = STORE_VISUALS.airCalculatorPng;
const RADIER_VISUAL = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_1100/f_auto/q_auto/v1788934789/radier-cutaway.png';
const CEMENT_VISUAL = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_900/f_auto/q_auto/v1788843289/cemento-melon-25kg-v10.jpg';
type Product = CatalogProduct;

function categoryOf(product: Product) { return product.category_name || product.category || product.category_id || 'Producto'; }
function discountOf(product: Product) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function priceOf(product: Product) { return Math.round(Number(product.price || 0) * (1 - discountOf(product) / 100)); }
function stockOf(product: Product) { return Number.isFinite(Number(product.stock)) ? Number(product.stock) : null; }
function productText(product: Product) { return `${product.name} ${product.description || ''} ${product.tagline || ''} ${categoryOf(product)}`.toLowerCase(); }
function productImage(product?: Product) { return product ? resolveStoreProductImage(product) : STORE_VISUALS.construction; }
function categoryImage(category: string, sample?: Product) {
  const normalized = category.toLowerCase();
  if (/radier|hormig/.test(normalized)) return RADIER_VISUAL;
  if (/climat|aire/.test(normalized)) return AIR_VISUAL;
  if (/cement/.test(normalized)) return CEMENT_VISUAL;
  return productImage(sample);
}
function safeImageFallback(product?: Product) { return storeProductImageFallback(product); }

export default function TiendaClientV2() {
  const router = useRouter();
  const { addToCart } = useCartContext();
  const { products: live, fetchComplete, source, error, reload } = useCatalogProducts();
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const products = useMemo(() => live.length ? live : FALLBACK_CATALOG_PRODUCTS, [live]);
  const categories = useMemo(() => Array.from(new Set(products.map(categoryOf))).filter(Boolean).slice(0, 8), [products]);
  const bestSellers = useMemo(() => [...products].sort((a, b) => {
    const pa = a.placement === 'best_seller' ? 2 : a.featured ? 1 : 0;
    const pb = b.placement === 'best_seller' ? 2 : b.featured ? 1 : 0;
    return pb - pa || Number(b.rating || 0) - Number(a.rating || 0);
  }).slice(0, 8), [products]);
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((product) => productText(product).includes(q)).slice(0, 6);
  }, [products, query]);

  const nav = (href: string) => navigateWithTransition(href, router);
  function add(event: MouseEvent, product: Product) {
    event.stopPropagation();
    if ((stockOf(product) ?? 1) <= 0) return;
    const cartProduct = toCartProduct(product);
    addToCart({ ...cartProduct, image_url: productImage(product) });
    const id = String(product.id);
    setAdded(id);
    window.setTimeout(() => setAdded((current) => current === id ? null : current), 1100);
  }

  return <div className="min-h-screen bg-[#05090C] text-white">
    <StorefrontHeader />
    <input id="catalog-search" tabIndex={-1} aria-hidden="true" value={query} onChange={(event) => setQuery(event.target.value)} className="sr-only" />
    {fetchComplete && source === 'fallback' ? <div className="border-b border-[#F6C64A]/15 bg-[#F6C64A]/[.05] px-4 py-2 text-center text-[10px] text-white/58">{error || 'Mostrando catálogo de respaldo.'} <button onClick={() => void reload()} className="ml-2 font-black text-[#F6C64A]">Reintentar</button></div> : null}

    <main className="pb-28 md:pb-14">
      <section className="relative isolate min-h-[520px] overflow-hidden border-b border-white/[.07] sm:min-h-[640px] lg:min-h-[680px]">
        <img src={STORE_VISUALS.hero} alt="Vivienda construida con estructura metálica al atardecer" className="absolute inset-0 h-full w-full object-cover object-[62%_center] md:object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,10,.18)_0%,rgba(3,7,10,.3)_32%,rgba(3,7,10,.97)_82%)] md:bg-[linear-gradient(92deg,rgba(3,7,10,.98)_0%,rgba(3,7,10,.9)_38%,rgba(3,7,10,.22)_72%,rgba(3,7,10,.4)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[520px] max-w-[1380px] flex-col justify-end px-4 pb-7 pt-20 sm:min-h-[640px] sm:px-8 sm:pb-12 lg:min-h-[680px] lg:px-10">
          <div className="max-w-[780px] rounded-[1.6rem] border border-white/10 bg-black/28 p-4 shadow-2xl backdrop-blur-[3px] md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none"><p className="text-[9px] font-black uppercase tracking-[.24em] text-[#F6C64A]">Más que productos · soluciones para tu proyecto</p><h1 className="mt-3 text-[clamp(2.7rem,12vw,4.5rem)] font-black leading-[.9] tracking-[-.06em] md:mt-4 md:text-[clamp(3.6rem,6.4vw,6rem)]">Construye con <span className="text-[#F6C64A]">más claridad.</span></h1><p className="mt-4 max-w-2xl text-[13px] leading-5 text-white/78 md:mt-5 md:text-base md:leading-7">Calcula lo que necesitas, compara alternativas y encuentra materiales o climatización conectados al mismo catálogo.</p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5 md:mt-7">
              <button onClick={() => nav('#calculadoras')} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F6C64A] px-6 text-xs font-black text-black transition-colors duration-200 hover:bg-white">Calcular mi proyecto <ArrowRight size={16}/></button>
              <button onClick={() => nav('/tienda/catalogo')} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/22 px-6 text-xs font-black text-white transition-colors duration-200 hover:border-[#F6C64A]/60 hover:text-[#F6C64A]">Explorar catálogo</button>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/12 pt-5 sm:gap-x-8"><HeroBenefit icon={<Truck/>} title="Despacho" text="a todo Chile"/><HeroBenefit icon={<ShieldCheck/>} title="Compra" text="protegida"/><HeroBenefit icon={<ShoppingCart/>} title="Catálogo" text={`${products.length} productos`}/></div>
        </div>
      </section>

      <StoreCollections />

      <section id="calculadoras" className="mx-auto max-w-[1540px] scroll-mt-24 px-3 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Calculadoras · guías de compra</p><h2 className="mt-1 text-3xl font-black tracking-[-.05em] sm:text-5xl">Calcula antes de comprar.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/46">Tres calculadoras que te devuelven medidas, cantidades y un rango de costo con tus propios números. El que calcula primero, compra una sola vez.</p></div><button onClick={() => nav('/tienda/catalogo')} className="inline-flex items-center gap-2 self-start text-xs font-black text-[#F6C64A]">Ver todos los productos <ArrowRight size={15}/></button></div>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[{n:'01',t:'Elige tu recorrido',d:'Construcción, climatización, estructura o inspiración. Cada uno resuelve una decisión distinta.'},{n:'02',t:'Calcula con tus medidas',d:'La herramienta te devuelve cantidades, capas y un rango de costo referencial.'},{n:'03',t:'Compra lo que calculaste',d:'Solo lo necesario, sin pagar de más ni comprar dos veces.'}].map((s)=>(
            <div key={s.n} className="flex gap-3 rounded-[1.25rem] border border-white/10 bg-white/[.025] p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-[11px] font-black tabular-nums text-black">{s.n}</span>
              <span><b className="block text-xs font-black text-white/88">{s.t}</b><small className="mt-1 block text-[11px] leading-5 text-white/46">{s.d}</small></span>
            </div>
          ))}
        </div>
        <ol className="grid gap-4 xl:grid-cols-2">
          <li><ToolShowcase step="Paso 01" kind="radier" eyebrow="Construcción" title="Calcula tu radier ideal" text="Ingresa largo, ancho y espesor. Revisa capas, materiales, mano de obra y referencias de costo antes de cotizar." bullets={['Hormigón, malla y áridos', 'Estacas de 43 cm y moldaje', 'Solo mano de obra o con materiales']} cta="Calcular radier" onClick={() => nav('/herramientas/radier')} /></li>
          <li><ToolShowcase step="Paso 02" kind="air" eyebrow="Climatización" title="Calcula tu aire ideal" text="Define el espacio, conoce los BTU sugeridos, consumo estimado y equipos compatibles disponibles en catálogo." bullets={['BTU según tu espacio', 'Consumo y costo estimado', 'Ahorro, recomendado y premium']} cta="Calcular mi aire" onClick={() => nav('/herramientas/aire-acondicionado')} /></li>
          <li><ToolShowcase step="Paso 03" kind="metalcon" eyebrow="Estructuras" title="Diseña tu panel Metalcon" text="Visualiza un muro completo, modula montantes y revisa el refuerzo de puertas, ventanas y planchas OSB." bullets={['Montantes cada 40 o 60 cm', 'OSB de 120 o 122 cm', 'Refuerzos dobles en aberturas']} cta="Abrir simulador Metalcon" onClick={() => nav('/herramientas/metalcon')} /></li>
          <li><ToolShowcase step="Paso 04" kind="inspiration" eyebrow="Inspiración" title="Descubre tu próximo espacio" text="Mira referencias que ya viven dentro de nuestros álbumes: ambientes, fachadas, terminaciones y detalles reales de la biblioteca visual." bullets={['Imágenes tomadas desde álbumes publicados', 'Ideas agrupadas por espacio y estilo', 'Abre el álbum y cotiza desde la referencia']} cta="Explorar inspiración" onClick={() => nav('/proyectos')} /></li>
        </ol>
      </section>

      <section className="mx-auto max-w-[1380px] px-3 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Por ambiente y oficio</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Explora por categoría.</h2></div><button onClick={()=>nav('/tienda/catalogo')} className="inline-flex items-center gap-1.5 self-start text-[10px] font-black text-[#F6C64A]">Ver todas <ArrowRight size={13}/></button></div>
        <div className="mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none]">
          {categories.map((category, index) => { const sample = products.find((p)=>categoryOf(p)===category); const count = products.filter((p)=>categoryOf(p)===category).length; return <button key={category} onClick={()=>nav(`/tienda/catalogo?categoria=${encodeURIComponent(category)}`)} className="group relative h-40 w-[72vw] max-w-[250px] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0B1115] text-left transition-colors duration-200 hover:border-[#F6C64A]/40 sm:w-56 sm:max-w-none sm:flex-1"><img src={categoryImage(category,sample)} alt="" loading="lazy" onError={(event)=>{event.currentTarget.src=safeImageFallback(sample)}} className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-75"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"/><span className={`absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg ${index===0?'bg-[#F6C64A] text-black':'bg-black/55 text-white backdrop-blur'}`}><Grid2X2 size={15}/></span><span className="absolute bottom-3 left-3 right-3"><b className="block text-sm font-black tracking-[-.01em]">{category}</b><small className="mt-0.5 block text-[10px] font-bold text-white/55">{count} producto{count===1?'':'s'}</small></span></button>; })}
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-3 py-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]"><Flame size={14}/> Listos para comprar · entrega inmediata</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Los que más se venden.</h2><p className="mt-2 max-w-xl text-xs leading-5 text-white/46">Precio final publicado. Si el producto tiene descuento, verás el precio anterior tachado al lado.</p></div><button onClick={()=>nav('/tienda/catalogo')} className="hidden items-center gap-2 text-[10px] font-black text-[#F6C64A] sm:inline-flex">Ver todos <ArrowRight size={14}/></button></div>
        {query ? <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-[#0A0F13] p-2">{searchResults.length ? searchResults.map((product)=><button key={product.id} onClick={()=>nav(`/tienda/${product.id}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[.04]"><img src={productImage(product)} alt="" onError={(event)=>{event.currentTarget.src=safeImageFallback(product)}} className="h-12 w-14 rounded-lg bg-[#10171C] object-contain p-1"/><span className="min-w-0 flex-1"><b className="line-clamp-1 text-xs">{product.name}</b><small className="mt-1 block text-[9px] text-white/35">{categoryOf(product)}</small></span><b className="text-xs text-[#F6C64A]">{CLP.format(priceOf(product))}</b></button>) : <p className="p-4 text-xs text-white/38">No encontramos coincidencias.</p>}</div> : null}
        <p className="mt-5 text-[9px] font-bold uppercase tracking-[.14em] text-white/28 sm:hidden">Desliza para ver más productos</p>
        <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4 xl:grid-cols-5">{bestSellers.map((product, index)=><ProductCard key={product.id} product={product} badge={index===0?'Más vendido':index===1?'Recomendado':undefined} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div>
        <button onClick={()=>nav('/tienda/catalogo')} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#F6C64A]/30 bg-[#F6C64A]/[.06] px-6 text-xs font-black text-[#F6C64A] sm:hidden">Explorar catálogo completo <ArrowRight size={16}/></button>
      </section>
    </main>
    <StoreBottomNav />
  </div>;
}

function HeroBenefit({icon,title,text}:{icon:ReactNode;title:string;text:string}) { return <div className="flex items-center gap-2.5"><span className="text-[#F6C64A] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span><b className="block text-[10px] leading-4">{title}</b><small className="block text-[8px] text-white/38">{text}</small></span></div>; }

/** Tarjeta de recorrido guiado. La media va arriba y el CTA queda anclado al pie
    para que las cuatro se lean como pasos comparables y no como bloques sueltos. */
function ToolShowcase({step,kind,eyebrow,title,text,bullets,cta,onClick}:{step:string;kind:'air'|'radier'|'metalcon'|'inspiration';eyebrow:string;title:string;text:string;bullets:string[];cta:string;onClick:()=>void}) {
  return <article className="group flex flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0A0F13] transition-colors duration-200 hover:border-[#F6C64A]/40">
    <div className="relative aspect-[1.9/1] min-h-[210px] overflow-hidden border-b border-white/[.07] bg-[#05090c]">
      {kind==='inspiration'?<StoreInspirationPreview/>:<StoreToolCanvas kind={kind}/>}
      <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/72 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-[#F6C64A] backdrop-blur">{step}</span>
    </div>
    <div className="flex flex-1 flex-col p-5 sm:p-6">
      <span className="text-[9px] font-black uppercase tracking-[.18em] text-white/38">{eyebrow}</span>
      <h3 className="mt-2 text-[1.75rem] font-black leading-[.95] tracking-[-.05em] sm:text-[2rem]">{title}</h3>
      <p className="mt-3 text-xs leading-5 text-white/52 sm:text-sm sm:leading-6">{text}</p>
      <ul className="mt-4 space-y-2">{bullets.map((item)=><li key={item} className="flex items-start gap-2 text-[11px] leading-5 text-white/66"><Check size={13} className="mt-0.5 shrink-0 text-[#F6C64A]"/>{item}</li>)}</ul>
      <button onClick={onClick} className="mt-auto flex min-h-13 w-full items-center justify-center gap-3 rounded-full bg-[#F6C64A] px-4 pt-3.5 pb-3.5 text-xs font-black text-black transition-colors duration-200 hover:bg-white">{cta}<ArrowRight size={16}/></button>
    </div>
  </article>;
}

function ProductCard({product,badge,added,onOpen,onAdd}:{product:Product;badge?:string;added:boolean;onOpen:()=>void;onAdd:(event:MouseEvent)=>void}) {
  const price=priceOf(product); const stock=stockOf(product);
  const discount=discountOf(product); const base=Math.round(Number(product.price||0));
  return <article className="group w-[82vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0A0F13] transition hover:border-[#F6C64A]/35 sm:w-auto sm:max-w-none">
    <button onClick={onOpen} className="relative block aspect-[16/11] w-full overflow-hidden bg-[#0E1418] p-3"><img src={productImage(product)} alt={product.name} loading="lazy" onError={(event)=>{event.currentTarget.src=safeImageFallback(product)}} className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.035]"/>{badge?<span className="absolute left-2 top-2 rounded-full bg-[#F6C64A] px-2 py-1 text-[8px] font-black uppercase text-black">{badge}</span>:null}{discount>0?<span className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-1 text-[9px] font-black text-[#F6C64A] backdrop-blur">{discount}% OFF</span>:null}</button>
    <div className="p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-white/38">{categoryOf(product)}</p><button onClick={onOpen} className="mt-1 line-clamp-2 min-h-[2.35rem] text-left text-xs font-black leading-[1.15]">{product.name}</button><p className="mt-1 line-clamp-2 min-h-[2rem] text-[9px] leading-4 text-white/34">{product.tagline || product.description || 'Solución para tu proyecto.'}</p><div className="mt-3 flex items-end justify-between gap-2"><div><span className="flex flex-wrap items-baseline gap-1.5"><b className="text-lg tracking-[-.04em]">{CLP.format(price)}</b>{discount>0?<s className="text-[10px] font-bold text-white/32">{CLP.format(base)}</s>:null}</span><small className={`mt-1 block text-[8px] ${stock===0?'text-red-400':'text-emerald-400'}`}>{stock===0?'Sin stock':stock==null?'Stock por confirmar':`${stock} disponibles`}</small></div><button onClick={onAdd} disabled={stock===0} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${added?'bg-emerald-400':'bg-[#F6C64A]'} text-black disabled:opacity-30`} aria-label="Agregar al carrito">{added?<Check size={17}/>:<ShoppingCart size={17}/>}</button></div></div>
  </article>;
}
