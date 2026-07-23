'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgePercent, ShoppingBag } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';

const CLP = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(value);

interface TiendaSectionProps {
  limit?: number;
  title?: string;
  description?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  variant?: 'grid' | 'banner';
}

export default function TiendaSection({
  limit = 6,
  title = 'Productos más solicitados',
  description = 'Una selección de productos disponibles en la tienda Soluciones Fabrick.',
  primaryCtaHref = '/tienda',
  primaryCtaLabel = 'Ver tienda completa',
  variant = 'grid',
}: TiendaSectionProps) {
  const router = useRouter();
  const { products } = useCatalogProducts();

  const rankedProducts = [...products].sort((a, b) => {
    const score = (product: typeof a) => {
      const discount = product.discountPercentage ?? 0;
      return (product.featured ? 100 : 0) + discount;
    };
    return score(b) - score(a);
  });
  const visibleProducts = rankedProducts.slice(0, Math.max(1, limit));
  const goToProduct = (id: string) => navigateWithTransition(`/tienda/${id}`, router);

  if (visibleProducts.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[.035] p-6 text-center">
        <ShoppingBag className="mx-auto h-7 w-7 text-yellow-300" />
        <p className="mt-3 text-sm font-black text-white">El catálogo se está actualizando.</p>
        <Link href={primaryCtaHref} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-yellow-300">Ir a la tienda <ArrowRight className="h-4 w-4" /></Link>
      </div>
    );
  }

  if (variant === 'banner') {
    const [featured, ...secondary] = visibleProducts;
    const featuredDiscount = featured.discountPercentage ?? 0;
    const featuredPrice = featuredDiscount > 0 ? Math.round(featured.price * (1 - featuredDiscount / 100)) : featured.price;

    return (
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Desde nuestra tienda</p>
            <h2 className="mt-3 text-4xl font-black leading-[.96] tracking-[-.05em] text-white sm:text-5xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">{description}</p>
          </div>
          <Link href={primaryCtaHref} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[.055] px-5 text-xs font-black text-white transition hover:border-yellow-300/40 hover:text-yellow-200">
            {primaryCtaLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-7 grid overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#100e0a] lg:grid-cols-[1.12fr_.88fr]">
          <article className="group relative min-h-[420px] overflow-hidden border-b border-white/10 lg:border-b-0 lg:border-r">
            {featured.img ? <img src={featured.img} alt={featured.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="absolute inset-0 bg-[#17130d]" />}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.92))]" />
            <button type="button" aria-label={`Ver ${featured.name}`} onClick={() => goToProduct(featured.id)} className="absolute inset-0 z-10" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-yellow-300 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-black">Más vendido</span>
                {featuredDiscount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-[9px] font-black uppercase tracking-[.14em] text-white"><BadgePercent className="h-3 w-3" /> -{featuredDiscount}%</span> : null}
              </div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">{featured.category}</p>
              <h3 className="mt-2 max-w-xl text-3xl font-black leading-tight tracking-[-.045em] text-white">{featured.name}</h3>
              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <strong className="text-3xl font-black text-yellow-300">{CLP(featuredPrice)}</strong>
                {featuredDiscount > 0 ? <span className="text-sm text-zinc-400 line-through">{CLP(featured.price)}</span> : null}
              </div>
              <p className="mt-2 text-xs text-zinc-300">{featured.delivery}</p>
            </div>
          </article>

          <div className="grid">
            {secondary.slice(0, 2).map((product) => {
              const discount = product.discountPercentage ?? 0;
              const finalPrice = discount > 0 ? Math.round(product.price * (1 - discount / 100)) : product.price;
              return (
                <article key={product.id} className="group grid min-h-[210px] grid-cols-[125px_1fr] overflow-hidden border-b border-white/10 last:border-b-0 sm:grid-cols-[190px_1fr]">
                  <button type="button" onClick={() => goToProduct(product.id)} aria-label={`Ver ${product.name}`} className="relative overflow-hidden bg-white/5">
                    {product.img ? <img src={product.img} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full w-full bg-[#17130d]" />}
                  </button>
                  <div className="flex flex-col justify-center p-4 sm:p-5">
                    <p className="text-[8px] font-black uppercase tracking-[.2em] text-yellow-300">{product.category}</p>
                    <button type="button" onClick={() => goToProduct(product.id)} className="mt-2 text-left text-lg font-black leading-snug text-white transition hover:text-yellow-200">{product.name}</button>
                    <div className="mt-3 flex flex-wrap items-baseline gap-2">
                      <strong className="text-xl font-black text-yellow-300">{CLP(finalPrice)}</strong>
                      {discount > 0 ? <span className="text-xs text-zinc-500 line-through">{CLP(product.price)}</span> : null}
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-500">{product.delivery}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-8 md:py-10">
      <div className="mb-8 md:mb-10">
        <p className="text-[10px] font-black uppercase tracking-[.24em] text-yellow-300">Tienda Soluciones Fabrick</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-white md:text-5xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => {
          const discount = product.discountPercentage ?? 0;
          const finalPrice = discount > 0 ? Math.round(product.price * (1 - discount / 100)) : product.price;
          return (
            <article key={product.id} className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#11100d] transition hover:-translate-y-1 hover:border-yellow-300/35">
              <button type="button" onClick={() => goToProduct(product.id)} className="relative block h-48 w-full overflow-hidden bg-white/5 text-left" aria-label={`Ver ${product.name}`}>
                {product.img ? <img src={product.img} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              </button>
              <div className="p-5">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">{product.category}</p>
                <button type="button" onClick={() => goToProduct(product.id)} className="mt-2 line-clamp-2 text-left text-lg font-black text-white">{product.name}</button>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                  <div><strong className="text-xl font-black text-yellow-300">{CLP(finalPrice)}</strong><p className="mt-1 text-[10px] text-zinc-500">{product.delivery}</p></div>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Link href={primaryCtaHref} className="mt-7 inline-flex items-center gap-2 rounded-full bg-yellow-300 px-6 py-3 text-xs font-black text-black transition hover:bg-white">{primaryCtaLabel}<ArrowRight className="h-4 w-4" /></Link>
    </section>
  );
}
