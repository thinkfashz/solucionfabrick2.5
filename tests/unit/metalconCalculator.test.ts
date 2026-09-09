import { describe, expect, it } from 'vitest';
import { calculateMetalcon } from '@/lib/metalconCalculator';

describe('Metalcon preliminary calculator',()=>{
  it('modulates a six metre wall at 40 cm and adds double jambs',()=>{
    const result=calculateMetalcon({widthM:6,heightM:2.4,spacingCm:40,osbWidthCm:122,hasDoor:true,hasWindow:true});
    expect(result.baseStuds).toBe(16);
    expect(result.openingReinforcements).toBe(8);
    expect(result.totalStuds).toBe(24);
    expect(result.trackMeters).toBe(12);
    expect(result.osbSheets).toBeGreaterThan(0);
  });
  it('supports 120 cm OSB and a wall without openings',()=>{
    const result=calculateMetalcon({widthM:2.4,heightM:2.4,spacingCm:40,osbWidthCm:120,hasDoor:false,hasWindow:false});
    expect(result.openings).toBe(0);
    expect(result.openingReinforcements).toBe(0);
    expect(result.osbSheets).toBe(3);
  });
});
