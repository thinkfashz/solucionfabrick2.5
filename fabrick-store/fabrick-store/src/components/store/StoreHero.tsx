'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function StoreHero() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Aura glow animated background */}
      <div className="aura-glow-bg absolute inset-0 pointer-events-none" />

      {/* Welcome box */}
      <div className="welcome-box relative z-10 text-center px-8 py-12 max-w-lg">
        <p className="text-yellow-400/70 text-xs tracking-[0.4em] uppercase mb-4">✦ Boutique Fabrick ✦</p>
        <h1 className="font-playfair text-4xl md:text-5xl leading-tight text-white mb-4 whitespace-pre-line">
          {'Bienvenido a la experiencia\nFabrick'}
        </h1>
        <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce">
        <span className="text-[10px] tracking-[0.3em] uppercase">Explorar</span>
        <ChevronDown size={16} />
      </div>
    </section>
  );
}
