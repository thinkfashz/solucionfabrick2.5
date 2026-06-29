'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

type View = 'corner' | 'front' | 'side' | 'back' | 'top';
type Mode = 'frio' | 'seco' | 'vent' | 'auto';
type BtuOption = 9000 | 12000 | 18000 | 24000;

type ThreeAirRoomViewerProps = {
  area?: number;
  btu?: number;
  seleccionado?: number;
  largo?: number;
  ancho?: number;
  alto?: number;
  compact?: boolean;
  title?: string;
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const safe = (v: unknown, fb: number) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) && n > 0 ? n : fb; };
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const cameraViews: Record<View, [number, number, number]> = {
  front: [0, 2.25, 5.85],
  corner: [4.6, 3.05, 5.2],
  side: [6.25, 2.5, .2],
  back: [0, 2.7, -6.1],
  top: [0, 7.4, .15],
};

const btuOptions: Array<{ btu: BtuOption; label: string; price: number; kwh: number }> = [
  { btu: 9000, label: '9K', price: 289990, kwh: 118 },
  { btu: 12000, label: '12K', price: 331664, kwh: 158.9 },
  { btu: 18000, label: '18K', price: 489990, kwh: 226 },
  { btu: 24000, label: '24K', price: 649990, kwh: 312 },
];

const fanLabels = ['Baja', 'Media', 'Media-Alta', 'Alta'];
const modeLabels: Record<Mode, string> = { frio: 'Frío', seco: 'Seco', vent: 'Vent.', auto: 'Auto' };
const viewLabels: Record<View, string> = { front: 'Frontal', corner: 'Esquina', side: 'Lateral', back: 'Trasera', top: 'Superior' };

function closestBtu(value: number): BtuOption {
  const n = safe(value, 12000);
  return btuOptions.reduce((best, item) => Math.abs(item.btu - n) < Math.abs(best - n) ? item.btu : best, 12000 as BtuOption);
}

function makeTexture(kind: 'wall' | 'wood' | 'fabric' | 'concrete' | 'rug') {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const base = { wall: [238, 232, 220], wood: [210, 176, 130], fabric: [221, 215, 204], concrete: [178, 170, 160], rug: [218, 206, 188] }[kind];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const grain = kind === 'wood' ? Math.sin((x + y * .18) * .34) * 18 : Math.sin(x * .11 + y * .15) * 5;
    const bands = kind === 'wood' && x % 22 < 2 ? 20 : 0;
    const noise = ((x * 37 + y * 17 + (x * y) % 29) % 25) - 12;
    const weave = kind === 'fabric' || kind === 'rug' ? ((x % 11 === 0 || y % 11 === 0) ? -10 : 0) : 0;
    data[i] = clamp(base[0] + grain + noise + bands + weave, 0, 255);
    data[i + 1] = clamp(base[1] + grain * .55 + noise + bands + weave, 0, 255);
    data[i + 2] = clamp(base[2] + grain * .25 + noise + weave, 0, 255);
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'wood' ? 4.6 : 2.4, kind === 'wood' ? 3.2 : 2.4);
  texture.needsUpdate = true;
  return texture;
}

function calculateBtu(largo: number, ancho: number, alto: number, personas = 2, watts = 250) {
  const area = largo * ancho;
  const volumen = area * alto;
  return Math.ceil(area * 600 + volumen * 55 + personas * 600 + watts * 3.412);
}

function CameraRig({ view, spinning, controls }: { view: View; spinning: boolean; controls: MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    const p = cameraViews[view];
    camera.position.set(...p);
    camera.lookAt(0, 1.25, -0.35);
    if (controls.current) {
      controls.current.target.set(0, 1.15, -0.35);
      controls.current.autoRotate = spinning;
      controls.current.autoRotateSpeed = .55;
      controls.current.update();
    }
  }, [camera, controls, spinning, view]);
  useFrame(() => {
    const current = controls.current;
    if (!current) return;
    current.autoRotate = spinning;
    current.autoRotateSpeed = .55;
    current.update();
  });
  return null;
}

