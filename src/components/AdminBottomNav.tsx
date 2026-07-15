'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Home,
  Menu,
  Package,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';

type BottomItem = { href: string; label: string; icon: LucideIcon };

const LEFT_ITEMS: BottomItem[] = [
  { href: '/admin', label: 'Inicio', icon: Home },
  { href: '/admin/reportes', label: 'Ventas', icon: BarChart3 },
];

const RIGHT_ITEMS: BottomItem[] = [
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/admin/productos', label: 'Productos', icon: Package },
];

function DockItem({ href, label, icon: Icon, active }: BottomItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2"
    >
      <span className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${active ? 'bg-black text-yellow-300 shadow-[0_10px_22px_rgba(0,0,0,.22)]' : 'text-black/48 group-hover:bg-black/5 group-hover:text-black'}`}>
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <span className={`max-w-[70px] truncate text-[10px] font-black tracking-tight transition-colors ${active ? 'text-black' : 'text-black/50 group-hover:text-black'}`}>{label}</span>
    </Link>
  );
}

export function AdminBottomNav({ onOpenMore }: { onOpenMore?: () => void }) {
  const pathname = usePathname() ?? '';
  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Navegación principal del administrador" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#c7ad7c]/70 via-[#eadabd]/30 to-transparent" />
      <div className="relative mx-auto flex h-[68px] max-w-[430px] items-end justify-center">
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[64px] rounded-[1.8rem] border border-black/10 bg-[#f4ead7]/94 shadow-[0_18px_50px_rgba(58,45,19,.28)] backdrop-blur-2xl" />
        <div className="absolute bottom-[5px] left-1/2 h-0.5 w-20 -translate-x-1/2 rounded-full bg-zinc-300/60" />

        <div className="pointer-events-auto relative grid h-[64px] w-full grid-cols-[1fr_64px_1fr] items-end px-2.5">
          <div className="flex h-full items-stretch justify-around gap-0.5 pr-2">
            {LEFT_ITEMS.map((item) => <DockItem key={item.href} {...item} active={isActive(item.href)} />)}
          </div>

          <button
            type="button"
            onClick={onOpenMore}
            className="group relative -top-4 mx-auto grid h-[60px] w-[60px] place-items-center rounded-full border-[5px] border-[#f4ead7] bg-black text-yellow-300 shadow-[0_16px_35px_rgba(0,0,0,.32)] transition active:scale-95"
            aria-label="Abrir módulos del administrador"
            title="Abrir módulos"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex h-full items-stretch justify-around gap-0.5 pl-2">
            {RIGHT_ITEMS.map((item) => <DockItem key={item.href} {...item} active={isActive(item.href)} />)}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AdminBottomNav;
