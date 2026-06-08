'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Calculator, CheckCircle2, ChevronRight, Hammer, MapPin, Phone, ShieldCheck, ShoppingCart, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useCartContext } from '@/context/CartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';

function formatCLP(value: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildGallery(product: { image_url?: string; specifications?: Record<string, unknown> }): string[] {
  const gallery: string[] = [];
  if (product.image_url) gallery.push(product.image_url);
  const raw = product.specifications?.['gallery'];
  if (Array.isArray(raw)) {
    for (const url of raw) {
      if (typeof url === 'string' && url && !gallery.includes(url)) gallery.push(url);
    }
  }
  return gallery;
}

const FLOOR_KEYWORDS = [
  'piso', 'flotante', 'porcelanato', 'laminado', 'revestimiento', 'forro',
  'parquet', 'parqué', 'cerámic', 'ceramic', 'baldosa', 'vinílic', 'vinilic',
  'deck', 'alfombra', 'cubrepiso', 'pavimento',
];

function isFloorProduct(product: { name: string; category_id?: string | null; description?: string | null }) {
  const haystack = `${product.name} ${product.category_id ?? ''} ${product.description ?? ''}`.toLowerCase();
  return FLOOR_KEYWORDS.some((kw) => haystack.includes(kw));
}

export default function ProductoClient({ id }: { id: string }) {
  const router = useRouter();
  const { products, loading } = useRealtimeProducts();
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const [activeImg, setActiveImg] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [areaInput, setAreaInput] = useState('');
  const { addToCart } = useCartContext();

  useEffect(() => {
    setActiveImg(0);
  }, [id]);

  const gallery = product ? buildGallery(product) : [];
  const mainImg = gallery[activeImg] || gallery[0];

  const outOfStock = product?.stock !== undefined && product.stock <= 0;

  const isFloor = useMemo(() => (product ? isFloorProduct(product) : false), [product]);

  const coverageEstimate = useMemo(() => {
    if (!product) return null;
    const area = parseFloat(areaInput.replace(',', '.'));
    if (!Number.isFinite(area) || area <= 0) return null;
    const WASTE_MARGIN = 0.1;
    const recommendedM2 = Math.ceil(area * (1 + WASTE_MARGIN) * 10) / 10;
    return {
      requestedM2: area,
      recommendedM2,
      estimatedTotal: Math.round(recommendedM2 * product.price),
    };
  }, [product, areaInput]);

  const whatsappHref = buildWhatsAppLink(
    `Hola Soluciones Fabrick, me interesa el producto ${product?.name ?? ''} para mi proyecto. ¿Podemos agendar una visita en Linares para evaluarlo?`,
  );

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 pt-32 pb-20 md:px-12">
          <div className="h-3 w-40 animate-pulse rounded-full bg-white/5 mb-10" />
          <div className="grid gap-10 md:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-3xl bg-white/[0.04]" />
            <div className="space-y-4">
              <div className="h-10 w-4/5 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="h-6 w-1/3 animate-pulse rounded-lg bg-white/[0.04]" />
              <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.04]" />
              <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/[0.04]" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
          <p className="select-none font-playfair text-7xl text-white/10">404</p>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight">Producto no encontrado</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Este material no existe o ya no forma parte de nuestro catálogo activo.
          </p>
          <Link
            href="/tienda"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400 hover:bg-yellow-400/10"
          >
            <ArrowLeft size={14} /> Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <Navbar />

      <main className="mx-auto max-w-6xl px-6 pt-28 pb-32 md:px-12 md:pt-36">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="mb-10 flex items-center gap-2 text-[11px] tracking-wide text-white/30"
        >
          <Link href="/" className="hover:text-white/60">Inicio</Link>
          <ChevronRight size={11} className="text-white/10" />
          <Link href="/tienda" className="hover:text-white/60">Catálogo</Link>
          <ChevronRight size={11} className="text-white/10" />
          <span className="max-w-[220px] truncate text-white/60">{product.name}</span>
        </nav>

        <div className="grid items-start gap-10 md:grid-cols-2 lg:gap-16">
          {/* Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              {mainImg ? (
                <img
                  src={mainImg}
                  alt={`${product.name} — imagen principal del material instalado por Soluciones Fabrick`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-playfair text-6xl text-white/10">
                  {product.name[0]}
                </div>
              )}
              {product.featured ? (
                <span className="absolute top-4 left-4 rounded-full bg-yellow-400/95 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-black">
                  Destacado
                </span>
              ) : null}
            </div>

            {gallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3">
                {gallery.slice(0, 4).map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                      i === activeImg
                        ? 'border-yellow-400/70 ring-2 ring-yellow-400/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                    aria-label={`Ver imagen ${i + 1} de ${product.name}`}
                  >
                    <img
                      src={src}
                      alt={`${product.name} — vista ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">
                {product.category_id ? 'Categoría' : 'Material'}
              </span>
              <h1 className="mt-4 font-playfair text-3xl leading-tight text-white md:text-4xl lg:text-5xl">
                {product.name}
              </h1>
              {product.tagline ? (
                <p className="mt-3 text-sm italic leading-relaxed text-zinc-400 md:text-base">
                  &ldquo;{product.tagline}&rdquo;
                </p>
              ) : null}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-yellow-400 md:text-4xl">{formatCLP(product.price)}</span>
              {product.discount_percentage ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                  -{product.discount_percentage}% OFF
                </span>
              ) : null}
            </div>

            {product.description ? (
              <p className="text-sm leading-relaxed text-zinc-300 md:text-base">{product.description}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {product.stock !== undefined ? (
                outOfStock ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-400">
                    Agotado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
                    Disponible · {product.stock} unidades
                  </span>
                )
              ) : null}
              {product.delivery_days ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-300">
                  Disponibilidad en obra: {product.delivery_days}
                </span>
              ) : null}
            </div>

            {/* m² coverage calculator — only for floor-type products */}
            {isFloor && (
              <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.06] p-4">
                <div className="flex items-center gap-2">
                  <Calculator size={15} className="text-cyan-300" />
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    ¿Cuántos m² necesitas cubrir?
                  </p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                  Ingresa la superficie de tu proyecto y te damos un cálculo aproximado de material y costo, incluyendo
                  un margen de pérdida por corte.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    placeholder="Ej: 18.5"
                    aria-label="Metros cuadrados a cubrir"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-medium text-white placeholder:text-zinc-600 focus:border-cyan-300/50 focus:outline-none"
                  />
                  <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-zinc-400">m²</span>
                </div>
                {coverageEstimate && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Material recomendado</p>
                      <p className="mt-1 text-sm font-black text-cyan-300">{coverageEstimate.recommendedM2} m²</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Costo estimado</p>
                      <p className="mt-1 text-sm font-black text-cyan-300">{formatCLP(coverageEstimate.estimatedTotal)}</p>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                  *Cálculo referencial (incluye 10% de margen por corte y desperdicio). El valor final puede variar
                  según el formato del producto.
                </p>
              </div>
            )}

            {/* CTAs — comprar directo o añadir al carrito */}
            <div className="space-y-3 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href={`/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${encodeURIComponent(String(product.price))}${product.image_url ? `&img=${encodeURIComponent(product.image_url)}` : ''}`}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-yellow-300"
                >
                  <Zap size={14} /> Compra directa · {formatCLP(product.price)}
                  <ChevronRight size={13} />
                </Link>
                <button
                  onClick={() => {
                    addToCart(product);
                    setAddedToCart(true);
                    setTimeout(() => setAddedToCart(false), 2500);
                  }}
                  disabled={outOfStock}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    addedToCart
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-yellow-400/30 bg-yellow-400/5 text-yellow-400 hover:bg-yellow-400/10'
                  }`}
                >
                  {addedToCart ? <CheckCircle2 size={14} /> : <ShoppingCart size={14} />}
                  {addedToCart ? '¡Añadido al carrito!' : 'Añadir al carrito'}
                </button>
              </div>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400 transition hover:bg-emerald-500/10"
              >
                <Phone size={13} /> Consultar por WhatsApp
              </a>
            </div>

            {/* Trust row */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <ShieldCheck size={14} className="mx-auto mb-1 text-yellow-400/80" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Garantía</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <Hammer size={14} className="mx-auto mb-1 text-yellow-400/80" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Instalación</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <MapPin size={14} className="mx-auto mb-1 text-yellow-400/80" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Región del Maule</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Why Fabrick */}
        <section className="mt-20 rounded-[2rem] border border-yellow-400/15 bg-[linear-gradient(135deg,rgba(250,204,21,0.07),rgba(250,204,21,0.015))] p-8 md:p-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">¿Por qué Fabrick?</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            Comprar es simple y directo
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
            Compra simple y directa: paga ahora y coordinamos el despacho a tu zona, o súmalo a tu carrito y sigue
            explorando el catálogo.{' '}
            {isFloor
              ? 'Para este material, calcula primero cuánto necesitas con nuestra calculadora de m² — así evitas comprar de más o de menos. '
              : ''}
            Si prefieres conversar con una persona antes de decidir, nuestro equipo certificado te asesora por WhatsApp
            sin costo.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <Zap size={18} className="text-yellow-400" />
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white">Compra directa</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Paga ahora mismo y coordinamos el despacho a tu zona en la Región del Maule.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <ShoppingCart size={18} className="text-yellow-400" />
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white">Añadir al carrito</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Súmalo a tu carrito, sigue explorando el catálogo y paga todo junto cuando estés listo.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contacto"
              className="rounded-full bg-yellow-400 px-8 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-black hover:bg-yellow-300"
            >
              Evaluación gratuita
            </Link>
            <Link
              href="/proyectos"
              className="rounded-full border border-white/10 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400"
            >
              Ver proyectos ejecutados
            </Link>
          </div>
        </section>

        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs text-zinc-400 transition hover:text-yellow-400"
          >
            <ArrowLeft size={12} /> Volver al catálogo
          </button>
        </div>
      </main>
    </div>
  );
}