function Label({ children, position }: { children: ReactNode; position: [number, number, number] }) {
  return <Html center distanceFactor={8} position={position} className="pointer-events-none hidden lg:block"><span className="whitespace-nowrap rounded-full border border-amber-300/45 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200 shadow-xl shadow-black/40">{children}</span></Html>;
}

function Box({ args, position, color, label, map, transparent = false, opacity = 1, roughness = .72, metalness = .02 }: { args: [number, number, number]; position: [number, number, number]; color: string; label?: string; map?: THREE.Texture; transparent?: boolean; opacity?: number; roughness?: number; metalness?: number }) {
  return <mesh castShadow receiveShadow position={position}><boxGeometry args={args} /><meshStandardMaterial color={color} map={map} roughness={roughness} transparent={transparent} opacity={opacity} metalness={metalness} />{label && <Label position={[0, args[1] / 2 + .12, 0]}>{label}</Label>}</mesh>;
}

function RoundedLight({ position, color = '#fff4df', intensity = .65 }: { position: [number, number, number]; color?: string; intensity?: number }) {
  return <group position={position}><mesh><cylinderGeometry args={[.13, .13, .035, 26]} /><meshStandardMaterial color="#fff8eb" emissive={color} emissiveIntensity={.35} roughness={.25} /></mesh><pointLight intensity={intensity} color={color} distance={3.8} /></group>;
}

function WindowPane() {
  return <group position={[0, 1.52, -1.935]}><Box args={[1.2, .06, .08]} position={[0, .72, 0]} color="#f8fafc" /><Box args={[1.2, .06, .08]} position={[0, -.72, 0]} color="#f8fafc" /><Box args={[.06, 1.42, .08]} position={[-.64, 0, 0]} color="#f8fafc" /><Box args={[.06, 1.42, .08]} position={[.64, 0, 0]} color="#f8fafc" /><Box args={[.045, 1.32, .07]} position={[0, 0, .015]} color="#e2e8f0" /><Box args={[1.1, .045, .07]} position={[0, 0, .02]} color="#e2e8f0" /><mesh position={[0, 0, -.01]}><boxGeometry args={[1.12, 1.28, .035]} /><meshPhysicalMaterial color="#dff5ff" roughness={.1} transparent opacity={.36} transmission={.3} thickness={.08} /></mesh></group>;
}

function AirConditioner({ btu }: { btu: number }) {
  return <group position={[0, 2.34, -1.96]}><Box args={[1.36, .42, .32]} position={[0, 0, 0]} color="#fbfbf7" roughness={.28} label={`${whole.format(btu)} BTU`} /><Box args={[1.08, .035, .045]} position={[0, -.18, .19]} color="#0b1f2a" roughness={.45} /><Box args={[.72, .025, .035]} position={[0, -.14, .215]} color="#35d8ff" roughness={.25} /><Box args={[.12, .08, .026]} position={[.48, .05, .205]} color="#111827" roughness={.2} /></group>;
}

function SoftDoor() {
  return <group position={[-2.52, .94, .9]} rotation={[0, .03, 0]}><Box args={[.08, 1.64, .84]} position={[0, 0, 0]} color="#ede2d2" roughness={.55} /><mesh castShadow receiveShadow position={[-.01, .06, 0]}><boxGeometry args={[.055, 1.28, .58]} /><meshPhysicalMaterial color="#f4e8d2" roughness={.18} transparent opacity={.38} transmission={.35} thickness={.12} /></mesh><mesh position={[-.055, -.06, -.32]}><sphereGeometry args={[.033, 18, 18]} /><meshStandardMaterial color="#c99632" metalness={.65} roughness={.22} /></mesh></group>;
}

