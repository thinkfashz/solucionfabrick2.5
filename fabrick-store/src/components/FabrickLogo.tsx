'use client';

interface Props {
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

export default function FabrickLogo({ className = '', animate = false, onClick }: Props) {
  return (
    <div
      className={`flex items-center gap-4 md:gap-5 select-none cursor-pointer group transition-all duration-300 hover:scale-105 ${className}`}
      onClick={onClick}
    >
      <style>{`
        @keyframes run-light {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 6px #FACC15) drop-shadow(0 0 12px #FACC15) drop-shadow(0 0 24px rgba(250, 204, 21, 0.3)); }
          50% { filter: drop-shadow(0 0 12px #FACC15) drop-shadow(0 0 20px #FACC15) drop-shadow(0 0 36px rgba(250, 204, 21, 0.5)); }
        }
      `}</style>

      {/* SVG con luz viajera mejorada */}
      <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center flex-shrink-0">
        <svg
          viewBox="0 0 68 60"
          className="w-full h-full overflow-visible"
        >
          {/* Fondo resplandor sutil */}
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FACC15" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#FACC15" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Glow de fondo */}
          <circle cx="34" cy="30" r="28" fill="url(#glowGradient)" opacity="0.6"/>

          {/* Trazos estáticos blancos — S */}
          <path
            pathLength="100"
            d="M 28 16 Q 18 12, 12 16 Q 8 18, 8 24 Q 8 30, 16 32 Q 24 34, 24 40 Q 24 46, 16 48 Q 8 50, 8 44"
            fill="none" 
            stroke="#FFFFFF" 
            strokeWidth="3"
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ 
              filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))',
              opacity: 0.85
            }}
          />

          {/* Trazos estáticos blancos — F */}
          <path
            pathLength="100"
            d="M 46 48 L 46 16 Q 46 10, 52 10 L 58 10 M 46 29 L 56 29"
            fill="none" 
            stroke="#FFFFFF" 
            strokeWidth="3"
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ 
              filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))',
              opacity: 0.85
            }}
          />

          {/* Luz viajera amarilla — S */}
          <path
            pathLength="100"
            d="M 28 16 Q 18 12, 12 16 Q 8 18, 8 24 Q 8 30, 16 32 Q 24 34, 24 40 Q 24 46, 16 48 Q 8 50, 8 44"
            fill="none" 
            stroke="#FACC15" 
            strokeWidth="4"
            strokeLinecap="round" 
            strokeLinejoin="round"
            strokeDasharray="20 100"
            style={{
              animation: 'run-light 3.2s ease-in-out infinite',
              filter: 'drop-shadow(0 0 8px #FACC15) drop-shadow(0 0 16px #FACC15) drop-shadow(0 0 24px rgba(250, 204, 21, 0.4))',
              opacity: 0.9
            }}
          />

          {/* Luz viajera amarilla — F */}
          <path
            pathLength="100"
            d="M 46 48 L 46 16 Q 46 10, 52 10 L 58 10 M 46 29 L 56 29"
            fill="none" 
            stroke="#FACC15" 
            strokeWidth="4"
            strokeLinecap="round" 
            strokeLinejoin="round"
            strokeDasharray="20 100"
            style={{
              animation: 'run-light 3.6s ease-in-out infinite',
              filter: 'drop-shadow(0 0 8px #FACC15) drop-shadow(0 0 16px #FACC15) drop-shadow(0 0 24px rgba(250, 204, 21, 0.4))',
              opacity: 0.9,
              animationDelay: '-0.4s'
            }}
          />
        </svg>
      </div>

      {/* Texto mejorado */}
      <div className={`flex flex-col text-left ${animate ? 'laser-trace-text' : ''}`}>
        <span className="font-semibold uppercase tracking-[0.2em] text-lg md:text-xl leading-none text-white group-hover:text-yellow-300 transition-all duration-500 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
          Soluciones
        </span>
        <span className="text-[9px] md:text-[10px] text-yellow-400 font-bold tracking-[0.5em] uppercase mt-2 group-hover:tracking-[0.8em] transition-all duration-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]">
          Fabrick
        </span>
      </div>
    </div>
  );
}
