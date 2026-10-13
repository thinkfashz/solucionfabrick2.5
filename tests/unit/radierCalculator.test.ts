import { describe, expect, it } from 'vitest';
import { calculateRadier } from '@/lib/radierCalculator';

describe('calculateRadier', () => {
  const base = { length: 6, width: 4, thickness: 10, baseDepth: 10, gravelDepth: 5, shape: 'rectangular' as const };

  it('preserves the established 6 x 4 m radier calculation', () => {
    const result = calculateRadier(base);
    expect(result.area).toBe(24);
    expect(result.perimeter).toBe(20);
    // 5% por pérdida según Cubicador de Polpaico (antes 8% propio): 24 × 0,10 × 1,05.
    expect(result.concrete).toBeCloseTo(2.52, 3);
    expect(result.stabilized).toBeCloseTo(2.4, 3);
    expect(result.gravel).toBeCloseTo(1.2, 3);
    // Malla en planchas de 13 m² con 2 m² de traslape: 24 / 11 = 3 planchas.
    expect(result.meshSheets).toBe(3);
    // Dosificación G20 (300 kg/m³): 2,52 × 300 / 25 = 31 sacos.
    expect(result.cementBags25).toBe(31);
    // Rendimiento por saco derivado de la misma dosis: 25/300 m³ = 83 L.
    expect(result.cementBagCoverageLiters).toBeGreaterThan(75);
    expect(result.cementBagCoverageLiters).toBeLessThan(90);
    expect(result.mixerBatches).toBe(Math.ceil(result.concrete / .13));
    expect(result.mixerTrucks).toBe(Math.ceil(result.concrete / 7));
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

  it('treats the first commercial level as labor-only with customer-supplied materials', () => {
    const plan = calculateRadier(base).plans[0];
    expect(plan.name).toBe('Solo mano de obra');
    expect(plan.materials).toBe(0);
    expect(plan.labor).toBeGreaterThan(0);
    expect(plan.transport).toBe(0);
    expect(plan.excludes.some((item) => item.includes('Hormigón'))).toBe(true);
  });

  it('includes materials and transport in the complete service reference', () => {
    const plan = calculateRadier(base).plans[1];
    expect(plan.name).toBe('Mano de obra + materiales');
    expect(plan.materials).toBeGreaterThan(0);
    expect(plan.labor).toBeGreaterThan(0);
    expect(plan.transport).toBeGreaterThan(0);
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
