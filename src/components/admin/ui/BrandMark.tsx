'use client';

import { FabrickNavLogo, FabrickPeakIcon } from '@/components/FabrickBrandIcon';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  withBricks?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-8 w-8 rounded-xl', icon: 18 },
  md: { box: 'h-10 w-10 rounded-xl', icon: 22 },
  lg: { box: 'h-12 w-12 rounded-2xl', icon: 26 },
  xl: { box: 'h-16 w-16 rounded-2xl', icon: 34 },
};

export function BrandMark({ size = 'md', animated = true, className = '' }: BrandMarkProps) {
  const s = sizeMap[size];
  return (
    <span
      className={`admin-brand-mark-lava relative flex flex-shrink-0 items-center justify-center overflow-hidden border border-yellow-100/20 bg-black text-yellow-200 shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${s.box} ${className}`}
    >
      {animated && (
        <>
          <span className="absolute inset-y-0 -left-full z-[3] w-1/2 bg-gradient-to-r from-transparent via-white/65 to-transparent [animation:brand-sweep_3.8s_ease-in-out_infinite]" />
          <span className="absolute inset-0 z-[2] rounded-[inherit] bg-[radial-gradient(circle_at_50%_25%,rgba(255,241,214,.20),transparent_45%)]" />
        </>
      )}

      <span className="relative z-10 drop-shadow-[0_0_12px_rgba(250,204,21,.55)]">
        <FabrickPeakIcon size={s.icon} />
      </span>

      <style jsx>{`
        @keyframes brand-sweep {
          0% { transform: translateX(0%); opacity: 0; }
          20% { opacity: .9; }
          58% { transform: translateX(420%); opacity: 0; }
          100% { transform: translateX(420%); opacity: 0; }
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
          <span className="h-1 w-1 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(255,106,31,0.75)] animate-pulse" />
          <span className="text-[9px] uppercase tracking-[0.32em] text-[#fff1d6]/65">{tagline}</span>
        </span>
      ) : null}
    </span>
  );
}
