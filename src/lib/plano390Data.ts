/*
 * plano390Data.ts — Casa Fabrick "Mediterránea 148" (v2, plano del cliente).
 * Origen en esquina NO de los muros exteriores.
 * x → Este (0..14,60), z → Sur (0..11,00); z negativo = jardín norte.
 *
 * Distribución (plano capturado, 2026-10-20):
 *   Norte:  Dorm. 2 · Cocina · Dorm. 1
 *   Medio:  Baño · Pasillo · Comedor · Distribuidor · Vestíbulo
 *   Sur:    Dorm. 3 · Living doble altura · Garaje
 *   Exterior: porche centrado, garaje al oriente, jardín y adoquín al frente.
 *
 * Contrato compartido por la escena, el recorrido y el HUD.
 */

export type FloorKind = 'porcelain' | 'wood' | 'tile' | 'terrace' | 'concrete';

export type RoomBox = {
  id: string;
  name: string;
  areaM2: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  floor: FloorKind;
  /** altura libre (el living se dibuja con 2,80 m) */
  ceiling?: number;
};

export type WallSeg = {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  kind: 'ext' | 'int';
  /** tramo de vidrio: bloquea el paso y la escena lo dibuja como abertura */
  window?: boolean;
};

export type PhotoSpot = {
  id: string;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
  color: string;
};

export type TourStop = {
  label: string;
  note: string;
  /** Ficha técnica corta que se muestra durante el recorrido. */
  meta: string;
  pos: [number, number, number];
  look: [number, number, number];
  /**
   * Punto de paso: la cámara no se detiene ni muestra ficha.
   * Sirve para recorrer la casa como un humano, doblando en puertas y pasillos
   * en vez de atravesar tabiques en línea recta.
   */
  info?: boolean;
};

/** Vista directa a una escena (selector inferior "Escena"). */
export type SceneView = {
  id: string;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
};

/**
 * Aberturas: puertas, ventanas corredizas y portón de garaje.
 * `axis: 'z'` = muro que corre en X (la abertura se mide en X sobre `z`).
 * `axis: 'x'` = muro que corre en Z (la abertura se mide en Z sobre `x`).
 */
export type Opening = {
  id: string;
  kind: 'door' | 'double' | 'slider' | 'window' | 'garage' | 'pass';
  axis: 'x' | 'z';
  /** centro de la abertura */
  x: number;
  z: number;
  width: number;
  height: number;
  /** alféizar (ventanas y ventanillas) */
  sill?: number;
  /** 1 = abre hacia +x/+z, -1 = hacia -x/-z */
  swing?: 1 | -1;
  /** bisagra: izquierda o derecha vista desde dentro */
  hinge?: 'left' | 'right';
  ext?: boolean;
  glass?: boolean;
};

export const PLAN = {
  widthM: 14.6,
  depthM: 11,
  wallH: 2.8,
  extT: 0.25,
  intT: 0.12,
  ridgeExtra: 0,
  terraceDepthM: 1.8,
  stepH: 0.18,
  /** sol al S a 50° → sombra = h / tan(50°) ≈ 0,84·h */
  sunElevationDeg: 50,
  sunSombraFactor: 0.84,
  eyeH: 1.62,
} as const;

/** Ambientes del plano (numerados como la lista del proyecto). */
export const ROOMS: RoomBox[] = [
  { id: '1', name: 'Dormitorio 2', areaM2: 10.01, x0: 0.25, z0: 0.25, x1: 3.34, z1: 3.49, floor: 'wood' },
  { id: '2', name: 'Cocina', areaM2: 13.24, x0: 3.46, z0: 0.25, x1: 7.4, z1: 3.61, floor: 'porcelain' },
  { id: '3', name: 'Dormitorio 1', areaM2: 12.19, x0: 9.46, z0: 0.25, x1: 14.35, z1: 3.49, floor: 'wood' },
  { id: '4', name: 'Comedor', areaM2: 13.76, x0: 3.46, z0: 3.61, x1: 9.34, z1: 5.95, floor: 'porcelain' },
  { id: '5', name: 'Baño', areaM2: 4.56, x0: 0.25, z0: 3.61, x1: 2.2, z1: 5.95, floor: 'porcelain' },
  { id: '6', name: 'Pasillo', areaM2: 2.39, x0: 2.32, z0: 3.61, x1: 3.34, z1: 5.95, floor: 'porcelain' },
  { id: '7', name: 'Distribuidor', areaM2: 3.11, x0: 9.46, z0: 3.61, x1: 11.2, z1: 5.4, floor: 'porcelain' },
  { id: '8', name: 'Vestíbulo', areaM2: 5.42, x0: 11.32, z0: 3.61, x1: 14.35, z1: 5.4, floor: 'porcelain' },
  { id: '9', name: 'Living', areaM2: 28.22, x0: 3.46, z0: 5.95, x1: 9.34, z1: 10.75, floor: 'porcelain' },
  { id: '10', name: 'Dormitorio 3', areaM2: 14.46, x0: 0.25, z0: 6.07, x1: 3.34, z1: 10.75, floor: 'wood' },
  { id: '11', name: 'Garaje', areaM2: 22.07, x0: 9.46, z0: 5.52, x1: 14.35, z1: 10.75, floor: 'concrete' },
  { id: '12', name: 'Porche', areaM2: 6.12, x0: 5.65, z0: 10.75, x1: 9.05, z1: 12.55, floor: 'terrace' },
  // Despensa abierta entre la cocina y el dormitorio 1: cierra el piso y el
  // cielorraso del volumen que el plano deja sin rotular (x 7,40…9,34).
  { id: '13', name: 'Despensa', areaM2: 6.51, x0: 7.4, z0: 0.25, x1: 9.34, z1: 3.61, floor: 'porcelain' },
  // Lavandería cerrada dentro del garaje: deja de verse el auto entre las máquinas.
  { id: '14', name: 'Lavandería', areaM2: 3.50, x0: 9.46, z0: 8.3, x1: 10.9, z1: 10.75, floor: 'tile' },
  // Ensuite privado dentro del dormitorio 1 (el antiguo “ensuite” era el paso).
  { id: '15', name: 'Ensuite', areaM2: 3.65, x0: 9.46, z0: 0.25, x1: 11.2, z1: 2.35, floor: 'porcelain' },
];

