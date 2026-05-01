'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TiendaSection from './TiendaSection';
import FabrickLogo from './FabrickLogo';
import ContactMap from './ContactMap';
import ScrollReveal, { ScrollRevealGroup, ScrollRevealItem } from './ScrollReveal';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  Hammer, Home, Droplet, Layers, PaintRoller, ShieldCheck, Package,
  Droplets, Lightbulb, Cpu, Warehouse, Armchair, Fingerprint, ArrowRight,
  Star, ShoppingBag, Sparkles, Award, TrendingUp, MessageSquare, Gamepad2,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ── Iconos redes ──────────────────────────────────────────── */
const MetaIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

/* ── Datos ─────────────────────────────────────────────────── */
const TRAJECTORY = [
  { role: 'Ayudante General',    desc: 'Forjando el carácter desde el nivel más duro de la obra.' },
  { role: 'Maestro de Segunda',  desc: 'Dominio de herramientas y primeras directrices técnicas.' },
  { role: 'Maestro de Primera',  desc: 'Ejecución de Metalcon y acabados con precisión milimétrica.' },
  { role: 'Líder de Proyectos',  desc: 'Coordinación de equipos y control estricto de calidad.' },
  { role: 'Contratista',         desc: 'Gestión autónoma de obras residenciales.' },
  { role: 'Ecosistema Fabrick',  desc: 'Empresa sólida y confiable con garantía de excelencia comprobada.' },
];

