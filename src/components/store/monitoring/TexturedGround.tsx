'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
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
  createRoadEdgeAlphaTexture,
  lerp,
  mulberry32,
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
 *     Mantiene una franja plana bajo la calzada sur.
 *  2. Césped de detalle 55×44 con textura procedural tileable de 1024 px.
 *  3. Capa "macro" única (repeat 1×1, con alfa) de manchas claras/oscuras:
 *     al superponerse con opacidad rompe el patrón de repetición.
 *  4. Calzada de asfalto (3,0 m) con líneas viales pintadas en la textura.
 *     Va de las viviendas (z ≈ 6,9) hasta z ≈ +40 y su silueta la define una
 *     MÁSCARA ALFA procedural: cantos meándricos + cabos disueltos en dedos
 *     de asfalto, de modo que jamás se ve un corte recto. Sin bordillos
 *     rígidos: los cantos los "rematan" lóbulos de césped instanciados.
 *
 * ~5 draw calls en el suelo (4 planos + lóbulos de césped instanciados);
 * texturas 512-1024 px con anisotropía 8 y desmontaje explícito en el cleanup.
 */

// --- medidas del entorno ---------------------------------------------------
const GROUP_Y = -0.13; // cota del grupo en el mundo
const INNER_W = 55;
const INNER_H = 44;
const OUTER_SIZE = 400;

// --- camino de acceso ------------------------------------------------------
const ROAD_HALF_W = 1.5; // calzada de 3,0 m (cabe en el hueco entre casas)
const ROAD_Y_SOUTH = -40; // el cabo sur se pierde hacia la cámara (world z = +40)
const ROAD_Y_NORTH = -6.9; // deja libre la pasarela de las figuras (z ≈ 6,5)
const ROAD_LENGTH = ROAD_Y_NORTH - ROAD_Y_SOUTH;
const ROAD_Y_CENTER = (ROAD_Y_SOUTH + ROAD_Y_NORTH) / 2;
const ROAD_Z = 0.028; // altura de la calzada sobre el grupo

// Pasillo del camino: el terreno se aplana aquí para que la calzada apoye
// limpia sobre el pasto (en coordenadas locales del grupo).
const ROAD_MASK_HALF_W = 2.4;
const ROAD_MASK_Y_SOUTH = -46;
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

/**
 * Franja del terreno LEJANO que se mantiene plana bajo la calzada que sigue
 * hacia el sur (más allá de la parcela interior). Las colinas se apartan del
 * eje de forma suave, como un escarpe de camino rural.
 */
function roadCorridorMask(x: number, y: number): number {
  const cx = 1 - smoothstepF(3.2, 15, Math.abs(x));
  const cy = 1 - smoothstepF(-22, -12, y);
  return cx * cy;
}

/** Z del terreno lejano (coordenadas locales del grupo). */
function outerTerrainZ(x: number, y: number): number {
  const d = Math.max(Math.abs(x) / (INNER_W / 2), Math.abs(y) / (INNER_H / 2));
  const t = smoothstepF(1, 2.2, d); // 0 dentro de la parcela, 1 lejos
  const hills =
    Math.sin(x * 0.041 + 1.7) * Math.cos(y * 0.033 - 0.6) * 0.55 +
    Math.sin(x * 0.017 + 0.4) * Math.sin(y * 0.021 + 2.2) * 0.9;
  return lerp(-0.02 - 0.2 * t + hills * t, -0.02, roadCorridorMask(x, y));
}

/**
 * Altura del suelo en coordenadas de MUNDO (x, z). Reproduce el mismo cálculo
 * que aplican `displaceToTerrain` y `createOuterGroundGeometry` para que
 * `NatureScatter` pueda clavar árboles, arbustos y piedras sobre el terreno
 * sin que floten ni se hundan.
 */
