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

export default function TiendaSection({ limit = 4, title = 'Destacados', description = '', primaryCtaHref = '/tienda', primaryCtaLabel = 'Ver tienda', variant = 'grid' }: TiendaSectionProps) {
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

  if (visibleProducts.length === 0) return <div className="border-t border-black/10 py-8 text-center text-sm font-black text-black/45">El catálogo se está actualizando. <Link href={primaryCtaHref} className="text-[#9A5B22]">Ir a la tienda</Link></div>;

  if (variant === 'banner') return <FeaturedProductsCarousel products={visibleProducts} title={title} description={description} ctaHref={primaryCtaHref} ctaLabel={primaryCtaLabel} addedProductId={addedProductId} onAdd={addProduct} onBuy={goToProduct} />;

  return (
    <section className="py-2 md:py-3">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#9A5B22]">{title}</p>
          {description ? <p className="mt-1 line-clamp-1 max-w-xl text-[10px] leading-5 text-black/34">{description}</p> : null}
        </div>
        <Link href={primaryCtaHref} className="inline-flex shrink-0 items-center gap-1 text-[9px] font-black uppercase tracking-[.11em] text-[#9A5B22] transition hover:gap-2">{primaryCtaLabel}<ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>

      <div className="-mx-4 grid auto-cols-[minmax(250px,78vw)] grid-flow-col gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid-flow-row sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
        {visibleProducts.map((product) => {
          const price = finalProductPrice(product);
          const discount = Number(product.discountPercentage ?? product.discount_percentage ?? 0);
          const added = addedProductId === product.id;
          return (
            <article key={product.id} className="group min-w-0 overflow-hidden rounded-[1.5rem] bg-white transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(40,30,20,.08)]">
              <button type="button" onClick={() => goToProduct(product)} className="relative aspect-[4/3] w-full overflow-hidden bg-[#EAE4DA] text-left" aria-label={`Ver ${displayProductName(product.name)}`}>
                {product.img ? <img src={product.img} alt={displayProductName(product.name)} width={560} height={420} loading="lazy" decoding="async" fetchPriority="low" className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-[1.025]" /> : null}
                {discount > 0 ? <span className="absolute left-3 top-3 rounded-full bg-[#111214] px-2.5 py-1 text-[8px] font-black text-white">-{discount}%</span> : null}
              </button>

              <div className="p-4 sm:p-5">
                <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#9A5B22]">{product.category}</p>
                <button type="button" onClick={() => goToProduct(product)} className="mt-1.5 line-clamp-2 min-h-[2.6rem] text-left text-base font-black leading-[1.2] tracking-[-.025em] text-[#111214]">{displayProductName(product.name)}</button>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <strong className="block text-xl font-black tracking-[-.04em] text-[#111214]">{CLP(price)}</strong>
                    <span className="mt-0.5 block text-[8px] font-black uppercase tracking-[.1em] text-black/34">IVA incluido</span>
                  </div>
                  <button
                    type="button"
                    disabled={product.stock === 0}
                    onClick={() => addProduct(product)}
                    aria-label={product.stock === 0 ? 'Sin stock' : `Agregar ${displayProductName(product.name)}`}
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition disabled:opacity-30 ${added ? 'bg-emerald-600 text-white' : 'bg-[#111214] text-[#E6B56F] hover:bg-[#2B2C2F]'}`}
                  >
                    {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
                <button type="button" onClick={() => goToProduct(product)} className="mt-4 text-[9px] font-black uppercase tracking-[.11em] text-black/38 transition group-hover:text-black/70">Ver detalle →</button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-2 text-[9px] text-black/30 sm:hidden">Desliza para ver más productos →</p>
    </section>
  );
}
