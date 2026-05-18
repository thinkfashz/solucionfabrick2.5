/**
 * FabrickBrandIcon — logo real de Soluciones Fabrick.
 * Pico arquitectónico dorado extraído del SVG oficial en /public.
 * Componente compartido: admin, frontend, tienda, login, transiciones.
 */

interface IconProps {
  /** Tamaño en píxeles del cuadrado contenedor */
  size?: number;
  className?: string;
}

interface FullLogoProps {
  /** 'light' = texto blanco (sobre fondos oscuros) | 'dark' = texto negro (sobre fondos claros) */
  theme?: 'light' | 'dark';
  className?: string;
  tagline?: string;
}

/** Sólo el pico dorado — para BrandMark, favicons, badges, etc. */
export function FabrickPeakIcon({ size = 32, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38 46"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Soluciones Fabrick"
      className={className}
    >
      <defs>
        <linearGradient id="peak-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE566" />
          <stop offset="100%" stopColor="#FFC700" />
        </linearGradient>
        <linearGradient id="peak-depth" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B37E00" />
          <stop offset="100%" stopColor="#D9A100" />
        </linearGradient>
      </defs>
      {/* Main peak */}
      <path d="M 2,42 L 19,4 L 36,42 L 30,42 L 19,12 L 8,42 Z" fill="url(#peak-gold)" />
      {/* Depth shadow on left face */}
      <path d="M 8,42 L 19,12 L 19,18 L 12,42 Z" fill="url(#peak-depth)" opacity="0.75" />
      {/* Right pillar / column */}
      <rect x="23" y="10" width="7" height="18" rx="1.5" fill="#FFC700" />
    </svg>
  );
}

/** Logo completo: pico + "SOLUCIONES" + "FABRICK" wordmark */
export function FabrickFullLogo({ theme = 'light', tagline, className = '' }: FullLogoProps) {
  const textPrimary = theme === 'light' ? '#ffffff' : '#111111';
  const textMuted   = theme === 'light' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';

  return (
    <div className={`inline-flex select-none items-center gap-2.5 ${className}`}>
      <FabrickPeakIcon size={36} />
      <div className="flex flex-col leading-tight">
        <span
          className="text-[9px] font-medium uppercase tracking-[0.32em]"
          style={{ color: textMuted }}
        >
          SOLUCIONES
        </span>
        <span
          className="text-[20px] font-black uppercase leading-none tracking-[0.08em]"
          style={{ color: textPrimary, fontFamily: 'Montserrat, Poppins, sans-serif' }}
        >
          FABRICK
        </span>
        {tagline && (
          <span
            className="mt-0.5 text-[9px] uppercase tracking-[0.28em]"
            style={{ color: textMuted }}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}

/** Versión compacta para navbars: pico + "Fabrick" en una línea */
export function FabrickNavLogo({ theme = 'light', className = '' }: Omit<FullLogoProps, 'tagline'>) {
  const textPrimary = theme === 'light' ? '#ffffff' : '#111111';
  const textMuted   = theme === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';

  return (
    <div className={`inline-flex select-none items-center gap-2 ${className}`}>
      <FabrickPeakIcon size={28} />
      <span className="flex flex-col leading-none">
        <span
          className="text-[13px] font-black uppercase tracking-widest"
          style={{ color: textPrimary }}
        >
          Fabrick
        </span>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: textMuted }}>
          Soluciones
        </span>
      </span>
    </div>
  );
}
