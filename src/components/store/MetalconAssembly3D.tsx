'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DoubleSide, Quaternion, Vector3 } from 'three';
import type { Group } from 'three';
import {
  clearWallIntervals,
  regularStudOffsets,
  wallLengthM,
  wallMidpoint,
  wallYawRad,
  type MetalconAssemblyOpening,
  type MetalconAssemblyWall,
  type MetalconHousePreset,
} from '@/lib/metalconAssembly';
import type { StructuralSystem } from './ConstructionSystems3D';
import { clipIntervals, smoothstep01, wallCutSegments, wallLocalOpenings, type WallOpeningSlice } from './metalconOpeningGeometry';
import { useTextureMaterial, useViewerTextures, usePbrMaps } from './monitoring/useViewerTextures';

export type MetalconAssemblyDisplayMode = 'mesh' | 'dimensions' | 'openings' | 'bracing' | 'layers';

export type MetalconSeismicVisual = {
  active: boolean;
  progress: number;
  amplitude: number;
  frequencyHz: number;
  directionDeg: number;
  panelScores: Record<string, number>;
  showDamage: boolean;
  showSupports: boolean;
};

type AssemblyProps = {
  preset: MetalconHousePreset;
  spacingCm: 40 | 60;
  profileDepthMm: number;
  displayMode?: MetalconAssemblyDisplayMode;
  selectedWallId?: string | null;
  onSelectWall?: (wallId: string) => void;
  isolateSelected?: boolean;
  assemblyProgress?: number | null;
  /** Cierre del muro (0 = solo estructura, 1 = muro terminado). Independiente de `assemblyProgress`. */
  layerProgress?: number | null;
  seismic?: MetalconSeismicVisual;
  structuralSystem?: StructuralSystem;
  showRoof?: boolean;
};

/** Orden real de cierre del muro: de afuera hacia adentro y termina en el siding. */
export const METALCON_LAYER_PHASES = {
  osb: [0, 0.18],
  membrane: [0.16, 0.34],
  battens: [0.3, 0.48],
  insulation: [0.44, 0.64],
  gypsum: [0.6, 0.8],
  siding: [0.76, 1],
} as const;

const STEEL = '#d9e0e6';
const STEEL_DARK = '#aeb8c1';
const YELLOW = '#FFE600';
const CYAN = '#57D4FF';
const GREEN = '#45e08a';

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function phase(progress: number | null | undefined, start: number, end: number) {
  if (progress == null) return 1;
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

function scoreColor(score: number) {
  if (score >= 0.78) return '#ff3347';
  if (score >= 0.58) return '#ff8b32';
  if (score >= 0.4) return '#f5d75b';
  return STEEL;
}

export function MetalconAssembly3D({
  preset,
  spacingCm,
  profileDepthMm,
  displayMode = 'mesh',
  selectedWallId = null,
  onSelectWall,
  isolateSelected = false,
  assemblyProgress = null,
  layerProgress = null,
  seismic,
  structuralSystem = 'metalcon',
  showRoof = true,
}: AssemblyProps) {
  const assembly = useRef<Group>(null);
  const spacingM = spacingCm / 100;
  const scale = Math.min(1, 8.4 / Math.max(preset.widthM, preset.depthM + (preset.terraceDepthM ?? 0)));
  const roofOpacity = phase(assemblyProgress, 0.72, 1);

  useFrame(({ clock }, delta) => {
    if (!assembly.current) return;
    const response = seismic?.active ? smoothstep01((seismic.progress - 0.43) / 0.24) * smoothstep01((0.92 - seismic.progress) / 0.12) : 0;
    const direction = ((seismic?.directionDeg ?? 0) * Math.PI) / 180;
    const frequency = Math.max(0.8, (seismic?.frequencyHz ?? 2.4) * Math.PI * 2);
    const wave = Math.sin(clock.elapsedTime * frequency) * (seismic?.amplitude ?? 0) * response;
    const targetX = Math.cos(direction) * wave;
    const targetZ = Math.sin(direction) * wave;
    const targetRotZ = Math.cos(direction) * wave * 0.06;
    const targetRotX = -Math.sin(direction) * wave * 0.06;
    const lerp = Math.min(1, delta * 14);
    assembly.current.position.x += (targetX - assembly.current.position.x) * lerp;
    assembly.current.position.z += (targetZ - assembly.current.position.z) * lerp;
    assembly.current.rotation.z += (targetRotZ - assembly.current.rotation.z) * lerp;
    assembly.current.rotation.x += (targetRotX - assembly.current.rotation.x) * lerp;
  });

  const damageScore = seismic?.panelScores ? Object.values(seismic.panelScores).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(seismic.panelScores).length) : 0;

  return (
    <group scale={scale}>
      <group ref={assembly}>
        <Foundation preset={preset} />
        {preset.walls.map((currentWall) => {
          if (isolateSelected && selectedWallId && currentWall.id !== selectedWallId) return null;
          return (
            <WallPanel3D
              key={currentWall.id}
              wall={currentWall}
              preset={preset}
              spacingM={spacingM}
              profileDepthMm={profileDepthMm}
              displayMode={displayMode}
              selected={currentWall.id === selectedWallId}
              onSelect={() => onSelectWall?.(currentWall.id)}
              assemblyProgress={assemblyProgress}
              layerProgress={layerProgress}
              damageScore={seismic?.panelScores[currentWall.id] ?? 0}
              showDamage={Boolean(seismic?.showDamage && seismic.progress > 0.62)}
              showSupports={Boolean(seismic?.showSupports)}
              structuralSystem={structuralSystem}
            />
          );
        })}
        {showRoof ? (
          <SteelRoofStructure
            preset={preset}
            opacity={roofOpacity}
            damageScore={damageScore}
            showDamage={Boolean(seismic?.showDamage && seismic.progress > 0.62)}
          />
        ) : null}
      </group>
      {displayMode === 'dimensions' ? <FootprintDimensions preset={preset} /> : null}
    </group>
  );
}

