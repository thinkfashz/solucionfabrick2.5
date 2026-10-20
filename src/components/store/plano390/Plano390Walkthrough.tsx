'use client';
/*
 * Plano390Walkthrough — recorrido 3D del "Proyecto №390-1" (148 m²):
 * intro estilo videojuego + escena HD (texturas reales de los visores) +
 * cámara primera persona con colisiones + recorrido guiado + Circuito CCTV
 * en modo Cine + menú plegable, ficha del tour con miniatura y puntos de foto.
 */
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { ACESFilmicToneMapping, PCFSoftShadowMap, PerspectiveCamera } from 'three';
import type { WebGLRenderer } from 'three';
import { PLAN, SCENES } from '@/lib/plano390Data';
import type { SceneView } from '@/lib/plano390Data';
import Plano3903D from './Plano3903D';
import Plano390CameraRig, { cine, input } from './Plano390CameraRig';
import type { Plano390Mode } from './Plano390CameraRig';
import Plano390Controls from './Plano390Controls';
import Plano390UI from './Plano390UI';
import Plano390RotateHint from './Plano390RotateHint';

const INITIAL_CAM = { position: [7, PLAN.eyeH, 17.2] as [number, number, number], fov: 62, near: 0.05, far: 220 };

// La cámara se configura UNA vez dentro del Canvas. Si se pasa la prop
// `camera` al Canvas, R3F la reaplica en cada render y cualquier cambio de
// estado (rótulo de ambiente, luz, escena) devuelve la vista al exterior.
// Ver error 025 de la skill.
function CameraBootstrap({ scene }: { scene: SceneView | null }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    if (scene) {
      camera.position.set(scene.pos[0], scene.pos[1], scene.pos[2]);
      camera.lookAt(scene.look[0], scene.look[1], scene.look[2]);
    } else {
      camera.position.set(INITIAL_CAM.position[0], INITIAL_CAM.position[1], INITIAL_CAM.position[2]);
      camera.lookAt(7, 1.35, 6);
    }
    if (camera instanceof PerspectiveCamera) {
      camera.fov = INITIAL_CAM.fov;
      camera.near = INITIAL_CAM.near;
      camera.far = INITIAL_CAM.far;
      camera.updateProjectionMatrix();
    }
  }, [camera, scene]);
  return null;
}

const setupCanvas = ({ gl }: { gl: WebGLRenderer }) => {
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 0.92;
  gl.shadowMap.type = PCFSoftShadowMap;
};

