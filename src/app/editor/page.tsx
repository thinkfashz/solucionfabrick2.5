'use client';

import nextDynamic from 'next/dynamic';

/**
 * `/editor` — Ecosistema de Diseño Bimodal (2D/3D) de Soluciones Fabrick.
 *
 * Reemplaza al `HouseDesigner` simple y al scaffolding `@pascal-app/*`.
 * Monta `DesignerRoot`, que combina:
 *   - Sidebar izquierdo de catálogo (luxury, zinc/yellow + thumbnails 3D).
 *   - Canvas R3F con cámara conmutable Plano Técnico (2D ortográfica) /
 *     Modelo Real (3D perspectiva con HDR y ContactShadows).
 *   - Inspector derecho con sliders de precisión + snap milimétrico.
 *   - Auto-guardado del JSON de diseño a la tabla `projects` de InsForge,
 *     con miniatura PNG capturada del canvas.
 *
 * Página marcada como Client Component porque Next 15 sólo permite usar
 * `next/dynamic({ ssr: false })` desde cliente. La directiva
 * `dynamic = 'force-dynamic'` (necesaria para que el nonce CSP por petición
 * alcance los bootstrap scripts RSC) y los exports `metadata` / `viewport`
 * viven en `layout.tsx`, que sí es Server Component.
 */
const DesignerRoot = nextDynamic(
  () => import('@/components/designer/DesignerRoot'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 grid place-items-center bg-neutral-950 text-neutral-300">
        <div className="text-sm tracking-wide">Cargando estudio de diseño…</div>
      </div>
    ),
  },
);

export default function EditorPage() {
  return <DesignerRoot />;
}
