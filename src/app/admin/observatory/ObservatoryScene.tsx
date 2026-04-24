'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ObservatoryData } from './useObservatoryData';

interface PlanetData {
  id: string;
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

const PLANETS: PlanetData[] = [
  { id: 'vercel',      name: 'VERCEL',      color: '#4f8ef7', ringColor: '#2563eb', orbitRadius: 0,   orbitSpeed: 0,    size: 14,  hasRings: false, moons: 0, label: 'VERCEL_HUB'    },
  { id: 'insforge',    name: 'INSFORGE',    color: '#22c55e', ringColor: '#16a34a', orbitRadius: 90,  orbitSpeed: 0.15, size: 8,   hasRings: true,  moons: 1, label: 'INSFORGE_DB'   },
  { id: 'github',      name: 'GITHUB',      color: '#a855f7', ringColor: '#7c3aed', orbitRadius: 140, orbitSpeed: 0.11, size: 7,   hasRings: false, moons: 0, label: 'GITHUB_SOURCE' },
  { id: 'mercadopago', name: 'MERCADOPAGO', color: '#facc15', ringColor: '#d97706', orbitRadius: 195, orbitSpeed: 0.08, size: 10,  hasRings: true,  moons: 2, label: 'MERCADOPAGO'   },
  { id: 'cloudflare',  name: 'CLOUDFLARE',  color: '#06b6d4', ringColor: '#0891b2', orbitRadius: 250, orbitSpeed: 0.06, size: 8,   hasRings: false, moons: 1, label: 'CLOUDFLARE_CDN'},
  { id: 'analytics',   name: 'ANALYTICS',   color: '#ec4899', ringColor: '#db2777', orbitRadius: 300, orbitSpeed: 0.05, size: 6,   hasRings: false, moons: 0, label: 'ANALYTICS'     },
  { id: 'usuarios',    name: 'USUARIOS',    color: '#f97316', ringColor: '#ea580c', orbitRadius: 350, orbitSpeed: 0.04, size: 7,   hasRings: true,  moons: 0, label: 'USUARIOS_LIVE'  },
];

const HUB = PLANETS[0];
const SPOKES = PLANETS.slice(1);

// ── Star field ───────────────────────────────────────────────────────────────
function StarField() {
  const count = 3000;
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 800 + Math.random() * 600;
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const warm = Math.random();
      arr[i * 3]     = 0.8 + warm * 0.2;
      arr[i * 3 + 1] = 0.85 + warm * 0.1;
      arr[i * 3 + 2] = 1.0;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.003;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" array={colors} count={count} itemSize={3} args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={1.5} vertexColors transparent opacity={0.9} sizeAttenuation />
    </points>
  );
}

// ── Nebula cloud ─────────────────────────────────────────────────────────────
function Nebula() {
  const ref = useRef<THREE.Points>(null);
  const count = 500;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 600;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 300;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.005;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#facc15" size={4} transparent opacity={0.04} sizeAttenuation />
    </points>
  );
}

// ── Orbit ring ───────────────────────────────────────────────────────────────
function OrbitRing({ radius }: { radius: number }) {
  const geo = useMemo(() => new THREE.RingGeometry(radius - 0.3, radius + 0.3, 128), [radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <primitive object={geo} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.04} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Label texture ─────────────────────────────────────────────────────────────
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

// ── Planet ────────────────────────────────────────────────────────────────────
function Planet({ planet }: { planet: PlanetData }) {
  const groupRef   = useRef<THREE.Group>(null);
  const planetRef  = useRef<THREE.Mesh>(null);
  const labelRef   = useRef<THREE.Mesh>(null);
  const angleRef   = useRef(Math.random() * Math.PI * 2);

  const labelTex = useMemo(() => makeLabelTex(planet.label, planet.color), [planet.label, planet.color]);
  useEffect(() => () => labelTex.dispose(), [labelTex]);

  const isHub = planet.orbitRadius === 0;

  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    if (!isHub) {
      angleRef.current += planet.orbitSpeed * 0.003;
      groupRef.current.position.x = Math.cos(angleRef.current) * planet.orbitRadius;
      groupRef.current.position.z = Math.sin(angleRef.current) * planet.orbitRadius;
    }

    if (planetRef.current) {
      planetRef.current.rotation.y = t * 0.4;
    }

    if (labelRef.current) {
      const dx = camera.position.x - groupRef.current.position.x;
      const dz = camera.position.z - groupRef.current.position.z;
      labelRef.current.rotation.y = Math.atan2(dx, dz);
      labelRef.current.position.y = planet.size + 8 + Math.sin(t * 1.5) * 1.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Planet body */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[planet.size, 64, 64]} />
        <meshStandardMaterial
          color={planet.color}
          emissive={planet.color}
          emissiveIntensity={isHub ? 0.5 : 0.2}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Rings */}
      {planet.hasRings && (
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <ringGeometry args={[planet.size * 1.5, planet.size * 2.2, 64]} />
          <meshBasicMaterial color={planet.ringColor} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[planet.size * 1.08, 32, 32]} />
        <meshBasicMaterial color={planet.color} transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>

      {/* Point light */}
      <pointLight color={planet.color} intensity={isHub ? 3 : 1.2} distance={isHub ? 300 : 100} />

      {/* Floating label */}
      <mesh ref={labelRef} position={[0, planet.size + 8, 0]}>
        <planeGeometry args={[planet.size * 6, planet.size * 1.5]} />
        <meshBasicMaterial map={labelTex} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Moons */}
      {Array.from({ length: planet.moons }).map((_, mi) => (
        <Moon key={mi} parentSize={planet.size} index={mi} color={planet.color} />
      ))}
    </group>
  );
}

