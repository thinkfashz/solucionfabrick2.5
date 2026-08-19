import type { ReactNode } from 'react';

type BrandIconProps = {
  className?: string;
  title?: string;
};

/** Brand-shaped social icons used in public call-to-actions. */
function BrandIcon({ children, className = '', title, viewBox = '0 0 24 24' }: BrandIconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg aria-hidden={title ? undefined : true} aria-label={title} className={className} fill="currentColor" role={title ? 'img' : undefined} viewBox={viewBox} xmlns="http://www.w3.org/2000/svg">
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function InstagramBrandIcon(props: BrandIconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M7.25 2h9.5A5.25 5.25 0 0 1 22 7.25v9.5A5.25 5.25 0 0 1 16.75 22h-9.5A5.25 5.25 0 0 1 2 16.75v-9.5A5.25 5.25 0 0 1 7.25 2Zm-.17 2A3.08 3.08 0 0 0 4 7.08v9.84A3.08 3.08 0 0 0 7.08 20h9.84A3.08 3.08 0 0 0 20 16.92V7.08A3.08 3.08 0 0 0 16.92 4H7.08Zm10.67 1.62a1.28 1.28 0 1 1 0 2.56 1.28 1.28 0 0 1 0-2.56ZM12 6.65A5.35 5.35 0 1 1 6.65 12 5.36 5.36 0 0 1 12 6.65Zm0 2A3.35 3.35 0 1 0 15.35 12 3.35 3.35 0 0 0 12 8.65Z" />
    </BrandIcon>
  );
}

export function FacebookBrandIcon(props: BrandIconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M13.7 22v-8.23h2.76l.42-3.2H13.7V8.53c0-.93.26-1.56 1.59-1.56H17V4.11a22.4 22.4 0 0 0-2.46-.13c-2.43 0-4.1 1.48-4.1 4.21v2.38H7.68v3.2h2.76V22h3.26Z" />
    </BrandIcon>
  );
}

export function WhatsAppBrandIcon(props: BrandIconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M12.03 2a9.77 9.77 0 0 0-8.37 14.83L2.4 21.44l4.76-1.24A9.78 9.78 0 1 0 12.03 2Zm0 17.75a7.95 7.95 0 0 1-4.03-1.1l-.29-.17-2.83.74.76-2.76-.19-.29A7.95 7.95 0 1 1 12.03 19.75Zm4.36-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06a6.5 6.5 0 0 1-1.92-1.18 7.2 7.2 0 0 1-1.33-1.65c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.4-.54-.4h-.46a.89.89 0 0 0-.64.3c-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.15 1.52.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
    </BrandIcon>
  );
}

export function TikTokBrandIcon(props: BrandIconProps) {
  return (
    <BrandIcon {...props}>
      <path d="M16.7 3c.3 2.05 1.43 3.28 3.3 3.47v3.13a8.04 8.04 0 0 1-3.25-.92v6.16a6.05 6.05 0 1 1-5.24-6v3.2a2.95 2.95 0 1 0 2.1 2.82V3h3.1Z" />
    </BrandIcon>
  );
}
