'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import { mulberry32 } from './proceduralTextures';
import { groundHeightAt } from './TexturedGround';

/**
 * Vegetación procedurales del comparador sísmico: árboles, arbustos,
 * matorrales secos y piedras repartidos en el anillo radio 18–62 m.
 *
 * Todo es geometría procedural de bajo coste (cilindro + cono para los
 * árboles, icosaedros deformados para arbustos y piedras) dibujada con
 * InstancedMesh: el bosque entero son 6 draw calls
 * (tronco/copa × cerca-lejos + arbustos + rocas), sin cargas de red y con
 * sombras únicamente en los ~10 árboles más cercanos a la cámara.
 *
 * Reparto determinista con mulberry32 (misma parcela en cada carga). Se
 * respetan las zonas de paso del escenario:
 *  - la calzada central y su entorno (|x| < 4,9 y z > 4,4);
 *  - la huella de las viviendas (|x| < 9,5 y |z| < 6);
 *  - la patrulla de las figuras (z < 8 y |x| < 12);
 *  - el cono frontal de la cámara por defecto (z > 8 y |x| < 10): ahí no
 *    crecen árboles altos, solo arbustos y piedras, para no tapar las casas.
 */

// --- parámetros ------------------------------------------------------------
const RING_MIN = 18;
const RING_MAX = 62;
const TREE_MIN_R = 23; // los árboles empiezan más lejos (menos choque de cámara)
const SHADOW_TREE_LIMIT = 10; // árboles con castShadow (los más cercanos)

/** Variantes de árbol: [radio del tronco, alto del tronco, radio copa, alto copa, verde]. */
const TREE_VARIANTS = [
  { trunkR: 0.16, trunkH: 2.3, canopyR: 1.4, canopyH: 3.0, canopy: '#4f6129' }, // frondoso bajo
  { trunkR: 0.13, trunkH: 1.9, canopyR: 1.8, canopyH: 2.4, canopy: '#5d6b2e' }, // olivar ancho
  { trunkR: 0.18, trunkH: 3.1, canopyR: 1.15, canopyH: 4.2, canopy: '#3f5725' }, // conífera alta
] as const;

const BUSH_COLORS = ['#556a2b', '#667036', '#797638', '#4c5f27', '#84803f']; // oliva → seco
const SHRUB_COLORS = ['#8a8444', '#96904e', '#7c7a3c']; // matorral seco
const ROCK_COLORS = ['#8c887c', '#7a766c', '#9a938a', '#6f6a60'];

// --- tipología de instancia ------------------------------------------------
interface TreeInst {
  x: number;
  z: number;
  y: number; // cota del suelo (mundo)
  rot: number;
  trunkR: number;
  trunkH: number;
  canopyR: number;
  canopyH: number;
  canopyColor: Color;
  trunkTint: number; // multiplicador claro/oscuro del tronco
}

interface BlobInst {
  x: number;
  z: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  sz: number;
  color: Color;
}

export interface NatureScatterProps {
  /** Número total de elementos (árboles + arbustos + piedras). */
  count?: number;
  /** Semilla del reparto: cambia el seed y cambia el paisaje. */
  seed?: number;
}

// --- utilidades ------------------------------------------------------------
function jitterColor(hex: string, rnd: () => number, amount: number): Color {
  const color = new Color(hex);
  const k = 1 - amount + rnd() * amount * 2;
  const shift = 1 + (rnd() - 0.5) * 0.06;
  return new Color(color.r * k * shift, color.g * k, color.b * k * (2 - shift));
}

/**
 * Icosaedro low-poly deformado de forma determinista: la deformación depende
 * SOLO de la dirección del vértice, de modo que los vértices duplicados de
 * cada cara se desplazan igual y no se abren grietas.
 */
