'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

type View = 'corner' | 'front' | 'side' | 'top';
type Mode = 'frio' | 'seco' | 'vent' | 'auto';
type Quality = 'auto' | 'alta' | 'ultra';
type Capacity = 9000 | 12000 | 18000 | 24000;

type Props = {
  area?: number;
  btu?: number;
  seleccionado?: number;
  largo?: number;
  ancho?: number;
  alto?: number;
  compact?: boolean;
  title?: string;
};

type Maps = { map: THREE.DataTexture; normalMap: THREE.DataTexture; roughnessMap: THREE.DataTexture };

type MaterialKind = 'wall' | 'wood' | 'fabric' | 'rug' | 'concrete';

const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const intf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const safe = (v: unknown, fallback: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : fallback; };

const CAMERA: Record<View, [number, number, number]> = {
  front: [0, 2.05, 6.4],
  corner: [4.9, 3.0, 5.3],
  side: [6.2, 2.45, .35],
  top: [0, 7.5, .1],
};

const BTU: Array<{ cap: Capacity; label: string; price: number }> = [
  { cap: 9000, label: '9K', price: 289990 },
  { cap: 12000, label: '12K', price: 349990 },
  { cap: 18000, label: '18K', price: 529990 },
  { cap: 24000, label: '24K', price: 749990 },
];

function nearestCapacity(value: number): Capacity {
  return BTU.reduce((best, current) => Math.abs(current.cap - value) < Math.abs(best - value) ? current.cap : best, 12000 as Capacity);
}

function calculateBtu(largo: number, ancho: number, alto: number) {
  const area = largo * ancho;
  const volume = area * alto;
  return Math.ceil(area * 600 + volume * 55 + 1200 + 350 * 3.412);
}

function proceduralHeight(kind: MaterialKind, x: number, y: number, size: number) {
  const nx = x / size;
  const ny = y / size;
  const noise = (((x * 17 + y * 31 + x * y * 7) % 101) / 100) - .5;
  if (kind === 'wood') {
    const plank = Math.sin(nx * Math.PI * 32 + Math.sin(ny * 9) * 1.4) * .38;
    const grain = Math.sin(nx * Math.PI * 155 + ny * 8) * .10;
    const seam = (x % Math.max(12, Math.floor(size / 7))) < 2 ? -.65 : 0;
    return plank + grain + seam + noise * .12;
  }
  if (kind === 'fabric') return Math.sin(x * .42) * .16 + Math.sin(y * .46) * .16 + noise * .2;
  if (kind === 'rug') return Math.sin(x * 1.12) * .21 + Math.cos(y * .96) * .21 + noise * .32;
  if (kind === 'concrete') return noise * .46 + Math.sin(nx * 19 + ny * 13) * .08;
  return noise * .24 + Math.sin(nx * 31 + ny * 17) * .035;
}

function baseRgb(kind: MaterialKind, height: number): [number, number, number] {
  const bases: Record<MaterialKind, [number, number, number]> = {
    wall: [221, 210, 195],
    wood: [116, 70, 38],
    fabric: [185, 171, 153],
    rug: [154, 139, 121],
    concrete: [145, 139, 132],
  };
  const b = bases[kind];
  const lift = height * (kind === 'wood' ? 18 : 10);
  return [clamp(b[0] + lift, 0, 255), clamp(b[1] + lift, 0, 255), clamp(b[2] + lift, 0, 255)];
}

