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

function shouldUseNativeScroll() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(hover: none)').matches
    || window.innerWidth < 900
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function SmoothScrollProvider() {
  const [gsapReady, setGsapReady] = useState(false);
  const [scrollTriggerReady, setScrollTriggerReady] = useState(false);
  const [lenisReady, setLenisReady] = useState(false);
  const lenisRef = useRef<LenisInstance | null>(null);

  useEffect(() => {
    if (shouldUseNativeScroll()) return;

    let frame = 0;
    let active = true;

    const init = async () => {
      const Lenis = (await import('lenis')).default;
      if (!active) return;

      const lenis = new Lenis({
        duration: 1,
        smoothWheel: true,
        wheelMultiplier: 0.86,
        infinite: false,
      }) as LenisInstance;

      lenisRef.current = lenis;
      setLenisReady(true);

      const raf = (time: number) => {
        lenis.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
    };

    void init();

    return () => {
      active = false;
      setLenisReady(false);
      if (frame) cancelAnimationFrame(frame);
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
          { autoAlpha: 0, y: desktop ? 30 : 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: desktop ? 0.72 : 0.52,
            delay,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 90%', once: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
        const children = Array.from(group.children);
        if (!children.length) return;
        gsap.fromTo(
          children,
          { autoAlpha: 0, y: 22 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.58,
            stagger: 0.06,
            ease: 'power3.out',
            scrollTrigger: { trigger: group, start: 'top 88%', once: true },
          },
        );
      });

      if (desktop) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
          const amount = Number(element.dataset.parallax || -8);
          gsap.to(element, {
            yPercent: amount,
            ease: 'none',
            scrollTrigger: {
              trigger: element.closest('section') || element,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1,
            },
          });
        });
      }
    });

    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 160);
    return () => {
      window.clearTimeout(refreshId);
      context.revert();
    };
  }, [gsapReady, scrollTriggerReady]);

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

      <style>{`
        html, body {
          overflow-x: hidden;
          overscroll-behavior-y: auto;
          touch-action: pan-y pinch-zoom;
          -webkit-overflow-scrolling: touch;
        }
        section, footer { scroll-margin-top: 88px; }
        [data-reveal], [data-reveal-group] > * {
          backface-visibility: hidden;
          transform: translateZ(0);
        }
        .fabrick-glass {
          border: 1px solid rgba(255,255,255,.1);
          background: linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
          box-shadow: 0 24px 70px rgba(0,0,0,.24);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .fabrick-gradient-button {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(254,240,138,.36);
          background: linear-gradient(112deg, #fde047, #fb923c 64%, #fb7185);
          box-shadow: 0 14px 38px rgba(250,204,21,.18);
          transition: transform .25s ease, box-shadow .25s ease, filter .25s ease;
        }
        .fabrick-gradient-button:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
          box-shadow: 0 18px 48px rgba(250,204,21,.24);
        }
        @media (hover: none), (pointer: coarse), (max-width: 899px) {
          [data-parallax] { transform: none !important; }
          .fabrick-glass {
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
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
          }
        }
      `}</style>
    </>
  );
}
