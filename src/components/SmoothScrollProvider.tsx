'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

interface LenisInstance {
  raf: (time: number) => void;
  destroy: () => void;
  on?: (event: 'scroll', callback: () => void) => void;
  off?: (event: 'scroll', callback: () => void) => void;
}

interface GsapContext {
  revert: () => void;
}

interface GsapApi {
  registerPlugin: (plugin: unknown) => void;
  context: (callback: () => void) => GsapContext;
  utils: { toArray: <T extends Element>(selector: string) => T[] };
  fromTo: (target: unknown, fromVars: Record<string, unknown>, toVars: Record<string, unknown>) => unknown;
  to: (target: unknown, vars: Record<string, unknown>) => unknown;
}

interface ScrollTriggerApi {
  update: () => void;
  refresh: () => void;
}

declare global {
  interface Window {
    gsap?: GsapApi;
    ScrollTrigger?: ScrollTriggerApi;
  }
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
  const [gsapReady, setGsapReady] = useState(false);
  const [scrollTriggerReady, setScrollTriggerReady] = useState(false);
  const [lenisReady, setLenisReady] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const lastTriggerRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const lenisRef = useRef<LenisInstance | null>(null);

  useEffect(() => {
    if (shouldUseNativeTouchScroll()) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rafId = 0;
    let alive = true;

    const init = async () => {
      const Lenis = (await import('lenis')).default;
      if (!alive) return;

      const lenis = new Lenis({
        duration: 1.12,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.82,
        infinite: false,
      }) as LenisInstance;

      lenisRef.current = lenis;
      setLenisReady(true);

      const raf = (time: number) => {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    };

    void init();

    return () => {
      alive = false;
      setLenisReady(false);
      if (rafId) cancelAnimationFrame(rafId);
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!scrollTriggerReady || !lenisReady) return;
    const update = () => window.ScrollTrigger?.update();
    lenisRef.current?.on?.('scroll', update);
    return () => lenisRef.current?.off?.('scroll', update);
  }, [lenisReady, scrollTriggerReady]);

  useEffect(() => {
    if (!gsapReady || !scrollTriggerReady) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);
    const desktop = window.matchMedia('(min-width: 900px)').matches;

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        const delay = Number(element.dataset.revealDelay || 0);
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: desktop ? 42 : 22, filter: desktop ? 'blur(9px)' : 'blur(3px)' },
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: desktop ? 0.9 : 0.62,
            delay,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 88%',
              once: true,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const children = Array.from(group.children);
        if (!children.length) return;
        gsap.fromTo(
          children,
          { autoAlpha: 0, y: 28, scale: 0.985 },
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.72,
            stagger: 0.09,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: group,
              start: 'top 84%',
              once: true,
            },
          },
        );
      });

      if (desktop) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
          const amount = Number(element.dataset.parallax || -10);
          gsap.to(element, {
            yPercent: amount,
            ease: 'none',
            scrollTrigger: {
              trigger: element.closest('section') || element,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.1,
            },
          });
        });

        const spinSection = document.querySelector<HTMLElement>('[data-spin-carousel]');
        const ring = spinSection?.querySelector<HTMLElement>('.spin-carousel-ring');
        const cardFaces = spinSection ? Array.from(spinSection.querySelectorAll<HTMLElement>('.spin-card-content')) : [];
        if (spinSection && ring) {
          gsap.to(ring, {
            rotation: 360,
            ease: 'none',
            scrollTrigger: {
              trigger: spinSection,
              start: 'top 78%',
              end: 'bottom 22%',
              scrub: 1.15,
            },
          });
          gsap.to(cardFaces, {
            rotation: '-=360',
            ease: 'none',
            scrollTrigger: {
              trigger: spinSection,
              start: 'top 78%',
              end: 'bottom 22%',
              scrub: 1.15,
            },
          });
        }
      }
    });

    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    return () => {
      window.clearTimeout(refreshId);
      context.revert();
    };
  }, [gsapReady, scrollTriggerReady]);

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

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onReady={() => setGsapReady(true)}
      />
      {gsapReady ? (
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"
          strategy="afterInteractive"
          onReady={() => setScrollTriggerReady(true)}
        />
      ) : null}

      <div aria-hidden className={`pointer-events-none fixed inset-0 z-[9400] transition-opacity duration-200 ${sweep ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute inset-x-0 h-[38vh] ${sweep === 'up' ? 'bottom-0 origin-bottom animate-[scroll-sweep-up_.54s_cubic-bezier(.22,1,.36,1)_both]' : 'top-0 origin-top animate-[scroll-sweep-down_.54s_cubic-bezier(.22,1,.36,1)_both]'} bg-[linear-gradient(180deg,rgba(250,204,21,.17),rgba(249,115,22,.08),rgba(5,5,5,0))] blur-[1px]`} />
      </div>

      <style>{`
        html {
          scroll-behavior: auto;
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
        [data-reveal], [data-reveal-group] > * {
          backface-visibility: hidden;
          transform: translateZ(0);
        }
        .fabrick-glass {
          border: 1px solid rgba(255,255,255,.12);
          background: linear-gradient(145deg, rgba(255,255,255,.095), rgba(255,255,255,.025));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.1), 0 24px 80px rgba(0,0,0,.28);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .fabrick-gradient-button {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(254,240,138,.38);
          background: linear-gradient(112deg, rgba(250,204,21,.96), rgba(251,146,60,.92) 56%, rgba(244,63,94,.82));
          box-shadow: 0 16px 48px rgba(250,204,21,.19), inset 0 1px 0 rgba(255,255,255,.55);
          transition: transform .3s ease, box-shadow .3s ease, filter .3s ease;
        }
        .fabrick-gradient-button::after {
          content: '';
          position: absolute;
          inset: -120% auto -120% -30%;
          width: 34%;
          transform: rotate(16deg);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.72), transparent);
          animation: fabrick-button-shine 4.2s ease-in-out infinite;
          pointer-events: none;
        }
        .fabrick-gradient-button:hover {
          transform: translateY(-3px);
          filter: saturate(1.08) brightness(1.04);
          box-shadow: 0 22px 62px rgba(250,204,21,.27), inset 0 1px 0 rgba(255,255,255,.65);
        }
        @keyframes fabrick-button-shine {
          0%, 58% { left: -38%; opacity: 0; }
          64% { opacity: .85; }
          82%, 100% { left: 118%; opacity: 0; }
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
          [data-parallax] { transform: none !important; }
          .fabrick-glass {
            backdrop-filter: blur(13px);
            -webkit-backdrop-filter: blur(13px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            scroll-behavior: auto !important;
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
          [data-reveal], [data-reveal-group] > * {
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>
    </>
  );
}
