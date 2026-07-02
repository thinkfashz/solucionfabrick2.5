'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Info, Ruler, Send } from 'lucide-react';
import {
  calculateServiceQuote,
  getDefaultPrice,
  type QuoteBreakdown,
  type QuoteInput,
  type ServicePriceSetting,
  type ServiceUnit,
  unitLabel,
} from '@/lib/servicePricing';
import { buildWhatsAppLink } from '@/lib/whatsapp';

const fmt = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const pct = new Intl.NumberFormat('es-CL', {
  style: 'percent',
  maximumFractionDigits: 0,
});

interface Props {
  slug: string;
  serviceName?: string;
}

function numberInput(value: number, set: (n: number) => void, label: string, suffix: string) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black px-4 py-3 focus-within:border-yellow-300/60">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={value || ''}
          onChange={(e) => set(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-lg font-black text-white outline-none placeholder:text-zinc-700"
          placeholder="0"
        />
        <span className="text-xs font-bold uppercase tracking-widest text-yellow-300">{suffix}</span>
      </div>
    </label>
  );
}

function buildInitialInput(setting: ServicePriceSetting): QuoteInput {
  return {
    slug: setting.slug,
    unit: setting.unit,
    length: setting.unit === 'm2' || setting.unit === 'm3' ? 3 : 0,
    width: setting.unit === 'm2' || setting.unit === 'm3' ? 3 : 0,
    height: setting.unit === 'm3' ? 0.12 : 0,
    linearMeters: setting.unit === 'ml' ? 5 : 0,
    quantity: setting.unit === 'punto' || setting.unit === 'unidad' ? 1 : 0,
    includeIva: true,
  };
}

export default function ServiceQuoteCalculator({ slug, serviceName }: Props) {
  const fallback = getDefaultPrice(slug);
  const [setting, setSetting] = useState<ServicePriceSetting>(fallback);
  const [input, setInput] = useState<QuoteInput>(() => buildInitialInput(fallback));
  const [source, setSource] = useState<'defaults' | 'database' | 'loading'>('loading');

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/service-prices?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const json = (await res.json()) as { prices?: ServicePriceSetting[]; source?: 'defaults' | 'database' };
        const next = json.prices?.[0] ?? fallback;
        if (!alive) return;
        setSetting(next);
        setSource(json.source ?? 'defaults');
        setInput((prev) => ({ ...buildInitialInput(next), ...prev, slug: next.slug, unit: next.unit }));
      } catch {
        if (!alive) return;
        setSetting(fallback);
        setSource('defaults');
      }
    }
    void load();
    return () => { alive = false; };
  }, [slug]);

  const quote: QuoteBreakdown = useMemo(() => calculateServiceQuote(setting, input), [setting, input]);
  const serviceLabel = serviceName || setting.name;
  const chart = [
    { label: 'Materiales', value: quote.materials, pct: setting.materialsPct },
    { label: 'Mano de obra', value: quote.labor, pct: setting.laborPct },
    { label: 'Logística', value: quote.logistics, pct: setting.logisticsPct },
    { label: 'Imprevistos', value: quote.contingency, pct: setting.contingencyPct },
  ];
  const max = Math.max(...chart.map((item) => item.value), 1);

  const update = (patch: Partial<QuoteInput>) => setInput((prev) => ({ ...prev, ...patch }));

  const whatsappText = `Hola Soluciones Fabrick, calculé un aproximado para ${serviceLabel}. Cantidad: ${quote.quantity.toFixed(2)} ${unitLabel(quote.unit)}. Rango aproximado: ${fmt.format(quote.marketLow)} a ${fmt.format(quote.marketHigh)}. Total calculado: ${fmt.format(quote.total)}. Quiero revisión real en terreno.`;

  return (
    <section className="rounded-[2rem] border border-yellow-300/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-black">
              <Calculator className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Calculadora aproximada</p>
              <h2 className="text-2xl font-black text-white md:text-3xl">Calcula por {unitLabel(setting.unit)}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Ingresa medidas simples para tener un rango de referencia. Este cálculo no reemplaza la visita técnica ni es precio final.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(setting.unit === 'm2' || setting.unit === 'm3') ? (
              <>
                {numberInput(input.length, (n) => update({ length: n }), 'Largo', 'm')}
                {numberInput(input.width, (n) => update({ width: n }), 'Ancho', 'm')}
              </>
            ) : null}
            {setting.unit === 'm3' ? numberInput(input.height, (n) => update({ height: n }), 'Alto / espesor', 'm') : null}
            {setting.unit === 'ml' ? numberInput(input.linearMeters, (n) => update({ linearMeters: n }), 'Metros lineales', 'ml') : null}
            {(setting.unit === 'punto' || setting.unit === 'unidad') ? numberInput(input.quantity, (n) => update({ quantity: n }), setting.unit === 'punto' ? 'Cantidad de puntos' : 'Cantidad', setting.unit === 'punto' ? 'pts' : 'u') : null}
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={input.includeIva}
              onChange={(e) => update({ includeIva: e.target.checked })}
              className="h-4 w-4 accent-yellow-300"
            />
            Incluir IVA 19% en el resultado aproximado
          </label>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-black/70 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">Resultado estimado</p>
              <h3 className="mt-2 text-3xl font-black text-yellow-300">{fmt.format(quote.total)}</h3>
              <p className="mt-1 text-xs text-zinc-500">{quote.quantity.toFixed(2)} {unitLabel(quote.unit)} · base {fmt.format(setting.basePrice)} / {unitLabel(setting.unit)}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {source === 'database' ? 'Admin' : source === 'loading' ? 'Cargando' : 'Referencia'}
            </span>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <Row label="Subtotal" value={fmt.format(quote.subtotal)} />
            <Row label="IVA" value={fmt.format(quote.iva)} />
            <Row label="Mercado referencial" value={`${fmt.format(quote.marketLow)} – ${fmt.format(quote.marketHigh)}`} highlight />
          </div>

          <div className="mt-6 space-y-3">
            {chart.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-300">{item.label}</span>
                  <span className="text-zinc-500">{fmt.format(item.value)} · {pct.format(item.pct)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-yellow-300" style={{ width: `${Math.max(6, Math.round((item.value / max) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-yellow-300/20 bg-yellow-300/8 p-4 text-xs leading-6 text-zinc-300">
            <div className="mb-2 flex items-center gap-2 font-black uppercase tracking-[0.18em] text-yellow-300">
              <Info className="h-4 w-4" /> Aviso importante
            </div>
            {setting.disclaimer || 'Este valor es aproximado. El precio final requiere revisión de terreno, materiales y condiciones reales.'}
          </div>

          <a
            href={buildWhatsAppLink(whatsappText)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white"
          >
            Pedir revisión real <Send className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.025] px-4 py-3">
      <span className="text-zinc-500">{label}</span>
      <span className={highlight ? 'font-black text-yellow-300' : 'font-bold text-white'}>{value}</span>
    </div>
  );
}
