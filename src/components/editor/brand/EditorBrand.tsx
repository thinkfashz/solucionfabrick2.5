'use client';

/**
 * EditorBrand
 *
 * Centralised branding for the integrated 3D editor (pascal-editor port).
 * All upstream references to a Pascal logo are routed through this component
 * so that re-syncing with `pascalorg/editor` only requires re-applying the
 * `PascalLogo → EditorBrand` replacement.
 *
 * Two assets are reused from `public/`:
 *   - `/logo-soluciones-fabrick.svg`               full mark (light backgrounds)
 *   - `/logo-soluciones-fabrick-monocromo-claro.svg` monochrome white (dark UI)
 */

import Image from 'next/image';

export type EditorBrandVariant = 'full' | 'icon' | 'mono-light' | 'mono-dark';

interface EditorBrandProps {
  variant?: EditorBrandVariant;
  className?: string;
  /** Fixed pixel height; width auto-scales to preserve aspect-ratio. */
  height?: number;
  /** Optional clickable behaviour (e.g. "back to home"). */
  onClick?: () => void;
  ariaLabel?: string;
  priority?: boolean;
}

const ASSETS: Record<EditorBrandVariant, { src: string; alt: string }> = {
  full:         { src: '/logo-soluciones-fabrick.svg',                  alt: 'Soluciones Fabrick' },
  icon:         { src: '/app-icon.svg',                                 alt: 'Soluciones Fabrick' },
  'mono-light': { src: '/logo-soluciones-fabrick-monocromo-claro.svg',  alt: 'Soluciones Fabrick' },
  'mono-dark':  { src: '/logo-soluciones-fabrick-monocromo-oscuro.svg', alt: 'Soluciones Fabrick' },
};

export default function EditorBrand({
  variant = 'mono-light',
  className = '',
  height = 28,
  onClick,
  ariaLabel,
  priority = false,
}: EditorBrandProps) {
  const { src, alt } = ASSETS[variant];
  const isInteractive = typeof onClick === 'function';
  // Approximate aspect ratio of the wordmark so Image's width/height balance.
  const width = variant === 'icon' ? height : Math.round(height * 3.2);

  const content = (
    <Image
      src={src}
      alt={ariaLabel ?? alt}
      width={width}
      height={height}
      priority={priority}
      className="h-full w-auto select-none"
      draggable={false}
    />
  );

  if (!isInteractive) {
    return (
      <span
        className={`inline-flex items-center ${className}`}
        style={{ height }}
        aria-label={ariaLabel ?? alt}
        role="img"
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-yellow-electric ${className}`}
      style={{ height }}
      aria-label={ariaLabel ?? alt}
    >
      {content}
    </button>
  );
}

export { EditorBrand };
