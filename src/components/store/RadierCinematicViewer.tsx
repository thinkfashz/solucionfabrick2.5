'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import {
  Layers3,
  Move3D,
  Pause,
  Play,
  Rotate3D,
  Sparkles,
} from 'lucide-react';
import * as THREE from 'three';
import type { RadierShape } from '@/lib/radierCalculator';

type LayerId = 'concrete' | 'mesh' | 'barrier' | 'gravel' | 'base' | 'soil';
type Piece = { x: number; z: number; w: number; d: number; key: string };

type Props = {
  length: number;
  width: number;
  thickness: number;
  baseDepth: number;
  gravelDepth: number;
  shape: RadierShape;
  activeLayer?: LayerId;
  stakes?: number;
};

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const FALLBACK = `${CLOUD}/c_limit,w_1100/f_auto/q_auto/v1788934789/radier-cutaway.png`;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function layout(shape: RadierShape, length: number, width: number): Piece[] {
  const l = Math.max(.5, length);
  const w = Math.max(.5, width);
  if (shape === 'rectangular') return [{ x: 0, z: 0, w: l, d: w, key: 'rect' }];
  if (shape === 'l') {
    const vertical = l * .45;
    const returnDepth = w * .68;
    return [
      { x: -l / 2 + vertical / 2, z: 0, w: vertical, d: w, key: 'l-main' },
      { x: -l / 2 + vertical + (l - vertical) / 2, z: w / 2 - returnDepth / 2, w: l - vertical, d: returnDepth, key: 'l-return' },
    ];
  }
  if (shape === 'u') {
    const leg = l * .24;
    const bridgeDepth = w * .46;
    return [
      { x: -l / 2 + leg / 2, z: 0, w: leg, d: w, key: 'u-left' },
      { x: l / 2 - leg / 2, z: 0, w: leg, d: w, key: 'u-right' },
      { x: 0, z: w / 2 - bridgeDepth / 2, w: l - leg * 2, d: bridgeDepth, key: 'u-back' },
    ];
  }
  if (shape === 't') {
    const capDepth = w * .28;
    const stemWidth = l * .5;
    const stemDepth = w - capDepth;
    return [
      { x: 0, z: -w / 2 + capDepth / 2, w: l, d: capDepth, key: 't-cap' },
      { x: 0, z: -w / 2 + capDepth + stemDepth / 2, w: stemWidth, d: stemDepth, key: 't-stem' },
    ];
  }
  if (shape === 'h') {
    const column = l * .22;
    const bridgeDepth = w * .43;
    return [
      { x: -l / 2 + column / 2, z: 0, w: column, d: w, key: 'h-left' },
      { x: l / 2 - column / 2, z: 0, w: column, d: w, key: 'h-right' },
      { x: 0, z: 0, w: l - column * 2, d: bridgeDepth, key: 'h-bridge' },
    ];
  }
  const capDepth = w * .18;
  const stemWidth = l * .44;
  return [
    { x: 0, z: -w / 2 + capDepth / 2, w: l, d: capDepth, key: 'i-top' },
    { x: 0, z: 0, w: stemWidth, d: w - capDepth * 2, key: 'i-stem' },
    { x: 0, z: w / 2 - capDepth / 2, w: l, d: capDepth, key: 'i-bottom' },
  ];
}

function CameraFit({ maxDim }: { maxDim: number }) {
  const { camera } = useThree();
  useEffect(() => {
    const distance = Math.max(5.8, maxDim * 1.18);
    camera.position.set(distance * .92, distance * .62, distance * 1.02);
    camera.near = .05;
    camera.far = Math.max(80, distance * 18);
    camera.lookAt(0, .25, 0);
    camera.updateProjectionMatrix();
  }, [camera, maxDim]);
  return null;
}

function AnimatedLayer({ progress, y, children }: { progress: number; y: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const target = y + (1 - progress) * .38;
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, target, .12);
    ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, Math.max(.02, progress), .14);
    ref.current.visible = progress > .015;
  });
  return <group ref={ref}>{children}</group>;
}

function SolidPieces({ pieces, height, color, roughness, metalness = 0, active = false }: { pieces: Piece[]; height: number; color: string; roughness: number; metalness?: number; active?: boolean }) {
  return <>{pieces.map((piece) => (
    <mesh key={piece.key} position={[piece.x, 0, piece.z]} castShadow receiveShadow>
      <boxGeometry args={[piece.w, height, piece.d]} />
      <meshPhysicalMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        clearcoat={active ? .22 : .04}
        clearcoatRoughness={.5}
        emissive={active ? '#5c3d00' : '#000000'}
        emissiveIntensity={active ? .18 : 0}
      />
    </mesh>
  ))}</>;
}

