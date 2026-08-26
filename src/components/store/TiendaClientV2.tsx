'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgePercent, Check, ChevronRight, Flame, Heart, RefreshCw, Search, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Star, Truck } from 'lucide-react';
import { FALLBACK_CATALOG_PRODUCTS, useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useCartContext } from '@/context/CartContext';
import { navigateWithTransition } from '@/lib/routeTransition';
import { StoreBottomNav, StoreFabrickLogo, StorefrontHeader } from '@/components/store/StorefrontChrome';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
type Product = CatalogProduct;
const FALLBACK = '/images/landing/fabrick-home-showcase.webp';
function imageOf(p: Product) { return p.img || p.image_url || FALLBACK; }
function categoryOf(p: Product) { return p.category_name || p.category || p.category_id || 'Producto'; }
function discountOf(p: Product) { return Math.max(0, Number(p.discountPercentage ?? p.discount_percentage ?? 0)); }
function priceOf(p: Product) { return Math.round(Number(p.price || 0) * (1 - discountOf(p) / 100)); }
function stockOf(p: Product) { return Number.isFinite(Number(p.stock)) ? Number(p.stock) : null; }
function asCart(p: Product) { return { id:p.id, name:p.name, price:p.price, image_url:imageOf(p), category_id:categoryOf(p), discount_percentage:discountOf(p), stock:p.stock, description:p.description, tagline:p.tagline }; }

