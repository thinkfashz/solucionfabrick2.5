'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { type Air, type Mode, type MoveState, PBR, MODES, clamp } from './model';

function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environment = environment;
    return () => {
      scene.environment = null;
      environment.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function usePbr(width: number, depth: number) {
  const textures = useTexture({
    woodColor: PBR.wood[0], woodNormal: PBR.wood[1], woodRough: PBR.wood[2],
    wallColor: PBR.wall[0], wallNormal: PBR.wall[1], wallRough: PBR.wall[2],
    fabricColor: PBR.fabric[0], fabricNormal: PBR.fabric[1], fabricRough: PBR.fabric[2],
  });

  useEffect(() => {
    const all = Object.values(textures) as THREE.Texture[];
    all.forEach((texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
    });
    textures.woodColor.colorSpace = THREE.SRGBColorSpace;
    textures.wallColor.colorSpace = THREE.SRGBColorSpace;
    textures.fabricColor.colorSpace = THREE.SRGBColorSpace;
    textures.woodColor.repeat.set(Math.max(2, width * 0.72), Math.max(3, depth * 1.05));
    textures.woodNormal.repeat.copy(textures.woodColor.repeat);
    textures.woodRough.repeat.copy(textures.woodColor.repeat);
    [textures.wallColor, textures.wallNormal, textures.wallRough].forEach((texture) => texture.repeat.set(2.6, 2));
    [textures.fabricColor, textures.fabricNormal, textures.fabricRough].forEach((texture) => texture.repeat.set(3.4, 3.4));
  }, [textures, width, depth]);

  return textures;
}

function Airflow({ mode, speed, depth }: { mode: Mode; speed: number; depth: number }) {
  const group = useRef<THREE.Group>(null);
  const { size } = useThree();
  const count = size.width < 760 ? 10 : 20;

  useFrame(({ clock }) => {
    group.current?.children.forEach((object, index) => {
      const t = (clock.elapsedTime * (0.15 + speed * 0.065) + index / count) % 1;
      object.position.set(
        ((index % 7) - 3) * 0.085 * (1 + t * 0.5),
        -0.11 - t * (0.42 + speed * 0.06),
        0.22 + t * Math.min(depth * 0.48, 2.9),
      );
      ((object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * t) * (0.065 + speed * 0.016);
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={index}>
          <sphereGeometry args={[0.022, 7, 5]} />
          <meshBasicMaterial color={MODES[mode].color} transparent opacity={0.08} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function AirUnit({ air, depth, height, mode, speed }: { air: Air; depth: number; height: number; mode: Mode; speed: number }) {
  const y = clamp(height * 0.76, 1.82, height - 0.34);
  const benefit = air.inverter ? 'Ahorro progresivo · temperatura estable' : 'Climatización directa · respuesta rápida';

  return (
    <group position={[0, y, -depth / 2 + 0.2]}>
      <RoundedBox args={[air.width, 0.34, 0.25]} radius={0.075} smoothness={6} castShadow>
        <meshPhysicalMaterial color="#E9E7E2" roughness={0.2} clearcoat={0.6} clearcoatRoughness={0.14} />
      </RoundedBox>
      <mesh position={[0, -0.115, 0.14]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[air.width * 0.82, 0.055, 0.045]} />
        <meshStandardMaterial color="#16191C" roughness={0.34} />
      </mesh>
      {[-0.25, -0.12, 0, 0.12, 0.25].map((x) => (
        <mesh key={x} position={[air.width * x, -0.132, 0.166]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.012, 0.055, 0.09]} />
          <meshStandardMaterial color="#4D5358" roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 0.01, 0.13]}>
        <planeGeometry args={[air.width * 0.5, 0.05]} />
        <meshBasicMaterial color={MODES[mode].color} transparent opacity={0.22} toneMapped={false} />
      </mesh>
      <pointLight position={[0, -0.04, 0.3]} intensity={0.08 + speed * 0.025} distance={1.35} color={MODES[mode].color} />

      <Html transform position={[air.width / 2 + 0.27, 0.06, 0.03]} distanceFactor={1.65} style={{ pointerEvents: 'none' }}>
        <div className="w-[176px] rounded-[18px] border border-white/15 bg-[#101318]/78 p-3 text-white shadow-[0_18px_45px_rgba(0,0,0,.42)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[7px] font-black uppercase tracking-[.16em] text-[#F2B06E]">{air.source === 'catalogo' ? 'Equipo de catálogo' : 'Referencia visual'}</span>
            <span className="rounded-full px-2 py-1 text-[8px] font-black" style={{ color: air.energyColor, background: `${air.energyColor}1F` }}>{air.energy}</span>
          </div>
          <b className="mt-1 block truncate text-[12px]">{air.name}</b>
          <div className="mt-1 flex flex-wrap gap-x-2 text-[8px] text-white/55">
            <span>{air.cap.toLocaleString('es-CL')} BTU</span><span>{air.coverage} m²</span><span>{air.people}</span>
          </div>
          <div className="mt-2 border-t border-white/8 pt-2 text-[8px] text-white/42">{benefit}</div>
        </div>
      </Html>

      <Airflow mode={mode} speed={speed} depth={depth} />
    </group>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow><cylinderGeometry args={[0.15, 0.2, 0.32, 16]} /><meshStandardMaterial color="#80604A" roughness={0.9} /></mesh>
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <mesh key={index} position={[Math.sin(index * 1.4) * 0.14, 0.31 + index * 0.05, Math.cos(index * 1.4) * 0.12]} rotation={[0, index, 0.48 - (index % 2) * 0.8]} castShadow>
          <sphereGeometry args={[0.1, 0.22, 0.075, 10, 7]} />
          <meshStandardMaterial color={index % 2 ? '#355A40' : '#4A724E'} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BedsideLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 0.24, 14]} /><meshStandardMaterial color="#3C2B23" roughness={0.68} /></mesh>
      <mesh position={[0, 0.37, 0]} castShadow><coneGeometry args={[0.18, 0.24, 18, 1, true]} /><meshStandardMaterial color="#D5B18B" emissive="#FFB86B" emissiveIntensity={0.55} roughness={0.72} side={THREE.DoubleSide} /></mesh>
      <pointLight position={[0, 0.36, 0.08]} color="#FFB36B" intensity={0.25} distance={2.25} />
    </group>
  );
}

function Ceiling({ width, depth, height }: { width: number; depth: number; height: number }) {
  const { size } = useThree();
  const mobile = size.width < 760;
  const lights = mobile
    ? [[-0.28, -0.24], [0.28, 0.26]]
    : [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]];

  return (
    <group position={[0, height, 0]}>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[width + 0.12, 0.12, depth + 0.12]} />
        <meshStandardMaterial color="#8C7A6C" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.055, 0]} receiveShadow>
        <boxGeometry args={[width * 0.76, 0.09, depth * 0.72]} />
        <meshStandardMaterial color="#A8998B" roughness={0.84} />
      </mesh>

      {[
        [0, -depth * 0.39, width * 0.76, 0.035],
        [0, depth * 0.39, width * 0.76, 0.035],
        [-width * 0.4, 0, 0.035, depth * 0.72],
        [width * 0.4, 0, 0.035, depth * 0.72],
      ].map(([x, z, w, d], index) => (
        <mesh key={index} position={[x, -0.11, z]}>
          <boxGeometry args={[w, 0.025, d]} />
          <meshStandardMaterial color="#F0A35E" emissive="#FF8D32" emissiveIntensity={1.35} roughness={0.45} toneMapped={false} />
        </mesh>
      ))}

      {lights.map(([x, z], index) => (
        <group key={index} position={[x * width, -0.13, z * depth]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.075, 0.075, 0.026, 18]} />
            <meshStandardMaterial color="#3C352F" roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.047, 18]} />
            <meshBasicMaterial color="#FFD19A" toneMapped={false} />
          </mesh>
          <pointLight position={[0, -0.18, 0]} color="#FFB56F" intensity={mobile ? 0.18 : 0.23} distance={2.4} />
        </group>
      ))}
    </group>
  );
}

