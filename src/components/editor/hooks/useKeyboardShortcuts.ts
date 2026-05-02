'use client';

import { useEffect } from 'react';

import useEditor, { type EditorTool } from '../store/useEditor';
import { PRIMARY_TOOLS } from '../tools/tools';

/**
 * Bind single-letter shortcuts to tools. Only fires when no input element is
 * focused so the user can still type into properties panels.
 */
export default function useKeyboardShortcuts(): void {
  const setTool = useEditor((s) => s.setTool);

  useEffect(() => {
    const map = new Map<string, EditorTool>();
    for (const t of PRIMARY_TOOLS) {
      if (t.shortcut) map.set(t.shortcut.toLowerCase(), t.id);
    }

    const isTypingTarget = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const tool = map.get(e.key.toLowerCase());
      if (tool) {
        e.preventDefault();
        setTool(tool);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setTool]);
}
