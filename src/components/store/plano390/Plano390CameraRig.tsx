'use client';
/*
 * Plano390CameraRig — cámara del recorrido "Proyecto №390-1".
 * • Modo libre: WASD/flechas + joysticks analógicos con suavizado (aceleración
 *   y giro), pitch (mirar arriba/abajo), Sprint con Shift y colisiones AABB
 *   eje a eje contra WALLS (los tramos de vidrio también bloquean).
 * • Modo tour: dolly cinematográfico por TOUR_STOPS en bucle (2,0 m/s con
 *   aceleración en tramos largos, espera 1,8 s, mirada suavizada, respiración
 *   de cámara y roll sutil).
 * • Modo CCTV (Cine): recorre el circuito CCTV_CAMERAS cada 7 s con corte
 *   suavizado, ligero sway de cámara de seguridad y FOV propio.
 * • Spot de foto: tween one-shot hacia PHOTO_SPOTS[spot].
 * • Touch: `lookDx` lo escribe el overlay de arrastre y se consume 1 vez/frame.
 * `input` y `cine` son estado de módulo mutable compartido con los controles.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { BLOCKERS, CCTV_CAMERAS, PHOTO_SPOTS, PLAN, ROOMS, TOUR_STOPS, WALLS } from '@/lib/plano390Data';
import type { CctvCamera, PhotoSpot, WallSeg } from '@/lib/plano390Data';

export type Plano390Mode = 'free' | 'tour' | 'cctv';

export type Plano390Input = {
  move: { x: number; y: number };
  turn: number;
  pitch: number;
  /** Giro acumulado por arrastre táctil (rad); el rig lo consume y lo pone a 0. */
  lookDx: number;
  /** Salto directo a una escena del selector inferior. */
  jump: { pos: [number, number, number]; look: [number, number, number] } | null;
  mode: Plano390Mode;
  spot: number | null;
};

/** Estado compartido rig ↔ controls (mutar campos, no reasignar). */
export const input: Plano390Input = {
  move: { x: 0, y: 0 },
  turn: 0,
  pitch: 0,
  lookDx: 0,
  jump: null,
  mode: 'free',
  spot: null,
};

/** Estado del circuito CCTV (índice visible + salto manual). */
export const cine = { index: 0, jump: false };

export function nextCctv(): void {
  cine.index = (cine.index + 1) % CCTV_CAMERAS.length;
  cine.jump = true;
}

const PLAYER_R = 0.3;
const WALK_SPEED = 2.9; // m/s
const SPRINT_MULT = 1.6;
const TURN_SPEED = 2.1; // rad/s a giro completo
const PITCH_MAX = 0.52; // rad (~30°)
const TOUR_SPEED = 2.0;
const TOUR_WAIT = 1.8;
const SPOT_DURATION = 1.4;
const SCENE_DURATION = 1.15;
const ROOM_TICK = 0.5;
const CCTV_TIME = 7; // s por cámara
const CCTV_BLEND = 1.1; // s de transición entre cámaras
/** La cámara virtual se adelanta fuera de la carcasa para no ver el lente. */
const CCTV_OFFSET = 0.36;
const BASE_FOV = 46;
const TOUR_FOV = 49;
const BOUNDS = { x0: -3.2, x1: 18.2, z0: -4.8, z1: 20.5 };
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

