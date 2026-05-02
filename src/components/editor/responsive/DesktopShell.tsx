'use client';

import EditorCanvas from '../EditorCanvas';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';
import SideToolbar from './SideToolbar';
import TopBar from './TopBar';

/**
 * Desktop / large-tablet shell (≥768px).
 *
 * Layout (z-index in parens):
 *   • <EditorCanvas/> absolute inset-0     (z-0)  — 3D viewport always 100%
 *   • <TopBar/>       top-0 h-12            (z-20) — branding + panel toggles
 *   • <SideToolbar/>  left-0 w-14           (z-20) — vertical tool rail
 *   • <LayersPanel/>  right-0 (md..lg only) (z-20) — collapses on lg
 *   • <PropertiesPanel/> right-0 w-72 (lg+) (z-20)
 */
export default function DesktopShell() {
  return (
    <>
      <EditorCanvas />
      <TopBar />
      <SideToolbar />
      <LayersPanel as="sidebar" />
      <PropertiesPanel as="sidebar" />
    </>
  );
}