function BarrierPieces({ pieces, active }: { pieces: Piece[]; active: boolean }) {
  return <>{pieces.map((piece) => (
    <mesh key={piece.key} position={[piece.x, 0, piece.z]} receiveShadow>
      <boxGeometry args={[piece.w, .012, piece.d]} />
      <meshPhysicalMaterial color={active ? '#52ddff' : '#1fa3d4'} roughness={.18} metalness={.08} transparent opacity={.78} transmission={.05} />
    </mesh>
  ))}</>;
}

function SteelMesh({ pieces, active }: { pieces: Piece[]; active: boolean }) {
  return <>{pieces.map((piece) => {
    const countX = Math.max(4, Math.min(13, Math.ceil(piece.d / .45)));
    const countZ = Math.max(4, Math.min(13, Math.ceil(piece.w / .45)));
    const rodsX = Array.from({ length: countX }, (_, index) => -piece.d / 2 + (piece.d * index) / Math.max(1, countX - 1));
    const rodsZ = Array.from({ length: countZ }, (_, index) => -piece.w / 2 + (piece.w * index) / Math.max(1, countZ - 1));
    return <group key={piece.key} position={[piece.x, 0, piece.z]}>
      {rodsX.map((z, index) => <mesh key={`x-${index}`} position={[0, 0, z]} castShadow><boxGeometry args={[piece.w, .022, .018]} /><meshStandardMaterial color={active ? '#ffd76a' : '#8f969e'} metalness={.82} roughness={.28} /></mesh>)}
      {rodsZ.map((x, index) => <mesh key={`z-${index}`} position={[x, .012, 0]} castShadow><boxGeometry args={[.018, .022, piece.d]} /><meshStandardMaterial color={active ? '#ffd76a' : '#8f969e'} metalness={.82} roughness={.28} /></mesh>)}
    </group>;
  })}</>;
}

function Formwork({ length, width, concreteY, concreteHeight, progress, exploded }: { length: number; width: number; concreteY: number; concreteHeight: number; progress: number; exploded: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.visible = progress > .02;
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, (1 - progress) * .35 + (exploded ? .08 : 0), .12);
    ref.current.scale.y = THREE.MathUtils.lerp(ref.current.scale.y, Math.max(.02, progress), .14);
  });
  const boardH = Math.max(.22, concreteHeight + .12);
  const y = concreteY;
  const board = .055;
  const stakeH = .62;
  const stakeCountX = Math.max(3, Math.min(8, Math.ceil(length / 1.5) + 1));
  const stakeCountZ = Math.max(3, Math.min(8, Math.ceil(width / 1.5) + 1));
  const xPoints = Array.from({ length: stakeCountX }, (_, i) => -length / 2 + (length * i) / Math.max(1, stakeCountX - 1));
  const zPoints = Array.from({ length: stakeCountZ }, (_, i) => -width / 2 + (width * i) / Math.max(1, stakeCountZ - 1));
  return <group ref={ref}>
    <group position={[0, y, 0]}>
      {[[-width / 2 - board, 0], [width / 2 + board, 0]].map(([z], i) => <mesh key={`board-x-${i}`} position={[0, 0, z]} castShadow><boxGeometry args={[length + .12, boardH, board]} /><meshPhysicalMaterial color="#d47a2f" roughness={.68} clearcoat={.05} /></mesh>)}
      {[[-length / 2 - board, 0], [length / 2 + board, 0]].map(([x], i) => <mesh key={`board-z-${i}`} position={[x, 0, 0]} castShadow><boxGeometry args={[board, boardH, width + .12]} /><meshPhysicalMaterial color="#c76d28" roughness={.7} clearcoat={.05} /></mesh>)}
      {xPoints.flatMap((x) => [
        <mesh key={`stake-n-${x}`} position={[x, -.12, -width / 2 - .12]} castShadow><boxGeometry args={[.055, stakeH, .055]} /><meshStandardMaterial color="#eb8534" roughness={.62} /></mesh>,
        <mesh key={`stake-s-${x}`} position={[x, -.12, width / 2 + .12]} castShadow><boxGeometry args={[.055, stakeH, .055]} /><meshStandardMaterial color="#eb8534" roughness={.62} /></mesh>,
      ])}
      {zPoints.flatMap((z) => [
        <mesh key={`stake-w-${z}`} position={[-length / 2 - .12, -.12, z]} castShadow><boxGeometry args={[.055, stakeH, .055]} /><meshStandardMaterial color="#eb8534" roughness={.62} /></mesh>,
        <mesh key={`stake-e-${z}`} position={[length / 2 + .12, -.12, z]} castShadow><boxGeometry args={[.055, stakeH, .055]} /><meshStandardMaterial color="#eb8534" roughness={.62} /></mesh>,
      ])}
    </group>
  </group>;
}

