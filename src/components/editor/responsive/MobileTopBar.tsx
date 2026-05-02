'use client';

import { Menu } from 'lucide-react';

import EditorBrand from '../brand/EditorBrand';
import useEditor from '../store/useEditor';

/**
 * Floating top-left hamburger for mobile. Opens `MobileDrawer`. Doubles as
 * the brand mark since the desktop `TopBar` is hidden at this breakpoint.
 */
export default function MobileTopBar() {
  const setPanel = useEditor((s) => s.setPanel);

  return (
    <header className="md:hidden absolute top-0 inset-x-0 z-30 flex h-12 items-center justify-between px-3 pt-[env(safe-area-inset-top)]">
      <button
        type="button"
        onClick={() => setPanel('drawer', true)}
        aria-label="Abrir menú"
        className="flex h-11 w-11 items-center justify-center rounded-md bg-neutral-900/80 text-neutral-100 backdrop-blur touch-manipulation active:bg-neutral-800"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="rounded-md bg-neutral-900/70 px-2 py-1 backdrop-blur">
        <EditorBrand variant="mono-light" height={20} />
      </div>
      <span className="h-11 w-11" aria-hidden />
    </header>
  );
}
