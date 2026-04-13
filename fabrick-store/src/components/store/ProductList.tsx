'use client';

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

  // GSAP scroll-reveal
  useEffect(() => {
    if (loading || !listRef.current) return;
    let ctx: ReturnType<typeof import('gsap').default.context> | undefined;

    (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('.product-card').forEach((card, i) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 60, scale: 0.95 },
            {
              opacity: 1, y: 0, scale: 1,
              duration: 0.8,
              ease: 'power3.out',
              delay: i * 0.08,
              scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
            }
          );
        });
      }, listRef.current!);
    })();

    return () => ctx?.revert();
  }, [loading, products.length]);

  const flyToCart = useCallback((e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    onAddToCart(product);

    if (!cartIconRef.current || !product.image_url) return;
    const btn = (e.target as HTMLElement).closest('.product-card');
    const img = btn?.querySelector('img');
    if (!img) return;

    const srcRect = img.getBoundingClientRect();
    const destRect = cartIconRef.current.getBoundingClientRect();

    const clone = img.cloneNode(true) as HTMLImageElement;
    clone.style.cssText = `
      position:fixed; z-index:9999; pointer-events:none;
      top:${srcRect.top}px; left:${srcRect.left}px;
      width:${srcRect.width}px; height:${srcRect.height}px;
      border-radius:8px; object-fit:cover;
      transition: all 0.6s cubic-bezier(0.22,1,0.36,1);
    `;
    document.body.appendChild(clone);

    requestAnimationFrame(() => {
      clone.style.top = `${destRect.top}px`;
      clone.style.left = `${destRect.left}px`;
      clone.style.width = '24px';
      clone.style.height = '24px';
      clone.style.opacity = '0.3';
      clone.style.borderRadius = '50%';
    });

    setTimeout(() => clone.remove(), 700);
  }, [onAddToCart, cartIconRef]);

  if (loading) {
    return (
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 rounded-2xl bg-white/5 shimmer-gold" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={listRef} className="px-6 py-20">
      {/* Connection indicator */}
      <div className="max-w-5xl mx-auto mb-8 flex items-center gap-2 text-xs text-white/30">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
        {connected ? 'Tiempo real activo' : 'Reconectando...'}
      </div>

      <div className="max-w-5xl mx-auto space-y-24">
        {products.map((product, i) => {
          const isEven = i % 2 === 0;
          const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
          const finalPrice = hasDiscount
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
              {/* Image */}
              <div className="w-full md:w-1/2 relative overflow-hidden rounded-2xl aspect-[4/5]">
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
              <div className="w-full md:w-1/2 space-y-4">
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
