'use client';
/*
 * Plano390CameraRig — cámara primera persona del plano "Proyecto №390-1".
 * • Modo libre: WASD/flechas + Q/E combinados con el estado táctil `input`
 *   (mismo patrón que MetalconWalkRig), con colisiones eje a eje contra WALLS
 *   (incluye tramos window:true = vidrio) y límites del lote.
 * • Modo tour: sigue TOUR_STOPS en bucle, lerp de posición hacia cada parada
 *   (1,6 m/s, smoothstep) + look suavizado, espera 1,5 s entre paradas.
 * • Spot de foto: si `input.spot` está activo, tween one-shot (~1,4 s) hacia
 *   PHOTO_SPOTS[spot] y luego libera `input.spot`.
 * • `input` es estado de módulo mutable compartido con Plano390Controls:
 *   se muta, jamás se reemplaza.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Vector3 } from 'three';
import { PHOTO_SPOTS, PLAN, ROOMS, TOUR_STOPS, WALLS } from '@/lib/plano390Data';
import type { PhotoSpot, WallSeg } from '@/lib/plano390Data';

export type Plano390Input = {
  move: { x: number; y: number };
  turn: number;
  mode: 'free' | 'tour';
  spot: number | null;
};

/** Estado compartido rig ↔ controls (mutar campos, no reasignar). */
export const input: Plano390Input = { move: { x: 0, y: 0 }, turn: 0, mode: 'free', spot: null };

const PLAYER_R = 0.3;
const WALK_SPEED = 2.6; // m/s
const TURN_SPEED = 2.0; // rad/s a giro completo
const TOUR_SPEED = 1.6; // m/s entre paradas
const TOUR_WAIT = 1.5; // s de espera por parada
const SPOT_DURATION = 1.4; // s del tween de foto
const ROOM_TICK = 0.5; // s entre chequeos de habitación
const BOUNDS = { x0: -3.2, x1: 17.2, z0: -4.6, z1: 15.6 };
const TAU = Math.PI * 2;

type SpotTween = { idx: number; t: number; pos0: Vector3; look0: Vector3 };
type CellBox = { x0: number; z0: number; x1: number; z1: number };

const wrapAngle = (a: number): number => {
  let v = a;
  while (v > Math.PI) v -= TAU;
  while (v < -Math.PI) v += TAU;
  return v;
};

const smooth = (u: number): number => u * u * (3 - 2 * u);
const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

