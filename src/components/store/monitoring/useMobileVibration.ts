'use client';
import { useEffect, useRef } from 'react';
import { vibrationPatternForMmi } from './mmiScale';

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> };

/**
 * Vibración háptica del sismo en 3 fases ligadas al progreso de la simulación:
 * - Aviso (progress < .18): patrón largo e intenso tipo "alerta civil".
 * - Sacudida (.18–.85): patrón continuo por MMI con ciclos irregulares.
 * - Réplicas (> .85): pulsos espaciados que se apagan hacia el final.
 *
 * Diagnóstico del "el cel no vibra al iniciar el movimiento":
 *  1. El chequeo `matchMedia('(pointer:coarse)')` era demasiado estricto: hay
 *     navegadores/WebView Android donde `pointer:coarse` no matchea aunque el
 *     dispositivo sí tenga motor de vibración (o el matchMedia lanza). Se
 *     eliminó: basta con `typeof navigator.vibrate === 'function'` + try/catch.
 *     En desktop simplemente no hace nada.
 *  2. El primer buzz nacía en un `useEffect` (asíncrono respecto al click) y
 *     muchos navegadores exigen el gesto del usuario para vibrar. Por eso
 *     `vibrateNow` se exporta como función imperativa y el botón ▶ la llama
 *     dentro del propio handler `play`: ahí sí hay activación de usuario.
 *     (iOS Safari no implementa navigator.vibrate; no hay nada que hacer ahí.)
 *  3. El patrón de aviso era muy corto (330 ms de zumbido cada 900 ms) y se
 *     perdía. Ahora dura ~1 s de pulsos con pausa clara entre series.
 */

/** Vibra de forma imperativa (fuera de React). Llamar dentro de un gesto. */
export function vibrateNow(pattern: number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* vibración no disponible / bloqueada */
  }
}

const WARNING_PATTERN = [0, 240, 110, 240, 110, 360];
const AFTERSHOCK_PATTERN = [0, 90, 260, 90];

export function useMobileVibration(playing: boolean, mmi: number, progress = 0) {
  const timerRef = useRef<number | null>(null);

  // Sin matchMedia: solo comprobamos la API y dejamos que el navegador decida.
  const supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  useEffect(() => {
    if (!playing) return;

    if (supported) {
      const base = vibrationPatternForMmi(mmi);
      const strongCycle = Math.max(base.reduce((a, b) => a + b, 0), 260);
      const phase: 'warning' | 'shake' | 'aftershock' =
        progress < 0.18 ? 'warning' : progress < 0.85 ? 'shake' : 'aftershock';

      if (phase === 'warning') {
        // Fase de aviso: serie larga y marcada, perceptible incluso con el
        // teléfono sobre una mesa (≈1 s de pulsos cada 1,5 s).
        vibrateNow(WARNING_PATTERN);
        timerRef.current = window.setInterval(() => vibrateNow(WARNING_PATTERN), 1500);
      } else if (phase === 'shake') {
        // Sacudida: patrón por MMI con ligera irregularidad para sentirse orgánico.
        vibrateNow(base);
        timerRef.current = window.setInterval(
          () => vibrateNow(Math.random() < 0.3 ? [base[1], base[0], ...base.slice(2)] : base),
          strongCycle,
        );
      } else {
        // Réplicas: pulsos cortos que se van espaciando.
        vibrateNow(AFTERSHOCK_PATTERN);
        timerRef.current = window.setInterval(() => vibrateNow(AFTERSHOCK_PATTERN), 1600);
      }
    }

    let released = false;
    let sentinel: WakeLockSentinelLike | null = null;
    try {
      const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
      wakeLock
        ?.request('screen')
        .then((s) => {
          if (released) {
            s.release().catch(() => undefined);
          } else {
            sentinel = s;
          }
        })
        .catch(() => undefined);
    } catch {
      /* wakeLock no soportado */
    }
    return () => {
      released = true;
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      try {
        navigator.vibrate?.(0);
      } catch {
        /* vibración no disponible */
      }
      try {
        sentinel?.release().catch(() => undefined);
      } catch {
        /* wakeLock no soportado */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mmi, progress < 0.18 ? 'warning' : progress < 0.85 ? 'shake' : 'aftershock', supported]);
}
