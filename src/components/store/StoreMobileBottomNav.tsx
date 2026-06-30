'use client';

import { Home, Search, ShoppingBag, SlidersHorizontal, UserRound } from 'lucide-react';

export default function StoreMobileBottomNav({
  cartCount,
  onHome,
  onSearch,
  onFilters,
  onCart,
  onProfile,
}: {
  cartCount: number;
  onHome: () => void;
  onSearch: () => void;
  onFilters: () => void;
  onCart: () => void;
  onProfile: () => void;
}) {
  return <nav className="fixed inset-x-3 bottom-3 z-[170] rounded-[2rem] border border-white/10 bg-black/82 px-3 py-2 text-white shadow-[0_18px_60px_rgba(0,0,0,.45)] backdrop-blur-2xl md:hidden" aria-label="Navegación tienda móvil">
    <div className="grid grid-cols-5 items-center gap-1">
      <BottomAction icon={Home} label="Inicio" onClick={onHome} active />
      <BottomAction icon={Search} label="Buscar" onClick={onSearch} />
      <button onClick={onFilters} className="mx-auto -mt-7 grid h-16 w-16 place-items-center rounded-full border-[6px] border-black bg-yellow-300 text-black shadow-[0_14px_42px_rgba(250,204,21,.28)] active:scale-95" aria-label="Filtros">
        <SlidersHorizontal className="h-6 w-6" />
      </button>
      <button onClick={onCart} className="relative grid gap-0.5 rounded-2xl px-2 py-2 text-center text-[10px] font-black text-zinc-400 transition active:scale-95" aria-label="Bolso de compra">
        <ShoppingBag className="mx-auto h-5 w-5" />
        <span>Bolso</span>
        {cartCount > 0 && <span className="absolute right-3 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-300 px-1 text-[10px] text-black ring-2 ring-black">{cartCount}</span>}
      </button>
      <BottomAction icon={UserRound} label="Perfil" onClick={onProfile} />
    </div>
  </nav>;
}

function BottomAction({ icon: Icon, label, active = false, onClick }: { icon: typeof Home; label: string; active?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`grid gap-0.5 rounded-2xl px-2 py-2 text-center text-[10px] font-black transition active:scale-95 ${active ? 'text-white' : 'text-zinc-500'}`}>
    <Icon className="mx-auto h-5 w-5" />
    <span>{label}</span>
  </button>;
}
