'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges, Html, Line, OrbitControls } from '@react-three/drei';
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
  corner: [5.8, 4.2, 6.2],
  front: [0, 2.9, 7.4],
  side: [7.3, 2.9, .2],
  back: [0, 3.1, -7.4],
  top: [0, 8.8, .1],
};

const btuOptions: Array<{ btu: BtuOption; label: string; price: number; kwh: number }> = [
  { btu: 9000, label: '9K', price: 289990, kwh: 118 },
  { btu: 12000, label: '12K', price: 331664, kwh: 158.9 },
  { btu: 18000, label: '18K', price: 489990, kwh: 226 },
  { btu: 24000, label: '24K', price: 649990, kwh: 312 },
];

const fanLabels = ['Baja', 'Media', 'Media-Alta', 'Alta'];
const modeLabels: Record<Mode, string> = { frio: 'Frío', seco: 'Seco', vent: 'Vent.', auto: 'Auto' };
const viewLabels: Record<View, string> = { front: 'Frontal', corner: 'Esquina', side: 'Lateral', back: 'Trasera', top: 'Techo' };

function closestBtu(value: number): BtuOption {
  const n = safe(value, 12000);
  return btuOptions.reduce((best, item) => Math.abs(item.btu - n) < Math.abs(best - n) ? item.btu : best, 12000 as BtuOption);
}

function makeTexture(kind: 'wall' | 'wood' | 'fabric' | 'concrete' | 'rug') {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const base = {
    wall: [150, 126, 96],
    wood: [112, 69, 36],
    fabric: [174, 164, 150],
    concrete: [96, 92, 86],
    rug: [116, 101, 86],
  }[kind];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = kind === 'wood' ? Math.sin((x + y * .35) * .32) * 18 : Math.sin(x * .13 + y * .19) * 7;
      const bands = kind === 'wood' && x % 18 < 2 ? 18 : 0;
      const noise = ((x * 37 + y * 17 + (x * y) % 29) % 31) - 15;
      const weave = kind === 'fabric' || kind === 'rug' ? ((x % 9 === 0 || y % 9 === 0) ? -16 : 0) : 0;
      data[i] = clamp(base[0] + grain + noise + bands + weave, 0, 255);
      data[i + 1] = clamp(base[1] + grain * .55 + noise + bands + weave, 0, 255);
      data[i + 2] = clamp(base[2] + grain * .28 + noise + weave, 0, 255);
      data[i + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'wood' ? 3.4 : 2.2, kind === 'wood' ? 2.6 : 2.2);
  texture.needsUpdate = true;
  return texture;
}

