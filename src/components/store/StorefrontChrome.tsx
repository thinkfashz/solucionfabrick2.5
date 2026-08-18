'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calculator,
  ClipboardList,
  Home,
  Images,
  LayoutGrid,
  LogIn,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  User,
  UserPlus,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { FabrickFullLogo, FabrickNavLogo } from '@/components/FabrickBrandIcon';
import { useAuth } from '@/context/AuthContext';
import { useCartContext } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { useTenantBranding, type TenantBranding } from '@/hooks/useTenantBranding';
import { getInitials } from '@/lib/initials';
import { navigateWithTransition } from '@/lib/routeTransition';

const INK = '#08090A';
const PEARL = '#FFF9EE';
const OAK = '#F5871F';
const OAK_LIGHT = '#FFB000';

function goTo(href: string, router: ReturnType<typeof useRouter>) {
  navigateWithTransition(href, router);
}

export function StoreFabrickLogo({
  tone = 'dark',
  compact = false,
}: {
  tone?: 'light' | 'dark';
  branding: TenantBranding;
  compact?: boolean;
}) {
  const logoTheme = tone === 'dark' ? 'light' : 'dark';
  return compact ? <FabrickNavLogo theme={logoTheme} /> : <FabrickFullLogo theme={logoTheme} />;
}