export default function Plano390Walkthrough() {
  const [stage, setStage] = useState<'intro' | 'ready' | 'in'>('intro');
  const [mode, setMode] = useState<Plano390Mode>('free');
  const [spot, setSpot] = useState<number | null>(null);
  const [light, setLight] = useState<'day' | 'sunset' | 'night'>('day');
  const [lightsOn, setLightsOn] = useState(true);
  const [openHouse, setOpenHouse] = useState(false);
  const [showHands, setShowHands] = useState(true);
  const [roomLabel, setRoomLabel] = useState('Exterior');
  const [cctvIndex, setCctvIndex] = useState(0);
  const [tourIndex, setTourIndex] = useState(0);
  const [initialScene, setInitialScene] = useState<SceneView | null>(null);
  const [planView, setPlanView] = useState(false);

  /**
   * Enlace directo para revisión visual y para compartir una vista:
   *   ?vista=living | cocina | tv | despensa …   (entra sin pasar por la intro)
   *   &luz=night | sunset                       (estado de iluminación)
   *   &manos=0                                  (oculta el cuerpo en primera persona)
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const vista = params.get('vista');
    if (!vista) return;
    const scene = SCENES.find(
      (s) => s.id === vista || s.label.toLowerCase() === vista.toLowerCase(),
    );
    const luz = params.get('luz');
    if (luz === 'sunset' || luz === 'night' || luz === 'day') setLight(luz);
    if (params.get('manos') === '0') setShowHands(false);
    input.mode = 'free';
    input.spot = null;
    setInitialScene(scene ?? null);
    setPlanView(scene?.id === 'plano');
    setMode('free');
    setStage('in');
  }, []);

  const enter = () => {
    input.mode = 'free';
    input.spot = null;
    input.turn = 0;
    input.pitch = 0;
    input.lookDx = 0;
    input.move.x = 0;
    input.move.y = 0;
    setPlanView(false);
    setStage('in');
  };

  const changeMode = (m: Plano390Mode) => {
    const wasPlan = planView;
    setPlanView(false);
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
    // Salir del plano con "Libre" devuelve al living; si no, quedaría
    // caminando a la altura de ojos desde el jardín sur.
    if (wasPlan && m === 'free') {
      const living = SCENES.find((s) => s.id === 'living');
      if (living) input.jump = { pos: living.pos, look: living.look };
    }
  };

  const goSpot = (i: number) => {
    input.mode = 'free';
    input.jump = null;
    setPlanView(false);
    setMode('free');
    input.spot = i;
    setSpot(i);
  };

  const closeSpot = () => {
    input.spot = null;
    setSpot(null);
  };

  /** Salto directo a una cámara desde el panel de miniaturas. */
  const goCctv = (i: number) => {
    setPlanView(false);
    if (mode !== 'cctv') {
      input.mode = 'cctv';
      input.spot = null;
      input.turn = 0;
      input.pitch = 0;
      input.move.x = 0;
      input.move.y = 0;
      setSpot(null);
      setMode('cctv');
    }
    cine.index = i;
    cine.jump = true;
    setCctvIndex(i);
  };

  /** Salto directo a una escena desde el selector inferior. */
  const goScene = (scene: SceneView) => {
    input.mode = 'free';
    input.spot = null;
    input.turn = 0;
    input.pitch = 0;
    input.lookDx = 0;
    input.move.x = 0;
    input.move.y = 0;
    input.jump = { pos: scene.pos, look: scene.look };
    setPlanView(scene.id === 'plano');
    setSpot(null);
    setMode('free');
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden select-none bg-[#020507] text-white">
      <div className={`absolute inset-0 ${stage === 'intro' ? 'invisible' : ''}`}>
        <Canvas shadows="soft" dpr={[1, 1.6]} onCreated={setupCanvas}>
          <CameraBootstrap scene={initialScene} />
          <Suspense fallback={null}>
            <Plano3903D
              light={light}
              lightsOn={lightsOn}
              openHouse={openHouse}
              showHands={showHands && mode !== 'cctv' && !planView}
              showNpc={mode === 'free' && !planView}
              planView={planView}
              autoDoors={mode === 'tour'}
            />
            <Plano390CameraRig
              initialScene={initialScene}
              planView={planView}
              onRoom={setRoomLabel}
              onCctv={setCctvIndex}
              onTour={setTourIndex}
            />
          </Suspense>
        </Canvas>
      </div>
      {/* Gradiente cinematográfico superior/inferior (liviano, no tapa la vista) */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(0,0,0,.38),transparent_15%,transparent_80%,rgba(0,0,0,.58))]" />
      {!planView ? (
        <Plano390Controls
          mode={mode}
          onReset={() => {
            const livingScene = SCENES.find((s) => s.id === 'living');
            if (livingScene) input.jump = livingScene;
          }}
        />
      ) : null}
      <Plano390UI
        stage={stage}
        onEnter={enter}
        mode={mode}
        onModeChange={changeMode}
        activeSpot={spot}
        onSpotChange={goSpot}
        roomLabel={planView ? 'Plano 3D' : roomLabel}
        onCloseSpot={closeSpot}
        onScene={goScene}
        cctvIndex={cctvIndex}
        tourIndex={tourIndex}
        lightsOn={lightsOn}
        onToggleLights={() => setLightsOn((v) => !v)}
        openHouse={openHouse}
        onToggleOpen={() => setOpenHouse((v) => !v)}
        showHands={showHands}
        onToggleHands={() => setShowHands((v) => !v)}
        onCctvSelect={goCctv}
        light={light}
        onLightChange={setLight}
      />
      <Plano390RotateHint enabled={stage === 'in' && !planView} />
    </div>
  );
}
