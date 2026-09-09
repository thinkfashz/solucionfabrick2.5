export type AirCapacity = 9000 | 12000 | 18000 | 24000;
export type AirRoomType = 'dormitorio' | 'living' | 'oficina' | 'cocina';
export type SunExposure = 'baja' | 'media' | 'alta';
export type InsulationLevel = 'buena' | 'normal' | 'baja';
export type ClimateZone = 'norte' | 'centro' | 'costa' | 'sur';

export const AIR_CAPACITIES: AirCapacity[] = [9000, 12000, 18000, 24000];
export const DEFAULT_ELECTRICITY_RATE_CLP_KWH = 240;

export type AirRoomProfile = {
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  factor: number;
  internalLoadBtu: number;
};

export const AIR_ROOM_PROFILES: Record<AirRoomType, AirRoomProfile> = {
  dormitorio: {
    label: 'Habitación',
    shortLabel: 'Dormitorio',
    emoji: '🛏️',
    description: 'Prioriza silencio, estabilidad térmica y consumo moderado durante varias horas.',
    factor: 0.96,
    internalLoadBtu: 0,
  },
  living: {
    label: 'Living',
    shortLabel: 'Living',
    emoji: '🛋️',
    description: 'Suele tener más superficie, tránsito y ventanas, por eso necesita mayor margen.',
    factor: 1.05,
    internalLoadBtu: 300,
  },
  oficina: {
    label: 'Oficina',
    shortLabel: 'Oficina',
    emoji: '💻',
    description: 'Personas, computadores y equipos agregan carga térmica durante la jornada.',
    factor: 1.1,
    internalLoadBtu: 900,
  },
  cocina: {
    label: 'Cocina',
    shortLabel: 'Cocina',
    emoji: '🍳',
    description: 'Cocción y electrodomésticos elevan la carga térmica incluso con pocos metros cuadrados.',
    factor: 1.18,
    internalLoadBtu: 1800,
  },
};

const SUN_FACTOR: Record<SunExposure, number> = {
  baja: 0.94,
  media: 1,
  alta: 1.12,
};

const INSULATION_FACTOR: Record<InsulationLevel, number> = {
  buena: 0.9,
  normal: 1,
  baja: 1.15,
};

const CLIMATE_FACTOR: Record<ClimateZone, number> = {
  norte: 1.1,
  centro: 1,
  costa: 0.96,
  sur: 0.94,
};

export type AirSizingInput = {
  lengthM: number;
  widthM: number;
  heightM: number;
  people: number;
  roomType: AirRoomType;
  sunExposure: SunExposure;
  insulation: InsulationLevel;
  climateZone: ClimateZone;
  windowAreaM2?: number;
};

export type AirSizingResult = {
  areaM2: number;
  volumeM3: number;
  requiredBtu: number;
  recommendedCapacity: AirCapacity;
  requiresMultiUnit: boolean;
  minimumUnits: number;
  perUnitCapacity: AirCapacity;
  headroomBtu: number;
  confidence: 'media';
  reasons: string[];
};

export type AirCatalogProduct = {
  id: string;
  name: string;
  price: number;
  stock?: number;
  image_url?: string;
  description?: string;
  rating?: number;
  discount_percentage?: number;
  specifications?: Record<string, unknown>;
  category_name?: string;
  category?: string;
  activo?: boolean;
  featured?: boolean;
};

export type AirRecommendation = {
  product: AirCatalogProduct;
  capacity: AirCapacity;
  score: number;
  match: 'ideal' | 'superior';
  reason: string;
  finalPrice: number;
};

export type AirEnergyEstimate = {
  capacityBtu: number;
  unitCount: number;
  targetTempC: number;
  ambientTempC: number;
  hoursPerDay: number;
  electricalKwNow: number;
  monthlyKwh: number;
  monthlyCostClp: number;
  traditionalMonthlyKwh: number;
  traditionalMonthlyCostClp: number;
  estimatedSavingsPercent: number;
  estimatedMonthlySavingsClp: number;
  loadPercent: number;
  loadLabel: 'Bajo' | 'Medio' | 'Alto';
};

