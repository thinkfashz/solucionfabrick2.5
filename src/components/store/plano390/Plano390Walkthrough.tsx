'use client';
/*
 * Plano390Walkthrough — recorrido 3D del "Proyecto №390-1" (127 m²):
 * intro estilo videojuego + escena HD (texturas reales de los visores) +
 * cámara primera persona con colisiones + recorrido guiado + Circuito CCTV
 * en modo Cine + HUD con minimapa y puntos de foto.
 */
import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { ACESFilmicToneMapping, PCFSoftShadowMap } from 'three';
import { PLAN } from '@/lib/plano390Data';
import Plano3903D from './Plano3903D';
import Plano390CameraRig, { input } from './Plano390CameraRig';
import type { Plano390Mode } from './Plano390CameraRig';
import Plano390Controls from './Plano390Controls';
import Plano390UI from './Plano390UI';

const INITIAL_CAM = { position: [7, PLAN.eyeH, 17.2] as [number, number, number], fov: 46, near: 0.05, far: 220 };

export default function Plano390Walkthrough() {
  const [stage, setStage] = useState<'intro' | 'ready' | 'in'>('intro');
  const [mode, setMode] = useState<Plano390Mode>('free');
  const [spot, setSpot] = useState<number | null>(null);
  const [light, setLight] = useState<'day' | 'sunset' | 'night'>('day');
  const [roomLabel, setRoomLabel] = useState('Exterior');
  const [cctvIndex, setCctvIndex] = useState(0);
  const [tourIndex, setTourIndex] = useState(0);

  const enter = () => {
    input.mode = 'free';
    input.spot = null;
    input.turn = 0;
    input.pitch = 0;
    input.lookDx = 0;
    input.move.x = 0;
    input.move.y = 0;
    setStage('in');
  };

  const changeMode = (m: Plano390Mode) => {
    input.mode = m;
    input.spot = null;
    input.turn = 0;
    input.pitch = 0;
    input.lookDx = 0;
    input.move.x = 0;
    input.move.y = 0;
    setSpot(null);
    setMode(m);
    if (m !== 'cctv') setCctvIndex(0);
    if (m === 'tour') setTourIndex(0);
  };

  const goSpot = (i: number) => {
    input.mode = 'free';
    setMode('free');
    input.spot = i;
    setSpot(i);
  };

  const closeSpot = () => {
    input.spot = null;
    setSpot(null);
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden select-none bg-[#020507] text-white">
      <div className={`absolute inset-0 ${stage === 'intro' ? 'invisible' : ''}`}>
        <Canvas
          shadows="soft"
          dpr={[1, 1.6]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ position: INITIAL_CAM.position, fov: INITIAL_CAM.fov, near: INITIAL_CAM.near, far: INITIAL_CAM.far }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.06;
            gl.shadowMap.type = PCFSoftShadowMap;
          }}
        >
          <Suspense fallback={null}>
            <Plano3903D light={light} />
            <Plano390CameraRig onRoom={setRoomLabel} onCctv={setCctvIndex} onTour={setTourIndex} />
          </Suspense>
        </Canvas>
      </div>
      {/* Gradiente cinematográfico superior/inferior */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(0,0,0,.55),transparent_22%,transparent_72%,rgba(0,0,0,.72))]" />
      <Plano390Controls mode={mode} onReset={() => setMode('free')} />
      {/* Selector de luz */}
      {stage === 'in' ? (
        <div className="absolute right-3 top-[70px] z-30 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/58 p-1 backdrop-blur-xl">
          {(['day', 'sunset', 'night'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setLight(m)}
              className={`rounded-xl px-2 py-1.5 text-[8px] font-black ${light === m ? 'bg-[#F6C64A] text-black' : 'text-white/55'}`}
            >
              {m === 'day' ? 'Día' : m === 'sunset' ? 'Atardecer' : 'Noche'}
            </button>
          ))}
        </div>
      ) : null}
      <Plano390UI
        stage={stage}
        onEnter={enter}
        mode={mode}
        onModeChange={changeMode}
        activeSpot={spot}
        onSpotChange={goSpot}
        roomLabel={roomLabel}
        onCloseSpot={closeSpot}
        cctvIndex={cctvIndex}
        tourIndex={tourIndex}
      />
    </div>
  );
}
