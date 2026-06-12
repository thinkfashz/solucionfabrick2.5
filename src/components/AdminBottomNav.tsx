'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Home,
  LayoutGrid,
  Menu,
  Package,
  User,
  type LucideIcon,
} from 'lucide-react';

type BottomItem = { href: string; label: string; icon: LucideIcon };

const LEFT_ITEMS: BottomItem[] = [
  { href: '/admin', label: 'Inicio', icon: Home },
  { href: '/admin/presupuestos', label: 'Presup.', icon: FileText },
];

const RIGHT_ITEMS: BottomItem[] = [
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/perfil', label: 'Perfil', icon: User },
];

function DockItem({ href, label, icon: Icon, active }: BottomItem & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2"
    >
      <span className={`grid h-8 w-8 place-items-center rounded-2xl transition-all ${active ? 'bg-black text-yellow-300 shadow-[0_10px_22px_rgba(0,0,0,.22)]' : 'text-zinc-400 group-hover:bg-black/5 group-hover:text-zinc-700'}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={`max-w-[58px] truncate text-[9px] font-black tracking-tight transition-colors ${active ? 'text-black' : 'text-zinc-400 group-hover:text-zinc-700'}`}>{label}</span>
    </Link>
  );
}

export function AdminBottomNav({ onOpenMore }: { onOpenMore?: () => void }) {
  const pathname = usePathname() ?? '';
  const isActive = (href: string) => pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));

  return (
    <nav aria-label="Navegación inferior admin" className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
      <div className="relative mx-auto flex h-[76px] max-w-[430px] items-end justify-center">
        <div className="absolute bottom-0 left-0 right-0 h-[62px] rounded-[2rem] border border-black/5 bg-white/94 shadow-[0_22px_60px_rgba(0,0,0,.26)] backdrop-blur-2xl" />
        <div className="absolute bottom-[6px] left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-zinc-300/60" />

        <div className="relative grid h-[62px] w-full grid-cols-[1fr_72px_1fr] items-end px-3">
          <div className="flex h-full items-stretch justify-around gap-1 pr-3">
            {LEFT_ITEMS.map((item) => <DockItem key={item.href} {...item} active={isActive(item.href)} />)}
          </div>

          <button
            type="button"
            onClick={onOpenMore}
            className="group relative -top-7 mx-auto grid h-[68px] w-[68px] place-items-center rounded-full border-[7px] border-[#f5f5f5] bg-black text-yellow-300 shadow-[0_20px_45px_rgba(0,0,0,.36)] transition active:scale-95"
            aria-label="Abrir módulos"
            title="Abrir módulos"
          >
            <Menu className="h-7 w-7" />
            <span className="absolute -bottom-6 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">Menú</span>
          </button>

          <div className="flex h-full items-stretch justify-around gap-1 pl-3">
            {RIGHT_ITEMS.map((item) => <DockItem key={item.href} {...item} active={isActive(item.href)} />)}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default AdminBottomNav;