export function StorefrontHeader({ onSearch }: { onSearch?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { branding } = useTenantBranding();
  const { toggleTheme } = useTheme();
  const { openCart, totalItems } = useCartContext();

  return (
    <>
      <nav className="fixed left-0 top-0 z-[180] w-full border-b border-white/8 bg-[#08090A]/94 text-[#FFF9EE] shadow-[0_14px_46px_rgba(23,24,32,.26)] backdrop-blur-2xl">
        <div className="relative mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-3 px-4 md:h-[72px] md:px-8">
          <span className="h-10 w-10 md:hidden" aria-hidden="true" />
          <button onClick={() => goTo('/tienda', router)} className="absolute left-1/2 min-w-0 -translate-x-1/2 md:static md:translate-x-0" aria-label="Ir a la tienda">
            <StoreFabrickLogo tone="dark" branding={branding} compact />
          </button>

          <div className="hidden items-center gap-7 md:flex">
            <button onClick={() => goTo('/tienda', router)} className="text-sm font-bold text-[#FFF9EE]/68 transition hover:text-[#FFB000]">Tienda</button>
            <button onClick={() => goTo('/proyectos', router)} className="text-sm font-bold text-[#FFF9EE]/68 transition hover:text-[#FFB000]">Inspiraciones</button>
            <button onClick={() => goTo('/presupuesto', router)} className="text-sm font-bold text-[#FFF9EE]/68 transition hover:text-[#FFB000]">Cotizar servicios</button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {onSearch ? (
              <button onClick={onSearch} className="hidden h-10 w-10 place-items-center rounded-full text-[#FFF9EE]/72 transition hover:bg-white/8 hover:text-[#FFB000] md:grid" aria-label="Buscar productos">
                <Search size={20} />
              </button>
            ) : null}
            <button onClick={toggleTheme} className="hidden h-10 w-10 place-items-center rounded-full text-[#FFF9EE]/60 transition hover:bg-white/8 hover:text-[#FFB000] sm:grid" aria-label="Cambiar tema">
              <Sun size={18} />
            </button>
            <button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#F5871F] text-[#08090A] transition hover:bg-[#FFF9EE] md:h-11 md:w-11 md:rounded-2xl" aria-label="Abrir carrito de compra">
              <ShoppingBag size={20} strokeWidth={2.7} />
              {totalItems > 0 ? <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-300 px-1 text-[10px] font-black text-[#08090A] ring-2 ring-[#08090A]">{totalItems}</span> : null}
            </button>
            {user ? (
              <button onClick={() => goTo('/mi-cuenta', router)} className="hidden h-10 w-10 place-items-center rounded-full bg-white/8 text-xs font-black text-[#FFF9EE] ring-1 ring-white/10 sm:grid" aria-label="Abrir mi cuenta">
                {getInitials(user.name || user.email)}
              </button>
            ) : null}
          </div>
        </div>
      </nav>
      <div className="h-16 md:h-[72px]" />
    </>
  );
}

type DockItemProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
};

function DockItem({ icon: Icon, label, active, onClick }: DockItemProps) {
  return (
    <button onClick={onClick} className={`grid min-w-0 flex-1 place-items-center gap-1 rounded-2xl py-2 text-[10px] font-black transition ${active ? 'bg-[#FFB000]/16 text-[#F2DFBB]' : 'text-[#FFF9EE]/78 hover:text-[#FFB000]'}`}>
      <Icon className="h-5 w-5" strokeWidth={active ? 2.8 : 2} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function QuickAction({ icon: Icon, title, description, onClick }: { icon: LucideIcon; title: string; description: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 rounded-[1.35rem] bg-white p-3 text-left text-[#08090A] shadow-[0_12px_34px_rgba(23,24,32,.08)] ring-1 ring-[#08090A]/7 transition active:scale-[.98]">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0"><b className="block text-sm">{title}</b><span className="mt-0.5 block text-[11px] leading-4 text-[#BFB8AC]">{description}</span></span>
    </button>
  );
}

export function StoreBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { openCart, totalItems } = useCartContext();
  const [open, setOpen] = useState(false);

  function navigate(href: string) {
    setOpen(false);
    goTo(href, router);
  }

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[250] bg-[#08090A]/74 backdrop-blur-md md:hidden" onClick={() => setOpen(false)}>
          <section className="absolute inset-x-3 bottom-[calc(6.35rem+env(safe-area-inset-bottom))] max-h-[calc(100dvh-7.7rem)] overflow-y-auto rounded-[2rem] bg-[#FFF9EE] p-4 text-[#08090A] shadow-[0_32px_100px_rgba(23,24,32,.38)] ring-1 ring-[#08090A]/8" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[.26em] text-[#F5871F]">Menú Fabrick</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">Compra, inspira o cotiza.</h2></div>
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#08090A] text-[#FFF9EE]" aria-label="Cerrar menú"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 grid gap-2">
              <QuickAction icon={LayoutGrid} title="Tienda para el hogar" description="Productos, ofertas y disponibilidad" onClick={() => navigate('/tienda')} />
              <QuickAction icon={Images} title="Inspiraciones" description="Cocinas, casas, planos, muebles, piscinas y quinchos" onClick={() => navigate('/proyectos')} />
              <QuickAction icon={Calculator} title="Cotizar servicios" description="Calculadoras por especialidad y carrito de proyecto" onClick={() => navigate('/presupuesto')} />
              <QuickAction icon={ShoppingBag} title={`Carrito de productos · ${totalItems}`} description="Revisar productos seleccionados" onClick={() => { setOpen(false); openCart(); }} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => navigate('/auth')} className="rounded-2xl bg-[#EDE0D4] p-3 text-left text-[#08090A]"><LogIn className="h-4 w-4 text-[#F5871F]" /><b className="mt-2 block text-xs">Iniciar sesión</b></button>
              <button onClick={() => navigate('/registro')} className="rounded-2xl bg-[#EDE0D4] p-3 text-left text-[#08090A]"><UserPlus className="h-4 w-4 text-[#F5871F]" /><b className="mt-2 block text-xs">Crear cuenta</b></button>
              <button onClick={() => navigate('/mi-cuenta')} className="rounded-2xl bg-[#EDE0D4] p-3 text-left text-[#08090A]"><ShieldCheck className="h-4 w-4 text-[#F5871F]" /><b className="mt-2 block text-xs">Mis pedidos</b></button>
              <button onClick={() => navigate('/contacto')} className="rounded-2xl bg-[#EDE0D4] p-3 text-left text-[#08090A]"><ClipboardList className="h-4 w-4 text-[#F5871F]" /><b className="mt-2 block text-xs">Pedir ayuda</b></button>
            </div>
          </section>
        </div>
      ) : null}

      <nav className="fixed inset-x-3 bottom-[calc(.65rem+env(safe-area-inset-bottom))] z-[240] mx-auto flex h-[76px] max-w-[520px] items-center rounded-[2rem] bg-[#08090A]/98 px-2 text-[#FFF9EE] shadow-[0_22px_72px_rgba(23,24,32,.42)] ring-1 ring-[#FFB000]/22 backdrop-blur-2xl md:hidden" aria-label="Navegación principal">
        <DockItem icon={Home} label="Inicio" active={pathname === '/'} onClick={() => navigate('/')} />
        <DockItem icon={ClipboardList} label="Presupuesto" active={pathname.startsWith('/presupuesto')} onClick={() => navigate('/presupuesto')} />
        <button onClick={() => setOpen((value) => !value)} className="relative -mt-7 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#F5871F] text-[#08090A] shadow-[0_12px_34px_rgba(182,144,108,.34)] ring-4 ring-[#08090A]" aria-label="Abrir menú Fabrick">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-7 w-7" />}
          <span className="absolute -bottom-[17px] rounded-full bg-[#08090A] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em] text-[#F2DFBB]">Menú</span>
        </button>
        <DockItem icon={LayoutGrid} label="Tienda" active={pathname.startsWith('/tienda')} onClick={() => navigate('/tienda')} />
        <DockItem icon={User} label="Perfil" active={pathname.startsWith('/mi-cuenta')} onClick={() => navigate('/mi-cuenta')} />
      </nav>
    </>
  );
}
