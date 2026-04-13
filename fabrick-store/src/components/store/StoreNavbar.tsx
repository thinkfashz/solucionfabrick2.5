'use client';

import React from 'react';
import { ShoppingBag, Menu } from 'lucide-react';

interface StoreNavbarProps {
  cartCount: number;
  onCartToggle: () => void;
  onMenuToggle: () => void;
  cartIconRef: React.Ref<HTMLButtonElement>;
}

export default function StoreNavbar({ cartCount, onCartToggle, onMenuToggle, cartIconRef }: StoreNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-yellow-400/10">
      {/* Menu hamburger */}
      <button onClick={onMenuToggle} className="p-2 text-white/70 hover:text-yellow-400 transition-colors">
        <Menu size={22} />
      </button>

      {/* Logo centrado */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="font-playfair text-xl tracking-[0.25em] text-white uppercase">Fabrick</span>
      </div>

      {/* Cart */}
      <button
        ref={cartIconRef}
        onClick={onCartToggle}
        className="relative p-2 text-white/70 hover:text-yellow-400 transition-colors"
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
