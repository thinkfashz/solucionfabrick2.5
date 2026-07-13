'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Layers3,
  Maximize2,
  PackageCheck,
  Ruler,
  Snowflake,
  Sparkles,
  Thermometer,
  Truck,
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
const AIR_PRODUCT_IMAGE = '/images/calculators/air-conditioner.svg';
const RADIER_PRODUCT_IMAGE = '/images/calculators/radier-solution.svg';
const ROOM_IMAGE = 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1600&auto=format&fit=crop';

const AIR_FALLBACKS: AirProductOption[] = [
  { cap: 9000, name: 'Split Inverter 9.000 BTU', price: 289000, image: AIR_PRODUCT_IMAGE, details: ['Hasta 18 m²', 'Frío/calor · bajo consumo'] },
  { cap: 12000, name: 'TCL SaveIN 12.000 BTU WiFi', price: 349990, image: AIR_PRODUCT_IMAGE, details: ['Hasta 24 m²', 'Inverter · control WiFi'] },
  { cap: 18000, name: 'TCL BreezeIN 18.000 BTU WiFi', price: 529990, image: AIR_PRODUCT_IMAGE, details: ['Hasta 36 m²', 'Inverter · frío/calor'] },
  { cap: 24000, name: 'Split Inverter 24.000 BTU', price: 749990, image: AIR_PRODUCT_IMAGE, details: ['Hasta 48 m²', 'Alta capacidad · inverter'] },
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

function AirProductCard({ item, selected, recommended, onSelect }: { item: AirProductOption; selected: boolean; recommended: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`group grid min-w-[230px] grid-cols-[76px_1fr] gap-3 rounded-[1.45rem] p-3 text-left transition sm:min-w-0 ${selected ? 'bg-[#fff6dc] text-black shadow-[0_18px_44px_rgba(0,0,0,.22)]' : 'bg-[#fff6dc]/[0.065] text-white ring-1 ring-white/[0.06]'}`}>
      <div className="relative h-[76px] overflow-hidden rounded-[1.05rem] bg-white"><img src={item.image} alt={item.name} className="h-full w-full object-cover" />{recommended ? <span className="absolute bottom-1 left-1 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[7px] font-black uppercase text-black">Recomendado</span> : null}</div>
      <span className="min-w-0"><span className={`block text-[9px] font-black uppercase tracking-[.18em] ${selected ? 'text-amber-700' : 'text-yellow-300'}`}>{item.cap.toLocaleString('es-CL')} BTU</span><b className="mt-1 block line-clamp-2 text-sm leading-tight">{item.name}</b><span className={`mt-2 block text-lg font-black ${selected ? 'text-black' : 'text-yellow-300'}`}>{money.format(item.price)}</span></span>
    </button>
  );
}

