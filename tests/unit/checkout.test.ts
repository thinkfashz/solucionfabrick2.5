import { describe, expect, it } from 'vitest';
import { calculateCheckoutSummary, validateCheckoutPayload, type CheckoutPayload, type LineItem } from '@/lib/checkout';

const item = (overrides: Partial<LineItem> = {}): LineItem => ({ productoId: 'p1', cantidad: 2, precioUnitario: 10000, ...overrides });
const validPayload = (overrides: Partial<CheckoutPayload> = {}): CheckoutPayload => ({
  items: [item()], region: 'RM', cliente: { nombre: 'Juan Pérez', email: 'juan@example.com', telefono: '+56912345678' }, ...overrides,
});

describe('calculateCheckoutSummary', () => {
  it('trata catálogo y despacho como total final con IVA incluido', () => {
    const r = calculateCheckoutSummary([item({ cantidad: 2, precioUnitario: 10000 })], 'RM');
    expect(r.subtotal).toBe(20000);
    expect(r.despacho).toBe(35000);
    expect(r.total).toBe(55000);
    expect(r.neto).toBe(46218);
    expect(r.iva).toBe(8782);
    expect(r.neto + r.iva).toBe(r.total);
    expect(r.taxIncluded).toBe(true);
    expect(r.moneda).toBe('CLP');
  });

  it('suma múltiples líneas sin añadir un segundo IVA', () => {
    const r = calculateCheckoutSummary([item({ cantidad: 1, precioUnitario: 5000 }), item({ cantidad: 3, precioUnitario: 2000 })], 'RM');
    expect(r.subtotal).toBe(11000);
    expect(r.total).toBe(r.subtotal + r.despacho);
    expect(r.neto + r.iva).toBe(r.total);
  });

  it('duplica el despacho en regiones extremas (XV/I/XI/XII)', () => {
    for (const region of ['XV', 'I', 'XI', 'XII']) expect(calculateCheckoutSummary([item()], region).despacho).toBe(70000);
  });

  it('compara región case-insensitive', () => {
    expect(calculateCheckoutSummary([item()], 'xv').despacho).toBe(70000);
    expect(calculateCheckoutSummary([item()], 'Xii').despacho).toBe(70000);
  });

  it('despacho base para región normal', () => {
    expect(calculateCheckoutSummary([item()], 'V').despacho).toBe(35000);
    expect(calculateCheckoutSummary([item()], 'RM').despacho).toBe(35000);
  });

  it('mantiene la identidad total = neto + IVA incluso sin productos', () => {
    const r = calculateCheckoutSummary([], 'RM');
    expect(r.subtotal).toBe(0);
    expect(r.total).toBe(35000);
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
