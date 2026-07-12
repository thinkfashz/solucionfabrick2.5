'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SESSION_FLAG = 'fabrick.splash.seen.v3';
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

  // Always start hidden — useEffect sets to true client-side only.
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

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
  }, [isAdmin]);

  useEffect(() => {
    if (!visible || isAdmin) return;

    try { window.sessionStorage.setItem(SESSION_FLAG, '1'); } catch { /* private mode */ }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const loadController = new AbortController();
    let cancelled = false;
    let closeTimer: number | undefined;

    setProgress(document.readyState === 'complete' ? 52 : 18);
    const fonts = fontsReady().then(() => {
      if (!cancelled) setProgress((value) => Math.max(value, 74));
    });
    const loaded = windowReady(loadController.signal).then(() => {
      if (!cancelled) setProgress((value) => Math.max(value, 90));
    });
    const minimum = delay(prefersReduced ? 180 : 680);
    const maximum = delay(prefersReduced ? 500 : 1800);

    void Promise.race([Promise.all([fonts, loaded, minimum]), maximum]).then(() => {
      if (cancelled) return;
      setProgress(100);
      closeTimer = window.setTimeout(() => setVisible(false), prefersReduced ? 60 : 180);
    });

    const safety = window.setTimeout(() => setVisible(false), prefersReduced ? 650 : 2300);

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
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#080704] px-6 text-white"
          initial={{ clipPath: 'inset(0 0 0 0)', opacity: 1 }}
          exit={{
            clipPath: prefersReduced ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
            opacity: 0,
            transition: { duration: prefersReduced ? 0.16 : 0.58, ease: [0.76, 0, 0.24, 1] },
          }}
          role="status"
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(244,200,91,.18),transparent_34rem),linear-gradient(135deg,#050504,#100c05_55%,#050504)]" />
          <motion.div aria-hidden animate={prefersReduced ? { rotate: 0 } : { rotate: 360 }} className="absolute h-[min(78vw,620px)] w-[min(78vw,620px)] rounded-full border border-yellow-200/10" transition={{ duration: 22, ease: 'linear', repeat: Infinity }} />
          <div aria-hidden className="absolute inset-0 opacity-[.06] [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:48px_48px]" />
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative flex w-full max-w-xl select-none flex-col items-center"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: prefersReduced ? 0.18 : 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="absolute -inset-x-12 -inset-y-8 -z-10 rounded-full bg-yellow-300/10 blur-3xl" />
            <FabrickFullLogo priority theme="light" />
            <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[.34em] text-white/55">Construcción · Remodelación · Hogar</p>
            <div className="mt-10 w-full max-w-xs">
              <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.2em] text-white/45">
                <span>Preparando experiencia</span>
                <span className="tabular-nums text-yellow-200">{Math.round(progress)}%</span>
              </div>
              <div className="h-px overflow-hidden bg-white/12">
                <motion.div animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-amber-600 via-yellow-200 to-white shadow-[0_0_14px_rgba(244,200,91,.75)]" transition={{ duration: 0.22, ease: 'easeOut' }} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
