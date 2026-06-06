'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { navSections } from '@/components/admin-studio/StudioSidebar';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

/** Maps section title → accent colors for card gradients & icon tints */
const SECTION_ACCENTS: Record<string, { gradient: string; iconBg: string; iconColor: string; badge: string; dot: string }> = {
  'Negocio':                  { gradient: 'from-sky-500/12 via-sky-600/5 to-transparent',    iconBg: 'bg-sky-500/15',     iconColor: 'text-sky-300',     badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',    dot: 'bg-sky-400' },
  'Visión general':           { gradient: 'from-zinc-500/10 via-zinc-600/5 to-transparent',  iconBg: 'bg-zinc-700/60',    iconColor: 'text-zinc-200',    badge: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/40', dot: 'bg-zinc-400' },
  'Ventas y E-Commerce':      { gradient: 'from-emerald-500/12 via-emerald-600/5 to-transparent', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  'Contenido y Sitio Web':    { gradient: 'from-violet-500/12 via-violet-600/5 to-transparent', iconBg: 'bg-violet-500/15',  iconColor: 'text-violet-300',  badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30',  dot: 'bg-violet-400' },
  'Inteligencia Artificial':  { gradient: 'from-fuchsia-500/12 via-purple-600/5 to-transparent', iconBg: 'bg-fuchsia-500/15', iconColor: 'text-fuchsia-300', badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30', dot: 'bg-fuchsia-400' },
  'Marketing y Omnicanalidad':{ gradient: 'from-indigo-500/12 via-indigo-600/5 to-transparent', iconBg: 'bg-indigo-500/15',  iconColor: 'text-indigo-300',  badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',  dot: 'bg-indigo-400' },
  'Sistema y Avanzado':       { gradient: 'from-rose-500/12 via-rose-600/5 to-transparent',  iconBg: 'bg-rose-500/15',    iconColor: 'text-rose-300',    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',    dot: 'bg-rose-400' },
  'Seguridad & Claves':       { gradient: 'from-amber-500/12 via-amber-600/5 to-transparent', iconBg: 'bg-amber-500/15',   iconColor: 'text-amber-300',   badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   dot: 'bg-amber-400' },
};

const DEFAULT_ACCENT = {
  gradient: 'from-zinc-500/10 via-zinc-600/5 to-transparent',
  iconBg: 'bg-zinc-700/60',
  iconColor: 'text-zinc-300',
  badge: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/40',
  dot: 'bg-zinc-400',
};

export function AdminModules() {
  return (
    <motion.div
      className="space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {navSections.map((section) => {
        const accent = SECTION_ACCENTS[section.title] ?? DEFAULT_ACCENT;
        return (
          <div key={section.title} className="space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 rounded-full ${accent.dot} shadow-[0_0_8px_currentColor]`} />
              <h2 className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-400">
                {section.title}
              </h2>
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] text-zinc-600">{section.links.length} módulos</span>
            </div>

            {/* Cards grid */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.links.map((link, linkIdx) => (
                <motion.div key={`${link.href}-${linkIdx}`} variants={itemVariants}>
                  <Link href={link.href} className="block h-full group">
                    <div
                      className={[
                        'relative h-full min-h-[148px] overflow-hidden rounded-2xl border border-white/[0.08]',
                        'bg-zinc-900/70 backdrop-blur-sm bg-gradient-to-br',
                        accent.gradient,
                        'p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
                        'transition-all duration-200',
                        'hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
                      ].join(' ')}
                    >
                      {/* Subtle shine overlay */}
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_60%)] rounded-2xl" />

                      <div className="relative z-10 flex h-full flex-col">
                        {/* Icon + badges row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent.iconBg}`}>
                            <link.icon className={`h-4 w-4 ${accent.iconColor}`} />
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            {link.highlight && (
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] ${accent.badge}`}>
                                Pro
                              </span>
                            )}
                            {link.comingSoon && (
                              <span className="rounded-full border border-zinc-600/30 bg-zinc-800/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
                                Próx.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="mt-3 flex-1">
                          <h3 className="text-[13px] font-bold leading-snug text-white group-hover:text-white">
                            {link.label}
                          </h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                            {link.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}

export default AdminModules;
