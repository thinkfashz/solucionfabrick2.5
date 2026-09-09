'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Flame, ShoppingCart, SlidersHorizontal, Trophy, X } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const AIR_9K = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_900/f_auto/q_auto/v1788677205/air-9k-v7.png';
const AIR_12K = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_900/f_auto/q_auto/v1788677189/air-12k-v7.png';
const AIR_GENERIC = 'https://res.cloudinary.com/disghf6xc/image/upload/c_limit,w_900/f_auto/q_auto/v1788843315/air-split-premium-v10.png';
const PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1000&auto=format&fit=crop';

function productText(product: CatalogProduct) { return `${product.name} ${product.description || ''} ${product.tagline || ''} ${product.category_name || product.category || ''}`.toLowerCase(); }
function fallbackImageFor(product: CatalogProduct) {
  const text = productText(product);
  if (/9\.?000\s*btu|9k/.test(text)) return AIR_9K;
  if (/12\.?000\s*btu|12k/.test(text)) return AIR_12K;
  if (/aire acondicionado|climat|split|btu/.test(text)) return AIR_GENERIC;
  return PRODUCT_FALLBACK;
}
function imageOf(product: CatalogProduct) {
  const text = productText(product);
  if (/9\.?000\s*btu|9k/.test(text)) return AIR_9K;
  if (/12\.?000\s*btu|12k/.test(text)) return AIR_12K;
  return product.img || product.image_url || fallbackImageFor(product);
}
function categoryOf(product: CatalogProduct) { return product.category_name || product.category || product.category_id || 'General'; }
function discountOf(product: CatalogProduct) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function priceOf(product: CatalogProduct) { return Math.round(Number(product.price || 0) * (1 - discountOf(product) / 100)); }
function stockOf(product: CatalogProduct) { return Number.isFinite(Number(product.stock)) ? Number(product.stock) : null; }

