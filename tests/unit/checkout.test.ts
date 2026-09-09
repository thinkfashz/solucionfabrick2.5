import { describe, expect, it } from 'vitest';
import { calculateCheckoutSummary, validateCheckoutPayload, type CheckoutPayload, type LineItem } from '@/lib/checkout';
import type { ShippingConfig } from '@/lib/shipping';

const item = (overrides: Partial<LineItem> = {}): LineItem => ({ productoId: 'p1', cantidad: 2, precioUnitario: 10000, ...overrides });
const validPayload = (overrides: Partial<CheckoutPayload> = {}): CheckoutPayload => ({
  items: [item()], region: 'RM', cliente: { nombre: 'Juan Pérez', email: 'juan@example.com', telefono: '+56912345678' }, ...overrides,
});

const SHIPPING_CONFIG: ShippingConfig = {
  mode: 'production',
  lowValueThreshold: 50_000,
  lowValueSurcharge: 10_000,
  extraUnitFee: 2_500,
  updatedAt: '2026-09-08',
  rates: [
    { region: 'RM', label: 'Metropolitana', testFee: 7_000, productionFee: 9_000, eta: '1 a 3 días', updatedAt: '2026-09-08', source: 'manual' },
    { region: 'XV', label: 'Arica', testFee: 18_000, productionFee: 23_000, eta: '5 a 9 días', updatedAt: '2026-09-08', source: 'manual' },
  ],
};

describe('calculateCheckoutSummary', () => {
  it('trata catálogo y despacho como total final con IVA incluido', () => {
    const r = calculateCheckoutSummary([item({ shippingMode: 'inherit' })], 'RM', SHIPPING_CONFIG);
    expect(r.subtotal).toBe(20000);
    expect(r.despacho).toBe(11500);
    expect(r.total).toBe(31500);
    expect(r.neto + r.iva).toBe(r.total);
    expect(r.taxIncluded).toBe(true);
    expect(r.moneda).toBe('CLP');
  });

  it('la ausencia de metadata de envío hereda la tarifa global y nunca implica envío gratis', () => {
    const r = calculateCheckoutSummary([item()], 'RM', SHIPPING_CONFIG);
    expect(r.despacho).toBe(11500);
    expect(r.total).toBe(31500);
  });

  it('respeta el modo de prueba por producto aunque el global esté en producción', () => {
    const r = calculateCheckoutSummary([item({ shippingMode: 'test' })], 'RM', SHIPPING_CONFIG);
    expect(r.despacho).toBe(10000);
  });

  it('respeta envío gratis explícito incluso con varias unidades y una tarifa antigua almacenada', () => {
    const r = calculateCheckoutSummary([item({ cantidad: 5, shippingMode: 'free', shippingFee: 35000 })], 'RM', SHIPPING_CONFIG);
    expect(r.despacho).toBe(0);
    expect(r.total).toBe(50000);
  });

  it('aplica envío fijo explícito y el recargo por unidades despachables', () => {
    const r = calculateCheckoutSummary([item({ shippingMode: 'fixed', shippingFee: 35000 })], 'RM', SHIPPING_CONFIG);
    expect(r.despacho).toBe(37500);
  });

  it('compara región case-insensitive', () => {
    const upper = calculateCheckoutSummary([item({ shippingMode: 'inherit' })], 'XV', SHIPPING_CONFIG);
    const lower = calculateCheckoutSummary([item({ shippingMode: 'inherit' })], 'xv', SHIPPING_CONFIG);
    expect(lower.despacho).toBe(upper.despacho);
    expect(upper.despacho).toBe(25500);
  });

  it('no cobra despacho ni genera total cuando no hay productos', () => {
    const r = calculateCheckoutSummary([], 'RM', SHIPPING_CONFIG);
    expect(r.subtotal).toBe(0);
    expect(r.despacho).toBe(0);
    expect(r.total).toBe(0);
    expect(r.neto + r.iva).toBe(r.total);
  });
});

