'use client';

import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ObservatoryData, ServiceId, ObservatoryEvent } from './useObservatoryData';

interface PlanetData {
  id: ServiceId | 'analytics' | 'usuarios';
  name: string;
  color: string;
  ringColor: string;
  orbitRadius: number;
  orbitSpeed: number;
  size: number;
  hasRings: boolean;
  moons: number;
  label: string;
}

// InsForge es ahora el centro (sol) del sistema porque es el backend del cual
// dependen el resto de servicios.
const PLANETS: PlanetData[] = [
  { id: 'insforge',    name: 'INSFORGE',    color: '#facc15', ringColor: '#f59e0b', orbitRadius: 0,   orbitSpeed: 0,    size: 18,  hasRings: false, moons: 0, label: 'INSFORGE_CORE' },
  { id: 'vercel',      name: 'VERCEL',      color: '#4f8ef7', ringColor: '#2563eb', orbitRadius: 90,  orbitSpeed: 0.15, size: 8,   hasRings: true,  moons: 1, label: 'VERCEL_EDGE'   },
  { id: 'github',      name: 'GITHUB',      color: '#a855f7', ringColor: '#7c3aed', orbitRadius: 140, orbitSpeed: 0.11, size: 7,   hasRings: false, moons: 0, label: 'GITHUB_SOURCE' },
  { id: 'mercadopago', name: 'MERCADOPAGO', color: '#22c55e', ringColor: '#16a34a', orbitRadius: 195, orbitSpeed: 0.08, size: 10,  hasRings: true,  moons: 2, label: 'MERCADOPAGO'   },
  { id: 'cloudflare',  name: 'CLOUDFLARE',  color: '#06b6d4', ringColor: '#0891b2', orbitRadius: 250, orbitSpeed: 0.06, size: 8,   hasRings: false, moons: 1, label: 'CLOUDFLARE_CDN'},
  { id: 'analytics',   name: 'ANALYTICS',   color: '#ec4899', ringColor: '#db2777', orbitRadius: 300, orbitSpeed: 0.05, size: 6,   hasRings: false, moons: 0, label: 'ANALYTICS'     },
  { id: 'usuarios',    name: 'USUARIOS',    color: '#f97316', ringColor: '#ea580c', orbitRadius: 350, orbitSpeed: 0.04, size: 7,   hasRings: true,  moons: 0, label: 'USUARIOS_LIVE' },
];

const SPOKES = PLANETS.slice(1);

// Mapa estable id → ángulo orbital actualizado por el frame loop, así rockets y
// planetas comparten la misma posición (era un bug en la versión anterior).
const ORBIT_ANGLES: Record<string, number> = Object.fromEntries(
  SPOKES.map((p) => [p.id, Math.random() * Math.PI * 2]),
);

function useIsMobile() {
  const { viewport } = useThree();
  return viewport.width < 768;
}

// ── Star field ──────────────────────────────────────────────────────────────
function StarField() {
  const isMobile = useIsMobile();
  const count = isMobile ? 1200 : 3000;
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 800 + Math.random() * 600;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const warm = Math.random();
      arr[i * 3] = 0.8 + warm * 0.2;
      arr[i * 3 + 1] = 0.85 + warm * 0.1;
      arr[i * 3 + 2] = 1.0;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.003;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" array={colors} count={count} itemSize={3} args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={isMobile ? 1 : 1.5} vertexColors transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

// ── Nebula ──────────────────────────────────────────────────────────────────
function Nebula() {
  const isMobile = useIsMobile();
  const ref = useRef<THREE.Points>(null);
  const count = isMobile ? 200 : 500;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 600;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 300;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#facc15" size={isMobile ? 2 : 4} transparent opacity={0.04} sizeAttenuation />
    </points>
  );
}

