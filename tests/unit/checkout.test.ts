import { describe, expect, it } from 'vitest';
import {
  calculateCheckoutSummary,
  validateCheckoutPayload,
  type CheckoutPayload,
  type LineItem,
} from '@/lib/checkout';

const item = (overrides: Partial<LineItem> = {}): LineItem => ({
  productoId: 'p1',
  cantidad: 2,
  precioUnitario: 10000,
  ...overrides,
});

const validPayload = (overrides: Partial<CheckoutPayload> = {}): CheckoutPayload => ({
  items: [item()],
  region: 'RM',
  cliente: {
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    telefono: '+56912345678',
  },
  ...overrides,
});

describe('calculateCheckoutSummary', () => {
  it('suma subtotal × cantidad y aplica IVA 19% redondeado', () => {
    const r = calculateCheckoutSummary([item({ cantidad: 2, precioUnitario: 10000 })], 'RM');
    expect(r.subtotal).toBe(20000);
    expect(r.iva).toBe(3800);
    expect(r.despacho).toBe(35000);
    expect(r.total).toBe(58800);
    expect(r.moneda).toBe('CLP');
  });

  it('suma múltiples líneas', () => {
    const r = calculateCheckoutSummary(
      [item({ cantidad: 1, precioUnitario: 5000 }), item({ cantidad: 3, precioUnitario: 2000 })],
      'RM',
    );
    expect(r.subtotal).toBe(11000);
  });

  it('duplica el despacho en regiones extremas (XV/I/XI/XII)', () => {
    for (const region of ['XV', 'I', 'XI', 'XII']) {
      const r = calculateCheckoutSummary([item()], region);
      expect(r.despacho).toBe(70000);
    }
  });

  it('compara región case-insensitive', () => {
    expect(calculateCheckoutSummary([item()], 'xv').despacho).toBe(70000);
    expect(calculateCheckoutSummary([item()], 'Xii').despacho).toBe(70000);
  });

  it('despacho base para región normal', () => {
    expect(calculateCheckoutSummary([item()], 'V').despacho).toBe(35000);
    expect(calculateCheckoutSummary([item()], 'RM').despacho).toBe(35000);
  });

  it('subtotal 0 con items vacíos', () => {
    const r = calculateCheckoutSummary([], 'RM');
    expect(r.subtotal).toBe(0);
    expect(r.iva).toBe(0);
    expect(r.total).toBe(35000);
  });

  it('redondea IVA al entero más cercano', () => {
    // 12345 * 0.19 = 2345.55 → 2346
    const r = calculateCheckoutSummary([item({ cantidad: 1, precioUnitario: 12345 })], 'RM');
    expect(r.iva).toBe(2346);
  });
});

describe('validateCheckoutPayload', () => {
  it('payload válido no produce errores', () => {
    expect(validateCheckoutPayload(validPayload())).toEqual([]);
  });

  it('exige al menos un item', () => {
    const errs = validateCheckoutPayload(validPayload({ items: [] }));
    expect(errs).toContainEqual({ field: 'items', message: expect.any(String) });
  });

  it('reporta items con productoId faltante', () => {
    const errs = validateCheckoutPayload(
      validPayload({ items: [item({ productoId: '' })] }),
    );
    expect(errs.some((e) => e.field === 'items[0].productoId')).toBe(true);
  });

  it('reporta cantidad <= 0 o no finita', () => {
    expect(
      validateCheckoutPayload(validPayload({ items: [item({ cantidad: 0 })] })).some((e) =>
        e.field.endsWith('.cantidad'),
      ),
    ).toBe(true);
    expect(
      validateCheckoutPayload(validPayload({ items: [item({ cantidad: -1 })] })).some((e) =>
        e.field.endsWith('.cantidad'),
      ),
    ).toBe(true);
    expect(
      validateCheckoutPayload(validPayload({ items: [item({ cantidad: NaN })] })).some((e) =>
        e.field.endsWith('.cantidad'),
      ),
    ).toBe(true);
  });

  it('reporta precioUnitario <= 0 o no finito', () => {
    expect(
      validateCheckoutPayload(validPayload({ items: [item({ precioUnitario: 0 })] })).some(
        (e) => e.field.endsWith('.precioUnitario'),
      ),
    ).toBe(true);
    expect(
      validateCheckoutPayload(
        validPayload({ items: [item({ precioUnitario: Infinity })] }),
      ).some((e) => e.field.endsWith('.precioUnitario')),
    ).toBe(true);
  });

  it('exige región no vacía', () => {
    expect(
      validateCheckoutPayload(validPayload({ region: '' })).some((e) => e.field === 'region'),
    ).toBe(true);
    expect(
      validateCheckoutPayload(validPayload({ region: '   ' })).some((e) => e.field === 'region'),
    ).toBe(true);
  });

  it('exige nombre con al menos 3 chars', () => {
    expect(
      validateCheckoutPayload(
        validPayload({ cliente: { nombre: 'Jo', email: 'a@b.cl' } }),
      ).some((e) => e.field === 'cliente.nombre'),
    ).toBe(true);
    // espacios al borde no cuentan
    expect(
      validateCheckoutPayload(
        validPayload({ cliente: { nombre: '  J  ', email: 'a@b.cl' } }),
      ).some((e) => e.field === 'cliente.nombre'),
    ).toBe(true);
  });

  it('rechaza emails inválidos', () => {
    for (const email of ['', 'foo', 'foo@', 'foo@bar', '@bar.cl', 'a b@c.cl']) {
      expect(
        validateCheckoutPayload(
          validPayload({ cliente: { nombre: 'Juan Pérez', email } }),
        ).some((e) => e.field === 'cliente.email'),
      ).toBe(true);
    }
  });

  it('teléfono opcional: si está presente debe tener ≥8 dígitos', () => {
    expect(
      validateCheckoutPayload(
        validPayload({
          cliente: { nombre: 'Juan Pérez', email: 'a@b.cl', telefono: '+56 9 1234' },
        }),
      ).some((e) => e.field === 'cliente.telefono'),
    ).toBe(true);

    // teléfono ausente: ok
    expect(
      validateCheckoutPayload(
        validPayload({ cliente: { nombre: 'Juan Pérez', email: 'a@b.cl' } }),
      ),
    ).toEqual([]);
  });

  it('teléfono con formato chileno largo es válido', () => {
    expect(
      validateCheckoutPayload(
        validPayload({
          cliente: { nombre: 'Juan Pérez', email: 'a@b.cl', telefono: '+56 9 1234 5678' },
        }),
      ),
    ).toEqual([]);
  });

  it('shippingAddress opcional pero exige ≥6 chars si se entrega', () => {
    expect(
      validateCheckoutPayload(validPayload({ shippingAddress: 'Av' })).some(
        (e) => e.field === 'shippingAddress',
      ),
    ).toBe(true);
    expect(
      validateCheckoutPayload(validPayload({ shippingAddress: 'Av. Siempre Viva 123' })),
    ).toEqual([]);
  });

  it('tolera payload con cliente undefined sin tirar', () => {
    const errs = validateCheckoutPayload({
      items: [item()],
      region: 'RM',
      cliente: undefined as unknown as CheckoutPayload['cliente'],
    });
    expect(errs.some((e) => e.field === 'cliente.nombre')).toBe(true);
    expect(errs.some((e) => e.field === 'cliente.email')).toBe(true);
  });
});
