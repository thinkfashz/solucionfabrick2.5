'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SESSION_FLAG = 'fabrick.splash.seen.v4';
const LEGACY_SESSION_FLAG = 'fabrick.loadingScreen.seen.v1';

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function windowReady(signal: AbortSignal) {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true, signal }));
}

function fontsReady() {
  return document.fonts?.ready?.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
}

export default function SplashScreen() {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isAdmin) return;
    try { window.sessionStorage.removeItem(LEGACY_SESSION_FLAG); } catch { /* ignore */ }
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) !== '1') setVisible(true);
    } catch {
      // sessionStorage unavailable; skip splash
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!visible || isAdmin) return;
    try { window.sessionStorage.setItem(SESSION_FLAG, '1'); } catch { /* private mode */ }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const loadController = new AbortController();
    let cancelled = false;
    let closeTimer: number | undefined;

    setProgress(document.readyState === 'complete' ? 58 : 16);
    const fonts = fontsReady().then(() => { if (!cancelled) setProgress((value) => Math.max(value, 78)); });
    const loaded = windowReady(loadController.signal).then(() => { if (!cancelled) setProgress((value) => Math.max(value, 92)); });
    const minimum = delay(prefersReduced ? 160 : 760);
    const maximum = delay(prefersReduced ? 480 : 1850);

    void Promise.race([Promise.all([fonts, loaded, minimum]), maximum]).then(() => {
      if (cancelled) return;
      setProgress(100);
      closeTimer = window.setTimeout(() => setVisible(false), prefersReduced ? 60 : 220);
    });

    const safety = window.setTimeout(() => setVisible(false), prefersReduced ? 650 : 2450);

    return () => {
      cancelled = true;
      loadController.abort();
      if (closeTimer) window.clearTimeout(closeTimer);
      window.clearTimeout(safety);
      document.body.style.overflow = previousOverflow;
    };
  }, [isAdmin, prefersReduced, visible]);

  if (isAdmin) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          aria-label="Preparando Soluciones Fabrick"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#070503] px-6 text-[#fff1d6]"
          initial={{ clipPath: 'inset(0 0 0 0)', opacity: 1 }}
          exit={{
            clipPath: prefersReduced ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
            opacity: 0,
            transition: { duration: prefersReduced ? 0.16 : 0.62, ease: [0.76, 0, 0.24, 1] },
          }}
          role="status"
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(250,204,21,.28),transparent_30rem),radial-gradient(circle_at_84%_18%,rgba(255,106,31,.24),transparent_28rem),radial-gradient(circle_at_50%_110%,rgba(255,241,214,.10),transparent_26rem),linear-gradient(145deg,#170f08_0%,#070503_55%,#020201_100%)]" />
          <motion.div aria-hidden animate={prefersReduced ? { rotate: 0 } : { rotate: 360 }} className="absolute h-[min(82vw,660px)] w-[min(82vw,660px)] rounded-full border border-[#fff1d6]/10" transition={{ duration: 24, ease: 'linear', repeat: Infinity }} />
          <motion.div aria-hidden animate={prefersReduced ? { rotate: 0 } : { rotate: -360 }} className="absolute h-[min(58vw,440px)] w-[min(58vw,440px)] rounded-full border border-orange-400/10" transition={{ duration: 16, ease: 'linear', repeat: Infinity }} />
          <div aria-hidden className="absolute inset-0 opacity-[.08] [background-image:linear-gradient(rgba(255,241,214,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,241,214,.22)_1px,transparent_1px)] [background-size:50px_50px]" />
          <div aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,241,214,.10),transparent)]" />

          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative flex w-full max-w-xl select-none flex-col items-center"
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            transition={{ duration: prefersReduced ? 0.18 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute -inset-x-16 -inset-y-10 -z-10 rounded-full bg-[radial-gradient(circle_at_50%_35%,rgba(255,241,214,.18),rgba(250,204,21,.10),transparent_70%)] blur-3xl" />
            <div className="relative rounded-[2rem] border border-[#fff1d6]/14 bg-black/28 px-8 py-7 shadow-[0_28px_120px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,241,214,.08)] backdrop-blur-2xl">
              <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#fff1d6]/45 to-transparent" />
              <FabrickFullLogo priority theme="light" />
              <p className="mt-5 text-center text-[10px] font-black uppercase tracking-[.34em] text-[#fff1d6]/55">Construcción · Tienda · Admin</p>
            </div>

            <div className="mt-9 w-full max-w-sm">
              <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[.22em] text-[#fff1d6]/45">
                <span>Preparando experiencia</span>
                <span className="tabular-nums text-[#facc15]">{Math.round(progress)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[#fff1d6]/12">
                <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full bg-gradient-to-r from-[#fff1d6] via-[#facc15] to-[#ff6a1f] shadow-[0_0_22px_rgba(250,204,21,.82)]" transition={{ duration: 0.24, ease: 'easeOut' }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-[#fff1d6]/45">
                <span className={progress >= 36 ? 'text-[#fff1d6]' : ''}>Tema</span>
                <span className={progress >= 72 ? 'text-[#fff1d6]' : ''}>Módulos</span>
                <span className={progress >= 92 ? 'text-[#fff1d6]' : ''}>Listo</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