// ── Orbit ring ──────────────────────────────────────────────────────────────
function OrbitRing({ radius, highlight }: { radius: number; highlight: boolean }) {
  const geo = useMemo(() => new THREE.RingGeometry(radius - 0.4, radius + 0.4, 128), [radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={geo} />
      <meshBasicMaterial
        color={highlight ? '#facc15' : '#ffffff'}
        transparent
        opacity={highlight ? 0.18 : 0.04}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Label texture ────────────────────────────────────────────────────────────
function makeLabelTex(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = 'rgba(6,6,16,0.85)';
  const r = 12;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(512 - r, 0);
  ctx.quadraticCurveTo(512, 0, 512, r);
  ctx.lineTo(512, 96 - r); ctx.quadraticCurveTo(512, 96, 512 - r, 96);
  ctx.lineTo(r, 96); ctx.quadraticCurveTo(0, 96, 0, 96 - r);
  ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 32px ui-monospace,Menlo,monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

// ── Planet ───────────────────────────────────────────────────────────────────
function Planet({
  planet,
  paused,
  speed,
  selected,
  onSelect,
}: {
  planet: PlanetData;
  paused: boolean;
  speed: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const isMobile = useIsMobile();
  const groupRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const labelTex = useMemo(() => makeLabelTex(planet.label, planet.color), [planet.label, planet.color]);
  useEffect(() => () => labelTex.dispose(), [labelTex]);

  // Reset cursor si el componente se desmonta mientras está en hover.
  useEffect(() => () => {
    if (typeof document !== 'undefined') document.body.style.cursor = '';
  }, []);

  const isHub = planet.orbitRadius === 0;
  const sphereSegments = isMobile ? 16 : 32;
  const targetScale = useRef(1);
  const currentScale = useRef(1);

  useFrame(({ clock, camera }, delta) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    if (!isHub && !paused) {
      const angle = ORBIT_ANGLES[planet.id] ?? 0;
      const next = angle + planet.orbitSpeed * 0.003 * speed;
      ORBIT_ANGLES[planet.id] = next;
      groupRef.current.position.x = Math.cos(next) * planet.orbitRadius;
      groupRef.current.position.z = Math.sin(next) * planet.orbitRadius;
    } else if (!isHub) {
      const angle = ORBIT_ANGLES[planet.id] ?? 0;
      groupRef.current.position.x = Math.cos(angle) * planet.orbitRadius;
      groupRef.current.position.z = Math.sin(angle) * planet.orbitRadius;
    }

    if (planetRef.current && !paused) {
      planetRef.current.rotation.y = t * 0.4 * speed;
    }

    if (labelRef.current) {
      const dx = camera.position.x - groupRef.current.position.x;
      const dz = camera.position.z - groupRef.current.position.z;
      labelRef.current.rotation.y = Math.atan2(dx, dz);
      labelRef.current.position.y = planet.size + 8 + Math.sin(t * 1.5) * 1.5;
    }

    // Smooth scale on hover/select
    targetScale.current = selected ? 1.35 : hovered ? 1.18 : 1;
    currentScale.current += (targetScale.current - currentScale.current) * Math.min(1, delta * 8);
    groupRef.current.scale.setScalar(currentScale.current);
  });

  return (
    <group ref={groupRef}>
      <mesh
        ref={planetRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); onSelect(planet.id); }}
      >
        <sphereGeometry args={[planet.size, sphereSegments, sphereSegments]} />
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.color}
          emissiveIntensity={isHub ? 0.5 : selected ? 0.5 : hovered ? 0.35 : 0.2}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {planet.hasRings && (
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <ringGeometry args={[planet.size * 1.5, planet.size * 2.2, isMobile ? 32 : 64]} />
          <meshBasicMaterial color={planet.ringColor} transparent opacity={selected ? 0.55 : 0.35} side={THREE.DoubleSide} />
        </mesh>
      )}

      <mesh>
        <sphereGeometry args={[planet.size * (selected ? 1.2 : 1.08), isMobile ? 16 : 32, isMobile ? 16 : 32]} />
        <meshBasicMaterial color={planet.color} transparent opacity={selected ? 0.16 : 0.07} side={THREE.BackSide} />
      </mesh>

      <pointLight color={planet.color} intensity={isHub ? 3 : selected ? 2.2 : 1.2} distance={isHub ? 300 : 120} />

      <mesh ref={labelRef} position={[0, planet.size + 8, 0]}>
        <planeGeometry args={[planet.size * 6, planet.size * 1.5]} />
        <meshBasicMaterial map={labelTex} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {Array.from({ length: planet.moons }).map((_, mi) => (
        <Moon key={mi} parentSize={planet.size} index={mi} color={planet.color} isMobile={isMobile} paused={paused} speed={speed} />
      ))}
    </group>
  );
}

// ── Moon ─────────────────────────────────────────────────────────────────────
function Moon({ parentSize, index, color, isMobile, paused, speed }: { parentSize: number; index: number; color: string; isMobile: boolean; paused: boolean; speed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = (index + 1) * 0.8;
  const baseSpeed = 1.2 + index * 0.4;
  const radius = parentSize * (1.8 + index * 0.7);
  const angle = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (!paused) angle.current += delta * baseSpeed * speed;
    const t = angle.current + offset;
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.3) * 2, Math.sin(t) * radius);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[parentSize * 0.22, isMobile ? 8 : 16, isMobile ? 8 : 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.8} />
    </mesh>
  );
}

