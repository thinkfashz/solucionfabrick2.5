'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FabrickFullLogo, FabrickPeakIcon } from '@/components/FabrickBrandIcon';

const SESSION_FLAG = 'fabrick.splash.seen.v6';

export default function SplashScreen() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [progress, setProgress] = useState(10);

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
      window.setTimeout(() => setProgress(30), reduced ? 25 : 100),
      window.setTimeout(() => setProgress(56), reduced ? 55 : 245),
      window.setTimeout(() => setProgress(78), reduced ? 85 : 410),
      window.setTimeout(() => setProgress(94), reduced ? 115 : 575),
      window.setTimeout(() => setProgress(100), reduced ? 140 : 710),
      window.setTimeout(() => setClosing(true), reduced ? 175 : 850),
      window.setTimeout(() => setVisible(false), reduced ? 230 : 1080),
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
      aria-busy="true"
      className={`fabrick-splash fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#070809] px-6 text-[#FFF9EE] ${closing ? 'is-closing' : ''}`}
      role="status"
    >
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="fabrick-splash-aurora absolute left-1/2 top-[42%] h-[min(92vw,680px)] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,161,29,.16)_0%,rgba(232,109,20,.055)_38%,transparent_70%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:radial-gradient(circle_at_center,black,transparent_74%)]" />
        <div className="absolute left-1/2 top-1/2 h-[min(82vw,620px)] w-[min(82vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-300/[0.08]" />
        <div className="fabrick-splash-beam absolute -left-[35%] top-[-20%] h-[150%] w-[32%] rotate-[18deg] bg-gradient-to-r from-transparent via-white/[0.045] to-transparent blur-2xl" />
      </div>

      <div className="fabrick-splash-content relative flex w-full max-w-xl select-none flex-col items-center">
        <div className="relative grid h-[132px] w-[132px] place-items-center" aria-hidden="true">
          <span className="fabrick-splash-orbit absolute inset-0 rounded-full border border-amber-300/15 border-t-amber-300/80" />
          <span className="fabrick-splash-orbit-reverse absolute inset-[10px] rounded-full border border-white/[0.07] border-b-orange-400/55" />
          <span className="absolute inset-[19px] rounded-[28px] border border-white/[0.08] bg-white/[0.035] shadow-[0_24px_90px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl" />
          <span className="fabrick-splash-mark relative z-10">
            <FabrickPeakIcon size={72} theme="light" />
          </span>

          <svg className="absolute -inset-2 h-[148px] w-[148px] -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.035)" strokeWidth="1.3" />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="url(#fabrick-ring-grad)"
              strokeLinecap="round"
              strokeWidth="2"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference * (1 - progress / 100)}
              style={{ transition: 'stroke-dashoffset .24s cubic-bezier(.2,.8,.2,1)' }}
            />
            <defs>
              <linearGradient id="fabrick-ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#FFE28A" />
                <stop offset=".52" stopColor="#F5A11D" />
                <stop offset="1" stopColor="#E86D14" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="fabrick-splash-wordmark relative mt-5 overflow-hidden px-3">
          <FabrickFullLogo priority theme="light" />
          <span className="fabrick-splash-sheen pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm" aria-hidden="true" />
        </div>

        <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-[.31em] text-white/42">
          Construcción · Remodelación · Hogar
        </p>

        <div className="mt-8 w-full max-w-[17.5rem]">
          <div className="mb-3 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[.19em] text-white/35">
            <span>Preparando experiencia</span>
            <span className="tabular-nums text-amber-300/90">{Math.round(progress)}%</span>
          </div>
          <div className="relative h-[3px] overflow-hidden rounded-full bg-white/[0.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,.02)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#A74E06,#F5A11D,#FFE28A)] shadow-[0_0_18px_rgba(245,161,29,.45)] transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] px-3 py-1.5">
          <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-35" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
          </span>
          <span className="text-[8px] font-bold uppercase tracking-[.22em] text-white/30">Soluciones Fabrick</span>
        </div>
      </div>

      <style jsx>{`
        .fabrick-splash {
          opacity: 1;
          clip-path: inset(0 0 0 0 round 0);
          transition: opacity .3s ease, clip-path .66s cubic-bezier(.76,0,.24,1), transform .66s cubic-bezier(.76,0,.24,1);
          will-change: opacity, clip-path, transform;
        }
        .fabrick-splash.is-closing {
          opacity: 0;
          clip-path: inset(0 0 100% 0 round 0);
          transform: translateY(-10px);
          pointer-events: none;
        }
        .fabrick-splash-content {
          animation: fabrickSplashEnter .6s cubic-bezier(.16,1,.3,1) both;
        }
        .fabrick-splash-orbit { animation: fabrickSplashOrbit 5.8s linear infinite; }
        .fabrick-splash-orbit-reverse { animation: fabrickSplashOrbitReverse 8.4s linear infinite; }
        .fabrick-splash-mark { animation: fabrickSplashMark 2.3s ease-in-out infinite; }
        .fabrick-splash-sheen { animation: fabrickSplashSheen 3.2s ease-in-out infinite; }
        .fabrick-splash-aurora { animation: fabrickSplashAurora 4.2s ease-in-out infinite; }
        .fabrick-splash-beam { animation: fabrickSplashBeam 4.8s ease-in-out infinite; }
        @keyframes fabrickSplashEnter {
          from { opacity: 0; transform: translateY(16px) scale(.965); filter: blur(5px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes fabrickSplashOrbit { to { transform: rotate(360deg); } }
        @keyframes fabrickSplashOrbitReverse { to { transform: rotate(-360deg); } }
        @keyframes fabrickSplashMark {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.025); }
        }
        @keyframes fabrickSplashSheen {
          0%,20% { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
          38% { opacity: 1; }
          62%,100% { transform: translateX(660%) skewX(-18deg); opacity: 0; }
        }
        @keyframes fabrickSplashAurora {
          0%,100% { opacity: .72; transform: translate(-50%,-50%) scale(.96); }
          50% { opacity: 1; transform: translate(-50%,-50%) scale(1.06); }
        }
        @keyframes fabrickSplashBeam {
          0%,100% { transform: translateX(-18%) rotate(18deg); opacity: .45; }
          50% { transform: translateX(340%) rotate(18deg); opacity: .9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fabrick-splash,
          .fabrick-splash-content,
          .fabrick-splash-orbit,
          .fabrick-splash-orbit-reverse,
          .fabrick-splash-mark,
          .fabrick-splash-sheen,
          .fabrick-splash-aurora,
          .fabrick-splash-beam {
            animation: none !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
