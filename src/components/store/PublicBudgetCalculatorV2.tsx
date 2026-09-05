'use client';

import { useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Box,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Fan,
  Layers3,
  Maximize2,
  Minus,
  PackageCheck,
  Plus,
  Ruler,
  Snowflake,
  Sparkles,
  Sun,
  Thermometer,
  Timer,
  Waves,
  Zap,
} from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { navigateWithTransition } from '@/lib/routeTransition';

type ToolKind = 'aire' | 'radier';
type Capacity = 9000 | 12000 | 18000 | 24000;
type AirService = 'equipo_instalacion' | 'solo_equipo' | 'solo_instalacion';
type RadierShape = 'rectangular' | 'l' | 'u' | 't' | 'h' | 'i';
type RadierPlanId = 'materiales' | 'estandar' | 'reforzado';

type AirOption = {
  cap: Capacity;
  name: string;
  price: number;
  coverage: string;
  powerKw: number;
  image?: string;
  productId?: string;
};

type RadierPlan = {
  id: RadierPlanId;
  name: string;
  label: string;
  description: string;
  materialsM2: number;
  laborM2: number;
  extrasM2: number;
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const ENERGY_REFERENCE = 263;

const AIR_OPTIONS: AirOption[] = [
  { cap: 9000, name: 'Split Inverter 9.000 BTU', price: 289000, coverage: 'Hasta 18 m² aprox.', powerKw: .82 },
  { cap: 12000, name: 'Split Inverter 12.000 BTU', price: 349990, coverage: 'Hasta 24 m² aprox.', powerKw: 1.08 },
  { cap: 18000, name: 'Split Inverter 18.000 BTU', price: 529990, coverage: 'Hasta 36 m² aprox.', powerKw: 1.58 },
  { cap: 24000, name: 'Split Inverter 24.000 BTU', price: 749990, coverage: 'Hasta 48 m² aprox.', powerKw: 2.2 },
];

const RADIER_PLANS: RadierPlan[] = [
  { id: 'materiales', name: 'Kit de materiales', label: 'Solo suministro', description: 'Base para ejecutar con mano de obra propia.', materialsM2: 29000, laborM2: 0, extrasM2: 10000 },
  { id: 'estandar', name: 'Radier estándar', label: 'Recomendado', description: 'Preparación, hormigón y terminación para uso residencial.', materialsM2: 35000, laborM2: 27000, extrasM2: 10000 },
  { id: 'reforzado', name: 'Radier reforzado', label: 'Mayor exigencia', description: 'Base y refuerzo adicional para cargas o condiciones especiales.', materialsM2: 43000, laborM2: 33000, extrasM2: 20000 },
];

const SHAPES: Array<{ id: RadierShape; label: string; viewer: string; areaFactor: number; perimeterFactor: number }> = [
  { id: 'rectangular', label: 'Recto', viewer: 'rect', areaFactor: 1, perimeterFactor: 1 },
  { id: 'l', label: 'Forma L', viewer: 'L', areaFactor: .82, perimeterFactor: 1.16 },
  { id: 'u', label: 'Forma U', viewer: 'U', areaFactor: .72, perimeterFactor: 1.34 },
  { id: 't', label: 'Forma T', viewer: 'T', areaFactor: .64, perimeterFactor: 1.3 },
  { id: 'h', label: 'Forma H', viewer: 'H', areaFactor: .68, perimeterFactor: 1.42 },
  { id: 'i', label: 'Forma I', viewer: 'I', areaFactor: .58, perimeterFactor: 1.38 },
];

const ThreeAirRoomViewer = dynamic(() => import('@/components/presupuestos/ThreeAirRoomViewer'), {
  ssr: false,
  loading: () => <ViewerLoading label="Preparando habitación 3D" />,
});

const ThreeRadierViewer = dynamic(() => import('@/components/presupuestos/ThreeRadierViewer'), {
  ssr: false,
  loading: () => <ViewerLoading label="Preparando radier 3D" />,
});

function ViewerLoading({ label }: { label: string }) {
  return <div className="grid min-h-[420px] place-items-center rounded-[1.8rem] border border-white/[.07] bg-[#111214] text-center text-white"><div><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-[#F5871F]/20 border-t-[#F5871F]" /><b className="mt-4 block text-sm">{label}</b><span className="mt-1 block text-xs text-white/38">Cargando controles interactivos…</span></div></div>;
}

function NumberField({ label, value, suffix, step = .1, onChange }: { label: string; value: number; suffix?: string; step?: number; onChange: (value: number) => void }) {
  return <label className="grid gap-2 rounded-[1.15rem] border border-black/[.07] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(30,20,12,.035)] focus-within:border-[#D77A2D]/45"><span className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-[.14em] text-black/40"><span>{label}</span>{suffix ? <span>{suffix}</span> : null}</span><input type="number" min="0" step={step} value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="min-w-0 bg-transparent text-xl font-black tracking-[-.03em] outline-none" /></label>;
}

function ResultMetric({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-[1.2rem] p-4 ${accent ? 'bg-[#F5871F] text-[#111214]' : 'border border-white/[.07] bg-white/[.035] text-white'}`}><div className="flex items-center justify-between gap-2"><span className={`text-[8px] font-black uppercase tracking-[.14em] ${accent ? 'text-black/50' : 'text-white/35'}`}>{label}</span><span className={accent ? 'text-black/55' : 'text-[#E6B56F]'}>{icon}</span></div><b className="mt-2 block text-xl tracking-[-.04em] sm:text-2xl">{value}</b></div>;
}

function StepTitle({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex items-start gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#111214] text-[10px] font-black text-[#E6B56F]">{number}</span><div><h2 className="text-base font-black tracking-[-.02em]">{title}</h2><p className="mt-1 text-[11px] leading-5 text-black/42">{text}</p></div></div>;
}

function ToolSwitcher({ current, onNav }: { current: ToolKind; onNav: (href: string) => void }) {
  return <div className="grid gap-2 rounded-[1.35rem] border border-black/[.07] bg-[#EEE7DD] p-2 sm:grid-cols-3"><button onClick={() => onNav('/herramientas/aire-acondicionado')} className={`flex min-h-12 items-center gap-3 rounded-[1rem] px-4 text-left transition ${current === 'aire' ? 'bg-[#111214] text-white shadow-sm' : 'text-black/58 hover:bg-white/60'}`}><Snowflake className={`h-4 w-4 ${current === 'aire' ? 'text-[#E6B56F]' : 'text-[#9A5B22]'}`} /><span><b className="block text-xs">Aire acondicionado</b><small className="text-[9px] opacity-55">BTU · consumo · visor</small></span></button><button onClick={() => onNav('/herramientas/radier')} className={`flex min-h-12 items-center gap-3 rounded-[1rem] px-4 text-left transition ${current === 'radier' ? 'bg-[#111214] text-white shadow-sm' : 'text-black/58 hover:bg-white/60'}`}><Ruler className={`h-4 w-4 ${current === 'radier' ? 'text-[#E6B56F]' : 'text-[#9A5B22]'}`} /><span><b className="block text-xs">Radier</b><small className="text-[9px] opacity-55">m² · ml · volumen · visor</small></span></button><button onClick={() => onNav('/presupuesto')} className="flex min-h-12 items-center gap-3 rounded-[1rem] px-4 text-left text-black/58 transition hover:bg-white/60"><ClipboardList className="h-4 w-4 text-[#9A5B22]" /><span><b className="block text-xs">Presupuesto</b><small className="text-[9px] opacity-55">Agrupar varias partidas</small></span></button></div>;
}

function shapeViewer(shape: RadierShape) {
  return SHAPES.find((item) => item.id === shape) || SHAPES[0];
}

export default function PublicBudgetCalculatorV2({ kind }: { kind: ToolKind }) {
  const router = useRouter();
  const { products } = useCatalogProducts();
  const isAir = kind === 'aire';
  const nav = (href: string) => navigateWithTransition(href, router);

  const [length, setLength] = useState(isAir ? 5 : 6);
  const [width, setWidth] = useState(isAir ? 4 : 4);
  const [height, setHeight] = useState(2.6);
  const [people, setPeople] = useState(2);
  const [watts, setWatts] = useState(350);
  const [sunFactor, setSunFactor] = useState(1);
  const [insulationFactor, setInsulationFactor] = useState(1);
  const [selectedCap, setSelectedCap] = useState<Capacity>(18000);
  const [service, setService] = useState<AirService>('equipo_instalacion');
  const [temperature, setTemperature] = useState(22);
  const [dailyHours, setDailyHours] = useState(4);
  const [monthlyDays, setMonthlyDays] = useState(30);
  const [tariff, setTariff] = useState(ENERGY_REFERENCE);

  const [shape, setShape] = useState<RadierShape>('rectangular');
  const [thickness, setThickness] = useState(10);
  const [baseDepth, setBaseDepth] = useState(10);
  const [gravelDepth, setGravelDepth] = useState(5);
  const [radierPlanId, setRadierPlanId] = useState<RadierPlanId>('estandar');

  const airOptions = useMemo<AirOption[]>(() => AIR_OPTIONS.map((fallback) => {
    const match = products.find((product) => {
      const haystack = `${product.name} ${product.category || ''} ${product.description || ''}`.toLowerCase();
      const digits = haystack.replace(/\D/g, '');
      return /(aire|split|clima|btu)/.test(haystack) && digits.includes(String(fallback.cap));
    });
    if (!match) return fallback;
    return { ...fallback, name: match.name, price: Number(match.price || fallback.price), image: match.image_url || match.img || undefined, productId: String(match.id) };
  }), [products]);

  const air = useMemo(() => {
    const area = length * width;
    const volume = area * height;
    const baseLoad = area * 600 + volume * 55 + people * 600 + watts * 3.412;
    const requiredBtu = Math.ceil(baseLoad * sunFactor * insulationFactor);
    const recommendedCap = (AIR_OPTIONS.find((item) => item.cap >= requiredBtu)?.cap || 24000) as Capacity;
    const option = airOptions.find((item) => item.cap === selectedCap) || airOptions[0];
    const equipment = service === 'solo_instalacion' ? 0 : option.price;
    const installation = service === 'solo_equipo' ? 0 : 195000;
    const installationKit = service === 'solo_equipo' ? 0 : 75000;
    const transport = service === 'equipo_instalacion' ? 25000 : 0;
    const subtotal = equipment + installation + installationKit + transport;
    const tax = Math.round(subtotal * .19);
    const loadFactor = temperature <= 18 ? .82 : temperature <= 20 ? .68 : temperature <= 22 ? .56 : temperature <= 24 ? .46 : .38;
    const averagePower = option.powerKw * loadFactor;
    const monthlyKwh = averagePower * dailyHours * monthlyDays;
    const monthlyCost = Math.round(monthlyKwh * tariff);
    return { area, volume, requiredBtu, recommendedCap, option, equipment, installation, installationKit, transport, subtotal, tax, total: subtotal + tax, averagePower, monthlyKwh, monthlyCost, loadFactor };
  }, [airOptions, dailyHours, height, insulationFactor, length, monthlyDays, people, selectedCap, service, sunFactor, tariff, temperature, watts, width]);

  const radier = useMemo(() => {
    const shapeInfo = shapeViewer(shape);
    const area = length * width * shapeInfo.areaFactor;
    const perimeter = 2 * (length + width) * shapeInfo.perimeterFactor;
    const concrete = area * (thickness / 100) * 1.08;
    const stabilized = area * (baseDepth / 100);
    const gravel = area * (gravelDepth / 100);
    const cementBags25 = Math.ceil(concrete * 7.2);
    const meshSheets = Math.ceil(area / 13.5);
    const plan = RADIER_PLANS.find((item) => item.id === radierPlanId) || RADIER_PLANS[1];
    const materials = Math.round(area * plan.materialsM2);
    const labor = Math.round(area * plan.laborM2);
    const extras = Math.round(area * plan.extrasM2);
    const transport = Math.max(45000, Math.round(area * 1500));
    const subtotal = materials + labor + extras + transport;
    const tax = Math.round(subtotal * .19);
    return { shapeInfo, area, perimeter, concrete, stabilized, gravel, cementBags25, meshSheets, plan, materials, labor, extras, transport, subtotal, tax, total: subtotal + tax };
  }, [baseDepth, gravelDepth, length, radierPlanId, shape, thickness, width]);

  return <div className="min-h-screen bg-[#F6F1E8] text-[#111214]">
    <StorefrontHeader />
    <main className="pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-16">
      <section className="bg-[#0E0E10] px-4 pb-9 pt-7 text-[#FFF9EE] sm:px-6 sm:pb-12 lg:px-8">
        <div className="mx-auto max-w-[1320px]">
          <button onClick={() => nav('/tienda')} className="text-[9px] font-black uppercase tracking-[.16em] text-white/35 transition hover:text-white">← Volver a tienda</button>
          <div className="mt-5 grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:items-end">
            <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F5871F]">Herramienta Fabrick · uso libre</p><h1 className="mt-3 max-w-[11ch] text-[clamp(3rem,8vw,6rem)] font-black leading-[.9] tracking-[-.066em]">{isAir ? 'Calcula los BTU antes de elegir el equipo.' : 'Mide el radier antes de comprar materiales.'}</h1></div>
            <div className="lg:pb-1"><p className="max-w-2xl text-sm leading-7 text-white/52 sm:text-base">{isAir ? 'Ingresa medidas reales, ajusta condiciones del espacio, compara capacidades y revisa el consumo mensual antes de cotizar.' : 'Define geometría, largo, ancho y espesores. Verás m², metros lineales de perímetro, capas, volumen y una referencia económica.'}</p><div className="mt-5 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">{isAir ? <><ResultMetric label="Superficie" value={`${num.format(air.area)} m²`} icon={<Maximize2 className="h-4 w-4" />} /><ResultMetric label="BTU calculados" value={integer.format(air.requiredBtu)} icon={<Thermometer className="h-4 w-4" />} /><ResultMetric label="Recomendado" value={`${integer.format(air.recommendedCap)} BTU`} icon={<Snowflake className="h-4 w-4" />} accent /><ResultMetric label="Consumo mes" value={money.format(air.monthlyCost)} icon={<Zap className="h-4 w-4" />} /></> : <><ResultMetric label="Área" value={`${num.format(radier.area)} m²`} icon={<Maximize2 className="h-4 w-4" />} /><ResultMetric label="Perímetro" value={`${num.format(radier.perimeter)} ml`} icon={<Ruler className="h-4 w-4" />} /><ResultMetric label="Hormigón" value={`${num.format(radier.concrete)} m³`} icon={<Layers3 className="h-4 w-4" />} accent /><ResultMetric label="Sacos 25 kg" value={integer.format(radier.cementBags25)} icon={<PackageCheck className="h-4 w-4" />} /></>}</div></div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8"><ToolSwitcher current={kind} onNav={nav} /></section>

      <section className="mx-auto grid max-w-[1320px] gap-5 px-4 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-5">
          <article className="rounded-[1.8rem] border border-black/[.07] bg-[#FFF9EE] p-5 shadow-[0_18px_55px_rgba(42,29,17,.05)] sm:p-7">
            <StepTitle number="01" title={isAir ? 'Mide el espacio' : 'Define la geometría'} text={isAir ? 'Las medidas alimentan el cálculo en tiempo real.' : 'Selecciona la forma general y luego ingresa las dimensiones reales.'} />
            {isAir ? <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3"><NumberField label="Largo" value={length} suffix="m" onChange={setLength} /><NumberField label="Ancho" value={width} suffix="m" onChange={setWidth} /><NumberField label="Alto" value={height} suffix="m" onChange={setHeight} /><NumberField label="Personas" value={people} step={1} onChange={setPeople} /><NumberField label="Carga eléctrica" value={watts} suffix="W" step={50} onChange={setWatts} /><label className="grid gap-2 rounded-[1.15rem] border border-black/[.07] bg-white px-3.5 py-3"><span className="text-[8px] font-black uppercase tracking-[.14em] text-black/40">Servicio</span><select value={service} onChange={(event) => setService(event.target.value as AirService)} className="bg-transparent text-sm font-black outline-none"><option value="equipo_instalacion">Equipo + instalación</option><option value="solo_equipo">Solo equipo</option><option value="solo_instalacion">Solo instalación</option></select></label></div> : <><div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">{SHAPES.map((item) => <button key={item.id} onClick={() => setShape(item.id)} className={`rounded-[1rem] border px-3 py-3 text-xs font-black transition ${shape === item.id ? 'border-[#111214] bg-[#111214] text-white' : 'border-black/[.07] bg-white text-black/50 hover:border-[#D77A2D]/35'}`}>{item.label}</button>)}</div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"><NumberField label="Largo" value={length} suffix="m" onChange={setLength} /><NumberField label="Ancho" value={width} suffix="m" onChange={setWidth} /><NumberField label="Hormigón" value={thickness} suffix="cm" step={1} onChange={setThickness} /><NumberField label="Estabilizado" value={baseDepth} suffix="cm" step={1} onChange={setBaseDepth} /><NumberField label="Gravilla" value={gravelDepth} suffix="cm" step={1} onChange={setGravelDepth} /></div></>}
          </article>

          {isAir ? <article className="rounded-[1.8rem] border border-black/[.07] bg-[#FFF9EE] p-5 shadow-[0_18px_55px_rgba(42,29,17,.05)] sm:p-7"><StepTitle number="02" title="Ajusta las condiciones" text="Sol directo y aislación pueden cambiar la carga térmica necesaria." /><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="rounded-[1.2rem] bg-[#EEE7DD] p-4"><span className="flex items-center justify-between gap-3 text-xs font-black"><span className="inline-flex items-center gap-2"><Sun className="h-4 w-4 text-[#B96F00]" /> Exposición solar</span><b>{sunFactor === .92 ? 'Baja' : sunFactor === 1 ? 'Media' : 'Alta'}</b></span><input className="mt-4 w-full accent-[#F5871F]" type="range" min="0.92" max="1.12" step="0.1" value={sunFactor} onChange={(event) => setSunFactor(Number(event.target.value))} /></label><label className="rounded-[1.2rem] bg-[#EEE7DD] p-4"><span className="flex items-center justify-between gap-3 text-xs font-black"><span className="inline-flex items-center gap-2"><Waves className="h-4 w-4 text-[#B96F00]" /> Aislación</span><b>{insulationFactor <= .92 ? 'Buena' : insulationFactor === 1 ? 'Media' : 'Baja'}</b></span><input className="mt-4 w-full accent-[#F5871F]" type="range" min="0.9" max="1.15" step="0.05" value={insulationFactor} onChange={(event) => setInsulationFactor(Number(event.target.value))} /></label></div></article> : null}

          <article className="rounded-[1.8rem] border border-black/[.07] bg-[#FFF9EE] p-5 shadow-[0_18px_55px_rgba(42,29,17,.05)] sm:p-7">
            <StepTitle number={isAir ? '03' : '02'} title={isAir ? 'Compara capacidades' : 'Elige el tipo de radier'} text={isAir ? 'La calculadora marca la capacidad mínima recomendada para tus datos.' : 'El tipo cambia materiales, mano de obra y nivel de refuerzo.'} />
            {isAir ? <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{airOptions.map((item) => { const selected = item.cap === selectedCap; const recommended = item.cap === air.recommendedCap; return <button key={item.cap} onClick={() => setSelectedCap(item.cap)} className={`overflow-hidden rounded-[1.25rem] border text-left transition ${selected ? 'border-[#111214] bg-[#111214] text-white shadow-lg' : 'border-black/[.07] bg-white hover:border-[#D77A2D]/35'}`}><div className="relative grid h-28 place-items-center bg-[#EEE7DD]">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-contain p-3" /> : <div className="relative h-12 w-[78%] rounded-[.65rem] bg-white shadow-[0_8px_18px_rgba(0,0,0,.18)]"><span className="absolute inset-x-2 bottom-1.5 h-px bg-black/15" /></div>}{recommended ? <span className="absolute left-2 top-2 rounded-full bg-[#F5871F] px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] text-black">Recomendado</span> : null}</div><div className="p-3"><p className={`text-[8px] font-black uppercase tracking-[.14em] ${selected ? 'text-[#E6B56F]' : 'text-[#9A5B22]'}`}>{integer.format(item.cap)} BTU</p><h3 className="mt-1 line-clamp-2 min-h-8 text-xs font-black leading-4">{item.name}</h3><p className={`mt-2 text-[10px] ${selected ? 'text-white/45' : 'text-black/40'}`}>{item.coverage}</p><b className="mt-3 block text-lg tracking-[-.03em]">{money.format(item.price)}</b></div></button>; })}</div> : <div className="mt-5 grid gap-2 sm:grid-cols-3">{RADIER_PLANS.map((plan) => { const selected = radierPlanId === plan.id; return <button key={plan.id} onClick={() => setRadierPlanId(plan.id)} className={`rounded-[1.25rem] border p-4 text-left transition ${selected ? 'border-[#111214] bg-[#111214] text-white shadow-lg' : 'border-black/[.07] bg-white hover:border-[#D77A2D]/35'}`}><span className={`text-[8px] font-black uppercase tracking-[.14em] ${selected ? 'text-[#E6B56F]' : 'text-[#9A5B22]'}`}>{plan.label}</span><h3 className="mt-2 text-base font-black">{plan.name}</h3><p className={`mt-2 text-[11px] leading-5 ${selected ? 'text-white/45' : 'text-black/42'}`}>{plan.description}</p></button>; })}</div>}
            {isAir && selectedCap < air.recommendedCap ? <button onClick={() => setSelectedCap(air.recommendedCap)} className="mt-4 flex w-full items-center justify-between gap-3 rounded-[1.2rem] bg-[#F5871F]/12 p-4 text-left ring-1 ring-[#F5871F]/20"><span><b className="block text-sm">La capacidad elegida puede quedar corta.</b><span className="mt-1 block text-[11px] text-black/45">Cambiar a {integer.format(air.recommendedCap)} BTU.</span></span><ChevronRight className="h-5 w-5" /></button> : null}
          </article>

          <article className="overflow-hidden rounded-[1.8rem] bg-[#111214] text-white shadow-[0_24px_70px_rgba(0,0,0,.16)]">
            <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[.7fr_1.3fr]">
              <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#E6B56F]">Resultado técnico</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em]">{isAir ? `${integer.format(air.requiredBtu)} BTU calculados` : `${num.format(radier.area)} m² de radier`}</h2><p className="mt-3 text-xs leading-6 text-white/45">{isAir ? `Volumen ${num.format(air.volume)} m³ · equipo seleccionado ${integer.format(selectedCap)} BTU.` : `${num.format(radier.perimeter)} metros lineales de perímetro · ${num.format(radier.concrete)} m³ de hormigón.`}</p></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{isAir ? <><ResultMetric label="Área" value={`${num.format(air.area)} m²`} icon={<Maximize2 className="h-4 w-4" />} /><ResultMetric label="Potencia media" value={`${air.averagePower.toFixed(2)} kW`} icon={<Fan className="h-4 w-4" />} /><ResultMetric label="Energía mes" value={`${num.format(air.monthlyKwh)} kWh`} icon={<Zap className="h-4 w-4" />} /><ResultMetric label="Costo energía" value={money.format(air.monthlyCost)} icon={<CircleDollarSign className="h-4 w-4" />} accent /></> : <><ResultMetric label="Perímetro" value={`${num.format(radier.perimeter)} ml`} icon={<Ruler className="h-4 w-4" />} /><ResultMetric label="Estabilizado" value={`${num.format(radier.stabilized)} m³`} icon={<Layers3 className="h-4 w-4" />} /><ResultMetric label="Mallas aprox." value={`${integer.format(radier.meshSheets)} un.`} icon={<Box className="h-4 w-4" />} /><ResultMetric label="Hormigón" value={`${num.format(radier.concrete)} m³`} icon={<Layers3 className="h-4 w-4" />} accent /></>}</div>
            </div>
          </article>

          {isAir ? <article className="rounded-[1.8rem] border border-black/[.07] bg-[#EEE7DD] p-5 sm:p-7"><div className="grid gap-6 lg:grid-cols-[300px_1fr]"><div className="rounded-[2rem] bg-[#F8F3EB] p-4 shadow-[0_16px_45px_rgba(30,20,12,.08)]"><div className="flex items-center justify-between"><span className="text-[8px] font-black uppercase tracking-[.16em] text-black/35">Control de consumo</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#111214] text-[#E6B56F]"><Fan className="h-4 w-4" /></span></div><div className="mt-4 rounded-[1.5rem] bg-[#071018] p-5 text-cyan-300"><div className="flex items-center justify-between"><Snowflake className="h-5 w-5" /><span className="text-[8px] font-black uppercase tracking-[.14em] text-cyan-100/50">Cool · Auto</span></div><div className="mt-2 text-center font-mono"><b className="text-6xl tracking-[-.08em]">{temperature}</b><span className="ml-1 align-top text-xl">°C</span></div><p className="mt-3 text-center text-[9px] text-cyan-100/45">{integer.format(selectedCap)} BTU · {air.averagePower.toFixed(2)} kW prom.</p></div><div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2"><button onClick={() => setTemperature(Math.max(16, temperature - 1))} className="grid h-11 place-items-center rounded-full bg-black/7"><Minus className="h-4 w-4" /></button><span className="text-[8px] font-black uppercase tracking-[.12em] text-black/38">Temp.</span><button onClick={() => setTemperature(Math.min(30, temperature + 1))} className="grid h-11 place-items-center rounded-full bg-[#111214] text-white"><Plus className="h-4 w-4" /></button></div></div><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9A5B22]">Simulador de consumo</p><h2 className="mt-2 max-w-xl text-3xl font-black tracking-[-.05em]">Ajusta el uso antes de estimar la cuenta.</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><RangeControl icon={<Timer className="h-4 w-4" />} label="Horas al día" value={`${dailyHours} h`} min={1} max={16} step={1} number={dailyHours} onChange={setDailyHours} /><RangeControl icon={<Calculator className="h-4 w-4" />} label="Días al mes" value={`${monthlyDays}`} min={1} max={31} step={1} number={monthlyDays} onChange={setMonthlyDays} /><NumberField label="Tarifa energía" value={tariff} suffix="$/kWh" step={1} onChange={setTariff} /></div><div className="mt-5 rounded-[1.35rem] bg-[#111214] p-5 text-white"><p className="text-[8px] font-black uppercase tracking-[.14em] text-white/35">Costo adicional aproximado</p><b className="mt-2 block text-4xl tracking-[-.05em] text-[#E6B56F]">{money.format(air.monthlyCost)} / mes</b><p className="mt-2 text-[10px] leading-5 text-white/38">Estimación energética; no suma cargos fijos ni otros conceptos de la cuenta.</p></div></div></div></article> : null}

          <article className="rounded-[1.8rem] border border-black/[.07] bg-[#FFF9EE] p-4 sm:p-6"><div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9A5B22]">Visor interactivo</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em]">{isAir ? 'Habitação + equipo en escala visual' : `Radier ${radier.shapeInfo.label} por capas`}</h2></div><p className="max-w-md text-[11px] leading-5 text-black/42">Arrastra para girar, usa zoom y revisa cómo cambian las proporciones con tus medidas.</p></div>{isAir ? <ThreeAirRoomViewer key={`air-v2-${selectedCap}`} largo={length} ancho={width} alto={height} area={air.area} btu={air.requiredBtu} seleccionado={selectedCap} title="Espacio climatizado interactivo" /> : <ThreeRadierViewer shape={radier.shapeInfo.viewer} largo={length} ancho={width} espesor={thickness} base={baseDepth} gravillaBase={gravelDepth} area={radier.area} hormigon={radier.concrete} sacos={radier.cementBags25} title={`Radier ${radier.shapeInfo.label} · capas y volumen`} />}</article>
        </div>

        <aside className="h-fit rounded-[1.8rem] bg-[#111214] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,.16)] lg:sticky lg:top-24 sm:p-6"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#E6B56F]">Resumen de referencia</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">{isAir ? air.option.name : radier.plan.name}</h2><div className="mt-5 space-y-2 border-y border-white/[.07] py-4">{isAir ? <><SummaryRow label="Equipo" value={air.equipment} /><SummaryRow label="Instalación" value={air.installation} /><SummaryRow label="Kit instalación" value={air.installationKit} /><SummaryRow label="Despacho" value={air.transport} /></> : <><SummaryRow label="Materiales" value={radier.materials} /><SummaryRow label="Mano de obra" value={radier.labor} /><SummaryRow label="Base / refuerzo" value={radier.extras} /><SummaryRow label="Transporte" value={radier.transport} /></>}</div><div className="mt-4 flex items-center justify-between text-xs text-white/40"><span>Neto estimado</span><b className="text-white">{money.format(isAir ? air.subtotal : radier.subtotal)}</b></div><div className="mt-2 flex items-center justify-between text-xs text-white/40"><span>IVA referencial</span><b className="text-white">{money.format(isAir ? air.tax : radier.tax)}</b></div><div className="mt-5 rounded-[1.35rem] bg-[#F5871F] p-5 text-[#111214]"><span className="text-[8px] font-black uppercase tracking-[.14em] text-black/48">Total aproximado</span><b className="mt-1 block text-4xl tracking-[-.055em]">{money.format(isAir ? air.total : radier.total)}</b></div><p className="mt-4 text-[10px] leading-5 text-white/35">Referencia comercial, no cotización final. Se valida acceso, terreno, stock, distancias y condición técnica antes de ejecutar.</p><button onClick={() => nav(isAir ? '/presupuesto?servicio=aire-acondicionado' : '/presupuesto?servicio=radier')} className="mt-5 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[1.2rem] bg-[#FFF9EE] px-5 text-xs font-black text-[#111214] transition hover:bg-[#E6B56F]">Añadir al presupuesto <ArrowRight className="h-4 w-4" /></button><button onClick={() => nav('/tienda')} className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-[1.2rem] border border-white/[.08] px-5 text-xs font-black text-white/65 transition hover:bg-white/[.05]">Volver a la tienda</button></aside>
      </section>
    </main>
    <StoreBottomNav />
  </div>;
}

function RangeControl({ icon, label, value, min, max, step, number, onChange }: { icon: ReactNode; label: string; value: string; min: number; max: number; step: number; number: number; onChange: (value: number) => void }) {
  return <label className="rounded-[1.15rem] border border-black/[.07] bg-white p-4"><span className="flex items-center justify-between gap-2 text-[9px] font-black"><span className="inline-flex items-center gap-2 text-black/45">{icon}{label}</span><b>{value}</b></span><input className="mt-4 w-full accent-[#F5871F]" type="range" min={min} max={max} step={step} value={number} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null;
  return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-white/42">{label}</span><b>{money.format(value)}</b></div>;
}
