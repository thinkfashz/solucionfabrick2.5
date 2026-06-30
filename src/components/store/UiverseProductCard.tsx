'use client';

/* eslint-disable @next/next/no-img-element */

import type { MouseEvent } from 'react';
import { PackageCheck, ShoppingBag, Sparkles, Star, Truck } from 'lucide-react';

interface UiverseProductCardProps {
  name: string;
  price: number;
  category: string;
  img?: string;
  description?: string;
  features?: string[];
  discountPct?: number;
  rating?: number;
  stock?: number | string;
  stockLabel?: string;
  deliveryLabel?: string;
  isDark?: boolean;
  onSelect: () => void;
  onAddToCart: (e: MouseEvent) => void;
}

function parseStock(stock?: number | string, stockLabel?: string) {
  if (typeof stock === 'number' && Number.isFinite(stock)) return stock;
  const raw = typeof stock === 'string' ? stock : stockLabel || '';
  const match = raw.match(/[0-9]+/);
  return match ? Number(match[0]) : null;
}

function stockMeta(stockNumber: number | null) {
  if (stockNumber === null) return { label: 'Stock por confirmar', pct: 42, tone: 'bg-zinc-300', text: 'text-zinc-400', disabled: false };
  if (stockNumber <= 0) return { label: 'Sin stock', pct: 6, tone: 'bg-red-400', text: 'text-red-300', disabled: true };
  if (stockNumber <= 3) return { label: `Crítico · ${stockNumber}`, pct: 18, tone: 'bg-red-400', text: 'text-red-300', disabled: false };
  if (stockNumber <= 10) return { label: `Bajo · ${stockNumber}`, pct: 48, tone: 'bg-amber-300', text: 'text-amber-300', disabled: false };
  return { label: `Disponible · ${stockNumber}`, pct: Math.min(100, 60 + stockNumber), tone: 'bg-emerald-300', text: 'text-emerald-300', disabled: false };
}

export default function UiverseProductCard({
  name,
  price,
  category,
  img,
  description,
  features = [],
  discountPct = 0,
  rating,
  stock,
  stockLabel,
  deliveryLabel,
  isDark = false,
  onSelect,
  onAddToCart,
}: UiverseProductCardProps) {
  const finalPrice = discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : price;
  const stockNumber = parseStock(stock, stockLabel);
  const stockInfo = stockMeta(stockNumber);
  const details = features.filter(Boolean).slice(0, 2);

  return (
    <article
      onClick={onSelect}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[2rem] border transition duration-300 hover:-translate-y-1 ${
        isDark
          ? 'border-white/10 bg-[#0d0d0b] shadow-[0_22px_60px_rgba(0,0,0,.42)] hover:border-yellow-300/30'
          : 'border-black/5 bg-white shadow-[0_22px_54px_rgba(20,20,20,.08)] hover:border-black/10'
      }`}
    >
      <div className={`relative m-2 overflow-hidden rounded-[1.55rem] ${isDark ? 'bg-[#171713]' : 'bg-[#f2efe7]'}`}>
        <div className="aspect-[1.08/1]">
          {img ? (
            <img src={img} alt={name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" loading="lazy" />
          ) : (
            <div className="grid h-full w-full place-items-center text-4xl font-black text-black/10">{name[0]}</div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/5 to-transparent" />
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          {discountPct > 0 && <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">-{discountPct}%</span>}
          <span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md"><Sparkles className="mr-1 inline h-3 w-3 text-yellow-300" />{category}</span>
        </div>
        <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/58 p-3 text-white backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Stock</span>
            <span className={`text-[10px] font-black ${stockInfo.text}`}>{stockLabel || stockInfo.label}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12">
            <div className={`h-full rounded-full ${stockInfo.tone} transition-all duration-700`} style={{ width: `${stockInfo.pct}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <div className="mb-2 flex min-h-[20px] items-center justify-between gap-2">
          {rating !== undefined ? <span className={`inline-flex items-center gap-1 text-[10px] font-black ${isDark ? 'text-yellow-300' : 'text-neutral-600'}`}><Star className="h-3 w-3 fill-current" />{rating.toFixed(1)}</span> : <span className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`}>Producto verificado</span>}
          {deliveryLabel && <span className={`inline-flex max-w-[52%] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[9px] font-bold ${isDark ? 'border-white/10 bg-white/5 text-zinc-400' : 'border-black/5 bg-neutral-50 text-neutral-500'}`}><Truck className="h-3 w-3 shrink-0" />{deliveryLabel}</span>}
        </div>

        <p className={`text-[9px] font-black uppercase tracking-[0.24em] ${isDark ? 'text-yellow-300/80' : 'text-yellow-700'}`}>{category}</p>
        <h3 className={`mt-1 min-h-[2.6em] text-[15px] font-black leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-neutral-950'}`}>{name}</h3>
        {description && <p className={`mt-2 min-h-[2.6em] text-[11px] leading-5 line-clamp-2 ${isDark ? 'text-zinc-400' : 'text-neutral-500'}`}>{description}</p>}

        {details.length > 0 && <div className="mt-3 grid gap-1.5">
          {details.map((item) => <span key={item} className={`inline-flex items-center gap-1.5 text-[10px] ${isDark ? 'text-zinc-400' : 'text-neutral-500'}`}><PackageCheck className="h-3.5 w-3.5 text-emerald-400" />{item}</span>)}
        </div>}

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className={`block text-2xl font-black tracking-tight ${isDark ? 'text-yellow-300' : 'text-neutral-950'}`}>${finalPrice.toLocaleString('es-CL')}</span>
              {discountPct > 0 && <span className={`text-xs line-through ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>${price.toLocaleString('es-CL')}</span>}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isDark ? 'bg-white/8 text-zinc-400' : 'bg-neutral-100 text-neutral-500'}`}>Ficha</span>
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddToCart(e); }}
            disabled={stockInfo.disabled}
            className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-3 text-[12px] font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${
              isDark
                ? 'bg-yellow-300 text-black shadow-[0_18px_48px_rgba(250,204,21,.16)] hover:bg-yellow-200'
                : 'bg-black text-white shadow-[0_18px_42px_rgba(0,0,0,.16)] hover:bg-neutral-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> {stockInfo.disabled ? 'Sin stock' : 'Agregar al bolso'}
          </button>
        </div>
      </div>
    </article>
  );
}
