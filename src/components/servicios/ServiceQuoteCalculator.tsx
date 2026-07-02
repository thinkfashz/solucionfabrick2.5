'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Info, PackageSearch, Send, Truck } from 'lucide-react';
import {
  calculateServiceQuote,
  getDefaultPrice,
  type QuoteBreakdown,
  type QuoteInput,
  type ServicePriceSetting,
  unitLabel,
} from '@/lib/servicePricing';
import { buildWhatsAppLink } from '@/lib/whatsapp';

const fmt = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

interface Props {
  slug: string;
  serviceName?: string;
}

type ConcreteMode = 'trompo' | 'premezclado';

const CONCRETE_MODE: Record<ConcreteMode, { label: string; factor: number; detail: string }> = {
  trompo: {
    label: 'Preparación con trompo',
    factor: 0.92,
    detail: 'Mejor para trabajos pequeños o accesos complicados. Puede tomar más tiempo, pero suele ser más flexible.',
  },
  premezclado: {
    label: 'Camión premezclado',
    factor: 1.12,
    detail: 'Más rápido para mayor volumen. Puede subir por despacho, espera, acceso y cantidad mínima solicitada.',
  },
};

const RELATED_PRODUCTS: Record<string, Array<{ title: string; detail: string; href: string }>> = {
  gasfiteria: [
    { title: 'Llaves y grifería', detail: 'Cocina, lavamanos y ducha', href: '/tienda?categoria=griferia' },
    { title: 'Sanitarios y accesorios', detail: 'WC, lavamanos y kit instalación', href: '/tienda?categoria=banos' },
  ],
  electricidad: [
    { title: 'Iluminación y focos', detail: 'Opciones para interior y exterior', href: '/tienda?categoria=iluminacion' },
    { title: 'Accesorios eléctricos', detail: 'Canalización, enchufes y protecciones', href: '/tienda?categoria=electricidad' },
  ],
  pintura: [
    { title: 'Pinturas y selladores', detail: 'Terminación interior y exterior', href: '/tienda?categoria=pintura' },
    { title: 'Herramientas de aplicación', detail: 'Rodillos, brochas y protección', href: '/tienda?categoria=herramientas' },
  ],
  revestimiento: [
    { title: 'Revestimientos', detail: 'Opciones para muros y terminaciones', href: '/tienda?categoria=revestimientos' },
    { title: 'Aislación y placas', detail: 'Materiales complementarios', href: '/tienda?categoria=materiales' },
  ],
  seguridad: [
    { title: 'Cámaras y sensores', detail: 'Equipamiento para seguridad hogar', href: '/tienda?categoria=seguridad' },
    { title: 'Cerraduras y control', detail: 'Acceso y protección diaria', href: '/tienda?categoria=seguridad' },
  ],
  metalcon: [
    { title: 'Tornillería y fijaciones', detail: 'Complementos para montaje', href: '/tienda?categoria=materiales' },
    { title: 'Aislación y terminación', detail: 'Opciones para mejorar confort', href: '/tienda?categoria=materiales' },
  ],
};

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
  const [concreteMode, setConcreteMode] = useState<ConcreteMode>('trompo');

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

  const baseQuote: QuoteBreakdown = useMemo(() => calculateServiceQuote(setting, input), [setting, input]);
  const concreteFactor = setting.slug === 'cimientos' ? CONCRETE_MODE[concreteMode].factor : 1;
  const quote = useMemo<QuoteBreakdown>(() => {
    if (concreteFactor === 1) return baseQuote;
    return {
      ...baseQuote,
      subtotal: Math.round(baseQuote.subtotal * concreteFactor),
      iva: input.includeIva ? Math.round(baseQuote.subtotal * concreteFactor * 0.19) : 0,
      total: Math.round(baseQuote.subtotal * concreteFactor) + (input.includeIva ? Math.round(baseQuote.subtotal * concreteFactor * 0.19) : 0),
      marketLow: Math.round(baseQuote.marketLow * concreteFactor),
      marketHigh: Math.round(baseQuote.marketHigh * concreteFactor),
    };
  }, [baseQuote, concreteFactor, input.includeIva]);

  const serviceLabel = serviceName || setting.name;
  const relatedProducts = RELATED_PRODUCTS[setting.slug] ?? [];
  const update = (patch: Partial<QuoteInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const whatsappText = `Hola Soluciones Fabrick, calculé un aproximado para ${serviceLabel}. Cantidad: ${quote.quantity.toFixed(2)} ${unitLabel(quote.unit)}. Rango referencial: ${fmt.format(quote.marketLow)} a ${fmt.format(quote.marketHigh)}. Quiero revisión real y cotización final.`;

  return (
    <section className="rounded-[2rem] border border-yellow-300/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
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
            Ingresa medidas simples para tener una referencia inicial. El precio final se confirma después de revisar medidas, acceso y alcance real.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(setting.unit === 'm2' || setting.unit === 'm3') ? (
              <>
                {numberInput(input.length, (n) => update({ length: n }), 'Largo', 'm')}
                {numberInput(input.width, (n) => update({ width: n }), 'Ancho', 'm')}
              </>
            ) : null}
            {setting.unit === 'm3' ? numberInput(input.height, (n) => update({ height: n }), setting.slug === 'cimientos' ? 'Espesor / alto' : 'Alto', 'm') : null}
            {setting.unit === 'ml' ? numberInput(input.linearMeters, (n) => update({ linearMeters: n }), 'Metros lineales', 'ml') : null}
            {(setting.unit === 'punto' || setting.unit === 'unidad') ? numberInput(input.quantity, (n) => update({ quantity: n }), setting.unit === 'punto' ? 'Cantidad de puntos' : 'Cantidad', setting.unit === 'punto' ? 'pts' : 'u') : null}
          </div>

          {setting.slug === 'cimientos' ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Comparativa de hormigón</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['trompo', 'premezclado'] as ConcreteMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setConcreteMode(mode)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${concreteMode === mode ? 'border-yellow-300 bg-yellow-300/12 text-white' : 'border-white/10 bg-black text-zinc-400 hover:border-yellow-300/40'}`}
                  >
                    <span className="block text-sm font-black">{CONCRETE_MODE[mode].label}</span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">{CONCRETE_MODE[mode].detail}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs leading-6 text-zinc-500">La malla ACMA, refuerzos especiales, bombeo o despacho fuera de radio se suman aparte si el proyecto los necesita.</p>
            </div>
          ) : null}

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
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">Referencia inicial</p>
              <h3 className="mt-2 text-3xl font-black text-yellow-300">{fmt.format(quote.total)}</h3>
              <p className="mt-1 text-xs text-zinc-500">{quote.quantity.toFixed(2)} {unitLabel(quote.unit)} · {source === 'database' ? 'precio ajustado en admin' : 'precio de referencia'}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {source === 'database' ? 'Admin' : source === 'loading' ? 'Cargando' : 'Referencia'}
            </span>
          </div>

          <div className="mt-6 grid gap-3 text-sm">
            <Row label="Subtotal estimado" value={fmt.format(quote.subtotal)} />
            <Row label="IVA referencial" value={fmt.format(quote.iva)} />
            <Row label="Rango de mercado" value={`${fmt.format(quote.marketLow)} – ${fmt.format(quote.marketHigh)}`} highlight />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <SoftMetric label="Materiales estimados" value="Según alcance" />
            <SoftMetric label="Ejecución estimada" value="Según dificultad" />
            <SoftMetric label="Traslado / gestión" value="Según ubicación" />
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

      {relatedProducts.length > 0 ? (
        <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-yellow-300/12 text-yellow-300">
              <PackageSearch className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-300">Productos relacionados</p>
              <p className="text-sm text-zinc-400">Puedes comprar materiales o accesorios si quieres avanzar por etapas.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {relatedProducts.map((item) => (
              <a key={item.title} href={item.href} className="group rounded-2xl border border-white/10 bg-black/45 p-4 transition hover:border-yellow-300/40">
                <p className="font-black text-white">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.detail}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-300">Ver opciones <Truck className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
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

function SoftMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1 text-xs font-bold text-zinc-300">{value}</p>
    </div>
  );
}
