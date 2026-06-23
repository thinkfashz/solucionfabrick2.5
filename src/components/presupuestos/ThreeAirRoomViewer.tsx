'use client';

import { Suspense, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges, Html, Line, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

type View = 'corner' | 'front' | 'side' | 'back' | 'top';

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

const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const safe = (v: unknown, fb: number) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) && n > 0 ? n : fb; };
const cameraViews: Record<View, [number, number, number]> = { corner: [5.8, 4.2, 6.2], front: [0, 2.9, 7.4], side: [7.3, 2.9, .2], back: [0, 3.1, -7.4], top: [0, 8.8, .1] };

function CameraRig({ view, spinning, controls }: { view: View; spinning: boolean; controls: MutableRefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree();
  useEffect(() => {
    const p = cameraViews[view];
    camera.position.set(...p);
    camera.lookAt(0, 1, 0);
    if (controls.current) { controls.current.target.set(0, 1, 0); controls.current.autoRotate = spinning; controls.current.update(); }
  }, [camera, controls, spinning, view]);
  useFrame((_, delta) => { if (controls.current) controls.current.update(delta); });
  return null;
}

function Label({ children, position }: { children: ReactNode; position: [number, number, number] }) {
  return <Html center distanceFactor={8} position={position} className="pointer-events-none"><span className="whitespace-nowrap rounded-full border border-amber-300/50 bg-black/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-200 shadow-xl shadow-black/40">{children}</span></Html>;
}

function Box({ args, position, color, label }: { args: [number, number, number]; position: [number, number, number]; color: string; label?: string }) {
  return <mesh castShadow receiveShadow position={position}><boxGeometry args={args} /><meshStandardMaterial color={color} roughness={.72} /><Edges color="#ffffff" />{label && <Label position={[0, args[1] / 2 + .12, 0]}>{label}</Label>}</mesh>;
}

function AirWaves() {
  const rows = [-.9, -.35, .25, .85];
  return <>{rows.map((z, i) => <Line key={z} points={[[1.2, 2.45, -1.88], [.25, 1.65, z], [-.9, .86, z + .22]]} color="#00d8ff" lineWidth={1.6 + i * .2} transparent opacity={.62} />)}</>;
}

function RoomModel(props: ThreeAirRoomViewerProps) {
  const area = safe(props.area, 14.7); const largo = safe(props.largo, Math.sqrt(area)); const scale = Math.min(1.15, Math.max(.84, Math.sqrt(area) / 4.2));
  return <group scale={[scale, scale, scale]}>
    <ambientLight intensity={.58} />
    <directionalLight castShadow intensity={1.25} position={[3.5, 6, 5]} />
    <pointLight intensity={1.25} color="#ffc65b" position={[0, 2.9, -.8]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.04, 0]} receiveShadow><planeGeometry args={[8, 7]} /><meshStandardMaterial color="#070707" roughness={.92} /></mesh>
    <Box args={[4.8, .18, 3.5]} position={[0, .09, 0]} color="#5b4634" />
    <Box args={[5.3, .18, 4]} position={[0, -.08, 0]} color="#5f5a52" />
    <Box args={[4.8, 2.65, .18]} position={[0, 1.38, -1.75]} color="#a88462" />
    <Box args={[.18, 2.65, 3.5]} position={[-2.4, 1.38, 0]} color="#8d6848" />
    <Box args={[.18, 2.65, 3.5]} position={[2.4, 1.38, 0]} color="#8d6848" />
    <Box args={[1.05, 1.45, .08]} position={[-.85, 1.48, -1.84]} color="#eef8ff" />
    <Box args={[.45, 1.16, .1]} position={[-2.5, .86, .9]} color="#573213" />
    <Box args={[1.85, .26, 1.22]} position={[.1, .28, .38]} color="#8a5b36" />
    <Box args={[1.95, .18, 1.34]} position={[.1, .55, .38]} color="#d9cbbb" />
    <Box args={[1.9, .55, .15]} position={[.1, .78, -.23]} color="#654121" />
    <Box args={[.42, .18, .38]} position={[-.35, .82, .05]} color="#bfb6aa" />
    <Box args={[.42, .18, .38]} position={[.35, .82, .05]} color="#bfb6aa" />
    <Box args={[.38, .75, .38]} position={[1.68, .4, .95]} color="#36513a" />
    <Box args={[1.1, .36, .32]} position={[1.25, 2.12, -1.86]} color="#f4f5f6" label={`${whole.format(safe(props.btu, 12895))} BTU`} />
    <Line points={[[1.84, 2.12, -1.75], [2.55, 2.08, -1.55], [2.72, 1.08, -1.25]]} color="#f4c400" lineWidth={4} />
    <Box args={[.82, .78, .35]} position={[2.95, .92, -1.08]} color="#edf3f7" label="Condensador" />
    <mesh position={[2.95, .92, -1.27]}><cylinderGeometry args={[.22, .22, .03, 32]} /><meshStandardMaterial color="#20252b" roughness={.5} /></mesh>
    <mesh position={[0, 2.72, -.55]}><sphereGeometry args={[.14, 24, 24]} /><meshStandardMaterial color="#ffd36a" emissive="#ffae18" emissiveIntensity={1.1} /></mesh>
    <AirWaves />
    <Label position={[-1.9, 2.76, -1.78]}>Pared principal</Label><Label position={[-.82, 2.3, -1.92]}>Ventana</Label><Label position={[0, 3.18, -.55]}>Lámpara central</Label><Label position={[1.75, 2.62, -1.9]}>Tubería</Label><Label position={[-2.7, 1.35, .9]}>Puerta</Label><Label position={[2.95, 1.68, -1.08]}>Unidad exterior</Label><Label position={[0, .1, 1.65]}>{num.format(area)} m²</Label>
  </group>;
}

