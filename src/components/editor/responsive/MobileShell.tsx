'use client';

import EditorCanvas from '../EditorCanvas';
import BottomToolbar from './BottomToolbar';
import MobileDrawer from './MobileDrawer';
import MobileTopBar from './MobileTopBar';

/**
 * Mobile shell (<768px).
 *
 * Canvas takes the full viewport. UI floats over it:
 *   • <MobileTopBar/>  hamburger + brand (top, z-30)
 *   • <BottomToolbar/> primary tools     (bottom, z-20, safe-area aware)
 *   • <MobileDrawer/>  off-canvas panels (z-40, backdrop)
 *
 * No re-layout when panels open: they sit on top of the canvas, which keeps
 * R3F from re-sizing its render target on every interaction.
 */
export default function MobileShell() {
  return (
    <>
      <EditorCanvas />
      <MobileTopBar />
      <BottomToolbar />
      <MobileDrawer />
    </>
  );
}
