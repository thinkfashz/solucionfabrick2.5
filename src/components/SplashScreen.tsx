'use client';

/**
 * SplashScreen — Pantalla de carga inicial.
 *
 * Animación de letras tipo "boot" cinematográfico: cada letra de
 * "SOLUCIONES FABRICK" aparece con stagger, subtítulo con fade.
 * Duración total: 3 segundos. Solo se muestra una vez por sesión
 * (sessionStorage). El estado siempre arranca en false en el servidor
 * para evitar el hydration mismatch que causaba la pantalla negra.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import DottedSurface from './DottedSurface';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SESSION_FLAG = 'fabrick.splash.seen.v2';
const LEGACY_SESSION_FLAG = 'fabrick.loadingScreen.seen.v1';

export default function SplashScreen() {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  // Always start hidden — useEffect sets to true client-side only.
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hardHidden, setHardHidden] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    try { window.sessionStorage.removeItem(LEGACY_SESSION_FLAG); } catch { /* ignore */ }
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) !== '1') {
        setVisible(true);
      }
    } catch {
      // sessionStorage unavailable (private mode, quota) — skip splash
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return;

    try { window.sessionStorage.setItem(SESSION_FLAG, '1'); } catch { /* private mode */ }

    const startTime = Date.now();
    const duration = prefersReduced ? 600 : 3000;
    let rafId: number | null = null;

    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const frame = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      setProgress(ease(t) * 100);
      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        window.setTimeout(() => setVisible(false), 180);
      }
    };

    rafId = requestAnimationFrame(frame);

    const safety = window.setTimeout(() => {
      setProgress(100);
      setVisible(false);
      setHardHidden(true);
    }, prefersReduced ? 900 : 3800);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.clearTimeout(safety);
    };
  }, [visible, prefersReduced]);

  if (isAdmin) return null;
  if (hardHidden) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: prefersReduced ? 1 : 1.04,
            filter: prefersReduced ? 'none' : 'blur(14px)',
            transition: { duration: prefersReduced ? 0.2 : 0.5, ease: [0.4, 0, 0.2, 1] },
          }}
          aria-hidden
        >
          {/* Animated dotted-surface background — Three.js wave-of-dots
              (estilo "Dotted Surface" de 21st.dev), tema ámbar Fabrick.
              Se omite con prefers-reduced-motion para no animar de más. */}
          {!prefersReduced && <DottedSurface className="opacity-[0.55] mix-blend-screen" />}

          {/* Ambient radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(250,204,21,0.09)_0%,rgba(0,0,0,0)_60%)]" />

          {/* Scanlines */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 3px)',
            }}
          />

          {/* Flash on exit */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-yellow-400"
            initial={{ opacity: 0 }}
            exit={{ opacity: [0, 0.12, 0], transition: { duration: 0.5, times: [0, 0.2, 1] } }}
          />

          <motion.div
            animate={{ filter: 'blur(0px)', opacity: 1, scale: 1 }}
            className="relative scale-110 select-none sm:scale-125"
            initial={{ filter: 'blur(10px)', opacity: 0, scale: 0.92 }}
            transition={{ duration: prefersReduced ? 0.2 : 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <FabrickFullLogo priority tagline="Tu obra en buenas manos" theme="light" />
          </motion.div>

          {/* Progress bar */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-24 h-px bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.5)]"
              style={{ width: `${progress}%`, transition: 'width 80ms linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