function createMaps(kind: MaterialKind, size: number, repeat: [number, number]): Maps {
  const color = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);
  const rough = new Uint8Array(size * size * 4);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) heights[y * size + x] = proceduralHeight(kind, x, y, size);

  const roughBase: Record<MaterialKind, number> = { wall: 214, wood: 150, fabric: 235, rug: 248, concrete: 225 };
  const strength: Record<MaterialKind, number> = { wall: 1.4, wood: 3.1, fabric: 2.2, rug: 2.8, concrete: 1.8 };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x;
    const j = i * 4;
    const h = heights[i];
    const rgb = baseRgb(kind, h);
    color[j] = rgb[0]; color[j + 1] = rgb[1]; color[j + 2] = rgb[2]; color[j + 3] = 255;

    const l = heights[y * size + ((x - 1 + size) % size)];
    const r = heights[y * size + ((x + 1) % size)];
    const d = heights[((y - 1 + size) % size) * size + x];
    const u = heights[((y + 1) % size) * size + x];
    const nx = (l - r) * strength[kind];
    const ny = (d - u) * strength[kind];
    const nz = 1;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    normal[j] = Math.round((nx / len * .5 + .5) * 255);
    normal[j + 1] = Math.round((ny / len * .5 + .5) * 255);
    normal[j + 2] = Math.round((nz / len * .5 + .5) * 255);
    normal[j + 3] = 255;

    const rv = clamp(roughBase[kind] + h * 20, 0, 255);
    rough[j] = rough[j + 1] = rough[j + 2] = rv; rough[j + 3] = 255;
  }

  const map = new THREE.DataTexture(color, size, size, THREE.RGBAFormat);
  const normalMap = new THREE.DataTexture(normal, size, size, THREE.RGBAFormat);
  const roughnessMap = new THREE.DataTexture(rough, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, normalMap, roughnessMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }
  return { map, normalMap, roughnessMap };
}

function PhysicalBox({
  size,
  position,
  rotation,
  maps,
  color = '#ffffff',
  roughness = .7,
  metalness = 0,
  radius = .035,
}: {
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  maps?: Maps;
  color?: string;
  roughness?: number;
  metalness?: number;
  radius?: number;
}) {
  return <RoundedBox args={size} radius={radius} smoothness={3} position={position} rotation={rotation} castShadow receiveShadow>
    <meshPhysicalMaterial
      color={color}
      map={maps?.map}
      normalMap={maps?.normalMap}
      normalScale={maps ? new THREE.Vector2(.34, .34) : undefined}
      roughness={roughness}
      roughnessMap={maps?.roughnessMap}
      metalness={metalness}
    />
  </RoundedBox>;
}

function AirUnit({ capacity }: { capacity: Capacity }) {
  return <group position={[1.02, 2.18, -1.86]}>
    <RoundedBox args={[1.55, .44, .34]} radius={.13} smoothness={5} castShadow receiveShadow>
      <meshPhysicalMaterial color="#f6f6f1" roughness={.21} clearcoat={.45} clearcoatRoughness={.19} />
    </RoundedBox>
    <mesh position={[0, -.19, .19]} castShadow><boxGeometry args={[1.14, .045, .045]} /><meshStandardMaterial color="#172027" roughness={.42} /></mesh>
    <mesh position={[0, -.135, .205]} castShadow><boxGeometry args={[.88, .018, .025]} /><meshStandardMaterial color="#7ee7ff" emissive="#35c8ef" emissiveIntensity={.35} /></mesh>
    <mesh position={[.55, .045, .18]}><planeGeometry args={[.18, .075]} /><meshStandardMaterial color="#20252a" emissive="#20252a" emissiveIntensity={.1} /></mesh>
    <mesh position={[.55, .045, .183]}><planeGeometry args={[.13, .045]} /><meshBasicMaterial color="#a7f3d0" /></mesh>
    <group position={[.76, -.02, -.05]}>
      <mesh position={[.26, -.10, 0]}><boxGeometry args={[.08, .09, .09]} /><meshStandardMaterial color="#f2f1ec" roughness={.45} /></mesh>
      <mesh position={[.29, -.50, 0]}><boxGeometry args={[.09, .72, .09]} /><meshStandardMaterial color="#f2f1ec" roughness={.45} /></mesh>
    </group>
    <pointLight position={[0, -.22, .30]} intensity={.20} color="#72e5ff" distance={1.2} />
    <mesh position={[-.46, .02, .182]}><planeGeometry args={[.34, .06]} /><meshBasicMaterial transparent opacity={.68} color="#515a60" /></mesh>
    <mesh position={[0, .43, 0]} visible={false}><planeGeometry args={[.1, .1]} /></mesh>
  </group>;
}

