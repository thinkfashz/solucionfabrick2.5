'use client';
/*
 * Plano390Controls — overlay DOM (fuera del <Canvas>) del plano 390-1.
 * • Modo libre: joystick izquierdo camina; derecho gira (X) y mira arriba/abajo
 *   (Y). Arrastrar el dedo/ratón sobre la escena también gira la vista.
 * • Los joysticks se ocultan solos a los ~4 s de inactividad y reaparecen al
 *   tocar la pantalla o el botón "Controles": así no invaden el encuadre.
 * • Tour y CCTV ya no pintan botones gigantes: el menú plegable y la ficha
 *   lateral de Plano390UI manejan esos modos.
 * Cualquier pointerup / desmontaje resetea el input para no dejar la cámara andando.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import LabJoystick from '../MetalconLabJoystick';
import { input } from './Plano390CameraRig';
import type { Plano390Mode } from './Plano390CameraRig';

const LOOK_SENS = 0.0032; // rad por px de arrastre horizontal
const PITCH_SENS = 0.0026; // rad normalizado por px vertical
const IDLE_MS = 4200;

export default function Plano390Controls({ mode, onReset }: { mode: Plano390Mode; onReset?: () => void }) {
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const timer = useRef<number | null>(null);
  const [active, setActive] = useState(true);

  const wake = useCallback(() => {
    setActive(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setActive(false), IDLE_MS);
  }, []);

  useEffect(() => {
    const reset = () => {
      input.move.x = 0;
      input.move.y = 0;
      input.turn = 0;
      input.lookDx = 0;
      drag.current = null;
    };
    window.addEventListener('pointerup', reset);
    window.addEventListener('pointercancel', reset);
    return () => {
      window.removeEventListener('pointerup', reset);
      window.removeEventListener('pointercancel', reset);
      if (timer.current !== null) window.clearTimeout(timer.current);
      reset();
    };
  }, []);

  useEffect(() => {
    if (mode === 'free') wake();
    else setActive(false);
  }, [mode, wake]);

  if (mode !== 'free') return null;

  return (
    <>
      {/* Touch-look: arrastrar sobre la escena para girar la vista. */}
      <div
        aria-hidden
        className="absolute inset-0 z-20 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          wake();
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          d.x = e.clientX;
          d.y = e.clientY;
          // Arrastrar a la derecha gira a la derecha (yaw negativo).
          input.lookDx -= dx * LOOK_SENS;
          input.pitch = Math.max(-1, Math.min(1, input.pitch - dy * PITCH_SENS));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      />

      {/* Joysticks: se desvanecen solos para no tapar la escena. */}
      <div
        className={`absolute left-3 z-30 transition-opacity duration-300 ${
          active ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ bottom: 'calc(26px + env(safe-area-inset-bottom))' }}
      >
        <LabJoystick
          label="Caminar"
          size={104}
          onMove={(x, y) => {
            input.move.x = x;
            input.move.y = y;
          }}
        />
      </div>
      <div
        className={`absolute right-3 z-30 transition-opacity duration-300 ${
          active ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ bottom: 'calc(26px + env(safe-area-inset-bottom))' }}
      >
        <LabJoystick
          label="Mirar"
          size={96}
          onMove={(x, y) => {
            input.turn = x;
            input.pitch = y;
          }}
        />
      </div>

      {/* Botón sutil que devuelve los controles y recentra la vista. */}
      <div
        className="absolute inset-x-0 z-30 flex justify-center gap-2"
        style={{ bottom: 'calc(14px + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={wake}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-3.5 text-[9px] font-black uppercase tracking-[.14em] text-white/80 backdrop-blur-xl transition active:scale-95 ${
            active ? 'opacity-0' : 'opacity-100'
          }`}
          aria-label="Mostrar controles"
        >
          Controles
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-black/55 px-3.5 text-[9px] font-black uppercase tracking-[.14em] text-white/80 backdrop-blur-xl transition active:scale-95"
          aria-label="Volver al living"
        >
          Recentrar
        </button>
      </div>
    </>
  );
}
