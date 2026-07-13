'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lightbulb, Snowflake, Sparkles, Wrench } from 'lucide-react';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import AnimatedButton from '@/components/ui/animated-button';

const CLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

interface TiendaSectionProps {
  limit?: number;
  title?: string;
  description?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
}

export default function TiendaSection({
  limit = 6,
  title = 'Productos más solicitados',
  description = 'Una selección centrada en confort, iluminación y mejoras del hogar. Revisa el producto, sus características y consulta la alternativa de instalación.',
  primaryCtaHref = '/tienda',
  primaryCtaLabel = 'Ver catálogo completo',
}: TiendaSectionProps) {
  const router = useRouter();
  const { products } = useCatalogProducts();

  const priorityWords = ['aire', 'acondicionado', 'climat', 'lámpara', 'lampara', 'luz', 'led', 'foco', 'grifer', 'ducha'];
  const rankedProducts = [...products].sort((a, b) => {
    const score = (product: typeof a) => (product.featured ? 20 : 0) + priorityWords.reduce((total, word) => total + (`${product.name} ${product.category} ${product.description}`.toLowerCase().includes(word) ? 3 : 0), 0);
    return score(b) - score(a);
  });
  const visibleProducts = limit > 0 ? rankedProducts.slice(0, limit) : rankedProducts;

  // Same cinematic transition overlay used across the rest of the site —
  // keeps catalog → product-detail navigation visually consistent.
  const goToProduct = (id: string) => navigateWithTransition(`/tienda/${id}`, router);

  return (
    <section className="py-8 md:py-10">
      <div className="mb-8 md:mb-10">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.32em] text-yellow-300">Catálogo de soluciones</p>
        <h2 className="text-3xl font-black tracking-[-.045em] text-white md:text-5xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/tienda" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-200"><Snowflake className="h-4 w-4" /> Climatización</Link>
          <Link href="/tienda" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-yellow-300/40 hover:text-yellow-300"><Lightbulb className="h-4 w-4" /> Iluminación</Link>
          <Link href="/servicios" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-bold text-zinc-300 transition hover:border-yellow-300/40 hover:text-yellow-300"><Wrench className="h-4 w-4" /> Consultar instalación</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((prod, i) => {
            const hasDiscount = (prod.discountPercentage ?? 0) > 0;
            const finalPrice = hasDiscount
              ? Math.round(prod.price * (1 - (prod.discountPercentage ?? 0) / 100))
              : prod.price;
            return (
            <article
              key={prod.id}
              className="group relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#11100d] transition hover:-translate-y-1 hover:border-yellow-300/35 focus-within:ring-2 focus-within:ring-yellow-400/60"
              style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
            >
              <div className="relative h-44 overflow-hidden bg-white/5">
                {prod.img ? (
                  <img
                    src={prod.img}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-950">
                    <span className="font-playfair text-4xl font-bold text-yellow-400/20 tracking-widest">FBK</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <button type="button" onClick={() => goToProduct(prod.id)} aria-label={`Ver detalles de ${prod.name}`} className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-300/70" />
                {prod.featured ? (
                  <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-yellow-400 px-3 py-1 text-[10px] font-bold tracking-wider text-black">
                    Más solicitado
                  </span>
                ) : null}
                {hasDiscount ? (
                  <span className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(239,68,68,0.55)]">
                    <span className="motion-safe:animate-pulse">●</span> Última Oferta · -{prod.discountPercentage}%
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 p-5">
                <div>
                  <p className="mb-1 text-[9px] font-black uppercase tracking-[0.24em] text-yellow-300">{prod.category}</p>
                  <button type="button" onClick={() => goToProduct(prod.id)} className="line-clamp-2 min-h-[2.7em] text-left text-[17px] font-black leading-snug text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60">{prod.name}</button>
                </div>

                <div className="grid gap-1.5">
                  {prod.features.slice(0, 2).map((feature) => (
                    <span key={feature} className="inline-flex items-center gap-2 truncate text-[11px] text-zinc-300">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-300" /> {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-1 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
                  <div>
                    {hasDiscount ? (
                      <div className="flex items-baseline gap-2">
                        <p className="text-yellow-400 font-bold text-2xl font-playfair">{CLP(finalPrice)}</p>
                        <p className="text-zinc-500 text-xs line-through">{CLP(prod.price)}</p>
                      </div>
                    ) : (
                      <p className="text-yellow-400 font-bold text-2xl font-playfair">{CLP(prod.price)}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-zinc-400">{prod.delivery}</p>
                  </div>
                  <AnimatedButton
                    onClick={(e) => {
                      e.stopPropagation();
                      goToProduct(prod.id);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-yellow-300 px-4 text-xs font-black text-black transition hover:bg-white"
                  >
                    Ver producto
                    <Sparkles className="h-3.5 w-3.5" />
                  </AnimatedButton>
                </div>
              </div>
            </article>
            );
          })}
        </div>

      <div className="mt-8 flex flex-wrap items-center justify-start gap-4">
        <Link
          href={primaryCtaHref}
          className="inline-flex items-center gap-3 rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
        >
          {primaryCtaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