function Scene({ length, width, thickness, baseDepth, gravelDepth, shape, activeLayer = 'concrete', timeline, exploded, autoRotate }: Props & { timeline: number; exploded: boolean; autoRotate: boolean }) {
  const pieces = useMemo(() => layout(shape, length, width), [shape, length, width]);
  const maxDim = Math.max(length, width);
  const soilH = .16;
  const baseH = Math.max(.04, baseDepth / 100);
  const gravelH = Math.max(.035, gravelDepth / 100);
  const barrierH = .012;
  const meshH = .026;
  const concreteH = Math.max(.05, thickness / 100);
  const gap = exploded ? Math.max(.085, maxDim * .014) : 0;

  const levels = {
    soil: soilH / 2,
    base: soilH + baseH / 2 + gap,
    gravel: soilH + baseH + gravelH / 2 + gap * 2,
    barrier: soilH + baseH + gravelH + barrierH / 2 + gap * 3,
    mesh: soilH + baseH + gravelH + barrierH + meshH / 2 + gap * 4,
    concrete: soilH + baseH + gravelH + barrierH + meshH + concreteH / 2 + gap * 5,
  };
  const phase = (start: number) => clamp01((timeline - start) / 10);
  const top = levels.concrete + concreteH / 2;

  return <>
    <color attach="background" args={['#05090c']} />
    <fog attach="fog" args={['#05090c', maxDim * 2.6, maxDim * 7]} />
    <CameraFit maxDim={maxDim} />
    <ambientLight intensity={.42} />
    <hemisphereLight intensity={.7} color="#dff4ff" groundColor="#3a2315" />
    <directionalLight position={[maxDim * .7, maxDim * 1.25, maxDim * .8]} intensity={3.1} color="#fff2d3" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-.00015} />
    <directionalLight position={[-maxDim, maxDim * .5, -maxDim * .6]} intensity={1.05} color="#63d8ff" />
    <pointLight position={[0, maxDim * .65, -maxDim]} intensity={1.4} color="#ff9b43" distance={maxDim * 4} />

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.085, 0]} receiveShadow>
      <planeGeometry args={[maxDim * 3.1, maxDim * 2.5, 1, 1]} />
      <meshStandardMaterial color="#15100d" roughness={.96} />
    </mesh>
    <gridHelper args={[Math.ceil(maxDim * 2.4), Math.max(12, Math.ceil(maxDim * 2.4)), '#3b4b53', '#151d21']} position={[0, -.078, 0]} />

    <AnimatedLayer progress={phase(0)} y={levels.soil}><SolidPieces pieces={pieces} height={soilH} color={activeLayer === 'soil' ? '#7d4b2e' : '#493225'} roughness={.96} active={activeLayer === 'soil'} /></AnimatedLayer>
    <AnimatedLayer progress={phase(14)} y={levels.base}><SolidPieces pieces={pieces} height={baseH} color={activeLayer === 'base' ? '#9b6941' : '#66503a'} roughness={.9} active={activeLayer === 'base'} /></AnimatedLayer>
    <AnimatedLayer progress={phase(29)} y={levels.gravel}><SolidPieces pieces={pieces} height={gravelH} color={activeLayer === 'gravel' ? '#c7b59a' : '#8e8171'} roughness={.88} active={activeLayer === 'gravel'} /></AnimatedLayer>
    <AnimatedLayer progress={phase(44)} y={levels.barrier}><BarrierPieces pieces={pieces} active={activeLayer === 'barrier'} /></AnimatedLayer>
    <AnimatedLayer progress={phase(58)} y={levels.mesh}><SteelMesh pieces={pieces} active={activeLayer === 'mesh'} /></AnimatedLayer>
    <AnimatedLayer progress={phase(73)} y={levels.concrete}><SolidPieces pieces={pieces} height={concreteH} color={activeLayer === 'concrete' ? '#e8ebed' : '#c8cdd0'} roughness={.63} metalness={.015} active={activeLayer === 'concrete'} /></AnimatedLayer>
    <Formwork length={length} width={width} concreteY={levels.concrete} concreteHeight={concreteH} progress={phase(87)} exploded={exploded} />

    <Html position={[0, top + .5, -width / 2 - .34]} center className="pointer-events-none select-none">
      <div className="whitespace-nowrap rounded-full border border-cyan-300/35 bg-[#031016]/88 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-cyan-200 shadow-xl backdrop-blur">{length.toLocaleString('es-CL', { maximumFractionDigits: 2 })} m · largo</div>
    </Html>
    <Html position={[-length / 2 - .36, top + .34, 0]} center className="pointer-events-none select-none">
      <div className="whitespace-nowrap rounded-full border border-cyan-300/35 bg-[#031016]/88 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.14em] text-cyan-200 shadow-xl backdrop-blur">{width.toLocaleString('es-CL', { maximumFractionDigits: 2 })} m · ancho</div>
    </Html>
    <Html position={[length / 2 + .34, levels.concrete, width / 2]} center className="pointer-events-none select-none">
      <div className="whitespace-nowrap rounded-lg border border-amber-300/30 bg-[#160d04]/88 px-2 py-1 text-[8px] font-black uppercase tracking-[.1em] text-amber-200 shadow-xl backdrop-blur">{thickness.toLocaleString('es-CL', { maximumFractionDigits: 0 })} cm</div>
    </Html>

    <ContactShadows position={[0, -.07, 0]} opacity={.58} scale={maxDim * 2.25} blur={2.5} far={maxDim * 2.2} />
    <OrbitControls
      makeDefault
      target={[0, Math.min(.55, top * .55), 0]}
      enableDamping
      dampingFactor={.07}
      minDistance={Math.max(3.2, maxDim * .72)}
      maxDistance={Math.max(12, maxDim * 3.2)}
      maxPolarAngle={Math.PI / 2.02}
      autoRotate={autoRotate}
      autoRotateSpeed={.72}
    />
  </>;
}

