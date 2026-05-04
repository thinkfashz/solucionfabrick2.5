'use client';

/**
 * HouseDesigner — Diseñador 3D interactivo mejorado v2.
 *
 * Mejoras:
 * - Paneles con espesor real por material (Metalcon 10cm, SIP 16.5cm, hormigón 20cm…)
 * - Orientación de panel: N-S o E-W
 * - Materiales PBR por tipo (roughness/metalness específicos)
 * - Ventanas con pano de vidrio translúcido + marco wireframe
 * - Puertas con vano oscuro representando el hueco
 * - Columnas: cilíndrico (acero) o caja (hormigón)
 * - Etiqueta de dimensiones HTML flotante sobre panel seleccionado
 * - Iluminación: HemisphereLight + Directional shadows + PointLight
 * - Iluminación local sin dependencias de HDR remotos
 * - Grid con marcas métricas en borde
 * - ACES Filmic tone-mapping, DPR hasta 2
 * - Catálogo muestra dimensiones reales (ancho × H × espesor)
 * - Persistencia localStorage v2 con campo orientation
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
import { OrbitControls, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  ArrowLeft,
  Trash2,
  Undo2,
  Box,
  Square,
  Send,
  RotateCw,
  RotateCcw,
  Layers,
  Wand2,
  Ruler,
  Sofa,
  House,
  KeyRound,
  DoorOpen,
  AppWindow,
  Globe,
  Sparkles,
  LampFloor,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useQuoteCart } from '@/context/QuoteCartContext';

/* -------------------------------------------------------------------------- */
/*  Configuración                                                             */
/* -------------------------------------------------------------------------- */

const GRID_SIZE = 10; // 10×10 m
const CELL = 1; // 1 m por celda
const MIN_HEIGHT = 0.3;
const MAX_HEIGHT = 6;
const STORAGE_KEY = 'fabrick-house-design-v3';

interface PanelType {
  id: string;
  name: string;
  color: string;
  refPrice: number; // CLP por m²
  description: string;
  thickness: number;     // metros (dimensión real)
  roughness: number;     // 0..1
  metalness: number;     // 0..1
  category: 'muro' | 'columna' | 'vidriado';
  dims: string;          // label p.ej. "100 × H × 10 cm"
}

const PANEL_TYPES: PanelType[] = [
  {
    id: 'metalcon',
    name: 'Muro Metalcon',
    color: '#facc15',
    refPrice: 38000,
    description: 'Estructura ligera galvanizada, ideal para tabiques estructurales.',
    thickness: 0.10,
    roughness: 0.65,
    metalness: 0.35,
    category: 'muro',
    dims: '100 × H × 10 cm',
  },
  {
    id: 'sip',
    name: 'Panel SIP aislado',
    color: '#10b981',
    refPrice: 52000,
    description: 'Panel sándwich con núcleo de poliestireno. Alta aislación térmica.',
    thickness: 0.165,
    roughness: 0.85,
    metalness: 0.0,
    category: 'muro',
    dims: '100 × H × 16.5 cm',
  },
  {
    id: 'volcanita',
    name: 'Tabique Volcanita',
    color: '#a78bfa',
    refPrice: 22000,
    description: 'Divisorio liviano para ambientes interiores (2 placas 9mm + estructura).',
    thickness: 0.10,
    roughness: 0.92,
    metalness: 0.0,
    category: 'muro',
    dims: '100 × H × 10 cm',
  },
  {
    id: 'window',
    name: 'Muro con ventana',
    color: '#38bdf8',
    refPrice: 65000,
    description: 'Incluye vano para ventana doble vidrio termopanel 0.6m².',
    thickness: 0.15,
    roughness: 0.75,
    metalness: 0.1,
    category: 'muro',
    dims: '100 × H × 15 cm',
  },
  {
    id: 'door',
    name: 'Muro con puerta',
    color: '#f97316',
    refPrice: 78000,
    description: 'Estructura con vano 0.9×2.1m para puerta más marco.',
    thickness: 0.15,
    roughness: 0.75,
    metalness: 0.05,
    category: 'muro',
    dims: '100 × H × 15 cm',
  },
  {
    id: 'concrete',
    name: 'Muro hormigón',
    color: '#94a3b8',
    refPrice: 95000,
    description: 'Hormigón armado H25 para estructuras portantes, 20cm de espesor.',
    thickness: 0.20,
    roughness: 0.95,
    metalness: 0.0,
    category: 'muro',
    dims: '100 × H × 20 cm',
  },
  {
    id: 'column',
    name: 'Columna HA 30×30',
    color: '#e11d48',
    refPrice: 110000,
    description: 'Columna de hormigón armado 30×30 cm para apoyo de losas y vigas.',
    thickness: 0.30,
    roughness: 0.9,
    metalness: 0.0,
    category: 'columna',
    dims: '30 × H × 30 cm',
  },
  {
    id: 'osb',
    name: 'Tabique OSB',
    color: '#d97706',
    refPrice: 28000,
    description: 'Tabique con placas OSB sobre estructura de pino, exteriores ventilados.',
    thickness: 0.12,
    roughness: 0.85,
    metalness: 0.0,
    category: 'muro',
    dims: '100 × H × 12 cm',
  },
  {
    id: 'curtain',
    name: 'Muro cortina vidriado',
    color: '#22d3ee',
    refPrice: 120000,
    description: 'Fachada acristalada con perfilería de aluminio termopanel de alta performance.',
    thickness: 0.12,
    roughness: 0.05,
    metalness: 0.8,
    category: 'vidriado',
    dims: '100 × H × 12 cm',
  },
  {
    id: 'steel',
    name: 'Pilar metálico HEB 200',
    color: '#64748b',
    refPrice: 88000,
    description: 'Pilar de acero estructural HEB 200 (∅20 cm), para grandes luces.',
    thickness: 0.20,
    roughness: 0.25,
    metalness: 0.92,
    category: 'columna',
    dims: '∅20 × H cm',
  },
  {
    id: 'block',
    name: 'Bloque hormigón',
    color: '#a8a29e',
    refPrice: 42000,
    description: 'Albañilería de bloque de hormigón 19cm rellenable con hormigón.',
    thickness: 0.19,
    roughness: 0.95,
    metalness: 0.0,
    category: 'muro',
    dims: '100 × H × 19 cm',
  },
  {
    id: 'glulam',
    name: 'Madera laminada CLT',
    color: '#b45309',
    refPrice: 72000,
    description: 'Pieza de madera laminada encolada CLT 140mm de alto rendimiento.',
    thickness: 0.14,
    roughness: 0.80,
    metalness: 0.0,
    category: 'muro',
    dims: '100 × H × 14 cm',
  },
];

