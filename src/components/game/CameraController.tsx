import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';

type CameraConfig = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
};

const CAMERA_PRESETS: Record<'desktop' | 'tablet' | 'mobile', Record<'top' | '3d', CameraConfig>> = {
  desktop: {
    top: {
      position: [0, 20, 0],
      target: [0, 0, 0],
      fov: 45,
      minDistance: 3,
      maxDistance: 35,
      minPolarAngle: 0,
      maxPolarAngle: 0,
    },
    '3d': {
      position: [14, 10, 14],
      target: [0, 1.5, 0],
      fov: 50,
      minDistance: 3,
      maxDistance: 32,
      minPolarAngle: Math.PI / 6,
      maxPolarAngle: Math.PI / 2.08,
    },
  },
  tablet: {
    top: {
      position: [0, 18, 0],
      target: [0, 0, 0],
      fov: 45,
      minDistance: 2.5,
      maxDistance: 30,
      minPolarAngle: 0,
      maxPolarAngle: 0,
    },
    '3d': {
      position: [12, 9, 12],
      target: [0, 1.5, 0],
      fov: 48,
      minDistance: 2.5,
      maxDistance: 28,
      minPolarAngle: Math.PI / 5,
      maxPolarAngle: Math.PI / 2.1,
    },
  },
  mobile: {
    top: {
      position: [0, 16, 0],
      target: [0, 0, 0],
      fov: 45,
      minDistance: 2,
      maxDistance: 25,
      minPolarAngle: 0,
      maxPolarAngle: 0,
    },
    '3d': {
      position: [10, 8, 10],
      target: [0, 1.5, 0],
      fov: 55,
      minDistance: 2,
      maxDistance: 24,
      minPolarAngle: Math.PI / 4,
      maxPolarAngle: Math.PI / 2.12,
    },
  },
};

export function CameraController({
  topView,
  deviceType = 'desktop',
}: {
  topView: boolean;
  deviceType?: 'desktop' | 'tablet' | 'mobile';
}) {
  const { camera } = useThree();
  const config = CAMERA_PRESETS[deviceType][topView ? 'top' : '3d'];

  useEffect(() => {
    camera.position.set(...config.position);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = config.fov;
    }
    camera.updateProjectionMatrix();
  }, [topView, deviceType, camera, config]);

  return null;
}
