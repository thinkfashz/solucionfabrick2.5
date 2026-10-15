'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';

/**
 * Ruptura sísmica visual del comparador.
 *
 * 1. FISURA: una grieta oscura que se propaga por el suelo entre progress
 *    0.10 → 0.25 y se desvanece hasta 0.40. Se construye una sola vez
 *    (trazado determinista con mulberry32) como cinta de triángulos hundidos.
 * 2. ONDAS: un plano de malla alta (55×44, 48×40 seg.) cuya altura se modula
 *    con senos radiales que viajan desde el epicentro (0,0) y decaen con la
 *    distancia y con `intensity`. Amplitud máxima ~3.5 cm.
 *
 * Rendimiento: sin setState por frame, sin asignaciones por frame (seno en
 * bucle sobre el atributo existente), geometrías/materiales creados una vez y
 * dispuestos en el cleanup.
 */

const GROUND_Y = -0.13; // mismo offset/grupo que TexturedGround
const WAVE_W = 55;
const WAVE_D = 44;
const SEG_X = 44;
const SEG_Z = 36;
const MAX_AMP = 0.035;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cinta de triángulos que describe una grieta serpenteante desde el epicentro. */
function createFissureGeometry(): BufferGeometry {
  const rnd = mulberry32(1337);
  const points: Array<[number, number]> = [];
  // Trazado serpenteante hacia el frente-derecha (dirección de cámara dominante).
  let x = 0;
  let z = 0;
  let heading = Math.PI * 0.28; // ~50°
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    points.push([x, z]);
    heading += (rnd() - 0.5) * 0.7;
    const step = 0.9 + rnd() * 0.7;
    x += Math.sin(heading) * step;
    z += Math.cos(heading) * step;
  }
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const [px, pz] = points[i];
    const [ppx, ppz] = points[Math.max(0, i - 1)];
    // Dirección perpendicular al segmento para ensanchar la grieta.
    const dx = px - ppx;
    const dz = pz - ppz;
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    // Ancho variable: se abre en el epicentro y se cierra en el extremo.
    const t = i / steps;
    const width = (0.16 + rnd() * 0.14) * (1 - Math.abs(t - 0.35) * 0.9);
    const w = Math.max(0.04, width);
    // Borde izquierdo hundido (-1.6 cm), borde derecho al ras: asimetría real.
    positions.push(px + nx * w, -0.016, pz + nz * w);
    positions.push(px - nx * w, -0.004, pz - nz * w);
    if (i < points.length - 1) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

type Props = {
  /** 0..1 avance de la simulación. */
  progress: number;
  /** true mientras la simulación corre. */
  playing: boolean;
  /** Intensidad sísmica 0..~0.3 (response * 0.22). */
  intensity: number;
  /** Frecuencia de la sacudida en Hz. */
  frequencyHz?: number;
};

export default function SeismicRupture({ progress, playing, intensity, frequencyHz = 2.2 }: Props) {
  const crackMeshRef = useRef<Mesh | null>(null);
  const waveMeshRef = useRef<Mesh | null>(null);
  const timeRef = useRef(0);

  const crackGeo = useMemo(() => createFissureGeometry(), []);
  const waveGeo = useMemo(
    () => new PlaneGeometry(WAVE_W, WAVE_D, SEG_X, SEG_Z),
    [],
  );
  // Guardamos las coordenadas XZ planas del plano para modular Z (altura tras rotar).
  const waveBase = useMemo(() => {
    const pos = waveGeo.attributes.position as Float32BufferAttribute;
    const arr = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      arr[i * 2] = pos.getX(i);
      arr[i * 2 + 1] = pos.getY(i); // plano XY antes de la rotación -PI/2
    }
    return arr;
  }, [waveGeo]);

  const crackMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#191108',
        roughness: 1,
        metalness: 0,
        side: DoubleSide,
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  // Ciclo de vida de la grieta: aparece 0.10-0.25, se desvanece hasta 0.40.
  const crackEnvelope = (p: number): number => {
    if (p < 0.1) return 0;
    if (p < 0.25) return (p - 0.1) / 0.15;
    if (p < 0.4) return 1 - (p - 0.25) / 0.15;
    return 0;
  };

  useEffect(
    () => () => {
      crackGeo.dispose();
      waveGeo.dispose();
      crackMaterial.dispose();
    },
    [crackGeo, waveGeo, crackMaterial],
  );

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    timeRef.current += d;
    const t = timeRef.current;

    // --- Grieta: solo opacidad ---
    const crackMat = crackMaterial;
    const env = playing ? crackEnvelope(progress) : 0;
    crackMat.opacity = env * 0.9;
    if (crackMeshRef.current) crackMeshRef.current.visible = env > 0.01;

    // --- Ondas radiales ---
    const waveMesh = waveMeshRef.current;
    if (!waveMesh) return;
    const active = playing && progress > 0.16 && progress < 0.92;
    const level = Math.min(1, intensity / 0.22);
    if (!active || level < 0.05) {
      waveMesh.visible = false;
      return;
    }
    waveMesh.visible = true;
    // Fase de ataque/decaimiento de la envolvente de las ondas.
    const attack = Math.min(1, (progress - 0.16) / 0.1);
    const release = progress > 0.8 ? 1 - (progress - 0.8) / 0.12 : 1;
    const amp = MAX_AMP * level * attack * Math.max(0, release);
    const omega = 2 * Math.PI * Math.max(0.8, frequencyHz);
    const pos = waveGeometryAttribute(waveMesh);
    const count = pos.count;
    for (let i = 0; i < count; i++) {
      const x = waveBase[i * 2];
      const y = waveBase[i * 2 + 1];
      const r = Math.hypot(x, y);
      // Onda que viaja hacia afuera (r - c·t) con decaimiento 1/(1+r·0.16).
      const wave = Math.sin(r * 1.35 - t * omega) / (1 + r * 0.16);
      // Suma una segunda frecuencia más lenta para romper la monotonía.
      const wave2 = Math.sin(r * 0.6 - t * omega * 0.45 + 1.7) / (1 + r * 0.22);
      pos.setZ(i, (wave + wave2 * 0.6) * amp);
    }
    pos.needsUpdate = true;
    waveMesh.geometry.computeVertexNormals();
  });

  return (
    <group position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        ref={crackMeshRef}
        geometry={crackGeo}
        material={crackMaterial}
        position={[0, 0, 0.045]}
        visible={false}
        receiveShadow={false}
        castShadow={false}
      />
      <mesh ref={waveMeshRef} geometry={waveGeo} position={[0, 0, 0.012]} visible={false}>
        <meshStandardMaterial
          attach="material"
          color="#0e1a12"
          transparent
          opacity={0.16}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

/** Acceso tipado al atributo de posición de la malla de ondas. */
function waveGeometryAttribute(mesh: Mesh): Float32BufferAttribute {
  return mesh.geometry.attributes.position as Float32BufferAttribute;
}
