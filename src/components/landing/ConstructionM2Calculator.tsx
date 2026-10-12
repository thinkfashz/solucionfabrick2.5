'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Info, MessageCircle, Minus, Plus, ReceiptText, Ruler } from 'lucide-react';
import {
  BUDGET_SERVICES,
  SERVICE_CATEGORIES,
  calculateServiceMeasurement,
  getServicePriceRange,
  priceModeDescription,
  type MeasurementValues,
  type PriceMode,
  type ServiceCategory,
} from '@/components/presupuesto/serviceCatalog';

const SERVICES = BUDGET_SERVICES;
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const money = (value: number) => CLP.format(Math.round(value || 0));
const number = (value: number) => NUMBER.format(value || 0);
const DISPLAY = '[font-family:Sora,Manrope,ui-sans-serif,system-ui,sans-serif]';

type FieldConfig = { key: keyof MeasurementValues; label: string; hint: string; max: number; step: number };
const FIELD_SETS: Record<string, FieldConfig[]> = {
  floor: [{ key: 'length', label: 'Largo', hint: 'metros', max: 30, step: .1 }, { key: 'width', label: 'Ancho', hint: 'metros', max: 20, step: .1 }],
  wall: [{ key: 'length', label: 'Largo del muro', hint: 'metros', max: 30, step: .1 }, { key: 'height', label: 'Alto del muro', hint: 'metros', max: 6, step: .1 }],
  'room-walls': [{ key: 'length', label: 'Largo del recinto', hint: 'metros', max: 30, step: .1 }, { key: 'width', label: 'Ancho del recinto', hint: 'metros', max: 20, step: .1 }, { key: 'height', label: 'Alto de muros', hint: 'metros', max: 6, step: .1 }],
  slab: [{ key: 'length', label: 'Largo', hint: 'metros', max: 30, step: .1 }, { key: 'width', label: 'Ancho', hint: 'metros', max: 20, step: .1 }, { key: 'height', label: 'Espesor', hint: '0,10 = 10 cm', max: .3, step: .01 }],
  volume: [{ key: 'length', label: 'Largo', hint: 'metros', max: 30, step: .1 }, { key: 'width', label: 'Ancho', hint: 'metros', max: 10, step: .1 }, { key: 'height', label: 'Profundidad', hint: 'metros', max: 3, step: .05 }],
  linear: [{ key: 'length', label: 'Longitud total', hint: 'metros lineales', max: 200, step: 1 }],
};