function WindowView({ width, height, roomWidth, y }: { width: number; height: number; roomWidth: number; y: number }) {
  return (
    <group position={[-roomWidth / 2 - 0.16, y, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh><planeGeometry args={[width, height]} /><meshBasicMaterial color="#3F3442" toneMapped={false} /></mesh>
      <mesh position={[0, height * 0.25, 0.01]}><planeGeometry args={[width, height * 0.48]} /><meshBasicMaterial color="#7D5360" toneMapped={false} /></mesh>
      <mesh position={[0, -height * 0.17, 0.012]}><planeGeometry args={[width, height * 0.34]} /><meshBasicMaterial color="#D47A54" toneMapped={false} /></mesh>
      <mesh position={[width * 0.22, height * 0.13, 0.018]}><circleGeometry args={[0.18, 24]} /><meshBasicMaterial color="#FFB06A" toneMapped={false} /></mesh>
      {[-0.42, -0.2, 0.02, 0.26, 0.44].map((x, index) => (
        <mesh key={index} position={[width * x, -height * 0.32, 0.025]}>
          <planeGeometry args={[0.14 + (index % 2) * 0.06, 0.22 + (index % 3) * 0.09]} />
          <meshBasicMaterial color="#24232A" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Room({ width, depth, height, air, mode, speed }: { width: number; depth: number; height: number; air: Air; mode: Mode; speed: number }) {
  const t = usePbr(width, depth);
  const bedWidth = Math.min(2.5, width * 0.56);
  const bedDepth = Math.min(1.95, depth * 0.4);
  const windowWidth = Math.min(depth * 0.54, 3);
  const windowHeight = Math.min(height * 0.56, 1.62);
  const side = Math.max(0.2, (depth - windowWidth) / 2);
  const bottom = 0.58;
  const top = Math.max(0.18, height - bottom - windowHeight);
  const wallMaterial = <meshStandardMaterial map={t.wallColor} normalMap={t.wallNormal} roughnessMap={t.wallRough} color="#A08E7F" roughness={0.88} normalScale={new THREE.Vector2(0.55, 0.55)} />;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial map={t.woodColor} normalMap={t.woodNormal} roughnessMap={t.woodRough} roughness={0.54} normalScale={new THREE.Vector2(0.52, 0.52)} />
      </mesh>

      <Ceiling width={width} depth={depth} height={height} />

      <mesh position={[0, height / 2, -depth / 2]} receiveShadow><boxGeometry args={[width, height, 0.12]} />{wallMaterial}</mesh>
      <mesh position={[width / 2, height / 2, 0]} receiveShadow><boxGeometry args={[0.12, height, depth]} />{wallMaterial}</mesh>
      <mesh position={[-width / 2, bottom / 2, 0]} receiveShadow><boxGeometry args={[0.12, bottom, depth]} />{wallMaterial}</mesh>
      <mesh position={[-width / 2, bottom + windowHeight + top / 2, 0]} receiveShadow><boxGeometry args={[0.12, top, depth]} />{wallMaterial}</mesh>
      <mesh position={[-width / 2, bottom + windowHeight / 2, -(windowWidth / 2 + side / 2)]} receiveShadow><boxGeometry args={[0.12, windowHeight, side]} />{wallMaterial}</mesh>
      <mesh position={[-width / 2, bottom + windowHeight / 2, windowWidth / 2 + side / 2]} receiveShadow><boxGeometry args={[0.12, windowHeight, side]} />{wallMaterial}</mesh>

      <WindowView width={windowWidth} height={windowHeight} roomWidth={width} y={bottom + windowHeight / 2} />
      <group position={[-width / 2 + 0.07, bottom + windowHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><planeGeometry args={[windowWidth, windowHeight]} /><meshPhysicalMaterial color="#A9C9D4" transmission={0.7} transparent opacity={0.24} roughness={0.07} depthWrite={false} /></mesh>
        {[-0.33, 0.33].map((x) => <mesh key={x} position={[windowWidth * x, 0, 0.03]}><boxGeometry args={[0.035, windowHeight, 0.035]} /><meshStandardMaterial color="#292A2C" metalness={0.38} roughness={0.42} /></mesh>)}
        <mesh position={[0, 0, 0.03]}><boxGeometry args={[windowWidth, 0.035, 0.035]} /><meshStandardMaterial color="#292A2C" metalness={0.38} roughness={0.42} /></mesh>
      </group>

      <group position={[0, 0.43, -depth / 2 + bedDepth / 2 + 0.44]}>
        <RoundedBox args={[bedWidth, 0.34, bedDepth]} radius={0.1} smoothness={4} castShadow><meshStandardMaterial color="#544A46" roughness={0.9} /></RoundedBox>
        <RoundedBox args={[bedWidth * 0.98, 0.23, bedDepth * 0.94]} radius={0.08} smoothness={4} position={[0, 0.25, 0]} castShadow>
          <meshStandardMaterial map={t.fabricColor} normalMap={t.fabricNormal} roughnessMap={t.fabricRough} color="#BBAE9D" roughness={0.92} />
        </RoundedBox>
        {[-0.72, -0.24, 0.24, 0.72].map((x, index) => (
          <RoundedBox key={x} args={[bedWidth * 0.23, 0.82, 0.13]} radius={0.06} smoothness={4} position={[x * bedWidth * 0.52, 0.69, -bedDepth * 0.47]} castShadow>
            <meshStandardMaterial color={index % 2 ? '#82766C' : '#9A8C7D'} roughness={0.9} />
          </RoundedBox>
        ))}
        {[-0.25, 0.25].map((x) => (
          <RoundedBox key={x} args={[bedWidth * 0.34, 0.19, 0.42]} radius={0.08} smoothness={4} position={[x * bedWidth, 0.49, -bedDepth * 0.16]} rotation={[-0.2, 0, 0]} castShadow>
            <meshStandardMaterial color="#D8CCBC" roughness={0.95} />
          </RoundedBox>
        ))}
      </group>

      <mesh position={[0, 0.012, -depth / 2 + bedDepth + 1.08]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[Math.min(width * 0.72, 3.25), Math.min(depth * 0.32, 2.2)]} />
        <meshStandardMaterial map={t.fabricColor} normalMap={t.fabricNormal} roughnessMap={t.fabricRough} color="#8A7D6D" roughness={0.98} />
      </mesh>

      {[-1, 1].map((sideSign) => {
        const x = sideSign * Math.min(width / 2 - 0.55, 1.8);
        return (
          <group key={sideSign} position={[x, 0.38, -depth / 2 + 0.72]}>
            <RoundedBox args={[0.58, 0.5, 0.54]} radius={0.055} smoothness={4} castShadow><meshStandardMaterial color="#4A3026" roughness={0.76} /></RoundedBox>
            <BedsideLamp position={[0, 0.29, 0]} />
          </group>
        );
      })}

      {Array.from({ length: 9 }, (_, index) => (
        <mesh key={index} position={[width / 2 - 0.68 + index * 0.075, height * 0.49, -depth / 2 + 0.09]} castShadow>
          <boxGeometry args={[0.045, height * 0.78, 0.07]} />
          <meshStandardMaterial color={index % 2 ? '#3A271F' : '#513429'} roughness={0.72} />
        </mesh>
      ))}

      <group position={[-width / 2 + 0.75, 0.42, depth / 2 - 1]}>
        <RoundedBox args={[0.85, 0.5, 0.8]} radius={0.15} smoothness={5} castShadow>
          <meshStandardMaterial map={t.fabricColor} normalMap={t.fabricNormal} roughnessMap={t.fabricRough} color="#756B63" roughness={0.9} />
        </RoundedBox>
      </group>
      <Plant position={[-width / 2 + 0.42, 0.18, -depth / 2 + 1.05]} />
      <Plant position={[width / 2 - 0.38, 0.16, -depth / 2 + 0.76]} />

      <AirUnit air={air} depth={depth} height={height} mode={mode} speed={speed} />

      <hemisphereLight args={['#E6BC93', '#241B16', 0.23]} />
      <directionalLight position={[-width * 0.5, height + 2.2, depth * 0.25]} intensity={0.62} color="#FFD0A4" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <rectAreaLight position={[-width / 2 + 0.25, height * 0.58, 0.1]} rotation={[0, Math.PI / 2, 0]} width={Math.min(depth * 0.62, 3)} height={1.35} intensity={0.72} color="#F39A61" />
      <spotLight position={[width * 0.18, height - 0.18, 0.35]} intensity={0.32} angle={0.55} penumbra={0.9} color="#FFC78E" castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
    </group>
  );
}

function Avatar({ moving }: { moving: MutableRefObject<number> }) {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const stride = Math.sin(clock.elapsedTime * 10) * 0.42 * moving.current;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.7;
    if (rightArm.current) rightArm.current.rotation.x = stride * 0.7;
  });

  return (
    <group scale={0.86}>
      <mesh position={[0, 1.54, 0]} castShadow><sphereGeometry args={[0.155, 18, 14]} /><meshStandardMaterial color="#A7755B" roughness={0.82} /></mesh>
      <RoundedBox args={[0.43, 0.66, 0.23]} radius={0.09} smoothness={4} position={[0, 1.04, 0]} castShadow><meshStandardMaterial color="#15181C" roughness={0.78} /></RoundedBox>
      {[-1, 1].map((side, index) => (
        <group key={`arm-${side}`} ref={index ? rightArm : leftArm} position={[side * 0.26, 1.16, 0]}>
          <mesh position={[0, -0.28, 0]}><capsuleGeometry args={[0.055, 0.42, 5, 9]} /><meshStandardMaterial color="#191C20" roughness={0.84} /></mesh>
        </group>
      ))}
      {[-1, 1].map((side, index) => (
        <group key={`leg-${side}`} ref={index ? rightLeg : leftLeg} position={[side * 0.12, 0.72, 0]}>
          <mesh position={[0, -0.34, 0]}><capsuleGeometry args={[0.078, 0.55, 5, 10]} /><meshStandardMaterial color="#23262B" roughness={0.86} /></mesh>
          <mesh position={[0, -0.68, -0.035]}><boxGeometry args={[0.16, 0.08, 0.27]} /><meshStandardMaterial color="#0E1013" roughness={0.72} /></mesh>
        </group>
      ))}
    </group>
  );
}

function ThirdPerson({ move, width, depth, resetKey }: { move: MoveState; width: number; depth: number; resetKey: number }) {
  const { camera, gl, size } = useThree();
  const avatar = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  const pitch = useRef(0.04);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const keys = useRef(new Set<string>());
  const physics = useRef<{ world: CANNON.World; body: CANNON.Body } | null>(null);
  const moving = useRef(0);

  useEffect(() => {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
    const body = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(0, 0.3, depth / 2 - 1.15), linearDamping: 0.16 });
    body.addShape(new CANNON.Sphere(0.22));
    world.addBody(body);
    const box = (half: [number, number, number], position: [number, number, number]) => {
      const collider = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(...position) });
      collider.addShape(new CANNON.Box(new CANNON.Vec3(...half)));
      world.addBody(collider);
    };
    box([0.08, 1, depth / 2], [-width / 2, 1, 0]);
    box([0.08, 1, depth / 2], [width / 2, 1, 0]);
    box([width / 2, 1, 0.08], [0, 1, -depth / 2]);
    box([width / 2, 1, 0.08], [0, 1, depth / 2]);
    const bedWidth = Math.min(2.5, width * 0.56);
    const bedDepth = Math.min(1.95, depth * 0.4);
    box([bedWidth / 2 + 0.1, 0.45, bedDepth / 2 + 0.1], [0, 0.45, -depth / 2 + bedDepth / 2 + 0.44]);
    physics.current = { world, body };
    return () => { physics.current = null; };
  }, [width, depth]);

  useEffect(() => {
    const canvas = gl.domElement;
    const keyDown = (event: KeyboardEvent) => keys.current.add(event.code);
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const pointerDown = (event: PointerEvent) => { dragging.current = true; last.current = { x: event.clientX, y: event.clientY }; };
    const pointerUp = () => { dragging.current = false; };
    const pointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      const sensitivity = event.pointerType === 'touch' ? 0.0052 : 0.0042;
      yaw.current -= dx * sensitivity;
      pitch.current = clamp(pitch.current + dy * sensitivity * 0.34, -0.05, 0.28);
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointermove', pointerMove);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointermove', pointerMove);
    };
  }, [gl]);

  useEffect(() => {
    const state = physics.current;
    if (!state) return;
    state.body.position.set(0, 0.3, depth / 2 - 1.15);
    state.body.velocity.set(0, 0, 0);
    yaw.current = 0;
    pitch.current = 0.04;
  }, [resetKey, depth]);

  useFrame((_, dt) => {
    const state = physics.current;
    if (!state || !avatar.current) return;
    const forwardAxis = (keys.current.has('KeyW') || move.forward ? 1 : 0) - (keys.current.has('KeyS') || move.back ? 1 : 0);
    const sideAxis = (keys.current.has('KeyD') || move.right ? 1 : 0) - (keys.current.has('KeyA') || move.left ? 1 : 0);
    const direction = new THREE.Vector3(sideAxis, 0, -forwardAxis);
    moving.current = THREE.MathUtils.damp(moving.current, direction.length(), 9, dt);

    if (direction.lengthSq()) {
      direction.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      const speed = keys.current.has('ShiftLeft') ? 5.4 : 3.55;
      state.body.velocity.x = direction.x * speed;
      state.body.velocity.z = direction.z * speed;
      avatar.current.rotation.y = THREE.MathUtils.damp(avatar.current.rotation.y, Math.atan2(direction.x, direction.z), 12, dt);
    } else {
      state.body.velocity.x *= 0.64;
      state.body.velocity.z *= 0.64;
    }

    state.body.velocity.y = 0;
    state.world.step(1 / 60, Math.min(dt, 0.04), 2);
    avatar.current.position.set(state.body.position.x, 0, state.body.position.z);

    const mobile = size.width < 760;
    const distance = mobile ? 3.75 : 4.2;
    const cameraHeight = mobile ? 1.72 : 1.88;
    const lookAhead = mobile ? 1.85 : 1.65;
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const subject = new THREE.Vector3(state.body.position.x, 1.08, state.body.position.z);
    const target = subject.clone().addScaledVector(forward, lookAhead);
    target.y = 1.28 + pitch.current * 0.55;
    const desired = subject.clone().add(new THREE.Vector3(Math.sin(yaw.current) * distance, cameraHeight - 1.08, Math.cos(yaw.current) * distance));
    desired.x = clamp(desired.x, -width / 2 + 0.18, width / 2 - 0.18);
    desired.z = clamp(desired.z, -depth / 2 + 0.2, depth / 2 + 1.45);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 7.5));
    camera.lookAt(target);
  });

  return <group ref={avatar}><Avatar moving={moving} /></group>;
}

function AdaptiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = size.width < 760 ? 58 : 54;
    perspective.updateProjectionMatrix();
  }, [camera, size.width]);
  return null;
}

export function GameScene({ width, depth, height, air, mode, speed, move, resetKey }: { width: number; depth: number; height: number; air: Air; mode: Mode; speed: number; move: MoveState; resetKey: number }) {
  return (
    <Canvas
      shadows
      dpr={[0.82, 1.25]}
      camera={{ fov: 58, near: 0.05, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.78;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={['#17110E']} />
      <fog attach="fog" args={['#17110E', 12, 27]} />
      <AdaptiveCamera />
      <Environment />
      <Room width={width} depth={depth} height={height} air={air} mode={mode} speed={speed} />
      <ThirdPerson move={move} width={width} depth={depth} resetKey={resetKey} />
    </Canvas>
  );
}
