'use client';

import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, Sky, Stars } from '@react-three/drei';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Menu,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  Sun,
  TreePine,
  X,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DataTexture,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType,
  type Texture,
} from 'three';
import { calculateRadier, RADIER_SHAPES, type RadierShape } from '@/lib/radierCalculator';

type Drawer = 'measures' | 'layers' | 'environment' | null;
type LightMode = 'day' | 'sunset' | 'night';
type TextureKind = 'grass' | 'soil' | 'base' | 'gravel' | 'concrete';
type Piece = { x: number; z: number; w: number; d: number; key: string };
type LayerKey = 'excavation' | 'fill' | 'base' | 'gravel' | 'barrier' | 'mesh' | 'concrete' | 'formwork' | 'vegetation';

const STAGES = [
  [0, 'Replanteo'],
  [10, 'Excavación visible'],
  [24, 'Relleno y plataforma'],
  [36, 'Base compactada'],
  [49, 'Gravilla'],
  [60, 'Barrera de humedad'],
  [70, 'Malla ACMA'],
  [80, 'Moldaje'],
  [89, 'Hormigonado'],
  [97, 'Afinado y terminación'],
] as const;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const visibleAt = (timeline: number, start: number) => clamp((timeline - start) / 8);

function stageLabel(timeline: number) {
  let label: string = STAGES[0][1];
  for (const [start, current] of STAGES) if (timeline >= start) label = current;
  return label;
}

function pseudo(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function makeTexture(kind: TextureKind) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const base: Record<TextureKind, [number, number, number]> = {
    grass: [73, 111, 58],
    soil: [105, 72, 45],
    base: [115, 92, 67],
    gravel: [145, 139, 128],
    concrete: [181, 184, 183],
  };
  const seed = ['grass', 'soil', 'base', 'gravel', 'concrete'].indexOf(kind) + 5;
  for (let index = 0; index < size * size; index += 1) {
    const fleck = pseudo(index + 781, seed) > (kind === 'gravel' ? .88 : .95) ? 34 : 0;
    const noise = (pseudo(index, seed) - .5) * (kind === 'concrete' ? 26 : 54) + fleck;
    const rgb = base[kind];
    data[index * 4] = Math.max(0, Math.min(255, rgb[0] + noise));
    data[index * 4 + 1] = Math.max(0, Math.min(255, rgb[1] + noise * .82));
    data[index * 4 + 2] = Math.max(0, Math.min(255, rgb[2] + noise * .62));
    data[index * 4 + 3] = 255;
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 8);
  return texture;
}

function layout(shape: RadierShape, length: number, width: number): Piece[] {
  const l = Math.max(.5, length);
  const w = Math.max(.5, width);
  if (shape === 'rectangular') return [{ x: 0, z: 0, w: l, d: w, key: 'rect' }];
  if (shape === 'l') return [
    { x: -l * .275, z: 0, w: l * .45, d: w, key: 'l-a' },
    { x: l * .225, z: w * .16, w: l * .55, d: w * .68, key: 'l-b' },
  ];
  if (shape === 'u') return [
    { x: -l * .38, z: 0, w: l * .24, d: w, key: 'u-a' },
    { x: l * .38, z: 0, w: l * .24, d: w, key: 'u-b' },
    { x: 0, z: w * .27, w: l * .52, d: w * .46, key: 'u-c' },
  ];
  if (shape === 't') return [
    { x: 0, z: -w * .36, w: l, d: w * .28, key: 't-a' },
    { x: 0, z: w * .14, w: l * .5, d: w * .72, key: 't-b' },
  ];
  if (shape === 'h') return [
    { x: -l * .39, z: 0, w: l * .22, d: w, key: 'h-a' },
    { x: l * .39, z: 0, w: l * .22, d: w, key: 'h-b' },
    { x: 0, z: 0, w: l * .56, d: w * .43, key: 'h-c' },
  ];
  return [
    { x: 0, z: -w * .41, w: l, d: w * .18, key: 'i-a' },
    { x: 0, z: 0, w: l * .44, d: w * .64, key: 'i-b' },
    { x: 0, z: w * .41, w: l, d: w * .18, key: 'i-c' },
  ];
}