export default function Plano390CameraRig({ onRoom }: { onRoom?: (room: string) => void }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const stopIndex = useRef(0);
  const wait = useRef(0);
  const prevMode = useRef<'free' | 'tour' | null>(null);
  const spotTween = useRef<SpotTween | null>(null);
  const lookPt = useRef(new Vector3());
  const vA = useRef(new Vector3()); // posición objetivo (tour / spot)
  const vB = useRef(new Vector3()); // mirada objetivo (tour / spot)
  const vC = useRef(new Vector3()); // scratch: dirección o look interpolado
  const roomTimer = useRef(0);
  const lastRoom = useRef<string | null>(null);

  // Cajas de colisión: cada muro (ventana incluida) expandido por el radio del jugador.
  const boxes = useMemo<CellBox[]>(
    () =>
      WALLS.map((w: WallSeg) => ({
        x0: w.x0 - PLAYER_R,
        z0: w.z0 - PLAYER_R,
        x1: w.x1 + PLAYER_R,
        z1: w.z1 + PLAYER_R,
      })),
    [],
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const blocked = (x: number, z: number): boolean => {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return true;
    }
    return false;
  };

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const mode: 'free' | 'tour' = input.mode === 'tour' ? 'tour' : 'free';

    // Transición de modo: parte desde la pose actual (el lerp lleva al primer stop).
    if (prevMode.current !== mode) {
      prevMode.current = mode;
      if (mode === 'free') {
        yaw.current = wrapAngle(camera.rotation.y);
      } else {
        camera.getWorldDirection(vC.current);
        lookPt.current.copy(camera.position).addScaledVector(vC.current, 2);
        wait.current = 0;
      }
    }

    // ── Spot de foto (one-shot, ignora move/turn mientras anima) ──
    const idx = input.spot;
    const spot: PhotoSpot | undefined = idx !== null ? PHOTO_SPOTS[idx] : undefined;
    if (idx !== null) {
      if (spot) {
        if (spotTween.current === null || spotTween.current.idx !== idx) {
          camera.getWorldDirection(vC.current);
          spotTween.current = {
            idx,
            t: 0,
            pos0: camera.position.clone(),
            look0: camera.position.clone().addScaledVector(vC.current, 2),
          };
        }
        const tw = spotTween.current;
        if (tw) {
          tw.t += delta;
          const u = Math.min(1, tw.t / SPOT_DURATION);
          vA.current.set(spot.pos[0], spot.pos[1], spot.pos[2]);
          vB.current.set(spot.look[0], spot.look[1], spot.look[2]);
          camera.position.lerpVectors(tw.pos0, vA.current, smooth(u));
          vC.current.lerpVectors(tw.look0, vB.current, smooth(u));
          camera.lookAt(vC.current);
          if (u >= 1 || camera.position.distanceTo(vA.current) < 0.05) {
            camera.position.copy(vA.current);
            camera.lookAt(vB.current);
            yaw.current = wrapAngle(camera.rotation.y);
            input.spot = null;
            spotTween.current = null;
          }
        }
      } else {
        input.spot = null; // índice fuera de rango: limpiar
        spotTween.current = null;
      }
    }

    const spotActive = spotTween.current !== null;

    if (!spotActive) {
      if (mode === 'tour') {
        const n = TOUR_STOPS.length;
        const stop = n > 0 ? TOUR_STOPS[stopIndex.current % n] : undefined;
        if (stop) {
          vA.current.set(stop.pos[0], stop.pos[1], stop.pos[2]);
          vB.current.set(stop.look[0], stop.look[1], stop.look[2]);
          const d = camera.position.distanceTo(vA.current);
          if (d > 0.02) {
            const step = Math.min(1, (TOUR_SPEED * delta) / Math.max(d, 0.0001));
            camera.position.lerp(vA.current, smooth(step));
          } else {
            camera.position.copy(vA.current);
            wait.current += delta;
            if (wait.current >= TOUR_WAIT) {
              wait.current = 0;
              stopIndex.current = (stopIndex.current + 1) % n;
            }
          }
          lookPt.current.lerp(vB.current, Math.min(1, delta * 3));
          camera.lookAt(lookPt.current);
        }
      } else {
        // ── Modo libre: teclado + joystick analógico, colisión eje a eje ──
        const k = keys.current;
        const kF = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
        const kS = (k.d ? 1 : 0) - (k.a ? 1 : 0);
        const kT = (k.q || k.arrowleft ? -1 : 0) + (k.e || k.arrowright ? 1 : 0);
        const f = clamp1(kF + input.move.y);
        const side = clamp1(kS + input.move.x);
        const turn = clamp1(kT + input.turn);

        yaw.current = wrapAngle(yaw.current - turn * delta * TURN_SPEED);
        const speed = WALK_SPEED * delta;
        const sy = Math.sin(yaw.current);
        const cy = Math.cos(yaw.current);
        const px = camera.position.x;
        const pz = camera.position.z;
        const mx = (sy * f + cy * side) * speed; // dir·f + right·side
        const mz = (-cy * f + sy * side) * speed;

        let nx = px;
        let nz = pz;
        if (mx !== 0 && !blocked(px + mx, pz)) nx = px + mx; // eje X primero (desliza)
        if (mz !== 0 && !blocked(nx, pz + mz)) nz = pz + mz; // luego eje Z

        camera.position.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, nx));
        camera.position.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, nz));
        camera.position.y = PLAN.eyeH;
        camera.rotation.set(0, yaw.current, 0, 'YXZ');
      }
    }

    // ── Habitación actual (máx. cada 0,5 s) ──
    roomTimer.current += rawDelta;
    if (roomTimer.current >= ROOM_TICK) {
      roomTimer.current = 0;
      let name = 'Exterior';
      for (let i = 0; i < ROOMS.length; i++) {
        const r = ROOMS[i];
        if (
          camera.position.x >= r.x0 &&
          camera.position.x <= r.x1 &&
          camera.position.z >= r.z0 &&
          camera.position.z <= r.z1
        ) {
          name = r.name;
          break;
        }
      }
      if (lastRoom.current !== name) {
        lastRoom.current = name;
        onRoom?.(name);
      }
    }
  });

  return null;
}
