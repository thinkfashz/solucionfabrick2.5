'use client';

/* eslint-disable @next/next/no-img-element */

interface UiverseProductCardProps {
  name: string;
  price: number;
  category: string;
  img?: string;
  discountPct?: number;
  rating?: number;
  stockLabel?: string;
  deliveryLabel?: string;
  onSelect: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
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
  onSelect,
  onAddToCart,
}: UiverseProductCardProps) {
  const finalPrice = discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : price;

  return (
    <div
      onClick={onSelect}
      className="relative border border-white/20 rounded-2xl overflow-hidden cursor-pointer group w-full"
      style={{ aspectRatio: '2/3' }}
    >
      {/* ── Layer 1: colored border background ─────────────────────── */}
      <div className="absolute inset-0 p-[3px] bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-800 rounded-2xl transition-all duration-700 group-hover:from-yellow-400 group-hover:via-amber-300 group-hover:to-yellow-600">
        <div className="w-full h-full bg-zinc-950 rounded-[calc(1rem-3px)] rounded-tr-[90px] rounded-br-[36px]" />
      </div>

      {/* ── Layer 2: backdrop + image + spinning circle ─────────────── */}
      <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-2xl overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover opacity-50 transition-all duration-700 group-hover:opacity-70 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950" />
        )}
        {/* Dark gradient overlay — stronger at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/85" />
        {/* Spinning decoration circle (gold, Uiverse-style) */}
        <div
          className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-amber-600/60 to-yellow-300/30 pointer-events-none relative z-10 flex-shrink-0"
          style={{ animation: 'spin 12s linear infinite' }}
        />
        {/* Inner glow on circle */}
        <div
          className="absolute w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-amber-400/0 to-yellow-200/20 pointer-events-none z-10"
          style={{ animation: 'spin 8s linear infinite reverse' }}
        />
      </div>

      {/* ── Layer 3: content overlay ────────────────────────────────── */}
      <div className="absolute inset-0 p-2 flex justify-between">
        {/* Left text panel */}
        <div className="w-[58%] p-2.5 flex flex-col rounded-xl backdrop-blur-md bg-black/40 border border-white/10 shadow-inner">
          <span className="text-[9px] uppercase tracking-[0.25em] text-yellow-400/80 font-bold line-clamp-1">
            {category}
          </span>
          <h3 className="mt-1 text-xs font-bold text-white line-clamp-3 leading-snug flex-1">
            {name}
          </h3>
          <div className="mt-auto">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-sm font-black text-yellow-400">
                ${finalPrice.toLocaleString('es-CL')}
              </span>
              {discountPct > 0 && (
                <span className="text-[9px] text-white/30 line-through">
                  ${price.toLocaleString('es-CL')}
                </span>
              )}
            </div>
            {discountPct > 0 && (
              <span className="inline-block mt-0.5 text-[9px] font-bold text-red-400 bg-red-500/15 rounded px-1">
                -{discountPct}%
              </span>
            )}
            {deliveryLabel && (
              <p className="mt-1 text-[8px] text-yellow-400/50 uppercase tracking-wider line-clamp-1">
                {deliveryLabel}
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col items-end justify-between pt-1 pb-1">
          <div className="flex flex-col items-end gap-0.5">
            {stockLabel && (
              <span className="text-[8px] text-right text-white/40 leading-tight max-w-[52px] line-clamp-2">
                {stockLabel}
              </span>
            )}
            {rating && (
              <span className="text-[8px] text-yellow-400/50">★ {rating.toFixed(1)}</span>
            )}
          </div>

          {/* ">" add-to-cart button — Uiverse style */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAddToCart(e); }}
            aria-label="Añadir al carrito"
            className="w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md bg-white/10 border border-white/20 transition-all duration-300 hover:bg-yellow-400/30 hover:border-yellow-400/60 hover:shadow-[0_0_12px_rgba(250,204,21,0.4)] active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 12 12"
              className="w-4 h-4"
              fill="none"
            >
              <path
                d="M4.646 2.146a.5.5 0 0 0 0 .708L7.793 6L4.646 9.146a.5.5 0 1 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 0 0-.708 0z"
                fill="rgba(250,204,21,0.85)"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
