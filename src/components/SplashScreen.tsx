'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import FabrickLoadingScreen from '@/components/FabrickLoadingScreen';

const SESSION_FLAG = 'fabrick.splash.seen.v7';

export default function SplashScreen() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) !== '1') {
        window.sessionStorage.setItem(SESSION_FLAG, '1');
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!visible || isAdmin) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeTimer = window.setTimeout(() => setClosing(true), reduced ? 180 : 920);
    const hideTimer = window.setTimeout(() => setVisible(false), reduced ? 230 : 1240);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(hideTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isAdmin, visible]);

  if (isAdmin || !visible) return null;

  return (
    <div className={`sf-splash-shell fixed inset-0 z-[10000] ${closing ? 'is-closing' : ''}`}>
      <FabrickLoadingScreen
        eyebrow="Construcción · Remodelación · Hogar"
        title="Preparando Soluciones Fabrick"
        description="Cargando una experiencia rápida, segura y lista para tu proyecto."
      />
      <style jsx>{`
        .sf-splash-shell {
          opacity: 1;
          clip-path: inset(0 0 0 0);
          transform: translateY(0);
          transition: opacity .32s ease, clip-path .62s cubic-bezier(.76,0,.24,1), transform .62s cubic-bezier(.76,0,.24,1);
        }
        .sf-splash-shell.is-closing {
          opacity: 0;
          clip-path: inset(0 0 100% 0);
          transform: translateY(-8px);
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .sf-splash-shell { transition-duration: .01ms !important; }
        }
      `}</style>
    </div>
  );
}
