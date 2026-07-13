'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  Layers3,
  Maximize2,
  Minus,
  PackageCheck,
  Plus,
  Power,
  Ruler,
  Snowflake,
  Sparkles,
  Thermometer,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import { FabrickNavLogo } from '@/components/FabrickBrandIcon';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { navigateWithTransition } from '@/lib/routeTransition';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';

type Kind = 'aire' | 'radier';
type Capacity = 9000 | 12000 | 18000 | 24000;
type ServiceMode = 'equipo_instalacion' | 'solo_instalacion' | 'solo_equipo';
type RadierPlanId = 'materiales' | 'estandar' | 'reforzado';

type AirProductOption = {
  cap: Capacity;
  name: string;
  price: number;
  image: string;
  details: string[];
  stock?: number;
  productId?: string;
};

type RadierPlan = {
  id: RadierPlanId;
  name: string;
  priceM2: number;
  materialsM2: number;
  laborM2: number;
  extrasM2: number;
  description: string;
  details: string[];
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const capacities: Capacity[] = [9000, 12000, 18000, 24000];
const ENERGY_REFERENCE_CLP_KWH = 263;
const CGE_TARIFF_SOURCE = 'https://www.cge.cl/informacion-comercial/tarifas-y-procesos-tarifarios/tarifa-de-suministro/';
const AIR_INPUT_POWER_KW: Record<Capacity, number> = {
  9000: 0.82,
  12000: 1.08,
  18000: 1.58,
  24000: 2.2,
};

function getTemperatureLoadFactor(temperature: number) {
  if (temperature <= 18) return 0.82;
  if (temperature <= 20) return 0.68;
  if (temperature <= 22) return 0.56;
  if (temperature <= 24) return 0.46;
  return 0.38;
}

const ThreeAirRoomViewer = dynamic(() => import('@/components/presupuestos/ThreeAirRoomViewer'), {
  ssr: false,
  loading: () => <ViewerLoading label="Preparando habitación interactiva" />,
});

const ThreeRadierViewer = dynamic(() => import('@/components/presupuestos/ThreeRadierViewer'), {
  ssr: false,
  loading: () => <ViewerLoading label="Preparando radier interactivo" />,
});

const AIR_FALLBACKS: AirProductOption[] = [
  { cap: 9000, name: 'Split Inverter 9.000 BTU', price: 289000, image: '', details: ['Hasta 18 m²', 'Frío/calor · bajo consumo'] },
  { cap: 12000, name: 'TCL SaveIN 12.000 BTU WiFi', price: 349990, image: '', details: ['Hasta 24 m²', 'Inverter · control WiFi'] },
  { cap: 18000, name: 'TCL BreezeIN 18.000 BTU WiFi', price: 529990, image: '', details: ['Hasta 36 m²', 'Inverter · frío/calor'] },
  { cap: 24000, name: 'Split Inverter 24.000 BTU', price: 749990, image: '', details: ['Hasta 48 m²', 'Alta capacidad · inverter'] },
];

const RADIER_PLANS: RadierPlan[] = [
  { id: 'materiales', name: 'Kit de materiales', priceM2: 39000, materialsM2: 29000, laborM2: 0, extrasM2: 10000, description: 'Para ejecutar con mano de obra propia.', details: ['Hormigón y base estimados', 'Sin mano de obra'] },
  { id: 'estandar', name: 'Radier estándar instalado', priceM2: 72000, materialsM2: 35000, laborM2: 27000, extrasM2: 10000, description: 'La alternativa equilibrada para vivienda.', details: ['10 cm de hormigón', 'Preparación y terminación'] },
  { id: 'reforzado', name: 'Radier reforzado', priceM2: 96000, materialsM2: 43000, laborM2: 33000, extrasM2: 20000, description: 'Para mayor carga o exigencia técnica.', details: ['Malla y base reforzada', 'Mayor resistencia'] },
];

function Field({ label, value, onChange, suffix, step = 0.1 }: { label: string; value: number; onChange: (value: number) => void; suffix?: string; step?: number }) {
  return (
    <label className="grid gap-2 rounded-[1.35rem] bg-[#fff6dc]/[0.07] p-3 ring-1 ring-white/[0.06] transition focus-within:ring-yellow-300/45">
      <span className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.18em] text-[#f7eedb]/45"><span>{label}</span>{suffix ? <span>{suffix}</span> : null}</span>
      <input type="number" min="0" step={step} value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 bg-transparent text-xl font-black text-white outline-none" />
    </label>
  );
}

function Metric({ label, value, accent, icon: Icon }: { label: string; value: string; accent?: boolean; icon?: typeof Ruler }) {
  return (
    <div className={`rounded-[1.35rem] p-4 ${accent ? 'bg-yellow-300 text-black shadow-[0_14px_40px_rgba(250,204,21,.16)]' : 'bg-[#fff6dc]/[0.065] text-white ring-1 ring-white/[0.05]'}`}>
      <div className="flex items-center justify-between gap-2"><p className={`text-[9px] font-black uppercase tracking-[.18em] ${accent ? 'text-black/55' : 'text-[#f7eedb]/42'}`}>{label}</p>{Icon ? <Icon className="h-4 w-4 opacity-55" /> : null}</div>
      <p className="mt-2 text-xl font-black tracking-[-.04em] sm:text-2xl">{value}</p>
    </div>
  );
}

function ViewerLoading({ label }: { label: string }) {
  return <div className="mt-7 grid min-h-[420px] place-items-center rounded-[2rem] bg-[#0b0905] text-center text-white ring-1 ring-yellow-200/15"><div><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-yellow-300/20 border-t-yellow-300" /><b className="mt-4 block text-sm">{label}</b><span className="mt-1 block text-xs text-[#f7eedb]/60">Cargando controles 3D…</span></div></div>;
}

function AirProductThumbnail({ item }: { item: AirProductOption }) {
  if (item.image) return <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1.5" />;
  return (
    <span className="relative block h-full w-full overflow-hidden bg-[linear-gradient(145deg,#ffffff,#e7e3da)]">
      <span className="absolute inset-x-2 top-4 h-8 rounded-[.55rem] border border-black/10 bg-white shadow-[0_7px_14px_rgba(0,0,0,.16)]">
        <span className="absolute inset-x-2 bottom-1 h-px bg-black/20" />
        <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
      <span className="absolute inset-x-0 bottom-2 text-center text-[7px] font-black uppercase tracking-[.13em] text-black/45">Inverter</span>
    </span>
  );
}

function RadierPlanThumbnail({ reinforced }: { reinforced: boolean }) {
  return (
    <span className="relative block h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_5%,rgba(250,204,21,.28),transparent_55%),#17120a]">
      <span className="absolute left-3 right-3 top-4 h-3 -skew-y-6 rounded-sm bg-[#ece5d8] shadow-[0_5px_0_#9d8c72,0_10px_0_#6f4a2d]" />
      {reinforced ? <span className="absolute left-4 right-4 top-5 grid grid-cols-5 gap-px opacity-55">{Array.from({ length: 10 }).map((_, index) => <i key={index} className="h-px bg-black" />)}</span> : null}
      <Layers3 className="absolute bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 text-yellow-300" />
    </span>
  );
}

function AirProductCard({ item, selected, recommended, onSelect, onPreview }: { item: AirProductOption; selected: boolean; recommended: boolean; onSelect: () => void; onPreview: () => void }) {
  return (
    <article className={`group flex w-[252px] shrink-0 snap-center flex-col overflow-hidden rounded-[1.6rem] p-3 transition duration-300 hover:-translate-y-1 sm:w-auto ${selected ? 'bg-[#fff6dc] text-black shadow-[0_22px_56px_rgba(0,0,0,.28)]' : 'bg-[#fff6dc]/[0.075] text-white ring-1 ring-white/[0.07]'}`}>
      <button type="button" onClick={onPreview} aria-label={`Ver detalles de ${item.name}`} className="relative h-28 overflow-hidden rounded-[1.2rem] bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">
        <AirProductThumbnail item={item} />
        {recommended ? <span className="absolute left-2 top-2 rounded-full bg-yellow-300 px-2 py-1 text-[8px] font-black uppercase tracking-[.08em] text-black shadow">Recomendado</span> : null}
        <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/80 text-white backdrop-blur-md transition group-hover:scale-110"><Eye className="h-4 w-4" /></span>
      </button>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <span className={`text-[9px] font-black uppercase tracking-[.18em] ${selected ? 'text-amber-700' : 'text-yellow-300'}`}>{item.cap.toLocaleString('es-CL')} BTU</span>
        <h3 className="mt-1 line-clamp-2 min-h-9 text-sm font-black leading-[1.15]">{item.name}</h3>
        <ul className={`mt-2 space-y-1 text-[10px] leading-4 ${selected ? 'text-black/58' : 'text-zinc-400'}`}>
          {item.details.slice(0, 2).map((detail) => <li key={detail} className="flex gap-1.5"><CheckCircle2 className={`mt-0.5 h-3 w-3 shrink-0 ${selected ? 'text-amber-700' : 'text-yellow-300'}`} />{detail}</li>)}
        </ul>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div><span className={`block text-[8px] font-bold uppercase tracking-widest ${selected ? 'text-black/40' : 'text-white/35'}`}>Precio referencial</span><b className={`block text-xl tracking-[-.04em] ${selected ? 'text-black' : 'text-yellow-300'}`}>{money.format(item.price)}</b></div>
          <button type="button" onClick={onSelect} aria-pressed={selected} className={`min-h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-[.1em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${selected ? 'bg-black text-white' : 'bg-yellow-300 text-black hover:bg-[#fff6dc]'}`}>{selected ? 'Elegido' : 'Elegir'}</button>
        </div>
      </div>
    </article>
  );
}

function AirProductDialog({ item, selected, onClose, onSelect }: { item: AirProductOption; selected: boolean; onClose: () => void; onSelect: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={`Ficha de ${item.name}`} onClick={onClose} className="fixed inset-0 z-[100] grid items-end bg-black/78 p-3 backdrop-blur-md sm:place-items-center">
      <article onClick={(event) => event.stopPropagation()} className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#f8f1df] p-4 text-black shadow-[0_30px_100px_rgba(0,0,0,.55)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-700">Ficha rápida · {item.cap.toLocaleString('es-CL')} BTU</p><h2 className="mt-1 text-xl font-black tracking-[-.04em] sm:text-2xl">{item.name}</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar ficha" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-[1.08fr_.92fr]">
          <div className="relative h-56 overflow-hidden rounded-[1.6rem] bg-white sm:h-full sm:min-h-64"><AirProductThumbnail item={item} /><span className="absolute bottom-3 left-3 rounded-full bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-yellow-300">Inverter · frío/calor</span></div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[.2em] text-black/45">Lo esencial</span>
            <ul className="mt-3 space-y-3">
              {item.details.map((detail) => <li key={detail} className="flex items-start gap-2 text-sm font-semibold"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{detail}</li>)}
              <li className="flex items-start gap-2 text-sm font-semibold"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />Capacidad nominal de {item.cap.toLocaleString('es-CL')} BTU</li>
              <li className="flex items-start gap-2 text-sm font-semibold"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />{typeof item.stock === 'number' ? `${item.stock} unidades informadas` : 'Stock por confirmar'}</li>
            </ul>
            <div className="mt-5 rounded-[1.3rem] bg-yellow-300 p-4"><span className="text-[9px] font-black uppercase tracking-[.16em] text-black/50">Precio referencial del equipo</span><b className="mt-1 block text-3xl tracking-[-.05em]">{money.format(item.price)}</b></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {item.productId ? <a href={`/producto/${item.productId}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-black/8 px-4 text-center text-xs font-black">Ver producto</a> : <button type="button" onClick={onClose} className="min-h-12 rounded-full bg-black/8 px-4 text-xs font-black">Seguir comparando</button>}
              <button type="button" onClick={() => { onSelect(); onClose(); }} className="min-h-12 rounded-full bg-black px-4 text-xs font-black text-white">{selected ? 'Mantener elegido' : 'Elegir equipo'}</button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

type EnergyRemoteCalculatorProps = {
  capacity: Capacity;
  temperature: number;
  hours: number;
  days: number;
  tariff: number;
  averagePowerKw: number;
  monthlyKwh: number;
  monthlyCost: number;
  onTemperatureChange: (value: number) => void;
  onHoursChange: (value: number) => void;
  onDaysChange: (value: number) => void;
  onTariffChange: (value: number) => void;
};

function EnergyRemoteCalculator({ capacity, temperature, hours, days, tariff, averagePowerKw, monthlyKwh, monthlyCost, onTemperatureChange, onHoursChange, onDaysChange, onTariffChange }: EnergyRemoteCalculatorProps) {
  const nominalPower = AIR_INPUT_POWER_KW[capacity];
  const loadFactor = getTemperatureLoadFactor(temperature);
  const dailyCost = days > 0 ? monthlyCost / days : 0;

  return (
    <section className="mt-7 overflow-hidden rounded-[2.1rem] bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,.16),transparent_30%),radial-gradient(circle_at_90%_100%,rgba(250,204,21,.16),transparent_34%),#0e0c08] p-4 shadow-[0_30px_90px_rgba(0,0,0,.34)] ring-1 ring-white/[0.07] sm:p-7" aria-labelledby="energy-calculator-title">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">Simulador de consumo inverter</p><h2 id="energy-calculator-title" className="mt-2 max-w-2xl text-3xl font-black leading-[.95] tracking-[-.055em] sm:text-4xl">Lo que realmente podría sumar a tu cuenta.</h2></div>
        <span className="rounded-full bg-yellow-300 px-3 py-2 text-[9px] font-black uppercase tracking-[.13em] text-black">Referencia Chile · 2026</span>
      </header>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-[#f7eedb]/62">Un equipo inverter no trabaja a máxima potencia durante todo el día: modula al acercarse a la temperatura elegida. Ajusta tus horas y la tarifa de tu boleta para obtener una estimación transparente.</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[330px_1fr]">
        <div className="mx-auto w-full max-w-[330px] rounded-[3.1rem] bg-[linear-gradient(150deg,#fff9e8,#ddd2b8)] p-4 text-black shadow-[0_28px_70px_rgba(0,0,0,.48),inset_0_1px_0_white] sm:p-5">
          <div className="flex items-center justify-between px-1"><span className="text-[9px] font-black uppercase tracking-[.24em] text-black/42">Fabrick climate</span><span className="grid h-9 w-9 place-items-center rounded-full bg-black text-yellow-300 shadow"><Power className="h-4 w-4" /></span></div>
          <div className="mt-4 overflow-hidden rounded-[1.8rem] bg-[#071018] p-5 text-cyan-300 shadow-[inset_0_0_34px_rgba(34,211,238,.12)] ring-1 ring-black/10">
            <div className="flex items-start justify-between"><Snowflake className="h-7 w-7" /><span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-100/55">Cool · Auto</span></div>
            <div className="mt-2 flex items-start justify-center font-mono"><span className="text-[5.3rem] font-black leading-none tracking-[-.1em]">{temperature}</span><span className="mt-2 text-2xl font-bold">°C</span></div>
            <div className="mt-3 flex items-center justify-between border-t border-cyan-100/10 pt-3 text-[9px] font-black uppercase tracking-[.14em] text-cyan-100/55"><span>{capacity.toLocaleString('es-CL')} BTU</span><span>{averagePowerKw.toFixed(2)} kW prom.</span></div>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <button type="button" aria-label="Bajar temperatura" onClick={() => onTemperatureChange(Math.max(16, temperature - 1))} className="grid h-12 place-items-center rounded-full bg-black/8 shadow-inner"><Minus className="h-5 w-5" /></button>
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-black/42">Temperatura</span>
            <button type="button" aria-label="Subir temperatura" onClick={() => onTemperatureChange(Math.min(30, temperature + 1))} className="grid h-12 place-items-center rounded-full bg-black text-white shadow"><Plus className="h-5 w-5" /></button>
          </div>

          <div className="mt-4 space-y-3 rounded-[1.55rem] bg-white/48 p-4 shadow-inner">
            <label className="block"><span className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.14em] text-black/48"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Uso diario</span><b className="text-black">{hours} h</b></span><input type="range" min="1" max="16" step="1" value={hours} onChange={(event) => onHoursChange(Number(event.target.value))} className="mt-2 w-full accent-black" /></label>
            <label className="block"><span className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.14em] text-black/48"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Días al mes</span><b className="text-black">{days}</b></span><input type="range" min="1" max="31" step="1" value={days} onChange={(event) => onDaysChange(Number(event.target.value))} className="mt-2 w-full accent-black" /></label>
            <label className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2"><span className="text-[9px] font-black uppercase tracking-[.13em] text-black/48">Tarifa $/kWh</span><input type="number" min="1" max="1000" step="1" value={tariff} onChange={(event) => onTariffChange(Math.max(1, Number(event.target.value) || ENERGY_REFERENCE_CLP_KWH))} className="w-20 bg-transparent text-right font-mono text-lg font-black outline-none" /></label>
          </div>
        </div>

        <div className="flex flex-col rounded-[1.9rem] bg-[#fff6dc]/[0.065] p-5 ring-1 ring-white/[0.06] sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-yellow-300">Costo mensual estimado</p>
          <p className="mt-2 text-[clamp(44px,8vw,82px)] font-black leading-none tracking-[-.075em] text-white">{money.format(monthlyCost)}</p>
          <p className="mt-3 text-sm font-semibold text-cyan-200">Aproximadamente {money.format(dailyCost)} por día de uso configurado.</p>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <Metric label="Energía mes" value={`${num.format(monthlyKwh)} kWh`} icon={Zap} />
            <Metric label="Potencia media" value={`${averagePowerKw.toFixed(2)} kW`} icon={Snowflake} />
            <Metric label="Factor inverter" value={`${Math.round(loadFactor * 100)}%`} icon={Sparkles} />
          </div>

          <div className="mt-5 rounded-[1.35rem] bg-black/28 p-4 text-xs leading-6 text-[#f7eedb]/62">
            <b className="text-white">Cálculo visible:</b> {nominalPower.toFixed(2)} kW nominales × {Math.round(loadFactor * 100)}% de carga × {hours} h × {days} días = <b className="text-cyan-200">{num.format(monthlyKwh)} kWh</b>. Luego se multiplica por {money.format(tariff)}/kWh.
          </div>
          <div className="mt-4 rounded-[1.35rem] bg-yellow-300/10 p-4 text-xs leading-5 text-yellow-50/68 ring-1 ring-yellow-300/15">
            <b className="text-yellow-200">No es correcto afirmar que todo aire acondicionado “es costoso”.</b> El gasto cambia según capacidad, aislamiento, temperatura exterior, mantención, horas de uso y tarifa. Este cálculo estima solo la energía adicional; no suma cargo fijo ni otros cargos de la cuenta.
          </div>
          <p className="mt-auto pt-5 text-[10px] leading-5 text-[#f7eedb]/45">Valor guía precargado: $263/kWh para una referencia residencial Maule 2026. La tarifa real cambia por comuna, sector tarifario y distribuidora; por eso puedes editarla con el valor de tu boleta. <a href={CGE_TARIFF_SOURCE} target="_blank" rel="noreferrer" className="font-black text-yellow-300 underline decoration-yellow-300/35 underline-offset-4">Revisar tarifas oficiales CGE 2026</a>.</p>
        </div>
      </div>
    </section>
  );
}

function RadierPlanCard({ plan, selected, onSelect }: { plan: RadierPlan; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`grid min-w-[240px] grid-cols-[72px_1fr] gap-3 rounded-[1.45rem] p-3 text-left transition sm:min-w-0 ${selected ? 'bg-[#fff6dc] text-black shadow-[0_18px_44px_rgba(0,0,0,.22)]' : 'bg-[#fff6dc]/[0.065] text-white ring-1 ring-white/[0.06]'}`}>
      <div className="h-[72px] overflow-hidden rounded-[1rem] bg-black"><RadierPlanThumbnail reinforced={plan.id === 'reforzado'} /></div>
      <span><span className={`block text-[9px] font-black uppercase tracking-[.18em] ${selected ? 'text-amber-700' : 'text-yellow-300'}`}>Desde {money.format(plan.priceM2)}/m²</span><b className="mt-1 block text-sm leading-tight">{plan.name}</b><span className={`mt-1 block text-[10px] leading-4 ${selected ? 'text-black/58' : 'text-zinc-400'}`}>{plan.description}</span></span>
    </button>
  );
}

function PriceRows({ rows }: { rows: [string, number][] }) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-black/26 ring-1 ring-white/[0.06]">
      {rows.filter(([, value]) => value > 0).map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm odd:bg-white/[0.025]"><span className="text-zinc-400">{label}</span><b>{money.format(value)}</b></div>)}
    </div>
  );
}

function Receipt({ title, rows, neto, iva, total, note }: { title: string; rows: [string, number][]; neto: number; iva: number; total: number; note: string }) {
  return (
    <aside className="overflow-hidden rounded-[1.8rem] bg-[#f8f1df] text-black shadow-[0_24px_80px_rgba(0,0,0,.34)]">
      <div className="flex items-center justify-between bg-[#17130c] px-5 py-4 text-white"><span className="text-[10px] font-black uppercase tracking-[.24em]">Resumen referencial</span><ClipboardList className="h-5 w-5 text-yellow-300" /></div>
      <div className="p-5"><FabrickNavLogo theme="dark" /><h3 className="mt-3 text-2xl font-black tracking-[-.05em]">{title}</h3><div className="my-4 border-y border-dashed border-black/15 py-2">{rows.filter(([, value]) => value > 0).map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 py-2 text-xs"><span className="max-w-[62%] text-black/55">{label}</span><b>{money.format(value)}</b></div>)}</div><div className="flex justify-between text-xs text-black/55"><span>Neto estimado</span><b>{money.format(neto)}</b></div><div className="mt-2 flex justify-between text-xs text-black/55"><span>IVA referencial</span><b>{money.format(iva)}</b></div><div className="mt-4 rounded-[1.35rem] bg-yellow-300 p-4"><span className="text-[9px] font-black uppercase tracking-[.18em] text-black/55">Inversión aproximada</span><b className="mt-1 block text-3xl font-black tracking-[-.05em]">{money.format(total)}</b></div><p className="mt-4 text-[11px] leading-5 text-black/48">{note}</p></div>
    </aside>
  );
}

export default function PublicBudgetCalculatorClient({ kind }: { kind: Kind }) {
  const router = useRouter();
  const { products } = useCatalogProducts();
  const isAir = kind === 'aire';
  const [length, setLength] = useState(isAir ? 5 : 4);
  const [width, setWidth] = useState(isAir ? 4 : 3);
  const [height, setHeight] = useState(2.6);
  const [people, setPeople] = useState(2);
  const [watts, setWatts] = useState(350);
  const [thickness, setThickness] = useState(10);
  const [shape, setShape] = useState('rectangular');
  const [service, setService] = useState<ServiceMode>('equipo_instalacion');
  const [selectedCap, setSelectedCap] = useState<Capacity>(18000);
  const [selectedPlanId, setSelectedPlanId] = useState<RadierPlanId>('estandar');
  const [previewProduct, setPreviewProduct] = useState<AirProductOption | null>(null);
  const [temperature, setTemperature] = useState(22);
  const [dailyHours, setDailyHours] = useState(4);
  const [monthlyDays, setMonthlyDays] = useState(30);
  const [energyTariff, setEnergyTariff] = useState(ENERGY_REFERENCE_CLP_KWH);

  const airOptions = useMemo<AirProductOption[]>(() => AIR_FALLBACKS.map((fallback) => {
    const match = products.find((product) => {
      const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      const digits = text.replace(/\D/g, '');
      return /(aire|split|clima|btu)/.test(text) && digits.includes(String(fallback.cap));
    });
    return match ? { ...fallback, productId: match.id, name: match.name, price: match.price, image: match.image_url || match.img || fallback.image, details: (match.features || fallback.details).slice(0, 2), stock: match.stock } : fallback;
  }), [products]);

  const energyEstimate = useMemo(() => {
    const nominalPowerKw = AIR_INPUT_POWER_KW[selectedCap];
    const loadFactor = getTemperatureLoadFactor(temperature);
    const averagePowerKw = nominalPowerKw * loadFactor;
    const monthlyKwh = averagePowerKw * dailyHours * monthlyDays;
    return { averagePowerKw, monthlyKwh, monthlyCost: Math.round(monthlyKwh * energyTariff) };
  }, [dailyHours, energyTariff, monthlyDays, selectedCap, temperature]);

  const air = useMemo(() => {
    const area = length * width;
    const volume = area * height;
    const requiredBtu = Math.ceil(area * 600 + volume * 55 + people * 600 + watts * 3.412);
    const recommendedCap = capacities.find((capacity) => capacity >= requiredBtu) || 24000;
    const selectedProduct = airOptions.find((item) => item.cap === selectedCap) || airOptions[0];
    const equipment = service !== 'solo_instalacion' ? selectedProduct.price : 0;
    const installation = service !== 'solo_equipo' ? 195000 : 0;
    const materials = service !== 'solo_equipo' ? 75000 : 0;
    const delivery = service === 'equipo_instalacion' ? 25000 : 0;
    const rows: [string, number][] = [[selectedProduct.name, equipment], ['Instalación estándar hasta 3 m', installation], ['Kit de materiales', materials], ['Despacho coordinado', delivery]];
    const net = rows.reduce((sum, [, value]) => sum + value, 0);
    const tax = Math.round(net * 0.19);
    const total = net + tax;
    return { area, volume, requiredBtu, recommendedCap, selectedProduct, rows, net, tax, total, kwhMonth: energyEstimate.monthlyKwh, monthlyCost: energyEstimate.monthlyCost };
  }, [airOptions, energyEstimate, height, length, people, selectedCap, service, watts, width]);

  const radier = useMemo(() => {
    const factor = shape === 'l' ? 0.82 : shape === 'u' ? 0.72 : 1;
    const area = length * width * factor;
    const volume = area * (thickness / 100) * 1.08;
    const bags = Math.ceil(volume * 7.2);
    const stabilized = area * 0.07;
    const plan = RADIER_PLANS.find((item) => item.id === selectedPlanId) || RADIER_PLANS[1];
    const materials = Math.round(area * plan.materialsM2);
    const labor = Math.round(area * plan.laborM2);
    const extras = Math.round(area * plan.extrasM2);
    const transport = Math.max(45000, Math.round(area * 1500));
    const rows: [string, number][] = [['Hormigón y materiales', materials], ['Mano de obra', labor], [plan.id === 'reforzado' ? 'Malla + base reforzada' : 'Base estabilizada y terminación', extras], ['Transporte', transport]];
    const net = rows.reduce((sum, [, value]) => sum + value, 0);
    const tax = Math.round(net * 0.19);
    return { area, volume, bags, stabilized, plan, rows, net, tax, total: net + tax };
  }, [length, selectedPlanId, shape, thickness, width]);

  const total = isAir ? air.total : radier.total;
  const rows = isAir ? air.rows : radier.rows;
  const net = isAir ? air.net : radier.net;
  const tax = isAir ? air.tax : radier.tax;

  return (
    <div className="min-h-screen bg-[#070603] text-[#fff9ec]">
      <StorefrontHeader />
      <main className="relative isolate overflow-hidden px-3 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 md:px-8 md:pb-16">
        <div className="pointer-events-none absolute -left-40 top-24 -z-10 h-[28rem] w-[28rem] rounded-full bg-yellow-300/10 blur-[90px]" />
        <div className="pointer-events-none absolute -right-44 top-[48rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-[#fff2c4]/10 blur-[100px]" />
        <div className="mx-auto max-w-[1320px]">
          <button onClick={() => navigateWithTransition('/tienda', router)} className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/[0.07] px-4 py-2 text-xs font-black text-white/70"><ArrowLeft className="h-4 w-4" /> Volver a productos</button>

          <section className="overflow-hidden rounded-[2rem] bg-[#100d07]/88 shadow-[0_30px_100px_rgba(0,0,0,.34)] ring-1 ring-yellow-200/10 backdrop-blur-xl">
            <div className="grid gap-0 xl:grid-cols-[.7fr_1.3fr]">
              <header className="relative overflow-hidden p-5 sm:p-7 xl:p-9">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-yellow-300/15 blur-3xl" />
                <p className="relative text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Calculadora Fabrick · uso libre</p>
                <h1 className="relative mt-3 text-[clamp(40px,7vw,68px)] font-black leading-[.9] tracking-[-.07em]">{isAir ? 'El aire correcto para tu espacio.' : 'Tu radier, calculado con claridad.'}</h1>
                <p className="relative mt-5 max-w-xl text-sm leading-7 text-[#f7eedb]/58">{isAir ? 'Ingresa las medidas, compara capacidades y elige el equipo antes de revisar instalación y consumo.' : 'Define medidas, forma y tipo de solución. Verás materiales, capas y un rango de inversión ordenado.'}</p>
                <div className="relative mt-6 grid grid-cols-2 gap-3"><Metric label="Total aproximado" value={money.format(total)} accent icon={Sparkles} /><Metric label={isAir ? 'Superficie' : 'Área calculada'} value={`${num.format(isAir ? air.area : radier.area)} m²`} icon={Ruler} /></div>
                <div className="relative mt-4 rounded-[1.4rem] bg-black/28 p-4 text-xs leading-5 text-[#f7eedb]/52"><b className="text-yellow-200">Precio no final.</b> Es una referencia para decidir. El valor definitivo depende de visita técnica, acceso, stock, distancia y condiciones reales.</div>
              </header>

              <div className="grid gap-5 bg-black/20 p-4 sm:p-6 xl:grid-cols-[1fr_340px] xl:p-8">
                <div className="grid content-start gap-5">
                  <section>
                    <div className="mb-3 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-yellow-300 text-sm font-black text-black">1</span><div><h2 className="font-black">Medidas y condiciones</h2><p className="text-xs text-zinc-500">El cálculo cambia en tiempo real.</p></div></div>
                    {isAir ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Field label="Largo" value={length} suffix="m" onChange={setLength} /><Field label="Ancho" value={width} suffix="m" onChange={setWidth} /><Field label="Alto" value={height} suffix="m" onChange={setHeight} /><Field label="Personas" value={people} step={1} onChange={setPeople} /><Field label="Equipos eléctricos" value={watts} suffix="W" step={50} onChange={setWatts} /><label className="grid gap-2 rounded-[1.35rem] bg-[#fff6dc]/[0.07] p-3 ring-1 ring-white/[0.06]"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#f7eedb]/45">Servicio</span><select value={service} onChange={(event) => setService(event.target.value as ServiceMode)} className="min-w-0 bg-transparent text-sm font-black text-white outline-none"><option value="equipo_instalacion" className="bg-zinc-950">Equipo + instalación</option><option value="solo_equipo" className="bg-zinc-950">Solo equipo</option><option value="solo_instalacion" className="bg-zinc-950">Solo instalación</option></select></label></div> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Field label="Largo" value={length} suffix="m" onChange={setLength} /><Field label="Ancho" value={width} suffix="m" onChange={setWidth} /><Field label="Espesor" value={thickness} suffix="cm" step={1} onChange={setThickness} /><label className="grid gap-2 rounded-[1.35rem] bg-[#fff6dc]/[0.07] p-3 ring-1 ring-white/[0.06]"><span className="text-[10px] font-black uppercase tracking-[.18em] text-[#f7eedb]/45">Forma</span><select value={shape} onChange={(event) => setShape(event.target.value)} className="bg-transparent text-sm font-black text-white outline-none"><option value="rectangular" className="bg-zinc-950">Rectangular</option><option value="l" className="bg-zinc-950">Forma L</option><option value="u" className="bg-zinc-950">Forma U</option></select></label></div>}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-yellow-300 text-sm font-black text-black">2</span><div><h2 className="font-black">{isAir ? 'Elige el equipo' : 'Elige la solución'}</h2><p className="text-xs text-zinc-500">Miniatura, detalle corto y precio referencial.</p></div></div>
                    {isAir ? <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-8 sm:grid sm:grid-cols-2 sm:pr-0">{airOptions.map((item) => <AirProductCard key={item.cap} item={item} selected={selectedCap === item.cap} recommended={air.recommendedCap === item.cap} onSelect={() => setSelectedCap(item.cap)} onPreview={() => setPreviewProduct(item)} />)}</div> : <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3">{RADIER_PLANS.map((plan) => <RadierPlanCard key={plan.id} plan={plan} selected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />)}</div>}
                    {isAir && selectedCap < air.recommendedCap ? <button onClick={() => setSelectedCap(air.recommendedCap)} className="mt-3 flex w-full items-center justify-between gap-3 rounded-[1.25rem] bg-amber-400/12 p-3 text-left text-xs text-amber-100 ring-1 ring-amber-300/20"><span><b className="block">La capacidad seleccionada puede quedar corta.</b><span className="mt-0.5 block opacity-65">Tu cálculo recomienda {air.recommendedCap.toLocaleString('es-CL')} BTU.</span></span><ChevronRight className="h-5 w-5 shrink-0" /></button> : null}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-yellow-300 text-sm font-black text-black">3</span><div><h2 className="font-black">Resultado ordenado</h2><p className="text-xs text-zinc-500">Cantidades y costos separados.</p></div></div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{isAir ? <><Metric label="BTU necesarios" value={air.requiredBtu.toLocaleString('es-CL')} icon={Thermometer} /><Metric label="Equipo elegido" value={`${selectedCap.toLocaleString('es-CL')}`} icon={Snowflake} /><Metric label="Consumo mensual" value={`${num.format(air.kwhMonth)} kWh`} icon={Zap} /><Metric label="Gasto estimado" value={money.format(air.monthlyCost)} icon={Sparkles} /></> : <><Metric label="Área" value={`${num.format(radier.area)} m²`} icon={Maximize2} /><Metric label="Hormigón" value={`${num.format(radier.volume)} m³`} icon={Layers3} /><Metric label="Cemento 25 kg" value={`${radier.bags} sacos`} icon={PackageCheck} /><Metric label="Estabilizado" value={`${num.format(radier.stabilized)} m³`} icon={Layers3} /></>}</div>
                    <div className="mt-3"><PriceRows rows={rows} /></div>
                  </section>

                  <div className="rounded-[1.45rem] bg-emerald-300/[0.07] p-4 text-sm leading-6 text-emerald-100 ring-1 ring-emerald-300/15"><CheckCircle2 className="mb-2 h-5 w-5 text-emerald-300" />Este resultado es una aproximación comercial. Antes de pagar se valida técnicamente y se evita generar una orden con medidas incompletas.</div>
                  <a href="/contacto" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[1.35rem] bg-yellow-300 px-5 text-sm font-black text-black shadow-[0_14px_40px_rgba(250,204,21,.16)]"><Truck className="h-4 w-4" /> Solicitar cotización confirmada</a>
                </div>

                <Receipt title={isAir ? air.selectedProduct.name : `${radier.plan.name} · ${num.format(radier.area)} m²`} rows={rows} neto={net} iva={tax} total={total} note={isAir ? 'Equipo, instalación y materiales son referenciales. Se confirma modelo, stock, metros de tubería, punto eléctrico y despacho.' : 'El terreno, excavación, pendientes, resistencia y acceso pueden modificar materiales, mano de obra y transporte.'} />
              </div>
            </div>
          </section>

          {isAir ? <EnergyRemoteCalculator capacity={selectedCap} temperature={temperature} hours={dailyHours} days={monthlyDays} tariff={energyTariff} averagePowerKw={energyEstimate.averagePowerKw} monthlyKwh={energyEstimate.monthlyKwh} monthlyCost={energyEstimate.monthlyCost} onTemperatureChange={setTemperature} onHoursChange={setDailyHours} onDaysChange={setMonthlyDays} onTariffChange={setEnergyTariff} /> : null}

          <section className="mt-7" aria-label={isAir ? 'Demostración 3D de aire acondicionado' : 'Demostración 3D de radier'}>
            {isAir ? (
              <ThreeAirRoomViewer key={`air-${selectedCap}`} largo={length} ancho={width} alto={height} area={air.area} btu={air.requiredBtu} seleccionado={selectedCap} title="Cuarto + aire acondicionado interactivo" />
            ) : (
              <ThreeRadierViewer shape={shape === 'rectangular' ? 'rect' : shape.toUpperCase()} largo={length} ancho={width} espesor={thickness} base={10} gravillaBase={5} area={radier.area} hormigon={radier.volume} sacos={radier.bags} title={`Radier ${shape === 'rectangular' ? 'recto' : `forma ${shape.toUpperCase()}`} interactivo`} />
            )}
          </section>
        </div>
      </main>
      {previewProduct ? <AirProductDialog item={previewProduct} selected={selectedCap === previewProduct.cap} onClose={() => setPreviewProduct(null)} onSelect={() => setSelectedCap(previewProduct.cap)} /> : null}
      <StoreBottomNav />
    </div>
  );
}
