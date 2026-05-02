'use client';

import { Layers } from 'lucide-react';

import useEditor from '../store/useEditor';

/**
 * Layers panel — desktop sidebar (≥md) or mobile drawer entry.
 */
export default function LayersPanel({
  as = 'sidebar',
}: {
  as?: 'sidebar' | 'drawer';
}) {
  const open = useEditor((s) => s.panels.layers);
  if (as === 'sidebar' && !open) return null;

  const wrapperClasses =
    as === 'sidebar'
      ? 'hidden md:flex lg:hidden absolute right-0 top-12 bottom-14 z-20 w-64 flex-col border-l border-neutral-800 bg-neutral-900/85 backdrop-blur'
      : 'flex h-full w-full flex-col bg-neutral-900 text-neutral-100';

  return (
    <aside aria-label="Capas" className={wrapperClasses}>
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-neutral-800 px-4">
        <Layers className="h-4 w-4 text-neutral-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Capas
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4 text-sm text-neutral-300">
        <p className="text-xs leading-relaxed text-neutral-500">
          Aquí aparecerán los niveles, edificios y zonas del proyecto.
        </p>
      </div>
    </aside>
  );
}
