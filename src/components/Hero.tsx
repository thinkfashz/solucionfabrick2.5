'use client';

/**
 * Hero — Rediseño minimalista, mobile-first, con embudo de cualificación.
 *
 * Objetivos del diseño:
 *  - Imagen arquitectónica a pantalla completa (casa metalcon mostrando
 *    perspectiva y alero de la construcción) servida vía Cloudinary, con
 *    overlays calibrados para que el contenido se lea bien tanto en móvil
 *    como en escritorio.
 *  - Animaciones suaves con Framer Motion (fade + rise + stagger) y un
 *    Ken-Burns muy sutil sobre la imagen. Respetan `prefers-reduced-motion`.
 *  - Tipografía y jerarquía simplificadas: eyebrow corto, titular grande con
 *    un acento dorado, subtítulo breve.
 *  - "Filtración de personas" / embudo: tres tarjetas que cualifican al
 *    visitante (Construir / Remodelar / Cotizar materiales). Cada una abre
 *    WhatsApp con un mensaje pre-rellenado distinto, lo que segmenta al lead
 *    desde el primer clic.
 */

import { useMemo } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Hammer, Wrench, ShoppingBag, ArrowRight } from 'lucide-react';
import AnimatedButton from '@/components/ui/animated-button';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

/**
 * Fallback de imagen del Hero: vivienda en estructura metálica (metalcon)
 * con alero visible, mostrando la perspectiva de la construcción. Es la
 * misma URL que se usa por defecto si el admin no configura `hero_cover_url`
 * desde el CMS.
 */
const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?q=85&w=1920&auto=format&fit=crop';

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

// `coverUrl` permite al CMS sobreescribir la imagen del Hero. Si no se
// proporciona, se usa la imagen de metalcon por defecto.
export default function Hero({ coverUrl }: { coverUrl?: string } = {}) {
  const prefersReduced = useReducedMotion();
  const heroImage = cloudinaryUrl(coverUrl || DEFAULT_HERO_IMAGE, {
    width: 1920,
    quality: 75,
  });

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
      {/* ── Fondo: foto a pantalla completa con Ken-Burns sutil + overlays ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-black">
        <motion.div
          initial={prefersReduced ? false : { scale: 1.08 }}
          animate={prefersReduced ? undefined : { scale: 1.0 }}
          transition={{ duration: 14, ease: 'linear' }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage}
            alt="Casa en construcción con estructura metalcon mostrando alero y perspectiva de obra"
            className="h-full w-full object-cover object-center"
            fetchPriority="high"
            decoding="async"
          />
        </motion.div>

        {/* Overlay base oscuro para legibilidad (más fuerte en móvil) */}
        <div className="absolute inset-0 bg-black/65 sm:bg-black/55" />
        {/* Gradiente vertical: oscurece arriba (navbar) y abajo (siguiente sección) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black" />
        {/* Gradiente lateral suave para integrar bordes */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
        {/* Halo dorado radial atmosférico (mantiene la identidad de marca) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% 35%, rgba(250,204,21,0.10) 0%, rgba(250,204,21,0.03) 40%, transparent 70%)',
          }}
        />
      </div>
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
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-black/55 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-yellow-400/95 backdrop-blur-md sm:text-[11px]">
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
          className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-300 sm:text-lg"
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
                className="group relative flex min-h-[88px] flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl border border-white/15 bg-black/50 p-4 text-left backdrop-blur-md transition-colors duration-300 hover:border-yellow-400/60 hover:bg-black/65 sm:p-5"
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
