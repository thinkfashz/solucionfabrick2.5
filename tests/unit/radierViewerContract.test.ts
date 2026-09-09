import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Radier cinematic viewer contract', () => {
  it('replaces the static hero with a dimension-driven WebGL viewer', () => {
    const calculator = read('src/components/store/RadierCalculatorPremium.tsx');
    expect(calculator).toContain("dynamic(() => import('@/components/store/RadierCinematicViewer')");
    expect(calculator).toContain('length={length}');
    expect(calculator).toContain('width={width}');
    expect(calculator).toContain('thickness={thickness}');
    expect(calculator).toContain('baseDepth={baseDepth}');
    expect(calculator).toContain('gravelDepth={gravelDepth}');
    expect(calculator).toContain('shape={shape}');
    expect(calculator).not.toContain('ASSETS.hero');
  });

  it('keeps PBR rendering, camera controls and the 4D construction timeline', () => {
    const viewer = read('src/components/store/RadierCinematicViewer.tsx');
    expect(viewer).toContain("from '@react-three/fiber'");
    expect(viewer).toContain('ACESFilmicToneMapping');
    expect(viewer).toContain('<OrbitControls');
    expect(viewer).toContain('autoRotate={autoRotate}');
    expect(viewer).toContain('type="range"');
    expect(viewer).toContain('Reproducir 4D');
    expect(viewer).toContain('Capas abiertas');
    expect(viewer).toContain('layout(shape, length, width)');
  });
});
