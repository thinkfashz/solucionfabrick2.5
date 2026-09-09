'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Calculator, Check, Flame, Grid2X2, Search, ShieldCheck, ShoppingCart, Truck } from 'lucide-react';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { navigateWithTransition } from '@/lib/routeTransition';
import { HOME_PREMIUM_VISUALS } from '@/lib/homePremiumVisuals';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { toCartProduct } from '@/components/store/featuredProducts';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const YELLOW = '#F6C64A';
const AIR_FALLBACK = 'https://res.cloudinary.com/disghf6xc/image/upload/f_png/q_auto:best/v1788676769/air-12k-universal-v8.png';
const RADIER_FALLBACK = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_900/f_auto/q_auto/v1788934479/hormigon-radier.png';
type Product = CatalogProduct;

function imageOf(product?: Product) { return product?.img || product?.image_url || HOME_PREMIUM_VISUALS.living; }
function categoryOf(product: Product) { return product.category_name || product.category || product.category_id || 'Producto'; }
function discountOf(product: Product) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function priceOf(product: Product) { return Math.round(Number(product.price || 0) * (1 - discountOf(product) / 100)); }
function stockOf(product: Product) { return Number.isFinite(Number(product.stock)) ? Number(product.stock) : null; }
function productText(product: Product) { return `${product.name} ${product.description || ''} ${product.tagline || ''} ${categoryOf(product)}`.toLowerCase(); }
function isCement(product: Product) { return /cement/.test(productText(product)); }
function isAir(product: Product) { return /climat|aire acondicionado|btu|split/.test(productText(product)); }

