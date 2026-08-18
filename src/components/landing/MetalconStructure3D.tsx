'use client';

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Cloud, Clouds, ContactShadows, OrbitControls, Sky, useTexture } from '@react-three/drei';
import { BoxGeometry, Color, ExtrudeGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, Quaternion, RepeatWrapping, Shape, Vector3 } from 'three';
import { Body as CannonBody, Box as CannonBox, ContactMaterial, Material as CannonMaterial, Plane as CannonPlane, Quaternion as CannonQuaternion, SAPBroadphase, Vec3, World as CannonWorld } from 'cannon-es';

const C90 = { web: 0.09, flange: 0.038, lip: 0.012, t: 0.006 };
const U90 = { web: 0.09, flange: 0.025, t: 0.006 };

const LARGO = 4.8;
const ANCHO = 3.2;
const ALTURA = 2.4;
const MOD = 0.4;

const STEEL = '#D8DDE3';
const TRACK = '#ECF0F4';
const DARK = '#9BA3AC';
const ACCENT = '#D8B23D';

function cPoints(p: { web: number; flange: number; lip?: number; t: number }): Array<[number, number]> {
  const a = p.web;
  const b = p.flange;
  const t = p.t;
  const c = p.lip ?? 0;
  return [
    [0, -a / 2],
    [b, -a / 2],
    [b, -a / 2 + c],
    [b - t, -a / 2 + c],
    [b - t, -a / 2 + t],
    [t, -a / 2 + t],
    [t, a / 2 - t],
    [b - t, a / 2 - t],
    [b - t, a / 2 - c],
    [b, a / 2 - c],
    [b, a / 2],
    [0, a / 2],
  ];
}

