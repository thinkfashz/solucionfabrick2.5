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

function shouldUseNativeTouchScroll() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches || window.innerWidth < 900;
}

export default function SmoothScrollProvider() {
  const [sweep, setSweep] = useState<'down' | 'up' | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lastTriggerRef = useRef(0);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (shouldUseNativeTouchScroll()) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let lenis: LenisInstance | undefined;
    let rafId = 0;
    let alive = true;

    const init = async () => {
      const Lenis = (await import('lenis')).default;
      if (!alive) return;
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.82,
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
      alive = false;
      if (rafId) cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, []);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY || 0;

    const triggerSweep = (direction: 'down' | 'up') => {
      const now = performance.now();
      if (now - lastTriggerRef.current < 520) return;
      lastTriggerRef.current = now;
      setSweep(direction);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setSweep(null), 560);
    };

    const onWheel = (event: WheelEvent) => {
      if (shouldUseNativeTouchScroll()) return;
      if (isInteractiveTarget(event.target)) return;
      if (Math.abs(event.deltaY) < 42) return;
      triggerSweep(event.deltaY > 0 ? 'down' : 'up');
    };

    const onScroll = () => {
      const current = window.scrollY || 0;
      const delta = current - lastScrollYRef.current;
      lastScrollYRef.current = current;
      if (Math.abs(delta) < 90) return;
      triggerSweep(delta > 0 ? 'down' : 'up');
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
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
      section.style.setProperty('--scroll-reveal-delay', `${Math.min(index * 35, 140)}ms`);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-in-view', 'true');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden className={`pointer-events-none fixed inset-0 z-[9400] transition-opacity duration-200 ${sweep ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute inset-x-0 h-[38vh] ${sweep === 'up' ? 'bottom-0 origin-bottom animate-[scroll-sweep-up_.54s_cubic-bezier(.22,1,.36,1)_both]' : 'top-0 origin-top animate-[scroll-sweep-down_.54s_cubic-bezier(.22,1,.36,1)_both]'} bg-[linear-gradient(180deg,rgba(250,204,21,.18),rgba(20,184,166,.08),rgba(5,5,5,0))] blur-[1px]`} />
      </div>
      <style>{`
        html {
          scroll-behavior: smooth;
          overflow-x: hidden;
          touch-action: pan-y pinch-zoom;
          -webkit-overflow-scrolling: touch;
        }
        body {
          overflow-x: hidden;
          overscroll-behavior-y: auto;
          touch-action: pan-y pinch-zoom;
          -webkit-overflow-scrolling: touch;
        }
        section, footer { scroll-margin-top: 92px; }
        .scroll-section-reveal {
          position: relative;
          opacity: .88;
          transform: translate3d(0, 22px, 0);
          filter: saturate(.94) contrast(.99);
          transition:
            opacity .68s cubic-bezier(.22,1,.36,1) var(--scroll-reveal-delay, 0ms),
            transform .68s cubic-bezier(.22,1,.36,1) var(--scroll-reveal-delay, 0ms),
            filter .68s cubic-bezier(.22,1,.36,1) var(--scroll-reveal-delay, 0ms);
          will-change: opacity, transform;
        }
        .scroll-section-reveal[data-in-view="true"] {
          opacity: 1;
          transform: translate3d(0, 0, 0);
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
          background: linear-gradient(90deg, transparent, rgba(250,204,21,.28), rgba(20,184,166,.16), transparent);
          opacity: .48;
          pointer-events: none;
        }
        @keyframes scroll-sweep-down {
          0% { transform: translateY(-100%) scaleY(.8); opacity: 0; }
          28% { opacity: .75; }
          100% { transform: translateY(120%) scaleY(1); opacity: 0; }
        }
        @keyframes scroll-sweep-up {
          0% { transform: translateY(100%) scaleY(.8); opacity: 0; }
          28% { opacity: .75; }
          100% { transform: translateY(-120%) scaleY(1); opacity: 0; }
        }
        @media (hover: none), (pointer: coarse), (max-width: 899px) {
          html { scroll-behavior: auto; }
          .scroll-section-reveal {
            opacity: 1;
            transform: none;
            filter: none;
            transition: opacity .28s ease-out;
            will-change: auto;
          }
          .scroll-section-reveal::before { opacity: .32; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-section-reveal {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
            transition: none !important;
            will-change: auto !important;
          }
          .animate-[scroll-sweep-down_.54s_cubic-bezier(.22,1,.36,1)_both],
          .animate-[scroll-sweep-up_.54s_cubic-bezier(.22,1,.36,1)_both] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
