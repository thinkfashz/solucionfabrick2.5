'use client';

/* Admin route loading — Matrix terminal aesthetic, CSS only, no state */

export default function AdminLoading() {
  return (
    <div
      className="relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden bg-black/80 font-mono"
    >
      {/* Scan lines */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.25) 2px, rgba(0,0,0,0.25) 4px)',
        }}
      />

      {/* Falling columns — pure CSS, 8 columns */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-around overflow-hidden opacity-40">
        {(['0.0s','0.4s','0.8s','1.2s','0.2s','0.6s','1.0s','1.4s'] as const).map((delay, i) => (
          <div
            key={i}
            className="flex flex-col gap-0 text-[13px] text-[#00ff41] leading-tight [animation:matrix-fall_2.2s_linear_infinite]"
            style={{ animationDelay: delay }}
          >
            {Array.from({ length: 24 }, (_, j) => (
              <span key={j}>{j % 3 === 0 ? '1' : '0'}</span>
            ))}
          </div>
        ))}
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <p
          className="text-[11px] font-black uppercase tracking-[0.38em] text-[#00ff41]"
          style={{ textShadow: '0 0 14px rgba(0,255,65,0.7)' }}
        >
          SOLUCIONES FABRICK
        </p>

        <div className="h-0.5 w-40 overflow-hidden rounded-full bg-[#00ff41]/15">
          <div
            className="h-full rounded-full bg-[#00ff41] [animation:matrix-bar_1.4s_ease-in-out_infinite]"
            style={{ boxShadow: '0 0 8px rgba(0,255,65,0.8)' }}
          />
        </div>

        <p
          className="text-[10px] uppercase tracking-[0.28em] text-[#00ff41]/55 [animation:matrix-blink_0.8s_step-end_infinite]"
        >
          {'> cargando módulo_'}
        </p>
      </div>

      <style jsx>{`
        @keyframes matrix-fall {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes matrix-bar {
          0%   { width: 0%; margin-left: 0; }
          50%  { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes matrix-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
