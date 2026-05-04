'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type CheckoutMode = 'mercadopago' | 'bricks' | 'transfer';
type Outcome = 'idle' | 'pending' | 'rejected';

interface Props {
  mode: CheckoutMode;
  secureProgress: number;
  paymentProgress: number;
  outcome: Outcome;
  isProcessing: boolean;
  isSuccess: boolean;
}

function CheckoutField({
  mode,
  secureProgress,
  paymentProgress,
  outcome,
  isProcessing,
  isSuccess,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const knotRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);
  const bankNodeRef = useRef<THREE.Mesh>(null);
  const bankPulseRef = useRef<THREE.Mesh>(null);
  const dustRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const count = 520;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = i * 0.117;
      const radius = 1.8 + ((i * 17) % 100) * 0.012;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (((i * 13) % 70) - 35) * 0.02;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
  }, []);

  const palette = useMemo(() => {
    if (isSuccess) {
      return { primary: '#22c55e', secondary: '#38bdf8', accent: '#facc15' };
    }
    if (outcome === 'rejected') {
      return { primary: '#ef4444', secondary: '#f97316', accent: '#fca5a5' };
    }
    if (outcome === 'pending') {
      return { primary: '#f59e0b', secondary: '#fde047', accent: '#fef08a' };
    }
    if (mode === 'bricks') {
      return { primary: '#0ea5e9', secondary: '#38bdf8', accent: '#7dd3fc' };
    }
    if (mode === 'transfer') {
      return { primary: '#a3a3a3', secondary: '#d4d4d8', accent: '#f4f4f5' };
    }
    return { primary: '#eab308', secondary: '#facc15', accent: '#fde047' };
  }, [mode, outcome]);

  useFrame((state, delta) => {
    const spinBoost = isProcessing ? 0.9 : 0.45;
    const normalizedSecure = Math.min(1, Math.max(0, secureProgress / 100));
    const normalizedPayment = Math.min(1, Math.max(0, paymentProgress / 100));
    const energy = 0.35 + normalizedSecure * 0.35 + normalizedPayment * 0.3;
    const successBurst = isSuccess ? 1 : 0;
    const rejectionGlitch = outcome === 'rejected' ? 1 : 0;
    const pendingFloat = outcome === 'pending' ? 1 : 0;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (0.14 + spinBoost * 0.06 + successBurst * 0.35);
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * (0.42 - pendingFloat * 0.16)) * (0.14 + pendingFloat * 0.08);
      groupRef.current.position.x = rejectionGlitch ? Math.sin(state.clock.elapsedTime * 34) * 0.035 : 0;
    }

    if (knotRef.current) {
      knotRef.current.rotation.x += delta * (0.25 + spinBoost * 0.2 + successBurst * 0.6);
      knotRef.current.rotation.z += delta * (0.11 + spinBoost * 0.18 + rejectionGlitch * 0.45);
      const s = isSuccess
        ? 1 + normalizedPayment * 0.65 + Math.sin(state.clock.elapsedTime * 9) * 0.08
        : 1 + Math.sin(state.clock.elapsedTime * (pendingFloat ? 1.2 : 2.2)) * 0.06 * energy;
      knotRef.current.scale.set(s, s, s);
      knotRef.current.position.y = pendingFloat ? Math.sin(state.clock.elapsedTime * 0.8) * 0.14 : 0;
    }

    if (haloRef.current) {
      const haloScale = isSuccess
        ? 1.8 + normalizedPayment * 1.8
        : 1.2 + normalizedPayment * 0.9 + (isProcessing ? 0.2 : 0);
      haloRef.current.scale.setScalar(haloScale);
      haloRef.current.rotation.y -= delta * (0.06 + spinBoost * 0.05 + successBurst * 0.18);
    }

    if (ringARef.current) {
      ringARef.current.rotation.y += delta * (0.35 + spinBoost * 0.28 + successBurst * 0.7);
      ringARef.current.rotation.x = Math.cos(state.clock.elapsedTime * (pendingFloat ? 0.38 : 0.8)) * 0.28;
      const ringAScale = isSuccess ? Math.max(0.4, 1 - normalizedPayment * 0.55) : 1;
      ringARef.current.scale.setScalar(ringAScale);
    }

    if (ringBRef.current) {
      ringBRef.current.rotation.x -= delta * (0.22 + spinBoost * 0.16 + rejectionGlitch * 0.55);
      ringBRef.current.rotation.z += delta * (0.18 + spinBoost * 0.1 + successBurst * 0.25);
      const ringBScale = isSuccess ? Math.max(0.2, 1 - normalizedPayment * 0.72) : 1;
      ringBRef.current.scale.setScalar(ringBScale);
    }

    if (dustRef.current) {
      dustRef.current.rotation.y += delta * (0.04 + energy * 0.07 + successBurst * 0.3);
      dustRef.current.rotation.z += delta * 0.02;
      const dustScale = isSuccess ? 1.4 + normalizedPayment * 1.8 : outcome === 'rejected' ? 1.15 : 1;
      dustRef.current.scale.setScalar(dustScale);
    }

    if (bankNodeRef.current) {
      bankNodeRef.current.position.y = pendingFloat ? 0.95 + Math.sin(state.clock.elapsedTime * 1.1) * 0.12 : 0.95;
      bankNodeRef.current.rotation.z += delta * (pendingFloat ? 0.18 : 0.05);
    }

    if (bankPulseRef.current) {
      const pulse = pendingFloat ? 1.1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.14 : 1;
      bankPulseRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[2.5, 2, 3]} intensity={1.15} color={palette.secondary} />
      <pointLight position={[-2, -1, 2.5]} intensity={1.25} color={palette.primary} />

      <mesh ref={haloRef}>
        <sphereGeometry args={[1.35, 36, 36]} />
        <meshBasicMaterial color={palette.primary} transparent opacity={0.09} wireframe />
      </mesh>

      <mesh ref={ringARef} rotation={[0.4, 0, 0.1]}>
        <torusGeometry args={[1.75, 0.045, 24, 180]} />
        <meshStandardMaterial color={palette.secondary} emissive={palette.primary} emissiveIntensity={0.3} roughness={0.2} metalness={0.65} />
      </mesh>

      <mesh ref={ringBRef} rotation={[1, 0.4, 0]}>
        <torusGeometry args={[2.05, 0.028, 16, 160]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.secondary} emissiveIntensity={0.18} roughness={0.3} metalness={0.45} />
      </mesh>

      <mesh ref={bankPulseRef} position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshBasicMaterial color={palette.secondary} transparent opacity={outcome === 'pending' ? 0.22 : 0.08} />
      </mesh>

      <mesh ref={bankNodeRef} position={[0, 0.95, 0]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.primary} emissiveIntensity={0.35} roughness={0.25} metalness={0.6} />
      </mesh>

      <mesh ref={knotRef}>
        <torusKnotGeometry args={[0.72, 0.19, 180, 28, 2, 3]} />
        <meshStandardMaterial color={palette.primary} emissive={palette.secondary} emissiveIntensity={0.45} roughness={0.25} metalness={0.8} />
      </mesh>

      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color={palette.accent} size={0.015} transparent opacity={0.85} sizeAttenuation />
      </points>
    </group>
  );
}

export default function Checkout4DExperience(props: Props) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_18%_15%,rgba(250,204,21,0.12),transparent_45%),radial-gradient(circle_at_80%_78%,rgba(56,189,248,0.18),transparent_42%),linear-gradient(160deg,rgba(0,0,0,0.88),rgba(9,9,11,0.95))] p-4 sm:p-5 overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-zinc-300">Checkout 4D • Spatial Payment Field</p>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">Three.js</p>
      </div>
      <div className="h-44 sm:h-56 rounded-2xl border border-white/10 bg-black/40">
        <Canvas camera={{ position: [0, 0, 5.2], fov: 45 }} dpr={[1, 1.6]}>
          <CheckoutField {...props} />
        </Canvas>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="Canal" value={props.mode === 'mercadopago' ? 'Inline' : props.mode === 'bricks' ? 'Bricks' : 'Transfer'} />
        <Metric label="Secure" value={`${Math.round(props.secureProgress)}%`} />
        <Metric label="Data" value={`${Math.round(props.paymentProgress)}%`} />
        <Metric label="Status" value={props.outcome === 'idle' ? 'ready' : props.outcome} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-200">{value}</p>
    </div>
  );
}
