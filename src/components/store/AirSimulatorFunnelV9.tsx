'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  Flame,
  Gauge,
  Leaf,
  Loader2,
  Minus,
  MoonStar,
  Plus,
  Power,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Sparkles,
  ThermometerSnowflake,
  Waves,
  Wind,
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
import {
  AIR_FAN_LABELS,
  AIR_MODE_LABELS,
  simulateAirOperation,
  type AirFanSpeed,
  type AirMode,
} from '@/lib/airOperation';

const AirThreeScene = dynamic(() => import('./AirThreeScene'), {
  ssr: false,
  loading: () => <div className="grid h-[330px] place-items-center rounded-[1.6rem] border border-white/10 bg-[#080c10] sm:h-[390px] lg:h-[420px]"><Loader2 className="h-6 w-6 animate-spin text-cyan-200" /></div>,
});

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG = `${CLOUD}/c_fill,g_auto,w_1920,h_1200/e_blur:6/q_auto:good/f_auto/v1788671813/air-bedroom-background.jpg`;

const climateLabels: Record<ClimateZone, string> = {
  norte: 'Norte cálido',
  centro: 'Zona central',
  costa: 'Costa',
  sur: 'Sur',
};

const modeIcons: Record<AirMode, ReactNode> = {
  auto: <Sparkles size={14} />,
  cool: <Snowflake size={14} />,
  dry: <Droplets size={14} />,
  fan: <Wind size={14} />,
  heat: <Flame size={14} />,
};

type TierEntry = {
  key: 'economy' | 'recommended' | 'premium';
  label: 'Ahorro' | 'Recomendado' | 'Premium';
  note: string;
  recommendation: AirRecommendation;
};

function simulatedAmbient(climate: ClimateZone, sun: SunExposure, room: AirRoomType) {
  const base: Record<ClimateZone, number> = { norte: 34, centro: 30, costa: 27, sur: 25 };
  const sunDelta: Record<SunExposure, number> = { baja: -1, media: 0, alta: 2 };
  const roomDelta: Record<AirRoomType, number> = { dormitorio: 0, living: 0.5, oficina: 1, cocina: 2 };
  return Math.round((base[climate] + sunDelta[sun] + roomDelta[room]) * 10) / 10;
}

