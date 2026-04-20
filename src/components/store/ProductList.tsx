'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useRef, useEffect, useCallback } from 'react';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { formatCLP } from '@/hooks/useCart';
import type { Product } from '@/hooks/useRealtimeProducts';

interface ProductListProps {
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  cartIconRef: React.RefObject<HTMLElement | null>;
}

export default function ProductList({ onSelectProduct, onAddToCart, cartIconRef }: ProductListProps) {
  const { products, loading, connected } = useRealtimeProducts();
  const listRef = useRef<HTMLDivElement>(null);

  /* ── GSAP scroll-reveal con efecto alternado izq/der ── */
  useEffect(() => {
    if (loading || !listRef.current) return;
    let ctx: ReturnType<typeof import('gsap').default.context> | undefined;

    (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger }  = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('.product-card').forEach((card, i) => {
          const isEven = i % 2 === 0;

          /* Imagen: entra desde el lado exterior */
          const img = card.querySelector<HTMLElement>('.pc-image');
          if (img) {
            gsap.fromTo(img,
              { x: isEven ? -60 : 60, opacity: 0, scale: 0.94 },
              {
                x: 0, opacity: 1, scale: 1, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
              }
            );
          }

          /* Info: entra desde el lado interior con delay */
          const info = card.querySelector<HTMLElement>('.pc-info');
          if (info) {
            gsap.fromTo(info,
              { x: isEven ? 40 : -40, opacity: 0, filter: 'blur(6px)' },
              {
                x: 0, opacity: 1, filter: 'blur(0px)',
                duration: 1, ease: 'power3.out', delay: 0.15,
                scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
              }
            );
          }
        });
      }, listRef.current!);
    })();

    return () => ctx?.revert();
  }, [loading, products.length]);

  /* ── GSAP fly-to-cart animado ── */
  const flyToCart = useCallback((e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    onAddToCart(product);

    if (!cartIconRef.current || !product.image_url) return;
    const btn = (e.target as HTMLElement).closest('.product-card');
    const img = btn?.querySelector<HTMLImageElement>('img');
    if (!img) return;

    const srcRect  = img.getBoundingClientRect();
    const destRect = cartIconRef.current.getBoundingClientRect();

    const clone = img.cloneNode(true) as HTMLImageElement;
    Object.assign(clone.style, {
      position: 'fixed',
      zIndex: '9999',
      pointerEvents: 'none',
      top: `${srcRect.top}px`,
      left: `${srcRect.left}px`,
      width: `${srcRect.width}px`,
      height: `${srcRect.height}px`,
      borderRadius: '12px',
      objectFit: 'cover',
      willChange: 'transform, opacity',
    });
    document.body.appendChild(clone);

    import('gsap').then(({ default: gsap }) => {
      gsap.to(clone, {
        top: destRect.top + destRect.height / 2,
        left: destRect.left + destRect.width / 2,
        width: 0,
        height: 0,
        opacity: 0,
        borderRadius: '50%',
        duration: 0.65,
        ease: 'power3.in',
        onComplete: () => clone.remove(),
      });

      /* Rebote en el ícono del carrito */
      gsap.fromTo(cartIconRef.current!,
        { scale: 1 },
        {
          scale: 1.35, duration: 0.18, ease: 'power2.out',
          yoyo: true, repeat: 1,
          onComplete: () => { gsap.set(cartIconRef.current!, { scale: 1 }); },
        },
      );
    });
  }, [onAddToCart, cartIconRef]);

  if (loading) {
    return (
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={listRef} className="px-6 py-20">
      {/* Indicador de catálogo — sin textos técnicos */}
      {connected ? (
        <div className="max-w-5xl mx-auto mb-8 flex items-center gap-2 text-xs text-white/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Catálogo actualizado
        </div>
      ) : null}

      <div className="max-w-5xl mx-auto space-y-24">
        {products.map((product, i) => {
          const isEven      = i % 2 === 0;
          const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
          const finalPrice  = hasDiscount
            ? product.price * (1 - (product.discount_percentage! / 100))
            : product.price;

          return (
            <div
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className={`product-card group cursor-pointer flex flex-col ${
                isEven ? 'md:flex-row' : 'md:flex-row-reverse'
              } gap-8 items-center`}
            >
              {/* Imagen */}
              <div className="pc-image w-full md:w-1/2 relative overflow-hidden rounded-2xl aspect-[4/5]">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20 text-sm">
                    Sin imagen
                  </div>
                )}
                {hasDiscount && (
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-bold">
                    -{product.discount_percentage}%
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="pc-info w-full md:w-1/2 space-y-4">
                <h3 className="font-playfair text-2xl md:text-3xl text-white group-hover:text-yellow-400 transition-colors">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-white/40 text-sm leading-relaxed line-clamp-3">{product.description}</p>
                )}
                <div className="flex items-baseline gap-3">
                  <span className="text-yellow-400 text-xl font-medium">{formatCLP(finalPrice)}</span>
                  {hasDiscount && (
                    <span className="text-white/30 text-sm line-through">{formatCLP(product.price)}</span>
                  )}
                </div>
                {product.rating !== undefined && product.rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-400/60 text-xs">
                    {'★'.repeat(Math.round(product.rating))}
                    <span className="text-white/30 ml-1">{product.rating.toFixed(1)}</span>
                  </div>
                )}
                <button
                  onClick={(e) => flyToCart(e, product)}
                  className="mt-2 px-6 py-2.5 rounded-full border border-yellow-400/30 text-yellow-400 text-xs tracking-widest uppercase
                    hover:bg-yellow-400 hover:text-black transition-all duration-300"
                >
                  Adquirir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
