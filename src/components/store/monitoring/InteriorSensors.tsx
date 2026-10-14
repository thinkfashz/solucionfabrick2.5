'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';

export interface InteriorSensorsProps {
  preset: MetalconHousePreset;
  scores: Record<string, number>;
  active: boolean;
}

const SENSOR_HEIGHTS = [0.55, 1.35, 2.05];
const RAIL_INSET = 0.07;
const SENSOR_RADIUS = 0.048;

function scoreColor(score: number): { color: string; emissive: string } {
  if (score > 0.7) return { color: '#ef4444', emissive: '#7f1010' };
  if (score > 0.35) return { color: '#fbbf24', emissive: '#7a5208' };
  return { color: '#34d399', emissive: '#0a4434' };
}

export default function InteriorSensors({ preset, scores, active }: InteriorSensorsProps) {
  const scale = Math.min(1, 8.4 / Math.max(preset.widthM, preset.depthM + (preset.terraceDepthM ?? 0)));
  const cx = preset.widthM / 2;
  const cz = preset.depthM / 2;

  const walls = useMemo(() => {
    return preset.walls.map((wall) => {
      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.z - wall.start.z;
      const len = Math.hypot(dx, dz);
      const midX = (wall.start.x + wall.end.x) / 2 - cx;
      const midZ = (wall.start.z + wall.end.z) / 2 - cz;
      let nx = -dz / (len || 1);
      let nz = dx / (len || 1);
      if (Math.abs(midX) > 0.15 || Math.abs(midZ) > 0.15) {
        if (midX * nx + midZ * nz > 0) { nx = -nx; nz = -nz; }
      }
      const centerX = wall.start.x - cx + dx / 2 + nx * RAIL_INSET;
      const centerZ = wall.start.z - cz + dz / 2 + nz * RAIL_INSET;
      const rotY = Math.atan2(dx, dz);
      const count = Math.max(2, Math.round(len / 1.1));
      const points: Array<[number, number, number]> = [];
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const x = wall.start.x - cx + dx * t + nx * RAIL_INSET;
        const z = wall.start.z - cz + dz * t + nz * RAIL_INSET;
        for (const y of SENSOR_HEIGHTS) points.push([x, y, z]);
      }
      return { id: wall.id, len, rotY, centerX, centerZ, points };
    });
  }, [preset, cx, cz]);

  const materials = useMemo(() => {
    const make = (color: string, emissive: string) =>
      new MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.55, roughness: 0.5, metalness: 0.2 });
    return {
      ok: make('#34d399', '#0a4434'),
      warn: make('#fbbf24', '#7a5208'),
      alert: make('#ef4444', '#7f1010'),
      rail: new MeshStandardMaterial({ color: '#31424e', roughness: 0.6, metalness: 0.45 }),
    };
  }, []);

  const alertRef = useRef<MeshStandardMaterial | null>(null);
  const warnRef = useRef<MeshStandardMaterial | null>(null);
  alertRef.current = materials.alert;
  warnRef.current = materials.warn;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (active) {
      materials.alert.emissiveIntensity = 0.7 + Math.sin(t * 9) * 0.45;
      materials.warn.emissiveIntensity = 0.5 + Math.sin(t * 7 + 1.3) * 0.3;
    } else {
      materials.alert.emissiveIntensity = 0.55;
      materials.warn.emissiveIntensity = 0.55;
    }
  });

  const lightY = Math.min(2.15, preset.heightM * 0.82);

  return (
    <group scale={scale} name="interior-sensors">
      {walls.map((w) => (
        <group key={w.id}>
          {SENSOR_HEIGHTS.map((y) => (
            <mesh key={y} position={[w.centerX, y, w.centerZ]} rotation={[0, w.rotY, 0]} material={materials.rail}>
              <boxGeometry args={[0.013, 0.013, w.len]} />
            </mesh>
          ))}
          {w.points.map((p, i) => (
            <mesh key={i} position={p} material={scoreColor(scores[w.id] ?? 0).color === '#ef4444' ? materials.alert : scoreColor(scores[w.id] ?? 0).color === '#fbbf24' ? materials.warn : materials.ok}>
              <sphereGeometry args={[SENSOR_RADIUS, 10, 8]} />
            </mesh>
          ))}
        </group>
      ))}
      <pointLight position={[0, lightY, -preset.depthM * 0.22]} intensity={1.6} color="#ffd9a0" distance={6.5} decay={1.6} />
      <pointLight position={[0, lightY, preset.depthM * 0.24]} intensity={1.4} color="#ffd9a0" distance={6.5} decay={1.6} />
    </group>
  );
}