export default function ThreeAirRoomViewer(props: ThreeAirRoomViewerProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const [view, setView] = useState<View>('corner');
  const [spin, setSpin] = useState(false);
  const area = safe(props.area, 14.7); const btu = safe(props.btu, 12895); const equipo = safe(props.seleccionado, 13000);
  const h = props.compact ? 'h-[360px]' : 'h-[520px]';
  return <section className="overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#050505] text-white shadow-2xl"><div className="grid gap-3 border-b border-white/10 p-4 lg:grid-cols-[1fr_320px]"><div><p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Visor 3D premium</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-4xl">{props.title || 'Habitación 360 + aire acondicionado'}</h2><p className="mt-1 text-sm text-zinc-400">Arrastra para rotar, usa zoom y cambia entre vistas técnicas.</p></div><div className="grid grid-cols-3 gap-2 text-center text-xs"><b className="rounded-xl bg-white/10 p-2">{num.format(area)} m²</b><b className="rounded-xl bg-white/10 p-2">{whole.format(btu)} BTU</b><b className="rounded-xl bg-amber-400 p-2 text-black">{whole.format(equipo)} BTU</b></div></div><div className={`${h} relative bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,.12),transparent_22rem),#050505]`}><Canvas shadows camera={{ position: cameraViews.corner, fov: 42 }}><Suspense fallback={null}><CameraRig view={view} spinning={spin} controls={controls} /><RoomModel {...props} /></Suspense><OrbitControls ref={controls} enableDamping makeDefault minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2.05} /></Canvas><div className="pointer-events-none absolute left-4 top-4 rounded-full border border-amber-300/40 bg-black/70 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-200">Arrastra para girar</div><div className="absolute bottom-4 left-1/2 flex w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 flex-wrap justify-center gap-2 rounded-full border border-white/10 bg-black/70 p-2 backdrop-blur-xl">{(['front','corner','side','back','top'] as View[]).map(v=><button key={v} type="button" onClick={()=>{setView(v);setSpin(false)}} className={`rounded-full px-4 py-2 text-xs font-black ${view===v?'bg-amber-400 text-black':'bg-white/10 text-white'}`}>{v==='front'?'Frontal':v==='corner'?'Esquina':v==='side'?'Lateral':v==='back'?'Trasera':'Techo'}</button>)}<button type="button" onClick={()=>setSpin(s=>!s)} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-black text-black">{spin?'Pausar':'Giro suave'}</button></div></div></section>;
}
