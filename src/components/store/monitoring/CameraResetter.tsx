'use client';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

const INITIAL_CAMERA: [number, number, number] = [0, 6.4, 17.5];
const INITIAL_TARGET: [number, number, number] = [0, 1.1, 0];

export default function CameraResetter({ nonce }: { nonce: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void } | null;
  useEffect(() => {
    if (nonce === 0) return;
    camera.position.set(INITIAL_CAMERA[0], INITIAL_CAMERA[1], INITIAL_CAMERA[2]);
    camera.updateProjectionMatrix();
    if (controls?.target) {
      controls.target.set(INITIAL_TARGET[0], INITIAL_TARGET[1], INITIAL_TARGET[2]);
      controls.update?.();
    }
  }, [nonce, camera, controls]);
  return null;
}
