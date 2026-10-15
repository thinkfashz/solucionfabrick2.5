'use client';

import { useMemo } from 'react';
import { AdditiveBlending, BackSide, CanvasTexture } from 'three';
import { createGlowTexture, createSkyTexture, type SkyPalette } from './proceduralTextures';

/**
 * Iluminación del comparador sísmico.
 *
 * El cielo es un skybox procedural (esfera con textura de <canvas>: gradiente
 * + nubes fbm + estrellas), porque el `<Sky>` de drei quedaba recortado por el
 * plano lejano de la cámara y dejaba el fondo plano/lavado. Cada preset
 * define además su niebla, sincronizada con el color del horizonte para que
 * el borde del suelo nunca se vea: el terreno se funde con el cielo.
 */

export type LightPresetId = 'day' | 'dusk' | 'night';

export type LightConfig = {
  preset: LightPresetId;
  sunPosition: [number, number, number];
  azimuthDeg: number;
  elevationDeg: number;
  ambientIntensity: number;
  sunIntensity: number;
  pointIntensity: number;
  shadows: boolean;
};

type LightPreset = {
  label: string;
  sunPosition: [number, number, number];
  azimuthDeg: number;
  elevationDeg: number;
  sunIntensity: number;
  ambientIntensity: number;
  pointIntensity: number;
  turbidity: number;
  rayleigh: number;
  sky: string;
  bg: string;
  hemiSky: string;
  hemiGround: string;
  pointColor: string;
  fillColor: string;
  fogNear: number;
  fogFar: number;
};

export const LIGHT_PRESETS: Record<LightPresetId, LightPreset> = {
  day: {
    label: 'Día',
    sunPosition: [45, 42, 28],
    azimuthDeg: 58.1,
    elevationDeg: 38.4,
    sunIntensity: 2.3,
    ambientIntensity: 0.55,
    pointIntensity: 0.4,
    turbidity: 4,
    rayleigh: 1.8,
    sky: '#e0f0ff',
    bg: '#7aadd4',
    hemiSky: '#e0f0ff',
    hemiGround: '#4a3520',
    pointColor: '#ffe8c0',
    fillColor: '#b8d4f0',
    // la niebla arranca pasado el escenario (radio ≈ 30) y satura antes del
    // borde del terreno lejano: el horizonte queda continuo
    fogNear: 45,
    fogFar: 150,
  },
  dusk: {
    label: 'Atardecer',
    sunPosition: [60, 12, 10],
    azimuthDeg: 80.5,
    elevationDeg: 11.2,
    sunIntensity: 1.4,
    ambientIntensity: 0.32,
    pointIntensity: 1.2,
    turbidity: 10,
    rayleigh: 3,
    sky: '#f0b48a',
    bg: '#c97b4e',
    hemiSky: '#f5c9a0',
    hemiGround: '#3a2418',
    pointColor: '#ffb46a',
    fillColor: '#e0a070',
    fogNear: 40,
    fogFar: 145,
  },
  night: {
    label: 'Noche',
    sunPosition: [-20, 8, -30],
    azimuthDeg: -146.3,
    elevationDeg: 12.5,
    sunIntensity: 0.35,
    ambientIntensity: 0.16,
    pointIntensity: 2.4,
    turbidity: 1.2,
    rayleigh: 0.3,
    sky: '#1c2c4a',
    bg: '#0b1526',
    hemiSky: '#1c2c4a',
    hemiGround: '#0c0a08',
    pointColor: '#cfe0ff',
    fillColor: '#5a7ab0',
    fogNear: 35,
    fogFar: 135,
  },
};

/** Paleta de cielo por preset: `horizon` es además el color de la niebla. */
export const SKY_PALETTES: Record<LightPresetId, SkyPalette> = {
  day: {
    zenith: '#2f6fc0',
    horizon: '#c6dcee',
    below: '#93b6d2',
    cloudLit: '#ffffff',
    cloudShadow: '#a7bed6',
    cloudCover: 0.58,
    stars: false,
    sunColor: '#fff3d6',
    sunSize: 82,
  },
  dusk: {
    zenith: '#2b3f74',
    horizon: '#efa675',
    below: '#8f6d63',
    cloudLit: '#ffd7a6',
    cloudShadow: '#8c6478',
    cloudCover: 0.62,
    stars: false,
    sunColor: '#ffb264',
    sunSize: 108,
  },
  night: {
    zenith: '#060d1e',
    horizon: '#16273f',
    below: '#0a1120',
    cloudLit: '#43566f',
    cloudShadow: '#0d1524',
    cloudCover: 0.38,
    stars: true,
    sunColor: '#cfe0ff',
    sunSize: 54,
  },
};

