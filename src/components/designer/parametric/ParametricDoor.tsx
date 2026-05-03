'use client';

/**
 * ParametricDoor — Puerta paramétrica.
 *
 * No es un modelo fijo: a partir de `ancho` y `alto` reconstruye en tiempo
 * real el marco (perfiles superior/laterales) y la hoja, manteniendo el
 * ancho del perfil (`FRAME_W`) constante para que las proporciones del marco
 * no se deformen. Usa `MeshStandardMaterial` con `metalness`/`roughness`
 * para emular madera tratada (mate y rugosa) o aluminio anodizado.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { PropiedadesMaterial } from '@/store/useDesignStore';

interface ParametricDoorProps {
  ancho: number;
  alto: number;
  /** Profundidad del marco en metros. */
  profundidad?: number;
  material: PropiedadesMaterial;
  /** Si true, agrega un panel de cristal sobre la mitad superior. */
  conCristal?: boolean;
}

/** Ancho del perfil del marco (constante, no se escala con la pieza). */
const FRAME_W = 0.06;

export function ParametricDoor({
  ancho,
  alto,
  profundidad = 0.06,
  material,
  conCristal = false,
}: ParametricDoorProps) {
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: material.color,
        metalness: material.metalness,
        roughness: material.roughness,
      }),
    [material.color, material.metalness, material.roughness],
  );
  const leafMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: material.color,
        metalness: material.metalness * 0.8,
        roughness: Math.min(1, material.roughness + 0.1),
      }),
    [material.color, material.metalness, material.roughness],
  );
  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        metalness: 0.1,
        roughness: 0.05,
        transparent: true,
        opacity: 0.35,
      }),
    [],
  );

  const inner = {
    w: Math.max(0.01, ancho - FRAME_W * 2),
    h: Math.max(0.01, alto - FRAME_W),
  };

  // Centramos verticalmente: la puerta se posiciona con su centro en y=alto/2
  // si se coloca en el suelo. Aquí centramos en (0, alto/2, 0).
  return (
    <group>
      {/* marco vertical izquierdo */}
      <mesh
        position={[-(ancho / 2 - FRAME_W / 2), alto / 2, 0]}
        material={frameMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[FRAME_W, alto, profundidad]} />
      </mesh>
      {/* marco vertical derecho */}
      <mesh
        position={[ancho / 2 - FRAME_W / 2, alto / 2, 0]}
        material={frameMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[FRAME_W, alto, profundidad]} />
      </mesh>
      {/* dintel superior */}
      <mesh
        position={[0, alto - FRAME_W / 2, 0]}
        material={frameMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[ancho, FRAME_W, profundidad]} />
      </mesh>

      {/* hoja inferior (sólida) */}
      <mesh
        position={[0, inner.h / 2 - (conCristal ? inner.h / 4 : 0) - 0, 0]}
        material={leafMat}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            inner.w,
            conCristal ? inner.h / 2 : inner.h,
            profundidad * 0.6,
          ]}
        />
      </mesh>

      {conCristal && (
        <mesh
          position={[0, inner.h * 0.75, 0]}
          material={glassMat}
          castShadow
        >
          <boxGeometry args={[inner.w, inner.h / 2, profundidad * 0.4]} />
        </mesh>
      )}

      {/* manilla */}
      <mesh
        position={[ancho / 2 - FRAME_W - 0.05, alto * 0.45, profundidad * 0.5]}
        material={frameMat}
      >
        <sphereGeometry args={[0.025, 16, 12]} />
      </mesh>
    </group>
  );
}
