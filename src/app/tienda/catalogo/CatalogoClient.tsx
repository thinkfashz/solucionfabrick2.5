'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Flame, Search, ShoppingCart, SlidersHorizontal, Trophy, X } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function imageOf(product: CatalogProduct) { return product.img || product.image_url || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=800&auto=format&fit=crop'; }
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }).slice(0,4),[products]);

  const nav=(href:string)=>navigateWithTransition(href,router);
  const add=(event:MouseEvent,product:CatalogProduct)=>{event.stopPropagation(); if((stockOf(product)??1)<=0)return; addToCart({id:product.id,name:product.name,price:product.price,image_url:imageOf(product),category_id:categoryOf(product),discount_percentage:discountOf(product),shipping_mode:product.shipping_mode,shipping_fee:product.shipping_fee,shipping_weight_kg:product.shipping_weight_kg,shipping_dimensions:product.shipping_dimensions,shipping_region_overrides:product.shipping_region_overrides} as Parameters<typeof addToCart>[0]); const id=String(product.id);setAdded(id);window.setTimeout(()=>setAdded(v=>v===id?null:v),1000);};
  const clear=()=>{setSearchQuery('');setSelectedCategory('Todos');setOnlyDiscounted(false);};

  return <div className="min-h-screen bg-[#05090C] text-white">
    <StorefrontHeader onSearch={()=>searchInputRef.current?.focus()}/>
    <main className="mx-auto max-w-[1420px] px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <button onClick={()=>nav('/tienda')} className="inline-flex items-center gap-2 text-[10px] font-black text-white/50 hover:text-[#F6C64A]"><ArrowLeft size={14}/> Volver a la tienda</button>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Catálogo completo</p><h1 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-5xl">Todos los productos</h1><p className="mt-2 text-sm text-white/42">Materiales, climatización, herramientas e iluminación conectados a tu proyecto.</p></div><span className="text-xs font-bold text-white/38">{fetchComplete?`${products.length} productos disponibles`:'Sincronizando catálogo…'}</span></div>

      <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_auto]"><label className="flex h-13 items-center gap-3 rounded-[1.1rem] border border-white/12 bg-white/[.035] px-4"><Search size={18} className="text-white/40"/><input id="catalog-search" ref={searchInputRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="¿Qué producto estás buscando?" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"/>{searchQuery?<button onClick={()=>setSearchQuery('')}><X size={16}/></button>:null}</label><button onClick={()=>setOnlyDiscounted(v=>!v)} className={`flex h-13 items-center justify-center gap-2 rounded-[1.1rem] border px-5 text-xs font-black ${onlyDiscounted?'border-[#F6C64A] bg-[#F6C64A] text-black':'border-white/12 bg-white/[.035] text-white/70'}`}><SlidersHorizontal size={16}/> Ofertas</button></div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">{categories.map(category=><button key={category} onClick={()=>setSelectedCategory(category)} className={`shrink-0 rounded-[1rem] border px-4 py-3 text-[10px] font-black ${selectedCategory===category?'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]':'border-white/10 bg-[#0A0F13] text-white/55'}`}>{category}</button>)}</div>

      {popular.length && selectedCategory==='Todos' && !searchQuery ? <section className="mt-7 rounded-[1.5rem] border border-white/10 bg-[#091014] p-4 sm:p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F6C64A] text-black"><Trophy size={18}/></span><div><h2 className="text-lg font-black">Productos <span className="text-[#F6C64A]">más comprados</span></h2><p className="text-[10px] text-white/35">Los destacados del catálogo actual.</p></div></div><button onClick={()=>setSelectedCategory('Todos')} className="text-[10px] font-black text-[#F6C64A]">Ver todos →</button></div><div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">{popular.map((product,index)=><ProductCard key={product.id} product={product} badge={index===0?'Más vendido':index===1?'Recomendado':undefined} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div></section>:null}

      <section className="mt-7"><div className="mb-4 flex items-center justify-between"><div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.18em] text-[#F6C64A]"><Flame size={13}/> {selectedCategory==='Todos'?'Catálogo':'Categoría'}</p><h2 className="mt-1 text-xl font-black">{selectedCategory==='Todos'?'Explora todo':selectedCategory}</h2></div><span className="text-[10px] text-white/35">{filteredProducts.length} resultados</span></div>
        {fetchComplete && filteredProducts.length===0?<div className="rounded-[1.5rem] border border-white/10 bg-[#0A0F13] py-24 text-center"><p className="font-bold">No encontramos productos con esos filtros.</p><button onClick={clear} className="mt-4 rounded-full bg-[#F6C64A] px-6 py-3 text-xs font-black text-black">Limpiar filtros</button></div>:<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{filteredProducts.map(product=><ProductCard key={product.id} product={product} added={added===String(product.id)} onOpen={()=>nav(`/tienda/${product.id}`)} onAdd={(event)=>add(event,product)}/>)}</div>}
      </section>
    </main>
    <StoreBottomNav/>
  </div>;
}

function ProductCard({product,badge,added,onOpen,onAdd}:{product:CatalogProduct;badge?:string;added:boolean;onOpen:()=>void;onAdd:(event:MouseEvent)=>void}) { const stock=stockOf(product); const discount=discountOf(product); return <article className="group overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#0A0F13] transition hover:border-[#F6C64A]/35"><button onClick={onOpen} className="relative block aspect-square w-full bg-[#0E1418] p-3"><img src={imageOf(product)} alt={product.name} loading="lazy" className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.035]"/>{badge?<span className="absolute left-2 top-2 rounded-full bg-[#F6C64A] px-2 py-1 text-[8px] font-black uppercase text-black">{badge}</span>:discount>0?<span className="absolute left-2 top-2 rounded-full bg-[#57D4FF] px-2 py-1 text-[8px] font-black uppercase text-black">-{Math.round(discount)}%</span>:null}</button><div className="p-3"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#57D4FF]">{categoryOf(product)}</p><button onClick={onOpen} className="mt-1 line-clamp-2 min-h-[2.4rem] text-left text-xs font-black leading-[1.16]">{product.name}</button><p className="mt-1 line-clamp-2 min-h-[2rem] text-[9px] leading-4 text-white/35">{product.tagline || product.description || 'Solución para tu proyecto.'}</p><div className="mt-2 text-[9px] text-[#F6C64A]">{'★'.repeat(Math.max(1,Math.round(Number(product.rating||4.8))))}</div><div className="mt-3 flex items-end justify-between gap-2"><div><b className="text-lg tracking-[-.04em]">{CLP.format(priceOf(product))}</b><small className={`mt-1 block text-[8px] ${stock===0?'text-red-400':'text-emerald-400'}`}>{stock===0?'Sin stock':stock==null?'Stock por confirmar':`${stock} disponibles`}</small></div><button onClick={onAdd} disabled={stock===0} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${added?'bg-emerald-400':'bg-[#F6C64A]'} text-black disabled:opacity-30`} aria-label="Agregar al carrito">{added?<Check size={17}/>:<ShoppingCart size={17}/>}</button></div></div></article>; }
