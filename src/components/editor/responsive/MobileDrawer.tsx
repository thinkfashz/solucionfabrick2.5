'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

import useEditor from '../store/useEditor';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';

/**
 * Off-canvas drawer for mobile (≤md). Slides in from the left and contains
 * the secondary panels (Layers + Properties stacked) so the canvas stays at
 * 100% behind. Closes on backdrop click, Escape, or the close button.
 */
export default function MobileDrawer() {
  const open = useEditor((s) => s.panels.drawer);
  const setPanel = useEditor((s) => s.setPanel);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel('drawer', false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setPanel]);

  return (
    <div
      className="md:hidden fixed inset-0 z-40 pointer-events-none"
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={() => setPanel('drawer', false)}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0'
        }`}
      />
      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Paneles del editor"
        data-open={open}
        className="absolute inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col bg-neutral-950 text-neutral-100 shadow-2xl transition-transform duration-200 ease-out -translate-x-full data-[open=true]:translate-x-0 data-[open=true]:pointer-events-auto"
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-800 px-4">
          <h2 className="text-sm font-semibold">Editor</h2>
          <button
            type="button"
            onClick={() => setPanel('drawer', false)}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-300 hover:bg-neutral-800"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex flex-1 flex-col divide-y divide-neutral-800 overflow-hidden">
          <div className="h-1/2 overflow-y-auto">
            <LayersPanel as="drawer" />
          </div>
          <div className="h-1/2 overflow-y-auto">
            <PropertiesPanel as="drawer" />
          </div>
        </div>
      </aside>
    </div>
  );
}
