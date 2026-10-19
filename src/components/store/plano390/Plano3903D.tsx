'use client';
/*
 * Plano3903D — reconstrucción 3D del plano "Proyecto №390-1" (127 m²).
 * Contrato de datos: src/lib/plano390Data.ts (PLAN, ROOMS, WALLS, NPC_SPOTS).
 * Suelo x→Este 0..14, z→Sur 0..11; z negativo = terraza al norte.
 * Solo geometría y luz: NO toca la cámara ni usa OrbitControls/useThree.
 * Texturas procedurales vía canvas (patrón MetalconInteriorHD), HD en móvil.
 */
import { useMemo } from 'react';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

import { PLAN, ROOMS, WALLS, NPC_SPOTS } from '@/lib/plano390Data';
import type { RoomBox, WallSeg } from '@/lib/plano390Data';
import { AnimatedFigure } from '../monitoring/AnimatedFigure';

/* ── Texturas procedurales (canvas). null si no hay document (SSR). ── */

function makeWoodTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#b78a55';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(92,60,32,${Math.random() * 0.22 + 0.04})`;
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath();
    const y = Math.random() * 256;
    g.moveTo(0, y);
    g.bezierCurveTo(64, y + (Math.random() * 8 - 4), 192, y + (Math.random() * 8 - 4), 256, y);
    g.stroke();
  }
  // juntas de tablón
  g.strokeStyle = 'rgba(60,38,20,.5)';
  g.lineWidth = 2;
  for (const s of [0, 64, 128, 192]) {
    g.beginPath();
    g.moveTo(0, s);
    g.lineTo(256, s);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 2);
  t.colorSpace = SRGBColorSpace;
  return t;
}

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
  // juntas de cerámica cada 64 px
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

function makeDeckTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#a97547';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(70,45,22,${Math.random() * 0.08})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 3, 1.5);
  }
  // juntas verticales de listón cada 32 px
  g.strokeStyle = 'rgba(58,36,18,.55)';
  g.lineWidth = 2;
  for (let s = 0; s <= 256; s += 32) {
    g.beginPath();
    g.moveTo(s, 0);
    g.lineTo(s, 256);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 1);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ── Ayudas tipadas (usan el contrato de tipos del plano) ── */

const WALL_H = PLAN.wallH; // 2,7 m

type WallSize = {
  len: number;
  th: number;
  cx: number;
  cz: number;
  horizontal: boolean;
};

function wallSize(seg: WallSeg): WallSize {
  const horizontal = seg.z0 !== seg.z1;
  const len = horizontal ? Math.abs(seg.x1 - seg.x0) : Math.abs(seg.z1 - seg.z0);
  const th = horizontal ? Math.abs(seg.z1 - seg.z0) : Math.abs(seg.x1 - seg.x0);
  return { len, th, cx: (seg.x0 + seg.x1) / 2, cz: (seg.z0 + seg.z1) / 2, horizontal };
}

function isWood(room: RoomBox): boolean {
  return room.floor === 'wood' || room.floor === 'corridor';
}

/* Techo a dos aguas: caballete a lo largo de x en z = 5,5. */
const RIDGE_Z = 5.5;
const RISE = PLAN.ridgeExtra; // 2,35 m sobre la cota de muro
const EAVE_RUN = RIDGE_Z + 0.4; // 5,9 m horizontales muro→caída del alero
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

