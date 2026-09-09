'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { AirRoomType } from '@/lib/airConditioning';
import type { AirOperationResult } from '@/lib/airOperation';

const WALL_TEXTURE_URL = 'https://cdn.polyhaven.com/asset_img/thumbs/beige_wall_001.png?width=512&height=512';
const FLOOR_TEXTURE_URL = 'https://cdn.polyhaven.com/asset_img/thumbs/wood_floor.png?width=512&height=512';

export type AirThreeSceneProps = {
  roomType: AirRoomType;
  targetTempC: number;
  ambientTempC: number;
  powerOn: boolean;
  swing: boolean;
  eco: boolean;
  sleep: boolean;
  turbo: boolean;
  capacityLabel: string;
  operation: AirOperationResult;
};

function useCdnTexture(url: string, repeatX: number, repeatY: number) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let disposed = false;
    let loaded: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (next) => {
        if (disposed) {
          next.dispose();
          return;
        }
        loaded = next;
        next.colorSpace = THREE.SRGBColorSpace;
        next.wrapS = THREE.RepeatWrapping;
        next.wrapT = THREE.RepeatWrapping;
        next.repeat.set(repeatX, repeatY);
        next.anisotropy = 4;
        setTexture(next);
      },
      undefined,
      () => setTexture(null),
    );
    return () => {
      disposed = true;
      loaded?.dispose();
    };
  }, [url, repeatX, repeatY]);

  return texture;
}

function RoomShell({ roomType }: { roomType: AirRoomType }) {
  const wall = useCdnTexture(WALL_TEXTURE_URL, 2.4, 1.5);
  const floor = useCdnTexture(FLOOR_TEXTURE_URL, 3.2, 3.2);

  return (
    <group>
      <mesh position={[0, 0.25, -1.35]} receiveShadow>
        <planeGeometry args={[6.4, 3.8]} />
        <meshStandardMaterial map={wall} color={wall ? '#ffffff' : '#b9b1a7'} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0.5]} receiveShadow>
        <planeGeometry args={[7, 6]} />
        <meshStandardMaterial map={floor} color={floor ? '#ffffff' : '#7c5d46'} roughness={0.72} />
      </mesh>
      <RoomFurniture roomType={roomType} />
    </group>
  );
}

function RoomFurniture({ roomType }: { roomType: AirRoomType }) {
  if (roomType === 'dormitorio') {
    return (
      <group position={[-1.65, -0.83, -0.2]}>
        <mesh castShadow receiveShadow><boxGeometry args={[1.75, 0.35, 1.2]} /><meshStandardMaterial color="#d7d0c7" roughness={0.86} /></mesh>
        <mesh position={[0, 0.25, -0.38]} castShadow><boxGeometry args={[1.65, 0.18, 0.48]} /><meshStandardMaterial color="#f1eee8" roughness={0.9} /></mesh>
      </group>
    );
  }
  if (roomType === 'living') {
    return (
      <group position={[-1.55, -0.78, -0.35]}>
        <mesh castShadow><boxGeometry args={[2, 0.55, 0.72]} /><meshStandardMaterial color="#6c737a" roughness={0.9} /></mesh>
        <mesh position={[0, 0.48, -0.2]} castShadow><boxGeometry args={[2, 0.48, 0.26]} /><meshStandardMaterial color="#777f87" roughness={0.9} /></mesh>
      </group>
    );
  }
  if (roomType === 'oficina') {
    return (
      <group position={[-1.55, -0.85, -0.25]}>
        <mesh castShadow><boxGeometry args={[1.8, 0.1, 0.78]} /><meshStandardMaterial color="#7a5e46" roughness={0.72} /></mesh>
        <mesh position={[0, 0.5, -0.12]} castShadow><boxGeometry args={[0.78, 0.52, 0.05]} /><meshStandardMaterial color="#242a30" metalness={0.25} roughness={0.34} /></mesh>
      </group>
    );
  }
  return (
    <group position={[-1.65, -0.72, -0.34]}>
      <mesh castShadow receiveShadow><boxGeometry args={[2.1, 0.8, 0.75]} /><meshStandardMaterial color="#8e8580" roughness={0.76} /></mesh>
      <mesh position={[0, 0.43, 0]} castShadow><boxGeometry args={[2.16, 0.08, 0.82]} /><meshStandardMaterial color="#d8d4cf" roughness={0.34} /></mesh>
    </group>
  );
}