/**
 * Muros como cajas (x0,z0 → x1,z1). Los vanos son saltos entre cajas.
 * `window: true` = tramo de vidrio: bloquea colisión y la escena lo deja a
 * OPENINGS (que dibuja el vidrio animado).
 */
export const WALLS: WallSeg[] = [
  // ── Fachada sur (z 10,75…11,00) ─────────────────────────────────
  { x0: 0, z0: 10.75, x1: 1.0, z1: 11.0, kind: 'ext' },
  { x0: 1.0, z0: 10.75, x1: 2.6, z1: 11.0, kind: 'ext', window: true },   // ventana dorm. 3
  { x0: 2.6, z0: 10.75, x1: 3.95, z1: 11.0, kind: 'ext' },
  { x0: 3.95, z0: 10.75, x1: 5.75, z1: 11.0, kind: 'ext', window: true }, // ventanal living
  { x0: 5.75, z0: 10.75, x1: 6.35, z1: 11.0, kind: 'ext' },
  // vano 6,35…7,75 = puerta principal (doble vidrio)
  { x0: 7.75, z0: 10.75, x1: 10.15, z1: 11.0, kind: 'ext' },
  { x0: 10.15, z0: 10.75, x1: 13.75, z1: 11.0, kind: 'ext', window: true }, // portón garaje
  { x0: 13.75, z0: 10.75, x1: 14.6, z1: 11.0, kind: 'ext' },
  // ── Fachada norte (z 0…0,25) ────────────────────────────────────
  { x0: 0, z0: 0, x1: 1.1, z1: 0.25, kind: 'ext' },
  { x0: 1.1, z0: 0, x1: 2.5, z1: 0.25, kind: 'ext', window: true },       // dorm. 2
  { x0: 2.5, z0: 0, x1: 4.05, z1: 0.25, kind: 'ext' },
  { x0: 4.05, z0: 0, x1: 5.05, z1: 0.25, kind: 'ext', window: true },    // cocina
  { x0: 5.05, z0: 0, x1: 9.85, z1: 0.25, kind: 'ext' },
  { x0: 9.85, z0: 0, x1: 10.45, z1: 0.25, kind: 'ext', window: true },   // ventana alta ensuite
  { x0: 10.45, z0: 0, x1: 11.2, z1: 0.25, kind: 'ext' },
  { x0: 11.2, z0: 0, x1: 13.0, z1: 0.25, kind: 'ext', window: true },     // dorm. 1
  { x0: 13.0, z0: 0, x1: 14.6, z1: 0.25, kind: 'ext' },
  // ── Poniente (x 0…0,25) ─────────────────────────────────────────
  { x0: 0, z0: 0, x1: 0.25, z1: 1.4, kind: 'ext' },
  { x0: 0, z0: 1.4, x1: 0.25, z1: 2.8, kind: 'ext', window: true },       // dorm. 2
  { x0: 0, z0: 2.8, x1: 0.25, z1: 4.2, kind: 'ext' },
  { x0: 0, z0: 4.2, x1: 0.25, z1: 5.1, kind: 'ext', window: true },       // baño
  { x0: 0, z0: 5.1, x1: 0.25, z1: 11.0, kind: 'ext' },
  // ── Oriente (x 14,35…14,60) ─────────────────────────────────────
  { x0: 14.35, z0: 0, x1: 14.6, z1: 4.0, kind: 'ext' },
  { x0: 14.35, z0: 4.0, x1: 14.6, z1: 4.8, kind: 'ext', window: true },   // vestíbulo
  { x0: 14.35, z0: 4.8, x1: 14.6, z1: 11.0, kind: 'ext' },

  // ── Tabiques ────────────────────────────────────────────────────
  // Bloque poniente | centro (x 3,34…3,46), con paso al living en 5,20…6,00
  { x0: 3.34, z0: 0.25, x1: 3.46, z1: 3.49, kind: 'int' },
  { x0: 3.34, z0: 3.61, x1: 3.46, z1: 5.2, kind: 'int' },
  { x0: 3.34, z0: 6.0, x1: 3.46, z1: 10.75, kind: 'int' },
  // Norte | medio, lado poniente (z 3,49…3,61), puerta dorm. 2 en 2,45…3,20
  { x0: 0.25, z0: 3.49, x1: 2.45, z1: 3.61, kind: 'int' },
  { x0: 3.2, z0: 3.49, x1: 3.34, z1: 3.61, kind: 'int' },
  // Baño | pasillo (x 2,20…2,32), puerta en 4,15…5,00
  { x0: 2.2, z0: 3.61, x1: 2.32, z1: 4.15, kind: 'int' },
  { x0: 2.2, z0: 5.0, x1: 2.32, z1: 5.95, kind: 'int' },
  // Pasillo/baño | dorm. 3 (z 5,95…6,07), puerta dorm. 3 en 2,45…3,20
  { x0: 0.25, z0: 5.95, x1: 2.45, z1: 6.07, kind: 'int' },
  { x0: 3.2, z0: 5.95, x1: 3.34, z1: 6.07, kind: 'int' },
  // Centro | oriente (x 9,34…9,46), paso al distribuidor en 3,80…5,20
  { x0: 9.34, z0: 0.25, x1: 9.46, z1: 3.8, kind: 'int' },
  { x0: 9.34, z0: 5.2, x1: 9.46, z1: 10.75, kind: 'int' },
  // Norte | medio, lado oriente, puerta dorm. 1 en 12,50…13,35
  { x0: 9.46, z0: 3.49, x1: 12.5, z1: 3.61, kind: 'int' },
  { x0: 13.35, z0: 3.49, x1: 14.35, z1: 3.61, kind: 'int' },
  // Ensuite dentro del dorm. 1: muro oriente x 11,20…11,32, puerta 1,55…2,25
  { x0: 11.2, z0: 0.25, x1: 11.32, z1: 1.55, kind: 'int' },
  { x0: 11.2, z0: 2.25, x1: 11.32, z1: 2.35, kind: 'int' },
  // Muro sur del ensuite (z 2,35…2,47)
  { x0: 9.46, z0: 2.35, x1: 11.2, z1: 2.47, kind: 'int' },
  // Distribuidor | vestíbulo (x 11,20…11,32), puerta en 4,30…5,15
  { x0: 11.2, z0: 3.61, x1: 11.32, z1: 4.3, kind: 'int' },
  { x0: 11.2, z0: 5.15, x1: 11.32, z1: 5.4, kind: 'int' },
  // Vestíbulo | garaje (z 5,40…5,52), puerta en 13,20…14,05
  { x0: 9.46, z0: 5.4, x1: 13.2, z1: 5.52, kind: 'int' },
  { x0: 14.05, z0: 5.4, x1: 14.35, z1: 5.52, kind: 'int' },
  // Lavandería dentro del garaje: muro oriente y muro norte con puerta 9,75…10,45
  { x0: 10.84, z0: 8.3, x1: 10.96, z1: 10.75, kind: 'int' },
  { x0: 9.46, z0: 8.24, x1: 9.75, z1: 8.36, kind: 'int' },
  { x0: 10.45, z0: 8.24, x1: 10.96, z1: 8.36, kind: 'int' },
];