function CameraRig({ view, spinning, controls }: { view: View; spinning: boolean; controls: MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();

  useEffect(() => {
    const p = cameraViews[view];
    camera.position.set(...p);
    camera.lookAt(0, 1, 0);
    if (controls.current) {
      controls.current.target.set(0, 1, 0);
      controls.current.autoRotate = spinning;
      controls.current.autoRotateSpeed = .65;
      controls.current.update();
    }
  }, [camera, controls, spinning, view]);

  useFrame(() => {
    const current = controls.current;
    if (!current) return;
    current.autoRotate = spinning;
    current.autoRotateSpeed = .65;
    current.update();
  });

  return null;
}

function Label({ children, position }: { children: ReactNode; position: [number, number, number] }) {
  return (
    <Html center distanceFactor={8} position={position} className="pointer-events-none hidden md:block">
      <span className="whitespace-nowrap rounded-full border border-amber-300/50 bg-black/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200 shadow-xl shadow-black/40">{children}</span>
    </Html>
  );
}

function Box({ args, position, color, label, map, transparent = false, opacity = 1 }: { args: [number, number, number]; position: [number, number, number]; color: string; label?: string; map?: THREE.Texture; transparent?: boolean; opacity?: number }) {
  return <mesh castShadow receiveShadow position={position}><boxGeometry args={args} /><meshStandardMaterial color={color} map={map} roughness={.74} transparent={transparent} opacity={opacity} metalness={.02} /><Edges color="rgba(255,255,255,.72)" />{label && <Label position={[0, args[1] / 2 + .12, 0]}>{label}</Label>}</mesh>;
}

function WindowPane() {
  return <group position={[-.86, 1.48, -1.86]}>
    <Box args={[1.28, 1.25, .06]} position={[0, 0, 0]} color="#d9eef6" transparent opacity={.32} />
    <Box args={[1.38, .08, .12]} position={[0, .68, .01]} color="#1d2930" />
    <Box args={[1.38, .08, .12]} position={[0, -.68, .01]} color="#1d2930" />
    <Box args={[.08, 1.38, .12]} position={[-.72, 0, .01]} color="#1d2930" />
    <Box args={[.08, 1.38, .12]} position={[.72, 0, .01]} color="#1d2930" />
    <Box args={[.05, 1.22, .1]} position={[0, 0, .02]} color="#24323a" />
    <Box args={[1.2, .05, .1]} position={[0, 0, .025]} color="#24323a" />
  </group>;
}

function TranslucentDoor() {
  return <group position={[-2.51, .92, .9]} rotation={[0, .04, 0]}>
    <Box args={[.08, 1.62, .86]} position={[0, 0, 0]} color="#19140f" />
    <mesh castShadow receiveShadow position={[-.01, .05, 0]}><boxGeometry args={[.065, 1.32, .58]} /><meshPhysicalMaterial color="#d9c7ac" roughness={.28} transparent opacity={.42} transmission={.35} thickness={.18} /><Edges color="#e2a84a" /></mesh>
    <mesh position={[-.06, -.08, -.34]}><sphereGeometry args={[.035, 18, 18]} /><meshStandardMaterial color="#d6a332" metalness={.7} roughness={.22} /></mesh>
  </group>;
}

function AirFlow({ fan, mode }: { fan: number; mode: Mode }) {
  const group = useRef<THREE.Group | null>(null);
  const rows = [-.9, -.45, 0, .45, .9];
  const color = mode === 'frio' ? '#37d9ff' : mode === 'seco' ? '#9ed8ff' : mode === 'auto' ? '#6df7c9' : '#d7f6ff';
  const speed = 1.15 + fan * .42;

  useFrame((state) => {
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      const t = (state.clock.elapsedTime * speed + i * .18) % 1;
      child.position.x = 1.05 - t * 2.6;
      child.position.y = 2.02 - t * .98;
      child.position.z = -1.55 + ((i % 7) - 3) * .18 + t * .42;
      child.scale.setScalar(.55 + t * .55);
    });
  });

  return <>
    {rows.map((z, i) => <Line key={z} points={[[1.2, 2.38, -1.76], [.15, 1.55, z], [-1.12, .92, z + .15]]} color={color} lineWidth={1.2 + fan * .42 + i * .08} transparent opacity={.42 + fan * .08} />)}
    <group ref={group}>{Array.from({ length: 30 }).map((_, i) => <mesh key={i} position={[1.05, 2.02, -1.55]}><sphereGeometry args={[.018 + (i % 3) * .006, 10, 10]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.8} transparent opacity={.82} /></mesh>)}</group>
  </>;
}