function stageLabel(timeline: number) {
  if (timeline < 14) return 'Terreno y replanteo';
  if (timeline < 29) return 'Base compactada';
  if (timeline < 44) return 'Cama de gravilla';
  if (timeline < 58) return 'Barrera de humedad';
  if (timeline < 73) return 'Malla ACMA';
  if (timeline < 87) return 'Hormigonado';
  return 'Moldaje y terminación';
}

function hasWebGl() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function RadierCinematicViewer(props: Props) {
  const [timeline, setTimeline] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [exploded, setExploded] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [webgl] = useState(hasWebGl);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTimeline((current) => current >= 100 ? 0 : Math.min(100, current + 1));
    }, 95);
    return () => window.clearInterval(id);
  }, [playing]);

  if (!webgl) {
    return <div className="relative h-[380px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#071017] sm:h-[480px]">
      <img src={FALLBACK} alt="Vista de radier por capas" className="h-full w-full object-contain" />
      <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/65">WebGL no disponible · vista compatible</div>
    </div>;
  }

  return <section className="relative overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#05090c] shadow-[0_30px_90px_rgba(0,0,0,.48)]">
    <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_65%_18%,rgba(82,214,255,.08),transparent_34%),radial-gradient(circle_at_32%_82%,rgba(246,198,74,.07),transparent_28%)]" />
    <div className="absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-[#031016]/82 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-cyan-200 backdrop-blur"><Sparkles className="h-3 w-3" /> PBR · ACES</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-[#160d04]/82 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-amber-200 backdrop-blur"><Layers3 className="h-3 w-3" /> Visor 4D</span>
    </div>

    <div className="relative h-[390px] sm:h-[500px] lg:h-[520px]">
      <Canvas
        shadows
        dpr={[1, 1.65]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [7, 5, 8], fov: 43 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <Scene {...props} timeline={timeline} exploded={exploded} autoRotate={autoRotate} />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute bottom-[76px] left-3 z-20 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/62 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.11em] text-white/62 backdrop-blur"><Move3D className="h-3.5 w-3.5 text-[#57D4FF]" /> Arrastra · gira · zoom</div>
      <div className="pointer-events-none absolute bottom-[76px] right-3 z-20 rounded-full border border-white/10 bg-black/62 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.11em] text-white/62 backdrop-blur">Estacas calculadas: {props.stakes ?? '—'}</div>
    </div>

    <div className="relative z-30 border-t border-white/[.07] bg-[#071017]/94 p-3 backdrop-blur-xl sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setPlaying((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#F6C64A] px-4 text-[9px] font-black uppercase tracking-[.12em] text-black transition hover:bg-[#FFD95F]">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pausar 4D' : 'Reproducir 4D'}</button>
        <button type="button" onClick={() => setAutoRotate((value) => !value)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[9px] font-black uppercase tracking-[.11em] transition ${autoRotate ? 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[.035] text-white/55'}`}><Rotate3D className="h-3.5 w-3.5" /> Giro</button>
        <button type="button" onClick={() => setExploded((value) => !value)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[9px] font-black uppercase tracking-[.11em] transition ${exploded ? 'border-amber-300/35 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[.035] text-white/55'}`}><Layers3 className="h-3.5 w-3.5" /> {exploded ? 'Capas abiertas' : 'Capas unidas'}</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <input aria-label="Línea de tiempo constructiva 4D" type="range" min={0} max={100} value={timeline} onChange={(event) => { setPlaying(false); setTimeline(Number(event.target.value)); }} className="w-full accent-[#F6C64A]" />
        <div className="min-w-[170px] text-right"><span className="block text-[8px] font-black uppercase tracking-[.15em] text-white/30">Fase {timeline}%</span><b className="text-[10px] text-[#F6C64A]">{stageLabel(timeline)}</b></div>
      </div>
    </div>
  </section>;
}
