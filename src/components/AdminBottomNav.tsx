'use client';

/**
 * AdminBottomNav — barra inferior fija para la consola admin en móvil/tablet.
 *
 * 5 tabs: HOME, PROD, PED, OBS, MÁS (dropdown → drawer lateral).
 * Estilo según Bloque 6:
 *   - fixed bottom-0
 *   - bg-zinc-950, border-t border-white/5
 *   - altura 60px
 *   - iconos lucide + label text-[9px]
 *   - tab activo en amarillo
 *
 * `onOpenMore` se invoca al pulsar "MÁS" para abrir el cajón de navegación
 * completo (los items que no caben en los 4 primeros slots).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Home,
  MoreHorizontal,
  Package,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';

type BottomItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: BottomItem[] = [
  { href: '/admin',              label: 'Home', icon: Home },
  { href: '/admin/productos',    label: 'Prod', icon: Package },
  { href: '/admin/pedidos',      label: 'Ped',  icon: ShoppingCart },
  { href: '/admin/cotizaciones', label: 'Cot',  icon: FileText },
];

export function AdminBottomNav({ onOpenMore }: { onOpenMore?: () => void }) {
  const pathname = usePathname() ?? '';
  const isActive = (href: string) => pathname === href;

  return (
    <nav
      aria-label="Navegación inferior admin"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-[env(safe-area-inset-bottom)]"
    >
      {/* Cinematic glassy backdrop (login-coherent) */}
      <div className="absolute inset-0 border-t border-white/15 bg-black/55 backdrop-blur-2xl" />
      {/* Top accent line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/45 to-transparent" />
      {/* Subtle radial glow centered */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(250,204,21,0.18),rgba(0,0,0,0)_60%)]" />

      <div className="relative mx-auto flex h-[60px] max-w-[1600px] items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1"
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={`relative flex h-7 w-7 items-center justify-center rounded-xl transition-all ${
                  active
                    ? 'bg-yellow-400/15 text-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.45)]'
                    : 'text-zinc-400 group-hover:text-zinc-100'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span
                className={`truncate text-[9px] font-bold uppercase tracking-[0.2em] transition-colors ${
                  active ? 'text-yellow-300' : 'text-zinc-400'
                }`}
              >
                {label}
              </span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]"
                />
              )}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          className="group relative flex flex-1 flex-col items-center justify-center gap-1"
          aria-label="Más opciones"
        >
          <span className="relative flex h-7 w-7 items-center justify-center rounded-xl text-zinc-400 transition-all group-hover:bg-white/10 group-hover:text-zinc-100">
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </span>
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 transition-colors group-hover:text-zinc-200">
            Más
          </span>
        </button>
      </div>
    </nav>
  );
}

export default AdminBottomNav;