function makeExtrude(points: Array<[number, number]>, depth: number) {
  const shape = new Shape();
  points.forEach(([x, y], index) => (index === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  const geo = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

type Part = {
  g: ExtrudeGeometry | BoxGeometry;
  m: MeshStandardMaterial;
  p: [number, number, number];
  r?: [number, number, number];
  q?: [number, number, number, number];
};

const steelMat = () => new MeshStandardMaterial({ color: STEEL, metalness: 0.82, roughness: 0.36 });
const trackMat = () => new MeshStandardMaterial({ color: TRACK, metalness: 0.82, roughness: 0.3 });
const darkMat = () => new MeshStandardMaterial({ color: DARK, metalness: 0.8, roughness: 0.42 });
const accentMat = () => new MeshStandardMaterial({ color: ACCENT, metalness: 0.65, roughness: 0.4 });

type MeshRef = { current: Object3D | null };
type Dynamics = Array<{ body: CannonBody; meshRef: MeshRef }>;

function PhysicsSync({ world, dynamics }: { world: CannonWorld; dynamics: Dynamics }) {
  const accumulator = useRef(0);
  useFrame((_, delta) => {
    accumulator.current += Math.min(delta, 0.05);
    while (accumulator.current >= 1 / 60) {
      world.step(1 / 60);
      accumulator.current -= 1 / 60;
    }
    for (const { body, meshRef } of dynamics) {
      const mesh = meshRef.current;
      if (!mesh) continue;
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    }
  });
  return null;
}

export default function MetalconStructure3D() {
  const [showPiso, setShowPiso] = useState(true);
  const [showMuros, setShowMuros] = useState(true);
  const [showRefuerzos, setShowRefuerzos] = useState(true);
  const [showCarga, setShowCarga] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [sismo, setSismo] = useState(0);
  const [drop, setDrop] = useState(0);

  return (
    <div className="overflow-hidden rounded-[1.8rem] bg-[#171820] text-white shadow-[inset_0_0_0_1px_rgba(248,240,233,.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#D8B23D]">Simulación estructural · Metalcon D90 · física</p>
          <h3 className="mt-1 text-lg font-black tracking-[-.02em]">Módulo de vivienda en 3D · vista 360°</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDrop((value) => value + 1)} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-[.12em] transition hover:bg-white/20">Dejar caer carga</button>
          <button type="button" onClick={() => setSismo((value) => value + 1)} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#C0572B] px-3.5 py-2 text-[10px] font-black uppercase tracking-[.12em] transition hover:bg-[#E0703F]">Réplica sísmica</button>
          <button type="button" onClick={() => setAutoRotate((value) => !value)} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-black uppercase tracking-[.14em] transition ${autoRotate ? 'bg-[#D8B23D] text-[#171820]' : 'bg-white/10 text-white/70'}`}>
            <span className={`h-2 w-2 rounded-full ${autoRotate ? 'bg-[#171820]' : 'bg-white/40'}`} /> 360° {autoRotate ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="relative h-[420px] sm:h-[480px]">
        <Canvas shadows dpr={[1, 1.8]} camera={{ position: [8.4, 5.6, 8.8], fov: 38 }}>
          <Suspense fallback={null}>
            <Environment />
            <MetalconModel sismo={sismo} drop={drop} showPiso={showPiso} showMuros={showMuros} showRefuerzos={showRefuerzos} showCarga={showCarga} />
            <OrbitControls makeDefault target={[0, 1.4, 0]} enableDamping dampingFactor={0.08} autoRotate={autoRotate} autoRotateSpeed={0.9} minDistance={3.5} maxDistance={26} maxPolarAngle={Math.PI * 0.55} />
          </Suspense>
        </Canvas>
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-[#CCB196]">Gira 360° · zoom · ¡prueba la física!</div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-3 sm:grid-cols-4">
        <LayerToggle active={showPiso} onClick={() => setShowPiso(!showPiso)} label="Piso / soleras" />
        <LayerToggle active={showMuros} onClick={() => setShowMuros(!showMuros)} label="Muros @0,40 m" />
        <LayerToggle active={showRefuerzos} onClick={() => setShowRefuerzos(!showRefuerzos)} label="Refuerzos X" />
        <LayerToggle active={showCarga} onClick={() => setShowCarga(!showCarga)} label="Carga física" />
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-white/8 px-4 py-3">
        <Legend tone={ACCENT} label="Arriostramiento X" />
        <Legend tone={STEEL} label="Parante C 90×38×12 · e0,85" />
        <Legend tone={TRACK} label="Riel U 90×25" />
        <Legend tone={DARK} label="Dintel doble C90" />
      </div>
    </div>
  );
}

function LayerToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[10px] font-black uppercase tracking-[.12em] transition ${active ? 'bg-[#D8B23D]/15 text-[#F4D98B] ring-1 ring-[#D8B23D]/40' : 'bg-white/5 text-white/45 ring-1 ring-white/10 hover:text-white/75'}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-[#D8B23D]' : 'bg-white/25'}`} /> {label}
    </button>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[9px] font-bold text-white/70"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: tone }} />{label}</span>;
}

function Environment() {
  const grass = useTexture('/textures/grass.jpg');
  useMemo(() => {
    grass.wrapS = grass.wrapT = RepeatWrapping;
    grass.repeat.set(30, 30);
    grass.anisotropy = 4;
    grass.colorSpace = 'srgb';
  }, [grass]);

  const treeData = useMemo(() => {
    const data: Array<{ x: number; z: number; s: number; tone: string }> = [];
    const ring = (radius: number, count: number, scale: number) => {
      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + radius * 0.7;
        data.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, s: 0.8 + Math.random() * 0.6, tone: ['#3f7d3a', '#4c8f46', '#356e33', '#578e4e'][i % 4] });
      }
    };
    ring(7, 8, 1);
    ring(10.5, 7, 1.15);
    ring(14, 6, 0.9);
    return data;
  }, []);

  const grassData = useMemo(() => Array.from({ length: 260 }, () => ({ x: (Math.random() - 0.5) * 40, z: (Math.random() - 0.5) * 40, s: 0.5 + Math.random() * 0.9, yaw: Math.random() * Math.PI * 2, tilt: (Math.random() - 0.5) * 0.35, tone: 0.75 + Math.random() * 0.4 })), []);
  const rockData = useMemo(() => Array.from({ length: 14 }, () => ({ x: (Math.random() - 0.5) * 34, z: (Math.random() - 0.5) * 34, s: 0.6 + Math.random() * 1.4, yaw: Math.random() * Math.PI * 2, tilt: Math.random() * Math.PI })), []);

  return (
    <group>
      <Sky distance={450000} sunPosition={[120, 55, 80]} turbidity={6.2} rayleigh={2.4} mieCoefficient={0.0045} mieDirectionalG={0.82} />
      <Clouds limit={420} range={90}>
        <Cloud position={[-9, 7.5, -12]} seed={3} scale={7} speed={0.12} opacity={0.5} />
        <Cloud position={[10, 6.8, -9]} seed={7} scale={6} speed={0.09} opacity={0.42} />
        <Cloud position={[14, 8.5, 12]} seed={11} scale={8} speed={0.07} opacity={0.36} />
        <Cloud position={[-14, 7, 9]} seed={13} scale={6.5} speed={0.11} opacity={0.4} />
      </Clouds>

      <directionalLight position={[120, 55, 80]} intensity={1.55} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#bcd2e8', '#4c4630', 0.5]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[110, 110]} />
        <meshStandardMaterial map={grass} color="#b9c9a4" roughness={1} />
      </mesh>

      <GrassTufts data={grassData} />
      <Rocks data={rockData} />

      {treeData.map((tree, index) => (
        <group key={index} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.1 * tree.s, 0.16 * tree.s, 1, 7]} /><meshStandardMaterial color="#6b4a2b" roughness={0.95} /></mesh>
          <mesh position={[0, 1.55 * tree.s, 0]} castShadow><coneGeometry args={[0.85 * tree.s, 2.1 * tree.s, 8]} /><meshStandardMaterial color={tree.tone} roughness={0.85} /></mesh>
          <mesh position={[0, 0.6 * tree.s, 0]} castShadow><coneGeometry args={[0.6 * tree.s, 1.5 * tree.s, 8]} /><meshStandardMaterial color={tree.tone} roughness={0.85} /></mesh>
        </group>
      ))}
    </group>
  );
}