function RadierPlanCard({ plan, selected, onSelect }: { plan: RadierPlan; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`grid min-w-[240px] grid-cols-[72px_1fr] gap-3 rounded-[1.45rem] p-3 text-left transition sm:min-w-0 ${selected ? 'bg-[#fff6dc] text-black shadow-[0_18px_44px_rgba(0,0,0,.22)]' : 'bg-[#fff6dc]/[0.065] text-white ring-1 ring-white/[0.06]'}`}>
      <div className="h-[72px] overflow-hidden rounded-[1rem] bg-black"><img src={RADIER_PRODUCT_IMAGE} alt={plan.name} className="h-full w-full object-cover" /></div>
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

function AirViewer({ area, requiredBtu, product, temperature, setTemperature }: { area: number; requiredBtu: number; product: AirProductOption; temperature: number; setTemperature: (value: number) => void }) {
  const [view, setView] = useState<'frontal' | 'esquina' | 'lateral'>('esquina');
  return (
    <section className="mt-7 overflow-hidden rounded-[2rem] bg-[#090806] text-white shadow-[0_28px_90px_rgba(0,0,0,.42)] ring-1 ring-yellow-200/10">
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_250px] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Visor climático</p><h2 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">Cuarto + aire acondicionado</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Una lectura visual del equipo, el ambiente y la capacidad seleccionada.</p></div><div className="grid grid-cols-3 gap-2"><Metric label="Área" value={`${num.format(area)} m²`} /><Metric label="Necesita" value={`${requiredBtu.toLocaleString('es-CL')}`} /><Metric label="Equipo" value={`${product.cap.toLocaleString('es-CL')}`} accent /></div></div>
      <div className="relative mx-3 min-h-[420px] overflow-hidden rounded-[1.7rem] sm:mx-6 sm:min-h-[520px]">
        <img src={ROOM_IMAGE} alt="Habitación moderna climatizada" className={`absolute inset-0 h-full w-full object-cover transition duration-700 ${view === 'frontal' ? 'scale-100 object-center' : view === 'lateral' ? 'scale-110 object-left' : 'scale-105 object-center'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/5 to-black/25" />
        <div className="absolute left-1/2 top-8 w-[54%] max-w-[430px] -translate-x-1/2 rounded-[1.2rem] bg-gradient-to-b from-white to-zinc-300 p-3 text-black shadow-[0_18px_44px_rgba(0,0,0,.35)]"><span className="block h-1.5 rounded-full bg-zinc-400" /><div className="mt-2 flex items-center justify-between"><b className="text-[10px] uppercase tracking-[.16em] text-black/45">Inverter</b><span className="rounded bg-black px-2 py-1 text-[9px] font-black text-yellow-300">{temperature}°</span></div></div>
        <div className="absolute left-1/2 top-[7.2rem] h-48 w-[76%] max-w-[560px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(83,215,255,.52),rgba(83,215,255,.12)_38%,transparent_70%)] opacity-80" />
        <div className="absolute right-3 top-3 rounded-[1.35rem] bg-black/72 p-3 backdrop-blur-xl sm:right-5 sm:top-5"><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-full bg-cyan-400/15 text-cyan-300"><Snowflake className="h-5 w-5" /></span><div><b className="block text-2xl text-cyan-300">{temperature}°C</b><span className="text-[10px] text-zinc-400">Enfriamiento</span></div></div><input type="range" min="16" max="30" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="mt-3 w-32 accent-yellow-300" /></div>
        <div className="absolute inset-x-3 bottom-3 grid grid-cols-[72px_1fr] gap-3 rounded-[1.35rem] bg-black/74 p-3 backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:grid-cols-[92px_1fr_auto]"><img src={product.image} alt={product.name} className="h-[72px] w-[72px] rounded-xl bg-white object-cover sm:h-[82px] sm:w-[92px]" /><div className="min-w-0 self-center"><p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">Producto seleccionado</p><b className="mt-1 block line-clamp-2 text-sm sm:text-base">{product.name}</b><p className="mt-1 text-xs text-zinc-400">{product.details.join(' · ')}</p></div><strong className="col-span-2 self-center text-xl text-yellow-300 sm:col-span-1">{money.format(product.price)}</strong></div>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3 sm:justify-center sm:p-5">{(['frontal', 'esquina', 'lateral'] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`min-h-11 shrink-0 rounded-full px-5 text-xs font-black capitalize ${view === item ? 'bg-yellow-300 text-black' : 'bg-white/[0.07] text-white'}`}>{item}</button>)}</div>
    </section>
  );
}

function RadierViewer({ area, volume, bags, plan }: { area: number; volume: number; bags: number; plan: RadierPlan }) {
  const [layer, setLayer] = useState<'completo' | 'capas' | 'malla'>('capas');
  return (
    <section className="mt-7 overflow-hidden rounded-[2rem] bg-[#090806] text-white shadow-[0_28px_90px_rgba(0,0,0,.42)] ring-1 ring-yellow-200/10">
      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_250px] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Visor técnico por capas</p><h2 className="mt-2 text-3xl font-black tracking-[-.055em] sm:text-4xl">Radier, base y terreno</h2><p className="mt-2 text-sm leading-6 text-zinc-400">Visualiza qué estás calculando y cómo se compone la solución elegida.</p></div><div className="grid grid-cols-3 gap-2"><Metric label="Área" value={`${num.format(area)} m²`} /><Metric label="Hormigón" value={`${num.format(volume)} m³`} /><Metric label="Sacos" value={`${bags}`} accent /></div></div>
      <div className="relative mx-3 min-h-[390px] overflow-hidden rounded-[1.7rem] bg-[radial-gradient(circle_at_55%_18%,rgba(250,204,21,.13),transparent_22rem),linear-gradient(180deg,#17130c,#050403)] sm:mx-6 sm:min-h-[500px]">
        <div className="absolute left-1/2 top-[46%] h-40 w-[74%] max-w-[720px] -translate-x-1/2 -translate-y-1/2 transition duration-500" style={{ transform: `translate(-50%,-50%) perspective(900px) rotateX(58deg) rotateZ(${layer === 'completo' ? -18 : -24}deg)` }}>
          <div className={`absolute inset-0 rounded-[1.4rem] bg-gradient-to-br from-[#eee9df] to-[#8b8984] shadow-[0_32px_70px_rgba(0,0,0,.5)] transition ${layer === 'malla' ? 'opacity-35' : 'opacity-100'}`} />
          <div className={`absolute inset-4 grid grid-cols-8 grid-rows-5 transition ${layer === 'completo' ? 'opacity-20' : 'opacity-65'}`}>{Array.from({ length: 40 }).map((_, index) => <span key={index} className="border border-black/45" />)}</div>
          <div className={`absolute left-3 right-3 top-[92%] h-12 rounded-b-[1.2rem] bg-[#9b8d78] transition ${layer === 'malla' ? 'translate-y-9 opacity-35' : 'translate-y-2 opacity-100'}`} />
          <div className={`absolute left-7 right-7 top-[112%] h-11 rounded-b-[1rem] bg-[#6f4827] transition ${layer === 'capas' ? 'translate-y-7 opacity-100' : 'translate-y-1 opacity-70'}`} />
        </div>
        <div className="absolute left-4 top-4 rounded-[1.2rem] bg-black/62 p-3 backdrop-blur-xl"><p className="text-[9px] font-black uppercase tracking-[.2em] text-yellow-300">Solución elegida</p><b className="mt-1 block text-sm">{plan.name}</b><p className="mt-1 text-xs text-zinc-400">Desde {money.format(plan.priceM2)}/m²</p></div>
        <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-2 rounded-[1.35rem] bg-black/70 p-3 text-center text-[10px] backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:text-xs"><span><i className="mx-auto mb-1 block h-2 w-10 rounded-full bg-zinc-300" />Hormigón</span><span><i className="mx-auto mb-1 block h-2 w-10 rounded-full bg-[#9b8d78]" />Base</span><span><i className="mx-auto mb-1 block h-2 w-10 rounded-full bg-[#6f4827]" />Terreno</span></div>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3 sm:justify-center sm:p-5">{(['completo', 'capas', 'malla'] as const).map((item) => <button key={item} onClick={() => setLayer(item)} className={`min-h-11 shrink-0 rounded-full px-5 text-xs font-black capitalize ${layer === item ? 'bg-yellow-300 text-black' : 'bg-white/[0.07] text-white'}`}>{item === 'malla' ? 'Ver malla' : item}</button>)}</div>
    </section>
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
  const [temperature, setTemperature] = useState(22);

  const airOptions = useMemo<AirProductOption[]>(() => AIR_FALLBACKS.map((fallback) => {
    const match = products.find((product) => {
      const text = `${product.name} ${product.category} ${product.description}`.toLowerCase();
      const digits = text.replace(/\D/g, '');
      return /(aire|split|clima|btu)/.test(text) && digits.includes(String(fallback.cap));
    });
    return match ? { ...fallback, productId: match.id, name: match.name, price: match.price, image: match.image_url || match.img || fallback.image, details: (match.features || fallback.details).slice(0, 2), stock: match.stock } : fallback;
  }), [products]);

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
    const kwhMonth = (selectedCap === 9000 ? 0.82 : selectedCap === 12000 ? 1.08 : selectedCap === 18000 ? 1.58 : 2.2) * 6 * 30;
    return { area, volume, requiredBtu, recommendedCap, selectedProduct, rows, net, tax, total, kwhMonth, monthlyCost: Math.round(kwhMonth * 210 * 0.72) };
  }, [airOptions, height, length, people, selectedCap, service, watts, width]);

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
                    {isAir ? <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-2">{airOptions.map((item) => <AirProductCard key={item.cap} item={item} selected={selectedCap === item.cap} recommended={air.recommendedCap === item.cap} onSelect={() => setSelectedCap(item.cap)} />)}</div> : <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3">{RADIER_PLANS.map((plan) => <RadierPlanCard key={plan.id} plan={plan} selected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />)}</div>}
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

          {isAir ? <AirViewer area={air.area} requiredBtu={air.requiredBtu} product={air.selectedProduct} temperature={temperature} setTemperature={setTemperature} /> : <RadierViewer area={radier.area} volume={radier.volume} bags={radier.bags} plan={radier.plan} />}
        </div>
      </main>
      <StoreBottomNav />
    </div>
  );
}
