'use client';

import nextDynamic from 'next/dynamic';

/**
 * `/editor` — Diseñador 3D interactivo de Soluciones Fabrick.
 *
 * Reemplaza al scaffolding previo basado en `@pascal-app/*` (que sólo montaba
 * el viewer sin handlers de herramientas ni catálogo, dejando al usuario sin
 * elementos que colocar). Ahora monta el mismo `HouseDesigner` que `/juego`,
 * un editor R3F + drei propio con catálogo de módulos y objetos de
 * construcción listos para usar.
 *
 * Página marcada como Client Component porque Next 15 sólo permite usar
 * `next/dynamic({ ssr: false })` desde cliente. La directiva
 * `dynamic = 'force-dynamic'` (necesaria para que el nonce CSP por petición
 * alcance los bootstrap scripts RSC) y los exports `metadata` / `viewport`
 * viven en `layout.tsx`, que sí es Server Component.
 */
const HouseDesigner = nextDynamic(() => import('@/app/juego/HouseDesigner'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-neutral-950 text-neutral-300">
      <div className="text-sm tracking-wide">Cargando editor 3D…</div>
    </div>
  ),
});

export default function EditorPage() {
  return <HouseDesigner />;
}
