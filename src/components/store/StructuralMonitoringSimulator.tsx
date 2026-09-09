'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Sky } from '@react-three/drei';
import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Gauge,
  Info,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Waves,
  Wrench,
} from 'lucide-react';
import { Group, Mesh, Vector3 } from 'three';
import { StoreBottomNav, StorefrontHeader } from './StorefrontChrome';

type Soil = 'rock' | 'firm' | 'soft';
type SeismicConfig = {
  magnitude: number;
  depthKm: number;
  duration: number;
  soil: Soil;
};

type Analysis = {
  hazard: number;
  damage: number;
  support: number;
  critical: number;
  affectedStuds: number;
  repairLow: number;
  repairHigh: number;
  level: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
};

const SOIL: Record<Soil, { label: string; factor: number; text: string }> = {
  rock: { label: 'Roca / suelo muy firme', factor: 0.72, text: 'Menor amplificación visual' },
  firm: { label: 'Suelo firme', factor: 1, text: 'Escenario de referencia' },
  soft: { label: 'Suelo blando', factor: 1.28, text: 'Mayor amplificación visual' },
};

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function clamp(value: number, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }

function analyze(config: SeismicConfig): Analysis {
  const magnitude = clamp((config.magnitude - 4) / 5.5);
  const shallow = clamp(1 - config.depthKm / 160);
  const duration = clamp((config.duration - 5) / 35);
  const hazard = clamp((magnitude * 0.64 + shallow * 0.22 + duration * 0.1 + 0.04) * SOIL[config.soil].factor);
  const damage = Math.round(clamp(Math.pow(hazard, 1.62) * 0.84) * 100);
  const support = Math.round(clamp(1 - hazard * 0.68 + 0.08) * 100);
  const critical = damage < 18 ? 0 : Math.max(1, Math.round((damage / 100) * 7));
  const affectedStuds = Math.min(16, Math.round(16 * damage / 100));
  const base = affectedStuds * 18500 + critical * 43000 + 85000;
  const repairLow = Math.max(95000, Math.round(base * (0.88 + damage / 190)));
  const repairHigh = Math.round(repairLow * 1.7);
  const level: Analysis['level'] = damage >= 68 ? 'Crítico' : damage >= 42 ? 'Alto' : damage >= 18 ? 'Moderado' : 'Bajo';
  return { hazard, damage, support, critical, affectedStuds, repairLow, repairHigh, level };
}

