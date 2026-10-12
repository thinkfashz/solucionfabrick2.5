'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Quaternion, Vector3 } from 'three';
import type { Group } from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';

const clamp = (v: number) => Math.min(1, Math.max(0, v));

type Props = {
  preset: MetalconHousePreset;
  active: boolean;
  progress: number;
  response: number;
  frequencyHz: number;
  directionDeg: number;
  showDamage?: boolean;
  showRoof?: boolean;
  showPanels?: boolean;
  showLabels?: boolean;
};

export default function WoodFrameSeismicModelV2({
  preset,
  active,
  progress,
  response,
  frequencyHz,
  directionDeg,
  showDamage = true,
  showRoof = true,
  showPanels = true,
  showLabels = true,
}: Props) {
  const ref = useRef<Group>(null);
  const scale = Math.min(1, 8.4 / Math.max(preset.widthM, preset.depthM + (preset.terraceDepthM ?? 0)));
  const studsX = useMemo(
    () => Array.from({ length: Math.ceil(preset.widthM / 0.4) + 1 }, (_, i) => -preset.widthM / 2 + (i * preset.widthM) / Math.ceil(preset.widthM / 0.4)),
    [preset.widthM],
  );
  const studsZ = useMemo(
    () => Array.from({ length: Math.ceil(preset.depthM / 0.4) + 1 }, (_, i) => -preset.depthM / 2 + (i * preset.depthM) / Math.ceil(preset.depthM / 0.4)),
    [preset.depthM],
  );

  const damageGate = showDamage ? clamp((progress - 0.6) / 0.28) : 0;
  const damage = clamp(response * damageGate);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const envelope = active ? clamp((progress - 0.42) / 0.16) * clamp((0.94 - progress) / 0.12) : 0;
    const dir = (directionDeg * Math.PI) / 180;
    const wave = Math.sin(clock.elapsedTime * Math.max(0.8, frequencyHz) * Math.PI * 2) * response * 0.22 * envelope;
    const lerp = Math.min(1, delta * 14);
    const permanent = damage > 0.62 ? (damage - 0.62) * 0.055 : 0;
    ref.current.position.x += (Math.cos(dir) * wave - ref.current.position.x) * lerp;
    ref.current.position.z += (Math.sin(dir) * wave - ref.current.position.z) * lerp;
    ref.current.rotation.z += (Math.cos(dir) * wave * 0.075 + permanent - ref.current.rotation.z) * lerp;
    ref.current.rotation.x += (-Math.sin(dir) * wave * 0.075 - ref.current.rotation.x) * lerp;
  });

  const eaveY = preset.heightM + 0.08;

  return (
    <group scale={scale}>
      <group ref={ref}>
        <mesh position={[0, -0.045, 0]} receiveShadow>
          <boxGeometry args={[preset.widthM + 0.18, 0.09, preset.depthM + 0.18]} />
          <meshStandardMaterial color="#61666a" roughness={0.9} />
        </mesh>

        <group>
          {studsX.flatMap((x, i) => [
            <WoodMember key={`n${x}`} pos={[x, preset.heightM / 2, -preset.depthM / 2]} size={[0.045, preset.heightM, 0.09]} damage={damage * (0.82 + (i % 4) * 0.06)} seed={i} />,
            <WoodMember key={`s${x}`} pos={[x, preset.heightM / 2, preset.depthM / 2]} size={[0.045, preset.heightM, 0.09]} damage={damage * (0.86 + ((i + 2) % 4) * 0.05)} seed={i + 31} />,
          ])}
          {studsZ.flatMap((z, i) => [
            <WoodMember key={`w${z}`} pos={[-preset.widthM / 2, preset.heightM / 2, z]} size={[0.09, preset.heightM, 0.045]} damage={damage * (0.84 + (i % 3) * 0.07)} seed={i + 61} />,
            <WoodMember key={`e${z}`} pos={[preset.widthM / 2, preset.heightM / 2, z]} size={[0.09, preset.heightM, 0.045]} damage={damage * (0.9 + ((i + 1) % 3) * 0.05)} seed={i + 91} />,
          ])}

          {studsX.flatMap((x, i) => [
            <WoodMember key={`cn${x}`} pos={[x, eaveY - 0.04, -preset.depthM / 2]} size={[0.045, 0.12, 0.09]} damage={damage * 0.6} seed={i + 200} />,
            <WoodMember key={`cs${x}`} pos={[x, eaveY - 0.04, preset.depthM / 2]} size={[0.045, 0.12, 0.09]} damage={damage * 0.6} seed={i + 230} />,
          ])}
          {studsZ.flatMap((z, i) => [
            <WoodMember key={`cw${z}`} pos={[-preset.widthM / 2, eaveY - 0.04, z]} size={[0.09, 0.12, 0.045]} damage={damage * 0.6} seed={i + 260} />,
            <WoodMember key={`ce${z}`} pos={[preset.widthM / 2, eaveY - 0.04, z]} size={[0.09, 0.12, 0.045]} damage={damage * 0.6} seed={i + 290} />,
          ])}

          <WoodMember pos={[0, 0.05, -preset.depthM / 2]} size={[preset.widthM, 0.08, 0.09]} damage={damage * 0.75} seed={121} />
          <WoodMember pos={[0, preset.heightM - 0.05, -preset.depthM / 2]} size={[preset.widthM, 0.08, 0.09]} damage={damage * 0.9} seed={122} />
          <WoodMember pos={[0, 0.05, preset.depthM / 2]} size={[preset.widthM, 0.08, 0.09]} damage={damage * 0.78} seed={123} />
          <WoodMember pos={[0, preset.heightM - 0.05, preset.depthM / 2]} size={[preset.widthM, 0.08, 0.09]} damage={damage * 0.93} seed={124} />
          <WoodMember pos={[0, 0.05, 0]} size={[preset.widthM, 0.08, 0.045]} damage={damage * 0.7} seed={125} />
          <WoodMember pos={[0, preset.heightM - 0.05, 0]} size={[preset.widthM, 0.08, 0.045]} damage={damage * 0.85} seed={126} />
          <WoodMember pos={[-preset.widthM / 2, 0.05, 0]} size={[0.045, 0.08, preset.depthM]} damage={damage * 0.7} seed={127} />
          <WoodMember pos={[preset.widthM / 2, 0.05, 0]} size={[0.045, 0.08, preset.depthM]} damage={damage * 0.72} seed={128} />
        </group>

        {showPanels ? <WoodWallLayers preset={preset} damage={damage} /> : null}
        {showRoof ? <WoodRoofV2 preset={preset} damage={damage} showCover={showPanels} /> : null}
      </group>

      {showLabels ? (
        <Html center distanceFactor={11} position={[0, preset.heightM + 1.55, 0]}>
          <div className="rounded-full border border-amber-200/30 bg-black/80 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] text-amber-100">
            Madera · marco plataforma visual
          </div>
        </Html>
      ) : null}
    </group>
  );
}

