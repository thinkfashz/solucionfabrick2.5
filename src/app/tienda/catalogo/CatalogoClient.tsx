'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Flame, ShoppingCart, SlidersHorizontal, Trophy, X } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { resolveStoreProductImage, storeProductImageFallback } from '@/lib/storeProductVisuals';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function productText(product: CatalogProduct) { return `${product.name} ${product.description || ''} ${product.tagline || ''} ${product.category_name || product.category || ''}`.toLowerCase(); }
function fallbackImageFor(product: CatalogProduct) {
  return storeProductImageFallback(product);
}
function imageOf(product: CatalogProduct) {
  return resolveStoreProductImage(product);
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

      {popular.length && selectedCategory==='Todos' && !searchQuery ? <section className="mt-7 rounded-[1.65rem] border border-white/10 bg-[#091014] p-3 sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6C64A] text-black"><Trophy size={18}/></span><div className="min-w-0"><h2 className="text-lg font-black">Productos <span className="text-[#F6C64A]">más comprados</span></h2><p className="text-[10px] text-white/35">Tus destacados, visibles sin deslizar lateralmente.</p></div></div><button onClick={()=>setSelectedCategory('Todos')} className="shrink-0 text-[10px] font-black text-[#F6C64A]">Ver todos →</button></div><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">{popular.map((product,index)=><ProductCard key={product.id} product={product} badge={index===0?'Más vendido':index===1?'Recomendado':undefined} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div></section>:null}

      <section className="mt-7"><div className="mb-4 flex items-center justify-between"><div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-[#F6C64A]"><Flame size={13}/> {selectedCategory==='Todos'?'Catálogo':'Categoría'}</p><h2 className="mt-1 text-xl font-black">{selectedCategory==='Todos'?'Explora todo':selectedCategory}</h2></div><span className="text-[10px] text-white/35">{filteredProducts.length} resultados</span></div>
        {fetchComplete && filteredProducts.length===0?<div className="rounded-[1.5rem] border border-white/10 bg-[#0A0F13] py-24 text-center"><p className="font-bold">No encontramos productos con esos filtros.</p><button onClick={clear} className="mt-4 rounded-full bg-[#F6C64A] px-6 py-3 text-xs font-black text-black">Limpiar filtros</button></div>:<><p className="mb-3 text-[9px] font-bold uppercase tracking-[.14em] text-white/28 sm:hidden">Desliza hacia abajo para recorrer el catálogo</p><div className="grid grid-cols-2 gap-2.5 pb-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">{filteredProducts.map(product=><ProductCard key={product.id} product={product} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div></>}
      </section>
    </main>
    <StoreBottomNav/>
  </div>;
}

function ProductCard({product,badge,added,onOpen,onAdd}:{product:CatalogProduct;badge?:string;added:boolean;onOpen:()=>void;onAdd:(event:MouseEvent)=>void}) {
  const stock=stockOf(product); const discount=discountOf(product); const fallback=fallbackImageFor(product);
  return <article className="group min-w-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#0A0F13] transition hover:border-[#F6C64A]/35 sm:rounded-[1.35rem]">
    <button onClick={onOpen} className="relative block aspect-square w-full overflow-hidden bg-[#0E1418] p-2.5 sm:aspect-[16/11] sm:p-4"><img src={imageOf(product)} alt={product.name} loading="lazy" onError={(event)=>{if(event.currentTarget.src!==fallback) event.currentTarget.src=fallback;}} className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.035]"/>{badge?<span className="absolute left-2 top-2 rounded-full bg-[#F6C64A] px-2 py-1 text-[7px] font-black uppercase text-black sm:left-3 sm:top-3 sm:text-[8px]">{badge}</span>:discount>0?<span className="absolute left-2 top-2 rounded-full bg-[#57D4FF] px-2 py-1 text-[7px] font-black uppercase text-black">-{Math.round(discount)}%</span>:null}</button>
    <div className="p-2.5 sm:p-4"><p className="truncate text-[7px] font-black uppercase tracking-[.11em] text-[#57D4FF] sm:text-[8px]">{categoryOf(product)}</p><button onClick={onOpen} className="mt-1 line-clamp-2 min-h-[2.25rem] text-left text-[11px] font-black leading-[1.15] sm:min-h-[2.55rem] sm:text-sm">{product.name}</button><p className="mt-1 hidden line-clamp-2 min-h-[2rem] text-[10px] leading-4 text-white/38 sm:block">{product.tagline || product.description || 'Solución para tu proyecto.'}</p><div className="mt-2 text-[8px] text-[#F6C64A] sm:text-[9px]">{'★'.repeat(Math.max(1,Math.min(5,Math.round(Number(product.rating||4.8)))))}</div><div className="mt-2 flex items-end justify-between gap-1.5 sm:mt-4 sm:gap-2"><div className="min-w-0"><b className="block truncate text-sm tracking-[-.04em] sm:text-xl">{CLP.format(priceOf(product))}</b><small className={`mt-1 block truncate text-[7px] sm:text-[8px] ${stock===0?'text-red-400':'text-emerald-400'}`}>{stock===0?'Sin stock':stock==null?'Por confirmar':`${stock} disponibles`}</small></div><button onClick={onAdd} disabled={stock===0} className={`grid h-9 w-9 shrink-0 place-items-center rounded-[.8rem] sm:h-11 sm:w-11 sm:rounded-[.95rem] ${added?'bg-emerald-400':'bg-[#F6C64A]'} text-black shadow-[0_8px_24px_rgba(246,198,74,.14)] disabled:opacity-30`} aria-label="Agregar al carrito">{added?<Check size={16}/>:<ShoppingCart size={16}/>}</button></div></div>
  </article>;
}
