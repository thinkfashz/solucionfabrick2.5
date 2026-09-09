'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calculator, Check, Flame, Grid2X2, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { navigateWithTransition } from '@/lib/routeTransition';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { toCartProduct } from '@/components/store/featuredProducts';
import { STORE_VISUALS, resolveStoreProductImage, storeProductImageFallback } from '@/lib/storeProductVisuals';
import { StoreToolCanvas } from '@/components/store/StoreToolCanvas';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const YELLOW = '#F6C64A';
const AIR_VISUAL = STORE_VISUALS.airCalculatorPng;
const RADIER_VISUAL = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_1100/f_auto/q_auto/v1788934789/radier-cutaway.png';
const CEMENT_VISUAL = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_900/f_auto/q_auto/v1788843289/cemento-melon-25kg-v10.jpg';
type Product = CatalogProduct;

function categoryOf(product: Product) { return product.category_name || product.category || product.category_id || 'Producto'; }
function discountOf(product: Product) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function priceOf(product: Product) { return Math.round(Number(product.price || 0) * (1 - discountOf(product) / 100)); }
function stockOf(product: Product) { return Number.isFinite(Number(product.stock)) ? Number(product.stock) : null; }
function productText(product: Product) { return `${product.name} ${product.description || ''} ${product.tagline || ''} ${categoryOf(product)}`.toLowerCase(); }
function productImage(product?: Product) {
  return product ? resolveStoreProductImage(product) : STORE_VISUALS.construction;
}
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
    <input id="catalog-search" tabIndex={-1} aria-hidden="true" value={query} onChange={(event)=>setQuery(event.target.value)} className="sr-only" />
    {fetchComplete && source === 'fallback' ? <div className="border-b border-[#F6C64A]/15 bg-[#F6C64A]/[.05] px-4 py-2 text-center text-[10px] text-white/58">{error || 'Mostrando catálogo de respaldo.'} <button onClick={() => void reload()} className="ml-2 font-black text-[#F6C64A]">Reintentar</button></div> : null}

    <main className="pb-28 md:pb-14">
      <section className="relative isolate min-h-[500px] overflow-hidden border-b border-white/[.07] sm:min-h-[620px] lg:min-h-[650px]">
        <img src={STORE_VISUALS.hero} alt="Construcción residencial contemporánea" className="absolute inset-0 h-full w-full object-cover object-[58%_center] md:object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,10,.04)_0%,rgba(3,7,10,.12)_35%,rgba(3,7,10,.96)_78%)] md:bg-[linear-gradient(90deg,rgba(3,7,10,.97)_0%,rgba(3,7,10,.78)_42%,rgba(3,7,10,.08)_78%)]" />
        <div className="relative z-10 mx-auto flex min-h-[500px] max-w-[1380px] flex-col justify-end px-4 pb-7 pt-20 sm:min-h-[620px] sm:px-8 sm:pb-12 lg:min-h-[650px] lg:px-10">
          <div className="max-w-[760px] rounded-[1.6rem] border border-white/10 bg-black/28 p-4 shadow-2xl backdrop-blur-[3px] md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none"><p className="text-[9px] font-black uppercase tracking-[.24em] text-[#F6C64A]">Más que productos · soluciones para tu proyecto</p><h1 className="mt-3 text-[clamp(2.7rem,12vw,4.5rem)] font-black leading-[.88] tracking-[-.065em] md:mt-4 md:text-[clamp(4rem,7vw,6.5rem)]">Construye con <span className="text-[#F6C64A]">más claridad.</span></h1><p className="mt-4 max-w-2xl text-[13px] leading-5 text-white/78 md:mt-5 md:text-base md:leading-7">Calcula lo que necesitas, compara alternativas y encuentra materiales o climatización conectados al mismo catálogo.</p></div>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-white/12 pt-5 sm:gap-x-8"><HeroBenefit icon={<Truck/>} title="Despacho" text="a todo Chile"/><HeroBenefit icon={<ShieldCheck/>} title="Compra" text="protegida"/><HeroBenefit icon={<ShoppingCart/>} title="Catálogo" text={`${products.length} productos`}/></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1540px] px-3 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Explora · calcula · construye</p><h2 className="mt-1 text-3xl font-black tracking-[-.05em] sm:text-5xl">Todo tu proyecto, más claro.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/46">Herramientas visuales, inspiración y materiales conectados en una experiencia pensada para revisar cada detalle.</p></div><button onClick={() => nav('/tienda/catalogo')} className="inline-flex items-center gap-2 self-start text-xs font-black text-[#F6C64A]">Ver todos los productos <ArrowRight size={15}/></button></div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ToolShowcase kind="radier" eyebrow="Construcción" title="Calcula tu radier ideal" text="Ingresa largo, ancho y espesor. Revisa capas, materiales, mano de obra y referencias de costo antes de cotizar." accent="yellow" bullets={['Hormigón, malla y áridos', 'Estacas de 43 cm y moldaje', 'Solo mano de obra o con materiales']} cta="Calcular radier" onClick={() => nav('/herramientas/radier')} />
          <ToolShowcase kind="air" eyebrow="Climatización" title="Calcula tu aire ideal" text="Define el espacio, conoce los BTU sugeridos, consumo estimado y equipos compatibles disponibles en catálogo." accent="cyan" bullets={['BTU según tu espacio', 'Consumo y costo estimado', 'Ahorro, recomendado y premium']} cta="Calcular mi aire" onClick={() => nav('/herramientas/aire-acondicionado')} />
          <ToolShowcase kind="metalcon" eyebrow="Estructuras" title="Diseña tu panel Metalcon" text="Visualiza un muro completo, modula montantes y revisa el refuerzo de puertas, ventanas y planchas OSB." accent="yellow" bullets={['Montantes cada 40 o 60 cm', 'OSB de 120 o 122 cm', 'Refuerzos dobles en aberturas']} cta="Abrir simulador Metalcon" onClick={() => nav('/herramientas/metalcon')} />
          <ToolShowcase kind="inspiration" eyebrow="Inspiración" title="Descubre tu próximo espacio" text="Recorre ideas de arquitectura, interiores y terminaciones para definir con más claridad el estilo de tu proyecto." accent="violet" bullets={['Ambientes y fachadas', 'Ideas agrupadas por estilo', 'Referencias para planificar']} cta="Explorar inspiración" onClick={() => nav('/proyectos')} />
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-3 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black tracking-[-.035em]">Explora nuestras categorías</h2><button onClick={()=>nav('/tienda/catalogo')} className="text-[10px] font-black text-[#F6C64A]">Ver todas →</button></div>
        <div className="mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none]">
          {categories.map((category, index) => { const sample = products.find((p)=>categoryOf(p)===category); return <button key={category} onClick={()=>nav(`/tienda/catalogo?categoria=${encodeURIComponent(category)}`)} className="relative h-36 w-[72vw] max-w-[250px] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0B1115] text-left sm:w-52"><img src={categoryImage(category,sample)} alt="" loading="lazy" onError={(event)=>{event.currentTarget.src=safeImageFallback(sample)}} className="absolute inset-0 h-full w-full object-cover opacity-66"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/28 to-transparent"/><span className={`absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg ${index===0?'bg-[#F6C64A] text-black':'bg-black/55 text-white'}`}><Grid2X2 size={15}/></span><b className="absolute bottom-3 left-3 right-3 text-sm">{category}</b></button>; })}
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-3 py-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]"><Flame size={14}/> Productos más comprados</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Una selección para empezar.</h2></div><button onClick={()=>nav('/tienda/catalogo')} className="hidden text-[10px] font-black text-[#F6C64A] sm:block">Ver todos →</button></div>
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
function ToolShowcase({kind,eyebrow,title,text,accent,bullets,cta,onClick}:{kind:'air'|'radier'|'metalcon'|'inspiration';eyebrow:string;title:string;text:string;accent:'yellow'|'cyan'|'violet';bullets:string[];cta:string;onClick:()=>void}) { const color=accent==='yellow'?YELLOW:accent==='cyan'?'#57D4FF':'#BB9AFF'; return <article className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0A0F13] p-3 shadow-[0_24px_80px_rgba(0,0,0,.22)] sm:min-h-[430px] sm:p-5 lg:p-6"><div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full blur-[90px]" style={{background:`${color}20`}}/><div className="grid gap-5 md:grid-cols-[.86fr_1.14fr] md:items-center"><div className="order-2 md:order-1"><span className="inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.16em]" style={{background:`${color}20`,color}}>{eyebrow}</span><h3 className="mt-3 text-[2rem] font-black leading-[.92] tracking-[-.055em] sm:text-4xl">{title}</h3><p className="mt-4 text-xs leading-5 text-white/52 sm:text-sm sm:leading-6">{text}</p><ul className="mt-4 space-y-2">{bullets.map((item)=><li key={item} className="flex items-center gap-2 text-[10px] text-white/66"><Check size={13} style={{color}}/>{item}</li>)}</ul></div><div className="order-1 h-[260px] overflow-hidden rounded-[1.35rem] border border-white/[.07] bg-[#05090c] md:order-2 md:h-[310px]"><StoreToolCanvas kind={kind}/></div></div><button onClick={onClick} className="mt-5 flex min-h-13 w-full items-center justify-center gap-3 rounded-full px-4 py-4 text-xs font-black text-black" style={{background:color}}><Calculator size={17}/>{cta}<ArrowRight size={16}/></button></article>; }
function ProductCard({product,badge,added,onOpen,onAdd}:{product:Product;badge?:string;added:boolean;onOpen:()=>void;onAdd:(event:MouseEvent)=>void}) { const price=priceOf(product); const stock=stockOf(product); return <article className="group w-[82vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0A0F13] transition hover:border-[#F6C64A]/35 sm:w-auto sm:max-w-none"><button onClick={onOpen} className="relative block aspect-[16/11] w-full overflow-hidden bg-[#0E1418] p-3"><img src={productImage(product)} alt={product.name} loading="lazy" onError={(event)=>{event.currentTarget.src=safeImageFallback(product)}} className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.035]"/>{badge?<span className="absolute left-2 top-2 rounded-full bg-[#F6C64A] px-2 py-1 text-[8px] font-black uppercase text-black">{badge}</span>:null}</button><div className="p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#57D4FF]">{categoryOf(product)}</p><button onClick={onOpen} className="mt-1 line-clamp-2 min-h-[2.35rem] text-left text-xs font-black leading-[1.15]">{product.name}</button><p className="mt-1 line-clamp-2 min-h-[2rem] text-[9px] leading-4 text-white/34">{product.tagline || product.description || 'Solución para tu proyecto.'}</p><div className="mt-3 flex items-end justify-between gap-2"><div><b className="text-lg tracking-[-.04em]">{CLP.format(price)}</b><small className={`mt-1 block text-[8px] ${stock===0?'text-red-400':'text-emerald-400'}`}>{stock===0?'Sin stock':stock==null?'Stock por confirmar':`${stock} disponibles`}</small></div><button onClick={onAdd} disabled={stock===0} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${added?'bg-emerald-400':'bg-[#F6C64A]'} text-black disabled:opacity-30`} aria-label="Agregar al carrito">{added?<Check size={17}/>:<ShoppingCart size={17}/>}</button></div></div></article>; }
