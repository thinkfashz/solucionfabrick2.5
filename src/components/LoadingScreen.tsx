'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const SESSION_FLAG = 'fabrick.loadingScreen.seen.v1';

export default function LoadingScreen() {
  const pathname = usePathname();
  // The admin panel must never be covered by the splash. Skip rendering it
  // entirely on `/admin/*` so a stuck splash can never block the control room.
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  // Only show the splash on the very first visit of a browser session.
  // Subsequent client-side navigations and refreshes skip it so the app
  // never feels "stuck" on the SF animation.
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return sessionStorage.getItem(SESSION_FLAG) !== '1';
    } catch {
      return true;
    }
  });
  const [progress, setProgress] = useState(0);
  // Hard kill switch. If something prevents `AnimatePresence` from running
  // the exit animation (stale framer-motion, provider unmount, etc.) we
  // still want the splash gone — this skips rendering entirely.
  const [hardHidden, setHardHidden] = useState(false);

  useEffect(() => {
    if (!visible) return;

    try {
      sessionStorage.setItem(SESSION_FLAG, '1');
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }

    // Animate progress bar from 0 → 100
    const startTime = Date.now();
    const duration = 600;
    let rafId: number | null = null;

    const frame = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p < 100) {
        rafId = requestAnimationFrame(frame);
      } else {
        // Hold briefly then fade out
        window.setTimeout(() => setVisible(false), 100);
      }
    };

    rafId = requestAnimationFrame(frame);

    // Safety net: no matter what (tab throttling, RAF failure, broken
    // animation lib), hide the splash after 800ms so the app never stays stuck.
    // We also force `hardHidden` which bypasses `AnimatePresence`'s exit
    // animation — if framer-motion fails to run the exit for any reason,
    // the splash still disappears from the DOM.
    const safety = window.setTimeout(() => {
      setProgress(100);
      setVisible(false);
      setHardHidden(true);
    }, 800);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.clearTimeout(safety);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && !hardHidden && !isAdmin && (
        <motion.div
          key="loading"
          className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center loading-screen-failsafe overflow-hidden"
          initial={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{
            opacity: 0,
            scale: 1.06,
            filter: 'blur(18px)',
            transition: { duration: 0.65, ease: [0.4, 0, 0.2, 1] },
          }}
        >
          {/* Flash overlay on exit */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-yellow-400"
            initial={{ opacity: 0 }}
            exit={{ opacity: [0, 0.18, 0], transition: { duration: 0.65, times: [0, 0.15, 1] } }}
          />
          {/* Logo SF */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[min(92vw,760px)]"
          >
            <div className="absolute -inset-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_10%,rgba(250,204,21,0.18),rgba(0,0,0,0)_60%)] blur-2xl" />

            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/20 bg-zinc-900/80 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute left-1/2 top-0 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-black/70" />

              <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-black px-7 pb-8 pt-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(250,204,21,0.14),rgba(0,0,0,0)_42%),radial-gradient(circle_at_80%_80%,rgba(56,189,248,0.14),rgba(0,0,0,0)_46%)]" />
                <div className="pointer-events-none absolute inset-0 loading-macbook-scanlines opacity-35" />

                <div className="relative flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Macbook Mode</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-yellow-400">Booting {Math.round(progress)}%</span>
                </div>

                <div className="relative mt-8">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-300/40 bg-yellow-400 shadow-[0_8px_30px_rgba(250,204,21,0.35)]">
                      <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),rgba(255,255,255,0)_62%)]" />
                      <span className="relative text-lg font-black uppercase tracking-[0.24em] text-black">SF</span>
                    </div>
                    <div>
                      <p className="font-playfair text-2xl font-black tracking-[0.16em] text-yellow-400">SOLUCIONES FABRICK</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-zinc-500">Evolution Transition Engine</p>
                    </div>
                  </div>

                  <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#a16207,#facc15,#fef08a)] shadow-[0_0_18px_rgba(250,204,21,0.65)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-[9px] uppercase tracking-[0.22em] text-zinc-500">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-center">Kernel</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-center">UI Matrix</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-center">Sync Grid</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.p
            className="mt-5 text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Seamless cinematic boot transition
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
