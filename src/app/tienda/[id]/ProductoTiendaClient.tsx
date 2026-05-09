'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Hammer, MapPin, Package, Phone, Ruler, ShieldCheck, Check, ShoppingCart, Sparkles, Satellite } from 'lucide-react';
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

export default function ProductoTiendaClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { products, loading } = useRealtimeProducts();
  const { addToCart, totalItems, openCart } = useCartContext();

  const id = params?.id ?? '';
  const product = useMemo(() => products.find((p) => p.id === id), [products, id]);
  const [activeImg, setActiveImg] = useState(0);
  const [purchaseMode, setPurchaseMode] = useState<'product' | 'product_labor' | 'turnkey_m2'>('product');
  const [addedToCart, setAddedToCart] = useState(false);

  function handleAddToCart() {
    if (!product) return;
    addToCart(product);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
    openCart();
  }

  useEffect(() => {
    setActiveImg(0);
  }, [id]);

  const gallery = product ? buildGallery(product) : [];
  const mainImg = gallery[activeImg] || gallery[0];

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && (p.category_id === product.category_id || p.featured))
      .slice(0, 4);
  }, [products, product]);

  const purchasePreview = useMemo(() => {
    if (!product) return { title: '', summary: '', estimated: '' };
    if (purchaseMode === 'product') {
      return {
        title: 'Compra directa inmediata',
        summary: 'Pagas ahora y coordinamos despacho prioritario según tu zona.',
        estimated: formatCLP(product.price),
      };
    }
    if (purchaseMode === 'product_labor') {
      return {
        title: 'Producto + instalación certificada',
        summary: 'Incluye visita técnica, mano de obra y supervisión de terminaciones.',
        estimated: `Desde ${formatCLP(Math.round(product.price * 1.65))}`,
      };
    }
    return {
      title: 'Proyecto integral por m²',
      summary: 'Modelo llave en mano con ingeniería, ejecución y control de obra.',
      estimated: `Desde ${formatCLP(Math.round(product.price * 2.3))} / referencia`,
    };
  }, [product, purchaseMode]);

  const outOfStock = product?.stock !== undefined && product.stock <= 0;

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
            <motion.div
              whileHover={{ rotateX: -3, rotateY: 4, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 170, damping: 20 }}
              style={{ transformPerspective: 1200 }}
              className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
            >
              {mainImg ? (
                <img
                  src={mainImg}
                  alt={`${product.name} — imagen principal del material instalado por Soluciones Fabrick`}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-playfair text-6xl text-white/10">
                  {product.name[0]}
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,0.25),transparent_45%)]" />
              {product.featured ? (
                <span className="absolute top-4 left-4 rounded-full bg-yellow-400/95 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-black">
                  Destacado
                </span>
              ) : null}
            </motion.div>

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

            {/* Purchase mode selector — customer chooses what to buy */}
            <div className="space-y-3 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">¿Qué quieres comprar?</p>
              <div className="grid gap-2">
                {[
                  {
                    id: 'product' as const,
                    icon: Package,
                    title: 'Solo producto',
                    desc: 'Solo el material. Tú gestionas la instalación por tu cuenta.',
                    price: formatCLP(product.price),
                  },
                  {
                    id: 'product_labor' as const,
                    icon: Hammer,
                    title: 'Producto + mano de obra',
                    desc: 'Material + instalación por nuestro equipo certificado.',
                    price: 'Cotizar',
                  },
                  {
                    id: 'turnkey_m2' as const,
                    icon: Ruler,
                    title: 'Completo por m²',
                    desc: 'Proyecto llave en mano cobrado por metro cuadrado.',
                    price: 'Cotizar',
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = purchaseMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPurchaseMode(opt.id)}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-yellow-400/60 bg-yellow-400/[0.07]'
                          : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                          active ? 'bg-yellow-400/15 text-yellow-400' : 'bg-white/5 text-zinc-400'
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[13px] font-bold ${active ? 'text-yellow-400' : 'text-white'}`}>
                            {opt.title}
                          </span>
                          <span className={`text-[11px] font-bold ${active ? 'text-yellow-400' : 'text-zinc-400'}`}>
                            {opt.price}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{opt.desc}</p>
                      </div>
                      <div
                        className={`mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? 'border-yellow-400 bg-yellow-400' : 'border-zinc-600'
                        }`}
                      >
                        {active && <Check size={10} className="text-black" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-4">
              {purchaseMode === 'product' ? (
                <>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={outOfStock}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-yellow-400 px-6 py-4 text-[12px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addedToCart ? (
                      <><Check size={14} /> ¡Añadido al carrito!</>
                    ) : (
                      <><ShoppingCart size={14} /> Añadir al carrito{totalItems > 0 ? ` (${totalItems})` : ''}</>
                    )}
                  </button>
                  <Link
                    href={`/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${encodeURIComponent(String(product.price))}${product.image_url ? `&img=${encodeURIComponent(product.image_url)}` : ''}`}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400 transition hover:bg-yellow-400/10"
                  >
                    Comprar solo este · {formatCLP(product.price)}
                    <ChevronRight size={14} />
                  </Link>
                </>
              ) : (
                <Link
                  href={`/contacto?producto=${encodeURIComponent(product.name)}&modalidad=${purchaseMode}`}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-yellow-400 px-6 py-4 text-[12px] font-black uppercase tracking-[0.25em] text-black transition hover:bg-yellow-300"
                >
                  {purchaseMode === 'product_labor' ? 'Cotizar producto + mano de obra' : 'Cotizar proyecto por m²'}
                  <ChevronRight size={14} />
                </Link>
              )}
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400 transition hover:bg-emerald-500/10"
              >
                <Phone size={13} /> Consultar por WhatsApp
              </a>
            </div>

            <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.06] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-cyan-200">Preview de compra</p>
                  <p className="mt-1 text-sm font-bold text-white">{purchasePreview.title}</p>
                </div>
                <Sparkles size={15} className="text-cyan-200" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{purchasePreview.summary}</p>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-300/20 bg-black/35 px-3 py-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">Estimación</span>
                <span className="text-xs font-black text-cyan-200">{purchasePreview.estimated}</span>
              </div>
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
            Experiencia de compra pensada para obra real
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300 md:text-base">
            Ofrecemos tres modalidades para que adquieras este material como te acomode: llévate solo el producto, súmale
            mano de obra de nuestro equipo certificado, o contrata el proyecto completo cobrado por m². Puedes empezar por
            el producto y más adelante sumar la instalación — siempre con respaldo Fabrick.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <Package size={18} className="text-yellow-400" />
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white">Solo producto</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Solo el material. Tú decides quién lo instala.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <Hammer size={18} className="text-yellow-400" />
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white">Producto + mano de obra</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Compra el material y agrega la instalación por nuestro equipo.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <Ruler size={18} className="text-yellow-400" />
              <p className="mt-3 text-[11px] font-black uppercase tracking-[0.2em] text-white">Completo por m²</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Proyecto llave en mano cobrado por metro cuadrado.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Despacho</p>
              <p className="mt-1 text-xs font-bold text-white">Logística directa</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Calidad</p>
              <p className="mt-1 text-xs font-bold text-white">Selección premium</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Soporte</p>
              <p className="mt-1 text-xs font-bold text-white">Acompañamiento técnico</p>
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

        {relatedProducts.length > 0 ? (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-200">Combinan con este material</p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Productos relacionados</h3>
              </div>
              <Satellite size={18} className="text-cyan-200" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((rel, index) => (
                <motion.div
                  key={rel.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.38, delay: index * 0.06 }}
                >
                  <Link
                    href={`/tienda/${encodeURIComponent(rel.id)}`}
                    className="group block overflow-hidden rounded-2xl border border-white/10 bg-black/35 transition hover:border-cyan-300/35"
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      {rel.image_url ? (
                        <img
                          src={rel.image_url}
                          alt={rel.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl text-white/10">{rel.name[0]}</div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm font-bold text-white">{rel.name}</p>
                      <p className="mt-2 text-xs font-black text-cyan-200">{formatCLP(rel.price)}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ) : null}

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
