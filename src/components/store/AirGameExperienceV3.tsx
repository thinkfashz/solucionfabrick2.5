'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ArrowLeft, Calculator, ChevronLeft, ChevronRight, Fan, Gamepad2, Leaf, Move, Snowflake, Speaker, Thermometer, VolumeX, Wind, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';

type Capacity = 9000 | 12000 | 18000 | 24000;
type ClimateMode = 'frio' | 'ventilacion' | 'seco' | 'auto';
type MoveState = { forward: boolean; back: boolean; left: boolean; right: boolean };
type Panel = 'measure' | 'climate' | null;
type AirOption = { cap: Capacity; label: string; short: string; coverage: string; powerKw: number; width: number; energy: 'A++' | 'A+' | 'A'; energyColor: string; benefit: string };

const OPTIONS: AirOption[] = [
  { cap: 9000, label: '9.000 BTU', short: '9K', coverage: 'hasta 18 m²', powerKw: .82, width: 1.28, energy: 'A++', energyColor: '#5EE58C', benefit: 'Eficiente' },
  { cap: 12000, label: '12.000 BTU', short: '12K', coverage: 'hasta 24 m²', powerKw: 1.08, width: 1.44, energy: 'A++', energyColor: '#5EE58C', benefit: 'Eficiente' },
  { cap: 18000, label: '18.000 BTU', short: '18K', coverage: 'hasta 36 m²', powerKw: 1.58, width: 1.68, energy: 'A+', energyColor: '#A7E85B', benefit: 'Más potente' },
  { cap: 24000, label: '24.000 BTU', short: '24K', coverage: 'hasta 48 m²', powerKw: 2.2, width: 1.92, energy: 'A', energyColor: '#F2D35E', benefit: 'Máximo confort' },
];

const MODE_META: Record<ClimateMode, { label: string; color: string; factor: number }> = {
  frio: { label: 'Frío', color: '#72D9FF', factor: 1 },
  ventilacion: { label: 'Vent.', color: '#DDF6FF', factor: .28 },
  seco: { label: 'Deshum.', color: '#70E6C7', factor: .66 },
  auto: { label: 'Auto', color: '#C8B4FF', factor: .82 },
};

const money = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const ENERGY_REFERENCE = 263;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const numText = (value: number) => value.toLocaleString('es-CL', { maximumFractionDigits: 1 });

function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`border border-white/15 bg-[linear-gradient(145deg,rgba(15,16,19,.80),rgba(15,16,19,.46))] shadow-[0_28px_90px_rgba(0,0,0,.34)] backdrop-blur-2xl ${className}`}>{children}</div>;
}

function Field({ label, value, suffix, step = .1, onChange }: { label: string; value: number; suffix?: string; step?: number; onChange: (value: number) => void }) {
  return <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[.055] px-3 focus-within:border-[#F0A25B]/45 focus-within:bg-white/[.08]">
    <span className="text-[9px] font-black uppercase tracking-[.12em] text-white/45">{label}</span>
    <span className="flex items-center gap-1.5"><input type="number" min={step} step={step} value={value} onChange={(event) => onChange(Math.max(step, Number(event.target.value) || step))} className="w-14 bg-transparent text-right text-sm font-black tabular-nums text-white outline-none" />{suffix ? <small className="text-[9px] font-bold text-white/35">{suffix}</small> : null}</span>
  </label>;
}

function useFanAudio(enabled: boolean, speed: number, mode: ClimateMode, eco: boolean) {
  const nodes = useRef<{ ctx: AudioContext; gain: GainNode; filter: BiquadFilterNode; noise: AudioBufferSourceNode; hum: OscillatorNode } | null>(null);
  useEffect(() => {
    if (!enabled) {
      const current = nodes.current;
      if (current) {
        current.gain.gain.setTargetAtTime(0, current.ctx.currentTime, .12);
        window.setTimeout(() => { try { current.noise.stop(); current.hum.stop(); current.ctx.close(); } catch { /* noop */ } }, 240);
        nodes.current = null;
      }
      return;
    }
    const ctx = new AudioContext(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter(); const noise = ctx.createBufferSource(); const hum = ctx.createOscillator(); const humGain = ctx.createGain();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * .2;
    noise.buffer = buffer; noise.loop = true; filter.type = 'lowpass'; hum.type = 'sine'; hum.frequency.value = 54; humGain.gain.value = .005;
    noise.connect(filter).connect(gain); hum.connect(humGain).connect(gain); gain.connect(ctx.destination); gain.gain.value = 0; noise.start(); hum.start(); ctx.resume().catch(() => undefined);
    nodes.current = { ctx, gain, filter, noise, hum };
    return () => { try { noise.stop(); hum.stop(); ctx.close(); } catch { /* noop */ } nodes.current = null; };
  }, [enabled]);
  useEffect(() => {
    const current = nodes.current; if (!current) return;
    const modeFactor = mode === 'ventilacion' ? .72 : mode === 'seco' ? .82 : 1;
    current.gain.gain.setTargetAtTime((.007 + speed * .004) * modeFactor * (eco ? .74 : 1), current.ctx.currentTime, .16);
    current.filter.frequency.setTargetAtTime(520 + speed * 300, current.ctx.currentTime, .18);
    current.hum.frequency.setTargetAtTime(48 + speed * 4, current.ctx.currentTime, .2);
  }, [eco, mode, speed]);
}

function makeSurface(kind: 'wood' | 'wall' | 'fabric' | 'rug', size = 256) {
  const color = new Uint8Array(size * size * 4); const bump = new Uint8Array(size * size * 4);
  const palette = kind === 'wood' ? [116, 78, 52] : kind === 'wall' ? [186, 174, 160] : kind === 'fabric' ? [216, 207, 194] : [143, 128, 111];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; const noise = hash - Math.floor(hash);
      const grain = kind === 'wood' ? Math.sin((x / size) * Math.PI * 24 + noise * 1.6) * 18 : kind === 'fabric' ? ((x + y) % 7 === 0 ? 10 : 0) : kind === 'rug' ? ((x * 3 + y * 5) % 11 === 0 ? 14 : 0) : 0;
      const v = (noise - .5) * (kind === 'wall' ? 12 : 20) + grain;
      color[i] = clamp(palette[0] + v, 0, 255); color[i + 1] = clamp(palette[1] + v, 0, 255); color[i + 2] = clamp(palette[2] + v, 0, 255); color[i + 3] = 255;
      const g = clamp(128 + (noise - .5) * 90 + grain * .7, 0, 255); bump[i] = g; bump[i + 1] = g; bump[i + 2] = g; bump[i + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(color, size, size, THREE.RGBAFormat); map.needsUpdate = true; map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bumpMap = new THREE.DataTexture(bump, size, size, THREE.RGBAFormat); bumpMap.needsUpdate = true; bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}

function useSurfaces() {
  return useMemo(() => ({ wood: makeSurface('wood'), wall: makeSurface('wall'), fabric: makeSurface('fabric'), rug: makeSurface('rug') }), []);
}

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl); const room = new RoomEnvironment(); const env = pmrem.fromScene(room, .04).texture; scene.environment = env;
    return () => { scene.environment = null; env.dispose(); pmrem.dispose(); };
  }, [gl, scene]);
  return null;
}