/** Aberturas animables (puertas, ventanas corredizas y portón de garaje). */
export const OPENINGS: Opening[] = [
  // Fachada sur
  { id: 'd-main', kind: 'double', axis: 'z', x: 7.05, z: 10.875, width: 1.4, height: 2.25, ext: true, glass: true, swing: -1 },
  { id: 'w-sala', kind: 'slider', axis: 'z', x: 4.85, z: 10.875, width: 1.8, height: 2.15, sill: 0.35, ext: true, glass: true },
  { id: 'w-d3', kind: 'slider', axis: 'z', x: 1.8, z: 10.875, width: 1.6, height: 1.35, sill: 0.95, ext: true, glass: true },
  { id: 'd-garage', kind: 'garage', axis: 'z', x: 11.95, z: 10.875, width: 3.6, height: 2.35, ext: true },
  // Fachada norte
  { id: 'w-d2', kind: 'window', axis: 'z', x: 1.8, z: 0.125, width: 1.4, height: 1.3, sill: 0.95, ext: true, glass: true },
  { id: 'w-kitchen', kind: 'window', axis: 'z', x: 4.55, z: 0.125, width: 1.0, height: 1.1, sill: 1.05, ext: true, glass: true },
  { id: 'w-d1', kind: 'window', axis: 'z', x: 12.1, z: 0.125, width: 1.8, height: 1.35, sill: 0.95, ext: true, glass: true },
  { id: 'w-ens', kind: 'window', axis: 'z', x: 10.15, z: 0.125, width: 0.6, height: 0.6, sill: 1.6, ext: true, glass: true },
  // Poniente
  { id: 'w-d2w', kind: 'window', axis: 'x', x: 0.125, z: 2.1, width: 1.4, height: 1.3, sill: 0.95, ext: true, glass: true },
  { id: 'w-bath', kind: 'window', axis: 'x', x: 0.125, z: 4.65, width: 0.9, height: 0.6, sill: 1.6, ext: true, glass: true },
  // Oriente
  { id: 'w-ensuite', kind: 'window', axis: 'x', x: 14.475, z: 4.4, width: 0.8, height: 0.65, sill: 1.55, ext: true, glass: true },
  // Puertas interiores
  { id: 'd-d2', kind: 'door', axis: 'z', x: 2.825, z: 3.55, width: 0.75, height: 2.05, hinge: 'right', swing: 1 },
  { id: 'd-d3', kind: 'door', axis: 'z', x: 2.825, z: 6.01, width: 0.75, height: 2.05, hinge: 'left', swing: 1 },
  { id: 'd-bath', kind: 'door', axis: 'x', x: 2.26, z: 4.575, width: 0.85, height: 2.05, hinge: 'left', swing: -1 },
  { id: 'd-d1', kind: 'door', axis: 'z', x: 12.925, z: 3.55, width: 0.85, height: 2.05, hinge: 'right', swing: 1 },
  { id: 'd-ensuite', kind: 'door', axis: 'x', x: 11.26, z: 4.725, width: 0.85, height: 2.05, hinge: 'left', swing: 1 },
  { id: 'd-ens-int', kind: 'door', axis: 'x', x: 11.26, z: 1.9, width: 0.7, height: 2.05, hinge: 'left', swing: 1 },
  { id: 'd-garage-int', kind: 'door', axis: 'z', x: 13.625, z: 5.46, width: 0.85, height: 2.05, hinge: 'left', swing: -1 },
  { id: 'd-laundry', kind: 'door', axis: 'z', x: 10.1, z: 8.3, width: 0.7, height: 2.05, hinge: 'left', swing: -1 },
  // Pasos sin hoja (solo dintel)
  { id: 'p-hall', kind: 'pass', axis: 'x', x: 3.4, z: 5.6, width: 0.8, height: 2.2 },
  { id: 'p-vest', kind: 'pass', axis: 'x', x: 9.4, z: 4.5, width: 1.4, height: 2.2 },
];

/** Muro de TV del living: 3,80 m de largo (captura del cliente). */
export const TV_WALL = {
  /** plano del muro (cara interior del tabique poniente) */
  x: 3.46,
  z0: 7.0,
  z1: 10.8,
  /** panel de piedra central de 2,20 m, centrado con el sofá */
  panelZ0: 7.9,
  panelZ1: 10.1,
  tv: { w: 1.4, h: 0.79, y: 1.2, z: 9.0 },
  unit: { len: 2.6, h: 0.45, d: 0.5, y: 0.45, z: 9.0 },
  panelH: 1.8,
} as const;

/** Quincho exterior sobre el adoquín, al oriente del porche. */
export const QUINCHO = {
  x0: 10.75,
  z0: 13.0,
  x1: 14.2,
  z1: 15.8,
} as const;

/** Cocina: isla 2,40 × 1,00 × 0,90 + barra 1,05 (captura de alturas). */
export const KITCHEN = {
  counterH: 0.9,
  counterD: 0.62,
  upperY: 1.4,
  upperH: 0.7,
  island: { x: 5.5, z: 2.55, w: 2.4, d: 1.0, h: 0.9, barH: 1.05, overhang: 0.3 },
  fridge: { w: 0.9, h: 1.85, d: 0.7 },
  stools: 3,
} as const;

