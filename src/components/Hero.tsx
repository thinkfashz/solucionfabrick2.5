'use client';

/**
 * Hero — Rediseño minimalista, mobile-first, con embudo de cualificación.
 *
 * Objetivos del diseño:
 *  - Fondo limpio: negro profundo con un halo dorado radial sutil y grano fino
 *    (sin foto a pantalla completa, sin la casa 3D dominando, sin múltiples
 *    overlays apilados que en móvil saturaban la composición).
 *  - Animaciones suaves con Framer Motion (fade + rise + stagger) en lugar de
 *    GSAP + parallax pesado. Respetan `prefers-reduced-motion`.
 *  - Tipografía y jerarquía simplificadas: eyebrow corto, titular grande con
 *    un acento dorado, subtítulo breve.
 *  - "Filtración de personas" / embudo: tres tarjetas que cualifican al
 *    visitante (Construir / Remodelar / Cotizar materiales). Cada una abre
 *    WhatsApp con un mensaje pre-rellenado distinto, lo que segmenta al lead
 *    desde el primer clic.
 *
 * Mantiene la firma `Hero({ coverUrl })` para no romper `src/app/page.tsx`,
 * aunque el nuevo diseño no usa la imagen de portada.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Hammer, Wrench, ShoppingBag, ArrowRight } from 'lucide-react';
import AnimatedButton from '@/components/ui/animated-button';
import { buildWhatsAppLink } from '@/lib/whatsapp';

type FunnelOption = {
  id: 'construir' | 'remodelar' | 'cotizar';
  Icon: typeof Hammer;
  title: string;
  desc: string;
  message: string;
};

const FUNNEL_OPTIONS: FunnelOption[] = [
  {
    id: 'construir',
    Icon: Hammer,
    title: 'Construir desde cero',
    desc: 'Casa nueva, ampliación o segunda planta.',
    message:
      'Hola Soluciones Fabrick, quiero construir desde cero (casa o ampliación) y necesito una evaluación gratuita en Linares / Región del Maule.',
  },
  {
    id: 'remodelar',
    Icon: Wrench,
    title: 'Remodelar mi espacio',
    desc: 'Cocina, baños, fachada o interiores.',
    message:
      'Hola Soluciones Fabrick, quiero remodelar mi espacio (cocina, baños, fachada o interiores) y agendar una visita para presupuesto.',
  },
  {
    id: 'cotizar',
    Icon: ShoppingBag,
    title: 'Cotizar materiales',
    desc: 'Solo necesito precios y disponibilidad.',
    message:
      'Hola Soluciones Fabrick, quiero cotizar materiales de construcción. ¿Me pueden enviar precios y disponibilidad?',
  },
];

// `coverUrl` se acepta por compatibilidad con `src/app/page.tsx` pero el nuevo
// diseño no usa una imagen de portada.
export default function Hero(_props: { coverUrl?: string } = {}) {
  const prefersReduced = useReducedMotion();

  const containerVariants = useMemo<Variants>(
    () => ({
      hidden: {},
      show: {
        transition: {
          staggerChildren: prefersReduced ? 0 : 0.09,
          delayChildren: prefersReduced ? 0 : 0.1,
        },
      },
    }),
    [prefersReduced],
  );

  const itemVariants = useMemo<Variants>(
    () => ({
      hidden: prefersReduced ? { opacity: 0 } : { opacity: 0, y: 18 },
      show: {
        opacity: 1,
        y: 0,
        transition: { duration: prefersReduced ? 0.2 : 0.7, ease: [0.22, 1, 0.36, 1] },
      },
    }),
    [prefersReduced],
  );

  return (
    <section
      id="inicio"
      className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden bg-black"
    >
      {/* ── Fondo: negro + halo dorado radial + grano sutil ────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(250,204,21,0.10) 0%, rgba(250,204,21,0.04) 35%, transparent 70%), #000',
        }}
      />
      {/* Línea dorada superior y viñeta inferior para integrar la siguiente sección */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-black to-transparent"
      />
      {/* Grano sutil con SVG inline (no requiere assets) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* ── Contenido ──────────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-16 pt-28 text-center sm:pt-32 md:pt-36"
      >
        {/* Eyebrow */}
        <motion.div variants={itemVariants} className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-white/[0.03] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-yellow-400/90 backdrop-blur-sm sm:text-[11px]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
            </span>
            Construcción · Linares · Región del Maule
          </span>
        </motion.div>

        {/* Titular */}
        <motion.h1
          variants={itemVariants}
          className="font-playfair text-[clamp(2.5rem,9vw,5.25rem)] font-semibold leading-[1.05] tracking-tight text-white"
        >
          Tu obra,
          <br />
          <span className="bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 bg-clip-text text-transparent">
            sin intermediarios.
          </span>
        </motion.h1>

        {/* Subtítulo */}
        <motion.p
          variants={itemVariants}
          className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg"
        >
          Un solo equipo desde el plano a la entrega. Evaluación gratuita y
          presupuesto en menos de 24 horas.
        </motion.p>

        {/* ── Embudo de cualificación ──────────────────────────────── */}
        <motion.div variants={itemVariants} className="mt-10 sm:mt-12">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500 sm:text-[11px]">
            ¿Qué necesitas hoy?
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3.5">
            {FUNNEL_OPTIONS.map(({ id, Icon, title, desc, message }) => (
              <AnimatedButton
                key={id}
                as="a"
                href={buildWhatsAppLink(message)}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={prefersReduced ? undefined : { y: -3 }}
                className="group relative flex min-h-[88px] flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left backdrop-blur-sm transition-colors duration-300 hover:border-yellow-400/50 hover:bg-yellow-400/[0.04] sm:p-5"
                aria-label={`${title} — abrir WhatsApp`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-yellow-400/30 bg-yellow-400/5 text-yellow-400 transition-colors duration-300 group-hover:border-yellow-400/60 group-hover:bg-yellow-400/10">
                  <Icon size={16} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="block">
                  <span className="block text-sm font-semibold text-white sm:text-[15px]">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-zinc-400 sm:text-[13px]">
                    {desc}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.18em] text-yellow-400/80 transition-colors group-hover:text-yellow-400">
                  Hablar ahora
                  <ArrowRight
                    size={12}
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </AnimatedButton>
            ))}
          </div>
        </motion.div>

        {/* CTA secundaria — para los que aún no se deciden */}
        <motion.div variants={itemVariants} className="mt-8">
          <a
            href="/#servicios"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-yellow-400 sm:text-sm"
          >
            <span className="underline decoration-yellow-400/30 decoration-1 underline-offset-4 transition-colors group-hover:decoration-yellow-400">
              Prefiero ver primero los servicios
            </span>
            <ArrowRight size={13} aria-hidden />
          </a>
        </motion.div>

        {/* Trust bar */}
        <motion.ul
          variants={itemVariants}
          className="mx-auto mt-10 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500 sm:text-[11px]"
        >
          <li className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-yellow-400/70" aria-hidden />
            Evaluación gratuita
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-yellow-400/70" aria-hidden />
            Presupuesto en 24h
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-yellow-400/70" aria-hidden />
            Sin compromiso
          </li>
        </motion.ul>
      </motion.div>

      {/* Indicador de scroll discreto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center"
      >
        <div className="h-8 w-px bg-gradient-to-b from-yellow-400/50 to-transparent" />
      </div>
    </section>
  );
}
