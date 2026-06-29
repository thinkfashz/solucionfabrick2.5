'use client';

import { useRouter } from 'next/navigation';
import { Menu, Search, ShoppingBag, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCartContext } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { getInitials } from '@/lib/initials';
import { navigateWithTransition } from '@/lib/routeTransition';
import StoreMobileDrawer, { type StoreDrawerFilters } from '@/components/store/StoreMobileDrawer';
import { StoreFabrickLogo } from '@/components/store/StorefrontChrome';

export type { StoreDrawerFilters } from '@/components/store/StoreMobileDrawer';

function openExternalOrRoute(href: string, router: ReturnType<typeof useRouter>) {
  if (href.startsWith('http')) window.open(href, '_blank', 'noopener,noreferrer');
  else navigateWithTransition(href, router);
}

export default function StorefrontHeaderV2({
  onSearch,
  onApplyFilters,
  categories = [],
  colors,
}: {
  onSearch: () => void;
  onApplyFilters?: (filters: StoreDrawerFilters) => void;
  categories?: string[];
  colors?: string[];
}) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { branding } = useTenantBranding();
  const { theme, toggleTheme } = useTheme();
  const { openCart, totalItems } = useCartContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme === 'dark' || theme === 'gold';
  const supportLink = branding.whatsappUrl || '/contacto';

  function go(href: string) {
    setMenuOpen(false);
    navigateWithTransition(href, router);
  }

  function contact() {
    setMenuOpen(false);
    openExternalOrRoute(supportLink, router);
  }

  async function handleLogout() {
    await signOut();
    setMenuOpen(false);
    navigateWithTransition('/tienda', router);
  }

  function applyFilters(filters: StoreDrawerFilters) {
    if (onApplyFilters) {
      onApplyFilters(filters);
      return;
    }
    const params = new URLSearchParams();
    if (filters.query) params.set('buscar', filters.query);
    if (filters.category !== 'all') params.set('categoria', filters.category);
    if (filters.minPrice) params.set('min', filters.minPrice);
    if (filters.maxPrice) params.set('max', filters.maxPrice);
    if (filters.color) params.set('color', filters.color);
    if (filters.inStock) params.set('stock', '1');
    navigateWithTransition(`/tienda${params.toString() ? `?${params.toString()}` : ''}`, router);
  }

  return <>
    <nav className={`fixed left-0 top-0 z-[180] w-full border-b backdrop-blur-2xl ${isDark ? 'border-white/10 bg-black/88' : 'border-neutral-200 bg-white/92'}`}>
      <div className="mx-auto flex h-[68px] max-w-[1320px] items-center justify-between gap-3 px-4 md:px-8">
        <button onClick={() => go('/tienda')} className="min-w-0 rounded-full" aria-label="Ir a tienda"><StoreFabrickLogo tone={isDark ? 'dark' : 'light'} branding={branding} compact /></button>
        <div className="hidden items-center gap-7 md:flex">
          <button onClick={() => go('/tienda')} className="text-sm font-bold opacity-70 hover:opacity-100">Catálogo</button>
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
          {user ? <button onClick={() => go('/mi-cuenta')} className="hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-xs font-black sm:grid">{getInitials(user.name || user.email || 'SF')}</button> : null}
          <button onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]" aria-label="Abrir menú"><Menu size={22} /></button>
        </div>
      </div>
    </nav>
    <div className="h-[68px]" />

    <StoreMobileDrawer
      open={menuOpen}
      branding={branding}
      cartCount={totalItems}
      authenticated={Boolean(user)}
      categories={categories}
      colors={colors}
      onClose={() => setMenuOpen(false)}
      onCatalog={() => go('/tienda')}
      onInstallation={contact}
      onCart={() => { setMenuOpen(false); openCart(); }}
      onLogin={() => go('/auth')}
      onRegister={() => go('/registro')}
      onDashboard={() => go('/mi-cuenta')}
      onOrders={() => go('/mi-cuenta')}
      onLogout={() => void handleLogout()}
      onApplyFilters={applyFilters}
    />
  </>;
}
