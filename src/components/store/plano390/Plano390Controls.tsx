'use client';
/*
 * Plano390Controls — overlay DOM (fuera del <Canvas>) para el plano 390-1.
 * • Modo free: dos <LabJoystick> reutilizados (caminar a la izq., girar a la der.)
 *   que mutan el estado de módulo `input` de Plano390CameraRig.
 * • Modo tour: botón centrado para salir del recorrido guiado y volver a free.
 * • Cualquier pointerup / desmontaje resetea el input para no dejar la cámara andando.
 */
import { useEffect } from 'react';
import LabJoystick from '../MetalconLabJoystick';
import { input } from './Plano390CameraRig';

export default function Plano390Controls({ mode, onReset }: { mode: 'free' | 'tour'; onReset?: () => void }) {
  useEffect(() => {
    const reset = () => {
      input.move.x = 0;
      input.move.y = 0;
      input.turn = 0;
    };
    window.addEventListener('pointerup', reset);
    window.addEventListener('pointercancel', reset);
    return () => {
      window.removeEventListener('pointerup', reset);
      window.removeEventListener('pointercancel', reset);
      reset();
    };
  }, []);

  const exitTour = () => {
    input.mode = 'free';
    input.turn = 0;
    input.move.x = 0;
    input.move.y = 0;
    onReset?.();
  };

  return (
    <>
      {mode === 'free' ? (
        <>
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
              label="Girar"
              onMove={(x) => {
                input.turn = x;
              }}
            />
          </div>
        </>
      ) : (
        <div className="absolute inset-x-0 bottom-[86px] z-30 flex justify-center">
          <button
            type="button"
            onClick={exitTour}
            className="rounded-full border border-white/25 bg-black/60 px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-colors duration-150 active:bg-black/85"
          >
            Salir del recorrido guiado
          </button>
        </div>
      )}
    </>
  );
}
