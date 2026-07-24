'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SESSION_FLAG = 'fabrick.splash.seen.v4';

export default function SplashScreen() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (isAdmin) return;
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) !== '1') {
        window.sessionStorage.setItem(SESSION_FLAG, '1');
        setVisible(true);
      }
    } catch {
      // En navegación privada preferimos no bloquear la pantalla.
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!visible || isAdmin) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timers = [
      window.setTimeout(() => setProgress(48), reduced ? 30 : 90),
      window.setTimeout(() => setProgress(78), reduced ? 70 : 220),
      window.setTimeout(() => setProgress(100), reduced ? 120 : 430),
      window.setTimeout(() => setClosing(true), reduced ? 160 : 560),
      window.setTimeout(() => setVisible(false), reduced ? 230 : 760),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.body.style.overflow = previousOverflow;
    };
  }, [isAdmin, visible]);

  if (isAdmin || !visible) return null;

  return (
    <div
      aria-label="Preparando Soluciones Fabrick"
      className={`fabrick-splash fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#171820] px-6 text-[#F8F0E9] ${closing ? 'is-closing' : ''}`}
      role="status"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(204,177,150,.2),transparent_32rem),linear-gradient(135deg,#171820,#242630_58%,#171820)]" />
      <div aria-hidden className="absolute h-[min(76vw,560px)] w-[min(76vw,560px)] rounded-full border border-[#CCB196]/12" />
      <div aria-hidden className="absolute inset-0 opacity-[.04] [background-image:linear-gradient(rgba(248,240,233,.65)_1px,transparent_1px),linear-gradient(90deg,rgba(248,240,233,.65)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="fabrick-splash-content relative flex w-full max-w-xl select-none flex-col items-center">
        <div className="absolute -inset-x-12 -inset-y-8 -z-10 rounded-full bg-[#CCB196]/10 blur-3xl" />
        <FabrickFullLogo priority theme="light" />
        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[.3em] text-[#D4C7BD]">Servicios · Calculadoras · Productos</p>
        <p className="mt-3 max-w-sm text-center text-xs leading-5 text-[#AFA39A]">Preparando una ruta clara para calcular y organizar tu proyecto.</p>

        <div className="mt-8 w-full max-w-xs">
          <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.18em] text-white/42">
            <span>Cargando experiencia</span>
            <span className="tabular-nums text-[#CCB196]">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#B6906C,#F8F0E9)] transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .fabrick-splash {
          opacity: 1;
          clip-path: inset(0 0 0 0);
          transition: opacity .24s ease, clip-path .42s cubic-bezier(.76,0,.24,1);
        }
        .fabrick-splash.is-closing {
          opacity: 0;
          clip-path: inset(0 0 100% 0);
          pointer-events: none;
        }
        .fabrick-splash-content {
          animation: fabrick-splash-enter .42s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes fabrick-splash-enter {
          from { opacity: 0; transform: translateY(12px) scale(.975); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fabrick-splash, .fabrick-splash-content { animation: none; transition-duration: .01ms; }
        }
      `}</style>
    </div>
  );
}
