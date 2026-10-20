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
import { CanvasTexture, PMREMGenerator, RepeatWrapping, SRGBColorSpace } from 'three';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { PLAN, ROOMS, WALLS, NPC_SPOTS, CCTV_CAMERAS } from '@/lib/plano390Data';
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

/* ── Entorno de estudio (reflejos PBR realistas) ── */

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
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
  { x: 16.1, z: 4.2, s: 1.05 },
  { x: 16.5, z: 12.2, s: 0.85 },
  { x: 16.0, z: -1.6, s: 0.9 },
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
  [2.6, 2.3],
  [6.2, 3.9],
  [8.6, 6.2],
  [8.3, 8.9],
  [12.1, 8.9],
  [12.4, 2.6],
];

/* ── Escena ── */

export default function Plano3903D({ light }: { light: 'day' | 'sunset' | 'night' }) {
  const textures = useViewerTextures();
  const oak = usePbrMaps('woodOak');
  const pine = usePbrMaps('woodPine');
  const tileCanvas = useMemo(() => makeTileTexture(), []);

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

  if (!tileCanvas) return null;

  const night = light === 'night';
  const bg = night ? '#0b1524' : light === 'sunset' ? '#f3c9a0' : '#cfe0ea';
  const sunColor = night ? '#8fa6d8' : light === 'sunset' ? '#ffb46e' : '#fff0d8';
  const sunIntensity = night ? 0.18 : light === 'sunset' ? 2.1 : 2.7;
  const lampIntensity = night ? 2.4 : light === 'sunset' ? 1.1 : 0.5;

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
          material={isWood(room) ? matWood : room.floor === 'tile' ? matTile : matDeck}
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
        <mesh position={[4.2, 0.067, 2.4]} receiveShadow>
          <boxGeometry args={[3.4, 0.014, 2.2]} />
          <meshStandardMaterial color="#7d5a4a" roughness={0.98} />
        </mesh>
        <mesh position={[4.2, 0.28, 2.6]} castShadow material={matOak}>
          <boxGeometry args={[1.1, 0.42, 0.55]} />
        </mesh>
      </group>

      {/* ── Comedor: mesa + 6 bancas cilíndricas ── */}
      <group>
        <mesh position={[2.4, 0.78, 3.6]} castShadow material={matOak}>
          <boxGeometry args={[2.0, 0.06, 0.9]} />
        </mesh>
        {[
          [1.5, 3.28],
          [3.3, 3.28],
          [1.5, 3.92],
          [3.3, 3.92],
          [1.2, 3.6],
          [3.6, 3.6],
        ].map((p, i) => (
          <mesh key={`st${i}`} position={[p[0], 0.285, p[1]]} castShadow material={matPine}>
            <cylinderGeometry args={[0.2, 0.24, 0.45, 12]} />
          </mesh>
        ))}
      </group>

      {/* ── Cocina: isla + encimeras ── */}
      <group>
        <mesh position={[1.8, 0.47, 1.9]} castShadow>
          <boxGeometry args={[2.2, 0.82, 0.9]} />
          <meshStandardMaterial color="#23282c" roughness={0.55} metalness={0.15} />
        </mesh>
        <mesh position={[1.8, 0.91, 1.9]} castShadow>
          <boxGeometry args={[2.4, 0.06, 1.0]} />
          <meshStandardMaterial color="#d9d2c6" roughness={0.22} metalness={0.05} envMapIntensity={0.9} />
        </mesh>
        <mesh position={[0.55, 0.47, 1.85]} castShadow>
          <boxGeometry args={[0.4, 0.82, 2.7]} />
          <meshStandardMaterial color="#23282c" roughness={0.55} metalness={0.15} />
        </mesh>
        <mesh position={[0.55, 0.91, 1.85]} castShadow>
          <boxGeometry args={[0.5, 0.06, 2.9]} />
          <meshStandardMaterial color="#d9d2c6" roughness={0.22} metalness={0.05} envMapIntensity={0.9} />
        </mesh>
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

      {/* ── Lámparas de techo + luz cálida por estancia ── */}
      {LAMPS.map(([x, z], i) => (
        <group key={`lamp${i}`}>
          <mesh position={[x, 2.63, z]}>
            <cylinderGeometry args={[0.18, 0.18, 0.035, 18]} />
            <meshStandardMaterial
              color="#fdf8ec"
              emissive="#ffd9a0"
              emissiveIntensity={night ? 1.6 : 0.32}
              roughness={0.4}
            />
          </mesh>
          <pointLight
            position={[x, 2.5, z]}
            intensity={lampIntensity}
            color="#ffd9a0"
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

      {/* ── Iluminación global ── */}
      <ambientLight intensity={night ? 0.14 : light === 'sunset' ? 0.32 : 0.38} color={night ? '#24313f' : '#cfe3ff'} />
      <hemisphereLight
        intensity={night ? 0.12 : light === 'sunset' ? 0.4 : 0.6}
        color={night ? '#38506e' : '#cfe6ff'}
        groundColor="#6a5a45"
      />
      <directionalLight
        castShadow
        position={[7, 17.6, 14.8]}
        intensity={sunIntensity}
        color={sunColor}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={64}
        shadow-bias={-0.0004}
      />
      </group>
    </>
  );
}
