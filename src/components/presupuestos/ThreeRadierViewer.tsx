'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges, Html, OrbitControls } from '@react-three/drei';

type Shape = 'rect' | 'L' | 'U' | 'T' | 'H' | 'I';
type Piece = { x: number; z: number; w: number; d: number; name: string };

export type ThreeRadierViewerProps = { shape?: Shape | string; largo?: number; ancho?: number; brazoX?: number; brazoY?: number; vanoW?: number; vanoD?: number; almaW?: number; almaD?: number; espesor?: number; base?: number; gravillaBase?: number; area?: number; hormigon?: number; sacos?: number; compact?: boolean; title?: string };

const labels: Record<Shape, string> = { rect: 'Recto', L: 'Tipo L', U: 'Tipo U', T: 'Tipo T', H: 'Tipo H', I: 'Tipo I' };
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const safe = (v: unknown, fb: number) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) && n > 0 ? n : fb; };
const shapeOf = (v?: string): Shape => (v === 'L' || v === 'U' || v === 'T' || v === 'H' || v === 'I' || v === 'rect' ? v : 'rect');

function pieces(p: Required<Pick<ThreeRadierViewerProps, 'shape' | 'largo' | 'ancho' | 'brazoX' | 'brazoY' | 'vanoW' | 'vanoD' | 'almaW' | 'almaD'>>): Piece[] {
  const shape = shapeOf(String(p.shape)); const largo = safe(p.largo, 6); const ancho = safe(p.ancho, 4);
  if (shape === 'rect') return [{ x: 0, z: 0, w: largo, d: ancho, name: 'losa completa' }];
  if (shape === 'L') { const bx = clamp(safe(p.brazoX, largo * .55), .2, largo); const by = clamp(safe(p.brazoY, ancho * .55), .2, ancho); return [{ x: -largo / 2 + bx / 2, z: 0, w: bx, d: ancho, name: 'brazo principal' }, { x: bx / 2, z: ancho / 2 - by / 2, w: largo - bx, d: by, name: 'retorno' }]; }
  if (shape === 'U') { const vano = clamp(safe(p.vanoW, largo * .38), .2, largo * .82); const fondo = clamp(safe(p.vanoD, ancho * .55), .2, ancho * .88); const leg = (largo - vano) / 2; const back = ancho - fondo; return [{ x: -largo / 2 + leg / 2, z: 0, w: leg, d: ancho, name: 'ala izquierda' }, { x: largo / 2 - leg / 2, z: 0, w: leg, d: ancho, name: 'ala derecha' }, { x: 0, z: ancho / 2 - back / 2, w: largo, d: back, name: 'fondo' }]; }
  if (shape === 'T') { const aw = clamp(safe(p.almaW, largo * .3), .2, largo); const ad = clamp(safe(p.almaD, ancho * .55), .2, ancho); const bar = Math.max(ancho - ad, ancho * .22); return [{ x: 0, z: -ancho / 2 + bar / 2, w: largo, d: bar, name: 'barra superior' }, { x: 0, z: ancho / 2 - ad / 2, w: aw, d: ad, name: 'tallo central' }]; }
  if (shape === 'H') { const col = clamp(safe(p.brazoX, largo * .23), .2, largo * .42); const bridge = clamp(safe(p.almaD, ancho * .32), .2, ancho * .7); return [{ x: -largo / 2 + col / 2, z: 0, w: col, d: ancho, name: 'columna izquierda' }, { x: largo / 2 - col / 2, z: 0, w: col, d: ancho, name: 'columna derecha' }, { x: 0, z: 0, w: Math.max(.2, largo - col * 2), d: bridge, name: 'puente central' }]; }
  const head = clamp(safe(p.brazoY, ancho * .22), .2, ancho * .45); const alma = clamp(safe(p.almaW, largo * .28), .2, largo);
  return [{ x: 0, z: -ancho / 2 + head / 2, w: largo, d: head, name: 'cabezal superior' }, { x: 0, z: 0, w: alma, d: Math.max(.2, ancho - head * 2), name: 'alma central' }, { x: 0, z: ancho / 2 - head / 2, w: largo, d: head, name: 'cabezal inferior' }];
}

