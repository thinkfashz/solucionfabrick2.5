'use client';

import { useEffect } from 'react';

interface LenisInstance {
  raf: (time: number) => void;
  destroy: () => void;
}

export default function SmoothScrollProvider() {
  useEffect(() => {
    let lenis: LenisInstance | undefined;

    const init = async () => {
      const Lenis = (await import('lenis')).default;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5,
      }) as LenisInstance;

      function raf(time: number) {
        lenis!.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    };

    init();

    return () => {
      lenis?.destroy();
    };
  }, []);

  return null;
}
