'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gauge,
  Home,
  Info,
  Loader2,
  Minus,
  Plus,
  Power,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Sun,
  ThermometerSnowflake,
  Users,
  Waves,
  Zap,
} from 'lucide-react';
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

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG = `${CLOUD}/c_fill,g_auto,w_1920,h_1200/e_blur:6/q_auto:good/f_auto/v1788671813/air-bedroom-background.jpg`;
const FALLBACK_AIR = `${CLOUD}/soluciones-fabrick/diseno-20260908/aire-acondicionado.png`;

const climateLabels: Record<ClimateZone, string> = {
  norte: 'Norte cálido',
  centro: 'Zona central',
  costa: 'Costa',
  sur: 'Sur',
};

const ROOM_SCENE: Record<AirRoomType, { glow: string; accent: string }> = {
  dormitorio: { glow: 'rgba(84,153,255,.25)', accent: '#7EDCFF' },
  living: { glow: 'rgba(100,197,255,.22)', accent: '#78E5FF' },
  oficina: { glow: 'rgba(84,210,255,.2)', accent: '#63D8FF' },
  cocina: { glow: 'rgba(255,166,74,.18)', accent: '#8FE8FF' },
};

function simulatedAmbient(climate: ClimateZone, sun: SunExposure, room: AirRoomType) {
  const base: Record<ClimateZone, number> = { norte: 34, centro: 30, costa: 27, sur: 25 };
  const sunDelta: Record<SunExposure, number> = { baja: -1, media: 0, alta: 2 };
  const roomDelta: Record<AirRoomType, number> = { dormitorio: 0, living: 0.5, oficina: 1, cocina: 2 };
  return Math.round((base[climate] + sunDelta[sun] + roomDelta[room]) * 10) / 10;
}