function PostFX() {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer | null>(null);
  useEffect(() => {
    const c = new EffectComposer(gl); const render = new RenderPass(scene, camera); const ssao = new SSAOPass(scene, camera, size.width, size.height); ssao.kernelRadius = 10; ssao.minDistance = .002; ssao.maxDistance = .17; ssao.enabled = size.width > 720;
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), .26, .55, .88); const smaa = new SMAAPass(size.width, size.height); const output = new OutputPass();
    c.addPass(render); c.addPass(ssao); c.addPass(bloom); c.addPass(smaa); c.addPass(output); composer.current = c;
    return () => { c.dispose(); composer.current = null; };
  }, [camera, gl, scene, size.height, size.width]);
  useEffect(() => { composer.current?.setSize(size.width, size.height); }, [size.height, size.width]);
  useFrame((state, delta) => { if (state.gl.xr.isPresenting) state.gl.render(state.scene, state.camera); else composer.current?.render(delta); }, 1);
  return null;
}

function SunsetOutside({ roomWidth, roomDepth, roomHeight }: { roomWidth: number; roomDepth: number; roomHeight: number }) {
  const vertex = 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
  const fragment = 'varying vec2 vUv; void main(){vec3 a=vec3(0.16,0.22,0.34); vec3 b=vec3(0.95,0.50,0.23); vec3 c=vec3(1.0,0.75,0.43); vec3 col=mix(b,a,smoothstep(0.25,1.0,vUv.y)); col=mix(c,col,smoothstep(0.0,.32,vUv.y)); gl_FragColor=vec4(col,1.0);}';
  return <group position={[-roomWidth / 2 - 1.45, roomHeight * .56, 0]} rotation={[0, Math.PI / 2, 0]}>
    <mesh><planeGeometry args={[roomDepth * 1.7, roomHeight * 1.55]} /><shaderMaterial vertexShader={vertex} fragmentShader={fragment} side={THREE.DoubleSide} toneMapped={false} /></mesh>
    {[-1.2,-.6,.15,.75,1.25].map((z, i) => <mesh key={z} position={[z * roomDepth * .35, -roomHeight * .34, .02]}><boxGeometry args={[.22 + i * .035, .28 + (i % 3) * .12, .03]} /><meshBasicMaterial color="#2B2F3B" /></mesh>)}
    <pointLight position={[0, .2, 1]} color="#FF9A55" intensity={3.1} distance={8} decay={1.7} />
  </group>;
}