/** Garaje: 4,89 × 5,23 m, portón de 3,60 × 2,35 m. */
export const GARAGE = {
  x0: 9.46,
  x1: 14.35,
  z0: 5.52,
  z1: 10.75,
  door: { x0: 10.15, x1: 13.75, h: 2.35 },
} as const;

/** Apliques de muro exteriores (x, y, z, giro). */
export const SCONCES: { x: number; y: number; z: number; rot: number }[] = [
  { x: 3.55, y: 2.25, z: 11.03, rot: 0 },
  { x: 5.72, y: 2.35, z: 11.36, rot: 0 },
  { x: 8.68, y: 2.35, z: 11.36, rot: 0 },
  { x: 10.35, y: 2.25, z: 11.03, rot: 0 },
  { x: 3.58, y: 1.95, z: 7.15, rot: Math.PI / 2 },
  { x: 3.58, y: 1.95, z: 10.65, rot: Math.PI / 2 },
];

/** Interruptores y enchufes: placa 0,09 × 0,12 m. y 1,10 / 0,30. */
export const SWITCHES: { x: number; y: number; z: number; rot: number; outlet?: boolean }[] = [
  { x: 7.9, y: 1.1, z: 10.69, rot: Math.PI },           // entrada (al oriente de la puerta)
  { x: 3.6, y: 1.1, z: 10.69, rot: Math.PI },           // living, muro sur
  { x: 9.28, y: 1.1, z: 10.0, rot: -Math.PI / 2 },      // living, muro oriente
  { x: 3.55, y: 0.3, z: 10.2, rot: Math.PI / 2, outlet: true },
  { x: 3.75, y: 1.2, z: 0.38, rot: 0, outlet: true },   // cocina, muro norte
  { x: 6.2, y: 1.2, z: 0.38, rot: 0, outlet: true },
  { x: 3.55, y: 0.3, z: 2.9, rot: Math.PI / 2, outlet: true }, // cocina, muro poniente
  { x: 2.55, y: 1.1, z: 3.44, rot: Math.PI },           // dormitorio 2
  { x: 0.4, y: 0.3, z: 2.9, rot: Math.PI / 2, outlet: true },
  { x: 2.55, y: 1.1, z: 6.12, rot: 0 },                 // dormitorio 3
  { x: 0.4, y: 0.3, z: 9.9, rot: Math.PI / 2, outlet: true },
  { x: 12.9, y: 1.1, z: 3.44, rot: Math.PI },           // dormitorio 1
  { x: 14.2, y: 0.3, z: 1.2, rot: -Math.PI / 2, outlet: true },
  { x: 11.38, y: 1.1, z: 4.2, rot: 0 },                 // vestíbulo, muro poniente
  { x: 11.15, y: 1.1, z: 1.4, rot: -Math.PI / 2 },      // ensuite, junto a la puerta
  { x: 2.15, y: 1.1, z: 5.8, rot: Math.PI },            // baño
  { x: 11.14, y: 1.1, z: 4.05, rot: -Math.PI / 2 },     // distribuidor
  { x: 13.7, y: 1.1, z: 5.6, rot: 0 },                  // garaje, muro norte
];

/** Volúmenes que bloquean el paso (muebles grandes y auto). */
export const BLOCKERS: { x0: number; z0: number; x1: number; z1: number }[] = [
  { x0: 4.25, z0: 2.0, x1: 6.75, z1: 3.1 },    // isla
  { x0: 7.75, z0: 7.95, x1: 8.65, z1: 10.25 }, // sofá
  { x0: 7.95, z0: 10.36, x1: 8.85, z1: 10.68 },// consola sur
  { x0: 5.45, z0: 8.75, x1: 6.75, z1: 9.45 },  // mesa de centro
  { x0: 5.53, z0: 9.8, x1: 6.38, z1: 10.6 },   // butaca sur
  { x0: 5.53, z0: 7.1, x1: 6.38, z1: 7.9 },    // butaca norte
  { x0: 8.11, z0: 7.36, x1: 8.49, z1: 7.74 },  // mesa auxiliar del sofá
  { x0: 7.5, z0: 0.3, x1: 9.0, z1: 0.9 },      // mueble de café
  { x0: 8.95, z0: 0.45, x1: 9.34, z1: 3.25 },  // despensa
  { x0: 5.6, z0: 4.1, x1: 7.4, z1: 5.4 },      // mesa de comedor
  { x0: 9.58, z0: 8.55, x1: 10.25, z1: 10.55 },// lavandería
  { x0: 13.72, z0: 3.95, x1: 14.22, z1: 5.05 },// consola recibidor
  { x0: 11.9, z0: 4.95, x1: 12.9, z1: 5.32 },  // banco recibidor
  { x0: 12.35, z0: 0.6, x1: 14.35, z1: 2.4 },  // cama dorm. 1
  { x0: 11.33, z0: 2.5, x1: 11.91, z1: 3.45 }, // clóset dorm. 1
  { x0: 13.8, z0: 2.6, x1: 14.35, z1: 3.4 },   // escritorio dorm. 1
  { x0: 1.34, z0: 0.75, x1: 3.34, z1: 2.35 },  // cama dorm. 2
  { x0: 0.26, z0: 0.4, x1: 0.84, z1: 1.35 },   // clóset dorm. 2
  { x0: 0.55, z0: 2.87, x1: 1.75, z1: 3.43 },  // escritorio dorm. 2
  { x0: 0.75, z0: 6.19, x1: 2.35, z1: 8.19 },  // cama dorm. 3
  { x0: 2.71, z0: 8.2, x1: 3.29, z1: 9.15 },   // clóset dorm. 3
  { x0: 2.74, z0: 9.5, x1: 3.29, z1: 10.7 },   // escritorio dorm. 3
  { x0: 0.25, z0: 3.61, x1: 1.45, z1: 4.81 },  // ducha baño
  { x0: 1.25, z0: 5.45, x1: 2.05, z1: 5.95 },  // vanitorio baño
  { x0: 0.3, z0: 4.95, x1: 0.9, z1: 5.65 },    // wc baño
  { x0: 9.55, z0: 0.3, x1: 10.45, z1: 1.5 },   // ducha ensuite
  { x0: 9.6, z0: 1.75, x1: 10.4, z1: 2.25 },   // vanitorio ensuite
  { x0: 10.55, z0: 0.35, x1: 11.1, z1: 1.05 }, // wc ensuite
  { x0: 11.2, z0: 6.55, x1: 12.98, z1: 10.75 },// auto
  { x0: 11.15, z0: 14.87, x1: 13.75, z1: 15.53 }, // mesón y parrilla del quincho
];

