'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { ObservatoryData } from './useObservatoryData';

// ─────────────────────────────────────────────────────────────
// NODE_DATA — 7 nodes, Vercel is the hub
// ─────────────────────────────────────────────────────────────
interface NodeData {
  id: string;
  name: string;
  color: string;
  x: number;
  z: number;
  h: number;
}

const NODE_DATA: NodeData[] = [
  { id: 'vercel',      name: 'VERCEL_DEPLOY',   color: '#4f8ef7', x: 0,    z: 0,    h: 120 },
  { id: 'insforge',    name: 'INSFORGE_DB',     color: '#22c55e', x: -120, z: -120, h: 90  },
  { id: 'github',      name: 'GITHUB_SOURCE',   color: '#a855f7', x: 120,  z: -120, h: 80  },
  { id: 'mercadopago', name: 'MERCADOPAGO',     color: '#facc15', x: 120,  z: 120,  h: 100 },
  { id: 'cloudflare',  name: 'CLOUDFLARE_CDN',  color: '#06b6d4', x: -120, z: 120,  h: 75  },
  { id: 'analytics',   name: 'ANALYTICS',       color: '#ec4899', x: 0,    z: 180,  h: 70  },
  { id: 'usuarios',    name: 'USUARIOS_LIVE',   color: '#facc15', x: -180, z: 0,    h: 60  },
];

const ACCENT = '#facc15';

