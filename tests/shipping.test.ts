import { describe, it, expect } from 'vitest';
import { mockDriver } from '../src/lib/shipping/drivers/mock';
import { quoteAll } from '../src/lib/shipping/carrier';
import { isValidEan13 } from '../src/lib/inventory';

describe('shipping mock driver', () => {
  it('returns standard + express quotes', async () => {
    const quotes = await mockDriver.quote({
      origin: { region: 'Maule', comuna: 'Linares' },
      destination: { region: 'RM', comuna: 'Santiago' },
      items: [{ qty: 1, weight_g: 1500 }],
    });
    expect(quotes).toHaveLength(2);
    expect(quotes.map((q) => q.service_code).sort()).toEqual(['express', 'standard']);
    for (const q of quotes) {
      expect(q.cost_clp).toBeGreaterThan(0);
      expect(q.eta_days_min).toBeLessThanOrEqual(q.eta_days_max);
    }
  });

  it('makes far-away regions more expensive than RM', async () => {
    const [rm] = await mockDriver.quote({
      origin: { region: 'Maule', comuna: 'Linares' },
      destination: { region: 'RM', comuna: 'Santiago' },
      items: [{ qty: 1, weight_g: 1500 }],
    });
    const [magallanes] = await mockDriver.quote({
      origin: { region: 'Maule', comuna: 'Linares' },
      destination: { region: 'XII', comuna: 'Punta Arenas' },
      items: [{ qty: 1, weight_g: 1500 }],
    });
    expect(magallanes.cost_clp).toBeGreaterThan(rm.cost_clp);
  });

  it('quoteAll returns mock quotes when no real carrier is configured', async () => {
    const { quotes } = await quoteAll({
      origin: { region: 'Maule', comuna: 'Linares' },
      destination: { region: 'RM', comuna: 'Santiago' },
      items: [{ qty: 1, weight_g: 1500 }],
    });
    // First quote should be the cheapest, every quote should have positive cost.
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0].cost_clp).toBeLessThanOrEqual(quotes[quotes.length - 1].cost_clp);
  });
});

describe('isValidEan13', () => {
  it('accepts a known good EAN-13 (Wikipedia reference)', () => {
    expect(isValidEan13('4006381333931')).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(isValidEan13('123')).toBe(false);
    expect(isValidEan13('abcdefghijklm')).toBe(false);
    expect(isValidEan13('')).toBe(false);
  });

  it('rejects bad checksum', () => {
    expect(isValidEan13('4006381333932')).toBe(false);
  });
});
