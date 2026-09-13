'use client';

import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, Sky, Stars } from '@react-three/drei';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Eye,
  Hammer,
  Home,
  Layers3,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Sun,
  TreePine,
  Wrench,
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
import {
  METALCON_HOUSE_PRESET_ORDER,
  METALCON_HOUSE_PRESETS,
  type MetalconHousePreset,
  type MetalconHousePresetId,
} from '@/lib/metalconAssembly';
import { MetalconAssembly3D } from './MetalconAssembly3D';

type Drawer = 'layers' | 'environment' | 'systems' | null;
type LightMode = 'day' | 'sunset' | 'night';
type TextureKind = 'osb' | 'gypsum' | 'tile' | 'siding' | 'roof' | 'grass' | 'soil';
type LayerKey =
  | 'structure'
  | 'osb'
  | 'membrane'
  | 'battens'
  | 'insulation'
  | 'gypsum'
  | 'ceiling'
  | 'floor'
  | 'siding'
  | 'roof'
  | 'fixtures'
  | 'sanitary'
  | 'vegetation';

const LAYERS: Array<{ id: LayerKey; label: string; group: 'envolvente' | 'interior' | 'instalaciones' }> = [
  { id: 'structure', label: 'Estructura Metalcon', group: 'envolvente' },
  { id: 'osb', label: 'OSB estructural', group: 'envolvente' },
  { id: 'membrane', label: 'Fieltro / barrera', group: 'envolvente' },
  { id: 'battens', label: 'Listones 2×2', group: 'envolvente' },
  { id: 'insulation', label: 'Lana aislante', group: 'interior' },
  { id: 'gypsum', label: 'Vulcanita', group: 'interior' },
  { id: 'ceiling', label: 'Portantes + cielo', group: 'interior' },
  { id: 'floor', label: 'Cerámica 60×60', group: 'interior' },
  { id: 'siding', label: 'Revestimiento exterior', group: 'envolvente' },
  { id: 'roof', label: 'Cubierta / teja', group: 'envolvente' },
  { id: 'fixtures', label: 'Baño + cocina', group: 'interior' },
  { id: 'sanitary', label: 'Sanitaria + fosa', group: 'instalaciones' },
  { id: 'vegetation', label: 'Vegetación', group: 'instalaciones' },
];

const STAGES = [
  [0, 'Excavación y replanteo'],
  [8, 'Soleras y fundación'],
  [18, 'Montantes'],
  [28, 'Vanos, dinteles y refuerzos'],
  [40, 'OSB'],
  [49, 'Fieltro y barrera exterior'],
  [56, 'Listones 2×2'],
  [62, 'Lana aislante'],
  [69, 'Vulcanita interior'],
  [75, 'Cerámica 60×60'],
  [81, 'Portantes y cielo'],
  [86, 'Baño, cocina y artefactos'],
  [91, 'Red sanitaria y fosa 800 L'],
  [95, 'Revestimiento exterior'],
  [98, 'Cubierta y última teja'],
] as const;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const visibleAt = (timeline: number, start: number) => clamp((timeline - start) / 7);

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
    osb: [170, 123, 71],
    gypsum: [220, 217, 207],
    tile: [186, 190, 193],
    siding: [177, 184, 184],
    roof: [74, 81, 84],
    grass: [72, 108, 58],
    soil: [103, 72, 45],
  };
  const seed = ['osb', 'gypsum', 'tile', 'siding', 'roof', 'grass', 'soil'].indexOf(kind) + 3;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const noise = (pseudo(index, seed) - .5) * (kind === 'osb' || kind === 'grass' || kind === 'soil' ? 48 : 18);
      let stripe = 0;
      if (kind === 'siding' && x % 20 < 2) stripe = -42;
      if (kind === 'roof' && y % 18 < 2) stripe = -34;
      if (kind === 'tile' && (x % 24 < 2 || y % 24 < 2)) stripe = -58;
      if (kind === 'osb' && pseudo(index + 900, seed) > .91) stripe = 34;
      const rgb = base[kind];
      data[index * 4] = Math.max(0, Math.min(255, rgb[0] + noise + stripe));
      data[index * 4 + 1] = Math.max(0, Math.min(255, rgb[1] + noise * .8 + stripe));
      data[index * 4 + 2] = Math.max(0, Math.min(255, rgb[2] + noise * .55 + stripe));
      data[index * 4 + 3] = 255;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(kind === 'tile' ? 8 : 5, kind === 'tile' ? 8 : 5);
  return texture;
}

