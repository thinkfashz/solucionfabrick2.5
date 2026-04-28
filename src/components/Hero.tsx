'use client';

/* eslint-disable @next/next/no-img-element */

import { useRef, useEffect } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=90&w=2400&auto=format&fit=crop';

export default function Hero() {
  const heroRef  = useRef<HTMLDivElement>(null);

  /* Parallax on scroll */
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, 140]);

  /* GSAP text entrance */
  useEffect(() => {
    let ctx: ReturnType<typeof import('gsap')['default']['context']> | undefined;
    const init = async () => {
      const gsap = (await import('gsap')).default;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        tl.from('.hero-badge',    { y: -40, opacity: 0, duration: 0.7 })
          .fromTo(
            '.hero-title-line',
            { clipPath: 'inset(0 100% 0 0)', opacity: 0, x: -20 },
            { clipPath: 'inset(0 0% 0 0)',   opacity: 1, x:  0, duration: 0.9, stagger: 0.18 },
            '-=0.3',
          )
          .fromTo(
            '.hero-subtitle',
            { opacity: 0, filter: 'blur(8px)', y: 20 },
            { opacity: 1, filter: 'blur(0px)', y:  0, duration: 0.9 },
            '-=0.4',
          )
          .from('.hero-divider',  { scaleX: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.5')
          .from('.hero-cta-item', { y: 24, opacity: 0, duration: 0.6, stagger: 0.14 }, '-=0.4');
      }, heroRef);
    };
    init();
    return () => ctx?.revert();
  }, []);

  return (
    <section
      id="inicio"
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black"
    >
      {/* ── Background image with parallax ── */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: bgY, scale: 1.12 }}
      >
        <img
          src={HERO_IMAGE}
          alt="Casa moderna metalcon — Soluciones Fabrick, construcción y remodelación en la Región del Maule"
          className="w-full h-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
        />
      </motion.div>

      {/* ── Overlays: oscurecer para legibilidad ── */}
      {/* Capa base oscura */}
      <div className="absolute inset-0 z-[1] bg-black/52" />
      {/* Gradiente inferior negro total */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/40 to-transparent" />
      {/* Gradiente lateral suave */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/30 via-transparent to-black/25" />
      {/* Viñeta superior para que el Navbar se integre */}
      <div className="absolute top-0 left-0 right-0 h-40 z-[1] bg-gradient-to-b from-black/70 to-transparent" />

      {/* ── Acento dorado atmosférico ── */}
      <div
        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[180px] pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse, rgba(250,204,21,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* ── Contenido ── */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">

        {/* Badge */}
        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 mb-5 border border-yellow-400/30 rounded-full bg-black/40 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-yellow-400 ping-gold" />
          <span className="text-xs uppercase tracking-[0.25em] text-yellow-400/90 font-medium">
            Un equipo · un estándar · una obra completa
          </span>
        </div>

        {/* Trust bar */}
        <div className="mx-auto mb-8 flex max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full border border-yellow-400/15 bg-black/50 backdrop-blur-sm px-4 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-yellow-400/90 md:text-[11px]">
          <span className="inline-flex items-center gap-1.5">✓ Evaluación gratuita</span>
          <span className="text-yellow-400/30">·</span>
          <span className="inline-flex items-center gap-1.5">✓ Presupuesto en 24h</span>
          <span className="text-yellow-400/30">·</span>
          <span className="inline-flex items-center gap-1.5">✓ Sin compromiso</span>
        </div>

        {/* Título */}
        <h1 className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] mb-6 overflow-hidden">
          <span className="hero-title-line block">Tu Visión,</span>
          <span
            className="hero-title-line block shimmer-gold"
            style={{ textShadow: '0 0 40px rgba(250,204,21,0.35), 0 0 80px rgba(250,204,21,0.15)' }}
          >
            Nuestra Obra
          </span>
        </h1>

        <div className="hero-divider w-24 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-8 origin-center" />

        <p className="hero-subtitle text-lg sm:text-xl md:text-2xl text-zinc-300 max-w-2xl mx-auto leading-relaxed font-light">
          Desde el inicio hasta el final.{' '}
          <span className="text-white font-normal">Un solo equipo.</span>{' '}
          <span className="text-yellow-400/90">Un solo estándar.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <a
            href="/#servicios"
            className="hero-cta-item btn-shimmer group relative px-8 py-4 min-h-[44px] bg-yellow-400 text-black font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(250,204,21,0.55),0_0_80px_rgba(250,204,21,0.2)] btn-sweep"
          >
            <span className="relative z-10 uppercase tracking-wider text-sm">Explorar Servicios</span>
            <div className="absolute inset-0 bg-yellow-300 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a
            href="/tienda"
            className="hero-cta-item flex items-center justify-center min-h-[44px] px-8 py-4 border border-yellow-400/40 text-yellow-400 font-semibold rounded-full backdrop-blur-sm bg-black/20 transition-all duration-300 hover:bg-yellow-400/10 hover:border-yellow-400/70 hover:shadow-[0_0_20px_rgba(250,204,21,0.2)] uppercase tracking-wider text-sm"
          >
            Ir a Tienda
          </a>
        </div>
      </div>

      {/* Fade inferior hacia el resto de la página */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent z-[2]" />

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-50">
        <span className="text-[9px] uppercase tracking-[0.3em] text-white/60">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-yellow-400/60 to-transparent animate-pulse" />
      </div>
    </section>
  );
}
