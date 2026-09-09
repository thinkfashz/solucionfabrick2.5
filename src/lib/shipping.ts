export type ShippingMode = 'test' | 'production';
export type ProductShippingMode = 'inherit' | 'test' | 'production' | 'fixed' | 'free';

export interface ShippingRegionRate {
  region: string;
  label: string;
  testFee: number;
  productionFee: number;
  eta: string;
  updatedAt: string;
  source: 'reference' | 'manual' | 'carrier_api';
}

export interface ShippingConfig {
  mode: ShippingMode;
  rates: ShippingRegionRate[];
  lowValueThreshold: number;
  lowValueSurcharge: number;
  extraUnitFee: number;
  updatedAt: string;
}

export interface ShippingLineInput {
  productoId: string | number;
  cantidad: number;
  precioUnitario: number;
  nombre?: string;
  shippingMode?: ProductShippingMode | null;
  shippingFee?: number | null;
  shippingWeightKg?: number | null;
  shippingDimensions?: string | null;
  shippingRegionOverrides?: Record<string, number> | null;
}

const NOW_REFERENCE = '2026-06-16';
const PRODUCT_SHIPPING_MODES = new Set<ProductShippingMode>(['inherit', 'test', 'production', 'fixed', 'free']);

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  mode: 'test',
  lowValueThreshold: 50_000,
  lowValueSurcharge: 10_000,
  extraUnitFee: 2_500,
  updatedAt: NOW_REFERENCE,
  rates: [
    { region: 'VII', label: 'Maule / Linares / Talca', testFee: 7_990, productionFee: 9_990, eta: '1 a 3 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'RM', label: 'Región Metropolitana', testFee: 6_990, productionFee: 8_990, eta: '1 a 3 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'V', label: 'Valparaíso', testFee: 8_990, productionFee: 10_990, eta: '2 a 4 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'VI', label: 'O’Higgins', testFee: 8_990, productionFee: 10_990, eta: '2 a 4 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'XVI', label: 'Ñuble', testFee: 9_990, productionFee: 12_990, eta: '2 a 5 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'VIII', label: 'Biobío', testFee: 10_990, productionFee: 13_990, eta: '2 a 5 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'IX', label: 'Araucanía', testFee: 12_990, productionFee: 15_990, eta: '3 a 6 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'X', label: 'Los Lagos', testFee: 13_990, productionFee: 17_990, eta: '3 a 7 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'I', label: 'Tarapacá', testFee: 15_990, productionFee: 19_990, eta: '4 a 8 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'II', label: 'Antofagasta', testFee: 15_990, productionFee: 19_990, eta: '4 a 8 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'XV', label: 'Arica y Parinacota', testFee: 17_990, productionFee: 22_990, eta: '5 a 9 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'XI', label: 'Aysén', testFee: 22_990, productionFee: 29_990, eta: '6 a 12 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
    { region: 'XII', label: 'Magallanes', testFee: 24_990, productionFee: 32_990, eta: '6 a 12 días hábiles', updatedAt: NOW_REFERENCE, source: 'reference' },
  ],
};

function normalizeRate(rate: Partial<ShippingRegionRate>, fallback?: ShippingRegionRate, configUpdatedAt?: string): ShippingRegionRate {
  const region = String(rate.region || fallback?.region || '').trim().toUpperCase() || 'VII';
  const testFeeRaw = rate.testFee ?? fallback?.testFee ?? 0;
  const productionFeeRaw = rate.productionFee ?? fallback?.productionFee ?? testFeeRaw;
  return {
    region,
    label: String(rate.label || fallback?.label || region || 'Región'),
    testFee: Math.max(0, Math.round(Number(testFeeRaw) || 0)),
    productionFee: Math.max(0, Math.round(Number(productionFeeRaw) || 0)),
    eta: String(rate.eta || fallback?.eta || '7 a 21 días hábiles'),
    updatedAt: String(rate.updatedAt || configUpdatedAt || fallback?.updatedAt || new Date().toISOString().slice(0, 10)),
    source: rate.source === 'manual' || rate.source === 'carrier_api' ? rate.source : fallback?.source ?? 'reference',
  };
}

/**
 * Persisted shipping configuration may come from old installs whose seed only
 * stored a subset of regions (historically VII + RM). Always merge persisted
 * rows over the complete current reference table so a missing region can never
 * silently fall back to the first/cheapest configured region.
 */
