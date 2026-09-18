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
function publicFeatures(product: Product) {
  const raw = product.specifications?.public_features;
  if (Array.isArray(raw)) {
    return raw.map((item) => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return [String(row.label || '').trim(), readable(row.value)] as [string, string];
    }).filter(([label, value]) => label && value);
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([label, value]) => [label, readable(value)] as [string, string]).filter(([, value]) => value);
  }
  return [] as Array<[string, string]>;
}

type PublicReview = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  verified_purchase?: boolean;
  featured?: boolean;
  admin_reply?: string | null;
  created_at: string;
};

export default function ProductoClient({ id }: { id: string }) {
  const router = useRouter();
  const { products, loading } = useRealtimeProducts();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSent, setReviewSent] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [publicReviews, setPublicReviews] = useState<PublicReview[]>([]);
  const { addToCart } = useCartContext();
  useEffect(() => { setActiveImg(0); setQty(1); }, [id]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/product-reviews?product=${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((json: { reviews?: PublicReview[] }) => {
        if (!cancelled) setPublicReviews(Array.isArray(json.reviews) ? json.reviews : []);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [id]);

  const gallery = useMemo(() => product ? buildGallery(product) : [], [product]);
  const features = useMemo(() => product ? publicFeatures(product) : [], [product]);
  const related = useMemo(() => {
    if (!product) return [] as Product[];
    const manualIds = Array.isArray(product.specifications?.related_product_ids)
      ? product.specifications!.related_product_ids!.map(String).filter(Boolean)
      : [];
    const manual = manualIds.map((relatedId) => products.find((item) => item.id === relatedId)).filter((item): item is Product => Boolean(item && item.id !== id));
    const sameCategory = products
      .filter((item) => item.id !== id && !manualIds.includes(item.id) && item.category_id === product.category_id)
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    const others = products
      .filter((item) => item.id !== id && !manualIds.includes(item.id) && item.category_id !== product.category_id)
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return [...manual, ...sameCategory, ...others].slice(0, 8);
  }, [id, product, products]);

  if (loading && !product) return <div className="min-h-screen animate-pulse bg-[#F4EFE6]"><Navbar /><div className="mx-auto max-w-6xl px-4 py-10"><div className="h-[75vh] bg-black/5" /></div></div>;
  if (!product) return <div className="min-h-screen bg-[#F4EFE6] text-[#111214]"><Navbar /><div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-6 text-center"><div><p className="text-7xl font-black text-black/10">404</p><h1 className="mt-3 text-3xl font-black">Producto no encontrado</h1><Link href="/tienda" className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-black text-white">Volver a tienda</Link></div></div></div>;

  const price = finalPrice(product);
  const category = product.category_name || product.category_id || 'Producto';
  const stock = Math.max(0, Number(product.stock ?? 0));
  const out = product.stock !== undefined && stock <= 0;
  const maxQty = product.stock !== undefined ? Math.max(1, stock) : 99;
  const mainImg = gallery[activeImg] || gallery[0] || FALLBACK;
  const provider = specText(product, ['provider', 'proveedor', 'brand', 'marca'], 'Soluciones Fabrick');
  const orderedReviews = [...publicReviews].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(b.rating) - Number(a.rating));
  const reviewAverage = publicReviews.length ? publicReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / publicReviews.length : 0;
  const rating = reviewAverage || Number(product.rating || 0);
  const ratingBreakdown = [5, 4, 3, 2, 1].map((value) => ({ value, count: publicReviews.filter((review) => Number(review.rating) === value).length }));
  const purchaseCount = Math.max(0, Number(product.specifications?.purchases || product.specifications?.ventas || 0));
  const delivery = product.delivery_days || 'Despacho coordinado después de la compra';

  function add() { if (out) return; addToCart(product, qty); setAdded(true); setTimeout(() => setAdded(false), 1600); }
  function buy() { if (out) return; addToCart(product, qty); router.push('/checkout'); }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewName.trim() || reviewText.trim().length < 8) {
      setReviewError('Escribe tu nombre y una opinión de al menos 8 caracteres.');
      return;
    }
    setReviewBusy(true);
    setReviewError('');
    try {
      const response = await fetch('/api/product-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, name: reviewName, email: reviewEmail, rating: reviewRating, body: reviewText, website: '' }),
      });
      const json = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo enviar la opinión.');
      setReviewSent(true);
      setReviewText('');
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'No se pudo enviar la opinión.');
    } finally {
      setReviewBusy(false);
    }
  }

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
          <div className="mt-3 flex items-center gap-2 text-sm"><Star className={`h-4 w-4 ${rating > 0 ? 'fill-[#F5871F] text-[#F5871F]' : 'text-black/20'}`}/><b>{rating > 0 ? rating.toFixed(1) : 'Sin opiniones'}</b>{publicReviews.length ? <span className="text-black/35">({publicReviews.length})</span> : null}{purchaseCount > 0 ? <><span className="text-black/30">|</span><b>{purchaseCount}+ vendidos</b></> : null}</div>

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

      <section className="mt-3 bg-white px-5 py-7 md:mt-8 md:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Opiniones</p><h2 className="mt-2 text-3xl font-black tracking-[-.045em]">Experiencias de compra</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">Las opiniones pasan por moderación. La etiqueta “Compra verificada” solo se muestra cuando la reseña puede asociarse a una compra confirmada.</p></div>
          <div className="rounded-2xl bg-[#F4EFE6] px-5 py-3 text-left sm:text-right"><b className="text-3xl">{rating > 0 ? rating.toFixed(1) : '—'}</b><p className="text-xs text-black/40">{publicReviews.length ? `${publicReviews.length} opinión${publicReviews.length === 1 ? '' : 'es'} publicada${publicReviews.length === 1 ? '' : 's'}` : 'Aún sin opiniones publicadas'}</p></div>
        </div>

        {publicReviews.length ? <div className="mt-6 grid gap-3 md:grid-cols-2">{publicReviews.map((review) => <article key={review.id} className="rounded-2xl border border-black/8 bg-[#FBF8F2] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{review.author_name}</p><div className="mt-1 flex gap-0.5">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-3.5 w-3.5 ${value <= review.rating ? 'fill-[#F5871F] text-[#F5871F]' : 'text-black/15'}`} />)}</div></div>{review.verified_purchase ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-800"><BadgeCheck className="h-3 w-3" />Compra verificada</span> : null}</div><p className="mt-3 text-sm leading-6 text-black/60">{review.body}</p>{review.admin_reply ? <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-black/55"><b className="text-black">Soluciones Fabrick respondió:</b><br/>{review.admin_reply}</div> : null}</article>)}</div> : null}

        <div className="mt-6 border-t border-black/8 pt-6">
          {reviewSent ? <div className="flex min-h-32 items-center gap-4 rounded-2xl bg-emerald-50 p-5"><CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-700"/><div><b>Opinión guardada</b><p className="mt-1 text-sm text-emerald-900/60">Quedó pendiente de moderación y todavía no es pública.</p><button type="button" onClick={() => setReviewSent(false)} className="mt-3 text-xs font-black text-emerald-800">Enviar otra opinión</button></div></div> : <form onSubmit={submitReview} className="rounded-2xl bg-[#F4EFE6] p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black">¿Cómo fue tu experiencia?</p><p className="mt-1 text-xs text-black/40">Tu opinión ayuda a otros clientes a evaluar el producto.</p></div><div className="flex gap-1" aria-label="Valoración de 1 a 5 estrellas">{[1,2,3,4,5].map((value) => <button type="button" key={value} onClick={() => setReviewRating(value)} className="grid h-10 w-10 place-items-center rounded-xl bg-white" aria-label={`${value} estrella${value === 1 ? '' : 's'}`}><Star className={`h-5 w-5 ${value <= reviewRating ? 'fill-[#F5871F] text-[#F5871F]' : 'text-black/15'}`} /></button>)}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><input value={reviewName} onChange={(event) => setReviewName(event.target.value)} placeholder="Tu nombre" className="min-h-12 rounded-xl border border-black/8 bg-white px-4 text-sm font-bold outline-none focus:border-[#F5871F]"/><input type="email" value={reviewEmail} onChange={(event) => setReviewEmail(event.target.value)} placeholder="Correo opcional" className="min-h-12 rounded-xl border border-black/8 bg-white px-4 text-sm outline-none focus:border-[#F5871F]"/></div><textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={4} maxLength={1200} placeholder="Cuéntanos qué te gustó, cómo lo usaste y qué debería saber otro comprador." className="mt-3 w-full resize-y rounded-xl border border-black/8 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#F5871F]"/>{reviewError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{reviewError}</p> : null}<div className="mt-4 flex items-center justify-between gap-3"><span className="text-[10px] text-black/35">{reviewText.length}/1200 · Puntuación {reviewRating}/5</span><button disabled={reviewBusy} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-black px-5 text-xs font-black text-white disabled:opacity-50">{reviewBusy ? 'Enviando…' : 'Enviar para revisión'}</button></div></form>}
        </div>
      </section>

      <section className="mt-3 bg-[#EEEDEB] px-3 py-8 md:mt-8 md:px-8"><div className="mx-auto max-w-[1200px]"><div className="flex items-center gap-4"><span className="h-px flex-1 bg-black/20"/><h2 className="text-lg font-black">También podrían gustarte</h2><span className="h-px flex-1 bg-black/20"/></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{related.map(rel=><button key={rel.id} onClick={()=>navigateWithTransition(`/tienda/${rel.id}`,router)} className="overflow-hidden bg-white text-left"><div className="relative aspect-square"><img src={rel.img||rel.image_url||FALLBACK} alt={rel.name} className="h-full w-full object-cover"/><span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white shadow"><ShoppingCart className="h-4 w-4 text-[#F5871F]"/></span></div><div className="p-3"><p className="line-clamp-2 min-h-[2.4rem] text-sm leading-tight">{rel.name}</p><b className="mt-2 block text-lg">{CLP.format(rel.price)}</b>{Number(rel.discount_percentage||0)>0?<span className="mt-1 inline-block text-xs font-black text-emerald-700">{rel.discount_percentage}% OFF</span>:null}</div></button>)}</div></div></section>
    </main>

    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/10 bg-white/96 p-3 backdrop-blur-xl md:hidden"><div className="mx-auto flex max-w-xl items-center gap-3"><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase text-emerald-700">IVA incluido</p><b className="text-xl">{CLP.format(price)}</b></div><button onClick={buy} disabled={out} className="min-h-12 rounded-2xl bg-[#F5871F] px-6 text-xs font-black disabled:opacity-35">Comprar ahora</button></div></div>
  </div>;
}

function Spec({label,value}:{label:string;value:string}) { return <div className="grid grid-cols-[.8fr_1.2fr] gap-5 border-b border-black/8 py-4 text-sm"><span className="text-black/40">{label}</span><b className="text-right">{value}</b></div>; }
function Info({icon,title,text}:{icon:React.ReactNode;title:string;text:string}) { return <div className="flex gap-3"><span className="mt-0.5 text-[#B96F00] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><b className="text-sm">{title}</b><p className="mt-1 text-xs leading-5 text-black/45">{text}</p></div></div>; }
