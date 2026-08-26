'use client';

import { useState, type ChangeEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, Home, LayoutGrid, Menu, Search, ShoppingBag, User, X, type LucideIcon } from 'lucide-react';
import { FabrickNavLogo } from '@/components/FabrickBrandIcon';
import { useCartContext } from '@/context/CartContext';
import { useTenantBranding, type TenantBranding } from '@/hooks/useTenantBranding';
import { navigateWithTransition } from '@/lib/routeTransition';

function goTo(href: string, router: ReturnType<typeof useRouter>) { navigateWithTransition(href, router); }

export function StoreFabrickLogo({ tone = 'dark', compact = false, branding }: { tone?: 'light' | 'dark'; branding: TenantBranding; compact?: boolean }) {
  if (branding.logoUrl) return <img src={branding.logoUrl} alt={branding.name} className={`${compact ? 'h-9 max-w-[178px]' : 'h-11 max-w-[220px]'} w-auto object-contain`} />;
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
    <style>{`@media(max-width:767px){label:has(#catalog-search){display:none!important}div:has(>label>#catalog-search){position:relative!important;top:auto!important;margin-top:.5rem!important;padding-top:.25rem!important}}`}</style>
    <nav className="sticky top-0 z-[180] border-b border-black/10 bg-[#F4EFE6]/98 text-[#111214] shadow-[0_8px_26px_rgba(0,0,0,.06)] backdrop-blur-xl">
      <div className="mx-auto max-w-[1320px] px-3 pb-3 pt-2 md:flex md:h-[68px] md:items-center md:justify-between md:gap-6 md:px-8 md:py-0">
        <div className="flex h-12 items-center justify-between md:h-auto">
          <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-full md:hidden" aria-label="Abrir menú"><Menu size={21}/></button>
          <button onClick={() => goTo('/tienda', router)} className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0" aria-label="Ir a tienda"><StoreFabrickLogo tone="light" branding={branding} compact /></button>
          <button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#F5871F] md:hidden" aria-label="Carrito"><ShoppingBag size={19}/>{totalItems>0?<span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#111214] px-1 text-[10px] font-black text-white">{totalItems}</span>:null}</button>
        </div>

        <label className="flex h-11 items-center gap-3 rounded-[1.25rem] border border-black/8 bg-white px-4 shadow-sm md:hidden">
          <Search size={18} className="shrink-0 text-[#A86700]"/>
          <input value={mobileQuery} onChange={changeSearch} onFocus={onSearch} placeholder="Buscar en Soluciones Fabrick" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-black/38" />
          {mobileQuery ? <button type="button" onClick={() => { setMobileQuery(''); syncCatalogSearch(''); }} className="grid h-7 w-7 place-items-center rounded-full bg-black/5" aria-label="Limpiar búsqueda"><X size={14}/></button> : null}
        </label>

        <div className="hidden items-center gap-6 md:flex"><button onClick={() => goTo('/tienda', router)} className="text-sm font-bold">Tienda</button><button onClick={() => goTo('/proyectos', router)} className="text-sm font-bold text-black/55">Inspiraciones</button><button onClick={() => goTo('/presupuesto', router)} className="text-sm font-bold text-black/55">Cotizar</button></div>
        <div className="hidden items-center gap-1 md:flex"><button onClick={onSearch} className="grid h-10 w-10 place-items-center rounded-full" aria-label="Buscar"><Search size={19}/></button><button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#F5871F]" aria-label="Carrito"><ShoppingBag size={19}/>{totalItems>0?<span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] font-black text-white">{totalItems}</span>:null}</button></div>
      </div>
    </nav>

    {menuOpen?<div className="fixed inset-0 z-[270] bg-black/50 backdrop-blur-sm md:hidden" onClick={()=>setMenuOpen(false)}><section className="absolute inset-x-3 top-3 rounded-[1.8rem] bg-[#FFF9EE] p-4 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><StoreFabrickLogo tone="light" branding={branding} compact/><button onClick={()=>setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-black text-white"><X size={18}/></button></div><div className="mt-5 grid grid-cols-2 gap-2"><Quick icon={LayoutGrid} title="Tienda" onClick={()=>{setMenuOpen(false);goTo('/tienda',router)}}/><Quick icon={ClipboardList} title="Presupuesto" onClick={()=>{setMenuOpen(false);goTo('/presupuesto',router)}}/><Quick icon={ShoppingBag} title={`Carrito · ${totalItems}`} onClick={()=>{setMenuOpen(false);openCart()}}/><Quick icon={User} title="Mis pedidos" onClick={()=>{setMenuOpen(false);goTo('/mi-cuenta',router)}}/></div></section></div>:null}
  </>;
}

