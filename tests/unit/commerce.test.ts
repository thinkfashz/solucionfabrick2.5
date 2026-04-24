import { describe, it, expect } from 'vitest';
import {
  formatCLP,
  shortRecordId,
  normalizeOrderStatus,
  orderStatusLabel,
  deliveryStatusFromOrderStatus,
  normalizeLineItems,
  normalizeShippingAddress,
  resolveCategoryName,
  buildProductTagline,
  buildCategoryMap,
} from '@/lib/commerce';

describe('formatCLP', () => {
  it('formats Chilean pesos without decimals', () => {
    const out = formatCLP(1250000);
    expect(out.replace(/\s+/g, ' ')).toMatch(/1\.250\.000/);
  });

  it('handles zero', () => {
    expect(formatCLP(0)).toMatch(/0/);
  });
});

describe('shortRecordId', () => {
  it('returns last 8 chars uppercased', () => {
    expect(shortRecordId('abcdef1234567890')).toBe('34567890');
  });

  it('works with short ids', () => {
    expect(shortRecordId('abc')).toBe('ABC');
  });
});

describe('normalizeOrderStatus', () => {
  it('maps known english aliases', () => {
    expect(normalizeOrderStatus('approved')).toBe('confirmado');
    expect(normalizeOrderStatus('shipped')).toBe('enviado');
    expect(normalizeOrderStatus('delivered')).toBe('entregado');
    expect(normalizeOrderStatus('rejected')).toBe('cancelado');
  });

  it('falls back to pendiente for unknown/empty', () => {
    expect(normalizeOrderStatus(undefined)).toBe('pendiente');
    expect(normalizeOrderStatus('weird-value')).toBe('pendiente');
    expect(normalizeOrderStatus('')).toBe('pendiente');
  });
});

describe('orderStatusLabel', () => {
  it('returns Spanish label', () => {
    expect(orderStatusLabel('approved')).toBe('Confirmado');
    expect(orderStatusLabel(undefined)).toBe('Pendiente');
  });
});

describe('deliveryStatusFromOrderStatus', () => {
  it('maps logical delivery states', () => {
    expect(deliveryStatusFromOrderStatus('entregado')).toBe('entregado');
    expect(deliveryStatusFromOrderStatus('enviado')).toBe('en_camino');
    expect(deliveryStatusFromOrderStatus('cancelado')).toBe('fallido');
    expect(deliveryStatusFromOrderStatus('confirmado')).toBe('pendiente');
  });
});

describe('normalizeLineItems', () => {
  it('returns empty array for non-arrays', () => {
    expect(normalizeLineItems(null)).toEqual([]);
    expect(normalizeLineItems('x')).toEqual([]);
    expect(normalizeLineItems({})).toEqual([]);
  });

  it('normalizes quantity to at least 1 and rounds', () => {
    const items = normalizeLineItems([{ id: 'a', cantidad: 0.4, precioUnitario: 100 }]);
    expect(items[0].quantity).toBe(1);
  });

  it('computes subtotal per item', () => {
    const items = normalizeLineItems([{ id: 'a', cantidad: 3, precioUnitario: 1000 }]);
    expect(items[0].subtotal).toBe(3000);
  });

  it('handles mixed english/spanish field names', () => {
    const items = normalizeLineItems([{ productId: 'x', quantity: 2, unitPrice: 500, name: 'Foo' }]);
    expect(items[0]).toMatchObject({ productId: 'x', quantity: 2, unitPrice: 500, subtotal: 1000, name: 'Foo' });
  });
});

describe('normalizeShippingAddress', () => {
  it('returns empty string for null-ish', () => {
    expect(normalizeShippingAddress(null)).toBe('');
    expect(normalizeShippingAddress(undefined)).toBe('');
    expect(normalizeShippingAddress('null')).toBe('');
  });

  it('parses JSON-encoded strings', () => {
    const out = normalizeShippingAddress('{"street":"Av. X","city":"Linares"}');
    expect(out).toContain('Av. X');
    expect(out).toContain('Linares');
  });

  it('joins array values with comma', () => {
    expect(normalizeShippingAddress(['Av X', 'Linares'])).toBe('Av X, Linares');
  });

  it('deduplicates repeated object values', () => {
    const out = normalizeShippingAddress({ a: 'Linares', b: 'Linares' });
    expect(out).toBe('Linares');
  });
});

describe('resolveCategoryName / buildCategoryMap', () => {
  it('builds a map from id→name', () => {
    const map = buildCategoryMap([
      { id: '1', name: 'Herramientas' },
      { id: '2', name: 'Pintura' },
    ]);
    expect(map).toEqual({ '1': 'Herramientas', '2': 'Pintura' });
  });

  it('returns fallback for empty or uuid-like id', () => {
    expect(resolveCategoryName('', {})).toBe('General');
    expect(resolveCategoryName('01234567-89ab-4cde-8f01-23456789abcd', {})).toBe('General');
  });

  it('returns mapped name when present', () => {
    expect(resolveCategoryName('1', { '1': 'Herramientas' })).toBe('Herramientas');
  });
});

describe('buildProductTagline', () => {
  it('prefers tagline over delivery fallback', () => {
    expect(buildProductTagline('Top calidad', '3 días')).toBe('Top calidad');
  });

  it('falls back to delivery', () => {
    expect(buildProductTagline('', '3 días')).toBe('Entrega 3 días');
  });

  it('uses default when both empty', () => {
    expect(buildProductTagline('', '')).toBe('Calidad profesional para tu proyecto');
  });
});
