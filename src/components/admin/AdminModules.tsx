'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { navSections } from '@/components/admin-studio/StudioSidebar';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// Generates a random stable color for visual variety based on the label length
function getColorForIndex(index: number): string {
  const colors = [
    'from-blue-500/20 to-blue-900/40',
    'from-emerald-500/20 to-emerald-900/40',
    'from-purple-500/20 to-purple-900/40',
    'from-orange-500/20 to-orange-900/40',
    'from-pink-500/20 to-pink-900/40',
    'from-cyan-500/20 to-cyan-900/40',
    'from-yellow-500/20 to-yellow-900/40',
  ];
  return colors[index % colors.length] ?? colors[0];
}

export function AdminModules() {
  return (
    <motion.div
      className="space-y-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {navSections.map((section, sectionIdx) => (
        <div key={section.title} className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-6 bg-yellow-400 rounded-full inline-block" />
            {section.title}
          </h2>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {section.links.map((link, linkIdx) => (
              <motion.div key={link.href} variants={itemVariants}>
                <Link href={link.href} className="block h-full">
                  <motion.div
                    className={`relative h-full min-h-[160px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${getColorForIndex(link.label.length + linkIdx)} p-5 shadow-lg transition hover:border-white/25 hover:shadow-[0_24px_70px_rgba(0,0,0,0.35)] bg-zinc-900/80 backdrop-blur-xl`}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="relative z-10 flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
                          <link.icon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {link.highlight && (
                            <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-yellow-300">
                              Destacado
                            </span>
                          )}
                          {link.comingSoon && (
                            <span className="rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                              Próximamente
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex-1">
                        <h3 className="text-[15px] font-bold leading-tight text-white">{link.label}</h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{link.description}</p>
                      </div>

                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

export default AdminModules;