export type AirProductTiers = {
  economy?: AirRecommendation;
  recommended?: AirRecommendation;
  premium?: AirRecommendation;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function positive(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAirRoomProfile(roomType: AirRoomType) {
  return AIR_ROOM_PROFILES[roomType];
}

export function calculateAirSizing(input: AirSizingInput): AirSizingResult {
  const lengthM = clamp(positive(input.lengthM, 3), 1.5, 20);
  const widthM = clamp(positive(input.widthM, 3), 1.5, 20);
  const heightM = clamp(positive(input.heightM, 2.4), 2, 6);
  const people = Math.max(1, Math.min(30, Math.round(positive(input.people, 1))));
  const windowAreaM2 = clamp(Number(input.windowAreaM2 || 0), 0, 80);
  const profile = AIR_ROOM_PROFILES[input.roomType];

  const areaM2 = lengthM * widthM;
  const volumeM3 = areaM2 * heightM;

  // Heurística comercial conservadora para vivienda/oficina en Chile.
  // Se parte de 600 BTU/h por m² a 2,5 m de altura y luego se corrige
  // por altura, ocupación, ventanas, uso, asoleamiento, aislación y clima.
  const base = areaM2 * 600 * clamp(heightM / 2.5, 0.84, 1.65);
  const occupancyLoad = Math.max(0, people - 2) * 600;
  const windowLoad = windowAreaM2 * 300;
  const adjusted = (base + occupancyLoad + windowLoad + profile.internalLoadBtu)
    * profile.factor
    * SUN_FACTOR[input.sunExposure]
    * INSULATION_FACTOR[input.insulation]
    * CLIMATE_FACTOR[input.climateZone];

  const requiredBtu = Math.max(3000, Math.ceil(adjusted / 100) * 100);
  const recommendedCapacity = (AIR_CAPACITIES.find((capacity) => capacity >= requiredBtu) || 24000) as AirCapacity;
  const requiresMultiUnit = requiredBtu > 24000;
  const minimumUnits = requiresMultiUnit ? Math.max(2, Math.ceil(requiredBtu / 24000)) : 1;
  const perUnitTarget = requiredBtu / minimumUnits;
  const perUnitCapacity = (AIR_CAPACITIES.find((capacity) => capacity >= perUnitTarget) || 24000) as AirCapacity;
  const headroomBtu = requiresMultiUnit
    ? minimumUnits * perUnitCapacity - requiredBtu
    : recommendedCapacity - requiredBtu;

  const reasons = [
    `${round1(areaM2)} m² y ${round1(volumeM3)} m³`,
    `${people} ${people === 1 ? 'persona' : 'personas'}`,
    input.roomType === 'cocina' ? 'carga térmica alta por cocina y electrodomésticos' : input.roomType === 'oficina' ? 'carga adicional por computadores y jornada de uso' : `uso ${profile.shortLabel.toLowerCase()}`,
    input.sunExposure === 'alta' ? 'alta exposición solar' : input.sunExposure === 'baja' ? 'baja exposición solar' : 'exposición solar media',
    input.insulation === 'baja' ? 'aislación baja' : input.insulation === 'buena' ? 'buena aislación' : 'aislación normal',
  ];

  return {
    areaM2: round1(areaM2),
    volumeM3: round1(volumeM3),
    requiredBtu,
    recommendedCapacity,
    requiresMultiUnit,
    minimumUnits,
    perUnitCapacity,
    headroomBtu,
    confidence: 'media',
    reasons,
  };
}

export function estimateAirEnergy(input: {
  capacityBtu: number;
  unitCount?: number;
  targetTempC?: number;
  ambientTempC?: number;
  hoursPerDay?: number;
  electricityRateClpKwh?: number;
}): AirEnergyEstimate {
  const capacityBtu = clamp(positive(input.capacityBtu, 9000), 3000, 72000);
  const unitCount = Math.max(1, Math.min(6, Math.round(positive(input.unitCount, 1))));
  const targetTempC = clamp(positive(input.targetTempC, 23), 16, 28);
  const ambientTempC = clamp(positive(input.ambientTempC, 30), 18, 42);
  const hoursPerDay = clamp(positive(input.hoursPerDay, 8), 1, 24);
  const electricityRateClpKwh = clamp(positive(input.electricityRateClpKwh, DEFAULT_ELECTRICITY_RATE_CLP_KWH), 50, 1000);

  const coolingKw = capacityBtu / 3412.142;
  const inverterCop = 3.5;
  const traditionalCop = 2.7;
  const deltaC = Math.max(0, ambientTempC - targetTempC);
  const loadFactor = clamp(0.34 + (deltaC / 12) * 0.78, 0.34, 1.12);
  const inverterElectricalKw = (coolingKw / inverterCop) * loadFactor * unitCount;
  const traditionalElectricalKw = (coolingKw / traditionalCop) * Math.max(0.64, loadFactor) * unitCount;
  const monthlyKwh = inverterElectricalKw * hoursPerDay * 30;
  const traditionalMonthlyKwh = traditionalElectricalKw * hoursPerDay * 30;
  const monthlyCostClp = Math.round(monthlyKwh * electricityRateClpKwh);
  const traditionalMonthlyCostClp = Math.round(traditionalMonthlyKwh * electricityRateClpKwh);
  const estimatedMonthlySavingsClp = Math.max(0, traditionalMonthlyCostClp - monthlyCostClp);
  const estimatedSavingsPercent = traditionalMonthlyCostClp > 0
    ? Math.round((estimatedMonthlySavingsClp / traditionalMonthlyCostClp) * 100)
    : 0;
  const loadPercent = Math.round(clamp(loadFactor / 1.12, 0, 1) * 100);
  const loadLabel: AirEnergyEstimate['loadLabel'] = loadPercent < 48 ? 'Bajo' : loadPercent < 78 ? 'Medio' : 'Alto';

  return {
    capacityBtu: Math.round(capacityBtu),
    unitCount,
    targetTempC,
    ambientTempC,
    hoursPerDay,
    electricalKwNow: round2(inverterElectricalKw),
    monthlyKwh: round1(monthlyKwh),
    monthlyCostClp,
    traditionalMonthlyKwh: round1(traditionalMonthlyKwh),
    traditionalMonthlyCostClp,
    estimatedSavingsPercent,
    estimatedMonthlySavingsClp,
    loadPercent,
    loadLabel,
  };
}

function textOf(product: AirCatalogProduct) {
  return `${product.name || ''} ${product.description || ''} ${product.category_name || ''} ${product.category || ''} ${JSON.stringify(product.specifications || {})}`;
}

export function isInverterProduct(product: AirCatalogProduct) {
  return /inverter/i.test(textOf(product));
}

export function detectAirCapacity(product: AirCatalogProduct): AirCapacity | null {
  const normalized = textOf(product).toLowerCase().replace(/\s+/g, ' ');
  const compact = normalized.replace(/[.\s,]/g, '');
  for (const capacity of AIR_CAPACITIES) {
    if (compact.includes(String(capacity))) return capacity;
    if (new RegExp(`\\b${capacity / 1000}\\s*k(?:btu)?\\b`, 'i').test(normalized)) return capacity;
    if (new RegExp(`\\b${capacity / 1000}\\s*[.,]?\\s*000\\s*btu\\b`, 'i').test(normalized)) return capacity;
  }
  return null;
}

export function isAirCatalogProduct(product: AirCatalogProduct) {
  return /aire\s*acond|air\s*condition|split|climat|\bbtu\b/i.test(textOf(product));
}

export function normalizeAirCatalogProducts(value: unknown): AirCatalogProduct[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: AirCatalogProduct[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id.trim() : String(row.id || '').trim();
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const price = Number(row.price);
    if (!id || !name || !Number.isFinite(price) || price < 0 || seen.has(id)) continue;
    const specifications = row.specifications && typeof row.specifications === 'object' && !Array.isArray(row.specifications)
      ? row.specifications as Record<string, unknown>
      : undefined;
    const stock = Number(row.stock);
    const rating = Number(row.rating);
    const discount = Number(row.discount_percentage);
    const product: AirCatalogProduct = {
      id,
      name,
      price,
      ...(Number.isFinite(stock) ? { stock: Math.max(0, Math.floor(stock)) } : {}),
      ...(typeof row.image_url === 'string' && row.image_url.trim() ? { image_url: row.image_url.trim() } : {}),
      ...(typeof row.description === 'string' ? { description: row.description } : {}),
      ...(Number.isFinite(rating) ? { rating: clamp(rating, 0, 5) } : {}),
      ...(Number.isFinite(discount) ? { discount_percentage: clamp(discount, 0, 100) } : {}),
      ...(typeof row.category_name === 'string' ? { category_name: row.category_name } : {}),
      ...(typeof row.category === 'string' ? { category: row.category } : {}),
      ...(typeof row.activo === 'boolean' ? { activo: row.activo } : {}),
      ...(typeof row.featured === 'boolean' ? { featured: row.featured } : {}),
      ...(specifications ? { specifications } : {}),
    };
    seen.add(id);
    result.push(product);
  }
  return result;
}

export function recommendAirProducts(
  products: AirCatalogProduct[],
  sizing: AirSizingResult,
  limit = 4,
): AirRecommendation[] {
  const target = sizing.requiresMultiUnit ? sizing.perUnitCapacity : sizing.recommendedCapacity;

  return products
    .filter((product) => product.activo !== false)
    .filter((product) => Number(product.price) > 0)
    .filter((product) => product.stock === undefined || Number(product.stock) > 0)
    .filter(isAirCatalogProduct)
    .map((product) => ({ product, capacity: detectAirCapacity(product) }))
    .filter((entry): entry is { product: AirCatalogProduct; capacity: AirCapacity } => Boolean(entry.capacity))
    .filter(({ capacity }) => capacity >= target)
    .map(({ product, capacity }) => {
      const exact = capacity === target;
      const inverter = isInverterProduct(product);
      const capacityPenalty = Math.max(0, AIR_CAPACITIES.indexOf(capacity) - AIR_CAPACITIES.indexOf(target)) * 18;
      const score = (exact ? 120 : 88)
        - capacityPenalty
        + (inverter ? 16 : 0)
        + (product.featured ? 8 : 0)
        + Math.min(12, Number(product.stock || 0))
        + Math.round(Number(product.rating || 0) * 3);
      const discount = clamp(Number(product.discount_percentage || 0), 0, 100);
      const finalPrice = Math.round(Number(product.price) * (1 - discount / 100));
      return {
        product,
        capacity,
        score,
        match: exact ? 'ideal' as const : 'superior' as const,
        reason: exact ? `Coincide con ${target.toLocaleString('es-CL')} BTU` : `Capacidad superior compatible: ${capacity.toLocaleString('es-CL')} BTU`,
        finalPrice,
      };
    })
    .sort((a, b) => b.score - a.score || a.finalPrice - b.finalPrice || a.product.name.localeCompare(b.product.name))
    .slice(0, Math.max(1, limit));
}

export function recommendAirProductTiers(products: AirCatalogProduct[], sizing: AirSizingResult): AirProductTiers {
  const pool = recommendAirProducts(products, sizing, Math.max(products.length, 12));
  if (!pool.length) return {};

  const recommended = pool[0];
  const economy = [...pool].sort((a, b) => a.finalPrice - b.finalPrice || b.score - a.score)[0];
  const premiumCandidates = pool.filter((entry) => entry.product.id !== recommended.product.id && entry.product.id !== economy.product.id);
  const premium = [...premiumCandidates].sort((a, b) => {
    const aPremium = (a.product.featured ? 30 : 0) + (isInverterProduct(a.product) ? 18 : 0) + Math.round(Number(a.product.rating || 0) * 10) + Math.round(a.finalPrice / 100000);
    const bPremium = (b.product.featured ? 30 : 0) + (isInverterProduct(b.product) ? 18 : 0) + Math.round(Number(b.product.rating || 0) * 10) + Math.round(b.finalPrice / 100000);
    return bPremium - aPremium || b.finalPrice - a.finalPrice;
  })[0] || pool.find((entry) => entry.product.id !== recommended.product.id) || recommended;

  return { economy, recommended, premium };
}
