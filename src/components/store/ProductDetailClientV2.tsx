'use client';

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronRight, Heart, PackageCheck, ShieldCheck, ShoppingCart, Sparkles, Star, Truck } from 'lucide-react';
import { useCartContext } from '@/context/CartContext';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { navigateWithTransition } from '@/lib/routeTransition';
import { StoreBottomNav, StoreFabrickLogo, StorefrontHeader } from '@/components/store/StorefrontChrome';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

type Product = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  img?: string | null;
  description?: string | null;
  tagline?: string | null;
  category_id?: string | null;
  category?: string | null;
  category_name?: string | null;
  discount_percentage?: number | null;
  discountPercentage?: number | null;
  stock?: number | null;
  rating?: number | null;
  featured?: boolean | null;
  shipping_fee?: number | null;
  gallery?: string[] | null;
  images?: string[] | null;
  specifications?: Record<string, string | number | boolean | null> | null;
};

type RelatedProduct = Product;

type Props = {
  product: Product;
  related?: RelatedProduct[];
};

const FALLBACK = '/images/landing/fabrick-home-showcase.webp';
function imageOf(product: Product) { return product.img || product.image_url || FALLBACK; }
function categoryOf(product: Product) { return product.category_name || product.category || product.category_id || 'Producto'; }
function discountOf(product: Product) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function finalPrice(product: Product) { return Math.round(Number(product.price || 0) * (1 - discountOf(product) / 100)); }

