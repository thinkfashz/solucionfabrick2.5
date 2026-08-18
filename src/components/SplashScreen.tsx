'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

const SESSION_FLAG = 'fabrick.splash.seen.v5';

export default function SplashScreen() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [progress, setProgress] = useState(14);

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
      window.setTimeout(() => setProgress(34), reduced ? 30 : 110),
      window.setTimeout(() => setProgress(62), reduced ? 70 : 260),
      window.setTimeout(() => setProgress(88), reduced ? 110 : 430),
      window.setTimeout(() => setProgress(100), reduced ? 140 : 560),
      window.setTimeout(() => setClosing(true), reduced ? 170 : 660),
      window.setTimeout(() => setVisible(false), reduced ? 240 : 880),
    ];

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.body.style.overflow = previousOverflow;
    };
  }, [isAdmin, visible]);

  if (isAdmin || !visible) return null;

  const ringCircumference = 2 * Math.PI * 44;

  return (
    <div
      aria-label="Preparando Soluciones Fabrick"
      className={`fabrick-splash fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0D0E13] px-6 text-[#F8F0E9] ${closing ? 'is-closing' : ''}`}
      role="status"
    >
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,178,61,.16),transparent_24rem),radial-gradient(circle_at_78%_78%,rgba(182,144,108,.12),transparent_26rem),linear-gradient(160deg,#14161B,#0D0E13_55%,#0A0B0F)]" />
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[min(78vw,600px)] w-[min(78vw,600px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D8B23D]/10" />
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[min(62vw,460px)] w-[min(62vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D8B23D]/14 [mask-image:linear-gradient(180deg,black,transparent_70%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[.05] [background-image:linear-gradient(rgba(248,240,233,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(248,240,233,.5)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="fabrick-splash-content relative flex w-full max-w-xl select-none flex-col items-center">
        <div aria-hidden className="absolute -inset-16 -z-10 rounded-full bg-[#D8B23D]/8 blur-3xl" />

        <div className="relative grid h-[132px] w-[132px] place-items-center rounded-full bg-[#101217]/85 shadow-[0_30px_80px_rgba(0,0,0,.55)] ring-1 ring-[#D8B23D]/22 backdrop-blur">
          <div className="absolute inset-3 rounded-full border border-[#D8B23D]/14" />
          <span className="grid h-10 w-10 place-items-center" aria-hidden>
            <FabrickPeakIcon size={40} theme="light" />
          </span>
          <svg
            aria-hidden
            className="absolute -inset-2 h-[148px] w-[148px] -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(248,240,233,.08)" strokeWidth="1.6" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#fabrick-ring-grad)"
              strokeLinecap="round"
              strokeWidth="2.2"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference * (1 - progress / 100)}
              style={{ transition: 'stroke-dashoffset .22s ease-out' }}
            />
            <defs>
              <linearGradient id="fabrick-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#F4D98B" />
                <stop offset="1" stopColor="#B97E10" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="mt-8 text-center font-black leading-none tracking-[-.03em] sm:text-3xl" style={{ fontSize: 'clamp(1.6rem,4.5vw,2.1rem)' }}>
          <span className="block bg-[linear-gradient(100deg,#F8F0E9,#E7D4C1_55%,#C9A15A)] bg-clip-text text-transparent" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>
            Soluciones Fabrick
          </span>
        </h2>
        <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[.34em] text-[#D4C7BD]">Construcción · Remodelación · Hogar</p>
        <p className="mt-3 max-w-sm text-center text-xs leading-5 text-[#A2958B]">Preparando una ruta clara para calcular y organizar tu proyecto.</p>

        <div className="mt-9 w-full max-w-xs">
          <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.18em] text-white/42">
            <span>Cargando</span>
            <span className="tabular-nums text-[#D8B23D]">{Math.round(progress)}%</span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#8A5B0F,#D8B23D,#F4D98B)] transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .fabrick-splash {
          opacity: 1;
          clip-path: inset(0 0 0 0);
          transition: opacity .24s ease, clip-path .5s cubic-bezier(.76,0,.24,1);
        }
        .fabrick-splash.is-closing {
          opacity: 0;
          clip-path: inset(0 0 100% 0);
          pointer-events: none;
        }
        .fabrick-splash-content {
          animation: fabrick-splash-enter .48s cubic-bezier(.16,1,.3,1) both;
        }
        @keyframes fabrick-splash-enter {
          from { opacity: 0; transform: translateY(14px) scale(.972); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fabrick-splash, .fabrick-splash-content { animation: none; transition-duration: .01ms; }
        }
      `}</style>
    </div>
  );
}