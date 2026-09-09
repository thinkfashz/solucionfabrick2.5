'use client';

import { useState, type ChangeEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Grid2X2, Heart, Home, Menu, Package, Search, ShoppingCart, User, X } from 'lucide-react';
import { FabrickNavLogo } from '@/components/FabrickBrandIcon';
import { useCartContext } from '@/context/CartContext';
import { useTenantBranding, type TenantBranding } from '@/hooks/useTenantBranding';
import { navigateWithTransition } from '@/lib/routeTransition';

const YELLOW = '#F6C64A';
function goTo(href: string, router: ReturnType<typeof useRouter>) { navigateWithTransition(href, router); }

export function StoreFabrickLogo({ tone = 'dark', compact = false, branding }: { tone?: 'light' | 'dark'; branding: TenantBranding; compact?: boolean }) {
  if (branding.logoUrl) return <img src={branding.logoUrl} alt={branding.name} className={`${compact ? 'h-9 max-w-[190px]' : 'h-11 max-w-[230px]'} w-auto object-contain`} />;
  return <FabrickNavLogo theme={tone === 'dark' ? 'light' : 'dark'} />;
}

function syncCatalogSearch(value: string) {
  const input = document.getElementById('catalog-search') as HTMLInputElement | null;
  if (!input) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function StorefrontHeader({ onSearch }: { onSearch?: () => void }) {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { openCart, totalItems } = useCartContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState('');
  const changeSearch = (event: ChangeEvent<HTMLInputElement>) => { setMobileQuery(event.target.value); syncCatalogSearch(event.target.value); };

  return <>
    <nav className="sticky top-0 z-[180] border-b border-white/[.08] bg-[#060A0D]/97 text-white shadow-[0_10px_35px_rgba(0,0,0,.34)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1380px] px-3 py-2.5 md:flex md:h-[78px] md:items-center md:gap-6 md:px-8 md:py-0">
        <div className="flex h-12 items-center justify-between md:h-auto">
          <button onClick={() => setMenuOpen(true)} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.025] md:hidden" aria-label="Abrir menú"><Menu size={22}/></button>
          <button onClick={() => goTo('/tienda', router)} className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0" aria-label="Ir a tienda"><StoreFabrickLogo tone="dark" branding={branding} compact /></button>
          <button onClick={openCart} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#F6C64A]/30 bg-[#F6C64A] text-[#080A0D] shadow-[0_8px_24px_rgba(246,198,74,.18)] md:hidden" aria-label="Carrito"><ShoppingCart size={20}/>{totalItems>0?<span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-black">{totalItems}</span>:null}</button>
        </div>

        <label className="mt-2 flex h-12 items-center gap-3 rounded-[1.35rem] border border-white/14 bg-white/[.035] px-4 shadow-[inset_0_1px_rgba(255,255,255,.02)] md:mt-0 md:min-w-0 md:flex-1 md:max-w-[650px]">
          <Search size={19} className="shrink-0 text-white/55"/>
          <input value={mobileQuery} onChange={changeSearch} onFocus={onSearch} placeholder="¿Qué estás buscando para tu proyecto?" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/35" />
          {mobileQuery ? <button type="button" onClick={() => { setMobileQuery(''); syncCatalogSearch(''); }} className="grid h-7 w-7 place-items-center rounded-full bg-white/[.07]" aria-label="Limpiar búsqueda"><X size={14}/></button> : null}
        </label>

        <div className="hidden items-center gap-1 md:ml-auto md:flex">
          <button onClick={() => goTo('/mi-cuenta', router)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/82" aria-label="Mi cuenta"><User size={19}/></button>
          <button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#F6C64A] text-[#080A0D]" aria-label="Carrito"><ShoppingCart size={19}/>{totalItems>0?<span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-black">{totalItems}</span>:null}</button>
        </div>
      </div>
      <div className="hidden border-t border-white/[.055] md:block"><div className="mx-auto flex max-w-[1380px] items-center gap-6 px-8 py-2.5 text-[11px] font-bold text-white/52"><button onClick={() => goTo('/tienda', router)} className="text-white">Tienda</button><button onClick={() => goTo('/tienda/catalogo', router)}>Todos los productos</button><button onClick={() => goTo('/herramientas/radier', router)}>Calcula tu radier</button><button onClick={() => goTo('/herramientas/aire-acondicionado', router)}>Calcula tu aire</button><button onClick={() => goTo('/presupuesto', router)}>Cotizar proyecto</button></div></div>
    </nav>

    {menuOpen?<div className="fixed inset-0 z-[270] bg-black/70 backdrop-blur-sm md:hidden" onClick={()=>setMenuOpen(false)}><section className="absolute inset-x-3 top-3 rounded-[1.6rem] border border-white/10 bg-[#0A0E12] p-4 text-white shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><StoreFabrickLogo tone="dark" branding={branding} compact/><button onClick={()=>setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10"><X size={18}/></button></div><div className="mt-5 grid gap-2"><MenuLink label="Tienda" onClick={()=>{setMenuOpen(false);goTo('/tienda',router)}}/><MenuLink label="Todos los productos" onClick={()=>{setMenuOpen(false);goTo('/tienda/catalogo',router)}}/><MenuLink label="Calcula tu radier" onClick={()=>{setMenuOpen(false);goTo('/herramientas/radier',router)}}/><MenuLink label="Calcula tu aire ideal" onClick={()=>{setMenuOpen(false);goTo('/herramientas/aire-acondicionado',router)}}/><MenuLink label={`Carrito · ${totalItems}`} onClick={()=>{setMenuOpen(false);openCart()}}/></div></section></div>:null}
  </>;
}

function MenuLink({label,onClick}:{label:string;onClick:()=>void}) { return <button onClick={onClick} className="flex min-h-12 items-center justify-between rounded-xl border border-white/[.07] bg-white/[.025] px-4 text-left text-sm font-black"><span>{label}</span><span className="text-[#F6C64A]">→</span></button>; }
function DockItem({icon:Icon,label,active,onClick}:{icon:typeof Home;label:string;active?:boolean;onClick:()=>void}) { return <button onClick={onClick} className={`grid min-w-0 flex-1 place-items-center gap-1.5 py-2 text-[10px] font-extrabold transition ${active?'text-[#F6C64A]':'text-white/78'}`}><Icon className="h-[23px] w-[23px]" strokeWidth={active?2.8:2.1}/><span className="truncate">{label}</span></button>; }

export function StoreBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems, openCart } = useCartContext();
  const nav = (href:string) => goTo(href, router);
  return <nav className="fixed inset-x-0 bottom-0 z-[240] mx-auto flex min-h-[76px] items-start border-t border-white/10 bg-[#090D11]/98 px-1 pt-1.5 pb-[max(.35rem,env(safe-area-inset-bottom))] text-white shadow-[0_-16px_48px_rgba(0,0,0,.48)] backdrop-blur-2xl md:hidden" aria-label="Navegación de tienda">
    <DockItem icon={Home} label="Inicio" active={pathname==='/tienda'} onClick={()=>nav('/tienda')}/>
    <DockItem icon={Grid2X2} label="Categorías" active={pathname.includes('/catalogo')} onClick={()=>nav('/tienda/catalogo')}/>
    <DockItem icon={ShoppingCart} label={totalItems ? `Carrito ${totalItems}` : 'Carrito'} onClick={openCart}/>
    <DockItem icon={Heart} label="Favoritos" active={false} onClick={()=>nav('/mi-cuenta')}/>
    <DockItem icon={Package} label="Pedidos" active={pathname.startsWith('/mi-cuenta')} onClick={()=>nav('/mi-cuenta')}/>
  </nav>;
}

export const STOREFRONT_YELLOW = YELLOW;
