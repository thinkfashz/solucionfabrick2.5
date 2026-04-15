'use client';

interface Props {
  className?: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function FabrickLogo({ className = '', animate = false, size = 'md', onClick }: Props) {
  const heights: Record<string, string> = { sm: 'h-10', md: 'h-14', lg: 'h-20' };
  const h = heights[size] ?? heights.md;

  return (
    <div
      className={`select-none cursor-pointer transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      <img
        src="/logo-soluciones-fabrick.svg"
        alt="Soluciones Fabrick"
        className={`${h} w-auto object-contain ${animate ? 'drop-shadow-[0_0_12px_rgba(255,199,0,0.5)]' : ''}`}
      />
    </div>
  );
}
