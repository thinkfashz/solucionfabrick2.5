'use client';

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';

const CLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

interface TiendaSectionProps {
  limit?: number;
  title?: string;
  description?: string;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
}

export default function TiendaSection({
  limit = 6,
  title = 'Catalogo conectado a tu proyecto',
  description = 'Productos y materiales visibles para el cliente, actualizados automaticamente y listos para cotizar o comprar.',
  primaryCtaHref = '/soluciones',
  primaryCtaLabel = 'Ver catalogo completo',
  secondaryCtaHref = '/tienda',
  secondaryCtaLabel = 'Abrir tienda interactiva',
}: TiendaSectionProps) {
  const router = useRouter();
  const { products, loading, connected, lastEvent, hasLiveData } = useCatalogProducts();

  const visibleProducts = limit > 0 ? products.slice(0, limit) : products;

  const goToCheckout = (prod: {
    id: string;
    name: string;
    price: number;
    img?: string;
    category?: string;
  }) => {
    const params = new URLSearchParams({
      productId: String(prod.id),
      name: prod.name,
      price: String(prod.price),
      category: prod.category ?? 'General',
      img: prod.img ?? '',
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <section className="py-10">
      <div className="text-center mb-14">
        <p className="text-yellow-400/80 text-xs tracking-[0.4em] uppercase font-semibold mb-4">Catalogo de Soluciones</p>
        <h2 className="font-playfair text-4xl md:text-6xl font-bold text-white">
          {title.split(' ').slice(0, -2).join(' ')} <span className="shimmer-gold">{title.split(' ').slice(-2).join(' ')}</span>
        </h2>
        <p className="text-white/45 mt-4 max-w-2xl mx-auto text-sm leading-relaxed">{description}</p>

        <div className="inline-flex flex-wrap items-center justify-center gap-2 mt-6 rounded-full border border-yellow-400/15 bg-black/40 px-4 py-2 text-xs">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`} />
          <span className="text-zinc-300">
            {hasLiveData ? 'Catalogo actualizado automaticamente desde la base de datos' : 'Mostrando seleccion destacada mientras cargan los productos'}
          </span>
          {lastEvent?.product?.name ? (
            <span className="text-zinc-500">· Ultimo cambio: {lastEvent.product.name}</span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-4xl bg-white/5 h-72 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleProducts.map((prod) => (
            <article key={prod.id} className="card-3d glass-card rounded-4xl overflow-hidden group relative">
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
                {prod.discountPercentage ? (
                  <span className="absolute top-3 right-3 px-3 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    -{prod.discountPercentage}%
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
                    <p className="text-yellow-400 font-bold text-2xl font-playfair">{CLP(prod.price)}</p>
                    <p className="text-white/30 text-xs mt-0.5">{prod.category}</p>
                  </div>
                  <button
                    onClick={() => goToCheckout({
                      id: prod.id,
                      name: prod.name,
                      price: prod.price,
                      img: prod.img,
                      category: prod.category,
                    })}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-semibold tracking-wider hover:bg-yellow-400 hover:text-black transition-all duration-300"
                  >
                    Cotizar
                    <Sparkles className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
        <Link
          href={primaryCtaHref}
          className="inline-flex items-center gap-3 rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
        >
          {primaryCtaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={secondaryCtaHref}
          className="inline-flex items-center gap-3 rounded-full border border-yellow-400/30 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400 transition hover:bg-yellow-400/10"
        >
          {secondaryCtaLabel}
        </Link>
      </div>
    </section>
  );
}
