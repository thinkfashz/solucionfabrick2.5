'use client';

import { useEffect, useState } from 'react';
import { TRANSITION_EVENT } from '@/lib/routeTransition';

/** Progress stops here so the bar never "completes" before navigation */
const MAX_PROGRESS = 96;

export default function RouteTransitionOverlay() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleTransition = () => {
      setProgress(0);
      setVisible(true);

      const start = Date.now();
      const duration = 340;

      const tick = () => {
        const pct = Math.min(MAX_PROGRESS, Math.round(((Date.now() - start) / duration) * MAX_PROGRESS));
        setProgress(pct);
        if (pct < MAX_PROGRESS) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    window.addEventListener(TRANSITION_EVENT, handleTransition);
    return () => window.removeEventListener(TRANSITION_EVENT, handleTransition);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[8000] flex flex-col items-center justify-center bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.07)_0%,transparent_60%)] pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-10 px-8 w-full max-w-xs">
        <img
          src="/logo-soluciones-fabrick.svg"
          alt="Soluciones Fabrick"
          className="h-24 w-auto object-contain opacity-90"
        />
        <div className="w-full space-y-2">
          <div className="w-full h-[2px] bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-[8px] uppercase tracking-[0.5em] text-zinc-600">
            Soluciones Fabrick
          </p>
        </div>
      </div>
    </div>
  );
}