// ── Rocket (continuous data packet) ──────────────────────────────────────────
function Rocket({
  target,
  paused,
  speed,
  isReal,
  realColor,
  onLog,
  onArrive,
}: {
  target: PlanetData;
  paused: boolean;
  speed: number;
  isReal?: boolean;
  realColor?: string;
  onLog: (msg: string, color: string, service?: ServiceId) => void;
  onArrive?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.Points>(null);
  const progress = useRef(isReal ? 0 : Math.random());
  const dir = useRef<1 | -1>(isReal ? 1 : Math.random() > 0.5 ? 1 : -1);
  const baseSpeed = useRef(0.18 + Math.random() * 0.12);
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;

  const trailPositions = useMemo(() => new Float32Array(12 * 3), []);

  const color = realColor ?? target.color;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (paused) return;

    progress.current += delta * baseSpeed.current * dir.current * speed * (isReal ? 1.6 : 1);

    if (progress.current >= 1) {
      progress.current = 1;
      if (isReal) {
        onLogRef.current(`DELIVERED → ${target.label}`, color, target.id as ServiceId);
        onArriveRef.current?.();
        return;
      }
      dir.current = -1;
      onLogRef.current(`DATA_DELIVERED → ${target.label}`, color, target.id as ServiceId);
    } else if (progress.current <= 0) {
      progress.current = 0; dir.current = 1;
      onLogRef.current(`REQUEST_SENT ← ${target.label}`, color, target.id as ServiceId);
    }

    // Hub (InsForge) → planet usando el ángulo compartido.
    const angle = ORBIT_ANGLES[target.id] ?? 0;
    const tx = Math.cos(angle) * target.orbitRadius;
    const tz = Math.sin(angle) * target.orbitRadius;

    const t = progress.current;
    const mx = tx / 2;
    const mz = tz / 2;
    const my = 40 + target.orbitRadius * 0.3;

    const x = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * mx + t * t * tx;
    const y = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * my + t * t * 0;
    const z = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * mz + t * t * tz;

    groupRef.current.position.set(x, y, z);

    const dt = 0.01;
    const t2 = Math.min(t + dt, 1);
    const nx = 2 * (1 - t2) * t2 * mx + t2 * t2 * tx;
    const ny = 2 * (1 - t2) * t2 * my;
    const nz = 2 * (1 - t2) * t2 * mz + t2 * t2 * tz;
    const forward = new THREE.Vector3(nx - x, ny - y, nz - z).normalize();
    if (dir.current === -1) forward.negate();
    groupRef.current.lookAt(groupRef.current.position.clone().add(forward));

    if (trailRef.current) {
      const pos = trailRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 11; i > 0; i--) {
        arr[i * 3] = arr[(i - 1) * 3];
        arr[i * 3 + 1] = arr[(i - 1) * 3 + 1];
        arr[i * 3 + 2] = arr[(i - 1) * 3 + 2];
      }
      arr[0] = x; arr[1] = y; arr[2] = z;
      pos.needsUpdate = true;
    }
  });

  const scale = isReal ? 1.6 : 1;

  return (
    <group ref={groupRef} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 1.5, 5, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isReal ? 1.2 : 0.8} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.8, 3, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <pointLight color={color} intensity={isReal ? 3 : 1.5} distance={isReal ? 40 : 20} position={[0, 0, -3]} />
      <mesh position={[0, 0, -3]}>
        <sphereGeometry args={[isReal ? 1.6 : 1.2, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={trailPositions} count={12} itemSize={3} args={[trailPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={isReal ? 3 : 2} transparent opacity={isReal ? 0.85 : 0.5} sizeAttenuation />
      </points>
    </group>
  );
}

// ── Sun (InsForge core) ─────────────────────────────────────────────────────
function Sun({ paused, speed, onSelect }: { paused: boolean; speed: number; onSelect: () => void }) {
  const isMobile = useIsMobile();
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  // Reset cursor si se desmonta mientras está en hover.
  useEffect(() => () => {
    if (typeof document !== 'undefined') document.body.style.cursor = '';
  }, []);
  useFrame(({ clock }) => {
    if (ref.current && !paused) ref.current.rotation.y = clock.elapsedTime * 0.2 * speed;
  });
  return (
    <group>
      <mesh
        ref={ref}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <sphereGeometry args={[18, isMobile ? 32 : 64, isMobile ? 32 : 64]} />
        <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={hovered ? 2 : 1.5} roughness={1} metalness={0} />
      </mesh>
      {isMobile ? (
        <mesh>
          <sphereGeometry args={[24, 16, 16]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.04} side={THREE.BackSide} />
        </mesh>
      ) : (
        [24, 30, 38].map((r, i) => (
          <mesh key={r}>
            <sphereGeometry args={[r, 32, 32]} />
            <meshBasicMaterial color="#facc15" transparent opacity={0.04 - i * 0.01} side={THREE.BackSide} />
          </mesh>
        ))
      )}
      <pointLight color="#facc15" intensity={4} distance={600} />
    </group>
  );
}

// ── Camera intro + focus on selection ────────────────────────────────────────
function CameraController({ selectedService }: { selectedService: ServiceId | null }) {
  const { camera } = useThree();
  const t = useRef(0);
  const introDone = useRef(false);
  const start = useMemo(() => new THREE.Vector3(700, 400, 700), []);
  const end = useMemo(() => new THREE.Vector3(450, 250, 450), []);
  const initialized = useRef(false);
  const focusTarget = useRef(new THREE.Vector3(0, 0, 0));
  const desiredPos = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!initialized.current) {
      camera.position.copy(start);
      camera.lookAt(0, 0, 0);
      initialized.current = true;
    }
    if (!introDone.current) {
      t.current += delta / 4;
      if (t.current >= 1) { t.current = 1; introDone.current = true; }
      camera.position.lerpVectors(start, end, t.current);
      camera.lookAt(0, 0, 0);
      return;
    }

    // Selection focus: smoothly slide camera toward planet without forcing OrbitControls.
    if (selectedService) {
      const planet = PLANETS.find((p) => p.id === selectedService);
      if (planet) {
        if (planet.orbitRadius === 0) {
          focusTarget.current.set(0, 0, 0);
          desiredPos.current.set(180, 110, 180);
        } else {
          const angle = ORBIT_ANGLES[planet.id] ?? 0;
          const px = Math.cos(angle) * planet.orbitRadius;
          const pz = Math.sin(angle) * planet.orbitRadius;
          focusTarget.current.set(px, 0, pz);
          // posiciona la cámara un poco fuera del planeta hacia el sol.
          const len = Math.hypot(px, pz) || 1;
          const ox = (px / len) * (planet.orbitRadius + 80);
          const oz = (pz / len) * (planet.orbitRadius + 80);
          desiredPos.current.set(ox, 90, oz);
        }
        camera.position.lerp(desiredPos.current, Math.min(1, delta * 1.4));
        // Suaviza el lookAt
        const m = new THREE.Matrix4();
        m.lookAt(camera.position, focusTarget.current, new THREE.Vector3(0, 1, 0));
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m);
        camera.quaternion.slerp(targetQuat, Math.min(1, delta * 1.4));
      }
    }
  });
  return null;
}

