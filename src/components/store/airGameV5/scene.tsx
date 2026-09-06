'use client';

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { type Air, type Mode, type MoveState, PBR, MODES, clamp } from './model';

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function usePbr(w: number, d: number) {
  const textures = useTexture({
    wc: PBR.wood[0], wn: PBR.wood[1], wr: PBR.wood[2],
    mc: PBR.wall[0], mn: PBR.wall[1], mr: PBR.wall[2],
    fc: PBR.fabric[0], fn: PBR.fabric[1], fr: PBR.fabric[2],
  });
  useMemo(() => {
    (Object.values(textures) as THREE.Texture[]).forEach((texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 4;
    });
    textures.wc.colorSpace = textures.mc.colorSpace = textures.fc.colorSpace = THREE.SRGBColorSpace;
    textures.wc.repeat.set(Math.max(2, w * 0.65), Math.max(3, d * 0.9));
    textures.wn.repeat.copy(textures.wc.repeat);
    textures.wr.repeat.copy(textures.wc.repeat);
    [textures.mc, textures.mn, textures.mr].forEach((texture) => texture.repeat.set(2.2, 1.7));
    [textures.fc, textures.fn, textures.fr].forEach((texture) => texture.repeat.set(3, 3));
  }, [textures, w, d]);
  return textures;
}

function Flow({ mode, speed, depth }: { mode: Mode; speed: number; depth: number }) {
  const group = useRef<THREE.Group>(null);
  const { size } = useThree();
  const count = size.width < 760 ? 10 : 20;
  useFrame(({ clock }) => {
    group.current?.children.forEach((object, index) => {
      const t = (clock.elapsedTime * (0.16 + speed * 0.065) + index / count) % 1;
      object.position.set(((index % 7) - 3) * 0.09 * (1 + t * 0.55), -0.1 - t * (0.42 + speed * 0.06), 0.2 + t * Math.min(depth * 0.48, 2.8));
      ((object as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * t) * (0.08 + speed * 0.016);
    });
  });
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={index}>
          <sphereGeometry args={[0.025, 7, 5]} />
          <meshBasicMaterial color={MODES[mode].color} transparent opacity={0.09} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function AirUnit({ air, d, h, mode, speed }: { air: Air; d: number; h: number; mode: Mode; speed: number }) {
  const y = clamp(h * 0.77, 1.82, h - 0.34);
  return (
    <group position={[0, y, -d / 2 + 0.2]}>
      <RoundedBox args={[air.width, 0.34, 0.25]} radius={0.075} smoothness={6} castShadow>
        <meshPhysicalMaterial color="#E7E4DE" roughness={0.25} clearcoat={0.45} clearcoatRoughness={0.2} />
      </RoundedBox>
      <mesh position={[0, -0.115, 0.14]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[air.width * 0.8, 0.055, 0.045]} />
        <meshStandardMaterial color="#17191d" roughness={0.42} />
      </mesh>
      {[-0.25, -0.12, 0, 0.12, 0.25].map((x) => (
        <mesh key={x} position={[air.width * x, -0.13, 0.165]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.012, 0.055, 0.09]} />
          <meshStandardMaterial color="#52565a" />
        </mesh>
      ))}
      <pointLight position={[0, -0.03, 0.3]} intensity={0.12 + speed * 0.025} distance={1.35} color={MODES[mode].color} />
      <Html transform position={[air.width / 2 + 0.24, 0.08, 0.02]} distanceFactor={1.45} style={{ pointerEvents: 'none' }}>
        <div className="w-[154px] rounded-2xl border border-white/15 bg-black/76 p-2.5 text-white shadow-xl backdrop-blur-xl">
          <div className="flex justify-between text-[7px] uppercase text-white/40"><span>{air.source === 'catalogo' ? 'Catálogo' : 'Referencia'}</span><b style={{ color: air.energyColor }}>{air.energy}</b></div>
          <b className="mt-1 block truncate text-xs">{air.name}</b>
          <small className="text-[8px] text-white/48">{air.coverage} m² · {air.people}</small>
        </div>
      </Html>
      <Flow mode={mode} speed={speed} depth={d} />
    </group>
  );
}

function Plant({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <mesh><cylinderGeometry args={[0.15, 0.2, 0.32, 16]} /><meshStandardMaterial color="#7A5843" roughness={0.9} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <mesh key={index} position={[Math.sin(index) * 0.13, 0.3 + index * 0.055, Math.cos(index) * 0.12]} rotation={[0, index, 0.5 - (index % 2)]}>
          <sphereGeometry args={[0.1, 0.2, 0.08, 10, 7]} />
          <meshStandardMaterial color={index % 2 ? '#36533D' : '#496A4C'} roughness={0.82} />
        </mesh>
      ))}
    </group>
  );
}