function WindowOpening({ roomWidth, roomDepth, roomHeight }: { roomWidth: number; roomDepth: number; roomHeight: number }) {
  const windowD = Math.min(roomDepth * .56, 3.2); const windowH = Math.min(roomHeight * .64, 1.8); const bottom = .42; const sideD = Math.max(.2, (roomDepth - windowD) / 2); const topH = Math.max(.15, roomHeight - bottom - windowH);
  const wall = <meshPhysicalMaterial color="#D7CEC2" roughness={.88} />;
  return <group>
    <mesh position={[-roomWidth / 2, bottom / 2, 0]} receiveShadow><boxGeometry args={[.12, bottom, roomDepth]} />{wall}</mesh>
    <mesh position={[-roomWidth / 2, bottom + windowH + topH / 2, 0]} receiveShadow><boxGeometry args={[.12, topH, roomDepth]} />{wall}</mesh>
    <mesh position={[-roomWidth / 2, bottom + windowH / 2, -(windowD / 2 + sideD / 2)]} receiveShadow><boxGeometry args={[.12, windowH, sideD]} />{wall}</mesh>
    <mesh position={[-roomWidth / 2, bottom + windowH / 2, windowD / 2 + sideD / 2]} receiveShadow><boxGeometry args={[.12, windowH, sideD]} />{wall}</mesh>
    <group position={[-roomWidth / 2 + .065, bottom + windowH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh><planeGeometry args={[windowD, windowH]} /><meshPhysicalMaterial color="#B9D6E2" transmission={.82} transparent opacity={.34} roughness={.025} metalness={.02} thickness={.025} /></mesh>
      {[-.33,.33].map((p) => <mesh key={p} position={[windowD * p, 0, .035]}><boxGeometry args={[.035, windowH, .025]} /><meshStandardMaterial color="#2C2825" metalness={.4} roughness={.38} /></mesh>)}
      <mesh position={[0, 0, .035]}><boxGeometry args={[windowD, .035, .025]} /><meshStandardMaterial color="#2C2825" metalness={.4} roughness={.38} /></mesh>
    </group>
    <SunsetOutside roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} />
  </group>;
}

function AirUnit({ option, mode, fanSpeed, eco, roomDepth, roomHeight }: { option: AirOption; mode: ClimateMode; fanSpeed: number; eco: boolean; roomDepth: number; roomHeight: number }) {
  const y = clamp(roomHeight * .76, 1.82, roomHeight - .36); const z = -roomDepth / 2 + .2; const color = MODE_META[mode].color;
  return <group position={[0, y, z]}>
    <RoundedBox args={[option.width, .39, .3]} radius={.085} smoothness={7} castShadow receiveShadow><meshPhysicalMaterial color="#F7F5F0" roughness={.15} clearcoat={.72} clearcoatRoughness={.12} envMapIntensity={1.4} /></RoundedBox>
    <mesh position={[0, -.125, .165]} rotation={[.22,0,0]} castShadow><boxGeometry args={[option.width * .83,.07,.055]} /><meshStandardMaterial color="#171A1D" roughness={.26} /></mesh>
    <mesh position={[option.width * .29,.025,.158]}><planeGeometry args={[option.width * .18,.07]} /><meshBasicMaterial color={eco ? '#68E28F' : color} transparent opacity={.82} /></mesh>
    <pointLight position={[0,-.05,.3]} intensity={.3 + fanSpeed * .06} distance={1.9} color={color} />
    <Html transform position={[option.width / 2 + .36,.08,.02]} distanceFactor={1.65} style={{ pointerEvents: 'none' }}>
      <div className="w-[150px] rounded-2xl border border-white/18 bg-black/65 p-2.5 text-white shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between"><small className="text-[7px] font-black uppercase tracking-[.12em] text-white/40">Seleccionado</small><span className="rounded-full px-2 py-1 text-[9px] font-black" style={{ color: option.energyColor, background: `${option.energyColor}18`, border: `1px solid ${option.energyColor}44` }}>{option.energy}</span></div>
        <b className="mt-1.5 block text-sm">{option.label}</b><small className="text-[8px] text-white/46">{option.coverage} · {option.benefit}</small>
      </div>
    </Html>
  </group>;
}

function Airflow({ mode, fanSpeed, eco, roomDepth, roomHeight }: { mode: ClimateMode; fanSpeed: number; eco: boolean; roomDepth: number; roomHeight: number }) {
  const group = useRef<THREE.Group>(null); const color = MODE_META[mode].color; const count = 40; const startY = clamp(roomHeight * .71, 1.62, 2.35); const startZ = -roomDepth / 2 + .38;
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => { const t = (clock.elapsedTime * (.12 + fanSpeed * .052) + index / count) % 1; child.position.set(((index % 10) - 4.5) * .13 * (1 + t * .75), startY - t * (.74 + fanSpeed * .1), startZ + t * Math.min(roomDepth * .55, 3)); child.scale.setScalar(.55 + (1 - t) * .9); ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * t) * (.14 + fanSpeed * .03) * (eco ? .74 : 1); });
  });
  return <group ref={group}>{Array.from({ length: count }).map((_, i) => <mesh key={i}><sphereGeometry args={[.03,9,7]} /><meshBasicMaterial color={color} transparent opacity={.17} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>)}</group>;
}

function DecorativePlant({ position }: { position: [number, number, number] }) {
  return <group position={position}><mesh castShadow><cylinderGeometry args={[.18,.22,.38,20]} /><meshPhysicalMaterial color="#8E6A4C" roughness={.82} /></mesh>{Array.from({ length: 8 }).map((_, i) => <mesh key={i} position={[Math.sin(i*.8)*.18,.38+i*.055,Math.cos(i*.8)*.15]} rotation={[0,i*.8,(i%2?.5:-.5)]} castShadow><sphereGeometry args={[.12,.18,.1,12,8]} /><meshStandardMaterial color={i%2 ? '#35523B' : '#446447'} roughness={.78} /></mesh>)}</group>;
}

