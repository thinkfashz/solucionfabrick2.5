'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Home,
  Menu,
  Package,
  Truck,
  type LucideIcon,
} from 'lucide-react';

type BottomItem = { href: string; label: string; icon: LucideIcon };

const LEFT_ITEMS: BottomItem[] = [
  { href: '/admin', label: 'Inicio', icon: Home },
  { href: '/admin/presupuestos', label: 'Presup.', icon: FileText },
];

const RIGHT_ITEMS: BottomItem[] = [
  { href: '/admin/despachos', label: 'Envios', icon: Truck },
  { href: '/admin/productos', label: 'Productos', icon: Package },
];

function DockItem({ href, label, icon: Icon, active }: BottomItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
    >
      <span className={`grid h-7 w-7 place-items-center rounded-xl transition-all ${active ? 'bg-black text-yellow-300 shadow-[0_10px_22px_rgba(0,0,0,.22)]' : 'text-zinc-500 group-hover:bg-black/5 group-hover:text-zinc-700'}`}>
        <Icon className="h-[16px] w-[16px]" />
      </span>
      <span className={`max-w-[60px] truncate text-[8.5px] font-black tracking-tight transition-colors ${active ? 'text-black' : 'text-zinc-500 group-hover:text-zinc-700'}`}>{label}</span>
    </Link>
  );
}

export function AdminBottomNav({ onOpenMore }: { onOpenMore?: () => void }) {
  const pathname = usePathname() ?? '';
  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Admin bottom navigation" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 via-black/15 to-transparent" />
      <div className="relative mx-auto flex h-[58px] max-w-[410px] items-end justify-center">
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 h-[54px] rounded-[1.65rem] border border-white/10 bg-white/92 shadow-[0_18px_45px_rgba(0,0,0,.22)] backdrop-blur-2xl" />
        <div className="absolute bottom-[5px] left-1/2 h-0.5 w-20 -translate-x-1/2 rounded-full bg-zinc-300/60" />

        <div className="pointer-events-auto relative grid h-[54px] w-full grid-cols-[1fr_58px_1fr] items-end px-2.5">
          <div className="flex h-full items-stretch justify-around gap-0.5 pr-2">
            {LEFT_ITEMS.map((item) => <DockItem key={item.href} {...item} active={isActive(item.href)} />)}
          </div>

          <button
            type="button"
            onClick={onOpenMore}
            className="group relative -top-4 mx-auto grid h-[54px] w-[54px] place-items-center rounded-full border-[5px] border-[#f5f5f5] bg-black text-yellow-300 shadow-[0_16px_35px_rgba(0,0,0,.32)] transition active:scale-95"
            aria-label="Abrir modulos"
            title="Abrir modulos"
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
