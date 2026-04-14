'use client';

import { useId } from 'react';

interface Props {
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

export default function FabrickLogo({ className = '', animate = false, onClick }: Props) {
  const uid = useId().replace(/:/g, '');
  const ids = {
    roofTop: `fabRoofTop-${uid}`,
    roofSide: `fabRoofSide-${uid}`,
    glow: `fabGlow-${uid}`,
  };

  return (
    <div
      className={`select-none cursor-pointer transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 300 52"
        className={`h-10 md:h-12 w-auto ${animate ? 'drop-shadow-[0_0_10px_rgba(255,199,0,0.45)]' : ''}`}
        aria-label="Soluciones Fabrick"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={ids.roofTop} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE17A" />
            <stop offset="65%" stopColor="#FFC700" />
            <stop offset="100%" stopColor="#E2AE00" />
          </linearGradient>
          <linearGradient id={ids.roofSide} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A000" />
            <stop offset="100%" stopColor="#A07400" />
          </linearGradient>
          <filter id={ids.glow} x="-20%" y="-30%" width="140%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#FFC700" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Roof icon — apex at (30, 2), base at y=38 */}
        <g filter={`url(#${ids.glow})`}>
          {/* Top face */}
          <path d="M 2 37 L 30 3 L 58 37 L 52 37 L 30 9 L 8 37 Z" fill={`url(#${ids.roofTop})`} />
          {/* Left side face */}
          <path d="M 8 37 L 30 9 L 30 14 L 11 40 L 8 40 Z" fill={`url(#${ids.roofSide})`} />
          {/* Right side face */}
          <path d="M 52 37 L 30 9 L 30 14 L 49 40 L 52 40 Z" fill="#9A6E00" opacity="0.9" />
          {/* Window / accent block */}
          <rect x="39" y="15" width="7" height="12" rx="1.5" fill={`url(#${ids.roofTop})`} />
        </g>

        {/* SOLUCIONES */}
        <text
          x="72"
          y="22"
          fontFamily="Montserrat, Poppins, Arial, sans-serif"
          fontSize="10.5"
          fontWeight="700"
          letterSpacing="2.8"
          fill="#FFFFFF"
          opacity="0.72"
        >
          SOLUCIONES
        </text>

        {/* FABRICK */}
        <text
          x="72"
          y="44"
          fontFamily="Montserrat, Poppins, Arial, sans-serif"
          fontSize="21"
          fontWeight="900"
          letterSpacing="3.5"
          fill="#FFFFFF"
        >
          FABRICK
        </text>
      </svg>
    </div>
  );
}