// ── Moon ──────────────────────────────────────────────────────────────────────
function Moon({ parentSize, index, color }: { parentSize: number; index: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const offset = (index + 1) * 0.8;
  const speed  = 1.2 + index * 0.4;
  const radius = parentSize * (1.8 + index * 0.7);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed + offset;
    ref.current.position.set(Math.cos(t) * radius, Math.sin(t * 0.3) * 2, Math.sin(t) * radius);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[parentSize * 0.22, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.8} />
    </mesh>
  );
}

// ── Rocket (data packet) ──────────────────────────────────────────────────────
function Rocket({
  target,
  onLog,
}: {
  target: PlanetData;
  onLog: (msg: string, color: string) => void;
}) {
  const groupRef  = useRef<THREE.Group>(null);
  const trailRef  = useRef<THREE.Points>(null);
  const progress  = useRef(Math.random());
  const dir       = useRef(Math.random() > 0.5 ? 1 : -1);
  const speed     = useRef(0.18 + Math.random() * 0.12);
  const onLogRef  = useRef(onLog);
  onLogRef.current = onLog;

  const targetAngle = useRef(Math.random() * Math.PI * 2);

  // Trail positions (10 points)
  const trailPositions = useMemo(() => new Float32Array(10 * 3), []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    progress.current += delta * speed.current * dir.current;

    if (progress.current >= 1) {
      progress.current = 1; dir.current = -1;
      onLogRef.current(`DATA_DELIVERED → ${target.label}`, target.color);
    } else if (progress.current <= 0) {
      progress.current = 0; dir.current = 1;
      onLogRef.current(`REQUEST_SENT ← ${target.label}`, target.color);
    }

    // Hub (center) position
    const hx = 0, hy = 0, hz = 0;
    // Target planet position (it moves, so we approximate current position)
    const tx = Math.cos(targetAngle.current) * target.orbitRadius;
    const tz = Math.sin(targetAngle.current) * target.orbitRadius;
    // Advance target angle
    targetAngle.current += target.orbitSpeed * 0.003;

    // Bezier curve: hub → arc midpoint → target
    const t = progress.current;
    const mx = (hx + tx) / 2;
    const mz = (hz + tz) / 2;
    const my = 40 + target.orbitRadius * 0.3; // arc height

    // Quadratic bezier
    const x = (1-t)*(1-t)*hx + 2*(1-t)*t*mx + t*t*tx;
    const y = (1-t)*(1-t)*hy + 2*(1-t)*t*my + t*t*hy;
    const z = (1-t)*(1-t)*hz + 2*(1-t)*t*mz + t*t*tz;

    groupRef.current.position.set(x, y, z);

    // Orient toward motion direction
    const dt = 0.01;
    const t2 = Math.min(t + dt, 1);
    const nx = (1-t2)*(1-t2)*hx + 2*(1-t2)*t2*mx + t2*t2*tx;
    const ny = (1-t2)*(1-t2)*hy + 2*(1-t2)*t2*my + t2*t2*hy;
    const nz = (1-t2)*(1-t2)*hz + 2*(1-t2)*t2*mz + t2*t2*tz;
    const forward = new THREE.Vector3(nx - x, ny - y, nz - z).normalize();
    if (dir.current === -1) forward.negate();
    groupRef.current.lookAt(groupRef.current.position.clone().add(forward));

    // Update trail
    if (trailRef.current) {
      const pos = trailRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 9; i > 0; i--) {
        arr[i*3] = arr[(i-1)*3]; arr[i*3+1] = arr[(i-1)*3+1]; arr[i*3+2] = arr[(i-1)*3+2];
      }
      arr[0] = x; arr[1] = y; arr[2] = z;
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Rocket body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.8, 1.5, 5, 8]} />
        <meshStandardMaterial color={target.color} emissive={target.color} emissiveIntensity={0.8} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.8, 3, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      {/* Engine glow */}
      <pointLight color={target.color} intensity={1.5} distance={20} position={[0, 0, -3]} />
      <mesh position={[0, 0, -3]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshBasicMaterial color={target.color} transparent opacity={0.6} />
      </mesh>

      {/* Trail */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={trailPositions} count={10} itemSize={3} args={[trailPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={target.color} size={2} transparent opacity={0.5} sizeAttenuation />
      </points>
    </group>
  );
}

// ── Sun (center star) ─────────────────────────────────────────────────────────
function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.2;
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[18, 64, 64]} />
        <meshStandardMaterial color="#facc15" emissive="#f59e0b" emissiveIntensity={1.5} roughness={1} metalness={0} />
      </mesh>
      {/* Corona layers */}
      {[24, 30, 38].map((r, i) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 32, 32]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.04 - i * 0.01} side={THREE.BackSide} />
        </mesh>
      ))}
      <pointLight color="#facc15" intensity={4} distance={600} />
    </group>
  );
}

