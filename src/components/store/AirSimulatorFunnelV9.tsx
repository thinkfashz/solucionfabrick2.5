'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  BedDouble,
  Box,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CookingPot,
  Droplets,
  Fan,
  Flame,
  Gauge,
  Headphones,
  Home,
  Leaf,
  Loader2,
  Minus,
  MoonStar,
  MoveHorizontal,
  Plus,
  Power,
  Ruler,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Sofa,
  Sparkles,
  ThermometerSnowflake,
  Users,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  AIR_ROOM_PROFILES,
  DEFAULT_ELECTRICITY_RATE_CLP_KWH,
  calculateAirSizing,
  detectAirCapacity,
  estimateAirEnergy,
  isInverterProduct,
  normalizeAirCatalogProducts,
  recommendAirProductTiers,
  recommendAirProducts,
  type AirCapacity,
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

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUMBER = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const BG = `${CLOUD}/c_fill,g_auto,w_1600,h_1200/e_blur:8/q_auto:eco/f_auto/v1788671813/air-bedroom-background.jpg`;
const YELLOW = '#F6C64A';

const climateLabels: Record<ClimateZone, string> = {
  norte: 'Norte cálido',
  centro: 'Zona central',
  costa: 'Costa',
  sur: 'Sur',
};

const modeIcons: Record<AirMode, ReactNode> = {
  auto: <Sparkles size={17} />,
  cool: <Snowflake size={17} />,
  dry: <Droplets size={17} />,
  fan: <Fan size={17} />,
  heat: <Flame size={17} />,
};

const roomIcons: Record<AirRoomType, ReactNode> = {
  dormitorio: <BedDouble size={22} />,
  living: <Sofa size={22} />,
  oficina: <BriefcaseBusiness size={22} />,
  cocina: <CookingPot size={22} />,
};

type TierEntry = {
  key: 'economy' | 'recommended' | 'premium';
  label: 'Ahorro' | 'Recomendado' | 'Premium';
  note: string;
  recommendation: AirRecommendation;
};

