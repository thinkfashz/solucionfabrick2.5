'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useCart, formatCLP } from '@/hooks/useCart';
import { Star, Check, Truck, ArrowLeft, ShoppingCart, ChevronRight } from 'lucide-react';

/* ─── Animation variants (motion.dev / framer-motion) ───────── */
const containerVariants = {
  hidden:   { opacity: 0 },
  visible:  {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
} as const;

const itemVariants = {
  hidden:   { opacity: 0, y: 28, filter: 'blur(4px)' },
  visible:  {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { type: 'spring' as const, stiffness: 120, damping: 18, mass: 0.8 },
  },
};

const imageVariants = {
  hidden:   { opacity: 0, scale: 0.93 },
  visible:  {
    opacity: 1, scale: 1,
    transition: { type: 'spring' as const, stiffness: 90, damping: 20 },
  },
};

/* ─── Skeleton ────────────────────────────────────────────────── */
function ProductSkeleton() {
  return (
    <div className="min-h-screen bg-black px-6 py-24 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="h-3 w-40 bg-white/5 rounded-full animate-pulse mb-14" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-white/[0.04] rounded-2xl animate-pulse" />
          <div className="space-y-5 pt-2">
            <div className="h-9  bg-white/[0.04] rounded-lg animate-pulse w-4/5" />
            <div className="h-7  bg-white/[0.04] rounded-lg animate-pulse w-1/3" />
            <div className="h-3  bg-white/[0.04] rounded-full animate-pulse" />
            <div className="h-3  bg-white/[0.04] rounded-full animate-pulse w-5/6" />
            <div className="h-3  bg-white/[0.04] rounded-full animate-pulse w-4/6" />
            <div className="h-px bg-white/[0.04] animate-pulse mt-4" />
            <div className="h-14 bg-white/[0.04] rounded-xl animate-pulse mt-6" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Not Found ───────────────────────────────────────────────── */
function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="space-y-5"
      >
        <p className="text-white/10 text-8xl font-playfair select-none">404</p>
        <h2 className="text-white text-2xl font-playfair">Producto no encontrado</h2>
        <p className="text-white/35 text-sm max-w-xs mx-auto leading-relaxed">
          Este producto no existe o fue eliminado del catálogo.
        </p>
        <Link
          href="/tienda"
          className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 text-sm transition-colors mt-2"
        >
          <ArrowLeft size={13} />
          Ver todos los productos
        </Link>
      </motion.div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function ProductPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const { products, loading } = useRealtimeProducts();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const id = params?.id ?? '';

  const product = useMemo(
    () => products.find(p => p.id === id),
    [products, id],
  );

  const hasDiscount = Boolean(product?.discount_percentage && product.discount_percentage > 0);
  const finalPrice  = product
    ? hasDiscount
      ? product.price * (1 - (product.discount_percentage! / 100))
      : product.price
    : 0;

  const specEntries = product?.specifications
    ? Object.entries(product.specifications)
    : [];

  function handleAddToCart() {
    if (!product) return;
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  }

  /* States */
  if (loading)                 return <ProductSkeleton />;
  if (!loading && !product)    return <NotFound />;

  return (
    <div className="min-h-screen bg-black">

      <div className="max-w-6xl mx-auto px-6 md:px-12 pt-24 pb-32">

        {/* ── Breadcrumb ── */}
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-[11px] text-white/25 mb-14 tracking-wide"
          aria-label="Breadcrumb"
        >
          <Link href="/"       className="hover:text-white/50 transition-colors">Inicio</Link>
          <ChevronRight size={9} className="text-white/10 flex-shrink-0" />
          <Link href="/tienda" className="hover:text-white/50 transition-colors">Tienda</Link>
          <ChevronRight size={9} className="text-white/10 flex-shrink-0" />
          <span className="text-white/45 truncate max-w-[200px]">{product!.name}</span>
        </motion.nav>

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Image */}
          <motion.div
            variants={imageVariants}
            initial="hidden"
            animate="visible"
            className="relative"
          >
            {/* Glow halo */}
            <div className="absolute inset-0 bg-yellow-400/[0.06] blur-3xl rounded-full scale-75 translate-y-10 pointer-events-none" />

            <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.07]">
              {product!.image_url ? (
                <img
                  src={product!.image_url}
                  alt={product!.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/10 text-6xl font-playfair select-none">
                  {product!.name[0]}
                </div>
              )}

              {/* Discount badge */}
              {hasDiscount && (
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">
                  -{product!.discount_percentage}%
                </div>
              )}

              {/* Featured badge */}
              {product!.featured && (
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/25 text-yellow-400 text-xs font-medium">
                  ★ Destacado
                </div>
              )}
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6 md:pt-2"
          >
            {/* Name */}
            <motion.h1
              variants={itemVariants}
              className="font-playfair text-3xl md:text-4xl lg:text-5xl text-white leading-tight"
            >
              {product!.name}
            </motion.h1>

            {/* Price */}
            <motion.div variants={itemVariants} className="flex items-baseline gap-3 flex-wrap">
              <span className="text-yellow-400 text-2xl md:text-3xl font-medium">
                {formatCLP(finalPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-white/20 text-base line-through">
                    {formatCLP(product!.price)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-yellow-400/[0.12] text-yellow-400/80 text-xs font-bold border border-yellow-400/20">
                    -{product!.discount_percentage}% OFF
                  </span>
                </>
              )}
            </motion.div>

            {/* Star rating */}
            {product!.rating !== undefined && product!.rating > 0 && (
              <motion.div variants={itemVariants} className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      className={
                        i < Math.round(product!.rating!)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-white/10 fill-white/[0.04]'
                      }
                    />
                  ))}
                </div>
                <span className="text-white/25 text-xs">{product!.rating.toFixed(1)}</span>
              </motion.div>
            )}

            {/* Description */}
            {product!.description && (
              <motion.p variants={itemVariants} className="text-white/40 text-sm leading-relaxed">
                {product!.description}
              </motion.p>
            )}

            {/* Stock & delivery */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
              {product!.stock !== undefined ? (
                product!.stock > 0 ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/[0.07] border border-green-500/[0.18] text-green-400 text-xs">
                    <Check size={11} strokeWidth={2.5} />
                    <span>En stock · {product!.stock} disponibles</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.07] border border-red-500/[0.18] text-red-400/70 text-xs">
                    <span>Sin stock</span>
                  </div>
                )
              ) : null}

              {product!.delivery_days && (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/35 text-xs">
                  <Truck size={11} />
                  <span>Entrega en {product!.delivery_days} días</span>
                </div>
              )}
            </motion.div>

            {/* Divider */}
            <motion.div variants={itemVariants} className="h-px bg-white/[0.06]" />

            {/* CTA */}
            <motion.div variants={itemVariants} className="space-y-3 pt-1">
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.div
                    key="added"
                    initial={{ opacity: 0, scale: 0.96, y: 4 }}
                    animate={{ opacity: 1, scale: 1,  y: 0 }}
                    exit={{    opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="w-full py-4 rounded-xl bg-green-500/[0.12] border border-green-500/25 text-green-400 flex items-center justify-center gap-3 text-sm font-medium"
                  >
                    <Check size={15} strokeWidth={2.5} />
                    ¡Agregado al carrito!
                  </motion.div>
                ) : (
                  <motion.button
                    key="add"
                    initial={{ opacity: 0, scale: 0.94, y: 6 }}
                    animate={{ opacity: 1, scale: 1,  y: 0 }}
                    exit={{    opacity: 0, scale: 0.94, y: -6 }}
                    whileHover={{ scale: 1.025, boxShadow: '0 0 28px rgba(250,204,21,0.18)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    onClick={handleAddToCart}
                    disabled={product!.stock !== undefined && product!.stock < 1}
                    className="w-full py-4 rounded-xl relative overflow-hidden group
                      bg-gradient-to-r from-zinc-800 to-zinc-700 border border-white/[0.09] text-white
                      hover:border-yellow-400/35 hover:from-zinc-700 hover:to-zinc-600
                      disabled:opacity-40 disabled:cursor-not-allowed
                      flex items-center justify-center gap-3 text-sm font-medium cursor-pointer"
                  >
                    {/* Shimmer sweep */}
                    <span
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/[0.08] to-transparent
                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none"
                    />
                    <ShoppingCart size={15} className="text-yellow-400 relative z-10" />
                    <span className="relative z-10">Añadir al Carrito</span>
                  </motion.button>
                )}
              </AnimatePresence>

              <button
                onClick={() => router.back()}
                className="w-full py-3 text-white/20 hover:text-white/45 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={11} />
                Volver a la tienda
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Specifications ── */}
        {specEntries.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-24 max-w-2xl"
            aria-label="Especificaciones del producto"
          >
            <h2 className="text-white/30 text-[10px] tracking-[0.35em] uppercase mb-6 font-medium">
              Especificaciones
            </h2>

            <div className="rounded-xl overflow-hidden border border-white/[0.06]">
              {specEntries.map(([key, value], i) => (
                <div
                  key={key}
                  className={`flex justify-between items-center px-5 py-3.5 ${
                    i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
                  }`}
                >
                  <span className="text-white/30 text-sm capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-white/60 text-sm text-right max-w-[55%]">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Bottom CTA strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-16 flex items-center gap-6 flex-wrap"
        >
          <Link
            href="/tienda"
            className="inline-flex items-center gap-2 text-white/25 hover:text-white/55 text-xs transition-colors"
          >
            <ArrowLeft size={12} />
            Todos los productos
          </Link>
          <span className="text-white/10 text-xs hidden sm:block">·</span>
          <Link
            href="/#servicios"
            className="text-white/25 hover:text-white/55 text-xs transition-colors hidden sm:block"
          >
            Ver servicios
          </Link>
        </motion.div>

      </div>
    </div>
  );
}



