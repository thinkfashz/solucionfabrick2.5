'use client';

import { useRef, useEffect } from 'react';

/* Partículas doradas con anime.js */
function spawnParticles(container: HTMLElement) {
  import('animejs').then(({ default: anime }) => {
    for (let i = 0; i < 20; i++) {
      const dot = document.createElement('div');
      const size = Math.random() * 5 + 2;
      dot.style.cssText = `
        position:absolute; width:${size}px; height:${size}px;
        border-radius:50%; pointer-events:none; will-change:transform,opacity;
        background:rgba(250,204,21,${Math.random() * 0.5 + 0.15});
        top:${Math.random() * 100}%; left:${Math.random() * 100}%;
      `;
      container.appendChild(dot);
      anime({
        targets: dot,
        translateY: [{ value: -(Math.random() * 120 + 60) }],
        translateX: [{ value: (Math.random() - 0.5) * 80 }],
        opacity: [{ value: 0.9, duration: 400 }, { value: 0, duration: 1400 }],
        scale:   [{ value: 1.6, duration: 600 }, { value: 0.2, duration: 800 }],
        duration: Math.random() * 2400 + 2000,
        delay:    Math.random() * 5000,
        loop:     true,
        easing:   'easeOutQuad',
      });
    }
  });
}

/* Anima el trazo SVG de plano arquitectónico con anime.js */
function animateBlueprintLines(svg: SVGSVGElement) {
  import('animejs').then(({ default: anime }) => {
    const paths = svg.querySelectorAll<SVGPathElement | SVGRectElement>('.bp-line');
    paths.forEach((el) => {
      const len = (el as SVGGeometryElement).getTotalLength?.() ?? 200;
      (el as SVGElement).style.strokeDasharray  = String(len);
      (el as SVGElement).style.strokeDashoffset = String(len);
    });
    anime({
      targets: '.bp-line',
      strokeDashoffset: [anime.stagger([200, 0], { from: 'center' }), 0],
      duration: 3500,
      delay: anime.stagger(180),
      easing: 'easeInOutQuart',
      loop: false,
    });
  });
}

