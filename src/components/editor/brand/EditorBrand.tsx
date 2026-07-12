'use client';

import Image from 'next/image';
import { FABRICK_LOGOS } from '@/components/FabrickBrandIcon';

export type EditorBrandVariant = 'full' | 'icon' | 'mono-light' | 'mono-dark';

interface EditorBrandProps {
  variant?: EditorBrandVariant;
  className?: string;
  height?: number;
  onClick?: () => void;
  ariaLabel?: string;
  priority?: boolean;
}

const ASSETS: Record<EditorBrandVariant, string> = {
  full: FABRICK_LOGOS.onLight,
  icon: FABRICK_LOGOS.mark,
  'mono-light': FABRICK_LOGOS.onDark,
  'mono-dark': FABRICK_LOGOS.onLight,
};

export default function EditorBrand({ variant = 'mono-light', className = '', height = 28, onClick, ariaLabel = 'Soluciones Fabrick', priority = false }: EditorBrandProps) {
  const isInteractive = typeof onClick === 'function';
  const width = variant === 'icon' ? height : Math.round(height * 3.6);
  const content = (
    <span aria-hidden="true" className="relative block shrink-0 overflow-hidden" style={{ height, width }}>
      <Image alt="" className="select-none object-contain" draggable={false} fill priority={priority} sizes={`${width}px`} src={ASSETS[variant]} unoptimized />
    </span>
  );

  if (!isInteractive) return <span aria-label={ariaLabel} className={`inline-flex items-center ${className}`} role="img">{content}</span>;

  return <button aria-label={ariaLabel} className={`inline-flex items-center rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-yellow-electric ${className}`} onClick={onClick} type="button">{content}</button>;
}

export { EditorBrand };