function Plant() {
  const leaves = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    a: i * 2.399,
    r: .16 + (i % 5) * .045,
    y: .92 + (i % 8) * .12,
    s: .075 + (i % 3) * .018,
  })), []);
  return <group position={[-2.12, 1.15, 0]}>
    <mesh castShadow position={[0, .28, 0]}><cylinderGeometry args={[.27, .22, .56, 30]} /><meshPhysicalMaterial color="#746653" roughness={.92} /></mesh>
    <mesh castShadow position={[0, .92, 0]}><cylinderGeometry args={[.028, .038, 1.08, 16]} /><meshStandardMaterial color="#5b3c25" roughness={.75} /></mesh>
    {leaves.map((leaf, i) => <mesh key={i} castShadow position={[Math.cos(leaf.a) * leaf.r, leaf.y, Math.sin(leaf.a) * leaf.r]} rotation={[0, leaf.a, Math.sin(leaf.a) * .5]} scale={[leaf.s * 1.65, leaf.s * .46, leaf.s]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={i % 3 ? '#36523b' : '#526a48'} roughness={.82} /></mesh>)}
  </group>;
}

function ProceduralRoom({ capacity, maps, airflowCount, fan, mode }: { capacity: Capacity; maps: Record<MaterialKind, Maps>; airflowCount: number; fan: number; mode: Mode }) {
  return <group>
    <PhysicalBox size={[5.6, .16, 4.4]} position={[0, -.08, 0]} maps={maps.wood} roughness={.48} radius={.012} />
    <PhysicalBox size={[5.6, 3.05, .16]} position={[0, 1.46, -2.08]} maps={maps.wall} roughness={.86} radius={.012} />
    <PhysicalBox size={[.16, 3.05, 4.4]} position={[-2.72, 1.46, 0]} maps={maps.wall} roughness={.86} radius={.012} />
    <PhysicalBox size={[.16, 3.05, 4.4]} position={[2.72, 1.46, 0]} maps={maps.wall} roughness={.86} radius={.012} />
    <PhysicalBox size={[5.6, .12, 4.4]} position={[0, 2.95, 0]} maps={maps.wall} roughness={.9} radius={.01} />

    {Array.from({ length: 14 }, (_, i) => <PhysicalBox key={i} size={[.065, 2.48, .11]} position={[-1.58 + i * .112, 1.48, -1.96]} maps={maps.wood} roughness={.42} radius={.012} />)}

    <group position={[0, 0, -.35]}>
      <PhysicalBox size={[2.48, .22, 1.30]} position={[0, 1.03, -1.26]} maps={maps.fabric} roughness={.92} radius={.11} />
      <PhysicalBox size={[2.42, .42, 2.10]} position={[0, .34, -.43]} maps={maps.fabric} roughness={.91} radius={.11} />
      <PhysicalBox size={[2.34, .27, 2.02]} position={[0, .66, -.43]} color="#e9e3d9" roughness={.82} radius={.10} />
      <PhysicalBox size={[2.20, .15, 1.75]} position={[0, .88, -.28]} maps={maps.fabric} roughness={.94} radius={.085} />
      <PhysicalBox size={[2.02, .085, .46]} position={[0, 1.00, .38]} color="#343538" roughness={.96} radius={.04} />
      <PhysicalBox size={[.78, .27, .38]} position={[-.61, 1.07, -.91]} color="#eee9df" roughness={.96} radius={.12} rotation={[-.11, 0, -.03]} />
      <PhysicalBox size={[.78, .27, .38]} position={[.61, 1.07, -.91]} color="#e7e0d5" roughness={.96} radius={.12} rotation={[-.11, 0, .03]} />
    </group>

    <PhysicalBox size={[3.25, .055, 2.65]} position={[0, .035, .35]} maps={maps.rug} roughness={1} radius={.018} />
    <PhysicalBox size={[1.82, .27, .60]} position={[0, .48, 1.00]} maps={maps.fabric} roughness={.94} radius={.10} />
    {[-.70, .70].flatMap(x => [.80, 1.18].map(z => <PhysicalBox key={`${x}-${z}`} size={[.055, .40, .055]} position={[x, .23, z]} color="#222326" roughness={.28} metalness={.6} radius={.008} />))}

    {[-1.62, 1.62].map((x) => <group key={x}>
      <PhysicalBox size={[.70, .56, .58]} position={[x, .45, -.92]} maps={maps.wood} roughness={.45} radius={.055} />
      <mesh castShadow position={[x, .92, -.92]}><cylinderGeometry args={[.15, .15, .055, 28]} /><meshPhysicalMaterial color="#171719" metalness={.62} roughness={.22} /></mesh>
      <mesh castShadow position={[x, 1.16, -.92]}><cylinderGeometry args={[.023, .023, .46, 18]} /><meshStandardMaterial color="#171719" metalness={.6} roughness={.25} /></mesh>
      <mesh castShadow position={[x, 1.38, -.92]} scale={[.24, .16, .24]}><sphereGeometry args={[1, 28, 16]} /><meshPhysicalMaterial color="#18191b" metalness={.55} roughness={.28} /></mesh>
      <pointLight position={[x, 1.27, -.70]} intensity={.45} color="#ffd9a0" distance={2.2} decay={2} />
    </group>)}

    <group position={[-2.60, 1.55, -.10]}>
      <PhysicalBox size={[.10, 1.85, .10]} position={[0, 0, -.88]} color="#e8e3da" radius={.01} />
      <PhysicalBox size={[.10, 1.85, .10]} position={[0, 0, .88]} color="#e8e3da" radius={.01} />
      <PhysicalBox size={[.10, .10, 1.86]} position={[0, .92, 0]} color="#e8e3da" radius={.01} />
      <PhysicalBox size={[.10, .10, 1.86]} position={[0, -.92, 0]} color="#e8e3da" radius={.01} />
      <mesh position={[-.04, 0, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.70, 1.68]} /><meshPhysicalMaterial color="#a4d8ea" transmission={.46} transparent opacity={.46} roughness={.08} thickness={.05} /></mesh>
      <mesh position={[-.07, 0, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[1.58, 1.56]} /><meshBasicMaterial color="#a8d9f0" transparent opacity={.16} /></mesh>
    </group>

    <AirUnit capacity={capacity} />
    <Plant />
    <Airflow count={airflowCount} fan={fan} mode={mode} />
  </group>;
}

function Airflow({ count, fan, mode }: { count: number; fan: number; mode: Mode }) {
  const refs = useRef<THREE.Mesh[]>([]);
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    seed: (i * .173) % 1,
    lane: ((i % 13) - 6) / 6,
    depth: (i % 7) / 7,
  })), [count]);
  const color = mode === 'frio' ? '#6ee7ff' : mode === 'seco' ? '#c8efff' : mode === 'auto' ? '#83f5d3' : '#f7b267';
  useFrame(({ clock }) => {
    const t0 = clock.elapsedTime * (.34 + fan * .13);
    refs.current.forEach((mesh, i) => {
      const p = particles[i];
      if (!mesh || !p) return;
      const t = (t0 + p.seed) % 1;
      mesh.position.set(1.02 + p.lane * (.18 + t * 1.65), 1.96 - t * (.52 + p.depth * .36), -1.60 + t * (1.35 + p.depth * .95));
      mesh.scale.setScalar(.45 + Math.sin(t * Math.PI) * .9);
    });
  });
  return <group>{particles.map((_, i) => <mesh key={i} ref={(el) => { if (el) refs.current[i] = el; }}><sphereGeometry args={[.012, 7, 7]} /><meshBasicMaterial color={color} transparent opacity={.52} /></mesh>)}</group>;
}

