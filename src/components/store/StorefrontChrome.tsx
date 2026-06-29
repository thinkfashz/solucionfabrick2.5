'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Home, LayoutDashboard, LogIn, Menu, Move, Search, ShieldCheck, ShoppingBag, Sun, UserPlus, Wrench, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCartContext } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { tenantInitials, useTenantBranding, type TenantBranding } from '@/hooks/useTenantBranding';
import { getInitials } from '@/lib/initials';
import { navigateWithTransition } from '@/lib/routeTransition';

export const FABRICK_LOGO_URL = 'https://res.cloudinary.com/disghf6xc/image/upload/v1781396959/fabrick/general/oiol0ydk8yc48f8p6iza.png';

function openExternalOrRoute(href: string, router: ReturnType<typeof useRouter>) {
  if (href.startsWith('http')) window.open(href, '_blank', 'noopener,noreferrer');
  else navigateWithTransition(href, router);
}

export function StoreFabrickLogo({ tone = 'dark', branding, compact = false }: { tone?: 'light' | 'dark'; branding: TenantBranding; compact?: boolean }) {
  const brandName = branding.name || 'Soluciones Fabrick';
  const logoUrl = branding.logoUrl || FABRICK_LOGO_URL;
  const textColor = tone === 'dark' ? 'text-white' : 'text-neutral-950';
  return <div className="flex min-w-0 items-center gap-3">
    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-yellow-300 p-1.5 text-sm font-black text-black shadow-[0_8px_32px_rgba(250,204,21,.22)]">
      <img src={logoUrl} alt={brandName} className="h-full w-full object-contain" loading="eager" />
    </div>
    {!compact && <span className={`max-w-[205px] truncate text-xs font-black uppercase tracking-[.2em] ${textColor}`}>{brandName}</span>}
    {compact && <span className={`max-w-[180px] truncate text-[11px] font-black uppercase tracking-[.18em] ${textColor}`}>{brandName}</span>}
  </div>;
}

export function StorefrontHeader({ onSearch }: { onSearch: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { branding } = useTenantBranding();
  const { theme, toggleTheme } = useTheme();
  const { openCart, totalItems } = useCartContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme === 'dark' || theme === 'gold';
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
    <nav className={`fixed left-0 top-0 z-[220] w-full border-b backdrop-blur-2xl ${isDark ? 'border-white/10 bg-black/88' : 'border-neutral-200 bg-white/92'}`}>
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-3 px-4 md:px-8">
        <button onClick={() => go('/tienda')} className="min-w-0 rounded-full" aria-label="Ir a tienda"><StoreFabrickLogo tone={isDark ? 'dark' : 'light'} branding={branding} compact /></button>
        <div className="hidden items-center gap-7 md:flex">
          <button onClick={() => go('/tienda/catalogo')} className="text-sm font-bold opacity-70 hover:opacity-100">Catálogo</button>
          <button onClick={contact} className="text-sm font-bold opacity-70 hover:opacity-100">Instalación</button>
          <button onClick={() => go('/mi-cuenta')} className="text-sm font-bold opacity-70 hover:opacity-100">Cliente</button>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={onSearch} className="grid h-10 w-10 place-items-center rounded-full opacity-75 transition hover:bg-white/10 hover:opacity-100" aria-label="Buscar"><Search size={20} /></button>
          <button onClick={toggleTheme} className="hidden h-10 w-10 place-items-center rounded-full opacity-65 transition hover:bg-white/10 hover:opacity-100 sm:grid" aria-label="Cambiar tema"><Sun size={18} /></button>
          <button onClick={openCart} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-yellow-300/30 bg-yellow-300 text-black shadow-[0_12px_34px_rgba(250,204,21,.18)] transition hover:scale-[1.04]" aria-label="Abrir bolso de compra">
            <ShoppingBag size={20} strokeWidth={2.8} />
            {totalItems > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-300 px-1 text-[10px] font-black text-black ring-2 ring-black">{totalItems}</span>}
          </button>
          {user ? <button onClick={() => go('/mi-cuenta')} className="hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-xs font-black sm:grid">{getInitials(user.name || user.email)}</button> : null}
          <button onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]" aria-label="Abrir menú"><Menu size={22} /></button>
        </div>
      </div>
    </nav>
    <div className="h-[68px]" />

    {menuOpen && <div className="fixed inset-0 z-[300] bg-black/76 backdrop-blur-xl">
      <aside className="ml-auto flex h-full w-[88vw] max-w-[430px] flex-col border-l border-white/10 bg-[#070707] p-5 text-white shadow-2xl shadow-black/70">
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function StoreFloatingAgent() {
  const { branding } = useTenantBranding();
  const { openCart, totalItems } = useCartContext();
  const [ready, setReady] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef({ active: false, moved: false, dx: 0, dy: 0 });
  const logoUrl = branding.logoUrl || FABRICK_LOGO_URL;

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('sf_store_agent_pos_v1') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        setPos({ x: clamp(parsed.x, 12, window.innerWidth - 78), y: clamp(parsed.y, 84, window.innerHeight - 92) });
        setReady(true);
        return;
      } catch {}
    }
    setPos({ x: Math.max(12, window.innerWidth - 92), y: Math.max(84, window.innerHeight - 154) });
    setReady(true);
  }, []);

  function save(next: { x: number; y: number }) {
    setPos(next);
    try { window.localStorage.setItem('sf_store_agent_pos_v1', JSON.stringify(next)); } catch {}
  }

  if (!ready) return null;

  return <button
    type="button"
    data-store-floating-agent=""
    onPointerDown={(event) => {
      drag.current = { active: true, moved: false, dx: event.clientX - pos.x, dy: event.clientY - pos.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={(event) => {
      if (!drag.current.active) return;
      const next = {
        x: clamp(event.clientX - drag.current.dx, 12, window.innerWidth - 78),
        y: clamp(event.clientY - drag.current.dy, 84, window.innerHeight - 92),
      };
      if (Math.abs(next.x - pos.x) > 2 || Math.abs(next.y - pos.y) > 2) drag.current.moved = true;
      setPos(next);
    }}
    onPointerUp={(event) => {
      const wasMoved = drag.current.moved;
      drag.current.active = false;
      save(pos);
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
      if (!wasMoved) openCart();
    }}
    className="fixed z-[260] grid h-[72px] w-[72px] touch-none place-items-center rounded-full border border-yellow-200/55 bg-yellow-300 p-2 text-black shadow-[0_18px_55px_rgba(250,204,21,.38),0_0_0_8px_rgba(250,204,21,.12)] transition active:scale-95"
    style={{ left: pos.x, top: pos.y }}
    aria-label="Agente Fabrick movible"
  >
    <span className="grid h-full w-full place-items-center rounded-full bg-black p-2">
      <img src={logoUrl} alt="Agente Soluciones Fabrick" className="h-full w-full object-contain" draggable={false} />
    </span>
    <span className="absolute -right-1 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-emerald-300 px-1 text-[10px] font-black text-black ring-4 ring-black">{totalItems > 0 ? totalItems : <Bot className="h-3.5 w-3.5" />}</span>
    <span className="absolute -left-1 bottom-1 grid h-6 w-6 place-items-center rounded-full bg-white text-black shadow-lg"><Move className="h-3.5 w-3.5" /></span>
  </button>;
}
