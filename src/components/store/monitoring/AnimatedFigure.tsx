'use client';

import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import { Group, AnimationAction, MeshStandardMaterial, TextureLoader, RepeatWrapping, SRGBColorSpace } from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect, useState } from 'react';

import {
  CharacterConfig,
  BehaviorState,
  createCharacterConfig,
  getInitialBehaviorState,
  updateBehavior,
  getAnimationForState,
  getHeadRotation,
  getBodyRotation,
  publishCharacterSnapshot,
  readPartnerSnapshot,
} from './CharacterBehavior';

export interface AnimatedFigureProps {
  playing: boolean;
  visualProgress: number;
  shakeIntensity: number;
  index: 0 | 1;
  config?: Partial<CharacterConfig>;
  /** Umbral de la puerta de ESTA casa [x, z]: es su resguardo durante el sismo. */
  houseDoor?: [number, number];
  /** Punto de resguardo alternativo (por defecto, el umbral de la puerta). */
  shelterPoint?: [number, number];
}

const TEXTURE_LOADER = new TextureLoader();

function loadClothingMaterial(): MeshStandardMaterial {
  const colorMap = TEXTURE_LOADER.load('/materials/wood-oak/color.png');
  const normalMap = TEXTURE_LOADER.load('/materials/wood-oak/normal.png');
  const roughnessMap = TEXTURE_LOADER.load('/materials/wood-oak/roughness.png');

  colorMap.wrapS = colorMap.wrapT = RepeatWrapping;
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
  roughnessMap.wrapS = roughnessMap.wrapT = RepeatWrapping;
  colorMap.repeat.set(2, 2);
  normalMap.repeat.set(2, 2);
  roughnessMap.repeat.set(2, 2);
  colorMap.colorSpace = SRGBColorSpace;

  return new MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughnessMap,
    roughness: 0.85,
    metalness: 0.05,
    normalScale: new THREE.Vector2(0.5, 0.5),
  });
}

function loadSkinMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: '#E8C4A0',
    roughness: 0.65,
    metalness: 0.05,
  });
}

