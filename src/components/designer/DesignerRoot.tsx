'use client';

/**
 * DesignerRoot — Shell del Ecosistema de Diseño Bimodal (2D/3D).
 *
 * Layout:
 *   [SidebarCatalog]  [Canvas + Toolbar + Watermark]  [PropertyInspector]
 *
 * El mismo `<Canvas>` se usa en ambos modos: cuando `viewMode==='2D'`
 * montamos una cámara ortográfica desde +Y para una vista cenital tipo
 * plano técnico (con grilla blanca en negro); en `'3D'` usamos cámara
 * `PerspectiveCamera` + `Environment` HDR + `ContactShadows` para vista
 * "modelo real". Toda la geometría se lee del mismo store, por lo que el
 * cambio entre modos es instantáneo y sin pérdida de estado.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Grid,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import {
  Box as BoxIcon,
  CloudUpload,
  Layers,
  Loader2,
  Square,
  Trash2,
} from 'lucide-react';
import * as THREE from 'three';
import { useDesignStore } from '@/store/useDesignStore';
import { SidebarCatalog } from './SidebarCatalog';
import { PropertyInspector } from './PropertyInspector';
import { SceneElements } from './SceneElements';
import { DimensionLines } from './DimensionLines';
import { Watermark } from './Watermark';
import { captureCanvasThumbnail, saveDesign } from '@/lib/designerPersistence';

interface SaveStatus {
  state: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
}

export default function DesignerRoot() {
  const viewMode = useDesignStore((s) => s.viewMode);
  const setViewMode = useDesignStore((s) => s.setViewMode);
  const reset = useDesignStore((s) => s.reset);
  const setSelected = useDesignStore((s) => s.setSelected);
  const dirty = useDesignStore((s) => s.dirty);
  const clearDirty = useDesignStore((s) => s.clearDirty);
  const elementos = useDesignStore((s) => s.elementos);

  const [titulo, setTitulo] = useState('Diseño sin título');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [save, setSaveStatus] = useState<SaveStatus>({ state: 'idle' });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ---- Auto-save con debounce ----------------------------------------
  // En cuanto `dirty=true`, esperamos 3 s antes de persistir. Cada nuevo
  // cambio reinicia el timer.
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(async () => {
      setSaveStatus({ state: 'saving' });
      try {
        const blob = await captureCanvasThumbnail(canvasRef.current);
        const result = await saveDesign({
          id: projectId,
          titulo,
          elementos,
          thumbnail: blob,
        });
        setProjectId(result.id);
        clearDirty();
        setSaveStatus({ state: 'saved' });
      } catch (err) {
        setSaveStatus({
          state: 'error',
          message: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    }, 3000);
    return () => window.clearTimeout(t);
  }, [dirty, projectId, titulo, elementos, clearDirty]);

  return (
    <div className="fixed inset-0 grid grid-cols-[18rem_1fr_18rem] bg-zinc-950 text-zinc-200">
      <SidebarCatalog />

      <main className="relative h-full">
        {/* Toolbar superior */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-yellow-400/10 bg-zinc-900/85 px-3 py-2 backdrop-blur-md">
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-56 bg-transparent font-serif text-sm tracking-wide text-zinc-100 outline-none placeholder:text-zinc-500"
              placeholder="Diseño sin título"
              aria-label="Título del proyecto"
            />
            <SaveBadge status={save} />
          </div>

          <div className="pointer-events-auto inline-flex overflow-hidden rounded-lg border border-yellow-400/20 bg-zinc-900/85 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setViewMode('2D')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-widest transition ${
                viewMode === '2D'
                  ? 'bg-yellow-400/15 text-yellow-400'
                  : 'text-zinc-300 hover:bg-zinc-800/70'
              }`}
            >
              <Square className="h-3.5 w-3.5" /> Plano técnico
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3D')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-widest transition ${
                viewMode === '3D'
                  ? 'bg-yellow-400/15 text-yellow-400'
                  : 'text-zinc-300 hover:bg-zinc-800/70'
              }`}
            >
              <BoxIcon className="h-3.5 w-3.5" /> Modelo real
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (
                  elementos.length > 0 &&
                  !window.confirm('¿Limpiar todo el diseño?')
                )
                  return;
                reset();
              }}
              className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/85 px-3 py-2 text-xs text-zinc-300 backdrop-blur-md transition hover:border-rose-500/60 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpiar
            </button>
            <span className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/85 px-3 py-2 text-xs text-zinc-300 backdrop-blur-md">
              <Layers className="h-3.5 w-3.5 text-yellow-400" />
              {elementos.length} pieza{elementos.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <Canvas
          shadows
          onCreated={({ gl }) => {
            // Permite capturar el canvas como PNG (toBlob) tras render.
            canvasRef.current = gl.domElement;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
          }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          dpr={[1, 1.75]}
          onPointerMissed={() => setSelected(null)}
          className="h-full w-full"
        >
          {viewMode === '3D' ? (
            <PerspectiveCamera makeDefault position={[6, 5, 7]} fov={45} />
          ) : (
            <OrthographicCamera
              makeDefault
              position={[0, 20, 0]}
              zoom={50}
              up={[0, 0, -1]}
              near={-100}
              far={200}
            />
          )}

          {/* Iluminación de lujo */}
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[8, 12, 6]}
            intensity={1.1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-6, 4, -3]} intensity={0.4} />

          {/* Grilla del plano (mm fina, m gruesa) */}
          <Grid
            position={[0, 0.001, 0]}
            args={[40, 40]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor={viewMode === '2D' ? '#6b7280' : '#3f3f46'}
            sectionSize={1}
            sectionThickness={1.2}
            sectionColor={viewMode === '2D' ? '#facc15' : '#a16207'}
            fadeDistance={viewMode === '2D' ? 60 : 30}
            fadeStrength={1}
            infiniteGrid
            followCamera={false}
          />

          <SceneElements />
          <DimensionLines />

          {/* Lujo visual sólo en 3D */}
          {viewMode === '3D' && (
            <Suspense fallback={null}>
              <Environment preset="city" />
              <ContactShadows
                position={[0, 0.005, 0]}
                opacity={0.55}
                scale={30}
                blur={2.4}
                far={6}
                resolution={512}
                color="#000000"
              />
            </Suspense>
          )}

          <OrbitControls
            makeDefault
            enableRotate={viewMode === '3D'}
            enablePan
            enableZoom
            minPolarAngle={viewMode === '2D' ? 0 : 0.05}
            maxPolarAngle={viewMode === '2D' ? 0 : Math.PI / 2 - 0.05}
          />
        </Canvas>

        <Watermark />
      </main>

      <PropertyInspector />
    </div>
  );
}

function SaveBadge({ status }: { status: SaveStatus }) {
  if (status.state === 'idle') return null;
  if (status.state === 'saving')
    return (
      <span className="ml-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-yellow-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Guardando…
      </span>
    );
  if (status.state === 'saved')
    return (
      <span className="ml-2 flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-400">
        <CloudUpload className="h-3 w-3" /> Guardado
      </span>
    );
  return (
    <span
      className="ml-2 text-[10px] uppercase tracking-widest text-rose-400"
      title={status.message}
    >
      Error
    </span>
  );
}