function BlenderRoom({ url, scale }: { url: string; scale: [number, number, number] }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const material = object.material as THREE.MeshStandardMaterial;
      if (material) {
        material.envMapIntensity = .7;
        material.needsUpdate = true;
      }
    });
    return clone;
  }, [gltf.scene]);
  return <primitive object={scene} scale={scale} />;
}

function CameraRig({ view, spin, controls }: { view: View; spin: boolean; controls: React.MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...CAMERA[view]);
    const current = controls.current;
    if (current) {
      current.target.set(0, 1.15, -.28);
      current.update();
    }
  }, [camera, controls, view]);
  useFrame(() => {
    if (!controls.current) return;
    controls.current.autoRotate = spin;
    controls.current.autoRotateSpeed = .48;
  });
  return null;
}

function RendererSetup({ exposure }: { exposure: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [exposure, gl]);
  return null;
}

export default function ThreeAirRoomViewerPremium(props: Props) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [mobile, setMobile] = useState(false);
  const [quality, setQuality] = useState<Quality>('auto');
  const [view, setView] = useState<View>('corner');
  const [spin, setSpin] = useState(false);
  const [fan, setFan] = useState(3);
  const [mode, setMode] = useState<Mode>('frio');
  const [temperature, setTemperature] = useState(22);
  const [blenderAvailable, setBlenderAvailable] = useState(false);
  const [largo, setLargo] = useState(() => safe(props.largo, 5));
  const [ancho, setAncho] = useState(() => safe(props.ancho, 4));
  const [alto, setAlto] = useState(() => safe(props.alto, 2.6));
  const calculated = calculateBtu(largo, ancho, alto);
  const [capacity, setCapacity] = useState<Capacity>(() => nearestCapacity(safe(props.seleccionado, props.btu || calculated)));

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const sync = () => setMobile(mq.matches);
    sync(); mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
  useEffect(() => { setLargo(safe(props.largo, 5)); setAncho(safe(props.ancho, 4)); setAlto(safe(props.alto, 2.6)); }, [props.alto, props.ancho, props.largo]);
  useEffect(() => { setCapacity(nearestCapacity(safe(props.seleccionado, props.btu || calculated))); }, [props.btu, props.seleccionado]);
  useEffect(() => {
    let cancelled = false;
    fetch('/models/air-room-premium.glb', { method: 'HEAD', cache: 'no-store' }).then((r) => { if (!cancelled) setBlenderAvailable(r.ok); }).catch(() => setBlenderAvailable(false));
    return () => { cancelled = true; };
  }, []);

  const effective = quality === 'auto' ? (mobile ? 'alta' : 'ultra') : quality;
  const textureSize = effective === 'ultra' ? 512 : 256;
  const dpr = effective === 'ultra' ? (mobile ? 1.5 : 2) : (mobile ? 1.1 : 1.45);
  const shadowSize = effective === 'ultra' && !mobile ? 2048 : 1024;
  const airflowCount = effective === 'ultra' && !mobile ? 86 : 44;
  const area = largo * ancho;
  const roomScale: [number, number, number] = [clamp(largo / 5, .76, 1.35), clamp(alto / 2.6, .88, 1.18), clamp(ancho / 4, .76, 1.3)];

  const maps = useMemo(() => ({
    wall: createMaps('wall', textureSize, [3.2, 2.2]),
    wood: createMaps('wood', textureSize, [4.8, 3.6]),
    fabric: createMaps('fabric', textureSize, [4.2, 3.0]),
    rug: createMaps('rug', textureSize, [5.4, 4.0]),
    concrete: createMaps('concrete', textureSize, [3.4, 3.4]),
  }), [textureSize]);

  const selectedInfo = BTU.find((x) => x.cap === capacity) || BTU[1];
  const heightClass = props.compact ? 'h-[430px] sm:h-[500px]' : 'h-[520px] sm:h-[620px] lg:h-[680px]';

  const zoom = (factor: number) => {
    const c = controls.current;
    if (!c) return;
    const offset = c.object.position.clone().sub(c.target);
    offset.setLength(clamp(offset.length() * factor, 3.2, 11.5));
    c.object.position.copy(c.target).add(offset); c.update();
  };

  return <section className="overflow-hidden rounded-[1.6rem] border border-black/10 bg-[#0d0e10] text-white shadow-[0_24px_80px_rgba(0,0,0,.24)] sm:rounded-[2rem]">
    <div className="grid gap-4 border-b border-white/[.07] p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
      <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#E6B56F]">Visor 3D Premium · PBR</p><h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">{props.title || 'Habitación + aire acondicionado'}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-white/42 sm:text-sm">Materiales físicos, sombras suaves y calidad adaptativa. El modelo Blender se activa automáticamente cuando el GLB está disponible.</p></div>
      <div className="grid grid-cols-3 gap-2 text-center"><Metric label="Área" value={`${nf.format(area)} m²`} /><Metric label="Cálculo" value={`${intf.format(calculated)} BTU`} /><Metric label="Equipo" value={`${intf.format(capacity)} BTU`} accent /></div>
    </div>

    <div className="grid lg:grid-cols-[minmax(0,1fr)_315px]">
      <div className="min-w-0 p-3 sm:p-4">
        <div className={`${heightClass} relative overflow-hidden rounded-[1.35rem] border border-white/[.08] bg-[radial-gradient(circle_at_45%_28%,#303235_0%,#17191c_34%,#0b0c0e_74%)] sm:rounded-[1.65rem]`}>
          <Canvas shadows dpr={dpr} camera={{ position: CAMERA.corner, fov: mobile ? 46 : 40 }} gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}>
            <RendererSetup exposure={mobile ? 1.08 : 1.14} />
            <color attach="background" args={['#111316']} />
            <fog attach="fog" args={['#111316', 8.5, 16]} />
            <ambientLight intensity={.42} />
            <hemisphereLight intensity={.68} color="#fff2de" groundColor="#5d554b" />
            <directionalLight castShadow position={[-4.2, 6.4, 5.3]} intensity={2.15} color="#fff0d8" shadow-mapSize-width={shadowSize} shadow-mapSize-height={shadowSize} shadow-bias={-.00012} />
            <directionalLight position={[4.5, 3.4, 1.2]} intensity={.55} color="#b8d8ff" />
            <Suspense fallback={null}>
              <CameraRig view={view} spin={spin} controls={controls} />
              {blenderAvailable ? <BlenderRoom url="/models/air-room-premium.glb" scale={roomScale} /> : <group scale={roomScale}><ProceduralRoom capacity={capacity} maps={maps} airflowCount={airflowCount} fan={fan} mode={mode} /></group>}
              <ContactShadows position={[0, .018, 0]} opacity={mobile ? .42 : .55} scale={7.5} blur={mobile ? 2.8 : 2.2} far={4.2} resolution={mobile ? 256 : 512} color="#000000" />
            </Suspense>
            <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.075} minDistance={3.2} maxDistance={11.5} minPolarAngle={.20} maxPolarAngle={Math.PI / 2.03} target={[0, 1.15, -.28]} />
          </Canvas>

          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 sm:left-4 sm:top-4">
            <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] backdrop-blur-xl">{blenderAvailable ? 'Blender GLB' : 'PBR fallback'}</span>
            <span className="rounded-full border border-[#E6B56F]/25 bg-black/60 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-[#E6B56F] backdrop-blur-xl">{effective === 'ultra' ? 'Ultra' : 'Alta'} · {dpr}×</span>
          </div>
          <div className="pointer-events-none absolute right-3 top-3 rounded-[1rem] border border-white/10 bg-black/60 px-3 py-2 text-right backdrop-blur-xl sm:right-4 sm:top-4"><span className="block text-[9px] uppercase tracking-[.12em] text-white/35">Clima</span><b className="text-lg text-cyan-200">{temperature} °C</b></div>

          <div className="absolute inset-x-2 bottom-2 z-20 sm:inset-x-4 sm:bottom-4">
            <div className="flex gap-1.5 overflow-x-auto rounded-[1.15rem] border border-white/10 bg-black/72 p-1.5 shadow-2xl backdrop-blur-xl sm:w-fit sm:max-w-[calc(100%-1rem)]">
              {(['corner', 'front', 'side', 'top'] as View[]).map((v) => <button key={v} type="button" onClick={() => { setView(v); setSpin(false); }} className={`min-h-10 shrink-0 rounded-[.85rem] px-3 text-[10px] font-black ${view === v ? 'bg-[#D77A2D] text-[#111214]' : 'bg-white/[.06] text-white/68'}`}>{v === 'corner' ? 'Esquina' : v === 'front' ? 'Frontal' : v === 'side' ? 'Lateral' : 'Superior'}</button>)}
              <button type="button" onClick={() => zoom(.82)} className="min-h-10 shrink-0 rounded-[.85rem] bg-white/[.06] px-3 text-[10px] font-black">Zoom +</button>
              <button type="button" onClick={() => zoom(1.18)} className="min-h-10 shrink-0 rounded-[.85rem] bg-white/[.06] px-3 text-[10px] font-black">Zoom −</button>
              <button type="button" onClick={() => setSpin(!spin)} className="min-h-10 shrink-0 rounded-[.85rem] bg-[#EEE7DD] px-3 text-[10px] font-black text-[#111214]">{spin ? 'Pausar' : 'Giro 360°'}</button>
            </div>
          </div>
        </div>
      </div>

      <aside className="border-t border-white/[.07] bg-[#111214] p-4 lg:border-l lg:border-t-0 lg:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <ControlSection title="Habitación" subtitle="El render responde a estas dimensiones.">
            <div className="grid grid-cols-3 gap-2"><MiniNumber label="Largo" value={largo} suffix="m" onChange={setLargo} /><MiniNumber label="Ancho" value={ancho} suffix="m" onChange={setAncho} /><MiniNumber label="Alto" value={alto} suffix="m" onChange={setAlto} /></div>
          </ControlSection>

          <ControlSection title="Equipo" subtitle="Capacidad visible en el ambiente.">
            <div className="grid grid-cols-4 gap-1.5">{BTU.map((item) => <button type="button" key={item.cap} onClick={() => setCapacity(item.cap)} className={`rounded-xl px-2 py-2.5 text-[10px] font-black ${capacity === item.cap ? 'bg-[#D77A2D] text-[#111214]' : 'bg-white/[.055] text-white/65'}`}>{item.label}</button>)}</div>
            <div className="mt-3 rounded-[1rem] border border-white/[.07] bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[.12em] text-white/35">Equipo referencial</p><b className="mt-1 block text-xl">{money.format(selectedInfo.price)}</b></div>
          </ControlSection>

          <ControlSection title="Control climático" subtitle="Simula operación y flujo de aire.">
            <div className="flex items-center justify-between rounded-[1rem] bg-white/[.045] p-3"><span><small className="block text-[9px] text-white/35">Temperatura</small><b className="text-2xl">{temperature}°</b></span><span className="flex gap-1"><button type="button" onClick={() => setTemperature(clamp(temperature - 1, 16, 30))} className="h-10 w-10 rounded-xl bg-white/[.07] font-black">−</button><button type="button" onClick={() => setTemperature(clamp(temperature + 1, 16, 30))} className="h-10 w-10 rounded-xl bg-white/[.07] font-black">+</button></span></div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">{[1,2,3,4].map((n) => <button type="button" key={n} onClick={() => setFan(n)} className={`rounded-xl py-2.5 text-[10px] font-black ${fan === n ? 'bg-cyan-300 text-[#111214]' : 'bg-white/[.055] text-white/60'}`}>F{n}</button>)}</div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">{(['frio','seco','vent','auto'] as Mode[]).map((m) => <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-xl py-2.5 text-[9px] font-black uppercase ${mode === m ? 'bg-white text-[#111214]' : 'bg-white/[.055] text-white/55'}`}>{m === 'frio' ? 'Frío' : m === 'seco' ? 'Seco' : m === 'vent' ? 'Vent.' : 'Auto'}</button>)}</div>
          </ControlSection>

          <ControlSection title="Calidad gráfica" subtitle="Supermuestreo y detalle adaptativo para web.">
            <div className="grid grid-cols-3 gap-1.5">{(['auto','alta','ultra'] as Quality[]).map((q) => <button type="button" key={q} onClick={() => setQuality(q)} className={`rounded-xl py-2.5 text-[9px] font-black uppercase ${quality === q ? 'bg-[#E6B56F] text-[#111214]' : 'bg-white/[.055] text-white/55'}`}>{q}</button>)}</div>
            <p className="mt-2 text-[10px] leading-4 text-white/30">No usa una etiqueta falsa de DLSS: aplica el equivalente web viable — DPR dinámico, PBR, normales, roughness, ACES y sombras adaptativas.</p>
          </ControlSection>
        </div>
      </aside>
    </div>
  </section>;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-xl px-3 py-2.5 ${accent ? 'bg-[#D77A2D] text-[#111214]' : 'bg-white/[.055]'}`}><small className={`block text-[8px] font-black uppercase tracking-[.1em] ${accent ? 'text-black/45' : 'text-white/30'}`}>{label}</small><b className="mt-1 block text-[11px] sm:text-xs">{value}</b></div>;
}

function ControlSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="rounded-[1.25rem] border border-white/[.07] bg-white/[.025] p-3.5"><h3 className="text-xs font-black">{title}</h3><p className="mt-1 text-[10px] leading-4 text-white/32">{subtitle}</p><div className="mt-3">{children}</div></section>;
}

function MiniNumber({ label, value, suffix, onChange }: { label: string; value: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="grid gap-1 rounded-xl bg-white/[.055] p-2"><span className="text-[8px] font-black uppercase tracking-[.08em] text-white/32">{label}</span><span className="flex items-baseline gap-1"><input type="number" step="0.1" min="1" max="20" value={value} onChange={(e) => onChange(clamp(Number(e.target.value) || 1, 1, 20))} className="min-w-0 w-full bg-transparent text-sm font-black outline-none" /><small className="text-[9px] text-white/30">{suffix}</small></span></label>;
}
