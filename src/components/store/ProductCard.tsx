'use client';

/* eslint-disable @next/next/no-img-element */

import type { Product } from '@/hooks/useRealtimeProducts';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';
import SilverGoldButton from './SilverGoldButton';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const finalPrice = product.discount_percentage
    ? product.price * (1 - product.discount_percentage / 100)
    : product.price;

  const stock = product.stock ?? 0;
  const isOutOfStock = stock <= 0;
  const deliveryDays = product.delivery_days ? Number(product.delivery_days) : null;

  return (
    <div className="group card-3d glass-card border border-zinc-800/40 hover:border-yellow-500/20 transition-all duration-500 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-square bg-zinc-900 overflow-hidden">
        {product.image_url ? (
          <img
            src={cloudinaryUrl(product.image_url, { width: 480, quality: 70 })}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.discount_percentage ? (
            <span className="bg-red-500/90 text-white text-[10px] uppercase tracking-widest px-3 py-1 font-bold">
              -{product.discount_percentage}%
            </span>
          ) : null}
          {product.featured ? (
            <span className="bg-yellow-500/90 text-black text-[10px] uppercase tracking-widest px-3 py-1 font-bold">
              Destacado
            </span>
          ) : null}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-zinc-300 text-sm uppercase tracking-[0.3em] font-sans">Agotado</span>
          </div>
        )}

        {/* Quick-add overlay */}
        {!isOutOfStock && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 p-4 bg-gradient-to-t from-black/90 to-transparent">
            <SilverGoldButton
              className="w-full !px-4 !py-2 text-xs"
              onClick={() => onAddToCart(product)}
            >
              Agregar al carrito
            </SilverGoldButton>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-serif text-yellow-50 text-base mb-1 line-clamp-2 leading-tight">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2 mb-3">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between">
          <div>
            <span className="text-yellow-400 font-serif text-lg">{formatPrice(finalPrice)}</span>
            {product.discount_percentage ? (
              <span className="text-zinc-600 text-xs line-through ml-2">{formatPrice(product.price)}</span>
            ) : null}
          </div>

          {product.rating ? (
            <div className="flex items-center gap-1 text-yellow-500/60">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs text-zinc-500">{product.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        {deliveryDays ? (
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest mt-2">
            Entrega en {deliveryDays} {deliveryDays === 1 ? 'día' : 'días'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
