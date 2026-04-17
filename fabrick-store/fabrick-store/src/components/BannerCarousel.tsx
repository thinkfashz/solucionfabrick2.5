'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { insforge } from '@/lib/insforge';

type Banner = {
  id: string;
  image_url: string;
  title?: string;
  subtitle?: string;
  link?: string;
};

const FALLBACK_BANNERS: Banner[] = [
  {
    id: 'b1',
    image_url:
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop',
    title: 'Revestimientos de Lujo',
    subtitle: 'Hasta 30% OFF en productos seleccionados',
    link: '/tienda',
  },
  {
    id: 'b2',
    image_url:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
    title: 'Ingeniería Residencial',
    subtitle: 'Cerraduras biométricas — nueva colección',
    link: '/tienda',
  },
  {
    id: 'b3',
    image_url:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=1200&auto=format&fit=crop',
    title: 'Iluminación Premium',
    subtitle: 'LED arquitectónico desde $85.500',
    link: '/tienda',
  },
];

export default function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    async function loadBanners() {
      try {
        const { data } = await insforge.database
          .from('banners')
          .select('id,image_url,title,subtitle,link')
          .eq('activo', true)
          .order('orden', { ascending: true });

        if (data && data.length > 0) {
          setBanners(data as Banner[]);
        } else {
          setBanners(FALLBACK_BANNERS);
        }
      } catch {
        setBanners(FALLBACK_BANNERS);
      }
    }
    void loadBanners();
  }, []);

  const count = banners.length;

  const prev = () => setCurrent((c) => (c - 1 + count) % count);
  const next = () => setCurrent((c) => (c + 1) % count);

  useEffect(() => {
    if (paused || count === 0) return;
    intervalRef.current = setInterval(next, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, count, current]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  if (banners.length === 0) return null;

  const banner = banners[current];

  return (
    <div
      className="relative w-full overflow-hidden bg-zinc-900"
      style={{ maxHeight: 200, height: 200 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {banner.link ? (
            <a href={banner.link} className="block w-full h-full">
              <BannerSlide banner={banner} />
            </a>
          ) : (
            <BannerSlide banner={banner} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Banner anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            aria-label="Banner siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Position indicators */}
      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Ir al banner ${i + 1}`}
              className={`transition-all rounded-full ${
                i === current
                  ? 'w-5 h-1.5 bg-yellow-400'
                  : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerSlide({ banner }: { banner: Banner }) {
  return (
    <div className="relative w-full h-full">
      <img
        src={banner.image_url}
        alt={banner.title ?? 'Oferta Fabrick'}
        className="w-full h-full object-cover"
      />
      {(banner.title || banner.subtitle) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex flex-col justify-center px-6">
          {banner.title && (
            <p className="text-white text-base md:text-xl font-black uppercase tracking-wider leading-tight drop-shadow">
              {banner.title}
            </p>
          )}
          {banner.subtitle && (
            <p className="text-yellow-400 text-xs md:text-sm font-semibold mt-1 tracking-wide drop-shadow">
              {banner.subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