function DynamicRoom({ roomWidth, roomDepth, roomHeight, option, mode, fanSpeed, eco }: { roomWidth: number; roomDepth: number; roomHeight: number; option: AirOption; mode: ClimateMode; fanSpeed: number; eco: boolean }) {
  const s = useSurfaces(); const bedW = Math.min(2.5, roomWidth * .58); const bedD = Math.min(1.95, roomDepth * .43); const rugW = Math.min(roomWidth*.72,3.5); const rugD = Math.min(roomDepth*.55,2.8);
  s.wood.map.repeat.set(Math.max(2, roomWidth * .8), Math.max(3, roomDepth * 1.2)); s.wood.bumpMap.repeat.copy(s.wood.map.repeat); s.wall.map.repeat.set(2,2); s.wall.bumpMap.repeat.set(3,3); s.rug.map.repeat.set(4,4); s.rug.bumpMap.repeat.set(7,7);
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[roomWidth,roomDepth]} /><meshPhysicalMaterial map={s.wood.map} bumpMap={s.wood.bumpMap} bumpScale={.026} roughness={.54} clearcoat={.08} /></mesh>
    <mesh position={[0,roomHeight+.07,0]} receiveShadow><boxGeometry args={[roomWidth+.18,.14,roomDepth+.18]} /><meshPhysicalMaterial color="#DCD4C9" roughness={.86} /></mesh>
    <mesh position={[0,roomHeight/2,-roomDepth/2]} receiveShadow><boxGeometry args={[roomWidth,roomHeight,.12]} /><meshPhysicalMaterial map={s.wall.map} bumpMap={s.wall.bumpMap} bumpScale={.018} roughness={.8} /></mesh>
    <mesh position={[roomWidth/2,roomHeight/2,0]} receiveShadow><boxGeometry args={[.12,roomHeight,roomDepth]} /><meshPhysicalMaterial color="#4A3327" roughness={.66} /></mesh>
    <WindowOpening roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} />
    <mesh position={[0,.012,-roomDepth/2+bedD+.75]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[rugW,rugD]} /><meshPhysicalMaterial map={s.rug.map} bumpMap={s.rug.bumpMap} bumpScale={.02} roughness={.9} /></mesh>

    <group position={[0,.48,-roomDepth/2+bedD/2+.42]}>
      <RoundedBox args={[bedW,.34,bedD]} radius={.11} smoothness={5} castShadow receiveShadow><meshPhysicalMaterial color="#756B64" roughness={.88} /></RoundedBox>
      <RoundedBox args={[bedW*.98,.24,bedD*.96]} radius={.085} smoothness={5} position={[0,.27,0]} castShadow><meshPhysicalMaterial map={s.fabric.map} bumpMap={s.fabric.bumpMap} bumpScale={.018} roughness={.93} /></RoundedBox>
      <mesh position={[0,.7,-bedD*.46]} castShadow><boxGeometry args={[bedW,.84,.13]} /><meshPhysicalMaterial color="#756B64" roughness={.85} /></mesh>
      {[-.28,.28].map((p) => <RoundedBox key={p} args={[bedW*.35,.34,.2]} radius={.07} smoothness={4} position={[p*bedW,.72,-bedD*.39]} castShadow><meshPhysicalMaterial color="#EEE7DC" roughness={.96} /></RoundedBox>)}
      <RoundedBox args={[bedW*.3,.23,.16]} radius={.055} smoothness={4} position={[0,.72,-bedD*.27]}><meshPhysicalMaterial color="#A16E48" roughness={.86} /></RoundedBox>
    </group>

    {[-1,1].map((side) => <group key={side} position={[side*Math.min(roomWidth/2-.52,1.85),.39,-roomDepth/2+.72]}><RoundedBox args={[.62,.52,.55]} radius={.055} smoothness={4} castShadow><meshPhysicalMaterial color="#563A2B" roughness={.72} /></RoundedBox><mesh position={[0,.5,0]}><cylinderGeometry args={[.12,.17,.25,22]} /><meshPhysicalMaterial color="#D2C1A7" roughness={.7} /></mesh><pointLight position={[0,.72,.08]} color="#FFB566" intensity={1.65} distance={3.5} /></group>)}

    <group position={[-roomWidth/2+.65,.46,roomDepth/2-1]}><RoundedBox args={[.85,.52,.8]} radius={.16} smoothness={5} castShadow><meshPhysicalMaterial color="#A89B8F" roughness={.86} /></RoundedBox><RoundedBox args={[.76,.46,.16]} radius={.09} smoothness={4} position={[0,.42,-.31]}><meshPhysicalMaterial color="#9B8F84" roughness={.86} /></RoundedBox></group>
    <DecorativePlant position={[-roomWidth/2+.42,.2,-roomDepth/2+1.1]} /><DecorativePlant position={[roomWidth/2-.42,.2,roomDepth/2-1.05]} />

    <AirUnit option={option} mode={mode} fanSpeed={fanSpeed} eco={eco} roomDepth={roomDepth} roomHeight={roomHeight} /><Airflow mode={mode} fanSpeed={fanSpeed} eco={eco} roomDepth={roomDepth} roomHeight={roomHeight} />

    <mesh position={[0,roomHeight-.08,-roomDepth/2+.1]}><boxGeometry args={[roomWidth*.82,.025,.035]} /><meshStandardMaterial color="#F2A35E" emissive="#F2A35E" emissiveIntensity={4} toneMapped={false} /></mesh>
    <mesh position={[roomWidth/2-.08,roomHeight-.08,0]}><boxGeometry args={[.025,.035,roomDepth*.76]} /><meshStandardMaterial color="#E79451" emissive="#E79451" emissiveIntensity={3.6} toneMapped={false} /></mesh>
    <hemisphereLight args={['#FFD5AF','#5A4233',.85]} /><directionalLight position={[-roomWidth*.6,roomHeight+2.8,roomDepth*.35]} intensity={2.8} color="#FFD0A0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-.0003} />
    <rectAreaLight position={[-roomWidth/2+.25,roomHeight*.62,.2]} rotation={[0,Math.PI/2,0]} width={Math.min(roomDepth*.7,3.4)} height={1.5} intensity={4.4} color="#FFB06D" />
    <spotLight position={[roomWidth*.26,roomHeight-.1,.1]} intensity={2.3} angle={.52} penumbra={.84} color="#FFC582" castShadow /><spotLight position={[-roomWidth*.22,roomHeight-.1,.95]} intensity={1.55} angle={.58} penumbra={.9} color="#FFE0B2" />
    <ContactShadows position={[0,.014,0]} opacity={.32} scale={Math.max(roomWidth,roomDepth)} blur={2.4} far={roomHeight+1} />
  </group>;
}

function Avatar({ speed }: { speed: React.MutableRefObject<number> }) {
  const leftLeg = useRef<THREE.Group>(null); const rightLeg = useRef<THREE.Group>(null); const leftArm = useRef<THREE.Group>(null); const rightArm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const a = Math.sin(clock.elapsedTime * 8) * .48 * Math.min(1, speed.current * 2.2); if (leftLeg.current) leftLeg.current.rotation.x = a; if (rightLeg.current) rightLeg.current.rotation.x = -a; if (leftArm.current) leftArm.current.rotation.x = -a*.7; if (rightArm.current) rightArm.current.rotation.x = a*.7; });
  return <group>
    <mesh position={[0,1.55,0]} castShadow><sphereGeometry args={[.16,24,18]} /><meshPhysicalMaterial color="#B98262" roughness={.72} /></mesh>
    <mesh position={[0,1.38,-.035]} scale={[1,.45,1]} castShadow><sphereGeometry args={[.18,20,14]} /><meshStandardMaterial color="#171A1E" roughness={.8} /></mesh>
    <RoundedBox args={[.46,.72,.25]} radius={.12} smoothness={5} position={[0,1.03,0]} castShadow><meshPhysicalMaterial color="#15181C" roughness={.74} /></RoundedBox>
    <group ref={leftArm} position={[-.29,1.24,0]}><mesh position={[0,-.28,0]} castShadow><capsuleGeometry args={[.075,.48,6,12]} /><meshPhysicalMaterial color="#171A1E" roughness={.78} /></mesh></group>
    <group ref={rightArm} position={[.29,1.24,0]}><mesh position={[0,-.28,0]} castShadow><capsuleGeometry args={[.075,.48,6,12]} /><meshPhysicalMaterial color="#171A1E" roughness={.78} /></mesh></group>
    <group ref={leftLeg} position={[-.12,.68,0]}><mesh position={[0,-.36,0]} castShadow><capsuleGeometry args={[.085,.58,6,12]} /><meshPhysicalMaterial color="#22252A" roughness={.82} /></mesh><mesh position={[0,-.68,.08]} castShadow><boxGeometry args={[.18,.12,.34]} /><meshStandardMaterial color="#101216" roughness={.7} /></mesh></group>
    <group ref={rightLeg} position={[.12,.68,0]}><mesh position={[0,-.36,0]} castShadow><capsuleGeometry args={[.085,.58,6,12]} /><meshPhysicalMaterial color="#22252A" roughness={.82} /></mesh><mesh position={[0,-.68,.08]} castShadow><boxGeometry args={[.18,.12,.34]} /><meshStandardMaterial color="#101216" roughness={.7} /></mesh></group>
  </group>;
}

