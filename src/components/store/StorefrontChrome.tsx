'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, LayoutDashboard, LogIn, Menu, Search, ShieldCheck, ShoppingBag, Sun, UserPlus, Wrench, X } from 'lucide-react';
import { FabrickFullLogo, FabrickNavLogo } from '@/components/FabrickBrandIcon';
import { useAuth } from '@/context/AuthContext';
import { useCartContext } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { tenantInitials, useTenantBranding, type TenantBranding } from '@/hooks/useTenantBranding';
import { getInitials } from '@/lib/initials';
import { navigateWithTransition } from '@/lib/routeTransition';

function openExternalOrRoute(href: string, router: ReturnType<typeof useRouter>) {
  if (href.startsWith('http')) window.open(href, '_blank', 'noopener,noreferrer');
  else navigateWithTransition(href, router);
}

export function StoreFabrickLogo({ tone = 'dark', compact = false }: { tone?: 'light' | 'dark'; branding: TenantBranding; compact?: boolean }) {
  const logoTheme = tone === 'dark' ? 'light' : 'dark';
  return compact ? <FabrickNavLogo theme={logoTheme} /> : <FabrickFullLogo theme={logoTheme} />;
}

export function StorefrontHeader({ onSearch }: { onSearch: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { branding } = useTenantBranding();
  const { toggleTheme } = useTheme();
  const { openCart, totalItems } = useCartContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const brandName = branding.name || 'Soluciones Fabrick';
  const supportLink = branding.whatsappUrl || '/contacto';

  function go(href: string) {
    setMenuOpen(false);
    navigateWithTransition(href, router);
  }

  function contact() {
    setMenuOpen(false);
    openExternalOrRoute(supportLink, router);
  }

  return <>
    <nav className="fixed left-0 top-0 z-[180] w-full border-b border-white/10 bg-black/82 text-white shadow-[0_8px_30px_rgba(0,0,0,.34)] backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-3 px-4 md:h-[68px] md:px-8">
        <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.055] md:hidden" aria-label="Abrir menú"><Menu size={21} /></button>
        <button onClick={() => go('/tienda')} className="absolute left-1/2 min-w-0 -translate-x-1/2 rounded-full md:static md:translate-x-0" aria-label="Ir a tienda"><StoreFabrickLogo tone="dark" branding={branding} compact /></button>
        <div className="hidden items-center gap-7 md:flex">
          <button onClick={() => go('/tienda/catalogo')} className="text-sm font-bold opacity-70 hover:opacity-100">Catálogo</button>
          <button onClick={contact} className="text-sm font-bold opacity-70 hover:opacity-100">Instalación</button>
          <button onClick={() => go('/mi-cuenta')} className="text-sm font-bold opacity-70 hover:opacity-100">Cliente</button>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={onSearch} className="hidden h-10 w-10 place-items-center rounded-full opacity-75 transition hover:bg-white/10 hover:opacity-100 md:grid" aria-label="Buscar"><Search size={20} /></button>
          <button onClick={toggleTheme} className="hidden h-10 w-10 place-items-center rounded-full opacity-65 transition hover:bg-white/10 hover:opacity-100 sm:grid" aria-label="Cambiar tema"><Sun size={18} /></button>
          <button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-white transition hover:border-yellow-300/45 hover:text-yellow-200 md:h-11 md:w-11 md:rounded-2xl md:border-yellow-300/30 md:bg-yellow-300 md:text-black" aria-label="Abrir bolso de compra">
            <ShoppingBag size={20} strokeWidth={2.8} />
            {totalItems > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-300 px-1 text-[10px] font-black text-black ring-2 ring-black">{totalItems}</span>}
          </button>
          {user ? <button onClick={() => go('/mi-cuenta')} className="hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-xs font-black sm:grid">{getInitials(user.name || user.email)}</button> : null}
          <button onClick={() => setMenuOpen(true)} className="hidden h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] md:grid" aria-label="Abrir menú"><Menu size={22} /></button>
        </div>
      </div>
    </nav>
    <div className="h-16 md:h-[68px]" />

    {menuOpen && <div className="fixed inset-0 z-[300] bg-black/76 backdrop-blur-xl">
      <aside className="ml-auto flex h-full w-[92vw] max-w-[430px] flex-col overflow-y-auto border-l border-white/10 bg-[#070707] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-white shadow-2xl shadow-black/70 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <StoreFabrickLogo tone="dark" branding={branding} compact />
          <button onClick={() => setMenuOpen(false)} className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]"><X className="h-6 w-6" /></button>
        </div>

        <div className="mt-8 rounded-[2rem] border border-yellow-300/20 bg-[radial-gradient(circle_at_20%_0%,rgba(250,204,21,.18),transparent_18rem),rgba(255,255,255,.045)] p-4">
          <p className="text-[10px] font-black uppercase tracking-[.26em] text-yellow-200">Portal tienda</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.05em]">Compra, cuenta y seguimiento.</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Entra como cliente, crea tu cuenta o abre el panel administrativo del negocio.</p>
        </div>

        <div className="mt-5 grid gap-2">
          <MenuAction icon={Home} label="Catálogo" description="Ver productos disponibles" onClick={() => go('/tienda/catalogo')} />
          <MenuAction icon={Wrench} label="Instalación" description="Coordinar servicio o despacho" onClick={contact} />
          <MenuAction icon={ShoppingBag} label={`Bolso de compra (${totalItems})`} description="Revisar productos agregados" onClick={() => { setMenuOpen(false); openCart(); }} />
        </div>

        <div className="mt-5 grid gap-2 rounded-[2rem] border border-white/10 bg-white/[0.035] p-3">
          <MenuAction icon={LogIn} label="Iniciar sesión tienda" description="Entrar como cliente" onClick={() => go('/auth')} />
          <MenuAction icon={UserPlus} label="Crear cuenta" description="Registro rápido de cliente" onClick={() => go('/registro')} />
          <MenuAction icon={LayoutDashboard} label="Panel cliente" description="Pedidos, datos y seguimiento" onClick={() => go('/mi-cuenta')} />
          <MenuAction icon={ShieldCheck} label="Admin del cliente" description="Dashboard del negocio" onClick={() => go('/admin')} />
        </div>

        <div className="mt-auto rounded-[2rem] border border-white/10 bg-black/45 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-sm font-black text-black">{tenantInitials(brandName)}</div>
            <div className="min-w-0"><p className="truncate font-black">{brandName}</p><p className="text-xs text-zinc-500">Tienda verificada Fabrick</p></div>
          </div>
        </div>
      </aside>
    </div>}
  </>;
}

function MenuAction({ icon: Icon, label, description, onClick }: { icon: typeof Home; label: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 text-left transition hover:bg-yellow-300 hover:text-black">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black/30"><Icon className="h-5 w-5" /></span>
    <span className="min-w-0"><span className="block text-lg font-black leading-tight">{label}</span><span className="mt-1 block text-xs opacity-60">{description}</span></span>
  </button>;
}
