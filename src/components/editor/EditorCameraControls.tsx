'use client';

/**
 * EditorCameraControls
 *
 * Drei `<OrbitControls>` configured for unified mouse + touch handling.
 *
 * Mouse (desktop pointer):
 *   • Left button  → ROTATE
 *   • Middle/wheel → DOLLY (zoom)
 *   • Right button → PAN
 *
 * Touch (coarse pointer):
 *   • One finger   → ROTATE (drag)
 *   • Two fingers  → DOLLY + PAN (pinch + slide)
 *
 * The control is automatically disabled while the user is using a drawing
 * tool (wall, door, …) so the drag creates geometry instead of orbiting the
 * camera. When the editor is back to `select` mode, controls re-enable.
 *
 * Damping is enabled with a small dampingFactor for smooth touch deceleration.
 * Polar angle is clamped just below the horizon to prevent the camera from
 * passing through the ground plane.
 */

import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

import useEditor from './store/useEditor';

interface EditorCameraControlsProps {
  /** Override min camera distance (defaults to 1m). */
  minDistance?: number;
  /** Override max camera distance (defaults to 500m). */
  maxDistance?: number;
}

export default function EditorCameraControls({
  minDistance = 1,
  maxDistance = 500,
}: EditorCameraControlsProps) {
  const ref = useRef<OrbitControlsImpl | null>(null);
  const tool = useEditor((s) => s.tool);
  const setInteracting = useEditor((s) => s.setInteracting);
  const invalidate = useThree((s) => s.invalidate);

  // Only `select` lets the camera orbit. Any drawing tool freezes the camera
  // so the gesture is consumed by the tool's own pointer handlers.
  const enabled = tool === 'select';

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;

    const onStart = () => setInteracting(true);
    const onEnd = () => setInteracting(false);
    const onChange = () => invalidate();

    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    controls.addEventListener('change', onChange);
    return () => {
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.removeEventListener('change', onChange);
    };
  }, [setInteracting, invalidate]);

  return (
    <OrbitControls
      ref={ref}
      enabled={enabled}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      zoomSpeed={0.8}
      panSpeed={0.9}
      rotateSpeed={0.9}
      minDistance={minDistance}
      maxDistance={maxDistance}
      // Don't let the camera dip under the floor.
      maxPolarAngle={Math.PI / 2 - 0.05}
      // Mouse mapping (desktop)
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      // Touch mapping (mobile / tablet)
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}
