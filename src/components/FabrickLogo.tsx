'use client';

import { type KeyboardEvent } from 'react';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

interface Props {
  onClick?: () => void;
  animate?: boolean;
  className?: string;
}

export default function FabrickLogo({ onClick, className = '' }: Props) {
  const isInteractive = typeof onClick === 'function';

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); }
  };

  const content = (
    <>
      <FabrickPeakIcon size={34} />
      <span className="flex flex-col leading-tight">
        <span className="text-xs font-black uppercase tracking-widest text-white sm:text-sm">
          Fabrick
        </span>
        <span className="text-[9px] font-light uppercase tracking-widest text-zinc-500 sm:text-[10px]">
          Soluciones
        </span>
      </span>
    </>
  );

  const rootClass = [
    'group inline-flex select-none items-center gap-2 sm:gap-2.5',
    'transition-transform duration-300',
    isInteractive ? 'cursor-pointer hover:-translate-y-0.5' : '',
    className,
  ].filter(Boolean).join(' ');

  if (isInteractive) {
    return (
      <div onClick={onClick} onKeyDown={handleKey} role="button" tabIndex={0} aria-label="Soluciones Fabrick — inicio" className={rootClass}>
        {content}
      </div>
    );
  }

  return (
    <div role="img" aria-label="Soluciones Fabrick — inicio" className={rootClass}>
      {content}
    </div>
  );
}
