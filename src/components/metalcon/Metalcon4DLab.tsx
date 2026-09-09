'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls, Sky, Stars } from '@react-three/drei';
import {
  Activity,
  Box,
  CircleDollarSign,
  Eye,
  Gauge,
  Info,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Settings2,
  Shield,
  Sun,
  TriangleAlert,
  Waves,
  Wrench,
} from 'lucide-react';
import {
  DataTexture,
  DoubleSide,
  Group,
  Mesh,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  Vector3,
} from 'three';

type LabMode = 'estructura' | 'sismo' | 'perfiles';
type SurfacePreset = 'pasto' | 'hormigon' | 'tierra' | 'grava';
type LightPreset = 'dia' | 'atardecer' | 'noche' | 'estudio';
type SoilPreset = 'roca' | 'firme' | 'blando';

type SimulationInputs = {
  magnitude: number;
  depthKm: number;
  duration: number;
  soil: SoilPreset;
  panelWidth: number;
  panelHeight: number;
  spacingMm: 400 | 600;
  thicknessMm: 0.85 | 1 | 1.2;
};

type SimulationResult = {
  hazard: number;
  damagePct: number;
  damagedStuds: number;
  criticalPoints: number;
  supportScore: number;
  repairLow: number;
  repairHigh: number;
  label: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
};

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const SURFACES: Array<{ id: SurfacePreset; label: string; description: string }> = [
  { id: 'pasto', label: 'Pasto', description: 'Terreno exterior' },
  { id: 'hormigon', label: 'Hormigón', description: 'Radier / obra' },
  { id: 'tierra', label: 'Tierra', description: 'Corte geológico' },
  { id: 'grava', label: 'Grava', description: 'Base compactada' },
];

const LIGHTS: Array<{ id: LightPreset; label: string }> = [
  { id: 'dia', label: 'Día' },
  { id: 'atardecer', label: 'Atardecer' },
  { id: 'noche', label: 'Noche' },
  { id: 'estudio', label: 'Estudio' },
];

