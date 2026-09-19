'use client';

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import { clamp } from './damage';

const MODEL_PARTS = [
  '/models/bamboo-house/model.part-01.txt',
  '/models/bamboo-house/model.part-02.txt',
  '/models/bamboo-house/model.part-03.txt',
  '/models/bamboo-house/model.part-04.txt',
];

function decodeBase64(base64: string) {
  const clean = base64.replace(/\s/g, '');
  const chunkSize = 32_768;
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (let offset = 0; offset < clean.length; offset += chunkSize) {
    const slice = clean.slice(offset, offset + chunkSize);
    const binary = atob(slice);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    chunks.push(bytes);
    total += bytes.length;
  }

  const output = new Uint8Array(total);
  let cursor = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });
  return output;
}

async function reportClientError(message: string) {
  try {
    await fetch('/api/simulador-sismico/client-error', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, userAgent: navigator.userAgent }),
      keepalive: true,
    });
  } catch {
    // La simulación debe seguir funcionando aunque la telemetría no responda.
  }
}

async function loadCompressedModel(signal: AbortSignal) {
  const parts = await Promise.all(
    MODEL_PARTS.map(async (url) => {
      const response = await fetch(url, { signal, cache: 'force-cache' });
      if (!response.ok) throw new Error(`No se pudo descargar ${url} (${response.status})`);
      return response.text();
    }),
  );

  const bytes = decodeBase64(parts.join(''));
  if (bytes.length < 20 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    throw new Error('El archivo comprimido de la vivienda está incompleto.');
  }
  if (typeof globalThis.DecompressionStream !== 'function') {
    throw new Error('Este navegador no admite descompresión GZIP nativa.');
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  const signature = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 4)));
  if (signature !== 'glTF') throw new Error('La vivienda descargada no contiene un GLB válido.');

  return new Promise<THREE.Group>((resolve, reject) => {
    new GLTFLoader().parse(buffer, '', (gltf) => resolve(gltf.scene), reject);
  });
}

function prepareModel(source: THREE.Group) {
  const model = source.clone(true);
  const roofParts: THREE.Object3D[] = [];

  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((material) => material.clone());
    else if (mesh.material) mesh.material = mesh.material.clone();

    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const name = `${object.name} ${material?.name ?? ''}`.toLowerCase();
    if (name.includes('glass')) {
      const glass = material as THREE.MeshStandardMaterial;
      glass.transparent = true;
      glass.opacity = 0.42;
      glass.roughness = 0.12;
      glass.metalness = 0.05;
      glass.side = THREE.DoubleSide;
    }
    if (name.includes('metal_dark') || name.includes('roof') || name.includes('techo')) {
      roofParts.push(object);
      object.userData.basePosition = object.position.clone();
      object.userData.baseRotation = object.rotation.clone();
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const scale = 6.4 / Math.max(size.x, size.z, 0.001);
  const position: [number, number, number] = [-center.x * scale, -box.min.y * scale, -center.z * scale];
  return { model, roofParts, scale, position };
}

function CompatibleHouse({ score, signalRef }: { score: number; signalRef: MutableRefObject<number> }) {
  const roof = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!roof.current) return;
    const stress = clamp((score - 45) / 55, 0, 1);
    roof.current.rotation.z = signalRef.current * stress * 0.006;
    roof.current.position.y = Math.abs(signalRef.current) * stress * 0.012;
  });

  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[5.8, 0.24, 4.7]} />
        <meshStandardMaterial color="#b9b9b9" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[5.35, 2.85, 4.15]} />
        <meshStandardMaterial color="#eee9df" roughness={0.82} />
      </mesh>
      <mesh position={[-2.72, 1.46, 0]}>
        <boxGeometry args={[0.16, 2.7, 4.28]} />
        <meshStandardMaterial color="#d5b46b" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.98, 2.1]}>
        <boxGeometry args={[1.05, 1.92, 0.12]} />
        <meshStandardMaterial color="#242424" roughness={0.55} />
      </mesh>
      {[-1.72, 1.72].map((x) => (
        <group key={x} position={[x, 1.52, 2.105]}>
          <mesh>
            <boxGeometry args={[1.22, 1.08, 0.1]} />
            <meshStandardMaterial color="#15232a" metalness={0.28} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0, 0.058]}>
            <boxGeometry args={[0.055, 1.02, 0.025]} />
            <meshBasicMaterial color="#f5d15a" />
          </mesh>
        </group>
      ))}
      <group ref={roof}>
        <mesh position={[-1.32, 3.18, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[3.25, 0.2, 4.85]} />
          <meshStandardMaterial color="#242424" roughness={0.68} metalness={0.12} />
        </mesh>
        <mesh position={[1.32, 3.18, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[3.25, 0.2, 4.85]} />
          <meshStandardMaterial color="#242424" roughness={0.68} metalness={0.12} />
        </mesh>
        <mesh position={[0, 3.77, 0]}>
          <boxGeometry args={[0.16, 0.16, 4.9]} />
          <meshStandardMaterial color="#facc15" roughness={0.48} />
        </mesh>
      </group>
      <mesh position={[0, 0.3, 2.58]}>
        <boxGeometry args={[2.25, 0.16, 0.9]} />
        <meshStandardMaterial color="#adadad" roughness={0.92} />
      </mesh>
    </group>
  );
}

export default function BambooHouse({ score, signalRef }: { score: number; signalRef: MutableRefObject<number> }) {
  const [source, setSource] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (mounted.current && !source) setTimedOut(true);
    }, 10_000);

    void loadCompressedModel(controller.signal)
      .then((model) => {
        if (!mounted.current) return;
        setSource(model);
        setError(null);
        setTimedOut(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || !mounted.current) return;
        const message = reason instanceof Error ? reason.message : 'No se pudo cargar el modelo original.';
        setError(message);
        void reportClientError(message);
      });

    return () => {
      mounted.current = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  // El modelo solo debe descargarse una vez al montar el visor.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prepared = useMemo(() => (source ? prepareModel(source) : null), [source]);

  useFrame(() => {
    if (!prepared) return;
    const stress = clamp((score - 58) / 42, 0, 1);
    prepared.roofParts.forEach((part, index) => {
      const basePosition = part.userData.basePosition as THREE.Vector3 | undefined;
      const baseRotation = part.userData.baseRotation as THREE.Euler | undefined;
      if (!basePosition || !baseRotation) return;
      part.position.copy(basePosition);
      part.rotation.copy(baseRotation);
      part.position.y += stress * (0.006 + Math.min(index, 30) * 0.0002) * Math.abs(signalRef.current);
      part.rotation.z += stress * signalRef.current * 0.0035;
    });
  });

  if (prepared) return <primitive object={prepared.model} scale={prepared.scale} position={prepared.position} />;

  return (
    <group>
      <CompatibleHouse score={score} signalRef={signalRef} />
      <Html center position={[0, 4.35, 0]} distanceFactor={9}>
        <div className="pointer-events-none w-64 rounded-2xl border border-yellow-300/25 bg-black/80 px-4 py-3 text-center text-xs text-white shadow-2xl backdrop-blur-xl">
          <b className="block text-yellow-300">
            {error || timedOut ? 'Modo compatible activo' : 'Cargando modelo detallado…'}
          </b>
          <span className="mt-1 block text-white/55">
            {error || timedOut ? 'La simulación continúa con una vivienda 3D optimizada para tu dispositivo.' : 'La vivienda ya puede moverse mientras termina la descarga.'}
          </span>
        </div>
      </Html>
    </group>
  );
}
