'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Phone, ShieldCheck, ShoppingCart, Star, Truck, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRealtimeProducts, type Product } from '@/hooks/useRealtimeProducts';
import { useCartContext } from '@/context/CartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { navigateWithTransition } from '@/lib/routeTransition';
import { FALLBACK_CATALOG_PRODUCTS } from '@/hooks/useCatalogProducts';

const PAGE_BG = 'radial-gradient(circle at 20% -10%,rgba(255,210,41,.16),transparent 28rem), radial-gradient(circle at 90% 10%,rgba(255,210,41,.07),transparent 22rem), linear-gradient(180deg,#08090A 0%,#070706 55%,#08090A 100%)';
const CARD_BG = 'radial-gradient(circle at 80% 0%,rgba(255,210,41,.08),transparent 18rem), linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))';
const GALLERY_KEYS = new Set(['gallery', 'gallery_images', 'gallery_assets', 'images', 'image_urls']);

function Kicker({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-2.5 text-[#FFB000] text-[11px] font-black uppercase tracking-[0.34em]"><span className="block h-px w-8 shrink-0 bg-gradient-to-r from-[#FFB000] to-transparent" />{label}</span>;
}

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(value || 0));
}

function pushUrl(urls: string[], value: unknown) {
  const url = typeof value === 'string' ? value.trim() : '';
  if (url && !urls.includes(url)) urls.push(url);
}

function buildGallery(product: Product): string[] {
  const gallery: string[] = [];
  pushUrl(gallery, product.image_url);
  const specs = product.specifications ?? {};
  for (const key of GALLERY_KEYS) {
    const value = specs[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === 'string') pushUrl(gallery, item);
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        pushUrl(gallery, row.url ?? row.secure_url ?? row.src ?? row.image_url);
      }
    }
  }
  return gallery;
}

function readableValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export default function ProductoClient({ id }: { id: string }) {
  const router = useRouter();
  const { products, loading } = useRealtimeProducts();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const [activeImg, setActiveImg] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addToCart } = useCartContext();

  useEffect(() => setActiveImg(0), [id]);

  const gallery = useMemo(() => (product ? buildGallery(product) : []), [product]);
  const mainImg = gallery[activeImg] || gallery[0] || '';
  const outOfStock = product?.stock !== undefined && product.stock <= 0;
  const category = product?.category_name || product?.category_id || 'Producto';
  const whatsappHref = buildWhatsAppLink(`Hola Soluciones Fabrick, me interesa el producto ${product?.name ?? ''}. ¿Podemos revisar disponibilidad, despacho e instalación?`);
  const relatedProducts = useMemo(() => FALLBACK_CATALOG_PRODUCTS.filter((p) => p.id !== id).slice(0, 3), [id]);
  const specEntries = product?.specifications ? Object.entries(product.specifications).filter(([key, value]) => !GALLERY_KEYS.has(key) && readableValue(value)) : [];

  function buyNow() {
    if (!product || outOfStock) return;
    addToCart(product, 1);
    router.push('/checkout');
  }

  function addCart() {
    if (!product || outOfStock) return;
    addToCart(product, 1);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2200);
  }

  if (loading && !product) {
    return <div className="min-h-screen" style={{ color: '#FFF9EE', background: PAGE_BG }}><Navbar /><div className="mx-auto max-w-[1120px] px-4 pt-28 pb-32 md:px-8"><div className="mb-10 h-3 w-40 animate-pulse rounded-full bg-white/5" /><div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><div className="aspect-square animate-pulse rounded-[28px] bg-white/[0.04]" /><div className="space-y-4"><div className="h-10 w-4/5 animate-pulse rounded-lg bg-white/[0.04]" /><div className="h-6 w-1/3 animate-pulse rounded-lg bg-white/[0.04]" /><div className="h-3 w-full animate-pulse rounded-full bg-white/[0.04]" /><div className="h-14 w-full animate-pulse rounded-xl bg-white/[0.04]" /></div></div></div></div>;
  }

  if (!product) {
    return <div className="min-h-screen" style={{ color: '#FFF9EE', background: PAGE_BG }}><Navbar /><div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center"><p className="select-none text-7xl font-black text-white/10">404</p><h1 className="mt-4 text-2xl font-black uppercase tracking-tight">Producto no encontrado</h1><p className="mt-3 text-sm leading-relaxed" style={{ color: '#BFB8AC' }}>Este material no existe o ya no forma parte del catálogo activo.</p><Link href="/tienda" className="mt-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400 hover:bg-yellow-400/10">Volver al catálogo</Link></div></div>;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.12] bg-[rgba(7,7,6,0.92)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3"><span className="text-xl font-black text-[#FFB000]">{formatCLP(product.price)}</span><button onClick={buyNow} disabled={outOfStock} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#FFB000] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-yellow-300 disabled:opacity-40"><Zap size={13} /> Comprar ahora</button></div>
      </div>

      <div className="min-h-screen" style={{ color: '#FFF9EE', background: PAGE_BG }}>
        <Navbar />
        <main className="mx-auto max-w-[1120px] px-4 pb-36 pt-6 md:px-8 lg:pb-24">
          <nav className="mb-5 text-[13px]" style={{ color: '#7f766d' }}><Link href="/" className="transition hover:text-[#FFF9EE]">Inicio</Link>{' › '}<Link href="/tienda" className="transition hover:text-[#FFF9EE]">Catálogo</Link>{' › '}<span style={{ color: '#BFB8AC' }}>{category}</span></nav>

          <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="lg:sticky lg:top-[96px]">
              <div className="relative grid aspect-square min-h-[360px] place-items-center overflow-hidden rounded-[28px] border border-white/10" style={{ background: CARD_BG, boxShadow: '0 26px 80px rgba(0,0,0,.48)' }}>
                {product.featured && <span className="absolute left-5 top-5 z-10 rounded-full bg-yellow-400/95 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-black">Destacado</span>}
                {mainImg ? <img src={mainImg} alt={`${product.name} — imagen principal`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <span className="text-7xl font-black text-white/10">{product.name[0]}</span>}
              </div>

              {gallery.length > 1 && (
                <div className="mt-3 rounded-3xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FFB000]">Galería</p><p className="text-xs" style={{ color: '#7f766d' }}>{gallery.length} imágenes</p></div>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {gallery.map((src, i) => (
                      <button key={`${src}-${i}`} type="button" onClick={() => setActiveImg(i)} className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl transition ${i === activeImg ? 'ring-2 ring-[#FFB000]/60' : 'opacity-60 hover:opacity-100'}`} style={{ border: i === activeImg ? '1px solid rgba(255,210,41,0.5)' : '1px solid rgba(255,248,237,0.12)' }} aria-label={`Ver imagen ${i + 1} de ${product.name}`}>
                        <img src={src} alt={`${product.name} — vista ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-white/10 p-6 md:p-8" style={{ background: CARD_BG, boxShadow: '0 26px 80px rgba(0,0,0,.48)' }}>
              <Kicker label={String(category)} />
              {product.featured && <span className="mt-4 inline-flex rounded-full border border-yellow-400/25 bg-yellow-400/[0.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-400">Producto recomendado</span>}
              <h1 className="mt-4 font-black" style={{ fontSize: 'clamp(36px,6vw,70px)', lineHeight: 0.92, letterSpacing: '-0.075em', color: '#FFF9EE' }}>{product.name}</h1>
              <div className="mt-5 flex items-baseline gap-3"><span style={{ fontSize: 'clamp(42px,7vw,66px)', fontWeight: 900, color: '#FFB000', letterSpacing: '-0.06em', lineHeight: 1 }}>{formatCLP(product.price)}</span>{product.discount_percentage ? <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400">-{product.discount_percentage}% OFF</span> : null}</div>
              {product.description && <p className="mt-5 border-l-4 border-[#FFB000] pl-4 text-[17px] leading-[1.65]" style={{ color: '#ddd4c7' }}>{product.description}</p>}

              <div className="mt-5 flex flex-wrap gap-2.5">
                {outOfStock ? <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-400">Agotado</span> : <span className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ border: '1px solid rgba(35,209,139,0.25)', background: 'rgba(35,209,139,0.08)', color: '#23d18b' }}>Disponible · {product.stock ?? 'stock'} unid.</span>}
                {product.delivery_days && <span className="rounded-full px-3 py-1.5 text-[11px]" style={{ border: '1px solid rgba(255,248,237,0.10)', background: 'rgba(255,255,255,0.03)', color: '#BFB8AC' }}>{product.delivery_days}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]" style={{ border: '1px solid rgba(255,248,237,0.10)', background: 'rgba(255,255,255,0.03)', color: '#BFB8AC' }}><Truck size={12} />Despacho: {product.shipping_fee != null ? formatCLP(Number(product.shipping_fee)) : 'sin costo definido'}</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={buyNow} disabled={outOfStock} className="flex items-center justify-center gap-2 rounded-full py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-yellow-300 disabled:opacity-40" style={{ background: '#FFB000' }}><Zap size={13} /> Comprar ahora</button>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition" style={{ border: '1px solid rgba(255,248,237,0.14)', background: 'rgba(255,255,255,0.05)', color: '#FFF9EE' }}><Phone size={13} /> Cotizar instalación</a>
              </div>

              <button onClick={addCart} disabled={outOfStock} className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-50 ${addedToCart ? 'border border-[#23d18b]/40 bg-[#23d18b]/10 text-[#23d18b]' : 'border border-yellow-400/20 bg-transparent text-yellow-400 hover:bg-yellow-400/10'}`}>{addedToCart ? <CheckCircle2 size={13} /> : <ShoppingCart size={13} />}{addedToCart ? '¡Añadido al carrito!' : 'Añadir al carrito'}</button>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[{ icon: <ShieldCheck size={16} className="text-[#FFB000]" />, strong: 'Garantía real', small: 'Respaldo en cada compra' }, { icon: <Star size={16} className="text-[#FFB000]" />, strong: 'Compra protegida', small: 'Pago seguro y sin riesgos' }].map(({ icon, strong, small }) => <div key={strong} className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">{icon}<strong className="text-[13px] font-black leading-tight">{strong}</strong><small className="text-[11px]" style={{ color: '#BFB8AC' }}>{small}</small></div>)}
              </div>

              {specEntries.length > 0 && <div className="mt-7 overflow-hidden rounded-2xl border border-white/10">{specEntries.map(([key, value], index) => <div key={key} className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${index % 2 === 0 ? 'bg-white/[0.03]' : ''}`}><span className="capitalize" style={{ color: '#7f766d' }}>{key.replace(/_/g, ' ')}</span><span className="max-w-[55%] text-right" style={{ color: '#ddd4c7' }}>{readableValue(value)}</span></div>)}</div>}
            </section>
          </div>

          <section className="mt-8">
            <div className="mb-4"><Kicker label="Complementos" /><h2 className="mt-2 font-black" style={{ fontSize: 'clamp(30px,4vw,48px)', letterSpacing: '-0.06em', lineHeight: 1 }}>También te puede interesar</h2></div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">{relatedProducts.map((rel) => <button key={rel.id} type="button" onClick={() => navigateWithTransition(`/tienda/${rel.id}`, router)} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:opacity-80"><p className="text-sm font-black">{rel.name}</p><p className="mt-2 text-xs" style={{ color: '#BFB8AC' }}>{formatCLP(rel.price)}</p></button>)}</div>
          </section>
        </main>
      </div>
    </>
  );
}
