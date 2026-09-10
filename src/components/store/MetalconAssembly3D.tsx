'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
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

export type MetalconAssemblyDisplayMode = 'mesh' | 'dimensions' | 'openings' | 'bracing';

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
  seismic?: MetalconSeismicVisual;
};

const STEEL = '#d9e0e6';
const STEEL_DARK = '#aeb8c1';
const YELLOW = '#F6C64A';
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
  seismic,
}: AssemblyProps) {
  const assembly = useRef<Group>(null);
  const spacingM = spacingCm / 100;
  const scale = Math.min(1, 8.4 / Math.max(preset.widthM, preset.depthM + (preset.terraceDepthM ?? 0)));

  useFrame(({ clock }, delta) => {
    if (!assembly.current) return;
    const response = seismic?.active ? clamp((seismic.progress - 0.43) / 0.24) * clamp((0.92 - seismic.progress) / 0.12) : 0;
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
              damageScore={seismic?.panelScores[currentWall.id] ?? 0}
              showDamage={Boolean(seismic?.showDamage && seismic.progress > 0.62)}
              showSupports={Boolean(seismic?.showSupports)}
            />
          );
        })}
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
      <gridHelper args={[Math.max(12, preset.widthM + preset.depthM), Math.max(20, Math.round((preset.widthM + preset.depthM) * 2)), '#7d8790', '#3c444a']} position={[0, 0.006, 0]} />
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
  damageScore,
  showDamage,
  showSupports,
}: {
  wall: MetalconAssemblyWall;
  preset: MetalconHousePreset;
  spacingM: number;
  profileDepthMm: number;
  displayMode: MetalconAssemblyDisplayMode;
  selected: boolean;
  onSelect: () => void;
  assemblyProgress: number | null;
  damageScore: number;
  showDamage: boolean;
  showSupports: boolean;
}) {
  const length = wallLengthM(wall);
  const midpoint = wallMidpoint(wall);
  const x = midpoint.x - preset.widthM / 2;
  const z = midpoint.z - preset.depthM / 2;
  const yaw = wallYawRad(wall);
  const wallDepth = Math.max(0.07, profileDepthMm / 1000);
  const studWidth = 0.045;
  const regular = useMemo(() => regularStudOffsets(wall, spacingM), [wall, spacingM]);
  const bottomTrackIntervals = useMemo(() => clearWallIntervals(wall, true), [wall]);
  const blockingIntervals = useMemo(() => clearWallIntervals(wall, false), [wall]);
  const braceIntervals = blockingIntervals.filter((interval) => interval.end - interval.start >= 1.05).slice(0, 2);
  const baseColor = selected ? CYAN : wall.role === 'perimeter' ? STEEL : STEEL_DARK;
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
          <div className="min-w-28 rounded-xl border border-[#F6C64A]/30 bg-black/85 px-2.5 py-2 text-center text-[7px] font-black uppercase tracking-[.08em] text-amber-100">
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
