'use client';

import useEditor from '../store/useEditor';

/**
 * Right-hand properties panel for desktop / large tablets (≥1024px).
 * Below `lg` the panel collapses; on mobile it lives inside `MobileDrawer`.
 *
 * The panel renders the *currently active tool's* contextual settings.
 * Tool-specific UIs live alongside the tool components and are mounted via
 * a registry so this component stays tiny.
 */
export default function PropertiesPanel({
  as = 'sidebar',
}: {
  as?: 'sidebar' | 'drawer';
}) {
  const tool = useEditor((s) => s.tool);
  const open = useEditor((s) => s.panels.properties);
  if (as === 'sidebar' && !open) return null;

  const wrapperClasses =
    as === 'sidebar'
      ? 'hidden lg:flex absolute right-0 top-12 bottom-0 z-20 w-72 flex-col border-l border-neutral-800 bg-neutral-900/85 backdrop-blur'
      : 'flex h-full w-full flex-col bg-neutral-900 text-neutral-100';

  return (
    <aside aria-label="Propiedades" className={wrapperClasses}>
      <header className="flex h-10 shrink-0 items-center border-b border-neutral-800 px-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Propiedades
        </h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4 text-sm text-neutral-300">
        <p className="mb-2 text-neutral-500">Herramienta activa</p>
        <p className="mb-4 font-medium text-neutral-100 capitalize">{tool}</p>
        <p className="text-xs leading-relaxed text-neutral-500">
          Selecciona un elemento del lienzo 3D para ver y editar sus propiedades.
        </p>
      </div>
    </aside>
  );
}
