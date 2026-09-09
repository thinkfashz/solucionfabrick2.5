'use client';

import { ArrowRight, MessageCircle, ReceiptText } from 'lucide-react';
import { useMemo } from 'react';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function numberMeta(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value || 0) || 0;
}

function lineRange(item: { quantity: number; refPrice?: number; meta?: Record<string, unknown> }) {
  const fallback = Math.max(0, item.refPrice || 0) * Math.max(0, item.quantity || 0);
  const low = numberMeta(item.meta, 'selectedLow') || numberMeta(item.meta, 'marketLow') || fallback;
  const high = numberMeta(item.meta, 'selectedHigh') || numberMeta(item.meta, 'marketHigh') || low;
  return { low, high };
}

function range(low: number, high: number) {
  return Math.round(low) === Math.round(high) ? CLP.format(low) : `${CLP.format(low)} – ${CLP.format(high)}`;
}

export default function BudgetDirectWhatsApp() {
  const { items } = useQuoteCart();

  const summary = useMemo(() => {
    const totals = items.reduce((acc, item) => {
      const current = lineRange(item);
      return { low: acc.low + current.low, high: acc.high + current.high };
    }, { low: 0, high: 0 });

    const rows = items.slice(0, 20).map((item, index) => {
      const current = lineRange(item);
      const mode = typeof item.meta?.priceMode === 'string'
        ? item.meta.priceMode === 'labor' ? 'solo ejecución' : 'trabajo vendido'
        : item.kind === 'material' ? 'producto' : 'servicio';
      return `${index + 1}. ${item.title} · ${item.quantity} ${item.unit || 'un'} · ${mode} · ${range(current.low, current.high)}`;
    });

    const extra = items.length > 20 ? `\n+ ${items.length - 20} partidas adicionales` : '';
    const message = [
      'Hola Soluciones Fabrick, armé este presupuesto en la web y quiero cotizarlo con ustedes:',
      '',
      ...rows,
      extra,
      '',
      `TOTAL REFERENCIAL: ${range(totals.low, totals.high)}`,
      '',
      'Quiero revisar alcance, materiales, medidas y valor definitivo.',
    ].filter(Boolean).join('\n');

    return { href: buildWhatsAppLink(message), totals };
  }, [items]);

  return (
    <section className="border-t border-white/8 bg-[#071015] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1240px] gap-5 rounded-[1.4rem] border border-[#F6C64A]/18 bg-[radial-gradient(circle_at_92%_4%,rgba(246,198,74,.13),transparent_24rem),rgba(255,255,255,.025)] p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F6C64A] text-black"><ReceiptText className="h-5 w-5" /></span>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.17em] text-[#57D4FF]">Otra forma de continuar</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.035em] sm:text-2xl">¿Prefieres WhatsApp sin completar el correo?</h2>
            <p className="mt-2 max-w-2xl text-[11px] leading-6 text-white/42">Cuando tengas partidas agregadas, este acceso prepara automáticamente el detalle, cantidades, modalidad y rango total para conversar directamente con Soluciones Fabrick.</p>
            {items.length ? <p className="mt-3 text-[10px] font-black text-[#F6C64A]">{items.length} {items.length === 1 ? 'partida' : 'partidas'} · {range(summary.totals.low, summary.totals.high)}</p> : <p className="mt-3 text-[10px] text-white/30">Agrega al menos una partida en la calculadora para habilitar el resumen.</p>}
          </div>
        </div>
        {items.length ? <a href={summary.href} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-6 text-xs font-black text-black transition hover:brightness-105"><MessageCircle className="h-4 w-4" /> Cotizar directo por WhatsApp <ArrowRight className="h-4 w-4" /></a> : <span className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 px-6 text-xs font-black text-white/25">Primero agrega una partida</span>}
      </div>
    </section>
  );
}
