import Image from 'next/image';

const MASTER_LOGO = '/brand/soluciones-fabrick.svg';
const WEB_LOGO = '/brand/soluciones-fabrick-web.svg';
const MOBILE_LOGO = '/brand/soluciones-fabrick-mobile.svg';

export const FABRICK_LOGOS = {
  primary: WEB_LOGO,
  web: WEB_LOGO,
  mobile: MOBILE_LOGO,
  onDark: WEB_LOGO,
  onLight: WEB_LOGO,
  mark: '/brand/soluciones-fabrick-mark.svg',
  markOnLight: '/brand/soluciones-fabrick-mark-on-light.svg',
  social: WEB_LOGO,
  email: '/brand/soluciones-fabrick-email.png',
  dark: WEB_LOGO,
  light: WEB_LOGO,
  lightClassic: MASTER_LOGO,
} as const;

interface IconProps {
  size?: number;
  className?: string;
  theme?: 'light' | 'dark';
}

interface FullLogoProps {
  theme?: 'light' | 'dark';
  className?: string;
  tagline?: string;
  compact?: boolean;
  priority?: boolean;
  responsive?: boolean;
}

export function FabrickPeakIcon({ size = 32, className = '', theme = 'light' }: IconProps) {
  const src = theme === 'dark' ? FABRICK_LOGOS.markOnLight : FABRICK_LOGOS.mark;
  return (
    <span
      aria-label="Soluciones Fabrick"
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      role="img"
      style={{ width: size, height: size }}
    >
      <Image alt="" className="object-contain" fill sizes={`${size}px`} src={src} unoptimized />
    </span>
  );
}

export function FabrickFullLogo({
  theme = 'light',
  tagline,
  className = '',
  compact = false,
  priority = false,
  responsive = true,
}: FullLogoProps) {
  const desktopBox = compact ? 'h-[72px] w-[300px]' : 'h-[170px] w-[min(82vw,720px)]';
  const mobileBox = compact ? 'h-[64px] w-[230px]' : 'h-[104px] w-[min(88vw,420px)]';

  return (
    <span className={`inline-flex select-none flex-col items-center ${className}`}>
      {responsive ? (
        <>
          <span className={`relative block shrink-0 md:hidden ${mobileBox}`}>
            <Image
              alt="Soluciones Fabrick"
              className="object-contain"
              fill
              priority={priority}
              sizes={compact ? '230px' : '(max-width: 767px) 88vw, 420px'}
              src={FABRICK_LOGOS.mobile}
              unoptimized
            />
          </span>
          <span className={`relative hidden shrink-0 md:block ${desktopBox}`}>
            <Image
              alt="Soluciones Fabrick"
              className="object-contain"
              fill
              priority={priority}
              sizes={compact ? '300px' : '(max-width: 1280px) 82vw, 720px'}
              src={FABRICK_LOGOS.web}
              unoptimized
            />
          </span>
        </>
      ) : (
        <span className={`relative block shrink-0 ${compact ? 'h-[72px] w-[300px]' : 'h-[170px] w-[min(82vw,720px)]'}`}>
          <Image
            alt="Soluciones Fabrick"
            className="object-contain"
            fill
            priority={priority}
            sizes={compact ? '300px' : '(max-width: 1280px) 82vw, 720px'}
            src={FABRICK_LOGOS.web}
            unoptimized
          />
        </span>
      )}
      {tagline ? (
        <span className={`mt-1 text-center uppercase tracking-[0.24em] ${compact ? 'text-[8px]' : 'text-[9px]'} ${theme === 'light' ? 'text-white/55' : 'text-black/50'}`}>
          {tagline}
        </span>
      ) : null}
    </span>
  );
}

export function FabrickNavLogo({ theme = 'light', className = '' }: Omit<FullLogoProps, 'tagline'>) {
  return <FabrickFullLogo className={className} compact responsive theme={theme} />;
}
