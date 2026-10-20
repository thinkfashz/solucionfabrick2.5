'use client';
/*
 * Plano3903D — Casa Fabrick "Mediterránea" (v2, plano del cliente 2026-10-20).
 * Contrato: src/lib/plano390Data.ts.
 * x → Este (0..14,60) · z → Sur (0..11,00) · y → altura.
 *
 * • Fachada mediterránea: muros crema, franja blanca, portal de piedra,
 *   garaje al oriente, porche centrado, adoquín y vegetación.
 * • Interiores: porcelanato cálido brillante, muro de TV de 3,80 m, cocina con
 *   isla 2,40 × 1,00 y barra 1,05, baño y ensuite con medidas reales.
 * • Puertas y ventanas animadas (prop `openHouse`), luces on/off (`lightsOn`),
 *   interruptores, enchufes y apliques de muro.
 */
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  Group,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PMREMGenerator,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Material } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import {
  CCTV_CAMERAS,
  KITCHEN,
  NPC_SPOTS,
  OPENINGS,
  PLAN,
  QUINCHO,
  ROOMS,
  SCONCES,
  SWITCHES,
  TV_WALL,
  WALLS,
} from '@/lib/plano390Data';
import type { CctvCamera, Opening, WallSeg } from '@/lib/plano390Data';
import { AnimatedFigure } from '../monitoring/AnimatedFigure';
import { usePbrMaps, useTextureMaterial, useViewerTextures, viewerTextureVariant } from '../monitoring/useViewerTextures';

type Vec3 = [number, number, number];

/* ── Texturas procedurales ─────────────────────────────────────── */

function makePorcelainTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#eee8dd';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 28; i++) {
    g.strokeStyle = `rgba(162,151,136,${Math.random() * 0.09 + 0.025})`;
    g.lineWidth = 0.8 + Math.random() * 2.4;
    g.beginPath();
    const y = Math.random() * 512;
    g.moveTo(0, y);
    g.bezierCurveTo(170, y + (Math.random() * 56 - 28), 340, y + (Math.random() * 56 - 28), 512, y);
    g.stroke();
  }
  // losa de 120 × 120 cm: junta cada 256 px
  g.strokeStyle = 'rgba(174,165,151,.55)';
  g.lineWidth = 1.5;
  for (const s of [0, 256, 512]) {
    g.beginPath();
    g.moveTo(s, 0);
    g.lineTo(s, 512);
    g.moveTo(0, s);
    g.lineTo(512, s);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function makeStoneTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#ddd5c7';
  g.fillRect(0, 0, 512, 512);
  let y = 0;
  let row = 0;
  while (y < 512) {
    const h = 72 + Math.random() * 40;
    let x = row % 2 === 0 ? -60 : 0;
    while (x < 512) {
      const w = 110 + Math.random() * 90;
      const tone = 206 + Math.floor(Math.random() * 26);
      g.fillStyle = `rgb(${tone},${tone - 8},${tone - 22})`;
      g.fillRect(x + 2, y + 2, w - 4, h - 4);
      x += w;
    }
    y += h;
    row++;
  }
  g.strokeStyle = 'rgba(160,150,136,.5)';
  g.lineWidth = 3;
  for (let i = 0; i < 512; i += 128) {
    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(3, 2);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function makePaverTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#cfc9be';
  g.fillRect(0, 0, 512, 512);
  const pw = 128;
  const ph = 64;
  for (let row = 0; row < 8; row++) {
    const off = row % 2 === 0 ? 0 : pw / 2;
    for (let col = -1; col < 5; col++) {
      const x = col * pw + off;
      const y = row * ph;
      const tone = 196 + Math.floor(Math.random() * 34);
      g.fillStyle = `rgb(${tone},${tone - 4},${tone - 12})`;
      g.fillRect(x + 3, y + 3, pw - 6, ph - 6);
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
      g.fillRect(x + 6, y + 6, pw - 12, 8);
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(6, 6);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function makeStuccoTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#efe3d1';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const a = Math.random() * 0.05;
    g.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(150,132,108,${a})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.6, 1.6);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(4, 3);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function NicheEnvironment({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

/* ── Ayudas ────────────────────────────────────────────────────── */

const WALL_H = PLAN.wallH;
const EXT_T = PLAN.extT;
const INT_T = PLAN.intT;

/** Caja genérica con material compartido. */
function B({
  p,
  s,
  m,
  r,
  cast,
  recv,
}: {
  p: Vec3;
  s: Vec3;
  m: Material;
  r?: Vec3;
  cast?: boolean;
  recv?: boolean;
}) {
  return (
    <mesh position={p} rotation={r} material={m} castShadow={cast} receiveShadow={recv}>
      <boxGeometry args={s} />
    </mesh>
  );
}

/**
 * Caja con bordes levemente redondeados (radio 8–15 mm). Se usa en tapas de
 * mesas, islas y muebles donde el filo duro del boxGeometry se veía artificial.
 */
function RB({
  p,
  s,
  m,
  r,
  cast,
  recv,
  radius = 0.012,
}: {
  p: Vec3;
  s: Vec3;
  m: Material;
  r?: Vec3;
  cast?: boolean;
  recv?: boolean;
  radius?: number;
}) {
  const geo = useMemo(
    () =>
      new RoundedBoxGeometry(
        s[0],
        s[1],
        s[2],
        2,
        Math.min(radius, Math.min(s[0], s[1], s[2]) / 2 - 0.001),
      ),
    [s, radius],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} position={p} rotation={r} material={m} castShadow={cast} receiveShadow={recv} />;
}

function wallSize(seg: WallSeg) {
  const horizontal = Math.abs(seg.x1 - seg.x0) >= Math.abs(seg.z1 - seg.z0);
  const len = horizontal ? Math.abs(seg.x1 - seg.x0) : Math.abs(seg.z1 - seg.z0);
  const th = horizontal ? Math.abs(seg.z1 - seg.z0) : Math.abs(seg.x1 - seg.x0);
  return { len, th, cx: (seg.x0 + seg.x1) / 2, cz: (seg.z0 + seg.z1) / 2 };
}

/**
 * Tramos de moldura (zócalo/cornisa) que SÍ tienen muro detrás.
 * Antes se dibujaban los cuatro lados de cada ambiente: en los pasos abiertos
 * (cocina↔comedor↔living) quedaban listones flotando en medio del piso.
 * Aquí se recorta contra WALLS y se descuentan las puertas/pasos.
 */
function trimRuns(
  room: { x0: number; z0: number; x1: number; z1: number },
  y: number,
  h: number,
  th: number,
  cutDoors = true,
): { p: Vec3; s: Vec3 }[] {
  const out: { p: Vec3; s: Vec3 }[] = [];
  const off = th / 2 + 0.001;
  const edges: { axis: 'x' | 'z'; at: number; from: number; to: number; dir: 1 | -1 }[] = [
    { axis: 'x', at: room.x0, from: room.z0, to: room.z1, dir: 1 },
    { axis: 'x', at: room.x1, from: room.z0, to: room.z1, dir: -1 },
    { axis: 'z', at: room.z0, from: room.x0, to: room.x1, dir: 1 },
    { axis: 'z', at: room.z1, from: room.x0, to: room.x1, dir: -1 },
  ];

  for (const e of edges) {
    const spans: [number, number][] = [];
    for (const w of WALLS) {
      if (e.axis === 'x') {
        const wx0 = Math.min(w.x0, w.x1);
        const wx1 = Math.max(w.x0, w.x1);
        if (e.at < wx0 - 0.02 || e.at > wx1 + 0.02) continue;
        const a = Math.max(Math.min(w.z0, w.z1), e.from);
        const b = Math.min(Math.max(w.z0, w.z1), e.to);
        if (b - a > 0.02) spans.push([a, b]);
      } else {
        const wz0 = Math.min(w.z0, w.z1);
        const wz1 = Math.max(w.z0, w.z1);
        if (e.at < wz0 - 0.02 || e.at > wz1 + 0.02) continue;
        const a = Math.max(Math.min(w.x0, w.x1), e.from);
        const b = Math.min(Math.max(w.x0, w.x1), e.to);
        if (b - a > 0.02) spans.push([a, b]);
      }
    }
    if (!spans.length) continue;

    spans.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const s of spans) {
      const last = merged[merged.length - 1];
      if (last && s[0] <= last[1] + 0.001) last[1] = Math.max(last[1], s[1]);
      else merged.push([s[0], s[1]]);
    }

    // Solo los vanos que llegan al piso cortan el zócalo. La cornisa sigue
    // por encima de las puertas (cutDoors = false).
    const holes: [number, number][] = [];
    for (const o of cutDoors ? OPENINGS : []) {
      if ((o.sill ?? 0) > 0.2) continue;
      if (e.axis === 'x') {
        if (o.axis !== 'x' || Math.abs(o.x - e.at) > 0.18) continue;
        holes.push([o.z - o.width / 2, o.z + o.width / 2]);
      } else {
        if (o.axis !== 'z' || Math.abs(o.z - e.at) > 0.18) continue;
        holes.push([o.x - o.width / 2, o.x + o.width / 2]);
      }
    }

    for (const [a, b] of merged) {
      let pieces: [number, number][] = [[a, b]];
      for (const [h0, h1] of holes) {
        const next: [number, number][] = [];
        for (const [p0, p1] of pieces) {
          if (h1 <= p0 || h0 >= p1) {
            next.push([p0, p1]);
            continue;
          }
          if (h0 - p0 > 0.02) next.push([p0, h0]);
          if (p1 - h1 > 0.02) next.push([h1, p1]);
        }
        pieces = next;
      }
      for (const [p0, p1] of pieces) {
        if (p1 - p0 < 0.06) continue;
        const c = (p0 + p1) / 2;
        const len = p1 - p0;
        const pos = e.at + e.dir * off;
        out.push(
          e.axis === 'x'
            ? { p: [pos, y, c], s: [th, h, len] }
            : { p: [c, y, pos], s: [len, h, th] },
        );
      }
    }
  }
  return out;
}

function aimYaw(cam: CctvCamera): number {
  return Math.atan2(-(cam.look[0] - cam.pos[0]), -(cam.look[2] - cam.pos[2]));
}

/* ── Aberturas animadas ───────────────────────────────────────── */

function OpeningMesh({
  o,
  open,
  auto = false,
  matWall,
  matFrame,
  matDoor,
  matCasing,
}: {
  o: Opening;
  open: boolean;
  /** En tour: la hoja se abre sola cuando la cámara se acerca (POV humano). */
  auto?: boolean;
  matWall: Material;
  matFrame: Material;
  matDoor: Material;
  matCasing: Material;
}) {
  const camera = useThree((s) => s.camera);
  const leaf = useRef<Group>(null);
  const leaf2 = useRef<Group>(null);
  const paneA = useRef<Group>(null);
  const paneB = useRef<Group>(null);
  const panel = useRef<Group>(null);

  const th = o.ext ? EXT_T : INT_T;
  const sill = o.sill ?? 0;
  const top = sill + o.height;
  const lintelH = Math.max(0, WALL_H - top);
  const alongZ = o.axis === 'z';

  const isDoor = o.kind === 'door' || o.kind === 'double';

  useFrame((_, dt) => {
    const k = Math.min(1, dt * 6);
    // Apertura automática: puerta que se abre al paso de la cámara (solo tour).
    const dx = camera.position.x - o.x;
    const dz = camera.position.z - o.z;
    const near = auto && isDoor && dx * dx + dz * dz < 8.4;
    // El portón se levanta en el tour para que la cámara salga al jardín.
    const nearGarage = auto && o.kind === 'garage' && dx * dx + dz * dz < 16;
    const isOpen = open || near;
    const doorTarget = isOpen ? (o.swing ?? 1) * -1.35 : 0;
    const slide = isOpen ? o.width * 0.44 : 0;
    if (leaf.current) leaf.current.rotation.y = MathUtils.lerp(leaf.current.rotation.y, doorTarget, k);
    if (leaf2.current) leaf2.current.rotation.y = MathUtils.lerp(leaf2.current.rotation.y, -doorTarget, k);
    if (paneA.current) {
      if (alongZ) paneA.current.position.x = MathUtils.lerp(paneA.current.position.x, -slide, k);
      else paneA.current.position.z = MathUtils.lerp(paneA.current.position.z, -slide, k);
    }
    if (paneB.current) {
      if (alongZ) paneB.current.position.x = MathUtils.lerp(paneB.current.position.x, slide, k);
      else paneB.current.position.z = MathUtils.lerp(paneB.current.position.z, slide, k);
    }
    // El portón responde al interruptor global y se abre al paso en el tour.
    if (panel.current) {
      panel.current.scale.y = MathUtils.lerp(panel.current.scale.y, open || nearGarage ? 0.04 : 1, k);
    }
  });

  // marco
  const frame = (
    <>
      <B p={[o.x, top, o.z]} s={alongZ ? [o.width, 0.07, th + 0.02] : [th + 0.02, 0.07, o.width]} m={matFrame} />
      <B p={[o.x, sill, o.z]} s={alongZ ? [o.width, 0.07, th + 0.02] : [th + 0.02, 0.07, o.width]} m={matFrame} />
      <B
        p={alongZ ? [o.x - o.width / 2, o.height / 2 + sill, o.z] : [o.x, o.height / 2 + sill, o.z - o.width / 2]}
        s={alongZ ? [0.07, o.height, th + 0.02] : [th + 0.02, o.height, 0.07]}
        m={matFrame}
      />
      <B
        p={alongZ ? [o.x + o.width / 2, o.height / 2 + sill, o.z] : [o.x, o.height / 2 + sill, o.z + o.width / 2]}
        s={alongZ ? [0.07, o.height, th + 0.02] : [th + 0.02, o.height, 0.07]}
        m={matFrame}
      />
    </>
  );

  // Moldura blanca (casing) de puertas y ventanas + alféizar de piedra.
  const casing =
    o.kind === 'garage' || o.kind === 'pass' ? null : (
      <>
        <B
          p={[o.x, top + 0.045, o.z]}
          s={alongZ ? [o.width + 0.2, 0.09, th + 0.06] : [th + 0.06, 0.09, o.width + 0.2]}
          m={matCasing}
          cast
        />
        <B
          p={alongZ ? [o.x - o.width / 2 - 0.055, sill + o.height / 2, o.z] : [o.x, sill + o.height / 2, o.z - o.width / 2 - 0.055]}
          s={alongZ ? [0.1, o.height + 0.02, th + 0.06] : [th + 0.06, o.height + 0.02, 0.1]}
          m={matCasing}
          cast
        />
        <B
          p={alongZ ? [o.x + o.width / 2 + 0.055, sill + o.height / 2, o.z] : [o.x, sill + o.height / 2, o.z + o.width / 2 + 0.055]}
          s={alongZ ? [0.1, o.height + 0.02, th + 0.06] : [th + 0.06, o.height + 0.02, 0.1]}
          m={matCasing}
          cast
        />
        {o.kind === 'window' || o.kind === 'slider' ? (
          (o.sill ?? 0) > 0.2 ? (
          <B
            p={[o.x, Math.max(0.06, sill - 0.02), o.z]}
            s={alongZ ? [o.width + 0.24, 0.04, th + 0.22] : [th + 0.22, 0.04, o.width + 0.24]}
            m={matCasing}
            cast
          />
          ) : null
        ) : null}
      </>
    );

  // antepecho y dintel (muro)
  const wallFill = (
    <>
      {sill > 0.02 ? (
        <B p={[o.x, sill / 2, o.z]} s={alongZ ? [o.width, sill, th] : [th, sill, o.width]} m={matWall} cast recv />
      ) : null}
      {lintelH > 0.02 ? (
        <B
          p={[o.x, top + lintelH / 2, o.z]}
          s={alongZ ? [o.width, lintelH, th] : [th, lintelH, o.width]}
          m={matWall}
          cast
          recv
        />
      ) : null}
    </>
  );

  if (o.kind === 'pass') {
    return (
      <>
        {wallFill}
        {frame}
      </>
    );
  }

  if (o.kind === 'garage') {
    return (
      <>
        {wallFill}
        {frame}
        <group ref={panel} position={[o.x, o.height, o.z]}>
          <mesh position={[0, -o.height / 2, 0]} castShadow material={matFrame}>
            <boxGeometry args={[o.width, o.height, 0.09]} />
          </mesh>
          {[0.18, 0.38, 0.58, 0.78].map((f) => (
            <mesh key={f} position={[0, -o.height * f, 0.05]}>
              <boxGeometry args={[o.width, 0.02, 0.02]} />
              <meshStandardMaterial color="#0d1114" roughness={0.6} />
            </mesh>
          ))}
        </group>
      </>
    );
  }

  if (o.kind === 'door' || o.kind === 'double') {
    const leaves: { hinge: number; rot: number }[] =
      o.kind === 'double'
        ? [
            { hinge: -o.width / 2, rot: 1 },
            { hinge: o.width / 2, rot: -1 },
          ]
        : [{ hinge: o.hinge === 'right' ? o.width / 2 : -o.width / 2, rot: 1 }];
    const leafW = o.kind === 'double' ? o.width / 2 - 0.02 : o.width - 0.06;
    return (
      <>
        {wallFill}
        {casing}
        {frame}
        {leaves.map((l, i) => {
          const gx = alongZ ? o.x + l.hinge : o.x;
          const gz = alongZ ? o.z : o.z + l.hinge;
          const sx = alongZ ? (l.hinge > 0 ? -1 : 1) : 1;
          return (
            <group
              key={i}
              ref={i === 0 ? leaf : leaf2}
              position={[gx, 0, gz]}
            >
              <mesh
                position={alongZ ? [(sx * leafW) / 2, sill + o.height / 2, 0] : [0, sill + o.height / 2, (l.hinge > 0 ? -1 : 1) * leafW / 2]}
                castShadow
                material={o.glass ? matFrame : matDoor}
              >
                <boxGeometry args={alongZ ? [leafW, o.height - 0.08, 0.05] : [0.05, o.height - 0.08, leafW]} />
              </mesh>
              {o.glass ? (
                <mesh
                  position={alongZ ? [(sx * leafW) / 2, sill + o.height / 2, 0] : [0, sill + o.height / 2, (l.hinge > 0 ? -1 : 1) * leafW / 2]}
                >
                  <boxGeometry args={alongZ ? [leafW - 0.12, o.height - 0.28, 0.02] : [0.02, o.height - 0.28, leafW - 0.12]} />
                  <meshStandardMaterial color="#dcecf4" transparent opacity={0.22} metalness={0.5} roughness={0.03} envMapIntensity={1.8} />
                </mesh>
              ) : (
                <mesh
                  position={
                    alongZ
                      ? [sx * (leafW - 0.1), 1.02, 0.05]
                      : [0.05, 1.02, (l.hinge > 0 ? -1 : 1) * (leafW - 0.1)]
                  }
                >
                  <boxGeometry args={alongZ ? [0.12, 0.025, 0.025] : [0.025, 0.025, 0.12]} />
                  <meshStandardMaterial color="#c9a86a" metalness={0.95} roughness={0.22} />
                </mesh>
              )}
            </group>
          );
        })}
      </>
    );
  }

  // ventanas / correderas: dos hojas de vidrio
  const half = o.width / 2;
  const paneH = o.height - 0.1;
  return (
    <>
      {wallFill}
      {casing}
      {frame}
      <group ref={paneA} position={alongZ ? [o.x - half / 2, 0, o.z] : [o.x, 0, o.z - half / 2]}>
        <mesh position={[0, sill + o.height / 2, 0]}>
          <boxGeometry args={alongZ ? [half - 0.02, paneH, 0.035] : [0.035, paneH, half - 0.02]} />
          <meshStandardMaterial color="#d8eaf4" transparent opacity={0.24} metalness={0.45} roughness={0.02} envMapIntensity={1.9} />
        </mesh>
      </group>
      <group ref={paneB} position={alongZ ? [o.x + half / 2, 0, o.z] : [o.x, 0, o.z + half / 2]}>
        <mesh position={[0, sill + o.height / 2, 0]}>
          <boxGeometry args={alongZ ? [half - 0.02, paneH, 0.035] : [0.035, paneH, half - 0.02]} />
          <meshStandardMaterial color="#d8eaf4" transparent opacity={0.24} metalness={0.45} roughness={0.02} envMapIntensity={1.9} />
        </mesh>
      </group>
    </>
  );
}

/* ── Apliques, interruptores y vegetación ─────────────────────── */

function Sconce({ x, y, z, rot, on, glow }: { x: number; y: number; z: number; rot: number; on: boolean; glow?: boolean }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.1, 0.26, 0.1]} />
        <meshStandardMaterial color="#2b2f33" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <boxGeometry args={[0.075, 0.2, 0.025]} />
        <meshStandardMaterial color="#fff3db" emissive="#ffd9a0" emissiveIntensity={on ? 1.8 : 0.04} />
      </mesh>
      {on && glow ? <pointLight position={[0, 0, 0.35]} intensity={1.1} color="#ffd9a0" distance={4.5} decay={2} /> : null}
    </group>
  );
}

function Plate({ x, y, z, rot, outlet }: { x: number; y: number; z: number; rot: number; outlet?: boolean }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      <mesh>
        <boxGeometry args={[0.09, 0.12, 0.012]} />
        <meshStandardMaterial color="#fbf8f1" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.008]}>
        <boxGeometry args={outlet ? [0.045, 0.05, 0.006] : [0.02, 0.055, 0.006]} />
        <meshStandardMaterial color={outlet ? '#2a2d31' : '#c9c4ba'} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Grass({ x, z, s = 1, phase = 0 }: { x: number; z: number; s?: number; phase?: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + phase) * 0.07;
  });
  return (
    <group position={[x, 0, z]} scale={[s, s, s]} ref={ref}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[(i - 2.5) * 0.035, 0.32, (i % 2) * 0.04]} rotation={[0, 0, (i - 2.5) * 0.09]}>
          <boxGeometry args={[0.025, 0.62 + (i % 3) * 0.14, 0.025]} />
          <meshStandardMaterial color={i % 2 ? '#7d8f5c' : '#93a76a'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Hedge({ x, z, w, d, h = 0.75 }: { x: number; z: number; w: number; d: number; h?: number }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = Math.sin(clock.elapsedTime * 0.8 + x) * 0.008;
  });
  return (
    <group position={[x, 0, z]} ref={ref}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#6f8450" roughness={0.95} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w * 0.96, 0.06, d * 0.9]} />
        <meshStandardMaterial color="#81975c" roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ── Mobiliario ────────────────────────────────────────────────── */

function Bed({
  x,
  z,
  w = 1.6,
  head,
  rot = 0,
  matWood,
  matLinen,
}: {
  x: number;
  z: number;
  w?: number;
  head: 1 | -1;
  /** 0 = cabecera al norte; ±90° = cabecera al poniente/oriente. */
  rot?: number;
  matWood: Material;
  matLinen: Material;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <B p={[0, 0.2, 0]} s={[w, 0.28, 2.0]} m={matWood} cast recv />
      <B p={[0, 0.42, 0.05]} s={[w - 0.08, 0.22, 1.94]} m={matLinen} cast />
      <B p={[0, 0.62, head * -0.62]} s={[w - 0.2, 0.1, 0.6]} m={matLinen} />
      <B p={[0, 0.95, head * 1.02]} s={[w + 0.16, 0.9, 0.08]} m={matWood} cast />
      <B p={[0, 0.75, head * 1.0]} s={[w - 0.3, 0.35, 0.14]} m={matLinen} />
      <B p={[0, 0.5, head * -0.9]} s={[w - 0.25, 0.05, 0.5]} m={matWood} />
    </group>
  );
}

function Desk({
  x,
  z,
  w = 1.2,
  rot = 0,
  matWood,
  matWall,
}: {
  x: number;
  z: number;
  w?: number;
  /** 0 = contra muro sur; +90° = contra muro oriente. */
  rot?: number;
  matWood: Material;
  matWall: Material;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <B p={[0, 0.78, 0]} s={[w, 0.05, 0.55]} m={matWood} cast />
      <B p={[-w / 2 + 0.05, 0.4, 0]} s={[0.05, 0.76, 0.5]} m={matWood} />
      <B p={[w / 2 - 0.05, 0.4, 0]} s={[0.05, 0.76, 0.5]} m={matWood} />
      {/* Panel de corcho pegado al muro, no una pared flotante sobre el escritorio. */}
      <B p={[0, 1.55, 0.32]} s={[w - 0.28, 0.62, 0.03]} m={matWall} cast />
      <B p={[0, 1.55, 0.332]} s={[w - 0.38, 0.52, 0.012]} m={matWood} />
      {/* Lámpara de escritorio y cuaderno. */}
      <B p={[-w / 2 + 0.22, 0.83, 0.02]} s={[0.16, 0.03, 0.16]} m={matWood} />
      <B p={[-w / 2 + 0.22, 1.08, 0.02]} s={[0.025, 0.5, 0.025]} m={matWood} />
      <B p={[-w / 2 + 0.22, 1.25, 0.02]} s={[0.16, 0.1, 0.16]} m={matWall} />
      <B p={[w / 2 - 0.27, 0.82, 0.02]} s={[0.34, 0.02, 0.24]} m={matWall} />
    </group>
  );
}

function Chair({
  x,
  z,
  rot = 0,
  matWood,
  matLinen,
}: {
  x: number;
  z: number;
  rot?: number;
  matWood: Material;
  matLinen: Material;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <B p={[0, 0.46, 0]} s={[0.45, 0.06, 0.45]} m={matLinen} cast />
      <B p={[0, 0.7, -0.21]} s={[0.45, 0.5, 0.05]} m={matLinen} cast />
      {[[-0.17, -0.17], [-0.17, 0.17], [0.17, -0.17], [0.17, 0.17]].map(([dx, dz], i) => (
        <B key={i} p={[dx, 0.22, dz]} s={[0.035, 0.44, 0.035]} m={matWood} />
      ))}
    </group>
  );
}

function Wardrobe({
  x,
  z,
  w,
  h = 2.2,
  rot = 0,
  mat,
}: {
  x: number;
  z: number;
  w: number;
  h?: number;
  /** 0 = frente al sur; -90° = frente al poniente, respaldo al muro oriente. */
  rot?: number;
  mat: Material;
}) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <B p={[0, h / 2, 0]} s={[w, h, 0.58]} m={mat} cast />
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-w / 2 + (w / 3) * (i + 0.5), h / 2, 0.3]}>
          <boxGeometry args={[0.008, h - 0.12, 0.01]} />
          <meshStandardMaterial color="#b9b0a1" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[w / 6, h * 0.62, 0.31]}>
        <boxGeometry args={[0.02, 0.32, 0.02]} />
        <meshStandardMaterial color="#c9a76a" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

