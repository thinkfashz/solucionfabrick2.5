export interface LineItem {
  productoId: string | number;
  cantidad: number;
  precioUnitario: number;
  nombre?: string;
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

const IVA = 0.19;
const DESPACHO_BASE = 35000;
const DESPACHO_REGIONES_EXTREMAS = ['XV', 'I', 'XI', 'XII'];

export function calculateCheckoutSummary(items: LineItem[], region: string): CheckoutSummary {
  const subtotal = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const iva = Math.round(subtotal * IVA);
  const despacho = DESPACHO_REGIONES_EXTREMAS.includes(region.toUpperCase())
    ? DESPACHO_BASE * 2
    : DESPACHO_BASE;

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
    if (!item.productoId) {
      errors.push({ field: `items[${idx}].productoId`, message: 'Producto inválido.' });
    }
    if (!Number.isFinite(item.cantidad) || item.cantidad <= 0) {
      errors.push({ field: `items[${idx}].cantidad`, message: 'La cantidad debe ser mayor a 0.' });
    }
    if (!Number.isFinite(item.precioUnitario) || item.precioUnitario <= 0) {
      errors.push({ field: `items[${idx}].precioUnitario`, message: 'Precio unitario inválido.' });
    }
  });

  if (!payload.region?.trim()) {
    errors.push({ field: 'region', message: 'Debe indicar la región.' });
  }

  const nombre = payload.cliente?.nombre?.trim() ?? '';
  const email = payload.cliente?.email?.trim() ?? '';
  if (nombre.length < 3) {
    errors.push({ field: 'cliente.nombre', message: 'Nombre demasiado corto.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'cliente.email', message: 'Email inválido.' });
  }

  const telefono = payload.cliente?.telefono?.replace(/\D/g, '') ?? '';
  if (telefono && telefono.length < 8) {
    errors.push({ field: 'cliente.telefono', message: 'Teléfono inválido.' });
  }

  if (payload.shippingAddress && payload.shippingAddress.trim().length < 6) {
    errors.push({ field: 'shippingAddress', message: 'Dirección de despacho demasiado corta.' });
  }

  return errors;
}