const PANEL_BY_ID = Object.fromEntries(PANEL_TYPES.map((p) => [p.id, p])) as Record<string, PanelType>;

interface Panel {
  id: string;
  x: number;
  z: number;
  height: number;
  typeId: string;
  orientation: 'ns' | 'ew';
}

interface DecorType {
  id: string;
  name: string;
  color: string;
  category: 'mueble' | 'arquitectura' | 'simbolo';
  icon: LucideIcon;
  dims: string;
  description: string;
}

interface DecorItem {
  id: string;
  x: number;
  z: number;
  kind: DecorType['id'];
  scale: number;
  rotationY: number;
}

const DECOR_TYPES: DecorType[] = [
  {
    id: 'sofa',
    name: 'Sofá Modular',
    color: '#f59e0b',
    category: 'mueble',
    icon: Sofa,
    dims: '220 × 90 × 85 cm',
    description: 'Módulo living semi-realista para zonificar espacios interiores.',
  },
  {
    id: 'bed',
    name: 'Cama Doble',
    color: '#60a5fa',
    category: 'mueble',
    icon: Sparkles,
    dims: '200 × 160 × 55 cm',
    description: 'Volumen dormitorio con proporción real de cama matrimonial.',
  },
  {
    id: 'lamp',
    name: 'Lámpara Piso',
    color: '#facc15',
    category: 'mueble',
    icon: LampFloor,
    dims: '45 × 45 × 170 cm',
    description: 'Acento vertical para lectura visual de altura y escala.',
  },
  {
    id: 'mini-house',
    name: 'Módulo Casa',
    color: '#34d399',
    category: 'arquitectura',
    icon: House,
    dims: '260 × 260 × 260 cm',
    description: 'Volumen de referencia arquitectónica para maqueta urbana.',
  },
  {
    id: 'door-prop',
    name: 'Puerta Libre',
    color: '#fb923c',
    category: 'arquitectura',
    icon: DoorOpen,
    dims: '90 × 210 × 5 cm',
    description: 'Hoja + marco para ensayar circulaciones y accesos.',
  },
  {
    id: 'window-prop',
    name: 'Ventana Panorámica',
    color: '#22d3ee',
    category: 'arquitectura',
    icon: AppWindow,
    dims: '120 × 120 × 10 cm',
    description: 'Módulo de ventana con cristal translúcido y marco metálico.',
  },
  {
    id: 'key',
    name: 'Llave',
    color: '#f87171',
    category: 'simbolo',
    icon: KeyRound,
    dims: '45 × 18 × 5 cm',
    description: 'Símbolo de acceso para marcar zonas restringidas.',
  },
  {
    id: 'world',
    name: 'Mundo',
    color: '#38bdf8',
    category: 'simbolo',
    icon: Globe,
    dims: '80 × 80 × 80 cm',
    description: 'Globo para contexto global, puntos logísticos o branding.',
  },
];

const DECOR_BY_ID = Object.fromEntries(DECOR_TYPES.map((d) => [d.id, d])) as Record<string, DecorType>;

interface PersistedV3 { version: 3; panels: Panel[]; decor: DecorItem[] }
interface PersistedV2 { version: 2; panels: Panel[] }

function loadPersisted(): { panels: Panel[]; decor: DecorItem[] } {
  if (typeof window === 'undefined') return { panels: [], decor: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const oldRaw = localStorage.getItem('fabrick-house-design-v2');
      if (!oldRaw) return { panels: [], decor: [] };
      const oldParsed = JSON.parse(oldRaw) as PersistedV2;
      if (oldParsed?.version === 2 && Array.isArray(oldParsed.panels)) {
        return {
          panels: oldParsed.panels.map((x) => ({ ...x, orientation: x.orientation ?? 'ns' })),
          decor: [],
        };
      }
      return { panels: [], decor: [] };
    }

    const p = JSON.parse(raw) as PersistedV3;
    if (p?.version === 3 && Array.isArray(p.panels) && Array.isArray(p.decor)) {
      const panels = p.panels
        .filter((x) => typeof x?.x === 'number' && typeof x?.z === 'number' && typeof x?.height === 'number')
        .map((x) => ({ ...x, orientation: x.orientation ?? 'ns' }));

      const decor = p.decor
        .filter((x) => typeof x?.x === 'number' && typeof x?.z === 'number' && typeof x?.kind === 'string')
        .map((x) => ({
          ...x,
          scale: typeof x.scale === 'number' ? x.scale : 1,
          rotationY: typeof x.rotationY === 'number' ? x.rotationY : 0,
        }));

      return { panels, decor };
    }
  } catch {
    /* ignore */
  }
  return { panels: [], decor: [] };
}

