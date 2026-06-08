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
    <div onClick={onSelect} className="group cursor-pointer w-full nike-card">
      {/* Image container */}
      <div
        className={`relative overflow-hidden rounded-xl aspect-[3/4] ${
          isDark ? 'bg-zinc-800' : 'bg-neutral-100'
        }`}
      >
        {img ? (
          <img
            src={img}
            alt={name}
            className="w-full h-full object-cover nike-card-img transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={`absolute inset-0 ${isDark ? 'bg-zinc-900' : 'bg-neutral-200'}`} />
        )}

        {/* Discount badge */}
        {discountPct > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-lg">
            -{discountPct}%
          </span>
        )}

        {/* Stock badge */}
        {stockLabel && (
          <span
            className={`absolute top-3 right-3 text-[8px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${
              isDark
                ? 'bg-zinc-900/80 text-zinc-300 border border-white/10'
                : 'bg-white/90 text-neutral-600 border border-neutral-200'
            }`}
          >
            {stockLabel}
          </span>
        )}

        {/* Quick-add overlay — slides up on hover via .nike-card-quickadd */}
        <div className="nike-card-quickadd absolute bottom-3 left-3 right-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(e);
            }}
            aria-label="Añadir al carrito"
            className={`w-full rounded-full py-2.5 text-xs font-semibold transition-all duration-200 shadow-lg ${
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
      <div className="mt-3 px-0.5">
        {/* Reserve a fixed-height slot so cards align in a row whether or not a product has a rating */}
        <div className="flex items-center gap-0.5 mb-1.5 min-h-[14px]">
          {rating !== undefined && (
            <>
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  viewBox="0 0 12 12"
                  className={`w-2.5 h-2.5 ${
                    i < Math.round(rating)
                      ? isDark
                        ? 'fill-yellow-400'
                        : 'fill-black'
                      : isDark
                      ? 'fill-zinc-700'
                      : 'fill-neutral-300'
                  }`}
                >
                  <path d="M6 .5l1.546 3.13 3.454.502-2.5 2.436.59 3.432L6 8.5 2.91 10l.59-3.432L1 4.132l3.454-.502L6 .5z" />
                </svg>
              ))}
              <span className={`text-[10px] ml-1 ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>
                {rating.toFixed(1)}
              </span>
            </>
          )}
        </div>

        <p
          className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${
            isDark ? 'text-yellow-400' : 'text-yellow-600'
          }`}
        >
          {category}
        </p>

        <p
          className={`text-sm font-medium line-clamp-2 leading-snug min-h-[2.5em] ${
            isDark ? 'text-white' : 'text-black'
          }`}
        >
          {name}
        </p>

        <p className={`text-[10px] mt-1 min-h-[1.4em] ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>
          {deliveryLabel ?? ''}
        </p>

        <div className="mt-2 flex items-baseline gap-2">
          <span className={`text-sm font-semibold ${isDark ? 'text-yellow-400' : 'text-black'}`}>
            ${finalPrice.toLocaleString('es-CL')}
          </span>
          {discountPct > 0 && (
            <span className={`text-xs line-through ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>
              ${price.toLocaleString('es-CL')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
