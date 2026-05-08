'use client';

import nextDynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type FabrickLogo3D from './FabrickLogo3D';

/**
 * Client-side wrapper that lazy-loads the Three.js logo on demand.
 *
 * Lives in its own Client Component because Next.js 15 only allows
 * `next/dynamic({ ssr: false })` from client modules. Keeping this isolated
 * lets `app/page.tsx` (and any other RSC consumer) stay a Server Component
 * — `metadata`, `force-dynamic` and the per-request CSP nonce keep working
 * — while the heavy 3D bundle (~150 KB gzipped of three) downloads only
 * when the route that mounts it is actually visited.
 *
 * Same pattern as `src/app/juego/HouseDesignerLazy.tsx`.
 */
const FabrickLogo3DInner = nextDynamic(() => import('./FabrickLogo3D'), {
  ssr: false,
  // Skeleton has the same height as the rendered canvas so swap-in causes
  // zero CLS. Caller controls the height via the `height` prop.
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando logo 3D"
      style={{ width: '100%', height: '100%' }}
    />
  ),
});

type FabrickLogo3DProps = ComponentProps<typeof FabrickLogo3D>;

export default function FabrickLogo3DLazy(props: FabrickLogo3DProps) {
  return <FabrickLogo3DInner {...props} />;
}
