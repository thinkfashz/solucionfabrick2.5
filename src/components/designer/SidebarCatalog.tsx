'use client';

/**
 * SidebarCatalog — Sidebar izquierda con el catálogo de piezas.
 *
 * Estética premium: fondo `bg-zinc-900/95` con `backdrop-blur`, separadores
 * dorados (yellow-400) y tarjetas minimalistas con miniatura 3D
 * pre-renderizada de cada pieza. Click ⇒ inserta la pieza en el centro de
 * la escena y la deja seleccionada.
 */

import { useMemo, useState } from 'react';
import {
  Building2,
  Columns3,
  DoorOpen,
  type LucideIcon,
} from 'lucide-react';
import {
  useDesignStore,
  type ElementoCategoria,
} from '@/store/useDesignStore';
import { CATALOG, groupCatalog, type CatalogPiece } from './catalog';
import { CatalogThumb } from './CatalogThumb';

const CATEGORY_ICONS: Record<ElementoCategoria, LucideIcon> = {
  Estructura: Building2,
  Muros: Columns3,
  Aberturas: DoorOpen,
};

export function SidebarCatalog() {
  const grouped = useMemo(() => groupCatalog(), []);
  const addElemento = useDesignStore((s) => s.addElemento);
  const [search, setSearch] = useState('');

  const handlePick = (piece: CatalogPiece) => {
    addElemento({
      tipo: piece.tipo,
      categoria: piece.categoria,
      nombre: piece.nombre,
      posicion: [0, 0, 0],
      dimensiones: piece.dimensiones,
      rotacionY: 0,
      propiedadesMaterial: piece.propiedadesMaterial,
    });
  };

  const norm = search.trim().toLowerCase();
  const matches = (p: CatalogPiece) =>
    !norm ||
    p.nombre.toLowerCase().includes(norm) ||
    p.subcategoria.toLowerCase().includes(norm) ||
    p.categoria.toLowerCase().includes(norm);

  return (
    <aside
      className="pointer-events-auto flex h-full w-72 flex-col border-r border-yellow-400/10 bg-zinc-900/95 text-zinc-200 shadow-2xl backdrop-blur-md"
      aria-label="Catálogo de piezas"
    >
      <header className="border-b border-yellow-400/20 px-5 py-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-yellow-400">
          Soluciones Fabrick
        </p>
        <h2 className="mt-1 font-serif text-lg tracking-wide text-zinc-50">
          Catálogo de diseño
        </h2>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pieza…"
          className="mt-3 w-full rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition focus:border-yellow-400/60"
        />
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {(Object.keys(grouped) as ElementoCategoria[]).map((cat) => {
          const Icon = CATEGORY_ICONS[cat];
          const subs = grouped[cat];
          const visiblePieces = Object.values(subs).flat().filter(matches);
          if (!visiblePieces.length) return null;
          return (
            <section key={cat} className="mb-6">
              <div className="mb-3 flex items-center gap-2 px-1">
                {Icon && <Icon className="h-4 w-4 text-yellow-400" aria-hidden />}
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-400">
                  {cat}
                </h3>
              </div>
              {Object.entries(subs).map(([sub, pieces]) => {
                const visibles = pieces.filter(matches);
                if (!visibles.length) return null;
                return (
                  <div key={sub} className="mb-4">
                    <p className="mb-2 px-1 text-[10px] uppercase tracking-widest text-zinc-500">
                      {sub}
                    </p>
                    <ul className="grid grid-cols-2 gap-2">
                      {visibles.map((p) => (
                        <li key={p.catalogId}>
                          <button
                            type="button"
                            onClick={() => handlePick(p)}
                            className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60 text-left transition hover:border-yellow-400/60 hover:bg-zinc-900/80 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                            title={p.descripcion}
                          >
                            <div className="aspect-square w-full bg-gradient-to-br from-zinc-900 to-zinc-950">
                              <CatalogThumb piece={p} />
                            </div>
                            <div className="px-2 py-2">
                              <p className="line-clamp-2 text-xs font-medium text-zinc-100 group-hover:text-yellow-400">
                                {p.nombre}
                              </p>
                              <p className="mt-0.5 text-[10px] text-zinc-500">
                                {p.propiedadesMaterial.nombre}
                              </p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          );
        })}

        {!CATALOG.some(matches) && (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">
            Sin resultados para “{search}”.
          </p>
        )}
      </div>

      <footer className="border-t border-yellow-400/10 px-5 py-3 text-[10px] tracking-wide text-zinc-500">
        Click sobre una pieza para añadirla al diseño.
      </footer>
    </aside>
  );
}