function createDeformedIco(amplitude: number, phase: number): IcosahedronGeometry {
  const geometry = new IcosahedronGeometry(1, 0);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k =
      1 +
      amplitude * Math.sin(x * 3.1 + phase) * Math.cos(z * 2.7 - phase * 0.5) +
      amplitude * 0.55 * Math.sin(y * 4.3 + phase * 1.7);
    pos.setXYZ(i, x * k, y * k, z * k);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Cono de copa con perfil ligeramente irregular (viveza sin vértices extra). */
function createCanopyGeometry(): ConeGeometry {
  const geometry = new ConeGeometry(1, 1, 7, 1);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 1 + 0.1 * Math.sin(x * 3.3 + 0.8) * Math.cos(z * 2.9 - 1.4) * (1 - Math.abs(y));
    pos.setXYZ(i, x * k, y, z * k);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.translate(0, 0.5, 0); // base en y=0 para clavarla sobre el tronco
  return geometry;
}

function createTrunkGeometry(): CylinderGeometry {
  const geometry = new CylinderGeometry(0.5, 1, 1, 5, 1);
  geometry.translate(0, 0.5, 0); // crece desde el suelo
  return geometry;
}

// --- reparto determinista --------------------------------------------------
function buildScatter(count: number, seed: number): {
  treesNear: TreeInst[];
  treesFar: TreeInst[];
  bushes: BlobInst[];
  shrubs: BlobInst[];
  rocks: BlobInst[];
} {
  const rnd = mulberry32(seed >>> 0);
  const trees: TreeInst[] = [];
  const bushes: BlobInst[] = [];
  const shrubs: BlobInst[] = [];
  const rocks: BlobInst[] = [];

  const target = Math.max(24, Math.min(420, Math.round(count)));
  let guard = 0;
  while (trees.length + bushes.length + shrubs.length + rocks.length < target && guard < target * 16) {
    guard++;
    const r = RING_MIN + rnd() * (RING_MAX - RING_MIN);
    const a = rnd() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    // calzada y su entorno inmediato (el camino va por x ≈ 0 hacia la cámara)
    if (Math.abs(x) < 4.9 && z > 4.4) continue;
    // huella de las viviendas (x = ±5,1) y acceso
    if (Math.abs(x) < 9.5 && Math.abs(z) < 6) continue;
    // zona de patrulla de las figuras animadas
    if (z < 8 && Math.abs(x) < 12) continue;

    const y = groundHeightAt(x, z);
    // cono frontal de la cámara por defecto: sin árboles altos (no tapan casas)
    const inFrontCone = z > 8 && Math.abs(x) < 10;
    const roll = rnd();

    if (roll < 0.45 && !inFrontCone && r >= TREE_MIN_R) {
      const variant = TREE_VARIANTS[Math.floor(rnd() * TREE_VARIANTS.length)];
      const scale = 0.78 + rnd() * 0.5;
      trees.push({
        x,
        z,
        y: y - 0.08,
        rot: rnd() * Math.PI * 2,
        trunkR: variant.trunkR * scale * (0.9 + rnd() * 0.25),
        trunkH: variant.trunkH * scale,
        canopyR: variant.canopyR * scale * (0.85 + rnd() * 0.35),
        canopyH: variant.canopyH * scale * (0.9 + rnd() * 0.2),
        canopyColor: jitterColor(variant.canopy, rnd, 0.12),
        trunkTint: 0.85 + rnd() * 0.3,
      });
    } else if (roll < 0.72) {
      // arbusto: esfera baja deformada, hundida para que apoye en el pasto
      const s = 0.55 + rnd() * 0.75;
      bushes.push({
        x,
        z,
        y: y - s * 0.22,
        rot: rnd() * Math.PI * 2,
        sx: s * (0.9 + rnd() * 0.4),
        sy: s * (0.55 + rnd() * 0.4),
        sz: s * (0.9 + rnd() * 0.4),
        color: jitterColor(BUSH_COLORS[Math.floor(rnd() * BUSH_COLORS.length)], rnd, 0.12),
      });
    } else if (roll < 0.86) {
      // matorral seco (reducido y amarillento: rompe el verde del conjunto)
      const s = 0.35 + rnd() * 0.45;
      shrubs.push({
        x,
        z,
        y: y - s * 0.18,
        rot: rnd() * Math.PI * 2,
        sx: s * (0.9 + rnd() * 0.5),
        sy: s * (0.5 + rnd() * 0.45),
        sz: s * (0.9 + rnd() * 0.5),
        color: jitterColor(SHRUB_COLORS[Math.floor(rnd() * SHRUB_COLORS.length)], rnd, 0.14),
      });
    } else {
      // piedra: icosaedro aplastado y girado
      const s = 0.28 + rnd() * 0.8;
      rocks.push({
        x,
        z,
        y: y - s * 0.32,
        rot: rnd() * Math.PI * 2,
        sx: s * (0.8 + rnd() * 0.5),
        sy: s * (0.45 + rnd() * 0.3),
        sz: s * (0.8 + rnd() * 0.5),
        color: jitterColor(ROCK_COLORS[Math.floor(rnd() * ROCK_COLORS.length)], rnd, 0.1),
      });
    }
  }

  // guijarros sueltos junto a los cantos del camino (realza el paso del tiempo)
  for (let i = 0; i < 14; i++) {
    const side = rnd() < 0.5 ? -1 : 1;
    const z = 9 + rnd() * 30;
    const s = 0.16 + rnd() * 0.28;
    rocks.push({
      x: side * (2.1 + rnd() * 1.9),
      z,
      y: groundHeightAt(side * 3, z) - s * 0.3,
      rot: rnd() * Math.PI * 2,
      sx: s,
      sy: s * (0.5 + rnd() * 0.3),
      sz: s,
      color: jitterColor(ROCK_COLORS[Math.floor(rnd() * ROCK_COLORS.length)], rnd, 0.12),
    });
  }

  // los ~10 árboles más cercanos a la cámara por defecto reciben sombra
  const camZ = 17.5;
  trees.sort((p, q) => p.x * p.x + (p.z - camZ) ** 2 - (q.x * q.x + (q.z - camZ) ** 2));
  const treesNear = trees.slice(0, SHADOW_TREE_LIMIT);
  const treesFar = trees.slice(SHADOW_TREE_LIMIT);
  return { treesNear, treesFar, bushes, shrubs, rocks };
}

// --- relleno de InstancedMesh ----------------------------------------------
const FILL_DUMMY = new Object3D();
const FILL_COLOR = new Color();

/**
 * Deja a escala 0 las instancias sobrantes (la capacidad del InstancedMesh es
 * `Math.max(n, 1)`): así un grupo vacío nunca deja un modelo de "tamaño real"
 * clavado en el origen.
 */
function hideExtraSlots(mesh: InstancedMesh, from: number): void {
  FILL_DUMMY.position.set(0, 0, 0);
  FILL_DUMMY.rotation.set(0, 0, 0);
  FILL_DUMMY.scale.set(0, 0, 0);
  FILL_DUMMY.updateMatrix();
  for (let i = from; i < mesh.count; i++) mesh.setMatrixAt(i, FILL_DUMMY.matrix);
}

function fillTrees(trunkMesh: InstancedMesh | null, canopyMesh: InstancedMesh | null, items: TreeInst[]): void {
  if (!trunkMesh || !canopyMesh) return;
  const n = Math.min(items.length, trunkMesh.count, canopyMesh.count);
  for (let i = 0; i < n; i++) {
    const it = items[i];
    FILL_DUMMY.position.set(it.x, it.y, it.z);
    FILL_DUMMY.rotation.set(0, it.rot, 0);
    FILL_DUMMY.scale.set(it.trunkR, it.trunkH, it.trunkR);
    FILL_DUMMY.updateMatrix();
    trunkMesh.setMatrixAt(i, FILL_DUMMY.matrix);
    trunkMesh.setColorAt(i, FILL_COLOR.setScalar(it.trunkTint));

    // la copa se hunde un 28 % en el tronco para que no parezcan piezas sueltas
    FILL_DUMMY.position.set(it.x, it.y + it.trunkH * 0.72, it.z);
    FILL_DUMMY.scale.set(it.canopyR, it.canopyH, it.canopyR);
    FILL_DUMMY.updateMatrix();
    canopyMesh.setMatrixAt(i, FILL_DUMMY.matrix);
    canopyMesh.setColorAt(i, it.canopyColor);
  }
  hideExtraSlots(trunkMesh, n);
  hideExtraSlots(canopyMesh, n);
  trunkMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.instanceMatrix.needsUpdate = true;
  if (trunkMesh.instanceColor) trunkMesh.instanceColor.needsUpdate = true;
  if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
  trunkMesh.computeBoundingSphere();
  canopyMesh.computeBoundingSphere();
}

function fillBlobs(mesh: InstancedMesh | null, items: BlobInst[]): void {
  if (!mesh) return;
  const n = Math.min(items.length, mesh.count);
  for (let i = 0; i < n; i++) {
    const it = items[i];
    FILL_DUMMY.position.set(it.x, it.y, it.z);
    FILL_DUMMY.rotation.set(0, it.rot, 0);
    FILL_DUMMY.scale.set(it.sx, it.sy, it.sz);
    FILL_DUMMY.updateMatrix();
    mesh.setMatrixAt(i, FILL_DUMMY.matrix);
    mesh.setColorAt(i, it.color);
  }
  hideExtraSlots(mesh, n);
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

// --- componente ------------------------------------------------------------
export default function NatureScatter({ count = 150, seed = 20250918 }: NatureScatterProps) {
  const data = useMemo(() => buildScatter(count, seed), [count, seed]);

  // geometrías y materiales compartidos por todos los grupos (una sola vez)
  const geo = useMemo(
    () => ({
      trunk: createTrunkGeometry(),
      canopy: createCanopyGeometry(),
      bush: createDeformedIco(0.3, 2.7),
      shrub: createDeformedIco(0.42, 5.1),
      rock: createDeformedIco(0.38, 9.3),
    }),
    [],
  );
  const mat = useMemo(
    () => ({
      trunk: new MeshStandardMaterial({ color: '#6a5340', roughness: 0.95, metalness: 0, flatShading: true }),
      // blancos: el color real lo aporta instanceColor (variación por árbol)
      canopy: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0, flatShading: true }),
      blob: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.94, metalness: 0, flatShading: true }),
      rock: new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, metalness: 0.02, flatShading: true }),
    }),
    [],
  );

  const trunkNearRef = useRef<InstancedMesh>(null);
  const canopyNearRef = useRef<InstancedMesh>(null);
  const trunkFarRef = useRef<InstancedMesh>(null);
  const canopyFarRef = useRef<InstancedMesh>(null);
  const bushRef = useRef<InstancedMesh>(null);
  const shrubRef = useRef<InstancedMesh>(null);
  const rockRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    fillTrees(trunkNearRef.current, canopyNearRef.current, data.treesNear);
    fillTrees(trunkFarRef.current, canopyFarRef.current, data.treesFar);
    fillBlobs(bushRef.current, data.bushes);
    fillBlobs(shrubRef.current, data.shrubs);
    fillBlobs(rockRef.current, data.rocks);
  }, [data]);

  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      Object.values(mat).forEach((m) => m.dispose());
    },
    [geo, mat],
  );

  const near = data.treesNear.length;
  const far = data.treesFar.length;

  return (
    <group>
      {/* árboles cercanos: proyectan sombra sobre el pasto de la parcela */}
      <instancedMesh
        ref={trunkNearRef}
        args={[geo.trunk, mat.trunk, Math.max(near, 1)]}
        castShadow={near > 0}
        receiveShadow
      />
      <instancedMesh
        ref={canopyNearRef}
        args={[geo.canopy, mat.canopy, Math.max(near, 1)]}
        castShadow={near > 0}
      />
      {/* bosque lejano: sin sombras (solo silhouette + color) */}
      <instancedMesh ref={trunkFarRef} args={[geo.trunk, mat.trunk, Math.max(far, 1)]} />
      <instancedMesh ref={canopyFarRef} args={[geo.canopy, mat.canopy, Math.max(far, 1)]} />
      {/* arbustos, matorral seco y piedras */}
      <instancedMesh ref={bushRef} args={[geo.bush, mat.blob, Math.max(data.bushes.length, 1)]} />
      <instancedMesh ref={shrubRef} args={[geo.shrub, mat.blob, Math.max(data.shrubs.length, 1)]} />
      <instancedMesh ref={rockRef} args={[geo.rock, mat.rock, Math.max(data.rocks.length, 1)]} />
    </group>
  );
}