export default function ProductDetailClientV2({ product, related = [] }: Props) {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { addToCart, openCart } = useCartContext();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(imageOf(product));
  const gross = finalPrice(product);
  const net = Math.round(gross / 1.19);
  const iva = gross - net;
  const discount = discountOf(product);
  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
  const rating = Math.max(0, Math.min(5, Number(product.rating || 0)));
  const gallery = useMemo(() => Array.from(new Set([imageOf(product), ...(product.gallery || []), ...(product.images || [])])).filter(Boolean), [product]);
  const specs = Object.entries(product.specifications || {}).filter(([, value]) => value !== null && value !== undefined && value !== '');

  function add() {
    if (stock === 0) return;
    for (let index = 0; index < quantity; index++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: imageOf(product),
        category_id: categoryOf(product),
        discount_percentage: discount,
        stock: product.stock,
        description: product.description || undefined,
        tagline: product.tagline || undefined,
      } as Parameters<typeof addToCart>[0]);
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  function buyNow() {
    add();
    window.setTimeout(() => navigateWithTransition('/checkout', router), 120);
  }

  return <div className="min-h-screen bg-[#F4EFE6] text-[#111214]">
    <StorefrontHeader onSearch={() => navigateWithTransition('/tienda#catalogo', router)} />
    <main className="mx-auto max-w-[1360px] px-3 pb-32 pt-4 sm:px-6 lg:px-8">
      <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-black/55 shadow-sm"><ArrowLeft className="h-4 w-4" /> Volver</button>

      <section className="grid overflow-hidden rounded-[2.2rem] bg-white shadow-[0_28px_90px_rgba(30,24,16,.10)] lg:grid-cols-[1.08fr_.92fr]">
        <div className="bg-[#E9E2D7] p-3 sm:p-5">
          <div className="relative overflow-hidden rounded-[1.7rem] bg-[#DCD2C4]">
            <img src={activeImage} alt={product.name} className="aspect-[1.08/1] h-full w-full object-cover" />
            {discount > 0 ? <span className="absolute left-4 top-4 rounded-full bg-[#F5871F] px-4 py-2 text-xs font-black text-black">-{discount}%</span> : null}
            <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-black/50 shadow"><Heart className="h-5 w-5" /></button>
          </div>
          {gallery.length > 1 ? <div className="mt-3 flex gap-2 overflow-x-auto">{gallery.map((src) => <button key={src} onClick={() => setActiveImage(src)} className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${activeImage === src ? 'border-[#F5871F]' : 'border-transparent'}`}><img src={src} alt="" className="h-full w-full object-cover" /></button>)}</div> : null}
        </div>

        <div className="flex flex-col p-5 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#FFF0CC] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-[#A86400]">{categoryOf(product)}</span>{product.featured ? <span className="rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[.16em] text-white">Destacado</span> : null}</div>
          <h1 className="mt-5 text-4xl font-black leading-[.94] tracking-[-.06em] sm:text-5xl">{product.name}</h1>
          <div className="mt-4 flex items-center gap-2">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.round(rating) ? 'fill-[#F5871F] text-[#F5871F]' : 'text-black/10'}`} />)}<span className="text-xs text-black/40">{rating || 'Producto nuevo'}</span></div>
          <p className="mt-5 text-sm leading-7 text-black/55">{product.description || product.tagline || 'Producto seleccionado para completar tu proyecto con compra y seguimiento desde la plataforma.'}</p>

          <div className="mt-7 rounded-[1.7rem] bg-[#111214] p-5 text-white">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Precio final · IVA incluido</p>
            <div className="mt-2 flex flex-wrap items-end gap-3"><b className="text-4xl tracking-[-.055em] text-[#FFB000]">{CLP.format(gross)}</b>{discount > 0 ? <span className="pb-1 text-sm text-white/30 line-through">{CLP.format(product.price)}</span> : null}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4"><div><span className="text-[9px] uppercase tracking-[.12em] text-white/35">Neto referencial</span><b className="mt-1 block text-sm">{CLP.format(net)}</b></div><div><span className="text-[9px] uppercase tracking-[.12em] text-white/35">IVA contenido (19%)</span><b className="mt-1 block text-sm">{CLP.format(iva)}</b></div></div>
            <p className="mt-3 text-[10px] leading-5 text-white/40">El IVA está contenido dentro del precio publicado. No se vuelve a sumar en el checkout.</p>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3"><Trust icon={<ShieldCheck className="h-4 w-4" />} text="Compra protegida" /><Trust icon={<Truck className="h-4 w-4" />} text="Despacho visible" /><Trust icon={<PackageCheck className="h-4 w-4" />} text="Stock confirmado" /></div>

          <div className="mt-7 flex items-center gap-3"><div className="flex h-13 items-center rounded-2xl bg-[#F4EFE6] px-2"><button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-10 w-10 place-items-center text-xl">−</button><b className="w-10 text-center">{quantity}</b><button onClick={() => setQuantity((value) => stock == null ? value + 1 : Math.min(stock, value + 1))} className="grid h-10 w-10 place-items-center text-xl">+</button></div><span className="text-xs text-black/40">{stock === 0 ? 'Sin stock' : stock == null ? 'Disponibilidad por confirmar' : `${stock} disponibles`}</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2"><button disabled={stock === 0} onClick={add} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl font-black transition ${added ? 'bg-emerald-300 text-black' : 'bg-[#F5871F] text-black'} disabled:opacity-35`}>{added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}{added ? 'Añadido' : 'Añadir al carrito'}</button><button disabled={stock === 0} onClick={buyNow} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-black font-black text-white disabled:opacity-35">Comprar ahora <ChevronRight className="h-4 w-4" /></button></div>

          {specs.length ? <div className="mt-8 border-t border-black/8 pt-6"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Ficha del producto</p><dl className="mt-3 divide-y divide-black/6">{specs.slice(0, 8).map(([key, value]) => <div key={key} className="flex justify-between gap-5 py-3 text-xs"><dt className="text-black/45">{key}</dt><dd className="text-right font-black">{String(value)}</dd></div>)}</dl></div> : null}
        </div>
      </section>

      {related.length ? <section className="pt-12"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">También puede servirte</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em]">Completa tu compra.</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.slice(0,4).map((item) => <button key={item.id} onClick={() => navigateWithTransition(`/tienda/${item.id}`, router)} className="overflow-hidden rounded-[1.5rem] bg-white text-left shadow-sm"><img src={imageOf(item)} alt={item.name} className="aspect-square w-full object-cover" /><div className="p-4"><b className="line-clamp-2 text-sm">{item.name}</b><span className="mt-2 block text-lg font-black text-[#A86400]">{CLP.format(finalPrice(item))}</span></div></button>)}</div></section> : null}
    </main>
    <footer className="bg-[#111214] px-5 pb-32 pt-8 text-white md:pb-8"><div className="mx-auto max-w-7xl"><StoreFabrickLogo tone="dark" branding={branding} compact /><button onClick={openCart} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-white/60"><ShoppingCart className="h-4 w-4" /> Abrir carrito</button></div></footer>
    <StoreBottomNav />
  </div>;
}

function Trust({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-2 rounded-2xl bg-[#F4EFE6] p-3 text-[10px] font-black uppercase tracking-[.08em] text-black/55"><span className="text-[#B96F00]">{icon}</span>{text}</div>; }