export function AnimatedFigure({
  playing,
  visualProgress,
  shakeIntensity,
  index,
  config,
  houseDoor,
  shelterPoint,
}: AnimatedFigureProps) {
  const { scene: gltfScene, animations } = useGLTF('/models/ual-mannequin.glb');
  // Clon esqueleto por instancia: useGLTF cachea el mismo scene para todos los mounts.
  const scene = useMemo(() => skeletonClone(gltfScene), [gltfScene]);
  const { actions, mixer } = useAnimations(animations, scene);

  const groupRef = useRef<Group | null>(null);
  // Ojos y columna son HUESOS del esqueleto (Object3D), no mallas.
  const headRef = useRef<THREE.Object3D | null>(null);
  const spineRef = useRef<THREE.Object3D | null>(null);
  const currentClipRef = useRef<string>('');
  const headEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const spineEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const tmpQuat = useRef(new THREE.Quaternion());

  // Burbuja de diálogo: estado de React sólo cuando el mensaje cambia.
  const [bubble, setBubble] = useState<string | null>(null);
  const bubbleRef = useRef<string | null>(null);

  const characterConfig = useMemo(() => {
    const baseX = index === 0 ? -5.1 : 5.1;
    const baseZ = 6.5;
    const pathLength = 6 + Math.random() * 4;
    // Caminata humana 0.9–1.3 m/s (el sprint lo decide la FSM: 2.4–3 m/s).
    const walkSpeed = 0.9 + Math.random() * 0.4;
    const overrides: Partial<CharacterConfig> = { index, ...(config ?? {}) };
    if (houseDoor) overrides.homeDoor = houseDoor;
    if (shelterPoint) overrides.shelterPoint = shelterPoint;
    return createCharacterConfig([baseX, -0.13, baseZ], pathLength, walkSpeed, overrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los arrays inline sólo cambian por valor
  }, [index, houseDoor?.[0], houseDoor?.[1], shelterPoint?.[0], shelterPoint?.[1]]);

  const behaviorStateRef = useRef<BehaviorState>(
    getInitialBehaviorState(characterConfig)
  );

  const clothingMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const skinMaterialRef = useRef<MeshStandardMaterial | null>(null);

  useEffect(() => {
    clothingMaterialRef.current = loadClothingMaterial();
    skinMaterialRef.current = loadSkinMaterial();

    if (!groupRef.current) return;

    groupRef.current.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const name = obj.name.toLowerCase();
        const isSkin = name.includes('head') || name.includes('hand') || name.includes('arm') || name.includes('leg') || name.includes('foot');
        obj.material = isSkin ? skinMaterialRef.current! : clothingMaterialRef.current!;
        obj.material.needsUpdate = true;
      }
    });

    // Localizar los huesos de cabeza y columna (son Object3D, no mallas).
    let spineFallback: THREE.Object3D | null = null;
    scene.traverse((obj: THREE.Object3D) => {
      const name = obj.name.toLowerCase();
      if (name === 'head') headRef.current = obj;
      if (name.startsWith('spine')) {
        if (name === 'spine_02') spineRef.current = obj;
        else if (!spineFallback) spineFallback = obj;
      }
    });
    if (!spineRef.current) spineRef.current = spineFallback;
  }, [scene]);

  // Liberar el canal de coordinación al desmontar.
  useEffect(() => () => publishCharacterSnapshot(index, null), [index]);

  // --- Patrones iniciales de animación ---
  useEffect(() => {
    // Reproduce Idle_Loop al montarse (garantizado que actions existe despues de mount)
    const idleAction = actions['Idle_Loop'];
    if (idleAction) {
      idleAction.enabled = true;
      idleAction.play();
      idleAction.weight = 1;
      currentClipRef.current = 'Idle_Loop';
    }
  }, [actions]);

  const shakeValue = shakeIntensity || (playing ? visualProgress * 0.8 : 0);

  // Transiciones urgentes (empezar/pausar el sismo) sin esperar al siguiente frame.
  behaviorStateRef.current = updateBehavior(
    behaviorStateRef.current,
    characterConfig,
    0,
    playing,
    visualProgress,
    shakeValue
  );

  useFrame((_frame, delta) => {
    if (!groupRef.current || !mixer) return;

    // dt acotado: evita saltos tras perder foco la pestaña.
    const d = Math.min(Math.max(delta, 0), 0.1);
    const actionsMap = actions as Record<string, AnimationAction>;
    const availableAnimations = new Set(Object.keys(actionsMap));

    // 1) Comportamiento + navegación (FSM sobre refs, sin re-renders).
    const behaviorState = updateBehavior(
      behaviorStateRef.current,
      characterConfig,
      d,
      playing,
      visualProgress,
      shakeValue,
      readPartnerSnapshot(index)
    );
    behaviorStateRef.current = behaviorState;

    // 2) Publicar la instantánea para que el otro personaje se coordine.
    publishCharacterSnapshot(index, {
      state: behaviorState.currentState,
      x: behaviorState.position[0],
      z: behaviorState.position[2],
      destKey: behaviorState.destKey,
      moving: behaviorState.moving,
      crouch: behaviorState.crouchAmount,
    });

    // 3) Burbuja de diálogo: re-render de React sólo si el texto cambió.
    if (behaviorState.message !== bubbleRef.current) {
      bubbleRef.current = behaviorState.message;
      setBubble(behaviorState.message);
    }

    // 4) Mezcla de animaciones con crossfade.
    const animInfo = getAnimationForState(behaviorState, availableAnimations);
    const targetClip = animInfo.clip;

    if (targetClip !== currentClipRef.current) {
      // actions es la fuente de verdad: cada clip tiene su AnimationAction.
      const newAction = actionsMap[targetClip] ?? null;
      const oldAction = actionsMap[currentClipRef.current] ?? null;
      if (newAction && oldAction && oldAction !== newAction) {
        newAction.enabled = true;
        newAction.play();
        oldAction.crossFadeTo(newAction, animInfo.crossFadeDuration, true);
      } else if (newAction) {
        newAction.enabled = true;
        newAction.play();
        newAction.weight = 1;
      }
      currentClipRef.current = targetClip;
    }

    const currentAction = actionsMap[currentClipRef.current];
    if (currentAction) {
      currentAction.enabled = true;
      currentAction.timeScale = animInfo.speed;
      currentAction.weight = THREE.MathUtils.lerp(currentAction.weight, animInfo.weight, d * 5);
    }

    // 5) Avance del mixer ANTES de aplicar gestos (si no, los sobrescribe).
    mixer.update(d);

    // 6) Posición y orientación del cuerpo (2D con steering).
    groupRef.current.position.set(
      behaviorState.position[0] + behaviorState.sway[0],
      characterConfig.position[1] - behaviorState.crouchAmount * 0.4,
      behaviorState.position[2] + behaviorState.sway[1]
    );
    groupRef.current.rotation.y = behaviorState.yaw;

    // 7) Gestos: se suman a la animación multiplicando el cuaternión.
    if (headRef.current) {
      const [headX, headY, headZ] = getHeadRotation(behaviorState, shakeValue);
      headEuler.current.set(headX, headY, headZ, 'YXZ');
      headRef.current.quaternion.multiply(tmpQuat.current.setFromEuler(headEuler.current));
    }

    if (spineRef.current) {
      const [bodyX, bodyY, bodyZ] = getBodyRotation(behaviorState, shakeValue);
      spineEuler.current.set(bodyX, bodyY, bodyZ, 'YXZ');
      spineRef.current.quaternion.multiply(tmpQuat.current.setFromEuler(spineEuler.current));
    }
  });

  return (
    <group
      ref={groupRef}
      position={characterConfig.position}
      scale={1}
      rotation={[0, Math.PI, 0]}
    >
      <primitive object={scene} dispose={null} />
      {bubble ? (
        // Burbuja discreta sobre la cabeza; hereda el desplazamiento del grupo
        // (inclinación por agachado, balanceo), sin re-renders adicionales.
        <Html center distanceFactor={9} position={[0, 2.02, 0]} zIndexRange={[40, 0]} className="pointer-events-none select-none">
          <div className="w-max whitespace-nowrap rounded-full border border-white/10 bg-black/70 px-2 py-1 text-center text-[7px] font-bold text-white/85 shadow-lg">
            {bubble}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

useGLTF.preload('/models/ual-mannequin.glb');
