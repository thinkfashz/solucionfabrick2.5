import Image from 'next/image';

const MASTER_LOGO = '/brand/soluciones-fabrick.svg';
const WEB_LOGO = '/brand/soluciones-fabrick-web.svg';
const MOBILE_LOGO = '/brand/soluciones-fabrick-mobile.svg';

export const FABRICK_LOGOS = {
  primary: MASTER_LOGO,
  web: WEB_LOGO,
  mobile: MOBILE_LOGO,
  onDark: MASTER_LOGO,
  onLight: MASTER_LOGO,
  mark: '/brand/soluciones-fabrick-mark.svg',
  markOnLight: '/brand/soluciones-fabrick-mark-on-light.svg',
  social: MASTER_LOGO,
  email: '/brand/soluciones-fabrick-email.png',
  dark: MASTER_LOGO,
  light: MASTER_LOGO,
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
      <Image
        alt=""
        className="object-contain drop-shadow-[0_0_14px_rgba(244,164,36,.28)]"
        fill
        sizes={`${size}px`}
        src={src}
        unoptimized
      />
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
  const desktopBox = compact ? 'h-[56px] w-[205px]' : 'h-[170px] w-[min(78vw,640px)]';
  const mobileBox = compact ? 'h-[68px] w-[104px]' : 'h-[clamp(190px,48vw,250px)] w-[clamp(160px,44vw,220px)]';

  return (
    <span className={`inline-flex select-none flex-col items-center ${className}`}>
      {responsive ? (
        <>
          <span className={`relative block shrink-0 md:hidden ${mobileBox}`}>
            <Image
              alt="Soluciones Fabrick"
              className="object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,.34)]"
              fill
              priority={priority}
              sizes={compact ? '104px' : '(max-width: 767px) 44vw, 220px'}
              src={FABRICK_LOGOS.mobile}
              unoptimized
            />
          </span>
          <span className={`relative hidden shrink-0 md:block ${desktopBox}`}>
            <Image
              alt="Soluciones Fabrick"
              className="object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,.3)]"
              fill
              priority={priority}
              sizes={compact ? '205px' : '(max-width: 1280px) 78vw, 640px'}
              src={FABRICK_LOGOS.web}
              unoptimized
            />
          </span>
        </>
      ) : (
        <span className={`relative block shrink-0 ${compact ? 'h-[58px] w-[190px]' : 'h-[126px] w-[360px] max-w-[94vw]'}`}>
          <Image
            alt="Soluciones Fabrick"
            className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,.26)]"
            fill
            priority={priority}
            sizes={compact ? '190px' : '(max-width: 480px) 94vw, 360px'}
            src={FABRICK_LOGOS.primary}
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
