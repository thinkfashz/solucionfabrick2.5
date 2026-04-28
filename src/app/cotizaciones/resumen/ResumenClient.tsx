'use client';

/**
 * /cotizaciones/resumen — "Lista para armar la casa".
 *
 * Une los items del QuoteCart (servicios, paneles 3D, materiales) en una
 * vista imprimible/exportable a PDF. No muestra precios al cliente — solo
 * la lista organizada por categoría con cantidades, unidades y notas.
 */

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Send, Layers, Wrench, ShoppingBag } from 'lucide-react';
import { useQuoteCart, type QuoteItem } from '@/context/QuoteCartContext';

const KIND_LABEL: Record<QuoteItem['kind'], string> = {
  service: 'Servicios profesionales',
  panel: 'Paneles del diseño 3D',
  material: 'Materiales de obra',
};
const KIND_ICON = {
  service: Wrench,
  panel: Layers,
  material: ShoppingBag,
};

export default function ResumenClient() {
  const router = useRouter();
  const { items, totalItems } = useQuoteCart();

  const grouped = useMemo(() => {
    const out: Record<QuoteItem['kind'], QuoteItem[]> = {
      service: [],
      panel: [],
      material: [],
    };
    items.forEach((i) => {
      out[i.kind].push(i);
    });
    return out;
  }, [items]);

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-black text-white pt-24 pb-32 px-4">
        <div className="max-w-md mx-auto text-center">
          <p className="text-zinc-400 mb-6">No tienes ítems en tu cotización.</p>
          <Link
            href="/servicios"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-colors"
          >
            Explorar servicios
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1.5cm; }
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print-page { background: white !important; color: black !important; }
          .print-page * { color: black !important; border-color: #ddd !important; background: white !important; }
          .print-page h1, .print-page h2, .print-page h3, .print-page p, .print-page span, .print-page li { color: black !important; }
          .print-page .print-accent { color: #c9a96e !important; }
        }
      `}</style>
      <main className="min-h-screen bg-black text-white pt-24 pb-32 px-4 print-page">
        <div className="max-w-3xl mx-auto">
          <div className="print:hidden flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-yellow-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-200 text-[10px] font-black uppercase tracking-[0.18em] transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
              </button>
              <Link
                href="/cotizaciones/enviar"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-[0.18em] hover:bg-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Solicitar
              </Link>
            </div>
          </div>

          <header className="mb-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400 mb-2 print-accent">
              Soluciones Fabrick · Resumen de Cotización
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Lista para armar tu casa
            </h1>
            <p className="text-zinc-400 text-sm mt-3">
              {totalItems} ítem{totalItems === 1 ? '' : 's'} consolidados ·{' '}
              {new Date().toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </header>

          {(['panel', 'service', 'material'] as const).map((kind) => {
            const list = grouped[kind];
            if (list.length === 0) return null;
            const Icon = KIND_ICON[kind];
            return (
              <section
                key={kind}
                className="mb-10 rounded-[1.5rem] border border-white/8 bg-zinc-950/60 p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-yellow-400 print-accent" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-black uppercase tracking-[0.18em] text-white">
                      {KIND_LABEL[kind]}
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                      {list.length} ítem{list.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <ul className="space-y-3">
                  {list.map((it, i) => (
                    <li
                      key={it.id}
                      className="flex flex-wrap md:flex-nowrap gap-3 items-start py-3 border-b border-white/5 last:border-b-0"
                    >
                      <span className="font-black text-yellow-400 text-sm w-7 print-accent">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm md:text-base font-bold leading-snug">
                          {it.title}
                        </p>
                        {it.description && (
                          <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">
                            {it.description}
                          </p>
                        )}
                        {it.notes && (
                          <p className="text-zinc-300 italic text-xs mt-1 border-l-2 border-yellow-400/40 pl-2">
                            {it.notes}
                          </p>
                        )}
                        {it.meta && Object.keys(it.meta).length > 0 && (
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.18em] mt-1">
                            {Object.entries(it.meta)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-yellow-400 font-black text-base print-accent">
                          {it.quantity}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                          {it.unit ?? 'un'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <footer className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400 print-accent mb-2">
              Soluciones Fabrick — Construimos tu visión
            </p>
            <p className="text-xs text-zinc-500">
              Este documento es un resumen referencial. La cotización formal
              con valores y plazos será emitida por el equipo Fabrick tras
              recibir tu solicitud.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
