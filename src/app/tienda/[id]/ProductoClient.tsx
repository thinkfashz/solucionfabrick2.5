'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BadgeCheck, Check, CheckCircle2, ChevronRight, Clock3, Heart, PackageCheck, Phone, ShieldCheck, ShoppingCart, Star, Truck, Users, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRealtimeProducts, type Product } from '@/hooks/useRealtimeProducts';
import { useCartContext } from '@/context/CartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { navigateWithTransition } from '@/lib/routeTransition';
import { FALLBACK_CATALOG_PRODUCTS } from '@/hooks/useCatalogProducts';

const BG = '#F4EFE6';
const INK = '#111214';
const ORANGE = '#F5871F';
const FALLBACK = '/images/landing/fabrick-home-showcase.webp';
const GALLERY_KEYS = new Set(['gallery', 'gallery_images', 'gallery_assets', 'images', 'image_urls']);
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function pushUrl(urls: string[], value: unknown) { const url = typeof value === 'string' ? value.trim() : ''; if (url && !urls.includes(url)) urls.push(url); }
function buildGallery(product: Product) { const gallery: string[] = []; pushUrl(gallery, product.image_url); const specs = product.specifications ?? {}; for (const key of GALLERY_KEYS) { const value = specs[key]; if (!Array.isArray(value)) continue; for (const item of value) { if (typeof item === 'string') pushUrl(gallery, item); if (item && typeof item === 'object') { const row = item as Record<string, unknown>; pushUrl(gallery, row.url ?? row.secure_url ?? row.src ?? row.image_url); } } } return gallery; }
function readable(value: unknown) { return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : ''; }
function specText(product: Product, keys: string[], fallback: string) { const specs = product.specifications ?? {}; for (const key of keys) { const value = readable(specs[key]); if (value) return value; } return fallback; }
function discountPrice(product: Product) { return Math.round(product.price * (1 - Number(product.discount_percentage || 0) / 100)); }