export default function TiendaClientV2() {
  const router = useRouter();
  const { addToCart } = useCartContext();
  const { products: live, fetchComplete, source, error, reload } = useCatalogProducts();
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const products = useMemo(() => live.length ? live : FALLBACK_CATALOG_PRODUCTS, [live]);
  const cement = useMemo(() => products.find(isCement), [products]);
  const air = useMemo(() => products.find(isAir), [products]);
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
    addToCart(toCartProduct(product));
    const id = String(product.id);
    setAdded(id);
    window.setTimeout(() => setAdded((current) => current === id ? null : current), 1100);
  }

  return <div className="min-h-screen bg-[#05090C] text-white">
    <StorefrontHeader onSearch={() => document.getElementById('store-home-search')?.focus()} />
    {fetchComplete && source === 'fallback' ? <div className="border-b border-[#F6C64A]/15 bg-[#F6C64A]/[.05] px-4 py-2 text-center text-[10px] text-white/58">{error || 'Mostrando catálogo de respaldo.'} <button onClick={() => void reload()} className="ml-2 font-black text-[#F6C64A]">Reintentar</button></div> : null}

    <main className="pb-28 md:pb-14">
      <section className="mx-auto max-w-[1380px] px-4 pb-5 pt-5 sm:px-6 lg:px-8">
        <div className="relative min-h-[410px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#0A0F13] sm:min-h-[500px]">
          <img src={HOME_PREMIUM_VISUALS.living} alt="Proyecto Soluciones Fabrick" className="absolute inset-0 h-full w-full object-cover opacity-72" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,10,.96)_0%,rgba(3,7,10,.84)_42%,rgba(3,7,10,.18)_75%,rgba(3,7,10,.32)_100%)]" />
          <div className="relative z-10 flex min-h-[410px] max-w-[720px] flex-col justify-between p-6 sm:min-h-[500px] sm:p-10 lg:p-12">
            <div><p className="text-[9px] font-black uppercase tracking-[.28em] text-[#F6C64A]">Más que productos, soluciones para tu proyecto</p><h1 className="mt-4 text-[clamp(2.7rem,7vw,5.5rem)] font-black leading-[.9] tracking-[-.065em]">Construcción y <span className="text-[#F6C64A]">climatización</span> para avanzar con claridad.</h1><p className="mt-5 max-w-xl text-sm leading-6 text-white/60 sm:text-base sm:leading-7">Calcula primero, compara después y compra con precios, stock y despacho conectados al mismo catálogo.</p></div>
            <div className="grid grid-cols-3 gap-2 pt-8"><Benefit icon={<Truck/>} title="Despacho" text="a todo Chile"/><Benefit icon={<ShieldCheck/>} title="Compra" text="protegida"/><Benefit icon={<ShoppingCart/>} title="Catálogo" text={`${products.length} productos`}/></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Antes de comprar</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Calcula lo que tu proyecto necesita.</h2><p className="mt-2 text-xs leading-5 text-white/42">Dos accesos rápidos para pasar de una duda a una recomendación útil.</p></div><button onClick={() => nav('/tienda/catalogo')} className="inline-flex items-center gap-2 self-start text-xs font-black text-[#F6C64A]">Ver todos los productos <ArrowRight size={15}/></button></div>
        <div className="grid gap-3 lg:grid-cols-2">
          <ToolShowcase eyebrow="Construcción" title="Calcula tu radier ideal" text="Ingresa largo, ancho y espesor. Revisa capas, materiales, mano de obra y referencias de costo antes de cotizar." image={cement ? imageOf(cement) : RADIER_FALLBACK} accent="yellow" bullets={['Hormigón, malla y áridos', 'Estacas de 43 cm y moldaje', 'Solo mano de obra o con materiales']} cta="Calcular radier" onClick={() => nav('/herramientas/radier')} />
          <ToolShowcase eyebrow="Climatización" title="Calcula tu aire ideal" text="Define el espacio, conoce los BTU sugeridos, consumo estimado y equipos compatibles disponibles en catálogo." image={air ? imageOf(air) : AIR_FALLBACK} accent="cyan" bullets={['BTU según tu espacio', 'Consumo y costo estimado', 'Ahorro, recomendado y premium']} cta="Calcular mi aire" onClick={() => nav('/herramientas/aire-acondicionado')} />
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-black tracking-[-.035em]">Explora nuestras categorías</h2><button onClick={()=>nav('/tienda/catalogo')} className="text-[10px] font-black text-[#F6C64A]">Ver todas →</button></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
          {categories.map((category, index) => { const sample = products.find((p)=>categoryOf(p)===category); return <button key={category} onClick={()=>nav(`/tienda/catalogo?categoria=${encodeURIComponent(category)}`)} className="relative h-32 w-44 shrink-0 overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#0B1115] text-left"><img src={imageOf(sample)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent"/><span className={`absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg ${index===0?'bg-[#F6C64A] text-black':'bg-black/55 text-white'}`}><Grid2X2 size={15}/></span><b className="absolute bottom-3 left-3 right-3 text-sm">{category}</b></button>; })}
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]"><Flame size={14}/> Productos más comprados</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Una selección para empezar.</h2></div><div className="relative w-full sm:max-w-[390px]"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"/><input id="store-home-search" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Busca un producto o material" className="h-12 w-full rounded-full border border-white/12 bg-white/[.035] pl-11 pr-4 text-sm outline-none placeholder:text-white/28 focus:border-[#F6C64A]/60"/></div></div>
        {query ? <div className="mt-3 rounded-[1.2rem] border border-white/10 bg-[#0A0F13] p-2">{searchResults.length ? searchResults.map((product)=><button key={product.id} onClick={()=>nav(`/tienda/${product.id}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[.04]"><img src={imageOf(product)} alt="" className="h-12 w-14 rounded-lg bg-white object-contain p-1"/><span className="min-w-0 flex-1"><b className="line-clamp-1 text-xs">{product.name}</b><small className="mt-1 block text-[9px] text-white/35">{categoryOf(product)}</small></span><b className="text-xs text-[#F6C64A]">{CLP.format(priceOf(product))}</b></button>) : <p className="p-4 text-xs text-white/38">No encontramos coincidencias.</p>}</div> : null}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{bestSellers.map((product, index)=><ProductCard key={product.id} product={product} badge={index===0?'Más vendido':index===1?'Recomendado':undefined} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div>
        <button onClick={()=>nav('/tienda/catalogo')} className="mt-6 flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-[#F6C64A]/30 bg-[#F6C64A]/[.06] px-6 text-xs font-black text-[#F6C64A]">Explorar catálogo completo <ArrowRight size={16}/></button>
      </section>
    </main>
    <StoreBottomNav />
  </div>;
}

function Benefit({icon,title,text}:{icon:ReactNode;title:string;text:string}) { return <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center backdrop-blur-md"><span className="mx-auto block w-fit text-[#F6C64A] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><b className="mt-2 block text-[10px]">{title}</b><small className="block text-[8px] text-white/35">{text}</small></div>; }
function ToolShowcase({eyebrow,title,text,image,accent,bullets,cta,onClick}:{eyebrow:string;title:string;text:string;image:string;accent:'yellow'|'cyan';bullets:string[];cta:string;onClick:()=>void}) { const color=accent==='yellow'?YELLOW:'#57D4FF'; return <article className="relative overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#0A0F13] p-5 sm:min-h-[390px] sm:p-7"><div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-[85px]" style={{background:`${color}20`}}/><div className="grid gap-5 sm:grid-cols-[.9fr_1.1fr] sm:items-center"><div><span className="inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.16em]" style={{background:`${color}20`,color}}>{eyebrow}</span><h3 className="mt-4 text-3xl font-black leading-[.95] tracking-[-.05em]">{title}</h3><p className="mt-3 text-xs leading-5 text-white/45">{text}</p><ul className="mt-4 space-y-2">{bullets.map((item)=><li key={item} className="flex items-center gap-2 text-[10px] text-white/58"><Check size={13} style={{color}}/>{item}</li>)}</ul></div><div className="grid min-h-[190px] place-items-center"><img src={image} alt="" loading="lazy" className="max-h-[230px] w-full object-contain drop-shadow-[0_28px_38px_rgba(0,0,0,.48)]"/></div></div><button onClick={onClick} className="mt-5 flex min-h-13 w-full items-center justify-center gap-3 rounded-full text-xs font-black text-black" style={{background:color}}><Calculator size={17}/>{cta}<ArrowRight size={16}/></button></article>; }
function ProductCard({product,badge,added,onOpen,onAdd}:{product:Product;badge?:string;added:boolean;onOpen:()=>void;onAdd:(event:MouseEvent)=>void}) { const price=priceOf(product); const stock=stockOf(product); return <article className="group overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0A0F13] transition hover:border-[#F6C64A]/35"><button onClick={onOpen} className="relative block aspect-square w-full overflow-hidden bg-[#0E1418] p-3"><img src={imageOf(product)} alt={product.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.035]"/>{badge?<span className="absolute left-2 top-2 rounded-full bg-[#F6C64A] px-2 py-1 text-[8px] font-black uppercase text-black">{badge}</span>:null}</button><div className="p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#57D4FF]">{categoryOf(product)}</p><button onClick={onOpen} className="mt-1 line-clamp-2 min-h-[2.35rem] text-left text-xs font-black leading-[1.15]">{product.name}</button><div className="mt-3 flex items-end justify-between gap-2"><div><b className="text-lg tracking-[-.04em]">{CLP.format(price)}</b><small className={`mt-1 block text-[8px] ${stock===0?'text-red-400':'text-emerald-400'}`}>{stock===0?'Sin stock':stock==null?'Stock por confirmar':`${stock} disponibles`}</small></div><button onClick={onAdd} disabled={stock===0} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${added?'bg-emerald-400':'bg-[#F6C64A]'} text-black disabled:opacity-30`} aria-label="Agregar al carrito">{added?<Check size={17}/>:<ShoppingCart size={17}/>}</button></div></div></article>; }
