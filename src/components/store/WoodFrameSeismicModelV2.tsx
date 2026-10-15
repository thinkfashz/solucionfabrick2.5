'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Quaternion, Vector3 } from 'three';
import type { Group } from 'three';
import type { MetalconHousePreset } from '@/lib/metalconAssembly';
import WoodGutterDetails from './WoodGutterDetails';
import { perimeterWallOpenings, smoothstep01, wallCutSegments, type WallFace, type WallOpeningSlice } from './metalconOpeningGeometry';
import { useTextureMaterial, useViewerTextures, usePbrMaps } from './monitoring/useViewerTextures';

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
    // Envolvente suave (smoothstep) al iniciar/detener + damping exponencial: sin saltos bruscos.
    const envelope = active ? smoothstep01((progress - 0.42) / 0.16) * smoothstep01((0.94 - progress) / 0.12) : 0;
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

        {showPanels ? <WoodFloor preset={preset} /> : null}

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
        {/* Canaleta + bajantes del alero frontal/trasero (solo con cubierta montada). */}
        {showRoof ? (
          <WoodGutterDetails
            eaveY={preset.heightM + 0.08}
            run={preset.depthM / 2 + 0.42}
            panelWidth={preset.widthM + 0.84}
            showLabel={showLabels}
          />
        ) : null}
      </group>

      {showLabels ? (
        <Html center distanceFactor={11} position={[0, preset.heightM + 1.55, 0]}>
          <div className="w-max whitespace-nowrap rounded-full border border-amber-200/30 bg-black/80 px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-[.12em] text-amber-100">
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
  // Siding con textura de listones de madera; el daño teñe el material (antes de
  // texturizar el color era '#9b7b52' / '#ff4438').
  const textures = useViewerTextures();
  const pineMaps = usePbrMaps('woodPine');
  const sidingMat = useTextureMaterial(
    pineMaps.color ?? textures.extMadera,
    {
      color: damage > 0.7 ? '#ff4438' : (pineMaps.color ? '#c9b49d' : (textures.extMadera ? '#c9b49d' : '#9b7b52')),
      roughness: 0.85,
      metalness: 0,
      envMapIntensity: 0.65,
      normalMap: pineMaps.normal,
      roughnessMap: pineMaps.roughness,
    },
    0.92,
  );
  const osbColor = damage > 0.65 ? '#e8a830' : '#d4b87a';
  const tyvekColor = '#f0ece4';
  const w = preset.widthM;
  const d = preset.depthM;
  const h = preset.heightM;

  const walls = useMemo(() => [
    { face: 'n' as WallFace, pos: [0, h / 2, -d / 2 - 0.05] as [number, number, number], rot: 0 as const, outward: -1 as const },
    { face: 's' as WallFace, pos: [0, h / 2, d / 2 + 0.05] as [number, number, number], rot: 0 as const, outward: 1 as const },
    { face: 'w' as WallFace, pos: [-w / 2 - 0.05, h / 2, 0] as [number, number, number], rot: Math.PI / 2, outward: -1 as const },
    { face: 'e' as WallFace, pos: [w / 2 + 0.05, h / 2, 0] as [number, number, number], rot: Math.PI / 2, outward: 1 as const },
  ], [w, d, h]);

  return (
    <group>
      {walls.map(({ face, pos, rot, outward }) => {
        const length = face === 'n' || face === 's' ? w : d;
        // Rotación Y=π/2 invierte el eje u local: espejamos los vanos para que caigan en su mundo real.
        const mirror = rot !== 0;
        const openings = perimeterWallOpenings(preset, face).map((opening) =>
          mirror ? { ...opening, u0: -opening.u1, u1: -opening.u0 } : opening,
        );
        const segs = wallCutSegments(length, h, openings);
        return (
          <group key={face} position={pos} rotation={[0, rot, 0]}>
            {segs.map((segment, index) => {
              if (segment.w <= 0.02 || segment.h <= 0.02) return null;
              return (
                <group key={`seg-${index}`}>
                  <mesh position={[segment.cx, segment.cy - h / 2 + 0, outward * 0.005]} castShadow receiveShadow material={sidingMat}>
                    <boxGeometry args={[segment.w, segment.h, 0.014]} />
                  </mesh>
                  <mesh position={[segment.cx, segment.cy - h / 2 + 0, -outward * 0.008]}>
                    <boxGeometry args={[segment.w + 0.002, segment.h + 0.002, 0.004]} />
                    <meshStandardMaterial color={tyvekColor} roughness={0.5} transparent opacity={0.4} />
                  </mesh>
                  <mesh position={[segment.cx, segment.cy - h / 2 + 0, -outward * 0.016]}>
                    <boxGeometry args={[segment.w + 0.004, segment.h + 0.004, 0.012]} />
                    <meshStandardMaterial color={osbColor} roughness={0.82} transparent opacity={0.82} />
                  </mesh>
                </group>
              );
            })}
            {openings.map((opening, index) => (
              <WoodOpeningFill key={`fill-${face}-${index}`} opening={opening} yOffset={-h / 2} />
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Hoja de puerta o vidrio + marco simple dentro de un vano (espacio local de la pared: u sobre x, y relativa al centro del muro). */
function WoodOpeningFill({ opening, yOffset = 0 }: { opening: WallOpeningSlice; yOffset?: number }) {
  const w = opening.u1 - opening.u0;
  const h = opening.y1 - opening.y0;
  if (w <= 0.06 || h <= 0.06) return null;
  const u = (opening.u0 + opening.u1) / 2;
  const cy = (opening.y0 + opening.y1) / 2 + yOffset;
  const frame = 0.035;
  return (
    <group position={[u, cy, 0]}>
      {opening.kind === 'door' ? (
        <>
          <mesh castShadow>
            <boxGeometry args={[Math.max(0.04, w - 0.06), Math.max(0.04, h - 0.02), 0.03]} />
            <meshStandardMaterial color="#6e4f33" roughness={0.62} />
          </mesh>
          <mesh position={[Math.max(0.04, w - 0.06) / 2 - 0.09, 0, 0.022]}>
            <sphereGeometry args={[0.018, 10, 8]} />
            <meshStandardMaterial color="#c9ccd0" metalness={0.6} roughness={0.3} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, h / 2 - frame / 2, 0]}>
            <boxGeometry args={[w - 0.02, frame, 0.028]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.12} />
          </mesh>
          <mesh position={[0, -h / 2 + frame / 2, 0]}>
            <boxGeometry args={[w - 0.02, frame, 0.028]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.12} />
          </mesh>
          <mesh position={[-w / 2 + frame / 2, 0, 0]}>
            <boxGeometry args={[frame, h - 0.02, 0.028]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.12} />
          </mesh>
          <mesh position={[w / 2 - frame / 2, 0, 0]}>
            <boxGeometry args={[frame, h - 0.02, 0.028]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.4} metalness={0.12} />
          </mesh>
          <mesh>
            <boxGeometry args={[Math.max(0.05, w - 0.09), Math.max(0.05, h - 0.09), 0.01]} />
            <meshPhysicalMaterial color="#d7ecf7" roughness={0.08} metalness={0} transparent opacity={0.35} depthWrite={false} side={DoubleSide} />
          </mesh>
        </>
      )}
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
  // Cubierta con textura de calamina; el daño teñe el material.
  const textures = useViewerTextures();
  const coverMat = useTextureMaterial(
    textures.techoCalamina,
    {
      color: textures.techoCalamina ? (damage > 0.76 ? '#ff5a48' : '#b08a68') : (damage > 0.76 ? '#d92f2a' : '#704a34'),
      roughness: 0.45,
      metalness: 0.6,
      envMapIntensity: 0.75,
    },
    1,
  );
  const ridgeColor = damage > 0.7 ? '#ff3b30' : '#9d6f42';
  const purlinColor = damage > 0.65 ? '#e8a830' : '#9d6f42';

  return (
    <group>
      {showCover
        ? trussXs.map((x, i) => {
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
          })
        : null}

      {/* Estructura mínima visible aunque se oculte la cubierta: cumbrera + cabios de borde (sin "palitos"). */}
      {!showCover ? (
        <>
          {[trussXs[0], trussXs[trussXs.length - 1]].map((x, i) => (
            <group key={`edge-truss-${i}`}>
              <WoodBeam from={[x, eaveY, -run]} to={[x, ridgeY, 0]} damage={0} />
              <WoodBeam from={[x, eaveY, run]} to={[x, ridgeY, 0]} damage={0} />
              <WoodBeam from={[x, eaveY, -run]} to={[x, eaveY, run]} damage={0} />
            </group>
          ))}
        </>
      ) : null}

      <mesh position={[0, ridgeY, 0]} castShadow>
        <boxGeometry args={[panelWidth + 0.06, 0.09, 0.09]} />
        <meshStandardMaterial color={ridgeColor} roughness={0.68} />
      </mesh>

      {showCover
        ? purlinFractions.map((f, i) => {
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
          })
        : null}

      {showCover ? (
        <>
          <mesh position={[0, midY + 0.07, -run / 2]} rotation={[-roofAngle, 0, 0]} castShadow receiveShadow material={coverMat}>
            <boxGeometry args={[panelWidth, 0.04, slope]} />
          </mesh>
          <mesh position={[0, midY + 0.07, run / 2]} rotation={[roofAngle, 0, 0]} castShadow receiveShadow material={coverMat}>
            <boxGeometry args={[panelWidth, 0.04, slope]} />
          </mesh>
          {/* Cumbrera exterior opaca */}
          <mesh position={[0, ridgeY + 0.08, 0]} castShadow>
            <boxGeometry args={[panelWidth + 0.08, 0.06, 0.18]} />
            <meshStandardMaterial color={ridgeColor} roughness={0.7} />
          </mesh>
          {/* Frontones forrados (X = ±panelWidth/2): prisma triangular opaco con
              el siding de la casa que cierra el triángulo cumbrera–alero y tapa
              las cerchas expuestas (mismo cierre que RoofGable en Metalcon). */}
          <WoodGablePanel x={-panelWidth / 2} run={run} eaveY={eaveY} ridgeY={ridgeY} damage={damage} />
          <WoodGablePanel x={panelWidth / 2} run={run} eaveY={eaveY} ridgeY={ridgeY} damage={damage} />
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

/** Entrepiso de madera del modelo de madera (asentado sobre las bottom plates, y=0.09). */
function WoodFloor({ preset }: { preset: MetalconHousePreset }) {
  const textures = useViewerTextures();
  const oakMaps = usePbrMaps('woodOak');
  const material = useTextureMaterial(
    oakMaps.color ?? textures.pisoMadera,
    { color: oakMaps.color ? '#ffffff' : (textures.pisoMadera ? '#ffffff' : '#cbb89a'), roughness: 0.55, metalness: 0, envMapIntensity: 0.65, normalMap: oakMaps.normal, roughnessMap: oakMaps.roughness },
    1,
  );
  return (
    <mesh position={[0, 0.105, 0]} receiveShadow material={material}>
      <boxGeometry args={[preset.widthM - 0.12, 0.03, preset.depthM - 0.12]} />
    </mesh>
  );
}

/**
 * Frontón forrado de la casa de madera: prisma triangular opaco (~9 cm de
 * espesor) que cierra el hueco cumbrera–alero en el borde de la cubierta
 * (X = ±panelWidth/2), tapando las cerchas/estantes expuestos.
 * - Base exacta en la línea de alero (z = ±run) y ápice 8 cm sobre la cumbrera
 *   (queda oculto bajo el tapa-cumbrera, sin z-fighting con la cubierta).
 * - Acabado con el mismo siding de listones de la casa (opaco).
 * Misma técnica que RoofGable en MetalconLabFinishesV2.tsx.
 */
function WoodGablePanel({
  x,
  run,
  eaveY,
  ridgeY,
  damage,
}: {
  x: number;
  run: number;
  eaveY: number;
  ridgeY: number;
  damage: number;
}) {
  const sign = x < 0 ? -1 : 1;
  const halfThick = 0.045;
  // Cara exterior 2,5 cm por dentro del borde de la cubierta para no coplanear
  // con el canto de las planchas (evita parpadeo/z-fighting).
  const xOuter = sign * (Math.abs(x) - 0.025);
  const xInner = xOuter - sign * halfThick;
  const yBase = eaveY;
  const yApex = ridgeY + 0.08;
  const textures = useViewerTextures();
  const pineMaps = usePbrMaps('woodPine');
  const material = useTextureMaterial(
    pineMaps.color ?? textures.extMadera,
    {
      color: damage > 0.7 ? '#ff4438' : pineMaps.color || textures.extMadera ? '#c9b49d' : '#9b7b52',
      roughness: 0.85,
      metalness: 0,
      envMapIntensity: 0.65,
      normalMap: pineMaps.normal,
      roughnessMap: pineMaps.roughness,
      side: DoubleSide,
    },
    1,
  );
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const outerA: [number, number, number] = [xOuter, yBase, -run];
    const outerB: [number, number, number] = [xOuter, yBase, run];
    const outerC: [number, number, number] = [xOuter, yApex, 0];
    const innerA: [number, number, number] = [xInner, yBase, -run];
    const innerB: [number, number, number] = [xInner, yBase, run];
    const innerC: [number, number, number] = [xInner, yApex, 0];
    const positions: number[] = [];
    const tri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
      positions.push(...a, ...b, ...c);
    };
    // Caras grandes del prisma (DoubleSide cubre ambos sentidos de normal).
    tri(outerA, outerB, outerC);
    tri(innerB, innerA, innerC);
    // Canto perimetral: base del alero y los dos cantos de faldón.
    tri(innerA, outerB, innerB); tri(outerB, outerA, innerA);
    tri(innerA, innerC, outerA); tri(innerC, outerC, outerA);
    tri(innerB, outerC, innerC); tri(outerB, innerB, outerC);
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    // UV planos: u a lo largo del alero, v desde alero hasta cumbrera.
    const uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      uvs.push((positions[i + 2] + run) / (2 * run), (positions[i + 1] - yBase) / (yApex - yBase));
    }
    g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [run, xOuter, xInner, yBase, yApex]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
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
