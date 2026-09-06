'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type ReactNode, type SetStateAction } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArrowLeft, Calculator, ChevronLeft, ChevronRight, Fan, Gamepad2, Leaf, Move, Speaker, Thermometer, VolumeX, Wind, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

type Capacity = 9000 | 12000 | 18000 | 24000;
type ClimateMode = 'frio' | 'ventilacion' | 'seco' | 'auto';
type MoveState = { forward: boolean; back: boolean; left: boolean; right: boolean };
type Panel = 'measure' | 'climate' | null;
type AirOption = { cap: Capacity; label: string; coverage: string; powerKw: number; width: number; energy: 'A++' | 'A+' | 'A'; energyColor: string; benefit: string };

const OPTIONS: AirOption[] = [
  { cap: 9000, label: '9.000 BTU', coverage: 'hasta 18 m²', powerKw: .82, width: 1.22, energy: 'A++', energyColor: '#5EE58C', benefit: 'Eficiente' },
  { cap: 12000, label: '12.000 BTU', coverage: 'hasta 24 m²', powerKw: 1.08, width: 1.38, energy: 'A++', energyColor: '#5EE58C', benefit: 'Equilibrado' },
  { cap: 18000, label: '18.000 BTU', coverage: 'hasta 36 m²', powerKw: 1.58, width: 1.62, energy: 'A+', energyColor: '#A7E85B', benefit: 'Más potente' },
  { cap: 24000, label: '24.000 BTU', coverage: 'hasta 48 m²', powerKw: 2.2, width: 1.86, energy: 'A', energyColor: '#F2D35E', benefit: 'Máximo confort' },
];

