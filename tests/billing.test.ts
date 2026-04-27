import { describe, it, expect } from 'vitest';
import { computeDteTotals, getBillingDriver } from '../src/lib/billing/provider';

describe('billing provider', () => {
  describe('computeDteTotals', () => {
    it('treats unit prices as gross for boletas (39)', () => {
      const totals = computeDteTotals({
        dte_type: 39,
        order_id: 'o1',
        items: [{ description: 'Servicio', quantity: 1, unit_price: 11_900 }],
      });
      // 11_900 incluye IVA 19% → neto = 10_000, iva = 1_900, total = 11_900.
      expect(totals.neto).toBe(10_000);
      expect(totals.iva).toBe(1_900);
      expect(totals.exento).toBe(0);
      expect(totals.total).toBe(11_900);
    });

    it('treats unit prices as net for facturas (33)', () => {
      const totals = computeDteTotals({
        dte_type: 33,
        order_id: 'o1',
        items: [{ description: 'Servicio', quantity: 2, unit_price: 50_000 }],
      });
      // 100_000 neto + 19_000 iva = 119_000.
      expect(totals.neto).toBe(100_000);
      expect(totals.iva).toBe(19_000);
      expect(totals.total).toBe(119_000);
    });

    it('keeps exempt items out of the IVA base', () => {
      const totals = computeDteTotals({
        dte_type: 33,
        order_id: 'o1',
        items: [
          { description: 'Servicio afecto', quantity: 1, unit_price: 100_000 },
          { description: 'Servicio exento', quantity: 1, unit_price: 50_000, exempt: true },
        ],
      });
      expect(totals.neto).toBe(100_000);
      expect(totals.iva).toBe(19_000);
      expect(totals.exento).toBe(50_000);
      expect(totals.total).toBe(169_000);
    });
  });

  describe('getBillingDriver', () => {
    it('falls back to mock when nothing is configured', () => {
      const prev = process.env.BILLING_PROVIDER;
      delete process.env.BILLING_PROVIDER;
      const driver = getBillingDriver();
      expect(driver.code).toBe('mock');
      if (prev) process.env.BILLING_PROVIDER = prev;
    });
  });
});
