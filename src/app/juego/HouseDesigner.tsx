'use client';

/**
 * HouseDesigner — Diseñador 3D interactivo del plano de una casa.
 *
 * Sustituye al Tetris previo. El usuario toca celdas en una grilla 10×10 (a
 * 1 m por celda) para colocar paneles modulares con altura ajustable de 0 a
 * 6 m. Soporta vista plano (cenital) y vista 3D inmersiva con OrbitControls
 * touch-enabled, y un slider para cambiar la altura del panel seleccionado.
 *
 * - Persistencia en localStorage: `fabrick-house-design-v1`
 * - "Cotizar este diseño" empuja todos los paneles al QuoteCart como ítems
 *   tipo `panel` y redirige a /cotizaciones.
 */

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft,
  Trash2,
  Undo2,
  Box,
  Square,
  Send,
  RotateCw,
  Layers,
  Wand2,
} from 'lucide-react';
import { useQuoteCart } from '@/context/QuoteCartContext';

/* -------------------------------------------------------------------------- */
/*  Configuración                                                             */
/* -------------------------------------------------------------------------- */

const GRID_SIZE = 10; // 10×10 m
const CELL = 1; // 1 m por celda
const MIN_HEIGHT = 0.5;
const MAX_HEIGHT = 6;
const STORAGE_KEY = 'fabrick-house-design-v1';

interface PanelType {
  id: string;
  name: string;
  color: string;
  refPrice: number; // CLP por m²
  description: string;
}

const PANEL_TYPES: PanelType[] = [
  {
    id: 'metalcon',
    name: 'Muro Metalcon',
    color: '#facc15',
    refPrice: 38000,
    description: 'Estructura ligera galvanizada, ideal para tabiques estructurales.',
  },
  {
    id: 'sip',
    name: 'Panel SIP aislado',
    color: '#10b981',
    refPrice: 52000,
    description: 'Panel sándwich con núcleo de poliestireno. Alta aislación térmica.',
  },
  {
    id: 'volcanita',
    name: 'Tabique Volcanita',
    color: '#a78bfa',
    refPrice: 22000,
    description: 'Divisorio liviano para ambientes interiores.',
  },
  {
    id: 'window',
    name: 'Muro con ventana',
    color: '#38bdf8',
    refPrice: 65000,
    description: 'Incluye vano para ventana doble vidrio termopanel.',
  },
  {
    id: 'door',
    name: 'Muro con puerta',
    color: '#f97316',
    refPrice: 78000,
    description: 'Estructura con vano para puerta más marco.',
  },
  {
    id: 'concrete',
    name: 'Muro hormigón',
    color: '#94a3b8',
    refPrice: 95000,
    description: 'Hormigón armado para estructuras portantes.',
  },
];

const PANEL_BY_ID = Object.fromEntries(PANEL_TYPES.map((p) => [p.id, p])) as Record<string, PanelType>;

interface Panel {
  id: string;
  /** posición en celda 0..GRID_SIZE-1 */
  x: number;
  z: number;
  height: number;
  typeId: string;
}

/* -------------------------------------------------------------------------- */
/*  Persistence                                                               */
/* -------------------------------------------------------------------------- */

interface Persisted {
  version: 1;
  panels: Panel[];
}

