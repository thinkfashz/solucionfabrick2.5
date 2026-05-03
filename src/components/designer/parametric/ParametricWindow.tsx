'use client';

/**
 * ParametricWindow — Ventana paramétrica.
 *
 * Reconstruye marco perimetral (4 perfiles) + cristal interior a partir de
 * `ancho` y `alto`. El espesor del perfil (`FRAME_W`) es constante: al
 * estirar la ventana, el cristal se escala pero los perfiles mantienen su
 * grosor real, simulando carpintería de aluminio anodizado.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { PropiedadesMaterial } from '@/store/useDesignStore';

interface ParametricWindowProps {
  ancho: number;
  alto: number;
  profundidad?: number;
  material: PropiedadesMaterial;
}

const FRAME_W = 0.05;

export function ParametricWindow({
  ancho,
  alto,
  profundidad = 0.06,
  material,
}: ParametricWindowProps) {
  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: material.color,
        metalness: material.metalness,
        roughness: material.roughness,
      }),
    [material.color, material.metalness, material.roughness],
  );
  const glassMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        metalness: 0.15,
        roughness: 0.05,
        transparent: true,
        opacity: 0.32,
      }),
    [],
  );

  const innerW = Math.max(0.01, ancho - FRAME_W * 2);
  const innerH = Math.max(0.01, alto - FRAME_W * 2);

  return (
    <group>
      {/* perfil superior */}
      <mesh
        position={[0, alto / 2 - FRAME_W / 2, 0]}
        material={frameMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[ancho, FRAME_W, profundidad]} />
      </mesh>
      {/* perfil inferior */}
      <mesh
        position={[0, -alto / 2 + FRAME_W / 2, 0]}
        material={frameMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[ancho, FRAME_W, profundidad]} />
      </mesh>
      {/* perfil izquierdo */}
      <mesh
        position={[-ancho / 2 + FRAME_W / 2, 0, 0]}
        material={frameMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[FRAME_W, alto - FRAME_W * 2, profundidad]} />
      </mesh>
      {/* perfil derecho */}
      <mesh
        position={[ancho / 2 - FRAME_W / 2, 0, 0]}
        material={frameMat}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[FRAME_W, alto - FRAME_W * 2, profundidad]} />
      </mesh>

      {/* travesaño central (refuerzo proporcional sólo si la ventana es ancha) */}
      {ancho > 1.4 && (
        <mesh position={[0, 0, 0]} material={frameMat} castShadow>
          <boxGeometry args={[FRAME_W * 0.7, alto - FRAME_W * 2, profundidad]} />
        </mesh>
      )}

      {/* cristal */}
      <mesh position={[0, 0, 0]} material={glassMat}>
        <boxGeometry args={[innerW, innerH, profundidad * 0.4]} />
      </mesh>
    </group>
  );
}
