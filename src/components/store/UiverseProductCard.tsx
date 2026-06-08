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
  isDark?: boolean;
  onSelect: () => void;
  onAddToCart: (e: React.MouseEvent) => void;
}

function StarRow({ rating, isDark }: { rating: number; isDark: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 12 12"
          className={`w-2.5 h-2.5 ${
            i < Math.round(rating)
              ? 'fill-yellow-400'
              : isDark
              ? 'fill-zinc-700'
              : 'fill-neutral-200'
          }`}
        >
          <path d="M6 .5l1.546 3.13 3.454.502-2.5 2.436.59 3.432L6 8.5 2.91 10l.59-3.432L1 4.132l3.454-.502L6 .5z" />
        </svg>
      ))}
      <span className={`text-[10px] ml-1 tabular-nums ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`}>
        {rating.toFixed(1)}
      </span>
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
}: UiverseProductCardProps) {
  const finalPrice = discountPct > 0 ? Math.round(price * (1 - discountPct / 100)) : price;

  return (
    <div
      onClick={onSelect}
      className={`group cursor-pointer w-full rounded-2xl overflow-hidden transition-all duration-300 ${
        isDark
          ? 'bg-zinc-900/60 border border-white/8 hover:border-yellow-400/30 hover:shadow-[0_18px_54px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,210,41,0.08)]'
          : 'bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]'
      }`}
    >
      {/* Image area */}
      <div
        className={`relative overflow-hidden aspect-[4/5] ${
          isDark ? 'bg-zinc-800' : 'bg-neutral-100'
        }`}
      >
        {img ? (
          <img
            src={img}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className={`absolute inset-0 ${isDark ? 'bg-zinc-900' : 'bg-neutral-200'}`} />
        )}

        {/* Bottom gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Discount badge */}
        {discountPct > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider shadow-lg z-10">
            -{discountPct}%
          </span>
        )}

        {/* Quick-add: always-visible small "+" button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(e);
          }}
          aria-label="Añadir al carrito"
          className={`absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold leading-none shadow-lg transition-all duration-200 translate-y-1 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 ${
            isDark
              ? 'bg-yellow-400 text-black hover:bg-yellow-300 hover:scale-110'
              : 'bg-black text-white hover:bg-neutral-700 hover:scale-110'
          }`}
        >
          +
        </button>

        {/* Slide-up "Añadir al carrito" full bar */}
        <div className="nike-card-quickadd absolute bottom-0 left-0 right-0 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(e);
            }}
            aria-label="Añadir al carrito"
            className={`w-full py-3 text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-200 ${
              isDark
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-black text-white hover:bg-neutral-800'
            }`}
          >
            Añadir al carrito
          </button>
        </div>
      </div>

      {/* Product info */}
      <div className="p-3.5">
        {/* Rating row — fixed height to avoid layout shift between cards */}
        <div className="min-h-[16px] mb-1.5">
          {rating !== undefined && <StarRow rating={rating} isDark={isDark} />}
        </div>

        <p
          className={`text-[9px] uppercase tracking-[0.22em] font-bold mb-1 ${
            isDark ? 'text-yellow-400/80' : 'text-yellow-600'
          }`}
        >
          {category}
        </p>

        <p
          className={`text-[13px] font-semibold line-clamp-2 leading-snug min-h-[2.5em] ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}
        >
          {name}
        </p>

        {deliveryLabel && (
          <p className={`text-[10px] mt-1.5 min-h-[1.2em] ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>
            {deliveryLabel}
          </p>
        )}

        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[15px] font-black ${isDark ? 'text-yellow-400' : 'text-neutral-900'}`}>
              ${finalPrice.toLocaleString('es-CL')}
            </span>
            {discountPct > 0 && (
              <span className={`text-[11px] line-through ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>
                ${price.toLocaleString('es-CL')}
              </span>
            )}
          </div>
          {stockLabel && (
            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${
              isDark
                ? 'border-zinc-700 bg-zinc-800/80 text-zinc-400'
                : 'border-neutral-200 bg-neutral-50 text-neutral-500'
            }`}>
              {stockLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
