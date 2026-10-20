'use client';
/*
 * Plano3903D — reconstrucción 3D del plano "Proyecto №390-1" (127 m²).
 * Contrato de datos: src/lib/plano390Data.ts.
 * Suelo x→Este 0..14, z→Sur 0..11; z negativo = terraza al norte.
 *
 * Materiales: reutiliza el set de texturas REALES de los otros visores
 * (`useViewerTextures`: /flow/fabrick-tex-* y PBR /materials/wood-*) con
 * fallback procedural en canvas. Iluminación: entorno de estudio PMREM
 * (RoomEnvironment) + sol con sombras + lámparas interiores.
 */
import { useEffect, useMemo } from 'react';
import { CanvasTexture, DoubleSide, PMREMGenerator, RepeatWrapping, SRGBColorSpace } from 'three';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { PLAN, ROOMS, WALLS, NPC_SPOTS, CCTV_CAMERAS, QUINCHO } from '@/lib/plano390Data';
import type { CctvCamera, RoomBox, WallSeg } from '@/lib/plano390Data';
import { AnimatedFigure } from '../monitoring/AnimatedFigure';
import { usePbrMaps, useTextureMaterial, useViewerTextures, viewerTextureVariant } from '../monitoring/useViewerTextures';

/* ── Textura procedural de cerámica (fallback del baño) ── */

function makeTileTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#e6e2da';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(120,114,102,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  g.strokeStyle = 'rgba(150,145,135,.55)';
  g.lineWidth = 2;
  for (const s of [0, 64, 128, 192]) {
    g.beginPath();
    g.moveTo(s, 0);
    g.lineTo(s, 256);
    g.moveTo(0, s);
    g.lineTo(256, s);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(2, 3);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ── Porcelanato brillante (losas grandes + vetas suaves) ── */

function makePorcelainTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#ece9e3';
  g.fillRect(0, 0, 512, 512);
  // vetas de mármol muy suaves
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(150,148,142,${Math.random() * 0.09 + 0.02})`;
    g.lineWidth = 1 + Math.random() * 2.5;
    g.beginPath();
    const y = Math.random() * 512;
    g.moveTo(0, y);
    g.bezierCurveTo(170, y + (Math.random() * 70 - 35), 340, y + (Math.random() * 70 - 35), 512, y);
    g.stroke();
  }
  // losa 120×120 cm: junta fina cada 256 px (2 losas por textura)
  g.strokeStyle = 'rgba(176,172,164,.55)';
  g.lineWidth = 2;
  for (const s of [0, 256, 512]) {
    g.beginPath();
    g.moveTo(s, 0);
    g.lineTo(s, 512);
    g.moveTo(0, s);
    g.lineTo(512, s);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ── Piedra rústica del quincho (muro de parrilla) ── */

function makeStoneTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#8d8577';
  g.fillRect(0, 0, 256, 256);
  let y = 0;
  let row = 0;
  while (y < 256) {
    const h = 26 + Math.random() * 16;
    let x = row % 2 === 0 ? -20 : 0;
    while (x < 256) {
      const w = 34 + Math.random() * 38;
      const tone = 118 + Math.floor(Math.random() * 48);
      g.fillStyle = `rgb(${tone},${tone - 8},${tone - 20})`;
      g.beginPath();
      const r = 5;
      const x0 = x + 2;
      const y0 = y + 2;
      const w0 = w - 4;
      const h0 = h - 4;
      g.moveTo(x0 + r, y0);
      g.lineTo(x0 + w0 - r, y0);
      g.quadraticCurveTo(x0 + w0, y0, x0 + w0, y0 + r);
      g.lineTo(x0 + w0, y0 + h0 - r);
      g.quadraticCurveTo(x0 + w0, y0 + h0, x0 + w0 - r, y0 + h0);
      g.lineTo(x0 + r, y0 + h0);
      g.quadraticCurveTo(x0, y0 + h0, x0, y0 + h0 - r);
      g.lineTo(x0, y0 + r);
      g.quadraticCurveTo(x0, y0, x0 + r, y0);
      g.fill();
      x += w;
    }
    y += h;
    row++;
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 2);
  t.colorSpace = SRGBColorSpace;
  return t;
}



function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.9;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/* ── Ayudas tipadas ── */

const WALL_H = PLAN.wallH;

type WallSize = { len: number; th: number; cx: number; cz: number; horizontal: boolean };

function wallSize(seg: WallSeg): WallSize {
  const horizontal = seg.z0 !== seg.z1;
  const len = horizontal ? Math.abs(seg.x1 - seg.x0) : Math.abs(seg.z1 - seg.z0);
  const th = horizontal ? Math.abs(seg.z1 - seg.z0) : Math.abs(seg.x1 - seg.x0);
  return { len, th, cx: (seg.x0 + seg.x1) / 2, cz: (seg.z0 + seg.z1) / 2, horizontal };
}

function isWood(room: RoomBox): boolean {
  return room.floor === 'wood' || room.floor === 'corridor';
}

/** Yaw para que la carcasa (lente hacia −z) apunte de `pos` a `look`. */
function aimYaw(cam: CctvCamera): number {
  return Math.atan2(-(cam.look[0] - cam.pos[0]), -(cam.look[2] - cam.pos[2]));
}

/* Techo a dos aguas: caballete a lo largo de x en z = 5,5. */
const RIDGE_Z = 5.5;
const RISE = PLAN.ridgeExtra;
const EAVE_RUN = RIDGE_Z + 0.4;
const SLOPE_LEN = Math.hypot(EAVE_RUN, RISE);
const ROOF_ANG = Math.atan2(RISE, EAVE_RUN);
const EAVE_Y = WALL_H - (RISE * 0.4) / EAVE_RUN;
const ROOF_MID_Y = (WALL_H + RISE + EAVE_Y) / 2 - 0.06;

type TreeSpot = { x: number; z: number; s: number };
const TREES: TreeSpot[] = [
  { x: -2.4, z: 6.6, s: 1.0 },
  { x: -2.9, z: 12.4, s: 0.9 },
  { x: 22.9, z: 2.2, s: 1.05 },
  { x: 22.6, z: 10.2, s: 0.85 },
  { x: 16.0, z: -2.4, s: 0.9 },
  { x: -2.7, z: -2.2, s: 0.8 },
];

const CLOSET_BARS: [number, number, number][] = [
  [11.9, 1.0, 6.7],
  [12.3, 1.0, 6.7],
  [12.7, 1.0, 6.7],
  [13.1, 1.0, 6.7],
  [13.5, 1.0, 6.7],
];

/** Lámparas de techo por estancia: [x, z]. */
const LAMPS: [number, number][] = [
  [3.9, 2.4],
  [7.4, 6.3],
  [8.3, 8.9],
  [12.1, 8.9],
  [12.4, 2.6],
  [9.6, 1.3],
];

/** Puntos de luz del quincho (bajo la barra). */
const QUINCHO_LIGHTS: [number, number][] = [
  [16.6, 4.45],
  [18.2, 4.45],
];

/* ── Escena ── */

export default function Plano3903D({ light }: { light: 'day' | 'sunset' | 'night' }) {
  const textures = useViewerTextures();
  const oak = usePbrMaps('woodOak');
  const pine = usePbrMaps('woodPine');
  const tileCanvas = useMemo(() => makeTileTexture(), []);
  const porcelainCanvas = useMemo(() => makePorcelainTexture(), []);
  const stoneCanvas = useMemo(() => makeStoneTexture(), []);

  // Variantes de repeat sobre las fotos reales de los visores.
  const woodMap = useMemo(() => viewerTextureVariant('pisoMadera', 7, 5), [textures.pisoMadera]);
  const deckMap = useMemo(() => viewerTextureVariant('pisoMadera', 4, 2), [textures.pisoMadera]);
  const drywallMap = useMemo(() => viewerTextureVariant('intDrywall', 3, 2), [textures.intDrywall]);
  const extMap = useMemo(() => viewerTextureVariant('extMetalcon', 5, 2), [textures.extMetalcon]);
  const roofMap = useMemo(() => viewerTextureVariant('techoCalamina', 6, 3), [textures.techoCalamina]);
  const grassMap = useMemo(() => viewerTextureVariant('pastoCalle', 12, 9), [textures.pastoCalle]);

  const matWood = useTextureMaterial(woodMap, { color: '#ffffff', roughness: 0.6, metalness: 0.03, envMapIntensity: 0.7 });
  const matDeck = useTextureMaterial(deckMap, { color: '#d9b48c', roughness: 0.75, envMapIntensity: 0.5 });
  const matTile = useTextureMaterial(tileCanvas, { color: '#ffffff', roughness: 0.34, envMapIntensity: 0.6 });
  const matWallInt = useTextureMaterial(drywallMap, { color: '#f3eee4', roughness: 0.88, envMapIntensity: 0.35 });
  const matCeil = useTextureMaterial(drywallMap, { color: '#fbf7ef', roughness: 0.95, envMapIntensity: 0.3 });
  const matWallExt = useTextureMaterial(extMap, { color: '#6d757c', roughness: 0.66, metalness: 0.2, envMapIntensity: 0.8 });
  const matRoof = useTextureMaterial(roofMap, { color: '#505b64', roughness: 0.52, metalness: 0.35, envMapIntensity: 0.9 });
  const matGrass = useTextureMaterial(grassMap, { color: '#93a97c', roughness: 0.96, envMapIntensity: 0.25 });
  const matOak = useTextureMaterial(oak.color, {
    color: '#ffffff',
    roughness: 0.6,
    normalMap: oak.normal,
    roughnessMap: oak.roughness,
    envMapIntensity: 0.55,
  });
  const matPine = useTextureMaterial(pine.color, {
    color: '#e8cfa8',
    roughness: 0.7,
    normalMap: pine.normal,
    roughnessMap: pine.roughness,
    envMapIntensity: 0.4,
  });
  const matPorcelain = useTextureMaterial(porcelainCanvas, {
    color: '#ffffff',
    roughness: 0.08,
    metalness: 0.04,
    envMapIntensity: 1.7,
  });
  const matStone = useTextureMaterial(stoneCanvas, {
    color: '#b6ab97',
    roughness: 0.82,
    metalness: 0.02,
    envMapIntensity: 0.5,
  });

  if (!tileCanvas) return null;

  const night = light === 'night';
  const bg = night ? '#0b1524' : light === 'sunset' ? '#f3c9a0' : '#d6e5ef';
  const sunColor = night ? '#93abd8' : light === 'sunset' ? '#ffb46e' : '#eef6ff';
  const sunIntensity = night ? 0.2 : light === 'sunset' ? 2.2 : 3.1;
  const lampIntensity = night ? 2.8 : light === 'sunset' ? 1.3 : 0.65;

  return (
    <>
      <StudioEnvironment />
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 28, 78]} />
      <group>

      {/* ── Terreno con césped real ── */}
      <mesh position={[7, -0.02, 7]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={matGrass}>
        <planeGeometry args={[62, 46]} />
      </mesh>

      {/* ── Losas de piso por ROOMS ── */}
      {ROOMS.map((room) => (
        <mesh
          key={room.id}
          position={[(room.x0 + room.x1) / 2, 0.03, (room.z0 + room.z1) / 2]}
          receiveShadow
          material={
            room.floor === 'porcelain'
              ? matPorcelain
              : isWood(room)
                ? matWood
                : room.floor === 'tile'
                  ? matTile
                  : matDeck
          }
        >
          <boxGeometry args={[room.x1 - room.x0, 0.06, room.z1 - room.z0]} />
        </mesh>
      ))}

      {/* ── Cielorraso interior ── */}
      {ROOMS.filter((room) => room.id !== '11').map((room) => (
        <mesh
          key={`ceil${room.id}`}
          position={[(room.x0 + room.x1) / 2, WALL_H - 0.035, (room.z0 + room.z1) / 2]}
          receiveShadow
          material={matCeil}
        >
          <boxGeometry args={[room.x1 - room.x0, 0.05, room.z1 - room.z0]} />
        </mesh>
      ))}

      {/* ── Muros WALLS (cajas; vanos = saltos entre cajas) ── */}
      {WALLS.map((seg, i) => {
        const { len, th, cx, cz, horizontal } = wallSize(seg);
        if (seg.window) {
          const half = len / 2;
          return (
            <group key={`w${i}`}>
              <mesh position={[cx, 1.05, cz]} rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
                <boxGeometry args={[len, 2.1, th * 0.4]} />
                <meshStandardMaterial
                  color="#a9d0ec"
                  transparent
                  opacity={0.22}
                  metalness={0.35}
                  roughness={0.03}
                  envMapIntensity={1.6}
                />
              </mesh>
              <mesh position={[cx - (half - 0.04), 1.05, cz]}>
                <boxGeometry args={[0.08, 2.1, th]} />
                <meshStandardMaterial color="#20272c" roughness={0.45} metalness={0.4} />
              </mesh>
              <mesh position={[cx + (half - 0.04), 1.05, cz]}>
                <boxGeometry args={[0.08, 2.1, th]} />
                <meshStandardMaterial color="#20272c" roughness={0.45} metalness={0.4} />
              </mesh>
              <mesh position={[cx, 2.14, cz]}>
                <boxGeometry args={[len, 0.08, th]} />
                <meshStandardMaterial color="#20272c" roughness={0.45} metalness={0.4} />
              </mesh>
              <mesh position={[cx, 2.4, cz]} castShadow receiveShadow material={seg.kind === 'ext' ? matWallExt : matWallInt}>
                <boxGeometry args={[len, WALL_H - 2.1, th]} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={`w${i}`} position={[cx, WALL_H / 2, cz]} castShadow receiveShadow material={seg.kind === 'ext' ? matWallExt : matWallInt}>
            <boxGeometry args={[len, WALL_H, th]} />
          </mesh>
        );
      })}

      {/* ── Puerta de entrada entreabierta ── */}
      <group position={[4.62, 0, 10.82]} rotation={[0, -0.62, 0]}>
        <mesh position={[0.49, 1.05, 0]} castShadow material={matOak}>
          <boxGeometry args={[0.96, 2.1, 0.06]} />
        </mesh>
        <mesh position={[0.82, 1.02, 0.07]}>
          <cylinderGeometry args={[0.022, 0.022, 0.16, 8]} />
          <meshStandardMaterial color="#c8a35a" roughness={0.25} metalness={0.85} />
        </mesh>
      </group>

      {/* ── Escalón decorativo bajo el paño corredizo de la terraza ── */}
      <mesh position={[(0.25 + 6.4) / 2, 0.1, 0]} castShadow receiveShadow material={matDeck}>
        <boxGeometry args={[6.4 - 0.25, PLAN.stepH, 0.5]} />
      </mesh>

      {/* ── Cubierta a dos aguas + chimenea + alero sur ── */}
      <mesh position={[7, ROOF_MID_Y, (RIDGE_Z - 0.4) / 2]} rotation={[-ROOF_ANG, 0, 0]} castShadow material={matRoof}>
        <boxGeometry args={[15.0, 0.12, SLOPE_LEN]} />
      </mesh>
      <mesh position={[7, ROOF_MID_Y, (RIDGE_Z + 11.4) / 2]} rotation={[ROOF_ANG, 0, 0]} castShadow material={matRoof}>
        <boxGeometry args={[15.0, 0.12, SLOPE_LEN]} />
      </mesh>
      <mesh position={[9.8, WALL_H + RISE + 0.3, RIDGE_Z]} castShadow>
        <boxGeometry args={[0.7, 1.6, 0.7]} />
        <meshStandardMaterial color="#2b3136" roughness={0.95} />
      </mesh>
      <mesh position={[3.4, 2.78, 10.9]} castShadow material={matOak}>
        <boxGeometry args={[0.16, 0.2, 1.3]} />
      </mesh>
      <mesh position={[10.6, 2.78, 10.9]} castShadow material={matOak}>
        <boxGeometry args={[0.16, 0.2, 1.3]} />
      </mesh>

      {/* ── Pérgola de la terraza (postes + cubierta translúcida) ── */}
      {[
        [0.4, -0.35],
        [6.1, -0.35],
        [0.4, -2.8],
        [6.1, -2.8],
      ].map((p, i) => (
        <mesh key={`pp${i}`} position={[p[0], 1.25, p[1]]} castShadow material={matPine}>
          <boxGeometry args={[0.12, 2.5, 0.12]} />
        </mesh>
      ))}
      <mesh position={[3.25, 2.56, -1.575]}>
        <boxGeometry args={[6.2, 0.06, 3.2]} />
        <meshStandardMaterial color="#3a4742" transparent opacity={0.45} roughness={0.35} metalness={0.2} envMapIntensity={1.2} />
      </mesh>

      {/* ── Living: sofá + mesa ratona + alfombra (frente al ventanal) ── */}
      <group>
        <mesh position={[4.2, 0.27, 0.55]} castShadow>
          <boxGeometry args={[2.2, 0.42, 0.95]} />
          <meshStandardMaterial color="#3a4046" roughness={0.95} />
        </mesh>
        <mesh position={[4.2, 0.58, 0.3]} castShadow>
          <boxGeometry args={[2.2, 0.5, 0.18]} />
          <meshStandardMaterial color="#3a4046" roughness={0.95} />
        </mesh>
        <mesh position={[3.73, 0.56, 0.62]} castShadow>
          <boxGeometry args={[1.02, 0.16, 0.68]} />
          <meshStandardMaterial color="#e6dccb" roughness={0.98} />
        </mesh>
        <mesh position={[4.67, 0.56, 0.62]} castShadow>
          <boxGeometry args={[1.02, 0.16, 0.68]} />
          <meshStandardMaterial color="#e6dccb" roughness={0.98} />
        </mesh>
        <mesh position={[5.7, 0.067, 2.0]} receiveShadow>
          <boxGeometry args={[2.4, 0.014, 1.8]} />
          <meshStandardMaterial color="#7d5a4a" roughness={0.98} />
        </mesh>
        <mesh position={[4.2, 0.28, 2.6]} castShadow material={matOak}>
          <boxGeometry args={[1.1, 0.42, 0.55]} />
        </mesh>
      </group>

      {/* ── Comedor (movido al este para dejar la cocina en L) ── */}
      <group>
        <mesh position={[6.5, 0.78, 3.9]} castShadow material={matOak}>
          <boxGeometry args={[2.0, 0.06, 0.9]} />
        </mesh>
        {[
          [5.6, 3.58],
          [7.4, 3.58],
          [5.6, 4.22],
          [7.4, 4.22],
          [5.3, 3.9],
          [7.7, 3.9],
        ].map((p, i) => (
          <mesh key={`st${i}`} position={[p[0], 0.285, p[1]]} castShadow material={matPine}>
            <cylinderGeometry args={[0.2, 0.24, 0.45, 12]} />
          </mesh>
        ))}
      </group>

      {/* ── COCINA (referencia 4,50 × 3,50 m) ────────────────────────
          Muebles bajos 0,90 m · encimera 0,05 m · alacenas 0,90 m
          Isla 1,80 × 0,90 m y 0,95 m de alto · 3 taburetes.          */}
      <group>
        {/* Muebles bajos: ala oeste (z 1,85..4,85) */}
        <mesh position={[0.55, 0.45, 3.35]} castShadow material={matOak}>
          <boxGeometry args={[0.6, 0.9, 3.0]} />
        </mesh>
        <mesh position={[0.575, 0.93, 3.35]} castShadow>
          <boxGeometry args={[0.72, 0.05, 3.12]} />
          <meshStandardMaterial color="#f4f2ec" roughness={0.16} metalness={0.03} envMapIntensity={1.2} />
        </mesh>
        {/* Muebles bajos: ala sur (x 0,85..3,95) */}
        <mesh position={[2.4, 0.45, 5.25]} castShadow material={matOak}>
          <boxGeometry args={[3.1, 0.9, 0.6]} />
        </mesh>
        <mesh position={[2.4, 0.93, 5.22]} castShadow>
          <boxGeometry args={[3.2, 0.05, 0.68]} />
          <meshStandardMaterial color="#f4f2ec" roughness={0.16} metalness={0.03} envMapIntensity={1.2} />
        </mesh>
        {/* Refrigerador doble puerta (acero) */}
        <mesh position={[0.58, 0.97, 0.8]} castShadow>
          <boxGeometry args={[0.66, 1.94, 0.7]} />
          <meshStandardMaterial color="#b9bec2" roughness={0.24} metalness={0.85} envMapIntensity={1.4} />
        </mesh>
        <mesh position={[0.925, 1.1, 0.8]}>
          <boxGeometry args={[0.015, 1.5, 0.02]} />
          <meshStandardMaterial color="#6d7378" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.93, 1.25, 0.62]}>
          <boxGeometry args={[0.03, 0.7, 0.04]} />
          <meshStandardMaterial color="#8d949a" roughness={0.25} metalness={0.9} />
        </mesh>
        {/* Torre de hornos en madera + dos hornos de vidrio negro */}
        <mesh position={[0.58, 1.1, 1.5]} castShadow material={matOak}>
          <boxGeometry args={[0.66, 2.2, 0.7]} />
        </mesh>
        <mesh position={[0.925, 1.42, 1.5]}>
          <boxGeometry args={[0.02, 0.38, 0.5]} />
          <meshStandardMaterial color="#111518" roughness={0.12} metalness={0.4} envMapIntensity={1.4} />
        </mesh>
        <mesh position={[0.925, 1.9, 1.5]}>
          <boxGeometry args={[0.02, 0.38, 0.5]} />
          <meshStandardMaterial color="#111518" roughness={0.12} metalness={0.4} envMapIntensity={1.4} />
        </mesh>
        {[1.22, 1.7].map((y, i) => (
          <mesh key={`oh${i}`} position={[0.955, y, 1.5]}>
            <boxGeometry args={[0.03, 0.03, 0.44]} />
            <meshStandardMaterial color="#c9ced2" roughness={0.25} metalness={0.9} />
          </mesh>
        ))}
        {/* Alacenas blancas (oeste + sur) */}
        <mesh position={[0.43, 1.95, 3.2]} castShadow>
          <boxGeometry args={[0.36, 0.9, 2.6]} />
          <meshStandardMaterial color="#f1efe8" roughness={0.55} />
        </mesh>
        <mesh position={[2.65, 1.95, 5.37]} castShadow>
          <boxGeometry args={[2.5, 0.9, 0.36]} />
          <meshStandardMaterial color="#f1efe8" roughness={0.55} />
        </mesh>
        {/* Tira LED bajo alacenas (luz cálida) */}
        <mesh position={[0.62, 1.475, 3.2]}>
          <boxGeometry args={[0.05, 0.02, 2.5]} />
          <meshStandardMaterial color="#fff6e0" emissive="#ffd9a0" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[2.65, 1.475, 5.18]}>
          <boxGeometry args={[2.4, 0.02, 0.05]} />
          <meshStandardMaterial color="#fff6e0" emissive="#ffd9a0" emissiveIntensity={1.5} />
        </mesh>
        {/* Placa de cocción + campana + ducto */}
        <mesh position={[0.58, 0.965, 2.85]}>
          <boxGeometry args={[0.52, 0.02, 0.75]} />
          <meshStandardMaterial color="#101315" roughness={0.1} metalness={0.45} envMapIntensity={1.4} />
        </mesh>
        <mesh position={[0.58, 1.8, 2.85]} castShadow>
          <boxGeometry args={[0.52, 0.14, 0.82]} />
          <meshStandardMaterial color="#aeb4b8" roughness={0.3} metalness={0.75} envMapIntensity={1.2} />
        </mesh>
        <mesh position={[0.5, 2.22, 2.85]}>
          <boxGeometry args={[0.3, 0.72, 0.3]} />
          <meshStandardMaterial color="#9aa0a4" roughness={0.35} metalness={0.7} />
        </mesh>
        {/* Lavamanos de cocina */}
        <mesh position={[2.7, 0.962, 5.18]}>
          <boxGeometry args={[0.55, 0.015, 0.42]} />
          <meshStandardMaterial color="#2b3033" roughness={0.15} metalness={0.5} />
        </mesh>
        <mesh position={[2.7, 1.1, 5.4]}>
          <cylinderGeometry args={[0.022, 0.022, 0.3, 10]} />
          <meshStandardMaterial color="#b9bec2" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[2.7, 1.24, 5.34]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.16, 10]} />
          <meshStandardMaterial color="#b9bec2" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Isla 1,80 × 0,90 m, alto 0,95 m, cuerpo en madera */}
        <mesh position={[3.0, 0.46, 3.2]} castShadow material={matPine}>
          <boxGeometry args={[0.9, 0.92, 1.8]} />
        </mesh>
        <mesh position={[3.0, 0.955, 3.2]} castShadow>
          <boxGeometry args={[1.02, 0.06, 1.9]} />
          <meshStandardMaterial color="#f4f2ec" roughness={0.16} metalness={0.03} envMapIntensity={1.2} />
        </mesh>
        {/* Lavaplatos de isla + grifería */}
        <mesh position={[3.0, 0.99, 3.0]}>
          <boxGeometry args={[0.38, 0.012, 0.5]} />
          <meshStandardMaterial color="#2b3033" roughness={0.15} metalness={0.5} />
        </mesh>
        <mesh position={[3.0, 1.12, 3.3]}>
          <cylinderGeometry args={[0.02, 0.02, 0.28, 10]} />
          <meshStandardMaterial color="#1e2225" roughness={0.25} metalness={0.8} />
        </mesh>
        {/* 3 taburetes frente a la isla */}
        {[2.6, 3.2, 3.8].map((z, i) => (
          <group key={`isl-st${i}`}>
            <mesh position={[3.66, 0.72, z]} castShadow>
              <cylinderGeometry args={[0.19, 0.19, 0.07, 16]} />
              <meshStandardMaterial color="#6d5f4e" roughness={0.9} />
            </mesh>
            <mesh position={[3.7, 0.93, z]}>
              <boxGeometry args={[0.05, 0.35, 0.36]} />
              <meshStandardMaterial color="#4a4238" roughness={0.85} />
            </mesh>
            {[
              [3.6, z - 0.13],
              [3.72, z - 0.13],
              [3.6, z + 0.13],
              [3.72, z + 0.13],
            ].map((p, j) => (
              <mesh key={`leg${j}`} position={[p[0], 0.34, p[1]]}>
                <cylinderGeometry args={[0.015, 0.015, 0.68, 8]} />
                <meshStandardMaterial color="#1b1e20" roughness={0.4} metalness={0.6} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {/* ── Dormitorio principal (7) ── */}
      <group>
        <mesh position={[12.4, 0.9, 5.4]} castShadow material={matOak}>
          <boxGeometry args={[1.9, 1.2, 0.12]} />
        </mesh>
        <mesh position={[12.4, 0.19, 4.3]} castShadow material={matPine}>
          <boxGeometry args={[1.8, 0.26, 2.05]} />
        </mesh>
        <mesh position={[12.4, 0.47, 4.3]} castShadow>
          <boxGeometry args={[1.8, 0.35, 2.0]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.97} />
        </mesh>
        <mesh position={[12.4, 0.68, 4.05]} castShadow>
          <boxGeometry args={[1.8, 0.08, 1.3]} />
          <meshStandardMaterial color="#7d5a4a" roughness={0.98} />
        </mesh>
        <mesh position={[12.0, 0.71, 5.05]} castShadow>
          <boxGeometry args={[0.6, 0.14, 0.35]} />
          <meshStandardMaterial color="#f0e8da" roughness={0.98} />
        </mesh>
        <mesh position={[12.8, 0.71, 5.05]} castShadow>
          <boxGeometry args={[0.6, 0.14, 0.35]} />
          <meshStandardMaterial color="#f0e8da" roughness={0.98} />
        </mesh>
        <mesh position={[11.35, 0.31, 4.9]} castShadow material={matOak}>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
        </mesh>
        <mesh position={[13.45, 0.31, 4.9]} castShadow material={matOak}>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
        </mesh>
      </group>

      {/* ── Dormitorios 2 y 3 ── */}
      {[
        { x: 8.3, nx1: 7.1, nx2: 9.5 },
        { x: 12.1, nx1: 10.9, nx2: 13.3 },
      ].map((b, i) => (
        <group key={`bed${i}`}>
          <mesh position={[b.x, 0.9, 10.62]} castShadow material={matOak}>
            <boxGeometry args={[1.9, 1.2, 0.12]} />
          </mesh>
          <mesh position={[b.x, 0.19, 9.5]} castShadow material={matPine}>
            <boxGeometry args={[1.8, 0.26, 2.05]} />
          </mesh>
          <mesh position={[b.x, 0.47, 9.5]} castShadow>
            <boxGeometry args={[1.8, 0.35, 2.0]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.97} />
          </mesh>
          <mesh position={[b.x, 0.68, 9.25]} castShadow>
            <boxGeometry args={[1.8, 0.08, 1.3]} />
            <meshStandardMaterial color="#7d5a4a" roughness={0.98} />
          </mesh>
          <mesh position={[b.x - 0.4, 0.71, 10.27]} castShadow>
            <boxGeometry args={[0.6, 0.14, 0.35]} />
            <meshStandardMaterial color="#f0e8da" roughness={0.98} />
          </mesh>
          <mesh position={[b.x + 0.4, 0.71, 10.27]} castShadow>
            <boxGeometry args={[0.6, 0.14, 0.35]} />
            <meshStandardMaterial color="#f0e8da" roughness={0.98} />
          </mesh>
          <mesh position={[b.nx1, 0.31, 10.4]} castShadow material={matOak}>
            <boxGeometry args={[0.45, 0.5, 0.45]} />
          </mesh>
          <mesh position={[b.nx2, 0.31, 10.4]} castShadow material={matOak}>
            <boxGeometry args={[0.45, 0.5, 0.45]} />
          </mesh>
        </group>
      ))}

      {/* ── Clóset (8) ── */}
      {CLOSET_BARS.map((p, i) => (
        <mesh key={`cb${i}`} position={[p[0], p[1], p[2]]} castShadow material={matPine}>
          <boxGeometry args={[0.05, 2.0, 0.05]} />
        </mesh>
      ))}
      <mesh position={[12.7, 2.03, 6.7]} castShadow material={matPine}>
        <boxGeometry args={[1.7, 0.06, 0.4]} />
      </mesh>

      {/* ── Baño (9) ── */}
      <group>
        <mesh position={[8.8, 0.2, 0.6]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 0.4, 16]} />
          <meshStandardMaterial color="#f2efe8" roughness={0.2} envMapIntensity={0.9} />
        </mesh>
        <mesh position={[8.8, 0.5, 0.38]} castShadow>
          <boxGeometry args={[0.42, 0.55, 0.16]} />
          <meshStandardMaterial color="#f2efe8" roughness={0.2} envMapIntensity={0.9} />
        </mesh>
        <mesh position={[8.8, 0.42, 0.66]} castShadow>
          <boxGeometry args={[0.5, 0.07, 0.42]} />
          <meshStandardMaterial color="#ffffff" roughness={0.15} envMapIntensity={1} />
        </mesh>
        <mesh position={[9.9, 0.4, 0.5]} castShadow>
          <boxGeometry args={[0.5, 0.35, 0.4]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.25} envMapIntensity={0.9} />
        </mesh>
        <mesh position={[10.625, 1.0, 0.9]}>
          <boxGeometry args={[0.45, 2.0, 1.0]} />
          <meshStandardMaterial color="#a9d0ec" transparent opacity={0.22} roughness={0.03} metalness={0.35} envMapIntensity={1.4} />
        </mesh>
      </group>

      {/* ── Sauna (10) ── */}
      <group>
        <mesh position={[9.85, 0.14, 3.7]} castShadow receiveShadow material={matPine}>
          <boxGeometry args={[0.45, 0.28, 2.1]} />
        </mesh>
        <mesh position={[10.3, 0.28, 3.7]} castShadow receiveShadow material={matPine}>
          <boxGeometry args={[0.45, 0.56, 2.1]} />
        </mesh>
        <mesh position={[10.72, 0.42, 3.7]} castShadow receiveShadow material={matPine}>
          <boxGeometry args={[0.45, 0.84, 2.1]} />
        </mesh>
        <mesh position={[8.78, 0.3, 3.5]} castShadow>
          <boxGeometry args={[0.4, 0.6, 0.5]} />
          <meshStandardMaterial color="#33383c" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[8.78, 0.18, 3.5]}>
          <boxGeometry args={[0.42, 0.07, 0.52]} />
          <meshStandardMaterial color="#8a8f94" roughness={0.3} metalness={0.7} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[8.78, 0.42, 3.5]}>
          <boxGeometry args={[0.42, 0.07, 0.52]} />
          <meshStandardMaterial color="#8a8f94" roughness={0.3} metalness={0.7} envMapIntensity={1.1} />
        </mesh>
      </group>

      {/* ── Recibidor ── */}
      <group>
        <mesh position={[5.6, 0.27, 10.05]} castShadow material={matOak}>
          <boxGeometry args={[1.4, 0.42, 0.4]} />
        </mesh>
        <mesh position={[4.6, 0.96, 10.3]} castShadow material={matPine}>
          <cylinderGeometry args={[0.05, 0.07, 1.8, 8]} />
        </mesh>
        <mesh position={[4.6, 1.62, 10.3]} castShadow material={matPine}>
          <boxGeometry args={[0.55, 0.05, 0.05]} />
        </mesh>
        <mesh position={[4.6, 1.62, 10.3]} rotation={[0, Math.PI / 2, 0]} castShadow material={matPine}>
          <boxGeometry args={[0.55, 0.05, 0.05]} />
        </mesh>
      </group>

      {/* ══ QUINCHO 6,00 × 3,20 m · cubierta 2,70 m · barra 3,60 × 1,00 · alto 1,05 ══ */}
      <group>
        {/* Losa de porcelanato exterior */}
        <mesh
          position={[(QUINCHO.x0 + QUINCHO.x1) / 2, 0.012, (QUINCHO.z0 + QUINCHO.z1) / 2]}
          receiveShadow
          material={matPorcelain}
        >
          <boxGeometry args={[QUINCHO.x1 - QUINCHO.x0 + 0.2, 0.05, QUINCHO.z1 - QUINCHO.z0 + 0.2]} />
        </mesh>
        {/* Muro de piedra al fondo + lateral este */}
        <mesh position={[(QUINCHO.x0 + QUINCHO.x1) / 2, 1.35, QUINCHO.z0]} castShadow receiveShadow material={matStone}>
          <boxGeometry args={[QUINCHO.x1 - QUINCHO.x0, 2.7, 0.14]} />
        </mesh>
        <mesh position={[QUINCHO.x1, 1.35, (QUINCHO.z0 + QUINCHO.z1) / 2]} castShadow receiveShadow material={matStone}>
          <boxGeometry args={[0.14, 2.7, QUINCHO.z1 - QUINCHO.z0]} />
        </mesh>
        {/* Postes de acero negro */}
        {[
          [QUINCHO.x0 + 0.1, QUINCHO.z0 + 0.12],
          [QUINCHO.x1 - 0.1, QUINCHO.z0 + 0.12],
          [QUINCHO.x0 + 0.1, QUINCHO.z1 - 0.1],
          [QUINCHO.x1 - 0.1, QUINCHO.z1 - 0.1],
        ].map((p, i) => (
          <mesh key={`qp${i}`} position={[p[0], 1.35, p[1]]} castShadow>
            <boxGeometry args={[0.12, 2.7, 0.12]} />
            <meshStandardMaterial color="#161a1c" roughness={0.35} metalness={0.7} />
          </mesh>
        ))}
        {/* Cielo de listones de madera + cubierta */}
        <mesh position={[(QUINCHO.x0 + QUINCHO.x1) / 2, 2.655, (QUINCHO.z0 + QUINCHO.z1) / 2]} material={matPine}>
          <boxGeometry args={[QUINCHO.x1 - QUINCHO.x0, 0.06, QUINCHO.z1 - QUINCHO.z0]} />
        </mesh>
        {[2.35, 3.2, 4.05, 4.9].map((x, i) => (
          <mesh key={`qb${i}`} position={[x, 2.6, (QUINCHO.z0 + QUINCHO.z1) / 2]} material={matOak}>
            <boxGeometry args={[0.08, 0.09, QUINCHO.z1 - QUINCHO.z0]} />
          </mesh>
        ))}
        <mesh
          position={[(QUINCHO.x0 + QUINCHO.x1) / 2, 2.75, (QUINCHO.z0 + QUINCHO.z1) / 2]}
          castShadow
        >
          <boxGeometry args={[QUINCHO.x1 - QUINCHO.x0 + 0.25, 0.12, QUINCHO.z1 - QUINCHO.z0 + 0.25]} />
          <meshStandardMaterial color="#2b3034" roughness={0.7} metalness={0.15} />
        </mesh>
        {/* Mesón de trabajo contra el muro de piedra */}
        <mesh position={[17.9, 0.45, 2.28]} castShadow>
          <boxGeometry args={[5.6, 0.9, 0.6]} />
          <meshStandardMaterial color="#3a3f43" roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh position={[17.9, 0.92, 2.28]} castShadow>
          <boxGeometry args={[5.7, 0.06, 0.66]} />
          <meshStandardMaterial color="#7b756a" roughness={0.35} metalness={0.05} envMapIntensity={0.8} />
        </mesh>
        {/* Parrilla a gas con rejillas + campana industrial */}
        <mesh position={[18.85, 0.99, 2.28]} castShadow>
          <boxGeometry args={[1.0, 0.14, 0.58]} />
          <meshStandardMaterial color="#a8afb4" roughness={0.3} metalness={0.8} envMapIntensity={1.1} />
        </mesh>
        {[18.45, 18.61, 18.77, 18.93, 19.09, 19.25].map((x, i) => (
          <mesh key={`gr${i}`} position={[x, 1.07, 2.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
            <meshStandardMaterial color="#2b2f32" roughness={0.35} metalness={0.8} />
          </mesh>
        ))}
        <mesh position={[18.85, 1.78, 2.12]} castShadow>
          <boxGeometry args={[1.25, 0.42, 0.55]} />
          <meshStandardMaterial color="#4c5358" roughness={0.32} metalness={0.7} />
        </mesh>
        <mesh position={[18.85, 2.34, 2.12]}>
          <boxGeometry args={[0.42, 0.7, 0.42]} />
          <meshStandardMaterial color="#5b6267" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Horno de barro (domo) */}
        <mesh position={[20.2, 0.98, 2.4]} castShadow>
          <boxGeometry args={[1.0, 0.16, 0.7]} />
          <meshStandardMaterial color="#6c665e" roughness={0.7} />
        </mesh>
        <mesh position={[20.2, 1.06, 2.4]} castShadow>
          <sphereGeometry args={[0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#8a6a52" roughness={0.85} />
        </mesh>
        <mesh position={[20.2, 1.2, 2.9]}>
          <boxGeometry args={[0.34, 0.24, 0.02]} />
          <meshStandardMaterial color="#17110d" roughness={0.9} />
        </mesh>
        {/* Lavaplatos + grifería */}
        <mesh position={[15.95, 0.955, 2.28]}>
          <boxGeometry args={[0.55, 0.02, 0.4]} />
          <meshStandardMaterial color="#2b3033" roughness={0.15} metalness={0.5} />
        </mesh>
        <mesh position={[15.95, 1.1, 2.1]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 10]} />
          <meshStandardMaterial color="#b9bec2" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Repisa con plantas + LED */}
        <mesh position={[16.4, 1.55, 2.03]} material={matPine}>
          <boxGeometry args={[1.2, 0.05, 0.24]} />
        </mesh>
        {[16.1, 16.7].map((x, i) => (
          <group key={`qp${i}`}>
            <mesh position={[x, 1.63, 2.03]} castShadow>
              <cylinderGeometry args={[0.09, 0.07, 0.14, 10]} />
              <meshStandardMaterial color="#8d6a4f" roughness={0.8} />
            </mesh>
            <mesh position={[x, 1.78, 2.03]} castShadow>
              <sphereGeometry args={[0.13, 10, 8]} />
              <meshStandardMaterial color="#3f6a3e" roughness={0.9} />
            </mesh>
          </group>
        ))}
        <mesh position={[17.9, 1.5, 1.99]}>
          <boxGeometry args={[4.4, 0.02, 0.05]} />
          <meshStandardMaterial color="#fff6e0" emissive="#ffd9a0" emissiveIntensity={1.4} />
        </mesh>
        {/* BARRA 3,60 × 1,00 × 1,05 */}
        <mesh position={[17.4, 0.5, 4.45]} castShadow receiveShadow material={matStone}>
          <boxGeometry args={[QUINCHO.bar.x1 - QUINCHO.bar.x0, 1.0, QUINCHO.bar.z1 - QUINCHO.bar.z0]} />
        </mesh>
        <mesh position={[17.4, 1.075, 4.45]} castShadow>
          <boxGeometry args={[3.8, 0.05, 1.1]} />
          <meshStandardMaterial color="#2f3335" roughness={0.18} metalness={0.2} envMapIntensity={1.4} />
        </mesh>
        {/* 5 taburetes de mimbre */}
        {[0, 1, 2, 3, 4].map((i) => {
          const x = 15.95 + i * 0.65;
          return (
            <group key={`qs${i}`}>
              <mesh position={[x, 0.73, 5.42]} castShadow>
                <cylinderGeometry args={[0.19, 0.19, 0.07, 16]} />
                <meshStandardMaterial color="#6d5f4e" roughness={0.9} />
              </mesh>
              <mesh position={[x, 0.94, 5.53]}>
                <boxGeometry args={[0.36, 0.32, 0.05]} />
                <meshStandardMaterial color="#4a4238" roughness={0.85} />
              </mesh>
              {[
                [x - 0.12, 5.3],
                [x + 0.12, 5.3],
                [x - 0.12, 5.54],
                [x + 0.12, 5.54],
              ].map((p, j) => (
                <mesh key={`qleg${j}`} position={[p[0], 0.35, p[1]]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
                  <meshStandardMaterial color="#1b1e20" roughness={0.4} metalness={0.6} />
                </mesh>
              ))}
            </group>
          );
        })}
        {/* Lámparas colgantes (3) */}
        {[16.4, 17.4, 18.4].map((x, i) => (
          <group key={`qpnd${i}`}>
            <mesh position={[x, 2.45, 4.45]}>
              <cylinderGeometry args={[0.008, 0.008, 0.42, 6]} />
              <meshStandardMaterial color="#1b1e20" roughness={0.4} />
            </mesh>
            <mesh position={[x, 2.18, 4.45]}>
              <cylinderGeometry args={[0.11, 0.16, 0.16, 16, 1, true]} />
              <meshStandardMaterial color="#1b1e20" roughness={0.35} metalness={0.4} side={DoubleSide} />
            </mesh>
            <mesh position={[x, 2.1, 4.45]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial color="#fff3d6" emissive="#ffd9a0" emissiveIntensity={2.2} />
            </mesh>
          </group>
        ))}
        {/* Luces cálidas del quincho (2 focos reales) */}
        {QUINCHO_LIGHTS.map(([x, z], i) => (
          <pointLight
            key={`ql${i}`}
            position={[x, 2.05, z]}
            intensity={night ? 2.6 : light === 'sunset' ? 1.7 : 1.1}
            color="#ffd9a0"
            distance={6}
            decay={1.9}
          />
        ))}
        {/* Focos de pared sobre el muro de piedra */}
        {[16.3, 19.5].map((x, i) => (
          <mesh key={`qwall${i}`} position={[x, 2.05, 1.99]}>
            <cylinderGeometry args={[0.05, 0.05, 0.12, 10]} />
            <meshStandardMaterial color="#fff3d6" emissive="#ffd9a0" emissiveIntensity={1.6} />
          </mesh>
        ))}
      </group>


      {/* ── Lámparas de techo + luz fría de día / cálida de noche ── */}
      <mesh position={[7.4, 2.665, 6.27]}>
        <boxGeometry args={[7.6, 0.025, 0.09]} />
        <meshStandardMaterial
          color={night ? '#fff6e0' : '#f2f7ff'}
          emissive={night ? '#ffd9a0' : '#dbeaff'}
          emissiveIntensity={night ? 1.7 : 1.1}
        />
      </mesh>
      {LAMPS.map(([x, z], i) => (
        <group key={`lamp${i}`}>
          <mesh position={[x, 2.63, z]}>
            <cylinderGeometry args={[0.18, 0.18, 0.035, 18]} />
            <meshStandardMaterial
              color="#fdf8ec"
              emissive={night ? '#ffd9a0' : '#dbeaff'}
              emissiveIntensity={night ? 1.6 : 0.55}
              roughness={0.4}
            />
          </mesh>
          <pointLight
            position={[x, 2.5, z]}
            intensity={lampIntensity}
            color={night ? '#ffd9a0' : '#e4eeff'}
            distance={7.5}
            decay={1.8}
          />
        </group>
      ))}

      {/* ── Cámaras CCTV (carcasa + lente + LED de grabación) ── */}
      {CCTV_CAMERAS.map((cam) => (
        <group key={cam.id}>
          {cam.zone === 'Exterior' ? (
            <mesh position={[cam.pos[0], cam.pos[1] / 2, cam.pos[2]]} castShadow>
              <cylinderGeometry args={[0.06, 0.08, cam.pos[1], 10]} />
              <meshStandardMaterial color="#3b4247" roughness={0.6} metalness={0.4} />
            </mesh>
          ) : null}
          <group position={cam.pos} rotation={[0, aimYaw(cam), 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.16, 0.13, 0.26]} />
              <meshStandardMaterial color="#d9d7d0" roughness={0.45} metalness={0.15} />
            </mesh>
            <mesh position={[0, -0.09, 0.02]}>
              <boxGeometry args={[0.12, 0.06, 0.16]} />
              <meshStandardMaterial color="#22282c" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.062, 0.1, 14]} />
              <meshStandardMaterial color="#101418" roughness={0.2} metalness={0.5} envMapIntensity={1.2} />
            </mesh>
            <mesh position={[0.075, 0.075, 0.06]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={2.5} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ── Pinos decorativos ── */}
      {TREES.map((t, i) => (
        <group key={`tr${i}`}>
          <mesh position={[t.x, 0.3 * t.s, t.z]} castShadow>
            <cylinderGeometry args={[0.12 * t.s, 0.16 * t.s, 0.6 * t.s, 8]} />
            <meshStandardMaterial color="#5a4430" roughness={0.9} />
          </mesh>
          <mesh position={[t.x, 0.55 * t.s + 1.4 * t.s, t.z]} castShadow>
            <coneGeometry args={[0.85 * t.s, 2.8 * t.s, 8]} />
            <meshStandardMaterial color="#3f6a3e" roughness={0.92} />
          </mesh>
        </group>
      ))}

      {/* ── Personajes (AnimatedFigure del simulador sísmico) ── */}
      <>
        {NPC_SPOTS.map((s, i) => (
          <AnimatedFigure
            key={i}
            playing
            visualProgress={0}
            shakeIntensity={0}
            index={i === 0 ? 0 : 1}
            houseDoor={s.door}
            config={{ position: s.pos }}
          />
        ))}
      </>

      {/* ── Iluminación global (HDR frío de día, cálido al atardecer) ── */}
      <ambientLight intensity={night ? 0.16 : light === 'sunset' ? 0.36 : 0.48} color={night ? '#24313f' : '#dbe8fa'} />
      <hemisphereLight
        intensity={night ? 0.14 : light === 'sunset' ? 0.45 : 0.72}
        color={night ? '#38506e' : '#d9ecff'}
        groundColor="#6a5a45"
      />
      <directionalLight
        position={[4, 8, -14]}
        intensity={night ? 0.05 : light === 'sunset' ? 0.28 : 0.5}
        color={night ? '#5f7ba8' : '#dcecff'}
      />
      <directionalLight
        castShadow
        position={[7, 17.6, 14.8]}
        intensity={sunIntensity}
        color={sunColor}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      </group>
    </>
  );
}
