'use client';

import { useState, type MouseEvent } from 'react';
import { Check, ShoppingBag } from 'lucide-react';

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
  if (stockNumber === null) return { label: 'Stock por confirmar', pct: 42, tone: 'bg-zinc-300', text: 'text-zinc-300', disabled: false };
  if (stockNumber <= 0) return { label: 'Sin stock', pct: 6, tone: 'bg-red-400', text: 'text-red-300', disabled: true };
  if (stockNumber <= 3) return { label: `Crítico · ${stockNumber}`, pct: 18, tone: 'bg-red-400', text: 'text-red-300', disabled: false };
  if (stockNumber <= 10) return { label: `Bajo · ${stockNumber}`, pct: 48, tone: 'bg-yellow-300', text: 'text-yellow-200', disabled: false };
  return { label: `Disponible · ${stockNumber}`, pct: Math.min(100, 60 + stockNumber), tone: 'bg-emerald-300', text: 'text-emerald-200', disabled: false };
}

function safePrice(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function safeRating(value?: number) {
  return value !== undefined && Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : null;
}

export default function UiverseProductCard({
  name,
  price,
  category,
  img,
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
  const [imageFailed, setImageFailed] = useState(false);
  const validPrice = safePrice(price);
  const validDiscount = Number.isFinite(discountPct) ? Math.max(0, Math.min(100, discountPct)) : 0;
  const finalPrice = validDiscount > 0 ? Math.round(validPrice * (1 - validDiscount / 100)) : validPrice;
  const validRating = safeRating(rating);
  const productInitial = name.trim().charAt(0).toUpperCase() || 'F';
  const stockNumber = parseStock(stock, stockLabel);
  const stockInfo = stockMeta(stockNumber);
  const details = features.filter(Boolean).slice(0, 2);

  return (
    <article
      className={`store-motion group relative flex h-full flex-col overflow-hidden rounded-[1.55rem] transition duration-300 hover:-translate-y-1 ${
        isDark
          ? 'bg-[#f8f1df] text-black shadow-[0_24px_70px_rgba(0,0,0,.28)]'
          : 'bg-white/65 shadow-[0_22px_54px_rgba(20,20,20,.08)] backdrop-blur-xl'
      }`}
    >
      <div className={`relative m-2 overflow-hidden rounded-[1.3rem] ${isDark ? 'bg-[#17100a]' : 'bg-[#fff3dc]'}`}>
        <div className="aspect-[4/3]">
          {img && !imageFailed ? (
            <img
              src={img}
              alt={name}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,.24),transparent_55%),#17120c] text-4xl font-black text-yellow-200/60">{productInitial}</div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/8 to-transparent" />
        <button type="button" onClick={onSelect} aria-label={`Ver detalles de ${name}`} className="absolute inset-0 z-10 rounded-[1.3rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-300/70" />
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          {validDiscount > 0 && <span className="rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">-{discountPct}%</span>}
          <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">{category}</span>
        </div>
        <span className={`pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black backdrop-blur-md ${stockInfo.text}`}>{stockLabel || stockInfo.label}</span>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        <button type="button" onClick={onSelect} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300/60">
          <span className="block text-[9px] font-black uppercase tracking-[0.24em] text-amber-700">{category}</span>
          <span className="mt-1 block min-h-[2.55em] line-clamp-2 text-[15px] font-black leading-snug text-neutral-950">{name}</span>
        </button>

        {details.length > 0 && <div className="mt-3 grid gap-1.5">
          {details.map((item) => <span key={item} className="inline-flex min-w-0 items-center gap-1.5 text-[10px] text-neutral-600"><Check className="h-3.5 w-3.5 shrink-0 text-amber-600" /><span className="truncate">{item}</span></span>)}
        </div>}

        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-3 pt-3">
            <div>
              <span className="block text-2xl font-black tracking-tight text-neutral-950">${finalPrice.toLocaleString('es-CL')}</span>
              {validDiscount > 0 && <span className="text-xs text-neutral-400 line-through">${validPrice.toLocaleString('es-CL')}</span>}
            </div>
            {deliveryLabel ? <span className="max-w-[48%] truncate text-right text-[10px] font-bold text-neutral-500">{deliveryLabel}</span> : null}
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddToCart(e); }}
            disabled={stockInfo.disabled}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-yellow-300 px-3 text-[12px] font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBag className="h-4 w-4" /> {stockInfo.disabled ? 'Sin stock' : 'Agregar al bolso'}
          </button>
        </div>
      </div>
    </article>
  );
}
