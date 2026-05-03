'use client';

/**
 * useDesignStore — Estado global del Ecosistema de Diseño Bimodal (2D/3D).
 *
 * Single source of truth compartido por la vista 2D (Plano Técnico) y la
 * vista 3D (Modelo Real). Cualquier cambio (mover, redimensionar, agregar,
 * eliminar) se aplica al store y ambas vistas lo consumen vía hook, por lo
 * que la sincronización entre 2D y 3D es instantánea (el mismo árbol R3F
 * lee del mismo array de `elementos`).
 *
 * Unidades: metros. Coordenadas: x = ancho del plano, z = profundidad,
 * y = altura. La vista 2D usa cámara ortográfica desde +Y mirando -Y.
 */

import { create } from 'zustand';

export type ElementoTipo = 'muro' | 'puerta' | 'ventana' | 'piso' | 'viga';

export type ElementoCategoria = 'Estructura' | 'Muros' | 'Aberturas';

export interface PropiedadesMaterial {
  /** Nombre legible (p.ej. "Metalcom", "Madera tratada", "Aluminio anodizado"). */
  nombre: string;
  /** Color base del material (hex). */
  color: string;
  /** 0 = mate, 1 = espejo. */
  metalness: number;
  /** 0 = pulido, 1 = áspero. */
  roughness: number;
  /** Opacidad: 1 sólido, <1 translúcido (cristales). */
  opacidad?: number;
}

/** Posición [x, y, z] en metros. */
export type Posicion = [number, number, number];
/** Dimensiones [ancho, alto, largo] en metros. */
export type Dimensiones = [number, number, number];

export interface ElementoDiseno {
  id: string;
  tipo: ElementoTipo;
  categoria: ElementoCategoria;
  /** Etiqueta humana (p.ej. "Puerta de madera 90×210"). */
  nombre: string;
  posicion: Posicion;
  /** [ancho (X), alto (Y), largo/profundidad (Z)] */
  dimensiones: Dimensiones;
  /** Rotación en Y, radianes. */
  rotacionY: number;
  propiedadesMaterial: PropiedadesMaterial;
}

export type ViewMode = '2D' | '3D';

/** Snap configurable. 0 = sin snap; 0.05 = 5 cm; 0.10 = 10 cm. */
export type SnapStep = 0 | 0.05 | 0.1;

interface DesignState {
  elementos: ElementoDiseno[];
  selectedId: string | null;
  viewMode: ViewMode;
  snapStep: SnapStep;
  /** Marca de cambios pendientes de persistir. */
  dirty: boolean;

  addElemento: (e: Omit<ElementoDiseno, 'id'>) => string;
  updateElemento: (id: string, patch: Partial<Omit<ElementoDiseno, 'id'>>) => void;
  removeElemento: (id: string) => void;
  setPosicion: (id: string, posicion: Posicion) => void;
  setDimensiones: (id: string, dimensiones: Dimensiones) => void;
  setSelected: (id: string | null) => void;
  setViewMode: (m: ViewMode) => void;
  setSnapStep: (s: SnapStep) => void;
  /** Aplica snap milimétrico al valor en metros según el step actual. */
  applySnap: (value: number) => number;
  clearDirty: () => void;
  /** Rehidratación desde JSON (carga de proyecto guardado). */
  hydrate: (elementos: ElementoDiseno[]) => void;
  /** Limpia toda la escena. */
  reset: () => void;
}

let _seq = 0;
function nextId(): string {
  _seq += 1;
  return `el_${Date.now().toString(36)}_${_seq}`;
}

function snap(value: number, step: SnapStep): number {
  if (!step) return value;
  return Math.round(value / step) * step;
}

export const useDesignStore = create<DesignState>((set, get) => ({
  elementos: [],
  selectedId: null,
  viewMode: '3D',
  snapStep: 0.05,
  dirty: false,

  addElemento: (e) => {
    const id = nextId();
    set((state) => ({
      elementos: [...state.elementos, { ...e, id }],
      selectedId: id,
      dirty: true,
    }));
    return id;
  },

  updateElemento: (id, patch) =>
    set((state) => ({
      elementos: state.elementos.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      dirty: true,
    })),

  removeElemento: (id) =>
    set((state) => ({
      elementos: state.elementos.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      dirty: true,
    })),

  setPosicion: (id, posicion) => {
    const step = get().snapStep;
    const snapped: Posicion = [snap(posicion[0], step), posicion[1], snap(posicion[2], step)];
    set((state) => ({
      elementos: state.elementos.map((el) =>
        el.id === id ? { ...el, posicion: snapped } : el,
      ),
      dirty: true,
    }));
  },

  setDimensiones: (id, dimensiones) => {
    const step = get().snapStep;
    const snapped: Dimensiones = [
      Math.max(0.05, snap(dimensiones[0], step)),
      Math.max(0.05, snap(dimensiones[1], step)),
      Math.max(0.05, snap(dimensiones[2], step)),
    ];
    set((state) => ({
      elementos: state.elementos.map((el) =>
        el.id === id ? { ...el, dimensiones: snapped } : el,
      ),
      dirty: true,
    }));
  },

  setSelected: (id) => set({ selectedId: id }),
  setViewMode: (m) => set({ viewMode: m }),
  setSnapStep: (s) => set({ snapStep: s }),

  applySnap: (value) => snap(value, get().snapStep),

  clearDirty: () => set({ dirty: false }),

  hydrate: (elementos) => set({ elementos, selectedId: null, dirty: false }),

  reset: () => set({ elementos: [], selectedId: null, dirty: false }),
}));

/** Hook helper: devuelve el elemento actualmente seleccionado, o `null`. */
export function useSelectedElement(): ElementoDiseno | null {
  return useDesignStore((s) => {
    if (!s.selectedId) return null;
    return s.elementos.find((e) => e.id === s.selectedId) ?? null;
  });
}
