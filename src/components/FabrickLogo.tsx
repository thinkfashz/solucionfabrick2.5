'use client';

/**
 * FabrickLogo
 * ----------------------------------------------------------------
 * Clean two-piece brand mark used everywhere in the public site.
 *
 *  ┌────┐  SOLUCIONES
 *  │ SF │  FABRICK
 *  └────┘
 *
 *  - "SF" badge in gold (#c9a96e dark / #b8860b light) with subtle shine.
 *  - "SOLUCIONES" thin uppercase, theme-aware text color.
 *  - "FABRICK" bold gold (matches accent token).
 *  - Single SVG-free DOM, no repetition, scales correctly on mobile.
 */

import { type KeyboardEvent } from 'react';

interface Props {
  /** Optional click handler — turns the logo into a button. */
  onClick?: () => void;
  /** Reserved for backwards compatibility. */
  animate?: boolean;
  /** Extra classes appended to the root container. */
  className?: string;
}

export default function FabrickLogo({ onClick, animate = true, className = '' }: Props) {
  const isInteractive = typeof onClick === 'function';
  const rootClass = [
    'group inline-flex select-none items-center gap-2.5 sm:gap-3',
    'transition-transform duration-300',
    isInteractive ? 'cursor-pointer hover:-translate-y-[1px]' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  const content = (
    <>
      {/* SF badge */}
      <span
        className={[
          'relative flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0',
          'items-center justify-center overflow-hidden rounded-xl',
          'border border-[var(--accent)]/40',
          'bg-gradient-to-br from-[var(--accent)] via-[var(--accent)] to-[var(--accent2,#b8860b)]',
          'shadow-[0_4px_14px_rgba(201,169,110,0.30)]',
          'transition-shadow duration-300 group-hover:shadow-[0_6px_22px_rgba(201,169,110,0.45)]',
          animate ? 'logo-sf-shine' : '',
        ].join(' ')}
      >
        {/* Top-left highlight */}
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.55),rgba(255,255,255,0)_55%)]" />
        {/* Mono-letter mark */}
        <span className="relative font-playfair text-[13px] sm:text-[14px] font-black tracking-[0.18em] text-black">
          SF
        </span>
      </span>

      {/* Wordmark */}
      <span className="flex flex-col leading-none">
        <span className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.32em] text-[var(--text)] opacity-80">
          Soluciones
        </span>
        <span className="font-playfair text-[15px] sm:text-[17px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
          Fabrick
        </span>
      </span>
    </>
  );

  if (isInteractive) {
    return (
      <div
        onClick={onClick}
        onKeyDown={handleKey}
        role="button"
        tabIndex={0}
        aria-label="Soluciones Fabrick — inicio"
        className={rootClass}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="Soluciones Fabrick — inicio"
      className={rootClass}
    >
      {content}
    </div>
  );
}
