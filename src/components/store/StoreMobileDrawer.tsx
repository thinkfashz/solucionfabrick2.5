'use client';

import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import {
  ChevronRight,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  UserPlus,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { TenantBranding } from '@/hooks/useTenantBranding';
import { StoreFabrickLogo } from '@/components/store/StorefrontChrome';

export type StoreDrawerFilters = {
  query: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  color: string;
  inStock: boolean;
};

export const EMPTY_STORE_FILTERS: StoreDrawerFilters = {
  query: '',
  category: 'all',
  minPrice: '',
  maxPrice: '',
  color: '',
  inStock: false,
};

const DEFAULT_COLORS = ['Negro', 'Blanco', 'Gris', 'Madera', 'Dorado', 'Cromo'];

export default function StoreMobileDrawer({
  open,
  branding,
  cartCount,
  authenticated,
  categories = [],
  colors = DEFAULT_COLORS,
  onClose,
  onCatalog,
  onInstallation,
  onCart,
  onLogin,
  onRegister,
  onDashboard,
  onOrders,
  onLogout,
  onApplyFilters,
}: {
  open: boolean;
  branding: TenantBranding;
  cartCount: number;
  authenticated: boolean;
  categories?: string[];
  colors?: string[];
  onClose: () => void;
  onCatalog: () => void;
  onInstallation: () => void;
  onCart: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onDashboard: () => void;
  onOrders: () => void;
  onLogout: () => void;
  onApplyFilters: (filters: StoreDrawerFilters) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<StoreDrawerFilters>(EMPTY_STORE_FILTERS);

  const categoryOptions = useMemo(() => ['all', ...Array.from(new Set(categories.filter(Boolean)))], [categories]);
  const activeFilters = useMemo(() => {
    let count = 0;
    if (filters.query.trim()) count += 1;
    if (filters.category !== 'all') count += 1;
    if (filters.minPrice.trim()) count += 1;
    if (filters.maxPrice.trim()) count += 1;
    if (filters.color.trim()) count += 1;
    if (filters.inStock) count += 1;
    return count;
  }, [filters]);

  function updateFilter<K extends keyof StoreDrawerFilters>(key: K, value: StoreDrawerFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function apply() {
    const clean: StoreDrawerFilters = {
      ...filters,
      query: filters.query.trim(),
      minPrice: filters.minPrice.trim(),
      maxPrice: filters.maxPrice.trim(),
      color: filters.color.trim(),
    };
    onApplyFilters(clean);
    onClose();
  }

  function clear() {
    setFilters(EMPTY_STORE_FILTERS);
    onApplyFilters(EMPTY_STORE_FILTERS);
  }

  function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') apply();
  }

  if (!open) return null;

  return <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-xl">
    <aside className="ml-auto flex h-full w-[92vw] max-w-[440px] flex-col overflow-hidden border-l border-yellow-300/10 bg-[#050505] text-white shadow-2xl shadow-black/80">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-5">
        <StoreFabrickLogo tone="dark" branding={branding} compact />
        <button onClick={onClose} className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] transition hover:bg-white/10" aria-label="Cerrar menú"><X className="h-6 w-6" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="rounded-[1.7rem] border border-yellow-300/15 bg-[radial-gradient(circle_at_100%_0%,rgba(250,204,21,.14),transparent_16rem),rgba(255,255,255,.035)] p-3">
          <div className="flex items-center gap-2">
            <label className="flex min-h-[52px] flex-1 items-center gap-3 rounded-[1.2rem] border border-white/10 bg-black/40 px-4">
              <Search className="h-5 w-5 shrink-0 text-zinc-500" />
              <input value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} onKeyDown={onSearchKeyDown} placeholder="Buscar producto, categoría o color" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-zinc-600" />
            </label>
            <button onClick={() => setFiltersOpen((value) => !value)} className="relative grid h-[52px] w-[52px] place-items-center rounded-[1.2rem] border border-yellow-300/25 bg-yellow-300/10 text-yellow-200 transition hover:bg-yellow-300 hover:text-black" aria-label="Abrir filtros">
              <SlidersHorizontal className="h-5 w-5" />
              {activeFilters > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-yellow-300 px-1 text-[10px] font-black text-black ring-2 ring-black">{activeFilters}</span>}
            </button>
          </div>

          {filtersOpen && <div className="mt-3 space-y-3 rounded-[1.3rem] border border-white/10 bg-black/35 p-3">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">Categoría</label>
              <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none">
                {categoryOptions.map((category) => <option key={category} value={category}>{category === 'all' ? 'Todas las categorías' : category}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="mb-1 block text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">Precio mín.</span><input value={filters.minPrice} onChange={(event) => updateFilter('minPrice', event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="$0" className="h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700" /></label>
              <label><span className="mb-1 block text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">Precio máx.</span><input value={filters.maxPrice} onChange={(event) => updateFilter('maxPrice', event.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" placeholder="$999.999" className="h-11 w-full rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none placeholder:text-zinc-700" /></label>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">Color / acabado</p>
              <div className="flex flex-wrap gap-2">{colors.map((color) => {
                const active = filters.color === color;
                return <button key={color} type="button" onClick={() => updateFilter('color', active ? '' : color)} className={`rounded-full px-3 py-2 text-xs font-black transition ${active ? 'bg-yellow-300 text-black' : 'border border-white/10 bg-black text-zinc-300 hover:border-yellow-300/30'}`}>{color}</button>;
              })}</div>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm font-semibold text-zinc-200"><input type="checkbox" checked={filters.inStock} onChange={(event) => updateFilter('inStock', event.target.checked)} className="h-4 w-4 accent-yellow-300" />Solo productos con stock</label>
            <div className="grid grid-cols-2 gap-2 pt-1"><button type="button" onClick={clear} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-300">Limpiar</button><button type="button" onClick={apply} className="rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-black">Aplicar</button></div>
          </div>}
        </section>

        <MenuSection title="Navegación">
          <MenuAction icon={Home} label="Catálogo" description="Productos disponibles" onClick={onCatalog} />
          <MenuAction icon={Wrench} label="Instalación" description="Servicio, despacho y coordinación" onClick={onInstallation} />
          <MenuAction icon={ShoppingBag} label={`Bolso de compra (${cartCount})`} description="Revisar productos agregados" onClick={onCart} highlight={cartCount > 0} />
        </MenuSection>

        <MenuSection title="Cuenta">
          {!authenticated ? <>
            <MenuAction icon={LogIn} label="Iniciar sesión" description="Entrar como cliente" onClick={onLogin} />
            <MenuAction icon={UserPlus} label="Crear cuenta" description="Registro rápido" onClick={onRegister} />
          </> : <>
            <MenuAction icon={LayoutDashboard} label="Panel cliente" description="Cuenta, datos y seguimiento" onClick={onDashboard} />
            <MenuAction icon={Package} label="Mis pedidos" description="Compras y estados" onClick={onOrders} />
            <MenuAction icon={LogOut} label="Cerrar sesión" description="Salir de tu cuenta" onClick={onLogout} />
          </>}
        </MenuSection>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/40 p-4">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-200/80"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Tienda segura</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Compra, cotiza o agenda instalación con respaldo de Soluciones Fabrick.</p>
        </div>
      </div>
    </aside>
  </div>;
}

function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mt-5"><p className="mb-3 text-[10px] font-black uppercase tracking-[.26em] text-yellow-200/75">{title}</p><div className="grid gap-3">{children}</div></section>;
}

function MenuAction({ icon: Icon, label, description, onClick, highlight = false }: { icon: LucideIcon; label: string; description: string; onClick: () => void; highlight?: boolean }) {
  return <button onClick={onClick} className={`group flex items-center gap-4 rounded-[1.55rem] border p-4 text-left transition ${highlight ? 'border-yellow-300/30 bg-yellow-300/[0.08]' : 'border-white/10 bg-white/[0.055] hover:border-yellow-300/25 hover:bg-yellow-300/[0.07]'}`}>
    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-[1.2rem] transition ${highlight ? 'bg-yellow-300 text-black' : 'bg-black/55 text-white group-hover:bg-yellow-300 group-hover:text-black'}`}><Icon className="h-6 w-6" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-xl font-black leading-tight text-white">{label}</span><span className="mt-1 block truncate text-sm font-semibold text-zinc-500 group-hover:text-zinc-300">{description}</span></span>
    <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600 group-hover:text-yellow-200" />
  </button>;
}
