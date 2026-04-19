'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef } from 'react';
import { X, Star, Check, Truck } from 'lucide-react';
import type { Product } from '@/hooks/useRealtimeProducts';
import { formatCLP } from '@/hooks/useCart';
import SilverGoldButton from './SilverGoldButton';

interface ProductDetailProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductDetail({ product, onClose, onAddToCart }: ProductDetailProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // GSAP enter
  useEffect(() => {
    let ctx: ReturnType<typeof import('gsap').default.context> | undefined;
    (async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      if (!overlayRef.current) return;
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('.detail-reveal').forEach((el, i) => {
          gsap.fromTo(el,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.6, delay: 0.2 + i * 0.1, ease: 'power2.out' }
          );
        });
      }, overlayRef.current);
    })();
    return () => ctx?.revert();
  }, []);

  const hasDiscount = product.discount_percentage && product.discount_percentage > 0;
  const finalPrice = hasDiscount
    ? product.price * (1 - (product.discount_percentage! / 100))
    : product.price;

  const specs = product.specifications || {};
  const specEntries = Object.entries(specs);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[150] bg-black overflow-y-auto"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="fixed top-5 right-5 z-[160] p-3 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>

      {/* Hero image */}
      <div className="relative w-full h-[70vh] overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20">Sin imagen</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 -mt-20 relative z-10 pb-20">
        <h2 className="detail-reveal font-playfair text-3xl md:text-4xl text-white mb-3">{product.name}</h2>

        {/* Price */}
        <div className="detail-reveal flex items-baseline gap-3 mb-6">
          <span className="text-yellow-400 text-2xl font-medium">{formatCLP(finalPrice)}</span>
          {hasDiscount && (
            <>
              <span className="text-white/30 text-sm line-through">{formatCLP(product.price)}</span>
              <span className="px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-bold">-{product.discount_percentage}%</span>
            </>
          )}
        </div>

        {/* Rating */}
        {product.rating !== undefined && product.rating > 0 && (
          <div className="detail-reveal flex items-center gap-2 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} className={i < Math.round(product.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'} />
            ))}
            <span className="text-white/30 text-xs">{product.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <p className="detail-reveal text-white/50 text-sm leading-relaxed mb-8">{product.description}</p>
        )}

        {/* Features grid */}
        <div className="detail-reveal grid grid-cols-2 gap-4 mb-8">
          {product.stock !== undefined && product.stock > 0 && (
            <div className="flex items-center gap-2 text-green-400/60 text-xs">
              <Check size={14} />
              <span>En stock ({product.stock} disponibles)</span>
            </div>
          )}
          {product.delivery_days !== undefined && (
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Truck size={14} />
              <span>Entrega en {product.delivery_days} días</span>
            </div>
          )}
          {product.featured && (
            <div className="flex items-center gap-2 text-yellow-400/60 text-xs">
              <Star size={14} />
              <span>Producto destacado</span>
            </div>
          )}
        </div>

        {/* Specifications */}
        {specEntries.length > 0 && (
          <div className="detail-reveal mb-10">
            <h4 className="text-white/60 text-xs tracking-[0.3em] uppercase mb-4">Especificaciones</h4>
            <div className="space-y-3">
              {specEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40 text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-white/70 text-sm">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="detail-reveal">
          <SilverGoldButton onClick={() => { onAddToCart(product); onClose(); }} className="w-full py-4 text-base">
            Añadir al Carrito
          </SilverGoldButton>
        </div>
      </div>
    </div>
  );
}