function Room({ w, d, h, air, mode, speed }: { w: number; d: number; h: number; air: Air; mode: Mode; speed: number }) {
  const t = usePbr(w, d);
  const bedW = Math.min(2.5, w * 0.56);
  const bedD = Math.min(1.9, d * 0.4);
  const winW = Math.min(d * 0.54, 3);
  const winH = Math.min(h * 0.58, 1.65);
  const side = Math.max(0.2, (d - winW) / 2);
  const bottom = 0.58;
  const top = Math.max(0.18, h - bottom - winH);
  const wallMaterial = () => (
    <meshStandardMaterial map={t.mc} normalMap={t.mn} roughnessMap={t.mr} color="#AFA59B" roughness={0.92} normalScale={new THREE.Vector2(0.38, 0.38)} />
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={t.wc} normalMap={t.wn} roughnessMap={t.wr} roughness={0.68} normalScale={new THREE.Vector2(0.48, 0.48)} />
      </mesh>
      <mesh position={[0, h + 0.07, 0]} receiveShadow>
        <boxGeometry args={[w + 0.16, 0.14, d + 0.16]} />
        <meshStandardMaterial color="#C5BDB4" roughness={0.95} />
      </mesh>
      <mesh position={[0, h / 2, -d / 2]} receiveShadow><boxGeometry args={[w, h, 0.12]} />{wallMaterial()}</mesh>
      <mesh position={[w / 2, h / 2, 0]} receiveShadow><boxGeometry args={[0.12, h, d]} />{wallMaterial()}</mesh>
      <mesh position={[-w / 2, bottom / 2, 0]} receiveShadow><boxGeometry args={[0.12, bottom, d]} />{wallMaterial()}</mesh>
      <mesh position={[-w / 2, bottom + winH + top / 2, 0]} receiveShadow><boxGeometry args={[0.12, top, d]} />{wallMaterial()}</mesh>
      <mesh position={[-w / 2, bottom + winH / 2, -(winW / 2 + side / 2)]} receiveShadow><boxGeometry args={[0.12, winH, side]} />{wallMaterial()}</mesh>
      <mesh position={[-w / 2, bottom + winH / 2, winW / 2 + side / 2]} receiveShadow><boxGeometry args={[0.12, winH, side]} />{wallMaterial()}</mesh>

      <group position={[-w / 2 + 0.07, bottom + winH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><planeGeometry args={[winW, winH]} /><meshPhysicalMaterial color="#9CC6D7" transmission={0.7} transparent opacity={0.3} roughness={0.08} depthWrite={false} /></mesh>
        {[-0.33, 0.33].map((x) => <mesh key={x} position={[winW * x, 0, 0.03]}><boxGeometry args={[0.035, winH, 0.035]} /><meshStandardMaterial color="#292a2c" metalness={0.4} /></mesh>)}
        <mesh position={[0, 0, 0.03]}><boxGeometry args={[winW, 0.035, 0.035]} /><meshStandardMaterial color="#292a2c" metalness={0.4} /></mesh>
      </group>

      <mesh position={[-w / 2 - 0.45, h * 0.55, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[d * 1.15, h * 1.15]} /><meshBasicMaterial color="#68483E" /></mesh>

      <group position={[0, 0.45, -d / 2 + bedD / 2 + 0.42]}>
        <RoundedBox args={[bedW, 0.32, bedD]} radius={0.1} smoothness={4} castShadow><meshStandardMaterial color="#554C48" roughness={0.92} /></RoundedBox>
        <RoundedBox args={[bedW * 0.98, 0.23, bedD * 0.95]} radius={0.08} smoothness={4} position={[0, 0.25, 0]} castShadow><meshStandardMaterial map={t.fc} normalMap={t.fn} roughnessMap={t.fr} roughness={0.94} /></RoundedBox>
        <mesh position={[0, 0.68, -bedD * 0.46]} castShadow><boxGeometry args={[bedW, 0.82, 0.13]} /><meshStandardMaterial map={t.fc} normalMap={t.fn} roughnessMap={t.fr} roughness={0.95} /></mesh>
      </group>

      {[-1, 1].map((sideValue) => (
        <group key={sideValue} position={[sideValue * Math.min(w / 2 - 0.55, 1.8), 0.38, -d / 2 + 0.72]}>
          <RoundedBox args={[0.58, 0.5, 0.54]} radius={0.055} smoothness={4}><meshStandardMaterial color="#4E3328" roughness={0.82} /></RoundedBox>
          <pointLight position={[0, 0.7, 0.05]} color="#FFB56F" intensity={0.28} distance={2.25} />
        </group>
      ))}

      <group position={[-w / 2 + 0.75, 0.42, d / 2 - 1]}>
        <RoundedBox args={[0.85, 0.5, 0.8]} radius={0.15} smoothness={5}><meshStandardMaterial map={t.fc} normalMap={t.fn} roughnessMap={t.fr} roughness={0.92} /></RoundedBox>
      </group>
      <Plant p={[-w / 2 + 0.4, 0.18, -d / 2 + 1.05]} />
      <AirUnit air={air} d={d} h={h} mode={mode} speed={speed} />

      <hemisphereLight args={['#F4C79F', '#2B211C', 0.34]} />
      <directionalLight position={[-w * 0.55, h + 2.5, d * 0.35]} intensity={0.74} color="#FFD0A2" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <rectAreaLight position={[-w / 2 + 0.25, h * 0.62, 0.1]} rotation={[0, Math.PI / 2, 0]} width={Math.min(d * 0.65, 3)} height={1.4} intensity={0.92} color="#FFAD70" />
      <spotLight position={[w * 0.22, h - 0.1, 0.3]} intensity={0.4} angle={0.55} penumbra={0.9} color="#FFC788" castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} />
    </group>
  );
}

function Avatar({ moving }: { moving: MutableRefObject<number> }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const angle = Math.sin(clock.elapsedTime * 10) * 0.46 * moving.current;
    if (left.current) left.current.rotation.x = angle;
    if (right.current) right.current.rotation.x = -angle;
  });
  return (
    <group scale={0.82}>
      <mesh position={[0, 1.52, 0]} castShadow><sphereGeometry args={[0.16, 18, 14]} /><meshStandardMaterial color="#A7755B" roughness={0.82} /></mesh>
      <RoundedBox args={[0.44, 0.7, 0.24]} radius={0.1} smoothness={4} position={[0, 1.02, 0]} castShadow><meshStandardMaterial color="#15181C" roughness={0.85} /></RoundedBox>
      {[-1, 1].map((sideValue, index) => (
        <group key={sideValue} ref={index ? right : left} position={[sideValue * 0.12, 0.67, 0]}>
          <mesh position={[0, -0.35, 0]}><capsuleGeometry args={[0.082, 0.56, 5, 10]} /><meshStandardMaterial color="#23262B" roughness={0.9} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Third({ move, w, d, h }: { move: MoveState; w: number; d: number; h: number }) {
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
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = size.width < 760 ? 72 : 62;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width]);

  useEffect(() => {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
    const body = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(0, 0.3, d / 2 - 1.15), linearDamping: 0.16 });
    body.addShape(new CANNON.Sphere(0.22));
    world.addBody(body);
    const box = (half: [number, number, number], pos: [number, number, number]) => {
      const staticBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(...pos) });
      staticBody.addShape(new CANNON.Box(new CANNON.Vec3(...half)));
      world.addBody(staticBody);
    };
    box([0.08, 1, d / 2], [-w / 2, 1, 0]);
    box([0.08, 1, d / 2], [w / 2, 1, 0]);
    box([w / 2, 1, 0.08], [0, 1, -d / 2]);
    box([w / 2, 1, 0.08], [0, 1, d / 2]);
    const bedW = Math.min(2.5, w * 0.56);
    const bedD = Math.min(1.9, d * 0.4);
    box([bedW / 2 + 0.1, 0.45, bedD / 2 + 0.1], [0, 0.45, -d / 2 + bedD / 2 + 0.42]);
    physics.current = { world, body };
    return () => { physics.current = null; };
  }, [w, d]);

  useEffect(() => {
    const canvas = gl.domElement;
    const keyDown = (event: KeyboardEvent) => keys.current.add(event.code);
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const pointerDown = (event: PointerEvent) => { dragging.current = true; last.current = { x: event.clientX, y: event.clientY }; };
    const pointerUp = () => { dragging.current = false; };
    const look = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - last.current.x;
      const dy = event.clientY - last.current.y;
      last.current = { x: event.clientX, y: event.clientY };
      const sensitivity = event.pointerType === 'touch' ? 0.0056 : 0.0042;
      yaw.current -= dx * sensitivity;
      pitch.current = clamp(pitch.current + dy * sensitivity * 0.34, -0.16, 0.28);
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointermove', look);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointermove', look);
    };
  }, [gl]);

  useFrame((_, dt) => {
    const physicsState = physics.current;
    if (!physicsState || !avatar.current) return;
    const z = (keys.current.has('KeyW') || move.forward ? 1 : 0) - (keys.current.has('KeyS') || move.back ? 1 : 0);
    const x = (keys.current.has('KeyD') || move.right ? 1 : 0) - (keys.current.has('KeyA') || move.left ? 1 : 0);
    const velocity = new THREE.Vector3(x, 0, -z);
    moving.current = THREE.MathUtils.damp(moving.current, velocity.length(), 9, dt);

    if (velocity.lengthSq()) {
      velocity.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      const walkSpeed = keys.current.has('ShiftLeft') ? 5.4 : 3.55;
      physicsState.body.velocity.x = velocity.x * walkSpeed;
      physicsState.body.velocity.z = velocity.z * walkSpeed;
      avatar.current.rotation.y = THREE.MathUtils.damp(avatar.current.rotation.y, Math.atan2(velocity.x, velocity.z), 12, dt);
    } else {
      physicsState.body.velocity.x *= 0.64;
      physicsState.body.velocity.z *= 0.64;
    }

    physicsState.body.velocity.y = 0;
    physicsState.world.step(1 / 60, Math.min(dt, 0.04), 2);
    avatar.current.position.set(physicsState.body.position.x, 0, physicsState.body.position.z);

    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    const target = new THREE.Vector3(physicsState.body.position.x, 1.05, physicsState.body.position.z);
    const distance = size.width < 760 ? Math.min(4.15, Math.max(3.45, d * 0.7)) : Math.min(4.7, Math.max(3.9, d * 0.68));
    const cameraY = clamp(1.72 + pitch.current * 0.85, 1.42, Math.max(1.5, h - 0.24));
    const desired = target.clone().addScaledVector(forward, -distance);
    desired.y = cameraY;
    desired.x = clamp(desired.x, -w / 2 + 0.18, w / 2 - 0.18);
    desired.z = clamp(desired.z, -d / 2 + 0.24, d / 2 + 1.7);

    const lookPoint = target.clone().addScaledVector(forward, size.width < 760 ? 1.65 : 1.9);
    lookPoint.y = clamp(1.24 + pitch.current * 0.6, 1.02, Math.max(1.2, h - 0.55));
    camera.position.lerp(desired, 1 - Math.exp(-dt * 7.5));
    camera.lookAt(lookPoint);
  });

  return <group ref={avatar}><Avatar moving={moving} /></group>;
}

export function GameScene({ w, d, h, air, mode, speed, move }: { w: number; d: number; h: number; air: Air; mode: Mode; speed: number; move: MoveState }) {
  return (
    <Canvas
      shadows
      dpr={[0.8, 1.25]}
      camera={{ fov: 68, near: 0.06, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.74;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={['#15100D']} />
      <fog attach="fog" args={['#15100D', 12, 26]} />
      <Env />
      <Room w={w} d={d} h={h} air={air} mode={mode} speed={speed} />
      <Third move={move} w={w} d={d} h={h} />
    </Canvas>
  );
}
