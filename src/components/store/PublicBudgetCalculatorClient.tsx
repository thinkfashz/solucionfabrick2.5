'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
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

function AirProductCard({ item, selected, recommended, onSelect }: { item: AirProductOption; selected: boolean; recommended: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className={`group grid min-w-[230px] grid-cols-[76px_1fr] gap-3 rounded-[1.45rem] p-3 text-left transition sm:min-w-0 ${selected ? 'bg-[#fff6dc] text-black shadow-[0_18px_44px_rgba(0,0,0,.22)]' : 'bg-[#fff6dc]/[0.065] text-white ring-1 ring-white/[0.06]'}`}>
      <div className="relative h-[76px] overflow-hidden rounded-[1.05rem] bg-white"><AirProductThumbnail item={item} />{recommended ? <span className="absolute bottom-1 left-1 rounded-full bg-yellow-300 px-1.5 py-0.5 text-[7px] font-black uppercase text-black">Recomendado</span> : null}</div>
      <span className="min-w-0"><span className={`block text-[9px] font-black uppercase tracking-[.18em] ${selected ? 'text-amber-700' : 'text-yellow-300'}`}>{item.cap.toLocaleString('es-CL')} BTU</span><b className="mt-1 block line-clamp-2 text-sm leading-tight">{item.name}</b><span className={`mt-2 block text-lg font-black ${selected ? 'text-black' : 'text-yellow-300'}`}>{money.format(item.price)}</span></span>
    </button>
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

          <section className="mt-7" aria-label={isAir ? 'Demostración 3D de aire acondicionado' : 'Demostración 3D de radier'}>
            {isAir ? (
              <ThreeAirRoomViewer key={`air-${selectedCap}`} largo={length} ancho={width} alto={height} area={air.area} btu={air.requiredBtu} seleccionado={selectedCap} title="Cuarto + aire acondicionado interactivo" />
            ) : (
              <ThreeRadierViewer shape={shape === 'rectangular' ? 'rect' : shape.toUpperCase()} largo={length} ancho={width} espesor={thickness} base={10} gravillaBase={5} area={radier.area} hormigon={radier.volume} sacos={radier.bags} title={`Radier ${shape === 'rectangular' ? 'recto' : `forma ${shape.toUpperCase()}`} interactivo`} />
            )}
          </section>
        </div>
      </main>
      <StoreBottomNav />
    </div>
  );
}
