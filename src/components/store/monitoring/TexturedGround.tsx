'use client';

import { useEffect, useMemo } from 'react';
import {
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Float32BufferAttribute,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { useTextureMaterial, useViewerTextures, viewerTextureVariant } from './useViewerTextures';

/**
 * Suelo del comparador sísmico (plano 55×44) con pasto + vereda de entrada.
 * - Pasto en varias capas con `repeat` y tinte distintos (evita patrón evidente).
 * - Vereda sur (frente cámara): wood-oak PBR (o piso-madera) con juntas en grid sutil.
 * - Borde pasto/vereda irregular: contorno ondulado + lóbulos de pasto superpuestos.
 * - ~16 draw calls; albedos con SRGBColorSpace y anisotropía ≥ 4.
 */

const GRASS_PATCHES = [
  { x: -14, y: 6, r: 7, sx: 1.3, sy: 0.9, rz: 0.7, matKey: 'a' },
  { x: 12, y: -2, r: 6, sx: 1.1, sy: 1.4, rz: -0.4, matKey: 'b' },
  { x: 0, y: 12, r: 5.5, sx: 1.6, sy: 0.7, rz: 1.2, matKey: 'c' },
] as const;

const GRASS_TONGUES = [
  { x: -3.8, y: -15.1, r: 1.5, sx: 1.9, sy: 0.65, rz: 0.2 },
  { x: 1.4, y: -14.9, r: 1.2, sx: 1.6, sy: 0.6, rz: -0.35 },
  { x: 4.6, y: -15.3, r: 1.0, sx: 2.0, sy: 0.55, rz: 0.5 },
] as const;

const FRINGE = [
  { x: -18, y: -22.2, r: 2.2, sx: 1.7, sy: 0.6, rz: 0.15 },
  { x: 16, y: -22.3, r: 1.8, sx: 2.1, sy: 0.55, rz: -0.2 },
  { x: -27.3, y: 4, r: 2.0, sx: 0.55, sy: 1.8, rz: 0.3 },
  { x: 27.4, y: -6, r: 1.7, sx: 0.5, sy: 1.6, rz: -0.25 },
  { x: 6, y: 21.9, r: 2.4, sx: 1.9, sy: 0.6, rz: 0.1 },
  { x: -8, y: 21.9, r: 1.6, sx: 1.5, sy: 0.55, rz: -0.3 },
] as const;

function edgeNoise(i: number, seed: number): number {
  const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  const h = s - Math.floor(s);
  return (
    Math.sin(i * 0.45 + seed * 1.7) * 0.55 +
    Math.sin(i * 1.35 + seed * 3.1) * 0.3 +
    (h - 0.5) * 0.35
  );
}

function terrainHeight(x: number, y: number): number {
  return (
    Math.sin(x * 0.35 + 1.3) * Math.cos(y * 0.3 - 0.4) * 0.012 +
    Math.sin(x * 0.9 - 2.1) * Math.sin(y * 0.75 + 1.1) * 0.007
  );
}

function displaceToTerrain(geometry: BufferGeometry): void {
  const pos = geometry.attributes.position as Float32BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) + terrainHeight(pos.getX(i), pos.getY(i)));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function createWalkwayGeometry(
  width: number,
  ySouth: number,
  yNorthBase: number,
  amp: number,
  segments: number,
  seed: number,
): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -width / 2 + t * width;
    const yN = yNorthBase + edgeNoise(i, seed) * amp;
    const yS = ySouth + edgeNoise(i, seed + 9.3) * amp * 0.3;
    positions.push(x, yN, 0, x, yS, 0);
    uvs.push(t, 1, t, 0);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createJointsTexture(cols: number, rows: number): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(46, 38, 30, 0.42)';
    ctx.lineWidth = 3;
    for (let c = 1; c < cols; c++) {
      const x = Math.round((c / cols) * size) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let r = 1; r < rows; r++) {
      const y = Math.round((r / rows) * size) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(46, 38, 30, 0.28)';
    ctx.lineWidth = 5;
    ctx.strokeRect(3, 3, size - 6, size - 6);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

export default function TexturedGround() {
  const textures = useViewerTextures();

  const grassMainMap = useMemo(
    () => viewerTextureVariant('pastoCalle', 7, 6),
    [textures.pastoCalle],
  );
  const grassPatchAMap = useMemo(
    () => viewerTextureVariant('pastoCalle', 3, 3),
    [textures.pastoCalle],
  );
  const grassPatchBMap = useMemo(
    () => viewerTextureVariant('pastoCalle', 11, 9),
    [textures.pastoCalle],
  );
  const grassPatchCMap = useMemo(
    () => viewerTextureVariant('pastoCalle', 5, 4),
    [textures.pastoCalle],
  );
  const grassTongueMap = useMemo(
    () => viewerTextureVariant('pastoCalle', 9, 7),
    [textures.pastoCalle],
  );

  const walkwayMaps = useMemo(() => {
    const color =
      viewerTextureVariant('woodOakColor', 6, 4) ??
      textures.woodOakColor ??
      viewerTextureVariant('pisoMadera', 4, 3) ??
      textures.pisoMadera;
    return {
      color,
      normal: viewerTextureVariant('woodOakNormal', 6, 4) ?? textures.woodOakNormal,
      roughness: viewerTextureVariant('woodOakRoughness', 6, 4) ?? textures.woodOakRoughness,
    };
  }, [
    textures.woodOakColor,
    textures.woodOakNormal,
    textures.woodOakRoughness,
    textures.pisoMadera,
  ]);

  const hasOak = Boolean(textures.woodOakColor);
  const hasPiso = Boolean(textures.pisoMadera);

  const dirtMat = useTextureMaterial(null, {
    color: '#6f6350',
    roughness: 1,
    metalness: 0,
  });

  const grassMainMat = useTextureMaterial(grassMainMap, {
    color: '#dfe3d8',
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.75,
  });

  const grassPatchAMat = useTextureMaterial(grassPatchAMap, {
    color: '#d2dbc4',
    roughness: 0.96,
    metalness: 0,
    envMapIntensity: 0.7,
  });

  const grassPatchBMat = useTextureMaterial(grassPatchBMap, {
    color: '#e8e6d6',
    roughness: 0.94,
    metalness: 0,
    envMapIntensity: 0.8,
  });

  const grassPatchCMat = useTextureMaterial(grassPatchCMap, {
    color: '#dae1cc',
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.75,
  });

  const grassTongueMat = useTextureMaterial(grassTongueMap, {
    color: '#d6dec9',
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.72,
  });

  const walkwayMat = useTextureMaterial(walkwayMaps.color, {
    color: hasOak ? '#f2efe8' : hasPiso ? '#efeae3' : '#d2d4d3',
    roughness: hasOak ? 0.55 : 0.8,
    metalness: 0,
    envMapIntensity: 0.65,
    normalMap: walkwayMaps.normal,
    roughnessMap: walkwayMaps.roughness,
  });

  const jointsTex = useMemo(() => createJointsTexture(10, 7), []);
  const jointsMat = useTextureMaterial(jointsTex, {
    color: '#ffffff',
    roughness: 0.92,
    metalness: 0,
  }, 0.92);

  const grassGeo = useMemo(() => {
    const geo = new PlaneGeometry(55, 44, 48, 40);
    displaceToTerrain(geo);
    return geo;
  }, []);

  const walkwayGeo = useMemo(
    () => createWalkwayGeometry(12, -21.85, -15, 0.9, 48, 3.7),
    [],
  );

  const patchGeos = useMemo(
    () =>
      GRASS_PATCHES.map((p) => {
        const g = new CircleGeometry(p.r, 28);
        g.scale(p.sx, p.sy, 1);
        displaceToTerrain(g);
        return g;
      }),
    [],
  );

  const tongueGeos = useMemo(
    () =>
      GRASS_TONGUES.map((t) => {
        const g = new CircleGeometry(t.r, 24);
        g.scale(t.sx, t.sy, 1);
        return g;
      }),
    [],
  );

  const fringeGeos = useMemo(
    () =>
      FRINGE.map((f) => {
        const g = new CircleGeometry(f.r, 24);
        g.scale(f.sx, f.sy, 1);
        displaceToTerrain(g);
        return g;
      }),
    [],
  );

  useEffect(
    () => () => {
      jointsTex?.dispose();
    },
    [jointsTex],
  );

  useEffect(
    () => () => {
      grassGeo.dispose();
      walkwayGeo.dispose();
      patchGeos.forEach((g) => g.dispose());
      tongueGeos.forEach((g) => g.dispose());
      fringeGeos.forEach((g) => g.dispose());
    },
    [grassGeo, walkwayGeo, patchGeos, tongueGeos, fringeGeos],
  );

  const patchMats = {
    a: grassPatchAMat,
    b: grassPatchBMat,
    c: grassPatchCMat,
  } as const;

  return (
    <group position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, -0.03]} receiveShadow material={dirtMat}>
        <planeGeometry args={[57, 46, 1, 1]} />
      </mesh>

      <mesh receiveShadow material={grassMainMat} geometry={grassGeo} />

      {GRASS_PATCHES.map((p, i) => (
        <mesh
          key={`grass-patch-${i}`}
          position={[p.x, p.y, 0.004]}
          rotation={[0, 0, p.rz]}
          receiveShadow
          material={patchMats[p.matKey]}
          geometry={patchGeos[i]}
        />
      ))}

      <mesh position={[0, 0, 0.026]} receiveShadow material={walkwayMat} geometry={walkwayGeo} />
      <mesh position={[0, 0, 0.03]} material={jointsMat} geometry={walkwayGeo} />

      {GRASS_TONGUES.map((t, i) => (
        <mesh
          key={`grass-tongue-${i}`}
          position={[t.x, t.y, 0.034]}
          rotation={[0, 0, t.rz]}
          receiveShadow
          material={grassTongueMat}
          geometry={tongueGeos[i]}
        />
      ))}

      {FRINGE.map((f, i) => (
        <mesh
          key={`fringe-${i}`}
          position={[f.x, f.y, 0.004]}
          rotation={[0, 0, f.rz]}
          receiveShadow
          material={grassTongueMat}
          geometry={fringeGeos[i]}
        />
      ))}
    </group>
  );
}
