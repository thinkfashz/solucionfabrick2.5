'use client';

/**
 * Solid building blocks (Wall, Floor, Beam).
 *
 * Geometrías paramétricas básicas que se construyen a partir de las
 * `dimensiones` `[ancho, alto, largo]` del elemento del store. Comparten
 * la misma firma para que `SceneElements` pueda renderizarlos
 * uniformemente.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { PropiedadesMaterial } from '@/store/useDesignStore';

interface SolidProps {
  ancho: number;
  alto: number;
  largo: number;
  material: PropiedadesMaterial;
}

function makeMaterial(material: PropiedadesMaterial): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: material.color,
    metalness: material.metalness,
    roughness: material.roughness,
    transparent: material.opacidad !== undefined && material.opacidad < 1,
    opacity: material.opacidad ?? 1,
  });
}

export function Wall({ ancho, alto, largo, material }: SolidProps) {
  const mat = useMemo(() => makeMaterial(material), [material]);
  return (
    <mesh position={[0, alto / 2, 0]} material={mat} castShadow receiveShadow>
      <boxGeometry args={[ancho, alto, largo]} />
    </mesh>
  );
}

export function Floor({ ancho, alto, largo, material }: SolidProps) {
  const mat = useMemo(() => makeMaterial(material), [material]);
  return (
    <mesh position={[0, alto / 2, 0]} material={mat} receiveShadow castShadow>
      <boxGeometry args={[ancho, alto, largo]} />
    </mesh>
  );
}

export function Beam({ ancho, alto, largo, material }: SolidProps) {
  const mat = useMemo(() => makeMaterial(material), [material]);
  return (
    <mesh position={[0, alto / 2, 0]} material={mat} castShadow receiveShadow>
      <boxGeometry args={[ancho, alto, largo]} />
    </mesh>
  );
}