export default function CatalogoClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { products, fetchComplete } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(categoryOf).filter(Boolean)))], [products]);
  useEffect(() => { const requested=params.get('categoria'); if (requested && categories.includes(requested)) setSelectedCategory(requested); }, [params, categories]);
  const filteredProducts = useMemo(() => {
    const q=searchQuery.trim().toLowerCase();
    return products.filter((product)=>{
      const searchable=`${product.name} ${product.description || ''} ${product.tagline || ''} ${categoryOf(product)}`.toLowerCase();
      return (!q || searchable.includes(q)) && (selectedCategory==='Todos' || categoryOf(product)===selectedCategory) && (!onlyDiscounted || discountOf(product)>0);
    });
  },[products,searchQuery,selectedCategory,onlyDiscounted]);
  const popular = useMemo(()=>[...products].sort((a,b)=>{
    const aa=a.placement==='best_seller'?3:a.featured?2:Number(a.rating||0);
    const bb=b.placement==='best_seller'?3:b.featured?2:Number(b.rating||0);
    return bb-aa;
  }).slice(0,6),[products]);

  const nav=(href:string)=>navigateWithTransition(href,router);
  const add=(event:MouseEvent,product:CatalogProduct)=>{event.stopPropagation(); if((stockOf(product)??1)<=0)return; addToCart({id:product.id,name:product.name,price:product.price,image_url:imageOf(product),category_id:categoryOf(product),discount_percentage:discountOf(product),shipping_mode:product.shipping_mode,shipping_fee:product.shipping_fee,shipping_weight_kg:product.shipping_weight_kg,shipping_dimensions:product.shipping_dimensions,shipping_region_overrides:product.shipping_region_overrides} as Parameters<typeof addToCart>[0]); const id=String(product.id);setAdded(id);window.setTimeout(()=>setAdded(v=>v===id?null:v),1000);};
  const clear=()=>{setSearchQuery('');setSelectedCategory('Todos');setOnlyDiscounted(false);};

  return <div className="min-h-screen bg-[#05090C] text-white">
    <StorefrontHeader />
    <input id="catalog-search" tabIndex={-1} aria-hidden="true" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="sr-only" />
    <main className="mx-auto max-w-[1480px] px-3 pb-28 pt-5 sm:px-6 lg:px-8">
      <button onClick={()=>nav('/tienda')} className="inline-flex items-center gap-2 text-[10px] font-black text-white/50 hover:text-[#F6C64A]"><ArrowLeft size={14}/> Volver a la tienda</button>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Catálogo completo</p><h1 className="mt-2 text-[clamp(2.25rem,9vw,4.5rem)] font-black tracking-[-.06em]">Todos los productos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/46">Materiales, climatización, herramientas e iluminación conectados a tu proyecto.</p></div><div className="flex items-center gap-2"><span className="text-xs font-bold text-white/38">{fetchComplete?`${products.length} productos`:'Sincronizando…'}</span><button onClick={()=>setOnlyDiscounted(v=>!v)} className={`inline-flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-[10px] font-black ${onlyDiscounted?'border-[#F6C64A] bg-[#F6C64A] text-black':'border-white/12 bg-white/[.035] text-white/70'}`}><SlidersHorizontal size={14}/> Ofertas</button></div></div>

      {searchQuery ? <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#57D4FF]/20 bg-[#57D4FF]/[.055] px-4 py-3 text-xs"><span className="min-w-0 truncate text-white/65">Buscando: <b className="text-white">{searchQuery}</b></span><button onClick={()=>setSearchQuery('')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.06]" aria-label="Limpiar búsqueda"><X size={15}/></button></div> : null}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">{categories.map(category=><button key={category} onClick={()=>setSelectedCategory(category)} className={`shrink-0 rounded-[1rem] border px-4 py-3 text-[10px] font-black ${selectedCategory===category?'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]':'border-white/10 bg-[#0A0F13] text-white/55'}`}>{category}</button>)}</div>

      {popular.length && selectedCategory==='Todos' && !searchQuery ? <section className="mt-7 rounded-[1.65rem] border border-white/10 bg-[#091014] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6C64A] text-black"><Trophy size={18}/></span><div className="min-w-0"><h2 className="text-lg font-black">Productos <span className="text-[#F6C64A]">más comprados</span></h2><p className="text-[10px] text-white/35">Desliza para explorar los destacados.</p></div></div><button onClick={()=>setSelectedCategory('Todos')} className="shrink-0 text-[10px] font-black text-[#F6C64A]">Ver todos →</button></div><div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6">{popular.map((product,index)=><ProductCard key={product.id} product={product} badge={index===0?'Más vendido':index===1?'Recomendado':undefined} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div></section>:null}

      <section className="mt-7"><div className="mb-4 flex items-center justify-between"><div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-[#F6C64A]"><Flame size={13}/> {selectedCategory==='Todos'?'Catálogo':'Categoría'}</p><h2 className="mt-1 text-xl font-black">{selectedCategory==='Todos'?'Explora todo':selectedCategory}</h2></div><span className="text-[10px] text-white/35">{filteredProducts.length} resultados</span></div>
        {fetchComplete && filteredProducts.length===0?<div className="rounded-[1.5rem] border border-white/10 bg-[#0A0F13] py-24 text-center"><p className="font-bold">No encontramos productos con esos filtros.</p><button onClick={clear} className="mt-4 rounded-full bg-[#F6C64A] px-6 py-3 text-xs font-black text-black">Limpiar filtros</button></div>:<><p className="mb-3 text-[9px] font-bold uppercase tracking-[.14em] text-white/28 sm:hidden">Desliza hacia los lados para recorrer el catálogo</p><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-4 xl:grid-cols-5">{filteredProducts.map(product=><ProductCard key={product.id} product={product} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div></>}
      </section>
    </main>
    <StoreBottomNav/>
  </div>;
}

function ProductCard({product,badge,added,onOpen,onAdd}:{product:CatalogProduct;badge?:string;added:boolean;onOpen:()=>void;onAdd:(event:MouseEvent)=>void}) {
  const stock=stockOf(product); const discount=discountOf(product); const fallback=fallbackImageFor(product);
  return <article className="group w-[78vw] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0A0F13] transition hover:border-[#F6C64A]/35 sm:w-auto sm:max-w-none">
    <button onClick={onOpen} className="relative block aspect-[16/11] w-full overflow-hidden bg-[#0E1418] p-4"><img src={imageOf(product)} alt={product.name} loading="lazy" onError={(event)=>{if(event.currentTarget.src!==fallback) event.currentTarget.src=fallback;}} className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.035]"/>{badge?<span className="absolute left-3 top-3 rounded-full bg-[#F6C64A] px-2.5 py-1 text-[8px] font-black uppercase text-black">{badge}</span>:discount>0?<span className="absolute left-3 top-3 rounded-full bg-[#57D4FF] px-2.5 py-1 text-[8px] font-black uppercase text-black">-{Math.round(discount)}%</span>:null}</button>
    <div className="p-4"><p className="text-[8px] font-black uppercase tracking-[.13em] text-[#57D4FF]">{categoryOf(product)}</p><button onClick={onOpen} className="mt-1 line-clamp-2 min-h-[2.55rem] text-left text-sm font-black leading-[1.18]">{product.name}</button><p className="mt-1 line-clamp-2 min-h-[2rem] text-[10px] leading-4 text-white/38">{product.tagline || product.description || 'Solución para tu proyecto.'}</p><div className="mt-2 text-[9px] text-[#F6C64A]">{'★'.repeat(Math.max(1,Math.min(5,Math.round(Number(product.rating||4.8)))))}</div><div className="mt-4 flex items-end justify-between gap-2"><div><b className="text-xl tracking-[-.045em]">{CLP.format(priceOf(product))}</b><small className={`mt-1 block text-[8px] ${stock===0?'text-red-400':'text-emerald-400'}`}>{stock===0?'Sin stock':stock==null?'Stock por confirmar':`${stock} disponibles`}</small></div><button onClick={onAdd} disabled={stock===0} className={`grid h-11 w-11 shrink-0 place-items-center rounded-[.95rem] ${added?'bg-emerald-400':'bg-[#F6C64A]'} text-black shadow-[0_8px_24px_rgba(246,198,74,.14)] disabled:opacity-30`} aria-label="Agregar al carrito">{added?<Check size={18}/>:<ShoppingCart size={18}/>}</button></div></div>
  </article>;
}
