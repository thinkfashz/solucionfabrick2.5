'use client';

import useEditor from '../store/useEditor';
import { PRIMARY_TOOLS } from '../tools/tools';

/**
 * Vertical desktop tool rail (≥768px). Touch targets are 44×44 to remain
 * comfortable on tablets in landscape (which still match `md:`).
 */
export default function SideToolbar() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);

  return (
    <nav
      aria-label="Herramientas"
      className="hidden md:flex absolute left-0 top-12 bottom-0 z-20 w-14 flex-col items-center gap-1 border-r border-neutral-800 bg-neutral-900/80 py-2 backdrop-blur"
    >
      {PRIMARY_TOOLS.map(({ id, label, hint, Icon }) => {
        const active = tool === id;
        return (
          <button
            key={id}
            type="button"
            title={hint}
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTool(id)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-md touch-manipulation transition-colors ${
              active
                ? 'bg-yellow-electric/15 text-yellow-electric'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </nav>
  );
}
