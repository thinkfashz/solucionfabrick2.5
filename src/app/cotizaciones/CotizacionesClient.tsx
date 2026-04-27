'use client';

/**
 * /cotizaciones — Carrito de servicios + paneles del diseñador 3D + materiales.
 *
 * Muestra todos los items del QuoteCart con paginación local, controles de
 * cantidad/notas/eliminar y CTAs para enviar la cotización o limpiar todo.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Send,
  FileText,
  ShoppingBag,
  Layers as LayersIcon,
  Wrench,
  Home as HomeIcon,
  StickyNote,
} from 'lucide-react';
import { useQuoteCart, type QuoteItem } from '@/context/QuoteCartContext';

const PAGE_SIZE = 6;

const KIND_META: Record<
  QuoteItem['kind'],
  { label: string; Icon: typeof Wrench; color: string }
> = {
  service: { label: 'Servicio', Icon: Wrench, color: 'text-yellow-400' },
  panel: { label: 'Panel', Icon: LayersIcon, color: 'text-emerald-400' },
  material: { label: 'Material', Icon: ShoppingBag, color: 'text-sky-400' },
};

function KindBadge({ kind }: { kind: QuoteItem['kind'] }) {
  const meta = KIND_META[kind];
  const Icon = meta.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] ${meta.color}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function CotizacionesClient() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, updateNotes, clear, totalItems } =
    useQuoteCart();
  const [filter, setFilter] = useState<'all' | QuoteItem['kind']>('all');
  const [page, setPage] = useState(1);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.kind === filter)),
    [items, filter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const counts = useMemo(() => {
    const c: Record<QuoteItem['kind'] | 'all', number> = {
      all: items.length,
      service: 0,
      panel: 0,
      material: 0,
    };
    items.forEach((i) => {
      c[i.kind] += 1;
    });
    return c;
  }, [items]);

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white pt-24 pb-32 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mb-6">
            <FileText className="w-9 h-9 text-yellow-400" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 mb-3">
            Mi Cotización
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">
            Tu cotización está vacía
          </h1>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-md mx-auto mb-10">
            Agrega servicios desde el catálogo, paneles desde el diseñador 3D
            de tu casa o materiales desde la tienda. Después arma una sola
            lista para tu obra.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/servicios"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors"
            >
              <Wrench className="w-4 h-4" /> Ver servicios
            </Link>
            <Link
              href="/juego"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-yellow-400/40 text-yellow-400 font-black uppercase tracking-widest text-xs hover:bg-yellow-400/10 transition-colors"
            >
              <HomeIcon className="w-4 h-4" /> Diseñar mi casa
            </Link>
            <Link
              href="/tienda"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/15 text-zinc-300 font-black uppercase tracking-widest text-xs hover:border-white/30 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> Ir a la tienda
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pt-24 pb-32 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver
        </button>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 mb-2">
              Mi Cotización
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              {totalItems} ítem{totalItems === 1 ? '' : 's'} en tu lista de obra
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/cotizaciones/resumen"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-[0.18em] hover:bg-white transition-colors"
            >
              <FileText className="w-4 h-4" /> Ver resumen / PDF
            </Link>
            <Link
              href="/cotizaciones/enviar"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-yellow-400/40 text-yellow-400 text-[10px] font-black uppercase tracking-[0.18em] hover:bg-yellow-400/10 transition-colors"
            >
              <Send className="w-4 h-4" /> Solicitar cotización
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/5 pb-4">
          {(['all', 'service', 'panel', 'material'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setFilter(k);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                filter === k
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
              }`}
            >
              {k === 'all' ? 'Todo' : KIND_META[k].label}
              <span
                className={`px-1.5 rounded text-[9px] ${
                  filter === k ? 'bg-black/15 text-black' : 'bg-white/10 text-zinc-300'
                }`}
              >
                {counts[k]}
              </span>
            </button>
          ))}
        </div>

        {/* Items */}
        <ul className="space-y-3">
          {pageItems.map((it) => (
            <li
              key={it.id}
              className="rounded-[1.5rem] border border-white/8 bg-zinc-950/85 p-5 md:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <KindBadge kind={it.kind} />
                    {it.unit && (
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        Unidad: {it.unit}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white text-base md:text-lg font-bold leading-snug">
                    {it.title}
                  </h3>
                  {it.description && (
                    <p className="mt-1 text-zinc-400 text-xs md:text-sm leading-relaxed line-clamp-2">
                      {it.description}
                    </p>
                  )}
                  {it.meta && Object.keys(it.meta).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {Object.entries(it.meta).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  aria-label="Eliminar ítem"
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* Quantity */}
                <div className="inline-flex items-center bg-black border border-white/10 rounded-full">
                  <button
                    type="button"
                    onClick={() => updateQuantity(it.id, Math.max(1, it.quantity - 1))}
                    aria-label="Reducir cantidad"
                    className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-yellow-400 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-sm font-black text-white tabular-nums">
                    {it.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(it.id, it.quantity + 1)}
                    aria-label="Aumentar cantidad"
                    className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-yellow-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingNotes(editingNotes === it.id ? null : it.id)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors"
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  {it.notes ? 'Editar nota' : 'Agregar nota'}
                </button>
              </div>

              {editingNotes === it.id && (
                <textarea
                  value={it.notes ?? ''}
                  onChange={(e) => updateNotes(it.id, e.target.value)}
                  placeholder="Detalles, dimensiones, preferencias…"
                  rows={3}
                  className="mt-3 w-full rounded-xl bg-black border border-white/10 focus:border-yellow-400/50 focus:outline-none p-3 text-sm text-white placeholder-zinc-600 resize-none"
                />
              )}
              {it.notes && editingNotes !== it.id && (
                <p className="mt-3 text-xs text-zinc-300 italic border-l-2 border-yellow-400/40 pl-3">
                  {it.notes}
                </p>
              )}
            </li>
          ))}
        </ul>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 disabled:opacity-30 hover:border-yellow-400/40 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 px-3">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-2 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 disabled:opacity-30 hover:border-yellow-400/40 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-white/5">
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Vaciar toda tu cotización?')) clear();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-red-300 hover:text-red-200 hover:bg-red-500/5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vaciar lista
          </button>
          <Link
            href="/cotizaciones/enviar"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors shadow-[0_0_30px_rgba(250,204,21,0.2)]"
          >
            <Send className="w-4 h-4" /> Enviar para cotizar
          </Link>
        </div>
      </div>
    </main>
  );
}