export function normalizeShippingConfig(value: unknown): ShippingConfig {
  if (!value || typeof value !== 'object') return {
    ...DEFAULT_SHIPPING_CONFIG,
    rates: DEFAULT_SHIPPING_CONFIG.rates.map((rate) => ({ ...rate })),
  };

  const raw = value as Partial<ShippingConfig>;
  const rawRates = Array.isArray(raw.rates) ? raw.rates : [];
  const persistedByRegion = new Map<string, Partial<ShippingRegionRate>>();
  for (const rate of rawRates) {
    if (!rate || typeof rate !== 'object') continue;
    const key = String(rate.region || '').trim().toUpperCase();
    if (key) persistedByRegion.set(key, rate);
  }

  const defaultKeys = new Set(DEFAULT_SHIPPING_CONFIG.rates.map((rate) => rate.region.toUpperCase()));
  const rates = DEFAULT_SHIPPING_CONFIG.rates.map((fallback) => {
    const persisted = persistedByRegion.get(fallback.region.toUpperCase());
    return normalizeRate(persisted ?? {}, fallback, raw.updatedAt);
  });

  // Preserve deliberately configured future/custom regions without allowing
  // them to replace the canonical Chile coverage above.
  for (const [key, rate] of persistedByRegion) {
    if (!defaultKeys.has(key)) rates.push(normalizeRate(rate, undefined, raw.updatedAt));
  }

  return {
    mode: raw.mode === 'production' ? 'production' : 'test',
    rates,
    lowValueThreshold: Math.max(0, Math.round(Number(raw.lowValueThreshold ?? DEFAULT_SHIPPING_CONFIG.lowValueThreshold))),
    lowValueSurcharge: Math.max(0, Math.round(Number(raw.lowValueSurcharge ?? DEFAULT_SHIPPING_CONFIG.lowValueSurcharge))),
    extraUnitFee: Math.max(0, Math.round(Number(raw.extraUnitFee ?? DEFAULT_SHIPPING_CONFIG.extraUnitFee))),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

export function getRegionRate(region: string, config: ShippingConfig = DEFAULT_SHIPPING_CONFIG) {
  const normalized = String(region || 'VII').trim().toUpperCase();
  return config.rates.find((rate) => rate.region.toUpperCase() === normalized) ?? config.rates.find((rate) => rate.region.toUpperCase() === 'VII') ?? DEFAULT_SHIPPING_CONFIG.rates[0];
}

function hasManualShippingFee(item: Pick<ShippingLineInput, 'shippingFee'>) {
  return item.shippingFee !== null && item.shippingFee !== undefined && Number.isFinite(Number(item.shippingFee));
}

/**
 * Product shipping semantics are explicit and stable:
 * - an explicit mode always wins (including `free` and `inherit`);
 * - only legacy rows with no mode can infer `fixed` from an existing fee;
 * - a product without shipping metadata inherits the global region config.
 *
 * This avoids two dangerous historical behaviours: treating missing metadata as
 * free shipping and converting an explicitly free product to fixed merely
 * because an old fee value was still stored in the row.
 */
export function normalizeProductShippingMode(mode: unknown, shippingFee?: unknown): ProductShippingMode {
  const normalized = typeof mode === 'string' ? mode.trim().toLowerCase() as ProductShippingMode : null;
  if (normalized && PRODUCT_SHIPPING_MODES.has(normalized)) return normalized;
  if (shippingFee !== null && shippingFee !== undefined && Number.isFinite(Number(shippingFee))) return 'fixed';
  return 'inherit';
}

function usesGlobalShippingRate(item: ShippingLineInput) {
  const mode = normalizeProductShippingMode(item.shippingMode, item.shippingFee);
  return mode === 'inherit' || mode === 'test' || mode === 'production';
}

export function resolveProductShippingFee(item: ShippingLineInput, region: string, config: ShippingConfig = DEFAULT_SHIPPING_CONFIG) {
  const mode = normalizeProductShippingMode(item.shippingMode, item.shippingFee);

  if (mode === 'free') return 0;
  if (mode === 'fixed') {
    return hasManualShippingFee(item) ? Math.max(0, Math.round(Number(item.shippingFee))) : 0;
  }

  const regionKey = String(region || 'VII').trim().toUpperCase();
  const override = item.shippingRegionOverrides?.[regionKey];
  if (typeof override === 'number' && Number.isFinite(override)) return Math.max(0, Math.round(override));

  const effectiveMode: ShippingMode = mode === 'test' || mode === 'production' ? mode : config.mode;
  const rate = getRegionRate(regionKey, config);
  return effectiveMode === 'production' ? rate.productionFee : rate.testFee;
}

export function calculateShippingTotal(items: ShippingLineInput[], region: string, subtotal: number, config: ShippingConfig = DEFAULT_SHIPPING_CONFIG) {
  if (!items.length) return 0;

  const resolved = items.map((item) => ({
    item,
    mode: normalizeProductShippingMode(item.shippingMode, item.shippingFee),
    fee: resolveProductShippingFee(item, region, config),
  }));

  const chargeable = resolved.filter(({ mode, fee }) => mode !== 'free' && fee > 0);
  const base = chargeable.length ? Math.max(...chargeable.map(({ fee }) => fee)) : 0;
  const totalChargeableUnits = chargeable.reduce((acc, { item }) => acc + Math.max(1, Math.floor(Number(item.cantidad || 1))), 0);
  const extraUnits = base > 0 ? Math.max(0, totalChargeableUnits - 1) * config.extraUnitFee : 0;
  const shouldUseLowValueSurcharge = resolved.some(({ item }) => usesGlobalShippingRate(item));
  const lowValue = shouldUseLowValueSurcharge && subtotal > 0 && subtotal < config.lowValueThreshold ? config.lowValueSurcharge : 0;

  return Math.max(base + extraUnits, lowValue);
}

export function shippingConfigToStorage(config: ShippingConfig) {
  return JSON.stringify(normalizeShippingConfig(config));
}
