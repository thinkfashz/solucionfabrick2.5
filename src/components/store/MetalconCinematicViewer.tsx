'use client';

import { ContactShadows, Html, OrbitControls, Sky, Stars } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Eye,
  Focus,
  Grid3X3,
  Layers3,
  Pause,
  Play,
  Rotate3D,
  Ruler,
  ScanLine,
  Sun,
  Wrench,
} from 'lucide-react';
import {
  DataTexture,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three';
import {
  METALCON_HOUSE_PRESET_ORDER,
  METALCON_HOUSE_PRESETS,
  assemblySummary,
  type MetalconAssemblyOpening,
  type MetalconHousePreset,
  type MetalconHousePresetId,
} from '@/lib/metalconAssembly';
import type { MetalconInput } from '@/lib/metalconCalculator';
import { MetalconAssembly3D, type MetalconAssemblyDisplayMode } from './MetalconAssembly3D';

type ViewerModelId = 'custom-panel' | MetalconHousePresetId;
type ViewerView = MetalconAssemblyDisplayMode | 'profiles';
type Ground = 'hormigon' | 'pasto' | 'tierra' | 'grava';
type Light = 'dia' | 'atardecer' | 'noche' | 'estudio';
type CameraPreset = 'perspective' | 'top' | 'front';

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
  const [modelId, setModelId] = useState<ViewerModelId>('family-6x8');
  const [view, setView] = useState<ViewerView>('dimensions');
  const [ground, setGround] = useState<Ground>('hormigon');
  const [light, setLight] = useState<Light>('dia');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('perspective');
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [isolateSelected, setIsolateSelected] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [playing, setPlaying] = useState(false);

  const customPreset = useMemo(() => makeCustomPanelPreset(input), [input]);
  const activePreset = modelId === 'custom-panel' ? customPreset : METALCON_HOUSE_PRESETS[modelId];
  const summary = useMemo(() => assemblySummary(activePreset, input.spacingCm), [activePreset, input.spacingCm]);
  const selectedWall = activePreset.walls.find((wall) => wall.id === selectedWallId) ?? null;

  useEffect(() => {
    setSelectedWallId(null);
    setIsolateSelected(false);
    setTimeline(0);
    setPlaying(false);
  }, [modelId]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTimeline((value) => {
        const next = value + 0.014;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, 70);
    return () => window.clearInterval(timer);
  }, [playing]);

  const playAssembly = () => {
    setTimeline((value) => (value >= 0.995 ? 0 : value));
    setPlaying(true);
    setAutoRotate(false);
    setCameraPreset('perspective');
  };

  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#05090c] shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[.2em] text-[#57D4FF]">Cinematic 4D · Three.js · malla Metalcon completa</p>
          <b className="mt-1 block text-xs">Paneles, esquinas, dinteles, jambas, antepechos y refuerzo localizado</b>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setAutoRotate((value) => !value)} className={chip(autoRotate)}><Rotate3D size={12} />360°</button>
          <button type="button" onClick={playing ? () => setPlaying(false) : playAssembly} className="inline-flex items-center gap-1.5 rounded-full bg-[#F6C64A] px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-black">{playing ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}{playing ? 'Pausar' : '4D montaje'}</button>
        </div>
      </div>

      <div className="border-b border-white/10 bg-white/[.018] px-3 py-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <ModelButton active={modelId === 'custom-panel'} onClick={() => setModelId('custom-panel')} label="Panel editable" detail={`${input.widthM.toFixed(1)} × ${input.heightM.toFixed(1)} m`} />
          {METALCON_HOUSE_PRESET_ORDER.map((id) => {
            const preset = METALCON_HOUSE_PRESETS[id];
            return <ModelButton key={id} active={modelId === id} onClick={() => setModelId(id)} label={preset.shortLabel} detail={`${preset.walls.length} paneles`} />;
          })}
        </div>
      </div>

      <div className="relative h-[520px] sm:h-[680px]">
        <Canvas shadows dpr={[1, 1.65]} camera={{ position: [8.2, 6.2, 9.5], fov: 42, near: 0.05, far: 120 }}>
          <Suspense fallback={null}>
            <ViewerEnvironment ground={ground} light={light} />
            <CameraDirector preset={activePreset} cameraPreset={cameraPreset} />
            {view === 'profiles' ? (
              <ProfileScene input={input} />
            ) : (
              <MetalconAssembly3D
                preset={activePreset}
                spacingCm={input.spacingCm}
                profileDepthMm={input.cDepthMm}
                displayMode={view}
                selectedWallId={selectedWallId}
                onSelectWall={setSelectedWallId}
                isolateSelected={isolateSelected}
                assemblyProgress={playing || timeline > 0 ? timeline : null}
              />
            )}
            <OrbitControls
              makeDefault
              target={[0, 1.05, 0]}
              enableDamping
              dampingFactor={0.08}
              autoRotate={autoRotate && !playing && cameraPreset === 'perspective'}
              autoRotateSpeed={0.55}
              minDistance={2.2}
              maxDistance={28}
              maxPolarAngle={Math.PI * 0.82}
            />
          </Suspense>
        </Canvas>

        <div className="pointer-events-none absolute left-3 top-3 max-w-[72%] rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-white/75 backdrop-blur-md">
          {activePreset.label}<span className="mt-1 block normal-case tracking-normal text-white/38">Arrastra para girar · pellizca/rueda para zoom · toca un muro para leerlo</span>
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-1 rounded-xl border border-white/10 bg-black/55 p-1 backdrop-blur-md">
          <CameraButton active={cameraPreset === 'perspective'} onClick={() => setCameraPreset('perspective')} icon={<Focus size={12} />} label="3D" />
          <CameraButton active={cameraPreset === 'top'} onClick={() => setCameraPreset('top')} icon={<Grid3X3 size={12} />} label="Planta" />
          <CameraButton active={cameraPreset === 'front'} onClick={() => setCameraPreset('front')} icon={<ScanLine size={12} />} label="Frente" />
        </div>

        {playing || timeline > 0 ? (
          <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/76 p-3 backdrop-blur-xl">
            <div className="mb-2 flex justify-between text-[7px] font-black uppercase tracking-[.1em] text-white/45"><span>Soleras</span><span>Montantes</span><span>Vanos</span><span>Travesaños</span><span>Pletinas</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#57D4FF] transition-[width] duration-100" style={{ width: `${timeline * 100}%` }} /></div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="grid grid-cols-5 gap-1">
          {([
            ['mesh', 'Malla', <Box key="a" size={12} />],
            ['dimensions', 'Medidas', <Ruler key="b" size={12} />],
            ['openings', 'Vanos', <Wrench key="c" size={12} />],
            ['bracing', 'Refuerzo', <Layers3 key="d" size={12} />],
            ['profiles', 'Perfiles', <Eye key="e" size={12} />],
          ] as const).map(([id, label, icon]) => (
            <button key={id} type="button" onClick={() => setView(id)} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[8px] font-black ${view === id ? 'bg-[#F6C64A] text-black' : 'bg-white/[.04] text-white/50'}`}>{icon}{label}</button>
          ))}
        </div>

        {view !== 'profiles' ? (
          <div className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.14em] text-white/38">Paneles de la malla</p>
                <p className="mt-1 text-[8px] text-white/28">Cada tramo es independiente; los vanos conservan jambas, dintel y montantes cortos.</p>
              </div>
              <button type="button" disabled={!selectedWallId} onClick={() => setIsolateSelected((value) => !value)} className={`rounded-full px-3 py-2 text-[8px] font-black ${selectedWallId ? (isolateSelected ? 'bg-cyan-300 text-black' : 'bg-white/[.07] text-white/65') : 'cursor-not-allowed bg-white/[.03] text-white/20'}`}>{isolateSelected ? 'Ver todos' : 'Aislar'}</button>
            </div>
            <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
              <button type="button" onClick={() => { setSelectedWallId(null); setIsolateSelected(false); }} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[8px] font-black ${!selectedWallId ? 'bg-white text-black' : 'bg-white/[.05] text-white/45'}`}>Todos</button>
              {activePreset.walls.map((wall) => (
                <button key={wall.id} type="button" onClick={() => setSelectedWallId(wall.id)} className={`shrink-0 rounded-full px-2.5 py-1.5 text-[8px] font-black ${selectedWallId === wall.id ? 'bg-cyan-300 text-black' : 'bg-white/[.05] text-white/45'}`}>{wall.id}</button>
              ))}
            </div>
            {selectedWall ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="rounded-lg bg-black/25 px-3 py-2 text-[8px] leading-4 text-white/48"><b className="text-white/80">{selectedWall.label}</b><br/>{selectedWall.role === 'perimeter' ? 'Perimetral' : 'Interior'} · {selectedWall.structural ? 'marcado estructural' : 'división referencial'} · {selectedWall.openings.length} vano(s)</div>
                <button type="button" onClick={() => setView('openings')} className="rounded-lg border border-[#F6C64A]/20 px-3 py-2 text-[8px] font-black text-[#F6C64A]">Ver detalle de vano</button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniMetric value={summary.panels} label="paneles/tramos" />
          <MiniMetric value={`${summary.totalWallM} m`} label="muro modelado" />
          <MiniMetric value={summary.regularStuds + summary.openingFrames} label="montantes aprox." />
          <MiniMetric value={`${summary.doors}P · ${summary.windows}V`} label="vanos" />
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

        <div className="mt-3 rounded-xl border border-cyan-300/12 bg-cyan-300/[.035] p-3 text-[8px] leading-4 text-white/40">
          <b className="text-cyan-100/80">Geometría de referencia.</b> {activePreset.sourceNote} La separación de montantes se toma del selector de 40/60 cm. La malla muestra cómo se organiza el entramado; el dimensionamiento final de perfiles, dinteles, anclajes y arriostramientos depende del cálculo del proyecto.
        </div>
      </div>
    </div>
  );
}

function makeCustomPanelPreset(input: MetalconInput): MetalconHousePreset {
  const openings: MetalconAssemblyOpening[] = [];
  if (input.door.enabled) openings.push({ id: 'CUSTOM-D1', kind: 'door', offsetM: input.door.xM, widthM: input.door.widthM, heightM: input.door.heightM, sillM: 0, label: 'Puerta editable' });
  if (input.window.enabled) openings.push({ id: 'CUSTOM-W1', kind: 'window', offsetM: input.window.xM, widthM: input.window.widthM, heightM: input.window.heightM, sillM: input.window.sillM, label: 'Ventana editable' });
  return {
    id: 'compact-5x5',
    label: `Panel editable ${input.widthM.toFixed(2)} × ${input.heightM.toFixed(2)} m`,
    shortLabel: 'Panel',
    widthM: input.widthM,
    depthM: Math.max(1.3, input.cDepthMm / 1000 * 9),
    heightM: input.heightM,
    sourceNote: 'Este modo usa exactamente el largo, alto y vanos definidos en el configurador lateral.',
    walls: [{
      id: 'P-EDIT',
      label: `P-EDIT · ${input.widthM.toFixed(2)} m`,
      start: { x: 0, z: Math.max(1.3, input.cDepthMm / 1000 * 9) / 2 },
      end: { x: input.widthM, z: Math.max(1.3, input.cDepthMm / 1000 * 9) / 2 },
      role: 'perimeter',
      structural: input.preset !== 'partition',
      braced: input.preset !== 'partition',
      openings,
    }],
  };
}

function chip(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] transition ${active ? 'bg-[#57D4FF] text-black' : 'bg-white/[.07] text-white/60'}`;
}

function ModelButton({ active, onClick, label, detail }: { active: boolean; onClick: () => void; label: string; detail: string }) {
  return <button type="button" onClick={onClick} className={`min-w-[132px] shrink-0 rounded-xl border px-3 py-2 text-left ${active ? 'border-[#F6C64A]/45 bg-[#F6C64A]/10' : 'border-white/8 bg-white/[.025]'}`}><b className={`block text-[9px] ${active ? 'text-[#F6C64A]' : 'text-white/65'}`}>{label}</b><small className="mt-1 block text-[7px] text-white/30">{detail}</small></button>;
}

function CameraButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex h-8 min-w-14 items-center justify-center gap-1 rounded-lg px-2 text-[7px] font-black ${active ? 'bg-cyan-300 text-black' : 'bg-white/[.06] text-white/45'}`}>{icon}{label}</button>;
}

function MiniMetric({ value, label }: { value: string | number; label: string }) {
  return <div className="rounded-xl bg-white/[.04] p-3"><b className="text-base text-[#F6C64A]">{value}</b><small className="mt-1 block text-[7px] text-white/35">{label}</small></div>;
}

function CameraDirector({ preset, cameraPreset }: { preset: MetalconHousePreset; cameraPreset: CameraPreset }) {
  const { camera } = useThree();
  useEffect(() => {
    const maxDimension = Math.max(preset.widthM, preset.depthM + (preset.terraceDepthM ?? 0));
    if (cameraPreset === 'top') camera.position.set(0.01, Math.max(8, maxDimension * 1.55), 0.02);
    else if (cameraPreset === 'front') camera.position.set(0, Math.max(2.8, preset.heightM * 1.35), Math.max(7, preset.depthM * 1.35));
    else camera.position.set(Math.max(6.5, preset.widthM * 1.05), Math.max(4.6, preset.heightM * 2.1), Math.max(7.2, preset.depthM * 1.05));
    camera.lookAt(0, preset.heightM * 0.42, 0);
    camera.updateProjectionMatrix();
  }, [camera, cameraPreset, preset]);
  return null;
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
  for (let index = 0; index < size * size; index += 1) {
    const grain = (pseudo(index, seed) - 0.5) * (kind === 'hormigon' ? 34 : 58);
    const fleck = pseudo(index + 911, seed) > 0.966 ? 34 : 0;
    const offset = grain + fleck;
    data[index * 4] = Math.max(0, Math.min(255, base[0] + offset));
    data[index * 4 + 1] = Math.max(0, Math.min(255, base[1] + offset * 0.82));
    data[index * 4 + 2] = Math.max(0, Math.min(255, base[2] + offset * 0.65));
    data[index * 4 + 3] = 255;
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
    <directionalLight position={cfg.sun} intensity={cfg.power} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.12, 0]}><planeGeometry args={[70, 70]} /><meshStandardMaterial map={texture} roughness={ground === 'hormigon' ? 0.82 : 1} /></mesh>
    <ContactShadows position={[0, 0.015, 0]} opacity={0.3} scale={20} blur={2.5} far={12} />
  </>;
}

