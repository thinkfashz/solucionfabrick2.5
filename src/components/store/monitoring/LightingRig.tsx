'use client';
import { Sky } from '@react-three/drei';

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

export default function LightingRig({ config }: { config: LightConfig }) {
  const preset = LIGHT_PRESETS[config.preset];
  return (
    <>
      <color attach="background" args={[preset.bg]} />
      <Sky distance={450000} sunPosition={config.sunPosition} turbidity={preset.turbidity} rayleigh={preset.rayleigh} />
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
