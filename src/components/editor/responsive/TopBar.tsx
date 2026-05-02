'use client';

import { Layers, Settings2 } from 'lucide-react';

import EditorBrand from '../brand/EditorBrand';
import useEditor from '../store/useEditor';

/**
 * Desktop top bar — only visible from `md` (≥768px) up. Hosts the brand,
 * the document name and quick toggles for the layers / properties panels.
 */
export default function TopBar() {
  const layersOpen = useEditor((s) => s.panels.layers);
  const propsOpen = useEditor((s) => s.panels.properties);
  const togglePanel = useEditor((s) => s.togglePanel);

  return (
    <header className="hidden md:flex absolute top-0 inset-x-0 z-20 h-12 items-center justify-between px-4 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur text-neutral-100">
      <div className="flex items-center gap-3">
        <EditorBrand variant="mono-light" height={24} />
        <span className="hidden lg:inline text-xs uppercase tracking-widest text-neutral-400">
          Editor 3D
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => togglePanel('layers')}
          aria-pressed={layersOpen}
          aria-label="Alternar panel de capas"
          className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
            layersOpen
              ? 'bg-yellow-electric/15 text-yellow-electric'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          Capas
        </button>
        <button
          type="button"
          onClick={() => togglePanel('properties')}
          aria-pressed={propsOpen}
          aria-label="Alternar panel de propiedades"
          className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
            propsOpen
              ? 'bg-yellow-electric/15 text-yellow-electric'
              : 'text-neutral-300 hover:bg-neutral-800'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Propiedades
        </button>
      </div>
    </header>
  );
}
