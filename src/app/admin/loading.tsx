'use client';

import { BrandMark } from '@/components/admin/ui';

/* ─────────────────────────────────────────────────────────────────────────
 * AdminLoading — Pantalla de carga del admin.
 * Estilo construcción + holograma: torre de bloques apilados, beam radial
 * de escaneo y ticker de estado. Sin React state ni RAF — sólo CSS, así el
 * primer frame aparece de inmediato durante navegaciones.
 * ──────────────────────────────────────────────────────────────────────── */

const TICKER_LINES = [
  'Inicializando módulo · InsForge',
  'Sincronizando inventario',
  'Verificando canales en tiempo real',
];

export default function AdminLoading() {
  return (
    <div className="relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden">
      {/* Fondo radial */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(56,189,248,0.10),transparent_55%),radial-gradient(circle_at_50%_82%,rgba(250,204,21,0.10),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(250,204,21,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(250,204,21,0.18)_1px,transparent_1px)] [background-size:36px_36px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_4px] opacity-30" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full">
          <div
            className="absolute inset-0 rounded-full [background:conic-gradient(from_0deg,rgba(250,204,21,0)_0deg,rgba(250,204,21,0.18)_30deg,rgba(250,204,21,0)_70deg,rgba(250,204,21,0)_360deg)] [animation:admin-radar-spin_2.6s_linear_infinite] [mask-image:radial-gradient(circle,transparent_38%,black_38%,black_100%)] [-webkit-mask-image:radial-gradient(circle,transparent_38%,black_38%,black_100%)]"
          />
          <div className="absolute inset-[8%] rounded-full border border-yellow-300/15" />
          <div className="absolute inset-[22%] rounded-full border border-yellow-300/10" />
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-6 px-6 py-12">
        <div className="relative flex flex-col items-center">
          <div className="flex flex-col gap-1">
            {([
              { cls: 'w-14', delay: '' },
              { cls: 'w-[70px]', delay: '[animation-delay:0.18s]' },
              { cls: 'w-[84px]', delay: '[animation-delay:0.36s]' },
            ] as const).map(({ cls, delay }, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-sm bg-gradient-to-r from-yellow-400/0 via-yellow-300/80 to-yellow-400/0 shadow-[0_0_10px_rgba(250,204,21,0.45)] opacity-0 [animation:admin-block-rise_2s_ease-out_infinite] ${cls} ${delay}`}
              />
            ))}
          </div>
          <div className="mt-3">
            <BrandMark size="xl" />
          </div>
          <span
            aria-hidden
            className="mt-1 h-3 w-16 rounded-full bg-gradient-to-b from-yellow-400/30 to-transparent blur-md"
          />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <p className="font-playfair text-[11px] font-black tracking-[0.36em] text-yellow-300">
            SOLUCIONES FABRICK
          </p>
          <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-white/40">
            Admin · cargando módulo
          </p>
        </div>

        <div className="w-[min(360px,82vw)]">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-white shadow-[0_0_14px_rgba(250,204,21,0.65)] [animation:admin-bar-progress_1.6s_ease-in-out_infinite]"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.3em] text-white/45 tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <span>InsForge · v3.2.1</span>
          </div>
        </div>

        <div className="relative h-4 w-[min(360px,82vw)] overflow-hidden text-center">
          <div
            className="absolute inset-x-0 flex flex-col gap-0 [animation:admin-ticker_4.8s_steps(3)_infinite]"
          >
            {[...TICKER_LINES, TICKER_LINES[0]].map((line, i) => (
              <span
                key={i}
                className="block h-4 text-[10px] font-mono uppercase tracking-[0.22em] text-white/55"
              >
                <span className="text-yellow-300">›</span> {line}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes admin-radar-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes admin-block-rise {
          0%   { opacity: 0; transform: translateY(8px) scaleX(0.4); }
          30%  { opacity: 1; transform: translateY(0) scaleX(1); }
          70%  { opacity: 1; transform: translateY(0) scaleX(1); }
          100% { opacity: 0; transform: translateY(-4px) scaleX(0.4); }
        }
        @keyframes admin-bar-progress {
          0%   { left: -40%; width: 30%; }
          50%  { left: 30%; width: 55%; }
          100% { left: 110%; width: 30%; }
        }
        @keyframes admin-ticker {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-1.5rem); }
        }
      `}</style>
    </div>
  );
}
