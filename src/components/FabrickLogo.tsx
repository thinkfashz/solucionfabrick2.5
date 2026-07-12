'use client';

import { FabrickNavLogo } from '@/components/FabrickBrandIcon';

interface Props {
  onClick?: () => void;
  animate?: boolean;
  className?: string;
  theme?: 'light' | 'dark';
}

export default function FabrickLogo({ onClick, className = '', theme = 'light' }: Props) {
  const isInteractive = typeof onClick === 'function';
  const rootClass = [
    'group inline-flex select-none items-center transition-transform duration-300',
    isInteractive ? 'cursor-pointer hover:-translate-y-0.5' : '',
    className,
  ].filter(Boolean).join(' ');

  if (isInteractive) {
    return (
      <button aria-label="Soluciones Fabrick — inicio" className={rootClass} onClick={onClick} type="button">
        <FabrickNavLogo theme={theme} />
      </button>
    );
  }

  return <div className={rootClass}><FabrickNavLogo theme={theme} /></div>;
}