/** Puntos de foto con cuña/dirección. */
export const PHOTO_SPOTS: PhotoSpot[] = [
  { id: '41', label: 'Foto 41 · living y muro de TV', pos: [8.9, 1.55, 7.3], look: [3.6, 1.25, 9.0], color: '#C56A3A' },
  { id: '44', label: 'Foto 44 · cocina e isla', pos: [7.1, 1.55, 4.0], look: [4.8, 1.0, 1.1], color: '#2E6FA0' },
  { id: '50', label: 'Foto 50 · comedor', pos: [8.85, 1.55, 6.1], look: [5.7, 1.0, 4.5], color: '#2E6FA0' },
  { id: '58', label: 'Foto 58 · dormitorio 1', pos: [13.3, 1.55, 3.25], look: [11.1, 1.0, 1.0], color: '#C56A3A' },
];

/**
 * Recorrido guiado: cámara a 1,62 m y ruta humana.
 * Las paradas con `info: false` son puntos de paso: no esperan ni muestran
 * ficha, pero obligan a la cámara a doblar por puertas, pasillos y esquinas.
 */
export const TOUR_STOPS: TourStop[] = [
  { label: 'Fachada sur', note: 'Casa mediterránea de una planta, 148 m²', meta: '3 dorm · 2 baños · garaje · porche · quincho · 148 m²', pos: [8.9, 1.75, 20.0], look: [7.2, 2.1, 11.0] },
  { label: 'Jardín de acceso', note: '', meta: '', info: false, pos: [7.6, 1.7, 16.8], look: [7.05, 1.9, 11.2] },
  { label: 'Porche de acceso', note: 'Paso cubierto, puerta de doble vidrio y recibidor', meta: 'Porche 3,40 × 1,80 m · puerta 1,40 m', pos: [7.05, 1.68, 14.0], look: [7.05, 1.9, 11.0] },
  { label: 'Umbral de entrada', note: '', meta: '', info: false, pos: [7.05, 1.64, 12.4], look: [7.05, 1.75, 11.0] },
  { label: 'Recibidor', note: 'El living se abre al jardín, con consola, espejo y coat hooks', meta: 'Living 28,22 m² · frente de TV 3,80 m', pos: [7.05, 1.62, 10.35], look: [4.8, 1.3, 8.4] },
  { label: 'Paso al living', note: '', meta: '', info: false, pos: [7.2, 1.62, 9.95], look: [5.2, 1.3, 8.8] },
  { label: 'Living', note: 'Sofá de tres cuerpos, dos butacas enfrentadas, mesa de centro y alfombra de lana', meta: 'Living 28,22 m² · sofá 2,30 m · mesa 1,30 × 0,70 m', pos: [7.2, 1.62, 9.0], look: [5.4, 1.3, 8.9] },
  { label: 'Frente al sofá', note: '', meta: '', info: false, pos: [7.15, 1.62, 8.35], look: [5.6, 1.3, 8.7] },
  { label: 'Paso al muro de TV', note: '', meta: '', info: false, pos: [4.6, 1.62, 8.4], look: [3.6, 1.25, 8.7] },
  { label: 'Muro de TV', note: 'Panel de piedra de 2,20 m, TV de 1,40 m y mueble flotante con LED', meta: 'Muro 3,80 m · TV 1,40 × 0,79 m · mueble 2,60 m', pos: [4.5, 1.58, 8.85], look: [3.55, 1.25, 8.9] },
  { label: 'Corredor del muro de TV', note: '', meta: '', info: false, pos: [4.6, 1.62, 6.9], look: [5.4, 1.3, 6.5] },
  { label: 'Vuelta al living', note: '', meta: '', info: false, pos: [6.5, 1.62, 6.85], look: [8.4, 1.2, 6.6] },
  { label: 'Paso al comedor', note: '', meta: '', info: false, pos: [8.4, 1.62, 6.75], look: [8.6, 1.2, 5.6] },
  { label: 'Antesala del comedor', note: '', meta: '', info: false, pos: [8.7, 1.62, 6.2], look: [7.6, 1.2, 5.2] },
  { label: 'Comedor', note: 'Mesa para seis, lámpara lineal y vajilla al alcance de la cocina', meta: 'Comedor 13,76 m² · mesa 1,80 × 0,90 m · 6 sillas', pos: [8.8, 1.62, 5.65], look: [5.9, 1.0, 4.6] },
  { label: 'Paso a cocina', note: '', meta: '', info: false, pos: [8.8, 1.62, 5.1], look: [7.2, 1.1, 3.8] },
  { label: 'Rincón de cocina', note: '', meta: '', info: false, pos: [8.4, 1.62, 4.0], look: [6.8, 1.1, 2.8] },
  { label: 'Frente a la isla', note: '', meta: '', info: false, pos: [7.15, 1.62, 3.5], look: [5.8, 1.1, 1.8] },
  { label: 'Cocina', note: 'Línea de muebles de 0,90 m, alacenas, campana y electrodomésticos', meta: 'Cocina 13,24 m² · alacenas 0,70 m a 1,40 m', pos: [6.95, 1.62, 2.4], look: [4.8, 1.05, 1.0] },
  { label: 'Paso sur de la isla', note: '', meta: '', info: false, pos: [7.25, 1.62, 3.55], look: [6.0, 1.1, 3.6] },
  { label: 'Isla de cocina', note: 'Encimera 0,90 m, barra de 1,05 m, cajones con herrajes y tres taburetes', meta: 'Isla 2,40 × 1,00 m · barra 1,05 m · overhang 0,30', pos: [3.95, 1.62, 3.35], look: [5.5, 0.98, 2.55] },
  { label: 'Paso al pasillo', note: '', meta: '', info: false, pos: [3.95, 1.62, 5.55], look: [2.85, 1.4, 5.4] },
  { label: 'Pasillo poniente', note: 'Distribución a los dormitorios y el baño, con luz de paso', meta: 'Pasillo 2,39 m² · ancho 1,02 m', pos: [2.82, 1.62, 5.45], look: [2.82, 1.35, 3.8] },
  { label: 'Paso al baño', note: '', meta: '', info: false, pos: [2.15, 1.62, 4.6], look: [1.0, 1.1, 4.3] },
  { label: 'Baño', note: 'Ducha de 0,90 × 1,20 m con mampara, vanitorio de 0,80 m y WC', meta: 'Baño 1,80 × 2,20 m útil · ducha 0,90 · vanitorio 0,80', pos: [1.95, 1.6, 5.2], look: [0.75, 1.05, 4.35] },
  { label: 'Salida del baño', note: '', meta: '', info: false, pos: [1.95, 1.62, 4.6], look: [2.6, 1.4, 4.9] },
  { label: 'Paso al pasillo', note: '', meta: '', info: false, pos: [2.5, 1.62, 4.6], look: [2.82, 1.45, 5.2] },
  { label: 'Pasillo a dormitorios', note: '', meta: '', info: false, pos: [2.82, 1.62, 4.0], look: [2.82, 1.35, 3.3] },
  { label: 'Puerta dormitorio 2', note: '', meta: '', info: false, pos: [2.82, 1.62, 3.25], look: [1.8, 1.2, 2.9] },
  { label: 'Dormitorio 2', note: 'Cama de 1,60 m, veladores, clóset, escritorio y alfombra', meta: 'Dorm. 2 · 10,01 m² · cama 1,60 × 2,00 m', pos: [2.1, 1.62, 2.9], look: [0.9, 1.15, 0.9] },
  { label: 'Vuelta al pasillo', note: '', meta: '', info: false, pos: [2.82, 1.62, 3.1], look: [2.82, 1.4, 4.3] },
  { label: 'Pasillo a dormitorio 3', note: '', meta: '', info: false, pos: [2.82, 1.62, 5.7], look: [2.82, 1.35, 6.3] },
  { label: 'Puerta dormitorio 3', note: '', meta: '', info: false, pos: [2.82, 1.62, 6.3], look: [1.2, 1.2, 7.4] },
  { label: 'Dormitorio 3', note: 'Cama de 1,60 m, clóset, escritorio y salida al living', meta: 'Dorm. 3 · 14,46 m² · cama 1,60 × 2,00 m', pos: [2.95, 1.62, 7.0], look: [1.2, 1.15, 7.4] },
  { label: 'Salida dormitorio 3', note: '', meta: '', info: false, pos: [2.95, 1.62, 6.3], look: [3.9, 1.35, 5.6] },
  { label: 'Paso al living', note: '', meta: '', info: false, pos: [3.9, 1.62, 5.55], look: [5.4, 1.3, 6.4] },
  { label: 'Living hacia el vestíbulo', note: '', meta: '', info: false, pos: [6.6, 1.62, 6.4], look: [8.2, 1.2, 5.2] },
  { label: 'Paso al vestíbulo', note: '', meta: '', info: false, pos: [8.6, 1.62, 5.7], look: [9.6, 1.2, 4.8] },
  { label: 'Distribuidor', note: 'Hall de paso entre el comedor, el vestíbulo y el garaje', meta: 'Distribuidor 3,11 m² · paso 1,40 m', pos: [10.45, 1.6, 4.2], look: [11.0, 1.3, 4.6] },
  { label: 'Vestíbulo', note: 'Recibidor con consola, espejo, banco y coat hooks', meta: 'Vestíbulo 5,42 m² · consola 1,20 m', pos: [11.55, 1.62, 4.55], look: [13.6, 1.3, 4.2] },
  { label: 'Paso a dormitorio 1', note: '', meta: '', info: false, pos: [12.9, 1.62, 4.4], look: [12.9, 1.35, 3.3] },
  { label: 'Dormitorio 1', note: 'Cama de 1,80 m con cabecera al oriente, veladores, clóset y escritorio', meta: 'Dorm. 1 · 15,84 m² · cama 1,80 × 2,00 m', pos: [12.7, 1.62, 2.75], look: [13.6, 1.1, 1.3] },
  { label: 'Ensuite', note: 'Baño privado con ducha de 0,90 m, vanitorio de 0,80 m y WC', meta: 'Ensuite 1,74 × 2,10 m · ducha 0,90 × 1,20 m', pos: [12.13, 1.62, 2.65], look: [10.6, 1.15, 1.3] },
  { label: 'Vuelta al vestíbulo', note: '', meta: '', info: false, pos: [12.9, 1.62, 3.4], look: [13.6, 1.4, 4.8] },
  { label: 'Paso al garaje', note: '', meta: '', info: false, pos: [13.6, 1.62, 5.0], look: [13.6, 1.4, 5.8] },
  { label: 'Garaje', note: 'Auto al centro, lavandería cerrada al poniente y portón seccional de 3,60 m', meta: 'Garaje 22,07 m² · portón 3,60 × 2,35 m', pos: [13.35, 1.62, 7.2], look: [10.4, 1.0, 8.6] },
  { label: 'Paso a lavandería', note: '', meta: '', info: false, pos: [13.35, 1.62, 6.3], look: [10.5, 1.2, 6.3] },
  { label: 'Esquina noroeste del garaje', note: '', meta: '', info: false, pos: [10.5, 1.62, 6.3], look: [10.1, 1.2, 8.3] },
  { label: 'Puerta de lavandería', note: '', meta: '', info: false, pos: [10.1, 1.62, 8.0], look: [10.1, 1.2, 9.0] },
  { label: 'Ingreso a lavandería', note: '', meta: '', info: false, pos: [10.42, 1.62, 8.55], look: [10.45, 1.1, 9.6] },
  { label: 'Lavandería', note: 'Lavadora, secadora, mesón y estantería en un cuarto cerrado', meta: 'Lavandería 1,44 × 2,45 m · 3,50 m²', pos: [10.45, 1.62, 9.8], look: [9.8, 1.0, 9.5] },
  { label: 'Salida interior de lavandería', note: '', meta: '', info: false, pos: [10.45, 1.62, 8.55], look: [10.4, 1.3, 7.2] },
  { label: 'Salida de lavandería', note: '', meta: '', info: false, pos: [10.1, 1.62, 8.0], look: [10.4, 1.3, 7.2] },
  { label: 'Regreso al garaje', note: '', meta: '', info: false, pos: [10.5, 1.62, 6.3], look: [13.35, 1.3, 6.3] },
  { label: 'Fondo por el pasillo oriental', note: '', meta: '', info: false, pos: [13.35, 1.62, 6.3], look: [13.3, 1.3, 9.9] },
  { label: 'Fondo del garaje', note: '', meta: '', info: false, pos: [13.3, 1.62, 9.9], look: [12.0, 1.1, 10.9] },
  { label: 'Umbral del garaje', note: '', meta: '', info: false, pos: [13.3, 1.62, 11.0], look: [12.0, 1.3, 11.4] },
  { label: 'Salida al jardín', note: '', meta: '', info: false, pos: [12.0, 1.62, 11.4], look: [12.2, 1.4, 13.0] },
  { label: 'Quincho', note: 'Parrilla, mesón de piedra, lavadero y taburetes bajo pérgola', meta: 'Quincho 3,45 × 2,80 m · parrilla 1,10 m', pos: [12.2, 1.65, 13.2], look: [12.4, 1.2, 15.0] },
  { label: 'Jardín oriente', note: '', meta: '', info: false, pos: [10.4, 1.65, 13.8], look: [8.0, 1.6, 12.5] },
  { label: 'Lateral poniente', note: 'Fachada, ventanas del baño y dormitorios, y vegetación de borde', meta: 'Lateral 11,00 m · jardín y adoquín', pos: [5.4, 1.65, 12.4], look: [2.0, 1.5, 10.0] },
  { label: 'Vista aérea', note: 'Cierre: casa, porche, garaje, quincho y jardín', meta: 'Casa + porche + garaje + quincho · 148 m²', pos: [10.6, 9.5, 19.5], look: [6.8, 1.0, 5.5] },
];

