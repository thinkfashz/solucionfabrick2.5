'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, HardHat, ShieldCheck, Boxes, Wrench } from 'lucide-react';

/**
 * SectionCTA — Premium dark/yellow call-to-action section.
 *
 * Design language is aligned with the existing Hero component:
 *   • Deep black/zinc gradient background
 *   • Yellow-400 accents, subtle grid + radial glow
 *   • White headline, zinc-400 supporting copy
 *   • Tech-but-trustworthy feel (rounded-full pills, hairline borders)
 */
export default function SectionCTA() {
  const features = [
    { label: 'Transparencia total',          Icon: ShieldCheck },
    { label: 'Kits Prefabricados',           Icon: Boxes },
    { label: 'Instalaciones Especializadas', Icon: Wrench },
  ];

  return (
    <section
      id="cta-presupuesto"
      aria-labelledby="cta-presupuesto-title"
      className="relative isolate overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black py-24 sm:py-32"
    >
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(250,204,21,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial yellow glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(250,204,21,0.10) 0%, rgba(250,204,21,0.03) 45%, transparent 75%)',
        }}
      />

      {/* Floating glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-yellow-400/[0.06] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-yellow-400/[0.07] blur-3xl"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/[0.06] px-4 py-1.5 backdrop-blur-sm"
        >
          <HardHat className="h-3.5 w-3.5 text-yellow-400" aria-hidden />
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-yellow-400/90">
            Configura tu obra · en tiempo real
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          id="cta-presupuesto-title"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="font-playfair text-4xl font-bold leading-[1.1] text-white sm:text-5xl md:text-6xl"
        >
          Construye a tu Ritmo,{' '}
          <span
            className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 bg-clip-text text-transparent"
            style={{
              textShadow:
                '0 0 40px rgba(250,204,21,0.25), 0 0 80px rgba(250,204,21,0.12)',
            }}
          >
            Diseña a tu Medida
          </span>
        </motion.h2>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="mx-auto mt-8 h-[2px] w-24 origin-center bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-base font-light leading-relaxed text-zinc-400 sm:text-lg md:text-xl"
        >
          Desde una remodelación rápida hasta tu casa{' '}
          <span className="font-normal text-white">llave en mano</span>. Selecciona los
          materiales, añade instalaciones y ajusta el presupuesto en tiempo real.{' '}
          <span className="text-yellow-400/90">Tú tienes el control.</span>
        </motion.p>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex justify-center"
        >
          <Link
            href="/presupuesto"
            aria-label="Armar mi presupuesto de construcción"
            className="group relative inline-flex min-h-[52px] items-center justify-center gap-3 overflow-hidden rounded-full bg-yellow-400 px-9 py-4 text-base font-semibold uppercase tracking-wider text-black shadow-[0_8px_30px_-8px_rgba(250,204,21,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(250,204,21,0.6),0_0_80px_rgba(250,204,21,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {/* Hover sweep */}
            <span
              aria-hidden
              className="absolute inset-0 translate-y-full bg-yellow-300 transition-transform duration-300 ease-out group-hover:translate-y-0"
            />
            {/* Shimmer */}
            <span
              aria-hidden
              className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover:left-[120%] group-hover:opacity-100"
            />
            <HardHat
              className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:-rotate-12"
              aria-hidden
            />
            <span className="relative z-10">Armar mi Presupuesto</span>
            <ArrowRight
              className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </motion.div>

        {/* Feature pills */}
        <motion.ul
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
          }}
          className="mt-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
        >
          {features.map(({ label, Icon }) => (
            <motion.li
              key={label}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show:   { opacity: 1, y: 0 },
              }}
              className="group inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-white/[0.03] px-4 py-2 text-xs font-medium text-zinc-300 backdrop-blur-sm transition-all duration-300 hover:border-yellow-400/50 hover:bg-yellow-400/[0.06] hover:text-white sm:text-sm"
            >
              <Icon
                className="h-4 w-4 text-yellow-400 transition-transform duration-300 group-hover:scale-110"
                aria-hidden
              />
              <span>{label}</span>
            </motion.li>
          ))}
        </motion.ul>

        {/* Trust line */}
        <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          Sin compromiso · Estimación inmediata · Asesoría humana
        </p>
      </div>

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent"
      />
    </section>
  );
}
