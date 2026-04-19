export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'en_preparacion'
  | 'enviado'
  | 'entregado'
  | 'cancelado';

export type DeliveryStatus = 'pendiente' | 'en_camino' | 'entregado' | 'fallido';

export interface CategoryRecord {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
}

export interface NormalizedLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface NormalizedOrderRecord {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  region: string;
  shipping_address: string;
  items: NormalizedLineItem[];
  subtotal: number;
  tax: number;
  shipping_fee: number;
  total: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  payment_id: string;
  payment_status: string;
}

export const CATEGORY_FALLBACK_NAME = 'General';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente: '#f59e0b',
  confirmado: '#3b82f6',
  en_preparacion: '#f97316',
  enviado: '#8b5cf6',
  entregado: '#22c55e',
  cancelado: '#ef4444',
};

const ORDER_STATUS_ALIASES: Record<string, OrderStatus> = {
  pendiente: 'pendiente',
  pending: 'pendiente',
  pendiente_pago: 'pendiente',
  pagado: 'confirmado',
  pagada: 'confirmado',
  approved: 'confirmado',
  succeeded: 'confirmado',
  confirmado: 'confirmado',
  processing: 'en_preparacion',
  en_preparacion: 'en_preparacion',
  preparacion: 'en_preparacion',
  enviado: 'enviado',
  shipped: 'enviado',
  entregado: 'entregado',
  delivered: 'entregado',
  cancelado: 'cancelado',
  cancelled: 'cancelado',
  canceled: 'cancelado',
  rejected: 'cancelado',
  failed: 'cancelado',
  fallida: 'cancelado',
  refunded: 'cancelado',
  reembolsada: 'cancelado',
};

function toFiniteNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toTrimmedText(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }
  if (value == null) return fallback;
  const stringified = String(value).trim();
  return stringified.length > 0 ? stringified : fallback;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function shortRecordId(id: string) {
  return id.slice(-8).toUpperCase();
}

export function normalizeOrderStatus(rawStatus?: string | null): OrderStatus {
  const normalizedKey = toTrimmedText(rawStatus, 'pendiente').toLowerCase();
  return ORDER_STATUS_ALIASES[normalizedKey] ?? 'pendiente';
}

export function orderStatusLabel(rawStatus?: string | null) {
  return ORDER_STATUS_LABELS[normalizeOrderStatus(rawStatus)];
}

export function orderStatusColor(rawStatus?: string | null) {
  return ORDER_STATUS_COLORS[normalizeOrderStatus(rawStatus)];
}

export function deliveryStatusFromOrderStatus(rawStatus?: string | null): DeliveryStatus {
  const status = normalizeOrderStatus(rawStatus);
  if (status === 'entregado') return 'entregado';
  if (status === 'enviado') return 'en_camino';
  if (status === 'cancelado') return 'fallido';
  return 'pendiente';
}

export function buildCategoryMap(categories: CategoryRecord[]) {
  return categories.reduce<Record<string, string>>((accumulator, category) => {
    accumulator[category.id] = category.name;
    return accumulator;
  }, {});
}

export function resolveCategoryName(categoryId: string | null | undefined, categoryMap: Record<string, string>) {
  const rawValue = toTrimmedText(categoryId, '');
  if (!rawValue) return CATEGORY_FALLBACK_NAME;
  if (categoryMap[rawValue]) return categoryMap[rawValue];
  if (isUuidLike(rawValue)) return CATEGORY_FALLBACK_NAME;
  return rawValue;
}

export function buildProductTagline(tagline?: string | null, deliveryDays?: string | null) {
  const preferred = toTrimmedText(tagline, '');
  if (preferred) return preferred;
  const delivery = toTrimmedText(deliveryDays, '');
  if (delivery) return `Entrega ${delivery}`;
  return 'Calidad profesional para tu proyecto';
}

export function normalizeShippingAddress(value: unknown): string {
  if (value == null) return '';

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null') return '';
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return normalizeShippingAddress(JSON.parse(trimmed));
      } catch {
        return trimmed.replace(/^"(.*)"$/, '$1');
      }
    }
    return trimmed.replace(/^"(.*)"$/, '$1');
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeShippingAddress(item))
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    const parts = Object.values(value as Record<string, unknown>)
      .map((part) => normalizeShippingAddress(part))
      .filter(Boolean);
    return Array.from(new Set(parts)).join(', ');
  }

  return toTrimmedText(value, '');
}

export function normalizeLineItems(value: unknown): NormalizedLineItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((rawItem) => {
      if (!rawItem || typeof rawItem !== 'object') return null;

      const item = rawItem as Record<string, unknown>;
      const productId = toTrimmedText(item.productoId ?? item.productId ?? item.id ?? '', 'sin-id');
      const quantity = Math.max(1, Math.round(toFiniteNumber(item.cantidad ?? item.quantity, 1)));
      const unitPrice = toFiniteNumber(item.precioUnitario ?? item.unitPrice ?? item.price, 0);
      const name = toTrimmedText(item.nombre ?? item.name ?? `Producto ${productId}`, `Producto ${productId}`);

      return {
        productId,
        name,
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice,
      } satisfies NormalizedLineItem;
    })
    .filter((item): item is NormalizedLineItem => item !== null);
}

export function normalizeOrderRecord(raw: Record<string, unknown>): NormalizedOrderRecord {
  const items = normalizeLineItems(raw.items);
  const computedSubtotal = items.reduce((accumulator, item) => accumulator + item.subtotal, 0);
  const subtotal = toFiniteNumber(raw.subtotal, computedSubtotal);

  return {
    id: toTrimmedText(raw.id, 'sin-id'),
    customer_name: toTrimmedText(raw.customer_name, 'Cliente sin nombre'),
    customer_email: toTrimmedText(raw.customer_email, ''),
    customer_phone: toTrimmedText(raw.customer_phone, ''),
    region: toTrimmedText(raw.region, ''),
    shipping_address: normalizeShippingAddress(raw.shipping_address),
    items,
    subtotal,
    tax: toFiniteNumber(raw.tax, 0),
    shipping_fee: toFiniteNumber(raw.shipping_fee, 0),
    total: toFiniteNumber(raw.total, subtotal),
    currency: toTrimmedText(raw.currency, 'CLP'),
    status: normalizeOrderStatus(toTrimmedText(raw.status, 'pendiente')),
    created_at: toTrimmedText(raw.created_at, new Date(0).toISOString()),
    updated_at: toTrimmedText(raw.updated_at, ''),
    payment_id: toTrimmedText(raw.payment_id, ''),
    payment_status: toTrimmedText(raw.payment_status, ''),
  };
}