export default function TiendaClientV2() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { addToCart, openCart } = useCartContext();
  const { products: live, loading, fetchComplete, source, error, reload } = useCatalogProducts();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [added, setAdded] = useState<string | null>(null);
  const products = useMemo(() => live.length ? live : FALLBACK_CATALOG_PRODUCTS, [live]);
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(products.map(categoryOf))).filter(Boolean).slice(0,12)], [products]);
  const promos = useMemo(() => products.filter(p => discountOf(p) > 0).sort((a,b)=>discountOf(b)-discountOf(a)), [products]);
  const maxDiscount = Math.round(Math.max(0, ...promos.map(discountOf)));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => (category === 'Todos' || categoryOf(p) === category) && (!q || `${p.name} ${p.description || ''} ${p.tagline || ''} ${categoryOf(p)}`.toLowerCase().includes(q)));
  }, [products, category, query]);
  const popular = useMemo(() => [...products].sort((a,b)=>Number(Boolean(b.featured))-Number(Boolean(a.featured))).slice(0,4), [products]);

  function open(p: Product) { navigateWithTransition(`/tienda/${p.id}`, router); }
  function add(event: MouseEvent, p: Product) { event.stopPropagation(); if ((stockOf(p) ?? 1) <= 0) return; addToCart(asCart(p) as Parameters<typeof addToCart>[0]); setAdded(p.id); setTimeout(()=>setAdded(v=>v===p.id?null:v),1200); }

  return <div className="min-h-screen bg-[#F4EFE6] text-[#111214]">
    <StorefrontHeader onSearch={() => document.getElementById('catalog-search')?.focus()} />
    {fetchComplete && source === 'fallback' ? <div className="mx-auto mt-3 flex max-w-7xl items-center justify-between gap-3 rounded-2xl bg-amber-100 px-4 py-3 text-xs"><span>{error || 'Catálogo temporal cargado.'}</span><button onClick={()=>void reload()} className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 font-black text-white"><RefreshCw className={`h-3.5 w-3.5 ${loading?'animate-spin':''}`} /> Reintentar</button></div> : null}
    <main className="mx-auto max-w-[1380px] px-3 pb-32 pt-3 sm:px-6 lg:px-8">
      <section className="grid overflow-hidden rounded-[2.2rem] bg-[#101112] text-white shadow-[0_30px_90px_rgba(18,16,12,.2)] lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10 lg:p-14">
          <div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#FFB000] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-black">Compra inteligente</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-white/55">IVA incluido</span></div>
          <h1 className="mt-5 max-w-[12ch] text-5xl font-black leading-[.9] tracking-[-.07em] sm:text-7xl">Mejora tu hogar sin pagar de más.</h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">Productos para construcción, climatización y hogar con precio final claro, despacho coordinado y compra protegida.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><a href="#catalogo" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#FFB000] px-6 font-black text-black">Explorar catálogo <ArrowRight className="h-4 w-4" /></a><button onClick={openCart} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/10 px-6 font-black"><ShoppingBag className="h-4 w-4" /> Ver carrito</button></div>
          <div className="mt-8 grid gap-2 sm:grid-cols-3"><Benefit icon={<ShieldCheck className="h-4 w-4" />} text="Pago protegido"/><Benefit icon={<Truck className="h-4 w-4" />} text="Despacho coordinado"/><Benefit icon={<Sparkles className="h-4 w-4" />} text="Selección Fabrick"/></div>
        </div>
        <div className="relative min-h-[390px] overflow-hidden bg-black lg:min-h-[560px]"><img src={FALLBACK} alt="Hogar moderno equipado" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#101112] via-[#101112]/15 to-transparent lg:block"/><div className="absolute bottom-5 left-5 right-5 rounded-[1.7rem] bg-white/92 p-5 text-black shadow-2xl backdrop-blur sm:left-auto sm:w-[330px]"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#B96F00]">Promoción hogar</p><div className="mt-2 flex items-end justify-between gap-4"><div><h2 className="text-3xl font-black tracking-[-.05em]">{maxDiscount > 0 ? `Hasta ${maxDiscount}% OFF` : 'Ofertas seleccionadas'}</h2><p className="mt-1 text-xs text-black/50">Descuentos aplicados antes del checkout.</p></div><BadgePercent className="h-9 w-9 text-[#F5871F]" /></div></div></div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3"><MiniPromo icon={<Flame className="h-5 w-5" />} title="Ofertas activas" text={`${promos.length} productos con descuento`} /><MiniPromo icon={<Truck className="h-5 w-5" />} title="Despacho claro" text="Costo visible antes de pagar" /><MiniPromo icon={<ShieldCheck className="h-5 w-5" />} title="Precio final" text="El IVA ya viene incluido" /></section>

      {popular.length ? <section className="pt-12"><Heading eyebrow="Recomendados" title="Lo que más conviene mirar primero." /><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{popular.map(p=><Card key={p.id} p={p} added={added===p.id} open={()=>open(p)} add={(e)=>add(e,p)} />)}</div></section> : null}

      {promos.length ? <section className="pt-12"><Heading eyebrow="Promociones" title="Descuentos reales, sin letras pequeñas." /><div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-3">{promos.slice(0,8).map(p=><div key={p.id} className="min-w-[78vw] snap-start sm:min-w-[330px]"><Card p={p} added={added===p.id} open={()=>open(p)} add={(e)=>add(e,p)} /></div>)}</div></section> : null}

      <section id="catalogo" className="scroll-mt-24 pt-14"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><Heading eyebrow="Catálogo completo" title="Encuentra lo que necesitas rápido." /><p className="max-w-md text-sm leading-6 text-black/45">Busca por nombre, categoría o uso. La barra queda fija mientras recorres los productos.</p></div>
        <div className="sticky top-[70px] z-30 mt-6 rounded-[1.5rem] border border-black/5 bg-[#F4EFE6]/95 p-3 shadow-[0_16px_45px_rgba(30,24,16,.1)] backdrop-blur-xl"><label className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm"><Search className="h-5 w-5 text-[#F5871F]" /><input id="catalog-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar aire acondicionado, herramientas, materiales…" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" /><span className="rounded-full bg-black px-3 py-1 text-[9px] font-black text-white">{filtered.length}</span></label><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black transition ${category===c?'bg-black text-white':'bg-white text-black/45'}`}>{c}</button>)}</div></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map(p=><Card key={p.id} p={p} added={added===p.id} open={()=>open(p)} add={(e)=>add(e,p)} />)}</div>{filtered.length===0?<div className="mt-6 rounded-[2rem] bg-white p-10 text-center"><Search className="mx-auto h-8 w-8 text-black/20"/><h3 className="mt-4 text-2xl font-black">No encontramos coincidencias.</h3><button onClick={()=>{setQuery('');setCategory('Todos')}} className="mt-4 rounded-full bg-black px-5 py-3 text-xs font-black text-white">Limpiar búsqueda</button></div>:null}
      </section>
    </main>
    <footer className="bg-[#111214] px-5 pb-32 pt-8 text-white md:pb-8"><div className="mx-auto max-w-7xl"><StoreFabrickLogo tone="dark" branding={branding} compact/><p className="mt-3 max-w-md text-sm text-white/40">Compra con precio claro, IVA incluido y seguimiento de pago.</p></div></footer><StoreBottomNav />
  </div>;
}

function Card({ p, added, open, add }: { p:Product; added:boolean; open:()=>void; add:(e:MouseEvent)=>void }) { const d=discountOf(p); const rating=Math.max(0,Math.min(5,Number(p.rating||0))); const stock=stockOf(p); return <article className="group overflow-hidden rounded-[1.7rem] bg-white shadow-[0_18px_55px_rgba(30,24,16,.08)] transition hover:-translate-y-1"><button onClick={open} className="relative block aspect-[1.05/1] w-full overflow-hidden bg-[#EAE4D8]"><img src={imageOf(p)} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"/>{d>0?<span className="absolute left-3 top-3 rounded-full bg-[#F5871F] px-3 py-1.5 text-[9px] font-black text-black">-{d}%</span>:null}<span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black/45"><Heart className="h-4 w-4"/></span></button><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#B96F00]">{categoryOf(p)}</p><button onClick={open} className="mt-2 line-clamp-2 min-h-[2.8rem] text-left text-lg font-black leading-tight">{p.name}</button><div className="mt-2 flex items-center gap-1">{Array.from({length:5},(_,i)=><Star key={i} className={`h-3.5 w-3.5 ${i<Math.round(rating)?'fill-[#F5871F] text-[#F5871F]':'text-black/10'}`}/>)}<span className="ml-1 text-[10px] text-black/35">{rating||'Nuevo'}</span></div><p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-black/42">{p.tagline||p.description||'Producto seleccionado para tu proyecto.'}</p><div className="mt-4 flex items-end justify-between gap-3"><div><b className="block text-2xl tracking-[-.04em]">{CLP.format(priceOf(p))}</b>{d>0?<span className="text-[10px] text-black/30 line-through">{CLP.format(p.price)}</span>:<span className="text-[9px] font-bold uppercase tracking-[.12em] text-emerald-700">IVA incluido</span>}</div><button disabled={stock===0} onClick={add} className={`grid h-12 w-12 place-items-center rounded-full transition ${added?'bg-emerald-300 text-black':'bg-black text-white'} disabled:opacity-30`}>{added?<Check className="h-5 w-5"/>:<ShoppingCart className="h-4 w-4"/>}</button></div><button onClick={open} className="mt-4 flex w-full items-center justify-between border-t border-black/5 pt-3 text-[10px] font-black uppercase tracking-[.14em] text-black/45">Ver detalle <ChevronRight className="h-4 w-4"/></button></div></article>; }
function Heading({eyebrow,title}:{eyebrow:string;title:string}) { return <div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#B96F00]">{eyebrow}</p><h2 className="mt-2 max-w-[16ch] text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-5xl">{title}</h2></div>; }
function Benefit({icon,text}:{icon:React.ReactNode;text:string}) { return <div className="flex items-center gap-2 rounded-2xl bg-white/[.055] p-3 text-[10px] font-black uppercase tracking-[.12em] text-white/65"><span className="text-[#FFB000]">{icon}</span>{text}</div>; }
function MiniPromo({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="flex items-center gap-3 rounded-[1.5rem] bg-white p-4 shadow-[0_12px_35px_rgba(30,24,16,.06)]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFF0CC] text-[#B96F00]">{icon}</span><div><b className="text-sm">{title}</b><p className="mt-1 text-xs text-black/40">{text}</p></div></div>; }