function distinctTierEntries(
  tiers: ReturnType<typeof recommendAirProductTiers>,
  recommendations: AirRecommendation[],
): TierEntry[] {
  const entries: TierEntry[] = [];
  const seen = new Set<string>();
  const pickUnused = (preferred?: AirRecommendation, reverse = false) => {
    if (preferred && !seen.has(preferred.product.id)) return preferred;
    const pool = reverse ? [...recommendations].reverse() : recommendations;
    return pool.find((item) => !seen.has(item.product.id));
  };

  const economy = pickUnused(tiers.economy);
  if (economy) {
    seen.add(economy.product.id);
    entries.push({ key: 'economy', label: 'Ahorro', note: 'La alternativa compatible de menor precio.', recommendation: economy });
  }
  const recommended = pickUnused(tiers.recommended);
  if (recommended) {
    seen.add(recommended.product.id);
    entries.push({ key: 'recommended', label: 'Recomendado', note: 'El mejor equilibrio entre capacidad, stock y prestaciones.', recommendation: recommended });
  }
  const premium = pickUnused(tiers.premium, true);
  if (premium) {
    seen.add(premium.product.id);
    entries.push({ key: 'premium', label: 'Premium', note: 'Una alternativa superior para quien prioriza prestaciones y margen.', recommendation: premium });
  }
  return entries;
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
        if (!products.length) setCatalogError('No pudimos cargar equipos disponibles. La calculadora sigue activa, pero la compra se mantiene bloqueada hasta recuperar catálogo y stock.');
      } finally {
        if (active) setCatalogRefreshing(false);
      }
    }
    void refreshCatalog();
    return () => { active = false; };
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
  const tierEntries = useMemo(() => distinctTierEntries(tiers, recommendations), [tiers, recommendations]);
  const primary = tiers.recommended || recommendations[0];
  const roomProfile = AIR_ROOM_PROFILES[roomType];
  const ambientTempC = useMemo(() => simulatedAmbient(climateZone, sunExposure, roomType), [climateZone, sunExposure, roomType]);
  const unitCount = sizing.requiresMultiUnit ? sizing.minimumUnits : 1;
  const capacityBtu = primary?.capacity || (sizing.requiresMultiUnit ? sizing.perUnitCapacity : sizing.recommendedCapacity);

  const baseEnergy = useMemo(() => estimateAirEnergy({
    capacityBtu,
    unitCount,
    targetTempC,
    ambientTempC,
    hoursPerDay,
    electricityRateClpKwh: DEFAULT_ELECTRICITY_RATE_CLP_KWH,
  }), [capacityBtu, unitCount, targetTempC, ambientTempC, hoursPerDay]);

  const operation = useMemo(() => simulateAirOperation({
    powerOn,
    mode,
    fanSpeed,
    eco,
    sleep,
    turbo,
    swing,
    baseElectricalKw: baseEnergy.electricalKwNow,
    baseLoadPercent: baseEnergy.loadPercent,
    unitCount,
    ambientTempC,
    targetTempC,
    hoursPerDay,
    electricityRateClpKwh: DEFAULT_ELECTRICITY_RATE_CLP_KWH,
  }), [powerOn, mode, fanSpeed, eco, sleep, turbo, swing, baseEnergy, unitCount, ambientTempC, targetTempC, hoursPerDay]);

  const targetCapacityLabel = sizing.requiresMultiUnit
    ? `${sizing.minimumUnits} × ${Math.round(sizing.perUnitCapacity / 1000)}K`
    : `${Math.round(sizing.recommendedCapacity / 1000)}K`;
  const displayedProductCapacityLabel = primary ? `${Math.round(primary.capacity / 1000)}K` : targetCapacityLabel;
  const catalogUsesSuperiorCapacity = Boolean(primary && !sizing.requiresMultiUnit && primary.capacity > sizing.recommendedCapacity);

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

  function toggleEco() {
    setEco((value) => {
      const next = !value;
      if (next) setTurbo(false);
      return next;
    });
  }

  function toggleTurbo() {
    setTurbo((value) => {
      const next = !value;
      if (next) {
        setEco(false);
        setSleep(false);
      }
      return next;
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090b] text-white">
      <div className="pointer-events-none fixed inset-0">
        <img src={BG} alt="" className="h-full w-full scale-[1.03] object-cover opacity-42" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,6,7,.92),rgba(6,7,8,.62)_52%,rgba(5,6,7,.92)),linear-gradient(180deg,rgba(5,6,7,.52),rgba(5,6,7,.92))]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">
        <header className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => router.push('/')} className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-black/45 backdrop-blur-xl" aria-label="Volver al inicio"><ArrowLeft size={18} /></button>
          <img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-10 w-auto max-w-[210px] object-contain brightness-0 invert sm:h-12" />
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-emerald-200">Cálculo + stock sincronizado</span>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[350px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-[#0d0f12]/90 p-4 shadow-2xl backdrop-blur-2xl sm:p-5 xl:sticky xl:top-5 xl:self-start">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Paso 1 · Tu espacio</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">Calcula el equipo que necesita tu ambiente.</h1>
            <p className="mt-3 text-xs leading-5 text-white/45">Incluimos altura, personas, ventanas, uso, sol, aislación y zona climática para ajustar la carga.</p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {(Object.keys(AIR_ROOM_PROFILES) as AirRoomType[]).map((room) => (
                <Choice key={room} active={roomType === room} onClick={() => setRoomType(room)}>{AIR_ROOM_PROFILES[room].emoji} {AIR_ROOM_PROFILES[room].label}</Choice>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-white/8 bg-white/[.035] p-3 text-[9px] leading-4 text-white/42"><b className="text-white/70">{roomProfile.label}:</b> {roomProfile.description}</div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <NumberField label="Largo" value={lengthM} min={1.5} max={20} step={0.1} suffix="m" onChange={setLengthM} />
              <NumberField label="Ancho" value={widthM} min={1.5} max={20} step={0.1} suffix="m" onChange={setWidthM} />
              <NumberField label="Alto" value={heightM} min={2} max={6} step={0.1} suffix="m" onChange={setHeightM} />
              <NumberField label="Personas" value={people} min={1} max={30} step={1} onChange={(value) => setPeople(Math.round(value))} />
              <div className="col-span-2"><NumberField label="Ventanas aprox." value={windowAreaM2} min={0} max={30} step={0.5} suffix="m²" onChange={setWindowAreaM2} /></div>
            </div>

            <div className="mt-4 grid gap-3">
              <SelectField label="Sol" value={sunExposure} onChange={(value) => setSunExposure(value as SunExposure)} options={[['baja', 'Poco sol'], ['media', 'Sol medio'], ['alta', 'Mucho sol']]} />
              <SelectField label="Aislación" value={insulation} onChange={(value) => setInsulation(value as InsulationLevel)} options={[['buena', 'Buena'], ['normal', 'Normal'], ['baja', 'Baja']]} />
              <SelectField label="Zona" value={climateZone} onChange={(value) => setClimateZone(value as ClimateZone)} options={(Object.keys(climateLabels) as ClimateZone[]).map((key) => [key, climateLabels[key]])} />
            </div>
          </aside>

          <div className="grid gap-5">
            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0e12]/88 shadow-2xl backdrop-blur-2xl">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.35fr)_390px]">
                <div className="p-4 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#7EDCFF]">Visor climático 3D</p><h2 className="mt-1 text-2xl font-black">{roomProfile.emoji} {roomProfile.label} · objetivo {targetCapacityLabel}</h2><p className="mt-1 max-w-2xl text-[10px] leading-5 text-white/40">Mueve la cámara. El flujo, la compuerta y el gasto cambian con cada ajuste del control.</p></div>
                    <span className={`rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] ${powerOn ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-200' : 'border-white/10 bg-white/[.04] text-white/35'}`}>{powerOn ? '● Encendido' : '○ Apagado'}</span>
                  </div>

                  <AirThreeScene
                    roomType={roomType}
                    targetTempC={targetTempC}
                    ambientTempC={ambientTempC}
                    powerOn={powerOn}
                    swing={swing}
                    eco={eco}
                    sleep={sleep}
                    turbo={turbo}
                    capacityLabel={displayedProductCapacityLabel}
                    operation={operation}
                  />

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <LiveStat label="Consumo animado" value={`${NUMBER.format(operation.electricalKwNow)} kW`} pulse={powerOn} />
                    <LiveStat label="Proyección 30 días" value={`${NUMBER.format(operation.monthlyKwh)} kWh`} />
                    <LiveStat label="Costo estimado" value={CLP.format(operation.monthlyCostClp)} />
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#73E8FF,#FFCB65,#FF8D55)] transition-[width] duration-700" style={{ width: `${operation.loadPercent}%` }} /></div>
                </div>

                <div className="border-t border-white/10 bg-[#090c10]/95 p-5 lg:border-l lg:border-t-0 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#7EDCFF]">Control simulado</p><h2 className="mt-1 text-xl font-black">Control de clima</h2></div>
                    <button type="button" onClick={() => setPowerOn((value) => !value)} className={`grid h-11 w-11 place-items-center rounded-full border transition ${powerOn ? 'border-cyan-300/35 bg-cyan-300/12 text-cyan-200' : 'border-white/10 bg-white/[.04] text-white/35'}`} aria-label={powerOn ? 'Apagar simulador' : 'Encender simulador'}><Power size={18} /></button>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-1.5">
                    {(Object.keys(AIR_MODE_LABELS) as AirMode[]).map((item) => <ModeButton key={item} active={mode === item} icon={modeIcons[item]} label={AIR_MODE_LABELS[item]} onClick={() => setMode(item)} />)}
                  </div>

                  <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <button type="button" disabled={mode === 'fan'} onClick={() => setTargetTempC((value) => Math.max(16, value - 1))} className="grid h-11 w-11 place-items-center rounded-full bg-white/[.07] text-white disabled:opacity-25"><Minus size={17} /></button>
                      <div className="text-center"><strong className="text-5xl font-black tracking-[-.06em] text-[#8BE8FF]">{targetTempC}°</strong><span className="block text-[8px] font-black uppercase tracking-[.16em] text-white/32">Temperatura objetivo</span></div>
                      <button type="button" disabled={mode === 'fan'} onClick={() => setTargetTempC((value) => Math.min(30, value + 1))} className="grid h-11 w-11 place-items-center rounded-full bg-white/[.07] text-white disabled:opacity-25"><Plus size={17} /></button>
                    </div>
                    <input aria-label="Temperatura objetivo" disabled={mode === 'fan'} type="range" min="16" max="30" step="1" value={targetTempC} onChange={(event) => setTargetTempC(Number(event.target.value))} className="mt-5 h-2 w-full accent-cyan-300 disabled:opacity-25" />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[.13em] text-white/34"><span>Ventilador</span><span>{AIR_FAN_LABELS[fanSpeed]}</span></div>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">{(Object.keys(AIR_FAN_LABELS) as AirFanSpeed[]).map((speed) => <Choice key={speed} active={fanSpeed === speed} onClick={() => setFanSpeed(speed)}>{AIR_FAN_LABELS[speed]}</Choice>)}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <OptionToggle active={eco} icon={<Leaf size={14} />} label="Eco" onClick={toggleEco} />
                    <OptionToggle active={swing} icon={<Waves size={14} />} label="Swing" onClick={() => setSwing((value) => !value)} />
                    <OptionToggle active={sleep} icon={<MoonStar size={14} />} label="Sueño" onClick={() => { setSleep((value) => !value); setTurbo(false); }} />
                    <OptionToggle active={turbo} icon={<Gauge size={14} />} label="Turbo" onClick={toggleTurbo} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <EnergyMetric icon={<Zap />} label="Potencia" value={`${NUMBER.format(operation.electricalKwNow)} kW`} />
                    <EnergyMetric icon={<BatteryCharging />} label="Mes" value={`${NUMBER.format(operation.monthlyKwh)} kWh`} />
                    <EnergyMetric icon={<Gauge />} label="Carga" value={operation.loadLabel} />
                    <EnergyMetric icon={<Wind />} label="Flujo" value={`${operation.airflowPercent}%`} />
                  </div>

                  <label className="mt-4 block text-[9px] font-bold text-white/45">Horas de uso al día <span className="float-right text-white/70">{hoursPerDay} h</span><input type="range" min="1" max="16" step="1" value={hoursPerDay} onChange={(event) => setHoursPerDay(Number(event.target.value))} className="mt-2 h-2 w-full accent-[#F7A347]" /></label>

                  <div className="mt-4 rounded-xl border border-emerald-300/18 bg-emerald-300/[.06] p-4">
                    <p className="text-[8px] font-black uppercase tracking-[.14em] text-emerald-200">Costo eléctrico estimado</p>
                    <strong className="mt-1 block text-2xl font-black text-emerald-100">{CLP.format(operation.monthlyCostClp)} / mes</strong>
                    <p className="mt-1 text-[8px] leading-4 text-white/35">Escenario con {CLP.format(DEFAULT_ELECTRICITY_RATE_CLP_KWH)}/kWh, 30 días y los ajustes seleccionados.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_.78fr]">
              <div className="rounded-[1.7rem] border border-white/10 bg-[#0d0f12]/88 p-5 sm:p-6">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Resultado personalizado</p>
                <div className="mt-2 flex flex-wrap items-end gap-3"><strong className="text-5xl font-black tracking-[-.06em] text-[#FF9D3D] sm:text-6xl">{targetCapacityLabel}</strong><span className="pb-2 text-xs font-black text-white/50">BTU recomendados</span></div>
                <h2 className="mt-3 text-2xl font-black tracking-[-.035em]">{roomProfile.label} · {sizing.areaM2.toLocaleString('es-CL')} m² · {sizing.requiredBtu.toLocaleString('es-CL')} BTU/h calculados</h2>
                <p className="mt-3 text-xs leading-6 text-white/45">{sizing.requiresMultiUnit ? `La carga supera 24.000 BTU. Estimamos al menos ${sizing.minimumUnits} unidades de ${sizing.perUnitCapacity.toLocaleString('es-CL')} BTU y recomendamos revisar la distribución en terreno.` : `El siguiente escalón de capacidad es ${sizing.recommendedCapacity.toLocaleString('es-CL')} BTU. Cambia el ambiente, el sol, las personas o la aislación y el motor ajusta el resultado al instante.`}</p>
                {catalogUsesSuperiorCapacity ? <div className="mt-3 rounded-xl border border-cyan-300/16 bg-cyan-300/[.06] px-3 py-2.5 text-[10px] leading-5 text-cyan-50/70"><b className="text-cyan-100">Catálogo:</b> el cálculo sugiere {sizing.recommendedCapacity.toLocaleString('es-CL')} BTU y las opciones disponibles empiezan en {primary?.capacity.toLocaleString('es-CL')} BTU, por eso recomendamos la capacidad superior compatible.</div> : null}
                <div className="mt-4 flex flex-wrap gap-2">{sizing.reasons.map((reason) => <span key={reason} className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[9px] font-bold text-white/45">{reason}</span>)}</div>
              </div>

              <div className="rounded-[1.7rem] border border-amber-300/18 bg-[linear-gradient(145deg,rgba(251,191,36,.1),rgba(8,9,10,.75))] p-5 sm:p-6">
                <div className="flex gap-3"><span className="text-2xl">⚡</span><div><p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-200">¿Por qué inverter?</p><h3 className="mt-1 text-lg font-black">Modula el compresor para sostener la temperatura con menos ciclos bruscos.</h3></div></div>
                <p className="mt-3 text-xs leading-5 text-white/55">En el escenario base, la diferencia estimada frente a un equipo tradicional equivalente es de <b className="text-white">{baseEnergy.estimatedSavingsPercent}%</b>, equivalente a cerca de <b className="text-emerald-200">{CLP.format(baseEnergy.estimatedMonthlySavingsClp)}/mes</b>.</p>
                <p className="mt-2 text-[8px] leading-4 text-white/30">El resultado cambia con el modelo, clima, aislación, tarifa, instalación, modo seleccionado y horas de uso.</p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#0d0f12]/88 p-5 shadow-2xl backdrop-blur-2xl sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F7A347]">Opciones del catálogo</p><h2 className="mt-1 text-2xl font-black">Ahorro, recomendado y premium según tu cálculo.</h2></div><span className="inline-flex items-center gap-2 text-[9px] font-bold text-white/38">{catalogRefreshing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Actualizando catálogo</> : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />Stock sincronizado</>}</span></div>

              {catalogError ? <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-xs text-amber-100">{catalogError}</div> : null}
              {sizing.requiresMultiUnit ? <div className="mt-4 rounded-xl border border-[#F7A347]/25 bg-[#F7A347]/8 p-4 text-xs leading-5 text-white/60">La referencia de productos se mantiene visible, pero bloqueamos compra directa porque el espacio requiere dos o más unidades y debe revisarse la distribución.</div> : null}

              {tierEntries.length > 0 ? <div className="mt-5 grid gap-3 md:grid-cols-3">{tierEntries.map(({ key, label, note, recommendation }) => <TierCard key={`${key}-${recommendation.product.id}`} label={label} note={note} recommendation={recommendation} emphasized={key === 'recommended'} disabled={sizing.requiresMultiUnit} onBuy={() => goCheckout(recommendation)} />)}</div> : null}

              {!catalogRefreshing && recommendations.length === 0 ? <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[.035] p-6 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-white/30" /><h3 className="mt-3 font-black">No hay un equipo compatible con stock.</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-white/40">No mostraremos una capacidad inferior solo para cerrar la venta. Revisa la tienda o solicita abastecimiento e instalación.</p><button type="button" onClick={() => router.push('/tienda')} className="mt-4 rounded-full border border-white/12 bg-white/[.06] px-5 py-3 text-xs font-black">Ver tienda</button></div> : null}

              <div className="mt-5 grid gap-2 sm:grid-cols-3"><Trust icon={<ShieldCheck />} title="Precio actualizado" text="Checkout recalcula desde servidor" /><Trust icon={<BadgeCheck />} title="Stock reservado" text="Reserva atómica antes del pago" /><Trust icon={<Waves />} title="Sin sobreventa" text="No recomendamos capacidad inferior" /></div>
              {primary ? <p className="mt-4 text-center text-[9px] text-white/28">Equipo sugerido: {primary.product.name} · {primary.capacity.toLocaleString('es-CL')} BTU. {isInverterProduct(primary.product) ? 'La ficha indica tecnología inverter.' : 'La ficha no declara tecnología inverter.'} El servidor vuelve a validar precio, stock y despacho antes de abrir Mercado Pago.</p> : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`grid min-h-14 place-items-center gap-1 rounded-xl border px-1.5 py-2 text-[8px] font-black transition ${active ? 'border-cyan-300/45 bg-cyan-300/12 text-cyan-100' : 'border-white/10 bg-white/[.035] text-white/42 hover:bg-white/[.07]'}`}><span>{icon}</span><span>{label}</span></button>;
}

function OptionToggle({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[9px] font-black transition ${active ? 'border-[#F7A347]/45 bg-[#F7A347]/12 text-[#FFC27A]' : 'border-white/10 bg-white/[.035] text-white/42'}`}>{icon}{label}</button>;
}

function LiveStat({ label, value, pulse = false }: { label: string; value: string; pulse?: boolean }) {
  return <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5"><span className="flex items-center gap-2 text-[8px] uppercase tracking-[.12em] text-white/30">{pulse ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" /> : null}{label}</span><b className="mt-1 block text-xs text-white/72">{value}</b></div>;
}

function TierCard({ label, note, recommendation, emphasized, disabled, onBuy }: { label: string; note: string; recommendation: AirRecommendation; emphasized?: boolean; disabled?: boolean; onBuy: () => void }) {
  const { product } = recommendation;
  return <article className={`flex min-h-[365px] flex-col rounded-[1.6rem] border p-4 ${emphasized ? 'border-[#F7A347]/50 bg-[#F7A347]/8 shadow-[0_18px_60px_rgba(247,163,71,.08)]' : 'border-white/10 bg-white/[.035]'}`}>
    <div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] ${emphasized ? 'bg-[#F7A347] text-black' : 'bg-black/30 text-[#FFC27A]'}`}>{label}</span>{product.stock !== undefined ? <span className="text-[8px] font-bold text-emerald-300">Stock {product.stock}</span> : null}</div>
    <div className="mt-3 grid h-32 place-items-center rounded-xl bg-white/95 p-2">{product.image_url ? <img src={product.image_url} alt={product.name} className="max-h-28 w-full object-contain" /> : <ThermometerSnowflake className="h-10 w-10 text-black/25" />}</div>
    <h3 className="mt-3 line-clamp-2 text-sm font-black leading-5">{product.name}</h3>
    <p className="mt-1 text-[9px] leading-4 text-white/40">{note}</p>
    <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-white/[.055] px-2 py-1 text-[8px] font-black text-white/45">{recommendation.capacity.toLocaleString('es-CL')} BTU</span>{isInverterProduct(product) ? <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-[8px] font-black text-cyan-200">Inverter</span> : null}</div>
    <div className="mt-auto pt-4"><strong className="text-xl text-[#FF9D3D]">{CLP.format(recommendation.finalPrice)}</strong><button type="button" disabled={disabled} onClick={onBuy} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F7A347] px-4 text-xs font-black text-[#111214] transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">{disabled ? 'Requiere evaluación' : 'Elegir y pagar'} <ChevronRight size={15} /></button></div>
  </article>;
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-2.5 text-[10px] font-black transition ${active ? 'border-[#F7A347] bg-[#F7A347] text-[#111214]' : 'border-white/10 bg-white/[.04] text-white/48 hover:bg-white/[.08]'}`}>{children}</button>;
}

function NumberField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><div className="flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[.055] px-3"><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none" /><span className="text-[9px] text-white/30">{suffix}</span></div></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#181a1e] px-3 text-xs font-bold text-white outline-none focus:border-[#F7A347]">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function EnergyMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.035] p-3"><span className="text-[#7FE5FF] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-sm">{value}</b><span className="mt-0.5 block text-[8px] uppercase tracking-[.1em] text-white/28">{label}</span></div>;
}

function Trust({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.03] p-3"><span className="text-[#F7A347] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-[10px]">{title}</b><span className="mt-1 block text-[8px] leading-4 text-white/30">{text}</span></div>;
}
