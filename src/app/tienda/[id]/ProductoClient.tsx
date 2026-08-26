'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Check, CheckCircle2, ChevronDown, ChevronRight, Heart, Minus, PackageCheck, Plus, Search, Share2, ShieldCheck, ShoppingCart, Star, Truck, Undo2, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRealtimeProducts, type Product } from '@/hooks/useRealtimeProducts';
import { useCartContext } from '@/context/CartContext';
import { navigateWithTransition } from '@/lib/routeTransition';
import { FALLBACK_CATALOG_PRODUCTS } from '@/hooks/useCatalogProducts';

const BG = '#F4EFE6';
const ORANGE = '#F5871F';
const FALLBACK = '/images/landing/fabrick-home-showcase.webp';
const GALLERY_KEYS = new Set(['gallery', 'gallery_images', 'gallery_assets', 'images', 'image_urls']);
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function pushUrl(urls: string[], value: unknown) { const url = typeof value === 'string' ? value.trim() : ''; if (url && !urls.includes(url)) urls.push(url); }
function buildGallery(product: Product) { const gallery: string[] = []; pushUrl(gallery, product.image_url); const specs = product.specifications ?? {}; for (const key of GALLERY_KEYS) { const value = specs[key]; if (!Array.isArray(value)) continue; for (const item of value) { if (typeof item === 'string') pushUrl(gallery, item); if (item && typeof item === 'object') { const row = item as Record<string, unknown>; pushUrl(gallery, row.url ?? row.secure_url ?? row.src ?? row.image_url); } } } return gallery; }
function readable(value: unknown) { return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''; }
function specText(product: Product, keys: string[], fallback: string) { const specs = product.specifications ?? {}; for (const key of keys) { const value = readable(specs[key]); if (value) return value; } return fallback; }
function finalPrice(product: Product) { return Math.round(product.price * (1 - Number(product.discount_percentage || 0) / 100)); }

