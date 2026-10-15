'use client';
import { useEffect, useRef } from 'react';
import { vibrationPatternForMmi } from './mmiScale';

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> };

/**
 * Vibración háptica del sismo en 3 fases ligadas al progreso de la simulación:
 * - Aviso (progress < .18): patrón corto tipo "alerta civil".
 * - Sacudida (.18–.85): patrón continuo por MMI con ciclos irregulares.
 * - Réplicas (> .85): pulsos espaciados que se apagan hacia el final.
 */
export function useMobileVibration(playing: boolean, mmi: number, progress = 0) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    let coarse = false;
    try {
      coarse = !!window.matchMedia?.('(pointer:coarse)')?.matches;
    } catch {
      return;
    }
    if (!coarse) return;

    const base = vibrationPatternForMmi(mmi);
    const strongCycle = Math.max(base.reduce((a, b) => a + b, 0), 240);

    const buzz = (pattern: number[]) => {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* vibración no disponible */
      }
    };

    if (progress < 0.18) {
      // Fase de aviso: tres golpes breves repetidos.
      buzz([0, 120, 90, 120]);
      timerRef.current = window.setInterval(() => buzz([0, 120, 90, 120]), 900);
    } else if (progress < 0.85) {
      // Sacudida: patrón por MMI con ligera irregularidad para sentirse orgánico.
      buzz(base);
      timerRef.current = window.setInterval(
        () => buzz(Math.random() < 0.3 ? [base[1], base[0], ...base.slice(2)] : base),
        strongCycle,
      );
    } else {
      // Réplicas: pulsos cortos que se van espaciando.
      buzz([0, 70, 200, 70]);
      timerRef.current = window.setInterval(() => buzz([0, 70, 200, 70]), 1400);
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
        navigator.vibrate(0);
      } catch {
        /* vibración no disponible */
      }
      try {
        sentinel?.release().catch(() => undefined);
      } catch {
        /* wakeLock no soportado */
      }
    };
  }, [playing, mmi, progress < 0.18 ? 'warning' : progress < 0.85 ? 'shake' : 'aftershock']);
}
