'use client';

interface Props {
  className?: string;
  animate?: boolean;
  onClick?: () => void;
  /** Versión compacta (solo ícono + letras pequeñas, para navbars) */
  compact?: boolean;
  /** Versión centrada (para footers y pantallas de bienvenida) */
  centered?: boolean;
  active?: boolean;
}

/**
 * Logo SVG puro de Soluciones Fabrick.
 * Totalmente vectorial — sin img/png → sin blur en ningún dispositivo.
 */
export default function FabrickLogo({
  className = '',
  animate = false,
  onClick,
  compact = false,
  centered = false,
  active = false,
}: Props) {
  const glowClass = active || animate ? 'drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : '';

  if (compact) {
    /* ── Versión mini: solo el ícono de techo ── */
    return (
      <div
        onClick={onClick}
        className={`select-none cursor-pointer flex items-center gap-2 group transition-transform duration-300 hover:scale-[1.03] ${className}`}
      >
        <svg viewBox="0 0 56 48" className={`h-8 w-auto ${glowClass}`} aria-hidden="true">
          <defs>
            <linearGradient id="lg-top-c" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE17A" />
              <stop offset="70%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#E2AE00" />
            </linearGradient>
            <linearGradient id="lg-side-c" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2AE00" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
          </defs>
          {/* Techo */}
          <path d="M4 30 L28 8 L52 30 L46 30 L28 14 L10 30Z" fill="url(#lg-top-c)" />
          <path d="M10 30 L28 14 L28 20 L14 32 L10 32Z" fill="url(#lg-side-c)" />
          <path d="M46 30 L28 14 L28 20 L42 32 L46 32Z" fill="#CFA000" />
          {/* Chimenea */}
          <rect x="34" y="13" width="7" height="10" rx="1" fill="#FACC15" />
        </svg>
        <div className="flex flex-col leading-none">
          <span className="font-black uppercase tracking-[0.25em] text-white text-[9px]">Soluciones</span>
          <span className="font-black uppercase tracking-[0.45em] text-[var(--accent)] text-[7px] mt-0.5">Fabrick</span>
        </div>
      </div>
    );
  }

  if (centered) {
    /* ── Versión centrada: ícono grande + texto debajo ── */
    return (
      <div
        onClick={onClick}
        className={`select-none cursor-pointer flex flex-col items-center gap-3 group transition-transform duration-300 hover:scale-[1.02] ${className}`}
      >
        <svg viewBox="0 0 80 70" className={`h-16 w-auto ${glowClass}`} aria-hidden="true">
          <defs>
            <linearGradient id="lg-top-cent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE17A" />
              <stop offset="70%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#E2AE00" />
            </linearGradient>
            <linearGradient id="lg-side-cent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2AE00" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
          </defs>
          <path d="M6 42 L40 10 L74 42 L66 42 L40 18 L14 42Z" fill="url(#lg-top-cent)" />
          <path d="M14 42 L40 18 L40 26 L20 46 L14 46Z" fill="url(#lg-side-cent)" />
          <path d="M66 42 L40 18 L40 26 L60 46 L66 46Z" fill="#CFA000" />
          <rect x="50" y="18" width="10" height="16" rx="1.5" fill="#FACC15" />
        </svg>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-black uppercase tracking-[0.35em] text-white text-sm">Soluciones</span>
          <span className="font-black uppercase tracking-[0.6em] text-[var(--accent)] text-[10px]">Fabrick</span>
        </div>
      </div>
    );
  }

  /* ── Versión estándar (navbar principal) ── */
  return (
    <div
      onClick={onClick}
      className={`select-none cursor-pointer flex items-center gap-4 group transition-transform duration-300 hover:scale-[1.02] ${className}`}
    >
      {/* Ícono SVG con halo */}
      <div className="relative flex-shrink-0">
        <div className={`absolute inset-0 bg-yellow-400/20 blur-xl rounded-full transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
        <svg viewBox="0 0 60 52" className={`h-9 w-auto relative z-10 ${glowClass}`} aria-hidden="true">
          <defs>
            <linearGradient id="lg-top-std" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE17A" />
              <stop offset="70%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#E2AE00" />
            </linearGradient>
            <linearGradient id="lg-side-std" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2AE00" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
          </defs>
          <path d="M4 34 L30 8 L56 34 L49 34 L30 15 L11 34Z" fill="url(#lg-top-std)" />
          <path d="M11 34 L30 15 L30 22 L16 36 L11 36Z"       fill="url(#lg-side-std)" />
          <path d="M49 34 L30 15 L30 22 L44 36 L49 36Z"       fill="#CFA000" />
          <rect x="36" y="13" width="9" height="14" rx="1.5"   fill="#FACC15" />
        </svg>
      </div>

      {/* Texto — separado del ícono con gap-4, nunca se superpone */}
      <div className="flex flex-col leading-none gap-[3px]">
        <span className="font-black uppercase tracking-[0.24em] text-white/90 text-[11px] group-hover:text-white transition-colors whitespace-nowrap">
          Soluciones
        </span>
        <span className="font-black uppercase tracking-[0.5em] text-yellow-400 text-[8px] whitespace-nowrap">
          Fabrick
        </span>
      </div>
    </div>
  );
}
