'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, ArrowLeft, BadgeCheck, BedDouble, Box, BriefcaseBusiness, ChevronDown, CookingPot, Fan, Home, Leaf, Minus, MoveHorizontal, Plus, Power, ShieldCheck, ShoppingCart, Snowflake, Sofa, Sparkles, ThermometerSnowflake, Users, Wind, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AIR_ROOM_PROFILES,
  DEFAULT_ELECTRICITY_RATE_CLP_KWH,
  calculateAirSizing,
  estimateAirEnergy,
  isInverterProduct,
  normalizeAirCatalogProducts,
  recommendAirProductTiers,
  recommendAirProducts,
  type AirCatalogProduct,
  type AirRecommendation,
  type AirRoomType,
  type ClimateZone,
  type InsulationLevel,
  type SunExposure,
} from '@/lib/airConditioning';
import { AIR_FAN_LABELS, AIR_MODE_LABELS, simulateAirOperation, type AirFanSpeed, type AirMode } from '@/lib/airOperation';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const YELLOW = '#F6C64A';
const SEC_PROTOCOL = 'https://www.sec.cl/sitio-web/wp-content/uploads/2020/04/PE-1-26-2-EE-Acondicionadores-de-Aire_Eficiencia_2020.pdf';
const SEC_CERT = 'https://www.sec.cl/sistema-de-certificacion-de-productos-sec/';

const climateLabels: Record<ClimateZone, string> = { norte: 'Norte cálido', centro: 'Zona central', costa: 'Costa', sur: 'Sur' };
const roomIcons: Record<AirRoomType, ReactNode> = { dormitorio: <BedDouble size={18} />, living: <Sofa size={18} />, oficina: <BriefcaseBusiness size={18} />, cocina: <CookingPot size={18} /> };

type TierEntry = { key: 'economy' | 'recommended' | 'premium'; label: 'Ahorro' | 'Recomendado' | 'Premium'; note: string; recommendation: AirRecommendation };

function distinctTierEntries(tiers: ReturnType<typeof recommendAirProductTiers>, recommendations: AirRecommendation[]): TierEntry[] {
  const entries: TierEntry[] = [];
  const seen = new Set<string>();
  const pick = (preferred?: AirRecommendation, reverse = false) => preferred && !seen.has(preferred.product.id) ? preferred : (reverse ? [...recommendations].reverse() : recommendations).find(item => !seen.has(item.product.id));
  const economy = pick(tiers.economy);
  if (economy) { seen.add(economy.product.id); entries.push({ key: 'economy', label: 'Ahorro', note: 'Compatible y de menor precio.', recommendation: economy }); }
  const recommended = pick(tiers.recommended);
  if (recommended) { seen.add(recommended.product.id); entries.push({ key: 'recommended', label: 'Recomendado', note: 'Mejor equilibrio de capacidad y prestaciones.', recommendation: recommended }); }
  const premium = pick(tiers.premium, true);
  if (premium) { seen.add(premium.product.id); entries.push({ key: 'premium', label: 'Premium', note: 'Más margen o prestaciones.', recommendation: premium }); }
  return entries;
}

function simulatedAmbient(climate: ClimateZone, sun: SunExposure, room: AirRoomType) {
  const base: Record<ClimateZone, number> = { norte: 34, centro: 30, costa: 27, sur: 25 };
  const sunDelta: Record<SunExposure, number> = { baja: -1, media: 0, alta: 2 };
  const roomDelta: Record<AirRoomType, number> = { dormitorio: 0, living: .5, oficina: 1, cocina: 2 };
  return base[climate] + sunDelta[sun] + roomDelta[room];
}