export default function Plano390CameraRig({
  onRoom,
  onCctv,
  onTour,
}: {
  onRoom?: (room: string) => void;
  onCctv?: (index: number) => void;
  onTour?: (index: number) => void;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const moveSm = useRef({ x: 0, y: 0 });
  const turnSm = useRef(0);
  const bob = useRef(0);
  const stopIndex = useRef(0);
  const wait = useRef(0);
  const prevMode = useRef<Plano390Mode | null>(null);
  const spotTween = useRef<SpotTween | null>(null);
  const lookPt = useRef(new Vector3());
  const vA = useRef(new Vector3());
  const vB = useRef(new Vector3());
  const vC = useRef(new Vector3());
  const roomTimer = useRef(0);
  const lastRoom = useRef<string | null>(null);
  const cctvTimer = useRef(0);
  const cctvBlend = useRef(0);
  const cctvPrevPos = useRef(new Vector3());
  const cctvPrevLook = useRef(new Vector3());
  const cctvDir = useRef(new Vector3(0, 0, -1));
  const jumpTarget = useRef<{ pos: [number, number, number]; look: [number, number, number] } | null>(null);

  const boxes = useMemo<CellBox[]>(() => {
    const house = WALLS.map((w: WallSeg) => ({
      x0: w.x0 - PLAYER_R,
      z0: w.z0 - PLAYER_R,
      x1: w.x1 + PLAYER_R,
      z1: w.z1 + PLAYER_R,
    }));
    // Volúmenes de muebles grandes y auto del garaje.
    const extra: CellBox[] = BLOCKERS.map((b) => ({
      x0: b.x0 - PLAYER_R,
      z0: b.z0 - PLAYER_R,
      x1: b.x1 + PLAYER_R,
      z1: b.z1 + PLAYER_R,
    }));
    return [...house, ...extra];
  }, []);

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

  const setFov = (fov: number) => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  };

  const startCctv = (idx: number) => {
    const cam: CctvCamera | undefined = CCTV_CAMERAS[idx % CCTV_CAMERAS.length];
    if (!cam) return;
    cctvDir.current
      .set(cam.look[0] - cam.pos[0], cam.look[1] - cam.pos[1], cam.look[2] - cam.pos[2])
      .normalize();
    camera.getWorldDirection(vC.current);
    cctvPrevPos.current.copy(camera.position);
    cctvPrevLook.current.copy(camera.position).addScaledVector(vC.current, 2.5);
    cctvTimer.current = 0;
    cctvBlend.current = 0;
    cine.index = idx % CCTV_CAMERAS.length;
    cine.jump = false;
    setFov(cam.fov);
    onCctv?.(cine.index);
  };

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const mode: Plano390Mode = input.mode;
    const prev = prevMode.current;

    if (prev !== mode) {
      // Al entrar a tour/CCTV se cancela cualquier salto o foto en curso.
      if (mode === 'tour' || mode === 'cctv') {
        spotTween.current = null;
        jumpTarget.current = null;
        input.jump = null;
        input.spot = null;
      }
      if (prev === 'cctv' || prev === 'tour') {
        setFov(BASE_FOV);
        pitch.current = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, camera.rotation.x));
      }
      if (mode === 'free') {
        yaw.current = wrapAngle(camera.rotation.y);
        pitch.current = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, camera.rotation.x));
        turnSm.current = 0;
        camera.rotation.z = 0;
      } else if (mode === 'tour') {
        const first = TOUR_STOPS[0];
        stopIndex.current = 0;
        wait.current = 0;
        setFov(TOUR_FOV);
        // Corte cinematográfico al inicio: arranca ya en la primera parada.
        if (first) {
          camera.position.set(first.pos[0], first.pos[1], first.pos[2]);
          vB.current.set(first.look[0], first.look[1], first.look[2]);
          camera.lookAt(vB.current);
          lookPt.current.copy(vB.current);
        }
        onTour?.(0);
      } else {
        startCctv(0);
      }
      prevMode.current = mode;
    }

    // ── Salto a escena desde el selector inferior ──
    if (input.jump) {
      const j = input.jump;
      input.jump = null;
      jumpTarget.current = j;
      camera.getWorldDirection(vC.current);
      spotTween.current = {
        idx: -1,
        t: 0,
        pos0: camera.position.clone(),
        look0: camera.position.clone().addScaledVector(vC.current, 2),
      };
    }

    // ── Spot de foto (one-shot) ──
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
            pitch.current = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, camera.rotation.x));
            input.spot = null;
            spotTween.current = null;
          }
        }
      } else {
        input.spot = null;
        spotTween.current = null;
      }
    }

    // ── Tween del salto a escena (idx −1) ──
    if (spotTween.current?.idx === -1 && jumpTarget.current) {
      const tw = spotTween.current;
      tw.t += delta;
      const u = Math.min(1, tw.t / SCENE_DURATION);
      vA.current.set(jumpTarget.current.pos[0], jumpTarget.current.pos[1], jumpTarget.current.pos[2]);
      vB.current.set(jumpTarget.current.look[0], jumpTarget.current.look[1], jumpTarget.current.look[2]);
      camera.position.lerpVectors(tw.pos0, vA.current, smooth(u));
      vC.current.lerpVectors(tw.look0, vB.current, smooth(u));
      camera.lookAt(vC.current);
      if (u >= 1) {
        camera.position.copy(vA.current);
        camera.lookAt(vB.current);
        vC.current.copy(vB.current).sub(camera.position).normalize();
        yaw.current = Math.atan2(-vC.current.x, -vC.current.z);
        pitch.current = Math.max(
          -PITCH_MAX,
          Math.min(PITCH_MAX, Math.asin(Math.max(-1, Math.min(1, vC.current.y)))),
        );
        spotTween.current = null;
        jumpTarget.current = null;
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
          const dist = camera.position.distanceTo(vA.current);
          // Tramos largos van más rápido para no eternizar el recorrido.
          const speed = TOUR_SPEED * (1 + Math.min(1.4, dist / 10));
          const travel = speed * delta;
          if (dist > Math.max(travel, 0.02)) {
            // Velocidad constante real: avanza `travel` metros por frame.
            camera.position.lerp(vA.current, travel / dist);
            wait.current = 0;
          } else {
            camera.position.copy(vA.current);
            wait.current += delta;
            if (wait.current >= TOUR_WAIT) {
              wait.current = 0;
              stopIndex.current = (stopIndex.current + 1) % n;
              onTour?.(stopIndex.current);
            }
          }
          // Mirada suave con adelanto: el encuadre llega antes que el cuerpo.
          lookPt.current.lerp(vB.current, Math.min(1, delta * 2.2));
          camera.lookAt(lookPt.current);
          // Respiración de cámara humana (sin desplazar el dolly) y roll mínimo.
          camera.rotateY(Math.sin(t * 0.62) * 0.006);
          camera.rotateX(Math.sin(t * 1.15) * 0.004);
          camera.rotateZ(Math.sin(t * 0.38) * 0.0045);
        }
      } else if (mode === 'cctv') {
        // ── Circuito CCTV (Cine) ──
        if (cine.jump && cctvBlend.current > 0.35) {
          startCctv(cine.index);
        }
        const n = CCTV_CAMERAS.length;
        const cam: CctvCamera | undefined = CCTV_CAMERAS[cine.index % n];
        if (cam) {
          cctvTimer.current += delta;
          cctvBlend.current = Math.min(1, cctvBlend.current + delta / CCTV_BLEND);
          const t = cctvTimer.current;
          // Cámara virtual adelantada fuera de la carcasa (evita ver el lente).
          vA.current
            .set(cam.pos[0], cam.pos[1], cam.pos[2])
            .addScaledVector(cctvDir.current, CCTV_OFFSET);
          // Sway sutil de cámara de seguridad (posición y encuadre).
          vA.current.x += Math.sin(t * 0.53) * 0.006;
          vA.current.y += Math.sin(t * 0.71 + 1.3) * 0.004;
          vA.current.z += Math.cos(t * 0.43) * 0.005;
          vB.current.set(
            cam.look[0] + Math.sin(t * 0.37 + 0.7) * 0.03,
            cam.look[1] + Math.cos(t * 0.49) * 0.02,
            cam.look[2] + Math.sin(t * 0.31 + 2.1) * 0.03,
          );
          const k = smooth(cctvBlend.current);
          camera.position.lerpVectors(cctvPrevPos.current, vA.current, k);
          lookPt.current.lerpVectors(cctvPrevLook.current, vB.current, k);
          camera.lookAt(lookPt.current);
          if (cctvTimer.current >= CCTV_TIME) {
            startCctv((cine.index + 1) % n);
          }
        }
      } else {
        // ── Modo libre: teclado + joysticks, suavizado y sprint ──
        const k = keys.current;
        const kF = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
        const kS = (k.d ? 1 : 0) - (k.a ? 1 : 0);
        const kT = (k.q || k.arrowleft ? -1 : 0) + (k.e || k.arrowright ? 1 : 0);
        const targetF = clamp1(kF + input.move.y);
        const targetS = clamp1(kS + input.move.x);
        const targetT = clamp1(kT + input.turn);
        const sprint = k.shift ? SPRINT_MULT : 1;

        // Suavizado de entrada (aceleración/deceleración de juego).
        const accel = Math.min(1, delta * 11);
        moveSm.current.x += (targetS - moveSm.current.x) * accel;
        moveSm.current.y += (targetF - moveSm.current.y) * accel;
        turnSm.current += (targetT - turnSm.current) * Math.min(1, delta * 9);

        // Giro por arrastre táctil (se acumula y se consume una vez por frame).
        if (input.lookDx !== 0) {
          yaw.current = wrapAngle(yaw.current + input.lookDx);
          input.lookDx = 0;
        }
        yaw.current = wrapAngle(yaw.current - turnSm.current * delta * TURN_SPEED);
        const pitchTarget = clamp1(input.pitch) * PITCH_MAX;
        pitch.current += (pitchTarget - pitch.current) * Math.min(1, delta * 8);

        const speed = WALK_SPEED * sprint * delta;
        const sy = Math.sin(yaw.current);
        const cy = Math.cos(yaw.current);
        const px = camera.position.x;
        const pz = camera.position.z;
        const f = moveSm.current.y;
        const side = moveSm.current.x;
        const mx = (sy * f + cy * side) * speed;
        const mz = (-cy * f + sy * side) * speed;

        let nx = px;
        let nz = pz;
        if (mx !== 0 && !blocked(px + mx, pz)) nx = px + mx;
        if (mz !== 0 && !blocked(nx, pz + mz)) nz = pz + mz;

        camera.position.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, nx));
        camera.position.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, nz));

        // Bobbing de caminata muy sutil (sensación de primera persona).
        const bobAmt = Math.min(1, Math.hypot(mx, mz) * 24);
        bob.current += rawDelta * (sprint > 1 ? 12 : 9.5) * bobAmt;
        camera.position.y = PLAN.eyeH + Math.sin(bob.current) * 0.016 * bobAmt;
        camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
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
