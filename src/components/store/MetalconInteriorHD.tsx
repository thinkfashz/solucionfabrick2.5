'use client';
/*
 * MetalconInteriorHD — capas de forrado interior con texturas procedurales:
 * • Piso de madera (CanvasTexture con vetas) sobre la plataforma
 * • Vulcanita/gypsum en las 4 paredes interiores más cielo de paneles
 * • Zócalo perimetral + 2 lámparas cálidas con luz real (pointLight)
 * Todo se genera en cliente con canvas: sin descargas extra, HD en móvil.
 */
import { useMemo } from 'react';
import { CanvasTexture, DoubleSide } from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';
import type { MetalconLightMode } from './metalconLabData';

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
  return t;
}

function makePlasterTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#eae3d6';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const v = Math.random() * 0.09;
    g.fillStyle = `rgba(80,72,60,${v})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
  }
  // junta de paños de vulcanita
  g.strokeStyle = 'rgba(120,112,98,.35)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(85, 0);
  g.lineTo(85, 256);
  g.moveTo(170, 0);
  g.lineTo(170, 256);
  g.stroke();
  const t = new CanvasTexture(c);
  return t;
}

export default function MetalconInteriorHD({ preset, light }: { preset: MetalconHousePreset; light: MetalconLightMode }) {
  const wood = useMemo(() => makeWoodTexture(), []);
  const plaster = useMemo(() => makePlasterTexture(), []);
  if (!wood || !plaster) return null;
  const w = Math.max(4.8, preset.widthM - 0.2);
  const d = Math.max(4.2, preset.depthM - 0.2);
  const h = preset.heightM - 0.08;
  const warm = light === 'night' ? 2.4 : light === 'sunset' ? 1.7 : 1.05;

  return (
    <group>
      {/* Piso de madera */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={wood} roughness={0.72} metalness={0.04} />
      </mesh>
      {/* Vulcanita • paredes interiores (4 caras) */}
      <mesh position={[0, h / 2, d / 2 - 0.045]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={plaster} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[0, h / 2, -d / 2 + 0.045]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={plaster} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[-w / 2 + 0.045, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={plaster} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={[w / 2 - 0.045, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial map={plaster} roughness={0.9} side={DoubleSide} />
      </mesh>
      {/* Zócalo perimetral */}
      <mesh position={[0, 0.07, d / 2 - 0.03]}>
        <boxGeometry args={[w, 0.14, 0.02]} />
        <meshStandardMaterial color="#8a6238" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.07, -d / 2 + 0.03]}>
        <boxGeometry args={[w, 0.14, 0.02]} />
        <meshStandardMaterial color="#8a6238" roughness={0.55} />
      </mesh>
      <mesh position={[-w / 2 + 0.03, 0.07, 0]}>
        <boxGeometry args={[0.02, 0.14, d]} />
        <meshStandardMaterial color="#8a6238" roughness={0.55} />
      </mesh>
      <mesh position={[w / 2 - 0.03, 0.07, 0]}>
        <boxGeometry args={[0.02, 0.14, d]} />
        <meshStandardMaterial color="#8a6238" roughness={0.55} />
      </mesh>
      {/* Lámparas interiores (ventilador de plafón + pendiente cocina) */}
      <group position={[0, h - 0.08, -d * 0.18]}>
        <mesh><cylinderGeometry args={[0.16, 0.16, 0.05, 24]} /><meshStandardMaterial color="#111418" /></mesh>
        <mesh position={[0, -0.035, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.01, 24]} />
          <meshStandardMaterial color="#fff4dc" emissive="#ffe4b0" emissiveIntensity={light === 'night' ? 1.6 : 0.7} />
        </mesh>
        <pointLight position={[0, -0.12, 0]} intensity={warm} color="#ffd9a0" distance={7.5} decay={1.7} />
      </group>
      <group position={[0, h - 0.06, d * 0.24]}>
        <mesh><cylinderGeometry args={[0.12, 0.12, 0.04, 18]} /><meshStandardMaterial color="#111418" /></mesh>
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.01, 18]} />
          <meshStandardMaterial color="#fff4dc" emissive="#ffe4b0" emissiveIntensity={light === 'night' ? 1.6 : 0.7} />
        </mesh>
        <pointLight position={[0, -0.1, 0]} intensity={warm * 0.85} color="#ffd9a0" distance={6} decay={1.7} />
      </group>
    </group>
  );
}
