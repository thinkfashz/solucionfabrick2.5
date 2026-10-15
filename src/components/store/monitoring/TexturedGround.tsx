'use client';

import { useEffect, useMemo } from 'react';
import {
  BoxGeometry,
  BufferGeometry,
  ClampToEdgeWrapping,
  DoubleSide,
  Float32BufferAttribute,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three';
import { useTextureMaterial } from './useViewerTextures';
import {
  createAsphaltTexture,
  createGrassDetailTexture,
  createGrassMacroTexture,
  smoothstepF,
} from './proceduralTextures';

/**
 * Suelo del comparador sísmico: parcela de césped + camino de acceso central.
 *
 * Todo vive en un grupo con `position=[0,-0.13,0]` y `rotation=[-PI/2,0,0]`,
 * así que en coordenadas LOCALES del grupo vale: x = x del mundo,
 * y = -z del mundo y z = altura (hacia arriba). Las viviendas quedan en
 * x = ±5.1 y el camino corre por x ≈ 0, alineado en el espacio entre ellas.
 *
 * Capas (de abajo hacia arriba):
 *  1. Terreno lejano 400×400 con césped de repeat alto + rampa suave hacia
 *     abajo y ondulaciones leves → desaparece el "borde del mundo" y el
 *     horizonte queda continuo (se funde con la niebla de LightingRig).
 *  2. Césped de detalle 55×44 con textura procedural tileable de 1024 px.
 *  3. Capa "macro" única (repeat 1×1, con alfa) de manchas claras/oscuras:
 *     al superponerse con opacidad rompe el patrón de repetición.
 *  4. Calzada de asfalto (3,0 m) con líneas viales pintadas en la textura y
 *     bordes de perfil bajo; termina frente a las viviendas.
 *
 * ~6 draw calls en el suelo; texturas 512-1024 px con anisotropía 8 y
 * desmontaje explícito de geometrías y texturas en el cleanup.
 */

// --- medidas del entorno ---------------------------------------------------
const INNER_W = 55;
const INNER_H = 44;
const OUTER_SIZE = 400;

// --- camino de acceso ------------------------------------------------------
const ROAD_HALF_W = 1.5; // calzada de 3,0 m (cabe en el hueco entre casas)
const ROAD_Y_SOUTH = -22; // borde sur de la parcela (world z = +22)
const ROAD_Y_NORTH = -6.9; // deja libre la pasarela de las figuras (z ≈ 6,5)
const ROAD_LENGTH = ROAD_Y_NORTH - ROAD_Y_SOUTH;
const ROAD_Y_CENTER = (ROAD_Y_SOUTH + ROAD_Y_NORTH) / 2;
const ROAD_Z = 0.028; // altura de la calzada sobre el grupo
const CURB_HALF_W = 0.15;
const CURB_RISE = 0.05;

// Pasillo del camino: el terreno se aplana aquí para que la calzada apoye
// limpia sobre el pasto (en coordenadas locales del grupo).
const ROAD_MASK_HALF_W = 2.4;
const ROAD_MASK_Y_SOUTH = -27.5;
const ROAD_MASK_Y_NORTH = -5.2;

function terrainHeight(x: number, y: number): number {
  // ondulación suave del pasto (amplitud total ≈ ±2 cm)
  const base =
    Math.sin(x * 0.35 + 1.3) * Math.cos(y * 0.3 - 0.4) * 0.012 +
    Math.sin(x * 0.9 - 2.1) * Math.sin(y * 0.75 + 1.1) * 0.007;
  return base * (1 - roadMask(x, y));
}

/** 1 dentro del pasillo del camino, 0 fuera (transición de 1,2 m). */
function roadMask(x: number, y: number): number {
  const dx = Math.abs(x) - ROAD_MASK_HALF_W;
  const dy = Math.max(ROAD_MASK_Y_SOUTH - y, y - ROAD_MASK_Y_NORTH);
  return 1 - smoothstepF(0, 1.2, Math.max(dx, dy));
}

function displaceToTerrain(geometry: BufferGeometry): void {
  const pos = geometry.attributes.position as Float32BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) + terrainHeight(pos.getX(i), pos.getY(i)));
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Terreno lejano: plano grande, plano (a -0,02) bajo la parcela interior y
 * con rampa hacia abajo + colinas suaves hacia afuera. Así el borde del
 * plano nunca se recorta contra el cielo y el horizonte queda irregular.
 */
