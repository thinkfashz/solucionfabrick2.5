'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { ObservatoryData, ServiceId } from './useObservatoryData';

// ── Constantes de ciudad ───────────────────────────────────────────────
interface BuildingDef {
  id: string;
  label: string;
  pos: [number, number, number];
  h: number;
  color: string;
  serviceId?: ServiceId;
}

const BUILDINGS: BuildingDef[] = [
  { id: 'vercel', label: 'Vercel · Deploy', pos: [0, 0, 0], h: 4, color: '#4f8ef7', serviceId: 'vercel' },
  { id: 'insforge', label: 'InsForge · Database', pos: [6, 0, -4], h: 3, color: '#22c55e', serviceId: 'insforge' },
  { id: 'github', label: 'GitHub · Source', pos: [-6, 0, -4], h: 2.5, color: '#a855f7', serviceId: 'github' },
  { id: 'mercadopago', label: 'MercadoPago · Payments', pos: [6, 0, 4], h: 2, color: '#f59e0b', serviceId: 'mercadopago' },
  { id: 'cloudflare', label: 'Cloudflare · CDN', pos: [-4, 0, 4], h: 1.5, color: '#06b6d4', serviceId: 'cloudflare' },
  { id: 'analytics', label: 'Analytics · Metrics', pos: [0, 0, -7], h: 1.8, color: '#ec4899' },
  { id: 'users', label: 'Usuarios · Live', pos: [-8, 0, 2], h: 1, color: '#facc15' },
];

const CONNECTIONS: Array<[string, string]> = [
  ['vercel', 'insforge'],
  ['vercel', 'github'],
  ['vercel', 'cloudflare'],
  ['insforge', 'mercadopago'],
  ['insforge', 'analytics'],
  ['users', 'vercel'],
  ['users', 'cloudflare'],
];

// ── Partícula de datos en movimiento ────────────────────────────────────
function DataPacket({
  curve,
  color,
  speed,
  offset,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  speed: number;
  offset: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const trailRefs = useRef<Array<THREE.Mesh | null>>([]);
  const t = useRef(offset);

  const trail = useMemo(
    () => [0.05, 0.07, 0.09, 0.11, 0.13].map((d) => ({ delta: d })),
    [],
  );

  useFrame(() => {
    t.current = (t.current + speed) % 1;
    const pt = curve.getPoint(t.current);
    if (ref.current) {
      ref.current.position.copy(pt);
    }
    trailRefs.current.forEach((m, i) => {
      if (!m) return;
      const tt = (t.current - trail[i].delta + 1) % 1;
      m.position.copy(curve.getPoint(tt));
    });
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {trail.map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.07 - i * 0.01, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.7 - i * 0.12} />
        </mesh>
      ))}
    </group>
  );
}

// ── Carretera entre edificios ───────────────────────────────────────────
function Road({
  from,
  to,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const curve = useMemo(() => {
    const mid: [number, number, number] = [
      (from[0] + to[0]) / 2,
      0.05,
      (from[2] + to[2]) / 2,
    ];
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(from[0], 0.05, from[2]),
      new THREE.Vector3(...mid),
      new THREE.Vector3(to[0], 0.05, to[2]),
    ]);
  }, [from, to]);

  const tubeGeo = useMemo(
    () => new THREE.TubeGeometry(curve, 20, 0.04, 6, false),
    [curve],
  );

  const packets = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        speed: 0.003,
        offset: i / 3,
      })),
    [],
  );

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color="#1a2e4a" />
      </mesh>
      {packets.map((p, i) => (
        <DataPacket
          key={i}
          curve={curve}
          color={color}
          speed={p.speed}
          offset={p.offset}
        />
      ))}
    </group>
  );
}

