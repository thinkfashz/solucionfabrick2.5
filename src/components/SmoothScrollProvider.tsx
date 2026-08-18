'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { useLayoutEffect, useRef } from 'react';

gsap.registerPlugin(ScrollTrigger, SplitText);

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function prefersNativeScroll() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(pointer: coarse)').matches
    || window.matchMedia('(hover: none)').matches
    || window.innerWidth < 900;
}

type Direction = 'up' | 'left' | 'right' | 'zoom';

const REVEAL_FROM: Record<Direction, gsap.TweenVars> = {
  up: { y: 28, x: 0, scale: 1 },
  left: { x: -44, y: 0, scale: 1 },
  right: { x: 44, y: 0, scale: 1 },
  zoom: { scale: 0.92, x: 0, y: 0 },
};

const GROUP_FROM: Record<Direction, gsap.TweenVars> = {
  up: { y: 26 },
  left: { x: -36 },
  right: { x: 36 },
  zoom: { scale: 0.94 },
};

function directionOf(element: HTMLElement, fallback: Direction): Direction {
  const value = element.dataset.revealDir;
  return value === 'left' || value === 'right' || value === 'zoom' || value === 'up' ? value : fallback;
}

export default function SmoothScrollProvider() {
  const lenisRef = useRef<Lenis | null>(null);
  const tickerRef = useRef<((time: number) => void) | null>(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion()) return;

    const desktop = !prefersNativeScroll();
    let lenis: Lenis | null = null;

    if (desktop) {
      lenis = new Lenis({ duration: 1.08, smoothWheel: true, wheelMultiplier: 0.9 });
      lenis.on('scroll', ScrollTrigger.update);
      const ticker = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(ticker);
      gsap.ticker.lagSmoothing(0);
      tickerRef.current = ticker;
      lenisRef.current = lenis;
    }

    const context = gsap.context(() => {
      const viewport = window.innerHeight;

      gsap.utils.toArray<HTMLElement>('[data-split]').forEach((title) => {
        if (title.getBoundingClientRect().top < viewport * 0.85) return;
        const split = SplitText.create(title, { type: 'words' });
        gsap.from(split.words, {
          yPercent: 120,
          rotateX: -55,
          autoAlpha: 0,
          transformOrigin: '0% 100%',
          stagger: 0.04,
          duration: 0.85,
          ease: 'power4.out',
          scrollTrigger: { trigger: title, start: 'top 86%', once: true },
          onComplete: () => split.revert(),
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        if (element.getBoundingClientRect().top < viewport * 0.92) return;
        const from = REVEAL_FROM[directionOf(element, 'up')];
        const delay = Number(element.dataset.revealDelay || 0);
        gsap.fromTo(element, { autoAlpha: 0, ...from }, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.75,
          delay,
          ease: 'power3.out',
          scrollTrigger: { trigger: element, start: 'top 90%', once: true },
        });
      });

      gsap.utils.toArray<HTMLElement>('[data-reveal-group]').forEach((group) => {
        if (group.getBoundingClientRect().top < viewport * 0.9) return;
        const children = Array.from(group.children);
        if (!children.length) return;
        const from = GROUP_FROM[directionOf(group, 'up')];
        gsap.fromTo(children, { autoAlpha: 0, ...from }, {
          autoAlpha: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: group, start: 'top 86%', once: true },
        });
      });

      if (desktop) {
        gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
          gsap.to(element, {
            yPercent: Number(element.dataset.parallax || -6),
            ease: 'none',
            scrollTrigger: {
              trigger: element.closest('section') || element,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
            },
          });
        });
      }
    });

    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 160);
    return () => {
      window.clearTimeout(refreshId);
      context.revert();
      if (tickerRef.current) gsap.ticker.remove(tickerRef.current);
      gsap.ticker.lagSmoothing(1.2);
      lenisRef.current?.destroy();
      lenisRef.current = null;
      tickerRef.current = null;
    };
  }, []);

  return (
    <style>{`
      html, body { overflow-x: hidden; overscroll-behavior-y: auto; touch-action: pan-y pinch-zoom; -webkit-overflow-scrolling: touch; }
      section, footer { scroll-margin-top: 88px; }
      [data-reveal], [data-reveal-group] > *, [data-split] { backface-visibility: hidden; }
      .fabrick-glass { background: linear-gradient(145deg, rgba(248,240,233,.09), rgba(248,240,233,.03)); box-shadow: 0 24px 70px rgba(0,0,0,.24); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
      .fabrick-gradient-button { position: relative; isolation: isolate; overflow: hidden; background: linear-gradient(112deg, #F5871F, #FFB000 62%, #FFF9EE); box-shadow: 0 14px 38px rgba(182,144,108,.18); transition: transform .25s ease, box-shadow .25s ease, filter .25s ease; }
      .fabrick-gradient-button:hover { transform: translateY(-2px); filter: brightness(1.03); box-shadow: 0 18px 48px rgba(182,144,108,.25); }
      @media (hover: none), (pointer: coarse), (max-width: 899px) { [data-parallax] { transform: none !important; } .fabrick-glass { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); } }
      @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; } [data-reveal], [data-reveal-group] > *, [data-split] { opacity: 1 !important; transform: none !important; } }
    `}</style>
  );
}
