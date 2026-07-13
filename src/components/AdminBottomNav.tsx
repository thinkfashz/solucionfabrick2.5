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
      className={`group mx-0.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition ${active ? 'bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,.18)]' : 'text-black/48 hover:bg-black/[0.05]'}`}
    >
      <span className={`grid h-6 w-6 place-items-center transition-all ${active ? 'text-yellow-300' : 'text-black/50 group-hover:text-black'}`}>
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <span className={`max-w-[62px] truncate text-[9px] font-black tracking-tight transition-colors ${active ? 'text-white' : 'text-black/48 group-hover:text-black'}`}>{label}</span>
    </Link>
  );
}

export function AdminBottomNav({ onOpenMore }: { onOpenMore?: () => void }) {
  const pathname = usePathname() ?? '';
  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Navegación principal del administrador" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#cabd9f]/70 via-[#e8dcc4]/34 to-transparent" />
      <div className="relative mx-auto flex h-[72px] max-w-[430px] items-end justify-center">
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[66px] rounded-[1.8rem] border border-black/[0.08] bg-[#f6edd9]/95 shadow-[0_22px_55px_rgba(45,34,14,.22)] backdrop-blur-2xl" />

        <div className="pointer-events-auto relative grid h-[66px] w-full grid-cols-[1fr_66px_1fr] items-center px-2">
          <div className="flex h-full items-stretch justify-around gap-0.5 pr-2">
            {LEFT_ITEMS.map((item) => <DockItem key={item.href} {...item} active={isActive(item.href)} />)}
          </div>

          <button
            type="button"
            onClick={onOpenMore}
            className="group relative -top-4 mx-auto grid h-[62px] w-[62px] place-items-center rounded-full border-[6px] border-[#f6edd9] bg-yellow-300 text-black shadow-[0_18px_38px_rgba(76,55,9,.30)] transition active:scale-95"
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
