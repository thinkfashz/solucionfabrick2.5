'use client';
/*
 * LabJoystick — joystick táctil para recorrer el Lab en móvil.
 * • Analógico real: onMove recibe (x, y) normalizado -1..1 (y ya invertido: arriba = adelante)
 * • Multi-touch: cada joystick captura su propio pointer (setPointerCapture)
 * • touch-none + select-none: no selecciona texto ni hace scroll al arrastrar
 */
import { useRef, useState } from 'react';

export default function LabJoystick({ label, onMove }: { label: string; onMove: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement | null>(null);
  const drag = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);

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
      className="grid h-24 w-24 touch-none select-none place-items-center rounded-full border border-white/15 bg-black/55 backdrop-blur-xl"
    >
      <div
        ref={base}
        onPointerDown={start}
        onPointerMove={handle}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onContextMenu={e => e.preventDefault()}
        className="relative grid h-24 w-24 place-items-center rounded-full"
      >
        <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-[.2em] text-white/25">
          {label}
        </span>
        <span
          className={`grid h-11 w-11 place-items-center rounded-full shadow-lg transition-colors duration-150 ${
            on ? 'bg-[#F6C64A]' : 'bg-white/80'
          }`}
          style={{ transform: `translate(${thumb.x * 27}px, ${thumb.y * 27}px)` }}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-black/60' : 'bg-black/40'}`} />
        </span>
      </div>
    </div>
  );
}
