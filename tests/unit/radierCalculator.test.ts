import { describe, expect, it } from 'vitest';
import { calculateRadier } from '@/lib/radierCalculator';

describe('calculateRadier', () => {
  const base = { length: 6, width: 4, thickness: 10, baseDepth: 10, gravelDepth: 5, shape: 'rectangular' as const };

  it('preserves the established 6 x 4 m radier calculation', () => {
    const result = calculateRadier(base);
    expect(result.area).toBe(24);
    expect(result.perimeter).toBe(20);
    expect(result.concrete).toBeCloseTo(2.592, 3);
    expect(result.stabilized).toBeCloseTo(2.4, 3);
    expect(result.gravel).toBeCloseTo(1.2, 3);
    expect(result.cementBags25).toBe(19);
    expect(result.meshSheets).toBe(2);
  });

  it('calculates 43 cm stakes from the moldaje perimeter at about 1.5 m spacing', () => {
    expect(calculateRadier(base).stakes43cm).toBe(14);
  });

  it('adds 10% moisture barrier allowance', () => {
    expect(calculateRadier(base).moistureBarrierM2).toBeCloseTo(26.4, 3);
  });

  it('keeps all three commercial reference levels ordered by scope', () => {
    const plans = calculateRadier(base).plans;
    expect(plans.map((plan) => plan.id)).toEqual(['materiales', 'estandar', 'reforzado']);
    expect(plans[0].total).toBeLessThan(plans[1].total);
    expect(plans[1].total).toBeLessThan(plans[2].total);
  });

  it('applies the existing shape factors for non-rectangular layouts', () => {
    const rectangular = calculateRadier(base);
    const lShape = calculateRadier({ ...base, shape: 'l' });
    expect(lShape.area).toBeCloseTo(rectangular.area * .82, 3);
    expect(lShape.perimeter).toBeCloseTo(rectangular.perimeter * 1.16, 3);
  });

  it('fails safe to positive defaults for invalid numeric inputs', () => {
    const result = calculateRadier({ ...base, length: Number.NaN, width: 0, thickness: -5 });
    expect(result.area).toBeGreaterThan(0);
    expect(result.concrete).toBeGreaterThan(0);
    expect(Number.isFinite(result.plans[1].total)).toBe(true);
  });
});
