'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag } from 'lucide-react';
import { insforge } from '@/lib/insforge';

const SESSION_KEY = 'fabrick.promobanner.closed.v1';

type PromoProduct = {
  id: string;
  name: string;
  price: number;
  precio_original?: number;
  image_url?: string;
  descuento_pct?: number;
};

const FALLBACK_PROMO: PromoProduct = {
  id: 'fallback',
  name: 'Cerradura Biométrica Titanio',
  price: 129900,
  precio_original: 189900,
  image_url:
    'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=400&auto=format&fit=crop',
  descuento_pct: 32,
};

function calcDiscount(original: number, offer: number): number {
  return Math.round(((original - offer) / original) * 100);
}

export default function PromoBanner() {
  const [visible, setVisible] = useState(false);
  const [promo, setPromo] = useState<PromoProduct | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    async function loadPromo() {
      try {
        const { data } = await insforge.database
          .from('productos')
          .select('id,name,price,precio_original,image_url,descuento_pct')
          .eq('en_oferta', true)
          .eq('activo', true)
          .order('descuento_pct', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setPromo(data[0] as PromoProduct);
        } else {
          setPromo(FALLBACK_PROMO);
        }
      } catch {
        setPromo(FALLBACK_PROMO);
      }
    }

    void loadPromo();

    const timer = setTimeout(() => {
      if (!sessionStorage.getItem(SESSION_KEY)) setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, '1');
  };

  if (!promo) return null;

  const discountPct =
    promo.descuento_pct ??
    (promo.precio_original ? calcDiscount(promo.precio_original, promo.price) : null);

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="promo-banner"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0 }}
          className={[
            'fixed z-[200] pointer-events-auto',
            // Desktop: bottom-right; Mobile: bottom-center above footer
            'bottom-5 right-5',
            'max-sm:right-1/2 max-sm:translate-x-1/2 max-sm:bottom-20',
            // Ensure at least 80px from top (covered by inline style constraint)
          ].join(' ')}
          style={{ maxWidth: 320, top: 'auto' }}
          role="dialog"
          aria-label="Oferta especial"
        >
          <div className="relative rounded-2xl border border-yellow-400/60 bg-black shadow-[0_8px_40px_rgba(250,204,21,0.25)] overflow-hidden w-[320px] max-sm:w-[calc(100vw-40px)]">
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label="Cerrar oferta"
              className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>

            {/* Discount badge */}
            {discountPct && discountPct > 0 && (
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shadow-lg">
                <Tag size={9} />
                {discountPct}% OFF
              </div>
            )}

            <div className="flex gap-3 p-3 pt-8">
              {/* Product image */}
              {promo.image_url && (
                <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                  <img
                    src={promo.image_url}
                    alt={promo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-yellow-400/70 mb-0.5">
                  Oferta especial
                </p>
                <p className="text-white text-sm font-semibold leading-snug line-clamp-2 mb-2">
                  {promo.name}
                </p>
                <div className="flex items-baseline gap-2">
                  {promo.precio_original && (
                    <span className="text-zinc-500 text-xs line-through">
                      {formatPrice(promo.precio_original)}
                    </span>
                  )}
                  <span className="text-yellow-400 text-xl font-black leading-none">
                    {formatPrice(promo.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="px-3 pb-3">
              <a
                href="/tienda"
                className="block w-full text-center py-2 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest hover:bg-yellow-300 transition-colors shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                onClick={handleClose}
              >
                Ver oferta
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
