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

const STORE_POS = new THREE.Vector3(-1.85, -0.25, 0);
const BANK_POS = new THREE.Vector3(1.85, 0.35, 0);
const PULSE_COUNT = 16;

function CheckoutField({
  mode,
  secureProgress,
  paymentProgress,
  outcome,
  isProcessing,
  isSuccess,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const storeRef = useRef<THREE.Mesh>(null);
  const storeHaloRef = useRef<THREE.Mesh>(null);
  const bankRef = useRef<THREE.Mesh>(null);
  const bankHaloRef = useRef<THREE.Mesh>(null);
  const tubeRef = useRef<THREE.Mesh>(null);
  const pulseRefs = useRef<(THREE.Mesh | null)[]>([]);
  const dustRef = useRef<THREE.Points>(null);

  // ── The "spatial bridge": a curved channel that links the Fabrick node
  // (store) to the bank node (Mercado Pago) — the literal connection the
  // client asked the scene to represent.
  const channelCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        STORE_POS.clone(),
        new THREE.Vector3(0, 1.35, 0.85),
        BANK_POS.clone(),
      ]),
    [],
  );

  const channelGeometry = useMemo(
    () => new THREE.TubeGeometry(channelCurve, 96, 0.05, 14, false),
    [channelCurve],
  );

  // Pulses alternate direction: even index travels store → bank (the
  // outgoing payment request), odd index travels bank → store (the
  // authorization response) — visually narrating the round trip.
  const pulseSeeds = useMemo(
    () =>
      Array.from({ length: PULSE_COUNT }, (_, i) => ({
        offset: i / PULSE_COUNT,
        forward: i % 2 === 0,
      })),
    [],
  );

  const dust = useMemo(() => {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = i * 0.19;
      const radius = 2.1 + ((i * 17) % 100) * 0.014;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (((i * 13) % 70) - 35) * 0.022;
      positions[i * 3 + 2] = Math.sin(angle) * radius * 0.6;
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
  }, [mode, outcome, isSuccess]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const spinBoost = isProcessing ? 0.9 : 0.45;
    const normalizedSecure = Math.min(1, Math.max(0, secureProgress / 100));
    const normalizedPayment = Math.min(1, Math.max(0, paymentProgress / 100));
    const energy = 0.35 + normalizedSecure * 0.35 + normalizedPayment * 0.3;
    const successBurst = isSuccess ? 1 : 0;
    const rejectionGlitch = outcome === 'rejected' ? 1 : 0;
    const pendingFloat = outcome === 'pending' ? 1 : 0;

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.18) * (0.16 + successBurst * 0.1);
      groupRef.current.rotation.x = Math.sin(t * (0.32 - pendingFloat * 0.12)) * (0.08 + pendingFloat * 0.05);
      groupRef.current.position.x = rejectionGlitch ? Math.sin(t * 34) * 0.04 : 0;
    }

    // ── The Fabrick node — the storefront endpoint of the connection ──
    if (storeRef.current) {
      storeRef.current.rotation.y += delta * (0.5 + spinBoost * 0.4 + successBurst * 0.6);
      storeRef.current.rotation.x += delta * 0.18;
      const s = 1 + Math.sin(t * 1.6) * 0.05 * energy + normalizedSecure * 0.18;
      storeRef.current.scale.setScalar(s);
    }
    if (storeHaloRef.current) {
      const haloScale = 1.3 + normalizedSecure * 0.7 + (isProcessing ? Math.sin(t * 4) * 0.08 : 0);
      storeHaloRef.current.scale.setScalar(haloScale);
      storeHaloRef.current.rotation.z += delta * 0.4;
    }

    // ── The bank node — Mercado Pago / financial institution endpoint ──
    if (bankRef.current) {
      bankRef.current.rotation.y -= delta * (0.4 + spinBoost * 0.35 + successBurst * 0.55);
      bankRef.current.rotation.z += delta * (pendingFloat ? 0.22 : 0.08);
      const s = 1 + Math.sin(t * 1.8 + 1.4) * 0.05 * energy + normalizedPayment * 0.22;
      bankRef.current.scale.setScalar(s);
      bankRef.current.position.y = BANK_POS.y + (pendingFloat ? Math.sin(t * 1.1) * 0.1 : 0);
    }
    if (bankHaloRef.current) {
      const haloScale = 1.3 + normalizedPayment * 0.75 + (outcome === 'pending' ? Math.sin(t * 4.4) * 0.09 : 0);
      bankHaloRef.current.scale.setScalar(haloScale);
      bankHaloRef.current.rotation.z -= delta * 0.32;
      bankHaloRef.current.position.y = bankRef.current?.position.y ?? BANK_POS.y;
    }

    // ── The channel itself: brightens and "thickens" as the secure
    // handshake and payment progress advance, so the bridge visibly
    // strengthens as the transaction moves forward. ──
    if (tubeRef.current) {
      const mat = tubeRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.25 + energy * 0.65 + successBurst * 0.5 + rejectionGlitch * 0.3;
      const channelScale = 1 + normalizedSecure * 0.18 + normalizedPayment * 0.22;
      tubeRef.current.scale.set(1, channelScale, 1);
    }

    // ── Light pulses traveling the channel — the literal "data flowing
    // between your page and the bank" the client asked to visualize.
    // Speed scales with secure/payment progress; direction alternates. ──
    const baseSpeed = 0.12 + energy * 0.34 + successBurst * 0.4 + (isProcessing ? 0.12 : 0);
    pulseRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const seed = pulseSeeds[i];
      let progress = (seed.offset + t * baseSpeed) % 1;
      if (!seed.forward) progress = 1 - progress;
      const point = channelCurve.getPointAt(Math.min(0.999, Math.max(0.001, progress)));
      mesh.position.copy(point);
      const pulse = 1 + Math.sin(t * 6 + i) * 0.25;
      const edgeFade = Math.sin(progress * Math.PI);
      mesh.scale.setScalar(pulse * (0.55 + edgeFade * 0.7) * (0.7 + energy * 0.6));
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (rejectionGlitch ? 0.35 : 0.55 + edgeFade * 0.45) * (0.5 + energy * 0.7);
    });

    if (dustRef.current) {
      dustRef.current.rotation.y += delta * (0.03 + energy * 0.05 + successBurst * 0.22);
      const dustScale = isSuccess ? 1.3 + normalizedPayment * 1.4 : outcome === 'rejected' ? 1.1 : 1;
      dustRef.current.scale.setScalar(dustScale);
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.38} />
      <directionalLight position={[2.5, 2, 3]} intensity={1.1} color={palette.secondary} />
      <pointLight position={[-2, -1, 2.5]} intensity={1.2} color={palette.primary} />
      <pointLight position={STORE_POS.toArray()} intensity={1.4} color={palette.accent} distance={3.2} />
      <pointLight position={BANK_POS.toArray()} intensity={1.4} color={palette.secondary} distance={3.2} />

      {/* ── Fabrick node (the store / your page) ── */}
      <group position={STORE_POS.toArray()}>
        <mesh ref={storeHaloRef}>
          <ringGeometry args={[0.34, 0.4, 48]} />
          <meshBasicMaterial color={palette.accent} transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={storeRef}>
          <icosahedronGeometry args={[0.27, 0]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={palette.primary}
            emissiveIntensity={0.55}
            roughness={0.2}
            metalness={0.75}
          />
        </mesh>
      </group>

      {/* ── Bank node (Mercado Pago / financial institution) ── */}
      <group position={BANK_POS.toArray()}>
        <mesh ref={bankHaloRef}>
          <ringGeometry args={[0.3, 0.36, 6]} />
          <meshBasicMaterial color={palette.secondary} transparent opacity={0.32} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={bankRef}>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial
            color={palette.secondary}
            emissive={palette.primary}
            emissiveIntensity={0.5}
            roughness={0.22}
            metalness={0.7}
          />
        </mesh>
      </group>

      {/* ── The connection channel — the literal bridge between the two ── */}
      <mesh ref={tubeRef} geometry={channelGeometry}>
        <meshStandardMaterial
          color={palette.primary}
          emissive={palette.secondary}
          emissiveIntensity={0.4}
          roughness={0.35}
          metalness={0.4}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* ── Encrypted-data light pulses traveling the channel ── */}
      {pulseSeeds.map((_, i) => (
        <mesh key={i} ref={(el) => { pulseRefs.current[i] = el; }}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color={i % 2 === 0 ? palette.accent : palette.secondary} transparent opacity={0.6} />
        </mesh>
      ))}

      {/* ── Ambient particle field ── */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust, 3]} />
        </bufferGeometry>
        <pointsMaterial color={palette.accent} size={0.014} transparent opacity={0.55} sizeAttenuation />
      </points>
    </group>
  );
}

export default function Checkout4DExperience(props: Props) {
  return (
    <div className="rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_18%_15%,rgba(250,204,21,0.12),transparent_45%),radial-gradient(circle_at_80%_78%,rgba(56,189,248,0.18),transparent_42%),linear-gradient(160deg,rgba(0,0,0,0.88),rgba(9,9,11,0.95))] p-4 sm:p-5 overflow-hidden">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.24em] font-bold text-zinc-300">Checkout 4D • Canal Fabrick ⇄ Banco</p>
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