function specValue(product: AirCatalogProduct | undefined, terms: string[]) {
  if (!product?.specifications) return '';
  for (const [key, value] of Object.entries(product.specifications)) {
    const normalized = key.toLowerCase().replace(/[_-]/g, ' ');
    if (terms.some(term => normalized.includes(term)) && value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function StepperField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const next = (valueNext: number) => onChange(Math.min(max, Math.max(min, Number(valueNext.toFixed(2)))));
  return <label className="block rounded-xl border border-white/10 bg-white/[.035] p-3"><span className="text-[9px] font-black uppercase tracking-[.1em] text-white/45">{label}</span><span className="mt-2 flex items-center gap-1"><button type="button" onClick={() => next(value - step)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10"><Minus size={14}/></button><input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={e => next(Number(e.target.value) || min)} className="min-w-0 flex-1 bg-transparent text-center text-lg font-black outline-none"/><button type="button" onClick={() => next(value + step)} className="grid h-9 w-9 place-items-center rounded-full bg-[#F6C64A] text-black"><Plus size={14}/></button></span></label>;
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return <div className="rounded-xl border border-white/[.08] bg-[#0B1116] p-3"><span className="text-[#F6C64A] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-sm font-black">{value}</b><small className="text-[8px] uppercase tracking-[.1em] text-white/35">{label}</small></div>;
}

function AirVisual({ capacityLabel, targetTempC, airflowPercent, powerOn }: { capacityLabel: string; targetTempC: number; airflowPercent: number; powerOn: boolean }) {
  return <div className="relative h-[190px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_70%_28%,rgba(87,212,255,.14),transparent_34%),linear-gradient(135deg,#101921,#05080b)] sm:h-[250px]">
    <div className="absolute left-[12%] top-[22%] w-[76%] rounded-[1.1rem] border border-white/15 bg-[#ECEFF1] p-3 text-[#111] shadow-[0_22px_60px_rgba(0,0,0,.35)]"><div className="flex items-center justify-between"><b className="text-xs tracking-[.16em]">FABRICK</b><span className="text-[9px] font-black">{powerOn ? `${targetTempC}°C` : 'OFF'}</span></div><div className="mt-3 h-1.5 rounded-full bg-black/15"><div className="airflow h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${powerOn ? airflowPercent : 0}%` }}/></div><div className="mt-2 text-[8px] font-black text-black/50">{capacityLabel} BTU · flujo visual</div></div>
    {powerOn ? [18, 34, 50, 66, 82].map((left, index) => <span key={left} className="air-particle absolute top-[58%] h-1.5 w-1.5 rounded-full bg-cyan-200/80" style={{ left: `${left}%`, animation: `airParticle ${1.8 + index * .2}s ease-in-out ${index * .12}s infinite` }}/>) : null}
    <style>{`@keyframes airParticle{0%,100%{transform:translate3d(0,0,0);opacity:.15}50%{transform:translate3d(20px,42px,0);opacity:.9}}`}</style>
  </div>;
}

export default function AirSimulatorFunnelV9({ initialProducts }: { initialProducts: AirCatalogProduct[] }) {
  const router = useRouter();
  const [products, setProducts] = useState<AirCatalogProduct[]>(initialProducts);
  const [catalogRefreshing, setCatalogRefreshing] = useState(initialProducts.length === 0);
  const [catalogError, setCatalogError] = useState('');
  const [lengthM, setLengthM] = useState(3.2);
  const [widthM, setWidthM] = useState(3);
  const [heightM, setHeightM] = useState(2.4);
  const [people, setPeople] = useState(1);
  const [windowAreaM2, setWindowAreaM2] = useState(1.5);
  const [roomType, setRoomType] = useState<AirRoomType>('dormitorio');
  const [sunExposure, setSunExposure] = useState<SunExposure>('media');
  const [insulation, setInsulation] = useState<InsulationLevel>('normal');
  const [climateZone, setClimateZone] = useState<ClimateZone>('centro');
  const [targetTempC, setTargetTempC] = useState(23);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [powerOn, setPowerOn] = useState(true);
  const [mode, setMode] = useState<AirMode>('auto');
  const [fanSpeed, setFanSpeed] = useState<AirFanSpeed>('auto');
  const [eco, setEco] = useState(false);
  const [sleep, setSleep] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [swing, setSwing] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setCatalogRefreshing(true);
      try {
        const response = await fetch('/api/tienda/products', { cache: 'no-store', headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => null) as { products?: unknown; error?: unknown } | null;
        if (!response.ok) throw new Error(String(payload?.error || response.status));
        const next = normalizeAirCatalogProducts(payload?.products).filter(product => /aire\s*acond|split|climat|\bbtu\b/i.test(`${product.name} ${product.description || ''} ${JSON.stringify(product.specifications || {})}`));
        if (active && next.length) setProducts(next);
        if (active) setCatalogError('');
      } catch {
        if (active && !products.length) setCatalogError('Catálogo no disponible por ahora. El dimensionamiento sigue activo.');
      } finally { if (active) setCatalogRefreshing(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sizing = useMemo(() => calculateAirSizing({ lengthM, widthM, heightM, people, roomType, sunExposure, insulation, climateZone, windowAreaM2 }), [lengthM, widthM, heightM, people, roomType, sunExposure, insulation, climateZone, windowAreaM2]);
  const recommendations = useMemo(() => recommendAirProducts(products, sizing, 6), [products, sizing]);
  const tiers = useMemo(() => recommendAirProductTiers(products, sizing), [products, sizing]);
  const tierEntries = useMemo(() => distinctTierEntries(tiers, recommendations), [tiers, recommendations]);
  const primary = tiers.recommended || recommendations[0];
  const ambientTempC = useMemo(() => simulatedAmbient(climateZone, sunExposure, roomType), [climateZone, sunExposure, roomType]);
  const unitCount = sizing.requiresMultiUnit ? sizing.minimumUnits : 1;
  const capacityBtu = primary?.capacity || (sizing.requiresMultiUnit ? sizing.perUnitCapacity : sizing.recommendedCapacity);
  const baseEnergy = useMemo(() => estimateAirEnergy({ capacityBtu, unitCount, targetTempC, ambientTempC, hoursPerDay, electricityRateClpKwh: DEFAULT_ELECTRICITY_RATE_CLP_KWH }), [capacityBtu, unitCount, targetTempC, ambientTempC, hoursPerDay]);
  const operation = useMemo(() => simulateAirOperation({ powerOn, mode, fanSpeed, eco, sleep, turbo, swing, baseElectricalKw: baseEnergy.electricalKwNow, baseLoadPercent: baseEnergy.loadPercent, unitCount, ambientTempC, targetTempC, hoursPerDay, electricityRateClpKwh: DEFAULT_ELECTRICITY_RATE_CLP_KWH }), [powerOn, mode, fanSpeed, eco, sleep, turbo, swing, baseEnergy, unitCount, ambientTempC, targetTempC, hoursPerDay]);

  const targetCapacityLabel = sizing.requiresMultiUnit ? `${sizing.minimumUnits} × ${Math.round(sizing.perUnitCapacity / 1000)}K` : `${Math.round(sizing.recommendedCapacity / 1000)}K`;
  const displayedProductCapacityLabel = primary ? `${Math.round(primary.capacity / 1000)}K` : targetCapacityLabel;
  const catalogUsesSuperiorCapacity = Boolean(primary && !sizing.requiresMultiUnit && primary.capacity > sizing.recommendedCapacity);
  const energyClass = specValue(primary?.product, ['clase energética', 'clase energetica', 'eficiencia energética', 'eficiencia energetica']);
  const eer = specValue(primary?.product, ['seer', 'eer', 'cop']);

  function goCheckout(recommendation: AirRecommendation) {
    const product = recommendation.product;
    const params = new URLSearchParams({ productId: product.id, name: product.name, price: String(recommendation.finalPrice), quantity: '1', img: product.image_url || '' });
    router.push(`/checkout?${params.toString()}`);
  }

  return <main className="min-h-screen bg-[#05090D] text-white">
    <div className="mx-auto max-w-[1120px] px-3 pb-10 pt-3 sm:px-6">
      <header className="flex items-center justify-between gap-3 border-b border-white/[.08] pb-3"><button type="button" onClick={() => router.push('/')} className="grid h-10 w-10 place-items-center rounded-full border border-white/15" aria-label="Volver"><ArrowLeft size={18}/></button><img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-10 w-auto max-w-[180px]"/><a href={SEC_CERT} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[#F6C64A]/35 bg-[#F6C64A]/[.06] px-3 py-2 text-[9px] font-black text-[#F6C64A]"><ShieldCheck size={14}/> Fuente SEC</a></header>

      <section className="py-5"><p className="text-[9px] font-black uppercase tracking-[.24em] text-[#F6C64A]">Calculadora BTU · Chile</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black tracking-[-.055em] sm:text-5xl">Tu aire ideal, sin dar vueltas.</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-white/48">Cambias medidas o condiciones y la capacidad, cobertura, consumo y equipos compatibles se reajustan al instante.</p></div><div className="rounded-xl border border-[#F6C64A]/30 bg-[#F6C64A]/[.07] px-4 py-3 text-right"><small className="block text-[8px] uppercase text-white/42">Capacidad recomendada</small><b className="text-2xl text-[#F6C64A]">{targetCapacityLabel} BTU</b></div></div></section>

      <div className="grid gap-4 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
        <div><AirVisual capacityLabel={displayedProductCapacityLabel} targetTempC={targetTempC} airflowPercent={operation.airflowPercent} powerOn={powerOn}/>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6"><Stat icon={<Snowflake/>} value={`${NUMBER.format(sizing.requiredBtu)} BTU`} label="demanda"/><Stat icon={<Home/>} value={`${NUMBER.format(sizing.areaM2)} m²`} label="superficie"/><Stat icon={<MoveHorizontal/>} value={`${NUMBER.format(sizing.volumeM3)} m³`} label="volumen"/><Stat icon={<Users/>} value={String(people)} label="personas"/><Stat icon={<Zap/>} value={`${NUMBER.format(operation.monthlyKwh)} kWh`} label="mes estimado"/><Stat icon={<Leaf/>} value={primary && isInverterProduct(primary.product) ? 'Inverter' : 'Según modelo'} label="tecnología"/></div>
        </div>

        <div className="space-y-3">
          <details className="group rounded-[1.35rem] border border-white/10 bg-[#0A1117] p-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Medidas</p><b className="text-sm">{NUMBER.format(lengthM)} × {NUMBER.format(widthM)} × {NUMBER.format(heightM)} m · {people} pers.</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary>
            <div className="mt-4 grid grid-cols-2 gap-2"><StepperField label="Largo (m)" value={lengthM} min={1.5} max={20} step={.1} onChange={setLengthM}/><StepperField label="Ancho (m)" value={widthM} min={1.5} max={20} step={.1} onChange={setWidthM}/><StepperField label="Alto (m)" value={heightM} min={2} max={6} step={.1} onChange={setHeightM}/><StepperField label="Personas" value={people} min={1} max={30} step={1} onChange={setPeople}/></div>
          </details>

          <details className="group rounded-[1.35rem] border border-white/10 bg-[#0A1117] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Condiciones del espacio</p><b className="text-sm">{AIR_ROOM_PROFILES[roomType].shortLabel} · {climateLabels[climateZone]}</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary>
            <div className="mt-4 grid gap-3"><div className="grid grid-cols-2 gap-2">{(Object.keys(AIR_ROOM_PROFILES) as AirRoomType[]).map(type => <button key={type} type="button" onClick={() => setRoomType(type)} className={`flex items-center gap-2 rounded-xl border p-3 text-left text-[10px] font-black ${roomType === type ? 'border-[#F6C64A] bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/10 text-white/55'}`}>{roomIcons[type]}{AIR_ROOM_PROFILES[type].shortLabel}</button>)}</div><label className="text-[9px] font-bold text-white/42">Zona climática<select value={climateZone} onChange={e => setClimateZone(e.target.value as ClimateZone)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#111A20] px-3 text-xs font-black text-white">{(Object.keys(climateLabels) as ClimateZone[]).map(zone => <option key={zone} value={zone}>{climateLabels[zone]}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-bold text-white/42">Sol<select value={sunExposure} onChange={e => setSunExposure(e.target.value as SunExposure)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#111A20] px-2 text-xs text-white"><option value="baja">Bajo</option><option value="media">Medio</option><option value="alta">Alto</option></select></label><label className="text-[9px] font-bold text-white/42">Aislación<select value={insulation} onChange={e => setInsulation(e.target.value as InsulationLevel)} className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#111A20] px-2 text-xs text-white"><option value="buena">Buena</option><option value="normal">Normal</option><option value="baja">Baja</option></select></label></div><StepperField label="Ventanas (m²)" value={windowAreaM2} min={0} max={80} step={.25} onChange={setWindowAreaM2}/></div>
          </details>
        </div>
      </div>

      <section className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[1.45rem] border border-[#F6C64A]/20 bg-[#0B1116] p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F6C64A]">Ficha recomendada ahora</p><h2 className="mt-1 text-xl font-black">{primary?.product.name || `${targetCapacityLabel} BTU`}</h2></div><BadgeCheck className="h-6 w-6 shrink-0 text-[#F6C64A]"/></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat icon={<Snowflake/>} value={`${displayedProductCapacityLabel} BTU`} label="equipo"/><Stat icon={<Home/>} value={`${NUMBER.format(sizing.areaM2)} m²`} label="para tus medidas"/><Stat icon={<MoveHorizontal/>} value={`${NUMBER.format(sizing.volumeM3)} m³`} label="volumen actual"/><Stat icon={<Users/>} value={`${people}`} label="ocupación actual"/></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><small className="text-[8px] uppercase text-white/35">Clase energética del modelo</small><b className="mt-1 block text-sm">{energyClass || 'Revisar etiqueta SEC'}</b></div><div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3"><small className="text-[8px] uppercase text-white/35">EER / SEER / COP informado</small><b className="mt-1 block text-sm">{eer || 'No informado en catálogo'}</b></div></div>{catalogUsesSuperiorCapacity ? <p className="mt-3 text-[10px] text-cyan-100/65">El catálogo disponible usa una capacidad superior a la mínima calculada para mantener margen térmico.</p> : null}{sizing.requiresMultiUnit ? <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/[.05] p-3 text-[10px] leading-5 text-amber-100/80">La demanda supera una unidad de 24K: recomendamos {sizing.minimumUnits} unidades de {Math.round(sizing.perUnitCapacity/1000)}K y bloqueamos compra directa hasta revisar distribución e instalación.</p> : null}</div>

        <div className="rounded-[1.45rem] border border-white/10 bg-[#0B1116] p-4 sm:p-5"><a href={SEC_PROTOCOL} target="_blank" rel="noreferrer" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#F6C64A] text-black"><ShieldCheck size={22}/></span><span><small className="block text-[8px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Referencia oficial Chile</small><b className="text-sm">SEC · eficiencia energética</b></span></a><p className="mt-3 text-[10px] leading-5 text-white/45">Los acondicionadores regulados deben certificarse y llevar marcado SEC; cuando corresponde, también etiqueta de eficiencia energética. La ficha del producto debe prevalecer sobre cualquier estimación de esta herramienta.</p></div>
      </section>

      <details className="group mt-3 rounded-[1.35rem] border border-white/10 bg-[#0A1117] p-4"><summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#57D4FF]">Control y consumo</p><b className="text-sm">Temperatura objetivo {targetTempC}°C · {hoursPerDay} h/día</b></div><ChevronDown className="h-5 w-5 text-white/40 transition group-open:rotate-180"/></summary><div className="mt-4 grid gap-3 lg:grid-cols-2"><div className="grid grid-cols-2 gap-2"><StepperField label="Temperatura objetivo" value={targetTempC} min={16} max={28} step={1} onChange={setTargetTempC}/><StepperField label="Horas por día" value={hoursPerDay} min={1} max={24} step={1} onChange={setHoursPerDay}/><button type="button" onClick={() => setPowerOn(v => !v)} className={`rounded-xl p-3 text-xs font-black ${powerOn ? 'bg-[#F6C64A] text-black' : 'border border-white/10'}`}><Power size={15} className="mx-auto mb-1"/>{powerOn ? 'Encendido' : 'Apagado'}</button><label className="rounded-xl border border-white/10 p-3 text-[9px] text-white/45">Modo<select value={mode} onChange={e => setMode(e.target.value as AirMode)} className="mt-1 w-full bg-transparent text-xs font-black text-white"><option className="bg-[#111A20]" value="auto">{AIR_MODE_LABELS.auto}</option><option className="bg-[#111A20]" value="cool">{AIR_MODE_LABELS.cool}</option><option className="bg-[#111A20]" value="dry">{AIR_MODE_LABELS.dry}</option><option className="bg-[#111A20]" value="fan">{AIR_MODE_LABELS.fan}</option><option className="bg-[#111A20]" value="heat">{AIR_MODE_LABELS.heat}</option></select></label><label className="rounded-xl border border-white/10 p-3 text-[9px] text-white/45">Ventilador<select value={fanSpeed} onChange={e => setFanSpeed(e.target.value as AirFanSpeed)} className="mt-1 w-full bg-transparent text-xs font-black text-white"><option className="bg-[#111A20]" value="auto">{AIR_FAN_LABELS.auto}</option><option className="bg-[#111A20]" value="low">{AIR_FAN_LABELS.low}</option><option className="bg-[#111A20]" value="medium">{AIR_FAN_LABELS.medium}</option><option className="bg-[#111A20]" value="high">{AIR_FAN_LABELS.high}</option></select></label><div className="grid grid-cols-2 gap-1">{[['Eco',eco,setEco],['Swing',swing,setSwing],['Sueño',sleep,setSleep],['Turbo',turbo,setTurbo]].map(([label,value,setter]) => <button key={String(label)} type="button" onClick={() => (setter as React.Dispatch<React.SetStateAction<boolean>>)(v => !v)} className={`rounded-xl border p-2 text-[9px] font-black ${value ? 'border-[#F6C64A]/50 text-[#F6C64A]' : 'border-white/10 text-white/40'}`}>{String(label)}</button>)}</div></div><div className="rounded-xl border border-white/[.07] bg-black/20 p-4"><p className="text-[9px] font-black uppercase text-[#F6C64A]">Consumo energético estimado</p><b className="mt-2 block text-2xl">{NUMBER.format(operation.monthlyKwh)} kWh/mes</b><p className="mt-1 text-xs text-white/45">Costo mensual estimado: {CLP.format(operation.monthlyCostClp)}</p><p className="mt-3 text-[10px] leading-5 text-white/38">¿Por qué inverter? Modula potencia en vez de operar siempre al máximo. En esta comparación modelada, el ahorro estimado es {baseEnergy.estimatedSavingsPercent}%. El resultado cambia con el modelo, clima, uso, tarifa y mantención.</p></div></div></details>

      <section className="mt-3 rounded-[1.45rem] border border-white/10 bg-[#0B1116] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F6C64A]">Equipos compatibles</p><h2 className="text-lg font-black">Compra según el cálculo, no por intuición</h2></div>{catalogRefreshing ? <Activity className="h-5 w-5 animate-pulse text-[#57D4FF]"/> : <ShoppingCart className="h-5 w-5 text-[#F6C64A]"/>}</div>{catalogError ? <p className="mt-3 text-[10px] text-amber-100/70">{catalogError}</p> : null}<div className="mt-3 grid gap-2 md:grid-cols-3">{tierEntries.length ? tierEntries.map(entry => <article key={entry.key} className="rounded-xl border border-white/[.08] bg-white/[.025] p-3"><div className="flex items-center justify-between gap-2"><b className="text-xs text-[#F6C64A]">{entry.label}</b><span className="text-[9px] text-white/35">{Math.round(entry.recommendation.capacity/1000)}K BTU</span></div><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/48">{entry.recommendation.product.name}</p><p className="mt-1 text-[9px] text-white/30">{entry.note}</p><b className="mt-2 block text-lg">{CLP.format(entry.recommendation.finalPrice)}</b><button type="button" disabled={sizing.requiresMultiUnit} onClick={() => goCheckout(entry.recommendation)} className="mt-3 h-10 w-full rounded-full bg-[#F6C64A] text-[10px] font-black text-black disabled:cursor-not-allowed disabled:opacity-35">Elegir equipo</button></article>) : <p className="text-[10px] text-white/40">No hay equipos compatibles disponibles en este momento.</p>}</div><div className="mt-3 flex flex-wrap gap-2 text-[9px] text-white/30"><span className="rounded-full border border-white/10 px-3 py-1.5">Checkout recalcula desde servidor</span><span className="rounded-full border border-white/10 px-3 py-1.5">Stock reservado al crear orden</span></div></section>
    </div>
  </main>;
}
