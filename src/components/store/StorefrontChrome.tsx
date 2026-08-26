'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, Home, LayoutGrid, Menu, Search, ShoppingBag, User, X, type LucideIcon } from 'lucide-react';
import { FabrickNavLogo } from '@/components/FabrickBrandIcon';
import { useCartContext } from '@/context/CartContext';
import { useTenantBranding, type TenantBranding } from '@/hooks/useTenantBranding';
import { navigateWithTransition } from '@/lib/routeTransition';

function goTo(href: string, router: ReturnType<typeof useRouter>) {
  navigateWithTransition(href, router);
}

export function StoreFabrickLogo({ tone = 'dark', compact = false, branding }: { tone?: 'light' | 'dark'; branding: TenantBranding; compact?: boolean }) {
  if (branding.logoUrl) {
    return <img src={branding.logoUrl} alt={branding.name} className={`${compact ? 'h-9 max-w-[180px]' : 'h-11 max-w-[220px]'} w-auto object-contain`} />;
  }
  return <FabrickNavLogo theme={tone === 'dark' ? 'light' : 'dark'} />;
}

export function StorefrontHeader({ onSearch }: { onSearch?: () => void }) {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { openCart, totalItems } = useCartContext();
  const [menuOpen, setMenuOpen] = useState(false);

  return <>
    <nav className="sticky top-0 z-[180] border-b border-black/8 bg-[#F4EFE6]/96 text-[#111214] backdrop-blur-xl">
      <div className="mx-auto flex h-[58px] max-w-[1320px] items-center justify-between gap-3 px-3 sm:px-5 md:h-[68px] md:px-8">
        <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-full md:hidden" aria-label="Abrir menú"><Menu size={21}/></button>
        <button onClick={() => goTo('/tienda', router)} className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0" aria-label="Ir a tienda"><StoreFabrickLogo tone="light" branding={branding} compact /></button>
        <div className="hidden items-center gap-6 md:flex"><button onClick={() => goTo('/tienda', router)} className="text-sm font-bold">Tienda</button><button onClick={() => goTo('/proyectos', router)} className="text-sm font-bold text-black/55">Inspiraciones</button><button onClick={() => goTo('/presupuesto', router)} className="text-sm font-bold text-black/55">Cotizar</button></div>
        <div className="flex items-center gap-1"><button onClick={onSearch} className="hidden h-10 w-10 place-items-center rounded-full md:grid" aria-label="Buscar"><Search size={19}/></button><button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-xl bg-[#F5871F]" aria-label="Carrito"><ShoppingBag size={19}/>{totalItems>0?<span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-black px-1 text-[10px] font-black text-white">{totalItems}</span>:null}</button></div>
      </div>
    </nav>
    {menuOpen?<div className="fixed inset-0 z-[260] bg-black/45 backdrop-blur-sm md:hidden" onClick={()=>setMenuOpen(false)}><section className="absolute inset-x-3 top-3 rounded-3xl bg-[#FFF9EE] p-4 shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><StoreFabrickLogo tone="light" branding={branding} compact/><button onClick={()=>setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-black text-white"><X size={18}/></button></div><div className="mt-5 grid grid-cols-2 gap-2"><Quick icon={LayoutGrid} title="Tienda" onClick={()=>{setMenuOpen(false);goTo('/tienda',router)}}/><Quick icon={ClipboardList} title="Presupuesto" onClick={()=>{setMenuOpen(false);goTo('/presupuesto',router)}}/><Quick icon={ShoppingBag} title={`Carrito · ${totalItems}`} onClick={()=>{setMenuOpen(false);openCart()}}/><Quick icon={User} title="Mis pedidos" onClick={()=>{setMenuOpen(false);goTo('/mi-cuenta',router)}}/></div></section></div>:null}
  </>;
}

function Quick({icon:Icon,title,onClick}:{icon:LucideIcon;title:string;onClick:()=>void}){return <button onClick={onClick} className="flex min-h-20 flex-col justify-between rounded-2xl bg-white p-4 text-left shadow-sm"><Icon size={19} className="text-[#B96F00]"/><b className="mt-3 text-sm">{title}</b></button>}
function NavItem({icon:Icon,label,active,onClick,badge}:{icon:LucideIcon;label:string;active?:boolean;onClick:()=>void;badge?:number}){return <button onClick={onClick} className={`relative grid min-w-0 flex-1 place-items-center gap-0.5 py-1 text-[10px] font-bold ${active?'text-[#F5871F]':'text-white/70'}`}><span className="relative"><Icon size={20} strokeWidth={active?2.7:2}/>{badge? <span className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#F5871F] px-1 text-[9px] font-black text-black">{badge}</span>:null}</span><span className="truncate">{label}</span></button>}

export function StoreBottomNav(){
  const pathname=usePathname(); const router=useRouter(); const {openCart,totalItems}=useCartContext(); const [open,setOpen]=useState(false);
  const nav=(href:string)=>goTo(href,router);
  return <>
    {open?<div className="fixed inset-0 z-[250] bg-black/55 backdrop-blur-sm md:hidden" onClick={()=>setOpen(false)}><section className="absolute inset-x-3 bottom-[78px] rounded-3xl bg-[#FFF9EE] p-4 text-[#111214] shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#B96F00]">Menú Fabrick</p><h2 className="mt-1 text-xl font-black">¿Qué quieres hacer?</h2></div><button onClick={()=>setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-black text-white"><X size={17}/></button></div><div className="mt-4 grid grid-cols-2 gap-2"><Quick icon={LayoutGrid} title="Explorar tienda" onClick={()=>{setOpen(false);nav('/tienda')}}/><Quick icon={ClipboardList} title="Cotizar obra" onClick={()=>{setOpen(false);nav('/presupuesto')}}/><Quick icon={ShoppingBag} title={`Ver carrito · ${totalItems}`} onClick={()=>{setOpen(false);openCart()}}/><Quick icon={User} title="Mi cuenta" onClick={()=>{setOpen(false);nav('/mi-cuenta')}}/></div></section></div>:null}
    <nav className="fixed inset-x-2 bottom-[calc(.35rem+env(safe-area-inset-bottom))] z-[240] mx-auto flex h-[62px] max-w-[500px] items-center rounded-2xl bg-[#111214]/97 px-1.5 text-white shadow-[0_12px_38px_rgba(0,0,0,.3)] backdrop-blur-xl md:hidden">
      <NavItem icon={Home} label="Inicio" active={pathname==='/'} onClick={()=>nav('/')}/>
      <NavItem icon={LayoutGrid} label="Tienda" active={pathname.startsWith('/tienda')} onClick={()=>nav('/tienda')}/>
      <button onClick={()=>setOpen(v=>!v)} className="mx-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F5871F] text-black" aria-label="Abrir menú">{open?<X size={21}/>:<Menu size={22}/>}</button>
      <NavItem icon={ShoppingBag} label="Carrito" onClick={openCart} badge={totalItems}/>
      <NavItem icon={User} label="Perfil" active={pathname.startsWith('/mi-cuenta')} onClick={()=>nav('/mi-cuenta')}/>
    </nav>
  </>;
}
