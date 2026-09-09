'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, Sky, Stars } from '@react-three/drei';
import { Box, Eye, Layers3, Pause, Play, Rotate3D, Ruler, Sun, Wrench } from 'lucide-react';
import {
  DataTexture,
  Group,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';
import type { MetalconInput, MetalconOpening } from '@/lib/metalconCalculator';

type View = 'frame' | 'dimensions' | 'osb' | 'reinforcement' | 'profiles';
type Ground = 'hormigon' | 'pasto' | 'tierra' | 'grava';
type Light = 'dia' | 'atardecer' | 'noche' | 'estudio';

const GROUND: Array<[Ground, string]> = [
  ['hormigon', 'Hormigón'],
  ['pasto', 'Pasto'],
  ['tierra', 'Tierra'],
  ['grava', 'Grava'],
];

const LIGHT: Array<[Light, string]> = [
  ['dia', 'Día'],
  ['atardecer', 'Atardecer'],
  ['noche', 'Noche'],
  ['estudio', 'Estudio'],
];

export function MetalconCinematicViewer({ input }: { input: MetalconInput }) {
  const [view, setView] = useState<View>('dimensions');
  const [ground, setGround] = useState<Ground>('hormigon');
  const [light, setLight] = useState<Light>('dia');
  const [autoRotate, setAutoRotate] = useState(true);
  const [explode, setExplode] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTimeline((value) => {
        const next = value + 0.018;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [playing]);

  const playAssembly = () => {
    setTimeline((value) => (value >= 0.99 ? 0 : value));
    setPlaying(true);
    setAutoRotate(false);
  };

  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#05090c] shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.2em] text-[#57D4FF]">Cinematic 4D · Three.js · modelo paramétrico</p>
          <b className="mt-1 block text-xs">Panel Metalcon interactivo · 360° real</b>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setExplode((value) => !value)} className={chip(explode)}><Layers3 size={12} />{explode ? 'Unir piezas' : 'Explotar'}</button>
          <button type="button" onClick={() => setAutoRotate((value) => !value)} className={chip(autoRotate)}><Rotate3D size={12} />360°</button>
          <button type="button" onClick={playing ? () => setPlaying(false) : playAssembly} className="inline-flex items-center gap-1.5 rounded-full bg-[#F6C64A] px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-black">{playing ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}{playing ? 'Pausar' : '4D montaje'}</button>
        </div>
      </div>

      <div className="relative h-[430px] sm:h-[570px]">
        <Canvas shadows dpr={[1, 1.75]} camera={{ position: [7.4, 4.2, 7.8], fov: 40 }}>
          <Suspense fallback={null}>
            <ViewerEnvironment ground={ground} light={light} />
            {view === 'profiles' ? (
              <ProfileScene input={input} timeline={timeline} />
            ) : (
              <PanelScene input={input} view={view} explode={explode} timeline={timeline} />
            )}
            <OrbitControls
              makeDefault
              target={[0, 1.15, 0]}
              enableDamping
              dampingFactor={0.08}
              autoRotate={autoRotate && !playing}
              autoRotateSpeed={0.75}
              minDistance={2.6}
              maxDistance={18}
              maxPolarAngle={Math.PI * 0.6}
            />
          </Suspense>
        </Canvas>
        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.14em] text-white/70 backdrop-blur-md">
          Arrastra para girar · pellizca/rueda para zoom
        </div>
        {playing || timeline > 0 ? (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl">
            <div className="mb-2 flex justify-between text-[8px] font-black uppercase tracking-[.12em] text-white/45"><span>Solera</span><span>Montantes</span><span>Vanos</span><span>Arriostre</span><span>Lectura</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#57D4FF] transition-[width] duration-100" style={{ width: `${timeline * 100}%` }} /></div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="grid grid-cols-5 gap-1">
          {([
            ['frame', 'Estructura', <Box key="a" size={12} />],
            ['dimensions', 'Medidas', <Ruler key="b" size={12} />],
            ['reinforcement', 'Refuerzos', <Wrench key="c" size={12} />],
            ['osb', 'OSB', <Layers3 key="d" size={12} />],
            ['profiles', 'Perfiles', <Eye key="e" size={12} />],
          ] as const).map(([id, label, icon]) => (
            <button key={id} type="button" onClick={() => setView(id)} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[8px] font-black ${view === id ? 'bg-[#F6C64A] text-black' : 'bg-white/[.04] text-white/50'}`}>{icon}{label}</button>
          ))}
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[.025] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.14em] text-white/38"><Layers3 size={12} />Biblioteca procedural de suelo</p>
            <div className="flex flex-wrap gap-1">{GROUND.map(([id, label]) => <button key={id} type="button" onClick={() => setGround(id)} className={`rounded-full px-2.5 py-1.5 text-[8px] font-black ${ground === id ? 'bg-white text-black' : 'bg-white/[.06] text-white/45'}`}>{label}</button>)}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[.025] p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.14em] text-white/38"><Sun size={12} />Cielo e iluminación</p>
            <div className="flex flex-wrap gap-1">{LIGHT.map(([id, label]) => <button key={id} type="button" onClick={() => setLight(id)} className={`rounded-full px-2.5 py-1.5 text-[8px] font-black ${light === id ? 'bg-[#57D4FF] text-black' : 'bg-white/[.06] text-white/45'}`}>{label}</button>)}</div>
          </div>
        </div>
        <p className="mt-2 text-[8px] leading-4 text-white/28">Suelo generado proceduralmente en el navegador: sin descargas externas, CORS ni dependencia de licencias. La geometría del perfil se exagera visualmente para poder leerla en pantalla.</p>
      </div>
    </div>
  );
}

function chip(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] transition ${active ? 'bg-[#57D4FF] text-black' : 'bg-white/[.07] text-white/60'}`;
}

function pseudo(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function proceduralTexture(kind: Ground) {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const colors: Record<Ground, [number, number, number]> = {
    hormigon: [132, 132, 128],
    pasto: [86, 116, 66],
    tierra: [108, 76, 48],
    grava: [111, 108, 101],
  };
  const base = colors[kind];
  const seed = kind === 'hormigon' ? 3 : kind === 'pasto' ? 7 : kind === 'tierra' ? 11 : 15;
  for (let i = 0; i < size * size; i += 1) {
    const grain = (pseudo(i, seed) - 0.5) * (kind === 'hormigon' ? 34 : 58);
    const fleck = pseudo(i + 911, seed) > 0.966 ? 34 : 0;
    const offset = grain + fleck;
    data[i * 4] = Math.max(0, Math.min(255, base[0] + offset));
    data[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + offset * 0.82));
    data[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + offset * 0.65));
    data[i * 4 + 3] = 255;
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(18, 18);
  return texture;
}

function ViewerEnvironment({ ground, light }: { ground: Ground; light: Light }) {
  const texture = useMemo(() => proceduralTexture(ground), [ground]);
  useEffect(() => () => texture.dispose(), [texture]);
  const cfg = {
    dia: { bg: '#8fb9d9', ambient: 0.55, power: 2.1, sun: [50, 48, 34] as [number, number, number] },
    atardecer: { bg: '#56343c', ambient: 0.34, power: 1.9, sun: [-42, 17, 22] as [number, number, number] },
    noche: { bg: '#05070d', ambient: 0.2, power: 0.8, sun: [18, 30, -24] as [number, number, number] },
    estudio: { bg: '#15191d', ambient: 0.75, power: 2.5, sun: [18, 24, 16] as [number, number, number] },
  }[light];
  return <>
    <color attach="background" args={[cfg.bg]} />
    {light === 'noche' ? <Stars radius={70} depth={45} count={800} factor={2.3} saturation={0} fade speed={0.35} /> : <Sky distance={450000} sunPosition={cfg.sun} turbidity={light === 'atardecer' ? 9 : 5} rayleigh={light === 'atardecer' ? 4 : 2} />}
    <ambientLight intensity={cfg.ambient} />
    <hemisphereLight args={[light === 'noche' ? '#536184' : '#c9deed', '#43392f', 0.5]} />
    <directionalLight position={cfg.sun} intensity={cfg.power} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.04, 0]}><planeGeometry args={[55, 55]} /><meshStandardMaterial map={texture} roughness={ground === 'hormigon' ? 0.82 : 1} /></mesh>
    <ContactShadows position={[0, 0.015, 0]} opacity={0.38} scale={15} blur={2.5} far={8} />
  </>;
}

function PanelScene({ input, view, explode, timeline }: { input: MetalconInput; view: View; explode: boolean; timeline: number }) {
  const group = useRef<Group>(null);
  const depth = Math.max(0.07, input.cDepthMm / 1000);
  const count = Math.max(2, Math.floor(input.widthM * 100 / input.spacingCm) + 1);
  const spacing = input.widthM / Math.max(1, count - 1);
  const fit = Math.min(1, 5.5 / input.widthM, 3.1 / input.heightM);
  const openings: Array<[MetalconOpening, string, string]> = [[input.door, 'PUERTA', '#F6C64A'], [input.window, 'VENTANA', '#57D4FF']];
  const insideOpening = (xM: number) => openings.some(([opening]) => opening.enabled && xM > opening.xM && xM < opening.xM + opening.widthM);
  const phase = (start: number, end: number) => Math.max(0, Math.min(1, (timeline - start) / (end - start)));
  const explodeOffset = explode ? 0.18 : 0;

  useFrame(({ clock }) => {
    if (!group.current || !explode) return;
    group.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.015;
  });

  return <group scale={fit} position={[0, 0.05, 0]} ref={group}>
    <Member position={[0, 0.055, explodeOffset]} size={[input.widthM, 0.055, depth]} color="#edf1f4" opacity={timeline > 0 ? phase(0, 0.16) : 1} />
    <Member position={[0, input.heightM + 0.055, explodeOffset]} size={[input.widthM, 0.055, depth]} color="#edf1f4" opacity={timeline > 0 ? phase(0, 0.16) : 1} />

    {Array.from({ length: count }, (_, index) => {
      const x = -input.widthM / 2 + index * spacing;
      const localX = x + input.widthM / 2;
      if (insideOpening(localX)) return null;
      return <Member key={index} position={[x, input.heightM / 2 + 0.055, explode ? ((index % 2 ? 1 : -1) * 0.11) : 0]} size={[0.045, input.heightM, depth]} color="#d5dce2" opacity={timeline > 0 ? phase(0.12, 0.42) : 1} />;
    })}

    {openings.map(([opening, label, tone], index) => opening.enabled ? <OpeningFrame key={label} opening={opening} input={input} tone={view === 'reinforcement' ? tone : '#cbd2d8'} depth={depth} opacity={timeline > 0 ? phase(0.35, 0.68) : 1} z={explode ? 0.16 + index * 0.06 : 0.01} label={view === 'dimensions' || view === 'reinforcement' ? label : undefined} /> : null)}

    <Brace input={input} direction={1} opacity={timeline > 0 ? phase(0.62, 0.84) : 1} z={explode ? 0.3 : depth / 2 + 0.018} />
    <Brace input={input} direction={-1} opacity={timeline > 0 ? phase(0.62, 0.84) : 1} z={explode ? 0.34 : depth / 2 + 0.022} />

    {view === 'osb' ? <OsbSheets input={input} opacity={timeline > 0 ? phase(0.78, 1) : 1} z={explode ? 0.55 : depth / 2 + 0.055} /> : null}
    {view === 'dimensions' ? <Measurements input={input} /> : null}
    {view === 'reinforcement' ? <ReinforcementNotes input={input} /> : null}
  </group>;
}

function Member({ position, size, color, opacity = 1 }: { position: [number, number, number]; size: [number, number, number]; color: string; opacity?: number }) {
  return <mesh position={position} castShadow visible={opacity > 0.01}><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={0.82} roughness={0.3} transparent opacity={opacity} /></mesh>;
}

function OpeningFrame({ opening, input, tone, depth, opacity, z, label }: { opening: MetalconOpening; input: MetalconInput; tone: string; depth: number; opacity: number; z: number; label?: string }) {
  const left = -input.widthM / 2 + opening.xM;
  const right = left + opening.widthM;
  const bottom = opening.sillM;
  const top = opening.sillM + opening.heightM;
  return <group>
    <Member position={[left - 0.035, input.heightM / 2 + 0.055, z]} size={[0.055, input.heightM, depth]} color={tone} opacity={opacity} />
    <Member position={[right + 0.035, input.heightM / 2 + 0.055, z]} size={[0.055, input.heightM, depth]} color={tone} opacity={opacity} />
    <Member position={[(left + right) / 2, top + 0.035, z]} size={[opening.widthM + 0.14, 0.07, depth]} color={tone} opacity={opacity} />
    {bottom > 0.02 ? <Member position={[(left + right) / 2, bottom - 0.035, z]} size={[opening.widthM + 0.14, 0.07, depth]} color={tone} opacity={opacity} /> : null}
    {label ? <Html center distanceFactor={8} position={[(left + right) / 2, top + 0.25, z + 0.05]}><span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-1 text-[8px] font-black text-white">{label} {opening.widthM.toFixed(2)} × {opening.heightM.toFixed(2)} m</span></Html> : null}
  </group>;
}

function Brace({ input, direction, opacity, z }: { input: MetalconInput; direction: 1 | -1; opacity: number; z: number }) {
  const width = input.widthM * 0.86;
  const height = input.heightM * 0.84;
  const length = Math.sqrt(width * width + height * height);
  const angle = Math.atan2(width, height) * direction;
  return <mesh position={[0, input.heightM * 0.5 + 0.08, z]} rotation={[0, 0, angle]} castShadow visible={opacity > 0.01}><boxGeometry args={[0.026, length, 0.014]} /><meshStandardMaterial color="#F6C64A" metalness={0.58} roughness={0.4} transparent opacity={opacity} /></mesh>;
}

function OsbSheets({ input, opacity, z }: { input: MetalconInput; opacity: number; z: number }) {
  const sheetWidth = input.osbWidthCm / 100;
  const count = Math.ceil(input.widthM / sheetWidth);
  return <group>{Array.from({ length: count }, (_, index) => {
    const start = index * sheetWidth;
    const width = Math.min(sheetWidth, input.widthM - start);
    const x = -input.widthM / 2 + start + width / 2;
    return <mesh key={index} position={[x, input.heightM / 2 + 0.055, z]} castShadow><boxGeometry args={[Math.max(0.02, width - 0.02), input.heightM * 0.98, 0.035]} /><meshStandardMaterial color="#a66f38" roughness={0.86} transparent opacity={0.72 * opacity} /></mesh>;
  })}</group>;
}

function Measurements({ input }: { input: MetalconInput }) {
  return <>
    <Html center distanceFactor={8} position={[0, input.heightM + 0.36, 0.08]}><Measure text={`${input.widthM.toFixed(2)} m ancho`} /></Html>
    <Html center distanceFactor={8} position={[-input.widthM / 2 - 0.38, input.heightM / 2, 0.08]}><Measure text={`${input.heightM.toFixed(2)} m alto`} /></Html>
    <Html center distanceFactor={8} position={[input.widthM / 2 + 0.38, input.heightM * 0.6, 0.08]}><Measure text={`Montantes @ ${input.spacingCm} cm`} /></Html>
    <Html center distanceFactor={8} position={[0, -0.18, 0.08]}><Measure text={`C ${input.cDepthMm} · e ${input.thicknessMm.toFixed(2)} mm`} /></Html>
  </>;
}

function Measure({ text }: { text: string }) { return <span className="whitespace-nowrap rounded-lg border border-cyan-300/20 bg-black/80 px-2 py-1 text-[8px] font-black tracking-[.08em] text-cyan-100">{text}</span>; }

function ReinforcementNotes({ input }: { input: MetalconInput }) {
  return <>
    <Html center distanceFactor={8} position={[0, input.heightM * 0.53, 0.18]}><span className="rounded-full border border-[#F6C64A]/25 bg-black/85 px-2 py-1 text-[8px] font-black text-[#F6C64A]">Arriostramiento X · ejemplo visual</span></Html>
    <Html center distanceFactor={8} position={[-input.widthM / 2 + 0.1, 0.2, 0.18]}><span className="rounded-full border border-emerald-300/25 bg-black/85 px-2 py-1 text-[8px] font-black text-emerald-300">Zona de anclaje</span></Html>
  </>;
}

function ProfileScene({ input, timeline }: { input: MetalconInput; timeline: number }) {
  const progress = timeline > 0 ? timeline : 1;
  return <group position={[0, 0.45, 0]} scale={1.25}>
    <group position={[-1.35, 0.7, 0]} rotation={[0.08, -0.38, 0]}><Channel type="C" progress={progress} /><Html center distanceFactor={8} position={[0, 1.45, 0]}><ProfileTag title={`Montante C ${input.cDepthMm}`} detail={`e ${input.thicknessMm.toFixed(2)} mm · alas/labios visuales`} /></Html></group>
    <group position={[1.45, 0.7, 0]} rotation={[0.08, 0.38, 0]}><Channel type="U" progress={progress} /><Html center distanceFactor={8} position={[0, 1.45, 0]}><ProfileTag title={`Solera U compatible`} detail={`base y coronación · C ${input.cDepthMm}`} /></Html></group>
  </group>;
}

function Channel({ type, progress }: { type: 'C' | 'U'; progress: number }) {
  const length = 2.4 * Math.max(0.08, progress);
  const web = 0.2;
  const flange = type === 'C' ? 0.085 : 0.065;
  const t = 0.014;
  return <group rotation={[0, 0, Math.PI / 2]}>
    <Member position={[0, 0, 0]} size={[t, length, web]} color="#e3e8ed" />
    <Member position={[flange / 2, 0, web / 2 - t / 2]} size={[flange, length, t]} color="#cfd6dd" />
    <Member position={[flange / 2, 0, -web / 2 + t / 2]} size={[flange, length, t]} color="#cfd6dd" />
    {type === 'C' ? <><Member position={[flange - t / 2, 0, web / 2 - 0.027]} size={[t, length, 0.055]} color="#b9c3cb" /><Member position={[flange - t / 2, 0, -web / 2 + 0.027]} size={[t, length, 0.055]} color="#b9c3cb" /></> : null}
  </group>;
}

function ProfileTag({ title, detail }: { title: string; detail: string }) { return <div className="min-w-40 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-center"><div className="text-[9px] font-black uppercase tracking-[.12em] text-[#57D4FF]">{title}</div><div className="mt-1 text-[8px] font-bold text-white/60">{detail}</div></div>; }
