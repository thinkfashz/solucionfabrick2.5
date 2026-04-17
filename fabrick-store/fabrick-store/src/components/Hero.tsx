'use client';

import { useRef, useEffect } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

/* Genera partículas doradas flotantes con anime.js */
function spawnParticles(container: HTMLElement) {
  import('animejs').then(({ default: anime }) => {
    for (let i = 0; i < 18; i++) {
      const dot = document.createElement('div');
      const size = Math.random() * 4 + 2;
      dot.style.cssText = `
        position:absolute;
        width:${size}px; height:${size}px;
        border-radius:50%;
        background:rgba(250,204,21,${Math.random() * 0.5 + 0.15});
        top:${Math.random() * 100}%;
        left:${Math.random() * 100}%;
        pointer-events:none;
        will-change:transform,opacity;
      `;
      container.appendChild(dot);

      anime({
        targets: dot,
        translateY: [{ value: -(Math.random() * 120 + 60) }],
        translateX: [{ value: (Math.random() - 0.5) * 80 }],
        opacity: [{ value: 0.8, duration: 400 }, { value: 0, duration: 1200 }],
        scale: [{ value: 1.4, duration: 600 }, { value: 0.3, duration: 800 }],
        duration: Math.random() * 2000 + 2000,
        delay: Math.random() * 4000,
        loop: true,
        easing: 'easeOutQuad',
      });
    }
  });
}

export default function Hero() {
  const heroRef    = useRef<HTMLDivElement>(null);
  const particleRef = useRef<HTMLDivElement>(null);

  /* framer-motion parallax on scroll */
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, -120]);
  const glowY = useTransform(scrollY, [0, 600], [0, -60]);

  /* GSAP timeline – entrada principal */
  useEffect(() => {
    let ctx: any;
    const init = async () => {
      const gsap = (await import('gsap')).default;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        /* Anillos decorativos: escala desde 0 con rotation */
        tl.from('.hero-ring', {
          scale: 0,
          opacity: 0,
          rotation: -45,
          duration: 1.4,
          stagger: 0.25,
          ease: 'elastic.out(1,0.6)',
        })
          /* Badge desliza desde arriba */
          .from('.hero-badge', { y: -40, opacity: 0, duration: 0.7 }, '-=0.8')

          /* Cada línea del título: clip-path curtain wipe */
          .fromTo(
            '.hero-title-line',
            { clipPath: 'inset(0 100% 0 0)', opacity: 0, x: -20 },
            { clipPath: 'inset(0 0% 0 0)', opacity: 1, x: 0, duration: 0.9, stagger: 0.18 },
            '-=0.3',
          )

          /* Subtítulo fade + blur */
          .fromTo(
            '.hero-subtitle',
            { opacity: 0, filter: 'blur(8px)', y: 20 },
            { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.9 },
            '-=0.4',
          )

          /* Línea divisoria */
          .from('.hero-divider', { scaleX: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.5')

          /* CTAs con stagger */
          .from('.hero-cta-item', { y: 24, opacity: 0, duration: 0.6, stagger: 0.14 }, '-=0.4');

        /* Pulso permanente en los anillos */
        gsap.to('.hero-ring', {
          scale: '+=0.04',
          opacity: '-=0.08',
          duration: 3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 0.6,
        });

        /* Glows de fondo: movimiento suave */
        gsap.to('.hero-glow', {
          y: -30,
          x: 20,
          duration: 6,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: 1.5,
        });
      }, heroRef);
    };
    init();
    return () => ctx?.revert();
  }, []);

  /* anime.js – partículas flotantes */
  useEffect(() => {
    if (particleRef.current) spawnParticles(particleRef.current);
  }, []);

  return (
    <section
      id="inicio"
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black"
    >
      {/* Parallax background layer */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ y: bgY }}
      >
        {/* Grid de fondo */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(250,204,21,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </motion.div>

      {/* Partículas */}
      <div ref={particleRef} className="absolute inset-0 pointer-events-none z-0 overflow-hidden" />

      {/* Glows de fondo – parallax suave */}
      <motion.div style={{ y: glowY }} className="absolute inset-0 pointer-events-none z-0">
        <div className="hero-glow absolute top-20 left-10 w-72 h-72 rounded-full bg-yellow-400/5 blur-3xl" />
        <div className="hero-glow absolute bottom-20 right-10 w-96 h-96 rounded-full bg-yellow-400/6 blur-3xl" />
      </motion.div>

      {/* Anillos decorativos */}
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-yellow-400/8 rounded-full pointer-events-none" />
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] border border-yellow-400/12 rounded-full pointer-events-none" />
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] border border-yellow-400/6 rounded-full pointer-events-none" />

      {/* Contenido */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 mb-8 border border-yellow-400/20 rounded-full bg-yellow-400/5 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-yellow-400 glow-pulse" />
          <span className="text-xs uppercase tracking-[0.25em] text-yellow-400/80 font-medium">
            Experiencia Inmersiva Fabrick
          </span>
        </div>

        {/* Título – cada línea animada independiente */}
        <h1 className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] mb-6 overflow-hidden">
          <span className="hero-title-line block">Soluciones</span>
          <span className="hero-title-line block shimmer-gold">Completas</span>
        </h1>

        <div className="hero-divider w-24 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-8 origin-center" />

        <p className="hero-subtitle text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
          Desde el inicio hasta el final.{' '}
          <span className="text-white font-normal">Un solo equipo.</span>{' '}
          <span className="text-yellow-400/90">Un solo estándar.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <a
            href="/#servicios"
            className="hero-cta-item btn-shimmer group relative px-8 py-4 bg-yellow-400 text-black font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(250,204,21,0.4)]"
          >
            <span className="relative z-10 uppercase tracking-wider text-sm">Explorar Servicios</span>
            <div className="absolute inset-0 bg-yellow-300 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a
            href="/tienda"
            className="hero-cta-item px-8 py-4 border border-yellow-400/30 text-yellow-400 font-semibold rounded-full transition-all duration-300 hover:bg-yellow-400/10 hover:border-yellow-400/60 uppercase tracking-wider text-sm"
          >
            Ir a Tienda
          </a>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}

