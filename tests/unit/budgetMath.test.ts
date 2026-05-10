import { describe, it, expect } from 'vitest';
import {
  IVA_RATE,
  buildProposal,
  computeTotals,
  formatCLP,
  type QuoteLine,
} from '@/lib/budgetMath';

const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  materialId: 'm1',
  name: 'Material',
  unitPrice: 1000,
  quantity: 1,
  ...over,
});

describe('IVA_RATE', () => {
  it('is the Chilean VAT rate (19%)', () => {
    expect(IVA_RATE).toBe(0.19);
  });
});

describe('computeTotals', () => {
  it('aggregates a single line with default IVA', () => {
    const t = computeTotals([line({ unitPrice: 1000, quantity: 2 })]);
    expect(t.itemsSubtotal).toBe(2000);
    expect(t.itemCount).toBe(2);
    expect(t.subtotal).toBe(2000);
    expect(t.ivaRate).toBe(IVA_RATE);
    expect(t.iva).toBe(380);
    expect(t.total).toBe(2380);
    expect(t.shippingCost).toBe(0);
    expect(t.installationCost).toBe(0);
  });

  it('clamps negative quantities/prices to zero', () => {
    const t = computeTotals([
      line({ unitPrice: -100, quantity: 5 }),
      line({ unitPrice: 100, quantity: -3 }),
      line({ unitPrice: 200, quantity: 4 }),
    ]);
    expect(t.itemsSubtotal).toBe(800);
    // qty itself is clamped (line 2 contributes 0), but a positive qty paired
    // with a clamped negative price still counts: 5 + 0 + 4 = 9.
    expect(t.itemCount).toBe(9);
  });

  it('adds shipping and installation pre-IVA', () => {
    const t = computeTotals([line({ unitPrice: 1000, quantity: 1 })], {
      shippingCost: 500,
      installationCost: 200,
    });
    expect(t.subtotal).toBe(1700);
    // 1700 * 0.19 = 323
    expect(t.iva).toBe(323);
    expect(t.total).toBe(2023);
    expect(t.shippingCost).toBe(500);
    expect(t.installationCost).toBe(200);
  });

  it('clamps negative shipping/installation to zero', () => {
    const t = computeTotals([line()], { shippingCost: -10, installationCost: -5 });
    expect(t.shippingCost).toBe(0);
    expect(t.installationCost).toBe(0);
  });

  it('honours a custom ivaRate override', () => {
    const t = computeTotals([line({ unitPrice: 1000, quantity: 1 })], { ivaRate: 0 });
    expect(t.ivaRate).toBe(0);
    expect(t.iva).toBe(0);
    expect(t.total).toBe(1000);
  });

  it('rounds CLP amounts to integers', () => {
    const t = computeTotals([line({ unitPrice: 333.333, quantity: 3 })]);
    expect(Number.isInteger(t.itemsSubtotal)).toBe(true);
    expect(Number.isInteger(t.iva)).toBe(true);
    expect(Number.isInteger(t.total)).toBe(true);
  });

  it('returns zeroed totals for an empty cart', () => {
    const t = computeTotals([]);
    expect(t.itemsSubtotal).toBe(0);
    expect(t.subtotal).toBe(0);
    expect(t.iva).toBe(0);
    expect(t.total).toBe(0);
    expect(t.itemCount).toBe(0);
  });
});