/** Selector de escena: salto directo con tween corto desde el HUD. */
export const SCENES: SceneView[] = [
  { id: 'living', label: 'Living', pos: [8.9, 1.62, 7.1], look: [4.8, 1.2, 9.1] },
  { id: 'tv', label: 'Muro TV', pos: [8.9, 1.55, 7.3], look: [3.6, 1.25, 9.0] },
  { id: 'comedor', label: 'Comedor', pos: [8.85, 1.62, 6.1], look: [5.7, 1.0, 4.5] },
  { id: 'cocina', label: 'Cocina', pos: [7.15, 1.62, 4.05], look: [4.8, 1.1, 1.1] },
  { id: 'isla', label: 'Isla', pos: [7.1, 1.55, 4.0], look: [5.3, 0.95, 2.5] },
  { id: 'despensa', label: 'Despensa', pos: [8.62, 1.6, 3.15], look: [8.45, 1.15, 0.55] },
  { id: 'recibidor', label: 'Recibidor', pos: [12.4, 1.62, 4.8], look: [14.0, 1.3, 4.5] },
  { id: 'dorm1', label: 'Dorm. 1', pos: [12.7, 1.62, 3.2], look: [13.6, 1.1, 1.3] },
  { id: 'dorm2', label: 'Dorm. 2', pos: [0.65, 1.62, 2.68], look: [2.6, 1.1, 1.2] },
  { id: 'dorm3', label: 'Dorm. 3', pos: [0.75, 1.62, 9.35], look: [2.7, 1.1, 7.0] },
  { id: 'bano', label: 'Baño', pos: [1.95, 1.62, 5.2], look: [0.8, 1.1, 4.2] },
  { id: 'ensuite', label: 'Ensuite', pos: [12.13, 1.62, 2.65], look: [10.6, 1.1, 1.3] },
  { id: 'garaje', label: 'Garaje', pos: [13.9, 1.62, 10.35], look: [10.4, 1.0, 6.2] },
  { id: 'lavanderia', label: 'Lavandería', pos: [10.45, 1.62, 9.8], look: [9.8, 1.0, 9.5] },
  { id: 'quincho', label: 'Quincho', pos: [12.2, 1.65, 13.0], look: [12.4, 1.2, 15.0] },
  { id: 'jardin', label: 'Jardín', pos: [5.6, 1.7, 13.6], look: [7.1, 2.0, 11.1] },
  { id: 'fachada', label: 'Fachada', pos: [8.9, 1.75, 20.0], look: [7.2, 2.1, 11.0] },
  { id: 'plano', label: 'Plano 3D', pos: [7.3, 16.5, 11.2], look: [7.3, 0, 5.5] },
];