export function StructuralMonitoringSimulator() {
  const [config, setConfig] = useState<SeismicConfig>({ magnitude: 7.2, depthKm: 28, duration: 18, soil: 'firm' });
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDamage, setShowDamage] = useState(true);
  const [showSupports, setShowSupports] = useState(true);
  const result = useMemo(() => analyze(config), [config]);

  useEffect(() => {
    if (!playing) return;
    const step = 100;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const next = value + step / (config.duration * 1000);
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, step);
    return () => window.clearInterval(timer);
  }, [playing, config.duration]);

  const play = () => {
    setProgress((value) => value >= 0.999 ? 0 : value);
    setPlaying(true);
  };
  const reset = () => { setPlaying(false); setProgress(0); };

  return <div className="min-h-screen bg-[#03070a] text-white">
    <StorefrontHeader />
    <main className="pb-28 md:pb-16">
      <section className="border-b border-white/10 px-3 py-9 sm:px-6 sm:py-14">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">Digital twin · Three.js · secuencia 4D educativa</p>
            <h1 className="mt-3 max-w-5xl text-[clamp(2.8rem,7vw,6.6rem)] font-black leading-[.88] tracking-[-.065em]">Del hipocentro al panel.</h1>
            <p className="mt-5 max-w-3xl text-sm leading-6 text-white/50 sm:text-base">Configura magnitud, profundidad, duración y suelo. Reproduce la propagación bajo tierra, el cambio de cámara hacia la estructura y una lectura visual de zonas exigidas, soportes y reparación referencial.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/herramientas/metalcon" className="rounded-full border border-white/15 px-5 py-3 text-xs font-black text-white/70">← Configurar panel</Link>
            <button type="button" onClick={play} className="flex items-center gap-2 rounded-full bg-[#F6C64A] px-5 py-3 text-xs font-black text-black"><Play size={14} fill="currentColor" /> Reproducir terremoto</button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-6 sm:px-6 xl:grid-cols-[minmax(0,1.45fr)_400px] xl:gap-8 xl:py-10">
        <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#071015]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
            <div><p className="text-[8px] font-black uppercase tracking-[.2em] text-cyan-300">Simulación sísmica · panel P-01</p><b className="text-xs">Cámara cinemática + órbita 360°</b></div>
            <div className="flex gap-1.5">
              <Toggle active={showSupports} onClick={() => setShowSupports(v => !v)} label="Soportes" />
              <Toggle active={showDamage} onClick={() => setShowDamage(v => !v)} label="Daño" />
            </div>
          </div>

          <div className="relative h-[560px] sm:h-[680px]">
            <Canvas shadows dpr={[1, 1.7]} camera={{ position: [7.5, 4.2, 8], fov: 40 }}>
              <Suspense fallback={null}>
                <SeismicEnvironment />
                <SeismicWorld config={config} result={result} playing={playing} progress={progress} showDamage={showDamage} showSupports={showSupports} />
                <CameraSequence active={playing} progress={progress} />
                <OrbitControls makeDefault enabled={!playing} target={[0, 1.2, 0]} enableDamping dampingFactor={0.08} minDistance={2.7} maxDistance={20} maxPolarAngle={Math.PI * 0.63} />
              </Suspense>
            </Canvas>
            <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.14em] text-cyan-100 backdrop-blur-md">{stage(progress)} · {Math.round(progress * 100)}%</div>
            <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur-xl sm:p-4">
              <div className="flex items-center gap-3">
                <button type="button" onClick={playing ? () => setPlaying(false) : play} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-black">{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
                <div className="min-w-0 flex-1"><div className="mb-2 flex justify-between text-[7px] font-black uppercase tracking-[.11em] text-white/40"><span>Foco</span><span>Ondas</span><span>Superficie</span><span>Estructura</span><span>Daño</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-[width] duration-100" style={{ width: `${progress * 100}%` }} /></div></div>
                <button type="button" onClick={reset} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/60"><RotateCcw size={15} /></button>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0A1115] p-5">
            <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Parámetros del evento</p><Waves size={18} className="text-cyan-300" /></div>
            <Range label="Magnitud del escenario" value={`Mw ${config.magnitude.toFixed(1)}`} min={4} max={9.5} step={0.1} number={config.magnitude} onChange={magnitude => setConfig(v => ({ ...v, magnitude }))} />
            <Range label="Profundidad del hipocentro" value={`${config.depthKm} km`} min={5} max={120} step={1} number={config.depthKm} onChange={depthKm => setConfig(v => ({ ...v, depthKm }))} />
            <Range label="Duración visual" value={`${config.duration} s`} min={5} max={40} step={1} number={config.duration} onChange={duration => setConfig(v => ({ ...v, duration }))} />
            <label className="mt-4 block"><span className="mb-2 block text-[9px] font-black uppercase tracking-[.14em] text-white/40">Suelo</span><select value={config.soil} onChange={e => setConfig(v => ({ ...v, soil: e.target.value as Soil }))} className="h-12 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black text-white outline-none">{Object.entries(SOIL).map(([id, soil]) => <option key={id} value={id}>{soil.label} · {soil.text}</option>)}</select></label>
            <div className="mt-4 grid grid-cols-3 gap-1.5"><Preset label="M6,0" onClick={() => setConfig({ magnitude: 6, depthKm: 45, duration: 10, soil: 'firm' })} /><Preset label="M7,2" onClick={() => setConfig({ magnitude: 7.2, depthKm: 28, duration: 18, soil: 'firm' })} /><Preset label="M8,5" onClick={() => setConfig({ magnitude: 8.5, depthKm: 18, duration: 28, soil: 'soft' })} /></div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-[#0A1115] p-5">
            <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Lectura paramétrica</p><Activity size={18} className={result.level === 'Crítico' ? 'text-red-400' : 'text-[#F6C64A]'} /></div>
            <div className="mt-3 flex items-end gap-3"><b className={`text-6xl tracking-[-.07em] ${result.damage >= 68 ? 'text-red-400' : result.damage >= 42 ? 'text-orange-300' : 'text-[#F6C64A]'}`}>{result.damage}%</b><span className="pb-2 text-xs font-black text-white/55">daño visual · {result.level}</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><Metric icon={<ShieldCheck />} label="Soporte relativo" value={`${result.support}%`} /><Metric icon={<AlertTriangle />} label="Puntos críticos" value={String(result.critical)} /><Metric icon={<Wrench />} label="Montantes afectados" value={String(result.affectedStuds)} /><Metric icon={<Gauge />} label="Índice de demanda" value={`${Math.round(result.hazard * 100)}%`} /></div>
          </div>

          <div className="rounded-[1.6rem] border border-[#F6C64A]/20 bg-[#F6C64A]/[.06] p-5">
            <div className="flex items-center gap-2 text-[#F6C64A]"><CircleDollarSign size={17} /><p className="text-[9px] font-black uppercase tracking-[.16em]">Reparación referencial</p></div>
            <b className="mt-2 block text-xl tracking-[-.03em]">{clp.format(result.repairLow)} – {clp.format(result.repairHigh)}</b>
            <p className="mt-2 text-[9px] leading-4 text-white/38">Rango paramétrico del panel de demostración: perfiles, fijaciones y mano de obra de referencia. No constituye cotización ni peritaje.</p>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-[1500px] px-3 pb-12 sm:px-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Process number="01" title="Nucleación" text={`El foco se representa a ${config.depthKm} km y se normaliza en escala para poder verlo dentro de la escena.`} />
          <Process number="02" title="Propagación" text="Ondas concéntricas muestran de forma visual la transferencia de energía hacia capas superiores." />
          <Process number="03" title="Respuesta" text="La cámara sube al panel y el entramado oscila según un índice paramétrico, no un análisis dinámico real." />
          <Process number="04" title="Diagnóstico" text="Hotspots resaltan puntos exigidos y soportes para explicar dónde convendría inspeccionar después de un evento." />
        </div>
        <div className="mt-5 flex gap-3 rounded-[1.4rem] border border-amber-300/20 bg-amber-300/[.05] p-4 text-[10px] leading-5 text-amber-50/60"><Info size={17} className="mt-0.5 shrink-0 text-amber-300" /><p><b className="text-amber-100">Herramienta educativa/comercial.</b> La animación, daño, soporte y costo son aproximaciones paramétricas. No predicen el comportamiento de una vivienda real y no sustituyen análisis estructural, estudio de suelo, normativa aplicable, inspección post-sismo ni evaluación de un profesional competente. Si existe daño real, no uses este resultado para decidir habitabilidad.</p></div>
      </section>
    </main>
    <StoreBottomNav />
  </div>;
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) { return <button type="button" onClick={onClick} className={`rounded-full px-3 py-2 text-[8px] font-black ${active ? 'bg-cyan-300 text-black' : 'bg-white/[.07] text-white/45'}`}>{label}</button>; }
function Preset({ label, onClick }: { label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-lg border border-white/10 bg-white/[.04] py-2 text-[9px] font-black text-white/55 hover:text-white">{label}</button>; }
function Range({ label, value, min, max, step, number, onChange }: { label: string; value: string; min: number; max: number; step: number; number: number; onChange: (value: number) => void }) { return <label className="mt-4 block"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-[.13em] text-white/40">{label}</span><b className="rounded-full bg-white/[.07] px-2 py-1 text-[9px] text-cyan-200">{value}</b></div><input type="range" min={min} max={max} step={step} value={number} onChange={e => onChange(Number(e.target.value))} className="w-full accent-cyan-300" /></label>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><span className="text-cyan-300 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span><b className="mt-2 block text-base">{value}</b><small className="text-[8px] text-white/35">{label}</small></div>; }
function Process({ number, title, text }: { number: string; title: string; text: string }) { return <article className="rounded-[1.4rem] border border-white/10 bg-[#0A1115] p-5"><span className="text-[9px] font-black text-cyan-300">{number}</span><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-[10px] leading-5 text-white/40">{text}</p></article>; }

function SeismicEnvironment() {
  return <>
    <color attach="background" args={['#101922']} />
    <Sky distance={450000} sunPosition={[55, 42, 26]} turbidity={7} rayleigh={2.6} />
    <ambientLight intensity={0.42} />
    <hemisphereLight args={['#bcd6e8', '#3b2e25', 0.52]} />
    <directionalLight position={[50, 42, 26]} intensity={1.9} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]} receiveShadow><planeGeometry args={[50, 50]} /><meshStandardMaterial color="#6f766b" roughness={1} /></mesh>
  </>;
}

function SeismicWorld({ config, result, playing, progress, showDamage, showSupports }: { config: SeismicConfig; result: Analysis; playing: boolean; progress: number; showDamage: boolean; showSupports: boolean }) {
  const frame = useRef<Group>(null);
  const visibleDemand = result.hazard * clamp((progress - 0.34) / 0.3);
  useFrame(({ clock }, delta) => {
    if (!frame.current) return;
    const active = playing && progress > 0.34 && progress < 0.88;
    const amplitude = active ? result.hazard * 0.14 : 0;
    const frequency = 7.5 + config.magnitude * 0.95;
    const targetX = Math.sin(clock.elapsedTime * frequency) * amplitude;
    const targetZ = Math.sin(clock.elapsedTime * frequency * 0.69 + 1.2) * amplitude * 0.5;
    const targetR = Math.sin(clock.elapsedTime * frequency * 0.81) * amplitude * 0.1;
    frame.current.position.x += (targetX - frame.current.position.x) * Math.min(1, delta * 12);
    frame.current.position.z += (targetZ - frame.current.position.z) * Math.min(1, delta * 10);
    frame.current.rotation.z += (targetR - frame.current.rotation.z) * Math.min(1, delta * 10);
  });
  return <group>
    <Subsurface config={config} result={result} playing={playing} progress={progress} />
    <group ref={frame} position={[0, 0.05, 0]}>
      <mesh position={[0, 0.03, 0]} receiveShadow><boxGeometry args={[6.45, 0.06, 0.75]} /><meshStandardMaterial color="#43494e" roughness={0.82} /></mesh>
      <FrameMember position={[0, 0.1, 0]} size={[6, 0.055, 0.09]} color="#e7ebef" />
      <FrameMember position={[0, 2.5, 0]} size={[6, 0.055, 0.09]} color="#e7ebef" />
      {Array.from({ length: 16 }, (_, i) => {
        const x = -3 + i * 0.4;
        const score = clamp(result.hazard * (0.48 + ((i * 37) % 11) / 16) + (i === 0 || i === 15 ? 0.07 : 0));
        const color = showDamage && visibleDemand > 0.1 ? damageColor(score) : '#d7dde3';
        return <group key={i}><FrameMember position={[x, 1.3, 0]} size={[0.045, 2.4, 0.09]} color={color} />{showDamage && visibleDemand > 0.18 && score > 0.43 ? <DamagePoint position={[x, score > 0.65 ? 1.75 : 0.68, 0.09]} score={score} /> : null}</group>;
      })}
      <Brace direction={1} /><Brace direction={-1} />
      {showSupports ? <><Support position={[-2.75, 0.18, 0.12]} label="Anclaje" /><Support position={[2.75, 0.18, 0.12]} label="Anclaje" /><Support position={[0, 1.3, 0.12]} label="Arriostre X" /></> : null}
    </group>
  </group>;
}

function FrameMember({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) { return <mesh position={position} castShadow><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={0.8} roughness={0.31} /></mesh>; }
function Brace({ direction }: { direction: 1 | -1 }) { const width = 5.3, height = 2.1, length = Math.sqrt(width * width + height * height), angle = Math.atan2(width, height) * direction; return <mesh position={[0, 1.3, 0.075]} rotation={[0, 0, angle]} castShadow><boxGeometry args={[0.03, length, 0.015]} /><meshStandardMaterial color="#F6C64A" metalness={0.58} roughness={0.4} /></mesh>; }
function damageColor(score: number) { return score > 0.78 ? '#ff3347' : score > 0.59 ? '#ff7a32' : score > 0.43 ? '#f9d65c' : '#d7dde3'; }
function DamagePoint({ position, score }: { position: [number, number, number]; score: number }) { const color = damageColor(score); return <group position={position}><mesh><sphereGeometry args={[0.075, 18, 18]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} /></mesh><mesh><sphereGeometry args={[0.14, 18, 18]} /><meshBasicMaterial color={color} transparent opacity={0.15} /></mesh><Html center distanceFactor={8} position={[0, 0.19, 0]}><span className="whitespace-nowrap rounded-full bg-black/80 px-2 py-1 text-[7px] font-black uppercase text-white">{score > 0.78 ? 'Crítico' : score > 0.59 ? 'Alto' : 'Medio'}</span></Html></group>; }
function Support({ position, label }: { position: [number, number, number]; label: string }) { return <group position={position}><mesh><sphereGeometry args={[0.06, 16, 16]} /><meshStandardMaterial color="#42e68b" emissive="#1ac96a" emissiveIntensity={1.8} /></mesh><Html center distanceFactor={9} position={[0, 0.17, 0]}><span className="whitespace-nowrap rounded-full border border-emerald-300/20 bg-emerald-950/85 px-2 py-1 text-[7px] font-black text-emerald-200">{label}</span></Html></group>; }

function Subsurface({ config, result, playing, progress }: { config: SeismicConfig; result: Analysis; playing: boolean; progress: number }) {
  const pulseA = useRef<Mesh>(null), pulseB = useRef<Mesh>(null), pulseC = useRef<Mesh>(null);
  const hypocenterY = -2.15 - clamp(config.depthKm / 120) * 1.55;
  useFrame(({ clock }) => {
    const phase = playing ? clock.elapsedTime : progress * 7;
    [pulseA.current, pulseB.current, pulseC.current].forEach((mesh, index) => {
      if (!mesh) return;
      const local = (phase * (0.48 + result.hazard * 0.85) + index * 0.34) % 1;
      mesh.scale.setScalar(0.35 + local * (2.5 + result.hazard * 2.5));
      const material = mesh.material as { opacity: number };
      material.opacity = Math.max(0, (1 - local) * 0.42 * clamp(progress / 0.3));
    });
  });
  return <group>
    <mesh position={[0, -0.55, 0]}><boxGeometry args={[8, 1, 6]} /><meshStandardMaterial color="#76583c" transparent opacity={0.48} roughness={1} /></mesh>
    <mesh position={[0, -1.35, 0]}><boxGeometry args={[8, 0.6, 6]} /><meshStandardMaterial color="#493b31" transparent opacity={0.55} roughness={1} /></mesh>
    <mesh position={[0, -2.08, 0]}><boxGeometry args={[8, 0.85, 6]} /><meshStandardMaterial color="#292d31" transparent opacity={0.68} roughness={0.95} /></mesh>
    <group position={[0, hypocenterY, 0]}>
      <mesh><sphereGeometry args={[0.13 + result.hazard * 0.13, 24, 24]} /><meshStandardMaterial color="#ff3b23" emissive="#ff2100" emissiveIntensity={5} /></mesh>
      {[pulseA, pulseB, pulseC].map((ref, i) => <mesh ref={ref} key={i}><sphereGeometry args={[0.48, 28, 18]} /><meshBasicMaterial color={i === 1 ? '#ffb04a' : '#ff5a35'} wireframe transparent opacity={0} /></mesh>)}
      <Html center distanceFactor={8} position={[0, -0.34, 0]}><span className="whitespace-nowrap rounded-lg bg-black/85 px-2 py-1 text-[7px] font-black uppercase text-[#ff9a70]">Hipocentro visual · {config.depthKm} km</span></Html>
    </group>
    {progress > 0.18 && result.hazard > 0.42 ? <group position={[0, -0.02, 0]}><Crack x={-1.1} z={0.25} rot={0.55} /><Crack x={0.2} z={-0.5} rot={-0.35} /><Crack x={1.3} z={0.55} rot={0.85} /></group> : null}
  </group>;
}
function Crack({ x, z, rot }: { x: number; z: number; rot: number }) { return <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, rot]}><planeGeometry args={[1.25, 0.045]} /><meshBasicMaterial color="#ff4b2e" transparent opacity={0.72} /></mesh>; }

function CameraSequence({ active, progress }: { active: boolean; progress: number }) {
  const { camera } = useThree();
  const position = useRef(new Vector3());
  const target = useRef(new Vector3());
  useFrame(() => {
    if (!active) return;
    if (progress < 0.28) { position.current.set(5.8, -1.6, 6.5); target.current.set(0, -2.1, 0); }
    else if (progress < 0.52) { position.current.set(6.6, 1.1, 6.4); target.current.set(0, -0.5, 0); }
    else if (progress < 0.82) { position.current.set(4.9, 2.9, 5.3); target.current.set(0, 1.15, 0); }
    else { position.current.set(7, 4.25, 7.5); target.current.set(0, 1.2, 0); }
    camera.position.lerp(position.current, 0.04);
    camera.lookAt(target.current);
  });
  return null;
}

function stage(progress: number) {
  if (progress < 0.18) return 'Nucleación en profundidad';
  if (progress < 0.4) return 'Propagación de ondas';
  if (progress < 0.58) return 'Llegada a superficie';
  if (progress < 0.86) return 'Respuesta estructural visual';
  return 'Mapa de daño y soportes';
}
