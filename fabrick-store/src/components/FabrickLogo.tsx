'use client';

interface Props {
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

export default function FabrickLogo({ className = '', animate = false, onClick }: Props) {
  return (
    <div
      className={`flex items-center gap-3 md:gap-4 select-none cursor-pointer group transition-all duration-300 hover:scale-[1.02] ${className}`}
      onClick={onClick}
      role="img"
      aria-label="Soluciones Fabrick"
    >
      {/* SF Monogram — funciona en mobile y desktop */}
      <div className="relative flex-shrink-0 w-10 h-10 md:w-12 md:h-12">
        <svg
          viewBox="0 0 68 62"
          className="w-full h-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <filter id="sf-glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="sf-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FACC15" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Fondo glow sutil */}
          <circle cx="34" cy="31" r="28" fill="url(#sf-bg)" />

          {/* S — trazo estático */}
          <path
            d="M 28 12 Q 20 8, 12 14 Q 6 18, 8 24 Q 10 30, 18 32 Q 26 34, 28 40 Q 30 46, 22 50 Q 14 52, 8 48"
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* F — trazo estático */}
          <path
            d="M 46 50 L 46 14 Q 46 8, 52 8 L 62 8 M 46 29 L 56 29"
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* S — luz viajera */}
          <path
            pathLength="100"
            d="M 28 12 Q 20 8, 12 14 Q 6 18, 8 24 Q 10 30, 18 32 Q 26 34, 28 40 Q 30 46, 22 50 Q 14 52, 8 48"
            fill="none"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="20 100"
            style={{
              animation: 'run-light 3.2s ease-in-out infinite',
              filter: 'drop-shadow(0 0 6px #FACC15) drop-shadow(0 0 12px rgba(250,204,21,0.4))',
              opacity: 0.9,
            }}
          />

          {/* F — luz viajera */}
          <path
            pathLength="100"
            d="M 46 50 L 46 14 Q 46 8, 52 8 L 62 8 M 46 29 L 56 29"
            fill="none"
            stroke="#FACC15"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="20 100"
            style={{
              animation: 'run-light 3.6s ease-in-out infinite',
              animationDelay: '-0.6s',
              filter: 'drop-shadow(0 0 6px #FACC15) drop-shadow(0 0 12px rgba(250,204,21,0.4))',
              opacity: 0.9,
            }}
          />
        </svg>
      </div>

      {/* Texto */}
      <div className={`flex flex-col text-left ${animate ? 'laser-trace-text' : ''}`}>
        <span className="font-semibold uppercase tracking-[0.2em] text-base md:text-lg leading-none text-white group-hover:text-yellow-300 transition-all duration-500 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          Soluciones
        </span>
        <span className="text-[9px] md:text-[10px] text-yellow-400 font-bold tracking-[0.5em] uppercase mt-1.5 group-hover:tracking-[0.8em] transition-all duration-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          Fabrick
        </span>
      </div>
    </div>
  );
}
