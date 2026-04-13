'use client';

import { useRef, useEffect } from 'react';

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx: any;
    const init = async () => {
      const gsap = (await import('gsap')).default;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.from('.hero-badge', { y: 30, opacity: 0, duration: 0.8 })
          .from('.hero-title span', { y: 60, opacity: 0, duration: 1, stagger: 0.15 }, '-=0.4')
          .from('.hero-subtitle', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
          .from('.hero-divider', { scaleX: 0, duration: 0.8 }, '-=0.4')
          .from('.hero-cta', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3')
          .from('.hero-deco', { opacity: 0, scale: 0.8, duration: 1, stagger: 0.2 }, '-=0.8');
      }, heroRef);
    };
    init();
    return () => ctx?.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black"
    >
      {/* Decorative elements */}
      <div className="hero-deco absolute top-20 left-10 w-72 h-72 rounded-full bg-yellow-400/5 blur-3xl pointer-events-none" />
      <div className="hero-deco absolute bottom-20 right-10 w-96 h-96 rounded-full bg-yellow-400/5 blur-3xl pointer-events-none" />
      <div className="hero-deco absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-yellow-400/10 rounded-full pointer-events-none" />
      <div className="hero-deco absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-yellow-400/5 rounded-full pointer-events-none" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(250,204,21,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 mb-8 border border-yellow-400/20 rounded-full bg-yellow-400/5 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-yellow-400 glow-pulse" />
          <span className="text-xs uppercase tracking-[0.25em] text-yellow-400/80 font-medium">
            Experiencia Inmersiva Fabrick
          </span>
        </div>

        <h1 className="hero-title font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] mb-6">
          <span className="block">Soluciones</span>
          <span className="block shimmer-gold">Completas</span>
        </h1>

        <div className="hero-divider w-24 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-8 origin-center" />

        <p className="hero-subtitle text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
          Desde el inicio hasta el final.{' '}
          <span className="text-white font-normal">Un solo equipo.</span>{' '}
          <span className="text-yellow-400/90">Un solo estándar.</span>
        </p>

        <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <a
            href="#servicios"
            className="group relative px-8 py-4 bg-yellow-400 text-black font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(250,204,21,0.3)]"
          >
            <span className="relative z-10 uppercase tracking-wider text-sm">
              Explorar Servicios
            </span>
            <div className="absolute inset-0 bg-yellow-300 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
          <a
            href="#tienda"
            className="px-8 py-4 border border-yellow-400/30 text-yellow-400 font-semibold rounded-full transition-all duration-300 hover:bg-yellow-400/10 hover:border-yellow-400/60 uppercase tracking-wider text-sm"
          >
            Ver Tienda
          </a>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