function ParticleField({ fan, mode }: { fan: number; mode: Mode }) {
  const group = useRef<THREE.Group | null>(null);
  const particles = useMemo(() => Array.from({ length: 95 }).map((_, i) => ({ seed: i * .113, x0: (((i % 19) - 9) / 9) * .14, y0: 2.05 - Math.floor(i / 19) * .04, z0: -1.66, dx: (((i % 19) - 9) / 9) * 1.95, dy: -.58 - (Math.floor(i / 19) / 5) * .34, dz: .9 + (Math.floor(i / 19) / 5) * 1.55, size: .014 + (i % 4) * .005 })), []);
  const palette = mode === 'frio' ? ['#4fdcff', '#79e8ff', '#bdefff', '#6ee7f9', '#ffe38a'] : mode === 'seco' ? ['#c6ecff', '#9ed8ff', '#e9fbff'] : mode === 'auto' ? ['#60f5ce', '#9fffea', '#75d6ff', '#ffe38a'] : ['#ffd36a', '#ffad3d', '#ff6b35', '#fff0a8'];
  const speed = .46 + fan * .18;
  useFrame((state) => {
    if (!group.current) return;
    const time = state.clock.elapsedTime * speed;
    group.current.children.forEach((child, i) => {
      const p = particles[i];
      const t = (time + p.seed) % 1;
      const curve = Math.sin(t * Math.PI) * .25;
      child.position.x = p.x0 + p.dx * t + curve * Math.sin(i);
      child.position.y = p.y0 + p.dy * t + Math.sin(time * 5 + i) * .018;
      child.position.z = p.z0 + p.dz * t;
      child.scale.setScalar(.5 + Math.sin(t * Math.PI) * 1.15);
    });
  });
  return <group ref={group}>{particles.map((p, i) => <mesh key={i} position={[p.x0, p.y0, p.z0]}><sphereGeometry args={[p.size, 10, 10]} /><meshStandardMaterial color={palette[i % palette.length]} emissive={palette[i % palette.length]} emissiveIntensity={mode === 'vent' ? .45 : .82} transparent opacity={.82} /></mesh>)}</group>;
}

