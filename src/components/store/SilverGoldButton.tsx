'use client';

import React from 'react';

interface SilverGoldButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export default function SilverGoldButton({ children, onClick, className = '', disabled = false }: SilverGoldButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden px-8 py-3 rounded-full font-medium tracking-wider text-sm
        bg-gradient-to-r from-gray-300 via-yellow-400 to-gray-300
        text-black shadow-lg
        transition-all duration-300
        hover:scale-105 hover:shadow-[0_0_30px_rgba(250,204,21,0.4)]
        active:scale-95
        disabled:opacity-40 disabled:pointer-events-none
        ${className}
      `}
    >
      {/* Shine sweep */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
