'use client';

/* ─────────────────────────────────────────────────────────────────────────
 * BrandMark — Logo SF de Soluciones Fabrick.
 * Construye un cuadrado dorado con efecto "ladrillos" (metáfora construcción)
 * + sweep de luz + corner ticks. Reusable en shell, drawer y loading.
 * ──────────────────────────────────────────────────────────────────────── */

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  withBricks?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { box: 'h-8 w-8 rounded-xl', text: 'text-[9px] tracking-[0.2em]', tick: 'h-1.5 w-1.5' },
  md: { box: 'h-10 w-10 rounded-xl', text: 'text-[10px] tracking-[0.22em]', tick: 'h-2 w-2' },
  lg: { box: 'h-12 w-12 rounded-2xl', text: 'text-[11px] tracking-[0.24em]', tick: 'h-2 w-2' },
  xl: { box: 'h-16 w-16 rounded-2xl', text: 'text-base tracking-[0.28em]', tick: 'h-2.5 w-2.5' },
};

export function BrandMark({ size = 'md', animated = true, withBricks = true, className = '' }: BrandMarkProps) {
  const s = sizeMap[size];
  return (
    <span
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden border border-yellow-300/45 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[0_8px_24px_rgba(250,204,21,0.4)] ${s.box} ${className}`}
    >
      {/* Brick texture (construction metaphor) */}
      {withBricks ? (
        <span
          className="absolute inset-0 opacity-25 mix-blend-overlay"
          style={{
            backgroundImage:
              'linear-gradient(0deg, rgba(0,0,0,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.4) 1px, transparent 1px)',
            backgroundSize: '8px 6px',
          }}
        />
      ) : null}

      {/* Top-left highlight */}
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.55),rgba(255,255,255,0)_55%)]" />

      {/* Animated sweep */}
      {animated ? (
        <span
          className="absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent"
          style={{ animation: 'brand-sweep 3.8s ease-in-out infinite' }}
        />
      ) : null}

      {/* Corner ticks (architecture / blueprint cue) */}
      <span className="pointer-events-none absolute left-1 top-1 h-1.5 w-1.5 border-l border-t border-black/45" />
      <span className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 border-b border-r border-black/45" />

      <span className={`relative font-playfair font-black uppercase text-black drop-shadow-[0_1px_0_rgba(255,255,255,0.35)] ${s.text}`}>
        SF
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
