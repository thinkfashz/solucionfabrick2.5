'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Minus, Plus, ShieldCheck, ShoppingCart, Star } from 'lucide-react';
import { useCartContext } from '@/context/CartContext';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { StoreBottomNav, StoreFabrickLogo, StorefrontHeader } from '@/components/store/StorefrontChrome';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const FALLBACK = '/images/landing/fabrick-home-showcase.webp';
function img(p: CatalogProduct) { return p.img || p.image_url || FALLBACK; }
function discount(p: CatalogProduct) { return Math.max(0, Number(p.discountPercentage ?? p.discount_percentage ?? 0)); }
function finalPrice(p: CatalogProduct) { return Math.round(Number(p.price || 0) * (1 - discount(p) / 100)); }

export default function ProductDetailClientV2() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { products } = useCatalogProducts();
  const { addToCart, openCart } = useCartContext();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const product = useMemo(() => products.find((item) => String(item.id) === String(params?.id)), [products, params?.id]);
  useEffect(() => { setQty(1); }, [params?.id]);
  if (!product) return <main className="min-h-screen bg-[#F4EFE6] px-5 py-20 text-center text-[#111214]"><p className="text-sm font-bold text-black/40">Cargando producto…</p></main>;
  const gross = finalPrice(product);
  const net = Math.round(gross / 1.19);
  const iva = gross - net;
  const d = discount(product);
  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
  const rating = Math.max(0, Math.min(5, Number(product.rating || 0)));
  function add() {
    if (stock === 0) return;
    for (let i = 0; i < qty; i++) addToCart({ id: product.id, name: product.name, price: product.price, image_url: img(product), category_id: product.category_id, discount_percentage: d, stock: product.stock } as Parameters<typeof addToCart>[0]);
    setAdded(true); window.setTimeout(() => setAdded(false), 1200);
  }
  return <div className="min-h-screen bg-[#F4EFE6] text-[#111214]">
    <StorefrontHeader onSearch={() => router.push('/tienda#catalogo')} />
    <main className="mx-auto max-w-6xl px-3 pb-32 pt-4 sm:px-6">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black/55"><ArrowLeft className="h-4 w-4"/> Volver</button>
      <section className="grid overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_90px_rgba(30,24,16,.1)] lg:grid-cols-2">
        <div className="bg-[#E8E0D4] p-3 sm:p-5"><img src={img(product)} alt={product.name} className="aspect-square w-full rounded-[1.6rem] object-cover" /></div>
        <div className="p-5 sm:p-8 lg:p-10"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">{product.category_name || product.category || 'Producto'}</p><h1 className="mt-3 text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-5xl">{product.name}</h1>
          <div className="mt-4 flex gap-1">{Array.from({length:5},(_,i)=><Star key={i} className={`h-4 w-4 ${i<Math.round(rating)?'fill-[#F5871F] text-[#F5871F]':'text-black/10'}`}/>)}</div>
          <p className="mt-5 text-sm leading-7 text-black/50">{product.description || product.tagline || 'Producto seleccionado para completar tu proyecto.'}</p>
          <div className="mt-7 rounded-[1.6rem] bg-[#111214] p-5 text-white"><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#FFB000]">Precio final · IVA incluido</p><div className="mt-2 flex items-end gap-3"><b className="text-4xl text-[#FFB000]">{CLP.format(gross)}</b>{d>0?<span className="pb-1 text-sm text-white/30 line-through">{CLP.format(product.price)}</span>:null}</div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs"><div><span className="text-white/35">Neto</span><b className="mt-1 block">{CLP.format(net)}</b></div><div><span className="text-white/35">IVA contenido</span><b className="mt-1 block">{CLP.format(iva)}</b></div></div><p className="mt-3 text-[10px] text-white/35">El IVA ya está dentro del precio. No se suma nuevamente al pagar.</p></div>
          <div className="mt-6 flex items-center gap-3"><div className="flex items-center rounded-2xl bg-[#F4EFE6] p-1"><button onClick={()=>setQty(q=>Math.max(1,q-1))} className="grid h-10 w-10 place-items-center"><Minus className="h-4 w-4"/></button><b className="w-9 text-center">{qty}</b><button onClick={()=>setQty(q=>stock==null?q+1:Math.min(stock,q+1))} className="grid h-10 w-10 place-items-center"><Plus className="h-4 w-4"/></button></div><span className="text-xs text-black/40">{stock===0?'Sin stock':stock==null?'Stock por confirmar':`${stock} disponibles`}</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={add} disabled={stock===0} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl font-black ${added?'bg-emerald-300':'bg-[#F5871F]'} disabled:opacity-35`}>{added?<Check className="h-5 w-5"/>:<ShoppingCart className="h-5 w-5"/>}{added?'Añadido':'Añadir al carrito'}</button><button onClick={()=>{add();openCart();}} disabled={stock===0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-black font-black text-white disabled:opacity-35"><ShieldCheck className="h-4 w-4"/> Comprar</button></div>
        </div>
      </section>
    </main>
    <footer className="bg-[#111214] px-5 pb-32 pt-8 text-white md:pb-8"><div className="mx-auto max-w-6xl"><StoreFabrickLogo tone="dark" branding={branding} compact /></div></footer><StoreBottomNav />
  </div>;
}
