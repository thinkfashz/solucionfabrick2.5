'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, RoundedBox, useGLTF } from '@react-three/drei';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import * as THREE from 'three';
import { ArrowLeft, Calculator, ChevronLeft, ChevronRight, Move, Snowflake, Thermometer, X, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

type Capacity = 9000 | 12000 | 18000 | 24000;
type MoveState = { forward: boolean; back: boolean; left: boolean; right: boolean };
type Panel = 'measure' | 'climate' | null;

type AirOption = { cap: Capacity; label: string; coverage: string; powerKw: number };

const OPTIONS: AirOption[] = [
  { cap: 9000, label: '9.000 BTU', coverage: 'hasta 18 m²', powerKw: .82 },
  { cap: 12000, label: '12.000 BTU', coverage: 'hasta 24 m²', powerKw: 1.08 },
  { cap: 18000, label: '18.000 BTU', coverage: 'hasta 36 m²', powerKw: 1.58 },
  { cap: 24000, label: '24.000 BTU', coverage: 'hasta 48 m²', powerKw: 2.2 },
];

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const ENERGY_REFERENCE = 263;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-white/15 bg-[linear-gradient(145deg,rgba(15,16,19,.74),rgba(15,16,19,.4))] shadow-[0_24px_80px_rgba(0,0,0,.3)] backdrop-blur-2xl ${className}`}>{children}</div>;
}

function Field({ label, value, suffix, step = .1, onChange }: { label: string; value: number; suffix?: string; step?: number; onChange: (value: number) => void }) {
  return <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[.055] px-3">
    <span className="text-[9px] font-black uppercase tracking-[.13em] text-white/42">{label}</span>
    <span className="flex items-center gap-1"><input type="number" min={step} step={step} value={value} onChange={(event) => onChange(Math.max(step, Number(event.target.value) || step))} className="w-14 bg-transparent text-right text-sm font-black tabular-nums text-white outline-none" />{suffix ? <small className="text-[9px] font-bold text-white/35">{suffix}</small> : null}</span>
  </label>;
}

function AirUnit({ temperature }: { temperature: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 2.15 + Math.sin(clock.elapsedTime * .8) * .015;
  });
  return <group ref={ref} position={[0, 2.15, -2.2]}>
    <RoundedBox args={[1.7, .43, .3]} radius={.09} smoothness={5} castShadow>
      <meshPhysicalMaterial color="#f5f1e9" roughness={.28} clearcoat={.32} />
    </RoundedBox>
    <mesh position={[0, -.13, .17]} rotation={[.25, 0, 0]}><boxGeometry args={[1.43, .075, .055]} /><meshStandardMaterial color="#202225" roughness={.42} /></mesh>
    <mesh position={[.5, .04, .158]}><planeGeometry args={[.3, .1]} /><meshBasicMaterial color={temperature <= 20 ? '#8cddff' : '#ffc36f'} transparent opacity={.8} /></mesh>
    {[1.1, 1.27].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -.1 - index * .01]}><torusGeometry args={[radius, index ? .006 : .012, 12, 96]} /><meshBasicMaterial color="#f3a557" transparent opacity={index ? .18 : .4} /></mesh>)}
  </group>;
}

function Airflow({ temperature }: { temperature: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      const t = (clock.elapsedTime * .2 + index / 15) % 1;
      child.position.set((index % 3 - 1) * .22, 1.9 - t, -1.95 + t * 1.25);
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * t) * .25;
    });
  });
  return <group ref={group}>{Array.from({ length: 15 }).map((_, index) => <mesh key={index}><sphereGeometry args={[.025, 8, 8]} /><meshBasicMaterial color={temperature <= 20 ? '#70d5ff' : '#ffb55f'} transparent opacity={.2} depthWrite={false} /></mesh>)}</group>;
}

function FallbackRoom({ temperature }: { temperature: number }) {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[8.5, 8.5]} /><meshPhysicalMaterial color="#755841" roughness={.78} /></mesh>
    <mesh position={[0, 1.5, -2.8]} receiveShadow><boxGeometry args={[6.7, 3, .12]} /><meshPhysicalMaterial color="#b6aa9e" roughness={.94} /></mesh>
    <mesh position={[-3.3, 1.5, 0]} receiveShadow><boxGeometry args={[.12, 3, 5.6]} /><meshPhysicalMaterial color="#d8d2c8" roughness={.92} /></mesh>
    <mesh position={[3.3, 1.5, -.55]} receiveShadow><boxGeometry args={[.12, 3, 4.5]} /><meshPhysicalMaterial color="#4a3428" roughness={.78} /></mesh>
    <group position={[-2.82, 1.62, -.35]}><mesh><boxGeometry args={[.1, 2.1, 1.75]} /><meshPhysicalMaterial color="#9ec6dc" transmission={.45} transparent opacity={.5} roughness={.08} /></mesh></group>
    <group position={[0, .52, -1.05]}>
      <RoundedBox args={[2.7, .42, 1.95]} radius={.12} smoothness={4} castShadow><meshPhysicalMaterial color="#87766b" roughness={.9} /></RoundedBox>
      <RoundedBox args={[2.6, .28, 1.86]} radius={.1} smoothness={4} position={[0, .28, 0]} castShadow><meshPhysicalMaterial color="#ded7cd" roughness={.96} /></RoundedBox>
      <mesh position={[0, .7, -.84]} castShadow><boxGeometry args={[2.75, .9, .15]} /><meshPhysicalMaterial color="#6b625c" roughness={.88} /></mesh>
      {[-.72, .72].map((x) => <RoundedBox key={x} args={[.95, .38, .22]} radius={.08} smoothness={4} position={[x, .72, -.67]} castShadow><meshPhysicalMaterial color="#e7e0d6" roughness={.98} /></RoundedBox>)}
      <RoundedBox args={[.74, .27, .18]} radius={.07} smoothness={4} position={[0, .73, -.47]}><meshPhysicalMaterial color="#9c6c47" roughness={.9} /></RoundedBox>
    </group>
    <group position={[2.1, .43, -1.55]}><RoundedBox args={[.7, .58, .64]} radius={.06} smoothness={4}><meshPhysicalMaterial color="#553a2c" roughness={.8} /></RoundedBox><pointLight position={[0, .9, 0]} color="#ffbd75" intensity={1.05} distance={3.2} /></group>
    <group position={[2.48, .42, .25]}><mesh><cylinderGeometry args={[.2, .28, .62, 20]} /><meshPhysicalMaterial color="#252925" roughness={.8} /></mesh>{Array.from({ length: 8 }).map((_, i) => <mesh key={i} position={[Math.sin(i * 1.8) * .2, .5 + (i % 3) * .14, Math.cos(i * 1.9) * .13]}><sphereGeometry args={[.12, 10, 8]} /><meshPhysicalMaterial color="#315b3d" roughness={.92} /></mesh>)}</group>
    <AirUnit temperature={temperature} /><Airflow temperature={temperature} />
    <ambientLight intensity={.55} color="#fff3e4" /><directionalLight position={[-3, 5, 4]} intensity={2.25} color="#fff0dc" castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} /><pointLight position={[-2.5, 2.1, 1.4]} color="#cceaff" intensity={1.1} distance={5} />
    <ContactShadows position={[0, .015, 0]} opacity={.32} scale={8} blur={2.5} far={5} />
  </group>;
}

function BlenderRoom() {
  const gltf = useGLTF('/models/air-room-premium.glb');
  return <primitive object={gltf.scene} />;
}

function Room({ temperature }: { temperature: number }) {
  const [hasModel, setHasModel] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/models/air-room-premium.glb', { method: 'HEAD', cache: 'no-store' }).then((res) => { if (alive) setHasModel(res.ok); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return hasModel ? <><BlenderRoom /><AirUnit temperature={temperature} /><Airflow temperature={temperature} /><ambientLight intensity={.6} /><directionalLight position={[-3, 5, 4]} intensity={2} castShadow /></> : <FallbackRoom temperature={temperature} />;
}

function FirstPerson({ move }: { move: MoveState }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-.05);
  const drag = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());

  useEffect(() => {
    camera.position.set(0, 1.62, 2.45);
    camera.rotation.order = 'YXZ';
    const canvas = gl.domElement;
    const kd = (e: KeyboardEvent) => keys.current.add(e.code);
    const ku = (e: KeyboardEvent) => keys.current.delete(e.code);
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') canvas.requestPointerLock?.();
      else { drag.current = true; last.current = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); }
    };
    const up = () => { drag.current = false; };
    const look = (e: PointerEvent) => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && !drag.current) return;
      const dx = locked ? e.movementX : e.clientX - last.current.x;
      const dy = locked ? e.movementY : e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * .0022;
      pitch.current = clamp(pitch.current - dy * .0018, -1.12, 1.02);
    };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointermove', look);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('pointermove', look); };
  }, [camera, gl]);

  useFrame((_, delta) => {
    camera.rotation.y = yaw.current; camera.rotation.x = pitch.current;
    const speed = Math.min(delta, .05) * 2;
    const f = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const r = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
    const z = (keys.current.has('KeyW') || move.forward ? 1 : 0) - (keys.current.has('KeyS') || move.back ? 1 : 0);
    const x = (keys.current.has('KeyD') || move.right ? 1 : 0) - (keys.current.has('KeyA') || move.left ? 1 : 0);
    camera.position.addScaledVector(f, z * speed); camera.position.addScaledVector(r, x * speed);
    camera.position.x = clamp(camera.position.x, -2.7, 2.7); camera.position.z = clamp(camera.position.z, -1.6, 2.55); camera.position.y = 1.62;
  });
  return null;
}

function XR() {
  const { gl } = useThree();
  useEffect(() => {
    gl.xr.enabled = true;
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr;
    if (!xr) return;
    let button: HTMLElement | null = null;
    let alive = true;
    xr.isSessionSupported('immersive-vr').then((supported) => {
      if (!supported || !alive) return;
      const slot = document.getElementById('fabrick-vr-entry');
      if (!slot) return;
      button = VRButton.createButton(gl); button.textContent = 'Entrar VR';
      Object.assign(button.style, { position: 'static', width: '100%', height: '42px', border: '1px solid rgba(255,255,255,.15)', borderRadius: '999px', background: 'rgba(15,16,19,.55)', color: '#fff', font: '800 10px Manrope,sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', backdropFilter: 'blur(18px)' });
      slot.replaceChildren(button);
    }).catch(() => undefined);
    return () => { alive = false; if (button?.parentNode) button.parentNode.removeChild(button); };
  }, [gl]);
  return null;
}

function MovePad({ move, setMove }: { move: MoveState; setMove: React.Dispatch<React.SetStateAction<MoveState>> }) {
  const press = (key: keyof MoveState, value: boolean) => setMove((s) => ({ ...s, [key]: value }));
  const b = (key: keyof MoveState, label: string, col: string, row: string) => <button onPointerDown={() => press(key, true)} onPointerUp={() => press(key, false)} onPointerCancel={() => press(key, false)} onPointerLeave={() => press(key, false)} className={`${col} ${row} grid place-items-center rounded-full bg-white/8 text-white/70 active:bg-[#F5871F] active:text-black`}>{label}</button>;
  return <div className="pointer-events-auto absolute bottom-[126px] left-3 z-40 grid h-[106px] w-[106px] grid-cols-3 grid-rows-3 gap-1 rounded-full border border-white/12 bg-black/28 p-2 backdrop-blur-xl md:hidden">{b('forward','↑','col-start-2','row-start-1')}{b('left','←','col-start-1','row-start-2')}<span className="col-start-2 row-start-2 grid place-items-center"><Move className="h-4 w-4 text-white/25" /></span>{b('right','→','col-start-3','row-start-2')}{b('back','↓','col-start-2','row-start-3')}</div>;
}

export default function AirImmersiveExperience() {
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
    const recommended = (OPTIONS.find((o) => o.cap >= requiredBtu)?.cap || 24000) as Capacity;
    const option = OPTIONS.find((o) => o.cap === selectedCap) || OPTIONS[1];
    const power = option.powerKw * (temperature <= 20 ? .68 : temperature <= 22 ? .56 : temperature <= 24 ? .46 : .4);
    const monthlyKwh = power * 4 * 30;
    return { area, requiredBtu, recommended, monthlyKwh, monthlyCost: Math.round(monthlyKwh * ENERGY_REFERENCE) };
  }, [height, length, people, selectedCap, temperature, width]);

  const cycle = (dir: -1 | 1) => {
    const index = OPTIONS.findIndex((o) => o.cap === selectedCap);
    setSelectedCap(OPTIONS[(index + dir + OPTIONS.length) % OPTIONS.length].cap);
  };

  const measurementPanel = <div className="space-y-2"><Field label="Largo" value={length} suffix="m" onChange={setLength} /><Field label="Ancho" value={width} suffix="m" onChange={setWidth} /><Field label="Alto" value={height} suffix="m" onChange={setHeight} /><Field label="Personas" value={people} step={1} onChange={(v) => setPeople(Math.max(1, Math.round(v)))} /><div className="grid grid-cols-2 gap-2 pt-1"><div className="rounded-xl bg-white/6 p-3"><small className="text-[8px] uppercase text-white/35">Superficie</small><b className="mt-1 block text-xl">{calc.area.toFixed(1)} m²</b></div><div className="rounded-xl bg-[#F5871F] p-3 text-black"><small className="text-[8px] uppercase text-black/45">Ideal</small><b className="mt-1 block text-xl">{integer.format(calc.recommended)}</b><span className="text-[8px] font-black"> BTU</span></div></div></div>;

  const climatePanel = <div><div className="flex items-end justify-between"><span className="text-[9px] font-black uppercase tracking-[.12em] text-white/40">Temperatura</span><b className="text-4xl tracking-[-.06em]">{temperature}°</b></div><input type="range" min="16" max="28" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="mt-4 w-full accent-[#F5871F]" /><div className="mt-4 rounded-xl bg-white/6 p-3"><small className="text-[8px] uppercase text-white/35">Consumo estimado</small><b className="mt-1 block text-xl">{calc.monthlyKwh.toFixed(0)} kWh/mes</b><span className="text-[10px] text-white/35">≈ {money.format(calc.monthlyCost)} / mes</span></div></div>;

  return <main className="relative h-[100svh] min-h-[600px] w-full overflow-hidden bg-[#111214] text-white">
    <div className="absolute inset-0"><Canvas shadows dpr={[1, 1.7]} camera={{ fov: 63, near: .05, far: 40, position: [0, 1.62, 2.45] }} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08; gl.outputColorSpace = THREE.SRGBColorSpace; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}><color attach="background" args={['#15110f']} /><fog attach="fog" args={['#15110f', 6, 11]} /><Room temperature={temperature} /><FirstPerson move={move} /><XR /></Canvas></div>
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,.38),transparent_25%,transparent_65%,rgba(5,6,8,.6))]" />

    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 sm:p-5"><div className="pointer-events-auto flex items-center gap-2"><button onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/35 backdrop-blur-xl" aria-label="Volver a tienda"><ArrowLeft className="h-4 w-4" /></button><Glass className="rounded-full px-4 py-2.5"><small className="block text-[8px] font-black uppercase tracking-[.18em] text-[#F5B76F]">Fabrick immersive</small><b className="block text-[11px]">Configura tu aire dentro del espacio</b></Glass></div><div id="fabrick-vr-entry" className="pointer-events-auto hidden min-w-[120px] sm:block" /></header>

    <aside className="pointer-events-none absolute left-5 top-1/2 z-30 hidden w-[295px] -translate-y-1/2 lg:block"><Glass className="pointer-events-auto rounded-[2rem] p-4"><div className="mb-3 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5871F] text-black"><Calculator className="h-5 w-5" /></span><div><b className="block text-sm">Calculadora espacial</b><small className="text-[9px] text-white/35">Cambios en tiempo real</small></div></div>{measurementPanel}</Glass></aside>
    <aside className="pointer-events-none absolute right-5 top-1/2 z-30 hidden w-[275px] -translate-y-1/2 lg:block"><div className="space-y-3"><Glass className="pointer-events-auto rounded-[1.8rem] p-4"><div className="mb-3 flex items-center gap-2"><Thermometer className="h-4 w-4 text-[#F5B76F]" /><b className="text-sm">Control de clima</b></div>{climatePanel}</Glass><Glass className="rounded-[1.8rem] p-4"><div className="flex items-center justify-between"><small className="text-[8px] font-black uppercase tracking-[.14em] text-white/35">Carga térmica</small><Zap className="h-4 w-4 text-[#F5B76F]" /></div><b className="mt-2 block text-2xl">{integer.format(calc.requiredBtu)} BTU</b><small className="text-white/35">Recomendado: {integer.format(calc.recommended)} BTU</small></Glass></div></aside>

    <div className="pointer-events-auto absolute right-3 top-[78px] z-40 flex gap-2 lg:hidden"><button onClick={() => setPanel(panel === 'measure' ? null : 'measure')} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${panel === 'measure' ? 'border-[#F5871F] bg-[#F5871F] text-black' : 'border-white/14 bg-black/35'}`}><Calculator className="h-4 w-4" /></button><button onClick={() => setPanel(panel === 'climate' ? null : 'climate')} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${panel === 'climate' ? 'border-[#F5871F] bg-[#F5871F] text-black' : 'border-white/14 bg-black/35'}`}><Thermometer className="h-4 w-4" /></button></div>
    {panel ? <div className="pointer-events-none absolute inset-x-3 top-[132px] z-50 lg:hidden"><Glass className="pointer-events-auto ml-auto max-w-[350px] rounded-[1.8rem] p-4"><div className="mb-3 flex items-center justify-between"><b className="text-sm">{panel === 'measure' ? 'Calculadora' : 'Clima y consumo'}</b><button onClick={() => setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7"><X className="h-4 w-4" /></button></div>{panel === 'measure' ? measurementPanel : climatePanel}</Glass></div> : null}

    <MovePad move={move} setMove={setMove} />

    <section className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6"><Glass className="pointer-events-auto w-full max-w-[760px] rounded-[2rem] p-2.5"><div className="flex items-center gap-2"><button onClick={() => cycle(-1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/7"><ChevronLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-w-max gap-2">{OPTIONS.map((o) => { const active = selectedCap === o.cap; const recommended = calc.recommended === o.cap; return <button key={o.cap} onClick={() => setSelectedCap(o.cap)} className={`relative min-w-[116px] rounded-[1.2rem] border px-3 py-3 text-left transition sm:min-w-[136px] ${active ? 'border-[#F7B260]/70 bg-[#F5871F] text-black shadow-[0_0_30px_rgba(245,135,31,.22)]' : 'border-white/8 bg-white/[.055] text-white'}`}>{recommended ? <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${active ? 'bg-black' : 'bg-[#F5B76F]'}`} /> : null}<small className={`text-[8px] font-black uppercase tracking-[.12em] ${active ? 'text-black/45' : 'text-white/32'}`}>{recommended ? 'Ideal para ti' : o.coverage}</small><b className="mt-1 block text-base sm:text-lg">{o.label}</b></button>; })}</div></div><button onClick={() => cycle(1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/7"><ChevronRight className="h-5 w-5" /></button></div></Glass></section>

    <div className="pointer-events-none absolute left-1/2 top-[88px] z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-[8px] font-black uppercase tracking-[.15em] text-white/42 backdrop-blur-xl"><span className="inline-flex items-center gap-2"><Snowflake className="h-3.5 w-3.5 text-[#F5B76F]" />Primera persona · arrastra para mirar</span></div>
  </main>;
}
