import Image from 'next/image';

export const FABRICK_LOGOS = {
  primary: '/brand/soluciones-fabrick-transparent.png',
  mark: '/brand/soluciones-fabrick-mark-transparent.png',
  dark: '/brand/soluciones-fabrick-transparent.png',
  light: '/brand/soluciones-fabrick-transparent.png',
  lightClassic: '/brand/soluciones-fabrick-transparent.png',
} as const;

interface IconProps {
  size?: number;
  className?: string;
}

interface FullLogoProps {
  /** `light` se usa sobre fondos oscuros; `dark`, sobre fondos claros. */
  theme?: 'light' | 'dark';
  className?: string;
  tagline?: string;
  compact?: boolean;
  priority?: boolean;
}

/** Isotipo compacto derivado del archivo de marca oficial. */
export function FabrickPeakIcon({ size = 32, className = '' }: IconProps) {
  return (
    <span
      aria-label="Soluciones Fabrick"
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      role="img"
      style={{ width: size, height: size }}
    >
      <Image alt="" className="object-contain" fill sizes={`${size}px`} src={FABRICK_LOGOS.mark} />
    </span>
  );
}

/** Logo horizontal oficial sin fondo; funciona sobre superficies claras u oscuras. */
export function FabrickFullLogo({
  theme = 'light',
  tagline,
  className = '',
  compact = false,
  priority = false,
}: FullLogoProps) {
  return (
    <span className={`inline-flex select-none flex-col items-center ${className}`}>
      <span className={`relative block shrink-0 ${compact ? 'h-14 w-[190px]' : 'h-[108px] w-[330px] max-w-[82vw]'}`}>
        <Image
          alt="Soluciones Fabrick"
          className="object-contain"
          fill
          priority={priority}
          sizes={compact ? '190px' : '(max-width: 480px) 82vw, 330px'}
          src={FABRICK_LOGOS.primary}
        />
      </span>
      {tagline ? (
        <span className={`mt-1 text-center uppercase tracking-[0.24em] ${compact ? 'text-[8px]' : 'text-[9px]'} ${theme === 'light' ? 'text-white/55' : 'text-black/50'}`}>
          {tagline}
        </span>
      ) : null}
    </span>
  );
}

/** Versión optimizada para barras de navegación. */
export function FabrickNavLogo({ theme = 'light', className = '' }: Omit<FullLogoProps, 'tagline'>) {
  return <FabrickFullLogo className={className} compact theme={theme} />;
}
