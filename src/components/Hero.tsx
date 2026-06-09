'use client';

/**
 * Hero — Rediseño editorial. Layout izquierdo + barra de stats.
 * Título y subtítulo editables desde /admin/home.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, Clock, Users2, TrendingUp, MessageCircle,
} from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

// Casa en Metalcon en construcción — estructura de acero galvanizado en obra
// gruesa, perfectamente reconocible como steel-frame residencial. Imagen
// panorámica que rinde bien en mobile (object-cover) y desktop sin recortar
// la silueta. Mantenemos un overlay más liviano para que la estructura sea
// claramente visible (pedido del cliente: "que se vea la casa en Metalcón").
const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=85&w=1920&auto=format&fit=crop&crop=center';

const STATS = [
  { n: '9',    label: 'Años de oficio',         Icon: TrendingUp   },
  { n: '100%', label: 'Familias contentas',     Icon: CheckCircle2 },
  { n: '0',    label: 'Subcontratistas',        Icon: Users2       },
  { n: '24h',  label: 'Te respondemos',         Icon: Clock        },
] as const;

const DEFAULT_HEADLINE = 'Tu obra,\nen buenas\nmanos.';
const DEFAULT_SUBTITLE =
  'Construimos tu casa en Metalcon — la inversión más segura que existe hoy. Estructura de acero galvanizado que no se pudre como la madera, no se triza como el hormigón y casi no requiere mantención. Levantamos hogares que duran generaciones, con anticipo claro y sin sorpresas.';
const CTA_MSG =
  'Hola Fabrick, vi su página y quiero conversar sobre mi proyecto. ¿Cuándo podríamos juntarnos para una consulta?';

export default function Hero({
  coverUrl,
  heroTitle,
  heroSubtitle,
}: {
  coverUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
} = {}) {
  const prefersReduced = useReducedMotion();
  const heroImage = cloudinaryUrl(coverUrl || DEFAULT_HERO_IMAGE, { width: 1920, quality: 80 });

  const containerVars = useMemo<Variants>(
    () => ({
      hidden: {},
      show: {
        transition: {
          staggerChildren: prefersReduced ? 0 : 0.07,
          delayChildren:   prefersReduced ? 0 : 0.15,
        },
      },
    }),
    [prefersReduced],
  );

  const itemVars = useMemo<Variants>(
    () => ({
      hidden: prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: prefersReduced ? 0.2 : 0.65, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [prefersReduced],
  );

  // Support literal \n typed in CMS OR actual newline chars
  const headlineLines = (heroTitle || DEFAULT_HEADLINE).split(/\r?\n|\\n/);
  const subtitle      = heroSubtitle || DEFAULT_SUBTITLE;

  return (
    <section
      id="inicio"
      className="relative isolate flex min-h-[100svh] overflow-hidden bg-zinc-950"
      data-cms-id="hero"
    >
      {/* â”€â”€ Background: photo + overlays + blueprint grid â”€â”€ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          initial={prefersReduced ? false : { scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: 'linear' }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt="Casa en Metalcon en construcción · Soluciones Fabrick · Linares"
            className="h-full w-full object-cover object-center opacity-[0.78] dark:opacity-[0.7]"
            fetchPriority="high"
            decoding="async"
          />
        </motion.div>

        {/* Direction gradient: heavy left → soft right so the copy is readable
            but the steel-frame on the right side stays clearly visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/45 to-zinc-950/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-zinc-950/10" />

        {/* Blueprint micro-grid */}
        <div
          className="absolute inset-0 opacity-[0.032]"
        />

        {/* Gold atmospheric haze */}
        <div
          className="absolute top-1/3 left-1/4 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full [background:radial-gradient(circle,rgba(250,204,21,0.06)_0%,transparent_65%)]"
        />
      </div>

      {/* â”€â”€ Architectural corner brackets â”€â”€ */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-5 top-[88px] z-0 block h-7 w-7 border-l-[1.5px] border-t-[1.5px] border-yellow-400/30 md:left-10 md:top-24"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-20 right-5 z-0 block h-7 w-7 border-b-[1.5px] border-r-[1.5px] border-yellow-400/20 md:right-10 md:bottom-16"
      />

      {/* â”€â”€ Main content â”€â”€ */}
      <motion.div
        variants={containerVars}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center px-6 pb-24 pt-28 md:px-12 md:pb-28 md:pt-0 lg:px-16"
      >
        {/* Eyebrow badge */}
        <motion.div variants={itemVars} className="mb-9">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-yellow-400/25 bg-yellow-400/[0.08] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
            </span>
            Construcción · Linares · Región del Maule
          </span>
        </motion.div>

        {/* Headline — last line always gold.
            Playfair Display has tall ascenders/descenders/swashes relative to
            its em-box, so leading must clear roughly 1.1× the font-size to
            avoid adjacent lines colliding ("letras remontadas"). Mobile gets
            slightly more room (text wraps more + the 9vw clamp term can push
            rendered size up relative to the narrow viewport); desktop can
            tighten a touch since the type sits closer to its max clamp size. */}
        <motion.h1
          variants={itemVars}
          className="font-playfair max-w-2xl text-balance break-words text-[clamp(2.75rem,9vw,5.75rem)] font-black leading-[1.18] tracking-normal sm:leading-[1.14] md:leading-[1.1]"
        >
          {headlineLines.map((line, i) => (
            <span
              key={i}
              className={`block ${
                i === headlineLines.length - 1
                  ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent'
                  : 'text-white'
              }`}
            >
              {line}
            </span>
          ))}
        </motion.h1>

        {/* Thin gold accent line */}
        <motion.span
          variants={itemVars}
          className="mt-6 block h-px max-w-[260px] bg-gradient-to-r from-yellow-400/60 via-yellow-400/20 to-transparent"
        />

        {/* Subtitle */}
        <motion.p
          variants={itemVars}
          className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base md:text-lg"
        >
          {subtitle}
        </motion.p>

        {/* Beneficios Metalcon — píldoras de venta rápida */}
        <motion.ul
          variants={itemVars}
          className="mt-6 flex flex-wrap gap-2 max-w-xl"
          aria-label="Beneficios de construir con Metalcon"
        >
          {[
            'Inversión asegurada',
            'Vida útil +60 años',
            'Casi cero mantención',
            'Antisísmica certificada',
          ].map((b) => (
            <li
              key={b}
              className="rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-yellow-300/90"
            >
              {b}
            </li>
          ))}
        </motion.ul>

        {/* CTA buttons */}
        <motion.div variants={itemVars} className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href={buildWhatsAppLink(CTA_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-full bg-yellow-400 px-6 py-3 text-[13px] font-black uppercase tracking-[0.18em] text-black transition-all duration-300 hover:bg-yellow-300 hover:shadow-[0_0_36px_rgba(250,204,21,0.45)] sm:px-7 sm:py-3.5"
          >
            <MessageCircle size={15} aria-hidden />
            Conversemos por WhatsApp
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </a>
          <a
            href="/contacto"
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/[0.04] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.18em] text-yellow-200 transition-all duration-300 hover:border-yellow-400 hover:bg-yellow-400/[0.1] hover:text-yellow-300 sm:px-7 sm:py-3.5"
          >
            Pedir consulta gratuita
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </a>
          <a
            href="/proyectos"
            className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[13px] font-bold text-zinc-200 transition-all duration-300 hover:border-white/40 hover:text-white sm:px-7 sm:py-3.5"
          >
            Mira nuestros proyectos
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          variants={itemVars}
          className="mt-14 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.07] pt-8 sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-6 md:gap-x-12"
        >
          {STATS.map(({ n, label, Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/[0.08] text-yellow-400">
                <Icon size={16} aria-hidden />
              </span>
              <span>
                <span className="block text-xl font-black leading-none text-yellow-400">{n}</span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  {label}
                </span>
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Animated transition between hero and the next section ──
          Reemplaza el viejo "Scroll": una onda dorada que respira,
          un degradado vertical y partículas suaves para una entrada
          cinematográfica a la siguiente sección. Desactivado bajo
          prefers-reduced-motion (la onda queda estática). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 md:h-40"
      >
        {/* Gradiente vertical que funde el hero con el negro de la sección que sigue */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black" />

        {/* Onda dorada animada — respiración suave horizontal */}
        <motion.svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-20 w-full md:h-24"
          initial={prefersReduced ? false : { x: 0 }}
          animate={prefersReduced ? {} : { x: [0, -40, 0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        >
          <defs>
            <linearGradient id="hero-wave-gold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="rgba(250,204,21,0)" />
              <stop offset="35%"  stopColor="rgba(250,204,21,0.45)" />
              <stop offset="65%"  stopColor="rgba(252,211,77,0.45)" />
              <stop offset="100%" stopColor="rgba(250,204,21,0)" />
            </linearGradient>
          </defs>
          <path
            d="M0,60 C240,110 480,10 720,60 C960,110 1200,10 1440,60 L1440,120 L0,120 Z"
            fill="url(#hero-wave-gold)"
            opacity="0.5"
          />
          <path
            d="M0,80 C240,30 480,130 720,80 C960,30 1200,130 1440,80 L1440,120 L0,120 Z"
            fill="rgba(0,0,0,0.55)"
          />
        </motion.svg>

        {/* Línea dorada hairline que cierra el hero */}
        <motion.div
          initial={prefersReduced ? { opacity: 0.4 } : { opacity: 0, scaleX: 0.6 }}
          animate={{ opacity: prefersReduced ? 0.4 : [0.25, 0.6, 0.25], scaleX: 1 }}
          transition={
            prefersReduced
              ? { duration: 0.4 }
              : { opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, scaleX: { duration: 1.2 } }
          }
          className="absolute bottom-0 left-1/2 h-px w-[55%] -translate-x-1/2 bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent"
        />

        {/* Partículas suaves: 3 puntos dorados que parpadean a destiempo */}
        {!prefersReduced && (
          <>
            <motion.span
              className="absolute bottom-[42%] left-[28%] block h-1 w-1 rounded-full bg-yellow-300/80 shadow-[0_0_10px_rgba(250,204,21,0.7)]"
              animate={{ opacity: [0, 0.9, 0], y: [0, -6, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="absolute bottom-[55%] left-[58%] block h-1 w-1 rounded-full bg-yellow-300/70 shadow-[0_0_10px_rgba(250,204,21,0.55)]"
              animate={{ opacity: [0, 0.7, 0], y: [0, -8, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
            />
            <motion.span
              className="absolute bottom-[48%] left-[78%] block h-1 w-1 rounded-full bg-amber-300/70 shadow-[0_0_10px_rgba(252,211,77,0.5)]"
              animate={{ opacity: [0, 0.8, 0], y: [0, -5, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 2.1 }}
            />
          </>
        )}
      </div>
    </section>
  );
}

