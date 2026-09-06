'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, RoundedBox, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import {
  ArrowLeft,
  Box,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Eye,
  Fan,
  Gauge,
  Maximize2,
  Minus,
  Move,
  Plus,
  Snowflake,
  Thermometer,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

type Capacity = 9000 | 12000 | 18000 | 24000;
type MoveState = { forward: boolean; back: boolean; left: boolean; right: boolean };
type Panel = 'measure' | 'climate' | null;

type AirOption = {
  cap: Capacity;
  label: string;
  coverage: string;
  powerKw: number;
};

const OPTIONS: AirOption[] = [
  { cap: 9000, label: '9.000 BTU', coverage: 'hasta 18 m²', powerKw: .82 },
  { cap: 12000, label: '12.000 BTU', coverage: 'hasta 24 m²', powerKw: 1.08 },
  { cap: 18000, label: '18.000 BTU', coverage: 'hasta 36 m²', powerKw: 1.58 },
  { cap: 24000, label: '24.000 BTU', coverage: 'hasta 48 m²', powerKw: 2.2 },
];

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const ENERGY_REFERENCE = 263;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-white/15 bg-[linear-gradient(145deg,rgba(20,21,24,.72),rgba(20,21,24,.42))] shadow-[0_24px_80px_rgba(0,0,0,.28)] backdrop-blur-2xl ${className}`}>
      {children}
    </div>
  );
}

function NumberControl({ label, value, suffix, step = .1, onChange }: { label: string; value: number; suffix?: string; step?: number; onChange: (value: number) => void }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[.055] px-3">
      <span className="text-[10px] font-black uppercase tracking-[.13em] text-white/45">{label}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(step, Number((value - step).toFixed(2))))} className="grid h-8 w-8 place-items-center rounded-full bg-white/7 text-white/70 transition hover:bg-white/12" aria-label={`Reducir ${label}`}><Minus className="h-3.5 w-3.5" /></button>
        <label className="min-w-[76px] text-center">
          <input value={value} type="number" step={step} min={step} onChange={(event) => onChange(Math.max(step, Number(event.target.value) || step))} className="w-14 bg-transparent text-right text-sm font-black tabular-nums text-white outline-none" />
          {suffix ? <span className="ml-1 text-[10px] font-bold text-white/35">{suffix}</span> : null}
        </label>
        <button onClick={() => onChange(Number((value + step).toFixed(2)))} className="grid h-8 w-8 place-items-center rounded-full bg-white/7 text-white/70 transition hover:bg-white/12" aria-label={`Aumentar ${label}`}><Plus className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function AirUnit({ selectedCap, temperature }: { selectedCap: Capacity; temperature: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 2.15 + Math.sin(clock.elapsedTime * .85) * .018;
  });
  return (
    <group ref={ref} position={[0, 2.15, -2.15]}>
      <RoundedBox args={[1.65, .42, .3]} radius={.09} smoothness={5} castShadow receiveShadow>
        <meshPhysicalMaterial color="#f3f0e9" roughness={.28} clearcoat={.35} clearcoatRoughness={.25} />
      </RoundedBox>
      <mesh position={[0, -.12, .17]} rotation={[.28, 0, 0]} castShadow>
        <boxGeometry args={[1.4, .075, .06]} />
        <meshStandardMaterial color="#202225" roughness={.4} />
      </mesh>
      <mesh position={[.53, .04, .158]}>
        <planeGeometry args={[.32, .12]} />
        <meshBasicMaterial color={temperature <= 20 ? '#93ddff' : '#ffc875'} transparent opacity={.72} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -.12]}>
        <torusGeometry args={[1.12, .012, 12, 100]} />
        <meshBasicMaterial color="#f0a45a" transparent opacity={.42} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -.13]}>
        <torusGeometry args={[1.28, .006, 12, 100]} />
        <meshBasicMaterial color="#f0a45a" transparent opacity={selectedCap === 24000 ? .38 : .2} />
      </mesh>
    </group>
  );
}

function Airflow({ temperature }: { temperature: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      const t = (clock.elapsedTime * .18 + index / group.current!.children.length) % 1;
      child.position.set((index % 3 - 1) * .24, 1.92 - t * 1.15, -1.92 + t * 1.3);
      child.scale.setScalar(.6 + (1 - t) * .6);
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = Math.sin(Math.PI * t) * .28;
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: 18 }).map((_, index) => (
        <mesh key={index}>
          <sphereGeometry args={[.027, 8, 8]} />
          <meshBasicMaterial color={temperature <= 20 ? '#7ad8ff' : '#ffbb6d'} transparent opacity={.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function ProceduralRoom({ selectedCap, temperature }: { selectedCap: Capacity; temperature: number }) {
  const slats = Array.from({ length: 18 });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <meshPhysicalMaterial color="#7a5c43" roughness={.7} metalness={0} />
      </mesh>
      <mesh position={[0, 1.5, -2.8]} receiveShadow>
        <boxGeometry args={[6.8, 3, .12]} />
        <meshPhysicalMaterial color="#b6aa9c" roughness={.92} />
      </mesh>
      <mesh position={[-3.35, 1.5, 0]} receiveShadow>
        <boxGeometry args={[.12, 3, 5.7]} />
        <meshPhysicalMaterial color="#d5cec4" roughness={.9} />
      </mesh>
      <mesh position={[3.35, 1.5, -.55]} receiveShadow>
        <boxGeometry args={[.12, 3, 4.55]} />
        <meshPhysicalMaterial color="#4f3728" roughness={.75} />
      </mesh>
      <group position={[2.96, 1.48, -2.7]}>
        {slats.map((_, index) => <mesh key={index} position={[-index * .14, 0, .08]}><boxGeometry args={[.055, 2.85, .07]} /><meshStandardMaterial color={index % 2 ? '#523828' : '#634633'} roughness={.74} /></mesh>)}
      </group>
      <group position={[-2.78, 1.63, -.35]}>
        <mesh><boxGeometry args={[.12, 2.15, 1.78]} /><meshPhysicalMaterial color="#a8c4d8" transmission={.45} transparent opacity={.55} roughness={.08} /></mesh>
        <mesh position={[.07, 0, 0]}><boxGeometry args={[.055, 2.28, .05]} /><meshStandardMaterial color="#2b2d30" /></mesh>
        <mesh position={[.07, 0, -.89]}><boxGeometry args={[.055, 2.28, .05]} /><meshStandardMaterial color="#2b2d30" /></mesh>
        <mesh position={[.07, 0, .89]}><boxGeometry args={[.055, 2.28, .05]} /><meshStandardMaterial color="#2b2d30" /></mesh>
      </group>
      <group position={[0, .52, -1.05]}>
        <RoundedBox args={[2.7, .42, 1.95]} radius={.12} smoothness={4} castShadow receiveShadow><meshPhysicalMaterial color="#8b796c" roughness={.9} /></RoundedBox>
        <RoundedBox args={[2.62, .28, 1.87]} radius={.1} smoothness={4} position={[0, .28, 0]} castShadow><meshPhysicalMaterial color="#d7cfc4" roughness={.96} /></RoundedBox>
        <mesh position={[0, .7, -.83]} castShadow><boxGeometry args={[2.75, .9, .16]} /><meshPhysicalMaterial color="#6d625b" roughness={.86} /></mesh>
        {[-.72, .72].map((x) => <RoundedBox key={x} args={[.95, .38, .22]} radius={.08} smoothness={4} position={[x, .72, -.68]} castShadow><meshPhysicalMaterial color="#e5dfd5" roughness={.98} /></RoundedBox>)}
        <RoundedBox args={[.76, .28, .18]} radius={.07} smoothness={4} position={[0, .73, -.47]} castShadow><meshPhysicalMaterial color="#9c6e4a" roughness={.92} /></RoundedBox>
      </group>
      <group position={[1.82, .48, -1.65]}>
        <RoundedBox args={[.72, .62, .66]} radius={.06} smoothness={4} castShadow><meshPhysicalMaterial color="#5a3e2d" roughness={.76} /></RoundedBox>
        <mesh position={[0, .61, 0]} castShadow><cylinderGeometry args={[.17, .24, .32, 28]} /><meshPhysicalMaterial color="#c9b091" roughness={.75} /></mesh>
        <pointLight position={[0, .92, 0]} color="#ffbd75" intensity={1.1} distance={3.2} />
      </group>
      <group position={[-1.9, .45, -1.65]}>
        <RoundedBox args={[.68, .56, .62]} radius={.06} smoothness={4} castShadow><meshPhysicalMaterial color="#4f382b" roughness={.8} /></RoundedBox>
        <mesh position={[0, .52, 0]} castShadow><cylinderGeometry args={[.16, .22, .3, 24]} /><meshPhysicalMaterial color="#b7aa94" roughness={.8} /></mesh>
        <pointLight position={[0, .83, 0]} color="#ffca88" intensity={.85} distance={2.7} />
      </group>
      <group position={[2.45, .42, .2]}>
        <mesh castShadow><cylinderGeometry args={[.22, .3, .64, 20]} /><meshPhysicalMaterial color="#242826" roughness={.75} /></mesh>
        {Array.from({ length: 9 }).map((_, index) => <mesh key={index} position={[Math.sin(index * 1.7) * .22, .52 + (index % 3) * .15, Math.cos(index * 1.8) * .15]} rotation={[0, index, index * .35]}><sphereGeometry args={[.13, 12, 8]} /><meshPhysicalMaterial color="#315c3e" roughness={.9} /></mesh>)}
      </group>
      <AirUnit selectedCap={selectedCap} temperature={temperature} />
      <Airflow temperature={temperature} />
      <ambientLight intensity={.55} color="#fff3e4" />
      <directionalLight position={[-3, 5, 4]} intensity={2.4} color="#fff0dc" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <pointLight position={[-2.5, 2.1, 1.2]} color="#cceaff" intensity={1.2} distance={5} />
      <ContactShadows position={[0, .015, 0]} opacity={.34} scale={8} blur={2.8} far={5} />
    </group>
  );
}

function BlenderRoom() {
  const gltf = useGLTF('/models/air-room-premium.glb');
  return <primitive object={gltf.scene} />;
}

function useBlenderRoomAvailability() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/models/air-room-premium.glb', { method: 'HEAD', cache: 'no-store' })
      .then((response) => { if (!cancelled) setAvailable(response.ok); })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, []);
  return available;
}

function FirstPersonRig({ move }: { move: MoveState }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-.06);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());

  useEffect(() => {
    camera.position.set(0, 1.62, 2.55);
    camera.rotation.order = 'YXZ';
    const canvas = gl.domElement;
    const onKeyDown = (event: KeyboardEvent) => keys.current.add(event.code);
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      } else {
        dragging.current = true;
        last.current = { x: event.clientX, y: event.clientY };
        canvas.setPointerCapture?.(event.pointerId);
      }
    };
    const onPointerUp = () => { dragging.current = false; };
    const onPointerMove = (event: PointerEvent) => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && !dragging.current) return;
      const dx = locked ? event.movementX : event.clientX - last.current.x;
      const dy = locked ? event.movementY : event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      yaw.current -= dx * .0022;
      pitch.current = clamp(pitch.current - dy * .0018, -1.18, 1.05);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    const speed = Math.min(delta, .05) * 2.1;
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
    let z = 0;
    let x = 0;
    if (keys.current.has('KeyW') || keys.current.has('ArrowUp') || move.forward) z += 1;
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown') || move.back) z -= 1;
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight') || move.right) x += 1;
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft') || move.left) x -= 1;
    camera.position.addScaledVector(forward, z * speed);
    camera.position.addScaledVector(right, x * speed);
    camera.position.x = clamp(camera.position.x, -2.75, 2.75);
    camera.position.z = clamp(camera.position.z, -1.65, 2.65);
    camera.position.y = 1.62;
  });
  return null;
}

function WebXRBridge() {
  const { gl } = useThree();
  useEffect(() => {
    gl.xr.enabled = true;
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr;
    if (!xr) return;
    let button: HTMLElement | null = null;
    let cancelled = false;
    xr.isSessionSupported('immersive-vr').then((supported) => {
      if (!supported || cancelled) return;
      const slot = document.getElementById('fabrick-vr-entry');
      if (!slot) return;
      button = VRButton.createButton(gl);
      button.textContent = 'Entrar VR';
      button.setAttribute('aria-label', 'Entrar en modo realidad virtual');
      button.style.position = 'static';
      button.style.width = '100%';
      button.style.height = '42px';
      button.style.border = '1px solid rgba(255,255,255,.16)';
      button.style.borderRadius = '999px';
      button.style.background = 'rgba(20,20,23,.58)';
      button.style.color = '#fff';
      button.style.font = '800 10px Manrope, sans-serif';
      button.style.letterSpacing = '.12em';
      button.style.textTransform = 'uppercase';
      button.style.backdropFilter = 'blur(18px)';
      slot.replaceChildren(button);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (button?.parentNode) button.parentNode.removeChild(button);
    };
  }, [gl]);
  return null;
}

function Scene({ selectedCap, temperature, move }: { selectedCap: Capacity; temperature: number; move: MoveState }) {
  const hasBlenderRoom = useBlenderRoomAvailability();
  return (
    <>
      <color attach="background" args={['#15110f']} />
      <fog attach="fog" args={['#15110f', 6.2, 11]} />
      {hasBlenderRoom ? <BlenderRoom /> : <ProceduralRoom selectedCap={selectedCap} temperature={temperature} />}
      {hasBlenderRoom ? <><AirUnit selectedCap={selectedCap} temperature={temperature} /><Airflow temperature={temperature} /><ambientLight intensity={.55} /><directionalLight position={[-3, 5, 4]} intensity={2.1} castShadow /></> : null}
      <FirstPersonRig move={move} />
      <WebXRBridge />
    </>
  );
}

function MobileMovePad({ setMove }: { setMove: Dispatch<SetStateAction<MoveState>> }) {
  const bind = (key: keyof MoveState) => ({
    onPointerDown: () => setMove((current) => ({ ...current, [key]: true })),
    onPointerUp: () => setMove((current) => ({ ...current, [key]: false })),
    onPointerCancel: () => setMove((current) => ({ ...current, [key]: false })),
    onPointerLeave: () => setMove((current) => ({ ...current, [key]: false })),
  });
  return (
    <div className="pointer-events-auto absolute bottom-[132px] left-3 z-30 grid h-[108px] w-[108px] grid-cols-3 grid-rows-3 gap-1 rounded-full border border-white/12 bg-black/24 p-2 backdrop-blur-xl md:hidden">
      <button {...bind('forward')} className="col-start-2 row-start-1 grid place-items-center rounded-full bg-white/8 text-white/70 active:bg-[#F5871F] active:text-black">↑</button>
      <button {...bind('left')} className="col-start-1 row-start-2 grid place-items-center rounded-full bg-white/8 text-white/70 active:bg-[#F5871F] active:text-black">←</button>
      <span className="col-start-2 row-start-2 grid place-items-center"><Move className="h-4 w-4 text-white/25" /></span>
      <button {...bind('right')} className="col-start-3 row-start-2 grid place-items-center rounded-full bg-white/8 text-white/70 active:bg-[#F5871F] active:text-black">→</button>
      <button {...bind('back')} className="col-start-2 row-start-3 grid place-items-center rounded-full bg-white/8 text-white/70 active:bg-[#F5871F] active:text-black">↓</button>
    </div>
  );
}

export default function AirImmersiveConfigurator() {
  const router = useRouter();
  const [length, setLength] = useState(4);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(2.4);
  const [people, setPeople] = useState(2);
  const [selectedCap, setSelectedCap] = useState<Capacity>(12000);
  const [temperature, setTemperature] = useState(22);
  const [panel, setPanel] = useState<Panel>(null);
  const [move, setMove] = useState<MoveState>({ forward: false, back: false, left: false, right: false });

  const calc = useMemo(() => {
    const area = length * width;
    const volume = area * height;
    const requiredBtu = Math.ceil(area * 600 + volume * 55 + people * 600);
    const recommended = (OPTIONS.find((item) => item.cap >= requiredBtu)?.cap || 24000) as Capacity;
    const option = OPTIONS.find((item) => item.cap === selectedCap) || OPTIONS[1];
    const averagePower = option.powerKw * (temperature <= 20 ? .68 : temperature <= 22 ? .56 : temperature <= 24 ? .46 : .4);
    const monthlyKwh = averagePower * 4 * 30;
    const monthlyCost = Math.round(monthlyKwh * ENERGY_REFERENCE);
    return { area, volume, requiredBtu, recommended, option, monthlyKwh, monthlyCost };
  }, [height, length, people, selectedCap, temperature, width]);

  const selectRelative = (direction: -1 | 1) => {
    const current = OPTIONS.findIndex((item) => item.cap === selectedCap);
    const next = (current + direction + OPTIONS.length) % OPTIONS.length;
    setSelectedCap(OPTIONS[next].cap);
  };

  return (
    <main className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#111214] text-white">
      <div className="absolute inset-0 z-0">
        <Canvas
          shadows
          dpr={[1, 1.8]}
          camera={{ fov: 63, near: .05, far: 40, position: [0, 1.62, 2.55] }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
          }}
        >
          <Scene selectedCap={selectedCap} temperature={temperature} move={move} />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(7,8,10,.34),transparent_24%,transparent_64%,rgba(7,8,10,.55))]" />
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[.16] [background-image:radial-gradient(circle_at_center,transparent_0,transparent_45%,black_100%)]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <button onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/32 backdrop-blur-xl transition hover:bg-black/52" aria-label="Volver a tienda"><ArrowLeft className="h-4 w-4" /></button>
          <GlassPanel className="rounded-full px-4 py-2.5">
            <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#F5B76F]">Fabrick immersive</p>
            <p className="mt-.5 text-[11px] font-black text-white/90">Configura tu aire dentro del espacio</p>
          </GlassPanel>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div id="fabrick-vr-entry" className="hidden min-w-[116px] sm:block" />
          <GlassPanel className="hidden rounded-full px-4 py-3 lg:flex lg:items-center lg:gap-2">
            <Eye className="h-3.5 w-3.5 text-[#F5B76F]" />
            <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/55">Mouse para mirar · WASD para caminar</span>
          </GlassPanel>
        </div>
      </header>

      <aside className="pointer-events-none absolute left-5 top-1/2 z-30 hidden w-[300px] -translate-y-1/2 lg:block">
        <GlassPanel className="pointer-events-auto rounded-[2rem] p-4">
          <div className="flex items-center gap-3 px-1 pb-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5871F] text-black"><Calculator className="h-5 w-5" /></span>
            <div><b className="block text-sm">Calculadora de espacio</b><span className="text-[10px] text-white/35">Medidas en tiempo real</span></div>
          </div>
          <div className="space-y-2">
            <NumberControl label="Largo" value={length} suffix="m" onChange={setLength} />
            <NumberControl label="Ancho" value={width} suffix="m" onChange={setWidth} />
            <NumberControl label="Alto" value={height} suffix="m" onChange={setHeight} />
            <NumberControl label="Personas" value={people} step={1} onChange={(value) => setPeople(Math.max(1, Math.round(value)))} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/[.055] p-3"><span className="text-[8px] font-black uppercase tracking-[.14em] text-white/35">Superficie</span><b className="mt-1 block text-xl">{calc.area.toFixed(1)} m²</b></div>
            <div className="rounded-2xl bg-[#F5871F] p-3 text-black"><span className="text-[8px] font-black uppercase tracking-[.14em] text-black/45">Recomendado</span><b className="mt-1 block text-xl">{integer.format(calc.recommended)}</b><span className="text-[8px] font-black">BTU</span></div>
          </div>
        </GlassPanel>
      </aside>

      <aside className="pointer-events-none absolute right-5 top-1/2 z-30 hidden w-[280px] -translate-y-1/2 lg:block">
        <div className="space-y-3">
          <GlassPanel className="pointer-events-auto rounded-[1.8rem] p-4">
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 text-xs font-black"><Thermometer className="h-4 w-4 text-[#F5B76F]" />Clima</span><b className="text-3xl tracking-[-.06em]">{temperature}°</b></div>
            <input type="range" min="16" max="28" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="mt-4 w-full accent-[#F5871F]" />
            <div className="mt-3 flex gap-2"><span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#F5871F] px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-black"><Snowflake className="h-3.5 w-3.5" />Frío</span><span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/7 px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-white/55"><Fan className="h-3.5 w-3.5" />Auto</span></div>
          </GlassPanel>
          <GlassPanel className="rounded-[1.8rem] p-4">
            <div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.14em] text-white/35">Consumo estimado</span><Zap className="h-4 w-4 text-[#F5B76F]" /></div>
            <b className="mt-2 block text-2xl">{calc.monthlyKwh.toFixed(0)} kWh/mes</b>
            <span className="mt-1 block text-[10px] text-white/35">≈ {money.format(calc.monthlyCost)} / mes</span>
          </GlassPanel>
          <GlassPanel className="rounded-[1.8rem] p-4">
            <div className="flex items-center gap-2 text-[#F5B76F]"><Gauge className="h-4 w-4" /><span className="text-[9px] font-black uppercase tracking-[.14em]">Carga calculada</span></div>
            <b className="mt-2 block text-2xl">{integer.format(calc.requiredBtu)} BTU</b>
            <span className="mt-1 block text-[10px] leading-5 text-white/38">{calc.selectedCap === calc.recommended ? '' : ''}</span>
          </GlassPanel>
        </div>
      </aside>

      <section className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6">
        <GlassPanel className="pointer-events-auto w-full max-w-[760px] rounded-[2rem] p-2.5 sm:p-3">
          <div className="flex items-center gap-2">
            <button onClick={() => selectRelative(-1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/7 text-white/70 transition hover:bg-white/12" aria-label="Equipo anterior"><ChevronLeft className="h-5 w-5" /></button>
            <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-stretch gap-2">
                {OPTIONS.map((item) => {
                  const active = selectedCap === item.cap;
                  const recommended = calc.recommended === item.cap;
                  return (
                    <button key={item.cap} onClick={() => setSelectedCap(item.cap)} className={`relative min-w-[116px] rounded-[1.25rem] border px-3 py-3 text-left transition sm:min-w-[136px] ${active ? 'border-[#F6B261]/70 bg-[#F5871F] text-black shadow-[0_0_28px_rgba(245,135,31,.24)]' : 'border-white/8 bg-white/[.055] text-white hover:bg-white/[.09]'}`}>
                      {recommended ? <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${active ? 'bg-black' : 'bg-[#F5B76F]'}`} /> : null}
                      <span className={`text-[8px] font-black uppercase tracking-[.13em] ${active ? 'text-black/48' : 'text-white/32'}`}>{recommended ? 'Ideal para ti' : item.coverage}</span>
                      <b className="mt-1 block text-base tracking-[-.04em] sm:text-lg">{item.label}</b>
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => selectRelative(1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/7 text-white/70 transition hover:bg-white/12" aria-label="Equipo siguiente"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </GlassPanel>
      </section>

      <div className="pointer-events-auto absolute right-3 top-[78px] z-40 flex gap-2 lg:hidden">
        <button onClick={() => setPanel((current) => current === 'measure' ? null : 'measure')} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${panel === 'measure' ? 'border-[#F5871F]/60 bg-[#F5871F] text-black' : 'border-white/14 bg-black/34 text-white'}`} aria-label="Abrir calculadora"><Calculator className="h-4 w-4" /></button>
        <button onClick={() => setPanel((current) => current === 'climate' ? null : 'climate')} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${panel === 'climate' ? 'border-[#F5871F]/60 bg-[#F5871F] text-black' : 'border-white/14 bg-black/34 text-white'}`} aria-label="Abrir clima"><Thermometer className="h-4 w-4" /></button>
      </div>

      {panel ? (
        <div className="pointer-events-none absolute inset-x-3 top-[132px] z-50 lg:hidden">
          <GlassPanel className="pointer-events-auto ml-auto max-w-[350px] rounded-[1.8rem] p-4">
            <div className="mb-3 flex items-center justify-between"><b className="text-sm">{panel === 'measure' ? 'Calculadora' : 'Clima y consumo'}</b><button onClick={() => setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7" aria-label="Cerrar panel"><X className="h-4 w-4" /></button></div>
            {panel === 'measure' ? <div className="space-y-2"><NumberControl label="Largo" value={length} suffix="m" onChange={setLength} /><NumberControl label="Ancho" value={width} suffix="m" onChange={setWidth} /><NumberControl label="Alto" value={height} suffix="m" onChange={setHeight} /><div className="grid grid-cols-2 gap-2 pt-1"><div className="rounded-xl bg-white/6 p-3"><span className="text-[8px] text-white/35">m²</span><b className="block text-lg">{calc.area.toFixed(1)}</b></div><div className="rounded-xl bg-[#F5871F] p-3 text-black"><span className="text-[8px] text-black/45">BTU ideal</span><b className="block text-lg">{integer.format(calc.recommended)}</b></div></div></div> : <div><div className="flex items-end justify-between"><span className="text-[10px] uppercase tracking-[.12em] text-white/40">Temperatura</span><b className="text-4xl">{temperature}°</b></div><input type="range" min="16" max="28" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} className="mt-4 w-full accent-[#F5871F]" /><div className="mt-4 rounded-xl bg-white/6 p-3"><span className="text-[8px] uppercase tracking-[.12em] text-white/35">Consumo mensual</span><b className="mt-1 block text-xl">{calc.monthlyKwh.toFixed(0)} kWh</b><span className="text-[10px] text-white/35">≈ {money.format(calc.monthlyCost)}</span></div></div>}
          </GlassPanel>
        </div>
      ) : null}

      <MobileMovePad setMove={setMove} />

      <div className="pointer-events-none absolute bottom-[132px] right-3 z-30 hidden rounded-full border border-white/10 bg-black/24 px-3 py-2 text-[9px] font-bold text-white/38 backdrop-blur-xl sm:block lg:hidden">
        Arrastra la escena para mirar
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[92px] z-20 -translate-x-1/2 text-center lg:top-[84px]">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/24 px-3 py-2 text-[8px] font-black uppercase tracking-[.16em] text-white/42 backdrop-blur-xl"><Box className="h-3.5 w-3.5 text-[#F5B76F]" />Primera persona · selector espacial</span>
      </div>
    </main>
  );
}
