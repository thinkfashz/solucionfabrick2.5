'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Full-screen cinematic page transition overlay — BlackBerry-style.
 *
 * Mounted once at the root. `routeTransition.ts` toggles its visibility
 * when a navigation starts. This component listens to `usePathname()` and
 * automatically fades the overlay out the moment the destination route is
 * mounted, so the overlay can never get "stuck" on slow/heavy pages like
 * `/tienda`.
 */
export default function PageTransition() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip the very first render — there's nothing to transition from.
    if (prevPathRef.current === null) {
      prevPathRef.current = pathname;
      return;
    }
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    const el = document.getElementById('page-transition-overlay') as HTMLDivElement | null;
    if (!el) return;

    // Wait two animation frames so the new route has a chance to paint
    // behind the overlay before we fade out — this avoids a visible flash
    // of the previous page while the router is still committing.
    let raf1: number | null = null;
    let raf2: number | null = null;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.4s cubic-bezier(0.16,1,0.3,1)';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      });
    });

    return () => {
      if (raf1 !== null) cancelAnimationFrame(raf1);
      if (raf2 !== null) cancelAnimationFrame(raf2);
    };
  }, [pathname]);

  return (
    <div
      id="page-transition-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background:
          'radial-gradient(ellipse at center, #0a0a0a 0%, #000 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}
      aria-hidden="true"
    >
      {/* SF logo — breathing pulse */}
      <svg
        viewBox="0 0 160 80"
        className="motion-safe:animate-[pt-breathe_1.8s_ease-in-out_infinite]"
        style={{ height: '5rem', width: 'auto', filter: 'drop-shadow(0 0 24px rgba(250,204,21,0.55))' }}
      >
        <defs>
          <linearGradient id="ptGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE17A" />
            <stop offset="60%" stopColor="#FFC700" />
            <stop offset="100%" stopColor="#E2AE00" />
          </linearGradient>
        </defs>
        <text
          x="12"
          y="62"
          fontFamily="Montserrat, Arial, sans-serif"
          fontSize="72"
          fontWeight="900"
          fill="url(#ptGold)"
          letterSpacing="-2"
        >
          SF
        </text>
      </svg>

      {/* Wordmark */}
      <div
        style={{
          fontFamily: 'Montserrat, Arial, sans-serif',
          fontSize: '10px',
          letterSpacing: '0.5em',
          color: 'rgba(250,204,21,0.75)',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        Soluciones · Fabrick
      </div>

      {/* Progress bar — animates while overlay is on */}
      <div
        style={{
          width: '180px',
          height: '2px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <span
          className="motion-safe:animate-[pt-indeterminate_1.2s_linear_infinite]"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '45%',
            borderRadius: '999px',
            background:
              'linear-gradient(90deg, transparent 0%, #FFE17A 40%, #FFC700 60%, transparent 100%)',
            boxShadow: '0 0 14px rgba(250,204,21,0.65)',
          }}
        />
      </div>

      {/* Tiny status text */}
      <div
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: '9px',
          letterSpacing: '0.35em',
          color: 'rgba(255,255,255,0.25)',
          textTransform: 'uppercase',
        }}
      >
        Cargando experiencia
      </div>
    </div>
  );
}

