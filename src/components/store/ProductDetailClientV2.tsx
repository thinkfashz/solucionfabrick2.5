'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  CreditCard,
  Minus,
  PackageCheck,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Star,
  Truck,
} from 'lucide-react';
import { CART_SESSION_KEY, useCartContext } from '@/context/CartContext';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import StoreFooter from '@/components/store/StoreFooter';
import { displayProductName, finalProductPrice, toCartProduct } from '@/components/store/featuredProducts';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const FALLBACK = '/images/landing/fabrick-home-showcase.webp';

function img(product: CatalogProduct) { return product.img || product.image_url || FALLBACK; }
function discount(product: CatalogProduct) { return Math.max(0, Number(product.discountPercentage ?? product.discount_percentage ?? 0)); }
function isPrimitive(value: unknown): value is string | number | boolean { return ['string', 'number', 'boolean'].includes(typeof value); }
function humanizeKey(key: string) { return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function galleryFor(product: CatalogProduct) {
  const candidates: string[] = [img(product)];
  const specs = product.specifications ?? {};
  for (const key of ['gallery', 'images', 'imagenes', 'imágenes']) {
    const value = specs[key];
    if (Array.isArray(value)) {
      value.forEach((entry) => { if (typeof entry === 'string' && entry.trim()) candidates.push(entry.trim()); });
    }
  }
  return Array.from(new Set(candidates)).slice(0, 6);
}

function specificationRows(product: CatalogProduct) {
  const ignored = new Set(['merchandising', 'gallery', 'images', 'imagenes', 'imágenes']);
  const rows = Object.entries(product.specifications ?? {}).flatMap(([key, value]) => {
    if (ignored.has(key)) return [];
    if (isPrimitive(value)) return [[humanizeKey(key), String(value)] as [string, string]];
    if (Array.isArray(value) && value.length && value.every(isPrimitive)) return [[humanizeKey(key), value.map(String).join(' · ')] as [string, string]];
    return [];
  });
  if (product.dimensions && product.dimensions !== 'Especificación en ficha técnica' && !rows.some(([key]) => key.toLowerCase().includes('medid'))) rows.unshift(['Medidas', product.dimensions]);
  if (!rows.some(([key]) => key.toLowerCase().includes('categor'))) rows.push(['Categoría', product.category]);
  return rows.slice(0, 10);
}

function RelatedCard({ product, onOpen }: { product: CatalogProduct; onOpen: () => void }) {
  const price = finalProductPrice(product);
  const d = discount(product);
  return <article className="min-w-0 bg-white">
    <button type="button" onClick={onOpen} className="relative block aspect-square w-full overflow-hidden bg-[#F7F4EE] p-3 text-left">
      <img src={img(product)} alt={displayProductName(product.name)} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-500 hover:scale-[1.035]" />
      {d > 0 ? <span className="absolute left-2 top-2 rounded-full bg-[#F5871F] px-2 py-1 text-[9px] font-black">-{d}%</span> : null}
    </button>
    <div className="p-3">
      <p className="text-[8px] font-black uppercase tracking-[.12em] text-[#B96F00]">{product.category}</p>
      <button type="button" onClick={onOpen} className="mt-1 line-clamp-2 min-h-[2.3rem] text-left text-xs font-black leading-[1.15] sm:text-sm">{displayProductName(product.name)}</button>
      <b className="mt-3 block text-lg tracking-[-.03em]">{CLP.format(price)}</b>
      <span className="mt-1 block text-[8px] font-black uppercase tracking-[.1em] text-emerald-700">IVA incluido</span>
    </div>
  </article>;
}

export default function ProductDetailClientV2() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { products, loading } = useCatalogProducts();
  const { items, addToCart, closeCart } = useCartContext();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const product = useMemo(() => products.find((item) => String(item.id) === String(params?.id)), [products, params?.id]);

  useEffect(() => {
    setQty(1);
    setSelectedImage('');
  }, [params?.id]);

  const related = useMemo(() => {
    if (!product) return [];
    const sameCategory = products.filter((item) => item.id !== product.id && item.category === product.category);
    const others = products.filter((item) => item.id !== product.id && item.category !== product.category);
    return [...sameCategory, ...others].slice(0, 4);
  }, [product, products]);

  if (!product) return <main className="min-h-screen bg-[#F4EFE6] px-5 py-20 text-center text-[#111214]"><p className="text-sm font-bold text-black/40">{loading ? 'Cargando producto…' : 'Este producto ya no está disponible.'}</p><button type="button" onClick={() => router.push('/tienda')} className="mt-4 rounded-full bg-[#111214] px-5 py-3 text-xs font-black text-white">Volver a la tienda</button></main>;

  const gross = finalProductPrice(product);
  const net = Math.round(gross / 1.19);
  const iva = gross - net;
  const d = discount(product);
  const stock = Number.isFinite(Number(product.stock)) ? Number(product.stock) : null;
  const rating = Math.max(0, Math.min(5, Number(product.rating || 0)));
  const gallery = galleryFor(product);
  const specs = specificationRows(product);
  const visibleImage = selectedImage || gallery[0];
  const productName = displayProductName(product.name);
  const shippingText = product.shipping_fee === 0 ? 'Despacho configurado sin costo' : product.shipping_fee != null ? `Despacho configurado desde ${CLP.format(product.shipping_fee)}` : 'El costo final de despacho se calcula según la configuración del producto y la región.';
  const cartProductValue = toCartProduct(product);

  function add(openCheckout = false) {
    if (stock === 0) return;
    const nextProduct = cartProductValue;
    addToCart(nextProduct, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
    if (!openCheckout) return;

    const index = items.findIndex((item) => item.product.id === nextProduct.id);
    const nextItems = index === -1
      ? [...items, { product: nextProduct, quantity: qty }]
      : items.map((item, itemIndex) => itemIndex === index ? { ...item, product: nextProduct, quantity: item.quantity + qty } : item);
    try { sessionStorage.setItem(CART_SESSION_KEY, JSON.stringify(nextItems)); } catch {}
    closeCart();
    router.push('/checkout?cart=1');
  }

  return <div className="min-h-screen bg-[#F4EFE6] text-[#111214]">
    <StorefrontHeader onSearch={() => router.push('/tienda#catalogo')} />

    <main className="mx-auto max-w-[1260px] px-3 pb-32 pt-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button type="button" onClick={() => router.back()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-black/8 bg-white px-4 text-xs font-black text-black/55"><ArrowLeft className="h-4 w-4"/> Volver</button>
        <span className="text-[9px] font-black uppercase tracking-[.14em] text-black/35">Código · {product.id}</span>
      </div>

      <section className="overflow-hidden bg-white shadow-[0_28px_90px_rgba(30,24,16,.09)] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,.95fr)]">
        <div className="border-b border-black/8 bg-[#F7F4EE] lg:border-b-0 lg:border-r">
          <div className="grid gap-3 p-3 sm:grid-cols-[76px_1fr] sm:p-5">
            {gallery.length > 1 ? <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col">
              {gallery.map((src) => <button key={src} type="button" onClick={() => setSelectedImage(src)} className={`h-16 w-16 shrink-0 overflow-hidden border bg-white p-1 ${visibleImage === src ? 'border-[#F5871F]' : 'border-black/8'}`}><img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain"/></button>)}
            </div> : null}
            <div className={`${gallery.length > 1 ? 'order-1 sm:order-2' : ''} relative grid min-h-[340px] place-items-center overflow-hidden bg-white p-4 sm:min-h-[520px]`}>
              <img src={visibleImage} alt={productName} decoding="async" className="max-h-[520px] w-full object-contain" />
              {d > 0 ? <span className="absolute left-4 top-4 rounded-full bg-[#F5871F] px-3 py-1.5 text-[10px] font-black">-{d}%</span> : null}
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-9">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">{product.category_name || product.category || 'Producto'}</span>
            {product.featured ? <span className="rounded-full bg-[#FFF0D5] px-2.5 py-1 text-[9px] font-black text-[#8A5100]">Destacado</span> : null}
          </div>
          <h1 className="mt-3 text-[clamp(2rem,6vw,3.6rem)] font-black leading-[.94] tracking-[-.055em]">{productName}</h1>
          {product.tagline ? <p className="mt-3 text-sm font-semibold text-black/48">{product.tagline}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-black/8 py-3">
            <div className="flex gap-0.5" aria-label={`Valoración ${rating} de 5`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.round(rating) ? 'fill-[#F5871F] text-[#F5871F]' : 'text-black/10'}`} />)}</div>
            <span className="text-xs font-black">{rating > 0 ? rating.toFixed(1) : 'Sin valoración'}</span>
            <span className="h-3 w-px bg-black/10" />
            <span className={`text-xs font-black ${stock === 0 ? 'text-red-700' : 'text-emerald-700'}`}>{stock === 0 ? 'Sin stock' : stock == null ? 'Stock por confirmar' : `${stock} disponibles`}</span>
          </div>

          <p className="mt-5 text-sm leading-7 text-black/55">{product.description || 'Producto seleccionado para completar tu proyecto.'}</p>

          <div className="mt-6 border-y border-black/10 py-5">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#B96F00]">Precio final · IVA incluido</p>
            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1"><b className="text-4xl tracking-[-.055em] sm:text-5xl">{CLP.format(gross)}</b>{d > 0 ? <span className="pb-1 text-sm text-black/28 line-through">{CLP.format(product.price)}</span> : null}</div>
            <div className="mt-4 grid grid-cols-2 gap-px bg-black/8 text-xs"><div className="bg-[#F7F4EE] p-3"><span className="text-black/38">Neto contenido</span><b className="mt-1 block">{CLP.format(net)}</b></div><div className="bg-[#F7F4EE] p-3"><span className="text-black/38">IVA 19% contenido</span><b className="mt-1 block">{CLP.format(iva)}</b></div></div>
          </div>

          <div className="mt-5 grid gap-2.5">
            <TrustLine icon={<BadgeCheck />} title="Venta gestionada por Soluciones Fabrick" detail="Pedido, pago y seguimiento dentro del mismo sistema." />
            <TrustLine icon={<Truck />} title={product.delivery || 'Entrega a coordinar'} detail={shippingText} />
            <TrustLine icon={<ShieldCheck />} title="Compra protegida" detail="Pago procesado mediante el flujo seguro de Mercado Pago." />
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-black/10 pt-5">
            <div><p className="text-[9px] font-black uppercase tracking-[.12em] text-black/38">Cantidad</p><div className="mt-2 flex items-center rounded-full border border-black/10 bg-[#F7F4EE] p-1"><button type="button" onClick={() => setQty((current) => Math.max(1, current - 1))} className="grid h-9 w-9 place-items-center"><Minus className="h-4 w-4" /></button><b className="w-9 text-center">{qty}</b><button type="button" onClick={() => setQty((current) => stock == null ? current + 1 : Math.min(stock, current + 1))} className="grid h-9 w-9 place-items-center"><Plus className="h-4 w-4" /></button></div></div>
            <div className="text-right"><p className="text-[9px] font-black uppercase tracking-[.12em] text-black/38">Subtotal</p><b className="mt-1 block text-xl">{CLP.format(gross * qty)}</b></div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => add(false)} disabled={stock === 0} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition ${added ? 'bg-emerald-200' : 'border border-black/12 bg-white hover:border-[#F5871F]' } disabled:opacity-35`}>{added ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}{added ? 'Añadido' : 'Agregar al carrito'}</button>
            <button type="button" onClick={() => add(true)} disabled={stock === 0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#F5871F] px-5 text-sm font-black transition hover:bg-[#111214] hover:text-white disabled:opacity-35"><CreditCard className="h-5 w-5" /> Comprar ahora <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <article className="bg-white p-5 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Características</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Lo importante antes de comprar</h2>
          <div className="mt-5 grid gap-px bg-black/8 sm:grid-cols-2">
            {product.features.map((feature) => <div key={feature} className="flex min-h-14 items-start gap-3 bg-[#FAF8F3] p-4 text-sm font-semibold leading-5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{feature}</div>)}
            {product.dimensions && product.dimensions !== 'Especificación en ficha técnica' ? <div className="flex min-h-14 items-start gap-3 bg-[#FAF8F3] p-4 text-sm font-semibold leading-5"><Ruler className="mt-0.5 h-4 w-4 shrink-0 text-[#B96F00]" />{product.dimensions}</div> : null}
          </div>
        </article>

        <article className="bg-[#111214] p-5 text-white sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#FFB000]">Compra segura</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Qué ocurre después de pagar</h2>
          <div className="mt-5 divide-y divide-white/10"><DarkStep n="01" icon={<PackageCheck />} title="Orden registrada" text="Tu pedido queda asociado al comprobante de pago."/><DarkStep n="02" icon={<Truck />} title="Entrega coordinada" text="Se valida despacho, dirección y disponibilidad real."/><DarkStep n="03" icon={<ShieldCheck />} title="Seguimiento" text="Puedes revisar el estado desde tu cuenta."/></div>
        </article>
      </section>

      {specs.length ? <section className="mt-4 bg-white p-5 sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Ficha técnica</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Especificaciones del producto</h2>
        <div className="mt-5 divide-y divide-black/8 border-y border-black/8">{specs.map(([key, value]) => <div key={key} className="grid grid-cols-[.8fr_1.2fr] gap-4 py-3 text-xs sm:text-sm"><span className="font-bold text-black/42">{key}</span><span className="font-semibold">{value}</span></div>)}</div>
      </section> : null}

      <section className="mt-4 bg-white p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr] lg:items-end">
          <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">Opiniones</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Reseñas sin inventar confianza.</h2></div>
          <p className="text-sm leading-6 text-black/48">Esta ficha no publica comentarios anónimos o simulados. Cuando exista una reseña vinculada a una compra confirmada, aparecerá aquí como opinión verificada.</p>
        </div>
        <div className="mt-5 flex flex-col gap-4 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex gap-0.5">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < Math.round(rating) ? 'fill-[#F5871F] text-[#F5871F]' : 'text-black/10'}`} />)}</div><b>{rating > 0 ? `${rating.toFixed(1)} / 5` : 'Sin reseñas verificadas'}</b></div><button type="button" onClick={() => router.push('/mi-cuenta')} className="rounded-full border border-black/12 px-4 py-2.5 text-xs font-black">Revisar mis compras</button></div>
      </section>

      {related.length ? <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]">También puede servirte</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Productos relacionados</h2></div><button type="button" onClick={() => router.push('/tienda#catalogo')} className="hidden text-xs font-black text-[#B96F00] sm:block">Ver catálogo →</button></div>
        <div className="grid grid-cols-2 gap-px overflow-hidden bg-black/8 lg:grid-cols-4">{related.map((item) => <RelatedCard key={item.id} product={item} onOpen={() => router.push(`/tienda/${item.id}`)} />)}</div>
      </section> : null}
    </main>

    <StoreFooter />
    <StoreBottomNav />
  </div>;
}

function TrustLine({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="flex items-start gap-3 bg-[#F7F4EE] p-3.5"><span className="mt-0.5 text-[#B96F00] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><div><b className="block text-xs">{title}</b><p className="mt-1 text-[10px] leading-4 text-black/42">{detail}</p></div></div>;
}

function DarkStep({ n, icon, title, text }: { n: string; icon: React.ReactNode; title: string; text: string }) {
  return <div className="grid grid-cols-[32px_1fr] gap-3 py-4"><div className="text-[#FFB000] [&>svg]:h-5 [&>svg]:w-5">{icon}</div><div><span className="text-[9px] font-black text-white/25">{n}</span><b className="ml-2 text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-white/42">{text}</p></div></div>;
}
