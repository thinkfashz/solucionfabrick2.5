import Image from 'next/image';

export const FABRICK_LOGOS = {
  dark: '/brand/soluciones-fabrick-dark.jpg',
  light: '/brand/soluciones-fabrick-light.jpg',
  lightClassic: '/brand/soluciones-fabrick-light-classic.jpg',
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

function logoForTheme(theme: FullLogoProps['theme']) {
  return theme === 'dark' ? FABRICK_LOGOS.light : FABRICK_LOGOS.dark;
}

/** Isotipo compacto derivado del archivo de marca oficial. */
export function FabrickPeakIcon({ size = 32, className = '' }: IconProps) {
  return (
    <span
      aria-label="Soluciones Fabrick"
      className={`inline-block shrink-0 overflow-hidden rounded-[22%] bg-black bg-no-repeat shadow-[0_6px_18px_rgba(0,0,0,0.22)] ${className}`}
      role="img"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${FABRICK_LOGOS.dark})`,
        backgroundPosition: '50% 36%',
        backgroundSize: '290% auto',
      }}
    />
  );
}

/** Logo horizontal oficial con variante clara u oscura según la superficie. */
export function FabrickFullLogo({
  theme = 'light',
  tagline,
  className = '',
  compact = false,
  priority = false,
}: FullLogoProps) {
  return (
    <span className={`inline-flex select-none flex-col items-center ${className}`}>
      <span className={`relative block shrink-0 overflow-hidden ${compact ? 'h-10 w-[152px]' : 'h-[76px] w-[270px]'}`}>
        <Image
          alt="Soluciones Fabrick"
          className="object-cover"
          fill
          priority={priority}
          sizes={compact ? '152px' : '270px'}
          src={logoForTheme(theme)}
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