export default function Hero() {
  const heroRef      = useRef<HTMLDivElement>(null);
  const particleRef  = useRef<HTMLDivElement>(null);
  const blueprintRef = useRef<SVGSVGElement>(null);

  /* GSAP — entrada cinematográfica */
  useEffect(() => {
    let ctx: any;
    const init = async () => {
      const gsap = (await import('gsap')).default;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        tl.from('.hero-ring', {
          scale: 0, opacity: 0, rotation: -30, duration: 1.5,
          stagger: 0.28, ease: 'elastic.out(1,0.55)',
        })
          .from('.hero-badge',      { y: -36, opacity: 0, duration: 0.7 },              '-=0.95')
          .fromTo('.hero-title-line',
            { clipPath: 'inset(0 100% 0 0)', opacity: 0, x: -16 },
            { clipPath: 'inset(0 0% 0 0)',   opacity: 1, x: 0, duration: 1, stagger: 0.22 },
            '-=0.4',
          )
          .fromTo('.hero-subtitle',
            { opacity: 0, filter: 'blur(10px)', y: 24 },
            { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.95 },
            '-=0.55',
          )
          .from('.hero-divider',  { scaleX: 0, duration: 0.8, ease: 'power2.inOut' }, '-=0.6')
          .from('.hero-cta-item', { y: 26, opacity: 0, duration: 0.6, stagger: 0.16 }, '-=0.4')
          .from('.hero-stat',     { y: 14, opacity: 0, duration: 0.5, stagger: 0.12 }, '-=0.35');

        /* Anillos pulsantes permanentes */
        gsap.to('.hero-ring', {
          scale: '+=0.035', opacity: '-=0.07', duration: 3.2,
          repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.8,
        });

        /* Glows parallax suave */
        gsap.to('.hero-glow', {
          y: -28, x: 18, duration: 6.5, repeat: -1, yoyo: true,
          ease: 'sine.inOut', stagger: 1.8,
        });

        /* Vigas de metalcón flotando — movimiento vertical suave */
        gsap.to('.metal-beam', {
          y: -8, duration: 3, repeat: -1, yoyo: true,
          ease: 'sine.inOut', stagger: 0.4,
        });
      }, heroRef);
    };
    init();
    return () => ctx?.revert();
  }, []);

  /* anime.js — partículas + trazo de plano */
  useEffect(() => {
    if (particleRef.current)  spawnParticles(particleRef.current);
    if (blueprintRef.current) animateBlueprintLines(blueprintRef.current);
  }, []);

  return (
    <section
      id="inicio"
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* ── Imagen de fondo: casa moderna ── */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=90&w=2000&auto=format&fit=crop"
          alt="Casa moderna Fabrick"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />
      </div>

      {/* ── SVG Plano arquitectónico animado (fondo decorativo) ── */}
      <svg
        ref={blueprintRef}
        viewBox="0 0 800 500"
        className="absolute inset-0 w-full h-full pointer-events-none z-[1] opacity-[0.07]"
        aria-hidden="true"
        fill="none"
        stroke="#facc15"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        {/* Planta de casa esquemática */}
        <rect className="bp-line" x="100" y="80"  width="280" height="200" />
        <rect className="bp-line" x="160" y="130" width="80"  height="100" />
        <rect className="bp-line" x="280" y="130" width="70"  height="60"  />
        <path className="bp-line" d="M100 80 L240 20 L380 80" />
        <line className="bp-line" x1="240" y1="20"  x2="240" y2="80"  />
        <line className="bp-line" x1="160" y1="230" x2="160" y2="280" />
        {/* Líneas de cota */}
        <line className="bp-line" x1="100" y1="310" x2="380" y2="310" strokeDasharray="6 4" />
        <line className="bp-line" x1="60"  y1="80"  x2="60"  y2="280" strokeDasharray="6 4" />
        {/* Estructura metalcón (columnas) */}
        <line className="bp-line" x1="480" y1="60"  x2="480" y2="380" />
        <line className="bp-line" x1="560" y1="60"  x2="560" y2="380" />
        <line className="bp-line" x1="640" y1="60"  x2="640" y2="380" />
        <line className="bp-line" x1="720" y1="60"  x2="720" y2="380" />
        <line className="bp-line" x1="460" y1="140" x2="740" y2="140" />
        <line className="bp-line" x1="460" y1="220" x2="740" y2="220" />
        <line className="bp-line" x1="460" y1="300" x2="740" y2="300" />
        {/* Viga diagonal */}
        <line className="bp-line" x1="480" y1="140" x2="560" y2="220" />
        <line className="bp-line" x1="560" y1="140" x2="640" y2="220" />
        <line className="bp-line" x1="640" y1="140" x2="720" y2="220" />
      </svg>

      {/* ── Vigas de metalcón decorativas (SVG fijas) ── */}
      <div className="absolute left-4 top-1/4 opacity-[0.06] pointer-events-none z-[1]">
        <svg width="24" height="220" viewBox="0 0 24 220" fill="none" aria-hidden="true">
          {[0,44,88,132,176].map((y) => (
            <rect key={y} className="metal-beam" x="0" y={y} width="24" height="36" rx="2"
              fill="#facc15" />
          ))}
        </svg>
      </div>
      <div className="absolute right-6 top-1/3 opacity-[0.06] pointer-events-none z-[1]">
        <svg width="24" height="180" viewBox="0 0 24 180" fill="none" aria-hidden="true">
          {[0,60,120].map((y) => (
            <rect key={y} className="metal-beam" x="0" y={y} width="24" height="50" rx="2"
              fill="#facc15" />
          ))}
        </svg>
      </div>

      {/* Partículas */}
      <div ref={particleRef} className="absolute inset-0 pointer-events-none z-[2] overflow-hidden" />

      {/* Glows */}
      <div className="hero-glow absolute top-16 left-8 w-64 h-64 rounded-full bg-yellow-400/8 blur-3xl pointer-events-none z-[1]" />
      <div className="hero-glow absolute bottom-16 right-8 w-80 h-80 rounded-full bg-yellow-400/6 blur-3xl pointer-events-none z-[1]" />

      {/* Anillos */}
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] border border-yellow-400/8  rounded-full pointer-events-none z-[1]" />
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[490px] h-[490px] border border-yellow-400/12 rounded-full pointer-events-none z-[1]" />
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[310px] h-[310px] border border-yellow-400/6  rounded-full pointer-events-none z-[1]" />

      {/* ── Contenido ── */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">

        {/* Badge */}
        <div className="hero-badge inline-flex items-center gap-2.5 px-5 py-2.5 mb-8 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(250,204,21,0.25)',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-yellow-400 ping-gold-dot" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-yellow-400/90 font-semibold">
            Ingeniería Residencial · 8 Años de Excelencia
          </span>
        </div>

        {/* Título — copy construcción */}
        <h1 className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-[82px] font-bold text-white leading-[1.05] mb-6 overflow-hidden">
          <span className="hero-title-line block">Construimos tu</span>
          <span className="hero-title-line block shimmer-gold">Sueño en Realidad.</span>
        </h1>

        <div className="hero-divider w-28 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-8 origin-center" />

        {/* Subtítulo emocional */}
        <p className="hero-subtitle text-base sm:text-lg md:text-xl text-white/55 max-w-2xl mx-auto leading-relaxed font-light">
          Tu hogar merece lo mejor. Desde los cimientos hasta cada detalle,{' '}
          <span className="text-white font-normal">nuestro equipo de élite transforma espacios ordinarios</span>{' '}
          <span className="text-yellow-400/90">en experiencias extraordinarias.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <a
            href="/#servicios"
            className="hero-cta-item relative px-9 py-4 rounded-full text-sm font-black uppercase tracking-wider text-black overflow-hidden"
            style={{
              background: 'linear-gradient(145deg,#ffe44d,#facc15 45%,#ca8a04)',
              boxShadow: '0 6px 28px rgba(250,204,21,0.4), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            Explorar Servicios
          </a>
          <a
            href="/tienda"
            className="hero-cta-item px-9 py-4 rounded-full text-sm font-semibold uppercase tracking-wider text-yellow-400"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(250,204,21,0.3)',
            }}
          >
            Ir a Tienda
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap gap-10 justify-center">
          {[
            { n: '8+',    label: 'Años de experiencia' },
            { n: '200+',  label: 'Proyectos completados' },
            { n: '100%',  label: 'Garantía de calidad' },
          ].map(({ n, label }) => (
            <div key={label} className="hero-stat flex flex-col items-center gap-1">
              <span className="font-playfair text-2xl font-bold text-yellow-400">{n}</span>
              <span className="text-[10px] uppercase tracking-widest text-white/35">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent z-[3]" />

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/25 animate-bounce">
        <span className="text-[9px] tracking-[0.35em] uppercase">Scroll</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/25">
          <path d="M8 2v12M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </section>
  );
}