// ── Real-event rocket manager ─────────────────────────────────────────────────
interface ActiveRealRocket {
  key: string;
  target: PlanetData;
  color: string;
}

function useRealRockets(events: ObservatoryEvent[]) {
  const [active, setActive] = useState<ActiveRealRocket[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // Ignorar el batch inicial (todos viejos)
      events.forEach((e) => seenIds.current.add(e.id));
      initialized.current = true;
      return;
    }
    const fresh = events.filter((e) => !seenIds.current.has(e.id) && e.kind !== 'sync' && e.kind !== 'info');
    if (fresh.length === 0) return;
    const adds: ActiveRealRocket[] = [];
    fresh.forEach((e) => {
      seenIds.current.add(e.id);
      const target = PLANETS.find((p) => p.id === e.service) ?? PLANETS[0];
      adds.push({ key: e.id, target, color: e.color });
    });
    setActive((prev) => [...prev, ...adds].slice(-12));
  }, [events]);

  const remove = (key: string) => setActive((prev) => prev.filter((r) => r.key !== key));
  return { active, remove };
}

// ── Scene ────────────────────────────────────────────────────────────────────
function Scene({
  data,
  onLog,
  onVehicleCount,
  paused,
  speed,
  selectedService,
  onSelectService,
}: {
  data: ObservatoryData;
  onLog: (msg: string, color: string, service?: ServiceId) => void;
  onVehicleCount: (n: number) => void;
  paused: boolean;
  speed: number;
  selectedService: ServiceId | null;
  onSelectService: (id: ServiceId | null) => void;
}) {
  const { scene } = useThree();
  const { active, remove } = useRealRockets(data.events);

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x000005, 0.0008);
    return () => { scene.fog = null; };
  }, [scene]);

  useEffect(() => {
    onVehicleCount(SPOKES.length + active.length);
  }, [onVehicleCount, active.length]);

  return (
    <>
      <CameraController selectedService={selectedService} />
      <OrbitControls
        enableDamping
        dampingFactor={0.04}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={100}
        maxDistance={1000}
        target={[0, 0, 0]}
        enabled={!selectedService}
      />

      <ambientLight intensity={0.05} />
      <directionalLight color="#ffffff" intensity={0.3} position={[200, 300, 200]} />

      <StarField />
      <Nebula />

      {SPOKES.map((p) => (
        <OrbitRing key={p.id} radius={p.orbitRadius} highlight={selectedService === p.id} />
      ))}

      <Sun paused={paused} speed={speed} onSelect={() => onSelectService(selectedService === 'insforge' ? null : 'insforge')} />

      {SPOKES.map((p) => (
        <Planet
          key={p.id}
          planet={p}
          paused={paused}
          speed={speed}
          selected={selectedService === p.id}
          onSelect={(id) => onSelectService(selectedService === id ? null : (id as ServiceId))}
        />
      ))}

      {SPOKES.map((p) => (
        <Rocket key={p.id} target={p} paused={paused} speed={speed} onLog={onLog} />
      ))}

      {active.map((r) => (
        <Rocket
          key={r.key}
          target={r.target}
          paused={paused}
          speed={speed}
          isReal
          realColor={r.color}
          onLog={onLog}
          onArrive={() => remove(r.key)}
        />
      ))}
    </>
  );
}

