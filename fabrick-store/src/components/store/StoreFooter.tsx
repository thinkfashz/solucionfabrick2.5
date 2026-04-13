'use client';

import React from 'react';
import { Instagram, Facebook } from 'lucide-react';

export default function StoreFooter() {
  return (
    <footer className="py-16 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Logo */}
        <p className="font-playfair text-lg tracking-[0.25em] text-white/60 uppercase mb-4">Fabrick</p>

        {/* Social */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <a href="#" className="text-white/30 hover:text-yellow-400 transition-colors">
            <Instagram size={18} />
          </a>
          <a href="#" className="text-white/30 hover:text-yellow-400 transition-colors">
            <Facebook size={18} />
          </a>
          {/* TikTok placeholder */}
          <a href="#" className="text-white/30 hover:text-yellow-400 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
            </svg>
          </a>
        </div>

        <p className="text-[11px] text-white/20 tracking-widest">
          © {new Date().getFullYear()} Fabrick. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