function RoomModel({ area, btu, largo, ancho, alto, fan, mode }: ThreeAirRoomViewerProps & { fan: number; mode: Mode }) {
  const sceneArea = safe(area, 14.7);
  const baseScale = Math.min(1.12, Math.max(.88, Math.sqrt(sceneArea) / 4.2));
  const scaleX = baseScale * clamp(safe(largo, 4.2) / 4.2, .76, 1.35);
  const scaleY = baseScale * clamp(safe(alto, 2.5) / 2.5, .9, 1.14);
  const scaleZ = baseScale * clamp(safe(ancho, 3.5) / 3.5, .76, 1.28);
  const textures = useMemo(() => ({ wall: makeTexture('wall'), wood: makeTexture('wood'), fabric: makeTexture('fabric'), concrete: makeTexture('concrete'), rug: makeTexture('rug') }), []);
  return <group scale={[scaleX, scaleY, scaleZ]}>
    <color attach="background" args={['#030303']} />
    <ambientLight intensity={.86} />
    <hemisphereLight intensity={.62} color="#fff7ed" groundColor="#a78b62" />
    <directionalLight castShadow intensity={1.15} position={[3.5, 5.4, 4.6]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight intensity={.65} color="#fff2d1" position={[-1.15, 1.15, .42]} distance={3.2} />
    <pointLight intensity={.52} color="#fff2d1" position={[1.28, 1.12, .42]} distance={3.2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.06, 0]} receiveShadow><planeGeometry args={[8, 7]} /><meshStandardMaterial color="#050505" roughness={.92} /></mesh>
    <Box args={[4.96, .18, 3.74]} position={[0, .09, 0]} color="#d9b98a" map={textures.wood} roughness={.58} />
    <Box args={[5.28, .18, 4.08]} position={[0, -.09, 0]} color="#bfb8ad" map={textures.concrete} roughness={.76} />
    <Box args={[4.96, 2.72, .2]} position={[0, 1.4, -1.86]} color="#f1eadf" map={textures.wall} roughness={.82} />
    <Box args={[.2, 2.72, 3.74]} position={[-2.48, 1.4, 0]} color="#eee5d9" map={textures.wall} roughness={.82} />
    <Box args={[.2, 2.72, 3.74]} position={[2.48, 1.4, 0]} color="#eee5d9" map={textures.wall} roughness={.82} />
    <Box args={[5.08, .13, .24]} position={[0, 2.78, -1.86]} color="#fff8ef" roughness={.5} />
    <Box args={[.23, .13, 3.9]} position={[-2.48, 2.78, 0]} color="#fff8ef" roughness={.5} />
    <Box args={[.23, .13, 3.9]} position={[2.48, 2.78, 0]} color="#fff8ef" roughness={.5} />
    <RoundedLight position={[-1.45, 2.67, -.8]} />
    <RoundedLight position={[1.45, 2.67, -.8]} />
    <WindowPane />
    <SoftDoor />
    <AirConditioner btu={safe(btu, 12895)} />
    <Box args={[2.42, .07, 1.72]} position={[0, .19, .55]} color="#e4d8c5" map={textures.rug} roughness={.9} />
    <Box args={[1.92, .28, 1.3]} position={[0, .35, .42]} color="#c7a57f" roughness={.55} />
    <Box args={[2.06, .2, 1.46]} position={[0, .62, .42]} color="#efe9df" map={textures.fabric} roughness={.86} />
    <Box args={[1.96, .64, .18]} position={[0, .93, -.34]} color="#d9cbbb" map={textures.fabric} roughness={.86} />
    <Box args={[1.72, .1, .44]} position={[0, .84, .12]} color="#d6cec1" map={textures.fabric} roughness={.9} />
    <Box args={[.48, .15, .42]} position={[-.55, .98, -.16]} color="#eee8dd" map={textures.fabric} roughness={.9} />
    <Box args={[.48, .15, .42]} position={[0, .98, -.16]} color="#e3dbcf" map={textures.fabric} roughness={.9} />
    <Box args={[.48, .15, .42]} position={[.55, .98, -.16]} color="#f2eee7" map={textures.fabric} roughness={.9} />
    <Box args={[.48, .42, .44]} position={[-1.28, .42, -.22]} color="#c79655" map={textures.wood} roughness={.6} />
    <Box args={[.48, .42, .44]} position={[1.28, .42, -.22]} color="#c79655" map={textures.wood} roughness={.6} />
    <mesh position={[-1.28, .75, -.22]}><sphereGeometry args={[.105, 22, 16]} /><meshStandardMaterial color="#fff1c8" emissive="#ffbf63" emissiveIntensity={.92} roughness={.35} /></mesh>
    <mesh position={[1.28, .75, -.22]}><sphereGeometry args={[.095, 22, 16]} /><meshStandardMaterial color="#fff1c8" emissive="#ffbf63" emissiveIntensity={.74} roughness={.35} /></mesh>
    <group position={[1.78, .44, .98]}><Box args={[.34, .55, .34]} position={[0, 0, 0]} color="#f5f2ea" roughness={.72} /><mesh position={[0, .54, 0]}><sphereGeometry args={[.31, 18, 16]} /><meshStandardMaterial color="#2f6b3a" roughness={.86} /></mesh><mesh position={[-.12, .78, .02]}><sphereGeometry args={[.22, 16, 12]} /><meshStandardMaterial color="#3f8d4a" roughness={.86} /></mesh></group>
    <ParticleField fan={fan} mode={mode} />
    <Label position={[0, 2.92, -1.95]}>Split centrado</Label>
    <Label position={[0, .14, 1.65]}>{num.format(sceneArea)} m²</Label>
  </group>;
}