const SOILS: Record<SoilPreset, { label: string; factor: number; description: string }> = {
  roca: { label: 'Roca / muy firme', factor: 0.72, description: 'Menor amplificación visual' },
  firme: { label: 'Suelo firme', factor: 1, description: 'Escenario base' },
  blando: { label: 'Suelo blando', factor: 1.28, description: 'Mayor amplificación visual' },
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function computeSimulation(inputs: SimulationInputs): SimulationResult {
  const magnitudeTerm = clamp((inputs.magnitude - 4) / 5.5);
  const depthTerm = clamp(1 - inputs.depthKm / 160);
  const durationTerm = clamp((inputs.duration - 5) / 35);
  const spacingFactor = inputs.spacingMm === 400 ? 0.88 : 1.08;
  const thicknessFactor = inputs.thicknessMm === 1.2 ? 0.82 : inputs.thicknessMm === 1 ? 0.92 : 1;
  const soilFactor = SOILS[inputs.soil].factor;

  const hazard = clamp(
    (magnitudeTerm * 0.62 + depthTerm * 0.2 + durationTerm * 0.1 + 0.08) *
      soilFactor *
      spacingFactor *
      thicknessFactor,
  );
  const damagePct = Math.round(clamp(Math.pow(hazard, 1.65) * 0.82) * 100);
  const studCount = Math.max(2, Math.floor((inputs.panelWidth * 1000) / inputs.spacingMm) + 1);
  const damagedStuds = Math.min(studCount, Math.round(studCount * damagePct / 100));
  const criticalPoints = damagePct < 18 ? 0 : Math.max(1, Math.round((damagePct / 100) * 6));
  const supportScore = Math.round(clamp(1 - hazard * 0.66 + (inputs.spacingMm === 400 ? 0.12 : 0)) * 100);

  // Referencia visual/comercial: piezas + fijaciones + mano de obra local estimada.
  const materialReference = damagedStuds * 18000 + criticalPoints * 42000 + Math.round(inputs.panelWidth * 16000);
  const repairLow = Math.max(90000, Math.round(materialReference * (0.9 + damagePct / 180)));
  const repairHigh = Math.round(repairLow * 1.65);
  const label: SimulationResult['label'] =
    damagePct >= 68 ? 'Crítico' : damagePct >= 42 ? 'Alto' : damagePct >= 18 ? 'Moderado' : 'Bajo';

  return { hazard, damagePct, damagedStuds, criticalPoints, supportScore, repairLow, repairHigh, label };
}

function seeded(index: number, seed: number) {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function buildProceduralTexture(kind: SurfacePreset) {
  const size = 96;
  const data = new Uint8Array(size * size * 4);
  const palette: Record<SurfacePreset, [number, number, number]> = {
    pasto: [92, 119, 67],
    hormigon: [132, 132, 128],
    tierra: [105, 73, 46],
    grava: [111, 108, 101],
  };
  const base = palette[kind];
  const seed = kind === 'pasto' ? 2 : kind === 'hormigon' ? 5 : kind === 'tierra' ? 8 : 11;

  for (let i = 0; i < size * size; i += 1) {
    const grain = (seeded(i, seed) - 0.5) * (kind === 'hormigon' ? 34 : 54);
    const fleck = seeded(i + 971, seed) > 0.965 ? (kind === 'grava' ? 52 : 28) : 0;
    const offset = grain + fleck;
    data[i * 4] = clamp(base[0] + offset, 0, 255);
    data[i * 4 + 1] = clamp(base[1] + offset * 0.82, 0, 255);
    data[i * 4 + 2] = clamp(base[2] + offset * 0.65, 0, 255);
    data[i * 4 + 3] = 255;
  }

  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.needsUpdate = true;
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(18, 18);
  return texture;
}

export default function Metalcon4DLab() {
  const [mode, setMode] = useState<LabMode>('estructura');
  const [surface, setSurface] = useState<SurfacePreset>('hormigon');
  const [light, setLight] = useState<LightPreset>('dia');
  const [autoRotate, setAutoRotate] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDamage, setShowDamage] = useState(true);
  const [showSupports, setShowSupports] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [inputs, setInputs] = useState<SimulationInputs>({
    magnitude: 7.2,
    depthKm: 28,
    duration: 18,
    soil: 'firme',
    panelWidth: 4.8,
    panelHeight: 2.4,
    spacingMm: 400,
    thicknessMm: 0.85,
  });

  const result = useMemo(() => computeSimulation(inputs), [inputs]);

  useEffect(() => {
    if (!playing) return;
    const stepMs = 100;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const next = value + stepMs / (inputs.duration * 1000);
        if (next >= 1) {
          window.clearInterval(timer);
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [playing, inputs.duration]);

  const startSimulation = () => {
    setMode('sismo');
    setProgress((value) => (value >= 0.999 ? 0 : value));
    setPlaying(true);
    setAutoRotate(false);
  };

  const resetSimulation = () => {
    setPlaying(false);
    setProgress(0);
  };

  return (
    <section className="mx-auto w-full max-w-[1480px] px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="metalcon-4d-title">
      <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-[#08090b] text-white shadow-[0_24px_80px_rgba(0,0,0,.22)]">
        <header className="grid gap-5 border-b border-white/10 px-5 py-6 lg:grid-cols-[1fr_auto] lg:items-end lg:px-7">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-[#ff7a3d]">
              <span className="rounded-full border border-[#ff7a3d]/30 bg-[#ff7a3d]/10 px-3 py-1">Metalcon Lab</span>
              <span>Three.js · 360° · tiempo 4D</span>
            </div>
            <h2 id="metalcon-4d-title" className="mt-3 max-w-4xl text-3xl font-black tracking-[-.04em] sm:text-4xl">
              Configuración estructural, perfiles y simulación sísmica visual en una sola estación.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              Explora el panel, aísla componentes, cambia suelo e iluminación y reproduce un escenario sísmico con hipocentro, propagación, respuesta del entramado, zonas críticas y un rango referencial de reparación.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAutoRotate((value) => !value)} className={pill(autoRotate)}>
              <Eye size={14} /> 360° {autoRotate ? 'activo' : 'manual'}
            </button>
            <button type="button" onClick={startSimulation} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#ff6a2a] px-4 text-xs font-black uppercase tracking-[.1em] text-white transition hover:bg-[#ff7d45]">
              <Play size={14} fill="currentColor" /> Reproducir sismo
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,.8fr)]">
          <div className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r">
            <nav className="flex gap-1 overflow-x-auto border-b border-white/10 p-3" aria-label="Modos del laboratorio Metalcon">
              <ModeButton active={mode === 'estructura'} onClick={() => setMode('estructura')} icon={<Box size={15} />} label="Modelo 4D" />
              <ModeButton active={mode === 'sismo'} onClick={() => setMode('sismo')} icon={<Waves size={15} />} label="Simulador sísmico" />
              <ModeButton active={mode === 'perfiles'} onClick={() => setMode('perfiles')} icon={<Ruler size={15} />} label="Perfiles y medidas" />
            </nav>

            <div className="relative h-[520px] bg-[#101317] sm:h-[620px]">
              <Canvas shadows dpr={[1, 1.75]} camera={{ position: [7.2, 4.4, 7.4], fov: 40 }}>
                <Suspense fallback={null}>
                  <EnvironmentRig light={light} surface={surface} mode={mode} />
                  {mode === 'perfiles' ? (
                    <ProfileGallery />
                  ) : (
                    <StructuralScene
                      inputs={inputs}
                      result={result}
                      mode={mode}
                      playing={playing}
                      progress={progress}
                      showDamage={showDamage}
                      showSupports={showSupports}
                      showMeasurements={showMeasurements}
                    />
                  )}
                  <CameraDirector active={mode === 'sismo' && playing} progress={progress} />
                  <OrbitControls
                    makeDefault
                    enabled={!playing}
                    target={mode === 'perfiles' ? [0, 1.1, 0] : [0, 1.25, 0]}
                    enableDamping
                    dampingFactor={0.08}
                    autoRotate={autoRotate && !playing}
                    autoRotateSpeed={0.75}
                    minDistance={2.4}
                    maxDistance={18}
                    maxPolarAngle={Math.PI * 0.58}
                  />
                </Suspense>
              </Canvas>

              <div className="pointer-events-none absolute left-3 top-3 max-w-[80%] rounded-2xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md">
                <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#ff9b72]">
                  {mode === 'sismo' ? `Secuencia ${Math.round(progress * 100)}% · ${simulationStage(progress)}` : mode === 'perfiles' ? 'Vista aislada · sección y longitud' : 'Exploración estructural · órbita libre'}
                </p>
              </div>

              {mode === 'sismo' && (
                <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => (playing ? setPlaying(false) : startSimulation())} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ff6a2a] text-white">
                      {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex justify-between text-[9px] font-black uppercase tracking-[.14em] text-white/55">
                        <span>Hipocentro</span><span>Superficie</span><span>Respuesta</span><span>Diagnóstico</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#ff6a2a] transition-[width] duration-100" style={{ width: `${progress * 100}%` }} /></div>
                    </div>
                    <button type="button" onClick={resetSimulation} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/15"><RotateCcw size={15} /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <SceneToggle active={showMeasurements} onClick={() => setShowMeasurements((value) => !value)} icon={<Ruler size={14} />} label="Medidas" />
              <SceneToggle active={showSupports} onClick={() => setShowSupports((value) => !value)} icon={<Shield size={14} />} label="Soportes" />
              <SceneToggle active={showDamage} onClick={() => setShowDamage((value) => !value)} icon={<TriangleAlert size={14} />} label="Daño" />
              <SceneToggle active={autoRotate} onClick={() => setAutoRotate((value) => !value)} icon={<Activity size={14} />} label="Órbita 360°" />
            </div>
          </div>

          <aside className="min-w-0 bg-[#0c0f12]">
            {mode === 'sismo' ? (
              <SeismicControls inputs={inputs} setInputs={setInputs} result={result} onPlay={startSimulation} />
            ) : mode === 'perfiles' ? (
              <ProfileDetails inputs={inputs} setInputs={setInputs} />
            ) : (
              <StructureControls inputs={inputs} setInputs={setInputs} />
            )}
          </aside>
        </div>

        <div className="grid gap-4 border-t border-white/10 bg-[#090b0d] p-5 lg:grid-cols-[1.15fr_.85fr] lg:p-7">
          <TextureLibrary surface={surface} setSurface={setSurface} light={light} setLight={setLight} />
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4">
            <div className="flex gap-3">
              <Info className="mt-0.5 shrink-0 text-amber-300" size={18} />
              <div>
                <h3 className="text-sm font-black text-amber-100">Simulación visual paramétrica, no cálculo estructural certificado</h3>
                <p className="mt-1 text-xs leading-5 text-amber-100/65">
                  La animación, los porcentajes de daño y el costo son una referencia educativa/comercial construida desde parámetros simplificados. No reemplazan memoria de cálculo, análisis dinámico, estudio de suelo, inspección en terreno ni validación de un profesional competente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function pill(active: boolean) {
  return `inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-black uppercase tracking-[.1em] transition ${active ? 'bg-white text-black' : 'bg-white/8 text-white/65 hover:bg-white/12'}`;
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black transition ${active ? 'bg-white text-black' : 'text-white/55 hover:bg-white/8 hover:text-white'}`}>{icon}{label}</button>;
}

function SceneToggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-[.12em] transition ${active ? 'border-[#ff6a2a]/35 bg-[#ff6a2a]/10 text-[#ff9b72]' : 'border-white/10 bg-white/[.03] text-white/45'}`}>{icon}{label}</button>;
}

function EnvironmentRig({ light, surface, mode }: { light: LightPreset; surface: SurfacePreset; mode: LabMode }) {
  const texture = useMemo(() => buildProceduralTexture(surface), [surface]);
  useEffect(() => () => texture.dispose(), [texture]);

  const config = {
    dia: { sky: '#8eb8d8', ambient: 0.55, directional: 2.1, sun: [60, 50, 35] as [number, number, number] },
    atardecer: { sky: '#4f2f32', ambient: 0.36, directional: 1.8, sun: [-45, 18, 20] as [number, number, number] },
    noche: { sky: '#05070d', ambient: 0.2, directional: 0.75, sun: [20, 35, -30] as [number, number, number] },
    estudio: { sky: '#17191d', ambient: 0.7, directional: 2.5, sun: [15, 24, 18] as [number, number, number] },
  }[light];

  return (
    <>
      <color attach="background" args={[config.sky]} />
      {light === 'noche' ? <Stars radius={80} depth={45} count={900} factor={2.5} saturation={0} fade speed={0.4} /> : <Sky distance={450000} sunPosition={config.sun} turbidity={light === 'atardecer' ? 9 : 5} rayleigh={light === 'atardecer' ? 4 : 2} />}
      <ambientLight intensity={config.ambient} />
      <hemisphereLight args={[light === 'noche' ? '#4c5b80' : '#c9dded', '#43392f', 0.55]} />
      <directionalLight position={config.sun} intensity={config.directional} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.035, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={texture} roughness={surface === 'hormigon' ? 0.8 : 1} metalness={surface === 'hormigon' ? 0.03 : 0} />
      </mesh>
      {mode !== 'sismo' && <ContactShadows position={[0, 0.01, 0]} opacity={0.42} scale={15} blur={2.5} far={8} />}
    </>
  );
}

function StructuralScene({ inputs, result, mode, playing, progress, showDamage, showSupports, showMeasurements }: {
  inputs: SimulationInputs;
  result: SimulationResult;
  mode: LabMode;
  playing: boolean;
  progress: number;
  showDamage: boolean;
  showSupports: boolean;
  showMeasurements: boolean;
}) {
  const structure = useRef<Group>(null);
  const studCount = Math.max(2, Math.floor((inputs.panelWidth * 1000) / inputs.spacingMm) + 1);
  const actualSpacing = inputs.panelWidth / Math.max(1, studCount - 1);
  const hazardVisible = mode === 'sismo' ? result.hazard * clamp((progress - 0.3) / 0.35) : 0;

  useFrame(({ clock }, delta) => {
    const group = structure.current;
    if (!group) return;
    const targetAmp = playing && progress > 0.28 && progress < 0.86 ? result.hazard * 0.13 : 0;
    const frequency = 8 + inputs.magnitude * 0.9;
    const time = clock.elapsedTime;
    group.position.x += ((Math.sin(time * frequency) * targetAmp) - group.position.x) * Math.min(1, delta * 12);
    group.position.z += ((Math.sin(time * frequency * 0.67 + 1.3) * targetAmp * 0.55) - group.position.z) * Math.min(1, delta * 10);
    group.rotation.z += ((Math.sin(time * frequency * 0.82) * targetAmp * 0.09) - group.rotation.z) * Math.min(1, delta * 10);
  });

  return (
    <group>
      {mode === 'sismo' && <SubsurfaceSimulation progress={progress} playing={playing} hazard={result.hazard} depthKm={inputs.depthKm} />}
      <group ref={structure} position={[0, 0.05, 0]}>
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
          <boxGeometry args={[inputs.panelWidth + 0.35, 0.06, 0.78]} />
          <meshStandardMaterial color="#464b51" roughness={0.82} />
        </mesh>

        <FrameMember position={[0, 0.09, 0]} size={[inputs.panelWidth, 0.055, 0.09]} color="#e5e9ed" />
        <FrameMember position={[0, inputs.panelHeight + 0.09, 0]} size={[inputs.panelWidth, 0.055, 0.09]} color="#e5e9ed" />

        {Array.from({ length: studCount }, (_, index) => {
          const x = -inputs.panelWidth / 2 + index * actualSpacing;
          const score = clamp(result.hazard * (0.48 + seeded(index + 31, 7) * 0.62) + (index === 0 || index === studCount - 1 ? 0.08 : 0));
          const damageColor = score > 0.78 ? '#ff2d2d' : score > 0.58 ? '#ff7a2f' : score > 0.38 ? '#ffd24b' : '#d7dde3';
          return (
            <group key={index}>
              <FrameMember position={[x, inputs.panelHeight / 2 + 0.09, 0]} size={[0.045, inputs.panelHeight, 0.09]} color={showDamage && mode === 'sismo' ? damageColor : '#d7dde3'} />
              {showDamage && mode === 'sismo' && hazardVisible > 0.15 && score > 0.42 && (
                <Hotspot position={[x, score > 0.65 ? inputs.panelHeight * 0.7 : inputs.panelHeight * 0.28, 0.08]} score={score} label={score > 0.78 ? 'Crítico' : score > 0.58 ? 'Alto' : 'Medio'} />
              )}
            </group>
          );
        })}

        <Brace width={inputs.panelWidth * 0.86} height={inputs.panelHeight * 0.88} direction={1} />
        <Brace width={inputs.panelWidth * 0.86} height={inputs.panelHeight * 0.88} direction={-1} />

        {showSupports && (
          <>
            <SupportPoint position={[-inputs.panelWidth * 0.43, 0.18, 0.1]} label="Anclaje" />
            <SupportPoint position={[inputs.panelWidth * 0.43, 0.18, 0.1]} label="Anclaje" />
            <SupportPoint position={[0, inputs.panelHeight * 0.52, 0.1]} label="Arriostre X" />
          </>
        )}

        {showMeasurements && mode !== 'sismo' && (
          <>
            <MeasureLabel position={[0, inputs.panelHeight + 0.42, 0]} text={`${inputs.panelWidth.toFixed(2)} m ancho`} />
            <MeasureLabel position={[-inputs.panelWidth / 2 - 0.36, inputs.panelHeight / 2, 0]} text={`${inputs.panelHeight.toFixed(2)} m alto`} />
            <MeasureLabel position={[inputs.panelWidth / 2 + 0.34, inputs.panelHeight * 0.55, 0]} text={`@ ${inputs.spacingMm} mm`} />
          </>
        )}
      </group>
    </group>
  );
}

function FrameMember({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return <mesh position={position} castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={0.82} roughness={0.3} /></mesh>;
}

function Brace({ width, height, direction }: { width: number; height: number; direction: 1 | -1 }) {
  const length = Math.sqrt(width * width + height * height);
  const angle = Math.atan2(width, height) * direction;
  return <mesh position={[0, height / 2 + 0.12, 0.075]} rotation={[0, 0, angle]} castShadow><boxGeometry args={[0.028, length, 0.014]} /><meshStandardMaterial color="#ff8a3d" metalness={0.62} roughness={0.35} /></mesh>;
}

function Hotspot({ position, score, label }: { position: [number, number, number]; score: number; label: string }) {
  const color = score > 0.78 ? '#ff2d2d' : score > 0.58 ? '#ff7a2f' : '#ffd24b';
  return (
    <group position={position}>
      <mesh><sphereGeometry args={[0.075, 18, 18]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} /></mesh>
      <mesh><sphereGeometry args={[0.13, 18, 18]} /><meshBasicMaterial color={color} transparent opacity={0.16} /></mesh>
      <Html center distanceFactor={8} position={[0, 0.2, 0]}><span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-white">{label}</span></Html>
    </group>
  );
}

function SupportPoint({ position, label }: { position: [number, number, number]; label: string }) {
  return (
    <group position={position}>
      <mesh><sphereGeometry args={[0.055, 16, 16]} /><meshStandardMaterial color="#42e68b" emissive="#1ac96a" emissiveIntensity={1.8} /></mesh>
      <Html center distanceFactor={9} position={[0, 0.16, 0]}><span className="whitespace-nowrap rounded-full border border-emerald-300/20 bg-emerald-950/85 px-2 py-1 text-[8px] font-black text-emerald-200">{label}</span></Html>
    </group>
  );
}

function MeasureLabel({ position, text }: { position: [number, number, number]; text: string }) {
  return <Html center distanceFactor={8} position={position}><span className="whitespace-nowrap rounded-lg border border-white/10 bg-black/75 px-2 py-1 text-[9px] font-black tracking-[.08em] text-white">{text}</span></Html>;
}

function SubsurfaceSimulation({ progress, playing, hazard, depthKm }: { progress: number; playing: boolean; hazard: number; depthKm: number }) {
  const pulseA = useRef<Mesh>(null);
  const pulseB = useRef<Mesh>(null);
  const hypocenterY = -2.2 - clamp(depthKm / 120) * 1.4;

  useFrame(({ clock }) => {
    const phase = playing ? clock.elapsedTime : progress * 8;
    [pulseA.current, pulseB.current].forEach((mesh, index) => {
      if (!mesh) return;
      const local = ((phase * (0.55 + hazard * 0.8) + index * 0.5) % 1);
      const scale = 0.35 + local * (2.7 + hazard * 2.4);
      mesh.scale.setScalar(scale);
      const material = mesh.material as { opacity: number };
      material.opacity = Math.max(0, (1 - local) * 0.45 * clamp(progress / 0.28));
    });
  });

  const fractureVisible = progress > 0.18 && hazard > 0.42;
  return (
    <group>
      <mesh position={[0, -0.55, 0]}><boxGeometry args={[7.2, 1, 5.4]} /><meshStandardMaterial color="#6d5138" transparent opacity={0.48} roughness={1} /></mesh>
      <mesh position={[0, -1.35, 0]}><boxGeometry args={[7.2, 0.6, 5.4]} /><meshStandardMaterial color="#40372f" transparent opacity={0.55} roughness={1} /></mesh>
      <mesh position={[0, -2.05, 0]}><boxGeometry args={[7.2, 0.8, 5.4]} /><meshStandardMaterial color="#272b2e" transparent opacity={0.68} roughness={0.95} /></mesh>
      <group position={[0, hypocenterY, 0]}>
        <mesh><sphereGeometry args={[0.12 + hazard * 0.13, 24, 24]} /><meshStandardMaterial color="#ff3b23" emissive="#ff2400" emissiveIntensity={5} /></mesh>
        <mesh ref={pulseA}><sphereGeometry args={[0.48, 28, 18]} /><meshBasicMaterial color="#ff5a35" wireframe transparent opacity={0} /></mesh>
        <mesh ref={pulseB}><sphereGeometry args={[0.48, 28, 18]} /><meshBasicMaterial color="#ffb04a" wireframe transparent opacity={0} /></mesh>
        <Html center distanceFactor={8} position={[0, -0.32, 0]}><span className="whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-[8px] font-black uppercase text-[#ff9a70]">Hipocentro visual · {depthKm} km</span></Html>
      </group>
      {fractureVisible && (
        <group position={[0, -0.05, 0]}>
          <Crack x={-0.8} z={0.2} rot={0.52} />
          <Crack x={0.25} z={-0.4} rot={-0.34} />
          <Crack x={1.15} z={0.6} rot={0.82} />
        </group>
      )}
    </group>
  );
}

function Crack({ x, z, rot }: { x: number; z: number; rot: number }) {
  return <mesh position={[x, 0.015, z]} rotation={[-Math.PI / 2, 0, rot]}><planeGeometry args={[1.15, 0.045]} /><meshBasicMaterial color="#ff4b2e" transparent opacity={0.72} side={DoubleSide} /></mesh>;
}

function CameraDirector({ active, progress }: { active: boolean; progress: number }) {
  const { camera } = useThree();
  const desired = useRef(new Vector3());
  const look = useRef(new Vector3());
  useFrame(() => {
    if (!active) return;
    if (progress < 0.3) {
      desired.current.set(5.6, -1.6, 6.4);
      look.current.set(0, -2.1, 0);
    } else if (progress < 0.58) {
      desired.current.set(6.4, 2.2, 6.2);
      look.current.set(0, 0.6, 0);
    } else if (progress < 0.84) {
      desired.current.set(4.7, 2.9, 5.2);
      look.current.set(0, 1.1, 0);
    } else {
      desired.current.set(6.8, 4.2, 7.2);
      look.current.set(0, 1.2, 0);
    }
    camera.position.lerp(desired.current, 0.035);
    camera.lookAt(look.current);
  });
  return null;
}

function ProfileGallery() {
  return (
    <group position={[0, 0.35, 0]}>
      <group position={[-1.45, 0.75, 0]} rotation={[0.1, -0.35, 0]}>
        <ChannelProfile type="C" length={2.7} />
        <Html position={[0, 1.25, 0]} center distanceFactor={8}><ProfileTag title="Montante C" detail="90 × 38 × 12 · e 0,85 mm" /></Html>
      </group>
      <group position={[1.55, 0.72, 0]} rotation={[0.08, 0.35, 0]}>
        <ChannelProfile type="U" length={2.7} />
        <Html position={[0, 1.25, 0]} center distanceFactor={8}><ProfileTag title="Solera U" detail="90 × 25 · e 0,85 mm" /></Html>
      </group>
    </group>
  );
}

function ChannelProfile({ type, length }: { type: 'C' | 'U'; length: number }) {
  const web = 0.18;
  const flange = type === 'C' ? 0.075 : 0.055;
  const visualT = 0.012;
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <FrameMember position={[0, 0, 0]} size={[visualT, length, web]} color={type === 'C' ? '#dce2e8' : '#eef1f4'} />
      <FrameMember position={[flange / 2, 0, web / 2 - visualT / 2]} size={[flange, length, visualT]} color={type === 'C' ? '#cbd2d9' : '#e0e5ea'} />
      <FrameMember position={[flange / 2, 0, -web / 2 + visualT / 2]} size={[flange, length, visualT]} color={type === 'C' ? '#cbd2d9' : '#e0e5ea'} />
      {type === 'C' && (
        <>
          <FrameMember position={[flange - visualT / 2, 0, web / 2 - 0.025]} size={[visualT, length, 0.05]} color="#b7c0c9" />
          <FrameMember position={[flange - visualT / 2, 0, -web / 2 + 0.025]} size={[visualT, length, 0.05]} color="#b7c0c9" />
        </>
      )}
    </group>
  );
}

function ProfileTag({ title, detail }: { title: string; detail: string }) {
  return <div className="min-w-40 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-center"><div className="text-[10px] font-black uppercase tracking-[.14em] text-[#ff9b72]">{title}</div><div className="mt-1 text-[9px] font-bold text-white/70">{detail}</div></div>;
}

function StructureControls({ inputs, setInputs }: { inputs: SimulationInputs; setInputs: React.Dispatch<React.SetStateAction<SimulationInputs>> }) {
  return (
    <PanelShell eyebrow="Configuración estructural" title="Modela el panel antes de simular" icon={<Settings2 size={18} />}>
      <RangeField label="Ancho del panel" value={`${inputs.panelWidth.toFixed(1)} m`} min={2.4} max={8} step={0.2} number={inputs.panelWidth} onChange={(panelWidth) => setInputs((v) => ({ ...v, panelWidth }))} />
      <RangeField label="Altura" value={`${inputs.panelHeight.toFixed(1)} m`} min={2.2} max={3.2} step={0.1} number={inputs.panelHeight} onChange={(panelHeight) => setInputs((v) => ({ ...v, panelHeight }))} />
      <Segmented label="Separación entre montantes" value={String(inputs.spacingMm)} options={[['400', '400 mm'], ['600', '600 mm']]} onChange={(value) => setInputs((v) => ({ ...v, spacingMm: Number(value) as 400 | 600 }))} />
      <Segmented label="Espesor de ejemplo" value={String(inputs.thicknessMm)} options={[['0.85', '0,85'], ['1', '1,00'], ['1.2', '1,20']]} onChange={(value) => setInputs((v) => ({ ...v, thicknessMm: Number(value) as 0.85 | 1 | 1.2 }))} />
      <div className="grid grid-cols-2 gap-2">
        <MetricCard icon={<Ruler size={14} />} label="Montantes" value={`${Math.floor((inputs.panelWidth * 1000) / inputs.spacingMm) + 1} un.`} />
        <MetricCard icon={<Layers3 size={14} />} label="Módulo" value={`${inputs.panelWidth.toFixed(1)} × ${inputs.panelHeight.toFixed(1)} m`} />
      </div>
      <Note>Las dimensiones del visor son configurables para presentación. La selección definitiva de perfil, espesor, anclajes y modulación depende del proyecto real.</Note>
    </PanelShell>
  );
}

function SeismicControls({ inputs, setInputs, result, onPlay }: { inputs: SimulationInputs; setInputs: React.Dispatch<React.SetStateAction<SimulationInputs>>; result: SimulationResult; onPlay: () => void }) {
  return (
    <PanelShell eyebrow="Monitoreo estructural visual" title="Escenario sísmico" icon={<Activity size={18} />}>
      <RangeField label="Magnitud del escenario" value={`Mw ${inputs.magnitude.toFixed(1)}`} min={4} max={9.5} step={0.1} number={inputs.magnitude} onChange={(magnitude) => setInputs((v) => ({ ...v, magnitude }))} accent />
      <RangeField label="Profundidad del hipocentro" value={`${inputs.depthKm} km`} min={5} max={120} step={1} number={inputs.depthKm} onChange={(depthKm) => setInputs((v) => ({ ...v, depthKm }))} />
      <RangeField label="Duración visual" value={`${inputs.duration} s`} min={5} max={40} step={1} number={inputs.duration} onChange={(duration) => setInputs((v) => ({ ...v, duration }))} />
      <label className="block">
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[.14em] text-white/45">Tipo de suelo</span>
        <select value={inputs.soil} onChange={(event) => setInputs((v) => ({ ...v, soil: event.target.value as SoilPreset }))} className="w-full rounded-xl border border-white/10 bg-white/[.05] px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#ff6a2a]/60">
          {Object.entries(SOILS).map(([id, soil]) => <option key={id} value={id} className="bg-[#111417]">{soil.label} · {soil.description}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard icon={<Gauge size={14} />} label="Daño visual" value={`${result.damagePct}%`} tone={result.label} />
        <MetricCard icon={<Shield size={14} />} label="Soporte relativo" value={`${result.supportScore}%`} />
        <MetricCard icon={<TriangleAlert size={14} />} label="Puntos críticos" value={String(result.criticalPoints)} />
        <MetricCard icon={<Wrench size={14} />} label="Montantes afectados" value={String(result.damagedStuds)} />
      </div>

      <div className="rounded-2xl border border-[#ff6a2a]/20 bg-[#ff6a2a]/[.07] p-4">
        <div className="flex items-center gap-2 text-[#ff9b72]"><CircleDollarSign size={16} /><span className="text-[10px] font-black uppercase tracking-[.14em]">Rango referencial de reparación</span></div>
        <div className="mt-2 text-xl font-black tracking-[-.03em]">{clp.format(result.repairLow)} – {clp.format(result.repairHigh)}</div>
        <p className="mt-1 text-[10px] leading-4 text-white/45">Estimación paramétrica del panel mostrado; no es una cotización ni diagnóstico post-sismo.</p>
      </div>

      <button type="button" onClick={onPlay} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff6a2a] px-4 py-3 text-xs font-black uppercase tracking-[.12em] text-white hover:bg-[#ff7d45]"><Play size={15} fill="currentColor" /> Ejecutar secuencia 4D</button>
    </PanelShell>
  );
}

function ProfileDetails({ inputs, setInputs }: { inputs: SimulationInputs; setInputs: React.Dispatch<React.SetStateAction<SimulationInputs>> }) {
  return (
    <PanelShell eyebrow="Biblioteca de perfiles" title="Qué estás viendo" icon={<Ruler size={18} />}>
      <ProfileInfo title="Montante C 90 × 38 × 12" items={['Alma visual: 90 mm', 'Ala visual: 38 mm', 'Labio visual: 12 mm', `Espesor seleccionado: ${inputs.thicknessMm.toFixed(2).replace('.', ',')} mm`]} />
      <ProfileInfo title="Solera U 90 × 25" items={['Alma visual: 90 mm', 'Ala visual: 25 mm', 'Base superior e inferior del panel', 'Recibe y ordena los montantes']} />
      <Segmented label="Separación del ejemplo" value={String(inputs.spacingMm)} options={[['400', '400 mm'], ['600', '600 mm']]} onChange={(value) => setInputs((v) => ({ ...v, spacingMm: Number(value) as 400 | 600 }))} />
      <Segmented label="Espesor mostrado" value={String(inputs.thicknessMm)} options={[['0.85', '0,85 mm'], ['1', '1,00 mm'], ['1.2', '1,20 mm']]} onChange={(value) => setInputs((v) => ({ ...v, thicknessMm: Number(value) as 0.85 | 1 | 1.2 }))} />
      <Note>El espesor del material está exagerado geométricamente dentro del modelo 3D para que la sección se pueda leer en pantalla. Las cifras de la ficha son las que representan el ejemplo.</Note>
    </PanelShell>
  );
}

function PanelShell({ eyebrow, title, icon, children }: { eyebrow: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-4 p-5 lg:p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ff6a2a]/10 text-[#ff8b57]">{icon}</div><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-white/35">{eyebrow}</p><h3 className="mt-1 text-xl font-black tracking-[-.03em]">{title}</h3></div></div>{children}</div>;
}

function RangeField({ label, value, min, max, step, number, onChange, accent = false }: { label: string; value: string; min: number; max: number; step: number; number: number; onChange: (value: number) => void; accent?: boolean }) {
  return <label className="block rounded-2xl border border-white/8 bg-white/[.025] p-3"><div className="mb-3 flex items-center justify-between gap-3"><span className="text-[10px] font-black uppercase tracking-[.12em] text-white/45">{label}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${accent ? 'bg-[#ff6a2a]/15 text-[#ff9b72]' : 'bg-white/8 text-white/75'}`}>{value}</span></div><input type="range" min={min} max={max} step={step} value={number} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#ff6a2a]" /></label>;
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <div><p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-white/45">{label}</p><div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[.04] p-1">{options.map(([id, text]) => <button key={id} type="button" onClick={() => onChange(id)} className={`rounded-lg px-2 py-2 text-[10px] font-black transition ${value === id ? 'bg-white text-black' : 'text-white/45 hover:text-white'}`}>{text}</button>)}</div></div>;
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: SimulationResult['label'] }) {
  const critical = tone === 'Crítico' || tone === 'Alto';
  return <div className={`rounded-xl border p-3 ${critical ? 'border-red-400/20 bg-red-400/[.06]' : 'border-white/8 bg-white/[.025]'}`}><div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white/40">{icon}{label}</div><div className={`mt-1 text-base font-black ${critical ? 'text-red-300' : 'text-white'}`}>{value}</div></div>;
}

function ProfileInfo({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><h4 className="text-sm font-black text-[#ff9b72]">{title}</h4><ul className="mt-3 grid gap-2">{items.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-[#ff6a2a]" />{item}</li>)}</ul></div>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.025] p-3 text-[10px] leading-4 text-white/45"><Info className="mr-1 inline" size={12} />{children}</div>;
}

function TextureLibrary({ surface, setSurface, light, setLight }: { surface: SurfacePreset; setSurface: (value: SurfacePreset) => void; light: LightPreset; setLight: (value: LightPreset) => void }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
      <div className="flex items-center gap-2"><Sun size={16} className="text-[#ff9b72]" /><h3 className="text-sm font-black">Biblioteca procedural de ambiente</h3><span className="ml-auto rounded-full bg-emerald-400/10 px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-emerald-300">sin assets externos</span></div>
      <p className="mt-1 text-[10px] leading-4 text-white/40">Texturas generadas localmente para evitar CORS, peso extra y dependencia de licencias. Cambia suelo, cielo e iluminación sin recargar la página.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><p className="mb-2 text-[9px] font-black uppercase tracking-[.14em] text-white/35">Suelo</p><div className="flex flex-wrap gap-1.5">{SURFACES.map((item) => <button key={item.id} type="button" onClick={() => setSurface(item.id)} className={`rounded-full px-3 py-1.5 text-[9px] font-black ${surface === item.id ? 'bg-white text-black' : 'bg-white/7 text-white/55'}`}>{item.label}</button>)}</div></div>
        <div><p className="mb-2 text-[9px] font-black uppercase tracking-[.14em] text-white/35">Cielo / luz</p><div className="flex flex-wrap gap-1.5">{LIGHTS.map((item) => <button key={item.id} type="button" onClick={() => setLight(item.id)} className={`rounded-full px-3 py-1.5 text-[9px] font-black ${light === item.id ? 'bg-[#ff6a2a] text-white' : 'bg-white/7 text-white/55'}`}>{item.label}</button>)}</div></div>
      </div>
    </div>
  );
}

function simulationStage(progress: number) {
  if (progress < 0.2) return 'nucleación en profundidad';
  if (progress < 0.42) return 'propagación de ondas';
  if (progress < 0.62) return 'llegada a superficie';
  if (progress < 0.86) return 'respuesta del entramado';
  return 'lectura de daño y soportes';
}
