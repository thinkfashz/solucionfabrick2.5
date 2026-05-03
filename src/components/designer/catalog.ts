/**
 * Catálogo de piezas pre-configuradas para el SidebarCatalog.
 *
 * Cada `CatalogPiece` describe un módulo arquitectónico que el usuario puede
 * arrastrar/clickear desde el menú izquierdo. Los valores por defecto
 * (`dimensiones`, `propiedadesMaterial`) sirven de plantilla para crear un
 * `ElementoDiseno` nuevo en el store.
 */

import type {
  Dimensiones,
  ElementoCategoria,
  ElementoTipo,
  PropiedadesMaterial,
} from '@/store/useDesignStore';

export interface CatalogPiece {
  /** Identificador estable del catálogo (no es el id del elemento). */
  catalogId: string;
  tipo: ElementoTipo;
  categoria: ElementoCategoria;
  /** Subcategoría visible (Pisos, Vigas, Metalcom, Madera, Puertas, Ventanas, …). */
  subcategoria: string;
  nombre: string;
  /** Descripción breve para tooltip / tarjeta. */
  descripcion: string;
  /** Dimensiones por defecto en metros [ancho, alto, largo]. */
  dimensiones: Dimensiones;
  propiedadesMaterial: PropiedadesMaterial;
}

export const CATALOG: CatalogPiece[] = [
  // ─── Estructura ─────────────────────────────────────────────────────────
  {
    catalogId: 'piso-radier',
    tipo: 'piso',
    categoria: 'Estructura',
    subcategoria: 'Pisos',
    nombre: 'Radier de hormigón',
    descripcion: 'Losa de hormigón armado 10 cm — base sólida.',
    dimensiones: [3, 0.1, 3],
    propiedadesMaterial: {
      nombre: 'Hormigón pulido',
      color: '#9ca3af',
      metalness: 0.05,
      roughness: 0.85,
    },
  },
  {
    catalogId: 'piso-madera',
    tipo: 'piso',
    categoria: 'Estructura',
    subcategoria: 'Pisos',
    nombre: 'Piso de madera',
    descripcion: 'Tablones de roble tratado 4 cm, cálido y elegante.',
    dimensiones: [3, 0.04, 3],
    propiedadesMaterial: {
      nombre: 'Roble tratado',
      color: '#a16207',
      metalness: 0.0,
      roughness: 0.6,
    },
  },
  {
    catalogId: 'viga-acero',
    tipo: 'viga',
    categoria: 'Estructura',
    subcategoria: 'Vigas',
    nombre: 'Viga IPE de acero',
    descripcion: 'Perfil IPE 200 — luces medias, acabado pintado.',
    dimensiones: [4, 0.2, 0.1],
    propiedadesMaterial: {
      nombre: 'Acero pintado',
      color: '#1f2937',
      metalness: 0.7,
      roughness: 0.4,
    },
  },
  {
    catalogId: 'viga-madera',
    tipo: 'viga',
    categoria: 'Estructura',
    subcategoria: 'Vigas',
    nombre: 'Viga laminada',
    descripcion: 'Madera laminada encolada — vigas vista de lujo.',
    dimensiones: [4, 0.25, 0.12],
    propiedadesMaterial: {
      nombre: 'Madera laminada',
      color: '#92400e',
      metalness: 0.0,
      roughness: 0.55,
    },
  },

  // ─── Muros ──────────────────────────────────────────────────────────────
  {
    catalogId: 'muro-metalcom',
    tipo: 'muro',
    categoria: 'Muros',
    subcategoria: 'Metalcom',
    nombre: 'Muro Metalcom',
    descripcion: 'Sistema de acero galvanizado liviano — alta resistencia.',
    dimensiones: [3, 2.4, 0.15],
    propiedadesMaterial: {
      nombre: 'Yeso-cartón sobre Metalcom',
      color: '#e5e7eb',
      metalness: 0.05,
      roughness: 0.75,
    },
  },
  {
    catalogId: 'muro-madera',
    tipo: 'muro',
    categoria: 'Muros',
    subcategoria: 'Madera',
    nombre: 'Muro Tabiquería de Madera',
    descripcion: 'Pino dimensionado tratado — sistema tradicional.',
    dimensiones: [3, 2.4, 0.12],
    propiedadesMaterial: {
      nombre: 'Madera natural',
      color: '#b45309',
      metalness: 0.0,
      roughness: 0.7,
    },
  },
  {
    catalogId: 'muro-hormigon',
    tipo: 'muro',
    categoria: 'Muros',
    subcategoria: 'Metalcom',
    nombre: 'Muro de hormigón',
    descripcion: 'Hormigón armado 20 cm — estructura portante.',
    dimensiones: [3, 2.4, 0.2],
    propiedadesMaterial: {
      nombre: 'Hormigón obra gris',
      color: '#94a3b8',
      metalness: 0.0,
      roughness: 0.9,
    },
  },

  // ─── Aberturas ──────────────────────────────────────────────────────────
  {
    catalogId: 'puerta-madera',
    tipo: 'puerta',
    categoria: 'Aberturas',
    subcategoria: 'Puertas',
    nombre: 'Puerta de madera',
    descripcion: 'Hoja de madera maciza con marco — paramétrica.',
    dimensiones: [0.9, 2.1, 0.06],
    propiedadesMaterial: {
      nombre: 'Madera tratada',
      color: '#78350f',
      metalness: 0.0,
      roughness: 0.55,
    },
  },
  {
    catalogId: 'puerta-vidriada',
    tipo: 'puerta',
    categoria: 'Aberturas',
    subcategoria: 'Puertas',
    nombre: 'Puerta vidriada',
    descripcion: 'Marco de aluminio anodizado con cristal templado.',
    dimensiones: [0.9, 2.1, 0.06],
    propiedadesMaterial: {
      nombre: 'Aluminio anodizado',
      color: '#52525b',
      metalness: 0.85,
      roughness: 0.3,
    },
  },
  {
    catalogId: 'ventana-corredera',
    tipo: 'ventana',
    categoria: 'Aberturas',
    subcategoria: 'Ventanas',
    nombre: 'Ventana corredera',
    descripcion: 'Aluminio anodizado, doble vidriado hermético.',
    dimensiones: [1.2, 1.2, 0.06],
    propiedadesMaterial: {
      nombre: 'Aluminio anodizado',
      color: '#3f3f46',
      metalness: 0.85,
      roughness: 0.3,
    },
  },
  {
    catalogId: 'ventana-fija',
    tipo: 'ventana',
    categoria: 'Aberturas',
    subcategoria: 'Ventanas',
    nombre: 'Ventana fija panorámica',
    descripcion: 'Cristal templado con marco mínimo — máxima luz.',
    dimensiones: [2, 1.5, 0.06],
    propiedadesMaterial: {
      nombre: 'Aluminio anodizado',
      color: '#27272a',
      metalness: 0.9,
      roughness: 0.25,
    },
  },
];

/** Agrupa las piezas del catálogo por `categoria` → `subcategoria`. */
export function groupCatalog(): Record<
  ElementoCategoria,
  Record<string, CatalogPiece[]>
> {
  const out: Record<string, Record<string, CatalogPiece[]>> = {};
  for (const piece of CATALOG) {
    const cat = (out[piece.categoria] ??= {});
    (cat[piece.subcategoria] ??= []).push(piece);
  }
  return out as Record<ElementoCategoria, Record<string, CatalogPiece[]>>;
}