/** Spots de patrulla para los personajes. */
export const NPC_SPOTS: { pos: [number, number, number]; door: [number, number] }[] = [
  { pos: [7.15, 0, 9.6], door: [7.0, 10.2] },
  { pos: [5.4, 0, 4.4], door: [3.9, 5.4] },
];

export type CctvCamera = {
  id: string;
  name: string;
  zone: string;
  pos: [number, number, number];
  look: [number, number, number];
  fov: number;
};

/** Circuito CCTV: 14 cámaras interiores/exteriores (incluye quincho y jardín). */
export const CCTV_CAMERAS: CctvCamera[] = [
  { id: 'CAM-01', name: 'Living · muro de TV', zone: 'Living', pos: [9.1, 2.55, 10.4], look: [4.2, 1.2, 8.6], fov: 62 },
  { id: 'CAM-02', name: 'Cocina · isla', zone: 'Cocina', pos: [7.0, 2.55, 3.3], look: [4.2, 1.1, 1.0], fov: 60 },
  { id: 'CAM-03', name: 'Comedor', zone: 'Comedor', pos: [9.1, 2.55, 6.2], look: [5.0, 1.1, 4.6], fov: 60 },
  { id: 'CAM-04', name: 'Fachada · porche', zone: 'Exterior', pos: [2.2, 3.2, 16.5], look: [7.2, 1.8, 11.2], fov: 50 },
  { id: 'CAM-05', name: 'Dormitorio 1', zone: 'Dormitorio', pos: [13.4, 2.55, 3.3], look: [10.8, 1.0, 1.5], fov: 60 },
  { id: 'CAM-06', name: 'Baño', zone: 'Baño', pos: [1.95, 2.5, 4.3], look: [0.5, 1.0, 5.5], fov: 62 },
  { id: 'CAM-07', name: 'Distribuidor', zone: 'Distribuidor', pos: [11.0, 2.45, 5.1], look: [9.9, 1.0, 4.0], fov: 62 },
  { id: 'CAM-08', name: 'Dormitorio 2', zone: 'Dormitorio', pos: [3.1, 2.55, 3.2], look: [1.2, 1.0, 1.4], fov: 60 },
  { id: 'CAM-09', name: 'Dormitorio 3', zone: 'Dormitorio', pos: [0.6, 2.55, 10.3], look: [2.6, 1.0, 7.2], fov: 60 },
  { id: 'CAM-10', name: 'Garaje', zone: 'Garaje', pos: [13.9, 2.55, 10.4], look: [10.2, 0.9, 6.0], fov: 64 },
  { id: 'CAM-11', name: 'Jardín · acceso', zone: 'Exterior', pos: [11.0, 1.9, 18.6], look: [6.0, 2.0, 11.0], fov: 52 },
  { id: 'CAM-12', name: 'Pasillo poniente', zone: 'Pasillo', pos: [2.9, 2.5, 5.7], look: [2.9, 1.1, 3.6], fov: 58 },
  { id: 'CAM-13', name: 'Quincho · parrilla', zone: 'Exterior', pos: [13.7, 2.45, 15.55], look: [11.9, 1.1, 13.9], fov: 58 },
  { id: 'CAM-14', name: 'Lavandería', zone: 'Lavandería', pos: [10.72, 2.5, 8.75], look: [9.7, 0.9, 9.9], fov: 60 },
];

