'use client';
/*
 * LabJoystick — joystick táctil para recorrer el Lab en móvil.
 * • Analógico real: onMove recibe (x, y) normalizado -1..1 (y ya invertido: arriba = adelante)
 * • Multi-touch: cada joystick captura su propio pointer (setPointerCapture)
 * • touch-none + select-none: no selecciona texto ni hace scroll al arrastrar
 */
import { useRef, useState } from 'react';

export default function LabJoystick({
  label,
  onMove,
  size = 96,
  accent = '#F6C64A',
}: {
  label: string;
  onMove: (x: number, y: number) => void;
  /** Diámetro táctil en px (96 por defecto; 112–120 en el visor 390-1). */
  size?: number;
  /** Color del pulgar activo. */
  accent?: string;
}) {
  const base = useRef<HTMLDivElement | null>(null);
  const drag = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);
  const thumbSize = Math.round(size * 0.46);
  const travel = Math.round((size - thumbSize) / 2 - 6);

  // Zona muerta corta + curva de respuesta (afinar en centro, rápido en borde)
  const applyCurve = (x: number, y: number): { x: number; y: number } => {
    const dz = 0.08;
    const mag = Math.hypot(x, y);
    if (mag < dz) return { x: 0, y: 0 };
    const shaped = Math.pow((mag - dz) / (1 - dz), 1.35);
    const scale = shaped / mag;
    return { x: x * scale, y: y * scale };
  };

  const push = (x: number, y: number) => {
    const c = applyCurve(x, y);
    if (Math.abs(c.x - last.current.x) > 0.02 || Math.abs(c.y - last.current.y) > 0.02) {
      last.current = c;
      onMove(c.x, -c.y); // arriba del stick = adelante
    }
  };

  const handle = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el || !drag.current) return;
    const r = el.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    setThumb({ x: dx, y: dy });
    push(dx, dy);
  };

  const start = (e: React.PointerEvent) => {
    drag.current = true;
    setOn(true);
    try {
      navigator.vibrate?.(4);
    } catch {
      /* háptico opcional */
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handle(e);
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = false;
    setOn(false);
    setThumb({ x: 0, y: 0 });
    last.current = { x: 0, y: 0 };
    onMove(0, 0);
  };

  return (
    <div
      role="application"
      aria-label={label}
      className="grid touch-none select-none place-items-center rounded-full border bg-black/55 backdrop-blur-xl transition-colors"
      style={{
        width: size,
        height: size,
        borderColor: on ? `${accent}99` : 'rgba(255,255,255,.15)',
        boxShadow: on ? `0 0 0 4px ${accent}14, 0 12px 32px rgba(0,0,0,.4)` : undefined,
      }}
    >
      <div
        ref={base}
        onPointerDown={start}
        onPointerMove={handle}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onContextMenu={e => e.preventDefault()}
        className="relative grid touch-none select-none place-items-center rounded-full"
        style={{ width: size, height: size }}
      >
        <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-[.2em] text-white/25">
          {label}
        </span>
        {/* Cruz direccional tenue */}
        <span className="pointer-events-none absolute left-1/2 top-2 h-2 w-px -translate-x-1/2 bg-white/15" />
        <span className="pointer-events-none absolute bottom-2 left-1/2 h-2 w-px -translate-x-1/2 bg-white/15" />
        <span className="pointer-events-none absolute left-2 top-1/2 h-px w-2 -translate-y-1/2 bg-white/15" />
        <span className="pointer-events-none absolute right-2 top-1/2 h-px w-2 -translate-y-1/2 bg-white/15" />
        <span
          className="grid place-items-center rounded-full shadow-lg transition-colors duration-150"
          style={{
            width: thumbSize,
            height: thumbSize,
            background: on ? accent : 'rgba(255,255,255,.82)',
            transform: `translate(${thumb.x * travel}px, ${thumb.y * travel}px)`,
          }}
        >
          <span className={`rounded-full ${on ? 'bg-black/60' : 'bg-black/40'}`} style={{ width: 6, height: 6 }} />
        </span>
      </div>
    </div>
  );
}