function Slab({ piece, y, h, color, label }: { piece: Piece; y: number; h: number; color: string; label?: string }) {
  return <mesh position={[piece.x, y, piece.z]} castShadow receiveShadow><boxGeometry args={[piece.w, h, piece.d]} /><meshStandardMaterial color={color} roughness={0.82} /><Edges color="#ffffff" />{label && <Html center position={[0, h / 2 + .04, 0]} className="pointer-events-none"><span className="rounded-full border border-amber-300/40 bg-black/75 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100">{label}</span></Html>}</mesh>;
}

function RadierModel(props: ThreeRadierViewerProps) {
  const shape = shapeOf(String(props.shape || 'rect')); const largo = safe(props.largo, 6); const ancho = safe(props.ancho, 4);
  const base = Math.max(.04, safe(props.base, 10) / 100), grav = Math.max(.04, safe(props.gravillaBase, 5) / 100), horm = Math.max(.06, safe(props.espesor, 10) / 100);
  const parts = useMemo(() => pieces({ shape, largo, ancho, brazoX: safe(props.brazoX, 3), brazoY: safe(props.brazoY, 2), vanoW: safe(props.vanoW, 2), vanoD: safe(props.vanoD, 2), almaW: safe(props.almaW, 1.4), almaD: safe(props.almaD, 2.2) }), [shape, largo, ancho, props.brazoX, props.brazoY, props.vanoW, props.vanoD, props.almaW, props.almaD]);
  return <><ambientLight intensity={.65} /><directionalLight position={[4, 7, 5]} intensity={1.3} castShadow /><directionalLight position={[-5, 4, -4]} intensity={.45} /><gridHelper args={[14, 14, '#7c5c24', '#22170a']} position={[0, -.02, 0]} /><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.035, 0]} receiveShadow><planeGeometry args={[14, 10]} /><meshStandardMaterial color="#080604" roughness={.9} /></mesh>{parts.map((p, i) => <group key={p.name + i}><Slab piece={p} y={base / 2} h={base} color="#6b4f34" /><Slab piece={p} y={base + grav / 2} h={grav} color="#9a866d" /><Slab piece={p} y={base + grav + horm / 2} h={horm} color="#d2c4ae" label={i === 0 ? labels[shape] : undefined} /></group>)}<OrbitControls enableDamping makeDefault minDistance={4} maxDistance={14} maxPolarAngle={Math.PI / 2.08} /></>;
}

export default function ThreeRadierViewer(props: ThreeRadierViewerProps) {
  const shape = shapeOf(String(props.shape || 'rect'));
  const h = props.compact ? 'h-[320px]' : 'h-[440px]';
  return <section className="overflow-hidden rounded-[2rem] border border-amber-300/20 bg-black text-white shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4"><div><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Visor Three.js</p><h3 className="text-2xl font-black">{props.title || `Radier ${labels[shape]} interactivo`}</h3></div><div className="grid grid-cols-3 gap-2 text-center text-xs"><b className="rounded-xl bg-white/10 p-2">{num.format(safe(props.area, 0))} m²</b><b className="rounded-xl bg-white/10 p-2">{num.format(safe(props.hormigon, 0))} m³</b><b className="rounded-xl bg-amber-400 p-2 text-black">{whole.format(safe(props.sacos, 0))} sacos</b></div></div><div className={`${h} relative`}><Canvas shadows camera={{ position: [5.5, 4.2, 6.2], fov: 45 }}><Suspense fallback={null}><RadierModel {...props} /></Suspense></Canvas><div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-100">Arrastra · zoom · gira</div></div></section>;
}