function createOuterGroundGeometry(size = OUTER_SIZE, segments = 64): BufferGeometry {
  const geometry = new PlaneGeometry(size, size, segments, segments);
  const pos = geometry.attributes.position as Float32BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const d = Math.max(Math.abs(x) / (INNER_W / 2), Math.abs(y) / (INNER_H / 2));
    const t = smoothstepF(1, 2.2, d); // 0 dentro de la parcela, 1 lejos
    const hills =
      Math.sin(x * 0.041 + 1.7) * Math.cos(y * 0.033 - 0.6) * 0.55 +
      Math.sin(x * 0.017 + 0.4) * Math.sin(y * 0.021 + 2.2) * 0.9;
    pos.setZ(i, -0.02 - 0.2 * t + hills * t);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Variante de una textura con repeat/rotación propios (comparte la imagen). */
function tileVariant(base: Texture | null, repeatX: number, repeatY: number, rotation = 0): Texture | null {
  if (!base) return null;
  const texture = base.clone();
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.center.set(0.5, 0.5);
  texture.repeat.set(repeatX, repeatY);
  texture.rotation = rotation;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export default function TexturedGround() {
  // --- texturas procedurales (una sola vez por montaje) --------------------
  const grassDetail = useMemo(() => createGrassDetailTexture(1024), []);
  const grassMacro = useMemo(() => createGrassMacroTexture(512), []);
  const asphalt = useMemo(() => createAsphaltTexture(512), []);

  // Dos "copias" del mismo césped con escalas y rotaciones muy distintas:
  // el detalle corto (≈4,6 m por tesela) se lee de cerca y el lejano tiene
  // una tesela de 10 m girada 35° para que no se reconozca el patrón.
  const grassNearMap = useMemo(() => tileVariant(grassDetail, 12, 10), [grassDetail]);
  const grassFarMap = useMemo(() => tileVariant(grassDetail, OUTER_SIZE / 10, OUTER_SIZE / 10, 0.62), [grassDetail]);

  const roadMap = useMemo(() => {
    if (!asphalt) return null;
    const texture = asphalt.clone();
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    texture.center.set(0.5, 0.5);
    // tesela cuadrada a lo largo de la calzada (u = ancho, v = largo)
    texture.repeat.set(1, ROAD_LENGTH / (ROAD_HALF_W * 2));
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [asphalt]);

  // --- geometrías ----------------------------------------------------------
  const outerGeo = useMemo(() => createOuterGroundGeometry(), []);
  const innerGeo = useMemo(() => {
    const geometry = new PlaneGeometry(INNER_W, INNER_H, 48, 40);
    displaceToTerrain(geometry);
    return geometry;
  }, []);
  const macroGeo = useMemo(() => {
    // un poco más pequeña que la base: la capa alfa no asoma en el borde
    const geometry = new PlaneGeometry(INNER_W - 0.5, INNER_H - 0.5, 32, 26);
    displaceToTerrain(geometry);
    return geometry;
  }, []);
  const roadGeo = useMemo(() => new PlaneGeometry(ROAD_HALF_W * 2, ROAD_LENGTH, 1, 12), []);
  const curbGeo = useMemo(() => new BoxGeometry(CURB_HALF_W * 2, ROAD_LENGTH, CURB_RISE), []);

  // --- materiales ----------------------------------------------------------
  const outerMat = useTextureMaterial(grassFarMap, {
    color: '#dbe4c9',
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.5,
    side: DoubleSide,
  });

  const grassMat = useTextureMaterial(grassNearMap, {
    color: '#f4f6ec',
    roughness: 0.97,
    metalness: 0,
    envMapIntensity: 0.7,
    side: DoubleSide,
  });

  const macroMat = useTextureMaterial(grassMacro, {
    color: '#ffffff',
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0.6,
  }, 0.9);

  const roadMat = useTextureMaterial(roadMap, {
    color: '#e9e9e9',
    roughness: 0.93,
    metalness: 0.02,
    envMapIntensity: 0.5,
    side: DoubleSide,
  });

  const curbMat = useTextureMaterial(null, {
    color: '#d7d2c4',
    roughness: 0.85,
    metalness: 0,
  });

  // --- desmontaje ----------------------------------------------------------
  useEffect(
    () => () => {
      outerGeo.dispose();
      innerGeo.dispose();
      macroGeo.dispose();
      roadGeo.dispose();
      curbGeo.dispose();
    },
    [outerGeo, innerGeo, macroGeo, roadGeo, curbGeo],
  );

  useEffect(
    () => () => {
      grassDetail?.dispose();
      grassMacro?.dispose();
      asphalt?.dispose();
      grassNearMap?.dispose();
      grassFarMap?.dispose();
      roadMap?.dispose();
    },
    [grassDetail, grassMacro, asphalt, grassNearMap, grassFarMap, roadMap],
  );

  return (
    <group position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* 1 · terreno lejano: funde la parcela con el horizonte */}
      <mesh geometry={outerGeo} material={outerMat} receiveShadow />

      {/* 2 · césped de detalle */}
      <mesh geometry={innerGeo} material={grassMat} receiveShadow />

      {/* 3 · manchas macro (rompe el tiling del pasto de detalle) */}
      <mesh geometry={macroGeo} material={macroMat} position={[0, 0, 0.006]} receiveShadow />

      {/* 4 · calzada de acceso entre las viviendas */}
      <mesh
        geometry={roadGeo}
        material={roadMat}
        position={[0, ROAD_Y_CENTER, ROAD_Z]}
        receiveShadow
      />

      {/* bordes de la calzada (perfil bajo, misma longitud que la vía) */}
      {[-1, 1].map((side) => (
        <mesh
          key={`curb-${side}`}
          geometry={curbGeo}
          material={curbMat}
          position={[side * (ROAD_HALF_W + CURB_HALF_W), ROAD_Y_CENTER, ROAD_Z + CURB_RISE / 2]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