// ── Camera intro ──────────────────────────────────────────────────────────────
function CameraIntro() {
  const { camera } = useThree();
  const t = useRef(0);
  const done = useRef(false);
  const start = useMemo(() => new THREE.Vector3(700, 400, 700), []);
  const end   = useMemo(() => new THREE.Vector3(450, 250, 450), []);
  const initialized = useRef(false);

  useFrame((_, delta) => {
    if (!initialized.current) {
      camera.position.copy(start);
      camera.lookAt(0, 0, 0);
      initialized.current = true;
    }
    if (done.current) return;
    t.current += delta / 4;
    if (t.current >= 1) { t.current = 1; done.current = true; }
    camera.position.lerpVectors(start, end, t.current);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ── Scene ─────────────────────────────────────────────────────────────────────
function Scene({
  onLog,
  onVehicleCount,
}: {
  onLog: (msg: string, color: string) => void;
  onVehicleCount: (n: number) => void;
}) {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x000005, 0.0008);
    return () => { scene.fog = null; };
  }, [scene]);

  useEffect(() => { onVehicleCount(SPOKES.length); }, [onVehicleCount]);

  return (
    <>
      <CameraIntro />
      <OrbitControls
        enableDamping
        dampingFactor={0.04}
        maxPolarAngle={Math.PI / 1.8}
        minDistance={100}
        maxDistance={1000}
        target={[0, 0, 0]}
      />

      <ambientLight intensity={0.05} />
      <directionalLight color="#ffffff" intensity={0.3} position={[200, 300, 200]} />

      <StarField />
      <Nebula />

      {/* Orbit paths */}
      {SPOKES.map((p) => <OrbitRing key={p.id} radius={p.orbitRadius} />)}

      {/* Hub planet (Vercel) rendered as Sun */}
      <Sun />

      {/* Planets */}
      {SPOKES.map((p) => <Planet key={p.id} planet={p} />)}

      {/* Rockets */}
      {SPOKES.map((p) => (
        <Rocket key={p.id} target={p} onLog={onLog} />
      ))}
    </>
  );
}

// ── Canvas wrapper ────────────────────────────────────────────────────────────
export default function ObservatoryScene({
  data: _data,
  onLog,
  onVehicleCount,
}: {
  data: ObservatoryData;
  onLog: (msg: string, color: string) => void;
  onVehicleCount: (n: number) => void;
}) {
  void _data;
  return (
    <Canvas
      camera={{ position: [450, 250, 450], fov: 50, near: 1, far: 3000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%', background: '#00000a' }}
    >
      <Scene onLog={onLog} onVehicleCount={onVehicleCount} />
    </Canvas>
  );
}
