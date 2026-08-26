'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
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
    addedTimer.current = window.setTimeout(() => setAddedProductId(null), 1800);
  };

  if (visibleProducts.length === 0) return <div className="border-t border-black/10 py-8 text-center text-sm font-black text-black/45">El catálogo se está actualizando. <Link href={primaryCtaHref} className="text-[#B96F00]">Ir a la tienda</Link></div>;

  if (variant === 'banner') return <FeaturedProductsCarousel products={visibleProducts} title={title} description={description} ctaHref={primaryCtaHref} ctaLabel={primaryCtaLabel} addedProductId={addedProductId} onAdd={addProduct} onBuy={goToProduct} />;

  return (
    <section className="py-6 md:py-8">
      <div className="mb-6 grid gap-3 border-b border-black/10 pb-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#B96F00]">Tienda Soluciones Fabrick</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-.04em] text-[#08090A] md:text-3xl">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/45">{description}</p>
        </div>
        <Link href={primaryCtaHref} className="text-xs font-black text-[#B96F00]">{primaryCtaLabel} →</Link>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
        {visibleProducts.map((product) => {
          const price = finalProductPrice(product);
          const discount = Number(product.discountPercentage ?? product.discount_percentage ?? 0);
          return <article key={product.id} className="min-w-0">
            <button type="button" onClick={() => goToProduct(product)} className="relative aspect-square w-full overflow-hidden bg-white text-left" aria-label={`Ver ${displayProductName(product.name)}`}>
              {product.img ? <img src={product.img} alt={displayProductName(product.name)} className="h-full w-full object-contain transition duration-500 hover:scale-[1.03]" /> : null}
              {discount > 0 ? <span className="absolute left-2 top-2 rounded-full bg-[#F5871F] px-2 py-1 text-[9px] font-black text-[#08090A]">-{discount}%</span> : null}
            </button>
            <p className="mt-3 text-[9px] font-black uppercase tracking-[.12em] text-[#B96F00]">{product.category}</p>
            <button type="button" onClick={() => goToProduct(product)} className="mt-1 line-clamp-2 min-h-[2.55rem] text-left text-sm font-black leading-[1.15] text-[#08090A]">{displayProductName(product.name)}</button>
            <div className="mt-3 border-t border-black/10 pt-3">
              <strong className="block text-lg font-black tracking-[-.03em] text-[#08090A]">{CLP(price)}</strong>
              <span className="mt-1 block text-[9px] font-black uppercase tracking-[.1em] text-emerald-700">IVA incluido</span>
            </div>
            <button type="button" disabled={product.stock === 0} onClick={() => addProduct(product)} className="mt-3 min-h-10 w-full rounded-full border border-black/15 px-3 text-[10px] font-black text-[#08090A] transition hover:border-[#F5871F] hover:bg-[#F5871F]/10 disabled:opacity-35">{addedProductId === product.id ? 'Añadido' : product.stock === 0 ? 'Sin stock' : 'Agregar'}</button>
          </article>;
        })}
      </div>
    </section>
  );
}