function ProfileScene({ input }: { input: MetalconInput }) {
  const depth = input.cDepthMm / 1000;
  const web = Math.max(0.18, depth * 2.2);
  const flange = 0.18;
  return (
    <group position={[0, 1.05, 0]}>
      <group position={[-1.15, 0, 0]} rotation={[0.18, -0.45, 0.05]}>
        <mesh castShadow><boxGeometry args={[0.08, 2.5, web]} /><meshStandardMaterial color="#d9e0e6" metalness={0.86} roughness={0.25} /></mesh>
        <mesh position={[flange / 2, 0, web / 2]} castShadow><boxGeometry args={[flange, 2.5, 0.035]} /><meshStandardMaterial color="#d9e0e6" metalness={0.86} roughness={0.25} /></mesh>
        <mesh position={[flange / 2, 0, -web / 2]} castShadow><boxGeometry args={[flange, 2.5, 0.035]} /><meshStandardMaterial color="#d9e0e6" metalness={0.86} roughness={0.25} /></mesh>
        <Html center distanceFactor={8} position={[0, 1.55, 0]}><ProfileTag title="Montante C" detail={`alma ${input.cDepthMm} mm · e ${input.thicknessMm.toFixed(2)} mm`} /></Html>
      </group>
      <group position={[1.15, -0.65, 0]} rotation={[0, 0.45, Math.PI / 2]}>
        <mesh castShadow><boxGeometry args={[0.08, 2.5, web * 1.06]} /><meshStandardMaterial color="#bfc8cf" metalness={0.84} roughness={0.28} /></mesh>
        <mesh position={[flange / 2, 0, web * 0.53]} castShadow><boxGeometry args={[flange, 2.5, 0.035]} /><meshStandardMaterial color="#bfc8cf" metalness={0.84} roughness={0.28} /></mesh>
        <mesh position={[flange / 2, 0, -web * 0.53]} castShadow><boxGeometry args={[flange, 2.5, 0.035]} /><meshStandardMaterial color="#bfc8cf" metalness={0.84} roughness={0.28} /></mesh>
        <Html center distanceFactor={8} position={[0, 1.55, 0]}><ProfileTag title="Solera U" detail="base/coronación · recibe montantes" /></Html>
      </group>
    </group>
  );
}

function ProfileTag({ title, detail }: { title: string; detail: string }) {
  return <div className="min-w-40 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-center"><div className="text-[9px] font-black uppercase tracking-[.12em] text-[#57D4FF]">{title}</div><div className="mt-1 text-[8px] font-bold text-white/60">{detail}</div></div>;
}