function uniqueTierEntries(tiers: ReturnType<typeof recommendAirProductTiers>) {
  const items: Array<{ key: 'economy' | 'recommended' | 'premium'; label: string; note: string; recommendation: AirRecommendation }> = [];
  const seen = new Set<string>();
  const add = (key: 'economy' | 'recommended' | 'premium', label: string, note: string, recommendation?: AirRecommendation) => {
    if (!recommendation || seen.has(recommendation.product.id)) return;
    seen.add(recommendation.product.id);
    items.push({ key, label, note, recommendation });
  };
  add('economy', 'Ahorro', 'La alternativa compatible de menor precio verificado.', tiers.economy);
  add('recommended', 'Recomendado', 'La mejor coincidencia entre capacidad, stock y atributos.', tiers.recommended);
  add('premium', 'Premium', 'La referencia más equipada entre las opciones compatibles.', tiers.premium);
  return items;
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

  useEffect(() => {
    let active = true;
    async function refreshCatalog() {
      setCatalogRefreshing(true);
      try {
        const response = await fetch('/api/tienda/products', { cache: 'no-store', headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => null) as { products?: unknown; error?: unknown } | null;
        if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `catalog_${response.status}`);
        const next = normalizeAirCatalogProducts(payload?.products).filter((product) => /aire\s*acond|split|climat|\bbtu\b/i.test(`${product.name} ${product.description || ''} ${JSON.stringify(product.specifications || {})}`));
        if (!active) return;
        if (next.length > 0) setProducts(next);
        setCatalogError('');
      } catch {
        if (!active) return;
        if (!products.length) setCatalogError('No pudimos cargar equipos disponibles. La calculadora sigue funcionando, pero no mostraremos una compra hasta verificar catálogo y stock.');
      } finally {
        if (active) setCatalogRefreshing(false);
      }
    }
    void refreshCatalog();
    return () => { active = false; };
    // initialProducts is the stable server preload for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sizing = useMemo(() => calculateAirSizing({
    lengthM,
    widthM,
    heightM,
    people,
    roomType,
    sunExposure,
    insulation,
    climateZone,
    windowAreaM2,
  }), [lengthM, widthM, heightM, people, roomType, sunExposure, insulation, climateZone, windowAreaM2]);

  const recommendations = useMemo(() => recommendAirProducts(products, sizing, 6), [products, sizing]);
  const tiers = useMemo(() => recommendAirProductTiers(products, sizing), [products, sizing]);
  const tierEntries = useMemo(() => uniqueTierEntries(tiers), [tiers]);
  const primary = tiers.recommended || recommendations[0];
  const roomProfile = AIR_ROOM_PROFILES[roomType];
  const ambientTempC = useMemo(() => simulatedAmbient(climateZone, sunExposure, roomType), [climateZone, sunExposure, roomType]);
  const energy = useMemo(() => estimateAirEnergy({
    capacityBtu: sizing.requiresMultiUnit ? sizing.perUnitCapacity : sizing.recommendedCapacity,
    unitCount: sizing.requiresMultiUnit ? sizing.minimumUnits : 1,
    targetTempC,
    ambientTempC,
    hoursPerDay,
    electricityRateClpKwh: DEFAULT_ELECTRICITY_RATE_CLP_KWH,
  }), [sizing, targetTempC, ambientTempC, hoursPerDay]);
  const scene = ROOM_SCENE[roomType];
  const liveKw = powerOn ? energy.electricalKwNow : 0;
  const liveMonthlyKwh = powerOn ? energy.monthlyKwh : 0;
  const liveMonthlyCost = powerOn ? energy.monthlyCostClp : 0;
  const productImage = primary?.product.image_url || FALLBACK_AIR;
  const capacityLabel = sizing.requiresMultiUnit
    ? `${sizing.minimumUnits} × ${Math.round(sizing.perUnitCapacity / 1000)}K`
    : `${Math.round(sizing.recommendedCapacity / 1000)}K`;

  function goCheckout(recommendation: AirRecommendation) {
    const product = recommendation.product;
    const params = new URLSearchParams({
      productId: product.id,
      name: product.name,
      price: String(recommendation.finalPrice),
      quantity: '1',
      img: product.image_url || '',
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return <main className="relative min-h-screen overflow-hidden bg-[#07090b] text-white">
    <div className="pointer-events-none fixed inset-0">
      <img src={BG} alt="" className="h-full w-full scale-[1.03] object-cover opacity-45"/>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,7,.9),rgba(6,7,8,.58)_52%,rgba(5,6,7,.9)),linear-gradient(180deg,rgba(5,6,7,.5),rgba(5,6,7,.9))]"/>
    </div>

    <div className="relative z-10 mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
      <header className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => router.push('/')} className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-black/45 backdrop-blur-xl" aria-label="Volver al inicio"><ArrowLeft size={18}/></button>
        <img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-10 w-auto max-w-[210px] object-contain brightness-0 invert sm:h-12"/>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-emerald-200">Cálculo + stock real</span>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/10 bg-[#0d0f12]/9 p-4 shadow-2xl backdrop-blur-2xl sm:p-5 xl:sticky xl:top-5 xl:self-start">
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Paso 1 · Tu espacio</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Calcula el equipo que realmente necesita tu ambiente.</h1>
          <p className="mt-3 text-xs leading-5 text-white/45">No usamos solo m²: incluimos altura, personas, ventanas, uso, sol, aislación y zona climática.</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {(Object.keys(AIR_ROOM_PROFILES) as AirRoomType[]).map((room) => <Choice key={room} active={roomType === room} onClick={() => setRoomType(room)}>{AIR_ROOM_PROFILES[room].emoji} {AIR_ROOM_PROFILES[room].label}</Choice>)}
          </div>
          <div className="mt-3 rounded-xl border border-white/8 bg-white/[.035] p-3 text-[9px] leading-4 text-white/42"><b className="text-white/70">{roomProfile.label}:</b> {roomProfile.description}</div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="Largo" value={lengthM} min={1.5} max={20} step={0.1} suffix="m" onChange={setLengthM}/>
            <NumberField label="Ancho" value={widthM} min={1.5} max={20} step={0.1} suffix="m" onChange={setWidthM}/>
            <NumberField label="Alto" value={heightM} min={2} max={6} step={0.1} suffix="m" onChange={setHeightM}/>
            <NumberField label="Personas" value={people} min={1} max={30} step={1} onChange={(value) => setPeople(Math.round(value))}/>
            <div className="col-span-2"><NumberField label="Ventanas aprox." value={windowAreaM2} min={0} max={30} step={0.5} suffix="m²" onChange={setWindowAreaM2}/></div>
          </div>

          <div className="mt-4 grid gap-3">
            <SelectField label="Sol" value={sunExposure} onChange={(value) => setSunExposure(value as SunExposure)} options={[['baja','Poco sol'],['media','Sol medio'],['alta','Mucho sol']]}/>
            <SelectField label="Aislación" value={insulation} onChange={(value) => setInsulation(value as InsulationLevel)} options={[['buena','Buena'],['normal','Normal'],['baja','Baja']]}/>
            <SelectField label="Zona" value={climateZone} onChange={(value) => setClimateZone(value as ClimateZone)} options={(Object.keys(climateLabels) as ClimateZone[]).map((key) => [key, climateLabels[key]])}/>
          </div>
        </aside>

        <div className="grid gap-5">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0e12]/86 shadow-2xl backdrop-blur-2xl">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_360px]">
              <AirVisualizer
                productImage={productImage}
                productName={primary?.product.name || `Equipo ${capacityLabel}`}
                roomType={roomType}
                capacityLabel={capacityLabel}
                targetTempC={targetTempC}
                ambientTempC={ambientTempC}
                powerOn={powerOn}
                loadPercent={powerOn ? energy.loadPercent : 0}
                sceneGlow={scene.glow}
                sceneAccent={scene.accent}
                liveKw={liveKw}
                monthlyKwh={liveMonthlyKwh}
                monthlyCostClp={liveMonthlyCost}
              />

              <div className="border-t border-white/10 bg-[#090c10]/95 p-5 lg:border-l lg:border-t-0 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#7EDCFF]">Control simulado</p><h2 className="mt-1 text-xl font-black">Temperatura objetivo</h2></div>
                  <button type="button" onClick={() => setPowerOn((value) => !value)} className={`grid h-11 w-11 place-items-center rounded-full border transition ${powerOn ? 'border-cyan-300/35 bg-cyan-300/12 text-cyan-200' : 'border-white/10 bg-white/[.04] text-white/35'}`} aria-label={powerOn ? 'Apagar simulador' : 'Encender simulador'}><Power size={18}/></button>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setTargetTempC((value) => Math.max(16, value - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-white/[.07] text-white"><Minus size={17}/></button>
                    <div className="text-center"><strong className="text-5xl font-black tracking-[-.06em] text-[#8BE8FF]">{targetTempC}°</strong><span className="block text-[8px] font-black uppercase tracking-[.16em] text-white/28">Frío · Auto</span></div>
                    <button type="button" onClick={() => setTargetTempC((value) => Math.min(28, value + 1))} className="grid h-11 w-11 place-items-center rounded-full bg-white/[.07] text-white"><Plus size={17}/></button>
                  </div>
                  <input aria-label="Temperatura objetivo" type="range" min="16" max="28" step="1" value={targetTempC} onChange={(event) => setTargetTempC(Number(event.target.value))} className="mt-5 h-2 w-full accent-cyan-300"/>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <EnergyMetric icon={<Zap/>} label="Consumo ahora" value={`${NUMBER.format(liveKw)} kWh/h`}/>
                  <EnergyMetric icon={<BatteryCharging/>} label="Uso mensual" value={`${NUMBER.format(liveMonthlyKwh)} kWh`}/>
                  <EnergyMetric icon={<Gauge/>} label="Esfuerzo" value={powerOn ? energy.loadLabel : 'Apagado'}/>
                  <EnergyMetric icon={<Clock3/>} label="Uso diario" value={`${hoursPerDay} h`}/>
                </div>

                <label className="mt-4 block text-[9px] font-bold text-white/45">Horas de uso al día <span className="float-right text-white/70">{hoursPerDay} h</span><input type="range" min="1" max="16" step="1" value={hoursPerDay} onChange={(event) => setHoursPerDay(Number(event.target.value))} className="mt-2 h-2 w-full accent-[#F7A347]"/></label>

                <div className="mt-4 rounded-xl border border-emerald-300/18 bg-emerald-300/[.06] p-4">
                  <p className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-200">Costo eléctrico estimado</p>
                  <strong className="mt-1 block text-2xl font-black text-emerald-100">{CLP.format(liveMonthlyCost)} / mes</strong>
                  <p className="mt-1 text-[8px] leading-4 text-white/35">Referencia con {CLP.format(DEFAULT_ELECTRICITY_RATE_CLP_KWH)}/kWh y 30 días. Tu tarifa real puede ser distinta.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_.78fr]">
            <div className="rounded-[1.7rem] border border-white/10 bg-[#0d0f12]/88 p-5 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Resultado personalizado</p>
              <div className="mt-2 flex flex-wrap items-end gap-3"><strong className="text-5xl font-black tracking-[-.06em] text-[#FF9D3D] sm:text-6xl">{capacityLabel}</strong><span className="pb-2 text-xs font-black text-white/50">BTU recomendados</span></div>
              <h2 className="mt-3 text-2xl font-black tracking-[-.035em]">{roomProfile.label} · {sizing.areaM2.toLocaleString('es-CL')} m² · {sizing.requiredBtu.toLocaleString('es-CL')} BTU/h calculados</h2>
              <p className="mt-3 text-xs leading-6 text-white/45">{sizing.requiresMultiUnit ? `La carga supera 24.000 BTU. Estimamos al menos ${sizing.minimumUnits} unidades de ${sizing.perUnitCapacity.toLocaleString('es-CL')} BTU y recomendamos validar distribución en terreno.` : `La capacidad comercial inmediatamente superior es ${sizing.recommendedCapacity.toLocaleString('es-CL')} BTU. Si cambias de habitación, oficina, cocina o living, el motor vuelve a calcular la carga y cambia el equipo cuando cruza el siguiente escalón real.`}</p>
              <div className="mt-4 flex flex-wrap gap-2">{sizing.reasons.map((reason) => <span key={reason} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[9px] font-bold text-white/45">{reason}</span>)}</div>
            </div>

            <div className="rounded-[1.7rem] border border-amber-300/18 bg-[linear-gradient(145deg,rgba(251,191,36,.1),rgba(8,9,10,.75))] p-5 sm:p-6">
              <div className="flex gap-3"><span className="text-2xl">⚠️</span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-200">¿Por qué inverter?</p><h3 className="mt-1 text-lg font-black">Modula el compresor en vez de encender y apagar a máxima potencia.</h3></div></div>
              <p className="mt-3 text-xs leading-5 text-white/55">En esta simulación, un inverter equivalente usa aprox. <b className="text-white">{energy.estimatedSavingsPercent}% menos energía</b> que un equipo tradicional de la misma capacidad y exigencia. El ahorro estimado sería de <b className="text-emerald-200">{CLP.format(energy.estimatedMonthlySavingsClp)}/mes</b>.</p>
              <p className="mt-2 text-[8px] leading-4 text-white/28">Es una comparación orientativa basada en eficiencia nominal. El consumo real depende del modelo, clima, aislación, tarifa, instalación y horas de uso.</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#0d0f12]/88 p-5 shadow-2xl backdrop-blur-2xl sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Referencias reales del catálogo</p><h2 className="mt-1 text-2xl font-black">Ahorro, recomendado y premium según tu cálculo.</h2></div><span className="inline-flex items-center gap-2 text-[9px] font-bold text-white/38">{catalogRefreshing ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/>Actualizando catálogo</> : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400"/>Stock sincronizado</>}</span></div>

            {catalogError ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-xs text-amber-100">{catalogError}</div> : null}
            {sizing.requiresMultiUnit ? <div className="mt-4 rounded-xl border border-[#F7A347]/25 bg-[#F7A347]/8 p-4 text-xs leading-5 text-white/60">La referencia de productos se mantiene visible, pero bloqueamos compra directa porque el espacio requiere dos o más unidades y debe revisarse la distribución.</div> : null}

            {tierEntries.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-3">{tierEntries.map(({ key, label, note, recommendation }) => <TierCard key={`${key}-${recommendation.product.id}`} label={label} note={note} recommendation={recommendation} emphasized={key === 'recommended'} disabled={sizing.requiresMultiUnit} onBuy={() => goCheckout(recommendation)}/>)}</div> : null}

            {!catalogRefreshing && recommendations.length === 0 ? <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[.035] p-6 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-white/30"/><h3 className="mt-3 font-black">No hay un equipo compatible con stock verificado.</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-white/40">No mostraremos una capacidad inferior solo para cerrar la venta. Revisa la tienda o solicita abastecimiento e instalación.</p><button type="button" onClick={() => router.push('/tienda')} className="mt-4 rounded-full border border-white/12 bg-white/[.06] px-5 py-3 text-xs font-black">Ver tienda</button></div> : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-3"><Trust icon={<ShieldCheck/>} title="Precio validado" text="Checkout recalcula desde servidor"/><Trust icon={<BadgeCheck/>} title="Stock reservado" text="Reserva atómica antes del pago"/><Trust icon={<Waves/>} title="Sin sobreventa" text="No recomendamos capacidad inferior"/></div>
            {primary ? <p className="mt-4 text-center text-[9px] text-white/28">Equipo activo del visor: {primary.product.name}. {isInverterProduct(primary.product) ? 'Detectado como inverter en la ficha del catálogo.' : 'La ficha disponible no declara inverter.'} El servidor vuelve a validar precio, stock y despacho antes de abrir Mercado Pago.</p> : null}
          </section>
        </div>
      </section>
    </div>
  </main>;
}

function AirVisualizer({ productImage, productName, roomType, capacityLabel, targetTempC, ambientTempC, powerOn, loadPercent, sceneGlow, sceneAccent, liveKw, monthlyKwh, monthlyCostClp }: {
  productImage: string;
  productName: string;
  roomType: AirRoomType;
  capacityLabel: string;
  targetTempC: number;
  ambientTempC: number;
  powerOn: boolean;
  loadPercent: number;
  sceneGlow: string;
  sceneAccent: string;
  liveKw: number;
  monthlyKwh: number;
  monthlyCostClp: number;
}) {
  const profile = AIR_ROOM_PROFILES[roomType];
  const coolHue = Math.max(188, Math.min(214, 188 + (24 - targetTempC) * 2));
  return <div className="relative min-h-[460px] overflow-hidden p-5 sm:p-7 lg:min-h-[540px]" style={{ perspective: '1200px', background: `radial-gradient(circle at 72% 30%, ${sceneGlow}, transparent 34%), linear-gradient(145deg, hsl(${coolHue} 38% 12% / .74), #07090c 62%)` }}>
    <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '38px 38px', maskImage: 'radial-gradient(circle at center, black, transparent 78%)' }}/>
    <div className="relative z-10 flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.18em]" style={{ color: sceneAccent }}>Visor climático 3D</p><h2 className="mt-1 text-2xl font-black">{profile.emoji} {profile.label} · {capacityLabel}</h2><p className="mt-1 max-w-xl text-[10px] leading-5 text-white/38">Ambiente simulado {ambientTempC}°C → objetivo {targetTempC}°C. El equipo y el consumo reaccionan al cálculo.</p></div><span className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] ${powerOn ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200' : 'border-white/10 bg-white/[.04] text-white/35'}`}>{powerOn ? '● Encendido' : '○ Apagado'}</span></div>

    <div className="relative z-10 mt-8 grid min-h-[265px] place-items-center">
      <div className="absolute left-[8%] top-[12%] h-[72%] w-[84%] rounded-[2.2rem] border border-white/[.055] bg-white/[.018] shadow-[inset_0_0_80px_rgba(255,255,255,.025)]" style={{ transform: 'rotateX(7deg) rotateY(-4deg) translateZ(-35px)' }}/>
      <div className="absolute bottom-2 left-[12%] right-[10%] h-20 rounded-[50%] bg-black/50 blur-2xl"/>
      {powerOn ? <>
        <AirRibbon index={0} loadPercent={loadPercent}/><AirRibbon index={1} loadPercent={loadPercent}/><AirRibbon index={2} loadPercent={loadPercent}/><AirRibbon index={3} loadPercent={loadPercent}/>
      </> : null}
      <div className="relative w-[min(82%,690px)] rounded-[2rem] border border-white/10 bg-white/[.035] p-5 shadow-[0_34px_95px_rgba(0,0,0,.5)] backdrop-blur-sm" style={{ transform: 'rotateX(-3deg) rotateY(-7deg) translateZ(42px)', transformStyle: 'preserve-3d' }}>
        <div className="grid min-h-[150px] place-items-center rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(255,255,255,.98),rgba(232,239,243,.93))] p-3 shadow-[0_18px_40px_rgba(0,0,0,.24)]" style={{ transform: 'translateZ(28px)' }}>
          <img src={productImage} alt={productName} className="max-h-[138px] w-full object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,.24)]"/>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[9px]"><b className="line-clamp-1 text-white/75">{productName}</b><span className="shrink-0 font-black" style={{ color: sceneAccent }}>{capacityLabel} BTU</span></div>
      </div>
      <div className="absolute right-[5%] top-[12%] rounded-[1.4rem] border border-cyan-200/15 bg-[#071015]/75 px-4 py-3 text-right shadow-xl backdrop-blur-xl" style={{ transform: 'translateZ(80px)' }}><span className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-200/55">Temperatura</span><strong className="block text-3xl font-black text-cyan-100">{targetTempC}°C</strong></div>
    </div>

    <div className="relative z-10 mt-5 grid gap-2 sm:grid-cols-3">
      <LiveStat label="Consumo animado" value={`${NUMBER.format(liveKw)} kWh/h`} pulse={powerOn}/>
      <LiveStat label="Proyección 30 días" value={`${NUMBER.format(monthlyKwh)} kWh`}/>
      <LiveStat label="Costo estimado" value={CLP.format(monthlyCostClp)}/>
    </div>
    <div className="relative z-10 mt-3 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#73E8FF,#FFCB65,#FF8D55)] transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, loadPercent))}%` }}/></div>
  </div>;
}

function AirRibbon({ index, loadPercent }: { index: number; loadPercent: number }) {
  const top = 42 + index * 8;
  const opacity = .18 + (loadPercent / 100) * .32;
  return <span className="air-flow absolute left-[38%] h-[3px] w-[48%] rounded-full bg-[linear-gradient(90deg,rgba(111,228,255,.05),rgba(121,232,255,.9),rgba(105,188,255,0))] blur-[1px]" style={{ top: `${top}%`, opacity, animationDelay: `${index * 180}ms`, animationDuration: `${Math.max(.9, 1.8 - loadPercent / 120)}s` }}/>
}

function LiveStat({ label, value, pulse = false }: { label: string; value: string; pulse?: boolean }) {
  return <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5"><span className="flex items-center gap-2 text-[8px] uppercase tracking-[.12em] text-white/30">{pulse ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"/> : null}{label}</span><b className="mt-1 block text-xs text-white/72">{value}</b></div>;
}

function TierCard({ label, note, recommendation, emphasized, disabled, onBuy }: { label: string; note: string; recommendation: AirRecommendation; emphasized?: boolean; disabled?: boolean; onBuy: () => void }) {
  const { product } = recommendation;
  return <article className={`flex min-h-[365px] flex-col rounded-[1.6rem] border p-4 ${emphasized ? 'border-[#F7A347]/50 bg-[#F7A347]/8 shadow-[0_18px_60px_rgba(247,163,71,.08)]' : 'border-white/10 bg-white/[.035]'}`}>
    <div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] ${emphasized ? 'bg-[#F7A347] text-black' : 'bg-black/30 text-[#FFC27A]'}`}>{label}</span>{product.stock !== undefined ? <span className="text-[8px] font-bold text-emerald-300">Stock {product.stock}</span> : null}</div>
    <div className="mt-3 grid h-32 place-items-center rounded-xl bg-white/95 p-2">{product.image_url ? <img src={product.image_url} alt={product.name} className="max-h-28 w-full object-contain"/> : <ThermometerSnowflake className="h-10 w-10 text-black/25"/>}</div>
    <h3 className="mt-3 line-clamp-2 text-sm font-black leading-5">{product.name}</h3>
    <p className="mt-1 text-[9px] leading-4 text-white/40">{note}</p>
    <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-white/[.055] px-2 py-1 text-[8px] font-black text-white/45">{recommendation.capacity.toLocaleString('es-CL')} BTU</span>{isInverterProduct(product) ? <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[8px] font-black text-cyan-200">Inverter</span> : null}</div>
    <div className="mt-auto pt-4"><strong className="text-xl text-[#FF9D3D]">{CLP.format(recommendation.finalPrice)}</strong><button type="button" disabled={disabled} onClick={onBuy} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F7A347] px-4 text-xs font-black text-[#111214] transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">{disabled ? 'Requiere evaluación' : 'Elegir y pagar'} <ChevronRight size={15}/></button></div>
  </article>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-2.5 text-[10px] font-black transition ${active ? 'border-[#F7A347] bg-[#F7A347] text-[#111214]' : 'border-white/10 bg-white/[.04] text-white/48 hover:bg-white/[.08]'}`}>{children}</button>;
}

