'use client';

import { Html, Line, OrbitControls, PointerLockControls, Sparkles } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import BambooHouse from './BambooHouse';
import {
  calculateDamage,
  clamp,
  damageLevel,
  resonanceFactor,
  soilFactor,
  waveSignal,
  type Anchoring,
  type Condition,
  type Direction,
  type SimulatorSettings,
  type Soil,
} from './damage';

type CameraMode = 'orbit' | 'first' | 'cinematic';
type HotspotId = 'roof' | 'walls' | 'openings' | 'base' | 'ground';
type Sample = { t: number; value: number };
type Movement = { forward: boolean; backward: boolean; left: boolean; right: boolean };

const HOTSPOTS: Record<HotspotId, { title: string; text: string; note: string }> = {
  roof: { title: 'Cubierta y diafragma superior', text: 'La cubierta recibe aceleraciones y transmite esfuerzos hacia los muros. Continuidad, arriostramiento y uniones controlan levantamientos y desplazamientos.', note: 'El visor aumenta la oscilación de la cubierta en escenarios de alta demanda.' },
  walls: { title: 'Muros resistentes', text: 'Los paños verticales estabilizan la vivienda frente a desplazamientos laterales. Su comportamiento depende de la rigidización y de la correcta fijación.', note: 'Las fisuras visuales aparecen de forma progresiva según el índice educativo.' },
  openings: { title: 'Puertas y ventanas', text: 'Las esquinas de los vanos concentran deformaciones. Dinteles, montantes laterales y encuentros deben redistribuir las cargas.', note: 'El modelo representa primero daño no estructural alrededor de aberturas.' },
  base: { title: 'Anclajes y fundación', text: 'Pernos, placas y hold-downs transfieren las acciones hacia la fundación. La continuidad de esta ruta es decisiva.', note: 'Compara anclaje reforzado, estándar o deficiente desde el panel.' },
  ground: { title: 'Suelo y amplificación', text: 'Suelos blandos o rellenos pueden amplificar y prolongar el movimiento respecto de roca o terreno firme.', note: 'El factor es conceptual y no reemplaza un estudio de mecánica de suelos.' },
};

const INITIAL: SimulatorSettings = { intensity: 5.8, frequency: 1.8, duration: 24, vertical: 22, soil: 'firm', condition: 'maintained', anchoring: 'standard', direction: 'multi' };

function Crack({ points, opacity }: { points: [number, number, number][]; opacity: number }) {
  return <Line points={points} color="#101010" lineWidth={2.2} transparent opacity={opacity} />;
}

function DamageEffects({ score }: { score: number }) {
  const opacity = clamp((score - 25) / 45, 0, 0.92);
  return (
    <group>
      <Crack opacity={opacity} points={[[-1.6, 1.2, 2.18], [-1.48, 1, 2.2], [-1.6, .8, 2.2], [-1.42, .58, 2.21]]} />
      <Crack opacity={opacity * .82} points={[[1.4, 1.58, 2.16], [1.28, 1.37, 2.18], [1.43, 1.16, 2.19], [1.26, .98, 2.2]]} />
      <Crack opacity={clamp((score - 42) / 38, 0, .9)} points={[[-2.55, .55, -.8], [-2.58, .9, -.62], [-2.56, 1.15, -.82], [-2.55, 1.42, -.66]]} />
      {score > 62 && <Sparkles count={Math.round((score - 58) * 1.4)} scale={[5.5, 2.4, 4.5]} size={1.4} speed={.32} color="#fde047" />}
    </group>
  );
}

