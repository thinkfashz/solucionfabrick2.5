'use client';

import { FabrickNavLogo, FabrickPeakIcon } from '@/components/FabrickBrandIcon';

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
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden border border-white/15 bg-black shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${s.box} ${className}`}
    >
      {/* Animated light sweep */}
      {animated && (
        <span className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent [animation:brand-sweep_3.8s_ease-in-out_infinite]" />
      )}

      <span className="relative z-10">
        <FabrickPeakIcon size={s.icon} />
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

export function BrandWordmark({ tagline, className = '' }: { tagline?: string; className?: string }) {
  return (
    <span className={`flex min-w-0 flex-col items-start leading-none ${className}`}>
      <FabrickNavLogo theme="light" />
      {tagline ? (
        <span className="mt-1 flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse" />
          <span className="text-[9px] uppercase tracking-[0.32em] text-white/55">{tagline}</span>
        </span>
      ) : null}
    </span>
  );
}