type CapabilityEntry = {
  product: AirCatalogProduct;
  capacity: AirCapacity;
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

function normalizeSpecKey(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function specification(product: AirCatalogProduct | undefined, keys: string[]) {
  if (!product?.specifications) return undefined;
  const normalized = new Map(Object.entries(product.specifications).map(([key, value]) => [normalizeSpecKey(key), value]));
  for (const key of keys) {
    const value = normalized.get(normalizeSpecKey(key));
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function specText(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function specNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function technologyLabel(product: AirCatalogProduct | undefined) {
  const fromSpec = specText(specification(product, ['tecnologia', 'tecnología', 'technology', 'tipo_compresor']));
  if (fromSpec) return fromSpec;
  return product && isInverterProduct(product) ? 'Inverter' : 'No informada';
}

function efficiencyLabel(product: AirCatalogProduct | undefined) {
  const classValue = specText(specification(product, ['clase_energetica', 'clasificacion_energetica', 'eficiencia', 'efficiency']));
  const seer = specText(specification(product, ['seer']));
  const eer = specText(specification(product, ['eer']));
  const cop = specText(specification(product, ['cop']));
  if (seer) return `SEER ${seer}`;
  if (eer) return `EER ${eer}`;
  if (cop) return `COP ${cop}`;
  if (classValue) return classValue;
  return 'Ficha no informa';
}

function coverageLabel(product: AirCatalogProduct | undefined, capacity: number) {
  const fromSpec = specNumber(specification(product, ['area_recomendada_m2', 'cobertura_m2', 'superficie_m2', 'area_m2', 'metros_cuadrados']));
  if (fromSpec && fromSpec > 0) return { value: `${NUMBER.format(fromSpec)} m²`, source: 'ficha técnica' };
  return { value: `≈ ${Math.round(capacity / 600)} m²`, source: 'base Fabrick*' };
}

function peopleLabel(product: AirCatalogProduct | undefined, currentPeople: number, compatible: boolean) {
  const fromSpec = specNumber(specification(product, ['personas', 'personas_recomendadas', 'capacidad_personas', 'max_personas']));
  if (fromSpec && fromSpec > 0) return `${Math.round(fromSpec)} pers · ficha`;
  return `${currentPeople} pers · ${compatible ? 'compatible ahora' : 'carga alta'}`;
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

  const [measuresOpen, setMeasuresOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [selectedTierKey, setSelectedTierKey] = useState<TierEntry['key']>('recommended');

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

  const capabilityEntries = useMemo<CapabilityEntry[]>(() => {
    const seen = new Set<number>();
    const result: CapabilityEntry[] = [];
    for (const product of products) {
      if (product.activo === false || (product.stock !== undefined && product.stock <= 0)) continue;
      const capacity = detectAirCapacity(product);
      if (!capacity || seen.has(capacity)) continue;
      seen.add(capacity);
      result.push({ product, capacity });
    }
    return result.sort((a, b) => a.capacity - b.capacity);
  }, [products]);

  const selectedTier = tierEntries.find((entry) => entry.key === selectedTierKey) || tierEntries[0];
  const dailyKwh = operation.monthlyKwh / 30;
  const dailyCost = operation.monthlyCostClp / 30;

  useEffect(() => {
    if (!tierEntries.length) return;
    if (!tierEntries.some((entry) => entry.key === selectedTierKey)) {
      setSelectedTierKey(tierEntries.find((entry) => entry.key === 'recommended')?.key || tierEntries[0].key);
    }
  }, [tierEntries, selectedTierKey]);

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
    <main className="relative min-h-screen overflow-hidden bg-[#06080c] text-white">
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <img src={BG} alt="" className="h-full w-full scale-[1.03] object-cover opacity-[.32]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,6,9,.7),rgba(4,6,9,.9)_55%,#06080c_92%),linear-gradient(90deg,rgba(4,6,9,.88),rgba(4,6,9,.48)_50%,rgba(4,6,9,.84))]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[980px] px-3 pb-16 pt-3 sm:px-5 sm:pt-5 lg:px-6">
        <header className="flex items-center justify-between border-b border-white/[.08] pb-3">
          <button type="button" onClick={() => router.push('/')} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 text-[11px] font-black uppercase tracking-[.11em] backdrop-blur-md transition hover:border-white/35" aria-label="Volver al inicio">
            <ArrowLeft size={17} /> <span className="hidden xs:inline">Volver</span>
          </button>
          <img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-11 w-auto max-w-[190px] object-contain sm:h-12" />
          <span className="rounded-full border border-[#F6C64A]/55 bg-[#F6C64A]/[.07] px-3 py-2 text-[10px] font-black tracking-[.08em] text-[#F6C64A]">{targetCapacityLabel} BTU</span>
        </header>

        <section className="pt-7 text-center sm:pt-9">
          <p className="text-[9px] font-black uppercase tracking-[.42em] text-[#F6C64A]">Confort todo el año</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-[clamp(2.35rem,8vw,5.1rem)] font-black leading-[.94] tracking-[-.065em]">Calcula tu clima <span className="text-[#F6C64A]">ideal</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-[13px] leading-6 text-white/58 sm:text-base">Ingresa las medidas de tu espacio y conoce la capacidad recomendada sin perder los ajustes avanzados de la calculadora.</p>
        </section>

        <section className="mt-5">
          <AirVisual
            roomType={roomType}
            targetTempC={targetTempC}
            powerOn={powerOn}
            capacityLabel={displayedProductCapacityLabel}
            resolvedMode={operation.resolvedMode}
            airflowPercent={operation.airflowPercent}
          />
        </section>

        <CapabilityRail entries={capabilityEntries} currentPeople={people} requiredBtu={sizing.requiredBtu} primaryCapacity={primary?.capacity} />

        <section className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <FeatureStat icon={<Snowflake />} value={`${displayedProductCapacityLabel} BTU`} label="capacidad" />
          <FeatureStat icon={<Leaf />} value={primary ? technologyLabel(primary.product) : 'Tecnología'} label="tecnología" />
          <FeatureStat icon={<Zap />} value={primary ? efficiencyLabel(primary.product) : operation.loadLabel} label="eficiencia/ficha" />
          <FeatureStat icon={<Users />} value={String(people)} label="personas evaluadas" />
          <FeatureStat icon={<Home />} value={`${NUMBER.format(sizing.areaM2)} m²`} label="espacio calculado" />
          <FeatureStat icon={<MoveHorizontal />} value={`${NUMBER.format(sizing.volumeM3)} m³`} label="volumen" />
        </section>

        <AccordionSection
          step="1"
          icon={<Box />}
          title="Medidas y condiciones"
          summary={`${NUMBER.format(lengthM)} × ${NUMBER.format(widthM)} × ${NUMBER.format(heightM)} m · ${people} ${people === 1 ? 'persona' : 'personas'}`}
          open={measuresOpen}
          onToggle={() => setMeasuresOpen((value) => !value)}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StepperField label="Largo (m)" value={lengthM} min={1.5} max={20} step={0.1} onChange={setLengthM} />
            <StepperField label="Ancho (m)" value={widthM} min={1.5} max={20} step={0.1} onChange={setWidthM} />
            <StepperField label="Alto (m)" value={heightM} min={2} max={6} step={0.1} onChange={setHeightM} />
            <StepperField label="Personas" value={people} min={1} max={30} step={1} onChange={(value) => setPeople(Math.round(value))} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <NumberField label="Ventanas aprox." value={windowAreaM2} min={0} max={30} step={0.5} suffix="m²" onChange={setWindowAreaM2} />
            <SelectField label="Sol" value={sunExposure} onChange={(value) => setSunExposure(value as SunExposure)} options={[['baja', 'Poco sol'], ['media', 'Sol medio'], ['alta', 'Mucho sol']]} />
            <SelectField label="Aislación" value={insulation} onChange={(value) => setInsulation(value as InsulationLevel)} options={[['buena', 'Buena'], ['normal', 'Normal'], ['baja', 'Baja']]} />
          </div>
          <div className="mt-2"><SelectField label="Zona climática" value={climateZone} onChange={(value) => setClimateZone(value as ClimateZone)} options={(Object.keys(climateLabels) as ClimateZone[]).map((key) => [key, climateLabels[key]])} /></div>
        </AccordionSection>

        <AccordionSection
          step="2"
          icon={<Home />}
          title="Tipo de ambiente"
          summary={`${roomProfile.label} · ${roomProfile.description}`}
          open={roomOpen}
          onToggle={() => setRoomOpen((value) => !value)}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(AIR_ROOM_PROFILES) as AirRoomType[]).map((room) => (
              <RoomChoice
                key={room}
                active={roomType === room}
                icon={roomIcons[room]}
                label={AIR_ROOM_PROFILES[room].label}
                description={AIR_ROOM_PROFILES[room].description}
                onClick={() => setRoomType(room)}
              />
            ))}
          </div>
          <p className="mt-3 text-[9px] leading-5 text-white/38">El ambiente modifica la carga interna del cálculo; no es solo una etiqueta visual.</p>
        </AccordionSection>

        <AccordionSection
          step="3"
          icon={<Gauge />}
          title="Resultado, consumo y control"
          summary={`${targetCapacityLabel} BTU · ${NUMBER.format(operation.monthlyKwh)} kWh/mes · ${CLP.format(operation.monthlyCostClp)}/mes`}
          open={resultsOpen}
          onToggle={() => setResultsOpen((value) => !value)}
        >
          <div className="grid grid-cols-3 gap-2">
            <ResultMetric icon={<Ruler />} label="Área estimada" value={`${NUMBER.format(sizing.areaM2)} m²`} />
            <ResultMetric icon={<Box />} label="Volumen" value={`${NUMBER.format(sizing.volumeM3)} m³`} />
            <ResultMetric accent icon={<Sparkles />} label="Capacidad sugerida" value={`${targetCapacityLabel} BTU`} />
          </div>

          {catalogUsesSuperiorCapacity ? <p className="mt-3 rounded-xl border border-cyan-300/12 bg-cyan-300/[.04] px-3 py-2 text-[9px] leading-4 text-white/48">La demanda apunta a {sizing.recommendedCapacity.toLocaleString('es-CL')} BTU, pero el equipo disponible recomendado sube a {primary?.capacity.toLocaleString('es-CL')} BTU. Nunca bajamos la capacidad solo para vender.</p> : null}

          <MiniAccordion title="Control remoto" summary={`${AIR_MODE_LABELS[mode]} · ${targetTempC}° · ventilador ${AIR_FAN_LABELS[fanSpeed]}`} open={remoteOpen} onToggle={() => setRemoteOpen((value) => !value)}>
            <AirRemoteControl
              powerOn={powerOn}
              setPowerOn={setPowerOn}
              mode={mode}
              setMode={setMode}
              fanSpeed={fanSpeed}
              setFanSpeed={setFanSpeed}
              targetTempC={targetTempC}
              setTargetTempC={setTargetTempC}
              eco={eco}
              swing={swing}
              sleep={sleep}
              turbo={turbo}
              toggleEco={toggleEco}
              toggleSwing={() => setSwing((value) => !value)}
              toggleSleep={() => { setSleep((value) => !value); setTurbo(false); }}
              toggleTurbo={toggleTurbo}
            />
          </MiniAccordion>

          <div className="mt-3 rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[9px] font-black uppercase tracking-[.14em] text-white/35">Consumo energético estimado</p><h3 className="mt-1 text-lg font-black">Cuánto usaría con tu configuración</h3></div>
              <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[8px] font-black text-white/45">{hoursPerDay} h/día · {hoursPerDay * 30} h/mes</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <EnergyMetric icon={<Zap />} label="Potencia instantánea" value={`${NUMBER.format(operation.electricalKwNow)} kW`} detail="demanda mientras opera" />
              <EnergyMetric icon={<BatteryCharging />} label="Uso diario" value={`${NUMBER.format(dailyKwh)} kWh`} detail={`≈ ${CLP.format(dailyCost)}/día`} />
              <EnergyMetric icon={<Gauge />} label="Uso mensual" value={`${NUMBER.format(operation.monthlyKwh)} kWh`} detail={`${operation.loadLabel} · ${operation.loadPercent}% carga`} />
              <EnergyMetric icon={<Wind />} label="Flujo simulado" value={`${operation.airflowPercent}%`} detail={swing ? 'swing activo' : 'flujo fijo'} />
            </div>

            <label className="mt-4 block text-[9px] font-bold text-white/45">Horas de uso al día <span className="float-right text-white/70">{hoursPerDay} h</span><input type="range" min="1" max="16" step="1" value={hoursPerDay} onChange={(event) => setHoursPerDay(Number(event.target.value))} className="mt-2 h-2 w-full accent-[#F6C64A]" /></label>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-[linear-gradient(90deg,#72D9FF,#F6C64A)] transition-[width]" style={{ width: `${Math.max(4, Math.min(100, operation.loadPercent))}%` }} /></div>
            <div className="mt-2 flex justify-between text-[8px] text-white/28"><span>Carga baja</span><span>Carga térmica estimada {operation.loadPercent}%</span><span>Carga alta</span></div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-emerald-300/15 bg-emerald-300/[.05] p-4"><span className="text-[8px] font-black uppercase tracking-[.12em] text-white/35">Consumo energético estimado</span><strong className="mt-1 block text-xl font-black">{NUMBER.format(operation.monthlyKwh)} kWh/mes</strong><span className="mt-1 block text-[8px] leading-4 text-white/30">No es un medidor: cambia con clima, instalación, filtro, setpoint y equipo real.</span></div>
              <div className="rounded-[1.2rem] border border-[#F6C64A]/18 bg-[#F6C64A]/[.05] p-4"><span className="text-[8px] font-black uppercase tracking-[.12em] text-white/35">Costo mensual estimado</span><strong className="mt-1 block text-xl font-black text-[#F6C64A]">{CLP.format(operation.monthlyCostClp)}/mes</strong><span className="mt-1 block text-[8px] leading-4 text-white/30">Tarifa usada: {CLP.format(DEFAULT_ELECTRICITY_RATE_CLP_KWH)}/kWh.</span></div>
            </div>
          </div>

          <div className="mt-3 rounded-[1.4rem] border border-[#F6C64A]/18 bg-[linear-gradient(145deg,rgba(246,198,74,.08),rgba(8,10,13,.55))] p-4">
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#F6C64A]">¿Por qué inverter?</p>
            <h3 className="mt-1 text-base font-black">Modula el compresor para sostener la temperatura con menos ciclos bruscos.</h3>
            <p className="mt-2 text-xs leading-5 text-white/55">En el escenario base, la diferencia estimada frente a un equipo tradicional equivalente es de <b className="text-white">{baseEnergy.estimatedSavingsPercent}%</b>, equivalente a cerca de <b className="text-emerald-200">{CLP.format(baseEnergy.estimatedMonthlySavingsClp)}/mes</b>.</p>
            <p className="mt-2 text-[8px] leading-4 text-white/30">El resultado cambia con el modelo, clima, aislación, tarifa, instalación, modo seleccionado y horas de uso.</p>
          </div>
        </AccordionSection>

        <AccordionSection
          step="4"
          icon={<ShoppingCart />}
          title="Aire recomendado"
          summary={selectedTier ? `${selectedTier.label} · ${selectedTier.recommendation.product.name}` : 'Buscando equipos compatibles'}
          open={catalogOpen}
          onToggle={() => setCatalogOpen((value) => !value)}
        >
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Opciones del catálogo</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Elige por relación precio, capacidad y ficha técnica.</h2></div><span className="inline-flex items-center gap-2 text-[9px] font-bold text-white/38">{catalogRefreshing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Actualizando catálogo</> : <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />Stock sincronizado</>}</span></div>

          {catalogError ? <div className="mt-4 rounded-xl border border-[#F6C64A]/20 bg-[#F6C64A]/8 p-3 text-xs text-[#F6C64A]">{catalogError}</div> : null}
          {sizing.requiresMultiUnit ? <div className="mt-4 rounded-xl border border-[#F6C64A]/25 bg-[#F6C64A]/8 p-4 text-xs leading-5 text-white/60">La referencia de productos se mantiene visible, pero bloqueamos compra directa porque el espacio requiere dos o más unidades y debe revisarse la distribución.</div> : null}

          {tierEntries.length > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl border border-white/8 bg-black/25 p-1">
                {tierEntries.map((entry) => <TierSelector key={entry.key} active={selectedTier?.key === entry.key} label={entry.label} price={entry.recommendation.finalPrice} onClick={() => setSelectedTierKey(entry.key)} />)}
              </div>
              {selectedTier ? <RecommendationCard entry={selectedTier} currentPeople={people} requiredBtu={sizing.requiredBtu} disabled={sizing.requiresMultiUnit} onBuy={() => goCheckout(selectedTier.recommendation)} /> : null}
            </>
          ) : null}

          {!catalogRefreshing && recommendations.length === 0 ? <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[.035] p-6 text-center"><ShoppingCart className="mx-auto h-8 w-8 text-white/30" /><h3 className="mt-3 font-black">No hay un equipo compatible con stock.</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-white/40">No mostraremos una capacidad inferior solo para cerrar la venta. Revisa la tienda o solicita abastecimiento e instalación.</p><button type="button" onClick={() => router.push('/tienda')} className="mt-4 rounded-full border border-white/12 bg-white/[.06] px-5 py-3 text-xs font-black">Ver tienda</button></div> : null}

          <div className="mt-5 grid gap-2 sm:grid-cols-3"><Trust icon={<ShieldCheck />} title="Precio actualizado" text="Checkout recalcula desde servidor" /><Trust icon={<BadgeCheck />} title="Stock reservado" text="Reserva atómica antes del pago" /><Trust icon={<Waves />} title="Sin sobreventa" text="No recomendamos capacidad inferior" /></div>
          {primary ? <p className="mt-4 text-center text-[9px] text-white/28">Equipo sugerido: {primary.product.name} · {primary.capacity.toLocaleString('es-CL')} BTU. {isInverterProduct(primary.product) ? 'La ficha indica tecnología inverter.' : 'La ficha no declara tecnología inverter.'} El servidor vuelve a validar precio, stock y despacho antes de abrir Mercado Pago.</p> : null}
        </AccordionSection>

        <div className="sticky bottom-3 z-20 mt-5 px-1 sm:static sm:px-0">
          {primary ? <button type="button" disabled={sizing.requiresMultiUnit} onClick={() => goCheckout(primary)} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#F6C64A] px-6 text-sm font-black uppercase tracking-[.05em] text-[#101114] shadow-[0_16px_45px_rgba(246,198,74,.23)] transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"><ShoppingCart size={18} />{sizing.requiresMultiUnit ? 'Requiere evaluación' : 'Continuar al pago'}<ChevronRight size={18} /></button> : null}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[9px] text-white/38"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#F6C64A]" />Compra segura</span><span className="inline-flex items-center gap-1.5"><Headphones size={13} className="text-[#F6C64A]" />Asesoría experta</span><span className="inline-flex items-center gap-1.5"><BadgeCheck size={13} className="text-[#F6C64A]" />Productos garantizados</span></div>
        </div>
      </div>
    </main>
  );
}

function CapabilityRail({ entries, currentPeople, requiredBtu, primaryCapacity }: { entries: CapabilityEntry[]; currentPeople: number; requiredBtu: number; primaryCapacity?: AirCapacity }) {
  if (!entries.length) return null;
  return (
    <section className="mt-3 rounded-[1.4rem] border border-white/10 bg-black/30 p-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#F6C64A]">Capacidades del catálogo</p><p className="mt-1 text-[9px] text-white/35">Ficha técnica cuando existe; cobertura base Fabrick solo cuando la ficha no declara m².</p></div><Ruler size={16} className="shrink-0 text-white/28" /></div>
      <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {entries.map(({ product, capacity }) => {
          const coverage = coverageLabel(product, capacity);
          const compatible = capacity >= requiredBtu;
          return (
            <article key={product.id} className={`min-w-[210px] snap-start rounded-2xl border p-3 ${capacity === primaryCapacity ? 'border-[#F6C64A]/45 bg-[#F6C64A]/[.06]' : 'border-white/8 bg-white/[.025]'}`}>
              <div className="flex items-center justify-between gap-2"><b className="text-sm text-white">{Math.round(capacity / 1000)}K BTU</b>{capacity === primaryCapacity ? <span className="rounded-full bg-[#F6C64A] px-2 py-1 text-[7px] font-black text-black">RECOMENDADO</span> : null}</div>
              <p className="mt-1 line-clamp-1 text-[8px] text-white/35">{product.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <MiniSpec label="Espacio" value={coverage.value} detail={coverage.source} />
                <MiniSpec label="Personas" value={peopleLabel(product, currentPeople, compatible)} />
                <MiniSpec label="Tecnología" value={technologyLabel(product)} />
                <MiniSpec label="Eficiencia" value={efficiencyLabel(product)} />
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-2 text-[7px] leading-4 text-white/24">*La referencia base usa 600 BTU/h por m² a 2,5 m antes de corregir altura, personas, ventanas, uso, sol, aislación y clima. La ficha del fabricante tiene prioridad cuando declara cobertura.</p>
    </section>
  );
}

function AirVisual({ roomType, targetTempC, powerOn, capacityLabel, resolvedMode, airflowPercent }: { roomType: AirRoomType; targetTempC: number; powerOn: boolean; capacityLabel: string; resolvedMode: 'cool' | 'dry' | 'fan' | 'heat'; airflowPercent: number }) {
  const warm = resolvedMode === 'heat';
  const particleRgb = warm ? '246,198,74' : '91,200,255';
  const modeText = resolvedMode === 'heat' ? 'CALOR' : resolvedMode === 'dry' ? 'SECO' : resolvedMode === 'fan' ? 'VENTILAR' : 'FRÍO';
  const particles = Array.from({ length: 18 }, (_, index) => index);
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] sm:min-h-[390px]" style={{ '--particle-rgb': particleRgb, '--airflow': `${Math.max(20, airflowPercent)}%` } as React.CSSProperties}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,.08),transparent_35%),linear-gradient(180deg,rgba(7,10,13,.08),rgba(7,10,13,.54))]" />
      <div className="absolute inset-x-[8%] top-[20%] h-52 rounded-full blur-3xl" style={{ background: `rgba(${particleRgb},.09)` }} />
      {powerOn ? particles.map((index) => <span key={index} className="air-particle absolute h-1.5 w-1.5 rounded-full" style={{ left: `${12 + ((index * 17) % 76)}%`, top: `${54 + ((index * 13) % 31)}%`, animationDelay: `${(index % 7) * .18}s`, animationDuration: `${2.1 + (index % 5) * .35}s`, background: `rgba(${particleRgb},${.28 + (index % 5) * .11})`, boxShadow: `0 0 15px rgba(${particleRgb},.7)` }} />) : null}

      <div className="absolute left-1/2 top-[48%] w-[82%] max-w-[690px] -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-[122px] rounded-[34px] border border-white/70 bg-[linear-gradient(180deg,#fbfcfd,#e8edf2_60%,#cfd7df)] shadow-[0_28px_65px_rgba(0,0,0,.42),inset_0_2px_2px_rgba(255,255,255,.95)] sm:h-[150px] sm:rounded-[42px]">
          <div className="absolute left-[8%] top-[37%] text-[#7b858f]"><b className="block text-[10px] tracking-[.28em] sm:text-xs">FABRICK</b><span className="mt-1 block text-[7px] tracking-[.24em] text-[#a7b0b8] sm:text-[8px]">INVERTER</span></div>
          <div className="absolute right-[10%] top-[30%] text-3xl font-light tracking-[-.06em] sm:text-4xl" style={{ color: warm ? '#F6C64A' : '#8BE8FF', textShadow: warm ? '0 0 16px rgba(246,198,74,.45)' : '0 0 16px rgba(91,200,255,.45)' }}>{targetTempC}°</div>
          <div className="absolute inset-x-[7%] bottom-[12%] h-[24%] overflow-hidden rounded-b-[24px] rounded-t-lg bg-[#1a2027] shadow-[inset_0_4px_8px_rgba(0,0,0,.7)]"><div className="absolute inset-x-[3%] top-[30%] h-1 rounded-full bg-white/15" /><div className="absolute inset-x-[5%] bottom-[24%] grid grid-cols-12 gap-1">{Array.from({ length: 12 }).map((_, index) => <span key={index} className="h-3 rounded-full bg-white/20" />)}</div></div>
        </div>
      </div>

      {powerOn ? <div className="airflow absolute left-1/2 top-[61%] h-28 w-[72%] -translate-x-1/2 opacity-70" style={{ background: `radial-gradient(ellipse at top, rgba(${particleRgb},.24), transparent 65%)`, filter: 'blur(13px)' }} /> : null}
      <div className="absolute right-[8%] top-[13%] rounded-2xl border px-4 py-3 text-left backdrop-blur-xl" style={{ borderColor: `rgba(${particleRgb},.42)`, background: `rgba(${particleRgb},.12)`, boxShadow: `0 0 26px rgba(${particleRgb},.13)` }}><div className="flex items-center gap-2"><strong className="text-2xl">{targetTempC}°</strong>{warm ? <Flame size={18} /> : <Snowflake size={18} />}</div><span className="mt-1 block text-[8px] font-black uppercase tracking-[.14em] opacity-70">{modeText}</span></div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.15em] text-white/45 backdrop-blur-md">{AIR_ROOM_PROFILES[roomType].label} · {capacityLabel} BTU</div>
      <style jsx>{`
        .air-particle { animation-name: airFloat; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .airflow { animation: airBreath 2.7s ease-in-out infinite; }
        @keyframes airFloat { 0% { transform: translate3d(0,-4px,0) scale(.72); opacity:.18; } 45% { opacity:.88; } 100% { transform: translate3d(12px,52px,0) scale(1.08); opacity:0; } }
        @keyframes airBreath { 0%,100% { transform: translateX(-50%) scaleX(.92); opacity:.45; } 50% { transform: translateX(-50%) scaleX(1.08); opacity:.75; } }
        @media (prefers-reduced-motion: reduce) { .air-particle,.airflow { animation:none !important; } }
      `}</style>
    </div>
  );
}

function AccordionSection({ step, icon, title, summary, open, onToggle, children }: { step: string; icon: ReactNode; title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className="mt-3 overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#0b1016]/80 shadow-[0_20px_70px_rgba(0,0,0,.16)] backdrop-blur-xl"><button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#F6C64A]/18 bg-[#F6C64A]/[.07] text-[#F6C64A] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[8px] font-black uppercase tracking-[.16em] text-white/30">Paso {step}</span><b className="mt-0.5 block text-sm sm:text-base">{title}</b><span className="mt-1 block truncate text-[9px] text-white/35">{summary}</span></span><ChevronDown className={`h-5 w-5 shrink-0 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-white/[.07] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div> : null}</section>;
}

function MiniAccordion({ title, summary, open, onToggle, children }: { title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/22"><button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left"><span className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.04] text-[#72D9FF]"><Power size={15} /></span><span className="min-w-0 flex-1"><b className="block text-xs">{title}</b><span className="mt-0.5 block truncate text-[8px] text-white/35">{summary}</span></span><ChevronDown className={`h-4 w-4 text-white/35 transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-white/[.07] p-3 sm:p-4">{children}</div> : null}</div>;
}

function AirRemoteControl({ powerOn, setPowerOn, mode, setMode, fanSpeed, setFanSpeed, targetTempC, setTargetTempC, eco, swing, sleep, turbo, toggleEco, toggleSwing, toggleSleep, toggleTurbo }: { powerOn: boolean; setPowerOn: (value: boolean | ((value: boolean) => boolean)) => void; mode: AirMode; setMode: (value: AirMode) => void; fanSpeed: AirFanSpeed; setFanSpeed: (value: AirFanSpeed) => void; targetTempC: number; setTargetTempC: (value: number | ((value: number) => number)) => void; eco: boolean; swing: boolean; sleep: boolean; turbo: boolean; toggleEco: () => void; toggleSwing: () => void; toggleSleep: () => void; toggleTurbo: () => void }) {
  const fanKeys = Object.keys(AIR_FAN_LABELS) as AirFanSpeed[];
  const nextFan = () => setFanSpeed(fanKeys[(fanKeys.indexOf(fanSpeed) + 1) % fanKeys.length]);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[250px_1fr]">
      <div className="mx-auto w-full max-w-[238px] rounded-[2.5rem] border-[3px] border-[#c9ced3] bg-[linear-gradient(180deg,#f8f9fa,#e9edf0)] p-4 text-[#15191d] shadow-[0_24px_60px_rgba(0,0,0,.36),inset_0_1px_0_white]">
        <div className="flex items-center justify-between px-1"><div><b className="text-[9px] tracking-[.22em]">FABRICK</b><span className="ml-1 text-[7px] text-black/35">AIR</span></div><button type="button" onClick={() => setPowerOn((value) => !value)} aria-label={powerOn ? 'Apagar control' : 'Encender control'} className={`grid h-9 w-9 place-items-center rounded-full border shadow-sm ${powerOn ? 'border-red-200 bg-red-50 text-red-500' : 'border-black/10 bg-white text-black/35'}`}><Power size={15} /></button></div>

        <div className="mt-3 rounded-[1rem] border-2 border-[#aeb6a7] bg-[#cfd8c4] p-3 font-mono shadow-[inset_0_2px_5px_rgba(25,40,25,.18)]">
          <div className="flex items-start justify-between"><span className="text-[9px] font-black uppercase tracking-[.08em]">{powerOn ? AIR_MODE_LABELS[mode] : 'OFF'}</span><span className="text-[8px]">{eco ? 'ECO ' : ''}{swing ? '↕' : ''}</span></div>
          <div className="mt-1 flex items-end justify-between"><strong className="text-[42px] font-black leading-none tracking-[-.1em]">{targetTempC}<span className="ml-1 align-top text-base">°C</span></strong><div className="pb-1 text-right text-[8px]"><b className="block">FAN {AIR_FAN_LABELS[fanSpeed].toUpperCase()}</b><span>{sleep ? 'SLEEP ' : ''}{turbo ? 'TURBO' : ''}</span></div></div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <RemoteKey label="MODE" active={false} onClick={() => { const keys = Object.keys(AIR_MODE_LABELS) as AirMode[]; setMode(keys[(keys.indexOf(mode) + 1) % keys.length]); }}><Sparkles size={14} /></RemoteKey>
          <RemoteKey label="TEMP +" active={false} disabled={mode === 'fan'} onClick={() => setTargetTempC((value) => Math.min(30, value + 1))}><Plus size={15} /></RemoteKey>
          <RemoteKey label="FAN" active={false} onClick={nextFan}><Fan size={14} /></RemoteKey>
          <RemoteKey label="SWING" active={swing} onClick={toggleSwing}><Waves size={14} /></RemoteKey>
          <RemoteKey label="TEMP −" active={false} disabled={mode === 'fan'} onClick={() => setTargetTempC((value) => Math.max(16, value - 1))}><Minus size={15} /></RemoteKey>
          <RemoteKey label="ECO" active={eco} onClick={toggleEco}><Leaf size={14} /></RemoteKey>
          <RemoteKey label="SLEEP" active={sleep} onClick={toggleSleep}><MoonStar size={14} /></RemoteKey>
          <RemoteKey label="TURBO" active={turbo} onClick={toggleTurbo}><Gauge size={14} /></RemoteKey>
          <RemoteKey label="POWER" active={powerOn} onClick={() => setPowerOn((value) => !value)}><Power size={14} /></RemoteKey>
        </div>
        <div className="mx-auto mt-4 h-1.5 w-10 rounded-full bg-black/12" />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3"><div><span className="text-[8px] font-black uppercase tracking-[.14em] text-white/35">Temperatura objetivo</span><strong className="mt-1 block text-3xl font-black text-[#72D9FF]">{targetTempC}°C</strong></div><span className={`rounded-full px-3 py-1.5 text-[8px] font-black ${powerOn ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/[.05] text-white/35'}`}>{powerOn ? 'ENCENDIDO' : 'APAGADO'}</span></div>
        <input aria-label="Temperatura objetivo" disabled={mode === 'fan'} type="range" min="16" max="30" step="1" value={targetTempC} onChange={(event) => setTargetTempC(Number(event.target.value))} className="mt-3 h-2 w-full accent-[#F6C64A] disabled:opacity-25" />
        <div className="mt-4 grid grid-cols-5 gap-1.5">{(Object.keys(AIR_MODE_LABELS) as AirMode[]).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`grid min-h-14 place-items-center gap-1 rounded-xl border px-1 py-2 text-[8px] font-black ${mode === item ? 'border-[#F6C64A]/45 bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/8 bg-white/[.025] text-white/40'}`}>{modeIcons[item]}<span>{AIR_MODE_LABELS[item]}</span></button>)}</div>
        <p className="mt-3 text-[9px] leading-5 text-white/36">Este control replica la lógica del simulador: modo, temperatura, ventilador, Eco, Swing, Sueño y Turbo cambian inmediatamente la simulación y el consumo estimado.</p>
      </div>
    </div>
  );
}

function RemoteKey({ label, active, disabled = false, onClick, children }: { label: string; active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`grid min-h-12 place-items-center rounded-full border text-[7px] font-black shadow-sm transition disabled:opacity-30 ${active ? 'border-[#d2aa37] bg-[#F6C64A] text-black' : 'border-black/10 bg-white text-black/55'}`}><span className="grid place-items-center">{children}</span><span>{label}</span></button>;
}

function RoomChoice({ active, icon, label, description, onClick }: { active: boolean; icon: ReactNode; label: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-[88px] items-center gap-3 rounded-[1.2rem] border p-3 text-left transition ${active ? 'border-[#F6C64A]/55 bg-[#F6C64A]/10 shadow-[0_0_28px_rgba(246,198,74,.08)]' : 'border-white/10 bg-white/[.02] hover:bg-white/[.05]'}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? 'bg-[#F6C64A] text-black' : 'bg-white/[.05] text-white/55'}`}>{icon}</span><span className="min-w-0 flex-1"><b className="block text-[11px] text-white">{label}</b><span className="mt-1 line-clamp-2 block text-[8px] leading-4 text-white/35">{description}</span></span>{active ? <Check size={16} className="shrink-0 text-[#F6C64A]" /> : null}</button>;
}

function TierSelector({ active, label, price, onClick }: { active: boolean; label: string; price: number; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-2 py-2.5 text-center transition ${active ? 'bg-[#F6C64A] text-black shadow-[0_8px_24px_rgba(246,198,74,.16)]' : 'text-white/45 hover:bg-white/[.04]'}`}><b className="block text-[9px]">{label}</b><span className="mt-0.5 block text-[7px] opacity-70">{CLP.format(price)}</span></button>;
}

function RecommendationCard({ entry, currentPeople, requiredBtu, disabled, onBuy }: { entry: TierEntry; currentPeople: number; requiredBtu: number; disabled: boolean; onBuy: () => void }) {
  const recommendation = entry.recommendation;
  const product = recommendation.product;
  const coverage = coverageLabel(product, recommendation.capacity);
  const compatible = recommendation.capacity >= requiredBtu;
  return <article className="mt-3 grid gap-4 rounded-[1.4rem] border border-white/10 bg-white/[.025] p-4 md:grid-cols-[210px_1fr]">
    <div className="grid min-h-44 place-items-center rounded-[1.15rem] bg-white/[.96] p-3">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" className="max-h-40 w-full object-contain" /> : <ThermometerSnowflake className="h-12 w-12 text-black/20" />}</div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#F6C64A] px-2.5 py-1 text-[8px] font-black uppercase text-black">{entry.label}</span>{product.stock !== undefined ? <span className="text-[8px] font-bold text-emerald-300">Stock {product.stock}</span> : null}<span className="text-[8px] text-white/35">{recommendation.match === 'ideal' ? 'Capacidad ideal' : 'Capacidad superior segura'}</span></div><h3 className="mt-2 text-lg font-black leading-6">{product.name}</h3><p className="mt-1 text-[9px] leading-4 text-white/42">{entry.note}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><MiniSpec label="Capacidad" value={`${recommendation.capacity.toLocaleString('es-CL')} BTU`} /><MiniSpec label="Cobertura" value={coverage.value} detail={coverage.source} /><MiniSpec label="Personas" value={peopleLabel(product, currentPeople, compatible)} /><MiniSpec label="Tecnología" value={technologyLabel(product)} /></div>
      <div className="mt-2 grid grid-cols-2 gap-2"><MiniSpec label="Eficiencia" value={efficiencyLabel(product)} /><MiniSpec label="Tu demanda" value={`${requiredBtu.toLocaleString('es-CL')} BTU`} detail={compatible ? 'compatible' : 'requiere más capacidad'} /></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><strong className="text-2xl text-[#F6C64A]">{CLP.format(recommendation.finalPrice)}</strong><button type="button" disabled={disabled} onClick={onBuy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-5 text-xs font-black text-[#111214] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30">{disabled ? 'Requiere evaluación' : 'Elegir y pagar'} <ChevronRight size={15} /></button></div>
    </div>
  </article>;
}

function MiniSpec({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-xl border border-white/[.07] bg-black/20 p-2.5"><span className="block text-[7px] font-black uppercase tracking-[.1em] text-white/28">{label}</span><b className="mt-1 block text-[9px] leading-4 text-white/75">{value}</b>{detail ? <span className="mt-0.5 block text-[7px] text-white/25">{detail}</span> : null}</div>;
}

function FeatureStat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return <div className="min-h-[86px] rounded-[1.25rem] border border-white/10 bg-black/28 p-3 text-center backdrop-blur-md"><span className="mx-auto block w-fit text-[#72D9FF] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><b className="mt-2 block truncate text-[10px] sm:text-xs" title={value}>{value}</b><span className="mt-1 block text-[8px] text-white/34">{label}</span></div>;
}

function ResultMetric({ icon, label, value, accent = false }: { icon: ReactNode; label: string; value: string; accent?: boolean }) {
  return <div className="min-w-0 rounded-[1.2rem] border border-white/10 bg-black/25 p-3 sm:p-4"><span className={`block w-fit ${accent ? 'text-[#F6C64A]' : 'text-[#72D9FF]'} [&>svg]:h-5 [&>svg]:w-5`}>{icon}</span><span className="mt-2 block text-[8px] text-white/35">{label}</span><b className={`mt-1 block truncate text-sm sm:text-lg ${accent ? 'text-[#F6C64A]' : 'text-white'}`}>{value}</b></div>;
}

function StepperField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const adjust = (delta: number) => onChange(Math.min(max, Math.max(min, Number((value + delta).toFixed(decimals)))));
  return <div className="rounded-[1.15rem] border border-white/10 bg-black/25 p-3"><span className="text-[9px] font-bold text-white/55">{label}</span><div className="mt-2 flex items-center gap-2"><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-xl font-black text-white outline-none" /><button type="button" onClick={() => adjust(-step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[.04]" aria-label={`Disminuir ${label}`}><Minus size={13} /></button><button type="button" onClick={() => adjust(step)} className="grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/[.04]" aria-label={`Aumentar ${label}`}><Plus size={13} /></button></div></div>;
}

function NumberField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><div className="flex min-h-11 items-center rounded-xl border border-white/10 bg-black/25 px-3"><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none" /><span className="text-[9px] text-white/30">{suffix}</span></div></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <label className="grid gap-1.5 text-[9px] font-bold text-white/48"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-[#10151b] px-3 text-xs font-bold text-white outline-none focus:border-[#F6C64A]">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

function EnergyMetric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-white/8 bg-black/20 p-3"><span className="text-[#72D9FF] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-sm">{value}</b><span className="mt-0.5 block text-[8px] uppercase tracking-[.08em] text-white/28">{label}</span><span className="mt-1 block text-[7px] leading-3 text-white/24">{detail}</span></div>;
}

function Trust({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.02] p-3"><span className="text-[#F6C64A] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-[10px]">{title}</b><span className="mt-1 block text-[8px] leading-4 text-white/30">{text}</span></div>;
}
