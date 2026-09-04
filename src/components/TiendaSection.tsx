'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
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

  if (visibleProducts.length === 0) return <div className="border-t border-black/10 py-8 text-center text-sm font-black text-black/45">El catálogo se está actualizando. <Link href={primaryCtaHref} className="text-[#B96A16]">Ir a la tienda</Link></div>;

  if (variant === 'banner') return <FeaturedProductsCarousel products={visibleProducts} title={title} description={description} ctaHref={primaryCtaHref} ctaLabel={primaryCtaLabel} addedProductId={addedProductId} onAdd={addProduct} onBuy={goToProduct} />;

  return (
    <section className="py-3 md:py-5">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-black/[.07] pb-4">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-black uppercase tracking-[.16em] text-[#A3611B]">{title}</p>
          {description ? <p className="mt-1 line-clamp-1 max-w-2xl text-[10px] leading-5 text-black/34">{description}</p> : null}
        </div>
        <Link href={primaryCtaHref} className="inline-flex shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-[.11em] text-[#B96A16] transition hover:gap-2">{primaryCtaLabel}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>

      <div className="-mx-4 grid auto-cols-[minmax(245px,78vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:px-0 md:grid-cols-3 xl:grid-cols-6">
        {visibleProducts.map((product) => {
          const price = finalProductPrice(product);
          const discount = Number(product.discountPercentage ?? product.discount_percentage ?? 0);
          const added = addedProductId === product.id;
          return (
            <article key={product.id} className="group min-w-0 rounded-[1.45rem] border border-black/[.055] bg-white p-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-black/[.09] hover:shadow-[0_16px_36px_rgba(40,30,20,.07)]">
              <button type="button" onClick={() => goToProduct(product)} className="relative aspect-[1.04/1] w-full overflow-hidden rounded-[1.1rem] bg-[#F5F1EB] text-left" aria-label={`Ver ${displayProductName(product.name)}`}>
                {product.img ? <img src={product.img} alt={displayProductName(product.name)} width={480} height={480} loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.025]" /> : null}
                {discount > 0 ? <span className="absolute left-2.5 top-2.5 rounded-full bg-[#F28C28] px-2.5 py-1 text-[8px] font-black text-[#0B0C0E]">-{discount}%</span> : null}
                <span className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-[#0B0C0E] opacity-0 backdrop-blur transition group-hover:opacity-100"><ArrowUpRight className="h-3.5 w-3.5" /></span>
              </button>

              <div className="px-1 pb-1 pt-3">
                <p className="text-[8px] font-black uppercase tracking-[.13em] text-[#A3611B]">{product.category}</p>
                <button type="button" onClick={() => goToProduct(product)} className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-left text-sm font-black leading-[1.18] text-[#0B0C0E]">{displayProductName(product.name)}</button>

                <div className="mt-4 flex items-end justify-between gap-2 border-t border-black/[.06] pt-3">
                  <div>
                    <strong className="block text-lg font-black tracking-[-.035em] text-[#0B0C0E]">{CLP(price)}</strong>
                    <span className="mt-0.5 block text-[8px] font-black uppercase tracking-[.1em] text-emerald-700">IVA incluido</span>
                  </div>
                  <button
                    type="button"
                    disabled={product.stock === 0}
                    onClick={() => addProduct(product)}
                    aria-label={product.stock === 0 ? 'Sin stock' : `Agregar ${displayProductName(product.name)}`}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition disabled:opacity-30 ${added ? 'bg-emerald-600 text-white' : 'bg-[#0B0C0E] text-[#F5A13D] hover:bg-[#24262A]'}`}
                  >
                    {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-2 text-[9px] text-black/32 sm:hidden">Desliza para ver más productos →</p>
    </section>
  );
}