function loadPersisted(): Panel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Persisted;
    if (parsed?.version === 1 && Array.isArray(parsed.panels)) {
      return parsed.panels.filter(
        (p) =>
          typeof p?.x === 'number' &&
          typeof p?.z === 'number' &&
          typeof p?.height === 'number' &&
          typeof p?.typeId === 'string',
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

function savePersisted(panels: Panel[]) {
  if (typeof window === 'undefined') return;
  try {
    const payload: Persisted = { version: 1, panels };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/*  3D Components                                                             */
/* -------------------------------------------------------------------------- */

function Floor({
  onCellClick,
  selectedTypeColor,
}: {
  onCellClick: (x: number, z: number) => void;
  selectedTypeColor: string;
}) {
  const half = (GRID_SIZE * CELL) / 2;
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const { point } = e;
    // World coordinates → cell indices (0..GRID_SIZE-1)
    const x = Math.floor(point.x + half);
    const z = Math.floor(point.z + half);
    if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE) return;
    onCellClick(x, z);
  };

  return (
    <group>
      {/* Click target plane */}
      <mesh
        position={[0, 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        receiveShadow
      >
        <planeGeometry args={[GRID_SIZE * CELL, GRID_SIZE * CELL]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
      </mesh>

      {/* Visible grid */}
      <Grid
        args={[GRID_SIZE * CELL, GRID_SIZE * CELL]}
        position={[0, 0.005, 0]}
        cellColor="#facc15"
        cellSize={CELL}
        cellThickness={0.6}
        sectionColor={selectedTypeColor}
        sectionSize={CELL * 5}
        sectionThickness={1.4}
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Boundary frame */}
      <mesh position={[0, 0.01, -half]}>
        <boxGeometry args={[GRID_SIZE * CELL + 0.04, 0.04, 0.04]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 0.01, half]}>
        <boxGeometry args={[GRID_SIZE * CELL + 0.04, 0.04, 0.04]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-half, 0.01, 0]}>
        <boxGeometry args={[0.04, 0.04, GRID_SIZE * CELL]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[half, 0.01, 0]}>
        <boxGeometry args={[0.04, 0.04, GRID_SIZE * CELL]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function PanelMesh({
  panel,
  selected,
  onSelect,
}: {
  panel: Panel;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const half = (GRID_SIZE * CELL) / 2;
  const wx = panel.x - half + CELL / 2;
  const wz = panel.z - half + CELL / 2;
  const type = PANEL_BY_ID[panel.typeId] ?? PANEL_TYPES[0];

  return (
    <group position={[wx, panel.height / 2, wz]}>
      <mesh
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(panel.id);
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CELL * 0.95, panel.height, CELL * 0.95]} />
        <meshStandardMaterial
          color={type.color}
          emissive={selected ? type.color : '#000000'}
          emissiveIntensity={selected ? 0.4 : 0}
          roughness={0.6}
          metalness={0.2}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* Outline when selected */}
      {selected && (
        <mesh>
          <boxGeometry args={[CELL * 1.0, panel.height + 0.04, CELL * 1.0]} />
          <meshBasicMaterial color="#facc15" wireframe />
        </mesh>
      )}
    </group>
  );
}

function CameraController({ topView }: { topView: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    if (topView) {
      camera.position.set(0, 18, 0.001);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(11, 9, 11);
      camera.lookAt(0, 0, 0);
    }
  }, [topView, camera]);
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export default function HouseDesigner() {
  const router = useRouter();
  const { addPanels } = useQuoteCart();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTypeId, setActiveTypeId] = useState<string>(PANEL_TYPES[0].id);
  const [defaultHeight, setDefaultHeight] = useState(2.4);
  const [topView, setTopView] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const undoRef = useRef<Panel[][]>([]);

  // Load persisted on mount
  useEffect(() => {
    setPanels(loadPersisted());
  }, []);

  // Persist on change
  useEffect(() => {
    savePersisted(panels);
  }, [panels]);

  const pushUndo = (next: Panel[]) => {
    undoRef.current.push(panels);
    if (undoRef.current.length > 30) undoRef.current.shift();
    setPanels(next);
  };

  const handleCellClick = (x: number, z: number) => {
    // Toggle: if a panel exists at (x,z), remove it; else add one.
    const existing = panels.find((p) => p.x === x && p.z === z);
    if (existing) {
      pushUndo(panels.filter((p) => p.id !== existing.id));
      if (selectedId === existing.id) setSelectedId(null);
      return;
    }
    const id = `pn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const newPanel: Panel = {
      id,
      x,
      z,
      height: defaultHeight,
      typeId: activeTypeId,
    };
    pushUndo([...panels, newPanel]);
    setSelectedId(id);
  };

  const undo = () => {
    const prev = undoRef.current.pop();
    if (prev) setPanels(prev);
  };

  const clearAll = () => {
    if (panels.length === 0) return;
    if (!confirm('¿Borrar todo el diseño?')) return;
    undoRef.current.push(panels);
    setPanels([]);
    setSelectedId(null);
  };

  const updateSelectedHeight = (h: number) => {
    if (!selectedId) return;
    const clamped = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h));
    setPanels((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, height: clamped } : p)),
    );
  };

  const updateSelectedType = (typeId: string) => {
    if (!selectedId) {
      setActiveTypeId(typeId);
      return;
    }
    setPanels((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, typeId } : p)),
    );
  };

  const summary = useMemo(() => {
    const map = new Map<
      string,
      { type: PanelType; count: number; m2: number; refSubtotal: number }
    >();
    for (const p of panels) {
      const type = PANEL_BY_ID[p.typeId] ?? PANEL_TYPES[0];
      const m2 = CELL * p.height; // panel face area (one cell × height in metres)
      const entry = map.get(type.id) ?? {
        type,
        count: 0,
        m2: 0,
        refSubtotal: 0,
      };
      entry.count += 1;
      entry.m2 += m2;
      entry.refSubtotal += m2 * type.refPrice;
      map.set(type.id, entry);
    }
    return Array.from(map.values());
  }, [panels]);

  const totalRefM2 = summary.reduce((s, x) => s + x.m2, 0);

  const handleQuote = () => {
    if (panels.length === 0) {
      alert('Aún no has colocado paneles. Haz tap en la grilla para empezar.');
      return;
    }
    const items = summary.map((s) => ({
      title: `${s.type.name} (${s.count} panel${s.count === 1 ? '' : 'es'})`,
      description: s.type.description,
      quantity: Math.max(1, Math.round(s.m2 * 10) / 10),
      unit: 'm²',
      refPrice: s.type.refPrice,
      meta: {
        Tipo: s.type.name,
        Paneles: String(s.count),
        Superficie: `${s.m2.toFixed(1)} m²`,
      },
    }));
    addPanels(items);
    router.push('/cotizaciones');
  };

  const selectedPanel = selectedId
    ? panels.find((p) => p.id === selectedId) ?? null
    : null;
  const activeType = PANEL_BY_ID[activeTypeId] ?? PANEL_TYPES[0];

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between gap-2 px-3 md:px-6 py-3 border-b border-white/5 bg-zinc-950/95 backdrop-blur-xl z-20">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 hover:text-yellow-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Volver</span>
        </button>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-yellow-400">
            Diseñador 4D
          </p>
          <h1 className="text-xs md:text-sm font-black uppercase tracking-[0.18em] text-white">
            Plano de tu casa
          </h1>
        </div>
        <button
          type="button"
          onClick={handleQuote}
          className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full bg-yellow-400 text-black text-[10px] font-black uppercase tracking-[0.18em] hover:bg-white transition-colors shadow-[0_0_18px_rgba(250,204,21,0.4)]"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cotizar diseño</span>
          <span className="sm:hidden">Cotizar</span>
        </button>
      </header>

      {/* 3D canvas */}
      <div className="flex-1 relative">
        <Canvas
          shadows
          camera={{ position: [11, 9, 11], fov: 45 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.75]}
        >
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 18, 45]} />
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 14, 8]}
            intensity={0.9}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-8, 6, -8]} intensity={0.25} color="#c9a96e" />
          <CameraController topView={topView} />
          <Suspense fallback={null}>
            <Floor
              onCellClick={handleCellClick}
              selectedTypeColor={activeType.color}
            />
            {panels.map((p) => (
              <PanelMesh
                key={p.id}
                panel={p}
                selected={p.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </Suspense>
          <OrbitControls
            enablePan={!topView}
            enableRotate={!topView}
            enableZoom
            enableDamping
            dampingFactor={0.08}
            minDistance={4}
            maxDistance={28}
            maxPolarAngle={topView ? 0 : Math.PI / 2.05}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN,
            }}
          />
        </Canvas>

        {/* Floating top-right toolbar */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            type="button"
            onClick={() => setTopView((v) => !v)}
            aria-label="Cambiar vista"
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-yellow-400/20 border border-white/10 hover:border-yellow-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-yellow-400 transition-all shadow-lg"
          >
            {topView ? <Box className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={undo}
            aria-label="Deshacer"
            disabled={undoRef.current.length === 0}
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-yellow-400/20 border border-white/10 hover:border-yellow-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-yellow-400 transition-all shadow-lg disabled:opacity-40"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={clearAll}
            aria-label="Limpiar"
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-red-300 transition-all shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowCatalog((v) => !v)}
            aria-label="Catálogo de paneles"
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-yellow-400/20 border border-white/10 hover:border-yellow-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-yellow-400 transition-all shadow-lg lg:hidden"
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>

        {/* Top-left mode badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-[0.22em]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: activeType.color, boxShadow: `0 0 8px ${activeType.color}` }}
          />
          <span className="text-white">{topView ? 'Plano' : '3D'}</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-300">{panels.length} paneles</span>
        </div>

        {/* Side catalog (desktop) */}
        <aside className="hidden lg:flex absolute top-16 left-3 bottom-3 w-64 rounded-2xl bg-zinc-950/90 border border-white/10 backdrop-blur-md overflow-y-auto z-10 flex-col">
          <PanelCatalog
            activeTypeId={activeTypeId}
            onSelect={updateSelectedType}
            selectedPanelExists={!!selectedPanel}
          />
        </aside>

        {/* Mobile catalog drawer */}
        {showCatalog && (
          <aside className="lg:hidden absolute top-16 right-3 left-3 max-h-[70vh] rounded-2xl bg-zinc-950/95 border border-white/10 backdrop-blur-md overflow-y-auto z-10">
            <PanelCatalog
              activeTypeId={activeTypeId}
              onSelect={(id) => {
                updateSelectedType(id);
                setShowCatalog(false);
              }}
              selectedPanelExists={!!selectedPanel}
            />
          </aside>
        )}

        {/* Bottom controls / inspector */}
        <div
          className="absolute left-0 right-0 bottom-0 px-3 pb-3 pt-2 bg-gradient-to-t from-black via-black/85 to-transparent z-10"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {selectedPanel ? (
            <div className="rounded-2xl bg-zinc-950/95 border border-yellow-400/30 backdrop-blur-md p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
                    Panel seleccionado
                  </p>
                  <p className="text-white text-sm font-bold">
                    {(PANEL_BY_ID[selectedPanel.typeId] ?? PANEL_TYPES[0]).name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    pushUndo(panels.filter((p) => p.id !== selectedPanel.id));
                    setSelectedId(null);
                  }}
                  aria-label="Eliminar panel"
                  className="w-9 h-9 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-300 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 w-14">
                  Altura
                </span>
                <input
                  type="range"
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  step={0.1}
                  value={selectedPanel.height}
                  onChange={(e) => updateSelectedHeight(parseFloat(e.target.value))}
                  className="flex-1 accent-yellow-400 h-2"
                  aria-label="Altura del panel en metros"
                />
                <span className="text-yellow-400 font-black text-sm tabular-nums w-16 text-right">
                  {selectedPanel.height.toFixed(1)} m
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-zinc-950/85 border border-white/10 backdrop-blur-md p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Wand2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-zinc-300 text-xs truncate">
                    Toca la grilla para colocar paneles. {totalRefM2.toFixed(1)} m² acumulados
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Altura por defecto
                  </span>
                  <input
                    type="range"
                    min={MIN_HEIGHT}
                    max={MAX_HEIGHT}
                    step={0.1}
                    value={defaultHeight}
                    onChange={(e) => setDefaultHeight(parseFloat(e.target.value))}
                    className="w-32 accent-yellow-400 h-2"
                    aria-label="Altura por defecto en metros"
                  />
                  <span className="text-yellow-400 font-black text-xs tabular-nums w-12 text-right">
                    {defaultHeight.toFixed(1)} m
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTopView((v) => !v)}
                  aria-label="Rotar cámara"
                  className="sm:hidden w-9 h-9 rounded-full bg-white/5 text-zinc-300 flex items-center justify-center"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
              {/* Mobile-only default height slider */}
              <div className="sm:hidden mt-2 flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 w-14">
                  Altura
                </span>
                <input
                  type="range"
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  step={0.1}
                  value={defaultHeight}
                  onChange={(e) => setDefaultHeight(parseFloat(e.target.value))}
                  className="flex-1 accent-yellow-400 h-2"
                />
                <span className="text-yellow-400 font-black text-xs tabular-nums w-12 text-right">
                  {defaultHeight.toFixed(1)} m
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Panel catalog sub-component                                               */
/* -------------------------------------------------------------------------- */

function PanelCatalog({
  activeTypeId,
  onSelect,
  selectedPanelExists,
}: {
  activeTypeId: string;
  onSelect: (id: string) => void;
  selectedPanelExists: boolean;
}) {
  return (
    <div className="p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-400 mb-1">
        Tipos de panel
      </p>
      <p className="text-[10px] text-zinc-500 mb-3">
        {selectedPanelExists
          ? 'Cambia el tipo del panel seleccionado.'
          : 'Elige el tipo a colocar al tocar la grilla.'}
      </p>
      <ul className="space-y-1.5">
        {PANEL_TYPES.map((t) => {
          const active = t.id === activeTypeId;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  active
                    ? 'border-yellow-400/60 bg-yellow-400/10'
                    : 'border-white/8 hover:border-white/20 bg-black/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{
                      backgroundColor: t.color,
                      boxShadow: `0 0 6px ${t.color}`,
                    }}
                  />
                  <span className="text-white text-xs font-bold">{t.name}</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">
                  {t.description}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
