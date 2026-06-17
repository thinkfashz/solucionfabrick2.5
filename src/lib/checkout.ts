import { DEFAULT_SHIPPING_CONFIG, calculateShippingTotal, type ProductShippingMode, type ShippingConfig } from '@/lib/shipping';

export interface LineItem {
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

export interface ClienteCheckout {
  nombre: string;
  email: string;
  telefono?: string;
}

export interface CheckoutPayload {
  items: LineItem[];
  region: string;
  cliente: ClienteCheckout;
  shippingAddress?: string;
  paymentMethod?: 'transfer' | 'mercadopago' | 'bricks';
  clientOrderKey?: string;
}

export interface CheckoutValidationError {
  field: string;
  message: string;
}

export interface CheckoutSummary {
  subtotal: number;
  iva: number;
  despacho: number;
  total: number;
  moneda: 'CLP';
}

export interface InternalShippingEstimate {
  amount: number;
  currency: 'CLP';
  source: 'free-local-estimator';
  confidence: 'baja' | 'media';
  note: string;
}

const IVA = 0.19;
const REGION_EXTREMA = ['XV', 'I', 'II', 'XI', 'XII'];
const REGION_SUR = ['VIII', 'IX', 'X', 'XIV', 'XVI'];
const REGION_CENTRO = ['RM', 'V', 'VI', 'VII', 'ÑUBLE', 'MAULE'];

export function normalizeRegion(region: string) {
  return region.trim().toUpperCase().replace('REGIÓN', '').replace('REGION', '').trim();
}

export function estimateInternalShipping(items: LineItem[], region: string, address = ''): InternalShippingEstimate {
  const normalized = normalizeRegion(region || 'VII');
  const units = Math.max(1, items.reduce((acc, item) => acc + Math.max(1, Number(item.cantidad || 1)), 0));
  const subtotal = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const bulkyHint = /piso|flotante|ceram|porcelanato|madera|panel|plancha|mueble|radier|cemento/i.test(`${address} ${items.map((i) => i.nombre).join(' ')}`);
  const base = REGION_EXTREMA.includes(normalized) ? 82000 : REGION_SUR.includes(normalized) ? 52000 : REGION_CENTRO.includes(normalized) ? 32000 : 42000;
  const bulky = bulkyHint ? 28000 : 0;
  const unitFee = Math.min(45000, Math.max(0, units - 1) * 5500);
  const valueFee = subtotal > 400000 ? 18000 : subtotal > 180000 ? 9000 : 0;
  return {
    amount: Math.round((base + bulky + unitFee + valueFee) / 1000) * 1000,
    currency: 'CLP',
    source: 'free-local-estimator',
    confidence: 'media',
    note: 'Estimación interna para operación, comuna, dimensiones y operador logístico.',
  };
}

export function calculateCheckoutSummary(items: LineItem[], region: string, shippingConfig: ShippingConfig = DEFAULT_SHIPPING_CONFIG): CheckoutSummary {
  const subtotal = Math.round(items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0));
  const iva = Math.round(subtotal * IVA);
  const despacho = calculateShippingTotal(items, normalizeRegion(region || 'VII'), subtotal, shippingConfig);

  return {
    subtotal,
    iva,
    despacho,
    total: subtotal + iva + despacho,
    moneda: 'CLP',
  };
}

export function validateCheckoutPayload(payload: CheckoutPayload): CheckoutValidationError[] {
  const errors: CheckoutValidationError[] = [];

  if (!payload.items?.length) {
    errors.push({ field: 'items', message: 'Debe incluir al menos un producto.' });
  }

  payload.items?.forEach((item, idx) => {
    if (!item.productoId) errors.push({ field: `items[${idx}].productoId`, message: 'Producto inválido.' });
    if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) errors.push({ field: `items[${idx}].cantidad`, message: 'La cantidad debe ser mayor a 0.' });
    if (!Number.isFinite(item.precioUnitario) || item.precioUnitario <= 0) errors.push({ field: `items[${idx}].precioUnitario`, message: 'Precio unitario inválido.' });
    if (item.shippingFee != null && (!Number.isFinite(Number(item.shippingFee)) || Number(item.shippingFee) < 0)) errors.push({ field: `items[${idx}].shippingFee`, message: 'Tarifa de envío inválida.' });
  });

  if (!payload.region?.trim()) errors.push({ field: 'region', message: 'Debe indicar la región.' });

  const nombre = payload.cliente?.nombre?.trim() ?? '';
  const email = payload.cliente?.email?.trim() ?? '';
  if (nombre.length < 3) errors.push({ field: 'cliente.nombre', message: 'Nombre demasiado corto.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: 'cliente.email', message: 'Email inválido.' });

  const telefono = payload.cliente?.telefono?.replace(/\D/g, '') ?? '';
  if (telefono && telefono.length < 8) errors.push({ field: 'cliente.telefono', message: 'Teléfono inválido.' });

  if (payload.shippingAddress && payload.shippingAddress.trim().length < 6) errors.push({ field: 'shippingAddress', message: 'Dirección de despacho demasiado corta.' });

  return errors;
}
