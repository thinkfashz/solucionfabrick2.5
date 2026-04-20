'use client';

interface Props {
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

export default function FabrickLogo({ className = '', animate = false, onClick }: Props) {
  return (
    <div
      className={`select-none cursor-pointer transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      <svg
        viewBox="0 0 214 52"
        className={`h-10 md:h-12 w-auto ${animate ? 'drop-shadow-[0_0_12px_rgba(255,199,0,0.5)]' : ''}`}
        role="img"
        aria-label="Soluciones Fabrick"
      >
        <defs>
          <linearGradient id="fl-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE566" />
            <stop offset="100%" stopColor="#FFC700" />
          </linearGradient>
          <linearGradient id="fl-depth" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#B37E00" />
            <stop offset="100%" stopColor="#D9A100" />
          </linearGradient>
        </defs>

        {/* Icon: bold architectural peak / gable mark */}
        {/* Outer chevron body */}
        <path d="M 2,46 L 21,4 L 40,46 L 33,46 L 21,13 L 9,46 Z" fill="url(#fl-gold)" />
        {/* Left depth facet */}
        <path d="M 9,46 L 21,13 L 21,19 L 14,46 Z" fill="url(#fl-depth)" opacity="0.75" />
        {/* Chimney / stack accent */}
        <rect x="25" y="11" width="8" height="20" rx="1.5" fill="#FFC700" />

        {/* Separator */}
        <line x1="52" y1="9" x2="52" y2="44" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />

        {/* Wordmark */}
        <text
          x="61"
          y="26"
          fontFamily="Montserrat, Poppins, Arial, sans-serif"
          fontSize="9.5"
          fontWeight="500"
          letterSpacing="3"
          fill="rgba(255,255,255,0.5)"
        >
          SOLUCIONES
        </text>
        <text
          x="60"
          y="47"
          fontFamily="Montserrat, Poppins, Arial, sans-serif"
          fontSize="25"
          fontWeight="900"
          letterSpacing="1.5"
          fill="#FFFFFF"
        >
          FABRICK
        </text>
      </svg>
    </div>
  );
}
