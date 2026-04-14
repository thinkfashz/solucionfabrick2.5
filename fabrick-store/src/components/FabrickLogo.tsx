'use client';

interface Props {
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

export default function FabrickLogo({ className = '', animate = false, onClick }: Props) {
  return (
    <div
      className={`select-none cursor-pointer group transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={onClick}
    >
      {/* Mobile/tablet: usar el SVG como imagen */}
      <img
        src="/logo-soluciones-fabrick.svg"
        alt="Soluciones Fabrick"
        className="block md:hidden h-12 w-auto"
      />

      {/* Desktop: version vectorial nativa con relieve */}
      <div className="hidden md:flex items-center gap-4">
        <svg
          viewBox="0 0 420 220"
          className={`h-14 w-auto ${animate ? 'drop-shadow-[0_0_8px_rgba(255,199,0,0.35)]' : ''}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="roofTopDesktop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE17A" />
              <stop offset="70%" stopColor="#FFC700" />
              <stop offset="100%" stopColor="#E2AE00" />
            </linearGradient>
            <linearGradient id="roofSideDesktop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2AE00" />
              <stop offset="100%" stopColor="#BC8D00" />
            </linearGradient>
          </defs>

          <g transform="translate(0,8)">
            <path d="M 44 70 L 160 18 L 276 70 L 260 70 L 160 28 L 60 70 Z" fill="url(#roofTopDesktop)" />
            <path d="M 60 70 L 160 28 L 160 38 L 72 74 L 60 74 Z" fill="url(#roofSideDesktop)" />
            <path d="M 260 70 L 160 28 L 160 38 L 248 74 L 260 74 Z" fill="#CFA000" />
            <rect x="210" y="38" width="20" height="30" rx="2.5" fill="#FFC700" />
          </g>

          <g transform="translate(0,8)">
            <text
              x="160"
              y="128"
              textAnchor="middle"
              fontFamily="Montserrat, Poppins, Arial, sans-serif"
              fontSize="25"
              fontWeight="800"
              letterSpacing="2"
              fill="#222"
            >
              SOLUCIONES
            </text>
            <text
              x="160"
              y="154"
              textAnchor="middle"
              fontFamily="Montserrat, Poppins, Arial, sans-serif"
              fontSize="25"
              fontWeight="800"
              letterSpacing="2"
              fill="#000"
            >
              FABRICK
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