function Hotspot({ id, position, active, onSelect }: { id: HotspotId; position: [number, number, number]; active: boolean; onSelect: (id: HotspotId) => void }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.2 + position[0]) * .13;
    group.current.scale.setScalar(active ? 1.18 : pulse);
  });
  return (
    <group ref={group} position={position}>
      <mesh onClick={(event) => { event.stopPropagation(); onSelect(id); }}>
        <torusGeometry args={[.16, .025, 12, 36]} />
        <meshBasicMaterial color={active ? '#ffffff' : '#fde047'} transparent opacity={active ? 1 : .78} />
      </mesh>
      <mesh><sphereGeometry args={[.035, 12, 12]} /><meshBasicMaterial color="#fde047" /></mesh>
      <pointLight color="#fde047" intensity={active ? 1.2 : .48} distance={1.5} />
    </group>
  );
}

function GroundWaves({ signalRef, intensity, running }: { signalRef: MutableRefObject<number>; intensity: number; running: boolean }) {
  const rings = useRef<THREE.Mesh[]>([]);
  useFrame(({ clock }) => {
    rings.current.forEach((ring, index) => {
      const phase = (clock.elapsedTime * (.22 + intensity * .018) + index * .33) % 1;
      ring.scale.setScalar(1.6 + phase * 7);
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = running ? (1 - phase) * .18 * Math.min(1, intensity / 6) : .035;
      ring.rotation.z = signalRef.current * .04;
    });
  });
  return <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -.055, 0]}>{[0, 1, 2].map((index) => <mesh key={index} ref={(node) => { if (node) rings.current[index] = node; }}><ringGeometry args={[.98, 1, 96]} /><meshBasicMaterial color="#fde047" transparent opacity={.05} side={THREE.DoubleSide} /></mesh>)}</group>;
}

