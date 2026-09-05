'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, Html, OrbitControls } from '@react-three/drei';
import { Layers3, Move3D, PackageCheck, Ruler } from 'lucide-react';

type Shape = 'rect' | 'L' | 'U' | 'T' | 'H' | 'I';
type Piece = { x: number; z: number; w: number; d: number; name: string };

export type ThreeRadierViewerProps = {
  shape?: Shape | string;
  largo?: number;
  ancho?: number;
  brazoX?: number;
  brazoY?: number;
  vanoW?: number;
  vanoD?: number;
  almaW?: number;
  almaD?: number;
  espesor?: number;
  base?: number;
  gravillaBase?: number;
  area?: number;
  hormigon?: number;
  sacos?: number;
  compact?: boolean;
  title?: string;
};

const labels: Record<Shape, string> = { rect: 'Recto', L: 'Tipo L', U: 'Tipo U', T: 'Tipo T', H: 'Tipo H', I: 'Tipo I' };
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const safe = (v: unknown, fb: number) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) && n > 0 ? n : fb; };
const shapeOf = (v?: string): Shape => (v === 'L' || v === 'U' || v === 'T' || v === 'H' || v === 'I' || v === 'rect' ? v : 'rect');

function pieces(p: Required<Pick<ThreeRadierViewerProps, 'shape' | 'largo' | 'ancho' | 'brazoX' | 'brazoY' | 'vanoW' | 'vanoD' | 'almaW' | 'almaD'>>): Piece[] {
  const shape = shapeOf(String(p.shape));
  const largo = safe(p.largo, 6);
  const ancho = safe(p.ancho, 4);
  if (shape === 'rect') return [{ x: 0, z: 0, w: largo, d: ancho, name: 'losa completa' }];
  if (shape === 'L') {
    const bx = clamp(safe(p.brazoX, largo * .55), .2, largo);
    const by = clamp(safe(p.brazoY, ancho * .55), .2, ancho);
    return [{ x: -largo / 2 + bx / 2, z: 0, w: bx, d: ancho, name: 'brazo principal' }, { x: bx / 2, z: ancho / 2 - by / 2, w: largo - bx, d: by, name: 'retorno' }];
  }
  if (shape === 'U') {
    const vano = clamp(safe(p.vanoW, largo * .38), .2, largo * .82);
    const fondo = clamp(safe(p.vanoD, ancho * .55), .2, ancho * .88);
    const leg = (largo - vano) / 2;
    const back = ancho - fondo;
    return [{ x: -largo / 2 + leg / 2, z: 0, w: leg, d: ancho, name: 'ala izquierda' }, { x: largo / 2 - leg / 2, z: 0, w: leg, d: ancho, name: 'ala derecha' }, { x: 0, z: ancho / 2 - back / 2, w: largo, d: back, name: 'fondo' }];
  }
  if (shape === 'T') {
    const aw = clamp(safe(p.almaW, largo * .3), .2, largo);
    const ad = clamp(safe(p.almaD, ancho * .55), .2, ancho);
    const bar = Math.max(ancho - ad, ancho * .22);
    return [{ x: 0, z: -ancho / 2 + bar / 2, w: largo, d: bar, name: 'barra superior' }, { x: 0, z: ancho / 2 - ad / 2, w: aw, d: ad, name: 'tallo central' }];
  }
  if (shape === 'H') {
    const col = clamp(safe(p.brazoX, largo * .23), .2, largo * .42);
    const bridge = clamp(safe(p.almaD, ancho * .32), .2, ancho * .7);
    return [{ x: -largo / 2 + col / 2, z: 0, w: col, d: ancho, name: 'columna izquierda' }, { x: largo / 2 - col / 2, z: 0, w: col, d: ancho, name: 'columna derecha' }, { x: 0, z: 0, w: Math.max(.2, largo - col * 2), d: bridge, name: 'puente central' }];
  }
  const head = clamp(safe(p.brazoY, ancho * .22), .2, ancho * .45);
  const alma = clamp(safe(p.almaW, largo * .28), .2, largo);
  return [{ x: 0, z: -ancho / 2 + head / 2, w: largo, d: head, name: 'cabezal superior' }, { x: 0, z: 0, w: alma, d: Math.max(.2, ancho - head * 2), name: 'alma central' }, { x: 0, z: ancho / 2 - head / 2, w: largo, d: head, name: 'cabezal inferior' }];
}

function Slab({ piece, y, h, color, label }: { piece: Piece; y: number; h: number; color: string; label?: string }) {
  return <mesh position={[piece.x, y, piece.z]} castShadow receiveShadow><boxGeometry args={[piece.w, h, piece.d]} /><meshStandardMaterial color={color} roughness={.82} /><Edges color="#FFF9EE" />{label ? <Html center position={[0, h / 2 + .04, 0]} className="pointer-events-none"><span className="rounded-full border border-[#E6B56F]/40 bg-[#111214]/85 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#F4D9B0] shadow-lg">{label}</span></Html> : null}</mesh>;
}

