'use client';

/* eslint-disable @next/next/no-img-element */

import type { MouseEvent } from 'react';
import { CreditCard, Eye, PackageCheck, ShoppingBag, Sparkles, Truck } from 'lucide-react';

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
  onBuyNow?: (e: MouseEvent) => void;
}

function StarRow({ rating, isDark }: { rating: number; isDark: boolean }) {
  return <div className="flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => <svg key={i} viewBox="0 0 12 12" className={`h-2.5 w-2.5 ${i < Math.round(rating) ? 'fill-yellow-400' : isDark ? 'fill-zinc-700' : 'fill-neutral-200'}`}><path d="M6 .5l1.546 3.13 3.454.502-2.5 2.436.59 3.432L6 8.5 2.91 10l.59-3.432L1 4.132l3.454-.502L6 .5z" /></svg>)}
    <span className={`ml-1 text-[10px] tabular-nums ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`}>{rating.toFixed(1)}</span>
  </div>;
}

function parseStock(stock?: number | string, stockLabel?: string) {
  if (typeof stock === 'number' && Number.isFinite(stock)) return stock;
  const raw = typeof stock === 'string' ? stock : stockLabel || '';
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function stockMeta(stockNumber: number | null) {
  if (stockNumber === null) return { label: 'Consultar stock', pct: 34, tone: 'bg-zinc-400', text: 'text-zinc-400' };
  if (stockNumber <= 0) return { label: 'Sin stock', pct: 5, tone: 'bg-red-400', text: 'text-red-300' };
  if (stockNumber <= 3) return { label: `Últimas ${stockNumber}`, pct: 18, tone: 'bg-red-400', text: 'text-red-300' };
  if (stockNumber <= 10) return { label: `Stock bajo · ${stockNumber}`, pct: 45, tone: 'bg-amber-300', text: 'text-amber-300' };
  return { label: `Disponible · ${stockNumber}`, pct: Math.min(100, 58 + stockNumber), tone: 'bg-emerald-300', text: 'text-emerald-300' };
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
  onBuyNow,
}: UiverseProductCardProps) {
  const finalPrice = discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : price;
  const stockNumber = parseStock(stock, stockLabel);
  const stockInfo = stockMeta(stockNumber);
  const details = features.filter(Boolean).slice(0, 1);

  return <article onClick={onSelect} className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[2rem] border p-2 transition duration-300 active:scale-[.99] md:hover:-translate-y-1 ${isDark ? 'border-white/10 bg-white/[0.045] shadow-[0_18px_55px_rgba(0,0,0,.36)] hover:border-yellow-300/30' : 'border-neutral-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,.08)]'}`}>
    <div className={`relative aspect-[1/1.03] overflow-hidden rounded-[1.55rem] ${isDark ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,.16),transparent_15rem),#141414]' : 'bg-neutral-100'}`}>
      {img ? <img src={img} alt={name} className="h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-[1.04]" loading="lazy" /> : <div className="absolute inset-0 bg-zinc-900" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-black/10" />
      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
        {discountPct > 0 && <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black text-white">-{discountPct}%</span>}
        <span className="rounded-full border border-white/15 bg-black/48 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md"><Sparkles className="mr-1 inline h-3 w-3 text-yellow-300" />{category}</span>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(); }} aria-label="Ver detalle" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/92 text-black shadow-lg transition active:scale-95 md:hover:scale-105"><Eye className="h-4 w-4" /></button>
      <div className="absolute bottom-3 left-3 right-3">
        <div className="rounded-[1.2rem] border border-white/10 bg-black/55 p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Stock</span><span className={`text-[10px] font-black ${stockInfo.text}`}>{stockLabel || stockInfo.label}</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12"><div className={`h-full rounded-full ${stockInfo.tone} transition-all duration-700`} style={{ width: `${stockInfo.pct}%` }} /></div>
        </div>
      </div>
    </div>

    <div className="flex flex-1 flex-col px-2 pb-3 pt-3">
      <div className="mb-2 flex min-h-[18px] items-center justify-between gap-2">
        {rating !== undefined ? <StarRow rating={rating} isDark={isDark} /> : <span className="text-[10px] text-zinc-500">Producto verificado</span>}
        {deliveryLabel && <span className={`inline-flex max-w-[48%] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[9px] font-bold ${isDark ? 'border-zinc-700 bg-zinc-800/80 text-zinc-400' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}><Truck className="h-3 w-3" />{deliveryLabel}</span>}
      </div>
      <h3 className={`min-h-[2.45em] text-[15px] font-black leading-snug line-clamp-2 ${isDark ? 'text-white' : 'text-neutral-950'}`}>{name}</h3>
      {description && <p className={`mt-1.5 min-h-[2.35em] text-[11px] leading-5 line-clamp-2 ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{description}</p>}
      {details.length > 0 && <span className={`mt-2 inline-flex items-center gap-1.5 text-[10px] ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}><PackageCheck className="h-3.5 w-3.5 text-emerald-300" />{details[0]}</span>}
      <div className="mt-auto pt-3">
        <div className="flex items-end justify-between gap-3">
          <div><span className={`block text-2xl font-black tracking-tight ${isDark ? 'text-yellow-300' : 'text-neutral-950'}`}>${finalPrice.toLocaleString('es-CL')}</span>{discountPct > 0 && <span className={`text-xs line-through ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>${price.toLocaleString('es-CL')}</span>}</div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onAddToCart(e); }} aria-label="Agregar al bolso" className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-black shadow-lg transition active:scale-95 md:hover:scale-105"><ShoppingBag className="h-5 w-5" /></button>
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); if (onBuyNow) onBuyNow(e); else onSelect(); }} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.15rem] bg-emerald-300 px-3 text-[12px] font-black text-black shadow-[0_16px_40px_rgba(110,231,183,.14)] transition active:scale-[.99] hover:bg-emerald-200"><CreditCard className="h-4 w-4" /> Obtener ahora</button>
      </div>
    </div>
  </article>;
}
