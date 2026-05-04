'use client';

/**
 * Hero â€” RediseÃ±o editorial. Layout izquierdo + barra de stats.
 * TÃ­tulo y subtÃ­tulo editables desde /admin/home.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, Clock, Users2, TrendingUp, MessageCircle,
} from 'lucide-react';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=90&w=1920&auto=format&fit=crop&crop=center';

const STATS = [
  { n: '12+',  label: 'AÃ±os de exp.',    Icon: TrendingUp   },
  { n: '300+', label: 'Obras hechas',    Icon: Users2       },
  { n: '98%',  label: 'SatisfacciÃ³n',    Icon: CheckCircle2 },
  { n: '24h',  label: 'Respuesta',       Icon: Clock        },
] as const;

const DEFAULT_HEADLINE = 'Edificamos\ntu proyecto\ncon calidad.';
const DEFAULT_SUBTITLE =
  'Equipo propio, materiales premium, entrega puntual. Sin subcontratos, sin sorpresas.';
const CTA_MSG =
  'Hola Soluciones Fabrick, quiero hablar con un experto y obtener un presupuesto gratuito para mi proyecto en Linares.';

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
            alt="ConstrucciÃ³n Soluciones Fabrick Linares"
            className="h-full w-full object-cover object-center opacity-[0.18]"
            fetchPriority="high"
            decoding="async"
          />
        </motion.div>

        {/* Direction gradient: heavy left â†’ sparse right */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/92 to-zinc-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/75" />

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
            ConstrucciÃ³n Â· Linares Â· RegiÃ³n del Maule
          </span>
        </motion.div>

        {/* Headline â€” last line always gold */}
        <motion.h1
          variants={itemVars}
          className="font-playfair max-w-2xl text-[clamp(3rem,7.5vw,5.75rem)] font-black leading-[0.95] tracking-tight"
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
          className="mt-5 max-w-lg text-base leading-relaxed text-zinc-300 md:text-[1.1rem]"
        >
          {subtitle}
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={itemVars} className="mt-9 flex flex-wrap items-center gap-3">
          <a
            href={buildWhatsAppLink(CTA_MSG)}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2.5 rounded-full bg-yellow-400 px-7 py-3.5 text-[13px] font-black uppercase tracking-[0.18em] text-black transition-all duration-300 hover:bg-yellow-300 hover:shadow-[0_0_36px_rgba(250,204,21,0.45)]"
          >
            <MessageCircle size={15} aria-hidden />
            Hablar con un experto
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </a>
          <a
            href="/proyectos"
            className="group inline-flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-[13px] font-bold text-zinc-200 transition-all duration-300 hover:border-yellow-400/50 hover:text-yellow-400"
          >
            Ver proyectos
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </a>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          variants={itemVars}
          className="mt-14 flex flex-wrap gap-6 border-t border-white/[0.07] pt-8 md:gap-12"
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

      {/* â”€â”€ Scroll hint â”€â”€ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.6 }}
        aria-hidden
        className="pointer-events-none absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        <motion.div
          animate={prefersReduced ? {} : { y: [0, 5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="h-10 w-px bg-gradient-to-b from-yellow-400/50 to-transparent"
        />
        <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-zinc-600">Scroll</span>
      </motion.div>
    </section>
  );
}

