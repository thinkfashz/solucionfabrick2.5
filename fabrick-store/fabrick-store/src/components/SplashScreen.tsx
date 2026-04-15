'use client';

import { useEffect, useState } from 'react';

const SPLASH_KEY = 'fabrick.splash.v1';

export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Show on first visit per session
    const alreadyShown = sessionStorage.getItem(SPLASH_KEY);
    if (alreadyShown) return;

    sessionStorage.setItem(SPLASH_KEY, '1');
    setVisible(true);

    // Animate progress bar
    const start = Date.now();
    const duration = 2200;

    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        // Short pause at 100% then fade out
        setTimeout(() => {
          setExiting(true);
          setTimeout(() => setVisible(false), 600);
        }, 300);
      }
    };
    requestAnimationFrame(tick);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-600 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: '600ms' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.08)_0%,transparent_65%)] pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-8 w-full max-w-xs">
        <img
          src="/logo-soluciones-fabrick.svg"
          alt="Soluciones Fabrick"
          className="h-32 w-auto object-contain drop-shadow-[0_0_24px_rgba(255,199,0,0.4)] animate-pulse-logo"
        />

        {/* Progress track */}
        <div className="w-full space-y-3">
          <div className="w-full h-[3px] bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-500 shadow-[0_0_12px_rgba(250,204,21,0.6)] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] uppercase tracking-[0.35em] text-zinc-600 font-semibold">
              Cargando
            </span>
            <span className="text-[9px] font-mono text-yellow-400/70">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