function savePersisted(panels: Panel[], decor: DecorItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, panels, decor }));
  } catch {
    /* ignore */
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Floor                                                               */
/* ──────────────────────────────────────────────────────────────────── */

function Floor({ onCellClick, selectedTypeColor }: {
  onCellClick: (x: number, z: number) => void;
  selectedTypeColor: string;
}) {
  const half = (GRID_SIZE * CELL) / 2;
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const x = Math.floor(e.point.x + half);
    const z = Math.floor(e.point.z + half);
    if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE) return;
    onCellClick(x, z);
  };

  return (
    <group>
      {/* Losa del piso */}
      <mesh
        position={[0, -0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        receiveShadow
      >
        <planeGeometry args={[GRID_SIZE * CELL, GRID_SIZE * CELL]} />
        <meshStandardMaterial color="#111213" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Grid de celdas */}
      <Grid
        args={[GRID_SIZE * CELL, GRID_SIZE * CELL]}
        position={[0, 0.002, 0]}
        cellColor="#2a2a2a"
        cellSize={CELL}
        cellThickness={0.5}
        sectionColor={selectedTypeColor}
        sectionSize={CELL * 5}
        sectionThickness={1.3}
        fadeDistance={38}
        fadeStrength={1.4}
        infiniteGrid={false}
      />

      {/* Marco perimetral dorado */}
      {([
        [[0, 0.01, -half], [GRID_SIZE * CELL + 0.06, 0.04, 0.04]],
        [[0, 0.01,  half], [GRID_SIZE * CELL + 0.06, 0.04, 0.04]],
        [[-half, 0.01, 0], [0.04, 0.04, GRID_SIZE * CELL]],
        [[ half, 0.01, 0], [0.04, 0.04, GRID_SIZE * CELL]],
      ] as [number[], number[]][]).map(([pos, size], i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={size as [number, number, number]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.55} />
        </mesh>
      ))}

      {/* Marcas métricas en el borde — cada 1m */}
      {Array.from({ length: GRID_SIZE - 1 }, (_, i) => i + 1).flatMap((m) => [
        <mesh key={`mx${m}`} position={[m - half, 0.012, -half - 0.025]}>
          <boxGeometry args={[0.025, 0.025, 0.05]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} />
        </mesh>,
        <mesh key={`mz${m}`} position={[-half - 0.025, 0.012, m - half]}>
          <boxGeometry args={[0.05, 0.025, 0.025]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.4} />
        </mesh>,
      ])}
    </group>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Etiqueta de dimensiones HTML                                        */
/* ──────────────────────────────────────────────────────────────────── */

function DimensionLabel({ width, height, depth, type }: {
  width: number; height: number; depth: number; type: PanelType;
}) {
  return (
    <Html position={[0, height / 2 + 0.35, 0]} center distanceFactor={9}>
      <div
        className="pointer-events-none select-none rounded-lg px-2.5 py-1.5 text-white font-mono font-bold leading-snug whitespace-nowrap backdrop-blur-sm"
        style={{ background: 'rgba(5,5,8,0.88)', border: `1px solid ${type.color}55`, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}
      >
        <div className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: type.color }}>
          {type.name}
        </div>
        <div className="text-[11px] text-slate-100">
          {(width * 100).toFixed(0)}&thinsp;×&thinsp;{(height * 100).toFixed(0)}&thinsp;×&thinsp;{(depth * 100).toFixed(0)}&thinsp;cm
        </div>
        <div className="text-[9px] text-slate-400 mt-px">
          {(width * height * depth * 1000).toFixed(1)}&thinsp;L volumen
        </div>
      </div>
    </Html>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
/*  PanelMesh — geometría semi-realista                                 */
/* ──────────────────────────────────────────────────────────────────── */

function PanelMesh({ panel, selected, onSelect }: {
  panel: Panel; selected: boolean; onSelect: (id: string) => void;
}) {
  const half = (GRID_SIZE * CELL) / 2;
  const type = PANEL_BY_ID[panel.typeId] ?? PANEL_TYPES[0];
  const wx = panel.x - half + CELL / 2;
  const wz = panel.z - half + CELL / 2;
  const h = panel.height;
  const t = type.thickness;
  const isNS = panel.orientation === 'ns';
  const isColumn = type.category === 'columna';
  const isCurtain = type.id === 'curtain';

  // ns: muro corre N-S (delgado en X, ancho en Z)
  // ew: muro corre E-W (ancho en X, delgado en Z)
  const geoW = isColumn ? t : (isNS ? t : CELL);
  const geoD = isColumn ? t : (isNS ? CELL : t);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(panel.id);
  };

  const baseMat = (
    <meshStandardMaterial
      color={type.color}
      emissive={selected ? type.color : '#000000'}
      emissiveIntensity={selected ? 0.22 : 0}
      roughness={type.roughness}
      metalness={type.metalness}
      transparent={isCurtain || type.id === 'window'}
      opacity={isCurtain ? 0.32 : type.id === 'window' ? 0.88 : 1}
    />
  );

  const outline = selected && (
    <mesh>
      <boxGeometry args={[geoW + 0.05, h + 0.05, geoD + 0.05]} />
      <meshBasicMaterial color="#facc15" wireframe />
    </mesh>
  );
  const dimLabel = selected && <DimensionLabel width={geoW} height={h} depth={geoD} type={type} />;

  /* ── VENTANA ── */
  if (type.id === 'window') {
    const glassW = isNS ? t * 1.04 : CELL * 0.62;
    const glassD = isNS ? CELL * 0.62 : t * 1.04;
    const glassH = Math.max(0.3, h - 0.9);
    const glassCenterY = 0.5 + glassH / 2 - h / 2;
    return (
      <group position={[wx, h / 2, wz]}>
        <mesh onPointerDown={onPointerDown} castShadow receiveShadow>
          <boxGeometry args={[geoW, h, geoD]} />{baseMat}
        </mesh>
        <mesh castShadow position={[0, glassCenterY, 0]}>
          <boxGeometry args={[glassW, glassH, glassD]} />
          <meshStandardMaterial color="#bae6fd" roughness={0.04} metalness={0.05} transparent opacity={0.28} />
        </mesh>
        <mesh position={[0, glassCenterY, 0]}>
          <boxGeometry args={[glassW * 1.015, glassH * 1.015, glassD * 1.015]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.25} metalness={0.75} wireframe />
        </mesh>
        {outline}{dimLabel}
      </group>
    );
  }

  /* ── PUERTA ── */
  if (type.id === 'door') {
    const doorOpenW = isNS ? t * 1.05 : Math.min(0.9, CELL * 0.45);
    const doorOpenD = isNS ? Math.min(0.9, CELL * 0.45) : t * 1.05;
    const doorH = Math.min(2.1, h - 0.05);
    const doorCenterY = doorH / 2 - h / 2;
    return (
      <group position={[wx, h / 2, wz]}>
        <mesh onPointerDown={onPointerDown} castShadow receiveShadow>
          <boxGeometry args={[geoW, h, geoD]} />{baseMat}
        </mesh>
        {h > 0.5 && (
          <mesh position={[0, doorCenterY, 0]}>
            <boxGeometry args={[doorOpenW, doorH, doorOpenD]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.9} depthWrite={false} />
          </mesh>
        )}
        {outline}{dimLabel}
      </group>
    );
  }

  /* ── COLUMNA ── */
  if (isColumn) {
    const isSteelPipe = type.id === 'steel';
    return (
      <group position={[wx, h / 2, wz]}>
        <mesh onPointerDown={onPointerDown} castShadow receiveShadow>
          {isSteelPipe
            ? <cylinderGeometry args={[t / 2.2, t / 2.2, h, 12]} />
            : <boxGeometry args={[t, h, t]} />
          }
          {baseMat}
        </mesh>
        {selected && (
          <mesh>
            <boxGeometry args={[t + 0.05, h + 0.05, t + 0.05]} />
            <meshBasicMaterial color="#facc15" wireframe />
          </mesh>
        )}
        {selected && <DimensionLabel width={t} height={h} depth={t} type={type} />}
      </group>
    );
  }

  /* ── MURO GENÉRICO ── */
  return (
    <group position={[wx, h / 2, wz]}>
      <mesh onPointerDown={onPointerDown} castShadow receiveShadow>
        <boxGeometry args={[geoW, h, geoD]} />{baseMat}
      </mesh>
      {outline}{dimLabel}
    </group>
  );
}

function DecorMesh({
  item,
  selected,
  onSelect,
}: {
  item: DecorItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const half = (GRID_SIZE * CELL) / 2;
  const wx = item.x - half + CELL / 2;
  const wz = item.z - half + CELL / 2;
  const type = DECOR_BY_ID[item.kind] ?? DECOR_TYPES[0];

  const s = Math.max(0.55, Math.min(1.8, item.scale));
  const base = type.color;

  return (
    <group
      position={[wx, 0, wz]}
      rotation={[0, item.rotationY, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(item.id);
      }}
    >
      {item.kind === 'sofa' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
            <boxGeometry args={[0.9, 0.3, 0.45]} />
            <meshStandardMaterial color={base} roughness={0.78} metalness={0.06} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.42, -0.17]}>
            <boxGeometry args={[0.9, 0.28, 0.1]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.9} metalness={0.02} />
          </mesh>
        </group>
      )}

      {item.kind === 'bed' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
            <boxGeometry args={[0.95, 0.24, 0.58]} />
            <meshStandardMaterial color="#64748b" roughness={0.85} metalness={0.03} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.28, 0]}>
            <boxGeometry args={[0.85, 0.1, 0.5]} />
            <meshStandardMaterial color="#dbeafe" roughness={0.62} metalness={0.02} />
          </mesh>
        </group>
      )}

      {item.kind === 'lamp' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.04, 16]} />
            <meshStandardMaterial color="#475569" roughness={0.35} metalness={0.85} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.43, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.8, 10]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.25} metalness={0.9} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.88, 0]}>
            <coneGeometry args={[0.14, 0.22, 16]} />
            <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={0.2} roughness={0.72} />
          </mesh>
        </group>
      )}

      {item.kind === 'mini-house' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[0, 0.23, 0]}>
            <boxGeometry args={[0.75, 0.45, 0.75]} />
            <meshStandardMaterial color={base} roughness={0.72} metalness={0.03} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.42, 0.28, 4]} />
            <meshStandardMaterial color="#b91c1c" roughness={0.78} metalness={0.02} />
          </mesh>
        </group>
      )}

      {item.kind === 'door-prop' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
            <boxGeometry args={[0.52, 1.0, 0.04]} />
            <meshStandardMaterial color={base} roughness={0.7} metalness={0.08} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.17, 0.5, 0.03]}>
            <sphereGeometry args={[0.03, 10, 10]} />
            <meshStandardMaterial color="#fef08a" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      )}

      {item.kind === 'window-prop' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[0, 0.48, 0]}>
            <boxGeometry args={[0.74, 0.62, 0.05]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.8} wireframe />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.48, 0]}>
            <boxGeometry args={[0.66, 0.54, 0.02]} />
            <meshStandardMaterial color="#7dd3fc" roughness={0.03} metalness={0.12} transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {item.kind === 'key' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[-0.07, 0.18, 0]}>
            <torusGeometry args={[0.12, 0.03, 10, 20]} />
            <meshStandardMaterial color={base} roughness={0.32} metalness={0.86} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.14, 0.18, 0]}>
            <boxGeometry args={[0.34, 0.06, 0.06]} />
            <meshStandardMaterial color={base} roughness={0.32} metalness={0.86} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.28, 0.14, 0]}>
            <boxGeometry args={[0.08, 0.06, 0.06]} />
            <meshStandardMaterial color={base} roughness={0.32} metalness={0.86} />
          </mesh>
        </group>
      )}

      {item.kind === 'world' && (
        <group scale={[s, s, s]}>
          <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.24, 28, 28]} />
            <meshStandardMaterial color={base} roughness={0.12} metalness={0.15} emissive="#0ea5e9" emissiveIntensity={0.13} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
            <torusGeometry args={[0.26, 0.01, 8, 42]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      )}

      {selected && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28 * s, 0.34 * s, 32]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.85} side={THREE.DoubleSide} />
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
      camera.position.set(12, 10, 12);
      camera.lookAt(0, 1.5, 0);
    }
  }, [topView, camera]);
  return null;
}