export function defaultLightConfig(): LightConfig {
  return applyLightPreset('day');
}

export function applyLightPreset(id: LightPresetId, keepShadows = true): LightConfig {
  const p = LIGHT_PRESETS[id];
  return {
    preset: id,
    sunPosition: [...p.sunPosition] as [number, number, number],
    azimuthDeg: p.azimuthDeg,
    elevationDeg: p.elevationDeg,
    ambientIntensity: p.ambientIntensity,
    sunIntensity: p.sunIntensity,
    pointIntensity: p.pointIntensity,
    shadows: keepShadows,
  };
}

export function sunPositionFrom(azimuthDeg: number, elevationDeg: number, distance: number): [number, number, number] {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return [
    distance * Math.cos(el) * Math.sin(az),
    distance * Math.sin(el),
    distance * Math.cos(el) * Math.cos(az),
  ];
}

export function sunDistance(pos: [number, number, number]): number {
  const d = Math.hypot(pos[0], pos[1], pos[2]);
  return d > 1 ? d : 60;
}

// ---------------------------------------------------------------------------
// Skybox procedural
// ---------------------------------------------------------------------------

const SKY_RADIUS = 450; // dentro del plano lejano de la cámara (se ve en el shell)

// Un skybox por preset (se genera una vez y se reutiliza al volver).
const skyCache = new Map<LightPresetId, CanvasTexture | null>();
function skyTextureFor(id: LightPresetId): CanvasTexture | null {
  if (!skyCache.has(id)) skyCache.set(id, createSkyTexture(SKY_PALETTES[id]));
  return skyCache.get(id) ?? null;
}

const glowCache = new Map<string, CanvasTexture | null>();
function glowTextureFor(color: string): CanvasTexture | null {
  if (!glowCache.has(color)) glowCache.set(color, createGlowTexture(color));
  return glowCache.get(color) ?? null;
}

/**
 * Cúpula celeste: esfera de radio 450 vista por dentro (BackSide) con la
 * textura procedural. Sin niebla y sin tonemapping para que los colores
 * pintados en el canvas sean exactamente los que se ven.
 */
function ProceduralSky({ preset }: { preset: LightPresetId }) {
  const texture = useMemo(() => skyTextureFor(preset), [preset]);
  return (
    <mesh renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[SKY_RADIUS, 48, 32]} />
      <meshBasicMaterial
        map={texture ?? undefined}
        color={texture ? '#ffffff' : LIGHT_PRESETS[preset].bg}
        side={BackSide}
        fog={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Sol / luna: sprite con halo que sigue la posición del sol configurada en el
 * panel (la textura del cielo solo cambia de preset).
 */
function SunSprite({
  color,
  size,
  position,
}: {
  color: string;
  size: number;
  position: [number, number, number];
}) {
  const texture = useMemo(() => glowTextureFor(color), [color]);
  const p = useMemo<[number, number, number]>(() => {
    const len = Math.hypot(position[0], position[1], position[2]) || 1;
    const k = (SKY_RADIUS * 0.86) / len;
    return [position[0] * k, position[1] * k, position[2] * k];
  }, [position]);
  if (!texture) return null;
  return (
    <sprite position={p} scale={[size, size, 1]} renderOrder={-1} frustumCulled={false}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        fog={false}
        toneMapped={false}
        blending={AdditiveBlending}
      />
    </sprite>
  );
}

export default function LightingRig({ config }: { config: LightConfig }) {
  const preset = LIGHT_PRESETS[config.preset];
  const palette = SKY_PALETTES[config.preset];
  return (
    <>
      {/* color de respaldo por si algo no dibuja el skybox */}
      <color attach="background" args={[preset.bg]} />
      {/* niebla sincronizada con el horizonte: el borde del suelo no se ve */}
      <fog attach="fog" args={[palette.horizon, preset.fogNear, preset.fogFar]} />
      <ProceduralSky preset={config.preset} />
      <SunSprite color={palette.sunColor} size={palette.sunSize} position={config.sunPosition} />
      <ambientLight intensity={config.ambientIntensity} />
      <hemisphereLight args={[preset.hemiSky, preset.hemiGround, config.ambientIntensity * 1.05]} />
      <directionalLight
        position={config.sunPosition}
        intensity={config.sunIntensity}
        castShadow={config.shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-30, 25, -15]} intensity={config.sunIntensity * 0.26} color={preset.fillColor} />
      <pointLight position={[0, 8, 0]} intensity={config.pointIntensity} color={preset.pointColor} distance={config.preset === 'night' ? 35 : 25} />
    </>
  );
}
