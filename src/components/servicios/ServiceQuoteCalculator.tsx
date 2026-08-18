'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Calculator, Info, Minus, Plus, ReceiptText, Ruler, Send, ShoppingCart } from 'lucide-react';
import { useQuoteCart } from '@/context/QuoteCartContext';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  calculateServiceMeasurement,
  getBudgetService,
  type MeasurementValues,
} from '@/components/presupuesto/serviceCatalog';
import {
  getDefaultPrice,
  type ServicePriceSetting,
} from '@/lib/servicePricing';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const money = (value: number) => CLP.format(Math.round(value || 0));
const number = (value: number) => NUMBER.format(value || 0);

type Props = {
  slug: string;
  serviceName?: string;
};

type ConcreteMode = 'trompo' | 'premezclado';

const CONCRETE_MODE: Record<ConcreteMode, { label: string; factor: number; detail: string }> = {
  trompo: { label: 'Preparación con trompo', factor: .92, detail: 'Alternativa flexible para menor volumen o accesos complejos.' },
  premezclado: { label: 'Camión premezclado', factor: 1.12, detail: 'Alternativa rápida para mayor volumen, sujeta a despacho y acceso.' },
};

export default function ServiceQuoteCalculator({ slug, serviceName }: Props) {
  const profile = getBudgetService(slug);
  const fallback = getDefaultPrice(slug);
  const [setting, setSetting] = useState<ServicePriceSetting>(fallback);
  const [source, setSource] = useState<'defaults' | 'database' | 'loading'>('loading');
  const [values, setValues] = useState<MeasurementValues>(profile.defaultValues);
  const [includeIva, setIncludeIva] = useState(true);
  const [concreteMode, setConcreteMode] = useState<ConcreteMode>('trompo');
  const [added, setAdded] = useState(false);
  const { addItem, items } = useQuoteCart();

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`/api/service-prices?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
        const json = await response.json() as { prices?: ServicePriceSetting[]; source?: 'defaults' | 'database' };
        if (!alive) return;
        setSetting(json.prices?.[0] || fallback);
        setSource(json.source || 'defaults');
      } catch {
        if (!alive) return;
        setSetting(fallback);
        setSource('defaults');
      }
    }
    void load();
    return () => { alive = false; };
  }, [fallback, slug]);

  useEffect(() => {
    setValues(profile.defaultValues);
    setAdded(false);
  }, [profile]);

  const measurement = useMemo(() => calculateServiceMeasurement(profile, values), [profile, values]);
  const concreteFactor = slug === 'cimientos' ? CONCRETE_MODE[concreteMode].factor : 1;
  const priceFactor = measurement.priceFactor * concreteFactor;
  const subtotal = Math.round(setting.basePrice * measurement.quantity * priceFactor);
  const materials = Math.round(subtotal * setting.materialsPct);
  const labor = Math.round(subtotal * setting.laborPct);
  const logistics = Math.round(subtotal * setting.logisticsPct);
  const contingency = Math.max(0, subtotal - materials - labor - logistics);
  const iva = includeIva ? Math.round(subtotal * .19) : 0;
  const total = subtotal + iva;
  const marketLow = Math.round(setting.marketMin * measurement.quantity * priceFactor);
  const marketHigh = Math.round(setting.marketMax * measurement.quantity * priceFactor);
  const serviceLabel = serviceName || setting.name || profile.title;
  const inCart = items.some((item) => item.kind === 'service' && (item.id === `service_${profile.id}` || item.meta?.serviceId === profile.id));

  const whatsappText = [
    `Hola Soluciones Fabrick, calculé un aproximado para ${serviceLabel}.`,
    `Fórmula: ${measurement.formula}.`,
    `Medidas: ${measurement.detail}.`,
    measurement.secondary ? `Resultado dimensional: ${measurement.secondary}.` : '',
    `Cantidad: ${number(measurement.quantity)} ${profile.unit}.`,
    `Rango referencial: ${money(marketLow)} a ${money(marketHigh)}.`,
    'Quiero revisión real y cotización final.',
  ].filter(Boolean).join('\n');

  function updateValue(key: keyof MeasurementValues, value: number) {
    setValues((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
    setAdded(false);
  }

  function addToBudget() {
    addItem({
      id: `service_${profile.id}`,
      kind: 'service',
      title: serviceLabel,
      description: profile.description,
      quantity: measurement.quantity,
      unit: profile.unit,
      refPrice: measurement.quantity ? total / measurement.quantity : total,
      notes: 'Cálculo generado en la página individual del servicio',
      meta: {
        serviceId: profile.id,
        category: profile.category,
        measurement: profile.measurement,
        marketMinUnit: setting.marketMin * priceFactor,
        marketMaxUnit: setting.marketMax * priceFactor,
        marketLow,
        marketHigh,
        subtotal,
        iva,
        total,
        length: values.length,
        width: values.width,
        height: values.height,
        quantityInput: values.quantity,
        formula: `${measurement.formula}: ${measurement.detail}`,
        secondary: measurement.secondary || '',
        source,
      },
    });
    setAdded(true);
  }

  return (
    <section className="overflow-hidden rounded-[2rem] bg-[#FFF9EE] text-[#08090A] shadow-[0_28px_90px_rgba(0,0,0,.3)]">
      <div className="bg-[linear-gradient(135deg,#FFF9EE,#DDC7B1)] p-5 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.26em] text-[#F5871F]">Calculadora aproximada</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em] md:text-4xl">{serviceLabel}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#BFB8AC]">Ingresa las dimensiones que corresponden al trabajo. La fórmula y el rango cambian automáticamente según la especialidad.</p>
          </div>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#08090A] text-[#FFB000]"><Calculator className="h-5 w-5" /></span>
        </div>
      </div>

      <div className="grid gap-6 p-5 md:p-8 lg:grid-cols-[1fr_.9fr]">
        <div>
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFB000] text-[#08090A]"><Ruler className="h-4 w-4" /></span><div><p className="text-sm font-black">Medidas del servicio</p><p className="mt-1 text-xs text-[#7A6C61]">Usamos {measurement.formula.toLocaleLowerCase('es')}.</p></div></div>
          <MeasurementFields profile={profile} values={values} onChange={updateValue} />

          {slug === 'cimientos' ? (
            <div className="mt-5 rounded-[1.4rem] bg-[#F2DFBB] p-4">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#F5871F]">Preparación del hormigón</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(Object.keys(CONCRETE_MODE) as ConcreteMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => setConcreteMode(mode)} className={`rounded-2xl p-3 text-left transition ${concreteMode === mode ? 'bg-[#08090A] text-[#FFF9EE]' : 'bg-[#FFF9EE] text-[#5F5148]'}`}>
                    <span className="block text-xs font-black">{CONCRETE_MODE[mode].label}</span>
                    <span className="mt-1 block text-[10px] leading-4 opacity-65">{CONCRETE_MODE[mode].detail}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="mt-5 flex items-center gap-3 rounded-2xl bg-[#EEE1D5] px-4 py-3 text-sm text-[#554A43]">
            <input type="checkbox" checked={includeIva} onChange={(event) => setIncludeIva(event.target.checked)} className="h-4 w-4 accent-[#F5871F]" />
            Incluir IVA 19% en esta referencia
          </label>
        </div>

        <aside className="rounded-[1.7rem] bg-[#08090A] p-5 text-white md:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-[#FFB000]">Resultado dimensional</p><h3 className="mt-2 text-2xl font-black">{number(measurement.quantity)} {profile.unit}</h3><p className="mt-1 text-xs leading-5 text-white/45">{measurement.detail}</p></div><span className="grid h-11 w-11 place-items-center rounded-full bg-[#FFB000] text-[#08090A]"><ReceiptText className="h-4 w-4" /></span></div>

          {measurement.secondary ? <p className="mt-4 rounded-xl bg-white/[.06] px-3 py-2.5 text-xs text-[#E3D3C5]">{measurement.secondary}</p> : null}

          <div className="mt-5 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#FFB000,#FFF9EE)] p-5 text-[#08090A]">
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#08090A]/55">Total aproximado</p>
            <p className="mt-2 text-3xl font-black tracking-[-.05em]">{money(total)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#08090A]/12 pt-4"><ResultCell label="Mercado desde" value={money(marketLow)} /><ResultCell label="Mercado hasta" value={money(marketHigh)} /></div>
          </div>

          <div className="mt-5 grid gap-2 text-xs">
            <Row label="Materiales estimados" value={money(materials)} />
            <Row label="Mano de obra estimada" value={money(labor)} />
            <Row label="Logística estimada" value={money(logistics)} />
            <Row label="Contingencia" value={money(contingency)} />
            <Row label="IVA referencial" value={money(iva)} />
          </div>

          <div className="mt-5 rounded-2xl bg-white/[.055] p-4 text-xs leading-6 text-[#CFC2B7]"><span className="mb-2 flex items-center gap-2 font-black uppercase tracking-[.16em] text-[#FFB000]"><Info className="h-4 w-4" /> Antes de confirmar</span>{setting.disclaimer || profile.disclaimer}</div>

          <button type="button" onClick={addToBudget} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB000] px-5 text-sm font-black text-[#08090A] transition hover:bg-[#FFF9EE]"><ShoppingCart className="h-4 w-4" /> {added || inCart ? 'Actualizar en mi presupuesto' : 'Añadir a mi presupuesto'}</button>
          <Link href="/presupuesto" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[.07] px-5 text-xs font-black text-white transition hover:bg-white/[.12]">Abrir carrito de servicios</Link>
          <a href={buildWhatsAppLink(whatsappText)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#FFB000]/22 px-5 text-xs font-black text-[#F2DFBB] transition hover:bg-[#FFB000] hover:text-[#08090A]">Revisar este cálculo <Send className="h-4 w-4" /></a>
          <p className="mt-3 text-center text-[10px] text-white/32">{source === 'database' ? 'Valores ajustados desde administración.' : source === 'loading' ? 'Cargando referencia comercial…' : 'Valores referenciales del sistema.'}</p>
        </aside>
      </div>
    </section>
  );
}

function MeasurementFields({ profile, values, onChange }: { profile: ReturnType<typeof getBudgetService>; values: MeasurementValues; onChange: (key: keyof MeasurementValues, value: number) => void }) {
  if (profile.measurement === 'count') return <div className="mt-5"><QuantityField value={values.quantity} onChange={(value) => onChange('quantity', value)} suffix={profile.unit === 'punto' ? 'puntos' : 'unidades'} /></div>;
  if (profile.measurement === 'linear') return <div className="mt-5"><NumberField label="Largo total" value={values.length} onChange={(value) => onChange('length', value)} suffix="m" /></div>;

  const fields: Array<{ key: keyof MeasurementValues; label: string }> = [];
  if (profile.measurement === 'floor') fields.push({ key: 'length', label: 'Largo' }, { key: 'width', label: 'Ancho' });
  if (profile.measurement === 'wall') fields.push({ key: 'length', label: 'Largo del muro' }, { key: 'height', label: 'Alto del muro' });
  if (profile.measurement === 'room-walls') fields.push({ key: 'length', label: 'Largo del recinto' }, { key: 'width', label: 'Ancho del recinto' }, { key: 'height', label: 'Alto de los muros' });
  if (profile.measurement === 'slab') fields.push({ key: 'length', label: 'Largo' }, { key: 'width', label: 'Ancho' }, { key: 'height', label: 'Espesor' });
  if (profile.measurement === 'volume') fields.push({ key: 'length', label: 'Largo' }, { key: 'width', label: 'Ancho' }, { key: 'height', label: 'Profundidad / alto' });
  return <div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map((field) => <NumberField key={field.key} label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} suffix="m" />)}</div>;
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#BFB8AC]">{label}</span><div className="mt-2 flex items-end gap-3 rounded-[1.25rem] bg-[#F2DFBB] px-4 py-3 focus-within:ring-2 focus-within:ring-[#F5871F]/40"><input type="number" min="0" step="0.01" inputMode="decimal" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-.05em] outline-none" /><b className="mb-1 text-xs text-[#F5871F]">{suffix}</b></div></label>;
}

function QuantityField({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix: string }) {
  return <div><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#BFB8AC]">Cantidad</span><div className="mt-2 grid grid-cols-[52px_1fr_52px] items-center gap-2 rounded-[1.25rem] bg-[#F2DFBB] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm"><Minus className="h-4 w-4" /></button><div className="text-center"><input type="number" min="1" inputMode="numeric" value={value || ''} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} className="w-full bg-transparent text-center text-3xl font-black outline-none" /><span className="text-[10px] font-bold uppercase tracking-[.13em] text-[#F5871F]">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-full bg-[#08090A] text-[#FFB000] shadow-sm"><Plus className="h-4 w-4" /></button></div></div>;
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return <div><span className="text-[9px] font-black uppercase tracking-[.14em] text-[#08090A]/50">{label}</span><b className="mt-1 block text-sm">{value}</b></div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl bg-white/[.045] px-4 py-3"><span className="text-white/45">{label}</span><b>{value}</b></div>;
}
