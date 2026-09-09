import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHIPPING_CONFIG,
  calculateShippingTotal,
  normalizeProductShippingMode,
  normalizeShippingConfig,
  resolveProductShippingFee,
  type ShippingConfig,
  type ShippingLineInput,
} from '@/lib/shipping';

const CONFIG: ShippingConfig = {
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

const line = (overrides: Partial<ShippingLineInput> = {}): ShippingLineInput => ({
  productoId: 'p1',
  cantidad: 1,
  precioUnitario: 20_000,
  ...overrides,
});

describe('normalizeShippingConfig', () => {
  it('fusiona configuraciones antiguas parciales con todas las regiones canónicas', () => {
    const config = normalizeShippingConfig({
      mode: 'production',
      rates: [{ region: 'RM', label: 'RM editada', testFee: 1111, productionFee: 2222, eta: '1 día', updatedAt: '2026-09-08', source: 'manual' }],
    });
    expect(config.rates).toHaveLength(DEFAULT_SHIPPING_CONFIG.rates.length);
    expect(config.rates.find((rate) => rate.region === 'RM')).toMatchObject({ productionFee: 2222, source: 'manual' });
    expect(config.rates.find((rate) => rate.region === 'XV')).toMatchObject({ productionFee: 22990 });
    expect(config.rates.find((rate) => rate.region === 'XII')).toBeTruthy();
  });

  it('preserva regiones custom además de la cobertura canónica', () => {
    const config = normalizeShippingConfig({
      rates: [{ region: 'CUSTOM', label: 'Zona especial', testFee: 1234, productionFee: 4321, eta: 'coordinar', updatedAt: '2026-09-08', source: 'manual' }],
    });
    expect(config.rates).toHaveLength(DEFAULT_SHIPPING_CONFIG.rates.length + 1);
    expect(config.rates.find((rate) => rate.region === 'CUSTOM')).toMatchObject({ productionFee: 4321 });
  });
});

describe('normalizeProductShippingMode', () => {
  it('preserva cualquier modo explícito', () => {
    for (const mode of ['inherit', 'test', 'production', 'fixed', 'free'] as const) {
      expect(normalizeProductShippingMode(mode, 35_000)).toBe(mode);
    }
  });

  it('interpreta fee legado como fixed solo cuando no existe modo explícito', () => {
    expect(normalizeProductShippingMode(null, 35_000)).toBe('fixed');
    expect(normalizeProductShippingMode(undefined, 0)).toBe('fixed');
  });

  it('sin metadata hereda la configuración global', () => {
    expect(normalizeProductShippingMode(null, null)).toBe('inherit');
    expect(normalizeProductShippingMode(undefined, undefined)).toBe('inherit');
  });
});

describe('resolveProductShippingFee', () => {
  it('usa tarifa global de producción para inherit', () => {
    expect(resolveProductShippingFee(line({ shippingMode: 'inherit' }), 'RM', CONFIG)).toBe(9_000);
  });

  it('permite forzar test o production por producto', () => {
    expect(resolveProductShippingFee(line({ shippingMode: 'test' }), 'RM', CONFIG)).toBe(7_000);
    expect(resolveProductShippingFee(line({ shippingMode: 'production' }), 'RM', CONFIG)).toBe(9_000);
  });

  it('free siempre gana sobre un fee antiguo almacenado', () => {
    expect(resolveProductShippingFee(line({ shippingMode: 'free', shippingFee: 35_000 }), 'RM', CONFIG)).toBe(0);
  });

  it('fixed usa exclusivamente la tarifa fija configurada', () => {
    expect(resolveProductShippingFee(line({ shippingMode: 'fixed', shippingFee: 35_000 }), 'RM', CONFIG)).toBe(35_000);
  });

  it('respeta override regional en modos basados en región', () => {
    expect(resolveProductShippingFee(line({ shippingMode: 'inherit', shippingRegionOverrides: { XV: 41_000 } }), 'XV', CONFIG)).toBe(41_000);
  });
});

describe('calculateShippingTotal', () => {
  it('no cobra nada cuando todos los productos son free aunque haya varias unidades', () => {
    expect(calculateShippingTotal([line({ cantidad: 5, shippingMode: 'free' })], 'RM', 100_000, CONFIG)).toBe(0);
  });

  it('no hace pagar a productos free el recargo de unidades de productos despachables', () => {
    const total = calculateShippingTotal([
      line({ cantidad: 1, shippingMode: 'inherit' }),
      line({ productoId: 'free', cantidad: 4, shippingMode: 'free' }),
    ], 'RM', 100_000, CONFIG);
    expect(total).toBe(9_000);
  });

  it('cobra recargo por unidades solo sobre líneas despachables', () => {
    const total = calculateShippingTotal([line({ cantidad: 3, shippingMode: 'inherit' })], 'RM', 100_000, CONFIG);
    expect(total).toBe(14_000);
  });

  it('aplica mínimo de compra baja únicamente a modos regionales', () => {
    expect(calculateShippingTotal([line({ shippingMode: 'test' })], 'RM', 20_000, CONFIG)).toBe(10_000);
    expect(calculateShippingTotal([line({ shippingMode: 'fixed', shippingFee: 4_000 })], 'RM', 20_000, CONFIG)).toBe(4_000);
  });

  it('carrito vacío nunca genera costo de despacho', () => {
    expect(calculateShippingTotal([], 'RM', 0, CONFIG)).toBe(0);
  });
});