export default function HouseDesigner() {
  const router = useRouter();
  const { addPanels } = useQuoteCart();
  const [toolMode, setToolMode] = useState<'panel' | 'decor'>('panel');
  const [panels, setPanels] = useState<Panel[]>([]);
  const [decor, setDecor] = useState<DecorItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);
  const [activeTypeId, setActiveTypeId] = useState<string>(PANEL_TYPES[0].id);
  const [activeDecorId, setActiveDecorId] = useState<string>(DECOR_TYPES[0].id);
  const [defaultHeight, setDefaultHeight] = useState(2.4);
  const [orientation, setOrientation] = useState<'ns' | 'ew'>('ns');
  const [topView, setTopView] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const undoRef = useRef<Panel[][]>([]);

  useEffect(() => {
    const persisted = loadPersisted();
    setPanels(persisted.panels);
    setDecor(persisted.decor);
  }, []);
  useEffect(() => { savePersisted(panels, decor); }, [panels, decor]);

  const pushUndo = (next: Panel[]) => {
    undoRef.current.push(panels);
    if (undoRef.current.length > 40) undoRef.current.shift();
    setPanels(next);
  };

  const handleCellClick = (x: number, z: number) => {
    if (toolMode === 'decor') {
      const existingDecor = decor.find((d) => d.x === x && d.z === z);
      if (existingDecor) {
        setDecor((prev) => prev.filter((d) => d.id !== existingDecor.id));
        if (selectedDecorId === existingDecor.id) setSelectedDecorId(null);
        return;
      }
      const id = `dc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      setDecor((prev) => [...prev, { id, x, z, kind: activeDecorId, scale: 1, rotationY: 0 }]);
      setSelectedDecorId(id);
      setSelectedId(null);
      return;
    }

    const existing = panels.find((p) => p.x === x && p.z === z);
    if (existing) {
      pushUndo(panels.filter((p) => p.id !== existing.id));
      if (selectedId === existing.id) setSelectedId(null);
      return;
    }
    const id = `pn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    pushUndo([...panels, { id, x, z, height: defaultHeight, typeId: activeTypeId, orientation }]);
    setSelectedId(id);
    setSelectedDecorId(null);
  };

  const undo = () => {
    const prev = undoRef.current.pop();
    if (prev) setPanels(prev);
  };

  const clearAll = () => {
    if (panels.length === 0 && decor.length === 0) return;
    if (!confirm('¿Borrar todo el diseño?')) return;
    undoRef.current.push(panels);
    setPanels([]);
    setDecor([]);
    setSelectedId(null);
    setSelectedDecorId(null);
  };

  const updateSelectedHeight = (h: number) => {
    if (!selectedId) return;
    setPanels((prev) =>
      prev.map((p) => (p.id === selectedId ? { ...p, height: Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h)) } : p)),
    );
  };

  const updateSelectedType = (typeId: string) => {
    if (!selectedId) {
      setActiveTypeId(typeId);
      return;
    }
    setPanels((prev) => prev.map((p) => (p.id === selectedId ? { ...p, typeId } : p)));
  };

  const updateSelectedDecorScale = (scale: number) => {
    if (!selectedDecorId) return;
    const clamped = Math.max(0.55, Math.min(1.8, scale));
    setDecor((prev) => prev.map((d) => (d.id === selectedDecorId ? { ...d, scale: clamped } : d)));
  };

  const rotateSelectedDecor = () => {
    if (!selectedDecorId) return;
    setDecor((prev) => prev.map((d) => (d.id === selectedDecorId ? { ...d, rotationY: d.rotationY + Math.PI / 2 } : d)));
  };

  const updateSelectedDecorType = (typeId: string) => {
    if (!selectedDecorId) {
      setActiveDecorId(typeId);
      return;
    }
    setDecor((prev) => prev.map((d) => (d.id === selectedDecorId ? { ...d, kind: typeId } : d)));
  };

  const flipOrientation = () => {
    if (selectedId) {
      setPanels((prev) =>
        prev.map((p) => p.id === selectedId ? { ...p, orientation: p.orientation === 'ns' ? 'ew' : 'ns' } : p),
      );
    } else {
      setOrientation((o) => (o === 'ns' ? 'ew' : 'ns'));
    }
  };

  const summary = useMemo(() => {
    const map = new Map<string, { type: PanelType; count: number; m2: number; refSubtotal: number }>();
    for (const p of panels) {
      const type = PANEL_BY_ID[p.typeId] ?? PANEL_TYPES[0];
      const m2 = CELL * p.height;
      const entry = map.get(type.id) ?? { type, count: 0, m2: 0, refSubtotal: 0 };
      entry.count += 1;
      entry.m2 += m2;
      entry.refSubtotal += m2 * type.refPrice;
      map.set(type.id, entry);
    }
    return Array.from(map.values());
  }, [panels]);

  const totalRefM2 = summary.reduce((s, x) => s + x.m2, 0);

  const handleQuote = () => {
    if (panels.length === 0 && decor.length === 0) {
      alert('Aún no has colocado elementos. Toca la grilla para empezar.');
      return;
    }
    const decorSummary = DECOR_TYPES.map((d) => ({
      type: d,
      count: decor.filter((x) => x.kind === d.id).length,
    })).filter((x) => x.count > 0);

    addPanels([
      ...summary.map((s) => ({
        title: `${s.type.name} (${s.count} panel${s.count === 1 ? '' : 'es'})`,
        description: s.type.description,
        quantity: Math.max(1, Math.round(s.m2 * 10) / 10),
        unit: 'm²',
        refPrice: s.type.refPrice,
        meta: { Tipo: s.type.name, Paneles: String(s.count), Superficie: `${s.m2.toFixed(1)} m²`, Espesor: `${(s.type.thickness * 100).toFixed(0)} cm` },
      })),
      ...decorSummary.map((d) => ({
        title: `${d.type.name} (${d.count})`,
        description: d.type.description,
        quantity: d.count,
        unit: 'u',
        refPrice: 0,
        meta: { Categoria: 'Elemento 5D', Tipo: d.type.name, Dimension: d.type.dims },
      })),
    ]);
    router.push('/cotizaciones');
  };

  const selectedPanel = selectedId ? panels.find((p) => p.id === selectedId) ?? null : null;
  const selectedDecor = selectedDecorId ? decor.find((d) => d.id === selectedDecorId) ?? null : null;
  const activeType = PANEL_BY_ID[activeTypeId] ?? PANEL_TYPES[0];
  const activeDecor = DECOR_BY_ID[activeDecorId] ?? DECOR_TYPES[0];
  const curOrientation = selectedPanel?.orientation ?? orientation;

  return (
    <main className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden">
      {/* ── Barra superior ── */}
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
            Diseñador 5D
          </p>
          <h1 className="text-xs md:text-sm font-black uppercase tracking-[0.18em] text-white">
            Plano de tu casa
          </h1>
          <div className="mt-1 inline-flex rounded-full border border-white/10 bg-black/35 p-0.5">
            <button
              type="button"
              onClick={() => setToolMode('panel')}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] rounded-full transition-colors ${toolMode === 'panel' ? 'bg-yellow-400 text-black' : 'text-zinc-300 hover:text-white'}`}
            >
              Paneles
            </button>
            <button
              type="button"
              onClick={() => setToolMode('decor')}
              className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] rounded-full transition-colors ${toolMode === 'decor' ? 'bg-cyan-400 text-black' : 'text-zinc-300 hover:text-white'}`}
            >
              Elementos
            </button>
          </div>
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
          shadows="soft"
          camera={{ position: [11, 9, 11], fov: 45 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#060608']} />
          <fog attach="fog" args={['#060608', 24, 55]} />

          {/* Iluminación realista */}
          <hemisphereLight args={['#1a1a2e', '#0a0a0a', 0.55]} />
          <ambientLight intensity={0.25} />
          <directionalLight
            position={[12, 18, 10]}
            intensity={1.3}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={0.5}
            shadow-camera-far={55}
            shadow-camera-left={-14}
            shadow-camera-right={14}
            shadow-camera-top={14}
            shadow-camera-bottom={-14}
            shadow-bias={-0.0004}
          />
          <directionalLight position={[-8, 6, -10]} intensity={0.28} color="#8888cc" />
          <pointLight position={[0, 8, 0]} intensity={0.5} color="#facc15" distance={22} decay={2} />

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
            {decor.map((d) => (
              <DecorMesh
                key={d.id}
                item={d}
                selected={d.id === selectedDecorId}
                onSelect={(id) => {
                  setSelectedDecorId(id);
                  setSelectedId(null);
                }}
              />
            ))}
          </Suspense>
          <OrbitControls
            enablePan={!topView}
            enableRotate={!topView}
            enableZoom
            enableDamping
            dampingFactor={0.07}
            minDistance={3}
            maxDistance={32}
            maxPolarAngle={topView ? 0 : Math.PI / 2.08}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          />
        </Canvas>

        {/* ── Toolbar derecha ── */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            type="button"
            onClick={() => setTopView((v) => !v)}
            aria-label="Cambiar vista"
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-yellow-400/20 border border-white/10 hover:border-yellow-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-yellow-400 transition-all shadow-lg"
          >
            {topView ? <Box className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
          {/* Girar orientación N-S / E-W */}
          <button
            type="button"
            onClick={() => setToolMode((m) => (m === 'panel' ? 'decor' : 'panel'))}
            aria-label="Cambiar modo de edición"
            title={`Modo: ${toolMode === 'panel' ? 'Paneles' : 'Elementos 5D'}`}
            className={`w-11 h-11 rounded-full border backdrop-blur-md flex items-center justify-center transition-all shadow-lg ${
              toolMode === 'decor'
                ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-300'
                : 'border-white/10 bg-zinc-950/90 text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-300'
            }`}
          >
            <Wand2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={flipOrientation}
            aria-label="Rotar orientación"
            title={`Orientación: ${curOrientation === 'ns' ? 'N-S' : 'E-W'}`}
            className={`w-11 h-11 rounded-full border backdrop-blur-md flex items-center justify-center transition-all shadow-lg ${
              curOrientation === 'ew'
                ? 'border-yellow-400/60 bg-yellow-400/12 text-yellow-400'
                : 'border-white/10 bg-zinc-950/90 text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400'
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={undo}
            aria-label="Deshacer"
            disabled={undoRef.current.length === 0}
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-yellow-400/20 border border-white/10 hover:border-yellow-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-yellow-400 transition-all shadow-lg disabled:opacity-35"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={clearAll}
            aria-label="Limpiar todo"
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-red-300 transition-all shadow-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowCatalog((v) => !v)}
            aria-label="Catálogo de materiales"
            className="w-11 h-11 rounded-full bg-zinc-950/90 hover:bg-yellow-400/20 border border-white/10 hover:border-yellow-400/40 backdrop-blur-md flex items-center justify-center text-zinc-200 hover:text-yellow-400 transition-all shadow-lg lg:hidden"
          >
            <Layers className="w-5 h-5" />
          </button>
        </div>

        {/* ── Badge top-left ── */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-white/10 backdrop-blur-md text-[9px] font-black uppercase tracking-[0.22em]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: activeType.color, boxShadow: `0 0 8px ${activeType.color}` }}
          />
          <span className="text-white">{topView ? 'Plano' : '3D'}</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-300">{panels.length} paneles</span>
          <span className="text-zinc-500">·</span>
          <span className="text-cyan-300">{decor.length} elementos</span>
          <span className="text-zinc-500">·</span>
          <span className={curOrientation === 'ew' ? 'text-yellow-400' : 'text-zinc-400'}>{curOrientation.toUpperCase()}</span>
        </div>

        {/* ── Catálogo lateral desktop ── */}
        <aside className="hidden lg:flex absolute top-16 left-3 bottom-3 w-68 rounded-2xl bg-zinc-950/90 border border-white/10 backdrop-blur-md overflow-y-auto z-10 flex-col">
          {toolMode === 'panel' ? (
            <PanelCatalog activeTypeId={activeTypeId} onSelect={updateSelectedType} selectedPanelExists={!!selectedPanel} />
          ) : (
            <DecorCatalog activeDecorId={activeDecorId} onSelect={updateSelectedDecorType} selectedDecorExists={!!selectedDecor} />
          )}
        </aside>

        {/* ── Catálogo drawer móvil ── */}
        {showCatalog && (
          <aside className="lg:hidden absolute top-16 right-3 left-3 max-h-[70vh] rounded-2xl bg-zinc-950/95 border border-white/10 backdrop-blur-md overflow-y-auto z-10">
            {toolMode === 'panel' ? (
              <PanelCatalog activeTypeId={activeTypeId} onSelect={(id) => { updateSelectedType(id); setShowCatalog(false); }} selectedPanelExists={!!selectedPanel} />
            ) : (
              <DecorCatalog activeDecorId={activeDecorId} onSelect={(id) => { updateSelectedDecorType(id); setShowCatalog(false); }} selectedDecorExists={!!selectedDecor} />
            )}
          </aside>
        )}

        {/* ── Inspector / hint bar inferior ── */}
        <div
          className="absolute left-0 right-0 bottom-0 px-3 pb-3 pt-2 bg-gradient-to-t from-black via-black/85 to-transparent z-10"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        >
          {selectedPanel ? (
            <div className="rounded-2xl bg-zinc-950/95 border border-yellow-400/30 backdrop-blur-md p-3 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-yellow-400">
                    Panel seleccionado
                  </p>
                  <p className="text-white text-sm font-bold">
                    {(PANEL_BY_ID[selectedPanel.typeId] ?? PANEL_TYPES[0]).name}
                  </p>
                  <p className="text-zinc-500 text-[10px] font-mono mt-0.5">
                    {(PANEL_BY_ID[selectedPanel.typeId] ?? PANEL_TYPES[0]).dims.replace('H', `${selectedPanel.height.toFixed(2)}m`)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={flipOrientation}
                    aria-label="Girar orientación del panel"
                    className={`h-8 px-3 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border transition-colors flex items-center gap-1 ${
                      selectedPanel.orientation === 'ew'
                        ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400'
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Ruler className="w-3 h-3" />
                    {selectedPanel.orientation.toUpperCase()}
                  </button>
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
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 w-14">
                  Altura
                </span>
                <input
                  type="range"
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  step={0.05}
                  value={selectedPanel.height}
                  onChange={(e) => updateSelectedHeight(parseFloat(e.target.value))}
                  className="flex-1 accent-yellow-400 h-2"
                  aria-label="Altura del panel en metros"
                />
                <span className="text-yellow-400 font-black text-sm tabular-nums w-16 text-right">
                  {selectedPanel.height.toFixed(2)} m
                </span>
              </div>
            </div>
          ) : selectedDecor ? (
            <div className="rounded-2xl bg-zinc-950/95 border border-cyan-300/30 backdrop-blur-md p-3 md:p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-300">
                    Elemento 5D seleccionado
                  </p>
                  <p className="text-white text-sm font-bold">{(DECOR_BY_ID[selectedDecor.kind] ?? DECOR_TYPES[0]).name}</p>
                  <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{(DECOR_BY_ID[selectedDecor.kind] ?? DECOR_TYPES[0]).dims}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={rotateSelectedDecor}
                    aria-label="Rotar elemento"
                    className="h-8 px-3 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border border-cyan-300/40 text-cyan-300 bg-cyan-400/10 transition-colors"
                  >
                    Giro 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDecor((prev) => prev.filter((d) => d.id !== selectedDecor.id));
                      setSelectedDecorId(null);
                    }}
                    aria-label="Eliminar elemento"
                    className="w-9 h-9 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-300 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 w-14">Escala</span>
                <input
                  type="range"
                  min={0.55}
                  max={1.8}
                  step={0.05}
                  value={selectedDecor.scale}
                  onChange={(e) => updateSelectedDecorScale(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 h-2"
                  aria-label="Escala del elemento"
                />
                <span className="text-cyan-300 font-black text-sm tabular-nums w-16 text-right">{selectedDecor.scale.toFixed(2)}x</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-zinc-950/85 border border-white/10 backdrop-blur-md p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Wand2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-zinc-300 text-xs truncate">
                    {toolMode === 'panel'
                      ? `Toca la grilla · ${totalRefM2.toFixed(1)} m² · ${activeType.dims}`
                      : `Modo 5D · ${activeDecor.name} · ${activeDecor.dims}`}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Altura
                  </span>
                  <input
                    type="range"
                    min={MIN_HEIGHT}
                    max={MAX_HEIGHT}
                    step={0.05}
                    value={defaultHeight}
                    onChange={(e) => setDefaultHeight(parseFloat(e.target.value))}
                    className="w-32 accent-yellow-400 h-2"
                    aria-label="Altura por defecto"
                  />
                  <span className="text-yellow-400 font-black text-xs tabular-nums w-12 text-right">{defaultHeight.toFixed(2)} m</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTopView((v) => !v)}
                  aria-label="Rotar cámara"
                  className="sm:hidden w-9 h-9 rounded-full bg-white/5 text-zinc-300 flex items-center justify-center"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              <div className="sm:hidden mt-2 flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 w-14">Altura</span>
                <input
                  type="range"
                  min={MIN_HEIGHT}
                  max={MAX_HEIGHT}
                  step={0.05}
                  value={defaultHeight}
                  onChange={(e) => setDefaultHeight(parseFloat(e.target.value))}
                  className="flex-1 accent-yellow-400 h-2"
                  aria-label="Altura por defecto"
                />
                <span className="text-yellow-400 font-black text-xs tabular-nums w-12 text-right">{defaultHeight.toFixed(2)} m</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function PanelCatalog({ activeTypeId, onSelect, selectedPanelExists }: {
  activeTypeId: string; onSelect: (id: string) => void; selectedPanelExists: boolean;
}) {
  return (
    <div className="p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-400 mb-1">Materiales</p>
      <p className="text-[10px] text-zinc-500 mb-3">
        {selectedPanelExists
          ? 'Cambia el tipo del panel seleccionado.'
          : 'Elige el material a colocar en la grilla.'}
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
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{
                      backgroundColor: t.color,
                      boxShadow: `0 0 6px ${t.color}`,
                    }}
                  />
                  <span className="text-white text-xs font-bold leading-tight">{t.name}</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2 mb-1">{t.description}</p>
                <p className="text-[9px] font-mono text-zinc-500 tabular-nums">{t.dims}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DecorCatalog({ activeDecorId, onSelect, selectedDecorExists }: {
  activeDecorId: string; onSelect: (id: string) => void; selectedDecorExists: boolean;
}) {
  return (
    <div className="p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-cyan-300 mb-1">Biblioteca 5D</p>
      <p className="text-[10px] text-zinc-500 mb-3">
        {selectedDecorExists
          ? 'Edita el objeto seleccionado o cambia su tipo.'
          : 'Librería gratuita Lucide: muebles, casa, llave, puerta, ventana y mundo.'}
      </p>
      <ul className="space-y-1.5">
        {DECOR_TYPES.map((d) => {
          const active = d.id === activeDecorId;
          const Icon = d.icon;
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  active
                    ? 'border-cyan-300/60 bg-cyan-400/10'
                    : 'border-white/8 hover:border-white/20 bg-black/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${d.color}22` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: d.color }} />
                  </span>
                  <span className="text-white text-xs font-bold leading-tight">{d.name}</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2 mb-1">{d.description}</p>
                <p className="text-[9px] font-mono text-zinc-500 tabular-nums">{d.dims}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