export default function ConstructionM2Calculator() {
  const [category, setCategory] = useState<ServiceCategory | 'Todas'>('Todas');
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [values, setValues] = useState<MeasurementValues>(SERVICES[0].defaultValues);
  const [priceMode, setPriceMode] = useState<PriceMode>('labor');
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [directArea, setDirectArea] = useState(0);

  const service = SERVICES.find((item) => item.id === serviceId) || SERVICES[0];
  const Icon = service.icon;
  const measurement = useMemo(() => calculateServiceMeasurement(service, values), [service, values]);
  const supportsDirect = service.unit === 'm²' && service.measurement !== 'volume';
  const quote = useMemo(() => {
    if (!areaMode) return measurement;
    const factor = service.measurement === 'slab' ? measurement.priceFactor : 1;
    return {
      quantity: directArea,
      priceFactor: factor,
      formula: service.measurement === 'slab' ? 'Superficie × ajuste por espesor' : 'Superficie ingresada',
      detail: `${number(directArea)} m²`,
      secondary: service.measurement === 'slab' ? `${number(directArea * Math.max(.05, values.height))} m³ de hormigón` : undefined,
    };
  }, [areaMode, directArea, measurement, service.measurement, values.height]);

  const laborUnit = getServicePriceRange(service, 'labor');
  const completeUnit = getServicePriceRange(service, 'complete');
  const laborLow = quote.quantity * laborUnit.min * quote.priceFactor;
  const laborHigh = quote.quantity * laborUnit.max * quote.priceFactor;
  const completeLow = quote.quantity * completeUnit.min * quote.priceFactor;
  const completeHigh = quote.quantity * completeUnit.max * quote.priceFactor;
  const selectedLow = priceMode === 'labor' ? laborLow : completeLow;
  const selectedHigh = priceMode === 'labor' ? laborHigh : completeHigh;
  const laborIncludes = useMemo(() => service.includes.filter((item) => !item.toLowerCase().includes('en trabajo vendido')), [service]);
  const completeIncludes = useMemo(() => service.includes.map((item) => item.replace(/\s*en trabajo vendido\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim()), [service]);
  const visibleServices = category === 'Todas' ? SERVICES : SERVICES.filter((item) => item.category === category);
  const fields = service.measurement === 'count' ? null : service.measurement === 'linear' ? FIELD_SETS.linear : FIELD_SETS[service.measurement] || FIELD_SETS.floor;

  const reference = useMemo(() => {
    const compactService = service.id.split('-').map((part) => part.slice(0, 2).toUpperCase()).join('').slice(0, 8);
    return `FBK-${compactService}-${String(Math.round(quote.quantity)).padStart(3, '0')}`;
  }, [quote.quantity, service.id]);

  const whatsappMessage = useMemo(() => [
    'Hola Soluciones Fabrick, quiero revisar esta referencia.',
    `Referencia: ${reference}`,
    `Servicio: ${service.title}`,
    `Medidas: ${quote.detail}`,
    `Cantidad: ${number(quote.quantity)} ${service.unit}`,
    `Mano de obra: ${money(laborLow)} a ${money(laborHigh)}`,
    `Trabajo vendido: ${money(completeLow)} a ${money(completeHigh)}`,
    `Modalidad que me interesa: ${priceMode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'}`,
  ].join('\n'), [completeHigh, completeLow, laborHigh, laborLow, priceMode, quote.detail, quote.quantity, reference, service]);

  function chooseService(nextId: string) {
    const next = SERVICES.find((item) => item.id === nextId) || SERVICES[0];
    setServiceId(next.id);
    setValues(next.defaultValues);
    setMobileListOpen(false);
    setAreaMode(false);
    setDirectArea(0);
  }

  function updateValue(key: keyof MeasurementValues, value: number) {
    setValues((current) => {
      const field = fields?.find((item) => item.key === key);
      return { ...current, [key]: Math.max(0, Math.min(field?.max ?? 999, Number(value) || 0)) };
    });
  }

  return (
    <section id="cotizador" className="relative scroll-mt-20 overflow-hidden rounded-2xl bg-[#0C0D0E] px-4 py-10 text-[#F5F2EC] sm:px-6 lg:px-8 lg:py-14">
      <div className="relative mx-auto max-w-[1320px]">
        <header className="max-w-3xl">
          <h2 className={`max-w-[20ch] text-3xl font-bold leading-[1.02] tracking-[-.03em] tabular-nums sm:text-4xl lg:text-5xl ${DISPLAY}`}>Calcula tu próximo proyecto.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#A8A49C] sm:text-base">Elige un trabajo y anota tus medidas. Compara mano de obra con trabajo vendido.</p>
          <p className="mt-3 flex max-w-2xl items-start gap-2 text-xs leading-5 text-[#8A867E]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FFE600]" /> Rangos orientativos. Cada servicio indica sus exclusiones.</p>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(390px,.68fr)] lg:items-start">
          <div className="rounded-2xl border border-white/[.06] bg-[#101113] p-5 sm:p-7 lg:p-8">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Categorías de trabajo">
              <button type="button" onClick={() => setCategory('Todas')} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold transition-[background-color,color] duration-200 ease-out ${category === 'Todas' ? 'bg-[#FFE600] text-black' : 'bg-[#16181B] text-[#B5B1A8] hover:bg-[#22252A]'}`}>Todas</button>
              {SERVICE_CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold transition-[background-color,color] duration-200 ease-out ${category === item ? 'bg-[#FFE600] text-black' : 'bg-[#16181B] text-[#B5B1A8] hover:bg-[#22252A]'}`}>{item}</button>)}
            </div>

            <div className="relative mt-5 sm:hidden">
              <button type="button" onClick={() => setMobileListOpen((open) => !open)} aria-expanded={mobileListOpen} className="flex w-full items-center gap-3 rounded-xl border border-white/[.06] bg-[#0C0D0E] p-4 text-left">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFE600] text-black"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{service.short}</b><span className="mt-1 block text-xs tabular-nums text-[#8A867E]">Mano de obra {money(service.laborMin)}–{money(service.laborMax)} / {service.unit}</span></span>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${mobileListOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileListOpen ? <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/[.06] bg-[#121316] p-2 shadow-xl">{visibleServices.map((item) => <button key={item.id} type="button" onClick={() => chooseService(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left ${item.id === serviceId ? 'bg-[#0C0D0E] text-white' : 'hover:bg-[#1A1C1F]'}`}><span><b className="block text-sm">{item.short}</b><small className="tabular-nums text-white/60">{money(item.laborMin)}–{money(item.laborMax)} mano de obra</small></span>{item.id === serviceId ? <Check className="h-4 w-4 shrink-0 text-[#FFE600]" /> : null}</button>)}</div> : null}
            </div>

            <div className="mt-5 hidden max-h-[340px] gap-3 overflow-y-auto pr-1 sm:grid sm:grid-cols-2 xl:grid-cols-3">
              {visibleServices.map((item) => {
                const ItemIcon = item.icon;
                const active = item.id === serviceId;
                return <button key={item.id} type="button" onClick={() => chooseService(item.id)} aria-pressed={active} className={`min-h-[132px] rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] duration-200 ease-out ${active ? 'border-[#FFE600]/60 bg-[#0C0D0E] text-white' : 'border-white/[.06] bg-[#141619] hover:-translate-y-0.5 hover:border-[#FFE600]/30'}`}>
                  <div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-[#FFE600] text-black' : 'bg-[#22252A] text-[#FFE600]'}`}><ItemIcon className="h-4 w-4" /></span><span className="text-[10px] font-bold uppercase tabular-nums opacity-40">/{item.unit}</span></div>
                  <b className="mt-4 block text-sm">{item.short}</b>
                  <span className="mt-2 block text-xs tabular-nums text-white/60">Mano de obra · {money(item.laborMin)}–{money(item.laborMax)}</span>
                  <span className="mt-1 block text-xs tabular-nums text-[#FFE600]">Trabajo vendido · {money(item.marketMin)}–{money(item.marketMax)}</span>
                </button>;
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-[#0C0D0E] p-5">
              <div className="flex gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#FFE600] text-black"><Icon className="h-5 w-5" /></span><div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#FFE600]">{service.category}</p><h3 className={`mt-1 text-lg font-bold ${DISPLAY}`}>{service.title}</h3><p className="mt-2 text-xs leading-5 text-[#A8A49C]">{service.description}</p></div></div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[.06] bg-[#0C0D0E] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#FFE600]"><Ruler className="h-4 w-4" /> Medidas del trabajo</div>
              {supportsDirect ? <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-[#16181B] p-1.5"><button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(false); }} className={`rounded-full px-3 py-2.5 text-xs font-bold transition-[background-color,color] duration-200 ${!areaMode ? 'bg-[#2A2D32] text-white' : 'text-white/60'}`}>Largo × ancho</button><button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(true); }} className={`rounded-full px-3 py-2.5 text-xs font-bold transition-[background-color,color] duration-200 ${areaMode ? 'bg-[#2A2D32] text-white' : 'text-white/60'}`}>Ya sé los m²</button></div> : null}
              {service.measurement === 'count' ? <div className="mt-5"><QuantityField value={values.quantity} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} onChange={(value) => updateValue('quantity', value)} /></div> : areaMode ? <div className="mt-5 grid gap-5"><AreaField value={directArea} onChange={(value) => setDirectArea(Math.max(0, Math.min(5000, Number(value) || 0)))} />{service.measurement === 'slab' ? <SliderField field={{ key: 'height', label: 'Espesor', hint: '0,10 = 10 cm', max: .3, step: .01 }} value={values.height} onChange={(value) => updateValue('height', value)} /> : null}</div> : <div className="mt-5 grid gap-5">{fields?.map((field) => <SliderField key={field.key} field={field} value={values[field.key]} onChange={(value) => updateValue(field.key, value)} />)}</div>}
            </div>

            <div className="mt-5 rounded-2xl bg-[#121316] px-4 py-3.5"><p className="flex gap-2 text-xs leading-5 text-[#B5B1A8]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FFE600]" />{service.disclaimer}</p></div>
          </div>

          <aside className="rounded-2xl border border-white/[.06] bg-[#101113] p-5 text-white sm:p-7 lg:sticky lg:top-24 lg:p-8">
            <div className="flex items-start justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#FFE600]">Referencia de costo</p><h3 className={`mt-2 text-2xl font-bold ${DISPLAY}`}>{service.short}</h3></div><span className="grid h-12 w-12 place-items-center rounded-full bg-[#FFE600] text-black"><ReceiptText className="h-5 w-5" /></span></div>
            <div className="mt-5 rounded-full border border-white/[.07] bg-white/[.04] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[.12em] tabular-nums text-white/50">{reference}</div>
            <div className="mt-4 rounded-2xl border border-white/[.06] bg-white/[.03] p-4"><ReceiptRow label="Medidas" value={quote.detail} /><ReceiptRow label="Resultado" value={`${number(quote.quantity)} ${service.unit}`} />{quote.secondary ? <ReceiptRow label="Detalle" value={quote.secondary} /> : null}</div>

            <div className="mt-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.12em] text-white/60" id="price-mode-label">Elige una modalidad</p>
              <div className="grid gap-3" role="group" aria-labelledby="price-mode-label">
                <PriceCard active={priceMode === 'labor'} label="Solo mano de obra" low={laborLow} high={laborHigh} note={priceModeDescription('labor')} items={laborIncludes} onSelect={() => setPriceMode('labor')} dark />
                <PriceCard active={priceMode === 'complete'} label="Trabajo vendido" low={completeLow} high={completeHigh} note={priceModeDescription('complete')} items={completeIncludes} onSelect={() => setPriceMode('complete')} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#FFE600]/25 bg-[#FFE600]/[.06] p-5"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#FFE600]">Referencia seleccionada</p><p className={`mt-3 text-[clamp(1.65rem,5vw,2.35rem)] font-bold leading-none tracking-[-.03em] tabular-nums ${DISPLAY}`}>{money(selectedLow)} – {money(selectedHigh)}</p><p className="mt-2 text-xs text-white/50">{priceMode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'} · IVA considerado como referencia</p></div>

            <Link href={`/presupuesto?servicio=${service.id}`} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#FFE600] px-5 text-sm font-bold text-black transition-[filter,transform] duration-200 ease-out hover:brightness-105 active:scale-[.98]">Añadir al presupuesto <ArrowRight className="h-4 w-4" /></Link>
            <a href={`https://wa.me/56930121625?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-white/[.1] bg-white/[.05] px-5 text-xs font-bold text-white transition-[background-color,transform] duration-200 ease-out hover:bg-white/[.09] active:scale-[.98]">Consultar este trabajo <MessageCircle className="h-4 w-4" /></a>
            <p className="mt-4 text-center text-xs leading-5 text-white/40">Referencia comercial, no cotización final ni documento tributario.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PriceCard({ active, label, low, high, note, items, onSelect, dark = false }: { active: boolean; label: string; low: number; high: number; note: string; items: string[]; onSelect: () => void; dark?: boolean }) {
  const check = dark ? 'text-[#FFE600]' : 'text-black';
  return <button type="button" onClick={onSelect} aria-pressed={active} className={`w-full rounded-2xl border p-5 text-left transition-[border-color,transform,filter] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101113] active:scale-[.99] ${dark ? 'border-white/[.07] bg-white/[.04] text-white hover:border-white/[.16]' : 'border-[#FFE600]/25 bg-[#FFE600] text-black hover:bg-[#FFF45C]'} ${active ? 'ring-2 ring-[#FFE600] ring-offset-2 ring-offset-[#101113]' : ''}`}>
    <span className="flex items-center justify-between gap-3"><span className="text-[11px] font-bold uppercase tracking-[.12em] opacity-60">{label}</span>{active ? <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-bold text-[#FFE600]">Elegido</span> : <span className="rounded-full border border-current px-2.5 py-1 text-[10px] font-bold opacity-50">Elegir</span>}</span>
    <b className={`mt-3 block text-[clamp(1.35rem,4vw,1.8rem)] leading-tight tracking-[-.03em] tabular-nums ${DISPLAY}`}>{money(low)} – {money(high)}</b>
    <ul className={`mt-4 grid gap-2 border-t pt-4 ${dark ? 'border-white/10' : 'border-black/10'}`}>{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 opacity-80"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${check}`} />{item}</li>)}</ul>
    <p className="mt-3 text-xs leading-5 opacity-60">{note}</p>
  </button>;
}

function AreaField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className="block"><div className="flex items-end justify-between gap-3"><div><b className="block text-xs uppercase tracking-[.12em] text-white/75">Superficie total</b><span className="text-xs text-white/60">m² exactos del trabajo</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(1, value - 5))} aria-label="Restar 5 metros cuadrados" className="grid h-10 w-10 place-items-center rounded-full bg-[#1A1C1F] transition-[background-color] hover:bg-[#24272C]"><Minus className="h-4 w-4" /></button><input aria-label="Superficie total en metros cuadrados" type="number" min="0" value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-24 rounded-xl bg-[#1A1C1F] px-3 py-2 text-right text-xl font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"/><button type="button" onClick={() => onChange(value + 5)} aria-label="Sumar 5 metros cuadrados" className="grid h-10 w-10 place-items-center rounded-full bg-[#FFE600] text-black"><Plus className="h-4 w-4" /></button></div></div></label>;
}

function SliderField({ field, value, onChange }: { field: FieldConfig; value: number; onChange: (value: number) => void }) {
  return <label className="block"><div className="flex items-end justify-between gap-3"><div><b className="block text-xs uppercase tracking-[.12em] text-white/75">{field.label}</b><span className="text-xs text-white/60">{field.hint}</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(field.step, value - field.step))} aria-label={`Disminuir ${field.label}`} className="grid h-9 w-9 place-items-center rounded-full bg-[#1A1C1F] transition-[background-color] hover:bg-[#24272C]"><Minus className="h-3.5 w-3.5" /></button><input aria-label={field.label} type="number" min="0" max={field.max} step={field.step} value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-20 rounded-xl bg-[#1A1C1F] px-2 py-2 text-right text-lg font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"/><button type="button" onClick={() => onChange(Math.min(field.max, value + field.step))} aria-label={`Aumentar ${field.label}`} className="grid h-9 w-9 place-items-center rounded-full bg-[#FFE600] text-black"><Plus className="h-3.5 w-3.5" /></button></div></div><input aria-label={`${field.label}, deslizador`} type="range" min="0" max={field.max} step={field.step} value={Math.min(field.max, value)} onChange={(event) => onChange(Number(event.target.value))} className="mt-4 h-2 w-full accent-[#FFE600]" /></label>;
}

function QuantityField({ value, suffix, onChange }: { value: number; suffix: string; onChange: (value: number) => void }) {
  return <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2 rounded-2xl bg-[#1A1C1F] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Restar uno" className="grid h-11 w-11 place-items-center rounded-full bg-[#2A2D32] transition-[background-color] hover:bg-[#31353B]"><Minus className="h-4 w-4" /></button><div className="text-center"><input aria-label={suffix} type="number" min="1" value={value || ''} onChange={(event) => onChange(Math.max(1, Math.round(Number(event.target.value) || 1)))} className="w-full rounded-xl bg-transparent text-center text-2xl font-bold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#FFE600]"/><span className="text-[11px] font-bold uppercase text-[#FFE600]">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} aria-label="Sumar uno" className="grid h-11 w-11 place-items-center rounded-full bg-[#FFE600] text-black"><Plus className="h-4 w-4" /></button></div>;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-white/[.07] py-2.5 last:border-0 sm:grid-cols-[85px_1fr]"><span className="text-[11px] font-bold uppercase text-white/40">{label}</span><b className="text-xs leading-5 tabular-nums sm:text-right">{value}</b></div>;
}