function WoodMember({
  pos,
  size,
  damage = 0,
  seed = 0,
}: {
  pos: [number, number, number];
  size: [number, number, number];
  damage?: number;
  seed?: number;
}) {
  const stressed = damage > 0.36 && (seed % 3 === 0 || damage > 0.78);
  const broken = damage > 0.72 && size[1] > 0.7 && seed % 5 === 0;
  const color = stressed ? '#ff3b30' : '#bc8651';
  const tilt = stressed ? (seed % 2 ? 1 : -1) * damage * 0.045 : 0;

  if (broken) {
    const h = size[1] * 0.46;
    return (
      <group position={pos}>
        <mesh position={[0, -size[1] * 0.26, 0]} rotation={[0, 0, tilt - 0.055]} castShadow>
          <boxGeometry args={[size[0], h, size[2]]} />
          <meshStandardMaterial color="#ff332f" roughness={0.68} />
        </mesh>
        <mesh position={[0.035, size[1] * 0.26, 0]} rotation={[0, 0, tilt + 0.065]} castShadow>
          <boxGeometry args={[size[0], h, size[2]]} />
          <meshStandardMaterial color="#ff332f" roughness={0.68} />
        </mesh>
        <mesh position={[0.018, 0, 0]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#ff1100" emissive="#ff1100" emissiveIntensity={1.7} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={pos} rotation={[0, 0, tilt]} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.72}
        emissive={stressed ? '#6b0905' : '#000000'}
        emissiveIntensity={stressed ? 0.45 : 0}
      />
    </mesh>
  );
}

function WoodWallLayers({ preset, damage }: { preset: MetalconHousePreset; damage: number }) {
  const sidingColor = damage > 0.7 ? '#ff4438' : '#9b7b52';
  const osbColor = damage > 0.65 ? '#e8a830' : '#d4b87a';
  const tyvekColor = '#f0ece4';
  const w = preset.widthM;
  const d = preset.depthM;
  const h = preset.heightM;

  const walls = useMemo(() => [
    { face: 'north' as const, pos: [0, h / 2, -d / 2 - 0.05] as [number, number, number], size: [w, h, 0.014] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
    { face: 'south' as const, pos: [0, h / 2, d / 2 + 0.05] as [number, number, number], size: [w, h, 0.014] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
    { face: 'west' as const, pos: [-w / 2 - 0.05, h / 2, 0] as [number, number, number], size: [0.014, h, d] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
    { face: 'east' as const, pos: [w / 2 + 0.05, h / 2, 0] as [number, number, number], size: [0.014, h, d] as [number, number, number], rot: [0, 0, 0] as [number, number, number] },
  ], [w, d, h]);

  return (
    <group>
      {walls.map(({ face, pos, size }) => {
        const isHorizontal = face === 'north' || face === 'south';
        const outward = face === 'north' ? -1 : face === 'south' ? 1 : face === 'east' ? 1 : -1;
        return (
          <group key={face}>
            <mesh position={[
              isHorizontal ? pos[0] : pos[0] + outward * 0.005,
              pos[1],
              isHorizontal ? pos[2] + outward * 0.005 : pos[2],
            ]} castShadow receiveShadow>
              <boxGeometry args={size} />
              <meshStandardMaterial color={sidingColor} roughness={0.78} transparent opacity={0.92} />
            </mesh>
            <mesh position={[
              isHorizontal ? pos[0] : pos[0] - outward * 0.008,
              pos[1],
              isHorizontal ? pos[2] - outward * 0.008 : pos[2],
            ]}>
              <boxGeometry args={[size[0] + 0.002, size[1] + 0.002, 0.004]} />
              <meshStandardMaterial color={tyvekColor} roughness={0.5} transparent opacity={0.4} />
            </mesh>
            <mesh position={[
              isHorizontal ? pos[0] : pos[0] - outward * 0.016,
              pos[1],
              isHorizontal ? pos[2] - outward * 0.016 : pos[2],
            ]}>
              <boxGeometry args={[size[0] + 0.004, size[1] + 0.004, 0.012]} />
              <meshStandardMaterial color={osbColor} roughness={0.82} transparent opacity={0.82} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function WoodRoofV2({
  preset,
  damage,
  showCover,
}: {
  preset: MetalconHousePreset;
  damage: number;
  showCover: boolean;
}) {
  const eaveOverhang = 0.42;
  const run = preset.depthM / 2 + eaveOverhang;
  const roofRise = Math.max(0.7, run * 0.3);
  const eaveY = preset.heightM + 0.08;
  const ridgeY = eaveY + roofRise;
  const panelWidth = preset.widthM + eaveOverhang * 2;
  const trussCount = Math.max(3, Math.ceil(preset.widthM / 0.6));
  const trussSpacing = preset.widthM / trussCount;
  const slope = Math.sqrt(run * run + roofRise * roofRise);
  const roofAngle = Math.atan2(roofRise, run);
  const midY = eaveY + roofRise / 2;

  const trussXs = useMemo(
    () => Array.from({ length: trussCount + 1 }, (_, i) => -preset.widthM / 2 + i * trussSpacing),
    [preset.widthM, trussCount, trussSpacing],
  );

  const purlinFractions = [0.78, 0.52, 0.26];
  const coverColor = damage > 0.76 ? '#d92f2a' : '#704a34';
  const ridgeColor = damage > 0.7 ? '#ff3b30' : '#9d6f42';
  const purlinColor = damage > 0.65 ? '#e8a830' : '#9d6f42';

  return (
    <group>
      {trussXs.map((x, i) => {
        const stressed = damage > 0.48 && (i % 4 === 1 || damage > 0.82);
        const broken = damage > 0.76 && i % 5 === 2;
        return (
          <group key={x}>
            <WoodBeam from={[x, eaveY, -run]} to={[x, ridgeY, 0]} damage={stressed ? damage : 0} broken={broken} />
            <WoodBeam from={[x, eaveY, run]} to={[x, ridgeY, 0]} damage={stressed ? damage * 0.95 : 0} broken={broken && damage > 0.86} />
            <WoodBeam from={[x, eaveY, -run]} to={[x, eaveY, run]} damage={stressed ? damage * 0.7 : 0} />
            <WoodBeam from={[x, eaveY, 0]} to={[x, ridgeY, 0]} damage={stressed ? damage * 0.8 : 0} />
            <WoodBeam from={[x, eaveY, -run * 0.5]} to={[x, ridgeY - 0.06, 0]} damage={stressed ? damage * 0.75 : 0} />
            <WoodBeam from={[x, eaveY, run * 0.5]} to={[x, ridgeY - 0.06, 0]} damage={stressed ? damage * 0.75 : 0} />

            {[0.15, 0.38, 0.62, 0.85].map((frac, vi) => {
              const zFront = -run + frac * run;
              const zBack = run - frac * run;
              const yLine = eaveY + roofRise * frac * 0.65;
              return (
                <group key={`strut-${vi}`}>
                  <WoodMember pos={[x, yLine, zFront]} size={[0.04, 0.04, 0.04]} damage={damage * 0.5} seed={i * 10 + vi} />
                  <WoodMember pos={[x, yLine, zBack]} size={[0.04, 0.04, 0.04]} damage={damage * 0.5} seed={i * 10 + vi + 50} />
                </group>
              );
            })}
          </group>
        );
      })}

      <mesh position={[0, ridgeY, 0]} castShadow>
        <boxGeometry args={[panelWidth + 0.06, 0.09, 0.09]} />
        <meshStandardMaterial color={ridgeColor} roughness={0.68} />
      </mesh>

      {purlinFractions.map((f, i) => {
        const y = eaveY + roofRise * (1 - f);
        return (
          <group key={`purlin-row-${i}`}>
            <mesh position={[0, y + 0.02, -run * f]}>
              <boxGeometry args={[panelWidth, 0.05, 0.07]} />
              <meshStandardMaterial color={purlinColor} roughness={0.72} />
            </mesh>
            <mesh position={[0, y + 0.02, run * f]}>
              <boxGeometry args={[panelWidth, 0.05, 0.07]} />
              <meshStandardMaterial color={purlinColor} roughness={0.72} />
            </mesh>
          </group>
        );
      })}

      {showCover ? (
        <>
          <mesh position={[0, midY + 0.07, -run / 2]} rotation={[-roofAngle, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[panelWidth, 0.04, slope]} />
            <meshStandardMaterial color={coverColor} roughness={0.82} transparent opacity={0.72} />
          </mesh>
          <mesh position={[0, midY + 0.07, run / 2]} rotation={[roofAngle, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[panelWidth, 0.04, slope]} />
            <meshStandardMaterial color={coverColor} roughness={0.82} transparent opacity={0.72} />
          </mesh>
        </>
      ) : null}

      <mesh position={[-preset.widthM / 2 - eaveOverhang, eaveY - 0.02, 0]} castShadow>
        <boxGeometry args={[0.06, 0.08, roofRise * 0.4]} />
        <meshStandardMaterial color={ridgeColor} roughness={0.7} />
      </mesh>
      <mesh position={[preset.widthM / 2 + eaveOverhang, eaveY - 0.02, 0]} castShadow>
        <boxGeometry args={[0.06, 0.08, roofRise * 0.4]} />
        <meshStandardMaterial color={ridgeColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

function WoodBeam({
  from,
  to,
  damage = 0,
  broken = false,
}: {
  from: [number, number, number];
  to: [number, number, number];
  damage?: number;
  broken?: boolean;
}) {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const mid = a.clone().lerp(b, 0.5);
  if (broken) {
    const gap = new Vector3(0.035, -0.055, 0.018);
    return (
      <>
        <BeamSegment from={a} to={mid.clone().add(gap)} color="#ff342f" />
        <BeamSegment from={mid.clone().sub(gap)} to={b} color="#ff342f" />
      </>
    );
  }
  return <BeamSegment from={a} to={b} color={damage > 0.42 ? '#ff3b30' : '#a87545'} />;
}

function BeamSegment({ from, to, color }: { from: Vector3; to: Vector3; color: string }) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <boxGeometry args={[0.055, len, 0.075]} />
      <meshStandardMaterial
        color={color}
        roughness={0.68}
        emissive={color === '#ff3b30' || color === '#ff342f' ? '#690704' : '#000'}
        emissiveIntensity={color.startsWith('#ff3') ? 0.4 : 0}
      />
    </mesh>
  );
}
