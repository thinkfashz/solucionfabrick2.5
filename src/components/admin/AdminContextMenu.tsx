'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package, ShoppingCart, FileText, LayoutGrid, Newspaper, ImageIcon,
  Sparkles, Megaphone, Settings, LogOut, X, BarChart3, Zap,
} from 'lucide-react';

interface AdminContextMenuProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const MENU_SECTIONS = [
  {
    title: 'Operación',
    items: [
      { href: '/admin/productos', label: 'Productos', icon: Package, description: 'Catálogo y stock' },
      { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart, description: 'Cobros y estados' },
      { href: '/admin/cotizaciones', label: 'Cotizaciones', icon: FileText, description: 'Solicitudes' },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { href: '/admin/editor', label: 'Editor universal', icon: LayoutGrid, description: 'Navbar, footer y secciones' },
      { href: '/admin/blog', label: 'Blog', icon: Newspaper, description: 'Entradas y portadas' },
      { href: '/admin/medios', label: 'Medios', icon: ImageIcon, description: 'Biblioteca de imágenes' },
    ],
  },
  {
    title: 'Expansión',
    items: [
      { href: '/admin/asistente-ia', label: 'Asistente IA', icon: Sparkles, description: 'Chat y análisis' },
      { href: '/admin/publicidad', label: 'Publicidad', icon: Megaphone, description: 'Meta Ads' },
      { href: '/admin/configuracion', label: 'Configuración', icon: Settings, description: 'Parámetros' },
    ],
  },
];

export default function AdminContextMenu({ open, onClose, onLogout }: AdminContextMenuProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="admin-context-menu"
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Menu card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_40px_100px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden"
          >
            {/* Ambient top glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-[0_4px_14px_rgba(250,204,21,0.45)]">
                  <Zap className="h-4 w-4 text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-yellow-300 leading-tight">Control room</p>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mt-px">Acceso rápido</p>
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

            {/* Sections */}
            <div className="p-2.5 max-h-[75vh] overflow-y-auto">
              {/* Centro de control */}
              <Link
                href="/admin"
                onClick={onClose}
                className="group mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-sky-400/10 border border-transparent hover:border-sky-400/20"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 group-hover:bg-sky-400/15 group-hover:text-sky-300 transition-all">
                  <BarChart3 className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-zinc-200 group-hover:text-sky-200 transition-colors">Centro de control</span>
                  <span className="block text-[10px] text-zinc-600 mt-0.5">KPIs y salud operativa</span>
                </span>
              </Link>

              {MENU_SECTIONS.map((section, si) => (
                <div key={section.title}>
                  <div className={`${si > 0 ? 'mt-2' : ''} border-t border-white/[0.06] mb-2`} />
                  <p className="px-2 pb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">
                    {section.title}
                  </p>
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-yellow-300/10 border border-transparent hover:border-yellow-300/15"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 group-hover:bg-yellow-300/15 group-hover:text-yellow-300 transition-all">
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold text-zinc-200 group-hover:text-yellow-200 transition-colors">{item.label}</span>
                        <span className="block text-[10px] text-zinc-600 mt-0.5 truncate">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ))}

              {/* Logout */}
              <div className="mt-2 border-t border-white/[0.06] mb-2" />
              <button
                onClick={() => { onClose(); onLogout(); }}
                className="group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400 group-hover:bg-red-500/15 group-hover:text-red-400 transition-all">
                  <LogOut className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[12px] font-semibold text-zinc-200 group-hover:text-red-300 transition-colors">Cerrar sesión</span>
                  <span className="block text-[10px] text-zinc-600 mt-0.5">Salir del panel admin</span>
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