describe('buildProposal', () => {
  const fixedDate = new Date('2026-03-14T12:00:00.000Z');

  it('groups lines by category and sorts sections by label (es)', () => {
    const p = buildProposal({
      lines: [
        line({ category: 'electricidad', unitPrice: 100, quantity: 2 }),
        line({ category: 'obra-gruesa', unitPrice: 500, quantity: 1 }),
        line({ category: 'electricidad', unitPrice: 50, quantity: 4 }),
      ],
      issuedAt: fixedDate,
    });
    expect(p.sections.map((s) => s.category)).toEqual(['electricidad', 'obra-gruesa']);
    const elec = p.sections.find((s) => s.category === 'electricidad')!;
    expect(elec.label).toBe('Electricidad');
    expect(elec.lines).toHaveLength(2);
    expect(elec.subtotal).toBe(400);
  });

  it('falls back to "servicios" category when none is provided', () => {
    const p = buildProposal({
      lines: [line({ unitPrice: 100, quantity: 1 })],
      issuedAt: fixedDate,
    });
    expect(p.sections).toHaveLength(1);
    expect(p.sections[0].category).toBe('servicios');
    expect(p.sections[0].label).toBe('Servicios');
  });

  it('title-cases unknown category labels', () => {
    const p = buildProposal({
      lines: [line({ category: 'tecnologia_avanzada', unitPrice: 1, quantity: 1 })],
      issuedAt: fixedDate,
    });
    const sec = p.sections[0];
    expect(sec.category).toBe('tecnologia_avanzada');
    expect(sec.label).toBe('Tecnologia Avanzada');
  });

  it('generates a deterministic doc number from a UUID id', () => {
    const p = buildProposal({
      id: '12345678-90ab-cdef-1234-567890abcdef',
      lines: [line()],
      issuedAt: fixedDate,
    });
    expect(p.id).toBe('12345678-90ab-cdef-1234-567890abcdef');
    expect(p.docNumber).toBe('FAB-2026-ABCDEF');
    expect(p.issuedAt).toBe(fixedDate.toISOString());
  });

  it('generates a random 6-char doc-number tail when no id is given', () => {
    const p = buildProposal({ lines: [line()], issuedAt: fixedDate });
    expect(p.id).toBe('');
    expect(p.docNumber).toMatch(/^FAB-2026-[0-9A-Z]{6}$/);
  });

  it('defaults validityDays to 15 and accepts overrides', () => {
    expect(buildProposal({ lines: [], issuedAt: fixedDate }).validityDays).toBe(15);
    expect(
      buildProposal({ lines: [], issuedAt: fixedDate, validityDays: 30 }).validityDays,
    ).toBe(30);
  });

  it('builds a summary with item count and category count', () => {
    const p = buildProposal({
      lines: [
        line({ category: 'a', unitPrice: 100, quantity: 1 }),
        line({ category: 'b', unitPrice: 100, quantity: 2 }),
      ],
      issuedAt: fixedDate,
    });
    expect(p.summary).toMatch(/3 ítems/);
    expect(p.summary).toMatch(/2 categorías/);
  });

  it('uses singular labels for 1 item / 1 category', () => {
    const p = buildProposal({
      lines: [line({ category: 'a', unitPrice: 100, quantity: 1 })],
      issuedAt: fixedDate,
    });
    expect(p.summary).toMatch(/1 ítem(?!s)/);
    expect(p.summary).toMatch(/1 categoría(?!s)/);
  });

  it('reuses provided totals instead of recomputing', () => {
    const fakeTotals = {
      itemsSubtotal: 1,
      shippingCost: 0,
      installationCost: 0,
      subtotal: 1,
      ivaRate: IVA_RATE,
      iva: 0,
      total: 1,
      itemCount: 99,
    };
    const p = buildProposal({
      lines: [line({ unitPrice: 99999, quantity: 99 })],
      totals: fakeTotals,
      issuedAt: fixedDate,
    });
    expect(p.totals).toBe(fakeTotals);
    expect(p.summary).toMatch(/99 ítems/);
  });
});

describe('formatCLP', () => {
  it('formats with no decimals and Chilean grouping', () => {
    expect(formatCLP(12990)).toMatch(/12[.\s]?990/);
    expect(formatCLP(12990)).not.toMatch(/[.,]\d{2}\b/);
  });

  it('coerces non-finite input to 0', () => {
    expect(formatCLP(Number.NaN)).toMatch(/0/);
    expect(formatCLP(Number.POSITIVE_INFINITY)).toMatch(/0/);
  });
});