function ThirdPersonController({ move, roomWidth, roomDepth, roomHeight }: { move: MoveState; roomWidth: number; roomDepth: number; roomHeight: number }) {
  const { camera, gl, size } = useThree(); const avatar = useRef<THREE.Group>(null); const speedRef = useRef(0); const yaw = useRef(Math.PI); const pitch = useRef(.18); const drag = useRef(false); const last = useRef({ x: 0, y: 0 }); const keys = useRef(new Set<string>()); const physics = useRef<{ world: CANNON.World; body: CANNON.Body } | null>(null);
  useEffect(() => {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0,0,0) }); world.broadphase = new CANNON.SAPBroadphase(world);
    const body = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(0,.3,roomDepth/2-1.15), linearDamping: .75 }); body.addShape(new CANNON.Sphere(.24)); world.addBody(body);
    const addBox = (half: [number,number,number], pos: [number,number,number]) => { const b = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(...pos) }); b.addShape(new CANNON.Box(new CANNON.Vec3(...half))); world.addBody(b); };
    addBox([.08,1,roomDepth/2],[-roomWidth/2,1,0]); addBox([.08,1,roomDepth/2],[roomWidth/2,1,0]); addBox([roomWidth/2,1,.08],[0,1,-roomDepth/2]);
    const bedW = Math.min(2.5,roomWidth*.58); const bedD = Math.min(1.95,roomDepth*.43); addBox([bedW/2+.12,.45,bedD/2+.12],[0,.45,-roomDepth/2+bedD/2+.42]);
    physics.current = { world, body }; return () => { physics.current = null; };
  }, [roomDepth, roomWidth]);
  useEffect(() => {
    camera.rotation.order = 'YXZ'; const canvas = gl.domElement;
    const kd = (e: KeyboardEvent) => keys.current.add(e.code); const ku = (e: KeyboardEvent) => keys.current.delete(e.code);
    const down = (e: PointerEvent) => { drag.current = true; last.current = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); };
    const up = () => { drag.current = false; };
    const look = (e: PointerEvent) => { if (!drag.current) return; const dx = e.clientX-last.current.x; const dy = e.clientY-last.current.y; last.current = { x:e.clientX,y:e.clientY }; yaw.current -= dx*.004; pitch.current = clamp(pitch.current+dy*.003,-.12,.62); };
    window.addEventListener('keydown',kd); window.addEventListener('keyup',ku); canvas.addEventListener('pointerdown',down); canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up); canvas.addEventListener('pointermove',look);
    return () => { window.removeEventListener('keydown',kd); window.removeEventListener('keyup',ku); canvas.removeEventListener('pointerdown',down); canvas.removeEventListener('pointerup',up); canvas.removeEventListener('pointercancel',up); canvas.removeEventListener('pointermove',look); };
  }, [camera,gl]);
  useFrame((_,delta) => {
    const p = physics.current; if (!p || !avatar.current) return; const z = (keys.current.has('KeyW')||move.forward?1:0)-(keys.current.has('KeyS')||move.back?1:0); const x = (keys.current.has('KeyD')||move.right?1:0)-(keys.current.has('KeyA')||move.left?1:0);
    const input = new THREE.Vector3(x,0,-z); speedRef.current = THREE.MathUtils.damp(speedRef.current,input.length(),7,delta);
    if (input.lengthSq()>0) { input.normalize(); input.applyAxisAngle(new THREE.Vector3(0,1,0),yaw.current); const speed = 1.6; p.body.velocity.x = input.x*speed; p.body.velocity.z = input.z*speed; const targetRot = Math.atan2(input.x,input.z); avatar.current.rotation.y = THREE.MathUtils.damp(avatar.current.rotation.y,targetRot,10,delta); } else { p.body.velocity.x *= .74; p.body.velocity.z *= .74; }
    p.body.velocity.y=0; p.world.step(1/60,Math.min(delta,.05),3); p.body.position.y=.3; avatar.current.position.set(p.body.position.x,0,p.body.position.z);
    const target = new THREE.Vector3(p.body.position.x,1.08,p.body.position.z); const mobile = size.width<700; const distance = mobile ? 4.55 : 4.15; const height = mobile ? 2.2 : 1.95; const offset = new THREE.Vector3(Math.sin(yaw.current)*distance,height+pitch.current*1.5,Math.cos(yaw.current)*distance); const desired = target.clone().add(offset); camera.position.lerp(desired,1-Math.exp(-delta*5.5)); camera.lookAt(target.x,target.y+.12,target.z);
  });
  return <group ref={avatar}><Avatar speed={speedRef} /></group>;
}