// ─────────────────────────────────────────────────────────────
// Canvas textures
// ─────────────────────────────────────────────────────────────
function createBuildingTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0a0a10';
  ctx.fillRect(0, 0, 512, 1024);

  // Random windows grid
  const cols = 8;
  const rows = 16;
  const pad = 8;
  const cellW = (512 - pad * 2) / cols;
  const cellH = (1024 - pad * 2 - 80) / rows; // reserve bottom for door
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() > 0.4;
      ctx.fillStyle = lit ? color : '#1a1a2a';
      const x = pad + c * cellW + 2;
      const y = pad + r * cellH + 2;
      ctx.fillRect(x, y, cellW - 4, cellH - 4);
    }
  }

  // Door at the base, bordered with the accent color
  const doorW = 80;
  const doorH = 60;
  const doorX = (512 - doorW) / 2;
  const doorY = 1024 - doorH - 10;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(doorX, doorY, doorW, doorH);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  // Asphalt
  ctx.fillStyle = '#111116';
  ctx.fillRect(0, 0, 1024, 1024);

  // Yellow borders (top/bottom)
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, 0, 1024, 6);
  ctx.fillRect(0, 1018, 1024, 6);

  // Dashed center line
  ctx.fillStyle = '#555555';
  const dashW = 40;
  const dashGap = 40;
  const y = 509;
  for (let x = 0; x < 1024; x += dashW + dashGap) {
    ctx.fillRect(x, y, dashW, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(6,10,18,0.92)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 508, 124);
  ctx.fillStyle = color;
  ctx.font = 'bold 48px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

// ─────────────────────────────────────────────────────────────
// Ground
// ─────────────────────────────────────────────────────────────
function CityGround() {
  const tex = useMemo(() => {
    const t = createRoadTexture();
    t.repeat.set(40, 40);
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[4000, 4000]} />
      <meshStandardMaterial map={tex} roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// Background buildings (600, avoid node positions)
// ─────────────────────────────────────────────────────────────
function BackgroundBuildings() {
  const data = useMemo(() => {
    const buildings: Array<{
      pos: [number, number, number];
      size: [number, number, number];
    }> = [];
    const AREA = 1800;
    const MIN_NODE_DIST = 80;
    let attempts = 0;
    while (buildings.length < 600 && attempts < 6000) {
      attempts++;
      const x = (Math.random() - 0.5) * AREA;
      const z = (Math.random() - 0.5) * AREA;
      const tooClose = NODE_DATA.some((n) => {
        const dx = n.x - x;
        const dz = n.z - z;
        return dx * dx + dz * dz < MIN_NODE_DIST * MIN_NODE_DIST;
      });
      if (tooClose) continue;
      const w = 15 + Math.random() * 15;
      const d = 15 + Math.random() * 15;
      const h = 20 + Math.random() * 60;
      buildings.push({
        pos: [x, h / 2, z],
        size: [w, h, d],
      });
    }
    return buildings;
  }, []);

  return (
    <group>
      {data.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#050508" roughness={0.9} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Traffic light
// ─────────────────────────────────────────────────────────────
function TrafficLight({ position, phase }: { position: [number, number, number]; phase: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.elapsedTime + phase;
    const green = Math.floor(t / 4) % 2 === 0;
    const color = green ? '#22c55e' : '#ef4444';
    matRef.current.color.set(color);
    matRef.current.emissive.set(color);
  });
  return (
    <group position={position}>
      <mesh position={[0, 6, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.8, 12, 8]} />
        <meshStandardMaterial color="#222226" roughness={0.8} />
      </mesh>
      <mesh position={[0, 13, 0]} castShadow>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial
          ref={matRef}
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={1.5}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Building node (tower + billboard + floating pin)
// ─────────────────────────────────────────────────────────────
function BuildingNode({ node }: { node: NodeData }) {
  const tex = useMemo(() => createBuildingTexture(node.color), [node.color]);
  const labelTex = useMemo(() => createLabelTexture(node.name, node.color), [node.name, node.color]);
  useEffect(
    () => () => {
      tex.dispose();
      labelTex.dispose();
    },
    [tex, labelTex],
  );

  const signRef = useRef<THREE.Mesh>(null);
  const pinRef = useRef<THREE.Mesh>(null);
  const pinY0 = node.h + 20;

  useFrame(({ clock, camera }) => {
    if (signRef.current) {
      const dx = camera.position.x - signRef.current.position.x;
      const dz = camera.position.z - signRef.current.position.z;
      signRef.current.rotation.y = Math.atan2(dx, dz);
    }
    if (pinRef.current) {
      pinRef.current.position.y = pinY0 + Math.sin(clock.elapsedTime * 2) * 2;
      pinRef.current.rotation.y = clock.elapsedTime * 1.5;
    }
  });

  return (
    <group position={[node.x, 0, node.z]}>
      {/* Tower */}
      <mesh position={[0, node.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[35, node.h, 35]} />
        <meshStandardMaterial
          map={tex}
          emissive={node.color}
          emissiveIntensity={0.3}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      {/* Billboard label */}
      <mesh ref={signRef} position={[0, node.h + 8, 0]}>
        <planeGeometry args={[50, 12]} />
        <meshBasicMaterial map={labelTex} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* Floating pin */}
      <mesh ref={pinRef} position={[0, pinY0, 0]}>
        <cylinderGeometry args={[0, 4, 10, 4]} />
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={1.2}
          roughness={0.3}
        />
      </mesh>
      {/* Accent light at base */}
      <pointLight
        color={node.color}
        intensity={1.2}
        distance={80}
        position={[0, 6, 0]}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Data vehicle shuttling hub ↔ target
// ─────────────────────────────────────────────────────────────
function DataVehicle({
  hub,
  target,
  onLog,
}: {
  hub: NodeData;
  target: NodeData;
  onLog: (msg: string, color: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(Math.random());
  const dir = useRef(1);
  const speed = useRef(0.12 + Math.random() * 0.08);
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  const startVec = useMemo(() => new THREE.Vector3(hub.x, 2, hub.z), [hub]);
  const endVec = useMemo(() => new THREE.Vector3(target.x, 2, target.z), [target]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const lookTmp = useMemo(() => new THREE.Vector3(), []);

  // Perpendicular lateral offset vector for lanes
  const lateral = useMemo(() => {
    const dx = target.x - hub.x;
    const dz = target.z - hub.z;
    const len = Math.hypot(dx, dz) || 1;
    // 90° rotation in XZ plane
    return new THREE.Vector3(-dz / len, 0, dx / len);
  }, [hub, target]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    progress.current += delta * speed.current * dir.current;

    if (progress.current >= 1) {
      progress.current = 1;
      dir.current = -1;
      onLogRef.current(`DATA_DELIVERED: ${target.name}`, target.color);
    } else if (progress.current <= 0) {
      progress.current = 0;
      dir.current = 1;
      onLogRef.current(`REQUEST_INIT: ${target.name}`, target.color);
    }

    // Position along segment
    tmp.lerpVectors(startVec, endVec, progress.current);
    // Lateral offset (right lane going, left lane returning)
    const side = dir.current === 1 ? 8 : -8;
    tmp.addScaledVector(lateral, side);
    meshRef.current.position.copy(tmp);

    // Look toward current direction
    lookTmp.copy(dir.current === 1 ? endVec : startVec).addScaledVector(lateral, side);
    meshRef.current.lookAt(lookTmp);
  });

  return (
    <mesh ref={meshRef} castShadow>
      <boxGeometry args={[5, 2, 8]} />
      <meshStandardMaterial
        color={target.color}
        emissive={target.color}
        emissiveIntensity={1}
        roughness={0.4}
        metalness={0.6}
      />
      <pointLight color={target.color} intensity={1} distance={20} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// Floating dust
// ─────────────────────────────────────────────────────────────
function FloatingDust() {
  const count = 200;
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 800;
      arr[i * 3 + 1] = Math.random() * 200;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 800;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += 0.08;
      if (arr[i * 3 + 1] > 220) arr[i * 3 + 1] = 0;
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
      <pointsMaterial color={ACCENT} size={1.2} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────
// Camera intro: dolly from (500,400,500) → (350,300,350) in 3s
// ─────────────────────────────────────────────────────────────
function CameraIntro() {
  const { camera } = useThree();
  const t = useRef(0);
  const done = useRef(false);
  const start = useMemo(() => new THREE.Vector3(500, 400, 500), []);
  const end = useMemo(() => new THREE.Vector3(350, 300, 350), []);
  const initialized = useRef(false);

  useFrame((_, delta) => {
    if (!initialized.current) {
      camera.position.copy(start);
      camera.lookAt(0, 0, 0);
      initialized.current = true;
    }
    if (done.current) return;
    t.current += delta / 3;
    if (t.current >= 1) {
      t.current = 1;
      done.current = true;
    }
    camera.position.lerpVectors(start, end, t.current);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

// ─────────────────────────────────────────────────────────────
// Scene
// ─────────────────────────────────────────────────────────────
function Scene({
  onLog,
  onVehicleCount,
}: {
  onLog: (msg: string, color: string) => void;
  onVehicleCount: (n: number) => void;
}) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x010103, 0.003);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  const hub = NODE_DATA[0];
  const spokes = NODE_DATA.slice(1);

  useEffect(() => {
    onVehicleCount(spokes.length);
  }, [onVehicleCount, spokes.length]);

  const trafficPositions: Array<[number, number, number]> = [
    [60, 0, 60], [-60, 0, 60], [60, 0, -60], [-60, 0, -60],
    [0, 0, 60], [0, 0, -60], [60, 0, 0], [-60, 0, 0],
  ];

  return (
    <>
      <CameraIntro />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={80}
        maxDistance={1200}
        target={[0, 0, 0]}
      />

      <ambientLight color={0xffffff} intensity={0.2} />
      <directionalLight
        color={0xffffff}
        intensity={1}
        position={[200, 400, 200]}
        castShadow
      />

      <CityGround />
      <BackgroundBuildings />

      {trafficPositions.map((p, i) => (
        <TrafficLight key={i} position={p} phase={i * 0.5} />
      ))}

      {NODE_DATA.map((n) => (
        <BuildingNode key={n.id} node={n} />
      ))}

      {spokes.map((s) => (
        <DataVehicle key={s.id} hub={hub} target={s} onLog={onLog} />
      ))}

      <FloatingDust />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Canvas wrapper
// ─────────────────────────────────────────────────────────────
export default function ObservatoryScene({
  data: _data,
  onLog,
  onVehicleCount,
}: {
  data: ObservatoryData;
  onLog: (msg: string, color: string) => void;
  onVehicleCount: (n: number) => void;
}) {
  // `data` reserved for future bindings (node status etc.)
  void _data;
  return (
    <Canvas
      camera={{ position: [350, 300, 350], fov: 45, near: 1, far: 5000 }}
      gl={{ antialias: true, alpha: false }}
      shadows
      style={{ width: '100%', height: '100%', background: '#010103' }}
    >
      <Scene onLog={onLog} onVehicleCount={onVehicleCount} />
    </Canvas>
  );
}
