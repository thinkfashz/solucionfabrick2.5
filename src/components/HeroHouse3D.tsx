'use client';

/**
 * HeroHouse3D — Low-poly procedural 3D house used as the centerpiece of the
 * landing hero. Replaces the decorative concentric rings with a real model
 * rendered via react-three-fiber. Lazy + WebGL-fallback safe.
 *
 * The house uses the brand palette (dorado #facc15 / #c9a96e) with subtle
 * emissive accents on the windows, and rotates very slowly to feel alive.
 */

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GOLD = '#c9a96e';
const GOLD_BRIGHT = '#facc15';
const ROOF = '#1a1a1a';
const WALL = '#0a0a0a';
const WINDOW_GLOW = '#facc15';

function House() {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.18;
    }
    if (lightRef.current) {
      // gentle pulse of the golden interior glow
      lightRef.current.intensity = 1.4 + Math.sin(t * 1.5) * 0.35;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.25, 0]}>
      {/* Foundation slab */}
      <mesh position={[0, -1.05, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.2, 2.6]} />
        <meshStandardMaterial color={GOLD} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Main house body */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 1.7, 2.2]} />
        <meshStandardMaterial color={WALL} roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Gable roof – two angled prisms */}
      <mesh position={[0, 1.15, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[1.95, 1.0, 4]} />
        <meshStandardMaterial color={ROOF} roughness={0.7} />
      </mesh>

      {/* Front door */}
      <mesh position={[0, -0.45, 1.115]}>
        <boxGeometry args={[0.55, 1.05, 0.04]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.3} emissive={GOLD} emissiveIntensity={0.15} />
      </mesh>

      {/* Door knob */}
      <mesh position={[0.18, -0.55, 1.14]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={GOLD_BRIGHT} emissive={GOLD_BRIGHT} emissiveIntensity={0.6} metalness={1} />
      </mesh>

      {/* Front windows (left and right of door) */}
      {([
        [-0.85, 0.25, 1.115] as const,
        [0.85, 0.25, 1.115] as const,
      ]).map((pos, i) => (
        <group key={`fw-${i}`} position={pos}>
          <mesh>
            <boxGeometry args={[0.55, 0.55, 0.04]} />
            <meshStandardMaterial
              color={WINDOW_GLOW}
              emissive={WINDOW_GLOW}
              emissiveIntensity={0.9}
              metalness={0.4}
              roughness={0.2}
            />
          </mesh>
          {/* Cross frame */}
          <mesh>
            <boxGeometry args={[0.6, 0.05, 0.06]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.05, 0.6, 0.06]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Side windows */}
      {([
        [1.515, 0.2, 0] as const,
        [-1.515, 0.2, 0] as const,
      ]).map((pos, i) => (
        <mesh key={`sw-${i}`} position={pos} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.6, 0.5, 0.04]} />
          <meshStandardMaterial
            color={WINDOW_GLOW}
            emissive={WINDOW_GLOW}
            emissiveIntensity={0.7}
            metalness={0.4}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* Tiny chimney */}
      <mesh position={[0.85, 1.6, -0.3]}>
        <boxGeometry args={[0.25, 0.5, 0.25]} />
        <meshStandardMaterial color={GOLD} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Interior point light – gives the windows a soft golden glow */}
      <pointLight
        ref={lightRef}
        color={GOLD_BRIGHT}
        intensity={1.4}
        distance={5}
        position={[0, 0.2, 0]}
      />

      {/* Ground halo */}
      <mesh position={[0, -1.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 2.6, 64]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function HouseSvgFallback() {
  return (
    <svg
      viewBox="0 0 220 220"
      className="w-[260px] h-[260px] md:w-[360px] md:h-[360px] drop-shadow-[0_0_40px_rgba(250,204,21,0.35)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="goldGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#facc15" />
          <stop offset="1" stopColor="#c9a96e" />
        </linearGradient>
      </defs>
      {/* roof */}
      <polygon points="40,90 110,30 180,90" fill="#1a1a1a" stroke="url(#goldGrad)" strokeWidth="2" />
      {/* body */}
      <rect x="55" y="90" width="110" height="90" fill="#0a0a0a" stroke="url(#goldGrad)" strokeWidth="2" />
      {/* door */}
      <rect x="95" y="125" width="30" height="55" fill="url(#goldGrad)" />
      {/* windows */}
      <rect x="65" y="105" width="22" height="22" fill="#facc15" opacity="0.8" />
      <rect x="133" y="105" width="22" height="22" fill="#facc15" opacity="0.8" />
      {/* base */}
      <rect x="40" y="180" width="140" height="6" fill="url(#goldGrad)" />
    </svg>
  );
}

export default function HeroHouse3D() {
  const [supportsWebGL, setSupportsWebGL] = useState<boolean | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      setSupportsWebGL(!!gl);
    } catch {
      setSupportsWebGL(false);
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener?.('change', onChange);
      return () => mq.removeEventListener?.('change', onChange);
    }
  }, []);

  if (supportsWebGL === false || reducedMotion) {
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <HouseSvgFallback />
      </div>
    );
  }

  if (supportsWebGL === null) {
    return null;
  }

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] md:w-[640px] md:h-[640px] pointer-events-none">
      <Canvas
        camera={{ position: [4.2, 2.6, 4.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[5, 6, 4]} intensity={0.7} color="#fff5d8" />
        <directionalLight position={[-4, 3, -3]} intensity={0.25} color="#c9a96e" />
        <Suspense fallback={null}>
          <House />
        </Suspense>
      </Canvas>
    </div>
  );
}