function Foundation({ preset }: { preset: MetalconHousePreset }) {
  return (
    <group>
      <mesh position={[0, -0.045, 0]} receiveShadow>
        <boxGeometry args={[preset.widthM + 0.18, 0.09, preset.depthM + 0.18]} />
        <meshStandardMaterial color="#5e6468" roughness={0.9} metalness={0.06} />
      </mesh>
      {/* Se eliminó el gridHelper decorativo ("plataforma de ingeniería"): flotaba
          sobre el suelo y ya no encaja con el entorno realista. */}
      {preset.terraceDepthM ? (
        <mesh position={[0, -0.035, preset.depthM / 2 + preset.terraceDepthM / 2 + 0.1]} receiveShadow>
          <boxGeometry args={[preset.widthM, 0.07, preset.terraceDepthM]} />
          <meshStandardMaterial color="#766b59" roughness={1} />
        </mesh>
      ) : null}
    </group>
  );
}

function WallPanel3D({
  wall,
  preset,
  spacingM,
  profileDepthMm,
  displayMode,
  selected,
  onSelect,
  assemblyProgress,
  layerProgress,
  damageScore,
  showDamage,
  showSupports,
  structuralSystem,
}: {
  wall: MetalconAssemblyWall;
  preset: MetalconHousePreset;
  spacingM: number;
  profileDepthMm: number;
  displayMode: MetalconAssemblyDisplayMode;
  selected: boolean;
  onSelect: () => void;
  assemblyProgress: number | null;
  layerProgress: number | null;
  damageScore: number;
  showDamage: boolean;
  showSupports: boolean;
  structuralSystem: StructuralSystem;
}) {
  const length = wallLengthM(wall);
  const midpoint = wallMidpoint(wall);
  const x = midpoint.x - preset.widthM / 2;
  const z = midpoint.z - preset.depthM / 2;
  const yaw = wallYawRad(wall);
  const wallDepth = Math.max(0.07, profileDepthMm / 1000);
  const studWidth = 0.045;
  const regular = useMemo(() => regularStudOffsets(wall, spacingM), [wall, spacingM]);
  const localOpenings = useMemo(() => wallLocalOpenings(wall), [wall]);
  const bottomTrackIntervals = useMemo(() => clearWallIntervals(wall, true), [wall]);
  const blockingIntervals = useMemo(() => clearWallIntervals(wall, false), [wall]);
  const braceIntervals = blockingIntervals.filter((interval) => interval.end - interval.start >= 1.05).slice(0, 2);
  const baseColor = selected ? CYAN : structuralSystem === 'wood' ? (wall.role === 'perimeter' ? '#a16d45' : '#7d5235') : wall.role === 'perimeter' ? STEEL : STEEL_DARK;
  const damageColor = damageScore > 0.38 ? scoreColor(damageScore) : baseColor;
  const trackOpacity = phase(assemblyProgress, 0, 0.16);
  const studOpacity = phase(assemblyProgress, 0.12, 0.48);
  const openingOpacity = phase(assemblyProgress, 0.42, 0.72);
  const braceOpacity = phase(assemblyProgress, 0.68, 0.92);

  return (
    <group position={[x, 0.02, z]} rotation={[0, yaw, 0]} onClick={onSelect}>
      <mesh position={[0, preset.heightM / 2, 0]}>
        <boxGeometry args={[length, preset.heightM, Math.max(0.02, wallDepth * 0.72)]} />
        <meshBasicMaterial color={selected ? CYAN : '#ffffff'} transparent opacity={selected ? 0.035 : 0.008} depthWrite={false} />
      </mesh>

      {bottomTrackIntervals.map((interval, index) => {
        const intervalLength = interval.end - interval.start;
        return (
          <Member
            key={`bottom-${index}`}
            position={[interval.start + intervalLength / 2 - length / 2, 0.045, 0]}
            size={[Math.max(0.02, intervalLength), 0.07, wallDepth]}
            color={damageColor}
            opacity={trackOpacity}
          />
        );
      })}
      <Member position={[0, preset.heightM - 0.04, 0]} size={[length, 0.08, wallDepth]} color={damageColor} opacity={trackOpacity} />

      {regular.map((offset, index) => (
        <Member
          key={`stud-${index}`}
          position={[offset - length / 2, preset.heightM / 2, 0]}
          size={[studWidth, preset.heightM - 0.14, wallDepth]}
          color={damageColor}
          opacity={studOpacity}
        />
      ))}

      <CornerPack x={-length / 2 + 0.035} height={preset.heightM} depth={wallDepth} opacity={studOpacity} color={damageColor} />
      <CornerPack x={length / 2 - 0.035} height={preset.heightM} depth={wallDepth} opacity={studOpacity} color={damageColor} />

      {wall.openings.map((opening) => (
        <OpeningFrame
          key={opening.id}
          opening={opening}
          wallLength={length}
          wallHeight={preset.heightM}
          spacingM={spacingM}
          depth={wallDepth}
          studWidth={studWidth}
          opacity={openingOpacity}
          showLabel={displayMode === 'openings' || selected}
        />
      ))}

      {blockingIntervals.map((interval, index) => {
        const clearLength = interval.end - interval.start - 0.1;
        if (clearLength < 0.24) return null;
        return (
          <Member
            key={`block-${index}`}
            position={[interval.start + (interval.end - interval.start) / 2 - length / 2, Math.min(1.2, preset.heightM * 0.52), wallDepth * 0.05]}
            size={[clearLength, 0.045, wallDepth * 0.82]}
            color={displayMode === 'openings' ? YELLOW : '#c5ced5'}
            opacity={openingOpacity * 0.92}
          />
        );
      })}

      {wall.braced && displayMode !== 'openings'
        ? braceIntervals.map((interval, index) => {
            const inset = 0.12;
            const x1 = interval.start + inset - length / 2;
            const x2 = interval.end - inset - length / 2;
            const low = 0.15;
            const high = preset.heightM - 0.16;
            return (
              <DiagonalMember
                key={`brace-${index}`}
                x1={index % 2 === 0 ? x1 : x2}
                y1={low}
                x2={index % 2 === 0 ? x2 : x1}
                y2={high}
                z={wallDepth / 2 + 0.012}
                color={displayMode === 'bracing' ? CYAN : YELLOW}
                opacity={braceOpacity}
              />
            );
          })
        : null}

      {showSupports ? (
        <>
          <Anchor x={-length / 2 + 0.09} depth={wallDepth} />
          <Anchor x={length / 2 - 0.09} depth={wallDepth} />
          {wall.openings.map((opening) => (
            <group key={`anchors-${opening.id}`}>
              <Anchor x={opening.offsetM - length / 2 - 0.055} depth={wallDepth} />
              <Anchor x={opening.offsetM + opening.widthM - length / 2 + 0.055} depth={wallDepth} />
            </group>
          ))}
        </>
      ) : null}

      {showDamage && damageScore > 0.34 ? <DamageMarkers length={length} height={preset.heightM} depth={wallDepth} score={damageScore} wall={wall} /> : null}

      {wall.role === 'perimeter' ? (
        <WallCladding
          length={length}
          height={preset.heightM}
          depth={wallDepth}
          opacity={assemblyProgress != null ? Math.min(1, Math.max(0, (assemblyProgress - 0.35) / 0.3)) : 1}
          layerProgress={layerProgress}
          spacingM={spacingM}
          wallId={wall.id}
          openings={localOpenings}
        />
      ) : null}

      {displayMode === 'dimensions' || selected ? (
        <Html center distanceFactor={9} position={[0, preset.heightM + 0.2, 0]}>
          <div className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[8px] font-black backdrop-blur-md ${selected ? 'border-cyan-300/40 bg-cyan-950/90 text-cyan-100' : 'border-white/10 bg-black/75 text-white/75'}`}>
            {wall.label} · {length.toFixed(2)} m
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function OpeningFrame({
  opening,
  wallLength,
  wallHeight,
  spacingM,
  depth,
  studWidth,
  opacity,
  showLabel,
}: {
  opening: MetalconAssemblyOpening;
  wallLength: number;
  wallHeight: number;
  spacingM: number;
  depth: number;
  studWidth: number;
  opacity: number;
  showLabel: boolean;
}) {
  const left = opening.offsetM - wallLength / 2;
  const right = left + opening.widthM;
  const center = (left + right) / 2;
  const headerY = Math.min(wallHeight - 0.14, opening.sillM + opening.heightM);
  const headerWidth = opening.widthM + 0.18;
  const trimmerHeight = Math.max(0.2, headerY - 0.1);
  const aboveHeight = Math.max(0, wallHeight - headerY - 0.14);
  const belowHeight = opening.kind === 'window' ? Math.max(0, opening.sillM - 0.1) : 0;
  const innerOffsets: number[] = [];
  for (let offset = opening.offsetM + spacingM; offset < opening.offsetM + opening.widthM - 0.08; offset += spacingM) innerOffsets.push(offset);

  return (
    <group>
      <Member position={[left - 0.045, wallHeight / 2, 0]} size={[studWidth, wallHeight - 0.14, depth]} color={YELLOW} opacity={opacity} />
      <Member position={[left + 0.015, wallHeight / 2, depth * 0.08]} size={[studWidth, wallHeight - 0.14, depth]} color={YELLOW} opacity={opacity} />
      <Member position={[right + 0.045, wallHeight / 2, 0]} size={[studWidth, wallHeight - 0.14, depth]} color={YELLOW} opacity={opacity} />
      <Member position={[right - 0.015, wallHeight / 2, depth * 0.08]} size={[studWidth, wallHeight - 0.14, depth]} color={YELLOW} opacity={opacity} />

      <Member position={[left + 0.075, trimmerHeight / 2 + 0.04, -depth * 0.05]} size={[studWidth, trimmerHeight, depth]} color="#ffd978" opacity={opacity} />
      <Member position={[right - 0.075, trimmerHeight / 2 + 0.04, -depth * 0.05]} size={[studWidth, trimmerHeight, depth]} color="#ffd978" opacity={opacity} />

      <Member position={[center, headerY + 0.035, -depth * 0.14]} size={[headerWidth, 0.07, depth * 0.72]} color={YELLOW} opacity={opacity} />
      <Member position={[center, headerY + 0.095, depth * 0.14]} size={[headerWidth, 0.06, depth * 0.72]} color="#eebd38" opacity={opacity} />

      {opening.kind === 'window' ? (
        <Member position={[center, opening.sillM, 0]} size={[opening.widthM + 0.12, 0.065, depth]} color={YELLOW} opacity={opacity} />
      ) : null}

      {innerOffsets.map((offset, index) => (
        <group key={`${opening.id}-cripple-${index}`}>
          {aboveHeight > 0.08 ? (
            <Member
              position={[offset - wallLength / 2, headerY + 0.12 + aboveHeight / 2, 0]}
              size={[studWidth, aboveHeight, depth]}
              color="#c9d2d9"
              opacity={opacity}
            />
          ) : null}
          {belowHeight > 0.08 ? (
            <Member
              position={[offset - wallLength / 2, belowHeight / 2 + 0.04, 0]}
              size={[studWidth, belowHeight, depth]}
              color="#c9d2d9"
              opacity={opacity}
            />
          ) : null}
        </group>
      ))}

      {showLabel ? (
        <Html center distanceFactor={8} position={[center, Math.min(wallHeight - 0.12, headerY + 0.25), depth * 0.7]}>
          <div className="min-w-28 rounded-xl border border-[#FFE600]/30 bg-black/85 px-2.5 py-2 text-center text-[7px] font-black uppercase tracking-[.08em] text-amber-100">
            <div>{opening.label}</div>
            <div className="mt-1 text-[7px] font-bold normal-case tracking-normal text-white/55">
              {opening.widthM.toFixed(2)} × {opening.heightM.toFixed(2)} m{opening.kind === 'window' ? ` · antepecho ${opening.sillM.toFixed(2)} m` : ''}
            </div>
            <div className="mt-1 text-[6px] normal-case tracking-normal text-white/35">doble jamba · dintel compuesto · montantes cortos</div>
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function CornerPack({ x, height, depth, opacity, color }: { x: number; height: number; depth: number; opacity: number; color: string }) {
  return (
    <group>
      <Member position={[x - 0.028, height / 2, -depth * 0.18]} size={[0.045, height - 0.14, depth]} color={color} opacity={opacity} />
      <Member position={[x + 0.028, height / 2, depth * 0.18]} size={[0.045, height - 0.14, depth]} color={color} opacity={opacity} />
    </group>
  );
}

function Member({ position, size, color, opacity = 1 }: { position: [number, number, number]; size: [number, number, number]; color: string; opacity?: number }) {
  return (
    <mesh position={position} castShadow receiveShadow visible={opacity > 0.005}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.78} roughness={0.3} transparent={opacity < 0.999} opacity={opacity} />
    </mesh>
  );
}

function DiagonalMember({ x1, y1, x2, y2, z, color, opacity }: { x1: number; y1: number; x2: number; y2: number; z: number; color: string; opacity: number }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  return (
    <mesh position={[(x1 + x2) / 2, (y1 + y2) / 2, z]} rotation={[0, 0, angle]} castShadow visible={opacity > 0.005}>
      <boxGeometry args={[length, 0.028, 0.012]} />
      <meshStandardMaterial color={color} metalness={0.62} roughness={0.34} transparent={opacity < 0.999} opacity={opacity} />
    </mesh>
  );
}

function Anchor({ x, depth }: { x: number; depth: number }) {
  return (
    <group position={[x, 0.085, depth / 2 + 0.04]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.14, 14]} />
        <meshStandardMaterial color={GREEN} metalness={0.5} roughness={0.38} emissive="#08783b" emissiveIntensity={0.65} />
      </mesh>
    </group>
  );
}

function DamageMarkers({ length, height, depth, score, wall }: { length: number; height: number; depth: number; score: number; wall: MetalconAssemblyWall }) {
  const color = scoreColor(score);
  const primaryOffset = wall.openings[0]
    ? wall.openings[0].offsetM + wall.openings[0].widthM / 2 - length / 2
    : Math.min(length * 0.24, 0.9);
  return (
    <group>
      <DamagePoint position={[primaryOffset, Math.min(height * 0.72, 1.75), depth / 2 + 0.07]} color={color} label={score >= 0.78 ? 'Crítico' : score >= 0.58 ? 'Alto' : 'Revisar'} />
      {score > 0.66 ? <DamagePoint position={[-length * 0.32, 0.34, depth / 2 + 0.07]} color={color} label="Anclaje / solera" /> : null}
    </group>
  );
}

function DamagePoint({ position, color, label }: { position: [number, number, number]; color: string; label: string }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.14} />
      </mesh>
      <Html center distanceFactor={8} position={[0, 0.17, 0]}>
        <span className="whitespace-nowrap rounded-full bg-black/82 px-2 py-1 text-[7px] font-black text-white">{label}</span>
      </Html>
    </group>
  );
}

/**
 * Cierre del muro. Dos modos:
 *  - `layerProgress === null` → comportamiento histórico: una sola opacidad para todo el conjunto.
 *  - `layerProgress` numérico → cada capa aparece en su fase, de afuera hacia adentro,
 *    siguiendo el orden publicado del sistema (OSB → membrana → listones → lana → vulcanita → siding).
 */
function WallCladding({
  length,
  height,
  depth,
  opacity,
  layerProgress,
  spacingM,
  wallId,
  openings,
}: {
  length: number;
  height: number;
  depth: number;
  opacity: number;
  layerProgress: number | null;
  spacingM: number;
  wallId: string;
  openings: WallOpeningSlice[];
}) {
  const phased = layerProgress != null;
  const osbZ = depth / 2 + 0.008;
  const membraneZ = depth / 2 + 0.018;
  const battenZ = depth / 2 + 0.03;
  const sidingZ = depth / 2 + 0.048;
  const gypsumZ = -(depth / 2 + 0.012);
  const claddingH = height - 0.04;
  const show = (id: keyof typeof METALCON_LAYER_PHASES) => (phased ? phase(layerProgress, METALCON_LAYER_PHASES[id][0], METALCON_LAYER_PHASES[id][1]) : opacity);
  // Los listones siguen la modulación de montantes: es el mismo criterio de reparto.
  const battenCount = Math.max(2, Math.round(length / Math.max(0.4, spacingM)));
  const battens = useMemo(
    () => Array.from({ length: battenCount + 1 }, (_, index) => -length / 2 + (length / battenCount) * index),
    [battenCount, length],
  );
  // Segmentos del muro recortados en los vanos (izq/der + dintel + umbral), en coordenadas locales de la pared.
  const cutSegs = useMemo(() => {
    return wallCutSegments(length, height, openings)
      .map((segment) => {
        const y0 = Math.max(0.02, segment.cy - segment.h / 2);
        const y1 = Math.min(height - 0.02, segment.cy + segment.h / 2);
        return { cx: segment.cx, cy: (y0 + y1) / 2, w: segment.w, h: y1 - y0 };
      })
      .filter((segment) => segment.w > 0.012 && segment.h > 0.012);
  }, [length, height, openings]);
  const osbOpacity = show('osb');
  const membraneOpacity = show('membrane');
  const battenOpacity = show('battens');
  const insulationOpacity = show('insulation');
  const gypsumOpacity = show('gypsum');
  const sidingOpacity = show('siding');
  const fillOpacity = Math.max(osbOpacity, sidingOpacity);

  // UN material compartido por capa para todos los segmentos/listones del muro
  // (no un material por mesh). El mapa llega asíncrono; si una textura falla
  // queda `null` y se conserva el color plano original.
  const textures = useViewerTextures();
  const osbMaps = usePbrMaps('woodOsb');
  const osbMat = useTextureMaterial(
    osbMaps.color,
    { color: osbMaps.color ? '#ffffff' : '#d4b87a', roughness: 0.82, envMapIntensity: 0.65, normalMap: osbMaps.normal, roughnessMap: osbMaps.roughness },
    osbOpacity * 0.9,
  );
  const membraneMat = useTextureMaterial(null, { color: '#f0ece4', roughness: 0.55, envMapIntensity: 0.65 }, membraneOpacity * 0.62);
  const battenMat = useTextureMaterial(null, { color: '#c2ab84', roughness: 0.85, envMapIntensity: 0.6 }, battenOpacity);
  const insulationMat = useTextureMaterial(null, { color: '#f2d9a0', roughness: 1, envMapIntensity: 0.5 }, insulationOpacity * 0.42);
  const gypsumMat = useTextureMaterial(
    textures.intDrywall,
    { color: textures.intDrywall ? '#ffffff' : '#e9e6df', roughness: 0.95, metalness: 0, envMapIntensity: 0.6 },
    gypsumOpacity * 0.95,
  );
  const sidingMat = useTextureMaterial(
    textures.extMetalcon,
    { color: textures.extMetalcon ? '#ffffff' : '#ddd2bf', roughness: 0.85, metalness: 0.04, envMapIntensity: 0.7 },
    sidingOpacity * 0.98,
  );

  return (
    <group>
      {/* OSB estructural: rigidiza el panel, recortada en puertas y ventanas */}
      {osbOpacity > 0.01
        ? cutSegs.map((segment, index) => (
            <mesh key={`osb-${index}`} position={[segment.cx, segment.cy, osbZ]} castShadow material={osbMat}>
              <boxGeometry args={[segment.w, segment.h, 0.012]} />
            </mesh>
          ))
        : null}
      {/* Barrera hidrófuga / cortaviento */}
      {membraneOpacity > 0.01
        ? cutSegs.map((segment, index) => (
            <mesh key={`membrane-${index}`} position={[segment.cx, segment.cy, membraneZ]} material={membraneMat}>
              <boxGeometry args={[segment.w, segment.h, 0.004]} />
            </mesh>
          ))
        : null}
      {/* Listones: generan la cámara ventilada (se interrumpen en los vanos) */}
      {battenOpacity > 0.01 ? (
        <group>
          {battens
            .filter((x) => !openings.some((opening) => x > opening.u0 - 0.01 && x < opening.u1 + 0.01))
            .map((x, index) => (
              <mesh key={`batten-${index}`} position={[x, height / 2, battenZ]} material={battenMat}>
                <boxGeometry args={[0.04, claddingH, 0.022]} />
              </mesh>
            ))}
        </group>
      ) : null}
      {/* Lana aislante: ocupa la cámara entre montantes, libre de vanos */}
      {insulationOpacity > 0.01
        ? cutSegs.map((segment, index) => (
          <mesh key={`insulation-${index}`} position={[segment.cx, segment.cy, 0]} material={insulationMat}>
            <boxGeometry args={[Math.max(0.04, segment.w - 0.02), Math.max(0.04, segment.h - 0.02), Math.max(0.03, depth * 0.66)]} />
          </mesh>
          ))
        : null}
      {/* Vulcanita interior */}
      {gypsumOpacity > 0.01
        ? cutSegs.map((segment, index) => (
            <mesh key={`gypsum-${index}`} position={[segment.cx, segment.cy, gypsumZ]} castShadow material={gypsumMat}>
              <boxGeometry args={[segment.w, segment.h, 0.012]} />
            </mesh>
          ))
        : null}
      {/* Siding exterior: última capa, la cara visible */}
      {sidingOpacity > 0.01
        ? cutSegs.map((segment, index) => (
            <mesh key={`siding-${index}`} position={[segment.cx, segment.cy, sidingZ]} castShadow receiveShadow material={sidingMat}>
              <boxGeometry args={[segment.w, segment.h, 0.016]} />
            </mesh>
          ))
        : null}
      {/* Hojas de puerta y vidrios dentro de los vanos */}
      {fillOpacity > 0.05
        ? openings.map((opening, index) => <VanoFill key={`fill-${wallId}-${index}`} opening={opening} depth={depth} opacity={fillOpacity} />)
        : null}
    </group>
  );
}

/** Marco + hoja de puerta o vidrio dentro de un vano, en el sistema local de la pared (u sobre x, y sobre el terreno). */
function VanoFill({ opening, depth, opacity }: { opening: WallOpeningSlice; depth: number; opacity: number }) {
  const w = opening.u1 - opening.u0;
  const h = opening.y1 - opening.y0;
  if (w < 0.06 || h < 0.06) return null;
  const u = (opening.u0 + opening.u1) / 2;
  const cy = (opening.y0 + opening.y1) / 2;
  const z = depth / 2 + 0.032;
  const frame = 0.038;
  const glassW = Math.max(0.05, w - 0.1);
  const glassH = Math.max(0.05, h - 0.1);
  return (
    <group position={[u, cy, z]} visible={opacity > 0.02}>
      {opening.kind === 'door' ? (
        <>
          <mesh castShadow>
            <boxGeometry args={[Math.max(0.04, w - 0.06), Math.max(0.04, h - 0.02), 0.036]} />
            <meshStandardMaterial color="#8a6a48" roughness={0.55} transparent={opacity < 0.99} opacity={opacity} />
          </mesh>
          <mesh position={[Math.max(0.04, w - 0.06) / 2 - 0.1, 0, 0.026]}>
            <sphereGeometry args={[0.02, 10, 8]} />
            <meshStandardMaterial color="#c9ccd0" metalness={0.65} roughness={0.28} transparent={opacity < 0.99} opacity={opacity} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, h / 2 - frame / 2, 0]}>
            <boxGeometry args={[w - 0.02, frame, 0.03]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.15} transparent={opacity < 0.99} opacity={opacity} />
          </mesh>
          <mesh position={[0, -h / 2 + frame / 2, 0]}>
            <boxGeometry args={[w - 0.02, frame, 0.03]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.15} transparent={opacity < 0.99} opacity={opacity} />
          </mesh>
          <mesh position={[-w / 2 + frame / 2, 0, 0]}>
            <boxGeometry args={[frame, h - 0.02, 0.03]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.15} transparent={opacity < 0.99} opacity={opacity} />
          </mesh>
          <mesh position={[w / 2 - frame / 2, 0, 0]}>
            <boxGeometry args={[frame, h - 0.02, 0.03]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.15} transparent={opacity < 0.99} opacity={opacity} />
          </mesh>
          <mesh>
            <boxGeometry args={[glassW, glassH, 0.012]} />
            <meshPhysicalMaterial color="#d7ecf7" roughness={0.08} metalness={0} transparent opacity={0.35} depthWrite={false} side={DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

function FootprintDimensions({ preset }: { preset: MetalconHousePreset }) {
  return (
    <group>
      <Html center distanceFactor={10} position={[0, 0.08, -preset.depthM / 2 - 0.42]}>
        <DimensionTag text={`${preset.widthM.toFixed(2)} m ancho total`} />
      </Html>
      <Html center distanceFactor={10} position={[preset.widthM / 2 + 0.52, 0.08, 0]}>
        <DimensionTag text={`${preset.depthM.toFixed(2)} m fondo`} />
      </Html>
      {preset.terraceDepthM ? (
        <Html center distanceFactor={10} position={[0, 0.08, preset.depthM / 2 + preset.terraceDepthM + 0.28]}>
          <DimensionTag text={`terraza ${preset.terraceDepthM.toFixed(2)} m`} />
        </Html>
      ) : null}
    </group>
  );
}

function DimensionTag({ text }: { text: string }) {
  return <span className="whitespace-nowrap rounded-full border border-cyan-300/25 bg-black/80 px-3 py-1.5 text-[8px] font-black text-cyan-100">↔ {text}</span>;
}

function SteelRoofStructure({
  preset,
  opacity,
  damageScore,
  showDamage,
}: {
  preset: MetalconHousePreset;
  opacity: number;
  damageScore: number;
  showDamage: boolean;
}) {
  const w = preset.widthM;
  const d = preset.depthM;
  const eaveY = preset.heightM + 0.02;
  const roofRise = Math.max(0.65, d * 0.18);
  const ridgeY = eaveY + roofRise;
  const eaveOverhang = 0.35;
  const roofWidth = w + eaveOverhang * 2;
  const roofDepth = d + eaveOverhang * 2;
  const run = roofDepth / 2;
  const slopeLen = Math.sqrt(run * run + roofRise * roofRise);
  const roofAngle = Math.atan2(roofRise, run);
  const midY = eaveY + roofRise / 2;
  // X del borde de la cubierta (equivalente al halfW de Roof en MetalconLabFinishesV2).
  const vergeX = w / 2 + eaveOverhang;
  // Luz útil de cabios y correas: descontamos el semiespesor del perfil para que
  // las puntas queden dentro del alero (como mucho al ras del borde de la cubierta)
  // y no sobresalgan del volumen del techo.
  const memberX = vergeX - 0.055;
  const trussCount = Math.max(3, Math.ceil(w / 0.8));
  const trussSpacing = w / trussCount;
  const purlinCount = Math.max(2, Math.ceil(run / 0.6));
  const damaged = showDamage && damageScore > 0.38;
  const trussColor = damaged ? (damageScore > 0.72 ? '#ff3347' : '#ff8b32') : '#c8d2dc';
  const purlinColor = damaged ? (damageScore > 0.68 ? '#ff3b30' : '#e8a830') : '#a8b8c8';
  const panelColor = damaged ? (damageScore > 0.7 ? '#d93030' : '#c4841e') : '#8a9ab0';
  const beamColor = damaged ? '#ff3b30' : '#d0dae4';

  const trussXs = useMemo(
    () => Array.from({ length: trussCount + 1 }, (_, i) => -w / 2 + i * trussSpacing),
    [w, trussCount, trussSpacing],
  );

  const purlinFractions = useMemo(
    () => Array.from({ length: purlinCount }, (_, i) => (i + 1) / (purlinCount + 1)),
    [purlinCount],
  );

  return (
    <group>
      {trussXs.map((tx, i) => (
        <SteelTruss
          key={`truss-${i}`}
          x={tx}
          eaveY={eaveY}
          ridgeY={ridgeY}
          run={run}
          riseH={roofRise}
          color={trussColor}
          opacity={opacity}
          stressed={damaged && (i % 4 === 1 || damageScore > 0.82)}
        />
      ))}

      <SteelBeam
        from={[-w / 2, ridgeY, 0]}
        to={[w / 2, ridgeY, 0]}
        size={[0.065, 0.065]}
        color={beamColor}
        opacity={opacity}
      />

      <SteelBeam
        from={[-memberX, eaveY, -run]}
        to={[memberX, eaveY, -run]}
        size={[0.055, 0.07]}
        color={beamColor}
        opacity={opacity}
      />
      <SteelBeam
        from={[-memberX, eaveY, run]}
        to={[memberX, eaveY, run]}
        size={[0.055, 0.07]}
        color={beamColor}
        opacity={opacity}
      />

      {purlinFractions.map((f, i) => {
        const y = eaveY + roofRise * (1 - f);
        const zFront = -run * f;
        const zBack = run * f;
        // Correas por debajo de la cara inferior del tablero de cubierta: no deben perforar el covering.
        const purlinLift = -0.012;
        return (
          <group key={`purlin-row-${i}`}>
            <SteelBeam
              from={[-memberX, y + purlinLift, zFront]}
              to={[memberX, y + purlinLift, zFront]}
              size={[0.04, 0.055]}
              color={purlinColor}
              opacity={opacity}
            />
            <SteelBeam
              from={[-memberX, y + purlinLift, zBack]}
              to={[memberX, y + purlinLift, zBack]}
              size={[0.04, 0.055]}
              color={purlinColor}
              opacity={opacity}
            />
          </group>
        );
      })}

      {/* Deck estructural: por debajo del covering canónico de MetalconLabFinishesV2 (tablero en midY+0.068). */}
      <SteelRoofPanel
        position={[0, midY + 0.04, -run / 2]}
        rotation={[-roofAngle, 0, 0]}
        width={roofWidth}
        depth={slopeLen}
        color={panelColor}
        opacity={opacity * 0.78}
      />
      <SteelRoofPanel
        position={[0, midY + 0.04, run / 2]}
        rotation={[roofAngle, 0, 0]}
        width={roofWidth}
        depth={slopeLen}
        color={panelColor}
        opacity={opacity * 0.78}
      />

      {/* Cumbrera: se mantiene dentro del borde de la cubierta (bajo el tapa-cumbrera de los acabados). */}
      <mesh position={[0, ridgeY + 0.015, 0]}>
        <boxGeometry args={[roofWidth - 0.06, 0.045, 0.14]} />
        <meshStandardMaterial color="#8a9bae" metalness={0.75} roughness={0.28} transparent={opacity < 0.99} opacity={opacity} />
      </mesh>
    </group>
  );
}

function SteelTruss({
  x,
  eaveY,
  ridgeY,
  run,
  riseH,
  color,
  opacity,
  stressed,
}: {
  x: number;
  eaveY: number;
  ridgeY: number;
  run: number;
  riseH: number;
  color: string;
  opacity: number;
  stressed: boolean;
}) {
  const trussColor = stressed ? '#ff3b30' : color;
  const emissive = stressed ? '#7a1008' : '#000000';
  const emissiveI = stressed ? 0.5 : 0;
  const memberSize = 0.032;
  const chordSize = 0.04;

  const verticals = useMemo(() => {
    const positions: Array<{ z: number; yTop: number }> = [];
    const fracs = [-0.7, -0.45, -0.2, 0, 0.2, 0.45, 0.7];
    for (const frac of fracs) {
      const z = -run + ((frac + 1) / 2) * run * 2;
      const t = Math.abs(frac);
      // El techo es de agua recta (cumbrera–alero): los montantes deben rematar
      // dentro de la cuerda superior. La parábola (1−t²) queda SIEMPRE por sobre
      // la línea recta del faldón y antes asomaba como picos a través de la
      // cubierta (muy visibles en rojo cuando la cercha está dañada).
      const chordY = eaveY + riseH * (1 - t);
      const capParabolaY = eaveY + riseH * (1 - t * t);
      positions.push({ z, yTop: Math.min(capParabolaY, chordY - 0.01, ridgeY - 0.01) });
    }
    return positions;
  }, [eaveY, riseH, ridgeY, run]);

  const diagonals = useMemo(() => {
    const segs: Array<{ from: [number, number, number]; to: [number, number, number] }> = [];
    for (const side of [0, 1]) {
      const zStart = side === 0 ? -run : run;
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const t1 = i / steps;
        const t2 = (i + 1) / steps;
        const z1 = zStart + (0 - zStart) * t1;
        const z2 = zStart + (0 - zStart) * t2;
        const frac1 = ((z1 + run) / (run * 2)) * 2 - 1;
        const frac2 = ((z2 + run) / (run * 2)) * 2 - 1;
        const y1 = eaveY + riseH * (1 - frac1 * frac1) * 0.5;
        const y2 = eaveY + riseH * (1 - frac2 * frac2) * 0.5;
        segs.push({ from: [0, y1 + 0.015, z1], to: [0, y2 + 0.015, z2] });
      }
    }
    return segs;
  }, [eaveY, riseH, run]);

  return (
    <group position={[x, 0, 0]}>
      <SteelBeamMember from={[0, eaveY, -run]} to={[0, ridgeY, 0]} size={[chordSize, chordSize]} color={trussColor} opacity={opacity} emissive={emissive} emissiveI={emissiveI} />
      <SteelBeamMember from={[0, eaveY, run]} to={[0, ridgeY, 0]} size={[chordSize, chordSize]} color={trussColor} opacity={opacity} emissive={emissive} emissiveI={emissiveI} />
      <SteelBeamMember from={[0, eaveY, -run]} to={[0, eaveY, run]} size={[chordSize, chordSize * 0.85]} color={trussColor} opacity={opacity} emissive={emissive} emissiveI={emissiveI} />

      {verticals.map((v, i) => (
        <SteelBeamMember
          key={`v-${i}`}
          from={[0, eaveY + 0.01, v.z]}
          to={[0, v.yTop, v.z]}
          size={[memberSize * 0.75, memberSize * 0.75]}
          color={trussColor}
          opacity={opacity * 0.85}
          emissive={emissive}
          emissiveI={emissiveI * 0.6}
        />
      ))}

      {diagonals.map((d, i) => (
        <SteelBeamMember
          key={`d-${i}`}
          from={d.from as [number, number, number]}
          to={d.to as [number, number, number]}
          size={[memberSize * 0.6, memberSize * 0.6]}
          color={trussColor}
          opacity={opacity * 0.7}
          emissive={emissive}
          emissiveI={emissiveI * 0.4}
        />
      ))}
    </group>
  );
}

function SteelBeam({
  from,
  to,
  size,
  color,
  opacity,
}: {
  from: [number, number, number];
  to: [number, number, number];
  size: [number, number];
  color: string;
  opacity: number;
}) {
  return <SteelBeamMember from={from} to={to} size={size} color={color} opacity={opacity} emissive="#000" emissiveI={0} />;
}

function SteelBeamMember({
  from,
  to,
  size,
  color,
  opacity,
  emissive,
  emissiveI,
}: {
  from: [number, number, number];
  to: [number, number, number];
  size: [number, number];
  color: string;
  opacity: number;
  emissive: string;
  emissiveI: number;
}) {
  const a = useMemo(() => new Vector3(...from), [from[0], from[1], from[2]]);
  const b = useMemo(() => new Vector3(...to), [to[0], to[1], to[2]]);
  const mid = useMemo(() => a.clone().lerp(b, 0.5), [a, b]);
  const len = useMemo(() => a.distanceTo(b), [a, b]);
  const q = useMemo(() => {
    const dir = b.clone().sub(a).normalize();
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  }, [a, b]);

  return (
    <mesh position={mid} quaternion={q} castShadow visible={opacity > 0.005}>
      <boxGeometry args={[size[0], len, size[1]]} />
      <meshStandardMaterial
        color={color}
        metalness={0.82}
        roughness={0.22}
        transparent={opacity < 0.999}
        opacity={opacity}
        emissive={emissive}
        emissiveIntensity={emissiveI}
      />
    </mesh>
  );
}

function SteelRoofPanel({
  position,
  rotation,
  width,
  depth,
  color,
  opacity,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  depth: number;
  color: string;
  opacity: number;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[width, 0.025, depth]} />
      <meshStandardMaterial color={color} metalness={0.55} roughness={0.45} transparent opacity={opacity} />
    </mesh>
  );
}

function rise(run: number) {
  return Math.max(0.65, run * 0.3);
}