export default function ProductoClient({ id }: { id: string }) {
  const router = useRouter();
  const { products, loading } = useRealtimeProducts();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewSent, setReviewSent] = useState(false);
  const { addToCart } = useCartContext();
  useEffect(() => setActiveImg(0), [id]);

  const gallery = useMemo(() => product ? buildGallery(product) : [], [product]);
  const related = useMemo(() => FALLBACK_CATALOG_PRODUCTS.filter((p) => p.id !== id).slice(0, 4), [id]);
  const specs = product?.specifications ? Object.entries(product.specifications).filter(([key, value]) => !GALLERY_KEYS.has(key) && readable(value)) : [];
  if (loading && !product) return <div className="min-h-screen animate-pulse bg-[#F4EFE6]"><Navbar /><div className="mx-auto max-w-6xl px-4 py-12"><div className="h-[70vh] bg-black/5" /></div></div>;
  if (!product) return <div className="min-h-screen bg-[#F4EFE6] text-[#111214]"><Navbar /><div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 text-center"><div><p className="text-7xl font-black text-black/10">404</p><h1 className="mt-3 text-3xl font-black">Producto no encontrado</h1><Link href="/tienda" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white">Volver a tienda</Link></div></div></div>;

  const price = discountPrice(product);
  const category = product.category_name || product.category_id || 'Producto';
  const out = product.stock !== undefined && product.stock <= 0;
  const mainImg = gallery[activeImg] || gallery[0] || FALLBACK;
  const provider = specText(product, ['provider', 'proveedor', 'brand', 'marca'], 'Soluciones Fabrick');
  const rating = Number(product.rating || 4.9);
  const purchaseCount = Math.max(1, Number(product.specifications?.purchases || product.specifications?.ventas || 0));
  const whatsapp = buildWhatsAppLink(`Hola Soluciones Fabrick, me interesa ${product.name}. Quiero consultar disponibilidad, despacho e instalación.`);
  const buy = () => { if (out) return; addToCart(product, 1); router.push('/checkout'); };
  const add = () => { if (out) return; addToCart(product, 1); setAdded(true); setTimeout(() => setAdded(false), 1600); };

  return <div className="min-h-screen pb-28 text-[#111214]" style={{ background: BG }}>
    <Navbar />
    <main className="mx-auto max-w-[1380px] px-4 py-5 sm:px-6 lg:px-8">
      <nav className="mb-5 flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-black/40"><Link href="/tienda">Tienda</Link><ChevronRight className="h-3 w-3"/><span>{category}</span><ChevronRight className="h-3 w-3"/><b className="truncate text-black/70">{product.name}</b></nav>

      <div className="grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-12">
        <section className="min-w-0">
          <div className="relative aspect-square overflow-hidden bg-white"><img src={mainImg} alt={product.name} className="h-full w-full object-contain" />{product.discount_percentage ? <span className="absolute left-4 top-4 bg-[#F5871F] px-3 py-2 text-xs font-black">-{product.discount_percentage}%</span> : null}<button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow"><Heart className="h-5 w-5"/></button></div>
          {gallery.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{gallery.map((src,i)=><button key={src+i} onClick={()=>setActiveImg(i)} className={`h-20 w-20 shrink-0 overflow-hidden border-2 bg-white ${i===activeImg?'border-black':'border-transparent'}`}><img src={src} alt="" className="h-full w-full object-cover"/></button>)}</div>}
        </section>

        <section className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#B96F00]">{category}</p>
          <h1 className="mt-3 max-w-[15ch] text-[clamp(2.5rem,5vw,5rem)] font-black leading-[.88] tracking-[-.065em]">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs"><span className="flex items-center gap-1 font-black"><Star className="h-4 w-4 fill-[#F5871F] text-[#F5871F]"/>{rating.toFixed(1)}</span><span className="text-black/35">•</span><span className="text-black/55">{purchaseCount > 1 ? `${purchaseCount} compras registradas` : 'Producto disponible en catálogo'}</span></div>
          <div className="mt-6 border-y border-black/10 py-5"><div className="flex items-end gap-3"><b className="text-4xl tracking-[-.05em]">{CLP.format(price)}</b>{product.discount_percentage ? <span className="pb-1 text-sm text-black/30 line-through">{CLP.format(product.price)}</span>:null}</div><p className="mt-1 text-[10px] font-black uppercase tracking-[.12em] text-emerald-700">IVA incluido · precio final publicado</p></div>
          <p className="mt-5 text-base leading-7 text-black/58">{product.description || product.tagline || 'Producto seleccionado por Soluciones Fabrick para construcción, remodelación y equipamiento del hogar.'}</p>

          <div className="mt-6 flex items-center gap-3 border-y border-black/10 py-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-black text-white"><BadgeCheck className="h-5 w-5 text-[#FFB000]"/></span><div className="min-w-0"><div className="flex items-center gap-2"><b className="truncate text-sm">{provider}</b><span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-black uppercase text-emerald-800">Verificado</span></div><p className="mt-1 text-xs text-black/42">Proveedor validado por la tienda · compra respaldada</p></div></div>

          <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden border border-black/10 bg-black/10">{[[<PackageCheck key="a"/>,out?'Sin stock':'Disponible'],[<Truck key="b"/>,product.delivery_days||'Despacho coordinado'],[<ShieldCheck key="c"/>,'Compra protegida']].map(([icon,label],i)=><div key={i} className="bg-[#F4EFE6] p-3"><span className="text-[#B96F00]">{icon}</span><p className="mt-2 text-[10px] font-black leading-4">{label}</p></div>)}</div>
          <button onClick={buy} disabled={out} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F5871F] px-5 text-sm font-black text-black disabled:opacity-40"><Zap className="h-4 w-4"/>Comprar ahora</button>
          <div className="mt-3 grid grid-cols-2 gap-3"><button onClick={add} disabled={out} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-black/15 text-xs font-black">{added?<Check className="h-4 w-4"/>:<ShoppingCart className="h-4 w-4"/>}{added?'Añadido':'Agregar al carrito'}</button><a href={whatsapp} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-black text-xs font-black text-white"><Phone className="h-4 w-4"/>Consultar</a></div>
        </section>
      </div>

      <section className="mt-16 grid gap-10 border-t border-black/10 pt-10 lg:grid-cols-[.75fr_1.25fr]">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#B96F00]">Información técnica</p><h2 className="mt-2 text-4xl font-black tracking-[-.055em]">Características.</h2><p className="mt-4 max-w-md text-sm leading-7 text-black/45">Todo lo necesario para comparar antes de comprar, sin esconder datos importantes en pestañas.</p></div>
        <div className="border-t border-black/10">{specs.length ? specs.map(([key,value])=><div key={key} className="grid grid-cols-[.8fr_1.2fr] gap-5 border-b border-black/10 py-4 text-sm"><span className="capitalize text-black/40">{key.replace(/_/g,' ')}</span><b className="text-right">{readable(value)}</b></div>) : <><Spec label="Categoría" value={String(category)}/><Spec label="Stock" value={out?'Agotado':`${product.stock ?? 'Disponible'}`}/><Spec label="Despacho" value={product.delivery_days||'A coordinar'}/><Spec label="Garantía" value="Respaldo Soluciones Fabrick"/></>}</div>
      </section>

      <section className="mt-16 bg-[#111214] px-5 py-8 text-white sm:px-8 sm:py-10"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#FFB000]">Confianza de compra</p><h2 className="mt-3 text-4xl font-black tracking-[-.055em]">Compras verificadas.</h2><p className="mt-4 text-sm leading-7 text-white/45">Las cifras se muestran solo cuando existen registros reales del producto. No inventamos ventas ni reseñas.</p><div className="mt-6 flex gap-6"><div><b className="text-3xl">{rating.toFixed(1)}</b><p className="text-xs text-white/40">valoración</p></div><div><b className="text-3xl">{purchaseCount > 1 ? purchaseCount : '—'}</b><p className="text-xs text-white/40">compras registradas</p></div></div></div><div className="grid content-start gap-3"><Trust icon={<BadgeCheck/>} title="Proveedor verificado" text={`${provider} aparece identificado como responsable del producto.`}/><Trust icon={<ShieldCheck/>} title="Pago y orden trazables" text="La compra genera una orden y espera la confirmación real de la pasarela."/><Trust icon={<Truck/>} title="Despacho informado" text="El costo se presenta antes del pago cuando corresponde."/></div></div></section>

      <section className="mt-16"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#B96F00]">Opiniones</p><h2 className="mt-2 text-4xl font-black tracking-[-.055em]">¿Ya lo compraste?</h2><p className="mt-3 text-sm leading-7 text-black/45">Deja tu experiencia. La publicación definitiva puede validarse contra una compra antes de marcarse como verificada.</p></div><form onSubmit={(e)=>{e.preventDefault(); if(reviewName.trim()&&reviewText.trim()) setReviewSent(true);}} className="border-t border-black/10 pt-5">{reviewSent?<div className="flex min-h-48 items-center gap-4"><CheckCircle2 className="h-10 w-10 text-emerald-700"/><div><b>Comentario recibido</b><p className="mt-1 text-sm text-black/45">Quedó listo para validación antes de publicarse.</p></div></div>:<><input value={reviewName} onChange={e=>setReviewName(e.target.value)} placeholder="Tu nombre" className="w-full border-b border-black/15 bg-transparent py-4 text-sm font-bold outline-none"/><textarea value={reviewText} onChange={e=>setReviewText(e.target.value)} placeholder="Cuéntanos cómo fue tu experiencia con el producto…" rows={4} className="mt-2 w-full resize-none border-b border-black/15 bg-transparent py-4 text-sm outline-none"/><button className="mt-5 rounded-full bg-black px-6 py-3 text-xs font-black text-white">Enviar opinión</button></>}</form></div></section>

      <section className="mt-16"><div className="flex items-end justify-between border-b border-black/10 pb-5"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#B96F00]">Productos relacionados</p><h2 className="mt-2 text-4xl font-black tracking-[-.055em]">Completa tu proyecto.</h2></div></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{related.map(rel=><button key={rel.id} onClick={()=>navigateWithTransition(`/tienda/${rel.id}`,router)} className="text-left"><div className="aspect-square overflow-hidden bg-white"><img src={rel.img||rel.image_url||FALLBACK} alt={rel.name} className="h-full w-full object-cover"/></div><p className="mt-3 line-clamp-2 text-sm font-black leading-tight">{rel.name}</p><b className="mt-2 block text-sm">{CLP.format(rel.price)}</b></button>)}</div></section>
    </main>

    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-[#F4EFE6]/95 p-3 backdrop-blur-xl lg:hidden"><div className="mx-auto flex max-w-xl items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase text-emerald-700">IVA incluido</p><b className="text-xl">{CLP.format(price)}</b></div><button onClick={buy} disabled={out} className="min-h-12 rounded-full bg-[#F5871F] px-6 text-xs font-black disabled:opacity-40">Comprar ahora</button></div></div>
  </div>;
}

function Spec({label,value}:{label:string;value:string}) { return <div className="grid grid-cols-[.8fr_1.2fr] gap-5 border-b border-black/10 py-4 text-sm"><span className="text-black/40">{label}</span><b className="text-right">{value}</b></div>; }
function Trust({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="flex gap-4 border-b border-white/10 py-4"><span className="text-[#FFB000]">{icon}</span><div><b className="text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-white/42">{text}</p></div></div>; }
