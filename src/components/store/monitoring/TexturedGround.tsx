'use client';

import { useTextureMaterial, useViewerTextures } from './useViewerTextures';

/**
 * Suelo del comparador sísmico (plano 55×44) con pasto + vereda.
 * Mantiene la posición/sombras originales; solo cambia el material.
 */
export default function TexturedGround() {
  const textures = useViewerTextures();
  const material = useTextureMaterial(
    textures.pastoCalle,
    { color: textures.pastoCalle ? '#dfe3d8' : '#6a8a55', roughness: 0.95, metalness: 0, envMapIntensity: 0.75 },
    1,
  );
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow material={material}>
      <planeGeometry args={[55, 44]} />
    </mesh>
  );
}