/* ── POV humano: cuerpo en primera persona (manos y antebrazos) ── */

function FirstPersonHands() {
  const camera = useThree((st) => st.camera);
  const g = useRef<Group>(null);
  // Materiales de overlay: siempre por delante de la geometría (como un FPS).
  const skin = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#b9805f',
        roughness: 0.64,
        metalness: 0.02,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const sleeve = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ded5c5',
        roughness: 0.95,
        metalness: 0.01,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const cuff = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#2a201b',
        roughness: 0.8,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.elapsedTime;
    g.current.position.copy(camera.position);
    g.current.quaternion.copy(camera.quaternion);
    g.current.translateX(Math.sin(t * 1.3) * 0.006);
    g.current.translateY(-0.07 + Math.sin(t * 6.4) * 0.0045);
    g.current.translateZ(-0.12);
  });

  return (
    <group ref={g}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.055, 0, 0]} rotation={[-0.25, side * 0.1, side * 0.02]}>
          {/* manga (cerca de la cámara) */}
          <mesh position={[0, 0, -0.06]} material={sleeve} renderOrder={999}>
            <boxGeometry args={[0.1, 0.09, 0.18]} />
          </mesh>
          <mesh position={[0, 0, -0.155]} material={cuff} renderOrder={999}>
            <boxGeometry args={[0.102, 0.092, 0.02]} />
          </mesh>
          {/* antebrazo */}
          <mesh position={[0, 0.002, -0.25]} material={skin} renderOrder={999}>
            <boxGeometry args={[0.075, 0.07, 0.2]} />
          </mesh>
          {/* dorso de la mano */}
          <mesh position={[0, 0, -0.385]} material={skin} renderOrder={999}>
            <boxGeometry args={[0.08, 0.036, 0.1]} />
          </mesh>
          {/* dedos curvados */}
          {[-0.027, -0.009, 0.009, 0.027].map((fx, fi) => (
            <mesh
              key={fx}
              position={[fx, -0.004, -0.448 + Math.abs(fi - 1.5) * 0.005]}
              rotation={[-0.5, 0, 0]}
              material={skin}
              renderOrder={999}
            >
              <boxGeometry args={[0.015, 0.024, 0.07]} />
            </mesh>
          ))}
          {/* pulgar hacia el centro */}
          <mesh position={[side * -0.045, -0.002, -0.375]} rotation={[0, 0, side * 0.5]} material={skin} renderOrder={999}>
            <boxGeometry args={[0.022, 0.026, 0.065]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Planta interior ──────────────────────────────────────────── */

function IndoorPlant({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={[s, s, s]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.15, 0.4, 16]} />
        <meshStandardMaterial color="#b9a894" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.03, 16]} />
        <meshStandardMaterial color="#3a3025" roughness={0.95} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        const r = 0.11 + (i % 2) * 0.06;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.72 + (i % 3) * 0.12, Math.sin(a) * r]} rotation={[0.35, a, 0.4]} castShadow>
            <coneGeometry args={[0.085, 0.5, 6]} />
            <meshStandardMaterial color={i % 2 ? '#5f7a4c' : '#6f8a55'} roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Escena ────────────────────────────────────────────────────── */

