'use client';

import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  withBricks?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-8 w-8 rounded-xl',  icon: 18 },
  md: { box: 'h-10 w-10 rounded-xl', icon: 22 },
  lg: { box: 'h-12 w-12 rounded-2xl', icon: 26 },
  xl: { box: 'h-16 w-16 rounded-2xl', icon: 34 },
};

export function BrandMark({ size = 'md', animated = true, className = '' }: BrandMarkProps) {
  const s = sizeMap[size];
  return (
    <span
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden border border-yellow-300/45 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[0_8px_24px_rgba(250,204,21,0.4)] ${s.box} ${className}`}
    >
      {/* Top-left highlight */}
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.5),rgba(255,255,255,0)_55%)]" />

      {/* Animated light sweep */}
      {animated && (
        <span className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent [animation:brand-sweep_3.8s_ease-in-out_infinite]" />
      )}

      {/* Corner ticks (architecture cue) */}
      <span className="pointer-events-none absolute left-1 top-1 h-1.5 w-1.5 border-l border-t border-black/40" />
      <span className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r border-black/40" />

      {/* Real logo icon */}
      <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
        <FabrickPeakIconDark size={s.icon} />
      </span>

      <style jsx>{`
        @keyframes brand-sweep {
          0%   { transform: translateX(0%); }
          55%  { transform: translateX(420%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </span>
  );
}

/** Versión oscura del pico para usar sobre fondo dorado */
function FabrickPeakIconDark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* On a gold background, use black/dark tones for the icon */}
      <path d="M 2,42 L 19,4 L 36,42 L 30,42 L 19,12 L 8,42 Z" fill="rgba(0,0,0,0.75)" />
      <path d="M 8,42 L 19,12 L 19,18 L 12,42 Z" fill="rgba(0,0,0,0.45)" />
      <rect x="23" y="10" width="7" height="18" rx="1.5" fill="rgba(0,0,0,0.6)" />
    </svg>
  );
}

export function BrandWordmark({ tagline, className = '' }: { tagline?: string; className?: string }) {
  return (
    <span className={`flex min-w-0 flex-col leading-none ${className}`}>
      <span className="font-playfair text-[12px] font-black tracking-[0.26em] text-yellow-300">SOLUCIONES FABRICK</span>
      {tagline ? (
        <span className="mt-1 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
          <span className="text-[9px] uppercase tracking-[0.32em] text-white/55">{tagline}</span>
        </span>
      ) : null}
    </span>
  );
}
