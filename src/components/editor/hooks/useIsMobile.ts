'use client';

/**
 * useIsMobile
 *
 * Two orthogonal signals are exposed:
 *   - `isMobile`        viewport ≤ 767px (Tailwind `md` breakpoint)
 *   - `isCoarsePointer` `(pointer: coarse)` MediaQuery — touch primary
 *
 * Hybrid devices (Surface, iPad + keyboard) report `coarse` AND a wide
 * viewport. Consumers should treat the two flags independently and **not**
 * gate features on `isMobile && isCoarsePointer` unless the feature really
 * requires both (e.g. a bottom toolbar only makes sense on small screens).
 *
 * SSR-safe: defaults to `{ isMobile: false, isCoarsePointer: false }` on
 * first render and updates inside `useEffect` to avoid hydration mismatch.
 */

import { useEffect, useState } from 'react';

export interface DeviceFlags {
  isMobile: boolean;
  isCoarsePointer: boolean;
}

const QUERIES = {
  mobile: '(max-width: 767px)',
  coarse: '(pointer: coarse)',
} as const;

export function useIsMobile(): DeviceFlags {
  const [flags, setFlags] = useState<DeviceFlags>({
    isMobile: false,
    isCoarsePointer: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mqMobile = window.matchMedia(QUERIES.mobile);
    const mqCoarse = window.matchMedia(QUERIES.coarse);

    const sync = () =>
      setFlags({
        isMobile: mqMobile.matches,
        isCoarsePointer: mqCoarse.matches,
      });

    sync();
    mqMobile.addEventListener('change', sync);
    mqCoarse.addEventListener('change', sync);
    return () => {
      mqMobile.removeEventListener('change', sync);
      mqCoarse.removeEventListener('change', sync);
    };
  }, []);

  return flags;
}

export default useIsMobile;
