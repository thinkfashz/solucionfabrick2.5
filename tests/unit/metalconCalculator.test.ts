import { describe, expect, it } from 'vitest';
import { calculateMetalcon } from '@/lib/metalconCalculator';
import {
  METALCON_HOUSE_PRESETS,
  assemblySummary,
  clearWallIntervals,
  regularStudOffsets,
  wallLengthM,
} from '@/lib/metalconAssembly';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

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

  it('keeps the previous building viewer and adds reversible inspection movement', () => {
    const calculator = read('src/components/store/MetalconCalculator.tsx');
    const viewer = read('src/components/store/MetalconCinematicViewer.tsx');
    expect(calculator).toContain('<MetalconCinematicViewer input={input}/>');
    expect(calculator).toContain('/herramientas/metalcon/monitoreo');
    expect(viewer).toContain('Separar panel para inspección');
    expect(viewer).toContain('Mover montante C');
    expect(viewer).toContain('Desplazamiento visual reversible');
  });
});

describe('Metalcon full-house assembly presets', () => {
  it('keeps the three uploaded-reference footprints and their key dimensions', () => {
    expect(METALCON_HOUSE_PRESETS['compact-5x5'].widthM).toBe(5);
    expect(METALCON_HOUSE_PRESETS['compact-5x5'].depthM).toBe(5);
    expect(METALCON_HOUSE_PRESETS['family-6x8'].widthM).toBe(6);
    expect(METALCON_HOUSE_PRESETS['family-6x8'].depthM).toBe(8);
    expect(METALCON_HOUSE_PRESETS['studio-45x58'].widthM).toBe(4.5);
    expect(METALCON_HOUSE_PRESETS['studio-45x58'].depthM).toBe(5.8);
    expect(METALCON_HOUSE_PRESETS['studio-45x58'].terraceDepthM).toBe(1.8);
  });

  it('cuts regular stud modulation around openings while retaining wall ends', () => {
    const wall = METALCON_HOUSE_PRESETS['family-6x8'].walls[0];
    const studs = regularStudOffsets(wall, 0.4);
    const length = wallLengthM(wall);
    expect(studs[0]).toBe(0);
    expect(studs[studs.length - 1]).toBe(length);
    for (const opening of wall.openings) {
      expect(studs.some((offset) => offset > opening.offsetM + 0.025 && offset < opening.offsetM + opening.widthM - 0.025)).toBe(false);
    }
  });

  it('splits the bottom track at door openings and summarizes the complete mesh', () => {
    const preset = METALCON_HOUSE_PRESETS['studio-45x58'];
    const south = preset.walls.find((wall) => wall.id === 'S45-S');
    expect(south).toBeTruthy();
    const intervals = clearWallIntervals(south!, true);
    expect(intervals.length).toBeGreaterThan(1);
    const summary = assemblySummary(preset, 40);
    expect(summary.panels).toBe(preset.walls.length);
    expect(summary.totalWallM).toBeGreaterThan(20);
    expect(summary.regularStuds).toBeGreaterThan(40);
    expect(summary.doors).toBeGreaterThan(0);
    expect(summary.windows).toBeGreaterThan(0);
  });
});
