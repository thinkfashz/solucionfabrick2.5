'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, type CatalogProduct } from '@/hooks/useCatalogProducts';
import { useCartContext } from '@/context/CartContext';
import FeaturedProductsCarousel from '@/components/store/FeaturedProductsCarousel';
import { CLP, displayProductName, finalProductPrice, toCartProduct } from '@/components/store/featuredProducts';

interface TiendaSectionProps {
  limit?: number;
  title?: string;
  description?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  variant?: 'grid' | 'banner';
}

export default function TiendaSection({ limit = 6, title = 'Productos más solicitados', description = 'Una selección de productos disponibles en la tienda Soluciones Fabrick.', primaryCtaHref = '/tienda', primaryCtaLabel = 'Ver tienda completa', variant = 'grid' }: TiendaSectionProps) {
  const router = useRouter();
  const { products } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const addedTimer = useRef<number | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const visibleProducts = useMemo(() => {
    const ranked = [...products].sort((a, b) => {
      const score = (product: typeof a) => (product.featured ? 100 : 0) + (product.discountPercentage ?? product.discount_percentage ?? 0) + Math.min(product.rating ?? 0, 5);
      return score(b) - score(a);
    });
    const requested = variant === 'banner' ? Math.max(3, limit) : limit;
    return ranked.slice(0, Math.max(1, requested));
  }, [limit, products, variant]);

  const goToProduct = (product: CatalogProduct) => navigateWithTransition(`/tienda/${product.id}`, router);
  const addProduct = (product: CatalogProduct) => {
    if (product.stock === 0) return;
    addToCart(toCartProduct(product), 1);
    setAddedProductId(product.id);
    if (addedTimer.current) window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAddedProductId(null), 2200);
  };

  if (visibleProducts.length === 0) return <div className="rounded-[1.75rem] border border-white/10 bg-white/[.035] p-6 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-yellow-300" /><p className="mt-3 text-sm font-black text-white">El catálogo se está actualizando.</p><Link href={primaryCtaHref} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-yellow-300">Ir a la tienda <ArrowRight className="h-4 w-4" /></Link></div>;

  if (variant === 'banner') return <FeaturedProductsCarousel products={visibleProducts} title={title} description={description} ctaHref={primaryCtaHref} ctaLabel={primaryCtaLabel} addedProductId={addedProductId} onAdd={addProduct} onBuy={goToProduct} />;

  return (
    <section className="py-8 md:py-10">
      <div className="mb-8 md:mb-10"><p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Tienda Soluciones Fabrick</p><h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-white md:text-5xl">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">{description}</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => <article key={product.id} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111214] transition hover:-translate-y-1 hover:border-yellow-300/35"><button type="button" onClick={() => goToProduct(product)} className="relative block h-48 w-full overflow-hidden bg-white/5 text-left" aria-label={`Ver ${displayProductName(product.name)}`}>{product.img ? <img src={product.img} alt={displayProductName(product.name)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}<span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" /></button><div className="p-5"><p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">{product.category}</p><button type="button" onClick={() => goToProduct(product)} className="mt-2 line-clamp-2 text-left text-lg font-black text-white">{displayProductName(product.name)}</button><div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4"><div><strong className="text-xl font-black text-yellow-300">{CLP(finalProductPrice(product))}</strong><p className="mt-1 text-[10px] text-zinc-500">{product.delivery}</p></div><ArrowRight className="h-4 w-4 text-zinc-500" /></div></div></article>)}
      </div>
      <Link href={primaryCtaHref} className="mt-7 inline-flex items-center gap-2 rounded-full bg-yellow-300 px-6 py-3 text-xs font-black text-black transition hover:bg-white">{primaryCtaLabel}<ArrowRight className="h-4 w-4" /></Link>
    </section>
  );
}
