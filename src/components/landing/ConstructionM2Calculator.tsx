'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CircleDollarSign,
  Info,
  MessageCircle,
  Minus,
  Plus,
  ReceiptText,
  Ruler,
  Sparkles,
} from 'lucide-react';
import {
  BUDGET_SERVICES,
  calculateServiceMeasurement,
  type BudgetService,
  type MeasurementValues,
} from '@/components/presupuesto/serviceCatalog';

const FEATURED_IDS = ['llave-mano', 'kit-basico', 'ampliaciones', 'radier', 'techumbre', 'gasfiteria', 'electricidad', 'aire', 'cierre'];
const SERVICES = FEATURED_IDS.map((id) => BUDGET_SERVICES.find((service) => service.id === id)).filter(Boolean) as BudgetService[];
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const money = (value: number) => CLP.format(Math.round(value || 0));
const number = (value: number) => NUMBER.format(value || 0);

export default function ConstructionM2Calculator() {
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [values, setValues] = useState<MeasurementValues>(SERVICES[0].defaultValues);
  const service = SERVICES.find((item) => item.id === serviceId) || SERVICES[0];
  const Icon = service.icon;
  const measurement = useMemo(() => calculateServiceMeasurement(service, values), [service, values]);
  const low = measurement.quantity * service.marketMin * measurement.priceFactor;
  const high = measurement.quantity * service.marketMax * measurement.priceFactor;
  const average = Math.round((low + high) / 2);
  const unitMin = service.marketMin * measurement.priceFactor;
  const unitMax = service.marketMax * measurement.priceFactor;

  const reference = useMemo(() => {
    const compactService = service.id.split('-').map((part) => part.slice(0, 2).toUpperCase()).join('').slice(0, 8);
    return `FBK-${compactService}-${String(Math.round(measurement.quantity)).padStart(3, '0')}`;
  }, [measurement.quantity, service.id]);

  const whatsappMessage = useMemo(() => [
    'Hola Soluciones Fabrick, quiero revisar este cálculo.',
    '',
    `Referencia: ${reference}`,
    `Servicio: ${service.title}`,
    `Fórmula: ${measurement.formula}`,
    `Medidas: ${measurement.detail}`,
    measurement.secondary ? `Resultado dimensional: ${measurement.secondary}` : '',
    `Cantidad calculada: ${number(measurement.quantity)} ${service.unit}`,
    `Rango mostrado: ${money(low)} a ${money(high)}`,
    '',
    'Quiero confirmar alcance, ubicación y precio final.',
  ].filter(Boolean).join('\n'), [high, low, measurement, reference, service]);

  function chooseService(nextId: string) {
    const next = SERVICES.find((item) => item.id === nextId) || SERVICES[0];
    setServiceId(next.id);
    setValues(next.defaultValues);
  }

  function updateValue(key: keyof MeasurementValues, value: number) {
    setValues((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  }

  function analyzeWithFabrick() {
    const prompt = [
      'Analiza este cálculo preliminar como orientador comercial y técnico de construcción en Chile.',
      `Referencia: ${reference}`,
      `Servicio: ${service.title}`,
      `Categoría: ${service.category}`,
      `Fórmula utilizada: ${measurement.formula}`,
      `Medidas ingresadas: ${measurement.detail}`,
      measurement.secondary ? `Resultado dimensional adicional: ${measurement.secondary}` : '',
      `Cantidad calculada: ${number(measurement.quantity)} ${service.unit}`,
      `Rango referencial actual: ${money(low)} a ${money(high)}. Promedio: ${money(average)}.`,
      `Incluye como referencia: ${service.includes.join('; ')}.`,
      `Advertencia del estimador: ${service.disclaimer}`,
      '',
      'Entrégame un análisis más sofisticado y breve con: alcance probable, partidas que debería separar, exclusiones o riesgos, preguntas que faltan responder, etapas recomendadas y próximo paso. No conviertas este rango en precio final ni inventes medidas, permisos o materiales no informados.',
    ].filter(Boolean).join('\n');

    window.dispatchEvent(new CustomEvent('fabrick:agent-open', {
      detail: { prompt, autoSend: true },
    }));
  }

  return (
    <section id="cotizador" className="relative scroll-mt-20 overflow-hidden bg-[#F8F0E9] px-4 py-16 text-[#171820] sm:px-6 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(204,177,150,.34),transparent_28%),radial-gradient(circle_at_90%_80%,rgba(182,144,108,.18),transparent_30%)]" />
      <div className="relative mx-auto max-w-[1260px]">
        <header className="grid gap-5 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
          <div>
            <p data-reveal className="text-[10px] font-black uppercase tracking-[.24em] text-[#895E3D]">Cotizador dimensional</p>
            <h2 data-split className="mt-3 text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Mide el trabajo antes de comprometer tu inversión.</h2>
          </div>
          <p data-reveal data-reveal-delay="0.15" className="max-w-2xl text-sm leading-7 text-[#685D55] sm:text-base">Cada especialidad aplica una fórmula distinta. Ingresa largo, ancho, alto, espesor, metros lineales o unidades; después Fabrick puede ordenar las partidas y preguntas pendientes para una revisión más completa.</p>
        </header>

        <div data-reveal data-reveal-dir="zoom" className="mt-8 grid overflow-hidden rounded-[2.25rem] bg-white shadow-[0_32px_100px_rgba(70,48,22,.16)] lg:grid-cols-[minmax(0,1.08fr)_minmax(370px,.72fr)]">
          <div className="p-5 sm:p-7 lg:p-8">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><Ruler className="h-5 w-5" /></span><div><p className="text-sm font-black">Configura una referencia real</p><p className="mt-1 text-xs text-[#7A6C61]">Selecciona el servicio y completa las medidas que correspondan.</p></div></div>

            <ol className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-black uppercase tracking-[.14em]">
              {['Elige el servicio', 'Ingresa las medidas', 'Revisa el recibo'].map((step, index) => (
                <li key={step} className="flex items-center gap-2 text-[#7A6C61]"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#171820] text-[#CCB196]">{index + 1}</span>{step}{index < 2 ? <ArrowRight className="ml-3 h-3 w-3 text-[#B6906C]/60" aria-hidden /> : null}</li>
              ))}
            </ol>

            <div className="-mx-1 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SERVICES.map((item) => {
                const ItemIcon = item.icon;
                const active = item.id === serviceId;
                return (
                  <button key={item.id} type="button" aria-pressed={active} onClick={() => chooseService(item.id)} className={`min-w-[76%] snap-center rounded-[1.45rem] p-4 text-left transition sm:min-w-[250px] ${active ? 'bg-[#171820] text-[#F8F0E9] shadow-[0_18px_42px_rgba(23,24,32,.22)]' : 'bg-[#F4E9DE] text-[#342C27] hover:-translate-y-0.5 hover:bg-[#EADBCB]'}`}>
                    <div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 place-items-center rounded-full ${active ? 'bg-[#CCB196] text-[#171820]' : 'bg-white text-[#895E3D]'}`}><ItemIcon className="h-4 w-4" /></span><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] ${active ? 'bg-white/10 text-[#E5CFBA]' : 'bg-white text-[#806E61]'}`}>{item.unit}</span></div>
                    <strong className="mt-4 block text-sm leading-5">{item.short}</strong>
                    <span className={`mt-2 block text-[9px] leading-4 ${active ? 'text-white/50' : 'text-[#8A7769]'}`}>{money(item.marketMin)}–{money(item.marketMax)} / {item.unit}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[1.6rem] bg-[linear-gradient(135deg,#F8F0E9,#E4CFBC)] p-4 sm:p-5">
              <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#CCB196] text-[#171820]"><Icon className="h-5 w-5" /></span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#895E3D]">Solución seleccionada</p><h3 className="mt-1 text-lg font-black">{service.title}</h3><p className="mt-2 text-xs leading-5 text-[#685D55]">{service.description}</p></div></div>
            </div>

            <MeasurementFields service={service} values={values} onChange={updateValue} />
            <div className="mt-5 rounded-[1.35rem] bg-[#EEE1D5] px-4 py-3.5"><p className="flex gap-2 text-xs leading-5 text-[#5E5148]"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#895E3D]" />{service.disclaimer}</p></div>
          </div>

          <aside className="relative overflow-hidden bg-[linear-gradient(160deg,#242630_0%,#171820_70%,#101117_100%)] p-5 text-white sm:p-7 lg:p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#CCB196]/14 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.23em] text-[#CCB196]">Estimación preliminar</p><h3 className="mt-2 text-2xl font-black tracking-[-.04em]">Recibo de cálculo</h3></div><span className="grid h-12 w-12 place-items-center rounded-full bg-[#CCB196] text-[#171820]"><ReceiptText className="h-5 w-5" /></span></div>
              <div className="mt-5 flex items-center justify-between rounded-full bg-white/[.065] px-4 py-2.5 text-[9px] font-black uppercase tracking-[.13em] text-white/45"><span>Referencia</span><span className="text-[#E5CFBA]">{reference}</span></div>

              <div className="mt-5 rounded-[1.5rem] bg-white/[.055] p-4"><ReceiptRow label="Servicio" value={service.short} /><ReceiptRow label="Medidas" value={measurement.detail} /><ReceiptRow label="Fórmula" value={measurement.formula} />{measurement.secondary ? <ReceiptRow label="Desglose" value={measurement.secondary} /> : null}<ReceiptRow label="Resultado" value={`${number(measurement.quantity)} ${service.unit}`} last /></div>

              <div className="mt-4 overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#CCB196,#F8F0E9)] p-5 text-[#171820]" aria-live="polite">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.17em] text-[#171820]/60"><Sparkles className="h-4 w-4" /> Rango estimado</div>
                <div className="mt-4 grid grid-cols-2 gap-4"><div><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#171820]/55">Desde</span><strong className="mt-1 block text-2xl font-black">{money(low)}</strong></div><div><span className="text-[9px] font-black uppercase tracking-[.15em] text-[#171820]/55">Hasta</span><strong className="mt-1 block text-2xl font-black">{money(high)}</strong></div></div>
                <div className="mt-4 flex items-center justify-between border-t border-[#171820]/12 pt-3 text-xs"><span className="text-[#171820]/60">Promedio orientativo</span><b>{money(average)}</b></div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#171820]/55"><span>Tarifa referencial × {service.unit}</span><b>{money(unitMin)} – {money(unitMax)}</b></div>
              </div>

              <div className="mt-6"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[.2em] text-[#CCB196]"><CircleDollarSign className="h-4 w-4" /> Esta referencia considera</div><ul className="mt-3 grid gap-2">{service.includes.map((item) => <li key={item} className="flex gap-2 rounded-xl bg-white/[.045] px-3 py-2.5 text-xs leading-5 text-[#D7CCC4]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#CCB196]" />{item}</li>)}</ul></div>

              <button type="button" onClick={analyzeWithFabrick} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#F8F0E9] px-5 text-sm font-black text-[#171820] transition hover:bg-[#CCB196]"><Bot className="h-4 w-4" /> Analizar este cálculo con Fabrick IA</button>
              <Link href={`/presupuesto?servicio=${service.id}`} className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#D8B23D] px-5 text-sm font-black text-[#171820] transition hover:bg-[#F4D98B]">Añadir al presupuesto completo <ArrowRight className="h-4 w-4" /></Link>
              <a href={`https://wa.me/56930121625?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/[.075] px-5 text-xs font-black text-white transition hover:bg-white/[.13]">Revisar solo este cálculo <MessageCircle className="h-4 w-4" /></a>
              <p className="mt-4 text-center text-[10px] leading-5 text-white/35">Fabrick organiza supuestos y preguntas pendientes; el equipo confirma factibilidad y precio final.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MeasurementFields({ service, values, onChange }: { service: BudgetService; values: MeasurementValues; onChange: (key: keyof MeasurementValues, value: number) => void }) {
  if (service.measurement === 'count') return <div className="mt-5"><QuantityField value={values.quantity} onChange={(value) => onChange('quantity', value)} suffix={service.unit === 'punto' ? 'puntos' : 'unidades'} /></div>;
  if (service.measurement === 'linear') return <div className="mt-5 grid gap-3 sm:grid-cols-2"><NumberField label="Largo total" value={values.length} onChange={(value) => onChange('length', value)} suffix="m" />{service.id === 'cierre' ? <NumberField label="Altura referencial" value={values.height} onChange={(value) => onChange('height', value)} suffix="m" /> : null}</div>;

  const fields: Array<{ key: keyof MeasurementValues; label: string }> = [];
  if (service.measurement === 'floor') fields.push({ key: 'length', label: 'Largo' }, { key: 'width', label: 'Ancho' });
  if (service.measurement === 'wall') fields.push({ key: 'length', label: 'Largo del muro' }, { key: 'height', label: 'Alto del muro' });
  if (service.measurement === 'room-walls') fields.push({ key: 'length', label: 'Largo del recinto' }, { key: 'width', label: 'Ancho del recinto' }, { key: 'height', label: 'Alto de los muros' });
  if (service.measurement === 'slab') fields.push({ key: 'length', label: 'Largo' }, { key: 'width', label: 'Ancho' }, { key: 'height', label: 'Espesor' });
  if (service.measurement === 'volume') fields.push({ key: 'length', label: 'Largo' }, { key: 'width', label: 'Ancho' }, { key: 'height', label: 'Profundidad / alto' });
  return <div className="mt-5 grid gap-3 sm:grid-cols-2">{fields.map((field) => <NumberField key={field.key} label={field.label} value={values[field.key]} onChange={(value) => onChange(field.key, value)} suffix="m" />)}</div>;
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (value: number) => void; suffix: string }) {
  return <label><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#806E61]">{label}</span><div className="mt-2 flex items-end gap-3 rounded-[1.25rem] bg-[#F4E9DE] px-4 py-3 focus-within:ring-2 focus-within:ring-[#B6906C]/40"><input type="number" min="0" step="0.01" inputMode="decimal" value={value || ''} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-.05em] outline-none" /><b className="mb-1 text-xs text-[#895E3D]">{suffix}</b></div></label>;
}

function QuantityField({ value, onChange, suffix }: { value: number; onChange: (value: number) => void; suffix: string }) {
  return <div><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#806E61]">Cantidad</span><div className="mt-2 grid grid-cols-[52px_1fr_52px] items-center gap-2 rounded-[1.25rem] bg-[#F4E9DE] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-sm"><Minus className="h-4 w-4" /></button><div className="text-center"><input type="number" min="1" inputMode="numeric" value={value || ''} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} className="w-full bg-transparent text-center text-3xl font-black outline-none" /><span className="text-[10px] font-bold uppercase tracking-[.13em] text-[#895E3D]">{suffix}</span></div><button type="button" onClick={() => onChange(value + 1)} className="grid h-12 w-12 place-items-center rounded-full bg-[#171820] text-[#CCB196] shadow-sm"><Plus className="h-4 w-4" /></button></div></div>;
}

function ReceiptRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <div className={`grid gap-1 py-3 sm:grid-cols-[110px_1fr] sm:items-start ${last ? '' : 'border-b border-white/8'}`}><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/38">{label}</span><strong className="text-xs leading-5 text-[#F8F0E9] sm:text-right">{value}</strong></div>;
}