function SplitUnit({ powerOn, swing, operation }: Pick<AirThreeSceneProps, 'powerOn' | 'swing' | 'operation'>) {
  const louver = useRef<THREE.Mesh>(null);
  const ledColor = operation.resolvedMode === 'heat' ? '#ffad66' : operation.resolvedMode === 'dry' ? '#65ead8' : '#79dcff';

  useFrame(({ clock }) => {
    if (!louver.current) return;
    const base = powerOn ? -0.26 : 0.02;
    const movement = powerOn && swing ? Math.sin(clock.elapsedTime * 1.7) * 0.19 : 0;
    louver.current.rotation.x = base + movement;
  });

  return (
    <group position={[0.65, 0.72, -0.64]} rotation={[0, -0.06, 0]}>
      <mesh castShadow>
        <boxGeometry args={[2.55, 0.58, 0.48]} />
        <meshPhysicalMaterial color="#f5f6f7" roughness={0.26} metalness={0.02} clearcoat={0.36} clearcoatRoughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0.247]}>
        <boxGeometry args={[2.38, 0.37, 0.02]} />
        <meshStandardMaterial color="#fbfbfb" roughness={0.22} />
      </mesh>
      <mesh ref={louver} position={[0, -0.275, 0.24]}>
        <boxGeometry args={[2.18, 0.08, 0.09]} />
        <meshStandardMaterial color="#27313a" roughness={0.5} />
      </mesh>
      {Array.from({ length: 12 }).map((_, index) => (
        <mesh key={index} position={[-1.02 + index * 0.185, -0.265, 0.292]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.025, 0.075, 0.03]} />
          <meshStandardMaterial color="#8f9aa2" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0.92, 0.04, 0.266]}>
        <boxGeometry args={[0.17, 0.045, 0.012]} />
        <meshStandardMaterial color={powerOn ? ledColor : '#40464b'} emissive={powerOn ? ledColor : '#000000'} emissiveIntensity={powerOn ? 1.6 : 0} />
      </mesh>
    </group>
  );
}

function AirParticles({ operation, powerOn, swing }: Pick<AirThreeSceneProps, 'operation' | 'powerOn' | 'swing'>) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 72;
  const color = operation.resolvedMode === 'heat' ? '#ff9d66' : operation.resolvedMode === 'dry' ? '#65e6d8' : operation.resolvedMode === 'fan' ? '#d7f4ff' : '#69dfff';

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const speed = 0.24 + operation.airflowPercent / 125;
    for (let i = 0; i < count; i += 1) {
      const lane = i % 9;
      const phase = (i * 0.131 + t * speed) % 1;
      const x = 0.2 + phase * 2.9;
      const wave = Math.sin(t * 1.8 + i * 0.7) * (swing ? 0.22 : 0.08);
      const y = 0.55 - phase * 0.95 + wave + (lane - 4) * 0.035;
      const z = -0.25 + (lane - 4) * 0.07;
      dummy.position.set(x, y, z);
      const scale = powerOn ? 0.018 + (operation.airflowPercent / 100) * 0.018 : 0.001;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={powerOn ? 0.7 : 0} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}

function SceneContent(props: AirThreeSceneProps) {
  const heat = props.operation.resolvedMode === 'heat';
  const accent = heat ? '#ff9d66' : props.operation.resolvedMode === 'dry' ? '#62ddc9' : '#71dfff';
  return (
    <>
      <color attach="background" args={['#080c10']} />
      <fog attach="fog" args={['#080c10', 5.5, 9.5]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[2.8, 5, 3.5]} intensity={2.2} color="#fff3dc" castShadow />
      <pointLight position={[1.8, 1.5, 1.2]} intensity={props.powerOn ? 9 : 3} distance={5} color={accent} />
      <RoomShell roomType={props.roomType} />
      <SplitUnit powerOn={props.powerOn} swing={props.swing} operation={props.operation} />
      <AirParticles operation={props.operation} powerOn={props.powerOn} swing={props.swing} />
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 2.55} maxPolarAngle={Math.PI / 1.85} minAzimuthAngle={-0.34} maxAzimuthAngle={0.34} />
    </>
  );
}

export default function AirThreeScene(props: AirThreeSceneProps) {
  const modeText = props.operation.resolvedMode === 'cool' ? 'Frío' : props.operation.resolvedMode === 'heat' ? 'Calor' : props.operation.resolvedMode === 'dry' ? 'Seco' : 'Ventilación';
  return (
    <div className="relative h-[330px] w-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#080c10] sm:h-[390px] lg:h-[420px]">
      <Canvas
        shadows
        dpr={[1, 1.45]}
        frameloop={props.powerOn ? 'always' : 'demand'}
        camera={{ position: [0.15, 1.05, 4.95], fov: 38 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <SceneContent {...props} />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[8px] font-black uppercase tracking-[.13em] text-white/70 backdrop-blur-md">Three.js · PBR CC0</div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-xl border border-cyan-200/15 bg-[#071015]/75 px-3 py-2 text-right backdrop-blur-md">
        <span className="block text-[7px] font-black uppercase tracking-[.14em] text-cyan-100/55">{modeText}</span>
        <strong className="text-xl font-black text-cyan-50">{props.targetTempC}°</strong>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/52 px-3 py-2 text-[8px] text-white/55 backdrop-blur-md">
        <span>{props.capacityLabel} BTU</span>
        <span>{props.operation.fanSpeed.toUpperCase()} · {props.operation.airflowPercent}% flujo</span>
        <span>{props.eco ? 'ECO' : props.sleep ? 'SLEEP' : props.turbo ? 'TURBO' : 'AUTO'}</span>
      </div>
    </div>
  );
}