export default function RadierConstructionLab() {
  const [length, setLength] = useState(6);
  const [width, setWidth] = useState(4);
  const [thickness, setThickness] = useState(10);
  const [baseDepth, setBaseDepth] = useState(10);
  const [gravelDepth, setGravelDepth] = useState(5);
  const [shape, setShape] = useState<RadierShape>('rectangular');
  const [timeline, setTimeline] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>('measures');
  const [light, setLight] = useState<LightMode>('day');
  const [exploded, setExploded] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({ excavation: true, fill: true, base: true, gravel: true, barrier: true, mesh: true, concrete: true, formwork: true, vegetation: true });
  const result = useMemo(() => calculateRadier({ length, width, thickness, baseDepth, gravelDepth, shape }), [baseDepth, gravelDepth, length, shape, thickness, width]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTimeline((current) => {
        if (current >= 100) {
          setPlaying(false);
          return 100;
        }
        return Math.min(100, current + 1);
      });
    }, 115);
    return () => window.clearInterval(timer);
  }, [playing]);

  const play = () => {
    setTimeline((value) => (value >= 100 ? 0 : value));
    setPlaying(true);
    setAutoRotate(false);
  };
  const reset = () => {
    setPlaying(false);
    setTimeline(0);
  };
  const toggle = (id: LayerKey) => setLayers((current) => ({ ...current, [id]: !current[id] }));

  return <div className="fixed inset-0 z-[120] overflow-hidden bg-[#020507] text-white">
    <div className="absolute inset-0">
      <Canvas shadows dpr={[1, 1.55]} camera={{ position: [8, 5.3, 9], fov: 43, near: .05, far: 150 }}>
        <Suspense fallback={null}>
          <RadierScene
            length={length}
            width={width}
            thickness={thickness}
            baseDepth={baseDepth}
            gravelDepth={gravelDepth}
            shape={shape}
            timeline={timeline}
            layers={layers}
            exploded={exploded}
            light={light}
            autoRotate={autoRotate}
          />
        </Suspense>
      </Canvas>
    </div>

    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.54),transparent_26%,transparent_72%,rgba(0,0,0,.68))]" />

    <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 sm:p-4">
      <Link href="/herramientas/radier" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/58 px-4 text-[10px] font-black text-white/80 backdrop-blur-xl"><ArrowLeft size={15} /> Radier</Link>
      <div className="hidden rounded-full border border-white/10 bg-black/55 px-4 py-2 text-center backdrop-blur-xl sm:block"><span className="block text-[8px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Laboratorio radier 4D</span><b className="text-[10px]">+0,30 m sobre terreno · {stageLabel(timeline)}</b></div>
      <button type="button" onClick={() => setDrawer((value) => value ? null : 'measures')} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/58 px-4 text-[10px] font-black backdrop-blur-xl"><Menu size={15} /> Menú</button>
    </header>

    <div className="absolute left-3 top-[70px] z-30 flex gap-1 rounded-full border border-white/10 bg-black/52 p-1 backdrop-blur-xl sm:left-4 sm:top-[76px]">
      <Quick active={exploded} onClick={() => setExploded((value) => !value)} icon={<Layers3 size={12} />} label="Capas" />
      <Quick active={layers.excavation} onClick={() => toggle('excavation')} icon={<Mountain size={12} />} label="Excavación" />
      <Quick active={layers.vegetation} onClick={() => toggle('vegetation')} icon={<TreePine size={12} />} label="Vegetación" />
      <Quick active={autoRotate} onClick={() => setAutoRotate((value) => !value)} icon={<Sun size={12} />} label="360°" />
    </div>

    {drawer ? <aside className="absolute bottom-[92px] right-3 top-[68px] z-40 w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-[1.5rem] border border-white/12 bg-[#071017]/95 p-4 shadow-2xl backdrop-blur-2xl sm:right-4 sm:top-[76px]">
      <div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.18em] text-[#F6C64A]">Controles dentro del visor</p><h2 className="mt-1 text-lg font-black">{drawer === 'measures' ? 'Medidas y forma' : drawer === 'layers' ? 'Capas' : 'Entorno'}</h2></div><button type="button" onClick={() => setDrawer(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[.06] text-white/65"><X size={15} /></button></div>
      <div className="mt-4 grid grid-cols-3 gap-1"><Tab active={drawer === 'measures'} onClick={() => setDrawer('measures')} label="Medidas" /><Tab active={drawer === 'layers'} onClick={() => setDrawer('layers')} label="Capas" /><Tab active={drawer === 'environment'} onClick={() => setDrawer('environment')} label="Entorno" /></div>

      {drawer === 'measures' ? <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2"><NumberField label="Largo (m)" value={length} min={1} max={20} step={.5} onChange={setLength} /><NumberField label="Ancho (m)" value={width} min={1} max={20} step={.5} onChange={setWidth} /><NumberField label="Espesor (cm)" value={thickness} min={5} max={30} step={1} onChange={setThickness} /><NumberField label="Base (cm)" value={baseDepth} min={5} max={30} step={1} onChange={setBaseDepth} /><NumberField label="Gravilla (cm)" value={gravelDepth} min={3} max={20} step={1} onChange={setGravelDepth} /></div>
        <div><p className="text-[8px] font-black uppercase tracking-[.13em] text-white/38">Forma</p><div className="mt-2 flex flex-wrap gap-1">{RADIER_SHAPES.map((item) => <button key={item.id} type="button" onClick={() => setShape(item.id)} className={`rounded-full px-3 py-2 text-[8px] font-black ${shape === item.id ? 'bg-[#F6C64A] text-black' : 'bg-white/[.05] text-white/48'}`}>{item.label}</button>)}</div></div>
        <div className="grid grid-cols-2 gap-2"><Metric label="Superficie" value={`${result.area.toLocaleString('es-CL',{maximumFractionDigits:2})} m²`} /><Metric label="Hormigón" value={`${result.concrete.toLocaleString('es-CL',{maximumFractionDigits:2})} m³`} /><Metric label="Malla ACMA" value={`${result.meshSheets} planchas`} /><Metric label="Estacas" value={`${result.stakes43cm} un.`} /></div>
        <div className="rounded-xl border border-[#F6C64A]/18 bg-[#F6C64A]/[.045] p-3 text-[9px] leading-5 text-white/48"><b className="text-[#F6C64A]">Cota visual fija:</b> la cara superior del radier se representa aproximadamente a +0,30 m respecto del terreno natural para que se entienda la plataforma elevada. La solución real depende de niveles, suelo, fundaciones y proyecto.</div>
      </div> : null}

      {drawer === 'layers' ? <div className="mt-4 space-y-2">{([
        ['excavation','Excavación'],['fill','Relleno compactado'],['base','Base estabilizada'],['gravel','Gravilla'],['barrier','Barrera humedad'],['mesh','Malla ACMA'],['concrete','Hormigón'],['formwork','Moldaje'],['vegetation','Vegetación'],
      ] as Array<[LayerKey,string]>).map(([id,label]) => <LayerToggle key={id} label={label} active={layers[id]} onClick={() => toggle(id)} />)}<p className="pt-2 text-[9px] leading-4 text-white/34">Las capas se animan por etapa. Activa “Capas” arriba para separarlas verticalmente y estudiar el orden constructivo.</p></div> : null}

      {drawer === 'environment' ? <div className="mt-4 space-y-3"><div><p className="text-[8px] font-black uppercase tracking-[.13em] text-white/38">Cielo e iluminación</p><div className="mt-2 grid grid-cols-3 gap-1">{(['day','sunset','night'] as LightMode[]).map((mode) => <button key={mode} type="button" onClick={() => setLight(mode)} className={`rounded-xl py-2 text-[9px] font-black ${light === mode ? 'bg-[#F6C64A] text-black' : 'bg-white/[.05] text-white/48'}`}>{mode === 'day' ? 'Día' : mode === 'sunset' ? 'Atardecer' : 'Noche'}</button>)}</div></div><LayerToggle label="Vegetación ligera" active={layers.vegetation} onClick={() => toggle('vegetation')} /><p className="text-[9px] leading-4 text-white/34">Tierra, pasto, gravilla y hormigón usan texturas procedurales locales, ligeras y sin dependencia de servidores externos.</p></div> : null}
    </aside> : null}

    <div className="absolute bottom-3 left-3 right-3 z-30 rounded-[1.35rem] border border-white/12 bg-black/68 p-3 backdrop-blur-2xl sm:bottom-4 sm:left-4 sm:right-4">
      <div className="flex items-center gap-2"><button type="button" onClick={playing ? () => setPlaying(false) : play} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-black">{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><button type="button" onClick={() => setTimeline((value) => Math.max(0,value-8))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.07] text-white/65"><ChevronLeft size={15} /></button><div className="min-w-0 flex-1"><div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-[8px] font-black uppercase tracking-[.12em] text-[#F6C64A]">{stageLabel(timeline)}</span><span className="text-[8px] text-white/38">{timeline}%</span></div><input aria-label="Secuencia constructiva del radier" type="range" min={0} max={100} value={timeline} onChange={(event) => { setPlaying(false); setTimeline(Number(event.target.value)); }} className="w-full accent-[#F6C64A]" /></div><button type="button" onClick={() => setTimeline((value) => Math.min(100,value+8))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.07] text-white/65"><ChevronRight size={15} /></button><button type="button" onClick={reset} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[.07] text-white/65"><RotateCcw size={15} /></button></div>
      <div className="mt-2 flex items-center justify-between text-[7px] uppercase tracking-[.08em] text-white/30"><span>Excavar</span><span>Base</span><span>Malla</span><span>Hormigón</span><span>Terminar</span></div>
    </div>
  </div>;
}