// ── Canvas wrapper ────────────────────────────────────────────────────────────
export default function ObservatoryScene({
  data,
  onLog,
  onVehicleCount,
  paused,
  speed,
  selectedService,
  onSelectService,
}: {
  data: ObservatoryData;
  onLog: (msg: string, color: string, service?: ServiceId) => void;
  onVehicleCount: (n: number) => void;
  paused: boolean;
  speed: number;
  selectedService: ServiceId | null;
  onSelectService: (id: ServiceId | null) => void;
}) {
  const getDPR = () => {
    if (typeof window === 'undefined') return 1;
    const isMobileView = window.innerWidth < 768;
    if (isMobileView) return 1;
    return Math.min(window.devicePixelRatio, 2);
  };

  return (
    <Canvas
      camera={{ position: [450, 250, 450], fov: 50, near: 1, far: 3000 }}
      dpr={getDPR()}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', precision: 'highp' }}
      style={{ width: '100%', height: '100%', background: '#00000a' }}
      onPointerMissed={() => onSelectService(null)}
    >
      <Scene
        data={data}
        onLog={onLog}
        onVehicleCount={onVehicleCount}
        paused={paused}
        speed={speed}
        selectedService={selectedService}
        onSelectService={onSelectService}
      />
    </Canvas>
  );
}
