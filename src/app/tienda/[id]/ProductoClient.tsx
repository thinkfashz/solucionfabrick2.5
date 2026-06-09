'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calculator, CheckCircle2, Hammer, Phone, ShieldCheck, ShoppingCart, Star, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useCartContext } from '@/context/CartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { FALLBACK_CATALOG_PRODUCTS } from '@/hooks/useCatalogProducts';
import { navigateWithTransition } from '@/lib/routeTransition';

const PAGE_BG =
  'radial-gradient(circle at 20% -10%,rgba(255,210,41,.16),transparent 28rem), radial-gradient(circle at 90% 10%,rgba(255,210,41,.07),transparent 22rem), linear-gradient(180deg,#030303 0%,#070706 55%,#030303 100%)';

const CARD_BG =
  'radial-gradient(circle at 80% 0%,rgba(255,210,41,.08),transparent 18rem), linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.025))';

const CARD_STYLE: React.CSSProperties = {
  background: CARD_BG,
  border: '1px solid rgba(255,248,237,.12)',
  borderRadius: 28,
  boxShadow: '0 26px 80px rgba(0,0,0,.48)',
};

function Kicker({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[#ffd229] text-[11px] font-black uppercase tracking-[0.34em]">
      <span className="block w-8 h-px bg-gradient-to-r from-[#ffd229] to-transparent flex-shrink-0" />
      {label}
    </span>
  );
}

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

  const category = product?.category_id ?? 'Material';

  const checkoutHref = product
    ? `/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${encodeURIComponent(String(product.price))}${product.image_url ? `&img=${encodeURIComponent(product.image_url)}` : ''}`
    : '/checkout';

  // Related products: first 3 from fallback that aren't this product
  const relatedProducts = useMemo(() => {
    return FALLBACK_CATALOG_PRODUCTS.filter((p) => p.id !== id).slice(0, 3);
  }, [id]);

  if (loading && !product) {
    return (
      <div className="min-h-screen" style={{ color: '#fff8ed', background: PAGE_BG }}>
        <Navbar />
        <div className="mx-auto max-w-[1120px] px-4 md:px-8 pt-28 pb-32">
          <div className="h-3 w-40 animate-pulse rounded-full bg-white/5 mb-10" />
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="aspect-square animate-pulse rounded-[28px] bg-white/[0.04]" />
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
      <div className="min-h-screen" style={{ color: '#fff8ed', background: PAGE_BG }}>
        <Navbar />
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
          <p className="select-none font-playfair text-7xl text-white/10">404</p>
          <h1 className="mt-4 text-2xl font-black uppercase tracking-tight">Producto no encontrado</h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: '#b9afa2' }}>
            Este material no existe o ya no forma parte de nuestro catálogo activo.
          </p>
          <Link
            href="/tienda"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/30 px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400 hover:bg-yellow-400/10"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile sticky buy bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.12] bg-[rgba(7,7,6,0.92)] backdrop-blur-2xl px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#ffd229] font-black text-xl">{formatCLP(product.price)}</span>
          <Link
            href={checkoutHref}
            className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#ffd229] px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black hover:bg-yellow-300 transition"
          >
            <Zap size={13} /> Comprar ahora
          </Link>
        </div>
      </div>

      <div className="min-h-screen" style={{ color: '#fff8ed', background: PAGE_BG }}>
        <Navbar />
        <main className="max-w-[1120px] mx-auto px-4 md:px-8 pt-6 pb-36 lg:pb-24">

          {/* Breadcrumb */}
          <nav className="text-[13px] mb-5" style={{ color: '#7f766d' }}>
            <Link href="/" className="hover:text-[#fff8ed] transition">Inicio</Link>
            {' › '}
            <Link href="/tienda" className="hover:text-[#fff8ed] transition">Catálogo</Link>
            {' › '}
            <span style={{ color: '#b9afa2' }}>{category}</span>
          </nav>

          {/* 2-col product layout */}
          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 items-start">

            {/* LEFT: Sticky image card */}
            <div className="lg:sticky lg:top-[96px]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div
                  style={{
                    ...CARD_STYLE,
                    minHeight: 480,
                    padding: 28,
                    display: 'grid',
                    placeItems: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Gold radial glow overlay */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(circle at 50% 50%, rgba(255,210,41,0.07), transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Destacado badge */}
                  {product.featured ? (
                    <span className="absolute top-5 left-5 rounded-full bg-yellow-400/95 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-black z-10">
                      Destacado
                    </span>
                  ) : null}
                  {/* Product image or letter fallback */}
                  {mainImg ? (
                    <img
                      src={mainImg}
                      alt={`${product.name} — imagen principal`}
                      className="w-full h-full object-cover absolute inset-0"
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-playfair text-7xl" style={{ color: 'rgba(255,248,237,0.1)' }}>
                      {product.name[0]}
                    </span>
                  )}
                </div>

                {/* Gallery thumbnails */}
                {gallery.length > 1 ? (
                  <div className="grid grid-cols-4 gap-3 mt-3">
                    {gallery.slice(0, 4).map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setActiveImg(i)}
                        className={`relative aspect-square overflow-hidden transition ${
                          i === activeImg ? 'ring-2 ring-[#ffd229]/60' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          borderRadius: 14,
                          border: i === activeImg ? '1px solid rgba(255,210,41,0.5)' : '1px solid rgba(255,248,237,0.12)',
                        }}
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
            </div>

            {/* RIGHT: Info card */}
            <div style={{ ...CARD_STYLE, padding: 34 }}>
              {/* Kicker */}
              <Kicker label={category} />

              {/* Featured pill */}
              {product.featured ? (
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-full border border-yellow-400/25 bg-yellow-400/[0.08] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-yellow-400">
                    Producto recomendado
                  </span>
                </div>
              ) : null}

              {/* Title */}
              <h1
                className="font-playfair mt-4"
                style={{
                  fontSize: 'clamp(36px,6vw,70px)',
                  lineHeight: 0.92,
                  letterSpacing: '-0.075em',
                  color: '#fff8ed',
                }}
              >
                {product.name}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-5">
                <span
                  style={{
                    fontSize: 'clamp(42px,7vw,66px)',
                    fontWeight: 900,
                    color: '#ffd229',
                    letterSpacing: '-0.06em',
                    lineHeight: 1,
                  }}
                >
                  {formatCLP(product.price)}
                </span>
                {product.discount_percentage ? (
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400">
                    -{product.discount_percentage}% OFF
                  </span>
                ) : null}
              </div>

              {/* Description */}
              {product.description ? (
                <p
                  className="mt-5 text-[17px] leading-[1.65]"
                  style={{
                    borderLeft: '3px solid #ffd229',
                    paddingLeft: 17,
                    color: '#ddd4c7',
                  }}
                >
                  {product.description}
                </p>
              ) : null}

              {/* m² coverage calculator — only for floor-type products */}
              {isFloor && (
                <div
                  className="mt-5 rounded-2xl p-4"
                  style={{
                    border: '1px solid rgba(255,210,41,0.18)',
                    background: 'rgba(255,210,41,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Calculator size={15} className="text-[#ffd229]" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ffd229]">
                      ¿Cuántos m² necesitas cubrir?
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#b9afa2' }}>
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
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-medium placeholder:text-zinc-600 focus:outline-none"
                      style={{
                        border: '1px solid rgba(255,248,237,0.18)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#fff8ed',
                      }}
                    />
                    <span className="shrink-0 text-xs font-black uppercase tracking-wider" style={{ color: '#b9afa2' }}>m²</span>
                  </div>
                  {coverageEstimate && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div
                        className="rounded-xl p-3"
                        style={{ border: '1px solid rgba(255,248,237,0.10)', background: 'rgba(255,255,255,0.03)' }}
                      >
                        <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: '#7f766d' }}>Material recomendado</p>
                        <p className="mt-1 text-sm font-black text-[#ffd229]">{coverageEstimate.recommendedM2} m²</p>
                      </div>
                      <div
                        className="rounded-xl p-3"
                        style={{ border: '1px solid rgba(255,248,237,0.10)', background: 'rgba(255,255,255,0.03)' }}
                      >
                        <p className="text-[9px] uppercase tracking-[0.2em]" style={{ color: '#7f766d' }}>Costo estimado</p>
                        <p className="mt-1 text-sm font-black text-[#ffd229]">{formatCLP(coverageEstimate.estimatedTotal)}</p>
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] leading-relaxed" style={{ color: '#7f766d' }}>
                    *Cálculo referencial (incluye 10% de margen por corte y desperdicio).
                  </p>
                </div>
              )}

              {/* Status row */}
              <div className="flex flex-wrap gap-2.5 mt-5">
                {product.stock !== undefined ? (
                  outOfStock ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-400">
                      Agotado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ border: '1px solid rgba(35,209,139,0.25)', background: 'rgba(35,209,139,0.08)', color: '#23d18b' }}>
                      Disponible · {product.stock} unid.
                    </span>
                  )
                ) : null}
                {product.delivery_days ? (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
                    style={{ border: '1px solid rgba(255,248,237,0.10)', background: 'rgba(255,255,255,0.03)', color: '#b9afa2' }}
                  >
                    {product.delivery_days}
                  </span>
                ) : null}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"
                  style={{ border: '1px solid rgba(255,248,237,0.10)', background: 'rgba(255,255,255,0.03)', color: '#b9afa2' }}
                >
                  Instalación opcional
                </span>
              </div>

              {/* CTAs */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Link
                  href={checkoutHref}
                  className="flex items-center justify-center gap-2 rounded-full py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-yellow-300"
                  style={{ background: '#ffd229' }}
                >
                  <Zap size={13} /> Comprar ahora
                </Link>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition"
                  style={{
                    border: '1px solid rgba(255,248,237,0.14)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff8ed',
                  }}
                >
                  <Phone size={13} /> Cotizar instalación
                </a>
              </div>

              {/* Add to cart tertiary */}
              <button
                onClick={() => {
                  addToCart(product);
                  setAddedToCart(true);
                  setTimeout(() => setAddedToCart(false), 2500);
                }}
                disabled={outOfStock}
                className={`mt-2.5 w-full flex items-center justify-center gap-2 rounded-full py-3 text-[11px] font-black uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  addedToCart
                    ? 'border border-[#23d18b]/40 bg-[#23d18b]/10 text-[#23d18b]'
                    : 'border border-yellow-400/20 bg-transparent text-yellow-400 hover:bg-yellow-400/10'
                }`}
              >
                {addedToCart ? <CheckCircle2 size={13} /> : <ShoppingCart size={13} />}
                {addedToCart ? '¡Añadido al carrito!' : 'Añadir al carrito'}
              </button>

              {/* Trust grid 2x2 */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  { icon: <ShieldCheck size={16} className="text-[#ffd229]" />, strong: 'Garantía real', small: 'Respaldo en cada compra' },
                  { icon: <Hammer size={16} className="text-[#ffd229]" />, strong: 'Instalación certificada', small: 'Equipo técnico propio' },
                  { icon: <Star size={16} className="text-[#ffd229]" />, strong: 'Compra protegida', small: 'Pago seguro y sin riesgos' },
                  { icon: <Phone size={16} className="text-[#ffd229]" />, strong: 'Asesoría sin costo', small: 'Consejero disponible' },
                ].map(({ icon, strong, small }) => (
                  <div
                    key={strong}
                    className="flex flex-col gap-1.5 p-4"
                    style={{
                      border: '1px solid rgba(255,248,237,0.10)',
                      borderRadius: 20,
                      background: 'rgba(255,255,255,0.035)',
                    }}
                  >
                    {icon}
                    <strong className="text-[13px] font-black leading-tight" style={{ color: '#fff8ed' }}>{strong}</strong>
                    <small className="text-[11px]" style={{ color: '#b9afa2' }}>{small}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copy card */}
          <div
            className="mt-6"
            style={{ ...CARD_STYLE, padding: 26 }}
          >
            <Kicker label="Por qué conviene" />
            <h2
              className="font-black mt-3"
              style={{
                fontSize: 'clamp(28px,4vw,44px)',
                lineHeight: 1,
                letterSpacing: '-0.055em',
                color: '#fff8ed',
              }}
            >
              Compra directa y sin rodeos
            </h2>
            <p className="mt-4 leading-[1.7] max-w-3xl" style={{ color: '#b9afa2' }}>
              {isFloor
                ? `Con la calculadora de m² evitas comprar de más o de menos. Paga ahora y coordinamos el despacho a tu zona en la Región del Maule, o conversa con un asesor certificado sin costo por WhatsApp antes de decidir.`
                : `Paga ahora y coordinamos el despacho a tu zona en la Región del Maule. Si prefieres conversar antes de decidir, nuestro equipo certificado te asesora por WhatsApp sin ningún costo.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link
                href="/contacto"
                className="rounded-full px-8 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-black hover:bg-yellow-300 transition"
                style={{ background: '#ffd229' }}
              >
                Evaluación gratuita
              </Link>
              <Link
                href="/proyectos"
                className="rounded-full px-8 py-3 text-[11px] font-black uppercase tracking-[0.25em] transition hover:border-yellow-400/40"
                style={{
                  border: '1px solid rgba(255,248,237,0.14)',
                  color: '#b9afa2',
                }}
              >
                Ver proyectos
              </Link>
            </div>
          </div>

          {/* Related products */}
          <section className="mt-8">
            <div className="mb-4">
              <Kicker label="Complementos" />
              <h2
                className="font-black mt-2"
                style={{
                  fontSize: 'clamp(30px,4vw,48px)',
                  letterSpacing: '-0.06em',
                  lineHeight: 1,
                  color: '#fff8ed',
                }}
              >
                También te puede interesar
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {relatedProducts.map((rel) => (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => navigateWithTransition(`/tienda/${rel.id}`, router)}
                  className="text-left transition hover:opacity-80 w-full"
                  style={{
                    border: '1px solid rgba(255,248,237,0.10)',
                    borderRadius: 22,
                    background: 'rgba(255,255,255,0.035)',
                    padding: 12,
                    display: 'grid',
                    gridTemplateColumns: '92px 1fr',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      height: 92,
                      borderRadius: 18,
                      overflow: 'hidden',
                      background: '#f3efe6',
                      flexShrink: 0,
                    }}
                  >
                    {rel.img ? (
                      <img src={rel.img} alt={rel.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-playfair text-2xl text-zinc-400">
                        {rel.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <strong className="text-[15px] font-black leading-tight truncate" style={{ color: '#fff8ed' }}>{rel.name}</strong>
                    <small className="text-[11px]" style={{ color: '#b9afa2' }}>{rel.category}</small>
                    <span className="text-[14px] font-[900]" style={{ color: '#ffd229' }}>{formatCLP(rel.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
