'use client';

/**
 * EditorCanvas
 *
 * Hosts the `<Viewer>` component from `@pascal-app/viewer` (which already
 * wraps a R3F `<Canvas>`) and injects our own camera controls + tool layer
 * as children. The viewer internally renders with WebGPU when available
 * and falls back to WebGL2 otherwise.
 *
 * The wrapping `<div>` carries:
 *   • `absolute inset-0`  — fills its responsive shell
 *   • `touch-none`        — prevents the browser from hijacking pinch/pan
 *                           as page-zoom; multi-touch goes to OrbitControls
 *   • `select-none`       — no text selection during drag
 *   • `[overscroll-behavior:none]` — kills iOS pull-to-refresh while editing
 */

import { Viewer } from '@pascal-app/viewer';
import { Suspense } from 'react';

import EditorCameraControls from './EditorCameraControls';

interface EditorCanvasProps {
  /** Optional fallback while WebGPU initialises. */
  fallback?: React.ReactNode;
  /** Show the FPS overlay (dev-only). */
  perf?: boolean;
}

export default function EditorCanvas({ fallback = null, perf = false }: EditorCanvasProps) {
  return (
    <div
      className="absolute inset-0 z-0 touch-none select-none [overscroll-behavior:none]"
      // The viewer mounts its own <canvas> which inherits these props from the
      // wrapping div. `touch-action: none` is critical for two-finger pinch.
    >
      <Suspense fallback={fallback}>
        <Viewer perf={perf}>
          <EditorCameraControls />
        </Viewer>
      </Suspense>
    </div>
  );
}
