'use client';

import nextDynamic from 'next/dynamic';

/**
 * `/editor` — integrated 3D architectural editor (port of `pascalorg/editor`).
 *
 * Page is a Client Component because Next 15 only allows `next/dynamic` with
 * `ssr: false` from the client. The route-level `dynamic = 'force-dynamic'`
 * directive (so the per-request CSP nonce reaches RSC bootstrap scripts) and
 * the metadata / viewport exports live in `layout.tsx`, which is a Server
 * Component.
 */
const EditorRoot = nextDynamic(() => import('@/components/editor/EditorRoot'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-neutral-950 text-neutral-300">
      <div className="text-sm tracking-wide">Cargando editor 3D…</div>
    </div>
  ),
});

export default function EditorPage() {
  return <EditorRoot />;
}
