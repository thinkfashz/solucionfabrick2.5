'use client';
/*
* Plano390Walkthrough — recorrido 3D del "Proyecto №390-1" (127 m²):
* intro estilo videojuego + escena completa (Plano3903D) + cámara/rig de
* primera persona con colisiones (Plano390CameraRig) + HUD (Plano390UI).
* El Canvas se monta desde el inicio (tras la intro, invisible) para
* precargar geometría y el GLB del muñeco animado.
*/
import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { PLAN } from '@/lib/plano390Data';
import Plano3903D from './Plano3903D';
import Plano390CameraRig from './Plano390CameraRig';
import { input } from './Plano390CameraRig';
import Plano390Controls from './Plano390Controls';
import Plano390UI from './Plano390UI';

const INITIAL_CAM = { position: [7, PLAN.eyeH, 17.2], fov: 46, near: 0.05, far: 220 };

export default function Plano390Walkthrough() {
  const [stage, setStage] = useState<'intro' | 'ready' | 'in'>('intro');
  const [mode, setMode] = useState<'free' | 'tour'>('free');
  const [spot, setSpot] = useState<number | null>(null);
  const [light, setLight] = useState<'day' | 'sunset' | 'night'>('day');
  const [roomLabel, setRoomLabel] = useState('Exterior');

  const enter = () => {
    input.mode = 'free';
    input.spot = null;
    input.turn = 0;
    input.move.x = 0;
    input.move.y = 0;
    setStage('in');
  };

  const changeMode = (m: 'free' | 'tour') => {
    input.mode = m;
    input.spot = null;
    setSpot(null);
    setMode(m);
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
          shadows
          dpr={[1, 1.55]}
          camera={{ position: INITIAL_CAM.position, fov: INITIAL_CAM.fov, near: INITIAL_CAM.near, far: INITIAL_CAM.far }}
        >
          <Suspense fallback={null}>
            <Plano3903D light={light} />
            <Plano390CameraRig onRoom={setRoomLabel} />
          </Suspense>
        </Canvas>
      </div>
      {/* Gradiente cinematográfico superior/inferior */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.55),transparent_22%,transparent_72%,rgba(0,0,0,.72))]" />
      <Plano390Controls mode={mode} onReset={() => setMode('free')} />
      {/* Selector de luz como en el Lab Metalcon */}
      {stage === 'in' ? (
        <div className="absolute right-3 top-[70px] z-30 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-black/58 p-1 backdrop-blur-xl">
          {(['day', 'sunset', 'night'] as const).map(m => (
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
      />
    </div>
  );
}