export default function ProductoClient({ id }: { id: string }) {
  const router = useRouter();
  const { products, loading } = useRealtimeProducts();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewSent, setReviewSent] = useState(false);
  const { addToCart } = useCartContext();
  useEffect(() => { setActiveImg(0); setQty(1); }, [id]);

  const gallery = useMemo(() => product ? buildGallery(product) : [], [product]);
  const related = useMemo(() => FALLBACK_CATALOG_PRODUCTS.filter((p) => p.id !== id).slice(0, 6), [id]);
  const specs = product?.specifications ? Object.entries(product.specifications).filter(([key, value]) => !GALLERY_KEYS.has(key) && readable(value)) : [];

  if (loading && !product) return <div className="min-h-screen animate-pulse bg-[#F4EFE6]"><Navbar /><div className="mx-auto max-w-6xl px-4 py-10"><div className="h-[75vh] bg-black/5" /></div></div>;
  if (!product) return <div className="min-h-screen bg-[#F4EFE6] text-[#111214]"><Navbar /><div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 text-center"><div><p className="text-7xl font-black text-black/10">404</p><h1 className="mt-3 text-3xl font-black">Producto no encontrado</h1><Link href="/tienda" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white">Volver a tienda</Link></div></div></div>;

  const price = finalPrice(product);
  const category = product.category_name || product.category_id || 'Producto';
  const stock = Math.max(0, Number(product.stock ?? 0));
  const out = product.stock !== undefined && stock <= 0;
  const maxQty = product.stock !== undefined ? Math.max(1, stock) : 99;
  const mainImg = gallery[activeImg] || gallery[0] || FALLBACK;
  const provider = specText(product, ['provider', 'proveedor', 'brand', 'marca'], 'Soluciones Fabrick');
  const rating = Number(product.rating || 4.9);
  const purchaseCount = Math.max(0, Number(product.specifications?.purchases || product.specifications?.ventas || 0));
  const delivery = product.delivery_days || 'Despacho coordinado después de la compra';

  function add() { if (out) return; addToCart(product, qty); setAdded(true); setTimeout(() => setAdded(false), 1600); }
  function buy() { if (out) return; addToCart(product, qty); router.push('/checkout'); }

  return <div className="min-h-screen pb-24 text-[#111214]" style={{ background: BG }}>
    <Navbar />

    <div className="sticky top-0 z-40 border-b border-black/8 bg-[#F4EFE6]/95 px-4 py-3 backdrop-blur-xl md:hidden">
      <div className="flex items-center justify-between"><button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full bg-white"><ArrowLeft className="h-5 w-5" /></button><div className="flex gap-2"><button className="grid h-10 w-10 place-items-center rounded-full bg-white"><Search className="h-5 w-5" /></button><button className="grid h-10 w-10 place-items-center rounded-full bg-white"><Share2 className="h-5 w-5" /></button></div></div>
    </div>

    <main className="mx-auto max-w-[1320px] md:px-6 lg:px-8">
      <div className="hidden py-5 text-xs text-black/40 md:flex md:items-center md:gap-2"><Link href="/tienda">Tienda</Link><ChevronRight className="h-3 w-3"/><span>{category}</span><ChevronRight className="h-3 w-3"/><b className="truncate text-black/70">{product.name}</b></div>

      <div className="grid items-start gap-0 bg-white md:gap-10 md:bg-transparent lg:grid-cols-[1.04fr_.96fr]">
        <section className="min-w-0 bg-white">
          <div className="relative aspect-square w-full overflow-hidden"><img src={mainImg} alt={product.name} className="h-full w-full object-contain" />{gallery.length > 1 ? <span className="absolute bottom-4 right-4 rounded-full bg-black/65 px-3 py-1 text-xs font-black text-white">{activeImg + 1} / {gallery.length}</span> : null}<button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow-sm"><Heart className="h-5 w-5 text-[#F5871F]"/></button></div>
          {gallery.length > 1 && <div className="hidden gap-2 overflow-x-auto border-t border-black/8 p-3 md:flex">{gallery.map((src,i)=><button key={src+i} onClick={()=>setActiveImg(i)} className={`h-20 w-20 shrink-0 overflow-hidden border-2 ${i===activeImg?'border-[#F5871F]':'border-transparent'}`}><img src={src} alt="" className="h-full w-full object-cover"/></button>)}</div>}
        </section>

        <section className="bg-white px-5 pb-8 pt-6 md:sticky md:top-5 md:self-start md:px-7 md:py-7">
          <div className="flex items-center gap-2 text-[11px] text-black/48"><span>{category}</span>{product.featured ? <><span>•</span><span className="font-black text-[#B96F00]">Destacado</span></> : null}</div>
          <h1 className="mt-3 text-[clamp(1.6rem,4vw,2.8rem)] font-medium leading-[1.05] tracking-[-.035em]">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm"><Star className="h-4 w-4 fill-[#F5871F] text-[#F5871F]"/><b>{rating.toFixed(1)}</b>{purchaseCount > 0 ? <><span className="text-black/30">|</span><b>{purchaseCount}+ vendidos</b></> : null}</div>

          {product.discount_percentage ? <span className="mt-5 inline-flex rounded bg-[#F5871F] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] text-black">Oferta especial</span> : null}
          {product.discount_percentage ? <p className="mt-3 text-xl text-black/38 line-through">{CLP.format(product.price)}</p> : null}
          <div className="mt-1 flex items-end gap-2"><b className="text-[clamp(2.7rem,7vw,4rem)] font-medium leading-none tracking-[-.045em]">{CLP.format(price)}</b>{product.discount_percentage ? <span className="mb-1 rounded bg-emerald-600 px-2 py-1 text-xs font-black text-white">{product.discount_percentage}% OFF</span> : null}</div>
          <p className="mt-2 text-sm font-bold text-emerald-700">IVA incluido en el precio publicado</p>

          <div className="mt-6 border-t border-black/8 pt-5"><p className="flex items-start gap-3 text-sm leading-6"><Truck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"/><span><b className="text-emerald-700">{delivery}</b><br/><span className="text-black/45">El costo exacto se informa antes de pagar.</span></span></p></div>

          <div className="mt-6"><p className="text-sm font-black">Stock {out ? 'agotado' : 'disponible'}</p>{!out?<div className="mt-3 flex items-center justify-between rounded-2xl bg-black/[.035] px-4 py-3"><span className="text-sm">Cantidad</span><div className="flex items-center gap-4"><button onClick={()=>setQty(q=>Math.max(1,q-1))} className="grid h-8 w-8 place-items-center rounded-full bg-white"><Minus className="h-4 w-4"/></button><b>{qty}</b><button onClick={()=>setQty(q=>Math.min(maxQty,q+1))} className="grid h-8 w-8 place-items-center rounded-full bg-white"><Plus className="h-4 w-4"/></button></div></div>:null}</div>

          <button onClick={buy} disabled={out} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F5871F] text-base font-black text-black disabled:opacity-35"><Zap className="h-5 w-5"/>Comprar ahora</button>
          <button onClick={add} disabled={out} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFE2C4] text-base font-black text-[#B85F00] disabled:opacity-35">{added?<Check className="h-5 w-5"/>:<ShoppingCart className="h-5 w-5"/>}{added?'Añadido al carrito':'Agregar al carrito'}</button>

          <div className="relative mt-5 border border-black/10 bg-[#FBF8F2] p-4"><span className="absolute -top-2 left-8 h-4 w-4 rotate-45 border-l border-t border-black/10 bg-[#FBF8F2]"/><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Truck className="h-5 w-5"/></span><p className="text-sm leading-6"><b>Compra varios productos y optimiza el despacho.</b><br/><span className="text-black/45">Agrupa productos compatibles en una sola orden.</span></p></div></div>
        </section>
      </div>

      <section className="mt-3 bg-white px-5 py-7 md:mt-8 md:px-8">
        <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#F4EFE6] text-lg font-black">{provider.slice(0,2).toUpperCase()}</span><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="truncate text-xl font-black">{provider}</h2><BadgeCheck className="h-5 w-5 text-[#F5871F]"/></div><p className="mt-1 text-sm text-black/45">Proveedor verificado por Soluciones Fabrick</p></div></div>
        <div className="mt-6 grid gap-5 border-t border-black/8 pt-5 sm:grid-cols-3"><Info icon={<Undo2/>} title="Devolución coordinada" text="Gestionamos incidencias y devoluciones según las condiciones del producto."/><Info icon={<ShieldCheck/>} title="Compra protegida" text="La orden y el estado del pago quedan registrados dentro de la plataforma."/><Info icon={<PackageCheck/>} title="Proveedor identificado" text="La ficha muestra quién provee o respalda el producto."/></div>
      </section>

      <section className="mt-3 bg-white px-5 py-7 md:mt-8 md:px-8"><button onClick={()=>setDetailsOpen(v=>!v)} className="flex w-full items-center justify-between text-left"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Detalles del producto</p><h2 className="mt-2 text-3xl font-black tracking-[-.045em]">Descripción y características</h2></div><ChevronDown className={`h-6 w-6 transition ${detailsOpen?'rotate-180':''}`}/></button>{detailsOpen?<div className="mt-6 border-t border-black/8 pt-5"><p className="text-base leading-8 text-black/65">{product.description || product.tagline || 'Producto seleccionado para construcción, remodelación y equipamiento del hogar.'}</p><div className="mt-7 border-t border-black/8">{specs.length?specs.map(([k,v])=><div key={k} className="grid grid-cols-[.8fr_1.2fr] gap-5 border-b border-black/8 py-4 text-sm"><span className="capitalize text-black/40">{k.replace(/_/g,' ')}</span><b className="text-right">{readable(v)}</b></div>):<><Spec label="Categoría" value={String(category)}/><Spec label="Stock" value={out?'Agotado':String(product.stock ?? 'Disponible')}/><Spec label="Entrega" value={delivery}/><Spec label="Garantía" value="Respaldo Soluciones Fabrick"/></>}</div></div>:null}</section>

      <section className="mt-3 bg-white px-5 py-7 md:mt-8 md:px-8"><div className="flex items-end justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Opiniones</p><h2 className="mt-2 text-3xl font-black tracking-[-.045em]">Experiencias de compra</h2></div><div className="text-right"><b className="text-3xl">{rating.toFixed(1)}</b><p className="text-xs text-black/40">valoración</p></div></div><div className="mt-6 border-t border-black/8 pt-6"><p className="text-sm leading-6 text-black/48">Solo mostraremos comentarios como “compra verificada” cuando podamos asociarlos a una orden pagada real.</p><form onSubmit={e=>{e.preventDefault();if(reviewName.trim()&&reviewText.trim())setReviewSent(true)}} className="mt-5">{reviewSent?<div className="flex min-h-36 items-center gap-4"><CheckCircle2 className="h-10 w-10 text-emerald-700"/><div><b>Opinión recibida</b><p className="mt-1 text-sm text-black/45">Quedó pendiente de validación.</p></div></div>:<><input value={reviewName} onChange={e=>setReviewName(e.target.value)} placeholder="Tu nombre" className="w-full border-b border-black/12 bg-transparent py-4 text-sm font-bold outline-none"/><textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} rows={3} placeholder="¿Cómo fue tu experiencia con este producto?" className="mt-2 w-full resize-none border-b border-black/12 bg-transparent py-4 text-sm outline-none"/><button className="mt-5 rounded-full bg-black px-6 py-3 text-xs font-black text-white">Enviar opinión</button></>}</form></div></section>

      <section className="mt-3 bg-[#EEEDEB] px-3 py-8 md:mt-8 md:px-8"><div className="mx-auto max-w-[1200px]"><div className="flex items-center gap-4"><span className="h-px flex-1 bg-black/20"/><h2 className="text-lg font-black">También podrían gustarte</h2><span className="h-px flex-1 bg-black/20"/></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{related.map(rel=><button key={rel.id} onClick={()=>navigateWithTransition(`/tienda/${rel.id}`,router)} className="overflow-hidden bg-white text-left"><div className="relative aspect-square"><img src={rel.img||rel.image_url||FALLBACK} alt={rel.name} className="h-full w-full object-cover"/><span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow"><ShoppingCart className="h-4 w-4 text-[#F5871F]"/></span></div><div className="p-3"><p className="line-clamp-2 min-h-[2.4rem] text-sm leading-tight">{rel.name}</p><b className="mt-2 block text-lg">{CLP.format(rel.price)}</b>{Number(rel.discount_percentage||0)>0?<span className="mt-1 inline-block text-xs font-black text-emerald-700">{rel.discount_percentage}% OFF</span>:null}</div></button>)}</div></div></section>
    </main>

    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/96 p-3 backdrop-blur-xl md:hidden"><div className="mx-auto flex max-w-xl items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase text-emerald-700">IVA incluido</p><b className="text-xl">{CLP.format(price)}</b></div><button onClick={buy} disabled={out} className="min-h-12 rounded-2xl bg-[#F5871F] px-6 text-xs font-black disabled:opacity-35">Comprar ahora</button></div></div>
  </div>;
}

function Spec({label,value}:{label:string;value:string}) { return <div className="grid grid-cols-[.8fr_1.2fr] gap-5 border-b border-black/8 py-4 text-sm"><span className="text-black/40">{label}</span><b className="text-right">{value}</b></div>; }
function Info({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="flex gap-3"><span className="mt-0.5 text-[#B96F00] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><b className="text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-black/45">{text}</p></div></div>; }
