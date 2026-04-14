'use client';

import React from 'react';
import { ShoppingBag, Menu } from 'lucide-react';
import FabrickLogo from '@/components/FabrickLogo';

interface StoreNavbarProps {
  cartCount: number;
  onCartToggle: () => void;
  onMenuToggle: () => void;
  cartIconRef: React.Ref<HTMLButtonElement>;
}

export default function StoreNavbar({ cartCount, onCartToggle, onMenuToggle, cartIconRef }: StoreNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-yellow-400/10">
      <button onClick={onMenuToggle} className="p-2 text-white/70 hover:text-yellow-400 transition-colors" aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      <div className="absolute left-1/2 -translate-x-1/2">
        <FabrickLogo className="!hover:scale-100" />
      </div>

      <button
        ref={cartIconRef}
        onClick={onCartToggle}
        className="relative p-2 text-white/70 hover:text-yellow-400 transition-colors"
        aria-label="Abrir carrito"
      >
        <ShoppingBag size={22} />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-yellow-400 text-black text-[10px] font-bold animate-bounce">
            {cartCount}
          </span>
        )}
      </button>
    </nav>
  );
}
