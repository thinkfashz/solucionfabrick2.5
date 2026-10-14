'use client';

import { useGLTF, useAnimations } from '@react-three/drei';
import { Group, AnimationAction, LoopRepeat, Clock } from 'three';
import { useFrame } from '@react-three/fiber';
import type { RefObject } from 'react';

export interface AnimatedFigureProps {
  playing: boolean;
  position?: [number, number, number];
  scale?: number;
  pathLength?: number;
  speed?: number;
}

const WALK_CLIP = 'Walk_Loop';
const CROUCH_CLIP = 'Crouch_Idle_Loop';
const IDLE_CLIP = 'Idle_Loop';

export function AnimatedFigure({ playing, position = [0, 0, 6.5], scale = 1, pathLength = 16, speed = 1.2 }: AnimatedFigureProps) {
  const { scene, animations } = useGLTF('/models/ual-mannequin.glb');
  const { actions, mixer } = useAnimations(animations, scene);

  const groupRef: RefObject<Group | null> = { current: null };
  const walkActionRef: RefObject<AnimationAction | null> = { current: null };
  const crouchActionRef: RefObject<AnimationAction | null> = { current: null };
  const idleActionRef: RefObject<AnimationAction | null> = { current: null };
  const phaseRef = { current: 0 };

  useFrame((state: { clock: Clock }, delta: number) => {
    if (!groupRef.current) return;

    if (!walkActionRef.current) {
      walkActionRef.current = actions[WALK_CLIP] ?? null;
      crouchActionRef.current = actions[CROUCH_CLIP] ?? null;
      idleActionRef.current = actions[IDLE_CLIP] ?? null;
      if (walkActionRef.current) {
        walkActionRef.current.setLoop(LoopRepeat, Infinity);
        walkActionRef.current.play();
      }
      if (idleActionRef.current) {
        idleActionRef.current.setLoop(LoopRepeat, Infinity);
      }
      if (crouchActionRef.current) {
        crouchActionRef.current.setLoop(LoopRepeat, Infinity);
      }
    }

    const walkAction = walkActionRef.current;
    const crouchAction = crouchActionRef.current;
    const idleAction = idleActionRef.current;

    if (!walkAction || !crouchAction || !idleAction) return;

    if (playing) {
      if (crouchAction.weight < 0.99) {
        crouchAction.enabled = true;
        crouchAction.crossFadeFrom(idleAction, 0.4, true);
        crouchAction.crossFadeFrom(walkAction, 0.4, true);
      }
      walkAction.enabled = false;
      idleAction.enabled = false;
      crouchAction.weight = 1;
    } else {
      if (walkAction.weight < 0.99) {
        walkAction.enabled = true;
        walkAction.crossFadeFrom(crouchAction, 0.5, true);
        walkAction.crossFadeFrom(idleAction, 0.5, true);
      }
      crouchAction.enabled = false;
      idleAction.enabled = false;
      walkAction.weight = 1;
    }

    if (!playing && walkAction.enabled) {
      const dt = delta * speed;
      phaseRef.current += dt;
      const period = pathLength / speed;
      const t = (phaseRef.current % period) / period;
      const x = -pathLength / 2 + t * pathLength;
      if (groupRef.current) groupRef.current.position.x = x;
      if (t > 0.995 && phaseRef.current > period) phaseRef.current = 0;
    }

    if (mixer) mixer.update(delta);
  });

  scene.traverse((obj: any) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (!obj.userData.__originalMaterial) {
        obj.userData.__originalMaterial = obj.material;
        obj.material = obj.material.clone();
        obj.material.color.set('#2a2c2e');
        obj.material.roughness = 0.7;
        obj.material.metalness = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale} rotation={[0, Math.PI, 0]}>
      <primitive object={scene} dispose={null} />
    </group>
  );
}

useGLTF.preload('/models/ual-mannequin.glb');