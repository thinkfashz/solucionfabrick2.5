export type ServiceUnit = 'm2' | 'ml' | 'm3' | 'punto' | 'unidad';

export interface ServicePriceSetting {
  slug: string;
  name: string;
  unit: ServiceUnit;
  basePrice: number;
  marketMin: number;
  marketMax: number;
  materialsPct: number;
  laborPct: number;
  logisticsPct: number;
  contingencyPct: number;
  disclaimer: string;
  updatedAt?: string;
}

export interface QuoteInput {
  slug: string;
  unit: ServiceUnit;
  length: number;
  width: number;
  height: number;
  linearMeters: number;
  quantity: number;
  includeIva: boolean;
}

export interface QuoteBreakdown {
  quantity: number;
  unit: ServiceUnit;
  subtotal: number;
  materials: number;
  labor: number;
  logistics: number;
  contingency: number;
  iva: number;
  total: number;
  marketLow: number;
  marketHigh: number;
}

export const DEFAULT_SERVICE_PRICES: ServicePriceSetting[] = [
  {
    slug: 'metalcon',
    name: 'Estructura Metalcon',
    unit: 'm2',
    basePrice: 62000,
    marketMin: 45000,
    marketMax: 85000,
    materialsPct: 0.46,
    laborPct: 0.38,
    logisticsPct: 0.08,
    contingencyPct: 0.08,
    disclaimer: 'Referencia por m² para estructura liviana. No incluye terminaciones especiales ni refuerzos no evaluados en terreno.',
  },
  {
    slug: 'cimientos',
    name: 'Cimientos y fundaciones',
    unit: 'm3',
    basePrice: 185000,
    marketMin: 145000,
    marketMax: 260000,
    materialsPct: 0.52,
    laborPct: 0.30,
    logisticsPct: 0.10,
    contingencyPct: 0.08,
    disclaimer: 'Referencia por m³ de excavación, preparación y hormigón. El precio final depende de suelo, acceso y acero requerido.',
  },
  {
    slug: 'revestimiento',
    name: 'Revestimiento y aislación',
    unit: 'm2',
    basePrice: 38000,
    marketMin: 28000,
    marketMax: 62000,
    materialsPct: 0.44,
    laborPct: 0.40,
    logisticsPct: 0.08,
    contingencyPct: 0.08,
    disclaimer: 'Referencia por m². Varía por preparación de superficie, tipo de revestimiento y altura de trabajo.',
  },
  {
    slug: 'pintura',
    name: 'Pintura profesional',
    unit: 'm2',
    basePrice: 14500,
    marketMin: 9000,
    marketMax: 26000,
    materialsPct: 0.34,
    laborPct: 0.50,
    logisticsPct: 0.07,
    contingencyPct: 0.09,
    disclaimer: 'Referencia por m² con preparación básica y manos estándar. Reparaciones, humedad o altura cambian el valor.',
  },
  {
    slug: 'gasfiteria',
    name: 'Gasfitería',
    unit: 'ml',
    basePrice: 42000,
    marketMin: 30000,
    marketMax: 75000,
    materialsPct: 0.45,
    laborPct: 0.42,
    logisticsPct: 0.06,
    contingencyPct: 0.07,
    disclaimer: 'Referencia por metro lineal o tramo simple. Artefactos, certificaciones y urgencias se cotizan aparte.',
  },
  {
    slug: 'electricidad',
    name: 'Instalación eléctrica',
    unit: 'punto',
    basePrice: 52000,
    marketMin: 35000,
    marketMax: 85000,
    materialsPct: 0.38,
    laborPct: 0.46,
    logisticsPct: 0.07,
    contingencyPct: 0.09,
    disclaimer: 'Referencia por punto eléctrico simple. Tableros, canalizaciones complejas y certificaciones cambian el valor.',
  },
  {
    slug: 'ampliaciones',
    name: 'Ampliación residencial',
    unit: 'm2',
    basePrice: 185000,
    marketMin: 130000,
    marketMax: 320000,
    materialsPct: 0.50,
    laborPct: 0.34,
    logisticsPct: 0.08,
    contingencyPct: 0.08,
    disclaimer: 'Referencia por m² para obra base. Terminaciones, permisos, fundaciones y especialidades pueden variar.',
  },
  {
    slug: 'seguridad',
    name: 'Seguridad residencial',
    unit: 'unidad',
    basePrice: 450000,
    marketMin: 280000,
    marketMax: 1200000,
    materialsPct: 0.62,
    laborPct: 0.24,
    logisticsPct: 0.06,
    contingencyPct: 0.08,
    disclaimer: 'Referencia por sistema base. Cámaras adicionales, monitoreo y cableado extendido se calculan aparte.',
  },
];