function NumberInputMini({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return <label className="grid gap-1 text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">{label}<div className="flex items-center rounded-2xl border border-white/10 bg-black/35 px-3 py-2"><input type="number" value={Number.isFinite(value) ? value : 0} step="0.1" onChange={(e) => onChange(Number(e.target.value) || 0)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" />{suffix && <span className="text-xs text-zinc-500">{suffix}</span>}</div></label>;
}

function RoomMeasurePanel({ largo, ancho, alto, setLargo, setAncho, setAlto, area, btu }: { largo: number; ancho: number; alto: number; setLargo: (v: number) => void; setAncho: (v: number) => void; setAlto: (v: number) => void; area: number; btu: number }) {
  return <div className="rounded-[1.5rem] border border-amber-300/15 bg-black/55 p-3 backdrop-blur-xl">
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300">Medidas del cuarto</p><p className="mt-1 text-xs text-zinc-500">El visor se adapta automáticamente.</p></div><div className="text-right"><b className="block text-lg text-white">{num.format(area)} m²</b><span className="text-[11px] text-amber-200">{whole.format(btu)} BTU</span></div></div>
    <div className="mt-3 grid grid-cols-3 gap-2"><NumberInputMini label="Largo" value={largo} onChange={setLargo} suffix="m" /><NumberInputMini label="Ancho" value={ancho} onChange={setAncho} suffix="m" /><NumberInputMini label="Alto" value={alto} onChange={setAlto} suffix="m" /></div>
  </div>;
}

function ControlPanel({ temp, setTemp, fan, setFan, mode, setMode, selected, setSelected, speed, price, kwh }: { temp: number; setTemp: (v: number) => void; fan: number; setFan: (v: number) => void; mode: Mode; setMode: (v: Mode) => void; selected: BtuOption; setSelected: (v: BtuOption) => void; speed: number; price: number; kwh: number }) {
  return <aside className="grid content-start gap-3 rounded-[1.5rem] border border-white/10 bg-black/55 p-3 backdrop-blur-xl sm:rounded-[1.7rem] xl:p-4"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300 sm:tracking-[.28em]">Control del equipo</p><button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-300">⏻</button></div><div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-xs text-zinc-400">Temperatura</p><div className="mt-2 flex items-center justify-between gap-2"><b className="text-4xl sm:text-3xl">{temp} °C</b><div className="flex gap-2"><button type="button" onClick={() => setTemp(clamp(temp - 1, 16, 30))} className="h-12 w-12 rounded-xl bg-white/10 text-xl font-black sm:h-10 sm:w-10">−</button><button type="button" onClick={() => setTemp(clamp(temp + 1, 16, 30))} className="h-12 w-12 rounded-xl bg-white/10 text-xl font-black sm:h-10 sm:w-10">+</button></div></div><p className="mt-1 text-[11px] text-zinc-500">{mode === 'frio' ? `Enfriando a ${temp} °C` : mode === 'seco' ? 'Reduciendo humedad' : mode === 'auto' ? 'Ajuste automático' : 'Ventilación activa'}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-xs text-zinc-400">Velocidad del ventilador</p><div className="mt-2 grid grid-cols-4 gap-2">{[1,2,3,4].map(v => <button type="button" key={v} onClick={() => setFan(v)} className={`min-h-11 rounded-xl px-2 py-2 text-lg ${fan === v ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>♨</button>)}</div><p className="mt-2 text-xs text-zinc-400">{fanLabels[fan - 1]}</p></div><div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-xs text-zinc-400">Clima / modo</p><div className="mt-2 grid grid-cols-4 gap-2">{(['frio','seco','vent','auto'] as Mode[]).map(v => <button type="button" key={v} onClick={() => setMode(v)} className={`min-h-11 rounded-xl px-2 py-2 text-xs font-black ${mode === v ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>{modeLabels[v]}</button>)}</div></div><div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><div className="flex items-center justify-between"><p className="text-xs text-zinc-400">Partículas de aire</p><span className="text-[11px] text-emerald-300">● óptimo</span></div><b className="mt-1 block text-3xl">{num.format(speed)} m/s</b><div className="mt-3 h-10 overflow-hidden rounded-xl bg-cyan-400/10 sm:h-12"><div className="h-full origin-left bg-[linear-gradient(90deg,rgba(34,211,238,.05),rgba(34,211,238,.7),rgba(255,183,77,.25))]" style={{ transform: `scaleX(${clamp(speed / 4, .25, 1)})` }} /></div></div><div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Selecciona BTU</p><div className="mt-3 grid grid-cols-2 gap-2">{btuOptions.map(item => <button type="button" key={item.btu} onClick={() => setSelected(item.btu)} className={`rounded-2xl border p-3 text-left ${selected === item.btu ? 'border-amber-300 bg-amber-400 text-black' : 'border-white/10 bg-black/25 text-white'}`}><b className="text-xl">{item.label}</b><p className="text-xs opacity-75">{whole.format(item.btu)} BTU</p></button>)}</div></div><div className="rounded-2xl border border-amber-300/20 bg-black/45 p-4"><p className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Presupuesto</p><b className="mt-2 block text-sm">Equipo referencial {whole.format(selected)} BTU</b><strong className="mt-1 block text-3xl">{money.format(price)}</strong><p className="mt-1 text-xs text-zinc-400">{num.format(kwh)} kWh/mes estimado</p></div></aside>;
}

function ViewControls({ view, setView, spin, setSpin, zoomIn, zoomOut }: { view: View; setView: (v: View) => void; spin: boolean; setSpin: (v: boolean) => void; zoomIn: () => void; zoomOut: () => void }) {
  return <div className="rounded-[1.35rem] border border-white/10 bg-black/55 p-2 backdrop-blur-xl sm:rounded-full"><div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center">{(['front','corner','side','back','top'] as View[]).map(v => <button key={v} type="button" onClick={() => { setView(v); setSpin(false); }} className={`min-h-11 rounded-2xl px-3 py-2 text-xs font-black sm:rounded-full sm:px-4 ${view === v ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>{viewLabels[v]}</button>)}<button type="button" onClick={zoomIn} className="min-h-11 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white sm:rounded-full">Zoom +</button><button type="button" onClick={zoomOut} className="min-h-11 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white sm:rounded-full">Zoom −</button><button type="button" onClick={() => setSpin(!spin)} className="col-span-3 min-h-11 rounded-2xl bg-amber-400 px-4 py-2 text-xs font-black text-black sm:col-auto sm:rounded-full">{spin ? 'Pausar giro' : 'Giro suave'}</button></div></div>;
}

function MobileCalculator({ selected, temp, speed, price, area, btu }: { selected: BtuOption; temp: number; speed: number; price: number; area: number; btu: number }) {
  return <div className="grid gap-3 rounded-[1.5rem] border border-amber-300/15 bg-black/55 p-4 sm:grid-cols-[170px_1fr_auto] sm:items-center sm:rounded-[1.7rem]"><div className="rounded-[1.3rem] border border-white/10 bg-[#0d1115] p-3"><div className="mx-auto h-24 w-14 rounded-2xl border border-white/15 bg-black p-1"><div className="h-full rounded-xl bg-[linear-gradient(180deg,#141922,#050505)] p-1 text-[7px] text-zinc-300"><b className="text-amber-300">Calculadora</b><p className="mt-1">{temp}°C · {num.format(speed)} m/s</p><p>{num.format(area)} m²</p><p>{whole.format(btu)} BTU</p><p className="mt-2 text-amber-200">{money.format(price)}</p></div></div></div><div><p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300 sm:tracking-[.28em]">Calculadora responsive</p><h4 className="mt-1 text-xl font-black">Resumen claro para móvil</h4><p className="mt-1 text-sm text-zinc-400">Las medidas del cuarto actualizan el cálculo, la escala del visor y la boleta pública.</p></div><button type="button" className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-200">Ver detalle ↗</button></div>;
}

export default function ThreeAirRoomViewer(props: ThreeAirRoomViewerProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [view, setView] = useState<View>('front');
  const [spin, setSpin] = useState(false);
  const [temp, setTemp] = useState(24);
  const [fan, setFan] = useState(3);
  const [mode, setMode] = useState<Mode>('frio');
  const [roomLargo, setRoomLargo] = useState(() => safe(props.largo, 4.2));
  const [roomAncho, setRoomAncho] = useState(() => safe(props.ancho, 3.5));
  const [roomAlto, setRoomAlto] = useState(() => safe(props.alto, 2.5));
  const roomArea = Number((roomLargo * roomAncho).toFixed(2));
  const roomBtu = calculateBtu(roomLargo, roomAncho, roomAlto);
  const [selected, setSelected] = useState<BtuOption>(() => closestBtu(safe(props.seleccionado, props.btu || roomBtu || 12000)));
  const selectedInfo = btuOptions.find(item => item.btu === selected) || btuOptions[1];
  const speed = Number((1.1 + fan * .55 + (mode === 'frio' ? .25 : mode === 'auto' ? .1 : 0)).toFixed(1));
  const h = props.compact ? 'h-[330px] sm:h-[390px]' : 'h-[360px] sm:h-[480px] xl:h-[580px]';

  const zoomScene = (factor: number) => {
    const current = controls.current;
    if (!current) return;
    const camera = current.object as THREE.PerspectiveCamera;
    const offset = camera.position.clone().sub(current.target);
    offset.setLength(clamp(offset.length() * factor, 3.3, 11));
    camera.position.copy(current.target).add(offset);
    current.update();
  };

  return <section className="overflow-hidden rounded-[1.6rem] border border-amber-300/20 bg-[#050505] pb-24 text-white shadow-2xl sm:rounded-[2rem] md:pb-0"><div className="grid gap-3 border-b border-white/10 p-3 sm:p-4 lg:grid-cols-[1fr_340px]"><div><p className="text-[9px] font-black uppercase tracking-[.26em] text-amber-300 sm:text-[10px] sm:tracking-[.32em]">Visor 3D premium</p><h2 className="mt-1 text-xl font-black tracking-tight sm:text-4xl">{props.title || 'Cuarto + Aire Acondicionado'}</h2><p className="mt-1 text-xs leading-relaxed text-zinc-400 sm:text-sm">Mide el cuarto, adapta el render, acerca/aleja la cámara y revisa el flujo en tiempo real.</p></div><div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs"><b className="rounded-xl bg-white/10 px-2 py-3">{num.format(roomArea)} m²</b><b className="rounded-xl bg-white/10 px-2 py-3">{whole.format(roomBtu)} BTU</b><b className="rounded-xl bg-amber-400 px-2 py-3 text-black">{whole.format(selected)} BTU</b></div></div><div className="grid gap-4 p-3 xl:grid-cols-[minmax(0,1fr)_340px] xl:p-4"><div className="grid gap-3"><RoomMeasurePanel largo={roomLargo} ancho={roomAncho} alto={roomAlto} setLargo={setRoomLargo} setAncho={setRoomAncho} setAlto={setRoomAlto} area={roomArea} btu={roomBtu} /><div className={`${h} relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,.12),transparent_22rem),#050505] sm:rounded-[1.7rem]`}><Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }} camera={{ position: cameraViews.front, fov: 39 }}><Suspense fallback={null}><CameraRig view={view} spinning={spin} controls={controls} /><RoomModel {...props} area={roomArea} btu={selected} largo={roomLargo} ancho={roomAncho} alto={roomAlto} fan={fan} mode={mode} /></Suspense><OrbitControls ref={controls} enableDamping makeDefault minDistance={3.3} maxDistance={11} maxPolarAngle={Math.PI / 2.08} /></Canvas><div className="pointer-events-none absolute left-3 top-3 rounded-full border border-amber-300/30 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-amber-200 sm:hidden">360°</div><div className="pointer-events-none absolute left-4 top-4 hidden max-w-[240px] rounded-2xl border border-amber-300/30 bg-black/70 p-3 text-xs text-zinc-300 sm:block"><b className="block text-[10px] uppercase tracking-[.25em] text-amber-300">Arrastra para girar</b><span>Usa los botones Zoom +/− o pellizca en móvil.</span></div><div className="pointer-events-none absolute right-3 top-3 rounded-2xl border border-cyan-300/25 bg-black/70 px-3 py-2 text-right text-[10px] sm:left-auto sm:right-4 sm:top-4 sm:text-xs"><span className="block text-zinc-400">Velocidad</span><b className="text-lg text-cyan-200 sm:text-xl">{num.format(speed)} m/s</b></div></div><ViewControls view={view} setView={setView} spin={spin} setSpin={setSpin} zoomIn={() => zoomScene(.82)} zoomOut={() => zoomScene(1.18)} /></div><ControlPanel temp={temp} setTemp={setTemp} fan={fan} setFan={setFan} mode={mode} setMode={setMode} selected={selected} setSelected={setSelected} speed={speed} price={selectedInfo.price} kwh={selectedInfo.kwh} /></div><div className="border-t border-white/10 p-3 xl:p-4"><MobileCalculator selected={selected} temp={temp} speed={speed} price={selectedInfo.price} area={roomArea} btu={roomBtu} /></div></section>;
}