/**
 * Huellas de mobiliario para el plano 2D (misma grilla que la escena 3D).
 * kind → color/símbolo en `Plano390Map2D`.
 */
export type Furniture2D = {
  kind: 'bed' | 'sofa' | 'table' | 'counter' | 'island' | 'wardrobe' | 'tv' | 'car' | 'desk' | 'bath' | 'rug' | 'quincho';
  x0: number;
  z0: number;
  x1: number;
  z1: number;
};

export const FURNITURE_2D: Furniture2D[] = [
  // Dormitorio 1 (cama con cabecera al oriente, lejos de la ventana)
  { kind: 'bed', x0: 12.35, z0: 0.6, x1: 14.35, z1: 2.4 },
  { kind: 'wardrobe', x0: 11.33, z0: 2.5, x1: 11.91, z1: 3.45 },
  { kind: 'desk', x0: 13.8, z0: 2.6, x1: 14.35, z1: 3.4 },
  // Ensuite dentro del dormitorio 1
  { kind: 'bath', x0: 9.55, z0: 0.3, x1: 10.45, z1: 1.5 },
  { kind: 'counter', x0: 9.6, z0: 1.75, x1: 10.4, z1: 2.25 },
  { kind: 'bath', x0: 10.55, z0: 0.35, x1: 11.1, z1: 1.05 },
  // Dormitorio 2 (cabecera al oriente)
  { kind: 'bed', x0: 1.34, z0: 0.75, x1: 3.34, z1: 2.35 },
  { kind: 'wardrobe', x0: 0.26, z0: 0.4, x1: 0.84, z1: 1.35 },
  { kind: 'desk', x0: 0.55, z0: 2.87, x1: 1.75, z1: 3.43 },
  // Dormitorio 3 (cabecera contra el muro norte, sin flotar)
  { kind: 'bed', x0: 0.75, z0: 6.19, x1: 2.35, z1: 8.19 },
  { kind: 'wardrobe', x0: 2.71, z0: 8.2, x1: 3.29, z1: 9.15 },
  { kind: 'desk', x0: 2.74, z0: 9.5, x1: 3.29, z1: 10.7 },
  // Living
  { kind: 'tv', x0: 3.46, z0: 7.0, x1: 3.64, z1: 10.8 },
  { kind: 'rug', x0: 4.65, z0: 7.7, x1: 8.05, z1: 10.5 },
  { kind: 'sofa', x0: 7.75, z0: 7.95, x1: 8.65, z1: 10.25 },
  { kind: 'table', x0: 5.45, z0: 8.75, x1: 6.75, z1: 9.45 },
  { kind: 'sofa', x0: 5.53, z0: 9.8, x1: 6.38, z1: 10.6 },
  { kind: 'sofa', x0: 5.53, z0: 7.1, x1: 6.38, z1: 7.9 },
  { kind: 'table', x0: 8.11, z0: 7.36, x1: 8.49, z1: 7.74 },
  { kind: 'table', x0: 7.95, z0: 10.36, x1: 8.85, z1: 10.68 },
  // Despensa
  { kind: 'counter', x0: 7.55, z0: 0.31, x1: 8.95, z1: 0.85 },
  { kind: 'wardrobe', x0: 9.0, z0: 0.5, x1: 9.34, z1: 3.2 },
  // Comedor
  { kind: 'table', x0: 5.6, z0: 4.3, x1: 7.4, z1: 5.2 },
  // Cocina
  { kind: 'counter', x0: 3.65, z0: 0.31, x1: 6.35, z1: 0.93 },
  { kind: 'counter', x0: 6.45, z0: 0.27, x1: 7.35, z1: 0.97 },
  { kind: 'island', x0: 4.3, z0: 2.05, x1: 6.7, z1: 3.05 },
  // Baño (ducha al norte, WC al poniente, vanitorio al sur)
  { kind: 'bath', x0: 0.25, z0: 3.61, x1: 1.45, z1: 4.81 },
  { kind: 'counter', x0: 1.25, z0: 5.45, x1: 2.05, z1: 5.95 },
  { kind: 'bath', x0: 0.3, z0: 4.95, x1: 0.9, z1: 5.65 },
  // Garaje
  { kind: 'car', x0: 11.2, z0: 6.55, x1: 12.98, z1: 10.75 },
  // Lavandería cerrada (dentro del garaje)
  { kind: 'counter', x0: 9.58, z0: 8.55, x1: 10.25, z1: 10.55 },
  // Recibidor / vestíbulo
  { kind: 'counter', x0: 13.72, z0: 3.95, x1: 14.22, z1: 5.05 },
  { kind: 'sofa', x0: 11.9, z0: 4.95, x1: 12.9, z1: 5.32 },
  // Quincho exterior
  { kind: 'quincho', x0: 10.75, z0: 13.0, x1: 14.2, z1: 15.8 },
];
