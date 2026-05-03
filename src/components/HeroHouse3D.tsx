'use client';

/**
 * HeroHouse3D — Pieza central del hero. A petición del usuario, en lugar
 * de una ilustración SVG ("animación") usamos una FOTOGRAFÍA REAL de una
 * casa moderna con tratamiento premium (marco dorado sutil, glow de marca,
 * leve flotación).
 *
 * La foto proviene de Unsplash (licencia gratuita para uso comercial sin
 * atribución requerida). Se cargan dos URLs como respaldo: si la principal
 * falla, se intercambia automáticamente. Si ambas fallan, se cae a un
 * degradado oscuro con acento dorado para no dejar el hero en blanco.
 *
 * El nombre del componente se conserva para no tocar Hero.tsx.
 */

import { useEffect, useRef, useState } from 'react';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

const PRIMARY_PHOTO =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1600&auto=format&fit=crop';
const FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop';

export default function HeroHouse3D() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const triedFallback = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return (
    <div
      className={[
        'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        'w-[88vw] max-w-[520px] md:max-w-[720px] lg:max-w-[860px]',
        'aspect-[4/3]',
        'pointer-events-none select-none',
        reducedMotion ? '' : 'hero-house-float',
      ].join(' ')}
      aria-hidden="true"
    >
      {/* Marco dorado premium */}
      <div className="relative w-full h-full rounded-[1.75rem] md:rounded-[2.25rem] overflow-hidden">
        {/* Glow externo dorado */}
        <div
          className="absolute -inset-6 rounded-[2.5rem] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(250,204,21,0.18) 0%, rgba(201,169,110,0.10) 40%, transparent 75%)',
            filter: 'blur(20px)',
          }}
        />

        {/* Foto real de casa moderna */}
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cloudinaryUrl(PRIMARY_PHOTO, { width: 1280, quality: 75 })}
            alt="Casa moderna construida en Metalcon"
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            decoding="async"
            onError={(e) => {
              if (triedFallback.current) {
                setImgFailed(true);
                return;
              }
              triedFallback.current = true;
              e.currentTarget.src = cloudinaryUrl(FALLBACK_PHOTO, { width: 1280, quality: 75 });
            }}
          />
        ) : (
          /* Fallback si ambas URLs fallan: degradado oscuro con acento de marca */
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              background:
                'linear-gradient(135deg, #0a0a0c 0%, #1a1410 50%, #3a2a14 100%)',
            }}
          />
        )}

        {/* Vignette oscuro para que el texto del hero (que va por encima) se lea */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 100% 80% at 50% 60%, transparent 30%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.85) 100%)',
          }}
        />

        {/* Tinte negro para integrar con el fondo del hero */}
        <div className="absolute inset-0 bg-black/35 pointer-events-none" />

        {/* Marco dorado fino */}
        <div
          className="absolute inset-0 rounded-[1.75rem] md:rounded-[2.25rem] pointer-events-none"
          style={{
            border: '1px solid rgba(201,169,110,0.45)',
            boxShadow:
              'inset 0 0 0 1px rgba(250,204,21,0.08), 0 30px 80px rgba(0,0,0,0.55)',
          }}
        />

        {/* Esquinas decorativas estilo arquitectónico */}
        <span className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-yellow-400/70 rounded-tl-lg" />
        <span className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-yellow-400/70 rounded-tr-lg" />
        <span className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-yellow-400/70 rounded-bl-lg" />
        <span className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-yellow-400/70 rounded-br-lg" />
      </div>

      <style jsx>{`
        .hero-house-float {
          animation: hh-float 10s ease-in-out infinite;
        }
        @keyframes hh-float {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
}