// ── Edificio individual ─────────────────────────────────────────────────
function Building({
  label,
  pos,
  h,
  color,
  statusOnline,
  latencyMs,
}: {
  label: string;
  pos: [number, number, number];
  h: number;
  color: string;
  statusOnline: boolean;
  latencyMs?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null);
  const pulse0 = useRef(Math.random() * Math.PI * 2);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.8 + pulse0.current) * 0.01;
    const target = hovered ? 1.05 : 1;
    groupRef.current.scale.x = THREE.MathUtils.lerp(
      groupRef.current.scale.x,
      target,
      0.1,
    );
    groupRef.current.scale.z = THREE.MathUtils.lerp(
      groupRef.current.scale.z,
      target,
      0.1,
    );
    groupRef.current.scale.y = THREE.MathUtils.lerp(
      groupRef.current.scale.y,
      target * pulse,
      0.1,
    );
    if (glowRef.current) {
      const targetOpacity = hovered ? 0.2 : 0.08;
      glowRef.current.opacity = THREE.MathUtils.lerp(
        glowRef.current.opacity,
        targetOpacity,
        0.1,
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={[pos[0], h / 2, pos[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'pointer';
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        if (typeof document !== 'undefined') {
          document.body.style.cursor = '';
        }
      }}
    >
      {/* Cuerpo */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.2, h, 1.2]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          roughness={0.25}
          metalness={0.6}
          emissive={color}
          emissiveIntensity={statusOnline ? 0.25 : 0.05}
        />
      </mesh>
      {/* Glow exterior */}
      <mesh scale={[1.18, 1.03, 1.18]}>
        <boxGeometry args={[1.2, h, 1.2]} />
        <meshBasicMaterial
          ref={glowRef}
          color={color}
          transparent
          opacity={0.08}
        />
      </mesh>
      {/* Luz puntual en la cima */}
      <pointLight
        color={color}
        intensity={statusOnline ? 0.8 : 0.15}
        distance={4}
        position={[0, h / 2 + 0.2, 0]}
      />
      {/* Label HTML */}
      <Html
        position={[0, h / 2 + 0.6, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            background: 'rgba(6,10,18,0.88)',
            border: `1px solid ${color}44`,
            borderRadius: 6,
            padding: '3px 8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <span
            style={{
              color,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
          <span
            style={{
              color: statusOnline ? '#22c55e' : '#ef4444',
              marginLeft: 6,
              fontSize: 9,
            }}
          >
            {statusOnline ? '● ONLINE' : '● OFFLINE'}
          </span>
          {typeof latencyMs === 'number' && (
            <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 9 }}>
              {latencyMs}ms
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// ── Partículas flotantes (polvo digital) ────────────────────────────────
function FloatingDust() {
  const count = 200;
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 22;
      arr[i * 3 + 1] = Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += 0.003;
      if (arr[i * 3 + 1] > 3.5) arr[i * 3 + 1] = 0;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={count}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#4f8ef7"
        size={0.04}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

// ── Ground plane + grid ─────────────────────────────────────────────────
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#0a0f1a" roughness={1} metalness={0.1} />
      </mesh>
      <gridHelper
        args={[24, 24, '#1a2540', '#0d1829']}
        position={[0, 0.01, 0]}
      />
    </>
  );
}

// ── Dolly-in de cámara en el mount ──────────────────────────────────────
function CameraIntro() {
  const { camera } = useThree();
  const done = useRef(false);
  const t = useRef(0);
  const start = useMemo(() => new THREE.Vector3(20, 18, 20), []);
  const end = useMemo(() => new THREE.Vector3(14, 12, 14), []);
  const initialized = useRef(false);

  useFrame((_, delta) => {
    if (!initialized.current) {
      camera.position.copy(start);
      initialized.current = true;
    }
    if (done.current) return;
    t.current += delta / 2.5;
    if (t.current >= 1) {
      t.current = 1;
      done.current = true;
    }
    camera.position.lerpVectors(start, end, t.current);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ── Escena principal ────────────────────────────────────────────────────
function Scene({ data }: { data: ObservatoryData }) {
  const buildingMap = useMemo(
    () => Object.fromEntries(BUILDINGS.map((b) => [b.id, b] as const)),
    [],
  );

  return (
    <>
      <CameraIntro />
      <OrbitControls
        minDistance={8}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.4}
        enablePan
        panSpeed={0.5}
        rotateSpeed={0.45}
        zoomSpeed={0.9}
        enableDamping
        dampingFactor={0.07}
        target={[0, 0, 0]}
      />

      {/* Iluminación */}
      <ambientLight color="#0a0f1a" intensity={0.5} />
      <directionalLight
        color="#ffffff"
        intensity={0.35}
        position={[10, 20, 10]}
        castShadow
      />
      <hemisphereLight args={['#0a0f1a', '#000000', 0.6]} />
      <fog attach="fog" args={['#060a12', 18, 35]} />

      <Ground />
      <FloatingDust />

      {/* Edificios */}
      {BUILDINGS.map((b) => {
        const svc = b.serviceId ? data.servicioStatus[b.serviceId] : undefined;
        return (
          <Building
            key={b.id}
            label={b.label}
            pos={b.pos}
            h={b.h}
            color={b.color}
            statusOnline={svc ? svc.online : true}
            latencyMs={svc?.latencyMs}
          />
        );
      })}

      {/* Carreteras y paquetes */}
      {CONNECTIONS.map(([a, b], i) => {
        const ba = buildingMap[a];
        const bb = buildingMap[b];
        if (!ba || !bb) return null;
        return (
          <Road
            key={i}
            from={[ba.pos[0], 0.05, ba.pos[2]]}
            to={[bb.pos[0], 0.05, bb.pos[2]]}
            color={ba.color}
          />
        );
      })}
    </>
  );
}

// ── Canvas wrapper ──────────────────────────────────────────────────────
export default function ObservatoryScene({ data }: { data: ObservatoryData }) {
  return (
    <Canvas
      camera={{ position: [14, 12, 14], fov: 45 }}
      gl={{ antialias: true, alpha: false }}
      shadows
      style={{ width: '100%', height: '100%', background: '#060a12' }}
    >
      <Scene data={data} />
    </Canvas>
  );
}
