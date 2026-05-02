'use client';

/**
 * useEditor — local zustand slice for the integrated 3D editor.
 *
 * Mirrors the `apps/editor/src/store/use-editor` slice from the upstream
 * `pascalorg/editor` monorepo. We re-implement the minimum needed surface
 * here so we don't have to vendor the whole upstream app:
 *
 *   - `tool`              currently active editing tool
 *   - `panels`            visibility of secondary UI panels (layers, properties)
 *   - `isInteracting`     true while the user drags the camera or a tool;
 *                         consumed by `<Canvas frameloop>` to throttle render.
 *
 * Scene data lives in `@pascal-app/core`'s `useScene` and viewer state in
 * `@pascal-app/viewer`'s `useViewer`. This store only owns *editor* state.
 */

import { create } from 'zustand';

export type EditorTool = 'select' | 'wall' | 'door' | 'window' | 'slab' | 'roof' | 'measure';

export interface EditorPanels {
  layers: boolean;
  properties: boolean;
  /** Mobile-only off-canvas drawer. */
  drawer: boolean;
}

interface EditorState {
  tool: EditorTool;
  panels: EditorPanels;
  isInteracting: boolean;

  setTool: (tool: EditorTool) => void;
  togglePanel: (key: keyof EditorPanels) => void;
  setPanel: (key: keyof EditorPanels, open: boolean) => void;
  setInteracting: (v: boolean) => void;
}

export const useEditor = create<EditorState>((set) => ({
  tool: 'select',
  panels: { layers: true, properties: true, drawer: false },
  isInteracting: false,

  setTool: (tool) => set({ tool }),
  togglePanel: (key) =>
    set((state) => ({ panels: { ...state.panels, [key]: !state.panels[key] } })),
  setPanel: (key, open) =>
    set((state) => ({ panels: { ...state.panels, [key]: open } })),
  setInteracting: (v) => set({ isInteracting: v }),
}));

export default useEditor;
