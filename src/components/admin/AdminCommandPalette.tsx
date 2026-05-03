'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';

/**
 * Command palette estilo Linear/Slack para el panel admin.
 *
 * - Se abre con `Cmd+K` (macOS) / `Ctrl+K` (resto) y con `/` cuando
 *   el foco no está en un input.
 * - Filtra las rutas pasadas en `items` por label/description (case-
 *   insensitive, multi-token, sin importar el orden).
 * - ↑↓ para navegar, Enter para abrir, Esc para cerrar.
 *
 * Mantiene el estado del input vacío al abrir y resetea el índice
 * activo a 0 cada vez que cambian los resultados.
 */
export type CommandItem = {
  href: string;
  label: string;
  description?: string;
};

interface Props {
  items: CommandItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCommandPalette({ items, open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // Reset state every time the palette is opened.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

  // Global hotkeys: Cmd/Ctrl+K opens, "/" opens (when not typing).
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !(e.metaKey || e.ctrlKey || e.altKey);
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isCmdK) {
        e.preventDefault();
        onOpenChange(true);
        return;
      }
      if (isSlash && !isEditable) {
        e.preventDefault();
        onOpenChange(true);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    const tokens = q.split(/\s+/).filter(Boolean);
    return items
      .filter((item) => {
        const haystack = `${item.label} ${item.description ?? ''}`.toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      })
      .slice(0, 20);
  }, [items, query]);

  // Keep activeIdx within the result range.
  useEffect(() => {
    if (activeIdx >= results.length) setActiveIdx(0);
  }, [results.length, activeIdx]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((idx) => Math.min(idx + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((idx) => Math.max(idx - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIdx];
      if (target) {
        onOpenChange(false);
        router.push(target.href);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="command-palette"
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar buscador"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Search className="h-4 w-4 text-zinc-500" aria-hidden />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar página… (productos, blog, errores, …)"
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
              <kbd className="hidden sm:inline-block rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                Esc
              </kbd>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {results.length === 0 && (
                <li className="px-4 py-6 text-center text-[12px] text-zinc-500">Sin resultados.</li>
              )}
              {results.map((item, idx) => {
                const active = idx === activeIdx;
                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => {
                        onOpenChange(false);
                        router.push(item.href);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition ${
                        active ? 'bg-yellow-400/15 text-yellow-100' : 'text-zinc-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{item.label}</p>
                        {item.description && (
                          <p className="truncate text-[10.5px] text-zinc-500">{item.description}</p>
                        )}
                      </div>
                      <ArrowRight className={`h-3.5 w-3.5 flex-shrink-0 ${active ? 'text-yellow-400' : 'text-zinc-600'}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              <span>↑↓ navegar · Enter abrir</span>
              <span>Cmd/Ctrl + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
