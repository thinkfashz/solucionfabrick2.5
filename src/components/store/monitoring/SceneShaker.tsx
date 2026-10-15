'use client';

import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';

/**
 * Temblor de escena realista: envuelve todos los elementos del Canvas en un
 * <group> y lo oscila ligeramente mientras `playing` (≤ 3 cm, 1.5–3 Hz con
 * dos modos desfasados para evitar un movimiento mecánico).
 *
 * Todo se hace en useFrame sobre refs: sin re-renders ni asignaciones por frame
 * (los vectores temporales se reusan).
 */
export default function SceneShaker({
  playing,
  intensity,
  frequencyHz = 2.2,
  children,
}: {
  playing: boolean;
  /** Intensidad 0..~0.3 (response * 0.22). */
  intensity: number;
  frequencyHz?: number;
  children: ReactNode;
}) {
  const groupRef = useRef<Group | null>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const d = Math.min(delta, 0.05);
    if (!playing) {
      // Regreso suave al reposo sin snapping.
      g.position.x += (0 - g.position.x) * Math.min(1, d * 6);
      g.position.y += (0 - g.position.y) * Math.min(1, d * 6);
      g.position.z += (0 - g.position.z) * Math.min(1, d * 6);
      g.rotation.x += (0 - g.rotation.x) * Math.min(1, d * 6);
      g.rotation.z += (0 - g.rotation.z) * Math.min(1, d * 6);
      return;
    }
    timeRef.current += d;
    const t = timeRef.current;
    const level = Math.min(1, intensity / 0.22);
    const amp = 0.028 * level;
    const omega = 2 * Math.PI * Math.min(3.2, Math.max(1.5, frequencyHz));
    // Dos sinusoides desfasados por eje: movimiento orgánico, no metrónomo.
    g.position.x = Math.sin(t * omega) * amp + Math.sin(t * omega * 0.63 + 1.2) * amp * 0.3;
    g.position.z = Math.sin(t * omega * 0.9 + 2.4) * amp * 0.7;
    g.position.y = Math.sin(t * omega * 1.7 + 0.6) * amp * 0.35;
    // Balanceo sutil de inclinación (rotación en rad, muy pequeño).
    g.rotation.x = Math.sin(t * omega * 0.8 + 1.9) * 0.004 * level;
    g.rotation.z = Math.sin(t * omega * 1.1 + 0.4) * 0.004 * level;
  });

  return <group ref={groupRef}>{children}</group>;
}
