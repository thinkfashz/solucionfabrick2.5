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
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function loadCompressedModel(signal: AbortSignal) {
  const parts = await Promise.all(
    MODEL_PARTS.map(async (url) => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
      return response.text();
    }),
  );
  const bytes = decodeBase64(parts.join(''));
  if (typeof globalThis.DecompressionStream !== 'function') {
    throw new Error('El navegador no admite descompresión GZIP. Usa Chrome o Edge actualizado.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
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
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
    if (name.includes('metal_dark')) {
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

export default function BambooHouse({ score, signalRef }: { score: number; signalRef: MutableRefObject<number> }) {
  const [source, setSource] = useState<THREE.Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void loadCompressedModel(controller.signal)
      .then((model) => mounted.current && setSource(model))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted && mounted.current) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el modelo.');
      });
    return () => {
      mounted.current = false;
      controller.abort();
    };
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

  if (error) {
    return <Html center><div className="w-72 rounded-2xl border border-red-300/25 bg-black/90 p-4 text-center text-sm text-white"><b className="block text-red-200">No se pudo cargar la vivienda</b><span className="mt-2 block text-white/60">{error}</span></div></Html>;
  }
  if (!prepared) {
    return <Html center><div className="rounded-2xl border border-yellow-300/25 bg-black/85 px-5 py-4 text-sm font-black text-white">Cargando vivienda 3D…</div></Html>;
  }
  return <primitive object={prepared.model} scale={prepared.scale} position={prepared.position} />;
}
