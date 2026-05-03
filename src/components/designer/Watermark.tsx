'use client';

/**
 * Watermark — Marca de agua "Soluciones Fabrick" en una esquina del visor.
 */

export function Watermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-4 right-4 z-10 select-none"
    >
      <div className="flex flex-col items-end font-serif leading-none">
        <span className="text-[10px] uppercase tracking-[0.4em] text-yellow-400/80">
          Soluciones
        </span>
        <span className="-mt-0.5 text-xl tracking-[0.2em] text-yellow-400/90 drop-shadow">
          FABRICK
        </span>
        <span className="mt-1 text-[9px] tracking-widest text-zinc-300/70">
          Bimodal Design Studio
        </span>
      </div>
    </div>
  );
}