const SERVICIOS = [
  { Icon: Hammer,     title: 'Cimientos',     href: '/servicios/cimientos',     desc: 'Bases sólidas y nivelación precisa para la integridad estructural.', img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop' },
  { Icon: Home,       title: 'Estructuras',   href: '/servicios/metalcon',      desc: 'Armado seguro y milimétrico en acero y Metalcon D90/D60.', img: 'https://images.unsplash.com/photo-1503594384566-461fe158e797?q=80&w=800&auto=format&fit=crop' },
  { Icon: Droplet,    title: 'Gasfitería',    href: '/servicios/gasfiteria',    desc: 'Termofusión PPR y redes de cobre seguras certificadas NSF.', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop' },
  { Icon: Layers,     title: 'Revestimiento', href: '/servicios/revestimiento', desc: 'Aislación térmica, acústica y preparación de superficies.', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800&auto=format&fit=crop' },
  { Icon: PaintRoller,title: 'Pintura',       href: '/servicios/pintura',       desc: 'Terminaciones finas, sellado y paletas de alta durabilidad.', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop' },
  { Icon: ShieldCheck,title: 'Seguridad',     href: '/servicios/seguridad',     desc: 'CCTV, domótica y controles de acceso inteligentes.', img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop' },
  { Icon: Package,    title: 'Materiales Seleccionados', href: '/tienda', desc: 'Cada material usado en tu obra es elegido por nuestros especialistas e instalado por nuestro equipo. Sin intermediarios.', img: 'https://images.unsplash.com/photo-1504307651254-35680f356f12?q=80&w=800&auto=format&fit=crop', wide: true },
];

const PRODUCTOS = [
  { Icon: Droplets,    t: 'Grifería & Bañería',  d: 'Diseño europeo con tecnología de ahorro.' },
  { Icon: Lightbulb,   t: 'Iluminación Smart',    d: 'Sistemas LED regulables y WiFi.' },
  { Icon: Layers,      t: 'Superficies & Pisos',  d: 'Porcelanatos y maderas nobles.' },
  { Icon: PaintRoller, t: 'Revestimientos',        d: 'Paneles y pinturas de grado arquitectónico.' },
  { Icon: Cpu,         t: 'Domótica',              d: 'Control de clima y sensores.' },
  { Icon: Warehouse,   t: 'Accesos Blindados',     d: 'Portones motorizados de acero.' },
  { Icon: Armchair,    t: 'Mobiliario a Medida',   d: 'Diseño en melamina premium.' },
  { Icon: Fingerprint, t: 'Seguridad Biométrica',  d: 'Cerraduras digitales sin llaves.' },
];

const REVIEWS = [
  { n: 'Juan P.', type: 'Ampliación en Longaví', t: 'No tuve que coordinar a ningún maestro ni buscar materiales; Fabrick se encargó desde el hormigón hasta la grifería. Mi casa parece de revista y el proceso fue cero estrés.' },
  { n: 'María S.', type: 'Remodelación en Talca', t: 'Lo que más valoro es la transparencia. Me entregaron un cronograma estricto y lo cumplieron al pie de la letra. La automatización y los acabados son de un nivel superior.' },
  { n: 'José V.', type: 'Obra estructural en Linares', t: 'Como ingeniero, soy sumamente exigente. Al ver la precisión con la que trabajan el Metalcon y saber que estoy respaldado por una garantía estructural, supe que mi inversión estaba segura.' },
];

const NAV_CARDS = [
  { href: '/tienda',     Icon: ShoppingBag,   title: 'Boutique',    desc: 'Materiales y productos premium' },
  { href: '/soluciones', Icon: Sparkles,       title: 'Soluciones',  desc: 'Servicios integrales' },
  { href: '/proyectos',  Icon: Award,          title: 'Proyectos',   desc: 'Resultados comprobados' },
  { href: '/evolucion',  Icon: TrendingUp,     title: 'Evolución',   desc: '8 años de experiencia' },
  { href: '/contacto',   Icon: MessageSquare,  title: 'Contacto',    desc: 'Inicia tu proyecto hoy' },
  { href: '/garantias',  Icon: ShieldCheck,    title: 'Garantías',   desc: 'Tu tranquilidad asegurada' },
  { href: '/juego',      Icon: Gamepad2,        title: 'Juego',       desc: 'Constructor de bloques' },
];

/* ════════════════════════════════════════════════════════════
   COMPONENTE
════════════════════════════════════════════════════════════ */
export default function LandingSections({
  copyrightText,
  socialLinks,
}: { copyrightText?: string; socialLinks?: { facebook?: string; instagram?: string; tiktok?: string } } = {}) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const copyrightHtml = (copyrightText && copyrightText.trim())
    ? copyrightText.replaceAll('{year}', String(new Date().getFullYear()))
    : `© ${new Date().getFullYear()} Soluciones Fabrick · Todos los derechos reservados`;
  const fbHref = socialLinks?.facebook?.trim() || '#';
  const igHref = socialLinks?.instagram?.trim() || '#';
  const ttHref = socialLinks?.tiktok?.trim() || '#';

  /* ── GSAP + anime.js scroll animations ── */
  useEffect(() => {
    const ctx = gsap.context(() => {

      /* Reveal genérico con fade + slide */
      document.querySelectorAll<HTMLElement>('.animate-on-scroll').forEach((el) => {
        gsap.fromTo(el,
          { y: 50, opacity: 0, filter: 'blur(4px)' },
          {
            y: 0, opacity: 1, filter: 'blur(0px)',
            duration: 1.1, ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });

      /* Tarjetas de servicio: efecto cascada desde abajo */
      gsap.utils.toArray<HTMLElement>('.service-card').forEach((card, i) => {
        gsap.fromTo(card,
          { y: 70, opacity: 0, scale: 0.93, rotateX: 6 },
          {
            y: 0, opacity: 1, scale: 1, rotateX: 0,
            duration: 0.9, ease: 'power3.out',
            delay: i * 0.07,
            scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' },
          }
        );
      });

      /* Reviews: slide desde los lados */
      gsap.utils.toArray<HTMLElement>('.review-card').forEach((card, i) => {
        const dir = i % 2 === 0 ? -60 : 60;
        gsap.fromTo(card,
          { x: dir, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' },
          }
        );
      });

      /* Iconos de tienda: levitación suave con GSAP */
      gsap.to('.store-icon-wrapper', {
        y: -10, duration: 2.2, repeat: -1, yoyo: true,
        ease: 'sine.inOut', stagger: 0.18,
      });

      /* Línea de división: expand desde centro */
      gsap.utils.toArray<HTMLElement>('.divider-line').forEach((el) => {
        gsap.fromTo(el,
          { scaleX: 0, opacity: 0 },
          {
            scaleX: 1, opacity: 1, duration: 1.2, ease: 'power2.inOut',
            scrollTrigger: { trigger: el, start: 'top 90%' },
          }
        );
      });

      /* Nav cards: staggered entry */
      gsap.utils.toArray<HTMLElement>('.nav-card').forEach((card, i) => {
        gsap.fromTo(card,
          { y: 40, opacity: 0, scale: 0.92 },
          {
            y: 0, opacity: 1, scale: 1,
            duration: 0.75, ease: 'power3.out',
            delay: i * 0.08,
            scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' },
          }
        );
      });

      /* Progress bar: scroll-triggered */
      if (progressBarRef.current) {
        gsap.fromTo(progressBarRef.current,
          { height: '0%' },
          {
            height: '100%',
            ease: 'none',
            scrollTrigger: {
              trigger: '#evolucion',
              start: 'top 70%',
              end: 'bottom 25%',
              scrub: 1.5,
            },
          }
        );
      }

      /* Trajectory steps: scroll-triggered reveal */
      gsap.set('.traj-step', { opacity: 0, x: -20 });
      gsap.utils.toArray<HTMLElement>('.traj-step').forEach((step) => {
        gsap.to(step, {
          opacity: 1, x: 0,
          duration: 0.8, ease: 'power2.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 87%',
            toggleActions: 'play none none reverse',
          },
        });
      });
    });

    /* anime.js – contador "8 Años" (se activa por IntersectionObserver) */
    const counterEl = document.querySelector<HTMLElement>('.traj-counter');
    if (counterEl) {
      const obs = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        import('animejs').then(({ default: anime }) => {
          const obj = { val: 0 };
          anime({
            targets: obj,
            val: 8,
            round: 1,
            duration: 4200,
            easing: 'easeOutQuart',
            update() { counterEl.textContent = `${obj.val}`; },
          });
        });
      }, { threshold: 0.4 });
      obs.observe(counterEl);
    }

    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-black text-white overflow-x-hidden">

      {/* ══ NAVEGACIÓN ══════════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-4 md:px-12 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14 animate-on-scroll">
            <span className="text-yellow-400 font-medium tracking-[0.4em] text-[10px] uppercase block mb-3">
              Explora Fabrick
            </span>
            <h2 className="text-2xl md:text-4xl font-light uppercase tracking-tighter text-white/90">
              Todo lo que <span className="font-bold text-yellow-400">necesitas</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {NAV_CARDS.map(({ href, Icon, title, desc }, i) => (
              <Link
                key={i}
                href={href}
                className="nav-card group relative rounded-[2rem] border border-white/8 bg-zinc-950/80 backdrop-blur-md p-5 md:p-6 flex flex-col items-center text-center gap-3 hover:border-yellow-400/40 hover:bg-zinc-900/80 transition-all duration-500 hover:shadow-[0_0_30px_rgba(250,204,21,0.08)] cursor-pointer"
              >
                {/* Icon container */}
                <div className="w-14 h-14 rounded-full bg-black border border-white/10 flex items-center justify-center group-hover:border-yellow-400/60 group-hover:shadow-[0_0_20px_rgba(250,204,21,0.25)] transition-all duration-500 flex-shrink-0">
                  <Icon className="w-6 h-6 text-zinc-400 group-hover:text-yellow-400 transition-colors duration-500" />
                </div>
                {/* Text */}
                <div>
                  <h3 className="font-bold uppercase text-xs tracking-wider text-white group-hover:text-yellow-400 transition-colors duration-300 mb-1">
                    {title}
                  </h3>
                  <p className="text-[9px] text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors duration-300">
                    {desc}
                  </p>
                </div>
                {/* Arrow */}
                <ArrowRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all duration-300 mt-auto" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SERVICIOS ════════════════════════════════════════ */}
      <section id="servicios" className="py-24 md:py-36 px-4 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-16 md:mb-24">
            <span className="text-yellow-400 font-medium tracking-[0.4em] text-[10px] uppercase block mb-3">
              El Ciclo 360°
            </span>
            <h2 className="text-3xl md:text-5xl font-light uppercase tracking-tighter text-white/90">
              Integración <span className="font-bold text-yellow-400">Total</span>
            </h2>
            <p className="text-zinc-400 text-sm tracking-widest uppercase max-w-xl mx-auto mt-3">
              Cada área de su hogar bajo el control de expertos.
            </p>
          </ScrollReveal>

          <ScrollRevealGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5" stagger={0.09}>
            {SERVICIOS.map(({ Icon, title, desc, img, wide, href }, i) => (
              <ScrollRevealItem key={i} className={wide ? 'sm:col-span-2 xl:col-span-2' : ''}>
                <Link href={href} className="block h-full">
                <div
                  className="service-card service-card-premium service-card-hover group relative rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col items-start justify-end min-h-[280px] cursor-pointer"
                >
                  {/* Semi-transparent phase number background */}
                  <span
                    aria-hidden="true"
                    className="absolute top-4 right-5 font-playfair font-bold leading-none select-none pointer-events-none z-[1]"
                    style={{
                      fontSize: 'clamp(4rem, 10vw, 7rem)',
                      color: 'rgba(250,204,21,0.07)',
                      lineHeight: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="absolute inset-0 z-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={title}
                      className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-1000"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback gracioso si una URL externa de la imagen
                        // queda 404. Usa un degradado oscuro para que la
                        // tarjeta no se vea totalmente negra y se preserve
                        // la composición.
                        const el = e.currentTarget;
                        if (el.dataset.fallback === '1') return;
                        el.dataset.fallback = '1';
                        el.src =
                          'data:image/svg+xml;utf8,' +
                          encodeURIComponent(
                            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
                              <defs>
                                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0" stop-color="#1a1410"/>
                                  <stop offset="1" stop-color="#000"/>
                                </linearGradient>
                              </defs>
                              <rect width="800" height="600" fill="url(#g)"/>
                              <g fill="none" stroke="#c9a96e" stroke-width="2" opacity="0.35">
                                <path d="M 100,500 L 100,300 L 250,200 L 400,300 L 400,500 Z"/>
                                <path d="M 400,500 L 400,250 L 600,150 L 800,250 L 800,500"/>
                              </g>
                            </svg>`,
                          );
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25 group-hover:via-black/60 transition-all duration-500" />
                  </div>
                  <div className="relative z-10 p-6 md:p-8 w-full">
                    <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 group-hover:-translate-y-2 transition-transform duration-500">
                      <Icon className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-500" />
                    </div>
                    <h3 className="font-bold uppercase text-sm mb-1.5 tracking-wide text-white">{title}</h3>
                    <p className="text-[10px] md:text-xs text-zinc-300 font-light leading-relaxed">{desc}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-yellow-400/60 group-hover:text-yellow-400 transition-colors duration-300">
                      Ver más <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
                </Link>
              </ScrollRevealItem>
            ))}
          </ScrollRevealGroup>
        </div>
      </section>

      {/* ══ EVOLUCIÓN ════════════════════════════════════════ */}
      <section id="evolucion" className="py-24 md:py-36 px-4 md:px-12 bg-zinc-950 border-y border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-16 md:mb-24">
            <span className="text-yellow-400 font-medium tracking-[0.4em] text-[10px] uppercase border-b border-yellow-400/30 pb-2">
              El Camino de la Autoridad
            </span>
            <h2 className="text-4xl md:text-6xl font-light uppercase tracking-tighter mt-6 mb-6">
              <span className="font-bold text-yellow-400"><span className="traj-counter">8</span> Años</span> de Evolución
            </h2>
            <p className="text-zinc-400 max-w-3xl mx-auto text-xs md:text-base font-light leading-relaxed">
              Nuestra experiencia no es teórica. Años dominando el terreno, perfeccionando desde el cimiento
              más profundo hasta convertirnos en una empresa capaz de gestionar todo el ciclo vital de tu hogar.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1} className="relative pt-4 max-w-3xl mx-auto">
            {/* Línea central del timeline (rail) */}
            <div className="pointer-events-none absolute left-5 md:left-1/2 top-2 bottom-2 w-[2px] md:-translate-x-1/2 bg-gradient-to-b from-white/5 via-white/10 to-white/5 rounded-full" />

            {/* Barra de progreso rellenando el rail */}
            <div className="pointer-events-none absolute left-5 md:left-1/2 top-2 w-[2px] md:-translate-x-1/2 rounded-full overflow-hidden" style={{ bottom: '0.5rem' }}>
              <div
                ref={progressBarRef}
                className="w-full rounded-full"
                style={{
                  height: '0%',
                  background: 'linear-gradient(to bottom, #facc15, #f97316)',
                  boxShadow: '0 0 16px rgba(250,204,21,0.7), 0 0 40px rgba(250,204,21,0.35)',
                }}
              />
            </div>

            {/* Fases */}
            <div className="relative flex flex-col gap-10 md:gap-16">
              {TRAJECTORY.map((step, i) => {
                const isLast = i === TRAJECTORY.length - 1;

                if (isLast) {
                  return (
                    <div key={i} className="traj-step relative flex flex-col items-center text-center pt-6">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-yellow-400 blur-[40px] opacity-25 rounded-full" />
                        <div className="w-20 h-20 md:w-28 md:h-28 bg-black border border-yellow-400/50 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                          <span
                            className="font-playfair font-black text-yellow-400 leading-none select-none"
                            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '-0.04em' }}
                            aria-label="Fabrick Certificación"
                          >
                            F
                          </span>
                        </div>
                      </div>
                      <div className="mb-8 bg-yellow-400 text-black font-bold uppercase text-[9px] tracking-widest px-4 py-1 rounded-full whitespace-nowrap inline-block">
                        Calidad Total
                      </div>
                      <h3 className="font-bold uppercase text-xl md:text-3xl text-white mb-2 tracking-tight">
                        Empresa Sólida y Confiable
                      </h3>
                      <p className="text-xs md:text-sm tracking-widest uppercase leading-relaxed max-w-2xl text-zinc-400 font-light">
                        {step.desc}
                      </p>
                    </div>
                  );
                }

                // Alternar lados en desktop; en móvil siempre a la derecha del rail
                const isRight = i % 2 === 1;

                return (
                  <div
                    key={i}
                    className="traj-step relative md:grid md:grid-cols-2 md:gap-10 items-center"
                  >
                    {/* Dot del timeline */}
                    <span
                      aria-hidden="true"
                      className="absolute left-5 md:left-1/2 top-2 w-3 h-3 -translate-x-1/2 rounded-full bg-black border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)] z-10"
                    />

                    {/* Contenido de la fase */}
                    <div
                      className={`pl-12 md:pl-0 ${
                        isRight
                          ? 'md:col-start-2 md:pl-12 md:text-left'
                          : 'md:col-start-1 md:pr-12 md:text-right'
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-400/70 block mb-1">
                        Fase 0{i + 1}
                      </span>
                      <h3 className="font-medium uppercase text-lg md:text-2xl mb-1 text-white">
                        {step.role}
                      </h3>
                      <p className="text-[10px] md:text-xs font-light leading-relaxed text-zinc-400">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══ SOLUCIONES ═══════════════════════════════════════ */}
      <section id="soluciones" className="py-24 md:py-36 px-4 md:px-12 bg-black relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2000&auto=format&fit=crop" alt="" className="w-full h-full object-cover opacity-8" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black" />
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <ScrollReveal className="text-center mb-16 md:mb-24">
            <span className="text-yellow-400 font-bold tracking-[0.5em] text-[10px] uppercase">
              Soluciones Fabrick · Linares, Maule
            </span>
            <h2 className="mt-3 text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-[0.95]">
              Construimos su tranquilidad,
              <br /><span className="text-yellow-400">ladrillo a ladrillo.</span>
            </h2>
            <p className="mt-6 text-zinc-300 max-w-3xl mx-auto text-sm md:text-lg leading-relaxed font-light">
              En Soluciones Fabrick eliminamos la incertidumbre. Gestionamos todo el proceso
              para que usted solo disfrute del resultado.
            </p>
          </ScrollReveal>

          <ScrollRevealGroup className="grid md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5" stagger={0.12}>
            {[
              { t: 'Respaldo Real de 5 Años', d: 'Conocemos el rigor técnico con el que trabajamos. Si algo necesita ajuste, estaremos ahí. Su tranquilidad está asegurada a largo plazo.' },
              { t: 'Cuentas Claras, Confianza Plena', d: 'Sin sorpresas a mitad de camino. Comunicación humana y transparente para que sepa qué sucede en todo momento.' },
            ].map(({ t, d }) => (
              <ScrollRevealItem key={t}>
                <div className="bg-zinc-950/80 backdrop-blur-md p-8 md:p-10 rounded-[2rem] border border-white/5 hover:border-yellow-400/20 transition-colors text-center md:text-left">
                  <h3 className="text-white font-medium uppercase tracking-widest text-xs md:text-sm mb-3">{t}</h3>
                  <p className="text-zinc-400 font-light text-xs md:text-sm leading-relaxed">{d}</p>
                </div>
              </ScrollRevealItem>
            ))}
          </ScrollRevealGroup>

          <ScrollRevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5" stagger={0.1}>
            <ScrollRevealItem>
              <div className="bg-zinc-950/80 backdrop-blur-md p-6 md:p-8 rounded-[2rem] border border-white/5 text-center md:text-left">
                <h3 className="text-white font-medium uppercase tracking-wider text-xs mb-2">Cariño por el Detalle</h3>
                <p className="text-zinc-500 font-light text-[10px] md:text-xs leading-relaxed">Pequeños rincones bien terminados son los que transforman una casa en un verdadero hogar.</p>
              </div>
            </ScrollRevealItem>
            <ScrollRevealItem>
              <div className="bg-zinc-950/80 backdrop-blur-md p-6 md:p-8 rounded-[2rem] border border-white/5 text-center md:text-left">
                <h3 className="text-white font-medium uppercase tracking-wider text-xs mb-2">Su Esencia</h3>
                <p className="text-zinc-500 font-light text-[10px] md:text-xs leading-relaxed">Adaptamos cada espacio para que refleje fielmente la personalidad y estilo de su familia.</p>
              </div>
            </ScrollRevealItem>
            <ScrollRevealItem>
              <div className="bg-yellow-400 p-6 md:p-8 rounded-[2rem] text-black text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                  <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                  <h3 className="font-bold uppercase tracking-wider text-[10px] md:text-sm">Protegiendo lo Importante</h3>
                </div>
                <p className="text-black/80 font-medium text-[10px] md:text-xs leading-relaxed">
                  Seguro de Reparación ante Sismos. Porque lo más valioso no es la estructura, sino quienes viven dentro.
                </p>
              </div>
            </ScrollRevealItem>
          </ScrollRevealGroup>

          {/* ── CTA: agendar visita en terreno (Linares / Maule) ── */}
          <ScrollReveal delay={0.15} className="mt-10 md:mt-14">
            <div className="rounded-[2rem] border border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 via-yellow-400/5 to-transparent p-8 md:p-12 backdrop-blur-md">
              <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                <div className="text-center md:text-left">
                  <span className="text-yellow-400 font-bold tracking-[0.4em] text-[10px] uppercase">
                    Visita gratuita en terreno
                  </span>
                  <h3 className="mt-3 text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-tight">
                    Vamos a su propiedad,<br className="hidden md:inline" /> medimos y armamos su presupuesto.
                  </h3>
                  <p className="mt-3 text-zinc-300 text-sm md:text-base leading-relaxed max-w-2xl">
                    Atendemos en Linares y toda la Región del Maule. Sin oficinas físicas y sin costo
                    por la visita: nuestros técnicos llegan, toman las medidas y conversan con usted
                    en su espacio para que el presupuesto sea fiel a la realidad.
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:min-w-[16rem]">
                  <a
                    href={buildWhatsAppLink('Hola Soluciones Fabrick, quiero agendar una visita en Linares (Región del Maule) para que pasen a evaluar mi proyecto y armar el presupuesto.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 rounded-full bg-yellow-400 px-7 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black shadow-yellow-md transition hover:bg-yellow-300"
                  >
                    Agendar por WhatsApp
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <Link
                    href="/contacto"
                    className="flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-200 transition hover:border-yellow-400/40 hover:text-yellow-400"
                  >
                    Formulario de contacto
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══ TIENDA ════════════════════════════════════════════ */}
      <section id="tienda" className="py-24 md:py-36 px-4 md:px-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-16 md:mb-20">
            <span className="text-yellow-400 font-bold tracking-[0.5em] text-[10px] uppercase">Selección Exclusiva</span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mt-3">
              Insumos de <span className="text-zinc-600">Autor</span>
            </h2>
            <p className="mt-5 text-zinc-400 max-w-2xl mx-auto text-sm md:text-base font-light leading-relaxed">
              No construimos con lo básico. Proveemos materiales de grado arquitectónico que transforman
              un simple espacio en una obra maestra.
            </p>
          </ScrollReveal>

          {/* Categorías */}
          <ScrollRevealGroup className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-12" stagger={0.08}>
            {PRODUCTOS.map(({ Icon, t, d }, i) => (
              <ScrollRevealItem key={i}>
                <Link
                  href="/tienda"
                  className="relative flex flex-col items-center p-5 md:p-7 rounded-[1.5rem] bg-zinc-950/80 border border-white/5 hover:border-yellow-400/40 hover:bg-zinc-900 transition-all duration-500 group h-full"
                >
                  <div className="store-icon-wrapper w-14 h-14 md:w-16 md:h-16 mx-auto bg-black rounded-full flex items-center justify-center border border-white/10 mb-4 group-hover:border-yellow-400 transition-colors group-hover:shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                    <Icon className="w-7 h-7 md:w-8 md:h-8 text-zinc-400 group-hover:text-yellow-400 transition-colors duration-500" />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-wider mb-1.5 text-white group-hover:text-yellow-400 transition-colors text-center">{t}</h4>
                  <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed text-center mb-4">{d}</p>
                  <span aria-label={`Acceder a ${t}`} className="mt-auto inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-yellow-400/30 text-yellow-400 text-[9px] uppercase tracking-widest font-bold group-hover:bg-yellow-400 group-hover:text-black group-hover:border-yellow-400 transition-all duration-300">
                    Acceder <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </ScrollRevealItem>
            ))}
          </ScrollRevealGroup>

          {/* Productos reales desde InsForge */}
          <ScrollReveal>
            <TiendaSection />
          </ScrollReveal>
        </div>
      </section>

      {/* ══ PROYECTOS / REVIEWS ══════════════════════════════ */}
      <section id="proyectos" className="py-24 md:py-36 px-4 md:px-12 bg-zinc-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal className="text-center mb-14 md:mb-20">
            <span className="text-yellow-400 font-bold tracking-[0.5em] text-[10px] uppercase">Garantía Comprobada</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mt-3 mb-3">
              Resultados <span className="text-zinc-600">Innegables</span>
            </h2>
            <div className="w-14 h-1 bg-yellow-400 mx-auto rounded-full" />
          </ScrollReveal>

          <ScrollRevealGroup className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6" stagger={0.12}>
            {REVIEWS.map((rev, i) => (
              <ScrollRevealItem key={i} direction={i % 2 === 0 ? 'left' : 'right'}>
                <div
                  className="review-card bg-black p-8 md:p-10 rounded-[2rem] border border-white/5 hover:border-yellow-400/30 transition-colors relative"
                >
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-zinc-300 text-xs md:text-sm leading-relaxed mb-8 font-light">&ldquo;{rev.t}&rdquo;</p>
                  <div className="flex items-center gap-3 border-t border-white/5 pt-5">
                    <div className="w-11 h-11 rounded-full border border-yellow-400/30 flex items-center justify-center font-black text-yellow-400 text-base bg-zinc-900 flex-shrink-0">
                      {rev.n.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider">{rev.n}</h4>
                      <span className="text-[9px] text-yellow-400 uppercase tracking-widest">{rev.type}</span>
                    </div>
                  </div>
                </div>
              </ScrollRevealItem>
            ))}
          </ScrollRevealGroup>
        </div>
      </section>

      {/* ══ CONTACTO ═════════════════════════════════════════ */}
      <section id="contacto" className="py-24 md:py-36 px-4 md:px-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <ScrollReveal className="space-y-8">
            <div>
              <span className="text-yellow-400 font-bold tracking-[0.4em] text-[10px] uppercase">Contacto Directo</span>
              <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter mt-3 leading-none">
                Inicie su <br /><span className="text-zinc-600">Proyecto</span>
              </h2>
              <p className="text-zinc-400 mt-5 text-sm md:text-lg font-light leading-relaxed max-w-md">
                Nuestros ingenieros y arquitectos están listos para auditar su espacio y diseñar
                una solución definitiva.
              </p>
            </div>
            {/* Mapa interactivo · Linares (OpenStreetMap) */}
            <ContactMap
              className="w-full h-52 md:h-72"
              title="Linares · Región del Maule"
              subtitle="Atendemos en terreno en toda la región"
            />
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="bg-zinc-950 p-7 md:p-12 rounded-[2rem] border border-white/5">
            <form action="/api/presupuesto" method="POST" className="space-y-6">
              {[
                { label: 'Nombre Completo',    name: 'nombre', type: 'text',  ph: 'Ej. Juan Pérez' },
                { label: 'Email de Contacto',  name: 'email',  type: 'email', ph: 'correo@ejemplo.com' },
                { label: 'Teléfono',           name: 'telefono', type: 'tel', ph: '+56 9 0000 0000' },
              ].map(({ label, name, type, ph }) => (
                <div key={name} className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 ml-1">{label}</label>
                  <input
                    type={type} name={name} placeholder={ph}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 md:p-5 text-sm focus:outline-none focus:border-yellow-400 transition-colors text-white placeholder:text-zinc-700"
                  />
                </div>
              ))}
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500 ml-1">Detalles del Requerimiento</label>
                <textarea
                  name="descripcion" rows={4} placeholder="Cuéntanos sobre tu proyecto..."
                  className="w-full bg-black border border-white/10 rounded-2xl p-4 md:p-5 text-sm focus:outline-none focus:border-yellow-400 transition-colors text-white resize-none placeholder:text-zinc-700"
                />
              </div>
              <button
                type="submit"
                className="btn-shimmer w-full py-5 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-white transition-all hover:scale-[1.02] active:scale-95 glow-pulse"
              >
                Solicitar Evaluación
              </button>
            </form>
          </ScrollReveal>
        </div>
      </section>

      {/* ══ FOOTER EMOCIONAL ══════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-white/5">
        {/* Casa de ensueño */}
        <div className="relative h-[55vh] md:h-[65vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop"
            alt="Casa de ensueño Fabrick"
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 md:pb-20 px-6 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-light text-white mb-4 max-w-3xl leading-tight drop-shadow-2xl">
              Tu hogar es más que{' '}
              <span className="font-bold text-yellow-400">cuatro paredes.</span>
            </h2>
            <p className="text-zinc-300 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed font-light drop-shadow-lg">
              Es el lugar donde tu familia ríe, descansa y sueña. Merecen un espacio construido con amor, precisión
              y el compromiso de quienes realmente saben lo que hacen. En Fabrick, cada ladrillo que colocamos
              lleva la promesa de que tu tranquilidad siempre valdrá más que cualquier costo.
            </p>
          </div>

          {/* Golden separator */}
          <div
            className="divider-line mb-10 md:mb-14 origin-center"
            style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.6) 30%, rgba(250,204,21,0.8) 50%, rgba(201,169,110,0.6) 70%, transparent 100%)',
            }}
          />

          {/* Bottom row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Logo */}
            <FabrickLogo className="pointer-events-none" />

            {/* Nav links */}
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {[
                { label: 'Servicios',  href: '/servicios' },
                { label: 'Evolución',  href: '/evolucion' },
                { label: 'Soluciones', href: '/soluciones' },
                { label: 'Tienda',     href: '/tienda' },
                { label: 'Proyectos',  href: '/proyectos' },
                { label: 'Contacto',   href: '/contacto' },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500 hover:text-yellow-400 transition-colors duration-300 min-h-[44px] flex items-center touch-target"
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Social icons */}
            <div className="flex gap-4 items-center">
              {[
                { Icon: MetaIcon,      href: fbHref },
                { Icon: TikTokIcon,    href: ttHref },
                { Icon: InstagramIcon, href: igHref },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i} href={href}
                  className="relative group w-11 h-11 flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-yellow-400 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                  <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-transparent transition-colors" />
                  <div className="relative z-10 text-zinc-400 group-hover:text-black transition-colors">
                    <Icon />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <p className="text-center text-zinc-700 text-[9px] uppercase tracking-[0.35em] mt-10 font-light">
            {copyrightHtml}
          </p>
        </div>

        {/* Footer bottom bar */}
        <footer className="bg-black py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col items-center gap-8">
            <FabrickLogo className="pointer-events-none" />

            {/* CTA */}
            <Link
              href="/contacto"
              className="btn-watercolor px-10 py-4 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.2em] rounded-full hover:bg-white transition-all hover:scale-105 shadow-[0_10px_30px_rgba(250,204,21,0.3)] inline-flex items-center gap-3 group"
            >
              Comienza tu proyecto
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Redes sociales */}
            <div className="flex gap-4 items-center">
              {[
                { Icon: MetaIcon,      href: fbHref, label: 'Facebook' },
                { Icon: TikTokIcon,    href: ttHref, label: 'TikTok' },
                { Icon: InstagramIcon, href: igHref, label: 'Instagram' },
              ].map(({ Icon, href, label }, i) => (
                <a
                  key={i} href={href} aria-label={label}
                  className="relative group w-11 h-11 flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-yellow-400 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                  <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-transparent transition-colors" />
                  <div className="relative z-10 text-zinc-400 group-hover:text-black transition-colors">
                    <Icon />
                  </div>
                </a>
              ))}
            </div>

            <div className="text-center space-y-1">
              <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                Soluciones Integrales para el Hogar Moderno.
              </p>
              <p className="text-zinc-700 text-[9px] uppercase tracking-widest">
                {copyrightHtml}
              </p>
            </div>
          </div>
        </footer>
      </section>

    </div>
  );
}
