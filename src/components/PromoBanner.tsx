'use client';

/* eslint-disable @next/next/no-img-element */

/**
 * PromoBanner — Marquee horizontal con productos recomendados de la semana.
 *
 * Reemplaza el modal flotante anterior por un banner sticky bajo el navbar
 * que muestra productos en oferta o destacados en una cinta animada que
 * recorre horizontalmente en loop infinito. Pausable al hover/touch y
 * respeta `prefers-reduced-motion`.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X, Tag, Sparkles } from 'lucide-react';
import { insforge } from '@/lib/insforge';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

const SESSION_KEY = 'fabrick.promobanner.closed.v3';

type PromoProduct = {
  id: string;
  name: string;
  price: number;
  precio_original?: number;
  image_url?: string;
  descuento_pct?: number;
  featured?: boolean;
};

const FALLBACK_PROMOS: PromoProduct[] = [
  {
    id: 'fallback-1',
    name: 'Cerradura Biométrica Titanio',
    price: 129900,
    precio_original: 189900,
    image_url:
      'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=400&auto=format&fit=crop',
    descuento_pct: 32,
    featured: true,
  },
  {
    id: 'fallback-2',
    name: 'Panel Metalcon Estructural',
    price: 24990,
    image_url:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=400&auto=format&fit=crop',
    featured: true,
  },
  {
    id: 'fallback-3',
    name: 'Kit Iluminación LED Smart',
    price: 89900,
    precio_original: 119900,
    image_url:
      'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?q=80&w=400&auto=format&fit=crop',
    descuento_pct: 25,
  },
  {
    id: 'fallback-4',
    name: 'Cámara IP 4K Exterior',
    price: 79900,
    image_url:
      'https://images.unsplash.com/photo-1558002038-bb4237b50b11?q=80&w=400&auto=format&fit=crop',
  },
];

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

export default function PromoBanner() {
  const [closed, setClosed] = useState(true); // start hidden until hydration check
  const [items, setItems] = useState<PromoProduct[]>([]);
  const [paused, setPaused] = useState(false);

  // Hydrate visibility from sessionStorage
  useEffect(() => {
    const isClosed = !!sessionStorage.getItem(SESSION_KEY);
    setClosed(isClosed);
  }, []);

  // Load promo products
  useEffect(() => {
    let cancelled = false;
    async function loadPromos() {
      try {
        const { data } = await insforge.database
          .from('products')
          .select('id,name,price,image_url,discount_percentage,featured')
          .neq('activo', false)
          .order('discount_percentage', { ascending: false })
          .limit(8);

        if (cancelled) return;

        if (data && Array.isArray(data) && data.length > 0) {
          const mapped: PromoProduct[] = (data as Array<{
            id: string;
            name: string;
            price: number;
            image_url?: string;
            discount_percentage?: number;
            featured?: boolean;
          }>).map((p) => {
            const pct = p.discount_percentage ?? 0;
            return {
              id: p.id,
              name: p.name,
              price: pct > 0 ? Math.round(p.price * (1 - pct / 100)) : p.price,
              precio_original: pct > 0 ? p.price : undefined,
              image_url: p.image_url,
              descuento_pct: pct > 0 ? pct : undefined,
              featured: p.featured,
            };
          });
          setItems(mapped);
        } else {
          setItems(FALLBACK_PROMOS);
        }
      } catch {
        if (!cancelled) setItems(FALLBACK_PROMOS);
      }
    }
    void loadPromos();
    return () => {
      cancelled = true;
    };
  }, []);

  // Duplicate items for seamless infinite loop
  const loop = useMemo(() => [...items, ...items], [items]);

  const handleClose = () => {
    setClosed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (closed || items.length === 0) return null;

  // Animation duration scales with number of items so each card is visible long enough
  const durationSec = Math.max(20, items.length * 6);

  return (
    <>
      <style>{`
        @keyframes fbk-marquee {
          0%   { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-50%,0,0); }
        }
        .fbk-marquee-track {
          animation: fbk-marquee ${durationSec}s linear infinite;
          will-change: transform;
        }
        .fbk-marquee-track[data-paused="true"] {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .fbk-marquee-track { animation: none; }
        }
      `}</style>

      <aside
        role="region"
        aria-label="Productos recomendados de la semana"
        className="fixed left-0 right-0 z-30 pointer-events-auto"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0px)' }}
      >
        <div className="relative mx-auto max-w-screen-2xl bg-gradient-to-r from-black/95 via-zinc-950/95 to-black/95 backdrop-blur-md border-t border-yellow-400/30 shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
          {/* Top label */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-400 text-black text-[9px] font-black uppercase tracking-[0.2em] shadow-lg">
            <Sparkles className="w-3 h-3" />
            Recomendados
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Ocultar banner de recomendaciones"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>

          {/* Track */}
          <div
            className="overflow-hidden py-2.5 md:px-32 px-2"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            <div
              className="fbk-marquee-track flex gap-3 w-max"
              data-paused={paused ? 'true' : 'false'}
            >
              {loop.map((p, i) => (
                <Link
                  key={`${p.id}-${i}`}
                  href={`/tienda/${p.id}`}
                  className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900/70 border border-white/5 hover:border-yellow-400/40 transition-colors min-w-[240px]"
                >
                  {p.image_url ? (
                    <img
                      src={cloudinaryUrl(p.image_url, { width: 96, quality: 70 })}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="flex-shrink-0 w-12 h-12 rounded-lg object-cover border border-white/10"
                    />
                  ) : (
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-yellow-400/40 font-black text-xs">
                      FBK
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold leading-tight line-clamp-1">
                      {p.name}
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-yellow-400 text-sm font-black leading-none">
                        {formatPrice(p.price)}
                      </span>
                      {p.precio_original && (
                        <span className="text-zinc-500 text-[10px] line-through leading-none">
                          {formatPrice(p.precio_original)}
                        </span>
                      )}
                    </div>
                  </div>
                  {p.descuento_pct && p.descuento_pct > 0 ? (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-widest">
                      <Tag size={9} />
                      -{p.descuento_pct}%
                    </span>
                  ) : p.featured ? (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 text-[9px] font-black uppercase tracking-widest">
                      Top
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