function GrassTufts({ data }: { data: Array<{ x: number; z: number; s: number; yaw: number; tilt: number; tone: number }> }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new BoxGeometry(0.035, 0.34, 0.035), []);
  const material = useMemo(() => new MeshStandardMaterial({ color: '#6d9a4a', roughness: 0.95 }), []);
  const matrix = useMemo(() => new Matrix4(), []);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    data.forEach((blade, index) => {
      dummy.position.set(blade.x, 0.17 * blade.s, blade.z);
      dummy.rotation.set(blade.tilt, blade.yaw, 0);
      dummy.scale.set(blade.s, blade.s, blade.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.setHSL(0.28, 0.42, blade.tone * 0.32);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, dummy, matrix, color]);
  return <instancedMesh ref={ref} args={[geometry, material, data.length]} castShadow />;
}

function Rocks({ data }: { data: Array<{ x: number; z: number; s: number; yaw: number; tilt: number }> }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new BoxGeometry(0.34, 0.2, 0.28), []);
  const material = useMemo(() => new MeshStandardMaterial({ color: '#8f8b86', roughness: 0.98 }), []);
  const dummy = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    data.forEach((rock, index) => {
      dummy.position.set(rock.x, 0.1 * rock.s, rock.z);
      dummy.rotation.set(rock.tilt, rock.yaw, 0);
      dummy.scale.set(rock.s, rock.s * 0.8, rock.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [data, dummy]);
  return <instancedMesh ref={ref} args={[geometry, material, data.length]} castShadow receiveShadow />;
}

function MetalconModel({ sismo, drop, showPiso, showMuros, showRefuerzos, showCarga }: { sismo: number; drop: number; showPiso: boolean; showMuros: boolean; showRefuerzos: boolean; showCarga: boolean }) {
  const crateRef = useRef<Object3D>(null);
  const stackRefs = useRef<MeshRef[]>([{ current: null }, { current: null }, { current: null }]);

  const parts = useMemo<Part[]>(() => {
    const geos = new Map<string, ExtrudeGeometry | BoxGeometry>();
    const cGeo = (len: number) => { const key = `c-${len.toFixed(3)}`; if (!geos.has(key)) geos.set(key, makeExtrude(cPoints(C90), len)); return geos.get(key)!; };
    const uGeo = (len: number) => { const key = `u-${len.toFixed(3)}`; if (!geos.has(key)) geos.set(key, makeExtrude(cPoints(U90), len)); return geos.get(key)!; };
    const boxGeo = (len: number) => { const key = `b-${len.toFixed(3)}`; if (!geos.has(key)) geos.set(key, new BoxGeometry(len, 0.04, 0.004)); return geos.get(key)!; };

    const mats = { steel: steelMat(), track: trackMat(), dark: darkMat(), accent: accentMat() };
    const parts: Part[] = [];
    const push = (g: ExtrudeGeometry | BoxGeometry, m: MeshStandardMaterial, x: number, y: number, z: number, r?: [number, number, number], q?: [number, number, number, number]) => parts.push({ g, m, p: [x, y, z], r, q });

    const quat = (dx: number, dy: number, dz: number): [number, number, number, number] => {
      const h = Math.hypot(dx, dy, dz) || 1;
      const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(dx / h, dy / h, dz / h));
      return [q.x, q.y, q.z, q.w];
    };

    const stud = (m: MeshStandardMaterial, len: number, x: number, y: number, z: number) => push(cGeo(len), m, x, y, z, [-Math.PI / 2, 0, 0]);

    if (showPiso) {
      push(uGeo(LARGO), mats.track, 0, 0.012, -ANCHO / 2);
      push(uGeo(LARGO), mats.track, 0, 0.012, ANCHO / 2);
      push(uGeo(ANCHO), mats.track, -LARGO / 2, 0.012, 0);
      push(uGeo(ANCHO), mats.track, LARGO / 2, 0.012, 0);
      for (let x = -LARGO / 2 + MOD; x <= LARGO / 2 - MOD + 0.001; x += MOD) push(cGeo(ANCHO), mats.track, x, 0.012, 0);
    }

    if (showMuros) {
      for (const z of [-ANCHO / 2, ANCHO / 2]) {
        push(uGeo(LARGO), mats.track, 0, 0, z);
        push(uGeo(LARGO), mats.track, 0, ALTURA, z);
      }
      for (const x of [-LARGO / 2, LARGO / 2]) {
        push(uGeo(ANCHO), mats.track, x, 0, 0);
        push(uGeo(ANCHO), mats.track, x, ALTURA, 0);
      }

      for (let x = -LARGO / 2; x <= LARGO / 2 + 0.001; x += MOD) {
        if (Math.abs(x) <= 0.49) continue;
        stud(mats.steel, ALTURA, x, ALTURA / 2, ANCHO / 2);
      }
      stud(mats.steel, ALTURA, -0.4, ALTURA / 2, ANCHO / 2);
      stud(mats.steel, ALTURA, 0.4, ALTURA / 2, ANCHO / 2);
      stud(mats.dark, 1.0, -0.68, 1.5, ANCHO / 2);
      stud(mats.dark, 1.0, 0.68, 1.5, ANCHO / 2);
      stud(mats.steel, 1.0, -0.54, 0.5, ANCHO / 2);
      stud(mats.steel, 1.0, 0.54, 0.5, ANCHO / 2);
      stud(mats.steel, 0.4, -0.54, 2.2, ANCHO / 2 + 0.001);
      stud(mats.steel, 0.4, 0.54, 2.2, ANCHO / 2 + 0.001);
      push(cGeo(1.36), mats.dark, 0, 1.0, ANCHO / 2);
      push(cGeo(1.36), mats.dark, 0, 2.0, ANCHO / 2);
      push(cGeo(1.36), mats.dark, 0, 2.0, ANCHO / 2, [0, Math.PI, 0]);
      push(cGeo(1.36), mats.dark, 0, 2.0, ANCHO / 2 - 0.001);

      for (let x = -LARGO / 2; x <= LARGO / 2 + 0.001; x += MOD) {
        if (Math.abs(x) <= 0.49) continue;
        stud(mats.steel, ALTURA, x, ALTURA / 2, -ANCHO / 2);
      }
      stud(mats.steel, ALTURA, -0.4, ALTURA / 2, -ANCHO / 2);
      stud(mats.steel, ALTURA, 0.4, ALTURA / 2, -ANCHO / 2);
      stud(mats.dark, 2.05, -0.48, 1.025, -ANCHO / 2);
      stud(mats.dark, 2.05, 0.48, 1.025, -ANCHO / 2);
      stud(mats.steel, 0.35, -0.2, 2.225, -ANCHO / 2 + 0.001);
      stud(mats.steel, 0.35, 0.2, 2.225, -ANCHO / 2 + 0.001);
      push(cGeo(0.96), mats.dark, 0, 2.05, -ANCHO / 2);
      push(cGeo(0.96), mats.dark, 0, 2.05, -ANCHO / 2, [0, Math.PI, 0]);

      for (const x of [-LARGO / 2, LARGO / 2]) {
        for (let z = -ANCHO / 2; z <= ANCHO / 2 + 0.001; z += MOD) stud(mats.steel, ALTURA, x, ALTURA / 2, z);
      }
    }

    if (showRefuerzos) {
      const brace = (x0: number, x1: number, z: number) => {
        const dx = x1 - x0;
        const len = Math.hypot(dx, ALTURA);
        for (const sign of [-1, 1]) {
          const ang = Math.atan2(sign > 0 ? ALTURA : -ALTURA, dx);
          push(boxGeo(len), mats.accent, (x0 + x1) / 2, ALTURA / 2, z, [0, 0, ang]);
        }
      };
      brace(-LARGO / 2 + MOD, -LARGO / 2 + 2 * MOD, ANCHO / 2);
      brace(LARGO / 2 - 2 * MOD, LARGO / 2 - MOD, ANCHO / 2);
    }

    return parts;
  }, [showPiso, showMuros, showRefuerzos]);

  const { world, dynamics, dropCrate, shake } = useMemo(() => {
    const world = new CannonWorld({ gravity: new Vec3(0, -9.82, 0) });
    world.broadphase = new SAPBroadphase(world);
    world.allowSleep = true;

    const steel = new CannonMaterial({ friction: 0.42, restitution: 0.22 });
    const wood = new CannonMaterial({ friction: 0.62, restitution: 0.32 });
    const groundMat = new CannonMaterial({ friction: 0.55, restitution: 0.12 });
    world.addContactMaterial(new ContactMaterial(steel, steel, { friction: 0.45, restitution: 0.2 }));
    world.addContactMaterial(new ContactMaterial(steel, wood, { friction: 0.5, restitution: 0.32 }));
    world.addContactMaterial(new ContactMaterial(wood, groundMat, { friction: 0.72, restitution: 0.28 }));

    const ground = new CannonBody({ mass: 0, material: groundMat, shape: new CannonPlane(), position: new Vec3(0, 0, 0) });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(ground);

    const euler = (r?: [number, number, number]) => (r ? new CannonQuaternion().setFromEuler(r[0], r[1], r[2], 'XYZ') : new CannonQuaternion());

    const bboxHalf = (part: Part): [number, number, number] => {
      const pos = part.g.attributes.position;
      let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      return [(maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2];
    };

    for (const part of parts) {
      const body = new CannonBody({
        mass: 0,
        material: steel,
        shape: new CannonBox(new Vec3(...bboxHalf(part))),
        position: new Vec3(part.p[0], part.p[1], part.p[2]),
        quaternion: part.q ? new CannonQuaternion(part.q[0], part.q[1], part.q[2], part.q[3]) : euler(part.r),
      });
      world.addBody(body);
    }

    const dynamics: Dynamics = [];
    const crateBody = new CannonBody({ mass: 28, material: wood, shape: new CannonBox(new Vec3(0.4, 0.4, 0.4)), position: new Vec3(1.4, 5.6, 1.6), angularDamping: 0.3, linearDamping: 0.05 });
    world.addBody(crateBody);
    dynamics.push({ body: crateBody, meshRef: crateRef });

    const profiles: Array<{ body: CannonBody }> = [];
    for (let i = 0; i < 3; i += 1) {
      const body = new CannonBody({ mass: 6, material: steel, shape: new CannonBox(new Vec3(1.2, 0.0125, 0.045)), position: new Vec3(-4.2, 0.2 + i * 0.14, 2.6), angularDamping: 0.35, linearDamping: 0.05 });
      world.addBody(body);
      dynamics.push({ body, meshRef: stackRefs.current[i] });
      profiles.push({ body });
    }

    const dropCrate = () => {
      crateBody.position.set(1.4, 5.6, 1.6);
      crateBody.velocity.set(0, 0, 0);
      crateBody.angularVelocity.set(0, 0, 0);
      crateBody.wakeUp();
    };

    const shake = () => {
      const power = 3.4;
      crateBody.applyImpulse(new Vec3((Math.random() - 0.5) * power, 1.2, (Math.random() - 0.5) * power));
      crateBody.applyTorque(new Vec3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3));
      for (const profile of profiles) {
        profile.body.applyImpulse(new Vec3((Math.random() - 0.5) * 2.6, 1.4, (Math.random() - 0.5) * 2.6));
        profile.body.wakeUp();
      }
    };

    return { world, dynamics, dropCrate, shake };
  }, [parts, crateRef, stackRefs]);

  useEffect(() => {
    if (sismo > 0) shake();
  }, [sismo, shake]);

  const lastDrop = useRef(0);
  useEffect(() => {
    if (drop > 0 && drop !== lastDrop.current) {
      lastDrop.current = drop;
      dropCrate();
    }
  }, [drop, dropCrate]);

  const crateTexture = useTexture('/textures/crate.gif');
  useMemo(() => { crateTexture.colorSpace = 'srgb'; }, [crateTexture]);

  return (
    <group>
      <ambientLight intensity={0.55} />
      {parts.map((part, index) => (
        <mesh key={index} geometry={part.g} material={part.m} position={part.p} rotation={part.r} quaternion={part.q} castShadow receiveShadow />
      ))}

      {showCarga ? (
        <group>
          <mesh ref={crateRef} castShadow receiveShadow position={[1.4, 5.6, 1.6]}>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshStandardMaterial map={crateTexture} roughness={0.85} />
          </mesh>
          {[0, 1, 2].map((index) => (
            <mesh key={index} ref={stackRefs.current[index]} castShadow receiveShadow position={[-4.2, 0.2 + index * 0.14, 2.6]}>
              <boxGeometry args={[2.4, 0.025, 0.09]} />
              <meshStandardMaterial color={TRACK} metalness={0.82} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ) : null}

      <PhysicsSync world={world} dynamics={dynamics} />
    </group>
  );
}