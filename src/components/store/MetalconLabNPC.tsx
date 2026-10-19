'use client';
/*
 * MetalconLabNPC — reutiliza los personajes animados del simulador de terremoto
 * (AnimatedFigure + ual-mannequin.glb) patrullando la obra del Lab.
 * estado: calm (sin sismo) — camina, se detiene, mira alrededor.
 */
import { useMemo } from 'react';
import { AnimatedFigure } from './monitoring/AnimatedFigure';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';

export default function MetalconLabNPC({ preset }: { preset: MetalconHousePreset }) {
  const front = preset.depthM / 2 + 1.6;
  const posA = useMemo<[number, number, number]>(() => [-1.7, 0.02, front], [front]);
  const posB = useMemo<[number, number, number]>(() => [1.4, 0.02, front - 0.4], [front]);
  const doorA = useMemo<[number, number]>(() => [-1.1, preset.depthM / 2 + 0.45], [preset.depthM]);
  const doorB = useMemo<[number, number]>(() => [1.1, preset.depthM / 2 + 0.45], [preset.depthM]);

  return (
    <>
      <AnimatedFigure
        playing
        visualProgress={0}
        shakeIntensity={0}
        index={0}
        houseDoor={doorA}
        config={{ position: posA, patrolStartX: posA[0] - 1.8, patrolEndX: posA[0] + 1.1 }}
      />
      <AnimatedFigure
        playing
        visualProgress={0}
        shakeIntensity={0}
        index={1}
        houseDoor={doorB}
        config={{ position: posB, patrolStartX: posB[0] - 1.1, patrolEndX: posB[0] + 1.8 }}
      />
    </>
  );
}
