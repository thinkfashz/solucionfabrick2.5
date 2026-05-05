'use client';

/**
 * FabrickLogo — Simplified Version
 * ----------------------------------------------------------------
 * Clean minimal brand mark for all public site use.
 *
 *  Simple house/building geometric icon + FABRICK wordmark
 *  Minimal, professional, scalable
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
    'group inline-flex select-none items-center gap-2 sm:gap-3',
    'transition-transform duration-300',
    isInteractive ? 'cursor-pointer hover:-translate-y-0.5' : '',
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
      {/* Simplified geometric icon */}
      <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center">
        <svg
          viewBox="0 0 64 64"
          className="h-full w-full text-yellow-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Foundation line */}
          <line x1="8" y1="48" x2="56" y2="48" />

          {/* Left wall */}
          <line x1="12" y1="48" x2="12" y2="28" />

          {/* Right wall */}
          <line x1="52" y1="48" x2="52" y2="28" />

          {/* Roof left */}
          <line x1="12" y1="28" x2="32" y2="12" />

          {/* Roof right */}
          <line x1="32" y1="12" x2="52" y2="28" />

          {/* Door */}
          <rect x="28" y="34" width="8" height="14" />
          <circle cx="35" cy="41" r="1" fill="currentColor" />
        </svg>
      </div>

      {/* Wordmark */}
      <span className="flex flex-col leading-tight">
        <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">
          Fabrick
        </span>
        <span className="text-[9px] sm:text-[10px] font-light uppercase tracking-widest text-zinc-500">
          Soluciones
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