function NumberField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><div className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[.055] px-3"><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none"/><span className="text-[9px] text-white/30">{suffix}</span></div></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#181a1e] px-3 text-xs font-bold text-white outline-none focus:border-[#F7A347]">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function EnergyMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.035] p-3"><span className="text-[#7FE5FF] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-sm">{value}</b><span className="mt-0.5 block text-[8px] uppercase tracking-[.1em] text-white/28">{label}</span></div>;
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.03] p-3"><span className="text-[#F7A347] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-[10px]">{title}</b><span className="mt-1 block text-[8px] leading-4 text-white/30">{text}</span></div>;
}

// Tailwind handles layout; this tiny global animation keeps the airflow GPU-cheap.
// eslint-disable-next-line @next/next/no-css-tags
const _airFlowAnimation = `@keyframes air-flow{0%{transform:translate3d(-18%,0,0) scaleX(.45);opacity:0}28%{opacity:.6}100%{transform:translate3d(52%,12px,0) scaleX(1.12);opacity:0}}.air-flow{animation-name:air-flow;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform,opacity}`;

if (typeof document !== 'undefined' && !document.getElementById('fabrick-air-flow-style')) {
  const style = document.createElement('style');
  style.id = 'fabrick-air-flow-style';
  style.textContent = _airFlowAnimation;
  document.head.appendChild(style);
}
