'use client';

import useEditor from '../store/useEditor';
import { PRIMARY_TOOLS } from '../tools/tools';

/**
 * Mobile bottom toolbar — primary tools only. Fixed to the bottom of the
 * viewport with `pb-[env(safe-area-inset-bottom)]` so it clears the iOS home
 * indicator. Hidden on `md` and above; that breakpoint shows `SideToolbar`
 * instead.
 */
export default function BottomToolbar() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);

  return (
    <nav
      aria-label="Herramientas"
      className="md:hidden fixed bottom-0 inset-x-0 z-20 flex items-center justify-around border-t border-neutral-800 bg-neutral-900/90 px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur"
    >
      {PRIMARY_TOOLS.map(({ id, label, Icon }) => {
        const active = tool === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => setTool(id)}
            className={`flex h-12 w-12 flex-col items-center justify-center rounded-md touch-manipulation transition-colors ${
              active
                ? 'bg-yellow-electric/15 text-yellow-electric'
                : 'text-neutral-300 active:bg-neutral-800'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