function MovePad({ setMove }: { setMove: Dispatch<SetStateAction<MoveState>> }) {
  const press = (key: keyof MoveState,value:boolean) => setMove((s)=>({...s,[key]:value})); const b=(key:keyof MoveState,label:string,col:string,row:string)=><button onPointerDown={()=>press(key,true)} onPointerUp={()=>press(key,false)} onPointerCancel={()=>press(key,false)} onPointerLeave={()=>press(key,false)} className={`${col} ${row} grid place-items-center rounded-full bg-white/10 text-white/78 active:bg-[#F5871F] active:text-black`}>{label}</button>;
  return <div className="pointer-events-auto absolute bottom-[168px] left-3 z-40 grid h-[104px] w-[104px] grid-cols-3 grid-rows-3 gap-1 rounded-full border border-white/14 bg-black/38 p-2 shadow-2xl backdrop-blur-xl md:hidden">{b('forward','↑','col-start-2','row-start-1')}{b('left','←','col-start-1','row-start-2')}<span className="col-start-2 row-start-2 grid place-items-center"><Move className="h-4 w-4 text-white/28" /></span>{b('right','→','col-start-3','row-start-2')}{b('back','↓','col-start-2','row-start-3')}</div>;
}

function AirThumb({ option, selected }: { option: AirOption; selected: boolean }) {
  const bodyW = option.cap===9000?72:option.cap===12000?78:option.cap===18000?86:92;
  return <div className="relative mx-auto h-[48px] w-[104px]"><svg viewBox="0 0 110 50" className="h-full w-full drop-shadow-[0_9px_12px_rgba(0,0,0,.28)]" aria-hidden="true"><defs><linearGradient id={`ac-${option.cap}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff"/><stop offset=".72" stopColor="#e9e7e2"/><stop offset="1" stopColor="#c7c8ca"/></linearGradient></defs><rect x={(110-bodyW)/2} y="8" width={bodyW} height="25" rx="7" fill={`url(#ac-${option.cap})`} stroke={selected?'#F5B76F':'#ffffff55'} strokeWidth={selected?1.8:.8}/><rect x={(110-bodyW*.78)/2} y="29" width={bodyW*.78} height="5" rx="2.5" fill="#25292e"/><path d={`M ${(110-bodyW*.68)/2} 31 Q 55 39 ${(110+bodyW*.68)/2} 31`} fill="none" stroke="#7a7d80" strokeWidth="1"/><circle cx={55+bodyW*.27} cy="19" r="1.4" fill={selected?'#65E58C':'#9fa3a8'}/></svg></div>;
}

function ClimatePanel({ compact=false, temperature,setTemperature,fanSpeed,setFanSpeed,mode,setMode,eco,setEco,sound,setSound,monthlyKwh,monthlyCost }: { compact?:boolean; temperature:number; setTemperature:(v:number)=>void; fanSpeed:number; setFanSpeed:(v:number)=>void; mode:ClimateMode; setMode:(v:ClimateMode)=>void; eco:boolean; setEco:(v:boolean)=>void; sound:boolean; setSound:(v:boolean)=>void; monthlyKwh:number; monthlyCost:number }) {
  const body=<div className="space-y-3"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><Thermometer className="h-4 w-4 text-[#F5B76F]"/><b className="text-sm">Control de clima</b></span><b className="text-3xl">{temperature}°</b></div><input type="range" min={16} max={28} value={temperature} onChange={(e)=>setTemperature(Number(e.target.value))} className="w-full accent-[#F5871F]"/><div><small className="text-[8px] font-black uppercase text-white/35">Modo</small><div className="mt-2 grid grid-cols-4 gap-1.5">{(['frio','ventilacion','seco','auto'] as ClimateMode[]).map((item)=><button key={item} onClick={()=>setMode(item)} className={`rounded-xl border py-2 text-[8px] font-black ${mode===item?'border-white/22 bg-white/12 text-white':'border-white/6 bg-white/[.035] text-white/38'}`} style={mode===item?{boxShadow:`inset 0 -2px ${MODE_META[item].color}`} : undefined}>{MODE_META[item].label}</button>)}</div></div><div><small className="text-[8px] font-black uppercase text-white/35">Ventilador</small><div className="mt-2 grid grid-cols-4 gap-1.5">{[1,2,3,4].map((v)=><button key={v} onClick={()=>setFanSpeed(v)} className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-[9px] font-black ${fanSpeed===v?'border-[#72D9FF]/40 bg-[#72D9FF]/12 text-[#72D9FF]':'border-white/6 bg-white/[.035] text-white/38'}`}><Fan className="h-3 w-3"/>{v}</button>)}</div></div><div className="grid grid-cols-2 gap-2"><button onClick={()=>setEco(!eco)} className={`rounded-xl border py-2.5 text-[9px] font-black ${eco?'border-[#75DE9A]/35 bg-[#75DE9A]/12 text-[#75DE9A]':'border-white/7 bg-white/[.035] text-white/40'}`}><Leaf className="mr-1 inline h-3.5 w-3.5"/>Ahorro</button><button onClick={()=>setSound(!sound)} className={`rounded-xl border py-2.5 text-[9px] font-black ${sound?'border-[#F5B76F]/35 bg-[#F5B76F]/10 text-[#F5B76F]':'border-white/7 bg-white/[.035] text-white/40'}`}>{sound?<Speaker className="mr-1 inline h-3.5 w-3.5"/>:<VolumeX className="mr-1 inline h-3.5 w-3.5"/>}Sonido</button></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-white/6 p-2.5"><small className="text-[8px] text-white/35">Consumo</small><b className="block">{Math.round(monthlyKwh)} kWh</b></div><div className="rounded-xl bg-white/6 p-2.5"><small className="text-[8px] text-white/35">Estimado</small><b className="block">{money.format(monthlyCost)}</b></div></div></div>;
  return compact?body:<Glass className="pointer-events-auto rounded-[1.8rem] p-4">{body}</Glass>;
}

function Intro({ step }: { step:number }) {
  const items=[{icon:<Gamepad2 className="h-5 w-5"/>,title:'Explora como un juego',text:'Muévete por una habitación 3D construida con tus medidas.'},{icon:<Calculator className="h-5 w-5"/>,title:'Calcula dentro del mundo',text:'El espacio cambia y recomienda la capacidad BTU.'},{icon:<Wind className="h-5 w-5"/>,title:'Prueba el clima',text:'Cambia equipo, temperatura, modo y ventilación.'}]; const current=items[Math.min(step,2)];
  return <div className="absolute inset-0 z-[100] grid place-items-center bg-[#090A0C] px-5 text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(245,135,31,.2),transparent_38%)]"/><div className="relative max-w-md text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl border border-[#F5B76F]/25 bg-[#F5871F]/12 text-[#F5B76F]">{current.icon}</div><small className="mt-5 block text-[9px] font-black uppercase tracking-[.22em] text-[#F5B76F]">Fabrick Game View</small><h1 className="mt-2 text-2xl font-black sm:text-3xl">{current.title}</h1><p className="mt-2 text-xs leading-6 text-white/48">{current.text}</p><div className="mx-auto mt-7 h-1 w-[220px] overflow-hidden rounded-full bg-white/8"><div className="h-full animate-[introbar_3s_linear_forwards] rounded-full bg-gradient-to-r from-[#F5871F] via-[#F5B76F] to-[#75DE9A]"/></div></div><style>{`@keyframes introbar{from{width:0}to{width:100%}}`}</style></div>;
}

export default function AirGameExperienceV3() {
  const router=useRouter(); const [length,setLength]=useState(5.4); const [width,setWidth]=useState(4.4); const [height,setHeight]=useState(2.7); const [people,setPeople]=useState(2); const [selectedCap,setSelectedCap]=useState<Capacity>(12000); const [temperature,setTemperature]=useState(22); const [fanSpeed,setFanSpeed]=useState(2); const [mode,setMode]=useState<ClimateMode>('frio'); const [eco,setEco]=useState(true); const [sound,setSound]=useState(false); const [panel,setPanel]=useState<Panel>(null); const [move,setMove]=useState<MoveState>({forward:false,back:false,left:false,right:false}); const [intro,setIntro]=useState(true); const [introStep,setIntroStep]=useState(0);
  useFanAudio(sound,fanSpeed,mode,eco); useEffect(()=>{const a=window.setTimeout(()=>setIntroStep(1),1000);const b=window.setTimeout(()=>setIntroStep(2),2000);const c=window.setTimeout(()=>setIntro(false),3000);return()=>{clearTimeout(a);clearTimeout(b);clearTimeout(c);};},[]);
  const calc=useMemo(()=>{const area=length*width; const volume=area*height; const requiredBtu=Math.ceil(area*600+volume*55+people*600+350*3.412); const recommended=(OPTIONS.find((o)=>o.cap>=requiredBtu)?.cap||24000) as Capacity; const option=OPTIONS.find((o)=>o.cap===selectedCap)||OPTIONS[1]; const tempFactor=temperature<=18?.82:temperature<=20?.68:temperature<=22?.56:temperature<=24?.46:.38; const fanFactor=.88+fanSpeed*.04; const monthlyKwh=option.powerKw*tempFactor*fanFactor*MODE_META[mode].factor*(eco?.78:1)*4*30; return {area,volume,requiredBtu,recommended,option,monthlyKwh,monthlyCost:Math.round(monthlyKwh*ENERGY_REFERENCE)};},[eco,fanSpeed,height,length,mode,people,selectedCap,temperature,width]);
  useEffect(()=>setSelectedCap(calc.recommended),[calc.recommended]); const roomWidth=clamp(width,2.8,7.5); const roomDepth=clamp(length,3.2,8.5); const roomHeight=clamp(height,2.2,3.6); const shift=(d:-1|1)=>{const i=OPTIONS.findIndex((o)=>o.cap===selectedCap);setSelectedCap(OPTIONS[(i+d+OPTIONS.length)%OPTIONS.length].cap);};
  return <main className="relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#111214] text-white">
    {intro?<Intro step={introStep}/>:null}
    <div className="absolute inset-0"><Canvas shadows dpr={[1,2]} camera={{fov:62,near:.05,far:80}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.12;gl.outputColorSpace=THREE.SRGBColorSpace;gl.shadowMap.type=THREE.PCFSoftShadowMap;}}><color attach="background" args={['#18130F']}/><fog attach="fog" args={['#18130F',10,24]}/><StudioEnvironment/><DynamicRoom roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight} option={calc.option} mode={mode} fanSpeed={fanSpeed} eco={eco}/><ThirdPersonController move={move} roomWidth={roomWidth} roomDepth={roomDepth} roomHeight={roomHeight}/><PostFX/></Canvas></div>
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,5,5,.28),transparent_26%,transparent_68%,rgba(5,5,6,.72))]"/>

    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-2 p-3 sm:p-5"><div className="pointer-events-auto flex items-center gap-2"><button onClick={()=>navigateWithTransition('/tienda',router)} className="grid h-11 w-11 place-items-center rounded-full border border-white/14 bg-black/38 backdrop-blur-xl"><ArrowLeft className="h-4 w-4"/></button><Glass className="rounded-full px-3.5 py-2"><small className="block text-[7px] font-black uppercase tracking-[.18em] text-[#F5B76F]">Calculadora 3D · Game View</small><b className="block text-[10px]">{numText(calc.area)} m² · {integer.format(calc.requiredBtu)} BTU</b></Glass></div><div className="pointer-events-auto"><button onClick={()=>setSound(!sound)} className={`grid h-11 w-11 place-items-center rounded-full border backdrop-blur-xl ${sound?'border-[#75DE9A]/40 bg-[#75DE9A]/15 text-[#75DE9A]':'border-white/14 bg-black/38 text-white/70'}`}>{sound?<Speaker className="h-4 w-4"/>:<VolumeX className="h-4 w-4"/>}</button></div></header>

    <aside className="pointer-events-none absolute left-5 top-[112px] z-30 hidden w-[270px] lg:block"><Glass className="pointer-events-auto rounded-[1.65rem] p-3.5"><div className="mb-3 flex items-center gap-2"><Calculator className="h-4 w-4 text-[#F5B76F]"/><div><b className="block text-xs">Dimensiones del espacio</b><small className="text-[8px] text-white/35">La habitación cambia en vivo</small></div></div><div className="space-y-1.5"><Field label="Largo" value={length} suffix="m" onChange={setLength}/><Field label="Ancho" value={width} suffix="m" onChange={setWidth}/><Field label="Alto" value={height} suffix="m" onChange={setHeight}/><Field label="Personas" value={people} step={1} onChange={setPeople}/></div><div className="mt-2.5 flex items-center justify-between rounded-xl bg-[#F5871F] px-3 py-2.5 text-black"><span className="text-[8px] font-black uppercase">Recomendado</span><b className="text-sm">{integer.format(calc.recommended)} BTU</b></div></Glass></aside>
    <aside className="pointer-events-none absolute right-5 top-[112px] z-30 hidden w-[276px] lg:block"><ClimatePanel temperature={temperature} setTemperature={setTemperature} fanSpeed={fanSpeed} setFanSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} monthlyKwh={calc.monthlyKwh} monthlyCost={calc.monthlyCost}/></aside>

    <div className="pointer-events-auto absolute right-3 top-[70px] z-40 flex gap-2 lg:hidden"><button onClick={()=>setPanel(panel==='measure'?null:'measure')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl ${panel==='measure'?'border-[#F5B76F]/50 bg-[#F5871F]/18 text-[#F5B76F]':'border-white/14 bg-black/38'}`}><Calculator className="h-4 w-4"/></button><button onClick={()=>setPanel(panel==='climate'?null:'climate')} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl ${panel==='climate'?'border-[#72D9FF]/45 bg-[#72D9FF]/12 text-[#72D9FF]':'border-white/14 bg-black/38'}`}><Thermometer className="h-4 w-4"/></button></div>
    {panel?<div className="pointer-events-auto absolute inset-x-3 top-[122px] z-50 lg:hidden"><Glass className="mx-auto max-w-md rounded-[1.55rem] p-3.5"><div className="mb-3 flex items-center justify-between"><b className="text-xs">{panel==='measure'?'Dimensiones del espacio':'Control de clima'}</b><button onClick={()=>setPanel(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7"><X className="h-3.5 w-3.5"/></button></div>{panel==='measure'?<><div className="grid grid-cols-2 gap-1.5"><Field label="Largo" value={length} suffix="m" onChange={setLength}/><Field label="Ancho" value={width} suffix="m" onChange={setWidth}/><Field label="Alto" value={height} suffix="m" onChange={setHeight}/><Field label="Personas" value={people} step={1} onChange={setPeople}/></div><div className="mt-2.5 rounded-xl bg-[#F5871F] px-3 py-2.5 text-center text-xs font-black text-black">{numText(calc.area)} m² · {integer.format(calc.recommended)} BTU</div></>:<ClimatePanel compact temperature={temperature} setTemperature={setTemperature} fanSpeed={fanSpeed} setFanSpeed={setFanSpeed} mode={mode} setMode={setMode} eco={eco} setEco={setEco} sound={sound} setSound={setSound} monthlyKwh={calc.monthlyKwh} monthlyCost={calc.monthlyCost}/>}</Glass></div>:null}

    <div className="pointer-events-none absolute left-1/2 top-[80px] z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] text-white/46 backdrop-blur-xl"><span className="inline-flex items-center gap-1.5"><Gamepad2 className="h-3.5 w-3.5 text-[#F5B76F]"/>WASD / joystick · arrastra para girar cámara</span></div>
    <MovePad setMove={setMove}/>

    <div className="pointer-events-none absolute bottom-[176px] right-3 z-30 hidden h-[88px] w-[88px] rounded-full border border-white/14 bg-black/34 p-2 backdrop-blur-xl sm:block lg:hidden"><div className="grid h-full place-items-center rounded-full border border-white/8"><span className="text-[8px] font-black text-white/45">N</span><span className="absolute top-1/2 h-4 w-3 -translate-y-1/2 bg-[#F5A55F] [clip-path:polygon(50%_0,100%_100%,50%_72%,0_100%)]"/></div></div>

    <section className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center px-2.5 sm:bottom-5 sm:px-4"><Glass className="pointer-events-auto w-full max-w-[860px] rounded-[1.55rem] p-2"><div className="flex items-center gap-1.5"><button onClick={()=>shift(-1)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full bg-white/7 sm:w-11"><ChevronLeft className="h-4 w-4"/></button><div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-w-max gap-2">{OPTIONS.map((option)=>{const selected=option.cap===selectedCap;const ideal=option.cap===calc.recommended;return <button key={option.cap} onClick={()=>setSelectedCap(option.cap)} className={`min-w-[118px] rounded-[1.05rem] border px-2.5 pb-2.5 pt-1.5 text-left sm:min-w-[152px] ${selected?'border-[#F7B260]/80 bg-[linear-gradient(180deg,rgba(245,135,31,.34),rgba(245,135,31,.14))] shadow-[0_0_32px_rgba(245,135,31,.28)]':'border-white/8 bg-white/[.055]'}`}><AirThumb option={option} selected={selected}/><div className="mt-0.5 flex items-end justify-between gap-2"><div><b className={`block text-sm sm:text-base ${selected?'text-[#F5B76F]':'text-white'}`}>{option.label}</b><span className="mt-1 flex items-center gap-1 text-[8px] text-white/48"><Leaf className="h-3 w-3" style={{color:option.energyColor}}/>{ideal?'Ideal para ti':option.benefit}</span></div><span className="rounded-full px-1.5 py-1 text-[8px] font-black" style={{color:option.energyColor,background:`${option.energyColor}16`}}>{option.energy}</span></div></button>})}</div></div><button onClick={()=>shift(1)} className="grid h-11 w-9 shrink-0 place-items-center rounded-full bg-white/7 sm:w-11"><ChevronRight className="h-4 w-4"/></button></div></Glass></section>
  </main>;
}
