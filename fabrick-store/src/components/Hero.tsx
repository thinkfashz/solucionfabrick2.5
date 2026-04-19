'use client';

import { useRef, useEffect } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';
import Link from 'next/link';

/* Canvas API – elegant golden floating particles */
function initCanvasParticles(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let animId: number;

  const resize = () => {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  type Particle = {
    x: number; y: number;
    size: number;
    speedX: number; speedY: number;
    opacity: number; opacityDir: number;
    baseR: number; baseG: number; baseB: number;
  };

  const make = (): Particle => ({
    x:          Math.random() * canvas.width,
    y:          Math.random() * canvas.height,
    size:       Math.random() * 2.2 + 0.8,
    speedX:     (Math.random() - 0.5) * 0.35,
    speedY:     -(Math.random() * 0.45 + 0.15),
    opacity:    Math.random() * 0.45 + 0.1,
    opacityDir: Math.random() > 0.5 ? 1 : -1,
    baseR:      201, baseG: 169, baseB: 110,
  });

  const particles: Particle[] = Array.from({ length: 24 }, make);

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x       += p.speedX;
      p.y       += p.speedY;
      p.opacity += p.opacityDir * 0.004;
      if (p.opacity > 0.6 || p.opacity < 0.05) p.opacityDir *= -1;
      if (p.y < -8) {
        p.y = canvas.height + 8;
        p.x = Math.random() * canvas.width;
      }
      const op    = p.opacity;
      const glow  = op * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(${p.baseR},${p.baseG},${p.baseB},${op.toFixed(3)})`;
      ctx.shadowBlur  = p.size * 4;
      ctx.shadowColor = `rgba(250,204,21,${glow.toFixed(3)})`;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }
    animId = requestAnimationFrame(tick);
  };
  tick();

  return () => { cancelAnimationFrame(animId); ro.disconnect(); };
}

export default function Hero() {
  const heroRef   = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* framer-motion parallax on scroll */
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, -120]);
  const glowY = useTransform(scrollY, [0, 600], [0, -60]);

  /* GSAP timeline – main entrance */
  useEffect(() => {
    let ctx: { revert: () => void } | undefined;
    const init = async () => {
      const gsap = (await import('gsap')).default;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

        tl.from('.hero-ring', {
          scale: 0, opacity: 0, rotation: -45,
          duration: 1.4, stagger: 0.25, ease: 'elastic.out(1,0.6)',
        })
          .from('.hero-badge',      { y: -40, opacity: 0, duration: 0.7 }, '-=0.8')
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
          .from('.hero-divider',   { scaleX: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.5')
          .from('.hero-cta-item',  { y: 24, opacity: 0, duration: 0.6, stagger: 0.14 }, '-=0.4');

        /* Subtle ring pulse */
        gsap.to('.hero-ring', {
          scale: '+=0.04', opacity: '-=0.08',
          duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.6,
        });

        /* Background glows parallax */
        gsap.to('.hero-glow', {
          y: -30, x: 20,
          duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 1.5,
        });
      }, heroRef);
    };
    init();
    return () => ctx?.revert();
  }, []);

  /* Canvas golden particles */
  useEffect(() => {
    if (!canvasRef.current) return;
    return initCanvasParticles(canvasRef.current);
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
        {/* Radial golden background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(201,169,110,0.08) 0%, rgba(250,204,21,0.03) 40%, transparent 70%)',
          }}
        />

        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(250,204,21,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </motion.div>

      {/* Canvas golden particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Background glows – parallax */}
      <motion.div style={{ y: glowY }} className="absolute inset-0 pointer-events-none z-0">
        <div className="hero-glow absolute top-20 left-10 w-72 h-72 rounded-full bg-yellow-400/5 blur-3xl" />
        <div className="hero-glow absolute bottom-20 right-10 w-96 h-96 rounded-full bg-yellow-400/6 blur-3xl" />
      </motion.div>

      {/* Decorative rings */}
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-yellow-400/8 rounded-full pointer-events-none" />
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] border border-yellow-400/12 rounded-full pointer-events-none" />
      <div className="hero-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] border border-yellow-400/6 rounded-full pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Badge with pulse animation */}
        <div className="hero-badge inline-flex items-center gap-2 px-4 py-2 mb-8 border rounded-full bg-yellow-400/8 backdrop-blur-sm hero-badge-pulse">
          <span className="w-2 h-2 rounded-full bg-yellow-400 ping-gold" />
          <span className="text-xs uppercase tracking-[0.25em] text-yellow-400/90 font-medium">
            Experiencia Inmersiva Fabrick
          </span>
        </div>

        {/* Title */}
        <h1 className="font-playfair text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] mb-6 overflow-hidden">
          <span className="hero-title-line block">Construimos tu</span>
          <span
            className="hero-title-line block shimmer-gold"
            style={{ textShadow: '0 0 40px rgba(250,204,21,0.35), 0 0 80px rgba(250,204,21,0.15)' }}
          >
            Sueño
          </span>
        </h1>

        <div className="hero-divider w-24 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto mb-8 origin-center" />

        <p className="hero-subtitle text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto leading-relaxed font-light">
          Desde el inicio hasta el final.{' '}
          <span className="text-white font-normal">Un solo equipo.</span>{' '}
          <span className="text-yellow-400/90">Un solo estándar.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link
            href="/#servicios"
            className="hero-cta-item btn-shimmer group relative px-8 py-4 min-h-[44px] bg-yellow-400 text-black font-semibold rounded-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(250,204,21,0.55),0_0_80px_rgba(250,204,21,0.2)] btn-sweep"
          >
            <span className="relative z-10 uppercase tracking-wider text-sm">Explorar Servicios</span>
            <div className="absolute inset-0 bg-yellow-300 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Link>
          <Link
            href="/tienda"
            className="hero-cta-item flex items-center justify-center min-h-[44px] px-8 py-4 border border-yellow-400/30 text-yellow-400 font-semibold rounded-full transition-all duration-300 hover:bg-yellow-400/10 hover:border-yellow-400/60 hover:shadow-[0_0_20px_rgba(250,204,21,0.2)] uppercase tracking-wider text-sm"
          >
            Ir a Tienda
          </Link>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
