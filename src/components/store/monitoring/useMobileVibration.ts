'use client';
import { useEffect } from 'react';
import { vibrationPatternForMmi } from './mmiScale';

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockLike = { request: (type: 'screen') => Promise<WakeLockSentinelLike> };

export function useMobileVibration(playing: boolean, mmi: number) {
  useEffect(() => {
    if (!playing || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    let coarse = false;
    try {
      coarse = !!window.matchMedia?.('(pointer:coarse)')?.matches;
    } catch {
      return;
    }
    if (!coarse) return;
    const pattern = vibrationPatternForMmi(mmi);
    const cycle = Math.max(pattern.reduce((a, b) => a + b, 0), 240);
    const buzz = () => {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* vibración no disponible */
      }
    };
    buzz();
    const id = window.setInterval(buzz, cycle);
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
      window.clearInterval(id);
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
  }, [playing, mmi]);
}