export default function Plano3903D({
  light,
  lightsOn = true,
  openHouse = false,
  showHands = true,
  showNpc = true,
  planView = false,
  autoDoors = false,
}: {
  light: 'day' | 'sunset' | 'night';
  lightsOn?: boolean;
  openHouse?: boolean;
  /** Cuerpo en primera persona (manos/antebrazos). */
  showHands?: boolean;
  /** Personajes de escala; se ocultan en tour/CCTV para no tapar el encuadre. */
  showNpc?: boolean;
  /** Vista de plano elevada: oculta cielo raso, techo, downlights y cámaras. */
  planView?: boolean;
  /** Abre las puertas al acercarse la cámara (recorrido POV). */
  autoDoors?: boolean;
}) {
  const textures = useViewerTextures();
  const oak = usePbrMaps('woodOak');
  const pine = usePbrMaps('woodPine');
  const porcelainCanvas = useMemo(() => makePorcelainTexture(), []);
  const stoneCanvas = useMemo(() => makeStoneTexture(), []);
  const paverCanvas = useMemo(() => makePaverTexture(), []);
  const stuccoCanvas = useMemo(() => makeStuccoTexture(), []);

  const woodMap = useMemo(() => viewerTextureVariant('pisoMadera', 7, 5), [textures]);
  const wallMap = useMemo(() => viewerTextureVariant('intDrywall', 3, 2), [textures]);
  const grassMap = useMemo(() => viewerTextureVariant('pastoCalle', 16, 12), [textures]);

  const matWood = useTextureMaterial(woodMap, { color: '#ffffff', roughness: 0.6, metalness: 0.03, envMapIntensity: 0.7 });
  // Paredes en verde limón: separan muro, piso y cielo raso de un vistazo.
  // El portal de piedra y la franja blanca mantienen el acento mediterráneo.
  const matWallInt = useTextureMaterial(wallMap, { color: '#c8db8a', roughness: 0.92, envMapIntensity: 0.26 });
  // Fachada en verde limón suave: la misma familia cromática que el interior,
  // con el portal de piedra y la franja blanca como acentos mediterráneos.
  const matWallExt = useTextureMaterial(stuccoCanvas, { color: '#d8c6a4', roughness: 0.9, envMapIntensity: 0.28 });
  const matBand = useTextureMaterial(stuccoCanvas, { color: '#fbf8f1', roughness: 0.8, envMapIntensity: 0.4 });
  const matCeil = useTextureMaterial(wallMap, { color: '#fbf7ef', roughness: 0.95, envMapIntensity: 0.25 });
  // Porcelanato cálido tipo piedra clara: combina con el limón sin blanquear la escena.
  const matPorcelain = useTextureMaterial(porcelainCanvas, { color: '#e7dfd2', roughness: 0.16, metalness: 0.03, envMapIntensity: 1.15 });
  const matStone = useTextureMaterial(stoneCanvas, { color: '#efe7d9', roughness: 0.78, metalness: 0.02, envMapIntensity: 0.5 });
  const matPaver = useTextureMaterial(paverCanvas, { color: '#ffffff', roughness: 0.85, envMapIntensity: 0.35 });
  const matGrass = useTextureMaterial(grassMap, { color: '#93a97c', roughness: 0.96, envMapIntensity: 0.25 });
  const matConcrete = useMemo(
    () => new MeshStandardMaterial({ color: '#8f918c', roughness: 0.72, metalness: 0.02, envMapIntensity: 0.35 }),
    [],
  );
  const matOak = useTextureMaterial(oak.color, {
    color: '#ffffff',
    roughness: 0.6,
    normalMap: oak.normal,
    roughnessMap: oak.roughness,
    envMapIntensity: 0.55,
  });
  const matPine = useTextureMaterial(pine.color, {
    color: '#e8cfa8',
    roughness: 0.72,
    normalMap: pine.normal,
    roughnessMap: pine.roughness,
    envMapIntensity: 0.4,
  });
  const matFrame = useMemo(
    () => new MeshStandardMaterial({ color: '#22282c', roughness: 0.42, metalness: 0.5 }),
    [],
  );
  const matLinen = useMemo(
    () => new MeshStandardMaterial({ color: '#e9e3d7', roughness: 0.94, metalness: 0.02 }),
    [],
  );
  const matTerracotta = useMemo(
    () => new MeshStandardMaterial({ color: '#b8674a', roughness: 0.92, metalness: 0.02 }),
    [],
  );
  const matSage = useMemo(
    () => new MeshStandardMaterial({ color: '#7f8f6e', roughness: 0.92, metalness: 0.02 }),
    [],
  );
  const matBrass = useMemo(
    () => new MeshStandardMaterial({ color: '#c9a76a', roughness: 0.28, metalness: 0.9 }),
    [],
  );
  const matMirror = useMemo(
    () => new MeshStandardMaterial({ color: '#cfe3ee', roughness: 0.04, metalness: 0.82, envMapIntensity: 1.7 }),
    [],
  );
  /** Guardapolvo satinado: más claro que el muro y con brillo propio. */
  const matSkirt = useMemo(
    () => new MeshStandardMaterial({ color: '#f8f2e7', roughness: 0.5, metalness: 0.02, envMapIntensity: 0.55 }),
    [],
  );
  /** Núcleo del LED: emisivo puro, no depende de las luces de la escena. */
  const matLed = useMemo(
    () =>
      new MeshBasicMaterial({
        color: lightsOn ? '#fff2d2' : '#4c4336',
        toneMapped: false,
      }),
    [lightsOn],
  );
  /** Halo suave alrededor del LED (aditivo, sin escribir profundidad). */
  const matLedGlow = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ffca82',
        transparent: true,
        opacity: lightsOn ? 0.22 : 0,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
    [lightsOn],
  );

  const night = light === 'night';
  const sunPos: Vec3 = light === 'sunset' ? [2.5, 2.2, 26] : [6.5, 16, 26];
  const bg = night ? '#0a1522' : light === 'sunset' ? '#f4c9a0' : '#dfeaf3';
  const sunColor = night ? '#93abd8' : light === 'sunset' ? '#ffb46e' : '#eef6ff';
  const sunIntensity = night ? 0.2 : light === 'sunset' ? 1.9 : 2.45;
  const lamp = lightsOn ? (night ? 1.1 : 0.55) : 0;

  if (!porcelainCanvas) return null;

  const wallsRender = WALLS.filter((w) => !w.window);

  return (
    <>
      <NicheEnvironment intensity={night ? 0.55 : 1.05} />
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 34, 92]} />
      {night ? (
        <Stars radius={140} depth={50} count={2200} factor={3.4} saturation={0} fade speed={0.35} />
      ) : (
        <Sky
          distance={450000}
          sunPosition={sunPos}
          turbidity={light === 'sunset' ? 9.5 : 4.2}
          rayleigh={light === 'sunset' ? 3.6 : 1.5}
          mieCoefficient={0.006}
          mieDirectionalG={0.85}
        />
      )}

      {/* ── Terreno: césped + adoquín + camino ── */}
      <mesh position={[7.3, -0.03, 9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={matGrass}>
        <planeGeometry args={[64, 52]} />
      </mesh>
      {/* En planta el césped procedural se lee como rayas: base neutra para el plano. */}
      {planView ? (
        <mesh position={[7.3, -0.025, 9]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[64, 52]} />
          <meshStandardMaterial color="#e8ecdd" roughness={1} />
        </mesh>
      ) : null}
      <B p={[12.0, 0.01, 15.6]} s={[5.4, 0.06, 9.2]} m={matPaver} recv />
      <B p={[7.05, 0.01, 16.2]} s={[1.9, 0.06, 7.4]} m={matPaver} recv />
      <B p={[2.8, 0.01, 14.2]} s={[5.2, 0.06, 2.4]} m={matPaver} recv />

      {/* ── Losa base continua (cubre umbrales y juntas entre ambientes) ── */}
      <B p={[7.3, 0.0175, 5.5]} s={[14.6, 0.075, 11]} m={matPorcelain} recv />

      {/* ── Pisos por ambiente ── */}
      {ROOMS.map((room) => (
        <mesh
          key={room.id}
          position={[(room.x0 + room.x1) / 2, 0.03 + (room.id === '14' || room.id === '15' ? 0.005 : 0), (room.z0 + room.z1) / 2]}
          receiveShadow
          material={
            room.floor === 'porcelain'
              ? matPorcelain
              : room.floor === 'wood'
                ? matWood
                : room.floor === 'terrace'
                  ? matPaver
                  : room.floor === 'concrete'
                    ? matConcrete
                    : matStone
          }
        >
          <boxGeometry args={[room.x1 - room.x0, 0.06, room.z1 - room.z0]} />
        </mesh>
      ))}

      {/* ── Cielorraso (oculto en la vista de plano elevado) ── */}
      {!planView &&
        ROOMS.filter((r) => r.id !== '12' && r.id !== '14' && r.id !== '15').map((room) => (
          <mesh
            key={`c${room.id}`}
            position={[(room.x0 + room.x1) / 2, WALL_H - 0.04, (room.z0 + room.z1) / 2]}
            receiveShadow
            material={matCeil}
          >
            <boxGeometry args={[room.x1 - room.x0, 0.06, room.z1 - room.z0]} />
          </mesh>
        ))}

      {/* ── Muros ── */}
      {wallsRender.map((seg, i) => {
        const { len, th, cx, cz } = wallSize(seg);
        return (
          <mesh key={`w${i}`} position={[cx, WALL_H / 2, cz]} castShadow receiveShadow material={seg.kind === 'ext' ? matWallExt : matWallInt}>
            <boxGeometry args={[len, WALL_H, th]} />
          </mesh>
        );
      })}

      {/* ── Guardapolvo perimetral: solo tramos con muro real ── */}
      {ROOMS.filter((r) => r.id !== '11' && r.id !== '12').map((room) => (
        <group key={`zb${room.id}`}>
          {trimRuns(room, 0.13, 0.14, 0.03).map((run, i) => (
            <B key={`b${i}`} p={run.p} s={run.s} m={matSkirt} cast />
          ))}
          {trimRuns(room, 0.205, 0.015, 0.042).map((run, i) => (
            <B key={`t${i}`} p={run.p} s={run.s} m={matBand} />
          ))}
        </group>
      ))}

      {/* ── Cornisa en recepción, cocina y despensa ── */}
      {ROOMS.filter((r) => ['2', '4', '9', '13'].includes(r.id)).map((room) => (
        <group key={`cr${room.id}`}>
          {trimRuns(room, 2.685, 0.09, 0.05, false).map((run, i) => (
            <B key={`c${i}`} p={run.p} s={run.s} m={matBand} />
          ))}
        </group>
      ))}

      {/* ── Aberturas animadas ── */}
      {OPENINGS.map((o) => (
        <OpeningMesh
          key={o.id}
          o={o}
          open={openHouse}
          auto={autoDoors}
          matWall={o.ext ? matWallExt : matWallInt}
          matFrame={matFrame}
          matDoor={matOak}
          matCasing={matBand}
        />
      ))}

      {/* ── Techo plano + franja blanca + portal de piedra ── */}
      {!planView ? <B p={[7.3, WALL_H + 0.16, 5.5]} s={[15.2, 0.28, 11.9]} m={matFrame} cast recv /> : null}
      <B p={[7.3, WALL_H + 0.02, 11.12]} s={[15.0, 0.34, 0.34]} m={matBand} cast />
      <B p={[7.3, WALL_H + 0.02, -0.12]} s={[15.0, 0.34, 0.34]} m={matBand} cast />
      <B p={[-0.12, WALL_H + 0.02, 5.5]} s={[0.34, 0.34, 11.3]} m={matBand} cast />
      <B p={[14.72, WALL_H + 0.02, 5.5]} s={[0.34, 0.34, 11.3]} m={matBand} cast />
      {/* portal (piedra) */}
      <B p={[5.95, 1.5, 11.16]} s={[0.8, 3.0, 0.42]} m={matStone} cast />
      <B p={[8.45, 1.5, 11.16]} s={[0.8, 3.0, 0.42]} m={matStone} cast />
      <B p={[7.2, 2.72, 11.16]} s={[3.3, 0.56, 0.42]} m={matStone} cast />
      <B p={[7.2, 3.03, 11.16]} s={[3.5, 0.14, 0.52]} m={matBand} cast />
      {/* porche: cielo y escalones */}
      {!planView ? <B p={[7.35, 2.86, 11.72]} s={[3.9, 0.12, 1.96]} m={matBand} cast /> : null}
      <B p={[7.35, 0.09, 12.7]} s={[3.9, 0.18, 0.42]} m={matPaver} recv />
      <B p={[7.35, 0.05, 13.02]} s={[4.2, 0.1, 0.34]} m={matPaver} recv />

      {/* ── Muro de TV (3,80 m) ── */}
      <group>
        {Array.from({ length: 15 }).map((_, i) => (
          <B
            key={`s${i}`}
            p={[3.5, 1.3, 7.06 + i * 0.049]}
            s={[0.05, 2.5, 0.04]}
            m={matPine}
            cast
          />
        ))}
        {Array.from({ length: 17 }).map((_, i) => (
          <B
            key={`s2${i}`}
            p={[3.5, 1.3, 9.97 + i * 0.049]}
            s={[0.05, 2.5, 0.04]}
            m={matPine}
            cast
          />
        ))}
        <B p={[3.52, 1.25, 9.0]} s={[0.06, 1.8, 2.2]} m={matStone} cast />
        <mesh position={[3.573, TV_WALL.tv.y, 9.0]} material={matLedGlow}>
          <boxGeometry args={[0.008, TV_WALL.tv.h + 0.24, TV_WALL.tv.w + 0.24]} />
        </mesh>
        <B p={[3.585, TV_WALL.tv.y, 9.0]} s={[0.06, TV_WALL.tv.h, TV_WALL.tv.w]} m={matFrame} cast />
        <mesh position={[3.625, TV_WALL.tv.y, 9.0]}>
          <boxGeometry args={[0.01, TV_WALL.tv.h - 0.04, TV_WALL.tv.w - 0.04]} />
          <meshStandardMaterial color="#0a0d10" roughness={0.18} metalness={0.3} envMapIntensity={1.4} />
        </mesh>
        <B p={[3.77, 0.47, 9.0]} s={[0.5, 0.45, 2.6]} m={matPine} cast />
        <RB p={[3.77, 0.72, 9.0]} s={[0.54, 0.06, 2.64]} m={matBand} radius={0.018} cast />
        {/* soundbar y consola: el TV queda alineado con el centro del sofá */}
        <B p={[3.78, 0.98, 9.0]} s={[0.16, 0.09, 1.15]} m={matFrame} cast />
        {[8.1, 9.0, 9.9].map((z) => (
          <B key={`tvhandle${z}`} p={[4.045, 0.52, z]} s={[0.018, 0.025, 0.32]} m={matBrass} />
        ))}
        {/* zócalo LED del mueble */}
        <mesh position={[4.02, 0.245, 9.0]} material={matLed}>
          <boxGeometry args={[0.018, 0.02, 2.5]} />
        </mesh>
        <mesh position={[4.02, 0.245, 9.0]} material={matLedGlow}>
          <boxGeometry args={[0.03, 0.07, 2.5]} />
        </mesh>
        {/* marco de luz del panel de piedra */}
        {[8.0, 10.0].map((z) => (
          <group key={`ledv${z}`}>
            <mesh position={[3.558, 1.35, z]} material={matLed}>
              <boxGeometry args={[0.012, 2.1, 0.025]} />
            </mesh>
            <mesh position={[3.558, 1.35, z]} material={matLedGlow}>
              <boxGeometry args={[0.022, 2.1, 0.07]} />
            </mesh>
          </group>
        ))}
        <mesh position={[3.558, 2.42, 9.0]} material={matLed}>
          <boxGeometry args={[0.012, 0.025, 2.12]} />
        </mesh>
        <mesh position={[3.558, 2.42, 9.0]} material={matLedGlow}>
          <boxGeometry args={[0.022, 0.07, 2.12]} />
        </mesh>
        {/* estante lateral */}
        <B p={[3.6, 1.9, 10.45]} s={[0.3, 0.05, 0.65]} m={matPine} />
        <B p={[3.6, 1.3, 10.45]} s={[0.3, 0.05, 0.65]} m={matPine} />
      </group>

      {/* ── Living: sofá, mesa, alfombra ── */}
      <mesh position={[6.6, 0.062, 9.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 3.1]} />
        <meshStandardMaterial color="#d6cbb9" roughness={0.96} />
      </mesh>
      <group position={[8.2, 0, 9.1]}>
        <B p={[0, 0.32, 0]} s={[0.9, 0.3, 2.3]} m={matLinen} cast />
        <B p={[0.38, 0.62, 0]} s={[0.16, 0.55, 2.3]} m={matLinen} cast />
        <B p={[0, 0.55, 0]} s={[0.75, 0.18, 2.1]} m={matLinen} />
        <B p={[0.05, 0.5, 0.55]} s={[0.5, 0.12, 0.5]} m={matPine} />
        <B p={[0.05, 0.5, -0.55]} s={[0.5, 0.12, 0.5]} m={matPine} />
        {/* patas */}
        {[[-0.34, -0.98], [-0.34, 0.98], [0.34, -0.98], [0.34, 0.98]].map(([dx, dz], i) => (
          <B key={`sl${i}`} p={[dx, 0.09, dz]} s={[0.06, 0.18, 0.06]} m={matPine} />
        ))}
        {/* cojines de acento */}
        <B p={[-0.02, 0.66, 0.62]} s={[0.34, 0.3, 0.14]} m={matTerracotta} r={[0, 0.2, 0.16]} cast />
        <B p={[-0.02, 0.66, 0.3]} s={[0.3, 0.28, 0.13]} m={matSage} r={[0, -0.15, -0.12]} cast />
        <B p={[-0.02, 0.66, -0.52]} s={[0.34, 0.3, 0.14]} m={matSage} r={[0, 0.25, -0.16]} cast />
        {/* manta */}
        <B p={[0.03, 0.44, -0.15]} s={[0.62, 0.05, 0.7]} m={matTerracotta} r={[0, 0.06, 0]} />
      </group>

      {/* dos butacas de lectura enfrentadas, al norte y al sur de la mesa */}
      {[[5.95, 7.5, Math.PI], [5.95, 10.2, 0]].map(([cx, cz, rot]) => (
        <group key={`chair${cz}`} position={[cx, 0, cz]} rotation={[0, rot, 0]}>
          <B p={[0, 0.32, 0]} s={[0.85, 0.26, 0.8]} m={matLinen} cast />
          <B p={[0, 0.6, 0.34]} s={[0.85, 0.62, 0.16]} m={matLinen} cast />
          <B p={[-0.38, 0.49, 0]} s={[0.12, 0.36, 0.8]} m={matLinen} cast />
          <B p={[0.38, 0.49, 0]} s={[0.12, 0.36, 0.8]} m={matLinen} cast />
          <B p={[0, 0.62, 0.22]} s={[0.36, 0.28, 0.12]} m={cz > 9 ? matSage : matTerracotta} r={[0.08, 0, 0.1]} cast />
          {[[-0.33, -0.32], [-0.33, 0.32], [0.33, -0.32], [0.33, 0.32]].map(([dx, dz], i) => (
            <B key={`al${i}`} p={[dx, 0.09, dz]} s={[0.05, 0.18, 0.05]} m={matPine} />
          ))}
        </group>
      ))}
      {/* mesa auxiliar junto al brazo norte del sofá */}
      <group position={[8.3, 0, 7.55]}>
        <RB p={[0, 0.48, 0]} s={[0.38, 0.04, 0.38]} m={matPine} radius={0.02} cast />
        <B p={[0, 0.23, 0]} s={[0.035, 0.46, 0.035]} m={matFrame} />
        <B p={[0, 0.02, 0]} s={[0.22, 0.03, 0.22]} m={matFrame} />
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.075, 0.055, 0.18, 12]} />
          <meshStandardMaterial color="#efe6d5" emissive="#ffd9a0" emissiveIntensity={lightsOn ? 0.9 : 0.02} />
        </mesh>
      </group>

      {/* mesa de centro */}
      <RB p={[6.1, 0.385, 9.1]} s={[1.3, 0.05, 0.7]} m={matPine} radius={0.018} cast />
      <B p={[6.1, 0.36, 9.1]} s={[1.14, 0.02, 0.56]} m={matFrame} />
      {[[-0.58, -0.27], [-0.58, 0.27], [0.58, -0.27], [0.58, 0.27]].map(([dx, dz], i) => (
        <B key={`cl${i}`} p={[6.1 + dx, 0.19, 9.1 + dz]} s={[0.045, 0.36, 0.045]} m={matFrame} />
      ))}
      <B p={[5.87, 0.43, 9.12]} s={[0.34, 0.03, 0.22]} m={matBrass} r={[0, 0.2, 0]} />
      <B p={[6.37, 0.44, 9.0]} s={[0.26, 0.04, 0.18]} m={matTerracotta} r={[0, -0.15, 0]} />

      {/* consola baja en el muro sur (al oriente de la puerta) + arte */}
      <B p={[8.4, 0.38, 10.52]} s={[0.9, 0.72, 0.32]} m={matPine} cast />
      <B p={[8.4, 0.76, 10.52]} s={[0.94, 0.04, 0.36]} m={matBand} />
      <B p={[8.15, 0.4, 10.35]} s={[0.38, 0.56, 0.02]} m={matBand} />
      <B p={[8.65, 0.4, 10.35]} s={[0.38, 0.56, 0.02]} m={matBand} />
      <group position={[8.7, 0.78, 10.5]}>
        <B p={[0, 0.02, 0]} s={[0.18, 0.04, 0.18]} m={matFrame} />
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.4, 8]} />
          <meshStandardMaterial color="#c9a76a" metalness={0.85} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.13, 0.16, 0.24, 16, 1, true]} />
          <meshStandardMaterial color="#f6e7c8" emissive="#ffd9a0" emissiveIntensity={lightsOn ? 1.5 : 0.02} side={DoubleSide} />
        </mesh>
      </group>
      <group position={[8.4, 1.9, 10.72]}>
        <B p={[0, 0, 0]} s={[0.9, 0.7, 0.06]} m={matPine} cast />
        <B p={[0, 0, -0.035]} s={[0.8, 0.6, 0.012]} m={matBrass} />
        <B p={[-0.18, 0.06, -0.042]} s={[0.28, 0.28, 0.008]} m={matTerracotta} />
        <B p={[0.18, -0.05, -0.042]} s={[0.34, 0.34, 0.008]} m={matSage} />
      </group>

      {/* lámpara de pie + vegetación */}
      <group position={[9.0, 0, 7.6]}>
        <B p={[0, 0.02, 0]} s={[0.24, 0.04, 0.24]} m={matFrame} />
        <mesh position={[0, 0.82, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 1.62, 8]} />
          <meshStandardMaterial color="#2a2f33" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 1.66, 0]}>
          <coneGeometry args={[0.2, 0.3, 16, 1, true]} />
          <meshStandardMaterial color="#f6e7c8" emissive="#ffd9a0" emissiveIntensity={lightsOn ? 1.5 : 0.02} side={DoubleSide} />
        </mesh>
      </group>
      <IndoorPlant x={4.05} z={6.45} s={1.0} />
      <IndoorPlant x={9.0} z={6.6} s={0.95} />
      <IndoorPlant x={4.2} z={3.9} s={0.85} />

      {/* ── Comedor: mesa 1,80 × 0,90 + 6 sillas ── */}
      <group position={[6.5, 0, 4.75]}>
        <B p={[0, 0.72, 0]} s={[1.8, 0.06, 0.9]} m={matPine} cast />
        {[[-0.75, -0.35], [-0.75, 0.35], [0.75, -0.35], [0.75, 0.35]].map(([dx, dz], i) => (
          <B key={i} p={[dx, 0.36, dz]} s={[0.06, 0.72, 0.06]} m={matPine} />
        ))}
        {[-0.75, 0.75].map((dz) =>
          [-0.55, 0.55].map((dx) => (
            <group key={`${dx}-${dz}`} position={[dx, 0, dz]}>
              <B p={[0, 0.45, 0]} s={[0.42, 0.05, 0.42]} m={matLinen} cast />
              <B p={[0, 0.72, dz > 0 ? 0.19 : -0.19]} s={[0.42, 0.5, 0.05]} m={matLinen} cast />
              {[[-0.16, -0.16], [-0.16, 0.16], [0.16, -0.16], [0.16, 0.16]].map(([lx, lz], j) => (
                <B key={j} p={[lx, 0.22, lz]} s={[0.035, 0.44, 0.035]} m={matPine} />
              ))}
            </group>
          )),
        )}
      </group>
      {[[-1.12, 0], [1.12, 0]].map(([dx, dz]) => (
        <group key={`end${dx}`} position={[6.5 + dx, 0, 4.75 + dz]} rotation={[0, dx > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <B p={[0, 0.45, 0]} s={[0.44, 0.05, 0.44]} m={matLinen} cast />
          <B p={[0, 0.72, 0.2]} s={[0.44, 0.5, 0.05]} m={matLinen} cast />
          {[[-0.17, -0.17], [-0.17, 0.17], [0.17, -0.17], [0.17, 0.17]].map(([lx, lz], j) => (
            <B key={j} p={[lx, 0.22, lz]} s={[0.035, 0.44, 0.035]} m={matPine} />
          ))}
        </group>
      ))}
      <mesh position={[6.5, 0.5, 4.75]}>
        <cylinderGeometry args={[0.12, 0.16, 0.18, 12]} />
        <meshStandardMaterial color="#e9e2d3" roughness={0.6} />
      </mesh>
      <mesh position={[6.5, 0.68, 4.75]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#6f8a55" roughness={0.9} />
      </mesh>
      {/* alfombra del comedor */}
      <mesh position={[6.5, 0.057, 4.75]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.9, 2.05]} />
        <meshStandardMaterial color="#c8b9a2" roughness={0.97} />
      </mesh>
      {/* lámpara lineal sobre la mesa: tres globos cálidos */}
      <group position={[6.5, 0, 4.75]}>
        <mesh position={[0, 2.25, 0]}>
          <boxGeometry args={[1.5, 0.04, 0.06]} />
          <meshStandardMaterial color="#2f3437" roughness={0.5} metalness={0.4} />
        </mesh>
        {[-0.55, 0, 0.55].map((dx) => (
          <group key={`dpend${dx}`} position={[dx, 0, 0]}>
            <mesh position={[0, 2.1, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.3, 6]} />
              <meshStandardMaterial color="#2f3437" />
            </mesh>
            <mesh position={[0, 1.95, 0]}>
              <sphereGeometry args={[0.09, 12, 10]} />
              <meshStandardMaterial color="#fff0d2" emissive="#ffcf8a" emissiveIntensity={lightsOn ? 2.2 : 0.05} />
            </mesh>
          </group>
        ))}
        {lightsOn ? (
          <pointLight position={[0, 1.9, 0]} intensity={night ? 0.7 : 0.22} color="#ffd9a0" distance={4.5} decay={2} />
        ) : null}
      </group>

      {/* ── Cocina ── */}
      <group>
        {/* muebles bajos norte */}
        <B p={[5.02, 0.45, 0.62]} s={[2.8, 0.9, 0.62]} m={matFrame} cast />
        <B p={[5.02, 0.925, 0.65]} s={[2.84, 0.05, 0.68]} m={matBand} cast />
        {[3.85, 4.45, 5.05].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.45, 0.94]}>
              <boxGeometry args={[0.555, 0.775, 0.012]} />
              <meshStandardMaterial color="#31383b" roughness={0.45} metalness={0.15} />
            </mesh>
            {/* herraje de cajón: olgura de 1 mm contra la puerta vecina */}
            <mesh position={[x, 0.82, 0.952]} material={matBrass}>
              <boxGeometry args={[0.3, 0.016, 0.016]} />
            </mesh>
          </group>
        ))}
        {/* lavaplatos */}
        <mesh position={[4.6, 0.95, 0.65]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.7, 0.42]} />
          <meshStandardMaterial color="#b9c0c4" metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh position={[4.6, 1.15, 0.38]}>
          <cylinderGeometry args={[0.018, 0.018, 0.32, 8]} />
          <meshStandardMaterial color="#9aa3a8" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[4.6, 1.28, 0.5]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, 0.24, 8]} />
          <meshStandardMaterial color="#9aa3a8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* placa + campana */}
        <B p={[5.7, 0.955, 0.65]} s={[0.72, 0.012, 0.5]} m={matFrame} />
        {[5.5, 5.9].map((x) =>
          [0.52, 0.78].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 0.965, z]}>
              <cylinderGeometry args={[0.075, 0.075, 0.008, 16]} />
              <meshStandardMaterial color="#1b1f22" roughness={0.4} />
            </mesh>
          )),
        )}
        <B p={[5.7, 1.62, 0.55]} s={[0.82, 0.16, 0.5]} m={matFrame} cast />
        <B p={[5.7, 2.2, 0.4]} s={[0.36, 1.0, 0.3]} m={matFrame} />
        {/* alacenas (a la izquierda de la ventana, sin taparla) */}
        <B p={[3.73, 1.75, 0.43]} s={[0.54, 0.7, 0.34]} m={matBand} cast />
        <mesh position={[3.73, 1.41, 0.61]} material={matLed}>
          <boxGeometry args={[0.48, 0.018, 0.02]} />
        </mesh>
        <mesh position={[3.73, 1.41, 0.61]} material={matLedGlow}>
          <boxGeometry args={[0.48, 0.06, 0.035]} />
        </mesh>
        {/* alacena a la derecha de la ventana: cierra la línea alta */}
        <B p={[5.87, 1.75, 0.43]} s={[1.1, 0.7, 0.34]} m={matBand} cast />
        <mesh position={[5.87, 1.41, 0.61]} material={matLed}>
          <boxGeometry args={[1.04, 0.018, 0.02]} />
        </mesh>
        <mesh position={[5.87, 1.41, 0.61]} material={matLedGlow}>
          <boxGeometry args={[1.04, 0.06, 0.035]} />
        </mesh>
        {[5.6, 6.14].map((x) => (
          <mesh key={`uphandle${x}`} position={[x, 1.45, 0.62]} material={matBrass}>
            <boxGeometry args={[0.018, 0.16, 0.018]} />
          </mesh>
        ))}
        {/* backsplash de piedra: peto bajo + paños a los lados de la ventana */}
        <B p={[5.02, 1.0, 0.27]} s={[2.8, 0.1, 0.03]} m={matStone} />
        <B p={[3.835, 1.2, 0.27]} s={[0.43, 0.5, 0.03]} m={matStone} />
        <B p={[5.735, 1.2, 0.27]} s={[1.37, 0.5, 0.03]} m={matStone} />
        {/* refri acero */}
        <B p={[6.9, 0.925, 0.62]} s={[0.9, 1.85, 0.7]} m={matFrame} cast />
        <mesh position={[6.9, 1.1, 0.98]}>
          <boxGeometry args={[0.8, 1.5, 0.02]} />
          <meshStandardMaterial color="#8e969b" metalness={0.85} roughness={0.25} envMapIntensity={1.2} />
        </mesh>
        <mesh position={[6.62, 1.2, 1.0]}>
          <boxGeometry args={[0.02, 0.3, 0.02]} />
          <meshStandardMaterial color="#2a2f33" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* horno empotrado bajo la encimera (sin torre que invada el mueble) */}
        <mesh position={[6.05, 0.45, 0.94]}>
          <boxGeometry args={[0.56, 0.55, 0.02]} />
          <meshStandardMaterial color="#1f2427" metalness={0.55} roughness={0.28} />
        </mesh>
        <mesh position={[6.05, 0.68, 0.955]}>
          <boxGeometry args={[0.4, 0.02, 0.02]} />
          <meshStandardMaterial color="#9aa3a8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* isla 2,40 × 1,00 + barra 1,05 */}
        <B p={[KITCHEN.island.x, 0.44, KITCHEN.island.z]} s={[KITCHEN.island.w, 0.88, KITCHEN.island.d]} m={matFrame} cast />
        {/* faldón de piedra en los costados (waterfall) */}
        <B p={[KITCHEN.island.x - KITCHEN.island.w / 2 + 0.015, 0.66, KITCHEN.island.z]} s={[0.03, 0.44, KITCHEN.island.d]} m={matBand} cast />
        <B p={[KITCHEN.island.x + KITCHEN.island.w / 2 - 0.015, 0.66, KITCHEN.island.z]} s={[0.03, 0.44, KITCHEN.island.d]} m={matBand} cast />
        <RB
          p={[KITCHEN.island.x, 0.905, KITCHEN.island.z]}
          s={[KITCHEN.island.w + 0.06, 0.06, KITCHEN.island.d + 0.06]}
          m={matBand}
          radius={0.02}
          cast
        />
        {/* cajones con herraje en la cara norte de la isla */}
        {[-0.62, 0, 0.62].map((dx) => (
          <group key={`idrawer${dx}`} position={[KITCHEN.island.x + dx, 0, KITCHEN.island.z - KITCHEN.island.d / 2 - 0.008]}>
            {[0.72, 0.44, 0.16].map((y) => (
              <mesh key={y} position={[0, y, 0.007]}>
                <boxGeometry args={[0.5, 0.24, 0.014]} />
                <meshStandardMaterial color="#3a4144" roughness={0.42} metalness={0.18} />
              </mesh>
            ))}
            {[0.72, 0.44, 0.16].map((y) => (
              <mesh key={`ih${y}`} position={[0, y + 0.06, 0.017]} material={matBrass}>
                <boxGeometry args={[0.26, 0.014, 0.014]} />
              </mesh>
            ))}
          </group>
        ))}
        <B
          p={[KITCHEN.island.x, 1.02, KITCHEN.island.z + KITCHEN.island.d / 2 + KITCHEN.island.overhang / 2]}
          s={[KITCHEN.island.w, 0.06, KITCHEN.island.overhang + 0.1]}
          m={matPine}
          cast
        />
        {/* tabla de picar + frutero: rompen la gran superficie blanca de la isla */}
        <B p={[5.95, 0.955, 2.38]} s={[0.46, 0.025, 0.28]} m={matPine} r={[0, -0.12, 0]} />
        <mesh position={[5.08, 0.96, 2.6]}>
          <cylinderGeometry args={[0.16, 0.13, 0.08, 18]} />
          <meshStandardMaterial color="#d8cbb6" roughness={0.8} />
        </mesh>
        {[[5.03, 2.56], [5.12, 2.63], [5.07, 2.68]].map(([fx, fz], i) => (
          <mesh key={`fruit${i}`} position={[fx, 1.03 + (i % 2) * 0.015, fz]}>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color={i === 1 ? '#c9b24d' : '#9b4f35'} roughness={0.7} />
          </mesh>
        ))}
        {/* LED bajo la barra */}
        <mesh position={[KITCHEN.island.x, 0.975, 3.37]} material={matLed}>
          <boxGeometry args={[KITCHEN.island.w, 0.018, 0.02]} />
        </mesh>
        <mesh position={[KITCHEN.island.x, 0.975, 3.37]} material={matLedGlow}>
          <boxGeometry args={[KITCHEN.island.w, 0.06, 0.035]} />
        </mesh>
        {lightsOn ? (
          <>
            <pointLight
              position={[KITCHEN.island.x, 1.85, KITCHEN.island.z]}
              intensity={night ? 1.1 : 0.38}
              color="#ffd9a0"
              distance={5.5}
              decay={2}
            />
            <pointLight
              position={[5.2, 2.55, 1.35]}
              intensity={night ? 0.75 : 0.24}
              color="#ffe6c2"
              distance={4.5}
              decay={2}
            />
          </>
        ) : null}
        {[-0.75, 0, 0.75].map((dx) => (
          <group key={dx} position={[KITCHEN.island.x + dx, 0, KITCHEN.island.z + 0.95]}>
            <RB p={[0, 0.72, 0]} s={[0.36, 0.06, 0.36]} m={matPine} radius={0.02} />
            <B p={[0, 0.38, 0]} s={[0.05, 0.72, 0.05]} m={matFrame} />
            <B p={[0, 0.36, 0]} s={[0.3, 0.03, 0.3]} m={matFrame} />
            {/* respaldo y apoyapiés */}
            <B p={[0, 0.9, 0.16]} s={[0.32, 0.24, 0.04]} m={matPine} cast />
            <B p={[0, 0.22, 0.16]} s={[0.28, 0.02, 0.02]} m={matFrame} />
          </group>
        ))}
        {/* colgantes */}
        {[-0.75, 0, 0.75].map((dx) => (
          <group key={`p${dx}`} position={[KITCHEN.island.x + dx, 2.05, KITCHEN.island.z]}>
            <mesh>
              <coneGeometry args={[0.13, 0.18, 14, 1, true]} />
              <meshStandardMaterial color="#3a3f42" metalness={0.5} roughness={0.4} side={DoubleSide} />
            </mesh>
            <mesh position={[0, -0.09, 0]}>
              <sphereGeometry args={[0.05, 10, 8]} />
              <meshStandardMaterial color="#fff0d2" emissive="#ffcf8a" emissiveIntensity={lightsOn ? 2 : 0.05} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Despensa / café (x 7,40…9,34) ── */}
      <group>
        {/* mueble de café al norte */}
        <B p={[8.22, 0.45, 0.55]} s={[1.44, 0.9, 0.5]} m={matFrame} cast />
        <B p={[8.22, 0.925, 0.55]} s={[1.5, 0.05, 0.54]} m={matBand} cast />
        {[7.8, 8.6].map((x) => (
          <B key={`pdoor${x}`} p={[x, 0.45, 0.81]} s={[0.6, 0.72, 0.02]} m={matPine} />
        ))}
        {/* cafetera + tazas */}
        <B p={[8.35, 1.08, 0.55]} s={[0.28, 0.28, 0.24]} m={matFrame} cast />
        <mesh position={[8.35, 1.0, 0.68]}>
          <cylinderGeometry args={[0.055, 0.045, 0.08, 12]} />
          <meshStandardMaterial color="#e9e2d3" roughness={0.4} />
        </mesh>
        <mesh position={[8.35, 1.2, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 12]} />
          <meshStandardMaterial color="#c9a76a" metalness={0.8} roughness={0.3} />
        </mesh>
        {/* repisas altas */}
        {[1.55, 2.05].map((y) => (
          <group key={`sh${y}`}>
            <B p={[8.22, y, 0.42]} s={[1.4, 0.05, 0.3]} m={matPine} cast />
            {[7.75, 8.25, 8.75].map((x, i) => (
              <mesh key={x} position={[x, y + 0.13, 0.42]}>
                <cylinderGeometry args={[0.07, 0.07, 0.18 + (i % 2) * 0.06, 10]} />
                <meshStandardMaterial color={i === 1 ? '#b8674a' : '#e9e2d3'} roughness={0.85} />
              </mesh>
            ))}
          </group>
        ))}
        {/* alacena alta oriental con canastos */}
        {[0.55, 3.15].map((z) => (
          <B key={`pup${z}`} p={[9.16, 1.15, z]} s={[0.32, 2.3, 0.04]} m={matPine} cast />
        ))}
        <B p={[9.16, 0.04, 1.85]} s={[0.32, 0.08, 2.6]} m={matPine} />
        <B p={[9.16, 2.28, 1.85]} s={[0.32, 0.04, 2.6]} m={matPine} />
        {[0.35, 0.85, 1.35, 1.85].map((y) => (
          <group key={`ps${y}`}>
            <B p={[9.1, y + 0.02, 1.85]} s={[0.28, 0.04, 2.5]} m={matPine} />
            {[0.95, 1.85, 2.75].map((z, i) => (
              <B
                key={`b${z}`}
                p={[9.1, y + 0.14, z]}
                s={[0.24, 0.22, 0.34]}
                m={i % 2 ? matTerracotta : matPine}
                cast
              />
            ))}
          </group>
        ))}
        {/* luz de trabajo de la despensa */}
        <mesh position={[8.4, 2.72, 1.8]} material={matLed}>
          <boxGeometry args={[0.9, 0.015, 0.12]} />
        </mesh>
        <mesh position={[8.4, 2.72, 1.8]} material={matLedGlow}>
          <boxGeometry args={[1.0, 0.05, 0.2]} />
        </mesh>
      </group>

      {/* ── Baño (1,95 × 2,34): ducha al norte, WC al poniente, vanitorio al sur ── */}
      <group>
        <B p={[0.85, 0.04, 4.2]} s={[1.2, 0.08, 1.2]} m={matStone} recv />
        <mesh position={[1.45, 1.0, 4.2]}>
          <boxGeometry args={[0.02, 2.0, 1.2]} />
          <meshStandardMaterial color="#dcecf4" transparent opacity={0.2} metalness={0.4} roughness={0.05} />
        </mesh>
        <mesh position={[1.45, 2.0, 4.2]}>
          <boxGeometry args={[0.03, 0.03, 1.2]} />
          <meshStandardMaterial color="#22282c" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0.85, 2.1, 3.72]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
          <meshStandardMaterial color="#c9ced2" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.85, 1.55, 3.66]}>
          <cylinderGeometry args={[0.015, 0.015, 0.9, 8]} />
          <meshStandardMaterial color="#c9ced2" metalness={0.9} roughness={0.2} />
        </mesh>
        <B p={[0.34, 1.25, 4.2]} s={[0.06, 0.4, 0.4]} m={matWallInt} />
        <mesh position={[1.45, 0.98, 3.75]}>
          <boxGeometry args={[0.02, 1.9, 0.42]} />
          <meshStandardMaterial color="#dcecf4" transparent opacity={0.22} metalness={0.4} roughness={0.05} />
        </mesh>
        <mesh position={[1.485, 1.0, 3.62]} material={matBrass}>
          <boxGeometry args={[0.02, 0.24, 0.02]} />
        </mesh>
        <mesh position={[2.14, 1.15, 4.15]} rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
          <cylinderGeometry args={[0.012, 0.012, 0.6, 8]} />
        </mesh>
        <mesh position={[2.15, 1.05, 4.15]}>
          <boxGeometry args={[0.02, 0.5, 0.28]} />
          <meshStandardMaterial color="#e8dccb" roughness={0.9} />
        </mesh>
        <B p={[1.65, 0.43, 5.7]} s={[0.8, 0.86, 0.5]} m={matPine} cast />
        <RB p={[1.65, 0.885, 5.7]} s={[0.86, 0.05, 0.54]} m={matBand} radius={0.016} />
        {[1.5, 1.8].map((x) => (
          <group key={`bd${x}`}>
            <mesh position={[x, 0.62, 5.44]}>
              <boxGeometry args={[0.24, 0.24, 0.014]} />
              <meshStandardMaterial color="#d8d2c6" roughness={0.5} />
            </mesh>
            <mesh position={[x, 0.68, 5.432]} material={matBrass}>
              <boxGeometry args={[0.014, 0.014, 0.014]} />
            </mesh>
          </group>
        ))}
        <mesh position={[1.65, 0.93, 5.68]}>
          <cylinderGeometry args={[0.19, 0.15, 0.12, 20]} />
          <meshStandardMaterial color="#fbfaf6" roughness={0.15} />
        </mesh>
        <mesh position={[1.65, 1.05, 5.86]}>
          <cylinderGeometry args={[0.012, 0.012, 0.24, 8]} />
          <meshStandardMaterial color="#3b3f42" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[1.65, 1.45, 5.93]} material={matMirror}>
          <boxGeometry args={[0.7, 1.0, 0.03]} />
        </mesh>
        <mesh position={[1.65, 1.45, 5.95]}>
          <boxGeometry args={[0.76, 1.06, 0.02]} />
          <meshStandardMaterial color="#fff2d8" emissive="#ffe6bd" emissiveIntensity={lightsOn ? 1.4 : 0.02} />
        </mesh>
        <B p={[0.62, 0.2, 5.3]} s={[0.55, 0.4, 0.45]} m={matBand} cast />
        <mesh position={[0.62, 0.44, 5.18]}>
          <boxGeometry args={[0.42, 0.06, 0.42]} />
          <meshStandardMaterial color="#fbfaf7" roughness={0.25} />
        </mesh>
        <B p={[0.31, 0.9, 5.3]} s={[0.12, 0.42, 0.44]} m={matBand} />
        <mesh position={[0.37, 1.15, 5.3]} rotation={[0, Math.PI / 2, 0]} material={matBrass}>
          <boxGeometry args={[0.18, 0.12, 0.012]} />
        </mesh>
        <mesh position={[1.0, 0.058, 5.15]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.9]} />
          <meshStandardMaterial color="#e6ded0" roughness={0.95} />
        </mesh>
      </group>

      {/* ── Distribuidor: hall entre comedor, vestíbulo y garaje ── */}
      <group>
        <B p={[10.35, 0.4, 3.74]} s={[0.9, 0.72, 0.22]} m={matPine} cast />
        <B p={[10.35, 0.78, 3.74]} s={[0.94, 0.04, 0.26]} m={matBand} />
        <mesh position={[10.35, 1.35, 3.62]} material={matMirror}>
          <boxGeometry args={[0.85, 0.9, 0.03]} />
        </mesh>
        <mesh position={[10.35, 1.35, 3.6]}>
          <boxGeometry args={[0.91, 0.96, 0.02]} />
          <meshStandardMaterial color="#fff2d8" emissive="#ffe6bd" emissiveIntensity={lightsOn ? 1.1 : 0.02} />
        </mesh>
        <mesh position={[9.8, 0.22, 4.9]}>
          <cylinderGeometry args={[0.16, 0.13, 0.44, 16]} />
          <meshStandardMaterial color="#c9a76a" roughness={0.7} />
        </mesh>
        <mesh position={[9.8, 0.62, 4.9]}>
          <sphereGeometry args={[0.22, 10, 8]} />
          <meshStandardMaterial color="#5d7f45" roughness={0.9} />
        </mesh>
        <mesh position={[11.26, 1.05, 4.72]} material={matBrass}>
          <boxGeometry args={[0.03, 0.05, 0.18]} />
        </mesh>
      </group>

      {/* ── Dormitorio 1 (cabecera al oriente, ensuite al poniente) ── */}
      <group>
        <Bed x={13.3} z={1.5} w={1.8} head={-1} rot={-Math.PI / 2} matWood={matPine} matLinen={matLinen} />
        <Wardrobe x={11.62} z={2.97} w={0.95} rot={Math.PI / 2} mat={matBand} />
        <Desk x={14.07} z={3.0} w={0.8} rot={Math.PI / 2} matWood={matPine} matWall={matBand} />
        <Chair x={13.45} z={3.0} rot={Math.PI / 2} matWood={matPine} matLinen={matLinen} />
        <mesh position={[13.1, 0.04, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 2.4]} />
          <meshStandardMaterial color="#d9cfc0" roughness={0.95} />
        </mesh>
        {[[14.1, 0.35], [14.1, 2.65]].map(([x, z]) => (
          <group key={`d1n${z}`} position={[x, 0, z]}>
            <B p={[0, 0.26, 0]} s={[0.44, 0.52, 0.44]} m={matPine} cast />
            <B p={[0, 0.54, 0]} s={[0.48, 0.04, 0.48]} m={matBand} />
            <mesh position={[0, 0.66, 0]}>
              <cylinderGeometry args={[0.085, 0.065, 0.18, 12]} />
              <meshStandardMaterial color="#efe6d5" emissive="#ffd9a0" emissiveIntensity={lightsOn ? 0.9 : 0.02} />
            </mesh>
          </group>
        ))}
        {/* banco al pie de la cama */}
        <B p={[12.1, 0.42, 1.5]} s={[0.32, 0.08, 1.0]} m={matPine} cast />
        <RB p={[12.1, 0.5, 1.5]} s={[0.28, 0.09, 0.94]} m={matTerracotta} radius={0.03} cast />
        {[1.1, 1.9].map((z) => (
          <B key={`d1b${z}`} p={[12.1, 0.21, z]} s={[0.26, 0.42, 0.05]} m={matFrame} />
        ))}
        {/* arte sobre la cama */}
        <group position={[14.31, 1.8, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
          <B p={[0, 0, 0]} s={[1.15, 0.66, 0.04]} m={matPine} />
          <B p={[0, 0, 0.024]} s={[1.05, 0.56, 0.01]} m={matSage} />
        </group>
        {/* Ensuite privado 1,74 × 2,10 */}
        <B p={[10.0, 0.04, 0.9]} s={[0.9, 0.08, 1.2]} m={matStone} recv />
        <mesh position={[10.45, 1.0, 0.9]}>
          <boxGeometry args={[0.02, 2.0, 1.2]} />
          <meshStandardMaterial color="#dcecf4" transparent opacity={0.2} metalness={0.4} roughness={0.05} />
        </mesh>
        <mesh position={[10.45, 2.0, 0.9]}>
          <boxGeometry args={[0.03, 0.03, 1.2]} />
          <meshStandardMaterial color="#22282c" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[10.0, 2.1, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
          <meshStandardMaterial color="#c9ced2" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[10.0, 1.55, 0.32]}>
          <cylinderGeometry args={[0.015, 0.015, 0.9, 8]} />
          <meshStandardMaterial color="#c9ced2" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* vanitorio sur del ensuite */}
        <B p={[10.0, 0.43, 2.05]} s={[0.8, 0.86, 0.5]} m={matPine} cast />
        <RB p={[10.0, 0.885, 2.05]} s={[0.86, 0.05, 0.54]} m={matBand} radius={0.016} />
        <mesh position={[10.0, 0.62, 1.88]}>
          <boxGeometry args={[0.74, 0.24, 0.014]} />
          <meshStandardMaterial color="#d8d2c6" roughness={0.5} />
        </mesh>
        <mesh position={[10.0, 0.68, 1.894]} material={matBrass}>
          <boxGeometry args={[0.3, 0.014, 0.014]} />
        </mesh>
        <mesh position={[10.0, 0.93, 2.02]}>
          <cylinderGeometry args={[0.19, 0.15, 0.12, 20]} />
          <meshStandardMaterial color="#fbfaf6" roughness={0.15} />
        </mesh>
        <mesh position={[10.0, 1.42, 2.33]} material={matMirror}>
          <boxGeometry args={[0.7, 0.9, 0.03]} />
        </mesh>
        <mesh position={[10.0, 1.42, 2.32]}>
          <boxGeometry args={[0.76, 0.96, 0.02]} />
          <meshStandardMaterial color="#fff2d8" emissive="#ffe6bd" emissiveIntensity={lightsOn ? 1.4 : 0.02} />
        </mesh>
        {/* WC al oriente del ensuite */}
        <B p={[10.8, 0.2, 0.7]} s={[0.55, 0.4, 0.5]} m={matBand} cast />
        <mesh position={[10.8, 0.44, 0.62]}>
          <boxGeometry args={[0.4, 0.06, 0.44]} />
          <meshStandardMaterial color="#fbfaf7" roughness={0.25} />
        </mesh>
        <B p={[11.15, 0.9, 0.7]} s={[0.12, 0.16, 0.42]} m={matBand} />
        <mesh position={[11.14, 1.15, 0.7]} rotation={[0, Math.PI / 2, 0]} material={matBrass}>
          <boxGeometry args={[0.18, 0.12, 0.012]} />
        </mesh>
      </group>

      {/* ── Dormitorio 2 (cabecera al oriente, clóset al poniente) ── */}
      <group>
        <Bed x={2.32} z={1.55} w={1.6} head={-1} rot={-Math.PI / 2} matWood={matWood} matLinen={matLinen} />
        <Wardrobe x={0.55} z={0.87} w={0.95} rot={Math.PI / 2} mat={matBand} />
        <Desk x={1.15} z={3.15} w={1.2} matWood={matPine} matWall={matBand} />
        {[[3.05, 0.35], [3.05, 2.65]].map(([x, z]) => (
          <group key={`d2n${z}`} position={[x, 0, z]}>
            <B p={[0, 0.26, 0]} s={[0.42, 0.52, 0.42]} m={matPine} cast />
            <B p={[0, 0.54, 0]} s={[0.46, 0.04, 0.46]} m={matBand} />
            <mesh position={[0, 0.66, 0]}>
              <cylinderGeometry args={[0.08, 0.06, 0.17, 12]} />
              <meshStandardMaterial color="#efe6d5" emissive="#ffd9a0" emissiveIntensity={lightsOn ? 0.9 : 0.02} />
            </mesh>
          </group>
        ))}
        <mesh position={[2.1, 0.04, 1.55]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 2.0]} />
          <meshStandardMaterial color="#d9cfc0" roughness={0.95} />
        </mesh>
        <group position={[3.31, 1.8, 1.55]} rotation={[0, -Math.PI / 2, 0]}>
          <B p={[0, 0, 0]} s={[1.05, 0.6, 0.04]} m={matPine} />
          <B p={[0, 0, 0.024]} s={[0.95, 0.5, 0.01]} m={matTerracotta} />
        </group>
      </group>

      {/* ── Dormitorio 3 ── */}
      <group>
        <Bed x={1.55} z={7.19} w={1.6} head={-1} matWood={matWood} matLinen={matLinen} />
        <Wardrobe x={3.0} z={8.6} w={0.95} rot={-Math.PI / 2} mat={matBand} />
        <Desk x={3.015} z={10.1} w={1.2} rot={Math.PI / 2} matWood={matPine} matWall={matBand} />
        <Chair x={2.35} z={10.1} rot={Math.PI / 2} matWood={matPine} matLinen={matLinen} />
        <mesh position={[1.7, 0.04, 7.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 2.2]} />
          <meshStandardMaterial color="#d9cfc0" roughness={0.95} />
        </mesh>
        {[0.52, 2.58].map((x) => (
          <group key={x} position={[x, 0, 6.4]}>
            <B p={[0, 0.26, 0]} s={[0.42, 0.52, 0.42]} m={matPine} cast />
            <B p={[0, 0.54, 0]} s={[0.46, 0.04, 0.46]} m={matBand} />
            <mesh position={[0, 0.66, 0]}>
              <cylinderGeometry args={[0.08, 0.06, 0.17, 12]} />
              <meshStandardMaterial color="#efe6d5" emissive="#ffd9a0" emissiveIntensity={lightsOn ? 0.9 : 0.02} />
            </mesh>
          </group>
        ))}
        <group position={[1.55, 1.8, 6.075]}>
          <B p={[0, 0, 0]} s={[1.05, 0.6, 0.04]} m={matPine} />
          <B p={[0, 0, 0.024]} s={[0.95, 0.5, 0.01]} m={matSage} />
        </group>
      </group>

      {/* ── Garaje: auto + estantes ── */}
      <group position={[12.09, 0, 8.65]}>
        <B p={[0, 0.55, 0]} s={[1.78, 0.5, 4.2]} m={matBand} cast />
        <B p={[0, 0.98, 0.05]} s={[1.62, 0.42, 2.24]} m={matBand} cast />
        <mesh position={[0, 1.02, 0.05]}>
          <boxGeometry args={[1.64, 0.32, 2.26]} />
          <meshStandardMaterial color="#26333c" metalness={0.6} roughness={0.1} />
        </mesh>
        <B p={[0, 0.34, 2.1]} s={[1.8, 0.18, 0.2]} m={matFrame} />
        <B p={[0, 0.34, -2.1]} s={[1.8, 0.18, 0.2]} m={matFrame} />
        {[[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]].map(([dx, dz], i) => (
          <mesh key={i} position={[dx, 0.34, dz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.2, 18]} />
            <meshStandardMaterial color="#15181a" roughness={0.8} />
          </mesh>
        ))}
        {[-0.55, 0.55].map((dx) => (
          <mesh key={dx} position={[dx, 0.62, 2.12]}>
            <boxGeometry args={[0.35, 0.12, 0.03]} />
            <meshStandardMaterial color="#fff3d4" emissive="#ffe6b0" emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      {/* lavandería cerrada: lavadora y secadora contra el muro poniente, con mesón */}
      {[9.0, 9.7].map((z, i) => (
        <group key={`laundry${z}`} position={[9.9, 0, z]}>
          <B p={[0, 0.45, 0]} s={[0.62, 0.9, 0.62]} m={i === 0 ? matBand : matFrame} cast />
          <mesh position={[0.32, 0.58, 0]} rotation={[0, Math.PI / 2, 0]}>
            <circleGeometry args={[0.22, 20]} />
            <meshStandardMaterial color="#2b3134" metalness={0.55} roughness={0.25} />
          </mesh>
          <mesh position={[0.325, 0.58, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.22, 0.018, 8, 20]} />
            <meshStandardMaterial color="#9aa3a8" metalness={0.85} roughness={0.25} />
          </mesh>
          <mesh position={[0.1, 0.93, 0.18]} material={matBrass}>
            <boxGeometry args={[0.18, 0.02, 0.02]} />
          </mesh>
        </group>
      ))}
      <RB p={[9.91, 1.03, 9.55]} s={[0.72, 0.06, 2.0]} m={matBand} radius={0.016} cast />
      <B p={[9.79, 0.03, 9.55]} s={[0.6, 0.06, 2.0]} m={matFrame} />
      {/* estante de lavandería en el muro oriente */}
      {[1.15, 1.55].map((y) => (
        <B key={`ls${y}`} p={[10.76, y, 9.55]} s={[0.16, 0.04, 1.8]} m={matPine} cast />
      ))}
      <mesh position={[10.35, 2.55, 9.55]} material={matLed}>
        <boxGeometry args={[0.9, 0.02, 0.12]} />
      </mesh>
      <mesh position={[10.35, 2.55, 9.55]} material={matLedGlow}>
        <boxGeometry args={[1.0, 0.06, 0.22]} />
      </mesh>
      {/* estantería y banco de trabajo al oriente */}
      <group position={[14.02, 0, 9.5]}>
        {[0.45, 0.95, 1.45].map((y) => (
          <B key={`gs${y}`} p={[0, y, 0]} s={[0.5, 0.04, 1.9]} m={matPine} cast />
        ))}
        {[-0.9, 0.9].map((dz) => (
          <B key={`gpost${dz}`} p={[0, 0.85, dz]} s={[0.5, 1.7, 0.05]} m={matPine} />
        ))}
        {[-0.55, 0, 0.55].map((dz, i) => (
          <B key={`gbox${dz}`} p={[0, 1.62, dz]} s={[0.42, 0.3, 0.44]} m={i % 2 ? matTerracotta : matFrame} cast />
        ))}
      </group>
      {/* panel de herramientas */}
      <B p={[14.2, 1.4, 6.9]} s={[0.04, 1.15, 2.1]} m={matFrame} />
      {[6.1, 6.6, 7.1, 7.6].map((z) => (
        <mesh key={`hook${z}`} position={[14.16, 1.55, z]} material={matBrass}>
          <boxGeometry args={[0.02, 0.14, 0.02]} />
        </mesh>
      ))}
      {/* luces de trabajo del garaje */}
      {[6.9, 9.6].map((z) => (
        <group key={`glamp${z}`}>
          <mesh position={[12.0, 2.6, z]} material={matLed}>
            <boxGeometry args={[1.6, 0.02, 0.14]} />
          </mesh>
          <mesh position={[12.0, 2.6, z]} material={matLedGlow}>
            <boxGeometry args={[1.7, 0.06, 0.24]} />
          </mesh>
        </group>
      ))}

      {/* ── Recibidor / vestíbulo: consola, espejo, banco y colgadores ── */}
      <group>
        {/* consola volada contra el muro oriente */}
        <B p={[14.02, 0.82, 4.5]} s={[0.36, 0.06, 1.1]} m={matPine} cast />
        <B p={[14.05, 0.68, 4.06]} s={[0.3, 0.22, 0.04]} m={matBand} />
        <B p={[14.05, 0.68, 4.94]} s={[0.3, 0.22, 0.04]} m={matBand} />
        <mesh position={[14.02, 0.9, 4.15]}>
          <cylinderGeometry args={[0.1, 0.07, 0.16, 14]} />
          <meshStandardMaterial color="#c9b9a2" roughness={0.8} />
        </mesh>
        <mesh position={[14.02, 0.98, 4.15]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#7d9a62" roughness={0.9} />
        </mesh>
        <mesh position={[13.84, 1.72, 4.5]} material={matMirror}>
          <boxGeometry args={[0.03, 1.0, 0.7]} />
        </mesh>
        <mesh position={[13.82, 1.72, 4.5]}>
          <boxGeometry args={[0.02, 1.06, 0.76]} />
          <meshStandardMaterial color="#fff2d8" emissive="#ffe6bd" emissiveIntensity={lightsOn ? 1.2 : 0.02} />
        </mesh>
        {/* banco con cojín */}
        <B p={[12.4, 0.42, 5.12]} s={[1.0, 0.08, 0.34]} m={matPine} cast />
        <RB p={[12.4, 0.5, 5.12]} s={[0.94, 0.09, 0.3]} m={matSage} radius={0.03} cast />
        {[11.95, 12.85].map((x) => (
          <B key={`benchleg${x}`} p={[x, 0.21, 5.12]} s={[0.05, 0.42, 0.3]} m={matFrame} />
        ))}
        {/* perchero de pie y planta */}
        <mesh position={[11.55, 0.9, 4.0]} material={matBrass}>
          <cylinderGeometry args={[0.018, 0.018, 1.8, 8]} />
        </mesh>
        <mesh position={[11.55, 1.75, 4.0]} material={matBrass}>
          <cylinderGeometry args={[0.16, 0.16, 0.02, 12]} />
        </mesh>
        <mesh position={[11.55, 0.18, 4.0]}>
          <cylinderGeometry args={[0.18, 0.24, 0.36, 14]} />
          <meshStandardMaterial color="#c8bfae" roughness={0.85} />
        </mesh>
        <group position={[11.55, 0.5, 4.0]}>
          {[[0, 0], [0.16, 0.1], [-0.13, 0.12]].map(([dx, dz], i) => (
            <mesh key={`vp${i}`} position={[dx, 0.24 + i * 0.12, dz]}>
              <sphereGeometry args={[0.16 - i * 0.02, 8, 6]} />
              <meshStandardMaterial color="#6f8a55" roughness={0.9} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ── Recibidor de la puerta principal: perchero y cuadro ── */}
      <group>
        <B p={[8.6, 1.45, 10.68]} s={[0.9, 0.06, 0.03]} m={matPine} />
        {[8.28, 8.6, 8.92].map((x) => (
          <mesh key={`mhook${x}`} position={[x, 1.38, 10.66]} material={matBrass}>
            <boxGeometry args={[0.02, 0.12, 0.02]} />
          </mesh>
        ))}
        <mesh position={[6.2, 1.75, 10.7]} material={matBrass}>
          <boxGeometry args={[0.6, 0.8, 0.03]} />
        </mesh>
        <mesh position={[6.2, 1.75, 10.68]}>
          <boxGeometry args={[0.54, 0.74, 0.01]} />
          <meshStandardMaterial color="#8fae7a" roughness={0.85} />
        </mesh>
      </group>

      {/* ── Quincho exterior: pérgola, parrilla y mesón de piedra ── */}
      <group>
        {/* pérgola de madera */}
        {[
          [QUINCHO.x0 + 0.25, QUINCHO.z0 + 0.2],
          [QUINCHO.x1 - 0.25, QUINCHO.z0 + 0.2],
          [QUINCHO.x0 + 0.25, QUINCHO.z1 - 0.25],
          [QUINCHO.x1 - 0.25, QUINCHO.z1 - 0.25],
        ].map(([x, z], i) => (
          <B key={`qp${i}`} p={[x, 1.25, z]} s={[0.12, 2.5, 0.12]} m={matPine} cast />
        ))}
        {[QUINCHO.x0 + 0.25, QUINCHO.x1 - 0.25].map((x) => (
          <B key={`qb${x}`} p={[x, 2.5, (QUINCHO.z0 + QUINCHO.z1) / 2]} s={[0.1, 0.12, QUINCHO.z1 - QUINCHO.z0 - 0.3]} m={matPine} cast />
        ))}
        {[QUINCHO.z0 + 0.2, QUINCHO.z1 - 0.25].map((z) => (
          <B key={`qc${z}`} p={[(QUINCHO.x0 + QUINCHO.x1) / 2, 2.5, z]} s={[QUINCHO.x1 - QUINCHO.x0 - 0.3, 0.12, 0.1]} m={matPine} />
        ))}
        {[13.45, 13.85, 14.25, 14.65, 15.05, 15.45].map((z) => (
          <B key={`qs${z}`} p={[(QUINCHO.x0 + QUINCHO.x1) / 2, 2.42, z]} s={[QUINCHO.x1 - QUINCHO.x0 - 0.45, 0.04, 0.06]} m={matPine} />
        ))}
        {/* mesón y parrilla */}
        <B p={[12.45, 0.45, 15.2]} s={[2.6, 0.9, 0.66]} m={matPine} cast />
        <RB p={[12.45, 0.93, 15.2]} s={[2.72, 0.06, 0.74]} m={matStone} radius={0.018} cast />
        <B p={[12.0, 1.02, 15.17]} s={[0.82, 0.11, 0.52]} m={matFrame} cast />
        {[-0.28, -0.14, 0, 0.14, 0.28].map((dx) => (
          <mesh key={`grate${dx}`} position={[12.0 + dx, 1.09, 15.17]} material={matBrass}>
            <boxGeometry args={[0.02, 0.02, 0.44]} />
          </mesh>
        ))}
        <mesh position={[13.35, 0.96, 15.15]}>
          <boxGeometry args={[0.52, 0.03, 0.38]} />
          <meshStandardMaterial color="#b9c0c4" metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh position={[13.35, 1.12, 15.32]}>
          <cylinderGeometry args={[0.014, 0.014, 0.3, 8]} />
          <meshStandardMaterial color="#9aa3a8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* taburetes de exterior */}
        {[11.75, 12.45, 13.15].map((x) => (
          <group key={`qst${x}`} position={[x, 0, 14.35]}>
            <RB p={[0, 0.62, 0]} s={[0.34, 0.06, 0.34]} m={matPine} radius={0.02} />
            <B p={[0, 0.32, 0]} s={[0.05, 0.62, 0.05]} m={matFrame} />
            <B p={[0, 0.3, 0]} s={[0.28, 0.03, 0.28]} m={matFrame} />
          </group>
        ))}
        {/* muro de piedra al fondo */}
        <B p={[12.5, 0.7, 15.72]} s={[3.2, 1.4, 0.28]} m={matStone} cast />
        {/* maceta */}
        <mesh position={[14.05, 0.28, 13.35]}>
          <cylinderGeometry args={[0.2, 0.26, 0.54, 14]} />
          <meshStandardMaterial color="#b9a98f" roughness={0.9} />
        </mesh>
        <group position={[14.05, 0.55, 13.35]}>
          {[0, 0.14, -0.12].map((dx, i) => (
            <mesh key={`qpl${i}`} position={[dx, 0.2 + i * 0.14, 0]}>
              <sphereGeometry args={[0.18 - i * 0.02, 8, 6]} />
              <meshStandardMaterial color="#6f8a55" roughness={0.9} />
            </mesh>
          ))}
        </group>
        {/* luces colgantes y puntos cálidos */}
        {[11.7, 12.5, 13.3].map((x) => (
          <group key={`ql${x}`} position={[x, 0, 14.3]}>
            <mesh position={[0, 2.05, 0]}>
              <sphereGeometry args={[0.07, 10, 8]} />
              <meshStandardMaterial color="#fff0d2" emissive="#ffcf8a" emissiveIntensity={lightsOn ? 2 : 0.03} />
            </mesh>
            <mesh position={[0, 2.25, 0]}>
              <cylinderGeometry args={[0.004, 0.004, 0.4, 6]} />
              <meshStandardMaterial color="#2f3437" />
            </mesh>
          </group>
        ))}
        {lightsOn ? (
          <pointLight position={[12.5, 2.0, 14.4]} intensity={night ? 0.75 : 0.28} color="#ffd9a0" distance={6} decay={2} />
        ) : null}
      </group>

      {/* ── Apliques, interruptores y enchufes ── */}
      {SCONCES.map((s, i) => (
        <Sconce key={`sc${i}`} x={s.x} y={s.y} z={s.z} rot={s.rot} on={lightsOn} glow={i < 4} />
      ))}
      {SWITCHES.map((s, i) => (
        <Plate key={`pl${i}`} x={s.x} y={s.y} z={s.z} rot={s.rot} outlet={s.outlet} />
      ))}

      {/* ── Vegetación animada ── */}
      <Hedge x={2.6} z={12.9} w={4.6} d={0.75} h={0.7} />
      <Hedge x={5.1} z={13.15} w={1.2} d={0.6} h={0.55} />
      <Hedge x={15.1} z={12.9} w={0.8} d={3.2} h={0.7} />
      <Hedge x={-0.9} z={4.2} w={0.8} d={5.0} h={0.7} />
      <Hedge x={15.3} z={4.6} w={0.8} d={4.6} h={0.7} />
      <Grass x={6.12} z={11.55} s={1.15} phase={0.4} />
      <Grass x={8.22} z={11.55} s={1.15} phase={1.7} />
      <Grass x={2.2} z={12.2} s={0.95} phase={2.4} />
      <Grass x={4.0} z={12.2} s={0.75} phase={0.9} />
      <Grass x={13.6} z={11.7} s={1.0} phase={1.2} />
      {/* árboles */}
      {[[-2.6, 7.0, 1.05], [-2.4, 2.2, 0.9], [16.4, 2.4, 1.0], [16.2, 9.0, 0.85], [12.6, 17.6, 0.8]].map(
        ([x, z, s], i) => (
          <group key={`t${i}`} position={[x, 0, z]} scale={[s, s, s]}>
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.18, 2.2, 8]} />
              <meshStandardMaterial color="#6b5741" roughness={0.9} />
            </mesh>
            {[1.9, 2.5, 3.1].map((y, j) => (
              <mesh key={j} position={[0, y, 0]} castShadow>
                <sphereGeometry args={[1.05 - j * 0.22, 12, 10]} />
                <meshStandardMaterial color={j % 2 ? '#5d7247' : '#6b8150'} roughness={0.95} />
              </mesh>
            ))}
          </group>
        ),
      )}

      {/* ── Lámparas de techo / downlights ── */}
      {[
        [7.4, 8.6], [5.2, 4.8], [5.4, 1.9], [6.5, 4.7], [2.9, 4.8], [1.6, 1.7],
        [12.3, 1.7], [1.6, 8.6], [12.0, 8.0], [10.2, 4.5], [1.2, 4.8], [11.9, 4.5],
        [8.4, 1.8],
      ].map(([x, z], i) => (
        <group key={`dl${i}`} position={[x, WALL_H - 0.06, z]}>
          {/* En plano 3D se oculta la luminaria, pero se conserva la luz. */}
          {!planView ? (
            <>
              <mesh>
                <cylinderGeometry args={[0.075, 0.075, 0.02, 14]} />
                <meshStandardMaterial color="#fdf8ee" emissive="#fff1d6" emissiveIntensity={lightsOn ? 2.2 : 0.04} />
              </mesh>
              <mesh position={[0, -0.013, 0]} material={matLedGlow}>
                <cylinderGeometry args={[0.13, 0.13, 0.004, 16]} />
              </mesh>
            </>
          ) : null}
          {lightsOn && [0, 1, 6, 8, 10, 12].includes(i) ? (
            <pointLight
              position={[0, -0.25, 0]}
              intensity={night ? 0.85 : 0.42}
              color="#fff0d4"
              distance={5.6}
              decay={2}
            />
          ) : null}
        </group>
      ))}

      {/* ── Cámaras CCTV (ocultas en la vista de plano) ── */}
      {!planView && CCTV_CAMERAS.map((cam) => (
        <group key={cam.id}>
          {cam.zone === 'Exterior' ? (
            <mesh position={[cam.pos[0], cam.pos[1] / 2, cam.pos[2]]} castShadow>
              <cylinderGeometry args={[0.06, 0.08, cam.pos[1], 10]} />
              <meshStandardMaterial color="#3b4247" roughness={0.6} metalness={0.4} />
            </mesh>
          ) : null}
          <group position={cam.pos} rotation={[0, aimYaw(cam), 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.16, 0.13, 0.26]} />
              <meshStandardMaterial color="#e7e1d5" roughness={0.45} metalness={0.15} />
            </mesh>
            <mesh position={[0, -0.09, 0.02]}>
              <boxGeometry args={[0.12, 0.06, 0.16]} />
              <meshStandardMaterial color="#22282c" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.062, 0.1, 16]} />
              <meshStandardMaterial color="#1b2024" metalness={0.5} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, -0.215]}>
              <sphereGeometry args={[0.018, 8, 8]} />
              <meshStandardMaterial color="#ff3b30" emissive="#ff2d20" emissiveIntensity={1.3} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ── Personajes ── */}
      {showNpc && NPC_SPOTS.map((npc, i) => (
        <AnimatedFigure
          key={`npc${i}`}
          playing
          visualProgress={0}
          shakeIntensity={0}
          index={i === 0 ? 0 : 1}
          houseDoor={npc.door}
          config={{ position: npc.pos }}
        />
      ))}

      {/* ── POV humano: manos y antebrazos ── */}
      {showHands ? <FirstPersonHands /> : null}

      {/* ── Cielorraso del porche ya cubierto; luces exteriores ── */}
      <pointLight position={[7.2, 2.4, 11.9]} intensity={lightsOn ? (night ? 0.9 : 0.25) : 0} color="#ffd9a0" distance={6} decay={2} />

      {/* ── Iluminación global ── */}
      <hemisphereLight args={[night ? '#22354f' : '#eaf2fb', night ? '#1a2530' : '#cfc4af', night ? 0.18 : 0.5]} />
      <directionalLight
        position={[6.5, 16, 26]}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={4}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[4, 9, -12]} intensity={night ? 0.12 : 0.3} color={night ? '#93abd8' : '#dfeaf7'} />
      {lightsOn && night ? <ambientLight intensity={0.09} color="#ffe9c9" /> : null}
    </>
  );
}
