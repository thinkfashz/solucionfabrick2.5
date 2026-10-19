'use client';
/*
 * MetalconCineCamera — recorrido cinematográfico automático en bucle:
 * acercamiento al frente → entrada por la puerta → paneo interior → elevación
 * hacia el cielo → vista exterior + techo. Suavizado smoothstep por tramo.
 */
import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';

type Key = { p: [number, number, number]; l: [number, number, number] };

export default function MetalconCineCamera({ preset }: { preset: MetalconHousePreset }) {
  const { camera } = useThree();
  const t = useRef(0);
  const look = useRef(new Vector3());

  const keys = useMemo<Key[]>(() => {
    const w = preset.widthM;
    const d = preset.depthM;
    const h = preset.heightM;
    return [
      { p: [4.4, 1.75, d / 2 + 4.1], l: [0.4, 1.55, d / 2] },        // llegada al frente, puerta a la vista
      { p: [1.5, 1.62, d / 2 + 1.05], l: [0, 1.5, 0] },             // entrando por la puerta
      { p: [-(w / 2 - 1.1), 1.62, d * 0.22], l: [w / 2 - 1.1, 1.3, d * 0.2] }, // paneo living a cocina
      { p: [0, h - 0.35, -d * 0.05], l: [0, 0.9, d * 0.1] },        // elevación al cielo interior
      { p: [w / 2 + 3.2, h + 2.2, d / 2 + 2.4], l: [0, h * 0.62, 0] }, // exterior con techo a la vista
      { p: [-(w / 2 + 2.6), 2.6, -(d / 2 + 3.2)], l: [0, 1.4, 0] }, // contrapicado trasero, Drama
    ];
  }, [preset.widthM, preset.depthM, preset.heightM]);

  useFrame((_, delta) => {
    const n = keys.length;
    t.current += delta * 0.075; // velocidad de recorrido
    const ft = (t.current % n) + n;
    const fi = Math.floor(ft) % n;
    const u0 = ft % 1;
    const s = u0 * u0 * (3 - 2 * u0);
    const A = keys[fi];
    const B = keys[(fi + 1) % n];
    camera.position.set(
      A.p[0] + (B.p[0] - A.p[0]) * s,
      A.p[1] + (B.p[1] - A.p[1]) * s,
      A.p[2] + (B.p[2] - A.p[2]) * s,
    );
    look.current.set(
      A.l[0] + (B.l[0] - A.l[0]) * s,
      A.l[1] + (B.l[1] - A.l[1]) * s,
      A.l[2] + (B.l[2] - A.l[2]) * s,
    );
    camera.lookAt(look.current);
  });

  return null;
}