function Quick({icon:Icon,title,onClick}:{icon:LucideIcon;title:string;onClick:()=>void}) { return <button onClick={onClick} className="flex min-h-[76px] flex-col justify-between rounded-2xl bg-white p-3 text-left shadow-sm"><Icon size={18} className="text-[#B96F00]"/><b className="mt-2 text-sm">{title}</b></button>; }
function DockItem({icon:Icon,label,active,onClick}:{icon:LucideIcon;label:string;active?:boolean;onClick:()=>void}) { return <button onClick={onClick} className={`grid min-w-0 flex-1 place-items-center gap-1 py-2 text-[10px] font-black transition ${active?'text-[#FFF2D8]':'text-white/82'}`}><Icon className="h-[22px] w-[22px]" strokeWidth={active?2.8:2}/><span className="truncate">{label}</span></button>; }

export function StoreBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { openCart, totalItems } = useCartContext();
  const [open, setOpen] = useState(false);
  const nav = (href:string) => { setOpen(false); goTo(href, router); };

  return <>
    {open?<div className="fixed inset-0 z-[250] bg-black/58 backdrop-blur-sm md:hidden" onClick={()=>setOpen(false)}><section className="absolute inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] rounded-[1.8rem] bg-[#FFF9EE] p-4 text-[#111214] shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#B96F00]">Menú Fabrick</p><h2 className="mt-1 text-xl font-black">¿Qué quieres hacer?</h2></div><button onClick={()=>setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-black text-white"><X size={17}/></button></div><div className="mt-4 grid grid-cols-2 gap-2"><Quick icon={LayoutGrid} title="Explorar tienda" onClick={()=>nav('/tienda')}/><Quick icon={ClipboardList} title="Cotizar obra" onClick={()=>nav('/presupuesto')}/><Quick icon={ShoppingBag} title={`Ver carrito · ${totalItems}`} onClick={()=>{setOpen(false);openCart()}}/><Quick icon={User} title="Mi cuenta" onClick={()=>nav('/mi-cuenta')}/></div></section></div>:null}

    <nav className="fixed inset-x-3 bottom-[calc(.55rem+env(safe-area-inset-bottom))] z-[240] mx-auto flex h-[76px] max-w-[520px] items-center rounded-[2rem] border border-[#D8A66B]/40 bg-[linear-gradient(105deg,rgba(74,51,36,.96),rgba(130,91,57,.94),rgba(77,54,39,.96))] px-2 text-white shadow-[0_18px_52px_rgba(37,23,13,.34)] backdrop-blur-2xl md:hidden" aria-label="Navegación principal">
      <DockItem icon={Home} label="Inicio" active={pathname==='/' } onClick={()=>nav('/')}/>
      <DockItem icon={ClipboardList} label="Presupuesto" active={pathname.startsWith('/presupuesto')} onClick={()=>nav('/presupuesto')}/>
      <button onClick={()=>setOpen(v=>!v)} className="relative -mt-7 grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#F5871F] text-[#111214] shadow-[0_12px_30px_rgba(245,135,31,.38)] ring-[5px] ring-[#4D3627]" aria-label="Abrir menú">{open?<X size={24}/>:<Menu size={27}/>}<span className="absolute -bottom-[18px] rounded-full bg-[#4D3627] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em] text-[#FFF0D6]">Menú</span></button>
      <DockItem icon={LayoutGrid} label="Tienda" active={pathname.startsWith('/tienda')} onClick={()=>nav('/tienda')}/>
      <DockItem icon={User} label="Perfil" active={pathname.startsWith('/mi-cuenta')} onClick={()=>nav('/mi-cuenta')}/>
      {totalItems>0?<button onClick={openCart} aria-label="Abrir carrito" className="absolute -right-1 -top-3 grid h-9 min-w-9 place-items-center rounded-full bg-[#111214] px-2 text-xs font-black text-[#FFB000] shadow-lg ring-2 ring-[#F4EFE6]"><ShoppingBag size={15}/><span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-400 px-1 text-[9px] text-black">{totalItems}</span></button>:null}
    </nav>
  </>;
}
