'use client';
/*
 * Plano390Controls — overlay DOM (fuera del <Canvas>) del plano 390-1.
 * • Modo libre: joystick izquierdo camina; derecho gira (X) y mira arriba/abajo (Y).
 *   Además, arrastrar el dedo/ratón sobre la escena gira la vista (touch-look).
 * • Modo tour: botón para salir del recorrido guiado.
 * • Modo CCTV (Cine): "Siguiente cámara" + "Salir de Cine".
 * Cualquier pointerup / desmontaje resetea el input para no dejar la cámara andando.
 */
import { useEffect, useRef } from 'react';
import LabJoystick from '../MetalconLabJoystick';
import { input, nextCctv } from './Plano390CameraRig';
import type { Plano390Mode } from './Plano390CameraRig';

const LOOK_SENS = 0.0032; // rad por px de arrastre horizontal
const PITCH_SENS = 0.0026; // rad normalizado por px vertical

export default function Plano390Controls({ mode, onReset }: { mode: Plano390Mode; onReset?: () => void }) {
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

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
      reset();
    };
  }, []);

  const exitToFree = () => {
    input.mode = 'free';
    input.turn = 0;
    input.pitch = 0;
    input.move.x = 0;
    input.move.y = 0;
    onReset?.();
  };

  return (
    <>
      {mode === 'free' ? (
        <>
          {/* Touch-look: arrastrar sobre la escena para girar la vista. */}
          <div
            aria-hidden
            className="absolute inset-0 z-20 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
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
          <div className="pointer-events-none absolute inset-x-0 top-[92px] z-20 flex justify-center">
            <span className="rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-white/70 backdrop-blur-md">
              Arrastra para mirar · joystick para moverte
            </span>
          </div>
          <div className="absolute bottom-[86px] left-4 z-30">
            <LabJoystick
              label="Caminar"
              onMove={(x, y) => {
                input.move.x = x;
                input.move.y = y;
              }}
            />
          </div>
          <div className="absolute bottom-[86px] right-4 z-30">
            <LabJoystick
              label="Mirar"
              onMove={(x, y) => {
                input.turn = x;
                input.pitch = y;
              }}
            />
          </div>
          {/* Ayuda de teclado, solo escritorio */}
          <div className="pointer-events-none absolute bottom-[86px] left-1/2 z-20 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.18em] text-white/45 backdrop-blur-md md:block">
            WASD mover · Q/E girar · Shift correr
          </div>
        </>
      ) : mode === 'tour' ? (
        <div className="absolute inset-x-0 bottom-[86px] z-30 flex justify-center">
          <button
            type="button"
            onClick={exitToFree}
            className="rounded-full border border-white/25 bg-black/60 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-colors duration-150 active:bg-black/85"
          >
            Salir del recorrido guiado
          </button>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-x-0 bottom-[86px] z-30 flex flex-wrap items-center justify-center gap-2 px-4">
          <button
            type="button"
            onClick={() => nextCctv()}
            className="pointer-events-auto rounded-full border border-white/25 bg-black/60 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-colors active:bg-black/85"
          >
            Siguiente cámara
          </button>
          <button
            type="button"
            onClick={exitToFree}
            className="pointer-events-auto rounded-full border border-[#F6C64A]/50 bg-[#F6C64A] px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-black backdrop-blur-xl transition-transform active:scale-95"
          >
            Salir de Cine
          </button>
        </div>
      )}
    </>
  );
}