function RoomModel({ area, btu, fan, mode }: ThreeAirRoomViewerProps & { fan: number; mode: Mode }) {
  const sceneArea = safe(area, 14.7);
  const scale = Math.min(1.15, Math.max(.84, Math.sqrt(sceneArea) / 4.2));
  const textures = useMemo(() => ({ wall: makeTexture('wall'), wood: makeTexture('wood'), fabric: makeTexture('fabric'), concrete: makeTexture('concrete'), rug: makeTexture('rug') }), []);

  return <group scale={[scale, scale, scale]}>
    <ambientLight intensity={.54} />
    <directionalLight castShadow intensity={1.18} position={[4, 6, 5]} />
    <pointLight intensity={.95} color="#ffbd70" position={[-.9, 1.25, .55]} />
    <pointLight intensity={.75} color="#ffc982" position={[1.38, 1.1, .52]} />
    <Line points={[[-2.25, 2.52, -1.67], [2.18, 2.52, -1.67]]} color="#ffbd63" lineWidth={3} transparent opacity={.48} />
    <Line points={[[2.31, 2.52, -1.62], [2.31, 2.52, 1.44]]} color="#ffbd63" lineWidth={3} transparent opacity={.38} />

    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.055, 0]} receiveShadow><planeGeometry args={[8, 7]} /><meshStandardMaterial color="#070707" roughness={.92} /></mesh>
    <Box args={[4.95, .2, 3.72]} position={[0, .1, 0]} color="#8a5b33" map={textures.wood} />
    <Box args={[5.32, .18, 4.1]} position={[0, -.09, 0]} color="#67625c" map={textures.concrete} />
    <Box args={[4.95, 2.72, .22]} position={[0, 1.4, -1.82]} color="#aa8a68" map={textures.wall} />
    <Box args={[.22, 2.72, 3.72]} position={[-2.47, 1.4, 0]} color="#987252" map={textures.wall} />
    <Box args={[.22, 2.72, 3.72]} position={[2.47, 1.4, 0]} color="#987252" map={textures.wall} />
    <Box args={[5.12, .14, .25]} position={[0, 2.78, -1.82]} color="#d0c0ab" map={textures.concrete} />
    <Box args={[.25, .14, 3.92]} position={[-2.47, 2.78, 0]} color="#d0c0ab" map={textures.concrete} />
    <Box args={[.25, .14, 3.92]} position={[2.47, 2.78, 0]} color="#d0c0ab" map={textures.concrete} />

    <WindowPane />
    <TranslucentDoor />

    <Box args={[2.35, .08, 1.62]} position={[.1, .21, .42]} color="#8b7760" map={textures.rug} />
    <Box args={[1.88, .3, 1.28]} position={[.08, .35, .36]} color="#744827" />
    <Box args={[2.02, .19, 1.42]} position={[.08, .62, .36]} color="#d8c9b6" map={textures.fabric} />
    <Box args={[1.92, .62, .18]} position={[.08, .92, -.37]} color="#70441f" />
    <Box args={[1.72, .1, .38]} position={[.08, .83, .12]} color="#9e8f7f" map={textures.fabric} />
    <Box args={[.45, .16, .42]} position={[-.55, .95, -.18]} color="#d4c9bb" map={textures.fabric} />
    <Box args={[.45, .16, .42]} position={[.02, .95, -.18]} color="#c9bcad" map={textures.fabric} />
    <Box args={[.45, .16, .42]} position={[.56, .95, -.18]} color="#d7cfc3" map={textures.fabric} />
    <Box args={[.42, .42, .42]} position={[-1.22, .42, -.26]} color="#65401f" />
    <Box args={[.42, .42, .42]} position={[1.42, .42, -.22]} color="#65401f" />
    <mesh position={[-1.22, .75, -.25]}><sphereGeometry args={[.11, 22, 16]} /><meshStandardMaterial color="#ffd291" emissive="#ffad39" emissiveIntensity={.95} /></mesh>
    <mesh position={[1.42, .75, -.2]}><sphereGeometry args={[.1, 22, 16]} /><meshStandardMaterial color="#ffd291" emissive="#ffad39" emissiveIntensity={.75} /></mesh>

    <Box args={[.42, .78, .42]} position={[1.78, .43, .98]} color="#345638" />
    <mesh position={[1.78, .92, .98]}><sphereGeometry args={[.33, 18, 16]} /><meshStandardMaterial color="#244b2b" roughness={.9} /></mesh>

    <Box args={[1.24, .38, .35]} position={[1.22, 2.14, -1.92]} color="#f3f4f6" label={`${whole.format(safe(btu, 12895))} BTU`} />
    <Box args={[.86, .035, .035]} position={[1.22, 1.95, -1.7]} color="#38d9ff" />
    <Line points={[[1.86, 2.12, -1.78], [2.56, 2.08, -1.55], [2.76, 1.08, -1.25]]} color="#d8d2c6" lineWidth={5} />
    <Line points={[[1.86, 2.12, -1.78], [2.56, 2.08, -1.55], [2.76, 1.08, -1.25]]} color="#f4c400" lineWidth={2} />
    <Box args={[.92, .82, .42]} position={[2.98, .92, -1.08]} color="#edf3f7" label="Condensador" />
    <mesh position={[2.98, .92, -1.31]}><cylinderGeometry args={[.24, .24, .04, 36]} /><meshStandardMaterial color="#20252b" roughness={.5} /></mesh>
    <mesh position={[2.98, .92, -1.335]}><torusGeometry args={[.25, .018, 10, 36]} /><meshStandardMaterial color="#56616b" metalness={.2} roughness={.5} /></mesh>

    <AirFlow fan={fan} mode={mode} />
    <Label position={[-1.86, 2.82, -1.94]}>Pared principal</Label>
    <Label position={[-.86, 2.34, -1.98]}>Ventana</Label>
    <Label position={[1.72, 2.62, -1.98]}>Tubería</Label>
    <Label position={[-2.78, 1.45, .9]}>Puerta translúcida</Label>
    <Label position={[2.98, 1.74, -1.08]}>Unidad exterior</Label>
    <Label position={[-.18, .16, 1.65]}>{num.format(sceneArea)} m²</Label>
  </group>;
}

