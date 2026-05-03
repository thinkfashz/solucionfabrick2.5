'use client';

import nextDynamic from 'next/dynamic';

/**
 * Client-side wrapper that lazy-loads the Three.js / R3F editor on demand.
 *
 * Lives in its own Client Component because Next.js 15 only allows
 * `next/dynamic({ ssr: false })` from client modules. Keeping this isolated
 * lets `page.tsx` stay a Server Component (so `metadata` + `force-dynamic`
 * keep working with the per-request CSP nonce) while the heavy 3D bundle
 * (~400 KB gzipped of three + drei + R3F) downloads only when /juego is
 * visited — never on /, /tienda, or any other route.
 *
 * The skeleton has a fixed full-screen footprint so the 3D canvas swap-in
 * doesn't cause CLS.
 */
const HouseDesigner = nextDynamic(() => import('./HouseDesigner'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-screen w-full items-center justify-center bg-black"
      role="status"
      aria-label="Cargando diseñador 3D"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-yellow-400/30 border-t-yellow-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400/70">
          Cargando diseñador 3D…
        </p>
      </div>
    </div>
  ),
});

export default function HouseDesignerLazy() {
  return <HouseDesigner />;
}
