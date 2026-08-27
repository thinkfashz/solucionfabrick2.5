'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Info, MessageCircle, Minus, Plus, ReceiptText, Ruler, TrendingUp } from 'lucide-react';
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
    <section id="cotizador" className="relative scroll-mt-20 overflow-hidden bg-[#FFF9EE] px-4 py-16 text-[#08090A] sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(204,177,150,.3),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(182,144,108,.16),transparent_30%)]" />
      <div className="relative mx-auto max-w-[1260px]">
        <header className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#F5871F]/20 bg-white/70 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#B96F00]"><TrendingUp className="h-3.5 w-3.5" /> Referencias 2026</p>
            <h2 className="mt-3 max-w-[12ch] text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Calcula una referencia y entiende qué estás pagando.</h2>
          </div>
          <div>
            <p className="max-w-2xl text-sm leading-7 text-[#5E5853] sm:text-base">Elige un trabajo y anota tus medidas. Mostramos <b className="text-[#2A2521]">mano de obra</b> y <b className="text-[#2A2521]">trabajo vendido</b> por separado para que una instalación no se confunda con un servicio que además incluye materiales.</p>
            <p className="mt-3 flex max-w-2xl items-start gap-2 text-[10px] leading-5 text-[#6B5A4C]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F5871F]" /> Son rangos orientativos. Las exclusiones específicas aparecen dentro de cada servicio.</p>
          </div>
        </header>

        <div className="mt-8 grid overflow-hidden rounded-[2rem] bg-white shadow-[0_28px_90px_rgba(70,48,22,.14)] lg:grid-cols-[minmax(0,1.08fr)_minmax(370px,.72fr)]">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setCategory('Todas')} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black ${category === 'Todas' ? 'bg-[#08090A] text-[#FFB000]' : 'bg-[#F4E9DE] text-[#6B5A4C]'}`}>Todas</button>
              {SERVICE_CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black ${category === item ? 'bg-[#08090A] text-[#FFB000]' : 'bg-[#F4E9DE] text-[#6B5A4C]'}`}>{item}</button>)}
            </div>

            <div className="relative mt-4 sm:hidden">
              <button type="button" onClick={() => setMobileListOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-[1.25rem] bg-[#F4E9DE] p-4 text-left">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#08090A] text-[#FFB000]"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{service.short}</b><span className="mt-1 block text-[9px] text-[#6B5A4C]">Mano de obra {money(service.laborMin)}–{money(service.laborMax)} / {service.unit}</span></span>
                <ChevronDown className={`h-4 w-4 ${mobileListOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileListOpen ? <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-[1.25rem] bg-white p-2 shadow-xl ring-1 ring-black/8">{visibleServices.map((item) => <button key={item.id} type="button" onClick={() => chooseService(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left ${item.id === serviceId ? 'bg-[#08090A] text-white' : 'hover:bg-[#F4E9DE]'}`}><span><b className="block text-sm">{item.short}</b><small className={item.id === serviceId ? 'text-white/55' : 'text-black/45'}>{money(item.laborMin)}–{money(item.laborMax)} mano de obra</small></span>{item.id === serviceId ? <Check className="h-4 w-4 text-[#FFB000]" /> : null}</button>)}</div> : null}
            </div>

            <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-3">
              {visibleServices.map((item) => {
                const ItemIcon = item.icon;
                const active = item.id === serviceId;
                return <button key={item.id} type="button" onClick={() => chooseService(item.id)} className={`rounded-[1.25rem] p-4 text-left transition ${active ? 'bg-[#08090A] text-white' : 'bg-[#F4E9DE] hover:bg-[#F2DFBB]'}`}>
                  <div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-[#FFB000] text-black' : 'bg-white text-[#F5871F]'}`}><ItemIcon className="h-4 w-4" /></span><span className="text-[8px] font-black uppercase opacity-45">/{item.unit}</span></div>
                  <b className="mt-3 block text-sm">{item.short}</b>
                  <span className={`mt-2 block text-[9px] ${active ? 'text-white/62' : 'text-black/48'}`}>Mano de obra · {money(item.laborMin)}–{money(item.laborMax)}</span>
                  <span className={`mt-1 block text-[9px] ${active ? 'text-[#FFCC61]' : 'text-[#9B6508]'}`}>Trabajo vendido · {money(item.marketMin)}–{money(item.marketMax)}</span>
                </button>;
              })}
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#F4E9DE] p-4 sm:p-5">
              <div className="flex gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#08090A] text-[#FFB000]"><Icon className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96F00]">{service.category}</p><h3 className="mt-1 text-lg font-black">{service.title}</h3><p className="mt-2 text-xs leading-5 text-[#5E5853]">{service.description}</p></div></div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-[1.4rem] bg-[#EEE1D5] p-2" aria-label="Tipo de precio">
              <PriceModeButton active={priceMode === 'labor'} title="Mano de obra" text="Solo ejecución" onClick={() => setPriceMode('labor')} />
              <PriceModeButton active={priceMode === 'complete'} title="Trabajo vendido" text="Ejecución + base" onClick={() => setPriceMode('complete')} />
            </div>
            <p className="mt-2 text-[10px] leading-5 text-black/45">{priceModeDescription(priceMode)}</p>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#B96F00]"><Ruler className="h-4 w-4" /> Medidas</div>
              {supportsDirect ? <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-[#F4E9DE] p-1"><button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(false); }} className={`rounded-lg px-3 py-2 text-[10px] font-black ${!areaMode ? 'bg-white shadow-sm' : 'text-black/45'}`}>Largo × ancho</button><button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(true); }} className={`rounded-lg px-3 py-2 text-[10px] font-black ${areaMode ? 'bg-white shadow-sm' : 'text-black/45'}`}>Ya sé los m²</button></div> : null}
              {service.measurement === 'count' ? <div className="mt-4"><QuantityField value={values.quantity} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} onChange={(value) => updateValue('quantity', value)} /></div> : areaMode ? <div className="mt-4 grid gap-4"><AreaField value={directArea} onChange={(value) => setDirectArea(Math.max(0, Math.min(5000, Number(value) || 0)))} />{service.measurement === 'slab' ? <SliderField field={{ key: 'height', label: 'Espesor', hint: '0,10 = 10 cm', max: .3, step: .01 }} value={values.height} onChange={(value) => updateValue('height', value)} /> : null}</div> : <div className="mt-4 grid gap-4">{fields?.map((field) => <SliderField key={field.key} field={field} value={values[field.key]} onChange={(value) => updateValue(field.key, value)} />)}</div>}
            </div>

            <div className="mt-5 rounded-[1.25rem] bg-[#EEE1D5] px-4 py-3"><p className="flex gap-2 text-xs leading-5 text-[#5E5853]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F5871F]" />{service.disclaimer}</p></div>
          </div>

          <aside className="bg-[#0D0E10] p-5 text-white sm:p-7 lg:p-8">
            <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Referencia de costo</p><h3 className="mt-2 text-2xl font-black">{service.short}</h3></div><span className="grid h-11 w-11 place-items-center rounded-full bg-[#FFB000] text-black"><ReceiptText className="h-5 w-5" /></span></div>
            <div className="mt-4 rounded-full bg-white/[.06] px-4 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/45">{reference}</div>
            <div className="mt-4 rounded-[1.35rem] bg-white/[.05] p-4"><ReceiptRow label="Medidas" value={quote.detail} /><ReceiptRow label="Resultado" value={`${number(quote.quantity)} ${service.unit}`} />{quote.secondary ? <ReceiptRow label="Detalle" value={quote.secondary} /> : null}</div>

            <div className="mt-4 grid gap-3">
              <PriceCard active={priceMode === 'labor'} label="Solo mano de obra" low={laborLow} high={laborHigh} note="Ejecución o instalación; materiales principales aparte." dark />
              <PriceCard active={priceMode === 'complete'} label="Trabajo vendido" low={completeLow} high={completeHigh} note="Ejecución + materiales/insumos base indicados; revisa exclusiones." />
            </div>
            <div className="mt-4 rounded-[1.2rem] border border-[#FFB000]/25 p-4"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#FFB000]">Referencia seleccionada</p><p className="mt-2 text-xl font-black">{money(selectedLow)} – {money(selectedHigh)}</p><p className="mt-1 text-[10px] text-white/40">{priceMode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'} · IVA considerado como referencia</p></div>

            <div className="mt-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB000]">Qué considera el servicio</p><ul className="mt-3 grid gap-2">{service.includes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-white/60"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB000]" />{item}</li>)}</ul></div>

            <Link href={`/presupuesto?servicio=${service.id}`} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFB000] px-5 text-sm font-black text-black">Añadir al presupuesto <ArrowRight className="h-4 w-4" /></Link>
            <a href={`https://wa.me/56930121625?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[.075] px-5 text-xs font-black text-white">Consultar este trabajo <MessageCircle className="h-4 w-4" /></a>
            <p className="mt-4 text-center text-[10px] leading-5 text-white/32">Referencia comercial, no cotización final ni documento tributario.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PriceModeButton({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-[1rem] px-3 py-3 text-left transition ${active ? 'bg-[#08090A] text-white shadow-sm' : 'bg-white/55 text-black'}`}><b className="block text-xs">{title}</b><span className={`mt-1 block text-[9px] ${active ? 'text-white/45' : 'text-black/40'}`}>{text}</span></button>;
}
function PriceCard({ active, label, low, high, note, dark = false }: { active: boolean; label: string; low: number; high: number; note: string; dark?: boolean }) {
  return <div className={`rounded-[1.4rem] p-4 ${dark ? 'bg-white/[.06] text-white' : 'bg-[linear-gradient(135deg,#FFB000,#FFF9EE)] text-black'} ${active ? 'ring-2 ring-[#FFB000]' : ''}`}><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[.15em] opacity-60">{label}</span>{active ? <span className="rounded-full bg-black px-2 py-1 text-[8px] font-black text-[#FFB000]">ELEGIDO</span> : null}</div><b className="mt-2 block text-xl tracking-[-.035em]">{money(low)} – {money(high)}</b><p className="mt-2 text-[10px] leading-4 opacity-55">{note}</p></div>;
}
function AreaField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className="block"><div className="flex items-end justify-between gap-3"><div><b className="block text-[10px] uppercase tracking-[.14em] text-black/55">Superficie total</b><span className="text-[9px] text-black/40">m² exactos del trabajo</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(1, value - 5))} className="grid h-10 w-10 place-items-center rounded-full bg-[#F4E9DE]"><Minus className="h-4 w-4" /></button><input type="number" min="0" value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-24 rounded-xl bg-[#F4E9DE] px-3 py-2 text-right text-xl font-black outline-none"/><button type="button" onClick={() => onChange(value + 5)} className="grid h-10 w-10 place-items-center rounded-full bg-[#08090A] text-[#FFB000]"><Plus className="h-4 w-4" /></button></div></div></label>;
}
function SliderField({ field, value, onChange }: { field: FieldConfig; value: number; onChange: (value: number) => void }) {
  return <label className="block"><div className="flex items-end justify-between gap-3"><div><b className="block text-[10px] uppercase tracking-[.14em] text-black/55">{field.label}</b><span className="text-[9px] text-black/40">{field.hint}</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(field.step, value - field.step))} className="grid h-9 w-9 place-items-center rounded-full bg-[#F4E9DE]"><Minus className="h-3.5 w-3.5" /></button><input type="number" min="0" max={field.max} step={field.step} value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-20 rounded-xl bg-[#F4E9DE] px-2 py-2 text-right text-lg font-black outline-none"/><button type="button" onClick={() => onChange(Math.min(field.max, value + field.step))} className="grid h-9 w-9 place-items-center rounded-full bg-[#08090A] text-[#FFB000]"><Plus className="h-3.5 w-3.5" /></button></div></div><input type="range" min="0" max={field.max} step={field.step} value={Math.min(field.max, value)} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 h-2 w-full accent-[#F5871F]" /></label>;
}
function QuantityField({ value, suffix, onChange }: { value: number; suffix: string; onChange: (value: number) => void }) {
  return <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2 rounded-[1.2rem] bg-[#F4E9DE] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-white"><Minus className="h-4 w-4" /></button><div className="text-center"><input type="number" min="1" value={value || ''} onChange={(event) => onChange(Math.max(1, Math.round(Number(event.target.value) || 1)))} className="w-full bg-transparent text-center text-2xl font-black outline-none"/><span className="text-[9px] font-black uppercase text-[#B96F00]">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} className="grid h-11 w-11 place-items-center rounded-full bg-[#08090A] text-[#FFB000]"><Plus className="h-4 w-4" /></button></div>;
}
function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-white/8 py-2 last:border-0 sm:grid-cols-[85px_1fr]"><span className="text-[9px] font-black uppercase text-white/35">{label}</span><b className="text-xs leading-5 sm:text-right">{value}</b></div>;
}
