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
        duration: 1.38,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.78,
        touchMultiplier: 1.2,
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
      if (now - lastTriggerRef.current < 440) return;
      lastTriggerRef.current = now;
      setSweep(direction);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setSweep(null), 720);
    };

    const onWheel = (event: WheelEvent) => {
      if (isInteractiveTarget(event.target)) return;
      if (Math.abs(event.deltaY) < 38) return;
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
      if (Math.abs(delta) < 50) return;
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

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('section, footer'))
      .filter((section) => !section.closest('[data-no-section-reveal]'));
    if (!sections.length) return;

    sections.forEach((section, index) => {
      section.classList.add('scroll-section-reveal');
      section.style.setProperty('--scroll-reveal-delay', `${Math.min(index * 45, 180)}ms`);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-in-view', 'true');
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -12% 0px' });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden className={`pointer-events-none fixed inset-0 z-[9400] transition-opacity duration-300 ${sweep ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute inset-x-0 h-[54vh] ${sweep === 'up' ? 'bottom-0 origin-bottom animate-[scroll-sweep-up_.72s_cubic-bezier(.22,1,.36,1)_both]' : 'top-0 origin-top animate-[scroll-sweep-down_.72s_cubic-bezier(.22,1,.36,1)_both]'} bg-[linear-gradient(180deg,rgba(250,204,21,.26),rgba(20,184,166,.13),rgba(5,5,5,0))] blur-[1px]`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,204,21,.12),transparent_24rem)]" />
      </div>
      <style>{`
        html { scroll-behavior: smooth; }
        body { overscroll-behavior-y: none; }
        section, footer { scroll-margin-top: 92px; }
        .scroll-section-reveal {
          position: relative;
          opacity: .78;
          transform: translateY(42px) scale(.988);
          filter: saturate(.9) contrast(.98);
          transition:
            opacity .86s cubic-bezier(.22,1,.36,1) var(--scroll-reveal-delay, 0ms),
            transform .86s cubic-bezier(.22,1,.36,1) var(--scroll-reveal-delay, 0ms),
            filter .86s cubic-bezier(.22,1,.36,1) var(--scroll-reveal-delay, 0ms);
        }
        .scroll-section-reveal[data-in-view="true"] {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: saturate(1) contrast(1);
        }
        .scroll-section-reveal::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          z-index: 1;
          width: min(76vw, 980px);
          height: 1px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(250,204,21,.34), rgba(20,184,166,.20), transparent);
          opacity: .6;
          pointer-events: none;
        }
        @keyframes scroll-sweep-down {
          0% { transform: translateY(-100%) scaleY(.72); opacity: 0; }
          30% { opacity: .9; }
          100% { transform: translateY(138%) scaleY(1.08); opacity: 0; }
        }
        @keyframes scroll-sweep-up {
          0% { transform: translateY(100%) scaleY(.72); opacity: 0; }
          30% { opacity: .9; }
          100% { transform: translateY(-138%) scaleY(1.08); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-section-reveal {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
            transition: none !important;
          }
          .animate-[scroll-sweep-down_.72s_cubic-bezier(.22,1,.36,1)_both],
          .animate-[scroll-sweep-up_.72s_cubic-bezier(.22,1,.36,1)_both] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
