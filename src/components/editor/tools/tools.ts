'use client';

/**
 * Tool definitions shared by Desktop & Mobile shells.
 * Keeping them in one module ensures the icon, label and shortcut stay in
 * sync between both layouts.
 */

import {
  DoorOpen,
  Layers,
  Maximize,
  MousePointer2,
  Ruler,
  Square,
  Triangle,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { EditorTool } from '../store/useEditor';

export interface ToolDescriptor {
  id: EditorTool;
  label: string;
  hint: string;
  Icon: LucideIcon;
  /** Keyboard shortcut (single key) — desktop only. */
  shortcut?: string;
}

export const PRIMARY_TOOLS: ToolDescriptor[] = [
  { id: 'select',  label: 'Seleccionar', hint: 'Mover y seleccionar (V)',     Icon: MousePointer2, shortcut: 'V' },
  { id: 'wall',    label: 'Muro',        hint: 'Dibujar muros (W)',           Icon: Square,        shortcut: 'W' },
  { id: 'door',    label: 'Puerta',      hint: 'Insertar puerta (D)',         Icon: DoorOpen,      shortcut: 'D' },
  { id: 'window',  label: 'Ventana',     hint: 'Insertar ventana (N)',        Icon: Maximize,      shortcut: 'N' },
  { id: 'slab',    label: 'Losa',        hint: 'Dibujar losa (S)',            Icon: Layers,        shortcut: 'S' },
  { id: 'roof',    label: 'Techo',       hint: 'Dibujar techo (R)',           Icon: Triangle,      shortcut: 'R' },
  { id: 'measure', label: 'Medir',       hint: 'Medir distancia (M)',         Icon: Ruler,         shortcut: 'M' },
];

export const SECONDARY_ICON: LucideIcon = Wrench;