function ControlPanel({ temp, setTemp, fan, setFan, mode, setMode, selected, setSelected, speed, price, kwh }: { temp: number; setTemp: (v: number) => void; fan: number; setFan: (v: number) => void; mode: Mode; setMode: (v: Mode) => void; selected: BtuOption; setSelected: (v: BtuOption) => void; speed: number; price: number; kwh: number }) {
  return <aside className="grid content-start gap-3 rounded-[1.5rem] border border-white/10 bg-black/55 p-3 backdrop-blur-xl sm:rounded-[1.7rem] xl:p-4">
    <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300 sm:tracking-[.28em]">Control del equipo</p><button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-300">⏻</button></div>
    <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-xs text-zinc-400">Temperatura</p><div className="mt-2 flex items-center justify-between gap-2"><b className="text-4xl sm:text-3xl">{temp} °C</b><div className="flex gap-2"><button type="button" onClick={() => setTemp(clamp(temp - 1, 16, 30))} className="h-12 w-12 rounded-xl bg-white/10 text-xl font-black sm:h-10 sm:w-10">−</button><button type="button" onClick={() => setTemp(clamp(temp + 1, 16, 30))} className="h-12 w-12 rounded-xl bg-white/10 text-xl font-black sm:h-10 sm:w-10">+</button></div></div><p className="mt-1 text-[11px] text-zinc-500">{mode === 'frio' ? `Enfriando a ${temp} °C` : mode === 'seco' ? 'Reduciendo humedad' : mode === 'auto' ? 'Ajuste automático' : 'Ventilación activa'}</p></div>
    <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-xs text-zinc-400">Velocidad del ventilador</p><div className="mt-2 grid grid-cols-4 gap-2">{[1,2,3,4].map(v => <button type="button" key={v} onClick={() => setFan(v)} className={`min-h-11 rounded-xl px-2 py-2 text-lg ${fan === v ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>♨</button>)}</div><p className="mt-2 text-xs text-zinc-400">{fanLabels[fan - 1]}</p></div>
    <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-xs text-zinc-400">Clima / modo</p><div className="mt-2 grid grid-cols-4 gap-2">{(['frio','seco','vent','auto'] as Mode[]).map(v => <button type="button" key={v} onClick={() => setMode(v)} className={`min-h-11 rounded-xl px-2 py-2 text-xs font-black ${mode === v ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>{modeLabels[v]}</button>)}</div></div>
    <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><div className="flex items-center justify-between"><p className="text-xs text-zinc-400">Partículas de aire</p><span className="text-[11px] text-emerald-300">● óptimo</span></div><b className="mt-1 block text-3xl">{num.format(speed)} m/s</b><div className="mt-3 h-10 overflow-hidden rounded-xl bg-cyan-400/10 sm:h-12"><div className="h-full origin-left bg-[linear-gradient(90deg,rgba(34,211,238,.05),rgba(34,211,238,.7),rgba(34,211,238,.05))]" style={{ transform: `scaleX(${clamp(speed / 4, .25, 1)})` }} /></div></div>
    <div className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Selecciona BTU</p><div className="mt-3 grid grid-cols-2 gap-2">{btuOptions.map(item => <button type="button" key={item.btu} onClick={() => setSelected(item.btu)} className={`rounded-2xl border p-3 text-left ${selected === item.btu ? 'border-amber-300 bg-amber-400 text-black' : 'border-white/10 bg-black/25 text-white'}`}><b className="text-xl">{item.label}</b><p className="text-xs opacity-75">{whole.format(item.btu)} BTU</p></button>)}</div></div>
    <div className="rounded-2xl border border-amber-300/20 bg-black/45 p-4"><p className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300">Presupuesto</p><b className="mt-2 block text-sm">Equipo referencial {whole.format(selected)} BTU</b><strong className="mt-1 block text-3xl">{money.format(price)}</strong><p className="mt-1 text-xs text-zinc-400">{num.format(kwh)} kWh/mes estimado</p><button type="button" className="mt-4 w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black">Agregar al presupuesto →</button></div>
  </aside>;
}