export function groundHeightAt(x: number, z: number): number {
  const y = -z; // coordenada local del grupo
  const d = Math.max(Math.abs(x) / (INNER_W / 2), Math.abs(y) / (INNER_H / 2));
  if (d <= 1) return GROUP_Y + terrainHeight(x, y);
  return GROUP_Y + outerTerrainZ(x, y);
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
 * La franja del camino sur se mantiene plana (`outerTerrainZ`).
 */
function createOuterGroundGeometry(size = OUTER_SIZE, segments = 64): BufferGeometry {
  const geometry = new PlaneGeometry(size, size, segments, segments);
  const pos = geometry.attributes.position as Float32BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, outerTerrainZ(pos.getX(i), pos.getY(i)));
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

// --- lóbulos de césped sobre la calzada ------------------------------------

const TONGUE_COUNT = 84;
const TONGUE_Y = -0.12; // cota en el mundo: medio hundidos, asoman sobre la vía

interface TongueInstance {
  x: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: Color;
}

/**
 * Icosaedro low-poly deformado de forma determinista. La deformación depende
 * SOLO de la dirección del vértice, así que los vértices duplicados de cada
 * cara se desplazan igual y no se abren grietas.
 */
function createDeformedIco(amplitude: number, phase: number): IcosahedronGeometry {
  const geometry = new IcosahedronGeometry(1, 0);
  const pos = geometry.attributes.position as Float32BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k =
      1 +
      amplitude * Math.sin(x * 3.1 + phase) * Math.cos(z * 2.7 - phase * 0.5) +
      amplitude * 0.6 * Math.sin(y * 4.3 + phase * 1.7);
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Repartición de los lóbulos de pasto que invaden la calzada: siguen los
 * dos cantos a lo largo de todo el camino y, en los cabos (donde el asfalto
 * se disuelve), cruzan todo el ancho para que el remate nunca se lea como un
 * corte limpio.
 */
function createGrassTongues(count = TONGUE_COUNT): TongueInstance[] {
  const rnd = mulberry32(1717);
  const tones = ['#8aa24e', '#7d9646', '#9aa459', '#a3a05c', '#6f8a3e'];
  const list: TongueInstance[] = [];
  for (let i = 0; i < count; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const z = 5.6 + rnd() * 35.4; // recorrido completo del camino (mundo)
    const tip = z < 10.4 || z > 35.2;
    const x = tip ? (rnd() - 0.5) * 3 : side * (0.7 + rnd());
    const tone = new Color(tones[(rnd() * tones.length) | 0]);
    const shade = 0.86 + rnd() * 0.28;
    list.push({
      x,
      z,
      sx: 0.24 + rnd() * 0.36,
      sy: 0.14 + rnd() * 0.24,
      sz: 0.24 + rnd() * 0.36,
      color: tone.multiplyScalar(shade),
    });
  }
  return list;
}

export default function TexturedGround() {
  // --- texturas procedurales (una sola vez por montaje) --------------------
  const grassDetail = useMemo(() => createGrassDetailTexture(1024), []);
  const grassMacro = useMemo(() => createGrassMacroTexture(512), []);
  const asphalt = useMemo(() => createAsphaltTexture(512), []);
  const roadAlpha = useMemo(() => createRoadEdgeAlphaTexture(512), []);

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

  // lóbulos de césped: una sola geometría deformada + un InstancedMesh
  const tongueGeo = useMemo(() => createDeformedIco(0.3, 1.3), []);
  const tongueMat = useMemo(
    () => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0, flatShading: true }),
    [],
  );
  const tongues = useMemo(() => createGrassTongues(), []);
  const tonguesRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = tonguesRef.current;
    if (!mesh) return;
    const dummy = new Object3D();
    tongues.forEach((tongue, i) => {
      dummy.position.set(tongue.x, TONGUE_Y, tongue.z);
      dummy.rotation.set(0, i * 2.3999, 0); // giro áureo determinista
      dummy.scale.set(tongue.sx, tongue.sy, tongue.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, tongue.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tongues]);

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

  // `alphaMap` + `alphaTest` recortan la silueta del asfalto con la máscara
  // procedural: cantos irregulares y cabos disueltos (sin transparencias).
  const roadMat = useTextureMaterial(roadMap, {
    color: '#e9e9e9',
    roughness: 0.93,
    metalness: 0.02,
    envMapIntensity: 0.5,
    side: DoubleSide,
    alphaMap: roadAlpha,
    alphaTest: 0.5,
  });

  // --- desmontaje ----------------------------------------------------------
  useEffect(
    () => () => {
      outerGeo.dispose();
      innerGeo.dispose();
      macroGeo.dispose();
      roadGeo.dispose();
      tongueGeo.dispose();
      tongueMat.dispose();
    },
    [outerGeo, innerGeo, macroGeo, roadGeo, tongueGeo, tongueMat],
  );

  useEffect(
    () => () => {
      grassDetail?.dispose();
      grassMacro?.dispose();
      asphalt?.dispose();
      roadAlpha?.dispose();
      grassNearMap?.dispose();
      grassFarMap?.dispose();
      roadMap?.dispose();
    },
    [grassDetail, grassMacro, asphalt, roadAlpha, grassNearMap, grassFarMap, roadMap],
  );

  return (
    <>
      <group position={[0, GROUP_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {/* 1 · terreno lejano: funde la parcela con el horizonte */}
        <mesh geometry={outerGeo} material={outerMat} receiveShadow />

        {/* 2 · césped de detalle */}
        <mesh geometry={innerGeo} material={grassMat} receiveShadow />

        {/* 3 · manchas macro (rompe el tiling del pasto de detalle) */}
        <mesh geometry={macroGeo} material={macroMat} position={[0, 0, 0.006]} receiveShadow />

        {/* 4 · calzada de acceso: silueta recortada por la máscara alfa */}
        <mesh
          geometry={roadGeo}
          material={roadMat}
          position={[0, ROAD_Y_CENTER, ROAD_Z]}
          receiveShadow
        />
      </group>

      {/* 5 · lóbulos de césped que invaden cantos y cabos (en coordenadas de
          mundo, plano sobre la vía: 1 draw call para los 84 mechones) */}
      <instancedMesh ref={tonguesRef} args={[tongueGeo, tongueMat, tongues.length]} />
    </>
  );
}
