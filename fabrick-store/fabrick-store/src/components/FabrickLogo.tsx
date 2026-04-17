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
      <div className="flex items-center gap-2.5">
        {/* SF symbol in gold */}
        <div
          className="flex items-center justify-center rounded-sm font-black text-base leading-none shrink-0 text-[#c9a96e] border-2 border-[#c9a96e]"
          style={{
            width: '2.2rem',
            height: '2.2rem',
            fontFamily: 'Montserrat, Poppins, Arial, sans-serif',
            letterSpacing: '0.02em',
          }}
        >
          SF
        </div>

        {/* Text block */}
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] md:text-[11px] font-normal uppercase tracking-[0.25em] text-[var(--text)]">
            SOLUCIONES
          </span>
          <span className="text-sm md:text-base font-bold uppercase tracking-[0.15em] text-[#c9a96e]">
            FABRICK
          </span>
        </div>
      </div>
    </div>
  );
}

