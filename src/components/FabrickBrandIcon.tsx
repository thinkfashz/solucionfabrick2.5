import Image from 'next/image';

export const FABRICK_LOGOS = {
  primary: '/brand/soluciones-fabrick.svg',
  onDark: '/brand/soluciones-fabrick.svg',
  onLight: '/brand/soluciones-fabrick-on-light.svg',
  mark: '/brand/soluciones-fabrick-mark.svg',
  markOnLight: '/brand/soluciones-fabrick-mark-on-light.svg',
  social: '/brand/soluciones-fabrick-social.png',
  email: '/brand/soluciones-fabrick-email.png',
  dark: '/brand/soluciones-fabrick-on-light.svg',
  light: '/brand/soluciones-fabrick.svg',
  lightClassic: '/brand/soluciones-fabrick-on-light.svg',
} as const;

interface IconProps {
  size?: number;
  className?: string;
  /** `light` se usa sobre fondos oscuros; `dark`, sobre fondos claros. */
  theme?: 'light' | 'dark';
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
export function FabrickPeakIcon({ size = 32, className = '', theme = 'light' }: IconProps) {
  const src = theme === 'dark' ? FABRICK_LOGOS.markOnLight : FABRICK_LOGOS.mark;
  return (
    <span
      aria-label="Soluciones Fabrick"
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      role="img"
      style={{ width: size, height: size }}
    >
      <Image
        alt=""
        className={`object-contain ${theme === 'light' ? 'drop-shadow-[0_0_10px_rgba(244,200,91,.28)]' : ''}`}
        fill
        sizes={`${size}px`}
        src={src}
        unoptimized
      />
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
      <span className={`relative block shrink-0 ${compact ? 'h-10 w-[150px]' : 'h-24 w-[290px] max-w-[92vw]'}`}>
        <Image
          alt="Soluciones Fabrick"
          className={`object-contain ${theme === 'light' ? 'drop-shadow-[0_0_16px_rgba(244,200,91,.22)]' : ''}`}
          fill
          priority={priority}
          sizes={compact ? '150px' : '(max-width: 480px) 92vw, 290px'}
          src={theme === 'dark' ? FABRICK_LOGOS.onLight : FABRICK_LOGOS.onDark}
          unoptimized
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
