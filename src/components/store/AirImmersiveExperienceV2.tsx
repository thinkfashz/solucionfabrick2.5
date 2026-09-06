'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, RoundedBox } from '@react-three/drei';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import * as THREE from 'three';
import {
  ArrowLeft,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Fan,
  Gauge,
  Leaf,
  Move,
  Snowflake,
  Speaker,
  SpeakerX,
  Thermometer,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

type Capacity = 9000 | 12000 | 18000 | 24000;
type ClimateMode = 'frio' | 'ventilacion' | 'seco' | 'auto';
type MoveState = { forward: boolean; back: boolean; left: boolean; right: boolean };
type Panel = 'measure' | 'climate' | null;

type AirOption = {
  cap: Capacity;
  label: string;
  coverage: string;
  powerKw: number;
  width: number;
  energy: 'A++' | 'A+' | 'A' | 'B';
  energyColor: string;
  benefit: string;
};

const OPTIONS: AirOption[] = [
  { cap: 9000, label: '9.000 BTU', coverage: 'hasta 18 m²', powerKw: .82, width: 1.42, energy: 'A++', energyColor: '#5EE58C', benefit: 'Compacto y eficiente para dormitorios.' },
  { cap: 12000, label: '12.000 BTU', coverage: 'hasta 24 m²', powerKw: 1.08, width: 1.58, energy: 'A++', energyColor: '#5EE58C', benefit: 'Equilibrio ideal entre confort y consumo.' },
  { cap: 18000, label: '18.000 BTU', coverage: 'hasta 36 m²', powerKw: 1.58, width: 1.82, energy: 'A+', energyColor: '#A7E85B', benefit: 'Más caudal para espacios familiares.' },
  { cap: 24000, label: '24.000 BTU', coverage: 'hasta 48 m²', powerKw: 2.2, width: 2.08, energy: 'A', energyColor: '#F2D35E', benefit: 'Mayor capacidad para ambientes amplios.' },
];

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const ENERGY_REFERENCE = 263;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MODE_META: Record<ClimateMode, { label: string; color: string; factor: number }> = {
  frio: { label: 'Frío', color: '#72D9FF', factor: 1 },
  ventilacion: { label: 'Ventilación', color: '#DDF6FF', factor: .28 },
  seco: { label: 'Deshumidificar', color: '#70E6C7', factor: .66 },
  auto: { label: 'Auto', color: '#C8B4FF', factor: .82 },
};

function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-white/15 bg-[linear-gradient(145deg,rgba(17,18,21,.78),rgba(17,18,21,.43))] shadow-[0_24px_80px_rgba(0,0,0,.32)] backdrop-blur-2xl ${className}`}>{children}</div>;
}

function Field({ label, value, suffix, step = .1, onChange }: { label: string; value: number; suffix?: string; step?: number; onChange: (value: number) => void }) {
  return <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[.055] px-3.5 transition focus-within:border-[#F3A558]/45 focus-within:bg-white/[.075]">
    <span className="text-[9px] font-black uppercase tracking-[.13em] text-white/42">{label}</span>
    <span className="flex items-center gap-1.5"><input type="number" min={step} step={step} value={value} onChange={(event) => onChange(Math.max(step, Number(event.target.value) || step))} className="w-16 bg-transparent text-right text-base font-black tabular-nums text-white outline-none" />{suffix ? <small className="text-[9px] font-bold text-white/35">{suffix}</small> : null}</span>
  </label>;
}

function useFanAudio(enabled: boolean, speed: number, mode: ClimateMode, eco: boolean) {
  const nodes = useRef<{ ctx: AudioContext; gain: GainNode; filter: BiquadFilterNode; noise: AudioBufferSourceNode; hum: OscillatorNode } | null>(null);

  useEffect(() => {
    if (!enabled) {
      const current = nodes.current;
      if (current) {
        current.gain.gain.setTargetAtTime(0, current.ctx.currentTime, .12);
        window.setTimeout(() => {
          try { current.noise.stop(); current.hum.stop(); current.ctx.close(); } catch { /* noop */ }
        }, 250);
        nodes.current = null;
      }
      return;
    }

    const ctx = new AudioContext();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const noise = ctx.createBufferSource();
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * .22;
    noise.buffer = buffer;
    noise.loop = true;
    filter.type = 'lowpass';
    hum.type = 'sine';
    hum.frequency.value = 56;
    humGain.gain.value = .006;
    noise.connect(filter).connect(gain);
    hum.connect(humGain).connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0;
    noise.start();
    hum.start();
    ctx.resume().catch(() => undefined);
    nodes.current = { ctx, gain, filter, noise, hum };
    return () => {
      try { noise.stop(); hum.stop(); ctx.close(); } catch { /* noop */ }
      nodes.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const current = nodes.current;
    if (!current) return;
    const modeFactor = mode === 'ventilacion' ? .76 : mode === 'seco' ? .84 : 1;
    const target = (.008 + speed * .0045) * modeFactor * (eco ? .76 : 1);
    current.gain.gain.setTargetAtTime(target, current.ctx.currentTime, .16);
    current.filter.frequency.setTargetAtTime(540 + speed * 280, current.ctx.currentTime, .18);
    current.hum.frequency.setTargetAtTime(48 + speed * 4, current.ctx.currentTime, .2);
  }, [eco, mode, speed]);
}

function AirUnit({ option, temperature, mode, fanSpeed, eco, roomDepth, roomHeight }: { option: AirOption; temperature: number; mode: ClimateMode; fanSpeed: number; eco: boolean; roomDepth: number; roomHeight: number }) {
  const ref = useRef<THREE.Group>(null);
  const y = clamp(roomHeight * .77, 1.82, roomHeight - .34);
  const z = -roomDepth / 2 + .19;
  const airflowColor = MODE_META[mode].color;
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.elapsedTime * .72) * .008;
  });

  return <group ref={ref} position={[0, y, z]}>
    <RoundedBox args={[option.width, .42, .31]} radius={.09} smoothness={6} castShadow receiveShadow>
      <meshPhysicalMaterial color="#F8F5EF" roughness={.2} clearcoat={.55} clearcoatRoughness={.18} />
    </RoundedBox>
    <mesh position={[0, -.132, .168]} rotation={[.25, 0, 0]} castShadow><boxGeometry args={[option.width * .84, .075, .058]} /><meshStandardMaterial color="#1A1D20" roughness={.35} /></mesh>
    <mesh position={[option.width * .31, .035, .159]}><planeGeometry args={[option.width * .22, .105]} /><meshBasicMaterial color={airflowColor} transparent opacity={.82} /></mesh>
    <mesh position={[-option.width * .31, .035, .159]}><planeGeometry args={[option.width * .12, .05]} /><meshBasicMaterial color={eco ? '#66E08A' : temperature <= 20 ? '#78D9FF' : '#F6C174'} transparent opacity={.74} /></mesh>
    <pointLight position={[0, -.05, .35]} intensity={.22 + fanSpeed * .06} distance={1.7} color={airflowColor} />
    <Html transform position={[option.width / 2 + .42, .08, .05]} distanceFactor={1.6} style={{ pointerEvents: 'none' }}>
      <div className="w-[178px] rounded-2xl border border-white/18 bg-[rgba(14,16,18,.68)] p-3 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[.14em] text-white/40">Equipo seleccionado</span><span className="grid h-8 w-8 place-items-center rounded-full text-sm font-black" style={{ background: `${option.energyColor}22`, color: option.energyColor, border: `1px solid ${option.energyColor}55` }}>{option.energy}</span></div>
        <b className="mt-2 block text-lg tracking-[-.04em]">{option.label}</b>
        <span className="mt-1 block text-[9px] leading-4 text-white/46">{option.coverage}</span>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full" style={{ width: option.energy === 'A++' ? '92%' : option.energy === 'A+' ? '80%' : option.energy === 'A' ? '68%' : '52%', background: option.energyColor }} /></div>
        <p className="mt-2 text-[9px] leading-4 text-white/55">{option.benefit}</p>
        <small className="mt-2 block text-[7px] uppercase tracking-[.1em] text-white/25">Escala energética visual comparativa</small>
      </div>
    </Html>
  </group>;
}

function Airflow({ mode, fanSpeed, eco, roomDepth, roomHeight }: { mode: ClimateMode; fanSpeed: number; eco: boolean; roomDepth: number; roomHeight: number }) {
  const group = useRef<THREE.Group>(null);
  const color = MODE_META[mode].color;
  const count = 32;
  const startY = clamp(roomHeight * .72, 1.65, 2.35);
  const startZ = -roomDepth / 2 + .38;
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      const t = (clock.elapsedTime * (.13 + fanSpeed * .045) + index / count) % 1;
      const spread = ((index % 8) - 3.5) * .14 * (1 + t * .65);
      child.position.set(spread, startY - t * (.72 + fanSpeed * .08), startZ + t * Math.min(roomDepth * .52, 2.6));
      child.scale.setScalar(.58 + (1 - t) * .82);
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(Math.PI * t) * (.16 + fanSpeed * .035) * (eco ? .72 : 1);
    });
  });
  return <group ref={group}>{Array.from({ length: count }).map((_, index) => <mesh key={index}><sphereGeometry args={[.032, 10, 8]} /><meshBasicMaterial color={color} transparent opacity={.18} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>)}</group>;
}

function WindowWall({ roomWidth, roomDepth, roomHeight }: { roomWidth: number; roomDepth: number; roomHeight: number }) {
  const windowW = Math.min(1.8, roomDepth * .42);
  const windowH = Math.min(1.65, roomHeight * .62);
  return <group position={[-roomWidth / 2 + .065, roomHeight * .56, -.25]} rotation={[0, Math.PI / 2, 0]}>
    <mesh><boxGeometry args={[windowW + .16, windowH + .16, .08]} /><meshStandardMaterial color="#241E1A" roughness={.5} /></mesh>
    <mesh position={[0, 0, .05]}><planeGeometry args={[windowW, windowH]} /><meshPhysicalMaterial color="#9CC5D9" transmission={.72} transparent opacity={.48} roughness={.04} metalness={.02} /></mesh>
    <mesh position={[0, 0, .09]}><boxGeometry args={[.035, windowH, .02]} /><meshStandardMaterial color="#342A22" /></mesh>
    <mesh position={[0, 0, .09]}><boxGeometry args={[windowW, .035, .02]} /><meshStandardMaterial color="#342A22" /></mesh>
    <pointLight position={[0, .2, .7]} color="#FFD0A0" intensity={1.25} distance={4.6} />
  </group>;
}

function DynamicRoom({ roomWidth, roomDepth, roomHeight, option, temperature, mode, fanSpeed, eco }: { roomWidth: number; roomDepth: number; roomHeight: number; option: AirOption; temperature: number; mode: ClimateMode; fanSpeed: number; eco: boolean }) {
  const bedWidth = Math.min(2.45, roomWidth * .62);
  const bedDepth = Math.min(1.95, roomDepth * .48);
  const slabThickness = .14;
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[roomWidth, roomDepth]} /><meshPhysicalMaterial color="#7B5B42" roughness={.68} metalness={.02} /></mesh>
    <mesh position={[0, roomHeight + slabThickness / 2, 0]} receiveShadow><boxGeometry args={[roomWidth + .18, slabThickness, roomDepth + .18]} /><meshPhysicalMaterial color="#DED5C7" roughness={.92} /></mesh>
    <mesh position={[0, roomHeight / 2, -roomDepth / 2]} receiveShadow><boxGeometry args={[roomWidth, roomHeight, .12]} /><meshPhysicalMaterial color="#B5A99D" roughness={.93} /></mesh>
    <mesh position={[-roomWidth / 2, roomHeight / 2, 0]} receiveShadow><boxGeometry args={[.12, roomHeight, roomDepth]} /><meshPhysicalMaterial color="#D9D1C6" roughness={.92} /></mesh>
    <mesh position={[roomWidth / 2, roomHeight / 2, 0]} receiveShadow><boxGeometry args={[.12, roomHeight, roomDepth]} /><meshPhysicalMaterial color="#493328" roughness={.8} /></mesh>
    <WindowWall roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} />

    <group position={[0, .5, -roomDepth / 2 + bedDepth / 2 + .42]}>
      <RoundedBox args={[bedWidth, .38, bedDepth]} radius={.11} smoothness={5} castShadow receiveShadow><meshPhysicalMaterial color="#88766A" roughness={.91} /></RoundedBox>
      <RoundedBox args={[bedWidth * .97, .25, bedDepth * .96]} radius={.09} smoothness={5} position={[0, .28, 0]} castShadow><meshPhysicalMaterial color="#E2DBD0" roughness={.98} /></RoundedBox>
      <mesh position={[0, .72, -bedDepth * .46]} castShadow><boxGeometry args={[bedWidth, .86, .14]} /><meshPhysicalMaterial color="#655A52" roughness={.9} /></mesh>
      {[-.32, .32].map((p) => <RoundedBox key={p} args={[bedWidth * .34, .36, .2]} radius={.07} smoothness={4} position={[p * bedWidth, .73, -bedDepth * .39]} castShadow><meshPhysicalMaterial color="#EEE7DC" roughness={.98} /></RoundedBox>)}
      <RoundedBox args={[bedWidth * .3, .25, .16]} radius={.06} smoothness={4} position={[0, .73, -bedDepth * .28]}><meshPhysicalMaterial color="#A16E48" roughness={.9} /></RoundedBox>
    </group>

    <group position={[Math.min(roomWidth / 2 - .55, 1.9), .42, -roomDepth / 2 + .7]}>
      <RoundedBox args={[.66, .56, .58]} radius={.06} smoothness={4} castShadow><meshPhysicalMaterial color="#573A2B" roughness={.78} /></RoundedBox>
      <mesh position={[0, .53, 0]}><cylinderGeometry args={[.14, .2, .28, 24]} /><meshPhysicalMaterial color="#CBB89B" roughness={.75} /></mesh>
      <pointLight position={[0, .78, 0]} color="#FFB86D" intensity={1.4} distance={3.4} />
    </group>

    <group position={[-Math.min(roomWidth / 2 - .56, 1.9), .42, -roomDepth / 2 + .7]}>
      <RoundedBox args={[.66, .56, .58]} radius={.06} smoothness={4} castShadow><meshPhysicalMaterial color="#4D382D" roughness={.8} /></RoundedBox>
      <mesh position={[0, .53, 0]}><cylinderGeometry args={[.14, .2, .28, 24]} /><meshPhysicalMaterial color="#CBB89B" roughness={.75} /></mesh>
      <pointLight position={[0, .78, 0]} color="#FFCB88" intensity={1.1} distance={3.2} />
    </group>

    <AirUnit option={option} temperature={temperature} mode={mode} fanSpeed={fanSpeed} eco={eco} roomDepth={roomDepth} roomHeight={roomHeight} />
    <Airflow mode={mode} fanSpeed={fanSpeed} eco={eco} roomDepth={roomDepth} roomHeight={roomHeight} />

    <hemisphereLight args={['#FFD8B2', '#5A4335', 1.08]} />
    <directionalLight position={[-roomWidth * .6, roomHeight + 2.4, roomDepth * .4]} intensity={2.25} color="#FFD4A3" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <spotLight position={[roomWidth * .25, roomHeight - .12, .25]} target-position={[0, .2, -1]} intensity={2.1} angle={.55} penumbra={.8} color="#FFBC74" castShadow />
    <spotLight position={[-roomWidth * .22, roomHeight - .12, 1]} target-position={[0, .3, -1]} intensity={1.45} angle={.62} penumbra={.9} color="#FFE0B5" />
    <ContactShadows position={[0, .015, 0]} opacity={.38} scale={Math.max(roomWidth, roomDepth)} blur={2.7} far={roomHeight + 1} />
  </group>;
}

function FirstPerson({ move, roomWidth, roomDepth, roomHeight }: { move: MoveState; roomWidth: number; roomDepth: number; roomHeight: number }) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-.05);
  const drag = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const eyeHeight = clamp(roomHeight * .62, 1.45, 1.72);

  useEffect(() => {
    camera.position.set(0, eyeHeight, Math.max(.8, roomDepth / 2 - .6));
    camera.rotation.order = 'YXZ';
    const canvas = gl.domElement;
    const kd = (e: KeyboardEvent) => keys.current.add(e.code);
    const ku = (e: KeyboardEvent) => keys.current.delete(e.code);
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') canvas.requestPointerLock?.();
      else { drag.current = true; last.current = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); }
    };
    const up = () => { drag.current = false; };
    const look = (e: PointerEvent) => {
      const locked = document.pointerLockElement === canvas;
      if (!locked && !drag.current) return;
      const dx = locked ? e.movementX : e.clientX - last.current.x;
      const dy = locked ? e.movementY : e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * .0022;
      pitch.current = clamp(pitch.current - dy * .0018, -1.08, 1);
    };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointermove', look);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('pointermove', look); };
  }, [camera, eyeHeight, gl]);

  useFrame((_, delta) => {
    camera.rotation.y = yaw.current; camera.rotation.x = pitch.current;
    const speed = Math.min(delta, .05) * 2.05;
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
    const z = (keys.current.has('KeyW') || move.forward ? 1 : 0) - (keys.current.has('KeyS') || move.back ? 1 : 0);
    const x = (keys.current.has('KeyD') || move.right ? 1 : 0) - (keys.current.has('KeyA') || move.left ? 1 : 0);
    camera.position.addScaledVector(forward, z * speed); camera.position.addScaledVector(right, x * speed);
    camera.position.x = clamp(camera.position.x, -roomWidth / 2 + .38, roomWidth / 2 - .38);
    camera.position.z = clamp(camera.position.z, -roomDepth / 2 + .52, roomDepth / 2 - .42);
    camera.position.y = eyeHeight;
  });
  return null;
}

function XR() {
  const { gl } = useThree();
  useEffect(() => {
    gl.xr.enabled = true;
    const xr = (navigator as Navigator & { xr?: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr;
    if (!xr) return;
    let button: HTMLElement | null = null;
    let alive = true;
    xr.isSessionSupported('immersive-vr').then((supported) => {
      if (!supported || !alive) return;
      const slot = document.getElementById('fabrick-vr-entry-v2');
      if (!slot) return;
      button = VRButton.createButton(gl); button.textContent = 'Entrar VR';
      Object.assign(button.style, { position: 'static', width: '100%', height: '42px', border: '1px solid rgba(255,255,255,.16)', borderRadius: '999px', background: 'rgba(15,16,19,.6)', color: '#fff', font: '800 10px Manrope,sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', backdropFilter: 'blur(18px)' });
      slot.replaceChildren(button);
    }).catch(() => undefined);
    return () => { alive = false; if (button?.parentNode) button.parentNode.removeChild(button); };
  }, [gl]);
  return null;
}

function MovePad({ move, setMove }: { move: MoveState; setMove: React.Dispatch<React.SetStateAction<MoveState>> }) {
  const press = (key: keyof MoveState, value: boolean) => setMove((s) => ({ ...s, [key]: value }));
  const b = (key: keyof MoveState, label: string, col: string, row: string) => <button onPointerDown={() => press(key, true)} onPointerUp={() => press(key, false)} onPointerCancel={() => press(key, false)} onPointerLeave={() => press(key, false)} className={`${col} ${row} grid place-items-center rounded-full bg-white/9 text-white/74 active:bg-[#F5871F] active:text-black`}>{label}</button>;
  return <div className="pointer-events-auto absolute bottom-[130px] left-3 z-40 grid h-[108px] w-[108px] grid-cols-3 grid-rows-3 gap-1 rounded-full border border-white/12 bg-black/32 p-2 backdrop-blur-xl md:hidden">
    {b('forward', '↑', 'col-start-2', 'row-start-1')}{b('left', '←', 'col-start-1', 'row-start-2')}<span className="col-start-2 row-start-2 grid place-items-center"><Move className="h-4 w-4 text-white/25" /></span>{b('right', '→', 'col-start-3', 'row-start-2')}{b('back', '↓', 'col-start-2', 'row-start-3')}
  </div>;
}

function Intro({ step }: { step: number }) {
  const items = [
    { icon: <Calculator className="h-5 w-5" />, title: 'Mide tu habitación', text: 'Largo, ancho y alto reconstruyen el espacio 3D.' },
    { icon: <Snowflake className="h-5 w-5" />, title: 'Compara capacidades', text: 'El split cambia de tamaño y eficiencia según los BTU.' },
    { icon: <Wind className="h-5 w-5" />, title: 'Simula el clima', text: 'Temperatura, velocidad, ahorro y flujo reaccionan en vivo.' },
  ];
  const current = items[Math.min(step, 2)];
  return <div className="absolute inset-0 z-[100] grid place-items-center bg-[#090A0C] px-5 text-white">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(245,135,31,.18),transparent_38%)]" />
    <div className="relative w-full max-w-md text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.4rem] border border-[#F5B76F]/25 bg-[#F5871F]/12 text-[#F5B76F] shadow-[0_0_60px_rgba(245,135,31,.16)]">{current.icon}</div>
      <small className="mt-5 block text-[9px] font-black uppercase tracking-[.22em] text-[#F5B76F]">Calculadora 3D Fabrick</small>
      <h1 className="mt-2 text-2xl font-black tracking-[-.05em] sm:text-3xl">{current.title}</h1>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-white/46">{current.text}</p>
      <div className="mx-auto mt-7 h-1 w-[220px] overflow-hidden rounded-full bg-white/8"><div className="h-full animate-[introbar_3s_linear_forwards] rounded-full bg-gradient-to-r from-[#F5871F] via-[#F5B76F] to-[#75DE9A]" /></div>
      <div className="mt-4 flex justify-center gap-2">{items.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all duration-300 ${index === step ? 'w-7 bg-[#F5B76F]' : 'w-1.5 bg-white/18'}`} />)}</div>
    </div>
    <style>{`@keyframes introbar{from{width:0}to{width:100%}}`}</style>
  </div>;
}

export default function AirImmersiveExperienceV2() {
  const router = useRouter();
  const [length, setLength] = useState(4.8);
  const [width, setWidth] = useState(3.8);
  const [height, setHeight] = useState(2.55);
  const [people, setPeople] = useState(2);
  const [selectedCap, setSelectedCap] = useState<Capacity>(12000);
  const [temperature, setTemperature] = useState(22);
  const [fanSpeed, setFanSpeed] = useState(2);
  const [mode, setMode] = useState<ClimateMode>('frio');
  const [eco, setEco] = useState(true);
  const [sound, setSound] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [move, setMove] = useState<MoveState>({ forward: false, back: false, left: false, right: false });
  const [intro, setIntro] = useState(true);
  const [introStep, setIntroStep] = useState(0);

  useFanAudio(sound, fanSpeed, mode, eco);

  useEffect(() => {
    const step1 = window.setTimeout(() => setIntroStep(1), 1000);
    const step2 = window.setTimeout(() => setIntroStep(2), 2000);
    const done = window.setTimeout(() => setIntro(false), 3000);
    return () => { window.clearTimeout(step1); window.clearTimeout(step2); window.clearTimeout(done); };
  }, []);

  const calc = useMemo(() => {
    const area = length * width;
    const volume = area * height;
    const requiredBtu = Math.ceil(area * 600 + volume * 55 + people * 600 + 350 * 3.412);
    const recommended = (OPTIONS.find((item) => item.cap >= requiredBtu)?.cap || 24000) as Capacity;
    const option = OPTIONS.find((item) => item.cap === selectedCap) || OPTIONS[1];
    const tempFactor = temperature <= 18 ? .82 : temperature <= 20 ? .68 : temperature <= 22 ? .56 : temperature <= 24 ? .46 : .38;
    const fanFactor = .88 + fanSpeed * .04;
    const modeFactor = MODE_META[mode].factor;
    const ecoFactor = eco ? .78 : 1;
    const monthlyKwh = option.powerKw * tempFactor * fanFactor * modeFactor * ecoFactor * 4 * 30;
    const monthlyCost = Math.round(monthlyKwh * ENERGY_REFERENCE);
    return { area, volume, requiredBtu, recommended, option, monthlyKwh, monthlyCost };
  }, [eco, fanSpeed, height, length, mode, people, selectedCap, temperature, width]);

  useEffect(() => { setSelectedCap(calc.recommended); }, [calc.recommended]);

  const roomWidth = clamp(width, 2.4, 7);
  const roomDepth = clamp(length, 2.6, 8);
  const roomHeight = clamp(height, 2.1, 3.5);

  const shift = (direction: -1 | 1) => {
    const index = OPTIONS.findIndex((item) => item.cap === selectedCap);
    setSelectedCap(OPTIONS[(index + direction + OPTIONS.length) % OPTIONS.length].cap);
  };

  const modes: ClimateMode[] = ['frio', 'ventilacion', 'seco', 'auto'];

  return <main className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#111214] text-white">
    {intro ? <Intro step={introStep} /> : null}

    <div className="absolute inset-0">
      <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 58, near: .05, far: 50 }} gl={{ antialias: true, alpha: false }} onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.18; gl.outputColorSpace = THREE.SRGBColorSpace;
      }}>
        <color attach="background" args={['#171411']} />
        <DynamicRoom roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} option={calc.option} temperature={temperature} mode={mode} fanSpeed={fanSpeed} eco={eco} />
        <FirstPerson move={move} roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} />
        <XR />
      </Canvas>
    </div>
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,.42),transparent_24%,transparent_64%,rgba(5,6,8,.7))]" />

    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-3 p-3 sm:p-5">
      <div className="pointer-events-auto flex items-center gap-2">
        <button onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/38 backdrop-blur-xl" aria-label="Volver"><ArrowLeft className="h-4 w-4" /></button>
        <Glass className="rounded-full px-4 py-2.5"><small className="block text-[8px] font-black uppercase tracking-[.18em] text-[#F5B76F]">Fabrick Climate World</small><b className="block text-[11px]">{numText(calc.area)} m² · {integer.format(calc.requiredBtu)} BTU</b></Glass>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <button onClick={() => setSound((value) => !value)} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${sound ? 'border-[#75DE9A]/40 bg-[#75DE9A]/15 text-[#75DE9A]' : 'border-white/14 bg-black/38 text-white/70'}`} aria-label="Sonido ambiental">{sound ? <Speaker className="h-4 w-4" /> : <SpeakerX className="h-4 w-4" />}</button>
        <div id="fabrick-vr-entry-v2" className="hidden min-w-[120px] sm:block" />
      </div>
    </header>

    <aside className="pointer-events-none absolute left-5 top-1/2 z-30 hidden w-[305px] -translate-y-1/2 lg:block">
      <Glass className="pointer-events-auto rounded-[2rem] p-4">
        <div className="mb-3 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F5871F] text-black"><Calculator className="h-5 w-5" /></span><div><b className="block text-sm">Construye tu habitación</b><small className="text-[9px] text-white/35">El mundo cambia con tus medidas</small></div></div>
        <div className="space-y-2"><Field label="Largo" value={length} suffix="m" onChange={setLength} /><Field label="Ancho" value={width} suffix="m" onChange={setWidth} /><Field label="Alto" value={height} suffix="m" onChange={setHeight} /><Field label="Personas" value={people} step={1} onChange={setPeople} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white/6 p-3"><small className="text-[8px] uppercase text-white/35">Superficie</small><b className="mt-1 block text-xl">{numText(calc.area)} m²</b></div><div className="rounded-2xl bg-[#F5871F] p-3 text-black"><small className="text-[8px] uppercase text-black/45">Recomendado</small><b className="mt-1 block text-xl">{integer.format(calc.recommended)}</b><span className="text-[8px] font-black"> BTU</span></div></div>
      </Glass>
    </aside>

    <aside className="pointer-events-none absolute right-5 top-1/2 z-30 hidden w-[292px] -translate-y-1/2 lg:block">
      <ClimatePanel temperature={temperature} setTemperature={setTemperature} fanSpeed={fanSpeed} setFanSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} monthlyKwh={calc.monthlyKwh} monthlyCost={calc.monthlyCost} />
    </aside>

    <div className="pointer-events-auto absolute right-3 top-[74px] z-40 flex gap-2 lg:hidden">
      <button onClick={() => setPanel(panel === 'measure' ? null : 'measure')} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${panel === 'measure' ? 'border-[#F5B76F]/50 bg-[#F5871F]/18 text-[#F5B76F]' : 'border-white/14 bg-black/38'}`}><Calculator className="h-4 w-4" /></button>
      <button onClick={() => setPanel(panel === 'climate' ? null : 'climate')} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${panel === 'climate' ? 'border-[#72D9FF]/45 bg-[#72D9FF]/12 text-[#72D9FF]' : 'border-white/14 bg-black/38'}`}><Thermometer className="h-4 w-4" /></button>
    </div>

    {panel ? <div className="pointer-events-auto absolute inset-x-3 top-[132px] z-50 lg:hidden">
      <Glass className="mx-auto max-w-md rounded-[1.75rem] p-4"><div className="mb-3 flex items-center justify-between"><b className="text-sm">{panel === 'measure' ? 'Medidas de tu habitación' : 'Control de clima'}</b><button onClick={() => setPanel(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/7"><X className="h-4 w-4" /></button></div>
        {panel === 'measure' ? <><div className="grid grid-cols-2 gap-2"><Field label="Largo" value={length} suffix="m" onChange={setLength} /><Field label="Ancho" value={width} suffix="m" onChange={setWidth} /><Field label="Alto" value={height} suffix="m" onChange={setHeight} /><Field label="Personas" value={people} step={1} onChange={setPeople} /></div><div className="mt-3 flex items-center justify-between rounded-2xl bg-[#F5871F] px-4 py-3 text-black"><span className="text-[9px] font-black uppercase">Resultado</span><b>{numText(calc.area)} m² · {integer.format(calc.recommended)} BTU</b></div></> : <ClimatePanel compact temperature={temperature} setTemperature={setTemperature} fanSpeed={fanSpeed} setFanSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} monthlyKwh={calc.monthlyKwh} monthlyCost={calc.monthlyCost} />}
      </Glass>
    </div> : null}

    <MovePad move={move} setMove={setMove} />

    <section className="pointer-events-none absolute inset-x-0 bottom-4 z-40 flex justify-center px-3 sm:bottom-6">
      <Glass className="pointer-events-auto w-full max-w-[820px] rounded-[2rem] p-2.5">
        <div className="flex items-center gap-2"><button onClick={() => shift(-1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/7"><ChevronLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-w-max gap-2">{OPTIONS.map((option) => {
            const selected = option.cap === selectedCap; const ideal = option.cap === calc.recommended;
            return <button key={option.cap} onClick={() => setSelectedCap(option.cap)} className={`relative min-w-[126px] rounded-[1.2rem] border px-3 py-3 text-left transition sm:min-w-[150px] ${selected ? 'border-[#F7B260]/70 bg-[#F5871F] text-black shadow-[0_0_30px_rgba(245,135,31,.2)]' : 'border-white/8 bg-white/[.055] text-white'}`}>
              <div className="flex items-center justify-between gap-2"><small className={`text-[8px] font-black uppercase tracking-[.1em] ${selected ? 'text-black/45' : 'text-white/32'}`}>{ideal ? 'Ideal para ti' : option.coverage}</small><span className="grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[8px] font-black" style={{ background: `${option.energyColor}22`, color: selected ? '#111' : option.energyColor, border: `1px solid ${selected ? 'rgba(0,0,0,.18)' : option.energyColor + '55'}` }}>{option.energy}</span></div>
              <b className="mt-1 block text-base sm:text-lg">{option.label}</b><div className="mt-2 flex h-1 overflow-hidden rounded-full bg-black/10">{['#5EE58C','#A7E85B','#F2D35E','#F2A65E','#E66B63'].map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</div>
            </button>;
          })}</div></div>
          <button onClick={() => shift(1)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/7"><ChevronRight className="h-5 w-5" /></button></div>
      </Glass>
    </section>

    <div className="pointer-events-none absolute left-1/2 top-[86px] z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/28 px-3 py-2 text-[8px] font-black uppercase tracking-[.14em] text-white/45 backdrop-blur-xl"><span className="inline-flex items-center gap-2"><Snowflake className="h-3.5 w-3.5 text-[#F5B76F]" />Arrastra para mirar · el cuarto responde a tus medidas</span></div>
  </main>;
}

function ClimatePanel({ compact = false, temperature, setTemperature, fanSpeed, setFanSpeed, mode, setMode, eco, setEco, sound, setSound, monthlyKwh, monthlyCost }: {
  compact?: boolean; temperature: number; setTemperature: (v: number) => void; fanSpeed: number; setFanSpeed: (v: number) => void; mode: ClimateMode; setMode: (v: ClimateMode) => void; eco: boolean; setEco: (v: boolean) => void; sound: boolean; setSound: (v: boolean) => void; monthlyKwh: number; monthlyCost: number;
}) {
  const body = <div className="space-y-3">
    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-[#F5B76F]" /><b className="text-sm">Control de clima</b></div><b className="text-3xl tracking-[-.06em]">{temperature}°</b></div>
    <input type="range" min={16} max={28} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-[#F5871F]" />
    <div><small className="text-[8px] font-black uppercase tracking-[.13em] text-white/35">Modo</small><div className="mt-2 grid grid-cols-4 gap-1.5">{(['frio','ventilacion','seco','auto'] as ClimateMode[]).map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded-xl border px-1 py-2 text-[8px] font-black transition ${mode === item ? 'border-white/25 bg-white/12 text-white' : 'border-white/6 bg-white/[.035] text-white/38'}`} style={mode === item ? { boxShadow: `inset 0 -2px ${MODE_META[item].color}` } : undefined}>{MODE_META[item].label}</button>)}</div></div>
    <div><small className="text-[8px] font-black uppercase tracking-[.13em] text-white/35">Velocidad ventilador</small><div className="mt-2 grid grid-cols-4 gap-1.5">{[1,2,3,4].map((value) => <button key={value} onClick={() => setFanSpeed(value)} className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[9px] font-black ${fanSpeed === value ? 'border-[#72D9FF]/40 bg-[#72D9FF]/12 text-[#72D9FF]' : 'border-white/6 bg-white/[.035] text-white/38'}`}><Fan className="h-3 w-3" />{value}</button>)}</div></div>
    <div className="grid grid-cols-2 gap-2"><button onClick={() => setEco(!eco)} className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black ${eco ? 'border-[#75DE9A]/35 bg-[#75DE9A]/12 text-[#75DE9A]' : 'border-white/7 bg-white/[.035] text-white/40'}`}><Leaf className="h-3.5 w-3.5" />Ahorro {eco ? 'ON' : 'OFF'}</button><button onClick={() => setSound(!sound)} className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[9px] font-black ${sound ? 'border-[#F5B76F]/35 bg-[#F5B76F]/10 text-[#F5B76F]' : 'border-white/7 bg-white/[.035] text-white/40'}`}>{sound ? <Speaker className="h-3.5 w-3.5" /> : <SpeakerX className="h-3.5 w-3.5" />}Sonido</button></div>
    <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/6 p-3"><small className="text-[8px] uppercase text-white/35">Consumo</small><b className="mt-1 block text-lg">{Math.round(monthlyKwh)} kWh</b></div><div className="rounded-xl bg-white/6 p-3"><small className="text-[8px] uppercase text-white/35">Estimado</small><b className="mt-1 block text-lg">{money.format(monthlyCost)}</b></div></div>
  </div>;
  return compact ? body : <Glass className="pointer-events-auto rounded-[1.8rem] p-4">{body}</Glass>;
}

function numText(value: number) { return value.toLocaleString('es-CL', { maximumFractionDigits: 1 }); }
