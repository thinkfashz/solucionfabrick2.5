'use client';

/* eslint-disable @next/next/no-img-element */

import type { MouseEvent } from 'react';
import { Eye, ShoppingBag, Sparkles } from 'lucide-react';

interface UiverseProductCardProps {
  name: string;
  price: number;
  category: string;
  img?: string;
  discountPct?: number;
  rating?: number;
  stockLabel?: string;
  deliveryLabel?: string;
  isDark?: boolean;
  onSelect: () => void;
  onAddToCart: (e: MouseEvent) => void;
  onBuyNow?: (e: MouseEvent) => void;
}

function StarRow({ rating, isDark }: { rating: number; isDark: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} viewBox="0 0 12 12" className={`h-2.5 w-2.5 ${i < Math.round(rating) ? 'fill-yellow-400' : isDark ? 'fill-zinc-700' : 'fill-neutral-200'}`}>
          <path d="M6 .5l1.546 3.13 3.454.502-2.5 2.436.59 3.432L6 8.5 2.91 10l.59-3.432L1 4.132l3.454-.502L6 .5z" />
        </svg>
      ))}
      <span className={`ml-1 text-[10px] tabular-nums ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`}>{rating.toFixed(1)}</span>
    </div>
  );
}

export default function UiverseProductCard({
  name,
  price,
  category,
  img,
  discountPct = 0,
  rating,
  stockLabel,
  deliveryLabel,
  isDark = false,
  onSelect,
  onAddToCart,
  onBuyNow,
}: UiverseProductCardProps) {
  const finalPrice = discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : price;

  return (
    <article
      onClick={onSelect}
      className={`group relative w-full cursor-pointer overflow-hidden rounded-[1.65rem] border transition-all duration-300 hover:-translate-y-1 ${
        isDark
          ? 'border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))] shadow-[0_20px_60px_rgba(0,0,0,.45)] hover:border-yellow-300/35 hover:shadow-[0_28px_80px_rgba(0,0,0,.65),0_0_0_1px_rgba(255,210,41,.12)_inset]'
          : 'border-neutral-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,.08)] hover:border-neutral-300 hover:shadow-[0_28px_70px_rgba(15,23,42,.14)]'
      }`}
    >
      <div className={`relative aspect-[4/5] overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-neutral-100'}`}>
        {img ? (
          <img src={img} alt={name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" loading="lazy" />
        ) : (
          <div className={`absolute inset-0 ${isDark ? 'bg-zinc-900' : 'bg-neutral-200'}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent opacity-80" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {discountPct > 0 && <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">-{discountPct}%</span>}
          <span className="rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md"><Sparkles className="mr-1 inline h-3 w-3 text-yellow-300" />Premium</span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          aria-label="Ver detalle"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:scale-110 hover:bg-white hover:text-black"
        >
          <Eye className="h-4 w-4" />
        </button>
        <div className="absolute bottom-3 left-3 right-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddToCart(e); }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-yellow-400 px-3 text-[11px] font-black text-black shadow-lg transition hover:bg-yellow-300"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Carrito
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); (onBuyNow || onSelect)(e); }}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/15 bg-white/12 px-3 text-[11px] font-black text-white backdrop-blur-md transition hover:bg-white hover:text-black"
          >
            Comprar
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-2 flex min-h-[18px] items-center justify-between gap-2">
          {rating !== undefined ? <StarRow rating={rating} isDark={isDark} /> : <span />}
          {stockLabel && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${isDark ? 'border-zinc-700 bg-zinc-800/80 text-zinc-400' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>{stockLabel}</span>}
        </div>
        <p className={`mb-1 text-[9px] font-black uppercase tracking-[0.24em] ${isDark ? 'text-yellow-400/85' : 'text-yellow-700'}`}>{category}</p>
        <h3 className={`min-h-[2.6em] text-[14px] font-black leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-neutral-950'}`}>{name}</h3>
        {deliveryLabel && <p className={`mt-1.5 text-[10px] ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{deliveryLabel}</p>}
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <span className={`block text-lg font-black tracking-tight ${isDark ? 'text-yellow-300' : 'text-neutral-950'}`}>${finalPrice.toLocaleString('es-CL')}</span>
            {discountPct > 0 && <span className={`text-xs line-through ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>${price.toLocaleString('es-CL')}</span>}
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isDark ? 'bg-white/8 text-zinc-300' : 'bg-neutral-100 text-neutral-600'}`}>Ver ficha</span>
        </div>
      </div>
    </article>
  );
}
