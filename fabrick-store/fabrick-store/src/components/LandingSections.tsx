'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TiendaSection from './TiendaSection';
import FabrickLogo from './FabrickLogo';
import {
  Hammer, Home, Droplet, Layers, PaintRoller, ShieldCheck, Package,
  Droplets, Lightbulb, Cpu, Warehouse, Armchair, Fingerprint, ArrowRight,
  Star, MapPin,
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
  { Icon: Hammer,     title: 'Cimientos',     desc: 'Bases sólidas y nivelación precisa para la integridad estructural.', img: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop' },
  { Icon: Home,       title: 'Estructuras',   desc: 'Armado seguro y milimétrico en acero y Metalcon D90/D60.', img: 'https://images.unsplash.com/photo-1536895058696-a69b1c7ba34d?q=80&w=800&auto=format&fit=crop' },
  { Icon: Droplet,    title: 'Gasfitería',    desc: 'Termofusión PPR y redes de cobre seguras certificadas NSF.', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop' },
  { Icon: Layers,     title: 'Revestimiento', desc: 'Aislación térmica, acústica y preparación de superficies.', img: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=800&auto=format&fit=crop' },
  { Icon: PaintRoller,title: 'Pintura',       desc: 'Terminaciones finas, sellado y paletas de alta durabilidad.', img: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop' },
  { Icon: ShieldCheck,title: 'Seguridad',     desc: 'CCTV, domótica y controles de acceso inteligentes.', img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop' },
  { Icon: Package,    title: 'Suministro',    desc: 'Materiales de primera mano. Calidad sin sobrecostos de intermediarios.', img: 'https://images.unsplash.com/photo-1504307651254-35680f356f12?q=80&w=800&auto=format&fit=crop', wide: true },
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
  { n: 'Juan P.', type: 'Remodelación Total', t: 'No tuve que coordinar a ningún maestro ni buscar materiales; Fabrick se encargó desde el hormigón hasta la grifería. Mi casa parece de revista y el proceso fue cero estrés.' },
  { n: 'María S.', type: 'Seguridad & Accesos', t: 'Lo que más valoro es la transparencia. Me entregaron un cronograma estricto y lo cumplieron al pie de la letra. La automatización y los acabados son de un nivel superior.' },
  { n: 'José V.', type: 'Construcción Estructural', t: 'Como ingeniero, soy sumamente exigente. Al ver la precisión con la que trabajan el Metalcon y saber que estoy respaldado por un Seguro Sísmico, supe que mi inversión estaba segura.' },
];

/* ════════════════════════════════════════════════════════════
   COMPONENTE
════════════════════════════════════════════════════════════ */
export default function LandingSections() {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [trajProgress, setTrajProgress] = useState(0);

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
            duration: 2200,
            easing: 'easeOutExpo',
            update() { counterEl.textContent = `${obj.val}`; },
          });
        });
      }, { threshold: 0.4 });
      obs.observe(counterEl);
    }

    return () => ctx.revert();
  }, []);

  /* ── Trajectory loop (20s, 10fps updates) ── */
  useEffect(() => {
    let raf: number;
    let last = 0;
    const start = Date.now();
    const DURATION = 20000;
    const animate = () => {
      const now = Date.now();
      if (now - last > 100) {
        last = now;
        const p = ((now - start) % DURATION) / DURATION * 100;
        setTrajProgress(p);
        if (progressBarRef.current) progressBarRef.current.style.height = `${p}%`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="bg-black text-white overflow-x-hidden">

      {/* ══ SERVICIOS ════════════════════════════════════════ */}
      <section id="servicios" className="py-24 md:py-36 px-4 md:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24 animate-on-scroll">
            <span className="text-yellow-400 font-medium tracking-[0.4em] text-[10px] uppercase block mb-3">
              El Ciclo 360°
            </span>
            <h2 className="text-3xl md:text-5xl font-light uppercase tracking-tighter text-white/90">
              Integración <span className="font-bold text-yellow-400">Total</span>
            </h2>
            <p className="text-zinc-400 text-sm tracking-widest uppercase max-w-xl mx-auto mt-3">
              Cada área de su hogar bajo el control de expertos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {SERVICIOS.map(({ Icon, title, desc, img, wide }, i) => (
              <div
                key={i}
                className={`service-card group relative rounded-[1.5rem] md:rounded-[2rem] border border-white/10 overflow-hidden flex flex-col items-start justify-end min-h-[280px] ${wide ? 'sm:col-span-2 xl:col-span-2' : ''}`}
              >
                <div className="absolute inset-0 z-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={title} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25 group-hover:via-black/60 transition-all duration-500" />
                </div>
                <div className="relative z-10 p-6 md:p-8 w-full">
                  <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 group-hover:-translate-y-2 transition-transform duration-500">
                    <Icon className="w-5 h-5 text-white group-hover:text-yellow-400 transition-colors duration-500" />
                  </div>
                  <h3 className="font-bold uppercase text-sm mb-1.5 tracking-wide text-white">{title}</h3>
                  <p className="text-[10px] md:text-xs text-zinc-300 font-light leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ EVOLUCIÓN ════════════════════════════════════════ */}
      <section id="evolucion" className="py-24 md:py-36 px-4 md:px-12 bg-zinc-950 border-y border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 md:mb-24 animate-on-scroll">
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
          </div>

          <div className="relative flex flex-row items-stretch gap-6 md:gap-16 pt-4 animate-on-scroll">
            {/* Barra de progreso — amarillo/negro premium */}
            <div className="w-2 md:w-3 flex-shrink-0 traj-track relative overflow-hidden ml-2 md:ml-0">
              <div
                ref={progressBarRef}
                className="traj-fill absolute top-0 left-0 w-full"
                style={{ height: '0%' }}
              />
            </div>

            {/* Fases */}
            <div className="flex-1 flex flex-col justify-between gap-8 md:gap-14 py-2">
              {TRAJECTORY.map((step, i) => {
                const threshold = (i / TRAJECTORY.length) * 100;
                const isActive  = trajProgress >= threshold;
                const isLast    = i === TRAJECTORY.length - 1;

                if (isLast && isActive) {
                  return (
                    <div key={i} className="flex flex-col items-start md:items-center text-left md:text-center mt-6 gap-5">
                      {/* Ícono + badge separados — sin posición absoluta superpuesta */}
                      <div className="flex flex-col items-start md:items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 bg-yellow-400 blur-[40px] opacity-30 rounded-full" />
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-black border-2 border-yellow-400/60 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(250,204,21,0.35)]">
                            <ShieldCheck className="w-9 h-9 md:w-11 md:h-11 text-yellow-400" />
                          </div>
                        </div>
                        {/* Badge debajo del círculo, nunca encima del texto */}
                        <span className="inline-flex items-center gap-1.5 bg-yellow-400 text-black font-black uppercase text-[8px] tracking-[0.22em] px-4 py-1.5 rounded-full">
                          ★ Calidad Total
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold uppercase text-xl md:text-3xl text-white mb-2 tracking-tight leading-tight">
                          Empresa Sólida y Confiable
                        </h3>
                        <p className="text-[10px] md:text-sm tracking-widest uppercase leading-relaxed max-w-2xl text-zinc-400 font-light">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    className={`flex flex-col transition-all duration-500 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-25 -translate-x-3'}`}
                  >
                    <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isActive ? 'text-yellow-400' : 'text-zinc-600'}`}>
                      Fase 0{i + 1}
                    </span>
                    <h3 className={`font-medium uppercase text-lg md:text-2xl mb-1 ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                      {step.role}
                    </h3>
                    <p className={`text-[9px] md:text-xs font-light leading-relaxed max-w-xl ${isActive ? 'text-zinc-400' : 'text-zinc-700'}`}>
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
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
          <div className="text-center mb-16 md:mb-24 animate-on-scroll">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light uppercase tracking-tighter leading-none">
              Construimos su tranquilidad,
              <br /><span className="font-bold text-yellow-400">ladrillo a ladrillo.</span>
            </h2>
            <p className="mt-6 text-zinc-400 max-w-3xl mx-auto text-sm md:text-lg leading-relaxed font-light">
              En Soluciones Fabrick eliminamos la incertidumbre. Gestionamos todo el proceso
              para que usted solo disfrute del resultado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5 animate-on-scroll">
            {[
              { t: 'Respaldo Real de 5 Años', d: 'Conocemos el rigor técnico con el que trabajamos. Si algo necesita ajuste, estaremos ahí. Su tranquilidad está asegurada a largo plazo.' },
              { t: 'Cuentas Claras, Confianza Plena', d: 'Sin sorpresas a mitad de camino. Comunicación humana y transparente para que sepa qué sucede en todo momento.' },
            ].map(({ t, d }) => (
              <div key={t} className="bg-zinc-950/80 backdrop-blur-md p-8 md:p-10 rounded-[2rem] border border-white/5 hover:border-yellow-400/20 transition-colors">
                <h3 className="text-white font-medium uppercase tracking-widest text-xs md:text-sm mb-3">{t}</h3>
                <p className="text-zinc-400 font-light text-xs md:text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 animate-on-scroll">
            <div className="bg-zinc-950/80 backdrop-blur-md p-6 md:p-8 rounded-[2rem] border border-white/5">
              <h3 className="text-white font-medium uppercase tracking-wider text-xs mb-2">Cariño por el Detalle</h3>
              <p className="text-zinc-500 font-light text-[10px] md:text-xs leading-relaxed">Pequeños rincones bien terminados son los que transforman una casa en un verdadero hogar.</p>
            </div>
            <div className="bg-zinc-950/80 backdrop-blur-md p-6 md:p-8 rounded-[2rem] border border-white/5">
              <h3 className="text-white font-medium uppercase tracking-wider text-xs mb-2">Su Esencia</h3>
              <p className="text-zinc-500 font-light text-[10px] md:text-xs leading-relaxed">Adaptamos cada espacio para que refleje fielmente la personalidad y estilo de su familia.</p>
            </div>
            <div className="bg-yellow-400 p-6 md:p-8 rounded-[2rem] text-black">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                <h3 className="font-bold uppercase tracking-wider text-[10px] md:text-sm">Protegiendo lo Importante</h3>
              </div>
              <p className="text-black/80 font-medium text-[10px] md:text-xs leading-relaxed">
                Seguro de Reparación ante Sismos. Porque lo más valioso no es la estructura, sino quienes viven dentro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TIENDA ════════════════════════════════════════════ */}
      <section id="tienda" className="py-24 md:py-36 px-4 md:px-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20 animate-on-scroll">
            <span className="text-yellow-400 font-bold tracking-[0.5em] text-[10px] uppercase">Selección Exclusiva</span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mt-3">
              Insumos de <span className="text-zinc-600">Autor</span>
            </h2>
            <p className="mt-5 text-zinc-400 max-w-2xl mx-auto text-sm md:text-base font-light leading-relaxed">
              No construimos con lo básico. Proveemos materiales de grado arquitectónico que transforman
              un simple espacio en una obra maestra.
            </p>
          </div>

          {/* Categorías */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-12 animate-on-scroll">
            {PRODUCTOS.map(({ Icon, t, d }, i) => (
              <div
                key={i}
                className="relative p-5 md:p-7 rounded-[1.5rem] bg-zinc-950/80 border border-white/5 hover:border-yellow-400/40 hover:bg-zinc-900 transition-all duration-500 group"
              >
                <div className="store-icon-wrapper w-14 h-14 md:w-16 md:h-16 mx-auto bg-black rounded-full flex items-center justify-center border border-white/10 mb-4 group-hover:border-yellow-400 transition-colors group-hover:shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-zinc-400 group-hover:text-yellow-400 transition-colors duration-500" />
                </div>
                <h4 className="font-black text-xs uppercase tracking-wider mb-1.5 text-white group-hover:text-yellow-400 transition-colors text-center">{t}</h4>
                <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest leading-relaxed text-center">{d}</p>
              </div>
            ))}
          </div>

          {/* Productos reales desde InsForge */}
        <div className="animate-on-scroll">
          <TiendaSection />
        </div>
          <div className="text-center mt-10 animate-on-scroll">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/tienda"
                className="px-12 py-5 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.2em] rounded-full hover:bg-white transition-all hover:scale-105 shadow-[0_10px_30px_rgba(250,204,21,0.2)] inline-flex items-center gap-4 group"
              >
                Explorar Catalogo Completo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link
                href="/sync"
                className="px-8 py-5 border border-yellow-400/30 text-yellow-400 text-xs uppercase tracking-[0.2em] rounded-full hover:bg-yellow-400/10 transition-all"
              >
                Panel Sync
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PROYECTOS / REVIEWS ══════════════════════════════ */}
      <section id="proyectos" className="py-24 md:py-36 px-4 md:px-12 bg-zinc-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 md:mb-20 animate-on-scroll">
            <span className="text-yellow-400 font-bold tracking-[0.5em] text-[10px] uppercase">Garantía Comprobada</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mt-3 mb-3">
              Resultados <span className="text-zinc-600">Innegables</span>
            </h2>
            <div className="w-14 h-1 bg-yellow-400 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {REVIEWS.map((rev, i) => (
              <div
                key={i}
                className="review-card bg-black p-8 md:p-10 rounded-[2rem] border border-white/5 hover:border-yellow-400/30 transition-colors relative"
              >
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-zinc-300 text-xs md:text-sm leading-relaxed mb-8 font-light">"{rev.t}"</p>
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
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTACTO ═════════════════════════════════════════ */}
      <section id="contacto" className="py-24 md:py-36 px-4 md:px-12 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="animate-on-scroll space-y-8">
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
            {/* Mapa */}
            <div className="w-full h-52 md:h-72 bg-zinc-900 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop" alt="Mapa Santiago" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-black/40" />
              <div className="w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center relative z-10 mb-3 shadow-[0_0_20px_rgba(250,204,21,0.4)] animate-pulse">
                <MapPin className="w-7 h-7 text-black" />
              </div>
              <span className="relative z-10 font-bold text-xs tracking-[0.25em] uppercase text-white">
                Oficina Central · Santiago
              </span>
            </div>
          </div>

          <div className="bg-zinc-950 p-7 md:p-12 rounded-[2rem] border border-white/5 animate-on-scroll">
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
                className="w-full py-5 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-white transition-all hover:scale-[1.02] active:scale-95 glow-pulse"
              >
                Solicitar Evaluación
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════ */}
      <footer className="bg-black py-10 md:py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Logo */}
          <FabrickLogo className="pointer-events-none" />

          <div className="text-center">
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-1">
              Soluciones Integrales para el Hogar Moderno.
            </p>
            <p className="text-zinc-700 text-[9px] uppercase tracking-widest">
              © {new Date().getFullYear()} Soluciones Fabrick. Todos los derechos reservados.
            </p>
          </div>

          {/* Redes sociales */}
          <div className="flex gap-4 items-center">
            {[
              { Icon: MetaIcon,      href: '#' },
              { Icon: TikTokIcon,    href: '#' },
              { Icon: InstagramIcon, href: '#' },
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
      </footer>

    </div>
  );
}




