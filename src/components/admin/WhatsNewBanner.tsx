'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, ArrowRight } from 'lucide-react';

/**
 * Listado de mejoras recientes del admin. Cuando se agreguen nuevas, basta con
 * añadir una entrada al principio del array y bumpear `WHATS_NEW_VERSION`. El
 * banner volverá a aparecer aunque el usuario lo haya descartado en versiones
 * previas.
 */
const WHATS_NEW_VERSION = '2026-05-15';

type Item = { href?: string; title: string; description: string; badge?: string };

const ITEMS: Item[] = [
  {
    href: '/admin/equipo',
    title: 'Acceso Demo · 24 h',
    description: 'Genera un link temporal (sin cuenta real) para mostrar el panel a clientes o inversores. Solo lectura, expira solo.',
    badge: 'Nuevo',
  },
  {
    href: '/admin/equipo',
    title: 'Invitaciones por link',
    description: 'Invita personas al equipo con un link directo. Crean su propia contraseña y quedan aprobadas automáticamente.',
    badge: 'Nuevo',
  },
  {
    href: '/admin/inteligencia-mercado',
    title: 'Inteligencia de mercado',
    description: 'Cruza precios y tendencias de MercadoLibre + Google y genera SEO con IA.',
  },
  {
    href: '/admin/asistente-ia',
    title: 'Asistente IA (OpenRouter)',
    description: 'Chat con modelos gratis y de pago, capaz de leer el código del repo.',
  },
];

const STORAGE_KEY = 'admin:whats-new:dismissed';

export default function WhatsNewBanner() {
  const [dismissed, setDismissed] = useState(true); // hidden until hydrated

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === WHATS_NEW_VERSION);
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, WHATS_NEW_VERSION);
    } catch {
      /* ignore */
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative mb-4 sm:mb-6 rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-[0_0_24px_-8px_rgba(250,204,21,0.4)] animate-fade-in">
      <button
        onClick={dismiss}
        aria-label="Descartar novedades"
        className="absolute top-2 right-2 rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 rounded-lg bg-yellow-400/20 p-2">
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-yellow-200">
            Novedades del admin
          </h3>
          <p className="text-xs text-yellow-100/70 mt-0.5">
            Estas mejoras se sumaron al panel recientemente.
          </p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ITEMS.map((it) => {
              const inner = (
                <>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-white">{it.title}</span>
                    {it.badge && (
                      <span className="inline-flex items-center rounded-full border border-yellow-300/40 bg-yellow-300/15 px-1.5 py-px text-[8px] font-black uppercase tracking-[0.18em] text-yellow-200">
                        {it.badge}
                      </span>
                    )}
                  </span>
                  <span className="block text-[11px] text-zinc-400 mt-0.5">{it.description}</span>
                </>
              );
              return (
                <li key={it.title}>
                  {it.href ? (
                    <Link
                      href={it.href}
                      className="group block rounded-lg border border-white/5 bg-zinc-950/40 hover:bg-zinc-900/60 p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">{inner}</div>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-yellow-300 transition-colors flex-shrink-0 mt-0.5" />
                      </div>
                    </Link>
                  ) : (
                    <div className="rounded-lg border border-white/5 bg-zinc-950/40 p-3">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
