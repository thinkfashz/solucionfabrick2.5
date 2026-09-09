import { describe, expect, it } from 'vitest';
import { calculateMetalcon } from '@/lib/metalconCalculator';

describe('Metalcon preliminary calculator',()=>{
  it('modulates a six metre wall at 40 cm and adds double jambs',()=>{
    const result=calculateMetalcon({widthM:6,heightM:2.4,spacingCm:40,osbWidthCm:122,preset:'house1',cDepthMm:90,thicknessMm:.85,door:{enabled:true,xM:1,widthM:.9,heightM:2,sillM:0},window:{enabled:true,xM:3.7,widthM:1.2,heightM:1.2,sillM:.9}});
    expect(result.baseStuds).toBe(16);
    expect(result.openingReinforcements).toBe(8);
    expect(result.totalStuds).toBe(24);
    expect(result.trackMeters).toBe(12);
    expect(result.osbSheets).toBeGreaterThan(0);
  });
  it('supports 120 cm OSB and a wall without openings',()=>{
    const result=calculateMetalcon({widthM:2.4,heightM:2.4,spacingCm:40,osbWidthCm:120,preset:'partition',cDepthMm:60,thicknessMm:.5,door:{enabled:false,xM:0,widthM:.9,heightM:2,sillM:0},window:{enabled:false,xM:1,widthM:1.2,heightM:1.2,sillM:.9}});
    expect(result.openings).toBe(0);
    expect(result.openingReinforcements).toBe(0);
    expect(result.osbSheets).toBe(3);
  });
  it('warns when an opening is wider than 1.20 m or exceeds the panel',()=>{
    const result=calculateMetalcon({widthM:3,heightM:2.4,spacingCm:40,osbWidthCm:122,preset:'house2',cDepthMm:100,thicknessMm:1,door:{enabled:true,xM:2,widthM:1.3,heightM:2.1,sillM:0},window:{enabled:false,xM:0,widthM:1.2,heightM:1.2,sillM:.9}});
    expect(result.warnings.some(item=>item.includes('1,20 m'))).toBe(true);
    expect(result.warnings.some(item=>item.includes('fuera'))).toBe(true);
    expect(result.warnings.some(item=>item.includes('memoria'))).toBe(true);
  });
});
