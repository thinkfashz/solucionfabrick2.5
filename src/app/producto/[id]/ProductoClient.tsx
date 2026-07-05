'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, Minus, Plus, ShoppingCart, Star, Truck, Zap } from 'lucide-react';
import { useRealtimeProducts, type Product } from '@/hooks/useRealtimeProducts';
import { useCartContext } from '@/context/CartContext';
import { formatCLP } from '@/hooks/useCart';
import { useSiteContent } from '@/hooks/useSiteContent';
import FavoriteButton from '@/components/store/FavoriteButton';

const GALLERY_SPEC_KEYS = new Set(['gallery', 'gallery_images', 'gallery_assets', 'images', 'image_urls']);

function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-black px-6 py-24 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 h-3 w-40 animate-pulse rounded-full bg-white/5" />
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-3xl bg-white/[0.04]" />
          <div className="space-y-5 pt-2">
            <div className="h-10 w-4/5 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-7 w-1/3 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-3 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
      <p className="select-none text-8xl font-black text-white/10">404</p>
      <h2 className="mt-4 text-2xl font-black text-white">Producto no encontrado</h2>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/35">Este producto no existe o fue eliminado del catálogo.</p>
      <Link href="/tienda" className="mt-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
        <ArrowLeft size={13} /> Ver productos
      </Link>
    </div>
  );
}

function cleanUrl(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function pushUnique(urls: string[], value: unknown) {
  const url = cleanUrl(value);
  if (url && !urls.includes(url)) urls.push(url);
}

function extractGalleryImages(product?: Product) {
  const urls: string[] = [];
  if (!product) return urls;
  pushUnique(urls, product.image_url);

  const specs = product.specifications ?? {};
  for (const key of GALLERY_SPEC_KEYS) {
    const value = specs[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (typeof item === 'string') pushUnique(urls, item);
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        pushUnique(urls, row.url ?? row.secure_url ?? row.src ?? row.image_url);
      }
    }
  }

  return urls;
}

function readableValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export default function ProductoClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { products, loading } = useRealtimeProducts();
  const { addToCart, openCart } = useCartContext();
  const productoCms = useSiteContent('producto');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const id = params?.id ?? '';
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const galleryImages = useMemo(() => extractGalleryImages(product), [product]);
  const mainImage = galleryImages[activeImage] || galleryImages[0] || '';

  useEffect(() => {
    setActiveImage(0);
    setQuantity(1);
  }, [id]);

  const hasDiscount = Boolean(product?.discount_percentage && product.discount_percentage > 0);
  const finalPrice = product ? Math.round(product.price * (1 - (product.discount_percentage || 0) / 100)) : 0;
  const outOfStock = typeof product?.stock === 'number' && product.stock < 1;
  const specEntries = product?.specifications
    ? Object.entries(product.specifications).filter(([key, value]) => !GALLERY_SPEC_KEYS.has(key) && readableValue(value))
    : [];

  function addSelectedToCart(goCheckout = false) {
    if (!product || outOfStock) return;
    const qty = Math.max(1, Math.min(99, quantity || 1));
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
    if (goCheckout) router.push('/checkout');
    else openCart();
  }

  if (loading) return <ProductSkeleton />;
  if (!product) return <NotFound />;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 pb-32 pt-24 md:px-10">
        <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-wide text-white/25" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-white/50">Inicio</Link>
          <ChevronRight size={9} className="text-white/10" />
          <Link href="/tienda" className="hover:text-white/50">Tienda</Link>
          <ChevronRight size={9} className="text-white/10" />
          <span className="max-w-[220px] truncate text-white/45">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-16">
          <section>
            <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
              {mainImage ? (
                <img src={mainImage} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-7xl font-black text-white/10">{product.name[0]}</div>
              )}
              {hasDiscount && <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1.5 text-xs font-black text-white">-{product.discount_percentage}%</span>}
              {product.featured && <span className="absolute right-4 top-4 rounded-full border border-yellow-400/25 bg-yellow-400/15 px-3 py-1.5 text-xs font-bold text-yellow-300">★ Destacado</span>}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.025] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Galería</p>
                  <p className="text-xs text-white/35">{galleryImages.length} imágenes</p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {galleryImages.map((src, index) => (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`h-24 w-24 shrink-0 overflow-hidden rounded-2xl border transition ${index === activeImage ? 'border-yellow-300 ring-2 ring-yellow-300/30' : 'border-white/10 opacity-65 hover:opacity-100'}`}
                      aria-label={`Ver imagen ${index + 1} de ${product.name}`}
                    >
                      <img src={src} alt={`${product.name} vista ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.06em] md:text-5xl">{product.name}</h1>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-black text-yellow-300">{formatCLP(finalPrice)}</span>
              {hasDiscount && <span className="text-base text-white/25 line-through">{formatCLP(product.price)}</span>}
            </div>

            {product.rating !== undefined && product.rating > 0 && (
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < Math.round(product.rating!) ? 'fill-yellow-400 text-yellow-400' : 'fill-white/[0.04] text-white/10'} />)}
                <span className="text-xs text-white/30">{product.rating.toFixed(1)}</span>
              </div>
            )}

            {product.description && <p className="text-sm leading-7 text-white/45">{product.description}</p>}

            <div className="flex flex-wrap gap-3">
              {outOfStock ? (
                <span className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{productoCms.outOfStockLabel}</span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><Check size={12} /> En stock {typeof product.stock === 'number' ? `· ${product.stock} disponibles` : ''}</span>
              )}
              {product.delivery_days && <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/45"><Truck size={12} /> Entrega en {product.delivery_days} días</span>}
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/45"><Truck size={12} /> Despacho: {product.shipping_fee != null ? formatCLP(Number(product.shipping_fee)) : 'sin costo definido'}</span>
            </div>

            {!outOfStock && (
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-widest text-white/40">Cantidad</span>
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03]">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="grid min-h-11 min-w-11 place-items-center text-white/60 hover:text-yellow-300" disabled={quantity <= 1}><Minus size={14} /></button>
                  <span className="min-w-9 text-center text-sm tabular-nums">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(typeof product.stock === 'number' ? product.stock : 99, q + 1))} className="grid min-h-11 min-w-11 place-items-center text-white/60 hover:text-yellow-300" disabled={typeof product.stock === 'number' && quantity >= product.stock}><Plus size={14} /></button>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => addSelectedToCart(false)} disabled={outOfStock} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white hover:border-yellow-300/40 disabled:opacity-40"><ShoppingCart size={16} />{added ? 'Agregado' : productoCms.addToCartLabel}</button>
              <button type="button" onClick={() => addSelectedToCart(true)} disabled={outOfStock} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 py-4 text-sm font-black text-black disabled:opacity-40"><Zap size={16} />Comprar ahora</button>
            </div>
            <FavoriteButton productId={product.id} variant="pill" />
          </section>
        </div>

        {specEntries.length > 0 && (
          <section className="mt-20 max-w-3xl" aria-label="Especificaciones del producto">
            <h2 className="mb-6 text-[10px] font-black uppercase tracking-[0.35em] text-white/30">Especificaciones</h2>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {specEntries.map(([key, value], i) => (
                <div key={key} className={`flex items-center justify-between gap-4 px-5 py-3.5 ${i % 2 === 0 ? 'bg-white/[0.025]' : 'bg-transparent'}`}>
                  <span className="text-sm capitalize text-white/35">{key.replace(/_/g, ' ')}</span>
                  <span className="max-w-[55%] text-right text-sm text-white/65">{readableValue(value)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