function FirstPerson({ enabled, movementRef }: { enabled: boolean; movementRef: MutableRefObject<Movement> }) {
  const { camera } = useThree();
  const keys = useRef<Movement>({ forward: false, backward: false, left: false, right: false });
  useEffect(() => {
    const update = (event: KeyboardEvent, pressed: boolean) => {
      if (event.code === 'KeyW' || event.code === 'ArrowUp') keys.current.forward = pressed;
      if (event.code === 'KeyS' || event.code === 'ArrowDown') keys.current.backward = pressed;
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') keys.current.left = pressed;
      if (event.code === 'KeyD' || event.code === 'ArrowRight') keys.current.right = pressed;
    };
    const down = (event: KeyboardEvent) => update(event, true);
    const up = (event: KeyboardEvent) => update(event, false);
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);
  useEffect(() => { if (enabled) camera.position.set(0, 1.62, 7.4); }, [camera, enabled]);
  useFrame((_, delta) => {
    if (!enabled) return;
    const direction = new THREE.Vector3(); camera.getWorldDirection(direction); direction.y = 0; direction.normalize();
    const right = new THREE.Vector3().crossVectors(direction, camera.up).normalize();
    const input = { forward: keys.current.forward || movementRef.current.forward, backward: keys.current.backward || movementRef.current.backward, left: keys.current.left || movementRef.current.left, right: keys.current.right || movementRef.current.right };
    const speed = 2.2 * delta;
    if (input.forward) camera.position.addScaledVector(direction, speed);
    if (input.backward) camera.position.addScaledVector(direction, -speed);
    if (input.left) camera.position.addScaledVector(right, -speed);
    if (input.right) camera.position.addScaledVector(right, speed);
    camera.position.x = clamp(camera.position.x, -10, 10); camera.position.z = clamp(camera.position.z, -10, 10); camera.position.y = 1.62;
  });
  return enabled ? <PointerLockControls makeDefault /> : null;
}

function CinematicCamera({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  useFrame(({ clock }) => {
    if (!enabled) return;
    const t = clock.elapsedTime * .16;
    camera.position.set(Math.sin(t) * 8.2, 3.4 + Math.sin(t * .8) * .45, Math.cos(t) * 8.2);
    camera.lookAt(0, 1.25, 0);
  });
  return null;
}

function Scene({ settings, running, resetToken, score, cameraMode, selected, movementRef, onSelect, onSample, onComplete }: { settings: SimulatorSettings; running: boolean; resetToken: number; score: number; cameraMode: CameraMode; selected: HotspotId | null; movementRef: MutableRefObject<Movement>; onSelect: (id: HotspotId) => void; onSample: (sample: Sample) => void; onComplete: () => void }) {
  const ground = useRef<THREE.Group>(null); const house = useRef<THREE.Group>(null); const time = useRef(0); const sampleClock = useRef(0); const completed = useRef(false); const signalRef = useRef(0);
  useEffect(() => { time.current = 0; sampleClock.current = 0; completed.current = false; signalRef.current = 0; ground.current?.position.set(0, 0, 0); ground.current?.rotation.set(0, 0, 0); house.current?.position.set(0, 0, 0); house.current?.rotation.set(0, 0, 0); }, [resetToken]);
  useFrame((_, delta) => {
    if (!running) return;
    time.current += delta; sampleClock.current += delta;
    const t = time.current; const signal = waveSignal(t, settings); signalRef.current = signal;
    const amplitude = (.018 + settings.intensity * .015) * soilFactor(settings.soil);
    const x = settings.direction === 'z' ? 0 : signal * amplitude;
    const zSignal = Math.sin(Math.PI * 2 * settings.frequency * .83 * t + .9);
    const z = settings.direction === 'x' ? 0 : zSignal * amplitude * (settings.direction === 'multi' ? .88 : 1);
    const y = Math.sin(Math.PI * 2 * settings.frequency * 1.42 * t + .25) * amplitude * (settings.vertical / 100) * .5;
    if (ground.current) { ground.current.position.set(x, y * .3, z); ground.current.rotation.z = x * .022; }
    if (house.current) { const lag = .74 + settings.intensity * .012; house.current.position.set(x * lag, y * .48, z * lag); house.current.rotation.z = -x * (.11 + score / 850); house.current.rotation.x = z * (.075 + score / 1050); }
    if (sampleClock.current >= .08) { sampleClock.current = 0; onSample({ t, value: signal }); }
    if (t >= settings.duration && !completed.current) { completed.current = true; onComplete(); }
  });
  return (
    <>
      <color attach="background" args={['#050505']} /><fog attach="fog" args={['#050505', 12, 30]} />
      <ambientLight intensity={.78} /><directionalLight castShadow position={[5, 9, 6]} intensity={2.1} color="#fff8dc" shadow-mapSize={[2048, 2048]} /><pointLight position={[-5, 4, -3]} intensity={35} distance={18} color="#fde047" />
      <group ref={ground}><mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[32, 32, 1, 1]} /><meshStandardMaterial color="#0c0c0c" roughness={.95} /></mesh><gridHelper args={[32, 32, '#3f3510', '#171717']} position={[0, .012, 0]} /></group>
      <GroundWaves signalRef={signalRef} intensity={settings.intensity} running={running} />
      <group ref={house}><BambooHouse score={score} signalRef={signalRef} /><DamageEffects score={score} /><Hotspot id="roof" position={[0, 3.45, .2]} active={selected === 'roof'} onSelect={onSelect} /><Hotspot id="walls" position={[-2.65, 1.55, .2]} active={selected === 'walls'} onSelect={onSelect} /><Hotspot id="openings" position={[1.45, 1.25, 2.35]} active={selected === 'openings'} onSelect={onSelect} /><Hotspot id="base" position={[2.55, .22, 1.65]} active={selected === 'base'} onSelect={onSelect} /></group>
      <Hotspot id="ground" position={[-3.1, .12, 2.75]} active={selected === 'ground'} onSelect={onSelect} />
      <OrbitControls makeDefault={cameraMode === 'orbit'} enabled={cameraMode === 'orbit'} enableDamping dampingFactor={.06} minDistance={5.2} maxDistance={15} maxPolarAngle={Math.PI / 2.02} target={[0, 1.25, 0]} />
      <FirstPerson enabled={cameraMode === 'first'} movementRef={movementRef} /><CinematicCamera enabled={cameraMode === 'cinematic'} />
    </>
  );
}

function Range({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="block"><span className="mb-2 flex justify-between gap-3 text-sm font-bold text-white/80">{label}<b className="text-yellow-300">{value}{suffix}</b></span><input className="w-full accent-yellow-300" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-white/80"><span className="mb-2 block">{label}</span><select className="w-full rounded-xl border border-white/10 bg-black/70 px-3 py-3 text-white outline-none focus:border-yellow-300" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[.045] p-5 backdrop-blur-2xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/45">{label}</p><b className="mt-2 block text-3xl text-yellow-300">{value}</b><span className="mt-1 block text-xs text-white/50">{detail}</span></div>; }
function DamageBar({ label, value, detail }: { label: string; value: number; detail: string }) { return <div className="space-y-2"><div className="flex justify-between gap-3 text-sm"><b>{label}</b><strong className="text-yellow-300">{value}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-yellow-300 transition-[width] duration-500" style={{ width: `${value}%` }} /></div><p className="text-xs leading-relaxed text-white/55">{detail}</p></div>; }
function MoveButton({ label, onChange }: { label: string; onChange: (active: boolean) => void }) { return <button type="button" onPointerDown={() => onChange(true)} onPointerUp={() => onChange(false)} onPointerCancel={() => onChange(false)} onPointerLeave={() => onChange(false)} className="h-12 w-12 rounded-xl border border-yellow-300/30 bg-black/70 font-black text-yellow-300">{label}</button>; }

export default function SeismicSimulator() {
  const [settings, setSettings] = useState(INITIAL); const [running, setRunning] = useState(false); const [resetToken, setResetToken] = useState(0); const [samples, setSamples] = useState<Sample[]>([]); const [cameraMode, setCameraMode] = useState<CameraMode>('orbit'); const [selected, setSelected] = useState<HotspotId | null>('ground'); const movementRef = useRef<Movement>({ forward: false, backward: false, left: false, right: false });
  const damage = useMemo(() => calculateDamage(settings), [settings]); const [level, description] = damageLevel(damage.score); const elapsed = samples.at(-1)?.t ?? 0; const visualScore = damage.score * clamp(elapsed / Math.max(4, settings.duration * .62), 0, 1); const finished = elapsed >= settings.duration - .15; const hotspot = selected ? HOTSPOTS[selected] : null;
  const update = <K extends keyof SimulatorSettings>(key: K, value: SimulatorSettings[K]) => setSettings((current) => ({ ...current, [key]: value }));
  const reset = useCallback(() => { setRunning(false); setSamples([]); setResetToken((value) => value + 1); }, []);
  const preset = (kind: 'soft' | 'strong' | 'extreme') => { reset(); if (kind === 'soft') setSettings({ ...INITIAL, intensity: 3.4, frequency: 1.1, duration: 14, vertical: 8, soil: 'rock', anchoring: 'reinforced' }); if (kind === 'strong') setSettings({ ...INITIAL, intensity: 7.1, frequency: 2.2, duration: 38, vertical: 34, soil: 'soft', condition: 'aged' }); if (kind === 'extreme') setSettings({ intensity: 9.2, frequency: 2.5, duration: 62, vertical: 58, soil: 'fill', condition: 'deficient', anchoring: 'poor', direction: 'multi' }); };
  const path = useMemo(() => samples.length < 2 ? '0,50 100,50' : samples.map((sample, index) => `${(index / Math.max(1, samples.length - 1) * 100).toFixed(2)},${(50 - sample.value * 34).toFixed(2)}`).join(' '), [samples]);
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section className="relative overflow-hidden border-b border-white/10"><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(250,204,21,.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,.08),transparent_26%)]" /><div className="relative mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-5"><div className="max-w-4xl"><Link href="/herramientas" className="mb-4 inline-flex rounded-full border border-yellow-300/30 bg-yellow-300/10 px-4 py-2 text-xs font-black uppercase tracking-[.22em] text-yellow-200">Soluciones Fabrick · Laboratorio 3D</Link><h1 className="text-4xl font-black tracking-tight sm:text-6xl">Simulador de movimiento <span className="text-yellow-300">telúrico</span></h1><p className="mt-4 max-w-3xl text-white/65 sm:text-lg">Modifica movimiento, suelo, estado y anclajes para observar una estimación visual de daño potencial.</p></div><div className="max-w-sm rounded-2xl border border-yellow-300/20 bg-black/55 p-4 text-sm leading-relaxed text-white/65 backdrop-blur-2xl"><b className="block text-yellow-300">Uso educativo</b>No equivale a magnitud Mw, PGA normativa ni evaluación estructural.</div></div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"><div className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl"><Canvas shadows dpr={[1, 1.7]} camera={{ position: [7.5, 4.6, 8.4], fov: 43 }}><Scene settings={settings} running={running} resetToken={resetToken} score={visualScore} cameraMode={cameraMode} selected={selected} movementRef={movementRef} onSelect={setSelected} onSample={(sample) => setSamples((current) => [...current.slice(-139), sample])} onComplete={() => setRunning(false)} /></Canvas>
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">{(['orbit', 'first', 'cinematic'] as CameraMode[]).map((mode) => <button key={mode} type="button" onClick={() => setCameraMode(mode)} className={`rounded-full border px-4 py-2 text-xs font-black uppercase backdrop-blur-xl ${cameraMode === mode ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/15 bg-black/60'}`}>{mode === 'orbit' ? '3ª persona' : mode === 'first' ? '1ª persona' : 'Cinemática'}</button>)}</div>
          <div className="absolute bottom-4 left-4 max-w-sm rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-xs text-white/65 backdrop-blur-2xl">{cameraMode === 'orbit' ? 'Arrastra para girar · rueda o pellizco para acercar.' : cameraMode === 'first' ? 'Haz clic para mirar · usa W A S D o los controles táctiles.' : 'Recorrido automático alrededor de la vivienda.'}</div>
          {cameraMode === 'first' && <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-2 sm:hidden"><span /><MoveButton label="▲" onChange={(active) => { movementRef.current.forward = active; }} /><span /><MoveButton label="◀" onChange={(active) => { movementRef.current.left = active; }} /><MoveButton label="▼" onChange={(active) => { movementRef.current.backward = active; }} /><MoveButton label="▶" onChange={(active) => { movementRef.current.right = active; }} /></div>}
        </div><aside className="rounded-[2rem] border border-white/10 bg-white/[.06] p-5 backdrop-blur-3xl"><div className="mb-5 flex justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Control sísmico</p><h2 className="text-2xl font-black">Configura el escenario</h2></div><span className="rounded-2xl bg-yellow-300 px-3 py-2 text-xl font-black text-black">{damage.score}</span></div>
          <div className="mb-5 grid grid-cols-3 gap-2">{(['soft', 'strong', 'extreme'] as const).map((kind) => <button key={kind} type="button" onClick={() => preset(kind)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black hover:border-yellow-300/60">{kind === 'soft' ? 'Suave' : kind === 'strong' ? 'Fuerte' : 'Extremo'}</button>)}</div>
          <div className="space-y-5"><Range label="Intensidad visual" value={settings.intensity} min={1} max={10} step={.1} suffix="/10" onChange={(value) => update('intensity', value)} /><Range label="Frecuencia dominante" value={settings.frequency} min={.4} max={4.5} step={.1} suffix=" Hz" onChange={(value) => update('frequency', value)} /><Range label="Duración" value={settings.duration} min={6} max={90} step={1} suffix=" s" onChange={(value) => update('duration', value)} /><Range label="Componente vertical" value={settings.vertical} min={0} max={80} step={1} suffix="%" onChange={(value) => update('vertical', value)} />
          <Select label="Tipo de suelo" value={settings.soil} onChange={(value) => update('soil', value as Soil)} options={[[ 'rock', 'Roca' ], [ 'firm', 'Terreno firme' ], [ 'soft', 'Suelo blando' ], [ 'fill', 'Relleno / alta amplificación' ]]} /><Select label="Estado de la vivienda" value={settings.condition} onChange={(value) => update('condition', value as Condition)} options={[[ 'new', 'Nueva / bien ejecutada' ], [ 'maintained', 'Mantenida' ], [ 'aged', 'Envejecida' ], [ 'deficient', 'Deficiencias visibles' ]]} /><Select label="Calidad de anclaje" value={settings.anchoring} onChange={(value) => update('anchoring', value as Anchoring)} options={[[ 'reinforced', 'Reforzado' ], [ 'standard', 'Estándar' ], [ 'poor', 'Deficiente' ]]} /><Select label="Dirección" value={settings.direction} onChange={(value) => update('direction', value as Direction)} options={[[ 'x', 'Eje longitudinal' ], [ 'z', 'Eje transversal' ], [ 'multi', 'Multidireccional' ]]} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => { if (finished) { reset(); setRunning(true); } else setRunning((value) => !value); }} className="rounded-2xl bg-yellow-300 px-4 py-3 font-black text-black">{running ? 'Pausar' : finished ? 'Repetir' : samples.length ? 'Continuar' : 'Iniciar'}</button><button type="button" onClick={reset} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-black">Reiniciar</button></div>
        </aside></div>
      </div></section>
      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8"><div className="space-y-5"><div className="rounded-2xl border border-white/10 bg-black/55 p-4"><div className="mb-3 flex justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Registro visual</p><h3 className="font-black">Forma del movimiento</h3></div><span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs font-black text-yellow-200">{elapsed.toFixed(1)} / {settings.duration}s</span></div><svg viewBox="0 0 100 100" className="h-28 w-full" aria-label="Registro visual del movimiento"><line x1="0" x2="100" y1="50" y2="50" stroke="rgba(255,255,255,.12)" /><polyline points={path} fill="none" stroke="#fde047" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Índice educativo" value={`${damage.score}/100`} detail={level} /><Metric label="Demanda relativa" value={`${damage.demand.toFixed(2)}×`} detail="Combinación de variables" /><Metric label="Resonancia relativa" value={`${resonanceFactor(settings.frequency).toFixed(2)}×`} detail="Frecuencia seleccionada" /><Metric label="Amplificación del suelo" value={`${soilFactor(settings.soil).toFixed(2)}×`} detail="Factor conceptual" /></div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[.045] p-6"><p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Daño potencial visual</p><h2 className="mt-1 text-3xl font-black">{level}</h2><p className="mt-2 text-white/60">{description}</p><div className="mt-6 grid gap-6 md:grid-cols-2"><DamageBar label="Terminaciones superficiales" value={damage.superficial} detail="Revestimientos, sellos y elementos livianos." /><DamageBar label="Daño no estructural" value={damage.nonStructural} detail="Tabiques, vidrios, cielos e instalaciones." /><DamageBar label="Daño estructural" value={damage.structural} detail="Elementos resistentes, uniones y deformaciones." /><DamageBar label="Condición crítica" value={damage.critical} detail="Pérdida severa de desempeño dentro del modelo educativo." /></div></div></div>
        <aside className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[.06] p-6"><p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Punto técnico seleccionado</p><h2 className="mt-2 text-2xl font-black">{hotspot?.title ?? 'Toca un aro de luz'}</h2><p className="mt-4 leading-relaxed text-white/68">{hotspot?.text ?? 'Selecciona un aro amarillo dentro de la escena.'}</p>{hotspot?.note && <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-black/40 p-4 text-sm text-yellow-100">{hotspot.note}</div>}<div className="mt-6 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/45">Soluciones Fabrick presenta esta experiencia como material informativo. La respuesta real depende de geometría, materiales, uniones, fundaciones, suelo, ejecución y normativa.</div></aside>
      </section>
    </main>
  );
}