export default function Plano3903D({ light }: { light: 'day' | 'sunset' | 'night' }) {
  const wood = useMemo(() => makeWoodTexture(), []);
  const tile = useMemo(() => makeTileTexture(), []);
  const deck = useMemo(() => makeDeckTexture(), []);
  if (!wood || !tile || !deck) return null;

  const sunColor = light === 'night' ? '#8fa6d8' : light === 'sunset' ? '#ffb46e' : '#fff2d9';
  const sunIntensity = light === 'night' ? 0.12 : light === 'sunset' ? 1.4 : 2.2;
  const innerLight = light === 'night' ? 2.5 : 0.8;

  return (
    <group>
      {/* ── Terreno ── */}
      <mesh position={[7, -0.01, 7]} receiveShadow>
        <planeGeometry args={[46, 34]} />
        <meshStandardMaterial color="#5a7d4a" roughness={0.95} />
      </mesh>

      {/* ── Losas de piso por ROOMS ── */}
      {ROOMS.map((room) => (
        <mesh
          key={room.id}
          position={[(room.x0 + room.x1) / 2, 0.03, (room.z0 + room.z1) / 2]}
          receiveShadow
        >
          <boxGeometry args={[room.x1 - room.x0, 0.06, room.z1 - room.z0]} />
          {isWood(room) ? (
            <meshStandardMaterial map={wood} roughness={0.72} metalness={0.04} />
          ) : room.floor === 'tile' ? (
            <meshStandardMaterial map={tile} roughness={0.4} metalness={0.02} />
          ) : (
            <meshStandardMaterial map={deck} roughness={0.8} />
          )}
        </mesh>
      ))}

      {/* ── Muros WALLS (cajas; vanos = saltos entre cajas) ── */}
      {WALLS.map((seg, i) => {
        const { len, th, cx, cz, horizontal } = wallSize(seg);
        if (seg.window) {
          // Vidrio piso→2,1 m + marco metálico fino + cabezal de muro arriba.
          const half = len / 2;
          return (
            <group key={`w${i}`}>
              <mesh position={[cx, 1.05, cz]} rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
                <boxGeometry args={[len, 2.1, th * 0.4]} />
                <meshStandardMaterial
                  color="#9fc7e8"
                  transparent
                  opacity={0.28}
                  metalness={0.1}
                  roughness={0.05}
                />
              </mesh>
              <mesh position={[cx - (half - 0.04), 1.05, cz]}>
                <boxGeometry args={[0.08, 2.1, th]} />
                <meshStandardMaterial color="#22292e" roughness={0.5} />
              </mesh>
              <mesh position={[cx + (half - 0.04), 1.05, cz]}>
                <boxGeometry args={[0.08, 2.1, th]} />
                <meshStandardMaterial color="#22292e" roughness={0.5} />
              </mesh>
              <mesh position={[cx, 2.14, cz]}>
                <boxGeometry args={[len, 0.08, th]} />
                <meshStandardMaterial color="#22292e" roughness={0.5} />
              </mesh>
              <mesh position={[cx, 2.4, cz]} castShadow receiveShadow>
                <boxGeometry args={[len, WALL_H - 2.1, th]} />
                <meshStandardMaterial color={seg.kind === 'ext' ? '#2e3438' : '#e8e2d6'} roughness={0.9} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={`w${i}`} position={[cx, WALL_H / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[len, WALL_H, th]} />
            <meshStandardMaterial color={seg.kind === 'ext' ? '#2e3438' : '#e8e2d6'} roughness={0.9} />
          </mesh>
        );
      })}

      {/* ── Escalón decorativo bajo el paño corredizo de la terraza ── */}
      <mesh position={[(0.25 + 6.4) / 2, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.4 - 0.25, PLAN.stepH, 0.5]} />
        <meshStandardMaterial color="#a97547" roughness={0.8} />
      </mesh>

      {/* ── Cubierta a dos aguas + chimenea + alero sur ── */}
      <mesh position={[7, ROOF_MID_Y, (RIDGE_Z - 0.4) / 2]} rotation={[-ROOF_ANG, 0, 0]} castShadow>
        <boxGeometry args={[15.0, 0.12, SLOPE_LEN]} />
        <meshStandardMaterial color="#2f3b44" roughness={0.85} />
      </mesh>
      <mesh position={[7, ROOF_MID_Y, (RIDGE_Z + 11.4) / 2]} rotation={[ROOF_ANG, 0, 0]} castShadow>
        <boxGeometry args={[15.0, 0.12, SLOPE_LEN]} />
        <meshStandardMaterial color="#2f3b44" roughness={0.85} />
      </mesh>
      <mesh position={[9.8, WALL_H + RISE + 0.3, RIDGE_Z]} castShadow>
        <boxGeometry args={[0.7, 1.6, 0.7]} />
        <meshStandardMaterial color="#23282c" roughness={0.95} />
      </mesh>
      <mesh position={[3.4, 2.78, 10.9]} castShadow>
        <boxGeometry args={[0.16, 0.2, 1.3]} />
        <meshStandardMaterial color="#8a6238" roughness={0.6} />
      </mesh>
      <mesh position={[10.6, 2.78, 10.9]} castShadow>
        <boxGeometry args={[0.16, 0.2, 1.3]} />
        <meshStandardMaterial color="#8a6238" roughness={0.6} />
      </mesh>

      {/* ── Pérgola de la terraza (postes + cubierta translúcida) ── */}
      {[
        [0.4, -0.35],
        [6.1, -0.35],
        [0.4, -2.8],
        [6.1, -2.8],
      ].map((p, i) => (
        <mesh key={`pp${i}`} position={[p[0], 1.25, p[1]]} castShadow>
          <boxGeometry args={[0.12, 2.5, 0.12]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[3.25, 2.56, -1.575]}>
        <boxGeometry args={[6.2, 0.06, 3.2]} />
        <meshStandardMaterial color="#3a4742" transparent opacity={0.55} roughness={0.55} />
      </mesh>

      {/* ── Living: sofá + mesa ratona + alfombra ── */}
      <group>
        <mesh position={[4.2, 0.27, 0.55]} castShadow>
          <boxGeometry args={[2.2, 0.42, 0.95]} />
          <meshStandardMaterial color="#3a4046" roughness={0.85} />
        </mesh>
        <mesh position={[4.2, 0.58, 0.3]} castShadow>
          <boxGeometry args={[2.2, 0.5, 0.18]} />
          <meshStandardMaterial color="#3a4046" roughness={0.85} />
        </mesh>
        <mesh position={[3.73, 0.56, 0.62]} castShadow>
          <boxGeometry args={[1.02, 0.16, 0.68]} />
          <meshStandardMaterial color="#f0e8da" roughness={0.9} />
        </mesh>
        <mesh position={[4.67, 0.56, 0.62]} castShadow>
          <boxGeometry args={[1.02, 0.16, 0.68]} />
          <meshStandardMaterial color="#f0e8da" roughness={0.9} />
        </mesh>
        <mesh position={[4.2, 0.067, 2.4]} receiveShadow>
          <boxGeometry args={[3.4, 0.014, 2.2]} />
          <meshStandardMaterial color="#7d5a4a" roughness={0.95} />
        </mesh>
        <mesh position={[4.2, 0.28, 2.6]} castShadow>
          <boxGeometry args={[1.1, 0.42, 0.55]} />
          <meshStandardMaterial color="#5a4430" roughness={0.6} />
        </mesh>
      </group>

      {/* ── Comedor: mesa + 6 bancas cilíndricas ── */}
      <group>
        <mesh position={[2.4, 0.78, 3.6]} castShadow>
          <boxGeometry args={[2.0, 0.06, 0.9]} />
          <meshStandardMaterial color="#b78a55" roughness={0.55} />
        </mesh>
        {[
          [1.5, 3.28],
          [3.3, 3.28],
          [1.5, 3.92],
          [3.3, 3.92],
          [1.2, 3.6],
          [3.6, 3.6],
        ].map((p, i) => (
          <mesh key={`st${i}`} position={[p[0], 0.285, p[1]]} castShadow>
            <cylinderGeometry args={[0.2, 0.24, 0.45, 12]} />
            <meshStandardMaterial color="#6b4a2a" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* ── Cocina: isla + encimeras ── */}
      <group>
        <mesh position={[1.8, 0.47, 1.9]} castShadow>
          <boxGeometry args={[2.2, 0.82, 0.9]} />
          <meshStandardMaterial color="#23282c" roughness={0.7} />
        </mesh>
        <mesh position={[1.8, 0.91, 1.9]} castShadow>
          <boxGeometry args={[2.4, 0.06, 1.0]} />
          <meshStandardMaterial color="#d9d2c6" roughness={0.35} />
        </mesh>
        <mesh position={[0.55, 0.47, 1.85]} castShadow>
          <boxGeometry args={[0.4, 0.82, 2.7]} />
          <meshStandardMaterial color="#23282c" roughness={0.7} />
        </mesh>
        <mesh position={[0.55, 0.91, 1.85]} castShadow>
          <boxGeometry args={[0.5, 0.06, 2.9]} />
          <meshStandardMaterial color="#d9d2c6" roughness={0.35} />
        </mesh>
      </group>

      {/* ── Dormitorio principal (7): cama al muro S, ventana al N ── */}
      <group>
        <mesh position={[12.4, 0.9, 5.4]} castShadow>
          <boxGeometry args={[1.9, 1.2, 0.12]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
        </mesh>
        <mesh position={[12.4, 0.19, 4.3]} castShadow>
          <boxGeometry args={[1.8, 0.26, 2.05]} />
          <meshStandardMaterial color="#b08a55" roughness={0.7} />
        </mesh>
        <mesh position={[12.4, 0.47, 4.3]} castShadow>
          <boxGeometry args={[1.8, 0.35, 2.0]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.9} />
        </mesh>
        <mesh position={[12.4, 0.68, 4.05]} castShadow>
          <boxGeometry args={[1.8, 0.08, 1.3]} />
          <meshStandardMaterial color="#7d5a4a" roughness={0.95} />
        </mesh>
        <mesh position={[12.0, 0.71, 5.05]} castShadow>
          <boxGeometry args={[0.6, 0.14, 0.35]} />
          <meshStandardMaterial color="#f0e8da" roughness={0.95} />
        </mesh>
        <mesh position={[12.8, 0.71, 5.05]} castShadow>
          <boxGeometry args={[0.6, 0.14, 0.35]} />
          <meshStandardMaterial color="#f0e8da" roughness={0.95} />
        </mesh>
        <mesh position={[11.35, 0.31, 4.9]} castShadow>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
        </mesh>
        <mesh position={[13.45, 0.31, 4.9]} castShadow>
          <boxGeometry args={[0.45, 0.5, 0.45]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
        </mesh>
      </group>

      {/* ── Dormitorio 2 (x≈8.3) y Dormitorio 3 (x≈12.1), cabezal al muro S ── */}
      {[
        { x: 8.3, nx1: 7.1, nx2: 9.5 },
        { x: 12.1, nx1: 10.9, nx2: 13.3 },
      ].map((b, i) => (
        <group key={`bed${i}`}>
          <mesh position={[b.x, 0.9, 10.62]} castShadow>
            <boxGeometry args={[1.9, 1.2, 0.12]} />
            <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
          </mesh>
          <mesh position={[b.x, 0.19, 9.5]} castShadow>
            <boxGeometry args={[1.8, 0.26, 2.05]} />
            <meshStandardMaterial color="#b08a55" roughness={0.7} />
          </mesh>
          <mesh position={[b.x, 0.47, 9.5]} castShadow>
            <boxGeometry args={[1.8, 0.35, 2.0]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.9} />
          </mesh>
          <mesh position={[b.x, 0.68, 9.25]} castShadow>
            <boxGeometry args={[1.8, 0.08, 1.3]} />
            <meshStandardMaterial color="#7d5a4a" roughness={0.95} />
          </mesh>
          <mesh position={[b.x - 0.4, 0.71, 10.27]} castShadow>
            <boxGeometry args={[0.6, 0.14, 0.35]} />
            <meshStandardMaterial color="#f0e8da" roughness={0.95} />
          </mesh>
          <mesh position={[b.x + 0.4, 0.71, 10.27]} castShadow>
            <boxGeometry args={[0.6, 0.14, 0.35]} />
            <meshStandardMaterial color="#f0e8da" roughness={0.95} />
          </mesh>
          <mesh position={[b.nx1, 0.31, 10.4]} castShadow>
            <boxGeometry args={[0.45, 0.5, 0.45]} />
            <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
          </mesh>
          <mesh position={[b.nx2, 0.31, 10.4]} castShadow>
            <boxGeometry args={[0.45, 0.5, 0.45]} />
            <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* ── Clóset (8): módulo con 5 barras verticales ── */}
      {CLOSET_BARS.map((p, i) => (
        <mesh key={`cb${i}`} position={[p[0], p[1], p[2]]} castShadow>
          <boxGeometry args={[0.05, 2.0, 0.05]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[12.7, 2.03, 6.7]} castShadow>
        <boxGeometry args={[1.7, 0.06, 0.4]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
      </mesh>

      {/* ── Baño (9): WC, lavamanos, cabina de vidrio ── */}
      <group>
        <mesh position={[8.8, 0.2, 0.6]} castShadow>
          <cylinderGeometry args={[0.24, 0.28, 0.4, 16]} />
          <meshStandardMaterial color="#f2efe8" roughness={0.3} />
        </mesh>
        <mesh position={[8.8, 0.5, 0.38]} castShadow>
          <boxGeometry args={[0.42, 0.55, 0.16]} />
          <meshStandardMaterial color="#f2efe8" roughness={0.3} />
        </mesh>
        <mesh position={[8.8, 0.42, 0.66]} castShadow>
          <boxGeometry args={[0.5, 0.07, 0.42]} />
          <meshStandardMaterial color="#ffffff" roughness={0.25} />
        </mesh>
        <mesh position={[9.9, 0.4, 0.5]} castShadow>
          <boxGeometry args={[0.5, 0.35, 0.4]} />
          <meshStandardMaterial color="#e8e2d6" roughness={0.35} />
        </mesh>
        <mesh position={[10.625, 1.0, 0.9]}>
          <boxGeometry args={[0.45, 2.0, 1.0]} />
          <meshStandardMaterial color="#9fc7e8" transparent opacity={0.25} roughness={0.05} metalness={0.1} />
        </mesh>
      </group>

      {/* ── Sauna (10): 3 gradas escalonadas en pared E + calentador ── */}
      <group>
        <mesh position={[9.85, 0.14, 3.7]} castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.28, 2.1]} />
          <meshStandardMaterial color="#c79b64" roughness={0.8} />
        </mesh>
        <mesh position={[10.3, 0.28, 3.7]} castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.56, 2.1]} />
          <meshStandardMaterial color="#c79b64" roughness={0.8} />
        </mesh>
        <mesh position={[10.72, 0.42, 3.7]} castShadow receiveShadow>
          <boxGeometry args={[0.45, 0.84, 2.1]} />
          <meshStandardMaterial color="#c79b64" roughness={0.8} />
        </mesh>
        <mesh position={[8.78, 0.3, 3.5]} castShadow>
          <boxGeometry args={[0.4, 0.6, 0.5]} />
          <meshStandardMaterial color="#33383c" roughness={0.6} />
        </mesh>
        <mesh position={[8.78, 0.18, 3.5]}>
          <boxGeometry args={[0.42, 0.07, 0.52]} />
          <meshStandardMaterial color="#8a8f94" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[8.78, 0.42, 3.5]}>
          <boxGeometry args={[0.42, 0.07, 0.52]} />
          <meshStandardMaterial color="#8a8f94" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* ── Recibidor: banqueta + perchero junto a la puerta principal ── */}
      <group>
        <mesh position={[5.6, 0.27, 10.05]} castShadow>
          <boxGeometry args={[1.4, 0.42, 0.4]} />
          <meshStandardMaterial color="#a97547" roughness={0.7} />
        </mesh>
        <mesh position={[4.6, 0.96, 10.3]} castShadow>
          <cylinderGeometry args={[0.05, 0.07, 1.8, 8]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
        </mesh>
        <mesh position={[4.6, 1.62, 10.3]} castShadow>
          <boxGeometry args={[0.55, 0.05, 0.05]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
        </mesh>
        <mesh position={[4.6, 1.62, 10.3]} rotation={[0, Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[0.55, 0.05, 0.05]} />
          <meshStandardMaterial color="#6b4a2a" roughness={0.65} />
        </mesh>
      </group>

      {/* ── Pinos decorativos alrededor ── */}
      {TREES.map((t, i) => (
        <group key={`tr${i}`}>
          <mesh position={[t.x, 0.3 * t.s, t.z]} castShadow>
            <cylinderGeometry args={[0.12 * t.s, 0.16 * t.s, 0.6 * t.s, 8]} />
            <meshStandardMaterial color="#5a4430" roughness={0.9} />
          </mesh>
          <mesh position={[t.x, 0.55 * t.s + 1.4 * t.s, t.z]} castShadow>
            <coneGeometry args={[0.85 * t.s, 2.8 * t.s, 8]} />
            <meshStandardMaterial color="#3f6a3e" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ── Personajes del simulador sísmico (AnimatedFigure) ── */}
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

      {/* ── Iluminación ── */}
      <ambientLight intensity={light === 'night' ? 0.16 : 0.5} color={light === 'night' ? '#24313f' : '#cfe3ff'} />
      <directionalLight
        castShadow
        position={[7, 17.6, 14.8]}
        intensity={sunIntensity}
        color={sunColor}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />
      <pointLight position={[3.2, 2.35, 2.6]} intensity={innerLight} color="#ffd9a0" distance={9} decay={1.7} />
      <pointLight position={[11.2, 2.35, 6.2]} intensity={innerLight} color="#ffd9a0" distance={9} decay={1.7} />
    </group>
  );
}
