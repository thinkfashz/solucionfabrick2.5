'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Home, LayoutGrid, Award, User, Settings } from 'lucide-react';

const MENU_ITEMS = [
  { label: 'Inicio', icon: Home },
  { label: 'Ver Catálogo', icon: LayoutGrid },
  { label: 'Garantías', icon: Award },
  { label: 'Mi Cuenta', icon: User },
  { label: 'Ajustes', icon: Settings },
];

const ITEM_H = 64;

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  onExit: () => void;
}

export default function MenuDrawer({ open, onClose, onExit }: MenuDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const idx = Math.round(scrollRef.current.scrollTop / ITEM_H);
    setActiveIdx(Math.max(0, Math.min(idx, MENU_ITEMS.length - 1)));
  }, []);

  const handleSelect = useCallback(() => {
    if (activeIdx === 0) {
      onExit();
    }
    onClose();
  }, [activeIdx, onExit, onClose]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      setActiveIdx(0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[210]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-0 bottom-0 w-72 bg-black/95 border-l border-yellow-400/10 flex flex-col">
        {/* Close */}
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Wheel selector */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="relative w-full" style={{ height: ITEM_H * 3, perspective: '600px' }}>
            {/* Active indicator */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-16 rounded-lg border border-yellow-400/20 bg-yellow-400/5 pointer-events-none" />

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="absolute inset-0 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
              style={{ scrollPaddingTop: ITEM_H }}
            >
              {/* Top padding */}
              <div style={{ height: ITEM_H }} />

              {MENU_ITEMS.map((item, i) => {
                const isActive = i === activeIdx;
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={handleSelect}
                    className={`snap-center w-full flex items-center gap-4 px-4 transition-all duration-300 ${
                      isActive
                        ? 'text-yellow-400 scale-100 opacity-100'
                        : 'text-white/25 scale-90 opacity-50'
                    }`}
                    style={{ height: ITEM_H }}
                  >
                    <Icon size={18} />
                    <span className="text-sm tracking-widest uppercase">{item.label}</span>
                  </button>
                );
              })}

              {/* Bottom padding */}
              <div style={{ height: ITEM_H }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
