'use client';

import { useEffect, useRef, useState } from 'react';

interface LenisInstance {
  raf: (time: number) => void;
  destroy: () => void;
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"], [data-no-scroll-sweep]'));
}

export default function SmoothScrollProvider() {
  const [sweep, setSweep] = useState<'down' | 'up' | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    let lenis: LenisInstance | undefined;
    let rafId = 0;

    const init = async () => {
      const Lenis = (await import('lenis')).default;
      lenis = new Lenis({
        duration: 1.45,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.78,
        touchMultiplier: 1.25,
        infinite: false,
      }) as LenisInstance;

      function raf(time: number) {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    };

    void init();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, []);

  useEffect(() => {
    const triggerSweep = (direction: 'down' | 'up') => {
      const now = performance.now();
      if (now - lastTriggerRef.current < 420) return;
      lastTriggerRef.current = now;
      setSweep(direction);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setSweep(null), 760);
    };

    const onWheel = (event: WheelEvent) => {
      if (isInteractiveTarget(event.target)) return;
      if (Math.abs(event.deltaY) < 34) return;
      triggerSweep(event.deltaY > 0 ? 'down' : 'up');
    };

    let startY = 0;
    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (isInteractiveTarget(event.target)) return;
      const current = event.touches[0]?.clientY ?? startY;
      const delta = startY - current;
      if (Math.abs(delta) < 46) return;
      triggerSweep(delta > 0 ? 'down' : 'up');
      startY = current;
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div aria-hidden className={`pointer-events-none fixed inset-0 z-[9400] transition-opacity duration-300 ${sweep ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute inset-x-0 h-[58vh] ${sweep === 'up' ? 'bottom-0 origin-bottom animate-[scroll-sweep-up_.76s_cubic-bezier(.22,1,.36,1)_both]' : 'top-0 origin-top animate-[scroll-sweep-down_.76s_cubic-bezier(.22,1,.36,1)_both]'} bg-[linear-gradient(180deg,rgba(250,204,21,.32),rgba(20,184,166,.14),rgba(5,5,5,0))] blur-[1px]`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,.18),transparent_24rem)]" />
      </div>
      <style>{`
        html { scroll-behavior: smooth; }
        body { overscroll-behavior-y: none; }
        [data-scroll-section] { scroll-margin-top: 92px; }
        @keyframes scroll-sweep-down {
          0% { transform: translateY(-100%) scaleY(.72); opacity: 0; }
          32% { opacity: .92; }
          100% { transform: translateY(140%) scaleY(1.08); opacity: 0; }
        }
        @keyframes scroll-sweep-up {
          0% { transform: translateY(100%) scaleY(.72); opacity: 0; }
          32% { opacity: .92; }
          100% { transform: translateY(-140%) scaleY(1.08); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-[scroll-sweep-down_.76s_cubic-bezier(.22,1,.36,1)_both],
          .animate-[scroll-sweep-up_.76s_cubic-bezier(.22,1,.36,1)_both] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