export default function MetalconConstructionLab() {
  const [modelId, setModelId] = useState<MetalconHousePresetId>('family-6x8');
  const [timeline, setTimeline] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [drawer, setDrawer] = useState<Drawer>('layers');
  const [light, setLight] = useState<LightMode>('day');
  const [cutaway, setCutaway] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    structure: true,
    osb: true,
    membrane: true,
    battens: true,
    insulation: true,
    gypsum: true,
    ceiling: true,
    floor: true,
    siding: true,
    roof: true,
    fixtures: true,
    sanitary: true,
    vegetation: true,
  });
  const preset = METALCON_HOUSE_PRESETS[modelId];

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
    }, 120);
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

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#020507] text-white">
      <div className="absolute inset-0">
        <Canvas shadows dpr={[1, 1.55]} camera={{ position: [10, 6.8, 11], fov: 42, near: .05, far: 160 }}>
          <Suspense fallback={null}>
            <ConstructionEnvironment light={light} vegetation={layers.vegetation} preset={preset} />
            {layers.structure ? (
              <MetalconAssembly3D
                preset={preset}
                spacingCm={40}
                profileDepthMm={90}
                displayMode="bracing"
                assemblyProgress={Math.min(1, timeline / 38)}
              />
            ) : null}
            <ConstructionFinishes preset={preset} timeline={timeline} layers={layers} cutaway={cutaway} />
            <OrbitControls
              makeDefault
              target={[0, 1.05, 0]}
              enableDamping
              dampingFactor={.075}
              autoRotate={autoRotate && !playing}
              autoRotateSpeed={.45}
              minDistance={2.6}
              maxDistance={34}
              maxPolarAngle={Math.PI * .86}
            />
          </Suspense>
        </Canvas>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.54),transparent_24%,transparent_70%,rgba(0,0,0,.68))]" />

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 sm:p-4">
        <Link href="/herramientas/metalcon" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/58 px-4 text-[10px] font-black text-white/80 backdrop-blur-xl"><ArrowLeft size={15} /> Metalcon</Link>
        <div className="hidden rounded-full border border-white/10 bg-black/55 px-4 py-2 text-center backdrop-blur-xl sm:block">
          <span className="block text-[8px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Laboratorio constructivo 4D</span>
          <b className="text-[10px]">{preset.shortLabel} · {stageLabel(timeline)}</b>
        </div>
        <button type="button" onClick={() => setDrawer((value) => value ? null : 'layers')} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/58 px-4 text-[10px] font-black backdrop-blur-xl"><Menu size={15} /> Menú</button>
      </header>

      <div className="absolute left-3 top-[70px] z-30 flex max-w-[calc(100%-90px)] gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/52 p-1 backdrop-blur-xl [scrollbar-width:none] sm:left-4 sm:top-[76px]">
        <Quick active={cutaway} onClick={() => setCutaway(true)} icon={<Eye size={12} />} label="Corte" />
        <Quick active={!cutaway} onClick={() => setCutaway(false)} icon={<Home size={12} />} label="Exterior" />
        <Quick active={layers.sanitary} onClick={() => toggle('sanitary')} icon={<Droplets size={12} />} label="Sanitaria" />
        <Quick active={autoRotate} onClick={() => setAutoRotate((value) => !value)} icon={<Sun size={12} />} label="360°" />
      </div>

      {drawer ? (
        <aside className="absolute bottom-[92px] right-3 top-[68px] z-40 w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-[1.5rem] border border-white/12 bg-[#071017]/95 p-4 shadow-2xl backdrop-blur-2xl sm:right-4 sm:top-[76px]">
          <div className="flex items-center justify-between"><div><p className="text-[8px] font-black uppercase tracking-[.18em] text-[#F6C64A]">Controles dentro del visor</p><h2 className="mt-1 text-lg font-black">{drawer === 'layers' ? 'Capas y terminaciones' : drawer === 'environment' ? 'Entorno' : 'Instalaciones'}</h2></div><button type="button" onClick={() => setDrawer(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[.06] text-white/65"><X size={15} /></button></div>
          <div className="mt-4 grid grid-cols-3 gap-1">
            <Tab active={drawer === 'layers'} onClick={() => setDrawer('layers')} label="Capas" />
            <Tab active={drawer === 'systems'} onClick={() => setDrawer('systems')} label="Sistemas" />
            <Tab active={drawer === 'environment'} onClick={() => setDrawer('environment')} label="Entorno" />
          </div>

          {drawer === 'layers' ? (
            <div className="mt-4 space-y-2">
              {LAYERS.filter((item) => item.group !== 'instalaciones').map((item) => <LayerToggle key={item.id} label={item.label} active={layers[item.id]} onClick={() => toggle(item.id)} />)}
              <p className="pt-2 text-[9px] leading-4 text-white/36">El modo Corte deja una fachada abierta para explicar las capas sin tapar el interior. Los espesores y posiciones son representaciones educativas, no detalle ejecutivo.</p>
            </div>
          ) : null}

          {drawer === 'systems' ? (
            <div className="mt-4 space-y-2">
              <LayerToggle label="Baño y cocina" active={layers.fixtures} onClick={() => toggle('fixtures')} />
              <LayerToggle label="Red sanitaria + fosa 800 L" active={layers.sanitary} onClick={() => toggle('sanitary')} />
              <div className="rounded-xl border border-cyan-300/14 bg-cyan-300/[.04] p-3 text-[9px] leading-5 text-white/48"><b className="text-cyan-100">Representación sanitaria:</b> WC, ducha, lavamanos, mesón de cocina, grifería, descarga cocina/baño, desengrasadora, cámara de inspección, tubería y estanque séptico de 800 L. El trazado no reemplaza proyecto sanitario, pendientes ni autorización local.</div>
            </div>
          ) : null}

          {drawer === 'environment' ? (
            <div className="mt-4 space-y-3">
              <div><p className="text-[8px] font-black uppercase tracking-[.14em] text-white/38">Modelo</p><div className="mt-2 grid gap-1">{METALCON_HOUSE_PRESET_ORDER.map((id) => <button key={id} type="button" onClick={() => setModelId(id)} className={`rounded-xl border px-3 py-3 text-left text-[9px] font-black ${modelId === id ? 'border-[#F6C64A]/45 bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/8 bg-white/[.025] text-white/52'}`}>{METALCON_HOUSE_PRESETS[id].label}</button>)}</div></div>
              <div><p className="text-[8px] font-black uppercase tracking-[.14em] text-white/38">Cielo y luz</p><div className="mt-2 grid grid-cols-3 gap-1">{(['day', 'sunset', 'night'] as LightMode[]).map((mode) => <button key={mode} type="button" onClick={() => setLight(mode)} className={`rounded-xl py-2 text-[9px] font-black ${light === mode ? 'bg-[#F6C64A] text-black' : 'bg-white/[.05] text-white/48'}`}>{mode === 'day' ? 'Día' : mode === 'sunset' ? 'Atardecer' : 'Noche'}</button>)}</div></div>
              <LayerToggle label="Vegetación ligera" active={layers.vegetation} onClick={() => toggle('vegetation')} />
              <p className="text-[9px] leading-4 text-white/34">Las texturas del laboratorio son procedurales y se generan localmente para evitar dependencias externas, problemas de licencia y cargas pesadas en móvil.</p>
            </div>
          ) : null}
        </aside>
      ) : null}

      <div className="absolute bottom-3 left-3 right-3 z-30 rounded-[1.35rem] border border-white/12 bg-black/68 p-3 backdrop-blur-2xl sm:bottom-4 sm:left-4 sm:right-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={playing ? () => setPlaying(false) : play} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-black">{playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
          <button type="button" onClick={() => setTimeline((value) => Math.max(0, value - 7))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.07] text-white/65"><ChevronLeft size={15} /></button>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-3"><span className="truncate text-[8px] font-black uppercase tracking-[.12em] text-[#F6C64A]">{stageLabel(timeline)}</span><span className="text-[8px] text-white/38">{timeline}%</span></div>
            <input aria-label="Secuencia constructiva Metalcon" type="range" min={0} max={100} value={timeline} onChange={(event) => { setPlaying(false); setTimeline(Number(event.target.value)); }} className="w-full accent-[#F6C64A]" />
          </div>
          <button type="button" onClick={() => setTimeline((value) => Math.min(100, value + 7))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[.07] text-white/65"><ChevronRight size={15} /></button>
          <button type="button" onClick={reset} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/[.07] text-white/65"><RotateCcw size={15} /></button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[7px] uppercase tracking-[.08em] text-white/30"><span>Excavación</span><span>Metalcon</span><span>Capas</span><span>Instalaciones</span><span>Teja</span></div>
      </div>
    </div>
  );
}

function Quick({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-[8px] font-black ${active ? 'bg-[#F6C64A] text-black' : 'text-white/55'}`}>{icon}{label}</button>;
}

function Tab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`rounded-xl py-2 text-[8px] font-black ${active ? 'bg-white text-black' : 'bg-white/[.05] text-white/45'}`}>{label}</button>;
}

function LayerToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[.025] px-3 py-3 text-left"><span className="text-[9px] font-bold text-white/65">{label}</span><span className={`h-5 w-9 rounded-full p-0.5 transition ${active ? 'bg-[#F6C64A]' : 'bg-white/10'}`}><span className={`block h-4 w-4 rounded-full bg-black transition ${active ? 'translate-x-4' : ''}`} /></span></button>;
}

function ConstructionEnvironment({ light, vegetation, preset }: { light: LightMode; vegetation: boolean; preset: MetalconHousePreset }) {
  const grass = useMemo(() => makeTexture('grass'), []);
  const soil = useMemo(() => makeTexture('soil'), []);
  useEffect(() => () => { grass.dispose(); soil.dispose(); }, [grass, soil]);
  const cfg = light === 'night'
    ? { bg: '#05070d', sun: [16, 30, -18] as [number, number, number], ambient: .24, directional: .8 }
    : light === 'sunset'
      ? { bg: '#57343c', sun: [-38, 18, 24] as [number, number, number], ambient: .36, directional: 1.7 }
      : { bg: '#9bc5df', sun: [52, 46, 30] as [number, number, number], ambient: .52, directional: 2.1 };
  const extent = Math.max(34, preset.widthM * 5, preset.depthM * 4);
  return <>
    <color attach="background" args={[cfg.bg]} />
    {light === 'night' ? <Stars radius={80} depth={45} count={900} factor={2.2} fade /> : <Sky distance={450000} sunPosition={cfg.sun} turbidity={light === 'sunset' ? 9 : 5} rayleigh={light === 'sunset' ? 4 : 2.2} />}
    <ambientLight intensity={cfg.ambient} />
    <hemisphereLight args={[light === 'night' ? '#5f6d8a' : '#dceffc', '#3a2d25', .54]} />
    <directionalLight position={cfg.sun} intensity={cfg.directional} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.14, 0]} receiveShadow><planeGeometry args={[extent, extent]} /><meshStandardMaterial map={grass} roughness={1} /></mesh>
    <mesh position={[0, -.11, 0]} receiveShadow><boxGeometry args={[preset.widthM + 1.1, .14, preset.depthM + 1.1]} /><meshStandardMaterial map={soil} roughness={1} /></mesh>
    {vegetation ? <Vegetation width={preset.widthM} depth={preset.depthM} /> : null}
  </>;
}

function Vegetation({ width, depth }: { width: number; depth: number }) {
  const shrubs = Array.from({ length: 22 }, (_, index) => {
    const side = index % 4;
    const spread = (pseudo(index, 18) - .5) * (side < 2 ? depth + 9 : width + 9);
    const offset = 2.2 + pseudo(index + 91, 8) * 3.5;
    const x = side === 0 ? -width / 2 - offset : side === 1 ? width / 2 + offset : spread;
    const z = side === 2 ? -depth / 2 - offset : side === 3 ? depth / 2 + offset : spread;
    return { x, z, scale: .35 + pseudo(index + 200, 3) * .5 };
  });
  return <group>{shrubs.map((item, index) => <group key={index} position={[item.x, 0, item.z]} scale={item.scale}><mesh position={[0, .22, 0]} castShadow><cylinderGeometry args={[.035, .055, .44, 8]} /><meshStandardMaterial color="#5e4935" roughness={1} /></mesh><mesh position={[0, .58, 0]} castShadow><coneGeometry args={[.36, .82, 9]} /><meshStandardMaterial color={index % 3 === 0 ? '#517443' : '#628650'} roughness={1} /></mesh></group>)}</group>;
}

function ConstructionFinishes({ preset, timeline, layers, cutaway }: { preset: MetalconHousePreset; timeline: number; layers: Record<LayerKey, boolean>; cutaway: boolean }) {
  const scale = Math.min(1, 8.4 / Math.max(preset.widthM, preset.depthM + (preset.terraceDepthM ?? 0)));
  const textures = useMemo(() => ({ osb: makeTexture('osb'), gypsum: makeTexture('gypsum'), tile: makeTexture('tile'), siding: makeTexture('siding'), roof: makeTexture('roof'), soil: makeTexture('soil') }), []);
  useEffect(() => () => { textures.osb.dispose(); textures.gypsum.dispose(); textures.tile.dispose(); textures.siding.dispose(); textures.roof.dispose(); textures.soil.dispose(); }, [textures]);
  return <group scale={scale}>
    <FoundationExcavation preset={preset} opacity={visibleAt(timeline, 0)} texture={textures.soil} />
    {layers.osb ? <PerimeterLayer preset={preset} offset={.055} thickness={.035} texture={textures.osb} color="#b9824c" opacity={visibleAt(timeline, 40) * .88} cutaway={cutaway} /> : null}
    {layers.membrane ? <PerimeterLayer preset={preset} offset={.078} thickness={.012} color="#25384b" opacity={visibleAt(timeline, 49) * .5} cutaway={cutaway} /> : null}
    {layers.battens ? <Battens preset={preset} opacity={visibleAt(timeline, 56)} cutaway={cutaway} /> : null}
    {layers.insulation ? <PerimeterLayer preset={preset} offset={-.025} thickness={.07} color="#e7c76a" opacity={visibleAt(timeline, 62) * .48} cutaway={cutaway} /> : null}
    {layers.gypsum ? <PerimeterLayer preset={preset} offset={-.082} thickness={.018} texture={textures.gypsum} color="#dfdcd4" opacity={visibleAt(timeline, 69) * .86} cutaway={cutaway} /> : null}
    {layers.floor ? <FloorFinish preset={preset} texture={textures.tile} opacity={visibleAt(timeline, 75)} /> : null}
    {layers.ceiling ? <CeilingSystem preset={preset} opacity={visibleAt(timeline, 81)} /> : null}
    {layers.fixtures ? <InteriorFixtures preset={preset} opacity={visibleAt(timeline, 86)} /> : null}
    {layers.sanitary ? <SanitarySystem preset={preset} opacity={visibleAt(timeline, 91)} /> : null}
    {layers.siding ? <PerimeterLayer preset={preset} offset={.12} thickness={.03} texture={textures.siding} color="#b7bebd" opacity={visibleAt(timeline, 95) * .92} cutaway={cutaway} /> : null}
    {layers.roof ? <RoofSystem preset={preset} texture={textures.roof} opacity={visibleAt(timeline, 98)} cutaway={cutaway} /> : null}
  </group>;
}

function FoundationExcavation({ preset, opacity, texture }: { preset: MetalconHousePreset; opacity: number; texture: Texture }) {
  return <group visible={opacity > .01}><mesh position={[0, -.17, 0]} receiveShadow><boxGeometry args={[preset.widthM + .9, .18, preset.depthM + .9]} /><meshStandardMaterial map={texture} roughness={1} transparent opacity={.7 * opacity} /></mesh><mesh position={[0, -.04, 0]} receiveShadow><boxGeometry args={[preset.widthM + .28, .22, preset.depthM + .28]} /><meshStandardMaterial color="#70767a" roughness={.92} transparent opacity={.65 * opacity} /></mesh></group>;
}

function PerimeterLayer({ preset, offset, thickness, texture, color, opacity, cutaway }: { preset: MetalconHousePreset; offset: number; thickness: number; texture?: Texture; color: string; opacity: number; cutaway: boolean }) {
  if (opacity <= .01) return null;
  const y = preset.heightM / 2;
  const props = { map: texture, color, roughness: .82, transparent: opacity < .98, opacity, depthWrite: opacity > .82 };
  return <group>
    <mesh position={[0, y, -preset.depthM / 2 - offset]} castShadow receiveShadow><boxGeometry args={[preset.widthM, preset.heightM, thickness]} /><meshStandardMaterial {...props} /></mesh>
    {!cutaway ? <mesh position={[0, y, preset.depthM / 2 + offset]} castShadow receiveShadow><boxGeometry args={[preset.widthM, preset.heightM, thickness]} /><meshStandardMaterial {...props} /></mesh> : null}
    <mesh position={[-preset.widthM / 2 - offset, y, 0]} castShadow receiveShadow><boxGeometry args={[thickness, preset.heightM, preset.depthM]} /><meshStandardMaterial {...props} /></mesh>
    <mesh position={[preset.widthM / 2 + offset, y, 0]} castShadow receiveShadow><boxGeometry args={[thickness, preset.heightM, preset.depthM]} /><meshStandardMaterial {...props} /></mesh>
  </group>;
}

function Battens({ preset, opacity, cutaway }: { preset: MetalconHousePreset; opacity: number; cutaway: boolean }) {
  if (opacity <= .01) return null;
  const countX = Math.max(4, Math.ceil(preset.widthM / .6));
  const countZ = Math.max(4, Math.ceil(preset.depthM / .6));
  return <group>
    {Array.from({ length: countX + 1 }, (_, index) => -preset.widthM / 2 + index * (preset.widthM / countX)).map((x) => <mesh key={`n-${x}`} position={[x, preset.heightM / 2, -preset.depthM / 2 - .098]} castShadow><boxGeometry args={[.035, preset.heightM, .035]} /><meshStandardMaterial color="#8c5b36" roughness={.9} transparent opacity={opacity} /></mesh>)}
    {!cutaway ? Array.from({ length: countX + 1 }, (_, index) => -preset.widthM / 2 + index * (preset.widthM / countX)).map((x) => <mesh key={`s-${x}`} position={[x, preset.heightM / 2, preset.depthM / 2 + .098]} castShadow><boxGeometry args={[.035, preset.heightM, .035]} /><meshStandardMaterial color="#8c5b36" roughness={.9} transparent opacity={opacity} /></mesh>) : null}
    {Array.from({ length: countZ + 1 }, (_, index) => -preset.depthM / 2 + index * (preset.depthM / countZ)).flatMap((z) => [
      <mesh key={`w-${z}`} position={[-preset.widthM / 2 - .098, preset.heightM / 2, z]} castShadow><boxGeometry args={[.035, preset.heightM, .035]} /><meshStandardMaterial color="#8c5b36" roughness={.9} transparent opacity={opacity} /></mesh>,
      <mesh key={`e-${z}`} position={[preset.widthM / 2 + .098, preset.heightM / 2, z]} castShadow><boxGeometry args={[.035, preset.heightM, .035]} /><meshStandardMaterial color="#8c5b36" roughness={.9} transparent opacity={opacity} /></mesh>,
    ])}
  </group>;
}

function FloorFinish({ preset, texture, opacity }: { preset: MetalconHousePreset; texture: Texture; opacity: number }) {
  if (opacity <= .01) return null;
  return <mesh position={[0, .045, 0]} receiveShadow><boxGeometry args={[preset.widthM - .14, .045, preset.depthM - .14]} /><meshStandardMaterial map={texture} color="#d0d3d4" roughness={.55} transparent opacity={opacity} /></mesh>;
}

function CeilingSystem({ preset, opacity }: { preset: MetalconHousePreset; opacity: number }) {
  if (opacity <= .01) return null;
  const count = Math.max(5, Math.ceil(preset.widthM / .6));
  return <group>
    {Array.from({ length: count + 1 }, (_, index) => -preset.widthM / 2 + index * (preset.widthM / count)).map((x) => <mesh key={x} position={[x, preset.heightM - .12, 0]}><boxGeometry args={[.035, .035, preset.depthM]} /><meshStandardMaterial color="#b8c0c6" metalness={.7} roughness={.3} transparent opacity={opacity} /></mesh>)}
    <mesh position={[0, preset.heightM - .17, 0]}><boxGeometry args={[preset.widthM - .08, .025, preset.depthM - .08]} /><meshStandardMaterial color="#e8e5dc" roughness={.88} transparent opacity={opacity * .88} /></mesh>
  </group>;
}

function InteriorFixtures({ preset, opacity }: { preset: MetalconHousePreset; opacity: number }) {
  if (opacity <= .01) return null;
  const bathX = preset.widthM / 2 - .85;
  const bathZ = -preset.depthM / 2 + Math.min(2.05, preset.depthM * .34);
  const kitchenX = -preset.widthM / 2 + Math.min(1.25, preset.widthM * .28);
  const kitchenZ = -preset.depthM / 2 + .42;
  return <group>
    <group position={[bathX, 0, bathZ]}>
      <mesh position={[0, .26, 0]} castShadow><cylinderGeometry args={[.22, .28, .32, 24]} /><meshStandardMaterial color="#f2f3ef" roughness={.25} transparent opacity={opacity} /></mesh>
      <mesh position={[0, .53, -.18]} castShadow><boxGeometry args={[.42, .48, .18]} /><meshStandardMaterial color="#f2f3ef" roughness={.25} transparent opacity={opacity} /></mesh>
      <Html center distanceFactor={9} position={[0, .92, 0]}><Tag>WC</Tag></Html>
    </group>
    <group position={[bathX - .95, 0, bathZ + .2]}>
      <mesh position={[0, .04, 0]} receiveShadow><boxGeometry args={[.88, .08, .88]} /><meshStandardMaterial color="#d6d8d7" roughness={.5} transparent opacity={opacity} /></mesh>
      <mesh position={[0, .95, -.42]}><boxGeometry args={[.9, 1.8, .018]} /><meshPhysicalMaterial color="#8ecbe1" transmission={.45} transparent opacity={opacity * .38} roughness={.08} /></mesh>
      <Html center distanceFactor={9} position={[0, 1.2, 0]}><Tag>Ducha</Tag></Html>
    </group>
    <group position={[bathX - .1, 0, bathZ + .8]}>
      <mesh position={[0, .72, 0]} castShadow><boxGeometry args={[.62, .18, .42]} /><meshStandardMaterial color="#eceeea" roughness={.25} transparent opacity={opacity} /></mesh>
      <mesh position={[0, .42, 0]} castShadow><boxGeometry args={[.18, .58, .18]} /><meshStandardMaterial color="#d9dcda" roughness={.35} transparent opacity={opacity} /></mesh>
      <Html center distanceFactor={9} position={[0, 1.02, 0]}><Tag>Lavamanos</Tag></Html>
    </group>
    <group position={[kitchenX, 0, kitchenZ]}>
      <mesh position={[0, .45, 0]} castShadow><boxGeometry args={[2.1, .9, .62]} /><meshStandardMaterial color="#8c755f" roughness={.65} transparent opacity={opacity} /></mesh>
      <mesh position={[.35, .92, -.02]}><boxGeometry args={[.72, .06, .42]} /><meshStandardMaterial color="#9fa8ad" metalness={.55} roughness={.28} transparent opacity={opacity} /></mesh>
      <mesh position={[.35, 1.08, -.17]}><cylinderGeometry args={[.025, .025, .36, 12]} /><meshStandardMaterial color="#c7d0d4" metalness={.85} roughness={.2} transparent opacity={opacity} /></mesh>
      <Html center distanceFactor={9} position={[0, 1.25, 0]}><Tag>Mesón + grifería</Tag></Html>
    </group>
  </group>;
}

function SanitarySystem({ preset, opacity }: { preset: MetalconHousePreset; opacity: number }) {
  if (opacity <= .01) return null;
  const tankX = preset.widthM / 2 + 2.25;
  const tankZ = preset.depthM / 2 - 1.15;
  return <group>
    <mesh position={[preset.widthM / 2 + .95, -.28, .45]}><boxGeometry args={[3.6, .28, .55]} /><meshStandardMaterial color="#5c3d28" roughness={1} transparent opacity={opacity * .62} /></mesh>
    <mesh position={[0, -.16, .45]}><boxGeometry args={[preset.widthM + 1.7, .07, .11]} /><meshStandardMaterial color="#d9e3e8" roughness={.45} transparent opacity={opacity} /></mesh>
    <mesh position={[preset.widthM / 2 + .72, -.08, .45]}><boxGeometry args={[.55, .38, .55]} /><meshStandardMaterial color="#737c80" roughness={.7} transparent opacity={opacity} /></mesh>
    <Html center distanceFactor={10} position={[preset.widthM / 2 + .72, .22, .45]}><Tag>Cámara</Tag></Html>
    <group position={[tankX, -.18, tankZ]}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.58, .58, 1.35, 28]} /><meshStandardMaterial color="#568896" roughness={.58} transparent opacity={opacity * .92} /></mesh>
      <Html center distanceFactor={10} position={[0, .9, 0]}><Tag>Fosa 800 L · representación</Tag></Html>
    </group>
    <mesh position={[-preset.widthM / 2 - .8, -.1, -preset.depthM / 2 + .8]}><boxGeometry args={[.58, .42, .58]} /><meshStandardMaterial color="#8a7a61" roughness={.85} transparent opacity={opacity} /></mesh>
    <Html center distanceFactor={10} position={[-preset.widthM / 2 - .8, .3, -preset.depthM / 2 + .8]}><Tag>Desengrasadora</Tag></Html>
    <mesh position={[-preset.widthM / 4, -.12, -preset.depthM / 2 + .8]}><boxGeometry args={[preset.widthM / 2 + 1.1, .065, .1]} /><meshStandardMaterial color="#d9e3e8" roughness={.45} transparent opacity={opacity} /></mesh>
  </group>;
}

function RoofSystem({ preset, texture, opacity, cutaway }: { preset: MetalconHousePreset; texture: Texture; opacity: number; cutaway: boolean }) {
  if (opacity <= .01) return null;
  const rise = Math.max(.65, preset.widthM * .15);
  const half = preset.depthM / 2 + .35;
  const slope = Math.sqrt(half * half + rise * rise);
  const angle = Math.atan2(rise, half);
  return <group position={[0, preset.heightM + rise / 2 + .04, 0]}>
    <mesh position={[0, 0, -preset.depthM / 4]} rotation={[angle, 0, 0]} castShadow><boxGeometry args={[preset.widthM + .7, .055, slope]} /><meshStandardMaterial map={texture} color="#596064" roughness={.78} transparent opacity={opacity} /></mesh>
    {!cutaway ? <mesh position={[0, 0, preset.depthM / 4]} rotation={[-angle, 0, 0]} castShadow><boxGeometry args={[preset.widthM + .7, .055, slope]} /><meshStandardMaterial map={texture} color="#596064" roughness={.78} transparent opacity={opacity} /></mesh> : null}
    <mesh position={[0, -rise / 2 + .06, -preset.depthM / 2 - .28]}><boxGeometry args={[preset.widthM + .55, .09, .10]} /><meshStandardMaterial color="#697378" metalness={.6} roughness={.35} transparent opacity={opacity} /></mesh>
    <mesh position={[preset.widthM / 2 + .22, -preset.heightM / 2 - rise / 2 + .55, -preset.depthM / 2 - .28]}><boxGeometry args={[.09, preset.heightM + .95, .10]} /><meshStandardMaterial color="#697378" metalness={.6} roughness={.35} transparent opacity={opacity} /></mesh>
  </group>;
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap rounded-full border border-white/10 bg-black/80 px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] text-white/75 backdrop-blur">{children}</span>;
}