function RadierScene({ length, width, thickness, baseDepth, gravelDepth, shape, timeline, layers, exploded, light, autoRotate }: { length: number; width: number; thickness: number; baseDepth: number; gravelDepth: number; shape: RadierShape; timeline: number; layers: Record<LayerKey,boolean>; exploded: boolean; light: LightMode; autoRotate: boolean }) {
  const pieces = useMemo(() => layout(shape,length,width),[shape,length,width]);
  const textures = useMemo(() => ({ grass: makeTexture('grass'), soil: makeTexture('soil'), base: makeTexture('base'), gravel: makeTexture('gravel'), concrete: makeTexture('concrete') }),[]);
  useEffect(() => () => { textures.grass.dispose(); textures.soil.dispose(); textures.base.dispose(); textures.gravel.dispose(); textures.concrete.dispose(); },[textures]);
  const maxDim = Math.max(length,width);
  const platformTop = .30;
  const concreteH = Math.max(.05,thickness/100);
  const meshH = .025;
  const barrierH = .012;
  const gravelH = Math.max(.03,gravelDepth/100);
  const baseH = Math.max(.05,baseDepth/100);
  const stackBottom = platformTop-concreteH-meshH-barrierH-gravelH-baseH;
  const excavationBottom = -.16;
  const fillH = Math.max(.035,stackBottom-excavationBottom);
  const gap = exploded ? .10 : 0;
  const y = {
    fill: excavationBottom+fillH/2,
    base: stackBottom+baseH/2+gap,
    gravel: stackBottom+baseH+gravelH/2+gap*2,
    barrier: stackBottom+baseH+gravelH+barrierH/2+gap*3,
    mesh: stackBottom+baseH+gravelH+barrierH+meshH/2+gap*4,
    concrete: platformTop-concreteH/2+gap*5,
  };
  const cfg = light === 'night' ? { bg:'#05070d', sun:[18,30,-22] as [number,number,number], ambient:.23, power:.85 } : light === 'sunset' ? { bg:'#5b3840', sun:[-36,18,22] as [number,number,number], ambient:.35, power:1.8 } : { bg:'#9bc8df', sun:[48,44,32] as [number,number,number], ambient:.54, power:2.2 };
  return <>
    <color attach="background" args={[cfg.bg]} />
    {light === 'night' ? <Stars radius={80} depth={45} count={900} factor={2.2} fade /> : <Sky distance={450000} sunPosition={cfg.sun} turbidity={light === 'sunset' ? 9 : 5} rayleigh={light === 'sunset' ? 4 : 2.2} />}
    <ambientLight intensity={cfg.ambient} /><hemisphereLight args={[light === 'night'?'#60708d':'#dff3ff','#3c2d22',.55]} /><directionalLight position={cfg.sun} intensity={cfg.power} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
    <TerrainCut length={length} width={width} maxDim={maxDim} grass={textures.grass} soil={textures.soil} excavation={layers.excavation ? visibleAt(timeline,10) : 0} />
    {layers.vegetation ? <Vegetation width={length} depth={width} /> : null}
    {layers.fill ? <Pieces pieces={pieces} height={fillH} y={y.fill} texture={textures.soil} color="#77543a" opacity={visibleAt(timeline,24)} /> : null}
    {layers.base ? <Pieces pieces={pieces} height={baseH} y={y.base} texture={textures.base} color="#82664a" opacity={visibleAt(timeline,36)} /> : null}
    {layers.gravel ? <Pieces pieces={pieces} height={gravelH} y={y.gravel} texture={textures.gravel} color="#999186" opacity={visibleAt(timeline,49)} /> : null}
    {layers.barrier ? <Pieces pieces={pieces} height={barrierH} y={y.barrier} color="#38a9cf" opacity={visibleAt(timeline,60)*.72} /> : null}
    {layers.mesh ? <SteelMesh pieces={pieces} y={y.mesh} opacity={visibleAt(timeline,70)} /> : null}
    {layers.formwork ? <Formwork length={length} width={width} y={platformTop-concreteH/2} opacity={visibleAt(timeline,80)} /> : null}
    {layers.concrete ? <Pieces pieces={pieces} height={concreteH} y={y.concrete} texture={textures.concrete} color="#c8cbca" opacity={visibleAt(timeline,89)} /> : null}
    <Html center distanceFactor={9} position={[length/2+.5,.34,width/2]}><span className="whitespace-nowrap rounded-full border border-[#F6C64A]/35 bg-black/80 px-2.5 py-1 text-[8px] font-black uppercase text-[#F6C64A]">+0,30 m sobre terreno</span></Html>
    <Html center distanceFactor={9} position={[-length/2-.5,-.08,-width/2]}><span className="whitespace-nowrap rounded-full border border-cyan-300/25 bg-black/80 px-2.5 py-1 text-[8px] font-black uppercase text-cyan-200">Excavación visible</span></Html>
    <OrbitControls makeDefault target={[0,.08,0]} enableDamping dampingFactor={.075} autoRotate={autoRotate} autoRotateSpeed={.5} minDistance={Math.max(3,maxDim*.72)} maxDistance={Math.max(14,maxDim*3.2)} maxPolarAngle={Math.PI*.86} />
  </>;
}

