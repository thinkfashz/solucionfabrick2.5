'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';

/**
 * Command palette liviana para el panel admin.
 *
 * Se evita framer-motion aqui porque este componente se monta dentro del shell
 * global del admin. Mantenerlo solo con React + CSS evita meter una libreria
 * pesada en todas las paginas del panel antes de que el usuario use el buscador.
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

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

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

  useEffect(() => {
    if (activeIdx >= results.length) setActiveIdx(0);
  }, [results.length, activeIdx]);

  function close() {
    onOpenChange(false);
  }

  function goTo(href: string) {
    close();
    router.push(href);
  }

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
      if (target) goTo(target.href);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Cerrar buscador"
        onClick={close}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-[0_20px_80px_rgba(0,0,0,0.6)] animate-[adminPaletteIn_.16s_ease-out]">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-zinc-500" aria-hidden />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar pagina... (productos, blog, errores, ...)"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
          <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:inline-block">
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
                  onClick={() => goTo(item.href)}
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
          <span>Arriba/abajo navegar · Enter abrir</span>
          <span>Cmd/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