export const DEFAULT_PRICE_BY_SLUG = Object.fromEntries(
  DEFAULT_SERVICE_PRICES.map((item) => [item.slug, item]),
) as Record<string, ServicePriceSetting>;

export function clampPriceSetting(setting: ServicePriceSetting): ServicePriceSetting {
  const clean: ServicePriceSetting = {
    ...setting,
    basePrice: Math.max(0, Number(setting.basePrice) || 0),
    marketMin: Math.max(0, Number(setting.marketMin) || 0),
    marketMax: Math.max(0, Number(setting.marketMax) || 0),
    materialsPct: Math.max(0, Number(setting.materialsPct) || 0),
    laborPct: Math.max(0, Number(setting.laborPct) || 0),
    logisticsPct: Math.max(0, Number(setting.logisticsPct) || 0),
    contingencyPct: Math.max(0, Number(setting.contingencyPct) || 0),
  };
  const sum = clean.materialsPct + clean.laborPct + clean.logisticsPct + clean.contingencyPct;
  if (sum <= 0) return { ...clean, materialsPct: 0.45, laborPct: 0.4, logisticsPct: 0.08, contingencyPct: 0.07 };
  return {
    ...clean,
    materialsPct: clean.materialsPct / sum,
    laborPct: clean.laborPct / sum,
    logisticsPct: clean.logisticsPct / sum,
    contingencyPct: clean.contingencyPct / sum,
  };
}

export function getDefaultPrice(slug: string): ServicePriceSetting {
  return DEFAULT_PRICE_BY_SLUG[slug] ?? DEFAULT_SERVICE_PRICES[0];
}

export function mergeServicePrices(rows: Partial<ServicePriceSetting>[]): ServicePriceSetting[] {
  const bySlug = new Map(DEFAULT_SERVICE_PRICES.map((item) => [item.slug, item]));
  for (const row of rows) {
    if (!row.slug) continue;
    const base = bySlug.get(row.slug) ?? getDefaultPrice(row.slug);
    bySlug.set(row.slug, clampPriceSetting({ ...base, ...row } as ServicePriceSetting));
  }
  return Array.from(bySlug.values());
}

export function resolveQuantity(input: QuoteInput): number {
  const length = Math.max(0, Number(input.length) || 0);
  const width = Math.max(0, Number(input.width) || 0);
  const height = Math.max(0, Number(input.height) || 0);
  const linearMeters = Math.max(0, Number(input.linearMeters) || 0);
  const quantity = Math.max(0, Number(input.quantity) || 0);

  switch (input.unit) {
    case 'm2':
      return Math.max(length * width, quantity);
    case 'm3':
      return Math.max(length * width * height, quantity);
    case 'ml':
      return Math.max(linearMeters, length, quantity);
    case 'punto':
    case 'unidad':
      return Math.max(quantity, 1);
    default:
      return Math.max(quantity, 1);
  }
}

export function calculateServiceQuote(setting: ServicePriceSetting, input: QuoteInput): QuoteBreakdown {
  const clean = clampPriceSetting(setting);
  const quantity = Math.max(resolveQuantity({ ...input, unit: clean.unit }), clean.unit === 'm2' || clean.unit === 'm3' || clean.unit === 'ml' ? 0 : 1);
  const subtotal = Math.round(clean.basePrice * quantity);
  const materials = Math.round(subtotal * clean.materialsPct);
  const labor = Math.round(subtotal * clean.laborPct);
  const logistics = Math.round(subtotal * clean.logisticsPct);
  const contingency = Math.max(0, subtotal - materials - labor - logistics);
  const iva = input.includeIva ? Math.round(subtotal * 0.19) : 0;
  const total = subtotal + iva;
  return {
    quantity,
    unit: clean.unit,
    subtotal,
    materials,
    labor,
    logistics,
    contingency,
    iva,
    total,
    marketLow: Math.round(clean.marketMin * quantity),
    marketHigh: Math.round(clean.marketMax * quantity),
  };
}

export function unitLabel(unit: ServiceUnit) {
  switch (unit) {
    case 'm2': return 'm²';
    case 'm3': return 'm³';
    case 'ml': return 'metro lineal';
    case 'punto': return 'punto';
    case 'unidad': return 'unidad';
    default: return unit;
  }
}
