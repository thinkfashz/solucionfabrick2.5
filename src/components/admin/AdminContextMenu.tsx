'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X, Zap } from 'lucide-react';
import { navSections } from '@/lib/adminNav';

interface AdminContextMenuProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  role?: string | null;
}

export default function AdminContextMenu({ open, onClose, onLogout, role }: AdminContextMenuProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Filter sections respecting superadmin-only links
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => !link.superadminOnly || role === 'superadmin'),
    }))
    .filter((section) => section.links.length > 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="admin-context-menu"
          className="fixed inset-0 z-[300] flex items-center justify-center p-3 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Menu card */}
          <motion.div
            initial={{ scale: 0.93, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 14 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950/97 shadow-[0_40px_120px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden"
            style={{ maxHeight: 'min(88vh, 680px)' }}
          >
            {/* Ambient top line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />

            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-[0_4px_14px_rgba(250,204,21,0.45)]">
                  <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300 leading-tight">Control room</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-px">Todos los módulos</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                aria-label="Cerrar menú"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
              {visibleSections.map((section) => (
                <div key={section.title}>
                  {/* Section header */}
                  <p className="px-1.5 py-1 text-[9px] font-bold uppercase tracking-[0.32em] text-zinc-600 flex items-center gap-2">
                    <span className="h-px flex-1 bg-white/[0.06]" />
                    {section.title}
                    <span className="h-px flex-1 bg-white/[0.06]" />
                  </p>

                  {/* 2-column compact grid */}
                  <div className="grid grid-cols-2 gap-0.5">
                    {section.links.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={onClose}
                          className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all border ${
                            isActive
                              ? 'bg-yellow-300/15 border-yellow-300/30 text-yellow-200'
                              : link.highlight
                              ? 'border-yellow-300/15 bg-yellow-300/5 hover:bg-yellow-300/12 hover:border-yellow-300/25'
                              : 'border-transparent hover:bg-white/[0.05] hover:border-white/10'
                          }`}
                        >
                          <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg transition-all ${
                            isActive
                              ? 'bg-yellow-300 text-black shadow-[0_2px_8px_rgba(250,204,21,0.5)]'
                              : link.highlight
                              ? 'bg-yellow-300/15 text-yellow-300'
                              : 'bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-yellow-300'
                          }`}>
                            <link.icon className="h-3 w-3" strokeWidth={2} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[10.5px] font-semibold leading-tight truncate ${
                              isActive ? 'text-yellow-200' : link.highlight ? 'text-yellow-300' : 'text-zinc-300 group-hover:text-white'
                            }`}>
                              {link.label}
                            </span>
                          </span>
                          {link.highlight && !isActive && (
                            <span className="flex-shrink-0 rounded-full border border-yellow-300/30 bg-yellow-300/15 px-1 py-px text-[7px] font-black uppercase tracking-[0.15em] text-yellow-300">
                              NEW
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Logout */}
              <div className="border-t border-white/[0.06] pt-1.5 pb-1">
                <button
                  onClick={() => { onClose(); onLogout(); }}
                  className="group w-full flex items-center gap-2 rounded-xl px-2.5 py-2 transition-all hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-500 group-hover:bg-red-500/15 group-hover:text-red-400 transition-all">
                    <LogOut className="h-3 w-3" />
                  </span>
                  <span className="text-[10.5px] font-semibold text-zinc-400 group-hover:text-red-300 transition-colors">
                    Cerrar sesión
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
