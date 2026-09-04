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
    <section id="cotizador" className="relative scroll-mt-20 overflow-hidden bg-[#F6F2EB] px-4 py-20 text-[#0B0C0E] sm:px-6 lg:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_5%,rgba(242,140,40,.12),transparent_27rem),radial-gradient(circle_at_92%_85%,rgba(216,154,51,.11),transparent_24rem)]" />
      <div className="relative mx-auto max-w-[1320px]">
        <header className="grid gap-8 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#F28C28]/20 bg-white/70 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-[#B96A16]"><TrendingUp className="h-3.5 w-3.5" /> Referencias 2026</p>
            <h2 className="mt-4 max-w-[12ch] text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-6xl lg:text-[4.2rem]" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Calcula una referencia y entiende qué estás pagando.</h2>
          </div>
          <div className="lg:pb-1">
            <p className="max-w-2xl text-sm leading-7 text-[#5E5853] sm:text-base">Elige un trabajo y anota tus medidas. Mostramos <b className="text-[#211E1A]">mano de obra</b> y <b className="text-[#211E1A]">trabajo vendido</b> por separado para que compares cada concepto con claridad.</p>
            <p className="mt-4 flex max-w-2xl items-start gap-2 text-[10px] leading-5 text-[#71665C]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C28]" /> Rangos orientativos. Las exclusiones específicas aparecen dentro de cada servicio.</p>
          </div>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(390px,.68fr)] lg:items-start">
          <div className="rounded-[2rem] border border-black/[.055] bg-white p-5 shadow-[0_24px_70px_rgba(58,42,25,.08)] sm:p-7 lg:p-9">
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setCategory('Todas')} className={`shrink-0 rounded-full px-4 py-2.5 text-[10px] font-black transition ${category === 'Todas' ? 'bg-[#0B0C0E] text-[#F5A13D]' : 'bg-[#F2EEE8] text-[#655C54] hover:bg-[#EAE4DC]'}`}>Todas</button>
              {SERVICE_CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2.5 text-[10px] font-black transition ${category === item ? 'bg-[#0B0C0E] text-[#F5A13D]' : 'bg-[#F2EEE8] text-[#655C54] hover:bg-[#EAE4DC]'}`}>{item}</button>)}
            </div>

            <div className="relative mt-5 sm:hidden">
              <button type="button" onClick={() => setMobileListOpen((open) => !open)} className="flex w-full items-center gap-3 rounded-[1.35rem] border border-black/[.05] bg-[#F5F1EB] p-4 text-left">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0B0C0E] text-[#F5A13D]"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm">{service.short}</b><span className="mt-1 block text-[9px] text-[#6B625A]">Mano de obra {money(service.laborMin)}–{money(service.laborMax)} / {service.unit}</span></span>
                <ChevronDown className={`h-4 w-4 transition ${mobileListOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileListOpen ? <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-[1.35rem] bg-white p-2 shadow-xl ring-1 ring-black/8">{visibleServices.map((item) => <button key={item.id} type="button" onClick={() => chooseService(item.id)} className={`flex w-full items-center justify-between gap-3 rounded-xl p-3 text-left ${item.id === serviceId ? 'bg-[#0B0C0E] text-white' : 'hover:bg-[#F5F1EB]'}`}><span><b className="block text-sm">{item.short}</b><small className={item.id === serviceId ? 'text-white/55' : 'text-black/45'}>{money(item.laborMin)}–{money(item.laborMax)} mano de obra</small></span>{item.id === serviceId ? <Check className="h-4 w-4 text-[#F5A13D]" /> : null}</button>)}</div> : null}
            </div>

            <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-3">
              {visibleServices.map((item) => {
                const ItemIcon = item.icon;
                const active = item.id === serviceId;
                return <button key={item.id} type="button" onClick={() => chooseService(item.id)} className={`min-h-[152px] rounded-[1.35rem] border p-4 text-left transition duration-200 ${active ? 'border-[#0B0C0E] bg-[#0B0C0E] text-white shadow-[0_12px_30px_rgba(0,0,0,.12)]' : 'border-black/[.045] bg-[#F6F2EC] hover:-translate-y-0.5 hover:border-[#F28C28]/25 hover:bg-[#FBF8F3]'}`}>
                  <div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${active ? 'bg-[#F5A13D] text-black' : 'bg-white text-[#D8791E]'}`}><ItemIcon className="h-4 w-4" /></span><span className="text-[8px] font-black uppercase opacity-40">/{item.unit}</span></div>
                  <b className="mt-4 block text-sm">{item.short}</b>
                  <span className={`mt-2 block text-[9px] ${active ? 'text-white/58' : 'text-black/46'}`}>Mano de obra · {money(item.laborMin)}–{money(item.laborMax)}</span>
                  <span className={`mt-1 block text-[9px] ${active ? 'text-[#F6B45C]' : 'text-[#9C611E]'}`}>Trabajo vendido · {money(item.marketMin)}–{money(item.marketMax)}</span>
                </button>;
              })}
            </div>

            <div className="mt-8 grid gap-5 border-t border-black/[.07] pt-7 lg:grid-cols-[1.05fr_.95fr]">
              <div className="rounded-[1.55rem] bg-[#F6F2EC] p-5">
                <div className="flex gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#0B0C0E] text-[#F5A13D]"><Icon className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#B96A16]">{service.category}</p><h3 className="mt-1 text-lg font-black">{service.title}</h3><p className="mt-2 text-xs leading-5 text-[#645C55]">{service.description}</p></div></div>
              </div>

              <div>
                <p className="mb-2 text-[9px] font-black uppercase tracking-[.15em] text-black/42">Cómo quieres comparar</p>
                <div className="grid grid-cols-2 gap-2 rounded-[1.35rem] bg-[#F0EBE4] p-2" aria-label="Tipo de precio">
                  <PriceModeButton active={priceMode === 'labor'} title="Mano de obra" text="Solo ejecución" onClick={() => setPriceMode('labor')} />
                  <PriceModeButton active={priceMode === 'complete'} title="Trabajo vendido" text="Ejecución + base" onClick={() => setPriceMode('complete')} />
                </div>
                <p className="mt-2 text-[10px] leading-5 text-black/45">{priceModeDescription(priceMode)}</p>
              </div>
            </div>

            <div className="mt-8 rounded-[1.7rem] border border-black/[.055] bg-[#FCFAF7] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#B96A16]"><Ruler className="h-4 w-4" /> Medidas del trabajo</div>
              {supportsDirect ? <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#F1ECE5] p-1"><button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(false); }} className={`rounded-lg px-3 py-2.5 text-[10px] font-black ${!areaMode ? 'bg-white shadow-sm' : 'text-black/45'}`}>Largo × ancho</button><button type="button" onClick={() => { setDirectArea(Math.round(measurement.quantity)); setAreaMode(true); }} className={`rounded-lg px-3 py-2.5 text-[10px] font-black ${areaMode ? 'bg-white shadow-sm' : 'text-black/45'}`}>Ya sé los m²</button></div> : null}
              {service.measurement === 'count' ? <div className="mt-5"><QuantityField value={values.quantity} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} onChange={(value) => updateValue('quantity', value)} /></div> : areaMode ? <div className="mt-5 grid gap-5"><AreaField value={directArea} onChange={(value) => setDirectArea(Math.max(0, Math.min(5000, Number(value) || 0)))} />{service.measurement === 'slab' ? <SliderField field={{ key: 'height', label: 'Espesor', hint: '0,10 = 10 cm', max: .3, step: .01 }} value={values.height} onChange={(value) => updateValue('height', value)} /> : null}</div> : <div className="mt-5 grid gap-5">{fields?.map((field) => <SliderField key={field.key} field={field} value={values[field.key]} onChange={(value) => updateValue(field.key, value)} />)}</div>}
            </div>

            <div className="mt-5 rounded-[1.25rem] bg-[#F0EBE4] px-4 py-3.5"><p className="flex gap-2 text-xs leading-5 text-[#655D55]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#F28C28]" />{service.disclaimer}</p></div>
          </div>

          <aside className="rounded-[2rem] bg-[#0D0E10] p-5 text-white shadow-[0_28px_80px_rgba(0,0,0,.18)] sm:p-7 lg:sticky lg:top-24 lg:p-8">
            <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F5A13D]">Referencia de costo</p><h3 className="mt-2 text-2xl font-black">{service.short}</h3></div><span className="grid h-12 w-12 place-items-center rounded-full bg-[#F5A13D] text-black"><ReceiptText className="h-5 w-5" /></span></div>
            <div className="mt-5 rounded-full border border-white/[.07] bg-white/[.045] px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em] text-white/42">{reference}</div>
            <div className="mt-4 rounded-[1.35rem] border border-white/[.06] bg-white/[.035] p-4"><ReceiptRow label="Medidas" value={quote.detail} /><ReceiptRow label="Resultado" value={`${number(quote.quantity)} ${service.unit}`} />{quote.secondary ? <ReceiptRow label="Detalle" value={quote.secondary} /> : null}</div>

            <div className="mt-5 grid gap-3">
              <PriceCard active={priceMode === 'labor'} label="Solo mano de obra" low={laborLow} high={laborHigh} note="Ejecución o instalación; materiales principales aparte." dark />
              <PriceCard active={priceMode === 'complete'} label="Trabajo vendido" low={completeLow} high={completeHigh} note="Ejecución + materiales/insumos base indicados; revisa exclusiones." />
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-[#F5A13D]/28 bg-[#F5A13D]/[.055] p-5"><p className="text-[9px] font-black uppercase tracking-[.14em] text-[#F5A13D]">Referencia seleccionada</p><p className="mt-3 text-[clamp(1.65rem,5vw,2.35rem)] font-black leading-none tracking-[-.045em]">{money(selectedLow)} – {money(selectedHigh)}</p><p className="mt-2 text-[10px] text-white/42">{priceMode === 'labor' ? 'Mano de obra' : 'Trabajo vendido'} · IVA considerado como referencia</p></div>

            <div className="mt-7 border-t border-white/[.07] pt-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#F5A13D]">Qué considera el servicio</p><ul className="mt-3 grid gap-2.5">{service.includes.map((item) => <li key={item} className="flex gap-2 text-xs leading-5 text-white/60"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A13D]" />{item}</li>)}</ul></div>

            <Link href={`/presupuesto?servicio=${service.id}`} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F5A13D] px-5 text-sm font-black text-black transition hover:brightness-105">Añadir al presupuesto <ArrowRight className="h-4 w-4" /></Link>
            <a href={`https://wa.me/56930121625?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[.07] bg-white/[.055] px-5 text-xs font-black text-white transition hover:bg-white/[.09]">Consultar este trabajo <MessageCircle className="h-4 w-4" /></a>
            <p className="mt-4 text-center text-[10px] leading-5 text-white/30">Referencia comercial, no cotización final ni documento tributario.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function PriceModeButton({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-[1rem] px-3 py-3.5 text-left transition ${active ? 'bg-[#0B0C0E] text-white shadow-sm' : 'bg-white/70 text-black hover:bg-white'}`}><b className="block text-xs">{title}</b><span className={`mt-1 block text-[9px] ${active ? 'text-white/45' : 'text-black/40'}`}>{text}</span></button>;
}

function PriceCard({ active, label, low, high, note, dark = false }: { active: boolean; label: string; low: number; high: number; note: string; dark?: boolean }) {
  return <div className={`rounded-[1.45rem] border p-5 transition ${dark ? 'border-white/[.07] bg-white/[.045] text-white' : 'border-[#F5A13D]/25 bg-[linear-gradient(135deg,#F5A13D,#FFF2D8)] text-black'} ${active ? 'ring-2 ring-[#F5A13D] ring-offset-2 ring-offset-[#0D0E10]' : ''}`}><div className="flex items-center justify-between gap-3"><span className="text-[9px] font-black uppercase tracking-[.15em] opacity-60">{label}</span>{active ? <span className="rounded-full bg-black px-2.5 py-1 text-[8px] font-black text-[#F5A13D]">ELEGIDO</span> : null}</div><b className="mt-3 block text-[clamp(1.35rem,4vw,1.8rem)] leading-tight tracking-[-.04em]">{money(low)} – {money(high)}</b><p className="mt-2 text-[10px] leading-5 opacity-55">{note}</p></div>;
}

function AreaField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className="block"><div className="flex items-end justify-between gap-3"><div><b className="block text-[10px] uppercase tracking-[.14em] text-black/55">Superficie total</b><span className="text-[9px] text-black/40">m² exactos del trabajo</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(1, value - 5))} className="grid h-10 w-10 place-items-center rounded-full bg-[#F1ECE5]"><Minus className="h-4 w-4" /></button><input type="number" min="0" value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-24 rounded-xl bg-[#F1ECE5] px-3 py-2 text-right text-xl font-black outline-none"/><button type="button" onClick={() => onChange(value + 5)} className="grid h-10 w-10 place-items-center rounded-full bg-[#0B0C0E] text-[#F5A13D]"><Plus className="h-4 w-4" /></button></div></div></label>;
}

function SliderField({ field, value, onChange }: { field: FieldConfig; value: number; onChange: (value: number) => void }) {
  return <label className="block"><div className="flex items-end justify-between gap-3"><div><b className="block text-[10px] uppercase tracking-[.14em] text-black/55">{field.label}</b><span className="text-[9px] text-black/40">{field.hint}</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(field.step, value - field.step))} className="grid h-9 w-9 place-items-center rounded-full bg-[#F1ECE5]"><Minus className="h-3.5 w-3.5" /></button><input type="number" min="0" max={field.max} step={field.step} value={value || ''} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-20 rounded-xl bg-[#F1ECE5] px-2 py-2 text-right text-lg font-black outline-none"/><button type="button" onClick={() => onChange(Math.min(field.max, value + field.step))} className="grid h-9 w-9 place-items-center rounded-full bg-[#0B0C0E] text-[#F5A13D]"><Plus className="h-3.5 w-3.5" /></button></div></div><input type="range" min="0" max={field.max} step={field.step} value={Math.min(field.max, value)} onChange={(event) => onChange(Number(event.target.value))} className="mt-4 h-2 w-full accent-[#F28C28]" /></label>;
}

function QuantityField({ value, suffix, onChange }: { value: number; suffix: string; onChange: (value: number) => void }) {
  return <div className="grid grid-cols-[48px_1fr_48px] items-center gap-2 rounded-[1.25rem] bg-[#F1ECE5] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-white"><Minus className="h-4 w-4" /></button><div className="text-center"><input type="number" min="1" value={value || ''} onChange={(event) => onChange(Math.max(1, Math.round(Number(event.target.value) || 1)))} className="w-full bg-transparent text-center text-2xl font-black outline-none"/><span className="text-[9px] font-black uppercase text-[#B96A16]">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} className="grid h-11 w-11 place-items-center rounded-full bg-[#0B0C0E] text-[#F5A13D]"><Plus className="h-4 w-4" /></button></div>;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-b border-white/[.07] py-2.5 last:border-0 sm:grid-cols-[85px_1fr]"><span className="text-[9px] font-black uppercase text-white/35">{label}</span><b className="text-xs leading-5 sm:text-right">{value}</b></div>;
}