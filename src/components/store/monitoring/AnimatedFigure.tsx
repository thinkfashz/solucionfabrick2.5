'use client';

import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Group, AnimationAction, LoopRepeat, Mesh, MeshStandardMaterial, TextureLoader, RepeatWrapping, SRGBColorSpace } from 'three';
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';

import {
  CharacterState,
  CharacterConfig,
  BehaviorState,
  createCharacterConfig,
  getInitialBehaviorState,
  updateBehavior,
  getAnimationForState,
  getHeadRotation,
  getBodyRotation,
} from './CharacterBehavior';

export interface AnimatedFigureProps {
  playing: boolean;
  visualProgress: number;
  shakeIntensity: number;
  index: 0 | 1;
  config?: Partial<CharacterConfig>;
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
    normalMap: normalMap,
    roughnessMap: roughnessMap,
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

const ANIMATION_CLIPS = [
  'Idle_Loop',
  'Idle_Talking_Loop',
  'Walk_Loop',
  'Jog_Fwd_Loop',
  'Crouch_Idle_Loop',
  'Crouch_Fwd_Loop',
] as const;

export function AnimatedFigure({
  playing,
  visualProgress,
  shakeIntensity,
  index,
  config,
}: AnimatedFigureProps) {
  const { scene: gltfScene, animations } = useGLTF('/models/ual-mannequin.glb');
  // Clon esqueleto por instancia: useGLTF cachea el mismo scene para todos los mounts.
  const scene = useMemo(() => skeletonClone(gltfScene), [gltfScene]);
  const { actions, mixer } = useAnimations(animations, scene);

  const groupRef = useRef<Group | null>(null);
  const headRef = useRef<Group | null>(null);
  const spineRef = useRef<Group | null>(null);
  const actionRefs = useRef<Record<string, AnimationAction | null>>({});
  const currentClipRef = useRef<string>('');

  const characterConfig = useMemo(() => {
    const baseX = index === 0 ? -5.1 : 5.1;
    const baseZ = 6.5;
    const pathLength = 6 + Math.random() * 4;
    const walkSpeed = 0.9 + Math.random() * 0.6;
    return createCharacterConfig(
      [baseX, -0.13, baseZ],
      pathLength,
      walkSpeed
    );
  }, [index]);

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
  }, []);

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
  behaviorStateRef.current = updateBehavior(
    behaviorStateRef.current,
    characterConfig,
    0, // delta no usado en efecto; se actualiza en useFrame
    playing,
    visualProgress,
    shakeValue
  );

  useFrame((state, delta) => {
    if (!groupRef.current || !mixer) return;

    const actionsMap = actions as Record<string, AnimationAction>;
    const availableAnimations = new Set(Object.keys(actionsMap));

    const newState = updateBehavior(
      behaviorStateRef.current,
      characterConfig,
      delta,
      playing,
      visualProgress,
      shakeValue
    );
    behaviorStateRef.current = newState;

    const { currentState, currentX, crouchAmount } = behaviorStateRef.current;
    const animInfo = getAnimationForState(behaviorStateRef.current, availableAnimations);
    const targetClip = animInfo.clip;

    if (targetClip !== currentClipRef.current) {
      const newAction = actionRefs.current[targetClip];
      const oldAction = actionRefs.current[currentClipRef.current];
      if (newAction && oldAction && oldAction !== newAction) {
        oldAction.crossFadeTo(newAction, 0.3, true);
      } else if (newAction) {
        newAction.enabled = true;
        newAction.play();
        newAction.weight = 1;
      }
      currentClipRef.current = targetClip;
    }

    const currentAction = actionRefs.current[currentClipRef.current];
    if (currentAction) {
      currentAction.timeScale = animInfo.speed;
      if (currentState === 'earthquake' || currentState === 'recovery') {
        currentAction.weight = THREE.MathUtils.lerp(currentAction.weight, crouchAmount, delta * 5);
      } else {
        currentAction.weight = THREE.MathUtils.lerp(currentAction.weight, 1, delta * 5);
      }
    }

    const { targetX } = behaviorStateRef.current;

    if (currentState === 'walk') {
      groupRef.current.position.x = currentX;
      const direction = behaviorStateRef.current.targetX > currentX ? 1 : -1;
      groupRef.current.rotation.y = Math.PI + (direction > 0 ? 0 : Math.PI);
    }

    if (headRef.current) {
      const [headX, headY, headZ] = getHeadRotation(behaviorStateRef.current, shakeValue);
      headRef.current.rotation.set(headX, headY, headZ);
    }

    if (spineRef.current) {
      const [bodyX, bodyY, bodyZ] = getBodyRotation(behaviorStateRef.current, shakeValue);
      spineRef.current.rotation.set(bodyX, bodyY, bodyZ);
    }

    const crouchOffset = -crouchAmount * 0.4;
    groupRef.current.position.y = characterConfig.position[1] + crouchOffset;

    mixer.update(delta);
  });

  scene.traverse((obj: any) => {
    if (obj.isMesh) {
      if (obj.name.toLowerCase().includes('head') && !obj.name.includes('hair')) {
        headRef.current = obj;
      }
      if (obj.name.toLowerCase().includes('spine') || obj.name.toLowerCase().includes('chest') || obj.name.toLowerCase().includes('torso')) {
        spineRef.current = obj;
      }
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
    </group>
  );
}

useGLTF.preload('/models/ual-mannequin.glb');