function ViewControls({ view, setView, spin, setSpin }: { view: View; setView: (v: View) => void; spin: boolean; setSpin: (v: boolean) => void }) {
  return <div className="rounded-[1.35rem] border border-white/10 bg-black/55 p-2 backdrop-blur-xl sm:rounded-full">
    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-center">
      {(['front','corner','side','back','top'] as View[]).map(v => <button key={v} type="button" onClick={() => { setView(v); setSpin(false); }} className={`min-h-11 rounded-2xl px-3 py-2 text-xs font-black sm:rounded-full sm:px-4 ${view === v ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>{viewLabels[v]}</button>)}
      <button type="button" onClick={() => setSpin(!spin)} className="col-span-3 min-h-11 rounded-2xl bg-amber-400 px-4 py-2 text-xs font-black text-black sm:col-auto sm:rounded-full">{spin ? 'Pausar giro' : 'Giro suave'}</button>
    </div>
  </div>;
}

function MobileCalculator({ selected, temp, speed, price }: { selected: BtuOption; temp: number; speed: number; price: number }) {
  return <div className="grid gap-3 rounded-[1.5rem] border border-amber-300/15 bg-black/55 p-4 sm:grid-cols-[170px_1fr_auto] sm:items-center sm:rounded-[1.7rem]">
    <div className="rounded-[1.3rem] border border-white/10 bg-[#0d1115] p-3"><div className="mx-auto h-24 w-14 rounded-2xl border border-white/15 bg-black p-1"><div className="h-full rounded-xl bg-[linear-gradient(180deg,#141922,#050505)] p-1 text-[7px] text-zinc-300"><b className="text-amber-300">Calculadora</b><p className="mt-1">{temp}°C · {num.format(speed)} m/s</p><p>{whole.format(selected)} BTU</p><p className="mt-2 text-amber-200">{money.format(price)}</p></div></div></div>
    <div><p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300 sm:tracking-[.28em]">Calculadora responsive</p><h4 className="mt-1 text-xl font-black">Resumen claro para móvil</h4><p className="mt-1 text-sm text-zinc-400">El equipo, temperatura, flujo y precio quedan separados del visor para evitar textos montados.</p></div>
    <button type="button" className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-200">Ver detalle ↗</button>
  </div>;
}

export default function ThreeAirRoomViewer(props: ThreeAirRoomViewerProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [view, setView] = useState<View>('corner');
  const [spin, setSpin] = useState(false);
  const [temp, setTemp] = useState(24);
  const [fan, setFan] = useState(3);
  const [mode, setMode] = useState<Mode>('frio');
  const [selected, setSelected] = useState<BtuOption>(() => closestBtu(safe(props.seleccionado, props.btu || 12000)));

  const area = safe(props.area, 14.7);
  const calculatedBtu = safe(props.btu, 12895);
  const selectedInfo = btuOptions.find(item => item.btu === selected) || btuOptions[1];
  const speed = Number((1.1 + fan * .55 + (mode === 'frio' ? .25 : mode === 'auto' ? .1 : 0)).toFixed(1));
  const h = props.compact ? 'h-[290px] sm:h-[360px]' : 'h-[310px] sm:h-[430px] xl:h-[520px]';

  return <section className="overflow-hidden rounded-[1.6rem] border border-amber-300/20 bg-[#050505] pb-24 text-white shadow-2xl sm:rounded-[2rem] md:pb-0">
    <div className="grid gap-3 border-b border-white/10 p-3 sm:p-4 lg:grid-cols-[1fr_340px]">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.26em] text-amber-300 sm:text-[10px] sm:tracking-[.32em]">Visor 3D premium</p>
        <h2 className="mt-1 text-xl font-black tracking-tight sm:text-4xl">{props.title || 'Habitación 360 + aire acondicionado'}</h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400 sm:text-sm">Cuarto mejorado con texturas, control de equipo y flujo en tiempo real.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] sm:text-xs">
        <b className="rounded-xl bg-white/10 px-2 py-3">{num.format(area)} m²</b>
        <b className="rounded-xl bg-white/10 px-2 py-3">{whole.format(calculatedBtu)} BTU</b>
        <b className="rounded-xl bg-amber-400 px-2 py-3 text-black">{whole.format(selected)} BTU</b>
      </div>
    </div>

    <div className="grid gap-4 p-3 xl:grid-cols-[minmax(0,1fr)_340px] xl:p-4">
      <div className="grid gap-3">
        <div className={`${h} relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,.12),transparent_22rem),#050505] sm:rounded-[1.7rem]`}>
          <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }} camera={{ position: cameraViews.corner, fov: 42 }}>
            <Suspense fallback={null}><CameraRig view={view} spinning={spin} controls={controls} /><RoomModel {...props} btu={selected} fan={fan} mode={mode} /></Suspense>
            <OrbitControls ref={controls} enableDamping makeDefault minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2.05} />
          </Canvas>
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-amber-300/30 bg-black/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-amber-200 sm:hidden">360°</div>
          <div className="pointer-events-none absolute left-4 top-4 hidden max-w-[220px] rounded-2xl border border-amber-300/30 bg-black/70 p-3 text-xs text-zinc-300 sm:block"><b className="block text-[10px] uppercase tracking-[.25em] text-amber-300">Arrastra para girar</b><span>Explora en 360°, usa zoom y revisa tubería, puerta, ventana y flujo.</span></div>
          <div className="pointer-events-none absolute right-3 top-3 rounded-2xl border border-cyan-300/25 bg-black/70 px-3 py-2 text-right text-[10px] sm:left-1/2 sm:right-auto sm:top-[42%] sm:-translate-x-1/2 sm:text-center sm:text-xs"><span className="block text-zinc-400">Velocidad</span><b className="text-lg text-cyan-200 sm:text-xl">{num.format(speed)} m/s</b></div>
        </div>
        <ViewControls view={view} setView={setView} spin={spin} setSpin={setSpin} />
      </div>
      <ControlPanel temp={temp} setTemp={setTemp} fan={fan} setFan={setFan} mode={mode} setMode={setMode} selected={selected} setSelected={setSelected} speed={speed} price={selectedInfo.price} kwh={selectedInfo.kwh} />
    </div>
    <div className="border-t border-white/10 p-3 xl:p-4"><MobileCalculator selected={selected} temp={temp} speed={speed} price={selectedInfo.price} /></div>
  </section>;
}