describe('validateCheckoutPayload', () => {
  it('payload válido para boleta no produce errores', () => {
    expect(validateCheckoutPayload(validPayload({ billing: { documentType: 'boleta' } }))).toEqual([]);
  });

  it('factura exige datos tributarios completos', () => {
    const errs = validateCheckoutPayload(validPayload({ billing: { documentType: 'factura' } }));
    for (const field of ['billing.rut', 'billing.razonSocial', 'billing.giro', 'billing.direccion', 'billing.comuna']) {
      expect(errs.some((e) => e.field === field)).toBe(true);
    }
  });

  it('acepta factura con datos tributarios válidos', () => {
    const errs = validateCheckoutPayload(validPayload({ billing: {
      documentType: 'factura', rut: '12345678-5', razonSocial: 'Empresa Test SpA', giro: 'Construcción', direccion: 'Avenida 123', comuna: 'Linares',
    } }));
    expect(errs).toEqual([]);
  });

  it('exige al menos un item', () => {
    expect(validateCheckoutPayload(validPayload({ items: [] }))).toContainEqual({ field: 'items', message: expect.any(String) });
  });

  it('reporta items con productoId faltante', () => {
    expect(validateCheckoutPayload(validPayload({ items: [item({ productoId: '' })] })).some((e) => e.field === 'items[0].productoId')).toBe(true);
  });

  it('reporta cantidad <= 0 o no finita', () => {
    for (const cantidad of [0, -1, NaN]) expect(validateCheckoutPayload(validPayload({ items: [item({ cantidad })] })).some((e) => e.field.endsWith('.cantidad'))).toBe(true);
  });

  it('reporta precioUnitario <= 0 o no finito', () => {
    for (const precioUnitario of [0, Infinity]) expect(validateCheckoutPayload(validPayload({ items: [item({ precioUnitario })] })).some((e) => e.field.endsWith('.precioUnitario'))).toBe(true);
  });

  it('exige región no vacía', () => {
    expect(validateCheckoutPayload(validPayload({ region: '' })).some((e) => e.field === 'region')).toBe(true);
    expect(validateCheckoutPayload(validPayload({ region: '   ' })).some((e) => e.field === 'region')).toBe(true);
  });

  it('exige nombre con al menos 3 chars', () => {
    expect(validateCheckoutPayload(validPayload({ cliente: { nombre: 'Jo', email: 'a@b.cl' } })).some((e) => e.field === 'cliente.nombre')).toBe(true);
  });

  it('rechaza emails inválidos', () => {
    for (const email of ['', 'foo', 'foo@', 'foo@bar', '@bar.cl', 'a b@c.cl']) {
      expect(validateCheckoutPayload(validPayload({ cliente: { nombre: 'Juan Pérez', email } })).some((e) => e.field === 'cliente.email')).toBe(true);
    }
  });

  it('teléfono opcional: si está presente debe tener ≥8 dígitos', () => {
    expect(validateCheckoutPayload(validPayload({ cliente: { nombre: 'Juan Pérez', email: 'a@b.cl', telefono: '+56 9 1234' } })).some((e) => e.field === 'cliente.telefono')).toBe(true);
    expect(validateCheckoutPayload(validPayload({ cliente: { nombre: 'Juan Pérez', email: 'a@b.cl' } }))).toEqual([]);
  });

  it('shippingAddress opcional pero exige ≥6 chars si se entrega', () => {
    expect(validateCheckoutPayload(validPayload({ shippingAddress: 'Av' })).some((e) => e.field === 'shippingAddress')).toBe(true);
    expect(validateCheckoutPayload(validPayload({ shippingAddress: 'Av. Siempre Viva 123' }))).toEqual([]);
  });

  it('tolera payload con cliente undefined sin tirar', () => {
    const errs = validateCheckoutPayload({ items: [item()], region: 'RM', cliente: undefined as unknown as CheckoutPayload['cliente'] });
    expect(errs.some((e) => e.field === 'cliente.nombre')).toBe(true);
    expect(errs.some((e) => e.field === 'cliente.email')).toBe(true);
  });
});
