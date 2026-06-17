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

export function normalizeShippingConfig(value: unknown): ShippingConfig {
  if (!value || typeof value !== 'object') return DEFAULT_SHIPPING_CONFIG;
  const raw = value as Partial<ShippingConfig>;
  const rates = Array.isArray(raw.rates) && raw.rates.length > 0 ? raw.rates : DEFAULT_SHIPPING_CONFIG.rates;
  return {
    mode: raw.mode === 'production' ? 'production' : 'test',
    rates: rates.map((rate) => ({
      region: String(rate.region || '').trim() || 'VII',
      label: String(rate.label || rate.region || 'Región'),
      testFee: Math.max(0, Math.round(Number(rate.testFee || 0))),
      productionFee: Math.max(0, Math.round(Number(rate.productionFee || rate.testFee || 0))),
      eta: String(rate.eta || '7 a 21 días hábiles'),
      updatedAt: String(rate.updatedAt || raw.updatedAt || new Date().toISOString().slice(0, 10)),
      source: rate.source === 'manual' || rate.source === 'carrier_api' ? rate.source : 'reference',
    })),
    lowValueThreshold: Math.max(0, Math.round(Number(raw.lowValueThreshold ?? DEFAULT_SHIPPING_CONFIG.lowValueThreshold))),
    lowValueSurcharge: Math.max(0, Math.round(Number(raw.lowValueSurcharge ?? DEFAULT_SHIPPING_CONFIG.lowValueSurcharge))),
    extraUnitFee: Math.max(0, Math.round(Number(raw.extraUnitFee ?? DEFAULT_SHIPPING_CONFIG.extraUnitFee))),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  };
}

export function getRegionRate(region: string, config: ShippingConfig = DEFAULT_SHIPPING_CONFIG) {
  const normalized = String(region || 'VII').trim().toUpperCase();
  return config.rates.find((rate) => rate.region.toUpperCase() === normalized) ?? config.rates[0] ?? DEFAULT_SHIPPING_CONFIG.rates[0];
}

export function resolveProductShippingFee(item: ShippingLineInput, region: string, config: ShippingConfig = DEFAULT_SHIPPING_CONFIG) {
  const mode = item.shippingMode || 'inherit';
  if (mode === 'free') return 0;
  if (mode === 'fixed') return Math.max(0, Math.round(Number(item.shippingFee || 0)));

  const regionKey = String(region || 'VII').trim().toUpperCase();
  const override = item.shippingRegionOverrides?.[regionKey];
  if (typeof override === 'number' && Number.isFinite(override)) return Math.max(0, Math.round(override));

  const effectiveMode: ShippingMode = mode === 'test' || mode === 'production' ? mode : config.mode;
  const rate = getRegionRate(regionKey, config);
  return effectiveMode === 'production' ? rate.productionFee : rate.testFee;
}

export function calculateShippingTotal(items: ShippingLineInput[], region: string, subtotal: number, config: ShippingConfig = DEFAULT_SHIPPING_CONFIG) {
  if (!items.length) return 0;
  const itemFees = items.map((item) => resolveProductShippingFee(item, region, config));
  const base = Math.max(0, ...itemFees);
  const totalUnits = items.reduce((acc, item) => acc + Math.max(1, Number(item.cantidad || 1)), 0);
  const extraUnits = Math.max(0, totalUnits - 1) * config.extraUnitFee;
  const lowValue = subtotal > 0 && subtotal < config.lowValueThreshold ? config.lowValueSurcharge : 0;
  return Math.max(base + extraUnits, lowValue);
}

export function shippingConfigToStorage(config: ShippingConfig) {
  return JSON.stringify(normalizeShippingConfig(config));
}
