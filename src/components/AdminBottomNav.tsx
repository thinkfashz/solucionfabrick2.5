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
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-zinc-950 lg:hidden"
      style={{
        height: 60,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-[1600px] items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-1 flex-col items-center justify-center gap-1"
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={`h-5 w-5 transition-colors ${
                  active ? 'text-yellow-400' : 'text-zinc-400 group-hover:text-zinc-200'
                }`}
              />
              <span
                className={`truncate text-[9px] font-bold uppercase tracking-[0.2em] ${
                  active ? 'text-yellow-400' : 'text-zinc-400'
                }`}
              >
                {label}
              </span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]"
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
          <MoreHorizontal className="h-5 w-5 text-zinc-400 transition-colors group-hover:text-zinc-200" />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            Más
          </span>
        </button>
      </div>
    </nav>
  );
}

export default AdminBottomNav;
