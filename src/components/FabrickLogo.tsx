'use client';

interface Props {
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

export default function FabrickLogo({ className = '', animate = false, onClick }: Props) {
  const isInteractive = typeof onClick === 'function';

  return (
    <div
      className={`select-none transition-all duration-300 hover:scale-[1.02] group ${isInteractive ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={isInteractive ? 'button' : 'img'}
      aria-label="Soluciones Fabrick"
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Mobile: compact inline SVG */}
      <svg
        viewBox="0 0 180 60"
        className={`block md:hidden h-10 w-auto ${animate ? 'drop-shadow-[0_0_8px_rgba(255,199,0,0.45)]' : ''}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="roofMob" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE17A" />
            <stop offset="60%" stopColor="#FFC700" />
            <stop offset="100%" stopColor="#C8A000" />
          </linearGradient>
          <linearGradient id="roofSideMob" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8A000" />
            <stop offset="100%" stopColor="#8B6F00" />
          </linearGradient>
        </defs>
        {/* Roof peak */}
        <path d="M14 26 L38 10 L62 26 L57 26 L38 13 L19 26 Z" fill="url(#roofMob)" />
        <path d="M19 26 L38 13 L38 18 L22 28 L19 28 Z" fill="url(#roofSideMob)" />
        <path d="M57 26 L38 13 L38 18 L54 28 L57 28 Z" fill="#A07800" />
        {/* Chimney */}
        <rect x="49" y="14" width="7" height="10" rx="1" fill="#FFC700" />
        {/* Text: SOLUCIONES */}
        <text x="80" y="24" textAnchor="middle" fontFamily="Montserrat,Arial,sans-serif"
          fontSize="9" fontWeight="800" letterSpacing="1.5" fill="var(--fg,#fff)">
          SOLUCIONES
        </text>
        {/* Text: FABRICK */}
        <text x="80" y="38" textAnchor="middle" fontFamily="Montserrat,Arial,sans-serif"
          fontSize="12" fontWeight="900" letterSpacing="2" fill="#FFC700">
          FABRICK
        </text>
      </svg>

      {/* Desktop: full inline SVG */}
      <svg
        viewBox="0 0 300 68"
        className={`hidden md:block h-14 w-auto ${animate ? 'drop-shadow-[0_0_10px_rgba(255,199,0,0.4)]' : ''}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="roofDesk" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE17A" />
            <stop offset="65%" stopColor="#FFC700" />
            <stop offset="100%" stopColor="#C8A000" />
          </linearGradient>
          <linearGradient id="roofSideDesk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8A000" />
            <stop offset="100%" stopColor="#8B6F00" />
          </linearGradient>
          <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="#FFC700" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* House icon */}
        <path d="M10 38 L42 10 L74 38 L67 38 L42 15 L17 38 Z" fill="url(#roofDesk)" />
        <path d="M17 38 L42 15 L42 22 L21 40 L17 40 Z" fill="url(#roofSideDesk)" />
        <path d="M67 38 L42 15 L42 22 L63 40 L67 40 Z" fill="#8B6F00" />
        {/* Chimney */}
        <rect x="55" y="19" width="9" height="16" rx="1.5" fill="#FFC700" />
        {/* Divider under roof */}
        <line x1="10" y1="41" x2="74" y2="41" stroke="rgba(255,199,0,0.3)" strokeWidth="0.5" />

        {/* Brand text */}
        <text x="152" y="28" textAnchor="middle" fontFamily="Montserrat,Arial,sans-serif"
          fontSize="11" fontWeight="700" letterSpacing="3" fill="var(--fg,#fff)">
          SOLUCIONES
        </text>
        <text x="152" y="48" textAnchor="middle" fontFamily="Montserrat,Arial,sans-serif"
          fontSize="18" fontWeight="900" letterSpacing="3.5" fill="#FFC700">
          FABRICK
        </text>
        {/* Accent underline */}
        <rect x="110" y="53" width="84" height="1.5" rx="1" fill="url(#accentLine)" />
      </svg>
    </div>
  );
}
