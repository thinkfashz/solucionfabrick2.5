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

  useEffect(() => {
    if (loading || !listRef.current || typeof IntersectionObserver === 'undefined') return;

    const cards = Array.from(listRef.current.querySelectorAll<HTMLElement>('.product-card'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target as HTMLElement;
        if (card.dataset.animated === 'true') return;
        card.dataset.animated = 'true';

        const index = Number(card.dataset.index || 0);
        const isEven = index % 2 === 0;
        const img = card.querySelector<HTMLElement>('.pc-image');
        const info = card.querySelector<HTMLElement>('.pc-info');

        img?.animate(
          [
            { transform: `translateX(${isEven ? -60 : 60}px) scale(.94)`, opacity: 0 },
            { transform: 'translateX(0) scale(1)', opacity: 1 },
          ],
          { duration: 850, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
        );

        info?.animate(
          [
            { transform: `translateX(${isEven ? 40 : -40}px)`, opacity: 0, filter: 'blur(6px)' },
            { transform: 'translateX(0)', opacity: 1, filter: 'blur(0)' },
          ],
          { duration: 850, delay: 120, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' },
        );

        observer.unobserve(card);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [loading, products.length]);

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

    const deltaX = destRect.left + destRect.width / 2 - srcRect.left;
    const deltaY = destRect.top + destRect.height / 2 - srcRect.top;

    const animation = clone.animate(
      [
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1, borderRadius: '12px' },
        { transform: `translate3d(${deltaX}px,${deltaY}px,0) scale(0.05)`, opacity: 0, borderRadius: '50%' },
      ],
      { duration: 650, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
    );
    animation.onfinish = () => clone.remove();

    cartIconRef.current.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.35)' },
        { transform: 'scale(1)' },
      ],
      { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' },
    );
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
              data-index={i}
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