function TerrainCut({ length,width,maxDim,grass,soil,excavation }: { length:number;width:number;maxDim:number;grass:Texture;soil:Texture;excavation:number }) {
  const world=Math.max(28,maxDim*4); const holeW=length+1.1; const holeD=width+1.1; const sideW=(world-holeW)/2; const sideD=(world-holeD)/2;
  return <group><mesh position={[-(holeW+sideW)/2,-.08,0]} receiveShadow><boxGeometry args={[sideW,.18,world]} /><meshStandardMaterial map={grass} roughness={1} /></mesh><mesh position={[(holeW+sideW)/2,-.08,0]} receiveShadow><boxGeometry args={[sideW,.18,world]} /><meshStandardMaterial map={grass} roughness={1} /></mesh><mesh position={[0,-.08,-(holeD+sideD)/2]} receiveShadow><boxGeometry args={[holeW,.18,sideD]} /><meshStandardMaterial map={grass} roughness={1} /></mesh><mesh position={[0,-.08,(holeD+sideD)/2]} receiveShadow><boxGeometry args={[holeW,.18,sideD]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>{excavation>.01?<mesh position={[0,-.15,0]} receiveShadow><boxGeometry args={[holeW,.08,holeD]} /><meshStandardMaterial map={soil} roughness={1} transparent opacity={excavation} /></mesh>:null}</group>;
}

function Pieces({ pieces,height,y,texture,color,opacity }: { pieces:Piece[];height:number;y:number;texture?:Texture;color:string;opacity:number }) { if(opacity<=.01)return null; return <>{pieces.map((piece)=><mesh key={piece.key} position={[piece.x,y,piece.z]} castShadow receiveShadow><boxGeometry args={[piece.w,height,piece.d]} /><meshStandardMaterial map={texture} color={color} roughness={.88} transparent opacity={opacity} /></mesh>)}</>; }

function SteelMesh({ pieces,y,opacity }: { pieces:Piece[];y:number;opacity:number }) { if(opacity<=.01)return null; return <>{pieces.map((piece)=><group key={piece.key} position={[piece.x,y,piece.z]}>{Array.from({length:Math.max(4,Math.ceil(piece.w/.45))},(_,i)=>-piece.w/2+i*(piece.w/Math.max(1,Math.ceil(piece.w/.45)-1))).map((x)=><mesh key={`x-${x}`} position={[x,0,0]}><boxGeometry args={[.018,.02,piece.d]} /><meshStandardMaterial color="#a6adb2" metalness={.82} roughness={.25} transparent opacity={opacity} /></mesh>)}{Array.from({length:Math.max(4,Math.ceil(piece.d/.45))},(_,i)=>-piece.d/2+i*(piece.d/Math.max(1,Math.ceil(piece.d/.45)-1))).map((z)=><mesh key={`z-${z}`} position={[0,.01,z]}><boxGeometry args={[piece.w,.02,.018]} /><meshStandardMaterial color="#a6adb2" metalness={.82} roughness={.25} transparent opacity={opacity} /></mesh>)}</group>)}</>; }

function Formwork({ length,width,y,opacity }: { length:number;width:number;y:number;opacity:number }) { if(opacity<=.01)return null; const h=.34; return <group><mesh position={[0,y,-width/2-.07]}><boxGeometry args={[length+.15,h,.06]} /><meshStandardMaterial color="#c67635" roughness={.8} transparent opacity={opacity} /></mesh><mesh position={[0,y,width/2+.07]}><boxGeometry args={[length+.15,h,.06]} /><meshStandardMaterial color="#c67635" roughness={.8} transparent opacity={opacity} /></mesh><mesh position={[-length/2-.07,y,0]}><boxGeometry args={[.06,h,width+.15]} /><meshStandardMaterial color="#c67635" roughness={.8} transparent opacity={opacity} /></mesh><mesh position={[length/2+.07,y,0]}><boxGeometry args={[.06,h,width+.15]} /><meshStandardMaterial color="#c67635" roughness={.8} transparent opacity={opacity} /></mesh></group>; }

function Vegetation({ width,depth }: { width:number;depth:number }) { const shrubs=Array.from({length:24},(_,index)=>{const side=index%4;const spread=(pseudo(index,22)-.5)*(side<2?depth+10:width+10);const offset=2.2+pseudo(index+100,6)*3.4;const x=side===0?-width/2-offset:side===1?width/2+offset:spread;const z=side===2?-depth/2-offset:side===3?depth/2+offset:spread;return{x,z,s:.28+pseudo(index+300,2)*.5};});return <group>{shrubs.map((item,index)=><group key={index} position={[item.x,0,item.z]} scale={item.s}><mesh position={[0,.22,0]} castShadow><cylinderGeometry args={[.035,.055,.44,8]} /><meshStandardMaterial color="#5d4934" roughness={1} /></mesh><mesh position={[0,.58,0]} castShadow><coneGeometry args={[.36,.82,9]} /><meshStandardMaterial color={index%3===0?'#507543':'#668955'} roughness={1} /></mesh></group>)}</group>; }

function Quick({ active,onClick,icon,label }: { active:boolean;onClick:()=>void;icon:ReactNode;label:string }) { return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[8px] font-black ${active?'bg-[#F6C64A] text-black':'text-white/55'}`}>{icon}{label}</button>; }
function Tab({ active,onClick,label }: { active:boolean;onClick:()=>void;label:string }) { return <button type="button" onClick={onClick} className={`rounded-xl py-2 text-[8px] font-black ${active?'bg-white text-black':'bg-white/[.05] text-white/45'}`}>{label}</button>; }
function LayerToggle({ label,active,onClick }: { label:string;active:boolean;onClick:()=>void }) { return <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[.025] px-3 py-3"><span className="text-[9px] font-bold text-white/65">{label}</span><span className={`h-5 w-9 rounded-full p-0.5 ${active?'bg-[#F6C64A]':'bg-white/10'}`}><span className={`block h-4 w-4 rounded-full bg-black transition ${active?'translate-x-4':''}`} /></span></button>; }
function NumberField({ label,value,min,max,step,onChange }: { label:string;value:number;min:number;max:number;step:number;onChange:(value:number)=>void }) { return <label className="rounded-xl border border-white/8 bg-white/[.025] p-3"><span className="block text-[8px] font-black uppercase tracking-[.1em] text-white/38">{label}</span><input type="number" value={value} min={min} max={max} step={step} onChange={(event)=>onChange(Math.min(max,Math.max(min,Number(event.target.value)||min)))} className="mt-2 w-full bg-transparent text-lg font-black text-white outline-none" /></label>; }
function Metric({ label,value }: { label:string;value:string }) { return <div className="rounded-xl border border-white/8 bg-black/20 p-3"><span className="text-[8px] uppercase tracking-[.1em] text-white/32">{label}</span><b className="mt-1 block text-sm text-[#F6C64A]">{value}</b></div>; }