function RadierModel(props: ThreeRadierViewerProps) {
  const shape = shapeOf(String(props.shape || 'rect'));
  const largo = safe(props.largo, 6);
  const ancho = safe(props.ancho, 4);
  const base = Math.max(.04, safe(props.base, 10) / 100);
  const grav = Math.max(.04, safe(props.gravillaBase, 5) / 100);
  const horm = Math.max(.06, safe(props.espesor, 10) / 100);
  const parts = useMemo(() => pieces({ shape, largo, ancho, brazoX: safe(props.brazoX, 3), brazoY: safe(props.brazoY, 2), vanoW: safe(props.vanoW, 2), vanoD: safe(props.vanoD, 2), almaW: safe(props.almaW, 1.4), almaD: safe(props.almaD, 2.2) }), [shape, largo, ancho, props.brazoX, props.brazoY, props.vanoW, props.vanoD, props.almaW, props.almaD]);
  return <>
    <color attach="background" args={['#0E0E10']} />
    <ambientLight intensity={.72} />
    <hemisphereLight intensity={.55} color="#fff5df" groundColor="#4b3624" />
    <directionalLight position={[4, 7, 5]} intensity={1.35} castShadow />
    <directionalLight position={[-5, 4, -4]} intensity={.38} />
    <gridHelper args={[14, 14, '#8d6335', '#261b12']} position={[0, -.02, 0]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.035, 0]} receiveShadow><planeGeometry args={[14, 10]} /><meshStandardMaterial color="#0E0E10" roughness={.92} /></mesh>
    {parts.map((p, i) => <group key={p.name + i}><Slab piece={p} y={base / 2} h={base} color="#684A31" /><Slab piece={p} y={base + grav / 2} h={grav} color="#A4937E" /><Slab piece={p} y={base + grav + horm / 2} h={horm} color="#D8CEC0" label={i === 0 ? labels[shape] : undefined} /></group>)}
    <OrbitControls enableDamping makeDefault minDistance={4} maxDistance={14} maxPolarAngle={Math.PI / 2.08} />
  </>;
}

export default function ThreeRadierViewer(props: ThreeRadierViewerProps) {
  const shape = shapeOf(String(props.shape || 'rect'));
  const h = props.compact ? 'h-[320px]' : 'h-[390px] sm:h-[460px]';
  const base = safe(props.base, 10);
  const gravel = safe(props.gravillaBase, 5);
  const concrete = safe(props.espesor, 10);
  return <section className="overflow-hidden rounded-[1.65rem] border border-black/[.07] bg-[#111214] text-white shadow-[0_22px_65px_rgba(0,0,0,.16)]">
    <div className="grid gap-4 border-b border-white/[.07] p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
      <div><p className="text-[8px] font-black uppercase tracking-[.16em] text-[#E6B56F]">Vista constructiva</p><h3 className="mt-1 text-xl font-black tracking-[-.035em] sm:text-2xl">{props.title || `Radier ${labels[shape]} por capas`}</h3><p className="mt-1 text-[10px] leading-5 text-white/35">Proporción visual basada en las medidas ingresadas. Gira y acerca para revisar forma y estratos.</p></div>
      <div className="grid grid-cols-3 gap-1.5 text-center"><ViewerMetric icon={<MaximizeIcon />} value={`${num.format(safe(props.area, 0))} m²`} /><ViewerMetric icon={<Layers3 className="h-3.5 w-3.5" />} value={`${num.format(safe(props.hormigon, 0))} m³`} /><ViewerMetric accent icon={<PackageCheck className="h-3.5 w-3.5" />} value={`${whole.format(safe(props.sacos, 0))} sacos`} /></div>
    </div>
    <div className={`${h} relative`}><Canvas shadows dpr={[1, 1.6]} camera={{ position: [5.5, 4.2, 6.2], fov: 45 }}><Suspense fallback={null}><RadierModel {...props} /></Suspense></Canvas><div className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.1em] text-white/65 backdrop-blur-md"><Move3D className="h-3.5 w-3.5 text-[#E6B56F]" /> Arrastra · gira · zoom</div></div>
    <div className="grid gap-2 border-t border-white/[.07] bg-[#0E0E10] p-3 sm:grid-cols-3 sm:p-4"><LayerLegend label="Hormigón" value={`${concrete} cm`} swatch="bg-[#D8CEC0]" /><LayerLegend label="Gravilla" value={`${gravel} cm`} swatch="bg-[#A4937E]" /><LayerLegend label="Estabilizado" value={`${base} cm`} swatch="bg-[#684A31]" /></div>
  </section>;
}

function MaximizeIcon() { return <Ruler className="h-3.5 w-3.5" />; }

function ViewerMetric({ icon, value, accent = false }: { icon: React.ReactNode; value: string; accent?: boolean }) {
  return <div className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-[9px] font-black ${accent ? 'bg-[#F5871F] text-black' : 'bg-white/[.055] text-white/70'}`}>{icon}<span>{value}</span></div>;
}

function LayerLegend({ label, value, swatch }: { label: string; value: string; swatch: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-white/[.035] px-3 py-2"><span className={`h-3 w-3 rounded-sm ${swatch}`} /><span className="min-w-0 flex-1 text-[9px] font-black uppercase tracking-[.1em] text-white/40">{label}</span><b className="text-[10px] text-white/75">{value}</b></div>;
}