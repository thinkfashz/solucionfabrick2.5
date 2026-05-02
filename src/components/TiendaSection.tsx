'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
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
  title = 'Catálogo de Soluciones Fabrick',
  description = 'Cada material de este catálogo es seleccionado e instalado por nuestro equipo certificado directamente en tu proyecto. Pulsa cualquier producto para ver su ficha técnica.',
  primaryCtaHref = '/tienda',
  primaryCtaLabel = 'Ver catálogo completo',
}: TiendaSectionProps) {
  const router = useRouter();
  const { products } = useCatalogProducts();

  const visibleProducts = limit > 0 ? products.slice(0, limit) : products;

  return (
    <section className="py-10">
      <div className="text-center mb-14">
        <p className="text-yellow-400/80 text-xs tracking-[0.4em] uppercase font-semibold mb-4 hero-text-fade" style={{ animationDelay: '0s', animationFillMode: 'both' }}>Catálogo de Soluciones</p>
        <h2 className="font-playfair text-4xl md:text-6xl font-bold text-white hero-text-fade" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
          {title.split(' ').slice(0, -2).join(' ')} <span className="shimmer-gold">{title.split(' ').slice(-2).join(' ')}</span>
        </h2>
        <p className="text-white/45 mt-4 max-w-2xl mx-auto text-sm leading-relaxed hero-text-fade" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProducts.map((prod, i) => {
            const hasDiscount = (prod.discountPercentage ?? 0) > 0;
            const finalPrice = hasDiscount
              ? Math.round(prod.price * (1 - (prod.discountPercentage ?? 0) / 100))
              : prod.price;
            return (
            <article
              key={prod.id}
              className="card-3d glass-card rounded-4xl overflow-hidden group relative cursor-pointer focus-within:ring-2 focus-within:ring-yellow-400/60 slide-up"
              style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
              onClick={() => router.push(`/tienda/${prod.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/tienda/${prod.id}`);
                }
              }}
              role="link"
              tabIndex={0}
              aria-label={`Ver detalles de ${prod.name}`}
            >
              <div className="relative h-48 bg-white/5 overflow-hidden">
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
                {prod.featured ? (
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-yellow-400 text-black text-[10px] font-bold tracking-wider">
                    Destacado
                  </span>
                ) : null}
                {hasDiscount ? (
                  <span className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-black tracking-wider uppercase shadow-[0_0_18px_rgba(239,68,68,0.55)]">
                    <span className="motion-safe:animate-pulse">●</span> Última Oferta · -{prod.discountPercentage}%
                  </span>
                ) : null}
              </div>

              <div className="p-6 flex flex-col gap-4 min-h-[17rem]">
                <div>
                  <p className="text-yellow-400/60 text-xs tracking-[0.25em] uppercase mb-1">{prod.delivery}</p>
                  <h3 className="text-white font-semibold text-lg leading-snug">{prod.name}</h3>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed line-clamp-3">{prod.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {prod.features.slice(0, 2).map((feature) => (
                    <span key={feature} className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="flex items-end justify-between mt-auto pt-4 border-t border-white/5 gap-4">
                  <div>
                    {hasDiscount ? (
                      <div className="flex items-baseline gap-2">
                        <p className="text-yellow-400 font-bold text-2xl font-playfair">{CLP(finalPrice)}</p>
                        <p className="text-zinc-500 text-xs line-through">{CLP(prod.price)}</p>
                      </div>
                    ) : (
                      <p className="text-yellow-400 font-bold text-2xl font-playfair">{CLP(prod.price)}</p>
                    )}
                    <p className="text-white/30 text-xs mt-0.5">{prod.category}</p>
                  </div>
                  <AnimatedButton
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/tienda/${prod.id}`);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold tracking-wider hover:bg-yellow-400 hover:text-black transition-all duration-300"
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

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
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