const MODE_META: Record<ClimateMode, { label: string; color: string; factor: number }> = {
  frio: { label: 'Frío', color: '#71CFFF', factor: 1 },
  ventilacion: { label: 'Vent.', color: '#DDEEFF', factor: .3 },
  seco: { label: 'Deshum.', color: '#69D7BD', factor: .66 },
  auto: { label: 'Auto', color: '#BBA7EF', factor: .82 },
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const numText = (value: number) => value.toLocaleString('es-CL', { maximumFractionDigits: 1 });

function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-white/14 bg-[linear-gradient(145deg,rgba(14,15,18,.82),rgba(14,15,18,.5))] shadow-[0_24px_70px_rgba(0,0,0,.36)] backdrop-blur-2xl ${className}`}>{children}</div>;
}

function Field({ label, value, suffix, step = .1, onChange }: { label: string; value: number; suffix?: string; step?: number; onChange: (value: number) => void }) {
  return <label className="flex min-h-11 items-center justify-between rounded-xl border border-white/8 bg-white/[.055] px-3 focus-within:border-[#F0A25B]/45">
    <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/45">{label}</span>
    <span className="flex items-center gap-1.5"><input type="number" min={step} step={step} value={value} onChange={(event) => onChange(Math.max(step, Number(event.target.value) || step))} className="w-14 bg-transparent text-right text-sm font-black tabular-nums text-white outline-none" />{suffix ? <small className="text-[9px] font-bold text-white/35">{suffix}</small> : null}</span>
  </label>;
}

function useFanAudio(enabled: boolean, speed: number, mode: ClimateMode, eco: boolean) {
  const nodes = useRef<{ ctx: AudioContext; gain: GainNode; filter: BiquadFilterNode; noise: AudioBufferSourceNode; hum: OscillatorNode } | null>(null);
  useEffect(() => {
    if (!enabled) {
      const current = nodes.current;
      if (current) { current.gain.gain.setTargetAtTime(0, current.ctx.currentTime, .1); window.setTimeout(() => { try { current.noise.stop(); current.hum.stop(); current.ctx.close(); } catch { /* noop */ } }, 180); nodes.current = null; }
      return;
    }
    const ctx = new AudioContext(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter(); const noise = ctx.createBufferSource(); const hum = ctx.createOscillator(); const humGain = ctx.createGain();
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * .18;
    noise.buffer = buffer; noise.loop = true; filter.type = 'lowpass'; hum.type = 'sine'; hum.frequency.value = 52; humGain.gain.value = .004;
    noise.connect(filter).connect(gain); hum.connect(humGain).connect(gain); gain.connect(ctx.destination); gain.gain.value = 0; noise.start(); hum.start(); ctx.resume().catch(() => undefined); nodes.current = { ctx, gain, filter, noise, hum };
    return () => { try { noise.stop(); hum.stop(); ctx.close(); } catch { /* noop */ } nodes.current = null; };
  }, [enabled]);
  useEffect(() => { const n = nodes.current; if (!n) return; const modeFactor = mode === 'ventilacion' ? .7 : mode === 'seco' ? .82 : 1; n.gain.gain.setTargetAtTime((.006 + speed * .0032) * modeFactor * (eco ? .72 : 1), n.ctx.currentTime, .14); n.filter.frequency.setTargetAtTime(480 + speed * 260, n.ctx.currentTime, .14); }, [eco, mode, speed]);
}

function makeTexture(kind: 'wood' | 'wall' | 'fabric' | 'rug', size = 192) {
  const data = new Uint8Array(size * size * 4);
  const palette = kind === 'wood' ? [95, 58, 36] : kind === 'wall' ? [158, 145, 132] : kind === 'fabric' ? [201, 190, 175] : [115, 101, 85];
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const i = (y * size + x) * 4; const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; const noise = n - Math.floor(n); const grain = kind === 'wood' ? Math.sin(x * .32 + noise) * 17 : kind === 'rug' ? Math.sin((x + y) * .8) * 7 : 0; const v = (noise - .5) * 18 + grain;
    data[i] = clamp(palette[0] + v, 0, 255); data[i + 1] = clamp(palette[1] + v, 0, 255); data[i + 2] = clamp(palette[2] + v, 0, 255); data[i + 3] = 255;
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat); map.needsUpdate = true; map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4; return map;
}

function useRoomTextures() { return useMemo(() => ({ wood: makeTexture('wood'), wall: makeTexture('wall'), fabric: makeTexture('fabric'), rug: makeTexture('rug') }), []); }

function EnvironmentLite() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl); const env = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environment = env; scene.environmentIntensity = .32;
    return () => { scene.environment = null; env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
}

function Sunset({ roomWidth, roomDepth, roomHeight }: { roomWidth: number; roomDepth: number; roomHeight: number }) {
  return <group position={[-roomWidth / 2 - .8, roomHeight * .58, 0]} rotation={[0, Math.PI / 2, 0]}>
    <mesh><planeGeometry args={[roomDepth * 1.45, roomHeight * 1.35]} /><meshBasicMaterial color="#B5633A" toneMapped /></mesh>
    <mesh position={[0, roomHeight * .1, .02]}><circleGeometry args={[.34, 32]} /><meshBasicMaterial color="#ECA767" toneMapped /></mesh>
    <pointLight position={[0, .2, .55]} color="#E89A61" intensity={.45} distance={5.5} decay={2} />
  </group>;
}

function Window({ roomWidth, roomDepth, roomHeight }: { roomWidth: number; roomDepth: number; roomHeight: number }) {
  const span = Math.min(roomDepth * .54, 3); const h = Math.min(roomHeight * .62, 1.75); const y = .5 + h / 2;
  return <group>
    <mesh position={[-roomWidth / 2, .23, 0]}><boxGeometry args={[.12, .46, roomDepth]} /><meshStandardMaterial color="#B7AA9D" roughness={.9} /></mesh>
    <mesh position={[-roomWidth / 2, y, -(span / 2 + (roomDepth - span) / 4)]}><boxGeometry args={[.12, h, Math.max(.2, (roomDepth - span) / 2)]} /><meshStandardMaterial color="#B7AA9D" roughness={.9} /></mesh>
    <mesh position={[-roomWidth / 2, y, span / 2 + (roomDepth - span) / 4]}><boxGeometry args={[.12, h, Math.max(.2, (roomDepth - span) / 2)]} /><meshStandardMaterial color="#B7AA9D" roughness={.9} /></mesh>
    <group position={[-roomWidth / 2 + .065, y, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh><planeGeometry args={[span, h]} /><meshPhysicalMaterial color="#6E8F9E" transmission={.62} transparent opacity={.28} roughness={.08} thickness={.018} /></mesh>
      {[-.33, .33].map((x) => <mesh key={x} position={[span * x, 0, .02]}><boxGeometry args={[.035, h, .03]} /><meshStandardMaterial color="#282523" metalness={.3} roughness={.42} /></mesh>)}
    </group>
    <Sunset roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} />
  </group>;
}

function AirUnit({ option, mode, fanSpeed, roomDepth, roomHeight }: { option: AirOption; mode: ClimateMode; fanSpeed: number; roomDepth: number; roomHeight: number }) {
  const y = clamp(roomHeight * .76, 1.82, roomHeight - .35); const z = -roomDepth / 2 + .2; const color = MODE_META[mode].color;
  return <group position={[0, y, z]}>
    <RoundedBox args={[option.width, .38, .29]} radius={.08} smoothness={6} castShadow><meshPhysicalMaterial color="#E9E6DF" roughness={.24} clearcoat={.28} clearcoatRoughness={.25} envMapIntensity={.45} /></RoundedBox>
    <mesh position={[0, -.122, .16]} rotation={[.2, 0, 0]}><boxGeometry args={[option.width * .82, .067, .05]} /><meshStandardMaterial color="#17191C" roughness={.34} /></mesh>
    <mesh position={[option.width * .28, .025, .152]}><planeGeometry args={[option.width * .18, .065]} /><meshBasicMaterial color={color} transparent opacity={.72} toneMapped /></mesh>
    <pointLight position={[0, -.02, .28]} intensity={.08 + fanSpeed * .025} distance={1.4} color={color} />
    <Html transform position={[option.width / 2 + .34, .08, .02]} distanceFactor={1.75} style={{ pointerEvents: 'none' }}><div className="w-[142px] rounded-2xl border border-white/15 bg-black/70 p-2.5 text-white shadow-xl backdrop-blur-xl"><div className="flex items-center justify-between"><small className="text-[7px] uppercase tracking-[.12em] text-white/38">Equipo</small><span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ color: option.energyColor, background: `${option.energyColor}18` }}>{option.energy}</span></div><b className="mt-1.5 block text-sm">{option.label}</b><small className="text-[8px] text-white/48">{option.coverage} · {option.benefit}</small></div></Html>
  </group>;
}

function Airflow({ mode, fanSpeed, roomDepth, roomHeight }: { mode: ClimateMode; fanSpeed: number; roomDepth: number; roomHeight: number }) {
  const group = useRef<THREE.Group>(null); const startY = clamp(roomHeight * .71, 1.62, 2.35); const startZ = -roomDepth / 2 + .38; const color = MODE_META[mode].color;
  useFrame(({ clock }) => { if (!group.current) return; group.current.children.forEach((child, i) => { const t = (clock.elapsedTime * (.18 + fanSpeed * .075) + i / 28) % 1; child.position.set(((i % 7) - 3) * .14 * (1 + t * .5), startY - t * (.55 + fanSpeed * .08), startZ + t * Math.min(roomDepth * .46, 2.5)); ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * t) * (.1 + fanSpeed * .025); }); });
  return <group ref={group}>{Array.from({ length: 28 }).map((_, i) => <mesh key={i}><sphereGeometry args={[.026, 8, 6]} /><meshBasicMaterial color={color} transparent opacity={.12} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped /></mesh>)}</group>;
}

function Room({ roomWidth, roomDepth, roomHeight, option, mode, fanSpeed }: { roomWidth: number; roomDepth: number; roomHeight: number; option: AirOption; mode: ClimateMode; fanSpeed: number }) {
  const t = useRoomTextures(); const bedW = Math.min(2.45, roomWidth * .57); const bedD = Math.min(1.9, roomDepth * .4);
  t.wood.repeat.set(Math.max(2, roomWidth * .7), Math.max(3, roomDepth)); t.wall.repeat.set(2, 2); t.fabric.repeat.set(3, 3); t.rug.repeat.set(4, 4);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[roomWidth, roomDepth]} /><meshStandardMaterial map={t.wood} color="#9A6848" roughness={.72} /></mesh>
    <mesh position={[0, roomHeight + .06, 0]}><boxGeometry args={[roomWidth + .15, .12, roomDepth + .15]} /><meshStandardMaterial color="#B8AEA2" roughness={.92} /></mesh>
    <mesh position={[0, roomHeight / 2, -roomDepth / 2]} receiveShadow><boxGeometry args={[roomWidth, roomHeight, .12]} /><meshStandardMaterial map={t.wall} color="#B3A394" roughness={.92} /></mesh>
    <mesh position={[roomWidth / 2, roomHeight / 2, 0]} receiveShadow><boxGeometry args={[.12, roomHeight, roomDepth]} /><meshStandardMaterial color="#573C2F" roughness={.86} /></mesh>
    <Window roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} />

    <mesh position={[0, .015, -roomDepth / 2 + bedD + .75]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[Math.min(roomWidth * .7, 3.4), Math.min(roomDepth * .5, 2.5)]} /><meshStandardMaterial map={t.rug} color="#8F7F6D" roughness={.98} /></mesh>
    <group position={[0, .46, -roomDepth / 2 + bedD / 2 + .42]}>
      <RoundedBox args={[bedW, .32, bedD]} radius={.1} smoothness={5} castShadow><meshStandardMaterial color="#655B54" roughness={.9} /></RoundedBox>
      <RoundedBox args={[bedW * .98, .23, bedD * .95]} radius={.08} smoothness={5} position={[0, .26, 0]} castShadow><meshStandardMaterial map={t.fabric} color="#D0C4B5" roughness={.96} /></RoundedBox>
      <mesh position={[0, .68, -bedD * .46]} castShadow><boxGeometry args={[bedW, .82, .13]} /><meshStandardMaterial color="#6E625B" roughness={.9} /></mesh>
      {[-.28, .28].map((p) => <RoundedBox key={p} args={[bedW * .35, .33, .2]} radius={.06} smoothness={4} position={[p * bedW, .71, -bedD * .38]} castShadow><meshStandardMaterial color="#D9D0C6" roughness={.98} /></RoundedBox>)}
    </group>

    {[-1, 1].map((side) => <group key={side} position={[side * Math.min(roomWidth / 2 - .55, 1.82), .38, -roomDepth / 2 + .72]}><RoundedBox args={[.58, .5, .53]} radius={.05} smoothness={4} castShadow><meshStandardMaterial color="#4E352A" roughness={.8} /></RoundedBox><mesh position={[0, .5, 0]}><cylinderGeometry args={[.11, .16, .24, 18]} /><meshStandardMaterial color="#BCA98E" roughness={.78} /></mesh><pointLight position={[0, .68, .08]} color="#E9A46A" intensity={.28} distance={2.6} decay={2} /></group>)}

    <group position={[-roomWidth / 2 + .68, .43, roomDepth / 2 - 1.15]}><RoundedBox args={[.82, .5, .78]} radius={.15} smoothness={5} castShadow><meshStandardMaterial color="#80756C" roughness={.92} /></RoundedBox><RoundedBox args={[.74, .44, .16]} radius={.08} smoothness={4} position={[0, .41, -.3]}><meshStandardMaterial color="#756C64" roughness={.9} /></RoundedBox></group>

    <AirUnit option={option} mode={mode} fanSpeed={fanSpeed} roomDepth={roomDepth} roomHeight={roomHeight} /><Airflow mode={mode} fanSpeed={fanSpeed} roomDepth={roomDepth} roomHeight={roomHeight} />

    <mesh position={[0, roomHeight - .08, -roomDepth / 2 + .12]}><boxGeometry args={[roomWidth * .75, .022, .03]} /><meshStandardMaterial color="#C77E49" emissive="#9F5C32" emissiveIntensity={.55} /></mesh>
    <hemisphereLight args={['#E7B98E', '#3D3129', .36]} />
    <directionalLight position={[-roomWidth * .6, roomHeight + 2.2, roomDepth * .35]} intensity={1.05} color="#EAB47F" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-.0002} />
    <rectAreaLight position={[-roomWidth / 2 + .22, roomHeight * .62, .2]} rotation={[0, Math.PI / 2, 0]} width={Math.min(roomDepth * .66, 3.1)} height={1.4} intensity={1.55} color="#D9915F" />
    <spotLight position={[roomWidth * .23, roomHeight - .12, .25]} intensity={.7} angle={.55} penumbra={.88} color="#E7AD74" castShadow />
  </group>;
}

function Avatar({ speed }: { speed: MutableRefObject<number> }) {
  const lLeg = useRef<THREE.Group>(null); const rLeg = useRef<THREE.Group>(null); const lArm = useRef<THREE.Group>(null); const rArm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const a = Math.sin(clock.elapsedTime * 10) * .5 * Math.min(1, speed.current); if (lLeg.current) lLeg.current.rotation.x = a; if (rLeg.current) rLeg.current.rotation.x = -a; if (lArm.current) lArm.current.rotation.x = -a * .7; if (rArm.current) rArm.current.rotation.x = a * .7; });
  return <group>
    <mesh position={[0, 1.53, 0]} castShadow><sphereGeometry args={[.16, 20, 16]} /><meshStandardMaterial color="#A87357" roughness={.8} /></mesh>
    <mesh position={[0, 1.36, -.03]} scale={[1, .45, 1]} castShadow><sphereGeometry args={[.18, 18, 12]} /><meshStandardMaterial color="#151719" roughness={.86} /></mesh>
    <RoundedBox args={[.46, .7, .25]} radius={.11} smoothness={4} position={[0, 1.02, 0]} castShadow><meshStandardMaterial color="#17191D" roughness={.82} /></RoundedBox>
    <group ref={lArm} position={[-.29, 1.23, 0]}><mesh position={[0, -.27, 0]} castShadow><capsuleGeometry args={[.073, .46, 5, 10]} /><meshStandardMaterial color="#191B1F" roughness={.84} /></mesh></group>
    <group ref={rArm} position={[.29, 1.23, 0]}><mesh position={[0, -.27, 0]} castShadow><capsuleGeometry args={[.073, .46, 5, 10]} /><meshStandardMaterial color="#191B1F" roughness={.84} /></mesh></group>
    <group ref={lLeg} position={[-.12, .67, 0]}><mesh position={[0, -.35, 0]} castShadow><capsuleGeometry args={[.083, .56, 5, 10]} /><meshStandardMaterial color="#24262A" roughness={.86} /></mesh></group>
    <group ref={rLeg} position={[.12, .67, 0]}><mesh position={[0, -.35, 0]} castShadow><capsuleGeometry args={[.083, .56, 5, 10]} /><meshStandardMaterial color="#24262A" roughness={.86} /></mesh></group>
  </group>;
}

function ThirdPerson({ move, roomWidth, roomDepth }: { move: MoveState; roomWidth: number; roomDepth: number }) {
  const { camera, gl, size } = useThree(); const avatar = useRef<THREE.Group>(null); const yaw = useRef(0); const pitch = useRef(.12); const drag = useRef(false); const last = useRef({ x: 0, y: 0 }); const keys = useRef(new Set<string>()); const physics = useRef<{ world: CANNON.World; body: CANNON.Body } | null>(null); const speedRef = useRef(0);
  useEffect(() => {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) }); world.broadphase = new CANNON.SAPBroadphase(world);
    const body = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(0, .3, roomDepth / 2 - 1.05), linearDamping: .28 }); body.addShape(new CANNON.Sphere(.23)); world.addBody(body);
    const box = (half: [number, number, number], pos: [number, number, number]) => { const b = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(...pos) }); b.addShape(new CANNON.Box(new CANNON.Vec3(...half))); world.addBody(b); };
    box([.08, 1, roomDepth / 2], [-roomWidth / 2, 1, 0]); box([.08, 1, roomDepth / 2], [roomWidth / 2, 1, 0]); box([roomWidth / 2, 1, .08], [0, 1, -roomDepth / 2]);
    const bedW = Math.min(2.45, roomWidth * .57); const bedD = Math.min(1.9, roomDepth * .4); box([bedW / 2 + .1, .44, bedD / 2 + .1], [0, .44, -roomDepth / 2 + bedD / 2 + .42]);
    physics.current = { world, body }; return () => { physics.current = null; };
  }, [roomDepth, roomWidth]);
  useEffect(() => {
    const canvas = gl.domElement; const kd = (e: KeyboardEvent) => keys.current.add(e.code); const ku = (e: KeyboardEvent) => keys.current.delete(e.code);
    const down = (e: PointerEvent) => { drag.current = true; last.current = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); };
    const up = () => { drag.current = false; };
    const look = (e: PointerEvent) => { if (!drag.current) return; const dx = e.clientX - last.current.x; const dy = e.clientY - last.current.y; last.current = { x: e.clientX, y: e.clientY }; const sensitivity = e.pointerType === 'touch' ? .0062 : .0048; yaw.current -= dx * sensitivity; pitch.current = clamp(pitch.current + dy * sensitivity * .55, -.08, .48); };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointermove', look);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); canvas.removeEventListener('pointermove', look); };
  }, [gl]);
  useFrame((_, delta) => {
    const p = physics.current; if (!p || !avatar.current) return; const z = (keys.current.has('KeyW') || move.forward ? 1 : 0) - (keys.current.has('KeyS') || move.back ? 1 : 0); const x = (keys.current.has('KeyD') || move.right ? 1 : 0) - (keys.current.has('KeyA') || move.left ? 1 : 0); const input = new THREE.Vector3(x, 0, -z); const moving = input.lengthSq() > 0; speedRef.current = THREE.MathUtils.damp(speedRef.current, moving ? 1 : 0, 12, delta);
    if (moving) { input.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current); const run = keys.current.has('ShiftLeft') || keys.current.has('ShiftRight'); const speed = run ? 5 : 3.15; p.body.velocity.x = input.x * speed; p.body.velocity.z = input.z * speed; const targetRot = Math.atan2(input.x, input.z); avatar.current.rotation.y = THREE.MathUtils.damp(avatar.current.rotation.y, targetRot, 14, delta); } else { p.body.velocity.x *= .48; p.body.velocity.z *= .48; }
    p.body.velocity.y = 0; p.world.step(1 / 60, Math.min(delta, .045), 3); p.body.position.y = .3; avatar.current.position.set(p.body.position.x, 0, p.body.position.z);
    const mobile = size.width < 720; const target = new THREE.Vector3(p.body.position.x, 1.05, p.body.position.z); const distance = mobile ? 4.1 : 4.55; const height = mobile ? 1.72 : 1.82; const desired = target.clone().add(new THREE.Vector3(Math.sin(yaw.current) * distance, height + pitch.current * 1.35, Math.cos(yaw.current) * distance)); camera.position.lerp(desired, 1 - Math.exp(-delta * 9.5)); camera.lookAt(target.x, target.y + .13, target.z);
  });
  return <group ref={avatar}><Avatar speed={speedRef} /></group>;
}

function MovePad({ setMove }: { setMove: Dispatch<SetStateAction<MoveState>> }) {
  const press = (key: keyof MoveState, value: boolean) => setMove((s) => ({ ...s, [key]: value })); const b = (key: keyof MoveState, label: string, col: string, row: string) => <button onPointerDown={() => press(key, true)} onPointerUp={() => press(key, false)} onPointerCancel={() => press(key, false)} onPointerLeave={() => press(key, false)} className={`${col} ${row} grid place-items-center rounded-full bg-white/12 text-white/82 active:bg-[#F5871F] active:text-black`}>{label}</button>;
  return <div className="pointer-events-auto absolute bottom-[160px] left-3 z-40 grid h-[112px] w-[112px] grid-cols-3 grid-rows-3 gap-1 rounded-full border border-white/14 bg-black/42 p-2 shadow-2xl backdrop-blur-xl md:hidden">{b('forward', '↑', 'col-start-2', 'row-start-1')}{b('left', '←', 'col-start-1', 'row-start-2')}<span className="col-start-2 row-start-2 grid place-items-center"><Move className="h-4 w-4 text-white/32" /></span>{b('right', '→', 'col-start-3', 'row-start-2')}{b('back', '↓', 'col-start-2', 'row-start-3')}</div>;
}

function AirThumb({ option, selected }: { option: AirOption; selected: boolean }) {
  const bodyW = option.cap === 9000 ? 72 : option.cap === 12000 ? 78 : option.cap === 18000 ? 86 : 92;
  return <div className="mx-auto h-[46px] w-[102px]"><svg viewBox="0 0 110 50" className="h-full w-full drop-shadow-[0_8px_10px_rgba(0,0,0,.35)]" aria-hidden="true"><defs><linearGradient id={`acv4-${option.cap}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3f2ef" /><stop offset=".72" stopColor="#d7d5cf" /><stop offset="1" stopColor="#b5b6b7" /></linearGradient></defs><rect x={(110 - bodyW) / 2} y="8" width={bodyW} height="25" rx="7" fill={`url(#acv4-${option.cap})`} stroke={selected ? '#F5B76F' : '#ffffff44'} strokeWidth={selected ? 1.8 : .8} /><rect x={(110 - bodyW * .78) / 2} y="29" width={bodyW * .78} height="5" rx="2.5" fill="#22252a" /><circle cx={55 + bodyW * .27} cy="19" r="1.4" fill={selected ? '#65E58C' : '#85898d'} /></svg></div>;
}

function ClimatePanel({ compact = false, temperature, setTemperature, fanSpeed, setFanSpeed, mode, setMode, eco, setEco, sound, setSound, monthlyKwh, monthlyCost }: { compact?: boolean; temperature: number; setTemperature: (v: number) => void; fanSpeed: number; setFanSpeed: (v: number) => void; mode: ClimateMode; setMode: (v: ClimateMode) => void; eco: boolean; setEco: (v: boolean) => void; sound: boolean; setSound: (v: boolean) => void; monthlyKwh: number; monthlyCost: number }) {
  const body = <div className="space-y-3"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-[#EBA665]" /><b className="text-sm">Control de clima</b></span><b className="text-3xl">{temperature}°</b></div><input type="range" min={16} max={28} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-[#F5871F]" /><div><small className="text-[8px] font-black uppercase text-white/35">Modo</small><div className="mt-2 grid grid-cols-4 gap-1.5">{(['frio', 'ventilacion', 'seco', 'auto'] as ClimateMode[]).map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded-xl border py-2 text-[8px] font-black ${mode === item ? 'border-white/22 bg-white/12 text-white' : 'border-white/6 bg-white/[.035] text-white/38'}`} style={mode === item ? { boxShadow: `inset 0 -2px ${MODE_META[item].color}` } : undefined}>{MODE_META[item].label}</button>)}</div></div><div><small className="text-[8px] font-black uppercase text-white/35">Ventilador</small><div className="mt-2 grid grid-cols-4 gap-1.5">{[1, 2, 3, 4].map((v) => <button key={v} onClick={() => setFanSpeed(v)} className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[9px] font-black ${fanSpeed === v ? 'border-[#72D9FF]/40 bg-[#72D9FF]/12 text-[#72D9FF]' : 'border-white/6 bg-white/[.035] text-white/38'}`}><Fan className="h-3 w-3" />{v}</button>)}</div></div><div className="grid grid-cols-2 gap-2"><button onClick={() => setEco(!eco)} className={`rounded-xl border py-2.5 text-[9px] font-black ${eco ? 'border-[#75DE9A]/35 bg-[#75DE9A]/12 text-[#75DE9A]' : 'border-white/7 bg-white/[.035] text-white/40'}`}><Leaf className="mr-1 inline h-3.5 w-3.5" />Ahorro</button><button onClick={() => setSound(!sound)} className={`rounded-xl border py-2.5 text-[9px] font-black ${sound ? 'border-[#EBA665]/35 bg-[#EBA665]/10 text-[#EBA665]' : 'border-white/7 bg-white/[.035] text-white/40'}`}>{sound ? <Speaker className="mr-1 inline h-3.5 w-3.5" /> : <VolumeX className="mr-1 inline h-3.5 w-3.5" />}Sonido</button></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/6 p-2.5"><small className="text-[8px] text-white/35">Consumo</small><b className="block">{Math.round(monthlyKwh)} kWh</b></div><div className="rounded-xl bg-white/6 p-2.5"><small className="text-[8px] text-white/35">Estimado</small><b className="block">{money.format(monthlyCost)}</b></div></div></div>;
  return compact ? body : <Glass className="pointer-events-auto rounded-[1.7rem] p-4">{body}</Glass>;
}

function Intro() { return <div className="absolute inset-0 z-[100] grid place-items-center bg-[#0A0B0D] px-5 text-white"><div className="text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-[#EBA665]/25 bg-[#F5871F]/10 text-[#EBA665]"><Gamepad2 className="h-5 w-5" /></div><small className="mt-5 block text-[9px] font-black uppercase tracking-[.22em] text-[#EBA665]">Fabrick Game View V4</small><h1 className="mt-2 text-2xl font-black">Entra a tu habitación</h1><p className="mt-2 text-xs leading-6 text-white/46">Mide, recorre y compara el aire ideal dentro del espacio.</p><div className="mx-auto mt-6 h-1 w-[210px] overflow-hidden rounded-full bg-white/8"><div className="h-full animate-[introbar_3s_linear_forwards] rounded-full bg-gradient-to-r from-[#F5871F] to-[#75DE9A]" /></div></div></div><style>{`@keyframes introbar{from{width:0}to{width:100%}}`}</style></div>; }

export default function AirGameExperienceV4() {
  const router = useRouter(); const [length, setLength] = useState(5.4); const [width, setWidth] = useState(4.4); const [height, setHeight] = useState(2.7); const [people, setPeople] = useState(2); const [selectedCap, setSelectedCap] = useState<Capacity>(12000); const [temperature, setTemperature] = useState(22); const [fanSpeed, setFanSpeed] = useState(2); const [mode, setMode] = useState<ClimateMode>('frio'); const [eco, setEco] = useState(true); const [sound, setSound] = useState(false); const [panel, setPanel] = useState<Panel>(null); const [move, setMove] = useState<MoveState>({ forward: false, back: false, left: false, right: false }); const [intro, setIntro] = useState(true);
  useFanAudio(sound, fanSpeed, mode, eco); useEffect(() => { const t = window.setTimeout(() => setIntro(false), 3000); return () => window.clearTimeout(t); }, []);
  const calc = useMemo(() => { const area = length * width; const volume = area * height; const requiredBtu = Math.ceil(area * 600 + volume * 55 + people * 600 + 350 * 3.412); const recommended = (OPTIONS.find((o) => o.cap >= requiredBtu)?.cap || 24000) as Capacity; const option = OPTIONS.find((o) => o.cap === selectedCap) || OPTIONS[1]; const tempFactor = temperature <= 18 ? .82 : temperature <= 20 ? .68 : temperature <= 22 ? .56 : temperature <= 24 ? .46 : .38; const monthlyKwh = option.powerKw * tempFactor * (.88 + fanSpeed * .04) * MODE_META[mode].factor * (eco ? .78 : 1) * 4 * 30; return { area, requiredBtu, recommended, option, monthlyKwh, monthlyCost: Math.round(monthlyKwh * 263) }; }, [eco, fanSpeed, height, length, mode, people, selectedCap, temperature, width]);
  useEffect(() => setSelectedCap(calc.recommended), [calc.recommended]); const roomWidth = clamp(width, 2.8, 7.5); const roomDepth = clamp(length, 3.2, 8.5); const roomHeight = clamp(height, 2.2, 3.6); const shift = (d: -1 | 1) => { const i = OPTIONS.findIndex((o) => o.cap === selectedCap); setSelectedCap(OPTIONS[(i + d + OPTIONS.length) % OPTIONS.length].cap); };
  return <main className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#0E0E10] text-white">
    {intro ? <Intro /> : null}
    <div className="absolute inset-0"><Canvas shadows dpr={[.85, 1.35]} camera={{ fov: 60, near: .05, far: 60 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = .72; gl.outputColorSpace = THREE.SRGBColorSpace; gl.shadowMap.type = THREE.PCFSoftShadowMap; }}><color attach="background" args={['#17120F']} /><fog attach="fog" args={['#17120F', 12, 28]} /><EnvironmentLite /><Room roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} option={calc.option} mode={mode} fanSpeed={fanSpeed} /><ThirdPerson move={move} roomWidth={roomWidth} roomDepth={roomDepth} /></Canvas></div>
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,4,.24),transparent_28%,transparent_72%,rgba(3,3,4,.58))]" />

    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 p-3 sm:p-5"><div className="pointer-events-auto flex items-center gap-2"><button onClick={() => navigateWithTransition('/tienda', router)} className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/42 backdrop-blur-xl"><ArrowLeft className="h-4 w-4" /></button><Glass className="rounded-full px-3.5 py-2"><small className="block text-[7px] font-black uppercase tracking-[.18em] text-[#EBA665]">Calculadora 3D · V4</small><b className="block text-[10px]">{numText(calc.area)} m² · {integer.format(calc.requiredBtu)} BTU</b></Glass></div><button onClick={() => setSound(!sound)} className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${sound ? 'border-[#75DE9A]/40 bg-[#75DE9A]/15 text-[#75DE9A]' : 'border-white/14 bg-black/42 text-white/70'}`}>{sound ? <Speaker className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button></header>

    <aside className="pointer-events-none absolute left-5 top-[112px] z-30 hidden w-[268px] lg:block"><Glass className="pointer-events-auto rounded-[1.6rem] p-3.5"><div className="mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-[#EBA665]" /><div><b className="block text-xs">Dimensiones del espacio</b><small className="text-[8px] text-white/35">La habitación cambia en vivo</small></div></div><div className="space-y-1.5"><Field label="Largo" value={length} suffix="m" onChange={setLength} /><Field label="Ancho" value={width} suffix="m" onChange={setWidth} /><Field label="Alto" value={height} suffix="m" onChange={setHeight} /><Field label="Personas" value={people} step={1} onChange={setPeople} /></div><div className="mt-2.5 flex items-center justify-between rounded-xl bg-[#F5871F] px-3 py-2.5 text-black"><span className="text-[8px] font-black uppercase">Recomendado</span><b className="text-sm">{integer.format(calc.recommended)} BTU</b></div></Glass></aside>
    <aside className="pointer-events-none absolute right-5 top-[112px] z-30 hidden w-[276px] lg:block"><ClimatePanel temperature={temperature} setTemperature={setTemperature} fanSpeed={fanSpeed} setFanSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} monthlyKwh={calc.monthlyKwh} monthlyCost={calc.monthlyCost} /></aside>

    <div className="pointer-events-auto absolute right-3 top-[70px] z-40 flex gap-2 lg:hidden"><button onClick={() => setPanel(panel === 'measure' ? null : 'measure')} className="grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-black/42 backdrop-blur-xl"><Calculator className="h-4 w-4" /></button><button onClick={() => setPanel(panel === 'climate' ? null : 'climate')} className="grid h-10 w-10 place-items-center rounded-full border border-white/14 bg-black/42 backdrop-blur-xl"><Thermometer className="h-4 w-4" /></button></div>
    {panel ? <div className="pointer-events-auto absolute inset-x-3 top-[122px] z-50 lg:hidden"><Glass className="mx-auto max-w-md rounded-[1.5rem] p-3.5"><div className="mb-3 flex items-center justify-between"><b className="text-xs">{panel === 'measure' ? 'Dimensiones' : 'Control de clima'}</b><button onClick={() => setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7"><X className="h-3.5 w-3.5" /></button></div>{panel === 'measure' ? <><div className="grid grid-cols-2 gap-1.5"><Field label="Largo" value={length} suffix="m" onChange={setLength} /><Field label="Ancho" value={width} suffix="m" onChange={setWidth} /><Field label="Alto" value={height} suffix="m" onChange={setHeight} /><Field label="Personas" value={people} step={1} onChange={setPeople} /></div><div className="mt-2.5 rounded-xl bg-[#F5871F] px-3 py-2.5 text-center text-xs font-black text-black">{numText(calc.area)} m² · {integer.format(calc.recommended)} BTU</div></> : <ClimatePanel compact temperature={temperature} setTemperature={setTemperature} fanSpeed={fanSpeed} setFanSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} monthlyKwh={calc.monthlyKwh} monthlyCost={calc.monthlyCost} />}</Glass></div> : null}

    <div className="pointer-events-none absolute left-1/2 top-[80px] z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/34 px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] text-white/50 backdrop-blur-xl"><span className="inline-flex items-center gap-1.5"><Gamepad2 className="h-3.5 w-3.5 text-[#EBA665]" />WASD / joystick · Shift para correr</span></div>
    <MovePad setMove={setMove} />

    <section className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center px-2.5 sm:bottom-5 sm:px-4"><Glass className="pointer-events-auto w-full max-w-[860px] rounded-[1.5rem] p-2"><div className="flex items-center gap-1.5"><button onClick={() => shift(-1)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full bg-white/7 sm:w-11"><ChevronLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-w-max gap-2">{OPTIONS.map((option) => { const selected = option.cap === selectedCap; const ideal = option.cap === calc.recommended; return <button key={option.cap} onClick={() => setSelectedCap(option.cap)} className={`min-w-[116px] rounded-[1rem] border px-2.5 pb-2.5 pt-1.5 text-left sm:min-w-[150px] ${selected ? 'border-[#EBA665]/80 bg-[linear-gradient(180deg,rgba(245,135,31,.3),rgba(245,135,31,.12))] shadow-[0_0_26px_rgba(245,135,31,.2)]' : 'border-white/8 bg-white/[.055]'}`}><AirThumb option={option} selected={selected} /><div className="mt-0.5 flex items-end justify-between gap-2"><div><b className={`block text-sm sm:text-base ${selected ? 'text-[#EBA665]' : 'text-white'}`}>{option.label}</b><span className="mt-1 flex items-center gap-1 text-[8px] text-white/48"><Leaf className="h-3 w-3" style={{ color: option.energyColor }} />{ideal ? 'Ideal para ti' : option.benefit}</span></div><span className="rounded-full px-1.5 py-1 text-[8px] font-black" style={{ color: option.energyColor, background: `${option.energyColor}16` }}>{option.energy}</span></div></button>; })}</div></div><button onClick={() => shift(1)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full bg-white/7 sm:w-11"><ChevronRight className="h-4 w-4" /></button></div></Glass></section>
  </main>;
}
